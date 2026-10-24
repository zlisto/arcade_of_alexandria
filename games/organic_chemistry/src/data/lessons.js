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
    example: 'Carbon-13: Z = 6, so 6 protons and 6 electrons. A = 13, so 13 − 6 = 7 neutrons.',
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
    example: 'Nitrogen has 7 electrons: 1s² 2s² 2p³, with one unpaired electron in each of the three 2p orbitals.',
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
    example: 'Methylamine, CH₃NH₂: the carbon bonds to 3 H and the N (4 bonds); the nitrogen bonds to the C and 2 H (3 bonds) and keeps a lone pair.',
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
}
