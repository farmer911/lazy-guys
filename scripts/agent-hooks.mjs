import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHarness } from './check-harness.mjs';
import { summarizeTranscriptTokens } from './token-stats.mjs';

const CODE_EDIT_RE =
  /^(?:apps\/|scripts\/|db\/|\.agents\/workflows\/|specs\/contracts\/|\.githooks\/|\.github\/workflows\/|\.agents\/hooks\.json$|package\.json$|init\.sh$|docker-compose\.yml$)/i;

const DIST_PATH_RE = /(?:^|\/)dist(?:\/|$)/i;

const TOP_LEVEL_PROTECTED_DIRS = new Set([
  '.',
  'apps',
  'scripts',
  'db',
  '.agents',
  '.githooks',
  '.github',
  'specs',
  'designs',
  'evaluations',
]);

const VERIFY_CORE_PATTERN =
  '(?:(?:[A-Z_][A-Z0-9_]*=\\S+\\s+)*(?:(?:bash\\s+)?\\.\\/init\\.sh\\b|npm\\s+run\\s+(?:test(?::unit|:e2e)?|typecheck|build)\\b|node\\s+--test\\b|npx\\s+(?:vitest|tsc|playwright)\\b))';

const VERIFICATION_CMD_RE = new RegExp(`(?:^|[;&|\\n]\\s*)${VERIFY_CORE_PATTERN}`);
const VERIFY_INLINE_RE = new RegExp(VERIFY_CORE_PATTERN);
const EXIT_MASK_PIPE_RE = new RegExp(`${VERIFY_CORE_PATTERN}[^\\n;&|]*\\|(?!\\|)`);
const EXIT_MASK_NEWLINE_RE = new RegExp(`${VERIFY_CORE_PATTERN}[^\\n]*\\n\\s*\\S`);
const EXIT_MASK_NEGATE_RE = new RegExp(`(?:^|[;&|\\n]\\s*)!\\s*${VERIFY_CORE_PATTERN}`);
const TOP_LEVEL_PIPEFAIL_RE =
  /(?:^|\n)\s*set\s+(?:-[a-zA-Z]*o\s+pipefail|-[a-zA-Z]*e[a-zA-Z]*o\s+pipefail|-o\s+pipefail)\s*(?:\n|&&|$)/;
const TOP_LEVEL_ERREXIT_RE =
  /(?:^|\n)\s*set\s+-[a-zA-Z]*e[a-zA-Z]*(?:\s+-o\s+pipefail)?\s*(?:\n|&&|$)/;

const TASK_DONE_WRAPPER_RE =
  /^\s*(?:bash\s+)?(?:\S*executing-plans\/scripts\/task-done)\s+\S+\s+\d+\s+\S+\s+--\s+([\s\S]+)$/;

const EVALUATOR_ANCHORED_RE =
  /^\s*(?:\[AGENT_ROLE:\s*qa\s*\]\s*)?You are an Independent Skeptical QA & Recruiter Product Evaluator\b/;

const EVALUATOR_STRUCTURAL_RE =
  /Commit SHA under evaluation:(?:\*{2})?\s*`?([0-9a-f]{7,40})`?\b/i;

const ROLE_WRITE_ALLOWLIST = {
  pm: ['specs/prd.md', 'feature_list.json'],
  design: ['designs/'],
  'tech-lead': ['specs/contracts/', 'db/schema.sql', 'feature_list.json', 'progress.md', 'session-handoff.md'],
  be: ['apps/api/', 'db/seed.sql'],
  fe: ['apps/web/', 'apps/e2e/tests/'],
  qa: ['apps/e2e/', 'evaluations/'],
};

const VALID_STATUSES = new Set(['not-started', 'in-progress', 'ready-for-eval', 'done']);

const REPO_PATH_TOKEN_RE =
  /(?<![A-Za-z0-9_./-])(?:(?:specs|designs|apps|db|evaluations|scripts|\.agents|\.githooks|\.github)\/[^\s'";|&)>]+|feature_list\.json|progress\.md|session-handoff\.md|AGENTS\.md|GEMINI\.md|package\.json|init\.sh|docker-compose\.yml|\.env)\b/gi;

const EVALUATIONS_PATH_RE =
  /(?:^|[\s'"=;/>(<{,]|\s-[a-zA-Z]*[oO])evaluations(?:\/[^\s'";|&)]*|(?=$|[\s'";|&)]))/i;

const SHELL_ONLY_MUTATION_RE =
  /(?:(?:>>|>(?!>))(?!\s*&|\s*\/dev\/null)|\btee\b|\bsed\s+(?:-[a-zA-Z]*i|--in-place)\b|\bperl\s+-[a-zA-Z]*i|\bcp\b|\bmv\b|\brm\b|\btouch\b|\btruncate\b|\bdd\b|\bunlink\b|\bfind\b[^|;\n]*-delete\b|(?:^|[;&|\n]\s*)(?:(?:sudo|env|command)\s+)*(?:\/(?:usr\/)?bin\/)?install\b|\bln\b|\brsync\b|\bsponge\b|\bpatch\b|\btar\b|\bunzip\b|\bditto\b|\bcurl\b[^|;\n]*(?:\s-[a-zA-Z]*[oO](?:\b|\S+)|\s--output(?:=|\s)|\s--remote-name\b)|\bwget\b(?![^|;\n]*(?:\s-O\s*-|\s--output-document=-|\s--spider\b))|\bgit(?:\s+(?:-[Cc]\s+\S+|--git-dir(?:=|\s+)\S+|--work-tree(?:=|\s+)\S+|--no-pager))*\s+(?:checkout|restore|stash\s+(?:pop|apply)|cherry-pick|merge|am|apply|rebase)\b)/;

const NESTED_SHELL_RE =
  /\b(?:sh|bash|zsh|dash|ksh|fish)\s+-[a-zA-Z]*c\b|\|\s*(?:env\s+)?(?:\/(?:usr\/)?bin\/)?(?:sh|bash|zsh|dash|ksh|fish)\b|\beval\b|\bxargs\b|\bawk\b/i;

const INLINE_INTERPRETER_RE = /\b(?:node|tsx|python3?|ruby|perl)\b/;

const INLINE_SCRIPT_MUTATION_RE =
  /(?:writeFile|appendFile|copyFile|createWriteStream|\b(?:openSync|writeSync|FileIO|child_process|execFile(?:Sync)?|execSync|spawn(?:Sync)?|subprocess\.|os\.system|os\.popen)\b|(?:io|codecs)\.open\s*\(|\b(?:cp|rm|rename|unlink|truncate|link|symlink)(?:Sync)?\s*\(|fs\.write|write_text|write_bytes|shutil\.(?:copy|move|rmtree)|os\.(?:remove|unlink|replace|rename|open)|File\.(?:write|open|delete|unlink|rename)|\.open\(\s*(?:mode\s*=\s*)?['"][^'"]*[wax+][^'"]*['"]|open\([^)]*,\s*(?:mode\s*=\s*)?['"][^'"]*(?:[wax+]|>>?)[^'"]*['"]|open\([^)]*['"]>>?)/;

const RM_RECURSIVE_RE =
  /\brm\b[^\n;|&]*(?:\s-[a-zA-Z]*[rR][a-zA-Z]*\b|\s--recursive\b)/;

const RUBRIC_KEYS = [
  'functionalCompleteness',
  'recruiterUxClarity',
  'visualCraftResponsiveness',
  'codeTestHygiene',
];

function unwrapSystemEnvelope(rawInput) {
  const text = String(rawInput ?? '');
  const match = text.match(/^\s*\[Message\][^\n]*?\bcontent=([\s\S]*)$/);
  return match ? match[1] : text;
}

function stripShellComments(cmd) {
  return String(cmd ?? '')
    .split(/\r?\n/)
    .map((line) => {
      let inSingle = false;
      let inDouble = false;
      let escaped = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\' && inDouble) {
          escaped = true;
          continue;
        }
        if (ch === "'" && !inDouble) {
          inSingle = !inSingle;
          continue;
        }
        if (ch === '"' && !inSingle) {
          inDouble = !inDouble;
          continue;
        }
        if (ch === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join('\n');
}

function stripQuotedStrings(cmd) {
  return String(cmd ?? '').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '""');
}

function findMatchingParen(text, openIdx) {
  let depth = 1;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = openIdx + 1; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && !inSingle) {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  return -1;
}

function splitShellSegments(cmd, depth = 0) {
  const text = String(cmd ?? '').replace(/\\\r?\n/g, ' ');
  const segments = [];
  const extraSegments = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      cur += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && !inSingle) {
      cur += ch;
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      cur += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      cur += ch;
      continue;
    }
    if (!inSingle && depth < 3) {
      if (ch === '$' && text[i + 1] === '(') {
        const closeIdx = findMatchingParen(text, i + 1);
        if (closeIdx !== -1) {
          const inner = text.slice(i + 2, closeIdx);
          extraSegments.push(...splitShellSegments(inner, depth + 1));
          if (!inDouble) cur += '""';
          i = closeIdx;
          continue;
        }
      }
      if (ch === '`') {
        let closeIdx = -1;
        for (let k = i + 1; k < text.length; k++) {
          if (text[k] === '\\') {
            k++;
            continue;
          }
          if (text[k] === '`') {
            closeIdx = k;
            break;
          }
        }
        if (closeIdx !== -1) {
          const inner = text.slice(i + 1, closeIdx);
          extraSegments.push(...splitShellSegments(inner, depth + 1));
          if (!inDouble) cur += '""';
          i = closeIdx;
          continue;
        }
      }
    }
    if (!inSingle && !inDouble) {
      if (ch === ';' || ch === '\n') {
        if (cur.trim()) segments.push(cur.trim());
        cur = '';
        continue;
      }
      if ((ch === '&' && text[i + 1] === '&') || (ch === '|' && text[i + 1] === '|')) {
        if (cur.trim()) segments.push(cur.trim());
        cur = '';
        i++;
        continue;
      }
      if (ch === '|') {
        if (cur.trim()) segments.push(cur.trim());
        cur = '';
        continue;
      }
      if (ch === '&' && text[i - 1] !== '>' && text[i + 1] !== '>') {
        if (cur.trim()) segments.push(cur.trim());
        cur = '';
        continue;
      }
      if (ch === '(') {
        if (cur.trim() === '') continue;
        if (text[i - 1] === '<' || text[i - 1] === '>') {
          const trimmedBefore = cur.slice(0, -1).trim();
          if (trimmedBefore) segments.push(trimmedBefore);
          cur = '';
          continue;
        }
      }
      if (ch === ')') {
        if (cur.trim()) segments.push(cur.trim());
        cur = '';
        continue;
      }
      if (ch === '{' && cur.trim() === '' && /[\s;\n{(]/.test(text[i + 1] ?? ' ')) {
        continue;
      }
      if (ch === '}' && (cur.trim() === '' || /\s$/.test(cur))) {
        if (cur.trim()) segments.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) segments.push(cur.trim());
  return [...segments, ...extraSegments];
}

function tokenizeShellArgv(segment) {
  const tokens = [];
  let cur = '';
  let hasToken = false;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (escaped) {
      cur += ch;
      hasToken = true;
      escaped = false;
      continue;
    }
    if (ch === '\\' && !inSingle) {
      escaped = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      hasToken = true;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      hasToken = true;
      continue;
    }
    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (hasToken) {
        tokens.push(cur);
        cur = '';
        hasToken = false;
      }
      continue;
    }
    cur += ch;
    hasToken = true;
  }
  if (hasToken) tokens.push(cur);
  return tokens;
}

const HOOKS_PATH_DENY_RESULT = {
  decision: 'deny',
  reason:
    'Harness Lock: core.hooksPath must remain set to .githooks (cannot override via git config, git -c, or GIT_CONFIG env vars).',
};

function inspectGitAndDockerGuard(cmdNoComments, depth = 0) {
  if (depth > 3) return null;
  const segments = splitShellSegments(cmdNoComments);
  for (const seg of segments) {
    const argv = tokenizeShellArgv(seg);
    if (argv.length === 0) continue;

    // 1. Check env assignments, declarations & command wrappers (GIT_CONFIG_COUNT, GIT_CONFIG_PARAMETERS)
    let idx = 0;
    while (idx < argv.length) {
      const tok = argv[idx];
      if (/^(?:GIT_CONFIG_COUNT|GIT_CONFIG_PARAMETERS)=/i.test(tok)) {
        return HOOKS_PATH_DENY_RESULT;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) {
        idx++;
        continue;
      }
      if (['export', 'declare', 'typeset', 'local', 'readonly'].includes(tok)) {
        for (let k = idx + 1; k < argv.length; k++) {
          if (/^(?:GIT_CONFIG_COUNT|GIT_CONFIG_PARAMETERS)=/i.test(argv[k])) {
            return HOOKS_PATH_DENY_RESULT;
          }
        }
        idx = argv.length;
        break;
      }
      if (['if', 'then', 'elif', 'else', 'do', 'while', 'until', '!'].includes(tok)) {
        idx++;
        continue;
      }
      const tokBase = path.basename(tok).toLowerCase();
      if (tokBase === 'env') {
        idx++;
        while (idx < argv.length) {
          const arg = argv[idx];
          if (arg === '--') {
            idx++;
            break;
          }
          if (arg === '-S' || arg === '--split-string') {
            const sArg = argv[idx + 1] ?? '';
            const inner = inspectGitAndDockerGuard(stripShellComments(sArg), depth + 1);
            if (inner) return inner;
            idx += 2;
            continue;
          }
          const splitInline = arg.match(/^(?:-S|--split-string=)(.+)$/);
          if (splitInline) {
            const inner = inspectGitAndDockerGuard(stripShellComments(splitInline[1]), depth + 1);
            if (inner) return inner;
            idx++;
            continue;
          }
          if (['-u', '--unset', '-C', '--chdir', '-P'].includes(arg)) {
            idx += 2;
            continue;
          }
          if (arg.startsWith('-')) {
            idx++;
            continue;
          }
          break;
        }
        continue;
      }
      if (['command', 'time', 'nohup', 'builtin'].includes(tokBase)) {
        idx++;
        while (idx < argv.length) {
          const arg = argv[idx];
          if (arg === '--') {
            idx++;
            break;
          }
          if (arg.startsWith('-')) {
            idx++;
            continue;
          }
          break;
        }
        continue;
      }
      if (tokBase === 'exec') {
        idx++;
        while (idx < argv.length) {
          const arg = argv[idx];
          if (arg === '--') {
            idx++;
            break;
          }
          if (arg === '-a') {
            idx += 2;
            continue;
          }
          if (arg.startsWith('-')) {
            idx++;
            continue;
          }
          break;
        }
        continue;
      }
      if (tokBase === 'sudo') {
        idx++;
        while (idx < argv.length) {
          const arg = argv[idx];
          if (arg === '--') {
            idx++;
            break;
          }
          if (['-u', '-g', '-C', '-h', '-p', '-r', '-t', '-U', '-D', '-R', '-T'].includes(arg)) {
            idx += 2;
            continue;
          }
          if (arg.startsWith('-')) {
            idx++;
            continue;
          }
          break;
        }
        continue;
      }
      if (tokBase === 'nice') {
        idx++;
        while (idx < argv.length) {
          const arg = argv[idx];
          if (arg === '--') {
            idx++;
            break;
          }
          if (arg === '-n' || arg === '--adjustment') {
            idx += 2;
            continue;
          }
          if (arg.startsWith('-')) {
            idx++;
            continue;
          }
          break;
        }
        continue;
      }
      if (tokBase === 'timeout') {
        idx++;
        while (idx < argv.length) {
          const arg = argv[idx];
          if (arg === '--') {
            idx++;
            break;
          }
          if (['-k', '--kill-after', '-s', '--signal'].includes(arg)) {
            idx += 2;
            continue;
          }
          if (arg.startsWith('-')) {
            idx++;
            continue;
          }
          idx++; // skip duration token
          break;
        }
        continue;
      }
      break;
    }
    if (idx >= argv.length) continue;

    const cmdBase = path.basename(argv[idx]).toLowerCase();

    // Recurse into nested shell -c / eval arguments
    if (['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish'].includes(cmdBase)) {
      for (let j = idx + 1; j < argv.length; j++) {
        if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(argv[j]) && j + 1 < argv.length) {
          const inner = inspectGitAndDockerGuard(stripShellComments(argv[j + 1]), depth + 1);
          if (inner) return inner;
        }
      }
      continue;
    }
    if (cmdBase === 'eval' && idx + 1 < argv.length) {
      const inner = inspectGitAndDockerGuard(stripShellComments(argv.slice(idx + 1).join(' ')), depth + 1);
      if (inner) return inner;
      continue;
    }

    // 2. Docker compose down -v / --volumes
    if ((cmdBase === 'docker' && argv[idx + 1] === 'compose') || cmdBase === 'docker-compose') {
      const rest = cmdBase === 'docker-compose' ? argv.slice(idx + 1) : argv.slice(idx + 2);
      const downIdx = rest.indexOf('down');
      if (downIdx !== -1) {
        const downArgs = rest.slice(downIdx + 1);
        if (downArgs.some((a) => a === '-v' || a === '--volumes' || /^-[a-zA-Z]*v[a-zA-Z]*$/.test(a))) {
          return {
            decision: 'deny',
            reason:
              'Harness Lock: "docker compose down -v" is forbidden to prevent destroying PostgreSQL volume data.',
          };
        }
      }
      continue;
    }

    // 3. Git commands
    if (cmdBase === 'git') {
      let j = idx + 1;
      while (j < argv.length) {
        const tok = argv[j];
        if (tok === '-c') {
          const next = argv[j + 1] ?? '';
          if (/^core\.hooksPath(?:=|$)/i.test(next)) {
            return {
              decision: 'deny',
              reason:
                'Harness Lock: core.hooksPath must remain set to .githooks (cannot override via git config, git -c, or GIT_CONFIG env vars).',
            };
          }
          j += 2;
          continue;
        }
        if (/^-c.+/.test(tok)) {
          if (/^-ccore\.hooksPath(?:=|$)/i.test(tok)) {
            return {
              decision: 'deny',
              reason:
                'Harness Lock: core.hooksPath must remain set to .githooks (cannot override via git config, git -c, or GIT_CONFIG env vars).',
            };
          }
          j += 1;
          continue;
        }
        if (/^--config-env(?:=|$)/i.test(tok)) {
          return {
            decision: 'deny',
            reason:
              'Harness Lock: core.hooksPath must remain set to .githooks (cannot override via git config, git -c, or GIT_CONFIG env vars).',
          };
        }
        if (['-C', '--git-dir', '--work-tree', '--namespace'].includes(tok)) {
          j += 2;
          continue;
        }
        if (tok.startsWith('-')) {
          j += 1;
          continue;
        }
        break;
      }

      const subcmd = (argv[j] ?? '').toLowerCase();
      const subArgs = argv.slice(j + 1);

      // Skip message/file values for commit & tag when scanning flags
      const scanSubArgs = (argsList, skipMessage) => {
        const filtered = [];
        for (let k = 0; k < argsList.length; k++) {
          const t = argsList[k];
          if (skipMessage && (t === '-m' || t === '--message' || t === '-F' || t === '--file')) {
            k++;
            continue;
          }
          if (skipMessage && (/^--message=/.test(t) || /^--file=/.test(t) || /^-m.+/.test(t))) {
            continue;
          }
          filtered.push(t);
        }
        return filtered;
      };

      const checkable = scanSubArgs(subArgs, subcmd === 'commit' || subcmd === 'tag');
      if (checkable.includes('--no-verify')) {
        return {
          decision: 'deny',
          reason: 'Harness Lock: --no-verify is forbidden; all repository git hooks must execute.',
        };
      }
      if (subcmd === 'commit' && checkable.some((t) => /^-[a-zA-Z]*n[a-zA-Z]*$/.test(t))) {
        return {
          decision: 'deny',
          reason: 'Harness Lock: --no-verify is forbidden; all repository git hooks must execute.',
        };
      }
      if (subcmd === 'config') {
        const isReadOnly = subArgs.some((t) =>
          ['--get', '--get-all', '--list', '-l', '--show-origin'].includes(t)
        );
        if (!isReadOnly) {
          for (let k = 0; k < subArgs.length; k++) {
            const t = subArgs[k];
            if (/^core\.hooksPath$/i.test(t)) {
              const val = subArgs[k + 1] ?? '';
              if (val !== '.githooks') {
                return {
                  decision: 'deny',
                  reason:
                    'Harness Lock: core.hooksPath must remain set to .githooks (cannot override via git config, git -c, or GIT_CONFIG env vars).',
                };
              }
            } else if (/^core\.hooksPath=/i.test(t) && !/^core\.hooksPath=\.githooks$/i.test(t)) {
              return {
                decision: 'deny',
                reason:
                  'Harness Lock: core.hooksPath must remain set to .githooks (cannot override via git config, git -c, or GIT_CONFIG env vars).',
              };
            }
          }
        }
      }
      if (subcmd === 'push') {
        if (
          subArgs.some(
            (t) =>
              t === '--force' ||
              t === '--force-with-lease' ||
              /^--force-with-lease=/.test(t) ||
              /^-[a-zA-Z]*f[a-zA-Z]*$/.test(t) ||
              /^\+.+/.test(t)
          )
        ) {
          return {
            decision: 'deny',
            reason: 'Harness Lock: Force-pushing is forbidden.',
          };
        }
      }
      if (
        (subcmd === 'reset' && subArgs.includes('--hard')) ||
        (subcmd === 'clean' && subArgs.some((t) => t === '--force' || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(t))) ||
        (subcmd === 'checkout' && subArgs.includes('.')) ||
        (subcmd === 'restore' && subArgs.includes('.'))
      ) {
        return {
          decision: 'force_ask',
          reason: 'Destructive Git Command: Confirm before discarding uncommitted work.',
        };
      }
      if (
        ['cherry-pick', 'merge', 'am', 'apply', 'rebase'].includes(subcmd) ||
        (subcmd === 'stash' && ['pop', 'apply'].includes((subArgs[0] ?? '').toLowerCase()))
      ) {
        return {
          decision: 'force_ask',
          reason:
            'Destructive Git Command: This command can silently introduce arbitrary file changes. Confirm before proceeding.',
        };
      }
    }
  }
  return null;
}

function sanitizeBenignCurlDevNull(text) {
  return String(text ?? '').replace(
    /\s+(?:-[a-zA-Z]*o\s*|--output(?:=|\s+))\/dev\/null\b/g,
    ' '
  );
}

function hasShellMutation(cmd) {
  const noComments = stripShellComments(cmd);
  const unquoted = sanitizeBenignCurlDevNull(stripQuotedStrings(noComments));
  if (SHELL_ONLY_MUTATION_RE.test(unquoted)) return true;
  if (NESTED_SHELL_RE.test(unquoted) && SHELL_ONLY_MUTATION_RE.test(sanitizeBenignCurlDevNull(noComments))) {
    return true;
  }
  if (INLINE_INTERPRETER_RE.test(unquoted) && INLINE_SCRIPT_MUTATION_RE.test(noComments)) {
    return true;
  }
  return false;
}

function normalizeRootPrefixes(rawText, rootDir) {
  let normalized = String(rawText ?? '').replace(/\\/g, '/');
  const resolvedRoot = path.resolve(rootDir).replace(/\\/g, '/').replace(/\/+$/, '');
  if (resolvedRoot && resolvedRoot !== '/') {
    const escaped = resolvedRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`${escaped}/`, 'gi'), '');
  }
  normalized = normalized.replace(/(^|[\s'"=;(>])\.\//g, '$1');
  normalized = normalized.replace(/(\s-[a-zA-Z]*[oO])(?=(?:evaluations|apps|scripts|db|specs|designs|feature_list\.json))/gi, '$1 ');
  return normalized;
}

function extractRepoPathTokens(cmd, rootDir) {
  const normalized = normalizeRootPrefixes(stripShellComments(cmd), rootDir);
  return normalized.match(REPO_PATH_TOKEN_RE) ?? [];
}

function extractBareRedirectionTargets(cmd, rootDir) {
  const normalized = normalizeRootPrefixes(stripShellComments(cmd), rootDir);
  const out = [];
  const re = /(?:(?:>>|>(?!>))(?!\s*&|\s*\/dev\/null)|\btee(?:\s+-a)?)\s*(['"]?)([^\s'";|&)]+)\1/g;
  for (const m of normalized.matchAll(re)) {
    const tok = m[2];
    if (tok && !tok.startsWith('/dev/') && !tok.startsWith('/tmp/') && !tok.startsWith('-')) {
      out.push(tok);
    }
  }
  return out;
}

function extractRmTargets(cmd, rootDir) {
  const normalized = normalizeRootPrefixes(stripShellComments(cmd), rootDir);
  const targets = [...(normalized.match(REPO_PATH_TOKEN_RE) ?? [])];
  for (const m of normalized.matchAll(/\brm\b([^\n;|&]+)/g)) {
    const parts = m[1].trim().split(/\s+/);
    for (const part of parts) {
      const cleaned = part.replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
      if (!cleaned || cleaned.startsWith('-')) continue;
      if (TOP_LEVEL_PROTECTED_DIRS.has(cleaned.toLowerCase())) {
        targets.push(cleaned);
      }
    }
  }
  return targets;
}

function unwrapTaskDoneCommand(rawCmd) {
  const trimmed = stripShellComments(rawCmd).replace(/\\\r?\n/g, ' ').trim();
  const match = trimmed.match(TASK_DONE_WRAPPER_RE);
  if (!match) return null;
  const unquotedOuter = stripQuotedStrings(trimmed).replace(/\b\d*>&\d+\b|\b\d*>>?\/dev\/null\b/g, ' ');
  if (/\|\||[;\n]|(?<![|])\|(?!\|)|(?<![>&|])&(?!&|>)/.test(unquotedOuter)) return null;
  const inner = match[1].trim();
  const subShellMatch = inner.match(
    /^(?:bash|sh|zsh)\s+-[a-zA-Z]*c[a-zA-Z]*\s+(?:'([^']*)'|"((?:\\.|[^"\\])*)")$/
  );
  if (!subShellMatch) return inner;
  return subShellMatch[1] !== undefined
    ? subShellMatch[1]
    : subShellMatch[2].replace(/\\(["\\$`])/g, '$1');
}

function isValidUnmaskedVerificationCommand(rawCmd, args = {}) {
  if (args?.IsDaemon === true) return false;
  const unwrapped = unwrapTaskDoneCommand(rawCmd);
  const effectiveCmd = unwrapped !== null ? unwrapped : String(rawCmd ?? '');
  const collapsed = stripShellComments(effectiveCmd).replace(/\\\r?\n/g, ' ');
  const unquoted = stripQuotedStrings(collapsed);
  const cleaned = unquoted.replace(/\b\d*>&\d+\b|\b\d*>>?\/dev\/null\b/g, ' ');
  const verifyMatch = cleaned.match(VERIFICATION_CMD_RE);
  if (!verifyMatch) return false;
  if (/\|\|/.test(cleaned)) return false;
  if (/;/.test(cleaned)) return false;
  if (/\bset\s+(?:\+e|\+o\s+(?:pipefail|errexit))\b|\btrap\b/.test(cleaned)) return false;
  if (/\b(?:if|while|until|case)\b/.test(cleaned)) return false;
  if (/(?:^|[;&|\n]\s*)false\s*&&/.test(cleaned)) return false;
  if (/(?<!-)--(?:help|version|showConfig|list|all)\b|\bvitest\s+list\b|\s-[hVv]\b/.test(cleaned)) {
    return false;
  }
  if (/(?<![>&|])&(?!&|>)/.test(cleaned)) return false;
  if (EXIT_MASK_NEGATE_RE.test(cleaned)) return false;

  const verifyIdx = cleaned.search(VERIFY_INLINE_RE);
  const prefixBeforeVerify = cleaned.slice(0, verifyIdx);
  if (EXIT_MASK_PIPE_RE.test(cleaned)) {
    if (!TOP_LEVEL_PIPEFAIL_RE.test(prefixBeforeVerify)) return false;
  }
  if (EXIT_MASK_NEWLINE_RE.test(cleaned)) {
    if (!TOP_LEVEL_ERREXIT_RE.test(prefixBeforeVerify)) return false;
  }
  return true;
}

function isEvaluatorSession(lastUserInput, rootDir) {
  const text = unwrapSystemEnvelope(lastUserInput);
  if (!EVALUATOR_ANCHORED_RE.test(text)) return false;
  const shaMatch = text.match(EVALUATOR_STRUCTURAL_RE);
  if (!shaMatch) return false;
  if (rootDir && fs.existsSync(path.join(rootDir, '.git'))) {
    try {
      execFileSync('git', ['cat-file', '-e', `${shaMatch[1]}^{commit}`], {
        cwd: rootDir,
        stdio: 'ignore',
      });
    } catch {
      return false;
    }
  }
  return true;
}

function hasCertifiedEvaluation(rootDir, featId) {
  try {
    const evalPath = path.join(rootDir, 'evaluations', `${featId}.json`);
    if (!fs.existsSync(evalPath)) return false;
    const report = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
    if (
      report.featureId !== featId ||
      report.evaluatorRole !== 'independent-evaluator' ||
      report.verdict !== 'PASS'
    ) {
      return false;
    }
    if (!Array.isArray(report.blockingIssues) || report.blockingIssues.length > 0) {
      return false;
    }
    const rubric = report.rubric ?? {};
    for (const key of RUBRIC_KEYS) {
      const score = rubric[key];
      if (typeof score !== 'number' || score < 7 || score > 10) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function validateFeatureListMutation(rootDir, toolName, args) {
  if (toolName === 'write_file' && args.Append === true) {
    return 'Harness Lock: Append mode is forbidden on feature_list.json; write or edit complete valid JSON so certification and DAG rules are enforced.';
  }
  let candidateRaw = null;
  if (toolName === 'write_file' && typeof args.Content === 'string') {
    candidateRaw = args.Content;
  } else if (toolName === 'edit_file' && typeof args.Replacement === 'string') {
    const featurePath = path.join(rootDir, 'feature_list.json');
    if (fs.existsSync(featurePath) && typeof args.Target === 'string') {
      candidateRaw = fs.readFileSync(featurePath, 'utf8').replaceAll(args.Target, args.Replacement);
    }
  }
  if (candidateRaw === null) return null;
  let parsed;
  try {
    parsed = JSON.parse(candidateRaw);
  } catch {
    return 'Harness Lock: feature_list.json must remain valid JSON.';
  }
  if (!Array.isArray(parsed?.features) || parsed.features.length === 0) {
    return 'Harness Lock: feature_list.json must contain a non-empty "features" array.';
  }
  const features = parsed.features;
  const byId = new Map();
  for (const feat of features) {
    if (!feat?.id) return 'Harness Lock: Every feature entry must have an "id".';
    if (byId.has(feat.id)) {
      return `Harness Lock: Duplicate feature id "${feat.id}" in feature_list.json.`;
    }
    byId.set(feat.id, feat);
  }

  const visitState = new Map();
  const hasCycle = (id) => {
    visitState.set(id, 1);
    const node = byId.get(id);
    for (const depId of Array.isArray(node?.dependencies) ? node.dependencies : []) {
      if (!byId.has(depId)) continue;
      const st = visitState.get(depId) ?? 0;
      if (st === 1) return true;
      if (st === 0 && hasCycle(depId)) return true;
    }
    visitState.set(id, 2);
    return false;
  };

  const activeIds = [];
  for (const feat of features) {
    if (!VALID_STATUSES.has(feat.status)) {
      return `Harness Lock: Feature "${feat.id}" has invalid status "${feat.status}".`;
    }
    if (!visitState.has(feat.id) && hasCycle(feat.id)) {
      return `Harness Lock: Dependency cycle detected in feature_list.json involving "${feat.id}".`;
    }
    if (feat.status === 'done' && !hasCertifiedEvaluation(rootDir, feat.id)) {
      return `Harness Lock: Cannot mark "${feat.id}" as "done" in feature_list.json without a PASS artifact in evaluations/${feat.id}.json. Stage "ready-for-eval" first.`;
    }
    if (feat.status === 'in-progress' || feat.status === 'ready-for-eval') {
      activeIds.push(`${feat.id} (${feat.status})`);
    }
    if (feat.status !== 'not-started' && Array.isArray(feat.dependencies)) {
      for (const depId of feat.dependencies) {
        const dep = byId.get(depId);
        if (!dep) {
          return `Harness Lock: Feature "${feat.id}" references unknown dependency "${depId}".`;
        }
        if (dep.status !== 'done') {
          return `Harness Lock: Cannot move "${feat.id}" to "${feat.status}" because it depends on "${depId}" (${dep.status}) which is not done.`;
        }
      }
    }
  }
  if (activeIds.length > 1) {
    return `Harness Lock: One feature at a time violated (${activeIds.join(', ')}). Finish or pause the active feature before starting another.`;
  }
  return null;
}

function recordHookTelemetry(rootDir, event, payload, result, options = {}) {
  if (options.disableTelemetry) return result;
  if (result?.decision !== 'deny' && result?.decision !== 'continue') return result;
  try {
    const logsDir = path.join(rootDir, '.agents', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(
      path.join(logsDir, 'hook-events.jsonl'),
      `${JSON.stringify({
        ts: new Date().toISOString(),
        event,
        role: extractAgentRole(payload?.lastUserInput),
        tool: payload?.toolCall?.name ?? null,
        decision: result.decision,
        reason: result.reason ?? '',
      })}\n`
    );
  } catch {
    // Telemetry is best-effort and never blocks hook execution
  }
  return result;
}

export function extractAgentRole(lastUserInput) {
  const match = unwrapSystemEnvelope(lastUserInput).match(
    /^\s*\[AGENT_ROLE:\s*(pm|design|tech-lead|be|fe|qa)\s*\]/i
  );
  return match ? match[1].toLowerCase() : null;
}

function resolveRepoRelativePath(rawPath, rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(resolvedRoot, String(rawPath ?? ''));
  const rel = path.relative(resolvedRoot, resolvedTarget).replace(/\\/g, '/');
  return { resolvedTarget: resolvedTarget.replace(/\\/g, '/'), rel };
}

function isPathAllowedForRole(role, rawPath, rootDir) {
  const allowlist = ROLE_WRITE_ALLOWLIST[role];
  if (!allowlist) return true;

  const { resolvedTarget, rel } = resolveRepoRelativePath(rawPath, rootDir);
  const relLower = rel.toLowerCase();

  if (!relLower || relLower.startsWith('..') || path.isAbsolute(relLower)) {
    return resolvedTarget.toLowerCase().includes('/.gemini/antigravity/brain/');
  }

  return allowlist.some((prefix) => {
    const p = prefix.toLowerCase();
    return p.endsWith('/') ? relLower.startsWith(p) : relLower === p;
  });
}

function getLogsDir(rootDir) {
  const logsDir = path.join(rootDir, '.agents', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  return logsDir;
}

function execStatePathFor(rootDir, convKey) {
  const safeKey = String(convKey ?? 'default').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 64);
  return path.join(getLogsDir(rootDir), `exec-state-${safeKey}.json`);
}

function readExecState(rootDir, convKey) {
  try {
    const perConvPath = execStatePathFor(rootDir, convKey);
    if (fs.existsSync(perConvPath)) {
      return JSON.parse(fs.readFileSync(perConvPath, 'utf8'));
    }
    const legacyPath = path.join(rootDir, '.agents', 'logs', 'exec-state.json');
    if (fs.existsSync(legacyPath)) {
      const all = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
      if (all[convKey]) return all[convKey];
    }
    return { seq: 0, lastCodeEditSeq: 0, lastVerifySeq: 0 };
  } catch {
    return { seq: 0, lastCodeEditSeq: 0, lastVerifySeq: 0 };
  }
}

function writeExecState(rootDir, convKey, state) {
  try {
    const targetPath = execStatePathFor(rootDir, convKey);
    const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`);
    fs.renameSync(tmpPath, targetPath);
  } catch {
    // Best-effort atomic state persistence
  }
}

function readCommandExitStatusFromTranscript(transcriptPath, stepIdx) {
  if (!transcriptPath || typeof stepIdx !== 'number' || !fs.existsSync(transcriptPath)) return null;
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].trim()) continue;
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      if (entry.type && entry.type !== 'GENERIC') continue;
      if (entry.step_index !== stepIdx) continue;
      const content = typeof entry.content === 'string' ? entry.content : '';
      const exitMatch = content.match(/Command exited with code (\d+)\./);
      if (exitMatch) return Number(exitMatch[1]);
    }
    return null;
  } catch {
    return null;
  }
}

function appendCheckpoint(rootDir, line) {
  try {
    const cpPath = path.join(getLogsDir(rootDir), 'session-checkpoint.md');
    if (!fs.existsSync(cpPath)) {
      fs.writeFileSync(cpPath, '# Auto Session Checkpoints\n\n');
    }
    fs.appendFileSync(cpPath, `${line}\n`);
  } catch {
    // Best-effort crash-safe checkpoint
  }
}

function recordTokenUsage(rootDir, payload) {
  const summary = summarizeTranscriptTokens(payload?.transcriptPath);
  if (!summary) return null;
  const convId = String(payload?.conversationId ?? 'default');
  const record = {
    ts: new Date().toISOString(),
    conversationId: convId,
    ...summary,
  };
  try {
    fs.appendFileSync(
      path.join(getLogsDir(rootDir), 'token-usage.jsonl'),
      `${JSON.stringify(record)}\n`
    );
  } catch {
    // Best-effort token usage logging
  }
  appendCheckpoint(
    rootDir,
    `- [${record.ts}] \`${convId.slice(0, 8)}\` **TOKENS** (turns=${summary.turns}, model=${summary.model}): input=${summary.inputTokens} | cache_read=${summary.cacheReadTokens} | output=${summary.outputTokens}`
  );
  return record;
}

export function evaluateHookEvent(payload, options = {}) {
  const defaultRoot = path.resolve(import.meta.dirname, '..');
  const rootDir = options.rootDir || payload?.cwd || defaultRoot;
  const validateHarnessFn = options.validateHarnessFn || validateHarness;
  const event = payload?.hookEventName;
  const finish = (res) => recordHookTelemetry(rootDir, event, payload, res, options);
  const convKey = String(payload?.conversationId ?? 'default');

  if (event === 'PreToolUse') {
    const toolName = payload?.toolCall?.name ?? '';
    const args = payload?.toolCall?.args ?? {};
    const isEvaluator = isEvaluatorSession(payload?.lastUserInput, rootDir);
    const role = extractAgentRole(payload?.lastUserInput);
    const effectiveRole = role || (isEvaluator ? 'qa' : null);

    if (toolName === 'write_file' || toolName === 'edit_file') {
      const { rel } = resolveRepoRelativePath(args.Path, rootDir);
      const relLower = rel.toLowerCase();
      const targetPath = String(args.Path ?? '').replace(/\\/g, '/');
      if (
        (/^evaluations\/[^/]+\.json$/i.test(relLower) ||
          /(^|\/)evaluations\/[^/]+\.json$/i.test(targetPath)) &&
        !isEvaluator
      ) {
        return finish({
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot write or edit evaluations/*.json directly. Stage status="ready-for-eval", commit HEAD, and dispatch an Independent Evaluator subagent.',
        });
      }

      if (effectiveRole && !isPathAllowedForRole(effectiveRole, args.Path, rootDir)) {
        return finish({
          decision: 'deny',
          reason: `Harness Role Lock: Role "${effectiveRole}" cannot modify "${targetPath}". Allowed paths: ${ROLE_WRITE_ALLOWLIST[effectiveRole].join(', ')}.`,
        });
      }

      if (relLower === 'feature_list.json') {
        const violation = validateFeatureListMutation(rootDir, toolName, args);
        if (violation) {
          return finish({
            decision: 'deny',
            reason: violation,
          });
        }
      }
    }

    if (toolName === 'run_command') {
      const cmd = String(args.CommandLine ?? '');
      const cmdNoComments = stripShellComments(cmd);
      const unquotedCmd = stripQuotedStrings(cmdNoComments);

      const gitDockerGuard = inspectGitAndDockerGuard(cmdNoComments);
      if (gitDockerGuard) {
        return finish(gitDockerGuard);
      }

      const cmdMutates = hasShellMutation(cmd);

      if (
        !isEvaluator &&
        EVALUATIONS_PATH_RE.test(cmdNoComments) &&
        cmdMutates
      ) {
        return finish({
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot forge or modify evaluations/*.json via shell commands. Dispatch an Independent Evaluator subagent.',
        });
      }

      if (
        /(?<![A-Za-z0-9_.-])feature_list\.json\b/i.test(cmdNoComments) &&
        cmdMutates
      ) {
        return finish({
          decision: 'deny',
          reason:
            'Harness Lock: Modify feature_list.json only via write_file/edit_file so certification checks are enforced.',
        });
      }

      const isRmRecursive =
        RM_RECURSIVE_RE.test(unquotedCmd) ||
        (NESTED_SHELL_RE.test(unquotedCmd) && RM_RECURSIVE_RE.test(cmdNoComments));
      if (isRmRecursive) {
        const rmTargets = extractRmTargets(cmd, rootDir);
        for (const token of rmTargets) {
          const cleanedTok = token.replace(/\/+$/, '').toLowerCase();
          if (TOP_LEVEL_PROTECTED_DIRS.has(cleanedTok)) {
            return finish({
              decision: 'force_ask',
              reason: `Destructive Command: rm -rf targeting repo directory "${token}" requires explicit human confirmation.`,
            });
          }
          const { rel } = resolveRepoRelativePath(token, rootDir);
          if (CODE_EDIT_RE.test(rel) && !DIST_PATH_RE.test(rel)) {
            return finish({
              decision: 'force_ask',
              reason: `Destructive Command: rm -rf targeting repo directory "${rel}" requires explicit human confirmation.`,
            });
          }
        }
      }

      if (cmdMutates && effectiveRole) {
        if (/\bcd\s+/.test(unquotedCmd) || NESTED_SHELL_RE.test(unquotedCmd)) {
          return finish({
            decision: 'deny',
            reason: `Harness Role Lock: Role "${effectiveRole}" cannot combine directory switching (cd) or nested shell/eval/awk wrappers with file mutations; use write_file/edit_file on allowed repo paths.`,
          });
        }
        const targets = [
          ...extractRepoPathTokens(cmd, rootDir),
          ...extractBareRedirectionTargets(cmd, rootDir),
        ];
        if (targets.length === 0) {
          return finish({
            decision: 'deny',
            reason: `Harness Role Lock: Role "${effectiveRole}" cannot run shell file mutations without an explicit allowed path (${ROLE_WRITE_ALLOWLIST[effectiveRole].join(', ')}).`,
          });
        }
        for (const token of targets) {
          if (/^evaluations\/[^/]+\.json$/i.test(token) && !isEvaluator) {
            return finish({
              decision: 'deny',
              reason:
                'Harness Lock: Generator cannot forge or modify evaluations/*.json via shell commands.',
            });
          }
          if (!isPathAllowedForRole(effectiveRole, token, rootDir)) {
            return finish({
              decision: 'deny',
              reason: `Harness Role Lock: Role "${effectiveRole}" cannot mutate "${token}" via shell commands. Allowed paths: ${ROLE_WRITE_ALLOWLIST[effectiveRole].join(', ')}.`,
            });
          }
        }
      }
    }

    return { decision: 'allow' };
  }

  if (event === 'PostToolUse') {
    const toolName = payload?.toolCall?.name ?? '';
    const args = payload?.toolCall?.args ?? {};
    const errText = payload?.error ? String(payload.error).trim() : '';
    const ts = new Date().toISOString();
    const state = readExecState(rootDir, convKey);
    state.seq = (state.seq || 0) + 1;

    if (toolName === 'write_file' || toolName === 'edit_file') {
      const { rel } = resolveRepoRelativePath(args.Path, rootDir);
      const status = errText ? `FAIL (${errText})` : 'OK';
      appendCheckpoint(rootDir, `- [${ts}] \`${convKey.slice(0, 8)}\` ${toolName} \`${rel}\` → ${status}`);
      if (!errText && CODE_EDIT_RE.test(rel) && !DIST_PATH_RE.test(rel)) {
        state.lastCodeEditSeq = state.seq;
        state.lastCodeEditPath = rel;
        writeExecState(rootDir, convKey, state);
      }
    } else if (toolName === 'run_command') {
      const rawCmd = String(args.CommandLine ?? '');
      const cmd = rawCmd.replace(/\s+/g, ' ').trim();
      const shortCmd = cmd.length > 120 ? `${cmd.slice(0, 117)}...` : cmd;
      const transcriptCode = readCommandExitStatusFromTranscript(
        payload?.transcriptPath,
        payload?.stepIdx
      );
      const effectiveErr =
        errText || (typeof transcriptCode === 'number' && transcriptCode !== 0 ? `exit status ${transcriptCode}` : '');
      const status = effectiveErr
        ? `FAIL (${effectiveErr})`
        : transcriptCode === 0
          ? 'PASS (exit 0)'
          : `RAN (step ${payload?.stepIdx ?? '?'})`;
      appendCheckpoint(rootDir, `- [${ts}] \`${convKey.slice(0, 8)}\` run_command \`${shortCmd}\` → ${status}`);
      let mutatedCodePath = null;
      if (!effectiveErr && hasShellMutation(rawCmd)) {
        for (const token of extractRepoPathTokens(rawCmd, rootDir)) {
          const { rel } = resolveRepoRelativePath(token, rootDir);
          if (CODE_EDIT_RE.test(rel) && !DIST_PATH_RE.test(rel)) {
            mutatedCodePath = rel;
            break;
          }
        }
        if (!mutatedCodePath) {
          const cdMatch = stripShellComments(rawCmd).match(
            /\bcd\s+['"]?(?:\.\/)?(apps|scripts|db|\.agents|\.githooks|\.github)(?:\/|['"\s;&|]|$)/i
          );
          if (cdMatch) {
            mutatedCodePath = `${cdMatch[1]}/`;
          }
        }
      }
      if (mutatedCodePath) {
        state.lastCodeEditSeq = state.seq;
        state.lastCodeEditPath = mutatedCodePath;
        writeExecState(rootDir, convKey, state);
      } else if (isValidUnmaskedVerificationCommand(rawCmd, args)) {
        state.lastVerifySeq = state.seq;
        state.lastVerifyStepIdx = typeof payload?.stepIdx === 'number' ? payload.stepIdx : null;
        state.lastVerifyCommand = shortCmd;
        state.lastVerifyPassed = !effectiveErr;
        state.lastVerifyError = effectiveErr || null;
        writeExecState(rootDir, convKey, state);
      }
    }
    return {};
  }

  if (event === 'Stop') {
    recordTokenUsage(rootDir, payload);
    if (payload?.continuationActive || payload?.terminationReason !== 'NO_TOOL_CALL') {
      return { decision: '' };
    }
    const errors = validateHarnessFn(rootDir);
    if (errors.length > 0) {
      return finish({
        decision: 'continue',
        reason: `Repository harness gate failed (${errors.length} violation(s)):\n- ${errors.join('\n- ')}\nFix all harness violations and re-run npm run check:harness before ending your turn.`,
      });
    }
    const state = readExecState(rootDir, convKey);
    if (state.lastCodeEditSeq > 0) {
      if ((state.lastVerifySeq || 0) < state.lastCodeEditSeq) {
        return finish({
          decision: 'continue',
          reason: `Execution Evidence Gate: You modified "${state.lastCodeEditPath}" without running a verification command afterwards. Run ./init.sh or npm run test:unit && npm run typecheck before finishing your turn.`,
        });
      }
      let verifyPassed = state.lastVerifyPassed;
      let verifyError = state.lastVerifyError;
      if (
        verifyPassed !== false &&
        typeof state.lastVerifyStepIdx === 'number' &&
        payload?.transcriptPath &&
        fs.existsSync(payload.transcriptPath)
      ) {
        const exitCode = readCommandExitStatusFromTranscript(
          payload.transcriptPath,
          state.lastVerifyStepIdx
        );
        if (exitCode !== 0) {
          verifyPassed = false;
          verifyError =
            exitCode === null
              ? 'verification did not record exit code 0 in transcript (backgrounded/killed/incomplete)'
              : `exit status ${exitCode}`;
        }
      }
      if (verifyPassed === false) {
        return finish({
          decision: 'continue',
          reason: `Execution Evidence Gate: Last verification command "${state.lastVerifyCommand}" failed (${verifyError}). Fix the failure and re-run verification with exit code 0 before finishing your turn.`,
        });
      }
    }
    return { decision: '' };
  }

  return {};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let payload = {};
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (raw) payload = JSON.parse(raw);
  } catch {
    payload = {};
  }
  const response = evaluateHookEvent(payload);
  process.stdout.write(`${JSON.stringify(response)}\n`);
}
