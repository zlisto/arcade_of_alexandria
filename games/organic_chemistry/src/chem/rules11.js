// Chemistry rules for World 11, the Arena of Five (book Chapter 11, Reactions of Alkyl Halides: Nucleophilic
// Substitutions and Eliminations, pp. 341–384). Every puzzle judges against this file.

/** a shuffled copy (Fisher–Yates); panels call it once per mount, scenes once per visit */
export const shuffled = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }
/** how long a toast stays up: about 3.5 words a second, never under 3.2 s */
export const readMs = (t) => Math.max(3200, Math.round((String(t).split(/\s+/).length / 3.5) * 1000) + 800)
// products the chapter doesn't print carry a dagger (the codex explains it)
// (the pit's alcohol: the text says only "an alcohol product", p. 354; 3,7-dimethyloctan-3-ol is its IUPAC name)
export const UNPRINTED = ['(R)-hexan-2-yl acetate', '3,7-dimethyloctan-3-ol']
export const shown = (name) => (UNPRINTED.includes(name) ? `${name} †` : name)

// ---------- §11.1 the Walden cycle for 1-phenyl-2-propanol (Fig 11.3, p. 343): which step inverts the centre?
// (the lesson card shows Walden's own malic acid cycle, Fig 11.2, instead)
export const WALDEN_STEPS = [
  { id: 1, text: 'Step 1: the alcohol + TsCl gives a tosylate.', why: 'Making a tosylate breaks the O–H bond, not the C–O bond at the centre. Nothing at the centre moves.' },
  { id: 2, text: 'Step 2: the tosylate + acetate ion gives an acetate.', why: 'Acetate bonds to the chirality centre itself as tosylate leaves from the far side: the inverting step.', right: true },
  { id: 3, text: 'Step 3: the acetate + HO⁻ gives the alcohol back.', why: 'Hydroxide cuts the acetate apart without breaking the C–O bond at the centre. Nothing at the centre moves.' },
]

// ---------- §11.2 the Walden Gate's centres (Worked Example 11.1, p. 344, and Problem 11-1; the lesson card keeps
// Fig 11.4's (S)-2-bromobutane). Each leaving group points a different way on each visit.
export const CENTRES = {
  '11-1a': { name: '(R)-1-bromo-1-phenylethane', nu: 'CN⁻', nuTag: 'CN', groups: ['H', 'CH₃', 'C₆H₅'], product: '(S)-2-phenylpropanenitrile',
    opts: [['inv', '(S)-2-phenylpropanenitrile'], ['ret', '(R)-2-phenylpropanenitrile'], ['rac', '(R) and (S), 50 : 50']] },
  '11-1b': { name: '(S)-2-bromohexane', nu: 'CH₃CO₂⁻', nuTag: 'OAc', groups: ['H', 'CH₃', 'C₄H₉'], product: '(R)-hexan-2-yl acetate',
    opts: [['inv', '(R)-hexan-2-yl acetate'], ['ret', '(S)-hexan-2-yl acetate'], ['rac', '(R) and (S), 50 : 50']] },
}
// the R/S call before an inversion lands: the nucleophile takes the leaving group's priority, so the label flips here
export const CENTRE_WHY = {
  ret: 'That keeps the old configuration. The nucleophile came in from behind and the other three groups flipped over: the centre is inverted.',
  rac: 'A 50 : 50 mix needs a flat cation that can be attacked from either face. SN2 has no intermediate: one step, one face, inversion.',
}

// ---------- §11.3 SN2 dials (pp. 346–352): the fastest choice on each. Labels carry no class names, and no dial has
// an odd one out to spot: two charged nucleophiles, three real leaving groups (Cl⁻ 200, Br⁻ 10,000, TsO⁻ 60,000),
// two solvents without –OH (benzene, Problem 11-7: neither protic nor strongly polar; DMSO, polar aprotic). A jam
// says only how many dials are off, and a knockout spins them all back (Coliseum.jsx), so they can't be stepped
// through one at a time.
export const DIALS = [
  { id: 'sub', name: 'Substrate', opts: [['me', 'CH₃–'], ['pri', 'CH₃CH₂–'], ['sec', '(CH₃)₂CH–'], ['ter', '(CH₃)₃C–']], best: 'me' },
  { id: 'nu', name: 'Nucleophile', opts: [['h2o', 'H₂O'], ['nh3', 'NH₃'], ['ac', 'CH₃CO₂⁻'], ['ho', 'HO⁻']], best: 'ho' },
  { id: 'lg', name: 'Leaving group', opts: [['oh', '–OH'], ['cl', '–Cl'], ['br', '–Br'], ['ts', '–OTs']], best: 'ts' },
  { id: 'sol', name: 'Solvent', opts: [['meoh', 'methanol'], ['etoh', 'ethanol'], ['bz', 'benzene'], ['dmso', 'DMSO']], best: 'dmso' },
]
export const dialJam = (n) => `The lever jams. ${n === 1 ? 'One of the four dials is' : `${n} of the four dials are`} off the fastest setting.`
export const dialOk = (d, v) => d.best === v
export const dialLabel = (d, v) => { const o = d.opts.find(([k]) => k === v); return o ? o[1] : '— (E to turn)' }

// ---------- §11.4–11.5 the Cation Pit (p. 354): (R)-6-chloro-2,6-dimethyloctane in water. Three ways to begin; only
// waiting works, then water takes both faces of the flat cation.
export const PIT_ACTS = [
  { id: 'back', label: 'Drive water in from behind', why: 'Three groups wall off this carbon’s back side. A tertiary halide takes no backside attack.' },
  { id: 'base', label: 'Pour in ethoxide, a strong base', why: 'A strong base on a tertiary halide pulls off a proton: E2, an alkene. This pit wants the alcohol.' },
  { id: 'wait', label: 'Stand back and wait', right: true },
]
// after both faces take water: predict the mixture (p. 354: about 80% racemized and 20% inverted, which is 40% R + 60% S;
// the ion pair, p. 355, Fig 11.12)
export const PIT_MIX = {
  q: 'Water has reached both faces of the cation from (R)-6-chloro-2,6-dimethyloctane. What does the alcohol mixture hold?',
  opts: [
    ['s100', '(S) only: every molecule inverted', false],
    ['r50', '(R) and (S), exactly 50 : 50', false],
    ['r40', 'roughly 40% (R) and 60% (S), not quite racemic', true],
    ['r100', '(R) only: every molecule kept its configuration', false],
  ],
  yes: 'Right: about 80% racemized and 20% inverted, so 40% (R) : 60% (S). As the chloride leaves, it shields one face for a moment: an ion pair (pp. 354–355).',
  no: {
    s100: 'Pure inversion would take a backside attack, and this tertiary carbon takes none. Water reached a flat cation from both faces.',
    r50: 'Nearly, but not exactly. Few SN1 reactions racemize completely. What is still next to the cation’s front face just after the C–Cl bond breaks?',
    r100: 'Keeping every configuration would need water on the leaving group’s side every time. The cation is flat, and both faces took water.',
  },
}

// ---------- §11.12 the Champion's trial (pp. 371–372): name the mechanism. Challengers come in a shuffled order. Each
// is a real molecule and reagent from the chapter, never the summary's wording; the class is named only in `why`.
export const MECHS = ['SN2', 'SN1', 'E2', 'E1', 'E1cB']
export const TRIAL = [
  { id: 't1', sub: '1-bromobutane', cond: 'with NaI', right: 'SN2', why: 'A primary halide and a good nucleophile that is a weak base: SN2 (Problem 11-4).' },
  // a strong but unhindered base on a primary halide still substitutes, so "any base means E2" fails here
  { id: 't8', sub: '1-bromobutane', cond: 'with KOH', right: 'SN2', why: 'Primary and unhindered: hydroxide substitutes, giving 1-butanol (Problem 11-4). Only a hindered base forces E2.' },
  { id: 't2', sub: '1-bromo-2-methylpropane', cond: 'with (CH₃)₃COK in THF', right: 'E2', why: 'Primary, but potassium tert-butoxide is a strong, sterically hindered base: E2 (Problem 11-28).' },
  { id: 't3', sub: '2-chloro-2-methylpropane', cond: 'warmed in 80% aqueous ethanol', right: 'SN1', alt: 'E1', why: 'Tertiary, neutral and protic: SN1 and E1 together, 64 : 36 (p. 369). Either call stands.' },
  { id: 't4', sub: '2-bromobutane', cond: 'with sodium ethoxide in ethanol', right: 'E2', why: 'Secondary, with a strong base: E2 predominates (p. 363).' },
  { id: 't5', sub: '2-(1-hydroxycyclohexyl)cyclohexanone', cond: 'with NaOH in ethanol', right: 'E1cB', why: 'Its –OH, a poor leaving group, sits two carbons from the C=O, which makes the H between them acidic: E1cB, through a carbanion (Problem 11-20).' },
  { id: 't6', sub: '2-bromo-2-methylbutane', cond: 'with sodium ethoxide in ethanol', right: 'E2', why: 'Tertiary, but a base is on the field: E2, not SN1 (p. 363).' },
  { id: 't7', sub: '1-chloro-1-methylcyclohexane', cond: 'in acetic acid, CH₃CO₂H', right: 'SN1', alt: 'E1', why: 'Tertiary, in a protic acid with no base: SN1 gives the acetate (Problem 11-20). E1 occurs alongside SN1 under such conditions (p. 369), so either call stands.' },
]
export const trialMiss = (T) => `Not that one. Look at ${T.sub} again: which carbon holds the leaving group, and what does it meet?`

// ---------- §11.7 Zaitsev (pp. 362–363, sodium ethoxide in ethanol). One variant per mount; the lesson card shows
// Worked Example 11.3 instead.
export const ZAITSEV = [
  { id: 'z1', q: '2-Bromobutane meets sodium ethoxide in ethanol. Which product is major?',
    opts: [['a', 'CH₃CH=CHCH₃', true], ['b', 'CH₂=CHCH₂CH₃', false], ['c', 'CH₃CH(OCH₂CH₃)CH₂CH₃', false]],
    yes: 'Right: 2-butene 81%, 1-butene 19%. The more substituted alkene predominates.',
    no: { b: 'It forms, but as the minor alkene. Base-induced elimination generally gives the alkene with more alkyl groups on its double bond.', c: 'A secondary halide with a strong base: E2 elimination predominates over substitution.' } },
  { id: 'z2', q: '2-Bromo-2-methylbutane meets sodium ethoxide in ethanol. Which product is major?',
    opts: [['a', '(CH₃)₂C=CHCH₃', true], ['b', 'CH₂=C(CH₃)CH₂CH₃', false], ['c', '(CH₃)₂C(OCH₂CH₃)CH₂CH₃', false]],
    yes: 'Right: 2-methyl-2-butene 70%, 2-methyl-1-butene 30%. The more substituted alkene predominates.',
    no: { b: 'It forms, but as the minor alkene. Base-induced elimination generally gives the alkene with more alkyl groups on its double bond.', c: 'A tertiary halide with a base eliminates: E2. Nothing gets in from behind.' } },
]

// ---------- the boss (§11.2–11.12): a pool of rounds; each fight draws four (saved as t11champSeq: pool indices), with
// mechanisms allowed to repeat but at least three distinct (CHAMP_MECHS), so every mechanism is still won and the
// last round can't be found by elimination. Each round's banners show a variant's conditions, from the book; a wrong
// banner swaps in a round of a different mechanism. Tertiary appears both neutral (SN1/E1) and with a base (E2), and
// primary both with a nucleophile and with hydroxide (SN2), so the substrate class alone never decides it (§11.12).
// Indices 0–3 keep their old meaning, so a saved pre-pool order still resumes. After a right call the toast names only the stance; how to exploit it is left to the
// player (the how-to comes only after a failed exploit):
//   SN2: the Umbrella from its back (backside attack). SN1: wait for its leaving group to drop (the cation), then
//   strike. E2: roll through its anti-periplanar sweep, then strike.
export const CHAMP_ROUNDS = [
  { mech: 'SN2', accept: ['SN2'],
    variants: [
      { cond: 'CH₃Br · HO⁻', src: 'p. 344' },
      { cond: '1-bromobutane · azide ion · HMPA', src: 'p. 351' },
    ],
    miss: { SN1: 'No cation forms here: an open carbon and a strong nucleophile don’t wait.', E1: 'No cation forms here: an open carbon and a strong nucleophile don’t wait.', E2: 'Nothing here is a strong, hindered base, and the carbon is open to attack.', E1cB: 'There’s no carbonyl two carbons from the leaving group.' },
    tell: 'Stance: SN2. Its leaving group faces you.',
    how: 'SN2 needs a nucleophile from the side opposite the leaving group: the Umbrella, from behind it.' },
  { mech: 'SN1', accept: ['SN1', 'E1'],
    variants: [
      { cond: '(CH₃)₃CBr · water', src: 'p. 352' },
      { cond: '2-chloro-2-methylpropane · 80% aqueous ethanol', src: 'p. 369' },
    ],
    miss: { SN2: 'A crowded tertiary carbon: nothing gets in from behind.', E2: 'There’s no base on the field. Neutral, protic conditions.', E1cB: 'There’s no carbonyl two carbons from the leaving group.' },
    tell: 'Stance: SN1. It holds still, clutching its leaving group.',
    how: 'SN1 goes through a cation: the leaving group must leave first. Wait for it to drop, then strike.' },
  { mech: 'E2', accept: ['E2'],
    variants: [
      { cond: '2-bromobutane · sodium ethoxide', src: 'p. 363' },
      { cond: 'neomenthyl chloride · ethoxide', src: 'p. 368' },
      { cond: 'menthyl chloride · strong base, 100% ethanol', src: 'Fig 11.23, p. 370' },
    ],
    miss: { SN2: 'A strong base and a crowded carbon: it takes a proton instead of attacking.', SN1: 'A strong base is on the field. It won’t wait for a cation.', E1: 'A strong base is on the field. It won’t wait for a cation.', E1cB: 'There’s no carbonyl two carbons from the leaving group.' },
    tell: 'Stance: E2. It winds up.',
    how: 'E2 is one step: base, H and leaving group all at once. Its sweep comes as one blow: roll through it, then strike.' },
  // tertiary again, but with a base: E2, not SN1 (§11.12, p. 371)
  { mech: 'E2', accept: ['E2'],
    variants: [
      { cond: '2-bromo-2-methylbutane · sodium ethoxide', src: 'p. 363' },
      { cond: '1-chloro-1-methylcyclohexane · KOH, ethanol', src: 'Worked Example 11.3, p. 364' },
    ],
    miss: { SN2: 'A tertiary carbon: nothing gets in from behind.', SN1: 'Tertiary, yes, but a strong base is on the field. It won’t wait for a cation.', E1: 'Tertiary, yes, but a strong base is on the field. It won’t wait for a cation.', E1cB: 'There’s no carbonyl two carbons from the leaving group.' },
    tell: 'Stance: E2. It winds up.',
    how: 'E2 is one step: base, H and leaving group all at once. Its sweep comes as one blow: roll through it, then strike.' },
  // a second primary round: a good nucleophile, or hydroxide (a strong base that is not hindered), still SN2
  { mech: 'SN2', accept: ['SN2'],
    variants: [
      { cond: '1-bromobutane · NaI', src: 'Problem 11-4' },
      { cond: '1-bromobutane · KOH', src: 'Problem 11-4' },
    ],
    miss: { SN1: 'No cation forms here: a primary carbon doesn’t ionize, and the nucleophile doesn’t wait.', E1: 'No cation forms here: a primary carbon doesn’t ionize, and the nucleophile doesn’t wait.', E2: 'A primary carbon, open to attack, and no hindered base: it substitutes.', E1cB: 'There’s no carbonyl two carbons from the leaving group.' },
    tell: 'Stance: SN2. Its leaving group faces you.',
    how: 'SN2 needs a nucleophile from the side opposite the leaving group: the Umbrella, from behind it.' },
  // a second neutral tertiary round, in acetic acid
  { mech: 'SN1', accept: ['SN1', 'E1'],
    variants: [
      { cond: '(S)-3-chloro-3-methyloctane · acetic acid', src: 'Problem 11-8' },
      { cond: '1-chloro-1-methylcyclohexane · acetic acid', src: 'Problem 11-20' },
    ],
    miss: { SN2: 'A crowded tertiary carbon: nothing gets in from behind.', E2: 'There’s no base on the field. Neutral, protic conditions.', E1cB: 'There’s no carbonyl two carbons from the leaving group.' },
    tell: 'Stance: SN1. It holds still, clutching its leaving group.',
    how: 'SN1 goes through a cation: the leaving group must leave first. Wait for it to drop, then strike.' },
]
/** how many rounds a fight plays, and how many distinct mechanisms it must hold */
export const CHAMP_N = 4
export const CHAMP_MECHS = [...new Set(CHAMP_ROUNDS.map((r) => r.mech))]
const champCovers = (q) => CHAMP_MECHS.every((m) => q.some((i) => CHAMP_ROUNDS[i].mech === m))
/** a saved order is usable when it is CHAMP_N distinct pool rounds covering every mechanism (old 0–3 orders pass) */
export const champValid = (q) => Array.isArray(q) && q.length === CHAMP_N && q.every((i) => Number.isInteger(i) && i >= 0 && i < CHAMP_ROUNDS.length) && new Set(q).size === CHAMP_N && champCovers(q)
/**
 * a fresh fight: a mechanism pattern drawn uniformly among those covering every mechanism (so which one repeats, and
 * where, is even), then a distinct pool round for each slot
 */
export const champDraw = () => {
  const by = Object.fromEntries(CHAMP_MECHS.map((m) => [m, CHAMP_ROUNDS.map((_, i) => i).filter((i) => CHAMP_ROUNDS[i].mech === m)]))
  let pat
  do pat = Array.from({ length: CHAMP_N }, () => CHAMP_MECHS[Math.floor(Math.random() * CHAMP_MECHS.length)])
  while (!CHAMP_MECHS.every((m) => pat.includes(m)) || CHAMP_MECHS.some((m) => pat.filter((x) => x === m).length > by[m].length))
  const bags = Object.fromEntries(CHAMP_MECHS.map((m) => [m, shuffled(by[m])]))
  return pat.map((m) => bags[m].pop())
}
/**
 * after a miss on position r of q: a new order whose position r holds a round of a different mechanism, picked at
 * random. Won positions (< r) never change. The incoming round comes from a later position (they swap) or from the
 * unused pool (the missed round goes back to the pool, or into a later position when the mechanisms need it). Every
 * order kept covers every mechanism; null when no such order exists (the last round, when the won rounds lack its
 * mechanism: the caller keeps the mechanism then).
 */
export const champSwap = (q, r) => {
  const cur = q[r], mech = CHAMP_ROUNDS[cur].mech
  const cands = CHAMP_ROUNDS.map((_, i) => i).filter((i) => CHAMP_ROUNDS[i].mech !== mech && !q.slice(0, r).includes(i))
  const opts = []
  for (const g of cands) {
    const mine = []
    const j = q.indexOf(g)
    if (j > r) { const n = [...q]; n[j] = cur; n[r] = g; mine.push(n) }
    else {
      const n = [...q]; n[r] = g; mine.push(n)
      for (let k = r + 1; k < q.length; k++) { const m = [...n]; m[k] = cur; mine.push(m) }
    }
    const ok = mine.filter(champCovers)
    if (ok.length) opts.push(ok)
  }
  if (!opts.length) return null
  const pick = opts[Math.floor(Math.random() * opts.length)]
  return pick[Math.floor(Math.random() * pick.length)]
}
// the Umbrella used in a stance that takes no backside attack
export const UMB_MISS = {
  SN1: 'It bounces off. A crowded tertiary carbon: no nucleophile gets in from behind.',
  E2: 'It bounces off. A strong base pulls off a proton here; nothing attacks the carbon.',
}

// ---------- §11.9 the Elimination Ring: menthyl chloride (Fig 11.21b, p. 368). Ring carbon k (ChairRing) = menthane
// numbering: k5 C1 (CH₃), k0 C2, k1 C3 (Cl), k2 C4 (isopropyl), k3 C5, k4 C6. In flip 0 all three groups are
// equatorial (its more stable chair); flipped, all three are axial. The β-hydrogens are the two on C2 and the one on
// C4. Only C2's bottom H becomes axial and anti to the axial Cl: 2-menthene, the non-Zaitsev alkene (p. 369).
export const MENTHYL = {
  subs: [
    { c: 1, face: 'top', label: 'Cl', color: '#6fe39a', size: 0.34 },
    { c: 2, face: 'bottom', label: 'CH(CH₃)₂', color: '#d0508e', size: 0.3 },
    { c: 5, face: 'top', label: 'CH₃', color: '#ff6fb3', size: 0.26 },
  ],
  hs: [
    { id: 'c2b', c: 0, face: 'bottom', right: true },
    { id: 'c2t', c: 0, face: 'top' },
    { id: 'c4t', c: 2, face: 'top' },
  ],
  cl: { c: 1, face: 'top' },
}
// why a chosen H fails, when the Cl is already axial (the H isn't axial, so it isn't anti-periplanar)
export const H_MISS = {
  c2t: 'That H on C2 is equatorial. It isn’t anti-periplanar to the axial Cl, so the base can’t pull it off in one step.',
  c4t: 'That H on C4 is equatorial: the isopropyl group holds C4’s axial spot. No H on C4 lines up anti to the Cl.',
}
