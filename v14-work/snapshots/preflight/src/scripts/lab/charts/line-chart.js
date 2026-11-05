/*!
 * lab/charts/line-chart.js - Controller satu instance chart (spec §11.4).
 *
 * Single responsibility: kepemilikan SATU instance Chart di satu canvas:
 * create sekali, update (bukan create kedua) saat data berubah, destroy
 * saat navigasi keluar. Status empty/error diwakili overlay di luar canvas
 * sehingga chart lama tidak tertinggal (no "canvas already in use").
 *
 * Chart.js bukan resource WebGL - TIDAK didaftarkan ke motionRegistry
 * (spec §12.3); cleanup dilakukan langsung oleh orchestrator lewat
 * controller.destroy().
 */

import { loadChartLib } from './chart-loader.js';

export function createLineChartController({ canvas, overlay }) {
  let chartInstance = null;

  function showOverlay(kind, title, description) {
    if (!overlay) return;
    overlay.hidden = false;
    overlay.dataset.kind = kind;
    const titleElement = overlay.querySelector('[data-overlay-title]');
    const descriptionElement = overlay.querySelector('[data-overlay-description]');
    if (titleElement) titleElement.textContent = title;
    if (descriptionElement) descriptionElement.textContent = description || '';
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.hidden = true;
  }

  /**
   * Render konfigurasi baru. Instance dipakai ulang bila ada (update, bukan
   * create kedua di canvas yang sama - spec §11.4).
   */
  async function render(config) {
    const Chart = await loadChartLib(); /* bisa throw → ditangkap orchestrator */
    if (chartInstance) {
      chartInstance.data = config.data;
      chartInstance.options = config.options;
      chartInstance.update('none');
      hideOverlay();
      return chartInstance;
    }
    chartInstance = new Chart(canvas, config);
    hideOverlay();
    return chartInstance;
  }

  function showEmpty(description) {
    destroyChart();
    showOverlay('empty', 'Tidak ada data untuk kombinasi ini', description);
  }

  function showError(description) {
    destroyChart();
    showOverlay('error', 'Grafik tidak dapat dirender', description);
  }

  function destroyChart() {
    if (chartInstance) {
      try {
        chartInstance.destroy();
      } catch (error) {
        /* instance mungkin sudah mati bersama DOM lama */
      }
      chartInstance = null;
    }
  }

  function destroy() {
    destroyChart();
    hideOverlay();
  }

  return { render, showEmpty, showError, destroy };
}
