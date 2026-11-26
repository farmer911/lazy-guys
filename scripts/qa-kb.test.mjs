import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const META_CLI_PATH = path.join(
  ROOT_DIR,
  '.agents',
  'skills',
  'authoring-agent-knowledge',
  'scripts',
  'kb-cli.mjs'
);
const QA_KB_DIR = path.join(ROOT_DIR, '.agents', 'skills', 'qa-kb');
const QA_CLI_PATH = path.join(QA_KB_DIR, 'scripts', 'kb-cli.mjs');
const QA_AUDIT_SKILL_PATH = path.join(ROOT_DIR, '.agents', 'skills', 'qa-vercel-audit', 'SKILL.md');
const E2E_AGENTS_PATH = path.join(ROOT_DIR, 'apps', 'e2e', 'AGENTS.md');

const EXPECTED_GUIDES = [
  'guides/strategy/testing-trophy-and-high-signal-assertions.md',
  'guides/user-perspective/adversarial-ux-and-edge-case-matrix.md',
  'guides/ui-audit/accessibility-focus-and-responsive-probes.md',
  'guides/e2e/playwright-anti-flake-and-live-probing.md',
];

function countLines(raw) {
  return raw.length === 0 ? 0 : raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
}

test('qa-kb passes validatePack, enforces line budgets, and maintains byte-identical kb-cli.mjs parity', async () => {
  const { validatePack, retrieveGuides } = await import(META_CLI_PATH);

  assert.equal(fs.existsSync(QA_KB_DIR), true, 'Expected .agents/skills/qa-kb directory to exist');
  assert.equal(fs.existsSync(QA_CLI_PATH), true, 'Expected .agents/skills/qa-kb/scripts/kb-cli.mjs to exist');
  assert.equal(
    fs.existsSync(path.join(QA_KB_DIR, 'guides', 'getting-started', 'sample-rule.md')),
    false,
    'Starter guides/getting-started/sample-rule.md must be removed'
  );

  assert.deepEqual(validatePack(QA_KB_DIR), []);

  const metaCliRaw = fs.readFileSync(META_CLI_PATH, 'utf8');
  const qaCliRaw = fs.readFileSync(QA_CLI_PATH, 'utf8');
  assert.equal(qaCliRaw, metaCliRaw, 'Expected qa-kb/scripts/kb-cli.mjs to match authoring-agent-knowledge/scripts/kb-cli.mjs byte-for-byte');

  const skillRaw = fs.readFileSync(path.join(QA_KB_DIR, 'SKILL.md'), 'utf8');
  const skillLines = countLines(skillRaw);
  assert.ok(skillLines <= 100, `Expected qa-kb/SKILL.md <= 100 lines, got ${skillLines}`);

  for (const relGuide of EXPECTED_GUIDES) {
    const fullGuide = path.join(QA_KB_DIR, relGuide);
    assert.equal(fs.existsSync(fullGuide), true, `Expected guide ${relGuide} to exist`);
    const lines = countLines(fs.readFileSync(fullGuide, 'utf8'));
    assert.ok(lines >= 65 && lines <= 120, `Expected ${relGuide} to be 65-120 lines, got ${lines}`);
  }

  const retrieved = retrieveGuides(
    QA_KB_DIR,
    [
      'testing-trophy-and-high-signal-assertions',
      'adversarial-ux-and-edge-case-matrix',
      'accessibility-focus-and-responsive-probes',
      'playwright-anti-flake-and-live-probing',
    ],
    { maxInlineBytes: 50_000 }
  );
  assert.doesNotMatch(retrieved.output, /\[GATE_LOCKED\]/);

  const cliOut = execFileSync(process.execPath, [QA_CLI_PATH, 'validate', '--dir', QA_KB_DIR], {
    encoding: 'utf8',
  });
  assert.match(cliOut, /valid/i);
});

test('searchGuides ranks each of the 4 qa-kb guides in top 2 for natural 2-5 word action queries', async () => {
  const { searchGuides } = await import(META_CLI_PATH);

  const queryPairs = [
    ['testing trophy real database', 'testing-trophy-and-high-signal-assertions'],
    ['adversarial double submit input', 'adversarial-ux-and-edge-case-matrix'],
    ['keyboard focus mobile overflow', 'accessibility-focus-and-responsive-probes'],
    ['playwright flaky wait locator', 'playwright-anti-flake-and-live-probing'],
  ];

  for (const [query, expectedId] of queryPairs) {
    const hits = searchGuides(QA_KB_DIR, query, { limit: 5 });
    const top2Ids = hits.slice(0, 2).map((hit) => hit.id);
    assert.ok(
      top2Ids.includes(expectedId),
      `Expected "${expectedId}" in top 2 for query "${query}", got: ${JSON.stringify(top2Ids)}`
    );
  }
});

test('scanTarget catches playwright-one-shot-isvisible and hardcoded-test-sleep with non-empty keepWhen and dropWhen', async (t) => {
  const { scanTarget } = await import(META_CLI_PATH);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-kb-scan-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  const specFixture = path.join(tmpDir, 'contact.spec.ts');
  fs.writeFileSync(
    specFixture,
    [
      "import { expect, test } from '@playwright/test';",
      '',
      "test('submits contact form', async ({ page }) => {",
      "  const submitBtn = page.getByRole('button', { name: 'Send' });",
      '  expect(await submitBtn.isVisible()).toBe(true);',
      '  await page.waitForTimeout(1000);',
      '  await expect(submitBtn).toBeVisible();',
      '});',
      '',
    ].join('\n')
  );

  const report = scanTarget(QA_KB_DIR, tmpDir);
  const byRule = new Map(report.findings.map((f) => [f.ruleId, f]));

  assert.equal(report.findings.length, 2, `Expected 2 findings, got: ${JSON.stringify(report.findings)}`);
  assert.ok(byRule.has('playwright-one-shot-isvisible'), 'Expected playwright-one-shot-isvisible finding');
  assert.ok(byRule.has('hardcoded-test-sleep'), 'Expected hardcoded-test-sleep finding');

  for (const ruleId of ['playwright-one-shot-isvisible', 'hardcoded-test-sleep']) {
    const finding = byRule.get(ruleId);
    assert.equal(finding.guideId, 'playwright-anti-flake-and-live-probing');
    assert.ok(Array.isArray(finding.keepWhen) && finding.keepWhen.length > 0, `${ruleId} must have non-empty keepWhen`);
    assert.ok(Array.isArray(finding.dropWhen) && finding.dropWhen.length > 0, `${ruleId} must have non-empty dropWhen`);
  }
});

test('qa-vercel-audit/SKILL.md and apps/e2e/AGENTS.md wire qa-kb CLI, strict QA_EVAL_SCHEMA JSON mode, and Tier-1 E2E invariants', () => {
  const qaAuditRaw = fs.readFileSync(QA_AUDIT_SKILL_PATH, 'utf8');
  const qaAuditLines = countLines(qaAuditRaw);
  assert.ok(qaAuditLines <= 80, `Expected qa-vercel-audit/SKILL.md <= 80 lines, got ${qaAuditLines}`);
  assert.match(qaAuditRaw, /\.agents\/skills\/qa-kb\/scripts\/kb-cli\.mjs/);
  assert.match(qaAuditRaw, /\bsearch\b/);
  assert.match(qaAuditRaw, /\bretrieve\b/);
  assert.match(qaAuditRaw, /\bQA_EVAL_SCHEMA\b/);
  assert.match(qaAuditRaw, /strict JSON|citation|Knowledge Guidance Applied/i);

  const e2eAgentsRaw = fs.readFileSync(E2E_AGENTS_PATH, 'utf8');
  const e2eAgentsLines = countLines(e2eAgentsRaw);
  assert.ok(e2eAgentsLines <= 30, `Expected apps/e2e/AGENTS.md <= 30 lines, got ${e2eAgentsLines}`);
  assert.match(e2eAgentsRaw, /page\.on\(\s*['"]console['"]\s*\)|console\.error/);
  assert.match(e2eAgentsRaw, /pageerror/);
  assert.match(e2eAgentsRaw, /page\.route/);
  assert.match(e2eAgentsRaw, /whitespace/i);
  assert.match(e2eAgentsRaw, /scrollWidth\s*<=\s*(?:window\.)?innerWidth/);
});
