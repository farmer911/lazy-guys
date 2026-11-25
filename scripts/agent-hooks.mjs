import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHarness } from './check-harness.mjs';

const EVALUATOR_ANCHORED_RE =
  /^\s*(?:\[AGENT_ROLE:\s*qa\s*\]\s*)?You are an Independent Skeptical QA & Recruiter Product Evaluator\b/;

const PROTECTED_CONTROL_PLANE_RE =
  /^(?:scripts\/(?:check-harness|agent-hooks)\.mjs|\.agents\/hooks\.json|\.githooks\/.+|\.github\/workflows\/.+)$/;

const ROLE_WRITE_ALLOWLIST = {
  pm: ['specs/prd.md', 'feature_list.json'],
  design: ['designs/'],
  'tech-lead': ['specs/', 'db/schema.sql', 'feature_list.json', 'progress.md', 'session-handoff.md'],
  be: ['apps/api/', 'db/seed.sql'],
  fe: ['apps/web/', 'apps/e2e/tests/'],
  qa: ['apps/e2e/', 'evaluations/'],
};

const REPO_PATH_TOKEN_RE =
  /\b(?:(?:specs|designs|apps|db|evaluations|scripts|\.agents|\.githooks|\.github)\/[^\s'";|&)>]+|feature_list\.json|progress\.md|session-handoff\.md|AGENTS\.md|GEMINI\.md|package\.json|init\.sh|docker-compose\.yml|\.env)\b/g;

const SHELL_MUTATION_RE =
  /(?:>>?(?!\s*&|\s*\/dev\/null)|\btee\b|\bsed\s+-i|\bperl\s+-[a-z]*i|\bcp\b|\bmv\b|\brm\b|\btouch\b|\btruncate\b|\bdd\b|\bunlink\b|writeFile|appendFile|copyFile|fs\.write|write_text|write_bytes|shutil\.(?:copy|move|rmtree)|os\.(?:remove|unlink|replace|rename)|\bgit\s+(?:checkout|restore)\b|open\([^)]*['"][wa])/;

function isEvaluatorSession(lastUserInput) {
  return EVALUATOR_ANCHORED_RE.test(String(lastUserInput ?? ''));
}

function hasCertifiedEvaluation(rootDir, featId) {
  try {
    const evalPath = path.join(rootDir, 'evaluations', `${featId}.json`);
    if (!fs.existsSync(evalPath)) return false;
    const report = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
    return (
      report.featureId === featId &&
      report.evaluatorRole === 'independent-evaluator' &&
      report.verdict === 'PASS'
    );
  } catch {
    return false;
  }
}

function findUncertifiedDoneFeature(rootDir, toolName, args) {
  let candidateRaw = null;
  if (toolName === 'write_file' && typeof args.Content === 'string') {
    candidateRaw = args.Content;
  } else if (toolName === 'edit_file' && typeof args.Replacement === 'string') {
    const featurePath = path.join(rootDir, 'feature_list.json');
    if (fs.existsSync(featurePath) && typeof args.Target === 'string') {
      candidateRaw = fs.readFileSync(featurePath, 'utf8').replace(args.Target, args.Replacement);
    }
  }
  if (!candidateRaw) return null;
  try {
    const parsed = JSON.parse(candidateRaw);
    for (const feat of parsed.features ?? []) {
      if (feat?.status === 'done' && feat?.id && !hasCertifiedEvaluation(rootDir, feat.id)) {
        return feat.id;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function recordHookTelemetry(rootDir, event, payload, result) {
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
  const match = String(lastUserInput ?? '').match(
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

  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    return resolvedTarget.includes('/.gemini/antigravity/brain/');
  }

  return allowlist.some((prefix) =>
    prefix.endsWith('/') ? rel.startsWith(prefix) : rel === prefix
  );
}

export function evaluateHookEvent(payload, options = {}) {
  const defaultRoot = path.resolve(import.meta.dirname, '..');
  const rootDir = options.rootDir || payload?.cwd || defaultRoot;
  const event = payload?.hookEventName;
  const finish = (res) => recordHookTelemetry(rootDir, event, payload, res);

  if (event === 'PreToolUse') {
    const toolName = payload?.toolCall?.name ?? '';
    const args = payload?.toolCall?.args ?? {};
    const isEvaluator = isEvaluatorSession(payload?.lastUserInput);
    const role = extractAgentRole(payload?.lastUserInput);

    if (toolName === 'write_file' || toolName === 'edit_file') {
      const { rel } = resolveRepoRelativePath(args.Path, rootDir);
      const targetPath = String(args.Path ?? '').replace(/\\/g, '/');
      if (
        (/^evaluations\/[^/]+\.json$/.test(rel) || /(^|\/)evaluations\/[^/]+\.json$/.test(targetPath)) &&
        !isEvaluator
      ) {
        return finish({
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot write or edit evaluations/*.json directly. Stage status="ready-for-eval", commit HEAD, and dispatch an Independent Evaluator subagent.',
        });
      }

      if (role && !isPathAllowedForRole(role, args.Path, rootDir)) {
        return finish({
          decision: 'deny',
          reason: `Harness Role Lock: Role "${role}" cannot modify "${targetPath}". Allowed paths: ${ROLE_WRITE_ALLOWLIST[role].join(', ')}.`,
        });
      }

      if (rel === 'feature_list.json' && !isEvaluator) {
        const uncertifiedId = findUncertifiedDoneFeature(rootDir, toolName, args);
        if (uncertifiedId) {
          return finish({
            decision: 'deny',
            reason: `Harness Lock: Cannot mark "${uncertifiedId}" as "done" in feature_list.json without a PASS artifact in evaluations/${uncertifiedId}.json. Stage "ready-for-eval" first.`,
          });
        }
      }

      if (!role && !isEvaluator && PROTECTED_CONTROL_PLANE_RE.test(rel)) {
        return finish({
          decision: 'force_ask',
          reason: `Control-Plane Lock: Modifying protected harness/CI file "${rel}" requires explicit human confirmation.`,
        });
      }
    }

    if (toolName === 'run_command') {
      const cmd = String(args.CommandLine ?? '');

      if (/\s--no-verify\b/.test(cmd) || /\bgit\s+commit\b[^\n]*\s-[a-z]*n[a-z]*\b/.test(cmd)) {
        return finish({
          decision: 'deny',
          reason: 'Harness Lock: --no-verify is forbidden; all repository git hooks must execute.',
        });
      }

      const isReadOnlyGitConfig =
        /\bgit\s+config\b[^\n]*\s(--get(?:-all)?|--list|-l|--show-origin)\b/.test(cmd);
      if (
        /\bgit\s+[^\n]*-c\s+['"]?core\.hooksPath\b/.test(cmd) ||
        (!isReadOnlyGitConfig &&
          /\bgit\s+config\b[^\n]*\bcore\.hooksPath\b/.test(cmd) &&
          !/\bcore\.hooksPath\s+(['"]?)\.githooks\1(\s|$|;|&)/.test(cmd))
      ) {
        return finish({
          decision: 'deny',
          reason: 'Harness Lock: core.hooksPath must remain set to .githooks (cannot override via git config or git -c).',
        });
      }

      if (/\bdocker\s+compose\s+down\b[^\n]*(?:\s-v\b|\s--volumes\b)/.test(cmd)) {
        return finish({
          decision: 'deny',
          reason: 'Harness Lock: "docker compose down -v" is forbidden to prevent destroying PostgreSQL volume data.',
        });
      }

      if (/\bgit\s+push\b[^\n]*(?:\s--force\b|\s--force-with-lease\b|\s-f\b)/.test(cmd)) {
        return finish({
          decision: 'deny',
          reason: 'Harness Lock: Force-pushing is forbidden.',
        });
      }

      if (/\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f)\b/.test(cmd)) {
        return finish({
          decision: 'force_ask',
          reason: 'Destructive Git Command: Confirm before discarding uncommitted work.',
        });
      }

      if (
        !isEvaluator &&
        /evaluations\/[^\s'"]*\.json/.test(cmd) &&
        SHELL_MUTATION_RE.test(cmd)
      ) {
        return finish({
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot forge or modify evaluations/*.json via shell commands. Dispatch an Independent Evaluator subagent.',
        });
      }

      if (SHELL_MUTATION_RE.test(cmd)) {
        const targets = cmd.match(REPO_PATH_TOKEN_RE) ?? [];
        if (role) {
          if (/\bcd\s+/.test(cmd)) {
            return finish({
              decision: 'deny',
              reason: `Harness Role Lock: Role "${role}" cannot combine directory switching (cd) with shell file mutations; use write_file/edit_file on allowed repo paths.`,
            });
          }
          if (targets.length === 0) {
            return finish({
              decision: 'deny',
              reason: `Harness Role Lock: Role "${role}" cannot run shell file mutations without an explicit allowed path (${ROLE_WRITE_ALLOWLIST[role].join(', ')}).`,
            });
          }
          for (const token of targets) {
            if (/^evaluations\/[^/]+\.json$/.test(token) && !isEvaluator) {
              return finish({
                decision: 'deny',
                reason:
                  'Harness Lock: Generator cannot forge or modify evaluations/*.json via shell commands.',
              });
            }
            if (!isPathAllowedForRole(role, token, rootDir)) {
              return finish({
                decision: 'deny',
                reason: `Harness Role Lock: Role "${role}" cannot mutate "${token}" via shell commands. Allowed paths: ${ROLE_WRITE_ALLOWLIST[role].join(', ')}.`,
              });
            }
          }
        } else if (!isEvaluator) {
          for (const token of targets) {
            const { rel } = resolveRepoRelativePath(token, rootDir);
            if (PROTECTED_CONTROL_PLANE_RE.test(rel)) {
              return finish({
                decision: 'force_ask',
                reason: `Control-Plane Lock: Shell mutation of protected file "${rel}" requires explicit human confirmation.`,
              });
            }
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
      return finish({
        decision: 'continue',
        reason: `Repository harness gate failed (${errors.length} violation(s)):\n- ${errors.join('\n- ')}\nFix all harness violations and re-run npm run check:harness before ending your turn.`,
      });
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
