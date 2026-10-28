// Chemistry rules for World 7, the Tower of Addition (book Chapter 7, Alkenes: Structure and Reactivity,
// pp. 207–242). Every puzzle judges against this file.

// ---------- §7.3 naming alkenes: Markov's seed labels. Each skeleton is drawn from `chain` (a zigzag of carbons,
// left to right), `dbl` (index of the first carbon of the C=C, 0-based from the left), `subs` ({index: label}).
export const SEEDS = [
  {
    id: 's1', chain: 6, dbl: 3, subs: {},
    opts: [['a', '2-hexene'], ['b', '4-hexene'], ['c', '3-hexene']], right: 'a',
    why: { b: 'Number from the end nearer the double bond: it starts at C2, not C4.', c: 'Count again: the double bond starts at the second carbon from the right end.' },
  },
  {
    id: 's2', chain: 5, dbl: 0, subs: { 3: 'CH₃' },
    opts: [['a', '4-methyl-1-pentene'], ['b', '2-methyl-4-pentene'], ['c', '4-methylpentane']], right: 'a',
    why: { b: 'The double bond gets the lowest number, not the branch: start at the end nearer the C=C.', c: 'It has a double bond: the parent ends in -ene.' },
  },
  {
    id: 's3', chain: 5, dbl: 1, subs: { 1: 'CH₃' },
    opts: [['a', '2-methyl-2-pentene'], ['b', '4-methyl-3-pentene'], ['c', '2-methylpentene']], right: 'a',
    why: { b: 'Start at the end nearer the double bond: it begins at C2 from the left.', c: 'Give the double bond’s position: the number of its first carbon.' },
  },
]

// ---------- §7.2 degree of unsaturation = (2C + 2 + N − H − X) / 2 (add halogens to H, ignore O, subtract N)
export const unsat = ({ C, H, N = 0, X = 0 }) => (2 * C + 2 + N - H - X) / 2
export const CRATES = [
  { id: 'c1', f: 'C₆H₁₀', C: 6, H: 10, note: 'C₆H₁₄ is the alkane: four H short, two degrees (p. 209).' },
  { id: 'c2', f: 'C₄H₆Br₂', C: 4, H: 6, X: 2, note: 'Count each Br as an H: C₄H₈, one degree (p. 210).' },
  { id: 'c3', f: 'C₅H₈O', C: 5, H: 8, note: 'Ignore the O: C₅H₈, two degrees (p. 210).' },
  { id: 'c4', f: 'C₅H₉N', C: 5, H: 9, N: 1, note: 'Subtract one H for the N: C₅H₈, two degrees (p. 210).' },
]
export function crateHint(c, guess) {
  const right = unsat(c)
  if (guess === right) return null
  if (c.X && guess === (2 * c.C + 2 - c.H) / 2) return 'Each halogen takes the place of an H: add it to the H count.'
  if (c.N && guess === (2 * c.C + 2 - c.H) / 2) return 'N makes three bonds: it brings one extra H. Subtract it.'
  return `CₙH₂ₙ₊₂ is the saturated formula. Each ring or π bond costs two H.`
}

// ---------- §7.4–7.5 E/Z: rank the two groups on each alkene carbon (sequence rules, §5.5); same side Z, opposite E.
// Each statue: L and R ends; each end has a top and a bottom group. rank: higher number wins.
const Z = { H: 1, C: 6, N: 7, O: 8, Cl: 17, Br: 35 }
export const GROUP = {
  H: { first: 'H', rank: [Z.H] },
  'CH₃': { first: 'C', rank: [Z.C, Z.H, Z.H, Z.H] },
  'CH₂CH₃': { first: 'C', rank: [Z.C, Z.C, Z.H, Z.H] },
  Cl: { first: 'Cl', rank: [Z.Cl] },
  Br: { first: 'Br', rank: [Z.Br] },
  OH: { first: 'O', rank: [Z.O] },
}
const cmp = (a, b) => { const A = GROUP[a].rank, B = GROUP[b].rank; for (let i = 0; i < Math.max(A.length, B.length); i++) { const d = (A[i] || 0) - (B[i] || 0); if (d) return d } return 0 }
/** 'top' | 'bot' | null (a tie: no stereo at this end) */
export const higherAt = (end) => { const d = cmp(end.top, end.bot); return d > 0 ? 'top' : d < 0 ? 'bot' : null }
export const ezOf = (st) => { const l = higherAt(st.L), r = higherAt(st.R); if (!l || !r) return 'none'; return l === r ? 'Z' : 'E' }
export const STATUES7 = [
  { id: 'e1', name: '2-chloro-2-butene', L: { top: 'Cl', bot: 'CH₃' }, R: { top: 'H', bot: 'CH₃' }, cite: 'p. 215' },
  { id: 'e2', name: '2-chloro-2-butene', L: { top: 'Cl', bot: 'CH₃' }, R: { top: 'CH₃', bot: 'H' }, cite: 'p. 215' },
  { id: 'e3', name: '1-bromo-2-chloroethene', L: { top: 'Br', bot: 'H' }, R: { top: 'Cl', bot: 'H' }, cite: 'Problem 7-9f' },
  { id: 'e4', name: '3-methyl-2-pentene', L: { top: 'CH₃', bot: 'H' }, R: { top: 'CH₃', bot: 'CH₂CH₃' }, cite: 'rule 2, p. 215' },
  { id: 'e5', name: '2-methyl-2-butene', L: { top: 'CH₃', bot: 'CH₃' }, R: { top: 'CH₃', bot: 'H' }, cite: 'Fig 7.5' },
]
export function rankWhy(end, picked) {
  const hi = higherAt(end)
  if (!hi) return `Two ${end.top} groups on one carbon: nothing to rank, so no cis–trans here (Fig 7.5).`
  const [a, b] = hi === 'top' ? [end.top, end.bot] : [end.bot, end.top]
  if (GROUP[a].first !== GROUP[b].first) return `${a} beats ${b}: its first atom, ${GROUP[a].first}, has the higher atomic number.`
  return `${a} beats ${b}: the first atoms tie (C), so look one atom further out: (C, H, H) beats (H, H, H).`
}

// ---------- §7.6 heats of hydrogenation (Table 7.2, p. 218), kJ/mol. Less heat released = more stable.
export const STAB = [
  { id: 'ethylene', name: 'ethylene', kind: 'unsubstituted', dH: -136 },
  { id: 'propene', name: 'propene', kind: 'monosubstituted', dH: -125 },
  { id: 'cis2b', name: 'cis-2-butene', kind: 'disubstituted (cis)', dH: -119 },
  { id: 'trans2b', name: 'trans-2-butene', kind: 'disubstituted (trans)', dH: -115 },
  { id: 'tri', name: '2-methyl-2-butene', kind: 'trisubstituted', dH: -112 },
  { id: 'tetra', name: '2,3-dimethyl-2-butene', kind: 'tetrasubstituted', dH: -110 },
]
/** step 0 is the top (most stable). */
export const STAB_ORDER = [...STAB].sort((a, b) => b.dH - a.dH).map((s) => s.id)

// ---------- §7.7–7.9 Markovnikov. Each alkene: two alkene carbons a and b, with their H count and alkyl count.
// Protonate one; the cation forms on the other, its degree = that carbon's alkyl groups + 1 (its old partner).
export const DEG = ['methyl', 'primary (1°)', 'secondary (2°)', 'tertiary (3°)']
export const BRIDGES7 = [
  { id: 'b1', name: 'propene', hx: 'HBr', a: { label: 'CH₂', H: 2, R: 0 }, b: { label: 'CH', H: 1, R: 1 }, product: '2-bromopropane', cite: '§7.8' },
  { id: 'b2', name: '2-methylpropene', hx: 'HCl', a: { label: 'CH₂', H: 2, R: 0 }, b: { label: 'C', H: 0, R: 2 }, product: '2-chloro-2-methylpropane', cite: 'p. 222', flip: true },
  { id: 'b3', name: '1-methylcyclohexene', hx: 'HBr', a: { label: 'CH (ring C2)', H: 1, R: 1 }, b: { label: 'C (ring C1)', H: 0, R: 2 }, product: '1-bromo-1-methylcyclohexane', cite: 'p. 223' },
  { id: 'b4', name: '1-ethylcyclopentene', hx: 'HCl', a: { label: 'CH (ring C2)', H: 1, R: 1 }, b: { label: 'C (ring C1)', H: 0, R: 2 }, product: '1-chloro-1-ethylcyclopentane', cite: 'Worked Example 7.2', flip: true },
  { id: 'b5', name: '2-pentene', hx: 'HBr', a: { label: 'CH (C2)', H: 1, R: 1 }, b: { label: 'CH (C3)', H: 1, R: 1 }, product: '2-bromopentane and 3-bromopentane', cite: 'p. 223', mixture: true },
]
/** protonate carbon `on` ('a' | 'b'): the cation lands on the other one */
export function protonate(br, on) {
  const other = on === 'a' ? 'b' : 'a'
  const deg = br[other].R + 1, alt = br[on].R + 1
  return { cationOn: other, deg, alt, ok: deg >= alt }
}

// ---------- §7.11 carbocation rearrangements. A skeleton of carbons: each with its neighbours and the alkyl
// count it would have as a cation. The cation forms at `start` (after Markovnikov protonation) and moves to a
// neighbour only when that neighbour makes a more substituted cation, carrying H⁻ or CH₃⁻ across.
export const SHIFTS = [
  {
    id: 'h', name: '3-methyl-1-butene + HCl', kind: 'hydride', cite: 'p. 231',
    carbons: [{ n: 'C1', deg: 1 }, { n: 'C2', deg: 2 }, { n: 'C3', deg: 3 }, { n: 'C4', deg: 1 }, { n: 'CH₃ on C3', deg: 1 }],
    bonds: [[0, 1], [1, 2], [2, 3], [2, 4]], start: 1, end: 2,
    product: '2-chloro-2-methylbutane', plain: '2-chloro-3-methylbutane', misnum: '3-chloro-3-methylbutane',
    caught: { n: 4, subs: { 2: 'CH₃' }, plus: 2 }, // the cation after the shift, drawn C1→C4 in the alkene's numbering (ShiftName)
  },
  {
    id: 'm', name: '3,3-dimethyl-1-butene + HCl', kind: 'methyl', cite: 'p. 231',
    carbons: [{ n: 'C1', deg: 1 }, { n: 'C2', deg: 2 }, { n: 'C3', deg: 3 }, { n: 'C4', deg: 1 }, { n: 'CH₃ on C3', deg: 1 }, { n: 'CH₃ on C3', deg: 1 }],
    bonds: [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5]], start: 1, end: 2,
    product: '2-chloro-2,3-dimethylbutane', plain: '3-chloro-2,2-dimethylbutane', misnum: '3-chloro-2,3-dimethylbutane',
    caught: { n: 4, subs: { 1: 'CH₃', 2: 'CH₃' }, plus: 2 },
  },
]
/** where a cation at carbon i goes: the neighbour with the highest degree, if higher than its own */
export function shiftFrom(sk, i) {
  let best = i
  sk.bonds.forEach(([a, b]) => { const j = a === i ? b : b === i ? a : -1; if (j >= 0 && sk.carbons[j].deg > sk.carbons[best].deg) best = j })
  return best
}

// ---------- the boss: three rounds on the arena skeleton. round.start is where the cation first forms.
export const PHANTOM_ROUNDS = [
  { sk: 'h2', start: 1, label: 'Where will the + settle?' },
  { sk: 'm2', start: 1, label: 'Where will the + settle?' },
  { sk: 't', start: 2, label: 'Where will the + settle?' },
]
// round 1's skeleton: 3-methyl-1-pentene + HCl (Problem 7-27a). H⁺ on C1 → 2° at C2; a hydride from C3 → 3° at C3.
export const SKELETON_H2 = {
  id: 'h2', name: '3-methyl-1-pentene + HCl', kind: 'hydride', cite: 'Problem 7-27a (our answer: the book prints no product)',
  carbons: [{ n: 'C1', deg: 1 }, { n: 'C2', deg: 2 }, { n: 'C3', deg: 3 }, { n: 'C4', deg: 2 }, { n: 'C5', deg: 1 }, { n: 'CH₃ on C3', deg: 1 }],
  bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]], start: 1, end: 2,
  product: '3-chloro-3-methylpentane', plain: '2-chloro-3-methylpentane',
}
// round 2 reuses the crypt's methyl-shift alkene (the book's only one, p. 231), on a mirrored floor layout
// round 3's skeleton: 2-methyl-2-butene protonated at C3 → a tertiary cation at C2; no neighbour beats it
export const SKELETON_T = {
  id: 't', name: '2-methyl-2-butene + HCl', kind: 'none', cite: '§7.9',
  carbons: [{ n: 'C1', deg: 1 }, { n: 'CH₃ on C2', deg: 1 }, { n: 'C2', deg: 3 }, { n: 'C3', deg: 2 }, { n: 'C4', deg: 1 }],
  bonds: [[0, 2], [1, 2], [2, 3], [3, 4]], start: 2, end: 2, product: '2-chloro-2-methylbutane',
}
export const skeleton = (id) => (id === 't' ? SKELETON_T : id === 'h2' ? SKELETON_H2 : id === 'm2' ? { ...SHIFTS[1], id: 'm2' } : SHIFTS.find((s) => s.id === id))
