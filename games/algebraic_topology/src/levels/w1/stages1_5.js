/**
 * World 1 · Level 5 "Push It Forward" — Torus Terraces.
 * Hatcher, Algebraic Topology, §1.1 (pp. 34–39): induced homomorphisms, retractions,
 * π₁(X × Y) ≅ π₁(X) × π₁(Y).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['projector_deck', 'retract_deck', 'two_roads', 'shadows_deck']

export const OPENING = [
  E('The Torus Terraces. Two belt roads — one around the tube, one through the hole — and map projectors that push loops from island to island.'),
  E('Hold the Winding Cord (4) to read laps on a road. The Suspension Sling (5) reaches the upper terrace when you need height.'),
  G('Two roads, two numbers. Push it forward!'),
]

/**
 * Goal types:
 *   push      — walk laps on source, project with degree k, match target winding
 *   retract   — confirm two rim loops stay distinct after retraction (ask)
 *   grid      — chart (m, n) on the torus; swap test
 *   shadows   — split (m, n) into factor windings and rebuild
 *   guard     — clear a wave before exit opens
 */
export const STATIONS = {
  projector_deck: {
    blueprint: 'The Projector',
    arrive: [
      E('A map projector sends every loop on the small island to a loop on the big one — that’s the induced map $f_*$.'),
      E('Walk the gold source road with the Cord until it reads one lap. Click the projector to push the loop forward.'),
    ],
    goals: [
      {
        type: 'push',
        degree: 2,
        needSource: 1,
        needTarget: 2,
        done: [
          G('One lap here became two laps there!'),
          E('A loop that wraps the small circle $k$ times lands $2k$ times on the target — here $k=1$ gives $2$. That’s $f_*$ on $π_1(S^1) ≅ ℤ$.'),
          E('Retract Check is west — an island that shrinks onto its rim.'),
        ],
      },
    ],
    early: [E('The Projector terrace is just ahead on the causeway.')],
  },
  retract_deck: {
    blueprint: 'Retract Check',
    arrive: [
      E('This basin retracts onto its glowing rim. Distinct loops on the rim should stay distinct — the inclusion’s $f_*$ is injective.'),
      E('Walk each marked post on the rim with the Cord. Read the two winding numbers.'),
    ],
    goals: [
      {
        type: 'retract',
        w1: 1,
        w2: 2,
        done: [E('Still 1 and 2 — retraction didn’t merge them. Injective on the rim.'), G('So squashing the filling can’t turn one lap into two.')],
      },
      {
        type: 'ask',
        question: 'After retracting onto the rim, can two different rim loops become the same loop?',
        options: ['Yes — they can merge', 'No — distinct windings stay distinct'],
        answer: 1,
        right: [E('Correct. A retraction gives an injection on $π_1$ of the subspace you retract onto.'), E('Two Roads next — east. The torus itself has two independent belts.')],
        wrong: [E('Count the Cord again: one lap and two laps are still different classes on the rim.')],
      },
    ],
    early: [E('Finish the Projector first, then come back to the rim basin.')],
  },
  two_roads: {
    blueprint: 'Two Roads',
    arrive: [
      E('The torus deck: outer road is the tube factor, inner road is the hole factor. The grid above is the universal cover — a loop ends at $(m,n)$.'),
      E('Walk one lap of each road (any order). The Cord and grid should agree. Then try the swap test.'),
    ],
    goals: [
      {
        type: 'grid',
        need: [1, 1],
        done: [G('Tube then hole — I’m at (1,1) on the grid.'), E('Now walk hole then tube. Same corner — on a torus, the two generators commute in $π_1(T^2) ≅ ℤ^2$.')],
      },
      {
        type: 'swap',
        need: [1, 1],
        done: [G('Same place! Hole-then-tube matched tube-then-hole.'), E('That’s $ab = ba$ in the product. Order of laps only matters within each road, not between roads.')],
      },
    ],
    early: [E('The torus terrace opens after Retract Check.')],
  },
  shadows_deck: {
    blueprint: 'Shadows',
    arrive: [
      E('Last terrace: split a torus loop into its two circle shadows — laps on each factor — then rebuild.'),
      E('The board shows $(2,3)$. Walk the tube shadow road twice and the hole shadow road three times. Walk a road backwards to take a lap off.'),
    ],
    goals: [
      {
        type: 'shadows',
        given: [2, 3],
        need: [2, 3],
        done: [
          E('$π_1(S^1 × S^1) ≅ π_1(S^1) × π_1(S^1) ≅ ℤ × ℤ$. The pair $(2,3)$ is the loop; each factor is a shadow.'),
          G('Shadows match — loop rebuilt!'),
        ],
      },
      {
        type: 'guard',
        wave: true,
        done: [E('Projector imps scrambled enough maps for one day. The causeway north is clear — walk out when you’re ready.')],
      },
    ],
    early: [E('Shadows waits until both roads make sense.')],
  },
}

export const HINTS = {
  knockout: E('Knocked down — hearts reset, progress stays. Lash the imps before you project.'),
  far: E('Walk closer — the Cord only reads when you’re on the gold road.'),
  hijacked: E('That imp scrambled the projector! Lash it, then project again.'),
  wrongPush: E('Push one lap from the source road first — then click the brass projector.'),
  swap: E('Reset the grid, walk tube then hole, note $(m,n)$. Reset, walk hole then tube — compare.'),
  shadows: E('Match tube shadow 2 and hole shadow 3, then click Rebuild on the board.'),
}

export const DEFINITION = {
  title: 'Induced maps and products',
  text: 'A continuous map f : X → Y sends a loop in X to a loop in Y; on fundamental groups this is the induced homomorphism f_* : π₁(X) → π₁(Y). For S¹, winding number multiplies under a k-fold wrap. A retraction X → A ⊂ X induces an injection π₁(A) → π₁(X). For a product, π₁(X × Y) ≅ π₁(X) × π₁(Y); on the torus T² = S¹ × S¹, a loop is determined by two independent winding numbers (m, n).',
  cite: 'Hatcher, Algebraic Topology, §1.1, pp. 34–39',
  link: 'https://pi.math.cornell.edu/~hatcher/AT/ATch1.pdf',
  next: 'World 1 · Level 6 — Free Word Play',
}

export function emmyAdvice15(state) {
  const { current, here, goal, done, SITE, loops, hijacked, waveOn, waveSpawned, enemies, exitOpen } = state
  if (exitOpen) return [G('North gate’s open — walk through to leave.')]
  if (!current) return [G('All terraces done!')]
  if (here.site !== current) return [E(`Head to ${SITE[current].name} — follow the map’s NEXT ring.`)]
  const g = goal
  if (!g) return [E('Keep exploring the terrace.')]
  if (g.type === 'push') {
    const src = loops?.source ?? 0
    const tgt = loops?.target ?? 0
    if (hijacked) return [HINTS.hijacked]
    if (src < g.needSource) return [E(`Walk the small source road with the Cord (4) until it reads ${g.needSource} lap — you’re at ${src}.`)]
    if (tgt < g.needTarget) return [E(`Click the projector to push — you want ${g.needTarget} laps on the target (now ${tgt}).`)]
    return [E('Projector readout matches — you’re done here.')]
  }
  if (g.type === 'retract') return [E('Walk each violet post on the rim; the Cord should read 1 and 2.')]
  if (g.type === 'ask') return [E('Answer the question — distinct rim windings stay distinct after retraction.')]
  if (g.type === 'grid') return [E('Walk one tube lap and one hole lap; grid and Cord should show (1,1).')]
  if (g.type === 'swap') return [HINTS.swap]
  if (g.type === 'shadows') return [HINTS.shadows]
  if (g.type === 'guard') {
    if (waveOn && waveSpawned && (enemies?.shadows_deck || 0) > 0) return [E('Lash the projector imps (1) — guard the terrace.')]
    return [E('Terrace clear.')]
  }
  return [E('Talk to me anytime — I’ll read your counts.')]
}
