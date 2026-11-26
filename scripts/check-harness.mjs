import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSync } from 'vite';

const REQUIRED_FILES = [
  'AGENTS.md',
  'GEMINI.md',
  'apps/web/AGENTS.md',
  'apps/api/AGENTS.md',
  'apps/e2e/AGENTS.md',
  'designs/README.md',
  'designs/design-tokens.json',
  'designs/stitch-manifest.json',
  'specs/prd.md',
  'specs/contracts/README.md',
  '.agents/mcp.stitch.example.json',
  '.agents/workflows/graph_core.py',
  '.agents/workflows/project_init.py',
  '.agents/workflows/feature_delivery.py',
  '.agents/workflows/bugfix.py',
  'feature_list.json',
  'progress.md',
  'session-handoff.md',
  'init.sh',
  'docker-compose.yml',
  '.github/workflows/ci.yml',
  '.agents/skills/task-guardrail/SKILL.md',
  '.agents/skills/adversarial-audit/SKILL.md',
  '.agents/skills/self-evolve/SKILL.md',
  '.agents/skills/authoring-agent-knowledge/SKILL.md',
  '.agents/skills/authoring-agent-knowledge/scripts/kb-cli.mjs',
  '.agents/skills/modern-fullstack-guidance/SKILL.md',
  '.agents/skills/be-express-pg/SKILL.md',
  '.agents/skills/pm-prd-story/SKILL.md',
  '.agents/skills/design-stitch-flow/SKILL.md',
  '.agents/skills/tech-lead-contract/SKILL.md',
  '.agents/skills/fe-shadcn-clean/SKILL.md',
  '.agents/skills/qa-vercel-audit/SKILL.md',
  '.agents/skills/evaluating-features/SKILL.md',
  '.agents/skills/evaluating-features/evaluator-prompt.md',
  '.agents/hooks.json',
  '.agents/STATE.md',
  'scripts/agent-hooks.mjs',
  'scripts/token-stats.mjs',
  '.githooks/pre-commit',
  '.githooks/pre-push',
];
const GIT_HOOK_REQUIRED_COMMANDS = {
  '.githooks/pre-commit': ['npm run check:harness', 'npm run typecheck'],
  '.githooks/pre-push': [
    'npm run check:harness',
    'npm run typecheck',
    'npm run test:unit',
    'npm run build',
  ],
};
const REQUIRED_TSCONFIG_FLAGS = [
  'strict',
  'noUnusedLocals',
  'noUnusedParameters',
  'noImplicitReturns',
  'noFallthroughCasesInSwitch',
  'noUncheckedSideEffectImports',
];
const CI_REQUIRED_PATTERNS = [
  ['push:', /\bpush\s*:/],
  ['pull_request:', /\bpull_request\s*:/],
  ['schedule:', /\bschedule\s*:/],
  ['workflow_dispatch:', /\bworkflow_dispatch\s*:/],
  ['permissions: contents: read', /\bpermissions\s*:[\s\S]*?\bcontents\s*:\s*read\b/],
  ['fetch-depth: 0', /\bfetch-depth\s*:\s*0\b/],
  ['npm audit --audit-level=high', /\bnpm audit --audit-level=high\b/],
  ['npm run check:harness', /\bnpm run check:harness\b/],
  ['npm run typecheck', /\bnpm run typecheck\b/],
  ['npm run test:unit', /\bnpm run test:unit\b/],
  ['npm run build', /\bnpm run build\b/],
  ['npm run test:e2e', /\bnpm run test:e2e\b/],
];
const VALID_STATUSES = new Set(['not-started', 'in-progress', 'ready-for-eval', 'done']);
const RUBRIC_KEYS = [
  'functionalCompleteness',
  'recruiterUxClarity',
  'visualCraftResponsiveness',
  'codeTestHygiene',
];
const MIN_RUBRIC_SCORE = 7;
const CONFIG_RE = /^(vite|vitest|playwright)\.config\.[cm]?[jt]s$/;
const TSCONFIG_RE = /^tsconfig(\..+)?\.json$/;
const TS_SOURCE_RE = /\.[cm]?tsx?$/;
const TEST_FILE_RE = /(^|\/)__tests__\/|\.(test|spec)\.[cm]?tsx?$/;

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === 'test-results' ||
      entry.name === 'playwright-report'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, out);
    else if (predicate(entry.name, full)) out.push(full);
  }
  return out;
}

function commitExistsInGit(rootDir, sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], {
      cwd: rootDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function commitIsAncestorOfHead(rootDir, sha) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], {
      cwd: rootDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function stripHashComments(raw) {
  return String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) return '';
      return line.replace(/\s+#.*$/, '');
    })
    .join('\n');
}

function validateHooks(rootDir, errors, hasGitRepo) {
  const agentHooksPath = path.join(rootDir, '.agents', 'hooks.json');
  if (fs.existsSync(agentHooksPath)) {
    const raw = fs.readFileSync(agentHooksPath, 'utf8');
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      errors.push(`.agents/hooks.json is not valid JSON: ${err.message}`);
    }
    if (parsed && typeof parsed === 'object') {
      const guard = parsed['repo-harness-guard'] ?? Object.values(parsed)[0] ?? {};
      const requiredTools = ['write_file', 'edit_file', 'run_command'];
      const hasAgentHookCmd = (entries, requireToolMatchers = false) =>
        Array.isArray(entries) &&
        entries.some((entry) => {
          const wiresScript =
            (typeof entry?.command === 'string' && /agent-hooks\.mjs/.test(entry.command)) ||
            (Array.isArray(entry?.hooks) &&
              entry.hooks.some((h) => typeof h?.command === 'string' && /agent-hooks\.mjs/.test(h.command)));
          if (!wiresScript) return false;
          if (!requireToolMatchers) return true;
          if (typeof entry?.matcher !== 'string' || !entry.matcher.trim()) return false;
          try {
            const matcherRe = new RegExp(entry.matcher);
            return requiredTools.every((tool) => matcherRe.test(tool));
          } catch {
            return false;
          }
        });
      if (!hasAgentHookCmd(guard.PreToolUse, true)) {
        errors.push(
          '.agents/hooks.json PreToolUse must wire scripts/agent-hooks.mjs with matcher covering write_file, edit_file, and run_command'
        );
      }
      if (!hasAgentHookCmd(guard.PostToolUse, true)) {
        errors.push(
          '.agents/hooks.json PostToolUse must wire scripts/agent-hooks.mjs with matcher covering write_file, edit_file, and run_command'
        );
      }
      if (!hasAgentHookCmd(guard.Stop, false)) {
        errors.push('.agents/hooks.json must wire Stop to scripts/agent-hooks.mjs');
      }
    }
  }

  const GATE_MASK_RE = /\|\|\s*(?:true\b|:(?:\s|$|;|&)|exit\s+0\b)|;\s*(?:true\b|:(?:\s|$|;|&)|exit\s+0\b)|\bset\s+\+e\b/;
  for (const [rel, requiredCmds] of Object.entries(GIT_HOOK_REQUIRED_COMMANDS)) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) continue;
    const mode = fs.statSync(full).mode;
    if ((mode & 0o111) === 0) {
      errors.push(`${rel} must be executable (chmod +x)`);
    }
    const activeLines = stripHashComments(fs.readFileSync(full, 'utf8')).split(/\r?\n/);
    const earlyExitIdx = activeLines.findIndex((line) => /^\s*exit\s+0\b/.test(line));
    if (activeLines.some((line) => /\bset\s+\+e\b/.test(line))) {
      errors.push(`${rel} disables fail-fast error handling (set +e forbidden)`);
    }
    for (const cmd of requiredCmds) {
      const matchIdx = activeLines.findIndex((line) => line.includes(cmd));
      if (matchIdx === -1) {
        errors.push(`${rel} is missing required gate command: ${cmd}`);
      } else {
        if (earlyExitIdx !== -1 && earlyExitIdx < matchIdx) {
          errors.push(`${rel} exits early (exit 0) before running required gate command "${cmd}"`);
        }
        if (GATE_MASK_RE.test(activeLines[matchIdx])) {
          errors.push(`${rel} masks exit code on gate command "${cmd}" (|| true / || : / ; true forbidden)`);
        }
      }
    }
  }

  if (hasGitRepo && process.env.CI !== 'true') {
    let hooksPath = '';
    try {
      hooksPath = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
        cwd: rootDir,
        encoding: 'utf8',
      }).trim();
    } catch {
      hooksPath = '';
    }
    if (hooksPath !== '.githooks') {
      errors.push(
        `Git core.hooksPath must be ".githooks" (got "${hooksPath || 'unset'}"); run ./init.sh`
      );
    }
  }
}

function validateGitTrackedSecrets(rootDir, errors, hasGitRepo) {
  if (!hasGitRepo) return;
  try {
    const tracked = execFileSync('git', ['ls-files'], {
      cwd: rootDir,
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .filter(Boolean);
    for (const rel of tracked) {
      if (/^\.env(?:\.(?!example$).+)?$/i.test(path.basename(rel)) || /\.(?:pem|key)$/i.test(rel)) {
        errors.push(`Forbidden secret file "${rel}" is tracked in git`);
      }
    }
  } catch {
    // Ignore empty/uninitialized git index edge cases
  }
}

function validateDockerCompose(rootDir, errors) {
  const composePath = path.join(rootDir, 'docker-compose.yml');
  if (!fs.existsSync(composePath)) return;
  const activeRaw = stripHashComments(fs.readFileSync(composePath, 'utf8'));
  const lines = activeRaw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/:5432(?:\/(?:tcp|udp))?['"]?\s*$/i.test(trimmed) && !/127\.0\.0\.1:/.test(trimmed)) {
      errors.push('docker-compose.yml must bind PostgreSQL port to 127.0.0.1 (not 0.0.0.0)');
      return;
    }
    if (/^(?:-\s*)?target:\s*5432\b/.test(trimmed)) {
      const windowBlock = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 5)).join('\n');
      if (!/\bhost_ip:\s*['"]?127\.0\.0\.1['"]?/.test(windowBlock)) {
        errors.push('docker-compose.yml must bind PostgreSQL port to 127.0.0.1 (not 0.0.0.0)');
        return;
      }
    }
  }
}

function validateStitchManifest(rootDir, errors) {
  const manifestPath = path.join(rootDir, 'designs', 'stitch-manifest.json');
  if (!fs.existsSync(manifestPath)) return;
  const designsRoot = path.resolve(rootDir, 'designs');
  const isInsideDesigns = (candidatePath) => {
    const rel = path.relative(designsRoot, path.resolve(rootDir, candidatePath));
    return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
  };
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const tokensRel = String(manifest.tokensPath ?? '');
    const fullTokens = path.resolve(rootDir, tokensRel);
    if (!tokensRel || !isInsideDesigns(tokensRel)) {
      errors.push(`designs/stitch-manifest.json tokensPath "${tokensRel}" must stay inside designs/`);
    } else if (!fs.existsSync(fullTokens) || !fs.statSync(fullTokens).isFile()) {
      errors.push(`designs/stitch-manifest.json tokensPath "${tokensRel}" does not exist or is not a file`);
    }
    if (!Array.isArray(manifest.screens) || manifest.screens.length === 0) {
      errors.push('designs/stitch-manifest.json must declare a non-empty screens array');
      return;
    }
    for (const screen of manifest.screens) {
      const screenRel = String(screen?.path ?? '');
      const fullScreen = path.resolve(rootDir, screenRel);
      if (!screenRel || !isInsideDesigns(screenRel)) {
        errors.push(`designs/stitch-manifest.json screen path "${screenRel}" must stay inside designs/`);
      } else if (
        !fs.existsSync(fullScreen) ||
        !fs.statSync(fullScreen).isFile() ||
        fs.statSync(fullScreen).size === 0
      ) {
        errors.push(`designs/stitch-manifest.json references missing, non-file, or empty screen: ${screenRel}`);
      }
    }
  } catch (err) {
    errors.push(`designs/stitch-manifest.json is not valid JSON: ${err.message}`);
  }
}

function validateTsconfigs(rootDir, errors) {
  const appsDir = path.join(rootDir, 'apps');
  for (const tsPath of walkFiles(appsDir, (name) => TSCONFIG_RE.test(name))) {
    const rel = path.relative(rootDir, tsPath).replace(/\\/g, '/');
    try {
      const parsed = JSON.parse(fs.readFileSync(tsPath, 'utf8'));
      const opts = parsed.compilerOptions ?? {};
      for (const flag of REQUIRED_TSCONFIG_FLAGS) {
        if (opts[flag] !== true) {
          errors.push(`${rel}: compilerOptions.${flag} must be true`);
        }
      }
    } catch (err) {
      errors.push(`${rel} is not valid JSON: ${err.message}`);
    }
  }
}

function validateCodeHygiene(rootDir, errors) {
  const scanRoots = [
    path.join(rootDir, 'apps'),
    path.join(rootDir, 'specs', 'contracts'),
  ];
  const sourceFiles = scanRoots.flatMap((dir) =>
    walkFiles(dir, (name) => TS_SOURCE_RE.test(name))
  );
  const FORBIDDEN_TEST_MODIFIERS = new Set(['only', 'skip', 'fixme', 'skipIf', 'runIf', 'todo']);
  const FORBIDDEN_TEST_CALLEES = new Set(['xit', 'xdescribe', 'xtest', 'fit', 'fdescribe']);
  const TEST_ROOT_NAMES = new Set(['describe', 'it', 'test', 'suite']);

  const findTestRootName = (expr) => {
    let cur = expr;
    while (cur && typeof cur === 'object') {
      if (cur.type === 'ChainExpression') cur = cur.expression;
      if (cur.type === 'Identifier') return TEST_ROOT_NAMES.has(cur.name) ? cur.name : null;
      if (cur.type === 'MemberExpression') {
        cur = cur.object;
        continue;
      }
      if (cur.type === 'CallExpression') {
        cur = cur.callee;
        continue;
      }
      return null;
    }
    return null;
  };

  for (const srcPath of sourceFiles) {
    if (srcPath.endsWith('.d.ts')) continue;
    const rel = path.relative(rootDir, srcPath).replace(/\\/g, '/');
    const isTestFile = TEST_FILE_RE.test(rel);
    const isApiEntry = rel === 'apps/api/src/index.ts';
    const raw = fs.readFileSync(srcPath, 'utf8');
    const lines = raw.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const supMatch = lines[i].match(/@(ts-ignore|ts-nocheck|ts-expect-error)\b/);
      if (supMatch) {
        errors.push(`${rel}:${i + 1} uses forbidden @${supMatch[1]} suppression`);
      }
    }

    const parsed = parseSync(rel, raw);
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      errors.push(`${rel}: syntax error prevented AST verification (${parsed.errors[0].message})`);
      continue;
    }

    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      const line = offsetToLine(raw, node.start ?? 0);
      const loc = `${rel}:${line}`;

      if (node.type === 'TSAnyKeyword') {
        errors.push(`${loc} uses forbidden explicit any type`);
      } else if (node.type === 'DebuggerStatement') {
        errors.push(`${loc} leaves forbidden debugger statement`);
      } else if (!isTestFile && !isApiEntry && node.type === 'MemberExpression') {
        const isConsoleObj = node.object?.type === 'Identifier' && node.object.name === 'console';
        const propName =
          !node.computed && node.property?.type === 'Identifier'
            ? node.property.name
            : node.computed && node.property?.type === 'Literal'
              ? node.property.value
              : null;
        if (isConsoleObj && propName === 'log') {
          errors.push(`${loc} leaves stray console.log in production source`);
        }
      } else if (isTestFile && node.type === 'CallExpression') {
        const callee = node.callee?.type === 'ChainExpression' ? node.callee.expression : node.callee;
        if (callee?.type === 'Identifier' && FORBIDDEN_TEST_CALLEES.has(callee.name)) {
          errors.push(`${loc} leaves focused or skipped test (${callee.name})`);
        } else if (callee?.type === 'MemberExpression') {
          const rootName = findTestRootName(callee.object);
          if (rootName) {
            const propName =
              !callee.computed && callee.property?.type === 'Identifier'
                ? callee.property.name
                : callee.computed && callee.property?.type === 'Literal'
                  ? callee.property.value
                  : null;
            if (typeof propName === 'string' && FORBIDDEN_TEST_MODIFIERS.has(propName)) {
              errors.push(`${loc} leaves focused or skipped test (${rootName}.${propName})`);
            }
          }
        }
      }

      for (const value of Object.values(node)) {
        if (Array.isArray(value)) {
          for (const item of value) visit(item);
        } else if (value && typeof value === 'object') {
          visit(value);
        }
      }
    };

    visit(parsed.program);
  }
}

function offsetToLine(raw, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < raw.length; i++) {
    if (raw.charCodeAt(i) === 10) line++;
  }
  return line;
}

function validateFrontendArrowFunctions(rootDir, errors) {
  const webSrcDir = path.join(rootDir, 'apps', 'web', 'src');
  for (const srcPath of walkFiles(webSrcDir, (name) => TS_SOURCE_RE.test(name))) {
    if (srcPath.endsWith('.d.ts')) continue;
    const rel = path.relative(rootDir, srcPath).replace(/\\/g, '/');
    if (TEST_FILE_RE.test(rel)) continue;

    const raw = fs.readFileSync(srcPath, 'utf8');
    const parsed = parseSync(rel, raw);
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      errors.push(`${rel}: syntax error prevented AST verification (${parsed.errors[0].message})`);
      continue;
    }

    const visit = (node, parent = null) => {
      if (!node || typeof node !== 'object') return;
      const isClassOrAccessorMethod =
        node.type === 'FunctionExpression' &&
        (parent?.type === 'MethodDefinition' ||
          (parent?.type === 'Property' &&
            (parent.kind === 'get' || parent.kind === 'set' || parent.method === true)));

      if (
        (node.type === 'FunctionDeclaration' ||
          (node.type === 'FunctionExpression' && !isClassOrAccessorMethod)) &&
        node.declare !== true
      ) {
        const line = offsetToLine(raw, node.start ?? 0);
        const fnName = node.id?.name ? ` "${node.id.name}"` : '';
        errors.push(
          `${rel}:${line} uses non-arrow function${fnName}; apps/web/src requires arrow functions for consistency`
        );
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) {
          for (const item of value) visit(item, node);
        } else if (value && typeof value === 'object') {
          visit(value, node);
        }
      }
    };

    visit(parsed.program, null);
  }
}

function validateEvaluationFile(rootDir, feat, errors, hasGitRepo) {
  const featId = feat.id;
  const relPath = path.join('evaluations', `${featId}.json`);
  const evalPath = path.join(rootDir, relPath);
  if (!fs.existsSync(evalPath)) {
    errors.push(`Feature ${featId} is marked done without ${relPath.replace(/\\/g, '/')}`);
    return;
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
  } catch (err) {
    errors.push(`${relPath} is not valid JSON: ${err.message}`);
    return;
  }

  if (report.featureId !== featId) {
    errors.push(`${relPath}: featureId "${report.featureId}" does not match "${featId}"`);
  }
  const commit = String(report.evaluatedCommit ?? '');
  if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
    errors.push(`${relPath}: evaluatedCommit must be a 7-40 char git commit SHA`);
  } else {
    if (String(feat.evidence ?? '').trim() && !String(feat.evidence ?? '').includes(commit)) {
      errors.push(
        `Feature ${featId} evidence must cite evaluatedCommit "${commit}" from ${relPath.replace(/\\/g, '/')}`
      );
    }
    if (hasGitRepo) {
      if (!commitExistsInGit(rootDir, commit)) {
        errors.push(`${relPath}: evaluatedCommit "${commit}" does not exist in git history`);
      } else if (!commitIsAncestorOfHead(rootDir, commit)) {
        errors.push(`${relPath}: evaluatedCommit "${commit}" is not an ancestor of HEAD`);
      }
    }
  }
  if (report.evaluatorRole !== 'independent-evaluator') {
    errors.push(`${relPath}: evaluatorRole must be "independent-evaluator" (self-grading forbidden)`);
  }
  if (!Array.isArray(report.liveChecks) || report.liveChecks.length === 0) {
    errors.push(`${relPath}: liveChecks must contain at least one executed runtime probe`);
  } else {
    const NEGATIVE_PROBE_RE =
      /(?<!\b0\s)\bskip(?:ped)?\b|(?<!\b0\s)\b(?:failed|unverified)\b|\b(?:not\s+run|will\s+run|later|assumed|mentally|didn't\s+run|did\s+not\s+run)\b|\bTODO:/i;
    const LIVE_HTTP_METHOD_RE =
      /\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(?:https?:\/\/|\/)[^\n]*(?:->|→|\b(?:[1-5]\d{2}|ok|pass(?:ed)?)\b)/;
    const LIVE_PROBE_RE =
      /\b(?:localhost|127\.0\.0\.1):\d+[^\n]*(?:->|→|\b(?:[1-5]\d{2}|pass(?:ed)?|ok|rendered|hydrated|exited?\s*\d)\b)|(?:curl|fetch|axios|supertest|request)\b[^\n]*(?:localhost|127\.0\.0\.1)|\b(?:test:e2e|playwright|cypress)\b|\b(?:HTTP\/?\s*[12](?:\.\d)?|status\s*(?:code\s*)?[:=]\s*[1-5]\d{2})\b|(?:\/api\/|https?:\/\/|localhost|127\.0\.0\.1|HTTP|status)[^\n]*(?:→|->)\s*[1-5]\d{2}\b|\bDOM\b[^\n]*\b(?:inspect|verif|check|assert)|\b(?:docker\s+compose|docker\s+ps|psql|pg_dump)\b[^\n]*(?:->|→|exited?\s*\d)/i;
    const hasRealProbe = report.liveChecks.some((check) => {
      const text = String(check);
      if (NEGATIVE_PROBE_RE.test(text)) return false;
      return LIVE_HTTP_METHOD_RE.test(text) || LIVE_PROBE_RE.test(text);
    });
    if (!hasRealProbe) {
      errors.push(
        `${relPath}: liveChecks must contain at least one entry describing a real runtime probe (HTTP request, localhost URL, Playwright/E2E test, or DOM inspection)`
      );
    }
  }
  if (!Array.isArray(report.blockingIssues) || report.blockingIssues.length > 0) {
    errors.push(`${relPath}: blockingIssues must be an empty array for a done feature`);
  }
  if (report.verdict !== 'PASS') {
    errors.push(`${relPath}: verdict must be "PASS" (got "${report.verdict}")`);
  }
  if (!report.summary || !String(report.summary).trim()) {
    errors.push(`${relPath}: summary must be non-empty`);
  }

  const rubric = report.rubric ?? {};
  for (const key of RUBRIC_KEYS) {
    const score = rubric[key];
    if (typeof score !== 'number' || score < MIN_RUBRIC_SCORE || score > 10) {
      errors.push(`${relPath}: rubric.${key} must be between ${MIN_RUBRIC_SCORE} and 10 (got ${score})`);
    }
  }
}

function validatePackageScripts(rootDir, errors) {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const previewCmd = String(pkg?.scripts?.['preview:web'] ?? '').trim();
    if (!previewCmd || !/\bbuild\b/.test(previewCmd) || !/\bpreview\b/.test(previewCmd)) {
      errors.push(
        'package.json must define scripts["preview:web"] building and serving the production web bundle (build + preview)'
      );
    }
  } catch (err) {
    errors.push(`package.json is not valid JSON: ${err.message}`);
  }
}

export function validateHarness(rootDir) {
  const errors = [];
  const hasGitRepo = fs.existsSync(path.join(rootDir, '.git'));

  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(rootDir, rel))) {
      errors.push(`Missing required harness file: ${rel}`);
    }
  }

  validateHooks(rootDir, errors, hasGitRepo);
  validateGitTrackedSecrets(rootDir, errors, hasGitRepo);
  validateDockerCompose(rootDir, errors);
  validatePackageScripts(rootDir, errors);
  validateStitchManifest(rootDir, errors);

  const ciPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
  if (fs.existsSync(ciPath)) {
    const ciActive = stripHashComments(fs.readFileSync(ciPath, 'utf8'));
    for (const [label, pattern] of CI_REQUIRED_PATTERNS) {
      if (!pattern.test(ciActive)) {
        errors.push(`.github/workflows/ci.yml is missing required CI gate or trigger: ${label}`);
      }
    }
    for (const line of ciActive.split(/\r?\n/)) {
      if (
        /\bnpm\s+(?:run\s+(?:check:harness|typecheck|test:unit|build|test:e2e)|audit)\b/.test(line) &&
        /\|\|\s*(?:true\b|:(?:\s|$|;|&)|exit\s+0\b)|;\s*(?:true\b|:(?:\s|$|;|&)|exit\s+0\b)/.test(line)
      ) {
        errors.push(`.github/workflows/ci.yml masks exit code on verification gate (${line.trim()})`);
      }
    }
    if (/\bcontinue-on-error\s*:\s*true\b/i.test(ciActive)) {
      errors.push('.github/workflows/ci.yml must not set continue-on-error: true on verification gates');
    }
  }

  const featurePath = path.join(rootDir, 'feature_list.json');
  if (fs.existsSync(featurePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(featurePath, 'utf8'));
      if (!Array.isArray(parsed.features) || parsed.features.length === 0) {
        errors.push('feature_list.json must contain a non-empty "features" array');
      } else {
        const byId = new Map();
        for (const feat of parsed.features) {
          if (feat.id) {
            if (byId.has(feat.id)) {
              errors.push(`Duplicate feature id "${feat.id}" in feature_list.json`);
            } else {
              byId.set(feat.id, feat);
            }
          }
        }

        const visitState = new Map();
        const detectCycles = (id, trail) => {
          visitState.set(id, 1);
          const node = byId.get(id);
          for (const depId of Array.isArray(node?.dependencies) ? node.dependencies : []) {
            if (!byId.has(depId)) continue;
            const depState = visitState.get(depId) ?? 0;
            if (depState === 1) {
              errors.push(`Dependency cycle detected in feature_list.json: ${[...trail, depId].join(' -> ')}`);
            } else if (depState === 0) {
              detectCycles(depId, [...trail, depId]);
            }
          }
          visitState.set(id, 2);
        };

          const activeIds = [];
          for (const feat of parsed.features) {
            if (!feat.id || !feat.name || !feat.description || !Array.isArray(feat.dependencies)) {
              errors.push(`Invalid feature entry schema: ${JSON.stringify(feat.id ?? feat)}`);
            } else {
              for (const depId of feat.dependencies) {
                const dep = byId.get(depId);
                if (!dep) {
                  errors.push(`Feature ${feat.id} references unknown dependency "${depId}"`);
                } else if (feat.status !== 'not-started' && dep.status !== 'done') {
                  errors.push(`Feature ${feat.id} (${feat.status}) depends on ${depId} (${dep.status}) which is not done`);
                }
              }
              if (!visitState.has(feat.id)) detectCycles(feat.id, [feat.id]);
            }
            if (!VALID_STATUSES.has(feat.status)) {
              errors.push(`Feature ${feat.id} has invalid status "${feat.status}"`);
            }
            if (feat.status === 'in-progress' || feat.status === 'ready-for-eval') {
              activeIds.push(`${feat.id} (${feat.status})`);
            }
            if (feat.status === 'done') {
              if (!feat.evidence || !String(feat.evidence).trim()) {
                errors.push(`Feature ${feat.id} is marked done without verification evidence`);
              }
              validateEvaluationFile(rootDir, feat, errors, hasGitRepo);
            }
          }
          if (activeIds.length > 1) {
            errors.push(
              `One feature at a time violated: multiple active features in feature_list.json (${activeIds.join(', ')})`
            );
          }

          const evalDir = path.join(rootDir, 'evaluations');
          if (fs.existsSync(evalDir)) {
            for (const entry of fs.readdirSync(evalDir)) {
              if (!entry.endsWith('.json')) continue;
              const evalFeatId = entry.slice(0, -'.json'.length);
              if (!byId.has(evalFeatId)) {
                errors.push(
                  `Orphan evaluation artifact evaluations/${entry} references unknown feature "${evalFeatId}"`
                );
              }
            }
          }
      }
    } catch (err) {
      errors.push(`feature_list.json is not valid JSON: ${err.message}`);
    }
  }

function validateSkillsIntegrity(rootDir, errors) {
  const skillsRoot = path.join(rootDir, '.agents', 'skills');
  const ROLE_DAG_SKILLS = new Set([
    'pm-prd-story',
    'design-stitch-flow',
    'tech-lead-contract',
    'be-express-pg',
    'fe-shadcn-clean',
    'qa-vercel-audit',
  ]);
  const FOREIGN_STACK_RE =
    /\b(?:Cargo\.toml|pyproject\.toml|go\.mod|pytest|cargo\s+test|go\s+test)\b/;
  const STALE_SKILL_PATTERNS = [
    ['stale docs/superpowers/ path', /\bdocs\/superpowers\//],
    ['vendored narrative session date (2025-10-03)', /\b2025-10-03\b/],
    ['vendored narrative test count (1847 tests)', /\b1847\s+tests\b/],
    ['foreign monorepo path (packages/core)', /\bpackages\/core\b/],
    ['broken section reference (Phase 4.5)', /\bPhase\s+4\.5\b/],
    ['stale external plugin reference (subagent-driven-development)', /\bsubagent-driven-development\b/],
    ['stale superpowers: namespace prefix', /\bsuperpowers:[a-z0-9-]+/],
  ];
  const CONCRETE_REPO_PATH_RE =
    /`((?:\.agents\/(?:workflows|skills|hooks\.json|STATE\.md)|scripts\/|apps\/(?:web|api|e2e)\/AGENTS\.md|specs\/prd\.md|designs\/(?:stitch-manifest|design-tokens)\.json)[A-Za-z0-9._/-]*)`/g;

  for (const skillFile of walkFiles(skillsRoot, (name) => name === 'SKILL.md')) {
    const raw = fs.readFileSync(skillFile, 'utf8');
    const relSkill = path.relative(rootDir, skillFile).replace(/\\/g, '/');
    const dirName = path.basename(path.dirname(skillFile));
    const lines = raw.length === 0 ? 0 : raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
    if (lines > 250) {
      errors.push(`${relSkill} has ${lines} lines (must be <= 250 lines)`);
    }
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!fmMatch || !/^description:\s*(?:[>|][-+]?\s*\r?\n\s*)?["']?Use when\b/m.test(fmMatch[1])) {
      errors.push(
        `${relSkill} must include YAML frontmatter with trigger-only description starting with "Use when..."`
      );
    } else if (!/\bNot for\b/.test(fmMatch[1])) {
      errors.push(
        `${relSkill} description must declare a negative boundary ("Not for ...") to prevent over-triggering`
      );
    }
    if (fmMatch) {
      const nameMatch = fmMatch[1].match(/^name:\s*["']?([a-z0-9-]+)["']?\s*$/m);
      if (!nameMatch || nameMatch[1] !== dirName) {
        errors.push(
          `${relSkill} frontmatter name ("${nameMatch?.[1] ?? 'missing'}") must match directory name "${dirName}"`
        );
      }
    }
  }

  for (const mdFile of walkFiles(skillsRoot, (name) => name.endsWith('.md'))) {
    const raw = fs.readFileSync(mdFile, 'utf8');
    const relMd = path.relative(rootDir, mdFile).replace(/\\/g, '/');
    const mdDir = path.dirname(mdFile);

    const foreignMatch = raw.match(FOREIGN_STACK_RE);
    if (foreignMatch) {
      errors.push(
        `${relMd} contains foreign-stack boilerplate ("${foreignMatch[0]}"); tailor skill commands to this Node/TypeScript monorepo`
      );
    }
    for (const [label, pattern] of STALE_SKILL_PATTERNS) {
      if (pattern.test(raw)) {
        errors.push(`${relMd} contains ${label}`);
      }
    }
    for (const repoPathMatch of raw.matchAll(CONCRETE_REPO_PATH_RE)) {
      const candidate = repoPathMatch[1];
      if (
        candidate.endsWith('/') ||
        candidate.includes('<') ||
        candidate.includes('{') ||
        candidate.includes('*') ||
        candidate.includes('...')
      ) {
        continue;
      }
      if (!fs.existsSync(path.join(rootDir, candidate))) {
        errors.push(`${relMd} references missing repository path: ${candidate}`);
      }
    }

    for (const linkMatch of raw.matchAll(/\[[^\]]+\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
      const target = linkMatch[1].trim();
      if (target.includes('://') || target.startsWith('/') || target.startsWith('#')) continue;
      if (!fs.existsSync(path.resolve(mdDir, target))) {
        errors.push(`${relMd} contains broken relative markdown link: ${target}`);
      }
    }

    for (const relMatch of raw.matchAll(/(?<![A-Za-z0-9_.-])((?:\.\.\/)+[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)/g)) {
      const token = relMatch[1];
      if (!fs.existsSync(path.resolve(mdDir, token))) {
        errors.push(`${relMd} references missing relative skill path: ${token}`);
      }
    }
  }

  for (const anySkillFile of walkFiles(skillsRoot, () => true)) {
    const relPath = path.relative(rootDir, anySkillFile).replace(/\\/g, '/');
    if (!/^\.agents\/skills\/[^/]+\/scripts\/[^/]+$/.test(relPath)) continue;
    if (/\.(?:c?js|mjs|md|html|json|txt)$/i.test(relPath)) {
      continue;
    }
    const mode = fs.statSync(anySkillFile).mode;
    if ((mode & 0o111) === 0) {
      errors.push(`${relPath} must be executable (chmod +x)`);
    }
  }

  const routerPath = path.join(skillsRoot, 'using-superpowers', 'SKILL.md');
  const routerRaw = fs.existsSync(routerPath) ? fs.readFileSync(routerPath, 'utf8') : null;

  if (fs.existsSync(skillsRoot)) {
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(skillsRoot, entry.name);
      const skillFiles = walkFiles(skillDir, () => true);
      const entryPoint = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(entryPoint)) {
        const relEntry = `.agents/skills/${entry.name}/SKILL.md`;
        if (!REQUIRED_FILES.includes(relEntry)) {
          errors.push(`.agents/skills/${entry.name} is missing required SKILL.md entry file`);
        }
        continue;
      }

      if (
        routerRaw !== null &&
        entry.name !== 'using-superpowers' &&
        !ROLE_DAG_SKILLS.has(entry.name) &&
        !new RegExp(`\\b${entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(routerRaw)
      ) {
        errors.push(
          `Single-agent skill "${entry.name}" is missing from .agents/skills/using-superpowers/SKILL.md routing table`
        );
      }

      const reachable = new Set([entryPoint]);
      const queue = [entryPoint];
      while (queue.length > 0) {
        const current = queue.shift();
        let text = '';
        try {
          text = fs.readFileSync(current, 'utf8');
        } catch {
          continue;
        }
        for (const candidate of skillFiles) {
          if (reachable.has(candidate)) continue;
          const base = path.basename(candidate);
          const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const boundaryRe = new RegExp(`(?<![A-Za-z0-9._-])${escapedBase}(?![A-Za-z0-9._-])`);
          if (boundaryRe.test(text)) {
            reachable.add(candidate);
            queue.push(candidate);
          }
        }
      }

      for (const candidate of skillFiles) {
        if (!reachable.has(candidate)) {
          const relOrphan = path.relative(rootDir, candidate).replace(/\\/g, '/');
          errors.push(
            `${relOrphan} is an orphan unreferenced auxiliary skill file (not reachable from SKILL.md)`
          );
        }
      }
    }
  }
}

  validateSkillsIntegrity(rootDir, errors);

  for (const cfgFile of walkFiles(rootDir, (name) => CONFIG_RE.test(name))) {
    const raw = fs.readFileSync(cfgFile, 'utf8');
    if (/\b__dirname\b/.test(raw)) {
      errors.push(`${path.relative(rootDir, cfgFile)} uses __dirname; use import.meta.dirname instead`);
    }
  }

  validateTsconfigs(rootDir, errors);
  validateCodeHygiene(rootDir, errors);
  validateFrontendArrowFunctions(rootDir, errors);

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = validateHarness(process.cwd());
  if (violations.length > 0) {
    for (const v of violations) console.error(`[harness-error] ${v}`);
    process.exit(1);
  }
  console.log(
    'Harness checks passed (artifacts, lifecycle & git hooks, CI gates, feature DAG, git-ancestor evaluator PASS gates, strict tsconfig & code hygiene, SKILL.md <= 250 lines, ESM configs).'
  );
}
