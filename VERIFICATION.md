# VERIFICATION · V10.4 OPENING DIAGNOSTIC & VISUAL PROTOTYPING

Laporan verifikasi mandiri sesuai `PROMPT_FINAL_V10.4_OPENING_LCP_DIAGNOSTIC.md`
(5 subfase: preflight audit, Opsi C diagnostic, restore V10.3, prototipe varian
V0-V4, evaluasi performa/visual + laporan). Mode eksekusi: **Experimental /
Non-Shipping** di feature branch `v10.4-lcp-diagnostic` (base `e3dbfb0`, V10.3
tervalidasi). Semua pengujian pada hasil build produksi via `astro preview`
(localhost:4321), Chrome for Testing **156.0.8078.47** headless (Playwright +
CDP; catatan: baseline V10.3 memakai Chrome 143 - V0 karenanya diukur ulang pada
branch ini sebagai pembanding adil), Lighthouse 13.6.0, viewport 1440x900
(desktop, no throttling) dan 412x823 @ DPR 1.75 (mobile, Simulated Slow 4G, CPU
x4). Laporan lengkap + data mentah: `V10.4_DIAGNOSTIC_REPORT.md`,
`v10.4-research/` (36 JSON Lighthouse, 48 screenshot, regression-results.txt,
AUDIT_NOTES.md, lighthouse-summary.txt).

## Summary Matrix

| Subfase | Status | Bukti |
| --- | --- | --- |
| 0 Preflight & Code Audit | PASS | AUDIT_NOTES.md - 9/9 pertanyaan `[VERIFIED]`, 0 perubahan kode pra-audit |
| 1 Opsi C Diagnostic | PASS | 6 run Lighthouse + 8 screenshot; LCP desktop 5.276 -> 485 ms (−91%); occlusion [VERIFIED]; kesimpulan template terisi; home.js dikembalikan byte-identik (diff vs `e3dbfb0` = 0) + smoke test opacity kembali 0 |
| 2 Prototype Variants | PASS | `src/styles/opening-prototype-variants.css` + harness `?opening-variant=v[0-4]` di homepage saja; verifikasi fungsional 5/5 (dialog bg + ::backdrop per variant sesuai spek; is-wiping override bekerja) |
| 3 Performance Testing | PASS | 36 run Lighthouse sesuai rencana spek (5 variant x 2 konfig x 3 run + 6 Opsi C); median + elemen LCP tiap run tercatat |
| 3 Visual Assessment | PASS | 48 screenshot browser aktual (akurasi frame ±5 ms via CDP); 9 penilaian visual berbantuan model visi (VLM) |
| 3 Regression Testing | PASS | 70/70 pemeriksaan lolos (14 pemeriksaan x 5 variant); 0 console error |

## Temuan utama

1. Opsi C membenarkan hipotesis occlusion namun **metric-only** (DO NOT SHIP).
2. Varian translusen V1-V4 **tidak mengubah LCP** (delta <= noise) - waktu
   paint teks hero dikendalikan choreography GSAP, bukan opasitas overlay.
3. Teks hero tak terlihat di mid-opening pada semua variant (hanya dekorasi
   statis yang tembus); V1 ≈ V2; settle 6,2 s identik; variant punya
   re-occlusion snap di awal wipe yang tidak dimiliki V0.
4. Rekomendasi: **C. Further exploration required** (kombinasi translucent +
   reveal lebih awal + perbaikan mekanik wipe; menunggu approval pengguna).

## Batasan yang dihormati

- Kode produksi V10.3 utuh: `home.js` byte-identik; hanya 2 artifact eksperimen
  ditambahkan (CSS varian + harness inline di `src/pages/index.astro`), keduanya
  non-aktif tanpa parameter, ter-commit di feature branch, mudah di-rollback.
- Tidak ada perubahan identitas, font, warna, layout, copywriting, dependency,
  timing Opening V9.1, core.js/bootPage/Page Transitions, Game Deck/Companion.
- Tidak ada merge ke `main`, tidak ada deployment, tidak ada push remote
  (repositori tidak punya remote).
- Tanpa em dash (U+2014) pada file yang disentuh (konvensi repo).

## Perubahan file (V10.4)

- Baru: `V10.4_DIAGNOSTIC_REPORT.md`, `src/styles/opening-prototype-variants.css`,
  `v10.4-research/` (AUDIT_NOTES.md, lighthouse/*.json x36, screenshots/ x48,
  regression-results.txt, lighthouse-summary.txt, tools/*.mjs), bagian V10.4 di
  dokumen ini, paragraf V10.4 di README.md.
- Ubah: `src/pages/index.astro` (import CSS varian + harness inline script,
  keduanya hanya aktif dengan parameter eksperimen).

---

# VERIFICATION · V10.3 STABILIZATION & PERFORMANCE BASELINE

Laporan verifikasi mandiri sesuai `PROMPT_EKSEKUSI_V10.3_STABILIZATION_BASELINE.md`
(4 subfase: fix flicker, dynamic import curtainsjs, baseline performa, identity audit).
Semua pengujian pada hasil build produksi (Astro, static, 9 halaman) via
`astro preview` (localhost:4321), Chrome for Testing 143.0.7499.4 headless
(agent-browser / Lighthouse), viewport 1440x900 (desktop) dan 412x823 (mobile).
Pointer desktop diemulasi via init-script `matchMedia('(pointer: fine)') = true`
karena Chrome headless tidak memiliki pointing device (media `(pointer: fine)`
default false).

## Summary Matrix

| Subfase | File | Status | Bukti |
| --- | --- | --- | --- |
| 1 (fix flicker) | `src/scripts/work.js`, `src/styles/work.css` | PASS | [VERIFIED] log event + [MANUAL] hover/klik/keyboard/WebGL |
| 2 (dynamic import) | `src/scripts/work.js` | PASS | [BUILD] + [VERIFIED] chunk + [MANUAL] network/hover |
| 3 (performance baseline) | `PERFORMANCE_BASELINE.md` (baru) | PASS | [VERIFIED] 18 run Lighthouse valid |
| 4 (identity audit) | `IDENTITY_AUDIT.md` (baru) | PASS | [STATIK] read-only, 0 baris kode diubah |

Catatan commit: SUBFASE 1+2 digabung satu commit karena sama-sama menyentuh
`work.js` (kedua perubahan saling bertetangga di file yang sama); SUBFASE 3+4
dalam commit dokumen.

## SUBFASE 1 - Flicker homepage: root cause [VERIFIED] lalu di-fix

### Diagnosis (sebelum fix, sesuai instruksi spek)

1. Sebelum diukur, satu kenyataan lingkungan harus ditangani: Chrome headless
   melaporkan `(pointer: fine)` = false, sehingga guard `finePointer` membuat
   listener reveal tidak pernah terpasang dan bug tidak bisa direproduksi.
   Ditangani dengan init-script yang memaksa `matchMedia('(pointer: fine)')`
   dan `(hover: hover)` mengembalikan `matches = true` (emulasi desktop).
2. Instrumentasi sementara `console.log('[FLICKER-DIAG] ...')` ditambahkan di
   handler `pointerover`/`pointerout` di `initProjectImageReveal()` (build
   sementara), lalu kursor digerakkan melintasi kartu homepage. Log:
   - `pointerover inner {t: 8829, target: IMG, rel: null}` (masuk)
   - `pointerout inner {t: 8967, target: IMG, rel: project-cover}` (138 ms
     kemudian, kursor tak bergerak: clip-path yang baru saja ditutup membuat
     inner kehilangan hit-test, pointer "pindah" ke wrapper)
   - `pointerover inner {t: 9289, ...}` lalu `pointerout inner {t: 9399, ...}`
     (siklus berulang: reveal di-kill/restart terus).
3. Counter pointerover/pointerout (capture phase) menunjukkan pola
   IMG <-> .project-cover bergantian saat kursor diam, dan clip-path
   ter-hitung ikut berubah-ubah. Diagnosis clip-path memicu hit-test loop:
   **[VERIFIED]**. Guard lama `cover.contains(relatedTarget)` gagal karena
   relatedTarget adalah PARENT (`.project-cover`), dan `contains()` hanya
   searah turun.

### Fix yang diterapkan (persis instruksi spek)

1. Delegasi listener di `#project-grid` pindah target:
   `event.target.closest('.project-cover')` (wrapper stabil) alih-alih
   `.project-cover-inner`.
2. Mempertahankan `pointerover`/`pointerout` (bubbling) dengan delegasi +
   `relatedTarget` check (opsi B dalam spek); guard kini menyerap semua
   perpindahan internal wrapper karena semua calon target (IMG, label,
   wrapper) berada DI DALAM wrapper.
3. `pointer-events: none` ditambahkan pada `.project-cover-inner` di
   `work.css` sehingga hit-test sepenuhnya milik wrapper.
4. Target animasi clip-path TETAP `.project-cover-inner` (di-query dari
   wrapper); geometri arah reveal (getBoundingClientRect) tidak berubah
   karena inner adalah `inset: 0` dari wrapper.
5. `console.log` sementara dihapus dari kode final.

### Acceptance criteria (semua PASS)

- Hover dari 4 arah (kiri/kanan/atas/bawah): 4 entri, masing-masing tepat
  SATU reveal, tanpa osilasi. [MANUAL]
- Kursor diam 2,5 detik di tengah kartu: 0 event pointer, clip-path
  stabil `inset(0px)`. [MANUAL]
- Klik "Read case study" -> navigasi ke `/work/aqi-cirebon` (morphing
  view transition tidak rusak). [MANUAL]
- Keyboard: `link.focus()` dengan clip dipaksa tertutup -> reveal
  membuka kembali (path focusin utuh). [MANUAL]
- WebGL hover di `/work` tidak rusak: canvas 354x235 dibuat saat hover,
  tanpa error; filter kategori di /work tetap me-resync plane WebGL. [MANUAL]
- Reduced motion: WebGL tidak pernah diinisialisasi (tanpa canvas). [MANUAL]
- 9 rute di-smoke-test: 0 error console. [MANUAL]

## SUBFASE 2 - Dynamic import curtainsjs

1. `import { Curtains, Plane } from 'curtainsjs'` statis dihapus.
2. `initWebGLHover()` menjadi async: setelah semua gate lolos
   (finePointer, bukan reduced motion, `webglPathAllowed()`, `webglSupported()`),
   `await import('curtainsjs')`, konstruktor diinjeksi lewat
   `webglHoverState.curtainsCtor/planeCtor`, lalu `webglHoverState.active
   = true` dan `syncWebGLPlanes()`. `createWebGLPlane()` membaca injeksi
   tersebut dan return null bila modul belum siap.
3. `webglHoverState.active` hanya bernilai true SETELAH import sukses,
   sehingga `syncWebGLPlanes()` yang dipanggil `renderProjects()` aman
   dipanggil lebih dulu.

Bukti:

- [BUILD] build produksi sukses tanpa warning baru.
- [VERIFIED] chunk terpisah: `work.COLxFcq2.js` (12.030 byte) dan
  `src.I73TVkiV.js` (curtainsjs, 106.573 byte). Satu-satunya referensi ke
  chunk curtains adalah `await S(()=>import('./src.I73TVkiV.js'),[])`
  DI DALAM chunk work (dynamic import, bukan static import). HTML homepage
  tidak memuat referensi chunk curtains (grep = 0).
- [MANUAL] Homepage (dengan pointer fine dipaksa - kasus paling ketat):
  network log hanya memuat ClientRouter, chunk index, global.js, dan
  work.COLxFcq2.js. TIDAK ada request ke chunk curtainsjs.
- [MANUAL] `/work`: hover kartu -> chunk curtains terunduh (23.795 byte
  transfer), canvas WebGL muncul.
- Bundle size (raw / gzip / brotli), sebelum -> sesudah:
  - chunk work.js: 105.641 / 24.916 / 21.294 -> 12.030 / 4.615 / 4.110
  - chunk curtainsjs (baru, on-demand hanya di /work):
    106.573 / 23.473 / 19.986

## SUBFASE 3 - Reproducible performance baseline

- `PERFORMANCE_BASELINE.md` dibuat di root proyek: environment lengkap
  (OS Linux sandbox, Chrome 143.0.7499.4, tanpa ekstensi, astro preview
  localhost), 2 konfigurasi (Desktop 1440x900 no throttling; Mobile
  412x823 DPR 1.75 simulated Slow 4G CPU x4), 3 rute, 3 run per sel,
  median + data mentah 18 run + elemen LCP per rute + perintah reproduksi.
- Tidak ada optimasi kode di subfase ini. `[VERIFIED]` untuk semua angka
  (JSON Lighthouse tersimpan di lingkungan kerja), `[NOT YET TESTED]`
  untuk field data (Vercel Analytics tidak dapat diakses dari sandbox).
- Catatan lingkungan: tanpa `--disable-dev-shm-usage`, tab Chrome di
  container sering crash saat trace capture (5 dari 9 run desktop awal);
  flag tersebut wajib untuk reproduksi.

## SUBFASE 4 - Identity audit (read-only)

- `IDENTITY_AUDIT.md` dibuat di root proyek: pemetaan token tipografi
  (`--font`, `--mono`), warna (`--blue*` 237 pemakaian), elemen -> font,
  kandidat serif V11.0 (`.hero-title`, `.display-heading`,
  `.case-study-title`), kelompok konsumen `--blue*` untuk aksen "Vessel",
  dan 8 catatan potensi bentrok.
- NOL baris kode aplikasi diubah pada subfase ini. `[STATIK]`

## LARANGAN REKAP - kepatuhan

- Font, warna, layout, logo, teks konten: TIDAK diubah. (Satu-satunya
  perubahan CSS adalah `pointer-events: none` pada `.project-cover-inner`,
  yaitu perbaikan hit-testing yang secara eksplisit diizinkan spek.)
- Opening V9.1, Game Deck, Companion, Page Transitions V10.1: TIDAK disentuh.
- `core.js` dan `bootPage`: TIDAK di-refactor.
- Tidak ada library baru; `curtainsjs` tetap satu-satunya sumber WebGL,
  kini di-load on-demand.
- Tanpa em dash (U+2014) pada file yang disentuh (konvensi repo).

## Perubahan file (V10.3)

- Ubah: `src/scripts/work.js` (SUBFASE 1 + 2), `src/styles/work.css`
  (SUBFASE 1, pointer-events).
- Baru: `PERFORMANCE_BASELINE.md`, `IDENTITY_AUDIT.md`, bagian V10.3 di
  dokumen ini, paragraf V10.3 di README.md.
# VERIFICATION · V10.2 CLEANUP FOUNDATION

Laporan verifikasi mandiri sesuai `PROMPT_FINAL_V10.2_CLEANUP_FOUNDATION.md`
(8 subfase terisolasi: A.1, A.2, B.1, B.2, B.3, C, D, E). Tanggal:
29 Oktober 2026. Semua pengujian pada hasil `npm run build` (Astro 7.4.2,
static, 9 halaman) via `astro preview` (127.0.0.1:4321), Chromium headless
(Playwright) 1440x900 dan 390x844.

Harness: `v102-verify/verify_v102.py` - hasil: **25/25 PASS**
(`v102-verify/results.json`, bukti screenshot di `v102-verify/shots/`).

## Eksekusi per subfase (commit terpisah)

| Subfase | File | Commit | Bukti |
| --- | --- | --- | --- |
| A.1 | `src/scripts/about.js` | `0432785` chore(about): remove unused projectRevealTimelines declaration | [STATIK] + [BUILD] + T6 |
| A.2 | `src/pages/work/[slug].astro` | `5b82d3b` chore(work-slug): remove dead isReserved check | [STATIK] + [BUILD] + T4-b |
| B.1 | `src/scripts/work.js` | `2e49844` chore(work): restrict WebGL hover to /work only | [STATIK] + [BUILD] + T3 |
| B.2 | `src/pages/work/[slug].astro` | `0580b9c` refactor(work-slug): derive case study number from getStaticPaths index | [STATIK] + [BUILD] + T4-a |
| B.3 | `src/scripts/work.js` | `26ceff8` refactor(work): route-aware bootPage config, skip gallery renders on homepage | [STATIK] + [BUILD] + T1/T2 |
| C | `src/content.config.ts`, `src/components/work/CaseNarrative.astro` | `bd62042` feat(case-narrative): add optional alt field for narrative images | [STATIK] + [BUILD] + T5 |
| D | `src/scripts/core.js` | `ddd1696` fix(core): guard forceContentVisible targets to prevent GSAP warnings | [STATIK] + [BUILD] + T7/T8 |
| E | `README.md`, `VERIFICATION.md` | (commit docs ini) | [STATIK] + [BUILD] |

## Bukti per subfase

- **A.1** [STATIK] Audit pra-ubah sesuai instruksi spek:
  `grep -n "initProjectImageReveal" src/scripts/about.js` = tidak ada
  (exit 1); `grep -n "projectRevealTimelines" src/scripts/about.js` =
  hanya baris 447 (deklarasi `const projectRevealTimelines = new WeakMap();`,
  tanpa `.get()` / `.set()` di file yang sama). Komentar blok "V6.3 §3.3
  HoverGrid-style directional cover reveal" tepat di atasnya adalah
  dokumentasi orphan dari implementasi yang hidup di `work.js`; keduanya
  dihapus sesuai Langkah 4 spek (deklarasi + komentar penyerta).
  [MANUAL] T6: `/about` utuh (journey 4 item, curiosity map 21 node,
  11 skill chips, teks 3505 char), konsol tanpa error.
- **A.2** [STATIK] `grep -n "isReserved" src/pages/work/[slug].astro`
  kosong setelah ubah. [MANUAL] T4-b: cover `<img>` tampil di
  `/work/aqi-cirebon` dengan alt deskriptif.
- **B.1** [STATIK] `webglPathAllowed()` kini `return path === '/work';`
  dengan normalisasi trailing slash dipertahankan. [MANUAL] T3:
  0 canvas WebGL di `/` dan `/work/aqi-cirebon`. Catatan: uji positif
  distorsi WebGL di `/work` = [BELUM DIJALANKAN] (lihat daftar di bawah).
- **B.2** [STATIK] `number: String(index + 1).padStart(2, '0')` di
  `getStaticPaths` (sort `a.id.localeCompare(b.id)`), `const { entry,
  number } = Astro.props`, tanpa baris hardcoded. [MANUAL] T4-a:
  kicker `01 / RESEARCH IN PROGRESS` tetap benar (visual unchanged,
  nilai dari `d.kicker`; fallback `${number} / CASE STUDY` kini benar
  untuk proyek kedua di masa depan).
- **B.3** [STATIK] `bootPage({ resolve: getWorkConfig })`;
  `getWorkConfig()` memilah via `#filter-controls`; fungsi individu
  tidak diubah; `import '../scripts/work.js'` di `index.astro` tetap ada.
  [MANUAL] T1: di homepage `#project-grid` markup identik sebelum vs
  sesudah boot (signature outerHTML sama, atribut Astro utuh), tanpa
  `#filter-controls` / `.blueprint-corners`, entrance batch berjalan
  (opacity kartu 0 sebelum scroll menjadi 1 setelah grid masuk view).
  T2: di `/work` filter dirender (All work + Data & Research), klik
  filter bekerja (3 -> 1 kartu) dan "All work" mengembalikan (3 kartu),
  `.blueprint-corners` tampil.
- **C** [STATIK] `alt: z.string().optional()` pada item `narrative`;
  `alt={scene.alt ?? scene.title}` (bukan `||`). [BUILD] skema valid.
  [MANUAL] T5: konten existing (`aqi-cirebon.md`, narrative tanpa
  image) merender 0 `<img>` dan 3 placeholder; guard `scene.image ?`
  dipertahankan.
- **D** [STATIK] 5/5 `gsap.set` di `forceContentVisible()` kini
  berada di balik `if (gsap.utils.toArray(...).length)`; urutan
  operasi, `REDUCED_REVEAL_SELECTOR`, dan try/catch dipertahankan;
  tidak ada fungsi lain di `core.js` yang berubah. [MANUAL] T7:
  reduce motion di 6 rute (`/`, `/work`, `/about`, `/connect`,
  `/work/aqi-cirebon`, `/archive/play`) = 0 warning "GSAP target",
  0 error, 0 pageerror, h1 terlihat. T8: flip ke reduce mid-session,
  navigasi ke `/about` aman dan konten terlihat.
- **E** [STATIK] `grep -n "V10.2" README.md VERIFICATION.md` ada;
  `grep -rn "$(printf '\u2014')" README.md VERIFICATION.md` kosong
  (termasuk pembersihan 8 em dash warisan di bagian V10.0/V10.1 file
  ini, diganti "-"; kedua file memang satu-satunya file yang diizinkan
  Subfase E). Tidak ada klaim "all tests passed" untuk butir yang
  tidak dijalankan; butir tercantum jujur di bawah.

## [BELUM DIJALANKAN] + alasan konkret

1. **Distorsi WebGL Curl saat hover kartu di `/work` (uji positif B.1).**
   Chromium headless SwiftShader gagal membuat konteks WebGL ("Renderer:
   WebGL context could not be created"), jadi efek tak pernah hidup di
   harness. Terverifikasi sebagai artefak environment, bukan regresi:
   probe identik pada baseline V10.1 (worktree `e4c97aa`, build sendiri)
   menghasilkan pesan yang sama persis. Yang terverifikasi di headless:
   gate path B.1 (0 canvas di `/` dan `/work/aqi-cirebon`). Uji visual
   distorsi diserahkan ke user di Chrome nyata (hardware acceleration).
2. **Flip preferensi reduce via pengaturan OS asli.** Diuji via emulasi
   Playwright (`emulate_media(reduced_motion=...)` + context option),
   bukan toggle OS; mekanisme matchMedia-nya identik.
3. **Morph / Back transition antar `/work` dan `[slug]` secara visual.**
   Tidak diuji eksplisit di harness V10.2 (fitur V10.1, tidak disentuh);
   satu-satunya perubahan terkait adalah B.3 yang justru menjaga atribut
   `transition:name` Astro di homepage (T1-d membuktikan markup utuh).
4. **Audio, Companion, Magnetic, Generative Ambient.** Tidak diuji
   ulang; tidak disentuh sama sekali oleh V10.2 (di luar 6 file yang
   diizinkan).

## Regresi V10.1/V10.x via harness (browser)

- T9: Opening V9.1 - fresh session menampilkan dialog, Escape menutup: PASS.
- T10: Mobile 390x844 - `/work/aqi-cirebon` tanpa horizontal overflow
  (scrollWidth 390 = innerWidth 390): PASS.
- T11: Konsol bersih (error/pageerror) di 6 rute mode normal: PASS;
  noise WebGL headless di `/work` dikecualikan dengan bukti baseline
  (poin 1 di atas).
- T8: Navigasi client-side tetap berjalan setelah flip reduce: PASS.

## Perubahan file (V10.2)

- `src/scripts/about.js`: -18 baris (komentar orphan + deklarasi WeakMap).
- `src/pages/work/[slug].astro`: `isReserved` dihapus; `number` di-derive
  dari `getStaticPaths` (sort by `id`).
- `src/scripts/work.js`: `webglPathAllowed()` strict `/work`;
  `getWorkConfig()` route-aware + `bootPage({ resolve })`.
- `src/content.config.ts`: `alt` opsional pada item `narrative`.
- `src/components/work/CaseNarrative.astro`: `alt={scene.alt ?? scene.title}`.
- `src/scripts/core.js`: `forceContentVisible()` di-guard per selector
  (satu-satunya perubahan di `core.js`, sesuai batas spek).
- `README.md`, `VERIFICATION.md`: dokumen V10.2 + pembersihan em dash.

---

# VERIFICATION · V10.1 AUDIT FIXES

Laporan verifikasi mandiri sesuai `PROMPT_FINAL_V10.0_AUDIT_FIXES.md`
(5 fase terisolasi: H1+H2, M1+M2, M3+M4, L4, N6). Semua pengujian pada
hasil `astro build` (Astro 7.4.2, static, 9 halaman) via `astro preview`
(127.0.0.1:4321), Chromium headless (Playwright) 1440x900 dan 390x844.

Harness: `v101-verify/verify_v101.py` - hasil: **24/24 PASS**
(`v101-verify/results.json`, bukti screenshot di `v101-verify/shots/`).

## Eksekusi per fase (commit terpisah)

| Fase | ID | Commit | Bukti |
| --- | --- | --- | --- |
| 1 | H1+H2 | `044cd2f` fix(case-narrative): revert nested matchMedia on navigation | [STATIK] + [BUILD] + S9 |
| 2 | M1+M2 | `08cdb11` fix(page-transitions): respect reduced motion and restore scroll on traversals | [STATIK] + [BUILD] + S3/S4/S5 |
| 2b | M2 lanjutan | `dcbe7d2` deterministic traverse scroll restore (lihat deviasi #1) | [STATIK] + [BUILD] + S2 |
| 3 | M3+M4 | `02cfd18` clear safety timer before reveal and register in registry | [STATIK] + [BUILD] |
| 4 | L4 | `18b1537` use h2 for scene titles to fix heading hierarchy | [STATIK] + [BUILD] + S5-b |
| 5 | N6 | (tanpa commit - audit bersih, Opsi A user) | [STATIK] |

## Checklist verifikasi akhir (12 skenario spek)

1. **[BUILD]** `astro build` sukses, 9 halaman, tanpa warning baru - PASS.
2. **[STATIK]** `grep -rn "$(printf '\u2014')" src/` kosong - PASS.
3. **[STATIK]** `git diff 3186b6d..HEAD --stat`: tepat 5 file
   (case-narrative.js, global.js, page-transitions.js,
   CaseNarrative.astro, case-narrative.css); `aqi-cirebon.md` tidak
   tersentuh (N6 = audit bersih) - PASS.
4. **[MANUAL→otomatis]** Home → /work/aqi-cirebon → back → forward,
   scroll restoration - PASS (S2-a..d; restore terukur ~211px).
5. **[MANUAL→otomatis]** Reduced motion full test: navigasi instan,
   tanpa blok klik - PASS (S3-a..c, S4-a..c flip mid-session dua arah).
6. **[MANUAL→otomatis]** Reduced motion narrative: stacked vertikal,
   semua scene terlihat - PASS (S5-a).
7. **[MANUAL→otomatis]** Mobile 390px: scrollWidth === clientWidth (390)
   - PASS (S6-a).
8. **[MANUAL→otomatis]** Desktop 1440px scrub scene 0→1→2→1 - PASS
   (S7-a,b; urutan tercatat [0,1,0,2,0,1,0] wheel bawah+atas).
9. **[MANUAL→otomatis]** Rapid click 5x: satu transisi, halaman akhir
   benar, overlay pulih - PASS (S8-a).
10. **[MANUAL→proxy terukur]** Memory leak: `gsap.globalTimeline
    .getChildren(true,true,true).length` stabil [7,6,6,6,6] dan
    `ScrollTrigger.getAll().length` [1,1,1,1,1] across 5 navigasi
    /work → /about → /work/aqi-cirebon - PASS (S9-a). Heap snapshot
    DevTools asli tidak tersedia di harness; proxy children-count
    membuktikan timeline tidak lagi menumpuk (pra-fix akan tumbuh ~5/
    navigasi).
11. **[MANUAL→otomatis]** Opening V9.1 utuh: fresh visit muncul, nav
    diblokir selama terbuka, Escape skip, reload tidak memunculkan ulang
    - PASS (S1-a..e).
12. **[MANUAL→otomatis]** Konsol bersih di 9 rute (/ , /work,
    /work/aqi-cirebon, /about, /connect, /archive, /archive/play,
    /archive/credentials, /archive/off-screen): 0 pageerror, 0 error
    riil - PASS (S10-a,b; whitelist lingkungan lihat #4).

## Deviasi terukur dari kode literal spek (dalam berkas yang diizinkan)

1. **M2 traverse restore (commit `dcbe7d2`)**: kode spek
   `lenis.scrollTo(window.scrollY, { immediate: true })` di
   `astro:after-swap` terbukti tidak mungkin berjalan di Astro 7.4:
   (a) binding `lenis` selalu `null` di titik itu karena teardown
   `core.js` (terdaftar lebih dulu) sudah `lenis.destroy()` + null;
   (b) restore router berbentuk `scrollTo(x, y)` posisional yang
   menghormati CSS `scroll-behavior: smooth` (global.css) sehingga
   restore berjalan animasi dan dibatalkan siklus save/restore
   `ScrollTrigger.refresh()` saat boot - halaman selalu mendarat di 0
   (terukur via monkey-patch `window.scrollTo` + snapshot scrollY pada
   after-swap). Spek sendiri mengantisipasi risiko ini dan mengizinkan
   follow-up. Solusi tetap di `page-transitions.js`: paksa restore
   deterministik dari `history.state.scrollY` (posisi resmi metadata
   router Astro) dengan `behavior: 'instant'` - pola yang sama dipakai
   router Astro sendiri; Lenis baru saat boot mengadopsi posisi itu.
   Hasil: S2-c PASS (Back restore ~211px), S2-d PASS (Forward).
2. **Ekspektasi angka spek tidak sinkron dengan instruksi spek**: FASE 3
   mengekspetasi `clearTimeout` 2x, tetapi kode langkah-langkahnya
   menghasilkan 3x (satu pra-ada di before-preparation dipertahankan +
   resetOverlayState + blok M3 after-swap). Instruksi implementasi
   diikuti persis; angka ekspektasi adalah salah hitung spek. Yang
   penting: `timers.add` 1x, `timers.delete` 2x, `setTimeout` 1x - semua
   sesuai spek.
3. **FASE 2 impor `motionRegistry`**: contoh kode before-preparation
   spek (FASE 2 langkah 4) sudah memuat baris `motionRegistry.timers.add`
   padahal impor `motionRegistry` baru diinstruksikan di FASE 3. Agar
   tiap fase benar-benar terisolasi dan buildable, baris registry
   diterapkan pada commit FASE 3 (M4) sesuai matriks tanggung jawab.
4. **Whitelist konsol lingkungan headless** (preseden V10.0 S7-b):
   (a) curtains.js tidak bisa membuat context WebGL di Chromium headless
   software-render - di browser nyata berjalan normal; (b) 403
   `api.github.com` - rate limit API publik GitHub untuk IP datacenter
   sandbox; halaman connect fallback anggun (0 pageerror). Keduanya
   artefak lingkungan, bukan kode situs, dan bukan bagian 5 fase.
5. **N6**: audit `grep -rn "$(printf '\u2014')"` atas seluruh src/ kosong
   sejak awal; judul `aqi-cirebon.md` memakai EN DASH (U+2013) yang
   dipertahankan sesuai keputusan user (Opsi A). Tidak ada perubahan
   file, tidak ada commit (sesuai spek).

## Perubahan file (V10.1)

- `src/scripts/case-narrative.js`: module-level `activeMM` + revert di
  dua titik (awal init + astro:after-swap); isi callback tidak berubah.
- `src/scripts/global.js`: `initPageTransitions` pindah dari
  `interactions` ke `motion` (gate inisialisasi no-preference).
- `src/scripts/page-transitions.js`: runtime guard `isReducedMotion()`
  di 3 handler; MQL change listener (killTweensOf + reset overlay);
  `pendingNavType` dari `event.navigationType`; scroll top hanya untuk
  push/replace; traverse restore deterministik (deviasi #1); timer
  didaftarkan ke `motionRegistry.timers` + di-clear sebelum reveal dan
  di `resetOverlayState()`.
- `src/components/work/CaseNarrative.astro`: scene title h3 → h2.
- `src/styles/case-narrative.css`: selector `.narrative-text h3` →
  `.narrative-text h2` (nilai properti identik).
- Verifikasi: `v101-verify/verify_v101.py`, `v101-verify/results.json`,
  `v101-verify/shots/*.png`.

---

# VERIFICATION · V10.0 ULTIMATE SAFE

Laporan verifikasi mandiri sesuai FASE 4.2 `PROMPT_V10.0_ULTIMATE_SAFE.md`
(Cinematic Page Transitions "Archive Wipe" + Scroll Narrative 3 scene).
Semua pengujian dijalankan pada hasil `bun run build` (Astro 7.4.2, static
output, 9 halaman) yang disajikan lewat `astro preview` (127.0.0.1:4321),
diukur dengan Chromium headless (Playwright) pada 1440x900 dan 390x844.

Harness: `v10-verify/verify_v10.py` - hasil: **24/24 PASS**
(`v10-verify/results.json`, bukti tangkapan layar di `v10-verify/shots/`).

## Ringkasan status (checklist FASE 4.2)

| # | Butir verifikasi spesifikasi | Status |
| --- | --- | --- |
| 1 | Build (`astro build`) - 9 halaman, skema `narrative` tervalidasi | PASS |
| 2 | Uji V9.1: navigasi DIBLOKIR selama opening terbuka; setelah selesai, Archive Wipe berjalan | PASS (S1-a..d) |
| 3 | Uji Transisi Home→About: overlay cover → swap → reveal, tanpa flash putih, scroll reset ke atas | PASS (S2-a..e) |
| 4 | Uji Morphing /work → /work/aqi-cirebon: rute DIKECUALIKAN dari wipe (overlay tetap hidden), morph native tetap jalan | PASS (S3-a,b) |
| 5 | Uji Scroll Narrative: scene 1→2→3 berganti saat scroll, terbalik saat scroll naik, layar terkunci (sticky), lepas setelah section | PASS (S4-a..f) |
| 6 | Uji Mobile 390px: narrative menjadi vertikal biasa, semua scene terlihat, tanpa scroll-lock | PASS (S5-a,b) |
| 7 | Uji Rapid Click: hanya satu transisi; klik kedua ditelan; overlay pulih | PASS (S6-a) |
| 8 | Uji Konsol: bersih - tanpa page error, tanpa "GSAP target not found" | PASS (S7-a..c) |
| + | Bonus: reduced-motion (overlay display:none, navigasi tetap jalan) | PASS (S8-a) |
| + | Bonus: node overlay terbukti persisten lintas swap (`transition:persist` bernama) | PASS (S2-c) |

## Temuan audit penting (penyimpangan aman dari spek)

1. **`preventDefault()` di `astro:before-preparation` TIDAK membatalkan
   navigasi di Astro 7.** Audit sumber (`node_modules/astro/dist/transitions/
   router.js` + `events.js`) membuktikan: preventDefault membuat router
   mendelegasikan ke `location.href = to.href` - full page reload yang
   justru menghancurkan opening (terbukti saat uji awal: URL berpindah dan
   dialog tertutup paksa). Karena itu kedua guard (V9.1 opening + rapid
   click) memakai **intersepsi klik fase capture pada document** - navigasi
   tidak pernah dimulai, benar-benar "tidak terjadi apa-apa". Listener
   `before-preparation` kini murni memainkan overlay, tanpa preventDefault.
2. **`transition:persist` tanpa nama menghasilkan id posisional** yang
   berbeda antar halaman (`astro-xxx-2` vs `astro-xxx-3`) bila jumlah
   elemen `transition:name` berbeda - pasangan tidak cocok membuat node
   overlay ikut ter-swap (state hilang di tengah transisi). Diperbaiki
   dengan nama eksplisit: `transition:persist="page-transition-overlay"`
   (terverifikasi identik di 9 halaman hasil build).
3. **Reveal tahan-banting teardown**: fetch lokal bisa lebih cepat dari
   cover 0.4s; teardown halaman (globalTimeline.clear) membunuh tween
   cover di tengah jalan. Reveal memakai `.to()` dari posisi panel saat
   ini ke y:-100% sehingga panel "berlanjut" mulus tanpa snap; perubahan
   konten tetap tertutup cross-fade bawaan `<main transition:animate="fade">`.
   Jaring pengaman timer 3s memulihkan overlay bila after-swap tak pernah
   tiba (fetch gagal).
4. **Panggung naratif full-bleed**: spesifikasi menaruh `CaseNarrative`
   di dalam `.case-study-body`, tetapi lebar panggung 100vh + padding
   clamp(22px,7vw,110px) jelas meminta full-bleed; solusi: section
   saudara dari body dengan breakout `width:100vw;
   margin-left:calc(50% - 50vw)` (overflow-x dijaga global.css).
5. **Pin ganda dihindari**: CSS spesifikasi sudah memakai
   `position: sticky` pada `.narrative-stage`; menumpuk `pin:` ScrollTrigger
   di atasnya membuat dua mekanisme pinning saling tarik. ScrollTrigger
   hanya memetakan progres (top top → bottom bottom, scrub 1); sticky CSS
   yang mengunci layar - semua butir uji "layar terkunci" tetap lulus.
6. **Scene 1 (index 0) dimulai terlihat**: CSS spesifikasi menyetel semua
   scene opacity 0, yang membuat scene pertama tak pernah muncul; scene 0
   kini terlihat sejak awal (fallback tanpa-JS tetap anggun) dan memudar
   saat scrub dimulai.
7. **Catatan lingkungan headless**: satu pesan error konsol dari
   curtains.js (WebGL card hover, fitur pra-V10) tidak dapat membuat
   context WebGL di Chromium headless - di-whitelist di harness sebagai
   keterbatasan lingkungan, bukan regresi; di browser nyata kartu hover
   WebGL berjalan normal.

## Perubahan file (V10.0)

- Baru: `src/components/layout/PageTransitionOverlay.astro`,
  `src/styles/page-transitions.css`, `src/scripts/page-transitions.js`,
  `src/components/work/CaseNarrative.astro`,
  `src/styles/case-narrative.css`, `src/scripts/case-narrative.js`.
- Ubah: `src/content.config.ts` (skema `narrative`, max 3 scene),
  `src/content/work/aqi-cirebon.md` (3 scene: MASALAH → PROSES → TEMUAN),
  `src/layouts/BaseLayout.astro` (overlay + css sebelum `</body>`),
  `src/scripts/global.js` (initPageTransitions di boot interactions),
  `src/pages/work/[slug].astro` (CaseNarrative + bootPage narrative).
- Verifikasi: `v10-verify/verify_v10.py`, `v10-verify/results.json`,
  `v10-verify/shots/*.png`.
