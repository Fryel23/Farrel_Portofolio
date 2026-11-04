---
codexId: "non-modal-curtain-and-typographic-hierarchy"
decimalCode: "601.1"
title: "Non-Modal Opening Curtain Architecture and Typographic Hierarchy"
domain: "600-editorial-and-design"
maturity: "BUDDING"
summary: "Evolusi arsitektur pembuka halaman dari eksperimen overlay V10.4/V10.5 menuju Curtain dekoratif non-modal V11.0 serta pembagian peran tipografi antara Space Grotesk, DM Mono, dan Cormorant Garamond."
sourceFiles:
  - "src/components/home/Curtain.astro"
  - "src/styles/curtain.css"
  - "src/scripts/curtain-controller.js"
  - "src/styles/global/tokens.css"
  - "src/layouts/BaseLayout.astro"
  - "V10.4_DIAGNOSTIC_REPORT.md"
  - "V10.5_EXPERIMENT_REPORT.md"
  - "V11.0_IMPLEMENTATION_REPORT.md"
sourceEvidence:
  - claim: "Komponen Curtain.astro bersifat murni dekoratif (aria-hidden='true' pada #v11-curtain), tersembunyi secara default di CSS, tidak mengunci scroll atau fokus, dan menempatkan tombol #v11-skip di luar root aria-hidden."
    status: "observed"
    file: "src/components/home/Curtain.astro"
    reference: "Lines 19-66 (#v11-curtain & #v11-skip markup)"
    verifiedBy: "npm run build"
  - claim: "Controller curtain-controller.js membatalkan aktivasi apabila melebihi jendela ACTIVATION_WINDOW_MS (1000 ms), pengguna sudah melakukan scroll (window.scrollY > 0), prefers-reduced-motion aktif, atau sessionStorage fip-opening-seen sudah bernilai '1'."
    status: "observed"
    file: "src/scripts/curtain-controller.js"
    reference: "Lines 38-40, 243-292 (initCurtain guards & makeController)"
    verifiedBy: "scripts/test-v13-codex.mjs"
  - claim: "Laporan historis V11.0 mencatat penurunan LCP desktop ke 328 ms dan mobile ke 1.456 ms setelah penghapusan gate pembuka yang menahan visibilitas konten Hero."
    status: "reported"
    file: "V11.0_IMPLEMENTATION_REPORT.md"
    reference: "Section Verification & Lighthouse Metrics (reported historical result from V11.0)"
    verifiedBy: "scripts/test-v13-adr.mjs"
  - claim: "Sistem desain menetapkan tiga token tipografi utama di tokens.css: --font (Space Grotesk), --mono (DM Mono), dan --font-serif (Cormorant Garamond)."
    status: "observed"
    file: "src/styles/global/tokens.css"
    reference: "Lines 49-53 (:root typography tokens)"
    verifiedBy: "scripts/test-v13-codex.mjs"
relatedCodexIds:
  - "single-owner-lifecycle-and-motion-registry"
  - "fresnel-glass-vessel-and-svg-first-fallback"
relatedWorkIds: []
relatedAdrIds:
  - "v10-4-diagnostic-report"
  - "v10-5-experiment-report"
  - "v11-0-implementation-report"
formulas: []
updatedAt: "2026-11-04"
---

## 1. Mekanisme dan Ruang Lingkup Topik

Dalam desain portofolio editorial interaktif, sekuens pembuka (*opening sequence*) sering kali diimplementasikan sebagai *modal overlay* layar penuh yang menyembunyikan konten utama (`opacity: 0` atau `visibility: hidden`), mengunci guliran halaman (`overflow: hidden`), dan menjebak fokus keyboard hingga animasi selesai. Pendekatan gerbang modal tersebut menimbulkan dua masalah struktural:

1. **Penalti Largest Contentful Paint (LCP)**: Browser tidak dapat mencatat elemen teks atau visual Hero sebagai kandidat LCP yang selesai dirender selama elemen tersebut tertutup oleh lapisan penutup penuh atau ditahan oleh JavaScript.
2. **Kerapuhan Aksesibilitas & Kegagalan Skrip**: Jika skrip animasi terlambat dimuat atau gagal dieksekusi, pengguna berisiko terjebak di balik layar penutup.

Catatan ini merangkum transisi arsitektural dari diagnosis V10.4 dan eksperimen V10.5 menuju **Non-Modal Curtain Pattern** pada V11.0, serta aturan hirarki tipografi yang menyatukan seluruh halaman *The Living Archive*.

## 2. Bukti Tersedia di Repositori

### 2.1. Evolusi Historis V10.4 -> V10.5 -> V11.0 (`reported`)

Berdasarkan catatan rekayasa yang terindeks di Engineering Records Vault:

- **Diagnosis V10.4 (`V10.4_DIAGNOSTIC_REPORT.md`, ADR `v10-4-diagnostic-report`)**: Mengidentifikasi bahwa pola pembuka modal V9.1 memicu penundaan render elemen utama Hero pada pengujian simulasi mobile.
- **Eksperimen V10.5 (`V10.5_EXPERIMENT_REPORT.md`, ADR `v10-5-experiment-report`)**: Menguji pemangkasan durasi pembuka dan penyederhanaan DOM, namun menyimpulkan bahwa selama sekuens pembuka masih bertindak sebagai gerbang konten, trade-off antara estetika dan kecepatan LCP tetap berbenturan.
- **Implementasi Curtain V11.0 (`V11.0_IMPLEMENTATION_REPORT.md`, ADR `v11-0-implementation-report`)**: Mengubah sekuens pembuka menjadi bingkai instrumen dekoratif (`#v11-curtain`) yang berada di atas area kosong komposisi Hero tanpa menutupi judul utama maupun tombol aksi. Pada laporan historis V11.0 tersebut (`reported historical result from V11.0`, **bukan** klaim pengukuran real-time saat build V13.0), LCP tercatat sebesar `328 ms` pada profil desktop dan `1.456 ms` pada profil mobile simulasi.

### 2.2. Kontrak Arsitektur Curtain Non-Modal (`observed`)

Pemeriksaan langsung pada `src/components/home/Curtain.astro` dan `src/scripts/curtain-controller.js` membuktikan mekanisme berikut:

- **Default Tersembunyi & Progressive Enhancement**: Elemen `#v11-curtain` memiliki atribut `aria-hidden="true"` dan secara default disembunyikan oleh CSS (`src/styles/curtain.css`). Kelas `.is-active` hanya dipasang oleh `curtain-controller.js` setelah seluruh pemeriksaan prasyarat berhasil. Apabila JavaScript dinonaktifkan atau gagal, Curtain tidak pernah tampil dan Hero langsung terbaca normal.
- **Pemisahan Tombol Skip (`#v11-skip`)**: Elemen `<button id="v11-skip" hidden>` ditempatkan sebagai saudara (*sibling*) di luar `<div id="v11-curtain" aria-hidden="true">` agar tidak melanggar aturan aksesibilitas (elemen fokusabel tidak boleh berada di dalam subtree `aria-hidden="true"`).
- **Enam Guard Aktivasi di `initCurtain()`**:
  1. Elemen `#v11-curtain` atau `#v11-skip` tidak ada (rute selain beranda): keluar sebagai no-op.
  2. Instance sudah aktif: mengembalikan fungsi `dispose` yang ada.
  3. `isReducedMotion()` bernilai `true`: keluar tanpa memutar timeline.
  4. `window.gsap` tidak tersedia: keluar dengan aman.
  5. `sessionStorage.getItem('fip-opening-seen') === '1'`: hanya diputar maksimal satu kali per sesi tab.
  6. *Late activation guard*: jika `performance.now() > 1000` (`ACTIVATION_WINDOW_MS`), `window.scrollY > 0`, fokus sudah berada di dalam `.hero` atau `.site-header`, atau `document.visibilityState === 'hidden'`, aktivasi dibatalkan agar tidak mengganggu pengguna yang sudah mulai berinteraksi.
- **Tanpa Timer Yatim (`setTimeout`/`setInterval`)**: Pembaruan angka counter (`000` hingga `100`) dan pergantian baris ticker (`TICKER_LINES`) digerakkan sepenuhnya oleh `gsap.timeline()` di dalam `gsap.context(..., root)`, sehingga satu panggilan `context.revert()` pada `dispose()` membersihkan seluruh animasi dan inline style.

### 2.3. Hirarki Tipografi Tiga Keluarga Font (`observed`)

Berdasarkan `src/styles/global/tokens.css` dan `src/layouts/BaseLayout.astro`, sistem tipografi dibagi secara fungsional ke dalam tiga token CSS:

| Token CSS | Keluarga Font | Peran Editorial & Struktural |
|---|---|---|
| `--font` | `'Space Grotesk', 'Segoe UI', Arial, sans-serif` | Judul utama (`h1`-`h3`), salinan tubuh artikel (*body copy*), kartu studi kasus, dan kontrol navigasi utama. |
| `--mono` | `'DM Mono', 'SFMono-Regular', Consolas, monospace` | Label instrumen arsip (*kicker*, *eyebrow*), kode desimal Codex, tag versi ADR, nilai metrik numerik, hash `SHA-256`, serta tabel data laboratorium. |
| `--font-serif` | `'Cormorant Garamond', 'Iowan Old Style', Baskerville, 'Times New Roman', serif` | Aksen tipografi editorial dan *closing wordmark* identitas (`FARREL` pada bagian penutup/connect). |

## 3. Berkas Sumber untuk Verifikasi

- `src/components/home/Curtain.astro`
- `src/styles/curtain.css`
- `src/scripts/curtain-controller.js`
- `src/styles/global/tokens.css`
- `src/layouts/BaseLayout.astro`
- `V10.4_DIAGNOSTIC_REPORT.md`, `V10.5_EXPERIMENT_REPORT.md`, `V11.0_IMPLEMENTATION_REPORT.md`

## 4. Komponen yang Telah Berjalan

- Seluruh file Curtain (`Curtain.astro`, `curtain.css`, `curtain-controller.js`) dijaga utuh tanpa modifikasi pada V13.0 (diverifikasi melalui perbandingan digest `SHA-256` terhadap snapshot preflight).
- Token tipografi `--font`, `--mono`, dan `--font-serif` digunakan secara konsisten di seluruh rute baru V13.0 (`/archive/adr`, `/codex`, `/atlas`, serta komponen World OS).

## 5. Rencana Masa Depan dan Batas Sistem

- **Kondisi Pengukuran LCP Historis (`reported`)**: Angka LCP desktop `328 ms` dan mobile `1.456 ms` berasal dari pengujian Lighthouse lokal pada saat rilis V11.0 dan bergantung pada kondisi CPU throttling serta jaringan lokal saat pengujian tersebut dilakukan; nilai aktual pada perangkat pengguna bervariasi menurut latensi jaringan dan perangkat keras.
- **Perlindungan File Inti (`observed`)**: Sesuai aturan arsitektur V13.0 (Bagian 0.8), berkas `Curtain.astro`, `curtain.css`, dan `curtain-controller.js` berstatus *protected* dan tidak boleh diubah tanpa otorisasi eksplisit.

## 6. Pengujian Pendukung

- `node scripts/test-v13-adr.mjs`: Memverifikasi keutuhan laporan historis V10.4, V10.5, dan V11.0.
- `node scripts/test-v13-codex.mjs`: Memverifikasi keberadaan seluruh berkas sumber dan bukti `sourceEvidence` pada catatan 601.
