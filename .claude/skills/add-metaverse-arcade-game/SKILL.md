---
name: add-metaverse-arcade-game
description: Put a live web game into the Arcade of Alexandria 3D hall (zlisto/arcade_of_alexandria) — give it an arcade cabinet that opens the game, add it to Callimachus the Labubu librarian's chat as an ask-option with a Play button, verify in the browser, and push. Use when the user says add/put/list a game in the arcade, give a game a machine/cabinet, or add a game to the Labubu guide's chat.
---

# Add a game to the Arcade of Alexandria

The Arcade of Alexandria is a Metaverse Web world (React + three.js, Vite): a hall of arcade cabinets where textbooks become games. Games live in **their own repos** and are only linked from here.

- Repo: https://github.com/zlisto/arcade_of_alexandria (local: `C:\Users\trz2\Dropbox\ChatGPTs\arcade_of_alexandria`)
- Live: https://zlisto.github.io/arcade_of_alexandria/ — deployed by `.github/workflows/pages.yml` on every push to `main`.

## Inputs

From the request, or ask once:
- **Game URL** (must already be live). Fetch it to confirm it loads and to read its `<title>`.
- **Title, subject, one-line blurb.**
- **Source book metadata** (title, authors, edition). Required: every game carries its book's attribution (see `AGENTS.md`). If the game's source is in `games/<id>/`, read `book_contents/contents.json` → `source` and `game_concept.json` → `story` for the logline.

## Where things live

| File | What it controls |
| --- | --- |
| `src/games.js` | `GAMES` catalog. One cabinet per entry (auto-placed by `src/layout.js`), and the librarian's searchable catalog with Play buttons. |
| `src/ArcadeMachine.jsx` | Cabinet model. Marquee shows `title`, auto-shrinking the font to fit. Screen glows brighter when `href` is set. |
| `src/guide/facts.js` | Callimachus's fixed lines: `GREETING` and `FACTS` (`{ q, a, gameId? }`). A fact with `gameId` shows a "Play <title> →" button under the answer. |
| `src/guide/GuidePanel.jsx` | The chat panel (renders `**bold**`, `` `code` ``, `- bullets`, bare `https://` links; no single-`*` italics). |
| `src/App.jsx` | `playGame(game)` opens `game.href` in a new tab, or shows "coming soon" if `href` is null. |

## Steps

Keep a task list.

1. **Cabinet.** In `src/games.js`:
   - If a `coming_soon` placeholder for that subject exists (e.g. `organic_chemistry`), **reuse its entry and `id`** so the cabinet keeps its spot and colors: set `title`, `subject`, `blurb`, `authors`, `href`, `status: 'live'`.
   - Otherwise append a new entry with a unique `id`, and a `theme` (`primary`, `secondary`, `accent`, `wood`, short `label`) that differs from the other cabinets. Note `layout.js` has 6 slots per side (12 cabinets); if the hall is full, extend `slots` or tell the user.
   - `authors` format: `'<Author> · <Book title> (<publisher>, <edition>)'`.
2. **Librarian chat.** In `src/guide/facts.js`, add a fact `{ q: 'Tell me about <Title>', gameId: '<id>', a: ... }` after "What courses are here?". The answer: what the game is, which book it's built from (bold, no italics), the premise in 2–3 sentences, and "walk to the <color> **<TITLE>** cabinet and press **E**, or play it right here." Update `GREETING` and the "What courses are here?" answer so they name the playable games.
3. **Build:** `npx vite build` must pass.
4. **Verify in the browser.** Add/keep an `arcade` entry in `.claude/launch.json` (`npm run dev -- --port 5192 --strictPort`) and `preview_start` it. Check console errors. Walking the 3D hall by synthetic input is slow; test the chat by mounting the panel from the dev server's modules instead:
   ```js
   const urls = performance.getEntriesByType('resource').map(e => e.name)
   const f = re => urls.find(n => re.test(n))
   const React = (await import(f(/deps\/react\.js/))).default
   const RD = await import(f(/react-dom_client/)); const createRoot = RD.createRoot || RD.default.createRoot
   const GP = (await import('/src/guide/GuidePanel.jsx')).default
   const d = document.createElement('div'); document.body.appendChild(d)
   createRoot(d).render(React.createElement(GP, { onClose(){}, onPlayGame: g => (window.__played = g.href) }))
   ```
   Click the new ask button, confirm the reply scrolls into view and `.guide-play` sets `window.__played` to the game URL. Screenshot it. To check the cabinet marquee fits, redraw the label on a 256×64 canvas with the same font loop as `marqueeTex` and confirm width ≤ 240.
5. **Commit and push.** The working tree often has unrelated changes (`games/`, `agents/`, `AGENTS.md`, `.claude/launch.json`). Stage **only** the files you changed (`src/games.js`, `src/guide/*`, `src/ArcadeMachine.jsx`/`styles.css` if touched, `README.md`) with explicit paths, commit, `git push origin main`.
6. **Confirm deploy.** `gh run list --repo zlisto/arcade_of_alexandria --limit 1` until the Pages run succeeds, then fetch the live site and check the new bundle contains the game URL.

## Report

Tell the user: which cabinet now holds the game, the new chat option, the commit, and the live link.
