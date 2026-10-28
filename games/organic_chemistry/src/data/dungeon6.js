// Dungeon 6 — The Pass Caves under the Activation Peaks (book Chapter 6, An Overview of Organic Reactions, pp. 171–206).
// Rooms run along −z through icy caves. Section ids match book_contents/contents.json.

export const W6 = 11

export const ROOMS6 = [
  { id: 'entrance', title: 'The Frozen Gate', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t6-map'] },
  { id: '6-1', title: 'The Splitting Forge', z: [-14, -34], checkpoint: [0, 0, -16], sections: ['6.2'], needs: ['6-1b'] },
  { id: '6-2', title: 'Electron Radar Gorge', z: [-34, -62], checkpoint: [0, 0, -36], sections: ['6.3', '6.4', '6.5'], needs: ['t6-door'] },
  { id: '6-3', title: 'The Chain Cave', z: [-62, -86], checkpoint: [0, 0, -64], sections: ['6.6'], needs: ['6-3'] },
  { id: '6-4', title: 'The Ledger of Bonds', z: [-86, -104], checkpoint: [0, 0, -88], sections: ['6.7', '6.8'], needs: ['6-4'] },
  { id: '6-5', title: 'The Twin Passes', z: [-104, -140], checkpoint: [0, 0, -106], sections: ['6.9', '6.10', '6.11'], needs: ['t6-bosskey'] },
  { id: 'boss', title: 'Summit of the Transition Wyrm', z: [-140, -178], checkpoint: [0, 0, -143], sections: ['6.9', '6.10'], needs: ['boss6'] },
]

export const STATIONS6 = {
  '6-1info': { pos: [-5.5, 0, -16.5], label: 'Read the Forge Rules', panel: 'bondBreak', props: { title: 'The Forge Rules', text: 'Strike a bond crystal with the full-arrow hammer (both electrons to one side: ions) or the fishhook hammer (one each: radicals). Each door wants one kind.' } },
  '6-2arrows': { pos: [0, 0, -57], label: 'Draw the arrows: HBr meets ethylene', panel: 'arrows', props: {} },
  '6-3info': { pos: [-3, 0, -64.5], label: 'Read the Chain Rite', panel: 'chain', props: { title: 'The Chain Rite', text: 'Light the crystal, then carry each radical where it reacts: Cl· to the methane font, ·CH₃ to the chlorine font. Three turns, then end the chain.' } },
  '6-4ledger': { pos: [0, 0, -95], label: 'Balance the Ledger of Bonds', panel: 'ledger', props: {} },
  '6-5info': { pos: [-3, 0, -106.5], label: 'Read the Mountain’s Law', panel: 'passes', props: { title: 'The Mountain’s Law', text: 'The vent fills your boots to room temperature. A pass you can’t reach, you can’t cross: the highest pass on a route sets how fast you get over it.' } },
}

// 6-1 the forge: two crystals, two doors (ions / radicals)
export const FORGE6 = { anvil: [0, -24], doors: { '6-1a': { z: -27, want: 'ions', crystal: 'HBr' }, '6-1b': { z: -33, want: 'radicals', crystal: 'Cl2' } } }

// 6-2 the gorge: a chasm z −40 … −52, crossed by hooking δ+ carbons on pillars
export const GORGE = { z: [-40, -52] }
export const PILLAR_POS = { p1: [-5, -44], p2: [5, -44], p3: [0, -47], p4: [5, -48.5], p5: [-5, -48.5] }

// 6-3 the chain cave: the UV crystal, the methane font, the chlorine font, a wandering radical
export const CHAIN_POS = { uv: [-6, -70], methane: [6, -70], chlorine: [0, -79], stray: [-5, -82] }

// 6-5 the Twin Passes: the energy-diagram floor runs along x; the vent at the reactants' end
export const PASS_ROOM = { z0: -110, z1: -136, vent: [-8.5, -107.5] }

export const GOALS6 = [
  { id: '6-1a', pos: [0, -24], label: 'Split H–Br into ions for the first door' },
  { id: '6-1b', pos: [0, -24], label: 'Split Cl–Cl into radicals for the second door' },
  { id: 't6-compass', pos: [-7.6, -36], label: 'Open the chest (Compass)' },
  { id: '6-2gorge', pos: [0, -46], label: 'Hook across the gorge: only δ+ carbons hold' },
  { id: '6-2arrows', pos: [0, -57], label: 'Draw the arrows for HBr + ethylene' },
  { id: 't6-key', pos: [0, -59.5], label: 'Take the small key' },
  { id: 't6-door', pos: [0, -61.2], label: 'Unlock the door' },
  { id: '6-3', pos: [-6, -70], label: 'Run the chlorination chain three times, then end it' },
  { id: '6-4', pos: [0, -95], label: 'Balance the Ledger of Bonds' },
  { id: 't6-boots', pos: [3, -98], label: 'Open the big chest' },
  { id: '6-5', pos: [4.5, -120], label: 'Cross the Twin Passes by a route you can climb' },
  { id: 't6-bosskey', pos: [0, -137], label: 'Open the big chest (Boss Key)' },
  { id: 't6-bossdoor', pos: [0, -139.2], label: 'Unlock the boss door' },
  { id: 'boss6', pos: [0, -160], label: 'Get past the Transition Wyrm' },
]

export const WYRM = { center: [0, 0, -160] }
