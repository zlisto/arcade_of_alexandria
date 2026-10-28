// Chemistry rules for World 11, the Arena of Five (book Chapter 11, Reactions of Alkyl Halides: Nucleophilic
// Substitutions and Eliminations, pp. 341–384). Every puzzle judges against this file.

// ---------- §11.1 the Walden cycle for 1-phenyl-2-propanol (Fig 11.3): which step inverts the centre?
export const WALDEN_STEPS = [
  { id: 1, text: 'Step 1: the alcohol + TsCl gives a tosylate.', why: 'The O–H bond breaks, not the C–O bond at the centre: no inversion here.' },
  { id: 2, text: 'Step 2: acetate ion replaces the tosylate.', why: 'A nucleophile replaces the leaving group at the chirality centre itself: the inverting step.', right: true },
  { id: 3, text: 'Step 3: the acetate is cleaved back to an alcohol.', why: 'The bond broken is in the acetate, not the C–O bond at the centre: no inversion here.' },
]

// ---------- §11.3 SN2 dials: the fastest choice on each, with the reason for each wrong one
export const DIALS = [
  { id: 'sub', name: 'Substrate', opts: [['me', 'CH₃Br (methyl)'], ['pri', 'CH₃CH₂Br (primary)'], ['sec', '(CH₃)₂CHBr (secondary)'], ['ter', '(CH₃)₃CBr (tertiary)']], best: 'me',
    why: { pri: 'Primary is fast, but methyl is faster: nothing in the nucleophile’s way.', sec: 'Branching at the reacting carbon slows SN2 greatly.', ter: 'Tertiary halides effectively halt SN2: the back side is blocked.' } },
  { id: 'nu', name: 'Nucleophile', opts: [['ho', 'HO⁻'], ['h2o', 'H₂O']], best: 'ho',
    why: { h2o: 'Negatively charged nucleophiles are usually more reactive than neutral ones (§11.3).' } },
  { id: 'lg', name: 'Leaving group', opts: [['br', '–Br'], ['ts', '–OTs (tosylate)'], ['oh', '–OH']], best: ['br', 'ts'],
    why: { oh: 'OH⁻ is a strong base: a poor leaving group. Alcohols don’t undergo SN2 until the –OH is made into something better.' } },
  { id: 'sol', name: 'Solvent', opts: [['dmf', 'DMF (polar aprotic)'], ['meoh', 'methanol (protic)']], best: 'dmf',
    why: { meoh: 'Protic solvents cage the nucleophile in hydrogen bonds and slow SN2. Polar aprotic solvents leave it free.' } },
]
export const dialOk = (d, v) => (Array.isArray(d.best) ? d.best.includes(v) : d.best === v)

// ---------- §11.12 the Champion's trial: name the mechanism
export const MECHS = ['SN2', 'SN1', 'E2', 'E1', 'E1cB']
export const TRIAL = [
  { id: 't1', sub: 'a primary alkyl bromide', cond: 'with NaCN, a good nucleophile, in DMF', right: 'SN2', why: 'Primary + good nucleophile: SN2.' },
  { id: 't2', sub: 'a tertiary alkyl bromide', cond: 'with sodium ethoxide, a strong base', right: 'E2', why: 'Tertiary + a base: E2.' },
  { id: 't3', sub: 'a tertiary alkyl bromide', cond: 'in pure ethanol, no base', right: 'SN1', alt: 'E1', why: 'Tertiary under neutral conditions: SN1 and E1 together (the gate takes either).' },
  { id: 't4', sub: 'a secondary alkyl bromide', cond: 'with a strong base (ethoxide)', right: 'E2', why: 'Secondary + strong base: E2 predominates.' },
  { id: 't5', sub: 'a halide two carbons away from a C=O', cond: 'with a base', right: 'E1cB', why: 'Leaving group two carbons from a carbonyl: E1cB, through a carbanion.' },
]

// ---------- §11.7 Zaitsev: 2-bromobutane + a strong base
export const ZAITSEV = {
  q: '2-Bromobutane meets a strong base. Which alkene is the major product?',
  opts: [['a', '2-butene, CH₃CH=CHCH₃ (disubstituted)', true], ['b', '1-butene, CH₂=CHCH₂CH₃ (monosubstituted)', false], ['c', 'Both equally', false]],
  yes: 'Right: the more substituted (more stable) alkene predominates (Zaitsev’s rule, 1875).',
  no: { b: 'That one forms too, but less: base-induced elimination generally gives the more substituted alkene.', c: 'Eliminations give mixtures, but not equal ones: which alkene is more stable (Table 7.2)?' },
}

// ---------- the boss: four rounds of conditions; the stance to call, and how to exploit it
export const STANCES = [
  { mech: 'SN2', cond: 'primary substrate · CN⁻ · DMF', tell: 'It turns side-on, its back exposed: strike it from behind with the Umbrella (G).' },
  { mech: 'SN1', cond: 'tertiary substrate · water · no base', tell: 'It lets its leaving group go and stands flat and open: wait for the cation, then strike.' },
  { mech: 'E2', cond: 'secondary substrate · ethoxide (strong base)', tell: 'It sweeps a proton and its leaving group off in one anti-periplanar slash: roll through it, then strike.' },
  { mech: 'E1cB', cond: 'C=O two carbons from the leaving group · base', tell: 'It loses its proton first and holds a carbanion: strike its carbonyl side before it expels the leaving group.' },
]
