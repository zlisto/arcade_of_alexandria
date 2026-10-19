/**
 * World 0 · Level 6 "Timber!" — the Timber Yard. Each deck carries tangles (graphs):
 * mark a tree of walkways with the Spool (it may not close a loop), then fell it at the
 * platform you click with the Cell-Smith: the tree shrinks to that one platform and every other
 * walkway becomes a petal of a bouquet. Hatcher, Algebraic Topology, Chapter 0,
 * Example 0.7 (graphs, p. 11) and Proposition 0.17 (collapsing a contractible subcomplex).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['one_edge', 'spanning_tree', 'wrong_cut', 'census']

export const OPENING = [
  E('The Timber Yard. The walkways grew wild out here — platforms joined every which way.'),
  E('You’ll need the Spool (2) to mark walkways and the Cell-Smith (3) to fell them. The first deck is just ahead.'),
]

/**
 * Goal types:
 *   fell graphs   — mark a spanning tree on each listed tangle and fell it (any order)
 *   guard         — keep every petal whole until the deck's wave of Loop-biters is gone
 *   ask           — answer a question (options, answer, right, wrong)
 *   bridge        — click the bridge foot with the Cell-Smith: the way out
 */
export const STATIONS = {
  one_edge: {
    blueprint: 'Shrink a walkway',
    arrive: [
      E('The Sapling Deck. Two platforms, one walkway between them.'),
      E('Hold the Spool (2) and click the walkway to mark it amber. Then take the Cell-Smith (3) and click either platform to fell the walkway onto it.'),
    ],
    goals: [
      {
        type: 'fell',
        graphs: [0],
        done: [
          E('The walkway shrank and the far platform slid onto the one you clicked. One platform now — and nothing was lost. A walkway with two different ends can always shrink to a point.'),
          E('Count platforms minus walkways. Before: 2 − 1 = 1. After: 1 − 0 = 1. Same number. Remember that.'),
          E('Now a triangle. Mark walkways until every platform is reached, then fell.'),
        ],
      },
      {
        type: 'fell',
        graphs: [1],
        done: [
          E('Two walkways reached all three platforms — that’s a tree. The third walkway couldn’t join it: it would have closed a loop.'),
          E('Felling the tree pulled all three platforms into one, and the leftover walkway became a loop: a circle. The triangle’s hole is still there.'),
          E('3 − 3 = 0 before; 1 − 1 = 0 after. On to the Thicket, west.'),
        ],
      },
    ],
    early: [E('The Sapling Deck first — just ahead.')],
  },
  spanning_tree: {
    blueprint: 'Fell a tree',
    arrive: [
      E('The Thicket. Five platforms, seven walkways — two of them run side by side.'),
      E('Mark a tree that reaches all five platforms, without closing any loop. Then click any one of its platforms with the Cell-Smith to fell it there.'),
    ],
    goals: [
      {
        type: 'fell',
        graphs: [0],
        done: [
          E('Look: one platform with three loops. A bouquet of three circles.'),
          E('Platforms minus walkways was 5 − 7 = −2. Now it’s 1 − 3 = −2. Felling a tree never changes it — each walkway you shrink takes one platform with it.'),
          E('That number is χ, the Euler characteristic. A bouquet has 1 − χ petals. So you could have counted the petals before you felled a thing.'),
          E('East to the Wrong Cut. Null’s been busy there.'),
        ],
      },
    ],
    early: [E('The Thicket comes after the Sapling Deck.')],
  },
  wrong_cut: {
    blueprint: 'The wrong cut',
    arrive: [
      E('The Wrong Cut. One of these walkways starts and ends at the same platform — a loop already.'),
      N('Shrink it. Go on — it’s just one more walkway.'),
      E('Mark a tree, fell it — and see what happens if you try to mark that loop.'),
    ],
    goals: [
      {
        type: 'fell',
        graphs: [0],
        wave: true,
        done: [E('Three petals. Now — Loop-biters! They chew a petal down to nothing. Lash them before they finish, and if one does, restring the petal with the Cell-Smith.')],
      },
      {
        type: 'guard',
        done: [
          E('Every petal whole. Shrinking a walkway with two ends is safe. Shrinking a loop kills its hole — that’s Null’s move, not ours.'),
          G('A tree, I can fell. A loop, never.'),
          E('Last deck: the Census, north.'),
        ],
      },
    ],
    early: [E('The Wrong Cut comes after the Thicket.')],
  },
  census: {
    blueprint: 'Census',
    arrive: [
      E('The Census Deck. Three tangles, A, B and C. They look nothing alike.'),
      E('Before you fell anything: count each one’s platforms and walkways.'),
    ],
    goals: [
      {
        type: 'ask',
        question: 'Count platforms − walkways for A, B and C. Which two will fell into the same bouquet?',
        options: ['A and B', 'A and C', 'B and C'],
        answer: 'A and B',
        right: [E('A: 4 − 5 = −1. B: 6 − 7 = −1. C: 4 − 6 = −2. So A and B should both give two petals, and C three. Now fell all three and check.')],
        wrong: [E('Count again. A has 4 platforms and 5 walkways. B has 6 and 7. C has 4 and 6.')],
      },
      {
        type: 'fell',
        graphs: [0, 1, 2],
        done: [
          E('Two petals, two petals, three. A and B were the same space all along — a figure-eight — dressed up differently.'),
          E('And C, with three petals, is a different space. Felling can’t tell you that much on its own — Chapter 1’s loops will prove it.'),
          E('The yard’s clear — and look north: the bridge to the Throne is building itself.'),
        ],
      },
      {
        type: 'bridge',
        done: [E('There it is: the bridge to the Hollow Throne. Null is waiting at the other end. Walk north across it when you’re ready.')],
      },
    ],
    early: [E('The Census Deck is last.')],
  },
}

export const HINTS06 = {
  knockout: E('Shake it off — back to the last deck you finished.'),
  loop: [E('That walkway would close a loop with the ones you’ve marked. A tree never closes a loop — fell a loop and you’d squash its hole.')],
  selfLoop: [
    E('That walkway starts and ends at the same platform. It’s already a loop — there’s no second end to slide onto.'),
    E('Shrinking it would erase its hole. That’s exactly what Null wants. Leave it: it will become a petal.'),
  ],
  notSpanning: (r, n) => `The tree reaches ${r} of ${n} platforms — mark walkways until it reaches them all`,
}

export const DEFINITION06 = {
  text: 'In a graph, collapsing an edge with two distinct endpoints to a point is a homotopy equivalence. A tree is contractible, so collapsing a maximal tree — one that reaches every vertex — leaves a single vertex with the remaining edges as loops: every connected graph is homotopy equivalent to a wedge of circles. Collapsing an edge never changes vertices − edges, so the number of circles is 1 − χ.',
  cite: 'Paraphrasing Allen Hatcher, Algebraic Topology, Chapter 0, Example 0.7 (p. 11) and Proposition 0.17. That wedges of different numbers of circles are not homotopy equivalent is proved with the fundamental group (Chapter 1).',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}

/**
 * What Emmy says when Gyroid walks up and talks to her: advice for exactly where he is.
 * s = { station, goal, here, name, exitOpen, enemies, tangles: [{ label, reached, total, spanning, felled, bitten }] }
 */
export function emmyAdvice06(s) {
  if (s.exitOpen) return [E('The bridge is built. Walk north across it — the Hollow Throne is waiting.')]
  if (!s.station) return [E('We’re done here.')]
  if (s.here !== s.station) return [E(`Next is ${s.name} — I’ll wait for you there.`)]
  const g = s.goal
  const lines = []
  if (!g) return [E('This deck is finished.')]
  if (g.type === 'fell') {
    const left = s.tangles.filter((t) => !t.felled)
    for (const t of left) {
      const who = t.label ? `Tangle ${t.label}: ` : ''
      const cap = (x) => (who ? x : x[0].toUpperCase() + x.slice(1))
      if (!t.spanning)
        lines.push(E(`${who}${cap('hold')} the Spool (2) and click walkways to mark them amber. Keep going until the tree reaches every platform — it reaches ${t.reached} of ${t.total} now. If a walkway won’t mark, it would close a loop: skip it.`))
      else lines.push(E(`${who}${cap('your')} tree reaches every platform. Take the Cell-Smith (3) and click any platform — the whole tree falls onto it.`))
    }
    if (s.station === 'wrong_cut') lines.push(E('The walkway that starts and ends at the same platform can never be marked — it’s already a loop.'))
  } else if (g.type === 'guard') {
    if (s.enemies) lines.push(E('Lash the Loop-biters — press 1 and click toward them — before they chew a petal down.'))
    if (s.tangles.some((t) => t.bitten)) lines.push(E('A petal got chewed (the violet dashed one). Take the Cell-Smith (3) and click it to restring it.'))
    if (!lines.length) lines.push(E('Keep the petals safe until the Loop-biters are gone.'))
  } else if (g.type === 'ask') {
    lines.push(E('Answer the question on screen: count platforms minus walkways for each tangle — the numbers are on your panel.'))
  } else if (g.type === 'bridge') {
    lines.push(E('Take the Cell-Smith (3) to the north edge of this deck, by the bridge posts, and click the foot of the bridge.'))
  }
  return lines
}
