/*!
 * hero-webgl/shaders.js: GLSL source constants for the Signature Hero
 * (V11.1 STAGE 5-12, modularized V11.1-M).
 *
 * Single responsibility (M01): hanya source shader. Tidak ada import,
 * tidak ada DOM, tidak ada state runtime, tidak ada WebGL context.
 * Uniform matrix bawaan OGL (modelMatrix/viewMatrix/projectionMatrix/
 * cameraPosition) ditambahkan otomatis oleh Mesh.draw().
 */

/* Vessel: stylized glass - Fresnel edge, chromatic edge separation
 * tipis per-channel, specular terkendali, interior tint. GLSL ES 1.00
 * (WebGL1/2), `mediump` agar tidak berasumsi dukungan highp (spek
 * V11.1 §22.4). */
export const VESSEL_VERTEX = /* glsl */ `
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

export const VESSEL_FRAGMENT = /* glsl */ `
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

/* Particle dust: drift deterministik dari uTime + aSeed (tanpa update
 * buffer per frame), point sprite circular mask. */
export const PARTICLE_VERTEX = /* glsl */ `
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

export const PARTICLE_FRAGMENT = /* glsl */ `
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
