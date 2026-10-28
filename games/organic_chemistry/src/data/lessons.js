// Lesson cards: shown the first time a trial opens (and on its "?" button). One idea, a few points,
// one worked example — all from the book section the trial is built on (McMurry, OpenStax, 10e).

export const LESSONS = {
  atomForge: {
    title: 'What an atom is made of',
    section: '1.1', pages: '9',
    points: [
      'An atom has a tiny, dense nucleus of protons (positive) and neutrons (no charge), with electrons (negative) around it.',
      'The number of protons is the atomic number, Z. It decides the element: every carbon atom has Z = 6.',
      'Protons + neutrons = the mass number, A. Atoms of one element with different A are isotopes.',
      'A neutral atom has as many electrons as protons.',
    ],
    example: 'Nitrogen-15 (an example beyond the book): Z = 7, so 7 protons and 7 electrons. A = 15, so 15 − 7 = 8 neutrons.',
  },
  shells: {
    title: 'Filling electron shells',
    section: '1.2–1.3', pages: '9–12',
    points: [
      'Electrons live in orbitals. The first shell has one 1s orbital; the second has a 2s and three 2p orbitals (8 electrons in all).',
      'Lowest energy first: 1s, then 2s, then 2p.',
      'An orbital holds at most two electrons, and they must have opposite spins (↑↓).',
      'For orbitals of equal energy (the three 2p), put one electron in each, same spin, before pairing any up.',
    ],
    example: 'Boron has 5 electrons: 1s² 2s² 2p¹. The lone 2p electron sits in one orbital; the other two stay empty.',
  },
  octet: {
    title: 'How many bonds an atom makes',
    section: '1.4', pages: '12–15',
    points: [
      'Atoms bond so each one reaches a filled outer shell like a noble gas: eight valence electrons (two for hydrogen).',
      'A covalent bond is a pair of electrons shared between two atoms.',
      'The number of bonds an atom forms equals the electrons it still needs: H forms 1, C forms 4, N forms 3, O forms 2.',
      'Valence electrons not used in bonds are lone pairs: nitrogen keeps one pair, oxygen two.',
      'A double bond counts as two bonds.',
    ],
    example: 'Water, H₂O: the oxygen bonds to 2 H (2 bonds) and keeps two lone pairs. Each H has its one bond.',
  },
  well: {
    title: 'Bond length and bond strength',
    section: '1.5', pages: '15–17',
    points: [
      'A covalent bond forms when two atoms come close enough for their half-filled orbitals to overlap and share the electron pair.',
      'Far apart, the atoms barely interact. Too close, the two positive nuclei push each other away and the energy shoots up.',
      'In between is an energy minimum. That distance is the bond length.',
      'The energy released when the bond forms (the depth of the well) is the bond strength.',
    ],
    example: 'For H₂ the bottom of the well is at 74 pm, and forming the bond releases 436 kJ/mol.',
  },
  skeleton: {
    title: 'Reading skeletal structures',
    section: '1.12', pages: '25–27',
    points: [
      'Chemists save time by not drawing every carbon and hydrogen.',
      'Every corner and every line end is a carbon atom.',
      'Hydrogens bonded to carbon are not drawn. Each carbon has however many it needs to make four bonds in total.',
      'Atoms other than C and H are written in, along with the hydrogens attached to them.',
    ],
    example: 'A corner with two single lines has 2 bonds drawn, so it hides 2 H. A line end attached by a double line has 2 drawn, so it also hides 2 H.',
  },
  hybridCheck: {
    title: 'Which hybrid is each carbon?',
    section: '1.6–1.9', pages: '17–22',
    points: [
      'Four single bonds: sp³ — four hybrid orbitals at 109.5°, a tetrahedron.',
      'One double bond: sp² — three hybrids at 120° in a plane, and the leftover p orbital makes the π bond.',
      'A triple bond: sp — two hybrids at 180° in a line, and two leftover p orbitals make two π bonds.',
    ],
    example: 'Ethylene, CH₂=CH₂: each carbon has one double bond, so both are sp², and the molecule is flat with 120° angles.',
  },
  polarity: {
    title: 'Polar bonds and electronegativity',
    section: '2.1', pages: '38–40',
    points: [
      'Electronegativity (EN) is how strongly an atom pulls on the electrons it shares. Pauling values: F 4.0, O 3.5, N 3.0, Cl 3.0, C 2.5, H 2.1.',
      'In a bond, the more electronegative atom gets a partial negative charge (δ−) and the other a partial positive charge (δ+).',
      'Difference in EN under 0.5: essentially nonpolar. 0.5 to 2: polar covalent. Over 2: largely ionic.',
    ],
    example: 'C–O: ΔEN = 3.5 − 2.5 = 1.0, so it is polar and the oxygen is δ−. C–H: ΔEN = 0.4, so it counts as nonpolar.',
  },
  dipole: {
    title: 'Dipole moments: polar molecules',
    section: '2.2', pages: '40–42',
    points: [
      "A molecule's overall polarity (its dipole moment) is the vector sum of all its bond polarities and lone-pair contributions.",
      'Electronegative atoms and lone pairs, like the O in water or the N in ammonia, give big dipoles.',
      'In symmetric molecules the bond dipoles point in opposite directions and cancel, so the dipole moment is zero.',
    ],
    example: 'CO₂ has two polar C=O bonds, but it is linear, so they cancel: no net dipole. Bent H₂O keeps a large dipole.',
  },
  formal: {
    title: 'Formal charge: electron bookkeeping',
    section: '2.3', pages: '42–44',
    points: [
      'Formal charge = (valence electrons of the free atom) − (electrons the bonded atom owns).',
      'An atom owns all of its nonbonding (lone-pair) electrons and half of its bonding electrons.',
      'A quick way: valence electrons − lone-pair electrons − number of bonds.',
      'Atoms with an unusual number of bonds carry a formal charge.',
    ],
    example: 'In H₃O⁺ the oxygen has 3 bonds and 1 lone pair: 6 − 2 − 3 = +1. In OH⁻ it has 1 bond and 3 lone pairs: 6 − 6 − 1 = −1.',
  },
  resonance: {
    title: 'Resonance',
    section: '2.4–2.6', pages: '44–48',
    points: [
      'Some molecules cannot be drawn with a single structure. Acetate has two equivalent C–O bonds (both 127 pm), not one double and one single.',
      'The real molecule is a resonance hybrid of its resonance forms. The forms are imaginary; the molecule does not flip between them.',
      'Resonance forms differ only in where the π and nonbonding electrons are. Atoms never move.',
      'Curved arrows show the electrons moving: from a lone pair or π bond, to a neighbouring atom or bond. Every form must obey the octet rule.',
    ],
    example: "Acetate: an arrow moves the lower O's lone pair in to make a new C=O, and a second arrow moves the old C=O π bond out onto the upper O.",
  },
  pka: {
    title: 'Acids, bases and pKa',
    section: '2.7–2.9', pages: '48–53',
    points: [
      'A Brønsted–Lowry acid gives away H⁺; a base accepts it. The acid becomes its conjugate base, and the base becomes its conjugate acid.',
      'pKa measures acid strength: the lower the pKa, the stronger the acid.',
      'A strong acid has a weak conjugate base, and a weak acid has a strong conjugate base.',
      'H⁺ always moves from the stronger acid to the stronger base, so a reaction goes toward the weaker acid.',
    ],
    example: 'Acetic acid (pKa 4.76) + hydroxide gives acetate + water (pKa 15.74): the proton leaves the stronger acid and forms the weaker one.',
  },
  hbond: {
    title: 'Hydrogen bonds',
    section: '2.12', pages: '58–60',
    points: [
      'Molecules attract each other without bonding: dipole–dipole forces, dispersion forces, and hydrogen bonds.',
      'A hydrogen bond forms between an H attached to O or N and a lone pair on another O or N.',
      'Hydrogen bonds keep water liquid, hold enzymes in shape and pair up the strands of DNA.',
    ],
    example: 'Two water molecules hydrogen-bond. Two methane molecules cannot: they have no H on O or N and no lone pairs.',
  },
  resonanceCheck: {
    title: 'Carbonate and its three forms',
    section: '2.6', pages: '46–48',
    points: [
      'A three-atom grouping like X=Y–Z with a lone pair on Z has two resonance forms; the carbonate ion has three of these groupings, so it has three resonance forms.',
      'All three forms are imaginary drawings. The real ion is their hybrid.',
    ],
    example: 'Striking one head of the Hydra did nothing, because no single form is the real carbonate ion.',
  },
  shelf: {
    title: 'The first ten alkanes',
    section: '3.2', pages: '78–81',
    points: [
      'Alkanes are saturated hydrocarbons: only carbon and hydrogen, only single bonds. Their formula is CₙH₂ₙ₊₂.',
      'The first four have old names: methane (1 C), ethane (2), propane (3), butane (4).',
      'From five on, the name counts in Greek: pentane (5), hexane (6), heptane (7), octane (8), nonane (9), decane (10).',
      'These names are the parents of nearly every name you will meet, so they are worth memorizing.',
    ],
    example: 'Octane, C₈H₁₈: eight carbons, and 2 × 8 + 2 = 18 hydrogens.',
  },
  families: {
    title: 'Functional groups',
    section: '3.1', pages: '72–77',
    points: [
      'A functional group is a group of atoms that behaves nearly the same way in every molecule that contains it.',
      'So molecules sort into families by their groups, whatever their size: alkenes (C=C), alcohols (C–OH), ethers (C–O–C), amines (C–N) and more (Table 3.1).',
      'Ethylene and menthene look nothing alike, but both have a C=C, so both add Br₂ across it the same way (Fig 3.2).',
    ],
    example: 'Ethanol (CH₃CH₂OH) and dimethyl ether (CH₃OCH₃) share the formula C₂H₆O, but one is an alcohol and the other an ether.',
  },
  isomers: {
    title: 'Constitutional isomers',
    section: '3.2', pages: '78–81',
    points: [
      'Isomers share a formula but differ in structure. Constitutional isomers differ in how their atoms are connected.',
      'From four carbons on, the carbons can join in a straight chain or with branches: butane and isobutane are both C₄H₁₀.',
      'A molecule is the same compound however you draw it. Bending or rotating a chain changes the picture, not the connections (Fig 3.3).',
    ],
    example: 'C₅H₁₂ has three constitutional isomers. Count them yourself in the garden.',
  },
  badges: {
    title: 'Primary, secondary, tertiary, quaternary',
    section: '3.3', pages: '81–84',
    points: [
      'Classify a carbon by how many other carbons it is bonded to.',
      'Primary (1°): one other carbon. Secondary (2°): two. Tertiary (3°): three. Quaternary (4°): four.',
      'Hydrogens take the class of the carbon they are on (there is no 4° hydrogen: a 4° carbon has no H). R stands for the rest of the molecule.',
    ],
    example: 'In 2-methylbutane, the carbon carrying the branch is bonded to three carbons, so it is 3°.',
  },
  namingRules: {
    title: 'Naming alkanes (IUPAC)',
    section: '3.4', pages: '84–89',
    points: [
      'A name is locants + prefixes + parent + suffix: where the branches are, what they are, how long the main chain is.',
      'Step 1: find the longest continuous chain. It does not have to be straight; it can turn corners.',
      'Step 2: number it from the end nearer the first branch.',
      'Step 3–4: give each substituent a number, and write the name as one word with substituents in alphabetical order.',
    ],
    example: 'A six-carbon chain with a one-carbon branch on carbon 3 is 3-methylhexane, not 4-methylhexane.',
  },
  nameTiles: {
    title: 'Writing the name',
    section: '3.4', pages: '84–89',
    points: [
      'Each substituent gets its locant and a hyphen: 2-methyl, 4-ethyl.',
      'List substituents alphabetically (ethyl before methyl). Prefixes like di- and tri- don\'t count for the alphabet.',
      'Write it all as one word, ending in the parent name.',
    ],
    example: '3-Ethyl-2-methylhexane: e before m, numbers with hyphens, parent last.',
  },
  newman: {
    title: 'Conformations and Newman projections',
    section: '3.6', pages: '90–92',
    points: [
      'Groups can rotate around a C–C single bond. The shapes this makes are conformations; they change too fast to separate.',
      'A Newman projection looks straight down the bond: the front carbon is a dot, the back carbon a circle.',
      'Staggered (back bonds between the front ones) is lowest in energy. Eclipsed (back bonds hidden behind the front ones) costs 12 kJ/mol in ethane: torsional strain.',
    ],
    example: 'Turning ethane\'s back carbon by 60° switches staggered ↔ eclipsed; the energy rises and falls every 120° (Fig 3.8).',
  },
  butaneCheck: {
    title: 'Butane\'s conformations',
    section: '3.7', pages: '92–96',
    points: [
      'Anti: the two CH₃ groups are 180° apart. Lowest energy (0 kJ/mol).',
      'Gauche: CH₃ groups 60° apart. 3.8 kJ/mol higher, from steric strain as they crowd.',
      'Eclipsed: 16 kJ/mol when each CH₃ hides behind an H; 19 kJ/mol when CH₃ hides behind CH₃, the highest (Fig 3.10).',
      'The costs add up (Table 3.5): H↔H eclipsed 4.0, H↔CH₃ 6.0, CH₃↔CH₃ 11 kJ/mol. Gauche\'s 3.8 is steric strain: the CH₃ groups crowd.',
    ],
    example: 'All the conformations interconvert rapidly, but at any moment more butane molecules are in the anti form than in any other.',
  },
  // ---------------- World 4: the Chair Fortress (Chapter 4)
  ringNames: {
    title: 'Naming cycloalkanes',
    section: '4.1', pages: '106–108',
    points: [
      'Step 1, the parent: if the ring has at least as many carbons as the biggest substituent, name a substituted cycloalkane. If the substituent is bigger, the chain is the parent and the ring a cycloalkyl group.',
      'Step 2, the numbers: start at a substituent as C1 and go round so the next substituent gets the lowest number possible.',
      'If the numbers still tie, the substituent first in the alphabet gets the lower number. Halogens (bromo, chloro) count just like alkyl groups.',
    ],
    example: '1,3-Dibromo-5-methylcyclohexane: 1,3,5 either way round, so b (bromo) comes before m (methyl) and takes C1.',
  },
  cisTrans: {
    title: 'Cis–trans isomers of rings',
    section: '4.2', pages: '108–110',
    points: [
      'A ring can’t rotate about its C–C bonds without breaking open, so it has a top face and a bottom face.',
      'Two groups on the same face are cis; on opposite faces, trans.',
      'cis- and trans-1,2-dimethylcyclopropane are different compounds that never interconvert: stereoisomers (same connections, different 3D arrangement).',
    ],
    example: 'On each altar: hit a carbon’s post to put a methyl on top (gold), below (blue) or none, then present it to the gate.',
  },
  ringStrain: {
    title: 'Ring strain',
    section: '4.3–4.5', pages: '110–115',
    points: [
      'Angle strain: bond angles squeezed away from 109.5°. Torsional strain: neighbouring bonds eclipsed. Steric strain: atoms too close.',
      'Measured strain (Fig 4.4): cyclopropane 115 kJ/mol, cyclobutane 110, cyclopentane 26, cyclohexane 0.',
      'Baeyer thought rings were flat. They pucker: cyclobutane bends one carbon about 25° out of the plane, cyclopentane puts one carbon out of the plane, cyclohexane takes the chair (111.5°, every C–H staggered).',
    ],
    example: 'Flat cyclopentane would have fine 108° angles but every neighbouring C–H eclipsed. Puckering trades a little angle strain for much less torsional strain.',
  },
  chairFlip: {
    title: 'Axial, equatorial and the ring-flip',
    section: '4.6', pages: '115–118',
    points: [
      'Every chair carbon has one axial position (straight up or down, parallel to the ring axis) and one equatorial position (out round the equator).',
      'Axial positions alternate up, down, up round the ring. A group on the top face is axial on a raised carbon and equatorial on a lowered one.',
      'A ring-flip (only about 45 kJ/mol, so it happens fast at room temperature) lowers the raised carbons and raises the lowered ones: every axial position becomes equatorial and vice versa. Nothing changes face.',
    ],
    example: 'Axial bromocyclohexane becomes equatorial bromocyclohexane after a ring-flip (Fig 4.12).',
  },
  diaxial: {
    title: '1,3-Diaxial interactions',
    section: '4.7–4.8', pages: '118–123',
    points: [
      'An axial group bumps the two axial hydrogens on the same face, three carbons away (C3 and C5): 1,3-diaxial interactions.',
      'Axial CH₃: 2 × 3.8 = 7.6 kJ/mol, so about 95% of methylcyclohexane is equatorial. Each one costs the same as a gauche butane interaction.',
      'Bigger groups cost more: tert-butyl 11.4 per interaction (22.8 in all); Cl only 1.0. Neighbouring CH₃ groups that aren’t both axial add a gauche 3.8.',
      'Look at both chairs and take the lower one: trans-1,2-dimethyl is diequatorial (3.8 vs 15.2); a tert-butyl takes the equator even if Cl must go axial (20.8 lower).',
    ],
    example: 'cis-1,2-Dimethylcyclohexane: each chair has one axial CH₃ and a gauche pair, 11.4 kJ/mol both ways, so the two chairs are equal (Fig 4.16). (These are the values the text uses, p. 123; Table 4.1 in this edition lists slightly different numbers.)',
  },
  decalin: {
    title: 'Fused rings: decalin and steroids',
    section: '4.9', pages: '123–125',
    points: [
      'Decalin is two cyclohexane rings sharing a bond; the shared carbons are the bridgeheads.',
      'cis-Decalin has both bridgehead hydrogens on the same face; trans-decalin, on opposite faces. They are cis–trans stereoisomers and never interconvert.',
      'cis-Decalin can ring-flip; trans-decalin is rigid and cannot (Problem 4-52). Steroids such as testosterone are fused rings too: three six-membered and one five-membered (p. 124).',
    ],
    example: 'Trans-decalin’s bridgehead H point opposite ways, one up and one down; cis-decalin’s point the same way (Fig 4.18).',
  },
  titanCheck: {
    title: 'Why bulky groups go equatorial',
    section: '4.7–4.8', pages: '118–123',
    points: [
      'An axial group meets the two axial H on its face, three carbons away (Fig 4.15).',
      'The cost per interaction grows with size: CH₃ 3.8, tert-butyl 11.4 kJ/mol.',
      'So the chair with the biggest group equatorial wins (Worked Example 4.3).',
    ],
    example: 'cis-1-tert-Butyl-4-chlorocyclohexane: tert-butyl equatorial and Cl axial is 2 × 11.4 − 2 × 1.0 = 20.8 kJ/mol lower.',
  },
  // ---------------- World 5: the Mirror Palace (Chapter 5)
  pasteur: {
    title: 'Pasteur’s crystals',
    section: '5.4', pages: '142–143',
    points: [
      'In 1848 Louis Pasteur crystallized sodium ammonium tartrate and saw two kinds of crystal, mirror images of each other.',
      'He sorted them by hand with tweezers. Dissolved, each kind rotated plane-polarized light by the same amount, in opposite directions.',
      'Enantiomers share every physical property except the direction in which they rotate light.',
    ],
    example: 'Pasteur proposed molecular handedness decades before anyone knew carbon was tetrahedral.',
  },
  chirality: {
    title: 'Enantiomers and chirality',
    section: '5.1–5.2', pages: '136–140',
    points: [
      'CH₃X and CH₂XY are identical to their mirror images. A carbon with four different groups, CHXYZ, is not: its mirror image is an enantiomer.',
      'A molecule that is not identical to its mirror image is chiral. A symmetry plane, which cuts it into two mirror-image halves, makes it achiral.',
      'A chirality centre is a tetrahedral carbon bonded to four different groups. The difference can be several atoms away.',
    ],
    example: 'Propanoic acid has a symmetry plane: achiral. Lactic acid’s C2 carries H, OH, CH₃ and CO₂H: chiral (Fig 5.5).',
  },
  polarimeter: {
    title: 'Optical activity',
    section: '5.3', pages: '140–142',
    points: [
      'Solutions of chiral compounds rotate plane-polarized light: clockwise is dextrorotatory (+), counterclockwise levorotatory (−).',
      'The observed rotation α grows with pathlength l (dm) and concentration c (g/mL): [α]D = α / (l × c) is a constant for each compound.',
      'Enantiomers have equal and opposite specific rotations: (+)-lactic acid +3.82, (−)-lactic acid −3.82.',
    ],
    example: 'Table 5.1: sucrose +66.47, camphor +44.26, cholesterol −31.5, morphine −132, chloroform 0.',
  },
  cip: {
    title: 'R and S: the sequence rules',
    section: '5.5', pages: '143–147',
    points: [
      'Rank the four groups on the centre by the atomic number of the atom attached: higher number, higher priority.',
      'If two tie, compare the atoms one bond further out until there is a difference. A double bond counts its atom twice.',
      'Turn the molecule so the lowest-ranked group points away. If 1 → 2 → 3 runs clockwise, the centre is R; counterclockwise, S.',
      'R/S says nothing about the sign of rotation: (S)-glyceraldehyde is (−), (S)-alanine is (+).',
    ],
    example: 'Lactic acid: OH > CO₂H > CH₃ > H. CO₂H wins over CH₃ because its carbon carries (O, O, O).',
  },
  diastereomers: {
    title: 'Diastereomers and meso compounds',
    section: '5.6–5.7, 5.9', pages: '147–155',
    points: [
      'n chirality centres give up to 2ⁿ stereoisomers. Threonine (two centres) has four: (2R,3R), (2S,3S), (2R,3S), (2S,3R).',
      'Opposite at every centre: enantiomers. Opposite at some centres only: diastereomers, which are not mirror images.',
      'A meso compound has chirality centres but a symmetry plane, so it is achiral: meso-tartaric acid is (2R,3S), the same compound as (2S,3R).',
    ],
    example: 'Tartaric acid has only three stereoisomers: the (+) and (−) enantiomers and the meso form (Fig 5.12).',
  },
  resolution: {
    title: 'Racemates and resolution',
    section: '5.8, 5.10, 5.12', pages: '152–160',
    points: [
      'A racemate (±) is a 50:50 mixture of enantiomers. It shows no optical rotation.',
      'Reacting racemic acid with an achiral amine gives salts that are still mirror images: no separation. A single enantiomer of a chiral amine gives diastereomeric salts that differ and can be separated.',
      'Amines invert like umbrellas, too fast to isolate their enantiomers; phosphines invert slowly and can be kept (§5.10).',
      'Biological receptors are chiral, so often only one enantiomer fits, like a hand in a glove (§5.12).',
    ],
    example: '(R)-lactic acid + (R)-1-phenylethylamine gives the R,R salt; (S)-lactic acid gives S,R. Different salts, different properties (Fig 5.14).',
  },
  cipLock: {
    title: 'Reading a lock',
    section: '5.5', pages: '143–147',
    points: [
      'Rank the four groups, highest atomic number first; break ties one atom further out.',
      'With the lowest group pointing away, read 1 → 2 → 3: clockwise R, counterclockwise S.',
      'Reflecting a centre in a mirror swaps its hand: R becomes S.',
    ],
    example: 'Glyceraldehyde: OH > CHO > CH₂OH > H. The CHO carbon carries (O, O, H); CH₂OH carries (O, H, H).',
  },
  kingCheck: {
    title: 'Resolving a racemate',
    section: '5.8', pages: '152–154',
    points: [
      'Enantiomers have identical physical properties, so an achiral partner can’t separate them.',
      'A single-enantiomer partner turns them into diastereomers, which differ and can be separated.',
    ],
    example: 'Racemic lactic acid + methylamine: still a racemate (Fig 5.13). + (R)-1-phenylethylamine: two different salts (Fig 5.14).',
  },
  // ---------------- World 6: the Activation Peaks (Chapter 6)
  trailSigns: {
    title: 'Four kinds of reaction',
    section: '6.1', pages: '172–173',
    points: [
      'Addition: two reactants add together to give one product, with no atoms left over.',
      'Elimination: one reactant splits apart into two products, often with a small molecule such as H₂O or HBr.',
      'Substitution: two reactants exchange parts to give two new products.',
      'Rearrangement: one reactant reorganizes its bonds and atoms into an isomer.',
    ],
    example: 'Ethylene + HBr → bromoethane is an addition; bromoethane → ethylene + HBr, an elimination (p. 172).',
  },
  bondBreak: {
    title: 'How bonds break',
    section: '6.2', pages: '173–175',
    points: [
      'A bond is a shared pair of electrons. It can break symmetrically, one electron to each fragment: homolytic, giving radicals.',
      'Or unsymmetrically, both electrons to one fragment: heterolytic, giving ions.',
      'A full curved arrow moves an electron pair; a half-headed "fishhook" arrow moves one electron.',
      'Radical reactions make and break bonds one electron at a time; polar reactions move electron pairs.',
    ],
    example: 'H–Br heterolysis: H⁺ + Br⁻. Cl–Cl homolysis: Cl· + Cl·.',
  },
  arrows: {
    title: 'Electrophiles, nucleophiles and curved arrows',
    section: '6.3–6.5', pages: '175–183',
    points: [
      'A carbon bonded to a more electronegative atom is δ+, electron-poor: an electrophile. Bonded to a metal it is δ−, electron-rich: a nucleophile.',
      'A curved arrow starts at the electrons that move (a lone pair or a bond) and points to where they go: from the nucleophile to the electrophile.',
      'Charge is conserved: count it before and after each step.',
    ],
    example: 'Ethylene + HBr: the π electrons attack H, the H–Br pair leaves with Br; then Br⁻ attacks the carbocation (§6.5).',
  },
  chain: {
    title: 'A radical chain',
    section: '6.6', pages: '183–185',
    points: [
      'Initiation: light or heat splits a few Cl₂ into Cl· radicals.',
      'Propagation: Cl· takes H from CH₄, giving HCl and ·CH₃; ·CH₃ takes Cl from Cl₂, giving CH₃Cl and a new Cl·. The chain repeats.',
      'Termination: two radicals meet and pair their electrons. Termination is rare next to propagation.',
    ],
    example: 'One initiation can run a chain of many propagation cycles before two radicals happen to meet.',
  },
  ledger: {
    title: 'Bond dissociation energies',
    section: '6.7–6.8', pages: '185–189',
    points: [
      'Breaking a bond takes energy in; forming a bond gives it out. The bond dissociation energy, D, is the energy to break it (Table 6.3).',
      'ΔH = (energy of bonds broken) − (energy of bonds formed). Negative: exothermic.',
      'Keq and ΔG° say how far a reaction goes. They say nothing about how fast.',
    ],
    example: 'CH₄ + Cl₂ → CH₃Cl + HCl: (439 + 242) − (350 + 431) = −100 kJ/mol (p. 188).',
  },
  passes: {
    title: 'Energy diagrams and transition states',
    section: '6.9–6.10', pages: '189–194',
    points: [
      'The transition state is the highest point between reactants and products. The energy needed to reach it, ΔG‡, sets the rate.',
      'Reactions with ΔG‡ below about 80 kJ/mol go fast at room temperature; ethylene + HBr’s first step needs about 140 and is slow (p. 190).',
      'A multistep reaction has an intermediate in each valley and a transition state on each peak. The highest peak is rate-limiting.',
      'Enzymes speed reactions by giving a different path, many small steps with no big barrier (§6.11).',
    ],
    example: 'ΔG° tells you how far down the products are. It does not tell you how high the pass is.',
  },
  wyrmCheck: {
    title: 'How far vs how fast',
    section: '6.7, 6.9', pages: '185–191',
    points: [
      'ΔG° (and Keq) say how far downhill the products lie.',
      'ΔG‡ says how high the barrier is, and so how fast the reaction goes.',
    ],
    example: 'Ethylene + HBr: ΔG° = −44.8 kJ/mol, but the first barrier is about 140 kJ/mol.',
  },
  // ---------------- World 7: the Tower of Addition (Chapter 7)
  seedLabels: {
    title: 'Naming alkenes',
    section: '7.3', pages: '211–212',
    points: [
      'Find the longest carbon chain that contains the double bond; the suffix is -ene.',
      'Number from the end nearer the double bond, so its carbons get the lowest numbers.',
      'Give the number of the first alkene carbon before the parent name; list substituents alphabetically with their numbers.',
    ],
    example: 'CH₃CH=CHCH₂CH₂CH₃ is 2-hexene, not 4-hexene.',
  },
  unsatInfo: {
    title: 'Degree of unsaturation',
    section: '7.2', pages: '209–210',
    points: [
      'Each ring or π bond costs a molecule two hydrogens from the saturated formula CₙH₂ₙ₊₂.',
      'Add halogens to the H count. Ignore oxygen. Subtract one H for each nitrogen.',
    ],
    example: 'C₆H₁₀: hexane is C₆H₁₄, four H short, so two degrees (two double bonds, a ring and a double bond, two rings, or a triple bond).',
  },
  ezInfo: {
    title: 'Cis–trans and E,Z',
    section: '7.4–7.5', pages: '213–216',
    points: [
      'The C=C can’t rotate, so groups stay on their side. Cis–trans isomers need two different groups on each alkene carbon.',
      'For E/Z, rank the two groups on each carbon by the sequence rules (§5.5): higher atomic number first; tie, look one atom further out.',
      'Higher-ranked groups on the same side: Z (zusammen). Opposite sides: E (entgegen).',
    ],
    example: '2-Chloro-2-butene: Cl beats CH₃ on one carbon, CH₃ beats H on the other.',
  },
  stabInfo: {
    title: 'Alkene stability',
    section: '7.6', pages: '216–219',
    points: [
      'Hydrogenating an alkene gives off heat. The less heat given off, the more stable the alkene was.',
      'More alkyl groups on the double bond means more stable (Table 7.2): tetrasubstituted −110, trisubstituted −112, disubstituted −115 to −119, monosubstituted −125, ethylene −136 kJ/mol.',
      'trans-2-Butene is more stable than cis (−115 vs −119): in cis the methyls crowd each other.',
    ],
    example: 'The stabilizing effects are hyperconjugation and the strength of bonds to sp² carbons.',
  },
  hammond: {
    title: 'Markovnikov and the Hammond postulate',
    section: '7.7–7.10', pages: '219–230',
    points: [
      'HX adds in two steps: H⁺ adds to one alkene carbon, making a carbocation; X⁻ adds to it.',
      'Markovnikov: the H goes to the carbon with more H; that is, the more substituted carbocation forms. Carbocations: 3° > 2° > 1° > methyl (§7.9).',
      'Hammond postulate: a transition state looks like the species nearest it in energy. Protonation is uphill, so its transition state looks like the carbocation: a more stable cation, a lower barrier.',
    ],
    example: '2-Methylpropene + HCl gives only 2-chloro-2-methylpropane (p. 222).',
  },
  shiftName: {
    title: 'Carbocation rearrangements',
    section: '7.11', pages: '230–232',
    points: [
      'A carbocation can rearrange: a hydride (H:⁻) or an alkyl group (CH₃:⁻) moves, with its electron pair, to the neighbouring positive carbon.',
      'It happens when the new cation is more stable, usually secondary to tertiary.',
      'Rearranged products are strong evidence for the carbocation mechanism (Whitmore, 1930s).',
    ],
    example: '3-Methyl-1-butene + HCl gives 2-chloro-3-methylbutane and also 2-chloro-2-methylbutane, by a hydride shift.',
  },
  phantomCheck: {
    title: 'Markovnikov’s rule',
    section: '7.8', pages: '222–225',
    points: [
      'In the addition of HX to an alkene, the more highly substituted carbocation is formed as the intermediate.',
      'So H goes to the alkene carbon with more H, and X to the one with more alkyl groups.',
    ],
    example: '1-Ethylcyclopentene + HCl → 1-chloro-1-ethylcyclopentane (Worked Example 7.2).',
  },
  // ---------------- World 8: the Reagent Orchards (Chapter 8)
  recipeBoard: {
    title: 'Reagents for alkenes',
    section: '8.2–8.9', pages: '247–265',
    points: [
      'Each reagent adds its own pieces across the C=C: Br₂ adds Br and Br; Br₂ with water adds Br and OH; H₂ adds H and H.',
      'Water can be added two ways: oxymercuration (Markovnikov) and hydroboration (non-Markovnikov, syn).',
      'OsO₄ adds two OH from one face; ozone cuts the double bond; a carbene adds a CH₂ (or CCl₂) to make a cyclopropane.',
    ],
    example: 'Same alkene, different reagent, different product.',
  },
  halogenInfo: {
    title: 'Halogens and halohydrins',
    section: '8.2–8.3', pages: '247–251',
    points: [
      'Br₂ forms a cyclic bromonium ion on one face of the alkene. Br⁻ attacks from the other face: anti addition (cyclopentene → trans-1,2-dibromocyclopentane).',
      'With water present, water opens the bromonium instead of Br⁻: a halohydrin, still anti, OH on the more substituted carbon.',
    ],
    example: 'The bromonium ion was proposed more than 85 years ago; George Olah later prepared stable solutions of them (p. 248).',
  },
  watersInfo: {
    title: 'Two ways to add water',
    section: '8.4–8.5', pages: '251–257',
    points: [
      'Oxymercuration–demercuration (Hg(OAc)₂, H₂O; then NaBH₄) gives the Markovnikov alcohol.',
      'Hydroboration–oxidation (BH₃; then H₂O₂, OH⁻): B and H add together from one face, B to the less substituted carbon; OH replaces B. Syn, non-Markovnikov.',
    ],
    example: '1-Methylcyclopentene → 1-methylcyclopentanol (oxymercuration) or trans-2-methylcyclopentanol (hydroboration).',
  },
  facesInfo: {
    title: 'Syn and anti additions',
    section: '8.6–8.7', pages: '257–260',
    points: [
      'Hydrogenation (H₂, Pd/C) is syn: both H come from the catalyst’s face.',
      'A peroxyacid makes an epoxide (syn). Aqueous acid opens it from the back, like a bromonium: a trans-1,2-diol.',
      'OsO₄ adds both O at once through a cyclic osmate: a cis-1,2-diol.',
    ],
    example: 'Cyclohexene → cis-1,2-cyclohexanediol (OsO₄) or trans-1,2-cyclohexanediol (epoxide, then H₃O⁺).',
  },
  backward: {
    title: 'Ozonolysis',
    section: '8.8', pages: '261–262',
    points: [
      'O₃ cleaves the C=C; reduction with Zn in acetic acid gives two carbonyl compounds. Each alkene carbon becomes a C=O.',
      'A tetrasubstituted alkene gives two ketones; a trisubstituted one, a ketone and an aldehyde.',
      'Working backward: join the two C=O carbons with a double bond to find the alkene.',
    ],
    example: '(CH₃)₂C=CHCH₃ → (CH₃)₂C=O + CH₃CH=O.',
  },
  racemate: {
    title: 'New chirality centres',
    section: '8.12–8.13', pages: '271–274',
    points: [
      'When achiral reactants make a new chirality centre, the product is racemic: 1-butene + H₂O, H⁺ gives (±)-2-butanol.',
      'The carbocation is flat, so water attacks from either face equally (Fig 8.13).',
      'A chiral reactant makes the two faces unequal: the diastereomeric products form in unequal amounts.',
    ],
    example: 'Optically inactive reactants give optically inactive products.',
  },
  leviCheck: {
    title: 'Hydration, two ways',
    section: '8.4–8.5', pages: '251–257',
    points: [
      'Oxymercuration: Markovnikov, no rearrangement.',
      'Hydroboration–oxidation: non-Markovnikov, syn.',
    ],
    example: 'They give complementary products from the same alkene.',
  },
  // ---------------- World 9: the Triple Spire (Chapter 9)
  cairns: {
    title: 'Naming alkynes',
    section: '9.1', pages: '288–289',
    points: [
      'The suffix is -yne. Number the chain from the end nearer the triple bond and give the number of its first carbon.',
      'A chain with a double and a triple bond is an enyne: number from the end nearer the first multiple bond.',
      'If there’s a choice, the double bond gets the lower number.',
    ],
    example: 'HC≡CCH₂CH(CH₃)₂ is 4-methyl-1-pentyne.',
  },
  linearInfo: {
    title: 'Making alkynes; the triple bond',
    section: '9.2–9.3', pages: '289–291',
    points: [
      'A 1,2-dihalide treated with a strong base (KOH or NaNH₂) loses HX twice: an alkyne.',
      'The alkyne carbons are sp hybridized: the C≡C and the bonds on either side lie in a straight line, 180°.',
      'The triple bond is about 965 kJ/mol, the strongest carbon–carbon bond known.',
    ],
    example: 'One elimination stops at a vinylic halide; the second gives the triple bond.',
  },
  wellsInfo: {
    title: 'Hydrating an alkyne',
    section: '9.4', pages: '291–294',
    points: [
      'Water adds to an alkyne to give an enol (an OH on a C=C). Enols don’t last: keto–enol tautomerism turns them into the carbonyl.',
      'With H₂SO₄ and HgSO₄, water adds Markovnikov: a terminal alkyne gives a methyl ketone.',
      'Hydroboration–oxidation puts the OH on the end carbon: a terminal alkyne gives an aldehyde.',
    ],
    example: '1-Hexyne → 2-hexanone (HgSO₄) or hexanal (BH₃, then H₂O₂).',
  },
  reduceInfo: {
    title: 'Reducing an alkyne',
    section: '9.5', pages: '294–296',
    points: [
      'H₂ over palladium reduces an alkyne all the way to the alkane.',
      'The Lindlar catalyst stops at the alkene, adding both H syn: a cis alkene.',
      'Lithium in liquid ammonia gives the trans alkene instead.',
    ],
    example: '5-Decyne → trans-5-decene with Li in NH₃ (§9.5).',
  },
  pkaLadder: {
    title: 'Alkyne acidity',
    section: '9.7', pages: '297–299',
    points: [
      'A terminal alkyne’s C–H has pKa 25; ethylene’s is 44 and methane’s about 60 (Table 9.1).',
      'A base removes the proton only if its conjugate acid is weaker (higher pKa) than the alkyne: NH₂⁻ (from NH₃, pKa 35) works.',
      'The acetylide’s lone pair sits in an sp orbital, close to the nucleus: more s character, more stable anion.',
    ],
    example: 'HO⁻ won’t do: water (pKa 15.7) is a stronger acid than the alkyne.',
  },
  retroPlan: {
    title: 'Planning a synthesis',
    section: '9.8–9.9', pages: '299–304',
    points: [
      'Acetylide anions alkylate with primary alkyl bromides and iodides; secondary and tertiary halides give elimination instead.',
      'Work backward: look at the product and ask what its immediate precursor was. Then ask again, back to the starting material.',
    ],
    example: 'cis-2-Hexene ← 2-hexyne (Lindlar) ← 1-pentyne anion + CH₃I (Worked Example 9.1).',
  },
  mimicCheck: {
    title: 'Retrosynthesis',
    section: '9.9', pages: '300–304',
    points: [
      'Don’t ask what a starting material might do. Ask what the product was made from, one step at a time.',
    ],
    example: '2-Bromopentane ← 1-pentene ← 1-pentyne ← acetylide + 1-bromopropane (Worked Example 9.2).',
  },
  // ---------------- World 10: the Halogen Marsh (Chapter 10)
  markers: {
    title: 'Naming alkyl halides',
    section: '10.1', pages: '318–319',
    points: [
      'Halogens are named as substituents (fluoro, chloro, bromo, iodo), just like alkyl groups, on the longest chain.',
      'Number from the end nearer the first substituent, halogen or alkyl. If it’s a tie, the one first in the alphabet takes the lower number.',
    ],
    example: 'CH₃CHClCH₂CH(CH₃)₂ is 2-chloro-4-methylpentane.',
  },
  bogInfo: {
    title: 'The carbon–halogen bond',
    section: '10.1', pages: '319–320',
    points: [
      'Down the group, halogens get bigger: C–X bonds get longer and weaker (Table 10.1).',
      'CH₃F 139 pm, 460 kJ/mol; CH₃Cl 178 pm, 350; CH₃Br 193 pm, 294; CH₃I 214 pm, 239.',
      'The C–X bond is polar: the carbon is δ+, electrophilic.',
    ],
    example: 'The weakest of them, C–I, is the easiest to break.',
  },
  hunt: {
    title: 'Radical chlorination',
    section: '10.2', pages: '320–322',
    points: [
      'Radical chlorination gives mixtures. Each kind of hydrogen reacts at its own rate: per H, tertiary 5, secondary 3.5, primary 1.',
      'To predict a ratio: (number of that kind of H) × (its reactivity), for each product.',
      'Tertiary C–H bonds are weakest (400 kJ/mol), then secondary (410), then primary (421): weaker bond, more stable radical.',
    ],
    example: 'Butane: 6 primary H × 1 : 4 secondary H × 3.5 = 6 : 14, about 30 : 70 (p. 321).',
  },
  gilman: {
    title: 'Grignard and Gilman reagents',
    section: '10.6–10.7', pages: '327–329',
    points: [
      'RX + Mg → RMgX, a Grignard reagent: the carbon is now nucleophilic and strongly basic. Water destroys it: RMgX + H₂O → RH.',
      'Lithium diorganocopper (Gilman) reagents, R₂CuLi, couple with organochlorides, bromides and iodides (not fluorides), making a new C–C bond.',
    ],
    example: '(CH₃)₂CuLi + 1-iododecane → undecane, 90% (p. 328).',
  },
  oxLadder: {
    title: 'Oxidation levels',
    section: '10.8', pages: '330–332',
    points: [
      'An organic oxidation forms bonds from carbon to O, N or halogen, or breaks bonds to H. A reduction does the reverse.',
      'Compare compounds with the same number of carbons: count C–O, C–N and C–X bonds, subtract C–H bonds. Higher is more oxidized (Worked Example 10.2).',
    ],
    example: 'CH₄ < CH₃Cl < H₂C=O < HCO₂H < CO₂ (Fig 10.7).',
  },
  hydraCheck: {
    title: 'Which hydrogen goes',
    section: '10.2–10.3', pages: '320–323',
    points: [
      'Radicals take the weakest C–H: allylic (about 370 kJ/mol) before tertiary (400), secondary (410) and primary (421).',
    ],
    example: 'NBS brominates cyclohexene at the allylic position: 3-bromocyclohexene.',
  },
  // ---------------- World 11: the Arena of Five (Chapter 11)
  waldenCycle: {
    title: 'Walden’s discovery',
    section: '11.1', pages: '342–344',
    points: [
      'In 1896 Paul Walden interconverted (+)- and (−)-malic acid through a series of substitution reactions: some steps invert the chirality centre.',
      'A step can only invert the centre if it breaks and makes a bond at the centre itself.',
      'Making a tosylate breaks the O–H bond, not the C–O bond: no inversion. A tosylate is then as good a leaving group as a halide.',
    ],
    example: 'In the 1-phenyl-2-propanol cycle (Fig 11.3), step 2, acetate replacing tosylate, is the inversion.',
  },
  sn2Info: {
    title: 'The SN2 reaction',
    section: '11.2–11.3', pages: '344–354',
    points: [
      'One step: the nucleophile comes in from the side opposite the leaving group as the leaving group goes. The centre inverts, like an umbrella turning inside out.',
      '(S)-2-Bromobutane + HO⁻ → (R)-2-butanol. Second-order kinetics: rate depends on both reactants.',
      'Fastest with: methyl > primary > secondary (tertiary: none); a charged nucleophile; a good leaving group (Cl⁻, Br⁻, TsO⁻, weak bases); a polar aprotic solvent (DMF, DMSO).',
    ],
    example: 'Protic solvents like methanol cage the nucleophile and slow SN2.',
  },
  zaitsev: {
    title: 'Eliminations',
    section: '11.7–11.9', pages: '362–369',
    points: [
      'Zaitsev’s rule (1875): base-induced eliminations generally give the more substituted, more stable alkene.',
      'E2 is one step: H and the leaving group must be anti-periplanar. In a cyclohexane both must be axial: trans-diaxial.',
      'Neomenthyl chloride eliminates 200 times faster than menthyl chloride, which must first ring-flip to put its Cl axial.',
    ],
    example: 'Menthyl chloride’s only trans-diaxial H gives 2-menthene, the non-Zaitsev product.',
  },
  trial: {
    title: 'Which mechanism?',
    section: '11.10–11.12', pages: '369–374',
    points: [
      'Primary: SN2 with a good nucleophile; E2 with a strong, hindered base.',
      'Secondary: SN2 with a weakly basic nucleophile in polar aprotic solvent; E2 with a strong base.',
      'Tertiary: E2 with a base; SN1 and E1 together under neutral conditions (ethanol, water).',
      'E1cB, through a carbanion, when the leaving group is two carbons from a carbonyl.',
    ],
    example: 'The substrate first, then what it meets.',
  },
  champCheck: {
    title: 'Not luck',
    section: '11.12', pages: '372–374',
    points: ['Substrate, nucleophile or base, leaving group and solvent together decide between SN1, SN2, E1, E2 and E1cB.'],
    example: 'A tertiary bromide with ethoxide eliminates (E2); in pure ethanol it gives SN1 and E1.',
  },
  // ---------------- World 12: the Observatory of Light (Chapter 12)
  telescope: {
    title: 'The electromagnetic spectrum',
    section: '12.5', pages: '397–399',
    points: [
      'Radio waves, microwaves, infrared, visible, ultraviolet, X rays and gamma rays are all electromagnetic radiation, differing in wavelength and frequency.',
      'ε = hν = hc/λ: higher frequency (shorter wavelength) means more energy.',
      'A molecule absorbs some wavelengths and transmits others: its absorption spectrum.',
    ],
    example: 'Visible green light (5 × 10¹⁴ Hz) carries more energy than FM radio (1.015 × 10⁸ Hz) (Worked Example 12.3).',
  },
  massHall: {
    title: 'Mass spectrometry',
    section: '12.1–12.2', pages: '386–391',
    points: [
      'An electron beam knocks an electron out of a molecule: a cation radical, the molecular ion M⁺, whose mass is the molecular weight.',
      'Many molecular ions break into fragments. The tallest peak is the base peak (100%).',
      'Subtract a fragment from M⁺ to see what was lost: 15 is CH₃, 29 is C₂H₅, 43 is C₃H₇.',
    ],
    example: 'Hexane: M⁺ = 86, fragments at 71, 57 (the base peak), 43 and 29 (Fig 12.6).',
  },
  samples: {
    title: 'Telling isomers apart',
    section: '12.2', pages: '389–391',
    points: ['Isomers share a molecular weight, but they fragment differently: the losses point to their groups.'],
    example: 'Methylcyclohexane and ethylcyclopentane are both C₇H₁₄ (98).',
  },
  dome: {
    title: 'Infrared spectroscopy',
    section: '12.5–12.6', pages: '399–401',
    points: [
      'IR radiation makes bonds stretch and bend; UV moves electrons between orbitals.',
      'The useful IR range is 4000 to 400 cm⁻¹ (wavenumber = 1/λ in cm), 48.0 to 4.80 kJ/mol.',
      'Each kind of bond absorbs at its own characteristic frequency.',
    ],
    example: 'An IR spectrum is read as downward spikes: each is an absorption.',
  },
  bell: {
    title: 'Reading IR bands',
    section: '12.7–12.8', pages: '401–410',
    points: [
      'O–H 3400–3650, broad (hydrogen bonding); N–H 3300–3500, sharper; ≡C–H 3300; C≡C 2100–2260; C=C 1640–1680.',
      'C=O 1670–1780, sharp and intense: ketone 1715, aldehyde 1730 (plus C–H at 2750 and 2850), ester 1735 (plus C–O at 1300–1000).',
      'Carboxylic acids: C=O near 1710 and a very broad O–H from 2500 to 3100.',
    ],
    example: 'Acetone: 1715. 2-Propen-1-ol: O–H at 3500 and C=C at 1660 (§12.7).',
  },
  sorcerer: {
    title: 'Putting the evidence together',
    section: '12.2–12.8', pages: '388–410',
    points: [
      'M⁺ gives the molecular weight; isomers with the same weight are told apart by their other evidence.',
      'IR bands say which functional groups are present.',
    ],
    example: 'Weight 58 with C=O at 1715 and no aldehyde C–H: a ketone, acetone.',
  },
  finalCheck: {
    title: 'Structure determination',
    section: '12.2, 12.7', pages: '388–410',
    points: ['Mass spectrometry: molecular weight and fragments. Infrared: functional groups. Together they narrow the structure.'],
    example: 'Two kinds of light on one molecule.',
  },
}
