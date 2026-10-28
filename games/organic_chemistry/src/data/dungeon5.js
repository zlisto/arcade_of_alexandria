// Dungeon 5 — The Mirror Palace (book Chapter 5, Stereochemistry at Tetrahedral Centers, pp. 135–170).
// Rooms run along −z through pale crystal halls lined with mirrors. Section ids match book_contents/contents.json.

export const W5 = 11 // half width of the halls

export const ROOMS5 = [
  { id: 'entrance', title: 'The Glass Vestibule', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t5-map'] },
  { id: '5-1', title: 'Hall of Hands', z: [-14, -40], checkpoint: [0, 0, -16], sections: ['5.1', '5.2'], needs: ['5-1'] },
  { id: '5-2', title: 'The Polarized Window', z: [-40, -62], checkpoint: [0, 0, -42], sections: ['5.3'], needs: ['t5-door'] },
  { id: '5-3', title: 'The Steering-Wheel Locks', z: [-62, -92], checkpoint: [0, 0, -64], sections: ['5.5'], needs: ['5-3c'] },
  { id: '5-4', title: 'Halls of Many Centres', z: [-92, -118], checkpoint: [3.5, 0, -94], sections: ['5.6', '5.7', '5.9'], needs: ['5-4c'] },
  { id: '5-5', title: 'The Resolution Hall', z: [-118, -140], checkpoint: [3.5, 0, -120], sections: ['5.8', '5.10', '5.12'], needs: ['t5-bosskey'] },
  { id: 'boss', title: 'Throne of the Racemic King', z: [-140, -178], checkpoint: [0, 0, -143], sections: ['5.8', '5.12'], needs: ['boss5'] },
]

// reading stations (lesson cards); none gates progress
export const STATIONS5 = {
  '5-1info': { pos: [0, 0, -17.5], label: 'Read the Hall’s Inscription', panel: 'chirality', props: { title: 'The Hall’s Inscription', text: 'E at a statue turns a glass plane through it. If a plane swaps two identical groups, the statue is its own mirror image. If no plane ever works, pull its lever: chiral.' } },
  '5-2polar': { pos: [0, 0, -50], label: 'Use the polarimeter', panel: 'polarimeter', props: {} },
  '5-3info': { pos: [-2.6, 0, -64.5], label: 'Read the Steering-Wheel Rules', panel: 'cip', props: { title: 'The Steering-Wheel Rules', text: 'At each lock: rank the four groups, read the turn with the lowest one at the back. If the lock wants the other hand, reflect it in the Mirror Shield (G).' } },
  '5-4info': { pos: [0, 0, -94.5], label: 'Read the Census of Centres', panel: 'diastereomers', props: { title: 'The Census of Centres', text: 'Each statue has two centres; reflect one or both (G at that centre). Each door names what it wants.' } },
  '5-5info': { pos: [-4, 0, -120.5], label: 'Read the Resolution Rite', panel: 'resolution', props: { title: 'The Resolution Rite', text: 'A racemic pool rotates no light. Find what splits it. Then the doors: one centre that holds, one lock that takes only one hand.' } },
}

// 5-1 statues (place = groups at the four tetrahedral positions; see chem/rules5.js STATUES)
export const STATUE_POS = { s1: [-6.5, -22], s2: [6.5, -22], s3: [-6.5, -30], s4: [6.5, -30] }

// 5-3 lock doors: which configuration each lock wants
export const LOCK_DOORS = { '5-3a': { z: -72, want: 'S' }, '5-3b': { z: -80, want: 'S' }, '5-3c': { z: -88, want: 'R' } }
// the centre on each lock starts in this arrangement (positions 0–3, as in rules5 TETRA)
export const LOCK_START = {
  '5-3a': ['H', 'OH', 'CO₂H', 'CH₃'], // lactic acid
  '5-3b': ['H', 'CHO', 'OH', 'CH₂OH'], // glyceraldehyde
  '5-3c': ['H', 'NH₂', 'CO₂H', 'CH₃'], // alanine
  '5-5c': ['H', 'Ar', 'CH₃', 'CO₂H'], // ibuprofen's centre, starting R (the receptor wants S)
}

// 5-4: threonine statues and the meso door
export const THREONINE = { pos: [-4, -100], start: ['R', 'R'] }
export const TARTARIC = { pos: [4, -110], start: ['R', 'R'] }
export const DOORS4 = {
  '5-4a': { z: -103.5, label: 'The Enantiomer Door · the mirror image of (2R,3R)', want: (c) => c[0] === 'S' && c[1] === 'S' },
  '5-4b': { z: -106.5, label: 'The Diastereomer Door · a stereoisomer of (2R,3R) that is not its mirror image', want: (c) => c[0] !== c[1] },
  '5-4c': { z: -114, label: 'The Meso Door · the tartaric acid that is its own mirror image', want: (c) => c[0] !== c[1] },
}

export const GOALS5 = [
  { id: '5-1', pos: [0, -27], label: 'Settle every statue: a symmetry plane, or chiral' },
  { id: 't5-compass', pos: [-7.6, -42], label: 'Open the chest (Compass)' },
  { id: '5-2', pos: [0, -50], label: 'Use the polarimeter' },
  { id: 't5-key', pos: [0, -59], label: 'Take the small key' },
  { id: 't5-door', pos: [0, -61], label: 'Unlock the door' },
  { id: 't5-shield', pos: [2.6, -64.5], label: 'Open the big chest' },
  { id: '5-3a', pos: [0, -70.5], label: 'Lactic-acid lock: read it, set it to S' },
  { id: '5-3b', pos: [0, -78.5], label: 'Glyceraldehyde lock: read it, set it to S' },
  { id: '5-3c', pos: [0, -86.5], label: 'Alanine lock: read it, set it to R' },
  { id: '5-4a', pos: [-4, -100], label: 'Make the enantiomer of (2R,3R)-threonine' },
  { id: '5-4b', pos: [-4, -100], label: 'Make a diastereomer of (2R,3R)-threonine' },
  { id: '5-4c', pos: [4, -110], label: 'Make meso-tartaric acid' },
  { id: '5-5a', pos: [0, -125], label: 'Split the racemic pool' },
  { id: '5-5b', pos: [-6, -132], label: 'Open the door whose centre holds' },
  { id: '5-5c', pos: [6, -132], label: 'Fit the receptor lock' },
  { id: 't5-bosskey', pos: [0, -137], label: 'Open the big chest (Boss Key)' },
  { id: 't5-bossdoor', pos: [0, -139.2], label: 'Unlock the boss door' },
  { id: 'boss5', pos: [0, -160], label: 'Defeat the Racemic King' },
]

export const KING = { center: [0, 0, -160], r: 13 }
