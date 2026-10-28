// Chemistry rules for World 6, the Activation Peaks (book Chapter 6, An Overview of Organic Reactions,
// pp. 171–206). Every puzzle judges against this file.

// ---------- §6.1 the four kinds of reaction (text examples, p. 172; Problem 6-1, p. 173)
export const KINDS = ['addition', 'elimination', 'substitution', 'rearrangement']
export const KIND_RULE = {
  addition: 'two reactants become one product, nothing left over',
  elimination: 'one reactant splits into two products, often losing a small molecule like water or HBr',
  substitution: 'two reactants exchange parts to give two new products',
  rearrangement: 'one reactant reorganizes into an isomer',
}
export const REACTIONS = [
  { id: 'r1', eq: 'H₂C=CH₂ + HBr → CH₃CH₂Br', kind: 'addition', note: 'ethylene and HBr (p. 172)' },
  { id: 'r2', eq: 'alcohol → alkene + H₂O (acid)', kind: 'elimination', note: 'an alcohol losing water (p. 172)' },
  { id: 'r3', eq: 'methyl acetate + H₂O → acetic acid + methanol', kind: 'substitution', note: 'an ester and water (p. 172)' },
  { id: 'r4', eq: 'dihydroxyacetone phosphate → glyceraldehyde 3-phosphate', kind: 'rearrangement', note: 'a step in glycolysis (p. 172)' },
  { id: 'r5', eq: 'CH₃Br + KOH → CH₃OH + KBr', kind: 'substitution', note: 'Problem 6-1a' },
  { id: 'r6', eq: 'CH₃CH₂Br → H₂C=CH₂ + HBr', kind: 'elimination', note: 'Problem 6-1b' },
  { id: 'r7', eq: 'H₂C=CH₂ + H₂ → CH₃CH₃', kind: 'addition', note: 'Problem 6-1c' },
]

// ---------- §6.2 breaking a bond
// heterolytic: both electrons go to one fragment (a full-headed arrow) → ions; homolytic: one each (fishhooks) → radicals
export const CRYSTALS6 = [
  { id: 'HBr', bond: 'H–Br', ions: 'H⁺ + Br⁻', radicals: 'H· + Br·' },
  { id: 'Cl2', bond: 'Cl–Cl', ions: 'Cl⁺ + Cl⁻', radicals: 'Cl· + Cl·' },
]

// ---------- §6.3 polarity of a carbon (Table 6.1): bonded to a more electronegative atom it is δ+ (electrophilic);
// to a metal, δ− (nucleophilic)
export const PILLARS = [
  { id: 'p1', mol: 'CH₃Cl', site: 'C', delta: '+', why: 'Cl is more electronegative: the carbon is δ+, electron-poor, an electrophile.' },
  { id: 'p2', mol: 'CH₃Li', site: 'C', delta: '−', why: 'Li is a metal, less electronegative than C: the carbon is δ−, electron-rich. Nothing to grab.' },
  { id: 'p3', mol: 'CH₃OH', site: 'C', delta: '+', why: 'O pulls the electrons: the carbon is δ+.' },
  { id: 'p4', mol: 'H₂C=O (carbonyl C)', site: 'C', delta: '+', why: 'The C=O carbon is δ+: carbonyl compounds are electrophiles (p. 177).' },
  { id: 'p5', mol: 'CH₃MgBr', site: 'C', delta: '−', why: 'Mg is a metal: the carbon is δ−, a nucleophile (Table 6.1).' },
]

// ---------- §6.5 curved arrows for HBr + ethylene (Fig 6.? , pp. 178–181): sources and sinks, step by step
export const ARROW_STEPS = [
  { step: 'Step 1', from: ['π bond (C=C)', 'H of HBr', 'Br of HBr', 'C–H bond'], want: ['π bond (C=C)', 'H of HBr'],
    ok: 'The π electrons (the nucleophile) attack the H of HBr (the electrophile); the H–Br pair leaves with Br.',
    tip: 'Arrows start at electrons — a lone pair or a bond — and end at the electron-poor atom. Which of these is electron-rich?' },
  { step: 'Step 2', from: ['Br⁻ lone pair', 'carbocation C⁺', 'C–H bond', 'π bond (C=C)'], want: ['Br⁻ lone pair', 'carbocation C⁺'],
    ok: 'Br⁻ gives a lone pair to the carbocation (six electrons, positive): C–Br forms, charge is conserved.',
    tip: 'The π bond is gone after step 1. What is now electron-rich, and what is electron-poor?' },
]

// ---------- §6.6 the methane chlorination chain
export const CHAIN = { need: 3 }

// ---------- §6.8 bond dissociation energies (Table 6.3, p. 188), kJ/mol
export const BDE = { 'CH₃–H': 439, 'Cl–Cl': 242, 'CH₃–Cl': 350, 'H–Cl': 431, 'Br–Br': 194, 'CH₃–Br': 294, 'H–Br': 366, 'H–H': 436 }
export const LEDGER = [
  { id: 'chlor', eq: 'CH₄ + Cl₂ → CH₃Cl + HCl', broken: ['CH₃–H', 'Cl–Cl'], formed: ['CH₃–Cl', 'H–Cl'] }, // 681 − 781 = −100
  { id: 'brom', eq: 'CH₄ + Br₂ → CH₃Br + HBr', broken: ['CH₃–H', 'Br–Br'], formed: ['CH₃–Br', 'H–Br'] }, // 633 − 660 = −27
]
export const ledgerH = (l) => l.broken.reduce((s, b) => s + BDE[b], 0) - l.formed.reduce((s, b) => s + BDE[b], 0)

// ---------- §6.9–6.10 energy diagrams for the Twin Passes and the Wyrm (kJ/mol, relative to the reactants)
// Each route: [{ ts, after }] — the transition-state height, then the valley (intermediate or product) after it.
// The tall direct route is HBr + ethylene's first step (ΔG‡ ≈ 140, p. 190); the room-temperature limit is ~80 (p. 190).
export const ROOM_T = 80
export const PASSES = {
  direct: [{ ts: 140, after: 60 }, { ts: 70, after: -45 }],
  enzyme: [{ ts: 50, after: 20 }, { ts: 60, after: 5 }, { ts: 55, after: -15 }, { ts: 45, after: -45 }],
}
export const highestTS = (route) => Math.max(...route.map((s) => s.ts))
// the Wyrm's three crossings: route A and route B; the faster is the one with the lower highest-TS (ΔG° doesn't decide)
export const WYRM_ROUTES = [
  { a: [{ ts: 95, after: -60 }], b: [{ ts: 55, after: -10 }] },
  { a: [{ ts: 45, after: 25 }, { ts: 70, after: -30 }], b: [{ ts: 85, after: -70 }] },
  { a: [{ ts: 60, after: 30 }, { ts: 110, after: -80 }], b: [{ ts: 75, after: 10 }, { ts: 65, after: -20 }] },
]
export const fasterRoute = (r) => (highestTS(r.a) < highestTS(r.b) ? 'a' : 'b')
