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
