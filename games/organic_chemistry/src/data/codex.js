// Notes the player unlocks in the item menu — a short recap of each idea once a puzzle teaches it.
// Each entry points back to the book (McMurry, Organic Chemistry 10e, OpenStax): section + pages.
// `unlocked(save)` decides when it appears; ids in save.solved come from data/dungeon1.js.

export const CODEX = [
  {
    title: 'Valence: how many bonds',
    section: '1.4', pages: '12–15',
    unlocked: (s) => s.well,
    text: 'Atoms bond until their outer shell is filled. Hydrogen forms 1 bond, carbon 4, nitrogen 3, oxygen 2. Methane, CH₄, is one carbon holding four hydrogens: the seal on the village well.',
  },
  {
    title: 'Radicals pair up',
    section: '6.6', pages: '183–185',
    unlocked: (s) => s.wolvesCleared,
    text: 'A radical has an unpaired electron, which makes it very reactive. When a radical reacts with a molecule it leaves a new radical behind, so the chain keeps going (propagation). When two radicals meet, their electrons pair into a bond and both are gone (termination).',
  },
  {
    title: 'Atoms and isotopes',
    section: '1.1', pages: '9',
    unlocked: (s) => s.solved['1-1b'],
    text: 'The number of protons, the atomic number Z, decides the element: carbon is always Z = 6. Mass number A = protons + neutrons. Isotopes share Z but differ in A, like carbon-12, carbon-13 and carbon-14. A neutral atom has as many electrons as protons.',
  },
  {
    title: 'Electron configurations',
    section: '1.3', pages: '11–12',
    unlocked: (s) => s.solved['1-2C'] && s.solved['1-2N'] && s.solved['1-2O'],
    text: 'Fill the lowest-energy orbitals first (1s, then 2s, then 2p). An orbital holds at most two electrons, with opposite spins. Among equal-energy orbitals, put one electron in each before pairing. Carbon is 1s² 2s² 2p².',
  },
  {
    title: 'Bond length and bond strength',
    section: '1.5', pages: '15–17',
    unlocked: (s) => s.solved['1-3well'],
    text: 'As two hydrogen atoms approach, the energy drops until the nuclei start repelling. The bottom of that well is the bond length (74 pm for H₂). The energy released, 436 kJ/mol, is the bond strength.',
  },
  {
    title: 'Every atom gets its octet',
    section: '1.4', pages: '12–15',
    unlocked: (s) => s.solved['1-3b2'],
    text: 'In a molecule, each atom still makes its usual number of bonds: methylamine (CH₃NH₂), ethanol (CH₃CH₂OH), formaldehyde (CH₂O). A double bond counts as two.',
  },
  {
    title: 'Hybrid orbitals',
    section: '1.6–1.9', pages: '17–22',
    unlocked: (s) => s.solved['1-4crystal'],
    text: 'Carbon mixes its 2s and 2p orbitals. sp³: four hybrids at 109.5°, a tetrahedron, four single bonds. sp²: three at 120° in a plane, and the leftover p orbital forms one π bond (a double bond). sp: two at 180°, a line, and two p orbitals form two π bonds (a triple bond).',
  },
  {
    title: 'π bonds need parallel p orbitals',
    section: '1.8', pages: '19–21',
    unlocked: (s) => s.solved['1-4pi'],
    text: 'A π bond forms when two p orbitals overlap side by side, so they must be parallel. That is why the two carbons of a double bond and their neighbors lie in one plane.',
  },
  {
    title: 'Skeletal structures',
    section: '1.12', pages: '25–27',
    unlocked: (s) => s.solved['1-5a'] && s.solved['1-5b'],
    text: 'In a skeletal drawing, every corner and line end is a carbon, and the hydrogens on carbon are not drawn. Each carbon has enough hidden hydrogens to make four bonds in total.',
  },
  {
    title: 'Polar bonds and electronegativity',
    section: '2.1', pages: '38–40',
    unlocked: (s) => s.lighthouseLit,
    text: 'Electronegativity (EN) is how strongly an atom pulls shared electrons: F 4.0, O 3.5, N 3.0, Cl 3.0, C 2.5, H 2.1. In a bond, the more electronegative atom becomes δ−. A difference under 0.5 is essentially nonpolar (like C–H); 0.5 to 2 is polar covalent; over 2 is largely ionic.',
  },
  {
    title: 'Dipole moments',
    section: '2.2', pages: '40–42',
    unlocked: (s) => s.solved['2-1'],
    text: 'A molecule\'s dipole moment is the sum of its bond dipoles and lone pairs. Bent water (1.85 D) and pyramidal ammonia (1.47 D) are polar. In linear CO₂ and symmetric CH₄ or CCl₄ the bond dipoles cancel: μ = 0.',
  },
  {
    title: 'Formal charge',
    section: '2.3', pages: '42–44',
    unlocked: (s) => s.solved['2-2'],
    text: 'Formal charge = valence electrons − lone-pair electrons − (bonding electrons ÷ 2). Quick version: valence − lone-pair electrons − bonds. O with 3 bonds and 1 lone pair (H₃O⁺) is +1; O with 1 bond and 3 lone pairs (OH⁻) is −1.',
  },
  {
    title: 'Resonance and curved arrows',
    section: '2.4–2.6', pages: '44–48',
    unlocked: (s) => s.solved['2-3'],
    text: 'When one drawing can\'t describe a molecule, it has resonance forms. They differ only in where the π and lone-pair electrons are; the atoms never move. The real molecule is the hybrid of all its forms: both C–O bonds in acetate are 127 pm. Curved arrows show electrons moving from a lone pair or π bond to a neighboring atom or bond.',
  },
  {
    title: 'Acids, bases and pKa',
    section: '2.7–2.9', pages: '48–53',
    unlocked: (s) => s.solved['2-4c'],
    text: 'A Brønsted–Lowry acid donates H⁺ and a base accepts it. The lower the pKa, the stronger the acid, and the weaker its conjugate base. H⁺ always goes from the stronger acid to the stronger base, so a reaction favors the side with the weaker acid.',
  },
  {
    title: 'Lewis acids and bases',
    section: '2.11', pages: '55–58',
    unlocked: (s) => s.solved['t2-bossdoor'] || s.solved['2-5'],
    text: 'A Lewis acid accepts an electron pair; a Lewis base donates one. Lewis acids have a vacant low-energy orbital: H⁺, BF₃ (boron has only six valence electrons), metal cations like Mg²⁺. A curved arrow always points from the base\'s electron pair to the acid.',
  },
  {
    title: 'Hydrogen bonds',
    section: '2.12', pages: '58–61',
    unlocked: (s) => s.solved['2-5'],
    text: 'Between molecules: dipole–dipole forces, dispersion forces and hydrogen bonds. A hydrogen bond forms between an H on O or N and a lone pair on another O or N. It keeps water liquid and holds the two strands of DNA together.',
  },
  {
    title: 'No single drawing is the real molecule',
    section: '2.5–2.6', pages: '45–48',
    unlocked: (s) => s.shards >= 2,
    text: 'The carbonate ion has three resonance forms, each with the C=O on a different oxygen. The forms are imaginary; the real ion is their hybrid, with three identical C–O bonds and the charge spread over all three oxygens.',
  },
  {
    title: 'The first ten alkanes',
    section: '3.2', pages: '78–81',
    unlocked: (s) => s.t3shelf,
    text: 'Alkanes are saturated hydrocarbons, CₙH₂ₙ₊₂: only C, H and single bonds. Methane, ethane, propane, butane, then pentane, hexane, heptane, octane, nonane, decane (5 to 10 carbons). They are the parent names of nearly everything else.',
  },
  {
    title: 'Functional groups make families',
    section: '3.1', pages: '72–77',
    unlocked: (s) => s.solved['3-1'],
    text: 'A functional group behaves nearly the same in every molecule that has it, so molecules fall into families: alkenes (C=C), alcohols (C–OH), ethers (C–O–C), amines (C–N) and more (Table 3.1). Ethylene and menthene both add Br₂ across their C=C (Fig 3.2).',
  },
  {
    title: 'Constitutional isomers',
    section: '3.2', pages: '78–81',
    unlocked: (s) => s.solved['3-2a'],
    text: 'Same formula, different connections. C₅H₁₂ has three: pentane, 2-methylbutane and 2,2-dimethylpropane. Ethanol and dimethyl ether (both C₂H₆O) are isomers too. Redrawing or bending a chain never makes a new compound (Fig 3.3).',
  },
  {
    title: '1°, 2°, 3°, 4° carbons',
    section: '3.3', pages: '81–84',
    unlocked: (s) => s.solved['3-2b'],
    text: 'A carbon is primary, secondary, tertiary or quaternary when it is bonded to one, two, three or four other carbons. Hydrogens take the class of their carbon (there is no 4° hydrogen). R stands for the rest of a molecule.',
  },
  {
    title: 'Naming alkanes',
    section: '3.4', pages: '84–89',
    unlocked: (s) => s.solved['3-3walkA'],
    text: 'Find the longest continuous chain, even if it turns corners (ties: the more branched one). Number from the end nearer the first branch. Give each substituent its number, list them alphabetically, and write one word: 4-ethyl-2-methyloctane.',
  },
  {
    title: 'Conformations and torsional strain',
    section: '3.6', pages: '90–92',
    unlocked: (s) => s.solved['3-4a'],
    text: 'Groups spin around a C–C single bond, making conformations. In a Newman projection the front carbon is a dot and the back one a circle. Staggered ethane is 12 kJ/mol lower than eclipsed: about 4 kJ/mol per eclipsed H↔H pair (Fig 3.8). Propane\'s barrier is 14.',
  },
  {
    title: 'Butane: anti, gauche, eclipsed',
    section: '3.7', pages: '92–96',
    unlocked: (s) => s.solved['3-4c'],
    text: 'About butane\'s C2–C3 bond: anti (CH₃ groups 180° apart) is lowest; gauche (60°) is 3.8 kJ/mol higher from steric strain; eclipsed is 16 kJ/mol (CH₃↔H) or 19 kJ/mol (CH₃↔CH₃) higher (Fig 3.10, Table 3.5). The costs add: 19 = 11 (CH₃↔CH₃) + 2 × 4.0 (H↔H). At any moment, more molecules are anti than in any other shape.',
  },
  // ---------------- World 4: the Chair Fortress (Chapter 4)
  {
    title: 'Naming cycloalkanes',
    section: '4.1', pages: '106–108',
    unlocked: (s) => s.t4rings,
    text: 'Cycloalkanes are CₙH₂ₙ rings drawn as polygons. If the ring is at least as big as its largest substituent, name a substituted cycloalkane; otherwise the ring is a cycloalkyl group on a chain (1-cyclopropylbutane). Number from a substituent so the next gets the lowest number; ties go alphabetically; halogens count like alkyl groups.',
  },
  {
    title: 'Cis and trans on a ring',
    section: '4.2', pages: '108–110',
    unlocked: (s) => s.solved['4-1b'],
    text: 'A ring can’t rotate without breaking, so it has two faces. Same face: cis. Opposite faces: trans. cis- and trans-1,2-dimethylcyclopropane never interconvert. They are stereoisomers: same connections, different arrangement in space (Fig 4.3).',
  },
  {
    title: 'Ring strain and puckering',
    section: '4.3–4.4', pages: '110–113',
    unlocked: (s) => s.solved['4-2'],
    text: 'Strain comes from squeezed angles (angle strain), eclipsed neighbours (torsional strain) and crowding (steric strain). Fig 4.4: cyclopropane 115, cyclobutane 110, cyclopentane 26, cyclohexane 0 kJ/mol. Baeyer assumed flat rings; real rings pucker (cyclobutane bends about 25°; cyclopentane puts one carbon out of the plane).',
  },
  {
    title: 'The chair',
    section: '4.5–4.6', pages: '113–118',
    unlocked: (s) => s.solved['4-3'],
    text: 'Cyclohexane is a chair: C–C–C angles 111.5°, every neighbouring C–H staggered, no strain (the twist-boat is about 23 kJ/mol higher). Each carbon has one axial bond (up or down, alternating) and one equatorial. A ring-flip (about 45 kJ/mol, fast) swaps every axial and equatorial position; no group changes face.',
  },
  {
    title: '1,3-Diaxial interactions',
    section: '4.7', pages: '118–120',
    unlocked: (s) => s.solved['4-4a'],
    text: 'An axial group bumps the axial H on C3 and C5 of its face. For CH₃ each costs 3.8 kJ/mol (like gauche butane), 7.6 in all, so about 95% of methylcyclohexane is equatorial. Bigger groups cost more: tert-butyl 11.4 per interaction.',
  },
  {
    title: 'Two groups on a chair',
    section: '4.8', pages: '120–123',
    unlocked: (s) => s.solved['4-4c'],
    text: 'Count every interaction in both chairs and take the lower. trans-1,2-Dimethyl: diequatorial (3.8, one gauche) beats diaxial (15.2) by 11.4. cis-1,2: the chairs are equal (11.4 each). cis-1-tert-Butyl-4-chloro: tert-butyl equatorial, Cl axial, 20.8 kJ/mol lower (Worked Example 4.3). Values are the text’s (p. 123); Table 4.1 lists slightly different ones.',
  },
  {
    title: 'Fused rings',
    section: '4.9', pages: '123–125',
    unlocked: (s) => s.solved['4-5'],
    text: 'Decalin is two cyclohexanes sharing a bond. Bridgehead H on the same face: cis-decalin; on opposite faces: trans-decalin. They never interconvert. cis-Decalin ring-flips; trans-decalin is rigid (Problem 4-52). Steroids such as testosterone fuse three six-membered rings and one five-membered ring (p. 124).',
  },
  // ---------------- World 5: the Mirror Palace (Chapter 5)
  {
    title: 'Enantiomers and chirality',
    section: '5.1–5.2', pages: '136–140',
    unlocked: (s) => s.solved['5-1'],
    text: 'A carbon with four different groups is not identical to its mirror image: the two are enantiomers, like left and right hands. A molecule that is not identical to its mirror image is chiral; a symmetry plane makes it achiral. CH₃X and CH₂XY are achiral; lactic acid is chiral.',
  },
  {
    title: 'Optical activity',
    section: '5.3–5.4', pages: '140–143',
    unlocked: (s) => s.solved['5-2'],
    text: 'Chiral compounds rotate plane-polarized light: (+) clockwise, (−) counterclockwise. [α]D = α / (l × c), with l in dm and c in g/mL. Enantiomers rotate equally and oppositely (lactic acid ±3.82). Pasteur first separated enantiomers by hand-sorting tartrate crystals in 1848.',
  },
  {
    title: 'R and S',
    section: '5.5', pages: '143–147',
    unlocked: (s) => s.solved['5-3c'],
    text: 'Rank the groups by atomic number (ties: one atom further out; double bonds count twice). With the lowest group away, clockwise 1→2→3 is R, counterclockwise S. R/S and the sign of rotation are unrelated: (S)-glyceraldehyde is (−), (S)-alanine (+).',
  },
  {
    title: 'Diastereomers and meso compounds',
    section: '5.6–5.7', pages: '147–152',
    unlocked: (s) => s.solved['5-4c'],
    text: 'n centres give up to 2ⁿ stereoisomers. Opposite at every centre: enantiomers; at some: diastereomers (epimers differ at one). Meso compounds have centres but a symmetry plane: meso-tartaric acid, (2R,3S) = (2S,3R), achiral, with properties different from the (+) and (−) forms.',
  },
  {
    title: 'Racemates and resolution',
    section: '5.8', pages: '152–154',
    unlocked: (s) => s.solved['5-5a'],
    text: 'A racemate (±) is 50:50 and rotates no light. An achiral amine gives mirror-image salts (no separation); a single enantiomer of a chiral amine, such as (R)-1-phenylethylamine, gives diastereomeric salts that can be separated and then turned back into the pure enantiomers.',
  },
  {
    title: 'Chirality at N, P and S; chiral receptors',
    section: '5.10, 5.12', pages: '155–160',
    unlocked: (s) => s.solved['5-5c'],
    text: 'Amines invert rapidly, like umbrellas, so their enantiomers can’t be isolated; phosphines and sulfonium salts hold their shape. Biological receptors are chiral, so one enantiomer may fit and the other not: (S)-fluoxetine prevents migraine; (S)-ibuprofen is the active pain reliever.',
  },
  {
    title: 'Prochirality',
    section: '5.11', pages: '156–158',
    unlocked: (s) => s.solved.boss5,
    text: 'A prochiral molecule becomes chiral in one step. The two faces of a trigonal carbon are Re (clockwise ranking) and Si (counterclockwise); adding H to opposite faces of 2-butanone gives opposite enantiomers of 2-butanol. Enzymes tell such faces and groups apart.',
  },
  // ---------------- World 6: the Activation Peaks (Chapter 6)
  {
    title: 'Kinds of reaction',
    section: '6.1', pages: '172–173',
    unlocked: (s) => s.t6signs,
    text: 'Additions combine two reactants into one product; eliminations split one into two; substitutions swap parts between two reactants; rearrangements reorganize one molecule into an isomer.',
  },
  {
    title: 'Bond breaking: radicals and ions',
    section: '6.2', pages: '173–175',
    unlocked: (s) => s.solved['6-1b'],
    text: 'Homolytic breaking gives each fragment one electron: radicals (fishhook arrows). Heterolytic breaking gives both electrons to one fragment: ions (full arrows). Radical reactions and polar reactions follow from these.',
  },
  {
    title: 'Electrophiles and nucleophiles',
    section: '6.3–6.5', pages: '175–183',
    unlocked: (s) => s.solved['6-2arrows'],
    text: 'Electronegative neighbours make a carbon δ+ (electrophilic); metals make it δ− (nucleophilic). Curved arrows run from the electron source (nucleophile) to the electron sink (electrophile), and charge balances across every step.',
  },
  {
    title: 'Radical chain reactions',
    section: '6.6', pages: '183–185',
    unlocked: (s) => s.solved['6-3'],
    text: 'Chlorination of methane: initiation (light splits Cl₂), propagation (Cl· + CH₄ → HCl + ·CH₃; ·CH₃ + Cl₂ → CH₃Cl + Cl·, repeated), termination (two radicals combine).',
  },
  {
    title: 'Equilibria, rates and bond energies',
    section: '6.7–6.8', pages: '185–189',
    unlocked: (s) => s.solved['6-4'],
    text: 'ΔG° = −RT ln Keq: a negative ΔG° favours products. ΔH can be estimated from bond dissociation energies (Table 6.3): bonds broken minus bonds formed. Chlorination of methane: −100 kJ/mol. None of this tells you the rate.',
  },
  {
    title: 'Energy diagrams',
    section: '6.9–6.11', pages: '189–196',
    unlocked: (s) => s.solved['6-5'],
    text: 'The transition state is the top of the barrier; ΔG‡ sets the rate (below ~80 kJ/mol: fast at room temperature). Intermediates sit in the valleys of a multistep reaction. Enzymes give lower-barrier paths of many small steps.',
  },
  // ---------------- World 7: the Tower of Addition (Chapter 7)
  {
    title: 'Naming alkenes',
    section: '7.3', pages: '211–212',
    unlocked: (s) => s.t7seeds,
    text: 'The longest chain containing the C=C, numbered from the end nearer it; the first alkene carbon’s number goes before the -ene parent. Cycloalkenes number the double bond C1–C2. Common names: ethylene, propylene, isobutylene, isoprene (Table 7.1).',
  },
  {
    title: 'Degree of unsaturation',
    section: '7.1–7.2', pages: '208–210',
    unlocked: (s) => s.solved['7-1'],
    text: 'Rings plus π bonds, counted from the formula: each costs two H from CₙH₂ₙ₊₂. Add halogens to H, ignore O, subtract N. C₄H₆Br₂ → 1, C₅H₈O → 2, C₅H₉N → 2.',
  },
  {
    title: 'E,Z geometry',
    section: '7.4–7.5', pages: '213–216',
    unlocked: (s) => s.solved['7-2'],
    text: 'Rank the two groups on each alkene carbon with the sequence rules. Higher groups on the same side: Z; opposite: E. An alkene with two identical groups on one carbon has no cis–trans isomers (Fig 7.5).',
  },
  {
    title: 'Alkene stability',
    section: '7.6', pages: '216–219',
    unlocked: (s) => s.solved['7-3'],
    text: 'Heats of hydrogenation (Table 7.2): ethylene −136, monosubstituted −125, cis −119, trans −115, trisubstituted −112, tetrasubstituted −110 kJ/mol. More substituted is more stable; trans beats cis.',
  },
  {
    title: 'Electrophilic addition and Markovnikov’s rule',
    section: '7.7–7.10', pages: '219–230',
    unlocked: (s) => s.solved['7-4'],
    text: 'H⁺ adds first, making the more substituted carbocation (3° > 2° > 1° > methyl, from inductive effects and hyperconjugation); then X⁻ adds. The Hammond postulate: the transition state resembles the carbocation, so a steadier cation forms faster.',
  },
  {
    title: 'Carbocation rearrangements',
    section: '7.11', pages: '230–232',
    unlocked: (s) => s.solved['7-5name'],
    text: 'A less stable carbocation can become a more stable one when a neighbouring hydride or alkyl group shifts over with its electron pair. 3-Methyl-1-butene + HCl gives rearranged 2-chloro-2-methylbutane; 3,3-dimethyl-1-butene gives 2-chloro-2,3-dimethylbutane.',
  },
  // ---------------- World 8: the Reagent Orchards (Chapter 8)
  {
    title: 'Halogenation and halohydrins',
    section: '8.2–8.3', pages: '247–251',
    unlocked: (s) => s.solved['8-1a'] && s.solved['8-1b'],
    text: 'Br₂ adds through a cyclic bromonium ion, opened from the back: anti addition. In water, H₂O opens it instead, giving a halohydrin with OH on the more substituted carbon.',
  },
  {
    title: 'Hydration: oxymercuration and hydroboration',
    section: '8.4–8.5', pages: '251–257',
    unlocked: (s) => s.solved['8-2a'] && s.solved['8-2b'],
    text: 'Oxymercuration–demercuration gives the Markovnikov alcohol. Hydroboration–oxidation adds H and B in one step from one face, B to the less substituted carbon: a syn, non-Markovnikov alcohol (1-methylcyclopentene → trans-2-methylcyclopentanol).',
  },
  {
    title: 'Hydrogenation, epoxides and diols',
    section: '8.6–8.7', pages: '257–260',
    unlocked: (s) => s.solved['8-3a'] && s.solved['8-3b'],
    text: 'H₂ with Pd or Pt adds syn on the catalyst surface. Peroxyacids give epoxides; acid opens them anti to trans-1,2-diols. OsO₄ gives cis-1,2-diols through a cyclic osmate.',
  },
  {
    title: 'Oxidative cleavage and carbenes',
    section: '8.8–8.9', pages: '261–265',
    unlocked: (s) => s.solved['8-4'],
    text: 'Ozonolysis turns each alkene carbon into a C=O: tetrasubstituted gives two ketones, trisubstituted a ketone and an aldehyde. KMnO₄ gives acids and CO₂. Carbenes (:CCl₂ from CHCl₃ + KOH; the Simmons–Smith carbenoid) add stereospecifically to give cyclopropanes.',
  },
  {
    title: 'Polymers and new chirality centres',
    section: '8.10–8.13', pages: '265–274',
    unlocked: (s) => s.solved['8-5p'] && s.solved['8-5race'],
    text: 'Chain-growth polymerization: a radical initiator (from benzoyl peroxide) adds to a monomer, the chain grows one monomer at a time, and two chains combine to end it. Achiral reactants making a new chirality centre give a racemate.',
  },
]

export const BOOK = { title: 'Organic Chemistry, 10th edition', author: 'John McMurry', publisher: 'OpenStax', license: 'CC BY-NC-SA 4.0' }
