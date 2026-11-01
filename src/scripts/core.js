/*!
 * core.js: PUBLIC FACADE / BARREL (modularized V11.1-M).
 *
 * Single responsibility: menjaga path import publik `core.js` dan
 * SELURUH named exports kompatibel (spek V11.1-M §16.1, §16.4) sambil
 * implementasi hidup di core/ (environment, dom, motion-config,
 * motion-registry, scroll-runtime, audio-runtime, magnetic-buttons,
 * page-lifecycle). Facade HANYA melakukan re-export — tidak ada logika
 * di sini, dan internal modules TIDAK mengimpor facade ini (M02: tidak
 * ada circular dependency; arah internal langsung antar modul sumber).
 *
 * Live bindings (reducedMotion, finePointer, hasGSAP, hasScrollTrigger,
 * hasLenis, lenis, pluginsRegistered) tetap ESM live bindings melalui
 * re-export — nilai terbaru selalu terbaca oleh consumer.
 */
export { DATA } from '../data/content.js';

export {
  doc, el, qs, qsa, setText, showToast, fetchWithTimeout,
  buildHeading, buildTwoLineCardHeading, safeImage, SVG_NS,
} from './core/dom.js';

export {
  reducedMotion, finePointer, hasGSAP, hasScrollTrigger, hasLenis,
  initEnv, isReducedMotion,
} from './core/environment.js';

export { MOTION } from './core/motion-config.js';

export {
  motionRegistry, trackMotionListener, trackObserver, trackEventTween,
  trackAmbientTween, trackQuickTo, trackRafLoop, trackWebGLContext,
  cleanupMotionRegistry,
} from './core/motion-registry.js';

export { lenis, setLenis, lenisTicker, scrollToTarget } from './core/scroll-runtime.js';

export {
  isAudioMuted, setAudioMuted, playClickSound, playHoverSound,
} from './core/audio-runtime.js';

export { initMagneticButtons } from './core/magnetic-buttons.js';

export {
  REDUCED_REVEAL_SELECTOR, forceContentVisible, pluginsRegistered, bootPage,
} from './core/page-lifecycle.js';
