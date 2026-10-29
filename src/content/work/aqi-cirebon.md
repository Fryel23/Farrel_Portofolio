---
title: "Air Quality Index Trends · Cirebon (2021–2024)"
category: "Data & Research"
tag: "Research / Data Analysis"
status: "IN PROGRESS"
description: "Proyek yang sedang berjalan. Saya sedang membersihkan data kualitas udara Cirebon dan mencoba melihat polanya. Ada satu hal yang saya sadari saat mengolahnya: data tahun 2023 punya banyak nilai kosong, dan itu sedikit mengubah cara saya melihat tren. Temuan dan kesimpulan belum ada, karena penelitiannya masih berlangsung."
stack: ["Python", "pandas (learning)"]
image: "/assets/project-aqi.svg"
link: "https://opendata.cirebonkota.go.id/dataset/data-kualitas-udara"
linkLabel: "Open dataset source"
kicker: "01 / RESEARCH IN PROGRESS"
# V10.0: 3 scene naratif (Masalah -> Proses -> Temuan), ditulis apa adanya
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
    text: "Ada indikasi pergeseran tren antar tahun, tapi angka final sengaja belum dipasang. Penelitian masih berjalan; temuan di sini disimpan sebagai catatan proses, bukan hasil akhir."
---

Proyek yang sedang berjalan. Saya sedang membersihkan data kualitas udara Cirebon dan mencoba melihat polanya. Ada satu hal yang saya sadari saat mengolahnya: data tahun 2023 punya banyak nilai kosong, dan itu sedikit mengubah cara saya melihat tren. Temuan dan kesimpulan belum ada, karena penelitiannya masih berlangsung.

## Yang sedang dikerjakan

- Mengumpulkan data kualitas udara terbuka dari sumber resmi Kota Cirebon.
- Membersihkan data: menangani nilai kosong (terutama tahun 2023) dan menyamakan format.
- Melihat pola tren per tahun tanpa memaksakan kesimpulan.

## Batasan yang diakui

Data tahun 2023 punya banyak nilai kosong, jadi perbandingan antar tahun harus dibaca hati-hati. Tidak ada angka yang ditampilkan sebelum benar-benar bisa dipertanggungjawabkan. Satu-satunya tautan yang dipasang di sini adalah sumber dataset terbukanya, karena itu satu-satunya hal yang sudah nyata.
