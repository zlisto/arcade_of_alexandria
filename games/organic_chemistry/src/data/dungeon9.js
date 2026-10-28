// Dungeon 9 — The Triple Spire on the Thunder Cliffs (book Chapter 9, Alkynes: An Introduction to Organic
// Synthesis, pp. 287–316). Rooms along −z. Section ids match book_contents.

export const W9 = 11

export const ROOMS9 = [
  { id: 'entrance', title: 'The Spire Gate', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t9-map'] },
  { id: '9-1', title: 'The Linear Halls', z: [-14, -36], checkpoint: [0, 0, -16], sections: ['9.2', '9.3'], needs: ['9-1'] },
  { id: '9-2', title: 'The Shifting Wells', z: [-36, -58], checkpoint: [0, 0, -38], sections: ['9.4'], needs: ['9-2a', '9-2b'] },
  { id: '9-3', title: 'Three Reductions', z: [-58, -82], checkpoint: [0, 0, -60], sections: ['9.5'], needs: ['9-3a', '9-3b'] },
  { id: '9-4', title: 'The Acetylide Stair', z: [-82, -108], checkpoint: [0, 0, -84], sections: ['9.7', '9.8'], needs: ['t9-door'] },
  { id: '9-5', title: 'The Planner’s Summit', z: [-108, -130], checkpoint: [0, 0, -110], sections: ['9.9'], needs: ['t9-bosskey'] },
  { id: 'boss', title: 'The Summit of the Spire', z: [-130, -170], checkpoint: [0, 0, -133], sections: ['9.8', '9.9'], needs: ['boss9'] },
]

export const STATIONS9 = {
  '9-1info': { pos: [-3, 0, -16.5], label: 'Read the bridge-raiser’s note', panel: 'linearInfo', props: { title: 'The Bridge-Raiser’s Note', text: 'Each bridge is a 1,2-dihalide. A strong base pulls off H and a halide; twice, and the bridge stands straight: a triple bond, sp carbons, 180°.' } },
  '9-2info': { pos: [3, 0, -38.5], label: 'Read the wells’ warning', panel: 'wellsInfo', props: { title: 'The Shifting Wells', text: 'Water added to an alkyne makes an enol, which never stays. It shifts into a carbonyl. Which carbonyl depends on how you add the water.' } },
  '9-3info': { pos: [-3, 0, -60.5], label: 'Read the three catalysts', panel: 'reduceInfo', props: { title: 'Three Reductions', text: 'Plain palladium reduces all the way. The Lindlar catalyst stops at a cis alkene. Lithium in ammonia gives trans.' } },
  '9-4ladder': { pos: [-4, 0, -88], label: 'Climb the pKa ladder', panel: 'pkaLadder', props: {} },
  '9-5map': { pos: [0, 0, -114], label: 'Plan the route on the Map (G)', panel: 'retroPlan', props: { route: 'we1' } },
}

// 9-1: three dihalide bridges over a gap; strike each twice
export const BRIDGES9 = [{ id: 'd1', z: -22 }, { id: 'd2', z: -27 }, { id: 'd3', z: -32 }]
export const GAP9 = { z: [-20, -34.5] }
// 9-2: two wells, a flask stand
export const WELLS9 = { '9-2a': [-4.5, -48], '9-2b': [4.5, -48], stand: [-8, -42] }
// 9-3: two reduction altars (cis door, trans door), a flask stand
export const REDUCE9 = { '9-3a': [-4.5, -72], '9-3b': [4.5, -72], stand: [-8, -64] }
// 9-4: the stair: halide crates and the stair's step pads
export const STAIR9 = { halides: [[-7, -96], [-7, -99], [-7, -102], [-7, -105]], steps: [[0, -96], [0, -100], [0, -104]] }
// 9-5: the summit flasks, run in order on one altar
export const SUMMIT9 = { altar: [3.5, -120], flasks: [[-6, -116], [-6, -119], [-6, -122], [-6, -125], [-6, -128]] }

export const GOALS9 = [
  { id: '9-1', pos: [0, -27], label: 'Raise the three triple bridges' },
  { id: 't9-compass', pos: [7.6, -40], label: 'Open the chest (Compass)' },
  { id: '9-2a', pos: [-4.5, -48], label: 'Make 2-hexanone from 1-hexyne' },
  { id: '9-2b', pos: [4.5, -48], label: 'Make hexanal from 1-hexyne' },
  { id: '9-3a', pos: [-4.5, -72], label: 'Reduce 5-decyne to the cis alkene' },
  { id: '9-3b', pos: [4.5, -72], label: 'Reduce 5-decyne to the trans alkene' },
  { id: 't9-retro', pos: [0, -80], label: 'Open the big chest' },
  { id: '9-4ladder', pos: [-4, -88], label: 'Pick a base on the pKa ladder' },
  { id: '9-4', pos: [0, -100], label: 'Build the stair: alkylate the acetylide' },
  { id: 't9-key', pos: [0, -106.5], label: 'Take the small key' },
  { id: 't9-door', pos: [0, -107.6], label: 'Unlock the door' },
  { id: '9-5map', pos: [0, -114], label: 'Plan cis-2-hexene on the Map' },
  { id: '9-5', pos: [3.5, -120], label: 'Run the route: three flasks in order' },
  { id: 't9-bosskey', pos: [0, -127.5], label: 'Open the big chest (Boss Key)' },
  { id: 't9-bossdoor', pos: [0, -129.2], label: 'Unlock the summit door' },
  { id: 'boss9', pos: [0, -150], label: 'Unmask Malradix’s Mimic' },
]

export const MIMIC = { center: [0, 0, -150] }
