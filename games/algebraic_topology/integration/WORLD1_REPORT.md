# World 1 · Bouquet Bastion — integration report (Phase 2)

Integrator pass over levels 1-1 … 1-10 (castle and bonus levels are **not** built yet: Phase 3).
Commit: see `git log -1` on the branch (local only, not pushed).

## Status at a glance

| Check | Result |
|---|---|
| `npx vite build` | ✓ clean (849 modules; only the usual >500 kB chunk warning) |
| Node math tests (`src/levels/w1/*.test.*`, 10 files) | ✓ all exit 0 |
| Browser smoke: `?screen=movie1-K`, `lesson1-K`, `level1-K` for K = 1…10 (30 screens) | ✓ each mounts a canvas, **0 console/page errors** (after the fixes below) |
| Browser smoke: every section of every level via `&shrine=<section>` (40 sections) | ✓ each mounts, 0 errors, ~2.6 s of live play with enemies |
| Chain movie → lesson → level → next movie (spot-checked 1-1, 1-10) | ✓ |
| Full scripted playtests (every section completed, wrong action, knockout) | ✗ **not run by the integrator** (see gaps) |
| Movie / lesson frame review at start, middle, end, 800 px | ✗ not done |

## Integration work done

* **`src/App.jsx`**: imports for all ten levels and all movies/lessons; `w1Movie` / `w1Lesson` wrapper factories; `SCREENS` ids `movie1-K`, `lesson1-K`, `level1-K`; `NEXT` chain `castle0`/`outroc0` → `movie1-1` → `lesson1-1` → `level1-1` → `movie1-2` → … → `level1-10` (no next yet: falls back to the title until the castle exists).
* **`src/screens/TitleScreen.jsx`**: one `World 1 · Level K — <place>` debug group per level (intro movie, lesson, level from the start, four `startAt` sections).
* **`src/audio/chip.js`** (append-only block `World 1 · Bouquet Bastion`): themes `startBastionMusic` (1-1 & 1-2), `startHelixMusic` (1-3), `startBasinMusic` (1-4), `startPushMusic` (1-5), `startFreeWordMusic` (1-6), `startGlueWorksMusic` (1-7), `startSheetwaterMusic` (1-8), `startSheetCanonMusic` (1-9), `startDeckRoundMusic` (1-10); sfx `sfxLedger, sfxRoot, sfxLoopClose, sfxFloor, sfxGate, sfxSeize, sfxProject, sfxCancel, sfxStackSwap, sfxDeckShift`. The notes used an outdated `blipAt(buf, …)` signature, so every theme was rewritten against the real API (`blipAt(t, freq, opts)`, `padAt`, `hatAt`, `startLoop`).
* **`src/characters/Spawn.jsx`** (append-only): `HedgeSpawn, RetractorSpawn, WhirlSpawn, ProjectorImpSpawn, PatrolSpawn, LiftlingSpawn, StackSentinelSpawn, DeckGuardSpawn`.
* **`src/levels/w0/ReefGame.jsx`**: `ENEMY` rows `hedge, retractor, whirl, projector_imp, patrol, liftling, stack_sentinel, deck_guard`; per-enemy flags `harmless`, `speed: 0` (no knockback), `linked` (one lash kills every linked copy); hedge rooting; **new generic stage hooks** so levels need no private forks: `stage.canHit(e)`, `stage.onRefused(e)`, `stage.onEnemyHit(e)` (return `'keep'` to keep the target standing), `stage.enemyAI(e, dt, s)`; `tRef` is now optional.
* **`src/levels/w0/worldTools.jsx`**: `cord` added to `ACTION_TOOLS` (cord clicks now reach `onAction`).
* **`src/styles.css`**: ten level-prefixed append-only blocks, deduplicated.
* **`src/screens/terms.js`**: 20 new terms appended (the notes assumed an object; it is an array). Everyday words (`lift`, `sheet`, `cover`, `relation`) were left plain on purpose, as the file's policy says.
* **`design/world-1.json`**: lesson videos for 1-1 … 1-7, 1-9, 1-10 added (1-8's already existed); `python scripts/apply_design.py design/world-1.json` run (83 videos in both `videos.json` copies, `game_concept.json` updated).
* Continue wiring: each level's clear card goes to the next level's intro movie; 1-10 says "Finish ▸ Title (the castle comes next)".

### World 0 files touched (minimal, as allowed)

* `src/screens/LevelCastle.jsx`: accepts `onNext`, shows **Continue ▸ World 1** on the final card (Back to title stays).
* `src/App.jsx` `OutroCastle0`: `onDone`/`onSkip` → `onNext` (→ `movie1-1`) instead of back to title.
* `src/levels/w0/ReefGame.jsx`, `worldTools.jsx`, `src/screens/LevelMovie.jsx` (see above; `LevelMovie` now also passes `tRef` to its `Overlay`). No World 0 level screen, scene, stage or movie was changed.

## Conflicts resolved before/while merging

| Conflict | Resolution |
|---|---|
| `covers.js` and tests: 1-8 vs 1-9 | Already a single merged module exporting both levels' functions; both test files pass. |
| Duplicate `ENEMY` ids (`patrol`, `liftling`, …) | One row per type; `patrol` hp comes from word length (`enemyHp`), liftling hp 2. |
| Two `startSheetwaterMusic` (1-8 and 1-9) | 1-9's renamed `startSheetCanonMusic`; every level imports its own real theme (the temporary `startForge/Mirror/Tide` aliases are gone). |
| Music call signatures | Rewritten to the real `chip.js` API (see above). |
| `TERMS` shape | Notes said object, file is an array → appended strings. |
| Screen ids | Normalised to `movie1-K` / `lesson1-K` / `level1-K`. |
| CSS class prefixes (`w1-1-`, `level-1-2-`, `w13-`, `lvl15-`, …) | Kept (already level-unique); identical blocks deduplicated. |
| 1-9 sentinel and 1-6 patrol had dead/unwinnable code | 1-9: lashing the Stack sentinel swaps the start vertex via `stage.onEnemyHit` (sentinel stays standing, swaps back on the next lash, only on its own deck). 1-6: patrol now walks its word along the deck's tracks via `stage.enemyAI`, so "lash in reverse word order" is playable. 1-8 liftlings only take hits on the right sheet (`canHit`). 1-10 deck guards slide to the site centre when aligned. |

## Real bugs found by the browser smoke test (all fixed)

The level agents could not run each other's code in the merged app, and several screens crashed on mount:

* 1-1: `EndpointGardensScene` used a stale `ReefGame` API (`walkable`/`enemies`/`checkpoint` props → crash); the Garden Gate site was passed to `SiteReef` without tiles; route threads double-applied the site offset and read a 2-D `toWorld` result as 3-D (NaN geometry); Emmy's script had no `pos`; `useExitTrigger` was called with the wrong argument order (so the exit never worked). All fixed.
* 1-3: `FollowCamera` got no `stateRef`; `useExitTrigger` called with an object (wrong signature).
* 1-5: `GridLift` dereferenced an unmounted ref; `ReefGame` crashed when no `tRef` was passed (now optional).
* 1-6: `FreeWordScene` never received `current`; Emmy script returned the raw `emmyAt` instead of `{pos, …}`; lesson overlay used R3F `useFrame` outside the Canvas.
* 1-7: `LevelMap` called with a private prop set; the rectangular press hall gave `r = undefined` → NaN platform.
* 1-9: `SheetMusicScene` called `ReefGame` with an old prop set and read `site.shape.def` (undefined).
* 1-10: `site.shape.add` (undefined) in `Level1_10` and `DeckHallsScene` → used `site.def.add`.
* Lessons: raw `$…$` / LaTeX in HTML overlays rewritten to Unicode; 1-8 lesson missing `THREE` import and a `data-lift1` prop that R3F tried to parse as a nested path; 1-9 lesson rendered an HTML overlay inside the Canvas; 1-1 lesson Gyroid script had no `pos` and its homotopy line never redrew; 1-4 movie/lesson Gyroid had no `script`; `LevelMovie` now passes `tRef` to overlays; 1-6 stage file had a stray `]` (syntax error; the first build failed on it).

## What is playable from Level select

Level select (title → "Level select") lists **World 1 · Level 1 … 10**, each with: intro movie, lesson, the level from the start, and its four sections (`startAt`). From World 0's castle outro / final card, **Continue** leads into World 1's first movie, and each level's clear card leads on to the next level's movie. 1-10 ends at the title. No castle or bonus level (1-B1, 1-B2) exists yet.

## Per-level Definition of done (GAME_DESIGN §7)

Legend: ✓ verified by the integrator · ◐ not verified here (level agent's claim only / needs a human) · ✗ known gap.

| Level | Build, no console errors (level, movie, lesson) | Every section completes (+ wrong action + knockout) | Movie/lesson frames | Emmy advice, map NEXT, zoom | Math pink / terms gold / Hatcher cite | Own theme | Own new enemy | Level-select `startAt` | Exit walk-out + iris |
|---|---|---|---|---|---|---|---|---|---|
| 1-1 Fixed Endpoints | ✓ | ◐ (sections load and run; not scripted to completion) | ◐ | ◐ | ◐ | ✓ Bastion | ✓ hedge | ✓ | ✓ (exit trigger fixed) |
| 1-2 Loop de Loop | ✓ | ◐ | ◐ | ◐ | ◐ | ✗ shares Bastion with 1-1 | ✗ none (existing sphere/torus) | ✓ | ✓ |
| 1-3 Winding Road | ✓ | ◐ | ◐ | ◐ | ◐ | ✓ Helix | ✗ none (no `winder` enemy; sphere only) | ✓ | ✓ (exit trigger fixed) |
| 1-4 No Way Out | ✓ | ◐ | ◐ | ◐ | ◐ | ✓ Basin | ✓ retractor, whirl | ✓ | ✓ |
| 1-5 Push It Forward | ✓ | ◐ | ◐ | ◐ | ◐ | ✓ Push | ✓ projector imp (hazard only: "hijacked projector" never activates) | ✓ | ✓ |
| 1-6 Free Word Play | ✓ | ◐ (patrol AI added; untested to completion) | ◐ | ◐ | ◐ | ✓ FreeWord | ✓ patrol | ✓ | ✓ |
| 1-7 Glue Job | ✓ | ◐ | ◐ | ◐ | ◐ | ✓ GlueWorks | ◐ uses patrol/unglue | ✓ | ✓ |
| 1-8 Under Cover | ✓ | ◐ | ◐ | ◐ | ◐ | ✓ Sheetwater | ✓ liftling | ✓ | ✓ |
| 1-9 Sheet Music | ✓ | ◐ (sentinel swap new; untested to completion) | ◐ | ◐ | ◐ | ✓ SheetCanon | ✓ stack sentinel (+ liftling) | ✓ | ✓ |
| 1-10 Deck the Halls | ✓ | ◐ | ◐ | ◐ | ◐ | ✓ DeckRound | ✓ deck guard | ✓ | ✓ (ends at title until the castle) |

## Known gaps / follow-ups

1. **No scripted playtests.** The integrator verified that every screen and section mounts and runs without errors, plus the math tests, but did not complete each section, trigger refusals, or knock Gyroid out. This needs a human pass or a dedicated playtest agent (use `window.__game`, `window.__advance`, `window.__lvl1_K`).
2. **Movie and lesson frames** (start/middle/end of each beat, 800 px width, nothing under the caption box) were not reviewed.
3. 1-2 and 1-3 have no new enemy; 1-2 shares 1-1's theme. 1-5's hijacked projector never activates. No `world-1` intro movie component exists (the first World 1 screen is `movie1-1`).
4. Rectangular decks (1-10 `quotient`) are drawn as a circle of radius 5; cosmetic.
5. Lesson overlays use plain Unicode math (no `MathText` pink/gold styling) — the §7 math/term styling item is unchecked for lessons.
6. Dev-only quirk: `?t=` in the URL applies to every chained movie/lesson screen, not just the first.
7. `package.json` has no `test` script; tests run with `node src/levels/w1/<file>`. Bundle is ~2 MB (one chunk).
8. Phase 3 (not started): castle *Commutator's Keep* (`castle1`, so `level1-10` should then continue to it), bonus levels 1-B1 / 1-B2, World 1 map scenery.
