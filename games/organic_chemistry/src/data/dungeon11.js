// Dungeon 11 — the Coliseum's under-halls in the Volcanic Wastes (book Chapter 11, Reactions of Alkyl Halides:
// Nucleophilic Substitutions and Eliminations, pp. 341–384). Rooms along −z; the arena floor at the end.

export const W11 = 11

export const ROOMS11 = [
  { id: 'entrance', title: 'The Gladiators’ Gate', z: [8, -14], checkpoint: [0, 0, 3], sections: [], needs: ['t11-map'] },
  { id: '11-1', title: 'The Walden Gate', z: [-14, -40], checkpoint: [0, 0, -16], sections: ['11.1', '11.2'], needs: ['11-1a', '11-1b'] },
  { id: '11-2', title: 'Four Dials', z: [-40, -60], checkpoint: [0, 0, -42], sections: ['11.3'], needs: ['11-2'] },
  { id: '11-3', title: 'The Cation Pit', z: [-60, -82], checkpoint: [0, 0, -62], sections: ['11.4', '11.5'], needs: ['11-3'] },
  { id: '11-4', title: 'The Elimination Ring', z: [-82, -106], checkpoint: [0, 0, -84], sections: ['11.7', '11.8', '11.9'], needs: ['t11-door'] },
  { id: '11-5', title: 'The Champion’s Trial', z: [-106, -126], checkpoint: [0, 0, -108], sections: ['11.10', '11.12'], needs: ['t11-bosskey'] },
  // the boss checkpoint sits ~5.5 m past the fight gate (z -127.6), so the fight camera has room behind Kai
  { id: 'boss', title: 'The Arena Floor', z: [-126, -166], checkpoint: [0, 0, -133], sections: ['11.12'], needs: ['boss11'] },
]

export const STATIONS11 = {
  '11-1info': { pos: [-3, 0, -16.5], label: 'Read the gate’s inscription', panel: 'sn2Info', props: { title: 'The Walden Gate', text: 'Each centre holds a leaving group. Strike from the side opposite it and the centre turns inside out, like an umbrella in the wind.' } },
  '11-4z': { pos: [4, 0, -100], label: 'Which product wins?', panel: 'zaitsev', props: {} },
  '11-5': { pos: [0, 0, -114], label: 'Face the challengers', panel: 'trial', props: {} },
}

// 11-1: two centres (rules11 CENTRES); each visit turns each one's leaving group to a new compass direction
export const CENTRES11 = [
  { id: '11-1a', pos: [-3.5, -30] },
  { id: '11-1b', pos: [3.5, -30] },
]
// 11-2: four pedestals (each visit deals the four dials to them in a new order), and the run lever; spaced 2.8 m
// apart (the 1.4 m interact radii just meet) so all four names and values fit inside the view from the checkpoint
export const DIALS_POS = { slots: [[-4.2, -50], [-1.4, -50], [1.4, -50], [4.2, -50]], run: [0, -56] }
// 11-3: the cation pit, the three ways to begin (spots shuffled per visit), and its two faces' sluices (sides shuffled)
export const PIT11 = { centre: [0, -71], acts: [[-5.5, -67.5], [0, -65.6], [5.5, -67.5]], faces: [[-4, -76], [4, -76]] }
// 11-4: the chair floor
export const RING11 = { centre: [0, -92] }
export const BANNERS = ['SN2', 'SN1', 'E2', 'E1', 'E1cB']
// one cloth colour for every banner: the mechanism is read from the conditions, never matched by colour
export const BANNER_CLOTH = '#8a1e1e'

export const GOALS11 = [
  { id: 't11-umb', pos: [0, -22], label: 'Beat the ghouls: open the big chest' },
  { id: '11-1a', pos: [-3.5, -30], label: 'Attack (R)-1-bromo-1-phenylethane with CN⁻' },
  { id: '11-1b', pos: [3.5, -30], label: 'Attack (S)-2-bromohexane with acetate' },
  { id: 't11-compass', pos: [-7.6, -42], label: 'Open the chest (Compass)' },
  { id: '11-2', pos: [0, -56], label: 'Set the four dials for the fastest SN2' },
  { id: '11-3', pos: [0, -71], label: 'Turn the tertiary chloride into its alcohol, and call the mixture' },
  { id: '11-4e', pos: [0, -92], label: 'Eliminate HCl from the chair' },
  { id: '11-4z', pos: [4, -100], label: 'Which product wins?' },
  { id: 't11-key', pos: [0, -104], label: 'Take the small key' },
  { id: 't11-door', pos: [0, -105.6], label: 'Unlock the door' },
  { id: '11-5', pos: [0, -114], label: 'Name each challenger’s mechanism' },
  { id: 't11-bosskey', pos: [0, -123.5], label: 'Open the big chest (Boss Key)' },
  { id: 't11-bossdoor', pos: [0, -125.2], label: 'Unlock the arena gate' },
  { id: 'boss11', pos: [0, -146], label: 'Beat the Five-Stanced Champion' },
]

export const CHAMP = { center: [0, 0, -147], R: 11 }
