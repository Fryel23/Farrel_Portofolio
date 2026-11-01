/*!
 * lab/charts/chart-loader.js - Pemuat Chart.js yang diisolasi rute.
 *
 * Single responsibility: dynamic import('chart.js') HANYA ketika Data Lab
 * benar-benar diinisialisasi di /lab (spec §11.1). File ini TIDAK boleh
 * diimpor oleh BaseLayout, global.js, atau entry homepage - hanya oleh
 * orchestrator Data Lab. Vite menghasilkan chunk terpisah untuk modul ini,
 * sehingga homepage tidak pernah memuat Chart.js (spec §16.1).
 *
 * Registrasi selektif (spec §11.2): hanya LineController, LineElement,
 * PointElement, LinearScale, CategoryScale, Tooltip, Legend. Tidak memakai
 * chart.js/auto. Tidak ada date adapter (label = string ISO/tahun, category
 * scale). Filler tidak dipakai (tanpa area fill).
 */

let chartModulePromise = null;

/**
 * @returns {Promise<typeof import('chart.js').Chart>}
 */
export function loadChartLib() {
  if (!chartModulePromise) {
    chartModulePromise = (async () => {
      /* chart.js v4 mengekspor seluruh controller/element/scale/plugin dari
         root package - satu dynamic import, lalu registrasi selektif. */
      const {
        Chart,
        LineController,
        LineElement,
        PointElement,
        LinearScale,
        CategoryScale,
        Tooltip,
        Legend,
      } = await import('chart.js');

      Chart.register(
        LineController,
        LineElement,
        PointElement,
        LinearScale,
        CategoryScale,
        Tooltip,
        Legend,
      );
      return Chart;
    })().catch((error) => {
      /* Gagal import tidak boleh tertahan permanen - reset agar retry
         benar-benar mencoba lagi (spec §8.3, §13.5). */
      chartModulePromise = null;
      throw error;
    });
  }
  return chartModulePromise;
}
