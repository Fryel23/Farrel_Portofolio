---
codexId: "equity-data-structure-and-observational-limits"
decimalCode: "301.1"
title: "Equity Data Structure and Observational Limits (Reserved Blueprint)"
domain: "300-quant-and-markets"
maturity: "SEEDLING"
summary: "Catatan metodologis awal untuk slot rencana sistem eksplorasi saham Indonesia (berstatus RESERVED pada baseline V12.3/V13.0), membedakan observasi deskriptif dari klaim prediktif serta merinci syarat bukti sebelum implementasi."
sourceFiles:
  - "src/content/work/saham-indonesia.md"
sourceEvidence:
  - claim: "Entri work saham-indonesia berstatus RESERVED dengan placeholder rencana pengambilan data yfinance dan indikator sederhana; belum ada kode pipeline, dataset, atau model yang diimplementasikan di repositori."
    status: "observed"
    file: "src/content/work/saham-indonesia.md"
    reference: "Lines 1-18 (status: RESERVED, contentId: saham-indonesia)"
    verifiedBy: "scripts/test-content-integrity.mjs"
relatedCodexIds:
  - "finite-state-csv-parsing-and-worker-isolation"
relatedWorkIds:
  - "saham-indonesia"
relatedAdrIds:
  - "v12-2-implementation-report"
formulas: []
updatedAt: "2026-11-04"
---

## 1. Mekanisme dan Ruang Lingkup Topik

Catatan ini mendokumentasikan batas metodologis dan struktur data untuk domain **300 (Quantitative & Market Analysis)** yang berkaitan dengan entri `src/content/work/saham-indonesia.md`.

**Pernyataan Status Eksplisit (`observed`):** Pada baseline V12.3 maupun V13.0, sistem analisis atau rekomendasi saham Indonesia **belum diimplementasikan**. Berkas `src/content/work/saham-indonesia.md` berstatus `RESERVED` (`tag: "Coming Soon"`), tidak memiliki rute halaman detail publik (`/work/saham-indonesia` tidak dibangun oleh `getStaticPaths()`), dan tidak mengklaim teknologi, disiplin, maupun temuan apa pun. Sesuai kebijakan integritas lintas-koleksi, rujukan ke `saham-indonesia` dari catatan ini berstatus **reference-only** (tidak menghasilkan tautan anchor aktif ke rute yang belum ada).

## 2. Bukti Tersedia di Repositori

Satu-satunya bukti yang ada di repositori saat ini (`observed` pada 2026-11-04) adalah dokumen placeholder `src/content/work/saham-indonesia.md`:

- Field `status` bernilai `"RESERVED"` dan `contentId` bernilai `"saham-indonesia"`.
- Field `description` mencatat niat rancangan: *"Rencana terdekat: membuat sistem rekomendasi saham Indonesia berskala kecil. Datanya akan diambil dari yfinance, dengan beberapa indikator sederhana. Belum dimulai, tapi sudah dipikirkan."*
- Sesuai keputusan arsitektural V12.2 (tercatat pada ADR `v12-2-implementation-report`), entri `RESERVED` sengaja tidak mengisi array `disciplines`, `technologies`, `methodology`, atau `findings` agar metadata skema tidak mengarang kapabilitas yang belum dibangun.

## 3. Berkas Sumber untuk Verifikasi

| Berkas Repositori | Status Aktual | Keterangan Verifikasi |
|---|---|---|
| `src/content/work/saham-indonesia.md` | `RESERVED` (Non-routeable) | Placeholder jujur untuk rencana eksplorasi saham Indonesia. |
| `src/data/content-integrity.js` | Aktif (`verified-current`) | Menolak tautan publik ke entri `RESERVED` (`NON_ROUTEABLE_STATUSES`) dan menandainya sebagai reference-only pada graf pengetahuan. |

## 4. Komponen yang Telah Berjalan

- **Penegakan Kebijakan Visibilitas `RESERVED` (`verified-current`)**: Validator `validateWorkCollection()` dan `buildCodexKnowledgeGraph()` memastikan bahwa `work:saham-indonesia` memiliki `routeable: false` dan `url: null`. Tidak ada halaman publik atau tautan mati yang dihasilkan.
- **Kesiapan Primitif Statistik Dasar (`verified-current`)**: Fungsi statistik deskriptif null-safe pada `src/scripts/lab/shared/stats.js` (`mean`, `median`, `min`, `max`, `standardDeviation`) sudah tersedia sebagai utilitas murni, namun belum dihubungkan ke pipeline data pasar modal mana pun.

## 5. Rencana Masa Depan dan Batas Sistem (Methodological Considerations)

Bagian berikut mencatat pertimbangan metodologis umum (*methodological considerations*) yang wajib dipenuhi apabila modul ini kelak dibangun (`planned`), dan **bukan** klaim bahwa penanganan berikut sudah ada di repositori:

1. **Pembedaan Eksplorasi Deskriptif vs Klaim Prediktif (`planned`)**:
   - Ringkasan historis (seperti rata-rata bergerak, volatilitas terealisasi, atau drawdown masa lalu) bersifat deskriptif terhadap sampel masa lalu dan tidak boleh disajikan sebagai jaminan imbal hasil masa depan atau nasihat keuangan.
2. **Risiko Struktur Data Deret Waktu Ekuitas (*Methodological Considerations*)**:
   - **Hari Non-Bursa & Kalender Perdagangan (*Non-Trading Days*)**: Deret waktu harian Bursa Efek Indonesia (BEI / IDX) memiliki jeda akhir pekan dan hari libur nasional; perhitungan indikator berbasis jendela hari perdagangan ($T$ bursa) berbeda dengan hari kalender.
   - **Aksi Korporasi (*Corporate Actions*)**: Pemecahan saham (*stock split*), penggabungan saham (*reverse split*), dividen tunai, dan *rights issue* mengubah seri harga penutupan mentah; perbandingan lintas-waktu memerlukan kejelasan apakah seri harga telah disesuaikan (*adjusted close*) atau belum.
   - **Zona Waktu & Sinkronisasi Penutupan (*Timezone Alignment*)**: Jam perdagangan BEI menggunakan WIB (`Asia/Jakarta`, UTC+7); pencatatan tanggal dari penyedia data pihak ketiga harus dinormalisasi agar tidak bergeser satu hari akibat konversi UTC.
   - **Missing Ticks & Suspensi Perdagangan**: Saham yang mengalami penghentian sementara (*suspension*) atau tidak memiliki transaksi pada hari tertentu harus direpresentasikan secara eksplisit sebagai `null` atau volume `0` sesuai kejadian sumber, tanpa interpolasi tersembunyi.
   - **Survivorship Bias**: Mengambil daftar emiten yang hanya aktif hari ini mengabaikan emiten yang telah *delisting* di masa lalu, sehingga dapat menghasilkan bias optimistis pada pengujian historis.
3. **Bukti yang Diperlukan Sebelum Modul Dapat Diklaim Aktif**:
   - Skrip ingestion offline dengan checksum `SHA-256` atas berkas sumber mentah.
   - Skema JSON tervalidasi beserta daftar keterbatasan sumber (*limitations*).
   - Suite pengujian unit deterministik yang memverifikasi perhitungan indikator terhadap fixture yang diaudit.
   - Pembaruan status `src/content/work/saham-indonesia.md` dari `RESERVED` menjadi `LIVE` atau `DEMO` hanya setelah rute dan artefak data nyata tersedia.

## 6. Pengujian Pendukung

- `node scripts/test-content-integrity.mjs`: Memastikan kebijakan visibilitas entri `RESERVED` tetap ditegakkan.
- `node scripts/test-v13-codex.mjs`: Memastikan `work:saham-indonesia` direpresentasikan sebagai node *reference-only* (`routeable: false`, `url: null`) tanpa tautan mati.
