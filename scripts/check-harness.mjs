import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_FILES = [
  'AGENTS.md',
  'GEMINI.md',
  'feature_list.json',
  'progress.md',
  'session-handoff.md',
  'init.sh',
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

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, out);
    else if (predicate(entry.name, full)) out.push(full);
  }
  return out;
}

function validateEvaluationFile(rootDir, featId, errors) {
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
  if (!/^[0-9a-f]{7,40}$/i.test(String(report.evaluatedCommit ?? ''))) {
    errors.push(`${relPath}: evaluatedCommit must be a 7-40 char git commit SHA`);
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

  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(rootDir, rel))) {
      errors.push(`Missing required harness file: ${rel}`);
    }
  }

  const featurePath = path.join(rootDir, 'feature_list.json');
  if (fs.existsSync(featurePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(featurePath, 'utf8'));
      if (!Array.isArray(parsed.features) || parsed.features.length === 0) {
        errors.push('feature_list.json must contain a non-empty "features" array');
      } else {
        for (const feat of parsed.features) {
          if (!feat.id || !feat.name || !feat.description || !Array.isArray(feat.dependencies)) {
            errors.push(`Invalid feature entry schema: ${JSON.stringify(feat.id ?? feat)}`);
          }
          if (!VALID_STATUSES.has(feat.status)) {
            errors.push(`Feature ${feat.id} has invalid status "${feat.status}"`);
          }
          if (feat.status === 'done') {
            if (!feat.evidence || !String(feat.evidence).trim()) {
              errors.push(`Feature ${feat.id} is marked done without verification evidence`);
            }
            validateEvaluationFile(rootDir, feat.id, errors);
          }
        }
      }
    } catch (err) {
      errors.push(`feature_list.json is not valid JSON: ${err.message}`);
    }
  }

  for (const skillFile of walkFiles(path.join(rootDir, '.agents', 'skills'), (name) => name === 'SKILL.md')) {
    const raw = fs.readFileSync(skillFile, 'utf8');
    const lines = raw.length === 0 ? 0 : raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
    if (lines > 250) {
      errors.push(`${path.relative(rootDir, skillFile)} has ${lines} lines (must be <= 250 lines)`);
    }
  }

  for (const cfgFile of walkFiles(rootDir, (name) => CONFIG_RE.test(name))) {
    const raw = fs.readFileSync(cfgFile, 'utf8');
    if (/\b__dirname\b/.test(raw)) {
      errors.push(`${path.relative(rootDir, cfgFile)} uses __dirname; use import.meta.dirname instead`);
    }
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = validateHarness(process.cwd());
  if (violations.length > 0) {
    for (const v of violations) console.error(`[harness-error] ${v}`);
    process.exit(1);
  }
  console.log(
    'Harness checks passed (artifacts, feature_list.json, independent evaluator PASS gates, SKILL.md <= 250 lines, ESM configs).'
  );
}
