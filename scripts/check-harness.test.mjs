import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateHarness } from './check-harness.mjs';

function makeValidEvaluation(featureId = 'feat-001', overrides = {}) {
  return {
    featureId,
    evaluatedCommit: '3a0f893',
    evaluatorRole: 'independent-evaluator',
    liveChecks: [
      'GET http://localhost:4000/api/health -> 200 ok',
      'Playwright live DOM & UX inspection on http://localhost:5173',
    ],
    rubric: {
      functionalCompleteness: 9,
      recruiterUxClarity: 8,
      visualCraftResponsiveness: 8,
      codeTestHygiene: 9,
    },
    blockingIssues: [],
    verdict: 'PASS',
    summary: 'Verified against live PostgreSQL API and rendered UI with zero defects.',
    ...overrides,
  };
}

function makeTempFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-check-'));
  for (const file of ['AGENTS.md', 'GEMINI.md', 'progress.md', 'session-handoff.md', 'init.sh']) {
    fs.writeFileSync(path.join(dir, file), '# ok\n');
  }
  fs.mkdirSync(path.join(dir, 'evaluations'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'evaluations', 'feat-001.json'),
    JSON.stringify(makeValidEvaluation('feat-001'), null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'feature_list.json'),
    JSON.stringify({
      features: [
        {
          id: 'feat-001',
          name: 'Test',
          description: 'Desc',
          dependencies: [],
          status: 'done',
          evidence: 'Passed ./init.sh and evaluator PASS',
        },
      ],
    })
  );
  return dir;
}

test('passes on valid fixture with independent evaluator PASS artifact', () => {
  const dir = makeTempFixture();
  assert.deepEqual(validateHarness(dir), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('allows ready-for-eval status before evaluator runs', () => {
  const dir = makeTempFixture();
  fs.rmSync(path.join(dir, 'evaluations'), { recursive: true, force: true });
  fs.writeFileSync(
    path.join(dir, 'feature_list.json'),
    JSON.stringify({
      features: [
        {
          id: 'feat-001',
          name: 'Test',
          description: 'Desc',
          dependencies: [],
          status: 'ready-for-eval',
          evidence: 'Generator passed ./init.sh; awaiting independent evaluator.',
        },
      ],
    })
  );
  assert.deepEqual(validateHarness(dir), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags done feature missing evaluations/<id>.json artifact', () => {
  const dir = makeTempFixture();
  fs.unlinkSync(path.join(dir, 'evaluations', 'feat-001.json'));

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /evaluations\/feat-001\.json/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags done feature when evaluator rubric score is below 7 or self-graded', () => {
  const dir = makeTempFixture();
  fs.writeFileSync(
    path.join(dir, 'evaluations', 'feat-001.json'),
    JSON.stringify(
      makeValidEvaluation('feat-001', {
        evaluatorRole: 'generator',
        rubric: {
          functionalCompleteness: 9,
          recruiterUxClarity: 6,
          visualCraftResponsiveness: 8,
          codeTestHygiene: 9,
        },
      })
    )
  );

  const errors = validateHarness(dir);
  assert.equal(errors.length, 2);
  assert.match(errors.join('\n'), /independent-evaluator/);
  assert.match(errors.join('\n'), /recruiterUxClarity/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags SKILL.md exceeding 250 lines', () => {
  const dir = makeTempFixture();
  const skillDir = path.join(dir, '.agents', 'skills', 'bloated');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'line\n'.repeat(251));

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /250 lines/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags done feature missing verification evidence', () => {
  const dir = makeTempFixture();
  fs.writeFileSync(
    path.join(dir, 'feature_list.json'),
    JSON.stringify({
      features: [
        {
          id: 'feat-001',
          name: 'Test',
          description: 'Desc',
          dependencies: [],
          status: 'done',
          evidence: '   ',
        },
      ],
    })
  );

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /feat-001.*evidence/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags __dirname in Vite/Vitest/Playwright config files', () => {
  const dir = makeTempFixture();
  const webDir = path.join(dir, 'apps', 'web');
  fs.mkdirSync(webDir, { recursive: true });
  fs.writeFileSync(path.join(webDir, 'vite.config.ts'), 'const p = __dirname;\n');

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /__dirname/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('passes on current repository root', () => {
  assert.deepEqual(validateHarness(process.cwd()), []);
});
