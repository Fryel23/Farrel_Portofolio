# Farrel Islami Putra · The Living Archive (Astro V14.0-UNIFIED)

Repositori portofolio rekayasa perangkat lunak, riset analisis data terbuka, dan basis pengetahuan teknis milik **Farrel Islami Putra** (Mahasiswa S1 Teknik Informatika, Universitas Komputer Indonesia / UNIKOM, angkatan 2026).

- **Repositori Utama**: `https://github.com/Fryel23/Farrel_Portofolio` (Akun GitHub Utama: `@Fryel23`)
- **Arsip Eksperimen Awal**: `https://github.com/Fryel32` (`@Fryel32`)
- **Domain Publik**: `https://www.farrelislami.tech`

---

## 1. Ikhtisar Arsitektur V14.0 ("The Living Archive")

Situs ini dibangun di atas **Astro 7** dengan pendekatan **Static-First, Progressive Enhancement, dan Human-First UX Architecture**. Seluruh halaman dapat dibaca secara utuh tanpa JavaScript (SSR statis saat build), lalu diperkaya di sisi klien melalui arsitektur modul siklus hidup deterministik.

### Pilar Utama V14.0-UNIFIED

1. **Navigasi Primer 4-Item & Progressive Disclosure Mega-Drawer**:
   - Header utama difokuskan pada 4 tujuan primer manusiawi: **Beranda** (`/`), **Proyek** (`/work`), **Tentang** (`/about`), dan **Kontak** (`/connect`), ditambah tombol **Eksplorasi ▾** (`#menu-dots`).
   - **Mega-Drawer 2 Kolom** (`#quick-menu` / `#quick-menu-panel`) memisahkan **Eksplorasi Interaktif & Arsip Personal** (`/lab`, `/lab/csv`, `/archive/play`, `/archive/off-screen`, `/archive/credentials`) dari **Arsip Rekayasa & Dokumentasi Sistem** (`/codex`, `/archive/adr`, `/atlas`, `/lab/methodology`, GitHub `Fryel23/Farrel_Portofolio`, Google Drive).
2. **Homepage Hero Clarity, Quick Topic Navigator, & Split-Tone Exploration Bridge**:
   - Latar Swiss Technical Grid dengan tanda registrasi sudut `+` di belakang kanvas WebGL 3D Data-Terrain (`HeroCanvas.astro`).
   - Penomoran seksi berurutan tanpa lompatan (`01 / PERKENALAN`, `02 / STUDI KASUS UNGGULAN`, `03 / JEMBATAN EKSPLORASI`, `04 / PROFIL & KONTAK SINGKAT`).
   - **Quick Topic Navigator** (`#project-search`) dengan 4 pill lompatan instan ke topik terpenting (`/work/aqi-cirebon`, `/lab`, `/lab/csv`, `/codex`).
   - **Overlapping Split-Tone Bridge** (`#explore-bridge`) yang memisahkan jalur interaktif terang (`03A / INTERACTIVE SANDBOX`) dan jalur arsip teknis gelap (`03B / ENGINEERING ARCHIVE`).
3. **Pameran Studi Kasus Arsitektural (`/work` & `/work/[slug]`)**:
   - **Zona 1 (Flagship Case Study Exhibition Frame)**: Bingkai pameran layar penuh untuk proyek utama *Air Quality Index Trends · Cirebon (2021–2025)* dengan 4 penanda sudut tipografis (`01`, `CRB`, `ISPU`, `21–25`) dan ringkasan eksekutif 4 poin (Masalah, Metode, Temuan Utama, Dampak).
   - **Zona 2 (Compact Blueprint Ledger)**: Baris cetak biru teknis ringkas untuk slot rencana riset (`RESERVED`) tanpa kartu raksasa kosong.
   - **Sticky Case Study Layout**: Halaman detail `/work/aqi-cirebon` dilengkapi *Quick Case Study Digest* di bagian atas dan tata letak 2 kolom desktop dengan navigasi bab lengket (*sticky chapter navigation*).
4. **The Data Lab (`/lab`) · Air Aware Split Workbench**:
   - Strip pengantar manusiawi (*Cara Membaca Penjelajah Kualitas Udara Ini*) sebelum panel kontrol teknis.
   - **Segmented Toggle Pills** untuk Tahun (`2021`–`2025`, dengan penanda parsial pada `2025`) dan Parameter (`ISPU`, `SO₂`, `NO₂`) yang tersinkronisasi dua arah dengan elemen `<select>` semantik.
   - **ISPU Category Threshold Bands Plugin**: Plugin kanvas Chart.js kustom yang menggambar pita zona kategori ISPU PermenLHK P.14/2020 (`0–50` Baik, `51–100` Sedang, `101–200` Tidak Sehat, `>200` Sangat Tidak Sehat) tanpa menyambungkan titik data kosong (`spanGaps: false`).
   - **Interactive Spatial Station Map SVG (`#lab-station-map`)**: Peta skematik titik pantau kualitas udara Kota Cirebon (Koridor Jalan Utama, Kawasan Pelabuhan & Industri, Pusat Kota & Niaga, Pemukiman) yang terhubung langsung dengan pemilih lokasi.
5. **Halaman Tentang (`/about`) · Narasi 5-Babak & Asymmetric Bento Grid**:
   - Disusun secara kronologis ke dalam 5 babak: `01 / SIAPA SAYA`, `02 / MINAT & BIDANG EKSPLORASI` (Asymmetric Bento Grid 5 domain + Curiosity Map interaktif), `03 / BAHASA & TOOLS YANG DIPELAJARI`, `04 / PERJALANAN BELAJAR`, dan `05 / CARA SAYA BERPIKIR`.
6. **Astro Content Layer API (3 Koleksi Tervalidasi)**:
   - `work` (`src/content/work/*.md`): Studi kasus utama `aqi-cirebon` (`2021–2025`) dan 2 cetak biru `RESERVED`.
   - `adr` (`src/content/adr/*.md`): 13 rekaman laporan rekayasa dan audit historis (`V10.3` hingga `V12.3`) dengan verifikasi provenance SHA-256 otomatis terhadap berkas sumber.
   - `codex` (`src/content/codex/**/*.md`): 6 catatan fondasi *The Grand Codex* dalam taksonomi desimal `100`–`600` dilengkapi rumus MathML statis dan graf pengetahuan dua arah (*bidirectional backlink graph*).
7. **Selective TypeScript Hardening & Web Worker CSV Explorer (`/lab/csv`)**:
   - Modul komputasi murni (`src/scripts/lab/core/*.ts`, `src/scripts/lab/shared/stats.ts`, `src/scripts/lab/csv/*.ts`, `src/lib/*.ts`) diketik secara ketat dan dapat diimpor langsung oleh runtime Node.js untuk pengujian unit deterministik.
   - Pemrosesan CSV di `/lab/csv` berjalan di dalam Web Worker dengan sanitasi formula spreadsheet (anti CSV injection) dan batas ukuran memori.
8. **World OS Layer (Command Palette `Ctrl+K` & Sandboxed Reference Dock)**:
   - Indeks pencarian statis `/api/world-index.json` dimuat secara malas (*lazy-loaded*) hanya ketika pengguna membuka Command Palette (`Ctrl+K` / tombol `Cari / Pintasan · Ctrl+K`).
   - Mendukung perintah `:warp`, `:split`, `:audio`, dan `:top` serta panel baca berdampingan (*Reference Dock*) di desktop (`>= 1024px`) dengan `iframe sandbox=""` yang aman.

---

## 2. Daftar Rute Publik (34 Halaman Statis + 1 Endpoint JSON)

| Rute | Sektor / Wilayah | Deskripsi |
| --- | --- | --- |
| `/` | `01 / BERANDA` | Hero + WebGL Data-Terrain + Quick Topic Navigator + Pameran Studi Kasus + Split-Tone Exploration Bridge + Ringkasan Profil & Kontak |
| `/work` | `02 / PROYEK` | Zona 1 Flagship Exhibition Frame (`aqi-cirebon` 2021–2025) + Zona 2 Compact Blueprint Ledger (`RESERVED`) |
| `/work/aqi-cirebon` | `02 / STUDI KASUS` | Studi kasus mendalam kualitas udara Kota Cirebon (2021–2025) dengan Quick Digest Bar, Scroll Narrative 3 babak, dan Sticky Chapter Navigation |
| `/about` | `03 / TENTANG` | Narasi 5-babak: Siapa Saya, Asymmetric Bento Grid 5 Bidang & Curiosity Map, Bahasa & Tools, Perjalanan Belajar, dan Cara Saya Berpikir |
| `/connect` | `04 / KONTAK` | Profil sosial terverifikasi (`@Fryel23` & `@Fryel32`), salin alamat email resmi (Pribadi & UNIKOM), dan kolofon penutup |
| `/lab` | `LAB-01 / AQI EXPLORER` | Air Aware Split Workbench: Onboarding strip, Segmented Toggle Pills (2021–2025 & SO₂/NO₂/ISPU), grafik pita kategori ISPU, peta spasial Cirebon, dan tabel data |
| `/lab/methodology` | `LAB-02 / METHODOLOGY` | Dokumentasi rumus interpolasi linier ISPU PermenLHK P.14/2020, perbedaan basis waktu pengukuran, dan catatan anomali data sumber |
| `/lab/csv` | `LAB-03 / CSV EXPLORER` | Penjelajah file CSV lokal berbasis Web Worker dengan deteksi tipe kolom, kuartil metode R-7, dan grafik garis interaktif |
| `/codex` | `CODEX / 100-600` | Hub *The Grand Codex* (taksonomi desimal 100–600), graf pengetahuan kanvas 2D berbatas, dan daftar navigasi aksesibel |
| `/codex/[...slug]` | `CODEX / DETAIL` | 6 halaman catatan teknis mendalam dengan matriks bukti kode sumber dan rumus MathML statis |
| `/atlas` | `ATLAS / TOPOLOGY` | Peta arsitektur *Progressive World Atlas* lintas 7 sektor, metrik koleksi build-time, dan diagram SVG topologi 5 lapis |
| `/archive` | `ARC-00 / ARCHIVE HUB` | Pintu masuk arsip (`ARC-01` s.d. `ARC-05`) dan telemetri publik GitHub (`ARC-02`) |
| `/archive/adr` | `ARC-01 / ADR VAULT` | Katalog 13 dokumen rekam rekayasa historis (`V10.3`–`V12.3`) dengan filter kategori/jenis/status dan verifikasi SHA-256 |
| `/archive/adr/[slug]` | `ARC-01 / ADR DETAIL` | 13 halaman pembaca dokumen rekayasa lengkap dengan daftar isi otomatis dan provenance sumber |
| `/archive/play` | `ARC-03 / GAME DECK` | Konsol kartu arcade interaktif (*INSERT COIN*, 11 game, efek shader CRT opsional) |
| `/archive/credentials` | `ARC-04 / CREDENTIALS` | Ruang arsip sertifikat, penghargaan, dan publikasi terverifikasi |
| `/archive/off-screen` | `ARC-05 / OFF-SCREEN` | Aktivitas di luar layar, log hobi, embed daftar putar Spotify, dan companion piksel *Kok* (`ARC-05B`) |
| `/api/world-index.json` | `API / WORLD INDEX` | Indeks JSON statis untuk pencarian global Command Palette (`schemaVersion: 1`) |

---

## 3. Struktur Direktori Utama

```text
src/
├── content.config.ts               # Skema Astro Content Layer (work, adr, codex)
├── content/
│   ├── work/                       # Studi kasus AQI Cirebon (2021-2025) & 2 slot RESERVED
│   ├── adr/                        # 13 rekaman laporan rekayasa V10.3-V12.3
│   └── codex/                      # 6 catatan teknis taksonomi desimal 100-600
├── data/
│   ├── content.js                  # Sumber tunggal data statis & salinan antarmuka
│   ├── taxonomy.js                 # Definisi kanonis disiplin & teknologi
│   └── content-integrity.js        # Validator integritas lintas koleksi build-time
├── lib/
│   ├── adr-taxonomy.ts             # Taksonomi kategori, tipe, dan status ADR
│   ├── codex-taxonomy.ts           # Taksonomi domain 100-600 & tingkat kematangan Codex
│   ├── codex-graph-builder.ts      # Pembangun graf pengetahuan & tata letak deterministik
│   ├── codex-math.ts               # Renderer MathML statis tanpa dependensi runtime berat
│   └── world-os-core.ts            # Parser perintah, pemeringkat pencarian 5-tingkat, & validator URL Dock
├── components/
│   ├── home/                       # Curtain.astro, Hero.astro, HeroCanvas.astro
│   ├── layout/                     # Header.astro, Footer.astro, CommandPalette.astro, ReferenceDock.astro
│   └── work/                       # ProjectCard.astro, ReservedCard.astro, CaseNarrative.astro
├── layouts/
│   └── BaseLayout.astro            # Kerangka dokumen utama, SEO/OG, dan slot persistensi
├── pages/                          # Seluruh rute halaman Astro & endpoint JSON statis
├── scripts/
│   ├── core.js                     # Lifecycle bootPage(), motionRegistry, dan helper DOM aman
│   ├── global.js                   # Inisialisasi global (Lenis, Header, Command Palette, Reference Dock)
│   ├── home.js / work.js / about.js / archive.js / connect.js / codex.js / lab.js / csv-explorer.js
│   └── lab/                        # Modul AQI Explorer, plugin pita ISPU Chart.js, & CSV Worker
└── styles/                         # Stylesheet terpisah per wilayah (global, home, work, lab, about, archive, codex, atlas)
```

---

## 4. Perintah Pengembangan, Build, & Verifikasi Otomatis

### Menjalankan Secara Lokal

```bash
npm install
npx astro dev --background   # Menjalankan server pengembangan di latar belakang
npx astro dev status         # Memeriksa status server pengembangan
npx astro dev stop           # Menghentikan server pengembangan
npm run build                # Membangun seluruh 34 halaman statis + indeks JSON ke dist/
```

### Menjalankan Rangkaian Pengujian & Audit Zero-Debt (8 Test Runners)

Seluruh logika inti, integritas konten, kesetaraan TypeScript, keamanan DOM, hingga arsitektur UX V14.0 diverifikasi secara otomatis menggunakan `node:assert/strict`:

```bash
# 1. Uji kalkulator ISPU P.14/2020, statistik, & loader Data Lab
node scripts/test-lab-core.mjs

# 2. Uji parser CSV, kuartil R-7, & sanitasi formula CSV Explorer
node scripts/test-csv-explorer.mjs

# 3. Uji integritas skema & relasi koleksi Work
node scripts/test-content-integrity.mjs

# 4. Uji koleksi ADR & verifikasi SHA-256 berkas laporan historis
node scripts/test-v13-adr.mjs

# 5. Uji paritas bit-for-bit modul TypeScript terhadap golden snapshot
node scripts/test-v13-ts-parity.mjs

# 6. Uji koleksi The Grand Codex (100-600), graf backlink, & MathML statis
node scripts/test-v13-codex.mjs

# 7. Uji World OS (Command Palette, ranking pencarian, & keamanan Reference Dock)
node scripts/test-v13-world-os.mjs

# 8. Uji kontrak UX, tata letak pameran, pita ISPU, peta stasiun, & narasi 5-babak V14.0
node scripts/test-v14-ux-architecture.mjs

# 9. Audit menyeluruh 14 Gerbang Zero-Debt
node scripts/audit-v13-zero-debt.mjs
```

---

## 5. Prinsip Kejujuran Data & Kebersihan Kode

- **Zero Fabricated Metrics**: Seluruh angka kualitas udara berasal dari tabel resmi Dinas Lingkungan Hidup (DLH) Kota Cirebon periode 2021–2025 (dengan catatan eksplisit bahwa data 2025 bersifat parsial pada 4 lokasi Tahap I). Nilai kosong dipertahankan sebagai `null` (ditampilkan sebagai *gap* pada grafik, bukan angka nol).
- **Protected Systems**: Sistem pembuka *Curtain* (`Curtain.astro`), kanvas *Hero WebGL* (`HeroCanvas.astro`), dan 13 berkas laporan rekayasa historis dijaga utuh dengan verifikasi checksum SHA-256.
- **Zero Em-Dash & Safe DOM**: Seluruh kode dan salinan baru bebas dari karakter `U+2014` serta menggunakan manipulasi DOM aman (`createElement` + `textContent`).
