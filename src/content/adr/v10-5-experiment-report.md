---
adrId: "v10-5-experiment-report"
versionTag: "V10.5"
sequenceOrder: 4
title: "Comparative Opening Exploration (V10.5 Experiment Report)"
summary: "Eksperimen komparatif tiga varian pembuka (A.1 Native Dialog Translucent, A.2 Custom Overlay Non-Modal, B.1 Shortened Solid) terhadap LCP dan Hero Interaction Ready."
category: "diagnostics-and-performance"
recordType: "experiment"
recordStatus: "superseded"
targetRoutes: ["/"]
relatedWorkIds: []
keyMetrics:
  - label: "Variant A.1 Desktop LCP"
    value: "3181"
    unit: "ms"
    evidenceSection: "§1 Ringkasan Eksekutif"
  - label: "Variant A.2 Desktop LCP"
    value: "3307"
    unit: "ms"
    evidenceSection: "§1 Ringkasan Eksekutif"
  - label: "Variant B.1 Desktop LCP"
    value: "3954"
    unit: "ms"
    evidenceSection: "§1 Ringkasan Eksekutif"
  - label: "Regression Checks Passed"
    value: "60/60"
    unit: "checks"
    evidenceSection: "§1 Ringkasan Eksekutif"
provenance:
  sourcePath: "V10.5_EXPERIMENT_REPORT.md"
  sourceFilename: "V10.5_EXPERIMENT_REPORT.md"
  sourceSha256: "fb1e25ac8032954fa657ade4edf9d429c3b754e10bc4774f11b7f372fb1c4ab9"
  sourceBytes: 23622
  sourceWordCount: 3624
  sourceLineCount: 392
  normalizedContentSha256: "5d07c09faa1a458722f53e831c05f948404c4a2fad7a13094e0a11938c1036e0"
  normalizationCount: 66
---
# V10.5 EXPERIMENT REPORT - FINAL OPENING EXPLORATION

**Proyek:** The Living Archive - Personal Portfolio
**Tahap:** V10.5 - Comparative Opening Exploration (eksperimen terisolasi, NON-SHIPPING)
**Dokumen acuan:** `upload/V10.5_PROMPT_EKSPERIMEN_OPENING.md`
**Status akhir:** SELESAI (3 dari 4 eksperimen diuji penuh; B.2 = NOT TESTED sesuai prioritas spek)

---

## 1. Ringkasan Eksekutif

1. **Tiga varian eksperimen selesai diimplementasikan dan diuji penuh** (A.1 Native
   Dialog translucent + early reveal; A.2 Custom Overlay non-modal + early reveal;
   B.1 Shortened Solid). Semua varian OFF secara default; baseline tidak berubah.
2. **Desktop LCP membaik bermakna pada semua varian** (median 3 run): base 5.492 ms →
   A.1 **3.181 ms (−42%)**, A.2 **3.307 ms (−40%)**, B.1 **3.954 ms (−28%)**. Skor
   performa desktop naik 69 → 79/79/75.
3. **Mobile LCP praktis tidak berubah** pada A.1 (3.270 ms, −1,5%) dan B.1 (3.286 ms,
   −1,0%); **A.2 justru sedikit lebih buruk** (3.764 ms, +13,4%; TBT 316 vs 151) -
   biaya JS overlay + manajemen inert terasa pada simulasi CPU 4×.
4. **Konten hero terbaca jauh lebih cepat pada varian translusen** (probe objektif):
   headline terlihat base 5.040 ms vs A.1 3.109 ms / A.2 2.939 ms; subtitle terbaca
   5.533 ms vs 3.567 / 3.436 ms. B.1 menutup seluruh opening lebih cepat sehingga
   headline terlihat 3.375 ms tanpa translusensi.
5. **Hero Interaction Ready (HIR):** A.2 paling cepat (CTA klik nyata 3.180 ms,
   search focus 3.141 ms - interaksi terjadi SEMENTARA overlay masih tampil, model
   non-modal). A.1 = setelah dialog tertutup (±5,3–5,8 s; konsekuensi modal native
   yang dihormati). base 5,7 s; B.1 3,9 s.
6. **Re-occlusion snap V10.4 diperbaiki** - A.1/A.2 tidak memakai selector
   `:not(.is-wiping)`; pasangan screenshot pra-wipe/wipe membuktikan transisi mulus.
7. **Regresi 60/60 PASS** (15 pemeriksaan × 4 varian, termasuk reduced motion,
   session no-replay, mobile overflow, console 0 error, V10.1 page transition).
8. **Identitas terjaga** di semua varian (M5: IDENTITY PRESERVED); A.1/A.2 mengubah
   nuansa dari "arsip tersegel" menjadi "arsip kaca beku"; B.1 terasa lebih rapat
   tetapi tetap ritual, bukan loading screen.
9. **Rekomendasi V11.0:** A.1 `RECOMMENDED FOR V11.0` (kandidat utama);
   A.2 `PROMISING - NEEDS FURTHER TESTING`; B.1 `PROMISING - NEEDS FURTHER TESTING`
   (opsi pengganti minimal-risiko); B.2 `NOT TESTED`. Rincian di §12.

---

## 2. Kondisi Baseline dan Lingkungan Uji

| Komponen | Nilai aktual | Catatan |
|---|---|---|
| Chrome for Testing | **156.0.8078.47** | identik V10.4 → lintas-tahap sebanding |
| Lighthouse | **13.6.0** | identik V10.4 |
| Playwright | chromium.launch → Chrome 156 + CDP | untuk probe/HIR/regresi/screenshot |
| Node | v24.22.1 | - |
| Server | `astro build` + `astro preview` :4321 | pola V10.4 |
| Desktop config | 1440×900, `--screenEmulation.disabled`, throttling `provided`, CPU ×1 | identik V10.4 |
| Mobile config | 412×823 @DPR 1.75, simulate Slow 4G (RTT 150 ms / 1638.4 kbps / latency 562.5 ms), CPU ×4 | identik V10.4 |
| Run | 3× per varian per konfigurasi, median + semua run terekam | JSON mentah disimpan |
| Benchmark index | 904–2.430 (fluktuatif; tercatat per run) | mesin sandbox |

**Baseline sanity check (pra-eksperimen, 1 run desktop):** LCP **5.273 ms** (referensi
V10.4: 5.276 ms), FCP 514 ms, CLS 0,0015, TBT 0, skor 71, elemen LCP
`main#main > section.hero > div.hero-copy > p#hero-subtitle` - cocok dengan referensi;
tidak ada kondisi berhenti §2.4 yang terpenuhi. (`v10.5-research/lighthouse/sanity-desktop-1.json`)

**Baseline hasil final (3 run, median):** desktop LCP 5.492 / FCP 736 / CLS 0,0015 /
TBT 0 / skor 69; mobile LCP 3.320 / FCP 1.442 / CLS 0,0001 / TBT 151 / skor 90.
Elemen LCP desktop konsisten `p#hero-subtitle`; mobile konsisten
`dialog#archive-opening > … > p#opening-label` (sama seperti V10.4).
Per-run lengkap: `v10.5-research/lighthouse/per-run-all.txt`.

---

## 3. Audit Implementasi Aktual (pra-perubahan)

Audit penuh 12 poin (alur, state, konstanta, lokasi pemanggilan `animateHeroIn`,
CSS penyembunyi, overlay/backdrop, timing wipe, skip, sesi, reduced motion,
integrasi V10.1, race condition) tersedia di:

**`v10.5-research/audit/AUDIT_NOTES.md`** - setiap klaim menyertakan path + baris.

Temuan kunci yang menentukan desain eksperimen:

- `initArchiveOpening` (`src/scripts/global.js:601-984`): TOTAL 3500 ms, EXIT 1000 ms,
  REVEAL_AT 0,65 s di dalam wipe → `animateHeroIn` pertama kali ±4,15 s setelah
  showModal; subtitle terbaca ±4,87 s (sesuai temuan V10.4).
- `prepareHeroState` (`src/scripts/home.js:379-408`) menyembunyikan hero via
  `gsap.set` opacity 0 / yPercent 115 - akar render delay.
- Harness V10.4 memakai selector `:not(.is-wiping)` - inilah mekanisme
  re-occlusion snap; V10.5 sengaja TIDAK meniru pola itu.
- Tooling lengkap tersedia; lingkungan identik V10.4.

---

## 4. Hipotesis Eksperimen

| Varian | Hipotesis | Konstanta aktual dipakai |
|---|---|---|
| **A.1** Native Dialog + Translucent + Early Reveal | `showModal()` native dengan ::backdrop 65% + hero reveal ±2,0 s mengurangi waktu tunggu perseptual tanpa menghilangkan struktur opening | backdrop rgba(248,250,252,0.65) (berbasis bukti V10.4: single-layer 65% menjaga ritual terbaca); reveal 2000 ms; TOTAL 3500 / EXIT 1000 (baseline) |
| **A.2** Custom Overlay non-modal + Translucent + Early Reveal | Overlay elemen biasa memberi fleksibilitas interaksi: hero dapat DIPAKAI sementara overlay masih tampil (fase 2 non-modal, klik/scroll menembus) | overlay div 65% + transition background-color; reveal 2000 ms; fase 1 `inert` native pada header/main/footer; TOTAL 3500 / EXIT 1000 |
| **B.1** Shortened Solid | Opening solid dengan timeline dipendekkan proporsional mempercepat akses konten tanpa translusensi | counter 0,4 s+1,0 s; skip 0,9 s; ticker 0,6 s; TOTAL **1.800 ms**; EXIT **800 ms**; reveal @0,5 s wipe → total natural ±2,6 s (rentang spek 2,5–3,0 s); disulih dari audit (bukan disalin mentah dari draft spek) |
| **B.2** Localized Aperture | (opsional, prioritas rendah spek §4 B.2) | **NOT TESTED** - hanya dikerjakan setelah A.1/A.2/B.1 tuntas; waktu anggaran dipakai untuk menuntaskan pengukuran penuh 3 varian utama sesuai mandat "jangan mengurangi kualitas pengujian A.1/A.2/B.1 demi B.2" |

---

## 5. Perubahan Teknis dan File yang Disentuh

### 5.1 File baru (eksperimen, semua NON-SHIPPING)

| File | Isi |
|---|---|
| `src/scripts/v105-experiments/v105-core.js` | Mesin opening terparameterisasi (bypass paths, ticker, dust, choreography, counter, exit) - adaptasi `initArchiveOpening` dengan registry tracking yang sama |
| `src/scripts/v105-experiments/experiment-a1-dialog.js` | Varian A.1 (dialog native; early reveal 2.000 ms) |
| `src/scripts/v105-experiments/experiment-a2-overlay.js` | Varian A.2 (overlay div non-modal; clone struktur dialog; dialog asli dihapus dari DOM; inert fase 1; escape keydown dengan guard input) |
| `src/scripts/v105-experiments/experiment-b1-short-opening.js` | Varian B.1 (timeline pendek solid) |
| `src/scripts/v105-experiments/index.js` | Dispatcher `installV105(variant, …)` |
| `src/styles/v105-experiments.css` | CSS varian: compositing A.1 (tanpa `:not(.is-wiping)`), overlay A.2 (pointer-events model non-modal + exception FOUC guard), B.1 tanpa override visual |
| `v10.5-research/**` | Seluruh artefak riset (audit, lighthouse, screenshots, interaction-readiness, visual-assessments, regression, scripts, preflight-snapshots) |

### 5.2 File lama yang disentuh (integrasi minimal, §3.2)

| File | Perubahan | Tanpa parameter |
|---|---|---|
| `src/pages/index.astro` | (1) import `v105-experiments.css`; (2) satu inline script `?v105=` yang men-set `html[data-v105]` + `window.__V105_VARIANT` hanya untuk nilai valid A1/A2/B1 | tidak ada attribute/flag; CSS varian tidak punya selector yang cocok; perilaku = baseline |
| `src/scripts/global.js` | Satu hook di boot gate `motion`: bila `window.__V105_VARIANT` ter-set → dynamic import dispatcher eksperimen; bila gagal → fallback baseline. | flag null → jalur baseline persis kode lama; **chunk eksperimen tidak pernah dimuat** (diverifikasi: 0 request mengandung "v105" pada kunjungan normal) |

File TIDAK disentuh sama sekali: `home.js`, `core.js`, `BaseLayout.astro`, `Hero.astro`,
`global.css`, `page-transitions.js`, seluruh halaman lain, seluruh konten/aset.
Snapshot pra-perubahan: `v10.5-research/preflight-snapshots/` (manifest menyertai).

### 5.3 Pemulihan

Tidak ada pemulihan yang diperlukan: tidak ada file produksi yang diubah isinya
selain dua hook minimal di atas yang MEMANG harus tetap ada agar varian dapat
diaktifkan untuk ditinjau. Keduanya inert tanpa parameter dan didokumentasikan
sebagai integrasi sementara yang dapat dihapus pada V11.0.

---

## 6. Hasil Pengukuran M1–M6

### M1 - Lab Performance (Lighthouse 13.6.0; 3 run/konfigurasi; median)

**Desktop (1440×900, no-throttle):**

| Metrik | base | A.1 | A.2 | B.1 |
|---|---:|---:|---:|---:|
| LCP | 5.492 ms | **3.181 ms** (−42,1%) | **3.307 ms** (−39,8%) | **3.954 ms** (−28,0%) |
| FCP | 736 ms | 647 ms | 517 ms | 955 ms |
| CLS | 0,0015 | 0,0001 | 0,0001 | 0,0001 |
| TBT | 0 ms | 0 ms | 0 ms | 0 ms |
| Score | 69 | 79 | 79 | 75 |
| Elemen LCP | `p#hero-subtitle` | `p#hero-subtitle` | `p#hero-subtitle` | `p#hero-subtitle` |

**Mobile (412×823 DPR 1.75, Slow 4G, CPU ×4):**

| Metrik | base | A.1 | A.2 | B.1 |
|---|---:|---:|---:|---:|
| LCP | 3.320 ms | 3.270 ms (−1,5%) | 3.764 ms (**+13,4%**) | 3.286 ms (−1,0%) |
| FCP | 1.442 ms | 1.450 ms | 1.452 ms | 1.451 ms |
| CLS | 0,0001 | 0,0001 | 0,0001 | 0,0003 |
| TBT | 151 ms | 128 ms | **316 ms** | 239 ms |
| Score | 90 | 91 | 83 | 87 |
| Elemen LCP | `p#opening-label` | campuran (`p#hero-subtitle`/`p#opening-label`/`#hero-eyebrow`) | `p#hero-subtitle`/`#hero-eyebrow` | campuran |

Interpretasi jujur: perbaikan LCP adalah **fenomena desktop** (di lab no-throttle,
waktu paint hero-subtitle didominasi elementRenderDelay choreography; reveal lebih
awal langsung memindahkan LCP). Pada mobile tersimulasi, LCP didominasi jaringan/
CPU sehingga hanya A.2 yang menunjukkan regresi nyata (+13%, TBT +165 ms) akibat
biaya JS modul overlay. **Lab data, bukan field data.**

### M2 - First-Visible Hero Content

Ringkasan (detail + metodologi di `v10.5-research/interaction-readiness/M2-M3-summary.md`):

| Timestamp sejak navigasi (desktop) | base | A.1 | A.2 | B.1 |
|---|---:|---:|---:|---:|
| Headline terlihat (opacity ≥50%, ≥50% karakter, visibility OK) | 5.040 ms | 3.109 ms | **2.939 ms** | 3.375 ms |
| Headline uncovered (hit-test) | 5.040 ms | 5.321 ms* | **2.939 ms** | 3.375 ms |
| Subtitle terbaca | 5.533 ms | 3.567 ms | **3.436 ms** | 3.827 ms |
| Mobile headline terlihat | 4.852 ms | 2.754 ms | **2.735 ms** | 3.037 ms |

\* A.1: terlihat melalui backdrop sejak 3,1 s tetapi tetap tertutup dialog secara
hit-test sampai close (±5,3 s) - konsekuensi modal native yang disengaja.
Definisi ketat: elemen dengan opacity saja TIDAK dianggap terlihat (FOUC guard
`visibility:hidden` dan oklusi root ikut diperiksa - sesuai larangan spek M2).

### M3 - Hero Interaction Ready (input nyata via CDP)

| Aksi (desktop) | base | A.1 | A.2 | B.1 |
|---|---:|---:|---:|---:|
| CTA click → handler + navigasi /work | 5.684 ms | 5.755 ms | **3.180 ms** | 3.894 ms |
| Search focus → activeElement | 5.211 ms | 5.312 ms | **3.141 ms** | 3.619 ms |
| Scroll → scrollY berubah | 1.309 ms | 1.083 ms | **0.989 ms** | 1.411 ms |
| Skip close (opening-control) | 3.111 ms | 3.067 ms | 3.102 ms | **2.570 ms** |

Pembedaan wajib: **A.1 modal** - hero terlihat awal tetapi HIR hero = setelah close
(perilaku platform `showModal()`, tidak diakali). **A.2 non-modal** - fase 1 (0→2,0 s)
`inert` native karena konten belum terlihat; fase 2 interaksi penuh sementara overlay
masih tampak (CTA benar-benar menavigasi pada 3,18 s). Temuan lintas-varian: scroll
terjadi ±1,0–1,4 s di SEMUA varian termasuk baseline (wheel menembus ke dokumen;
Lenis men-scroll programatik) - perilaku baseline yang terverifikasi, bukan regressi.
Alasan kegagalan tiap percobaan terekam per attempt di JSON.

### M4 - Visual Readability

Sumber: screenshot aktual (48 file, akurasi frame ±3–6 ms, 0 console error).
Penilaian per momen: `v10.5-research/visual-assessments/M4-M5-visual-identity.md`.

- **A.1 @2,5 s: headline READABLE** di balik backdrop 65% sementara ritual tetap
  tajam (`A1-desktop-2-5s.png`). Subtitle READABLE @3,6 s.
- **A.2 @3,0 s: seluruh hero READABLE** sementara overlay masih tampil.
- **base: tidak ada konten hero sebelum ±5,0 s** (solid).
- **B.1: konten hero READABLE @2,6 s** (pasca-wipe) - via percepatan timeline.
- Ritual terbaca di semua varian (kontras aman pada 65%).

### M5 - Identity Preservation

| Varian | Klasifikasi |
|---|---|
| base | IDENTITY PRESERVED |
| A.1 | IDENTITY PRESERVED (nuansa: "arsip tersegel" → "arsip kaca beku") |
| A.2 | IDENTITY PRESERVED (compositing ekuivalen A.1; skip tanpa ring fokus) |
| B.1 | IDENTITY PRESERVED (ritme lebih rapat; tetap ritual, bukan loading screen) |

Bukti + alasan per aspek (bracket/ruler/ritual/ticker/wipe): dokumen M4-M5 di atas.

### M6 - Regression Matrix

**60/60 PASS** (15 pemeriksaan × 4 varian - termasuk sub-check 11b):

| Pemeriksaan | base | A.1 | A.2 | B.1 |
|---|---|---|---|---|
| 1 Opening render | PASS | PASS | PASS | PASS |
| 2 Counter | PASS | PASS | PASS | PASS |
| 3 Wipe start | PASS | PASS | PASS | PASS |
| 4 Wipe complete | PASS | PASS | PASS | PASS |
| 5 Hero settled | PASS | PASS | PASS | PASS |
| 6 Skip availability | PASS | PASS | PASS | PASS |
| 7 Skip close | PASS | PASS | PASS | PASS |
| 8 Escape close | PASS | PASS | PASS | PASS |
| 9 Focus management | PASS | PASS | PASS | PASS |
| 10 Session no replay | PASS | PASS | PASS | PASS |
| 11 Reduced motion (+11b hero) | PASS | PASS | PASS | PASS |
| 12 Mobile overflow | PASS | PASS | PASS | PASS |
| 13 Console errors | PASS | PASS | PASS | PASS |
| 14 V10.1 page transition | PASS | PASS | PASS | PASS |

Output: `v10.5-research/regression/matrix.txt`. Pemeriksaan yang BELUM dilakukan:
matriks pada konfigurasi mobile penuh (14×4 kedua) - mobile diuji pada butir 11/12
yang relevan perangkat; sisanya desktop (dinyatakan jujur, tidak diklaim lengkap).

---

## 7. Tabel Perbandingan Final (format spek §9 - data aktual)

| Metrik | Baseline | A.1 Native Dialog | A.2 Custom Overlay | B.1 Short Solid | B.2 Aperture |
|---|---:|---:|---:|---:|---:|
| Desktop LCP median | 5.492 ms | **3.181 ms** | 3.307 ms | 3.954 ms | - |
| Mobile LCP median | 3.320 ms | 3.270 ms | 3.764 ms | 3.286 ms | - |
| Desktop FCP median | 736 ms | 647 ms | 517 ms | 955 ms | - |
| Mobile FCP median | 1.442 ms | 1.450 ms | 1.452 ms | 1.451 ms | - |
| Desktop CLS median | 0,0015 | 0,0001 | 0,0001 | 0,0001 | - |
| Mobile CLS median | 0,0001 | 0,0001 | 0,0001 | 0,0003 | - |
| Desktop TBT median | 0 ms | 0 ms | 0 ms | 0 ms | - |
| Mobile TBT median | 151 ms | 128 ms | 316 ms | 239 ms | - |
| First-visible headline (D) | 5.040 ms | 3.109 ms | **2.939 ms** | 3.375 ms | - |
| First-readable headline (D) | 5.040 ms | 3.109 ms | 2.939 ms | 3.375 ms | - |
| First-readable subtitle (D) | 5.533 ms | 3.567 ms | **3.436 ms** | 3.827 ms | - |
| CTA HIR (D) | 5.684 ms | 5.755 ms* | **3.180 ms** | 3.894 ms | - |
| Search focus HIR (D) | 5.211 ms | 5.312 ms | **3.141 ms** | 3.619 ms | - |
| Scroll HIR (D) | 1.309 ms | 1.083 ms | **0.989 ms** | 1.411 ms | - |
| Readability (M4) | solid sampai ±5 s | headline 2,5 s | headline 2,5 s; hero penuh 3,0 s | hero 2,6 s | - |
| Identity preservation | PRESERVED | PRESERVED | PRESERVED | PRESERVED (ritme rapat) | - |
| Regression (M6) | 15/15 | 15/15 | 15/15 | 15/15 | - |

\* Definisi HIR A.1 (modal) tidak setara penuh dengan A.2 (non-modal) - lihat §6-M3;
perbandingan lintas-model diberi catatan, tidak dipaksakan setara (spek §9).

---

## 8. Screenshot Pendukung (dengan timestamp)

`v10.5-research/screenshots/desktop/` (36) dan `screenshots/mobile/` (12) + log
timestamp `log-*.json`. Momen kunci:

- `base-desktop-2-5s.png` - solid penuh, tanpa konten hero
- `A1-desktop-2-5s.png` / `A1-mobile-2-5s.png` - headline terbaca di balik backdrop 65%
- `A1-desktop-3-6s.png` vs `A1-desktop-4-2s.png` - bukti anti re-occlusion snap
- `A2-desktop-2-5s.png`, `A2-desktop-3s.png` - hero penuh saat overlay masih tampil
- `B1-desktop-1-2s.png` → `B1-desktop-2-6s.png` - ritual utuh → hero @2,6 s
- `*-desktop-6-2s.png` - settle identik semua varian

---

## 9. Keterbatasan Tool dan Validitas Pengukuran

1. **Offset boot modul ±0,3–1,0 s** pada `astro preview` sandbox menambah semua
   timestamp absolut; delta antar-varian tetap valid (offset sama).
2. **M2 via sampler rAF** (±16 ms), bukan ±5 ms - resolusi aktual dilaporkan,
   toleransi ±5 ms TIDAK diklaim.
3. **CTA click menyebabkan navigasi** sehingga satu run = satu keberhasilan;
   percobaan berulang dilakukan pada sesi terpisah per aksi.
4. **elementFromPoint bukan bukti interaktif** - itulah mengapa M3 memakai input
   CDP nyata; proxy hit-test hanya pelengkap dengan filter fase armed/inert.
5. Benchmark index sandbox fluktuatif (904–2.430); n=3 per sel; **median**
   digunakan, semua run mentah tersedia.
6. Field data / pengguna nyata **belum diuji** - semua angka adalah lab data.
7. Satu bug tool ditemukan dan diperbaiki saat pengukuran (verifikasi skip;
   guard `sawOpen`); hasil final dari run yang sudah benar; kejadian didokumentasikan.

---

## 10. Risiko dan Konsekuensi Aksesibilitas

| Varian | Risiko/konsekuensi | Mitigasi yang diterapkan |
|---|---|---|
| A.1 | Konten di belakang dialog modal tetap inert sampai close - hero terlihat tetapi tidak bisa dipakai ±2 s lebih lama | Dihormati sebagai perilaku platform (spek §4 A.1); diukur terpisah; tidak diakali |
| A.1/A.2 | Kontras teks hero di balik backdrop 65% | Terverifikasi READABLE via screenshot; ritual tetap kontras |
| A.2 | Fase 1 harus benar-benar non-interaktif meski belum terlihat | `inert` native pada header/main/footer (bukan aria-modal); dilepas tepat saat reveal |
| A.2 | Bukan modal → tidak boleh aria-modal/focus trap | Semantik non-modal jujur; fokus tidak dipindah otomatis; escape dengan guard input |
| A.2 | Scroll tidak dikunci fase 2 | Bagian dari model non-modal yang diuji; didokumentasikan |
| B.1 | Ritme lebih cepat berisiko kehilangan kesan ritual | M5: masih IDENTITY PRESERVED; nilai beat disulih dari audit, bukan disalin mentah |
| Semua | Focus management pasca-close | M6 #9 PASS: fokus jatuh ke BODY, tidak terjebak |

---

## 11. Status Eksperimen

| Varian | Status | Bukti inti |
|---|---|---|
| A.1 | SELESAI DIUJI | 6 run LH + 9 screenshot D + 6 screenshot M + probe D/M + HIR 4 aksi + regresi 15/15 |
| A.2 | SELESAI DIUJI | idem A.1 |
| B.1 | SELESAI DIUJI | idem A.1 |
| B.2 | **NOT TESTED** | opsional + prioritas rendah (spek §4 B.2); anggaran eksekusi diprioritaskan untuk pengujian penuh A.1/A.2/B.1 |

---

## 12. Rekomendasi Teknis untuk Keputusan V11.0

Urutan pertimbangan spek §10: correctness → accessibility → content visibility →
interaction availability → lab performance → identity → implementation cost.

| Varian | Status rekomendasi | Alasan utama | Trade-off / risiko | Pengujian lanjutan yang disarankan |
|---|---|---|---|---|
| **A.1 Native Dialog translucent + early reveal** | **RECOMMENDED FOR V11.0** | Perbaikan terbesar dengan biaya terkecil: LCP desktop −42%, skor +10; headline 2× lebih cepat terbaca; seluruh struktur & aksesibilitas opening baseline TIDAK berubah (hanya CSS compositing + satu timer reveal); modal native = inertness/fokus/escape dikelola platform; anti-snap terbukti; regresi 15/15 | mobile LCP netral (bukan perbaikan); konten hero tidak interaktif sampai close (konsekuensi modal); nuansa visual berubah tipis | Field data pasca-rilis; uji kontras di tema layar redup; pertimbangkan menaikkan/menurunkan reveal 2,0 s |
| A.2 Custom Overlay non-modal | PROMISING - NEEDS FURTHER TESTING | HIR terbaik (interaksi saat overlay tampil; CTA 3,18 s) dan headline tercepat 2,94 s - model pengalaman paling agresif | mobile LCP +13% & TBT 2× (biaya JS); kompleksitas tertinggi (clone DOM, inert 2 fase, escape manual); risiko pemeliharaan | Optimasi biaya modul (tanpa clone, markup khusus); a11y audit screen reader penuh; uji konflik scroll/gesture mobile |
| B.1 Shortened Solid | PROMISING - NEEDS FURTHER TESTING | Paling sederhana (hanya timing); total 2,6 s; LCP desktop −28%; identitas utuh; zero translucency risk | kemenangan LCP terkecil; subtitle tetap terbaca ±3,8 s; ritme rapat perlu persetujuan artistik | Uji variasi durasi (2,5/2,8/3,0 s) + persetujuan visual pengguna |
| B.2 Localized Aperture | NOT RECOMMENDED untuk siklus ini | Tidak diuji - tidak ada data | - | Kerjakan hanya jika V11.0 masih butuh alternatif |

**Kombinasi potensial untuk V11.0** (di luar mandat V10.5, perlu approval):
B.1 timeline (2,6 s) + early reveal A.1 di 2,0 s berpotensi menggabungkan
close tercepat dengan reveal terlihat - satu varian baru, uji ulang penuh.

---

## 13. Inventaris File

**Dibuat (eksperimen):** §5.1 - 6 file di `src/scripts/v105-experiments/` +
`src/styles/v105-experiments.css`.
**Dibuat (riset):** `v10.5-research/{audit,baseline,lighthouse,screenshots,
interaction-readiness,visual-assessments,regression,scripts,preflight-snapshots}/`
(24 JSON Lighthouse + sanity, 48 screenshot + log, 20 JSON probe/HIR, matrix.txt,
5 dokumen analisis, 8 script riset, 3 snapshot + manifest).
**Diubah (integrasi sementara terdokumentasi):** `src/pages/index.astro`
(2 blok ber-komentar `[V10.5 TEMPORARY EXPERIMENT HARNESS, NON-SHIPPING]`),
`src/scripts/global.js` (1 hook `V10.5 INTEGRATION HOOK` di boot gate).
**Dipulihkan:** tidak ada yang perlu dipulihkan (lihat §5.3).
**Perhatian pengguna:** keputusan V11.0 (§12); penghapusan harness + file
eksperimen bila keputusan sudah diambil; lintas-langkah Git adalah
tanggung jawab pengguna.

---

## 14. Pernyataan Batasan Kerja (konfirmasi eksplisit)

1. **Semua eksperimen OFF secara default.** Tanpa `?v105=A1|A2|B1`, tidak ada
   attribute, tidak ada flag, tidak ada dynamic import, dan
   **diverifikasi 0 request jaringan mengandung "v105"** pada kunjungan normal;
   smoke test baseline: dialog modal terbuka seperti baseline, tanpa overlay,
   tanpa inert, 0 console error (`v10.5-research/preflight-snapshots/smoke-results.txt`).
2. **Tidak ada operasi Git, version control, remote repository, maupun deployment
   yang dilakukan** - tidak ada perintah `git`/`gh`, tidak ada pembacaan/penulisan
   `.git`, tidak ada commit/branch/push/pull, tidak ada publikasi. Seluruh
   pengelolaan version control sepenuhnya tanggung jawab pengguna.
3. Perilaku default website tanpa parameter = baseline sebelum V10.5
   (baseline sanity Lighthouse cocok referensi V10.4: 5.273 vs 5.276 ms).
4. Tidak ada perubahan pada: identitas visual, font, palet warna, copywriting,
   layout/struktur section, Game Deck, Companion, Page Transition V10.1,
   WebGL Curl, magnetic interaction, audio, generative ambient.

---

*Laporan ini dihasilkan dari 25 run Lighthouse nyata (24 matriks + 1 sanity),
48 screenshot browser aktual, 20 JSON pengukuran interaksi/visibility,
60 pemeriksaan regresi otomatis, dan penilaian visual atas screenshot aktual.
Tidak ada angka yang diklaim tanpa run; B.2 dinyatakan NOT TESTED, bukan diisi perkiraan.*
