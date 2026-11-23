import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHarness } from './check-harness.mjs';

const EVALUATOR_SIGNATURE =
  'You are an Independent Skeptical QA & Recruiter Product Evaluator';

const ROLE_WRITE_ALLOWLIST = {
  pm: ['specs/prd.md', 'feature_list.json'],
  design: ['designs/'],
  'tech-lead': ['specs/', 'db/schema.sql', 'feature_list.json', 'progress.md', 'session-handoff.md'],
  be: ['apps/api/', 'db/seed.sql'],
  fe: ['apps/web/'],
  qa: ['apps/e2e/', 'evaluations/'],
};

const REPO_PATH_TOKEN_RE =
  /\b(?:(?:specs|designs|apps|db|evaluations|scripts|\.agents|\.githooks)\/[^\s'";|&)>]+|feature_list\.json|progress\.md|session-handoff\.md|AGENTS\.md|GEMINI\.md|package\.json)\b/g;

const SHELL_MUTATION_RE =
  /(?:>>?|\btee\b|\bsed\s+-i|\bcp\b|\bmv\b|\brm\b|writeFile|fs\.write)/;

function isEvaluatorSession(lastUserInput) {
  return String(lastUserInput ?? '').includes(EVALUATOR_SIGNATURE);
}

export function extractAgentRole(lastUserInput) {
  const match = String(lastUserInput ?? '').match(
    /\[AGENT_ROLE:\s*(pm|design|tech-lead|be|fe|qa)\s*\]/i
  );
  return match ? match[1].toLowerCase() : null;
}

function isPathAllowedForRole(role, rawPath, rootDir) {
  const allowlist = ROLE_WRITE_ALLOWLIST[role];
  if (!allowlist) return true;

  const normalizedRaw = String(rawPath ?? '').replace(/\\/g, '/');
  if (normalizedRaw.includes('/.gemini/antigravity/brain/')) {
    return true;
  }

  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(resolvedRoot, String(rawPath ?? ''));
  const rel = path.relative(resolvedRoot, resolvedTarget).replace(/\\/g, '/');

  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    return false;
  }

  return allowlist.some((prefix) =>
    prefix.endsWith('/') ? rel.startsWith(prefix) : rel === prefix
  );
}

export function evaluateHookEvent(payload, options = {}) {
  const defaultRoot = path.resolve(import.meta.dirname, '..');
  const rootDir = options.rootDir || payload?.cwd || defaultRoot;
  const event = payload?.hookEventName;

  if (event === 'PreToolUse') {
    const toolName = payload?.toolCall?.name ?? '';
    const args = payload?.toolCall?.args ?? {};
    const isEvaluator = isEvaluatorSession(payload?.lastUserInput);
    const role = extractAgentRole(payload?.lastUserInput);

    if (toolName === 'write_file' || toolName === 'edit_file') {
      const targetPath = String(args.Path ?? '').replace(/\\/g, '/');
      if (/(^|\/)evaluations\/[^/]+\.json$/.test(targetPath) && !isEvaluator) {
        return {
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot write or edit evaluations/*.json directly. Stage status="ready-for-eval", commit HEAD, and dispatch an Independent Evaluator subagent.',
        };
      }

      if (role && !isPathAllowedForRole(role, args.Path, rootDir)) {
        return {
          decision: 'deny',
          reason: `Harness Role Lock: Role "${role}" cannot modify "${targetPath}". Allowed paths: ${ROLE_WRITE_ALLOWLIST[role].join(', ')}.`,
        };
      }
    }

    if (toolName === 'run_command') {
      const cmd = String(args.CommandLine ?? '');

      if (/\s--no-verify\b/.test(cmd) || /\bgit\s+commit\b[^\n]*\s-[a-z]*n[a-z]*\b/.test(cmd)) {
        return {
          decision: 'deny',
          reason: 'Harness Lock: --no-verify is forbidden; all repository git hooks must execute.',
        };
      }

      if (
        /\bgit\s+config\b[^\n]*\bcore\.hooksPath\b/.test(cmd) &&
        !/\bcore\.hooksPath\s+(['"]?)\.githooks\1(\s|$|;|&)/.test(cmd)
      ) {
        return {
          decision: 'deny',
          reason: 'Harness Lock: core.hooksPath must remain set to .githooks.',
        };
      }

      if (
        !isEvaluator &&
        /evaluations\/[^\s'"]*\.json/.test(cmd) &&
        /(>|>>|\btee\b|\bsed\s+-i|\bcp\b|\bmv\b|\brm\b|writeFile|fs\.write)/.test(cmd)
      ) {
        return {
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot forge or modify evaluations/*.json via shell commands. Dispatch an Independent Evaluator subagent.',
        };
      }

      if (role && SHELL_MUTATION_RE.test(cmd) && !/^\s*git\s+(add|status|diff|log)\b/.test(cmd)) {
        const targets = cmd.match(REPO_PATH_TOKEN_RE) ?? [];
        for (const token of targets) {
          if (!isPathAllowedForRole(role, token, rootDir)) {
            return {
              decision: 'deny',
              reason: `Harness Role Lock: Role "${role}" cannot mutate "${token}" via shell commands. Allowed paths: ${ROLE_WRITE_ALLOWLIST[role].join(', ')}.`,
            };
          }
        }
      }
    }

    return { decision: 'allow' };
  }

  if (event === 'Stop') {
    if (payload?.continuationActive || payload?.terminationReason !== 'NO_TOOL_CALL') {
      return { decision: '' };
    }
    const errors = validateHarness(rootDir);
    if (errors.length > 0) {
      return {
        decision: 'continue',
        reason: `Repository harness gate failed (${errors.length} violation(s)):\n- ${errors.join('\n- ')}\nFix all harness violations and re-run npm run check:harness before ending your turn.`,
      };
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
