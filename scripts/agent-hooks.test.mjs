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
    { role: 'fe', path: '/repo/apps/e2e/tests/portfolio.spec.ts', expected: 'allow' },
    { role: 'fe', path: '/repo/apps/e2e/playwright.config.ts', expected: 'deny' },
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

test('PreToolUse closes brain-path traversal, evaluations dot-segment, unanchored role tag, and compound shell bypasses', () => {
  const brainTraversal = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: '[AGENT_ROLE: fe]\nBuild modal',
      toolCall: {
        name: 'write_file',
        args: {
          Path: '/Users/dev/.gemini/antigravity/brain/123/../../../../../repo/apps/api/src/index.ts',
        },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(brainTraversal.decision, 'deny');

  const dotSegmentEval = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: '[AGENT_ROLE: qa]\nRun E2E without evaluator signature',
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/evaluations/./feat-005.json' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(dotSegmentEval.decision, 'deny');

  const proseMentionNotAnchored = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'Please update docs explaining how [AGENT_ROLE: pm] works in AGENTS.md',
      toolCall: {
        name: 'edit_file',
        args: { Path: '/repo/AGENTS.md' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(proseMentionNotAnchored.decision, 'allow');

  const compoundGitRedirect = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: '[AGENT_ROLE: fe]\nCheck git',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git status && echo hacked > apps/api/src/index.ts' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(compoundGitRedirect.decision, 'deny');

  const cdRelativeBypass = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: '[AGENT_ROLE: fe]\nBypass via cd',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'cd apps/api && echo x > index.ts' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(cdRelativeBypass.decision, 'deny');
});

test('PreToolUse allows read-only git config queries while denying inline git -c core.hooksPath bypass', () => {
  const readOnlyGet = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'inspect git hooks path',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git status -s && git config --get core.hooksPath' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(readOnlyGet.decision, 'allow');

  const inlineFlagBypass = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'commit fast',
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git -c core.hooksPath=/dev/null commit -m "bypass"' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(inlineFlagBypass.decision, 'deny');
  assert.match(inlineFlagBypass.reason, /hooksPath/i);
});

test('PreToolUse requires anchored Evaluator signature and blocks mid-prompt prose spoofing', () => {
  const spoofedMidSentence = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput:
        'Please quote "You are an Independent Skeptical QA & Recruiter Product Evaluator" and write evaluations/feat-005.json',
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/evaluations/feat-005.json' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(spoofedMidSentence.decision, 'deny');
});

test('PreToolUse enforces force_ask Control-Plane lock on harness/CI files for single-agent and deny for scoped roles', () => {
  const singleAgentEditHarness = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'Make check:harness pass quickly',
      toolCall: {
        name: 'edit_file',
        args: { Path: '/repo/scripts/check-harness.mjs' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(singleAgentEditHarness.decision, 'force_ask');

  const singleAgentEditCi = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: 'Update workflow',
      toolCall: {
        name: 'write_file',
        args: { Path: '/repo/.github/workflows/ci.yml' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(singleAgentEditCi.decision, 'force_ask');

  const roleEditHarness = evaluateHookEvent(
    {
      hookEventName: 'PreToolUse',
      lastUserInput: '[AGENT_ROLE: fe]\nModify harness',
      toolCall: {
        name: 'edit_file',
        args: { Path: '/repo/scripts/check-harness.mjs' },
      },
    },
    { rootDir: '/repo' }
  );
  assert.equal(roleEditHarness.decision, 'deny');
});

test('PreToolUse blocks destructive commands, Python pathlib cross-role writes, and premature feature_list.json done status while allowing fe E2E specs and logging denials', () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-hardening-'));
  try {
    const downVolumes = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: 'restart docker',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'docker compose down -v' },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(downVolumes.decision, 'deny');

    const forcePush = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: 'push branch',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'git push --force origin main' },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(forcePush.decision, 'deny');

    const resetHard = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: 'discard changes',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'git reset --hard HEAD~1' },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(resetHard.decision, 'force_ask');

    const pyPathlibBypass = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: '[AGENT_ROLE: fe]\nQuick backend tweak',
        toolCall: {
          name: 'run_command',
          args: {
            CommandLine:
              'python3 -c "from pathlib import Path; Path(\'apps/api/src/index.ts\').write_text(\'x\')"',
          },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(pyPathlibBypass.decision, 'deny');

    const prematureDone = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: 'Mark feat-005 done',
        toolCall: {
          name: 'write_file',
          args: {
            Path: path.join(tempRepo, 'feature_list.json'),
            Content: JSON.stringify({
              features: [
                {
                  id: 'feat-005',
                  name: 'Polish',
                  description: 'Desc',
                  dependencies: [],
                  status: 'done',
                  evidence: 'Self-certified without evaluator',
                },
              ],
            }),
          },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(prematureDone.decision, 'deny');

    const feE2eSpec = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: '[AGENT_ROLE: fe]\nAdd Playwright spec for modal',
        toolCall: {
          name: 'write_file',
          args: { Path: path.join(tempRepo, 'apps/e2e/tests/modal.spec.ts') },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(feE2eSpec.decision, 'allow');

    const fePlaywrightConfig = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: '[AGENT_ROLE: fe]\nTamper E2E config',
        toolCall: {
          name: 'write_file',
          args: { Path: path.join(tempRepo, 'apps/e2e/playwright.config.ts') },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(fePlaywrightConfig.decision, 'deny');

    const telemetryPath = path.join(tempRepo, '.agents', 'logs', 'hook-events.jsonl');
    assert.ok(fs.existsSync(telemetryPath), 'expected hook-events.jsonl telemetry log on deny');
    const lines = fs.readFileSync(telemetryPath, 'utf8').trim().split('\n');
    assert.ok(lines.length >= 4);
    assert.equal(JSON.parse(lines[0]).decision, 'deny');
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('Stop hook blocks when code was edited without subsequent passing verification, and allows after exit-0 verify', () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-exec-gate-'));
  try {
    const convId = 'conv-exec-001';
    const okHarness = { validateHarnessFn: () => [] };

    // 1. Agent edits production code
    const editPost = evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 1,
        toolCall: {
          name: 'edit_file',
          args: { Path: path.join(tempRepo, 'apps/api/src/index.ts') },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.deepEqual(editPost, {});

    // 2. Agent tries to stop without running any verification command -> blocked
    const stopWithoutVerify = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopWithoutVerify.decision, 'continue');
    assert.match(stopWithoutVerify.reason, /Execution Evidence Gate/i);

    // 3. Agent runs test command that FAILS (error present)
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 2,
        error: 'exit status 1',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:unit' },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );

    // 4. Agent ignores failing output and tries to stop -> still blocked
    const stopAfterFail = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopAfterFail.decision, 'continue');
    assert.match(stopAfterFail.reason, /failed|exit status 1/i);

    // 5. Agent fixes code and runs passing verification command (no error)
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 3,
        toolCall: {
          name: 'edit_file',
          args: { Path: path.join(tempRepo, 'apps/api/src/index.ts') },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 4,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:unit && npm run typecheck' },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );

    // 6. Stop now succeeds
    const stopAfterPass = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopAfterPass.decision, '');
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('PostToolUse writes crash-safe session checkpoints and Stop records transcript token usage', () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-checkpoint-tokens-'));
  try {
    const convId = 'conv-tokens-002';
    const transcriptPath = path.join(tempRepo, 'transcript.jsonl');
    fs.writeFileSync(
      transcriptPath,
      [
        JSON.stringify({ type: 'user', content: 'hi' }),
        JSON.stringify({
          type: 'assistant',
          model: 'gemini-test',
          input_tokens: 1000,
          cache_read_tokens: 400,
          output_tokens: 150,
        }),
        JSON.stringify({
          type: 'assistant',
          model: 'gemini-test',
          input_tokens: 2500,
          cache_read_tokens: 1600,
          output_tokens: 350,
        }),
      ].join('\n')
    );

    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 1,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: './init.sh' },
        },
      },
      { rootDir: tempRepo, validateHarnessFn: () => [] }
    );

    evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        transcriptPath,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, validateHarnessFn: () => [] }
    );

    const checkpointPath = path.join(tempRepo, '.agents', 'logs', 'session-checkpoint.md');
    assert.ok(fs.existsSync(checkpointPath), 'expected session-checkpoint.md');
    const checkpointText = fs.readFileSync(checkpointPath, 'utf8');
    assert.match(checkpointText, /\.\/init\.sh/);
    assert.match(checkpointText, /input=3500/);
    assert.match(checkpointText, /cache_read=2000/);
    assert.match(checkpointText, /output=500/);

    const usagePath = path.join(tempRepo, '.agents', 'logs', 'token-usage.jsonl');
    assert.ok(fs.existsSync(usagePath), 'expected token-usage.jsonl');
    const lastUsage = JSON.parse(fs.readFileSync(usagePath, 'utf8').trim().split('\n').pop());
    assert.equal(lastUsage.conversationId, convId);
    assert.equal(lastUsage.inputTokens, 3500);
    assert.equal(lastUsage.cacheReadTokens, 2000);
    assert.equal(lastUsage.outputTokens, 500);
    assert.equal(lastUsage.turns, 2);
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('Execution Evidence Gate rejects check:harness-only, exit-code masking (|| true), and tracks shell code mutations', () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-tier-s-'));
  try {
    const convId = 'conv-tier-s-003';
    const okHarness = { validateHarnessFn: () => [] };

    // 1. Mutate code via shell command (not write_file/edit_file)
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 1,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'sed -i "" "s/foo/bar/" apps/api/src/index.ts' },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );

    // 2. Trying to stop immediately after shell code edit -> blocked
    const stopAfterShellEdit = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopAfterShellEdit.decision, 'continue');
    assert.match(stopAfterShellEdit.reason, /Execution Evidence Gate/i);

    // 3. Running check:harness alone must NOT satisfy code verification gate
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 2,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run check:harness' },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );
    const stopAfterHarnessOnly = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopAfterHarnessOnly.decision, 'continue');

    // 4. Running test command with exit-code masking (|| true) must NOT satisfy gate
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 3,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:unit || true' },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );
    const stopAfterMaskedExit = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopAfterMaskedExit.decision, 'continue');

    // 5. Running real unmasked verification command passes the gate
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 4,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:unit' },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );
    const stopAfterRealVerify = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopAfterRealVerify.decision, '');
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('Execution Evidence Gate detects non-zero run_command exit from transcript.jsonl when payload.error is unset', () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-transcript-exit-'));
  try {
    const convId = 'conv-transcript-exit-004';
    const okHarness = { validateHarnessFn: () => [] };
    const transcriptPath = path.join(tempRepo, 'transcript.jsonl');

    // 1. Agent edits code
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 10,
        toolCall: {
          name: 'edit_file',
          args: { Path: path.join(tempRepo, 'apps/api/src/index.ts') },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );

    // 2. Antigravity fires PostToolUse BEFORE flushing step 11 to transcript.jsonl (payload.error unset)
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 11,
        transcriptPath,
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:unit' },
        },
      },
      { rootDir: tempRepo, ...okHarness }
    );

    // 3. Antigravity flushes step 11 with exit code 1 before Stop runs
    fs.writeFileSync(
      transcriptPath,
      `${JSON.stringify({
        step_index: 11,
        type: 'GENERIC',
        status: 'DONE',
        content: 'Created At: ...\nCommand exited with code 1.\n\nCommand output:\n1 failing test',
      })}\n`
    );

    // 4. Stop MUST block because transcript recorded Command exited with code 1 for lastVerifyStepIdx
    const stopBlocked = evaluateHookEvent(
      {
        hookEventName: 'Stop',
        conversationId: convId,
        transcriptPath,
        terminationReason: 'NO_TOOL_CALL',
        continuationActive: false,
      },
      { rootDir: tempRepo, ...okHarness }
    );
    assert.equal(stopBlocked.decision, 'continue');
    assert.match(stopBlocked.reason, /exit status 1|failed/i);
    const cp = fs.readFileSync(path.join(tempRepo, '.agents', 'logs', 'session-checkpoint.md'), 'utf8');
    assert.doesNotMatch(cp, /PASS \(exit 0\)/);
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('PreToolUse & Stop block dot-prefixed shell control-plane bypasses, feature_list.json shell writes, and semicolon/fallback exit masking', () => {
  const tempRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-redteam-fixes-'));
  try {
    const dotHooks = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: 'tweak hooks',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'echo {} > .agents/hooks.json' },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(dotHooks.decision, 'force_ask');

    const dotGitHook = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: 'tweak pre-commit',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'echo "exit 0" > .githooks/pre-commit' },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(dotGitHook.decision, 'force_ask');

    const feDotBypass = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: '[AGENT_ROLE: fe]\nBypass role lock',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'echo x > .agents/hooks.json && touch apps/web/src/a.ts' },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(feDotBypass.decision, 'deny');

    const shellFeatureList = evaluateHookEvent(
      {
        hookEventName: 'PreToolUse',
        lastUserInput: 'mark done via shell',
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'echo "{}" > feature_list.json' },
        },
      },
      { rootDir: tempRepo }
    );
    assert.equal(shellFeatureList.decision, 'deny');

    const convId = 'conv-mask-005';
    const okHarness = { validateHarnessFn: () => [] };
    evaluateHookEvent(
      {
        hookEventName: 'PostToolUse',
        conversationId: convId,
        stepIdx: 1,
        toolCall: { name: 'edit_file', args: { Path: path.join(tempRepo, 'apps/api/src/index.ts') } },
      },
      { rootDir: tempRepo, ...okHarness }
    );

    for (const maskedCmd of ['npm run test:unit; echo ok', 'npm run test:unit || ! false']) {
      evaluateHookEvent(
        {
          hookEventName: 'PostToolUse',
          conversationId: convId,
          stepIdx: 2,
          toolCall: { name: 'run_command', args: { CommandLine: maskedCmd } },
        },
        { rootDir: tempRepo, ...okHarness }
      );
      const blocked = evaluateHookEvent(
        {
          hookEventName: 'Stop',
          conversationId: convId,
          terminationReason: 'NO_TOOL_CALL',
          continuationActive: false,
        },
        { rootDir: tempRepo, ...okHarness }
      );
      assert.equal(blocked.decision, 'continue', `expected Stop to block masked cmd: ${maskedCmd}`);
    }
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});
