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
  '.github/workflows/ci.yml',
  '.agents/skills/task-guardrail/SKILL.md',
  '.agents/skills/be-express-pg/SKILL.md',
  '.agents/hooks.json',
  'scripts/agent-hooks.mjs',
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
  ['fetch-depth: 0', /\bfetch-depth\s*:\s*0\b/],
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

function validateHooks(rootDir, errors) {
  const agentHooksPath = path.join(rootDir, '.agents', 'hooks.json');
  if (fs.existsSync(agentHooksPath)) {
    const raw = fs.readFileSync(agentHooksPath, 'utf8');
    if (!/"PreToolUse"/.test(raw) || !/"Stop"/.test(raw) || !/agent-hooks\.mjs/.test(raw)) {
      errors.push('.agents/hooks.json must wire PreToolUse and Stop to scripts/agent-hooks.mjs');
    }
  }

  for (const [rel, requiredCmds] of Object.entries(GIT_HOOK_REQUIRED_COMMANDS)) {
    const full = path.join(rootDir, rel);
    if (!fs.existsSync(full)) continue;
    const mode = fs.statSync(full).mode;
    if ((mode & 0o111) === 0) {
      errors.push(`${rel} must be executable (chmod +x)`);
    }
    const raw = fs.readFileSync(full, 'utf8');
    for (const cmd of requiredCmds) {
      if (!raw.includes(cmd)) {
        errors.push(`${rel} is missing required gate command: ${cmd}`);
      }
    }
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
  const appsDir = path.join(rootDir, 'apps');
  for (const srcPath of walkFiles(appsDir, (name) => TS_SOURCE_RE.test(name))) {
    if (srcPath.endsWith('.d.ts')) continue;
    const rel = path.relative(rootDir, srcPath).replace(/\\/g, '/');
    const isTestFile = TEST_FILE_RE.test(rel);
    const isApiEntry = rel === 'apps/api/src/index.ts';
    const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const loc = `${rel}:${i + 1}`;

      if (/@(ts-ignore|ts-nocheck)\b/.test(line)) {
        errors.push(`${loc} uses forbidden @ts-ignore/@ts-nocheck suppression`);
      }

      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

      if (/(:\s*any\b|\bas\s+any\b|<any>)/.test(line)) {
        errors.push(`${loc} uses forbidden explicit any type`);
      }
      if (/\bdebugger\b/.test(line)) {
        errors.push(`${loc} leaves forbidden debugger statement`);
      }
      if (isTestFile) {
        const focusMatch = line.match(/\b(describe|it|test)\.(only|skip)\s*\(/);
        if (focusMatch) {
          errors.push(`${loc} leaves focused or skipped test (${focusMatch[1]}.${focusMatch[2]})`);
        }
      } else if (!isApiEntry && /\bconsole\.log\s*\(/.test(line)) {
        errors.push(`${loc} leaves stray console.log in production source`);
      }
    }
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

function validateEvaluationFile(rootDir, featId, errors, hasGitRepo) {
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
  } else if (hasGitRepo) {
    if (!commitExistsInGit(rootDir, commit)) {
      errors.push(`${relPath}: evaluatedCommit "${commit}" does not exist in git history`);
    } else if (!commitIsAncestorOfHead(rootDir, commit)) {
      errors.push(`${relPath}: evaluatedCommit "${commit}" is not an ancestor of HEAD`);
    }
  }
  if (report.evaluatorRole !== 'independent-evaluator') {
    errors.push(`${relPath}: evaluatorRole must be "independent-evaluator" (self-grading forbidden)`);
  }
  if (!Array.isArray(report.liveChecks) || report.liveChecks.length === 0) {
    errors.push(`${relPath}: liveChecks must contain at least one executed runtime probe`);
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

export function validateHarness(rootDir) {
  const errors = [];
  const hasGitRepo = fs.existsSync(path.join(rootDir, '.git'));

  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(rootDir, rel))) {
      errors.push(`Missing required harness file: ${rel}`);
    }
  }

  validateHooks(rootDir, errors);

  const ciPath = path.join(rootDir, '.github', 'workflows', 'ci.yml');
  if (fs.existsSync(ciPath)) {
    const ciRaw = fs.readFileSync(ciPath, 'utf8');
    for (const [label, pattern] of CI_REQUIRED_PATTERNS) {
      if (!pattern.test(ciRaw)) {
        errors.push(`.github/workflows/ci.yml is missing required CI gate or trigger: ${label}`);
      }
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
          if (feat.id) byId.set(feat.id, feat);
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
          if (feat.status === 'done') {
            if (!feat.evidence || !String(feat.evidence).trim()) {
              errors.push(`Feature ${feat.id} is marked done without verification evidence`);
            }
            validateEvaluationFile(rootDir, feat.id, errors, hasGitRepo);
          }
        }
      }
    } catch (err) {
      errors.push(`feature_list.json is not valid JSON: ${err.message}`);
    }
  }

function validateSkillsIntegrity(rootDir, errors) {
  const skillsRoot = path.join(rootDir, '.agents', 'skills');
  for (const skillFile of walkFiles(skillsRoot, (name) => name === 'SKILL.md')) {
    const raw = fs.readFileSync(skillFile, 'utf8');
    const relSkill = path.relative(rootDir, skillFile).replace(/\\/g, '/');
    const lines = raw.length === 0 ? 0 : raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
    if (lines > 250) {
      errors.push(`${relSkill} has ${lines} lines (must be <= 250 lines)`);
    }
    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!fmMatch || !/^description:\s*(?:[>|][-+]?\s*\r?\n\s*)?["']?Use when\b/m.test(fmMatch[1])) {
      errors.push(
        `${relSkill} must include YAML frontmatter with trigger-only description starting with "Use when..."`
      );
    }
  }

  for (const mdFile of walkFiles(skillsRoot, (name) => name.endsWith('.md'))) {
    const raw = fs.readFileSync(mdFile, 'utf8');
    const relMd = path.relative(rootDir, mdFile).replace(/\\/g, '/');
    const mdDir = path.dirname(mdFile);

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
