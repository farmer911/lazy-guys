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
