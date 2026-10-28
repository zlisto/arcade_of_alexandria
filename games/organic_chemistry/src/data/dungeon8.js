// Dungeon 8 — Borana's Glasshouse in the Reagent Orchards (book Chapter 8, Alkenes: Reactions and Synthesis,
// pp. 243–286). Greenhouse halls along −z. Section ids match book_contents.

export const W8 = 11

export const ROOMS8 = [
  { id: 'entrance', title: 'The Glasshouse Door', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t8-map'] },
  { id: '8-1', title: 'Grove of Halogens', z: [-14, -44], checkpoint: [0, 0, -16], sections: ['8.2', '8.3'], needs: ['8-1a', '8-1b'] },
  { id: '8-2', title: 'The Two Waters', z: [-44, -66], checkpoint: [0, 0, -46], sections: ['8.4', '8.5'], needs: ['8-2a', '8-2b'] },
  { id: '8-3', title: 'Garden of Faces', z: [-66, -90], checkpoint: [0, 0, -68], sections: ['8.6', '8.7'], needs: ['t8-door'] },
  { id: '8-4', title: 'The Ozone Shears', z: [-90, -114], checkpoint: [0, 0, -92], sections: ['8.8', '8.9'], needs: ['8-4'] },
  { id: '8-5', title: 'The Chain Barn', z: [-114, -140], checkpoint: [0, 0, -116], sections: ['8.10', '8.12'], needs: ['t8-bosskey'] },
  { id: 'boss', title: 'The Leviathan’s Hothouse', z: [-140, -180], checkpoint: [0, 0, -143], sections: ['8.10'], needs: ['boss8'] },
]

export const STATIONS8 = {
  '8-1info': { pos: [-3, 0, -16.5], label: 'Read the Halogen Grove’s sign', panel: 'halogenInfo', props: { title: 'The Halogen Grove', text: 'Bromonium wraiths shield one face with their Br⁺ bridge. Strike from the other side. The altars take whatever flask you pour.' } },
  '8-2info': { pos: [3, 0, -46.5], label: 'Read the Two Waters plaque', panel: 'watersInfo', props: { title: 'The Two Waters', text: 'One alkene, two doors, two alcohols. Three flasks add water. They don’t all add it the same way.' } },
  '8-3info': { pos: [-3, 0, -68.5], label: 'Read the Garden’s rule', panel: 'facesInfo', props: { title: 'The Garden of Faces', text: 'Some reagents add both new groups from one face (syn). Others go through a ring that is opened from the back (anti).' } },
  '8-4back': { pos: [3, 0, -104], label: 'Borana’s riddle', panel: 'backward', props: {} },
  '8-5raceInfo': { pos: [-4, 0, -134], label: 'Read the racemate gate’s plate', panel: 'racemate', props: { title: 'The Racemate Gate', text: 'Over the basin floats the flat cation: H, CH₃ and CH₂CH₃ round C⁺, all in one plane. Each pour, water bonds from the top face or the bottom one, and its OH stays on that face (watch the model). Name each 2-butanol yourself: rank OH > CH₂CH₃ > CH₃ > H, look with the H pointing away from you, and follow 1 → 2 → 3. Clockwise is (R); counter-clockwise is (S). Seat each in its lock.' } },
}

// 8-1: wraiths roam; two altars and their doors
export const ALTAR8_POS = {
  '8-1a': [-4.5, -34], '8-1b': [4.5, -34],
  '8-2a': [-4.5, -58], '8-2b': [4.5, -58],
  '8-3a': [-5, -80], '8-3b': [5, -80],
  '8-3c': [4.5, -73.5],
  '8-4c': [5, -99.25], '8-4t': [5, -96.25],
}
export const DOORS8 = { '8-1': -43, '8-2': -65 }
export const TREES8 = { '8-1': [-8, -22], '8-2': [-8, -50], '8-3': [-8, -72], '8-4': [-8, -96] }

// 8-4: the shears and the halves' pedestals
export const SHEARS = { pos: [-3, -108], peds: { left: [-6, -111], right: [0, -111] }, halves: [[-8.5, -101.5], [-8.5, -104], [-8.5, -106.5], [-8.5, -109], [-8.5, -111.5]] }

// 8-5: the barn — a peroxide brazier, monomer fonts along the room, a second chain at the far end
export const BARN = { brazier: [-6, -120], monomers: [[-3, -123], [2, -125], [-4.5, -130.5], [6, -126.5]], propylene: [-6, -127], other: [7, -132] }
// the racemate gate: a 1-butene basin and two locks
export const RACE = { basin: [2.5, -132.5], locks: { S: [1, -135.5], R: [4.5, -135.5] } }

export const GOALS8 = [
  { id: 't8-satchel', pos: [0, -25], label: 'Beat the wraiths: open the big chest' },
  { id: '8-1a', pos: [-4.5, -34], label: 'Make trans-1,2-dibromocyclopentane' },
  { id: '8-1b', pos: [4.5, -34], label: 'Make the bromohydrin' },
  { id: '8-2a', pos: [-4.5, -58], label: 'Make 1-methylcyclopentanol' },
  { id: '8-2b', pos: [4.5, -58], label: 'Make trans-2-methylcyclopentanol' },
  { id: 't8-compass', pos: [7.6, -62], label: 'Open the chest (Compass)' },
  { id: '8-3a', pos: [-5, -80], label: 'Make cis-1,2-cyclohexanediol †' },
  { id: '8-3b', pos: [5, -80], label: 'Make trans-1,2-cyclohexanediol' },
  { id: '8-3c', pos: [4.5, -73.5], label: 'Make cis-1,2-dimethylcyclohexane, then offer the right ring' },
  { id: 't8-key', pos: [0, -88], label: 'Take the small key' },
  { id: 't8-door', pos: [0, -89.2], label: 'Unlock the door' },
  { id: '8-4s', pos: [-3, -108], label: 'Cut the alkene with the ozone shears' },
  { id: '8-4back', pos: [3, -104], label: 'Answer Borana’s riddle' },
  { id: '8-4c', pos: [5, -97.75], label: 'Make the cyclopropane the door describes' },
  { id: '8-5p', pos: [-6, -120], label: 'Grow a 5-unit chain, then end it' },
  { id: '8-5race', pos: [2.5, -132.5], label: 'Fill both locks of the racemate gate' },
  { id: 't8-bosskey', pos: [0, -137.5], label: 'Open the big chest (Boss Key)' },
  { id: 't8-bossdoor', pos: [0, -139.2], label: 'Unlock the boss door' },
  { id: 'boss8', pos: [0, -160], label: 'Stop the Polymer Leviathan' },
]

export const LEVI = { center: [0, 0, -160], R: 12 }
