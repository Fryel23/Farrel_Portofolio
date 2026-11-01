# PERFORMANCE BASELINE - V10.3 SUBFASE 3

**Status:** Baseline performa reproducible, diukur pada kondisi V10.3 (setelah fix flicker + dynamic import curtainsjs).
**Aturan kepatuhan:** Murni pengukuran - tidak ada optimasi kode yang dilakukan di subfase ini.

---

## 1. Environment (Reproducibility)

| Komponen | Nilai |
|---|---|
| OS | Linux x86_64 (cloud sandbox, containerized; `/dev/shm` terbatas - lihat catatan D) |
| Browser | Google Chrome for Testing **143.0.7499.4** (`--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --window-size=1440,900`) |
| Lighthouse | **13.6.0** (npm), kategori `performance` saja |
| Ekstensi | Tidak ada (profil headless bersih, Incognito setara) |
| Server | `astro preview` - build produksi statis (`dist/`) dilayani dari `localhost:4321`, tanpa CDN |
| CPU benchmark | Lighthouse `benchmarkIndex` ≈ 2061 (referensi daya mesin uji) |
| Jaringan pihak ketiga | Google Fonts, Spotify API (`farrel-spotify-api.vercel.app`), `i.scdn.co` lewat internet sungguhan |

### Konfigurasi uji (sesuai spek)

1. **Desktop** - form-factor desktop, emulasi layar **dimatikan**, window **1440×900**, throttling **`provided` (no throttling)**, CPU ×1.
2. **Mobile** - form-factor mobile, emulasi **412×823 @ DPR 1.75**, throttling **`simulate` Slow 4G** (RTT 150 ms, throughput 1638.4 kbps, request latency 562.5 ms, **CPU ×4**).

Setiap kombinasi (2 konfigurasi × 3 rute) dijalankan **3×**, yang dilaporkan adalah **median**. Data mentah 18 run ada di §4.

Catatan TBT: **TBT adalah lab metric, bukan INP** (sesuai spek).

---

## 2. Hasil Median (3 run per sel)

### Desktop (1440×900, no throttling)

| Rute | LCP | FCP | CLS | TBT | Perf score | Elemen LCP |
|---|---|---|---|---|---|---|
| `/` | **5 572 ms** | 808 ms | 0.0051 | 1 ms | 68 | `p#hero-subtitle` (`.hero-description` di `section.hero > div.hero-copy`) |
| `/work` | **675 ms** | 675 ms | 0.0004 | 0 ms | 90 | `p#gallery-aside` (aside heading galeri) |
| `/work/aqi-cirebon` | **623 ms** | 623 ms | 0.0004 | 0 ms | 93 | `h1#case-title > span.line-mask > span.line` |

### Mobile (412×823, simulated Slow 4G, CPU ×4)

| Rute | LCP | FCP | CLS | TBT | Perf score | Elemen LCP |
|---|---|---|---|---|---|---|
| `/` | **3 420 ms** | 2 357 ms | 0.0001 | 335 ms | 81 | `p#hero-subtitle` (2 dari 3 run; 1 run LCP-nya `dialog#archive-opening > p#opening-label` - urutan pembuka V9.1) |
| `/work` | **3 163 ms** | 2 364 ms | 0.0001 | 292 ms | 85 | `img` cover kartu proyek (`.project-cover-inner > img`, gambar AQI) |
| `/work/aqi-cirebon` | **2 002 ms** | 1 743 ms | 0.0001 | 65 ms | 98 | `img` case-study cover |

### Field Data (Vercel Analytics)

**Tidak tersedia** di lingkungan pengujian ini (data field hanya ada di produksi; akses dashboard Vercel tidak tersedia dari sandbox). Pembanding Lab vs Field ditunda sampai deployment berikutnya - `[NOT YET TESTED]`. Tidak ada klaim INP/field whatsoever.

---

## 3. Baseline Highlights (rangkuman)

1. **LCP homepage didominasi *element render delay*, bukan jaringan.** Di desktop, `p#hero-subtitle` baru ter-paint setelah **±5,5 detik** (TTFB hanya ±14 ms; FCP 808 ms). Penyebabnya adalah *opening/boot sequence* V9.1 yang menahan render konten hero sampai sekuens selesai - keputusan desain sinematik, bukan bug. Implikasinya: skor Lighthouse homepage (68 desktop / 81 mobile) tidak akan naik lewat optimasi aset apa pun selama opening tetap mengunci paint hero.
2. **Rute non-homepage sangat sehat.** `/work` dan `/work/aqi-cirebon` punya LCP ≤ 675 ms di desktop dan TBT 0 ms; di mobile LCP-nya (2,0–3,2 s) dikendalikan oleh unduhan gambar cover di jalur Slow 4G - kandidat optimasi berikutnya bila diperlukan (di luar scope V10.3).
3. **CLS istimewa di semua rute (≤ 0.0051).** TBT tertinggi ada di homepage mobile (335 ms, median) dari animasi boot - masih di bawah ambang 400 ms. Ukuran bundle JS terbesar (`global.js` 212 KB raw / 76,8 KB gzip) kini dimuat tanpa curtainsjs di homepage (lihat laporan SUBFASE 2).

---

## 4. Data Mentah 18 Run

| Run | LCP (ms) | FCP (ms) | CLS | TBT (ms) | Score |
|---|---|---|---|---|---|
| home-desktop-1 | 5572 | 808 | 0.0051 | 12 | 68 |
| home-desktop-2 | 5477 | 693 | 0.0051 | 1 | 69 |
| home-desktop-3 | 5641 | 855 | 0.0004 | 0 | 68 |
| home-mobile-1 | 3482 | 2491 | 0.0001 | 386 | 78 |
| home-mobile-2 | 1632 | 1632 | 0.0302 | 118 | 98 |
| home-mobile-3 | 3420 | 2357 | 0.0001 | 335 | 81 |
| work-desktop-1 | 662 | 662 | 0.0004 | 0 | 90 |
| work-desktop-2 | 680 | 680 | 0.0004 | 0 | 90 |
| work-desktop-3 | 675 | 675 | 0.0004 | 0 | 90 |
| work-mobile-1 | 3255 | 2584 | 0.0001 | 81 | 89 |
| work-mobile-2 | 3163 | 2357 | 0.0001 | 292 | 84 |
| work-mobile-3 | 3002 | 2364 | 0.0001 | 297 | 85 |
| aqi-desktop-1 | 714 | 714 | 0.0004 | 0 | 93 |
| aqi-desktop-2 | 553 | 553 | 0.0004 | 0 | 94 |
| aqi-desktop-3 | 623 | 623 | 0.0011 | 0 | 93 |
| aqi-mobile-1 | 2002 | 1743 | 0.0001 | 65 | 98 |
| aqi-mobile-2 | 1896 | 1711 | 0.0001 | 30 | 99 |
| aqi-mobile-3 | 2369 | 2352 | 0.0001 | 72 | 95 |

Outlier yang jujur dicatat: `home-mobile-2` (LCP 1632 ms, score 98) adalah run di mana sekuens opening selesai lebih cepat; median tetap dipilih sesuai spek. CLS 0.0302 pada run yang sama berasal dari dialog opening, bukan layout konten.

---

## 5. Cara Reproduksi

```bash
cd portfolio-astro && bunx --bun astro build && bunx --bun astro preview --port 4321
# Desktop (1440x900, no throttling):
npx lighthouse http://localhost:4321/ --only-categories=performance --form-factor=desktop \
  --screenEmulation.disabled --throttling-method=provided --throttling.cpuSlowdownMultiplier=1 \
  --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --window-size=1440,900"
# Mobile (Slow 4G simulated, CPU x4):
npx lighthouse http://localhost:4321/ --only-categories=performance --form-factor=mobile \
  --screenEmulation.mobile --screenEmulation.width=412 --screenEmulation.height=823 \
  --screenEmulation.deviceScaleFactor=1.75 --throttling-method=simulate \
  --throttling.rttMs=150 --throttling.throughputKbps=1638.4 --throttling.requestLatencyMs=562.5 \
  --throttling.cpuSlowdownMultiplier=4 --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage"
# Ulangi 3x per rute (/, /work, /work/aqi-cirebon), ambil median.
```

**Catatan D (penting untuk reproduksi):** tanpa `--disable-dev-shm-usage`, tab Chrome di container ini sering "unexpectedly crashed" saat trace capture (5 dari 9 run desktop awal gagal). Flag itu wajib di lingkungan container.

## 6. Klasifikasi Temuan

- Semua angka di §2/§4: `[VERIFIED]` (log JSON Lighthouse tersimpan, dihasilkan run nyata).
- Hubungan "LCP homepage ↔ opening sequence": `[VERIFIED]` untuk mekanismenya (elemen LCP `#hero-subtitle` + `elementRenderDelay` ≈ 5,5 s dari `lcp-breakdown-insight`); keterkaitan dengan kode opening spesifik (bootPage gate) adalah `[SUSPECTED]` karena kode opening sengaja TIDAK dibaca/diubah di subfase ini (zero creep).
- Field data: `[NOT YET TESTED]`.
