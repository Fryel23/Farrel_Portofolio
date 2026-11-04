---
adrId: "v12-2-implementation-report"
versionTag: "V12.2"
sequenceOrder: 12
title: "V12.2 Implementation Report: Structured Content, Taxonomy & Relations"
summary: "Transformasi koleksi work dengan contentId stabil, taxonomy kanonis tunggal, validator integritas lintas-entri pada jalur build, dan investigasi scroll Chart.js V12.2a."
category: "content-and-schema-systems"
recordType: "implementation"
recordStatus: "active-contract"
targetRoutes: ["/work","/work/aqi-cirebon","/lab"]
relatedWorkIds: ["aqi-cirebon"]
keyMetrics:
  - label: "Content Integrity Tests"
    value: "23/23"
    unit: "tests"
    evidenceSection: "§8 Hasil pengujian"
  - label: "Lab Core Tests"
    value: "54/54"
    unit: "tests"
    evidenceSection: "§8 Hasil pengujian"
provenance:
  sourcePath: "V12.2_IMPLEMENTATION_REPORT.md"
  sourceFilename: "V12.2_IMPLEMENTATION_REPORT.md"
  sourceSha256: "113ced6df4d813b84bbda85f155e111e524d0ed39433828687c9160240e8a0c5"
  sourceBytes: 22919
  sourceWordCount: 2932
  sourceLineCount: 223
  normalizedContentSha256: "99d8bae53694c33fe2336cc6ce0198d94f9e18976d15165642eb97928b63d9bd"
  normalizationCount: 33
---
# V12.2 IMPLEMENTATION REPORT
## Structured Content, Taxonomy, Relations, and Editorial Case Study (+ V12.2a Chart Scroll Hotfix Investigation)

**Final verdict: READY FOR USER REVIEW** (pemilihan verdict mengikuti Bagian 12.3 spec - seluruh mandatory acceptance criteria lulus, tidak ada blocker, keterbatasan non-blocking terdokumentasi di §12 dan §13).

---

## 0. Ringkasan

V12.2 mengubah content collection `work` menjadi sistem konten terstruktur secara semantik: identifier konten stabil (`contentId`), taxonomy kanonis (disciplines/technologies/status), relasi antarkonten yang tervalidasi deterministik, field editorial terstruktur (context/methodology/findings/limitations), dan halaman Case Study yang merender semuanya secara editorial tanpa mengubah perilaku existing.

V12.2a (hotfix scroll chart, kondisional) diselidiki secara terpisah dan **tidak diterapkan** karena masalah tidak dapat direproduksi - bukti lengkap di §4.

- No Git/VCS operations were performed.
- No new dependencies were added.
- No unrelated scope was changed.
- No unsupported project claims were introduced.

---

## 1. Konteks Proyek

| Item | Nilai (dari inspeksi aktual, bukan asumsi) |
|---|---|
| Project root | `/home/z/my-project/v11-work/portfolio-astro` |
| Astro (terpasang di node_modules) | **7.4.4** (`package.json` mendeklarasikan `^7.4.2`) |
| Content API | **Content Layer API modern**: `glob` loader (`astro/loaders`) + `src/content.config.ts`; entry ID = nama file (tanpa `.md`) |
| Package manager | npm (`package-lock.json` ada; tidak diubah) |
| Route pattern | `/work/[slug]` - `params.slug = entry.id` (Astro entry ID); entri `RESERVED` tidak pernah menghasilkan rute (filter di `getStaticPaths`, perilaku V8.1 dipertahankan) |
| Jumlah entri work | 3: `aqi-cirebon` (IN PROGRESS, routeable), `saham-indonesia` (RESERVED), `ideas-in-progress` (RESERVED) |
| Zod | 4.6.7 (bundel Astro) |
| Test infra existing | `node:assert` + runner mini (`scripts/test-lab-core.mjs`, 54 test) - tanpa framework; V12.2 mengikuti pola yang sama |

## 2. Baseline (sebelum perubahan)

| Command | Exit | Hasil aktual |
|---|---|---|
| `node scripts/test-lab-core.mjs` | 0 | 54 PASS, 0 FAIL |
| `npm run build` | 0 | 11 page(s) built (`/`, `/about`, `/archive` + 3 sub, `/connect`, `/lab`, `/lab/methodology`, `/work`, `/work/aqi-cirebon`) |

Existing failures: **tidak ada**. Baseline sehat.

**Workspace protection:** snapshot non-Git lengkap (tanpa `node_modules`/`dist`/`.astro`) dibuat di `../snapshots/v12.2-pre/` SEBELUM edit pertama. Semua file yang dimutasi dapat dipulihkan dari sana. Negative test memakai salinan `/tmp` + restore terverifikasi (§9).

## 3. Hasil investigasi dan keputusan desain

### 3.1 Tiga konsep identifier (dipisahkan secara eksplisit)

| Konsep | Nilai aktual | Peran |
|---|---|---|
| Astro entry ID | nama file (`aqi-cirebon`) | identitas loader; **satu-satunya dasar URL** `/work/<entry.id>` |
| `contentId` | `aqi-cirebon`, `saham-indonesia`, `ideas-in-progress` | identifier semantik stabil untuk relasi; lowercase kebab-case; mengubahnya = migrasi relasi |
| URL slug | = entry.id | strategi route existing TIDAK diubah; penambahan contentId tidak mengubah slug publik mana pun |

### 3.2 Taxonomy design (single source of truth)

Definisi kanonis hidup di **satu file**: `src/data/taxonomy.js` (diimpor schema, halaman, validator, dan test - tidak ada duplikasi definisi).

- `DISCIPLINES`: data-analysis, software-engineering, artificial-intelligence, database-systems, iot (kandidat spec; dipakai sesuai bukti).
- `TECHNOLOGIES`: python, javascript, astro, chart-js, node-js, postgresql, sql, pandas. **`node-js` ditambahkan** karena pipeline ingestion berjalan di Node.js (terverifikasi `package.json` engines/scripts) - kandidat spec disesuaikan dengan project, bukan klaim baru.
- `STATUS_OPTIONS` + makna: PUBLISHED (selesai + halaman publik), IN PROGRESS (aktif + halaman publik), RESERVED (placeholder jujur, tanpa rute publik - perilaku V8.1), ARCHIVED (ditarik dari rute). Nilai existing (`IN PROGRESS`, `RESERVED`) tidak diremap.

### 3.3 Source of truth teknologi: `stack` vs `technologies`

Keputusan (spec §6: pilih satu authoritative; jika stack dipertahankan, tetapkan sebagai legacy display):

- **`stack` = legacy display data** (V6.7 kompatibel): label yang dirender kartu & meta halaman **dipertahankan byte-per-byte** (`"Python"`, `"pandas (learning)"`, `[]` untuk slot reserved). Output tampilan existing tidak berubah (dibuktikan di §10).
- **`technologies` = lapisan semantik kanonis**, diisi HANYA dari bukti implementasi dalam repo: `aqi-cirebon` → `javascript, astro, chart-js, node-js` (pipeline `.mjs` Node, halaman Astro, `chart.js` dependency + dynamic import). Python/pandas TIDAK diangkat ke taxonomy karena tidak ada `.py`/usage Python yang dapat diverifikasi di implementasi (dicek: `find *.py` kosong).
- Divergensi label ini **disengaja dan didokumentasikan**, bukan kelalaian: dua field tidak diedit terpisah (technologies tervalidasi terhadap taxonomy; stack beku sebagai display). Rekomendasi rekonsiliasi label di §12 (butuh keputusan pemilik karena mengubah teks yang terlihat).

### 3.4 Requiredness field editorial (keputusan hardened spec)

Dipilih **optionality universal** untuk `context/objectives/methodology/findings/limitations`, dengan alasan bukti: dua dari tiga entri adalah slot RESERVED tanpa implementasi - memaksa context/objectives membuatnya terlihat seragam secara palsu. Field hanya diisi bila faktanya ada (di aqi-cirebon: context + methodology + limitations; objectives/findings sengaja TIDAK diisi - objectives sudah tercantum sebagai prosa body "Yang sedang dikerjakan" sehingga menambah field akan menduplikasi narasi, dan temuan final memang belum ada sesuai deskripsi/nada jujur entri).

### 3.5 Kebijakan relasi

- **Directionality**: satu arah, dari `relatedIds` entri ke `contentId` target; tidak ada reciprocity otomatis.
- **Visibility policy** (didefinisikan + diuji): target relasi harus routeable (`PUBLISHED`/`IN PROGRESS`). Target `RESERVED`/`ARCHIVED` ditolak (`RELATION_TARGET_NOT_ROUTEABLE`) karena tidak pernah punya rute publik → pasti dead link.
- **Keputusan isi aktual**: seluruh entri existing memakai `relatedIds: []` (default eksplisit dalam schema; kosong bermakna "tidak ada proyek terkait" - migrasi sudah direview penuh). Alasan jujur: satu-satunya entri lain adalah slot RESERVED yang memang tidak boleh dijadikan target; membuat relasi ke teknologi yang sama saja dilarang spec. Section "Proyek Terkait" data-driven dan otomatis muncul begitu ada relasi valid; saat ini tidak dirender (sesuai aturan spec: section tanpa relasi tidak dirender).

## 4. V12.2a - Chart Scroll Hotfix: **NOT APPLIED - ISSUE NOT REPRODUCED**

Investigasi mandiri SEBELUM V12.2, sesuai urutan spec. Kesimpulan: tidak ada bukti scroll terhambat; tidak ada perubahan spekulatif yang diterapkan.

Bukti (kode + browser):

1. **Chart.js v4.6.1 tidak bisa memblok scroll**: seluruh listener (termasuk `touchstart`/`touchmove`) dipasang dengan `{ passive: true }` - `node_modules/chart.js/dist/chart.js` ≈ baris 3306: `const eventListenerOptions = supportsEventListenerOptions ? { passive: true } : false;`. Listener passive tidak dapat `preventDefault()`.
2. **Tidak ada pembatasan CSS**: `getComputedStyle(canvas).touchAction === "auto"` (desktop & mobile) - tidak ada `touch-action` yang membatasi di seluruh stylesheet project.
3. **Tidak ada handler sentuh kustom**: grep seluruh `src/scripts/lab/` hanya menemukan listener `change`/`click` pada select & tombol retry - tidak ada `touchmove`/`pointermove`/`drag`/`preventDefault` kustom.
4. **Config chart tidak mendefinisikan `events` kustom** (`chart-config.js`): default Chart.js berlaku; usulan `events: ['mousemove','mouseout','click']` justru akan MENGHAPUS handling touchstart/touchmove yang selama ini bekerja - perubahan spekulatif, tidak diterapkan.
5. **Selector `.lab-chart-canvas-wrap canvas`**: override `width/height !important` (lab.css:317) dievaluasi = pola terdokumentasi Chart.js untuk kontainer tinggi-tetap dengan `responsive:true` + `maintainAspectRatio:false`. Browser membuktikan sizing benar (canvas 1013×390 di dalam wrap 1043×420 @1280px; 275×278 @390px) → **dipertahankan**.
6. **Overlay tersembunyi tidak menghalangi pointer**: markup memulai `hidden`; aturan global `[hidden] { display: none !important; }` (`src/styles/global/arcade-v4.css:8`, dimuat di semua halaman via global.css) mengalahkan `.lab-chart-overlay { display:flex }` → browser: `computed display: none` (desktop & mobile). Kandidat fix overlay dari spec tidak diperlukan.
7. **Browser (Agent Browser, Chromium headless)**: scroll roda dengan kursor DI TENGAH canvas berjalan bebas (scrollY 1327→1708→2106, +381/+398 px per wheel, tidak ada resistance); tidak ada console error; chart, tabel, overlay-ready state bekerja.

Keterbatasan verifikasi: emulasi sentuh (touch-drag) asli tidak tersedia di headless browser, sehingga verifikasi scroll sentuh level perangkat tidak dapat dilakukan. Namun tiga mekanisme penyebab scroll-block (JS preventDefault, CSS touch-action, overlay) masing-masing dibuktikan tidak ada secara langsung - bukan inferensi.

## 5. Implementasi V12.2 - file yang dibuat/diubah (inventaris dari diff snapshot, bukan Git)

| # | File | Status | Alasan |
|---|---|---|---|
| 1 | `src/data/taxonomy.js` | **CREATE** | definisi taxonomy kanonis tunggal (disciplines, technologies, status, helper format/normalisasi id) |
| 2 | `src/data/content-integrity.js` | **CREATE** | validator lintas-entri deterministik + formatter error actionable + gate `assertWorkIntegrity` |
| 3 | `scripts/test-content-integrity.mjs` | **CREATE** | unit test validator (pola harness existing `test-lab-core.mjs`; tanpa framework baru) |
| 4 | `src/content.config.ts` | MODIFY | tambah field kontrak (contentId, status→enum kanonis, context, objectives, methodology, findings, limitations, disciplines, technologies, relatedIds) + superRefine per-entri (self-reference, duplikat dalam array); SEMUA field & skema narrative existing dipertahankan; loader/collection name tidak diubah |
| 5 | `src/content/work/aqi-cirebon.md` | MODIFY | frontmatter: contentId, disciplines, technologies, context, methodology (7 butir), limitations (6 butir); **body Markdown tidak berubah satu byte pun** |
| 6 | `src/content/work/saham-indonesia.md` | MODIFY | frontmatter: contentId saja (belum ada implementasi - tidak ada yang boleh diklaim); body utuh |
| 7 | `src/content/work/ideas-in-progress.md` | MODIFY | frontmatter: contentId saja; body utuh |
| 8 | `src/pages/work/[slug].astro` | MODIFY | integrity gate di `getStaticPaths` (seluruh entri, sebelum filter RESERVED); resolusi relasi via satu `getCollection` + Map (urutan relatedIds dipertahankan); section editorial kondisional (Konteks/Metodologi/Temuan/Keterbatasan) dengan HTML semantik; chips taxonomy dari label kanonis; "Proyek Terkait" reuse `ProjectCard` (tanpa implementasi kartu kedua); skrip/motion existing tidak berubah |
| 9 | `src/pages/work/index.astro` | MODIFY | panggilan gate yang sama (menutup kasus "tidak ada entri routeable"); perilaku render tidak berubah |
| 10 | `src/styles/work.css` | MODIFY | blok V12.2: `.case-section-title`, `.case-context*`, `.case-structured`, `.case-steps`, `.case-notes`, `.case-taxonomy*`, `.case-chip-list`, `.case-related*`; token existing, tanpa animasi baru; responsive ≤700px 1 kolom |

Tidak ada file lain yang berubah (diverifikasi `diff -rq` terhadap snapshot; `package.json` + `package-lock.json` **identik** dengan snapshot).

## 6. Basis bukti per entri

### `aqi-cirebon` (IN PROGRESS - satu-satunya case study routeable)
- **Fields added**: contentId, disciplines (`data-analysis`), technologies (`javascript, astro, chart-js, node-js`), context, methodology[7], limitations[6].
- **Evidence basis**: context - data DLH 2021–2025, SO₂/NO₂ µg/Nm³, 23 lokasi, dua tahap (halaman methodology + dataset JSON); methodology - langkah aktual pipeline V12.0 (`scripts/data/build-cirebon-dataset.mjs`: header validation, agregasi per lokasi/tahun/tahap, ISPU P.14/2020 via modul bersama, null dipertahankan, 0,0 valid, duplikat dicatat, validasi dataset build-time, Chart.js dynamic-import + `spanGaps:false`); limitations - butir yang SAMA dan diverifikasi test `test-lab-core.mjs` (6 grup 0,0 di 2023; duplikat NO₂ 2024 DISUKCAPIL; 2025 parsial 4 lokasi; hanya SO₂/NO₂; basis waktu tahap ≠ 24 jam; tanpa GPS/metode).
- **Relationship decisions**: `relatedIds` kosong (tidak ada entri routeable lain; relasi ke RESERVED dilarang policy).
- **Content preservation**: description, stack, image, link, kicker, narrative 3 scene, dan SELURUH body Markdown byte-identik dengan snapshot.
- **Uncertainties**: teks body (ditulis era V7) menyebut "2023 punya banyak nilai kosong", sementara ingest terverifikasi V12.0 menunjukkan 2023 = enam kelompok 0,0 (nol valid) dan kasus missing adalah NO₂ 2024. Body adalah narasi proses pemilik situs dan **sengaja tidak diubah** (spec melarang menulis ulang narasi); field limitations terstruktur memuat fakta terverifikasi. Dicatat sebagai editorial note, non-blocking.

### `saham-indonesia` (RESERVED) & `ideas-in-progress` (RESERVED)
- **Fields added**: contentId saja.
- **Evidence basis**: keduanya placeholder jujur tanpa implementasi; menambah disciplines/technologies/methodology/findings berarti mengarang. Deskripsi rencana tetap di description (bukan diklaim selesai).
- **Relationship decisions**: kosong. (Catatan: deskripsi ideas-in-progress memang menyebut "harga barang atau saham", tetapi target `saham-indonesia` berstatus RESERVED → relasi apa pun akan melanggar visibility policy dan menghasilkan dead link.)
- **Content preservation**: body + seluruh field existing utuh; slot tetap dirender ReservedCard, tanpa rute publik.

## 7. Integrity validator

- **Lokasi**: `src/data/content-integrity.js` (murni, deterministik; urutan issue disortir; tanpa timestamp; input tidak dimutasi).
- **Per-entri** (schema Zod, `content.config.ts`): format contentId, enum status, membership taxonomy, format target relasi, self-reference, duplikat dalam satu array.
- **Lintas-entri** (validator): `CONTENT_ID_MISSING`, `CONTENT_ID_DUPLICATE`, `CONTENT_ID_FORMAT`, `CONTENT_ID_AMBIGUOUS` (normalisasi trim+lowercase), `STATUS_INVALID`, `TAXONOMY_INVALID`, `RELATION_UNKNOWN_TARGET`, `RELATION_SELF`, `RELATION_DUPLICATE`, `RELATION_TARGET_NOT_ROUTEABLE`.
- **Format error** sesuai contoh spec (Entry/Field/Invalid value/Code/Reason/Fix) - terbukti pada output build negatif (§9).
- **Build integration path**: `assertWorkIntegrity()` dipanggil di `getStaticPaths()` `src/pages/work/[slug].astro` DAN di frontmatter `src/pages/work/index.astro` → berjalan pada production build (terbukti: build negatif gagal exit 1) dan pada request dev. Tidak ditempatkan hanya di satu template; tidak diduplikasi logikanya.

## 8. Hasil pengujian (command aktual + exit status)

| Fase | Command | Exit | Hasil |
|---|---|---|---|
| Baseline test | `node scripts/test-lab-core.mjs` | 0 | 54 PASS, 0 FAIL |
| Baseline build | `npm run build` | 0 | 11 pages |
| Unit test baru | `node scripts/test-content-integrity.mjs` | 0 | **23 PASS, 0 FAIL** (koleksi valid, duplikat id, unknown target, self-relation, duplikat relasi, format id, empty relatedIds, taxonomy invalid, status invalid, kebijakan visibilitas RESERVED/ARCHIVED, id ambigu, determinisme, non-mutasi, format error informatif, gate throw/lolos) |
| Build pasca-implementasi | `npm run build` | 0 | 11 pages, rute identik baseline |
| **Negative build test** | `npm run build` (dengan `relatedIds: ["missing-project"]` disuntikkan ke aqi-cirebon.md) | **1** | Gagal dengan `[CONTENT INTEGRITY] … RELATION_UNKNOWN_TARGET … Fix: …` (bukti di §9) |
| Build setelah restore | `npm run build` | 0 | 11 pages - pemulihan terverifikasi non-Git (`diff` terhadap salinan `/tmp` + file kembali tanpa `relatedIds`) |
| Regresi test lab | `node scripts/test-lab-core.mjs` | 0 | 54 PASS, 0 FAIL (tidak ada perubahan angka/kalkulasi; V12.2 tidak menyentuh logic AQI) |

Tidak ada typecheck/lint script terpisah di package.json (hanya `dev/build/preview/astro/data:build/test:lab`) - yang relevan dijalankan semua, tidak ada script dikarang.

## 9. Bukti negative build test (verbatim)

```
Work collection tidak valid (detected via work/[slug].astro getStaticPaths):

[CONTENT INTEGRITY]
Entry: aqi-cirebon
Field: relatedIds
Invalid value: "missing-project"
Code: RELATION_UNKNOWN_TARGET
Reason: Tidak ada entri work dengan contentId "missing-project".
Fix: Perbaiki atau hapus target; relasi menunjuk contentId, bukan title/URL.
```
`npm run build` exit **1** → file dipulihkan dari salinan → build exit **0**. Tidak ada fixture atau source rusak yang tertinggal.

## 10. Verifikasi browser (Agent Browser / Chromium headless, dev server Astro `astro dev --background`)

Routes tested (HTTP 200 semua): `/`, `/work`, `/work/aqi-cirebon`, `/lab`, `/lab/methodology`, `/about`, `/connect`, `/archive`, `/archive/play`, `/archive/credentials`, `/archive/off-screen`.

**Case Study `/work/aqi-cirebon` (1280×900 & 390×844):**
- Section dirender sesuai data: `Konteks`, `Metodologi` (ol, 7 langkah), `Keterbatasan` (ul, 6 butir), `Klasifikasi` (chips `DISCIPLINES`: Data Analysis; `TECHNOLOGIES`: JavaScript, Astro, Chart.js, Node.js). `Temuan` tidak dirender (findings memang tidak diklaim) - section kondisional bekerja.
- **Output existing dipertahankan**: meta STACK tetap `Python`, `pandas (learning)`; judul/kicker/cover/narrative/body/CTA identik; heading hierarchy benar (h1 → h2 per section, termasuk h2 narrative & body).
- Mobile 390×844: tanpa horizontal overflow (`scrollWidth 390 = innerWidth`), chips wrap normal (`flex-wrap: wrap`), semua section terlihat.

**/work index**: 1 kartu proyek + 2 ReservedCard; kartu menaut `/work/aqi-cirebon`; stack chip kartu tidak berubah; 2 filter button utuh.

**/lab (regresi chart)**: canvas terisi (275×278 @390px), overlay `display:none` saat hidden, tabel data 4 baris, tanpa console error.

**Isolasi chart.js (produksi)**: chunk `chart.*.js` terpisah; homepage chunk (`…1mCWMMKz.js`) = 0 referensi chart; work chunk (`…CDAf2BoU.js`) = 0; hanya lab chunk (`…DBHboYbz.js`) yang memuat dynamic import. Fresh-session homepage visit: **0 request chart** (diverifikasi via network log; log sebelumnya yang memuat chart berasal dari akumulasi navigasi ke /lab pada sesi yang sama).

**Keyboard/a11y**: chips bukan elemen interaktif (li non-klik, tanpa affordance klik); kartu terkait (bila kelak ada) reuse ProjectCard dengan `<a>` keyboard-accessible + focus-within style existing; tidak ada nested interactive; tidak ada JavaScript baru di sisi klien.

**V12.2a** - bukti scroll di §4 (desktop wheel-over-canvas bebas; mobile tanpa overflow; touch-drag fisik = keterbatasan terdokumentasi).

## 11. Checklist acceptance criteria (Bagian 12 spec)

| # | Kriteria | Status |
|---|---|---|
| 1 | Konten existing utuh & dirender | ✅ (browser + build + diff snapshot) |
| 2 | Schema work jelas/konsisten/tervalidasi | ✅ (build + 23 unit test) |
| 3 | 3 entri Markdown dimigrasikan | ✅ (§6) |
| 4 | Taxonomy kanonis konsisten | ✅ (single source; schema+UI+test satu definisi) |
| 5 | Relasi tervalidasi deterministik | ✅ (validator + negative build) |
| 6 | Case Study menampilkan konten aktual, metadata, kartu terkait | ✅ - kartu terkait data-driven; section tidak dirender saat relasi kosong sesuai aturan spec (kondisi isi saat ini: tidak ada relasi valid yang mungkin - §3.5) |
| 7 | Methodology & Limitations AQI faktual | ✅ (semua butir terverifikasi test/data) |
| 8 | Narrative, cards, metadata, links, route kompatibel | ✅ (§10) |
| 9 | V12.2a diverifikasi terpisah | ✅ (§4 - NOT APPLIED, bukan diabaikan) |
| 10 | Test/build/regresi dijalankan & dilaporkan dari hasil aktual | ✅ (§8) |
| 11 | Tanpa framework/dependency/redesign yang tidak perlu | ✅ (manifest identik) |
| 12 | Tanpa technical debt baru tanpa penjelasan | ✅ (§12) |

## 12. Technical debt (task-introduced + catatan)

No known task-introduced technical debt was identified. (Pernyataan ini TIDAK berarti seluruh proyek bebas technical debt.)

Item non-blocking yang didokumentasikan sebagai keputusan/keterbatasan:

| Deskripsi | Lokasi | Dampak | Blocking? | Rekomendasi | Target versi |
|---|---|---|---|---|---|
| Divergensi label `stack` (legacy display: "Python", "pandas (learning)") vs `technologies` kanonis (JavaScript/Astro/Chart.js/Node.js) | aqi-cirebon.md frontmatter; render di kartu & meta | Kedua field menjawab pertanyaan berbeda; tidak ada auto-sync agar label tampilan tidak berubah diam-diam | Non-blocking | Rekonsiliasi label stack oleh pemilik situs (mengubah teks terlihat → butuh keputusan eksplisit) | V12.3+ |
| Prosa body aqi-cirebon (era V7) menyebut 2023 "banyak nilai kosong"; ingest terverifikasi menunjukkan 2023 = 0,0 valid (missing aktual: NO₂ 2024) | src/content/work/aqi-cirebon.md body | Narasi proses vs fakta ingest - keduanya tampil; field limitations terstruktur memuat fakta | Non-blocking | Pemilik situs dapat menyunting prosa body saat research update (rewrite narasi di luar scope V12.2) | V12.3+ |
| `DATA.projects` di `src/data/content.js` = sumber re-render filter klien yang menduplikasi field display koleksi (pra-existing, tidak disentuh) | src/data/content.js | Dua sumber display (existing sejak V7.2) | Non-blocking (pra-existing) | Sinkronisasi otomatis build-time bila kelak menjadi beban | V13+ |
| Mekanisme relasi terkirim tanpa relasi aktif (semua `relatedIds: []` - kondisi isi yang jujur) | content/work/*.md | Section terkait belum terlihat di produksi sampai entri routeable kedua ada | Non-blocking | Tambahkan relasi substantif saat entri berikutnya dirilis | V12.3+ |

## 13. Keterbatasan pengujian yang tidak dapat diverifikasi

- **Touch-drag scroll fisik** pada perangkat sentuh nyata (headless tidak meniru gesture sentuh level OS). Mekanisme penyebab scroll-block masing-masing dibuktikan tidak ada (§4 poin 1–3).
- **Screen reader** end-to-end tidak diuji; diverifikasi via struktur semantik (article/section/h2/ol/ul, aria-labelledby, role="list") dan kontras token existing.
- **prefers-reduced-motion**: tidak ada animasi baru yang ditambahkan (CSS blok V12.2 bebas transition/animation), sehingga tidak ada permukaan reduced-motion baru yang perlu diuji.

## 14. Verdict

**READY FOR USER REVIEW.** Seluruh mandatory acceptance criteria terpenuhi dengan bukti; tidak ada blocker; tidak ada Git/VCS operation; tidak ada dependency baru; rute, konten, dan perilaku existing dipertahankan (dibuktikan browser + build + diff snapshot); validator terbukti menolak konten invalid pada production build path.
