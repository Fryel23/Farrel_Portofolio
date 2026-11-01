/*!
 * hero-webgl/index.js (V11.1 STAGE 5-12): Signature Hero WebGL controller.
 *
 * SATU owner untuk seluruh resource WebGL homepage (spek §16.1):
 * Renderer, context, scene, camera, vessel geometry/program, particle
 * geometry/program, monogram texture, RAF loop, ResizeObserver,
 * IntersectionObserver, pointer listeners, MQL listeners, context-loss
 * listener, idle callbacks, dan race-token dynamic import.
 *
 * Kontrak kunci:
 *  - WebGL adalah ENHANCEMENT, bukan dependency Hero (spek §0): fallback
 *    SVG hidup sejak initial HTML; canvas baru tampil setelah frame
 *    valid pertama berhasil dirender (`.is-webgl-ready`).
 *  - OGL HANYA dimuat via dynamic import SETELAH seluruh guard lolos
 *    (viewport >700px, no reduced-motion, elemen isConnected, halaman
 *    masih aktif, API WebGL tersedia) (spek §3.4-§3.6, §9.4).
 *  - Tidak ada OGL request pada mobile / reduced motion / route
 *    non-home (route lain: wrapper tidak ada -> no-op murni §17.4).
 *  - Race dynamic import (spek §16.5): hasil import yang resolve
 *    terlambat tidak pernah membuat context - token per-instance
 *    (`cancelled`) + state machine diperiksa ulang setelah setiap await.
 *  - Dispose pada `astro:before-swap` (DOM lama masih ada) lewat satu
 *    listener module-level; `cleanupMotionRegistry()` (core.js,
 *    astro:after-swap) tetap menjadi backstop. Semua stop/dispose
 *    idempoten (spek §16.2-§16.4).
 *  - Registry existing dipakai apa adanya: `trackRafLoop()` +
 *    `trackWebGLContext()` dari core.js (kapitalisasi resmi), TANPA
 *    membuat registry kedua (spek §1.5, §16.2). Reference registry
 *    dilepas saat dispose manual agar Set tidak menahan closure.
 *  - Context loss: fallback-only strategy - RAF berhenti, fallback
 *    tampil, tanpa retry tanpa batas, tanpa `preventDefault()` (spek
 *    §16.7). `WEBGL_lose_context.loseContext()` hanya pada dispose
 *    final keluar-homepage, tepat satu kali (spek §16.6).
 *  - Independen dari Curtain V11.0: tidak ada komunikasi, tidak ada
 *    penungguan, tidak ada perubahan Curtain (spek §1.4, §14.4).
 *
 * API OGL 1.0.11 diverifikasi langsung terhadap node_modules:
 * Renderer({canvas,alpha,...}) tanpa destroy(); Geometry.remove(),
 * Program.remove() tersedia; Texture tanpa remove(); Mesh mode
 * gl.POINTS; Program transparent => blendFunc(SRC_ALPHA,
 * ONE_MINUS_SRC_ALPHA) (premultipliedAlpha false).
 */
import {
  isReducedMotion,
  trackMotionListener,
  trackRafLoop,
  trackWebGLContext,
  motionRegistry,
} from '../core.js';

/* Breakpoint konsisten dengan CSS Hero (home.css max-width: 700px):
   WebGL hanya aktif LEBIH dari 700px (spek §3.4: min-width 701px). */
const DESKTOP_MQ = '(min-width: 701px)';
const REDUCED_MQ = '(prefers-reduced-motion: reduce)';
/* DPR dibatasi (spek §10.2, §22.5). */
const MAX_DPR = 1.5;
/* Path monogram same-origin (single source of truth dengan fallback
   SVG - spek §6.3, §12.1). */
const MONOGRAM_URL = '/assets/identity/f-monogram.svg';
/* Particle budget kecil & terukur (spek §13.3). */
const PARTICLE_COUNT = 48;

/* --------------------------------------------------------------------
 * Utilitas deterministic (spek §13.3: tanpa Math.random() per frame,
 * seed tetap agar stabil antar-run).
 * ------------------------------------------------------------------ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------------------------------------------------
 * GLASS VESSEL GEOMETRY (spek §10.5): custom lathe/profile geometry.
 * Profil tertutup (outer wall naik -> rim -> inner wall turun) di-
 * lathe 96 segmen radial. Position, normal, uv, dan index dibangun
 * eksplisit; normal dihitung dari tangent profil sehingga konsisten
 * (outward di dinding luar, inward di dinding dalam). TANPA
 * placeholder data (spek §22.4).
 *
 * Unit geometry: tinggi vessel ~2.18 world, radius maksimum ~1.2;
 * mesh di-scale 0.92 (uniform - aman untuk normalMatrix).
 * ------------------------------------------------------------------ */
const VESSEL_PROFILE = [
  [0.0, 0.0],      // pusat dasar luar
  [0.16, 0.0],
  [0.3, 0.006],
  [0.42, 0.038],   // dome bawah
  [0.49, 0.12],
  [0.52, 0.235],   // body maksimum
  [0.515, 0.38],
  [0.47, 0.52],    // transisi shoulder
  [0.36, 0.645],
  [0.235, 0.735],  // neck
  [0.185, 0.805],
  [0.19, 0.868],
  [0.24, 0.905],   // flare rim
  [0.252, 0.935],  // rim outer top
  [0.222, 0.948],  // tepi atas rim (inner)
  [0.172, 0.905],  // inner rim
  [0.152, 0.805],  // inner neck
  [0.196, 0.645],  // inner shoulder
  [0.256, 0.48],
  [0.262, 0.3],
  [0.205, 0.135],  // dasar interior
  [0.1, 0.1],
  [0.0, 0.092],    // pusat interior
];
const VESSEL_RADIAL = 96;
const VESSEL_SCALE = 2.3;
const VESSEL_Y_CENTER = 0.47;

function buildVesselGeometry(gl, Geometry) {
  const profile = VESSEL_PROFILE;
  const rows = profile.length;
  const cols = VESSEL_RADIAL;

  /* Panjang busur kumulatif profil untuk uv.y proporsional. */
  const arc = new Float32Array(rows);
  for (let i = 1; i < rows; i++) {
    const dr = profile[i][0] - profile[i - 1][0];
    const dy = profile[i][1] - profile[i - 1][1];
    arc[i] = arc[i - 1] + Math.sqrt(dr * dr + dy * dy);
  }
  const totalArc = arc[rows - 1] || 1;

  const count = rows * cols;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices = [];

  for (let i = 0; i < rows; i++) {
    const r = profile[i][0];
    const y = (profile[i][1] - VESSEL_Y_CENTER) * VESSEL_SCALE;
    const v = arc[i] / totalArc;

    /* Normal 2D dari tangent profil: (dy, -dr) mengarah keluar pada
       dinding luar (tangent ke atas) dan masuk pada dinding dalam
       (tangent ke bawah) - orientasi konsisten tanpa kasus khusus. */
    const iPrev = Math.max(0, i - 1);
    const iNext = Math.min(rows - 1, i + 1);
    const tdr = profile[iNext][0] - profile[iPrev][0];
    const tdy = profile[iNext][1] - profile[iPrev][1];
    const tLen = Math.sqrt(tdr * tdr + tdy * tdy) || 1;
    const nr = tdy / tLen;
    const ny = -tdr / tLen;

    for (let j = 0; j < cols; j++) {
      const u = j / cols;
      /* u=0.5 menghadap kamera (+Z): angle = (u-0.5)*2PI. */
      const angle = (u - 0.5) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const idx = i * cols + j;

      positions[idx * 3] = r * sinA * VESSEL_SCALE;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = r * cosA * VESSEL_SCALE;

      normals[idx * 3] = nr * sinA;
      normals[idx * 3 + 1] = ny;
      normals[idx * 3 + 2] = nr * cosA;

      uvs[idx * 2] = u;
      uvs[idx * 2 + 1] = v;
    }
  }

  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < cols; j++) {
      const jNext = (j + 1) % cols;
      const a = i * cols + j;
      const b = i * cols + jNext;
      const c = (i + 1) * cols + j;
      const d = (i + 1) * cols + jNext;
      /* Winding CCW dilihat dari luar (front face = permukaan depan):
         (a,b,c) -> cross(b-a, c-a) mengarah +Z di depan kamera. */
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new Geometry(gl, {
    position: { size: 3, data: positions },
    normal: { size: 3, data: normals },
    uv: { size: 2, data: uvs },
  });
  geometry.setIndex({ size: indices.length > 65535 ? 4 : 2, data: new Uint16Array(indices) });
  return geometry;
}

/* --------------------------------------------------------------------
 * PARTICLE DATA (spek §13): 48 partikel debu di dalam volume Vessel,
 * posisi deterministic (mulberry32), drift dihitung di shader dari
 * aSeed - tidak ada update buffer per frame, tanpa alokasi per frame
 * (spek §22.4).
 * ------------------------------------------------------------------ */
function buildParticleData() {
  const rand = mulberry32(20261101);
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const scales = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    /* Distribusi radial condong ke tengah (pow) agar terasa "di dalam". */
    const r = Math.pow(rand(), 0.7) * 0.19;
    const theta = rand() * Math.PI * 2;
    const yUnit = 0.12 + rand() * 0.46; // 0.12..0.58 unit profil
    positions[i * 3] = r * Math.sin(theta) * VESSEL_SCALE;
    positions[i * 3 + 1] = (yUnit - VESSEL_Y_CENTER) * VESSEL_SCALE;
    positions[i * 3 + 2] = r * Math.cos(theta) * VESSEL_SCALE;
    seeds[i] = rand();
    scales[i] = 0.5 + rand() * 1.0;
  }
  return { positions, seeds, scales };
}

/* --------------------------------------------------------------------
 * SHADER SOURCE (spek §11): stylized glass - Fresnel edge, chromatic
 * edge separation tipis per-channel, specular terkendali, interior
 * tint, monogram watermark. GLSL ES 1.00 (WebGL1/2), `mediump` agar
 * tidak berasumsi dukungan highp (spek §22.4). Uniform matrix bawaan
 * OGL (modelMatrix/viewMatrix/projectionMatrix/cameraPosition)
 * ditambahkan otomatis oleh Mesh.draw().
 * ------------------------------------------------------------------ */
const VESSEL_VERTEX = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec3 uLightDir;

/* Seluruh kalkulasi pencahayaan berada di VIEW SPACE secara konsisten
   (spek §11.2: jangan campur world/view space). Kamera selalu di origin
   view space - tidak bergantung pada uniform cameraPosition (audit
   menemukan uniform bawaan OGL Vec3 tidak pernah ter-set via
   uniform3fv -> vessel tampak solid; view space menghilangkan
   ketergantungan itu sekaligus lebih murah). */
varying vec3 vNormalView;
varying vec3 vViewPos;
varying vec3 vLightDirView;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPos.xyz;
  vNormalView = normalize(normalMatrix * normal);
  vLightDirView = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const VESSEL_FRAGMENT = /* glsl */ `
precision mediump float;

uniform vec3 uEdgeColor;
uniform vec3 uDeepColor;
uniform vec3 uTintColor;
uniform float uFresnelPower;
uniform float uAlphaBase;
uniform float uAlphaEdge;

varying vec3 vNormalView;
varying vec3 vViewPos;
varying vec3 vLightDirView;
varying vec2 vUv;

void main() {
  /* Front-only glass (cullFace BACK): komposit per-pixel deterministik
     - tanpa artefak urutan triangle double-sided (temuan audit §11.4:
     "uji overdraw dan artefak front/back face" - backface accumulasi
     menghasilkan band; dipilih single front pass paling stabil). */
  vec3 V = normalize(-vViewPos);        // kamera = origin view space
  vec3 N = normalize(vNormalView);
  vec3 L = normalize(vLightDirView);
  float facing = clamp(dot(N, V), 0.0, 1.0);

  /* Fresnel edge + chromatic edge separation (stylized, bukan
     refraksi fisik - spek §11.3): variasi power per channel RGB. */
  float fresR = pow(1.0 - facing, uFresnelPower * 0.86);
  float fresG = pow(1.0 - facing, uFresnelPower);
  float fresB = pow(1.0 - facing, uFresnelPower * 1.18);
  vec3 chroma = vec3(fresR, fresG, fresB);
  float fres = fresG;

  /* Permukaan pucat kebiruan; kedalaman interior disimulasikan dgn
     gradient vertikal UV (bagian bawah lebih pekat navy). */
  float depth = 1.0 - smoothstep(0.0, 0.55, vUv.y);
  vec3 surface = uTintColor * (0.42 + 0.38 * facing);
  surface = mix(surface, uDeepColor, depth * 0.2);

  vec3 edge = mix(uEdgeColor, uDeepColor, fres * 0.55);
  vec3 color = mix(surface, edge * chroma, clamp(fres * 1.2, 0.0, 1.0));

  /* Specular highlight terkendali (Blinn-Phong sempit, view space). */
  vec3 H = normalize(L + V);
  float spec = pow(clamp(dot(N, H), 0.0, 1.0), 72.0);
  color += vec3(1.0) * spec * 0.3;

  float alpha = uAlphaBase + fres * uAlphaEdge;

  /* Monogram watermark TIDAK dirender di shader: per audit §12.2,
     rasterisasi alpha SVG di beberapa browser tidak deterministik
     (menghasilkan quad semi-opaque). Pilihan resmi spek: overlay SVG
     dekoratif dengan path identik f-monogram.svg (HeroCanvas.astro +
     hero-webgl.css) - zero texture complexity, single source of truth. */
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

const PARTICLE_VERTEX = /* glsl */ `
attribute vec3 position;
attribute float aSeed;
attribute float aScale;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uDpr;
uniform float uPointBase;

varying float vAlpha;

void main() {
  vec3 p = position;
  /* Drift halus sepenuhnya dari uTime + seed (deterministic). */
  float t = uTime * 0.28 + aSeed * 6.2831;
  p.x += sin(t * 0.9 + aSeed * 12.0) * 0.045;
  p.y += sin(t * 0.6 + aSeed * 7.0) * 0.085;
  p.z += cos(t * 0.7 + aSeed * 5.0) * 0.045;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(uPointBase * aScale * uDpr / max(0.2, -mv.z), 1.0, 7.0);

  /* Opacity lambat (0.8 rad/s) - tidak flicker (spek §13.3). */
  vAlpha = clamp(0.45 + 0.3 * sin(uTime * 0.8 + aSeed * 6.2831), 0.15, 0.8);
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_FRAGMENT = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
varying float vAlpha;

void main() {
  /* Point sprite circular mask - tanpa kotak tajam (spek §13.4). */
  vec2 c = gl_PointCoord - vec2(0.5);
  float d = length(c);
  float a = smoothstep(0.5, 0.08, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

/* --------------------------------------------------------------------
 * INSTANCE CONTROLLER (spek §16.1 - single owner principle).
 * ------------------------------------------------------------------ */
function makeInstance(wrapper, canvas) {
  const instance = {
    /* Lifecycle token: true = halaman/scope sudah tidak valid. */
    cancelled: false,
    disposed: false,        // dispose final sudah berjalan
    state: 'idle',          // idle | waiting | loading | ready
    contextReleased: false,

    /* Resource OGL. */
    renderer: null,
    gl: null,
    scene: null,
    camera: null,
    vessel: null,
    vesselGeometry: null,
    vesselProgram: null,
    dust: null,
    dustGeometry: null,
    dustProgram: null,

    /* Loop & observers. */
    rafId: 0,
    running: false,
    ioVisible: true,
    docVisible: document.visibilityState !== 'hidden',
    resizeObserver: null,
    resizeFallback: null,
    intersectionObserver: null,
    lastWidth: 0,
    lastHeight: 0,

    /* Parallax state (objek reuse - tanpa alokasi per frame §14.2). */
    finePointer: false,
    target: { rx: 0, ry: 0, px: 0, py: 0 },
    current: { rx: 0, ry: 0, px: 0, py: 0 },

    /* Pending schedules. */
    idleHandle: 0,
    rafChain: 0,

    /* Registry references (dilepas saat dispose manual §16.2). */
    rafStopRef: null,
    disposeRef: null,

    /* MQL + handlers. */
    mqDesktop: null,
    mqReduced: null,
    mqDesktopHandler: null,
    mqReducedHandler: null,
    contextLostHandler: null,
    pointerMoveHandler: null,
    pointerLeaveHandler: null,
    visibilityHandler: null,
  };

  const setState = (state) => {
    instance.state = state;
    try {
      wrapper.dataset.webglState =
        state === 'ready' ? 'ready' :
        state === 'loading' ? 'loading' :
        state === 'waiting' ? 'waiting' : 'fallback';
    } catch (error) { /* dataset tidak kritikal */ }
  };

  const showFallback = () => {
    wrapper.classList.remove('is-webgl-ready');
    setState('fallback');
  };

  const cancelSchedules = () => {
    if (instance.rafChain) {
      cancelAnimationFrame(instance.rafChain);
      instance.rafChain = 0;
    }
    if (instance.idleHandle) {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(instance.idleHandle);
      else clearTimeout(instance.idleHandle);
      instance.idleHandle = 0;
    }
  };

  /* --- Scheduling (spek §9.5): 2x rAF lalu requestIdleCallback
         dengan timeout; semua bisa dibatalkan. --- */
  const scheduleLoad = () => {
    instance.rafChain = requestAnimationFrame(() => {
      instance.rafChain = requestAnimationFrame(() => {
        instance.rafChain = 0;
        if (instance.cancelled || instance.disposed || instance.state !== 'waiting') return;
        const fire = () => {
          instance.idleHandle = 0;
          if (instance.cancelled || instance.disposed || instance.state !== 'waiting') return;
          setState('loading');
          loadOGL();
        };
        if (typeof window.requestIdleCallback === 'function') {
          instance.idleHandle = window.requestIdleCallback(fire, { timeout: 1200 });
        } else {
          instance.idleHandle = setTimeout(fire, 300);
        }
      });
    });
  };

  /* --- Dynamic import OGL (spek §3.6): HANYA setelah guards. --- */
  const loadOGL = async () => {
    try {
      const OGL = await import('ogl');
      /* Re-check SEMUA guard setelah await (spek §9.4 langkah 10):
         race dynamic import - hasil terlambat tidak boleh membuat
         context (spek §16.5). */
      if (instance.cancelled || instance.disposed) return;
      if (!canvas.isConnected || !wrapper.isConnected) return;
      if (!instance.mqDesktop.matches || isReducedMotion()) return;
      /* State berubah (mis. temporary dispose saat import pending)?
         Jangan bangun scene dari sisa import lama. */
      if (instance.state !== 'loading') return;
      buildScene(OGL);
    } catch (error) {
      if (instance.cancelled || instance.disposed) return;
      failSafe('ogl load failed: ' + (error && error.message ? error.message : error));
    }
  };

  /* --- Ukuran (spek §10.3): ukur wrapper, bukan window. --- */
  const measureWrapper = () => {
    const rect = wrapper.getBoundingClientRect();
    return { w: Math.round(rect.width), h: Math.round(rect.height) };
  };

  /* Offset kanan Vessel (world unit): menjaga jarak dari tepi kanan
     area visual sehingga pixel card tetap terbaca (spek §2.3.1). */
  const computeOffsetX = () => {
    if (!instance.renderer || !instance.camera) return 0;
    const aspect = instance.renderer.width / Math.max(1, instance.renderer.height);
    const halfH = Math.tan((instance.camera.fov * Math.PI) / 360) * instance.camera.position.z;
    const halfW = halfH * aspect;
    /* Vessel condong ke kanan-atas area visual; pixel card tetap di
       kiri (margin CSS) sehingga keduanya tidak saling menutup. */
    return Math.min(0.68, Math.max(0.22, halfW - 0.82));
  };

  const applySize = () => {
    if (!instance.renderer || !instance.camera || instance.disposed || instance.cancelled) return;
    const { w, h } = measureWrapper();
    if (w <= 0 || h <= 0) return; // zero-size guard (spek §15.4)
    if (w === instance.lastWidth && h === instance.lastHeight) return;
    instance.lastWidth = w;
    instance.lastHeight = h;
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (nextDpr !== instance.renderer.dpr) instance.renderer.dpr = nextDpr;
    instance.renderer.setSize(w, h);
    instance.camera.perspective({ aspect: w / h });
    if (instance.dustProgram) instance.dustProgram.uniforms.uDpr.value = nextDpr;
  };

  /* --- Build scene setelah OGL dimuat & guard lolos ulang. --- */
  const buildScene = (OGL) => {
    try {
      instance.renderer = new OGL.Renderer({
        canvas,
        alpha: true,
        depth: true,
        stencil: false,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: 'default',
        dpr: Math.min(window.devicePixelRatio || 1, MAX_DPR),
      });
    } catch (error) {
      failSafe('renderer creation failed: ' + (error && error.message ? error.message : error));
      return;
    }
    if (!instance.renderer || !instance.renderer.gl) {
      failSafe('webgl context unavailable');
      return;
    }
    instance.gl = instance.renderer.gl;
    instance.gl.clearColor(0, 0, 0, 0);

    const { w, h } = measureWrapper();
    if (w <= 0 || h <= 0) {
      failSafe('wrapper has zero size');
      return;
    }
    instance.lastWidth = w;
    instance.lastHeight = h;
    instance.renderer.setSize(w, h);

    instance.scene = new OGL.Transform();
    instance.camera = new OGL.Camera(instance.gl, {
      fov: 30,
      aspect: w / h,
      near: 0.1,
      far: 30,
    });
    instance.camera.position.set(0, 0.05, 4.7);

    /* --- Vessel: geometry + program (deteksi link failure §11.5:
           OGL hanya console.warn, status link diperiksa eksplisit). --- */
    instance.vesselGeometry = buildVesselGeometry(instance.gl, OGL.Geometry);
    instance.vesselProgram = new OGL.Program(instance.gl, {
      vertex: VESSEL_VERTEX,
      fragment: VESSEL_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      cullFace: instance.gl.BACK, // front-only glass (stabil, tanpa band)
      uniforms: {
        uTime: { value: 0 },
        uEdgeColor: { value: [0.145, 0.388, 0.922] },  // #2563EB cobalt
        uDeepColor: { value: [0.118, 0.227, 0.541] },  // #1E3A8A navy
        uTintColor: { value: [0.8, 0.87, 0.97] },
        uLightDir: { value: [-0.45, 0.85, 0.6] },
        uFresnelPower: { value: 2.2 },
        uAlphaBase: { value: 0.035 },
        uAlphaEdge: { value: 0.85 },
              },
    });
    if (!instance.gl.getProgramParameter(instance.vesselProgram.program, instance.gl.LINK_STATUS)) {
      failSafe('vessel shader link failed');
      return;
    }

    instance.vessel = new OGL.Mesh(instance.gl, {
      geometry: instance.vesselGeometry,
      program: instance.vesselProgram,
    });
    instance.vessel.scale.set(0.68, 0.68, 0.68);
    instance.vessel.position.set(computeOffsetX(), 0.14, 0);
    instance.vessel.rotation.set(-0.04, 0.35, 0);
    instance.vessel.setParent(instance.scene);

    /* --- Particle dust (satu mesh, mode gl.POINTS - spek §13.2). --- */
    const dustData = buildParticleData();
    instance.dustGeometry = new OGL.Geometry(instance.gl, {
      position: { size: 3, data: dustData.positions },
      aSeed: { size: 1, data: dustData.seeds },
      aScale: { size: 1, data: dustData.scales },
    });
    instance.dustProgram = new OGL.Program(instance.gl, {
      vertex: PARTICLE_VERTEX,
      fragment: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      cullFace: false,
      uniforms: {
        uTime: { value: 0 },
        uDpr: { value: instance.renderer.dpr },
        uPointBase: { value: 11 },
        uColor: { value: [0.72, 0.83, 1.0] },
      },
    });
    if (!instance.gl.getProgramParameter(instance.dustProgram.program, instance.gl.LINK_STATUS)) {
      failSafe('particle shader link failed');
      return;
    }
    instance.dust = new OGL.Mesh(instance.gl, {
      geometry: instance.dustGeometry,
      program: instance.dustProgram,
      mode: instance.gl.POINTS,
    });
    instance.dust.setParent(instance.vessel); // ikut rotasi parallax Vessel

    /* --- Render frame valid PERTAMA sebelum menyatakan ready
           (spek §3.3, §9.4 langkah 13-14). --- */
    try {
      instance.renderer.render({ scene: instance.scene, camera: instance.camera });
    } catch (error) {
      failSafe('first render failed: ' + (error && error.message ? error.message : error));
      return;
    }
    if (instance.gl.getError() !== instance.gl.NO_ERROR) {
      failSafe('gl error on first render');
      return;
    }

    /* Frame valid sudah dirender: baru tampilkan canvas (spek §8.4). */
    setState('ready');
    wrapper.classList.add('is-webgl-ready');

    startLoop();
  };

  /* --- RAF loop tunggal (spek §15.1): Vessel + particles. --- */
  const tick = (t) => {
    if (!instance.running) return;
    const seconds = t * 0.001;
    const c = instance.current;
    const tg = instance.target;
    /* Lerp smoothing; tanpa alokasi objek baru (spek §14.2). */
    c.rx += (tg.rx - c.rx) * 0.08;
    c.ry += (tg.ry - c.ry) * 0.08;
    c.px += (tg.px - c.px) * 0.06;
    c.py += (tg.py - c.py) * 0.06;

    if (instance.vessel) {
      /* Idle breathing sangat halus + parallax pointer. */
      instance.vessel.rotation.y = 0.35 + c.ry + Math.sin(seconds * 0.24) * 0.02;
      instance.vessel.rotation.x = -0.04 + c.rx;
      instance.vessel.position.x = computeOffsetX() + c.px;
      instance.vessel.position.y = 0.14 + c.py;
    }
    if (instance.vesselProgram) instance.vesselProgram.uniforms.uTime.value = seconds;
    if (instance.dustProgram) instance.dustProgram.uniforms.uTime.value = seconds;

    try {
      instance.renderer.render({ scene: instance.scene, camera: instance.camera });
    } catch (error) {
      instance.running = false;
      failSafe('render loop error: ' + (error && error.message ? error.message : error));
      return;
    }
    instance.rafId = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (instance.running || instance.disposed || instance.cancelled) return;
    if (!instance.ioVisible || !instance.docVisible) return;
    if (instance.state !== 'ready') return;
    instance.running = true;
    instance.rafId = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    instance.running = false;
    if (instance.rafId) {
      cancelAnimationFrame(instance.rafId);
      instance.rafId = 0;
    }
  };

  /* Stop function untuk registry (idempoten - spek §16.4). */
  const rafStop = () => { stopLoop(); };

  /* --- Fail-safe (spek §11.5, §9.4): fallback menjadi hasil akhir. --- */
  const failSafe = (reason) => {
    try { console.warn('[hero-webgl] initialization stopped:', reason); } catch (error) { /* noop */ }
    showFallback();
    dispose({ final: true });
  };

  /* --- Pointer parallax (spek §14): hanya fine pointer, area
         wrapper (bukan document), smoothing lerp tanpa quickTo. --- */
  instance.pointerMoveHandler = (event) => {
    if (!instance.finePointer || instance.state !== 'ready') return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    /* Subtle & terbatas (spek §14.1). */
    instance.target.ry = Math.max(-0.18, Math.min(0.18, nx * 0.16));
    instance.target.rx = Math.max(-0.1, Math.min(0.1, ny * 0.1));
    instance.target.px = Math.max(-0.06, Math.min(0.06, nx * 0.06));
    instance.target.py = Math.max(-0.04, Math.min(0.04, -ny * 0.04));
  };
  instance.pointerLeaveHandler = () => {
    instance.target.rx = 0; instance.target.ry = 0;
    instance.target.px = 0; instance.target.py = 0;
  };

  /* --- Visibility handling (spek §15.3). --- */
  instance.visibilityHandler = () => {
    instance.docVisible = document.visibilityState !== 'hidden';
    if (instance.docVisible) startLoop();
    else stopLoop();
  };

  /* --- Context loss (spek §16.7): fallback-only strategy. Tanpa
         preventDefault, tanpa retry, tanpa render ke context hilang. --- */
  instance.contextLostHandler = () => {
    try { console.warn('[hero-webgl] webglcontextlost - fallback engaged'); } catch (error) { /* noop */ }
    showFallback();
    dispose({ final: true });
  };

  /* Lepas resource GPU yang punya API disposal publik di OGL 1.0.11:
     Geometry.remove() + Program.remove() (terverifikasi). Texture
     tidak punya remove() pada versi ini - referensi di-drop; context
     sendiri dilepas via loseContext pada dispose final saja (§16.6). */
  const releaseGpuResources = () => {
    if (!instance.gl) return;
    try {
      if (instance.dust) { instance.dust.setParent(null); instance.dust = null; }
      if (instance.vessel) { instance.vessel.setParent(null); instance.vessel = null; }
      if (instance.dustGeometry) { instance.dustGeometry.remove(); instance.dustGeometry = null; }
      if (instance.vesselGeometry) { instance.vesselGeometry.remove(); instance.vesselGeometry = null; }
      if (instance.dustProgram) { instance.dustProgram.remove(); instance.dustProgram = null; }
      if (instance.vesselProgram) { instance.vesselProgram.remove(); instance.vesselProgram = null; }
      instance.scene = null;
      instance.camera = null;
      instance.renderer = null;
      instance.gl = null;
    } catch (error) { /* jangan biarkan dispose melempar */ }
  };

  /* --- Dispose (idempoten, spek §16.3-§16.6).
         final=true  : keluar-homepage / before-swap / fail-safe -
                       semua resource + context dilepas, instance mati.
         final=false : viewport/reduced-motion crossing - resource GPU
                       dibuang, fallback tampil, instance menunggu
                       (boleh re-init lewat MQL). --- */
  const dispose = ({ final = false } = {}) => {
    const isFinal = final || instance.cancelled;
    if (instance.disposed && instance.disposedFinal) return; // sudah final: idempoten

    cancelSchedules();
    stopLoop();

    if (isFinal) {
      /* --- FINAL dispose (keluar-homepage / before-swap / fail-safe):
         lepas SEMUA listeners, observers, dan registry references. --- */
      if (instance.resizeObserver) { try { instance.resizeObserver.disconnect(); } catch (error) { /* noop */ } instance.resizeObserver = null; }
      if (instance.intersectionObserver) { try { instance.intersectionObserver.disconnect(); } catch (error) { /* noop */ } instance.intersectionObserver = null; }
      if (instance.resizeFallback) {
        window.removeEventListener('resize', instance.resizeFallback);
        instance.resizeFallback = null;
      }
      if (instance.mqDesktop && instance.mqDesktopHandler) {
        if (typeof instance.mqDesktop.removeEventListener === 'function') instance.mqDesktop.removeEventListener('change', instance.mqDesktopHandler);
        else if (typeof instance.mqDesktop.removeListener === 'function') instance.mqDesktop.removeListener(instance.mqDesktopHandler);
      }
      if (instance.mqReduced && instance.mqReducedHandler) {
        if (typeof instance.mqReduced.removeEventListener === 'function') instance.mqReduced.removeEventListener('change', instance.mqReducedHandler);
        else if (typeof instance.mqReduced.removeListener === 'function') instance.mqReduced.removeListener(instance.mqReducedHandler);
      }
      instance.mqDesktopHandler = null;
      instance.mqReducedHandler = null;
      wrapper.removeEventListener('pointermove', instance.pointerMoveHandler);
      wrapper.removeEventListener('pointerleave', instance.pointerLeaveHandler);
      document.removeEventListener('visibilitychange', instance.visibilityHandler);
      canvas.removeEventListener('webglcontextlost', instance.contextLostHandler);
    }
    /* NOTE temporary dispose (viewport/reduced-motion crossing): listeners
       dan observers TETAP terpasang - merekalah yang memicu re-init saat
       kondisi kembali layak (spek §3.4, §3.5, §15.5). Semua handler
       self-guard terhadap state/cancelled. */

    /* Ambil referensi gl SEBELUM release (JANGAN getContext ulang:
       getContext pada canvas tanpa context akan MENCIPTAKAN context
       yatim - bug yang ditemukan audit LC06). */
    const glForRelease = instance.gl;
    releaseGpuResources();

    if (isFinal) {
      /* WEBGL_lose_context: tepat satu kali, hanya pada dispose final,
         hanya jika context benar-benar pernah dibuat (spek §16.6). */
      if (!instance.contextReleased && glForRelease) {
        instance.contextReleased = true;
        try {
          const loseContext = glForRelease.getExtension('WEBGL_lose_context');
          if (loseContext && typeof loseContext.loseContext === 'function') loseContext.loseContext();
        } catch (error) { /* context mungkin sudah hilang */ }
      }
      instance.disposed = true;
      instance.disposedFinal = true;
      instance.cancelled = true;
      if (active === instance) active = null;
      /* Registry references dilepas agar Set tidak menahan closure
         (spek §16.2). Pada temporary dispose refs dipertahankan agar
         backstop after-swap tetap mengenal instance ini. */
      if (instance.rafStopRef) { motionRegistry.rafLoops.delete(instance.rafStopRef); instance.rafStopRef = null; }
      if (instance.disposeRef) { motionRegistry.webgl.delete(instance.disposeRef); instance.disposeRef = null; }
    }

    /* Fallback SVG kembali (DOM lama masih tersedia pada before-swap -
       spek §16.3 langkah 9). */
    showFallback();

    if (!isFinal) {
      /* Temporary dispose: instance menunggu kondisi kembali layak;
         MQL handler memicu re-init (satu instance, refs tetap tracked). */
      setState('waiting');
    }
  };

  /* disposeRef yang terdaftar di registry: selalu final-safe. */
  instance.disposeRef = () => dispose({ final: true });
  instance.rafStopRef = rafStop;
  instance.disposedFinal = false;

  /* --- Public API instance. --- */
  instance.dispose = () => dispose({ final: true });
  instance.cancel = () => {
    instance.cancelled = true;
    dispose({ final: true });
  };

  /* --- begin(): guard awal sinkron + scheduling + wiring (spek §9.4). --- */
  instance.begin = () => {
    if (instance.disposed || instance.cancelled) return;
    if (!canvas.isConnected || !wrapper.isConnected) { setState('waiting'); return; }
    instance.mqDesktop = window.matchMedia(DESKTOP_MQ);
    instance.mqReduced = window.matchMedia(REDUCED_MQ);
    instance.finePointer = window.matchMedia('(pointer: fine)').matches;

    setState('waiting');
    if (instance.mqDesktop.matches && !instance.mqReduced.matches) {
      /* Semua guard awal lolos: jadwalkan load SETELAH initial
         rendering (2x rAF + idle, spek §9.4 langkah 8 + §9.5). */
      scheduleLoad();
    }
    /* Bila belum memenuhi syarat: TANPA dynamic import sama sekali
       (spek §3.4, §3.5). MQL listener di bawah menangani perubahan
       viewport / preferensi mid-session. */

    /* MQL listeners: viewport turun -> dispose temporary; naik lagi ->
       re-init (satu instance) setelah guard divalidasi ulang. */
    instance.mqDesktopHandler = (event) => {
      if (instance.cancelled || instance.disposed) return;
      if (!event.matches) {
        dispose({ final: false });
      } else if (instance.state === 'waiting' && !instance.renderer) {
        setState('loading');
        loadOGL();
      }
    };
    instance.mqReducedHandler = (event) => {
      if (instance.cancelled || instance.disposed) return;
      if (event.matches) {
        /* Reduced motion aktif mid-session: hentikan + dispose (spek
           §3.5). Fallback SVG muncul kembali, tanpa parallax. */
        dispose({ final: false });
      } else if (instance.state === 'waiting' && !instance.renderer) {
        /* Kembali no-preference: re-init hanya jika masih homepage
           (instance hidup), viewport OK (dicek ulang di loadOGL). */
        setState('loading');
        loadOGL();
      }
    };
    if (typeof instance.mqDesktop.addEventListener === 'function') instance.mqDesktop.addEventListener('change', instance.mqDesktopHandler);
    else if (typeof instance.mqDesktop.addListener === 'function') instance.mqDesktop.addListener(instance.mqDesktopHandler);
    if (typeof instance.mqReduced.addEventListener === 'function') instance.mqReduced.addEventListener('change', instance.mqReducedHandler);
    else if (typeof instance.mqReduced.addListener === 'function') instance.mqReduced.addListener(instance.mqReducedHandler);

    /* Pointer parallax + visibility + context loss. */
    wrapper.addEventListener('pointermove', instance.pointerMoveHandler, { passive: true });
    wrapper.addEventListener('pointerleave', instance.pointerLeaveHandler, { passive: true });
    document.addEventListener('visibilitychange', instance.visibilityHandler);
    canvas.addEventListener('webglcontextlost', instance.contextLostHandler);

    /* Backstop registry: listener juga dilacak agar after-swap cleanup
       melepas sisa apa pun bila dispose manual kelewat (spek §16.4). */
    trackMotionListener(wrapper, 'pointermove', instance.pointerMoveHandler, { passive: true });
    trackMotionListener(wrapper, 'pointerleave', instance.pointerLeaveHandler, { passive: true });
    trackMotionListener(document, 'visibilitychange', instance.visibilityHandler);
    trackMotionListener(canvas, 'webglcontextlost', instance.contextLostHandler);

    /* ResizeObserver (spek §15.4): ukuran wrapper, bukan window. */
    if (typeof ResizeObserver === 'function') {
      instance.resizeObserver = new ResizeObserver(() => {
        if (instance.cancelled || instance.disposed) return;
        applySize();
      });
      instance.resizeObserver.observe(wrapper);
    } else {
      /* Fallback sederhana (spek §10.3). */
      instance.resizeFallback = () => { if (!instance.cancelled && !instance.disposed) applySize(); };
      window.addEventListener('resize', instance.resizeFallback);
      trackMotionListener(window, 'resize', instance.resizeFallback);
    }

    /* IntersectionObserver: pause RAF offscreen (spek §15.2). */
    if (typeof IntersectionObserver === 'function') {
      instance.intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        instance.ioVisible = !!(entry && entry.isIntersecting);
        if (instance.ioVisible) startLoop();
        else stopLoop();
      }, { threshold: 0.01 });
      instance.intersectionObserver.observe(wrapper);
    }

    /* Registry integration (spek §16.2): RAF stop + WebGL dispose. */
    trackRafLoop(instance.rafStopRef);
    trackWebGLContext(instance.disposeRef);
  };

  return instance;
}

/* --------------------------------------------------------------------
 * MODULE STATE: satu instance aktif per halaman (spek §22.1) + satu
 * listener before-swap module-level terpasang sekali (spek §16.3).
 * ------------------------------------------------------------------ */
let active = null;
let beforeSwapBound = false;

export function initHeroWebGL() {
  /* Duplikat: jangan pernah buat instance kedua (spek §17.2, §22.1). */
  if (active && !active.disposed) return active.dispose;

  const wrapper = document.getElementById('hero-canvas-wrapper');
  const canvas = document.getElementById('webgl-canvas');

  /* Route guard (spek §17.4): halaman tanpa markup Canvas -> no-op
     murni, TANPA dynamic import OGL. */
  if (!wrapper || !canvas) return () => {};

  const instance = makeInstance(wrapper, canvas);
  active = instance;

  /* Lifecycle Astro (spek §16.3): dispose pada BEFORE-swap, DOM lama
     masih tersedia. Satu listener module-level untuk selamanya. */
  if (!beforeSwapBound) {
    beforeSwapBound = true;
    document.addEventListener('astro:before-swap', () => {
      if (active) active.cancel();
    });
  }

  instance.begin();
  return instance.dispose;
}

/* Cleanup untuk gsap.matchMedia revert (global.js cleanups) -
   idempoten, aman dipanggil dua kali. */
export function disposeHeroWebGL() {
  if (active) active.cancel();
}
