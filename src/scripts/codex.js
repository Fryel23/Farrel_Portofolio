/*!
 * src/scripts/codex.js - The Grand Codex 100-600 & Knowledge Graph Controller (V13.0-C).
 *
 * Terintegrasi dengan single-owner lifecycle bootPage() dari core.js.
 * Menyediakan:
 *  1. Filter domain (100-600), filter maturity (SEEDLING/BUDDING/EVERGREEN), dan pencarian real-time.
 *  2. Visualisasi Knowledge Graph pada Canvas 2D dengan simulasi gaya terbatas (bounded spring),
 *     penghentian rAF otomatis pada ekuilibrium, penghormatan penuh pada prefers-reduced-motion
 *     (0 rAF saat reduced-motion), dan sinkronisasi dua arah dengan daftar HTML aksesibel.
 *  3. Penyalinan notasi sumber formula (source notation) pada halaman detail Codex.
 */

import {
  bootPage,
  isReducedMotion,
  qs,
  qsa,
  showToast,
  trackMotionListener,
  trackObserver,
  trackRafLoop,
} from './core.js';

function normalizeSearchQuery(value) {
  let text = value === undefined || value === null ? '' : String(value);
  try {
    if (typeof text.normalize === 'function') text = text.normalize('NFKC');
  } catch (error) {
    /* Gunakan string apa adanya jika normalisasi Unicode gagal */
  }
  return text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function initCodexCatalog() {
  const catalogRoot = qs('#codex-catalog-section');
  if (!catalogRoot) return;

  const cards = qsa('.codex-card', catalogRoot);
  const domainBlocks = qsa('.codex-domain-block', catalogRoot);
  const searchInput = qs('#codex-search-input', catalogRoot);
  const resetBtn = qs('#codex-reset-filters', catalogRoot);
  const statusNode = qs('#codex-visible-count', catalogRoot);
  const emptyNode = qs('#codex-empty-state', catalogRoot);

  const domainButtons = qsa('[data-codex-filter-domain]', catalogRoot);
  const maturityButtons = qsa('[data-codex-filter-maturity]', catalogRoot);

  let activeDomain = 'all';
  let activeMaturity = 'all';
  let activeQuery = '';

  function syncButtons(buttons, attrName, selectedValue) {
    buttons.forEach((btn) => {
      const value = btn.getAttribute(attrName) || 'all';
      const isSelected = value === selectedValue;
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      const indicator = qs('.codex-filter-indicator', btn);
      if (indicator) {
        indicator.textContent = isSelected ? '[•] ' : '';
      }
    });
  }

  function applyFilters() {
    let visibleCount = 0;

    cards.forEach((card) => {
      const domain = card.getAttribute('data-domain') || '';
      const maturity = card.getAttribute('data-maturity') || '';
      const haystack = (card.getAttribute('data-search-haystack') || '').toLowerCase();

      const matchDomain = activeDomain === 'all' || domain === activeDomain;
      const matchMaturity = activeMaturity === 'all' || maturity === activeMaturity;
      const matchQuery = !activeQuery || haystack.includes(activeQuery);

      const visible = matchDomain && matchMaturity && matchQuery;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    domainBlocks.forEach((block) => {
      const blockCards = qsa('.codex-card', block);
      const anyVisible = blockCards.some((card) => !card.hidden);
      block.hidden = !anyVisible;
    });

    if (statusNode) {
      statusNode.textContent = `Menampilkan ${visibleCount} dari ${cards.length} catatan pengetahuan`;
    }
    if (emptyNode) {
      emptyNode.hidden = visibleCount > 0;
    }
  }

  domainButtons.forEach((btn) => {
    trackMotionListener(btn, 'click', () => {
      activeDomain = btn.getAttribute('data-codex-filter-domain') || 'all';
      syncButtons(domainButtons, 'data-codex-filter-domain', activeDomain);
      applyFilters();
    });
  });

  maturityButtons.forEach((btn) => {
    trackMotionListener(btn, 'click', () => {
      activeMaturity = btn.getAttribute('data-codex-filter-maturity') || 'all';
      syncButtons(maturityButtons, 'data-codex-filter-maturity', activeMaturity);
      applyFilters();
    });
  });

  if (searchInput) {
    trackMotionListener(searchInput, 'input', () => {
      activeQuery = normalizeSearchQuery(searchInput.value);
      applyFilters();
    });
  }

  if (resetBtn) {
    trackMotionListener(resetBtn, 'click', () => {
      activeDomain = 'all';
      activeMaturity = 'all';
      activeQuery = '';
      if (searchInput) searchInput.value = '';
      syncButtons(domainButtons, 'data-codex-filter-domain', 'all');
      syncButtons(maturityButtons, 'data-codex-filter-maturity', 'all');
      applyFilters();
    });
  }
}

export function initCodexGraph() {
  const canvas = qs('#codex-graph-canvas');
  const dataScript = qs('#codex-graph-data');
  if (!canvas || !dataScript) return;

  let graphData = null;
  try {
    graphData = JSON.parse(dataScript.textContent || '{}');
  } catch (error) {
    return;
  }

  if (!graphData || !Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const statusTextNode = qs('#codex-graph-status-text');
  const modeBadgeNode = qs('#codex-graph-mode-badge');
  const accessibleItems = qsa('[data-graph-node-id]');

  const nodes = graphData.nodes;
  const edges = graphData.edges;
  const scaleLimits = graphData.scaleLimits || {
    MAX_SPRING_NODES: 200,
    MAX_SPRING_EDGES: 400,
    MAX_SPRING_ITERATIONS: 120,
    DAMPING: 0.82,
    ENERGY_THRESHOLD: 0.0015,
  };

  /* Salin posisi awal deterministik dari build-time payload */
  const positions = {};
  const velocities = {};
  nodes.forEach((node) => {
    const initPos = (graphData.initialPositions && graphData.initialPositions[node.id]) || {
      x: 0.5,
      y: 0.5,
    };
    positions[node.id] = { x: Number(initPos.x), y: Number(initPos.y) };
    velocities[node.id] = { vx: 0, vy: 0 };
  });

  /* Peta ketetanggaan langsung (outgoing + incoming) untuk highlight interaktif */
  const neighborSetByNodeId = {};
  nodes.forEach((node) => {
    neighborSetByNodeId[node.id] = new Set([node.id]);
  });
  edges.forEach((edge) => {
    if (neighborSetByNodeId[edge.source]) neighborSetByNodeId[edge.source].add(edge.target);
    if (neighborSetByNodeId[edge.target]) neighborSetByNodeId[edge.target].add(edge.source);
  });

  let activeNodeId = null;
  let canvasWidth = 680;
  let canvasHeight = 380;
  let dpr = 1;

  function syncCanvasDimensions() {
    const rect = canvas.getBoundingClientRect();
    canvasWidth = Math.max(280, Math.floor(rect.width || 680));
    canvasHeight = Math.max(260, Math.floor(rect.height || 380));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
  }

  function toScreenCoords(nodeId) {
    const pos = positions[nodeId] || { x: 0.5, y: 0.5 };
    const padX = 36;
    const padY = 32;
    return {
      x: padX + pos.x * (canvasWidth - padX * 2),
      y: padY + pos.y * (canvasHeight - padY * 2),
    };
  }

  function getNodeColor(node) {
    if (!node.routeable) return '#d97706';
    if (node.type === 'codex') return '#1e40af';
    if (node.type === 'work') return '#15803d';
    return '#475569';
  }

  function drawGraphFrame() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const activeNeighbors = activeNodeId ? neighborSetByNodeId[activeNodeId] : null;

    /* Gambar edge tervalidasi */
    edges.forEach((edge) => {
      const p1 = toScreenCoords(edge.source);
      const p2 = toScreenCoords(edge.target);
      const isHighlighted =
        activeNeighbors &&
        (edge.source === activeNodeId || edge.target === activeNodeId);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = isHighlighted ? 1.9 : 1;
      ctx.strokeStyle = isHighlighted
        ? 'rgba(30, 64, 175, 0.78)'
        : activeNeighbors
          ? 'rgba(100, 116, 139, 0.16)'
          : 'rgba(100, 116, 139, 0.34)';
      ctx.stroke();
    });

    /* Gambar node */
    nodes.forEach((node) => {
      const pt = toScreenCoords(node.id);
      const isSelected = node.id === activeNodeId;
      const isNeighbor = activeNeighbors ? activeNeighbors.has(node.id) : true;
      const radius = node.type === 'codex' ? 8.5 : node.type === 'work' ? 7.5 : 6;

      ctx.save();
      ctx.globalAlpha = isNeighbor ? 1 : 0.25;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? radius + 2.5 : radius, 0, Math.PI * 2);

      if (!node.routeable) {
        ctx.fillStyle = '#fef3c7';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = '#d97706';
        ctx.stroke();
      } else {
        ctx.fillStyle = getNodeColor(node);
        ctx.fill();
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      /* Label kode ringkas */
      if (node.type === 'codex' || isSelected || (activeNeighbors && isNeighbor && activeNodeId)) {
        ctx.font = isSelected ? '600 11px monospace' : '500 10px monospace';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(node.codeOrTag, pt.x, pt.y - radius - 5);
      }

      ctx.restore();
    });

    ctx.restore();
  }

  function syncHighlightState(nodeId) {
    activeNodeId = nodeId;
    const neighborSet = nodeId ? neighborSetByNodeId[nodeId] : null;

    accessibleItems.forEach((item) => {
      const id = item.getAttribute('data-graph-node-id') || '';
      const highlighted = Boolean(neighborSet && neighborSet.has(id));
      item.classList.toggle('is-highlighted', highlighted);
    });

    if (statusTextNode) {
      if (!nodeId) {
        statusTextNode.textContent =
          'Pilih atau arahkan kursor pada simpul untuk menyorot ketetanggaan langsung.';
      } else {
        const target = nodes.find((n) => n.id === nodeId);
        if (target) {
          if (!target.routeable) {
            statusTextNode.textContent = `${target.codeOrTag} · ${target.label}: Reference-only (${target.statusOrMaturity}, non-routeable).`;
          } else {
            statusTextNode.textContent = `${target.codeOrTag} · ${target.label} (${target.degree} relasi tervalidasi). Klik atau tekan Enter untuk membuka.`;
          }
        }
      }
    }

    drawGraphFrame();
  }

  function findHitNode(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let closest = null;
    let minDist = 18;

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const pt = toScreenCoords(node.id);
      const dx = pt.x - x;
      const dy = pt.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= minDist) {
        minDist = dist;
        closest = node;
      }
    }
    return closest;
  }

  syncCanvasDimensions();

  const reduced = isReducedMotion();
  const isLargeGraph =
    graphData.layoutMode === 'large-graph-clustered' ||
    nodes.length > scaleLimits.MAX_SPRING_NODES ||
    edges.length > scaleLimits.MAX_SPRING_EDGES;

  let rafId = 0;
  let currentIteration = 0;
  let simulationFinished = reduced || isLargeGraph;
  let isCanvasVisible = true;

  function stopSimulation() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function stepSpringSimulation() {
    if (simulationFinished || !isCanvasVisible) {
      rafId = 0;
      return;
    }

    currentIteration += 1;
    let totalEnergy = 0;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      const posA = positions[a.id];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const posB = positions[b.id];
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distSq = Math.max(0.0008, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);
        const repulse = 0.00045 / distSq;
        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        velocities[a.id].vx += fx;
        velocities[a.id].vy += fy;
        velocities[b.id].vx -= fx;
        velocities[b.id].vy -= fy;
      }
    }

    edges.forEach((edge) => {
      const posS = positions[edge.source];
      const posT = positions[edge.target];
      if (!posS || !posT) return;
      const dx = posT.x - posS.x;
      const dy = posT.y - posS.y;
      const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
      const spring = (dist - 0.22) * 0.035;
      const fx = (dx / dist) * spring;
      const fy = (dy / dist) * spring;
      velocities[edge.source].vx += fx;
      velocities[edge.source].vy += fy;
      velocities[edge.target].vx -= fx;
      velocities[edge.target].vy -= fy;
    });

    nodes.forEach((node) => {
      const pos = positions[node.id];
      const vel = velocities[node.id];
      vel.vx = (vel.vx + (0.5 - pos.x) * 0.012) * scaleLimits.DAMPING;
      vel.vy = (vel.vy + (0.5 - pos.y) * 0.012) * scaleLimits.DAMPING;
      pos.x = Math.min(0.92, Math.max(0.08, pos.x + vel.vx));
      pos.y = Math.min(0.92, Math.max(0.08, pos.y + vel.vy));
      totalEnergy += vel.vx * vel.vx + vel.vy * vel.vy;
    });

    drawGraphFrame();

    if (
      currentIteration >= scaleLimits.MAX_SPRING_ITERATIONS ||
      totalEnergy < scaleLimits.ENERGY_THRESHOLD
    ) {
      simulationFinished = true;
      rafId = 0;
      if (modeBadgeNode) {
        modeBadgeNode.textContent = `EQUILIBRIUM (${currentIteration} STEPS)`;
      }
      return;
    }

    rafId = requestAnimationFrame(stepSpringSimulation);
  }

  /* Gambar frame pertama secara sinkron */
  drawGraphFrame();

  if (reduced) {
    if (modeBadgeNode) {
      modeBadgeNode.textContent = 'STATIC LAYOUT (REDUCED MOTION · 0 RAF)';
    }
  } else if (isLargeGraph) {
    if (modeBadgeNode) {
      modeBadgeNode.textContent = 'CLUSTERED DETERMINISTIC LAYOUT';
    }
  } else {
    trackRafLoop(stopSimulation);
    rafId = requestAnimationFrame(stepSpringSimulation);
  }

  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isCanvasVisible = entry.isIntersecting;
        if (!isCanvasVisible) {
          stopSimulation();
        } else if (!simulationFinished && !rafId && !isReducedMotion()) {
          rafId = requestAnimationFrame(stepSpringSimulation);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);
    trackObserver(observer);
  }

  trackMotionListener(window, 'resize', () => {
    syncCanvasDimensions();
    drawGraphFrame();
  });

  trackMotionListener(canvas, 'pointermove', (event) => {
    const hit = findHitNode(event.clientX, event.clientY);
    const nextId = hit ? hit.id : null;
    canvas.style.cursor = hit ? (hit.routeable ? 'pointer' : 'not-allowed') : 'default';
    if (nextId !== activeNodeId) {
      syncHighlightState(nextId);
    }
  });

  trackMotionListener(canvas, 'pointerleave', () => {
    canvas.style.cursor = 'default';
    if (activeNodeId !== null) {
      syncHighlightState(null);
    }
  });

  trackMotionListener(canvas, 'click', (event) => {
    const hit = findHitNode(event.clientX, event.clientY);
    if (!hit) return;
    syncHighlightState(hit.id);
    if (hit.routeable && hit.url) {
      window.location.assign(hit.url);
    }
  });

  /* Sinkronisasi fokus & hover dari daftar HTML aksesibel ke Canvas */
  accessibleItems.forEach((item) => {
    const nodeId = item.getAttribute('data-graph-node-id') || '';
    trackMotionListener(item, 'mouseenter', () => syncHighlightState(nodeId));
    trackMotionListener(item, 'mouseleave', () => syncHighlightState(null));
    trackMotionListener(item, 'focusin', () => syncHighlightState(nodeId));
    trackMotionListener(item, 'focusout', () => syncHighlightState(null));
  });
}

export function initCodexDetail() {
  const copyButtons = qsa('[data-copy-formula]');
  if (!copyButtons.length) return;

  copyButtons.forEach((btn) => {
    trackMotionListener(btn, 'click', async () => {
      const notation = btn.getAttribute('data-copy-formula') || '';
      const statusId = btn.getAttribute('data-status-target') || '';
      const statusNode = statusId ? qs(`#${statusId}`) : null;
      if (!notation) return;

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(notation);
          if (statusNode) statusNode.textContent = 'Notasi sumber tersalin.';
          showToast('Formula source notation copied to clipboard.');
        } else if (statusNode) {
          statusNode.textContent = 'Salin manual dari blok kode notasi sumber.';
        }
      } catch (error) {
        if (statusNode) {
          statusNode.textContent = 'Salin manual dari blok kode notasi sumber.';
        }
      }
    });
  });
}

bootPage({
  interactions: [initCodexCatalog, initCodexGraph, initCodexDetail],
});
