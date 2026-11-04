/*!
 * src/types/core-lifecycle.ts - Kontrak tipe siklus hidup halaman & motion registry (V13.0-B).
 *
 * File type-only: tidak menghasilkan kode runtime. Seluruh signature
 * diturunkan langsung dari implementasi aktual di:
 *   - src/scripts/core/page-lifecycle.js
 *   - src/scripts/core/motion-registry.js
 *   - src/scripts/core.js
 */

/** Fungsi tahap lifecycle halaman (render, interaction, motion). */
export type LifecycleTaskFn = () => void;

/** Fungsi pembersih / disposer idempoten (cleanup, stop rAF, dispose WebGL). */
export type DisposerFn = () => void;

/** Objek konfigurasi tahap yang dijalankan oleh bootPage(). */
export interface PageBootResolvedConfig {
  readonly renders?: readonly LifecycleTaskFn[];
  readonly interactions?: readonly LifecycleTaskFn[];
  readonly motion?: readonly LifecycleTaskFn[];
  readonly cleanups?: readonly DisposerFn[];
}

/** Resolver dinamis yang dievaluasi pada setiap astro:page-load bila disediakan. */
export type PageBootResolver = () => PageBootResolvedConfig | null | undefined;

/** Konfigurasi argumen utama bootPage() pada src/scripts/core/page-lifecycle.js. */
export interface PageBootConfig extends PageBootResolvedConfig {
  readonly resolve?: PageBootResolver | null;
}

/** Rekaman event listener yang dilacak oleh trackMotionListener(). */
export interface TrackedMotionListener {
  readonly target: EventTarget;
  readonly type: string;
  readonly handler: EventListenerOrEventListenerObject;
  readonly options?: boolean | AddEventListenerOptions;
}

/** Kontrak observer DOM (IntersectionObserver, ResizeObserver, MutationObserver) yang memiliki disconnect(). */
export interface DisconnectableObserver {
  disconnect(): void;
}

/** Kontrak primitif animasi GSAP / ScrollTrigger yang dapat dihentikan dengan kill(). */
export interface KillableMotionPrimitive {
  kill(): void;
  eventCallback?: (type: string, callback: (...args: unknown[]) => unknown) => unknown;
  vars?: {
    onComplete?: (...args: unknown[]) => unknown;
    [key: string]: unknown;
  };
}

/** Fungsi hasil gsap.quickTo() yang menyimpan referensi tween internal. */
export interface QuickToFunction {
  (value: number, start?: number, startIsRelative?: boolean): unknown;
  tween?: KillableMotionPrimitive;
}

/** Struktur state tunggal motionRegistry pada src/scripts/core/motion-registry.js. */
export interface MotionRegistryState {
  readonly observers: Set<DisconnectableObserver>;
  readonly timers: Set<number>;
  readonly intervals: Set<number>;
  motionListeners: TrackedMotionListener[];
  readonly eventTweens: Set<KillableMotionPrimitive>;
  readonly ambientTweens: Set<KillableMotionPrimitive>;
  readonly batchTriggers: Set<KillableMotionPrimitive>;
  readonly scrollTriggers: Set<KillableMotionPrimitive>;
  readonly tickerCallbacks: Set<LifecycleTaskFn>;
  readonly rafLoops: Set<DisposerFn>;
  readonly webgl: Set<DisposerFn>;
}
