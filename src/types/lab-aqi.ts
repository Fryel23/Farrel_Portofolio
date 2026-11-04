/*!
 * src/types/lab-aqi.ts - Kontrak tipe domain AQI / ISPU PermenLHK P.14/2020 (V13.0-B).
 *
 * File type-only: tidak menghasilkan kode runtime saat dieksekusi Node v24
 * maupun saat dibundle oleh Vite/Astro. Seluruh union dan struktur dicocokkan
 * langsung terhadap implementasi aktual di:
 *   - src/scripts/lab/core/aqi-calculator.js
 *   - src/scripts/lab/core/validate-dataset.js
 *   - public/data/aqi/regions.json & cirebon-2021..2025.json
 */

/** Parameter polutan yang tabel breakpoint P.14/2020-nya telah terverifikasi di kalkulator aktif. */
export type SupportedPollutant = 'so2' | 'no2' | 'pm25';

/** Parameter regulasi P.14/2020 lain yang sengaja belum diimplementasikan (anti-fabrication). */
export type UnimplementedPollutant = 'pm10' | 'o3' | 'co' | 'hc';

/** Periode referensi tabel konversi ISPU P.14/2020 pada kalkulator aplikasi. */
export type TableReferencePeriod = '24h';

/** Metode regulasi tunggal yang didukung kalkulator. */
export type IspuMethod = 'P14-2020';

/** Status hasil perhitungan sub-indeks pada calculateSubIndex(). */
export type IspuStatus =
  | 'valid'
  | 'insufficient-data'
  | 'unsupported-parameter'
  | 'unsupported-averaging-period'
  | 'unsupported-method'
  | 'invalid-input'
  | 'out-of-range'
  | 'missing';

/** Status pemetaan nilai indeks ke kategori ISPU pada getISPUCategory(). */
export type IspuCategoryStatus = 'valid' | 'missing' | 'invalid' | 'beyond-scale';

/** Token CSS kategori ISPU. */
export type IspuCategoryToken =
  | 'baik'
  | 'sedang'
  | 'tidak-sehat'
  | 'sangat-tidak-sehat'
  | 'berbahaya';

/** Label tampilan kategori ISPU sesuai PermenLHK P.14/2020. */
export type IspuCategoryLabel =
  | 'Baik'
  | 'Sedang'
  | 'Tidak Sehat'
  | 'Sangat Tidak Sehat'
  | 'Berbahaya';

/** Satu pita interval pada tabel breakpoint polutan. */
export interface BreakpointInterval {
  readonly low: number;
  readonly high: number;
  readonly iLow: number;
  readonly iHigh: number;
}

/** Tabel breakpoint untuk satu polutan terverifikasi. */
export interface PollutantBreakpointTable {
  readonly label: string;
  readonly unit: string;
  readonly averagingPeriod: TableReferencePeriod;
  readonly intervals: readonly BreakpointInterval[];
}

/** Struktur konstanta P14_2020 pada aqi-calculator.js. */
export interface P14_2020Contract {
  readonly method: IspuMethod;
  readonly formula: string;
  readonly regulation: string;
  readonly tables: Readonly<Record<SupportedPollutant, PollutantBreakpointTable>>;
}

/** Definisi statis kategori ISPU pada ISPU_CATEGORIES. */
export interface IspuCategoryDefinition {
  readonly token: IspuCategoryToken;
  readonly label: IspuCategoryLabel;
  readonly max: number;
  readonly range: string;
  readonly color: string;
  readonly description: string;
}

/** Hasil pemetaan getISPUCategory(indexValue). */
export type IspuCategoryResult =
  | {
      readonly status: 'valid' | 'beyond-scale';
      readonly token: IspuCategoryToken;
      readonly label: IspuCategoryLabel;
      readonly range: string;
      readonly color: string;
      readonly description: string;
    }
  | {
      readonly status: 'missing' | 'invalid';
      readonly token: null;
      readonly label: null;
      readonly range: null;
      readonly color: null;
      readonly description: null;
    };

/** Input untuk calculateSubIndex(). */
export interface CalculateSubIndexInput {
  readonly parameter?: SupportedPollutant | string;
  readonly concentration?: number | null;
  readonly unit?: string | null;
  readonly averagingPeriod?: TableReferencePeriod | string | null;
  readonly validPercent?: number | null;
  readonly method?: IspuMethod | string;
  readonly allowBasisMismatch?: boolean;
}

/** Output dari calculateSubIndex(). */
export interface SubIndexCalculationResult {
  readonly status: IspuStatus;
  readonly value: number | null;
  readonly valueRounded: number | null;
  readonly category: IspuCategoryResult | null;
  readonly basisMatched: boolean;
  readonly detail: string;
}

/** Ringkasan sub-indeks tersimpan pada record dataset tahunan. */
export interface StoredSubIndexEntry {
  readonly status: IspuStatus | string;
  readonly value: number | null;
}

/** Output dari getISPUFromSubIndices(). */
export interface AggregateIspuResult {
  readonly status: 'valid' | 'missing' | 'invalid';
  readonly value: number | null;
  readonly dominantParameter: string | null;
  readonly availableParameters: string[];
  readonly category: IspuCategoryResult;
}

/** Output dari getDominantParameterSummary(). */
export interface DominantParameterSummaryResult {
  readonly status: 'valid' | 'no-data';
  readonly counts: Record<string, number>;
  readonly leader: string | null;
  readonly sampleSize: number;
}

/** Definisi parameter pada blok metadata dataset. */
export interface DatasetParameterDefinition {
  readonly unit: string;
  readonly averagingPeriod: string;
  readonly aggregation: string;
  readonly measurementMethod: string | null;
}

/** Blok metadata dataset tahunan (datasetObj.dataset). */
export interface AqiDatasetMetadata {
  readonly title: string;
  readonly sourceId: string;
  readonly sourceUrl: string | null;
  readonly sourceNote?: string;
  readonly accessedAt: string | null;
  readonly license?: string;
  readonly station?: {
    readonly id: string | null;
    readonly name: string | null;
    readonly latitude: number | null;
    readonly longitude: number | null;
    readonly classification?: string;
  };
  readonly measurement?: {
    readonly method: string | null;
    readonly qualityControl: string | null;
    readonly timezone: string;
    readonly frequency: string;
  };
  readonly parameterDefinitions: Readonly<Record<string, DatasetParameterDefinition>>;
  readonly limitations: readonly string[];
}

/** Satu record observasi pada dataset tahunan AQI. */
export interface AqiRecord {
  readonly id: string;
  readonly date: string | null;
  readonly period: {
    readonly year: number;
    readonly stage: string;
  };
  readonly locationId?: string;
  readonly location: string;
  readonly values: Readonly<Record<string, number | null>>;
  readonly quality?: Readonly<
    Record<
      string,
      {
        readonly status: string;
        readonly sourceRowId?: string | null;
      }
    >
  >;
  readonly duplicates?: Readonly<Record<string, unknown>>;
  readonly derived?: {
    readonly method?: string;
    readonly subIndex?: Readonly<Record<string, StoredSubIndexEntry>>;
    readonly ispuStatus?: string;
    readonly ispu: number | null;
    readonly dominantParameter?: string | null;
    readonly availableParameters?: readonly string[];
    readonly category?: IspuCategoryLabel | string | null;
  };
  readonly reportedIndices?: {
    readonly ispu: number | null;
    readonly note?: string;
  } | null;
}

/** Struktur file JSON dataset tahunan (mis. cirebon-2024.json). */
export interface AqiAnnualDataset {
  readonly schemaVersion: 1;
  readonly regionId: string;
  readonly year: number;
  readonly dataset: AqiDatasetMetadata;
  readonly records: readonly AqiRecord[];
}

/** Kode issue deterministik yang dihasilkan oleh validateDataset(). */
export type AqiValidationIssueCode =
  | 'ROOT_NOT_OBJECT'
  | 'SCHEMA_VERSION'
  | 'REGION_ID'
  | 'YEAR'
  | 'META_MISSING'
  | 'TITLE'
  | 'SOURCE_ID'
  | 'SOURCE_UNKNOWN'
  | 'SOURCE_URL'
  | 'ACCESSED_AT'
  | 'PARAM_DEFS'
  | 'LIMITATIONS'
  | 'RECORDS_EMPTY'
  | 'RECORD_NOT_OBJECT'
  | 'RECORD_ID'
  | 'RECORD_DUPLICATE'
  | 'RECORD_PERIOD'
  | 'RECORD_YEAR_MISMATCH'
  | 'RECORD_STAGE'
  | 'RECORD_DATE'
  | 'RECORD_LOCATION'
  | 'RECORD_VALUES'
  | 'PARAM_UNKNOWN'
  | 'VALUE_NOT_NUMBER'
  | 'VALUE_NEGATIVE'
  | 'RECORD_QUALITY'
  | 'QUALITY_STATUS'
  | 'RECORD_DERIVED'
  | 'ISPU_RANGE'
  | 'ISPU_CATEGORY'
  | 'ISPU_STATUS'
  | 'REPORTED_INDICES';

/** Satu entri issue dari validateDataset(). */
export interface AqiValidationIssue {
  readonly severity: 'error' | 'warning';
  readonly code: AqiValidationIssueCode;
  readonly message: string;
  readonly path: string;
}

/** Hasil akhir validateDataset(). */
export interface AqiValidationResult {
  readonly ok: boolean;
  readonly issues: AqiValidationIssue[];
}

/** Entri lokasi pada manifest regions.json. */
export interface AqiLocationEntry {
  readonly id: string;
  readonly name: string;
}

/** Entri cakupan tahunan pada manifest regions.json. */
export interface AqiRegionYearEntry {
  readonly year: number;
  readonly status: 'available' | 'partial' | 'unavailable';
  readonly dataPath: string;
  readonly coverageStart: string;
  readonly coverageEnd: string;
  readonly parameters: readonly SupportedPollutant[];
  readonly recordCount: number;
  readonly locationCount: number;
  readonly stages: readonly string[];
  readonly missing: Readonly<Record<string, number>>;
  readonly coverageNote?: string;
}

/** Entri region pada manifest regions.json. */
export interface AqiRegionEntry {
  readonly id: string;
  readonly name: string;
  readonly province: string;
  readonly country: string;
  readonly timezone: string;
  readonly coordinates: { readonly latitude: number; readonly longitude: number } | null;
  readonly status: 'available' | 'unavailable';
  readonly sourceIds: readonly string[];
  readonly locations: readonly AqiLocationEntry[];
  readonly years: readonly AqiRegionYearEntry[];
}

/** Entri sumber data pada manifest regions.json. */
export interface AqiSourceProvenance {
  readonly id: string;
  readonly name: string;
  readonly publisher: string;
  readonly url: string | null;
  readonly urlNote?: string;
  readonly contact?: string;
  readonly accessedAt: string;
  readonly license: string;
  readonly providedVia?: string;
  readonly sourceSha256: string;
  readonly ispuMethod: string;
}

/** Struktur root public/data/aqi/regions.json. */
export interface AqiRegionManifest {
  readonly schemaVersion: 1;
  readonly datasetVersion: string;
  readonly updatedAt: string;
  readonly defaultRegionId: string;
  readonly regions: readonly AqiRegionEntry[];
  readonly sources: readonly AqiSourceProvenance[];
}
