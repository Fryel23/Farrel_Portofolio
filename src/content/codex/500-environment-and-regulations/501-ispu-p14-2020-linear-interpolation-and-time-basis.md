---
codexId: "ispu-p14-2020-linear-interpolation-and-time-basis"
decimalCode: "501.1"
title: "ISPU PermenLHK P.14/2020 Linear Interpolation and Time Basis Contract"
domain: "500-environment-and-regulations"
maturity: "EVERGREEN"
summary: "Rumus interpolasi linier per pita konsentrasi PermenLHK P.14/2020, pembuktian aritmetika SO2 83.9 ug/m3 -> 63.21171875 -> 63, serta pemisahan tegas antara periode referensi tabel 24 jam dan agregasi tahap observasi DLH Kota Cirebon."
sourceFiles:
  - "src/scripts/lab/core/aqi-calculator.js"
  - "src/pages/lab/methodology.astro"
  - "src/content/work/aqi-cirebon.md"
  - "public/data/aqi/regions.json"
  - "public/data/aqi/cirebon-2021.json"
  - "public/data/aqi/cirebon-2022.json"
  - "public/data/aqi/cirebon-2023.json"
  - "public/data/aqi/cirebon-2024.json"
  - "public/data/aqi/cirebon-2025.json"
sourceEvidence:
  - claim: "Kalkulator ISPU mengimplementasikan rumus interpolasi linier I = ((Ia - Ib) / (Xa - Xb)) * (Xx - Xb) + Ib untuk tiga parameter terverifikasi: so2, no2, dan pm25."
    status: "verified-current"
    file: "src/scripts/lab/core/aqi-calculator.js"
    reference: "Lines 54-105, 145-153 (P14_2020, SUPPORTED_PARAMETERS, interpolate, roundIndex)"
    verifiedBy: "scripts/test-lab-core.mjs"
  - claim: "Input SO2 sebesar 83.9 ug/m3 pada pita 52 < X <= 180 (Ib = 51, Ia = 100) menghasilkan nilai mentah 63.21171875 dan nilai bulat 63 (kategori Sedang)."
    status: "verified-current"
    file: "src/scripts/lab/core/aqi-calculator.js"
    reference: "Lines 65-71, 170-255 (calculateSubIndex)"
    verifiedBy: "scripts/test-v13-ts-parity.mjs"
  - claim: "Periode referensi tabel konversi untuk SO2, NO2, dan PM2.5 ditetapkan sebagai 24h, sedangkan observasi DLH Kota Cirebon (2021-2025) adalah agregat 2 tahap pengukuran per tahun yang dievaluasi dengan allowBasisMismatch: true dan ditandai basisMatched: false."
    status: "verified-current"
    file: "public/data/aqi/cirebon-2024.json"
    reference: "Lines 22-46 (measurement.frequency, parameterDefinitions, limitations)"
    verifiedBy: "scripts/test-lab-core.mjs"
relatedCodexIds:
  - "finite-state-csv-parsing-and-worker-isolation"
relatedWorkIds:
  - "aqi-cirebon"
relatedAdrIds:
  - "v12-0-implementation-report"
  - "v12-0-audit-closure-report"
  - "v12-2-implementation-report"
formulas:
  - id: "ispu-p14-2020-interpolation"
    label: "PermenLHK P.14/2020 Piecewise Linear Sub-Index Interpolation"
    sourceNotation: "I = \\frac{I_a - I_b}{X_a - X_b} \\cdot (X_x - X_b) + I_b"
    plainExplanation: "Nilai sub-indeks ISPU (I) dihitung melalui interpolasi linier dari konsentrasi terukur (Xx) di antara batas bawah konsentrasi pita (Xb) dan batas atas konsentrasi pita (Xa), dipetakan ke batas bawah indeks pita (Ib) dan batas atas indeks pita (Ia), lalu dibulatkan ke bilangan bulat terdekat."
    mathmlKind: "ispu-linear-interpolation"
    variables:
      - symbol: "I"
        meaning: "Nilai sub-indeks ISPU hasil interpolasi sebelum pembulatan"
        unit: "indeks (tanpa dimensi)"
      - symbol: "I_a"
        meaning: "Batas atas nilai ISPU pada pita interval aktif (iHigh)"
        unit: "indeks"
      - symbol: "I_b"
        meaning: "Batas bawah nilai ISPU pada pita interval aktif (iLow)"
        unit: "indeks"
      - symbol: "X_a"
        meaning: "Batas atas konsentrasi polutan pada pita interval aktif (high)"
        unit: "µg/m³"
      - symbol: "X_b"
        meaning: "Batas bawah konsentrasi polutan pada pita interval aktif (low)"
        unit: "µg/m³"
      - symbol: "X_x"
        meaning: "Konsentrasi polutan ambien yang diukur (concentration)"
        unit: "µg/m³"
updatedAt: "2026-11-04"
---

## 1. Mekanisme dan Ruang Lingkup Topik

Indeks Standar Pencemar Udara (ISPU) di Indonesia diatur melalui **Peraturan Menteri Lingkungan Hidup dan Kehutanan Republik Indonesia Nomor P.14/MENLHK/SETJEN/KUM.1/7/2020**. Dalam implementasi perangkat lunak analitik lingkungan, terdapat tiga kesalahan umum yang sering mencemari validitas data:

1. Mengonversi nilai hilang (`null`) menjadi angka `0`, yang secara keliru mengubah ketiadaan pengukuran menjadi klaim udara bersih (`ISPU = 0`, kategori *Baik*).
2. Menyamakan nilai sub-indeks turunan dari dua parameter dengan ISPU resmi tujuh parameter penuh.
3. Mencampuradukkan **periode referensi tabel regulasi** (`24 jam`) dengan **frekuensi sampling** atau **basis waktu agregasi** dari dataset sumber daerah.

Catatan ini mendokumentasikan kontrak perhitungan pada `src/scripts/lab/core/aqi-calculator.js` serta integrasinya dengan dataset kualitas udara ambien Dinas Lingkungan Hidup (DLH) Kota Cirebon tahun 2021 hingga 2025.

## 2. Bukti Tersedia di Repositori

Seluruh klaim pada bagian ini berstatus `verified-current` (diverifikasi ulang pada 2026-11-04 melalui `scripts/test-lab-core.mjs` dan `scripts/test-v13-ts-parity.mjs`):

### 2.1. Rumus Interpolasi Linier & Tabel Breakpoint

Untuk setiap konsentrasi terukur $X_x \ge 0$ yang berada di dalam pita $(X_b, X_a]$ (atau $[0, X_a]$ untuk pita pertama), fungsi `interpolate(concentration, interval)` menghitung sub-indeks menggunakan persamaan resmi Lampiran I PermenLHK P.14/2020:

<div class="codex-inline-math" role="region" aria-label="Rumus interpolasi linier ISPU PermenLHK P.14/2020">
  <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
    <mrow>
      <mi>I</mi>
      <mo>=</mo>
      <mrow>
        <mfrac>
          <mrow>
            <msub>
              <mi>I</mi>
              <mi>a</mi>
            </msub>
            <mo>-</mo>
            <msub>
              <mi>I</mi>
              <mi>b</mi>
            </msub>
          </mrow>
          <mrow>
            <msub>
              <mi>X</mi>
              <mi>a</mi>
            </msub>
            <mo>-</mo>
            <msub>
              <mi>X</mi>
              <mi>b</mi>
            </msub>
          </mrow>
        </mfrac>
        <mo>&#x22C5;</mo>
        <mrow>
          <mo>(</mo>
          <mrow>
            <msub>
              <mi>X</mi>
              <mi>x</mi>
            </msub>
            <mo>-</mo>
            <msub>
              <mi>X</mi>
              <mi>b</mi>
            </msub>
          </mrow>
          <mo>)</mo>
        </mrow>
      </mrow>
      <mo>+</mo>
      <msub>
        <mi>I</mi>
        <mi>b</mi>
      </msub>
    </mrow>
  </math>
</div>

Tabel pita kontinu (`low < X <= high` dengan toleransi `EPS = 1e-9`) yang diimplementasikan di `P14_2020.tables` mencakup tiga parameter yang tabelnya telah terverifikasi:

| Parameter | Satuan Tabel | Periode Referensi Tabel | Pita Konsentrasi ($X_b \text{..} X_a$) | Pita Indeks ($I_b \text{..} I_a$) |
|---|---|---|---|---|
| `so2` ($\text{SO}_2$) | `µg/m³` | `24h` | `0..52`, `52..180`, `180..400`, `400..800`, `800..1200` | `0..50`, `51..100`, `101..200`, `201..300`, `301..500` |
| `no2` ($\text{NO}_2$) | `µg/m³` | `24h` | `0..80`, `80..200`, `200..1130`, `1130..2260`, `2260..3000` | `0..50`, `51..100`, `101..200`, `201..300`, `301..500` |
| `pm25` ($\text{PM}_{2.5}$) | `µg/m³` | `24h` | `0..15.5`, `15.5..55.4`, `55.4..150.4`, `150.4..250.4`, `250.4..350.4`, `350.4..500.4` | `0..50`, `51..100`, `101..200`, `201..300`, `301..400`, `401..500` |

### 2.2. Pembuktian Aritmetika: $\text{SO}_2 = 83.9\ \mu\text{g/m}^3$

Sebagai verifikasi presisi numerik (`derived` dan `verified-current` pada `scripts/test-v13-ts-parity.mjs`), perhatikan konsentrasi $\text{SO}_2$ sebesar $X_x = 83.9\ \mu\text{g/m}^3$:

1. Nilai $83.9$ berada di dalam pita kedua $\text{SO}_2$ karena $52 < 83.9 \le 180$, sehingga diperoleh batas $X_b = 52$, $X_a = 180$, $I_b = 51$, dan $I_a = 100$.
2. Substitusi ke dalam persamaan interpolasi:
   - Selisih indeks: $I_a - I_b = 100 - 51 = 49$.
   - Lebar pita konsentrasi: $X_a - X_b = 180 - 52 = 128$.
   - Jarak konsentrasi dari batas bawah: $X_x - X_b = 83.9 - 52 = 31.9$.
   - Rasio kemiringan pita: $49 / 128 = 0.3828125$.
   - Nilai mentah (`value`): $0.3828125 \times 31.9 + 51 = 12.21171875 + 51 = 63.21171875$.
3. Pembulatan ke bilangan bulat terdekat melalui `roundIndex(63.21171875)` menghasilkan `valueRounded = 63`, yang jatuh pada kategori **Sedang** ($51 \le I \le 100$).

### 2.3. Pembedaan Tiga Konsep Waktu & Status Data

Berdasarkan audit penutupan V12.1 (ADR `v12-0-audit-closure-report`) dan metadata `public/data/aqi/cirebon-2021..2025.json`:

1. **Periode Referensi Tabel (`averagingPeriod: '24h'`)**: Tabel konversi PermenLHK P.14/2020 pada kalkulator menggunakan periode referensi 24 jam (`ISPU_TABLE_REFERENCE_PERIOD = '24 jam (PermenLHK P.14/2020)'`).
2. **Frekuensi Sampling Dataset Cirebon**: Dilaksanakan **2 tahap pengukuran per tahun** (`TAHAP I` dan `TAHAP II`, kecuali tahun 2025 yang baru memuat `TAHAP I` pada 4 lokasi).
3. **Basis Agregasi Observasi Sumber**: Dokumen sumber DLH Kota Cirebon melaporkan satu angka konsentrasi per lokasi per tahap tanpa mencantumkan durasi rata-rata pengambilan sampel per tahap. Oleh sebab itu, pipeline build memanggil `calculateSubIndex()` dengan flag eksplisit `allowBasisMismatch: true`, yang menghasilkan `basisMatched: false`. Seluruh nilai indeks pada dataset Cirebon diberi label **ISPU Terderivasi (2 Parameter: $\text{SO}_2$ & $\text{NO}_2$)** dan bukan ISPU resmi tujuh parameter berbasis pemantauan kontinu 24 jam.

## 3. Berkas Sumber untuk Verifikasi

- `src/scripts/lab/core/aqi-calculator.js`: Implementasi `P14_2020`, `calculateSubIndex`, `getISPUCategory`, `getISPUFromSubIndices`, dan `getDominantParameterSummary`.
- `src/scripts/lab/core/validate-dataset.js`: Validator skema JSON dataset tahunan.
- `src/pages/lab/methodology.astro` & `src/content/work/aqi-cirebon.md`: Dokumentasi publik metodologi dan keterbatasan dataset.
- `public/data/aqi/regions.json` & `public/data/aqi/cirebon-2021..2025.json`: Manifest dan artefak data tervalidasi.

## 4. Komponen yang Telah Berjalan

- Perhitungan sub-indeks murni untuk `so2`, `no2`, dan `pm25` beserta penanganan nilai `0` sebagai observasi sah (`ISPU = 0`, *Baik*), nilai `null` sebagai `status: 'missing'`, konsentrasi di atas batas tertinggi tabel sebagai `status: 'out-of-range'` (kategori *Berbahaya* tanpa ekstrapolasi angka), dan `validPercent < 75` sebagai `status: 'insufficient-data'` (`verified-current`).

## 5. Rencana Masa Depan dan Batas Sistem

- **Parameter Regulasi yang Belum Diimplementasikan (`observed`)**: Empat parameter lain dalam PermenLHK P.14/2020 (`pm10`, `o3`, `co`, `hc`) sengaja mengembalikan `status: 'unsupported-parameter'` karena tidak terdapat pada dataset sumber Cirebon dan tabel primernya belum dimasukkan tanpa verifikasi dokumen sumber.
- **Satuan $\mu\text{g/Nm}^3$ vs $\mu\text{g/m}^3$ (`observed`)**: Fungsi `normalizeUnit()` memperlakukan `'µg/Nm³'` dari laporan DLH Cirebon setara dengan `'µg/m³'` sesuai pelaporan sumber tanpa mengarang faktor konversi suhu/tekanan yang tidak dilaporkan sumber.

## 6. Pengujian Pendukung

- `node scripts/test-lab-core.mjs`: 54 PASS, 0 FAIL.
- `node scripts/test-v13-ts-parity.mjs`: Memverifikasi paritas golden output dan pembuktian aritmetika $\text{SO}_2 = 83.9 \to 63.21171875 \to 63$.
