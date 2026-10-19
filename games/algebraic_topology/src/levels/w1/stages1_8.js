/**
 * World 1 · Level 8 "Under Cover" — Sheetwater Viaduct.
 * Hatcher §1.3 (pp. 56–62): covers of S¹ ∨ S¹, path lifting, ab ≠ ba in F₂.
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['two_floors', 'build_cover', 'rescue', 'order_proved']

export const OPENING = [
  E('Sheetwater Viaduct. Three glass sheets copy the figure-eight below — and every step you take moves your lift on the matching edge.'),
  E('Take the Sheet Compass (6). It shows which sheet your lift is on. First deck: a two-sheet cover of a single loop.'),
]

/**
 * Goal types:
 *   lap      — walk the loop once / twice (circle deck)
 *   wire     — cycle ports until a valid connected 3-sheet cover is wired
 *   rescue   — lift to sheet 2 and reach Emmy
 *   prove    — cover where ab closes and ba does not; confirm with Compass
 *   exit     — walk out
 */
export const STATIONS = {
  two_floors: {
    blueprint: 'Two floors',
    arrive: [
      E('Two sheets over one loop. Walk the gold loop once — your lift should land on sheet two.'),
      E('Walk it twice. If the lift returns to sheet one, that loop closes upstairs. One lap opens; two laps close.'),
    ],
    goals: [
      { type: 'lap', count: 1, done: [G('Sheet two. The lift opened — one lap was not enough to come home upstairs.'), E('Now two laps. That should close the lift.')] },
      { type: 'lap', count: 2, done: [E('Closed. A loop belongs to the cover’s subgroup exactly when its lift closes. Two sheets here — index two.'), G('On to the junction. I need to wire the figure-eight cover.')] },
    ],
    early: [E('The circle deck is first — south along the causeway.')],
  },
  build_cover: {
    blueprint: 'Build a cover',
    arrive: [
      E('Three sheets over the figure-eight. At every junction, exactly one incoming and one outgoing edge per label — use the sheet buttons on the panel to rewire a port.'),
      N('Mix the sheets. Maybe every loop will look the same from down there.'),
      E('Ignore him. Wire until the local rule holds and all three sheets connect.'),
    ],
    goals: [
      {
        type: 'wire',
        done: [E('Valid and connected. Each sheet repeats the causeway shape — that is the cover.'), G('Emmy’s trapped on sheet two next. I need a route that lifts there.')],
      },
    ],
    early: [E('Wire the three-sheet cover at the junction first.')],
  },
  rescue: {
    blueprint: 'Rescue on sheet two',
    arrive: [
      E('I’m on sheet two — your lift must end here, not just pass through. Walk loops whose word lifts to me.'),
      G('Hold on. I’ll read the Compass and find a word that lands on sheet two.'),
    ],
    goals: [
      {
        type: 'rescue',
        targetSheet: 2,
        done: [E('You reached sheet two. Same basepoint, different upstairs sheet — that is a loop whose lift does not close.'), G('Now prove order matters.')],
      },
    ],
    early: [E('Rescue deck — east. I’m waiting upstairs on sheet two.')],
  },
  order_proved: {
    blueprint: 'Order, proved',
    arrive: [
      E('Build a cover where $a$ then $b$ closes upstairs but $b$ then $a$ does not. Then you have proved they are different loops.'),
      N('Words, words. They all shrink on a sphere eventually.'),
      E('Not here. Use the Compass on the beacon: test both words when the cover is ready.'),
    ],
    goals: [
      { type: 'prove', done: [E('There it is: $ab$ closes and $ba$ does not. In the free group, order matters — what 1-6 suspected, now proved by a cover.'), G('Sheet Compass is mine. Null’s “every loop shrinks” still waits for the sphere — but not here.')] },
      { type: 'exit', done: [E('The viaduct exit is open north — Sheet Stacks wait beyond. Walk out when ready.')] },
    ],
    early: [E('Master deck last — prove $ab ≠ ba$.')],
  },
}

export const HINTS18 = {
  knockout: E('Breathe — your cover wiring stays. Try the current deck again.'),
  far: E('Walk closer to the beacon or port you need.'),
  wrongLap: E('That many laps gave the wrong lift sheet. Count again — one lap opens on the circle deck, two close.'),
  badWire: E('Each label needs a permutation on the sheets — no duplicates. All three sheets must connect through the ports.'),
  rescue: E('Try a word that ends on sheet two. The Compass shows your lift after each loop you walk.'),
  proveNeed: E('Rewire until $ab$ closes from sheet one and $ba$ does not — then press the Compass on the beacon to confirm.'),
  liftling: E('That sprite lives on one sheet only. Match your lift to its sheet, then lash.'),
}

export const DEFINITION18 = {
  text: 'A covering space of S¹ ∨ S¹ can be pictured as a graph with edges labeled a and b so that at each vertex exactly one incoming and one outgoing edge carry each label. A based loop’s lift closes iff its homotopy class lies in the image of the fundamental group of the cover. In particular, a finite-sheeted cover can separate two words that differ in F₂ — for example a b and b a.',
  cite: 'Paraphrasing Allen Hatcher, Algebraic Topology, §1.3 (Covering spaces), pp. 56–62; proof that reduced words are distinct uses covers (Prop. 1.37 / Ex. 1.13 in the same section).',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATchapter1.pdf',
}

export function emmyAdvice18(state) {
  const { current, done, goal, liftSheet, cover, here, enemies } = state
  if (!current) return [E('The viaduct is clear. Walk north to leave.')]
  if (here.site !== current) return [E(`Head to ${state.siteName(current)} — that is the active deck.`)]
  if (enemies?.[current]) return [E('Lash the patrol — or the Liftling on your lift’s sheet first.')]
  if (!goal) return [E('Press on — the next goal is close.')]
  if (goal.type === 'lap') return [E(`Walk the loop ${goal.count} time${goal.count > 1 ? 's' : ''} from the beacon. Compass (6) shows sheet ${liftSheet + 1}.`)]
  if (goal.type === 'wire') return [E('Click glowing ports with the Compass (6) to rewire. Need three connected sheets and valid permutations.')]
  if (goal.type === 'rescue') return [E(`End on sheet ${goal.targetSheet}. Walk a loop from the beacon; watch the lift count.`)]
  if (goal.type === 'prove') return [E('Wire so ab closes and ba does not, then click the beacon with the Compass to confirm.')]
  if (goal.type === 'exit') return [E('Walk north through the exit gate.')]
  return [E('Sheet Compass (6) for ports and tests · Lash (1) for spawn.')]
}
