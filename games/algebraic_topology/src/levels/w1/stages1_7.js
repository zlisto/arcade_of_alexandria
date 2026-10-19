/**
 * World 1 · Level 7 "Glue Job" — Glue Works. Attach disks to add relations;
 * Van Kampen on overlapping pieces. Hatcher §1.2, Examples 1.5–1.7.
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['circle_press', 'torus_press', 'half_turn', 'two_pieces']

export const OPENING = [
  N('Another disk? You think crushing a loop makes you clever.'),
  E('It makes a relation. Glue a disk along a loop, and that word slides across the disk to nothing.'),
  E('The Cell-Smith (2) presses disks. The Van Kampen Clasp (5) joins what two pieces agree on. First press — straight ahead.'),
]

/**
 * Goal types:
 *   point, edges n, disk word expect — same forge flow as 0-4
 *   trivial word          — after a disk, confirm the relation killed a word
 *   commute               — show ab and ba are the same class
 *   order                 — a nontrivial, aa trivial (ask)
 *   clasp                 — amalgamate west/east on the overlap
 *   patrol                — lash a patrol whose word is now trivial
 */
export const STATIONS = {
  circle_press: {
    blueprint: 'Kill one loop',
    arrive: [
      E('One loop district, one furnace. Forge the point, walk the track for edge $a$, then glue a disk along $a$.'),
      E('After the press, the loop is a relation: $a = 1$. Every patrol that only walked $a$ has nothing left to stand on.'),
    ],
    goals: [
      { type: 'point', done: [] },
      { type: 'edges', n: 1, done: [E('Edge $a$. Now walk $a$ once — out, round, back — and click the furnace to press a disk along it.')] },
      { type: 'disk', word: 'a', expect: 'disk', done: [E('The disk filled the loop. In the group, $a$ is trivial now.'), G('So the word on the rim vanished.')] },
      { type: 'trivial', word: 'a', done: [E('Walk $a$ again if you like — it slides to nothing. The fundamental group here is $1$.'), E('Southwest next: the torus word.')] },
    ],
    early: [E('The first press is ahead — not yet.')],
  },
  torus_press: {
    blueprint: 'The torus relation',
    arrive: [
      E('Two loops, $a$ and $b$. This is the Commutator’s favorite word — until we glue along it.'),
      E('Forge both edges, walk $a b a⁻¹ b⁻¹$, and press.'),
    ],
    goals: [
      { type: 'point', done: [] },
      { type: 'edges', n: 2, done: [E('Figure-eight skeleton. Spell $a b a⁻¹ b⁻¹$ with your feet, then press.')] },
      {
        type: 'disk',
        word: 'a b a- b-',
        expect: 'torus',
        done: [E('The bouquet folded into a torus. The relation is $a b a⁻¹ b⁻¹ = 1$ — equivalently, $a b = b a$.'), G('The patrol word just died.')],
      },
      { type: 'commute', done: [E('Try the swap: $a b$ and $b a$ land in the same class now. That is $π₁(T²) ≅ ℤ × ℤ$.')] },
    ],
    early: [E('The torus press is southwest of the gate.')],
  },
  half_turn: {
    blueprint: 'ℤ₂',
    arrive: [
      E('One loop again — but glue along $a a$, both times the same way. That is the projective plane’s trick.'),
      N('Walk it twice and pretend it means nothing. Once still counts.'),
    ],
    goals: [
      { type: 'point', done: [] },
      { type: 'edges', n: 1, done: [E('Walk $a a$, then press.')] },
      {
        type: 'disk',
        word: 'a a',
        expect: 'rp2',
        done: [E('Relation $a² = 1$. The group is $ℤ₂$: two classes, “once” and “twice”.')],
      },
      {
        type: 'order',
        answer: 'aa',
        wrong: [E('Not quite. $a$ is still visible once. $a a$ is the word that slides away.')],
        right: [E('Right: $a$ survives; $a a$ does not. That is $⟨ a | a² ⟩$.'), E('North to the overlap deck — Van Kampen’s turn.')],
      },
    ],
    early: [E('Half Turn is southeast — after the torus.')],
  },
  two_pieces: {
    blueprint: 'Van Kampen',
    arrive: [
      E('Two pieces overlap on a shared loop $c$. West calls it $a$; east calls it $b$. Same loop, two names.'),
      E('Stand on the amber clasp in the middle with the Van Kampen Clasp (5) and click — identify the words.'),
    ],
    goals: [
      { type: 'point', done: [] },
      { type: 'edges', n: 2, side: 'both', done: [E('West track is $a$; east track is $b$. Both meet the overlap.')] },
      { type: 'clasp', done: [E('Amalgamated: $a b⁻¹ = 1$, so $a = b$. One generator, $π₁ ≅ ℤ$.')] },
      {
        type: 'ask',
        question: 'After the clasp, is a b⁻¹ trivial?',
        choices: ['Yes — a and b are the same loop', 'No — order still matters'],
        answer: 0,
        wrong: [E('On the overlap, $c$ is both $a$ and $b$. The clasp adds $a b⁻¹$ as a relation.')],
        right: [E('Van Kampen’s theorem: $π₁$ is the free product of the pieces, with overlap relations. Here, that collapses to $ℤ$.'), G('Sheetwater next — if the span holds.')],
      },
    ],
    early: [E('The overlap deck is north — finish the torus and half-turn first.')],
    wave: true,
  },
}

export const HINTS17 = {
  knockout: E('Hearts back — progress stays. Re-glue any disk an Unglue tore.'),
  spawn: E('Clear the spawn first — the press will not stamp while they crowd the furnace.'),
  torn: E('An Unglue ripped an edge. Lash it, then walk that track again.'),
  clasp: E('Middle of the deck, Van Kampen Clasp (5), click the amber clasp.'),
  patrol: E('That patrol’s word died in the group — one lash dissolves it.'),
}

export const DEFINITION17 = {
  text: 'Van Kampen: if $X = U ∪ V$ with $U ∩ V$ path-connected, then $π₁(X)$ is the amalgamated free product $π₁(U) *_{π₁(U∩V)} π₁(V)$. Attaching a 2-cell along a loop adds that word as a relation.',
  cite: 'Hatcher, Algebraic Topology, §1.2 (van Kampen), Example 1.6.',
  link: 'https://pi.math.cornell.edu/~hatcher/AT/ATch1.pdf',
  next: 'Sheetwater Viaduct (1-8)',
}

export function emmyAdvice17(state) {
  const { current, done, goal, here, site, pres, wordWalk, enemies, waveOn } = state
  if (!current) return [E('Walk out through the gate — Sheetwater waits.')]
  if (here !== current) return [E(`Head to ${site?.name || current} — that's the live press.`)]
  if (enemies) return [E('Lash the spawn — they block the press and tear disks.')]
  if (!goal) return [E('Section clear. Follow the map to NEXT.')]
  if (goal.type === 'point') return [E('Stand on the furnace · Cell-Smith (2) · click to forge the point.')]
  if (goal.type === 'edges') return [E(`Walk each track out and back until ${goal.n} edge(s) are forged.`)]
  if (goal.type === 'disk') return [E(`Walked: ${wordWalk || '—'}. Match the blueprint, click the furnace.`)]
  if (goal.type === 'trivial') return [E('The relation killed that word — try walking it; it should reduce to nothing.')]
  if (goal.type === 'commute') return [E('Walk $a b$ and $b a$ — same class after the torus disk.')]
  if (goal.type === 'order') return [E('Which word is trivial now, $a$ or $a a$? Open the question panel.')]
  if (goal.type === 'clasp') return HINTS17.clasp
  if (goal.type === 'ask') return [E('Answer the clasp question on the panel.')]
  if (goal.type === 'patrol') return HINTS17.patrol
  if (waveOn) return [E('Unglue wave — re-glue before relations are lost.')]
  return [E('Keep gluing.')]
}
