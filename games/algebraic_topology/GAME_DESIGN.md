# Winding World: Game Design and Build Conventions

*Shape can change. Topology can't.*

Winding World is a 3D action-puzzle game that teaches Allen Hatcher's *Algebraic Topology*. There is one world per chapter (Chapter 0 to Chapter 4), and each level teaches one key idea through a mechanic that *is* that idea. **World 0 is fully built.** This document is the rulebook for building Worlds 1 to 4 so they look, sound, play and teach like World 0. Read it all before writing code. When in doubt, open the World 0 file named in the relevant section and copy its pattern.

- Live: https://zlisto.github.io/game_algebraic_topology/ (Title → **Level select** reaches every level, section, movie and lesson)
- Source book: Allen Hatcher, *Algebraic Topology*: https://pi.math.cornell.edu/~hatcher/AT/ATpage.html. The PDF is in `books/` and is copyrighted; never redistribute its text.

---

## 1. Story, cast and world arcs

**Premise.** The Winding World is soft. Islands stretch and causeways bend, but what the world truly keeps is its *holes*. **Count Null**, wearing the Null Crown, "simplifies" the provinces, collapsing ring → ball → point. **Gyroid**, a courier, survives the first collapse with a lash and a spool and sets out with the engineer **Emmy Boundary** to undo the damage. Every world opens with Null exploiting what Gyroid's current tools *cannot see*, and ends with Gyroid gaining the sharper tool.

| World | Name | Hatcher | Null's claim the tools can't yet refute | Castle |
|---|---|---|---|---|
| 0 | Retract Reef | Ch. 0: homotopy, CW complexes, operations | "a ring *is* a point" (World 0 can't prove otherwise; χ's invariance is unproven) | The Hollow Throne ✅ |
| 1 | Bouquet Bastion | Ch. 1: π₁, van Kampen, covers | "the sphere is a point: every loop shrinks" | The Commutator's Keep |
| 2 | Chain Delta | Ch. 2: homology | "the torus is S¹ ∨ S¹ ∨ S²: same homology" | The Retractor |
| 3 | Cup Product Gardens | Ch. 3: cohomology, cup product, duality | counterfeit spaces that only rings can expose | The Counterfeit Station |
| 4 | Postnikov Spire | Ch. 4: higher homotopy | "S³ → S² must be trivial" | The Null Crown |

**Cast.** Each portrait is a sprite sheet in `public/assets/characters/*.png`, cropped by `PORTRAIT_CROP` in each screen.
- **Gyroid**: the hero, a teal courier with a red scarf. Short, eager lines ("Bend, don't break. Got it.").
- **Emmy Boundary**: the teacher and ally. Warm, precise, plain words first, then the term. She is the voice of almost every explanation.
- **Count Null**: the villain. Smug, theatrical, never quite lying. His lines tempt the player toward the illegal move.
- **The Commutator**: World 1's boss (portrait exists).

The full per-level designs for Worlds 1 to 4 already exist in `design/world-N.json`: site, story, objective, mechanics, math check, stages (teach / practice / twist / master), enemies, tools, music, visuals and movie scripts. **Start every level from its design entry.**

---

## 2. Tech stack and running it

- React 18 + Vite 5, `@react-three/fiber` 8, `@react-three/drei` 9, three 0.169 and `@react-three/postprocessing` (Bloom + Vignette in every scene). There's no other UI library; styles live in `src/styles.css`.
- Dev server: `.claude/launch.json` has `winding-world` on port **5180** (and `winding-world-2` on 5181 for a second agent). Base path: `/game_algebraic_topology/`.
- Build: `npx vite build` writes to `docs/` (GitHub Pages serves `docs/`). Always build before claiming done.
- URL params for testing: `?screen=<id>` jumps to a screen, `&shrine=<sectionId>` starts a level at a later section (passed as `startAt`), and `&t=<sec>&pause` freezes a movie or lesson at a time.
- Dev hooks (DEV builds only):
  - `window.__game`: `state` (x, z, hearts…), `enemies`, `click(x, z)`, `killSite(id)`.
  - `window.__advance(n)`: steps frames, needed when the browser pane is hidden.
  - `window.__lvlN`: each level's state and helpers.
  - Never return huge objects from a JS probe.

### Data pipeline
`design/world-N.json` → `python scripts/apply_design.py design/world-N.json` merges level designs into `game_concept.json` (+ `public/data/game_concept.json`) and **upserts video entries by id into `videos.json`** (root, imported by `LevelMovie`) and `public/data/videos.json`. **Edit captions and scenes in the design file, then run apply_design.** Never hand-edit `videos.json`.

### Deploy (game code only; this is a hard rule)
Push to `zlisto/game_algebraic_topology` **only when the user asks**. Push only what's needed to run:
- `src/`, `index.html`, `package*.json`, `vite.config.js`, `videos.json`;
- `public/` and `docs/`, **minus** `assets/levels/`, `assets/locations/`, `assets/items/`, `assets/characters/enemies/`, `assets/cover.prev.png`, `bible.html`, `data/contents.json` and `data/videos.json`.

Never push `design/`, `scripts/`, `GAME_DESIGN.md`, `game_design.json`, the root `game_concept.json`, concept art or the bible. Sync into a clean clone, grep the file list for those names before committing, end commit messages with the co-author line, then check that the live `index-*.js` hash matches the build.

---

## 3. Where things live

```
src/
  App.jsx                 SCREENS map, NEXT chain, Movie/Lesson wrapper components
  screens/
    TitleScreen.jsx       title + LEVEL SELECT (DEBUG_ENTRIES → folding World ▸ Level ▸ entries)
    LevelNN.jsx           one screen per level (Level01..06, Level0B, LevelCastle)
    LevelMovie.jsx        plays any videos.json entry (movies AND lessons)
    MathText.jsx, terms.js  dialogue text: pink math, gold vocabulary
    LevelMap.jsx          bottom-left map (YOU + pulsing NEXT/EXIT)
    exitTrigger.js        walk-out exit + the exit whoosh
    captionHold.js        movie captions hold until clicked
  levels/w0/
    stagesNN.js           ALL words for a level: OPENING, STATIONS (arrive/early/goals/done),
                          HINTS, DEFINITION card, emmyAdvice()
    <Name>Scene.jsx       the level's 3D scene (environment + props + ReefGame + camera)
    <mechanic>.js         pure math engine for the mechanic (ribbon.js, cells.js, spaces.js,
                          graphs.js, hep.js…) — testable in node, no React
    ReefGame.jsx          shared engine: Gyroid, movement, tools, enemies, waves, hearts
    OverworldScene.jsx    FollowCamera (+ frameRef zoom), DevAdvance
  movies/                 <Name>Movie.jsx (intro), <Name>Lesson.jsx (+ <Name>LessonOverlay)
  world/                  layouts (<level>.json), sites.js, Seascape.jsx, Dressing.jsx
  characters/             Gyroid, Emmy, CountNull, Spawn.jsx (every enemy model)
  audio/chip.js           all music (startXMusic) and sfx (sfxX), synthesized with WebAudio
```
**For World N, put new level code in `src/levels/wN/` and screens in `src/screens/wN/`** (or `LevelN_K.jsx`) so parallel agents never collide on file names.

---

## 4. Anatomy of a level (the recipe)

Every level ships **all** of these. Copy the closest World 0 level; Level04/05/06 are the most complete.

1. **Intro movie**: `<Name>Movie.jsx` plus its `level-N-K-intro` entry in videos.json, about 30 to 36 seconds. Story beat: Null does something, Emmy frames the idea, a title card plays at the end.
2. **Lesson movie**: `<Name>Lesson.jsx` + `<Name>LessonOverlay` + `level-N-K-lesson`, about 50 to 72 seconds. It teaches the idea *slowly*, with a 3D demo on the left and a synced 2D diagram card on the right. It **must end with a beat where Gyroid demonstrates the controls on the actual mechanic** (see 0-4's furnace demo and 0-6's tree marking). The lesson is replayable in the level via the **"? How it works"** button.
3. **The level**: 3 to 5 **sections** (stations/decks/works), following the design's stage beats **teach → practice → twist → master**, and ending in a walk-out exit.
4. **Its own music theme** and its own sfx.
5. **A new enemy** with its own model in `Spawn.jsx` and a behavior that attacks the level's idea, plus World 0 enemies reused.
6. **Level select entries** in `TitleScreen.jsx`: intro movie, lesson, "from the start", and "↳ <section>" for each section (needs `startAt` support).
7. **Routes** in `App.jsx` (`movieNK → lessonNK → levelNK` in `NEXT`), and the previous level's clear card **Continue ▸** pointing here.
8. **The clear card**: a Hatcher definition paraphrase, a citation with the page or proposition, a "Read the book" link and "Next: …".
9. **Talk to Emmy** (E) with live advice, a **level map**, **zoom-on-section**, and FF7 **dialogue** with pink math.
10. **Self-playtest** of every section through the dev hooks, plus screenshots of movie frames, before reporting done.

### The goal machine (inside `LevelNN.jsx`)
- `STATION_ORDER`, `done{}`, `goalIdx{}` and `met{}`. `current` is the first section that isn't done; `goal` is `STATIONS[current].goals[goalIdx]`.
- Goal types are per level (`point`, `edges`, `disk`, `make`, `fell`, `guard`, `ask`, `chi`, `bridge`…). Keep them **declarative in `stagesNN.js`**; the screen interprets them.
- `advanceGoal(station, lines)` moves on. When the next goal needs setup after dialogue (open a question, reset a press, build a bridge), set `afterTalk.current = fn` and `say(lines, 'after')`.
- Phases are `'play'` and `'talk:<next>'`. `<next>` is `play`, `after` (run afterTalk) or `ask` (reopen the question).
- **Questions** (`ask` / `chi` goals) must have an effect that **reopens them whenever they're due** and nobody is talking. Otherwise a knockout during the preceding lines soft-locks the level.
- **Arrival**: walking onto the current section the first time plays `arrive`; a not-yet section plays `early` once.
- **Knockout** (hearts → 0): hearts reset, `knockouts++` remounts `ReefGame` (`gameKey`), enemies come back from the `game` memo, and a `HINTS.knockout` line plays. Progress is kept.
- **Waves**: `spawnRef.current(defs)` adds enemies mid-play; `spawnRef.current.remove(test)` takes them away. A "guard"-style goal must wait until the wave has *landed* (seen > 0) before checking that it's clear.
- **Failures are never silent.** Every refused click gets a `flash()` toast or, the first time, an Emmy explanation (a `seen{}` set gates "first time" lines). Wrong answers explain *why*, then let the player retry.

### Layout JSON (`src/world/<level>.json`)
`sites[]` each have `{id, name, stage:'station', pos:[x,z], shape:{add:[{type:'circle',r} | {type:'rect',x0,x1,z0,z1}]}, emmy:[dx,dz], enemies:[[type,dx,dz]], wave?:[…]}` plus level-specific data (tracks, graphs, machine/pedestals…). Also `start`, `causeways[{a,b}]`, `causewayWidth`, `bounds`, and `exit:{gate,a,b}`. Use `buildSites(layout)` and `makeSiteWalkable(layout, SITES, extraSegs)`; the exit segment is added once the exit opens. Sections are roughly 11 to 15 units apart, with radius about 5 to 5.6.

---

## 5. Conventions by system

### 5.1 Camera and zoom
- `FollowCamera` gives a fixed-yaw three-quarter overhead view that follows Gyroid.
- While the player works a section, set `frameRef.current = { center:[x + ~1, z + 0.3], size, follow: 0.12 }`. That frames the whole section, offset slightly left of the right-hand panel, and locked mostly on the section. Sizes: about 8 for a radius-5 deck, 8.6 to 8.8 for radius 5.4 to 5.6, and about 12.6 for a 17-wide rect.
- **Rule: as close as possible while the entire puzzle stays on screen.** Check on a narrow window (800 px wide) too.

### 5.2 Tools ("weapons") and keys
`ReefGame` owns them. Tool buttons show bottom-centre with key hints.
| Key | Tool | What it is | Hook |
|---|---|---|---|
| 1 | **Lash** | amber whip; hits spawn in an arc | built in |
| 2 | **Spool** | grabs, drags and hooks ribbons; in 0-6 marks edges | `onStrokeStart/Move/End` (return `false` to make it click-only) |
| 3 / Z / X / wheel | **Tide Glass** | scrubs homotopy time `t` | 0-2 |
| 2 or 3 | **Cell-Smith** | a **forge hammer**: every click turns Gyroid toward the click, swings, throws sparks and clangs (`sfxHammer`) | `onAction(gx, gz, clickX, clickZ)`; the level decides what it does |
Click handling must be **forgiving**: pick the nearest valid target within a tolerance, and if the player is too far, toast "Walk closer to …". Q cycles tools. New tools from the design (Suspension Sling, Covering Coil…) should follow the same pattern: a prop model in `ReefGame`, a key, a level-side hook.

### 5.3 Enemies (`ENEMY` table in `ReefGame.jsx`, models in `characters/Spawn.jsx`)
| type | hp | does |
|---|---|---|
| sphere | 1 | wanders and chases |
| torus | 2 | slower, tougher |
| snapper | 1 | snips ribbons |
| mirror | 1 | 0-3 |
| unglue | 1 | tears forged edges / unmarks |
| coner | 2 | hovers and **beams** for 2.6 s, then plugs a target (lash it to cancel) |
| biter | 2 | perches and **chews** for 2.2 s, then eats a petal |
| shard | 1 | fast diver |
| beacon | 1 | static and harmless; the castle's "verdict" target, killed with the Lash |
- An enemy that attacks the level's object uses the **`ribbonApi`** contract: `target(e)` returns a world point to go to (or null), and `snip(x, z)` applies the damage and returns true. "Beaming" enemies (coner, biter) channel first, so the player can react. A damaged object is shown violet and can be repaired, with a toast saying how.
- Enemies report alive counts **by site** (`stage.bySite`); a site's `enemies` count drives the HUD and wave checks.
- **Every level introduces one new enemy** whose behavior is the level's illegal move (e.g. Coners cone a ring, which plugs its hole). Two lashes for the new one is typical. Models are low-poly obsidian + violet emissive (`obsidian()`, `glow()` helpers). No per-enemy point lights.

### 5.4 Dialogue: FF7-style boxes (all levels and movies)
- Bottom-centre box: portrait, speaker name (small caps, teal), text. Lines **type out** at 45 cps (30 in movies) with speaker "blips" (`textBlip`).
- Typing uses `setShown(n => Math.max(n, i))`. **Space, Enter or the button skips to the full line, and the typing loop then stops, along with its blips** (`shownNow` ref).
- Untyped text is laid out invisibly (`<span class="untyped">`), and `.dialog p` has a 3-line min-height, so **the box never resizes while typing**. The ▶▶ / Next ▾ / OK button has a **fixed width**, and the movie ▼ arrow is absolutely positioned in a reserved corner, so nothing ever reflows.
- Music ducks while a line is up (`duckMusic`), and `dialogOpen()` plays the open chime.
- Write lines with `E()`, `G()`, `N()` helpers in `stagesNN.js`. Keep them short, about one or two sentences. Emmy explains plainly first, then names the term.
- **Text rendering goes through `MathText`:**
  - **Math is bold pink** (`#ff8ad8`, math font). Wrap math explicitly in `$…$`, e.g. `$a b a⁻¹ b⁻¹$`, `$rel A$`, `$F(s, t)$`. Unmarked text is also auto-detected when it has math symbols (χ, ×, ∨, ⁻¹, superscripts, =). **Mark single-letter loop names and anything the detector can't see by hand.**
  - **Vocabulary is bold gold** (`terms.js`: cone, suspension, wedge, torus, homotopy, cell complex, spanning tree, …). Add each world's new terms to `TERMS`. Everyday words (point, edge, loop, disk, circle, tree) stay plain.
  - **Use both names** when the game has a nickname for a math object: "nodes (platforms)", "edges (walkways)".
- Lesson cards and rule panels use `.lesson-math` / `.rule-math`, which are also pink. SVG diagram math text uses `PINK` with the `MATH` font style.

### 5.5 Talk to Emmy (help system)
Emmy walks to the current section's `emmy` spot. When Gyroid is within 2.4 units, a 💬 bubble (`EmmyBubble`) shows over her and a **"Talk to Emmy (E)"** button appears. **E** calls `emmyAdviceNN(state)` from `stagesNN.js`, which returns lines specific to *exactly* where the player is: wrong section → where to go; mid-goal → the next concrete action with live counts ("the tree reaches 3 of 5 nodes"); enemies → lash them; damaged objects → how to repair. The hint bar says "lost? walk up to Emmy and press E".

### 5.6 HUD and layout of the screen
- **Top-left**: ◂ Title · ♪ on/off · "? How it works", then the kicker ("WORLD 0 · LEVEL 5 · CONE ZONE"), the title, hearts and objective ("Works 2/4 · next: …"), and "here" (the current site + spawn count).
- **Top-right**: the **rules panel** (`.rules-panel.forge-panel.works-panel`) while at a section: blueprint/goal, live counts (cells, χ, tree reach), and a one-line `stepText` for the current tool.
- **Bottom-left**: the **level map** (`LevelMap`): sections and causeways, finished sections gold, a pulsing **NEXT** ring (→ **EXIT** at the end), and YOU with a dashed line to it. Hidden while dialogue or a question is open.
- **Bottom-centre**: tool buttons + hint line, toast above them, dialogue box above that.
- **Exit**: the level opens a gate or causeway; walking through it (`useExitTrigger`) plays `sfxExit` ("zzzooosh"), the screen **irises shut to black** with a glint, then the clear card fades in (`.win-banner.exit`). If the way out has to appear, it **builds itself** with `sfxZoot` ("zzzooot"); never make the player hunt for an unmarked click target to leave.

### 5.7 Movies and lessons (`LevelMovie` + videos.json)
- A video entry has `{id, title, story_start, story_end, pace:[[0,null,rate]], scenes[], captions[{t,end,speaker,portrait,text}], title_card:{t,end}}`. Captions **hold the movie until clicked** (`captionHold.makeGate`).
- A scene component is `({ tRef })`. Everything is driven by story time `t` and must be deterministic in `t` (seekable with `?t=…&pause`).
- **Camera**: a `SHOTS` table of `[t0, t1, [pos, look]from, [pos, look]to]` lerped with smoothstep. **Blocking**: `keyed([t, x, z, rotY], t)` for characters. Discrete state changes (marked edges, felled or not) go through a `useStage(tRef, fn)` hook that re-renders only when the derived state changes.
- **Framing rules** (each one has bitten us):
  - The bottom third of the screen is covered by the caption box.
  - The right third holds the lesson card.
  - So keep the subject in the **upper-left two-thirds**, keep **both endpoints/posts** of anything in frame, and don't let the gantry or press hide the object.
  - Check on a narrow viewport.
- Lessons use the same timeline as their overlay. Card titles are gold, math rows pink, notes soft blue. The last beats are a **controls demo** and then a **summary card** (`lesson-steps`) ending with a short Gyroid line.
- `musicCues` can switch themes mid-movie (e.g. Null's boss music while he's on screen).
- **Checking frames**: open `?screen=movieNK&t=<sec>&pause`. Screenshots from a hidden browser pane can be stale, so step with `__advance` before trusting a frame.

### 5.8 Music and sound (`audio/chip.js`, all synthesized, no audio files)
- A theme is a `scheduleX(step, t, buf)` step sequencer at 16th notes, started with `startLoop(scheduleX, STEP)`: kick/hat/bass/pad/lead built from `blipAt`, `hatAt` and `padAt`. Export `startXMusic()`.
- **Each level gets its own key, tempo and character tied to its idea.**
  - Existing themes:
    - **Reef**: the main theme.
    - **Tide**: flowing.
    - **Mirror**: glassy.
    - **Forge**: 100 bpm C minor, anvil hits.
    - **Cone**: 116 bpm F, arpeggios that climb and fold back.
    - **Timber**: 104 bpm G mixolydian, log drums and a reedy lead.
    - **Music box**: 72 bpm C minor.
  - **Null's motif** (D–E♭–D–A, boss music) plays whenever he appears.
- Sfx are short and named after the action (`sfxFell`, `sfxPlug`, `sfxHammer`, `sfxZoot`, `sfxExit`…). Right, wrong and refused always have distinct sounds (`sfxCorrect`, `sfxWrong`, `sfxRefuse`). Mute is shared via localStorage (`readMuted`/`setMuted`). **Don't stack sounds**: one action, one sound.

### 5.9 Visual style
- Night-time, luminous, low-poly with bloom. Gold and amber mean "the player's work" (ribbons, marked edges, forged cells); **violet means Null** (spawn, plugs, damage); teal is Gyroid and UI accents; pink is math.
- **Backgrounds are never plain** (the user asked for detail):
  - Any sea uses `world/Seascape.jsx`: animated translucent water, seabed, coral, kelp, fish, anemones, lanterns.
  - Set dressing comes from `world/Dressing.jsx`: `Clouds`, `Gear`, `FloatingRocks`, `LavaChannels`, `Clutter`, `PlateFloor`.
  - Each level gets 2 to 3 signature details (boats, lamp posts, candles, gears).
  - **Keep decoration off the play paths** so it can never be mistaken for a walkway or a graph edge.
- Don't add shapes that look like the math objects but aren't (e.g. we removed a gold "root ring" because it looked like a loop).
- Shared look: wooden or basalt decks with a gold rim that pulses on the current section.
- Character scale 0.7 (`S`); Emmy uses `Emmy` with a `script()` returning `{pos, rotY, walk, gesture, talk, bow}`.

---

## 6. Teaching rules (the point of the game)

- **The mechanic is the math.** If you could skin the level as a quiz, it's wrong. In World 0:
  - **0-1:** drag a reef onto its spine (deformation retraction).
  - **0-2:** scrub a homotopy's time t.
  - **0-4:** walk loops to forge 1-cells and spell attaching words.
  - **0-5:** feed spaces through cone, suspension and product machines.
  - **0-6:** mark a spanning tree and fell it into a bouquet.
- **The illegal move is the enemy.** Null and his spawn perform the move the idea forbids (tearing, coning a hole, collapsing a loop), and the player stops it.
- **Every section follows teach → practice → twist → master** (the design file names them). The twist usually shows *why* a rule exists by letting the player try the wrong thing and get refused, with an explanation.
- **Prediction before confirmation** where possible: e.g. 0-6 Census asks which tangles match *before* you fell them.
- **Faithful to Hatcher, honest about gaps.**
  - Cite chapter, page, example or proposition on the clear card and in lessons.
  - Never claim more than the player has seen proved. If the game uses a fact proved later, say so ("that χ can't change is Theorem 2.44, Chapter 2"; "that a circle isn't a point needs π₁").
  - Null's victories at each castle *are* these gaps.
  - Get notation right: e.g. path homotopy rel A means `F(a, t) = F(a, 0)` for parameters a ∈ A, not `fₜ(a) = a`.
- **Every level stays book-agnostic in its engine.** Math lives in a pure module (`graphs.js`, `spaces.js`…); words live in `stagesNN.js`; geometry lives in the layout JSON.

---

## 7. Building a world in parallel (multi-agent plan)

The levels of a world are independent enough to build at the same time. **Contention is only in a few shared files**, so split ownership like this.

**Each level agent owns** (new files only, named by level so nothing collides):
`src/levels/wN/stagesN_K.js`, `src/levels/wN/<Name>Scene.jsx`, `src/levels/wN/<mechanic>.js`, `src/world/<level>.json`, `src/screens/wN/LevelN_K.jsx`, `src/movies/wN/<Name>Movie.jsx`, `src/movies/wN/<Name>Lesson.jsx`.

**Shared files.** A level agent must **not** edit these directly. Instead it writes its additions into `integration/N_K.md`: exact code blocks plus where they go.
| File | What a level contributes |
|---|---|
| `src/App.jsx` | Movie/Lesson wrappers, `SCREENS` ids (`movieN-K`, `lessonN-K`, `levelN-K`), `NEXT` links |
| `src/screens/TitleScreen.jsx` | the level's `DEBUG_ENTRIES` group |
| `src/audio/chip.js` | `startXMusic` theme + new `sfx*` (append-only blocks) |
| `src/levels/w0/ReefGame.jsx` | new `ENEMY` entry, render branch, behavior hook; new tool prop if any |
| `src/characters/Spawn.jsx` | the new enemy's model (append-only) |
| `src/styles.css` | any new classes (append-only, prefixed with the level id) |
| `src/screens/terms.js` | new vocabulary words |
| `design/world-N.json` | caption and scene edits for the level's videos (then `apply_design.py`) |

An **integrator agent** (or the lead) merges the integration notes in order, builds, and does the cross-level wiring: Continue buttons, the castle, the world's map scenery. Append-only blocks in `chip.js` and `Spawn.jsx` rarely conflict. If two agents must share `ReefGame.jsx`, only the integrator edits it.

**Ports**: give each concurrently-running agent its own dev server (5180, 5181, …; add more entries to `.claude/launch.json`), and test with `?screen=levelN-K` directly.

### Prompt template for a level agent
> Build World N, Level K "<title>" of Winding World in `games/algebraic_topology`. Read `GAME_DESIGN.md` fully, then the level's entry in `design/world-N.json` (site, mechanics, stages, enemies, music, visuals, movie). Copy the structure of `src/screens/Level06.jsx` + `src/levels/w0/stages06.js` + `TimberScene.jsx` + `movies/TimberMovie.jsx` / `TimberLesson.jsx`. Deliver everything in section 4's recipe. Own only the files listed for your level in section 7; put every shared-file change in `integration/N_K.md` as exact code. Write the math engine as a pure module and test it with node. Write intro and lesson captions into the design file's `videos` for your level ids. Playtest every section with `window.__game` / `__advance` and check movie frames with `&t=…&pause`, including at 800 px width. Report: what you built, what you tested, what you couldn't test, and anything in your mechanic that goes beyond Hatcher (flag it).

### Definition of done (per level)
- [ ] `npx vite build` passes; no console errors on the level, the movie or the lesson.
- [ ] Every section completes in a scripted playtest, including at least one wrong action (refusal + explanation) and one knockout.
- [ ] Intro movie and lesson: frames checked at the start, middle and end of each beat; nothing important cut off or under the caption box.
- [ ] Talk-to-Emmy advice is correct in every goal state; the map's NEXT points right; the zoom frames each section.
- [ ] Math pink, terms gold, both names used; clear card cites Hatcher; unproven facts flagged.
- [ ] Own music theme, own new enemy, level select entries with `startAt`, exit via walk-out + iris.

---

## 8. Status

- **World 0: complete.** 0-1 to 0-6, bonus 0-B (Cylinder Works, the homotopy extension property), castle *The Hollow Throne* (three trials + the ring), each with its movies and lessons.
- **Worlds 1 to 4: designed, not built.** The full specs and movie scripts are in `design/world-1.json` … `design/world-4.json`. Build order per world: levels in parallel (section 7) → castle → bonus levels.
- `game_concept.json` and `game_design.json` hold the full concept, cast and attribution notes; `field_guide` and `level_order` there list every level.
