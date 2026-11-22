import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateHarness } from './check-harness.mjs';

function makeTempFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-check-'));
  for (const file of ['AGENTS.md', 'GEMINI.md', 'progress.md', 'session-handoff.md', 'init.sh']) {
    fs.writeFileSync(path.join(dir, file), '# ok\n');
  }
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
          evidence: 'Passed ./init.sh',
        },
      ],
    })
  );
  return dir;
}

test('passes on current repository root', () => {
  assert.deepEqual(validateHarness(process.cwd()), []);
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
