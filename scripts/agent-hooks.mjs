import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHarness } from './check-harness.mjs';
import { summarizeTranscriptTokens } from './token-stats.mjs';

const CODE_EDIT_RE =
  /^(?:apps\/|scripts\/|db\/|\.agents\/workflows\/|specs\/contracts\/|\.githooks\/|\.github\/workflows\/|\.agents\/hooks\.json$|package\.json$|init\.sh$|docker-compose\.yml$)/;

const VERIFICATION_CMD_RE =
  /(?:^|[;&|\n]\s*)(?:\.\/init\.sh\b|npm\s+run\s+(?:test(?::unit|:e2e)?|typecheck|build)\b|node\s+--test\b|npx\s+(?:vitest|tsc|playwright)\b)/;

const EXIT_MASK_RE =
  /(?:\|\||(?:\.\/init\.sh\b|npm\s+run\s+(?:test(?::unit|:e2e)?|typecheck|build)\b|node\s+--test\b|npx\s+(?:vitest|tsc|playwright)\b)[^\n;&|]*;)/;

const EVALUATOR_ANCHORED_RE =
  /^\s*(?:\[AGENT_ROLE:\s*qa\s*\]\s*)?You are an Independent Skeptical QA & Recruiter Product Evaluator\b/;

const EVALUATOR_STRUCTURAL_RE =
  /Commit SHA under evaluation:\s*[0-9a-f]{4,40}\b/i;

const ROLE_WRITE_ALLOWLIST = {
  pm: ['specs/prd.md', 'feature_list.json'],
  design: ['designs/'],
  'tech-lead': ['specs/', 'db/schema.sql', 'feature_list.json', 'progress.md', 'session-handoff.md'],
  be: ['apps/api/', 'db/seed.sql'],
  fe: ['apps/web/', 'apps/e2e/tests/'],
  qa: ['apps/e2e/', 'evaluations/'],
};

const REPO_PATH_TOKEN_RE =
  /(?<![A-Za-z0-9_.-])(?:(?:specs|designs|apps|db|evaluations|scripts|\.agents|\.githooks|\.github)\/[^\s'";|&)>]+|feature_list\.json|progress\.md|session-handoff\.md|AGENTS\.md|GEMINI\.md|package\.json|init\.sh|docker-compose\.yml|\.env)\b/g;

const SHELL_MUTATION_RE =
  /(?:>>?(?!\s*&|\s*\/dev\/null)|\btee\b|\bsed\s+-i|\bperl\s+-[a-z]*i|\bcp\b|\bmv\b|\brm\b|\btouch\b|\btruncate\b|\bdd\b|\bunlink\b|\bfind\b[^|;]*-delete\b|\binstall\b|\bln\b|\brsync\b|\bsponge\b|\bpatch\b|\btar\b|\bunzip\b|\bcurl\s+[^|;]*-o\b|\bwget\s+[^|;]*-O\b|writeFile|appendFile|copyFile|fs\.write|write_text|write_bytes|shutil\.(?:copy|move|rmtree)|os\.(?:remove|unlink|replace|rename)|\bgit\s+(?:checkout|restore|stash\s+pop|cherry-pick|merge|am|apply)\b|open\([^)]*['"][wa])/;

function isEvaluatorSession(lastUserInput) {
  const text = String(lastUserInput ?? '');
  return EVALUATOR_ANCHORED_RE.test(text) && EVALUATOR_STRUCTURAL_RE.test(text);
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

function getLogsDir(rootDir) {
  const logsDir = path.join(rootDir, '.agents', 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  return logsDir;
}

function readExecState(rootDir, convKey) {
  try {
    const statePath = path.join(rootDir, '.agents', 'logs', 'exec-state.json');
    if (!fs.existsSync(statePath)) return { seq: 0, lastCodeEditSeq: 0, lastVerifySeq: 0 };
    const all = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return all[convKey] ?? { seq: 0, lastCodeEditSeq: 0, lastVerifySeq: 0 };
  } catch {
    return { seq: 0, lastCodeEditSeq: 0, lastVerifySeq: 0 };
  }
}

function writeExecState(rootDir, convKey, state) {
  try {
    const statePath = path.join(getLogsDir(rootDir), 'exec-state.json');
    let all = {};
    if (fs.existsSync(statePath)) {
      try {
        all = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch {
        all = {};
      }
    }
    all[convKey] = state;
    fs.writeFileSync(statePath, `${JSON.stringify(all, null, 2)}\n`);
  } catch {
    // Best-effort state persistence
  }
}

function stripQuotedStrings(cmd) {
  return String(cmd ?? '').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '""');
}

function stripInlineScriptArgs(cmd) {
  // Remove content of node/python/ruby/perl -e/-c "..." or '...' arguments
  // so paths embedded in inline script strings are not false-positive tracked
  // as shell file mutations by PostToolUse code-edit detection.
  return String(cmd ?? '').replace(
    /\b(?:node|python3?|ruby|perl)\s+(?:--eval|-[ec])\s+(?:'[^']*'|"(?:\\.|[^"\\])*")/g,
    ''
  );
}

function readCommandExitStatusFromTranscript(transcriptPath, stepIdx) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split(/\r?\n/);
    let fallbackCode = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].trim()) continue;
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      if (entry.type && entry.type !== 'GENERIC') continue;
      const content = typeof entry.content === 'string' ? entry.content : '';
      const exitMatch = content.match(/Command exited with code (\d+)\./);
      if (!exitMatch) continue;
      const code = Number(exitMatch[1]);
      if (typeof stepIdx === 'number' && entry.step_index === stepIdx) {
        return code;
      }
      if (
        fallbackCode === null &&
        typeof stepIdx === 'number' &&
        typeof entry.step_index === 'number' &&
        entry.step_index >= stepIdx &&
        entry.step_index <= stepIdx + 2
      ) {
        fallbackCode = code;
      }
    }
    return fallbackCode;
  } catch {
    return null;
  }
}

function readCommandExitErrorFromTranscript(transcriptPath, stepIdx) {
  const code = readCommandExitStatusFromTranscript(transcriptPath, stepIdx);
  return typeof code === 'number' && code !== 0 ? `exit status ${code}` : '';
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
  const finish = (res) => recordHookTelemetry(rootDir, event, payload, res);
  const convKey = String(payload?.conversationId ?? 'default');

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

      if (/\bgit\s+(?:cherry-pick|stash\s+pop|merge|am|apply)\b/.test(cmd)) {
        return finish({
          decision: 'force_ask',
          reason: 'Destructive Git Command: This command can silently introduce arbitrary file changes. Confirm before proceeding.',
        });
      }

      if (/\brm\s+-[a-zA-Z]*[rR][a-zA-Z]*[fF]?\b|\brm\s+-[a-zA-Z]*[fF][a-zA-Z]*[rR]\b|\brm\s+--recursive\b/.test(cmd)) {
        const rmTargets = cmd.match(REPO_PATH_TOKEN_RE) ?? [];
        for (const token of rmTargets) {
          const { rel } = resolveRepoRelativePath(token, rootDir);
          if (CODE_EDIT_RE.test(rel)) {
            return finish({
              decision: 'force_ask',
              reason: `Destructive Command: rm -rf targeting repo directory "${rel}" requires explicit human confirmation.`,
            });
          }
        }
      }

      if (
        !isEvaluator &&
        /(?:evaluations\/[^\s'"]*\.json|(?:^|\s)evaluations\/?(?:\s|$))/.test(cmd) &&
        SHELL_MUTATION_RE.test(cmd)
      ) {
        return finish({
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot forge or modify evaluations/*.json via shell commands. Dispatch an Independent Evaluator subagent.',
        });
      }

      if (
        !isEvaluator &&
        /(?<![A-Za-z0-9_.-])feature_list\.json\b/.test(cmd) &&
        SHELL_MUTATION_RE.test(cmd)
      ) {
        return finish({
          decision: 'deny',
          reason:
            'Harness Lock: Modify feature_list.json only via write_file/edit_file so certification checks are enforced.',
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
      if (!errText && CODE_EDIT_RE.test(rel)) {
        state.lastCodeEditSeq = state.seq;
        state.lastCodeEditPath = rel;
        writeExecState(rootDir, convKey, state);
      }
    } else if (toolName === 'run_command') {
      const cmd = String(args.CommandLine ?? '').replace(/\s+/g, ' ').trim();
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
      const cmdForTracking = stripInlineScriptArgs(cmd);
      if (!effectiveErr && SHELL_MUTATION_RE.test(cmdForTracking)) {
        for (const token of cmdForTracking.match(REPO_PATH_TOKEN_RE) ?? []) {
          const { rel } = resolveRepoRelativePath(token, rootDir);
          if (CODE_EDIT_RE.test(rel)) {
            mutatedCodePath = rel;
            break;
          }
        }
      }
      const unquotedCmd = stripQuotedStrings(cmd);
      if (mutatedCodePath) {
        state.lastCodeEditSeq = state.seq;
        state.lastCodeEditPath = mutatedCodePath;
        writeExecState(rootDir, convKey, state);
      } else if (VERIFICATION_CMD_RE.test(unquotedCmd) && !EXIT_MASK_RE.test(unquotedCmd)) {
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
      if (verifyPassed !== false && typeof state.lastVerifyStepIdx === 'number') {
        const lateErr = readCommandExitErrorFromTranscript(
          payload?.transcriptPath,
          state.lastVerifyStepIdx
        );
        if (lateErr) {
          verifyPassed = false;
          verifyError = lateErr;
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
