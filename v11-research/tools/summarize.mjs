#!/usr/bin/env node
/** V11.0 summarize: median + range per konfigurasi dari JSON Lighthouse. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = new URL('../lighthouse/', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('summary'));

const groups = {};
for (const f of files) {
  const m = /^(.+?)-(desktop|mobile)-(\d)\.json$/.exec(f);
  if (!m) continue;
  const key = `${m[1]}-${m[2]}`;
  (groups[key] ||= []).push(f);
}

const metrics = (json) => {
  const a = json.audits;
  return {
    LCP: Math.round(a['largest-contentful-paint'].numericValue),
    FCP: Math.round(a['first-contentful-paint'].numericValue),
    CLS: a['cumulative-layout-shift'].numericValue,
    TBT: Math.round(a['total-blocking-time'].numericValue),
    Score: Math.round(json.categories.performance.score * 100),
    LCPelement: a['largest-contentful-paint'].details?.items?.[0]?.items?.[0]?.node?.selector || a['largest-contentful-paint'].details?.items?.[0]?.node?.selector || '?',
  };
};

const median = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
const summary = {};
for (const [key, list] of Object.entries(groups)) {
  const rows = list.map((f) => metrics(JSON.parse(readFileSync(dir + f))));
  const agg = {};
  for (const k of ['LCP', 'FCP', 'TBT', 'Score']) {
    const vals = rows.map((r) => r[k]);
    agg[k] = { median: median(vals), min: Math.min(...vals), max: Math.max(...vals) };
  }
  agg.CLS = median(rows.map((r) => r.CLS));
  agg.LCPelement = rows[0].LCPelement;
  agg.runs = rows;
  summary[key] = agg;
}
console.log(JSON.stringify(summary, null, 1));
writeFileSync(dir + 'summary-all.json', JSON.stringify(summary, null, 2));
