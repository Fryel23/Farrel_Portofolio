# OFFLINE ETL & PROVENANCE CONTRACT (`scripts/data/`)

Dokumen ini menetapkan kontrak rekayasa data (*Offline Extract-Transform-Load / ETL*) untuk repositori *The Living Archive*. Sesuai prinsip desain V13.0-E, repositori mempertahankan `scripts/data/build-cirebon-dataset.mjs` dan `scripts/data/sync-adr-collection.mjs` sebagai sumber kebenaran (*single source of truth*) yang terfokus, tanpa membangun kerangka kerja ETL generik yang berlebihan.

---

## 1. Input Berkas dan Provenance (`data/sources/`)

| Pipeline | Berkas Input Mentah | Ukuran (Bytes) | SHA-256 Sumber Asli | Tanggal Akses (`accessedAt`) |
|---|---|---:|---|---|
| AQI Kota Cirebon (2021-2025) | `data/sources/data_kualitas_udara_2.csv` | `22.288` | `9ce4de3d0466c71d1ce10447941236e9b7cfc19af255c6831fec89a5d25a31a0` | `2026-11-01` |
| Engineering Records Vault (ADR) | 13 berkas laporan historis V10.3 s.d. V12.3 (terdaftar di `ADR_MANIFEST`) | `642.845` (total) | Diverifikasi per berkas pada `src/lib/adr-taxonomy.ts` | Sesuai tanggal laporan sumber |

Aturan mutlak provenance:
1. Berkas input mentah di `data/sources/` dan laporan historis di root repositori bersifat **read-only** dan tidak boleh ditimpa oleh hasil transformasi.
2. Checksum SHA-256 wajib dihitung dari byte mentah (`Buffer`) berkas sumber asli sebelum normalisasi string apa pun.
3. Seluruh path yang ditulis ke dalam artefak audit (`data/cirebon-ingest-audit.json` dan frontmatter `provenance.sourcePath`) wajib berupa path relatif portabel terhadap root proyek (menggunakan pemisah `/`), dan dilarang keras memuat path absolut mesin lokal (seperti `/home/...` atau `C:\...`).
4. Field `accessedAt` (`2026-11-01`) mencerminkan tanggal pengunduhan data dari portal Open Data Kota Cirebon, bukan timestamp saat skrip dijalankan.

---

## 2. Encoding, Parser, dan Validasi Header

- **Encoding:** Seluruh berkas input dibaca sebagai UTF-8 (`readFileSync(INPUT_PATH, 'utf8')`).
- **Parser CSV Offline (`scripts/data/csv-parser.mjs`):** Mem-parsing sel ber-kutip, koma di dalam kutip, dan baris baru di dalam kutip tanpa mengubah presisi numerik.
- **Validasi Header Eksplisit:** Baris pertama wajib cocok persis setelah normalisasi spasi dengan daftar 10 kolom berikut:
  ```text
  id | kode_provinsi | nama_provinsi | kode_kabupaten_kota | nama_kabupaten_kota | lokasi | tahap | parameter | indeks_kualitas_udara | tahun
  ```
  Jika urutan atau nama kolom menyimpang, proses ETL langsung berhenti dengan kode keluar non-nol (`throw new Error(...)`).

---

## 3. Normalisasi yang Diizinkan

1. **Pembersihan Spasi Nama Lokasi (`collapseWhitespace`):** Mengubah karakter baris baru atau spasi beruntun di dalam nama lokasi menjadi satu spasi tunggal tanpa mengubah huruf atau tanda baca.
2. **Pemetaan Parameter Berbasis Whitelist (`PARAMETER_MAP`):**
   - `'SO₂ (µg/Nm³)' -> { id: 'so2', unit: 'µg/Nm³' }`
   - `'NO₂ (µg/Nm³)' -> { id: 'no2', unit: 'µg/Nm³' }`
   Parameter di luar daftar ini menggagalkan build (mencegah pemetaan diam-diam).
3. **Normalisasi Salinan Publik ADR (`normalizeAdrCopyContent`):** Pada pipeline ADR (`sync-adr-collection.mjs`), karakter em-dash `U+2014` pada salinan publik di `src/content/adr/*.md` diganti menjadi tanda hubung ASCII disertai pencatatan jumlah penggantian pada `provenance.normalizationCount`. Berkas sumber asli tidak dimodifikasi.

---

## 4. Kebijakan Nilai Null, Nol (`0,0`), Duplikat, dan Missing

- **Nilai Nol (`0` / `0,0`):** Diperlakukan sebagai angka pengukuran valid bernilai nol (`0`), **bukan** nilai hilang (`null`). Anomali 12 sel bernilai `0` pada Tahap I 2023 dicatat secara eksplisit dalam `data/cirebon-ingest-audit.json` (`zeroValueGroups`) dan `dataset.limitations`.
- **Nilai Hilang (`missing` / kosong):** Disimpan sebagai `null` pada JSON dengan status kualitas `'missing'` (contoh: 1 sel `NO2` kosong pada tahun 2024). Tidak pernah diisi dengan rata-rata atau angka nol.
- **Duplikat Baris Sumber:** Apabila kombinasi `(lokasi, tahun, tahap, parameter)` muncul lebih dari satu kali pada CSV sumber, nilai kemunculan pertama dipakai dan seluruh kemunculan dicatat di dalam array `record.duplicates` untuk transparansi audit.

---

## 5. Transformasi, Agregasi, dan Validasi Domain

1. Baris `SO2` dan `NO2` yang terpisah pada CSV sumber digabungkan berdasarkan kunci `(locationId, year, stage)` menjadi tepat `100` record observasi lintas 5 tahun (`24` record/tahun untuk 2021-2024, dan `4` record untuk Tahap I 2025).
2. Sub-indeks dihitung pada waktu build menggunakan modul murni `src/scripts/lab/core/aqi-calculator.js` (`calculateSubIndex` dan `getISPUFromSubIndices`) dengan opsi `{ allowBasisMismatch: true }` karena periode referensi tabel PermenLHK P.14/2020 adalah `24h`, sedangkan data sumber adalah agregat dua tahap per tahun (`basisMatched: false`).
3. Seluruh objek JSON tahunan divalidasi terhadap kontrak `validateDataset()` (`src/scripts/lab/core/validate-dataset.js`) sebelum dan sesudah ditulis ke `public/data/aqi/`.

---

## 6. Artefak Output dan Perintah Reproduksibilitas

Artefak yang dihasilkan:
- `public/data/aqi/regions.json`
- `public/data/aqi/cirebon-2021.json` s.d. `public/data/aqi/cirebon-2025.json`
- `data/cirebon-ingest-audit.json`

Perintah eksekusi ulang dan verifikasi:
```bash
node scripts/data/build-cirebon-dataset.mjs
node scripts/data/sync-adr-collection.mjs --check
node scripts/test-lab-core.mjs
```

---

## 7. Batas Apa yang Tidak Dilakukan Pipeline

1. Pipeline **tidak** melakukan interpolasi spasial antar-lokasi atau *smoothing* antar-tahap.
2. Pipeline **tidak** menghasilkan ISPU resmi 7-parameter penuh (karena sumber hanya menyediakan `SO2` dan `NO2` tanpa `PM10`, `PM2.5`, `CO`, `O3`, dan `HC`).
3. Pipeline **tidak** melakukan pengambilan data (*live scraping*) saat aplikasi web dibuka oleh pengguna.

---

## 8. Kontrak Interoperabilitas Node.js / Python (`scripts/data/etl-interop-fixture.json`)

Untuk memastikan pipeline Node.js saat ini dan skrip analisis Python di masa depan menghasilkan struktur data yang identik tanpa *numerical drift*, kedua runtime wajib mematuhi kontrak pertukaran berikut:

1. **Encoding & Format:** UTF-8 tanpa BOM; angka JSON ditulis dalam format titik desimal IEEE-754 standar (tanpa pemisah ribuan lokal seperti `1.000,00`).
2. **Schema Version:** Field root `"schemaVersion": 1` wajib ada dan bertipe integer.
3. **Semantik Null vs Zero:** Nilai hilang wajib direpresentasikan sebagai JSON `null` (bukan `NaN`, `""`, atau `-999`), dan pengukuran nol wajib direpresentasikan sebagai `0` atau `0.0`.
4. **Satuan & Basis Waktu Eksplisit:** Setiap record menyertakan satuan (`"µg/Nm³"`) serta metadata basis waktu (`"tableReferencePeriod": "24h"`, `"basisMatched": false`).
5. **Determinisme Digest Kanonis:** Ketika berkas fixture `scripts/data/etl-interop-fixture.json` dibaca oleh Node.js (`JSON.parse`) dan Python 3 (`json.loads`), lalu diserialisasi ulang secara kanonis (`sort_keys=True`, pemisah `(',', ':')`, `ensure_ascii=False`), kedua runtime wajib menghasilkan SHA-256 digest yang identik byte-demi-byte.
6. **Kode Keluar Proses (Exit Codes):**
   - `0`: Sukses dan lolos seluruh validasi skema.
   - `1`: Kegagalan validasi domain atau ketidaksesuaian checksum/skema.
   - `2`: Input mentah tidak ditemukan, tidak dapat dibaca, atau gagal di-parse.

Verifikasi silang Node.js (`v24.14.1`) dan Python (`Python 3.14.9`) terhadap `scripts/data/etl-interop-fixture.json` dieksekusi secara otomatis di dalam `scripts/audit-v13-zero-debt.mjs` (Gate 7).

---

## 9. Prosedur Menambahkan Dataset Masa Depan (`RESERVED_BLUEPRINT`)

Apabila kelak ditambahkan dataset baru (seperti data pasar modal untuk slot `saham-indonesia` atau dataset lingkungan regional baru):
1. Simpan berkas sumber mentah di `data/sources/<nama-dataset>.csv` dan catat SHA-256 byte aslinya.
2. Buat skrip ingestion terfokus di `scripts/data/build-<nama-dataset>.mjs` yang memvalidasi header dan menolak pemetaan kolom diam-diam.
3. Pisahkan dengan tegas nilai observasi sumber (*reported*) dari indikator turunan (*derived*), serta dokumentasikan keterbatasan basis waktu atau cakupan sampel pada blok `limitations`.
4. Tambahkan pengujian paritas dan skema sebelum mengubah status wilayah dari `RESERVED_BLUEPRINT` menjadi `OPERATIONAL` / `VERIFIED_DATASET`.
