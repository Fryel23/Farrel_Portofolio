/*!
 * hero-webgl/scene.js: OGL render scene for the Signature Hero
 * (V11.1 STAGE 5-12, modularized V11.1-M).
 *
 * Single responsibility (M01): pembuatan & kepemilikan objek visual OGL
 * - Renderer, context, Camera, scene Transform, vessel mesh
 *   (geometry/program), particle mesh (geometry/program), resize
 *   viewport, render update, dan pelepasan resource GPU yang dimilikinya.
 *
 * Kontrak:
 *  - Modul OGL DITERIMA dari controller setelah dynamic import (tidak
 *    ada static import 'ogl' di file mana pun di jalur initial bundle -
 *    spek V11.1-M §8.3).
 *  - Scene TIDAK mengelola Astro lifecycle, TIDAK memasang listener,
 *    TIDAK mendaftarkan registry (controller adalah owner lifecycle).
 *  - API kecil & eksplisit: resize(), frame(), getOffsetX(), getGl(),
 *    dispose() (idempoten).
 *  - API OGL 1.0.11 diverifikasi langsung terhadap node_modules:
 *    Renderer({canvas,alpha,...}) tanpa destroy(); Geometry.remove(),
 *    Program.remove() tersedia; Texture tanpa remove(); Mesh mode
 *    gl.POINTS; Program transparent => blendFunc(SRC_ALPHA,
 *    ONE_MINUS_SRC_ALPHA) (premultipliedAlpha false).
 */
import { VESSEL_VERTEX, VESSEL_FRAGMENT, PARTICLE_VERTEX, PARTICLE_FRAGMENT } from './shaders.js';
import { buildVesselGeometry, buildParticleData } from './geometry.js';

/* DPR dibatasi (spek §10.2, §22.5) - owner konfigurasi ukuran scene. */
const MAX_DPR = 1.5;

/**
 * Bangun scene lengkap dan lakukan first render validasi.
 * Mengembalikan API scene, atau null jika gagal (onFail dipanggil dengan
 * alasan yang bisa dibaca - perilaku fail-safe identik dengan baseline).
 *
 * @param {{ canvas: HTMLCanvasElement, wrapper: HTMLElement, OGL: object,
 *           onFail: (reason: string) => void }} deps
 */
export function createHeroScene({ canvas, wrapper, OGL, onFail }) {
  const fail = (reason) => {
    onFail(reason);
    return null;
  };

  /* --- Renderer (konteks WebGL tunggal untuk seluruh hero). --- */
  let renderer;
  try {
    renderer = new OGL.Renderer({
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
    return fail('renderer creation failed: ' + (error && error.message ? error.message : error));
  }
  if (!renderer || !renderer.gl) {
    return fail('webgl context unavailable');
  }
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  /* --- Ukuran awal dari wrapper (bukan window - spek §10.3). --- */
  const rect = wrapper.getBoundingClientRect();
  const w0 = Math.round(rect.width);
  const h0 = Math.round(rect.height);
  if (w0 <= 0 || h0 <= 0) {
    return fail('wrapper has zero size');
  }
  renderer.setSize(w0, h0);

  const scene = new OGL.Transform();
  const camera = new OGL.Camera(gl, {
    fov: 30,
    aspect: w0 / h0,
    near: 0.1,
    far: 30,
  });
  camera.position.set(0, 0.05, 4.7);

  /* --- Vessel: geometry + program (deteksi link failure §11.5:
         OGL hanya console.warn, status link diperiksa eksplisit). --- */
  const vesselGeometry = buildVesselGeometry(gl, OGL.Geometry);
  const vesselProgram = new OGL.Program(gl, {
    vertex: VESSEL_VERTEX,
    fragment: VESSEL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    cullFace: gl.BACK, // front-only glass (stabil, tanpa band)
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
  if (!gl.getProgramParameter(vesselProgram.program, gl.LINK_STATUS)) {
    return fail('vessel shader link failed');
  }

  /* --- Offset kanan Vessel (world unit): menjaga jarak dari tepi kanan
     area visual sehingga pixel card tetap terbaca (spek §2.3.1). --- */
  const getOffsetX = () => {
    if (!renderer || !camera) return 0;
    const aspect = renderer.width / Math.max(1, renderer.height);
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const halfW = halfH * aspect;
    /* Vessel condong ke kanan-atas area visual; pixel card tetap di
       kiri (margin CSS) sehingga keduanya tidak saling menutup. */
    return Math.min(0.68, Math.max(0.22, halfW - 0.82));
  };

  const vessel = new OGL.Mesh(gl, {
    geometry: vesselGeometry,
    program: vesselProgram,
  });
  vessel.scale.set(0.68, 0.68, 0.68);
  vessel.position.set(getOffsetX(), 0.14, 0);
  vessel.rotation.set(-0.04, 0.35, 0);
  vessel.setParent(scene);

  /* --- Particle dust (satu mesh, mode gl.POINTS - spek §13.2). --- */
  const dustData = buildParticleData();
  const dustGeometry = new OGL.Geometry(gl, {
    position: { size: 3, data: dustData.positions },
    aSeed: { size: 1, data: dustData.seeds },
    aScale: { size: 1, data: dustData.scales },
  });
  const dustProgram = new OGL.Program(gl, {
    vertex: PARTICLE_VERTEX,
    fragment: PARTICLE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    cullFace: false,
    uniforms: {
      uTime: { value: 0 },
      uDpr: { value: renderer.dpr },
      uPointBase: { value: 11 },
      uColor: { value: [0.72, 0.83, 1.0] },
    },
  });
  if (!gl.getProgramParameter(dustProgram.program, gl.LINK_STATUS)) {
    return fail('particle shader link failed');
  }
  const dust = new OGL.Mesh(gl, {
    geometry: dustGeometry,
    program: dustProgram,
    mode: gl.POINTS,
  });
  dust.setParent(vessel); // ikut rotasi parallax Vessel

  /* --- Render frame valid PERTAMA sebelum scene dinyatakan siap
         (spek §3.3, §9.4 langkah 13-14). --- */
  try {
    renderer.render({ scene, camera });
  } catch (error) {
    return fail('first render failed: ' + (error && error.message ? error.message : error));
  }
  if (gl.getError() !== gl.NO_ERROR) {
    return fail('gl error on first render');
  }

  /* --- Resize viewport: ukuran wrapper dihitung controller; modul ini
         menerapkan size + aspect + DPR cap ke renderer/kamera/program. --- */
  const resize = (w, h) => {
    if (!renderer || !camera) return;
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (nextDpr !== renderer.dpr) renderer.dpr = nextDpr;
    renderer.setSize(w, h);
    camera.perspective({ aspect: w / h });
    if (dustProgram) dustProgram.uniforms.uDpr.value = nextDpr;
  };

  /* --- Render update per frame: pose vessel (breathing + parallax
         dari state controller), uniform waktu, lalu render. Melempar
         error render ke controller (fail-safe path baseline). --- */
  const frame = (seconds, motion) => {
    /* Idle breathing sangat halus + parallax pointer. */
    vessel.rotation.y = 0.35 + motion.ry + Math.sin(seconds * 0.24) * 0.02;
    vessel.rotation.x = -0.04 + motion.rx;
    vessel.position.x = getOffsetX() + motion.px;
    vessel.position.y = 0.14 + motion.py;
    vesselProgram.uniforms.uTime.value = seconds;
    dustProgram.uniforms.uTime.value = seconds;
    renderer.render({ scene, camera });
  };

  /* --- Pelepasan resource GPU yang punya API disposal publik di OGL
     1.0.11: Geometry.remove() + Program.remove() (terverifikasi).
     Texture tidak punya remove() pada versi ini - referensi di-drop;
     context sendiri dilepas via loseContext pada dispose final saja
     (§16.6, dilakukan controller). Idempoten. --- */
  let sceneDisposed = false;
  const dispose = () => {
    if (!gl || sceneDisposed) return; // idempoten (semantik baseline)
    sceneDisposed = true;
    try {
      if (dust) { dust.setParent(null); }
      if (vessel) { vessel.setParent(null); }
      if (dustGeometry) { dustGeometry.remove(); }
      if (vesselGeometry) { vesselGeometry.remove(); }
      if (dustProgram) { dustProgram.remove(); }
      if (vesselProgram) { vesselProgram.remove(); }
    } catch (error) { /* jangan biarkan dispose melempar */ }
  };

  return {
    resize,
    frame,
    getOffsetX,
    getGl: () => gl,
    dispose,
  };
}
