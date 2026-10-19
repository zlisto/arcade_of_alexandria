/**
 * World 0 · Bonus "Extension Cord" — the Cylinder Works. Four floors, one cylinder: each
 * floor is a cell complex X (drawn on X × {0}); the given motion of a subcomplex A rises up
 * the cylinder as teal columns (A × I). Gyroid extends the motion over the rest of X × I one
 * cell at a time with the Cell-Smith. Hatcher, Algebraic Topology, Chapter 0, pp. 14–15
 * (the homotopy extension property; Proposition 0.16).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })

export const OPENING = [
  E('My first machine. The floor of the cylinder is the start: a space, drawn as cells. Going up the cylinder is time.'),
  E('The teal columns are a motion someone already chose for part of the floor — the subcomplex A. Our job: extend that motion over everything else, without changing the floor.'),
  E('Hold the Cell-Smith and click a cell on the floor to raise its column.'),
]

export const FLOORS = [
  {
    name: 'Floor and Band',
    cx: {
      verts: [[-2.2, 0.4], [2.2, 0.4]],
      edges: [[0, 1]],
      faces: [],
      A: { verts: [0], edges: [] },
      move: { 0: [0, -1.8] },
    },
    intro: [E('One edge. Its left end is in A — watch its column drift as it rises. The right end is ours.')],
    done: [
      E('The right point just stays put — a point’s column only has to start in the right place. Then the edge could stretch between its two ends’ columns.'),
      E('Next floor.'),
    ],
  },
  {
    name: 'Points First',
    cx: {
      verts: [[0, -2.3], [-2.4, 1.7], [2.4, 1.7]],
      edges: [[0, 1], [1, 2], [2, 0]],
      faces: [],
      A: { verts: [1, 2], edges: [1] },
      move: { 1: [-0.7, 0.9], 2: [0.7, 0.9] },
      bow: 1.3,
    },
    intro: [E('A triangle. Its bottom edge is in A, and it bows as it moves. Points first, then the edges between them.')],
    done: [E('Each edge waited until both its ends were decided. That’s the whole rule: a cell goes after its boundary.'), E('Next floor has a disk.')],
  },
  {
    name: 'Wrong Order',
    cx: {
      verts: [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0]],
      faces: [[0, 1, 2, 3]],
      A: { verts: [2, 3], edges: [2] },
      move: { 2: [0.8, 0.9], 3: [-0.8, 0.9] },
      bow: -1.2,
    },
    intro: [E('A square with a disk in it. Go on — try the disk first.')],
    done: [
      E('Once the disk’s whole rim was moving, its column filled: a disk times time, with its floor and walls already decided. Dⁿ × I can always be squashed onto exactly that.'),
      E('Last floor: the whole house.'),
    ],
  },
  {
    name: 'Full Cylinder',
    cx: {
      verts: [[-2.2, 2.3], [2.2, 2.3], [2.2, -0.5], [-2.2, -0.5], [0, -3.1]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 2]],
      faces: [[0, 1, 2, 3], [3, 2, 4]],
      A: { verts: [0, 1, 4], edges: [0] },
      move: { 0: [-0.7, 0.6], 1: [0.7, 0.6], 4: [0, -0.9] },
      bow: 1.1,
    },
    intro: [E('A house: two disks sharing an edge. The front wall and the roof’s peak are in A. Fill the whole cylinder.')],
    done: [
      E('Every column filled. The motion of A, extended over all of X — and the floor never changed.'),
      E('That works for any cell complex and any subcomplex, one cell at a time, in order of dimension. Hatcher calls it the homotopy extension property.'),
      G('So knowing how the edge moves is enough to move the whole piece.'),
      E('The door’s open. Thank you for finding my old machine.'),
    ],
  },
]

export const HINTS0B = {
  wrongOrder: [
    E('Refused. The disk’s column has a floor and walls: its rim’s columns. Those aren’t decided yet, so there’s nothing to fill against.'),
    E('Raise the points, then the edges around it, then the disk.'),
  ],
  given: 'That cell is in A — its motion is already given (teal)',
  done: 'Already filled',
}

export const DEFINITION0B = {
  text: 'A pair (X, A) has the homotopy extension property if every map X × {0} → Y, together with a homotopy of its restriction to A, extends to a homotopy of the whole of X. Equivalently, X × {0} ∪ A × I is a retract of X × I. Every CW pair has it: extend over X × I one cell at a time, using that Dⁿ × I retracts onto Dⁿ × {0} ∪ ∂Dⁿ × I.',
  cite: 'Paraphrasing Allen Hatcher, Algebraic Topology, Chapter 0, pp. 14–15 (the homotopy extension property; Proposition 0.16).',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}
