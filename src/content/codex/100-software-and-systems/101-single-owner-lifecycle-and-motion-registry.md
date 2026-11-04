---
codexId: "single-owner-lifecycle-and-motion-registry"
decimalCode: "101.1"
title: "Single-Owner Page Lifecycle and Central Motion Registry"
domain: "100-software-and-systems"
maturity: "EVERGREEN"
summary: "Arsitektur orkestrasi siklus hidup halaman tunggal melalui bootPage(), mekanisme epoch latch pada navigasi Astro ClientRouter, dan registri terpusat untuk pembersihan observer, listener, rAF loop, serta konteks WebGL."
sourceFiles:
  - "src/scripts/core.js"
  - "src/scripts/core/page-lifecycle.js"
  - "src/scripts/core/motion-registry.js"
sourceEvidence:
  - claim: "Facade publik core.js hanya melakukan re-export named bindings tanpa menyimpan logika atau memicu circular dependency."
    status: "observed"
    file: "src/scripts/core.js"
    reference: "Lines 16-46 (public barrel re-exports)"
    verifiedBy: "npm run build"
  - claim: "bootPage() mengeksekusi empat tahap berurutan (renders -> registerPlugin -> interactions -> gsap.matchMedia) dengan guard bootedEpoch === navEpoch agar tepat satu eksekusi per navigasi."
    status: "verified-current"
    file: "src/scripts/core/page-lifecycle.js"
    reference: "Lines 89-215 (navEpoch, teardownPageMotion, bootPage)"
    verifiedBy: "scripts/test-v13-codex.mjs"
  - claim: "motionRegistry menyediakan satu Set/Array tunggal untuk observers, timers, intervals, motionListeners, eventTweens, ambientTweens, scrollTriggers, tickerCallbacks, rafLoops, dan webgl."
    status: "observed"
    file: "src/scripts/core/motion-registry.js"
    reference: "Lines 23-35, 104-148 (motionRegistry & cleanupMotionRegistry)"
    verifiedBy: "scripts/test-v13-codex.mjs"
relatedCodexIds:
  - "fresnel-glass-vessel-and-svg-first-fallback"
  - "non-modal-curtain-and-typographic-hierarchy"
relatedWorkIds: []
relatedAdrIds:
  - "v11-1-modularization-report"
  - "v11-0-implementation-report"
formulas: []
updatedAt: "2026-11-04"
---

## 1. Mekanisme dan Ruang Lingkup Topik

Aplikasi ini menggunakan `<ClientRouter />` dari Astro untuk transisi halaman di sisi klien tanpa muat ulang penuh (`hard reload`). Pada model navigasi tersebut, event standar `DOMContentLoaded` hanya terpanggil satu kali saat sesi browser pertama kali dibuka, sementara pergantian halaman berikutnya mengganti subtree DOM melalui siklus `astro:before-swap`, `swap()`, dan `astro:after-swap`, lalu diakhiri oleh `astro:page-load`.

Tanpa satu pemilik siklus hidup (*single-owner lifecycle*), komponen halaman yang mendaftarkan `IntersectionObserver`, `ResizeObserver`, `requestAnimationFrame` (`rAF`), GSAP `ScrollTrigger`, atau konteks WebGL secara mandiri berisiko meninggalkan listener yatim (*orphan listeners*) pada node DOM lama yang sudah dilepas, atau menggandakan inisialisasi saat pengguna kembali ke rute yang sama.

Untuk mencegah kebocoran resource tersebut, arsitektur frontend menetapkan dua kontrak inti:

1. **`bootPage()` (`src/scripts/core/page-lifecycle.js`)**: satu-satunya pintu masuk inisialisasi per halaman yang mengikat tahap render, interaksi, dan animasi ke nomor epoch navigasi (`navEpoch`).
2. **`motionRegistry` (`src/scripts/core/motion-registry.js`)**: satu-satunya registri global tempat seluruh primitif asinkron di luar cakupan otomatis `gsap.matchMedia()` didaftarkan dan dibersihkan pada saat `astro:after-swap`.

## 2. Bukti Tersedia di Repositori

Berdasarkan pembacaan langsung pada kode sumber aktif (`observed` dan `verified-current` pada 2026-11-04):

- **Pemisahan Facade dan Implementasi (`src/scripts/core.js`)**: Pasca-modularisasi V11.1-M (tercatat pada ADR `v11-1-modularization-report`), `src/scripts/core.js` berfungsi murni sebagai *public barrel* yang mengekspor ulang simbol dari `src/scripts/core/dom.js`, `environment.js`, `motion-config.js`, `motion-registry.js`, `scroll-runtime.js`, `audio-runtime.js`, `magnetic-buttons.js`, dan `page-lifecycle.js`. Modul internal di dalam `src/scripts/core/` tidak pernah mengimpor balik `core.js`, sehingga bebas dari ketergantungan melingkar (*circular dependency*).
- **Urutan Eksekusi Empat Tahap pada `bootPage()`**:
  1. `renders`: menjalankan fungsi render berbasis data sebelum plugin animasi atau trigger dihitung.
  2. Registrasi plugin GSAP (`window.gsap.registerPlugin(window.ScrollTrigger)`) dan `lagSmoothing(0)`.
  3. `interactions`: memasang event handler interaktif (tetap berjalan meskipun pengguna mengaktifkan `prefers-reduced-motion: reduce`).
  4. `gsap.matchMedia()`: memisahkan jalur `(prefers-reduced-motion: no-preference)` yang menjalankan array `motion` beserta callback `cleanups`, dan jalur `(prefers-reduced-motion: reduce)` yang memanggil `forceContentVisible()`.
- **Mekanisme Latch `navEpoch`**: Variabel `navEpoch` bertambah satu (`navEpoch += 1`) pada setiap event `astro:after-swap`. Setiap pemanggil `bootPage()` menyimpan variabel lokal `bootedEpoch = -1`. Ketika `boot()` dipanggil oleh `DOMContentLoaded` maupun `astro:page-load` pada muatan awal (`navEpoch === 0`), guard `if (bootedEpoch === navEpoch) return;` memastikan inisialisasi hanya berjalan tepat satu kali per epoch navigasi.

## 3. Berkas Sumber untuk Verifikasi

| Berkas Repositori | Peran Arsitektural | Simbol Kunci |
|---|---|---|
| `src/scripts/core.js` | Facade kompatibilitas publik untuk seluruh script halaman. | Re-export `bootPage`, `motionRegistry`, `track*`, `cleanupMotionRegistry` |
| `src/scripts/core/page-lifecycle.js` | Orkestrator siklus hidup halaman, epoch latch, dan teardown saat swap. | `REDUCED_REVEAL_SELECTOR`, `forceContentVisible`, `bootPage` |
| `src/scripts/core/motion-registry.js` | Registri tunggal untuk resource asinkron, loop rAF, dan disposer WebGL. | `motionRegistry`, `trackMotionListener`, `trackObserver`, `trackRafLoop`, `trackWebGLContext`, `cleanupMotionRegistry` |
| `src/types/core-lifecycle.ts` | Kontrak tipe TypeScript untuk konfigurasi `bootPage` dan state registri. | `PageBootConfig`, `DisposerFn`, `MotionRegistryState` |

## 4. Komponen yang Telah Berjalan

Seluruh mekanisme berikut berstatus `verified-current` pada workspace V13.0:

- **Teardown Terpusat (`teardownPageMotion`)**: Saat `astro:after-swap` terpanggil, `page-lifecycle.js` secara berurutan:
  1. Memanggil `context.revert()` pada setiap konteks di `motionContexts` lalu mengosongkan `Set`.
  2. Memanggil `cleanupMotionRegistry()` yang memutus seluruh `observers` (`obs.disconnect()`), membatalkan `timers` dan `intervals`, melepas `motionListeners` (`removeEventListener`), mematikan `eventTweens`, `ambientTweens`, `scrollTriggers`, dan `tickerCallbacks`, serta mengeksekusi setiap fungsi penghenti di `rafLoops` dan `webgl` di dalam blok `try/catch` idempoten, lalu menghancurkan instance `lenis`.
  3. Membunuh sisa `ScrollTrigger.getAll()` dan mengosongkan `window.gsap.globalTimeline.clear()`.
- **Penanganan `trackQuickTo()`**: Berbeda dari `trackEventTween()` yang menghapus tween saat `onComplete`, `trackQuickTo()` mendaftarkan `fn.tween` tanpa hook `onComplete` agar tween internal milik `gsap.quickTo()` tetap tercatat selama sesi halaman dan dibersihkan saat teardown.

## 5. Rencana Masa Depan dan Batas Sistem

- **Batas Sistem Saat Ini (`observed`)**:
  - `motionRegistry` mengandalkan disiplin modul pemanggil untuk mendaftarkan observer, rAF loop, atau listener global melalui helper `trackObserver()`, `trackRafLoop()`, dan `trackMotionListener()`. Listener yang dipasang langsung pada `window` atau `document` tanpa melalui helper atau tanpa dilepas pada array `cleanups` tidak dapat dideteksi secara otomatis oleh runtime JavaScript.
  - Web Worker (seperti pada `/lab/csv`) tidak disimpan di dalam `motionRegistry.webgl`, melainkan dikelola melalui fungsi `cleanups` dan listener `astro:before-swap` pada modul halaman terkait (`src/scripts/lab/csv.js`).
- **Status Rencana (`planned`)**: Tidak ada rencana untuk mengganti `bootPage()` dengan kerangka kerja komponen reaktif karena arsitektur berbasis epoch saat ini telah memenuhi kebutuhan determinisme halaman statis Astro.

## 6. Pengujian Pendukung

- `node scripts/test-v13-codex.mjs`: Memverifikasi keberadaan berkas sumber, keabsahan skema dan bukti `sourceEvidence`, serta struktur relasi menuju ADR `v11-1-modularization-report` dan `v11-0-implementation-report`.
- `node scripts/test-v13-ts-parity.mjs`: Memverifikasi kontrak tipe `src/types/core-lifecycle.ts`.
