# Level conventions: <game name>

Learned from level 1 (and later levels). This is the game's level grammar; every new level follows it. Edit it when a level teaches something new; don't contradict it silently.

## Shape of a level
- Structure: how many puzzles or stations, how they're arranged, what sits between them (open ground, corridors, a hub…).
- Flow: how the player enters, the order of play, how the level ends (exit, portal, boss, card).
- Length: roughly how many minutes.

## The core mechanic
- How a book idea becomes something the player does: the verbs (build, deform, count, mix, argue, choose…).
- The player's tools or abilities, and their controls.
- How correctness is judged in-game (rules shown, verdicts, failure states).

## Challenge
- Enemies or obstacles: kinds, and how they relate to the subject.
- Difficulty curve: what gets harder from level to level, and how.
- Failure and retry: hearts, checkpoints, knockouts.

## Rewards and progression
- What the player earns per puzzle and per level, and what it pictures.
- What unlocks the exit or the next level.

## Story pattern
- Who speaks, when (opening, per puzzle, closing), and how long the lines are.
- Each character's voice, in a line or two, with an example line.
- The antagonist's role in a level: a threat, a claim, a stake.
- How a level advances the overall arc.

## Look, camera and sound
- Art style, palette, the scenery kit to reuse, detail level.
- Camera: walking, fights and puzzles.
- Music per level and stingers.

## Ships with (checklist)
- [ ] intro movie / lesson
- [ ] dialogue file
- [ ] level code (screen, scene, layout data)
- [ ] rewards and exit
- [ ] end card with book citation
- [ ] screen chain + level select entries (including per-section jumps)
- [ ] dev hooks (jump to section, finish all, teleport)
- [ ] new assets in the established style

## Where things live
- Shared engine files (don't fork): …
- Per-level files to copy and adapt: …
- How to wire a new level: …
- How to build, run and open a level in the browser: …
