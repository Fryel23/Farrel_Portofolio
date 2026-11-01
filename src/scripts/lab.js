/*!
 * lab.js: PUBLIC FACADE / page entry untuk The Data Lab (konvensi V11.1-M,
 * identik dengan about.js / connect.js / archive.js).
 *
 * Single responsibility: mendaftarkan boot halaman /lab ke lifecycle inti
 * (core/page-lifecycle.js) dan memetakan initDataLab ke daftar interactions.
 * Tidak ada logika lain di sini - implementasi hidup di lab/.
 *
 * Chart.js TIDAK diimpor di file ini secara statis: ia dimuat dynamic oleh
 * lab/charts/chart-loader.js hanya ketika chart pertama kali dirender, dan
 * modul ini hanya diimpor oleh src/pages/lab/*.astro sehingga homepage
 * tidak pernah menyentuh chunk Chart.js (spec §11.1, §16.1).
 */
import { bootPage } from './core/page-lifecycle.js';
import { initDataLab } from './lab/index.js';

bootPage({
  interactions: [initDataLab],
});
