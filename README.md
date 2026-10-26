# Farrel Islami Putra · Data, Software & Learning Archive

Personal editorial portfolio: **Blue / White / Slate**, motion-led, hand-coded.
No frameworks, no page builders, no admin panel. Content is managed through
source code, on purpose.

## Run it

Any static file server works. Two common options:

```bash
# Option A: Python
cd portfolio
python3 -m http.server 8080
# open http://localhost:8080

# Option B: Node
npx serve portfolio
```

Opening `index.html` directly from the file system also works (all motion
libraries are vendored locally, no CDN required).

## Structure

```
portfolio/
├── index.html            # Semantic markup: sections & static fallback copy
├── styles.css            # Design tokens (Blue/White/Slate) + all styling
├── script.js             # Rendering, search/filter, motion & interactive components
├── generative-ambient.js # V6.5: generative ambient engine (Canvas 2D ornaments)
├── portfolio-data.js     # <- Single source of truth for content
├── README.md
├── VERIFICATION.md       # Log of checks actually performed
└── assets/
    ├── favicon.svg
    ├── profile-card.svg         # Illustrated personal file (About + hero card)
    ├── project-aqi.svg          # AQI Cirebon cover: labelled CONCEPTUAL
    │                            # VISUALIZATION, not real measurements
    ├── credentials/             # Future certificate/award images live here
    │   └── README.txt
    └── vendor/
        ├── gsap.min.js           # GSAP 3.12.5 (pinned)
        ├── ScrollTrigger.min.js  # ScrollTrigger 3.12.5 (pinned)
        └── lenis.min.js          # Lenis 1.1.13 (pinned)
```

## Interactive components (the design system)

1. **Data Atlas (hero).** A decorative SVG vector field: coordinate grid,
   two drawn paths, nodes, crosshairs and restrained microcopy (`FIELD / 01`,
   `OBSERVATION`, `DATA POINT`, `PATTERN`). Purely illustrative: it is not a
   chart and holds no measured values. Paths draw in on load; a handful of
   layers drift with the pointer on desktop only. Microcopy is configurable
   via `hero.dataAtlas`.
2. **Curiosity Map.** An authored interest graph: DATA at the centre,
   connected to SOFTWARE, AI, DATABASE SYSTEMS and IOT. Every node is a real
   `<button>` (click / tap / Tab + Enter); hover and focus preview the field
   notes, clicking commits the selection (`aria-pressed`), and Escape returns
   to the committed node. The active connector draws itself from the centre
   node outward on every selection (see the V3 list below). On small screens
   the graph becomes a stacked list: same data, same panel. Statuses use
   three honest levels only: `Primary focus` / `Exploring` / `Future
   interest`. Edit via `curiosityMap.nodes` (`id`, `name`, `status`,
   `detail`, `x`, `y`).
3. **Project Archive reveal.** Directional clip-path image reveal on the real
   AQI research card, drawer-style hover lift with a keyboard equivalent
   (`:focus-within`), and honest footer status. Reserved slots stay quiet,
   non-clickable, and outside counts/filters/search.
4. **Interactive Identity Card.** The pixel-art frame gains a capped ±3°
   pointer tilt plus a light highlight that follows the cursor. One single
   coordinated pointer handler drives card, tools, atlas and the pixel dust
   particles (no competing loops). Returns to rest on leave; disabled for
   touch and reduced motion.
5. **Learning Journey progress.** A thin rail beside the four phases fills
   with scroll (ScrollTrigger scrub); the passing phase highlights and its
   rail node pulses once. Without ScrollTrigger it fills once via
   IntersectionObserver; with reduced motion it renders completed
   immediately.
6. **Credential Archive preview.** When real credentials with an `image` are
   added to `credentials.items`, each card gets an `OPEN PREVIEW` control that
   opens a native `<dialog>` (Escape / backdrop / close button, focus returned
   to the card, `object-fit: contain`). Until then the section shows the
   reserved empty state inside a vault-style casing. Nothing implies an
   earned certificate.
7. **Social & Contact microinteractions.** Real inline SVG brand marks
   (GitHub, Instagram, LinkedIn, plus an archive mark for the Drive folder)
   replace text-as-icon labels. Both email cards have a working **Copy**
   button (Clipboard API, execCommand fallback, honest failure message) with
   a brief `role="status"` toast. The quick menu tracks `aria-expanded`,
   closes on Escape and outside focus, and returns focus to its button.
8. **Oversized Footer fill.** The outlined `ISLAMI PUTRA` gains a solid blue
   layer revealed by one scroll-linked `clip-path` sweep as the footer enters.
   Reduced motion renders the final state immediately.

### V3 layer: the living archive

These components sit on top of the eight above. Every one of them has a
`prefers-reduced-motion` fallback and never hides content:

- **Atlas breathing (4.1).** After the hero entrance finishes, the Data Atlas
  keeps living quietly: node dots pulse on a slow sine loop and one path
  carries a slow dash current. Both loops are created paused and only play
  while the hero is on screen; a global `visibilitychange` handler pauses the
  whole GSAP timeline when the tab is hidden.
- **Measurement ticks (4.2).** Every display heading gets small ruler marks
  and a vertical `[ NN ]` label, revealed with the heading. Decorative,
  `aria-hidden`.
- **Constellation connectors (4.3).** Selecting a Curiosity Map node draws
  its connector line from the centre outward (`stroke-dashoffset`), instead
  of only recolouring it.
- **Grain and vignette (4.4).** A fixed 4% fractal-noise overlay
  (`mix-blend-mode: multiply`) plus a soft radial vignette add an editorial
  paper texture. Both are `pointer-events: none` and purely decorative.
- **Pixel dust (4.5).** Fourteen tiny particles float around the identity
  card and are gently repelled by the pointer (fine pointer devices only,
  `gsap.quickTo` per particle).
- **Scanline reveal (5.1.1).** While the hero headline rises out of its
  masks, a light beam sweeps each line once.
- **CTA bounce and search pulse (5.1.2 / 5.1.3).** Hero buttons nudge their
  arrow and scale slightly on hover; focusing the search box pops the
  magnifier icon and temporarily swaps the placeholder.
- **Archive drawer hover (5.2.1).** Project cards lift with a slight
  `rotateX` (perspective on the grid) plus a fold line that slides across
  the card; the keyboard focus state matches. An empty search result shakes
  once (5.2.2).
- **Field notes (5.3).** `about.notes` renders as sticky notes below the
  about copy, each tilted by ±1.5° with a pin dot; hovering straightens the
  note. Chips gained a pressed `:active` state (5.3.5).
- **Journey path drawing (5.4).** Rail nodes mark each phase on the rail;
  they scale up and pulse once when the scroll fill passes them. Upcoming
  stage titles dim (ghost state, opacity 0.6) and the active stage gets a
  stabilo-style highlight sweep. Without motion: full contrast, no effects.
- **Vault casing (5.5).** The reserved credentials grid sits in a framed
  casing with a small dial that turns on hover. The credential preview
  dialog unfolds via a centred `clip-path` and resets on close.
- **Handshake details (5.6).** Social icons redraw themselves on hover
  (stroke draw, then hand back to the filled mark); the Copy button swaps
  its icon for a drawn checkmark for two seconds; a failed copy shakes the
  button honestly; quick-menu links stagger in when opened.
- **Signature details (5.7).** The solid fill layer of the footer name glows
  softly (ink bleed); the personal motto fades in word by word as it enters;
  BACK TO TOP hops once on hover.

### V4 layer: the living arcade

Four new sections sit between the existing ones, plus three sitewide
features. Section order is now: Hero, Work, **Game Deck**, About,
**Off-screen**, **GitHub Activity**, Credentials, **Companion**, Social +
Contact, Closing. Every new piece has a `prefers-reduced-motion` fallback,
pauses when off screen or when the tab is hidden, and adds no dependency.

- **Game Deck (section 03, `#games`).** A dark arcade console: the deck
  opens with INSERT COIN (state machine: idle with a dead `NO SIGNAL`
  screen, `LOADING...`, open with `EJECT COIN`), a GSAP glitch + slot
  machine transition (under 1.5 seconds, transforms cleared so hover keeps
  working) reveals 11 game cards. Each card is `<article data-rarity>` with
  a per-game theme colour used only for border, stat bars and glow
  (legendary = strong glow, rare = medium, common = slate). Stats are
  **SELF-REPORTED CASUAL METRICS**: numeric values render progress bars,
  text values ("Over 9000", "Tinggi", "Karat Tapi Cepat") render honestly
  without a bar. Cards are focusable (`tabindex="0"`) and the focus state
  matches hover.
- **Intentional deviation (V6.3 §1.7): no `ScrollTrigger.batch()` on
  `.game-card`.** The cards are rendered by `renderGameDeck()` at boot but
  stay hidden inside the dead-screen console until INSERT COIN is pressed;
  they are never revealed by scrolling. Their entrance is owned by the
  `openDeck()` timeline inside `initGameDeck()` (glitch, slot entrance,
  spin, then `clearProps`). Adding a batch here would create a second,
  competing reveal system and double animations for the same elements.
  This is a deliberate design decision, not an oversight.
- **Off-screen (section 05, `#offscreen`).** Left: a pixel-art character
  built entirely from `<rect>` (`viewBox 0 0 64 64`, `crispEdges`, 16 colour
  palette scoped to the SVG) running a 12 frame loop across three states:
  coding (typing hands, blinking screen, HUD toggles), music (head bob,
  note particles from the headphones), badminton (racket leans in, a
  shuttlecock falls, bounces once and fades). Below it, four hobby chips.
  Right: the official Spotify embed for `while(True): listen()` inside a
  custom archive frame. The loop pauses via IntersectionObserver when the
  section leaves the viewport.
- **Now Playing (header, sitewide).** A small pill in the header polls
  `https://farrel-spotify-api.vercel.app/api/spotify` every 30 seconds
  (`AbortController`, no polling while the tab is hidden). Playing = album
  art + pulsing Spotify-green dot + `title · artist`; not playing = dimmed
  `RECENT ·` state; network error = the pill hides, never a fake song.
  `aria-live="polite"` on the status text; the link opens the track in a new
  tab. Hidden below 980 px (header space); the quick menu carries the same
  status row instead.
- **GitHub Activity (section 06, `#github`).** "Commits, not claims": four
  stat cards (Repositories, Stars earned, Followers, Top 3 languages) built
  from the public REST API (`/users/Fryel32` + `/repos?per_page=100&sort=updated`
  in parallel), cached in `localStorage` under `fryel32-github-stats-v1` for
  one hour. Numbers count up over 800 ms when the section enters (instant
  under reduced motion). No contribution streaks and no commit totals: the
  REST API cannot count those honestly, so they are never shown. If fetch
  fails, the last cache (even stale) renders; otherwise an honest fallback
  message with a link to the profile appears.
- **Companion (section 08, `#companion`).** Explains the page pet and holds
  the Summon / Dismiss button. The pet is the same pixel-art SVG cloned into
  a fixed corner button (64 to 80 px): it floats (±4 px sine loop), blinks
  every 3 to 5 seconds, and on click hops with a rotating tooltip ("Hi,
  Farrel is probably coding."). Summon preference is stored in
  `localStorage` (a UI preference, not content). Pet is a real `<button>`
  with `aria-label`; the tooltip is `role="status"` + `aria-live="polite"`.
- **Konami code + Data Rain (sitewide).** `↑ ↑ ↓ ↓ ← → ← → B A` on keyboard,
  or 5 taps on the header brand mark within 2 seconds on mobile: a 0.3 s
  glitch flash (`steps(5)` hue-rotate + translate) then a fullscreen canvas
  Data Rain for about 5 seconds, then a toast "Easter egg found: data stream
  initiated." (`role="status"`). Reduced motion: toast only. The canvas
  cleans up on visibility change and resize.

#### Editing the Game Deck data

Everything lives in `gameDeck` inside `portfolio-data.js`. Each game:

```js
{
  id: 'valorant',
  name: 'Valorant',
  platform: 'Laptop',
  genre: 'Tactical Shooter',
  status: 'Sedang Main',        // or 'Tamat'
  themeColor: '#FF4655',        // card border / bars / glow only
  rarity: 'legendary',          // legendary | rare | common
  stats: [
    { label: 'Aim', value: 80, note: 'Kena kepala / sisanya doa' },
    { label: 'You Died Counter', value: 'Over 9000' }  // text = no bar
  ]
}
```

Numeric values (0 to 100) render a progress bar; any string renders as text
without a bar. `note` is optional and renders as a small line under the
stat. Nothing here is presented as competitive data.

#### Now Playing endpoint

`GET https://farrel-spotify-api.vercel.app/api/spotify` returns:

```json
{
  "isPlaying": true,
  "title": "Tidal Wave",
  "artist": "Chase Atlantic",
  "albumImageUrl": "https://i.scdn.co/image/...",
  "songUrl": "https://open.spotify.com/track/..."
}
```

When nothing plays, the same shape comes back with `isPlaying: false` and
the last played track. The header indicator renders both honestly; it hides
itself when the endpoint is unreachable.

#### Spotify backend reference (Vercel, already deployed)

The endpoint runs on Vercel. To rebuild or move it (EndeavourOS or any OS):

```bash
sudo pacman -S nodejs npm          # node >= 18
npm install -g vercel@latest
vercel login
```

Project structure: `farrel-spotify-api/` with `api/spotify.js` (the handler
exchanges the refresh token for an access token, reads
`/v1/me/player/currently-playing`, and falls back to
`/v1/me/player/recently-played?limit=1`; it sends
`Access-Control-Allow-Origin: *`), plus `.env.local` with
`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
(never committed). Local dev: `vercel dev` then
`curl http://localhost:3000/api/spotify`. Deploy:

```bash
vercel --prod
vercel env add SPOTIFY_CLIENT_ID
vercel env add SPOTIFY_CLIENT_SECRET
vercel env add SPOTIFY_REFRESH_TOKEN
vercel --prod                      # redeploy after env vars
```

To tighten CORS later, replace `*` with the final portfolio domain.

### V5.2 layer: the edge archive

The V5.2 pass finishes the margins: the empty edges between sections now
carry a consistent annotation system, four interactions were completed,
and a runtime reduced-motion switch was added. No dependency was added;
everything is SVG, CSS, and GSAP on top of the existing build.

- **Archive Spine (margin atlas).** Every main section carries a thin
  vertical measure line with tick marks and one mono label in the left
  margin: `00 / START` (hero ruler), then `01 / WORK`, `02 / PLAY`,
  `03 / ABOUT`, `04 / AFTER HOURS`, `05 / PULSE`, `06 / VAULT`,
  `07 / PET`, `08 / CONNECT`, following the real DOM order. Labels are
  decoration (`aria-hidden`) and come from `DATA.decorations.spine`.
- **Blueprint Archive (gallery).** A faint 40px grid sits behind the
  dark gallery (masked toward the edges), four corner brackets frame the
  grid area, and a measurement ruler reads `01 / ARCHIVE / 02 / STUDY /
  03 / NEXT` (decorative layout numbers; the live count stays in
  `#project-count`).
- **Arcade Cabinet (game deck).** A soft spotlight beam from the top,
  static scanlines on the active screen, and a pixel-art joystick + A/B
  buttons (opacity .3, `pointer-events: none`, purely decorative).
- **Research Field Notes (about).** Two margin annotations with leader
  lines join the existing sticky notes; the decorative constellation
  draws its edges once when it enters the viewport.
- **Pixel Habitat (off-screen + companion).** The desk pet now sits in a
  scene (wall, window, poster, shelf, three-row wooden floor) with a few
  dust particles that drift only while the section is on screen. The
  Companion section shows the habitat the pet is summoned from: summon
  flies the pet from the habitat to the page corner (a FLIP-like move
  measured from both rects), dismiss walks it back, and the habitat
  label round-trips between `PET HABITAT / 08` and `PET SUMMONED`.
- **Open Source Pulse framing (github).** A 7x20 uniform skeleton grid
  (explicitly decoration, never labelled as contribution data) and
  terminal brackets `[ GIT LOG / FRYEL32 ]` behind the live stat cards.
- **Engraved Credential Archive.** The reserved grid gains ruler lines
  with 20px ticks, four corner plates, the plate label
  `ARCHIVE / MILESTONES / 05`, and a dashed, -8deg `VERIFIED ONLY`
  stamp: a policy statement, not a claim about the empty slots.
- **Postal decorations (contact + closing).** A rotated `POST / 2026`
  stamp on the contact block, three static signal waves beside the
  personal email card, and a thin measure line above the closing name.
- **Completed interactions.** Hobby chips are real `<button>`s with four
  one-shot pet reactions (badminton shuttle, coding flicker, gaming
  gamepad shake, music notes; unknown hobbies get a polite toast). Game
  stat bars refill on hover (fine pointers only, numeric bars only,
  old tweens killed). GitHub cards gained a cursor tooltip (200ms delay,
  `quickTo` follow, content read from the rendered values, keyboard
  focus shows the same data anchored to the card).
- **Dynamic reduced motion.** Switching the OS preference to reduce while
  the page is open stops every loop, releases Lenis, kills the two scrub
  triggers, and force-reveals all gated content; switching back reloads
  the page so no ticker, trigger, or handler can ever be duplicated.
- **Scroll budget.** Exactly two scroll-scrubbed effects remain
  (journey rail fill, footer outline fill). Decorative geometry uses
  one-shot reveals. Lenis runs on one named GSAP ticker callback; the
  Data Rain draws on the same ticker.

#### Editing the decoration labels

All decoration copy lives in `DATA.decorations` inside
`portfolio-data.js`: spine labels, gallery ruler labels, the github
bracket label, the credential stamp/plate label, the habitat label and
status chip, and the dust particle counts (desktop / mobile cap). Set
any flag to `false` (or delete the entry) to remove that decoration;
every section stays fully usable without them.

### V5.3 layer: the global archive navigator (latest additions)

The V5.3 pass turns the hero search into a safe keyword navigator,
hardens the boot/lifecycle order, and refines two decorations. Still no
new dependency; still the same vanilla HTML + CSS + JS + GSAP stack.

- **Global Archive Navigator (hero search).** The hero field no longer
  filters the project grid and no longer re-renders the gallery. It
  navigates between sections by keyword using a developer-authored
  allowlist (`DATA.archiveSearch.routes`): e.g. `hobi` or `badminton`
  goes to Off-screen, `AQI` or `cirebon` to the project archive,
  `gmail` to contact, `sertifikat` to credentials, `pet` to the
  companion. Ambiguous keywords (`data`) offer up to three selectable
  destinations. Matching is deterministic (exact alias, then known
  phrase on word boundaries, then 3+ character prefix) and never fuzzy;
  the query can never build a selector, URL, or code. The widget is an
  ARIA 1.2 combobox: ArrowUp/ArrowDown choose, Enter goes, Escape
  closes, click/tap works, and a polite status row announces navigation
  or the honest not-found message (one gentle shake per transition,
  never a loop). Unknown input, injection payloads (`<script>`,
  `<img onerror>`, `javascript:`, `__proto__`, 10k characters, emoji)
  are inert: everything renders through `createElement`/`textContent`
  and targets resolve through `getElementById(fixedId)` only.
- **Category filters stay separate.** The gallery's `All work` /
  `Data & Research` buttons remain the only project filter; the hero
  navigator and the filters no longer share state. Reserved slots still
  only appear in the unfiltered view and never count as projects.
- **Boot and lifecycle order hardened (spec §1.1).** Plugin
  registration + `lagSmoothing(0)` now happen before ANY ScrollTrigger
  is created (the GitHub pulse trigger and the project-card batch used
  to run earlier); a `pluginsRegistered` flag gates every batch helper.
  Boot order is now: render data-driven DOM, register plugins, init
  Lenis, wire functional components, then create triggers.
- **Observatory margin (hero).** The left ruler gained evenly spaced
  tick marks (48px rhythm) alongside the `00 / START` and `01 / WORK`
  labels.
- **Wider pet habitat (companion).** The habitat panel widened to
  760px (640px under 1000px) so the scene reads as a balanced habitat,
  and a status chip now mirrors the pet state honestly: `WAITING IN
  HABITAT` / `SUMMONED · CORNER POST` (from
  `DATA.decorations.companion`).
- **Grain targets.** Global grain sits at 0.06 on light sections; dark
  sections add a faint local layer landing near the agreed 0.08.
- **Tablet header fix.** At 980px and below the quick menu becomes the
  navigation (nine nowrap links cannot fit on tablets, which produced a
  measured 53px horizontal overflow at 768px); header padding tightens
  slightly at 1150px to remove a 1px overflow at 1024px. All five
  reference viewports (1440/1024/768/390/320) are overflow-free.

#### Editing the archive search aliases

Add or remove routes in `DATA.archiveSearch` inside
`portfolio-data.js`. Each route is `{ targetId, label, aliases }` where
`targetId` must be an existing element ID and `aliases` are lowercase
keywords (multi-word is fine). Visitor input only ever selects among
these routes; there is no free-text search and no server round trip.

### V6.3 layer: hardening, HoverGrid reveal, arcade eject, edge ornaments

#### What changed (no new dependencies)

- **Reduced-motion lifecycle.** The old reload-on-preference-change
  watcher is gone. Motion now boots through `gsap.matchMedia()`: one
  handler for `(prefers-reduced-motion: no-preference)` builds every
  motion piece and returns an explicit cleanup; the reduce handler only
  guarantees visible content. Everything `matchMedia` cannot revert on
  its own (tweens created from event handlers, async ambient loops,
  observers, motion-only listeners, Lenis) is tracked in
  `motionRegistry` and released by `cleanupMotionRegistry()` plus the
  `reset*()` helpers. Verified by three consecutive two-way switches:
  `N0 = 58 -> N1 = 0 -> N2 = 58` with identical trigger identity lists
  every time, so the reload fallback was NOT activated.
- **`isReducedMotion()` helper.** Boot-time decisions keep the
  `reducedMotion` constant; runtime decisions (click handlers, hovers,
  dialogs, tooltips, the deck) read the live preference instead.
- **Game stat bars (new contract).** The fill span is always full
  width; the honest value lives in `data-target` (0-100) and drives
  `scaleX` only, set inline by the renderer so 80 means 80% with or
  without JS. Hover refills to the same value; opening the deck never
  clears the transform.
- **HoverGrid-style directional reveal.** Project covers wrap the img
  in `.project-cover-inner`; a delegated `pointerover`/`pointerout`
  pair (the bubbling events, not enter/leave) reveals the image from
  the side the pointer entered, with `focusin`/`focusout` giving
  keyboard users the same reveal. Leaving always returns to
  `inset(0 0 0 0)`, so the image never disappears.
- **Arcade eject, four phases per genre.** `ejectDeck()` runs
  scramble -> glitch+sweep (0.15s), per-genre card exits with random
  stagger (0.5s), CRT collapse + dead screen (0.3s), then NO SIGNAL
  fade-in and honest reset (0.2s). `aria-busy` flips at click,
  `aria-expanded` at phase 3, both false by phase 4. The single
  scramble interval is owned by `stopScramble()`.
- **Pixel characters.** Every game carries `pixelCharacter`
  (`shooter`, `soulslike`, `strategy`, `sandbox`, `horror`,
  `roguelike`); `PIXEL_CHARACTERS` in `script.js` renders the 16x16
  rect-only avatar via `createElementNS`, using the `--px-*` palette
  (now defined on `:root`) plus one or two `themeColor` accents.
- **Edge SVG ornaments.** One main + at most two accents per section
  (the archive spine and grain are sitewide systems, not counted):
  hero crosshair, gallery Truchet + stamp, about leader line + dot
  matrix, deck starfield + cable, habitat plant + second poster,
  GitHub pulse line + terminal prompt, credentials watermark, contact
  envelope, closing measure line, companion shelf books + rug. All are
  `aria-hidden`, `pointer-events: none`, behind content, and visible
  without motion.

#### Editing the eject choreography

To add a genre effect: add the key to `PIXEL_CHARACTERS` (max 40 rects,
`viewBox 0 0 16 16`, `--px-*` fills, `'@theme'` for the game accent),
set `pixelCharacter` on the game in `portfolio-data.js`, and add a
branch in `ejectDeck()`'s phase-2 loop. Unknown keys fall back to
`roguelike` automatically.

#### Disabling an ornament

Every ornament is one markup node with the class `ornament-*` in
`index.html` (the companion shelf books + rug are built in
`initCompanionHabitat()` because that habitat is JS-built). Delete the
node - or set `display: none` on its class - and nothing else changes;
no script depends on them except `initGithubPulse()`, which simply
skips the line reveal when `.ornament-github-pulse-path` is absent.

#### Motion internals (for future edits)

- `motionRegistry` (module scope): `observers`, `timers`, `intervals`,
  `motionListeners`, `eventTweens`, `ambientTweens`, `batchTriggers`,
  `scrollTriggers` - all iterable Sets/lists.
- `trackMotionListener(target, type, handler)` registers a motion-only
  listener that the cleanup removes.
- `trackEventTween(tween)` registers a tween created from an event
  handler and auto-forgets it on completion (the original onComplete
  still runs).
- `trackAmbientTween(tween)` registers async loops (atlas breathing,
  blinks) for the cleanup.
- The no-preference handler in `boot()` is the single place that
  decides which functions are motion vs interaction; DOM builders
  (`buildArchiveSpines`, `buildGithubPulseDots`, `buildHeroDust`,
  `buildHeadingTicks`, `initDeskHabitat`) run once at boot so re-entering
  the handler can never duplicate elements.

### V6.4 layer: pixel scenes, entrance choreography, desktop layers

The V6.4 pass closes the two remaining V6.3 motion debts, gives every
game card its own 16x16 pixel scene, replaces the slot-machine entrance
with per-game choreography, and adds three desktop decoration layers.

#### V6.3 debt closure (Fase 1)

- **`quickTo` tracking.** Every `gsap.quickTo()` in
  `initPointerParallax()` (frame x/y/rotation, floating tools, atlas
  layers, artwork, backdrop, hero dust) now registers its internal
  tween through `trackEventTween()`, so a reduce switch kills them all.
  The GitHub tooltip `quickTo` is intentionally not tracked: it is
  created once at boot in the interaction layer and already positions
  instantly under reduced motion through its runtime guard.
- **`visibilitychange` moved out of `matchMedia`.** The
  `gsap.globalTimeline` pause/resume handler now lives in
  `initPageProgressBar()` (always outside the motion context), so a tab
  that is hidden exactly when the preference flips can never come back
  stuck on pause. `initVisibilityPause()` keeps only the deferred
  full-load ScrollTrigger refresh.
- README (this section) and `VERIFICATION.md` (V6.3 + V6.4 reports)
  document the state; the V6.3 sections were already complete.

#### Pixel scenes per game (Fase 2)

`GAME_SCENE_SPECS` in `script.js` holds one 16x16 rect-only scene per
game id (max 20 rects: background 3-5, character 8-12, effects 2-4),
rendered by `buildGamePixelScene()` into `.game-pixel-scene` at the
right of the card head (56px desktop / 48px mobile, top-aligned with
the first text row; long names wrap inside `.game-head-text`). Fills
use the `--px-*` tokens promoted to `:root` in V6.3 plus one `@theme`
accent per scene. The old `PIXEL_CHARACTERS` lookup and the absolute
`.game-pixel-character` avatar were removed; the eject choreography
now reads genres from the `DECK_GENRES` allowlist. Scenes:
`valorant`, `hades-ii`, `dark-souls-iii`, `hearts-of-iron-iv`,
`minecraft`, `age-of-empires-iv`, `total-war-warhammer-iii`,
`red-dead-redemption-ii`, `ghost-of-tsushima`,
`the-last-of-us-part-i`, `outlast-ii`. Each scene runs CSS loop
animations built from `steps()` keyframes (muzzle flash, casing drop,
rune spin, torch flickers, sword sway, map arrows, crack blink, banner
sway, lava flicker, dust drift, leaf fall, flashlight flicker, noise
flicker). Rect loops use the individual `translate`/`rotate`
properties and `fill-opacity` (not `transform`/`opacity`) so they
compose with GSAP entrance tweens instead of fighting them. Under
reduced motion every loop stops on its first frame.

#### Entrance choreography per game (Fase 3)

`GAME_ENTRANCE_SPECS` maps each game id to a `(tl, card, index)`
function that appends 4-5 tweens at `at = 0.25 + index * 0.06` onto
the ONE `openTimeline` (wake 0.25s shared, per-game entrance, shared
settle). Valorant deploys with a screen flash and recoil; Hades II
wipes in a circle with a golden glow; Dark Souls III drops from above
with dust; Hearts of Iron IV unrolls like a map with unit markers;
Minecraft bounces out of the ground with a dirt burst; Age of Empires
IV marches in from alternating sides and unfurls its banner; Total
War rises from a blood pool; Red Dead II rides in with a dust trail
and hat tip; Ghost of Tsushima slices open under falling maple
leaves; The Last of Us flickers to life under a heavy vignette;
Outlast II boots through brightness flicker with night vision and
camera shake. Temporary props share the `.deck-temp` class and are
swept at every state boundary (settle, eject, re-open, reduce
cleanup), so none can outlive its animation. EJECT during the
entrance kills `openTimeline` first; the whole entrance fits inside
1.5s.

#### Desktop decoration layers (Fase 4)

- **Layer 1: ambient pixel debris.** `DECORATION_DEBRIS` +
  `buildAllAmbientDebris()` build one `.ambient-debris` field per main
  section (hero, work, games, about, offscreen, github, credentials,
  companion, profiles): rect-only 16x16 shapes (diamond, tag, folder,
  arcade button, stick, dpad, note, paper, shuttle, node, branch,
  seal, ribbon, footprint, bone, envelope) at opacity 0.2 in the
  margins, 60% left / 40% right, at least two above top:30% and never
  more than three below top:70%.
- **Layer 2: transition ribbons.** One `.transition-ribbon` (two
  1.5px lines at opacity 0.15 around a rotated 6px node) between each
  pair of main sections.
- **Layer 3: desktop margin frames.** 40x40 corner brackets at
  opacity 0.12, active at 1200px and up. Gallery, Game Deck and
  GitHub use `.desktop-frame` divs (their section pseudo elements are
  already taken); Hero, About, Off-screen, Credentials, Companion and
  Social use section pseudo elements.
- All three layers hide below 900px (the spec 4.4 master guard; the
  debris' 700px rule is covered by it).

#### Ornament enlargement (Fase 5)

Hero crosshair enlarged to a 120x120 viewBox (r 40 / 55, 80px on
mobile); the Truchet field mask widened to ellipse 80%/90% (opacity
0.04); the about dot matrix mask widened to ellipse 70%/80% (opacity
0.06); the GitHub pulse line extended to 60% width. The enlarged
crosshair keeps its opacity on the SVG (0.08) rather than the
container so the mono `PLATE / 01` label stays legible (documented
mapping from the V6.3 label fix).

### WebGL decision (go / no-go): **NO-GO**

Data Atlas and every decorative effect ship as SVG + CSS + GSAP. Three.js was
evaluated and rejected: no planned effect needs GPU rendering beyond what the
SVG field already achieves, and WebGL would add bundle weight, GPU/battery
cost, a context-loss failure path and a static fallback burden for zero
gain. If a future WebGL layer is ever added, it must be one decorative layer,
with `aria-hidden`, reduced-motion handling, resize/pixel-ratio caps,
visibility pausing, and full content parity without it.

## Updating content (edit code, refresh, done)

Everything the visitor reads lives in **`portfolio-data.js`**:

| What                          | Where in `portfolio-data.js`             |
| ----------------------------- | ---------------------------------------- |
| Name, monogram, role, SEO     | `meta` (`siteTitle` syncs `<title>`)     |
| GitHub & documentation URLs   | `links.github`, `links.docs`             |
| Hero headline & intro         | `hero` (keep headline lines short!)      |
| Data Atlas microcopy          | `hero.dataAtlas` (illustrative only)     |
| Curiosity Map nodes & notes   | `curiosityMap.nodes`                     |
| Real project cards & filters  | `filters`, `projects`                    |
| Reserved "coming soon" slots  | `comingSoon`                             |
| About copy                    | `about`                                  |
| About sticky notes            | `about.notes` (one line per note)        |
| Languages & tools chips       | `languagesTools.items`                   |
| Skills + honest status        | `skills.items` (`status` shown as-is)    |
| Learning journey steps        | `journey.items`                          |
| Education text                | `education`                              |
| Credentials / certificates    | `credentials.items` (may stay empty)     |
| Social cards + icon choice    | `social.items` (empty `url` = hidden)    |
| Email contact + copy messages | `contact` (`copyOk`, `copyFail`)         |
| Motto, closing & footer lines | `closing`, `siteFooter`                  |
| Game deck (11 games)          | `gameDeck.games` (see V4 section above)  |
| Hobbies + Spotify playlist    | `offscreen.hobbies`, `offscreen.spotify` |
| Now Playing endpoint          | `offscreen.spotify.nowPlayingEndpoint`   |
| GitHub stats config + cache   | `githubActivity` (`cacheKey`, `cacheTTL`)|
| Companion pet name + tooltips | `companion` (`petName`, `tooltipLines`)  |

Known, intentional duplicates: the `<title>` and `<meta description>` in
`index.html` must also exist as static HTML for SEO/social previews before
JavaScript runs. Keep them synchronized with `meta.siteTitle` and
`meta.siteDescription`. Everything else is rendered from the data file.

### Replacing a "Coming Soon" project slot

The gallery currently shows one real project (AQI Cirebon research, in
progress) plus two reserved slots. When a new project has real, verifiable
work to show:

1. Add a full record to `projects` in `portfolio-data.js`
   (`title`, `category`, `tag`, `status`, honest `description`, `stack`
   limited to tools actually used, `image`, and `link`/`linkLabel` only if
   the destination truly exists).
2. Add its category to `filters` if it introduces a new one.
3. Add a cover image to `assets/` (SVG/PNG/JPG) and reference the path.
4. Delete one entry from `comingSoon`.

Reserved slots are rendered only in the unfiltered, empty-search view and
never appear in counts, filters, or search results; they cannot be mistaken
for finished work.

### Adding a certificate, award, or publication

There is no in-browser editor and there never will be. To add a real entry:

1. Save the actual certificate/award image in `assets/credentials/`
   (e.g. `assets/credentials/dicoding-ml-2026.jpg`).
2. Append an object to `credentials.items` in `portfolio-data.js`:

   ```js
   {
     title: 'Exact certificate title',
     issuer: 'Issuing organization',
     date: '2026',                     // optional, '' when unknown
     type: 'Certificate',              // Certificate / Award / Competition / Publication
     description: 'One honest line about relevance.',   // optional
     image: 'assets/credentials/dicoding-ml-2026.jpg',  // optional
     proofUrl: 'https://official-verification-url',     // required for a Verify button
     credentialId: 'PUBLIC-ID-IF-ANY'                   // optional
   }
   ```

3. Refresh and verify the link opens the official verification page.

Rules enforced by the renderer: a "Verify credential" button is only rendered
when `proofUrl` is a real URL; an entry with an `image` also gets an
`OPEN PREVIEW` dialog; an empty `credentials.items` array shows the
designed "COMING SOON" empty state. Nothing implies an achievement that has
not been earned.

Rules the build respects (keep them when editing):

- **No dead links.** Only add a social/project URL once it is real.
  A project without `link` shows its honest `status` label instead of a button.
- **No fake mastery.** Skill chips display truthful statuses:
  "Currently practicing", "Exploring", "Area of interest".
- **Project images** must live in `assets/` (or be a full `https://` URL).
- The Instagram card deliberately does not display a typed handle: the
  supplied URL path (`reinnhv`) and the described handle (`rennhv`) differ,
  so the exact supplied URL is used as-is and the discrepancy stays visible
  in the data file comments.
- **No em dash character (U+2014) anywhere.** Titles use a middle dot (`·`)
  or a slash (`/`), numeric ranges use an en dash, and prose simply rewords
  the sentence. Keep it that way when editing. Verify with (the pattern is
  spelled as an escape so this file stays clean):

  ```bash
  grep -rn "$(printf '\u2014')" --include="*.html" --include="*.css" --include="*.js" --include="*.md" --include="*.svg" --include="*.json" .
  ```

  The output must stay empty.

Design tokens (colors, fonts, radii, motion timings) are CSS custom
properties at the top of `styles.css` (`:root`). Change the palette there,
not scattered through the file. All GSAP easing values live in the `MOTION`
object at the top of `script.js`.

## Motion system

- **GSAP + ScrollTrigger + Lenis** (pinned versions, served from
  `assets/vendor/`) so the site works offline and never breaks because of a
  CDN. Lenis drives smooth scrolling and is wired into the GSAP ticker.
- Choreography differs per section and per component (see *Interactive
  components* above). Each has its own motion intent: spatial field,
  selection, directional reveal, tilt, progress, preview, copy feedback,
  typography fill. Ambient loops exist only on the Data Atlas, only play
  while the hero is on screen, and the whole timeline pauses when the tab is
  hidden (`visibilitychange`). The only rAF use is the scroll progress bar
  (event-driven).
- **Graceful degradation:** if any animation library fails to load, a small
  IntersectionObserver fallback fades content in; and if JavaScript fails
  entirely, the page is still fully readable because initial animation
  states are only ever applied *from* JavaScript. All links, including the
  mailto: contact addresses, are static HTML and work without JS. The Data
  Atlas renders as finished static artwork when scripts fail.
- **`prefers-reduced-motion: reduce`** disables smooth scrolling, parallax,
  tilt, entrances, scroll-linked effects and every V3 component effect; the
  journey rail, ticks, motto, notes and footer fill render their final
  states via CSS. Content stays visible.
- Pointer effects run only on devices with a fine pointer (desktop), are
  capped (±3° tilt, small drift distances), and settle back to rest.

## V6.5: Scientific Archive Generatives

V6.5 fills the desktop negative space with precise "scientific instrument"
geometry. Everything is subdued (effective ornament opacities stay inside
the 0.04 to 0.15 band), decorative, and must never compete with content.

### Architecture

`generative-ambient.js` is a self-contained IIFE that owns ALL Canvas 2D
ambient work. It is registered in `index.html` with `defer`, immediately
before `script.js`.

- **One central `requestAnimationFrame` loop.** Canvases never own their
  own loops; the engine keeps a `Set` of instances and calls
  `instance.tick(dt)` on each, once per frame, with a clamped delta
  (max 50 ms) so a background tab cannot teleport the animation.
- **IntersectionObserver per canvas.** An instance is added to the active
  set only while its canvas is actually in view, and the whole loop stops
  (`cancelAnimationFrame`) as soon as the set is empty.
- **`visibilitychange`.** The loop stops while the document is hidden and
  resumes on return. Nothing runs in a hidden tab.
- **`clearRect` every frame.** No canvas accumulates paint, so long
  sessions cannot leak memory.
- **Early return.** If `(prefers-reduced-motion: reduce)` matches, or the
  viewport is `<= 900px`, the engine exits before creating anything. Both
  conditions are also watched at runtime (`matchMedia` change listeners):
  flipping either mid-session stops the loop, disconnects the observer and
  tears the instances down.
- **Public handle.** `window.GenerativeAmbient` exposes
  `{ activeCanvases, startLoop, stopLoop }` so future features can
  integrate without owning a second loop.

### The three canvas effects

| Effect           | Section            | Markup                                                              | Behaviour                                                                                       |
| ---------------- | ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `isometric-grid` | Off-screen (#offscreen) | `<canvas class="ambient-canvas ambient-canvas--offscreen" data-effect="isometric-grid">` | Two families of thin 30-degree lines (pre-rendered once per resize) plus a horizontal scanline whose trail fades behind it. |
| `orbital`        | Companion (#companion)  | `<canvas class="ambient-canvas ambient-canvas--companion" data-effect="orbital">`         | 2x2px particles travelling faint ellipses with short trails; particles ease to 25% speed when the pointer comes near.       |
| `constellation`  | Social (#profiles)      | `<canvas class="ambient-canvas ambient-canvas--social" data-effect="constellation">`      | Drifting 2x2px nodes joined by thin lines. The ONE interactive ornament: nearby nodes light up and link to the cursor.      |

Canvases are `position: absolute; inset: 0; pointer-events: none;`
`aria-hidden="true"` and carry a canvas-level CSS opacity that scales the
engine's internal alphas into the ornament band. Pointer interaction is
captured on the parent `<section>`, never on the canvas itself.

### The three SVG ornaments (script.js)

Built at boot by `buildV65Ornaments()` through the `createSvgOrnament()`
helper (`div.ornament > svg`, hardcoded developer strings only):

| Ornament                        | Location                  | Motion                                                            |
| ------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `.ornament-radar-sweep`         | `#curiosity-panel`        | Beam rotates once per 8s (`v65-radar-spin`); static under reduce. |
| `.ornament-crypto-rings`        | `#credentials` (section level, behind `.credentials-inner`) | Two dashed rings counter-rotate, 40s cw / 60s ccw.                |
| `.ornament-closing-crosshair`   | `#closing`                | ScrollTrigger reveal: opacity 0 -> 0.15, scale 1.2 -> 1.0, once.  |

All three sit at `z-index: -1` inside a section/panel that is pinned with
`isolation: isolate`, so they render above the surface and below every
piece of content, and can never escape behind an ancestor background.

### Adding a new effect

1. Drop `<canvas class="ambient-canvas" data-effect="my-effect">` into a
   `position: relative` section (the content wrapper above it must carry
   `position: relative; z-index: 1` or similar).
2. Write a factory `myEffect(canvas)` returning
   `{ tick(dt), resize(), destroy() }` and draw everything each tick after
   a `clearRect`.
3. Register it in `mountCanvases()` inside `generative-ambient.js`.
4. If it needs the pointer, reuse `trackSectionPointer(section, state)`.

### Lifecycle summary

boot -> mountCanvases (3 canvases) -> IntersectionObserver decides what is
active -> central rAF runs only while at least one canvas is visible and
the tab is shown -> resize re-fits everything (one debounced listener) ->
mobile/reduced-motion flip tears everything down. The SVG ornaments are
static DOM: their motion is CSS keyframes (radar, rings) or the one
ScrollTrigger (crosshair), each with its own reduced-motion opt-out.

## V6.6: The Editorial Refinement

V6.6 fills the remaining empty space with honest archive content, fixes the
hidden orbital bug, upgrades the hobby and search functions, and adds a
once-per-session opening experience. Game Deck, stack, and dependency list
are untouched.

### What changed

1. **Orbital fix (Fase 1).** The companion particles now spread across the
   section margins (`cx` 4% to 96% wide, `cy` 8% to 83% tall) instead of the
   centre band where the white habitat card hid them.
2. **Credentials (Fase 2).** `initCredentialRequirements()` builds a left
   column listing the five entry requirements and a verification timeline
   whose count comes from `DATA.credentials.items.length` (currently
   `0 ENTRI TERVERIFIKASI`). A clearly-labelled sample card
   (`SAMPLE FORMAT / NOT AN ENTRY`, dashed, 0.65 opacity, no buttons, no tab
   stops) demonstrates the entry format inside the grid. The archive stamp
   moved inside the frame (`top/right 12px`, `8px` at 700px) and the crypto
   rings opacity rose from 0.05 to 0.09.
3. **Curiosity panel (Fase 3).** A three-tier status strip
   (PRIMARY / EXPLORING / FUTURE) highlights the selected node's honest
   level; two SEE ALSO links retarget per node (mapped per id in
   `buildCuriosityMap`); a `FIELD NOTE 0X / 05` counter sits at the panel
   foot.
4. **Hobbies (Fase 4).** A `CURRENTLY` status row mirrors the last pressed
   chip; a `LAST LOGGED` log keeps at most three rows (newest first,
   HH:MM local time, duplicate presses move the row up). Chips are now a
   wrapper div with a `button.hobby-chip-main` press area plus a separate
   arrow link per hobby: Badminton to `#journey`, Coding to `#work`,
   Gaming and Music to `#offscreen`.
5. **Companion habitat (Fase 5).** Rect-only pixel furniture (folding
   table, chair, potted plant, handless wall clock) rendered via
   `createElementNS` in the `--px-*` palette, positioned in the scene
   margins; a `STATUS` wall board flips `NAP` / `AWAY` with summon and
   dismiss.
6. **Closing (Fase 6).** A `00 to 100` baseline ruler under the name, a
   four-row colophon (TYPE / STACK / BUILD / MAINTAINED), and a rotated
   `ARCHIVE / CLOSED` cap beside the copyright line.
7. **Education + journey (Fase 7).** A `COURSEWORK / ...` mono line in the
   blue education card (data-driven, joined with `·`); each journey phase
   is now an accordion (`button.journey-toggle`, `aria-expanded` +
   `aria-controls`, one item open at a time) revealing a `detail` paragraph
   from the data file.
8. **Small functions (Fase 8).** The hero search keeps the three latest
   successful queries in `localStorage` (`fip-archive-history`) and offers
   them as `RECENT / <query>` suggestions while the input is empty; the
   GitHub section renders a `RECENT REPOSITORIES` list (3 most recently
   updated repos, real `html_url` links) when the API payload arrives.
9. **Opening experience (Fase 9).** `#archive-opening`, hidden in markup;
   JS reveals it once per session (`fip-opening-seen`), animates the label,
   the measure line, 13 ticks, and READY (after 1.2s AND
   `document.fonts.ready`), then lifts the sheet away. Click anywhere,
   Escape, scroll, or the SKIP button leave early (0.3s exit). Reduced
   motion bypasses it entirely; without JavaScript the hero shows directly.

### Honest notes

- `renderRepos` skips pre-V6.6 caches (no `topRepos` yet); the list appears
  on the next cache refresh or first successful fetch.
- The opening overlay is the only animation allowed to delay the hero; all
  other V6.6 additions are static DOM or Category B listeners.

## Accessibility & responsiveness

- Semantic landmarks (`header / main / section / footer`), skip link,
  visible focus states, `aria-*` on interactive controls.
- Contrast pairs were chosen from the token palette (WCAG 2.2 AA targets:
  ≥ 4.5:1 body text, ≥ 3:1 large text). The journey ghost titles use 0.6
  opacity to stay at roughly 4.6:1 on the white card.
- On viewports ≤ 620 px the inline nav hides and the quick menu (dots
  button) becomes the navigation; every section and external link stays
  reachable.
- Tested breakpoints: 1440 / 1024 / 768 / 390 / 320 px. No horizontal
  overflow; hover is never required to read content.

## Dependencies & licensing

| Library      | Version | License     | Notes                                  |
| ------------ | ------- | ----------- | -------------------------------------- |
| GSAP         | 3.12.5  | GSAP "Standard GreenSock" license (free for most uses incl. this non-commercial portfolio) <https://gsap.com/standard-license> | Vendored in `assets/vendor/` |
| ScrollTrigger | 3.12.5 | Same GSAP license | Plugin shipped with GSAP |
| Lenis        | 1.1.13  | MIT <https://github.com/darkroomengineering/lenis> | Vendored in `assets/vendor/` |

**Version check (live):** the npm registry was queried during the previous
redesign; latest stable at that moment were GSAP **3.15.0** and Lenis
**1.3.27**. The vendored pinned versions were kept deliberately: the current
integration is verified working, and the upgrade is deferred until the
official migration notes are reviewed. Upgrading is a documented, isolated
task: replace the three files in `assets/vendor/`, bump the versions in this
table, and re-run the verification checklist.

No other runtime dependencies. Fonts are loaded from Google Fonts
(Space Grotesk, DM Mono) with system-font fallbacks; the site remains
readable offline if fonts fail.

## References actually used

- GSAP ScrollTrigger docs: <https://gsap.com/docs/v3/Plugins/ScrollTrigger/>
- GSAP standard license: <https://gsap.com/standard-license>
- GSAP `quickTo()`: <https://gsap.com/docs/v3/GSAP/gsap.quickTo%28%29/>
- Lenis: <https://github.com/darkroomengineering/lenis> (v1.1.13, MIT)
- Web animation performance guide: <https://web.dev/articles/animations-guide>
- `prefers-reduced-motion`:
  <https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion>
- WCAG 2.2 contrast minimum:
  <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
- GitHub portfolio presentation guidance:
  <https://docs.github.com/en/account-and-profile/tutorials/using-your-github-profile-to-enhance-your-resume>
- Motion patterns studied (implemented originally, not copied):
  <https://github.com/zickrian/motionfolio>,
  <https://github.com/shihabiiuc/animated-portfolio>
- Directional reveal reference (Codrops HoverGrid, MIT, studied not copied):
  <https://github.com/codrops/HoverGrid>
- Credential/awards layout inspiration (editorial grid, studied for the
  Milestones & Credentials section):
  <https://www.shadcn-ui-blocks.com/blocks/portfolio/portfolio-awards-and-recognition/badge-or-icon-grid>,
  <https://www.framer.com/marketplace/templates/miranda/>,
  <https://astro.build/themes/details/astro-portfolio-landing-page-theme/>
- Native `<dialog>` accessibility (credential preview):
  <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog>
- Three.js responsive guidance (read for the WebGL feasibility evaluation,
  decision: no-go): <https://threejs.org/manual/pages/responsive.html>
- AQI research data source:
  <https://opendata.cirebonkota.go.id/dataset/data-kualitas-udara>

## Verification log

See `VERIFICATION.md` for the exact checks that were run and their results.
