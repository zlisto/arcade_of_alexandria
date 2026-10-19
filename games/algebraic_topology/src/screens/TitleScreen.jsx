import { useState } from 'react'

/** Level select: every movie, lesson and level, and each level's sections. Shown everywhere, including the live site. */
const DEBUG_ENTRIES = [
  { group: 'Opening — Intro movie', items: [{ label: 'Intro movie', screen: 'intro' }] },
  {
    group: 'World 0 · Level 1 — Retract Reef',
    items: [
      { label: 'Level 0-1 (from the start)', screen: 'level1' },
      { label: '↳ The Walkway', screen: 'level1', opts: { startAt: 'the_walkway' } },
      { label: '↳ The Fork', screen: 'level1', opts: { startAt: 'the_fork' } },
      { label: '↳ The O', screen: 'level1', opts: { startAt: 'the_o' } },
      { label: '↳ Twin Lagoons', screen: 'level1', opts: { startAt: 'twin_lagoons' } },
      { label: '↳ Null’s Mirage', screen: 'level1', opts: { startAt: 'nulls_mirage' } },
    ],
  },
  {
    group: 'World 0 · Level 2 — Tidewarp Flats',
    items: [
      { label: 'Intro movie', screen: 'movie02' },
      { label: 'Lesson: How the Tide Works', screen: 'lesson02' },
      { label: 'Level 0-2 (from the start)', screen: 'level2' },
      { label: '↳ Shrine 1 · Tide Line', screen: 'level2', opts: { startAt: 'tide_line' } },
      { label: '↳ Shrine 2 · Hold the Posts', screen: 'level2', opts: { startAt: 'hold_posts' } },
      { label: '↳ Shrine 3 · The Pools', screen: 'level2', opts: { startAt: 'the_pools' } },
      { label: '↳ Shrine 4 · Null’s Snap', screen: 'level2', opts: { startAt: 'nulls_snap' } },
    ],
  },
  {
    group: 'World 0 · Level 3 — Mirror Shoals',
    items: [
      { label: 'Intro movie', screen: 'movie03' },
      { label: 'Lesson: Same Shape', screen: 'lesson03' },
      { label: 'Level 0-3 (from the start)', screen: 'level3' },
      { label: '↳ Solid Shoal', screen: 'level3', opts: { startAt: 'solid_shoal' } },
      { label: '↳ Ring Reef', screen: 'level3', opts: { startAt: 'ring_reef' } },
      { label: '↳ Twin Mirror', screen: 'level3', opts: { startAt: 'twin_mirror' } },
      { label: '↳ Dumbbell', screen: 'level3', opts: { startAt: 'dumbbell' } },
      { label: '↳ The Mirror Gate', screen: 'level3', opts: { startAt: 'mirror_gate' } },
    ],
  },
  {
    group: 'World 0 · Level 4 — Skeleton Foundry',
    items: [
      { label: 'Intro movie', screen: 'movie04' },
      { label: 'Lesson: Built from Cells', screen: 'lesson04' },
      { label: 'Level 0-4 (from the start)', screen: 'level4' },
      { label: '↳ The Sphere Press', screen: 'level4', opts: { startAt: 'sphere_press' } },
      { label: '↳ Twin Loops', screen: 'level4', opts: { startAt: 'twin_loops' } },
      { label: '↳ One Loop', screen: 'level4', opts: { startAt: 'one_loop' } },
      { label: '↳ The Blueprint Wall', screen: 'level4', opts: { startAt: 'blueprint_wall' } },
    ],
  },
  {
    group: 'World 0 · Bonus — Cylinder Works',
    items: [
      { label: 'Intro movie', screen: 'movie0b' },
      { label: 'Lesson: One Cell at a Time', screen: 'lesson0b' },
      { label: 'Bonus 0-B (from the start)', screen: 'level0b' },
      { label: '↳ Floor 3 · Wrong Order', screen: 'level0b', opts: { startAt: '2' } },
      { label: '↳ Floor 4 · Full Cylinder', screen: 'level0b', opts: { startAt: '3' } },
    ],
  },
  {
    group: 'World 0 · Level 5 — Cone Zone',
    items: [
      { label: 'Intro movie', screen: 'movie05' },
      { label: 'Lesson: New Spaces from Old', screen: 'lesson05' },
      { label: 'Level 0-5 (from the start)', screen: 'level5' },
      { label: '↳ The Cone Works', screen: 'level5', opts: { startAt: 'cone_works' } },
      { label: '↳ The Suspension Works', screen: 'level5', opts: { startAt: 'suspension_works' } },
      { label: '↳ Wedge & Product', screen: 'level5', opts: { startAt: 'wedge_product' } },
      { label: '↳ The Recipe Board', screen: 'level5', opts: { startAt: 'recipe_board' } },
    ],
  },
  {
    group: 'World 0 · Level 6 — Timber Yard',
    items: [
      { label: 'Intro movie', screen: 'movie06' },
      { label: 'Lesson: Felling Trees', screen: 'lesson06' },
      { label: 'Level 0-6 (from the start)', screen: 'level6' },
      { label: '↳ The Sapling Deck', screen: 'level6', opts: { startAt: 'one_edge' } },
      { label: '↳ The Thicket', screen: 'level6', opts: { startAt: 'spanning_tree' } },
      { label: '↳ The Wrong Cut', screen: 'level6', opts: { startAt: 'wrong_cut' } },
      { label: '↳ The Census Deck', screen: 'level6', opts: { startAt: 'census' } },
    ],
  },
  {
    group: 'World 0 · Castle — The Hollow Throne',
    items: [
      { label: 'Intro movie', screen: 'moviec0' },
      { label: 'Castle (from the start)', screen: 'castle0' },
      { label: '↳ Trial 2 · Simplifications', screen: 'castle0', opts: { startAt: '1' } },
      { label: '↳ Trial 3 · Same shape?', screen: 'castle0', opts: { startAt: '2' } },
      { label: '↳ The ring (and the outro)', screen: 'castle0', opts: { startAt: '3' } },
      { label: 'Outro movie', screen: 'outroc0' },
    ],
  },
  // World 1 · Bouquet Bastion: one group per level (intro movie, lesson, from the start, then each section via startAt)
  ...[
    [1, 'Endpoint Gardens', 'Fixed Endpoints', [['Open Lawn', 'open_lawn'], ['Hedge Beds', 'hedges'], ['Pace Garden', 'faster'], ['Triple Gate', 'chained']]],
    [2, 'Basepoint Beacon', 'Loop de Loop', [['Home Base', 'home_base'], ['There and Back', 'there_back'], ['Brackets Deck', 'brackets'], ['Beacon B', 'second_beacon']]],
    [3, 'Winding Road', 'Winding Road', [['The Helix', 'the_helix'], ['Sliding', 'sliding'], ['Unwind', 'unwind'], ['Number Line', 'number_line']]],
    [4, 'Brouwer’s Basin', 'No Way Out', [['The Retractor', 'retractor'], ['The Still Point', 'still_point'], ['Roots', 'roots'], ['Antipodes', 'antipodes']]],
    [5, 'Torus Terraces', 'Push It Forward', [['The Projector', 'projector_deck'], ['Retract Check', 'retract_deck'], ['Two Roads', 'two_roads'], ['Shadows', 'shadows_deck']]],
    [6, 'Free-Word Forge', 'Free Word Play', [['Laps Are Letters', 'laps_letters'], ['Cancel', 'cancel_deck'], ['Order Matters', 'order_deck'], ['The Patrol', 'patrol_yard']]],
    [7, 'Glue Works', 'Glue Job', [['Glue a Disk', 'circle_press'], ['The Torus', 'torus_press'], ['Half Turn', 'half_turn'], ['Two Pieces', 'two_pieces']]],
    [8, 'Sheetwater Viaduct', 'Under Cover', [['Two Floors', 'two_floors'], ['Build a Cover', 'build_cover'], ['Rescue', 'rescue'], ['Order, Proved', 'order_proved']]],
    [9, 'Sheet Stacks', 'Sheet Music', [['To Order', 'to_order'], ['Moving the Start', 'moving_start'], ['The Endless Tree', 'endless_tree'], ['Plane over Torus', 'plane_torus']]],
    [10, 'Deck Halls', 'Deck the Halls', [['Shift the Deck', 'shift_deck'], ['Lopsided', 'lopsided'], ['Divide by a Group', 'quotient'], ['Antipodal Hall', 'antipodal']]],
  ].map(([k, place, title, sections]) => ({
    group: `World 1 · Level ${k} — ${place}`,
    items: [
      { label: `Intro movie: ${title}`, screen: `movie1-${k}` },
      { label: 'Lesson', screen: `lesson1-${k}` },
      { label: `Level 1-${k} (from the start)`, screen: `level1-${k}` },
      ...sections.map(([label, startAt]) => ({ label: `↳ ${label}`, screen: `level1-${k}`, opts: { startAt } })),
    ],
  })),
]
const SHOW_DEBUG = true // the level select is part of the game now, not just a dev tool

/** Worlds → levels → entries: group the flat list by its "World N · …" prefix. */
const TREE = (() => {
  const out = []
  for (const g of DEBUG_ENTRIES) {
    const m = g.group.match(/^(World \d+) · /)
    if (!m) {
      out.push(g)
      continue
    }
    let w = out.find((n) => n.world === m[1])
    if (!w) out.push((w = { world: m[1], levels: [] }))
    w.levels.push(g)
  }
  return out
})()

/** One level: a single entry is just a button; several fold away under the level's name. */
function LevelGroup({ g, label, onGo }) {
  const item = (it) => (
    <button key={it.label} type="button" className="level-select-item" onClick={() => onGo(it.screen, it.opts)}>
      {it.label}
    </button>
  )
  if (g.items.length === 1)
    return (
      <button type="button" className="level-select-item ls-solo" onClick={() => onGo(g.items[0].screen, g.items[0].opts)}>
        {label}
      </button>
    )
  return (
    <details className="ls-level">
      <summary>{label}</summary>
      <div className="ls-items">{g.items.map(item)}</div>
    </details>
  )
}

function LevelSelect({ onGo, onClose }) {
  return (
    <div className="level-select" role="dialog" aria-label="Level select">
      <div className="level-select-card">
        <div className="level-select-head">
          <h2>Level select</h2>
          <button type="button" className="btn ghost small" onClick={onClose}>
            ✕
          </button>
        </div>
        {TREE.map((node) =>
          node.world ? (
            <details key={node.world} className="ls-world">
              <summary>{node.world}</summary>
              {node.levels.map((g) => (
                <LevelGroup key={g.group} g={g} label={g.group.replace(/^World \d+ · /, '')} onGo={onGo} />
              ))}
            </details>
          ) : (
            <LevelGroup key={node.group} g={node} label={node.group} onGo={onGo} />
          ),
        )}
      </div>
    </div>
  )
}

export default function TitleScreen({ concept, onNewGame, onGo }) {
  const story = concept?.story || {}
  const title = story.title || 'Winding World'
  const tagline = story.tagline || "Shape can change. Topology can't."
  const cover = `${import.meta.env.BASE_URL}assets/cover.jpg` // 117 KB (the 2 MB PNG took seconds to appear)
  const [picking, setPicking] = useState(false)

  return (
    <div className="title-screen">
      {/* square cover art: blurred copy fills the screen, the full image sits on top uncropped */}
      <div className="title-backdrop" style={{ backgroundImage: `url(${cover})` }} />
      <div className="title-art" style={{ backgroundImage: `url(${cover})` }} />
      <div className="title-card">
        <h1>{title}</h1>
        <p className="tagline">{tagline}</p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={onNewGame}>
            New Game
          </button>
          <button type="button" className="btn" disabled title="Coming soon">
            Continue
          </button>
          {SHOW_DEBUG && (
            <button type="button" className="btn ghost" onClick={() => setPicking(true)} title="Debug: jump to any level, movie or lesson">
              Level select
            </button>
          )}
        </div>
      </div>
      {picking && <LevelSelect onGo={onGo} onClose={() => setPicking(false)} />}
    </div>
  )
}
