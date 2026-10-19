/**
 * World 0 · Level 4 "Some Assembly Required" — the Skeleton Foundry. Each forge station
 * runs a list of goals: forge the point (0-cell), forge edges (1-cells, loops at the
 * point) by walking tracks, then press disks (2-cells) along words walked on the edges.
 * Hatcher, Algebraic Topology, Chapter 0, pp. 5–8 (cell complexes; the torus, the
 * projective plane and the sphere as cell complexes; Euler characteristic).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['sphere_press', 'twin_loops', 'one_loop', 'blueprint_wall']

export const OPENING = [
  E('The Assembly Hall. Every place in the world was put together here, one cell at a time.'),
  E('Hold the Cell-Smith (2) and come to the first press, just ahead.'),
]

/**
 * Goal types:
 *   point                 — click the hub with the Cell-Smith: a 0-cell
 *   edges n               — walk tracks out and back until there are n edges (1-cells)
 *   disk word expect      — walk `word` along the edges, click the hub: a 2-cell on that loop
 *                           ('' = the disk's whole rim crushed to the point)
 *   reset                 — clear the station's cells back to just the point
 *   chi                   — answer the gate's question: what is χ?
 */
export const STATIONS = {
  sphere_press: {
    blueprint: 'The sphere, twice',
    arrive: [
      E('My oldest press. Let’s start with the simplest place there is that still has a hollow: a sphere.'),
      E('Step on the furnace in the middle and click with the Cell-Smith. That forges a point — a 0-cell.'),
    ],
    goals: [
      { type: 'point', done: [E('One point. On its own, that’s the whole space: a 0-cell. Now glue a disk to it.'), E('Click the furnace again: the press stamps a disk and crushes its whole rim onto the point.')] },
      {
        type: 'disk',
        word: '',
        expect: 'sphere',
        done: [
          E('The rim went to the point, so the disk closed up like a drawstring bag: a sphere. One 0-cell, one 2-cell.'),
          E('Watch the counter on your gauntlet: $χ = points − edges + disks = 1 − 0 + 1 = 2$.'),
          E('Now the same sphere, built differently. Clear the press…'),
        ],
      },
      { type: 'reset', done: [E('…Walk the track out from the furnace and back. Going round it forges an edge — a 1-cell whose two ends are glued to the point.')] },
      { type: 'edges', n: 1, done: [E('An edge, $a$. Both its ends are the point, so it’s a loop — a circle. The arrow shows the way you walked it.'), E('Now walk $a$ again, the same way, and click the furnace: the press glues a disk along $a$.')] },
      { type: 'disk', word: 'a', expect: 'disk', done: [E('A disk glued along the circle: a bowl, a hemisphere. Do it once more — walk $a$, click the furnace.')] },
      {
        type: 'disk',
        word: 'a',
        expect: 'sphere',
        done: [
          E('Two hemispheres on one equator: the sphere again. Count: 1 point − 1 edge + 2 disks = 2.'),
          G('Different cells, same sphere, same χ.'),
          E('That’s the point of χ: build the same place any way you like and the count comes out the same. (Proving that takes the tools of World 2.) On to Twin Loops — west.'),
        ],
      },
    ],
    early: [E('The Sphere Press first — just ahead.')],
  },
  twin_loops: {
    blueprint: 'The torus',
    arrive: [
      E('Twin Loops. Two tracks, one furnace. This is where we forge a torus.'),
      E('Point first, then walk each track out and back: two edges, $a$ and $b$.'),
    ],
    goals: [
      { type: 'point', done: [] },
      {
        type: 'edges',
        n: 2,
        done: [
          E('Two loops at one point: a figure-eight. That’s the torus’s 1-skeleton.'),
          E('Now the disk. Its rim gets glued along $a b a⁻¹ b⁻¹$ — walk $a$ the way its arrow points, then $b$, then $a$ against its arrow, then $b$ against its arrow. Then click the furnace.'),
        ],
      },
      {
        type: 'disk',
        word: 'a b a- b-',
        expect: 'torus',
        done: [
          E('Watch the press fold it: the square’s a-edges meet and roll it into a tube, then the b-edges meet and bend the tube into a ring.'),
          E('A torus: 1 point, 2 edges, 1 disk. χ = 1 − 2 + 1 = 0.'),
          E('East now, to One Loop — where the arrows start to matter.'),
        ],
      },
    ],
    early: [E('Twin Loops is next — west of the Sphere Press. Not yet.')],
  },
  one_loop: {
    blueprint: 'Follow the arrows',
    arrive: [E('One Loop. One point, one edge — and two very different disks you can glue to it.'), E('Point, then walk the track for edge $a$.')],
    goals: [
      { type: 'point', done: [] },
      { type: 'edges', n: 1, done: [E('First blueprint: a disk along $a$, walked once. Walk it, click the furnace.')] },
      {
        type: 'disk',
        word: 'a',
        expect: 'disk',
        done: [E('The disk just fills the loop: you’ve made a disk. Nothing new — it shrinks to a point.'), E('Second blueprint: glue a disk along $a$ twice, the same way both times: $a a$. Clear the press first…')],
      },
      { type: 'reset', keepEdges: true, done: [E('…now walk $a$, then $a$ again, same direction. Click the furnace.')] },
      {
        type: 'disk',
        word: 'a a',
        expect: 'rp2',
        done: [
          E('Look at it fold. The rim wraps twice around the loop — and there’s no way to do that in our space without the disk passing through itself.'),
          E('That’s the projective plane. It exists perfectly well as a cell complex; it just can’t sit in three dimensions without crossing itself.'),
          G('Same loop, same disk — only the arrows changed.'),
          E('χ = 1 − 1 + 1 = 1. North now, to the Blueprint Wall.'),
        ],
      },
    ],
    early: [E('One Loop comes after Twin Loops.')],
  },
  blueprint_wall: {
    blueprint: 'The Klein bottle',
    arrive: [
      E('The Blueprint Wall — every place the Foundry ever made, written as cells.'),
      E('This one: one point, edges $a$ and $b$, and a disk along $a b a⁻¹ b$. Like the torus — but the last $b$ goes forwards.'),
      N('Forge all you like, Boundary. My Unglues will pull it apart faster.'),
    ],
    goals: [
      { type: 'point', done: [] },
      { type: 'edges', n: 2, done: [E('Two edges. Now walk $a$, $b$, $a$ backwards, $b$ — and click the furnace.')], wave: true },
      {
        type: 'disk',
        word: 'a b a- b',
        expect: 'klein',
        done: [
          E('Torus: a b a⁻¹ b⁻¹. Flip one arrow — a b a⁻¹ b — and the tube’s ends meet the wrong way round. It has to pass through itself: a Klein bottle.'),
          E('The gate to the Cone Zone has one more lock.'),
        ],
      },
      {
        type: 'chi',
        answer: 0,
        question: 'The gate asks: what is χ of the Klein bottle you just built?',
        options: [2, 1, 0, -1],
        right: [E('1 point − 2 edges + 1 disk = 0. Same as the torus — χ alone can’t tell them apart. The arrows can.'), E('The gate’s open. Walk through — the Cone Zone is next.')],
        wrong: [E('Count the cells: points minus edges plus disks.')],
      },
    ],
    early: [E('The Blueprint Wall is last.')],
  },
}

export const HINTS04 = {
  knockout: E('Shake it off — back to the last press you finished.'),
  spawn: E('Clear the spawn first — the press won’t stamp with them crawling on it.'),
  torn: E('An Unglue tore an edge loose. Walk that track again to re-forge it before you press.'),
  stillGluing: E('Finish this press first.'),
}

/** What Emmy says when the walked word builds the wrong thing (by what it did build). */
export const WRONG = {
  sphere: 'a sphere',
  disk: 'a disk — the loop just got filled',
  pinched: 'a sphere with two of its points glued together ($a$, then $a⁻¹$ zips the disk shut — but both ends of $a$ are the one point)',
  torus: 'a torus',
  rp2: 'a projective plane',
  klein: 'a Klein bottle',
  other: 'a cell complex, but not the one on the blueprint',
}

export const DEFINITION04 = {
  text: 'A cell complex is built in stages: start with a discrete set of points (0-cells); attach 1-cells (edges) by their endpoints; then attach 2-cells (disks) along maps of their boundary circles into what’s built so far — and so on in higher dimensions. The torus is one 0-cell, two 1-cells a and b, and a 2-cell along a b a⁻¹ b⁻¹; the projective plane is one cell of each dimension, its 2-cell attached along a a. The Euler characteristic counts cells with alternating signs.',
  cite: 'Paraphrasing Allen Hatcher, Algebraic Topology, Chapter 0, pp. 5–8 (χ: Example 0.2). That χ depends only on the space, not on how it was built, is Theorem 2.44 — proved in Chapter 2.',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}

/**
 * What Emmy says when Gyroid walks up and talks to her: advice for exactly where he is.
 * s = { station, goal, cx, word, enemies, here, exitOpen, chiOpen }
 */
export function emmyAdvice(s) {
  const name = (id) => ({ sphere_press: 'the Sphere Press', twin_loops: 'Twin Loops', one_loop: 'One Loop', blueprint_wall: 'the Blueprint Wall' })[id]
  if (s.exitOpen) return [E('That’s every press. The forge door to the north is open — walk through it to reach the Cone Zone.')]
  if (!s.station) return [E('We’re done here.')]
  if (s.here !== s.station)
    return [E(`Next is ${name(s.station)} — I’ll wait for you there. Follow the walkways; I’m standing right beside it.`)]
  const lines = []
  if (s.enemies) lines.push(E('First, Null’s spawn are crawling on the press. Press 1 for the Lash and click toward them to crack it.'))
  const g = s.goal
  const torn = s.cx.edges.filter((e) => e.torn)
  if (!g) return [E('This press is finished. On to the next one.')]
  if (g.type === 'point')
    lines.push(E('Stand on the glowing furnace in the middle of the platform, hold the Cell-Smith — press 2 — and click the furnace. That forges the point, a 0-cell. Everything here gets glued to it.'))
  else if (g.type === 'edges') {
    const k = s.cx.edges.length
    lines.push(E(`Hold the Cell-Smith (2) and walk out along one of the dark tracks, round its loop, and all the way back to the furnace. That forges an edge — a 1-cell with both ends on the point. You have ${k} of ${g.n}.`))
    if (k > 0 && k < g.n) lines.push(E('Walk the other track for the next one — each track makes its own edge.'))
  } else if (g.type === 'disk' && g.word === '') {
    lines.push(E('Stand on the furnace and click it with the Cell-Smith. The press stamps a disk and crushes its whole rim onto the point.'))
  } else if (g.type === 'disk') {
    const want = g.word.replace(/-/g, '⁻¹')
    const walked = s.word.length ? s.word.map((l) => 'ab'[l.e] + (l.s < 0 ? '⁻¹' : '')).join(' ') : 'nothing yet'
    lines.push(E(`The blueprint wants a disk glued along $${want}$. Each lap round a track adds one letter: walk the way its arrow points for the letter, against the arrow for its inverse.`))
    lines.push(E(`So far you’ve walked: ${s.word.length ? '$' + walked + '$' : walked}. When it matches, step on the furnace and click to press. If you slip, press R to start the word over.`))
  } else if (g.type === 'chi') {
    lines.push(E('The door wants χ. Count what you built: points minus edges plus disks — it’s all on your gauntlet panel.'))
  }
  if (torn.length) lines.push(E('An Unglue tore an edge loose — it’s the violet dashed one. Walk that track again to re-forge it.'))
  return lines
}
