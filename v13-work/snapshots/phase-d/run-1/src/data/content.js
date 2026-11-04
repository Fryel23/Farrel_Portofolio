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
 * content.js: sumber data statis global portofolio (migrasi Astro V7.0).
 * Pengganti portfolio-data.js: diimpor sebagai modul ES6 oleh skrip
 * src/scripts/*.js. Isi data identik dengan V6.7; hanya path aset
 * (menjadi /assets/...) dan tautan antar halaman (#work -> /work)
 * yang menyesuaikan arsitektur Hub-and-Spoke.
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
    github: 'https://github.com/Fryel32',
    // Google Drive documentation archive (research & learning log).
    docs: 'https://drive.google.com/drive/folders/1YaoRkFvdlk29vdRAFQxj5ypVD-7WDtTl?usp=drive_link'
  },

  /* ------------------------------------------------------------------ */
  /* Hero                                                                */
  /* ------------------------------------------------------------------ */
  hero: {
    eyebrow: 'INFORMATICS ENGINEERING · UNIKOM · EST. 2026',
    // Each entry is one masked display line. Keep lines short so they never clip.
    headline: ['Curiosity,', 'grounded in data.'],
    headlineAccent: 'data.',
    headlineTail: 'Kadang bingung, kadang berhasil. Ini catatan prosesnya.',
    description:
      'Saya Farrel Islami Putra, mahasiswa S1 Teknik Informatika 2026 di Universitas Komputer Indonesia. Saya tertarik pada teknologi karena ingin tahu cara kerjanya, terutama yang bisa dipakai untuk menyelesaikan masalah sehari-hari. Fokus utama saya adalah tentang data, tapi saya juga penasaran dengan software dan sistem yang lebih luas. Portofolio ini bukan tempat memamerkan yang sudah selesai, melainkan tempat dari apa yang sedang saya pelajari.',
    primaryCta: { label: 'Explore the work', href: '/work' },
    docsCta: { label: 'View documentation', href: 'https://drive.google.com/drive/folders/1YaoRkFvdlk29vdRAFQxj5ypVD-7WDtTl?usp=drive_link' },
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
      cornerLabel: 'FIELD / 01',
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
    kicker: 'THE CURIOSITY MAP',
    heading: ['How my interests', 'connect.'],
    headingAccentWord: 'connect.',
    intro:
      'Data ada di tengah; sisanya tumbuh di sekitar itu. Pilih satu titik untuk membaca di mana posisi saya saat ini.',
    hint: 'SELECT A NODE: CLICK, TAP, OR USE KEYBOARD TAB + ENTER',
    panelTitle: 'FIELD NOTES',
    nodes: [
      {
        id: 'data',
        name: 'DATA',
        status: 'Primary focus',
        detail:
          'Inti dari peta ini. Sedang dipraktikkan dalam penelitian kualitas udara Cirebon: mengumpulkan, membersihkan, dan mencari pola dari data terbuka. Saya suka bagian di mana data mulai bercerita.',
        x: 50, y: 46
      },
      {
        id: 'software',
        name: 'SOFTWARE',
        status: 'Exploring',
        detail:
          'HTML, CSS, dan JavaScript yang ditulis tangan: portofolio ini adalah tempat latihannya. Tapi jujur, kode saya masih sering berantakan, dan saya sedang belajar merapikannya.',
        x: 22, y: 20
      },
      {
        id: 'ai',
        name: 'AI',
        status: 'Future interest',
        detail:
          'Sebuah arah, bukan klaim. Machine learning akan jadi area yang serius setelah fondasi data saya lebih kuat.',
        x: 78, y: 20
      },
      {
        id: 'databases',
        name: 'DATABASE SYSTEMS',
        status: 'Exploring',
        detail:
          'Dasar-dasar SQL dan bagaimana data dimodelkan, ditanyakan, dan disimpan. Masih dipelajari berdampingan dengan analisis data.',
        x: 22, y: 74
      },
      {
        id: 'iot',
        name: 'IoT',
        status: 'Future interest',
        detail:
          'Rasa penasaran tentang sistem terhubung dan sensor, di mana perangkat fisik menghasilkan data yang suka saya analisis.',
        x: 78, y: 74
      }
    ]
  },

  /* ------------------------------------------------------------------ */
  /* Project gallery                                                     */
  /* ------------------------------------------------------------------ */
  gallery: {
    kicker: '01 / SELECTED WORKS',
    heading: ['The project', 'archive.'],
    headingAccentWord: 'archive.',
    aside:
      'Satu proyek penelitian yang masih berjalan, satu ide yang tertunda, dan satu rencana kecil untuk ke depan. Semua ditulis apa adanya.',
    countLabel: 'PROJECTS',
    // Hero search is a section navigator (V5.3); the gallery empty state
    // can now only be reached through the category filters.
    emptyMessage: 'No projects match this filter. Reserved slots return with the All work view.',
    footerLeft: 'KEEP EXPLORING',
    footerRight: 'SCROLL ↓'
  },

  filters: ['All', 'Data & Research'],

  /* ------------------------------------------------------------------ */
  /* V5.3: Global Archive Navigator (hero search)                        */
  /* ------------------------------------------------------------------ */
  /* The hero search is a keyword navigator, not a free text search
     engine. Every accepted keyword is authored here in the allowlist
     below; visitor input can only ever select a target from this list.
     It can never build a selector, a URL, or executable code.
     Matching order (deterministic, no fuzzy matching):
       1. exact   : alias equals the query
       2. phrase  : the alias appears inside the query on word boundaries
       3. prefix  : the alias starts with the query (3+ characters)
     Ambiguous keywords (listed in multiRoutes) resolve to several
     sections, shown as up to three selectable results. */
  archiveSearch: {
    maxQueryLength: 80,
    inputLabel: 'Search the archive: jump to a section by keyword',
    submitLabel: 'Search the archive',
    emptyMessage: 'Type a topic, hobby, or profile to navigate the archive.',
    notFoundMessage: 'No matching archive entry found. Try hobbies, Instagram, AQI, GitHub, or certificates.',
    listLabel: 'Archive destinations',
    goAnnouncement: 'Navigating to',
    routes: [
      { targetId: 'top', label: 'Home / start', aliases: ['home', 'top', 'start', 'intro', 'hero'] },
      { targetId: 'work', label: 'Project archive', aliases: ['project', 'projects', 'work', 'aqi', 'cirebon', 'air quality', 'air quality index', 'research', 'riset', 'dataset'] },
      { targetId: 'games', label: 'Game deck', aliases: ['game', 'games', 'arcade', 'game deck'] },
      { targetId: 'about', label: 'About & skills', aliases: ['about', 'about me', 'skills', 'skill', 'software', 'python', 'cpp', 'c++', 'javascript', 'php', 'database', 'databases', 'ai', 'iot', 'robotics', 'curiosity map'] },
      { targetId: 'journey', label: 'Learning journey', aliases: ['journey', 'learning', 'learn', 'education', 'study', 'belajar', 'perjalanan belajar'] },
      { targetId: 'offscreen', label: 'Off-screen hobbies', aliases: ['hobby', 'hobbies', 'hobi', 'badminton', 'music', 'musik', 'gaming', 'gameplay', 'off-screen', 'offscreen'] },
      { targetId: 'github', label: 'GitHub activity', aliases: ['github', 'repositories', 'repository', 'commits', 'open source', 'open-source'] },
      { targetId: 'credentials', label: 'Credentials archive', aliases: ['certificate', 'certificates', 'credential', 'credentials', 'award', 'awards', 'achievement', 'achievements', 'sertifikat', 'prestasi'] },
      { targetId: 'companion', label: 'Companion habitat', aliases: ['pet', 'companion', 'summon', 'kok'] },
      { targetId: 'profiles', label: 'Social profiles', aliases: ['instagram', 'linkedin', 'social', 'social media', 'profiles', 'google drive', 'documentation', 'dokumentasi'] },
      { targetId: 'contact', label: 'Contact email', aliases: ['email', 'gmail', 'contact', 'contacts', 'kontak', 'reach me', 'say hello'] },
      { targetId: 'closing', label: 'Closing & motto', aliases: ['footer', 'motto', 'back to top', 'closing'] },
      { targetId: 'adr', label: 'Engineering records vault', aliases: ['adr', 'audit', 'architecture', 'report', 'reports', 'benchmark', 'lcp', 'webgl', 'diagnostic', 'verification', 'records'] },
      { targetId: 'codex', label: 'The Grand Codex (100-600)', aliases: ['codex', 'grand codex', 'knowledge', 'knowledge graph', 'graph', 'mathml', 'ispu', 'fresnel', 'decimal', 'taxonomy', 'backlinks'] }
    ],
    /* One keyword, several honest destinations. Keep each entry short. */
    multiRoutes: [
      { targetId: 'work', label: 'Project archive', aliases: ['data'] },
      { targetId: 'about', label: 'About & skills', aliases: ['data'] }
    ]
  },

  /* Real projects only. A card shows a working link ONLY when it points
     to an actual destination. V7.4: `slug` mengikat entri ini ke halaman
     case study (Content Collection src/content/work/<slug>.md) supaya
     kartu menaut ke detail secara internal dan morph view transition
     (Fase 2) memakai nama yang identik di markup statis maupun hasil
     render JavaScript. Tautan dataset eksternal tetap tersedia sebagai
     CTA di halaman detailnya. */
  projects: [
    {
      slug: 'aqi-cirebon',
      title: 'Air Quality Index Trends · Cirebon (2021–2024)',
      category: 'Data & Research',
      tag: 'Research / Data Analysis',
      status: 'IN PROGRESS',
      description:
        'Proyek yang sedang berjalan. Saya sedang membersihkan data kualitas udara Cirebon dan mencoba melihat polanya. Ada satu hal yang saya sadari saat mengolahnya: data tahun 2023 punya banyak nilai kosong, dan itu sedikit mengubah cara saya melihat tren. Temuan dan kesimpulan belum ada, karena penelitiannya masih berlangsung.',
      // Only tools actually in use for the project right now.
      stack: ['Python', 'pandas (learning)'],
      image: '/assets/project-aqi.svg',
      link: 'https://opendata.cirebonkota.go.id/dataset/data-kualitas-udara',
      linkLabel: 'Open dataset source'
    }
  ],

  /* Reserved slots: visually designed placeholders, NOT projects.
     They render only in the unfiltered, empty-search view, are
     non-clickable, and never count toward totals, filters or search. */
  comingSoon: [
    {
      kicker: 'NEXT IN THE ARCHIVE',
      title: 'Reserved slot / 02',
      text: 'Ide yang saya tunda: sistem untuk menyaring berita internet dan memperkirakan dampaknya pada ekonomi, seperti harga barang atau saham. Saya berhenti di tengah jalan karena sadar belum punya cukup ilmu untuk mendapatkan dan mengolah informasinya. Suatu hari nanti akan dilanjutkan.'
    },
    {
      kicker: 'COMING SOON',
      title: 'Reserved slot / 03',
      text: 'Rencana terdekat: membuat sistem rekomendasi saham Indonesia berskala kecil. Datanya akan diambil dari yfinance, dengan beberapa indikator sederhana. Belum dimulai, tapi sudah dipikirkan.'
    }
  ],

  /* ------------------------------------------------------------------ */
  /* About                                                               */
  /* ------------------------------------------------------------------ */
  about: {
    kicker: '02 / THE PERSON BEHIND THE CODE',
    heading: ['Curious by', 'default.'],
    headingAccentWord: 'default.',
    stamp: { top: 'RIGOROUS WITH', bold: 'DETAILS' },
    lead:
      'Saya memilih Informatika karena ingin tahu cara kerja teknologi, terutama yang bisa dipakai untuk menyelesaikan masalah sehari-hari. Di UNIKOM saya merasa punya ruang untuk mengeksplorasi hal-hal baru, dan itu yang membuat saya terus termotivasi untuk belajar. Saya suka belajar dari hal-hal dasar, bukan cuma praktiknya saja.',
    body:
      'Ketertarikan saya pada data datang dari kebiasaan sederhana: saya suka melihat pola. Bagi saya, data itu bukan cuma kumpulan informasi. Di baliknya ada cerita, dan dari cerita itu saya bisa membuat teori atau sekadar berandai-andai tentang apa yang mungkin terjadi. Itu bagian yang paling saya nikmati. Biasanya saya belajar di perpustakaan, kafe, atau di kamar sambil dengerin musik. Kalau ada konteks yang tidak saya pahami, saya akan searching, dan sering keterusan sampai ke konteks lain yang sebenarnya tidak sedang saya cari.',
    /* Field notes (5.3.1): short, honest snippets rendered as sticky notes
       next to the about copy. Keep each entry one line. */
    notes: [
      'Sedang mendalami Python untuk analisis data',
      'Editor andalan: Zed',
      'Belajar di tempat yang berbeda-beda',
      'Musik sepanjang hari'
    ],
    artwork: {
      image: '/assets/profile-card.svg',
      alt: 'Illustrated personal file card of Farrel Islami Putra',
      label: { small: 'PERSONAL FILE', strong: 'NO. 0032 / FIP', foot: 'COLLECTED & IN PROGRESS' }
    }
  },

  languagesTools: {
    heading: 'Languages & Tools',
    miniLabel: 'DAILY DRIVERS',
    items: ['Py', 'C++', 'JS', 'PHP', 'HTML', 'CSS', 'Git', 'VS Code', 'Zed', 'Linux']
  },

  skills: {
    heading: 'Skills',
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
    heading: ['Learning by', 'building.'],
    /* V6.6 Fase 7.2: `detail` powers the accordion body. One honest extra
       paragraph per phase, shown only when the visitor opens the item. */
    items: [
      {
        phase: 'PHASE 01',
        title: 'Foundations',
        description:
          'Belajar Python dan C++ dari nol. Sempat bingung kenapa pointer di C++ harus ada.',
        detail:
          'Jawabannya baru mengerti setelah baca dokumentasi berulang kali, bukan setelah nonton tutorial. Belajar logika komputasional dan pola pikir komputasional di kampus juga banyak membantu cara saya berpikir.',
        status: 'ONGOING'
      },
      {
        phase: 'PHASE 02',
        title: 'Web & software',
        description:
          'Portofolio ini buktinya: HTML, CSS, dan JavaScript yang ditulis tangan.',
        detail:
          'Tapi dari sini juga saya sadar bahwa menulis program yang efisien itu susah. Kode saya masih berantakan, dan saya sedang berusaha memahami kenapa sebuah algoritma lebih baik dari yang lain.',
        status: 'PRACTICING'
      },
      {
        phase: 'PHASE 03',
        title: 'Data',
        description:
          'Mengolah data kualitas udara Cirebon. Sedang di tahap pembersihan data.',
        detail:
          'Ada data yang kosong, ada format yang aneh. Di sinilah saya belajar bahwa sebagian besar waktu di data science itu bukan membangun model, tapi merapikan data.',
        status: 'ACTIVE · AQI STUDY'
      },
      {
        phase: 'PHASE 04',
        title: 'Ahead',
        description:
          'Rencana ke depan: merapikan cara menulis program, memahami algoritma dan struktur data lebih dalam.',
        detail:
          'Serta mulai melirik machine learning dan sistem terhubung setelah fondasi data saya cukup kuat.',
        status: 'PLANNED'
      }
    ]
  },

  education: {
    kicker: '04 / EDUCATION',
    heading: ['Informatics', 'Engineering.'],
    body:
      'Mahasiswa Informatika di Universitas Komputer Indonesia (UNIKOM), mulai tahun 2026. Mata kuliah yang sedang dijalani antara lain Logika Komputasional, Pemrograman Web, Kalkulus, Algoritma dan Struktur Data, Sistem Cerdas Kolaboratif, dan Pola Pikir Komputasional. Sejauh ini tidak ada yang benar-benar mustahil, tapi Algoritma dan Struktur Data masih butuh perhatian lebih.',
    /* V6.6 Fase 7.1: joined with · by script.js into the coursework line. */
    coursework: ['Data Structures', 'Databases', 'Discrete Math'],
    foot: 'STARTED IN 2026'
  },

  /* ------------------------------------------------------------------ */
  /* Milestones & credentials                                            */
  /* ------------------------------------------------------------------ */
  credentials: {
    kicker: '05 / MILESTONES & CREDENTIALS',
    heading: ['Proof of work,', 'in progress.'],
    headingAccentWord: 'progress.',
    intro:
      'Sertifikat, penghargaan, dan publikasi akan diarsipkan di sini saat benar-benar didapatkan. Tidak ada yang ditampilkan sebelum ada buktinya.',
    emptySlots: ['CERTIFICATE', 'AWARD', 'PUBLICATION'],
    emptyLabel: 'COMING SOON',
    emptyNote: 'RESERVED FOR FUTURE ENTRIES',

    /* HOW TO ADD A CREDENTIAL (see README for the full walkthrough):
       {
         title: 'Exact certificate title',
         issuer: 'Issuing organization',
         date: '2026',              // optional, '' when unknown
         type: 'Certificate',       // Certificate / Award / Competition / Publication / …
         description: 'One honest line about relevance.',   // optional
         image: '/assets/credentials/my-certificate.jpg',    // optional
         proofUrl: 'https://official-verification-url',     // required for a Verify button
         credentialId: 'PUBLIC-ID-IF-ANY'                    // optional
       }
       Only render a verification button when proofUrl is a real URL.
       Cards with an `image` also open a large accessible preview dialog
       (native <dialog>, Escape to close, focus returned to the card). */
    items: []
  },

  /* ------------------------------------------------------------------ */
  /* Social + contact                                                    */
  /* ------------------------------------------------------------------ */
  social: {
    kicker: '06 / FIND ME ELSEWHERE',
    heading: ["Let's stay", 'connected.'],
    headingAccentWord: 'connected.',
    intro:
      'Profil dan arsip yang memang milik saya. Folder dokumentasi di Google Drive menyimpan bukti pekerjaan, penelitian, dan proses belajar.',
    footnote: 'OPEN A PROFILE ↗',
    footnoteSub: 'VERIFIED LINKS ONLY.',
    items: [
      {
        name: 'GitHub',
        // iconKey picks a proper inline SVG brand mark in script.js.
        iconKey: 'github',
        handle: 'Code, experiments & learning repositories',
        url: 'https://github.com/Fryel32'
      },
      {
        name: 'Instagram',
        iconKey: 'instagram',
        // NOTE: the username spelling is intentionally not displayed:
        // the supplied URL path (reinnhv) differs from the described
        // handle (rennhv). The exact supplied URL is preserved as-is.
        handle: 'Photos & everyday notes',
        url: 'https://www.instagram.com/reinnhv/'
      },
      {
        name: 'LinkedIn',
        iconKey: 'linkedin',
        handle: 'Professional profile & connections',
        url: 'https://www.linkedin.com/in/farrel-islami-putra-a17287387/'
      },
      {
        name: 'Documentation Archive',
        iconKey: 'drive',
        handle: 'Research & learning log on Google Drive',
        url: 'https://drive.google.com/drive/folders/1YaoRkFvdlk29vdRAFQxj5ypVD-7WDtTl?usp=drive_link'
      }
      // Add more profiles here only once each URL is real and verified.
      // Entries with an empty url are hidden automatically.
    ]
  },

  contact: {
    kicker: 'SAY HELLO',
    heading: 'Prefer email? Both inboxes are open.',
    note: 'Ada pertanyaan, masukan, atau ide kolaborasi? Silakan kirim email.',
    copyLabel: 'Copy',
    copyOk: 'Email address copied to clipboard.',
    copyFail: 'Copy is not available here. Please copy the address manually.',
    personal: { label: 'Personal email', address: 'kktwinf2008@gmail.com' },
    university: { label: 'University email', address: 'farrel.10126092@mahasiswa.unikom.ac.id' }
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
  /* V4: Game Deck (section 03 / #games)                                 */
  /* ------------------------------------------------------------------ */
  /* SELF-REPORTED CASUAL METRICS only. Every stat is a joke-adjacent,
     honest self-description, never competitive data. Values may be a
     number (0 to 100, renders a progress bar) or a short string
     (renders as text without a bar). rarity: legendary / rare / common
     drives the card glow; themeColor is that game's accent and is only
     used for borders, bars and glow, never for body text. */
  gameDeck: {
    kicker: '03 / INSERT COIN',
    heading: ['Press start.', 'See what I play.'],
    headingAccentWord: 'start.',
    intro: 'A self-reported deck of games I actually play. Stats are casual, not competitive.',
    hint: 'CLICK INSERT COIN TO LOAD THE DECK',
    insertLabel: 'INSERT COIN',
    loadingLabel: 'LOADING...',
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
  /* V4: Off-screen (section 05 / #offscreen)                            */
  /* ------------------------------------------------------------------ */
  offscreen: {
    kicker: '05 / OFF-SCREEN',
    heading: ['After hours.', 'Still curious.'],
    headingAccentWord: 'curious.',
    intro: 'Yang saya lakukan saat tidak sedang menatap terminal.',
    pixelLabel: 'UNIT 01 · DESK LOOP',
    hobbies: [
      { label: 'Badminton', detail: '2x a month', icon: 'shuttlecock' },
      { label: 'Coding', detail: 'Python experiments', icon: 'terminal' },
      { label: 'Gaming', detail: '2 hours a day', icon: 'gamepad' },
      { label: 'Music', detail: 'All day', icon: 'headphones' }
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
  /* V4: GitHub Activity (section 06 / #github)                          */
  /* ------------------------------------------------------------------ */
  /* Live public REST data with a one hour cache. No contribution
     streaks, no total commit claims: the REST API cannot count those
     honestly, so they are never shown. If fetch fails, the section
     falls back to the last cache or an honest message. */
  githubActivity: {
    kicker: '06 / OPEN SOURCE PULSE',
    heading: ['Commits,', 'not claims.'],
    headingAccentWord: 'claims.',
    intro: 'Aktivitas publik dari GitHub, diambil langsung dan di-cache selama satu jam.',
    username: 'Fryel32',
    profileUrl: 'https://github.com/Fryel32',
    cacheKey: 'fryel32-github-stats-v1',
    cacheTTL: 3600000,
    jsRequiredMessage: 'GITHUB STATS REQUIRE JAVASCRIPT.',
    fallbackMessage: 'GITHUB STATS ARE UNAVAILABLE RIGHT NOW.',
    fallbackLinkLabel: 'VISIT THE PROFILE DIRECTLY',
    cards: {
      repositories: 'REPOSITORIES',
      stars: 'STARS EARNED',
      followers: 'FOLLOWERS',
      languages: 'TOP LANGUAGES'
    }
  },

  /* ------------------------------------------------------------------ */
  /* V4: Companion page pet (section 08 / #companion)                    */
  /* ------------------------------------------------------------------ */
  /* The pet itself is the pixel-art SVG from the Off-screen section,
     cloned into a fixed corner button. Summon preference is a UI
     preference stored in localStorage (allowed; it is not content). */
  companion: {
    kicker: '08 / A SMALL COMPANION',
    heading: ['Someone is', 'hanging around.'],
    headingAccentWord: 'around.',
    intro: 'Teman piksel kecil yang mengikuti arsip ini. Panggil kalau ingin ditemani.',
    summonLabel: 'Summon companion',
    dismissLabel: 'Dismiss companion',
    petName: 'Kok',
    petAriaLabel: 'Companion: Kok. Click to say hi.',
    stampBold: 'KOK',
    stampTop: 'PAGE PET',
    note: 'THE PET LIVES IN THE CORNER OF EVERY SECTION',
    noteSub: 'CLICK IT TO SAY HI',
    tooltipLines: [
      'Hi, Farrel is probably coding.',
      'Kok is watching the archive with you.',
      'One more commit before bed.'
    ]
  },

  /* ------------------------------------------------------------------ */
  /* V5.2: decoration switchboard (§3.2, §6.1)                           */
  /* ------------------------------------------------------------------ */
  /* One honest, editable switch per decoration. Turning a flag off
     leaves the section fully usable: decorations enrich negative space,
     they never carry information on their own. Labels below are archive
     style codes, not counts and not claims. Spine labels follow the real
     DOM order of sections (hero, work, games, about, offscreen, github,
     credentials, companion, profiles), which is why they differ from the
     older content kickers. */
  decorations: {
    hero: {
      edgeLabel: '00 / START',
      edgeLabelBottom: '01 / WORK'
    },
    spine: {
      work: '01 / WORK',
      games: '02 / PLAY',
      about: '03 / ABOUT',
      offscreen: '04 / AFTER HOURS',
      github: '05 / PULSE',
      credentials: '06 / VAULT',
      companion: '07 / PET',
      profiles: '08 / CONNECT'
    },
    gallery: {
      gridLabel: '01 / ARCHIVE',
      rulerLabels: ['01 / ARCHIVE', '02 / STUDY', '03 / NEXT'],
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
      bracketLabel: 'GIT LOG / FRYEL32'
    },
    credentials: {
      rulerLines: true,
      stamp: 'ARCHIVE / CREDENTIALS',
      plateLabel: 'ARCHIVE / MILESTONES / 05'
    },
    companion: {
      habitat: true,
      habitatLabel: 'PET HABITAT / 08',
      habitatStatusIdle: 'WAITING IN HABITAT',
      habitatStatusSummoned: 'SUMMONED · CORNER POST'
    },
    contact: {
      envelopeStamp: true,
      signalWaves: true
    }
  }
};
