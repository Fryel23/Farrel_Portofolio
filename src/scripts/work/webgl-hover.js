/*!
 * work/webgl-hover.js: CurtainsJS project-image hover (modularized
 * V11.1-M).
 *
 * Single responsibility: WebGL hover spatial depth - satu instance
 * Curtains per cover, shader, plane lifecycle (create/sync/dispose),
 * dan dynamic import 'curtainsjs' yang LAZY: hanya /work, pointer
 * fine, tanpa reduced motion, dan WebGL didukung. Canvas pointer-
 * events none; fallback img tetap utuh; semua context/rAF dibersihkan
 * via registry core (trackWebGLContext + trackRafLoop). Owner WebGL
 * ini TERPISAH dari Hero WebGL OGL.
 */
import {
  doc, el, qs, qsa, finePointer, isReducedMotion,
  trackWebGLContext, trackRafLoop, trackMotionListener, trackEventTween,
} from '../core.js';

/* V10.3 SUBFASE 2: konstruktor Curtains/Plane diinjeksi dari dynamic
   import (tidak ada lagi binding statis dari 'curtainsjs'). */
const webglHoverState = { active: false, entries: [], curtainsCtor: null, planeCtor: null };

/* V10.2 B.1: hanya /work (galeri arsip) yang mengizinkan WebGL hover.
   [slug].astro tidak meng-import work.js sehingga /work/* dead path.
   work.js juga dipakai homepage, jadi gate-nya path, bukan file. */
function webglPathAllowed() {
  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  return path === '/work';
}

function webglSupported() {
  try {
    const probe = doc.createElement('canvas');
    return !!(probe.getContext && probe.getContext('webgl'));
  } catch (error) {
    return false;
  }
}

const WEBGL_VERTEX = [
  'precision mediump float;',
  'attribute vec3 aVertexPosition;',
  'attribute vec2 aTextureCoord;',
  'uniform mat4 uMVMatrix;',
  'uniform mat4 uPMatrix;',
  'uniform mat4 uTextureMatrix0;',
  'uniform float uHover;',
  'uniform vec2 uMouse;',
  'varying vec3 vVertexPosition;',
  'varying vec2 vTextureCoord;',
  'void main() {',
  '  vec3 vertexPosition = aVertexPosition;',
  '  float dist = distance(vertexPosition.xy, uMouse);',
  '  float pull = uHover * exp(-dist * 1.4) * 0.16;',
  '  vertexPosition.xy += (uMouse - vertexPosition.xy) * pull;',
  '  vertexPosition.z += uHover * 0.35 * exp(-dist * 1.4);',
  '  gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);',
  '  vTextureCoord = (uTextureMatrix0 * vec4(aTextureCoord, 0.0, 1.0)).xy;',
  '  vVertexPosition = vertexPosition;',
  '}'
].join('\n');

const WEBGL_FRAGMENT = [
  'precision mediump float;',
  'varying vec3 vVertexPosition;',
  'varying vec2 vTextureCoord;',
  'uniform sampler2D uSampler0;',
  'uniform float uHover;',
  'uniform float uTime;',
  'void main() {',
  '  vec2 texCoord = vTextureCoord;',
  '  float wave = sin(vVertexPosition.x * 6.0 + uTime * 1.6) * cos(vVertexPosition.y * 5.0 - uTime) * 0.014 * uHover;',
  '  texCoord.x += wave;',
  '  texCoord.y += wave * 0.6;',
  '  gl_FragColor = texture2D(uSampler0, texCoord);',
  '}'
].join('\n');

function disposeWebGLEntry(entry) {
  if (!entry || entry.disposed) return;
  entry.disposed = true;
  if (entry.hoverTween) { try { entry.hoverTween.kill(); } catch (error) { /* tween sudah mati */ } }
  if (entry.plane) { try { entry.plane.remove(); } catch (error) { /* plane sudah lepas */ } }
  if (entry.curtains) { try { entry.curtains.dispose(); } catch (error) { /* context sudah lepas */ } }
  if (entry.container && entry.container.parentNode) {
    try { entry.container.parentNode.removeChild(entry.container); } catch (error) { /* DOM sudah diganti */ }
  }
}

function createWebGLPlane(img) {
  const Curtains = webglHoverState.curtainsCtor;
  const Plane = webglHoverState.planeCtor;
  if (!Curtains || !Plane) return null;
  const cover = img.closest('.project-cover');
  const card = img.closest('.project-card');
  if (!cover || !card || cover.querySelector('.webgl-cover-canvas')) return null;

  const container = el('div', 'webgl-cover-canvas');
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;';
  cover.appendChild(container);

  const entry = { img, cover, card, container, curtains: null, plane: null, hoverTween: null, disposed: false };
  let disposeRegistered = false;
  const registerDispose = () => {
    if (disposeRegistered) return;
    disposeRegistered = true;
    const disposeFn = () => disposeWebGLEntry(entry);
    trackWebGLContext(disposeFn); // Batasan 2: context + canvas dibersihkan after-swap
    trackRafLoop(disposeFn);      // Batasan 2: rAF internal Curtains ikut mati
  };

  let curtains = null;
  try {
    curtains = new Curtains({
      container: container,
      watchScroll: false,
      alpha: true,
      premultipliedAlpha: true,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5)
    });
  } catch (error) {
    container.parentNode.removeChild(container);
    return null; // Batasan 1: WebGL gagal -> kartu tetap normal
  }
  entry.curtains = curtains;

  curtains.onError(() => disposeWebGLEntry(entry));
  curtains.onContextLost(() => disposeWebGLEntry(entry));

  let plane = null;
  try {
    plane = new Plane(curtains, cover, {
      autoloadSources: false,
      widthSegments: 16,
      heightSegments: 12,
      vertexShader: WEBGL_VERTEX,
      fragmentShader: WEBGL_FRAGMENT,
      uniforms: {
        uHover: { name: 'uHover', type: '1f', value: 0 },
        uMouse: { name: 'uMouse', type: '2f', value: [0, 0] },
        uTime: { name: 'uTime', type: '1f', value: 0 }
      }
    });
  } catch (error) {
    disposeWebGLEntry(entry);
    return null;
  }
  entry.plane = plane;
  registerDispose();

  /* Tekstur dimuat eksplisit dari img (autoload dimatikan supaya canvas
     WebGL sendiri tidak ikut dijadikan tekstur). */
  try { plane.loadImages([img]); } catch (error) { disposeWebGLEntry(entry); return null; }

  plane.onRender(() => {
    if (plane.uniforms && plane.uniforms.uTime) plane.uniforms.uTime.value += 0.016;
  });

  const setHover = (target) => {
    if (entry.hoverTween) { try { entry.hoverTween.kill(); } catch (error) { /* noop */ } }
    if (plane.uniforms && plane.uniforms.uHover) {
      entry.hoverTween = trackEventTween(window.gsap.to(plane.uniforms.uHover, { value: target, duration: 0.5, ease: 'power2.out' }));
    }
  };

  trackMotionListener(card, 'pointerenter', () => setHover(1));
  trackMotionListener(card, 'pointermove', (event) => {
    const rect = cover.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (plane.uniforms && plane.uniforms.uMouse) {
      plane.uniforms.uMouse.value = [
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
      ];
    }
  }, { passive: true });
  trackMotionListener(card, 'pointerleave', () => setHover(0));

  return entry;
}

/* Buang plane yang elemennya sudah tidak terhubung (hasil render ulang
   filter) dan buat plane untuk kartu baru. */
function syncWebGLPlanes() {
  if (!webglHoverState.active || !webglPathAllowed()) return;
  webglHoverState.entries = webglHoverState.entries.filter((entry) => {
    if (entry.img.isConnected && entry.cover.isConnected) return true;
    disposeWebGLEntry(entry);
    return false;
  });
  qsa('.project-card .project-cover img').forEach((img) => {
    if (webglHoverState.entries.some((entry) => entry.img === img)) return;
    const entry = createWebGLPlane(img);
    if (entry) webglHoverState.entries.push(entry);
  });
}

/* V10.3 SUBFASE 2: async - chunk curtainsjs hanya diunduh di sini, dan
   hanya ketika semua gate lolos (path /work, pointer fine, bukan reduced
   motion, WebGL didukung). webglHoverState.active baru bernilai true
   setelah import sukses, sehingga syncWebGLPlanes() yang dipanggil
   renderProjects() tidak membuat plane sebelum modul siap. */
async function initWebGLHover() {
  if (!finePointer || isReducedMotion() || !webglPathAllowed() || !webglSupported()) return;
  try {
    const module = await import('curtainsjs');
    webglHoverState.curtainsCtor = module.Curtains;
    webglHoverState.planeCtor = module.Plane;
    webglHoverState.active = true;
    syncWebGLPlanes();
  } catch (error) {
    /* Import gagal (jarang): kartu tetap tampil normal tanpa WebGL
       (Batasan 1 V8.0). Tidak ada fallback visual baru (zero creep). */
    webglHoverState.active = false;
  }
}

/* Modularization exports (public API of this feature module). */
export { syncWebGLPlanes, initWebGLHover };
