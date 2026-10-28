// Dungeon 7 — The Tower of Addition on the Plains of Addition (book Chapter 7, Alkenes: Structure and Reactivity,
// pp. 207–242). Each room is a floor of the tower; the run goes along −z. Section ids match book_contents.

export const W7 = 11

export const ROOMS7 = [
  { id: 'entrance', title: 'The Tower Door', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t7-map'] },
  { id: '7-1', title: 'Counting Fields', z: [-14, -34], checkpoint: [0, 0, -16], sections: ['7.1', '7.2'], needs: ['7-1'] },
  { id: '7-2', title: 'Name and Geometry', z: [-34, -64], checkpoint: [0, 0, -36], sections: ['7.4', '7.5'], needs: ['7-2'] },
  { id: '7-3', title: 'The Stability Scales', z: [-64, -90], checkpoint: [0, 0, -66], sections: ['7.6'], needs: ['t7-sling'] },
  { id: '7-4', title: 'The Harvest Hall', z: [-90, -124], checkpoint: [0, 0, -92], sections: ['7.7', '7.8', '7.9', '7.10'], needs: ['t7-door'] },
  { id: '7-5', title: 'The Shifting Crypt', z: [-124, -152], checkpoint: [0, 0, -126], sections: ['7.11'], needs: ['t7-bosskey'] },
  { id: 'boss', title: 'The Roof of the Tower', z: [-152, -192], checkpoint: [0, 0, -155], sections: ['7.9', '7.11'], needs: ['boss7'] },
]

export const STATIONS7 = {
  '7-1info': { pos: [-3, 0, -16.5], label: 'Read the Harvest Count', panel: 'unsatInfo', props: { title: 'The Harvest Count', text: 'Each crate hides a molecule. Strike its dial to set how many rings and π bonds it has: its degree of unsaturation.' } },
  '7-2info': { pos: [3, 0, -37], label: 'Read the Geometry Rules', panel: 'ezInfo', props: { title: 'The Geometry Rules', text: 'Light the higher-ranked group on each end of a statue, then call it: higher groups together, Z; opposite, E. Two identical groups on one end: neither.' } },
  '7-3info': { pos: [-3, 0, -66.5], label: 'Read the Scale’s Rule', panel: 'stabInfo', props: { title: 'The Scale’s Rule', text: 'Weigh each alkene by the heat its hydrogenation gives off. Less heat out means it was more stable to begin with. Most stable at the top.' } },
  '7-4hammond': { pos: [3, 0, -121], label: 'The Hammond stone', panel: 'hammond', props: {} },
  '7-5name': { pos: [3, 0, -137.5], label: 'Name what formed', panel: 'shiftName', props: {} },
}

// 7-1 the crates: dials 0–4, in a row
export const CRATE_POS = { c1: [-6, -24], c2: [-2, -24], c3: [2, -24], c4: [6, -24] }
export const CRATE_DOOR = -33

// 7-2 statues along the room; the arches (E on the left, Z on the right) beside each
export const STATUE7_POS = { e1: -42, e3: -48, e4: -54, e5: -60 }
export const EZ_DOOR = -63

// 7-3 weights on the left, the scale's steps on the right (step 0 = top = most stable)
export const WEIGHT_POS = { ethylene: [-7, -70], propene: [-7, -73.5], cis2b: [-7, -77], trans2b: [-7, -80.5], tri: [-7, -84], tetra: [-7, -87.5] }
export const STEP_POS = [[6.5, -70], [6.5, -73.3], [6.5, -76.6], [6.5, -79.9], [6.5, -83.2], [6.5, -86.5]]

// 7-4 the grain pit and its alkene bridges (z from near edge to far edge)
export const PIT7 = { z: [-94, -119] }
export const BRIDGE7_Z = { b1: [-94, -97], b2: [-99.5, -102.5], b3: [-105, -108], b4: [-110.5, -113.5], b5: [-116, -119] }
export const ISLANDS7 = [[-97, -99.5], [-102.5, -105], [-108, -110.5], [-113.5, -116]]

// 7-5 the crypt skeletons on the floor: carbon pad positions (x, z offset from the skeleton's origin)
export const SKEL_POS = {
  h: { origin: [-1, -131], pads: [[-6, 0], [-2, 0], [2, 0], [6, 0], [2, -4]] },
  m: { origin: [-1, -143], pads: [[-6, 0], [-2, 0], [2, 0], [6, 0], [2, -4], [2, 4]] },
  t: { origin: [0, 0], pads: [[10, 0], [10, -6], [6, -3], [2, -3], [-2, -3]] }, // C2 sits 9 m from round 2's answer (m2's C3)
  h2: { origin: [0, 0], pads: [[-8, 2], [-4, 2], [0, 2], [4, 2], [8, 2], [0, -3]] },
  m2: { origin: [0, 0], pads: [[6, 0], [2, 0], [-2, 0], [-6, 0], [-2, 4], [-2, -4]] },
}

export const GOALS7 = [
  { id: '7-1', pos: [0, -24], label: 'Set each crate’s degree of unsaturation' },
  { id: 't7-compass', pos: [-7.6, -36], label: 'Open the chest (Compass)' },
  { id: '7-2', pos: [0, -48], label: 'Call each statue E or Z' },
  { id: '7-3', pos: [6.5, -78], label: 'Load the scale, most stable at the top' },
  { id: 't7-sling', pos: [0, -88.5], label: 'Open the big chest' },
  { id: '7-4', pos: [0, -106], label: 'Sling protons to build every bridge' },
  { id: '7-4hammond', pos: [3, -121], label: 'Read the Hammond stone' },
  { id: 't7-key', pos: [-6, -121.5], label: 'Take the small key' },
  { id: 't7-door', pos: [0, -123.2], label: 'Unlock the door' },
  { id: '7-5h', pos: [-1, -131], label: 'Catch the hydride shift' },
  { id: '7-5m', pos: [-1, -143], label: 'Catch the methyl shift' },
  { id: '7-5name', pos: [3, -137.5], label: 'Name what formed' },
  { id: 't7-bosskey', pos: [0, -149.5], label: 'Open the big chest (Boss Key)' },
  { id: 't7-bossdoor', pos: [0, -151.2], label: 'Unlock the boss door' },
  { id: 'boss7', pos: [0, -172], label: 'Catch the Carbocation Phantom' },
]

export const PHANTOM = { center: [0, 0, -172] }
