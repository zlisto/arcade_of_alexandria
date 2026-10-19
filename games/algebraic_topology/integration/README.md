# Winding World — integration notes

Level agents **do not** edit shared files directly. Put exact patches here as `integration/<world>-<level>.md` (e.g. `integration/1-1.md`).

## Shared files (integrator merges in order)

| File | Level contributions |
|---|---|
| `src/App.jsx` | Movie/Lesson wrappers, `SCREENS`, `NEXT` |
| `src/screens/TitleScreen.jsx` | `DEBUG_ENTRIES` group |
| `src/audio/chip.js` | `startXMusic` + `sfx*` (append-only) |
| `src/characters/Spawn.jsx` | New enemy models (append-only) |
| `src/styles.css` | Level-prefixed classes (append-only) |
| `src/screens/terms.js` | New vocabulary |
| `design/world-N.json` | Video captions/scenes → `apply_design.py` |

**ReefGame / tools:** Worlds 1–4 weapon props and hooks live in `src/levels/w0/worldTools.jsx` and are wired in `ReefGame.jsx`. Level agents only pass `tool` and callbacks (`onAction`, `onStrokeStart`/`Move`/`End`, `onTrackMove`).

## Enemy types (add model + `ENEMY` row via integrator)

World 1 introduces many one-off enemies; register each in `integration/*.md` with `ENEMY` stats and `Spawn.jsx` model. Recurring types to plan for:

| type id (proposed) | worlds | notes |
|---|---|---|
| `hedge` | 1 | sprouts hedge beds |
| `winder` | 1, 2 | coil on pillar; unwind before lash |
| `retractor` | 1, 2, castle | tugs toward rim / sphere |
| `whirl` | 1 | scrambles arrow fields |
| `projector_imp` | 1 | hijacks projector |
| `patrol` | 1+ | ribbon word guards |
| `liftling` | 1, 3 | sheet-bound |
| `stack_sentinel` | 1 | cover start vertex |
| `deck_guard` | 1 | copied on every sheet |

World 0 enemies (`sphere`, `torus`, `snapper`, …) remain unchanged.

## Tool ids (`ReefGame` `tool` prop)

See `WORLD_TOOLS` in `src/levels/w0/worldTools.jsx`. Inventory keys in design JSON (`winding_cord`, `sheet_compass`, …) map to these short ids.
