// Chemistry rules for World 10, the Halogen Marsh (book Chapter 10, Organohalides, pp. 317–340).
// Every puzzle judges against this file.

// ---------- §10.1 naming: Magnus's markers
export const MARKERS = [
  { id: 'n1', formula: 'CH₃CH₂CHBrCH₃', opts: [['a', '2-bromobutane'], ['b', '3-bromobutane'], ['c', 'bromobutane']], right: 'a',
    why: { b: 'Number from the end nearer the substituent: Br is on C2.', c: 'Say where the bromine is.' } },
  { id: 'n2', formula: 'CH₃CHClCH₂CH(CH₃)₂', opts: [['a', '2-chloro-4-methylpentane'], ['b', '4-chloro-2-methylpentane'], ['c', '2-methyl-4-chloropentane']], right: 'a',
    why: { b: 'Both ways give substituents on 2 and 4. On a tie, the one first in the alphabet (chloro) gets the lower number (p. 318).', c: 'Substituents go in alphabetical order: chloro before methyl.' } },
  { id: 'n3', formula: 'BrCH₂CH₂CH₂CH₂I', opts: [['a', '1-bromo-4-iodobutane'], ['b', '1-iodo-4-bromobutane'], ['c', '4-bromo-1-iodobutane']], right: 'a',
    why: { b: 'List them alphabetically: bromo before iodo.', c: '1 and 4 either way: on a tie, bromo (first alphabetically) takes C1.' } },
]

// ---------- §10.1 Table 10.1: halomethanes
export const CX = [
  { id: 'F', bond: 'C–F', len: 139, D: 460 },
  { id: 'Cl', bond: 'C–Cl', len: 178, D: 350 },
  { id: 'Br', bond: 'C–Br', len: 193, D: 294 },
  { id: 'I', bond: 'C–I', len: 214, D: 239 },
]
export const CX_ORDER = [...CX].sort((a, b) => b.D - a.D).map((c) => c.id) // strongest first

// ---------- §10.2 radical chlorination: per-H reactivity (p. 321)
export const REACT = { primary: 1, secondary: 3.5, tertiary: 5 }
export const HUNTS = [
  { id: 'h1', name: 'butane', groups: [{ kind: 'primary', n: 6, product: '1-chlorobutane' }, { kind: 'secondary', n: 4, product: '2-chlorobutane' }], book: '30 : 70' },
  { id: 'h2', name: '2-methylpropane', groups: [{ kind: 'primary', n: 9, product: '1-chloro-2-methylpropane' }, { kind: 'tertiary', n: 1, product: '2-chloro-2-methylpropane' }], book: '65 : 35' },
]
export function ratio(h) {
  const w = h.groups.map((g) => g.n * REACT[g.kind])
  const t = w.reduce((a, b) => a + b, 0)
  return w.map((x) => Math.round((100 * x) / t))
}

// ---------- §10.3 C–H bond strengths for the allylic lamps (kJ/mol)
export const CH_BDE = { allylic: 370, secondary: 410, vinylic: 465 }
// cyclohexene's carbons, numbered: C1=C2 the double bond; C3 and C6 allylic; C4, C5 plain secondary
export const CYCLO_H = [
  { c: 1, kind: 'vinylic' }, { c: 2, kind: 'vinylic' }, { c: 3, kind: 'allylic' },
  { c: 4, kind: 'secondary' }, { c: 5, kind: 'secondary' }, { c: 6, kind: 'allylic' },
]

// ---------- §10.5 alcohols to halides
export const SPRINGS = [
  { id: '10-4a', alcohol: '1-methylcyclohexanol', kind: 'tertiary', want: '1-chloro-1-methylcyclohexane', ok: ['hcl'] },
  { id: '10-4b', alcohol: '1-butanol', kind: 'primary', want: '1-bromobutane', ok: ['pbr3'] },
  { id: '10-4c', alcohol: '2-butanol', kind: 'secondary', want: '2-chlorobutane', ok: ['socl2'] },
]
export const ALC_REAGENTS = { hcl: 'HCl', hbr: 'HBr', socl2: 'SOCl₂', pbr3: 'PBr₃' }
export function convert(spring, rg) {
  if (spring.ok.includes(rg)) return { ok: true, text: `${spring.want}! ${spring.kind === 'tertiary' ? 'HX works fast on a tertiary alcohol (§10.5).' : `${ALC_REAGENTS[rg]} converts a ${spring.kind} alcohol under mild conditions (§10.5).`}` }
  if ((rg === 'hcl' || rg === 'hbr') && spring.kind !== 'tertiary') return { ok: false, text: `HX on a ${spring.kind} alcohol is slow and needs heat; it can also cause rearrangements. Use SOCl₂ or PBr₃ (§10.5).` }
  if (rg === 'hbr' || rg === 'pbr3') return { ok: false, text: `That gives a bromide. This door wants ${spring.want}.` }
  if (rg === 'socl2' || rg === 'hcl') return { ok: false, text: spring.kind === 'tertiary' ? 'Tertiary alcohols react fastest with plain HX: no need for SOCl₂.' : `That gives a chloride. This door wants ${spring.want}.` }
  return { ok: false, text: 'Nothing happens.' }
}

// ---------- §10.8 oxidation level: (C–O + C–N + C–X bonds) − (C–H bonds), one-carbon compounds (Fig 10.7)
export const OXI = [
  { id: 'ch4', name: 'CH₄', CO: 0, CX: 0, CH: 4 },
  { id: 'ch3cl', name: 'CH₃Cl', CO: 0, CX: 1, CH: 3 },
  { id: 'ch2o', name: 'H₂C=O', CO: 2, CX: 0, CH: 2 },
  { id: 'hco2h', name: 'HCO₂H', CO: 3, CX: 0, CH: 1 },
  { id: 'co2', name: 'CO₂', CO: 4, CX: 0, CH: 0 },
]
export const oxLevel = (m) => m.CO + m.CX - m.CH
export const OXI_ORDER = [...OXI].sort((a, b) => oxLevel(a) - oxLevel(b)).map((m) => m.id) // lowest first

// ---------- the boss: three rounds; the window to strike the second head after the first
export const HYDRA10 = [{ window: 1.8, bite: 4.2 }, { window: 1.5, bite: 3.6 }, { window: 1.2, bite: 3.0 }]
