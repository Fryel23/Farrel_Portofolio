/*!
 * archive/game-deck/crt.js: CRT shader overlay for the Game Deck screen
 * (V8.0 Fase 4, modularized V11.1-M).
 *
 * Single responsibility: satu lifecycle overlay CRT - vertex/fragment
 * shader, compile/link, canvas, render loop, resize handler, dan
 * start/stop/dispose. Satu fungsi stop idempoten menjadi choke point
 * untuk close, eject, reduce cleanup, dan page cleanup; stop terdaftar
 * di registry core yang sudah ada (trackRafLoop + trackWebGLContext) -
 * TANPA membuat registry WebGL kedua.
 */
import {
  doc, isReducedMotion, finePointer, trackRafLoop, trackWebGLContext,
} from '../../core.js';

/* ======================================================================
 * V8.0 FASE 4: CRT SHADER PADA GAME DECK (WEBGL RINGAN)
 * ======================================================================
 * Overlay prosedural di atas .deck-screen selama Game Deck terbuka:
 * scanline, phosphor glow, grille RGB halus, band roll lambat, grain,
 * dan ilusi layar melengkung (vignette tepi + sudut membulat). Shader
 * GLSL inline string (spesifikasi mengizinkan); tanpa tekstur sehingga
 * konten DOM kartu tetap hidup dan interaktif di bawahnya (canvas
 * pointer-events none).
 * Lifecycle (Batasan 2 + 3): start hanya dari jalur openDeck animasi,
 * no-op saat reduced motion atau non fine-pointer; stop dipanggil dari
 * closeDeckInstant (satu choke point untuk eject, instant close, dan
 * reduce cleanup) plus jaring pengaman after-swap lewat trackRafLoop +
 * trackWebGLContext. Listener resize dikelola manual oleh stop() karena
 * hidup-matinya mengikuti sesi deck, bukan sekali per halaman; stop
 * sendiri terdaftar di registry sehingga tetap terbersihkan.
 * Progressive enhancement (Batasan 1): tanpa WebGL seluruh modul no-op
 * dan deck tampil normal. */
const CRT_VERTEX = [
  'attribute vec2 aPos;',
  'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }'
].join('\n');

const CRT_FRAGMENT = [
  'precision mediump float;',
  'uniform float uTime;',
  'uniform vec2 uRes;',
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
  'void main() {',
  '  vec2 uv = gl_FragCoord.xy / uRes;',
  '  vec2 c = uv - 0.5;',
  '  float r = length(c * vec2(1.12, 1.0));',
  '  float edge = smoothstep(0.55, 0.8, r);',
  '  float scan = 0.5 + 0.5 * sin(gl_FragCoord.y * 1.5708);',
  '  float grille = 0.86 + 0.14 * sin(gl_FragCoord.x * 2.0944);',
  '  float bandPos = fract(uv.y * 0.6 - uTime * 0.05);',
  '  float band = smoothstep(0.0, 0.2, bandPos) * smoothstep(0.45, 0.2, bandPos);',
  '  float grain = hash(gl_FragCoord.xy + floor(uTime * 24.0) * 13.7);',
  '  float dark = (1.0 - scan) * 0.2 + edge * 0.38;',
  '  float glow = 0.025 + band * 0.075;',
  '  float alpha = clamp(dark + glow, 0.0, 0.9);',
  '  vec3 phosphor = vec3(0.55, 1.0, 0.72) * grille;',
  '  vec3 col = mix(vec3(0.0), phosphor, clamp(glow / max(alpha, 0.001), 0.0, 1.0));',
  '  gl_FragColor = vec4(col, alpha);',
  '}'
].join('\n');

const crtState = {
  active: false,
  canvas: null,
  gl: null,
  rafId: 0,
  startedAt: 0,
  resizeHandler: null,
  stopFn: null
};

function compileCrtShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || 'CRT shader compile failed');
  }
  return shader;
}

function stopDeckCRT() {
  if (!crtState.active) return;
  crtState.active = false;
  if (crtState.rafId) {
    window.cancelAnimationFrame(crtState.rafId);
    crtState.rafId = 0;
  }
  if (crtState.resizeHandler) {
    window.removeEventListener('resize', crtState.resizeHandler);
    crtState.resizeHandler = null;
  }
  if (crtState.canvas && crtState.canvas.parentNode) {
    try { crtState.canvas.parentNode.removeChild(crtState.canvas); } catch (error) { /* DOM sudah diganti */ }
  }
  if (crtState.gl) {
    try {
      const lose = crtState.gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (error) { /* context sudah lepas */ }
  }
  crtState.canvas = null;
  crtState.gl = null;
}

function startDeckCRT(screen) {
  if (!screen || crtState.active || isReducedMotion() || !finePointer) return;
  const canvas = doc.createElement('canvas');
  canvas.className = 'deck-crt-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none;';
  screen.appendChild(canvas);

  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: false, antialias: false,
      depth: false, stencil: false, powerPreference: 'low-power'
    });
  } catch (error) {
    gl = null;
  }
  if (!gl) {
    canvas.remove();
    return; // Batasan 1: tanpa WebGL deck tetap berfungsi normal
  }

  let program = null;
  try {
    const vs = compileCrtShader(gl, gl.VERTEX_SHADER, CRT_VERTEX);
    const fs = compileCrtShader(gl, gl.FRAGMENT_SHADER, CRT_FRAGMENT);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'CRT program link failed');
    }
  } catch (error) {
    canvas.remove();
    return; // Batasan 1: shader gagal -> deck tetap normal, tanpa error fatal
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, 'uTime');
  const uRes = gl.getUniformLocation(program, 'uRes');

  const resize = () => {
    const rect = screen.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();

  crtState.active = true;
  crtState.canvas = canvas;
  crtState.gl = gl;
  crtState.startedAt = 0;

  const loop = (timestamp) => {
    if (!crtState.active) return;
    if (!crtState.startedAt) crtState.startedAt = timestamp;
    gl.uniform1f(uTime, (timestamp - crtState.startedAt) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    crtState.rafId = window.requestAnimationFrame(loop);
  };
  crtState.rafId = window.requestAnimationFrame(loop);

  crtState.resizeHandler = resize;
  window.addEventListener('resize', resize);

  /* Batasan 2: satu fungsi stop terdaftar di dua jalur registry
     (rafLoops untuk rAF, webgl untuk context + canvas); idempoten via
     flag active, jadi pemanggilan ganda after-swap aman. */
  crtState.stopFn = trackRafLoop(stopDeckCRT);
  trackWebGLContext(stopDeckCRT);
}

/* Modularization exports (public API of this feature module). */
export { startDeckCRT, stopDeckCRT };
