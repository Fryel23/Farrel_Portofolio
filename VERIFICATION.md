# Verification Log: The Living Archive (V3) update + V4 "Living Arcade" expansion + V5.2 "Edge Archive" + V5.3 "Global Archive Navigator"

> Every line below records a check that was **actually performed** on the
> delivered files, with the method used. Claims that could not be verified
> in this environment are listed explicitly at the end; nothing is claimed
> without evidence.

Date of verification: after the V5.3 "global archive navigator" execution
(V5.3 spec implemented on top of the V5.2 "edge archive" build; see the
V5.3 report below, then the V5.2 report, earlier layers keep their logs
further down).
Environment: Next.js dev server (port 3000) serving `/portfolio/index.html`
inside the preview wrapper; headless Chromium via Agent Browser.

---

# V6.6 THE EDITORIAL REFINEMENT: EXECUTION REPORT

Spec: `PROMPT_EKSEKUSI_V6.6_THE_EDITORIAL_REFINEMENT.md` (1031 lines, read
start to finish before any edit). Date: after the V6.5 build. Environment:
Next.js dev server (port 3000) serving `/portfolio/index.html`; headless
Chromium via Agent Browser at 1440x900 and 390x844 (plus 1024x768, 768x1024,
320x700 sweeps).

## A. Baseline (Fase 0)

- Backup of `index.html`, `styles.css`, `script.js`, `portfolio-data.js`,
  `generative-ambient.js` into `backup-v6.5/`: DONE (5 files).
- `node --check script.js` / `portfolio-data.js` / `generative-ambient.js`:
  PASS x3 (baseline and re-run after every fase).
- Em dash (U+2014) grep over all app files at baseline: EMPTY.

## B. Per fase results (evidence: live DOM measurements via Agent Browser eval)

- **Fase 1 orbital.** Engine mounted on `.ambient-canvas--companion`;
  particle formula now `cx: width * (0.04 + (i % 5) * 0.23) ± 20`,
  `cy: height * (0.08 + (i % 6) * 0.15)`. Measured spread at 1440: cx
  2.6% to 97.4% (formula includes the ±20px offset), cy exactly 8% to 83%.
  Pixel sampling of one canvas row: paint present in the left margin (29px),
  right margin (16px) and across the orbit band, i.e. particles are now
  visible outside the habitat card (habitat band measured at 23.6% to
  76.4% of the canvas width).
- **Fase 2 credentials.** `.credential-columns` computed grid
  `220px + 1fr`; requirement list renders 5 rows (ISSUER, DATE, VERIFICATION
  URL, IMAGE, PROOF ID). Sample card: type `SAMPLE FORMAT`, date
  `NOT AN ENTRY`, 0 buttons/links inside, not in the tab order
  (`tabIndex` -1, absent from the live tab-stop list). Timeline:
  `0 ENTRI TERVERIFIKASI`, year `2026`, `aria-hidden="true"`. Stamp
  computed `top: 12px; right: 12px`. Crypto rings computed opacity `0.09`.
- **Fase 3 curiosity.** Status row present, `aria-hidden`; with DATA
  selected the PRIMARY tier is active (opacity 1, others 0.4). SOFTWARE
  click: EXPLORING active, SEE ALSO `#work` + `#journey`, meta
  `FIELD NOTE 02 / 05`. AI click: SEE ALSO `#journey` + `#credentials`,
  meta `FIELD NOTE 03 / 05`. SEE ALSO click smooth-scrolled the page to
  `#journey` (measured `top ≈ 78px`, matching `scroll-padding-top`).
- **Fase 4 hobbies.** Chip structure: 4 wrapper divs, each with
  `button.hobby-chip-main` + `a.hobby-link`; link targets measured
  `#journey` / `#work` / `#offscreen` / `#offscreen` with matching
  aria-labels. Pressing Badminton: `CURRENTLY` value `BADMINTON`, log row
  `BADMINTON 16:34` flagged newest. After Coding, Gaming, Music, then
  Badminton again: log holds exactly 3 rows
  (`BADMINTON`, `MUSIC`, `GAMING`), the duplicate moved to the top, no
  duplicates created.
- **Fase 5 companion.** Furniture count 13 rects in 4 pieces
  (table, chair, plant, clock), all `aria-hidden`, `--px-*` fills; none
  overlaps the centred pet preview (bounding-box intersection: empty).
  Board text `NAP` -> `AWAY` on summon -> `NAP` on dismiss (measured).
- **Fase 6 closing.** Baseline ends `00` / `100` present below the name;
  colophon renders 4 rows (TYPE, STACK, BUILD, MAINTAINED); stamp
  `ARCHIVE / CLOSED` is rotated (computed transform present) and fully
  inside the viewport at 1440 and 390.
- **Fase 7 education + journey.** Coursework line measured:
  `COURSEWORK / Data Structures · Databases · Discrete Math`. Journey: 4
  toggles; opening phase 1 sets `aria-expanded="true"`, icon `+` -> `−`,
  `#journey-detail-0` visible; opening phase 2 closes phase 1
  (single-open accordion verified). Details render from the data file.
- **Fase 8 small functions.** Submitting `aqi` navigated to `#work` and
  wrote `["aqi"]` to `fip-archive-history`; an empty input then showed
  `RECENT / aqi` with key `recent`; typing removed the history list.
  GitHub: the live API is unreachable from this sandbox, so the section
  honestly showed the fallback; the render path was verified by injecting
  a cache payload in the exact `compute()` shape, after which
  `RECENT REPOSITORIES` rendered 3 rows with `target="_blank"`,
  `rel="noopener noreferrer"` and `updated 2d/5h/1h ago` labels.
- **Fase 9 opening.** Fresh session: overlay `hidden=false`,
  `z-index 200`, clip-path `inset(0 0 0%)`, top label opacity 1, line
  scaleX(1), 13 ticks, SKIP button present. Escape: overlay hidden,
  `aria-hidden` restored, `fip-opening-seen = '1'`, hero entrance ran
  afterwards (line transform identity). Second reload in the same session:
  overlay stayed hidden. Reduced motion / <=900px: engine never boots and
  the overlay stays `hidden` (CSS also `display: none !important`).

## C. Fase 10 checklist (PASS / NOT RUN / FAIL)

- 10.1 Syntax: `node --check` x3 PASS (after every fase).
- 10.2 Em dash grep: EMPTY (final sweep over html/css/js/md).
- 10.3 Visual: no horizontal overflow at 1440 / 1024 / 768 / 390 / 320
  (`scrollWidth === innerWidth` measured true at every width). Credential
  columns stack with the requirements above the grid at 390; hobby chips
  keep 2 columns at 390 with intact arrow links; journey detail padding
  collapses to 0; colophon collapses to one column at 420.
- 10.4 Function: see per-fase evidence above; all listed interactions
  exercised live. Game Deck untouched (no edit to `initGameDeck`,
  `GAME_ENTRANCE_SPECS`, `GAME_SCENE_SPECS`, `DECK_GENRES`, `.game-card`,
  `.deck-console`, or the `#games` markup).
- 10.5 Reduced motion: overlay bypass verified via the CSS block + JS
  guard (runtime emulation of the media query is NOT possible with this
  tooling: NOT RUN). Orbital canvas, rings, crosshair: existing V6.5
  opt-outs unchanged.
- 10.6 Accessibility: sample card absent from tab order PASS; chip main
  button precedes its arrow link in DOM order PASS; journey toggles expose
  `aria-expanded` + `aria-controls` PASS; SKIP button focusable PASS
  (tabIndex 0); SEE ALSO links focusable PASS.
- 10.7 Performance: JS delta measured +24.1KB unminified against
  `backup-v6.5/` after two compaction passes (27.4KB before) -> the
  <= 15KB budget item is FAIL as measured. All fase features were kept
  complete; further shrinking would have required near-minified code,
  which conflicts with the "maintained through source code" principle.
  No layout shift was introduced (fixed-size overlays, hidden-by-default
  markup). LCP comparison with Lighthouse: NOT RUN (tooling unavailable in
  this environment).
- 10.8 Console: no errors, no warnings, no unhandled rejections observed
  across the full interaction sweep (Agent Browser console empty).

## D. Honest limitations

- GitHub REST API cannot be reached from this sandbox; repo cards and the
  repos list were verified through a cache payload in the exact documented
  shape, not through live network data.
- `prefers-reduced-motion` cannot be emulated at runtime with the available
  tooling; the reduce path is verified by code guards and the CSS block.
- Lighthouse LCP/CLS profiling was not available; the opening adds no
  layout shift by construction (fixed overlay over static content).

## E. No new dependencies

No npm package, no CDN, no new vendored file. The build remains plain
HTML/CSS/JS plus the already-vendored GSAP, ScrollTrigger, and Lenis.

---

# V5.3 GLOBAL ARCHIVE NAVIGATOR: EXECUTION REPORT

## A. Baseline

- Source audited: `/home/z/my-project/portfolio/` (V5.2 build, synced to
  `public/portfolio/`), spec `farrel_portfolio_v5_3_global_archive_interaction_execution_prompt.md`
  read in full (1381 lines) before any edit.
- Library versions found in `assets/vendor/`: GSAP 3.12.5,
  ScrollTrigger 3.12.5, Lenis 1.1.13 (unchanged, no dependency added).
- Condition before changes: hero search filtered the project grid on
  every keystroke and on submit re-rendered the gallery; `boot()` called
  `initGithubPulse()` and the project batch BEFORE
  `gsap.registerPlugin()`; horizontal overflow existed at 1024px (1px)
  and 768px (53px, `.menu-dots` past the header row); scrub triggers
  were already at the agreed two (journey rail + footer fill);
  `will-change` was not used anywhere; fetch helpers already carried the
  8s AbortController timeout; the Data Rain already ran on the shared
  GSAP ticker with cleanup; the dynamic reduced-motion watcher existed.

## B. Per-file changes

- `portfolio-data.js`: added the `archiveSearch` block (maxQueryLength
  80, honest empty/not-found copy, 12 routes with allowlist aliases,
  `multiRoutes` for the ambiguous keyword `data`); gallery
  `emptyMessage` reworded to filter-only wording; `decorations.companion`
  gained `habitatStatusIdle` / `habitatStatusSummoned`.
- `index.html`: hero form became the Global Archive Navigator (search
  wrap, `role="search"`, hidden label + submit label naming archive
  navigation, `maxlength="80"`, `role="combobox"` input with
  `aria-expanded/aria-controls/aria-autocomplete/aria-haspopup`,
  `role="listbox"` dropdown, `aria-hidden` keyboard hint, visible
  `role="status"` note). No other structural change.
- `script.js`: new section `3b` with `normalizeSearchQuery()`,
  `resolveArchiveSearchResults()`, `renderArchiveSuggestions()`,
  `setActiveSuggestion()`, `navigateToArchiveTarget()`,
  `showArchiveNotFound()`, `initGlobalArchiveSearch()`; `renderProjects()`
  no longer reads `#search-input`; `initSearchAndFilters()` split into
  `initFilterControls()` + the navigator; boot order fixed
  (registration before any trigger; `initGithubPulse()` moved after
  registration; `pluginsRegistered` flag gates `setupProjectBatch` and
  the render-time batch path); companion habitat gained the status chip
  (`setHabitatStatus`, honest idle/summoned text).
- `styles.css`: block `16. V5.3 GLOBAL ARCHIVE NAVIGATOR` (dropdown,
  options, selected state, keyboard hint, status row, touch sizes,
  reduced-motion no-transition); hero ruler tick marks (48px rhythm);
  grain 0.06 global + 0.02 dark local (about 0.08 combined); habitat
  widened to 760px with status chip; header fixes at 1150px/980px.
- `README.md`: V5.3 layer documented (navigator, allowlist editing,
  boot order, decoration refinements, tablet fix).
- `VERIFICATION.md`: this report.
- SVG assets: unchanged this pass (V5.2 set kept).

## C. Scroll and performance

- Scrub triggers: 2 before, 2 after (journey rail fill + footer outline
  fill). Verified live: `ScrollTrigger.getAll()` = 56 total, exactly 2
  carry `vars.scrub`.
- Boot order verified live: 56 triggers exist and the batch helpers ran
  after registration; no trigger is created before
  `gsap.registerPlugin()` anymore (code path: `pluginsRegistered` gate;
  `initGithubPulse` moved to step 5 of `boot()`).
- Lenis: single instance, named `lenisTicker` callback on the GSAP
  ticker, `lagSmoothing(0)` before init (unchanged from V5.2, re-verified).
- Batch lifecycle: project batch killed and re-created per re-render,
  never stacked (re-verified across filter toggles in the browser run).
- Timers/observers/tickers: no new loop added this pass; Data Rain and
  habitat dust keep their existing cleanup paths.
- Profiling (FPS/CPU): NOT RUN (no browser profiler in this toolchain).

## D. Search and security

- Alias matrix executed in the real browser (input event + probe):
  `hobi` -> Off-screen, `badminton` -> Off-screen, `Instagram` ->
  Social profiles, `LinkedIn` -> Social profiles, `gmail` -> Contact,
  `AQI` -> Project archive, `Cirebon` -> Project archive, `Python` ->
  About & skills, `journey` -> Learning journey, `GitHub` -> GitHub
  activity, `sertifikat` -> Credentials, `pet` -> Companion habitat:
  all PASS. `data` returned exactly two selectable results (Project
  archive + About & skills): PASS. `unknown-word-9382`: no suggestion,
  no navigation: PASS. Empty query: idle state, no scroll, no error:
  PASS. Prefix `insta` -> Social profiles: PASS. Concatenated junk
  `datahobi` (leftover from the test run itself): correctly no match:
  PASS.
- Enter submit navigates to the active suggestion and announces
  `Navigating to <section>` through the visible polite status row:
  PASS (measured scroll position + note text). Suggestion click
  navigates, keeps focus on the input, closes the dropdown: PASS.
  ArrowDown moves `aria-activedescendant` and `aria-selected`:
  PASS. Escape closes the list: PASS.
- Not-found: honest message shown, `is-notfound` colour state, no
  navigation on repeated submits: PASS (scroll position unchanged).
- Injection battery executed in the real browser, 11 payloads:
  `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`,
  `" autofocus onfocus=alert(1) x="`, `javascript:alert(1)`,
  `__proto__`, `constructor`, a 10,000-character string, whitespace
  only, `<<>>&&""`, emoji, and an unknown word. For every payload: zero
  exceptions, zero new `script`/`img` elements, zero URL changes, zero
  navigation: PASS. No `alert()` was observed during the run.
- Accessibility: combobox/listbox roles, `aria-expanded`,
  `aria-activedescendant`, focus never lost on re-render, status row is
  the single polite live region (typing never announces): implemented
  and exercised via the keyboard path above.
- Remaining limits: screen-reader announce quality not tested with an
  actual screen reader (NOT RUN); payloads limited to the listed set.

## E. Responsive and reduced motion

- Viewports actually tested (Agent Browser): 1440x900, 1024x768,
  768x1024, 390x844, 320x700. `document.documentElement.scrollWidth`
  never exceeds `window.innerWidth` at any of the five: PASS.
- Two real overflow bugs were found and fixed during this pass:
  768px (53px, nine nowrap nav links pushed `.menu-dots` out of the
  header; fixed by moving navigation to the quick menu at 980px) and
  1024px (1px; fixed by tightening header padding at 1150px). Re-tested
  after the fix: clean.
- Dropdown placement inside the viewport at 390px: PASS (screenshot).
- Reduced motion: CSS final-state blocks re-verified (rail filled, no
  shake loops, dust off, suggestion transitions off; script.js checks
  the preference before every tween). The live OS-preference switch was
  NOT RUN: the CLI cannot emulate `prefers-reduced-motion`. The switch
  code path (enterReducedLive + reload on switch-back) is unchanged
  from V5.2 and was re-reviewed, not re-executed.

## F. Runtime and network

- `node --check script.js`: PASS. `node --check portfolio-data.js`: PASS.
- Browser run: zero page errors and zero console messages after the
  full interactive tour (search matrix, injection battery, filters,
  quick menu, Game Deck open/eject, companion summon/dismiss).
- Game Deck state machine re-verified: INSERT COIN -> LOADING -> open
  (11 cards, EJECT COIN, `aria-expanded=true`, scanlines computed) ->
  EJECT -> idle (INSERT COIN restored): PASS.
- Quick menu at 390px: opens with 11 links, `aria-expanded`, Escape
  closes and returns focus to the dots button: PASS (it is now the
  primary navigation at tablet widths).
- Companion: summon -> `SUMMONED · CORNER POST` chip + `PET SUMMONED`
  label + preview hidden + one fixed pet; dismiss -> full restore:
  PASS.
- Category filters: `Data & Research` -> 01 PROJECT / 1 real card;
  `All work` -> 3 cards (1 real + 2 reserved); hero input value never
  touched by the filters: PASS.
- GitHub/Spotify fetches: live calls executed during the run with the
  existing 8s AbortController timeout; honest fallback path unchanged
  (offline/blocked-endpoint simulation NOT RUN this pass).
- Console/network status: clean at the end of the tour.

## G. Screenshots

Actually captured to `tests/shots-v5-3/` (headless Chromium):

- `d-1440-hero.png` (observatory margin, ruler ticks, hero intro done)
- `d-1440-suggestions.png` (navigator dropdown open, hint + note)
- `d-1440-gallery.png` (blueprint archive + filters)
- `d-1440-games.png`, `d-1440-games-idle.png` (deck open / idle)
- `d-1440-companion.png` (widened habitat + status chip)
- `d-1440-closing.png` (footer outline fill end state)
- `m-390-hero.png`, `m-390-suggestions.png` (mobile dropdown fits)

## H. Remaining issues

- `prefers-reduced-motion` live switch and screen-reader announcement
  quality: NOT RUN in this environment (tooling limit); code paths
  re-reviewed, CSS final states verified statically.
- FPS/profiling numbers: not measured; no claims made.
- 768/1024 previously only had additive rules checked; this pass they
  were fully swept and two real bugs were fixed (see section E).
- No new dependency was added; vendor files untouched.

---

# V5.2 EDGE ARCHIVE: EXECUTION REPORT

## 0. Baseline audit findings (Fase 0)

| Item | Finding |
| --- | --- |
| Boot crash (critical) | `boot()` called five functions that were never defined (`initGameStatBars`, `initHobbyReactions`, `initGitHubTooltips`, `initCompanionHabitat`, `initSkillConstellation`). The first call threw a `ReferenceError`, so everything after it (Lenis, ScrollTrigger registration, hero intro, section motion) never ran. Fixed by implementing all five per the V5.2 spec. `node --check` passed before because the error is runtime, not syntax. |
| V5 markup without CSS | `index.html` already contained V5 decoration markup (hero ruler, gallery ruler, arcade joystick + A/B, github skeleton + brackets, pet habitat, contact stamp + waves) but `styles.css` had zero V5 rules. All of it was styled in the new block 15. |
| Scrub triggers before | 2 (journey rail, footer outline fill). Both intentional per spec 2.4; no decorative geometry scrub existed any more. |
| Lenis / ticker | One Lenis instance, one named `lenisTicker` callback, `lagSmoothing(0)` once in `boot()` before Lenis. Confirmed in source. |
| Fetch hardening | Already present: `fetchWithTimeout` (8s AbortController) used by Now Playing and both GitHub requests; verified in source and behaviour. |
| Data Rain | Already ran on `gsap.ticker` with full cleanup; re-verified live (canvas created on Konami, removed ~5s later). |

## 1. Required report: changes per file (14.1)

| File | Changes | Reason | Evidence |
| --- | --- | --- | --- |
| `index.html` | No structural edits this round (V5 markup was already in place and correct) | Layout and semantics already matched the spec | Browser render of every decoration |
| `styles.css` | New block "15. V5.2 EDGE ARCHIVE": hero ruler, archive spine, blueprint grid + brackets + ruler labels, arcade spotlight/scanlines/joystick/buttons, field-note tags, constellation, desk + pet habitat scene pieces, github skeleton/brackets/tooltip, credential rulers/plates/label/stamp, contact stamp/waves, closing measure line, hobby button reset, section-local grain, responsive + reduced-motion blocks | Visual system for all eight decoration groups | Viewport tests at 1440/390/320; screenshots in `tests/shots5/` |
| `script.js` | Implemented the five missing boot functions; hobby chips are now `<button type="button">`; GitHub tooltip via grid delegation + `tabindex` in the renderer; habitat scene builder; companion rewritten with FLIP-like summon/dismiss; desk habitat with capped dust; archive spine / blueprint / credential frame / about field marks builders; dynamic reduced-motion handler (stop loops, release Lenis, kill scrubs, reveal content; reload on switch-back); hero ruler / gallery ruler / github bracket labels synced from data | Behaviour, performance, accessibility | Browser-verified interactions (section 3 below); `node --check` PASS |
| `portfolio-data.js` | `decorations` extended: `spine` labels (DOM-order honest numbering), `gallery.rulerLabels` + flags, `games.scanlines`, `about.fieldNotes/sideAnnotations`, `offscreen.habitat` + dust counts, `github.bracketLabel` | Single source of truth for decoration copy | `node --check` PASS; labels render from data |
| `README.md` | V5.2 layer documentation (below) | Documentation | Read back after writing |
| `VERIFICATION.md` | This report | Auditability | This file |
| `assets/*` | Unchanged | No asset changes needed | Paths verified serving 200 |

## 2. Required report: feature status (14.2)

| Feature | Status | Location | Observed result |
| --- | --- | --- | --- |
| Archive Spine / Margin Atlas | PASS | `script.js` `initArchiveSpine()` + CSS 15.1 | 8 spines with labels `01 / WORK` ... `08 / CONNECT`; hero ruler `00 / START` + `01 / WORK`; hidden <= 1000px; `aria-hidden`, pointer-events none |
| Blueprint Archive | PASS | CSS 15.2 + `initGalleryBlueprint()` | 40px grid masked to edges on dark gallery; 4 corner brackets; ruler labels `01 / ARCHIVE / 02 / STUDY / 03 / NEXT` from data; grid opacity halved on mobile |
| Arcade Cabinet | PASS | CSS 15.3 | Spotlight radial beam, static scanlines on active screen (no motion), pixel joystick top-left + A/B buttons (opacity .3, no pointer events, static) |
| Research Field Notes | PASS | `initAboutFieldMarks()` + existing sticky notes | 2 margin annotations with leader lines (desktop only); sticky notes unchanged; no duplicate skill diagram (constellation is decorative, edges draw once) |
| Pixel Habitat (off-screen) | PASS | `initDeskHabitat()` + CSS 15.5 | Wall/window/poster/shelf/3-row floor behind the pet; 5 dust desktop / 6 mobile; dust loop paused off-screen + hidden tab; hidden under reduced motion |
| GitHub Open Source Pulse | PASS | CSS 15.6 + markup | 7x20 uniform skeleton clearly behind the cards (never labelled as data); terminal brackets `[ GIT LOG / FRYEL32 ]` synced from data |
| Engraved Credential Archive | PASS | `initCredentialFrame()` + CSS 15.7 | Ruler ticks top/bottom, 4 corner plates, plate label `ARCHIVE / MILESTONES / 05`, dashed `VERIFIED ONLY` stamp at -8deg; rulers + label hidden on mobile, stamp kept; empty slots still say COMING SOON |
| Social / Contact / Footer | PASS | CSS 15.8 | SVG icons unchanged; `POST / 2026` stamp rotated +8deg; 3 static signal waves on the personal card; closing measure line; outline fill scrub intact |
| Project image reveal | PASS | `setupProjectBatch()` (pre-existing, re-verified) | Batch reveal + clip-path image entrance; search/filter re-render uses honest micro-fade, nothing stuck at opacity 0 (verified live roundtrip) |
| Game stat bar refill | PASS (code path) | `initGameStatBars()` | Hover-capable pointers only; numeric bars only; targets stored from renderer widths; old tweens killed; touch never resets. Headless has no fine pointer, so guard returns early there (correct); interactive behaviour needs human hover |
| Hobby reactions | PASS | `initHobbyReactions()` + dedicated `.pet-react-*` elements | All four chips are buttons; Coding (glow blink + code flicker), Badminton (shuttle drop + bounce + fade), Music (3 notes rise + fade), Gaming (gamepad shake) each ran live and reset cleanly; one timeline at a time |
| GitHub cursor tooltip | PASS | `initGitHubTooltips()` | Content read from rendered values only (`REPOSITORIES: 0` during the test, matching live data); 200ms delay; quickTo follow; keyboard focus shows the same data anchored to the card (delegated, works for late renders); touch path disabled |
| Pet summon / dismiss | PASS | `initCompanion()` + `initCompanionHabitat()` | Summon: FLIP move from habitat rect to corner, preview hidden, label `PET SUMMONED`, `aria-pressed` true; pet click shows tooltip; dismiss returns to habitat and restores everything; exactly one pet SVG at all times |
| Learning Journey rail | PASS | `initJourneyProgress()` (pre-existing, re-verified) | One scrub trigger; 4 nodes activate on progress; states ONGOING/PRACTICING/ACTIVE/PLANNED untouched |

## 3. Interaction evidence (browser, headless Chromium)

- Insert Coin: cards 11, screen active, label EJECT COIN, `aria-expanded=true`, scanlines computed on the active screen.
- Hobby chips: 4 buttons; each reaction mid-state captured (glow opacity .35, note opacity .93, gamepad opacity 1) and post-state reset to opacity 0.
- GitHub: 4 cards from live REST data; focus on card -> tooltip `REPOSITORIES: 0` anchored inside the viewport. The live API currently returns `public_repos: 0`, `followers: 0`, empty repo list (verified with curl); zeros are the honest live values, never placeholders.
- Companion: full summon -> tooltip -> dismiss cycle verified; habitat label round-trips `PET HABITAT / 08` -> `PET SUMMONED` -> `PET HABITAT / 08`.
- Konami: canvas created + toast `Easter egg found: data stream initiated.`; canvas removed after ~5s.
- Curiosity Map: AI node -> panel updates, connector `curiosity-link-ai` active.
- Gallery: search `zzz` -> `00 PROJECTS` + empty state; clear -> `01 PROJECT` + card visible (no hidden-state trap).
- Copy email: honest failure toast in headless (clipboard denied); both `mailto:` hrefs exact.
- Quick menu: 11 links, opens, Escape closes.
- Console/page errors after the full tour: none.

## 4. Required report: performance and integration (14.3)

| Item | Result |
| --- | --- |
| Scrub triggers before / after | 2 / 2 (journey rail fill, closing outline fill). Both intentional; decorative geometry uses one-shot reveals. |
| GSAP ticker usage | Lenis runs on the named `lenisTicker` callback; Data Rain draws on `gsap.ticker`; no second `requestAnimationFrame` loop exists in `script.js` |
| Cleanup paths | Fetch: 8s AbortController + `clearTimeout` in `finally`. Tooltip: timer cleared on every state change + hidden-tab hide. Pet float: killed on dismiss and on hidden tab. Dust: paused off-screen + hidden tab; killed under live reduced motion. Data Rain: ticker callback removed, listeners removed, canvas removed, `onDone` once. |
| Hidden tab | `gsap.globalTimeline.pause()` on hide (registered once), Now Playing skips polls, Data Rain guard, dust pauses, float stops |
| Reduced motion (runtime switch) | New watcher: enter-reduce pauses the global timeline, force-reveals all gated content, releases Lenis, kills the two scrub triggers, toasts the state; switching back reloads for a guaranteed-clean boot (documented decision). Initial reduced boot: every effect gated, CSS block 15.12 hides dust/waves/scanline. Runtime emulation unavailable headless: code-path verified. |
| Viewport tests actually run | 1440x900, 390x844, 320x690. `scrollWidth == clientWidth` at every size (no horizontal overflow); footer name fits 320; 768/1024 not individually re-tested (layout is unchanged from the verified V4 responsive blocks plus additive rules only) |
| `will-change` audit | No new `will-change` added in V5.2; transforms/opacity only |

## 5. Required report: forbidden characters (14.4)

| Scope | Result |
| --- | --- |
| Application-owned files (html/css/js/md/svg/json in `portfolio/`) | **CLEAN** - `grep -RIn` for U+2014 returned no matches (exit 1) after all edits |
| Vendor files (`assets/vendor/*.min.js`) | Excluded from the policy as third-party minified code; not modified, not claimed clean |
| Scan command | `EM_DASH="$(printf '\342\200\224')"; grep -RIn "$EM_DASH" --include='*.html' --include='*.css' --include='*.js' --include='*.md' --include='*.svg' --include='*.json' .` from the project root |

## 6. Required report: references and licence (14.5)

Only official documentation and already-vendored libraries were used this
round; no third-party code was copied into the project.

- GSAP ScrollTrigger, `ScrollTrigger.batch()`, `gsap.ticker`, `gsap.quickTo`: gsap.com docs v3 (patterns for batch lifecycle, ticker conversion seconds->ms, quickTo pointer work)
- Lenis: darkroomengineering/lenis README (ms-vs-seconds raf contract)
- MDN: `prefers-reduced-motion` + `MediaQueryList.addEventListener` (live preference handling)
- MDN: Clipboard API / `<dialog>` / AbortController (already integrated; consulted for the delegated tooltip and focus return)
- Codrops HoverGrid: studied for directional clip-path reveal principles only (MIT). The project image reveal reuses the project's own batch helper; no HoverGrid source was imported.
- No WebGL was added: every V5.2 decoration is SVG/CSS (policy section 10 satisfied).

## 7. V5.2 limitations (honest)

- **Game stat refill hover**: headless Chromium reports no fine pointer, so the hover handler correctly stays dormant there; the guard, target capture, and tween logic are code-path verified. Manual: hover a game card on desktop.
- **Cursor-follow tooltip**: same pointer limitation; the keyboard focus path (which shares the content builder) was verified live.
- **Runtime reduced-motion switch**: cannot be emulated in this browser harness; verified via code path + the new CSS block. Manual: toggle the OS setting while the page is open.
- **GitHub live values**: currently all zeros because the account has no public repositories right now; the section shows the truth and will fill as soon as real repos exist.
- **Frame-level pixel art and ambient feel**: needs a human eye; every loop is paused off-screen and under reduced motion.

---

# Earlier layers (history)

## 1. Static integrity

| Check | Method | Result |
| --- | --- | --- |
| `portfolio-data.js` parses | `node --check` | PASS (re-run after V4: PASS) |
| `script.js` parses | `node --check` | PASS (re-run after V4: PASS) |
| Page serves | `GET /portfolio/index.html` -> 200 | PASS |
| Document title | Browser: `Farrel Islami Putra · Data, Software & Learning Archive` (middle dot) | PASS |
| **Zero em dash (U+2014) anywhere** | `grep` for the U+2014 character across `*.html`, `*.css`, `*.js`, `*.md`, `*.svg`, `*.json` | PASS (output empty; re-verified after the V4 expansion across all files including the new sections) |
| No references to removed assets | `grep -rn "project-ihsg\|project-portfolio"` | PASS (empty) |
| `innerHTML` audit | `grep -n "innerHTML" script.js` | PASS (only the static, hardcoded checkmark SVG string; no dynamic data. All V4 rendering uses `textContent` / `createElement` / `createElementNS`) |
| Em dash policy in docs | Manual audit of README.md / VERIFICATION.md after rewrite | PASS (middle dot, slash, colon and reworded sentences only) |
| Backup of the previous build | `.backup-v4/` kept next to the sources (V3 state) + `.backup-v3/` | PASS |

## 2. V3 components (this update)

| Component (guide §) | What was exercised | Result |
| --- | --- | --- |
| Atlas breathing (4.1) | Ambient loops created paused after the hero entrance (`onComplete`); ScrollTrigger enter/leave plays and pauses them; `visibilitychange` handler registered once in `boot()` pauses `gsap.globalTimeline` when the tab hides; guarded off entirely for reduced motion | PASS (code path + console clean) |
| Measurement ticks (4.2) | Every `.display-heading` gains an `aria-hidden` tick cluster with `[ 01 ]` to `[ 04 ]` vertical labels; reveal tied to the heading trigger; ticks static at opacity .5 under reduced motion | PASS |
| Constellation connectors (4.3) | Selecting a node draws its connector from the centre outward (`stroke-dashoffset` tween, `MOTION.easeDraw`); other lines reset to the dotted `4 7` pattern; reduced motion sets the final state instantly | PASS |
| Grain + vignette (4.4) | `.grain-overlay` SVG filter present, fixed, `pointer-events: none`, opacity .04, `mix-blend-mode: multiply`; `body::after` radial vignette at 4%; keyboard focus and clicks unaffected (overlay never intercepts) | PASS |
| Pixel dust (4.5) | 14 `.pixel-dust` particles appended to `.hero-visual`, each with its own `quickTo` pair; repulsion math runs inside the pointer handler; hidden by CSS under reduced motion; coarse pointers never run the handler | PASS (code path; visual needs a real pointer, see §5) |
| Scanline (5.1.1) | `.scanline` spans injected into both hero line masks; sweep tweened `-100% -> 100%` at 0.15s inside the entrance timeline; hidden under reduced motion | PASS |
| CTA bounce + search pulse (5.1.2 / 5.1.3) | Hover handlers on `.button-primary` / `.button-outline` (arrow nudge + scale); focus on `#search-input` pops the magnifier and swaps the placeholder for 1.5s | PASS (code path) |
| Drawer hover (5.2.1) | `.project-grid` has `perspective: 1000px`; hover/focus-within = `translateY(-10px) rotateX(-2deg)` + fold line `::before` sliding in; entrance `clearProps: 'transform'` releases the inline transform so the CSS hover actually applies (latent conflict found and fixed during this update) | PASS |
| Empty state shake (5.2.2) | Searching `zzz` shows the empty state; the shake fires once per transition into the empty view (not per keystroke) | PASS |
| Field notes (5.3) | `about.notes` (4 honest entries) renders as `.sticky-note` cards with pin dots, alternating ±1.5° tilt (motion only), straighten-on-hover; chips have `:active` press states | PASS |
| Journey path drawing (5.4) | One `.rail-node` per phase positioned via `--node-top`; ScrollTrigger scrub toggles `is-active`; newly active nodes scale to 1.2 and pulse once (`MOTION.easeSnap`); ghost titles dim to 0.6 only under `.js-motion`; stabilo sweep via `background-size` | PASS |
| Vault casing (5.5) | Empty credentials grid wrapped in `.vault-frame` with an 8-tick dial that turns 45° on hover; the wrapper is skipped once real credentials exist | PASS |
| Dialog unfold (5.5.3) | `showModal()` triggers a centred `clip-path` unfold on `.credential-dialog-inner`; `close` clears the inline clip-path so the next open starts folded; reduced motion skips the tween | PASS (mechanism; see §5 for data) |
| Icon redraw (5.6.1) | `.social-card` hover redraws each brand path via dash offset, then clears the inline styles so the icon looks untouched afterwards | PASS (code path) |
| Copy checkmark + fail shake (5.6.2) | Success path swaps the icon for a drawn check for 2s then restores it (reduced motion: instant swap); failure path shakes the button and shows the honest toast (verified live in headless, where the clipboard is denied) | PASS |
| Quick menu stagger (5.6.3) | Opening the quick menu staggers its links in; Escape/outside-click still close it and focus returns to the button | PASS |
| Ink bleed + motto + back-top (5.7) | `.closing-outline-fill` has a soft blue text-shadow; the motto fades word by word on one `once: true` trigger (`#motto-text` keeps the label outside the effect); `.back-top` hops 3px on hover; reduced motion shows the full motto instantly | PASS |

## 2b. V4 components (the living arcade expansion)

| Component (V4 guide §) | What was exercised | Result |
| --- | --- | --- |
| Em dash rule re-check (§1) | Node scan for U+2014 across html/css/js/md/svg/json/txt in the portfolio folder (backup folder excluded) | PASS (0 occurrences) |
| Section order (§4) | DOM order of `<section>` elements: hero, #work, #games, #about, #offscreen, #github, #credentials, #companion, #profiles/#contact, #closing | PASS |
| Game Deck data (§5.1) | `gameDeck.games` in portfolio-data.js: 11 entries, exact names/colours/rarities/statuses/stats as specified; text values rendered without bars | PASS |
| Game Deck state machine (§5.2) | Click INSERT COIN -> label `LOADING...` + `aria-busy` -> glitch shake (steps easing) + slot entrance -> label `EJECT COIN` + `aria-expanded=true`; click again -> cards fade, dead screen returns | PASS (browser-verified) |
| Dead screen (§5.3) | `.deck-screen--off`: night-card bg, 1px dashed border, min-height 220px, `NO SIGNAL / INSERT COIN TO CONTINUE` mono label, scanline + vignette overlay | PASS |
| Deck transition budget (§5.4) | Timeline ends ~1.4s; `clearProps: 'transform,opacity'` on completion so CSS hover glow takes over | PASS (code path) |
| Game card hover/focus (§5.5) | Hover/focus-visible: `translateY(-6px)` + themed border + `0 0 24px` glow; rarity tiers applied via `data-rarity`; reduced-motion block removes transform/glow | PASS |
| Deck a11y (§5.6) | `<button aria-expanded aria-controls aria-busy>`, `role="region" aria-label="Game deck"`, cards `tabindex="0"` with matching focus state, `<noscript>` hint | PASS |
| Pixel-art pet (§6.3) | SVG built only from `<rect>` with `crispEdges`, 64x64 viewBox, 16-colour CSS palette scoped to `.pixel-pet`; 3-state GSAP loop (coding/music/badminton) created paused, driven by IntersectionObserver | PASS (mechanism; frame-by-frame visuals need human eyes, see §5) |
| Spotify embed (§6.4) | Official iframe, height 352, lazy, `title` from data, custom frame + mono label + playlist link | PASS (iframe loads; playback needs human check) |
| Hobby chips (§6.1) | 4 chips from `offscreen.hobbies` with inline stroke icons, hover lift, reduced-motion static | PASS |
| Now Playing (§6.5) | Polls endpoint every 30s via AbortController; hidden until real data; `is-playing` pulsing dot / `is-recent` dimmed states; hides on error; no polling while tab hidden; aria-live text; quick-menu row mirrors it; hidden <=980px | PASS (code path + endpoint reachable from this environment; live song state needs human check) |
| GitHub fetch + cache (§7.2) | Parallel fetch of user + repos; computes repos/stars/followers/top-3 languages/forks; writes `fryel32-github-stats-v1` with timestamp; 1h TTL honoured; failure falls back to stale cache then honest message | PASS (browser-verified live) |
| GitHub honesty (§7.4) | No streak, no commit totals anywhere in code or data | PASS |
| GitHub count-up (§7.3) | 800ms count-up on render; reduced motion renders final values instantly | PASS (code path) |
| Companion (§8) | Summon/dismiss toggles `hidden` + `aria-pressed` + label swap; preference persisted in `localStorage`; pet floats (2s yoyo), blinks every 3-5s, click = hop + `role="status"` tooltip; pet is a real `<button>` with aria-label | PASS (browser-verified) |
| Konami + Data Rain (§9) | Keyboard sequence buffer resets on wrong key; 5 brand taps in 2s on mobile; 0.3s `is-glitching` flash; fullscreen canvas ~5s then fades and removes itself; cleanup on visibilitychange + resize; toast via shared `role="status"` region | PASS (code path + keyboard trigger verified in browser) |
| No duplicate handlers (§12.1) | All new ScrollTriggers registered in `initV4Motion()` called once from `boot()`; pixel loop uses its own IntersectionObserver on its own section; no second mousemove handler added | PASS |
| Cleanup (§12.2) | AbortController for Spotify; interval skips hidden tabs; data-rain removes listeners + canvas; delayedCall blink rides the global timeline (paused when tab hidden) | PASS |
| Reduced motion (§12.3) | Deck opens instantly; pixel loop never created; dot static; count-up skipped; pet static (tooltip works); data rain replaced by toast; CSS block disables glitch/rain/hover transforms | PASS (code path) |
| innerHTML rule (§12.4) | All V4 dynamic rendering via `textContent`/`createElement`/`createElementNS`; the only innerHTML in the file remains the static checkmark | PASS |
| Nav + quick menu (§11) | Header nav: Home, Work, Games, About, Off-screen, GitHub, Credentials, Companion, Contact; quick menu gained Game deck / Off-screen / GitHub / Companion + Now Playing row; `initActiveNav` observes all new ids | PASS (browser-verified) |
| External links (§14.15) | All new external links (GitHub fallback, Spotify playlist/iframe, song links) use `target="_blank"` + `rel="noopener noreferrer"` | PASS |
| No new dependencies (§14.10) | `assets/vendor/` untouched; package.json of the wrapper untouched; no CDN added | PASS |

## 3. Carried-over components (regression check)

| Component | What was exercised | Result |
| --- | --- | --- |
| Data Atlas entrance | Paths draw, nodes/labels/ticks fade in, artwork readable without JS | PASS |
| Curiosity Map | DATA committed default (`aria-pressed`), hover/focus preview, Escape restore, real `<button>` nodes | PASS |
| Gallery search/filter | `01 PROJECT` -> search `zzz` -> `00 PROJECTS` + reserved slots hidden -> clear restores; CTA `https://opendata.cirebonkota.go.id/dataset/data-kualitas-udara` with `target=_blank rel="noopener noreferrer"` | PASS |
| Identity card pointer handler | One handler drives card tilt (±3°), tools, atlas layers and now the pixel dust; rest state on leave; fine pointer only | PASS (code path) |
| Journey rail fallback | IO path fills once and activates all nodes when ScrollTrigger is absent | PASS (code path) |
| Social links | 4 inline SVG marks; exact hrefs preserved; `rel="noopener noreferrer"` everywhere external | PASS |
| Copy honest failure | Headless clipboard denied -> shake + failure toast, never fake success | PASS (live) |
| Footer fill | Scroll-linked `clip-path` sweep aligned over the outline; now with a subtle glow | PASS |
| Active nav / progress bar / anchors / Lenis | Section tracking, top progress bar, smooth anchors unchanged | PASS |

## 4. Keyboard, responsive & console

| Viewport | Horizontal overflow | Notes |
| --- | --- | --- |
| 1440×900 | No | Ticks sit inside the heading gutter; vault frame inside section padding |
| 1280×800 | No | Sticky notes column verified under the about copy |
| 768×1024 | No | About layout stacks; notes flow between copy and artwork |
| 390×844 | No (`scrollWidth == 390`) | Notes full-width; curiosity list mode; connectors hidden |
| 320×700 | No (`scrollWidth == 320`) | Copy icon-only; ticks do not collide with the heading aside |

Keyboard: all new listeners are hover/focus supplements; every pre-existing
Tab path still works (nav links, search, filters, project links, curiosity
nodes, copy buttons, dialog, quick menu, back-to-top). New interactive
elements introduced by V3: none (all V3 pieces are decorative layers over
existing controls, so there is nothing new to tab through).

Console: no errors or warnings from the portfolio (only the Next.js wrapper
notices). `dev.log`: clean 200 responses, no runtime errors.

Fixes made during this verification round (root causes removed, then
re-verified):
1. **Hover-kill conflict:** GSAP entrance tweens left inline transforms on
   project cards, chips, hero buttons and curiosity nodes, which silently
   overrode the CSS hover/active transforms. Fixed with
   `clearProps: 'transform'` on the entrances (cards, cover images, chips,
   hero actions, curiosity nodes). Re-verified: hover lift, chip press and
   node hover now respond.
2. **Tick label specificity:** `.heading-ticks span:nth-child(2n)` outranked
   `.tick-label` and would have squashed the vertical label to 1px. Bars now
   use `:not(.tick-label)`.
3. **Journey ghost contrast:** guide value 0.55 measured ~4.0:1 on the white
   card; raised to 0.6 (~4.6:1) per the accessibility-first priority order.
4. **Rail node transforms:** nodes are centred with margins + a CSS variable
   (`--node-top`) instead of `translate(-50%, -50%)`, so GSAP can own
   `scale` without clobbering the centring (guide section 5.4.3 note).

## 5. Honestly not verifiable in this environment

- **Copy-success path**: headless Chromium denies clipboard write permission,
  so the success branch (checkmark swap + "Email address copied to
  clipboard.") is verified as code path only. Manual check: click Copy ->
  checkmark + toast, address in clipboard.
- **Pointer-only visuals** (tilt, atlas drift, pixel-dust repulsion, icon
  redraw, CTA bounce, back-top hop): require a real fine pointer with hover;
  headless has none. Verified as code paths plus clean console. Manual:
  move the mouse over the hero, a social card and the footer button.
- **Ambient atlas visuals** (node pulse, path flow): the loops exist and are
  wired to play only while the hero is on screen, but "watching it breathe"
  needs a human eye. Manual: load the page, keep the hero in view for a few
  seconds.
- **Reduced motion at runtime**: headless cannot emulate
  `prefers-reduced-motion` here. Verified by code path: every V3 effect is
  gated on `!reducedMotion` and the CSS media block renders final states
  (ticks, notes, rail nodes, motto, vault dial, drawer hover, scanline and
  dust disabled). Manual: enable Reduce Motion in OS settings and reload.
- **Live availability of external URLs** (dataset, GitHub, Instagram,
  LinkedIn, Drive): hrefs and `rel` verified exactly as supplied; whether
  each destination is up right now is outside this environment.
- **GSAP/Lenis version currency**: latest stable verified live via the npm
  registry during the previous build (GSAP 3.15.0, Lenis 1.3.27). Vendored
  pinned versions (3.12.5 / 3.12.5 / 1.1.13) were kept deliberately; see
  README (upgrade deferred pending migration-note review).

## 6. Manual test checklist for the site owner

1. Run locally (`python3 -m http.server` or open `index.html`), then:
2. Hero: watch the headline reveal (scanline crosses each line); after a
   moment the atlas keeps breathing; move the mouse: card tilts, highlight
   follows, dust particles dodge the cursor; focus the search box (icon pops).
3. Gallery: hover the project card (drawer lift + fold line); search `zzz`
   (empty state shakes once); Tab to the card (same lift from focus).
4. About: sticky notes straighten on hover; press and hold a chip (pressed
   state).
5. Journey: scroll: rail fills, node pulses as each phase activates, active
   stage gets the stabilo sweep, later titles stay ghosted until reached.
6. Credentials: hover the vault casing (dial turns); with real credentials
   added later, the preview dialog unfolds from the centre.
7. Social/contact: hover a social card (icon redraws); click Copy
   (checkmark + toast, or shake + honest toast when denied).
8. Quick menu: open it (links stagger in); Escape closes and refocuses.
9. Footer: scroll down: the outline name fills with a soft glow; the motto
   fades in word by word; hover BACK TO TOP (single hop).
10. Hide the tab for a few seconds, come back: nothing kept animating while
    hidden.
11. OS reduced motion ON -> reload: no entrances, no dust, no scanline; rail,
    ticks, notes, motto and footer name already in final state.

---

# V6.3 HARDENING + HOVERGRID REVEAL + ARCADE EJECT + EDGE SVG ORNAMENTS: EXECUTION REPORT

## 0. Baseline audit findings (Fase 0)

- Backup of all six working files saved to `backup-v5.3/`.
- `node --check script.js` PASS; `node --check portfolio-data.js` PASS.
- Em dash (U+2014) baseline grep across all application files: EMPTY.
- `gsap.registerPlugin` called exactly once; Lenis ticker is a named
  module-level function and removable.
- ScrollTrigger creation sites: 23; scrub triggers: exactly 2
  (journey rail 0.4, closing fill 0.5) - within the spec budget.
- `renderProjects()` does not read `#search-input` (confirmed by code
  inspection; the hero search is the Global Archive Navigator).
- Confirmed compound stat-bar bug: renderer wrote `width: 80%` and the
  open/refill tweens drove `scaleX: 0.8` on the same span (visual 64%).
- `initMotionPreferenceWatcher()` used `window.location.reload()` on the
  switch back to normal motion (to be replaced by `gsap.matchMedia()`).
- `dustParticlesMobile` (6) was larger than `dustParticles` (5).
- `initNowPlaying()` ran one interval that was never cleared while the
  tab was hidden (guard inside `poll()` only).
- `decorations.credentials.stamp` was `'VERIFIED ONLY'`.
- No live `innerHTML` usage in `script.js` (one historical comment only;
  the copy-email checkmark is already `createElementNS`).
- 16 `--px-*` tokens defined on `.pixel-pet`; one undefined
  `var(--background)` in `.credential-plate-label`.

## 1. Phase 1 debt fixes (V6.3 Fase 1)

- **Game stat bar refill (new contract).** `renderGameDeck()` now renders
  the span at full width with `data-target` (0-100) and an inline
  `scaleX(target/100)` default; `initGameStatBars()` seeds every bar to
  its target before wiring hover; hover kills -> zeroes -> refills to the
  same target (0.4s, stagger 0.08, `power2.out`); `openDeck()`'s finish
  step no longer clears `transform` on bars (only `transformOrigin`),
  then re-applies the honest `scaleX` target. A value of 80 now reads as
  80% before, during and after every hover, EJECT and INSERT COIN cycle.
- **CSS token fix.** `.credential-plate-label` background changed from
  the undefined `var(--background)` to `var(--bg)`; grep now empty.
- **Dust mobile.** `dustParticlesMobile` 6 -> 4 in
  `portfolio-data.js`; the count logic honours both data values with a
  hard cap of 8.
- **Now Playing interval.** `startPolling()`/`stopPolling()` own a single
  interval id; visibilitychange stops it when hidden, refreshes once and
  resumes when visible; `poll()` keeps its `doc.hidden` guard.
- **Skill constellation.** The `<g class="skill-constellation__labels">`
  block, its CSS rule and its label animations were removed; the
  constellation is now an abstract network (edges + nodes only).
- **innerHTML migration.** Not applicable: the deployed source already
  renders every dynamic node through `createElement` /
  `createElementNS` / `textContent`; the remaining `innerHTML` match is
  one historical comment.
- **Stamp wording.** `decorations.credentials.stamp` is now
  `'ARCHIVE / CREDENTIALS'`; the credentials footnote was reworded;
  grep `VERIFIED ONLY` across the four application files: EMPTY.
- **Intentional deviation documented.** `.game-card` deliberately does
  not use `ScrollTrigger.batch()` because cards are revealed by the
  deck timeline, not by scrolling (see README, V4 layer section).

## 2. Intentional deviations

- `.game-card` entrance is owned by `openDeck()` in `initGameDeck()`;
  `ScrollTrigger.batch()` is intentionally not used (double-animation
  hazard; cards are hidden until INSERT COIN, never scroll-revealed).


## 3. Fase 2: matchMedia lifecycle (two-way test, three repeats)

Procedure per spec 2.10, executed with a headless Chromium instance on
the deployed page (`public/portfolio/index.html`, viewport 1440x900):

- `N0 = 58` ScrollTriggers, identities recorded (`ids0`).
- Emulated `prefers-reduced-motion: reduce`: after 2s, console clean,
  `N1 = 0`, `[style*="opacity: 0"]` = 0 elements, hero title and every
  section visible, journey rail at its completed state, no errors.
- Emulation off: after settle, `N2 = 58`, `ids2` identical to `ids0`
  (same elements, same order, each exactly once).
- Repeated two more times: `N1 = 0` and `N2 = 58` with identical
  identities on every round.
- A late-arriving async trigger (the Data Atlas ambient visibility
  ScrollTrigger, created from the intro timeline's onComplete) was
  observed to reappear after its natural ~1.2s delay; final hero
  trigger count matched `N0` (3 of 3).
- One real defect was found and fixed during this test: the
  heading-ticks reveal used to be skipped after a round trip (the DOM
  guard also skipped the tween, so 8 triggers never came back). Fixed
  by splitting `buildHeadingTicks()` (DOM, once) from the reveal tween
  (re-created per entry). After the fix, all three rounds returned
  `N2 = 58 = N0` with identical identities.
- Fallback reload: NOT ACTIVATED (the lifecycle is proven safe, so the
  reload path from spec 2.9 stays unused and undocumented in code).

## 4. Fase 3: HoverGrid directional reveal

- Markup: every project cover wraps its img in `.project-cover-inner`
  (verified in the DOM: 1 real card cover; reserved slots have none by
  design).
- CSS default `clip-path: inset(0 0 0 0)`: the image is always visible
  without JS and under reduced motion (computed style check).
- The implementation uses `pointerover`/`pointerout` with
  `relatedTarget` containment guards (grep confirms no
  `pointerenter`/`pointerleave` listeners in script.js).
- Direction map follows the corrected spec table: entering from the top
  starts `inset(0 0 100% 0)` and reveals top -> bottom; right starts
  `inset(0 0 0 100%)` (right -> left); bottom starts
  `inset(100% 0 0 0)` (bottom -> top); left starts
  `inset(0 100% 0 0)` (left -> right).
- The entrance batch now animates only `scale` on the img; clip-path is
  owned exclusively by the hover reveal (code inspection + grep).
- Pointer-driven four-direction hover, in-image flicker-free movement
  and fast card-to-card movement: code path verified (headless has no
  fine pointer, so the visual behaviour follows the same delegation
  logic verified for the hover-capable GitHub tooltip); listed in the
  manual checklist for the owner.
- `focusin`/`focusout` reveal: implemented per spec; the headless
  check confirmed no errors when tabbing script ran during the tour.

## 5. Fase 4: arcade eject per genre

Browser-verified on the live page:

- INSERT COIN: 11 cards, 11 pixel characters, genre keys
  `shooter, roguelike, soulslike, strategy, sandbox, strategy,
  strategy, sandbox, soulslike, horror, horror` (matches the spec
  table exactly), 146 character rects total (13-14 each, under the 40
  budget), first stat bar `scaleX(0.8)` for target 80.
- EJECT (sampled mid-flight): label `EJECTING...`, `aria-busy=true`,
  sweep span and CRT line present, cards animating (opacity dropping).
- EJECT (final): label `INSERT COIN`, `aria-expanded=false`,
  `aria-busy=false`, screen back to `deck-screen--off`, grid hidden,
  NO SIGNAL visible, helper spans removed, card transforms cleared.
- INSERT COIN again: every bar back at its honest value (80 -> 0.8,
  90 -> 0.9, 35 -> 0.35, 99 -> 0.99, 95 -> 0.95, 40 -> 0.4, 85 -> 0.85,
  100 -> identity), characters intact, no console errors.
- Rapid double EJECT protection: `busy` guard + `ejectTimeline.kill()`
  + `stopScramble()` at every entry point (code path).
- Reduced motion: eject falls to `closeDeckInstant()` (code path +
  the reduce emulation round confirmed the deck stays usable).

## 6. Fase 5: ornaments per section

Old vs new audit (archive spine + grain = sitewide systems, not
counted; content imagery like the Data Atlas, pixel pet, cabinet
chrome and sticky notes are content, not ornaments):

| Section | Old | New (V6.3) | Total | Over 3? | Decision |
|---|---|---|---|---|---|
| Hero | ruler ticks (accent) | crosshair orbital | 2 | no | kept |
| Gallery | blueprint system (grid+brackets+ruler = 1) | Truchet + stamp | 3 | no | merged old set as one system |
| About | field notes (1) | leader line + dot matrix | 3 | no | sticky notes + constellation counted as content |
| Games | cabinet chrome (content) | starfield + cable | 2 | no | spotlight/scanlines/joystick/AB stay as console chrome |
| Off-screen | habitat scene (1) | plant + second poster | 3 | no | dust = ambient particles |
| GitHub | skeleton + brackets (1) | pulse line + terminal | 3 | no | pulse dots + line share one animation owner (initGithubPulse) |
| Credentials | vault frame (1) + stamp (1) | watermark | 3 | no | ribbon skipped (budget) |
| Companion | habitat scene (1) | shelf books (in-scene) + rug | 2 | no | status chip is content |
| Contact | stamp (1) + signal waves (1) | envelope | 3 | no | - |
| Closing | - | measure line | 1 | no | - |

All ornament ids carry the `ornament-` prefix (`ornament-gallery-truchet-pattern`,
`ornament-about-dots-pattern`, `ornament-credentials-arc`); scroll-margin
reset applied. Every `--px-*` token used by SVG resolves (the palette
was promoted to `:root` and re-verified). Pixel paths use only `L`
segments (the Truchet arcs and watermark arc are the spec's explicitly
allowed organic curves). Reduced-motion keeps every ornament visible.

## 7. Fase 6: functional + responsive sweep (headless Chromium)

- Archive Navigator: `hobi` -> suggestions -> Enter -> scrolled to
  `#offscreen` (verified by section-in-viewport check); unknown query
  -> `No matching archive entry found...` note with `is-notfound`
  class; suggestions count 0.
- Filters: `Data & Research` -> 1 card; `All work` -> 3 cards
  (1 project + 2 reserved slots, reserved never counted).
- Companion: summon -> pet visible, toggle `Dismiss companion`,
  `aria-pressed=true`, chip `SUMMONED · CORNER POST`; dismiss -> all
  reverted, chip `WAITING IN HABITAT`. Shelf books (2 rects) + rug
  present in the habitat.
- Copy email (headless, clipboard blocked): honest failure toast
  `Copy is not available here. Please copy the address manually.`
- Quick menu: opens with 11 links, `aria-expanded=true`; Escape
  closes it.
- GitHub tooltip (cache path, injected honest values): 4 cards
  rendered, keyboard focus shows `REPOSITORIES: 12`; the same tooltip
  shows under emulated reduced motion (anchored, no animation).
- Konami: canvas `#data-rain` created, auto-removed after ~5s.
- Journey rail: 4 active items + 4 active nodes after scrolling.
- Now Playing: polling logic (start/stop on visibility) is a code-path
  verification; the endpoint was live-verified in the V4/V5 rounds.
- Viewports 1440/1024/768/390/320: `scrollWidth === clientWidth`
  everywhere (no horizontal overflow).
- Mobile (390/320, fresh load at width): dust = 4 (spec 1.3),
  pixel characters 24px, deck opens single-column.
- Screenshots: `tests/shots-v6-3/` (hero, gallery, deck idle/open/
  eject-mid, about, github, credentials, companion, contact, closing,
  mobile hero + deck).
- Console + page errors: CLEAN across the entire tour, including all
  three reduce round trips.

## 8. Em dash audit

`grep` for U+2014 across `index.html`, `styles.css`, `script.js`,
`portfolio-data.js`, `README.md`, `VERIFICATION.md`: EMPTY. The
`SCRAMBLE_CHARS` string is pure ASCII (verified programmatically).

## 9. Not run / honest limits

- Screen-reader announcement quality: NOT RUN (no real screen reader
  in this environment); ARIA attributes verified in markup.
- FPS / Lighthouse profiling: NOT RUN, no claims made.
- Visual hover of the directional reveal and the pointer parallax:
  code-path verification only (headless has no fine pointer); included
  in the owner's manual checklist.
- GitHub live API: rate-limited from this sandbox IP (403); the
  fallback is the honest designed state and the success path was
  verified through the documented localStorage cache format.
- Physical touch devices: hover effects verified as disabled by the
  `(hover: hover) and (pointer: fine)` guards (code path).

# V6.4 PIXEL SCENES + ENTRANCE CHOREOGRAPHY + DESKTOP LAYERS: EXECUTION REPORT

## 0. Baseline audit findings (Fase 0)

- Backup of all six working files saved to `backup-v6.3/`.
- `node --check script.js` PASS; `node --check portfolio-data.js` PASS.
- Em dash (U+2014) baseline grep across all application files: EMPTY.
- ScrollTrigger mentions in script.js: 33 (creation sites unchanged from
  the V6.3 build).
- `gameCardPixelCharacter()` present at script.js:2666, called once at
  2718; `.game-pixel-character` CSS present at styles.css:2489/2496.
- `initPointerParallax()` used 18 `gsap.quickTo()` calls with NO
  `trackEventTween` wrapping (debt confirmed). Two more `quickTo`
  calls exist in `initGitHubTooltips()` (tooltip, outside the scope of
  spec 1.1).
- `initVisibilityPause()` was called inside the matchMedia no-preference
  handler (boot line 4575) and owned the `globalTimeline`
  `visibilitychange` handler (debt confirmed).
- `.game-card-head` structure: `h3.game-name` + `span.game-status`
  directly in the head, `padding-right: 40px` rail reserved for the
  absolute avatar, avatar appended as the last card child.

## 1. Fase 1: V6.3 debt closure

- All 18 `quickTo` tweens in `initPointerParallax()` are now wrapped:
  dust `xTo`/`yTo` per particle, frame `x`/`y`/`rotationX`/`rotationY`,
  the tool maps, atlas nodes/paths, artwork and backdrop. Grep review:
  every `gsap.quickTo` call site in the parallax function is followed
  by a `trackEventTween(...tween)` guard. `node --check` PASS.
- The GitHub tooltip `quickTo` pair is intentionally NOT tracked
  (documented decision): it is created once at boot in the Category B
  interaction layer, and `place()` already positions instantly via
  left/top whenever reduced motion is live. Tracking it would risk a
  killed tween being reused after a reduce round trip.
- `visibilitychange` for `gsap.globalTimeline` now lives in
  `initPageProgressBar()` (outside matchMedia, untracked on purpose,
  exactly one handler). The old tracked handler was removed from
  `initVisibilityPause()`; grep confirms a single `globalTimeline`
  pause/play pair in the file. `initVisibilityPause()` keeps the
  deferred `window.load` ScrollTrigger refresh.
- README "V6.3 layer" and VERIFICATION V6.3 report already existed and
  satisfy spec 1.3/1.4 content requirements (motion lifecycle, event
  tween tracking, HoverGrid reveal, arcade eject, ornaments; matchMedia
  two-way numbers N0 = 58 -> N1 = 0 -> N2 = 58 with identical
  identities, three repeats). No duplicate section was added.

## 2. Fase 2: pixel scenes per game (browser-verified)

- 11 `.game-pixel-scene` wrappers rendered, one per game; 171 rects
  total; largest scene 18 rects (budget 20). Ids match the data file:
  valorant, hades-ii, dark-souls-iii, hearts-of-iron-iv, minecraft,
  age-of-empires-iv, total-war-warhammer-iii, red-dead-redemption-ii,
  ghost-of-tsushima, the-last-of-us-part-i, outlast-ii.
- Head structure: `.game-card-head` is a flex row with
  `.game-head-text` (name + status) and the scene right-aligned,
  `align-items: flex-start` so the scene stays beside the first text
  row while long names (Total War: Warhammer III, The Last of Us
  Part I) wrap to two lines inside the text column.
- Scene size 56x56 at 1440x900, 48x48 at 390x844 (measured live).
- Loop animations verified running (`getComputedStyle` returns
  `val-muzzle-flash` on the Valorant muzzle rect; all 15 loop rules
  shipped with `steps()` timing). Rect loops use the individual
  `translate`/`rotate` properties plus `fill-opacity` so they compose
  with GSAP entrance transforms/fades instead of overriding them.
- The old `PIXEL_CHARACTERS` constant and `gameCardPixelCharacter()`
  are fully removed; the eject genre check now uses the `DECK_GENRES`
  allowlist with the same roguelike fallback.
- TLOU dim vignette and Outlast night-vision tint live on wrapper
  pseudo elements, keeping both scenes inside the rect budget.

## 3. Fase 3: entrance choreography per game (browser-verified)

- One `openTimeline` per open run (Wake 0.25s shared, 11 per-game
  specs, shared settle). First instrumentation found the entrance ran
  2.94s because the TLOU flashlight tween used `duration: 0.5,
  repeat: 3` (GSAP total = 2.0s). Fixed to `duration: 0.125` (4 x
  0.125 = 0.5s total) and the Outlast night-vision fade tightened;
  the longest remaining chain is the RDR2 sunset fade ending at 1.50s,
  so the whole entrance fits the 1.5s budget.
- Live test at 1440x900: click -> mid-entrance shows `LOADING...`,
  `aria-busy=true`, `aria-expanded=false`, temp props present, cards
  animating; settle shows `EJECT COIN`, `aria-busy=false`,
  `aria-expanded=true`, `deck-screen--active` on, `.deck-temp` count 0,
  first stat bar back at `matrix(0.8, ...)` (honest value).
- EJECT clicked mid-entrance: entrance killed, `EJECTING...`
  immediately, ends at `INSERT COIN` / `deck-screen--off` /
  `aria-expanded=false` with zero leftover `.deck-temp`,
  `.deck-eject-sweep` or `.deck-crt-line` nodes.
- Full eject after a settled open: same clean end state; helper spans
  removed; bars keep their honest targets on the next INSERT COIN.
- Every temporary prop carries `.deck-temp` and the deck sweeps them at
  every boundary (settle, eject, re-open, reduce cleanup), satisfying
  the no-leftover requirement even when a timeline is killed.

## 4. Fase 4: desktop decoration layers (browser-verified)

- Layer 1: 9 `.ambient-debris` fields, 30 items total (hero 5, work 4,
  games 4, about 3, offscreen 3, github 3, credentials 3, companion 3,
  profiles 2). Spread is deterministic: items 0 and 1 always above
  top:30%, at most three below top:70%, 60% left / 40% right.
- Layer 2: 9 `.transition-ribbon` divs between the main sections.
- Layer 3: 6 `.desktop-frame` divs (Gallery, Game Deck, GitHub x2) +
  section pseudo-element frames for Hero, About, Off-screen,
  Credentials, Companion and Social at 1200px and up. Mapping note:
  spec 4.3.1 wrote `.section-shell::before/::after`; the site's
  `.section-shell` adds responsive padding, so adding that class to
  credentials/social would have shifted their layout. The frames are
  applied through the section classes instead, same visual result.
- Viewport sweep (computed display): 1440 ribbons/debris/frames all
  visible; 1024 frames hidden (min-width 1200) with debris + ribbons
  still visible; 768/390/320 everything hidden (master 900px guard).
- No horizontal overflow at any tested viewport.

## 5. Fase 5: ornament enlargement (browser-verified)

- Hero crosshair SVG now 120x120 (cx/cy 60, r 40 / 55, lines 0..120),
  80px on mobile; opacity 0.08 on the SVG with the PLATE / 01 label at
  full opacity (documented mapping from the V6.3 label-legibility fix).
- Truchet mask widened to `ellipse 80% 90% at center, #000 40%,
  transparent 95%`, opacity 0.04.
- About dot matrix mask widened to `ellipse 70% 80% at center, #000
  25%, transparent 80%`, opacity 0.06.
- GitHub pulse line widened to 60% (55% below 700px kept).

## 6. Functional + responsive sweep (headless Chromium, live)

- Viewports 1440x900, 1024x768, 768x1024, 390x844, 320x700:
  `document.documentElement.scrollWidth === window.innerWidth` on all
  five (no horizontal overflow).
- Filters: "Data & Research" leaves exactly 1 visible project card;
  reset restores the full set.
- Archive Navigator: `hobi` -> 1 suggestion -> submit -> status note
  "Navigating to Off-screen hobbies" and `#offscreen` lands at the top
  of the viewport after the smooth scroll.
- Companion summon: `aria-pressed=true`. Quick menu opens.
- Deck: INSERT COIN -> entrance -> settle -> EJECT -> INSERT COIN
  cycle verified twice plus one mid-entrance EJECT (see Fase 3).
- Console errors: none across the whole tour.
- Screenshots: `tests/shots-v6-4/` (d-hero, d-deck-open-scenes,
  d-deck-open2, m-deck-390, m-hero-390).

## 7. Em dash audit

`grep` for U+2014 across `index.html`, `styles.css`, `script.js`,
`portfolio-data.js`, `README.md`, `VERIFICATION.md`: EMPTY.

## 8. Not run / honest limits

- Live `prefers-reduced-motion` emulation: NOT RUN (the browser CLI
  exposes only color-scheme emulation). Code paths verified instead:
  the reduce side of the deck is the pre-existing `openDeckInstant()` /
  `closeDeckInstant()` guards plus the new `deckReduceCleanup()`
  registered in the matchMedia cleanup, and scene loops stop through
  the `@media (prefers-reduced-motion: reduce)` block. The two-way
  lifecycle itself was proven in the V6.3 report (N0 = 58 -> N1 = 0 ->
  N2 = 58, three repeats) and its structure is unchanged.
- Physical hover/pointer parallax: code-path only (headless has no fine
  pointer); the quickTo wrapping is a registry change and does not
  alter the motion itself.
- Screen reader announcement quality: NOT RUN (no screen reader in
  this environment); all new decorations are `aria-hidden` and the
  deck aria sequence is verified by attribute reads above.

---

# V6.5 SCIENTIFIC ARCHIVE (GENERATIVE AMBIENT GEOMETRY): EXECUTION REPORT

Spec: `PROMPT-EKSEKUSI-V6.5.md`. Baseline: V6.4 (backup in `backup-v6.4/`).

## 0. Fase 0: backup and baseline

- Backup of `index.html`, `styles.css`, `script.js`, `portfolio-data.js`
  into `portfolio/backup-v6.4/` before any edit.
- `node --check script.js` PASS, `node --check portfolio-data.js` PASS.
- Em dash baseline: 0 occurrences in all four app files.
- Checkpoint commit: `chore: v6.5 baseline`.

## 1. Fase 1: V6.4 debt closure

- 1.1 quickTo tracking leak: new `trackQuickTo(fn)` helper registers the
  parked `fn.tween` in `motionRegistry.eventTweens` WITHOUT wrapping
  `onComplete` (the leak was the self-removal on first completion). All
  16 `quickTo` creations inside `initPointerParallax()` (dust x/y, frame
  x/y/RX/RY, tool x/y, atlas nodes x/y, paths x/y, art x/y, backdrop x/y)
  now go through `trackQuickTo`. Grep: 0 remaining
  `trackEventTween(<fn>.tween)` calls in the file.
- 1.2 RDR2 entrance duration: sunset fade-in tightened to 0.15s
  (ends at at+0.55) and fade-out moved to `at + 0.55` with duration 0.1.
  RDR2 sits at deck index 7 (at = 0.67), so its choreography ends at
  1.32s, well inside the 1.5s budget.
- IMPORTANT CORRECTION vs the spec text: the spec attributed the 1.68s
  worst case to RDR2 at index 10, but the real deck order puts RDR2 at
  index 7. A full timeline audit of all 11 entrance specs showed the true
  remaining offender was `the-last-of-us-part-i` at index 9 (vignette
  lift at+0.55+0.25 -> 1.59s, splatter fade at+0.6+0.15 -> 1.54s). Both
  were tightened (lift at+0.50/0.2, splatter at+0.55/0.15, both ending at
  at+0.70 = abs 1.49s) so the spec's actual requirement, total maximum
  <= 1.50s, holds. Live measurement (MutationObserver on the deck button
  aria attributes, 3 runs): 1492ms. PASS.
- Checkpoint commit: `fix: v6.5 close v6.4 debts`.

## 2. Fase 2: white gap fix

- The `transition-ribbon` between `#work` (gallery) and `#games` (deck)
  is removed from `index.html`; the two `--night` sections are now
  adjacent siblings joined by `.gallery-section + .games-section
  { border-top: 1px solid var(--line-on-dark); margin-top: 0; }`.
- Browser-verified: `#work.nextElementSibling === #games`, screenshot at
  the boundary shows one continuous dark surface (no white band). The 8
  ribbons between light sections are untouched and still render.
- Checkpoint commit: `style: v6.5 fix dark section gap`.

## 3. Fase 3 + 5: generative engine

- New file `generative-ambient.js` (IIFE, no dependencies, Canvas 2D
  only). Registered with `defer` before `script.js`.
- One central rAF loop (grep: exactly 2 `requestAnimationFrame` call
  sites, `loop()` + `startLoop()`, matching the spec skeleton; every
  canvas shares the single loop). No WebGL, no libraries.
- IntersectionObserver per canvas (threshold 0.04, 60px margin): a canvas
  is ticked only while in view; the loop fully stops when the active set
  empties. Live check: scrolling through the page moved
  `GenerativeAmbient.activeCanvases.size` 0 -> 1 -> 1 -> 2 as sections
  entered/left view; the loop is idle at page top.
- `visibilitychange` stop/start wired. Every effect starts its tick with
  `clearRect` (grep: 5 clearRect call sites: 3 effects + grid layer +
  probe-free resize path).
- Runtime watch: `matchMedia` change listeners for both
  `(prefers-reduced-motion: reduce)` and `(max-width: 900px)` tear the
  engine down if either flips mid-session.
- Boot-time early return verified live at 390px:
  `window.GenerativeAmbient === undefined` on mobile.
- Checkpoint commit: `feat: v6.5 generative ambient engine`.

## 4. Fase 4: per-section ornaments (browser-verified, 1440x900)

| Item | Check | Result |
| --- | --- | --- |
| 4.1 radar sweep | `#curiosity-panel .ornament-radar-sweep` exists, `.radar-beam` animates `v65-radar-spin` 8s | PASS |
| 4.2 isometric grid | canvas mounted 1440x935, painted samples > 0 (grid + scanline) | PASS |
| 4.3 crypto rings | rings exist; outer `v65-spin-cw 40s`, inner `v65-spin-ccw 60s` (counter-rotating) | PASS |
| 4.4 orbital | canvas mounted 1440x886, painted samples > 0 (ellipses + particles) | PASS |
| 4.5 constellation | canvas mounted 1440x651; painted samples 589 -> 696 after pointer enters the section (nodes light up + cursor links) | PASS |
| 4.6 closing crosshair | computed opacity 0 -> 0.15 and transform identity after `#closing` enters the viewport (ScrollTrigger, once) | PASS |

- Layering: radar/rings/crosshair render behind their section content
  (`z-index: -1` + `isolation: isolate` on the host); screenshots confirm
  text stays fully legible (subdued, no content interference).
- The social canvas never intercepts events: pointer tracking happens on
  the section; canvas keeps `pointer-events: none`.

## 5. Functional + responsive sweep (headless Chromium, live)

- Console: clean (no errors, no warnings) across the full scroll session.
- `document.scrollWidth == clientWidth` at 1440 and 390 (no horizontal
  overflow).
- Mobile 390px: canvases, radar, rings and crosshair all
  `display: none`; engine not booted.
- Deck regression: eject -> INSERT COIN state, reopen -> 11 cards,
  aria-expanded true, aria-busy false, stat bars restored to the honest
  values [0.8, 0.9, 0.35, 0.99, 0.95, 0.4, 0.85, identity].
- Quick menu opens; anchor navigation to `#work` works; 8 transition
  ribbons intact between light sections.
- Screenshots: `tests/shots-v6-5/` (boundary, radar, rings,
  constellation, crosshair, isometric grid, orbital).

## 6. Em dash audit

- `grep -rn` for U+2014 across `index.html`, `styles.css`, `script.js`,
  `portfolio-data.js`, `generative-ambient.js`, `README.md`,
  `VERIFICATION.md`: EMPTY. CLEAN.

## 7. Not run / honest limits

- Live `prefers-reduced-motion` flip mid-session: NOT RUN (the headless
  browser cannot emulate the media feature through this tooling). The
  guards are verified statically and at boot instead: engine early
  return, CSS `display: none` for canvases, `animation: none` for the
  radar beam and rings, crosshair pinned to its CSS final state
  (opacity 0.15), and the crosshair ScrollTrigger lives inside the
  existing `gsap.matchMedia` no-preference context so it is reverted by
  the same two-way lifecycle verified in V6.3/V6.4.
- Physical pointer parallax (and therefore the live path of
  `trackQuickTo`): NOT RUN; this headless browser reports
  `pointer: coarse`, and `initPointerParallax()` is fine-pointer gated by
  design. The fix is verified statically (16/16 wrapped, helper adds the
  tween without an onComplete self-removal hook, existing
  `cleanupMotionRegistry()` kills the set unchanged).
- Long-session memory profiling: NOT RUN (no profiler in this
  environment); the per-frame `clearRect` + central loop design removes
  the known accumulation risks.

---

# V6.7 HUMANIZED TEXT & BILINGUAL REFINEMENT: EXECUTION REPORT

Spec: `upload/PROMPT_EKSEKUSI_V6.7.md`. Copy-only release: approved strings
replaced word for word; zero structure, CSS, animation, logic, ID, class,
DOM, href, email, or aria-label changes.

## 0. Fase 0: backup and baseline

- Backup of the five application files to `backup-v6.6/`: DONE.
- `node --check script.js` PASS, `node --check portfolio-data.js` PASS,
  `node --check generative-ambient.js` PASS.
- Baseline em-dash grep (U+2014) across all application files: EMPTY.
- Checkpoint commit: `chore: v6.7 baseline`.

## 1. Fase 1 to 13: string replacement

- Fase 1 metadata: `<title>`, `meta description`, `og:title`,
  `og:description` (index.html) + `meta.siteTitle` / `meta.siteDescription`
  (data) = `Farrel Islami Putra · Data, Software & Learning Notes` + the
  new Indonesian description. PASS.
- Fase 2 hero: `headlineTail` + `description` replaced; eyebrow, headline,
  CTA labels already matched and untouched. Static `#hero-tail` /
  `#hero-subtitle` fallbacks synchronized. PASS.
- Fase 3 archive: `gallery.aside`, `projects[0].description`,
  `comingSoon[0].text`, `comingSoon[1].text` replaced; kickers/titles of
  reserved slots untouched; static `#gallery-aside` synced. PASS.
- Fase 4 about: `lead`, `body`, 4 `notes` replaced; static `#about-lead` /
  `#about-body` synced as the spec explicitly requires. PASS.
- Fase 5 curiosity map: `intro` + all five node `detail`s replaced;
  statuses stay English; static `#curiosity-intro` and
  `#curiosity-panel-detail` (data node default) synced. PASS.
- Fase 6 journey + education: all 4 phase `description`s (summaries) and
  `detail`s + `education.body` replaced; statuses `ONGOING`, `PRACTICING`,
  `ACTIVE · AQI STUDY`, `PLANNED` stay English; static `#education-body`
  synced. PASS.
- Fase 7 off-screen: `intro` replaced; hobby array and details
  (`2x a month`, `Python experiments`, `2 hours a day`, `All day`) kept;
  `frameLabel` kept. Static `#offscreen-intro` synced. PASS.
- Fase 8 github: `intro` replaced; card labels kept. Static
  `#github-intro` synced. PASS.
- Fase 9 credentials: `intro` replaced; V6.6 labels (`SAMPLE FORMAT`,
  `NOT AN ENTRY`, `COMING SOON`) kept. Static `#credentials-intro` synced.
  PASS.
- Fase 10 companion: `intro` replaced; tooltips, button labels, habitat
  texts kept. Static `#companion-intro` synced. PASS.
- Fase 11 social: `intro` replaced; footnote and handles/URLs kept. Static
  `#social-intro` synced. PASS.
- Fase 12 contact: `note` replaced; `heading` already matched; emails,
  `Copy` labels, aria-labels kept. Static `.contact-note` synced. PASS.
- Fase 13 closing: `note` replaced; motto text byte-identical; footer
  labels (`DESIGNED & CODED BY HAND`, `NO PAGE BUILDERS, NO TEMPLATES`,
  `BACK TO TOP ↑`, `ARCHIVE / CLOSED`) kept. Static closing `<p>` synced.
  PASS.

## 2. Syntax + em dash audit (post)

- `node --check script.js` PASS, `node --check portfolio-data.js` PASS,
  `node --check generative-ambient.js` PASS.
- `rg` U+2014 across `index.html`, `styles.css`, `script.js`,
  `portfolio-data.js`, `generative-ambient.js`: EMPTY. CLEAN.
- Leftover old-text sweep (26 distinct old English strings) across
  index.html + portfolio-data.js + script.js: EMPTY. CLEAN.

## 3. Structure untouched (proven by diff)

- `git diff --stat baseline..HEAD`: only `portfolio/index.html` (38 lines)
  and `portfolio/portfolio-data.js` (72 lines) changed.
- `styles.css`, `script.js`, `generative-ambient.js`: zero diff.
- All `id="..."` values: identical (diff empty). All `class="..."`
  values + counts: identical. All `aria-label` values: identical. All
  `href` values: identical.
- Game Deck block in `portfolio-data.js`: zero diff (11 games, all stats
  and jokes byte-identical).

## 4. Visual + functional sweep (Agent Browser, live)

- Wrapper route `/` at 1440x900: header label
  `Portfolio V6.7 Humanized Text & Bilingual Refinement`, new document
  title, iframe loads `/portfolio/index.html`, Download button present.
- Fresh tab: opening overlay visibly appears (label, measure line, SKIP)
  then finishes; session flag set once; second load in the same session
  does not replay it (reload with a restored scroll position skips it via
  the designed scroll-skip, which also proves the skip path).
- Hero 1440x900 + 390x844: new tail/description render; no horizontal
  overflow (`scrollWidth == innerWidth == 390`).
- Gallery: new aside; AQI card shows the new Indonesian description;
  both reserved slots show their new stories.
- Curiosity Map: new intro; default panel detail = new DATA text with
  English `Primary focus`; clicking SOFTWARE swaps to its new detail with
  English `Exploring`; 5 nodes interactive.
- Journey accordion: 4 toggles; opening PHASE 01 reveals the new detail;
  summaries render in the list.
- Education card: new Indonesian body.
- Game Deck: `INSERT COIN` loads 11 original cards (Valorant stats and
  notes byte-identical, e.g. `Kena kepala / sisanya doa`); button flips to
  `EJECT COIN`. Untouched. PASS.
- V6.6 features: hobby chips update `CURRENTLY` + `LAST LOGGED`
  (BADMINTON + HH:MM row); credentials sample card (`SAMPLE FORMAT` /
  `NOT AN ENTRY`) and `0 ENTRI TERVERIFIKASI` timeline intact; companion
  summons (pet visible, toggle flips to `Dismiss companion`).
- Console: no errors from the portfolio (only the Next.js wrapper dev
  notices). Page errors: none.
- Screenshots: `tests/shots-v6-7/` (opening, hero 1440, wrapper, hero 390,
  work 390, about 1440, closing 1440).

## 5. Not run / honest limits

- Lighthouse / LCP: NOT RUN (tooling unavailable in this sandbox).
- Live `prefers-reduced-motion` flip mid-session: NOT RUN (unchanged from
  V6.5/V6.6; motion guards untouched by this release).
- Spotify Now Playing live poll and GitHub REST live fetch depend on
  external networks; in this sandbox they may show their honest fallback.
  This is a network limit, not a V6.7 regression (code untouched).
