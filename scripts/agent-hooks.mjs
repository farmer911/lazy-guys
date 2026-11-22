import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHarness } from './check-harness.mjs';

const EVALUATOR_SIGNATURE =
  'You are an Independent Skeptical QA & Recruiter Product Evaluator';

function isEvaluatorSession(lastUserInput) {
  return String(lastUserInput ?? '').includes(EVALUATOR_SIGNATURE);
}

export function evaluateHookEvent(payload, options = {}) {
  const defaultRoot = path.resolve(import.meta.dirname, '..');
  const rootDir = options.rootDir || payload?.cwd || defaultRoot;
  const event = payload?.hookEventName;

  if (event === 'PreToolUse') {
    const toolName = payload?.toolCall?.name ?? '';
    const args = payload?.toolCall?.args ?? {};
    const isEvaluator = isEvaluatorSession(payload?.lastUserInput);

    if (toolName === 'write_file' || toolName === 'edit_file') {
      const targetPath = String(args.Path ?? '').replace(/\\/g, '/');
      if (/(^|\/)evaluations\/[^/]+\.json$/.test(targetPath) && !isEvaluator) {
        return {
          decision: 'deny',
          reason:
            'Harness Lock: Generator cannot write or edit evaluations/*.json directly. Stage status="ready-for-eval", commit HEAD, and dispatch an Independent Evaluator subagent.',
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
