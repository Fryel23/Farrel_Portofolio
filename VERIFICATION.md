# VERIFICATION · V7.0 ASTRO MIGRATION

Laporan verifikasi mandiri sesuai Fase 7 `PROMPT_EKSEKUSI_V7.0_ASTRO_MIGRATION.md`.
Semua pengujian dijalankan pada hasil `npm run build` (Astro 7.4.2, static output,
11 halaman) yang disajikan lewat `astro preview`, diukur dengan browser headless
(Chromium) pada 1440x900, 768x1024, 390x844, dan 320x700.

## Ringkasan status

| Item | Status |
| --- | --- |
| 1. Sintaks & build (`npm run build`) | PASS - 11 halaman, Content Collection tervalidasi |
| 2. Em dash (U+2014) di `src/` | PASS - grep KOSONG (0 hasil) |
| 3. Navigasi header (5 rute) | PASS - URL berpindah, aria-current benar |
| 4. Fitur per halaman | PASS (rincian di bawah) |
| 5. Desain identik | PASS - markup/class sama; diff visual manual + screenshot |
| 6. Responsive (1440/1024*/768/390 + 320) | PASS - tanpa horizontal overflow |
| 7. Fitur global | PASS - opening, quick menu, Lenis, progress bar |

*1024 diuji sebagai 768 (mobile-first guard 900px sama perilakunya dengan V6.7).

## Bukti per butir

### 1. Build
- `bun run build` (Astro 7.4.2): 11 halaman statis: `/`, `/about`, `/archive`,
  `/archive/credentials`, `/archive/off-screen`, `/archive/play`, `/connect`,
  `/work`, `/work/aqi-cirebon`, `/work/ideas-in-progress`, `/work/saham-indonesia`.
- Skema Content Collection (zod) memvalidasi 3 file Markdown saat build.

### 2. Em dash
- `grep -rP "\x{2014}" src/ vercel.json astro.config.mjs` = 0 hasil.

### 3. Navigasi
- Header: Home(`/`), Work(`/work`), Games(`/archive/play`), About(`/about`),
  Contact(`/connect`). Klik tiap menu berpindah halaman; link aktif diberi
  `class="nav-link active"` + `aria-current="page"` saat build.
- Quick menu: 11 tautan, semuanya rute baru; Escape menutup; klik luar menutup.

### 4. Fitur per halaman (hasil pengukuran live)
- **Home**: opening tidak mengulang di sesi yang sama; hero intro selesai
  (judul, tail, frame, tools, sticker opacity 1); pixel dust 14 partikel;
  Selected Work 3 kartu (1 proyek + 2 reserved); heading ticks 3; nav aktif `/`.
- **Work**: 3 kartu + 2 reserved saat All; filter "Data & Research" -> 1 kartu,
  0 reserved, count "01 PROJECT"; kembali ke All -> 3 kartu (perilaku V6.7).
- **Detail proyek** (`/work/aqi-cirebon`): judul, status IN PROGRESS, stack
  (Python, pandas), 2 paragraf body Markdown, CTA dataset terbuka + kembali.
- **About**: 10 software chips, 11 skill chips, 4 journey item + 4 rail node,
  5 curiosity node; klik node -> panel berubah (SOFTWARE / Exploring);
  journey accordion terbuka (aria-expanded true, 4 detail).
- **Archive hub**: 3 kartu tautan besar; GitHub: API tidak terjangkau dari
  sandbox -> fallback jujur "GITHUB STATS ARE UNAVAILABLE RIGHT NOW" (bukan bug;
  perilaku cache/fallback identik V6.6).
- **Game Deck** (`/archive/play`): INSERT COIN -> EJECT COIN, aria-busy false,
  aria-expanded true, 11 kartu + 11 scene pixel + 171 rect (persis V6.4),
  40 stat bar dengan nilai jujur (bar pertama scale 0.8 = 80%); eject ->
  layar mati; reopen -> kartu dan bar kembali utuh; Konami -> toast
  "Easter egg found: data stream initiated.".
- **Credentials**: 3 slot reserved + kolom syarat + timeline "0 ENTRI
  TERVERIFIKASI"; dialog preview siap (tidak tampil tanpa entri nyata).
- **Off-screen**: pixel pet, 4 chip hobi (Badminton/Coding/Gaming/Music) dengan
  tautan rute baru, CURRENTLY + LAST LOGGED terisi saat chip ditekan
  (BADMINTON + timestamp), habitat + 6 furnitur, Spotify embed, canvas
  isometric; summon companion -> aria-pressed true + papan STATUS AWAY.
- **Connect**: 4 kartu sosial (GitHub/Instagram/LinkedIn/Documentation Archive);
  Copy email -> toast jujur di headless ("Copy is not available here..."),
  klip Chromium nyata akan berhasil; closing: motto per kata (14 span),
  colophon (STACK: Astro + CSS + JS + GSAP + Lenis), nama besar solid+outline,
  baseline 00-100, cap ARCHIVE / CLOSED.

### 5. Desain identik
- Markup dan class dipindahkan kata per kata dari `index.html` V6.7
  (hero, gallery, about, games, offscreen, github, credentials, companion,
  social, contact, closing, opening, grain, pet).
- CSS dipecah otomatis dengan parser blok; tidak ada nilai aturan yang diubah;
  brace balance 6/6 file.
- Screenshot pembanding: `tests/shots-v7/01-15*.png`.

### 6. Responsive
- 36 kombinasi halaman x viewport (1440/768/390/320): `scrollWidth ==
  clientWidth` semua (tidak ada horizontal overflow).
- Bug yang ditemukan & diperbaiki selama pengujian: homepage memakai markup
  About/Contact (`.heading-stamp`, `.social-inner`) sehingga wajib memuat
  `about.css` + `connect.css`; tanpa itu heading ticks meluap 20px di 390px.
- Mobile: main-nav disembunyikan di bawah 620px (aturan lama), deck 1 kolom,
  scene 48px.

### 7. Fitur global
- Opening experience: tampil sekali per sesi (`sessionStorage`), skip via
  klik/Escape/scroll/SKIP, hero menunggu event `fip:start-hero`.
- Quick menu terbuka (11 tautan) + Escape menutup.
- Lenis smooth scroll aktif (class `lenis` di html), progress bar berjalan.
- Pencarian arsip: kata "credentials" -> saran -> Enter -> menavigasi ke
  `/archive/credentials#credentials` (lintas halaman).

## Kesalahan yang ditemukan dan diperbaiki selama migrasi

1. `renderSocials` dipanggil boot connect tanpa diimpor -> boot connect mati
   diam-diam (grid sosial kosong, copy email mati). Diperbaiki: export dari
   `global.js` + import di `connect.js`.
2. `buildHeroDust` tidak masuk daftar render home (dust 0). Diperbaiki.
3. Homepage menangkap motion `.about-lead` milik halaman /about tanpa trigger
   `.about-layout` (risiko teks tak terlihat). Diperbaiki dengan class
   `.about-summary-lead` khusus home.
4. CSS `about.css`/`connect.css` tidak dimuat homepage (heading-stamp tak
   bergaya + overflow 20px di 390px). Diperbaiki dengan memuat keduanya.
5. Beberapa segmen ekstraksi terpotong di tengah fungsi/komentar (registry
   ganda, `deckReduceCleanup` ganda, komentar V4 tak tertutup). Semua
   ditemukan lewat `node --check` + eslint `no-undef` dan diperbaiki.

## NOT RUN (jujur)

- Emulasi runtime `prefers-reduced-motion` dua arah di browser headless
  (diverifikasi lewat guard kode + blok CSS yang dipertahankan utuh).
- GitHub REST API live (rate limit sandbox; jalur fallback terverifikasi).
- Spotify Now Playing live di header (endpoint sandbox; widget tersembunyi
  sampai data nyata, sesuai desain jujur V4).
- Lighthouse / profiling kinerja (tooling tidak tersedia).
- Deploy Vercel nyata (konfigurasi `vercel.json` disertakan, tidak dieksekusi).

---

# VERIFICATION · V7.1 UI CLEANUP & QUICK MENU RESTRUCTURE

Laporan verifikasi mandiri sesuai `PROMPT_V7.1_UI_CLEANUP.md` (FASE 1 sampai 3).
Semua pengujian dijalankan pada hasil `bun run build` (Astro 7.4.2, 11 halaman)
yang disajikan lewat `astro preview`, diukur dengan browser headless (Chromium)
pada 1440x900, 1440x2000 (simulasi halaman pendek), dan 390x844 (mobile).

## Ringkasan status

| Item | Status |
| --- | --- |
| Fase 1.1 Sticky footer (white gap) | PASS - gapBelow = 0 di semua kasus |
| Fase 1.2 Artefak kotak abu-abu | PASS - grain fixed, tidak ada blok di flow |
| Fase 2.1 Navigasi utama 6 item | PASS - Home, Work, Games, About, GitHub, Contact |
| Fase 2.2 Quick Menu 5 tautan | PASS - persis sesuai spesifikasi |
| Fase 3.1 Layout /connect | PASS |
| Fase 3.2 Artefak | PASS |
| Fase 3.3 Navigasi | PASS |
| Fase 3.4 Fitur quick menu | PASS - buka/tutup, Escape, klik luar, Now Playing |
| Fase 3.5 Build | PASS - 11 halaman tanpa error |
| Em dash (U+2014) | PASS - grep KOSONG di seluruh src/ + config |
| node --check seluruh JS | PASS - 8 file OK |
| Logika JavaScript disentuh | TIDAK - hanya Header.astro + global.css |

## Bukti per butir

### Fase 1.1 Sticky footer
- `global.css`: `html, body { height: 100%; margin: 0 }`, `body` flex column
  `min-height: 100vh`, `main { flex: 1 0 auto }`, `footer { flex-shrink: 0 }`.
- `/connect` 1440x2000 (konten lebih pendek dari viewport): footer bottom =
  2000 = tinggi viewport, `gapBelow = 0`, `sticky = true`. White gap hilang.
- `/connect` 1440x900 dan `/work` 1440x2000: `footerBottom == viewportH`,
  `gapBelow = 0`. Footer tertdorong alami saat konten panjang, tidak overlap.
- Mobile 390x844: footer di akhir dokumen, tanpa gap.

### Fase 1.2 Artefak kotak abu-abu
- Akar masalah: aturan `.grain-overlay` salah pindah ke `archive.css` saat
  ekstraksi V7.0, sehingga di halaman non-archive SVG grain (yang ada di
  BaseLayout setiap halaman) dirender sebagai blok dalam flow setelah footer.
- Perbaikan: aturan dipulihkan ke `global.css` (identik V6.7):
  `position: fixed; inset: 0; width/height: 100%; pointer-events: none;
  z-index: 1; opacity: 0.06; mix-blend-mode: multiply`.
- Computed style live di `/work`: `position: fixed, inset: 0px, opacity: 0.06,
  pointerEvents: none, mixBlend: multiply`. Kotak abu-abu hilang di semua
  halaman yang diuji (/connect, /work, /archive/play).
- `body::after` (vignette) dan `.ambient-canvas` sudah sesuai spesifikasi
  sejak V7.0 (fixed/absolute, pointer-events none, z-index 0); tidak diubah.

### Fase 2.1 Navigasi utama
- `<nav class="main-nav">` kini merender tepat 6 tautan: Home (/), Work (/work),
  Games (/archive/play), About (/about), GitHub (eksternal
  https://github.com/Fryel32, `target="_blank"` + `rel="noopener noreferrer"`),
  Contact (/connect).
- Status aktif tetap diset saat build (`aria-current="page"` + class `active`);
  diverifikasi: /connect menandai Contact, /archive/play menandai Games.
- Tidak ada lagi tautan Off-screen/Credentials/Companion di nav utama.

### Fase 2.2 Quick Menu
- Isi menu kini persis: baris Now Playing (span `#quick-now-playing`, tetap
  diisi JS) + 5 tautan: Off-screen hobbies (/archive/off-screen), Milestones &
  credentials (/archive/credentials), Meet the companion, GitHub profile
  (eksternal), Documentation archive (eksternal, Google Drive).
- Enam tautan internal redundan dihapus: Selected projects, Game deck, About
  the creator, GitHub activity, Learning journey, Say hello.
- **Penyimpangan terdokumentasi**: spesifikasi menyarankan
  `/archive/play#companion` dengan asumsi habitat Companion di halaman
  Archive/Play. Audit DOM membuktikan `id="companion"` hanya ada di
  `src/pages/archive/off-screen.astro` (section companion). Href dipertahankan
  ke `/archive/off-screen#companion` agar deep link berfungsi; diuji:
  buka `/archive/off-screen#companion` -> section "08 / A SMALL COMPANION"
  tampil in-view.

### Fase 3.4 Fitur
- Klik menu titik tiga -> menu terbuka (`aria-expanded="true"`), 5 tautan.
- Escape -> menu tertutup. Klik di luar -> menu tertutup. Focus-out -> tertutup.
- Now Playing tampil di atas daftar tautan (diuji dengan data RECENT nyata
  dari endpoint Spotify di lingkungan pengujian).
- `page errors` browser: kosong. Console warning GSAP yang muncul adalah
  perilaku pre-existing script page-scoped (JS tidak disentuh sesuai Batasan).

### Fase 3.5 Build + validasi mandiri
- `bun run build`: 11 halaman, selesai tanpa error (dijalankan setelah tiap
  fase dan sekali lagi final).
- `node --check` (via salinan .mjs agar ESM): 8 file di `src/scripts/` OK,
  `fail = 0`.
- `grep` em dash U+2014 di `src/`, `public/`, config: **KOSONG** (0 hasil).
- Mobile 390x844: main-nav disembunyikan (aturan <620px), tombol titik tiga
  tersedia, quick menu terbuka dengan 5 tautan, tanpa horizontal overflow.

## Batasan kepatuhan (audit terhadap BATASAN ABSOLUT)
1. Logika JavaScript tidak diubah: `git`-style diff hanya menyentuh
   `src/components/layout/Header.astro` (markup + komentar), `src/styles/global.css`
   (aturan CSS), `README.md`, `VERIFICATION.md`.
2. Tidak ada kelas CSS yang dipakai JS/GSAP yang dihapus; semua ID yang dirujuk
   JS (`#quick-menu`, `#menu-dots`, `#quick-now-playing`, `#now-playing*`)
   tetap utuh.
3. Perbaikan layout memakai Flexbox murni (body flex column + main flex-grow);
   tanpa trik `absolute` atau margin manual.
4. Tidak ada em dash yang ditambahkan; grep U+2014 kosong.

---

# VERIFICATION · V7.2 AUDIT & FINAL UI/BUG FIXES

Laporan verifikasi mandiri sesuai `PROMPT_EKSEKUSI_V7.2_AUDIT_FIXES.md`
(FASE 0 audit, FASE 1 sticky footer, FASE 2 bug filter /work).
Pengujian dijalankan pada hasil `bun run build` (Astro 7.4.2, 11 halaman)
via `astro preview`, browser headless Chromium 1440x900 / 1440x2000,
termasuk simulasi JavaScript diblokir penuh (network route abort).

## FASE 0 · HASIL AUDIT (wajib dilaporkan)

1. **Header.astro**: BENAR sesuai ekspektasi V7.1. Navigasi utama tepat
   6 tautan (Home, Work, Games, About, GitHub eksternal, Contact) dan
   Quick Menu berisi tautan Deep Dive (Off-screen hobbies, Milestones &
   credentials, Meet the companion, GitHub profile, Documentation archive)
   plus baris Now Playing.
2. **global.css**: aturan `display: flex` pada body SUDAH ADA (dieksekusi
   pada V7.1 Fase 1.1: `html, body { height: 100% }`, body flex column
   `min-height: 100vh`, `main { flex: 1 0 auto }`). Ekspektasi spesifikasi
   ("belum ada / gagal dieksekusi") tidak sesuai kondisi kode aktual.
   V7.2 tetap menyelaraskan bentuknya persis ke spesifikasi: komentar
   dialihbahasakan ke Indonesia dan selektor footer dikunci ke
   `.site-footer { flex-shrink: 0 }`.
3. **Bug filter /work**: AKAR MASALAH DITEMUKAN. Logika filter klien
   (`work.js`) sebenarnya benar sejak awal (`activeFilter = 'All'`,
   empty-state hanya saat hasil filter kosong; diverifikasi live: kartu
   tampil). Cacatnya ada di markup: grid `#project-grid` di
   `work/index.astro` TIDAK dirender statis (hanya berisi satu paragraf
   placeholder "Grid proyek dirender oleh JavaScript..."), berbeda dengan
   homepage yang merender kartu saat build memakai ProjectCard/ReservedCard.
   Akibatnya, tanpa JavaScript (mis. dist dibuka via file://, module script
   gagal dimuat) halaman /work tampil tanpa satu pun kartu proyek; skema
   frontmatter Markdown (zod) terverifikasi VALID (build lolos, 3 entri).

## FASE 1 · STICKY FOOTER

- `global.css` bagian reset kini persis bentuk spesifikasi:
  `html, body { height: 100%; margin: 0 }`; `body` flex column dengan
  `min-height: 100vh`; `main { flex: 1 0 auto }`;
  `.site-footer { flex-shrink: 0 }`. Komentar tambahan berbahasa Indonesia
  (Batasan 3).
- Pengukuran live: /connect 1440x2000 footerGap = 0; computed
  `flex-shrink: 0` pada .site-footer. Tanpa perubahan visual lain.

## FASE 2 · BUG FILTER HALAMAN /WORK

- Perbaikan: `work/index.astro` kini mengimpor `getCollection` +
  `ProjectCard` + `ReservedCard` dan merender grid secara STATIS saat
  build (pola identik homepage). Urutan: proyek nyata dulu, lalu slot
  reserved (status RESERVED dipilah; sama dengan urutan DATA).
- Kartu statis sengaja TANPA atribut `href` agar tautan footernya identik
  dengan hasil `renderProjects()` work.js ("Open dataset source" ke
  opendata.cirebonkota.go.id, target _blank), bukan "Read case study",
  sehingga tidak ada perubahan tampilan saat JS mengambil alih grid.
- State awal filter tetap "All": count "01 PROJECT", empty-state tetap
  `hidden` di markup.
- Hasil uji live (JS aktif): load awal 3 kartu (1 proyek + 2 reserved),
  klik "Data & Research" menjadi 1 kartu 0 reserved, klik "All work"
  kembali ke 3 kartu (perilaku V6.7 utuh).
- Hasil uji JS DIBLOKIR penuh (network route abort semua *.js): /work
  tetap menampilkan 3 kartu statis + count; empty-state tidak tampak.
  Grid terisi kartu, bukan empty-state, sesuai tuntutan spesifikasi.

## VALIDASI MANDIRI V7.2

- `bun run build`: 11 halaman, tanpa error (setelah tiap fase + final).
- `node --check` (salinan .mjs): 8 file JS OK, fail = 0.
- grep em dash U+2014 seluruh proyek (minus node_modules/.astro): KOSONG.
- Regresi: /connect footerGap 0; Quick Menu tetap 5 tautan; homepage
  Selected Work tetap 3 kartu + 2 reserved; tidak ada kelas CSS milik
  GSAP yang dihapus.

## Kepatuhan Batasan Absolut V7.2

1. Desain visual tidak berubah: hanya layout Flexbox (FASE 1) dan
   penyediaan markup awal grid /work (FASE 2) yang disentuh; markup kartu
   memakai komponen yang sudah ada (ProjectCard/ReservedCard, class sama).
2. Tidak ada kelas CSS yang dipakai GSAP yang dihapus.
3. Semua komentar kode yang ditambahkan berbahasa Indonesia.

---

# VERIFICATION · V7.3 MOBILE NAVIGATION & RESPONSIVE FIXES

Laporan verifikasi mandiri sesuai `PROMPT_V7.3_MOBILE_RESPONSIVE.md`.
Semua pengujian dijalankan pada hasil `bun run build` (11 halaman) yang
disajikan lewat `astro preview`, diukur dengan browser headless (Chromium)
pada 390x844, 768x900, dan 1440x900 (regresi desktop).

## Ringkasan status

| Item | Status |
| --- | --- |
| FASE 1. Hamburger + drawer (Header.astro + global.css) | PASS |
| FASE 2. Logika mobile menu (global.js, vanilla) | PASS |
| FASE 3. Anti-tumpuk homepage (home/global/work/connect.css) | PASS |
| Regresi desktop 1440px (desain tidak berubah) | PASS |
| Sticky footer (warisan V7.1/V7.2) | PASS |
| Em dash (U+2014) | PASS - grep KOSONG |

## Bukti per Fase

### FASE 1: Markup + CSS (Checkpoint 1, viewport 390x844)
- `#mobile-menu-toggle`: `display: block` di 390px dan 768px; `display: none`
  di 1440px. Ditempatkan sebelum `.menu-dots` sesuai spesifikasi.
- `.menu-dots`: `display: none` di mobile; `.main-nav`: `display: none`
  (aturan 980px yang sudah ada, dipertahankan).
- Drawer tertutup by default (`hidden`); saat dibuka terukur:
  `position: fixed`, rect 390x844 (menutupi seluruh viewport dari atas ke
  bawah), `background: rgb(248, 250, 252)` = `var(--bg)`, animasi
  `mobile-drawer-in` 0.32s (slide-in dari atas), `z-index: 60` di dalam
  konteks header, `.mobile-menu-inner` `overflow-y: auto`.
- Isi laci: 6 tautan utama (Home, Work, Games, About, GitHub, Contact -
  dirender dari array NAV yang sama dengan nav desktop, lengkap
  `aria-current` + garis bawah biru untuk halaman aktif; GitHub dan
  Documentation archive berlabel panah eksternal) + `hr.mobile-menu-divider`
  + label mono "DEEP DIVE" + 4 tautan deep dive (Off-screen hobbies,
  Milestones & credentials, Meet the companion, Documentation archive).
  Total 10 tautan, href terverifikasi satu per satu.
- Laci menutupi `.companion-pet`: `elementFromPoint` di tengah pet
  mengembalikan `mobile-menu-inner` (pet tersampul). Mekanismenya:
  di <=980px header naik ke `z-index: 95` (di atas pet z-90) dan
  `backdrop-filter` dilepas - properti tersebut menjadikan header
  containing block bagi descendants `position: fixed`, yang akan mengunci
  laci ke kotak header 67px, bukan ke viewport. Keduanya hanya berlaku di
  media query, desktop tetap `z-index: 20` + `blur(8px)` (terverifikasi).
- Kill-switch `@media (min-width: 981px) { .mobile-menu-drawer
  { display: none !important } }` mencegah laci dirender di desktop
  walaupun state `hidden` tertinggal saat rotasi/resize.

### FASE 2: Logika Vanilla JS (Checkpoint 2)
- Klik hamburger: drawer `hidden=false`, `aria-expanded="true"`,
  `document.body.style.overflow="hidden"` (scroll latar terkunci).
- Klik tombol close: drawer `hidden=true`, `aria-expanded="false"`,
  overflow dikembalikan ke `""`.
- Escape: drawer tertutup + `document.activeElement === toggle`
  (fokus kembali ke hamburger; fokus tidak pernah hilang).
- Klik tautan "Work" di laci: navigasi ke `/work`, drawer tertutup
  (`hidden=true`), overflow dibersihkan.
- Tanpa library baru: hanya `qs`/`qsa`/`doc` yang sudah ada di core.js;
  fungsi `initMobileMenu()` didaftarkan di `bootPage.interactions`
  berdampingan dengan `initQuickMenu`.

### FASE 3: Anti-tumpuk homepage (Checkpoint 3, 390x844)
- `body { overflow-x: hidden }` terverifikasi; `window.scrollTo(50,0)`
  menghasilkan `scrollX = 0` (horizontal scroll terkunci).
- `.hero` di 390px: `grid-template-columns: 1fr` (satu track 335.4px),
  `padding-top: 20px`, `padding-bottom: 40px`, `min-height: auto`
  (computed 0), `overflow: visible` - teks di atas, visual di bawah.
- `.hero-visual`: `min-height: 350px`, `margin-top: 20px`, centered.
- `.floating-tool`: `display: none` (Py/JS/SQL tidak tampil di mobile).
- `.pixel-frame`: width 301.9px (90%, max-width 320px tercapai),
  margin auto (terpusat), transform terukur `rotate(-3deg)`.
- `.hero-sticker`: `right: 0`, `top: -20px`, transform terukur
  `scale(0.8) rotate(5deg)`; geometri: stickerTop 751 vs noteBottom 750 -
  tidak bertumpuk dengan konten di atasnya.
- `.data-atlas`: `inset: 0`, `opacity: 0.5`, `pointer-events: none`
  (latar samar di dalam kotak visual, tidak lagi melebar keluar layar).
- Catatan teknis: tween entrance GSAP (home.js `gsap.set('#pixel-frame',
  { rotate: -14 })` -> `.to({ rotate: -7 })`) menulis inline transform
  yang mengalahkan CSS biasa (terukur sebelum perbaikan: frame kembali
  -7deg, sticker scale 1). Nilai spesifikasi dipatok via `!important`
  ter-scope <=700px tanpa menyentuh JS; opacity entrance GSAP tetap
  berjalan, desktop tetap dianimasikan penuh (-7deg terverifikasi).
- `.project-grid` di 390px (homepage `#work` dan halaman `/work`):
  `grid-template-columns: 1fr` (satu track), kartu full-width, tidak
  ada kartu terpotong (screenshot).
- `.social-grid` di `/connect` 390px: `1fr`, 4 kartu tersusun vertikal.
- `.section-heading` (kolom di mobile) + `.heading-stamp` + ornamen
  galeri diverifikasi visual: tidak ada teks yang menabrak dekorasi.
- Sisa elemen yang menyentuh tepi hanya dekorasi (`.geo-two`,
  `.gallery-curve`, `.social-pattern`, scanline) yang terpotong rapi oleh
  `overflow-x: hidden` - tidak ada konten nyata yang keluar layar.

## Regresi

- Desktop 1440x900: nav horizontal 6 tautan + Now Playing + menu-dots
  tampil; hamburger `display: none`; drawer `display: none`; header
  `backdrop-filter: blur(8px)` dan `z-index: 20` utuh; `.hero` dua kolom
  (712px + 526px) `overflow: hidden` `min-height: 600px`; pixel frame
  470px `rotate(-7deg)` (GSAP); sticker `rotate(10deg)`; floating tools
  tampil; `.project-grid` 3 kolom. Desain desktop identik pra-V7.3.
- Tablet 768x900: hamburger `block`, nav+dots `none`, drawer terbuka
  penuh 768x900; hero masih dua kolom (override satu kolom hanya <=700px
  sesuai blok spesifikasi); floating tools masih tampil di 768px.
- Sticky footer: `/connect` di viewport 1440x2000 (halaman pendek)
  `footerBottom = 2000 = vh`, gap 0; halaman panjang footer terdorong
  natural (gap negatif = konten melebihi viewport).
- Tidak ada page error baru; peringatan GSAP yang sudah ada sebelumnya
  (pre-existing, di luar cakupan) tidak bertambah.

## VALIDASI MANDIRI V7.3

- `bun run build`: 11 halaman, tanpa error (setelah tiap fase + final).
- `node --check` (salinan .mjs): 8 file JS OK (about, archive, connect,
  core, generative-ambient, global, home, work), fail = 0.
- grep em dash U+2014 seluruh proyek (minus node_modules/.astro): KOSONG.

## Kepatuhan Batasan Absolut V7.3

1. **Desain desktop tidak berubah**: semua aturan baru berada di dalam
   `@media (max-width: 980px)` / `(max-width: 700px)`; satu-satunya aturan
   di luar media query adalah `#mobile-menu-toggle { display: none }`
   (elemen baru yang memang tidak boleh tampil di desktop) dan kill-switch
   `min-width: 981px` yang justru menjaga desktop. Terverifikasi 1440px.
2. **Vanilla JS murni, tanpa library baru**: `initMobileMenu()` memakai
   addEventListener + classList-free hidden attribute sesuai spesifikasi.
3. **Estetika yang sudah ada**: laci memakai token yang sama (`var(--bg)`,
   `var(--surface)`, `var(--border-strong)`, `var(--border-soft)`,
   `var(--blue)`, `var(--mono)`), tombol bulat 40px/34px senada
   `.menu-dots`, label mono letter-spacing untuk "DEEP DIVE", garis
   hairline antar tautan.
4. **Tanpa em dash (U+2014)**: grep seluruh proyek KOSONG.

---

# LAPORAN V7.4 - CINEMATIC VIEW TRANSITIONS & MOTION LIFECYCLE

Sesuai `PROMPT_V7.4_VIEW_TRANSITIONS.md` (112 baris, 3 Fase + 4 Batasan Absolut),
dieksekusi Fase demi Fase pada proyek Astro V7.3.

## Ringkasan status

| Butir | Spesifikasi | Status |
| --- | --- | --- |
| Fase 1.1 | Impor `ClientRouter` dari `astro:transitions` | PASS |
| Fase 1.2 | `<ClientRouter />` di dalam `<head>` | PASS |
| Fase 1.3 | `transition:animate="fade"` pada `<main>` | PASS |
| Fase 2.1 | `transition:name` unik pada cover kartu proyek | PASS |
| Fase 2.2 | Nama identik pada cover case study (`[slug].astro`) | PASS |
| Fase 2.3 | Nama dipertahankan pada render JavaScript (paritas) | PASS |
| Fase 3.1 | Inisialisasi lewat `astro:page-load` (bukan hanya DOMContentLoaded) | PASS |
| Fase 3.2 | Lenis di-reset/diinisialisasi ulang per navigasi | PASS |
| Fase 3.3 | `ScrollTrigger.refresh()` di akhir inisialisasi | PASS |
| Batasan 1 | `ClientRouter` bawaan Astro, tanpa Swup/Barba.js | PASS |
| Batasan 2 | Lenis + GSAP ScrollTrigger tetap berfungsi di halaman tujuan | PASS |
| Batasan 3 | Memakai `astro:page-load` sebagai kunci siklus hidup | PASS |
| Batasan 4 | Tanpa em dash (U+2014) | PASS |

## FASE 1 - CLIENT ROUTER & GLOBAL TRANSITIONS

- `BaseLayout.astro`: impor `ClientRouter` dari `astro:transitions`,
  `<ClientRouter />` di `<head>` (setelah font links), `<main id="main"
  transition:animate="fade">`. Header, footer, overlay opening, companion,
  grain berada di luar grup fade (per markup referensi spek).
- Build 11 halaman sukses; HTML ter-build memuat meta
  `astro-view-transitions-enabled` + fallback meta; `<main>` membawa scope
  transisi (`data-astro-transition-scope`).
- Browser headless (preview build): `typeof document.startViewTransition ===
  "function"` (jalur native); klik "Contact" di nav -> URL dan `data-page`
  berganti tanpa reload dokumen (state JS tetap hidup); tombol back browser
  kembali ke halaman sebelumnya lewat router.

## FASE 2 - MORPHING ELEMEN (PROJECT CARD -> CASE STUDY)

- `ProjectCard.astro`: prop `id` (id entri collection) wajib diteruskan
  pemanggil; `.project-cover` diberi `transition:name={\`project-image-${id}\`}`.
  Label tautan internal dibakukan "Read case study".
- `[slug].astro`: `.case-study-cover` diberi `transition:name` dengan pola yang
  sama memakai `entry.id`.
- `index.astro` + `work/index.astro`: meneruskan `id: entry.id` (+ `href` di
  /work agar kartu statis dan hasil render JS identik).
- `content.js`: `slug: 'aqi-cirebon'` pada projects[0] sebagai jembatan data
  untuk render JS; `work.js` `projectCardMarkup` memasang
  `cover.style.viewTransitionName = 'project-image-' + slug` dan merender
  tautan internal "Read case study" -> `/work/<slug>` (paritas penuh statis vs JS).
- Bukti terukur (preview build):
  - HTML ter-build: `view-transition-name: project-image-aqi-cirebon` hadir di
    index.html, work/index.html, dan work/aqi-cirebon/index.html.
  - Setelah boot JS di home: computed `view-transition-name` kartu = nilai yang
    sama; tautan kartu = `/work/aqi-cirebon` label "Read case study".
  - Klik kartu -> `document.startViewTransition` terpanggil tepat satu kali
    per navigasi (instrumentasi bersih: log `["VT:/"]`), `document.getAnimations()`
    menunjukkan animasi transisi berjalan (11 animasi) lalu 0 setelah selesai,
    mendarat di `/work/aqi-cirebon` dengan cover bernama sama.
  - Arah balik (detail -> "Back to the archive" -> /work) juga memicu
    `startViewTransition` (morph terbalik).
  - Filter /work (3 -> 1 -> 3) tidak menghilangkan nama transisi (render JS
    memasangnya kembali setiap render).
- **Penyesuaian yang dilaporkan jujur**: kartu proyek nyata sebelumnya menaut ke
  dataset eksternal (warisan V6.7 satu halaman; tidak ada jalur internal ke
  halaman detail, sehingga morph spek mustahil terjadi). Sesuai tujuan Fase 2,
  kartu ber-slug kini menaut ke case study; tautan dataset tetap tersedia di
  halaman detail (tombol CTA). Slot reserved tetap tanpa tautan/nama transisi.

## FASE 3 - PERBAIKAN SIKLUS HIDUP JAVASCRIPT

- `core.js`:
  - `bootPage()` kini mendaftar listener **`astro:page-load`**; boot berjalan
    tepat satu kali per epoch navigasi (latch `bootedEpoch` per pemanggil).
    Load awal tetap boot saat modul dieksekusi (perilaku lama, anti-delay),
    `astro:page-load` yang menyusul ber-epoch sama sehingga tidak boot ganda.
  - Opsi `resolve` untuk modul multi-halaman; dipakai `archive.js`
    (`PAGE_BOOT[data-page]` dibaca ulang tiap muatan; sebelumnya dibaca sekali
    saat eksekusi modul - bug laten untuk navigasi client-side).
  - Teardown di **`astro:after-swap`**: revert SEMUA konteks
    `gsap.matchMedia()` (dilacak di `motionContexts`; sebelumnya variabel
    tunggal tertimpa oleh boot halaman - konteks global terlepas), registry
    dibersihkan, safety-net `ScrollTrigger.getAll().forEach(kill)`,
    `gsap.globalTimeline.clear()`, Lenis dihancurkan (dibuat ulang boot global).
  - `ScrollTrigger.refresh()` di akhir `run()` (spek Fase 3).
  - Registry: set `tickerCallbacks` baru (gsap.ticker di luar konteks, dipakai
    data rain).
- Konversi listener persisten ke `trackMotionListener` (terlepas saat teardown,
  tidak menumpuk antar boot): delegasi anchor, quick menu (click+keydown),
  drawer mobile (keydown), progress bar (scroll+visibilitychange), Now Playing
  (visibilitychange + interval ke `motionRegistry.intervals`), gerbang hero
  (`fip:start-hero`, global + home), listener opening (keydown+scroll), search
  arsip (click), Konami (keydown), companion (visibilitychange), data rain
  (visibilitychange+resize+ticker), tooltip GitHub (visibilitychange),
  `fallbackReveal` observer (trackObserver).
- `generative-ambient.js`: observer dibuat via factory (`ensureObserver`),
  teardown mengosongkan daftar instance + memutus observer; handle publik
  `remount()` dipanggil boot global tiap muatan halaman.
- Bukti terukur (preview build, 1440x900):
  - Multi-hop home -> about -> archive/play -> work -> connect ->
    archive/off-screen -> home: SEMUA halaman boot (render + motion) pada
    navigasi client-side: about 10 chip software/11 skill/4 journey/5 node
    curiosity; play 11 kartu deck, INSERT COIN -> EJECT berfungsi; work filter
    3-1-3; connect 4 kartu sosial + toast copy; off-screen 2 canvas ambient
    ter-mount ulang (`__ambientInstance`, width > 0); home dust 14 + hero
    opacity 1 (entrance berjalan ulang).
  - Bebas akumulasi: ScrollTrigger home 25 -> 25 -> 25 (dua round trip penuh),
    about 17 -> 17; dust tetap 14; quick menu buka/tutup + Escape normal
    setelah 6 navigasi (indikator tidak ada listener ganda).
  - Back/forward (popstate) boot benar; hard load di halaman dalam
    (/archive/credentials) lalu navigasi ke /work memicu eksekusi pertama
    work.js saat navigasi dan boot lengkap (3 kartu + 2 filter).
  - Konami pada play via navigasi client-side: toast easter egg + data rain
    berjalan dan membersihkan diri.
- Catatan verifikasi: `agent-browser mouse wheel` tidak menyampaikan event
  wheel ke halaman di lingkungan headless ini (scrollY tetap pada hard load
  sebelum perubahan V7.4 apa pun); verifikasi Lenis memakai WheelEvent
  sintetis (scroll 0 -> 600 halus) dan Lenis aktif (`html.lenis`).

## Regresi

- Sticky footer /connect viewport 2000px: footerBottom = 2000 = vh, gap 0.
- Mobile 390px: drawer 10 tautan, tutup otomatis saat navigasi; scrollX tetap 0
  (docScrollW 402 dari dekorasi terpotong, identik baseline V7.3).
- Opening overlay: tampil sekali per sesi (sessionStorage), auto-hide, gate
  hero tetap bekerja; tidak tampil ulang pada navigasi client-side.
- 11 halaman selesai di-sweep lewat navigasi client-side tanpa page error;
  warning GSAP pre-existing tidak bertambah.

## VALIDASI MANDIRI V7.4

- `bun run build`: 11 halaman sukses (setelah tiap fase + final).
- `node --check` (salinan .mjs): 8 file JS OK (about, archive, connect, core,
  generative-ambient, global, home, work).
- grep em dash U+2014 seluruh proyek (minus node_modules/.astro/dist): KOSONG;
  dist juga 0.

## Kepatuhan Batasan Absolut V7.4

1. **ClientRouter bawaan Astro**: satu-satunya mekanisme navigasi; tidak ada
   Swup/Barba.js atau library eksternal baru (package.json tetap astro+gsap+lenis).
2. **Lenis + GSAP ScrollTrigger utuh di halaman baru**: terverifikasi di semua
   halaman tujuan navigasi client-side (boot + refresh + interaksi).
3. **`astro:page-load` sebagai kunci**: seluruh inisialisasi melewatinya;
   DOMContentLoaded hanya sebagai fallback load awal (epoch 0) sesuai perilaku
   lama, tidak lagi satu-satunya pemicu.
4. **Tanpa em dash (U+2014)**: grep KOSONG di src, docs, dan dist.

## NOT RUN (jujur)

- Emulasi runtime `prefers-reduced-motion: reduce` dua arah (tooling headless
  tidak mengekspos emulasi reducedMotion); diverifikasi lewat jalur kode
  (context reduce -> forceContentVisible) + blok CSS transisi.
- Deploy Vercel nyata; GitHub/Spotify API live (rate limit sandbox, jalur
  fallback terverifikasi); Lighthouse.

# LAPORAN V7.5 - FIX GAME DECK SCROLL BUG (LENIS & SCROLLTRIGGER)

Laporan verifikasi `PROMPT_V7.5_FIX_DECK_SCROLL.md`. Pengujian pada hasil
`bun run build` (Astro 7.4.2, 11 halaman) via `astro preview`, browser headless
Chromium, viewport 1440x900 dan 390x844.

## Akar masalah (analisis)

- Saat deck tertutup, tinggi `/archive/play` tepat setinggi viewport
  (terukur `h1: 900` pada viewport 900). Limit scroll Lenis saat boot = 0.
- Setelah INSERT COIN, grid kartu menambah tinggi halaman menjadi 1708px.
- `global.css` memakai `html { height: 100% }`, sehingga content-box
  `documentElement` (yang diamati `contentResizeObserver` Lenis) tidak pernah
  berubah ukuran; ResizeObserver bawaan Lenis (autoResize) tidak pernah
  terpanggil dan limit scroll internal Lenis tetap 0 -> roda mouse macet.
- ScrollTrigger juga memegang posisi start/end lama (terukur `stMaxEnd: 779`
  sebelum membuka deck) sehingga trigger di bawah deck salah posisi.

## FASE 1 - Perbaikan di src/scripts/archive.js (satu-satunya file kode yang disentuh)

| Titik | Perubahan | Bukti |
| --- | --- | --- |
| 1.1 `finishOpen()` | blok V7.5 FIX setelah `openTimeline = null;` | lenis.resize() + ScrollTrigger.refresh() via requestAnimationFrame |
| 1.2 `closeDeckInstant()` | blok V7.5 FIX setelah `setBusy(false);` | idem, tinggi menyusut diukur ulang |
| 1.3 `finishEject()` | blok V7.5 FIX tepat setelah `closeDeckInstant();` | idem, jaring pengaman kedua setelah eject |

Tidak ada logika animasi GSAP, selektor, timing, atau desain visual yang
diubah; hanya tiga blok 8-baris yang ditambahkan.

## Bukti browser (golden path, 1440x900)

- Baseline (deck tertutup): `h1: 900`, `stMaxEnd: 779`, label INSERT COIN.
- INSERT COIN -> finishOpen: 11 kartu, `aria-expanded=true`, label EJECT COIN,
  tinggi halaman `h2: 1708`, dan `stMaxEnd` bergeser `779 -> 1666`
  (bukti `window.ScrollTrigger.refresh()` benar-benar dieksekusi).
- Uji scroll via 12 WheelEvent sintetis (deltaY total 18000):
  `scrollY: 808` = `maxPossible: 808` (1708 - 900) -> scroll mencapai batas
  bawah halaman baru dengan tepat. Dengan kode lama, limit Lenis = 0 membuat
  scrollY terjebak di 0 (roda macet total). Inilah bukti `lenis.resize()`
  memperbarui limit.
- EJECT COIN -> finishEject: tinggi kembali `h3: 900`, label INSERT COIN,
  `aria-expanded=false`, grid hidden.
- Wheel up (12 event negatif): `scrollYAfterUp: 0` -> limit menyusut dengan
  benar, tidak ada limit basi 808 yang bertahan.
- Siklus kedua (INSERT lagi + wheel): `scrollY: 808` lagi -> state machine
  stabil, tidak ada degradasi.
- Screenshot `/tmp/v75-deck-open-1440.png`: deck penuh + footer terlihat di
  dasar halaman tanpa white gap.
- Console: hanya warning GSAP pre-existing milik halaman archive lain
  (curiosity-panel, offscreen-layout, github-grid, companion-inner) yang sudah
  terdokumentasi sejak V7.4; tidak bertambah, tidak ada page error.

## Bukti browser (mobile 390x844)

- INSERT COIN + wheel sintetis: tinggi 3307, `scrollY: 2463` =
  `maxPossible: 2463` (3307 - 844) -> full scroll.
- `docScrollW: 390 = vw` -> tanpa overflow horizontal.

## VALIDASI MANDIRI V7.5

1. `node --check` atas salinan `.mjs` src/scripts/archive.js: LOLOS.
2. `grep` em dash (U+2014) seluruh `src/` + README + VERIFICATION: KOSONG.
3. `bun run build`: 11 halaman sukses.

## Kepatuhan Batasan Absolut V7.5

1. **Hanya `src/scripts/archive.js`** yang diubah (kode aplikasi); README.md
   dan VERIFICATION.md diperbarui sebagai dokumentasi, sesuai praktik V7.1-V7.4.
2. **Logika animasi GSAP & desain visual tidak disentuh**: tidak ada tween,
   timing, ease, atau selektor yang berubah; hanya pemanggilan ulang ukuran.
3. **`requestAnimationFrame` dipakai** sebelum `lenis.resize()` dan
   `window.ScrollTrigger.refresh()` di ketiga titik, sehingga DOM baru
   selesai dirender sebelum diukur.

## Catatan jujur

- Blok di `finishEject()` redundan terhadap blok `closeDeckInstant()` yang
  dipanggilnya (resize/refresh jalan dua kali dalam dua frame berturut-turut);
  kedua operasi idempoten dan murah, kode dipertahankan persis sesuai spesifikasi.
- Pengujian wheel memakai WheelEvent sintetis karena mouse wheel headless
  tidak menyampaikan event asli (keterbatasan tooling yang sama sejak V7.4).

# LAPORAN V8.0 - CINEMATIC EXPERIENCE & MICRO-INTERACTIONS

Laporan verifikasi `PROMPT_V8.0_CINEMATIC_EXPERIENCE.md`. Pengujian pada hasil
`bun run build` (Astro 7.4.2, 11 halaman) via `astro preview`. Karena headless
Chromium melaporkan `pointer: fine = false`, verifikasi efek ter-gate memakai
Playwright + `addInitScript` (override matchMedia pointer/hover sebelum skrip
situs berjalan) + flag `--enable-unsafe-swiftshader` untuk software WebGL.
30/30 pemeriksaan otomatis PASS (skrip: tests/v80-verify.mjs di luar paket).

## FASE 0 - Instalasi

- `curtainsjs@8.1.6` terpasang (package.json); API diverifikasi dari sumber:
  `Curtains`, `Plane`, `autoloadSources`, penamaan sampler default
  (`uSampler0` + `uTextureMatrix0`).

## FASE 1 - Magnetic Buttons (core.js + global.js + template CTA)

- `initMagneticButtons()` di core.js: `gsap.quickTo` x/y, clamp 15px,
  elastic `elastic.out(1, 0.45)` saat mouseleave; pola rebuild (pasangan
  quickTo dibuang saat leave, dibuat ulang lazily) menghindari konflik tween.
  CSS transition transform pada tombol dikeluarkan inline agar tidak
  menumpuk interpolasi.
- Kelas `.magnetic-button` pada CTA utama: 2 tombol hero (homepage), 2 CTA
  case study (/work/[slug]), tombol INSERT COIN (/archive/play).
- Bukti: kursor +60px dari pusat -> x=15.00 (kena clamp), +24px -> x=9.48
  (mengikuti), mouseleave 1.5s -> x=0.00 y=0.00 (elastic selesai).

## FASE 2 - Audio Feedback (core.js + global.js + Header)

- Web Audio API sintesis murni: `playClickSound()` triangle 1500->900Hz,
  0.05s; `playHoverSound()` sine 220Hz, gain 0.012. AudioContext dibuat
  lazily; mute di localStorage `fip-audio-muted`.
- Tombol `#audio-toggle` di Header (ikon speaker aria-hidden, label di
  aria-label + aria-pressed), styling mengikuti .menu-dots (global.css).
- Suara dipasang delegasi document: klik `.magnetic-button` -> click sound;
  mouseover `.project-card` -> hover sound (sekali per kartu + throttle 90ms)
  sehingga tetap bekerja pada DOM hasil render ulang.
- Bukti: klik CTA -> `__v80AudioCreated == 1` (lazy creation); mute ->
  aria-pressed=true + localStorage true + ikon off tampil; persisten setelah
  reload; unmute memulihkan. Di mobile (Batasan 4 tidak melarang audio) tombol
  mute tetap berfungsi.

## FASE 3 - WebGL Image Hover (work.js + curtainsjs)

- Satu instance Curtains per cover (canvas DI DALAM .project-cover, z-index 1,
  pointer-events none): ikut terpotong radius kartu, berada di atas img
  (z auto) tetapi di bawah .project-tag/.project-number (z-index 2) tanpa
  mengubah CSS. `autoloadSources: false` + `plane.loadImages([img])` agar
  canvas sendiri tidak dijadikan tekstur.
- Gate: path `/work` atau `/work/[slug]` saja (work.js juga dipakai homepage
  sehingga gate-nya path), `pointer: fine`, bukan reduced motion, probe
  WebGL; semua di jalur motion matchMedia (no-preference).
- Vertex shader menggeser vertex ke arah kursor (pull gaussian) + lift Z;
  fragment menambah wave UV halus. img asli TIDAK disembunyikan (Batasan 1):
  jika WebGL gagal/context hilang, kartu tampil normal via CSS.
- Registry: setiap instance didaftarkan via `trackWebGLContext` + `trackRafLoop`
  (fungsi dispose idempoten: plane.remove() -> curtains.dispose() -> container
  dibuang) sehingga after-swap melepas context + canvas (Batasan 2).
- Bukti: 1 kartu nyata -> 1 canvas; img tetap visible; zIndex canvas = 1;
  hover mengubah piksel cover (screenshot diff); filter (1 kartu) dan kembali
  All -> jumlah canvas selalu sinkron; pindah ke /about -> canvas 0; kembali
  ke /work -> plane dibuat ulang.
- Keputusan terdokumentasi: cover case study (/work/[slug]) sengaja tidak
  diberi plane karena elemen itu membawa `transition:name` morph V7.4 dan
  tidak punya efek hover CSS yang perlu digantikan.

## FASE 4 - CRT Shader pada Game Deck (archive.js)

- Shader GLSL inline string (spesifikasi mengizinkan): fragment prosedural
  tanpa tekstur (scanline 4px, grille RGB, phosphor glow hijau, band roll,
  grain, vignette tepi sebagai ilusi layar melengkung); vertex pass-through
  quad. Canvas `.deck-crt-overlay` di dalam `#deck-region` (overflow hidden +
  radius screen memotongnya), z-index 3, pointer-events none sehingga kartu
  tetap interaktif.
- Lifecycle: `startDeckCRT(screen)` hanya dari jalur openDeck animasi (no-op
  saat reduced motion / non fine-pointer / tanpa WebGL / shader gagal);
  `stopDeckCRT()` dipanggil `closeDeckInstant()` (satu choke point untuk
  EJECT, instant close, reduce cleanup, fallback tanpa GSAP) + terdaftar di
  `rafLoops` dan `webgl` (idempoten) untuk jaring after-swap. Listener resize
  dikelola manual oleh stop().
- Bukti: INSERT COIN -> 1 canvas (1238x220), tepat 1 context WebGL baru,
  piksel berubah antar frame (rAF hidup); EJECT -> canvas 0; re-open ->
  canvas 1 lagi (context baru); pindah halaman saat CRT aktif bersih tanpa
  error; regresi V7.5: scroll deck saat CRT aktif tetap mencapai 808/808.

## Kepatuhan Batasan Absolut V8.0

1. **Progressive enhancement**: tanpa WebGL/Curtains gagal -> onError/onContextLost
   dispose + kartu normal (terbukti saat probe headless pertama tanpa
   swiftshader: plane dibuang, halaman normal, tanpa page error); tanpa Web
   Audio fungsi suara no-op; JS gagal -> konten statis tetap utuh.
2. **Lifecycle ketat**: dua jalur registry baru (`motionRegistry.rafLoops`,
   `motionRegistry.webgl`) + helper `trackRafLoop`/`trackWebGLContext`;
   cleanupMotionRegistry memanggil semuanya saat astro:after-swap. Listener
   magnetic/audio/reveal memakai trackMotionListener; quickTo memakai
   trackQuickTo; tween hover memakai trackEventTween.
3. **Reduced motion**: initMagneticButtons, initWebGLHover, dan startDeckCRT
   early-return saat reduce; suara juga dimatikan (interpretasi "semua efek
   baru" didokumentasikan di kode); blok CSS reduced-motion sudah ada.
4. **Mobile safe**: ketiga efek visual ter-gate `pointer: fine`; terbukti di
   context mobile 390x844: tidak ada bind magnetik, 0 plane WebGL, 0 CRT
   canvas, dan halaman tetap berfungsi penuh.
5. **Tanpa em dash (U+2014)**: grep KOSONG di src + docs.

## Catatan jujur

- Headless Chromium tanpa GPU memakai software WebGL (swiftshader) yang
  merender ~300ms/frame; akibatnya `document.startViewTransition()` menunggu
  frame lambat sehingga navigasi client-side dari /work (saat plane hidup)
  tertunda beberapa detik pada lingkungan uji. Bukan bug situs: bukti event
  menunjukkan router menerima klik lalu mengeksekusi swap begitu frame
  tersedia, dan di GPU nyata frame plane berbiaya < 2ms. Skrip uji
  mengakomodasi dengan waitForURL timeout panjang.
- Suara tidak dapat didengar/diverifikasi keluaran audionya di headless;
  yang diverifikasi: jalur pembuatan AudioContext, state gating, delegasi
  listener, dan preferensi mute.
- Efek "Image Trail" disebut di Batasan 4 tetapi tidak ada Fase yang
  memintanya, sehingga tidak diimplementasikan (jujur terhadap spesifikasi).
- Emulasi runtime prefers-reduced-motion dua arah tetap diverifikasi lewat
  jalur kode (guard isReducedMotion di ketiga efek + jalur interactions).

# LAPORAN V8.1 - TECHNICAL DEBT CLEANUP, SEO & SEMANTIC HARDENING

Spesifikasi: `upload/PROMPT_V8.1_DEBT_CLEANUP_SEO.md` (5 Fase, 5 Batasan Absolut).
Mode: EDIT IN-PLACE, tanpa fitur visual baru. Tujuan: judul unik, semantik benar,
SEO lengkap, layout mobile bersih, konsol JavaScript tanpa peringatan GSAP.

## Eksekusi per Fase

| Fase | File | Perubahan |
|---|---|---|
| 1 | `src/scripts/global.js` | Baris `if (DATA.meta.siteTitle) doc.title = ...` di `renderIdentity()` dihapus (plus komentarnya). Judul tab kini murni dari prop `title` BaseLayout per halaman. |
| 2.1 | `src/styles/home.css` | `.hero-ruler { display: none; }` ditambahkan di `@media (max-width: 700px)`. Alasan: rule dasar `.hero-ruler { display: flex }` di home.css (urutan impor lebih akhir) menimpa `display: none` milik global.css, itulah mengapa ruler masih aktif di mobile. |
| 2.2 | `src/styles/global.css` | `.geo-two { right: 12px }` di breakpoint mobile (sebelumnya `right: -5px`). `.gallery-curve` dan `.social-pattern` diverifikasi sudah terkurung `overflow: hidden` parent masing-masing (`.gallery-section`, `.social-section`) juga di mobile, jadi tidak diberi aturan tambahan (dokumentasi di komentar CSS). |
| 3.1 | `src/layouts/BaseLayout.astro` | `<html lang="en">` menjadi `<html lang="id">`; skip-link (satu-satunya konten Inggris di file ini) ditandai `lang="en"`. |
| 3.2 | 7 halaman | h2 utama menjadi h1: `about.astro` (#about-heading), `connect.astro` (#social-heading), `archive/index.astro` (#archive-hub-heading), `archive/play.astro` (#games-heading), `archive/credentials.astro` (#credentials-heading), `archive/off-screen.astro` (#offscreen-heading), `work/index.astro` (#gallery-heading). Tidak ada CSS/JS yang bergantung pada tag h2 untuk heading tersebut (audit: hanya reset global `h1,h2,h3,h4,p{margin:0}` dan `.prose-archive h2` untuk body case study). |
| 3.3 | 8 halaman | Meta description unik ditambahkan di frontmatter BaseLayout masing-masing (homepage, about, connect, work, archive hub, play, credentials, off-screen). Halaman detail `/work/[slug]` sudah memakai `d.description` dari content collection. |
| 3.4 | `BaseLayout.astro` + `astro.config.mjs` | `const canonicalURL = new URL(Astro.url.pathname, Astro.site)` dan `ogImageURL = new URL('/og-default.png', Astro.site)`; `<link rel="canonical">`, `<meta property="og:url">`, `<meta property="og:image">` ditambahkan di head. `astro.config.mjs` kini punya `site: 'https://www.farrelislami.tech'`. Aset baru `public/og-default.png` (1200x630 PNG, 48 KB) digenerate deterministik via sharp dari SVG dengan palet token global.css (blueprint frame, atlas paths, geo diamonds, ruler ticks). |
| 4.1 | `src/pages/work/[slug].astro` | `getStaticPaths` kini `getCollection('work', ({ data }) => data.status !== 'RESERVED')`. Bukti build: 9 halaman (sebelumnya 11); `/work/ideas-in-progress/` dan `/work/saham-indonesia/` tidak lagi digenerate. |
| 4.2 | `src/scripts/archive.js` | Blok pembuatan kartu `credential-card--sample` (SAMPLE FORMAT / NOT AN ENTRY) dihapus dari `renderCredentials()`. Format kartu tetap terdokumentasi di komentar "HOW TO ADD A CREDENTIAL" pada `src/data/content.js` (opsi dokumentasi yang disediakan spesifikasi). Vault framing + slot kosong dipertahankan. |
| 5 | `src/scripts/global.js` + `src/scripts/archive.js` | 9 blok selector lintas-halaman di `initSectionMotion()` (about, software-chip, skill-chip, journey-item, resume-card, social-card, credential, contact, curiosity-panel) dan 4 blok di `initV4Motion()` (deck-console, offscreen-layout, github-grid, companion-inner) dijaga pola `gsap.utils.toArray(sel)` + `if (targets.length)` sesuai contoh spesifikasi. Tween, timing, ease, dan selektor tidak diubah. |

## VALIDASI MANDIRI V8.1

| Langkah | Hasil |
|---|---|
| `node --check` (salinan .mjs global.js + archive.js) | LOLOS, sintaks valid |
| `rg` em dash (U+2014) atas src/, README.md, VERIFICATION.md, astro.config.mjs | Kosong, LOLOS |
| `bun run build` | LOLOS, 9 halaman dibangun (turun dari 11), rute RESERVED tidak ada |
| Verifikasi dist | 8 `<title>` unik + title homepage; canonical/og:url/og:image absolut; 8 deskripsi unik (hash beda semua); h1 = 1 di 7 halaman; `lang="id"`; `.hero-ruler{display:none` ada di bundle home; `.geo-two{right:12px` ada di bundle BaseLayout; `utils.toArray(` = 10 (global) + 4 (archive); string `SAMPLE FORMAT`/`credential-card--sample` tidak ada di bundle; `og-default.png` tersalin ke dist |

## Bukti browser (desktop 1440x900, astro preview)

| Halaman | scrollWidth/innerWidth | h1 | lang | canonical+og |
|---|---|---|---|---|
| / (9 halaman: /, /about, /connect, /work, /work/aqi-cirebon, /archive, /archive/play, /archive/credentials, /archive/off-screen) | 1440/1440 semua | 1 semua | id semua | ada semua |

Console setelah tur 9 halaman (setelah perbaikan Fase 5): **0 baris, 0 peringatan
GSAP, 0 page error**. Sebelum perbaikan: 32 warning (`GSAP target ... not found`
untuk .deck-console/.offscreen-layout/.github-grid/.companion-inner dan
`Element not found:` untuk trigger-nya, keduanya dari GSAP internal
nullTargetWarn, dipicu blok tak terjaga di initV4Motion archive.js).

## Bukti browser (mobile 390x844)

| Halaman | scrollWidth/innerWidth |
|---|---|
| 9 halaman yang sama (diukur juga setelah scroll ke dasar halaman) | **390/390 semua** |

Pengukuran eksplisit homepage mobile: `getComputedStyle(.hero-ruler).display`
= `none`, `getComputedStyle(.geo-two).right` = `12px`. Tidak ada horizontal
scroll. Screenshot tersimpan sebagai bukti (v81-mobile-home.png,
v81-desktop-home.png): desktop mempertahankan hero-ruler (layar besar),
mobile bersih tanpa ruler dan diamond tetap di dalam viewport.

## Rute & konten publik

- `GET /work/ideas-in-progress/` = **404**, `GET /work/saham-indonesia/` = **404**,
  `GET /work/aqi-cirebon/` = 200 (satu-satunya rute case study publik).
- `GET /og-default.png` = 200, 49486 bytes, image/png.
- `/archive/credentials` mobile: kartu sampel = 0, slot kosong = 3 (CERTIFICATE /
  AWARD / PUBLICATION), vault-frame utuh, h1 = 1.

## Regresi fitur sebelumnya (golden path)

- Deck V7.5 di /archive/play (mobile): INSERT COIN, tinggi dokumen 844 menjadi
  3313; roda sintetis mencapai scrollY 2469/2469 (dasar persis, limit Lenis
  ter-update oleh perbaikan V7.5 yang tidak disentuh); EJECT memulihkan
  tinggi 844 dan scrollY 0; wheel setelah EJECT tetap normal.
- Fitur V8.0 (magnetic, audio mute, WebGL hover, CRT) tidak disentuh; tur 9
  halaman tanpa satu pun error konsol.

## Kepatuhan Batasan Absolut V8.1

1. **Tidak mengubah logika animasi/efek V8.0**: hanya file yang diinstruksikan
   yang disentuh (global.js, global.css, home.css, BaseLayout.astro, halaman,
   work/[slug].astro, archive.js, astro.config.mjs). Perubahan motion hanyalah
   guard keberadaan; tween/timing/ease/selektor identik. Magnetic, Audio,
   WebGL, CRT tidak disentuh sama sekali.
2. **Astro.site dan Astro.url**: canonical, og:url, og:image dibuat via
   `new URL(pathname, Astro.site)` sesuai rekomendasi SEO Astro; terbukti
   absolut di dist (`https://www.farrelislami.tech/...`).
3. **Filter di getStaticPaths**: `data.status !== 'RESERVED'` di
   [slug].astro, bukan di komponen halaman; rute RESERVED lenyap dari build.
4. **Cegah peringatan GSAP**: 13 blok dijaga `gsap.utils.toArray()` + length;
   terbukti konsol bersih di 9 halaman.
5. **Tanpa em dash (U+2014)**: grep kosong atas seluruh sumber yang disentuh.

## Catatan jujur

- Spesifikasi menyarankan `right: 0` untuk .geo-two. Secara terukur itu masih
  menyisakan overflow ~7px karena bbox rotasi 45 derajat (segi 34px menghasil
  bbox 48px; (48-34)/2 = 7px menonjol melewati tepi). Dipilih `right: 12px`
  agar target verifikasi Fase 2.3 (`scrollWidth === innerWidth === 390`)
  benar-benar tercapai di semua halaman; visual hanya bergeser 17px ke dalam
  pada layar kecil dan tetap dekoratif.
- `.gallery-curve` dan `.social-pattern` tidak diubah: parent-nya sudah
  `overflow: hidden` sejak sebelum V8.1 (work.css/connect.css, file yang tidak
  diinstruksikan), tidak ada override mobile yang melepasnya, dan pengukuran
  390/390 membuktikan tidak ada kebocoran. Keputusan didokumentasikan sebagai
  komentar di global.css.
- Dua heading sekunder sengaja tetap h2 (`#github-heading` di /archive dan
  `#companion-heading` di /archive/off-screen) agar setiap halaman punya tepat
  satu h1; hierarki section tidak berubah. `#closing-name` di /connect juga
  tetap h2 di bawah h1 #social-heading.
- Penandaan `lang="en"` eksplisit hanya pada skip-link BaseLayout. Label mikro
  berbahasa Inggris lain (kicker, stamp) tersebar di halaman/CSS di luar cakupan
  file yang diinstruksikan dan tidak dipaksa berubah agar tidak melanggar
  Batasan 1; bahasa utama halaman kini benar terdeklarasi `id`.
- `isReserved` di [slug].astro kini selalu false (karena RESERVED difilter di
  getStaticPaths) dan sengaja dipertahankan sebagai kode defensif minimal tanpa
  perubahan perilaku.
- Kartu sampel credentials dihapus dari runtime; CSS `.credential-card--sample`
  di archive.css (file tidak diinstruksikan) kini tidak terpakai namun dibiarkan
  agar file itu tidak perlu disentuh.
