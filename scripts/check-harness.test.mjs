import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

const VALID_CI_WORKFLOW = `name: CI
on:
  push:
  pull_request:
  schedule:
    - cron: '0 2 * * 1'
  workflow_dispatch:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - run: npm audit --audit-level=high
      - run: npm run check:harness
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run build
      - run: npm run test:e2e
`;

function makeTempFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-check-'));
  for (const file of ['AGENTS.md', 'GEMINI.md', 'progress.md', 'session-handoff.md', 'init.sh']) {
    fs.writeFileSync(path.join(dir, file), '# ok\n');
  }
  fs.writeFileSync(
    path.join(dir, 'docker-compose.yml'),
    'services:\n  postgres:\n    ports:\n      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"\n'
  );
  for (const appDir of ['apps/web', 'apps/api', 'apps/e2e']) {
    fs.mkdirSync(path.join(dir, appDir), { recursive: true });
    fs.writeFileSync(path.join(dir, appDir, 'AGENTS.md'), '# folder rules\n');
  }
  fs.mkdirSync(path.join(dir, 'designs', 'screens'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'designs', 'README.md'), '# designs\n');
  fs.writeFileSync(path.join(dir, 'designs', 'design-tokens.json'), '{"colors":{}}\n');
  fs.writeFileSync(
    path.join(dir, 'designs', 'stitch-manifest.json'),
    JSON.stringify({
      stitchProjectId: 'baseline',
      tokensPath: 'designs/design-tokens.json',
      screens: [{ slug: 'portfolio-home', path: 'designs/screens/portfolio-home.html' }],
    })
  );
  fs.writeFileSync(path.join(dir, 'designs', 'screens', 'portfolio-home.html'), '<main>ok</main>\n');
  fs.mkdirSync(path.join(dir, 'specs', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'specs', 'prd.md'), '# PRD\n');
  fs.writeFileSync(path.join(dir, 'specs', 'contracts', 'README.md'), '# contracts\n');
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'scripts', 'agent-hooks.mjs'), '// hook\n');
  fs.writeFileSync(path.join(dir, 'scripts', 'token-stats.mjs'), '// stats\n');
  fs.mkdirSync(path.join(dir, '.agents'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agents', 'STATE.md'), '# Active Task State\n');
  const coreSkills = [
    'task-guardrail',
    'adversarial-audit',
    'self-evolve',
    'be-express-pg',
    'pm-prd-story',
    'design-stitch-flow',
    'tech-lead-contract',
    'fe-shadcn-clean',
    'qa-vercel-audit',
    'evaluating-features',
  ];
  for (const skillName of coreSkills) {
    fs.mkdirSync(path.join(dir, '.agents', 'skills', skillName), { recursive: true });
    const body = skillName === 'evaluating-features' ? '# ok\nSee evaluator-prompt.md\n' : '# ok\n';
    fs.writeFileSync(
      path.join(dir, '.agents', 'skills', skillName, 'SKILL.md'),
      `---\nname: ${skillName}\ndescription: Use when testing ${skillName} skill presence. Not for unrelated tasks.\n---\n${body}`
    );
  }
  fs.writeFileSync(
    path.join(dir, '.agents', 'skills', 'evaluating-features', 'evaluator-prompt.md'),
    '# prompt\n'
  );
  fs.writeFileSync(path.join(dir, '.agents', 'mcp.stitch.example.json'), '{"mcpServers":{}}\n');
  fs.mkdirSync(path.join(dir, '.agents', 'workflows'), { recursive: true });
  for (const wf of ['graph_core.py', 'project_init.py', 'feature_delivery.py', 'bugfix.py']) {
    fs.writeFileSync(path.join(dir, '.agents', 'workflows', wf), '# workflow\n');
  }
  fs.writeFileSync(
    path.join(dir, '.agents', 'hooks.json'),
    JSON.stringify({
      'repo-harness-guard': {
        PreToolUse: [{ matcher: 'write_file|edit_file|run_command', hooks: [{ command: 'node ../scripts/agent-hooks.mjs' }] }],
        PostToolUse: [{ matcher: 'write_file|edit_file|run_command', hooks: [{ command: 'node ../scripts/agent-hooks.mjs' }] }],
        Stop: [{ command: 'node ../scripts/agent-hooks.mjs' }],
      },
    })
  );
  fs.mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.githooks', 'pre-commit'),
    '#!/usr/bin/env bash\nnpm run check:harness\nnpm run typecheck\n',
    { mode: 0o755 }
  );
  fs.writeFileSync(
    path.join(dir, '.githooks', 'pre-push'),
    '#!/usr/bin/env bash\nnpm run check:harness\nnpm run typecheck\nnpm run test:unit\nnpm run build\n',
    { mode: 0o755 }
  );
  fs.mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.github', 'workflows', 'ci.yml'), VALID_CI_WORKFLOW);
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
          evidence: 'Passed ./init.sh and evaluator PASS at 3a0f893',
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
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: bloated\ndescription: Use when testing line limit. Not for production use.\n---\n${'line\n'.repeat(250)}`
  );

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

test('flags done feature when evaluatedCommit does not exist in git history', () => {
  const dir = makeTempFixture();
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '--allow-empty', '-m', 'init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: dir, stdio: 'ignore' });
  const realSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: dir,
    encoding: 'utf8',
  }).trim();

  fs.writeFileSync(
    path.join(dir, 'evaluations', 'feat-001.json'),
    JSON.stringify(makeValidEvaluation('feat-001', { evaluatedCommit: 'deadbeef' }))
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
          evidence: 'Evaluated at deadbeef',
        },
      ],
    })
  );
  const badErrors = validateHarness(dir);
  assert.equal(badErrors.length, 1);
  assert.match(badErrors[0], /evaluatedCommit.*deadbeef.*git history/);

  fs.writeFileSync(
    path.join(dir, 'evaluations', 'feat-001.json'),
    JSON.stringify(makeValidEvaluation('feat-001', { evaluatedCommit: realSha }))
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
          evidence: `Evaluated at ${realSha}`,
        },
      ],
    })
  );
  assert.deepEqual(validateHarness(dir), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags missing .github/workflows/ci.yml workflow file', () => {
  const dir = makeTempFixture();
  fs.unlinkSync(path.join(dir, '.github', 'workflows', 'ci.yml'));

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /\.github\/workflows\/ci\.yml/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags .github/workflows/ci.yml missing required triggers or verification gates', () => {
  const dir = makeTempFixture();
  fs.writeFileSync(
    path.join(dir, '.github', 'workflows', 'ci.yml'),
    'on:\n  push:\n  pull_request:\n  workflow_dispatch:\njobs:\n  verify:\n    steps:\n      - run: npm run check:harness\n      - run: npm run typecheck\n      - run: npm run test:unit\n      - run: npm run build\n'
  );

  const errors = validateHarness(dir);
  assert.match(errors.join('\n'), /schedule/);
  assert.match(errors.join('\n'), /fetch-depth:\s*0/);
  assert.match(errors.join('\n'), /npm run test:e2e/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags feature referencing unknown dependency id', () => {
  const dir = makeTempFixture();
  fs.writeFileSync(
    path.join(dir, 'feature_list.json'),
    JSON.stringify({
      features: [
        {
          id: 'feat-001',
          name: 'Test',
          description: 'Desc',
          dependencies: ['feat-999'],
          status: 'not-started',
          evidence: '',
        },
      ],
    })
  );

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /feat-001.*unknown dependency.*feat-999/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags dependency cycle in feature_list.json', () => {
  const dir = makeTempFixture();
  fs.writeFileSync(
    path.join(dir, 'feature_list.json'),
    JSON.stringify({
      features: [
        {
          id: 'feat-001',
          name: 'One',
          description: 'Desc',
          dependencies: ['feat-002'],
          status: 'not-started',
          evidence: '',
        },
        {
          id: 'feat-002',
          name: 'Two',
          description: 'Desc',
          dependencies: ['feat-001'],
          status: 'not-started',
          evidence: '',
        },
      ],
    })
  );

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /cycle/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags done or active feature whose dependency is not done', () => {
  const dir = makeTempFixture();
  fs.writeFileSync(
    path.join(dir, 'evaluations', 'feat-002.json'),
    JSON.stringify(makeValidEvaluation('feat-002'), null, 2)
  );
  fs.writeFileSync(
    path.join(dir, 'feature_list.json'),
    JSON.stringify({
      features: [
        {
          id: 'feat-001',
          name: 'Base',
          description: 'Desc',
          dependencies: [],
          status: 'in-progress',
          evidence: '',
        },
        {
          id: 'feat-002',
          name: 'Child',
          description: 'Desc',
          dependencies: ['feat-001'],
          status: 'done',
          evidence: 'Passed ./init.sh and evaluator PASS at 3a0f893',
        },
      ],
    })
  );

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /feat-002.*feat-001.*not done/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags missing portable .agents/skills/task-guardrail/SKILL.md', () => {
  const dir = makeTempFixture();
  fs.unlinkSync(path.join(dir, '.agents', 'skills', 'task-guardrail', 'SKILL.md'));

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /\.agents\/skills\/task-guardrail\/SKILL\.md/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags missing or non-executable .githooks and .agents/hooks.json', () => {
  const dir = makeTempFixture();
  fs.chmodSync(path.join(dir, '.githooks', 'pre-commit'), 0o644);
  fs.unlinkSync(path.join(dir, '.agents', 'hooks.json'));

  const errors = validateHarness(dir);
  assert.match(errors.join('\n'), /pre-commit.*executable/i);
  assert.match(errors.join('\n'), /\.agents\/hooks\.json/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags workspace tsconfig missing required strict compiler flags', () => {
  const dir = makeTempFixture();
  const apiDir = path.join(dir, 'apps', 'api');
  fs.mkdirSync(apiDir, { recursive: true });
  fs.writeFileSync(
    path.join(apiDir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noUnusedLocals: false,
      },
    })
  );

  const errors = validateHarness(dir);
  assert.match(errors.join('\n'), /noUnusedLocals/);
  assert.match(errors.join('\n'), /noUnusedParameters/);
  assert.match(errors.join('\n'), /noImplicitReturns/);
  assert.match(errors.join('\n'), /noFallthroughCasesInSwitch/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags code hygiene violations in apps source and test files', () => {
  const dir = makeTempFixture();
  const srcDir = path.join(dir, 'apps', 'web', 'src');
  const testDir = path.join(srcDir, '__tests__');
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(
    path.join(srcDir, 'Bad.tsx'),
    '// @ts-ignore\nexport const x: any = 1;\nconsole.log(x);\ndebugger;\n'
  );
  fs.writeFileSync(
    path.join(testDir, 'Bad.test.tsx'),
    'it.only("focuses test", () => {});\n'
  );

  const errors = validateHarness(dir);
  const joined = errors.join('\n');
  assert.match(joined, /@ts-ignore/);
  assert.match(joined, /\bany\b/);
  assert.match(joined, /console\.log/);
  assert.match(joined, /debugger/);
  assert.match(joined, /it\.only/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags evaluatedCommit that exists in git objects but is not an ancestor of HEAD', () => {
  const dir = makeTempFixture();
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '--allow-empty', '-m', 'base'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '--allow-empty', '-m', 'orphaned'], { cwd: dir, stdio: 'ignore' });
  const orphanSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: dir,
    encoding: 'utf8',
  }).trim();
  execFileSync('git', ['reset', '--hard', 'HEAD~1'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: dir, stdio: 'ignore' });

  fs.writeFileSync(
    path.join(dir, 'evaluations', 'feat-001.json'),
    JSON.stringify(makeValidEvaluation('feat-001', { evaluatedCommit: orphanSha }))
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
          evidence: `Evaluated at ${orphanSha}`,
        },
      ],
    })
  );

  const errors = validateHarness(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /ancestor of HEAD/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags non-arrow function declarations and expressions in apps/web/src production files while ignoring string literals', () => {
  const dir = makeTempFixture();
  const compDir = path.join(dir, 'apps', 'web', 'src', 'components');
  fs.mkdirSync(compDir, { recursive: true });
  fs.writeFileSync(
    path.join(compDir, 'BadCard.tsx'),
    'export function BadCard() { return <div>function word in text</div>; }\nconst fnExpr = function () { return 1; };\nexport const ok = fnExpr();\n'
  );
  fs.writeFileSync(
    path.join(compDir, 'GoodCard.tsx'),
    'export const GoodCard = () => <div>export function in string literal is ignored</div>;\n'
  );

  const errors = validateHarness(dir);
  const badCardErrors = errors.filter((e) => e.includes('BadCard.tsx'));
  const goodCardErrors = errors.filter((e) => e.includes('GoodCard.tsx'));
  assert.equal(badCardErrors.length, 2);
  assert.match(badCardErrors[0], /arrow function/i);
  assert.equal(goodCardErrors.length, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags missing hierarchical AGENTS.md or SKILL.md without valid Use when frontmatter', () => {
  const dir = makeTempFixture();
  fs.rmSync(path.join(dir, 'apps', 'web', 'AGENTS.md'));
  fs.mkdirSync(path.join(dir, '.agents', 'skills', 'bad-skill'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.agents', 'skills', 'bad-skill', 'SKILL.md'),
    '---\nname: bad-skill\ndescription: Summarizes workflow instead of trigger.\n---\n# Bad\n'
  );

  const errors = validateHarness(dir);
  assert.ok(errors.some((e) => e.includes('apps/web/AGENTS.md')));
  assert.ok(errors.some((e) => e.includes('bad-skill/SKILL.md') && /Use when/i.test(e)));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags syntax errors in apps/web/src, allows class constructors/getters, and blocks markdown body frontmatter spoofing', () => {
  const dir = makeTempFixture();
  const srcDir = path.join(dir, 'apps', 'web', 'src');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(path.join(srcDir, 'Broken.tsx'), 'export function Broken( {\n');
  fs.writeFileSync(
    path.join(srcDir, 'ValidClassError.ts'),
    'export class ApiError extends Error { constructor(msg: string) { super(msg); } get code(): number { return 400; } }\n'
  );
  fs.mkdirSync(path.join(dir, '.agents', 'skills', 'spoof-skill'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.agents', 'skills', 'spoof-skill', 'SKILL.md'),
    '---\nname: spoof-skill\ndescription: Wrong summary.\n---\nBody text\ndescription: Use when spoofing\n---\n'
  );

  const errors = validateHarness(dir);
  assert.ok(errors.some((e) => e.includes('Broken.tsx')));
  assert.ok(!errors.some((e) => e.includes('ValidClassError.ts')));
  assert.ok(errors.some((e) => e.includes('spoof-skill/SKILL.md')));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('rejects imperative second-person SKILL.md description, broken relative links, and non-executable skill scripts', () => {
  const dir = makeTempFixture();
  const skillDir = path.join(dir, '.agents', 'skills', 'broken-skill');
  fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    [
      '---',
      'name: broken-skill',
      'description: "You MUST use this before any creative work."',
      '---',
      '# Broken Skill',
      'See [missing](references/does-not-exist.md) and run `../missing-skill/scripts/tool`.',
    ].join('\n')
  );
  fs.writeFileSync(path.join(skillDir, 'scripts', 'helper'), '#!/usr/bin/env bash\necho ok\n', {
    mode: 0o644,
  });

  const errors = validateHarness(dir);
  assert.ok(errors.some((e) => e.includes('broken-skill/SKILL.md') && /Use when/i.test(e)));
  assert.ok(errors.some((e) => e.includes('references/does-not-exist.md')));
  assert.ok(errors.some((e) => e.includes('../missing-skill/scripts/tool')));
  assert.ok(errors.some((e) => e.includes('broken-skill/scripts/helper') && /executable/i.test(e)));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('executing-plans bundled scripts run end-to-end without external subagent-driven-development dependency', () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-plans-e2e-'));
  try {
    execFileSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir, stdio: 'ignore' });
    const planPath = path.join(repoDir, 'sample-plan.md');
    fs.writeFileSync(
      planPath,
      [
        '# Demo Plan',
        '',
        '### Task 1: First Unit',
        '- [ ] Step 1: test task 1',
        '',
        '### Task 2: Second Unit',
        '- [ ] Step 1: test task 2',
        '',
      ].join('\n')
    );
    execFileSync('git', ['add', 'sample-plan.md'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'chore: add plan'], { cwd: repoDir, stdio: 'ignore' });
    const baseMain = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf8' }).trim();

    const scriptsDir = path.resolve(process.cwd(), '.agents', 'skills', 'executing-plans', 'scripts');
    const wsOut = execFileSync(path.join(scriptsDir, 'sdd-workspace'), [planPath], {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    assert.ok(fs.existsSync(wsOut));

    const startOut = execFileSync(path.join(scriptsDir, 'task-start'), [planPath, '1'], {
      cwd: repoDir,
      encoding: 'utf8',
    });
    const briefMatch = startOut.match(/^brief:\s*(.+)$/m);
    const baseMatch = startOut.match(/^base:\s*([0-9a-f]{40})$/m);
    assert.ok(briefMatch && fs.existsSync(briefMatch[1].trim()));
    assert.match(fs.readFileSync(briefMatch[1].trim(), 'utf8'), /### Task 1: First Unit/);
    assert.ok(!/### Task 2/.test(fs.readFileSync(briefMatch[1].trim(), 'utf8')));
    assert.ok(baseMatch);

    fs.writeFileSync(path.join(repoDir, 'feature.txt'), 'done\n');
    execFileSync('git', ['add', 'feature.txt'], { cwd: repoDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'feat: task 1'], { cwd: repoDir, stdio: 'ignore' });

    const doneOut = execFileSync(
      path.join(scriptsDir, 'task-done'),
      [planPath, '1', baseMatch[1], '--', 'node', '-e', 'console.log("1 passed")'],
      { cwd: repoDir, encoding: 'utf8' }
    );
    assert.match(doneOut, /Task 1: complete/);
    assert.match(fs.readFileSync(path.join(wsOut, 'progress.md'), 'utf8'), /Task 1: complete/);

    const pkgPath = execFileSync(
      path.join(scriptsDir, 'review-package'),
      [planPath, baseMain, 'HEAD'],
      { cwd: repoDir, encoding: 'utf8' }
    ).trim();
    assert.ok(fs.existsSync(pkgPath));
    assert.match(fs.readFileSync(pkgPath, 'utf8'), /\+done/);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test('flags multiple active features, orphan evaluation files, and evidence SHA mismatch', () => {
  const dir = makeTempFixture();
  fs.writeFileSync(
    path.join(dir, 'evaluations', 'bugfix.json'),
    JSON.stringify(makeValidEvaluation('bugfix'))
  );
  fs.writeFileSync(
    path.join(dir, 'feature_list.json'),
    JSON.stringify({
      features: [
        {
          id: 'feat-001',
          name: 'Done base',
          description: 'Desc',
          dependencies: [],
          status: 'done',
          evidence: 'Mismatched commit aaaaaaa only',
        },
        {
          id: 'feat-002',
          name: 'Active one',
          description: 'Desc',
          dependencies: ['feat-001'],
          status: 'in-progress',
          evidence: '',
        },
        {
          id: 'feat-003',
          name: 'Active two',
          description: 'Desc',
          dependencies: ['feat-001'],
          status: 'ready-for-eval',
          evidence: 'staged',
        },
      ],
    })
  );

  const errors = validateHarness(dir);
  const joined = errors.join('\n');
  assert.match(joined, /One feature at a time|active features/i);
  assert.match(joined, /bugfix\.json.*orphan|unknown feature/i);
  assert.match(joined, /feat-001.*evidence.*3a0f893/i);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags missing stitch-manifest screen files, missing core role skills, and any/@ts-ignore in specs/contracts', () => {
  const dir = makeTempFixture();
  fs.unlinkSync(path.join(dir, '.agents', 'skills', 'qa-vercel-audit', 'SKILL.md'));
  fs.writeFileSync(
    path.join(dir, 'designs', 'stitch-manifest.json'),
    JSON.stringify({
      stitchProjectId: 'baseline',
      tokensPath: 'designs/design-tokens.json',
      screens: [{ slug: 'missing', path: 'designs/screens/does-not-exist.html' }],
    })
  );
  fs.writeFileSync(
    path.join(dir, 'specs', 'contracts', 'feat-005.ts'),
    '// @ts-ignore\nexport interface BadContract { data: any; }\n'
  );

  const errors = validateHarness(dir);
  const joined = errors.join('\n');
  assert.match(joined, /qa-vercel-audit\/SKILL\.md/);
  assert.match(joined, /does-not-exist\.html/);
  assert.match(joined, /specs\/contracts\/feat-005\.ts.*@ts-ignore/);
  assert.match(joined, /specs\/contracts\/feat-005\.ts.*\bany\b/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('flags unconfigured git core.hooksPath, tracked .env secrets, exposed 0.0.0.0 Docker port, and missing CI read-only permissions', () => {
  const dir = makeTempFixture();
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'ignore' });
  fs.writeFileSync(path.join(dir, '.env'), 'POSTGRES_PASSWORD=secret\n');
  execFileSync('git', ['add', '-f', '.env'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'leak env'], { cwd: dir, stdio: 'ignore' });
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: dir,
    encoding: 'utf8',
  }).trim();

  fs.writeFileSync(
    path.join(dir, 'evaluations', 'feat-001.json'),
    JSON.stringify(makeValidEvaluation('feat-001', { evaluatedCommit: sha }))
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
          evidence: `Verified at ${sha}`,
        },
      ],
    })
  );
  fs.writeFileSync(
    path.join(dir, 'docker-compose.yml'),
    'services:\n  postgres:\n    ports:\n      - "${POSTGRES_PORT:-5432}:5432"\n'
  );
  fs.writeFileSync(
    path.join(dir, '.github', 'workflows', 'ci.yml'),
    VALID_CI_WORKFLOW.replace('permissions:\n  contents: read\n', '')
  );

  const prevCi = process.env.CI;
  delete process.env.CI;
  try {
    const errors = validateHarness(dir);
    const joined = errors.join('\n');
    assert.match(joined, /core\.hooksPath/i);
    assert.match(joined, /\.env.*tracked|secret/i);
    assert.match(joined, /127\.0\.0\.1/);
    assert.match(joined, /permissions|contents:\s*read/);
  } finally {
    if (prevCi !== undefined) process.env.CI = prevCi;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('flags SKILL.md missing Not for boundary or containing foreign-stack boilerplate (Cargo.toml, pytest, go.mod)', () => {
  const dir = makeTempFixture();
  const badSkillDir = path.join(dir, '.agents', 'skills', 'foreign-bloat');
  fs.mkdirSync(badSkillDir, { recursive: true });
  fs.writeFileSync(
    path.join(badSkillDir, 'SKILL.md'),
    [
      '---',
      'name: foreign-bloat',
      'description: Use when testing skills without negative boundary.',
      '---',
      '# Foreign Bloat',
      'Run `pytest` or check `Cargo.toml` and `go.mod`.',
    ].join('\n')
  );

  try {
    const errors = validateHarness(dir);
    const joined = errors.join('\n');
    assert.match(joined, /foreign-bloat\/SKILL\.md.*Not for/i);
    assert.match(joined, /foreign-bloat\/SKILL\.md.*foreign-stack|boilerplate/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('flags orphan unreferenced auxiliary files inside .agents/skills/*', () => {
  const dir = makeTempFixture();
  const orphanPath = path.join(dir, '.agents', 'skills', 'task-guardrail', 'unused-helper.md');
  fs.writeFileSync(orphanPath, '# Dead file never referenced by SKILL.md\n');

  try {
    const errors = validateHarness(dir);
    assert.match(errors.join('\n'), /task-guardrail\/unused-helper\.md.*orphan|unreferenced/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('passes on current repository root', () => {
  assert.deepEqual(validateHarness(process.cwd()), []);
});
