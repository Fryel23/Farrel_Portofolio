/*!
 * src/types/lab-csv.ts - Kontrak tipe domain CSV Explorer, Parser, Analysis & Worker (V13.0-B).
 *
 * File type-only: tidak menghasilkan kode runtime. Seluruh state, batas
 * resource, dan discriminated union mengikuti implementasi aktual di:
 *   - src/scripts/lab/shared/csv-parser.js
 *   - src/scripts/lab/shared/csv-analysis.js
 *   - src/scripts/lab/workers/csv-worker.js
 */

/** State aktual finite-state machine pada iterateCsvRecords() di csv-parser.js. */
export type CsvParserState = 'field-start' | 'quoted' | 'after-quote' | 'unquoted';

/** Kode error sintaks CSV pada CsvParseError. */
export type CsvParseErrorCode =
  | 'CSV_UNCLOSED_QUOTE'
  | 'CSV_ILLEGAL_QUOTE'
  | 'CSV_TRAILING_CHARS';

/** Kode error analisis dan batas resource pada CsvAnalysisError. */
export type CsvAnalysisErrorCode =
  | 'CSV_EMPTY'
  | 'CSV_NO_DATA'
  | 'CSV_LIMIT_COLUMNS'
  | 'CSV_LIMIT_RECORDS'
  | 'CSV_LIMIT_CELLS'
  | 'CSV_RECORD_TOO_LONG'
  | 'CSV_COLUMN_UNKNOWN'
  | 'CSV_Y_NOT_NUMERIC'
  | 'CSV_X_NOT_SUPPORTED';

/** Kode error tambahan pada lapisan Web Worker (csv-worker.js). */
export type CsvWorkerErrorCode =
  | CsvParseErrorCode
  | CsvAnalysisErrorCode
  | 'CSV_ENCODING'
  | 'CSV_NO_ACTIVE_FILE'
  | 'CSV_MALFORMED_REQUEST'
  | 'CSV_FILE_UNREADABLE'
  | 'CSV_LIMIT_FILE_SIZE'
  | 'CSV_EMPTY_FILE'
  | 'CSV_UNKNOWN_REQUEST'
  | 'ANALYSIS_FAILED';

/** Klasifikasi tipe kolom konservatif pada csv-analysis.js. */
export type CsvColumnType = 'numeric' | 'date' | 'categorical';

/** Kontrak batas resource terpusat (LIMITS). */
export interface CsvResourceLimits {
  readonly MAX_FILE_BYTES: 10485760;
  readonly MAX_COLUMNS: 100;
  readonly MAX_RECORDS: 100000;
  readonly MAX_CELLS: 500000;
  readonly MAX_CHART_POINTS: 5000;
  readonly MAX_PREVIEW_ROWS: 5;
}

/** Konteks posisi baris dan kolom (1-based) pada CsvParseError. */
export interface CsvErrorPositionContext {
  readonly recordIndex?: number | null;
  readonly columnIndex?: number | null;
}

/** Hasil uji nilai numerik tunggal pada parseNumericValue(). */
export type NumericParseOutcome =
  | { readonly status: 'missing' }
  | { readonly status: 'non-numeric' }
  | { readonly status: 'numeric'; readonly value: number };

/** Metadata satu kolom hasil ekstraksi header dan klasifikasi tipe. */
export interface CsvColumnMetadata {
  readonly id: string;
  readonly index: number;
  readonly name: string | null;
  readonly displayName: string;
  type: CsvColumnType;
  validCount: number;
  missingCount: number;
}

/** Statistik deskriptif penuh untuk satu kolom numerik. */
export interface CsvColumnDescriptiveStats {
  readonly mean: number | null;
  readonly median: number | null;
  readonly min: number | null;
  readonly max: number | null;
  readonly validCount: number;
  readonly missingCount: number;
}

/** Metadata file input pada buildAnalysisPayload(). */
export interface CsvFileMetadataInput {
  readonly name?: string | null;
  readonly sizeBytes?: number | null;
}

/** Payload hasil buildAnalysisPayload() (tanpa data mentah penuh). */
export interface CsvAnalysisPayload {
  readonly file: {
    readonly name: string | null;
    readonly sizeBytes: number | null;
  };
  readonly columnCount: number;
  readonly rowCount: number;
  readonly columns: CsvColumnMetadata[];
  readonly preview: {
    readonly requestedRows: number;
    readonly rows: string[][];
  };
  readonly stats: Record<string, CsvColumnDescriptiveStats>;
  readonly warnings: {
    readonly normalizedRecordCount: number;
    readonly blankLinesSkipped: number;
    readonly hasWarnings: boolean;
  };
}

/** Hasil pemilihan indeks deterministik pada sampleChartIndices(). */
export interface CsvChartSampleResult {
  readonly indices: number[];
  readonly sampled: boolean;
}

/** Parameter pemilihan kolom sumbu X dan Y untuk chart. */
export interface CsvChartSelection {
  readonly xColumnId: string;
  readonly yColumnId: string;
}

/** Payload hasil buildChartPayload(). */
export interface CsvChartPayload {
  readonly xColumnId: string;
  readonly yColumnId: string;
  readonly xType: 'date' | 'categorical';
  readonly labels: string[];
  readonly values: Array<number | null>;
  readonly totalRecords: number;
  readonly pointsSent: number;
  readonly sampled: boolean;
  readonly sampleStride: number | null;
}

/** Payload error aman tanpa isi CSV dari toSafeErrorPayload(). */
export interface CsvSafeErrorPayload {
  readonly code: CsvWorkerErrorCode | string;
  readonly message: string;
}

/** Discriminated union pesan request dari Main Thread ke CSV Web Worker. */
export type CsvWorkerRequest =
  | {
      readonly type: 'ANALYZE_FILE';
      readonly requestId: string;
      readonly file: File;
    }
  | {
      readonly type: 'GET_CHART_DATA';
      readonly requestId: string;
      readonly xColumnId: string;
      readonly yColumnId: string;
    };

/** Discriminated union pesan response dari CSV Web Worker ke Main Thread. */
export type CsvWorkerResponse =
  | {
      readonly type: 'ANALYSIS_SUCCESS';
      readonly requestId: string;
      readonly payload: CsvAnalysisPayload;
    }
  | {
      readonly type: 'CHART_SUCCESS';
      readonly requestId: string;
      readonly payload: CsvChartPayload;
    }
  | {
      readonly type: 'WORKER_ERROR';
      readonly requestId: string | null;
      readonly code: CsvWorkerErrorCode | string;
      readonly message: string;
    };
