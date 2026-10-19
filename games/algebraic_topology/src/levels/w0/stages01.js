/**
 * Level 0-1 "A Good Deformation" — stages and dialogue.
 * Source: Hatcher, Algebraic Topology, Ch. 0 "Homotopy and Homotopy Type", pp. 1–3
 * (thick letters shrinking to thin letters; the disk with two holes; the definition
 * of a deformation retraction; letters with holes deferred to Chapter 1).
 */

export const RULES = [
  { id: 'startsStill', label: 'Starts still', math: 'f₀ = identity', detail: 'At t = 0 nothing has moved yet.' },
  { id: 'onReef', label: 'Stays on the reef', math: 'fₜ : X → X', detail: 'Every point stays on the reef the whole time.' },
  { id: 'endsOnSpine', label: 'Ends on the spine', math: 'f₁(X) = A', detail: 'At t = 1 everything sits on the spine.' },
  { id: 'spineFixed', label: 'Spine stays put', math: 'fₜ|A = identity', detail: 'Points of the spine never move.' },
  { id: 'continuous', label: 'No tearing, no teleporting', math: '(x, t) ↦ fₜ(x) continuous', detail: 'Nearby points stay nearby; nothing jumps.' },
]

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

/** Emmy's hints, keyed by what's wrong with the spine (see retraction.js). Stages can override. */
export const HINTS = {
  empty: E('Draw a spine first — hold and drag across the reef.'),
  beacons: E('The spine has to pass through every beacon — the survivors standing there can’t be moved.'),
  disconnected: E('Your spine is in pieces. The reef between them gets pulled toward both and tears — connect the pieces.'),
  leak: E('See the red stretch? It touches two shores with no spine between them, so it’s pulled two ways and tears. Wrap the spine all the way around each hole.'),
  enclosed: E('That red patch is fenced in by spine with no hole inside. A solid patch can’t be squashed onto its own fence without tearing — erase that loop.'),
  cleared: E('Reef’s clear! Switch to the Spool (2 or Q), click to start the thread, walk your spine, click to stop — then Slide.'),
  knockout: E('Oof — Gyroid’s down. Shake it off; we’ll take that reef again from the top.'),
}

export const STAGES = [
  {
    id: 'walkway',
    beat: 'teach',
    title: 'The Walkway',
    mode: 'demo',
    shape: { add: [{ type: 'rect', x0: -3.4, x1: 3.4, z0: -0.85, z1: 0.85 }] },
    beacons: [
      [-3.2, 0],
      [3.2, 0],
    ],
    givenSpine: [
      [
        [-3.2, 0],
        [3.2, 0],
      ],
    ],
    showTrails: true,
    camera: { pos: [0.9, 9.2, 7.4], target: [0.9, 0, 0.6] },
    start: [-2.9, 0.2],
    enemies: [
      ['sphere', 1.0, 0.35],
      ['sphere', 2.6, -0.4],
    ],
    intro: [
      E('Gyroid! Null’s spawn are crawling over the walkway. Run with WASD or the arrow keys.'),
      E('Click to crack the Fundamental Lash toward your mouse. Those spheres are slippery — every loop slides right off them — so one lash collapses each one to a point.'),
    ],
    cleared: [
      E('Walkway’s clear. Now, this walkway is too thick to hold — but its amber spine is solid. We shrink the walkway onto the spine.'),
      E('Watch the faint lines: every point slides along its own path to the spine, all arriving together. Points already on the spine never move.'),
      E('Press Slide. You’re standing on the reef — you’ll ride along.'),
    ],
    success: [
      E('That’s a deformation retraction. Look at the rules — every one held.'),
      G('Nothing moved at the start, everything ended on the spine, the spine stayed put… and nothing tore.'),
      E('And nobody fell in the sea. Your Spool can lay spines now — switch to it with 2 or Q. Let’s use it.'),
    ],
  },
  {
    id: 'fork',
    beat: 'practice',
    title: 'The Fork',
    mode: 'draw',
    shape: {
      add: [
        { type: 'rect', x0: -3, x1: 3, z0: -2.1, z1: -0.75 },
        { type: 'rect', x0: -0.7, x1: 0.7, z0: -2.1, z1: 2.3 },
      ],
    },
    beacons: [
      [-2.75, -1.45],
      [2.75, -1.45],
      [0, 2.05],
    ],
    camera: { pos: [0.9, 9.4, 6.6], target: [0.9, 0, 0.5] },
    start: [0, 1.7],
    enemies: [
      ['sphere', -2.2, -1.4],
      ['sphere', 2.2, -1.5],
      ['sphere', 0.15, -0.6],
    ],
    intro: [
      E('A thick T — and more spawn. Clear them out first.'),
      E('Then lay a spine: switch to the Spool (2 or Q), click to start the thread, walk it through all three beacons, and click again to stop. Threads snap together where they meet.'),
    ],
    cleared: [E('Clear! Now spool a spine through all three beacons, then Slide.')],
    success: [E('Clean. That’s how Hatcher shrinks a thick letter onto a thin one: every point slides along a path into the thin letter, which never moves.')],
  },
  {
    id: 'ring',
    beat: 'twist',
    title: 'The O',
    mode: 'draw',
    shape: { add: [{ type: 'circle', cx: 0, cz: 0, r: 2.75 }], sub: [{ type: 'circle', cx: 0, cz: 0, r: 1.3 }] },
    beacons: [[0, 2.02]],
    camera: { pos: [0.9, 9, 6.4], target: [0.9, 0, 0.6] },
    start: [-2.05, 0.5],
    enemies: [
      ['torus', 1.85, -0.9],
      ['sphere', 0.3, -2.1],
    ],
    intro: [
      E('The O-reef — and look out, a torus! It holds two loops it can’t shed: one around its tube, one through its hole. It takes two lashes — one for each loop.'),
      E('Clear the reef, then spool a spine through the beacon and Slide.'),
    ],
    hints: {
      beacons: E('Make sure your spine passes through the beacon.'),
      leak: E('The far side of the ring reaches both shores — the hole and the open sea — with no spine in between, so it’s pulled both ways around the hole and tears. The hole isn’t in your way; it’s part of the shape. Go around it.'),
    },
    success: [
      E('A loop around the hole. The ring shrinks onto a circle.'),
      G('But never onto a single point?'),
      E('Not by sliding. Whether NO motion at all could do it — that takes a stronger tool than we have. Hold that thought.'),
    ],
  },
  {
    id: 'lagoons',
    beat: 'master',
    title: 'Twin Lagoons',
    mode: 'draw',
    shape: {
      add: [{ type: 'circle', cx: 0, cz: 0, r: 3.15 }],
      sub: [
        { type: 'circle', cx: -1.4, cz: 0, r: 0.8 },
        { type: 'circle', cx: 1.4, cz: 0, r: 0.8 },
      ],
    },
    beacons: [[0, 0]],
    camera: { pos: [1, 10.2, 7], target: [1, 0, 0.7] },
    start: [0, 2.5],
    enemies: [
      ['torus', -2.2, 1.6],
      ['torus', 2.3, -1.4],
      ['sphere', 0, -2.3],
      ['sphere', 2.0, 1.9],
    ],
    intro: [
      E('Twin Lagoons — a disk with two holes, straight out of Hatcher. Two tori this time.'),
      E('Clear them, then find a spine through the center beacon that holds.'),
    ],
    hints: {
      beacons: E('The spine must pass through the center beacon.'),
      leak: E('The red stretch touches two shores — a lagoon and the open sea, or both lagoons — with no spine between them. Each lagoon needs its own loop of spine around it.'),
    },
    success: [
      E('It holds! The book shrinks this same reef onto three different spines: a figure-eight, a theta, and two loops joined by a bar.'),
      E('Different skeletons, one reef. Remember that — it gets a name soon.'),
    ],
    alternatives: true,
  },
  {
    id: 'forgeries',
    beat: 'master',
    title: 'Null’s Forgeries',
    mode: 'forgery',
    shape: { add: [{ type: 'rect', x0: -3.4, x1: 3.4, z0: -0.85, z1: 0.85 }] },
    beacons: [],
    givenSpine: [
      [
        [-3.2, 0],
        [3.2, 0],
      ],
    ],
    camera: { pos: [0.9, 9.2, 7.4], target: [0.9, 0, 0.6] },
    intro: [
      N('Such patience, little courier. My Crown simplifies faster. Behold — four retractions of my own.'),
      E('Every one of them breaks a rule. Watch each one, then name the rule it breaks.'),
    ],
    forgeries: [
      { id: 'jump-start', broken: 'startsStill', explain: 'At t = 0 the reef had already shifted off its footprint. A deformation retraction must start as the identity.' },
      { id: 'half-way', broken: 'endsOnSpine', explain: 'At t = 1 the points were only halfway there. Everything has to end on the spine.' },
      { id: 'wobbly-spine', broken: 'spineFixed', explain: 'The spine itself wobbled. Points of A must stay fixed for every t.' },
      { id: 'torn', broken: 'continuous', explain: 'The left and right halves were sent to opposite ends — neighbors in the middle tore apart.' },
    ],
    success: [
      N('…Clever. But you still can’t prove a ring isn’t a point.'),
      E('Not yet. Level clear, Gyroid.'),
    ],
  },
]

export const DEFINITION = {
  text: 'A deformation retraction of a space X onto a subspace A is a family of maps fₜ : X → X for t in [0, 1] with f₀ the identity, f₁(X) = A, and fₜ fixing every point of A for all t — continuous as a single map X × [0, 1] → X.',
  cite: 'Paraphrasing Allen Hatcher, Algebraic Topology, Chapter 0, p. 2.',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}
