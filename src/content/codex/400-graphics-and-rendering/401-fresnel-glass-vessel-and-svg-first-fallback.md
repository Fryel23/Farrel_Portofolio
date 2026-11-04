---
codexId: "fresnel-glass-vessel-and-svg-first-fallback"
decimalCode: "401.1"
title: "View-Space Fresnel Glass Vessel and SVG-First Progressive Fallback"
domain: "400-graphics-and-rendering"
maturity: "BUDDING"
summary: "Arsitektur visual Hero dua lapis dengan ilustrasi SVG statis di HTML awal, pemuatan dinamis OGL hanya di atas lebar 700 px dan tanpa reduced-motion, geometri lathe 96 segmen, serta shader Fresnel di ruang pandang (view space)."
sourceFiles:
  - "src/scripts/hero-webgl/shaders.js"
  - "src/scripts/hero-webgl/controller.js"
  - "src/scripts/hero-webgl/geometry.js"
  - "src/components/home/HeroCanvas.astro"
sourceEvidence:
  - claim: "Shader VESSEL_FRAGMENT menghitung pendekatan Fresnel di view space menggunakan facing = clamp(dot(N, V), 0.0, 1.0) dan pemisahan tepi kromatik RGB (eksponen 0.86, 1.0, dan 1.18 terhadap uFresnelPower)."
    status: "observed"
    file: "src/scripts/hero-webgl/shaders.js"
    reference: "Lines 67-95 (VESSEL_FRAGMENT view-space Fresnel & Blinn-Phong specular)"
    verifiedBy: "scripts/test-v13-codex.mjs"
  - claim: "Geometri vessel dibangun dari profil tertutup 23 titik (VESSEL_PROFILE) yang diputar 96 segmen radial (VESSEL_RADIAL = 96), ditambah 48 partikel deterministik dengan PRNG mulberry32(20261101)."
    status: "observed"
    file: "src/scripts/hero-webgl/geometry.js"
    reference: "Lines 14-173 (PARTICLE_COUNT, mulberry32, VESSEL_PROFILE, buildVesselGeometry)"
    verifiedBy: "scripts/test-v13-codex.mjs"
  - claim: "Controller WebGL hanya menjadwalkan dynamic import OGL apabila viewport memenuhi (min-width: 701px), prefers-reduced-motion tidak aktif, dan elemen masih terhubung ke DOM."
    status: "observed"
    file: "src/scripts/hero-webgl/controller.js"
    reference: "Lines 50-51, 140-260 (DESKTOP_MQ, REDUCED_MQ, createHeroInstance)"
    verifiedBy: "npm run build"
  - claim: "Komponen HeroCanvas.astro merender ilustrasi SVG statis (#hero-fallback) pada HTML awal dengan atribut data-webgl-state='fallback' sehingga konten visual tersedia seketika tanpa JavaScript."
    status: "observed"
    file: "src/components/home/HeroCanvas.astro"
    reference: "Lines 16-116 (#hero-canvas-wrapper, #hero-fallback, #webgl-canvas)"
    verifiedBy: "npm run build"
relatedCodexIds:
  - "single-owner-lifecycle-and-motion-registry"
  - "non-modal-curtain-and-typographic-hierarchy"
relatedWorkIds: []
relatedAdrIds:
  - "v11-1-implementation-report"
  - "v11-1-modularization-report"
formulas:
  - id: "view-space-fresnel-rgb"
    label: "View-Space Chromatic Fresnel Approximation (VESSEL_FRAGMENT)"
    sourceNotation: "f_c = (1 - \\operatorname{clamp}(\\hat{N} \\cdot \\hat{V}, 0, 1))^{k_c \\cdot p}, \\quad k_c \\in \\{0.86, 1.00, 1.18\\}"
    plainExplanation: "Intensitas tepi Fresnel per kanal warna (merah, hijau, biru) dihitung di ruang kamera (view space) dari pangkat komplemen hasil kali titik antara vektor normal permukaan ter-normalisasi (N) dan vektor arah pandang menuju titik asal kamera (V), dikalikan faktor skala kromatik masing-masing kanal."
    mathmlKind: "fresnel-view-space"
    variables:
      - symbol: "N"
        meaning: "Vektor normal permukaan di ruang pandang: normalize(normalMatrix * normal)"
      - symbol: "V"
        meaning: "Vektor arah pandang menuju kamera di titik asal view space: normalize(-vViewPos)"
      - symbol: "p"
        meaning: "Eksponen dasar Fresnel (uniform uFresnelPower)"
      - symbol: "k_c"
        meaning: "Pengali eksponen per kanal RGB (0.86 untuk R, 1.00 untuk G, 1.18 untuk B)"
updatedAt: "2026-11-04"
---

## 1. Mekanisme dan Ruang Lingkup Topik

Visual utama pada bagian Hero halaman beranda (`/`) menampilkan objek **Glass Vessel** di atas latar arsip editorial. Dalam perancangan grafis web modern, menjadikan WebGL sebagai ketergantungan wajib untuk merender elemen visual utama di atas lipatan (*above-the-fold*) berisiko menunda *Largest Contentful Paint* (LCP), membebani perangkat seluler, dan menghasilkan area kosong apabila konteks GPU gagal dibuat atau hilang (*context loss*).

Untuk menghilangkan risiko tersebut, sistem visual Hero dirancang dengan prinsip **SVG-First Progressive Enhancement**:

1. **Lapisan Dasar Statis (`src/components/home/HeroCanvas.astro`)**: Ilustrasi vektor `#hero-fallback` dirender langsung di dalam dokumen HTML statis tanpa memerlukan permintaan jaringan tambahan maupun eksekusi JavaScript.
2. **Lapisan Peningkatan WebGL (`src/scripts/hero-webgl/*`)**: Pustaka `ogl` hanya dimuat secara dinamis (`import('ogl')`) setelah seluruh penjaga lingkungan (*environment guards*) terpenuhi. Kanvas `#webgl-canvas` baru ditampilkan melalui kelas `.is-webgl-ready` setelah frame valid pertama selesai digambar.

## 2. Bukti Tersedia di Repositori

Berdasarkan pemeriksaan kode sumber aktif (`observed` pada 2026-11-04):

### 2.1. Persamaan Pencahayaan Fresnel di View Space (`shaders.js`)

Audit V11.1 (tercatat pada ADR `v11-1-implementation-report`) menemukan bahwa mengandalkan uniform `cameraPosition` di *world space* menyebabkan permukaan vessel tampak padat apabila vektor posisi kamera tidak diperbarui secara eksplisit. Oleh karena itu, `VESSEL_VERTEX` dan `VESSEL_FRAGMENT` memindahkan seluruh perhitungan pencahayaan ke **view space** (di mana posisi kamera selalu berada di titik asal $(0, 0, 0)$):

```glsl
vec3 V = normalize(-vViewPos);        // kamera = origin view space
vec3 N = normalize(vNormalView);
vec3 L = normalize(vLightDirView);
float facing = clamp(dot(N, V), 0.0, 1.0);

float fresR = pow(1.0 - facing, uFresnelPower * 0.86);
float fresG = pow(1.0 - facing, uFresnelPower);
float fresB = pow(1.0 - facing, uFresnelPower * 1.18);
vec3 chroma = vec3(fresR, fresG, fresB);
```

Representasi matematis yang sesuai dengan implementasi shader di atas adalah:

<div class="codex-inline-math" role="region" aria-label="Rumus Fresnel di ruang pandang">
  <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
    <mrow>
      <msub>
        <mi>f</mi>
        <mi>c</mi>
      </msub>
      <mo>=</mo>
      <msup>
        <mrow>
          <mo>(</mo>
          <mn>1</mn>
          <mo>-</mo>
          <mrow>
            <mi>clamp</mi>
            <mo>&#x2061;</mo>
            <mrow>
              <mo>(</mo>
              <mrow>
                <mover>
                  <mi>N</mi>
                  <mo>^</mo>
                </mover>
                <mo>&#x22C5;</mo>
                <mover>
                  <mi>V</mi>
                  <mo>^</mo>
                </mover>
              </mrow>
              <mo>,</mo>
              <mn>0</mn>
              <mo>,</mo>
              <mn>1</mn>
              <mo>)</mo>
            </mrow>
          </mrow>
          <mo>)</mo>
        </mrow>
        <mrow>
          <msub>
            <mi>k</mi>
            <mi>c</mi>
          </msub>
          <mo>&#x22C5;</mo>
          <mi>p</mi>
        </mrow>
      </msup>
      <mo>,</mo>
      <mspace width="1em"></mspace>
      <msub>
        <mi>k</mi>
        <mi>c</mi>
      </msub>
      <mo>&#x2208;</mo>
      <mrow>
        <mo>{</mo>
        <mn>0.86</mn>
        <mo>,</mo>
        <mn>1.00</mn>
        <mo>,</mo>
        <mn>1.18</mn>
        <mo>}</mo>
      </mrow>
    </mrow>
  </math>
</div>

Selain suku Fresnel tersebut, `VESSEL_FRAGMENT` menambahkan sorotan spekular Blinn-Phong sempit (`pow(clamp(dot(N, H), 0.0, 1.0), 72.0) * 0.3`) dengan vektor setengah $\hat{H} = \operatorname{normalize}(\hat{L} + \hat{V})$.

### 2.2. Geometri Lathe Profil Tertutup & Partikel Deterministik (`geometry.js`)

- **Profil Vessel (`VESSEL_PROFILE`)**: Terdiri dari 23 koordinat 2D $(r, y)$ yang membentuk kontur tertutup mulai dari pusat dasar luar $(0.0, 0.0)$, naik menyusuri kubah bawah, badan maksimum $(0.52, 0.235)$, bahu, leher, bibir atas (*rim*), lalu turun menyusuri dinding dalam kembali ke pusat interior $(0.0, 0.092)$.
- **Resolusi Radial (`VESSEL_RADIAL = 96`)**: Profil diputar sebanyak 96 segmen radial menghasilkan $23 \times 96 = 2.208$ verteks tanpa alokasi ulang per frame.
- **Partikel Debu Internal (`PARTICLE_COUNT = 48`)**: Fungsi `buildParticleData()` membangkitkan posisi awal, `aSeed`, dan `aScale` menggunakan generator pseudo-acak deterministik `mulberry32(20261101)`. Gerak melayang (*drift*) dihitung sepenuhnya di `PARTICLE_VERTEX` dari `uTime` dan `aSeed` tanpa mutasi buffer CPU per frame.

### 2.3. Penjaga Viewport, Reduced Motion, dan Pelepasan Konteks (`controller.js`)

- **Guard Viewport (`DESKTOP_MQ = '(min-width: 701px)'`)**: Pada layar dengan lebar $\le 700\text{ px}$, WebGL tidak diinisialisasi dan bundel `ogl` tidak diunduh.
- **Guard Reduced Motion (`REDUCED_MQ = '(prefers-reduced-motion: reduce)'`)**: Apabila pengguna memilih pengurangan gerak, controller langsung mempertahankan fallback SVG statis dan menghentikan loop `rAF`.
- **Integrasi Registri & Context Loss**: Fungsi penghenti `rAF` dan pelepasan konteks didaftarkan ke `trackRafLoop()` dan `trackWebGLContext()` pada `src/scripts/core/motion-registry.js`. Saat terjadi `webglcontextlost`, controller menghentikan `rAF` dan menampilkan kembali `#hero-fallback` tanpa pengulangan pembuatan konteks tanpa batas.

## 3. Berkas Sumber untuk Verifikasi

- `src/components/home/HeroCanvas.astro`
- `src/scripts/hero-webgl/shaders.js`
- `src/scripts/hero-webgl/geometry.js`
- `src/scripts/hero-webgl/controller.js`
- `src/scripts/hero-webgl/scene.js`
- `src/styles/hero-webgl.css`

## 4. Komponen yang Telah Berjalan

- Isolasi penuh bundel `ogl` sehingga rute selain `/` atau viewport mobile $\le 700\text{ px}$ tidak memuat kode WebGL (`observed`, diverifikasi pada hasil build Vite).
- Pelepasan deterministik pada `astro:before-swap` dan `cleanupMotionRegistry()` (`verified-current`).

## 5. Rencana Masa Depan dan Batas Sistem

- **Keterbatasan Efek Kaca Stylized (`observed`)**: Shader menggunakan satu pass *front-face culling* (`cullFace = gl.BACK`) dan pendekatan kromatik berbasis pangkat Fresnel, bukan *ray-traced refraction* atau *screen-space transmission* dua pass, demi menghindari artefak pengurutan segitiga transparan dan menjaga beban GPU tetap ringan pada perangkat terintegrasi.
- **Batas Perangkat (`observed`)**: Perangkat desktop yang memblokir WebGL melalui kebijakan browser atau driver grafis secara otomatis tetap berada pada mode `data-webgl-state="fallback"` dengan ilustrasi SVG.

## 6. Pengujian Pendukung

- `node scripts/test-v13-codex.mjs`: Memverifikasi keberadaan seluruh berkas sumber `hero-webgl`, keabsahan rumus `view-space-fresnel-rgb`, serta keutuhan hash file protected Hero WebGL.
