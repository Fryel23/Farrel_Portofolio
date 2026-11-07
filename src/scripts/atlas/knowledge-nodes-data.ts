/**
 * src/scripts/atlas/knowledge-nodes-data.ts
 * Basis Data Konstelasi Pengetahuan "The Data Atlas Crypt" (/atlas - V15.0).
 *
 * Berisi tepat 36 Simpul Pengetahuan (Knowledge Nodes) dan 52 Sinapsis (Edges)
 * yang terbagi ke dalam 4 Klaster Keilmuan Farrel Islami Putra:
 *  1. DATA_SCIENCE (#10B981 - Emerald): 9 simpul
 *  2. SOFTWARE_AI (#3B82F6 - Royal Blue): 9 simpul
 *  3. QUANTITATIVE_SYSTEMS (#F59E0B - Amber Gold): 9 simpul
 *  4. COGNITIVE_STRATEGY (#8B5CF6 - Violet): 9 simpul
 */

export type AtlasClusterId =
  | 'DATA_SCIENCE'
  | 'SOFTWARE_AI'
  | 'QUANTITATIVE_SYSTEMS'
  | 'COGNITIVE_STRATEGY';

export interface AtlasClusterMeta {
  readonly id: AtlasClusterId;
  readonly code: string;
  readonly label: string;
  readonly color: string;
  readonly glowColor: string;
  readonly description: string;
}

export interface AtlasKnowledgeNode {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly cluster: AtlasClusterId;
  readonly status: 'Primary Focus' | 'Active Exploration' | 'Foundational Study';
  readonly summary: string;
  readonly technicalNote: string;
  readonly relatedRoute?: string;
  readonly relatedLabel?: string;
  readonly baseX: number;
  readonly baseY: number;
  readonly radius: number;
}

export interface AtlasKnowledgeEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly relation: string;
  readonly weight: number;
}

export const ATLAS_CLUSTERS: readonly AtlasClusterMeta[] = Object.freeze([
  {
    id: 'DATA_SCIENCE',
    code: 'CL-01',
    label: 'Data Science & Environmental Analytics',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    description:
      'Pembersihan deret waktu, interpolasi sub-indeks ISPU PermenLHK P.14/2020, kuartil R-7, dan eksplorasi kualitas udara Cirebon 2021-2025.',
  },
  {
    id: 'SOFTWARE_AI',
    code: 'CL-02',
    label: 'Software Architecture, Web Workers, & AI',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.35)',
    description:
      'Arsitektur Astro Islands, TypeScript murni, parser RFC 4180 di Web Worker, keamanan aplikasi, dan fondasi pembelajaran mesin.',
  },
  {
    id: 'QUANTITATIVE_SYSTEMS',
    code: 'CL-03',
    label: 'Quantitative Modeling, SQL, & IoT Systems',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    description:
      'Pemodelan relasional SQL, deret waktu pasar finansial, kalkulus diskrit, serta telemetri jaringan sensor lingkungan.',
  },
  {
    id: 'COGNITIVE_STRATEGY',
    code: 'CL-04',
    label: 'Computational Logic & Strategic Thinking',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.35)',
    description:
      'Algoritma graf, struktur data, pola pikir komputasional UNIKOM, kejujuran metodologi riset, dan pengambilan keputusan taktis.',
  },
]);

export const ATLAS_NODES: readonly AtlasKnowledgeNode[] = Object.freeze([
  // ==================== CLUSTER 1: DATA_SCIENCE (9 Nodes) ====================
  {
    id: 'ds-ispu-p14',
    code: 'DS-01',
    title: 'ISPU Piecewise Linear Interpolation (P.14/2020)',
    cluster: 'DATA_SCIENCE',
    status: 'Primary Focus',
    summary:
      'Konversi konsentrasi polutan ambien (µg/Nm³) menjadi Indeks Standar Pencemar Udara berdasarkan tabel batas PermenLHK No. P.14/2020.',
    technicalNote: 'I = ((Ia - Ib) / (Xa - Xb)) * (Xx - Xb) + Ib',
    relatedRoute: '/lab/methodology',
    relatedLabel: 'Buka Metodologi ISPU (/lab/methodology)',
    baseX: 230,
    baseY: 165,
    radius: 9,
  },
  {
    id: 'ds-cirebon-aqi',
    code: 'DS-02',
    title: 'Cirebon Air Quality Time-Series (2021–2025)',
    cluster: 'DATA_SCIENCE',
    status: 'Primary Focus',
    summary:
      'Analisis longitudinal 200 baris observasi resmi DLH Kota Cirebon pada 23 titik pantau untuk parameter SO₂ dan NO₂.',
    technicalNote: '23 titik pantau · 2023 kosong jujur · 2025 parsial Tahap I (4 stasiun)',
    relatedRoute: '/work/aqi-cirebon',
    relatedLabel: 'Baca Studi Kasus AQI (/work/aqi-cirebon)',
    baseX: 165,
    baseY: 230,
    radius: 10,
  },
  {
    id: 'ds-missing-honesty',
    code: 'DS-03',
    title: 'Honest Null & Missing-Data Representation',
    cluster: 'DATA_SCIENCE',
    status: 'Primary Focus',
    summary:
      'Prinsip mempertahankan nilai kosong sebagai null (gap visual pada grafik) tanpa imputasi sintetis yang memalsukan tren.',
    technicalNote: 'Chart.js spanGaps: false · Explicit null preservation',
    relatedRoute: '/lab',
    relatedLabel: 'Uji di Data Lab (/lab)',
    baseX: 120,
    baseY: 140,
    radius: 7,
  },
  {
    id: 'ds-hyndman-fan-r7',
    code: 'DS-04',
    title: 'Hyndman-Fan Type 7 Quartiles & IQR',
    cluster: 'DATA_SCIENCE',
    status: 'Primary Focus',
    summary:
      'Perhitungan kuartil Q1, median, Q3, dan rentang interkuartil (IQR) yang kompatibel dengan NumPy, pandas, dan R default.',
    technicalNote: 'h = (n - 1) * p + 1 · Outlier fence [Q1 - 1.5*IQR, Q3 + 1.5*IQR]',
    relatedRoute: '/lab/csv',
    relatedLabel: 'Coba di CSV Profiler (/lab/csv)',
    baseX: 295,
    baseY: 115,
    radius: 7,
  },
  {
    id: 'ds-pearson-corr',
    code: 'DS-05',
    title: 'Pairwise Pearson Correlation Matrix',
    cluster: 'DATA_SCIENCE',
    status: 'Active Exploration',
    summary:
      'Pengukuran kekuatan hubungan linier antar kolom numerik dengan penanganan pasangan nilai hilang secara pairwise-complete.',
    technicalNote: 'r = cov(X, Y) / (sigma_X * sigma_Y) pada pasangan valid n >= 3',
    relatedRoute: '/lab/csv',
    relatedLabel: 'Inspeksi Korelasi CSV (/lab/csv)',
    baseX: 335,
    baseY: 205,
    radius: 7,
  },
  {
    id: 'ds-spatial-corridors',
    code: 'DS-06',
    title: 'Urban Corridor & Industrial Spatial Mapping',
    cluster: 'DATA_SCIENCE',
    status: 'Primary Focus',
    summary:
      'Pemetaan titik pantau ke dalam 4 zona fungsional: Koridor Jalan Utama, Pelabuhan & Industri, Pusat Niaga, dan Pemukiman.',
    technicalNote: '23 stasiun dipetakan ke skematik spasial SVG interaktif',
    relatedRoute: '/lab',
    relatedLabel: 'Lihat Peta Stasiun (/lab)',
    baseX: 185,
    baseY: 310,
    radius: 8,
  },
  {
    id: 'ds-so2-no2-kinetics',
    code: 'DS-07',
    title: 'SO₂ & NO₂ Ambient Pollutant Dynamics',
    cluster: 'DATA_SCIENCE',
    status: 'Active Exploration',
    summary:
      'Perbandingan perilaku emisi sulfur dioksida (pembakaran bahan bakar/industri) dan nitrogen dioksida (lalu lintas kendaraan).',
    technicalNote: 'Basis waktu P.14/2020 24-jam vs pengukuran sesaat 1-jam',
    relatedRoute: '/lab/methodology',
    relatedLabel: 'Pelajari Basis Waktu (/lab/methodology)',
    baseX: 95,
    baseY: 270,
    radius: 7,
  },
  {
    id: 'ds-pandas-wrangling',
    code: 'DS-08',
    title: 'Python & pandas Data Wrangling Pipeline',
    cluster: 'DATA_SCIENCE',
    status: 'Active Exploration',
    summary:
      'Pembersihan dataset mentah CSV, deduplikasi rekaman tahun 2024, dan normalisasi nama lokasi lintas tahun.',
    technicalNote: 'DataFrame groupby, deduplication, schema canonicalization',
    relatedRoute: '/work/aqi-cirebon',
    relatedLabel: 'Lihat Pipeline Data (/work/aqi-cirebon)',
    baseX: 275,
    baseY: 275,
    radius: 8,
  },
  {
    id: 'ds-visual-encoding',
    code: 'DS-09',
    title: 'Perceptual Data Visualization & Threshold Bands',
    cluster: 'DATA_SCIENCE',
    status: 'Primary Focus',
    summary:
      'Pengodean visual berlapis menggunakan pita ambang kategori ISPU (Baik, Sedang, Tidak Sehat) langsung di kanvas grafik.',
    technicalNote: 'Custom Chart.js beforeDraw canvas plugin',
    relatedRoute: '/lab',
    relatedLabel: 'Lihat Grafik ISPU (/lab)',
    baseX: 370,
    baseY: 135,
    radius: 7,
  },

  // ==================== CLUSTER 2: SOFTWARE_AI (9 Nodes) ====================
  {
    id: 'sw-astro-islands',
    code: 'SW-01',
    title: 'Static-First Astro Architecture & View Transitions',
    cluster: 'SOFTWARE_AI',
    status: 'Primary Focus',
    summary:
      'Arsitektur dokumen statis berkecepatan tinggi dengan siklus hidup modul deterministik saat perpindahan halaman klien.',
    technicalNote: 'bootPage() lifecycle · motionRegistry cleanup on astro:after-swap',
    relatedRoute: '/about',
    relatedLabel: 'Lihat Stack Teknis (/about)',
    baseX: 730,
    baseY: 150,
    radius: 9,
  },
  {
    id: 'sw-rfc4180-worker',
    code: 'SW-02',
    title: 'RFC 4180 State-Machine Parser & Web Worker',
    cluster: 'SOFTWARE_AI',
    status: 'Primary Focus',
    summary:
      'Pemrosesan file CSV di thread latar belakang (Web Worker) menggunakan state machine deterministik agar UI bebas blokir.',
    technicalNote: 'Auto-delimiter detection (, ; \\t |) · BOM stripping · Worker isolation',
    relatedRoute: '/lab/csv',
    relatedLabel: 'Buka CSV Worker Sandbox (/lab/csv)',
    baseX: 645,
    baseY: 120,
    radius: 8,
  },
  {
    id: 'sw-csv-sanitization',
    code: 'SW-03',
    title: 'Spreadsheet Formula Injection Defense',
    cluster: 'SOFTWARE_AI',
    status: 'Primary Focus',
    summary:
      'Sanitasi sel yang diawali karakter berbahaya (=, +, -, @, \\t, \\r) untuk mencegah eksekusi formula saat ekspor atau tampilan.',
    technicalNote: 'Neutralize leading formula triggers + strict textContent DOM rendering',
    relatedRoute: '/lab/csv',
    relatedLabel: 'Uji Keamanan CSV (/lab/csv)',
    baseX: 825,
    baseY: 115,
    radius: 7,
  },
  {
    id: 'sw-ts-pure-cores',
    code: 'SW-04',
    title: 'Pure TypeScript Computational Kernels',
    cluster: 'SOFTWARE_AI',
    status: 'Primary Focus',
    summary:
      'Pemisahan mesin hitung murni bebas DOM sehingga modul yang sama dapat diuji langsung di Node.js maupun dijalankan di browser.',
    technicalNote: 'Zero DOM side-effects in core engines · Bit-for-bit parity verified',
    baseX: 675,
    baseY: 225,
    radius: 8,
  },
  {
    id: 'sw-webgl-vessel',
    code: 'SW-05',
    title: 'Procedural WebGL & Canvas 2D Rendering',
    cluster: 'SOFTWARE_AI',
    status: 'Active Exploration',
    summary:
      'Kombinasi fallback SVG instan dengan peningkatan kanvas interaktif yang menghormati preferensi reduced-motion pengguna.',
    technicalNote: 'DevicePixelRatio clamping · Visibility pause · Zero-allocation loops',
    relatedRoute: '/',
    relatedLabel: 'Lihat Hero Canvas (/)',
    baseX: 790,
    baseY: 235,
    radius: 8,
  },
  {
    id: 'sw-crypto-security',
    code: 'SW-06',
    title: 'PBKDF2-SHA512, HMAC Sessions, & Input Guards',
    cluster: 'SOFTWARE_AI',
    status: 'Active Exploration',
    summary:
      'Pertahanan berlapis terhadap SQLi/XSS/Prototype-Pollution, hashing password PBKDF2 100.000 iterasi, dan penguncian perangkat.',
    technicalNote: 'crypto.pbkdf2Sync + timingSafeEqual + 1-Device-1-Account lock',
    relatedRoute: '/aethelgrad',
    relatedLabel: 'Masuk Dunia Aethelgrad (/aethelgrad)',
    baseX: 885,
    baseY: 190,
    radius: 8,
  },
  {
    id: 'sw-pixel-svg-paperdoll',
    code: 'SW-07',
    title: '7-Layer Crisp Pixel SVG Paper-Doll Composer',
    cluster: 'SOFTWARE_AI',
    status: 'Primary Focus',
    summary:
      'Komposisi karakter RPG 64x64 berbasis 7 lapisan SVG crispEdges yang berubah secara real-time mengikuti senjata dan armor aktif.',
    technicalNote: 'Layers 0..6: Aura, Body, Armor, Head, Helmet, Offhand, Main Weapon',
    relatedRoute: '/aethelgrad',
    relatedLabel: 'Coba Paper-Doll di Aethelgrad (/aethelgrad)',
    baseX: 855,
    baseY: 295,
    radius: 8,
  },
  {
    id: 'sw-cpp-memory',
    code: 'SW-08',
    title: 'C++ Pointers, Memory Layout, & Cost Awareness',
    cluster: 'SOFTWARE_AI',
    status: 'Active Exploration',
    summary:
      'Pemahaman dasar alokasi stack vs heap, referensi, dan efisiensi struktur data tingkat rendah dari perkuliahan pemrograman.',
    technicalNote: 'Deterministic resource cleanup & cache-friendly arrays',
    relatedRoute: '/about',
    relatedLabel: 'Baca Perjalanan Belajar (/about)',
    baseX: 610,
    baseY: 295,
    radius: 7,
  },
  {
    id: 'sw-ml-foundations',
    code: 'SW-09',
    title: 'Supervised Learning & Feature Engineering',
    cluster: 'SOFTWARE_AI',
    status: 'Foundational Study',
    summary:
      'Arah studi lanjutan untuk regresi, klasifikasi, dan validasi silang deret waktu setelah fondasi statistika matang.',
    technicalNote: 'Focus on interpretable features before black-box models',
    relatedRoute: '/about',
    relatedLabel: 'Lihat Curiosity Map (/about)',
    baseX: 745,
    baseY: 315,
    radius: 7,
  },

  // ==================== CLUSTER 3: QUANTITATIVE_SYSTEMS (9 Nodes) ====================
  {
    id: 'qt-relational-sql',
    code: 'QT-01',
    title: 'Relational Algebra & Normalized SQL Schemas',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Active Exploration',
    summary:
      'Pemodelan entitas-relasi (3NF), indeks komposit, dan kueri agregasi terstruktur untuk dataset observasi multi-tahun.',
    technicalNote: 'Primary/Foreign keys · Window functions · Query plan awareness',
    relatedRoute: '/about',
    relatedLabel: 'Lihat Fokus Basis Data (/about)',
    baseX: 250,
    baseY: 455,
    radius: 8,
  },
  {
    id: 'qt-idx-equity',
    code: 'QT-02',
    title: 'Indonesian Equity Market Time-Series (IDX)',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Foundational Study',
    summary:
      'Agenda riset kuantitatif pada data OHLCV saham Indonesia menggunakan indikator teknikal dasar yang transparan.',
    technicalNote: 'Log returns, rolling volatility, drawdown honesty',
    relatedRoute: '/work',
    relatedLabel: 'Lihat Blueprint Riset (/work)',
    baseX: 145,
    baseY: 425,
    radius: 8,
  },
  {
    id: 'qt-news-econ-signal',
    code: 'QT-03',
    title: 'Macro News Filtering & Economic Correlation',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Foundational Study',
    summary:
      'Rencana ekstraksi frekuensi topik berita ekonomi dan pengujian korelasi lag terhadap pergerakan indikator makro.',
    technicalNote: 'Time-lagged cross-correlation & noise filtering',
    relatedRoute: '/work',
    relatedLabel: 'Lihat Blueprint RES-02 (/work)',
    baseX: 115,
    baseY: 515,
    radius: 7,
  },
  {
    id: 'qt-iot-telemetry',
    code: 'QT-04',
    title: 'Environmental Sensor Networks & IoT Telemetry',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Foundational Study',
    summary:
      'Ketertarikan pada bagaimana mikrokontroler dan sensor gas elektrokimia menghasilkan aliran data kualitas udara.',
    technicalNote: 'Sampling intervals, sensor drift calibration, packet integrity',
    relatedRoute: '/about',
    relatedLabel: 'Lihat Minat IoT (/about)',
    baseX: 215,
    baseY: 545,
    radius: 7,
  },
  {
    id: 'qt-discrete-math',
    code: 'QT-05',
    title: 'Discrete Mathematics, Sets, & Combinatorics',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Active Exploration',
    summary:
      'Teori himpunan, relasi, induksi matematika, dan probabilitas diskrit sebagai tulang punggung analisis algoritma.',
    technicalNote: 'UNIKOM Informatics Core · Graph & recurrence relations',
    baseX: 345,
    baseY: 420,
    radius: 7,
  },
  {
    id: 'qt-calculus-rates',
    code: 'QT-06',
    title: 'Calculus of Rates, Gradients, & Optimization',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Active Exploration',
    summary:
      'Pemahaman laju perubahan sesaat, interpolasi kontinu, dan akumulasi integral pada pemodelan fenomena fisik.',
    technicalNote: 'Piecewise derivatives & numerical approximation',
    baseX: 325,
    baseY: 520,
    radius: 7,
  },
  {
    id: 'qt-rng-probability',
    code: 'QT-07',
    title: 'Weighted Probability & Pity-System Mathematics',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Primary Focus',
    summary:
      'Distribusi peluang berbobot dengan soft-pity dan hard-pity deterministik untuk simulasi sistem gacha yang adil dan transparan.',
    technicalNote: 'Exact rate table + guaranteed ★5 threshold at 50 pulls',
    relatedRoute: '/aethelgrad',
    relatedLabel: 'Uji Gacha Altar di Aethelgrad (/aethelgrad)',
    baseX: 425,
    baseY: 475,
    radius: 8,
  },
  {
    id: 'qt-combat-power-scaling',
    code: 'QT-08',
    title: 'Multi-Factor Combat Power & Synergy Scaling',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Primary Focus',
    summary:
      'Formula agregasi stat karakter, promosi bintang, resonansi elemen senjata, koleksi Grimoire, dan buff algoritma.',
    technicalNote: 'CP = Base(★,Lv) + Gear + GrimoireBonus + CodeMasteryBuff',
    relatedRoute: '/aethelgrad',
    relatedLabel: 'Lihat Kalkulator CP Aethelgrad (/aethelgrad)',
    baseX: 430,
    baseY: 385,
    radius: 8,
  },
  {
    id: 'qt-runtime-telemetry',
    code: 'QT-09',
    title: 'Browser Frame-Time & Heap Telemetry Instrumentation',
    cluster: 'QUANTITATIVE_SYSTEMS',
    status: 'Primary Focus',
    summary:
      'Pengukuran real-time FPS, delta frame (ms), dan alokasi memori JS langsung di HUD halaman ini menggunakan Performance API.',
    technicalNote: 'requestAnimationFrame delta window + performance.memory',
    relatedRoute: '/atlas',
    relatedLabel: 'Aktif di HUD Halaman Ini (/atlas)',
    baseX: 390,
    baseY: 560,
    radius: 7,
  },

  // ==================== CLUSTER 4: COGNITIVE_STRATEGY (9 Nodes) ====================
  {
    id: 'cg-comp-logic',
    code: 'CG-01',
    title: 'Propositional & Predicate Computational Logic',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Primary Focus',
    summary:
      'Penyusunan invariants, tabel kebenaran, dan dekomposisi kondisi bercabang tanpa celah logika.',
    technicalNote: 'Mata kuliah Logika Komputasional & Pola Pikir Komputasional UNIKOM',
    relatedRoute: '/about',
    relatedLabel: 'Lihat Kurikulum UNIKOM (/about)',
    baseX: 650,
    baseY: 430,
    radius: 8,
  },
  {
    id: 'cg-algo-structures',
    code: 'CG-02',
    title: 'Algorithms, Trees, & Graph Traversal (BFS/DFS)',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Primary Focus',
    summary:
      'Representasi daftar ketetanggaan (adjacency list), pencarian jalur terpendek, dan struktur pohon pencarian.',
    technicalNote: 'O(V + E) graph traversal · Deterministic sorting & ranking',
    relatedRoute: '/aethelgrad',
    relatedLabel: 'Pecahkan di Code Sanctum (/aethelgrad)',
    baseX: 745,
    baseY: 420,
    radius: 9,
  },
  {
    id: 'cg-epistemic-honesty',
    code: 'CG-03',
    title: 'Epistemic Honesty & Zero Fabricated Claims',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Primary Focus',
    summary:
      'Komitmen etis untuk membedakan fakta terukur dari asumsi, serta mendokumentasikan keterbatasan studi secara terbuka.',
    technicalNote: 'Explicit limitation sections in every case study',
    relatedRoute: '/work/aqi-cirebon',
    relatedLabel: 'Baca Bab Keterbatasan (/work/aqi-cirebon)',
    baseX: 575,
    baseY: 495,
    radius: 8,
  },
  {
    id: 'cg-rts-logistics',
    code: 'CG-04',
    title: 'Grand Strategy Resource & Supply-Line Thinking',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Active Exploration',
    summary:
      'Kebiasaan menganalisis bottleneck logistik, alokasi sumber daya jangka panjang, dan manajemen risiko dari simulasi strategi.',
    technicalNote: 'Inspired by Hearts of Iron IV, Age of Empires IV, & Total War',
    relatedRoute: '/archive/play',
    relatedLabel: 'Buka Game Deck (/archive/play)',
    baseX: 855,
    baseY: 435,
    radius: 7,
  },
  {
    id: 'cg-pattern-recognition',
    code: 'CG-05',
    title: 'Iterative Pattern Recognition under Uncertainty',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Primary Focus',
    summary:
      'Melatih ketenangan membaca pola serangan atau anomali data secara berulang hingga struktur dasarnya terlihat jelas.',
    technicalNote: 'Observation -> Hypothesis -> Verification loop',
    relatedRoute: '/about',
    relatedLabel: 'Baca Filosofi Belajar (/about)',
    baseX: 685,
    baseY: 525,
    radius: 7,
  },
  {
    id: 'cg-progressive-disclosure',
    code: 'CG-06',
    title: 'Human-First Progressive Disclosure UX',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Primary Focus',
    summary:
      'Menyajikan ringkasan yang jernih bagi pembaca umum sambil menyediakan lapisan kedalaman teknis bagi rekan rekayasawan.',
    technicalNote: 'Trunk & Branch architecture · Clean surface + deep interactive labs',
    relatedRoute: '/',
    relatedLabel: 'Kembali ke Beranda (/)',
    baseX: 560,
    baseY: 390,
    radius: 8,
  },
  {
    id: 'cg-code-sanctum-trials',
    code: 'CG-07',
    title: 'Algorithmic Spell Verification & Edge-Case Testing',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Primary Focus',
    summary:
      'Penyelesaian 24 tantangan logika pemrograman lintas 4 tier yang memberikan buff permanen pada karakter di Aethelgrad.',
    technicalNote: '24 Code Spells · Deterministic AST/Output verification',
    relatedRoute: '/aethelgrad',
    relatedLabel: 'Uji Logika di Code Sanctum (/aethelgrad)',
    baseX: 790,
    baseY: 520,
    radius: 8,
  },
  {
    id: 'cg-deep-work-rhythm',
    code: 'CG-08',
    title: 'Deep-Work Acoustic Focus & Physical Balance',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Active Exploration',
    summary:
      'Menjaga ritme fokus belajar jangka panjang melalui musik instrumental dan jeda olahraga badminton secara berkala.',
    technicalNote: 'while(True): listen() · Sustainable learning cadence',
    relatedRoute: '/archive/off-screen',
    relatedLabel: 'Lihat Off-screen & Hobi (/archive/off-screen)',
    baseX: 885,
    baseY: 515,
    radius: 7,
  },
  {
    id: 'cg-collaborative-systems',
    code: 'CG-09',
    title: 'Collaborative Intelligent Systems & Documentation',
    cluster: 'COGNITIVE_STRATEGY',
    status: 'Active Exploration',
    summary:
      'Menulis kode dan catatan riset yang rapi agar mudah diaudit, direproduksi, dan dikembangkan bersama tim.',
    technicalNote: 'Reproducible pipelines & self-documenting TypeScript contracts',
    relatedRoute: '/connect',
    relatedLabel: 'Mari Berkolaborasi (/connect)',
    baseX: 735,
    baseY: 565,
    radius: 7,
  },
]);

export const ATLAS_EDGES: readonly AtlasKnowledgeEdge[] = Object.freeze([
  // Intra-cluster DATA_SCIENCE (12 edges)
  { id: 'e01', source: 'ds-ispu-p14', target: 'ds-cirebon-aqi', relation: 'Core index formula', weight: 1.0 },
  { id: 'e02', source: 'ds-cirebon-aqi', target: 'ds-missing-honesty', relation: '2023 gap & 2025 partial policy', weight: 0.95 },
  { id: 'e03', source: 'ds-cirebon-aqi', target: 'ds-spatial-corridors', relation: '23 monitoring stations', weight: 0.9 },
  { id: 'e04', source: 'ds-ispu-p14', target: 'ds-so2-no2-kinetics', relation: 'Pollutant breakpoints', weight: 0.9 },
  { id: 'e05', source: 'ds-cirebon-aqi', target: 'ds-pandas-wrangling', relation: '200-row CSV normalization', weight: 0.85 },
  { id: 'e06', source: 'ds-ispu-p14', target: 'ds-visual-encoding', relation: 'Threshold category bands', weight: 0.9 },
  { id: 'e07', source: 'ds-hyndman-fan-r7', target: 'ds-pearson-corr', relation: 'Column statistical profiling', weight: 0.85 },
  { id: 'e08', source: 'ds-hyndman-fan-r7', target: 'ds-pandas-wrangling', relation: 'NumPy/pandas R-7 parity', weight: 0.8 },
  { id: 'e09', source: 'ds-missing-honesty', target: 'ds-visual-encoding', relation: 'spanGaps: false contract', weight: 0.85 },
  { id: 'e10', source: 'ds-spatial-corridors', target: 'ds-so2-no2-kinetics', relation: 'Traffic vs industrial dominance', weight: 0.85 },
  { id: 'e11', source: 'ds-pearson-corr', target: 'ds-so2-no2-kinetics', relation: 'Co-pollutant correlation', weight: 0.75 },
  { id: 'e12', source: 'ds-pandas-wrangling', target: 'ds-spatial-corridors', relation: 'Station ID canonicalization', weight: 0.8 },

  // Intra-cluster SOFTWARE_AI (11 edges)
  { id: 'e13', source: 'sw-astro-islands', target: 'sw-ts-pure-cores', relation: 'Modular island kernels', weight: 0.95 },
  { id: 'e14', source: 'sw-rfc4180-worker', target: 'sw-csv-sanitization', relation: 'Secure worker parsing', weight: 0.95 },
  { id: 'e15', source: 'sw-rfc4180-worker', target: 'sw-ts-pure-cores', relation: 'Typed state machine', weight: 0.9 },
  { id: 'e16', source: 'sw-astro-islands', target: 'sw-webgl-vessel', relation: 'Progressive visual enhancement', weight: 0.85 },
  { id: 'e17', source: 'sw-ts-pure-cores', target: 'sw-crypto-security', relation: 'Zero-dependency server guards', weight: 0.85 },
  { id: 'e18', source: 'sw-crypto-security', target: 'sw-pixel-svg-paperdoll', relation: 'Authenticated Hunter state', weight: 0.8 },
  { id: 'e19', source: 'sw-webgl-vessel', target: 'sw-pixel-svg-paperdoll', relation: 'Procedural graphics pipeline', weight: 0.8 },
  { id: 'e20', source: 'sw-cpp-memory', target: 'sw-ts-pure-cores', relation: 'Memory-conscious data structures', weight: 0.8 },
  { id: 'e21', source: 'sw-ts-pure-cores', target: 'sw-ml-foundations', relation: 'Numerical feature pipelines', weight: 0.75 },
  { id: 'e22', source: 'sw-csv-sanitization', target: 'sw-crypto-security', relation: 'Defense-in-depth sanitization', weight: 0.9 },
  { id: 'e23', source: 'sw-cpp-memory', target: 'sw-webgl-vessel', relation: 'TypedArray buffer discipline', weight: 0.75 },

  // Intra-cluster QUANTITATIVE_SYSTEMS (11 edges)
  { id: 'e24', source: 'qt-relational-sql', target: 'qt-idx-equity', relation: 'Historical tick & OHLCV storage', weight: 0.8 },
  { id: 'e25', source: 'qt-idx-equity', target: 'qt-news-econ-signal', relation: 'Macro-market coupling', weight: 0.85 },
  { id: 'e26', source: 'qt-relational-sql', target: 'qt-iot-telemetry', relation: 'Time-series sensor ingestion', weight: 0.85 },
  { id: 'e27', source: 'qt-discrete-math', target: 'qt-calculus-rates', relation: 'Mathematical foundations', weight: 0.85 },
  { id: 'e28', source: 'qt-discrete-math', target: 'qt-rng-probability', relation: 'Combinatorial probability', weight: 0.9 },
  { id: 'e29', source: 'qt-rng-probability', target: 'qt-combat-power-scaling', relation: 'Gacha item rarity scaling', weight: 0.9 },
  { id: 'e30', source: 'qt-calculus-rates', target: 'qt-idx-equity', relation: 'Continuous return rates', weight: 0.8 },
  { id: 'e31', source: 'qt-combat-power-scaling', target: 'qt-runtime-telemetry', relation: 'Real-time metric computation', weight: 0.75 },
  { id: 'e32', source: 'qt-iot-telemetry', target: 'qt-runtime-telemetry', relation: 'High-frequency telemetry sampling', weight: 0.8 },
  { id: 'e33', source: 'qt-discrete-math', target: 'qt-relational-sql', relation: 'Set theory & relational algebra', weight: 0.9 },
  { id: 'e34', source: 'qt-calculus-rates', target: 'qt-combat-power-scaling', relation: 'Diminishing return curves', weight: 0.75 },

  // Intra-cluster COGNITIVE_STRATEGY (10 edges)
  { id: 'e35', source: 'cg-comp-logic', target: 'cg-algo-structures', relation: 'Formal algorithmic reasoning', weight: 0.95 },
  { id: 'e36', source: 'cg-comp-logic', target: 'cg-epistemic-honesty', relation: 'Rigorous truth conditions', weight: 0.9 },
  { id: 'e37', source: 'cg-algo-structures', target: 'cg-code-sanctum-trials', relation: '24 algorithmic challenges', weight: 0.95 },
  { id: 'e38', source: 'cg-rts-logistics', target: 'cg-pattern-recognition', relation: 'Strategic state evaluation', weight: 0.85 },
  { id: 'e39', source: 'cg-epistemic-honesty', target: 'cg-progressive-disclosure', relation: 'Transparent user communication', weight: 0.85 },
  { id: 'e40', source: 'cg-pattern-recognition', target: 'cg-code-sanctum-trials', relation: 'Debugging & edge-case spotting', weight: 0.85 },
  { id: 'e41', source: 'cg-deep-work-rhythm', target: 'cg-pattern-recognition', relation: 'Sustained cognitive attention', weight: 0.8 },
  { id: 'e42', source: 'cg-collaborative-systems', target: 'cg-progressive-disclosure', relation: 'Readable system documentation', weight: 0.85 },
  { id: 'e43', source: 'cg-algo-structures', target: 'cg-rts-logistics', relation: 'Pathfinding & resource graphs', weight: 0.8 },
  { id: 'e44', source: 'cg-epistemic-honesty', target: 'cg-collaborative-systems', relation: 'Verifiable audit trails', weight: 0.85 },

  // Cross-cluster Bridge Synapses (8 edges -> Total = 52 edges)
  { id: 'e45', source: 'ds-hyndman-fan-r7', target: 'sw-rfc4180-worker', relation: 'CSV Worker statistical engine', weight: 0.95 },
  { id: 'e46', source: 'ds-ispu-p14', target: 'qt-calculus-rates', relation: 'Piecewise linear rate math', weight: 0.85 },
  { id: 'e47', source: 'ds-missing-honesty', target: 'cg-epistemic-honesty', relation: 'Zero fabricated metrics principle', weight: 0.95 },
  { id: 'e48', source: 'ds-cirebon-aqi', target: 'qt-iot-telemetry', relation: 'Ambient air sensor networks', weight: 0.85 },
  { id: 'e49', source: 'sw-pixel-svg-paperdoll', target: 'qt-combat-power-scaling', relation: 'Visual gear -> CP synchronization', weight: 0.95 },
  { id: 'e50', source: 'qt-combat-power-scaling', target: 'cg-code-sanctum-trials', relation: 'Code Mastery Buff -> +CP%', weight: 0.95 },
  { id: 'e51', source: 'sw-astro-islands', target: 'cg-progressive-disclosure', relation: 'Trunk & Branch UX architecture', weight: 0.9 },
  { id: 'e52', source: 'sw-webgl-vessel', target: 'qt-runtime-telemetry', relation: '60 FPS frame-budget telemetry', weight: 0.9 },
]);
