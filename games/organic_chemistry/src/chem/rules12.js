// Chemistry rules for World 12, the Observatory of Light (book Chapter 12, Structure Determination: Mass
// Spectrometry and Infrared Spectroscopy, pp. 385–418). Every puzzle judges against this file.

// ---------- §12.5 the electromagnetic spectrum, lowest energy first (Fig 12.17; ε = hν = hc/λ)
export const EM = ['radio waves', 'microwaves', 'infrared', 'visible', 'ultraviolet', 'X rays', 'gamma rays']

// ---------- §12.2 hexane: M⁺ 86; what each fragment lost (Fig 12.7)
export const HEXANE = { M: 86, peaks: [
  { mz: 71, lost: 'CH₃ (15)' }, { mz: 57, lost: 'C₂H₅ (29)', base: true }, { mz: 43, lost: 'C₃H₇ (43)' },
] }
export const LOSSES = ['CH₃ (15)', 'C₂H₅ (29)', 'C₃H₇ (43)', 'H₂O (18)']
// the two unlabeled C7H14 samples (p. 390)
export const SAMPLES = {
  q: 'Both samples show M⁺ = 98 (C₇H₁₄). Sample A’s base peak is at m/z = 69; sample B’s is at 83. Which is methylcyclohexane?',
  opts: [['b', 'Sample B: 98 − 15 = 83, the loss of its CH₃', true], ['a', 'Sample A: 98 − 29 = 69', false], ['n', 'Neither can be told apart', false]],
  why: { a: '98 − 69 = 29: that’s an ethyl group lost. Which sample has an ethyl group to lose?', n: 'They differ in their fragments, if not their mass.' },
}

// ---------- §12.3 isotope plaques: M and M + 2 heights, and the molecular weight's parity
export const PLAQUES = [
  { id: 'cl', name: 'chloroethane', M: 64, M2: 66, ratio: '3 : 1', door: 'chlorine', note: '³⁵Cl : ³⁷Cl is about 3 : 1, so M : M + 2 is 3 : 1 (Fig 12.12).' },
  { id: 'br', name: '1-bromohexane', M: 164, M2: 166, ratio: '1 : 1', door: 'bromine', note: '⁷⁹Br and ⁸¹Br are nearly 50 : 50, so M and M + 2 are about equal (Fig 12.13).' },
  { id: 'n', name: 'triethylamine', M: 101, M2: null, ratio: 'no M + 2', door: 'nitrogen', note: 'An odd molecular weight: an odd number of nitrogens (the nitrogen rule).' },
]

// ---------- §12.7–12.8 IR bands (Table 12.1), the bell molecules, and the families
export const FAMILIES = ['alcohol', 'terminal alkyne', 'ketone', 'aldehyde', 'ester', 'carboxylic acid', 'amine', 'alkene']
export const BELLS = [
  { id: 'b1', bands: [{ at: 3400, w: 260, s: 0.8, label: '3400, broad' }, { at: 2950, w: 60, s: 0.6, label: '2950' }], family: 'alcohol', why: 'A broad, intense band at 3400–3650: O–H, broadened by hydrogen bonding.' },
  { id: 'b2', bands: [{ at: 3300, w: 30, s: 0.8, label: '3300, sharp' }, { at: 2150, w: 30, s: 0.5, label: '2150' }], family: 'terminal alkyne', why: '≡C–H at 3300 and C≡C at 2100–2260: a terminal alkyne.' },
  { id: 'b3', bands: [{ at: 2950, w: 60, s: 0.6, label: '2950' }, { at: 1715, w: 30, s: 0.95, label: '1715' }], family: 'ketone', why: 'A strong C=O at 1715, and no aldehyde C–H near 2750: a saturated ketone.' },
  { id: 'b4', bands: [{ at: 2750, w: 30, s: 0.35, label: '2750' }, { at: 2850, w: 30, s: 0.35, label: '2850' }, { at: 1730, w: 30, s: 0.95, label: '1730' }], family: 'aldehyde', why: 'C=O at 1730 plus the aldehyde C–H pair at 2750 and 2850.' },
  { id: 'b5', bands: [{ at: 1735, w: 30, s: 0.95, label: '1735' }, { at: 1200, w: 80, s: 0.7, label: '1300–1000' }], family: 'ester', why: 'C=O at 1735 and strong C–O bands between 1300 and 1000: a saturated ester.' },
]

// ---------- the boss: three disguises; the evidence and the candidates
export const DISGUISES = [
  { id: 'd1', M: 58, base: 43, M2: false, bands: [{ at: 1715, w: 30, s: 0.95, label: '1715' }], right: 'acetone', opts: ['acetone', 'propanal', 'butanal', '2-propanol'],
    why: { propanal: 'Propanal also weighs 58, but an aldehyde shows C=O near 1730 and C–H at 2750. These bands say ketone.', butanal: 'Butanal weighs 72, not 58.', '2-propanol': '2-Propanol weighs 60 and would show a broad O–H near 3400.' } },
  { id: 'd2', M: 72, base: 44, M2: false, bands: [{ at: 2750, w: 30, s: 0.35, label: '2750' }, { at: 1730, w: 30, s: 0.95, label: '1730' }], right: 'butanal', opts: ['butanal', '2-butanone', 'acetone', '1-butanol'],
    why: { '2-butanone': '2-Butanone also weighs 72, but a ketone’s C=O sits at 1715 with no 2750 band.', acetone: 'Acetone weighs 58.', '1-butanol': '1-Butanol weighs 74 and shows a broad O–H, not a C=O.' } },
  { id: 'd3', M: 74, base: 43, M2: false, bands: [{ at: 1735, w: 30, s: 0.95, label: '1735' }, { at: 1240, w: 60, s: 0.7, label: '1240' }], right: 'methyl acetate', opts: ['methyl acetate', 'propanoic acid', 'butanal', '2-butanone'],
    why: { 'propanoic acid': 'Propanoic acid also weighs 74, but an acid shows a very broad O–H from 2500 to 3100. There isn’t one.', butanal: 'Butanal weighs 72.', '2-butanone': '2-Butanone weighs 72.' } },
]
