import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const CLI_PATH = path.join(
  ROOT_DIR,
  '.agents',
  'skills',
  'authoring-agent-knowledge',
  'scripts',
  'kb-cli.mjs'
);

function makeTempDir(prefix = 'kb-cli-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeGuide(kbDir, relSubPath, frontmatter, body) {
  const fullPath = path.join(kbDir, 'guides', relSubPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const yamlLines = ['---'];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) {
      yamlLines.push(`${k}: [${v.map((item) => JSON.stringify(item)).join(', ')}]`);
    } else {
      yamlLines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  yamlLines.push('---', '');
  fs.writeFileSync(fullPath, `${yamlLines.join('\n')}${body}\n`);
}

test('init scaffolds a valid standard Knowledge Pack that passes validate immediately', async () => {
  const { initPack, validatePack } = await import(CLI_PATH);
  const tmp = makeTempDir();
  const packDir = path.join(tmp, 'acme-guidance');

  initPack(packDir, { name: 'acme-guidance', standalonePlugin: false });

  assert.equal(fs.existsSync(path.join(packDir, 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(packDir, 'scripts', 'kb-cli.mjs')), true);
  assert.equal(fs.existsSync(path.join(packDir, 'guides', 'index.md')), true);
  assert.equal(fs.existsSync(path.join(packDir, 'scanner-rules.json')), true);
  assert.equal(fs.existsSync(path.join(packDir, '.kbrc.json')), true);

  const errors = validatePack(packDir);
  assert.deepEqual(errors, []);
});

test('init --standalone-plugin scaffolds multi-agent plugin manifests and self-contained CLI', () => {
  const tmp = makeTempDir();
  const repoDir = path.join(tmp, 'standalone-kb');

  execFileSync(
    process.execPath,
    [CLI_PATH, 'init', repoDir, '--name', 'standalone-kb', '--standalone-plugin'],
    { encoding: 'utf8' }
  );

  for (const manifestRel of [
    'package.json',
    'plugin.json',
    '.agents/plugins/marketplace.json',
    '.claude-plugin/plugin.json',
    '.codex-plugin/plugin.json',
    '.cursor-plugin/plugin.json',
    'gemini-extension.json',
    'README.md',
    'skills/standalone-kb/SKILL.md',
    'skills/standalone-kb/scripts/kb-cli.mjs',
  ]) {
    assert.equal(
      fs.existsSync(path.join(repoDir, manifestRel)),
      true,
      `Expected ${manifestRel} to exist`
    );
  }

  const out = execFileSync(
    process.execPath,
    [
      path.join(repoDir, 'skills', 'standalone-kb', 'scripts', 'kb-cli.mjs'),
      'validate',
      '--dir',
      path.join(repoDir, 'skills', 'standalone-kb'),
    ],
    { encoding: 'utf8' }
  );
  assert.match(out, /valid/i);
});

test('search ranks action-oriented queries with field-boosted BM25 and camelCase/kebab splitting', async () => {
  const { initPack, searchGuides } = await import(CLI_PATH);
  const tmp = makeTempDir();
  const packDir = path.join(tmp, 'search-kb');
  initPack(packDir, { name: 'search-kb' });

  writeGuide(
    packDir,
    'ui/modal-scroll-contain.md',
    {
      id: 'modal-scroll-contain',
      title: 'Prevent Page Scroll Under Modal Dialog',
      description: 'Stop background scroll chaining on native <dialog> and ::backdrop using overscroll-behavior.',
      tags: ['dialog', 'modal', 'overscroll-behavior', 'backdrop'],
      maturity: 'stable',
    },
    '## Rule 1\n- **DO** set `overscroll-behavior: contain` on `dialog:modal` and `dialog::backdrop`.\n- **DON\'T** set `overflow: hidden` on `document.body`.'
  );

  writeGuide(
    packDir,
    'js/deep-clone-safety.md',
    {
      id: 'deep-clone-safety',
      title: 'Deep Clone Objects Safely with structuredClone',
      description: 'Clone nested state without corrupting Dates or Maps, while respecting Proxy and toJSON limits.',
      tags: ['structuredClone', 'clone', 'immutable', 'toSorted'],
      maturity: 'stable',
    },
    '## Rule 1\n- **DO** call `structuredClone(value)` for plain nested state.\n- **DON\'T** replace `JSON.parse(JSON.stringify(x))` when callers rely on `.toJSON()`.'
  );

  const dialogHits = searchGuides(packDir, 'prevent modal backdrop scroll', { limit: 5 });
  assert.ok(dialogHits.length >= 1);
  assert.equal(dialogHits[0].id, 'modal-scroll-contain');
  assert.equal(dialogHits[0].maturity, 'stable');

  const cloneHits = searchGuides(packDir, 'clone object structured clone', { limit: 5 });
  assert.ok(cloneHits.length >= 1);
  assert.equal(cloneHits[0].id, 'deep-clone-safety');

  const emptyHits = searchGuides(packDir, 'kubernetes helm ingress controller', { limit: 5 });
  assert.deepEqual(emptyHits, []);
});

test('retrieve enforces .kbrc.json experimental/volatile gates and spills >9.5KB output to a temp file', async () => {
  const { initPack, retrieveGuides } = await import(CLI_PATH);
  const tmp = makeTempDir();
  const packDir = path.join(tmp, 'retrieve-kb');
  initPack(packDir, { name: 'retrieve-kb' });

  writeGuide(
    packDir,
    'ai/webmcp-tools.md',
    {
      id: 'webmcp-tools',
      title: 'WebMCP Declarative Form Tools',
      description: 'Expose forms as structured browser tools via toolname and modelContext.',
      tags: ['webmcp', 'modelContext'],
      maturity: 'experimental',
    },
    '## Rule 1\n- **DO** pass an `AbortSignal` when registering tools.\n- **DON\'T** register tools on insecure HTTP origins.'
  );

  const lockedResult = retrieveGuides(packDir, ['webmcp-tools']);
  assert.match(lockedResult.output, /\[GATE_LOCKED\]/);
  assert.match(lockedResult.output, /allowExperimental/);

  fs.writeFileSync(
    path.join(packDir, '.kbrc.json'),
    JSON.stringify({ allowExperimental: true, allowVolatile: false }, null, 2)
  );

  const unlockedResult = retrieveGuides(packDir, ['webmcp-tools']);
  assert.doesNotMatch(unlockedResult.output, /\[GATE_LOCKED\]/);
  assert.match(unlockedResult.output, /AbortSignal/);

  const largeParagraph = 'Detailed edge-case constraint line for large retrieval spillover verification.\n'.repeat(160);
  writeGuide(
    packDir,
    'js/large-guide.md',
    {
      id: 'large-guide',
      title: 'Large Guide Spillover Check',
      description: 'Tests spillover above 9500 bytes.',
      tags: ['large'],
      maturity: 'stable',
    },
    `## Rule 1\n- **DO** read full spilled files.\n- **DON'T** truncate guides.\n\n${largeParagraph}`
  );

  const spilled = retrieveGuides(packDir, ['large-guide'], { maxInlineBytes: 9500 });
  assert.ok(spilled.savedFilePath, 'Expected savedFilePath when output exceeds 9500 bytes');
  assert.equal(fs.existsSync(spilled.savedFilePath), true);
  assert.match(spilled.output, /\[SAVED_TO_FILE\]/);
  const savedText = fs.readFileSync(spilled.savedFilePath, 'utf8');
  assert.match(savedText, /Large Guide Spillover Check/);
});

test('scan detects multiline and line-scoped legacy patterns with keepWhen/dropWhen while skipping excluded lines and node_modules', async () => {
  const { initPack, scanTarget } = await import(CLI_PATH);
  const tmp = makeTempDir();
  const packDir = path.join(tmp, 'scan-kb');
  const appDir = path.join(tmp, 'sample-app');
  initPack(packDir, { name: 'scan-kb' });

  writeGuide(
    packDir,
    'ui/link-button.md',
    {
      id: 'link-button',
      title: 'Never Nest Button Inside Anchor',
      description: 'Style links with buttonVariants instead of nesting <Button> inside <a>.',
      tags: ['a11y', 'anchor', 'button'],
      maturity: 'stable',
    },
    '## Rule 1\n- **DO** apply `buttonVariants()` directly to `<a>`.\n- **DON\'T** nest `<Button>` or `<button>` inside `<a href>`.'
  );

  writeGuide(
    packDir,
    'forms/focus-ring.md',
    {
      id: 'focus-ring',
      title: 'Preserve Keyboard Focus Ring',
      description: 'Never strip focus outlines without a focus-visible replacement.',
      tags: ['focus-visible', 'outline'],
      maturity: 'stable',
    },
    '## Rule 1\n- **DO** pair `focus:outline-none` with `focus-visible:ring-2`.\n- **DON\'T** remove outlines with no keyboard indicator.'
  );

  fs.writeFileSync(
    path.join(packDir, 'scanner-rules.json'),
    JSON.stringify(
      {
        rules: [
          {
            id: 'no-button-in-anchor',
            guideId: 'link-button',
            pattern: '<a\\b[^>]*>\\s*<(?:Button|button)\\b',
            flags: 'g',
            multiline: true,
            fileExtensions: ['.tsx', '.jsx'],
            message: 'Interactive <Button>/<button> nested inside <a> causes double tab stops.',
            keepWhen: ['Never valid in HTML5; always refactor to a single interactive element.'],
            dropWhen: ['Match appears inside a string literal, markdown fixture, or test snapshot.'],
          },
          {
            id: 'no-bare-outline-none',
            guideId: 'focus-ring',
            pattern: '\\bfocus:outline-none\\b',
            excludeLinePattern: '\\bfocus-visible:(?:ring|outline|border)',
            flags: 'g',
            multiline: false,
            fileExtensions: ['.tsx', '.jsx'],
            message: 'focus:outline-none used without a focus-visible replacement on the same class line.',
            keepWhen: ['Wrapper delegates visible focus styling via :has(:focus-visible) on parent container.'],
            dropWhen: ['Element already defines focus-visible:ring-* on an adjacent line in clsx/cn().'],
          },
        ],
      },
      null,
      2
    )
  );

  fs.mkdirSync(path.join(appDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(appDir, 'node_modules', 'pkg'), { recursive: true });

  fs.writeFileSync(
    path.join(appDir, 'src', 'Header.tsx'),
    [
      'export const Header = () => (',
      '  <div>',
      '    <a href="https://github.com/acme">',
      '      <Button variant="outline">GitHub</Button>',
      '    </a>',
      '    <input className="border focus:outline-none" />',
      '    <input className="border focus:outline-none focus-visible:ring-2" />',
      '  </div>',
      ');',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(appDir, 'node_modules', 'pkg', 'Ignored.tsx'),
    '<a href="/x"><Button>Ignored</Button></a>\n'
  );

  const report = scanTarget(packDir, appDir);
  assert.equal(report.findings.length, 2);
  assert.equal(report.findings[0].ruleId, 'no-button-in-anchor');
  assert.equal(report.findings[0].line, 3);
  assert.ok(report.findings[0].keepWhen.length >= 1);
  assert.ok(report.findings[0].dropWhen.length >= 1);

  assert.equal(report.findings[1].ruleId, 'no-bare-outline-none');
  assert.equal(report.findings[1].line, 6);
});

test('validate catches bloated router SKILL.md, missing DO/DONT, orphan guides, and invalid scanner rules', async () => {
  const { initPack, validatePack } = await import(CLI_PATH);
  const tmp = makeTempDir();
  const packDir = path.join(tmp, 'broken-kb');
  initPack(packDir, { name: 'broken-kb' });

  // 1. Add an unindexed orphan guide missing DO/DON'T
  writeGuide(
    packDir,
    'js/orphan-bad.md',
    {
      id: 'orphan-bad',
      title: 'Bad Guide',
      description: 'Missing DO/DONT and missing from index.md.',
      maturity: 'stable',
    },
    'Just textbook prose without decision rules.'
  );

  // 2. Bloated SKILL.md > 120 lines
  const bloatedSkill = `${fs.readFileSync(path.join(packDir, 'SKILL.md'), 'utf8')}\n${'Extra bloat line\n'.repeat(125)}`;
  fs.writeFileSync(path.join(packDir, 'SKILL.md'), bloatedSkill);

  // 3. Scanner rule pointing to unknown guide and missing keepWhen
  fs.writeFileSync(
    path.join(packDir, 'scanner-rules.json'),
    JSON.stringify({
      rules: [
        {
          id: 'bad-rule',
          guideId: 'non-existent-guide',
          pattern: 'foo',
          fileExtensions: ['.ts'],
          message: 'Bad',
          keepWhen: [],
          dropWhen: [],
        },
      ],
    })
  );

  const errors = validatePack(packDir);
  assert.ok(errors.some((e) => /SKILL\.md.*120/.test(e)), `Expected router bloat error, got: ${errors.join('; ')}`);
  assert.ok(errors.some((e) => /orphan-bad\.md.*index\.md/i.test(e)), `Expected orphan index error, got: ${errors.join('; ')}`);
  assert.ok(errors.some((e) => /orphan-bad\.md.*DO.*DON'T/i.test(e)), `Expected DO/DON'T error, got: ${errors.join('; ')}`);
  assert.ok(errors.some((e) => /non-existent-guide/.test(e)), `Expected unknown guideId error, got: ${errors.join('; ')}`);
  assert.ok(errors.some((e) => /keepWhen/.test(e)), `Expected keepWhen error, got: ${errors.join('; ')}`);
});

test('dogfooded modern-fullstack-guidance pack passes validatePack and maintains byte-identical kb-cli.mjs parity', async () => {
  const { validatePack } = await import(CLI_PATH);
  const dogfoodDir = path.join(ROOT_DIR, '.agents', 'skills', 'modern-fullstack-guidance');
  assert.deepEqual(validatePack(dogfoodDir), []);

  const metaCli = fs.readFileSync(CLI_PATH, 'utf8');
  const packCli = fs.readFileSync(path.join(dogfoodDir, 'scripts', 'kb-cli.mjs'), 'utf8');
  assert.equal(packCli, metaCli);
});
