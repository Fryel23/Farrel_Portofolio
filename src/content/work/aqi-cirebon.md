---
title: "Air Quality Index Trends · Cirebon (2021–2025)"
category: "Data & Research"
tag: "Research / Data Analysis"
status: "IN PROGRESS"
# Identifier semantik stabil untuk relasi antarkonten. Sengaja
# sama dengan nama file (entry id) - keduanya tetap konsep berbeda:
# entry.id = dasar URL /work/<slug>, contentId = target relasi.
contentId: "aqi-cirebon"
# Taxonomy kanonis (id dari src/data/taxonomy.js; label dirender
# dari definisi kanonis, bukan free-text). Hanya yang terbukti:
# pipeline aktual berupa JavaScript/Astro/Chart.js + ingestion Node.js.
disciplines: ["data-analysis"]
technologies: ["javascript", "astro", "chart-js", "node-js"]
description: "Proyek riset yang sedang berjalan di atas dataset kualitas udara Kota Cirebon periode 2021–2025 (data tahun 2025 bersifat parsial / 4 titik stasiun pengukuran yang tersedia dari sumber resmi DLH Kota Cirebon). Fokus pada pembersihan nilai kosong tahun 2023, normalisasi skema lokasi-tahap-tahun, dan perhitungan sub-indeks ISPU terderivasi PermenLHK P.14/2020."
stack: ["Python", "pandas (learning)"]
image: "/assets/project-aqi.svg"
link: "https://opendata.cirebonkota.go.id/dataset/data-kualitas-udara"
linkLabel: "Buka Sumber Dataset"
kicker: "01 / RESEARCH IN PROGRESS"
# Field editorial - hanya fakta yang terverifikasi dari
# implementasi aktual (skrip kompilasi, dataset JSON, halaman methodology).
context: "Riset ini berjalan di atas data resmi DLH Kota Cirebon 2021–2025 (SO₂ dan NO₂ dalam µg/Nm³, 23 lokasi, dua tahap pengukuran per tahun; data tahun 2025 bersifat parsial pada 4 titik stasiun pengukuran). Eksplorasinya kini hidup sebagai The Data Lab di /lab: explorer statis yang menampilkan pengukuran apa adanya, menghitung ISPU terderivasi dengan rumus Permen LHK P.14/2020, dan menampilkan keterbatasan data sebagai bagian dari halaman - bukan menyembunyikannya."
methodology:
  - "Dataset sumber: CSV resmi DLH Kota Cirebon 2021–2025 (200 baris, 23 lokasi, TAHAP I & TAHAP II); tersimpan di data/sources/ dengan sha256 tercatat pada manifest ingest."
  - "Script ingestion Node.js mem-parsing CSV, memvalidasi header, dan menormalisasi whitespace nama lokasi tanpa mengubah nilai."
  - "Baris SO₂ dan NO₂ yang terpisah (per tahap pengukuran) diagregasi menjadi satu record per kombinasi lokasi, tahun, dan tahap."
  - "Sub-indeks dan ISPU dihitung secara deterministik dengan rumus interpolasi Permen LHK P.14/2020 lewat modul bersama yang sama dengan explorer; hasil ditandai sebagai nilai terderivasi karena basis waktu tahap tidak dilaporkan sumber."
  - "Nilai kosong dipertahankan sebagai null (tidak diimputasi); nilai 0,0 diperlakukan sebagai pengukuran valid; baris duplikat dicatat pada record, tidak dihapus diam-diam."
  - "Dataset JSON hasil kompilasi divalidasi otomatis (skema, rentang ISPU, provenance sumber) sebelum ditayangkan di explorer."
  - "Explorer /lab merender data statis dengan Chart.js yang diimpor dinamis hanya di rute /lab; gap data tidak pernah disambungkan (spanGaps: false)."
limitations:
  - "Sumber hanya melaporkan SO₂ dan NO₂; ISPU yang ditampilkan adalah derivasi dua parameter, bukan ISPU resmi tujuh parameter P.14/2020."
  - "Basis waktu agregasi tahap pengukuran tidak dilaporkan sumber; periode referensi tabel ISPU 24 jam tidak otomatis menjadikan data sumber berbasis 24 jam."
  - "Tahun 2023 memuat enam kelompok bernilai 0,0 untuk SO₂ dan NO₂ serentak; diperlakukan sebagai pengukuran valid dan didokumentasikan, bukan diimputasi."
  - "Tahun 2024 memuat dua baris NO₂ pada satu lokasi; kemunculan pertama yang dipakai dan semua kemunculan disimpan pada record."
  - "Cakupan 2025 masih parsial (4 lokasi, TAHAP I)."
  - "Koordinat GPS dan metode pengukuran tidak disediakan sumber sehingga tidak ditampilkan."
# 3 scene naratif (Masalah -> Proses -> Temuan), ditulis apa adanya
# sesuai nada jujur arsip. Tanpa image -> placeholder arsip yang dirender
# komponen CaseNarrative.
narrative:
  - label: "MASALAH"
    title: "Data yang bolong"
    text: "Dataset kualitas udara Cirebon tidak rapi. Baris 2023 punya banyak nilai kosong, dan kalau dihitung apa adanya, trennya berbohong. Masalah pertama bukan polanya, tapi kepercayaan pada datanya."
  - label: "PROSES"
    title: "Membersihkan sebelum menyimpulkan"
    text: "Nilai kosong ditandai, bukan dihapus diam-diam. Format antar tahun disamakan, lalu perbandingan hanya dihitung pada rentang yang benar-benar lengkap. Lambat, tapi bisa dipertanggungjawabkan."
  - label: "TEMUAN"
    title: "Pola, belum kesimpulan"
    text: "Ada indikasi pergeseran tren antar tahun sepanjang 2021–2025, tapi angka final sengaja belum dipasang sebagai klaim mutlak. Penelitian masih berjalan; temuan di sini disimpan sebagai catatan proses dan dapat dijelajahi langsung di /lab."
---

Proyek yang sedang berjalan untuk periode pengukuran **2021–2025**. Saya sedang membersihkan data kualitas udara Kota Cirebon dan mencoba membaca polanya secara jujur. Dataset mencakup periode 2021–2025 (data tahun 2025 bersifat parsial / 4 titik stasiun pengukuran yang tersedia dari sumber resmi DLH Kota Cirebon). Ada satu hal penting yang saya sadari saat mengolahnya: data tahun 2023 punya banyak nilai kosong, dan itu mengubah cara saya mengevaluasi tren multi-tahun.

## Yang sedang dikerjakan

- Mengumpulkan data kualitas udara terbuka dari sumber resmi Dinas Lingkungan Hidup (DLH) Kota Cirebon untuk rentang tahun 2021–2025.
- Membersihkan data: menangani nilai kosong (terutama tahun 2023), mencatat duplikasi baris tahun 2024, serta menandai cakupan parsial tahun 2025 (4 lokasi pada Tahap I).
- Membangun pipeline verifikasi dan penjelajah interaktif di [The Data Lab (/lab)](/lab) untuk melihat pola tren SO₂, NO₂, dan sub-indeks ISPU terderivasi tanpa memaksakan kesimpulan prematur.

## Batasan yang diakui

Data tahun 2023 punya banyak nilai kosong dan data tahun 2025 masih bersifat parsial (4 stasiun pada Tahap I), sehingga perbandingan antar tahun harus dibaca hati-hati. Tidak ada angka yang ditampilkan sebelum benar-benar bisa dipertanggungjawabkan ke tabel sumber aslinya.
