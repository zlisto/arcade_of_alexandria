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
}
