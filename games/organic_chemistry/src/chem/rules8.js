// Chemistry rules for World 8, the Reagent Orchards (book Chapter 8, Alkenes: Reactions and Synthesis,
// pp. 243–286). Every puzzle judges against this file. Products are the ones the chapter's text names.

export const REAGENTS = {
  br2: { name: 'Br₂ in CH₂Cl₂', adds: 'X–X', color: '#c86a3a', sec: '8.2' },
  br2w: { name: 'Br₂, H₂O', adds: 'HO–X', color: '#e8a060', sec: '8.3' },
  hg: { name: 'Hg(OAc)₂, H₂O; then NaBH₄', adds: 'H–OH (Markovnikov)', color: '#c8c8d8', sec: '8.4' },
  bh3: { name: 'BH₃; then H₂O₂, OH⁻', adds: 'H–OH (non-Markovnikov, syn)', color: '#8ad0ff', sec: '8.5' },
  h2: { name: 'H₂, Pd/C', adds: 'H–H (syn)', color: '#e8e8e8', sec: '8.6' },
  mcpba: { name: 'RCO₃H (a peroxyacid)', adds: 'O (an epoxide, syn)', color: '#ffd060', sec: '8.7' },
  h3o: { name: 'H₃O⁺', adds: 'opens an epoxide from the back', color: '#9aff9a', sec: '8.7' },
  oso4: { name: 'OsO₄; then NaHSO₃', adds: 'HO–OH (syn)', color: '#6a6aff', sec: '8.7' },
  o3: { name: 'O₃; then Zn, CH₃CO₂H', adds: 'cuts C=C into two C=O', color: '#7ae8ff', sec: '8.8' },
  ccl2: { name: 'CHCl₃, KOH', adds: ':CCl₂ (a cyclopropane)', color: '#6fe39a', sec: '8.9' },
  ss: { name: 'CH₂I₂, Zn(Cu)', adds: 'CH₂ (a cyclopropane)', color: '#b0a0ff', sec: '8.9' },
}

// what each reagent does to each altar's alkene (only the outcomes the chapter describes; anything else: null)
// a third entry `true` marks an outcome worked out from the chapter's rules that the book doesn't print; the player
// sees it as a "†" on the product name, explained in the codex and the recipe-board lesson
const OUT = {
  cyclopentene: {
    br2: ['trans-1,2-dibromocyclopentane', 'The bromonium bridges one face; Br⁻ comes in from the other: anti (§8.2).'],
    br2w: ['trans-2-bromocyclopentanol', 'Water outnumbers bromide, so water opens the bromonium: a bromohydrin, still anti (§8.3; Problem 8-5).', true], // our answer (Problem 8-5)
    h2: ['cyclopentane', 'Both H add from the catalyst’s face (§8.6).', true], // our answer (the book prints no product)
  },
  methylcyclopentene: {
    hg: ['1-methylcyclopentanol', 'Oxymercuration puts OH on the more substituted carbon: Markovnikov (§8.4).'],
    h3o: ['1-methylcyclopentanol', 'Acid makes the tertiary carbocation and water adds there: Markovnikov (§8.4, p. 249). Harsh, but it works.', true], // our answer (the book prints no product)
    bh3: ['trans-2-methylcyclopentanol', 'B and H add from one face, B to the less substituted carbon; OH replaces B. Syn, so CH₃ and OH end up trans (§8.5).'],
    h2: ['methylcyclopentane', 'That adds H–H, not water (§8.6).', true], // our answer (the book prints no product)
  },
  cyclohexene: {
    oso4: ['cis-1,2-cyclohexanediol', 'OsO₄ adds both O from one face, through a cyclic osmate: syn (§8.7).', true], // our answer (the book's OsO₄ cases are other alkenes, pp. 260–261)
    mcpba: ['1,2-epoxycyclohexane', 'A peroxyacid hands over one O: an epoxide (§8.7).'],
    h2: ['cyclohexane', 'Both H add from the catalyst’s face (§8.6).', true], // our answer (the book prints no product)
    br2: ['trans-1,2-dibromocyclohexane', 'Anti, through the bromonium ion (§8.2).'],
    h3o: ['cyclohexanol', 'Acid adds water across the C=C through a carbocation (§8.4, p. 249).', true], // our answer (the book prints no product)
  },
  dimethylcyclohexene: {
    h2: ['cis-1,2-dimethylcyclohexane', 'Both H add from the catalyst’s face, so the two CH₃ groups end up cis: syn (§8.6, p. 255).'],
    br2: ['trans-1,2-dibromo-1,2-dimethylcyclohexane', 'The bromonium is opened from the back: the two Br are anti (§8.2).', true], // our answer (the book prints no product)
    oso4: ['cis-1,2-dimethyl-1,2-cyclohexanediol', 'OsO₄ adds both O from one face: a cis diol, syn (§8.7).', true], // our answer (the book prints no product)
    mcpba: ['1,2-epoxy-1,2-dimethylcyclohexane', 'A peroxyacid hands over one O: an epoxide (§8.7).', true], // our answer (the book prints no product)
    h3o: ['1,2-dimethylcyclohexanol', 'Acid adds water through a carbocation, with no control of face (§8.4).', true], // our answer (the book prints no product)
  },
  epoxide: {
    h3o: ['trans-1,2-cyclohexanediol', 'Acid opens the epoxide from the back, like a bromonium: anti (§8.7).'],
  },
  cis2pentene: {
    ccl2: ['cis-1,1-dichloro-2-ethyl-3-methylcyclopropane', 'Dichlorocarbene adds in one step: cis alkene, cis ring. Stereospecific (§8.9).'],
    o3: ['acetaldehyde + propanal', 'Ozone cuts the C=C: each carbon gets a C=O (§8.8). No ring.', true], // our answer (the book prints no product)
    h2: ['pentane', 'H₂ just saturates the C=C (§8.6). No ring.', true], // our answer (the book prints no product)
  },
  trans2pentene: {
    ccl2: ['trans-1,1-dichloro-2-ethyl-3-methylcyclopropane', 'One step, so the geometry is kept: trans alkene, trans ring (§8.9, p. 264).', true], // our answer (the book prints no product)
    o3: ['acetaldehyde + propanal', 'Ozone cuts the C=C: each carbon gets a C=O (§8.8). No ring.', true], // our answer (the book prints no product)
    h2: ['pentane', 'H₂ just saturates the C=C (§8.6). No ring.', true], // our answer (the book prints no product)
  },
  methylbutene: {
    o3: ['acetone + acetaldehyde', 'Ozone cuts the C=C and each carbon gets a C=O. A trisubstituted alkene gives one ketone and one aldehyde (§8.8).', true], // our answer (p. 261 states the rule, not this alkene)
  },
}
export function react(sub, rg) {
  const r = (OUT[sub] || {})[rg]
  if (!r) return null
  return { product: r[0], why: r[1], flag: !!r[2] }
}
/** a product name as the player sees it: "†" when the book doesn't print that outcome */
export const shown = (product, flag) => (flag ? `${product} †` : product)
/** an altar's wanted product as the player sees it: "†" when the outcome that makes it isn't printed in the book */
export function wantShown(a) {
  const rows = [...Object.values(OUT[a.sub] || {}), ...Object.values(OUT[a.twoStep] || {})]
  return shown(a.want, rows.some((r) => r[0] === a.want && r[2]))
}
export const DAGGER_NOTE = '† worked out from the book’s rules; not printed in the text.'

// the altars: what each door wants, and from which alkene
export const ALTARS8 = [
  { id: '8-1a', room: '8-1', sub: 'cyclopentene', want: 'trans-1,2-dibromocyclopentane', title: 'cyclopentene' },
  { id: '8-1b', room: '8-1', sub: 'cyclopentene', want: 'trans-2-bromocyclopentanol', title: 'cyclopentene' },
  { id: '8-2a', room: '8-2', sub: 'methylcyclopentene', want: '1-methylcyclopentanol', title: '1-methylcyclopentene' },
  { id: '8-2b', room: '8-2', sub: 'methylcyclopentene', want: 'trans-2-methylcyclopentanol', title: '1-methylcyclopentene' },
  { id: '8-3a', room: '8-3', sub: 'cyclohexene', want: 'cis-1,2-cyclohexanediol', title: 'cyclohexene' },
  { id: '8-3b', room: '8-3', sub: 'cyclohexene', want: 'trans-1,2-cyclohexanediol', title: 'cyclohexene', twoStep: 'epoxide' },
  // 8-3c: the right pour isn't enough; the player then picks the ring it made from two unlabelled models (pick: true)
  { id: '8-3c', room: '8-3', sub: 'dimethylcyclohexene', want: 'cis-1,2-dimethylcyclohexane', title: '1,2-dimethylcyclohexene', pick: true },
  // 8-4: two 2-pentene altars, one door; only the alkene that is already cis can give the cis ring (solves: the shared goal).
  // The altars show a skeletal drawing (art) instead of a name, and the door states the requirement (wantText), so
  // matching the words "cis" to "cis" no longer works; the names appear only once a pour has been made
  { id: '8-4c', room: '8-4', sub: 'cis2pentene', want: 'cis-1,1-dichloro-2-ethyl-3-methylcyclopropane', title: '2-pentene', art: 'cis', spot: 'south', name: 'cis-2-pentene', wantText: 'a cyclopropane with CH₃ and CH₂CH₃ on the same face of the ring' },
  { id: '8-4t', room: '8-4', sub: 'trans2pentene', want: 'cis-1,1-dichloro-2-ethyl-3-methylcyclopropane', title: '2-pentene', art: 'trans', spot: 'north', name: 'trans-2-pentene', wantText: 'a cyclopropane with CH₃ and CH₂CH₃ on the same face of the ring', solves: '8-4c' },
]
/** pour reagent rg on altar a whose current substrate is sub. returns { product, why, ok, next } */
export function pour(a, sub, rg) {
  const r = react(sub, rg)
  if (!r) return { product: null, why: `${REAGENTS[rg].name} doesn’t do anything useful to ${sub === 'epoxide' ? 'the epoxide' : a.title} here.` }
  const ok = r.product === a.want
  const next = a.twoStep && r.product === '1,2-epoxycyclohexane' ? 'epoxide' : null
  return { ...r, ok, next }
}

// the grove trees: which flasks grow in each room
export const GROVES8 = {
  '8-1': ['br2', 'br2w', 'h2'],
  '8-2': ['hg', 'h3o', 'bh3', 'h2'],
  '8-3': ['oso4', 'mcpba', 'h3o', 'h2', 'br2'],
  '8-4': ['ccl2', 'o3', 'h2'],
}

// Borana's recipe board (prep): what each reagent adds across a C=C
export const RECIPES = ['br2', 'br2w', 'hg', 'bh3', 'h2', 'oso4', 'o3', 'ss']
export const ADDS = ['X–X', 'HO–X', 'H–OH (Markovnikov)', 'H–OH (non-Markovnikov, syn)', 'H–H (syn)', 'HO–OH (syn)', 'cuts C=C into two C=O', 'CH₂ (a cyclopropane)']

// §8.8 the shears: 2-methyl-2-butene, (CH₃)₂C=CHCH₃, cut by O₃ → acetone + acetaldehyde (trisubstituted: a ketone and
// an aldehyde, p. 261); then work backward
// halves carry names only (no formula), so matching them to a carbon takes knowing what each one is
export const SHEAR_HALVES = [
  { id: 'acetone', label: 'acetone', from: 'left' },
  { id: 'acetaldehyde', label: 'acetaldehyde', from: 'right' },
  { id: 'formaldehyde', label: 'formaldehyde', decoy: 'Formaldehyde, H₂C=O, comes from a =CH₂ end. This alkene has none.' },
  { id: 'ethanol', label: 'ethanol', decoy: 'Ethanol is an alcohol. Ozonolysis makes C=O, not C–OH.' },
  { id: 'butanone', label: 'butanone', decoy: 'Butanone, CH₃COCH₂CH₃, has four carbons. Each half keeps only its own end’s carbons.' },
]
export const BACKWARD = {
  q: 'Which alkene gives only acetone, (CH₃)₂C=O, on ozonolysis?',
  opts: [
    ['a', '2,3-dimethyl-2-butene, (CH₃)₂C=C(CH₃)₂', true, 'Both halves are (CH₃)₂C=: two acetones (Problem 8-49).'],
    ['b', '2-methyl-2-butene, (CH₃)₂C=CHCH₃', false, 'The CHCH₃ half becomes acetaldehyde, CH₃CHO: a ketone and an aldehyde.'],
    ['c', '2-methylpropene, (CH₃)₂C=CH₂', false, 'The CH₂ half becomes formaldehyde, CH₂O.'],
    ['d', '2,3-dimethyl-1-butene, CH₂=C(CH₃)CH(CH₃)₂', false, 'The CH₂ end gives formaldehyde; the other end gives 3-methyl-2-butanone, not acetone.'],
  ],
}

// §8.10 the chain barn: ethylene polymerization by hand
// 4 ethylene fonts and 1 propylene font; the chain needs all 5 before it is ended (p. 267: only the secondary radical forms)
export const POLY = { need: 5 }

// §8.12 the racemate gate: 1-butene + H₂O, H⁺ → (±)-2-butanol; the carbocation is planar, attacked equally from both faces
// Fig 8.13, p. 271: water from the top gives (S)-2-butanol, from the bottom (R). Each lock takes `per` keys.
// `face` holds for the model as first drawn (CH₂CH₃ on the player's left); each pour may mirror the arms, which swaps it
// (see `raceCfg`), so the lock has to be worked out by CIP from the model, not remembered
export const RACEMATE = { sub: '1-butene', product: '2-butanol', per: 2, face: { top: 'S', bottom: 'R' }, note: 'The carbocation is flat: water adds from the top or the bottom equally. (R) and (S), 50:50: racemic (Fig 8.13).' }

/** the configuration a pour makes: the face the water came from, on the model as drawn (mirrored: CH₃ and CH₂CH₃ swapped) */
export const raceCfg = (face, mirror) => { const c = RACEMATE.face[face]; return mirror ? (c === 'S' ? 'R' : 'S') : c }

// the boss: three rounds; eggs every `every` seconds; the head grows a segment per egg
export const LEVIATHAN = [{ every: 6, speed: 2.4 }, { every: 4.6, speed: 2.9 }, { every: 3.6, speed: 3.3 }]
