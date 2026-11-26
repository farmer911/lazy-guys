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
const BE_KB_DIR = path.join(ROOT_DIR, '.agents', 'skills', 'be-kb');
const BE_KB_CLI_PATH = path.join(BE_KB_DIR, 'scripts', 'kb-cli.mjs');
const BE_ROLE_SKILL_PATH = path.join(ROOT_DIR, '.agents', 'skills', 'be-express-pg', 'SKILL.md');
const API_AGENTS_PATH = path.join(ROOT_DIR, 'apps', 'api', 'AGENTS.md');

function countLines(raw) {
  return raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
}

function makeTempDir(prefix = 'be-kb-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('be-kb passes validatePack, enforces line/hygiene budgets, and matches meta kb-cli.mjs byte-for-byte', async () => {
  const { validatePack } = await import(META_CLI_PATH);

  assert.equal(fs.existsSync(BE_KB_DIR), true, 'Expected .agents/skills/be-kb directory to exist');
  assert.equal(fs.existsSync(BE_KB_CLI_PATH), true, 'Expected .agents/skills/be-kb/scripts/kb-cli.mjs to exist');
  assert.equal(
    fs.existsSync(path.join(BE_KB_DIR, 'guides', 'getting-started', 'sample-rule.md')),
    false,
    'Starter sample-rule.md must be removed after authoring real guides'
  );

  assert.deepEqual(validatePack(BE_KB_DIR), []);

  const metaCli = fs.readFileSync(META_CLI_PATH, 'utf8');
  const packCli = fs.readFileSync(BE_KB_CLI_PATH, 'utf8');
  assert.equal(packCli, metaCli, 'Expected be-kb/scripts/kb-cli.mjs to be byte-identical to meta kb-cli.mjs');

  const routerRaw = fs.readFileSync(path.join(BE_KB_DIR, 'SKILL.md'), 'utf8');
  const routerLines = countLines(routerRaw);
  assert.ok(routerLines <= 100, `Expected be-kb/SKILL.md <= 100 lines, got ${routerLines}`);

  const expectedGuides = [
    'guides/sql/query-optimization-and-eliminating-n-plus-1.md',
    'guides/sql/transactions-concurrency-and-idempotency.md',
    'guides/api/zod-request-validation-and-error-envelopes.md',
    'guides/performance/api-latency-pooling-and-bounded-payloads.md',
  ];

  for (const relGuide of expectedGuides) {
    const fullGuide = path.join(BE_KB_DIR, relGuide);
    assert.equal(fs.existsSync(fullGuide), true, `Expected ${relGuide} to exist`);
    const raw = fs.readFileSync(fullGuide, 'utf8');
    const lines = countLines(raw);
    assert.ok(
      lines >= 65 && lines <= 120,
      `Expected ${relGuide} to be 65-120 lines, got ${lines}`
    );
    assert.doesNotMatch(raw, /@(?:ts-ignore|ts-expect-error|ts-nocheck)\b/);
    assert.doesNotMatch(raw, /\bas\s+any\b|:\s*any\b/);
  }
});

test('searchGuides ranks all 4 backend guides in top 2 for natural 2-5 word action queries', async () => {
  const { searchGuides, retrieveGuides } = await import(META_CLI_PATH);

  const queryExpectations = [
    ['eliminate n plus 1 query', 'query-optimization-and-eliminating-n-plus-1'],
    ['postgres transaction pool connect', 'transactions-concurrency-and-idempotency'],
    ['zod validate express request', 'zod-request-validation-and-error-envelopes'],
    ['connection pool timeout payload', 'api-latency-pooling-and-bounded-payloads'],
  ];

  for (const [query, expectedId] of queryExpectations) {
    const hits = searchGuides(BE_KB_DIR, query, { limit: 2 });
    const hitIds = hits.map((h) => h.id);
    assert.ok(
      hitIds.includes(expectedId),
      `Expected "${expectedId}" in top 2 for query "${query}", got: ${JSON.stringify(hitIds)}`
    );
    const retrieved = retrieveGuides(BE_KB_DIR, [expectedId]);
    assert.doesNotMatch(retrieved.output, /\[GATE_LOCKED\]/);
    assert.match(retrieved.output, new RegExp(`guide:${expectedId}`));
  }
});

test('scanTarget detects pool-query-begin-bug and await-query-in-loop with non-empty keepWhen/dropWhen', async () => {
  const { scanTarget } = await import(META_CLI_PATH);
  const tmpApp = makeTempDir('be-kb-scan-fixture-');
  const routesDir = path.join(tmpApp, 'src', 'routes');
  fs.mkdirSync(routesDir, { recursive: true });

  fs.writeFileSync(
    path.join(routesDir, 'orders.ts'),
    [
      "import { pool } from '../db/pool.js';",
      '',
      'export async function badCheckout(orderIds: string[]) {',
      "  await pool.query('BEGIN');",
      '  for (const id of orderIds) {',
      "    await pool.query('UPDATE orders SET locked = true WHERE id = $1', [id]);",
      '  }',
      "  await pool.query('COMMIT');",
      '}',
      '',
      'export async function safeCheckout(orderIds: string[]) {',
      '  const client = await pool.connect();',
      '  try {',
      "    await client.query('BEGIN');",
      "    await client.query('UPDATE orders SET locked = true WHERE id = ANY($1::uuid[])', [orderIds]);",
      "    await client.query('COMMIT');",
      '  } finally {',
      '    client.release();',
      '  }',
      '}',
    ].join('\n')
  );

  const report = scanTarget(BE_KB_DIR, tmpApp);
  const beginHits = report.findings.filter((f) => f.ruleId === 'pool-query-begin-bug');
  const loopHits = report.findings.filter((f) => f.ruleId === 'await-query-in-loop');

  assert.equal(beginHits.length, 1, `Expected 1 pool-query-begin-bug hit, got ${JSON.stringify(beginHits)}`);
  assert.equal(beginHits[0].guideId, 'transactions-concurrency-and-idempotency');
  assert.ok(beginHits[0].keepWhen.length >= 1);
  assert.ok(beginHits[0].dropWhen.length >= 1);

  assert.equal(loopHits.length, 1, `Expected 1 await-query-in-loop hit, got ${JSON.stringify(loopHits)}`);
  assert.equal(loopHits[0].guideId, 'query-optimization-and-eliminating-n-plus-1');
  assert.ok(loopHits[0].keepWhen.length >= 1);
  assert.ok(loopHits[0].dropWhen.length >= 1);
});

test('be-express-pg SKILL.md and apps/api/AGENTS.md wire be-kb while preserving strict BE_SCHEMA JSON output', () => {
  const beSkillRaw = fs.readFileSync(BE_ROLE_SKILL_PATH, 'utf8');
  const beSkillLines = countLines(beSkillRaw);
  assert.ok(beSkillLines <= 80, `Expected be-express-pg/SKILL.md <= 80 lines, got ${beSkillLines}`);
  assert.match(beSkillRaw, /\.agents\/skills\/be-kb\/scripts\/kb-cli\.mjs/);
  assert.match(beSkillRaw, /\bsearch\b/);
  assert.match(beSkillRaw, /\bretrieve\b/);
  assert.match(beSkillRaw, /\bBE_SCHEMA\b/);
  assert.match(beSkillRaw, /\bBE_READY\b/);
  assert.match(beSkillRaw, /\bSCHEMA_MISMATCH\b/);
  assert.match(
    beSkillRaw,
    /omit[\s\S]*?(?:prose|citation|Knowledge Guidance Applied)|(?:prose|citation|Knowledge Guidance Applied)[\s\S]*?never|without prose citation/i
  );

  const apiAgentsRaw = fs.readFileSync(API_AGENTS_PATH, 'utf8');
  const apiAgentsLines = countLines(apiAgentsRaw);
  assert.ok(apiAgentsLines <= 40, `Expected apps/api/AGENTS.md <= 40 lines, got ${apiAgentsLines}`);
  assert.match(apiAgentsRaw, /pool\.connect\(\)/);
  assert.match(apiAgentsRaw, /ON CONFLICT/);
  assert.match(apiAgentsRaw, /TIMESTAMPTZ/);
  assert.match(apiAgentsRaw, /safeParse/);
});
