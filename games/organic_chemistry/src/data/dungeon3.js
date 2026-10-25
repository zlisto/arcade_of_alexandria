// Dungeon 3 — The Chain Labyrinth (book Chapter 3, pp. 71–104). Layout and puzzle data.
// Rooms run along −z inside a forest of giant roots. Section ids match book_contents/contents.json.

export const W3 = 9 // half width of the halls

export const ROOMS3 = [
  { id: 'entrance', title: 'The Root Gate', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t3-map'] },
  { id: '3-1', title: 'Hall of Families', z: [-14, -36], checkpoint: [0, 0, -16], sections: ['3.1'], needs: ['3-1'] },
  { id: '3-2', title: 'Isomer Garden', z: [-36, -60], checkpoint: [0, 0, -38], sections: ['3.2', '3.3'], needs: ['t3-door'] },
  { id: '3-3', title: 'The Naming Maze', z: [-60, -104], checkpoint: [0, 0, -63.2], sections: ['3.4'], needs: ['3-3b'] },
  { id: '3-4', title: 'The Turning Halls', z: [-104, -140], checkpoint: [0, 0, -105.5], sections: ['3.6', '3.7'], needs: ['t3-bosskey'] },
  { id: 'boss', title: 'Coil of the Gauche Serpent', z: [-140, -178], checkpoint: [0, 0, -143], sections: ['3.7'], needs: ['boss3'] },
]

export const STATIONS3 = {
  '3-1info': { room: '3-1', pos: [0, 0, -18.5], label: 'Read the Family Register', panel: 'families', props: {} },
  '3-2a': { room: '3-2', pos: [-4, 0, -42], label: 'Grow the C₅H₁₂ isomers', panel: 'isomers', props: {} },
  '3-2b': { room: '3-2', pos: [4, 0, -42], label: 'Badge the carbons', panel: 'badges', props: {}, needs: ['3-2a'] },
  '3-3info': { room: '3-3', pos: [-6.5, 0, -62.2], label: 'Read the Naming Laws', panel: 'namingRules', props: {} },
  '3-3b': { room: '3-3', pos: [0, 0, -102.2], label: 'Speak the chain\'s true name', panel: 'nameTiles', props: {}, needs: ['3-3walkB'] },
}

// 3-1 Hall of Families (§3.1, Table 3.1): spirits to carry, crests to fill
export const CRESTS = [
  { id: 'alkene', label: 'Alkene · C=C', pos: [-6, 0, -33], color: '#7ad8ff' },
  { id: 'alcohol', label: 'Alcohol · C–O–H', pos: [-2, 0, -33], color: '#ff8a6a' },
  { id: 'ether', label: 'Ether · C–O–C', pos: [2, 0, -33], color: '#ffd060' },
  { id: 'amine', label: 'Amine · C–N', pos: [6, 0, -33], color: '#8a8aff' },
]
export const SPIRITS = [
  { id: 'ethylene', name: 'Ethylene', formula: 'CH₂=CH₂', group: 'alkene', pos: [-6.5, 0, -17], size: 0.7 },
  { id: 'menthene', name: 'Menthene', formula: 'C₁₀H₁₈', shown: 'C₁₀H₁₈ · a ring with one C=C', group: 'alkene', pos: [6.5, 0, -17], size: 1.25 },
  { id: 'ethanol', name: 'Ethanol', formula: 'CH₃CH₂OH', group: 'alcohol', pos: [-6.5, 0, -22], size: 0.85 },
  { id: 'dme', name: 'Dimethyl ether', formula: 'CH₃OCH₃', group: 'ether', pos: [6.5, 0, -22], size: 0.85 },
  { id: 'propylamine', name: 'Propylamine', formula: 'CH₃CH₂CH₂NH₂', group: 'amine', pos: [-6.5, 0, -27], size: 0.95 },
  { id: 'isopropylamine', name: 'Isopropylamine', formula: '(CH₃)₂CHNH₂', group: 'amine', pos: [6.5, 0, -27], size: 0.95 },
]
export const GROUP_WHY = {
  alkene: 'it has a carbon–carbon double bond (C=C)',
  alcohol: 'it has an –OH on a carbon (C–O–H)',
  ether: 'its oxygen sits between two carbons (C–O–C)',
  amine: 'it has a nitrogen bonded to carbon (C–N)',
}

// 3-3 Naming Maze (§3.4): two skeletons drawn as root-stones on the floor. atoms: [x, z]; bonds: [i, j]
export const MAZES = {
  A: { // 3-methylhexane: the straight row of five is a trap; the six-carbon chain turns a corner
    id: '3-3walkA',
    atoms: [[-1.5, -73], [-4.3, -70], [-4.3, -66.5], [-1.5, -66.5], [1.3, -66.5], [4.1, -66.5], [-7.1, -66.5]],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]],
    name: '3-methylhexane',
  },
  B: { // 4-ethyl-2-methyloctane
    id: '3-3walkB',
    atoms: [[-7.4, -91], [-5.3, -89.4], [-3.2, -91], [-1.1, -89.4], [1.1, -91], [3.2, -89.4], [5.3, -91], [7.4, -89.4], [-5.3, -86.6], [-1.1, -93.8], [0.6, -96.4]],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [1, 8], [3, 9], [9, 10]],
    name: '4-ethyl-2-methyloctane',
  },
}

// 3-4 Turning Halls (§3.6–3.7): round Newman doors that open only in the right conformation
// Turning past an eclipsed position at a door jams it and sparks (½ heart), so the direction matters.
// G turns +60°, Shift+G turns −60°. The butane door starts eclipsed (CH₃↔H): one way leads to anti at once.
export const DOORS3 = [
  { id: '3-4a', z: -116, kind: 'ethane', start: 0, want: (a) => a % 120 === 60, goal: 'staggered', title: 'Ethane door' },
  // the propane door turns the lesson round: it opens only when you can SET the strained shape, eclipsed
  { id: '3-4b', z: -126, kind: 'propane', start: 60, want: (a) => a % 120 === 0, goal: 'eclipsed', title: 'Propane door', noSpark: true },
  // the butane door starts on one side or the other of anti: read the drawing to pick the short way
  { id: '3-4c', z: -134, kind: 'butane', start: () => (Math.random() < 0.5 ? 120 : 240), want: (a) => a === 180, goal: 'anti', title: 'Butane door' },
]
// what each eclipsed cost is made of (Table 3.5: H↔H 4.0, H↔CH₃ 6.0, CH₃↔CH₃ 11 kJ/mol)
export const STRAIN_SUM = {
  ethane: { eclipsed: '12 = 3 × 4.0 (three H↔H)' },
  propane: { eclipsed: '14 = 2 × 4.0 (H↔H) + 6.0 (H↔CH₃)' },
  butane: { 'eclipsed · CH₃↔H': '16 = 2 × 6.0 (CH₃↔H) + 4.0 (H↔H)', 'eclipsed · CH₃↔CH₃': '19 = 11 (CH₃↔CH₃) + 2 × 4.0 (H↔H)', gauche: '3.8 — steric strain, nothing eclipsed' },
}
// Eclipsed Bat roosts: a pair on one rod; [x, z, zMin, zMax] — each only acts inside its own stretch of hall
export const ROOSTS3 = [[-4.5, -111.5, -116, -104], [4.5, -121, -126, -116], [-4.5, -130, -134, -126]]
// more bats wake in the boss arena in the Serpent's last phase
export const ARENA_ROOSTS = [[-9, -170, -178, -140], [9, -170, -178, -140]]

// Where the Compass star points next: first unsolved, in play order
export const GOALS3 = [
  { id: '3-1', pos: [0, -33], label: 'Carry each spirit to its family crest' },
  { id: 't3-compass', pos: [0, -16], label: 'Open the chest (Compass)' },
  { id: '3-2a', pos: [-4, -42], label: 'Grow the C₅H₁₂ isomers' },
  { id: '3-2b', pos: [4, -42], label: 'Badge the carbons' },
  { id: 't3-key', pos: [0, -56], label: 'Take the small key' },
  { id: 't3-door', pos: [0, -59], label: 'Unlock the door' },
  { id: '3-3walkA', pos: [-1.5, -73], label: 'Walk the longest chain, from the end nearer the branch' },
  { id: '3-3walkB', pos: [-7.4, -91], label: 'Walk the longest chain of the second skeleton' },
  { id: '3-3b', pos: [0, -102.2], label: 'Speak the chain\'s true name' },
  { id: 't3-lantern', pos: [0, -108], label: 'Open the big chest' },
  { id: '3-4a', pos: [0, -115], label: 'Turn the ethane door to staggered (G)' },
  { id: '3-4b', pos: [0, -125], label: 'Turn the propane door to staggered (G)' },
  { id: '3-4c', pos: [0, -133], label: 'Turn the butane door to anti (G)' },
  { id: 't3-bosskey', pos: [0, -137.5], label: 'Open the big chest (Boss Key)' },
  { id: 't3-bossdoor', pos: [0, -139.2], label: 'Unlock the boss door' },
  { id: 'boss3', pos: [0, -160], label: 'Defeat the Gauche Serpent' },
]

export const SERPENT = { center: [0, 0, -160], r: 14 }
