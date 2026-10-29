/*!
 * case-narrative.js (V10.0 FASE 3): scrub timeline untuk 3 scene
 * naratif (Masalah -> Proses -> Temuan) di halaman case study.
 *
 * Desain lifecycle:
 * - Dipanggil lewat bootPage halaman [slug].astro (array `motion`),
 *   sehingga hanya hidup pada konteks (prefers-reduced-motion:
 *   no-preference) dan ikut dibersihkan saat navigasi (after-swap).
 * - PINNED STAGE: .narrative-stage sudah position:sticky lewat CSS.
 *   ScrollTrigger TIDAK memakai pin di sini - menumpuk pin GSAP di
 *   atas elemen sticky membuat dua mekanisme pinning saling tarik
 *   (lompatan scroll). ScrollTrigger hanya memetakan progres scroll
 *   (top top -> bottom bottom, scrub 1) ke timeline; sticky CSS yang
 *   mengunci layar.
 * - Selector di-scope ke #case-narrative agar tidak pernah menabrak
 *   elemen lain (bebas warning "GSAP target not found").
 * - Scene 1 (index 0) diberi gsap.set terlihat: CSS sudah menjadikan
 *   scene 0 terlihat sebagai fallback, set() menegaskan ulang state
 *   awal sebelum timeline dibuat.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { qs, motionRegistry, isReducedMotion } from './core.js';

/* V10.0 AUDIT FIXES FASE 1 (H1+H2): matchMedia context module-level.
   initCaseNarrative sebelumnya membuat gsap.matchMedia() lokal yang
   tidak terdaftar di motionContexts core.js, sehingga cleanup function
   (tl.kill + scrollTrigger.kill) tidak pernah dipanggil saat
   teardownPageMotion - timeline bocor tiap navigasi ke /work/[slug].
   activeMM di-revert di dua titik: awal init (idempotensi) dan
   astro:after-swap (navigasi). revert() memicu cleanup callback
   mm.add(...) sehingga timeline ter-dispose penuh. */
let activeMM = null;

export function initCaseNarrative() {
  const section = qs('#case-narrative');
  if (!section || isReducedMotion()) return;

  /* H1+H2: revert konteks lama bila fungsi terpanggil dua kali dalam
     satu sesi sebelum navigasi. */
  if (activeMM) {
    activeMM.revert();
    activeMM = null;
  }

  activeMM = gsap.matchMedia();
  activeMM.add('(min-width: 701px) and (prefers-reduced-motion: no-preference)', () => {
    /* Scope selector ke dalam section. */
    const sceneSel = (i) => `#case-narrative [data-scene="${i}"]`;

    /* Titik awal deterministik: scene 0 terlihat, scene lain tersembunyi
       (state CSS sudah begitu; set() menjamin state inline yang sama
       setelah revert konteks sebelumnya). */
    gsap.set(sceneSel(0), { opacity: 1, y: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        /* Sengaja tanpa pin: sticky CSS pada .narrative-stage yang
           mengunci panggung (lihat header file). */
      },
    });

    // Scene 0 -> 1
    tl.to(sceneSel(0), { opacity: 0, y: -40, duration: 1 }, 0)
      .fromTo(sceneSel(1), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, 0.5)
      .to(sceneSel(1), { opacity: 0, y: -40, duration: 1 }, 1.5)
      .fromTo(sceneSel(2), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, 2);

    // Daftarkan trigger ke registry (jaring pengaman cleanup).
    if (tl.scrollTrigger) {
      motionRegistry.scrollTriggers.add(tl.scrollTrigger);
    }

    return () => {
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
      tl.kill();
    };
  });
}

/* H1+H2: navigasi = konteks matchMedia halaman lama wajib revert agar
   cleanup (tl.kill + tl.scrollTrigger.kill) benar-benar berjalan.
   Order aman: handler core.js (cleanupMotionRegistry) jalan duluan,
   scrollTrigger.kill() di sini idempotent (no-op). */
document.addEventListener('astro:after-swap', () => {
  if (activeMM) {
    activeMM.revert();
    activeMM = null;
  }
});
