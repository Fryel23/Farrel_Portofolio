/*!
 * src/lib/world-os-core.ts - Pure Domain Logic for World OS Layer.
 *
 * Menyediakan:
 *  1. WORLD_TERRITORIES dan WORLD_COMMANDS kanonis.
 *  2. Builder deterministik untuk endpoint /api/world-index.json.
 *  3. Normalisasi query pencarian (NFKC, control-char strip, lowercase, length cap)
 *     dan algoritma pemeringkatan deterministik 5 tingkat.
 *  4. Parser command eksplisit (:warp, :split, :audio, :top) berbasis allowlist.
 *  5. Validator URL ketat untuk Reference Tiling Dock (menolak skema berbahaya,
 *     protocol-relative URL, path traversal, dan rute non-routeable).
 */

import { getCodexRouteSlug } from './codex-graph-builder.ts';

export const WORLD_INDEX_SCHEMA_VERSION = 1 as const;
export const MAX_WORLD_QUERY_LENGTH = 100 as const;
export const MAX_RESULTS_PER_GROUP = 6 as const;
export const MAX_TOTAL_RESULTS = 20 as const;

export type WorldResultGroupKey =
  | 'TERRITORIES'
  | 'CODEX NOTES'
  | 'ENGINEERING RECORDS'
  | 'CASE STUDIES'
  | 'COMMANDS';

export interface WorldTerritoryItem {
  readonly id: string;
  readonly sectorCode: string;
  readonly label: string;
  readonly path: string;
  readonly description: string;
  readonly kind: 'hub' | 'lab' | 'knowledge' | 'archive' | 'identity' | 'atlas';
  readonly searchTerms: readonly string[];
}

export interface WorldWorkItem {
  readonly contentId: string;
  readonly entryId: string;
  readonly title: string;
  readonly description: string;
  readonly technologies: readonly string[];
  readonly status: string;
  readonly url: string | null;
  readonly routeable: boolean;
}

export interface WorldAdrItem {
  readonly adrId: string;
  readonly versionTag: string;
  readonly title: string;
  readonly category: string;
  readonly recordType: string;
  readonly summary: string;
  readonly url: string;
}

export interface WorldCodexItem {
  readonly codexId: string;
  readonly decimalCode: string;
  readonly title: string;
  readonly domain: string;
  readonly summary: string;
  readonly maturity: string;
  readonly url: string;
  readonly relatedCount: number;
}

export interface WorldCommandItem {
  readonly id: string;
  readonly syntax: string;
  readonly label: string;
  readonly description: string;
  readonly example: string;
}

export interface WorldIndexPayload {
  readonly schemaVersion: typeof WORLD_INDEX_SCHEMA_VERSION;
  readonly territories: readonly WorldTerritoryItem[];
  readonly work: readonly WorldWorkItem[];
  readonly adr: readonly WorldAdrItem[];
  readonly codex: readonly WorldCodexItem[];
  readonly commands: readonly WorldCommandItem[];
}

export const WORLD_TERRITORIES: readonly WorldTerritoryItem[] = [
  {
    id: 'home',
    sectorCode: '01',
    label: 'The Citadel · Home',
    path: '/',
    description: 'Beranda utama, profil pelajar, Curiosity Map, dan pengantar arsip.',
    kind: 'hub',
    searchTerms: ['home', 'citadel', 'start', 'hero', 'beranda', 'top'],
  },
  {
    id: 'work',
    sectorCode: '02',
    label: 'Selected Work & Case Studies',
    path: '/work',
    description: 'Katalog studi kasus riset data dan rekayasa perangkat lunak.',
    kind: 'hub',
    searchTerms: ['work', 'projects', 'case studies', 'proyek', 'studi kasus'],
  },
  {
    id: 'lab',
    sectorCode: '03',
    label: 'The Data Lab · AQI / ISPU Explorer',
    path: '/lab',
    description: 'Eksplorasi interaktif kualitas udara Cirebon 2021-2025 dengan kalkulator ISPU P.14/2020.',
    kind: 'lab',
    searchTerms: ['lab', 'data lab', 'aqi', 'ispu', 'cirebon', 'so2', 'no2'],
  },
  {
    id: 'lab-methodology',
    sectorCode: '03A',
    label: 'Data Lab · ISPU P.14/2020 Methodology',
    path: '/lab/methodology',
    description: 'Dokumentasi rumus interpolasi linier PermenLHK P.14/2020 dan batas basis waktu.',
    kind: 'lab',
    searchTerms: ['methodology', 'metodologi', 'p14 2020', 'formula', 'interpolation', 'reference'],
  },
  {
    id: 'lab-csv',
    sectorCode: '03B',
    label: 'Data Lab · Browser CSV Explorer',
    path: '/lab/csv',
    description: 'Eksplorasi CSV lokal berbasis RFC 4180 state machine dan isolasi Web Worker.',
    kind: 'lab',
    searchTerms: ['csv', 'csv explorer', 'worker', 'parser', 'dataset', 'upload'],
  },
  {
    id: 'aethelgrad',
    sectorCode: '04',
    label: 'Aethelgrad',
    path: '/aethelgrad',
    description: 'Eksplorasi dunia RPG interaktif dengan koleksi pahlawan piksel, tantangan logika, dan arena peringkat.',
    kind: 'knowledge',
    searchTerms: ['aethelgrad', 'outpost', 'summon', 'barracks', 'grimoire', 'trials', 'arena', 'rpg'],
  },
  {
    id: 'archive',
    sectorCode: '06',
    label: 'The Side Archive Hub',
    path: '/archive',
    description: 'Pintu masuk ke ruang samping arsip: game deck, kredensial, off-screen, dan aktivitas GitHub.',
    kind: 'archive',
    searchTerms: ['archive', 'hub', 'side archive', 'arsip', 'github'],
  },
  {
    id: 'play',
    sectorCode: '06A',
    label: 'Archive · Game Deck',
    path: '/archive/play',
    description: 'Dek permainan kasual dan catatan sesi bermain pribadi.',
    kind: 'archive',
    searchTerms: ['play', 'games', 'arcade', 'game deck'],
  },
  {
    id: 'credentials',
    sectorCode: '06B',
    label: 'Archive · Milestones & Credentials',
    path: '/archive/credentials',
    description: 'Ruang arsip sertifikat dan pencapaian yang terverifikasi.',
    kind: 'archive',
    searchTerms: ['credentials', 'certificates', 'milestones', 'sertifikat'],
  },
  {
    id: 'off-screen',
    sectorCode: '06C',
    label: 'Archive · Off-Screen & Companion Habitat',
    path: '/archive/off-screen',
    description: 'Kegiatan di luar layar, daftar putar musik, dan habitat companion piksel Kok.',
    kind: 'archive',
    searchTerms: ['off-screen', 'offscreen', 'hobbies', 'music', 'spotify', 'companion', 'kok'],
  },
  {
    id: 'about',
    sectorCode: '07A',
    label: 'Identity, Skills & Learning Journey',
    path: '/about',
    description: 'Latar belakang akademik di UNIKOM, keterampilan jujur, dan tahapan perjalanan belajar.',
    kind: 'identity',
    searchTerms: ['about', 'identity', 'skills', 'journey', 'unikom', 'profile'],
  },
  {
    id: 'connect',
    sectorCode: '07B',
    label: 'Connect & Social Profiles',
    path: '/connect',
    description: 'Saluran kontak langsung, tautan dokumentasi Google Drive, dan profil sosial.',
    kind: 'identity',
    searchTerms: ['connect', 'contact', 'email', 'social', 'kontak'],
  },
  {
    id: 'atlas',
    sectorCode: '00',
    label: 'The Data Atlas Crypt & Knowledge Graph',
    path: '/atlas',
    description: 'Peta konstelasi pengetahuan interaktif 36 simpul, 52 sinapsis, dan Live Performance Telemetry HUD.',
    kind: 'atlas',
    searchTerms: ['atlas', 'data atlas', 'crypt', 'map', 'topology', 'knowledge graph', 'telemetry'],
  },
] as const;

export const WORLD_COMMANDS: readonly WorldCommandItem[] = [
  {
    id: 'cmd-warp',
    syntax: ':warp <territory>',
    label: 'Warp to Territory',
    description: 'Navigasi langsung ke wilayah terdaftar (contoh: :warp aethelgrad, :warp lab, :warp atlas).',
    example: ':warp aethelgrad',
  },
  {
    id: 'cmd-split-open',
    syntax: ':split open',
    label: 'Open Reference Dock (Desktop)',
    description: 'Membuka panel referensi samping pada layar desktop (>= 1024px).',
    example: ':split open',
  },
  {
    id: 'cmd-split-close',
    syntax: ':split close',
    label: 'Close Reference Dock',
    description: 'Menutup panel referensi samping dan mengembalikan tata letak satu kolom.',
    example: ':split close',
  },
  {
    id: 'cmd-audio-mute',
    syntax: ':audio mute',
    label: 'Mute Interface Audio',
    description: 'Mematikan sintesis suara antarmuka melalui audio-runtime.',
    example: ':audio mute',
  },
  {
    id: 'cmd-audio-unmute',
    syntax: ':audio unmute',
    label: 'Unmute Interface Audio',
    description: 'Mengaktifkan kembali sintesis suara antarmuka.',
    example: ':audio unmute',
  },
  {
    id: 'cmd-audio-toggle',
    syntax: ':audio toggle',
    label: 'Toggle Interface Audio',
    description: 'Membalik status mute/unmute suara antarmuka saat ini.',
    example: ':audio toggle',
  },
  {
    id: 'cmd-top',
    syntax: ':top',
    label: 'Scroll to Top of Page',
    description: 'Kembali ke bagian paling atas halaman aktif.',
    example: ':top',
  },
] as const;

const NON_ROUTEABLE_WORK_STATUSES = new Set(['RESERVED', 'ARCHIVED']);

/**
 * Membangun payload JSON deterministik untuk /api/world-index.json.
 */
export function buildWorldIndexPayload(input: {
  readonly workEntries: readonly {
    readonly id: string;
    readonly data: {
      readonly contentId: string;
      readonly title: string;
      readonly summary?: string;
      readonly description?: string;
      readonly technologies?: readonly string[];
      readonly status: string;
    };
  }[];
  readonly adrEntries: readonly {
    readonly id: string;
    readonly data: {
      readonly adrId: string;
      readonly versionTag: string;
      readonly sequenceOrder: number;
      readonly title: string;
      readonly category: string;
      readonly recordType: string;
      readonly summary: string;
    };
  }[];
  readonly codexEntries: readonly {
    readonly id: string;
    readonly data: {
      readonly codexId: string;
      readonly decimalCode: string;
      readonly title: string;
      readonly domain: string;
      readonly summary: string;
      readonly maturity: string;
      readonly relatedCodexIds?: readonly string[];
      readonly relatedWorkIds?: readonly string[];
      readonly relatedAdrIds?: readonly string[];
    };
  }[];
}): WorldIndexPayload {
  const workItems: WorldWorkItem[] = [...input.workEntries]
    .sort((a, b) => a.data.contentId.localeCompare(b.data.contentId))
    .map((entry) => {
      const status = String(entry.data.status || 'RESERVED');
      const routeable = !NON_ROUTEABLE_WORK_STATUSES.has(status);
      return {
        contentId: entry.data.contentId,
        entryId: entry.id,
        title: entry.data.title,
        description: String(entry.data.summary || entry.data.description || ''),
        technologies: Array.isArray(entry.data.technologies) ? [...entry.data.technologies] : [],
        status,
        url: routeable ? `/work/${entry.id}` : null,
        routeable,
      };
    });

  const adrItems: WorldAdrItem[] = [...input.adrEntries]
    .sort((a, b) => a.data.sequenceOrder - b.data.sequenceOrder)
    .map((entry) => ({
      adrId: entry.data.adrId,
      versionTag: entry.data.versionTag,
      title: entry.data.title,
      category: entry.data.category,
      recordType: entry.data.recordType,
      summary: entry.data.summary,
      url: `/archive/adr/${entry.id}`,
    }));

  const codexItems: WorldCodexItem[] = [...input.codexEntries]
    .sort((a, b) =>
      a.data.decimalCode.localeCompare(b.data.decimalCode, undefined, { numeric: true })
    )
    .map((entry) => {
      const slug = getCodexRouteSlug(entry.id);
      const relatedCount =
        (entry.data.relatedCodexIds?.length || 0) +
        (entry.data.relatedWorkIds?.length || 0) +
        (entry.data.relatedAdrIds?.length || 0);
      return {
        codexId: entry.data.codexId,
        decimalCode: entry.data.decimalCode,
        title: entry.data.title,
        domain: entry.data.domain,
        summary: entry.data.summary,
        maturity: entry.data.maturity,
        url: `/codex/${slug}`,
        relatedCount,
      };
    });

  return {
    schemaVersion: WORLD_INDEX_SCHEMA_VERSION,
    territories: WORLD_TERRITORIES,
    work: workItems,
    adr: adrItems,
    codex: codexItems,
    commands: WORLD_COMMANDS,
  };
}

/**
 * Memvalidasi struktur response /api/world-index.json sebelum dipakai di klien.
 */
export function validateWorldIndexPayload(raw: unknown): raw is WorldIndexPayload {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== WORLD_INDEX_SCHEMA_VERSION) return false;
  if (!Array.isArray(obj.territories)) return false;
  if (!Array.isArray(obj.work)) return false;
  if (!Array.isArray(obj.adr)) return false;
  if (!Array.isArray(obj.codex)) return false;
  if (!Array.isArray(obj.commands)) return false;
  return true;
}

/**
 * Normalisasi query pencarian sesuai D.3.3:
 * trim, Unicode NFKC, hapus control chars, collapse whitespace, lowercase en-US, cap panjang.
 */
export function normalizeWorldQuery(raw: unknown): string {
  let value = raw === undefined || raw === null ? '' : String(raw);
  try {
    if (typeof value.normalize === 'function') {
      value = value.normalize('NFKC');
    }
  } catch (error) {
    /* Pertahankan string mentah bila normalize gagal */
  }
  value = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  value = value.replace(/\s+/g, ' ');
  value = value.toLocaleLowerCase('en-US');
  value = value.trim();
  if (value.length > MAX_WORLD_QUERY_LENGTH) {
    value = value.slice(0, MAX_WORLD_QUERY_LENGTH);
  }
  return value;
}

export type ParsedWorldCommand =
  | {
      readonly ok: true;
      readonly action: 'warp';
      readonly targetPath: string;
      readonly territoryLabel: string;
    }
  | {
      readonly ok: true;
      readonly action: 'split-open';
      readonly targetPath?: string;
    }
  | {
      readonly ok: true;
      readonly action: 'split-close';
    }
  | {
      readonly ok: true;
      readonly action: 'audio';
      readonly mode: 'mute' | 'unmute' | 'toggle';
    }
  | {
      readonly ok: true;
      readonly action: 'top';
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

/**
 * Mem-parsing command berawalan ':' secara deterministik tanpa eval/shell.
 * Hanya mengenali daftar di D.3.4.
 */
export function parseWorldCommand(
  rawInput: unknown,
  territories: readonly WorldTerritoryItem[] = WORLD_TERRITORIES
): ParsedWorldCommand | null {
  const normalized = normalizeWorldQuery(rawInput);
  if (!normalized.startsWith(':')) {
    return null;
  }

  const tokens = normalized.split(' ').filter(Boolean);
  const cmd = tokens[0];
  const arg = tokens.slice(1).join(' ');

  if (cmd === ':top') {
    if (arg) {
      return { ok: false, error: 'Command :top tidak menerima argumen tambahan.' };
    }
    return { ok: true, action: 'top' };
  }

  if (cmd === ':split') {
    if (arg === 'open') {
      return { ok: true, action: 'split-open' };
    }
    if (arg === 'close') {
      return { ok: true, action: 'split-close' };
    }
    return {
      ok: false,
      error: 'Gunakan ":split open" atau ":split close" untuk mengatur Reference Dock.',
    };
  }

  if (cmd === ':audio') {
    if (arg === 'mute' || arg === 'unmute' || arg === 'toggle') {
      return { ok: true, action: 'audio', mode: arg };
    }
    return {
      ok: false,
      error: 'Gunakan ":audio mute", ":audio unmute", atau ":audio toggle".',
    };
  }

  if (cmd === ':warp') {
    if (!arg) {
      return {
        ok: false,
        error:
          'Masukkan nama wilayah tujuan, contoh: ":warp codex", ":warp lab", ":warp adr", atau ":warp atlas".',
      };
    }
    const cleanArg = arg.replace(/^\/+/, '');
    const matched = territories.find(
      (t) =>
        t.id.toLowerCase() === arg ||
        t.id.toLowerCase() === cleanArg ||
        t.path.toLowerCase() === arg ||
        t.path.replace(/^\/+/, '').toLowerCase() === cleanArg ||
        t.searchTerms.some((term) => term.toLowerCase() === arg)
    );
    if (!matched) {
      return {
        ok: false,
        error: `Wilayah "${arg}" tidak terdaftar dalam allowlist rute aplikasi.`,
      };
    }
    return {
      ok: true,
      action: 'warp',
      targetPath: matched.path,
      territoryLabel: matched.label,
    };
  }

  return {
    ok: false,
    error: `Command "${cmd}" tidak dikenali. Command yang diizinkan: :warp, :split, :audio, :top.`,
  };
}

export interface WorldSearchResultItem {
  readonly id: string;
  readonly group: WorldResultGroupKey;
  readonly codeOrTag: string;
  readonly title: string;
  readonly subtitle: string;
  readonly url: string | null;
  readonly routeable: boolean;
  readonly commandSyntax?: string;
  readonly canOpenInDock: boolean;
  readonly score: number;
}

function computeCandidateScore(
  query: string,
  codes: readonly string[],
  title: string,
  aliases: readonly string[],
  bodyFields: readonly string[]
): number {
  if (!query) return 10;

  const normCodes = codes.map((c) => normalizeWorldQuery(c)).filter(Boolean);
  const normTitle = normalizeWorldQuery(title);
  const normAliases = aliases.map((a) => normalizeWorldQuery(a)).filter(Boolean);
  const normBody = bodyFields.map((b) => normalizeWorldQuery(b)).filter(Boolean);

  /* 1. Exact code / version / route (500) */
  if (normCodes.some((c) => c === query)) return 500;

  /* 2. Exact title (400) */
  if (normTitle === query) return 400;

  /* 3. Exact alias (300) */
  if (normAliases.some((a) => a === query)) return 300;

  /* 4. Prefix match on code, title, or alias (200) */
  if (
    normCodes.some((c) => c.startsWith(query)) ||
    normTitle.startsWith(query) ||
    normAliases.some((a) => a.startsWith(query))
  ) {
    return 200;
  }

  /* 5. Substring match on title, summary, alias, or tag (100) */
  if (
    normCodes.some((c) => c.includes(query)) ||
    normTitle.includes(query) ||
    normAliases.some((a) => a.includes(query)) ||
    normBody.some((b) => b.includes(query))
  ) {
    return 100;
  }

  return 0;
}

/**
 * Meranking hasil pencarian World Index secara deterministik ke dalam 5 grup.
 */
export function rankWorldSearchResults(
  index: WorldIndexPayload,
  rawQuery: unknown
): {
  readonly query: string;
  readonly grouped: Readonly<Record<WorldResultGroupKey, readonly WorldSearchResultItem[]>>;
  readonly flatList: readonly WorldSearchResultItem[];
} {
  const query = normalizeWorldQuery(rawQuery);
  const isCommandPrefix = query.startsWith(':');

  const candidates: WorldSearchResultItem[] = [];

  if (!isCommandPrefix) {
    /* 1. TERRITORIES */
    for (const t of index.territories) {
      const score = computeCandidateScore(
        query,
        [t.id, t.path, `sector ${t.sectorCode}`, t.sectorCode],
        t.label,
        t.searchTerms,
        [t.description, t.kind]
      );
      if (score > 0) {
        candidates.push({
          id: `territory:${t.id}`,
          group: 'TERRITORIES',
          codeOrTag: `SECTOR ${t.sectorCode}`,
          title: t.label,
          subtitle: `${t.path} · ${t.description}`,
          url: t.path,
          routeable: true,
          canOpenInDock: true,
          score,
        });
      }
    }

    /* 2. CODEX NOTES */
    for (const c of index.codex) {
      const score = computeCandidateScore(
        query,
        [c.decimalCode, c.codexId, c.url],
        c.title,
        [c.domain, c.maturity],
        [c.summary]
      );
      if (score > 0) {
        candidates.push({
          id: `codex:${c.codexId}`,
          group: 'CODEX NOTES',
          codeOrTag: `CODEX ${c.decimalCode}`,
          title: c.title,
          subtitle: `${c.maturity} · ${c.summary}`,
          url: c.url,
          routeable: true,
          canOpenInDock: true,
          score,
        });
      }
    }

    /* 3. ENGINEERING RECORDS */
    for (const a of index.adr) {
      const score = computeCandidateScore(
        query,
        [a.versionTag, a.adrId, a.url],
        a.title,
        [a.category, a.recordType, 'adr'],
        [a.summary]
      );
      if (score > 0) {
        candidates.push({
          id: `adr:${a.adrId}`,
          group: 'ENGINEERING RECORDS',
          codeOrTag: a.versionTag,
          title: a.title,
          subtitle: `${a.category} · ${a.summary}`,
          url: a.url,
          routeable: true,
          canOpenInDock: true,
          score,
        });
      }
    }

    /* 4. CASE STUDIES (Work) */
    for (const w of index.work) {
      const score = computeCandidateScore(
        query,
        [w.contentId, w.entryId, ...(w.url ? [w.url] : [])],
        w.title,
        [...w.technologies, w.status],
        [w.description]
      );
      if (score > 0) {
        candidates.push({
          id: `work:${w.contentId}`,
          group: 'CASE STUDIES',
          codeOrTag: w.routeable ? w.status : `${w.status} (REF-ONLY)`,
          title: w.title,
          subtitle: w.routeable
            ? w.description
            : `Reference-only (${w.status}, non-routeable) · ${w.description}`,
          url: w.routeable ? w.url : null,
          routeable: w.routeable,
          canOpenInDock: Boolean(w.routeable && w.url),
          score,
        });
      }
    }
  }

  /* 5. COMMANDS */
  for (const cmd of index.commands) {
    const score = computeCandidateScore(
      query,
      [cmd.syntax, cmd.example, cmd.id],
      cmd.label,
      [cmd.syntax.split(' ')[0]],
      [cmd.description]
    );
    if (score > 0 || (isCommandPrefix && cmd.syntax.startsWith(query.split(' ')[0]))) {
      candidates.push({
        id: `cmd:${cmd.id}`,
        group: 'COMMANDS',
        codeOrTag: cmd.syntax,
        title: cmd.label,
        subtitle: cmd.description,
        url: null,
        routeable: false,
        commandSyntax: cmd.example,
        canOpenInDock: false,
        score: isCommandPrefix ? Math.max(score, 350) : score,
      });
    }
  }

  const groupOrder: readonly WorldResultGroupKey[] = [
    'TERRITORIES',
    'CODEX NOTES',
    'ENGINEERING RECORDS',
    'CASE STUDIES',
    'COMMANDS',
  ];

  const grouped: Record<WorldResultGroupKey, WorldSearchResultItem[]> = {
    TERRITORIES: [],
    'CODEX NOTES': [],
    'ENGINEERING RECORDS': [],
    'CASE STUDIES': [],
    COMMANDS: [],
  };

  for (const gKey of groupOrder) {
    const items = candidates
      .filter((c) => c.group === gKey)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.codeOrTag.localeCompare(b.codeOrTag, undefined, { numeric: true });
      })
      .slice(0, MAX_RESULTS_PER_GROUP);
    grouped[gKey] = items;
  }

  const flatList: WorldSearchResultItem[] = [];
  for (const gKey of groupOrder) {
    for (const item of grouped[gKey]) {
      if (flatList.length < MAX_TOTAL_RESULTS) {
        flatList.push(item);
      }
    }
  }

  return { query, grouped, flatList };
}

/**
 * Memvalidasi URL target untuk Reference Tiling Dock (D.4.3).
 * Menolak external URL, javascript:, data:, protocol-relative path (//),
 * path traversal (..), backslash, dan URL yang tidak berada di allowlist.
 */
export function validateDockTargetUrl(
  rawUrl: unknown,
  index?: WorldIndexPayload | null
): { readonly ok: true; readonly safePath: string } | { readonly ok: false; readonly reason: string } {
  if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    return { ok: false, reason: 'URL referensi kosong atau tidak valid.' };
  }

  const trimmed = rawUrl.trim();

  /* Tolak skema berbahaya, protocol-relative, backslash, control chars, dan query/hash bebas */
  if (
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ||
    /[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return {
      ok: false,
      reason: 'Hanya rute internal same-origin yang diizinkan di Reference Dock.',
    };
  }

  if (!trimmed.startsWith('/')) {
    return {
      ok: false,
      reason: 'Path referensi harus diawali dengan garis miring tunggal ("/").',
    };
  }

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch (error) {
    return { ok: false, reason: 'Encoding URI pada path referensi tidak valid.' };
  }

  if (
    decoded.includes('..') ||
    decoded.includes('//') ||
    decoded.includes('\\') ||
    decoded.includes('?') ||
    decoded.includes('#')
  ) {
    return {
      ok: false,
      reason: 'Path traversal, double slash, atau parameter bebas tidak diizinkan.',
    };
  }

  const cleanPath = decoded === '/' ? '/' : decoded.replace(/\/+$/, '');

  /* Bangun set allowlist dari territory + index bila tersedia */
  const allowedPaths = new Set<string>(WORLD_TERRITORIES.map((t) => t.path));
  /* Rute artikel default yang selalu diizinkan */
  allowedPaths.add('/work/aqi-cirebon');

  if (index) {
    for (const w of index.work) {
      if (w.routeable && w.url) allowedPaths.add(w.url.replace(/\/+$/, ''));
    }
    for (const a of index.adr) {
      if (a.url) allowedPaths.add(a.url.replace(/\/+$/, ''));
    }
    for (const c of index.codex) {
      if (c.url) allowedPaths.add(c.url.replace(/\/+$/, ''));
    }
  } else {
    /* Jika index belum dimuat, izinkan pola rute ADR dan Codex yang ketat namun tolak work RESERVED */
    if (
      /^\/archive\/adr\/[a-z0-9-]+$/.test(cleanPath) ||
      /^\/codex\/[1-6]00-[a-z-]+\/[1-6]\d{2}-[a-z0-9-]+$/.test(cleanPath)
    ) {
      return { ok: true, safePath: cleanPath };
    }
  }

  if (!allowedPaths.has(cleanPath)) {
    return {
      ok: false,
      reason: `Rute "${cleanPath}" tidak terdaftar dalam allowlist halaman referensi publik.`,
    };
  }

  return { ok: true, safePath: cleanPath };
}
