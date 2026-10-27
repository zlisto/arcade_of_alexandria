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
    next: 'Next: the Chair Fortress and Chapter 4, coming soon.',
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
