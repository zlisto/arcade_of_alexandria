/**
 * World 1 · Level 4 "No Way Out" — Brouwer's Basin.
 * Hatcher Ch. 1 (§1.1, no retraction D² → S¹; fixed-point / index ideas in exercises).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['retractor', 'still_point', 'roots', 'antipodes']

export const OPENING = [
  N('Squash the basin onto its rim. Filling is optional.'),
  E('Null’s Retractor again — but you have the Winding Cord now. The rim loop winds once; inside the disk every loop shrinks. A retraction would have to turn nothing back into one lap.'),
  E('Prove it on the first deck. Then we hunt still points, roots and antipodes with the same count.'),
]

export const STATIONS = {
  retractor: {
    blueprint: 'Break the Retractor',
    arrive: [
      E('The Retractor deck. Walk the glowing rim road with the Winding Cord (4) — one full lap.'),
      E('Then click the basin floor to shrink an inner loop to nothing. If the engine could retract onto the rim, it would have to rewind that shrink — watch the proof stall the machine.'),
    ],
    goals: [
      { type: 'rim', winding: 1, done: [G('One lap on the rim. The cord reads one.'), E('Now shrink a loop inside the disk — every loop there is null in $π_1$.')] },
      {
        type: 'shrink',
        wave: true,
        done: [E('Zero inside, one on the rim — no map from the filled disk to the circle can fix the rim and send the inside to a point. The Retractor seizes.'), G('So a ring is not a point. World 0 asked; World 1 answers.'), E('Lash the retractor drones before they yank you off the rim. East to the arrow fields.')],
      },
      { type: 'guard', done: [E('Deck clear. The arrow fields wait east and west.')] },
    ],
    early: [E('The Retractor deck is first — follow the violet chains.')],
  },
  still_point: {
    blueprint: 'Find the still tile',
    arrive: [
      E('Each tile carries an arrow — a map of the basin to itself. Walk the rim with the cord: if the arrows spin once around you, something inside must point nowhere.'),
      E('When the count is not zero, click the tile whose arrow is still (no direction).'),
    ],
    goals: [
      { type: 'rim', winding: 1, done: [E('Index one: the field winds once on the boundary — a fixed point hides inside (Brouwer in the plane).')] },
      { type: 'still', done: [G('There — the arrow points nowhere.'), E('That is the still point the rim count promised. South to the root whirlpool.')] },
    ],
    early: [E('Finish the Retractor proof first.')],
  },
  roots: {
    blueprint: 'Three roots',
    arrive: [
      E('On this pool the arrows wind three times on the outer rim — like $z \\mapsto z^3$ on a big circle.'),
      E('Walk the rim; then dive in and click each root whirlpool (three of them).'),
    ],
    goals: [
      { type: 'rim', winding: 3, done: [E('Winding three — the fundamental theorem of algebra says three roots live inside (counted with multiplicity).')] },
      { type: 'roots', count: 3, done: [G('Three whirlpools, three roots.'), E('Last deck: a little sphere island and Borsuk–Ulam — opposite stations, same reading.')] },
    ],
    early: [E('The still-point field comes before the root pool.')],
  },
  antipodes: {
    blueprint: 'Opposite match',
    arrive: [
      E('Six stations on this sphere cap. Opposite points should show the same pair of numbers — if not, Null swapped a sign.'),
      E('Find the antipodal pair whose readings match exactly.'),
    ],
    goals: [
      {
        type: 'pair',
        done: [
          E('Equal on opposite sides of the sphere — the Borsuk–Ulam theorem. No continuous map from $S^2$ to the plane is one-to-one on antipodes.'),
          E('The basin is clear. Walk north through the gate when it opens.'),
        ],
      },
      { type: 'exit', done: [E('On to Torus Terraces — maps that push loops forward.')] },
    ],
    early: [E('Match antipodes after the root pool.')],
  },
}

export const HINTS = {
  knockout: E('Catch your breath — progress stays. Back to the rim when you are ready.'),
  wrongRim: (need) => E(`The cord needs ${need} full turn${need === 1 ? '' : 's'} on this rim — keep walking the ring road.`),
  notStill: E('That tile still points somewhere. Follow the arrows inward toward where they shrink.'),
  wrongRoot: E('That is not a root — the arrows still spin here. Try a whirlpool center.'),
  wrongPair: E('Those readings do not match, or they are not opposite on the sphere. Walk to the true antipodes.'),
  tooFar: (what) => `Walk closer to ${what}`,
}

export const DEFINITION = {
  text: 'There is no retraction from the disk D² onto its boundary circle S¹: if r were such a map, the induced homomorphism on fundamental groups would send the class of the boundary loop to itself, but π₁(D²) is trivial while π₁(S¹) ≅ ℤ. Winding number detects this obstruction. For a continuous vector field on the disk with no zero on the boundary, the index on the boundary is the sum of indices of zeros inside; a nonzero boundary index forces a zero inside (Brouwer fixed point theorem in dimension 2). On the circle, the winding of z ↦ zⁿ is n, giving n roots inside for the polynomial zⁿ − 1; Borsuk–Ulam on S² pairs antipodal points with equal readings under any continuous map to ℝ².',
  cite: 'Allen Hatcher, Algebraic Topology, Chapter 1, §1.1 (no retraction D² → S¹) and the relation to π₁; fixed-point and index arguments as in standard treatments of Brouwer and the fundamental theorem of algebra via winding. Borsuk–Ulam is not proved in Chapter 1 — we use it as a named capstone.',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}

export function emmyAdvice14(state) {
  const { current, goal, progress, stationId, enemies } = state
  if (!current) return [E('Walk north through the exit gate.')]
  if (stationId !== current) return [E(`Head to ${state.siteName(current)} — that is the active deck.`)]
  if (enemies > 0) return [E('Lash the spawn (1) — retractor drones tug you toward the rim; whirl tops scramble arrows.')]
  if (!goal) return [E('Keep exploring this deck.')]
  if (goal.type === 'rim') return [E(`Walk the rim road with the Winding Cord (4). Need winding ${goal.winding}; cord shows ${progress.rim ?? 0}.`)]
  if (goal.type === 'shrink') return [E('Click the basin floor with the cord equipped — shrink an inner loop to the center.')]
  if (goal.type === 'still') return [E('Click the tile where the gold arrow fades to nothing — the still point.')]
  if (goal.type === 'roots') return [E(`Find ${goal.count} root whirlpools inside (${progress.roots ?? 0}/${goal.count} found).`)]
  if (goal.type === 'pair') return [E('Walk to two opposite stations on the sphere; click one, then its antipode, when the number pairs match.')]
  if (goal.type === 'guard') return [E('Clear the wave of retractor drones on this deck.')]
  if (goal.type === 'exit') return [E('The gate is open north — walk through to leave.')]
  return [E('Winding Cord on loops; Lash (1) for spawn.')]
}
