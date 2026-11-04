/*!
 * src/lib/adr-taxonomy.ts - Engineering Records Vault taxonomy & manifest (V13.0-A).
 *
 * Single source of truth untuk kategori, jenis rekam, status historis,
 * allowlist rute internal, fungsi normalisasi provenance, dan manifest
 * dokumen rekayasa V10.3 sampai V12.3.
 */

export interface AdrCategoryOption {
  readonly id:
    | 'diagnostics-and-performance'
    | 'visual-and-webgl-architecture'
    | 'modularization-and-lifecycle'
    | 'data-pipeline-and-provenance'
    | 'content-and-schema-systems';
  readonly label: string;
}

export const ADR_CATEGORIES: readonly AdrCategoryOption[] = [
  { id: 'diagnostics-and-performance', label: 'Diagnostics & Performance' },
  { id: 'visual-and-webgl-architecture', label: 'Visual & WebGL Architecture' },
  { id: 'modularization-and-lifecycle', label: 'Modularization & Lifecycle' },
  { id: 'data-pipeline-and-provenance', label: 'Data Pipeline & Provenance' },
  { id: 'content-and-schema-systems', label: 'Content & Schema Systems' },
] as const;

export const ADR_CATEGORY_IDS = [
  'diagnostics-and-performance',
  'visual-and-webgl-architecture',
  'modularization-and-lifecycle',
  'data-pipeline-and-provenance',
  'content-and-schema-systems',
] as const;

export type AdrCategoryId = (typeof ADR_CATEGORY_IDS)[number];

export const ADR_RECORD_TYPES = [
  'diagnostic',
  'experiment',
  'decision',
  'implementation',
  'audit',
  'verification',
  'performance-baseline',
] as const;

export type AdrRecordType = (typeof ADR_RECORD_TYPES)[number];

export const ADR_RECORD_TYPE_LABELS: Record<AdrRecordType, string> = {
  diagnostic: 'Diagnostic',
  experiment: 'Experiment',
  decision: 'Decision',
  implementation: 'Implementation',
  audit: 'Audit',
  verification: 'Verification',
  'performance-baseline': 'Performance Baseline',
};

export const ADR_RECORD_STATUSES = [
  'historical',
  'active-contract',
  'superseded',
  'implemented-reported',
] as const;

export type AdrRecordStatus = (typeof ADR_RECORD_STATUSES)[number];

export const ADR_RECORD_STATUS_LABELS: Record<AdrRecordStatus, string> = {
  historical: 'Historical Record',
  'active-contract': 'Active Contract',
  superseded: 'Superseded',
  'implemented-reported': 'Implemented (Reported)',
};

export interface AdrKeyMetric {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly evidenceSection?: string;
}

export interface AdrProvenance {
  readonly sourcePath: string;
  readonly sourceFilename: string;
  readonly sourceSha256: string;
  readonly sourceBytes: number;
  readonly sourceWordCount: number;
  readonly sourceLineCount: number;
  readonly normalizedContentSha256: string;
  readonly normalizationCount: number;
}

export interface AdrManifestItem {
  readonly adrId: string;
  readonly slug: string;
  readonly sourcePath: string;
  readonly sourceFilename: string;
  readonly versionTag: string;
  readonly sequenceOrder: number;
  readonly title: string;
  readonly summary: string;
  readonly category: AdrCategoryId;
  readonly recordType: AdrRecordType;
  readonly recordStatus: AdrRecordStatus;
  readonly publishedAt?: string;
  readonly targetRoutes: readonly string[];
  readonly relatedWorkIds: readonly string[];
  readonly keyMetrics: readonly AdrKeyMetric[];
}

export interface AdrExcludedCandidate {
  readonly sourcePath: string;
  readonly sourceFilename: string;
  readonly candidate: false;
  readonly exclusionReason: string;
}

/**
 * Daftar rute internal aplikasi yang sah untuk divalidasi oleh validator ADR.
 */
export const KNOWN_INTERNAL_ROUTES = [
  '/',
  '/about',
  '/connect',
  '/work',
  '/work/aqi-cirebon',
  '/archive',
  '/archive/play',
  '/archive/credentials',
  '/archive/off-screen',
  '/archive/adr',
  '/lab',
  '/lab/methodology',
  '/lab/csv',
  '/codex',
  '/atlas',
] as const;

export function adrCategoryLabel(id: string): string | undefined {
  return ADR_CATEGORIES.find((item) => item.id === id)?.label;
}

export function adrRecordTypeLabel(type: string): string | undefined {
  return (ADR_RECORD_TYPE_LABELS as Record<string, string>)[type];
}

export function adrRecordStatusLabel(status: string): string | undefined {
  return (ADR_RECORD_STATUS_LABELS as Record<string, string>)[status];
}

export function isValidAdrId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

/**
 * Menghitung jumlah kata berdasarkan pemisahan whitespace Unicode pada teks UTF-8.
 */
export function countWordsUtf8(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/u).filter(Boolean).length;
}

/**
 * Menghitung jumlah baris fisik secara konsisten.
 * Newline terakhir di akhir file tidak menambah baris kosong ekstra.
 */
export function countPhysicalLines(text: string): number {
  if (text.length === 0) return 0;
  const body = text.endsWith('\n') ? text.slice(0, -1) : text;
  return body.split('\n').length;
}

/**
 * Menormalisasi karakter U+2014 pada salinan konten ADR menjadi tanda hubung ASCII (-).
 * Hanya mengubah code point U+2014 sehingga angka, tabel, rumus, dan struktur baris tetap utuh.
 */
export function normalizeAdrCopyContent(rawText: string): {
  normalizedText: string;
  normalizationCount: number;
} {
  let normalizationCount = 0;
  const normalizedText = rawText.replace(/\u2014/g, () => {
    normalizationCount += 1;
    return '-';
  });
  return { normalizedText, normalizationCount };
}

/**
 * Manifest terkurasi untuk 13 dokumen rekayasa publik V10.3 sampai V12.3.
 */
export const ADR_MANIFEST: readonly AdrManifestItem[] = [
  {
    adrId: 'v10-3-performance-baseline',
    slug: 'v10-3-performance-baseline',
    sourcePath: 'PERFORMANCE_BASELINE.md',
    sourceFilename: 'PERFORMANCE_BASELINE.md',
    versionTag: 'V10.3',
    sequenceOrder: 1,
    title: 'Performance Baseline V10.3 (Subfase 3)',
    summary:
      'Pengukuran baseline Lighthouse reproducible pada kondisi V10.3 untuk rute /, /work, dan /work/aqi-cirebon pada profil desktop dan mobile.',
    category: 'diagnostics-and-performance',
    recordType: 'performance-baseline',
    recordStatus: 'historical',
    targetRoutes: ['/', '/work', '/work/aqi-cirebon'],
    relatedWorkIds: ['aqi-cirebon'],
    keyMetrics: [
      { label: 'Desktop Homepage LCP', value: '5572', unit: 'ms', evidenceSection: '§2 Hasil Median Desktop' },
      { label: 'Mobile Homepage LCP', value: '3420', unit: 'ms', evidenceSection: '§2 Hasil Median Mobile' },
      { label: 'Desktop /work LCP', value: '675', unit: 'ms', evidenceSection: '§2 Hasil Median Desktop' },
      { label: 'Desktop /work/aqi-cirebon LCP', value: '623', unit: 'ms', evidenceSection: '§2 Hasil Median Desktop' },
    ],
  },
  {
    adrId: 'v10-3-identity-audit',
    slug: 'v10-3-identity-audit',
    sourcePath: 'IDENTITY_AUDIT.md',
    sourceFilename: 'IDENTITY_AUDIT.md',
    versionTag: 'V10.3',
    sequenceOrder: 2,
    title: 'Identity Audit V10.3 (Subfase 4 Read-Only)',
    summary:
      'Pemetaan read-only token tipografi, palet warna biru, dan ketergantungan selector CSS sebagai persiapan eksperimen identitas V11.0.',
    category: 'visual-and-webgl-architecture',
    recordType: 'audit',
    recordStatus: 'historical',
    targetRoutes: ['/', '/about', '/work', '/connect', '/archive'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'Blue Token Usages', value: '237', unit: 'occurrences', evidenceSection: '§4 Komponen yang Bergantung pada --blue*' },
      { label: 'Pixel Palette Tokens', value: '16', unit: 'colors', evidenceSection: '§1.2 Warna' },
    ],
  },
  {
    adrId: 'v10-4-diagnostic-report',
    slug: 'v10-4-diagnostic-report',
    sourcePath: 'V10.4_DIAGNOSTIC_REPORT.md',
    sourceFilename: 'V10.4_DIAGNOSTIC_REPORT.md',
    versionTag: 'V10.4',
    sequenceOrder: 3,
    title: 'Opening V9.1 LCP Diagnostic & Visual Prototyping',
    summary:
      'Verifikasi hipotesis oklusi LCP pada Opening V9.1 serta evaluasi empat prototipe overlay translusen V1-V4 pada lingkungan lab.',
    category: 'diagnostics-and-performance',
    recordType: 'diagnostic',
    recordStatus: 'superseded',
    targetRoutes: ['/'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'V0 Re-measured Desktop LCP', value: '5276', unit: 'ms', evidenceSection: '§3.1 Tabel perbandingan' },
      { label: 'Option C Desktop LCP', value: '485', unit: 'ms', evidenceSection: '§3.1 Tabel perbandingan' },
      { label: 'Option C Mobile LCP', value: '1448', unit: 'ms', evidenceSection: '§3.1 Tabel perbandingan' },
    ],
  },
  {
    adrId: 'v10-5-experiment-report',
    slug: 'v10-5-experiment-report',
    sourcePath: 'V10.5_EXPERIMENT_REPORT.md',
    sourceFilename: 'V10.5_EXPERIMENT_REPORT.md',
    versionTag: 'V10.5',
    sequenceOrder: 4,
    title: 'Comparative Opening Exploration (V10.5 Experiment Report)',
    summary:
      'Eksperimen komparatif tiga varian pembuka (A.1 Native Dialog Translucent, A.2 Custom Overlay Non-Modal, B.1 Shortened Solid) terhadap LCP dan Hero Interaction Ready.',
    category: 'diagnostics-and-performance',
    recordType: 'experiment',
    recordStatus: 'superseded',
    targetRoutes: ['/'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'Variant A.1 Desktop LCP', value: '3181', unit: 'ms', evidenceSection: '§1 Ringkasan Eksekutif' },
      { label: 'Variant A.2 Desktop LCP', value: '3307', unit: 'ms', evidenceSection: '§1 Ringkasan Eksekutif' },
      { label: 'Variant B.1 Desktop LCP', value: '3954', unit: 'ms', evidenceSection: '§1 Ringkasan Eksekutif' },
      { label: 'Regression Checks Passed', value: '60/60', unit: 'checks', evidenceSection: '§1 Ringkasan Eksekutif' },
    ],
  },
  {
    adrId: 'v10-5-final-decision',
    slug: 'v10-5-final-decision',
    sourcePath: 'V10.5_FINAL_DECISION.md',
    sourceFilename: 'V10.5_FINAL_DECISION.md',
    versionTag: 'V10.5',
    sequenceOrder: 5,
    title: 'Final Decision V10.5 Opening Experience',
    summary:
      'Keputusan rekayasa untuk tidak mengadopsi varian eksperimen V10.5 ke produksi karena batas LCP dan HIR belum terpenuhi secara bersamaan.',
    category: 'diagnostics-and-performance',
    recordType: 'decision',
    recordStatus: 'superseded',
    targetRoutes: ['/'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'Variants Approved', value: '0', unit: 'variants', evidenceSection: 'Keputusan: Opsi C' },
      { label: 'Variant A.1 HIR', value: '5755', unit: 'ms', evidenceSection: 'Alasan' },
    ],
  },
  {
    adrId: 'v10-5-final-verification',
    slug: 'v10-5-final-verification',
    sourcePath: 'V10.5_FINAL_VERIFICATION.txt',
    sourceFilename: 'V10.5_FINAL_VERIFICATION.txt',
    versionTag: 'V10.5',
    sequenceOrder: 6,
    title: 'V10.5 Final Verification Log',
    summary:
      'Catatan verifikasi akhir yang membuktikan baseline produksi tanpa parameter eksperimen tetap identik dengan V10.3.',
    category: 'diagnostics-and-performance',
    recordType: 'verification',
    recordStatus: 'historical',
    publishedAt: '2026-10-31',
    targetRoutes: ['/', '/work'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'Static Pages Built', value: '9', unit: 'pages', evidenceSection: 'Line 6 SERVER/ENV' },
      { label: 'Reference Sanity LCP', value: '5273', unit: 'ms', evidenceSection: 'Line 6 SERVER/ENV' },
    ],
  },
  {
    adrId: 'v11-0-implementation-report',
    slug: 'v11-0-implementation-report',
    sourcePath: 'V11.0_IMPLEMENTATION_REPORT.md',
    sourceFilename: 'V11.0_IMPLEMENTATION_REPORT.md',
    versionTag: 'V11.0',
    sequenceOrder: 7,
    title: 'V11.0 Implementation Report: The Curtain Pattern',
    summary:
      'Refaktor arsitektur pembuka dari modal dialog V9.1 menjadi Curtain Pattern dekoratif non-blocking pada halaman utama.',
    category: 'visual-and-webgl-architecture',
    recordType: 'implementation',
    recordStatus: 'active-contract',
    targetRoutes: ['/'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'Reported Desktop LCP', value: '328', unit: 'ms', evidenceSection: '§A Executive Summary' },
      { label: 'Reported Mobile LCP', value: '1456', unit: 'ms', evidenceSection: '§A Executive Summary' },
      { label: 'Architectural Criteria', value: '25/25', unit: 'criteria', evidenceSection: '§A Status acceptance' },
    ],
  },
  {
    adrId: 'v11-1-implementation-report',
    slug: 'v11-1-implementation-report',
    sourcePath: 'V11.1_IMPLEMENTATION_REPORT.md',
    sourceFilename: 'V11.1_IMPLEMENTATION_REPORT.md',
    versionTag: 'V11.1',
    sequenceOrder: 8,
    title: 'V11.1 Implementation Report: Signature Hero & Farrel Identity',
    summary:
      'Implementasi Signature WebGL Hero Glass Vessel berbasis OGL dengan SVG-first fallback, 48 partikel deterministik, dan tipografi serif Cormorant Garamond.',
    category: 'visual-and-webgl-architecture',
    recordType: 'implementation',
    recordStatus: 'active-contract',
    targetRoutes: ['/', '/connect'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'Automated Acceptance Checks', value: '56/56', unit: 'checks', evidenceSection: 'Header Status Akhir' },
      { label: 'Interior Dust Particles', value: '48', unit: 'particles', evidenceSection: '§A Executive Summary' },
      { label: 'Desktop CLS', value: '0.011', unit: 'score', evidenceSection: '§C Fallback-first visibility' },
    ],
  },
  {
    adrId: 'v11-1-modularization-report',
    slug: 'v11-1-modularization-report',
    sourcePath: 'V11.1_MODULARIZATION_REPORT.md',
    sourceFilename: 'V11.1_MODULARIZATION_REPORT.md',
    versionTag: 'V11.1-M',
    sequenceOrder: 9,
    title: 'V11.1 Modularization & Architecture Hardening Report',
    summary:
      'Dekomposisi 9 monolit JavaScript menjadi 49 modul fitur dan 2 monolit CSS menjadi 22 modul dengan kontrak kepemilikan lifecycle tunggal.',
    category: 'modularization-and-lifecycle',
    recordType: 'implementation',
    recordStatus: 'active-contract',
    targetRoutes: ['/', '/about', '/work', '/archive', '/connect'],
    relatedWorkIds: [],
    keyMetrics: [
      { label: 'Feature JS Modules', value: '49', unit: 'modules', evidenceSection: '§A Executive summary' },
      { label: 'Modular CSS Files', value: '22', unit: 'files', evidenceSection: '§A Executive summary' },
      { label: 'Computed-Style Parity', value: '62/62', unit: 'matches', evidenceSection: '§A Executive summary' },
    ],
  },
  {
    adrId: 'v12-0-implementation-report',
    slug: 'v12-0-implementation-report',
    sourcePath: 'V12.0_IMPLEMENTATION_REPORT.md',
    sourceFilename: 'V12.0_IMPLEMENTATION_REPORT.md',
    versionTag: 'V12.0',
    sequenceOrder: 10,
    title: 'V12.0 Implementation Report: The Data Lab / AQI Explorer',
    summary:
      'Pembangunan Multi-Region AQI/ISPU Explorer pada /lab dan /lab/methodology berbasis dataset DLH Kota Cirebon 2021-2025 dan rumus interpolasi P.14/2020.',
    category: 'data-pipeline-and-provenance',
    recordType: 'implementation',
    recordStatus: 'implemented-reported',
    publishedAt: '2026-11-01',
    targetRoutes: ['/lab', '/lab/methodology'],
    relatedWorkIds: ['aqi-cirebon'],
    keyMetrics: [
      { label: 'Aggregated AQI Records', value: '100', unit: 'records', evidenceSection: '§A Executive Summary' },
      { label: 'Raw Source CSV Rows', value: '200', unit: 'rows', evidenceSection: '§A Executive Summary' },
      { label: 'Unit & Integration Tests', value: '50/50', unit: 'tests', evidenceSection: '§A Executive Summary' },
    ],
  },
  {
    adrId: 'v12-0-audit-closure-report',
    slug: 'v12-0-audit-closure-report',
    sourcePath: 'V12.0_AUDIT_CLOSURE_REPORT.md',
    sourceFilename: 'V12.0_AUDIT_CLOSURE_REPORT.md',
    versionTag: 'V12.1',
    sequenceOrder: 11,
    title: 'V12.0 Audit Closure Report (Eksekusi V12.1)',
    summary:
      'Penutupan audit V12.1 mencakup penguncian periode referensi tabel 24 jam (B7), koreksi contoh aritmetika SO2 83.9 (B1), normalisasi path relatif audit (B3), dan pemisahan tiga konsep waktu (B6).',
    category: 'data-pipeline-and-provenance',
    recordType: 'audit',
    recordStatus: 'active-contract',
    publishedAt: '2026-11-01',
    targetRoutes: ['/lab', '/lab/methodology'],
    relatedWorkIds: ['aqi-cirebon'],
    keyMetrics: [
      { label: 'Lab Core Regression Tests', value: '54/54', unit: 'tests', evidenceSection: '§1 Executive Summary' },
      { label: 'SO2 83.9 Sub-Index', value: '63.2117', unit: 'ISPU', evidenceSection: '§3 B1 Formula/contoh metodologi' },
    ],
  },
  {
    adrId: 'v12-2-implementation-report',
    slug: 'v12-2-implementation-report',
    sourcePath: 'V12.2_IMPLEMENTATION_REPORT.md',
    sourceFilename: 'V12.2_IMPLEMENTATION_REPORT.md',
    versionTag: 'V12.2',
    sequenceOrder: 12,
    title: 'V12.2 Implementation Report: Structured Content, Taxonomy & Relations',
    summary:
      'Transformasi koleksi work dengan contentId stabil, taxonomy kanonis tunggal, validator integritas lintas-entri pada jalur build, dan investigasi scroll Chart.js V12.2a.',
    category: 'content-and-schema-systems',
    recordType: 'implementation',
    recordStatus: 'active-contract',
    targetRoutes: ['/work', '/work/aqi-cirebon', '/lab'],
    relatedWorkIds: ['aqi-cirebon'],
    keyMetrics: [
      { label: 'Content Integrity Tests', value: '23/23', unit: 'tests', evidenceSection: '§8 Hasil pengujian' },
      { label: 'Lab Core Tests', value: '54/54', unit: 'tests', evidenceSection: '§8 Hasil pengujian' },
    ],
  },
  {
    adrId: 'v12-3-implementation-report',
    slug: 'v12-3-implementation-report',
    sourcePath: 'V12.3_IMPLEMENTATION_REPORT.md',
    sourceFilename: 'V12.3_IMPLEMENTATION_REPORT.md',
    versionTag: 'V12.3',
    sequenceOrder: 13,
    title: 'V12.3 Implementation Report: CSV Explorer & Shared Primitives',
    summary:
      'Ekstraksi primitif statistik bersama ke lab/shared/stats.js dan pembangunan CSV Explorer berbasis FSM parser RFC 4180 serta Web Worker pada rute /lab/csv.',
    category: 'data-pipeline-and-provenance',
    recordType: 'implementation',
    recordStatus: 'active-contract',
    targetRoutes: ['/lab', '/lab/csv'],
    relatedWorkIds: ['aqi-cirebon'],
    keyMetrics: [
      { label: 'CSV Explorer Unit Tests', value: '60/60', unit: 'tests', evidenceSection: '§8 Pengujian' },
      { label: 'Max CSV File Limit', value: '10', unit: 'MiB', evidenceSection: '§6 CSV Analysis Engine' },
      { label: 'Max Chart Sample Points', value: '5000', unit: 'points', evidenceSection: '§6 CSV Analysis Engine' },
    ],
  },
] as const;

/**
 * Daftar kandidat file .md/.txt non-ADR yang dikecualikan secara eksplisit beserta alasannya.
 */
export const ADR_EXCLUDED_CANDIDATES: readonly AdrExcludedCandidate[] = [
  {
    sourcePath: 'README.md',
    sourceFilename: 'README.md',
    candidate: false,
    exclusionReason: 'Dokumentasi repositori umum dan panduan pemeliharaan situs, bukan laporan rekayasa versi tertentu.',
  },
  {
    sourcePath: 'AGENTS.md',
    sourceFilename: 'AGENTS.md',
    candidate: false,
    exclusionReason: 'Instruksi operasional dev server dan tautan dokumentasi Astro untuk agent lokal.',
  },
  {
    sourcePath: 'VERIFICATION.md',
    sourceFilename: 'VERIFICATION.md',
    candidate: false,
    exclusionReason: 'Catatan verifikasi kerja internal V10.4 yang substansi dan kesimpulannya telah dikonsolidasikan di V10.4_DIAGNOSTIC_REPORT.md.',
  },
  {
    sourcePath: 'public/assets/credentials/README.txt',
    sourceFilename: 'README.txt',
    candidate: false,
    exclusionReason: 'Petunjuk penempatan aset gambar sertifikat di direktori publik.',
  },
  {
    sourcePath: 'v11.1-research/summary.md',
    sourceFilename: 'summary.md',
    candidate: false,
    exclusionReason: 'Ringkasan kerja internal yang telah dikonsolidasikan ke dalam V11.1_IMPLEMENTATION_REPORT.md.',
  },
  {
    sourcePath: 'v11.1-research/modularization/baseline-sha256.txt',
    sourceFilename: 'baseline-sha256.txt',
    candidate: false,
    exclusionReason: 'Artefak checksum pendukung internal untuk laporan modularisasi V11.1-M.',
  },
  {
    sourcePath: 'v12-audit-work/logs/phase0-findings.md',
    sourceFilename: 'phase0-findings.md',
    candidate: false,
    exclusionReason: 'Log kerja preflight internal yang telah dirangkum penuh dalam V12.0_AUDIT_CLOSURE_REPORT.md.',
  },
  {
    sourcePath: 'v12-audit-work/logs/preflight-snapshot-sha256.txt',
    sourceFilename: 'preflight-snapshot-sha256.txt',
    candidate: false,
    exclusionReason: 'Daftar hash snapshot kerja internal V12.1.',
  },
  {
    sourcePath: 'v12-audit-work/preflight-snapshots/V12.0_IMPLEMENTATION_REPORT.md',
    sourceFilename: 'V12.0_IMPLEMENTATION_REPORT.md',
    candidate: false,
    exclusionReason: 'Salinan cadangan pra-patch V12.1; dokumen kanonisnya sudah terindeks dari root V12.0_IMPLEMENTATION_REPORT.md.',
  },
  {
    sourcePath: 'v12-audit-work/verification/em-dash-before.txt',
    sourceFilename: 'em-dash-before.txt',
    candidate: false,
    exclusionReason: 'Log hasil pemindaian karakter sebelum patch V12.1.',
  },
  {
    sourcePath: 'v12-audit-work/verification/em-dash-after.txt',
    sourceFilename: 'em-dash-after.txt',
    candidate: false,
    exclusionReason: 'Log hasil pemindaian karakter sesudah patch V12.1.',
  },
  {
    sourcePath: 'v12-research/P14-2020-jina.txt',
    sourceFilename: 'P14-2020-jina.txt',
    candidate: false,
    exclusionReason: 'Respons error HTTP 401 saat percobaan pengambilan dokumen eksternal, bukan artefak rekayasa.',
  },
] as const;
