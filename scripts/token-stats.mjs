import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function summarizeTranscriptTokens(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
  try {
    const raw = fs.readFileSync(transcriptPath, 'utf8').trim();
    if (!raw) return null;
    let inputTokens = 0;
    let cacheReadTokens = 0;
    let outputTokens = 0;
    let turns = 0;
    const models = new Set();

    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        const inp = Number(entry.input_tokens ?? 0);
        const cache = Number(entry.cache_read_tokens ?? 0);
        const out = Number(entry.output_tokens ?? 0);
        if (inp > 0 || cache > 0 || out > 0) {
          inputTokens += inp;
          cacheReadTokens += cache;
          outputTokens += out;
          turns += 1;
          if (entry.model) models.add(String(entry.model));
        }
      } catch {
        // Ignore malformed JSONL lines
      }
    }

    if (turns === 0) return null;
    return {
      turns,
      model: [...models].join(', ') || 'unknown',
      inputTokens,
      cacheReadTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  } catch {
    return null;
  }
}

export function formatTokenUsageReport(usageLogPath) {
  if (!fs.existsSync(usageLogPath)) {
    return 'No token usage recorded yet (.agents/logs/token-usage.jsonl not found).';
  }
  const latestByConv = new Map();
  for (const line of fs.readFileSync(usageLogPath, 'utf8').trim().split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      const key = rec.conversationId || rec.ts || 'unknown';
      latestByConv.set(key, rec);
    } catch {
      // Ignore malformed lines
    }
  }
  if (latestByConv.size === 0) return 'No valid token usage entries found.';

  const rows = [...latestByConv.values()];
  let sumIn = 0;
  let sumCache = 0;
  let sumOut = 0;
  const lines = [
    'Session Token Usage (latest snapshot per conversation):',
    '------------------------------------------------------------------------------------',
  ];
  for (const r of rows) {
    sumIn += Number(r.inputTokens ?? 0);
    sumCache += Number(r.cacheReadTokens ?? 0);
    sumOut += Number(r.outputTokens ?? 0);
    const id = String(r.conversationId ?? 'default').slice(0, 12);
    lines.push(
      `${r.ts?.slice(0, 19) ?? 'n/a'} | ${id} | turns=${r.turns ?? 0} | in=${r.inputTokens ?? 0} | cache=${r.cacheReadTokens ?? 0} | out=${r.outputTokens ?? 0} | ${r.model ?? 'unknown'}`
    );
  }
  lines.push('------------------------------------------------------------------------------------');
  lines.push(
    `TOTAL (${rows.length} session(s)): input=${sumIn.toLocaleString()} | cache_read=${sumCache.toLocaleString()} | output=${sumOut.toLocaleString()} | total=${(sumIn + sumOut).toLocaleString()}`
  );
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const usageLogPath = path.join(rootDir, '.agents', 'logs', 'token-usage.jsonl');
  console.log(formatTokenUsageReport(usageLogPath));
}
