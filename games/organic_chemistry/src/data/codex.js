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
]

export const BOOK = { title: 'Organic Chemistry, 10th edition', author: 'John McMurry', publisher: 'OpenStax', license: 'CC BY-NC-SA 4.0' }
