---
adrId: "v10-3-identity-audit"
versionTag: "V10.3"
sequenceOrder: 2
title: "Identity Audit V10.3 (Subfase 4 Read-Only)"
summary: "Pemetaan read-only token tipografi, palet warna biru, dan ketergantungan selector CSS sebagai persiapan eksperimen identitas V11.0."
category: "visual-and-webgl-architecture"
recordType: "audit"
recordStatus: "historical"
targetRoutes: ["/","/about","/work","/connect","/archive"]
relatedWorkIds: []
keyMetrics:
  - label: "Blue Token Usages"
    value: "237"
    unit: "occurrences"
    evidenceSection: "§4 Komponen yang Bergantung pada --blue*"
  - label: "Pixel Palette Tokens"
    value: "16"
    unit: "colors"
    evidenceSection: "§1.2 Warna"
provenance:
  sourcePath: "IDENTITY_AUDIT.md"
  sourceFilename: "IDENTITY_AUDIT.md"
  sourceSha256: "ad74093430d5353ad6ff79cce58180bb9c6bd460d29cc8bb43f74f8ec67735e5"
  sourceBytes: 9666
  sourceWordCount: 1248
  sourceLineCount: 122
  normalizedContentSha256: "ad74093430d5353ad6ff79cce58180bb9c6bd460d29cc8bb43f74f8ec67735e5"
  normalizationCount: 0
---
# IDENTITY AUDIT - V10.3 SUBFASE 4 (READ-ONLY)

**Status:** Pemetaan read-only terhadap implementasi CSS + Astro saat ini (baseline V10.3).
**Tujuan:** Persiapan eksperimen identitas V11.0 (font Serif + warna aksen "Vessel") tanpa merusak layout.
**Aturan kepatuhan:** NOL baris kode aplikasi (`.astro`, `.css`, `.js`) diubah di subfase ini. Dokumen ini murni hasil audit.

---

## 1. Token Identitas Saat Ini (`:root` di `src/styles/global.css`)

### 1.1 Tipografi

| Token | Nilai | Catatan |
|---|---|---|
| `--font` | `'Space Grotesk', 'Segoe UI', Arial, sans-serif` | Font identitas utama (display + body). Google Fonts: bobot 400/500/600/700. |
| `--mono` | `'DM Mono', 'SFMono-Regular', Consolas, monospace` | Font label editorial/metadata. Google Fonts: bobot 400/500. |

Font dimuat via `<link>` Google Fonts di `src/layouts/BaseLayout.astro` (baris 70–73), dengan `preconnect` ke `fonts.googleapis.com` + `fonts.gstatic.com`, `display=swap`.

### 1.2 Warna

| Token | Nilai | Peran |
|---|---|---|
| `--blue` | `#2563EB` | Warna aksen utama (CTA, kicker, selection, focus ring) |
| `--blue-hover` | `#1D4ED8` | Hover CTA primer |
| `--blue-deep` | `#1E3A8A` | Biru gelap (gradien/glow) |
| `--blue-pale` | `#DBEAFE` | Latar lembut (selection, badge latar) |
| `--blue-soft` | `#93C5FD` | Aksen biru di atas section gelap |

Netral: `--bg #F8FAFC`, `--surface #FFFFFF`, `--surface-2 #F1F5F9`, `--night #0F172A`, `--night-card #1E293B`; teks `--ink #0F172A`, `--text-2 #475569`, `--text-3 #64748B`, `--text-on-dark #E2E8F0`, `--text-on-dark-2 #94A3B8`; garis `--border-soft #E2E8F0`, `--border-strong #CBD5E1`, `--line-on-dark rgba(255,255,255,.16)`.
Palet pixel game (`--px-*`, 16 warna) dipisah dari identitas biru dan tidak boleh disentuh V11.0 (domain Game Deck).

### 1.3 Bentuk & motion

`--radius: 18px`, `--radius-sm: 12px`, `--micro: 180ms`, `--hover: 280ms`, `--ease: cubic-bezier(0.33, 1, 0.68, 1)`.

---

## 2. Pemetaan Elemen → Font-Family

### 2.1 H1 (Judul utama)

| Kelas / elemen | File | Deklarasi | Dipakai di |
|---|---|---|---|
| `.hero-title` | `home.css:21` | `clamp(40px, 4.6vw, 66px)`, lh 0.94, ls −0.06em, **w700**; `em` → `--blue` (non-italic) | Homepage (`Hero.astro`) |
| `.display-heading` | `global.css:464` | `clamp(44px, 6.3vw, 80px)`, lh 0.9, ls −0.07em, **w600**; override 887: `clamp(40px,6vw,66px)`; override 939 (mobile): `clamp(42px,10.5vw,60px)`; `em` → `--blue` | `/about`, `/work`, `/connect`, semua `/archive/*` |
| `.case-study-title` | `work.css:371` | `clamp(34px, 6vw, 58px)`, lh 1.08, ls −0.02em, **w normal (400)** | `/work/[slug]` |

Semua H1 mewarisi `--font` (Space Grotesk) dari `body`. Tidak ada satu pun H1 yang mendeklarasikan `font-family` eksplisit sendiri, **kecuali** `.case-study-title` (menuliskan `font-family: var(--font)` secara eksplisit - perhatikan saat pergantian token).

### 2.2 Sub-heading / lead

| Kelas | File | Deklarasi |
|---|---|---|
| `.heading-aside` | `global.css:474` | 13px, lh 1.7, `--text-2`; light section → `--text-on-dark-2`; mobile: `max-width: 440px` |
| `.section-kicker` | `global.css:476` | mono 9px, ls 0.2em, warna `--blue` (di atas setiap H1) |
| `.narrative-text h2` | `case-narrative.css:74` | sub-judul scene naratif case study |
| `.about-lead` | `about.css:42` | lead paragraph About |

### 2.3 Body text

| Sel | Deklarasi |
|---|---|
| `body` (`global.css:87`) | `var(--font)`, **15px**, lh 1.6, `--ink` |
| `.about-copy p` (`about.css:39`) | 14px, lh 1.75, `--text-2` |
| `.project-info .project-desc` (`work.css`) | 12px, lh 1.6, `--text-on-dark-2` (kartu di atas section gelap) |

### 2.4 Grup mono "signature editorial" (`global.css:180-193`)

Satu selector group menerapkan `--mono` 10px ls 0.08em ke: `.section-kicker, .brand-name, .eyebrow, .hero-note, .visual-caption, .scroll-cue, .filter-row, .gallery-bottom-line, .resume-card-top, .resume-foot, .mini-label, .artwork-label, .social-footnote, .closing-top, .closing-bottom, .site-footer, .project-status, .journey-phase, .journey-status, .hero-tail .tag-mono` - plus ~40 deklarasi `font-family: var(--mono)` lain (label archive, HUD game, stat, dsb.). **Ini volume terbesar konsumsi token font; mengganti `--mono` berdampak sangat luas.**

---

## 3. Kandidat Eksperimen Serif V11.0 (tanpa merusak layout)

Peringkat berdasarkan keamanan:

1. **`.hero-title` (homepage)** - kandidat terkuat. Satu file (home.css), satu komponen (`Hero.astro`), ukuran `clamp()` sudah self-contained. `em` di dalamnya sudah jadi titik aksen warna, bisa jadi titik aksen serif juga. Risiko: `letter-spacing: -0.06em` pada serif perlu dinilai ulang (serif display umumnya butuh tracking lebih longgar).
2. **`.display-heading`** - kandidat kedua. Menyentuh semua halaman utama sekaligus (konsisten, bukan tambal sulam), tetapi ada 3 breakpoint override ukuran yang harus diuji ulang. `em`-nya punya varian warna di section gelap (`.section-heading-light .display-heading em` → `--blue-soft`).
3. **`.case-study-title`** - kandidat ketiga. Weight-nya normal (400) - paling "dekat" rasa serif bookish. Satu file, satu halaman. Sudah menulis `font-family` eksplisit sehingga eksperimen override-nya paling terlokalisasi.

**Tidak direkomendasikan untuk serif:** semua elemen grup mono §2.4 (identitas "mesin ketik"/editorial justru bisa bertahan sebagai kontras yang membuat serif display lebih menonjol), `.project-desc`/body kecil (ukuran <15px kurik serif), dan seluruh Game Deck.

**Catatan teknis:** tambah font serif harus lewat `<link>` Google Fonts baru di `BaseLayout.astro` (JANGAN mengganti token `--font` global - buat token baru, mis. `--font-serif`, agar fallback aman); `font-display: swap` tetap; perhatikan FOUT pada judul besar saat LCP homepage sudah tertekan oleh opening (lihat `PERFORMANCE_BASELINE.md`).

---

## 4. Komponen yang Bergantung pada `--blue*` (persiapan aksen "Vessel" V11.0)

Total 237 pemakaian `var(--blue*)`: `global.css` 64, `archive.css` 61, `about.css` 51, `connect.css` 24, `home.css` 22, `work.css` 14, `page-transitions.css` 1. Rincian: `--blue` ×113, `--blue-soft` ×70, `--blue-deep` ×26, `--blue-pale` ×23, `--blue-hover` ×5.

Kelompok konsumen inti (level sistem - calon titik "Vessel accent"):

| Kelompok | Contoh selector | Token |
|---|---|---|
| **CTA & link** | `.button-primary` (bg `--blue`, hover `--blue-hover`), `.project-link` hover, `.connect-link` | `--blue`, `--blue-hover` |
| **Kicker / label aktif** | `.section-kicker` (warna biru di atas semua H1), `.filter-button.active`, `.status-dot` | `--blue`, `--blue-soft` |
| **Judul beraksen** | `.hero-title em`, `.display-heading em` (+ varian light: `--blue-soft`) | `--blue` |
| **Aksesibilitas** | `:focus-visible` outline `--blue` (global, semua halaman), `::selection` `--blue-pale` | `--blue`, `--blue-pale` |
| **Navigasi & chrome** | `.mobile-nav-link`, `.menu-dots`, `.page-progress`, `.site-footer`, `.skip-link` hover | campuran |
| **Kartu & hover state** | `.project-card:focus-within` border `--blue-soft`, `.project-tag`, `.reserved-*`, `.stat-value` | `--blue-soft`, `--blue-deep` |
| **Dekorasi geometris** | `.geo-six`, `.geo-seven`, `.geo-blue`, grid blueprint galeri | `--blue-soft` |
| **Archive** | rarity badge, border/bars/glow per-game (via `--game-color`, fallback `--blue-soft`) | `--blue-soft` |

**Implikasi Vessel:** warna aksen baru sebaiknya diperkenalkan sebagai token paralel (mis. `--vessel`, `--vessel-soft`) + keputusan eksplisit per kelompok di atas, BUKAN mengganti nilai `--blue` secara langsung - kelompok Aksesibilitas (focus ring + selection) dan `.button-primary` adalah kontrak UI paling luas; menggantinya serentak akan mengubah rasa seluruh 9 halaman dalam satu baris.

---

## 5. Catatan Potensi Bentrok (jika identitas baru dipaksakan)

1. **`body` mewarisi `--font` untuk SEMUA halaman + Game Deck.** Mengganti nilai `--font` (bukan menambah token) akan menjatuhkan Space Grotesk dari `.case-study-title` yang menuliskannya eksplisit (inkonsisten), dan mengubah HUD/pixel game yang mengandalkan sans generik.
2. **`em` di H1 = kontrak warna biru.** Serif baru pada `em` yang tetap biru akan bersaing; jika Vessel juga dipakai di `em`, dua aksen (biru + vessel) harus punya hierarki jelas, bukan dicampur di elemen yang sama.
3. **Letter-spacing negatif agresif** (−0.06em/−0.07em) dirombak saat ganti serif; dipertahankan apa adanya akan membuat serif saling menempel (terutama kombinasi "fi", "rt").
4. **Section gelap (`--night`) punya varian aksen sendiri** (`--blue-soft`, `--text-on-dark-2`). Identitas Vessel wajib menyediakan varian "on-dark" sejak awal; tanpa itu, kicker/`em` di section gelap akan putus kontras.
5. **`page-transitions.css` memakai `--blue` 1×** (overlay transisi V10.1) - mudah terlewat saat audit visual karena hanya tampil saat navigasi.
6. **Opening V9.1 + Game Deck + Companion adalah aset motion identitas** - gaya serif baru tidak boleh memicu perubahan pada ketiganya (LARANGAN REKAP V10.3 tetap berlaku untuk V11.0 dalam hal urutan pengerjaan).
7. **Palet `--px-*` (16 warna game) di-`:root`** - jangan dicampur ke sistem aksen Vessel; kontraknya sudah dibatasi ke Game Deck/habitat (§ komentar V6.3 di global.css).
8. **Selection & focus ring memakai biru** - jika Vessel menjadi aksen utama, keyboard/selection UX adalah tempat pertama yang terlihat berubah; uji `:focus-visible` di semua latar (terang, gelap, kartu).

---

*Dibuat pada fase V10.3 SUBFASE 4. Sumber: `src/styles/global.css`, `home.css`, `work.css`, `about.css`, `archive.css`, `connect.css`, `case-narrative.css`, `page-transitions.css`, `src/layouts/BaseLayout.astro`, komponen halaman. Tidak ada kode yang diubah.*
