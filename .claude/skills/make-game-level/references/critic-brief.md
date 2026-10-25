# Critic brief template

Write a **shared brief file** once per level, at `games/<game>/design/critiques/<id>/brief.md`. It holds everything below except the lens. Spawn each critic as a fresh subagent whose prompt says:
- "read and follow brief.md";
- which lens (or the verifier) it is;
- the lens checklist;
- the report filename.

Run critics **one at a time**.

---

## Shared brief (brief.md)

You are a critic for level <id> of "<game>", a game that teaches <book title> by <author>, <chapter/sections>. **Do NOT edit any game files.** Your only output file is your report.

**Read first:**
- `games/<game>/design/conventions.md`: the game's level grammar, and the bar this level must meet.
- `games/<game>/design/levels/<id>.md`: what the level is meant to teach and do.
- The book section in `games/<game>/book_contents/contents.json`, and its figures, for <section refs>.
- The level's code files: <list the scene, data, panel, actor and rules files>.

**How to test:**
- Open <URL>. Use the existing browser tab; don't open more.
- **Mute the game audio first.** **Reload once before testing**, because stale hot-reload state causes bogus console errors.
- How to reach the level: <level select entries>. Dev hooks: <jump-to-section, finish-all, teleport, boss state…>.
- **Engine quirks:** <e.g. the pane only renders frames while visible or screenshotted; how to dismiss dialogue from JS; key-chord limits of the browser tool>.
- **Play by hand:** at least the first puzzle, one challenge and the new item. Use the hooks to check the rest and the ending.
- **Light load:** about 10–15 screenshots, no builds, no repeated headless runs. Note console errors, including whether they come from a stale module.

**Report** at `design/critiques/<id>/<round>-<lens>.md`, under 500 words:
1. **Issues, most important first.** Each gives what is wrong, where (place or file:line), and a concrete fix (file and change).
2. **What works**, and should be kept.

Then reply with a 2–3 line summary.

---

## The four lenses

Paste the lens name and its checklist into the subagent prompt. Each critic must cover every checklist item, and judge only its lens.

- **Teaching.**
  - Does doing the mechanic build real understanding, or is it trivia with a skin? Could a quiz replace it?
  - Can the player succeed without understanding: mashing, colour-matching, reading the answer off the UI, feedback that states the answer?
  - Check **every** claim (dialogue, lesson cards, feedback, toasts, notes, collectible facts, end card) against the book, with section and page. Flag overclaims, errors and missing hypotheses.
- **Play** (gameplay + fun).
  - Soft-locks: carrying or holding state through death or leaving, gates, one-way gaps, the boss retry.
  - Respawns, checkpoints, Continue, and save state after reload.
  - Controls, camera and collisions.
  - **Exploits:** can the boss or any puzzle be beaten without the intended skill? Try standing still, standing at the edges, and button-mashing.
  - The difficulty step from the previous level, and the fairness of every enemy (telegraphs, dodgeability).
  - The best moments of surprise or mastery, and where it drags. How the new item or verb compares with the last one.
  - Buildable improvements, ranked by payoff and effort.
- **Presentation** (clarity + graphics).
  - Can a first-timer tell what to do, where to go, which control does what, and why it matters?
  - Missing hints, misleading or unreadable labels, prompts that never appear.
  - Framing: heads and faces in frame; nothing under the dialogue box, HUD or minimap; floating labels not overwhelming; no camera inside props or walls.
  - Detail and readability at play distance, lighting, and consistency with the concept art in `assets/`.
  - Screenshot every new room, character, enemy, item and boss state.
- **Narrative** (story + dialogue).
  - Does the beat follow the arc and the conventions?
  - Is the antagonist present, with clear stakes and continuity from the previous level and into the next?
  - Are important events shown on screen, not narrated? Does each supporting character have a want?
  - Is every line in voice, about 25 words max, punchy and free of tutorial-speak?
  - Can toasts be read in their display time (about 3–4 words per second)?
  - Quote old → new rewrites for every weak line, keeping facts accurate.

---

## Round 2: the verifier

One fresh subagent replaces a full second pass. Prompt:

> You are the round-2 **verifier** for level <id>. Read and follow brief.md. Then read **every** `round1-*.md` report and `fixes-round1.md`. Check each round-1 issue in play or in the code, and mark it **PASS / PARTIAL / FAIL**, with one line of evidence (what you saw, or file:line). Also list any new problem the fixes obviously caused. Don't hunt broadly; the lens re-runs do that. End with **"Lenses to re-run"**: each lens with a PARTIAL or FAIL, or whose ground the fixes reworked (new or changed mechanics → Teaching and Play; new rooms, camera or models → Presentation; new story beats or lines → Narrative), with a one-line reason. Save it to `design/critiques/<id>/round2-verify.md`, under 600 words, as a table plus that list.

**Lens re-runs:** use the same lens prompt and checklist, plus: "Round 2: first read your round-1 report, fixes-round1.md and round2-verify.md. Don't re-verify what the verifier passed; focus on new problems, especially ones the fixes caused." Save each as `round2-<lens>.md`.
