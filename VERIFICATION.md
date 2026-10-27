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
