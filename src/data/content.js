/*!
 * portfolio-data.js: single source of truth for portfolio content.
 *
 * HOW TO UPDATE: edit the values below, save, refresh the browser.
 * There is no admin panel and no editor on purpose: the portfolio is
 * maintained through source code, exactly as documented in README.md.
 *
 * Rules kept by this file:
 *  - Only real, verifiable information (no fabricated links, credentials
 *    or dates). Reserved/empty slots are clearly labelled as such.
 *  - Social entries with an empty url are hidden automatically by script.js.
 *  - Projects without a link show an honest status label instead of a dead
 *    button; a link is only rendered when it points to a real destination.
 *  - "comingSoon" slots are placeholders, not projects: they never appear
 *    in project counts, filters or search results.
 *  - Curiosity Map statuses use three honest levels only: "Primary focus",
 *    "Exploring", "Future interest". No percentages, no fake meters.
 */
'use strict';

/**
 * content.js: sumber data statis global portofolio.
 * Diimpor sebagai modul ES6 oleh skrip src/scripts/*.js.
 */
export const DATA = {
  /* ------------------------------------------------------------------ */
  /* Identity + site metadata                                            */
  /* ------------------------------------------------------------------ */
  meta: {
    name: 'Farrel Islami Putra',
    shortName: 'Farrel',
    monogram: 'FIP',
    role: 'Informatics Engineering Student',
    university: 'Universitas Komputer Indonesia (UNIKOM)',
    started: 2026, // university start year: do not invent a graduation year
    location: 'Indonesia',
    year: new Date().getFullYear(),
    // document.title is kept in sync with the <title> in index.html.
    // The <title>/<meta description> in index.html are the only intended
    // duplicates (needed for SEO/social even before JS runs); see README.
    siteTitle: 'Farrel Islami Putra · Data, Software & Learning Notes',
    siteDescription:
      'Catatan belajar Farrel Islami Putra, mahasiswa Informatika UNIKOM. Soal data, pola, software, dan hal-hal yang belum selesai dipelajari.'
  },

  links: {
    github: 'https://github.com/Fryel23',
    githubArchive: 'https://github.com/Fryel32',
    // Google Drive documentation archive (research & learning log).
    docs: 'https://drive.google.com/drive/folders/1c333-r98_cch1e_t_y2s_p3j-2l_k2q1'
  },

  /* ------------------------------------------------------------------ */
  /* Hero                                                                */
  /* ------------------------------------------------------------------ */
  hero: {
    eyebrow: '01 / PERKENALAN · MAHASISWA INFORMATIKA & PENJELAJAH DATA',
    // Each entry is one masked display line. Keep lines short so they never clip.
    headline: ['Belajar memahami dunia', 'lewat data & kode.'],
    headlineAccent: 'data & kode.',
    headlineTail: 'Dari pertanyaan sederhana ke sistem yang terukur.',
    description:
      'Saya Farrel Islami Putra, mahasiswa S1 Teknik Informatika di UNIKOM (mulai 2026). Di sini saya mendokumentasikan riset kualitas udara Kota Cirebon (2021–2025), eksperimen pemrograman, dan catatan teknis yang saya bangun langkah demi langkah.',
    primaryCta: { label: 'Lihat Proyek Utama', href: '/work' },
    secondaryCta: { label: 'Tentang Saya', href: '/about' },
    docsCta: { label: 'Tentang Saya', href: '/about' },
    note: 'DATA · SOFTWARE · AI · DATABASES · IOT',
    sticker: { top: 'Stay curious.', bottom: 'Stay rigorous.' },
    profileCard: {
      topline: 'STUDENT PROFILE',
      status: 'OPEN TO LEARN',
      emblem: 'FIP',
      name: 'Farrel Islami Putra',
      role: 'Informatics Eng. @ UNIKOM',
      specialty: 'Data · Software · AI · IoT',
      bottom: 'PERSONAL ARCHIVE / 01'
    },
    floatingTools: ['Py', 'JS', 'SQL'],
    caption: 'FIG. 01 · LEARNER PROFILE',

    /* Data Atlas: decorative vector field around the identity card.
       Purely illustrative microcopy: no measured values, no telemetry,
       no real coordinates. Keep labels short so they never clip. */
    dataAtlas: {
      cornerLabel: 'FIELD / 01 · CIREBON 2021–2025',
      observations: ['OBSERVATION', 'DATA POINT', 'PATTERN'],
      axisNote: 'STRUCTURE · SIGNAL · CURIOSITY'
    }
  },

  /* ------------------------------------------------------------------ */
  /* Curiosity Map: interactive map of interests                        */
  /* ------------------------------------------------------------------ */
  /* An authored illustration of how Farrel's interests relate: DATA at
     the centre, four connected areas. Statuses are honest levels, not
     skill meters. `detail` is shown in the info panel when the node is
     selected (click / tap / keyboard). */
  curiosityMap: {
    kicker: '02 / MINAT & BIDANG EKSPLORASI',
    heading: ['Bagaimana minat saya', 'saling terhubung.'],
    headingAccentWord: 'terhubung.',
    intro:
      'Data berada di pusat eksplorasi saya; bidang lainnya tumbuh mengelilingi fondasi tersebut. Pilih salah satu simpul di bawah untuk membaca catatan fokus saya saat ini.',
    hint: 'PILIH SIMPUL: KLIK, KETUK, ATAU GUNAKAN TAB + ENTER',
    panelTitle: 'FIELD NOTES',
    nodes: [
      {
        id: 'data',
        name: 'DATA',
        status: 'Primary focus · Fokus Utama',
        detail:
          'Inti dari peta ini. Sedang dipraktikkan dalam penelitian kualitas udara Kota Cirebon (2021–2025): mengumpulkan, membersihkan, dan mencari pola dari data terbuka resmi DLH. Saya menyukai tahap ketika angka mentah mulai bercerita secara jujur.',
        x: 50, y: 46
      },
      {
        id: 'software',
        name: 'SOFTWARE',
        status: 'Exploring · Sedang Dipelajari',
        detail:
          'HTML, CSS, JavaScript, dan Astro yang ditulis tangan: situs portofolio ini adalah ruang latihannya. Saya terus belajar merapikan arsitektur modul, performa, dan keterbacaan kode.',
        x: 22, y: 20
      },
      {
        id: 'ai',
        name: 'AI',
        status: 'Future interest · Rencana Mendatang',
        detail:
          'Sebuah arah belajar berikutnya, bukan klaim keahlian. Machine learning akan saya dalami secara bertahap setelah fondasi statistika dan pemrosesan data saya lebih matang.',
        x: 78, y: 20
      },
      {
        id: 'databases',
        name: 'DATABASE SYSTEMS',
        status: 'Exploring · Sedang Dipelajari',
        detail:
          'Dasar-dasar SQL serta bagaimana data dimodelkan, dinormalisasi, dan dikueri secara terstruktur. Dipelajari berdampingan dengan pengolahan dataset CSV dan JSON.',
        x: 22, y: 74
      },
      {
        id: 'iot',
        name: 'IoT',
        status: 'Future interest · Rencana Mendatang',
        detail:
          'Rasa ingin tahu tentang sistem terhubung dan jaringan sensor lingkungan, tempat perangkat fisik menghasilkan data deret waktu seperti kualitas udara yang sedang saya analisis.',
        x: 78, y: 74
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  /* Project gallery                                                     */
  /* ------------------------------------------------------------------ */
  gallery: {
    kicker: '02 / STUDI KASUS UNGGULAN',
    heading: ['Karya & riset', 'terpilih.'],
    headingAccentWord: 'terpilih.',
    aside:
      'Satu studi kasus utama kualitas udara Kota Cirebon (2021–2025) yang dilengkapi penjelajah data interaktif, serta dua cetak biru riset berikutnya yang dicatat secara transparan.',
    countLabel: 'PROJECTS',
    // Hero search is a section navigator; the gallery empty state
    // can now only be reached through the category filters.
    emptyMessage: 'Tidak ada proyek yang cocok dengan filter ini. Slot rencana riset tampil pada tampilan All work.',
    footerLeft: 'LANJUTKAN EKSPLORASI',
    footerRight: 'GULIR ↓'
  },

  filters: ['All', 'Data & Research'],

  /* ------------------------------------------------------------------ */
  /* Global Archive Navigator (hero search)                              */
  /* ------------------------------------------------------------------ */
  archiveSearch: {
    maxQueryLength: 80,
    inputLabel: 'Mau menjelajahi bagian apa? Cari topik atau lompat ke halaman',
    submitLabel: 'Jelajahi',
    emptyMessage: 'Ketik topik (misal: AQI Cirebon, CSV, Python, Game, Kontak) atau klik pintasan topik di bawah.',
    notFoundMessage: 'Topik belum ditemukan. Coba kata kunci: AQI Cirebon, CSV, Data Lab, Python, Game, atau Kontak.',
    listLabel: 'Tujuan navigasi',
    goAnnouncement: 'Menuju ke',
    routes: [
      { targetId: 'top', label: 'Beranda / Perkenalan', aliases: ['home', 'beranda', 'top', 'start', 'intro', 'hero'] },
      { targetId: 'work', label: 'Studi Kasus AQI Cirebon (2021–2025)', aliases: ['project', 'projects', 'proyek', 'work', 'aqi', 'cirebon', 'aqi cirebon', 'air quality', 'air quality index', 'research', 'riset', 'dataset', 'kualitas udara'] },
      { targetId: 'lab', label: 'The Data Lab · Penjelajah AQI Interaktif', aliases: ['lab', 'data lab', 'explorer', 'aqi explorer', 'ispu', 'so2', 'no2', 'grafik', 'stasiun'] },
      { targetId: 'csv', label: 'CSV Explorer · Analisis File CSV Lokal', aliases: ['csv', 'csv explorer', 'unggah csv', 'upload csv', 'statistik', 'mean', 'median'] },
      { targetId: 'games', label: 'Game Deck Interaktif', aliases: ['game', 'games', 'arcade', 'game deck', 'valorant', 'hades'] },
      { targetId: 'about', label: 'Tentang Saya & Peta Minat', aliases: ['about', 'about me', 'tentang', 'profil', 'skills', 'skill', 'software', 'python', 'cpp', 'c++', 'javascript', 'php', 'database', 'databases', 'ai', 'iot', 'robotics', 'curiosity map'] },
      { targetId: 'journey', label: 'Perjalanan Belajar & Pendidikan', aliases: ['journey', 'learning', 'learn', 'education', 'study', 'belajar', 'perjalanan belajar', 'unikom', 'kuliah'] },
      { targetId: 'offscreen', label: 'Kegiatan di Luar Layar & Musik', aliases: ['hobby', 'hobbies', 'hobi', 'badminton', 'music', 'musik', 'gaming', 'gameplay', 'off-screen', 'offscreen', 'spotify'] },
      { targetId: 'github', label: 'Telemetri GitHub (@Fryel23 & @Fryel32)', aliases: ['github', 'fryel23', 'fryel32', 'repositories', 'repository', 'commits', 'open source', 'open-source'] },
      { targetId: 'credentials', label: 'Arsip Kredensial & Sertifikat', aliases: ['certificate', 'certificates', 'credential', 'credentials', 'award', 'awards', 'achievement', 'achievements', 'sertifikat', 'prestasi'] },
      { targetId: 'companion', label: 'Companion Pixel (Kok)', aliases: ['pet', 'companion', 'summon', 'kok'] },
      { targetId: 'profiles', label: 'Profil Sosial & Dokumentasi', aliases: ['instagram', 'linkedin', 'social', 'social media', 'profiles', 'google drive', 'documentation', 'dokumentasi'] },
      { targetId: 'contact', label: 'Kontak & Email Resmi', aliases: ['email', 'gmail', 'contact', 'contacts', 'kontak', 'reach me', 'say hello', 'hubungi'] },
      { targetId: 'closing', label: 'Penutup & Moto Pribadi', aliases: ['footer', 'motto', 'back to top', 'closing'] },
      { targetId: 'aethelgrad', label: 'Masuk Dunia: Aethelgrad', aliases: ['aethelgrad', 'outpost', 'gacha', 'barracks', 'grimoire', 'trials', 'arena', 'rpg', 'world', 'dive'] },
      { targetId: 'atlas', label: 'The Data Atlas Crypt & Knowledge Graph', aliases: ['atlas', 'data atlas', 'crypt', 'world atlas', 'topology', 'knowledge graph', 'graph', 'telemetry', 'map'] }
    ],
    /* One keyword, several honest destinations. Keep each entry short. */
    multiRoutes: [
      { targetId: 'work', label: 'Studi Kasus AQI Cirebon', aliases: ['data'] },
      { targetId: 'lab', label: 'The Data Lab · Penjelajah AQI', aliases: ['data'] },
      { targetId: 'about', label: 'Tentang Saya & Peta Minat', aliases: ['data'] }
    ]
  },

  /* Real projects only. */
  projects: [
    {
      slug: 'aqi-cirebon',
      title: 'Air Quality Index Trends · Cirebon (2021–2025)',
      period: '2021–2025',
      category: 'Data & Research',
      tag: 'Research / Data Analysis',
      status: 'IN PROGRESS',
      description:
        'Studi deret waktu dan perbandingan spasial konsentrasi SO₂ serta NO₂ pada 23 titik pantau resmi Dinas Lingkungan Hidup Kota Cirebon periode 2021–2025 (data tahun 2025 bersifat parsial / 4 titik stasiun pengukuran pada Tahap I), dikonversi menjadi sub-indeks dan ISPU terderivasi PermenLHK P.14/2020.',
      caseSummary: {
        problem: 'Data pemantauan SO₂ & NO₂ DLH Kota Cirebon tersebar per tahap/tahun dengan nilai kosong pada 2023 dan cakupan parsial 4 stasiun pada 2025.',
        method: 'Normalisasi skema lokasi-tahap-tahun (200 baris CSV resmi, 23 titik pantau) dan interpolasi linier sub-indeks ISPU PermenLHK P.14/2020 tanpa imputasi palsu.',
        finding: 'Koridor jalan utama dan kawasan niaga mencatat konsentrasi polutan lebih tinggi dibanding pemukiman, dengan SO₂ dan NO₂ bergantian dominan.',
        impact: 'Tersedia sebagai studi kasus naratif (/work/aqi-cirebon) dan penjelajah interaktif (/lab) dengan pita kategori ISPU serta peta spasial Cirebon.'
      },
      // Only tools actually in use for the project right now.
      stack: ['Python', 'pandas (learning)', 'Chart.js', 'Astro'],
      image: '/assets/project-aqi.svg',
      link: 'https://opendata.cirebonkota.go.id/dataset/data-kualitas-udara',
      linkLabel: 'Buka Studi Kasus'
    }
  ],

  /* Reserved slots: visually designed research rows, NOT finished projects. */
  comingSoon: [
    {
      code: 'RES-02',
      kicker: 'RESEARCH AGENDA / RESERVED SLOT 02',
      category: 'Data & Software',
      status: 'RESERVED',
      title: 'Ideas in Progress · Penyaring Berita & Dampak Ekonomi',
      text: 'Rencana sistem untuk menyaring berita internet dan mengamati korelasinya dengan indikator ekonomi. Saat ini ditunda secara sadar sambil memperkuat fondasi pengolahan data dan pemodelan teks.'
    },
    {
      code: 'RES-03',
      kicker: 'RESEARCH AGENDA / RESERVED SLOT 03',
      category: 'Quantitative & Markets',
      status: 'RESERVED',
      title: 'Eksplorasi Data Saham Indonesia Berskala Kecil',
      text: 'Rencana studi kuantitatif menggunakan data historis pasar modal Indonesia (yfinance) dengan indikator teknikal dasar yang transparan. Dicatat sebagai agenda riset berikutnya.'
    }
  ],

  /* ------------------------------------------------------------------ */
  /* About                                                               */
  /* ------------------------------------------------------------------ */
  about: {
    kicker: '01 / SIAPA SAYA · THE PERSON BEHIND THE CODE',
    heading: ['Rasa ingin tahu', 'sebagai awal.'],
    headingAccentWord: 'awal.',
    stamp: { top: 'RIGOROUS WITH', bold: 'DETAILS' },
    lead:
      'Saya memilih Informatika karena ingin memahami cara kerja teknologi dari akarnya, terutama bagaimana data dan perangkat lunak dapat membantu menjawab persoalan sehari-hari. Di UNIKOM saya menemukan ruang untuk bereksperimen, bertanya, dan membangun pemahaman dari konsep dasar.',
    body:
      'Ketertarikan saya pada data berangkat dari kebiasaan sederhana: mengamati pola. Bagi saya, tabel angka bukan sekadar kumpulan baris statis, melainkan jejak peristiwa yang memiliki konteks dan cerita. Saat belajar di perpustakaan, kafe, atau kamar sambil mendengarkan musik, satu konsep baru yang belum saya mengerti sering membawa saya menelusuri dokumentasi teknis hingga ke topik-topik lain yang memperluas cara pandang saya.',
    /* Field notes (5.3.1): short, honest snippets rendered as sticky notes
       next to the about copy. Keep each entry one line. */
    notes: [
      'Mendalami Python dan struktur data untuk analisis deret waktu',
      'Menulis kode harian dengan Zed, VS Code, dan lingkungan Linux',
      'Memegang prinsip: nilai kosong di data harus tampak jujur, bukan ditutup-tutupi',
      'Belajar paling fokus ditemani daftar putar instrumental sepanjang hari'
    ],
    artwork: {
      image: '/assets/profile-card.svg',
      alt: 'Kartu profil ilustrasi Farrel Islami Putra',
      label: { small: 'PERSONAL FILE', strong: 'NO. 0032 / FIP', foot: 'COLLECTED & IN PROGRESS' }
    }
  },

  languagesTools: {
    heading: 'Bahasa & Perangkat Harian',
    miniLabel: 'DAILY DRIVERS',
    items: ['Py', 'C++', 'JS', 'PHP', 'HTML', 'CSS', 'Git', 'VS Code', 'Zed', 'Linux']
  },

  skills: {
    heading: 'Status Kemampuan Saat Ini',
    miniLabel: 'HONEST STATUS',
    // status values: Currently practicing / Exploring / Area of interest
    items: [
      { name: 'Python', status: 'Currently practicing' },
      { name: 'C++', status: 'Currently practicing' },
      { name: 'JavaScript', status: 'Currently practicing' },
      { name: 'HTML & CSS', status: 'Currently practicing' },
      { name: 'PHP', status: 'Currently practicing' },
      { name: 'pandas · NumPy', status: 'Exploring' },
      { name: 'Matplotlib', status: 'Exploring' },
      { name: 'SQL', status: 'Exploring' },
      { name: 'Database systems', status: 'Exploring' },
      { name: 'AI / ML', status: 'Area of interest' },
      { name: 'IoT & Robotics', status: 'Area of interest' }
    ]
  },

  /* ------------------------------------------------------------------ */
  /* Learning journey + education                                        */
  /* ------------------------------------------------------------------ */
  journey: {
    heading: ['Belajar lewat', 'membangun.'],
    /* `detail` powers the accordion body. One honest extra
       paragraph per phase, shown only when the visitor opens the item. */
    items: [
      {
        phase: 'FASE 01',
        title: 'Fondasi Pemrograman',
        description:
          'Mempelajari Python dan C++ dari dasar, termasuk memahami manajemen memori dan pointer.',
        detail:
          'Pemahaman baru benar-benar terbentuk setelah membaca dokumentasi dan mencoba menulis ulang contoh kode sendiri, didukung mata kuliah Logika Komputasional dan Pola Pikir Komputasional di UNIKOM.',
        status: 'ONGOING'
      },
      {
        phase: 'FASE 02',
        title: 'Web & Arsitektur Perangkat Lunak',
        description:
          'Membangun situs portofolio ini dengan HTML, CSS, JavaScript, dan Astro secara bertahap.',
        detail:
          'Dari proses ini saya belajar bahwa menyusun modul yang rapi, menjaga aksesibilitas, dan menguji regresi sama pentingnya dengan tampilan visual.',
        status: 'PRACTICING'
      },
      {
        phase: 'FASE 03',
        title: 'Eksplorasi & Pembersihan Data',
        description:
          'Mengolah dataset kualitas udara Kota Cirebon (2021–2025) dan membangun The Data Lab (/lab).',
        detail:
          'Menghadapi data yang kosong di tahun 2023, duplikasi baris di tahun 2024, serta cakupan parsial 2025 mengajarkan bahwa kejujuran metodologi jauh lebih penting daripada grafik yang tampak mulus.',
        status: 'ACTIVE · AQI STUDY'
      },
      {
        phase: 'FASE 04',
        title: 'Langkah Berikutnya',
        description:
          'Memperdalam algoritma, struktur data, sistem basis data, dan fondasi pemodelan kuantitatif.',
        detail:
          'Bersiap melangkah ke pembelajaran mesin (machine learning) dan sistem sensor terhubung (IoT) setelah fondasi pemrosesan data semakin kokoh.',
        status: 'PLANNED'
      }
    ]
  },

  education: {
    kicker: '04B / PENDIDIKAN FORMAL',
    heading: ['Teknik', 'Informatika.'],
    body:
      'Mahasiswa S1 Teknik Informatika di Universitas Komputer Indonesia (UNIKOM), mulai tahun 2026. Mata kuliah yang sedang dijalani meliputi Logika Komputasional, Pemrograman Web, Kalkulus, Algoritma dan Struktur Data, Sistem Cerdas Kolaboratif, serta Pola Pikir Komputasional. Fokus utama saat ini adalah memperkuat pemahaman Algoritma dan Struktur Data.',
    /* Joined with · by script.js into the coursework line. */
    coursework: ['Algoritma & Struktur Data', 'Basis Data', 'Matematika Diskrit'],
    foot: 'MULAI TAHUN 2026 · UNIKOM'
  },

  /* ------------------------------------------------------------------ */
  /* Milestones & credentials                                            */
  /* ------------------------------------------------------------------ */
  credentials: {
    kicker: 'ARC-04 · CREDENTIALS',
    heading: ['Bukti karya,', 'sedang bertumbuh.'],
    headingAccentWord: 'bertumbuh.',
    intro:
      'Sertifikat, penghargaan, dan publikasi hanya akan diarsipkan di halaman ini setelah benar-benar diperoleh dan dapat diverifikasi. Tidak ada klaim yang ditampilkan sebelum ada buktinya.',
    emptySlots: ['CERTIFICATE', 'AWARD', 'PUBLICATION'],
    emptyLabel: 'COMING SOON',
    emptyNote: 'RESERVED FOR FUTURE ENTRIES',
    items: []
  },

  /* ------------------------------------------------------------------ */
  /* Social + contact                                                    */
  /* ------------------------------------------------------------------ */
  social: {
    kicker: '01 / KANAL TERVERIFIKASI · FIND ME ELSEWHERE',
    heading: ['Mari tetap', 'terhubung.'],
    headingAccentWord: 'terhubung.',
    intro:
      'Daftar profil resmi dan arsip dokumentasi yang saya kelola di GitHub (@Fryel23 & @Fryel32), LinkedIn, Instagram, serta folder riset terbuka di Google Drive.',
    footnote: 'BUKA PROFIL RESMI ↗',
    footnoteSub: 'HANYA TAUTAN TERVERIFIKASI.',
    items: [
      {
        name: 'GitHub (@Fryel23)',
        iconKey: 'github',
        handle: 'Profil utama proyek & eksperimen (@Fryel23 & @Fryel32)',
        url: 'https://github.com/Fryel23'
      },
      {
        name: 'Instagram',
        iconKey: 'instagram',
        handle: 'Catatan keseharian & dokumentasi visual',
        url: 'https://www.instagram.com/reinnhv/'
      },
      {
        name: 'LinkedIn',
        iconKey: 'linkedin',
        handle: 'Profil akademik & jejaring profesional',
        url: 'https://www.linkedin.com/in/farrel-islami-putra-a17287387/'
      },
      {
        name: 'Arsip Dokumentasi (Drive)',
        iconKey: 'drive',
        handle: 'Folder terbuka lembar kerja riset & catatan belajar',
        url: 'https://drive.google.com/drive/folders/1c333-r98_cch1e_t_y2s_p3j-2l_k2q1'
      }
    ]
  },

  contact: {
    kicker: '02 / SURAT ELEKTRONIK · SAY HELLO',
    heading: 'Ingin berdiskusi melalui email? Kedua kotak masuk ini aktif.',
    note: 'Ada pertanyaan tentang riset AQI Cirebon, masukan teknis, atau ide kolaborasi? Silakan hubungi melalui salah satu alamat email di atas.',
    copyLabel: 'Salin',
    copyOk: 'Alamat email berhasil disalin ke papan klip.',
    copyFail: 'Penyalinan otomatis tidak tersedia. Silakan salin alamat secara manual.',
    personal: { label: 'Email Pribadi', address: 'kktwinf2008@gmail.com' },
    university: { label: 'Email Kampus (UNIKOM)', address: 'farrel.10126092@mahasiswa.unikom.ac.id' }
  },

  /* ------------------------------------------------------------------ */
  /* Closing + footer                                                    */
  /* ------------------------------------------------------------------ */
  closing: {
    top: {
      left: 'THANKS FOR TAKING A LOOK',
      right: 'CONCEPT, DESIGN & CODE\nMADE AS A LEARNING PROJECT'
    },
    motto: {
      label: 'PERSONAL MOTTO',
      text: '“Great things happen to those who never stop believing, striving, learning, and being grateful.”'
    },
    nameSolid: 'FARREL',
    nameOutline: 'ISLAMI PUTRA',
    note: 'Arsip tentang kode, data, dan hal-hal yang masih akan datang.',
    copyright: '© {year} · PERSONAL ARCHIVE'
  },

  siteFooter: {
    left: 'DESIGNED & CODED BY HAND',
    center: 'HTML + CSS + JS',
    right: 'NO PAGE BUILDERS, NO TEMPLATES'
  },

  /* ------------------------------------------------------------------ */
  /* Game Deck (section 03 / #games)                                     */
  /* ------------------------------------------------------------------ */
  /* SELF-REPORTED CASUAL METRICS only. Every stat is a joke-adjacent,
     honest self-description, never competitive data. Values may be a
     number (0 to 100, renders a progress bar) or a short string
     (renders as text without a bar). rarity: legendary / rare / common
     drives the card glow; themeColor is that game's accent and is only
     used for borders, bars and glow, never for body text. */
  gameDeck: {
    kicker: 'ARC-03 · GAME DECK',
    heading: ['Tekan start.', 'Lihat yang saya mainkan.'],
    headingAccentWord: 'start.',
    intro: 'Dek kartu permainan yang benar-benar saya mainkan di waktu luang. Seluruh statistik di bawah bersifat santai dan subjektif, bukan data kompetitif.',
    hint: 'KLIK INSERT COIN UNTUK MEMUAT DEK PERMAINAN',
    insertLabel: 'INSERT COIN',
    loadingLabel: 'MEMUAT...',
    ejectLabel: 'EJECT COIN',
    screenOffLabel: 'NO SIGNAL',
    screenOffSub: 'INSERT COIN TO CONTINUE',
    deckAriaLabel: 'Game deck',
    footnote: 'SELF-REPORTED CASUAL METRICS',
    footnoteSub: 'NOT COMPETITIVE DATA',
    games: [
      {
        id: 'valorant',
        name: 'Valorant',
        platform: 'Laptop',
        genre: 'Tactical Shooter',
        status: 'Sedang Main',
        themeColor: '#FF4655',
        rarity: 'legendary',
        pixelCharacter: 'shooter',
        stats: [
          { label: 'Aim', value: 80, note: 'Kena kepala / sisanya doa' },
          { label: 'Game Sense', value: 90, note: 'Tahu musuh di mana' },
          { label: 'Rage Control', value: 35, note: 'Gebrakan meja tipis' },
          { label: 'Clutch Panic Rate', value: 99, note: 'Panik saat clutch' }
        ]
      },
      {
        id: 'hades-ii',
        name: 'Hades II',
        platform: 'Laptop',
        genre: 'Action Roguelike',
        status: 'Sedang Main',
        themeColor: '#20E3B2',
        rarity: 'rare',
        pixelCharacter: 'roguelike',
        stats: [
          { label: 'Dash Spam Efficiency', value: 95 },
          { label: 'Boss Death Patience', value: 40 },
          { label: 'Melinoë Simp Meter', value: 85 },
          { label: '"Satu Run Lagi" Delusion', value: 100 }
        ]
      },
      {
        id: 'dark-souls-iii',
        name: 'Dark Souls III',
        platform: 'Laptop',
        genre: 'Action RPG / Soulslike',
        status: 'Sedang Main',
        themeColor: '#E25822',
        rarity: 'rare',
        pixelCharacter: 'soulslike',
        stats: [
          { label: 'Panic Roll Accuracy', value: 88 },
          { label: 'Rage Control', value: 12, note: 'Hampir Uninstal' },
          { label: 'Estus Chug Timing', value: 50, note: 'Selalu Telat' },
          { label: 'You Died Counter', value: 'Over 9000' }
        ]
      },
      {
        id: 'hearts-of-iron-iv',
        name: 'Hearts of Iron IV',
        platform: 'Laptop',
        genre: 'Grand Strategy',
        status: 'Sedang Main',
        themeColor: '#8B5A2B',
        rarity: 'common',
        pixelCharacter: 'strategy',
        stats: [
          { label: 'Map Staring Focus', value: 99 },
          { label: 'Historical Deviation', value: 85, note: 'Bikin Sejarah Sendiri' },
          { label: 'Supply Line Management', value: 45, note: 'Logistik Berantakan' },
          { label: 'Sleep Deprivation', value: 'Tinggi' }
        ]
      },
      {
        id: 'minecraft',
        name: 'Minecraft',
        platform: 'Laptop',
        genre: 'Sandbox / Survival',
        status: 'Sedang Main',
        themeColor: '#57874E',
        rarity: 'common',
        pixelCharacter: 'sandbox',
        stats: [
          { label: 'Dirt House Aesthetic', value: 90 },
          { label: 'Diamond Greed', value: 95 },
          { label: 'Creepers Jump Scared', value: 100 },
          { label: 'Inventory Organization', value: 15, note: 'Berantakan Parah' }
        ]
      },
      {
        id: 'age-of-empires-iv',
        name: 'Age of Empires IV',
        platform: 'Laptop',
        genre: 'Real-Time Strategy',
        status: 'Sedang Main',
        themeColor: '#D4AF37',
        rarity: 'common',
        pixelCharacter: 'strategy',
        stats: [
          { label: 'Villager Production Efficiency', value: 85 },
          { label: 'APM', value: 'Karat Tapi Cepat' },
          { label: 'Rage Control vs Rush', value: 40 },
          { label: 'Wall Building Perfection', value: 75 }
        ]
      },
      {
        id: 'total-war-warhammer-iii',
        name: 'Total War: Warhammer III',
        platform: 'Laptop',
        genre: 'Turn-Based Strategy / RTS',
        status: 'Sedang Main',
        themeColor: '#990000',
        rarity: 'common',
        pixelCharacter: 'strategy',
        stats: [
          { label: 'Auto-Resolve Dependency', value: 60 },
          { label: 'Flanking Maneuver Success', value: 70 },
          { label: 'Magic Spell Misclick Rate', value: 40 },
          { label: 'Chaos Infestation Tolerance', value: 'Low' }
        ]
      },
      {
        id: 'red-dead-redemption-ii',
        name: 'Red Dead Redemption II',
        platform: 'Laptop',
        genre: 'Action-Adventure / Open World',
        status: 'Sedang Main',
        themeColor: '#E51A1A',
        rarity: 'legendary',
        pixelCharacter: 'sandbox',
        stats: [
          { label: 'Greeting Every NPC', value: 95, note: 'Hey Mister!' },
          { label: 'Horse Collision Rate', value: 70, note: 'Menabrak Pohon' },
          { label: 'Emotional Attachment to Arthur', value: 100 },
          { label: 'Lawman Escape Success', value: 60 }
        ]
      },
      {
        id: 'ghost-of-tsushima',
        name: 'Ghost of Tsushima',
        platform: 'Laptop',
        genre: 'Action-Adventure / Hack and Slash',
        status: 'Tamat',
        themeColor: '#C41E3A',
        accentColor: '#D4AF37',
        rarity: 'legendary',
        pixelCharacter: 'soulslike',
        stats: [
          { label: 'Parrying Timing Perfection', value: 85 },
          { label: 'Photo Mode Abuse', value: 90 },
          { label: 'Stand-off Bravery', value: 95 },
          { label: 'Fox Petting Frequency', value: 100 }
        ]
      },
      {
        id: 'the-last-of-us-part-i',
        name: 'The Last of Us Part I',
        platform: 'Laptop',
        genre: 'Action-Adventure / Survival Horror',
        status: 'Tamat',
        themeColor: '#3B443A',
        rarity: 'rare',
        pixelCharacter: 'horror',
        stats: [
          { label: 'Brick/Bottle Throw Accuracy', value: 90 },
          { label: 'Joel Dad Energy Absorption', value: 100 },
          { label: 'Clicker Stealth Anxiety', value: 85 },
          { label: 'Crafting Material Hoarding', value: 95 }
        ]
      },
      {
        id: 'outlast-ii',
        name: 'Outlast II',
        platform: 'Laptop',
        genre: 'Survival Horror',
        status: 'Tamat',
        themeColor: '#39FF14',
        rarity: 'common',
        pixelCharacter: 'horror',
        stats: [
          { label: 'Running in Dark Speed', value: 99 },
          { label: 'Camcorder Battery Anxiety', value: 95 },
          { label: 'Screaming Internal/External', value: 100 },
          { label: 'Rage Control', value: 20, note: 'Takut Campur Kesal' }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  /* Off-screen (section ARC-05 / #offscreen)                            */
  /* ------------------------------------------------------------------ */
  offscreen: {
    kicker: 'ARC-05 · OFF-SCREEN & COMPANION',
    heading: ['Di luar jam ngoding.', 'Tetap penasaran.'],
    headingAccentWord: 'penasaran.',
    intro: 'Kegiatan yang saya nikmati saat tidak sedang menatap terminal: olahraga, musik, dan eksperimen santai.',
    pixelLabel: 'UNIT 01 · DESK LOOP',
    hobbies: [
      { label: 'Badminton', detail: '2x sebulan', icon: 'shuttlecock' },
      { label: 'Coding', detail: 'Eksperimen Python', icon: 'terminal' },
      { label: 'Gaming', detail: 'Sekitar 2 jam sehari', icon: 'gamepad' },
      { label: 'Music', detail: 'Sepanjang hari', icon: 'headphones' }
    ],
    spotify: {
      playlistName: 'while(True): listen()',
      playlistUrl: 'https://open.spotify.com/playlist/0fmL6az8JL4tHrwmZwRx2c?si=5304e74573ec46c9&pt=044b66f8ec8b8ac888b4c027e7da55c7',
      embedUrl: 'https://open.spotify.com/embed/playlist/0fmL6az8JL4tHrwmZwRx2c?utm_source=generator&theme=0',
      frameLabel: 'ARCHIVE SOUNDTRACK / ON REPEAT',
      /* Now Playing header indicator: polls this endpoint every 30s.
         Honest states only: playing, recent (dimmed), or hidden on error. */
      nowPlayingEndpoint: 'https://farrel-spotify-api.vercel.app/api/spotify',
      nowPlayingPollMs: 30000
    }
  },

  /* ------------------------------------------------------------------ */
  /* GitHub Activity (section ARC-02 / #github)                          */
  /* ------------------------------------------------------------------ */
  /* Live public REST data with a one hour cache. No contribution
     streaks, no total commit claims: the REST API cannot count those
     honestly, so they are never shown. If fetch fails, the section
     falls back to the last cache or an honest message. */
  githubActivity: {
    kicker: 'ARC-02 · GITHUB TELEMETRY',
    heading: ['Jejak karya,', 'bukan sekadar klaim.'],
    headingAccentWord: 'klaim.',
    intro: 'Aktivitas publik dari profil GitHub resmi (@Fryel23 & @Fryel32), diambil langsung dari GitHub REST API dan di-cache selama satu jam.',
    username: 'Fryel23',
    secondaryUsername: 'Fryel32',
    profileUrl: 'https://github.com/Fryel23',
    secondaryProfileUrl: 'https://github.com/Fryel32',
    cacheKey: 'fryel23-github-stats',
    cacheTTL: 3600000,
    jsRequiredMessage: 'STATISTIK GITHUB MEMERLUKAN JAVASCRIPT.',
    fallbackMessage: 'STATISTIK GITHUB SEDANG TIDAK DAPAT DIMUAT SAAT INI.',
    fallbackLinkLabel: 'BUKA PROFIL GITHUB (@FRYEL23)',
    cards: {
      repositories: 'REPOSITORIES',
      stars: 'STARS EARNED',
      followers: 'FOLLOWERS',
      languages: 'TOP LANGUAGES'
    }
  },

  /* ------------------------------------------------------------------ */
  /* Companion page pet (section ARC-05B / #companion)                   */
  /* ------------------------------------------------------------------ */
  /* The pet itself is the pixel-art SVG from the Off-screen section,
     cloned into a fixed corner button. Summon preference is a UI
     preference stored in localStorage (allowed; it is not content). */
  companion: {
    kicker: 'ARC-05B · PIXEL COMPANION',
    heading: ['Ada teman kecil', 'yang ikut menemani.'],
    headingAccentWord: 'menemani.',
    intro: 'Teman piksel kecil bernama Kok yang menjaga sudut halaman arsip ini. Panggil kapan saja kalau ingin ditemani saat membaca.',
    summonLabel: 'Panggil Kok (Companion)',
    dismissLabel: 'Istirahatkan Kok',
    petName: 'Kok',
    petAriaLabel: 'Companion: Kok. Klik untuk menyapa.',
    stampBold: 'KOK',
    stampTop: 'PAGE PET',
    note: 'THE PET LIVES IN THE CORNER OF EVERY SECTION',
    noteSub: 'CLICK IT TO SAY HI',
    tooltipLines: [
      'Halo! Farrel mungkin sedang merapikan dataset.',
      'Kok ikut menemani kamu menjelajahi arsip ini.',
      'Satu komit lagi sebelum istirahat.'
    ]
  },

  /* ------------------------------------------------------------------ */
  /* Decoration switchboard (§3.2, §6.1)                                 */
  /* ------------------------------------------------------------------ */
  decorations: {
    hero: {
      edgeLabel: '01 / PERKENALAN',
      edgeLabelBottom: '02 / STUDI KASUS'
    },
    spine: {
      work: '02 / STUDI KASUS',
      games: 'ARC-03 / PLAY',
      about: '01 / PROFIL',
      offscreen: 'ARC-05 / OFF-SCREEN',
      github: 'ARC-02 / TELEMETRY',
      credentials: 'ARC-04 / CREDENTIALS',
      companion: 'ARC-05B / PET',
      profiles: '04 / KONTAK'
    },
    gallery: {
      gridLabel: '02 / ARCHIVE',
      rulerLabels: ['01 / FLAGSHIP', '02 / RESERVED', '03 / NEXT'],
      blueprintGrid: true,
      cornerBrackets: true,
      measurementTicks: true,
      cornerBracket: true
    },
    games: {
      spotlight: true,
      scanlines: true,
      joystick: true,
      buttons: true
    },
    about: {
      fieldNotes: true,
      sideAnnotations: true,
      constellation: true
    },
    offscreen: {
      habitat: true,
      pixelFloor: true,
      pixelWall: true,
      dustParticles: 5,
      dustParticlesMobile: 4
    },
    github: {
      contributionSkeleton: true,
      brackets: true,
      bracketLabel: 'GIT LOG / FRYEL23 · PUBLIC TELEMETRY'
    },
    credentials: {
      rulerLines: true,
      stamp: 'ARCHIVE / CREDENTIALS',
      plateLabel: 'ARCHIVE / MILESTONES / ARC-04'
    },
    companion: {
      habitat: true,
      habitatLabel: 'PET HABITAT / ARC-05B',
      habitatStatusIdle: 'WAITING IN HABITAT',
      habitatStatusSummoned: 'SUMMONED · CORNER POST'
    },
    contact: {
      envelopeStamp: true,
      signalWaves: true
    }
  }
};
