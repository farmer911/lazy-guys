#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF_PATH = fileURLToPath(import.meta.url);
const VALID_MATURITY = new Set(['stable', 'experimental', 'volatile']);
const IGNORED_SCAN_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'test-results',
  'playwright-report',
]);
const STOPWORDS = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'is', 'are', 'for', 'and', 'or', 'with']);

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (predicate(path.basename(dir), dir)) out.push(dir);
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, out);
    else if (predicate(entry.name, full)) out.push(full);
  }
  return out;
}

function offsetToLine(raw, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < raw.length; i++) {
    if (raw.charCodeAt(i) === 10) line++;
  }
  return line;
}

function stripQuotes(val) {
  const trimmed = String(val ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseFrontmatter(raw) {
  const match = String(raw ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { hasFrontmatter: false, meta: {}, body: String(raw ?? ''), rawFrontmatter: '' };
  const rawFm = match[1];
  const body = String(raw).slice(match[0].length);
  const meta = {};
  const lines = rawFm.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, restRaw] = kv;
    const rest = restRaw.trim();

    if (/^[>|][-+]?$/.test(rest)) {
      const block = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        i++;
        block.push(lines[i].trim());
      }
      meta[key] = block.join(' ');
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1).trim();
      meta[key] = inner
        ? inner.split(',').map((item) => stripQuotes(item))
        : [];
    } else {
      meta[key] = stripQuotes(rest);
    }
  }
  return { hasFrontmatter: true, meta, body, rawFrontmatter: rawFm };
}

function stemToken(tok) {
  if (tok.length <= 3) return tok;
  if (tok.endsWith('ies') && tok.length > 4) return `${tok.slice(0, -3)}y`;
  if (tok.endsWith('ing') && tok.length > 5) return tok.slice(0, -3);
  if (tok.endsWith('s') && !tok.endsWith('ss')) return tok.slice(0, -1);
  return tok;
}

export function tokenize(text) {
  const expanded = String(text ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_./:]+/g, ' ')
    .toLowerCase();
  const rawTokens = expanded.match(/[a-z0-9]+/g) ?? [];
  const out = [];
  for (const tok of rawTokens) {
    if (STOPWORDS.has(tok)) continue;
    out.push(stemToken(tok));
  }
  return out;
}

function loadGuides(kbDir) {
  const guidesDir = path.join(kbDir, 'guides');
  const indexPath = path.resolve(guidesDir, 'index.md');
  const mdFiles = walkFiles(
    guidesDir,
    (name, full) => name.endsWith('.md') && path.resolve(full) !== indexPath
  );

  return mdFiles.map((fullPath) => {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const { hasFrontmatter, meta, body } = parseFrontmatter(raw);
    const headings = (body.match(/^#{1,3}\s+.+$/gm) ?? []).join(' ');
    return {
      filePath: fullPath,
      relPath: path.relative(kbDir, fullPath).replace(/\\/g, '/'),
      baseName: path.basename(fullPath),
      slug: path.basename(fullPath, '.md'),
      raw,
      hasFrontmatter,
      id: String(meta.id ?? ''),
      title: String(meta.title ?? ''),
      description: String(meta.description ?? ''),
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      maturity: String(meta.maturity || 'stable'),
      headings,
      body,
    };
  });
}

function buildRouterSkillMarkdown(name) {
  return `---
name: ${name}
description: >-
  Use when implementing, reviewing, or modernizing code covered by ${name} domain guides so decisions follow verified current patterns rather than stale training weights.
  Not for unrelated domains outside ${name} scope, or mechanical single-rule lint checks already enforced by repository hooks.
---

# ${name}

Consult verified domain guides **before** writing ad-hoc implementations or adding external dependencies.

## Primary Workflow

### Step 1. Search Relevant Guides
Translate the requirement into a **2–5 word action-oriented English query** (\`<verb> + <platform/domain primitive>\`, omitting app-specific filenames or framework noise; split compound tasks into separate searches):

\`\`\`sh
node scripts/kb-cli.mjs search "<query>" --dir .
\`\`\`

### Step 2. Retrieve Full Guide(s)
Fetch matching guide IDs from Step 1 (comma-separated when multiple apply):

\`\`\`sh
node scripts/kb-cli.mjs retrieve "<id>" --dir .
\`\`\`

- If \`retrieve\` saves output (\`> 9.5 KB\`) to a \`[SAVED_TO_FILE]\` path, read that file in full with \`read_file\`.
- If \`retrieve\` reports \`[GATE_LOCKED]\`, respect maturity policy in [.kbrc.json](.kbrc.json) unless the user explicitly opts in.

### Step 3. Apply Decision Rules & Gotchas
Follow the guide's **First-Match Decision Tree**, **DO / DON'T** pairs, and **When NOT to Replace** exceptions without forcing unrequested features or \`as any\` type suppressions.

### Step 4. Conditional Citation Disclosure
- **Prose response mode (default):** End your turn with \`### Knowledge Guidance Applied\` listing \`- **\\\`<id>\\\`**: <choice & pitfall prevented> ("<short verbatim quote of specific rule>")\`. Never quote generic overview text or guess IDs from memory.
- **Machine-parsed schema mode:** If the caller prompt mandates strict JSON or fixed machine-parsed output (such as \`[AGENT_ROLE: ...]\` DAG workers), omit prose disclosure so serialization stays intact.

## Legacy Modernization Flow (Optional)
Only when asked for a broad legacy-pattern audit or modernization sweep, run [scripts/kb-cli.mjs](scripts/kb-cli.mjs) against [scanner-rules.json](scanner-rules.json):

\`\`\`sh
node scripts/kb-cli.mjs scan <target-path> --dir . --json
\`\`\`

Evaluate every hit against its \`keepWhen\` and \`dropWhen\` rubrics. Never break safe fallbacks or add ignore comments solely to force \`0\` findings.

## Catalog Reference
- Guide manifest: [guides/index.md](guides/index.md)
`;
}

export function initPack(targetDir, options = {}) {
  const name = String(options.name || path.basename(targetDir)).trim();
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`Invalid pack name "${name}": use lowercase letters, numbers, and hyphens only.`);
  }
  const standalonePlugin = Boolean(options.standalonePlugin);
  const skillDir = standalonePlugin ? path.join(targetDir, 'skills', name) : targetDir;

  fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(skillDir, 'guides', 'getting-started'), { recursive: true });

  const cliDest = path.join(skillDir, 'scripts', 'kb-cli.mjs');
  if (path.resolve(SELF_PATH) !== path.resolve(cliDest)) {
    fs.copyFileSync(SELF_PATH, cliDest);
    fs.chmodSync(cliDest, 0o755);
  }

  fs.writeFileSync(
    path.join(skillDir, '.kbrc.json'),
    `${JSON.stringify({ allowExperimental: false, allowVolatile: false }, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(skillDir, 'scanner-rules.json'),
    `${JSON.stringify({ rules: [] }, null, 2)}\n`
  );
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), buildRouterSkillMarkdown(name));

  const sampleGuide = `---
id: "sample-rule"
title: "Sample First-Match Decision Guide"
description: "Starter template demonstrating first-match decision rules and symmetric DO/DON'T pairs."
tags: ["template", "sample"]
maturity: "stable"
---

# Sample First-Match Decision Guide

## Choose the right approach

Pick the first rule that matches. If unsure, use Rule 1.

### Rule 1: Default safe implementation

- **DO** keep only non-obvious pitfalls that unguided agents get wrong.
- **DON'T** pad guides with textbook definitions already in model weights.
`;
  fs.writeFileSync(path.join(skillDir, 'guides', 'getting-started', 'sample-rule.md'), sampleGuide);
  fs.writeFileSync(
    path.join(skillDir, 'guides', 'index.md'),
    `# ${name} Guide Index\n\n- [sample-rule.md](getting-started/sample-rule.md) — Starter template guide\n`
  );

  if (standalonePlugin) {
    const relSkillPath = `./skills/${name}/SKILL.md`;
    const pluginManifest = {
      name,
      version: '0.1.0',
      description: `On-demand agent knowledge pack for ${name}.`,
      skills: [`./skills/${name}`],
    };

    fs.writeFileSync(
      path.join(targetDir, 'package.json'),
      `${JSON.stringify(
        {
          name,
          version: '0.1.0',
          type: 'module',
          description: pluginManifest.description,
          engines: { node: '>=20.0.0' },
          bin: { [name]: `skills/${name}/scripts/kb-cli.mjs` },
          contributes: { chatSkills: [{ path: relSkillPath }] },
        },
        null,
        2
      )}\n`
    );
    fs.writeFileSync(path.join(targetDir, 'plugin.json'), `${JSON.stringify(pluginManifest, null, 2)}\n`);
    fs.writeFileSync(
      path.join(targetDir, 'gemini-extension.json'),
      `${JSON.stringify({ name, version: '0.1.0', contextFileName: relSkillPath }, null, 2)}\n`
    );

    for (const dirRel of ['.claude-plugin', '.codex-plugin', '.cursor-plugin']) {
      fs.mkdirSync(path.join(targetDir, dirRel), { recursive: true });
      fs.writeFileSync(
        path.join(targetDir, dirRel, 'plugin.json'),
        `${JSON.stringify(pluginManifest, null, 2)}\n`
      );
    }
    fs.mkdirSync(path.join(targetDir, '.agents', 'plugins'), { recursive: true });
    fs.writeFileSync(
      path.join(targetDir, '.agents', 'plugins', 'marketplace.json'),
      `${JSON.stringify({ name, plugins: [{ name, source: './' }] }, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(targetDir, 'README.md'),
      `# ${name}\n\nStandalone multi-agent knowledge pack powered by zero-dependency BM25 search & static scan.\n`
    );
  }

  return { skillDir, standalonePlugin };
}

export function searchGuides(kbDir, query, options = {}) {
  const limit = Number(options.limit ?? 5);
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const guides = loadGuides(kbDir);
  if (guides.length === 0) return [];

  const docs = guides.map((g) => {
    const highTokens = tokenize(`${g.id} ${g.title} ${g.tags.join(' ')}`);
    const midTokens = tokenize(`${g.description} ${g.headings}`);
    const bodyTokens = tokenize(g.body);
    const weighted = [
      ...highTokens,
      ...highTokens,
      ...highTokens,
      ...midTokens,
      ...midTokens,
      ...bodyTokens,
    ];
    const tf = new Map();
    for (const tok of weighted) {
      tf.set(tok, (tf.get(tok) ?? 0) + 1);
    }
    return { guide: g, length: weighted.length || 1, tf };
  });

  const N = docs.length;
  const avgDl = docs.reduce((sum, d) => sum + d.length, 0) / N;
  const df = new Map();
  for (const qt of new Set(qTokens)) {
    let count = 0;
    for (const d of docs) {
      if (d.tf.has(qt)) count++;
    }
    df.set(qt, count);
  }

  const k1 = 1.5;
  const b = 0.75;
  const scored = [];

  for (const d of docs) {
    let score = 0;
    for (const qt of qTokens) {
      const freq = d.tf.get(qt) ?? 0;
      if (freq === 0) continue;
      const docFreq = df.get(qt) ?? 0;
      const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
      const norm = freq + k1 * (1 - b + b * (d.length / avgDl));
      score += idf * ((freq * (k1 + 1)) / norm);
    }
    if (score > 0) {
      scored.push({
        score,
        id: d.guide.id || d.guide.slug,
        description: d.guide.description,
        maturity: d.guide.maturity,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored.slice(0, limit).map(({ id, description, maturity }) => ({ id, description, maturity }));
}

export function retrieveGuides(kbDir, idsInput, options = {}) {
  const maxInlineBytes = Number(options.maxInlineBytes ?? 9500);
  const requestedIds = (Array.isArray(idsInput) ? idsInput : String(idsInput ?? '').split(','))
    .map((s) => s.trim())
    .filter(Boolean);

  if (requestedIds.length === 0) {
    throw new Error('retrieve requires at least one guide id.');
  }

  let kbrc = { allowExperimental: false, allowVolatile: false };
  const kbrcPath = path.join(kbDir, '.kbrc.json');
  if (fs.existsSync(kbrcPath)) {
    kbrc = { ...kbrc, ...JSON.parse(fs.readFileSync(kbrcPath, 'utf8')) };
  }

  const guides = loadGuides(kbDir);
  const byId = new Map(guides.map((g) => [g.id || g.slug, g]));
  const sections = [];

  for (const id of requestedIds) {
    const g = byId.get(id);
    if (!g) {
      throw new Error(`Unknown guide id "${id}". Run search first to discover valid guide IDs.`);
    }
    if (g.maturity === 'experimental' && !kbrc.allowExperimental) {
      sections.push(
        `[GATE_LOCKED] Guide "${id}" has maturity="experimental". Set "allowExperimental": true in .kbrc.json when targeting experimental features.`
      );
      continue;
    }
    if (g.maturity === 'volatile' && !kbrc.allowVolatile) {
      sections.push(
        `[GATE_LOCKED] Guide "${id}" has maturity="volatile". Set "allowVolatile": true in .kbrc.json when targeting newly shipped volatile features.`
      );
      continue;
    }
    const trimmedBody = g.body.trim();
    const headingPrefix =
      g.title && !trimmedBody.startsWith('# ') ? `# ${g.title}\n\n` : '';
    sections.push(`<!-- guide:${id} (${g.relPath}) -->\n${headingPrefix}${trimmedBody}`);
  }

  const combined = `${sections.join('\n\n---\n\n')}\n`;
  const byteLen = Buffer.byteLength(combined, 'utf8');
  if (byteLen > maxInlineBytes) {
    const hash = crypto.createHash('sha1').update(combined).digest('hex').slice(0, 12);
    const savedFilePath = path.join(os.tmpdir(), `kb-retrieve-${hash}.md`);
    fs.writeFileSync(savedFilePath, combined, 'utf8');
    return {
      output: `[SAVED_TO_FILE] ${savedFilePath}\nRetrieved guidance (${byteLen} bytes) exceeds ${maxInlineBytes} bytes. Read ${savedFilePath} in full with read_file (do not truncate with head/cat).`,
      savedFilePath,
    };
  }

  return { output: combined, savedFilePath: null };
}

export function scanTarget(kbDir, targetPath) {
  const rulesPath = path.join(kbDir, 'scanner-rules.json');
  if (!fs.existsSync(rulesPath)) {
    return { scannedFiles: 0, findings: [], antiGamingNotice: 'No scanner-rules.json configured.' };
  }
  const parsed = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  const rules = Array.isArray(parsed.rules) ? parsed.rules : [];
  const files = walkFiles(targetPath, () => true);
  const findings = [];
  const baseDir = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()
    ? targetPath
    : path.dirname(targetPath);

  for (const filePath of files) {
    const ext = path.extname(filePath);
    const matchingRules = rules.filter(
      (r) => !Array.isArray(r.fileExtensions) || r.fileExtensions.length === 0 || r.fileExtensions.includes(ext)
    );
    if (matchingRules.length === 0) continue;

    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const relFile = path.relative(baseDir, filePath).replace(/\\/g, '/');

    for (const rule of matchingRules) {
      const flags = String(rule.flags || 'g').includes('g')
        ? String(rule.flags || 'g')
        : `${rule.flags || ''}g`;
      const re = new RegExp(rule.pattern, flags);
      const excludeRe = rule.excludeLinePattern ? new RegExp(rule.excludeLinePattern) : null;

      if (rule.multiline) {
        for (const match of raw.matchAll(re)) {
          const matchedText = match[0];
          if (excludeRe && excludeRe.test(matchedText)) continue;
          const line = offsetToLine(raw, match.index ?? 0);
          findings.push({
            ruleId: rule.id,
            guideId: rule.guideId,
            file: relFile,
            line,
            snippet: matchedText.split(/\r?\n/)[0].trim(),
            message: rule.message,
            keepWhen: rule.keepWhen ?? [],
            dropWhen: rule.dropWhen ?? [],
          });
        }
      } else {
        for (let idx = 0; idx < lines.length; idx++) {
          const lineText = lines[idx];
          if (excludeRe && excludeRe.test(lineText)) continue;
          re.lastIndex = 0;
          if (re.test(lineText)) {
            findings.push({
              ruleId: rule.id,
              guideId: rule.guideId,
              file: relFile,
              line: idx + 1,
              snippet: lineText.trim(),
              message: rule.message,
              keepWhen: rule.keepWhen ?? [],
              dropWhen: rule.dropWhen ?? [],
            });
          }
        }
      }
    }
  }

  return {
    scannedFiles: files.length,
    findings,
    antiGamingNotice:
      'Check every finding against keepWhen and dropWhen. Never edit safe fallbacks or add suppression comments solely to force 0 findings.',
  };
}

export function validatePack(kbDir) {
  const errors = [];
  const skillPath = path.join(kbDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    errors.push('Missing required SKILL.md thin router');
  } else {
    const skillRaw = fs.readFileSync(skillPath, 'utf8');
    const lineCount = skillRaw.replace(/\r?\n$/, '').split(/\r?\n/).length;
    if (lineCount > 120) {
      errors.push(`SKILL.md has ${lineCount} lines (thin router must stay <= 120 lines)`);
    }
    const { hasFrontmatter, rawFrontmatter } = parseFrontmatter(skillRaw);
    if (!hasFrontmatter || !/\bUse when\b/.test(rawFrontmatter) || !/\bNot for\b/.test(rawFrontmatter)) {
      errors.push('SKILL.md frontmatter description must include "Use when..." and "Not for..."');
    }
    for (const aux of ['index.md', 'scanner-rules.json', '.kbrc.json', 'kb-cli.mjs']) {
      const auxFull =
        aux === 'index.md'
          ? path.join(kbDir, 'guides', 'index.md')
          : aux === 'kb-cli.mjs'
            ? path.join(kbDir, 'scripts', 'kb-cli.mjs')
            : path.join(kbDir, aux);
      if (fs.existsSync(auxFull) && !skillRaw.includes(aux)) {
        errors.push(`SKILL.md must reference "${aux}" for transitive file reachability`);
      }
    }
  }

  const indexPath = path.join(kbDir, 'guides', 'index.md');
  const indexRaw = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : null;
  if (indexRaw === null) {
    errors.push('Missing required guides/index.md manifest');
  }

  const guides = loadGuides(kbDir);
  const seenIds = new Set();
  for (const g of guides) {
    const lines = g.raw.replace(/\r?\n$/, '').split(/\r?\n/).length;
    if (lines > 250) {
      errors.push(`${g.relPath} has ${lines} lines (must be <= 250 lines)`);
    }
    if (!g.hasFrontmatter || !g.id || !g.description) {
      errors.push(`${g.relPath} must declare YAML frontmatter with non-empty "id" and "description"`);
    }
    if (g.id && g.id !== g.slug) {
      errors.push(`${g.relPath} frontmatter id "${g.id}" must match filename slug "${g.slug}"`);
    }
    if (!VALID_MATURITY.has(g.maturity)) {
      errors.push(`${g.relPath} has invalid maturity "${g.maturity}" (expected stable | experimental | volatile)`);
    }
    if (g.id) {
      if (seenIds.has(g.id)) {
        errors.push(`Duplicate guide id "${g.id}" in ${g.relPath}`);
      }
      seenIds.add(g.id);
    }
    if (!/\*\*DO\*\*/.test(g.body) || !/\*\*DON'T\*\*/.test(g.body)) {
      errors.push(`${g.relPath} must include explicit **DO** and **DON'T** guidance pairs`);
    }
    if (indexRaw !== null && !indexRaw.includes(g.baseName)) {
      errors.push(`${g.relPath} (${g.baseName}) is missing from guides/index.md (orphan guide)`);
    }
  }

  const rulesPath = path.join(kbDir, 'scanner-rules.json');
  if (fs.existsSync(rulesPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      if (!Array.isArray(parsed.rules)) {
        errors.push('scanner-rules.json must contain a "rules" array');
      } else {
        for (const rule of parsed.rules) {
          if (!rule.id || !rule.guideId || !rule.pattern) {
            errors.push(`Invalid scanner rule entry: ${JSON.stringify(rule.id ?? rule)}`);
            continue;
          }
          if (!seenIds.has(rule.guideId)) {
            errors.push(`Scanner rule "${rule.id}" references unknown guideId "${rule.guideId}"`);
          }
          if (!Array.isArray(rule.keepWhen) || rule.keepWhen.length === 0) {
            errors.push(`Scanner rule "${rule.id}" must define a non-empty keepWhen array`);
          }
          if (!Array.isArray(rule.dropWhen) || rule.dropWhen.length === 0) {
            errors.push(`Scanner rule "${rule.id}" must define a non-empty dropWhen array`);
          }
          try {
            new RegExp(rule.pattern, rule.flags || 'g');
          } catch (err) {
            errors.push(`Scanner rule "${rule.id}" has invalid regex pattern: ${err.message}`);
          }
        }
      }
    } catch (err) {
      errors.push(`scanner-rules.json is not valid JSON: ${err.message}`);
    }
  }

  return errors;
}

function parseFlags(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

export function runCli(argv = process.argv.slice(2)) {
  const [cmd, ...rest] = argv;
  const { positional, flags } = parseFlags(rest);
  const defaultKbDir = path.resolve(import.meta.dirname, '..');
  const kbDir = path.resolve(String(flags.dir || defaultKbDir));

  if (cmd === 'init') {
    const target = path.resolve(positional[0] || '.');
    const res = initPack(target, {
      name: flags.name || path.basename(target),
      standalonePlugin: Boolean(flags['standalone-plugin']),
    });
    console.log(JSON.stringify({ status: 'ok', ...res }, null, 2));
    return 0;
  }

  if (cmd === 'search') {
    const query = positional.join(' ');
    const results = searchGuides(kbDir, query, { limit: flags.limit ? Number(flags.limit) : 5 });
    console.log(JSON.stringify(results, null, 2));
    return 0;
  }

  if (cmd === 'retrieve') {
    const res = retrieveGuides(kbDir, positional.join(','), {
      maxInlineBytes: flags['max-inline-bytes'] ? Number(flags['max-inline-bytes']) : 9500,
    });
    process.stdout.write(res.output);
    return 0;
  }

  if (cmd === 'scan') {
    const targetPath = path.resolve(positional[0] || '.');
    const report = scanTarget(kbDir, targetPath);
    if (flags.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      for (const f of report.findings) {
        console.log(`${f.file}:${f.line} [${f.ruleId} -> ${f.guideId}] ${f.message}`);
      }
      console.log(`\nScanned ${report.scannedFiles} files (${report.findings.length} findings). ${report.antiGamingNotice}`);
    }
    return 0;
  }

  if (cmd === 'validate') {
    const errors = validatePack(kbDir);
    if (errors.length > 0) {
      for (const err of errors) console.error(`[kb-error] ${err}`);
      return 1;
    }
    console.log(`Knowledge pack at ${kbDir} is valid.`);
    return 0;
  }

  console.error('Usage: node kb-cli.mjs <init|search|retrieve|scan|validate> [args] [--dir <kb-dir>]');
  return 1;
}

const isDirectRun = (() => {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(SELF_PATH);
  } catch {
    return path.resolve(process.argv[1]) === path.resolve(SELF_PATH);
  }
})();

if (isDirectRun) {
  process.exit(runCli());
}
