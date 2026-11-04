# v11.1-research — Summary

Hasil riset & verifikasi V11.1 (Signature WebGL Hero & Farrel Identity).

## Struktur
- `verify-v11.1.mjs` — suite verifikasi Playwright (56 assertions, 9 skenario).
- `verification-results.json` — hasil detail per assertion (56 pass / 0 fail).
- `screenshots/` — bukti visual:
  - `desktop-fallback.png` — SVG fallback sejak initial HTML (sebelum WebGL siap)
  - `desktop-webgl-ready.png` — Glass Vessel WebGL aktif (fade-in selesai)
  - `desktop-final.png` — komposisi final setelah Curtain selesai
  - `about-after-nav.png` — after-swap (canvas tidak dibawa)
  - `mobile-fallback.png` — 390px: fallback saja, tanpa overflow
  - `reduced-motion.png` — reduce: fallback, tanpa WebGL
  - `resize-reinit.png` — re-init satu instance setelah 700→1440
  - `context-loss-fallback.png` — WEBGL_lose_context → fallback kembali
  - `connect-wordmark.png` / `connect-wordmark-mobile.png` — serif wordmark
- `visual-review/` — review komposisi hero (vessel + card) 1440px.
- `lighthouse/measure-lcp.mjs` + `lcp-results.json` — LCP/FCP/CLS 3 run × 2 config
  (Playwright PerformanceObserver; lihat report §H untuk metodologi).
- `network/`, `lifecycle/`, `visual-review/` — bukti pendukung (network & lifecycle
  tercatat dalam verification-results.json detail per assertion).

## Angka kunci
- Desktop LCP median 512 ms; Mobile LCP median 328 ms; elemen LCP tetap
  `#hero-subtitle`; CLS desktop 0,011 / mobile 0.
- OGL chunk dinamis: `src.x4-qSuG4.js`; 0 request pada mobile / reduced /
  8 route non-home; 1 request pada desktop lolos guard; tidak ada request
  berulang saat resize crossing (module cache).
- 9 file V11.0 frozen: sha256 identik dengan ZIP sumber.

## Catatan environment
Chrome 156 headless + SwiftShader: kualitas visual GPU nyata bisa lebih halus;
context cap/extension dapat berfluktuasi antar-run (suite final dijalankan
bersih dan lulus 56/56; detail fluktuasi terdokumentasi di report §J/§K).
