// Dungeon 2 — The Tide Temple (book Chapter 2, pp. 37–70). Layout and puzzle data.
// Rooms run along −z. Water lies under everything; anything without a floor is the sea.
// Section ids match games/organic_chemistry/book_contents/contents.json and game_concept.json.

export const W2 = 9 // half width of the halls

export const ROOMS2 = [
  { id: 'entrance', title: 'The Tide Gate', z: [10, -16], checkpoint: [0, 0, -1], sections: [], needs: ['t2-map'] },
  { id: '2-1', title: 'Tug-of-War Hall', z: [-16, -36], checkpoint: [0, 0, -18], sections: ['2.1', '2.2'], needs: ['2-1'] },
  { id: '2-2', title: 'Hall of Accounts', z: [-36, -54], checkpoint: [0, 0, -38], sections: ['2.3'], needs: ['t2-door'] },
  { id: '2-3', title: 'Resonance Tidepools', z: [-54, -84], checkpoint: [0, 0, -56], sections: ['2.4', '2.5', '2.6'], needs: ['2-3'] },
  { id: '2-4', title: 'The pKa Ladder', z: [-84, -110], checkpoint: [0, 0, -86], sections: ['2.7', '2.8', '2.9', '2.10'], needs: ['t2-bosskey'] },
  { id: '2-5', title: 'Lewis Docks', z: [-116, -140], checkpoint: [0, 0, -118], sections: ['2.11', '2.12'], needs: ['t2-bossdoor'] },
  { id: 'boss', title: 'Lair of the Resonance Hydra', z: [-140, -176], checkpoint: [0, 0, -144], sections: ['2.4', '2.5', '2.6'], needs: ['boss2'] },
]

// trial stations: panel kind + props; `room` for chatter
export const STATIONS2 = {
  '2-1': { room: '2-1', pos: [0, 0, -30], label: 'Switch on the dipole field', panel: 'dipole', props: {} },
  '2-2': { room: '2-2', pos: [-5, 0, -47], label: 'Balance the formal charges', panel: 'formal', props: {} },
  '2-3': { room: '2-3', pos: [0, 0, -80], label: 'Calm the resonance pools', panel: 'resonance', props: {} },
  '2-4a': { room: '2-4', pos: [4, 0, -87], label: 'Open water lock I', panel: 'pka', props: { index: 0 } },
  '2-4b': { room: '2-4', pos: [4, 1.2, -94.5], label: 'Open water lock II', panel: 'pka', props: { index: 1 } },
  '2-4c': { room: '2-4', pos: [4, 2.4, -101.5], label: 'Open water lock III', panel: 'pka', props: { index: 2 } },
  '2-5': { room: '2-5', pos: [-4, 0, -136], label: 'Raise the hydrogen-bond bridge', panel: 'hbond', props: {} },
}

// the pKa Ladder: three tiers of stairs, each behind a water lock
export const LADDER = {
  tiers: [
    { y: 0, z: [-84, -89] },
    { y: 1.2, z: [-91.5, -96] },
    { y: 2.4, z: [-98.5, -103] },
    { y: 3.6, z: [-105.5, -110] },
  ],
  locks: [{ z: -89, needs: '2-4a' }, { z: -96, needs: '2-4b' }, { z: -103, needs: '2-4c' }],
}

// Lewis Docks: only Lewis acids (empty orbitals) accept Kai's electron pair; the rest refuse
export const BUOYS = [
  { id: 'bf3', label: 'BF₃', pos: [-4, 0, -124], land: [-4, 0.2, -123], acid: true, platform: [-5.2, -124.6, -2.8, -122.4] },
  { id: 'mg', label: 'Mg²⁺', pos: [3.5, 0, -128.5], land: [3.5, 0.2, -127.5], acid: true, platform: [2.3, -129.1, 4.7, -126.9] },
  { id: 'h', label: 'H⁺', pos: [0, 0, -135.4], land: [0, 0, -134.6], acid: true, platform: false },
  { id: 'ch4', label: 'CH₄', pos: [4.5, 0, -122.8], acid: false, why: 'CH₄ has no empty orbital and no lone pair to spare — your electron pair has nowhere to go. Find a Lewis acid.' },
  { id: 'eth', label: 'CH₃CH₃', pos: [-4, 0, -130], acid: false, why: 'Ethane has a full octet on every carbon — no vacant orbital to accept your pair.' },
]

// Where the map points next (once the Compass is found): first unsolved, in play order
export const GOALS2 = [
  { id: '2-1', pos: [0, -30], label: 'Switch on the dipole field' },
  { id: 't2-compass', pos: [6, -40], label: 'Open the chest (Compass)' },
  { id: '2-2', pos: [-5, -47], label: 'Balance the formal charges' },
  { id: 't2-key', pos: [3, -51], label: 'Take the small key' },
  { id: 't2-door', pos: [0, -53], label: 'Unlock the door' },
  { id: 't2-hookshot', pos: [0, -57.5], label: 'Open the big chest' },
  { id: '2-3', pos: [0, -80], label: 'Calm the resonance pools (hook across the water)' },
  { id: '2-4a', pos: [4, -87], label: 'Open water lock I' },
  { id: '2-4b', pos: [4, -94.5], label: 'Open water lock II' },
  { id: '2-4c', pos: [4, -101.5], label: 'Open water lock III' },
  { id: 't2-bosskey', pos: [-4, -108], label: 'Open the big chest (Boss Key)' },
  { id: '2-5', pos: [-4, -136], label: 'Hook across the Lewis buoys, then raise the bridge' },
  { id: 't2-bossdoor', pos: [0, -139.5], label: 'Unlock the boss door' },
  { id: 'boss2', pos: [0, -158], label: 'Defeat the Resonance Hydra' },
]

export const HYDRA = { center: [0, 0, -158], pool: { x: [-6.5, 6.5], z: [-164.5, -151.5] } }
