/**
 * src/scripts/atlas/data-atlas-crypt.ts
 * Interactive 2D Force-Constellation Controller untuk The Data Atlas Crypt (/atlas - V15.0).
 *
 * Fitur Utama:
 *  - Merender 36 Simpul Pengetahuan (Knowledge Nodes) & 52 Sinapsis (Edges)
 *    lintas 4 klaster keilmuan pada <canvas id="atlas-network-canvas">.
 *  - Mendukung filter klaster, pencarian kata kunci, drag simpul, hover sorotan
 *    tetangga langsung (1-hop neighborhood), dan klik untuk membuka Inspector Panel.
 *  - Tersinkronisasi dua arah dengan direktori kartu aksesibel (#atlas-node-list)
 *    dan Live Performance Telemetry HUD (RuntimeTelemetryHud).
 */

import {
  ATLAS_CLUSTERS,
  ATLAS_EDGES,
  ATLAS_NODES,
  type AtlasClusterId,
  type AtlasKnowledgeNode,
} from './knowledge-nodes-data.ts';
import { RuntimeTelemetryHud } from './runtime-telemetry-hud.ts';

interface SimNode extends AtlasKnowledgeNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const CLUSTER_COLOR_MAP: Record<AtlasClusterId, string> = {
  DATA_SCIENCE: '#10B981',
  SOFTWARE_AI: '#3B82F6',
  QUANTITATIVE_SYSTEMS: '#F59E0B',
  COGNITIVE_STRATEGY: '#8B5CF6',
};

const CLUSTER_LABEL_MAP: Record<AtlasClusterId, string> = {
  DATA_SCIENCE: 'Data Science & Environmental Analytics',
  SOFTWARE_AI: 'Software Architecture, Web Workers, & AI',
  QUANTITATIVE_SYSTEMS: 'Quantitative Modeling, SQL, & IoT Systems',
  COGNITIVE_STRATEGY: 'Computational Logic & Strategic Thinking',
};

let activeCleanup: (() => void) | null = null;

export function initDataAtlasCrypt(): void {
  if (typeof document === 'undefined') return;
  const canvas = document.getElementById('atlas-network-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const telemetryHud = new RuntimeTelemetryHud();
  telemetryHud.start();

  const simNodes: SimNode[] = ATLAS_NODES.map((n) => ({
    ...n,
    x: n.baseX,
    y: n.baseY,
    vx: 0,
    vy: 0,
  }));
  const nodeById = new Map<string, SimNode>(simNodes.map((n) => [n.id, n]));

  let activeCluster: AtlasClusterId | 'ALL' = 'ALL';
  let searchQuery = '';
  let selectedNodeId: string = simNodes[0]?.id || 'ds-ispu-p14';
  let hoveredNodeId: string | null = null;
  let draggingNode: SimNode | null = null;
  let phaseTick = 0;
  let rafId: number | null = null;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isNodeVisible(node: SimNode): boolean {
    if (activeCluster !== 'ALL' && node.cluster !== activeCluster) {
      return false;
    }
    if (searchQuery.length > 0) {
      const hay = `${node.code} ${node.title} ${node.summary} ${node.technicalNote}`.toLowerCase();
      return hay.includes(searchQuery);
    }
    return true;
  }

  function getConnectedNeighborIds(nodeId: string): Set<string> {
    const neighbors = new Set<string>();
    for (const edge of ATLAS_EDGES) {
      if (edge.source === nodeId) neighbors.add(edge.target);
      if (edge.target === nodeId) neighbors.add(edge.source);
    }
    return neighbors;
  }

  function updateInspectorPanel(nodeId: string): void {
    const node = nodeById.get(nodeId);
    if (!node) return;

    const setElText = (id: string, text: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElText('atlas-insp-code', node.code);
    setElText('atlas-insp-cluster', CLUSTER_LABEL_MAP[node.cluster]);
    setElText('atlas-insp-title', node.title);
    setElText('atlas-insp-status', node.status);
    setElText('atlas-insp-summary', node.summary);
    setElText('atlas-insp-tech', node.technicalNote);

    const badgeEl = document.getElementById('atlas-insp-cluster');
    if (badgeEl) {
      badgeEl.style.borderColor = CLUSTER_COLOR_MAP[node.cluster];
      badgeEl.style.color = CLUSTER_COLOR_MAP[node.cluster];
    }

    const routeBtn = document.getElementById('atlas-insp-route') as HTMLAnchorElement | null;
    if (routeBtn) {
      if (node.relatedRoute) {
        routeBtn.href = node.relatedRoute;
        routeBtn.textContent = `${node.relatedLabel || 'Buka Halaman Terkait'} →`;
        routeBtn.hidden = false;
      } else {
        routeBtn.hidden = true;
      }
    }

    const synapsesList = document.getElementById('atlas-insp-synapses');
    if (synapsesList) {
      synapsesList.textContent = '';
      const relatedEdges = ATLAS_EDGES.filter(
        (e) => e.source === node.id || e.target === node.id
      );
      for (const edge of relatedEdges) {
        const otherId = edge.source === node.id ? edge.target : edge.source;
        const otherNode = nodeById.get(otherId);
        if (!otherNode) continue;

        const li = document.createElement('li');
        li.className = 'atlas-synapse-item';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'atlas-synapse-jump-btn';
        btn.addEventListener('click', () => {
          selectNode(otherNode.id);
        });

        const codeSpan = document.createElement('span');
        codeSpan.className = 'atlas-synapse-code';
        codeSpan.style.color = CLUSTER_COLOR_MAP[otherNode.cluster];
        codeSpan.textContent = otherNode.code;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'atlas-synapse-title';
        titleSpan.textContent = otherNode.title;

        const relSpan = document.createElement('small');
        relSpan.className = 'atlas-synapse-rel';
        relSpan.textContent = edge.relation;

        btn.appendChild(codeSpan);
        btn.appendChild(titleSpan);
        btn.appendChild(relSpan);
        li.appendChild(btn);
        synapsesList.appendChild(li);
      }
    }

    const directoryCards = document.querySelectorAll<HTMLElement>('[data-atlas-node-id]');
    directoryCards.forEach((card) => {
      const id = card.getAttribute('data-atlas-node-id') || '';
      const isSelected = id === node.id;
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  function syncDirectoryFilter(): void {
    let visNodes = 0;
    const visibleSet = new Set<string>();
    for (const n of simNodes) {
      if (isNodeVisible(n)) {
        visNodes += 1;
        visibleSet.add(n.id);
      }
    }
    let visEdges = 0;
    for (const e of ATLAS_EDGES) {
      if (visibleSet.has(e.source) && visibleSet.has(e.target)) {
        visEdges += 1;
      }
    }
    telemetryHud.setGraphCounts(visNodes, visEdges);

    const directoryCards = document.querySelectorAll<HTMLElement>('[data-atlas-node-id]');
    directoryCards.forEach((card) => {
      const id = card.getAttribute('data-atlas-node-id') || '';
      card.hidden = !visibleSet.has(id);
    });
  }

  function selectNode(nodeId: string): void {
    if (!nodeById.has(nodeId)) return;
    selectedNodeId = nodeId;
    updateInspectorPanel(nodeId);
  }

  function stepPhysics(): void {
    if (reducedMotion) return;
    phaseTick += 0.02;

    for (let i = 0; i < simNodes.length; i++) {
      const n = simNodes[i];
      if (n === draggingNode) continue;

      const springK = 0.045;
      const dxHome = n.baseX - n.x;
      const dyHome = n.baseY - n.y;
      n.vx += dxHome * springK;
      n.vy += dyHome * springK;

      n.vx += Math.sin(phaseTick + i * 0.7) * 0.03;
      n.vy += Math.cos(phaseTick + i * 0.9) * 0.03;

      n.vx *= 0.82;
      n.vy *= 0.82;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  function drawScene(): void {
    if (!ctx || !canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const scaleX = width / 1000;
    const scaleY = height / 620;

    // Latar grid teknis halus
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = 100; gx < 1000; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx * scaleX, 0);
      ctx.lineTo(gx * scaleX, height);
      ctx.stroke();
    }
    for (let gy = 100; gy < 620; gy += 100) {
      ctx.beginPath();
      ctx.moveTo(0, gy * scaleY);
      ctx.lineTo(width, gy * scaleY);
      ctx.stroke();
    }
    ctx.restore();

    const focusId = hoveredNodeId || selectedNodeId;
    const focusNeighbors = getConnectedNeighborIds(focusId);

    // Gambar 52 Sinapsis (Edges)
    for (const edge of ATLAS_EDGES) {
      const s = nodeById.get(edge.source);
      const t = nodeById.get(edge.target);
      if (!s || !t) continue;
      if (!isNodeVisible(s) || !isNodeVisible(t)) continue;

      const isHighlighted = edge.source === focusId || edge.target === focusId;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.x * scaleX, s.y * scaleY);
      ctx.lineTo(t.x * scaleX, t.y * scaleY);
      if (isHighlighted) {
        ctx.strokeStyle = CLUSTER_COLOR_MAP[s.cluster];
        ctx.lineWidth = 2.1;
        ctx.globalAlpha = 0.9;
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1.05;
        ctx.globalAlpha = 0.55;
      }
      ctx.stroke();
      ctx.restore();
    }

    // Gambar 36 Simpul (Nodes)
    for (const node of simNodes) {
      if (!isNodeVisible(node)) continue;
      const cx = node.x * scaleX;
      const cy = node.y * scaleY;
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const isNeighbor = focusNeighbors.has(node.id);
      const color = CLUSTER_COLOR_MAP[node.cluster];

      ctx.save();
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(cx, cy, (node.radius + 7) * Math.min(scaleX, scaleY), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.22;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, node.radius * Math.min(scaleX, scaleY), 0, Math.PI * 2);
      ctx.fillStyle = isSelected || isHovered ? '#F8FAFC' : color;
      ctx.globalAlpha = isSelected || isHovered || isNeighbor ? 1 : 0.82;
      ctx.fill();

      ctx.lineWidth = isSelected || isHovered ? 2.5 : 1.4;
      ctx.strokeStyle = color;
      ctx.stroke();

      // Label kode simpul
      ctx.font = '600 11px "DM Mono", monospace';
      ctx.fillStyle = isSelected || isHovered ? '#F8FAFC' : '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.fillText(node.code, cx, cy - (node.radius + 7) * Math.min(scaleX, scaleY));
      ctx.restore();
    }
  }

  function renderLoop(): void {
    stepPhysics();
    drawScene();
    rafId = window.requestAnimationFrame(renderLoop);
  }

  function getCanvasNormalizedCoords(evt: MouseEvent): { nx: number; ny: number } {
    const rect = canvas!.getBoundingClientRect();
    const nx = ((evt.clientX - rect.left) / Math.max(1, rect.width)) * 1000;
    const ny = ((evt.clientY - rect.top) / Math.max(1, rect.height)) * 620;
    return { nx, ny };
  }

  function findNodeAt(nx: number, ny: number): SimNode | null {
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i];
      if (!isNodeVisible(n)) continue;
      const dist = Math.hypot(n.x - nx, n.y - ny);
      if (dist <= n.radius + 10) {
        return n;
      }
    }
    return null;
  }

  const onMouseMove = (evt: MouseEvent) => {
    const { nx, ny } = getCanvasNormalizedCoords(evt);
    if (draggingNode) {
      draggingNode.x = Math.max(30, Math.min(970, nx));
      draggingNode.y = Math.max(30, Math.min(590, ny));
      return;
    }
    const hit = findNodeAt(nx, ny);
    hoveredNodeId = hit ? hit.id : null;
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  };

  const onMouseDown = (evt: MouseEvent) => {
    const { nx, ny } = getCanvasNormalizedCoords(evt);
    const hit = findNodeAt(nx, ny);
    if (hit) {
      draggingNode = hit;
      selectNode(hit.id);
      canvas.style.cursor = 'grabbing';
    }
  };

  const onMouseUp = () => {
    draggingNode = null;
    canvas.style.cursor = hoveredNodeId ? 'pointer' : 'grab';
  };

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  // Filter klaster
  const clusterBtns = document.querySelectorAll<HTMLButtonElement>('[data-atlas-cluster]');
  clusterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = (btn.getAttribute('data-atlas-cluster') || 'ALL') as AtlasClusterId | 'ALL';
      activeCluster = val;
      clusterBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      syncDirectoryFilter();
      const firstVisible = simNodes.find((n) => isNodeVisible(n));
      if (firstVisible) selectNode(firstVisible.id);
    });
  });

  // Pencarian simpul
  const searchInput = document.getElementById('atlas-search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      syncDirectoryFilter();
    });
  }

  // Reset layout
  const resetBtn = document.getElementById('atlas-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeCluster = 'ALL';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      clusterBtns.forEach((b) => {
        const isAll = b.getAttribute('data-atlas-cluster') === 'ALL';
        b.classList.toggle('is-active', isAll);
        b.setAttribute('aria-pressed', isAll ? 'true' : 'false');
      });
      for (const n of simNodes) {
        n.x = n.baseX;
        n.y = n.baseY;
        n.vx = 0;
        n.vy = 0;
      }
      syncDirectoryFilter();
      selectNode(simNodes[0].id);
    });
  }

  // Klik dari daftar simpul aksesibel
  const directoryCards = document.querySelectorAll<HTMLElement>('[data-atlas-node-id]');
  directoryCards.forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-atlas-node-id');
      if (id) selectNode(id);
    });
  });

  syncDirectoryFilter();
  selectNode(selectedNodeId);
  rafId = window.requestAnimationFrame(renderLoop);

  activeCleanup = () => {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    telemetryHud.stop();
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener(
    'astro:before-swap',
    () => {
      if (activeCleanup) {
        activeCleanup();
        activeCleanup = null;
      }
    },
    { once: true }
  );
}

export { ATLAS_CLUSTERS, ATLAS_NODES, ATLAS_EDGES };
