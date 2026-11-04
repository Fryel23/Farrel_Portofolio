/*!
 * v12-audit-work/numerical-comparison/capture.mjs — Rekam digest numerik
 * dataset Cirebon (B7 evidence): mengekstrak HANYA nilai numerik per record
 * (values, derived.subIndex, derived.ispu, dominant) dari generated JSON,
 * canonical-string + sha256. Metadata tidak diikutkan (memang berubah oleh
 * B2/B4/B7), sehingga perbedaan digest = perbedaan angka murni.
 *
 * Pemakaian: node v12-audit-work/numerical-comparison/capture.mjs <out.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const OUT = process.argv[2];
if (!OUT) throw new Error('Pemakaian: node capture.mjs <output.json>');

const years = [2021, 2022, 2023, 2024, 2025];
const snapshot = {};

function canonicalNumber(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'number') return `!${typeof value}`;
  return Number.isInteger(value) ? String(value) : value.toPrecision(12);
}

for (const year of years) {
  const dataset = JSON.parse(readFileSync(new URL(`../../public/data/aqi/cirebon-${year}.json`, import.meta.url), 'utf8'));
  const records = dataset.records.map((record) => ({
    id: record.id,
    so2: canonicalNumber(record.values.so2),
    no2: canonicalNumber(record.values.no2),
    subSo2: canonicalNumber(record.derived && record.derived.subIndex && record.derived.subIndex.so2 ? record.derived.subIndex.so2.value : null),
    subNo2: canonicalNumber(record.derived && record.derived.subIndex && record.derived.subIndex.no2 ? record.derived.subIndex.no2.value : null),
    ispu: canonicalNumber(record.derived ? record.derived.ispu : null),
    dominant: record.derived ? record.derived.dominantParameter : null,
    category: record.derived ? record.derived.category : null,
  }));
  /* Canonical string: urutan record sesuai file (sort builder stabil). */
  const canonical = records.map((r) => JSON.stringify(r)).join('\n');
  snapshot[year] = {
    recordCount: records.length,
    sha256: createHash('sha256').update(canonical).digest('hex'),
  };
}

writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Numeric baseline tersimpan: ${OUT}`);
for (const [year, info] of Object.entries(snapshot)) {
  console.log(`  ${year}: ${info.recordCount} record  sha256=${info.sha256.slice(0, 16)}…`);
}
