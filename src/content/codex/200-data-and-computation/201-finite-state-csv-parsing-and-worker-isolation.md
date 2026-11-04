---
codexId: "finite-state-csv-parsing-and-worker-isolation"
decimalCode: "201.1"
title: "Finite-State RFC 4180 CSV Parsing and Web Worker Isolation"
domain: "200-data-and-computation"
maturity: "EVERGREEN"
summary: "Implementasi parser generator CSV berbasis empat state eksplisit, pemisahan statistik penuh dari sampling chart di dalam Web Worker, dan kontrak batas resource keras untuk mencegah kehabisan memori di main thread."
sourceFiles:
  - "src/scripts/lab/shared/csv-parser.js"
  - "src/scripts/lab/shared/csv-analysis.js"
  - "src/scripts/lab/workers/csv-worker.js"
  - "src/scripts/lab/csv.js"
  - "scripts/test-csv-explorer.mjs"
sourceEvidence:
  - claim: "iterateCsvRecords() mengimplementasikan generator state machine RFC 4180 dengan empat state aktual: field-start, quoted, after-quote, dan unquoted."
    status: "verified-current"
    file: "src/scripts/lab/shared/csv-parser.js"
    reference: "Lines 80-247 (iterateCsvRecords & CsvParseError)"
    verifiedBy: "scripts/test-csv-explorer.mjs"
  - claim: "Batas resource terpusat pada objek beku LIMITS: 10 MiB ukuran berkas, 100 kolom, 100.000 baris data, 500.000 sel, 5.000 titik chart, dan 5 baris pratinjau."
    status: "verified-current"
    file: "src/scripts/lab/shared/csv-analysis.js"
    reference: "Lines 54-61 (LIMITS constant)"
    verifiedBy: "scripts/test-csv-explorer.mjs"
  - claim: "Statistik deskriptif (mean, median, min, max) dihitung atas seluruh nilai valid kolom numerik pada buildAnalysisPayload() sebelum array sementara dibebaskan, bukan dari data chart hasil sampling."
    status: "verified-current"
    file: "src/scripts/lab/shared/csv-analysis.js"
    reference: "Lines 283-303, 334-365 (statsByColumnId & sampleChartIndices)"
    verifiedBy: "scripts/test-csv-explorer.mjs"
  - claim: "Web Worker hanya menyimpan satu referensi activeFile dan tidak pernah mengirimkan array baris CSV mentah penuh maupun membocorkan isi sel pada pesan WORKER_ERROR."
    status: "verified-current"
    file: "src/scripts/lab/workers/csv-worker.js"
    reference: "Lines 47-155 (activeFile, processWorkerRequest, toSafeErrorPayload)"
    verifiedBy: "scripts/test-v13-ts-parity.mjs"
relatedCodexIds:
  - "single-owner-lifecycle-and-motion-registry"
  - "ispu-p14-2020-linear-interpolation-and-time-basis"
relatedWorkIds:
  - "aqi-cirebon"
relatedAdrIds:
  - "v12-3-implementation-report"
formulas:
  - id: "csv-chart-sample-stride"
    label: "Deterministic Chart Sampling Stride"
    sourceNotation: "s = \\lceil N / M_{\\max} \\rceil, \\quad M_{\\max} = 5000"
    plainExplanation: "Langkah sampling indeks chart (s) adalah pembulatan ke atas dari jumlah total baris data (N) dibagi kuota maksimum titik chart (5.000), dengan indeks pertama (0), indeks terakhir (N - 1), dan representasi gap nilai null dipertahankan."
    mathmlKind: "sample-stride"
    variables:
      - symbol: "s"
        meaning: "Langkah indeks (stride) antar-titik sampel pada deret waktu/kategori"
        unit: "indeks"
      - symbol: "N"
        meaning: "Jumlah total baris data (totalRecords) pada berkas CSV"
        unit: "baris"
      - symbol: "M_max"
        meaning: "Kuota keras titik chart (LIMITS.MAX_CHART_POINTS = 5000)"
        unit: "titik"
updatedAt: "2026-11-04"
---

## 1. Mekanisme dan Ruang Lingkup Topik

Pemrosesan berkas CSV yang diunggah pengguna di browser memiliki dua risiko utama: pemblokiran *main thread* saat mem-parsing ratusan ribu sel, serta lonjakan alokasi memori apabila seluruh matriks string disimpan sekaligus atau dikirim melalui `postMessage` menuju thread UI. Selain itu, berkas CSV dunia nyata sering memuat koma di dalam tanda kutip, kutip ganda ter-escape (`""`), baris baru di dalam sel ber-kutip, BOM UTF-8, maupun kesalahan format kutip.

Untuk mengatasi masalah tersebut secara deterministik tanpa dependency eksternal, modul CSV Explorer (`/lab/csv`) memisahkan arsitektur ke dalam tiga lapisan murni:

1. **Lapisan Sintaks (`src/scripts/lab/shared/csv-parser.js`)**: generator `iterateCsvRecords(text)` yang memancarkan (`yield`) satu record (`string[]`) setiap kali bertemu akhir baris logis.
2. **Lapisan Semantik & Analisis (`src/scripts/lab/shared/csv-analysis.js`)**: fungsi murni `buildAnalysisPayload()` dan `buildChartPayload()` yang menegakkan batas `LIMITS`, mengklasifikasikan kolom secara konservatif, menghitung statistik atas populasi penuh, dan melakukan downsampling deterministik khusus untuk seri visualisasi.
3. **Lapisan Isolasi Eksekusi (`src/scripts/lab/workers/csv-worker.js`)**: *module Web Worker* yang mendekode byte `ArrayBuffer` dengan `TextDecoder('utf-8', { fatal: true })` dan hanya mengirimkan ringkasan terstruktur ke *main thread*.

## 2. Bukti Tersedia di Repositori

Seluruh mekanisme berikut terbukti secara langsung pada kode sumber dan suite pengujian (`verified-current` pada 2026-11-04):

### 2.1. State Machine Parser RFC 4180

Generator `iterateCsvRecords(text)` di `src/scripts/lab/shared/csv-parser.js` beroperasi menggunakan empat state string eksplisit:

- `'field-start'`: posisi awal field (di awal teks, setelah koma `,`, atau setelah pemisah baris `LF`/`CRLF`). Jika karakter berikutnya adalah `"`, state berpindah ke `'quoted'`; jika koma, field kosong diselesaikan; jika karakter biasa, state berpindah ke `'unquoted'`.
- `'quoted'`: berada di dalam field ber-kutip. Karakter koma, `CR`, dan `LF` diperlakukan sebagai isi teks. Jika bertemu `"` diikuti `"` (`text.charCodeAt(i + 1) === 34`), pasangan tersebut digabung menjadi satu kutip literal melalui buffer segmen `parts` dan indeks maju 2 posisi. Jika bertemu `"` tunggal, state berpindah ke `'after-quote'`.
- `'after-quote'`: tepat setelah tanda kutip penutup. Hanya mengizinkan koma `,`, `LF`, `CRLF`, atau akhir teks (`EOF`). Karakter lain (termasuk spasi setelah kutip penutup) segera melempar `CsvParseError` berkode `CSV_TRAILING_CHARS`.
- `'unquoted'`: membaca karakter biasa hingga koma atau akhir baris. Jika bertemu `"` di tengah field tanpa kutip pembuka, parser melempar `CsvParseError` berkode `CSV_ILLEGAL_QUOTE`. Jika mencapai `EOF` saat masih di state `'quoted'`, parser melempar `CSV_UNCLOSED_QUOTE`.

### 2.2. Kontrak Batas Resource (`LIMITS`)

Konstanta `LIMITS` pada `src/scripts/lab/shared/csv-analysis.js` dibekukan dengan `Object.freeze()`:

| Konstanta | Nilai Aktual | Penegakan |
|---|---:|---|
| `MAX_FILE_BYTES` | `10.485.760` (10 MiB) | Diperiksa sebelum `file.arrayBuffer()` di `csv-worker.js` (`CSV_LIMIT_FILE_SIZE`) dan di UI `csv.js`. |
| `MAX_COLUMNS` | `100` | Diperiksa saat ekstraksi header di `createHeaderMetadata()` (`CSV_LIMIT_COLUMNS`). |
| `MAX_RECORDS` | `100.000` | Diperiksa secara inkremental per record di dalam loop iterasi (`CSV_LIMIT_RECORDS`). |
| `MAX_CELLS` | `500.000` | Diperiksa secara inkremental sebelum sel diproses (`CSV_LIMIT_CELLS`). |
| `MAX_CHART_POINTS` | `5.000` | Kuota keras jumlah titik yang dikirim ke Chart.js melalui `sampleChartIndices()`. |
| `MAX_PREVIEW_ROWS` | `5` | Jumlah maksimum baris contoh yang disertakan pada `preview.rows`. |

### 2.3. Pemisahan Statistik Penuh vs Sampling Chart

Pada `buildAnalysisPayload()`, nilai numerik setiap kolom kandidat dikumpulkan selama iterasi streaming, lalu dihitung `mean`, `median`, `min`, dan `max` menggunakan `src/scripts/lab/shared/stats.js` atas **seluruh baris valid** sebelum referensi `state.numericValues = null` dibebaskan. Sebaliknya, `sampleChartIndices(values)` hanya dipanggil di dalam `buildChartPayload()` untuk membatasi jumlah titik visualisasi agar render Canvas Chart.js tidak membebani memori:

<div class="codex-inline-math" role="region" aria-label="Rumus langkah sampling chart">
  <math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
    <mrow>
      <mi>s</mi>
      <mo>=</mo>
      <mrow>
        <mo>&#x2308;</mo>
        <mfrac>
          <mi>N</mi>
          <msub>
            <mi>M</mi>
            <mtext>max</mtext>
          </msub>
        </mfrac>
        <mo>&#x2309;</mo>
      </mrow>
      <mo>,</mo>
      <mspace width="1em"></mspace>
      <msub>
        <mi>M</mi>
        <mtext>max</mtext>
      </msub>
      <mo>=</mo>
      <mn>5000</mn>
    </mrow>
  </math>
</div>

Setelah memilih indeks dengan langkah `s` serta indeks terakhir `N - 1`, `sampleChartIndices()` menjalankan *gap pass*: apabila di antara dua indeks terpilih yang valid terdapat nilai `null` (missing value), indeks `null` pertama di antara keduanya disisipkan selama ukuran himpunan terpilih masih di bawah `5.000`. Hal ini memastikan konfigurasi `spanGaps: false` pada grafik tetap menampilkan celah data yang hilang.

## 3. Berkas Sumber untuk Verifikasi

- `src/scripts/lab/shared/csv-parser.js`: Implementasi `CsvParseError` dan `iterateCsvRecords`.
- `src/scripts/lab/shared/csv-analysis.js`: Implementasi `LIMITS`, `CsvAnalysisError`, `parseNumericValue`, `buildAnalysisPayload`, `sampleChartIndices`, `buildChartPayload`, dan `toSafeErrorPayload`.
- `src/scripts/lab/workers/csv-worker.js`: Kontrak pesan `ANALYZE_FILE` dan `GET_CHART_DATA` serta fungsi `processWorkerRequest`.
- `src/scripts/lab/csv.js`: Pengendali UI, pembuatan Worker dengan `new Worker(new URL('./workers/csv-worker.js', import.meta.url), { type: 'module' })`, dan pembatalan pekerjaan lama via `worker.terminate()`.
- `scripts/test-csv-explorer.mjs`: Suite 60 pengujian unit untuk parser, analisis, statistik, dan kontrak Worker.

## 4. Komponen yang Telah Berjalan

- **Kontrak Pesan Worker Terkorelasikan (`verified-current`)**: Setiap pesan `ANALYZE_FILE` dan `GET_CHART_DATA` membawa `requestId` unik yang dikembalikan persis pada `ANALYSIS_SUCCESS`, `CHART_SUCCESS`, atau `WORKER_ERROR`, sehingga *main thread* dapat mengabaikan respons dari permintaan yang telah dibatalkan.
- **Kebijakan Keamanan Pesan Error (`verified-current`)**: Fungsi `toSafeErrorPayload()` memastikan hanya error dengan kode berawalan `CSV_` (yang pesannya dibangun dari nomor baris/kolom tanpa menyertakan isi string sel) yang diteruskan ke UI; error tak terduga dipetakan ke pesan fallback generik.

## 5. Rencana Masa Depan dan Batas Sistem

- **Batas Memori Browser & Single Active File (`observed`)**: Meskipun parser berjalan secara generator, `readFileText(file)` membaca seluruh berkas (maksimum 10 MiB) ke dalam satu string UTF-8 di memori Worker, dan `GET_CHART_DATA` mem-parse ulang berkas aktif (`activeFile`) agar Worker tidak menahan salinan matriks sel di memori antar-permintaan.
- **Format Delimiter & Angka Lokal (`observed`)**: Parser hanya memproses delimiter koma (`,`) dan angka berformat titik desimal standar (`NUMERIC_RE`). Berkas TSV (tab-separated), titik-koma (`;`), atau angka dengan pemisah ribuan koma seperti `"1,000"` diklasifikasikan sebagai `categorical`.

## 6. Pengujian Pendukung

- `node scripts/test-csv-explorer.mjs`: 60 PASS, 0 FAIL.
- `node scripts/test-v13-ts-parity.mjs`: Menguji paritas digest SHA-256 dan menguji `processWorkerRequest()` secara langsung di Node.js.
