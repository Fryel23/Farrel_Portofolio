/*!
 * hero-webgl/geometry.js: vessel profile + lathe geometry builder +
 * deterministic particle data (V11.1 STAGE 5-12, modularized V11.1-M).
 *
 * Single responsibility (M01): data & konstruksi geometri murni.
 * - TIDAK membuat Renderer / RAF / listener (dependency di-pass sebagai
 *   parameter: `Geometry` constructor OGL diterima dari pemanggil agar
 *   modul ini tidak melakukan static import 'ogl').
 * - TIDAK mengakses instance aktif / DOM.
 * - TANPA alokasi data per frame (dipanggil sekali saat scene dibangun).
 */

/* Particle budget kecil & terukur (spek §13.3). */
export const PARTICLE_COUNT = 48;

/* --------------------------------------------------------------------
 * Utilitas deterministic (spek §13.3: tanpa Math.random() per frame,
 * seed tetap agar stabil antar-run).
 * ------------------------------------------------------------------ */
export function mulberry32(seed) {
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
 * mesh di-scale 0.68 (uniform - aman untuk normalMatrix).
 * ------------------------------------------------------------------ */
export const VESSEL_PROFILE = [
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
export const VESSEL_RADIAL = 96;
const VESSEL_SCALE = 2.3;
const VESSEL_Y_CENTER = 0.47;

export function buildVesselGeometry(gl, Geometry) {
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
export function buildParticleData() {
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
