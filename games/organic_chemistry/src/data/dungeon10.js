// Dungeon 10 — The Sunken Forge under the Halogen Marsh (book Chapter 10, Organohalides, pp. 317–340).
// Rooms along −z. Section ids match book_contents.

export const W10 = 11

export const ROOMS10 = [
  { id: 'entrance', title: 'The Sunken Door', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t10-map'] },
  { id: '10-1', title: 'The Naming Bog', z: [-14, -36], checkpoint: [0, 0, -16], sections: ['10.1'], needs: ['10-1'] },
  { id: '10-2', title: 'The Hunt', z: [-36, -58], checkpoint: [0, 0, -38], sections: ['10.2'], needs: ['10-2a', '10-2b'] },
  { id: '10-3', title: 'The Allyl Crossing', z: [-58, -82], checkpoint: [0, 0, -59.5], sections: ['10.3', '10.4'], needs: ['t10-ring'] },
  { id: '10-4', title: 'The Alcohol Spring', z: [-82, -104], checkpoint: [0, 0, -84], sections: ['10.5'], needs: ['t10-door'] },
  { id: '10-5', title: 'The Metal Forge', z: [-104, -132], checkpoint: [0, 0, -105.4], sections: ['10.6', '10.7', '10.8'], needs: ['t10-bosskey'] },
  { id: 'boss', title: 'The Hydra’s Pool', z: [-132, -172], checkpoint: [0, 0, -140], sections: ['10.3', '10.4', '10.6'], needs: ['boss10'] },
]

export const STATIONS10 = {
  '10-1info': { pos: [-3, 0, -16.5], label: 'Read the bog-stone tablet', panel: 'bogInfo', props: { title: 'The Bog Stones', text: 'Each stone is a carbon–halogen bond, and each sinks to its own depth once laid. Lay them from the bank, in the order the sockets ask.' } },
  '10-3info': { pos: [-6.5, 0, -60.5], label: 'Read the crossing’s tablet', panel: 'allylInfo', props: { title: 'The Allyl Crossing', text: 'Br· takes one hydrogen from this ring: the one held most weakly. Then the radical left behind decides where the bromine lands.' } },
  '10-4info': { pos: [6.5, 0, -84.5], label: 'Read the spring-keeper’s slate', panel: 'springInfo', props: { title: 'The Alcohol Spring', text: 'Three alcohols, four reagents. Not every alcohol takes every reagent kindly.' } },
  '10-2a': { pos: [-4, 0, -46], label: 'Predict the propane hunt', panel: 'hunt', props: { hunt: 'h1' } },
  '10-2b': { pos: [4, 0, -46], label: 'Predict the 2-methylpropane hunt', panel: 'hunt', props: { hunt: 'h2' } },
  '10-5gilman': { pos: [-4, 0, -118], label: 'The coupling altar', panel: 'gilman', props: {} },
  '10-5ox': { pos: [4, 0, -124], label: 'Climb the oxidation ladder', panel: 'oxLadder', props: {} },
}

// 10-1: the bog and its four stone sockets; the stones wait on the near bank
export const BOG = { z: [-22, -34], sockets: [[0, -24.4], [0, -27.2], [0, -30.0], [0, -32.8]], stones: [[-3.6, -19.5], [-1.8, -19.5], [1.8, -19.5], [3.6, -19.5]] } // in frame at portrait width
// 10-3: the cyclohexene floor (six carbon pads round a centre; Br₂ is let in at pads), then two allyl doors (they open on 10-3b)
export const ALLYL = { centre: [0, -67], R: 3.6, doors: { left: [-5.5, -76], right: [5.5, -76] } }
// 10-4: three springs and a flask stand
export const SPRINGS_POS = { '10-4a': [-6, -92], '10-4b': [0, -96], '10-4c': [6, -92], stand: [-8.5, -86] }
// 10-5: golems' pool (r 3): a ringed golem (a Grignard) dies only in it; the room checkpoint sits behind the door, outside the golems' zone
// spawns ~5.5 m from the pool centre, so herding or a knock (not a spawn beside the water) is the normal kill
export const FORGE10 = { pool: [0, -112], golems: [[-5, -109.6], [5, -114.4]] }

export const GOALS10 = [
  { id: '10-1', pos: [0, -28], label: 'Lay the bond stones in the order the sockets ask' },
  { id: 't10-compass', pos: [7.6, -38], label: 'Open the chest (Compass)' },
  { id: '10-2a', pos: [-4, -46], label: 'Predict the propane hunt' },
  { id: '10-2b', pos: [4, -46], label: 'Predict the 2-methylpropane hunt' },
  { id: '10-3a', pos: [0, -66], label: 'Strike the weakest C–H on the ring' },
  { id: '10-3b', pos: [0, -66], label: 'Let Br₂ in where the radical’s electron is' },
  { id: 't10-ring', pos: [0, -80], label: 'Open the big chest' },
  { id: '10-4a', pos: [-6, -92], label: 'Make 1-chloro-1-methylcyclohexane' },
  { id: '10-4b', pos: [0, -96], label: 'Make 1-bromobutane †' },
  { id: '10-4c', pos: [6, -92], label: 'Make 2-chlorobutane †' },
  { id: 't10-key', pos: [0, -102], label: 'Take the small key' },
  { id: 't10-door', pos: [0, -103.6], label: 'Unlock the door' },
  { id: '10-5g', pos: [0, -111], label: 'Defeat the golems' },
  { id: '10-5gilman', pos: [-4, -118], label: 'Couple at the altar' },
  { id: '10-5ox', pos: [4, -124], label: 'Climb the oxidation ladder' },
  { id: 't10-bosskey', pos: [0, -129.5], label: 'Open the big chest (Boss Key)' },
  { id: 't10-bossdoor', pos: [0, -131.2], label: 'Unlock the pool door' },
  { id: 'boss10', pos: [0, -152], label: 'Beat the Allylic Hydra' },
]

export const HYDRA = { center: [0, 0, -153] }
