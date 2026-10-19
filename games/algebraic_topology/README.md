# Winding World

Playable scaffold for the algebraic-topology teaching game.

**Live:** https://zlisto.github.io/game_algebraic_topology/

## Flow

1. **Title** — cover + New Game  
2. **Intro** — Count Null’s first collapse (Skip available)  
3. **Level 1** — Retract Reef: hold walkways to deformation-retract onto spines  

## Dev

```bash
npm install
npm run dev
```

GitHub Pages uses `base: /game_algebraic_topology/` — local preview:

```bash
npm run build
npm run preview
```

## Data

- `game_concept.json` / `contents.json` — agent pipeline artifacts (repo root)  
- `public/data/` — copies served to the game  
- `public/assets/` — cover, characters, items  
- Optional concept viewer: `public/bible.html`

## Deploy (GitHub Pages)

Pages serves the **`docs/`** folder (Vite build output), not the source `index.html`.

```bash
npm run build
git add docs
git commit -m "Update Pages build"
git push
```

Repo settings → Pages → Deploy from branch → `main` / `/docs`.
