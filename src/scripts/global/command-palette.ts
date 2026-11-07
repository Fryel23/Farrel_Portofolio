/*!
 * src/scripts/global/command-palette.ts - Global Command Palette & Workspace Status (V13.0-D).
 *
 * Mengimplementasikan:
 *  1. Lazy fetch /api/world-index.json hanya saat Command Palette pertama kali dibuka
 *     (0 request saat initial page load), dengan in-memory cache sesi dokumen.
 *  2. Normalisasi query dan pemeringkatan deterministik 5 grup melalui world-os-core.ts.
 *  3. Rendering DOM aman murni menggunakan document.createElement & textContent.
 *  4. Kontrak ARIA combobox + listbox lengkap dan pemulihan fokus saat dialog ditutup.
 *  5. Eksekusi command allowlist (:warp, :split, :audio, :top) terintegrasi dengan
 *     audio-runtime.js dan tiling-dock.ts.
 */

import {
  fetchWithTimeout,
  isAudioMuted,
  playClickSound,
  qs,
  scrollToTarget,
  setAudioMuted,
  showToast,
  trackMotionListener,
} from '../core.js';
import {
  WORLD_COMMANDS,
  WORLD_INDEX_SCHEMA_VERSION,
  WORLD_TERRITORIES,
  normalizeWorldQuery,
  parseWorldCommand,
  rankWorldSearchResults,
  validateWorldIndexPayload,
  type WorldIndexPayload,
  type WorldResultGroupKey,
  type WorldSearchResultItem,
} from '../../lib/world-os-core.ts';
import {
  closeReferenceDock,
  isReferenceDockOpen,
  onDockStatusChange,
  openReferenceDock,
} from './tiling-dock.ts';

const FALLBACK_INDEX_PAYLOAD: WorldIndexPayload = {
  schemaVersion: WORLD_INDEX_SCHEMA_VERSION,
  territories: WORLD_TERRITORIES,
  work: [],
  adr: [],
  codex: [],
  commands: WORLD_COMMANDS,
};

let cachedIndexPayload: WorldIndexPayload | null = null;
let inFlightIndexPromise: Promise<WorldIndexPayload> | null = null;
let indexFetchFailed = false;
let lastTriggerElement: HTMLElement | null = null;

/**
 * Mengambil /api/world-index.json secara malas (lazy) hanya saat dibutuhkan.
 * Menyimpan satu promise/result di memori selama sesi dokumen.
 */
export async function ensureWorldIndexLoaded(
  forceRetry: boolean = false
): Promise<WorldIndexPayload> {
  if (cachedIndexPayload && !forceRetry) {
    return cachedIndexPayload;
  }
  if (inFlightIndexPromise && !forceRetry) {
    return inFlightIndexPromise;
  }

  indexFetchFailed = false;
  syncWorkspaceStatusIndicator('INDEX LOADING');

  inFlightIndexPromise = (async () => {
    try {
      const response = await fetchWithTimeout('/api/world-index.json', {}, 6000);
      if (!response || !response.ok) {
        throw new Error(`HTTP ${response ? response.status : 'ERR'}`);
      }
      const data = await response.json();
      if (!validateWorldIndexPayload(data)) {
        throw new Error('Invalid world-index schema');
      }
      cachedIndexPayload = data;
      indexFetchFailed = false;
      syncWorkspaceStatusIndicator(
        isReferenceDockOpen() ? 'DOCK ACTIVE' : 'PALETTE READY'
      );
      return data;
    } catch (error) {
      indexFetchFailed = true;
      inFlightIndexPromise = null;
      syncWorkspaceStatusIndicator('INDEX RETRY');
      return FALLBACK_INDEX_PAYLOAD;
    }
  })();

  return inFlightIndexPromise;
}

export function getCachedWorldIndex(): WorldIndexPayload | null {
  return cachedIndexPayload;
}

function resolveCurrentTerritoryLabel(): string {
  if (typeof window === 'undefined') return 'HOME';
  const rawPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const exact = WORLD_TERRITORIES.find((t) => t.path === rawPath);
  if (exact) return exact.id.toUpperCase();
  if (rawPath.startsWith('/aethelgrad')) return 'AETHELGRAD';
  if (rawPath.startsWith('/work/')) return 'CASE STUDY';
  return 'ARCHIVE';
}

export function syncWorkspaceStatusIndicator(stateOverride?: string): void {
  const territoryNode = qs('#world-status-territory');
  const stateNode = qs('#world-status-state');
  if (territoryNode) {
    territoryNode.textContent = resolveCurrentTerritoryLabel();
  }
  if (stateNode) {
    if (stateOverride) {
      stateNode.textContent = stateOverride;
    } else if (isReferenceDockOpen()) {
      stateNode.textContent = 'DOCK ACTIVE';
    } else {
      stateNode.textContent = 'PALETTE READY';
    }
  }
}

function syncHeaderAudioToggleButton(): void {
  const button = qs('#audio-toggle');
  if (!button) return;
  const muted = isAudioMuted();
  button.setAttribute('aria-pressed', String(muted));
  button.setAttribute('aria-label', muted ? 'Unmute interface sounds' : 'Mute interface sounds');
  button.classList.toggle('is-muted', muted);
  const iconOn = button.querySelector('.audio-icon-on') as HTMLElement | null;
  const iconOff = button.querySelector('.audio-icon-off') as HTMLElement | null;
  if (iconOn) iconOn.hidden = muted;
  if (iconOff) iconOff.hidden = !muted;
}

export function initCommandPalette(): void {
  const dialog = qs('#world-command-dialog') as HTMLDialogElement | null;
  const input = qs('#world-cmd-input') as HTMLInputElement | null;
  const listbox = qs('#world-cmd-listbox') as HTMLElement | null;
  const statusNode = qs('#world-cmd-status') as HTMLElement | null;
  const retryBtn = qs('#world-cmd-retry-btn') as HTMLButtonElement | null;
  const closeBtn = qs('#world-cmd-close-btn') as HTMLButtonElement | null;
  const headerTriggerBtn = qs('#world-workspace-status-btn') as HTMLButtonElement | null;

  syncWorkspaceStatusIndicator();
  onDockStatusChange((isOpen) => {
    syncWorkspaceStatusIndicator(isOpen ? 'DOCK ACTIVE' : 'PALETTE READY');
  });

  if (!dialog || !input || !listbox) return;

  /* Pastikan dialog tertutup dan state bersih setelah navigasi Astro */
  if (dialog.open && typeof dialog.close === 'function') {
    dialog.close();
  }
  dialog.removeAttribute('open');

  let activeResults: WorldSearchResultItem[] = [];
  let activeIndex = -1;

  function updateActiveOption(nextIndex: number): void {
    const optionNodes = Array.from(
      listbox.querySelectorAll<HTMLElement>('[role="option"]')
    );
    if (optionNodes.length === 0) {
      activeIndex = -1;
      input.setAttribute('aria-activedescendant', '');
      return;
    }

    const wrapped =
      ((nextIndex % optionNodes.length) + optionNodes.length) % optionNodes.length;
    activeIndex = wrapped;

    optionNodes.forEach((node, idx) => {
      const selected = idx === activeIndex;
      node.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (selected) {
        input.setAttribute('aria-activedescendant', node.id);
        if (typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ block: 'nearest' });
        }
      }
    });
  }

  function renderResultsList(): void {
    const indexData = cachedIndexPayload || FALLBACK_INDEX_PAYLOAD;
    const rawQuery = input.value;
    const ranked = rankWorldSearchResults(indexData, rawQuery);

    listbox.textContent = '';
    activeResults = [...ranked.flatList];

    if (activeResults.length === 0) {
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-activedescendant', '');
      activeIndex = -1;
      if (statusNode) {
        statusNode.textContent = `Tidak ada hasil yang cocok untuk "${normalizeWorldQuery(rawQuery)}". Coba kata kunci lain atau ketik :warp.`;
      }
      return;
    }

    input.setAttribute('aria-expanded', 'true');

    const groupOrder: readonly WorldResultGroupKey[] = [
      'TERRITORIES',
      'CODEX NOTES',
      'ENGINEERING RECORDS',
      'CASE STUDIES',
      'COMMANDS',
    ];

    let flatIdx = 0;
    for (const groupKey of groupOrder) {
      const groupItems = ranked.grouped[groupKey];
      if (!groupItems || groupItems.length === 0) continue;

      const heading = document.createElement('div');
      heading.className = 'world-cmd-group-heading';
      heading.setAttribute('role', 'presentation');
      heading.textContent = groupKey;
      listbox.appendChild(heading);

      for (const item of groupItems) {
        if (flatIdx >= activeResults.length) break;
        const currentFlatIdx = flatIdx;
        flatIdx += 1;

        const option = document.createElement('div');
        option.id = `world-cmd-opt-${currentFlatIdx}`;
        option.className = `world-cmd-option${!item.routeable && !item.commandSyntax ? ' world-cmd-option--refonly' : ''}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', currentFlatIdx === 0 ? 'true' : 'false');

        const mainCol = document.createElement('div');
        mainCol.className = 'world-cmd-opt-main';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'world-cmd-opt-title';
        titleSpan.textContent = item.title;

        const subSpan = document.createElement('span');
        subSpan.className = 'world-cmd-opt-sub';
        subSpan.textContent = item.subtitle;

        mainCol.appendChild(titleSpan);
        mainCol.appendChild(subSpan);

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'world-cmd-opt-badge';
        badgeSpan.textContent = item.codeOrTag;

        option.appendChild(mainCol);
        option.appendChild(badgeSpan);

        option.addEventListener('mouseenter', () => {
          updateActiveOption(currentFlatIdx);
        });

        option.addEventListener('click', (event: MouseEvent) => {
          updateActiveOption(currentFlatIdx);
          executeResultItem(item, event.altKey);
        });

        listbox.appendChild(option);
      }
    }

    updateActiveOption(0);

    if (statusNode && !indexFetchFailed) {
      const totalIndexed =
        indexData.territories.length +
        indexData.codex.length +
        indexData.adr.length +
        indexData.work.length +
        indexData.commands.length;
      statusNode.textContent = cachedIndexPayload
        ? `INDEX READY (${totalIndexed} ITEMS) · Showing ${activeResults.length} matches`
        : 'LOADING WORLD INDEX... Showing static territories & commands';
    }
  }

  function executeCommandString(rawCmd: string): boolean {
    const indexData = cachedIndexPayload || FALLBACK_INDEX_PAYLOAD;
    const parsed = parseWorldCommand(rawCmd, indexData.territories);
    if (!parsed) return false;

    if (!parsed.ok) {
      if (statusNode) {
        statusNode.textContent = `COMMAND ERROR: ${parsed.error}`;
      }
      return true;
    }

    if (parsed.action === 'warp') {
      closePalette(false);
      window.location.assign(parsed.targetPath);
      return true;
    }

    if (parsed.action === 'split-open') {
      closePalette(true);
      openReferenceDock(parsed.targetPath, undefined, cachedIndexPayload);
      return true;
    }

    if (parsed.action === 'split-close') {
      closePalette(true);
      closeReferenceDock();
      return true;
    }

    if (parsed.action === 'audio') {
      const nextMuted =
        parsed.mode === 'mute'
          ? true
          : parsed.mode === 'unmute'
            ? false
            : !isAudioMuted();
      setAudioMuted(nextMuted);
      syncHeaderAudioToggleButton();
      if (!nextMuted) playClickSound();
      closePalette(true);
      showToast(nextMuted ? 'Interface audio muted.' : 'Interface audio unmuted.');
      return true;
    }

    if (parsed.action === 'top') {
      closePalette(false);
      const topNode = qs('#top') || document.body;
      scrollToTarget(topNode);
      return true;
    }

    return true;
  }

  function executeResultItem(item: WorldSearchResultItem, openInDock: boolean = false): void {
    if (item.commandSyntax) {
      if (item.commandSyntax.startsWith(':warp')) {
        const currentVal = normalizeWorldQuery(input.value);
        if (currentVal.startsWith(':warp ') && currentVal.length > 6) {
          executeCommandString(input.value);
          return;
        }
      }
      executeCommandString(item.commandSyntax);
      return;
    }

    if (!item.routeable || !item.url) {
      if (statusNode) {
        statusNode.textContent = `${item.title}: Reference-only item (RESERVED, non-routeable). Tidak memiliki halaman publik aktif.`;
      }
      return;
    }

    if (openInDock && item.canOpenInDock) {
      closePalette(true);
      openReferenceDock(item.url, item.title, cachedIndexPayload);
      return;
    }

    closePalette(false);
    window.location.assign(item.url);
  }

  async function openPalette(triggerEl?: HTMLElement | null): Promise<void> {
    lastTriggerElement =
      triggerEl ||
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    input.value = '';
    renderResultsList();
    input.focus();

    if (!cachedIndexPayload) {
      if (statusNode) {
        statusNode.textContent = 'INDEX LOADING · Fetching /api/world-index.json...';
      }
      await ensureWorldIndexLoaded(false);
      if (retryBtn) {
        retryBtn.hidden = !indexFetchFailed;
      }
      if (indexFetchFailed && statusNode) {
        statusNode.textContent =
          'INDEX FETCH FAILED · Showing fallback territories & commands. Click Retry to reload.';
      } else {
        renderResultsList();
      }
    }
  }

  function closePalette(restoreFocus: boolean = true): void {
    if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-activedescendant', '');

    if (restoreFocus && lastTriggerElement && typeof lastTriggerElement.focus === 'function') {
      try {
        lastTriggerElement.focus({ preventScroll: true });
      } catch (error) {
        lastTriggerElement.focus();
      }
    }
  }

  if (headerTriggerBtn) {
    trackMotionListener(headerTriggerBtn, 'click', () => {
      openPalette(headerTriggerBtn);
    });
  }

  if (closeBtn) {
    trackMotionListener(closeBtn, 'click', () => {
      closePalette(true);
    });
  }

  if (retryBtn) {
    trackMotionListener(retryBtn, 'click', async () => {
      retryBtn.hidden = true;
      if (statusNode) {
        statusNode.textContent = 'RETRYING · Fetching /api/world-index.json...';
      }
      await ensureWorldIndexLoaded(true);
      retryBtn.hidden = !indexFetchFailed;
      renderResultsList();
      input.focus();
    });
  }

  trackMotionListener(input, 'input', () => {
    renderResultsList();
  });

  trackMotionListener(input, 'keydown', (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      updateActiveOption(activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      updateActiveOption(activeIndex - 1);
      return;
    }
    if (event.key === 'Home' && activeResults.length > 0) {
      event.preventDefault();
      updateActiveOption(0);
      return;
    }
    if (event.key === 'End' && activeResults.length > 0) {
      event.preventDefault();
      updateActiveOption(activeResults.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const rawVal = input.value.trim();
      if (rawVal.startsWith(':')) {
        const handled = executeCommandString(rawVal);
        if (handled) return;
      }
      if (activeIndex >= 0 && activeResults[activeIndex]) {
        executeResultItem(activeResults[activeIndex], event.altKey);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closePalette(true);
    }
  });

  /* Tutup saat klik pada backdrop dialog */
  trackMotionListener(dialog, 'click', (event: MouseEvent) => {
    if (event.target === dialog) {
      closePalette(true);
    }
  });

  trackMotionListener(dialog, 'close', () => {
    syncWorkspaceStatusIndicator();
  });

  /* Shortcut global Ctrl+K / Cmd+K */
  trackMotionListener(document, 'keydown', (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) {
        closePalette(true);
      } else {
        openPalette(
          document.activeElement instanceof HTMLElement ? document.activeElement : headerTriggerBtn
        );
      }
    }
  });
}
