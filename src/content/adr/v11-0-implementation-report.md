---
adrId: "v11-0-implementation-report"
versionTag: "V11.0"
sequenceOrder: 7
title: "V11.0 Implementation Report: The Curtain Pattern"
summary: "Refaktor arsitektur pembuka dari modal dialog V9.1 menjadi Curtain Pattern dekoratif non-blocking pada halaman utama."
category: "visual-and-webgl-architecture"
recordType: "implementation"
recordStatus: "active-contract"
targetRoutes: ["/"]
relatedWorkIds: []
keyMetrics:
  - label: "Reported Desktop LCP"
    value: "328"
    unit: "ms"
    evidenceSection: "§A Executive Summary"
  - label: "Reported Mobile LCP"
    value: "1456"
    unit: "ms"
    evidenceSection: "§A Executive Summary"
  - label: "Architectural Criteria"
    value: "25/25"
    unit: "criteria"
    evidenceSection: "§A Status acceptance"
provenance:
  sourcePath: "V11.0_IMPLEMENTATION_REPORT.md"
  sourceFilename: "V11.0_IMPLEMENTATION_REPORT.md"
  sourceSha256: "c0775bb61e1ff525d69e14e9f109196942c5cfcc47474d7cb58a45af63181f23"
  sourceBytes: 22370
  sourceWordCount: 3240
  sourceLineCount: 396
  normalizedContentSha256: "0dd4af658dcfb011f31f69be3719b08c60f0754d5108d16b32c7c6232536f445"
  normalizationCount: 39
---
# V11.0 IMPLEMENTATION REPORT - THE CURTAIN PATTERN

**Proyek:** The Living Archive - Personal Portfolio
**Tahap:** V11.0 - Opening Architecture Refactor (Opening V9.1 → Curtain Pattern)
**Dokumen acuan:** `upload/PROMPT_EKSEKUSI_V11.0_CURTAIN_PATTERN.md`
**Mode:** EXECUTION MODE (audit → implementasi → pengujian → perbaikan → laporan)
**Status akhir:** SELESAI - lihat §L Final Verdict

---

## A. Executive Summary

### Apa yang berubah
Opening V9.1 (dialog `<dialog id="archive-opening">` + `showModal()` yang
berperan sebagai **gerbang halaman** selama ±4,5 detik) dihapus seluruhnya dan
digantikan **Curtain Pattern**: lapisan dekoratif sinematik yang menjadi bagian
komposisi Hero tanpa pernah menghalangi apa pun.

### Mengapa
Spek V11.0 (§2) menegaskan filosofi baru: *"The curtain reveals the identity,
not the existence of the content."* Pada arsitektur lama, Hero disembunyikan
sampai Opening selesai (FOUC guard `opening-armed` + `prepareHeroState` yang
meng-set opacity 0). Data riset V10.4/V10.5 membuktikan pendekatan modal tidak
pernah memenuhi LCP ≤ 2.500 ms maupun HIR < 3.000 ms.

### Hasil akhir (lab, median 3 run)
| Metric | Baseline V10.5 | V11.0 | Perubahan |
|---|---:|---:|---|
| Desktop LCP | 5.557 ms | **328 ms** | **−94%** |
| Mobile LCP | 3.677 ms | **1.456 ms** | **−60%** |
| Desktop Score | 69 | **100** | +31 |
| Mobile Score | 88 | **98** | +10 |
| First-readable hero (D) | 4.889 ms | **288 ms** | −94% |
| First-readable hero (M) | 4.865 ms | **213 ms** | −96% |
| CTA HIR (D) | ≈4,5–5,7 s (modal) | **100 ms** | −98% |
| Search focus/typing HIR (D) | ≈4,8 s (diblok modal) | **421 ms** | −91% |

### Status acceptance
- **Arsitektural A01–A25: 25/25 PASS** (bukti per kriteria di §I).
- **Performance**: LCP ≤ 2.500 ms (desktop & mobile) ✅; First-readable
  < 3.000 ms ✅; HIR < 3.000 ms ✅; CLS/TBT dilaporkan aktual di §H.
- **Regression**: seluruh fitur existing teruji, perilaku halaman non-home
  terbukti identik baseline via A/B (§I).

---

## B. Architecture Changes

### Struktur
- `BaseLayout.astro`: kehilangan dialog Opening + FOUC inline script
  (`opening-armed`, `__openingSafety`). Layout kini 100% bebas state opening.
- `index.astro` (homepage saja): mem-mount `<Curtain />` + stylesheet
  `curtain.css`. Harness eksperimen V10.4/V10.5 dihapus.

### Ownership (spek §14.6)
| Resource | Owner |
|---|---|
| Curtain markup | `Curtain.astro` (homepage saja) |
| Curtain CSS | `curtain.css` (diimpor index.astro) |
| Curtain timeline/state/cleanup | `curtain-controller.js` |
| Skip listener | `curtain-controller.js` |
| Hero entrance dekorasi | `home.js` (`prepareHeroState` + `animateHeroIn`) |
| Section motion | `global.js` (`initSectionMotion`, dipanggil langsung di boot) |
| Navigation lifecycle | `core.js` + `astro:before-swap` dispose Curtain |
| Page transition | `page-transitions.js` (guard dialog dihapus) |

### Lifecycle
- **Initial load**: bootPage → renders → interactions → motion gate
  (`prepareHeroState → initSectionMotion → animateHeroIn → initCurtain`).
  Semua independen; tidak ada yang menunggu completion entitas lain (spek §3.8).
- **`astro:before-swap`**: satu listener module-level (guard `beforeSwapBound`)
  memanggil `dispose()` instance aktif → timeline mati, listener lepas,
  Curtain+Skip kembali hidden sebelum DOM ditukar.
- **`astro:after-swap`**: teardown standar core.js (`cleanupMotionRegistry`);
  handler after-swap khusus opening V9.1 DIHAPUS (tidak ada lagi dialog).
- **Re-entry**: kebijakan V9.1 dipertahankan - sekali per sesi via
  `sessionStorage['fip-opening-seen']` (kunci lama dipakai ulang, tanpa
  storage baru). Reload & navigasi keluar-masuk tidak me-replay (T7 PASS).

### Hero
- `prepareHeroState()` **tidak lagi menyembunyikan apa pun**: hanya menyiapkan
  scanline (dekoratif, pointer-events none) + state awal dekorasi (pixel
  frame, floating tools, sticker, atlas). Headline/tagline/deskripsi/CTA/
  search/eyebrow/note/scroll-cue berada pada posisi final sejak HTML render.
- `animateHeroIn()` kini HANYA menganimasikan elemen dekoratif; tidak ada
  teks/CTA/search di timeline; dipanggil langsung di boot tanpa menunggu
  Opening; tetap aman bila Curtain tidak pernah aktif.

### Curtain
- Root `#v11-curtain` `display:none` default; aktivasi hanya via `.is-active`
  yang dipasang controller SETELAH setup sukses (progressive enhancement).
- `pointer-events: none` seluruh lapisan; circular wipe hanya pada
  `.v11-clip` (dekorasi), tidak pernah menyentuh body/html/hero.
- Z-index **80** (hasil audit): di atas konten (≤40), di bawah Companion (90),
  Header (95), Toast (120), PageTransitionOverlay (9998).
- Frame mengikuti header + batas hero aktual via CSS var yang diukur live
  (`--v11-frame-top/bottom`), dihapus bersih saat dispose.
- Komposisi mobile (≤980px): bracket + ruler + corner label + **counter mini**
  di TL label; ritual ring & ticker disembunyikan karena fixed overlay akan
  menutup teks hero yang memenuhi viewport (keputusan dijustifikasi spek §11.5).

---

## C. File Changes

| File | Action | Description |
|---|---|---|
| `src/components/home/Curtain.astro` | CREATE | Markup dekoratif Curtain (frame, ritual, ticker) + Skip di luar root `aria-hidden` |
| `src/styles/curtain.css` | CREATE | Default hidden, pointer pass-through, z 80, responsive, reduced motion |
| `src/scripts/curtain-controller.js` | CREATE | State machine, GSAP context, skip, exactly-once completion, dispose, late-window, session policy |
| `src/layouts/BaseLayout.astro` | MODIFY | Hapus dialog Opening V9.1 + FOUC inline script + `__openingSafety` |
| `src/pages/index.astro` | MODIFY | Hapus 2 harness eksperimen + 2 import CSS eksperimen; tambah `<Curtain />` + import `curtain.css` |
| `src/styles/global.css` | MODIFY | Hapus seluruh Section 17 (CSS Opening V9.1, baris 1942–2243) |
| `src/scripts/global.js` | MODIFY | Hapus `initArchiveOpening` (413 baris) + handler after-swap dialog; gate baru: `prepareHeroState → initSectionMotion → animateHeroIn → initCurtain`; import `initCurtain` |
| `src/scripts/home.js` | MODIFY | Refactor `prepareHeroState` (tanpa hidden state) + `animateHeroIn` (dekorasi saja) + komentar kontrak V11.0 |
| `src/scripts/page-transitions.js` | MODIFY | Hapus guard `dialog.open` V9.1; rapid-click guard tetap; komentar diperbarui |
| `src/styles/page-transitions.css` | (komentar) | Tidak diubah isinya; catatan z-index lama mengacu dialog - catatan historis dipertahankan |
| `src/scripts/v105-experiments/` (5 file) | DELETE | Kode eksperimen V10.5 keluar dari source aktif (sesuai kondisi awal spek §1.1; harness-nya memang dihapus) |
| `src/styles/v105-experiments.css` | DELETE | idem |
| `src/styles/opening-prototype-variants.css` | DELETE | Harness eksperimen V10.4 |
| `v11-research/` | CREATE | Artefak riset V11.0 (baseline shots, tools, lighthouse 12 run, HIR, hasil verify) |

**Tidak disentuh**: `core.js`, `work.js`, `about.js`, `archive.js`, `connect.js`,
`case-narrative.js`, `generative-ambient.js`, `page-transitions.css`,
`Header/Footer/PageTransitionOverlay`, seluruh konten/aset, `package.json`,
`bun.lock`, konfigurasi Astro/vercel.

---

## D. Removed V9.1 Dependencies

| Item | Lokasi lama | Verifikasi tidak dipakai fitur lain |
|---|---|---|
| `<dialog id="archive-opening">` + 4 layer markup | BaseLayout.astro | grep `archive-opening` di `src/` → hanya komentar historis |
| Inline FOUC script (`opening-armed`, `__openingSafety`) | BaseLayout.astro `<head>` | idem |
| `initArchiveOpening()` + ticker/dust/asset tracker/exit | global.js 573–984 | hanya dipanggil dari gate boot (diganti) |
| CSS `.archive-opening*`, `.opening-*`, FOUC guard, reduced-motion + mobile block | global.css Section 17 | `.is-wiping` generik tidak ada di luar opening (page-transitions tidak memakainya) |
| Guard `dialog.open` | page-transitions.js | dialog sudah tidak ada; rapid-click guard dipertahankan |
| Handler after-swap dialog/safety/armed | global.js | semua state yang dibersihkannya telah tiada |
| `prepareHeroState` menyembunyikan konten | home.js | dipanggil ulang dengan kontrak baru (dekorasi saja) |
| Harness eksperimen V10.4/V10.5 | index.astro + global.js | file eksperimen ikut keluar dari source aktif; folder riset & laporan Markdown DIPERTAHANKAN sebagai dokumentasi |

**Cara memastikan**: grep menyeluruh (`archive-opening`, `opening-armed`,
`__openingSafety`, `initArchiveOpening`, `opening-`, `v105`) → sisa kemunculan
hanya komentar dokumentasi; build sukses tanpa unresolved import; smoke test
semua 9 rute 200 OK; 0 console error.

---

## E. New Curtain Implementation

- **Component** (`Curtain.astro`): root `aria-hidden` murni dekoratif (tanpa
  link/input/button/fokusable); wrapper `.v11-clip` satu-satunya penerima
  clip-path; Skip native `<button type="button" hidden>` DI LUAR root dengan
  accessible name "Skip opening animation".
- **Stylesheet** (`curtain.css`): `display:none` default + `.is-active`;
  `[hidden] { display:none !important }` agar Skip mustahil tampil prematur;
  `pointer-events:none` + Skip `pointer-events:auto`; tanpa grain/vignette
  duplikat (sitewide grain sudah ada - keputusan §11.6/§7.2); safe-area inset
  pada Skip; media query mobile & reduced motion.
- **Controller** (`curtain-controller.js`):
  - State machine: `INACTIVE → INITIALIZING → ACTIVE → COMPLETING →
    COMPLETED`, plus `DISPOSED` dari jalur navigasi/error (transisi satu arah).
  - `initCurtain()` self-guarding: elemen ada? reduced motion? GSAP ada?
    sesi sudah lihat? performance.now() > 1.000 ms? scrollY > 0? fokus di
    hero/header? document.hidden? → salah satu ya = kunjungan tanpa Curtain.
  - Duplicate prevention: instance tunggal module-level; panggilan ulang
    mengembalikan dispose yang sama.
  - Timeline (±2,6 s total): T1 bracket stagger + ruler self-draw (0–0,75s) →
    T2 corner label → T3 ritual ring scale-in + counter 000→100 (1,4s) +
    status INITIALIZING→CALIBRATING→READY → ticker berganti via `tl.call`
    (**tanpa setInterval**) → T4 circular wipe `.v11-clip` 150%→0% (0,7s
    power3.inOut) + frame fade → T5 `complete()`.
  - `complete()` idempoten = satu-satunya jalur keluar (skip, natural,
    reduce-flip); menghapus is-active, CSS var, blur fokus bila perlu,
    `context.revert()` (inline style termasuk clip-path ikut bersih).
  - Resource: `gsap.context(fn, root)`; listener skip & MQL dilepas
    eksplisit + dilacak registry; **nol setTimeout/setInterval**.
- **Skip**: muncul hanya saat ACTIVE (`hidden` ↔ class `is-visible`), area
  sentuh ≥44px, focus-visible outline, Enter/Space native, tidak pernah
  memindahkan fokus secara paksa, blur saat disembunyikan.
- **Completion & cleanup**: exactly-once; setelah selesai tidak ada inline
  clip-path/CSS var/class/state tersisa (T1c/T3 diverifikasi otomatis).

---

## F. Hero Refactor

- `prepareHeroState()`: scanline + gsap.set dekorasi SAJA. Tabel initial
  state (spek §6.1) - semua `visible/usable` sejak initial render:
  headline ✅ deskripsi ✅ actions ✅ tail ✅ CTA ✅ search ✅
  (terverifikasi otomatis T1a: keempatnya visible + CTA hit-testable saat
  Curtain baru aktif).
- `animateHeroIn()`: pixel-frame, floating tools, sticker, scanline sweep,
  atlas path draw + node fade. Tanpa opacity-zero pada konten utama, tanpa
  menunda CTA/search, tanpa dependency completion.
- Initial rendering: konten utama ada di HTML statis hasil Astro (bukan
  `<template>`, bukan JS-render); `curl` homepage memuat `#hero-title`,
  `#hero-subtitle`, `#hero-cta`, `#search-input`.
- Accessibility: semantic HTML Hero tidak berubah; heading h1 tunggal;
  label search tetap `sr-only` + combobox pattern; decorative hanya
  `aria-hidden`.

---

## G. Lifecycle

- **Initial load**: controller diinisialisasi dari motion gate (setelah DOM
  siap, tanpa `window.onload`/network idle). Jendela aktivasi 1.000 ms sejak
  navigasi (performance.now()) + guard interaksi.
- **Astro navigation**: dispose pada `astro:before-swap` (listener module
  sekali); `cleanupMotionRegistry` tetap jaring pengaman; Curtain hanya ada
  di homepage - halaman lain tidak punya elemen (T10).
- **Cleanup**: satu `dispose()` idempoten untuk context GSAP, listener,
  state DOM; tanpa timer manual sama sekali.
- **Re-entry**: sekali per sesi (kunci lama dipakai ulang); reload/Back/
  Forward/navigasi internal tidak replay (T7); tanpa storage baru.
- **Duplicate prevention**: instance tunggal + latch epoch bootPage.

---

## H. Performance Results

**Lingkungan**: Chrome for Testing **156.0.8078.47**, Lighthouse **13.6.0**,
Node v24.22.1, `astro build` + `astro preview :4321` (V11) vs `:4322`
(baseline zip V10.5-final), desktop 1440×900 throttling `provided` CPU×1,
mobile 412×823 @DPR 1.75 Slow 4G (RTT 150 ms / 1.638,4 kbps / latency
562,5 ms) CPU×4 - konfigurasi identik riset V10.3–V10.5. **3 run per sel,
median + rentang.** JSON mentah: `v11-research/lighthouse/` (12 file).

### Lighthouse (median, rentang dalam kurung)
| Metric | Baseline V10.5 | V11.0 | Change |
|---|---:|---:|---|
| Desktop LCP | 5.557 ms (5.329–5.988) | **328 ms (309–595)** | −94% |
| Mobile LCP | 3.677 ms (1.557–3.677) | **1.456 ms (1.444–1.597)** | −60% |
| Desktop FCP | 755 ms | 328 ms | −57% |
| Mobile FCP | 1.557 ms | 1.456 ms | −6% |
| Desktop CLS | 0,0009 | 0,0116 | +0,0107 (lihat catatan) |
| Mobile CLS | 0,0003 | 0,0091 | +0,0088 (lihat catatan) |
| Desktop TBT | 0 ms | 0 ms | = |
| Mobile TBT | 393 ms | 143 ms | −64% |
| Desktop Score | 69 | **100** | +31 |
| Mobile Score | 88 | **98** | +10 |
| LCP element | `p.hero-description#hero-subtitle` | `p.hero-description#hero-subtitle` | identik |

**Catatan CLS**: nilai absolut tetap jauh di bawah ambang "good" (≤0,1).
Penaikan kecil berasal dari fakta bahwa font-swap dan entrance dekorasi kini
TERLIHAT (sebelumnya terjadi di balik dialog solid yang menyembunyikan
semuanya). Tidak ada layout shift dari Curtain: `position:fixed` tanpa
dimensi flow, dan perubahan visibility Curtain tidak menggeser Hero.

**Catatan baseline mobile LCP rentang lebar (1.557–3.677)**: run pertama
baseline mobile mendapat kondisi lab lebih menguntungkan; median tetap
dilaporkan apa adanya (tidak ada run dibuang).

### First Readable Hero + HIR (input nyata; `v11-research/hir*.json`)
| Metric | Baseline V10.5 | V11.0 | Target |
|---|---:|---:|---|
| First-readable headline (D) | 4.889 ms | **288 ms** | <3.000 ✅ |
| First-readable headline (M) | 4.865 ms | **213 ms** | <3.000 ✅ |
| CTA click HIR (D) | ≈4,5–5,7 s* | **100 ms** | <3.000 ✅ |
| CTA click HIR (M) | ≈4,5 s* | **100 ms** | <3.000 ✅ |
| Search focus HIR (D) | 4.793 ms (diblok modal) | **421 ms** | <3.000 ✅ |
| Search focus HIR (M) | 4.784 ms (diblok modal) | **201 ms** | <3.000 ✅ |
| Search typing HIR (D/M) | 4.793 / 4.784 ms | **421 / 201 ms** | <3.000 ✅ |
| Scroll HIR (D/M) | 384 / 267 ms | 402 / 293 ms | ✓ setara |

\* Pengukuran HIR-CTA baseline pada protokol titik-waktu ini berhenti di
2.000 ms sehingga tercatat `-1` (modal menutup ±4,5 s); referensi riset
V10.5 (M3, metodologi sama): CTA HIR desktop 5.684 ms. Pencarian fokus
programatik oleh tooling (Playwright `.focus()` CDP) dapat mem-bypass
modal dan menghasilkan angka palsu 363 ms - dilaporkan agar transparan;
angka yang dipakai adalah pengukuran perilaku platform nyata.

### Batas akurasi pengukuran
- First-readable via polling rAF → resolusi ±16 ms (bukan ±5 ms).
- HIR titik-waktu resolusi 100 ms (granularitas probe).
- **FIELD DATA: NOT AVAILABLE / NOT TESTED** - seluruh angka adalah lab data.

---

## I. Regression Results

Format: Test | Desktop | Mobile | Expected | Actual | Status
(21 test otomatis - bukti `v11-research/verify/results.json`, suite
`v11-research/tools/verify.mjs` - **21/21 PASS**)

| Test | Desktop | Mobile | Expected | Actual | Status |
|---|---|---|---|---|---|
| Hero initial visibility saat curtain aktif (T1a) | ✅ | ✅ | PASS | PASS | **PASS** |
| Curtain aktif + Skip tampil (T1b) | ✅ | ✅ | PASS | PASS | **PASS** |
| Natural completion + tanpa inline sisa (T1c) | ✅ | ✅ | PASS | PASS | **PASS** |
| Console 0 error natural run (T1d) | ✅ | ✅ | PASS | PASS | **PASS** |
| CTA click saat curtain → navigasi /work (T2a) | ✅ | ✅ | PASS | PASS | **PASS** |
| Search focus saat curtain (T2b) | ✅ | ✅ | PASS | PASS | **PASS** |
| Search typing saat curtain (T2c) | ✅ | ✅ | PASS | PASS | **PASS** |
| Scroll saat curtain, tanpa body lock (T2d) | ✅ | ✅ | PASS | PASS | **PASS** |
| Keyboard Tab → search, tanpa trap (T2e) | ✅ | ✅ | PASS | PASS | **PASS** |
| Skip via keyboard Enter (T2f) | ✅ | ✅ | PASS | PASS | **PASS** |
| Pointer pass-through elementFromPoint + header di atas curtain (T2g) | ✅ | - | PASS | PASS | **PASS** |
| Skip klik + stale click idempoten (T3) | ✅ | ✅ | PASS | PASS | **PASS** |
| Skip menjelang completion (T3b) | ✅ | ✅ | PASS | PASS | **PASS** |
| Reduced motion: curtain+skip hidden, hero interaktif (T4) | ✅ | ✅ | PASS | PASS | **PASS** |
| JS disabled: curtain+skip display:none, hero terbaca (T5) | ✅ | ✅ | PASS | PASS | **PASS** |
| Late JS 1,6 s + user interaksi → tanpa late surprise (T6) | ✅ | ✅ | PASS | PASS | **PASS** |
| Session: reload & re-entry tidak replay (T7) | ✅ | ✅ | PASS | PASS | **PASS** |
| Resize mid-animation: tanpa error/overflow (T8) | ✅ | - | PASS | PASS | **PASS** |
| Page transition home→about→home + rapid nav + overlay reset (T9) | ✅ | - | PASS | PASS | **PASS** |
| Halaman lain bebas elemen curtain (T10) | ✅ | ✅ | PASS | PASS | **PASS** |
| Mobile visual: counter mini, bracket aman, SKIP thumb-zone | - | ✅ | PASS | PASS (screenshot `verify/shots/mobile-600ms.png`) | **PASS** |

**A/B halaman non-home (baseline vs V11, probe identik)**: `/archive/play`
(Deck Scroll Narrative - pinned, docHeight 900, scrollY 0 setelah wheel di
KEDUA versi), `/archive` (15 kartu, tautan pertama hit-testable di KEDUA
versi), Companion (exists, hidden default, z 90), error 403 GitHub API
muncul di KEDUA versi (rate-limit eksternal, pre-existing). **Nol regresi.**

Perilaku yang diuji manual/instrumented tanpa test terpisah: focus indicator
Skip (`:focus-visible` CSS, native), Escape (tanpa efek - bukan modal,
sesuai desain), visibilitychange (timeline GSAP global pause/resume mekanisme
V6.4 yang sudah ada; tidak ada timer yang menumpuk karena controller bebas
timer), oryentasi (resize test mencakup perubahan viewport; safe-area inset
Skip via `env()`).

NOT TESTED: perangkat touch fisik (gesture); field data CWV.

---

## J. Known Limitations

1. **Ritual ring & ticker tidak tampil di mobile (≤980px)** - fixed overlay
   akan menutup teks hero yang memenuhi viewport pada 390–412px; identitas
   dipertahankan lewat bracket + ruler + counter mini di corner label
   (keputusan eksplisit sesuai spek §11.5; bukan keterbatasan teknis).
2. **CLS naik ke 0,0116 (dari 0,0009)** - masih "good" (≤0,1); disebabkan
   font-swap/entrance dekorasi kini terlihat sejak first paint (sebelumnya
   tersembunyi di balik dialog). Tidak ada shift dari Curtain sendiri.
3. **Jendela aktivasi 1.000 ms** - pada loadsangat lambat, Curtain sah
   dilewati demi usability (perilaku sesuai spek §9.6; teramati 1× pada
   suite berbeban tinggi, ditangani test T8 dengan retry yang jujur).
4. **Perilaku reduce-flip mid-run** mengandalkan pause global GSAP yang
   sudah ada (V6.4) + MQL listener controller; tidak diuji dengan flip
   preferensi OS otentik (hanya emulasi konteks Playwright).
5. **Touch fisik & field CWV belum diuji** (lab only).
6. **Error 403 GitHub API di /archive** - pre-existing (rate-limit sandbox),
   terbukti identik di baseline A/B; di luar scope V11.0.

---

## K. Technical Debt Review

- **Orphaned listener?** TIDAK - listener skip + MQL dilepas di `dispose()`
  dan dilacak registry; before-swap dispose menjamin navigasi bersih.
- **Orphaned timer?** TIDAK - controller tidak membuat satu pun
  setTimeout/setInterval (counter & ticker via timeline GSAP).
- **Duplicate initialization?** TIDAK - instance tunggal + latch epoch.
- **Global variable baru?** TIDAK - hanya modul-level `active` +
  `beforeSwapBound` di dalam modul controller (bukan window.*).
- **Unused CSS?** TIDAK - seluruh CSS opening lama dihapus (302 baris);
  `curtain.css` seluruh selector dipakai; grep memastikan tidak ada
  selector curtain yang tidak terpakai.
- **Dependency baru?** TIDAK - package.json & bun.lock tidak berubah
  (lighthouse dipasang sebagai tooling pengukuran global, bukan dependency
  proyek).
- **Code duplication?** Minimal - pola frame/bracket sadar merupakan
  ekstraksi identitas, ditulis ulang dengan prefix `v11-` (tidak menyalin
  markup/CSS V9.1).
- **Known accessibility issue?** TIDAK yang baru: tanpa focus trap, tanpa
  aria-modal, tanpa live region berisik; Skip native button + accessible
  name; konten utama tidak pernah disembunyikan.
- **Performance regression?** TIDAK - semua metrik membaik kecuali CLS
  kecil (dijelaskan di §H/§J, tetap "good").
- **Keterbatasan mobile?** Ya, satu: ring/ticker disembunyikan demi
  keterbacaan (§J.1) - keputusan desain terdokumentasi, bukan defect.

---

## L. Final Verdict

**V11.0 COMPLETE - ALL ACCEPTANCE CRITERIA PASSED**

- Arsitektur A01–A25: **25/25 PASS** (pemetaan per kriteria: A01–A05 → T1a,
  A06–A07 → T2d/T5, A08 → T2g, A09 → screenshot §visual + T2g, A10 → T5,
  A11 → T4, A12 → T2f/T3, A13 → T7/duplicate-guard, A14–A17 → T1c/T3 + zero
  timer by construction, A18 → grep + T1c, A19 → T2a/T9, A20 → A/B §I,
  A21 → T2e/T4 + struktur semantik utuh, A22 → T1c noInlineClip + screenshot
  1.2s→3.2s tanpa snap, A23 → package.json utuh, A24 → daftar file §C,
  A25 → T1d/T9 0 console error).
- Performance: Desktop LCP 328 ms ✅, Mobile LCP 1.456 ms ✅,
  First-readable 288/213 ms ✅, HIR maksimum 421 ms ✅.
- Regression: 21/21 otomatis + A/B non-home identik baseline.
- No Git operation, no deployment, no V11.1 work dimulai.

**FINAL STATUS TARGET TERCAPAI: V11.0 COMPLETE - CURTAIN PATTERN IMPLEMENTED
- HERO IMMEDIATELY AVAILABLE - NO BLOCKING INTERACTION - REGRESSION VERIFIED
- READY FOR USER REVIEW.**
