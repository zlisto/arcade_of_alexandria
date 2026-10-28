// Dungeon 4 — The Chair Fortress (book Chapter 4, Cycloalkanes, pp. 105–134). Layout and puzzle data.
// Rooms run along −z inside violet-grey stone halls. Section ids match book_contents/contents.json.

export const W4 = 11 // half width of the halls (wide: the throne room's chair has ledges on the diagonals)

export const ROOMS4 = [
  { id: 'entrance', title: 'The Drawbridge Hall', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t4-map'] },
  { id: '4-1', title: 'Gate of Two Faces', z: [-14, -38], checkpoint: [0, 0, -16], sections: ['4.1', '4.2'], needs: ['4-1b'] },
  { id: '4-2', title: 'The Strain Towers', z: [-38, -62], checkpoint: [0, 0, -40], sections: ['4.3', '4.4', '4.5'], needs: ['t4-door'] },
  { id: '4-3', title: 'The Chair Throne Room', z: [-62, -96], checkpoint: [0, 0, -64], sections: ['4.5', '4.6'], needs: ['4-3'] },
  { id: '4-4', title: 'The Crowded Banquet', z: [-96, -124], checkpoint: [0, 0, -100], sections: ['4.7', '4.8'], needs: ['4-4c'] },
  { id: '4-5', title: 'The Fused Keep', z: [-124, -140], checkpoint: [0, 0, -126], sections: ['4.9'], needs: ['t4-bosskey'] },
  { id: 'boss', title: 'Hall of the tert-Butyl Titan', z: [-140, -178], checkpoint: [0, 0, -143], sections: ['4.6', '4.7', '4.8'], needs: ['boss4'] },
]

// Reading stations: each opens its room's lesson card (none of them gates progress)
export const STATIONS4 = {
  '4-1info': { pos: [0, 0, -17.5], label: 'Read the Law of Two Faces', panel: 'cisTrans', props: { title: 'The Law of Two Faces', text: 'Each altar wants one isomer. Put two methyls at the right ring positions, on the right faces, then present it at the plate in front.' } },
  '4-2info': { pos: [0, 0, -41.5], label: 'Read the Strain Ledger', panel: 'ringStrain', props: { title: 'The Strain Ledger', text: 'Carry each ring crystal (E) to the plinth with its strain. Watch how each one puckers.' } },
  '4-3info': { pos: [-2.4, 0, -64.5], label: 'Read the Throne Rules', panel: 'chairFlip', props: { title: 'The Throne Rules', text: 'Stand on the throne and press G to ring-flip it. Watch which groups stand up and which lie down.' } },
  '4-4info': { pos: [0, 0, -98.5], label: 'Read the Seating Plan', panel: 'diaxial', props: { title: 'The Seating Plan', text: 'Flip each table (G) and look at both chairs. Each tag names what sits axial and any gauche pair. Add up the strain yourself, then seat the guests (E) in the better chair.' } },
  '4-5info': { pos: [-4, 0, -126.5], label: 'Read the Keep’s Charter', panel: 'decalin', props: { title: 'The Keep’s Charter', text: 'Set a decalin on the altar (cis or trans, from the pedestals). Before it flips, say whether it can.' } },
}

// 4-1: two ring altars on pillars; each carbon has a banner post. The gate names the isomer to set.
export const ALTARS = [
  { id: '4-1a', n: 3, pos: [-4.2, -27], r: 2.0, want: { a: 1, b: 2, rel: 'cis' }, name: 'cis-1,2-Dimethylcyclopropane' },
  { id: '4-1b', n: 5, pos: [4.2, -27], r: 2.3, want: { a: 1, b: 3, rel: 'trans' }, name: 'trans-1,3-Dimethylcyclopentane', needs: '4-1a' },
]

// 4-2: four ring crystals and four strain plinths (Fig 4.4)
export const CRYSTALS = [
  { n: 3, pos: [-6.5, -42.5] }, { n: 5, pos: [-6.5, -47.5] }, { n: 6, pos: [6.5, -42.5] }, { n: 4, pos: [6.5, -47.5] },
]
export const PLINTHS = [
  { strain: 115, pos: [-4.5, -55] }, { strain: 110, pos: [-1.5, -55] }, { strain: 26, pos: [1.5, -55] }, { strain: 0, pos: [4.5, -55] },
]

// 4-3: the throne room floor is a giant chair over a pit. Carbons k = 0..5 round the centre, k = 0 due north.
// Each listed carbon carries a substituent bridge on the TOP face: equatorial = a walkway out to a ledge,
// axial = a pillar straight up. A flip swaps every one. (carbonUp/isAxial in chem/rules4.js)
export const THRONE = { c: [0, -79], R: 4.2, ledgeR: 11 }
// Two levers open the north gate: one reachable before the flip, one only after it.
export const BRIDGES4 = [
  { k: 0, ledge: 'exit' }, // k even: an up-carbon at flip 0, so this top-face bridge is axial until flipped
  { k: 2, ledge: 'lever', lever: '4-3a' }, // even too: also needs the flip
  { k: 5, ledge: 'lever', lever: '4-3b' }, // k odd: a down-carbon at flip 0, so equatorial at once
]
export const ENTRY_K = 3 // the way in, from the south, is a stone causeway, always there

// 4-4 tables (data and strain in chem/rules4.js TABLES), and their doors
export const TABLE_POS = { '4-4a': [-5, -103.5], '4-4d': [5, -103.5], '4-4b': [5, -108.5], '4-4c': [-5, -115.5] }
// the first door needs both of its tables seated
export const TABLE_DOORS = { '4-4a': -105, '4-4b': -112, '4-4c': -120 }
export const DOOR_NEEDS = { '4-4a': ['4-4a', '4-4d'], '4-4b': ['4-4b'], '4-4c': ['4-4c'] }

// 4-5 decalin altar
export const DECALIN = { pos: [0, -131] }

// Where the Compass star points next: first unsolved, in play order
export const GOALS4 = [
  { id: '4-1a', pos: [-4.2, -27], label: 'Set the cyclopropane altar: cis-1,2-dimethyl' },
  { id: '4-1b', pos: [4.2, -27], label: 'Set the cyclopentane altar: trans-1,3-dimethyl' },
  { id: '4-2', pos: [0, -55], label: 'Carry each ring crystal to its strain plinth' },
  { id: 't4-compass', pos: [-7.6, -40], label: 'Open the chest (Compass)' },
  { id: 't4-key', pos: [0, -59], label: 'Take the small key' },
  { id: 't4-door', pos: [0, -61], label: 'Unlock the door' },
  { id: 't4-gauntlet', pos: [0, -65.5], label: 'Open the big chest' },
  { id: '4-3a', pos: [9.5, -73.5], label: 'Reach the lever on the south-east ledge' },
  { id: '4-3b', pos: [-9.5, -84.5], label: 'Reach the lever on the north-west ledge' },
  { id: '4-3', pos: [0, -90], label: 'Reach the north gate' },
  { id: '4-4a', pos: [-5, -103.5], label: 'Seat methylcyclohexane in its better chair (G, then E)' },
  { id: '4-4d', pos: [5, -103.5], label: 'Seat cis-1,2-dimethylcyclohexane (G, then E)' },
  { id: '4-4b', pos: [5, -108.5], label: 'Seat trans-1,2-dimethylcyclohexane (G if needed, then E)' },
  { id: '4-4c', pos: [-5, -115.5], label: 'Seat cis-1-tert-butyl-4-chlorocyclohexane (G, then E)' },
  { id: '4-5', pos: [0, -131], label: 'Predict, then try, both decalins on the altar (G)' },
  { id: 't4-bosskey', pos: [0, -136], label: 'Open the big chest (Boss Key)' },
  { id: 't4-bossdoor', pos: [0, -139.2], label: 'Unlock the boss door' },
  { id: 'boss4', pos: [0, -160], label: 'Defeat the tert-Butyl Titan' },
]

export const TITAN = { center: [0, 0, -160], r: 13 }
