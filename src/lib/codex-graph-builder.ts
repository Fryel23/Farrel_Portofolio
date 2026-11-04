/*!
 * src/lib/codex-graph-builder.ts - Deterministic Knowledge Graph & Backlink Builder (V13.0-C).
 *
 * Membangun graf pengetahuan lintas-koleksi (Codex, Work, ADR) pada waktu build
 * dari koleksi yang telah tervalidasi. Menyediakan:
 *  - Namespace node ID bebas tabrakan (codex:<id>, work:<id>, adr:<id>)
 *  - Deduplikasi edge deterministik berdasarkan (source, target, relationType)
 *  - Inverse lookup untuk incoming backlinks tanpa menggandakan edge dua arah
 *  - Penanganan eksplisit reference-only node (work RESERVED/ARCHIVED -> url: null, routeable: false)
 *  - Pemilih mode skala (small-graph-spring vs large-graph-clustered) dan koordinat statis deterministik
 */

import { getCodexDomainLabel } from './codex-taxonomy.ts';
import { adrCategoryLabel } from './adr-taxonomy.ts';

export const GRAPH_SCALE_LIMITS = {
  MAX_SPRING_NODES: 200,
  MAX_SPRING_EDGES: 400,
  MAX_SPRING_ITERATIONS: 120,
  DAMPING: 0.82,
  ENERGY_THRESHOLD: 0.0015,
} as const;

export type KnowledgeNodeType = 'codex' | 'work' | 'adr';
export type KnowledgeRelationType = 'related-codex' | 'related-work' | 'related-adr';

export interface KnowledgeNode {
  readonly id: string;
  readonly rawId: string;
  readonly type: KnowledgeNodeType;
  readonly label: string;
  readonly codeOrTag: string;
  readonly categoryOrDomain: string;
  readonly url: string | null;
  readonly routeable: boolean;
  readonly statusOrMaturity: string;
  readonly outDegree: number;
  readonly inDegree: number;
  readonly degree: number;
}

export interface KnowledgeEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly relationType: KnowledgeRelationType;
}

export interface KnowledgeRelationRef {
  readonly nodeId: string;
  readonly rawId: string;
  readonly type: KnowledgeNodeType;
  readonly label: string;
  readonly codeOrTag: string;
  readonly url: string | null;
  readonly routeable: boolean;
  readonly statusOrMaturity: string;
  readonly relationType: KnowledgeRelationType;
}

export interface StaticPoint2D {
  readonly x: number;
  readonly y: number;
}

export interface KnowledgeGraphResult {
  readonly nodes: KnowledgeNode[];
  readonly edges: KnowledgeEdge[];
  readonly outgoingByNodeId: Record<string, KnowledgeRelationRef[]>;
  readonly incomingBacklinksByNodeId: Record<string, KnowledgeRelationRef[]>;
  readonly referenceOnlyNodes: KnowledgeNode[];
  readonly relationCounts: {
    readonly 'related-codex': number;
    readonly 'related-work': number;
    readonly 'related-adr': number;
    readonly total: number;
  };
  readonly layoutMode: 'small-graph-spring' | 'large-graph-clustered';
  readonly scaleLimits: typeof GRAPH_SCALE_LIMITS;
  readonly initialPositions: Record<string, StaticPoint2D>;
}

export interface CodexEntryLike {
  readonly id: string;
  readonly data: {
    readonly codexId: string;
    readonly decimalCode: string;
    readonly title: string;
    readonly domain: string;
    readonly maturity: string;
    readonly summary: string;
    readonly relatedCodexIds?: readonly string[];
    readonly relatedWorkIds?: readonly string[];
    readonly relatedAdrIds?: readonly string[];
  };
}

export interface WorkEntryLike {
  readonly id: string;
  readonly data: {
    readonly contentId: string;
    readonly title: string;
    readonly category: string;
    readonly tag: string;
    readonly status: string;
    readonly relatedWork?: readonly string[];
  };
}

export interface AdrEntryLike {
  readonly id: string;
  readonly data: {
    readonly adrId: string;
    readonly versionTag: string;
    readonly title: string;
    readonly category: string;
    readonly recordStatus: string;
    readonly relatedWorkIds?: readonly string[];
  };
}

/**
 * Menghasilkan slug URL publik untuk entri Codex.
 * Menggunakan bagian basename dari entry.id agar URL detail bersih dan konsisten.
 */
export function getCodexRouteSlug(entryId: string): string {
  const normalized = String(entryId || '').replace(/\\/g, '/').replace(/\.md$/i, '');
  return normalized;
}

/**
 * Menghitung posisi awal deterministik (0.08..0.92 pada ruang ternormalisasi 0..1)
 * berdasarkan tipe node dan urutan indeks, sehingga layout bebas Math.random()
 * dan siap dipakai langsung pada mode reduced-motion maupun large-graph-clustered.
 */
export function computeDeterministicNodePositions(
  nodes: readonly KnowledgeNode[]
): Record<string, StaticPoint2D> {
  const positions: Record<string, StaticPoint2D> = {};
  const codexNodes = nodes.filter((n) => n.type === 'codex');
  const adrNodes = nodes.filter((n) => n.type === 'adr');
  const workNodes = nodes.filter((n) => n.type === 'work');

  const placeRing = (
    group: readonly KnowledgeNode[],
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    phaseOffset: number
  ) => {
    const count = group.length;
    if (count === 0) return;
    for (let i = 0; i < count; i += 1) {
      const angle = phaseOffset + (i / count) * Math.PI * 2;
      const x = Number(Math.min(0.92, Math.max(0.08, cx + Math.cos(angle) * rx)).toFixed(4));
      const y = Number(Math.min(0.92, Math.max(0.08, cy + Math.sin(angle) * ry)).toFixed(4));
      positions[group[i].id] = { x, y };
    }
  };

  /* Ring dalam: Codex notes; Ring tengah: Work case studies; Ring luar: ADR records */
  placeRing(codexNodes, 0.5, 0.5, 0.21, 0.21, -Math.PI / 2);
  placeRing(workNodes, 0.5, 0.5, 0.31, 0.28, -Math.PI / 4);
  placeRing(adrNodes, 0.5, 0.5, 0.41, 0.38, 0);

  return positions;
}

/**
 * Menjalankan simulasi gaya spring-electrical terbatas (bounded) secara sinkron/step-wise
 * hanya apabila graf berada pada mode 'small-graph-spring'.
 * Jika layoutMode === 'large-graph-clustered' atau reducedMotion === true,
 * fungsi langsung mengembalikan posisi deterministik tanpa iterasi O(n^2).
 */
export function computeBoundedGraphLayout(
  graph: Pick<KnowledgeGraphResult, 'nodes' | 'edges' | 'layoutMode' | 'initialPositions'>,
  options: { reducedMotion?: boolean; maxIterations?: number } = {}
): {
  positions: Record<string, StaticPoint2D>;
  iterationsRun: number;
  modeUsed: 'static-reduced-motion' | 'clustered-deterministic' | 'bounded-spring';
} {
  const basePositions: Record<string, { x: number; y: number }> = {};
  for (const node of graph.nodes) {
    const init = graph.initialPositions[node.id] || { x: 0.5, y: 0.5 };
    basePositions[node.id] = { x: init.x, y: init.y };
  }

  if (options.reducedMotion) {
    return {
      positions: basePositions,
      iterationsRun: 0,
      modeUsed: 'static-reduced-motion',
    };
  }

  if (
    graph.layoutMode === 'large-graph-clustered' ||
    graph.nodes.length > GRAPH_SCALE_LIMITS.MAX_SPRING_NODES ||
    graph.edges.length > GRAPH_SCALE_LIMITS.MAX_SPRING_EDGES
  ) {
    return {
      positions: basePositions,
      iterationsRun: 0,
      modeUsed: 'clustered-deterministic',
    };
  }

  const maxIter = Math.min(
    options.maxIterations ?? GRAPH_SCALE_LIMITS.MAX_SPRING_ITERATIONS,
    GRAPH_SCALE_LIMITS.MAX_SPRING_ITERATIONS
  );

  const velocities: Record<string, { vx: number; vy: number }> = {};
  for (const node of graph.nodes) {
    velocities[node.id] = { vx: 0, vy: 0 };
  }

  let iterationsRun = 0;
  for (let iter = 0; iter < maxIter; iter += 1) {
    iterationsRun += 1;
    let totalEnergy = 0;

    /* Gaya tolak antar-node pada subgraph kecil */
    for (let i = 0; i < graph.nodes.length; i += 1) {
      const a = graph.nodes[i];
      const posA = basePositions[a.id];
      for (let j = i + 1; j < graph.nodes.length; j += 1) {
        const b = graph.nodes[j];
        const posB = basePositions[b.id];
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

    /* Gaya tarik sepanjang edge tervalidasi */
    for (const edge of graph.edges) {
      const posS = basePositions[edge.source];
      const posT = basePositions[edge.target];
      if (!posS || !posT) continue;
      const dx = posT.x - posS.x;
      const dy = posT.y - posS.y;
      const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
      const targetLen = 0.22;
      const spring = (dist - targetLen) * 0.035;
      const fx = (dx / dist) * spring;
      const fy = (dy / dist) * spring;
      velocities[edge.source].vx += fx;
      velocities[edge.source].vy += fy;
      velocities[edge.target].vx -= fx;
      velocities[edge.target].vy -= fy;
    }

    /* Tarikan lembut ke pusat (0.5, 0.5) & update posisi */
    for (const node of graph.nodes) {
      const pos = basePositions[node.id];
      const vel = velocities[node.id];
      vel.vx = (vel.vx + (0.5 - pos.x) * 0.012) * GRAPH_SCALE_LIMITS.DAMPING;
      vel.vy = (vel.vy + (0.5 - pos.y) * 0.012) * GRAPH_SCALE_LIMITS.DAMPING;
      pos.x = Math.min(0.92, Math.max(0.08, pos.x + vel.vx));
      pos.y = Math.min(0.92, Math.max(0.08, pos.y + vel.vy));
      totalEnergy += vel.vx * vel.vx + vel.vy * vel.vy;
    }

    if (totalEnergy < GRAPH_SCALE_LIMITS.ENERGY_THRESHOLD) {
      break;
    }
  }

  for (const node of graph.nodes) {
    basePositions[node.id] = {
      x: Number(basePositions[node.id].x.toFixed(4)),
      y: Number(basePositions[node.id].y.toFixed(4)),
    };
  }

  return {
    positions: basePositions,
    iterationsRun,
    modeUsed: 'bounded-spring',
  };
}

/**
 * Membangun KnowledgeGraphResult secara deterministik dari koleksi codex, work, dan adr.
 */
export function buildCodexKnowledgeGraph(input: {
  readonly codexEntries: readonly CodexEntryLike[];
  readonly workEntries: readonly WorkEntryLike[];
  readonly adrEntries: readonly AdrEntryLike[];
}): KnowledgeGraphResult {
  const codexList = Array.isArray(input.codexEntries) ? [...input.codexEntries] : [];
  const workList = Array.isArray(input.workEntries) ? [...input.workEntries] : [];
  const adrList = Array.isArray(input.adrEntries) ? [...input.adrEntries] : [];

  const nodeDraftById = new Map<
    string,
    Omit<KnowledgeNode, 'outDegree' | 'inDegree' | 'degree'>
  >();

  /* 1. Daftarkan seluruh node Codex */
  for (const entry of codexList) {
    const d = entry.data;
    if (!d || typeof d.codexId !== 'string') continue;
    const nodeId = `codex:${d.codexId}`;
    const slug = getCodexRouteSlug(entry.id);
    nodeDraftById.set(nodeId, {
      id: nodeId,
      rawId: d.codexId,
      type: 'codex',
      label: d.title,
      codeOrTag: d.decimalCode,
      categoryOrDomain: getCodexDomainLabel(d.domain) || d.domain,
      url: `/codex/${slug}`,
      routeable: true,
      statusOrMaturity: d.maturity,
    });
  }

  /* 2. Daftarkan seluruh node Work (LIVE/DEMO -> routeable; RESERVED/ARCHIVED -> reference-only) */
  for (const entry of workList) {
    const d = entry.data;
    if (!d || typeof d.contentId !== 'string') continue;
    const nodeId = `work:${d.contentId}`;
    const isRouteable = d.status === 'LIVE' || d.status === 'DEMO';
    nodeDraftById.set(nodeId, {
      id: nodeId,
      rawId: d.contentId,
      type: 'work',
      label: d.title,
      codeOrTag: d.tag || d.status,
      categoryOrDomain: d.category,
      url: isRouteable ? `/work/${entry.id}` : null,
      routeable: isRouteable,
      statusOrMaturity: d.status,
    });
  }

  /* 3. Daftarkan seluruh node ADR */
  for (const entry of adrList) {
    const d = entry.data;
    if (!d || typeof d.adrId !== 'string') continue;
    const nodeId = `adr:${d.adrId}`;
    nodeDraftById.set(nodeId, {
      id: nodeId,
      rawId: d.adrId,
      type: 'adr',
      label: d.title,
      codeOrTag: d.versionTag,
      categoryOrDomain: adrCategoryLabel(d.category) || d.category,
      url: `/archive/adr/${entry.id}`,
      routeable: true,
      statusOrMaturity: d.recordStatus,
    });
  }

  /* 4. Kumpulkan dan deduplikasi edge tervalidasi (hanya satu arah sesuai sumber!) */
  const edgeMap = new Map<string, KnowledgeEdge>();
  const addEdge = (source: string, target: string, relationType: KnowledgeRelationType) => {
    if (source === target) return;
    if (!nodeDraftById.has(source) || !nodeDraftById.has(target)) return;
    const edgeKey = `${source}->${target}:${relationType}`;
    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, {
        id: edgeKey,
        source,
        target,
        relationType,
      });
    }
  };

  for (const entry of codexList) {
    const d = entry.data;
    if (!d || typeof d.codexId !== 'string') continue;
    const sourceId = `codex:${d.codexId}`;

    for (const relCodex of d.relatedCodexIds || []) {
      addEdge(sourceId, `codex:${relCodex}`, 'related-codex');
    }
    for (const relWork of d.relatedWorkIds || []) {
      addEdge(sourceId, `work:${relWork}`, 'related-work');
    }
    for (const relAdr of d.relatedAdrIds || []) {
      addEdge(sourceId, `adr:${relAdr}`, 'related-adr');
    }
  }

  /* Urutkan edge secara deterministik */
  const edges = [...edgeMap.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    if (a.target !== b.target) return a.target.localeCompare(b.target);
    return a.relationType.localeCompare(b.relationType);
  });

  /* 5. Bangun outgoing references dan incoming backlinks dari edge tervalidasi */
  const outgoingByNodeId: Record<string, KnowledgeRelationRef[]> = {};
  const incomingBacklinksByNodeId: Record<string, KnowledgeRelationRef[]> = {};

  for (const nodeId of nodeDraftById.keys()) {
    outgoingByNodeId[nodeId] = [];
    incomingBacklinksByNodeId[nodeId] = [];
  }

  const relationCounts = {
    'related-codex': 0,
    'related-work': 0,
    'related-adr': 0,
    total: 0,
  };

  for (const edge of edges) {
    const sourceNode = nodeDraftById.get(edge.source);
    const targetNode = nodeDraftById.get(edge.target);
    if (!sourceNode || !targetNode) continue;

    relationCounts[edge.relationType] += 1;
    relationCounts.total += 1;

    outgoingByNodeId[edge.source].push({
      nodeId: targetNode.id,
      rawId: targetNode.rawId,
      type: targetNode.type,
      label: targetNode.label,
      codeOrTag: targetNode.codeOrTag,
      url: targetNode.url,
      routeable: targetNode.routeable,
      statusOrMaturity: targetNode.statusOrMaturity,
      relationType: edge.relationType,
    });

    incomingBacklinksByNodeId[edge.target].push({
      nodeId: sourceNode.id,
      rawId: sourceNode.rawId,
      type: sourceNode.type,
      label: sourceNode.label,
      codeOrTag: sourceNode.codeOrTag,
      url: sourceNode.url,
      routeable: sourceNode.routeable,
      statusOrMaturity: sourceNode.statusOrMaturity,
      relationType: edge.relationType,
    });
  }

  /* Pastikan urutan outgoing dan incoming backlinks deterministik */
  for (const nodeId of Object.keys(outgoingByNodeId)) {
    outgoingByNodeId[nodeId].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    incomingBacklinksByNodeId[nodeId].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
  }

  /* 6. Finalisasi node: sertakan seluruh node Codex, serta node Work/ADR yang memiliki relasi (atau bagian dari jaringan) */
  const nodes: KnowledgeNode[] = [...nodeDraftById.values()]
    .map((draft) => {
      const outDegree = outgoingByNodeId[draft.id]?.length ?? 0;
      const inDegree = incomingBacklinksByNodeId[draft.id]?.length ?? 0;
      return {
        ...draft,
        outDegree,
        inDegree,
        degree: outDegree + inDegree,
      };
    })
    .filter((node) => node.type === 'codex' || node.degree > 0)
    .sort((a, b) => a.id.localeCompare(b.id));

  const referenceOnlyNodes = nodes.filter((node) => !node.routeable);

  const layoutMode =
    nodes.length <= GRAPH_SCALE_LIMITS.MAX_SPRING_NODES &&
    edges.length <= GRAPH_SCALE_LIMITS.MAX_SPRING_EDGES
      ? 'small-graph-spring'
      : 'large-graph-clustered';

  const initialPositions = computeDeterministicNodePositions(nodes);

  return {
    nodes,
    edges,
    outgoingByNodeId,
    incomingBacklinksByNodeId,
    referenceOnlyNodes,
    relationCounts,
    layoutMode,
    scaleLimits: GRAPH_SCALE_LIMITS,
    initialPositions,
  };
}
