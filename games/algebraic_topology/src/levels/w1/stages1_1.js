/**
 * World 1 · Level 1 "Fixed Endpoints" — Endpoint Gardens.
 * Hatcher, Algebraic Topology, Chapter 1, pp. 25–26 (homotopy of paths rel a subspace).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['open_lawn', 'hedges', 'faster', 'chained']

export const OPENING = [
  E('Endpoint Gardens. Couriers log routes between gatehouses — not parcels, but which delivery class a path belongs to.'),
  E('Two routes count as the same if one slides into the other while both ends stay pinned at their gates. That is path homotopy rel endpoints.'),
  G('Ledger open. Spool to walk a route, Tide Glass to slide between routes. I’ll sort them into classes.'),
]

/**
 * Goal types:
 *   slide          — scrub Tide Glass until routes match (convex homotopy demo)
 *   ledger         — assign every route id to a class bin; validate
 *   pace           — confirm reparametrized route same class
 *   chain          — build A→C from pieces; swap equivalent middle piece
 *   guard          — clear hedge spawn wave
 */
export const STATIONS = {
  open_lawn: {
    blueprint: 'Open lawn · one class',
    arrive: [
      E('No hedges here — any two routes between these gates slide straight into each other.'),
      E('Pick the wavy gold route, then hold the Tide Glass (3) and scrub until it sits on the straight one. Same delivery class.'),
    ],
    goals: [
      {
        type: 'slide',
        pair: ['wavy', 'straight'],
        done: [G('They slid together. Ends never moved.'), E('On a convex lawn that straight-line slide is a homotopy rel the gates. One class for every route here.')],
      },
      {
        type: 'ledger',
        expectClasses: 1,
        done: [E('Ledger stamped: class I. Every gardener agrees. North-east: the hedge beds.')],
      },
    ],
    early: [E('The open lawn is just ahead — start at the near gatehouses.')],
  },
  hedges: {
    blueprint: 'Hedge bed · sort routes',
    arrive: [
      E('A hedge bed is a hole in the lawn. Routes around the left and right don’t slide together — different classes.'),
      E('Click a route in the ledger panel, then click its bin. Match homotopy, not shape.'),
    ],
    goals: [
      {
        type: 'ledger',
        expectClasses: 2,
        wave: true,
        done: [
          E('Two classes — left of the hedge and right of the hedge. The ledger is consistent: same class iff a slide rel the gates exists.'),
          G('Hedge spawn tried to sprout a new bed mid-route. Lash them before they root.'),
        ],
      },
      { type: 'guard', done: [E('Clear ledger. On to the pace garden — south along the path.')] },
    ],
    early: [E('Finish the open lawn first.')],
  },
  faster: {
    blueprint: 'Same route, new pace',
    arrive: [
      E('Walk the gold route with the Spool (2). Then try the dashed “fast” copy — more steps, same image.'),
      E('Reparametrizing a path is a homotopy rel endpoints. Same class, different speed.'),
    ],
    goals: [
      {
        type: 'pace',
        route: 'slow',
        fast: 'fast',
        done: [G('Fast or slow — same class.'), E('Null loves to confuse pace with path. Don’t let him.')],
      },
      {
        type: 'slide',
        pair: ['slow', 'fast'],
        done: [E('The Tide Glass shows the slide. Gates fixed the whole time. East: three gatehouses for chaining.')],
      },
    ],
    early: [E('The hedge ledger comes before pace tricks.')],
  },
  chained: {
    blueprint: 'Chained deliveries',
    arrive: [
      E('Three gatehouses: A, B, C. A route A→B followed by B→C is a route A→C.'),
      E('Chain the pieces in the ledger. Then swap the middle leg for another route in its class — the chain’s class should not change.'),
    ],
    goals: [
      {
        type: 'chain',
        done: [
          E('Concatenation is well defined on homotopy classes rel endpoints — when the middle gate matches.'),
          G('Swap accepted. Same class.'),
        ],
      },
      {
        type: 'ledger',
        expectClasses: 2,
        done: [E('Master ledger signed. Walk out north — the causeway to Loop de Loop opens.')],
      },
    ],
    early: [E('Chaining waits until you’ve seen pace and hedges.')],
  },
}

export const HINTS = {
  knockout: [E('Hearts back. Routes and ledger progress stay — re-tie any clipped thread with the Spool.')],
  refuse: {
    ledger: [E('That route doesn’t belong in that bin — try sliding it mentally around the hedge.')],
    slide: [E('Scrub t until the ghost route matches — endpoints stay on the gate posts.')],
    chain: [E('Pick routes that meet at the middle gatehouse, then confirm the swap.')],
  },
}

export const DEFINITION = {
  text: 'Fix a subspace A of a space X. Two paths in X with the same endpoints in A are path homotopic rel A if one can be continuously deformed into the other while keeping the endpoints in A fixed at all times. This is an equivalence relation. On a convex set, any two paths with the same endpoints are homotopic rel those endpoints via a straight-line homotopy. Concatenation of paths is well defined on homotopy classes when endpoints match.',
  cite: 'Paraphrasing Allen Hatcher, Algebraic Topology, Chapter 1, pp. 25–26 (path homotopy rel a subspace; homotopy equivalence relation; concatenation).',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}

export const WRONG = {
  ledgerMix: [E('Those two routes don’t slide together — check which side of the hedge each uses.')],
}

export function emmyAdvice11(s) {
  const lines = []
  if (s.exitOpen) return [E('Exit is north. Walk through the gate — the iris will close behind you.')]
  if (!s.station) return [E('Follow the map’s NEXT ring to the current garden.')]
  if (s.here !== s.station) return [E(`You're not on ${s.name} yet — dashed line on the map.`), E(`Head to ${s.stationName}.`)]
  if (s.enemies) return [E('Clear the spawn first — lash (1). Hedge spawn root if you wait too long.')]
  const g = s.goal
  if (!g) return [E('Section clear. Walk to NEXT on the map.')]
  if (g.type === 'slide') return [E('Tide Glass (3): scrub t until the routes match. Gates stay fixed.')]
  if (g.type === 'ledger') return [E(`Ledger: sort routes into ${g.expectClasses || 2} classes. Click route, then bin.`), E('Same bin iff a homotopy rel the gates exists.')]
  if (g.type === 'pace') return [E('Walk the slow route with Spool (2), then confirm the fast copy is the same class.')]
  if (g.type === 'chain') return [E('Chain A→B and B→C, note the class, swap B→C for an equivalent route, check the class again.')]
  if (g.type === 'guard') return [E('Lash every hedge spawn before it roots (1).')]
  return [E('Spool (2) for routes, Tide Glass (3) for slides, E to talk.')]
}
