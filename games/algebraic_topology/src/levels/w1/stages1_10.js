/**
 * World 1 · Level 10 "Deck the Halls" — deck transformations, normal covers,
 * quotients, and the antipodal sphere hall. Hatcher Ch. 1, §Deck transformations
 * and normal covers (pp. 68–82); RP² as S² mod antipodal (Example 1.14).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['shift_deck', 'lopsided', 'quotient', 'antipodal']

export const OPENING = [
  N('Shift every floor at once. If the ports still line up, nothing changed — and I still win.'),
  E('Deck Halls ahead. The Sheet Compass (6) rotates whole covers when the labels still match.'),
  E('Lash (1) clears Null’s spawn when a deck shift stacks every copy on one spot.'),
]

export const STATIONS = {
  shift_deck: {
    blueprint: 'Shift the deck',
    arrive: [
      E('Three glass floors, one triangle on each. Every port carries the same edge labels.'),
      E('Click the great wheel with the Sheet Compass (6) to rotate all sheets together. When the labels still match, the shift is allowed.'),
    ],
    goals: [
      {
        type: 'shift',
        cover: 'cyclic3',
        needShift: 1,
        guards: true,
        done: [
          E('One turn, and every port still agrees. That rotation is a deck transformation — a symmetry of the cover.'),
          E('When every sheet can reach every other by such shifts, the cover is normal. This one is.'),
          G('The guards stacked. One lash.'),
        ],
      },
    ],
    early: [E('The carousel hall is just south.')],
  },
  lopsided: {
    blueprint: 'Lopsided cover',
    arrive: [
      E('Two floors talk to each other at the gate. The third floor has its own label — alone.'),
      N('Rotate all you like. That lonely sheet never visits the others.'),
    ],
    goals: [
      {
        type: 'ask',
        question: 'Can a deck shift carry sheet 2 onto sheet 0?',
        options: ['Yes — it’s normal', 'No — sheet 2 is isolated'],
        answer: 'No — sheet 2 is isolated',
        right: [E('Right. A normal cover’s deck group acts transitively on every fiber. Here sheet 2 never meets the pair — not normal.')],
        wrong: [E('Try the Compass: only sheets 0 and 1 share a port. Sheet 2 never joins them.')],
      },
    ],
    early: [E('Finish the carousel first.')],
  },
  quotient: {
    blueprint: 'Divide by a group',
    arrive: [
      E('Build a cover from an action: flip a segment end-for-end. Two sheets, one midpoint port — labels swap sides.'),
      E('Apply the swap shift with the Compass. That is the quotient by $ℤ/2$ acting freely.'),
    ],
    goals: [
      {
        type: 'shift',
        cover: 'quotient',
        needShift: 1,
        done: [
          E('The two sheets trade places and the port still matches. A free action on a space, divided out, gives a covering space.'),
          G('Folded once, covered twice.'),
        ],
      },
    ],
    early: [E('The lopsided gallery comes before the quotient forge.')],
  },
  antipodal: {
    blueprint: 'Antipodal hall',
    arrive: [
      E('A sphere hall: golden doors in pairs, exactly opposite. Downstairs, the same room is the projective plane — each point two points up here.'),
      E('Walk the equatorial loops. One of them lifts to a path from a door to its opposite — not a closed lift.'),
    ],
    goals: [
      {
        type: 'ask',
        question: 'Which equatorial loop lifts to a path between opposite doors?',
        options: ['The full rim (once around)', 'A meridian (pole to pole)', 'A half-rim (180° arc)'],
        answer: 'A half-rim (180° arc)',
        right: [
          E('Yes. A loop that goes halfway around meets its antipode on the other sheet — the lift runs door to door.'),
          E('That is $S²$ covering $ℝP²$. Null’s sphere trick fails once you can see the double sheet.'),
          G('Opposite doors, one room — got it.'),
        ],
        wrong: [E('A full rim or meridian closes upstairs too. Only a half turn reaches the antipodal door.')],
      },
      {
        type: 'walk',
        loopId: 'half',
        done: [E('You walked the half-rim. Its lift opened the antipodal door. The castle’s ribbon storm won’t hide behind separate floors anymore.')],
      },
    ],
    early: [E('The sphere hall is north — after the quotient forge.')],
  },
}

export const HINTS = {
  knockout: [E('Hearts back. Your deck shifts and port counts are saved — try the Compass again.')],
  refuse_shift: [E('That rotation would mismatch a port label. Only shifts that preserve every label are deck transformations.')],
  guards: [E('Rotate the deck until every Deck guard copy sits on the same spot, then Lash once.')],
  compass: [E('Sheet Compass (6): click the wheel at the deck center.')],
  walk: [E('Stand on the glowing half-arc and walk it with WASD.')],
}

export const DEFINITION = {
  text: 'Deck transformations of a covering space are the homeomorphisms of the total space that preserve projection. They form a group, the deck group. A cover is normal when that group acts transitively on each fiber. The sphere double-covers the projective plane by identifying antipodal points.',
  cite: 'Hatcher, Algebraic Topology, Ch. 1 — deck transformations, normal covers, Example 1.14 (S² → RP²).',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATch1.pdf',
}

export function emmyAdvice110(state) {
  const { current, goal, done, shift, guardsAligned, here, enemies } = state
  if (!current) return [E('All halls clear. Walk out north to leave.')]
  if (here?.site !== current) return [E(`Head to ${STATIONS[current].blueprint} — follow the map’s NEXT ring.`)]
  if (enemies?.[current] > 0 && !guardsAligned) return HINTS.guards
  if (goal?.type === 'shift') return [E(`Rotate with the Compass until shift +${goal.needShift} is valid${goal.guards ? ', stack the guards, then Lash' : ''}.`)]
  if (goal?.type === 'ask') return [E('Answer the question — think about which sheets can reach which.')]
  if (goal?.type === 'walk') return HINTS.walk
  return [E('Sheet Compass (6) on the wheel; Lash (1) when copies stack.')]
}
