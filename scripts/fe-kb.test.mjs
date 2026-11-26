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
const FE_KB_DIR = path.join(ROOT_DIR, '.agents', 'skills', 'fe-kb');
const FE_KB_CLI_PATH = path.join(FE_KB_DIR, 'scripts', 'kb-cli.mjs');
const FE_ROLE_SKILL_PATH = path.join(ROOT_DIR, '.agents', 'skills', 'fe-shadcn-clean', 'SKILL.md');
const WEB_AGENTS_PATH = path.join(ROOT_DIR, 'apps', 'web', 'AGENTS.md');

const EXPECTED_GUIDES = [
  ['guides/react/effect-boundaries-and-derived-state.md', 'effect-boundaries-and-derived-state'],
  [
    'guides/architecture/component-granularity-and-state-placement.md',
    'component-granularity-and-state-placement',
  ],
  [
    'guides/typescript/type-vs-interface-and-response-composition.md',
    'type-vs-interface-and-response-composition',
  ],
  ['guides/forms/zod-rhf-schema-validation.md', 'zod-rhf-schema-validation'],
  ['guides/ux/async-ux-and-accessibility-behaviors.md', 'async-ux-and-accessibility-behaviors'],
];

function countLines(raw) {
  return raw.length === 0 ? 0 : raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
}

test('fe-kb passes validatePack, matches kb-cli.mjs byte-for-byte, and enforces guide hygiene budgets', async () => {
  const { validatePack } = await import(META_CLI_PATH);

  assert.equal(fs.existsSync(FE_KB_DIR), true, 'Expected .agents/skills/fe-kb directory to exist');
  assert.equal(
    fs.existsSync(FE_KB_CLI_PATH),
    true,
    'Expected .agents/skills/fe-kb/scripts/kb-cli.mjs to exist'
  );
  assert.equal(
    fs.existsSync(path.join(FE_KB_DIR, 'guides', 'getting-started', 'sample-rule.md')),
    false,
    'Starter sample-rule.md must be removed once real guides are authored'
  );

  assert.deepEqual(validatePack(FE_KB_DIR), []);

  const metaCli = fs.readFileSync(META_CLI_PATH, 'utf8');
  const packCli = fs.readFileSync(FE_KB_CLI_PATH, 'utf8');
  assert.equal(packCli, metaCli, 'fe-kb kb-cli.mjs must remain byte-identical to meta-skill kb-cli.mjs');

  const skillRaw = fs.readFileSync(path.join(FE_KB_DIR, 'SKILL.md'), 'utf8');
  const skillLines = countLines(skillRaw);
  assert.ok(skillLines <= 100, `Expected fe-kb/SKILL.md <= 100 lines, got ${skillLines}`);

  for (const [relGuide, expectedId] of EXPECTED_GUIDES) {
    const fullGuide = path.join(FE_KB_DIR, relGuide);
    assert.equal(fs.existsSync(fullGuide), true, `Missing guide ${relGuide}`);
    const raw = fs.readFileSync(fullGuide, 'utf8');
    const lines = countLines(raw);
    assert.ok(
      lines >= 65 && lines <= 120,
      `Expected ${relGuide} to be 65-120 lines, got ${lines}`
    );
    assert.match(raw, new RegExp(`^id:\\s*["']?${expectedId}["']?\\s*$`, 'm'));
    assert.doesNotMatch(raw, /\bas\s+any\b|:\s*any\b/);
    assert.doesNotMatch(raw, /@ts-(?:ignore|expect-error|nocheck)\b/);

    for (const blockMatch of raw.matchAll(/```(?:ts|tsx)\r?\n([\s\S]*?)```/g)) {
      const snippet = blockMatch[1];
      assert.doesNotMatch(
        snippet,
        /\bfunction\s+[A-Za-z0-9_]+\s*\(/,
        `${relGuide} TSX/TS snippet must use arrow functions instead of function declarations`
      );
    }
  }

  const cliValidateOut = execFileSync(
    process.execPath,
    [FE_KB_CLI_PATH, 'validate', '--dir', FE_KB_DIR],
    { encoding: 'utf8' }
  );
  assert.match(cliValidateOut, /valid/i);
});

test('fe-kb searchGuides ranks all 5 frontend guides in top 2 for natural action queries', async () => {
  const { searchGuides, retrieveGuides } = await import(META_CLI_PATH);

  const queryPairs = [
    ['derived state effect reset', 'effect-boundaries-and-derived-state'],
    ['avoid prop drilling zustand', 'component-granularity-and-state-placement'],
    ['interface vs type dto', 'type-vs-interface-and-response-composition'],
    ['zod resolver hook form', 'zod-rhf-schema-validation'],
    ['double submit focus ring', 'async-ux-and-accessibility-behaviors'],
  ];

  for (const [query, expectedId] of queryPairs) {
    const hits = searchGuides(FE_KB_DIR, query, { limit: 5 });
    const topTwoIds = hits.slice(0, 2).map((h) => h.id);
    assert.ok(
      topTwoIds.includes(expectedId),
      `Query "${query}" expected "${expectedId}" in top 2, got [${topTwoIds.join(', ')}]`
    );
  }

  const retrieved = retrieveGuides(FE_KB_DIR, [
    'zod-rhf-schema-validation',
    'component-granularity-and-state-placement',
  ]);
  assert.doesNotMatch(retrieved.output, /\[GATE_LOCKED\]/);
  assert.match(retrieved.output, /zodResolver/);
});

test('fe-kb scanTarget catches effect-sync-setstate and bare-focus-outline-none with keepWhen/dropWhen while ignoring clean code', async () => {
  const { scanTarget } = await import(META_CLI_PATH);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fe-kb-scan-test-'));

  try {
    fs.writeFileSync(
      path.join(tmpDir, 'DirtyPatterns.tsx'),
      [
        "import { useEffect, useState } from 'react';",
        '',
        'export const DirtyPatterns = ({ items }: { items: string[] }) => {',
        '  const [filtered, setFiltered] = useState<string[]>([]);',
        '  useEffect(() => {',
        '    setFiltered(items.filter(Boolean));',
        '  }, [items]);',
        '',
        '  return <input className="rounded border px-3 py-2 focus:outline-none" />;',
        '};',
      ].join('\n')
    );

    fs.writeFileSync(
      path.join(tmpDir, 'CleanPatterns.tsx'),
      [
        "import { useEffect, useRef, useState } from 'react';",
        '',
        'export const CleanPatterns = ({ items }: { items: string[] }) => {',
        '  const sentinelRef = useRef<HTMLDivElement | null>(null);',
        '  const [isVisible, setIsVisible] = useState(false);',
        '  const visibleItems = items.filter(Boolean);',
        '',
        '  useEffect(() => {',
        '    const observer = new IntersectionObserver(([entry]) => {',
        '      if (entry) setIsVisible(entry.isIntersecting);',
        '    });',
        '    if (sentinelRef.current) observer.observe(sentinelRef.current);',
        '    return () => observer.disconnect();',
        '  }, []);',
        '',
        '  return (',
        '    <div ref={sentinelRef} data-visible={isVisible} data-count={visibleItems.length}>',
        '      <input className="rounded border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400" />',
        '      <button type="button" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Save</button>',
        '    </div>',
        '  );',
        '};',
      ].join('\n')
    );

    const report = scanTarget(FE_KB_DIR, tmpDir);
    const ruleIds = report.findings.map((f) => f.ruleId);

    assert.ok(
      ruleIds.includes('effect-sync-setstate'),
      `Expected effect-sync-setstate finding, got [${ruleIds.join(', ')}]`
    );
    assert.ok(
      ruleIds.includes('bare-focus-outline-none'),
      `Expected bare-focus-outline-none finding, got [${ruleIds.join(', ')}]`
    );

    for (const finding of report.findings) {
      assert.equal(
        finding.file,
        'DirtyPatterns.tsx',
        `Expected zero findings on CleanPatterns.tsx, got ${finding.ruleId} in ${finding.file}:${finding.line}`
      );
      assert.ok(Array.isArray(finding.keepWhen) && finding.keepWhen.length > 0);
      assert.ok(Array.isArray(finding.dropWhen) && finding.dropWhen.length > 0);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fe-shadcn-clean and apps/web/AGENTS.md wire fe-kb CLI while preserving strict FE_SCHEMA JSON mode', () => {
  const feSkillRaw = fs.readFileSync(FE_ROLE_SKILL_PATH, 'utf8');
  const feSkillLines = countLines(feSkillRaw);
  assert.ok(feSkillLines <= 80, `Expected fe-shadcn-clean/SKILL.md <= 80 lines, got ${feSkillLines}`);
  assert.match(feSkillRaw, /\.agents\/skills\/fe-kb\/scripts\/kb-cli\.mjs/);
  assert.match(feSkillRaw, /\bsearch\b/);
  assert.match(feSkillRaw, /\bretrieve\b/);
  assert.match(feSkillRaw, /"status":\s*"READY"/);
  assert.match(feSkillRaw, /"status":\s*"CONTRACT_MISMATCH"/);
  assert.match(feSkillRaw, /FE_SCHEMA|strict JSON/i);
  assert.match(feSkillRaw, /omit.*citation|without.*prose|never.*Knowledge Guidance Applied|suppress.*citation/i);

  const webAgentsRaw = fs.readFileSync(WEB_AGENTS_PATH, 'utf8');
  const webAgentsLines = countLines(webAgentsRaw);
  assert.ok(webAgentsLines <= 45, `Expected apps/web/AGENTS.md <= 45 lines, got ${webAgentsLines}`);
  assert.match(webAgentsRaw, /\buseEffect\b/);
  assert.match(webAgentsRaw, /\binterface\b.*\btype\b|\btype\b.*\binterface\b/is);
  assert.match(webAgentsRaw, /2-hop|<=\s*2/);
  assert.match(webAgentsRaw, /\bzodResolver\b/);
  assert.match(webAgentsRaw, /\bisComposing\b|\bIME\b/);
  assert.match(webAgentsRaw, /\bfocus-visible\b/);
});
