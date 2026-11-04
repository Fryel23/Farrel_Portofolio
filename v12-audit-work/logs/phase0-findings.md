# Phase 0 — Preflight Findings (V12.1 Audit Closure)

Tanggal: 2026-11-01 (UTC 12:13). Workspace: /home/z/my-project/v11-work/portfolio-astro
Node v24.22.1, npm 11.19.1. Tidak ada aktivitas Git/VCS.

## Baseline
- Test: `npm run test:lab` → **50 PASS / 0 FAIL** (log: v12-audit-work/baseline/test-baseline.log). Jumlah test case dihitung dari output runner (grep "^  PASS" = 50). Sesuai ekspektasi awal 50.
- CSV integrity: sha256 = `9ce4de3d0466c71d1ce10447941236e9b7cfc19af255c6831fec89a5d25a31a0` (COCOK dengan hash historis) → regenerasi BOLEH jalan. `wc -l` = 217 (sesuai petunjuk historis).
- Snapshot: 31 file target → v12-audit-work/preflight-snapshots/ + SHA-256 di v12-audit-work/logs/preflight-snapshot-sha256.txt.
- Numeric baseline: v12-audit-work/numerical-comparison/before.json (2021-2024: 24 record; 2025: 4 record; total 100).

## Temuan CONFIRMED
- **B7**: `aqi-calculator.js:58,70` `averagingPeriod: '1h'` (so2,no2); header komentar baris 30–38 menyebut "SO₂/NO₂ 1 jam"; builder transformations[4], komentar baris 197–198, `derived.method` "bukan 1-jam resmi", SHARED_LIMITATIONS[2] "konsentrasi 1 jam (SO₂/NO₂)", `ispuMethodology.basisNote` "basis tahap ≠ 1 jam"; methodology.astro baris 121 & 253; render.js:97 "bukan 1-jam resmi"; test fixtures memakai '1h' untuk input valid (10 titik) dan '24h' sebagai periode SALAH (test #12).
- **B1**: methodology §8 contoh SO₂ memakai pita indeks "(50–100]" dan "+ 50" tetapi mengklaim hasil 63,21 → aritmetika aktualnya 62,4609 (inkonsisten). Implementasi & dataset: `51 + (49/128)×31.9 = 63.21171875` → 63,21 → 63 (Sedang), NO₂ 109,31 → 62,96825 → 62,97 (benar). Record terverifikasi: PERUMNAS GUNUNG, DEPAN KEL. KECAPI — TAHAP II 2021, SO₂ 83,9 / NO₂ 109,31. Catatan batas pita yang sudah ada (">52–180", 52→50, 52+ε→≈51) SUDAH sesuai implementasi + test boundary.
- **B3**: builder `input.path: INPUT_PATH` (absolute via resolve) dan `outputs: written` (absolute via join OUT_DIR) → harus relatif terhadap project root via node:path `relative`.
- **B4**: satu variabel `todayIso` dipakai untuk `dataset.accessedAt` (baris 312), `manifest.updatedAt` (368), `sources[].accessedAt` (412). Wajib: `SOURCE_ACCESSED_AT = '2026-11-01'` (provenance dari pengguna) untuk accessedAt; updatedAt tetap tanggal build.
- **B5**: parser mengembalikan baris kosong sebagai `['']`; builder melewatinya di baris 101 tanpa menghitung. Tidak ada counter `skippedBlankLines` di audit/transformations. Tidak ada test fixture blank line.
- **B6**: `render.js:42` menampilkan `measurement.frequency` dengan label "Averaging period" → harus 3 baris terpisah.
- **B2**: 220 kemunculan U+2014. Rincian: generated JSON (22: builder strings sebagai sumbernya), Lab source+pages+css (~135), test+builder (~20), V12.0_IMPLEMENTATION_REPORT.md (35), non-Lab source 11 (global.js 3, hero-webgl/index.js 2, core.js 2, about.js 2, home.js 1, work.js 1).

## Temuan BERBEDA DARI ASUMSI PROMPT
1. Nilai aktual `parameterDefinitions.so2.averagingPeriod` = `agregat tahap pengukuran (basis waktu tidak dilaporkan sumber)` (huruf kecil 'a') — bukan kapital seperti contoh prompt B6. UI membaca field aktual; nilai dataset TIDAK diubah.
2. Builder mem-pass `averagingPeriod: 'stage-aggregate'` (bukan '1h') + allowBasisMismatch:true → perubahan '1h'→'24h' pada tabel TIDAK menyentuh jalur numerik; tetap dibuktikan lewat digest before/after.
3. Bug teks audit `ispuMethodology.no2Table`: segmen `>101-200` rusak (harusnya `>200-1130→101-200` sesuai implementasi). Diperbaiki sebagai integritas dokumentasi dalam pass builder (bukan perubahan breakpoint).
4. `chart-loader.js` (4 em dash) ada di luar daftar prioritas B2 tetapi termasuk scope Lab → diperbaiki.
5. `C9`: limitation tahun-spesifik TERCAMPUR di SHARED_LIMITATIONS (2023 enam-grup-nol & 2024 duplikat NO₂ tampil di SEMUA tahun) — sesuai dugaan C9; diverifikasi terhadap data aktual (6 grup 2023; 1 grup duplikat 2024: DEPAN KANTOR DISUKCAPIL BIMA T-II, baris id 10 & 12).

## Rencana patch (urutan §7 Phase 2)
B7 → B1 → B3 → B4 → B5 → B6 → B2 (source → report → gate → regenerate → grep ulang) → tests (+2 kontrak averaging period, +1 fixture blank line, +1 limitation-leak test C9) → C4 (trend abort) → C1 (setBusy guard) → C2 (dokumentasi kontrak announce) → C6 (audit: NOT NEEDED dengan bukti).

## File target edit
src/scripts/lab/core/aqi-calculator.js, src/scripts/lab/core/formatters.js, src/scripts/lab/index.js, src/scripts/lab/ui/{render,controls,data-table,metrics,status-view}.js, src/scripts/lab/charts/{chart-config,line-chart,chart-loader}.js, src/scripts/lab/data/{manifest-loader,dataset-loader,dataset-cache}.js, src/scripts/lab/core/{stats,validate-dataset}.js, src/scripts/lab.js, src/styles/lab.css, src/pages/lab/{index,methodology}.astro, scripts/data/build-cirebon-dataset.mjs, scripts/data/csv-parser.mjs, scripts/test-lab-core.mjs, V12.0_IMPLEMENTATION_REPORT.md.
Generated (regenerate, tanpa edit manual): public/data/aqi/*.json, data/cirebon-ingest-audit.json.
