/*!
 * src/scripts/global/tiling-dock.ts - Reference Tiling Dock Controller (V13.0-D).
 *
 * Mengelola panel referensi samping pada layar desktop (>= 1024px) tanpa
 * memindahkan <main> atau mengganggu kanvas WebGL/Chart.js aktif.
 * Seluruh URL divalidasi terhadap allowlist same-origin melalui validateDockTargetUrl()
 * dan dirender di dalam <iframe sandbox=""> tanpa izin script.
 */

import { qs, qsa, showToast, trackMotionListener } from '../core.js';
import {
  validateDockTargetUrl,
  type WorldIndexPayload,
} from '../../lib/world-os-core.ts';

const DESKTOP_DOCK_MQ = '(min-width: 1024px)';
const DEFAULT_DOCK_PATH = '/lab/methodology';
const DEFAULT_DOCK_LABEL = 'ISPU P.14/2020 Methodology';

let currentDockPath = DEFAULT_DOCK_PATH;
let currentDockLabel = DEFAULT_DOCK_LABEL;
let statusChangeCallback: ((isOpen: boolean, path: string) => void) | null = null;

export function onDockStatusChange(cb: (isOpen: boolean, path: string) => void): void {
  statusChangeCallback = cb;
}

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DESKTOP_DOCK_MQ).matches;
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function isReferenceDockOpen(): boolean {
  const dock = qs('#world-reference-dock');
  return Boolean(dock && !dock.hidden && document.documentElement.getAttribute('data-dock-open') === 'true');
}

export function openReferenceDock(
  rawUrl: string = currentDockPath,
  label: string = currentDockLabel,
  index?: WorldIndexPayload | null
): { ok: boolean; reason?: string } {
  if (!isDesktopViewport()) {
    showToast('Reference Dock hanya tersedia pada layar desktop (>= 1024px).');
    return { ok: false, reason: 'Viewport di bawah 1024px.' };
  }

  const dock = qs('#world-reference-dock') as HTMLElement | null;
  const iframe = qs('#world-dock-iframe') as HTMLIFrameElement | null;
  const titleNode = qs('#world-dock-title') as HTMLElement | null;
  const openFullLink = qs('#world-dock-open-full') as HTMLAnchorElement | null;
  const statusNode = qs('#world-dock-status') as HTMLElement | null;

  if (!dock || !iframe) {
    return { ok: false, reason: 'Markup Reference Dock tidak ditemukan.' };
  }

  const validation = validateDockTargetUrl(rawUrl, index);
  if (!validation.ok) {
    if (statusNode) {
      statusNode.textContent = `BLOCKED: ${validation.reason}`;
    }
    return { ok: false, reason: validation.reason };
  }

  const safePath = validation.safePath;
  currentDockPath = safePath;
  currentDockLabel = label || safePath;

  /* Pastikan atribut keamanan iframe tetap ketat (tanpa allow-scripts / allow-top-navigation) */
  iframe.setAttribute('sandbox', '');
  iframe.setAttribute('referrerpolicy', 'same-origin');
  iframe.setAttribute('title', `Reference Workspace: ${currentDockLabel} (${safePath})`);

  if (titleNode) {
    titleNode.textContent = `${safePath} · ${currentDockLabel}`;
  }
  if (openFullLink) {
    openFullLink.setAttribute('href', safePath);
  }
  if (statusNode) {
    statusNode.textContent = `LOADING STATIC VIEW · ${safePath} (SANDBOXED, SCRIPTS DISABLED)`;
  }

  if (iframe.getAttribute('src') !== safePath) {
    iframe.setAttribute('src', safePath);
  }

  /* Sinkronkan tombol preset */
  const presetBtns = qsa('[data-dock-target]', dock);
  presetBtns.forEach((btn) => {
    const target = btn.getAttribute('data-dock-target') || '';
    btn.setAttribute('aria-pressed', target === safePath ? 'true' : 'false');
  });

  dock.hidden = false;
  document.documentElement.setAttribute('data-dock-open', 'true');

  if (statusChangeCallback) {
    statusChangeCallback(true, safePath);
  }

  return { ok: true };
}

export function closeReferenceDock(): void {
  const dock = qs('#world-reference-dock') as HTMLElement | null;
  if (dock) {
    dock.hidden = true;
  }
  document.documentElement.removeAttribute('data-dock-open');
  if (statusChangeCallback) {
    statusChangeCallback(false, currentDockPath);
  }
}

export function toggleReferenceDock(index?: WorldIndexPayload | null): boolean {
  if (isReferenceDockOpen()) {
    closeReferenceDock();
    return false;
  }
  const res = openReferenceDock(currentDockPath, currentDockLabel, index);
  return res.ok;
}

export function initReferenceDock(): void {
  const dock = qs('#world-reference-dock') as HTMLElement | null;
  if (!dock) return;

  /* Pastikan state bersih saat navigasi halaman baru */
  closeReferenceDock();

  const closeBtn = qs('#world-dock-close', dock);
  const iframe = qs('#world-dock-iframe', dock) as HTMLIFrameElement | null;
  const statusNode = qs('#world-dock-status', dock);
  const presetBtns = qsa('[data-dock-target]', dock);

  if (closeBtn) {
    trackMotionListener(closeBtn, 'click', () => {
      closeReferenceDock();
    });
  }

  if (iframe) {
    trackMotionListener(iframe, 'load', () => {
      if (statusNode && isReferenceDockOpen()) {
        statusNode.textContent = `READY · ${currentDockPath} (SANDBOXED STATIC VIEW · NO SCRIPTS)`;
      }
    });
  }

  presetBtns.forEach((btn) => {
    trackMotionListener(btn, 'click', () => {
      const target = btn.getAttribute('data-dock-target') || DEFAULT_DOCK_PATH;
      const label = btn.getAttribute('data-dock-label') || target;
      openReferenceDock(target, label);
    });
  });

  /* Tutup otomatis apabila viewport menyempit di bawah 1024px */
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia(DESKTOP_DOCK_MQ);
    const onViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches && isReferenceDockOpen()) {
        closeReferenceDock();
      }
    };
    if (typeof mql.addEventListener === 'function') {
      trackMotionListener(mql, 'change', onViewportChange);
    }
  }

  /* Shortcut Alt+Enter pada desktop & Escape ketika fokus di dalam Dock */
  trackMotionListener(document, 'keydown', (event: KeyboardEvent) => {
    const cmdDialog = qs('#world-command-dialog') as HTMLDialogElement | null;
    if (cmdDialog && cmdDialog.open) return;

    if (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      event.key === 'Enter'
    ) {
      if (isEditableElement(event.target)) return;
      if (!isDesktopViewport()) return;
      event.preventDefault();
      toggleReferenceDock();
      return;
    }

    if (event.key === 'Escape' && isReferenceDockOpen()) {
      if (dock.contains(document.activeElement)) {
        event.preventDefault();
        closeReferenceDock();
      }
    }
  });
}
