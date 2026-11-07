/**
 * src/world-aethelgrad/catalog/code-spells-catalog.ts
 * 24 Tantangan Logika & Algoritma "The Code-Spell Sanctum" (4 Tiers x 6 Spells).
 * Setiap tantangan yang berhasil dipecahkan memberikan Astral Gems, Starlight Dust,
 * dan Permanent Arcane Code Buff (+ATK%, +HP%, +DEF%, +CRIT%) untuk seluruh Hero!
 */

import type { CodeSpellChallenge, CodeSpellTier } from '../types/sanctum.types.ts';

export const CODE_SPELLS_CATALOG: readonly CodeSpellChallenge[] = Object.freeze([
  // ==================== TIER 1: NOVICE RUNES (6 Spells) ====================
  {
    id: 'spell-01-exorcise-bug',
    code: 'SPELL-101',
    title: 'Spell: Exorcise Bug (Zero-Division Guard)',
    tier: 'TIER_1_NOVICE',
    category: 'Defensive Logic & Guard Clauses',
    lorePrompt: 'Inti mana altar terganggu oleh pembagian nol saat menghitung rasio energi kristal.',
    problemStatement:
      'Perbaiki fungsi calculateRatio(a, b) agar mengembalikan 0 secara aman ketika penyebut b bernilai 0, dan mengembalikan Math.round((a / b) * 100) jika b !== 0.',
    brokenCodeDisplay: [
      'function calculateRatio(a, b) {',
      '  // BUG: crashes or returns Infinity/NaN when b === 0',
      '  return Math.round((a / b) * 100);',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'calculateRatio(50, 100)', expectedOutput: '50' },
      { label: 'Test Case 2', inputPreview: 'calculateRatio(75, 0)', expectedOutput: '0 (Safe Guard)' },
      { label: 'Test Case 3', inputPreview: 'calculateRatio(0, 0)', expectedOutput: '0 (No NaN)' },
      { label: 'Test Case 4', inputPreview: 'calculateRatio(30, 60)', expectedOutput: '50' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'if (b === 0) return 0;\nreturn Math.round((a / b) * 100);',
        explanation: 'Guard clause eksplisit mencegah pembagian dengan nol sebelum operasi aritmatika.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'if (a === 0) return 100;\nreturn Math.round((a * b) / 100);',
        explanation: 'Salah karena mengubah rumus rasio dan tidak menangani b === 0.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return Math.round(a / (b || -1));',
        explanation: 'Salah karena menghasilkan nilai negatif palsu saat b === 0.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['b === 0', 'b == 0', '!b', 'return 0'],
    rewardGems: 150,
    rewardDust: 40,
    permanentBuffPct: { atkPct: 3, hpPct: 2, defPct: 1, critPct: 1 },
  },
  {
    id: 'spell-02-array-dedupe',
    code: 'SPELL-102',
    title: 'Spell: Purify Duplicate Runes',
    tier: 'TIER_1_NOVICE',
    category: 'Sets & Linear Filtering',
    lorePrompt: 'Segel gerbang menerima daftar ID kristal yang terduplikasi dan harus dimurnikan dengan urutan asli terjaga.',
    problemStatement:
      'Pilih implementasi O(n) yang menghapus elemen duplikat dari array sambil mempertahankan urutan kemunculan pertama.',
    brokenCodeDisplay: [
      'function purifyRunes(ids) {',
      '  // TODO: return unique elements in original order in O(n)',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '[4, 2, 4, 1, 2]', expectedOutput: '[4, 2, 1]' },
      { label: 'Test Case 2', inputPreview: '["sol", "sol", "void"]', expectedOutput: '["sol", "void"]' },
      { label: 'Test Case 3', inputPreview: '[]', expectedOutput: '[]' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'return Array.from(new Set(ids));',
        explanation: 'Set di JavaScript/ES6 mempertahankan urutan penyisipan dengan kompleksitas rata-rata O(n).',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return ids.sort().slice(0, 1);',
        explanation: 'Salah karena memutasi urutan dan membuang hampir semua elemen.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return ids.map((x) => x * 2);',
        explanation: 'Salah karena tidak menghapus duplikat.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['new Set', 'Set(ids)'],
    rewardGems: 150,
    rewardDust: 40,
    permanentBuffPct: { atkPct: 2, hpPct: 3, defPct: 1, critPct: 1 },
  },
  {
    id: 'spell-03-palindrome-sigil',
    code: 'SPELL-103',
    title: 'Spell: Mirror Sigil Verification',
    tier: 'SPELL-103' ? 'TIER_1_NOVICE' : 'TIER_1_NOVICE',
    category: 'Two-Pointer String Logic',
    lorePrompt: 'Mantra cermin hanya aktif jika rangkaian rune dibaca identik dari depan maupun belakang.',
    problemStatement:
      'Pilih algoritma dua penunjuk (two-pointer) yang memeriksa palindrom dalam ruang memori O(1) tanpa mengalokasikan array baru.',
    brokenCodeDisplay: [
      'function isMirrorSigil(str) {',
      '  let left = 0, right = str.length - 1;',
      '  // Complete the loop condition',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '"LEVEL"', expectedOutput: 'true' },
      { label: 'Test Case 2', inputPreview: '"AETHEL"', expectedOutput: 'false' },
      { label: 'Test Case 3', inputPreview: '"RADAR"', expectedOutput: 'true' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'while (left < right) {\n  if (str[left] !== str[right]) return false;\n  left++; right--;\n}\nreturn true;',
        explanation: 'Membandingkan karakter ujung ke tengah secara in-place O(n) waktu dan O(1) memori.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return str[0] === str[1];',
        explanation: 'Hanya memeriksa dua karakter pertama.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'while (left < right) { left++; } return false;',
        explanation: 'Selalu mengembalikan false.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['left < right', 'str[left] !== str[right]'],
    rewardGems: 150,
    rewardDust: 40,
    permanentBuffPct: { atkPct: 2, hpPct: 2, defPct: 2, critPct: 1 },
  },
  {
    id: 'spell-04-clamp-mana',
    code: 'SPELL-104',
    title: 'Spell:Mana Overflow Limiter',
    tier: 'TIER_1_NOVICE',
    category: 'Boundary Arithmetic',
    lorePrompt: 'Reaktor mana akan meledak jika nilai energi turun di bawah min atau melampaui batas max.',
    problemStatement:
      'Pilih ekspresi matematika yang membatasi (clamp) nilai x agar selalu berada di dalam rentang tertutup [min, max].',
    brokenCodeDisplay: [
      'function clampMana(x, min, max) {',
      '  // Clamp x into [min, max]',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'clampMana(140, 0, 100)', expectedOutput: '100' },
      { label: 'Test Case 2', inputPreview: 'clampMana(-25, 0, 100)', expectedOutput: '0' },
      { label: 'Test Case 3', inputPreview: 'clampMana(65, 0, 100)', expectedOutput: '65' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'return Math.min(max, Math.max(min, x));',
        explanation: 'Math.max(min, x) menjaga batas bawah dan Math.min(max, ...) menjaga batas atas.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return Math.max(max, Math.min(min, x));',
        explanation: 'Terbalik sehingga selalu mengembalikan max.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return (x + min + max) / 3;',
        explanation: 'Menghitung rata-rata, bukan fungsi clamp.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['Math.min(max, Math.max(min, x))', 'Math.max(min, Math.min(max, x))'],
    rewardGems: 150,
    rewardDust: 40,
    permanentBuffPct: { atkPct: 2, hpPct: 2, defPct: 2, critPct: 1 },
  },
  {
    id: 'spell-05-null-coalesce-telemetry',
    code: 'SPELL-105',
    title: 'Spell: Honest Null Telemetry Filter',
    tier: 'TIER_1_NOVICE',
    category: 'Data Hygiene & Null Safety',
    lorePrompt: 'Sensor menara mengirimkan nilai 0 yang valid serta nilai null saat sensor mati. Nilai 0 tidak boleh dianggap hilang!',
    problemStatement:
      'Saring array pembacaan sensor agar hanya membuang null dan undefined, namun tetap mempertahankan angka 0 yang sah.',
    brokenCodeDisplay: [
      'function filterValidReadings(readings) {',
      '  // BUG: readings.filter(Boolean) drops valid 0 values!',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '[12, 0, null, 8, undefined]', expectedOutput: '[12, 0, 8]' },
      { label: 'Test Case 2', inputPreview: '[0, 0, null]', expectedOutput: '[0, 0]' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'return readings.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));',
        explanation: 'Mempertahankan angka 0 secara jujur dan hanya menyaring nilai kosong/NaN.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return readings.filter(Boolean);',
        explanation: 'Salah karena 0 bersifat falsy dan ikut terhapus.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return readings.map((v) => v || 10);',
        explanation: 'Salah karena memalsukan nilai 0 dan null menjadi 10.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['v !== null', 'v != null'],
    rewardGems: 150,
    rewardDust: 40,
    permanentBuffPct: { atkPct: 2, hpPct: 3, defPct: 1, critPct: 1 },
  },
  {
    id: 'spell-06-linear-search-sentinel',
    code: 'SPELL-106',
    title: 'Spell: First Threshold Breach Index',
    tier: 'TIER_1_NOVICE',
    category: 'Array Scanning',
    lorePrompt: 'Temukan indeks waktu pertama saat gelombang energi musuh melampaui ambang perisai.',
    problemStatement:
      'Kembalikan indeks elemen pertama yang strictly lebih besar dari threshold, atau -1 jika tidak ada.',
    brokenCodeDisplay: [
      'function findFirstBreach(waves, threshold) {',
      '  // Return first index i where waves[i] > threshold, else -1',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '([40, 85, 120, 95], 100)', expectedOutput: '2' },
      { label: 'Test Case 2', inputPreview: '([10, 20, 30], 50)', expectedOutput: '-1' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'for (let i = 0; i < waves.length; i++) {\n  if (waves[i] > threshold) return i;\n}\nreturn -1;',
        explanation: 'Pemindaian linier berhenti segera pada pelanggaran ambang pertama.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return waves.filter((w) => w > threshold).length;',
        explanation: 'Mengembalikan jumlah elemen, bukan indeks pertama.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return waves.indexOf(threshold);',
        explanation: 'Hanya mencari kesamaan persis, bukan perbandingan > threshold.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['waves[i] > threshold', 'findIndex'],
    rewardGems: 150,
    rewardDust: 40,
    permanentBuffPct: { atkPct: 3, hpPct: 1, defPct: 2, critPct: 1 },
  },

  // ==================== TIER 2: ADEPT ALGORITHMS (6 Spells) ====================
  {
    id: 'spell-07-binary-search-floor',
    code: 'SPELL-201',
    title: 'Spell: Logarithmic Spire Floor Locator',
    tier: 'TIER_2_ADEPT',
    category: 'Binary Search O(log n)',
    lorePrompt: 'Menara memiliki ribuan lantai terurut; pencarian linier terlalu lambat untuk menemukan portal teleportasi.',
    problemStatement:
      'Pilih implementasi Binary Search O(log n) yang bebas dari bug integer overflow pada perhitungan titik tengah.',
    brokenCodeDisplay: [
      'function binarySearchFloor(sortedFloors, target) {',
      '  let lo = 0, hi = sortedFloors.length - 1;',
      '  // Complete binary search loop',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '([10, 20, 35, 50, 88], 50)', expectedOutput: '3' },
      { label: 'Test Case 2', inputPreview: '([10, 20, 35, 50, 88], 42)', expectedOutput: '-1' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'while (lo <= hi) {\n  const mid = lo + ((hi - lo) >> 1);\n  if (sortedFloors[mid] === target) return mid;\n  if (sortedFloors[mid] < target) lo = mid + 1;\n  else hi = mid - 1;\n}\nreturn -1;',
        explanation: 'Membagi dua ruang pencarian secara tepat dalam O(log n) waktu.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'while (lo < hi) { lo++; } return lo;',
        explanation: 'Ini pencarian linier O(n) dan tidak memeriksa target.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'const mid = Math.floor(sortedFloors.length / 2);\nreturn sortedFloors[mid] === target ? mid : -1;',
        explanation: 'Hanya memeriksa satu elemen tengah tanpa perulangan.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['lo <= hi', 'lo + ((hi - lo)', 'mid + 1', 'mid - 1'],
    rewardGems: 200,
    rewardDust: 60,
    permanentBuffPct: { atkPct: 3, hpPct: 3, defPct: 2, critPct: 1 },
  },
  {
    id: 'spell-08-two-sum-resonance',
    code: 'SPELL-202',
    title: 'Spell: Harmonic Crystal Pair (Hash Map O(n))',
    tier: 'TIER_2_ADEPT',
    category: 'Hash Map Lookup',
    lorePrompt: 'Dua kristal harus digabungkan agar jumlah energinya tepat sama dengan frekuensi resonansi altar.',
    problemStatement:
      'Temukan pasangan indeks [i, j] sehingga nums[i] + nums[j] === target dalam satu lintasan O(n) menggunakan Map.',
    brokenCodeDisplay: [
      'function findResonancePair(nums, target) {',
      '  const seen = new Map();',
      '  // Complete O(n) complement lookup',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '([2, 7, 11, 15], 9)', expectedOutput: '[0, 1]' },
      { label: 'Test Case 2', inputPreview: '([3, 2, 4], 6)', expectedOutput: '[1, 2]' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'for (let i = 0; i < nums.length; i++) {\n  const comp = target - nums[i];\n  if (seen.has(comp)) return [seen.get(comp), i];\n  seen.set(nums[i], i);\n}\nreturn [-1, -1];',
        explanation: 'Pencarian komplemen di Map berjalan dalam O(1) per elemen sehingga total waktu O(n).',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return [0, nums.length - 1];',
        explanation: 'Mengembalikan indeks ujung tanpa memeriksa jumlahnya.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'seen.set(target, 0); return [0, 0];',
        explanation: 'Tidak boleh menggunakan elemen yang sama dua kali.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['target - nums[i]', 'seen.has'],
    rewardGems: 200,
    rewardDust: 60,
    permanentBuffPct: { atkPct: 3, hpPct: 2, defPct: 2, critPct: 2 },
  },
  {
    id: 'spell-09-balanced-runes-stack',
    code: 'SPELL-203',
    title: 'Spell: Balanced Bracket Ward',
    tier: 'TIER_2_ADEPT',
    category: 'Stack LIFO Verification',
    lorePrompt: 'Mantra pelindung menggunakan kurung (), {}, dan [] yang harus dibuka dan ditutup dalam urutan LIFO yang sah.',
    problemStatement:
      'Pilih algoritma berbasis Stack yang memvalidasi keseimbangan kurung pembuka dan penutup.',
    brokenCodeDisplay: [
      'function isWardBalanced(s) {',
      '  const stack = [];',
      '  const pairs = { ")": "(", "]": "[", "}": "{" };',
      '  // Validate every token in s',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '"{[()]}"', expectedOutput: 'true' },
      { label: 'Test Case 2', inputPreview: '"{[(])}"', expectedOutput: 'false' },
      { label: 'Test Case 3', inputPreview: '"((("', expectedOutput: 'false' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'for (const ch of s) {\n  if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);\n  else if (pairs[ch]) {\n    if (stack.pop() !== pairs[ch]) return false;\n  }\n}\nreturn stack.length === 0;',
        explanation: 'Memastikan setiap penutup cocok dengan pembuka terakhir di puncak stack dan stack kosong di akhir.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return s.length % 2 === 0;',
        explanation: 'Panjang genap belum tentu seimbang, misalnya ")(".',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return s[0] === "(" && s[s.length - 1] === ")";',
        explanation: 'Mengabaikan struktur kurung di bagian tengah.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['stack.pop() !== pairs[ch]', 'stack.length === 0'],
    rewardGems: 200,
    rewardDust: 60,
    permanentBuffPct: { atkPct: 2, hpPct: 3, defPct: 3, critPct: 1 },
  },
  {
    id: 'spell-10-sliding-window-dps',
    code: 'SPELL-204',
    title: 'Spell: Peak Burst Window (Sliding Window)',
    tier: 'TIER_2_ADEPT',
    category: 'Sliding Window O(n)',
    lorePrompt: 'Hitung total kerusakan maksimum dalam k detik berturut-turut tanpa menghitung ulang seluruh sub-array dari awal.',
    problemStatement:
      'Pilih implementasi Sliding Window berukuran tetap k dengan kompleksitas waktu O(n).',
    brokenCodeDisplay: [
      'function maxWindowDamage(dmg, k) {',
      '  // Compute maximum sum of any contiguous subarray of length k',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '([2, 1, 5, 1, 3, 2], 3)', expectedOutput: '9 (5+1+3)' },
      { label: 'Test Case 2', inputPreview: '([4, 2, 1, 7, 8, 1, 2], 2)', expectedOutput: '15 (7+8)' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'let windowSum = 0;\nfor (let i = 0; i < k; i++) windowSum += dmg[i];\nlet maxSum = windowSum;\nfor (let i = k; i < dmg.length; i++) {\n  windowSum += dmg[i] - dmg[i - k];\n  if (windowSum > maxSum) maxSum = windowSum;\n}\nreturn maxSum;',
        explanation: 'Menggeser jendela dengan menambah elemen kanan dan mengurangi elemen kiri dalam O(1) per langkah.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return dmg.slice(0, k).reduce((a, b) => a + b, 0);',
        explanation: 'Hanya menghitung jendela pertama.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return Math.max(...dmg) * k;',
        explanation: 'Mengasumsikan elemen terbesar muncul k kali berturut-turut.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['dmg[i] - dmg[i - k]', 'windowSum > maxSum'],
    rewardGems: 200,
    rewardDust: 60,
    permanentBuffPct: { atkPct: 4, hpPct: 2, defPct: 1, critPct: 2 },
  },
  {
    id: 'spell-11-ispu-piecewise-lerp',
    code: 'SPELL-205',
    title: 'Spell: Piecewise Linear Aether Index',
    tier: 'TIER_2_ADEPT',
    category: 'Numerical Interpolation',
    lorePrompt: 'Konversikan kerapatan mana mentah Xx menjadi indeks standar menggunakan batas bawah (Xb, Ib) dan batas atas (Xa, Ia).',
    problemStatement:
      'Pilih rumus interpolasi linier sepotong-sepotong (piecewise linear interpolation) yang akurat.',
    brokenCodeDisplay: [
      'function interpolateIndex(Xx, Xb, Xa, Ib, Ia) {',
      '  // Compute linear interpolation between (Xb, Ib) and (Xa, Ia)',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'interpolateIndex(55, 50, 100, 50, 100)', expectedOutput: '55' },
      { label: 'Test Case 2', inputPreview: 'interpolateIndex(125, 100, 150, 100, 200)', expectedOutput: '150' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'return Math.round(((Ia - Ib) / (Xa - Xb)) * (Xx - Xb) + Ib);',
        explanation: 'Rumus kanonis interpolasi linier antara dua titik batas (Xb, Ib) dan (Xa, Ia).',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return Math.round((Ia + Ib) / 2);',
        explanation: 'Mengabaikan nilai aktual Xx.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return Math.round((Xx - Xa) * (Ia - Ib));',
        explanation: 'Tidak membagi dengan rentang (Xa - Xb).',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['(Ia - Ib) / (Xa - Xb)', '(Xx - Xb) + Ib'],
    rewardGems: 200,
    rewardDust: 60,
    permanentBuffPct: { atkPct: 3, hpPct: 3, defPct: 2, critPct: 1 },
  },
  {
    id: 'spell-12-csv-formula-shield',
    code: 'SPELL-206',
    title: 'Spell: Grimoire Scroll Injection Sanitizer',
    tier: 'TIER_2_ADEPT',
    category: 'Security Engineering',
    lorePrompt: 'Penyusup mencoba menyisipkan formula berbahaya (=CMD, +SUM, @IMPORT) ke dalam gulungan log guild.',
    problemStatement:
      'Pilih fungsi sanitasi yang menetralkan karakter pemicu eksekusi formula di awal string dengan menambahkan tanda kutip tunggal.',
    brokenCodeDisplay: [
      'function sanitizeScrollCell(cellText) {',
      '  // Neutralize leading =, +, -, @, \\t, \\r',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '"=1+1"', expectedOutput: "\'=1+1" },
      { label: 'Test Case 2', inputPreview: '"Normal Text"', expectedOutput: '"Normal Text"' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'return /^[=+\\-@\\t\\r]/.test(cellText) ? "\'" + cellText : cellText;',
        explanation: 'Menambahkan prefix apostrof pada sel yang diawali karakter formula berbahaya.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return cellText.toLowerCase();',
        explanation: 'Huruf kecil tidak menghentikan eksekusi formula.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return cellText.slice(1);',
        explanation: 'Merusak teks normal dengan memotong huruf pertama.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['/^[=+\\-@', '"\'" + cellText'],
    rewardGems: 200,
    rewardDust: 60,
    permanentBuffPct: { atkPct: 2, hpPct: 3, defPct: 3, critPct: 1 },
  },

  // ==================== TIER 3: MAGUS GRAPH & DP (6 Spells) ====================
  {
    id: 'spell-13-bfs-shortest-spire',
    code: 'SPELL-301',
    title: 'Spell: Shortest Astral Warp Path (BFS)',
    tier: 'TIER_3_MAGUS',
    category: 'Graph Breadth-First Search',
    lorePrompt: 'Temukan jumlah lompatan portal minimum dari ruang awal menuju ruang tahta pada graf tak berbobot.',
    problemStatement:
      'Pilih struktur antrean (FIFO Queue) dan pelacakan visited pada Breadth-First Search (BFS) agar menjamin jalur terpendek.',
    brokenCodeDisplay: [
      'function shortestWarpHops(adj, start, goal) {',
      '  const queue = [[start, 0]];',
      '  const visited = new Set([start]);',
      '  // Complete BFS traversal',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'A->B->D, A->C->D (start A, goal D)', expectedOutput: '2 hops' },
      { label: 'Test Case 2', inputPreview: 'Disconnected node Z', expectedOutput: '-1' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'while (queue.length > 0) {\n  const [node, dist] = queue.shift();\n  if (node === goal) return dist;\n  for (const next of (adj[node] || [])) {\n    if (!visited.has(next)) {\n      visited.add(next);\n      queue.push([next, dist + 1]);\n    }\n  }\n}\nreturn -1;',
        explanation: 'BFS menjelajahi graf lapis demi lapis berdasarkan jarak sehingga kunjungan pertama ke goal pasti terpendek.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'const [node, dist] = queue.pop(); return dist;',
        explanation: 'Menggunakan pop() mengubahnya menjadi DFS dan keluar setelah satu langkah.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return Object.keys(adj).length;',
        explanation: 'Mengembalikan jumlah simpul total, bukan panjang jalur terpendek.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['queue.shift()', 'visited.add(next)', 'dist + 1'],
    rewardGems: 250,
    rewardDust: 85,
    permanentBuffPct: { atkPct: 4, hpPct: 3, defPct: 2, critPct: 2 },
  },
  {
    id: 'spell-14-dp-staircase-ascension',
    code: 'SPELL-302',
    title: 'Spell: Spire Staircase Combinatorics (DP)',
    tier: 'TIER_3_MAGUS',
    category: 'Dynamic Programming O(n)',
    lorePrompt: 'Seorang Hunter dapat melompat 1 atau 2 anak tangga sekaligus. Hitung jumlah cara berbeda mencapai anak tangga ke-n.',
    problemStatement:
      'Pilih solusi Dynamic Programming O(n) waktu dan O(1) ruang tanpa rekursi eksponensial O(2^n).',
    brokenCodeDisplay: [
      'function countAscensionWays(n) {',
      '  if (n <= 2) return n;',
      '  // Compute ways(n) iteratively in O(1) space',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'n = 3', expectedOutput: '3' },
      { label: 'Test Case 2', inputPreview: 'n = 5', expectedOutput: '8' },
      { label: 'Test Case 3', inputPreview: 'n = 10', expectedOutput: '89' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'let prev2 = 1, prev1 = 2;\nfor (let i = 3; i <= n; i++) {\n  const curr = prev1 + prev2;\n  prev2 = prev1;\n  prev1 = curr;\n}\nreturn prev1;',
        explanation: 'Transisi DP bottom-up menggunakan dua variabel state dalam waktu O(n) dan memori O(1).',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return n * (n - 1);',
        explanation: 'Bukan relasi rekurensi Fibonacci tangga.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return Math.pow(2, n);',
        explanation: 'Salah karena menghitung seluruh subset, bukan langkah 1 atau 2.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['prev1 + prev2', 'prev2 = prev1'],
    rewardGems: 250,
    rewardDust: 85,
    permanentBuffPct: { atkPct: 3, hpPct: 4, defPct: 2, critPct: 2 },
  },
  {
    id: 'spell-15-kadane-aether-surge',
    code: 'SPELL-303',
    title: 'Spell: Maximum Contiguous Aether Surge (Kadane)',
    tier: 'TIER_3_MAGUS',
    category: 'Dynamic Programming / Kadane',
    lorePrompt: 'Aliran energi menara berfluktuasi positif dan negatif. Temukan rentang waktu kontinu dengan total lonjakan terbesar.',
    problemStatement:
      'Pilih algoritma Kadane O(n) untuk mencari jumlah subarray kontigu maksimum.',
    brokenCodeDisplay: [
      'function maxAetherSurge(deltas) {',
      '  let currentMax = deltas[0], globalMax = deltas[0];',
      '  // Complete Kadane iteration from i = 1',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6 ([4, -1, 2, 1])' },
      { label: 'Test Case 2', inputPreview: '[5, 4, -1, 7, 8]', expectedOutput: '23' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'for (let i = 1; i < deltas.length; i++) {\n  currentMax = Math.max(deltas[i], currentMax + deltas[i]);\n  globalMax = Math.max(globalMax, currentMax);\n}\nreturn globalMax;',
        explanation: 'Pada setiap indeks, putuskan apakah melanjutkan subarray sebelumnya atau memulai baru dari deltas[i].',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return deltas.filter((x) => x > 0).reduce((a, b) => a + b, 0);',
        explanation: 'Menjumlahkan elemen tidak bersebelahan (bukan subarray kontigu).',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return deltas[0] + deltas[deltas.length - 1];',
        explanation: 'Hanya menjumlahkan elemen pertama dan terakhir.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['Math.max(deltas[i], currentMax + deltas[i])', 'Math.max(globalMax, currentMax)'],
    rewardGems: 250,
    rewardDust: 85,
    permanentBuffPct: { atkPct: 4, hpPct: 2, defPct: 3, critPct: 2 },
  },
  {
    id: 'spell-16-merge-intervals-shield',
    code: 'SPELL-304',
    title: 'Spell: Coalesce Overlapping Shield Windows',
    tier: 'TIER_3_MAGUS',
    category: 'Sorting & Interval Merging',
    lorePrompt: 'Beberapa ksatria mengaktifkan perisai pada rentang waktu yang saling tumpang tindih. Gabungkan menjadi interval bersih.',
    problemStatement:
      'Setelah mengurutkan interval berdasarkan waktu mulai, gabungkan dua interval jika next[0] <= current[1].',
    brokenCodeDisplay: [
      'function mergeShieldWindows(intervals) {',
      '  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);',
      '  const merged = [sorted[0]];',
      '  // Merge overlapping intervals',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '[[1,3], [2,6], [8,10]]', expectedOutput: '[[1,6], [8,10]]' },
      { label: 'Test Case 2', inputPreview: '[[1,4], [4,5]]', expectedOutput: '[[1,5]]' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'for (let i = 1; i < sorted.length; i++) {\n  const last = merged[merged.length - 1];\n  if (sorted[i][0] <= last[1]) last[1] = Math.max(last[1], sorted[i][1]);\n  else merged.push(sorted[i]);\n}\nreturn merged;',
        explanation: 'Memperluas batas akhir interval aktif jika tumpang tindih, atau menambah interval baru jika terpisah.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return [[sorted[0][0], sorted[sorted.length - 1][1]]];',
        explanation: 'Salah karena menggabungkan interval yang tidak tumpang tindih.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return sorted.slice(0, 1);',
        explanation: 'Membuang semua interval setelah indeks pertama.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['sorted[i][0] <= last[1]', 'Math.max(last[1], sorted[i][1])'],
    rewardGems: 250,
    rewardDust: 85,
    permanentBuffPct: { atkPct: 3, hpPct: 3, defPct: 3, critPct: 2 },
  },
  {
    id: 'spell-17-topological-craft-order',
    code: 'SPELL-305',
    title: 'Spell: Forge Dependency Resolution (Kahn DAG)',
    tier: 'TIER_3_MAGUS',
    category: 'Directed Acyclic Graphs',
    lorePrompt: 'Resep senjata mitos membutuhkan material prasyarat yang harus ditempa tanpa siklus dependensi.',
    problemStatement:
      'Dalam algoritma Kahn untuk Topological Sort, simpul mana yang pertama kali dimasukkan ke dalam antrean eksekusi?',
    brokenCodeDisplay: [
      'function resolveForgeOrder(numNodes, prerequisites) {',
      '  // Compute inDegree[] for every node 0..numNodes-1',
      '  // Which nodes enter the initial queue?',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '0 -> 1 -> 2', expectedOutput: '[0, 1, 2] (0 has in-degree 0)' },
      { label: 'Test Case 2', inputPreview: 'Cycle 0 <-> 1', expectedOutput: '[] (Cycle detected)' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'const queue = [];\nfor (let i = 0; i < numNodes; i++) {\n  if (inDegree[i] === 0) queue.push(i);\n}',
        explanation: 'Simpul dengan in-degree 0 tidak memiliki prasyarat yang belum selesai sehingga aman dieksekusi pertama.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'for (let i = 0; i < numNodes; i++) {\n  if (inDegree[i] > 2) queue.push(i);\n}',
        explanation: 'Salah karena simpul dengan in-degree > 0 masih menunggu prasyarat.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'queue.push(numNodes - 1);',
        explanation: 'Menebak simpul terakhir tanpa memeriksa derajat masuk.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['inDegree[i] === 0', 'inDegree'],
    rewardGems: 250,
    rewardDust: 85,
    permanentBuffPct: { atkPct: 4, hpPct: 3, defPct: 2, critPct: 2 },
  },
  {
    id: 'spell-18-hyndman-fan-quartile',
    code: 'SPELL-306',
    title: 'Spell: Type-7 Continuous Quantile Interpolator',
    tier: 'TIER_3_MAGUS',
    category: 'Statistical Computing',
    lorePrompt: 'Katalog statistik Menara harus menghasilkan nilai kuartil yang identik dengan NumPy dan R metode Type 7.',
    problemStatement:
      'Untuk array terurut a sepanjang n dan kuantil p dalam [0, 1], pilih indeks kontinu h = (n - 1) * p dan interpolasi liniernya.',
    brokenCodeDisplay: [
      'function quantileR7(sortedArr, p) {',
      '  const n = sortedArr.length;',
      '  // Compute Type-7 interpolated value',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: '([10, 20, 30, 40], 0.25)', expectedOutput: '17.5' },
      { label: 'Test Case 2', inputPreview: '([10, 20, 30, 40], 0.50)', expectedOutput: '25' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'const idx = (n - 1) * p;\nconst lo = Math.floor(idx);\nconst hi = Math.ceil(idx);\nconst frac = idx - lo;\nreturn sortedArr[lo] + frac * (sortedArr[hi] - sortedArr[lo]);',
        explanation: 'Definisi eksak Hyndman-Fan Type 7 dengan indeks berbasis-0: idx = (n - 1) * p.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return sortedArr[Math.floor(n * p)];',
        explanation: 'Tidak melakukan interpolasi linier antar elemen.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return (sortedArr[0] + sortedArr[n - 1]) * p;',
        explanation: 'Hanya bergantung pada nilai ekstrem minimum dan maksimum.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['(n - 1) * p', 'sortedArr[lo] + frac * (sortedArr[hi] - sortedArr[lo])'],
    rewardGems: 250,
    rewardDust: 85,
    permanentBuffPct: { atkPct: 3, hpPct: 3, defPct: 3, critPct: 2 },
  },

  // ==================== TIER 4: ARCHON SOVEREIGN TRIALS (6 Spells) ====================
  {
    id: 'spell-19-timing-safe-hmac',
    code: 'SPELL-401',
    title: 'Spell: Constant-Time Signature Shield',
    tier: 'TIER_4_ARCHON',
    category: 'Cryptographic Security',
    lorePrompt: 'Gerbang Sovereign memverifikasi tanda tangan HMAC. Perbandingan string biasa (===) rentan terhadap serangan timing side-channel!',
    problemStatement:
      'Pilih metode verifikasi yang membandingkan seluruh byte dalam waktu konstan apabila panjang kedua buffer sama.',
    brokenCodeDisplay: [
      'function verifyRuneMac(bufA, bufB) {',
      '  // Prevent timing side-channel leak',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'Matching 32-byte HMACs', expectedOutput: 'true (Constant-time)' },
      { label: 'Test Case 2', inputPreview: 'Differs at byte 0 vs byte 31', expectedOutput: 'false (Equal duration)' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'if (bufA.length !== bufB.length) return false;\nlet diff = 0;\nfor (let i = 0; i < bufA.length; i++) diff |= (bufA[i] ^ bufB[i]);\nreturn diff === 0;',
        explanation: 'Akumulasi bitwise XOR (atau crypto.timingSafeEqual) memeriksa setiap byte tanpa cabang keluar dini.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return bufA.toString() === bufB.toString();',
        explanation: 'Operator === berhenti pada byte pertama yang berbeda sehingga membocorkan informasi waktu.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return bufA[0] === bufB[0];',
        explanation: 'Hanya memeriksa byte pertama.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['bufA[i] ^ bufB[i]', 'timingSafeEqual', 'diff === 0'],
    rewardGems: 350,
    rewardDust: 120,
    permanentBuffPct: { atkPct: 5, hpPct: 4, defPct: 3, critPct: 3 },
  },
  {
    id: 'spell-20-dijkstra-aether-network',
    code: 'SPELL-402',
    title: 'Spell: Weighted Spire Conduit Routing (Dijkstra)',
    tier: 'TIER_4_ARCHON',
    category: 'Shortest Path on Weighted Graphs',
    lorePrompt: 'Setiap koridor menara memiliki biaya kehilangan mana non-negatif. Temukan rute dengan kehilangan mana terkecil.',
    problemStatement:
      'Pilih kondisi relaksasi tepi (edge relaxation) yang benar pada algoritma Dijkstra saat mengunjungi tetangga v dari u dengan bobot w.',
    brokenCodeDisplay: [
      '// Inside Dijkstra priority queue loop:',
      '// Current node u with distance dist[u], edge (u -> v) of weight w >= 0',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'Direct A->C cost 10 vs A->B->C cost 3+4=7', expectedOutput: '7 via B' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'if (dist[u] + w < dist[v]) {\n  dist[v] = dist[u] + w;\n  pq.push([dist[v], v]);\n}',
        explanation: 'Relaksasi memperbarui jarak terpendek ke v jika jalur melalui u lebih murah dari dist[v] saat ini.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'if (w < dist[v]) { dist[v] = w; }',
        explanation: 'Itu relaksasi Minimum Spanning Tree (Prim), bukan jalur terpendek dari sumber.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'dist[v] = dist[u] * w;',
        explanation: 'Mengalikan jarak alih-alih menjumlahkan bobot jalur.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['dist[u] + w < dist[v]', 'dist[v] = dist[u] + w'],
    rewardGems: 350,
    rewardDust: 120,
    permanentBuffPct: { atkPct: 5, hpPct: 3, defPct: 4, critPct: 3 },
  },
  {
    id: 'spell-21-knapsack-relic-loadout',
    code: 'SPELL-403',
    title: 'Spell: Optimal Relic Capacity (0/1 Knapsack DP)',
    tier: 'TIER_4_ARCHON',
    category: 'Combinatorial Optimization',
    lorePrompt: 'Kantung dimensi memiliki kapasitas beban W. Pilih kombinasi relik untuk memaksimalkan total Combat Power.',
    problemStatement:
      'Mengapa perulangan kapasitas w pada array 1D 0/1 Knapsack harus berjalan MUNDUR dari W turun ke weight[i]?',
    brokenCodeDisplay: [
      'for (const item of relics) {',
      '  // Why iterate w from W down to item.weight?',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'W=5, items=[(w:2,v:3),(w:3,v:4)]', expectedOutput: '7 (each item used at most once)' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'for (let w = W; w >= item.weight; w--) {\n  dp[w] = Math.max(dp[w], dp[w - item.weight] + item.value);\n}',
        explanation: 'Iterasi mundur memastikan dp[w - item.weight] berasal dari tahap item sebelumnya (mencegah item yang sama diambil berkali-kali).',
      },
      {
        id: 'opt-b',
        codeSnippet: 'for (let w = 0; w <= W; w++) { dp[w] = item.value; }',
        explanation: 'Menimpa seluruh tabel tanpa memeriksa bobot.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'dp[W] += item.value;',
        explanation: 'Mengabaikan batas kapasitas W.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['w = W; w >= item.weight; w--', 'dp[w - item.weight] + item.value'],
    rewardGems: 350,
    rewardDust: 120,
    permanentBuffPct: { atkPct: 4, hpPct: 5, defPct: 4, critPct: 2 },
  },
  {
    id: 'spell-22-lru-grimoire-cache',
    code: 'SPELL-404',
    title: 'Spell: O(1) Astral Memory Cache (LRU)',
    tier: 'TIER_4_ARCHON',
    category: 'System Design & Data Structures',
    lorePrompt: 'Perpustakaan Archon hanya menyimpan K gulungan aktif di memori cepat. Saat penuh, gulungan yang paling lama tidak diakses harus dikeluarkan.',
    problemStatement:
      'Pilih operasi yang wajib dilakukan saat sebuah kunci yang sudah ada di Map LRU diakses melalui get(key).',
    brokenCodeDisplay: [
      'get(key) {',
      '  if (!this.cache.has(key)) return -1;',
      '  // Refresh recency order in O(1)',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'Cap=2: put(1), put(2), get(1), put(3)', expectedOutput: 'Key 2 evicted, Key 1 kept' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'const val = this.cache.get(key);\nthis.cache.delete(key);\nthis.cache.set(key, val);\nreturn val;',
        explanation: 'Menghapus dan menyisipkan kembali kunci memindahkannya ke posisi paling baru (akhir iterasi Map) dalam O(1).',
      },
      {
        id: 'opt-b',
        codeSnippet: 'this.cache.clear();\nreturn 0;',
        explanation: 'Menghapus seluruh isi cache.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return this.cache.size;',
        explanation: 'Mengembalikan ukuran cache, bukan nilai kunci.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['this.cache.delete(key)', 'this.cache.set(key, val)'],
    rewardGems: 350,
    rewardDust: 120,
    permanentBuffPct: { atkPct: 4, hpPct: 4, defPct: 4, critPct: 3 },
  },
  {
    id: 'spell-23-fenwick-prefix-mana',
    code: 'SPELL-405',
    title: 'Spell: Binary Indexed Tree Range Pulse',
    tier: 'TIER_4_ARCHON',
    category: 'Advanced Trees / Fenwick',
    lorePrompt: 'Pantau akumulasi energi lantai 1..idx secara real-time dalam O(log n) menggunakan Fenwick Tree (Binary Indexed Tree).',
    problemStatement:
      'Pilih operasi bitwise untuk melompat ke simpul induk berikutnya saat menghitung prefixSum(idx) pada Fenwick Tree 1-indexed.',
    brokenCodeDisplay: [
      'function prefixSum(tree, idx) {',
      '  let sum = 0;',
      '  // Strip lowest set bit in each step',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'idx = 7 (binary 0111)', expectedOutput: 'tree[7] + tree[6] + tree[4]' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet: 'while (idx > 0) {\n  sum += tree[idx];\n  idx -= idx & -idx;\n}\nreturn sum;',
        explanation: 'Ekspresi (idx & -idx) mengekstrak bit bernilai 1 paling kanan (LSB) sehingga pengurangan berjalan dalam O(log n).',
      },
      {
        id: 'opt-b',
        codeSnippet: 'while (idx > 0) { sum += tree[idx]; idx--; } return sum;',
        explanation: 'Pengurangan 1 demi 1 berjalan dalam O(n) dan menjumlahkan bucket yang tumpang tindih.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return tree[idx] * idx;',
        explanation: 'Bukan jumlah prefix.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['idx & -idx', 'idx -= idx & -idx'],
    rewardGems: 350,
    rewardDust: 120,
    permanentBuffPct: { atkPct: 5, hpPct: 4, defPct: 3, critPct: 3 },
  },
  {
    id: 'spell-24-deterministic-pity-prng',
    code: 'SPELL-406',
    title: 'Spell: Sovereign Pity Convergence Proof',
    tier: 'TIER_4_ARCHON',
    category: 'Probability & Game Systems',
    lorePrompt: 'Altar Gacha menjamin ★5 pada tarikan ke-50 (Hard Pity) dan menaikkan peluang sebesar +4.5% per tarikan mulai tarikan ke-35 (Soft Pity).',
    problemStatement:
      'Pilih fungsi perhitungan peluang efektif ★5 pada tarikan ke-n (1-indexed) dengan baseRate = 0.03.',
    brokenCodeDisplay: [
      'function effectiveFiveStarRate(pullNumber) {',
      '  // Hard pity at 50 (100%), soft pity starts at 35 (+0.045 per pull)',
      '}',
    ].join('\n'),
    testCases: [
      { label: 'Test Case 1', inputPreview: 'pullNumber = 10', expectedOutput: '0.03 (3%)' },
      { label: 'Test Case 2', inputPreview: 'pullNumber = 40', expectedOutput: '0.30 (3% + 6 * 4.5%)' },
      { label: 'Test Case 3', inputPreview: 'pullNumber = 50', expectedOutput: '1.00 (100% Guaranteed)' },
    ],
    options: [
      {
        id: 'opt-a',
        codeSnippet:
          'if (pullNumber >= 50) return 1.0;\nif (pullNumber < 35) return 0.03;\nreturn Math.min(1.0, Number((0.03 + (pullNumber - 34) * 0.045).toFixed(4)));',
        explanation: 'Menjamin 100% pada tarikan ke-50 dan meningkatkan peluang secara linier mulai tarikan ke-35.',
      },
      {
        id: 'opt-b',
        codeSnippet: 'return 0.03;',
        explanation: 'Mengabaikan sistem soft pity dan hard pity.',
      },
      {
        id: 'opt-c',
        codeSnippet: 'return pullNumber / 100;',
        explanation: 'Pada tarikan ke-50 hanya memberi 50%, bukan jaminan 100%.',
      },
    ],
    correctOptionId: 'opt-a',
    canonicalKeywords: ['pullNumber >= 50', '(pullNumber - 34) * 0.045'],
    rewardGems: 400,
    rewardDust: 150,
    permanentBuffPct: { atkPct: 6, hpPct: 5, defPct: 4, critPct: 4 },
  },
]);

const SPELL_MAP = new Map<string, CodeSpellChallenge>(
  CODE_SPELLS_CATALOG.map((spell) => [spell.id, spell])
);

export function getCodeSpellById(spellId: string): CodeSpellChallenge | undefined {
  return SPELL_MAP.get(spellId);
}

export function getCodeSpellsByTier(tier: CodeSpellTier): readonly CodeSpellChallenge[] {
  return CODE_SPELLS_CATALOG.filter((s) => s.tier === tier);
}
