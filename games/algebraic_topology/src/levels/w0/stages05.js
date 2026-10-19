/**
 * World 0 · Level 5 "Cone Zone" — the terrace of operation works. Each works has a
 * machine that runs operations on spaces (spaces.js), pedestals that dispense specimens,
 * and an output shelf; chaining means carrying a result back into the machine.
 * Hatcher, Algebraic Topology, Chapter 0, pp. 8–10 (products, quotients, cones,
 * suspensions, wedge sums) and the cells each operation inherits or adds.
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['cone_works', 'suspension_works', 'wedge_product', 'recipe_board']

export const OPENING = [
  E('The Cone Zone. Every works up here takes spaces in and puts a new space out.'),
  E('Null’s Coners are loose on the terrace. Hold the Cell-Smith (2) and come to the Cone Works, just ahead.'),
]

/**
 * Goal types:
 *   make target  — the machine's output is `target` (spaces.js key; a sphere made either
 *                  way counts as a sphere)
 *   ask          — answer a question (options, answer, right, wrong)
 * A station's `ops` are the operations its machine can run.
 */
export const STATIONS = {
  cone_works: {
    blueprint: 'The cone',
    ops: ['cone'],
    arrive: [
      E('The Cone Works. Its machine does one thing: it joins every point of what you feed it to one new tip.'),
      E('Click a pedestal with the Cell-Smith to take a copy of its space, carry it to the machine, and click the machine to feed it in. Start with the ring.'),
    ],
    goals: [
      {
        type: 'make',
        target: 'cone_circle',
        done: [
          E('Every point of the ring joined to one tip. The hole is filled — a loop around the rim just slides up the cone and shrinks away at the tip.'),
          E('Read the cells on your gauntlet. The ring was 1 point and 1 edge. The cone kept those and added a tip, an edge from the ring’s point up to the tip, and a disk: 2, 2, 1.'),
          E('Now cone the two points.'),
        ],
      },
      {
        type: 'make',
        target: 'vee',
        done: [E('Each point joined to the tip: a V. That’s just an interval, bent — and it shrinks to its tip too.'), E('Every cone shrinks to its tip, whatever you feed in. One question before you go.')],
      },
      {
        type: 'ask',
        question: 'Every cone shrinks to its tip. What is χ of a cone?',
        options: [0, 1, 2],
        answer: 1,
        right: [
          E('1 — the same as a point. Each cell you feed in gets a partner one dimension up, and they cancel in pairs; only the tip is left over.'),
          E('So when a Coner beams a ring, the ring becomes a disk. From above it still looks like a ring. Count its cells and you’ll see the plug.'),
          E('The Suspension Works is west.'),
        ],
        wrong: [E('Count the cone on the ring: 2 points − 2 edges + 1 disk.')],
      },
    ],
    early: [E('The Cone Works first — just ahead.')],
  },
  suspension_works: {
    blueprint: 'Two tips',
    ops: ['suspension'],
    arrive: [
      E('The Suspension Works. Like a cone, but with two tips — one above, one below — and every point joined to both.'),
      E('Feed it the two points.'),
    ],
    goals: [
      {
        type: 'make',
        target: 'circle',
        done: [
          E('Two points, each joined to a tip above and a tip below: two arcs that close up into a circle.'),
          E('The tips are its two points; the two arcs are its edges. Now feed the machine its own circle — pick it up off the shelf.'),
        ],
      },
      {
        type: 'make',
        target: 'sphere',
        done: [
          E('The circle, joined to a tip above and below: a double cone that rounds out into a sphere.'),
          E('Suspend two points: a circle. Suspend a circle: a sphere. Suspend that sphere…'),
        ],
      },
      {
        type: 'make',
        target: 's3',
        done: [
          E('A 3-sphere. It can’t sit in our space, so the machine shows you its shadow — but its cells are honest: the sphere’s, one dimension up, plus two tips.'),
          G('Each time, one more dimension.'),
          E('Suspending a sphere of any dimension gives the next one up. Wedge & Product next — east.'),
        ],
      },
    ],
    early: [E('The Suspension Works comes after the Cone Works.')],
  },
  wedge_product: {
    blueprint: 'Two spaces in',
    ops: ['wedge', 'product'],
    arrive: [
      E('Wedge & Product. This machine takes two spaces at once. Pick the operation on your gauntlet, then feed it two.'),
      E('Wedge first: glue two rings together at one point.'),
    ],
    goals: [
      {
        type: 'make',
        target: 'eight',
        done: [E('Two rings, one shared point: a figure-eight. The cells add up, with one point fewer — the two points became one.'), E('Now switch to PRODUCT and feed it two rings: every point of one, times every point of the other.')],
      },
      {
        type: 'make',
        target: 'torus',
        done: [E('A small ring swept all the way around a big one: a torus.'), E('The torus you built in the Assembly Hall had 1 point, 2 edges and 1 disk. Look at this one’s cells.')],
      },
      {
        type: 'ask',
        question: 'Circle × circle: how do its cells compare with the Assembly Hall’s torus (1 point, 2 edges, 1 disk)?',
        options: ['the same: 1, 2, 1', 'more cells', 'fewer cells'],
        answer: 'the same: 1, 2, 1',
        right: [
          E('The same. A product gets a cell for each pair of cells: point × point, point × edge, edge × point, edge × edge. That’s 1, 2, 1 — your Hall torus, built a different way.'),
          E('Last works: the Recipe Board, north.'),
        ],
        wrong: [E('Pair them up: each ring is a point and an edge. Point × point, point × edge, edge × point, edge × edge.')],
      },
    ],
    early: [E('Wedge & Product comes after the Suspension Works.')],
  },
  recipe_board: {
    blueprint: 'Recipes',
    ops: ['cone', 'suspension', 'wedge', 'product', 'quotient'],
    arrive: [
      E('The Recipe Board. Every operation, and only three plain pedestals: a point, two points, a disk.'),
      E('The board wants spaces you can’t pick up — you’ll have to make them, then feed what you make back in. The shelf holds two results.'),
      N('And my Coners will plug whatever you leave lying around.'),
      E('First recipe: a sphere. Try the QUOTIENT — it collapses the disk’s whole rim to one point.'),
    ],
    goals: [
      {
        type: 'make',
        target: 'sphere',
        wave: true,
        done: [
          E('The rim collapsed to a point and the disk closed up: a sphere — the Sphere Press’s sphere, 1 point and 1 disk.'),
          E('Collapsing the rim changed the shape, because the rim is a loop. Collapsing something that shrinks to a point — a tree, a cone — wouldn’t. (Hatcher proves that in Chapter 0, Proposition 0.17.)'),
          E('Second recipe: a torus. You only have two points to start from. Think about where a ring comes from.'),
        ],
      },
      {
        type: 'make',
        target: 'torus',
        done: [E('Two suspensions and a product. That’s a recipe.'), E('Last one: a sphere with a ring attached at one point — sphere wedge circle.')],
      },
      {
        type: 'make',
        target: 'sphere_circle',
        done: [
          E('S² ∨ S¹. However you built the pieces, χ comes out 2 + 0 − 1 = 1: a wedge adds the two χs, minus one for the point they share.'),
          G('So a plugged ring, a cone, a sphere — I can tell them apart by what they’re made of.'),
          E('Exactly. The gate to the Timber Yard is open. Walk through.'),
        ],
      },
    ],
    early: [E('The Recipe Board is last.')],
  },
}

export const HINTS05 = {
  knockout: E('Shake it off — back to the last works you finished.'),
  spawn: E('Clear the spawn first — the machine won’t run with them crawling on it.'),
  firstPlug: [
    E('A Coner plugged it — see the violet cone? Coned, a space shrinks to a point. It isn’t what it was.'),
    E('Lash Coners before their beam finishes. A plugged pedestal you can fix — click it with the Cell-Smith to pull the plug.'),
    E('But if they plug something you made, sitting on the shelf, that’s a cone for good. Watch the shelf.'),
  ],
  carryFirst: E('Pick something up first: click a pedestal with the Cell-Smith.'),
}

/** The level-clear card. */
export const DEFINITION05 = {
  text: 'New spaces from old: the cone CX joins every point of X to one tip (X × I with X × 1 collapsed to a point) and always shrinks to that tip; the suspension SX joins X to two tips, and S of an n-sphere is the (n+1)-sphere; the wedge X ∨ Y glues X and Y at one point; the product X × Y has a cell eᵐ × eⁿ for each pair of cells; the quotient X/A collapses A to a point — D² with its rim collapsed is S².',
  cite: 'Paraphrasing Allen Hatcher, Algebraic Topology, Chapter 0, pp. 8–10. That collapsing a contractible subcomplex keeps the homotopy type is Proposition 0.17.',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}

/**
 * What Emmy says when Gyroid walks up and talks to her: advice for exactly where he is.
 * s = { station, goal, works, carried, here, exitOpen, enemies, name }
 */
export function emmyAdvice05(s) {
  if (s.exitOpen) return [E('That’s every works. The gate to the Timber Yard is open — walk north through it.')]
  if (!s.station) return [E('We’re done here.')]
  if (s.here !== s.station) return [E(`Next is ${s.name} — I’ll wait for you there. Follow the walkways; I’m standing on the platform.`)]
  const lines = []
  const g = s.goal
  const w = s.works
  const opName = { cone: 'CONE', suspension: 'SUSPENSION', wedge: 'WEDGE', product: 'PRODUCT', quotient: 'QUOTIENT' }
  const pick = (op) => (w.op === op ? '' : `First pick ${opName[op]} on your panel (top right). `)
  if (s.enemies) lines.push(E('Lash the Coners before they plug things — press 1 and click toward them. A plugged pedestal you can fix: click it with the Cell-Smith.'))
  if (w.shelf.some((x) => x?.plugged)) lines.push(E('Something on your shelf got plugged — the violet cone. That one’s ruined; make a fresh one.'))
  if (s.carried) lines.push(E(`You’re carrying ${s.carried.name}. Click the machine to feed it in.`))
  else if (w.hopper.length === 1) lines.push(E(`The machine already holds ${w.hopper[0].name} — feed it one more space.`))
  if (!g) return lines.length ? lines : [E('This works is finished.')]
  if (g.type === 'ask') {
    lines.push(E('Answer the question on screen. Count the cells: they’re listed on your panel under “last made”.'))
    return lines
  }
  const t = g.target
  const tips = {
    cone_circle: 'Hold the Cell-Smith (2), click the ring’s pedestal to pick up a copy, then click the machine. It cones whatever you feed it.',
    vee: 'Now pick up the two points and feed them to the machine.',
    circle: 'Pick up the two points and feed them to the machine: a tip above, a tip below.',
    sphere: s.station === 'recipe_board' ? `${pick('quotient')}Feed it the disk: the quotient collapses the disk’s whole rim to one point. (Suspending a circle works too.)` : 'Pick the circle up off the shelf — the teal pedestal — and feed it back into the machine.',
    s3: 'Take the sphere off the shelf and feed it in once more.',
    eight: `${pick('wedge')}Feed it a ring, then another ring — pick up the ring pedestal twice.`,
    torus:
      s.station === 'recipe_board'
        ? `Two suspensions and a product. ${pick('suspension')}Feed the two points twice — you’ll get two circles on the shelf. Then pick PRODUCT and feed both circles in.`
        : `${pick('product')}Feed it a ring, then another ring.`,
    sphere_circle: 'Make a circle (suspend the two points), suspend that circle to get a sphere, make another circle, then pick WEDGE and feed the sphere and the circle.',
  }
  lines.push(E(tips[t] || `Make ${t}.`))
  return lines
}
