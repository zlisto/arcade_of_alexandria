/**
 * World 1 · Level 2 "Loop de Loop" — Basepoint Beacon. Hatcher §1.1: π₁(X, x₀) is a group
 * under concatenation of based loops; change of base along h gives π₁(X,x₀) ≅ π₁(X,x₁).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })

export const STATION_ORDER = ['home_base', 'there_back', 'brackets', 'second_beacon']

export const OPENING = [
  E('The Basepoint Beacon — every lap you run from here and back is a loop at this point.'),
  E('Your Lash closes them now. Run a loop, and it lands in your loop ledger.'),
]

/**
 * Goal types:
 *   loop n          — complete n laps (each {track, dir}) in order from the beacon
 *   reduce expect   — after laps in `seq`, reduced word must match expect (default [])
 *   ask             — prediction question before confirming
 *   arrive_b        — walk to the second beacon along the causeway
 *   carry           — at beacon B, show loops carried by change of base
 */
export const STATIONS = {
  home_base: {
    blueprint: 'Home base',
    arrive: [
      E('A loop must leave the beacon and come back to the same point — the basepoint.'),
      E('Standing still is a loop too: the identity. Run the gold ring once with the Lash (1) out and back.'),
    ],
    goals: [{ type: 'loop', seq: [{ track: 0, dir: 1 }], done: [G('One lap, closed. The ledger remembers it as $α$.'), E('That’s an element of the fundamental group $π₁(X, x₀)$ — based loops up to sliding.')] }],
    early: [E('The beacon first — just ahead on the red-lantern ring.')],
  },
  there_back: {
    blueprint: 'There and back',
    arrive: [E('Every loop has an undo: run it backwards. Out and back, then the same loop reversed — it should slide down to the identity.')],
    goals: [
      {
        type: 'reduce',
        seq: [
          { track: 0, dir: 1 },
          { track: 0, dir: -1 },
        ],
        expect: [],
        done: [G('$α$ then $α⁻¹$ — nothing left. Standing still.'), E('Inverses are built in. That’s what makes loops a group, not just a pile of routes.')],
      },
    ],
    early: [E('There and Back is east on the violet ring — not yet.')],
  },
  brackets: {
    blueprint: 'Brackets don’t matter',
    arrive: [
      E('Three loops: $α$, $β$, $γ$. Combine them in order — then combine the same three again.'),
      E('Parentheses only group how you *think* about concatenation; sliding never changes the class.'),
    ],
    goals: [
      {
        type: 'loop',
        runs: 2,
        seq: [
          { track: 0, dir: 1 },
          { track: 1, dir: 1 },
          { track: 2, dir: 1 },
        ],
        mid: [E('Same three laps again. The ledger should match.')],
        done: [E('Two chains, one reduced word: $α β γ$. Associativity — brackets only live in your head.')],
      },
      {
        type: 'ask',
        question: 'Same loop class both times?',
        options: ['Yes — concatenation is associative'],
        answer: 'Yes — concatenation is associative',
        wrong: [E('Check the ledger: both chains reduced to the same word. Associativity: $(α β) γ$ slides into $α (β γ)$.')],
        right: [G('Same gold word both times. Brackets were only in my head.'), E('Onward — carry these loops to the second beacon down the causeway.')],
      },
    ],
    early: [E('The triple-loop deck is south — finish There and Back first.')],
    enemies: [['torus', -2.5, 3], ['torus', 2.5, -2.5]],
  },
  second_beacon: {
    blueprint: 'A second beacon',
    arrive: [E('Same loops, new basepoint. Walk the causeway — the path $h$ — then run a lap here. Nothing is gained or lost.')],
    goals: [
      { type: 'arrive_b', done: [E('Beacon B. Your loops from A arrive as $h γ h⁻¹$ — same information, new labels.')] },
      {
        type: 'carry',
        path: [{ track: 0, dir: 1 }],
        done: [
          G('My ledger still matches — just rewritten at this post.'),
          E('That isomorphism is change of base. Bouquet Bastion’s couriers use it every day.'),
        ],
      },
    ],
    early: [E('The second beacon waits at the end of the south causeway.')],
    enemies: [['sphere', -3, 2], ['sphere', 3, 2]],
  },
}

export const HINTS = {
  knockout: E('Hearts back — loops you already closed stay in the ledger. Lash the spawn and keep going.'),
  notHub: E('Start and finish each lap at the amber beacon in the middle.'),
  abandon: E('Go all the way round the gold ring and back to the beacon.'),
  wrongSection: (name) => E(`The ledger work is at ${name} — follow the map’s NEXT pulse.`),
  needLash: E('Switch to the Lash (1). It closes loops on these rings.'),
  patrol: G('Ribbon scouts — they’re only watching for now.'),
}

export const DEFINITION = {
  text: 'Based loops at a point, up to homotopy, form a group π₁(X, x₀): concatenation is the group law, the constant loop is the identity, and each loop has a homotopy inverse. A path h from x₀ to x₁ induces an isomorphism π₁(X, x₀) ≅ π₁(X, x₁) by γ ↦ h γ h⁻¹.',
  cite: 'Hatcher, Algebraic Topology, §1.1 (The fundamental group), pp. 28–30.',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATchapter1.pdf',
}

export function emmyAdvice12(state) {
  const { current, done, goal, here, bag, lapIdx, enemies, phase } = state
  if (phase !== 'play') return [E('Finish this line first.')]
  if (enemies?.[here.site]) return [E('Lash the violet spawn — two hits on the torus — then close your loop.')]
  if (!current || here.site !== current) {
    const next = STATION_ORDER.find((id) => !done[id])
    return next ? [HINTS.wrongSection(STATIONS[next].blueprint)] : [E('All sections done — walk south through the exit gate.')]
  }
  if (!goal) return [E('Walk out through the exit when you’re ready.')]
  if (goal.type === 'loop' || goal.type === 'reduce') {
    const need = goal.seq?.[lapIdx || 0]
    if (need) return [E(`Next lap: track ${['α', 'β', 'γ'][need.track] || '?'}${need.dir < 0 ? '⁻¹' : ''} from the beacon and back.`)]
    return [E('Run the laps in order from the beacon.')]
  }
  if (goal.type === 'arrive_b') return [E('Follow the causeway to the smaller beacon at the south end.')]
  if (goal.type === 'carry') return [E('Close one loop at this beacon — the ledger should match the carried word.')]
  if (goal.type === 'ask') return [E('You ran the same three laps twice. Do the ledgers match?')]
  return [E('Keep the beacon at your back when you start each lap.')]
}
