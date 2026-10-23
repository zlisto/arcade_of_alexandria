# Arcade of Alexandria

**Live:** https://zlisto.github.io/arcade_of_alexandria/

A Metaverse Web world (`mvw/0.1`): a hall of arcade cabinets where **textbooks become video games**. Talk to **Callimachus**, an ancient Alexandrian librarian Labubu, for a fixed Q&A and a **searchable game catalog**. Aim at a cabinet and click / **E** to play.

Games live in **separate repos**. This world only lists them and links out. Playable now: **Winding World** (Algebraic Topology) and **Legend of Valence** (Organic Chemistry, https://zlisto.github.io/legend-of-valence/). The rest are “coming soon.”

To add a game, use the `add-metaverse-arcade-game` skill in `.claude/skills/`.

## Dev

```bash
npm install
npm run dev
```

Open http://localhost:5182/

## Add a game

1. Build and host the game in its own repository.
2. Add an entry to [`src/games.js`](src/games.js) with `title`, `blurb`, `subject`, and `href`.
3. Deploy this world — cabinets and the librarian’s search pick it up automatically.

See [`AGENTS.md`](AGENTS.md) for the long-term pipeline that turns PDFs into games.

## Metaverse

- Manifest: `public/.well-known/metaverse.json`
- Portal back to [Metaverse Square](https://zlisto.github.io/hub_world/)
- Registry id: `arcade_of_alexandria`
