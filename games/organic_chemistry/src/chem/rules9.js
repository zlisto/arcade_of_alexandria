// Chemistry rules for World 9, the Triple Spire (book Chapter 9, Alkynes: An Introduction to Organic Synthesis,
// pp. 287–316). Every puzzle judges against this file.

// ---------- §9.1 naming: Lindlar's cairns. `opts` are names; `why` explains each wrong one.
export const CAIRNS = [
  { id: 'k1', formula: 'CH₃CH₂C≡CCH₂CH₂CH₃', opts: [['a', '3-heptyne'], ['b', '4-heptyne'], ['c', 'heptyne']], right: 'a',
    why: { b: 'Number from the end nearer the triple bond: it starts at C3.', c: 'Give the position of the triple bond: the number of its first carbon.' } },
  { id: 'k2', formula: 'HC≡CCH₂CH(CH₃)₂', opts: [['a', '4-methyl-1-pentyne'], ['b', '2-methyl-4-pentyne'], ['c', '4-methyl-1-pentene']], right: 'a',
    why: { b: 'The triple bond takes the lowest number, not the branch.', c: 'A triple bond: the suffix is -yne.' } },
  { id: 'k3', formula: 'H₂C=CHCH₂C≡CH', opts: [['a', '1-penten-4-yne'], ['b', '4-penten-1-yne'], ['c', '1,4-pentadiyne']], right: 'a',
    why: { b: 'Both multiple bonds are the same distance from an end (C1 either way). On a tie, the double bond gets the lower number (p. 288).', c: 'One of them is a double bond: an enyne.' } },
]

// ---------- † products: the book doesn't print them; they're worked out from its rules (codex explains the mark)
const UNPRINTED = new Set(['hexanal', 'cis-5-decene', 'decane', '2-heptanone', '1-heptyne', '6-methyl-3-heptyne'])
/** a product name as the player sees it: "†" when Chapter 9 doesn't print that outcome */
export const shown = (name) => (UNPRINTED.has(name) ? `${name} †` : name)
export const DAGGER_NOTE = '† worked out from the book’s rules; not printed in the text.'

// ---------- §9.2 the dihalide bridges: a twofold elimination needs an excess of strong base (KOH or NaNH₂, p. 289)
export const BRIDGE_BASES = [
  { id: 'koh', name: 'KOH', strong: true },
  { id: 'nanh2', name: 'NaNH₂', strong: true },
  { id: 'nahco3', name: 'NaHCO₃', strong: false, why: 'Too weak a base. Pulling off HX twice takes a strong base (§9.2).' },
  { id: 'h2o', name: 'H₂O', strong: false, why: 'Water is barely a base at all. Pulling off HX twice takes a strong one (§9.2).' },
]

// ---------- §9.4 hydration of a terminal alkyne (1-hexyne)
export const WELLS = {
  sub: '1-hexyne, HC≡CCH₂CH₂CH₂CH₃',
  routes: {
    hg: { name: 'H₂O, H₂SO₄, HgSO₄', enol: 'an enol, OH on C2', product: '2-hexanone', why: 'Markovnikov: OH goes to the inner carbon; the enol shifts its H and becomes a methyl ketone (§9.4).' },
    bh3: { name: 'Disiamylborane; then H₂O₂, NaOH', enol: 'an enol, OH on C1', product: 'hexanal', why: 'Boron goes to the end carbon, OH replaces it; that enol shifts into an aldehyde. The bulky borane adds only once (p. 294).' },
  },
  doors: { '9-2a': '2-hexanone', '9-2b': 'hexanal' },
}

// ---------- §9.5 three reductions of 5-decyne
export const REDUCE = {
  sub: '5-decyne',
  routes: {
    pd: { name: 'H₂, Pd/C', product: 'decane', shape: 'flat', why: 'Ordinary palladium doesn’t stop: both π bonds are reduced, all the way to the alkane.' },
    lindlar: { name: 'H₂, Lindlar catalyst', product: 'cis-5-decene', shape: 'cis', why: 'The Lindlar catalyst stops at the alkene; both H add from the same face: cis (§9.5).' },
    li: { name: 'Li in NH₃', product: 'trans-5-decene', shape: 'trans', why: 'Lithium in liquid ammonia gives the trans alkene (§9.5).' },
  },
  doors: { '9-3a': 'cis-5-decene', '9-3b': 'trans-5-decene' },
}

// ---------- §9.7 the pKa ladder: a base works if its conjugate acid's pKa is higher than the alkyne's (25)
export const ALKYNE_PKA = 25
export const BASES = [
  { id: 'nanh2', name: 'NaNH₂', conj: 'NH₃', pKa: 35 },
  { id: 'naoh', name: 'NaOH', conj: 'H₂O', pKa: 15.7 },
  { id: 'nahco3', name: 'NaHCO₃', conj: 'H₂CO₃', pKa: 6.4 },
]
export const baseWorks = (b) => b.pKa > ALKYNE_PKA

// ---------- §9.8 acetylide alkylation: methyl or primary bromides and iodides only (p. 300)
export const HALIDES = [
  { id: 'mei', name: 'CH₃I (iodomethane)', kind: 'methyl', ok: true },
  { id: 'prbr', name: 'CH₃CH₂CH₂Br (1-bromopropane)', kind: 'primary', ok: true },
  { id: 'chbr', name: 'bromocyclohexane', kind: 'secondary', ok: false, why: 'A secondary halide: the acetylide acts as a base and pulls off H. Elimination: cyclohexene (p. 300).' },
  { id: 'tbu', name: '(CH₃)₃CBr (2-bromo-2-methylpropane)', kind: 'tertiary', ok: false, why: 'A tertiary halide: elimination, not substitution.' },
]

// ---------- §9.9 synthesis routes, step by step (forward). Each step: the reagent; the precursor before it.
export const ROUTES = {
  we1: {
    title: 'cis-2-hexene from 1-pentyne', cite: 'Worked Example 9.1',
    target: 'cis-2-hexene',
    // backward: target ← precursor ← … ← start
    back: [
      { have: 'cis-2-hexene', pick: ['2-hexyne', 'trans-2-hexene', '1-hexyne', '2-hexanol'], right: '2-hexyne', step: 'H₂, Lindlar catalyst', r: 'lindlar',
        why: { 'trans-2-hexene': 'Alkenes don’t switch geometry like that. Ask what kind of compound a cis alkene is made from.', '1-hexyne': 'Reducing 1-hexyne puts the double bond at C1, not C2.', '2-hexanol': 'That’s an alcohol; the cis double bond needs an alkyne precursor.' },
        rwhy: { li: 'Lithium in ammonia gives the trans alkene, not cis (§9.5).', pd: 'Pd/C doesn’t stop at the alkene: it reduces all the way to the alkane.', nanh2: 'NaNH₂ only makes an acetylide anion. It adds no hydrogen.', hbr: 'HBr adds across the triple bond: a bromoalkene, not an alkene (§9.3).', meoh: 'That would alkylate an acetylide. It adds no hydrogen.', tbu: 'That would alkylate an acetylide. It adds no hydrogen.' } },
      { have: '2-hexyne', pick: ['1-pentyne', '1-hexyne', 'pentane', '2-hexene'], right: '1-pentyne', step: 'NaNH₂; then CH₃I', r: 'nanh2',
        why: { '1-hexyne': 'Count carbons: 1-hexyne has six already, and building on it only adds more. 2-hexyne has six.', pentane: 'An alkane has no acidic H to remove, so nothing can be added to it.', '2-hexene': 'Alkenes don’t become alkynes by adding a carbon.' },
        rwhy: { lindlar: 'Hydrogen reduces; it won’t join two carbon pieces together.', pd: 'Hydrogen reduces; it won’t join two carbon pieces together.', li: 'Li in NH₃ reduces a triple bond; it adds no carbon.', hbr: 'HBr adds to the triple bond (§9.3). Something must take the alkyne’s proton first.', meoh: 'Methanol isn’t an alkyl halide: there’s no halide for the acetylide to replace (§9.8).', tbu: 'A tertiary halide: the acetylide acts as a base, and elimination wins (§9.8).' } },
    ],
    start: '1-pentyne',
  },
  we2: {
    title: '2-bromopentane from acetylene', cite: 'Worked Example 9.2',
    target: '2-bromopentane',
    back: [
      { have: '2-bromopentane', pick: ['1-pentene', '2-pentene', '1-hexene', '1-pentyne'], right: '1-pentene', step: 'HBr', why: { '2-pentene': 'HBr on 2-pentene gives a mixture of 2- and 3-bromopentane (p. 303).', '1-hexene': 'Count carbons: 1-hexene has six, so HBr gives 2-bromohexane. 2-Bromopentane has five.', '1-pentyne': 'HBr on an alkyne gives a vinylic bromide, not 2-bromopentane.' } },
      { have: '1-pentene', pick: ['1-pentyne', '2-pentyne', '1-butyne', '1-hexyne'], right: '1-pentyne', step: 'H₂, Lindlar catalyst', why: { '2-pentyne': 'Reducing 2-pentyne puts the double bond at C2.', '1-butyne': 'Count carbons: 1-butyne has four, so it reduces to 1-butene. 1-Pentene has five.', '1-hexyne': 'Count carbons: 1-hexyne has six, so it reduces to 1-hexene. 1-Pentene has five.' } },
      { have: '1-pentyne', hint: 'NaNH₂; then an alkyl halide', pick: ['acetylide + 1-bromopropane', 'acetylide + 2-bromopropane', 'acetylide + 1-bromobutane', 'acetylide + 1-bromopentane'], right: 'acetylide + 1-bromopropane', step: 'NaNH₂; then CH₃CH₂CH₂Br', why: { 'acetylide + 2-bromopropane': 'A secondary halide gives elimination, not alkylation (§9.8). It would also branch the chain.', 'acetylide + 1-bromobutane': 'Count carbons: 2 from the acetylide + 4 = 6, which gives 1-hexyne. 1-Pentyne has five.', 'acetylide + 1-bromopentane': 'Count carbons: 2 from the acetylide + 5 = 7, which gives 1-heptyne. 1-Pentyne has five.' } },
    ],
    start: 'acetylene',
  },
  we3: {
    title: '5-methyl-1-hexanol from acetylene', cite: 'Worked Example 9.3',
    target: '5-methyl-1-hexanol',
    back: [
      { have: '5-methyl-1-hexanol', pick: ['5-methyl-1-hexene', '5-methyl-2-hexene', '5-methyl-1-hexyne', '4-methyl-1-hexene'], right: '5-methyl-1-hexene', step: 'BH₃; then H₂O₂, NaOH', why: { '5-methyl-2-hexene': 'Water added across C2=C3 can’t put the OH on C1.', '5-methyl-1-hexyne': 'Water on an alkyne gives an enol, which shifts into a carbonyl, not an alcohol (§9.4).', '4-methyl-1-hexene': 'Check the branch: the OH lands on C1, but the methyl stays on C4. That gives 4-methyl-1-hexanol.' } },
      { have: '5-methyl-1-hexene', pick: ['5-methyl-1-hexyne', '5-methyl-2-hexyne', '6-methyl-1-heptyne', '4-methyl-1-hexyne'], right: '5-methyl-1-hexyne', step: 'H₂, Lindlar catalyst', why: { '5-methyl-2-hexyne': 'Reducing 5-methyl-2-hexyne puts the double bond at C2.', '6-methyl-1-heptyne': 'Count carbons: 6-methyl-1-heptyne has eight, so it reduces to 6-methyl-1-heptene. 5-Methyl-1-hexene has seven.', '4-methyl-1-hexyne': 'Check the branch: reduction leaves the methyl on C4, giving 4-methyl-1-hexene, not 5-methyl.' } },
      { have: '5-methyl-1-hexyne', hint: 'NaNH₂; then an alkyl halide', pick: ['acetylide + 1-bromo-3-methylbutane', 'acetylide + 2-bromo-3-methylbutane', 'acetylide + 1-bromo-2-methylpropane', 'acetylide + 1-bromo-4-methylpentane'], right: 'acetylide + 1-bromo-3-methylbutane', step: 'NaNH₂; then 1-bromo-3-methylbutane', why: { 'acetylide + 2-bromo-3-methylbutane': 'A secondary halide: the acetylide acts as a base, and elimination wins (§9.8).', 'acetylide + 1-bromo-2-methylpropane': 'Count carbons: 2 from the acetylide + 4 = 6, which gives 4-methyl-1-pentyne. 5-Methyl-1-hexyne has seven.', 'acetylide + 1-bromo-4-methylpentane': 'Count carbons: 2 from the acetylide + 6 = 8, which gives 6-methyl-1-heptyne. 5-Methyl-1-hexyne has seven.' } },
    ],
    start: 'acetylene',
  },
  // Problem 9-13(d): the book asks for it but prints no answer; the route is worked out from §9.4 and §9.8 (†)
  p13d: {
    title: '2-heptanone † from acetylene', cite: 'Problem 9-13(d)',
    target: '2-heptanone',
    back: [
      { have: '2-heptanone', pick: ['1-heptyne', '2-heptyne', '1-heptene', '1-hexyne'], right: '1-heptyne', step: 'H₂O, H₂SO₄, HgSO₄', why: { '2-heptyne': 'An unsymmetrical internal alkyne gives a mixture of two ketones (p. 293).', '1-heptene': 'Water added to an alkene gives an alcohol, not a ketone.', '1-hexyne': 'Count carbons: 1-hexyne has six, so hydration gives 2-hexanone (p. 292). 2-Heptanone has seven.' } },
      { have: '1-heptyne', hint: 'NaNH₂; then an alkyl halide', pick: ['acetylide + 1-bromopentane', 'acetylide + 2-bromopentane', 'acetylide + 1-bromohexane', 'acetylide + 1-bromobutane'], right: 'acetylide + 1-bromopentane', step: 'NaNH₂; then 1-bromopentane', why: { 'acetylide + 2-bromopentane': 'A secondary halide gives elimination, not alkylation (§9.8).', 'acetylide + 1-bromohexane': 'Count carbons: 2 from the acetylide + 6 = 8, which gives 1-octyne. 1-Heptyne has seven.', 'acetylide + 1-bromobutane': 'Count carbons: 2 from the acetylide + 4 = 6, which gives 1-hexyne. 1-Heptyne has seven.' } },
    ],
    start: 'acetylene',
  },
}
/** the boss's three rounds, each a different idea: HBr on the right alkene, hydroboration of an alkene, Hg hydration */
export const MIMIC_ROUNDS = ['we2', 'we3', 'p13d']
/** the reagents the Map offers at every step back (Worked Example 9.1 turns on Lindlar vs Li/NH₃, and on the halide) */
export const MAP_REAGENTS = [
  ['lindlar', 'H₂ + Lindlar catalyst'], ['li', 'Li in liquid NH₃'], ['pd', 'H₂ over a Pd/C catalyst'], ['nanh2', 'NaNH₂, then CH₃I'],
  ['meoh', 'NaNH₂, then CH₃OH'], ['tbu', 'NaNH₂, then (CH₃)₃CBr'], ['hbr', 'HBr in ether'],
]
/** a fresh order, drawn once per mount (useState initialiser), so no answer sits in a fixed slot or place */
export const shuffled = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }

// the Planner's Summit runs a NEW target forward, so the Map's lesson must transfer: Problem 9-38(b), p. 312
// ((CH₃)₂CHCH₂C≡CH → the trans alkene with an ethyl group). The book prints no answer, so the product carries †.
export const SUMMIT = {
  start: '4-methyl-1-pentyne', target: 'trans-6-methyl-3-heptene', cite: 'Problem 9-38(b)',
  states: ['4-methyl-1-pentyne', 'its acetylide anion', '6-methyl-3-heptyne'],
  done: { nanh2: '4-methyl-1-pentyne → its acetylide anion', etbr: 'acetylide + CH₃CH₂Br → 6-methyl-3-heptyne †', li: '6-methyl-3-heptyne † → trans-6-methyl-3-heptene †' },
}
UNPRINTED.add(SUMMIT.target)
export const SUMMIT_ORDER = ['nanh2', 'etbr', 'li']
export const SUMMIT_FLASKS = { nanh2: 'NaNH₂', etbr: 'CH₃CH₂Br', mei: 'CH₃I', li: 'Li in NH₃', lindlar: 'H₂, Lindlar catalyst' }
/** why a flask is wrong at each point of the summit run: the rule, not the answer. Keys: flask; '*' for any other. */
export const SUMMIT_WHY = [
  { '*': 'Nothing can attack yet. A terminal alkyne must lose its proton first, to a base strong enough (pKa 25, §9.7).' },
  { mei: 'Count carbons: the target has eight. A methyl group would give only seven.', '*': 'The acetylide anion needs an alkyl halide to attack, one that brings the carbons you lack (§9.8).' },
  { lindlar: 'The Lindlar catalyst adds both H from one face: a cis alkene (§9.5). Read the target’s name again.',
    pd: 'H₂ over Pd/C doesn’t stop at the alkene: both π bonds go, all the way to the alkane (§9.5).',
    '*': 'You have the internal alkyne. Now reduce it, to the right geometry (§9.5).' },
]
