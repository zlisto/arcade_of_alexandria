// Chemistry rules for World 10, the Halogen Marsh (book Chapter 10, Organohalides, pp. 317–340).
// Every puzzle judges against this file.

/** a fresh random order (Fisher–Yates); panels call it once per mount, scenes once per visit */
export const shuffled = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }
/** products the book doesn't print: worked out from its rules, shown with a † (codex: "† on a product name") */
export const UNPRINTED = new Set(['1-bromobutane', '2-chlorobutane', '1-chloropropane', '2-chloropropane', '2-chloro-3-methylbutane'])
export const shown = (n) => (UNPRINTED.has(n) ? `${n} †` : n)
/** how long a toast stays up: ~3.5 words a second, never under 3.2 s */
export const readMs = (t) => Math.max(3200, Math.round((String(t).split(/\s+/).length / 3.5) * 1000) + 800)

// ---------- §10.1 naming: Magnus's markers (options are shuffled per mount; the right name is never the longest)
export const MARKERS = [
  { id: 'n1', formula: 'CH₃CH₂CHBrCH₃', opts: [['a', '2-bromobutane'], ['b', '3-bromobutane'], ['c', '1-bromo-1-methylpropane']], right: 'a',
    why: { b: 'Number from the end nearer the substituent.', c: 'Find the longest chain first: it has four carbons, not three.' } },
  { id: 'n2', formula: 'CH₃CHClCH₂CH(CH₃)₂', opts: [['a', '2-chloro-4-methylpentane'], ['b', '4-chloro-2-methylpentane'], ['c', '2-methyl-4-chloropentane'], ['d', '1-chloro-1,3-dimethylbutane']], right: 'a',
    why: { b: 'Both ends give 2 and 4. On a tie, the substituent first in the alphabet takes the lower number.', c: 'Substituents are listed in alphabetical order.', d: 'Find the longest chain first: it has five carbons.' } },
  { id: 'n3', formula: 'BrCH₂CH₂CH₂CH₂I', opts: [['a', '1-bromo-4-iodobutane'], ['b', '1-iodo-4-bromobutane'], ['c', '4-bromo-1-iodobutane']], right: 'a',
    why: { b: 'List different halogens in alphabetical order.', c: '1 and 4 either way. On a tie, the halogen first in the alphabet takes C1.' } },
]

// ---------- §10.1 Table 10.1: halomethanes
export const CX = [
  { id: 'F', bond: 'C–F', len: 139, D: 460 },
  { id: 'Cl', bond: 'C–Cl', len: 178, D: 350 },
  { id: 'Br', bond: 'C–Br', len: 193, D: 294 },
  { id: 'I', bond: 'C–I', len: 214, D: 239 },
]
export const CX_ORDER = [...CX].sort((a, b) => b.D - a.D).map((c) => c.id) // strongest first
/** the bog's sockets ask for one of these, drawn per visit; the length–strength link (Table 10.1) is the puzzle.
 *  `tag` is what the bank stones show: a strength goal labels them by length only, a length goal by strength only, so the
 *  halogen (and reciting the group) never answers it; the halogen shows once a stone is laid. Down the group a C–X bond
 *  is both longer and weaker, so the four goals give two orders, each asked through a different property. */
const byLen = [...CX].sort((a, b) => b.len - a.len).map((c) => c.id) // longest first
export const BOG_GOALS = {
  strong: { label: 'the strongest bond first', next: 'a stronger bond', order: CX_ORDER, tag: 'len', sum: 'Strongest, and so shortest, first' },
  weak: { label: 'the weakest bond first', next: 'a weaker bond', order: [...CX_ORDER].reverse(), tag: 'len', sum: 'Weakest, and so longest, first' },
  long: { label: 'the longest bond first', next: 'a longer bond', order: byLen, tag: 'D', sum: 'Longest, and so weakest, first' },
  short: { label: 'the shortest bond first', next: 'a shorter bond', order: [...byLen].reverse(), tag: 'D', sum: 'Shortest, and so strongest, first' },
}
/** a bank stone's tag for a goal: one property only */
export const stoneTag = (c, goal) => (BOG_GOALS[goal].tag === 'len' ? `a ${c.len} pm stone` : `a ${c.D} kJ/mol stone`)

// ---------- §10.2 radical chlorination: per-H reactivity (p. 321)
export const REACT = { primary: 1, secondary: 3.5, tertiary: 5 }
// h1 is propane, which the book doesn't work (its ratio carries a †); butane, the book's own example, is the lesson card's
export const HUNTS = [
  { id: 'h1', name: 'propane', groups: [{ kind: 'primary', n: 6, product: '1-chloropropane' }, { kind: 'secondary', n: 2, product: '2-chloropropane' }], book: null },
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
  if (spring.ok.includes(rg)) return { ok: true, text: `${shown(spring.want)}! ${spring.kind === 'tertiary' ? 'HX works fast on a tertiary alcohol, even cold.' : `${ALC_REAGENTS[rg]} converts a ${spring.kind} alcohol under mild conditions.`}` }
  if ((rg === 'hcl' || rg === 'hbr') && spring.kind !== 'tertiary') return { ok: false, text: `HX on a ${spring.kind} alcohol is slow, needs heat and can cause rearrangements. Primary and secondary alcohols want a milder reagent.` }
  if (rg === 'hbr' || rg === 'pbr3') return { ok: false, text: `That gives a bromide. This spring wants a chloride.` }
  // the book recommends SOCl₂ for primary and secondary alcohols and HX for tertiary ones (p. 326); it never says SOCl₂
  // fails on a tertiary alcohol, so the toast states the book's scope (the codex † entry flags the penalty as the game's)
  if (rg === 'socl2' && spring.kind === 'tertiary') return { ok: false, text: 'SOCl₂ is the book’s reagent for primary and secondary alcohols. A tertiary one takes plain HX, fast even when cold.' }
  if (rg === 'socl2' || rg === 'hcl') return { ok: false, text: `That gives a chloride. This spring wants a bromide.` }
  return { ok: false, text: 'Nothing happens.' }
}

// ---------- §10.8 oxidation level: (C–O + C–N + C–X bonds) − (C–H bonds), summed over every carbon (a C=O counts twice;
// an O–H is not a C–H). The trial is Worked Example 10.2's own set (p. 332): propane < propene = 2-propanol < acetone.
// Counting H alone fails here (propene and acetone both have 6 H; 2-propanol and propane both have 8), so the player has
// to count C–H and C–O bonds. The lesson card shows Fig 10.7's one-carbon columns (p. 331).
export const OXI = [
  { id: 'propane', name: 'propane, CH₃CH₂CH₃', CO: 0, CX: 0, CH: 8 },
  { id: 'propene', name: 'propene, CH₂=CHCH₃', CO: 0, CX: 0, CH: 6 },
  { id: 'propanol', name: '2-propanol, (CH₃)₂CHOH', CO: 1, CX: 0, CH: 7 },
  { id: 'acetone', name: 'acetone, (CH₃)₂C=O', CO: 2, CX: 0, CH: 6 },
]
export const oxLevel = (m) => m.CO + m.CX - m.CH
/** the rungs, lowest first: each holds every compound at that level */
export const OXI_RUNGS = [...new Set(OXI.map(oxLevel))].sort((a, b) => a - b).map((L) => OXI.filter((m) => oxLevel(m) === L).map((m) => m.id))

// ---------- the boss: three rounds, three ideas. Each round has variants drawn from the book's own molecules; a wrong mark
// lashes and swaps to a different variant (new molecule or tail set, marks at new spots), so elimination doesn't carry over.
// 1 (§10.3): which H does Br· take first? 2 (§10.4): strike the two carbons that share the radical's electron, inside the
// window. 3 (§10.6): ring every tail that takes Mg: R–X with Cl, Br or I, alkyl, vinylic or aryl; organofluorides rarely react.
const VIN = 'is vinylic, on the double bond itself: about 465 kJ/mol, the strongest C–H here.'
export const HYDRA10 = [
  { id: 'h', bite: 4.2, variants: [
    { title: '1-butene, CH₂=CH–CH₂–CH₃ · which H goes first?', win: 'Br· takes the H on C3: allylic, about 370 kJ/mol, the weakest here. A radical is left behind…', marks: [
      { id: 'c3', label: 'H on C3', right: true },
      { id: 'c1', label: 'H on C1', why: `C1’s H ${VIN}` },
      { id: 'c4', label: 'H on C4', why: 'C4’s H is a primary C–H, about 421 kJ/mol. A weaker C–H sits next to the double bond.' },
    ] },
    { title: 'cyclohexene, C1=C2 · which H goes first?', win: 'Br· takes the H on C6: allylic, about 370 kJ/mol, the weakest here. A radical is left behind…', marks: [
      { id: 'c6', label: 'H on C6', right: true },
      { id: 'c1', label: 'H on C1', why: `C1’s H ${VIN}` },
      { id: 'c4', label: 'H on C4', why: 'C4’s H is a plain secondary C–H, about 410 kJ/mol. A weaker C–H sits next to the double bond.' },
    ] },
    { title: 'methylenecyclohexane, ring C1=CH₂ · which H goes first?', win: 'Br· takes the H on ring C2: allylic, about 370 kJ/mol, the weakest here. A radical is left behind…', marks: [
      { id: 'c2', label: 'H on ring C2', right: true },
      { id: 'ch2', label: 'H on the =CH₂', why: `The =CH₂’s H ${VIN}` },
      { id: 'c4', label: 'H on ring C4', why: 'Ring C4’s H is a plain secondary C–H, about 410 kJ/mol. A weaker C–H sits next to the double bond.' },
    ] },
  ] },
  { id: 'r', bite: 3.6, window: 1.8, variants: [
    { title: '1-butene lost its C3 H · which carbons hold the electron?', marks: [
      { id: 'e1', label: 'C1', right: true }, { id: 'e3', label: 'C3', right: true },
      { id: 'e2', label: 'C2', why: 'C2 gets no share of the unpaired electron. Only the two ends hold it.' },
    ] },
    { title: 'cyclohexene lost a C6 H · which carbons hold the electron?', marks: [
      { id: 'e2', label: 'C2', right: true }, { id: 'e6', label: 'C6', right: true },
      { id: 'e1', label: 'C1', why: 'C1 is the middle of this allyl system: it gets no share of the unpaired electron. Only the two ends hold it.' },
    ] },
    { title: '1-octene lost its C3 H · which carbons hold the electron?', marks: [
      { id: 'e1', label: 'C1', right: true }, { id: 'e3', label: 'C3', right: true },
      { id: 'e4', label: 'C4', why: 'C4 is outside the allyl system: its electrons are all paired. Only the allyl system’s two ends hold the electron.' },
    ] },
  ] },
  { id: 'g', bite: 3.0, variants: [
    { title: 'tail set A · ring every one that takes Mg', marks: [
      { id: 'cl', label: 'alkyl C–Cl tail', right: true },
      { id: 'f', label: 'alkyl C–F tail', why: 'Organofluorides rarely react with magnesium.' },
      { id: 'ar', label: 'aryl C–Br tail', right: true },
    ] },
    { title: 'tail set B · ring every one that takes Mg', marks: [
      { id: 'vin', label: 'vinylic C–Br tail', right: true },
      { id: 'f', label: 'alkyl C–F tail', why: 'A halogen, yes, but fluorine. Organofluorides rarely react with magnesium.' },
      { id: 'i', label: 'alkyl C–I tail', right: true },
    ] },
    { title: 'tail set C · ring every one that takes Mg', marks: [
      { id: 'f', label: 'aryl C–F tail', why: 'Organofluorides rarely react with magnesium, aryl or not.' },
      { id: 'vf', label: 'vinylic C–F tail', why: 'Vinylic halides can take Mg, but this one is a fluoride, and organofluorides rarely react with magnesium.' },
      { id: 'br', label: 'alkyl C–Br tail', right: true },
    ] },
  ] },
]
