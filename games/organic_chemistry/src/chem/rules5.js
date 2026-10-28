// Chemistry rules for World 5, the Mirror Palace (book Chapter 5, Stereochemistry at Tetrahedral Centers,
// pp. 135–170). Every puzzle judges against this file.

// ---------- a tetrahedral centre: four positions round a carbon
// Position 0 points up; 1–3 point down and out at 120° steps (looking from above: 1 → 2 → 3 counterclockwise).
export const TETRA = [
  [0, 1, 0],
  [0.943, -0.333, 0],
  [-0.471, -0.333, -0.816],
  [-0.471, -0.333, 0.816],
]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/**
 * R or S for groups placed at the four positions. place: [g0, g1, g2, g3] (group names); rank: { group: 1..4 }.
 * With the lowest-ranked group pointing away from the viewer, 1 → 2 → 3 clockwise is R (§5.5, Fig 5.8).
 * In vectors: (v1 × v2) · v3 < 0 ⇔ clockwise seen with v4 pointing away.
 */
export function configOf(place, rank) {
  const v = [0, 0, 0, 0]
  place.forEach((g, i) => { v[rank[g] - 1] = TETRA[i] })
  return dot(cross(v[0], v[1]), v[2]) < 0 ? 'R' : 'S'
}
/** the mirror image: swap any two groups (§5.1) */
export const reflect = (place) => [place[0], place[2], place[1], place[3]]

// ---------- §5.1–5.2 symmetry planes through a centre
// A plane containing the bonds to positions i and j swaps the other two groups. It is a symmetry plane exactly
// when those two groups are identical. The six planes are the six pairs {i, j}.
export const PLANES = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]
export function planeHolds(place, k) {
  const [i, j] = PLANES[k]
  const others = [0, 1, 2, 3].filter((x) => x !== i && x !== j)
  return place[others[0]] === place[others[1]]
}
export const isChiralCentre = (place) => new Set(place).size === 4

export const STATUES = [
  { id: 's1', name: 'Chloromethane · CH₃Cl', place: ['H', 'H', 'Cl', 'H'], start: 0, note: 'CH₃X: three identical H. Any plane through Cl and one H swaps the other two H.' },
  { id: 's2', name: 'Bromochloromethane · CH₂BrCl', place: ['H', 'Br', 'H', 'Cl'], start: 2, note: 'CH₂XY: the plane through Br and Cl swaps the two H. Achiral (Fig 5.2).' },
  { id: 's3', name: 'Propanoic acid, C2 · H, H, CH₃, CO₂H', place: ['CH₃', 'H', 'CO₂H', 'H'], start: 5, note: 'Two H on one carbon: a symmetry plane, so propanoic acid is achiral (Fig 5.5).' },
  { id: 's4', name: 'Lactic acid, C2 · H, OH, CH₃, CO₂H', place: ['CO₂H', 'OH', 'CH₃', 'H'], start: 1, note: 'Four different groups: no plane swaps two identical groups. Chiral; it has an enantiomer (Fig 5.3).' },
]
export const GROUP_COLOR = { H: '#f2f2f2', Cl: '#6fe39a', Br: '#b0503a', 'CH₃': '#ff6fb3', 'CO₂H': '#ff6a5a', OH: '#ff9a3a', 'NH₂': '#5a8aff', CHO: '#ffd04a', 'CH₂OH': '#c87aff', Ar: '#8a7aff' }

// ---------- §5.3 optical rotation: α = [α]D × l × c (l in dm, c in g/mL), Table 5.1
export const ROTATIONS = [
  { name: 'Penicillin V', a: 233 }, { name: 'Sucrose', a: 66.47 }, { name: 'Camphor', a: 44.26 }, { name: 'Chloroform', a: 0 },
  { name: 'Cholesterol', a: -31.5 }, { name: 'Morphine', a: -132 }, { name: 'Cocaine', a: -16 }, { name: 'Acetic acid', a: 0 },
]
export const observed = (spec, l, c) => +(spec * l * c).toFixed(2)

// ---------- §5.5 CIP: the lock centres, with the book's rankings and the reasons
// rank 1 = highest. why: one line per comparison that decides it.
export const LOCKS = [
  { id: '5-3a', name: 'Lactic acid', groups: ['OH', 'CO₂H', 'CH₃', 'H'], rank: { OH: 1, 'CO₂H': 2, 'CH₃': 3, H: 4 },
    why: 'O (8) beats C (6) beats H (1). Of the two carbons, CO₂H carries (O, O, O) and CH₃ (H, H, H): CO₂H first. The C=O counts as two O (rule 3).' },
  { id: '5-3b', name: 'Glyceraldehyde', groups: ['OH', 'CHO', 'CH₂OH', 'H'], rank: { OH: 1, CHO: 2, 'CH₂OH': 3, H: 4 },
    why: 'OH first (O). Between the carbons: CHO carries (O, O, H) — its C=O doubled — and CH₂OH carries (O, H, H). CHO wins at the first difference.' },
  { id: '5-5c', name: '(S)-Ibuprofen’s centre', groups: ['CO₂H', 'Ar', 'CH₃', 'H'], rank: { 'CO₂H': 1, Ar: 2, 'CH₃': 3, H: 4 },
    why: 'All three heavy groups start with C. CO₂H carries (O, O, O); the aromatic ring (Ar) carries (C, C, C); CH₃ carries (H, H, H). So CO₂H, then Ar, then CH₃, then H.' },
  { id: '5-3c', name: 'Alanine', groups: ['NH₂', 'CO₂H', 'CH₃', 'H'], rank: { 'NH₂': 1, 'CO₂H': 2, 'CH₃': 3, H: 4 },
    why: 'N (7) beats C (6) beats H (1). CO₂H (O, O, O) beats CH₃ (H, H, H).' },
]

// ---------- §5.6–5.7 two centres: enantiomer / diastereomer / identical, and meso
export function relation(a, b) {
  // a, b: ['R'|'S', 'R'|'S']
  const diff = a.filter((x, i) => x !== b[i]).length
  return diff === 0 ? 'identical' : diff === a.length ? 'enantiomers' : 'diastereomers'
}
export const flipRS = (x) => (x === 'R' ? 'S' : 'R')
/** tartaric acid: 2R,3S and 2S,3R are the same meso compound (a symmetry plane through C2–C3, Fig 5.12) */
export const isMesoTartaric = (c) => c[0] !== c[1]
