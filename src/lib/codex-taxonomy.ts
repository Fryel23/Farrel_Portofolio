/*!
 * src/lib/codex-taxonomy.ts - Taksonomi Desimal 100-600 & Kontrak Skema The Grand Codex (V13.0-C).
 *
 * Klasifikasi 100-600 adalah sistem desimal khusus proyek yang terinspirasi
 * oleh prinsip pengindeksan desimal teknis (Area Ratusan / Nomor Topik.Catatan),
 * tanpa mengklaim kepatuhan formal terhadap standar Johnny.Decimal eksternal.
 */

export const CODEX_DOMAINS = [
  {
    code: '100',
    id: '100-software-and-systems',
    label: 'Software & Systems Architecture',
    focus: 'Lifecycle kepemilikan tunggal, registri resource, dan arsitektur frontend modular.',
  },
  {
    code: '200',
    id: '200-data-and-computation',
    label: 'Data Engineering & Computation',
    focus: 'Finite-state CSV parser, isolasi Web Worker, statistik deskriptif, dan validasi skema.',
  },
  {
    code: '300',
    id: '300-quant-and-markets',
    label: 'Quantitative & Market Analysis',
    focus: 'Struktur data pasar ekuitas, metode observasi deret waktu, dan batas metodologis.',
  },
  {
    code: '400',
    id: '400-graphics-and-rendering',
    label: 'Computer Graphics & Rendering',
    focus: 'OGL WebGL shader, geometri lathe profil tertutup, pencahayaan Fresnel view-space, dan SVG fallback.',
  },
  {
    code: '500',
    id: '500-environment-and-regulations',
    label: 'Environmental Science & Regulation',
    focus: 'Interpolasi linier ISPU PermenLHK P.14/2020, basis waktu tabel vs observasi, dan provenance data.',
  },
  {
    code: '600',
    id: '600-editorial-and-design',
    label: 'Editorial Systems & Visual Design',
    focus: 'Hirarki tipografi tiga keluarga font, arsitektur Curtain non-modal, dan aksesibilitas progresif.',
  },
] as const;

export type CodexDomainId = (typeof CODEX_DOMAINS)[number]['id'];
export type CodexDomainCode = (typeof CODEX_DOMAINS)[number]['code'];

export const CODEX_DOMAIN_IDS: ReadonlySet<string> = new Set(
  CODEX_DOMAINS.map((d) => d.id)
);

export const CODEX_DOMAIN_BY_ID: ReadonlyMap<
  string,
  (typeof CODEX_DOMAINS)[number]
> = new Map(CODEX_DOMAINS.map((d) => [d.id, d]));

export const CODEX_MATURITY_LEVELS = [
  'SEEDLING',
  'BUDDING',
  'EVERGREEN',
] as const;

export type CodexMaturity = (typeof CODEX_MATURITY_LEVELS)[number];

export const CODEX_MATURITY_IDS: ReadonlySet<string> = new Set(
  CODEX_MATURITY_LEVELS
);

export const CODEX_MATURITY_DESCRIPTIONS: Readonly<Record<CodexMaturity, string>> = {
  SEEDLING:
    'Catatan awal dengan bukti sumber terbatas atau merujuk pada modul yang masih berstatus rencana (RESERVED).',
  BUDDING:
    'Mekanisme teknis, trade-off desain, keterbatasan operasional, dan bukti implementasi telah dijelaskan secara terstruktur.',
  EVERGREEN:
    'Catatan referensi stabil dan komprehensif yang telah diverifikasi ulang terhadap implementasi dan suite pengujian aktif.',
};

export const CODEX_EVIDENCE_STATUSES = [
  'observed',
  'derived',
  'reported',
  'verified-current',
  'planned',
] as const;

export type CodexEvidenceStatus = (typeof CODEX_EVIDENCE_STATUSES)[number];

export const CODEX_EVIDENCE_STATUS_IDS: ReadonlySet<string> = new Set(
  CODEX_EVIDENCE_STATUSES
);

export const CODEX_MATHML_KINDS = [
  'ispu-linear-interpolation',
  'fresnel-view-space',
  'sample-stride',
  'none',
] as const;

export type CodexMathmlKind = (typeof CODEX_MATHML_KINDS)[number];

export interface CodexSourceEvidenceItem {
  readonly claim: string;
  readonly status: CodexEvidenceStatus;
  readonly file: string;
  readonly reference: string;
  readonly verifiedBy?: string;
}

export interface CodexFormulaVariable {
  readonly symbol: string;
  readonly meaning: string;
  readonly unit?: string;
}

export interface CodexFormulaItem {
  readonly id: string;
  readonly label: string;
  readonly sourceNotation: string;
  readonly plainExplanation: string;
  readonly mathmlKind: CodexMathmlKind;
  readonly variables?: readonly CodexFormulaVariable[];
}

const DECIMAL_CODE_REGEX = /^([1-6])\d{2}\.\d+$/;

/**
 * Memeriksa apakah decimalCode memiliki format valid (mis. 101.1, 501.1)
 * dan digit ratusan awalnya sesuai dengan domainId (mis. 100-software-and-systems -> '1').
 */
export function isValidDecimalCodeForDomain(
  decimalCode: string,
  domainId: string
): boolean {
  if (typeof decimalCode !== 'string' || typeof domainId !== 'string') {
    return false;
  }
  const match = DECIMAL_CODE_REGEX.exec(decimalCode.trim());
  if (!match) return false;
  const domain = CODEX_DOMAIN_BY_ID.get(domainId);
  if (!domain) return false;
  return domain.code.charAt(0) === match[1];
}

export const CODEX_MATURITY_CRITERIA = CODEX_MATURITY_DESCRIPTIONS;

export function getCodexDomainLabel(domainId: string): string | undefined {
  return CODEX_DOMAIN_BY_ID.get(domainId)?.label;
}

export function getCodexDomainInfo(domainId: string) {
  return CODEX_DOMAIN_BY_ID.get(domainId) || null;
}

export function getCodexDomainCode(domainId: string): string | undefined {
  return CODEX_DOMAIN_BY_ID.get(domainId)?.code;
}
