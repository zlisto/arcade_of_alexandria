/**
 * World 1 · Level 3 "Winding Road" — Bouquet Bastion. Hatcher Ch. 1: π₁(S¹) ≅ ℤ via
 * the helix cover, homotopy lifting, winding number.
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['the_helix', 'sliding', 'unwind', 'number_line']

export const OPENING = [
  N('Every loop on a circle is just a number. I wonder if anyone here can read it.'),
  E('The Winding Road. Each lap around the ring below is one turn up the helix. Take the Winding Cord (4) and run one clean lap.'),
]

/**
 * Goal types:
 *   lap n           — close a loop with winding exactly n on the ring
 *   slide           — scrub Tide Glass on a saved loop; winding must stay the same
 *   unwind winder   — run loops until banked winding cancels a Winder, then lash it
 *   gate n          — bank loops until total winding equals n, then touch the gate
 */
export const STATIONS = {
  the_helix: {
    blueprint: 'One lap, one floor',
    arrive: [
      E('See the helix? Your shadow climbs it as you run the ring. One lap down here is one floor up there.'),
      E('Equip the Winding Cord (4). Stay on the gold ring road and come back to where you started.'),
    ],
    goals: [
      {
        type: 'lap',
        n: 1,
        done: [
          G('One lap — and my shadow ended on the first floor!'),
          E('That floor is the winding number: an integer. $π_1(S^1) ≅ \\mathbb{Z}$ — we will make that precise in the lesson.'),
          E('Sliding next — east along the causeway.'),
        ],
      },
    ],
    early: [E('The Helix deck first — the round island just ahead.')],
  },
  sliding: {
    blueprint: 'Sliding does not change the count',
    arrive: [
      E('Run another lap, then switch to the Tide Glass (3). Wiggle the loop all you like — the floor must not move.'),
      E('Homotopy lifting: deforming the path in the circle never changes the endpoint of the lift.'),
    ],
    goals: [
      {
        type: 'lap',
        n: 1,
        done: [E('Good — bank that lap. Now deform it with the glass.')],
      },
      {
        type: 'slide',
        done: [
          G('Wild wiggles — same floor as before.'),
          E('The winding number is unchanged by homotopy. Null cannot slide a 1 into a 0.'),
          E('Unwind is next — where the Winders wait.'),
        ],
      },
    ],
    early: [E("Sliding Doesn't Count is east of the Helix.")],
  },
  unwind: {
    blueprint: 'Cancel, then lash',
    arrive: [
      E('Winders wrap the pillars with stolen turns. Bank +2 laps, then run −2 — the coil unwinds.'),
      E('Only then will the Lash bite.'),
    ],
    goals: [
      {
        type: 'unwind',
        winder: 2,
        done: [
          G('2 + (−2) = 0 on the cord — the coil fell off!'),
          E('Concatenation of loops adds winding numbers; reversing a loop negates it.'),
          E('Master deck ahead: build exact integers for the gates.'),
        ],
      },
      {
        type: 'unwind',
        winder: -3,
        done: [E('Three turns the other way. The last Winder is clear.')],
      },
    ],
    early: [E('Unwind deck — not yet.')],
  },
  number_line: {
    blueprint: 'Every integer, nothing else',
    arrive: [
      E('Each gate opens for one winding number. Bank laps on the cord — they add. Reversed laps subtract.'),
      E('Reach +2, then −1, then +3. Every integer is reachable; no sliding trick gives you the wrong one.'),
    ],
    goals: [
      { type: 'gate', n: 2, done: [G('Gate read +2. The cord agrees.')] },
      { type: 'gate', n: -1, done: [G('−1 — one lap backwards from the beacon.')] },
      {
        type: 'gate',
        n: 3,
        done: [
          E('You built every gate integer from laps alone. That is the group $\\mathbb{Z}$.'),
          G('The road keeps climbing. I can read the floors now.'),
        ],
      },
    ],
    early: [E('The Number Line is last — finish the Winders first.')],
  },
}

export const HINTS13 = {
  knockout: E('Hearts back — your winding bank and progress stay. Try the lap again.'),
  offRing: E('Stay on the gold ring road — the cord only counts laps there.'),
  wrongWinding: E('That lap closed with the wrong winding. Check direction: counter-clockwise is +1.'),
  winderImmune: E('The Winder still holds those turns. Bank the opposite winding on the cord first.'),
  needBank: E('Touch the beacon in the middle to bank your last lap onto the cord total.'),
  gateWrong: E("The gate's coil shows a different number. Bank laps until the cord matches."),
}

export const WRONG = {
  slideChanged: E('If the floor moved, that was not a homotopy of the same loop — only sliding along the circle counts.'),
}

export const DEFINITION13 = {
  text: 'The fundamental group of the circle is infinite cyclic: loops around S¹ are classified up to homotopy by an integer winding number, via the helix cover ℝ → S¹ and path/homotopy lifting.',
  cite: 'Hatcher, Algebraic Topology, Ch. 1, pp. 29–35 (covering spaces, π₁(S¹) ≅ ℤ).',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATch1.pdf',
}

export function emmyAdvice13(state) {
  const { current, done, goal, here, bank, lastLap, winders, gateOpen, enemies, met } = state
  if (!current) return [E('Walk out through the exit — you have every floor.')]
  if (here !== current) return [E(`You're on ${here || 'the path'}. Head to ${STATIONS[current].blueprint} (${current.replace(/_/g, ' ')}).`)]
  if (enemies?.[current] > 0) return [E('Lash the sphere spawn — save your laps for the puzzle.')]
  if (!met?.[current]) return STATIONS[current].arrive.slice(-1)
  if (!goal) return [E('Keep exploring — or finish the exit.')]
  if (goal.type === 'lap') return [E(`Run one lap on the ring with winding ${goal.n > 0 ? '+' : ''}${goal.n}. Cord (4), stay on gold.`)]
  if (goal.type === 'slide') return [E('Tide Glass (3): scrub the loop. The helix floor must stay at ' + (lastLap ?? 1) + '.')]
  if (goal.type === 'unwind') {
    const w = winders?.find((x) => x.winding !== 0)
    if (w) return [E(`Winder holds ${w.winding > 0 ? '+' : ''}${w.winding}. Bank ${-w.winding} on the cord, then lash.`)]
    return [E('Lash the unwound Winder.')]
  }
  if (goal.type === 'gate') {
    if (gateOpen?.[goal.n]) return [E('Gate is open — walk through.')]
    return [E(`Bank laps until the cord reads ${goal.n > 0 ? '+' : ''}${goal.n}. Beacon in the center banks your last lap.`)]
  }
  return [E('WASD to move. 4 = Winding Cord, 3 = Tide Glass, 1 = Lash.')]
}
