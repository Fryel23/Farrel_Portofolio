/*!
 * archive.js: PUBLIC ENTRY facade untuk branch arsip (modularized
 * V11.1-M).
 *
 * Single responsibility: menjaga path import publik
 * `src/scripts/archive.js` tetap stabil bagi halaman Astro
 * (M14 safe migration) sambil implementasi hidup di feature modules
 * di bawah `archive/`. File ini TIDAK berisi logika fitur; bootPage()
 * hanya dijalankan dari archive/index.js (tidak ada double-boot).
 */
import './archive/index.js';
