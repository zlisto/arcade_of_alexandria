// Chemistry rules for World 12, the Observatory of Light (book Chapter 12, Structure Determination: Mass
// Spectrometry and Infrared Spectroscopy, pp. 385–418). Every puzzle judges against this file.
// Bands follow Table 12.1 (pp. 401–402) and §12.8 (pp. 404–408); masses are the book's or nominal sums (C 12, H 1,
// O 16, N 14, ³⁵Cl, ⁷⁹Br); exact masses are summed from the isotope masses the book prints (p. 388).

/** a shuffled copy (Fisher–Yates); panels call it once per mount, scenes once per visit */
export const shuffled = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }
/** how long a toast or a panel's feedback stays up: long enough to read */
export const readMs = (t) => Math.max(3200, Math.round((String(t).split(/\s+/).length / 3.5) * 1000) + 800)
/** compounds the chapter never prints by name carry a †; the codex says why */
export const UNPRINTED = ['propanal', 'methyl vinyl ether', 'methyl acetate', '1-butanol']
export const shown = (name) => (UNPRINTED.includes(name) ? `${name} †` : name)
/** a different random index from cur (when there is more than one) */
export const reroll = (n, cur) => { if (n < 2) return cur; let x = cur; while (x === cur) x = Math.floor(Math.random() * n); return x }

// ---------- §12.5 the electromagnetic spectrum, lowest energy first (Fig 12.17; ε = hν = hc/λ)
export const EM = ['radio waves', 'microwaves', 'infrared', 'visible', 'ultraviolet', 'X rays', 'gamma rays']

// ---------- §12.2 hexane: M⁺ 86; what each fragment lost (Figs 12.6–12.7, p. 389)
export const HEXANE = { M: 86, peaks: [
  { mz: 71, lost: 'CH₃' }, { mz: 57, lost: 'C₂H₅', base: true }, { mz: 43, lost: 'C₃H₇' }, { mz: 29, lost: 'C₄H₉' },
] }
export const LOSSES = ['CH₃', 'C₂H₅', 'C₃H₇', 'C₄H₉', 'H₂O']
// the two unlabeled C₇H₁₄ samples (Worked Example 12.1, pp. 390–391): which sample is which, and which compound is
// asked for, are dealt per mount. Their spectra are MS.methylcyclohexane (the book's sample B) and MS.ethylcyclopentane (A)
export const SAMPLES = { M: 98 }

// ---------- mass spectra as the book draws them: bar graphs, [m/z, relative abundance %]. Book spectra are read off
// the figures (to about ±2%); peaks under 1% are left out. A spectrum with built: true (†) is one the book never draws:
// it holds only what the book states or its rules give (M⁺ from the formula, M + 1 at 1.10% per carbon, p. 389, and for
// cyclohexanol the dehydration peak at M − 18, p. 392), with illustrative heights.
export const MS = {
  propane: { M: 44, fig: 'Fig 12.4', peaks: [[15, 12], [26, 4], [27, 30], [28, 61], [29, 100], [30, 2], [37, 2], [38, 3], [39, 16], [40, 2], [41, 14], [42, 6], [43, 33], [44, 38], [45, 1]] },
  hexane: { M: 86, fig: 'Fig 12.6', peaks: [[26, 1], [27, 20], [28, 4], [29, 38], [30, 1], [37, 1], [38, 1], [39, 12], [40, 3], [41, 59], [42, 37], [43, 70], [44, 3], [51, 1], [53, 2], [55, 6], [56, 47], [57, 100], [58, 5], [71, 6], [86, 14], [87, 1]] },
  ethylcyclopentane: { M: 98, fig: 'Fig 12.8, sample A', peaks: [[26, 2], [27, 37], [28, 10], [29, 26], [30, 1], [38, 1], [39, 37], [40, 7], [41, 97], [42, 53], [43, 10], [50, 1], [51, 2], [52, 1], [53, 7], [54, 7], [55, 57], [56, 54], [57, 7], [65, 1], [66, 1], [67, 11], [68, 73], [69, 100], [70, 54], [71, 2], [77, 1], [83, 7], [84, 1], [97, 1], [98, 16], [99, 1]] },
  methylcyclohexane: { M: 98, fig: 'Fig 12.8, sample B', peaks: [[26, 2], [27, 29], [28, 8], [29, 20], [38, 1], [39, 27], [40, 5], [41, 60], [42, 35], [43, 8], [50, 1], [51, 2], [52, 1], [53, 7], [54, 6], [55, 83], [56, 30], [57, 5], [65, 1], [66, 1], [67, 5], [68, 10], [69, 23], [70, 21], [71, 1], [77, 1], [79, 1], [81, 1], [82, 14], [83, 100], [84, 6], [97, 2], [98, 44], [99, 4]] },
  triethylamine: { M: 101, fig: 'Fig 12.11', peaks: [[14, 1], [15, 11], [18, 5], [26, 5], [27, 27], [28, 22], [29, 23], [30, 34], [31, 1], [39, 2], [40, 1], [41, 5], [42, 18], [43, 3], [44, 14], [45, 1], [54, 2], [55, 1], [56, 8], [57, 2], [58, 26], [59, 1], [70, 4], [71, 1], [72, 3], [73, 1], [84, 1], [86, 100], [87, 6], [100, 7], [101, 16], [102, 1]] },
  chloroethane: { M: 64, fig: 'Fig 12.12', peaks: [[25, 5], [26, 28], [27, 75], [28, 91], [29, 85], [30, 2], [31, 1], [35, 4], [36, 3], [37, 2], [47, 2], [48, 4], [49, 25], [50, 1], [51, 8], [62, 4], [63, 6], [64, 100], [65, 4], [66, 31], [67, 1]] },
  '1-bromohexane': { M: 164, fig: 'Fig 12.13', peaks: [[15, 1], [26, 1], [27, 17], [28, 3], [29, 17], [39, 10], [40, 1], [41, 36], [42, 36], [43, 100], [44, 3], [53, 2], [54, 1], [55, 33], [56, 16], [57, 20], [58, 1], [69, 5], [70, 1], [71, 1], [83, 1], [84, 1], [85, 48], [86, 3], [93, 1], [95, 1], [107, 4], [108, 1], [109, 4], [121, 1], [135, 50], [136, 2], [137, 49], [138, 2], [164, 2], [166, 2]] },
  cyclohexylamine: { M: 99, built: true, peaks: [[99, 100], [100, 7]] },
  cyclohexanol: { M: 100, built: true, peaks: [[82, 100], [83, 7], [100, 30], [101, 2]] },
  C3H6O: { M: 58, built: true, peaks: [[58, 100], [59, 3]] },
  C3H6O2: { M: 74, built: true, peaks: [[74, 100], [75, 3]] },
  C4H10O: { M: 74, built: true, peaks: [[74, 100], [75, 4]] },
}
/** a window on the M⁺ region, 12 m/z wide, whose left edge is dealt at random so the window never marks where M sits */
export const msWindow = (M) => { const lo = M - 6 - Math.floor(Math.random() * 4); return [lo, lo + 12] }
/** the whole spectrum's range, as the book's figures draw it */
export const msRange = (M) => [10, Math.max(60, Math.ceil((M + 8) / 10) * 10)]

// ---------- §12.3 isotope plaques: each shows its M⁺ region as a bar graph (never a name). Five of these are dealt
// per visit for the four doors, at least one per door, so one door takes two and the last plaque is never forced
export const PLAQUES = [
  { id: 'chloroethane', door: 'chlorine' },
  { id: '1-bromohexane', door: 'bromine' },
  { id: 'triethylamine', door: 'nitrogen' },
  { id: 'cyclohexylamine', door: 'nitrogen' },
  { id: 'hexane', door: 'none of the three' },
  { id: 'propane', door: 'none of the three' },
  { id: 'methylcyclohexane', door: 'none of the three' },
]
export const N_PLAQUES = 5
const DOORS = ['chlorine', 'bromine', 'nitrogen', 'none of the three']
/** a visit's plaques: every placed one kept, then one for each door still missing, then random ones up to five */
export const dealPlaques = (placed = {}) => {
  const out = PLAQUES.filter((p) => placed[p.id]).map((p) => p.id)
  const door = (id) => PLAQUES.find((p) => p.id === id).door
  DOORS.forEach((d) => { if (!out.some((id) => door(id) === d)) { const c = shuffled(PLAQUES.filter((p) => p.door === d && !out.includes(p.id))); if (c.length) out.push(c[0].id) } })
  shuffled(PLAQUES).forEach((p) => { if (out.length < N_PLAQUES && !out.includes(p.id)) out.push(p.id) })
  return shuffled(out.slice(0, N_PLAQUES))
}
// what each door asks for (said when a plaque slides off it; it never names the plaque that belongs there)
export const DOOR_RULE = {
  chlorine: 'The chlorine door wants an M + 2 peak about a third as tall as M: ³⁵Cl and ³⁷Cl are about 3 : 1.',
  bromine: 'The bromine door wants M and M + 2 nearly equal: ⁷⁹Br and ⁸¹Br are about 50 : 50.',
  nitrogen: 'The nitrogen door wants an odd molecular weight: an odd number of nitrogens (the nitrogen rule).',
  'none of the three': 'This door wants no M + 2 twin and an even weight: no Cl, no Br, and zero or two N.',
}
export const PLAQUE_NOTE = {
  chlorine: '³⁵Cl : ³⁷Cl is about 3 : 1, so M : M + 2 is 3 : 1 (Fig 12.12).',
  bromine: '⁷⁹Br and ⁸¹Br are 50.7 : 49.3, so M and M + 2 are nearly equal (Fig 12.13).',
  nitrogen: 'An odd molecular weight: an odd number of nitrogens.',
  'none of the three': 'No twin at M + 2 and an even weight: no Cl, no Br, no lone N.',
}

// ---------- §12.5–12.6 the dome: which radiation makes bonds stretch and bend? (Problems 12-5, 12-6)
// IR used by chemists: 2.5 × 10⁻⁶ to 2.5 × 10⁻⁵ m (4000–400 cm⁻¹), pp. 399–400; c = 3.00 × 10⁸ m/s (p. 397), so in
// frequency that band runs from 1.2 × 10¹³ to 1.2 × 10¹⁴ Hz. lam (m) orders the beams by energy (ε = hc/λ).
// The two IR frequencies are worked out (ν = c/λ for Problem 12-6e's and 12-5's wavelengths); the book prints neither.
export const BEAMS_IR = [
  { t: 'λ = 2.0 × 10⁻⁵ m', lam: 2.0e-5, src: 'Problem 12-6e' },
  { t: 'λ = 9.0 × 10⁻⁶ m', lam: 9.0e-6, src: 'Problem 12-5' },
  { t: 'ν = 1.5 × 10¹³ Hz', lam: 2.0e-5, nu: true, src: '† c/λ for Problem 12-6e’s 2.0 × 10⁻⁵ m' },
  { t: 'ν = 3.3 × 10¹³ Hz', lam: 9.1e-6, nu: true, src: '† c/λ for Problem 12-5’s 9.0 × 10⁻⁶ m' },
]
export const BEAMS_OTHER = [
  { t: 'λ = 3.0 × 10⁻⁹ m', lam: 3.0e-9, why: 'That one is far shorter than 2.5 × 10⁻⁶ m: X rays, far too fierce for a bond to ring.' },
  { t: 'λ = 5.0 × 10⁻¹¹ m', lam: 5.0e-11, why: 'That is a gamma ray, the fiercest light there is.' },
  { t: 'ν = 6.0 × 10¹⁵ Hz', lam: 5.0e-8, nu: true, why: 'That frequency is above visible light: ultraviolet, which lifts electrons between orbitals.' },
  { t: 'ν = 7.0 × 10¹⁴ Hz', lam: 4.3e-7, nu: true, why: 'λ = c/ν ≈ 4.3 × 10⁻⁷ m: visible light (3.8 to 7.8 × 10⁻⁷ m), just short of the infrared.' },
  { t: 'ν = 4.0 × 10⁹ Hz', lam: 7.5e-2, nu: true, why: 'λ = c/ν ≈ 7.5 cm: far longer than 2.5 × 10⁻⁵ m. Too gentle; bonds won’t answer it.' },
  { t: 'ν = 1.0 × 10¹¹ Hz', lam: 3.0e-3, nu: true, why: 'λ = c/ν = 3.0 × 10⁻³ m: microwaves (Problem 12-6f), a hundred times longer than 2.5 × 10⁻⁵ m. Too gentle for the bonds.' },
  // near misses stated as wavelengths, so a λ deal is never "pick the only λ that isn't absurd": read the exponent against 2.5 × 10⁻⁶ to 2.5 × 10⁻⁵ m
  { t: 'λ = 3.0 × 10⁻³ m', lam: 3.0e-3, near: true, why: '3.0 × 10⁻³ m is longer than 2.5 × 10⁻⁵ m: microwaves (Problem 12-6f †), too gentle for the bonds.' },
  { t: 'λ = 5.0 × 10⁻⁷ m', lam: 5.0e-7, near: true, why: '5.0 × 10⁻⁷ m is shorter than 2.5 × 10⁻⁶ m: visible light (3.8 to 7.8 × 10⁻⁷ m), just past the infrared’s short end.' },
]

// ---------- §12.7–12.8 IR bands (Table 12.1) and the bells: five of these hang per visit
// a band: at (cm⁻¹), w (width), s (depth). Charts show no labels: the positions must be read off the axis. Every chart is
// built fresh from pieces, each band jittered inside its Table 12.1 range, with a few weak fingerprint dips, so no
// family has a fixed silhouette and the bells and the boss never share a drawing
const J = (lo, hi) => lo + Math.random() * (hi - lo)
const IR_PIECES = {
  ch: () => [{ at: J(2925, 2960), w: 56, s: J(0.5, 0.62) }], // alkane C–H, 2850–2960 (kept clear of the aldehyde's 2850)
  oh: () => [{ at: J(3420, 3520), w: J(220, 270), s: J(0.72, 0.85) }], // alcohol O–H, 3400–3650, strong and broad
  co: () => [{ at: J(1050, 1150), w: 50, s: J(0.55, 0.7) }], // alcohol C–O, 1050–1150
  yneH: () => [{ at: J(3295, 3305), w: 24, s: 0.8 }], // ≡C–H, 3300, strong and sharp
  yne: () => [{ at: J(2100, 2260), w: 30, s: J(0.4, 0.55) }], // C≡C, 2100–2260
  ketone: () => [{ at: J(1708, 1722), w: 30, s: 0.95 }], // ketone C=O, 1715
  ald: () => [{ at: J(1725, 1735), w: 30, s: 0.95 }, { at: J(2745, 2755), w: 22, s: 0.35 }, { at: J(2845, 2855), w: 22, s: 0.35 }], // 1730; C–H at 2750 and 2850 (p. 407)
  ester: () => [{ at: J(1732, 1742), w: 30, s: 0.95 }, { at: J(1200, 1280), w: 55, s: 0.75 }, { at: J(1030, 1100), w: 45, s: 0.6 }], // 1735; two C–O in 1300–1000 (p. 408)
  acid: () => [{ at: J(2780, 2860), w: 560, s: 0.6 }, { at: J(1705, 1720), w: 34, s: 0.95 }], // O–H 2500–3100, broad; C=O 1710
  nh2: () => { const c = J(3340, 3420); return [{ at: c + 36, w: 24, s: 0.4 }, { at: c - 36, w: 24, s: 0.4 }] }, // two N–H, 3300–3500 (Fig 12.26)
  ene: () => [{ at: J(3030, 3095), w: 24, s: 0.35 }, { at: J(1645, 1675), w: 24, s: 0.4 }], // =C–H 3020–3100; C=C 1640–1680
  bends: () => [{ at: 990, w: 18, s: 0.55 }, { at: 910, w: 18, s: 0.6 }], // a monosubstituted alkene's bends (p. 404)
  nitro: () => [{ at: J(1535, 1545), w: 30, s: 0.95 }], // NO₂, 1540, strong (the only nitro band Table 12.1 gives)
  ccl: () => [{ at: J(650, 780), w: 50, s: 0.7 }], // C–Cl, 600–800
  cbr: () => [{ at: J(515, 590), w: 40, s: 0.7 }], // C–Br, 500–600
  cn: () => [{ at: J(1060, 1220), w: 50, s: 0.5 }], // C–N, 1030–1230
}
/** a fresh spectrum for these pieces: every band jittered in its range, plus 2–4 weak fingerprint dips at 820–1400 */
export const irBands = (pieces) => [
  ...pieces.flatMap((k) => IR_PIECES[k]()),
  ...Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({ at: J(820, 1400), w: J(14, 30), s: J(0.06, 0.16) })),
]
export const FAMILIES = ['alcohol', 'terminal alkyne', 'ketone', 'aldehyde', 'ester', 'carboxylic acid', 'amine', 'alkene', 'nitro compound']
export const BELLS = [
  { id: 'b1', family: 'alcohol', ir: ['oh', 'ch', 'co'], why: 'A broad, strong band at 3400–3650 and no C=O: an alcohol’s hydrogen-bonded O–H.' },
  { id: 'b2', family: 'terminal alkyne', ir: ['yneH', 'ch', 'yne'], why: 'A sharp band at 3300 and another at 2100–2260: ≡C–H and C≡C, a terminal alkyne.' },
  { id: 'b3', family: 'ketone', ir: ['ch', 'ketone'], why: 'A strong C=O near 1715, inside 1670–1780, with no aldehyde C–H at 2750 and no C–O bands: a ketone.' },
  { id: 'b4', family: 'aldehyde', ir: ['ch', 'ald'], why: 'C=O near 1730 plus the aldehyde C–H pair at 2750 and 2850.' },
  { id: 'b5', family: 'ester', ir: ['ch', 'ester'], why: 'C=O near 1735 and two strong C–O bands between 1300 and 1000: an ester.' },
  { id: 'b6', family: 'carboxylic acid', ir: ['acid'], why: 'A very broad O–H from 2500 to 3100 under a strong C=O near 1710: a carboxylic acid.' },
  { id: 'b7', family: 'amine', ir: ['nh2', 'ch'], why: 'Two sharp, modest bands at 3300–3500: the N–H stretches of a primary amine.' },
  { id: 'b8', family: 'alkene', ir: ['ene', 'ch', 'bends'], why: '=C–H at 3020–3100 and C=C at 1640–1680, with bends at 990 and 910: an alkene.' },
  { id: 'b9', family: 'nitro compound', ir: ['ch', 'nitro'], why: 'One strong band near 1540, below the whole C=O range (1670–1780): NO₂, a nitro group (Table 12.1). It looks like a ketone until you read the axis.' },
]
export const N_BELLS = 5
// the ketone and the nitro bell hang together whenever there's room: their charts differ only in where the dip sits
export const BELL_PAIR = ['b3', 'b9']

// ---------- the boss: the Disguised Sorcerer. A pool of rounds, three ideas: same weight, IR decides ('ir'); the M + 2
// twin and the nitrogen rule decide ('iso'); the fragments decide ('frag'). Each round keeps one option set and deals
// one of several variants, each with a different answer, so a miss (which re-deals) rules nothing out. Every option is
// the answer in at least one variant.
// ms = the spectrum (MS key) both crystals read. The weighing crystal shows its M⁺ region (M⁺, and any M + 2 twin);
// the second crystal is named for its clue: c2 'exact' = the high-resolution crystal (an exact mass), 'frag' = the
// fragment crystal (the whole bar graph). ir = the pieces the Lens draws, fresh each time
export const C2_NAME = { exact: 'the high-resolution crystal', frag: 'the fragment crystal' }
export const C2_SHORT = { exact: 'exact mass', frag: 'fragments' }
export const SORC_POOL = [
  { id: 'c3h6o', idea: 'ir', opts: ['acetone', '2-propen-1-ol', 'propanal', 'methyl vinyl ether'],
    sig: {
      acetone: 'Acetone would show one strong C=O near 1715 and nothing above 3000.',
      '2-propen-1-ol': '2-Propen-1-ol would show a broad O–H near 3500 and C=C near 1660.',
      propanal: 'An aldehyde would show its C–H pair at 2750 and 2850 beside the C=O.',
      'methyl vinyl ether': 'An ether with a C=C would show =C–H at 3020–3100 and C=C at 1640–1680, but no O–H.',
    },
    variants: [
      { answer: 'acetone', ms: 'C3H6O', c2: 'exact', mass: '58.0419', ir: ['ch', 'ketone'] },
      { answer: '2-propen-1-ol', ms: 'C3H6O', c2: 'exact', mass: '58.0419', ir: ['oh', 'ene', 'ch', 'co'] },
      { answer: 'propanal', ms: 'C3H6O', c2: 'exact', mass: '58.0419', ir: ['ch', 'ald'] },
      { answer: 'methyl vinyl ether', ms: 'C3H6O', c2: 'exact', mass: '58.0419', ir: ['ene', 'ch'] },
    ] },
  { id: 'm74', idea: 'ir', opts: ['CH₃CH₂CO₂H', 'HOCH₂CH₂CHO', 'methyl acetate', '1-butanol'],
    sig: {
      'CH₃CH₂CO₂H': 'A carboxylic acid would show C=O near 1710 under a very broad O–H from 2500 to 3100 (Problem 12-8c †).',
      'HOCH₂CH₂CHO': 'That one would show an alcohol’s broad O–H at 3400–3650, a C=O near 1730 and C–H at 2750 (Problem 12-8c †).',
      'methyl acetate': 'An ester would show C=O near 1735 and strong C–O bands at 1300–1000, with no O–H.',
      '1-butanol': '1-Butanol is C₄H₁₀O: its exact mass is 74.0732, and it has O–H but no C=O.',
    },
    variants: [
      { answer: 'CH₃CH₂CO₂H', ms: 'C3H6O2', c2: 'exact', mass: '74.0368', ir: ['acid'] },
      { answer: 'HOCH₂CH₂CHO', ms: 'C3H6O2', c2: 'exact', mass: '74.0368', ir: ['oh', 'ch', 'ald'] },
      { answer: 'methyl acetate', ms: 'C3H6O2', c2: 'exact', mass: '74.0368', ir: ['ch', 'ester'] },
      { answer: '1-butanol', ms: 'C4H10O', c2: 'exact', mass: '74.0732', ir: ['oh', 'ch', 'co'] },
    ] },
  { id: 'iso', idea: 'iso', opts: ['chloroethane', '1-bromohexane', 'triethylamine', 'cyclohexylamine'],
    sig: {
      chloroethane: 'Chlorine (³⁵Cl : ³⁷Cl ≈ 3 : 1) would put an M + 2 peak a third as tall as M.',
      '1-bromohexane': 'Bromine’s isotopes, nearly 50 : 50, would make M and M + 2 about equal.',
      triethylamine: 'Triethylamine, (CH₃CH₂)₃N, has one N, so an odd weight, and no N–H to show at 3300–3500 †.',
      cyclohexylamine: 'A primary amine would show two sharp N–H bands at 3300–3500, and one N makes its weight odd.',
    },
    variants: [
      { answer: 'chloroethane', ms: 'chloroethane', c2: 'frag', ir: ['ch', 'ccl'] },
      { answer: '1-bromohexane', ms: '1-bromohexane', c2: 'frag', ir: ['ch', 'cbr'] },
      { answer: 'triethylamine', ms: 'triethylamine', c2: 'frag', ir: ['ch', 'cn'] },
      { answer: 'cyclohexylamine', ms: 'cyclohexylamine', c2: 'frag', ir: ['nh2', 'ch', 'cn'] }, // one c2 per round, so the crystal's name never gives the answer
    ] },
  { id: 'frag', idea: 'frag', opts: ['methylcyclohexane', 'ethylcyclopentane', 'hexane', 'cyclohexanol'],
    sig: {
      methylcyclohexane: 'Methylcyclohexane loses its CH₃ most easily: its base peak would be M − 15.',
      ethylcyclopentane: 'Ethylcyclopentane loses its ethyl most easily: its base peak would be M − 29.',
      hexane: 'Hexane, C₆H₁₄, would put M⁺ at 86 and break at every C–C bond alike (Fig 12.6).',
      cyclohexanol: 'Cyclohexanol, C₆H₁₂O, weighs 100, shows a broad O–H at 3400–3650, and losing water would give 82 †.',
    },
    variants: [
      { answer: 'methylcyclohexane', ms: 'methylcyclohexane', c2: 'frag', ir: ['ch'] },
      { answer: 'ethylcyclopentane', ms: 'ethylcyclopentane', c2: 'frag', ir: ['ch'] },
      { answer: 'hexane', ms: 'hexane', c2: 'frag', ir: ['ch'] },
      { answer: 'cyclohexanol', ms: 'cyclohexanol', c2: 'frag', ir: ['oh', 'ch', 'co'] },
    ] },
]
export const SORC_N = 3
const IDEAS = ['ir', 'iso', 'frag']
/** a fight's order: one round of each idea (the 'ir' idea from either of its two rounds), shuffled */
export const sorcDraw = () => shuffled([Math.random() < 0.5 ? 0 : 1, 2, 3])
/** a saved order is three distinct pool indices that hold every idea */
export const sorcValid = (q) => Array.isArray(q) && q.length === SORC_N && new Set(q).size === SORC_N && q.every((i) => Number.isInteger(i) && i >= 0 && i < SORC_POOL.length) && IDEAS.every((id) => q.some((i) => SORC_POOL[i].idea === id))
/** a miss in slot r: a later (unplayed) round of another idea takes this slot. On the last round, null: it stays and re-deals */
export const sorcSwap = (seq, r) => {
  const later = seq.map((_, j) => j).filter((j) => j > r)
  if (!later.length) return null
  const j = later[Math.floor(Math.random() * later.length)]
  const n = [...seq]; [n[r], n[j]] = [n[j], n[r]]
  return n
}
