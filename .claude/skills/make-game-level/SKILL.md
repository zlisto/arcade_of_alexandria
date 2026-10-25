---
name: make-game-level
description: Build the next level of an Arcade of Alexandria textbook game from its existing level 1, the game concept, the book's extracted contents and figures, and the game's art assets, then put it through critics on four lenses (teaching, play, presentation, narrative), fix their findings, and confirm the fixes with one round-2 verifier plus re-runs of only the lenses that need them. Use when the user says make/build/add the next level, a new level, or level N of a game under games/.
---

# Make a game level

You turn one section of a textbook into one new playable level of an existing game, then make it good through a critic-and-fix round and a lighter verification round. The game already has a working level 1. Its code, concept and art define how this game works, so learn the game from them; never impose another game's design.

**Inputs to confirm** (ask only if you can't work them out): the game folder (`games/<game>/`) and which level to build (its number and the book section(s) it covers, from the game concept's level list).

All files you write for planning and review go under `games/<game>/design/`. Paths below are relative to `games/<game>/`.

## Step 1 · Study the game (read-only)

Read these before writing anything:

1. **The existing level code.** Start from level 1, and also read the most recent level if there is one. Read its screen, scene, layout data, dialogue/stages file, movie and lesson files, how it is wired into the screen chain and the level select, and its dev/test hooks. Work out how a level is built: what is shared engine and what is per-level.
2. **The game concept.** Read `game_concept.json` and any story bible (e.g. `design/STORY.md`) for the premise, characters, their voices, the antagonist's arc, the world and level list, the art style and the mechanics.
3. **The source material.** In `book_contents/contents.json`, find the target section: its definitions, theorems, worked examples and exercises, with their numbers and page numbers. Look at its figures in `book_contents/figures/`. These are the truth the level must teach.
4. **The art assets.** List what is in `assets/` (or `public/assets/`). Note which images exist for the characters, enemies, items and locations this level needs, and what's missing.

Then write or update **`design/conventions.md`**: the game's level grammar, learned from level 1. Use `references/conventions-template.md`. If the file already exists, reuse it, and only add what this level teaches you. Every later decision follows it.

## Step 2 · Design the level

Write **`design/levels/<level-id>.md`** using `references/level-design-template.md`. It covers:

- the section's key ideas, with book citations (number and page);
- for each idea, what the player must be able to *do*, and the mechanic that makes that the gameplay (in this game's grammar);
- the layout, enemies and difficulty step (harder than the last level, the same way the game already escalates);
- the rewards;
- the story beat, and a dialogue outline in each character's voice;
- the assets needed;
- the ship checklist from the conventions.

Stay faithful to the book. Flag anything that goes beyond the text.

## Step 3 · Build it

- **Copy the established pattern.** Reuse the shared engine and copy-and-adapt level 1's per-level pieces. Don't fork shared engine code; if a shared change is truly needed, keep it minimal and note it in the fix log.
- **Ship everything the conventions list,** typically:
  - an intro movie and/or lesson;
  - dialogue;
  - the level itself;
  - its reward or exit;
  - an end card with the book citation;
  - its place in the screen chain and the level select;
  - dev hooks (jump to a section, finish all puzzles, teleport) so critics can test fast.
- **New art:** if the game's assets come from an image model, generate new images in the established style. Use the existing images as style references, and spell out exact geometry and shape in the prompt. Then build in-game versions the way the game already does. Keep API keys out of code and logs.
- **Self-test before any critic:** build, open the level in the browser, play the first puzzle by hand, check the console for errors, and confirm the chain into and out of the level.

## Step 4 · Critics, round 1

Run one critic per lens, **one at a time** (not in parallel), each with a fresh subagent and the brief in `references/critic-brief.md`. Four lenses, each with a required checklist so a merged lens doesn't go shallow:

1. **Teaching** (always on its own: checking every claim against the book is the core job).
   - Does doing the mechanic *teach* the idea, or could a quiz replace it?
   - Can the player succeed without understanding: mashing a button, matching colours, reading the answer off the UI?
   - Is every claim accurate against the book, with section and page? This covers dialogue, lesson cards, feedback, notes, end cards and collectible facts.
2. **Play** (gameplay + fun).
   - Probe for soft-locks, respawns, checkpoints and save/continue, controls, camera and collisions.
   - Look for exploits: can the boss or a puzzle be beaten without the intended skill?
   - Check the difficulty step from the previous level.
   - Note which moments satisfy or surprise, and where it drags. Compare the new item or verb with the last level's.
3. **Presentation** (clarity + graphics).
   - Can a first-timer tell what to do, where to go and which control does what?
   - Are hints, prompts and labels present and readable?
   - Framing: heads in frame; nothing under the dialogue box, HUD or minimap; no camera inside props.
   - Is the art detailed, readable at play distance and consistent with the concept art?
   - Take screenshots of every new room, character and boss state.
4. **Narrative** (story + dialogue).
   - Does the beat follow the arc and the conventions?
   - Is the antagonist present, with clear stakes and continuity from the previous level and into the next?
   - Is it shown, not narrated?
   - Is every line in the character's voice, short (about 25 words max), punchy and free of tutorial-speak?
   - Can toasts be read in their display time (about 3–4 words per second)?
   - Give old → new rewrites.

Each critic plays the level, edits nothing, and saves its report to **`design/critiques/<level-id>/round1-<lens>.md`**: issues ranked, each with a concrete fix (file and change), plus what works.

## Step 5 · Fix, round 1

Work through the reports **one critic at a time**, in the lens order above. Several lenses often flag the same root cause; fix it once and cross-reference it. For each report:
- implement its fixes;
- rebuild;
- spot-check the change in the browser;
- append to **`design/critiques/<level-id>/fixes-round1.md`**: what you changed for each issue, or why you declined it.

When two critics conflict, follow the conventions, the book and the user's earlier requests, and note the call.

## Step 6 · Round 2: one verifier, then only the lenses that need it

1. **Verifier (always).** Run one fresh subagent with the brief's round-2 section. It reads every round-1 report and `fixes-round1.md`, checks each issue in play or in code, and marks it PASS, PARTIAL or FAIL with evidence. It also notes any new problem the fixes obviously caused. It saves **`round2-verify.md`**, including a short list of which lenses need a full re-run.
2. **Re-run a lens only if:**
   - the verifier marked any of its issues PARTIAL or FAIL; or
   - the round-1 fixes reworked that lens's ground: a new or changed mechanic means Teaching and Play, a new room, camera or model means Presentation, new story beats means Narrative.

   **Teaching always re-runs if any book-facing text or mechanic changed.** Run the re-runs one at a time with the same lens brief, plus "verify your round-1 issues first". Save them as `round2-<lens>.md`.
3. Skip lenses that came back clean with no reworked ground, and note the skip in the fix log.

## Step 7 · Fix, round 2

Fix the verifier's open items and the re-run findings one report at a time, logging them in `fixes-round2.md`. Do a final build and a run through the whole level. Then report to the user in a few lines:
- what the level teaches;
- what each critic round changed;
- anything left open.

Do **not** commit or push unless the user asks.

## Rules that hold for every game

- **Teach, don't decorate.** If the level could be replaced by a quiz, redesign the mechanic.
- **Keep attribution.** Every level cites its book section. Don't copy the book's text into the game beyond short quotes.
- **Framing (movies and cameras):**
  - every head and face fully in frame;
  - nothing important under the caption box or the top HUD;
  - a closing shot finishes before any title card;
  - no camera inside props.
- **Light machine load:**
  - one worker at a time, one browser tab;
  - about 10–15 screenshots per test;
  - no repeated headless batches;
  - stop background jobs and the dev server when done;
  - mute game audio first thing in every browser playtest.
- **Show, don't narrate:** important story events happen on screen.
- **Ship only runnable code:** no concept art, bibles or design files in the public deploy.
