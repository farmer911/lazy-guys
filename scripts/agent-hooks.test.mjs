import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { evaluateHookEvent } from './agent-hooks.mjs';

const EVALUATOR_PROMPT =
  'You are an Independent Skeptical QA & Recruiter Product Evaluator for the `lazy-guy` portfolio monorepo.';

test('PreToolUse denies Generator write_file or edit_file targeting evaluations/*.json', () => {
  const res = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'Implement feat-005 and mark it done',
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/evaluations/feat-005.json' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(res.decision, 'deny');
  assert.match(res.reason, /Independent.*Evaluator|evaluations/i);
});

test('PreToolUse allows Independent Evaluator subagent write_file on evaluations/*.json', () => {
  const res = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: EVALUATOR_PROMPT,
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/evaluations/feat-005.json' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(res.decision, 'allow');
});

test('PreToolUse denies git --no-verify, hooksPath tampering, and Generator shell writes to evaluations/*.json', () => {
  const noVerify = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'commit fast',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git commit --no-verify -m "skip"' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(noVerify.decision, 'deny');

  const hooksTamper = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'disable hooks',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git config core.hooksPath /dev/null' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(hooksTamper.decision, 'deny');

  const shellForge = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'finish feat-005',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'cat <<EOF > evaluations/feat-005.json' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(shellForge.decision, 'deny');
});

test('PreToolUse allows standard git staging and .githooks configuration', () => {
  const gitAdd = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'commit evaluator artifact',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git add evaluations/feat-005.json && git status' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(gitAdd.decision, 'allow');

  const hooksInit = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'run init',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git config core.hooksPath .githooks' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(hooksInit.decision, 'allow');
});

test('Stop hook forces continuation on harness failure unless continuationActive is true', () => {
  const brokenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-stop-'));

  const blocked = evaluateHookEvent(
    {
      hookEventName: 'Stop',
      terminationReason: 'NO_TOOL_CALL',
      continuationActive: false,
      cwd: brokenDir,
    },
    { rootDir: brokenDir }
  );
  assert.equal(blocked.decision, 'continue');
  assert.match(blocked.reason, /harness/i);

  const loopGuard = evaluateHookEvent(
    {
      hookEventName: 'Stop',
      terminationReason: 'NO_TOOL_CALL',
      continuationActive: true,
      cwd: brokenDir,
    },
    { rootDir: brokenDir }
  );
  assert.equal(loopGuard.decision, '');

  fs.rmSync(brokenDir, { recursive: true, force: true });
});

test('PreToolUse enforces strict directory allowlists per [AGENT_ROLE: ...] including path traversal', () => {
  const cases = [
    { role: 'pm', path: '/repo/specs/prd.md', expected: 'allow' },
    { role: 'pm', path: '/repo/apps/web/src/App.tsx', expected: 'deny' },
    { role: 'design', path: '/repo/designs/screens/home.html', expected: 'allow' },
    { role: 'design', path: '/repo/apps/web/src/App.tsx', expected: 'deny' },
    { role: 'tech-lead', path: '/repo/specs/contracts/feat-005.ts', expected: 'allow' },
    { role: 'tech-lead', path: '/repo/db/schema.sql', expected: 'allow' },
    { role: 'tech-lead', path: '/repo/apps/web/src/components/AboutSection.tsx', expected: 'deny' },
    { role: 'be', path: '/repo/apps/api/src/routes/portfolio.ts', expected: 'allow' },
    { role: 'be', path: '/repo/apps/web/src/App.tsx', expected: 'deny' },
    { role: 'be', path: '/repo/specs/contracts/feat-005.ts', expected: 'deny' },
    { role: 'fe', path: '/repo/apps/web/src/components/Modal.tsx', expected: 'allow' },
    { role: 'fe', path: '/repo/apps/web/../api/src/index.ts', expected: 'deny' },
    { role: 'fe', path: '/repo/specs/contracts/feat-005.ts', expected: 'deny' },
    { role: 'fe', path: '/repo/apps/e2e/tests/portfolio.spec.ts', expected: 'deny' },
    { role: 'qa', path: '/repo/apps/e2e/tests/portfolio.spec.ts', expected: 'allow' },
    { role: 'qa', path: '/repo/apps/web/src/App.tsx', expected: 'deny' },
  ];

  for (const item of cases) {
    const res = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: `[AGENT_ROLE: ${item.role}]\nExecute assigned graph node`,
        toolCall: { name: 'write_file', args: { Path: item.path } },
      },
      { rootDir: '/repo' }
    );
    assert.equal(res.decision, item.expected, `role=${item.role} path=${item.path}`);
  }
});

test('PreToolUse blocks cross-boundary shell file writes for scoped roles while allowing test/read commands', () => {
  const feShellHack = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: '[AGENT_ROLE: fe]\nWire frontend API',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'cat <<EOF > apps/api/src/routes/portfolio.ts' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(feShellHack.decision, 'deny');
  assert.match(feShellHack.reason, /fe/i);

  const feRunTests = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: '[AGENT_ROLE: fe]\nRun unit tests',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'npm run test --workspace=apps/web && npm run typecheck' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(feRunTests.decision, 'allow');

  const qaEvalWithSig = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: `[AGENT_ROLE: qa]\n${EVALUATOR_PROMPT}`,
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/evaluations/feat-005.json' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(qaEvalWithSig.decision, 'allow');
});
