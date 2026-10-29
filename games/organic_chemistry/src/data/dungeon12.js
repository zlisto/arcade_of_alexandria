// Dungeon 12 — the Observatory of Light on the Summit (book Chapter 12, Structure Determination: Mass Spectrometry
// and Infrared Spectroscopy, pp. 385–418). Rooms along −z; the boss under the great telescope.

export const W12 = 11

export const ROOMS12 = [
  { id: 'entrance', title: 'The Observatory Door', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t12-map'] },
  { id: '12-1', title: 'The Weighing Hall', z: [-14, -38], checkpoint: [0, 0, -16], sections: ['12.1', '12.2'], needs: ['12-1a', '12-1b'] },
  { id: '12-2', title: 'The Isotope Gallery', z: [-38, -62], checkpoint: [0, 0, -40], sections: ['12.3'], needs: ['t12-lens'] },
  { id: '12-3', title: 'The Spectrum Dome', z: [-62, -84], checkpoint: [0, 0, -64], sections: ['12.5'], needs: ['t12-door'] },
  { id: '12-4', title: 'The Ringing Bonds', z: [-84, -110], checkpoint: [0, 0, -86], sections: ['12.6', '12.7', '12.8'], needs: ['t12-bosskey'] },
  { id: 'boss', title: 'Under the Great Telescope', z: [-110, -150], checkpoint: [0, 0, -114], sections: ['12.2', '12.3', '12.8'], needs: ['boss12'] },
]

export const STATIONS12 = {
  '12-1a': { pos: [-4, 0, -26], label: 'Read the magnetic arc: hexane', panel: 'massHall', props: {} },
  '12-1b': { pos: [4, 0, -30], label: 'The two unlabeled samples', panel: 'samples', props: {} },
  '12-3': { pos: [0, 0, -72], label: 'Turn the dome’s lens', panel: 'dome', props: {} },
}

// 12-2: five plaque stands on the near side, four doors on the far side; which plaque and which door stand where is
// dealt per visit (Observatory layout()); one door always takes two plaques
export const PLAQUE_SLOTS = [[-7.6, -45], [-3.8, -45], [0, -45], [3.8, -45], [7.6, -45]]
export const DOOR_SLOTS = [[-7.2, -54], [-2.4, -54], [2.4, -54], [7.2, -54]]
export const ISO_DOORS = ['chlorine', 'bromine', 'nitrogen', 'none of the three']
// 12-4: five bell frames; which bell hangs in which (and which five of the eight) is dealt per visit
export const BELL_SLOTS = [[-6, -92], [6, -92], [-6, -100], [6, -100], [0, -104]]

export const GOALS12 = [
  { id: '12-1a', pos: [-4, -26], label: 'Read hexane’s fragments' },
  { id: '12-1b', pos: [4, -30], label: 'Tell the two samples apart' },
  { id: '12-2', pos: [0, -54], label: 'Read each plaque’s peaks; carry it to its door' },
  { id: 't12-lens', pos: [0, -59.5], label: 'Open the big chest' },
  { id: 't12-compass', pos: [-7.6, -66], label: 'Open the chest (Compass)' },
  { id: '12-3', pos: [0, -72], label: 'Turn the dome’s lens to the bonds’ band' },
  { id: 't12-key', pos: [0, -81], label: 'Take the small key' },
  { id: 't12-door', pos: [0, -83.6], label: 'Unlock the door' },
  { id: '12-4', pos: [0, -98], label: 'Ring every bell with the Lens; name each' },
  { id: 't12-bosskey', pos: [0, -107.5], label: 'Open the big chest (Boss Key)' },
  { id: 't12-bossdoor', pos: [0, -109.2], label: 'Unlock the telescope door' },
  { id: 'boss12', pos: [0, -130], label: 'Unmask the Disguised Sorcerer' },
]

// the fight: a gate shuts behind Kai at FIGHT_GATE_Z (the follow camera ignores it and stays this side); the fight
// starts, and a knockout respawns, at BOSS_Z, well clear of the gate. The two crystals stand either side of him
export const SORC = { center: [0, 0, -133], crystals: [[-7, -128], [7, -128]] }
export const FIGHT_GATE_Z = -112
export const BOSS_Z = -120
export const SHARD12 = [0, 0, -144]
