import assert from 'node:assert/strict';
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
const ARCH_KB_DIR = path.join(ROOT_DIR, '.agents', 'skills', 'arch-kb');
const ARCH_CLI_PATH = path.join(ARCH_KB_DIR, 'scripts', 'kb-cli.mjs');
const TECH_LEAD_SKILL_PATH = path.join(
  ROOT_DIR,
  '.agents',
  'skills',
  'tech-lead-contract',
  'SKILL.md'
);

const EXPECTED_GUIDES = [
  {
    id: 'response-envelopes-and-dto-inheritance',
    relPath: 'guides/contracts/response-envelopes-and-dto-inheritance.md',
    query: 'api response dto inheritance',
  },
  {
    id: 'scale-ready-stateless-design',
    relPath: 'guides/scalability/scale-ready-stateless-design.md',
    query: 'horizontal scale stateless api',
  },
  {
    id: 'postgres-schema-indexing-and-migrations',
    relPath: 'guides/database/postgres-schema-indexing-and-migrations.md',
    query: 'composite index column order',
  },
  {
    id: 'domain-triage-and-failure-isolation',
    relPath: 'guides/tradeoffs/domain-triage-and-failure-isolation.md',
    query: 'contract mismatch triage isolation',
  },
];

function countLines(raw) {
  return raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
}

test('arch-kb passes validatePack, enforces line budgets, and keeps byte-identical kb-cli.mjs parity', async () => {
  const { validatePack } = await import(META_CLI_PATH);

  assert.equal(fs.existsSync(ARCH_KB_DIR), true, 'Expected .agents/skills/arch-kb to exist');
  assert.equal(fs.existsSync(ARCH_CLI_PATH), true, 'Expected .agents/skills/arch-kb/scripts/kb-cli.mjs to exist');

  const errors = validatePack(ARCH_KB_DIR);
  assert.deepEqual(errors, []);

  const metaCli = fs.readFileSync(META_CLI_PATH, 'utf8');
  const packCli = fs.readFileSync(ARCH_CLI_PATH, 'utf8');
  assert.equal(packCli, metaCli);

  const skillRaw = fs.readFileSync(path.join(ARCH_KB_DIR, 'SKILL.md'), 'utf8');
  const skillLines = countLines(skillRaw);
  assert.ok(skillLines <= 100, `Expected arch-kb/SKILL.md <= 100 lines, got ${skillLines}`);

  for (const g of EXPECTED_GUIDES) {
    const fullPath = path.join(ARCH_KB_DIR, g.relPath);
    assert.equal(fs.existsSync(fullPath), true, `Expected guide ${g.relPath} to exist`);
    const lines = countLines(fs.readFileSync(fullPath, 'utf8'));
    assert.ok(
      lines >= 65 && lines <= 120,
      `Expected ${g.relPath} to be 65-120 lines, got ${lines}`
    );
  }
});

test('arch-kb searchGuides ranks all 4 guides in top 2 for natural action queries and retrieves cleanly', async () => {
  const { searchGuides, retrieveGuides } = await import(ARCH_CLI_PATH);

  for (const { id, query } of EXPECTED_GUIDES) {
    const hits = searchGuides(ARCH_KB_DIR, query, { limit: 5 });
    const topTwoIds = hits.slice(0, 2).map((h) => h.id);
    assert.ok(
      topTwoIds.includes(id),
      `Expected "${id}" in top 2 for query "${query}", got: ${JSON.stringify(hits)}`
    );
  }

  for (const { id } of EXPECTED_GUIDES) {
    const single = retrieveGuides(ARCH_KB_DIR, [id]);
    assert.equal(single.savedFilePath, null);
    assert.doesNotMatch(single.output, /\[GATE_LOCKED\]/);
    assert.ok(single.output.includes(`guide:${id}`), `Expected inline retrieve output to include ${id}`);
  }

  const batch = retrieveGuides(
    ARCH_KB_DIR,
    EXPECTED_GUIDES.map((g) => g.id)
  );
  const batchContent = batch.savedFilePath
    ? fs.readFileSync(batch.savedFilePath, 'utf8')
    : batch.output;
  assert.doesNotMatch(batchContent, /\[GATE_LOCKED\]/);
  for (const { id } of EXPECTED_GUIDES) {
    assert.ok(batchContent.includes(`guide:${id}`), `Expected batch retrieve content to include ${id}`);
  }
});

test('arch-kb scanTarget catches concurrently-in-transaction-sql and in-memory-route-state-map with keepWhen/dropWhen', async () => {
  const { scanTarget } = await import(ARCH_CLI_PATH);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-kb-scan-'));

  fs.mkdirSync(path.join(tmpDir, 'db'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'src', 'routes'), { recursive: true });

  fs.writeFileSync(
    path.join(tmpDir, 'db', 'bad-migration.sql'),
    [
      'BEGIN;',
      'ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active ON projects (profile_id, sort_order, id) WHERE is_archived = false;',
      'COMMIT;',
    ].join('\n')
  );

  fs.writeFileSync(
    path.join(tmpDir, 'db', 'safe-migration.sql'),
    [
      'BEGIN;',
      'ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;',
      'COMMIT;',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active ON projects (profile_id, sort_order, id) WHERE is_archived = false;',
    ].join('\n')
  );

  fs.writeFileSync(
    path.join(tmpDir, 'src', 'routes', 'projects.ts'),
    [
      'const rateLimitMap = new Map<string, number>();',
      'const STATIC_LABELS = new Map([["featured", "Featured"]]);',
      'export const groupById = (rows: readonly { id: string }[]) => {',
      '  const localIndex = new Map<string, { id: string }>();',
      '  for (const row of rows) localIndex.set(row.id, row);',
      '  return localIndex;',
      '};',
    ].join('\n')
  );

  const report = scanTarget(ARCH_KB_DIR, tmpDir);
  const byRule = new Map(report.findings.map((f) => [f.ruleId, f]));

  assert.equal(report.findings.length, 2, `Expected exactly 2 findings, got: ${JSON.stringify(report.findings)}`);
  assert.equal(byRule.has('concurrently-in-transaction-sql'), true);
  assert.equal(byRule.has('in-memory-route-state-map'), true);

  for (const ruleId of ['concurrently-in-transaction-sql', 'in-memory-route-state-map']) {
    const finding = byRule.get(ruleId);
    assert.ok(Array.isArray(finding.keepWhen) && finding.keepWhen.length > 0, `${ruleId} missing keepWhen`);
    assert.ok(Array.isArray(finding.dropWhen) && finding.dropWhen.length > 0, `${ruleId} missing dropWhen`);
  }
});

test('tech-lead-contract SKILL.md wires arch-kb CLI and preserves strict JSON return schemas without prose leakage', () => {
  const raw = fs.readFileSync(TECH_LEAD_SKILL_PATH, 'utf8');
  const lines = countLines(raw);

  assert.ok(lines <= 80, `Expected tech-lead-contract/SKILL.md <= 80 lines, got ${lines}`);
  assert.match(raw, /\.agents\/skills\/arch-kb\/scripts\/kb-cli\.mjs/);
  assert.match(raw, /\bsearch\b/);
  assert.match(raw, /\bretrieve\b/);
  assert.match(raw, /TECH_LEAD_CONTRACT_SCHEMA/);
  assert.match(raw, /TECH_LEAD_TRIAGE_SCHEMA/);
  assert.match(raw, /omit|suppress|never append/i);
  assert.match(raw, /JSON/i);
});
