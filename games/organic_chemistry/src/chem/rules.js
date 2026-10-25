// Chemistry rules used by every puzzle. One place, so the chemistry stays checkable.
// Each rule cites the book section it comes from (McMurry, Organic Chemistry 10e, OpenStax).

export const ELEMENTS = {
  H: { z: 1, name: 'Hydrogen', valence: 1, color: '#f4f4f4', group: '1A' },
  C: { z: 6, name: 'Carbon', valence: 4, color: '#2b2b2b', group: '4A' },
  N: { z: 7, name: 'Nitrogen', valence: 3, color: '#3b6fe0', group: '5A' },
  O: { z: 8, name: 'Oxygen', valence: 2, color: '#e0453b', group: '6A' },
  F: { z: 9, name: 'Fluorine', valence: 1, color: '#7fdc6a', group: '7A' },
  Cl: { z: 17, name: 'Chlorine', valence: 1, color: '#3fbf4f', group: '7A' },
}
export const BY_Z = Object.fromEntries(Object.entries(ELEMENTS).map(([sym, e]) => [e.z, sym]))

// §1.1 — an atom is identified by Z (protons); A = protons + neutrons; isotopes share Z.
// names for the other light elements, so the forge can name anything the player builds (Z 1–10)
const OTHER_Z = { 2: ['He', 'Helium'], 3: ['Li', 'Lithium'], 4: ['Be', 'Beryllium'], 5: ['B', 'Boron'], 10: ['Ne', 'Neon'] }

export function identifyAtom({ protons, neutrons, electrons }) {
  const sym = BY_Z[protons] || null
  return {
    symbol: sym || OTHER_Z[protons]?.[0] || null,
    name: sym ? ELEMENTS[sym].name : OTHER_Z[protons]?.[1] || null,
    z: protons,
    massNumber: protons + neutrons,
    charge: protons - electrons,
  }
}

// Naturally occurring isotopes the game accepts (natural carbon 12, 13; 14 is trace; §1.1 mentions all three).
export const KNOWN_ISOTOPES = { 1: [1, 2, 3], 6: [12, 13, 14], 7: [14, 15], 8: [16, 17, 18] }

// §1.3 — orbitals in Aufbau order for the first two shells (enough for H–Ne).
export const ORBITALS = [
  { id: '1s', shell: 1, kind: 's', boxes: 1 },
  { id: '2s', shell: 2, kind: 's', boxes: 1 },
  { id: '2p', shell: 2, kind: 'p', boxes: 3 },
]

/**
 * Check an orbital-box filling against the three rules of §1.3.
 * fill: { '1s': [[up, down]], '2s': [[up,down]], '2p': [[up,down],[up,down],[up,down]] } with booleans.
 * Returns { ok, rule, message }.
 */
export function checkConfiguration(fill, electrons) {
  const order = ORBITALS
  let count = 0
  for (const orb of order) for (const box of fill[orb.id]) count += (box[0] ? 1 : 0) + (box[1] ? 1 : 0)
  // Pauli: a down electron can only pair with an up electron in the same box (two per orbital, opposite spins).
  for (const orb of order) {
    for (const box of fill[orb.id]) {
      if (box[1] && !box[0]) return { ok: false, rule: 'Pauli', message: 'Pauli exclusion principle: an orbital holds at most two electrons, and they must have opposite spins. Put the up-spin electron in first.' }
    }
  }
  // Aufbau: no electron in a higher orbital while a lower one has room.
  for (let i = 0; i < order.length; i++) {
    const lowerFull = order.slice(0, i).every((o) => fill[o.id].every((b) => b[0] && b[1]))
    const used = fill[order[i].id].some((b) => b[0] || b[1])
    if (used && !lowerFull) return { ok: false, rule: 'Aufbau', message: `Aufbau principle: the lowest-energy orbitals fill first. Fill ${order.slice(0, i).map((o) => o.id).join(' and ')} before using ${order[i].id}.` }
  }
  // Hund: within the 2p set, don't pair until every box has one electron.
  const p = fill['2p']
  const singles = p.filter((b) => b[0]).length
  const paired = p.filter((b) => b[0] && b[1]).length
  if (paired > 0 && singles < 3) return { ok: false, rule: 'Hund', message: "Hund's rule: when orbitals have equal energy, put one electron in each (spins parallel) before pairing any." }
  if (count !== electrons) return { ok: false, rule: 'count', message: `This atom needs ${electrons} electrons; you have placed ${count}.` }
  return { ok: true, rule: null, message: 'Ground-state configuration correct.' }
}

export function configString(fill) {
  return ORBITALS.map((o) => {
    const n = fill[o.id].reduce((s, b) => s + (b[0] ? 1 : 0) + (b[1] ? 1 : 0), 0)
    return n ? `${o.id}${"⁰¹²³⁴⁵⁶"[n]}` : ''
  }).filter(Boolean).join(' ')
}

// §1.4 — number of covalent bonds = electrons needed to reach a noble-gas octet (H: 2).
export function bondsNeeded(symbol) {
  return ELEMENTS[symbol].valence
}

/**
 * §1.4 — a molecule graph is valid when every atom's bond count (double bonds count 2) equals its valence.
 * atoms: [symbol], bonds: [[i, j, order]]
 */
export function checkOctets(atoms, bonds) {
  const got = atoms.map(() => 0)
  for (const [i, j, order] of bonds) { got[i] += order; got[j] += order }
  const bad = atoms.map((s, i) => ({ s, i, need: ELEMENTS[s].valence, got: got[i] })).filter((x) => x.need !== x.got)
  return { ok: bad.length === 0, bad }
}

// §1.6–1.9 — hybridization from the number of σ-bonded neighbors + lone pairs (steric number) for C, N, O.
// For carbon: 4 single bonds → sp3 (109.5°); one double bond → sp2 (120°); triple bond or two doubles → sp (180°).
export const HYBRIDS = {
  sp3: { angle: 109.5, shape: 'tetrahedral', pBonds: 0, label: 'sp³' },
  sp2: { angle: 120, shape: 'trigonal planar', pBonds: 1, label: 'sp²' },
  sp: { angle: 180, shape: 'linear', pBonds: 2, label: 'sp' },
}
export function carbonHybridization(bondOrders) {
  // bondOrders: orders of the bonds on one carbon, e.g. [1,1,1,1] or [2,1,1] or [3,1]
  const pi = bondOrders.reduce((s, o) => s + (o - 1), 0)
  return pi === 0 ? 'sp3' : pi === 1 ? 'sp2' : 'sp'
}

// §1.5 — H–H: bond length 74 pm at the energy minimum; bond strength 436 kJ/mol.
// A Morse-like curve for the energy-well puzzle (shape only; the minimum and depth match the book's numbers).
export const H2 = { length: 74, depth: 436 }
export function h2Energy(rPm) {
  const a = 0.019 // width parameter (per pm), chosen so the well looks like Figure 1.10
  const x = Math.exp(-a * (rPm - H2.length))
  return H2.depth * (1 - x) * (1 - x) - H2.depth // kJ/mol, 0 at infinity, −436 at 74 pm
}

// §1.12 — skeletal structures: a carbon at every vertex/end; H count = 4 − (bond orders drawn).
export function hydrogensOnCarbon(bondOrders) {
  return 4 - bondOrders.reduce((s, o) => s + o, 0)
}
