// The Molecule Gauntlet: every molecule Kai meets in Chapter 1, with real 3D geometry
// (tetrahedral 109.5°, trigonal 120°, linear 180°; bond lengths in Å, roughly). `unlocked(save)`
// says when it is logged. `use` goes beyond the book (marked so in the menu); the rest is from it.

const len = { CH: 1.09, CC: 1.54, 'C=C': 1.34, 'C#C': 1.2, CN: 1.47, CO: 1.43, 'C=O': 1.22, OH: 0.96, NH: 1.01, HH: 0.74 }
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l) }
const add = (a, b, k = 1) => a.map((x, i) => x + b[i] * k)
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
// two unit vectors perpendicular to `axis` (u lies in the plane given by `ref` where possible)
function basis(axis, ref = [0, 1, 0]) {
  let u = cross(axis, ref)
  if (Math.hypot(...u) < 1e-3) u = cross(axis, [0, 0, 1])
  u = norm(cross(u, axis))
  return [u, norm(cross(axis, u))]
}
// directions of the other bonds on an atom whose first bond points along `axis`
const tetra = (axis, roll = 0) => { const [u, v] = basis(axis); return [0, 1, 2].map((k) => { const p = roll + (k * 2 * Math.PI) / 3; return norm(add(add(axis.map((x) => -x / 3), u, 0.943 * Math.cos(p)), v, 0.943 * Math.sin(p))) }) }
const trig = (axis, ref = [0, 1, 0]) => { const [u] = basis(axis, ref); return [1, -1].map((s) => norm(add(axis.map((x) => -x * 0.5), u, 0.866 * s))) }

function build(fn) {
  const atoms = [], bonds = []
  const at = (el, p) => (atoms.push([el, p]), atoms.length - 1)
  const from = (i, dir, el, d, order = 1) => { const j = at(el, add(atoms[i][1], dir, d)); bonds.push([i, j, order]); return j }
  fn({ at, from, atoms, bonds })
  // centre it
  const c = [0, 1, 2].map((k) => atoms.reduce((s, a) => s + a[1][k], 0) / atoms.length)
  return { atoms: atoms.map(([el, p]) => [el, p.map((x, k) => x - c[k])]), bonds }
}

const X = [1, 0, 0], NX = [-1, 0, 0]
const T = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(norm)

export const MOLECULES = [
  {
    id: 'h2', name: 'Hydrogen', formula: 'H₂', unlocked: (s) => s.introSeen,
    met: 'Hilda & Hal in Hydrogen Village, and the Energy Well (1-3)',
    shape: 'Linear', hybrid: 'No hybrids — two 1s orbitals overlap', angles: '—', section: '1.5', pages: '15–17',
    fact: 'The simplest covalent bond: two H atoms share their electron pair. Bond length 74 pm; forming it releases 436 kJ/mol.',
    use: 'A clean-burning fuel; most of the Sun is hydrogen.',
    geo: build(({ at, from }) => { const a = at('H', [0, 0, 0]); from(a, X, 'H', len.HH) }),
  },
  {
    id: 'ch4', name: 'Methane', formula: 'CH₄', unlocked: (s) => s.well,
    met: 'The seal on the village well',
    shape: 'Tetrahedral', hybrid: 'Carbon sp³', angles: 'H–C–H 109.5°', section: '1.6', pages: '17–18',
    fact: 'Four identical sp³ hybrids point to the corners of a tetrahedron. Each C–H bond is 109 pm and 439 kJ/mol.',
    use: 'The main gas in natural gas, burned for heat and power.',
    geo: build(({ at, from }) => { const c = at('C', [0, 0, 0]); T.forEach((d) => from(c, d, 'H', len.CH)) }),
  },
  {
    id: 'methylamine', name: 'Methylamine', formula: 'CH₃NH₂', unlocked: (s) => s.solved['1-3b0'],
    met: 'Bridge stone I, the Socket Bridge (1-3)',
    shape: 'Tetrahedral around C and N', hybrid: 'Carbon sp³, nitrogen sp³ (one lone pair)', angles: 'about 109° (H–N–H a little less)', section: '1.4, 1.10', pages: '12–15, 22–24',
    fact: 'Carbon makes 4 bonds, nitrogen 3 plus a lone pair. The lone pair takes up one of nitrogen\'s four sp³ orbitals.',
    use: 'A starting material for many medicines and farm chemicals.',
    geo: build(({ at, from }) => {
      const c = at('C', [0, 0, 0]); const n = from(c, X, 'N', len.CN)
      tetra(X, Math.PI / 6).forEach((d) => from(c, d, 'H', len.CH))
      tetra(NX, 0).slice(0, 2).forEach((d) => from(n, d, 'H', len.NH))
    }),
  },
  {
    id: 'ethanol', name: 'Ethanol', formula: 'CH₃CH₂OH', unlocked: (s) => s.solved['1-3b1'],
    met: 'Bridge stone II, the Socket Bridge (1-3)',
    shape: 'Tetrahedral at each carbon; bent at the oxygen', hybrid: 'Both carbons sp³, oxygen sp³ (two lone pairs)', angles: 'about 109°', section: '1.4, 1.10', pages: '12–15, 22–24',
    fact: 'Oxygen makes 2 bonds and keeps two lone pairs, so the C–O–H is bent.',
    use: 'The alcohol in drinks; also a fuel and a solvent.',
    geo: build(({ at, from }) => {
      const c1 = at('C', [0, 0, 0]); const c2 = from(c1, X, 'C', len.CC)
      tetra(X, 0).forEach((d) => from(c1, d, 'H', len.CH))
      const [dO, dH1, dH2] = tetra(NX, 0)
      const o = from(c2, dO, 'O', len.CO); from(c2, dH1, 'H', len.CH); from(c2, dH2, 'H', len.CH)
      from(o, tetra(dO.map((x) => -x), 1)[0], 'H', len.OH)
    }),
  },
  {
    id: 'formaldehyde', name: 'Formaldehyde', formula: 'CH₂O', unlocked: (s) => s.solved['1-3b2'],
    met: 'Bridge stone III, the Socket Bridge (1-3)',
    shape: 'Trigonal planar (flat)', hybrid: 'Carbon sp²', angles: 'about 120°', section: '1.8', pages: '19–21',
    fact: 'A C=O double bond: one σ bond plus one π bond from the leftover p orbitals, so the molecule is flat.',
    use: 'Used to make resins and glues, and as a preservative.',
    geo: build(({ at, from }) => { const c = at('C', [0, 0, 0]); from(c, [0, 1, 0], 'O', len['C=O'], 2); trig([0, 1, 0], [1, 0, 0]).forEach((d) => from(c, d, 'H', len.CH)) }),
  },
  {
    id: 'ethane', name: 'Ethane', formula: 'C₂H₆', unlocked: (s) => s.solved['1-4tetra'],
    met: 'The tetrahedral seal, Forge of Hybrids (1-4)',
    shape: 'Tetrahedral at each carbon', hybrid: 'Both carbons sp³', angles: '109.5°', section: '1.7', pages: '18–19',
    fact: 'Two sp³ carbons share a C–C σ bond; each also bonds three hydrogens. The two ends can rotate around the single bond.',
    use: 'Found in natural gas; turned into ethylene to make plastics.',
    geo: build(({ at, from }) => {
      const c1 = at('C', [0, 0, 0]); const c2 = from(c1, X, 'C', len.CC)
      tetra(X, 0).forEach((d) => from(c1, d, 'H', len.CH))
      tetra(NX, Math.PI / 3).forEach((d) => from(c2, d, 'H', len.CH)) // staggered
    }),
  },
  {
    id: 'ethylene', name: 'Ethylene', formula: 'C₂H₄', unlocked: (s) => s.solved['1-4pi'],
    met: 'The π door, Forge of Hybrids (1-4)',
    shape: 'Flat — all six atoms in one plane', hybrid: 'Both carbons sp²', angles: 'about 120°', section: '1.8', pages: '19–21',
    fact: 'The C=C is a σ bond plus a π bond. The π bond needs the two leftover p orbitals parallel, which keeps the molecule flat.',
    use: 'A plant hormone that ripens fruit; the raw material for polyethylene.',
    geo: build(({ at, from }) => {
      const c1 = at('C', [0, 0, 0]); const c2 = from(c1, X, 'C', len['C=C'], 2)
      trig(X, [0, 1, 0]).forEach((d) => from(c1, d, 'H', len.CH)); trig(NX, [0, 1, 0]).forEach((d) => from(c2, d, 'H', len.CH))
    }),
  },
  {
    id: 'acetylene', name: 'Acetylene', formula: 'C₂H₂', unlocked: (s) => s.solved.boss,
    met: 'The Colossus\'s last core — the sp shape (boss)',
    shape: 'Linear', hybrid: 'Both carbons sp', angles: '180°', section: '1.9', pages: '21–22',
    fact: 'The C≡C triple bond is one σ bond and two π bonds, from two leftover p orbitals on each carbon.',
    use: 'Burned with oxygen in welding torches.',
    geo: build(({ at, from }) => { const h = at('H', [0, 0, 0]); const c1 = from(h, X, 'C', len.CH); const c2 = from(c1, X, 'C', len['C#C'], 3); from(c2, X, 'H', len.CH) }),
  },
  {
    id: 'isoprene', name: 'Isoprene', formula: 'C₅H₈', unlocked: (s) => s.solved['1-5a'],
    met: 'A painting in the Skeleton Gallery (1-5)',
    shape: 'Mostly flat (four sp² carbons)', hybrid: 'Four carbons sp², the methyl carbon sp³', angles: 'about 120° along the chain', section: '1.12', pages: '25–27',
    fact: 'Two C=C double bonds. In a skeletal drawing every corner and line end is a carbon, and the hydrogens are hidden.',
    use: 'The building block of natural rubber.',
    geo: build(({ at, from }) => {
      const c1 = at('C', [0, 0, 0]); const c2 = from(c1, X, 'C', len['C=C'], 2)
      trig(X).forEach((d) => from(c1, d, 'H', len.CH))
      const [a, b] = trig(NX); const c3 = from(c2, a, 'C', 1.47); const c5 = from(c2, b, 'C', 1.5)
      const ax3 = a.map((x) => -x); const [a3, b3] = trig(ax3)
      const c4 = from(c3, a3[1] > 0 ? a3 : b3, 'C', len['C=C'], 2); from(c3, a3[1] > 0 ? b3 : a3, 'H', len.CH)
      const ax4 = norm(add([0, 0, 0], a3[1] > 0 ? a3 : b3, -1)); trig(ax4).forEach((d) => from(c4, d, 'H', len.CH))
      tetra(b.map((x) => -x), 0.4).forEach((d) => from(c5, d, 'H', len.CH))
    }),
  },
  {
    id: 'methylcyclohexane', name: 'Methylcyclohexane', formula: 'C₇H₁₄', unlocked: (s) => s.solved['1-5b'],
    met: 'A painting in the Skeleton Gallery (1-5)',
    shape: 'A six-carbon ring (puckered, "chair")', hybrid: 'All carbons sp³', angles: 'about 109.5°', section: '1.12', pages: '25–27',
    fact: 'Drawn as a hexagon with one line sticking out. Each ring corner hides 2 H, except the one holding the methyl, which hides 1.',
    use: 'A solvent, and a component of fuels.',
    geo: build(({ at, from }) => {
      const ring = []
      for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; ring.push(at('C', [Math.cos(a) * 1.45, k % 2 ? 0.25 : -0.25, Math.sin(a) * 1.45])) }
      return { ring }
    }),
  },
  {
    id: 'propene', name: 'Propene', formula: 'C₃H₆', unlocked: (s) => s.shards >= 1,
    met: 'Pi\'s challenge, before the Bond Shard',
    shape: 'Flat at the C=C; tetrahedral at the CH₃', hybrid: 'CH₃ carbon sp³; the two C=C carbons sp²', angles: '109.5° and 120°', section: '1.8', pages: '19–21',
    fact: 'One molecule can hold carbons of different hybridization: it depends on each carbon\'s own bonds.',
    use: 'The raw material for polypropylene plastic.',
    geo: build(({ at, from }) => {
      const c1 = at('C', [0, 0, 0]); const c2 = from(c1, X, 'C', len['C=C'], 2)
      trig(X).forEach((d) => from(c1, d, 'H', len.CH))
      const [a, b] = trig(NX); const c3 = from(c2, a, 'C', 1.5); from(c2, b, 'H', len.CH)
      tetra(a.map((x) => -x), 0.3).forEach((d) => from(c3, d, 'H', len.CH))
    }),
  },
]

// the ring needs its bonds and hydrogens added after the carbons are placed
;(() => {
  const m = MOLECULES.find((x) => x.id === 'methylcyclohexane')
  const atoms = m.geo.atoms, bonds = m.geo.bonds
  const C = atoms.map((_, i) => i)
  for (let k = 0; k < 6; k++) bonds.push([C[k], C[(k + 1) % 6], 1])
  const H = (i, dir, el = 'H', d = len.CH) => { atoms.push([el, add(atoms[i][1], dir, d)]); bonds.push([i, atoms.length - 1, 1]); return atoms.length - 1 }
  for (let k = 0; k < 6; k++) {
    const p = atoms[k][1]
    const up = k % 2 ? 1 : -1
    const out = norm([p[0], -up * 0.33, p[2]]) // equatorial: outward, tipped away from the axial side
    if (k === 0) { const me = H(k, out, 'C', 1.54); tetra(out.map((x) => -x), 0).forEach((d) => H(me, d)) } else H(k, out)
    H(k, [0, up, 0]) // axial
  }
})()
