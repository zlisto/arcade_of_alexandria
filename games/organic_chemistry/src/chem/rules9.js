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

// ---------- §9.4 hydration of a terminal alkyne (1-hexyne)
export const WELLS = {
  sub: '1-hexyne, HC≡CCH₂CH₂CH₂CH₃',
  routes: {
    hg: { name: 'H₂O, H₂SO₄, HgSO₄', enol: 'an enol, OH on C2', product: '2-hexanone', why: 'Markovnikov: OH goes to the inner carbon; the enol shifts its H and becomes a methyl ketone (§9.4).' },
    bh3: { name: 'BH₃; then H₂O₂, OH⁻', enol: 'an enol, OH on C1', product: 'hexanal', why: 'Boron goes to the end carbon, OH replaces it; that enol shifts into an aldehyde (§9.4).' },
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

// ---------- §9.8 acetylide alkylation: primary halides only
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
      { have: 'cis-2-hexene', pick: ['2-hexyne', 'trans-2-hexene', '1-hexyne', '2-hexanol'], right: '2-hexyne', step: 'H₂, Lindlar catalyst', why: { 'trans-2-hexene': 'Alkenes don’t switch geometry like that. A cis alkene comes from an alkyne, reduced with the Lindlar catalyst.', '1-hexyne': 'Reducing 1-hexyne puts the double bond at C1, not C2.', '2-hexanol': 'That’s an alcohol; the cis double bond needs an alkyne precursor.' } },
      { have: '2-hexyne', pick: ['1-pentyne anion + CH₃I', '1-pentyne + CH₃OH', 'pentane + CH₃I', '2-hexene'], right: '1-pentyne anion + CH₃I', step: 'NaNH₂; then CH₃I', why: { '1-pentyne + CH₃OH': 'The alkyne has to be an anion first, and the carbon partner a primary halide.', 'pentane + CH₃I': 'An alkane has no acidic H to remove.', '2-hexene': 'Alkenes don’t become alkynes by adding a carbon.' } },
    ],
    start: '1-pentyne',
  },
  we2: {
    title: '2-bromopentane from acetylene', cite: 'Worked Example 9.2',
    target: '2-bromopentane',
    back: [
      { have: '2-bromopentane', pick: ['1-pentene', '2-pentene', 'pentane', '1-pentyne'], right: '1-pentene', step: 'HBr', why: { '2-pentene': 'HBr on 2-pentene gives a mixture of 2- and 3-bromopentane (p. 303).', pentane: 'An alkane won’t add HBr.', '1-pentyne': 'HBr on an alkyne gives a vinylic bromide, not 2-bromopentane.' } },
      { have: '1-pentene', pick: ['1-pentyne', '2-pentyne', 'pentane', '1-pentanol'], right: '1-pentyne', step: 'H₂, Lindlar catalyst', why: { '2-pentyne': 'Reducing 2-pentyne puts the double bond at C2.', pentane: 'You can’t add a double bond to an alkane by reduction.', '1-pentanol': 'Stay on the alkyne road: reduce a terminal alkyne.' } },
      { have: '1-pentyne', pick: ['acetylide + 1-bromopropane', 'acetylide + 2-bromopropane', 'acetylene + propane', 'ethylene + 1-bromopropane'], right: 'acetylide + 1-bromopropane', step: 'NaNH₂; then CH₃CH₂CH₂Br', why: { 'acetylide + 2-bromopropane': 'A secondary halide gives elimination, not alkylation (§9.8). It would also branch the chain.', 'acetylene + propane': 'Propane has no leaving group.', 'ethylene + 1-bromopropane': 'Ethylene isn’t acidic enough to make an anion (pKa 44).' } },
    ],
    start: 'acetylene',
  },
}

// the Planner's Summit runs WE 9.1 forward: three flasks in order
export const SUMMIT_ORDER = ['nanh2', 'mei', 'lindlar']
export const SUMMIT_FLASKS = { nanh2: 'NaNH₂', mei: 'CH₃I', lindlar: 'H₂, Lindlar catalyst', li: 'Li in NH₃', hbr: 'HBr' }
