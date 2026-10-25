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


// an all-anti zigzag of n sp³ carbons (bond 1.54 Å, 109.5°), with a methyl on each carbon index in `branches`
function zigzag(n, branches = []) {
  return build(({ at, from, atoms, bonds }) => {
    const dx = 1.257, dy = 0.889
    const C = [...Array(n)].map((_, i) => at('C', [i * dx, (i % 2) * dy, 0]))
    for (let i = 0; i + 1 < n; i++) bonds.push([C[i], C[i + 1], 1])
    const p = (i) => atoms[C[i]][1]
    const sub = (a, b) => a.map((x, k) => x - b[k])
    C.forEach((ci, i) => {
      const nb = []
      if (i > 0) nb.push(norm(sub(p(i - 1), p(i))))
      if (i < n - 1) nb.push(norm(sub(p(i + 1), p(i))))
      let free
      if (nb.length === 1) free = tetra(nb[0].map((x) => x), i ? 0 : 0.5)
      else {
        const m = norm(nb[0].map((x, k) => -(x + nb[1][k]))), z = norm(cross(nb[0], nb[1]))
        free = [1, -1].map((s) => norm(add(m.map((x) => x * 0.577), z, s * 0.816)))
      }
      free.forEach((d, k) => {
        if (branches.includes(i) && k === 0) { const m = from(ci, d, 'C', len.CC); tetra(d.map((x) => -x), 0.3).forEach((h) => from(m, h, 'H', len.CH)) }
        else from(ci, d, 'H', len.CH)
      })
    })
  })
}

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
  // ---------------------------------------------------------------- Chapter 2 · the Tide Coast and Temple
  {
    id: 'water', name: 'Water', formula: 'H₂O', unlocked: (s) => s.coastSeen,
    met: 'Wanda and the water-folk of the Tide Coast',
    shape: 'Bent', hybrid: 'Oxygen sp³ (two lone pairs)', angles: 'H–O–H 104.5°', section: '2.2', pages: '40–42',
    fact: 'Oxygen is much more electronegative than hydrogen, and the molecule is bent, so the two O–H bond dipoles add up: a large dipole moment, μ = 1.85 D.',
    use: 'Covers most of the Earth; nearly every reaction in a living cell happens in it.',
    geo: build(({ at, from }) => { const o = at('O', [0, 0, 0]); const a = (104.5 / 2) * Math.PI / 180; [-1, 1].forEach((s) => from(o, [Math.sin(s * a), -Math.cos(a), 0], 'H', len.OH)) }),
  },
  {
    id: 'co2', name: 'Carbon dioxide', formula: 'CO₂', unlocked: (s) => s.solved['2-1'],
    met: 'The Tug-of-War Hall (2-1)',
    shape: 'Linear', hybrid: 'Carbon sp', angles: 'O=C=O 180°', section: '2.2', pages: '40–42',
    fact: 'Both C=O bonds are polar, but they point in exactly opposite directions and cancel. Carbon dioxide has no net dipole moment: μ = 0 D.',
    use: 'The gas you breathe out; plants build sugar from it.',
    geo: build(({ at, from }) => { const c = at('C', [0, 0, 0]); from(c, X, 'O', 1.16, 2); from(c, NX, 'O', 1.16, 2) }),
  },
  {
    id: 'nh3', name: 'Ammonia', formula: 'NH₃', unlocked: (s) => s.solved['2-1'],
    met: 'The Tug-of-War Hall (2-1)',
    shape: 'Trigonal pyramid', hybrid: 'Nitrogen sp³ (one lone pair)', angles: 'H–N–H 107.3°', section: '2.2', pages: '40–42',
    fact: 'The three N–H dipoles and the lone pair all point the same way, so ammonia has a sizable dipole moment, μ = 1.47 D.',
    use: 'Made by the million tonnes for fertilizer.',
    geo: build(({ at, from }) => { const n = at('N', [0, 0, 0]); T.slice(1).forEach((d) => from(n, d, 'H', len.NH)) }),
  },
  {
    id: 'h3o', name: 'Hydronium ion', formula: 'H₃O⁺', unlocked: (s) => s.solved['2-2'],
    met: 'The Hall of Accounts (2-2), and the Hydronium Crabs',
    shape: 'Trigonal pyramid', hybrid: 'Oxygen sp³ (one lone pair)', angles: 'a little under 109.5°', section: '2.3, 2.7', pages: '42–44, 48–49',
    fact: 'Oxygen normally makes two bonds. With three bonds and one lone pair its formal charge is 6 − 2 − 3 = +1. It is what an acid forms when it gives H⁺ to water.',
    use: 'Its concentration in water sets the pH.',
    geo: build(({ at, from }) => { const o = at('O', [0, 0, 0]); T.slice(1).forEach((d) => from(o, d, 'H', len.OH)) }),
  },
  {
    id: 'acetate', name: 'Acetate ion', formula: 'CH₃CO₂⁻', unlocked: (s) => s.solved['2-3'],
    met: 'The Resonance Tidepools (2-3)',
    shape: 'Flat at the CO₂ group', hybrid: 'Carboxylate carbon sp², methyl carbon sp³', angles: 'about 120° at the CO₂ carbon', section: '2.4–2.6', pages: '44–48',
    fact: 'Two resonance forms, but the real ion is their hybrid: both C–O bonds are 127 pm, halfway between a single and a double bond, and the negative charge is shared by both oxygens.',
    use: 'Vinegar is acetic acid in water; acetate is what is left when it gives up its H⁺.',
    geo: build(({ at, from }) => {
      const c1 = at('C', [0, 0, 0]); const me = from(c1, NX, 'C', len.CC)
      const [a, b] = trig(NX); from(c1, a, 'O', 1.27, 2); from(c1, b, 'O', 1.27)
      tetra(X, 0.4).forEach((d) => from(me, d, 'H', len.CH))
    }),
  },
  {
    id: 'bf3', name: 'Boron trifluoride', formula: 'BF₃', unlocked: (s) => s.solved['2-5'],
    met: 'The Lewis Docks (2-5)',
    shape: 'Trigonal planar (flat)', hybrid: 'Boron sp² (one empty p orbital)', angles: 'F–B–F 120°', section: '2.11', pages: '55–58',
    fact: 'Boron has only six valence electrons around it, leaving an empty p orbital. That makes BF₃ a Lewis acid: it accepts an electron pair from a Lewis base.',
    use: 'Used as a catalyst in making plastics and medicines.',
    geo: build(({ at, from }) => { const b = at('B', [0, 0, 0]); [0, 1, 2].forEach((k) => { const a = (k * 2 * Math.PI) / 3; from(b, [Math.cos(a), Math.sin(a), 0], 'F', 1.31) }) }),
  },
  {
    id: 'carbonate', name: 'Carbonate ion', formula: 'CO₃²⁻', unlocked: (s) => s.solved.boss2,
    met: 'The Resonance Hydra, boss of the Tide Temple',
    shape: 'Trigonal planar (flat)', hybrid: 'Carbon sp²', angles: 'O–C–O 120°', section: '2.4–2.6', pages: '44–48',
    fact: 'Three equivalent resonance forms, each with the C=O on a different oxygen. None of them is the real ion: the real carbonate is the hybrid, with three identical C–O bonds.',
    use: 'Limestone, chalk and seashells are calcium carbonate.',
    geo: build(({ at, from }) => { const c = at('C', [0, 0, 0]); [0, 1, 2].forEach((k) => { const a = Math.PI / 2 + (k * 2 * Math.PI) / 3; from(c, [Math.cos(a), Math.sin(a), 0], 'O', 1.28, k === 0 ? 2 : 1) }) }),
  },
  // ---------------------------------------------------------------- Chapter 3 · the Chain Labyrinth
  {
    id: 'dme', name: 'Dimethyl ether', formula: 'CH₃OCH₃', unlocked: (s) => !!(s.t3placed && s.t3placed.dme),
    met: 'The Hall of Families (3-1)',
    shape: 'Bent at the oxygen; tetrahedral at each carbon', hybrid: 'Carbons sp³, oxygen sp³ (two lone pairs)', angles: 'C–O–C about 110°', section: '3.1, 3.2', pages: '72–81',
    fact: 'An ether: its oxygen sits between two carbons. It has the same formula as ethanol, C₂H₆O, but different connections: a constitutional isomer in a different family.',
    use: 'Studied as a clean-burning fuel and used as an aerosol propellant.',
    geo: build(({ at, from }) => {
      const o = at('O', [0, 0, 0]); const a = (110 / 2) * Math.PI / 180
      ;[-1, 1].forEach((s) => { const d = [Math.sin(s * a), -Math.cos(a), 0]; const c = from(o, d, 'C', len.CO); tetra(d.map((x) => -x), s * 0.5).forEach((h) => from(c, h, 'H', len.CH)) })
    }),
  },
  {
    id: 'pentane', name: 'Pentane', formula: 'C₅H₁₂', unlocked: (s) => s.solved['3-2a'],
    met: 'The Isomer Garden (3-2)',
    shape: 'Zigzag chain', hybrid: 'All carbons sp³', angles: 'about 109.5°', section: '3.2, 3.5', pages: '78–81, 89–90',
    fact: 'The straight-chain C₅H₁₂. Its long shape gives more surface for dispersion forces than its branched isomers: it boils at 36.1 °C.',
    use: 'A solvent, and a blowing agent for foam plastics.',
    geo: zigzag(5),
  },
  {
    id: 'isopentane', name: '2-Methylbutane', formula: 'C₅H₁₂', unlocked: (s) => s.solved['3-2a'],
    met: 'The Isomer Garden (3-2)',
    shape: 'Branched chain', hybrid: 'All carbons sp³', angles: 'about 109.5°', section: '3.2, 3.4', pages: '78–89',
    fact: 'Also called isopentane. A four-carbon parent chain with a methyl on carbon 2 — and its carbon 2 is tertiary (3°).',
    use: 'Found in gasoline and used as a solvent.',
    geo: zigzag(4, [1]),
  },
  {
    id: 'neopentane', name: '2,2-Dimethylpropane', formula: 'C₅H₁₂', unlocked: (s) => s.solved['3-2a'],
    met: 'The Isomer Garden (3-2)',
    shape: 'A central carbon with four carbons around it', hybrid: 'All carbons sp³', angles: 'C–C–C 109.5°', section: '3.2, 3.3, 3.5', pages: '78–90',
    fact: 'Neopentane: its central carbon is quaternary (4°). Compact and nearly spherical, it has little surface for dispersion forces and boils at only 9.5 °C.',
    use: 'A gas on a warm day — the textbook case of branching lowering a boiling point.',
    geo: build(({ at, from }) => { const c = at('C', [0, 0, 0]); T.forEach((d, k) => { const m = from(c, d, 'C', len.CC); tetra(d.map((x) => -x), k).forEach((h) => from(m, h, 'H', len.CH)) }) }),
  },
  {
    id: 'isobutane', name: 'Isobutane', formula: 'C₄H₁₀', unlocked: (s) => s.t3shelf,
    met: 'Iupaca\'s Shelf of Ten lesson',
    shape: 'Three carbons around a central one', hybrid: 'All carbons sp³', angles: '109.5°', section: '3.2', pages: '78–81',
    fact: 'Also called 2-methylpropane. Same formula as butane, C₄H₁₀, but branched: the book\'s first pair of constitutional isomers.',
    use: 'A refrigerant gas and an aerosol propellant.',
    geo: zigzag(3, [1]),
  },
  {
    id: 'hexane', name: 'Hexane', formula: 'C₆H₁₄', unlocked: (s) => s.t3forestBats,
    met: 'The bats\' roost by the Library of Names (a secret)',
    shape: 'Zigzag chain (all anti)', hybrid: 'All carbons sp³', angles: 'about 109.5°', section: '3.2, 3.7', pages: '78–81, 92–96',
    fact: 'Six carbons in a row. Like the decane of Fig 3.11, its most stable shape is the all-anti zigzag. C₆H₁₄ has five constitutional isomers; hexane is a component of gasoline.',
    use: 'A common lab solvent, used to extract oils from seeds.',
    geo: zigzag(6),
  },
  {
    id: 'butane', name: 'Butane', formula: 'C₄H₁₀', unlocked: (s) => s.solved['3-4c'] || s.solved.boss3,
    met: 'The butane door, and the Gauche Serpent',
    shape: 'Zigzag (shown anti)', hybrid: 'All carbons sp³', angles: 'about 109.5°', section: '3.7', pages: '92–96',
    fact: 'Rotating about C2–C3: anti (CH₃ groups 180° apart) is lowest; gauche is 3.8 kJ/mol higher; eclipsed CH₃↔CH₃ is 19 kJ/mol higher.',
    use: 'Lighter fuel and camping-stove gas.',
    geo: zigzag(4),
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
