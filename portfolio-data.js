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

window.PORTFOLIO_DATA = {
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
    siteTitle: 'Farrel Islami Putra · Data, Software & Learning Archive',
    siteDescription:
      'The personal portfolio of Farrel Islami Putra, an Informatics Engineering student at UNIKOM exploring data, software, AI, databases, and IoT.'
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
    headlineTail: 'Exploring data. Understanding systems. Learning by building.',
    description:
      "I'm Farrel Islami Putra, an Informatics Engineering student at UNIKOM developing foundations in data analysis while exploring software, AI, databases, and IoT. This portfolio is an evolving archive of what I study, research, and build.",
    primaryCta: { label: 'Explore the work', href: '#work' },
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
      'Data sits at the centre; the rest grows around it. Select a node to read where each area actually stands today.',
    hint: 'SELECT A NODE: CLICK, TAP, OR USE KEYBOARD TAB + ENTER',
    panelTitle: 'FIELD NOTES',
    nodes: [
      {
        id: 'data',
        name: 'DATA',
        status: 'Primary focus',
        detail:
          'The centre of the map. Currently applied in the Cirebon air-quality research: collecting, cleaning, and exploring real open data.',
        x: 50, y: 46
      },
      {
        id: 'software',
        name: 'SOFTWARE',
        status: 'Exploring',
        detail:
          'Hand-built HTML, CSS, and JavaScript: this portfolio is the practice ground, plus C++ and Python coursework.',
        x: 22, y: 20
      },
      {
        id: 'ai',
        name: 'AI',
        status: 'Future interest',
        detail:
          'A direction, not a claim. Machine learning becomes an active area once the data foundations are stronger.',
        x: 78, y: 20
      },
      {
        id: 'databases',
        name: 'DATABASE SYSTEMS',
        status: 'Exploring',
        detail:
          'SQL fundamentals and how data is modelled, queried, and stored, studied alongside the data analysis practice.',
        x: 22, y: 74
      },
      {
        id: 'iot',
        name: 'IoT',
        status: 'Future interest',
        detail:
          'Curiosity about connected systems and sensors, where physical devices produce the data I like to analyse.',
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
      'One in-progress research project, and space reserved for what comes next. Every entry is real and honestly labelled, no filler, no inflated counts.',
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
      { targetId: 'closing', label: 'Closing & motto', aliases: ['footer', 'motto', 'back to top', 'closing'] }
    ],
    /* One keyword, several honest destinations. Keep each entry short. */
    multiRoutes: [
      { targetId: 'work', label: 'Project archive', aliases: ['data'] },
      { targetId: 'about', label: 'About & skills', aliases: ['data'] }
    ]
  },

  /* Real projects only. A card shows a working link ONLY when `link`
     points to an actual destination. The AQI project has no repository,
     paper or results page yet; the open dataset is the only public
     destination, so it is the only CTA. */
  projects: [
    {
      title: 'Air Quality Index Trends · Cirebon (2021–2024)',
      category: 'Data & Research',
      tag: 'Research / Data Analysis',
      status: 'IN PROGRESS',
      description:
        "An ongoing research project investigating air-quality trends in Cirebon City from 2021 to 2024. I'm preparing the research paper and developing Python workflows to process the source data for analysis. The study is still in progress; findings and conclusions have not yet been published.",
      // Only tools actually in use for the project right now.
      stack: ['Python', 'pandas (learning)'],
      image: 'assets/project-aqi.svg',
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
      text: 'A future research or data project will live here once it has real, verifiable work to show.'
    },
    {
      kicker: 'COMING SOON',
      title: 'Reserved slot / 03',
      text: 'Reserved for upcoming coursework, experiments, or collaborations. Not a finished project yet.'
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
      "I'm an Informatics Engineering student at UNIKOM with a primary interest in data and a broader curiosity about software, AI, databases, and connected systems.",
    body:
      "I enjoy learning how things work at a fundamental level, investigating questions independently, and using evidence to make sense of complex problems. This portfolio is an evolving archive of what I study, research, build, and learn along the way, curious across disciplines, rigorous with details.",
    /* Field notes (5.3.1): short, honest snippets rendered as sticky notes
       next to the about copy. Keep each entry one line. */
    notes: [
      'Currently exploring: Python for data analysis',
      'Preferred editor: Zed',
      'Learning in public, one commit at a time',
      'Curious about how sensors become datasets'
    ],
    artwork: {
      image: 'assets/profile-card.svg',
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
          'Python and C++ fundamentals, computational thinking, and the habit of reading documentation properly.',
        detail:
          'Two first-semester courses in Python and C++ basics, plus the working habit of reading official documentation before guessing at behaviour.',
        status: 'ONGOING'
      },
      {
        phase: 'PHASE 02',
        title: 'Web & software',
        description:
          'Hand-coded HTML, CSS, and JavaScript: this portfolio is the practice ground, plus coursework in programming.',
        detail:
          'This very portfolio is the evidence: hand-written HTML, CSS, and JavaScript, versioned in git, with no page builders and no templates.',
        status: 'PRACTICING'
      },
      {
        phase: 'PHASE 03',
        title: 'Data',
        description:
          'Data collection, cleaning, and exploratory analysis in Python, applied right now in the Cirebon air-quality research.',
        detail:
          'The Cirebon AQI study in practice: sourcing the open dataset, cleaning it with Python workflows, and exploring 2021 to 2024 trends before writing any conclusion.',
        status: 'ACTIVE · AQI STUDY'
      },
      {
        phase: 'PHASE 04',
        title: 'Ahead',
        description:
          "Deeper work in AI/ML, database systems, and IoT & robotics, the direction I'm aiming for next.",
        detail:
          'Database systems coursework comes next, then a first careful step into machine learning and connected devices once the data foundations hold.',
        status: 'PLANNED'
      }
    ]
  },

  education: {
    kicker: '04 / EDUCATION',
    heading: ['Informatics', 'Engineering.'],
    body:
      'Undergraduate student at Universitas Komputer Indonesia (UNIKOM), started in 2026. Building foundations in programming, data, and intelligent systems, one course, one project, one experiment at a time.',
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
      'Certificates, awards, and publications will be archived here as they are actually earned. Each entry with its issuer, date, and a verification link. Nothing is listed before it exists.',
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
         image: 'assets/credentials/my-certificate.jpg',    // optional
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
      'Profiles and archives that are officially mine. The documentation drive collects evidence of work, research, and learning as it happens.',
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
    note: 'Questions, feedback, or collaboration ideas are welcome.',
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
    note: 'An archive of code, data, and things still to come.',
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
    intro: 'What I do when I am not staring at a terminal.',
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
    intro: 'Public activity from GitHub, fetched live and cached for one hour.',
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
    intro: 'A tiny pixel companion that follows the archive. Summon it if you want company.',
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
