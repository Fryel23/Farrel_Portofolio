# Farrel Islami Putra · Editorial Portfolio (Astro V7.0)

Portofolio pribadi berbasis **Astro 7** dengan arsitektur **Hub-and-Spoke (Pucuk-Cabang)**.
Migrasi total dari versi monolitik satu halaman (HTML/CSS/JS murni, V6.7) sesuai
`PROMPT_EKSEKUSI_V7.0_ASTRO_MIGRATION.md`. Desain visual, palet warna, tipografi,
animasi GSAP, dan seluruh fitur interaktif dipertahankan identik.

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
- Lenis smooth scroll, progress bar, quick menu (11 tautan lintas halaman).
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
- **Tanpa em dash (U+2014)** di seluruh file aplikasi; pemisah memakai
  middle dot (`·`), slash, atau tanda hubung biasa.

## Mengubah konten

- Proyek: tambah/ubah file Markdown di `src/content/work/` (skema memvalidasi).
- Data lain (hero, about, journey, game deck, sosial, kontak, dekorasi):
  `src/data/content.js`, dengan aturan yang sama seperti V6.7: hanya
  informasi nyata dan terverifikasi, slot kosong dilabeli jujur.
