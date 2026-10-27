# Farrel Islami Putra · Editorial Portfolio (Astro V7.3)

Portofolio pribadi berbasis **Astro 7** dengan arsitektur **Hub-and-Spoke (Pucuk-Cabang)**.
Migrasi total dari versi monolitik satu halaman (HTML/CSS/JS murni, V6.7) sesuai
`PROMPT_EKSEKUSI_V7.0_ASTRO_MIGRATION.md`. Desain visual, palet warna, tipografi,
animasi GSAP, dan seluruh fitur interaktif dipertahankan identik.

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
