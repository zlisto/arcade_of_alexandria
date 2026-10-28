// Dungeon 12 — the Observatory of Light on the Summit (book Chapter 12, Structure Determination: Mass Spectrometry
// and Infrared Spectroscopy, pp. 385–418). Rooms along −z; the boss under the great telescope.

export const W12 = 11

export const ROOMS12 = [
  { id: 'entrance', title: 'The Observatory Door', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t12-map'] },
  { id: '12-1', title: 'The Weighing Hall', z: [-14, -38], checkpoint: [0, 0, -16], sections: ['12.1', '12.2'], needs: ['12-1a', '12-1b'] },
  { id: '12-2', title: 'The Isotope Gallery', z: [-38, -62], checkpoint: [0, 0, -40], sections: ['12.3'], needs: ['t12-lens'] },
  { id: '12-3', title: 'The Spectrum Dome', z: [-62, -84], checkpoint: [0, 0, -64], sections: ['12.5'], needs: ['t12-door'] },
  { id: '12-4', title: 'The Ringing Bonds', z: [-84, -110], checkpoint: [0, 0, -86], sections: ['12.6', '12.7', '12.8'], needs: ['t12-bosskey'] },
  { id: 'boss', title: 'Under the Great Telescope', z: [-110, -150], checkpoint: [0, 0, -113], sections: ['12.2', '12.3', '12.8'], needs: ['boss12'] },
]

export const STATIONS12 = {
  '12-1a': { pos: [-4, 0, -26], label: 'Read the magnetic arc: hexane', panel: 'massHall', props: {} },
  '12-1b': { pos: [4, 0, -30], label: 'The two unlabeled samples', panel: 'samples', props: {} },
  '12-3': { pos: [0, 0, -72], label: 'Turn the dome’s lens', panel: 'dome', props: {} },
}

// 12-2: plaques on the near side, three doors on the far side
export const PLAQUE_POS = { cl: [-6, -44], br: [0, -44], n: [6, -44] }
export const ISO_DOORS = { chlorine: [6, -54], bromine: [-6, -54], nitrogen: [0, -54] }
// 12-4: the five bells
export const BELL_POS = { b1: [-6, -92], b2: [6, -92], b3: [-6, -100], b4: [6, -100], b5: [0, -104] }

export const GOALS12 = [
  { id: '12-1a', pos: [-4, -26], label: 'Read hexane’s fragments' },
  { id: '12-1b', pos: [4, -30], label: 'Tell the two samples apart' },
  { id: '12-2', pos: [0, -54], label: 'Carry each plaque to its door' },
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

export const SORC = { center: [0, 0, -132] }
