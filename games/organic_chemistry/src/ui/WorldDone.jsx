import { BOOK } from '../data/codex'

// The card that opens after Kai warps out of a cleared dungeon: which chapter the world taught, with
// its sections, and where to go next. (It replaced the separate end-of-world screens.)

const WORLDS = {
  1: {
    world: 'The Orbital Caverns',
    chapter: 'Chapter 1, Structure and Bonding',
    pages: '7–36',
    points: [
      'Atoms: protons set the element (Z); isotopes differ only in neutrons (§1.1)',
      'Electron configurations: Aufbau, Pauli, Hund (§1.3)',
      'Bonds needed for an octet: H 1, C 4, N 3, O 2; bond length at the energy minimum (§1.4–1.5)',
      'Hybrid orbitals: sp³ 109.5°, sp² 120° + π, sp 180° + 2π (§1.6–1.10)',
      'Skeletal structures: carbons at corners, hydrogens implied (§1.12)',
    ],
    next: 'Next: the east road out of Hydrogen Village, across the Valence Fields to the Tide Coast (Chapter 2).',
  },
  2: {
    world: 'The Tide Temple',
    chapter: 'Chapter 2, Polar Covalent Bonds; Acids and Bases',
    pages: '37–70',
    points: [
      'Electronegativity: the more electronegative atom in a bond is δ− (§2.1)',
      'Dipole moments: bond dipoles add up in bent H₂O and NH₃, and cancel in linear CO₂ and symmetric CCl₄ (§2.2)',
      'Formal charge = valence electrons − lone-pair electrons − bonds (§2.3)',
      'Resonance: the real molecule is the hybrid; only electrons move, never atoms (§2.4–2.6)',
      'Brønsted–Lowry acids and pKa: H⁺ goes from the stronger acid to the stronger base (§2.7–2.10)',
      'Lewis acids accept an electron pair (BF₃, Mg²⁺, H⁺); hydrogen bonds need H on O or N (§2.11–2.12)',
    ],
    next: 'Next: back across the Valence Fields to the forest road in the north-west, and the Chain Labyrinth (Chapter 3).',
  },
  3: {
    world: 'The Chain Labyrinth',
    chapter: 'Chapter 3, Organic Compounds: Alkanes and Their Stereochemistry',
    pages: '71–104',
    points: [
      'Functional groups: same group, same behavior, whatever the size (§3.1)',
      'The first ten alkanes, methane to decane; constitutional isomers differ in connections, not drawings (§3.2)',
      'Carbons are 1°, 2°, 3° or 4° by how many carbons they bond to (§3.3)',
      'IUPAC names: longest chain, number from the end nearer the first branch, substituents alphabetical (§3.4)',
      'Conformations: staggered beats eclipsed (ethane 12 kJ/mol, propane 14) (§3.6)',
      'Butane: anti lowest; gauche +3.8 (steric strain); eclipsed +16 and +19 kJ/mol; the costs add up (§3.7)',
    ],
    next: 'Next: the east road out of the Chain Forest, to the Chair Hills and the Chair Fortress (Chapter 4).',
  },
  4: {
    world: 'The Chair Fortress',
    chapter: 'Chapter 4, Organic Compounds: Cycloalkanes and Their Stereochemistry',
    pages: '105–134',
    points: [
      'Naming rings: start at a substituent, lowest next number, ties alphabetical; halogens count like alkyl groups (§4.1)',
      'Cis (same face) and trans (opposite faces) on a ring: stereoisomers that never interconvert (§4.2)',
      'Ring strain: cyclopropane 115, cyclobutane 110, cyclopentane 26, cyclohexane 0 kJ/mol; rings pucker (§4.3–4.4)',
      'The chair: 111.5°, all staggered; axial and equatorial; a ring-flip swaps them all, faces unchanged (§4.5–4.6)',
      '1,3-Diaxial strain: axial CH₃ 7.6 kJ/mol, tert-butyl 22.8; take the chair with big groups equatorial (§4.7–4.8)',
      'cis- and trans-decalin: trans is rigid and cannot ring-flip; steroids fuse rings too (§4.9)',
    ],
    next: 'Next: the east road out of the Chair Hills, to the Mirror Lake and its palace (Chapter 5).',
  },
  5: {
    world: 'The Mirror Palace',
    chapter: 'Chapter 5, Stereochemistry at Tetrahedral Centers',
    pages: '135–170',
    points: [
      'Four different groups on a carbon: a chirality centre; the molecule and its mirror image are enantiomers (§5.1–5.2)',
      'A symmetry plane makes a molecule achiral (§5.2)',
      'Optical activity: [α]D = α / (l × c); enantiomers rotate equally and oppositely (§5.3–5.4)',
      'R and S: rank by atomic number, lowest group away, clockwise R (§5.5)',
      'Up to 2ⁿ stereoisomers; diastereomers are not mirror images; meso compounds are achiral (§5.6–5.7)',
      'Racemates rotate no light; a single-enantiomer partner makes separable diastereomers (§5.8); receptors pick one hand (§5.12)',
    ],
    next: 'Next: the east road from the Mirror Lake, up to the Activation Peaks (Chapter 6).',
  },
  6: {
    world: 'The Activation Peaks',
    chapter: 'Chapter 6, An Overview of Organic Reactions',
    pages: '171–206',
    points: [
      'Four kinds of reaction: addition, elimination, substitution, rearrangement (§6.1)',
      'Bonds break evenly into radicals or unevenly into ions; polar and radical reactions (§6.2)',
      'Electrophiles are electron-poor (δ+), nucleophiles electron-rich; curved arrows run from nucleophile to electrophile (§6.3–6.5)',
      'Radical chains: initiation, propagation, termination (§6.6; terms from §10.3)',
      'ΔH from bond dissociation energies (Table 6.3); Keq and ΔG° say how far, not how fast (§6.7–6.8)',
      'Energy diagrams: the transition state sets the rate; intermediates sit in the valleys (§6.9–6.10)',
    ],
    next: 'Next: the east road from the Peaks, down to the Plains of Addition (Chapter 7).',
  },
  7: {
    world: 'The Tower of Addition',
    chapter: 'Chapter 7, Alkenes: Structure and Reactivity',
    pages: '207–242',
    points: [
      'Naming alkenes: the longest chain with the C=C, numbered from the end nearer it (§7.3)',
      'Degree of unsaturation: rings + π bonds, from the formula (§7.2)',
      'Cis–trans and E/Z: rank each end; higher groups together Z, opposite E (§7.4–7.5)',
      'More substituted alkenes are more stable; trans beats cis (Table 7.2, §7.6)',
      'Markovnikov: H adds to the carbon with more H, so the more substituted carbocation forms; 3° > 2° > 1° > methyl (§7.7–7.9)',
      'Hammond postulate: a steadier cation means a lower pass (§7.10); cations shift by hydride or methyl to a steadier carbon (§7.11)',
    ],
    next: 'Next: the south road from the Plains, into the Reagent Orchards (Chapter 8).',
  },
  8: {
    world: 'The Reagent Orchards',
    chapter: 'Chapter 8, Alkenes: Reactions and Synthesis',
    pages: '243–286',
    points: [
      'X₂ adds anti through a bromonium ion; with water, a halohydrin (§8.2–8.3)',
      'Oxymercuration: Markovnikov alcohol. Hydroboration: non-Markovnikov, syn (§8.4–8.5)',
      'Hydrogenation is syn; epoxide + acid gives a trans diol, OsO₄ a cis diol (§8.6–8.7)',
      'Ozone cuts C=C into two C=O: work backward from the fragments (§8.8)',
      'Carbenes add in one step and keep the alkene’s geometry (§8.9)',
      'Chain-growth polymers: initiation, propagation, termination; achiral reactants give racemates (§8.10, 8.12)',
    ],
    next: 'Next: the east road from the Orchards, up to the Thunder Cliffs (Chapter 9).',
  },
  9: {
    world: 'The Triple Spire',
    chapter: 'Chapter 9, Alkynes: An Introduction to Organic Synthesis',
    pages: '287–316',
    points: [
      'Naming alkynes and enynes (§9.1); two eliminations of HX make an alkyne from a dihalide (§9.2)',
      'Hydration: HgSO₄ gives a ketone, hydroboration an aldehyde, through an enol that tautomerizes (§9.4)',
      'Reduction: Pd to the alkane, Lindlar to cis, Li in NH₃ to trans (§9.5)',
      'Terminal alkynes (pKa 25) are deprotonated by NH₂⁻ (§9.7); acetylides alkylate with primary halides only (§9.8)',
      'Synthesis: work backward, one step at a time (§9.9)',
    ],
    next: 'Next: the east road from the Cliffs, down into the Halogen Marsh (Chapter 10).',
  },
  10: {
    world: 'The Halogen Marsh',
    chapter: 'Chapter 10, Organohalides',
    pages: '317–340',
    points: [
      'Naming alkyl halides; C–X bonds grow longer and weaker from F to I (§10.1, Table 10.1)',
      'Radical chlorination: count each kind of H × its reactivity (1° 1, 2° 3.5, 3° 5) (§10.2)',
      'NBS takes the allylic H, the weakest; the allyl radical shares its electron between both ends (§10.3–10.4)',
      'HX for tertiary alcohols; SOCl₂ and PBr₃ for primary and secondary (§10.5)',
      'Grignard reagents flip a carbon to δ−; Gilman reagents couple carbons; oxidation levels by counting bonds (§10.6–10.8)',
    ],
    next: 'Next: the east road from the Marsh, into the Volcanic Wastes (Chapter 11).',
  },
  11: {
    world: 'The Arena of Five',
    chapter: 'Chapter 11, Reactions of Alkyl Halides: Nucleophilic Substitutions and Eliminations',
    pages: '341–384',
    points: [
      'Walden’s cycles: substitutions can invert a chirality centre (§11.1)',
      'SN2: one step, backside attack, inversion; methyl > 1° > 2°, good leaving group, polar aprotic solvent (§11.2–11.3)',
      'SN1: the leaving group goes first, a flat carbocation, mostly racemic; tertiary substrates, protic solvents (§11.4–11.5)',
      'Zaitsev: the more substituted alkene; E2 needs H and X anti-periplanar, trans-diaxial in rings (§11.7–11.9)',
      'E1 and E1cB; the conditions decide the mechanism (§11.10–11.12)',
    ],
    next: 'Next: the east road from the Wastes, up to the Summit of Light (Chapter 12).',
  },
  12: {
    world: 'The Observatory of Light',
    chapter: 'Chapter 12, Structure Determination: Mass Spectrometry and Infrared Spectroscopy',
    pages: '385–418',
    points: [
      'Mass spectrometry: the molecular ion M⁺, the base peak, and what each fragment lost (§12.1–12.2)',
      'Isotopes: Cl gives M : M + 2 at 3 : 1, Br at 1 : 1; an odd M⁺ means an odd number of N (§12.3)',
      'ε = hν: radio to gamma by energy; infrared makes bonds vibrate (§12.5–12.6)',
      'IR bands: O–H broad near 3400, ≡C–H 3300, C=O 1715 ketone, 1730 aldehyde (+2750), 1735 ester (§12.7–12.8)',
    ],
    next: 'All twelve Bond Shards. Next: Malradix’s Keep, the finale (coming soon).',
  },
}

export default function WorldDone({ n, done }) {
  const w = WORLDS[n] || WORLDS[1]
  return (
    <div className="worlddone">
      <p className="lesson-kicker">World cleared</p>
      <h2>Bond Shard {n} of 12</h2>
      <p>You cleared <b>{w.world}</b>: {w.chapter}.</p>
      <ul>{w.points.map((t, i) => <li key={i}>{t}</li>)}</ul>
      <p className="small">{w.next}</p>
      <p className="lesson-cite">{BOOK.author}, <i>{BOOK.title}</i> ({BOOK.publisher}, {BOOK.license}) · {w.chapter.split(',')[0]}, pp. {w.pages}</p>
      <div className="title-buttons"><button className="primary" onClick={done}>Continue the journey</button></div>
    </div>
  )
}
