# Farrel Islami Putra · Editorial Portfolio (Astro V10.3)

Portofolio pribadi berbasis **Astro 7** dengan arsitektur **Hub-and-Spoke (Pucuk-Cabang)**.
Migrasi total dari versi monolitik satu halaman (HTML/CSS/JS murni, V6.7) sesuai
`PROMPT_EKSEKUSI_V7.0_ASTRO_MIGRATION.md`. Desain visual, palet warna, tipografi,
animasi GSAP, dan seluruh fitur interaktif dipertahankan identik.

**V10.3 (Stabilization & Performance Baseline, 4 subfase)** sesuai `PROMPT_EKSEKUSI_V10.3_STABILIZATION_BASELINE.md`: stabilisasi murni, tanpa perubahan identitas, font, warna, atau fitur visual. **SUBFASE 1**: akar bug flicker kartu proyek dibuktikan dulu lewat log `[FLICKER-DIAG]` sebelum difix - clip-path pada `.project-cover-inner` mengubah region hit-test-nya selama animasi reveal, sehingga delegasi `pointerover`/`pointerout` ke inner bergantian kill/restart tween (guard `contains()` hanya searah turun, tak bisa menyerap relatedTarget berupa wrapper parent). Fix: delegasi dipindah ke `.project-cover` (wrapper berukuran stabil) dengan guard `event.relatedTarget`, plus `pointer-events: none` pada `.project-cover-inner` di work.css; target animasi clip-path tetap inner. **SUBFASE 2**: curtainsjs tidak lagi di-import statis di work.js - `initWebGLHover()` kini async dan hanya `await import('curtainsjs')` ketika semua gate lolos (path /work, pointer fine, tanpa reduced motion, WebGL didukung); chunk curtains (106.573 byte raw / 23.473 gzip) jadi chunk terpisah yang TIDAK dimuat di homepage, chunk work turun 105.641 -> 12.030 byte raw (24.916 -> 4.615 gzip). **SUBFASE 3**: `PERFORMANCE_BASELINE.md` - baseline Lighthouse 13.6.0 reproducible (2 konfigurasi x 3 rute x 3 run, median): LCP homepage didominasi element render delay ±5,5 dtk dari opening V9.1 (elemen `#hero-subtitle`), rute /work dan /work/aqi-cirebon sehat (LCP desktop 623-675 ms, CLS <= 0.0051 di semua rute). **SUBFASE 4**: `IDENTITY_AUDIT.md` read-only - pemetaan token tipografi/warna, kandidat serif V11.0, kelompok konsumen `--blue*` untuk persiapan aksen Vessel, dan catatan potensi bentrok. Verifikasi: log event pointer, network log browser, 18 run Lighthouse valid; rincian di `VERIFICATION.md`.

**V10.2 (Cleanup Foundation, 8 subfase terisolasi)** sesuai `PROMPT_FINAL_V10.2_CLEANUP_FOUNDATION.md`:
menutup technical debt hasil audit V10.0 tanpa menambah fitur baru. **A.1**: deklarasi
tak terpakai `projectRevealTimelines` dihapus dari `about.js` (audit pra-ubah: fungsi
`initProjectImageReveal` memang tidak ada di file itu; implementasi aslinya hidup di
`work.js`). **A.2**: dead check `isReserved` dihapus dari `work/[slug].astro`
(`getStaticPaths` sudah memfilter RESERVED). **B.1**: `webglPathAllowed()` di-strict
hanya `path === '/work'` (halaman [slug] tidak meng-import `work.js`). **B.2**: nomor
case study di-derive dari indeks `getStaticPaths` (sort deterministik by `id`), bukan
hardcoded "01". **B.3**: `work.js` route-aware via `getWorkConfig()` - di homepage
markup kartu hasil render Astro TIDAK diganti ulang `renderProjects` (atribut
`transition:name` ikut terjaga), hover reveal + entrance batch tetap jalan, sementara
`/work` mendapat config penuh (filter, ruler, blueprint, WebGL hover). **C**: field
`alt` opsional pada item `narrative` (fallback `scene.alt ?? scene.title`; `alt=""`
eksplisit untuk gambar dekoratif). **D**: setiap `gsap.set` di `forceContentVisible()`
di-guard `gsap.utils.toArray(...).length` sehingga reduce mode tidak lagi mencetak
warning "GSAP target ... not found" di rute tanpa target. **E**: dokumentasi ini.
Verifikasi: 25/25 PASS (`v102-verify/`), rincian di `VERIFICATION.md`.

**V10.1 (Audit Fixes, 5 fase terisolasi)** sesuai `PROMPT_FINAL_V10.0_AUDIT_FIXES.md`:
perbaikan akar masalah atas hasil audit V10.0 tanpa menyentuh `core.js` maupun fitur
pra-V10.0 (Opening V9.1, Game Deck, Companion, WebGL Curl, Magnetic, Audio, Generative
Ambient). **FASE 1 (H1+H2, lifecycle)**: `gsap.matchMedia()` naratif kini module-level
(`activeMM`) dan di-revert di dua titik (awal init + `astro:after-swap`) sehingga
cleanup `tl.kill()` + `tl.scrollTrigger.kill()` benar-benar jalan - timeline + konteks
tidak bocor lagi tiap navigasi ke /work/[slug]. **FASE 2 (M1+M2)**: `initPageTransitions`
dipindah dari array `interactions` ke `motion` (reduce mode boot = tidak pernah init),
runtime guard `isReducedMotion()` di ketiga handler, MQL change listener yang mematikan
tween overlay saat preferensi berubah mid-transition, dan scroll restoration - navigasi
baru (push/replace) selalu mulai di top, sedangkan Back/Forward (traverse) mengembalikan
posisi scroll dari `history.state` secara deterministik (`behavior: 'instant'`, lihat
catatan deviasi di VERIFICATION.md). **FASE 3 (M3+M4)**: safety timer 3s di-clear tepat
sebelum reveal dimulai (race fetch lambat tertutup; skenario offline tetap pulih) dan
terdaftar di `motionRegistry.timers` sesuai konvensi lifecycle. **FASE 4 (L4)**: judul
scene naratif h3 -> h2 (hierarki heading h1 -> h2, WCAG 1.3.1) dengan nilai CSS identik.
**FASE 5 (N6)**: audit em dash (U+2014) seluruh src/ bersih; EN DASH judul case study
dipertahankan. Setiap fase satu commit terpisah; 12 skenario verifikasi akhir dieksekusi
otomatis via Playwright dengan hasil **24/24 PASS** (`v101-verify/`).

**V10.0 (Ultimate Safe: Cinematic Page Transitions + Scroll Narrative)** sesuai
`PROMPT_V10.0_ULTIMATE_SAFE.md`: **Archive Wipe** - overlay page transition
(`PageTransitionOverlay.astro`, `transition:persist` bernama) dengan cover (panel naik
0.4s) pada `astro:before-preparation` dan reveal (panel lanjut ke atas) pada
`astro:after-swap`, intersepsi klik fase capture untuk guard opening V9.1 + rapid click
(tanpa `preventDefault` pada event router - terbukti tidak membatalkan navigasi di Astro
7), route exclusion /work <-> /work/[slug] (morphing native), jaring pengaman timer 3s.
Plus **Scroll Narrative 3 scene** (MASALAH -> PROSES -> TEMUAN) pada case study:
`CaseNarrative.astro` + timeline scrub ScrollTrigger (top top -> bottom bottom, scrub 1,
tanpa pin ganda - sticky CSS yang mengunci) dengan skema konten `narrative` di
`content.config.ts` dan scene di `aqi-cirebon.md`. Verifikasi 24/24 PASS
(`v10-verify/`). Rincian di `VERIFICATION.md`.

**V9.1 (Enhanced Archive Boot Sequence, Cinematic)** sesuai `PROMPT_V9.1_ENHANCED_OPENING.md`:
ritual pembuka V9.0 ditingkatkan dari "quiet ritual" (~2.2s) menjadi pengalaman
pembukaan sinematik ~4.5 detik dengan **komposisi 4 lapis + choreography GSAP**.
**Layer 1 Ambient**: grain SVG (opacity 0.04, multiply) + vignette radial memudar
masuk. **Layer 2 Archive Frame**: 4 bracket sudut muncul stagger 0.1s, dua garis
ukur menggambar diri (scaleX/scaleY 0.6s), label mono `FIP / ARCHIVE / VOL.01` dan
koordinat Cirebon `-6.7322 / 108.5525` fade-in. **Layer 3 Center Ritual**: label
fade-slide-up (0.8s), ring scale-in `back.out` (1.0s), counter choreographed
**000 -> 100 selama 1.8s mulai 1.2s** (INITIALIZING -> CALIBRATING di 50 -> READY
di 3.0s) dengan ring pulse 1.12x di akhir. **Layer 4 Metadata Ticker**: baris mono
berganti tiap 500ms (fade-slide) dari array statis - dekoratif, bukan progres nyata.
**Micro-delight**: 6 partikel debu kursor (motif `.pixel-dust`) melayang di sekitar
ring via `gsap.quickTo` (damped), ring hover scale 1.02 + drop-shadow, tombol skip
hover terangkat -2px. **Timing baru (Batasan 2)**: timeout utama 3500ms + exit wipe
1000ms = total 4.5s; tombol Enter Archive lahir `disabled` dan aktif di 1.5s
(>= jeda 800ms) bersamaan dengan fokus otomatis. **Exit circular reveal**: clip-path
`circle(150% at 50% 50%) -> circle(0%)` pada `.opening-clip` (power3.inOut) sementara
`::backdrop` memudar 1s dan dialog menjadi transparan - hero terungkap DI TENGAH
iris yang menyusut (REVEAL_AT 0.65s). **Asset tracking V9.0 dipertahankan** untuk
fast-fail kegagalan aset (`CONTINUING...`); exit tidak lagi dipicu "semua aset
selesai" agar choreography selalu utuh (landing `/` memang tanpa img kritis).
**Lifecycle (Batasan 8)**: choreography/counter/pulse via `trackEventTween`, ticker
interval di `motionRegistry.intervals`, quickTo debu via `trackQuickTo`, listener
via `trackMotionListener` - semua dibersihkan idempoten oleh `exitSequence()` dan
tear-down `astro:after-swap`. Terverifikasi 37/37 checks Playwright (16 skenario
spek + bukti timing beat-by-beat + screenshot). Rincian di `VERIFICATION.md`.

**V9.0 (Absolute Final: Archive Boot Sequence)** sesuai `PROMPT_V9.0_ABSOLUTE_FINAL.md`:
overlay pembuka V6.6 diganti penuh dengan boot sequence sinematik berbasis `<dialog>`
native yang tahan 100% edge case. **Zero-FOUC**: inline script sinkron di `<head>`
(berjalan sebelum first paint) memeriksa `sessionStorage['fip-opening-seen']` +
`prefers-reduced-motion`, menandai `html.opening-armed` (guard CSS menyembunyikan
konten), dan memasang safety timeout 4s jika global.js gagal; dengan JS mati total
script itu tidak jalan sehingga halaman langsung tampil. **Counter + ring progres**
untuk aset kritis (`img[data-opening-critical]` - cover profil /about dan cover
case study /work/[slug]; Hero tidak punya `<img>` sama sekali sehingga landing di
`/` memakai no-assets branch: READY + jeda 400ms). **Timer tunggal** 2200ms
(`CONTINUING...` + wipe; total <= 3s), **exactly-once asset settlement** (Set
`settled` + pasangan load/error saling melepas), **no-assets branch di luar loop**,
dan **::backdrop yang memudar serentak dengan wipe clip-path 0.8s** sehingga hero
benar-benar terungkap di tengah wipe (REVEAL_AT 0.5s). **Kontrak callback hero**:
`initHeroIntro()` dipecah menjadi `prepareHeroState()` (gsap.set saja) +
`animateHeroIn()` (timeline saja) yang diekspor home.js dan diterima
`initArchiveOpening` sebagai callback - dipanggil tepat satu kali di semua jalur.
**Lifecycle**: semua listener/timer/timeline exit terdaftar di motionRegistry,
plus handler `astro:after-swap` idempoten (paksa tutup dialog, batalkan safety
timer, lepas guard). Escape, klik (ganda), dan tab tetap aman (focus trap native
showModal). Terverifikasi 32/32 checks via Playwright + bukti screenshot.
Rincian verifikasi di `VERIFICATION.md`.

**V8.1 (Technical Debt Cleanup, SEO & Semantic Hardening)** sesuai `PROMPT_V8.1_DEBT_CLEANUP_SEO.md`: sapu bersih temuan review eksternal tanpa fitur visual baru. **Judul halaman**: override `doc.title` di `renderIdentity()` dihapus, sehingga setiap halaman memakai `<title>` unik dari prop `title` BaseLayout. **Mobile layout**: `.hero-ruler` disembunyikan di bawah 700px (aturan eksplisit di home.css karena urutan impor membuat aturan mobile global.css kalah kaskade) dan `.geo-two` ditarik ke `right: 12px`, sehingga `scrollWidth === innerWidth === 390` di semua 9 halaman (sebelumnya 402 vs 390). **Semantik & SEO**: `lang="id"`, tepat satu `<h1>` di 7 halaman yang tadinya memakai h2, meta description unik per halaman, canonical + og:url + og:image absolut via `Astro.site` (`https://www.farrelislami.tech` di astro.config.mjs), plus aset baru `public/og-default.png` (1200x630, digenerate deterministik via sharp dengan palet situs). **Rute publik**: entri RESERVED tidak pernah lagi menghasilkan halaman (`getStaticPaths` memfilter `status !== 'RESERVED'`; build turun dari 11 ke 9 halaman) dan kartu sampel "SAMPLE FORMAT / NOT AN ENTRY" dihapus dari vault credentials. **Konsol bersih**: semua blok GSAP lintas halaman di `initSectionMotion()` (global.js) dan `initV4Motion()` (archive.js) dijaga `gsap.utils.toArray()` + pemeriksaan panjang, sehingga tur 9 halaman tercatat 0 peringatan "target not found". Rincian verifikasi di `VERIFICATION.md`.

**V8.0 (Cinematic Experience & Micro-Interactions)** sesuai `PROMPT_V8.0_CINEMATIC_EXPERIENCE.md`:
portofolio kini punya lapisan sinematik dengan progressive enhancement penuh.
**Magnetic buttons**: CTA utama (dua tombol hero, CTA case study, INSERT COIN)
mengikuti kursor lewat `gsap.quickTo` (maks 15px) dan kembali dengan elastic.
**Audio feedback**: suara sintesis Web Audio (tanpa file) untuk klik CTA dan
hover kartu proyek, dengan tombol mute di header + preferensi `localStorage`
(`fip-audio-muted`). **WebGL image hover**: cover kartu di `/work` dan
`/work/[slug]` didistorsi halus mengikuti kursor via Curtains (canvas per
kartu, di dalam cover sehingga ikut radius kartu dan tetap di bawah label).
**CRT shader**: saat Game Deck terbuka, overlay WebGL prosedural (scanline,
phosphor glow, band roll, grain, ilusi layar melengkung) hidup di atas
`.deck-screen` dan mati bersih saat EJECT. Semua efek hanya jalan di
desktop `pointer: fine`, mati saat reduced motion, dan seluruh listener/rAF/
context WebGL terdaftar di `motionRegistry` (dua jalur baru: `rafLoops` +
`webgl`) sehingga `astro:after-swap` membebaskannya semua. Tanpa WebGL atau
Web Audio, situs tetap berfungsi 100% normal. Rincian verifikasi di
`VERIFICATION.md`.

**V7.5 (Fix Game Deck Scroll Bug)** sesuai `PROMPT_V7.5_FIX_DECK_SCROLL.md`:
memperbaiki bug kritis di `/archive/play` di mana roda mouse macet setelah
menekan "INSERT COIN". Akar masalah: kartu game menambah tinggi halaman secara
dinamis, tetapi `html { height: 100% }` membuat kotak `documentElement` tidak
pernah berubah sehingga ResizeObserver bawaan Lenis (autoResize) diam saja;
instance Lenis dan ScrollTrigger tetap memakai batas scroll lama (halaman 900px
tidak punya ruang scroll sama sekali). Perbaikan hanya menyentuh
`src/scripts/archive.js`: `lenis.resize()` + `window.ScrollTrigger.refresh()`
dipanggil lewat `requestAnimationFrame` di tiga titik siklus deck
(`finishOpen`, `closeDeckInstant`, `finishEject`) sehingga tinggi halaman selalu
diukur ulang setelah DOM berubah. Logika animasi GSAP dan desain visual tidak
berubah. Rincian verifikasi di `VERIFICATION.md`.

**V7.4 (Cinematic View Transitions & Motion Lifecycle)** sesuai `PROMPT_V7.4_VIEW_TRANSITIONS.md`:
navigasi antar halaman kini memakai **Astro View Transitions (`ClientRouter`)** sehingga
perpindahan halaman terasa seperti aplikasi native tanpa flash layar putih
(`transition:animate="fade"` pada `<main>`). Gambar kartu proyek **morph** menjadi
cover case study lewat `transition:name` yang identik antara kartu dan halaman detail
(`project-image-<slug>`, dipertahankan juga pada render JavaScript). Siklus hidup
JavaScript dibangun ulang di sekitar **`astro:page-load`**: semua inisialisasi
(GSAP, ScrollTrigger, Lenis, render data) berjalan ulang pada setiap muatan halaman,
teardown halaman lama dieksekusi di `astro:after-swap`, dan `ScrollTrigger.refresh()`
dipanggil di akhir setiap inisialisasi. Reduced motion mematikan transisi halaman.
Rincian verifikasi di `VERIFICATION.md`.

**V7.3 (Mobile Navigation & Responsive Fixes)** sesuai `PROMPT_V7.3_MOBILE_RESPONSIVE.md`:
navigasi mobile yang sebelumnya hilang di bawah 980px kini digantikan **Mobile
Hamburger Menu (laci navigasi)** yang menggabungkan 6 tautan utama + 4 tautan
Deep Dive, ditambah perbaikan tata letak homepage mobile (hero satu kolom,
floating tools disembunyikan, pixel frame/sticker dipatok nilai spesifikasi,
Data Atlas menjadi latar samar, grid proyek & sosial satu kolom). Desain desktop
tidak berubah sama sekali. Rincian verifikasi di `VERIFICATION.md`.

**V7.2 (Audit & Final UI/Bug Fixes)** sesuai `PROMPT_EKSEKUSI_V7.2_AUDIT_FIXES.md`:
audit hasil V7.1, sticky footer flexbox dikunci dalam bentuk spesifikasi
(`main { flex: 1 0 auto }` + `.site-footer { flex-shrink: 0 }`), dan perbaikan
grid halaman `/work` yang kini **dirender statis saat build** (kartu proyek +
slot reserved tampil sejak HTML, dengan atau tanpa JavaScript; state awal filter
"All"). Rincian verifikasi dan laporan audit di `VERIFICATION.md`.

**V7.1 (UI Cleanup & Quick Menu Restructure)** sesuai `PROMPT_V7.1_UI_CLEANUP.md`:
sticky footer flexbox (tanpa white gap di halaman pendek), perbaikan artefak kotak
abu-abu (`.grain-overlay` kembali `position: fixed` di `global.css`), navigasi utama
6 item (Home, Work, Games, About, GitHub, Contact), dan Quick Menu kini menjadi
"Menu Pintas / Deep Dive" berisi 5 tautan. Rincian verifikasi di `VERIFICATION.md`.

## Known Limitations (dicatat V10.2)

- **Dual source of truth untuk daftar proyek**: `renderProjects()` di `work.js`
  membaca `DATA.projects` dari `src/data/content.js`, sementara halaman `/work`
  dan `/work/[slug]` dirender Astro dari content collection (`src/content/work/*.md`).
  Keduanya harus disinkronkan manual saat menambah proyek baru. Belum disatukan
  di V10.2 (di luar scope); kandidat iterasi berikutnya.
- WebGL Curl pada `/work` diverifikasi statik + gate path saja di lingkungan
  headless (tanpa GPU); uji distorsi visual butuh browser nyata dengan hardware
  acceleration. Detail di `VERIFICATION.md`.
- Audit V10.0 menemukan komentar orphan lain yang tidak masuk scope V10.2
  (mis. komentar "Social icon redraw (5.6.1)" di `about.js`); dibiarkan apa
  adanya sesuai aturan anti-perluasan-scope.

## Menjalankan

```bash
npm install        # atau: bun install
npm run dev        # dev server di http://localhost:4321
npm run build      # build statis ke dist/
npm run preview    # menyajikan hasil build
```

Folder `dist/` yang disertakan adalah hasil build siap tayang. Untuk menyajikannya
dengan clean URL (`/work`, bukan `/work.html`), gunakan static server apa pun,
misalnya `npx serve dist`, atau deploy ke Vercel (`vercel.json` sudah disertakan
dengan `cleanUrls: true`).

## Struktur (Hub-and-Spoke)

```text
src/
├── content.config.ts        # Skema Content Collection "work"
├── content/work/            # Proyek sebagai Markdown (AQI + 2 slot reserved)
├── data/content.js          # Seluruh data statis (pengganti portfolio-data.js)
├── layouts/BaseLayout.astro # Head/SEO/font + Header + Footer + global
├── components/
│   ├── layout/              # Header (navigasi antar halaman), Footer
│   ├── home/                # Hero (Data Atlas, profil pixel, pencarian arsip)
│   └── work/                # ProjectCard, ReservedCard
├── pages/
│   ├── index.astro          # Pucuk: Hero + Selected Work + ringkasan About/Contact
│   ├── work/index.astro     # Arsip proyek + filter kategori
│   ├── work/[slug].astro    # Halaman case study per proyek
│   ├── about.astro          # Curious by default + Curiosity Map + Journey
│   ├── archive/index.astro  # Hub arsip + GitHub activity
│   ├── archive/play.astro   # Game Deck (INSERT COIN)
│   ├── archive/credentials.astro
│   ├── archive/off-screen.astro  # Pixel pet + hobi + Spotify + Companion
│   └── connect.astro        # Social + Contact + Closing
├── scripts/
│   ├── core.js              # Helper bersama + registry motion + bootPage
│   ├── global.js            # Lenis, header, opening experience, dekorasi sitewide
│   ├── home.js              # Hero intro, Data Atlas, pencarian arsip
│   ├── work.js              # Filter, render kartu, reveal arah
│   ├── about.js             # Curiosity map, journey, skill constellation
│   ├── archive.js           # Game Deck utuh, credentials, off-screen, GitHub
│   ├── connect.js           # Copy email, ikon sosial, closing crosshair
│   └── generative-ambient.js  # Engine ambient Canvas 2D (V6.5, utuh)
└── styles/                  # global / home / work / about / archive / connect
```

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | Hero + Data Atlas, Selected Work (3 kartu), ringkasan About & Contact |
| `/work` | Arsip proyek: filter kategori (All work / Data & Research), slot reserved |
| `/work/aqi-cirebon` | Case study proyek AQI (dari Content Collection) |
| `/about` | Tentang, Languages & Tools, Skills, Curiosity Map, Learning Journey |
| `/archive` | Hub arsip (kartu besar ke Play/Credentials/Off-screen) + GitHub pulse |
| `/archive/play` | Game Deck: 11 game, scene pixel 16x16, stat bar jujur, Konami |
| `/archive/credentials` | Milestones & credentials (slot reserved jujur) |
| `/archive/off-screen` | Pixel pet, hobi (CURRENTLY + log), Spotify, Companion |
| `/connect` | Social grid, email (Copy), closing + motto |

## Fitur yang dipertahankan utuh

- Opening experience sekali per sesi (skip: klik / Escape / scroll / SKIP).
- Lenis smooth scroll, progress bar, quick menu "Menu Pintas / Deep Dive"
  (5 tautan: Off-screen, Credentials, Companion, GitHub profile, Docs archive;
  baris Now Playing tetap di atasnya, diisi JS saat ada data nyata).
- Navigasi utama: Home, Work, Games, About, GitHub (eksternal), Contact.
- Global Archive Navigator: pencarian hero kini menavigasi **antar halaman**
  (allowlist kata kunci tidak berubah; resolusi targetId memakai rute baru).
- Game Deck: INSERT COIN, entrance per genre, eject 4 fase, stat bar jujur.
- Companion: summon/dismiss, habitat + furnitur pixel, papan STATUS NAP/AWAY.
- Reduced motion dua arah (gsap.matchMedia), fallback IO+WAAPI tanpa GSAP.
- Spotify Now Playing di header (hanya tampil dengan data nyata).
- GitHub stats via REST API + cache satu jam + fallback jujur.

## Catatan migrasi (jejak V7.0)

- **Content Collections**: skema identik dengan spesifikasi; Astro 7 memakai
  Content Layer API (`src/content.config.ts` + `glob()` loader) pengganti
  `type: 'content'` lama. Tiga entri: `aqi-cirebon.md`, `ideas-in-progress.md`,
  `saham-indonesia.md` (dua terakhir adalah slot reserved yang jujur).
- **GSAP/Lenis dari npm**: `global.js` mengimpor dari `node_modules` lalu
  mendaftarkannya ke `window` agar seluruh logika V6.7 yang membaca
  `window.gsap` / `window.ScrollTrigger` / `window.Lenis` berjalan tanpa diubah.
- **Navigasi**: `data-section` / scroll spy dihapus; status aktif header diset
  saat build (`aria-current="page"`). `initActiveNav` tidak lagi diperlukan.
- **initAnchors** memakai delegasi dokumen agar tautan hasil render dinamis
  (chip hobi, SEE ALSO) tetap ter-smooth-scroll.
- **Pencarian arsip**: `targetId` dipetakan ke rute Hub-and-Spoke
  (`SEARCH_PAGE_ROUTES`); tujuan di halaman yang sama tetap smooth scroll.
- **Kartu proyek**: halaman `/work` merender grid awal statis dari Content
  Collection (fallback tanpa JS identik); interaksi filter tetap memakai
  `renderProjects()` dari `DATA` dengan perilaku V6.7 (reserved hanya di
  view All, tidak dihitung).
- **Data**: `src/data/content.js` adalah `portfolio-data.js` V6.7 kata per kata
  (modul ES6); perubahan hanya path aset (`/assets/...`) dan tautan antar
  halaman (`#work` menjadi `/work`).
- **CSS**: `styles.css` V6.7 dipecah otomatis per halaman (klasifikasi selector,
  media query dipecah mengikuti rule). Halaman yang memakai komponen lintas
  berkas (mis. homepage memakai komponen About/Contact) memuat CSS halaman
  tersebut juga. Tidak ada satu pun nilai aturan yang diubah.

## Catatan V7.4 (Cinematic View Transitions & Motion Lifecycle)

- **Fase 1 - ClientRouter**: `ClientRouter` dari `astro:transitions` dipasang di
  `<head>` `BaseLayout.astro`; `<main id="main">` diberi `transition:animate="fade"`
  sehingga tiap pergantian halaman melakukan cross-fade tanpa flash putih. Header,
  footer, dan overlay opening berada di luar grup fade. Browser tanpa View Transitions
  API (mis. Firefox) otomatis memakai fallback simulasi bawaan Astro.
- **Fase 2 - Morph kartu ke case study**: `.project-cover` (kartu) dan
  `.case-study-cover` (halaman detail) memakai nama transisi identik
  `project-image-<slug>` (`<slug>` = id entri Content Collection, mis.
  `project-image-aqi-cirebon`). Nama yang sama dipasang juga pada render JavaScript
  (`work.js` `projectCardMarkup` via `style.viewTransitionName`) sehingga morph tetap
  bekerja setelah `renderProjects()` membangun ulang grid saat boot maupun saat filter.
  Slot reserved tidak diberi nama transisi (tidak punya halaman detail).
- **Penyesuaian tautan kartu (jujur dilaporkan)**: sejak V6.7 kartu proyek nyata
  menaut langsung ke dataset eksternal ("Open dataset source"), karena versi satu
  halaman belum punya halaman detail. Spek V7.4 mensyaratkan kartu bisa diklik menuju
  halaman detail untuk morph, sehingga kartu proyek ber-slug kini menaut ke case study
  ("Read case study", internal). Tautan dataset eksternal tidak hilang: tetap tersedia
  sebagai tombol CTA di halaman detailnya. Slot reserved tetap tanpa tautan.
- **Fase 3 - Siklus hidup JavaScript (kunci utama)**: `bootPage()` di `core.js` kini
  memicu inisialisasi pada event **`astro:page-load`** (bukan lagi hanya
  `DOMContentLoaded`). Router Astro menjamin urutan: `swap()` mengganti DOM, modul
  halaman yang belum pernah dieksekusi dijalankan, lalu `astro:page-load` dipicu -
  jadi setiap bootPage (global + per halaman) menjalankan render/interaksi/motion
  tepat satu kali per muatan halaman, dengan latch epoch anti boot ganda.
- **Teardown navigasi**: pada `astro:after-swap` seluruh motion halaman lama dimatikan:
  semua konteks `gsap.matchMedia()` di-revert (termasuk fungsi cleanups halaman),
  registry dibersihkan (listener terlacak, timer, interval, observer, tween,
  ticker callback), sisa ScrollTrigger dibunuh, timeline global disapu, dan Lenis
  dihancurkan. Halaman baru memulai dari kondisi bersih; Lenis dibuat ulang oleh
  boot global. Diuji bebas akumulasi: jumlah ScrollTrigger per halaman stabil
  (home 25, about 17) setelah beberapa round trip.
- **`ScrollTrigger.refresh()` di akhir inisialisasi** sesuai spek, agar posisi trigger
  dihitung ulang terhadap tinggi halaman yang baru.
- **Listener level dokumen/window dilacak** (`trackMotionListener`) di `global.js`,
  `home.js`, dan `archive.js` (delegasi anchor, quick menu, drawer mobile, progress
  bar, visibilitychange, Konami, resize) supaya terlepas saat teardown dan tidak
  menumpuk antar navigasi. Interval polling Now Playing didaftarkan ke registry.
- **`archive.js` satu modul empat halaman**: konfigurasi boot per halaman arsip
  (hub, play, credentials, off-screen) kini di-resolve pada setiap `astro:page-load`
  lewat opsi `resolve` (kunci halaman dibaca dari `data-page`), karena modul hanya
  dieksekusi sekali per sesi browser.
- **Engine ambient generatif**: `generative-ambient.js` mengekspos `remount()`;
  dipanggil boot global pada setiap muatan halaman untuk memasang ulang canvas
  halaman baru setelah DOM diganti (observer dibuat ulang; no-op saat reduced motion
  atau di bawah 900px, sesuai aturan V6.5).
- **Reduced motion**: blok CSS `@media (prefers-reduced-motion: reduce)` mematikan
  animasi `::view-transition-*` dan fallback `data-astro-transition-fallback`, sehingga
  pengguna yang meminta pengurangan gerak mendapat pergantian halaman langsung
  tanpa animasi.
- **Batasan Absolut terpenuhi**: memakai `ClientRouter` bawaan Astro (tanpa Swup/
  Barba.js), Lenis + GSAP ScrollTrigger tetap berfungsi di halaman tujuan navigasi,
  inisialisasi memakai `astro:page-load`, dan tanpa em dash (U+2014).
- Terverifikasi di browser headless (build preview): 11 halaman boot sempurna lewat
  navigasi client-side maupun back/forward, morph terpicu satu kali per navigasi
  (`startViewTransition` terpanggil, animasi berjalan lalu beres), Game Deck
  INSERT/EJECT, filter 3-1-3, copy email, Konami, drawer mobile, dan sticky footer
  semuanya berfungsi pada halaman yang dikunjungi lewat transisi.

## Catatan V7.3 (Mobile Navigation & Responsive)

- **Hamburger drawer**: `#mobile-menu-toggle` (ikon 3 garis SVG) tampil hanya
  di `@media (max-width: 980px)`; `.menu-dots` dan `.main-nav` disembunyikan di
  rentang itu. Laci `#mobile-menu-drawer` (`position: fixed; inset: 0`, latar
  `var(--bg)`, animasi slide-in `mobile-drawer-in` 0.32s) berisi 6 tautan utama
  (dirender dari array `NAV` yang sama dengan nav desktop, lengkap status
  aktif `aria-current`) + pemisah + label mono "DEEP DIVE" + 4 tautan deep dive.
- **Logika (Vanilla JS)**: `initMobileMenu()` di `global.js` (Fase 2) - toggle
  buka/tutup dengan `aria-expanded`, kunci scroll latar (`body overflow
  hidden`) selagi terbuka, tutup otomatis saat tautan diklik, tutup via Escape
  dengan fokus kembali ke tombol hamburger. Tanpa library baru.
- **Dua jebakan teknis yang dibereskan** (semua di dalam media query, jadi
  desktop tak tersentuh): (1) `backdrop-filter` header menjadikannya containing
  block bagi descendants `position: fixed`, yang akan mengunci laci ke kotak
  header - di mobile `backdrop-filter` dilepas; (2) `.companion-pet` berada di
  `z-index: 90` root sedangkan header `z-index: 20` - di mobile header naik ke
  `z-index: 95` agar laci menutupi pet. Kill-switch `min-width: 981px` mencegah
  laci dirender di desktop walaupun state `hidden` tertinggal saat resize.
- **Anti-tumpuk homepage (≤700px)**: `.hero` satu kolom (`padding 20px/40px`,
  `min-height: auto`, `overflow: visible`), `.hero-visual` min-height 350px
  terpusat, `.floating-tool` disembunyikan, `.pixel-frame` 90% max 320px dengan
  `rotate(-3deg)`, `.hero-sticker` `scale(0.8) rotate(5deg)` di sudut,
  `.data-atlas` `inset: 0; opacity: 0.5` (latar samar di dalam kotak visual).
- **Catatan teknis `!important`**: tween entrance GSAP (home.js) menulis inline
  transform yang selalu mengalahkan CSS biasa, sehingga nilai spesifikasi
  `rotate(-3deg)` / `scale(0.8)` dipatok via `!important` ter-scope ≤700px -
  tanpa menyentuh logika JS, dan animasi desktop tetap utuh.
- **Grid satu kolom (≤700px)**: `.project-grid` (homepage + `/work`) dan
  `.social-grid` (`/connect`) menjadi `grid-template-columns: 1fr` agar tidak
  ada kartu terpotong. Aturan diedit di sumbernya (work.css, connect.css).
- `body { overflow-x: hidden }` sudah ada sejak V7.1 dan diverifikasi:
  horizontal scroll terkunci (sisa poke elemen dekoratif terpotong rapi).
- Spasi antar section dan `.section-heading` (kolom di mobile) diverifikasi
  tidak ada elemen teks yang menabrak ornamen/stamp.
- **Batasan Absolut terpenuhi**: perubahan hanya pada viewport ≤980px, JS
  vanilla tanpa library baru, estetika Editorial/Archive dipertahankan (token
  warna, mono label, hairline border), tanpa em dash (U+2014).

## Catatan V7.1 (UI Cleanup)

- **Sticky footer**: `html, body { height: 100% }`, `body` flex column dengan
  `min-height: 100vh`, `main { flex: 1 0 auto }`, `footer { flex-shrink: 0 }`.
  Halaman pendek (mis. `/connect` di viewport tinggi) tidak lagi menyisakan
  white gap di bawah footer. Flexbox murni, tanpa trik `absolute`/margin manual.
- **Artefak kotak abu-abu**: aturan `.grain-overlay` salah pindah ke
  `archive.css` saat ekstraksi V7.0, sehingga di halaman non-archive SVG grain
  dirender sebagai blok dalam flow (kotak abu-abu bertekstur). Aturan
  `position: fixed` dipulihkan ke `global.css` (identik V6.7): `inset: 0`,
  `z-index: 1`, `opacity: 0.06`, `mix-blend-mode: multiply`, `pointer-events: none`.
- **Navigasi utama**: enam pintasan (Home, Work, Games, About, GitHub, Contact).
  GitHub adalah tautan eksternal (`target="_blank" rel="noopener noreferrer"`).
- **Quick Menu**: hanya 5 tautan Menu Pintas / Deep Dive + baris Now Playing.
  Enam tautan internal redundan dihapus.
- **Penyimpangan terdokumentasi**: spesifikasi menyarankan tautan Companion ke
  `/archive/play#companion`, tetapi audit DOM membuktikan `id="companion"` hanya
  ada di halaman `/archive/off-screen`. Href dipertahankan ke
  `/archive/off-screen#companion` agar deep link berfungsi (bukan anchor mati).
- Logika JavaScript **tidak disentuh sama sekali** (Batasan absolut V7.1).
- **Tanpa em dash (U+2014)** di seluruh file aplikasi; pemisah memakai
  middle dot (`·`), slash, atau tanda hubung biasa.

## Mengubah konten

- Proyek: tambah/ubah file Markdown di `src/content/work/` (skema memvalidasi).
- Data lain (hero, about, journey, game deck, sosial, kontak, dekorasi):
  `src/data/content.js`, dengan aturan yang sama seperti V6.7: hanya
  informasi nyata dan terverifikasi, slot kosong dilabeli jujur.
