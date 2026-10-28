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
  { id: 'boss', title: 'The Arena Floor', z: [-126, -166], checkpoint: [0, 0, -129], sections: ['11.12'], needs: ['boss11'] },
]

export const STATIONS11 = {
  '11-1info': { pos: [-3, 0, -16.5], label: 'Read the gate’s inscription', panel: 'sn2Info', props: { title: 'The Walden Gate', text: 'Each centre holds a leaving group. Strike from the side opposite it and the centre turns inside out, like an umbrella in the wind.' } },
  '11-4z': { pos: [4, 0, -100], label: 'Which alkene wins?', panel: 'zaitsev', props: {} },
  '11-5': { pos: [0, 0, -114], label: 'Face the five challengers', panel: 'trial', props: {} },
}

// 11-1: two centres, each with its leaving group pointing toward the entrance (+z); the back side is −z
export const CENTRES11 = [
  { id: '11-1a', pos: [-4.5, -30], start: 'S', name: '(S)-2-bromobutane', nu: 'HO⁻', product: '(R)-2-butanol', want: 'R' },
  { id: '11-1b', pos: [4.5, -30], start: 'R', name: '(R)-2-bromobutane', nu: 'HO⁻', product: '(S)-2-butanol', want: 'S' },
]
// 11-2: the four dials, and the run lever
export const DIALS_POS = { sub: [-6, -50], nu: [-2, -50], lg: [2, -50], sol: [6, -50], run: [0, -56] }
// 11-3: the cation pit, and its two faces' switches
export const PIT11 = { centre: [0, -71], top: [-4, -76], bottom: [4, -76] }
// 11-4: the chair floor
export const RING11 = { centre: [0, -92] }
export const BANNERS = ['SN2', 'SN1', 'E2', 'E1', 'E1cB']
export const BANNER_COLOR = { SN2: '#4a8aff', SN1: '#f0f0f0', E2: '#ff4a4a', E1: '#4aff6a', E1cB: '#b04aff' }

export const GOALS11 = [
  { id: 't11-umb', pos: [0, -22], label: 'Beat the ghouls: open the big chest' },
  { id: '11-1a', pos: [-4.5, -30], label: 'Invert (S)-2-bromobutane from behind' },
  { id: '11-1b', pos: [4.5, -30], label: 'Invert (R)-2-bromobutane from behind' },
  { id: 't11-compass', pos: [-7.6, -42], label: 'Open the chest (Compass)' },
  { id: '11-2', pos: [0, -56], label: 'Set the four dials for the fastest SN2' },
  { id: '11-3', pos: [0, -71], label: 'Let the cation form; let water in from both faces' },
  { id: '11-4e', pos: [0, -92], label: 'Flip the ring until H and Cl are trans-diaxial, then eliminate' },
  { id: '11-4z', pos: [4, -100], label: 'Pick Zaitsev’s alkene' },
  { id: 't11-key', pos: [0, -104], label: 'Take the small key' },
  { id: 't11-door', pos: [0, -105.6], label: 'Unlock the door' },
  { id: '11-5', pos: [0, -114], label: 'Name each challenger’s mechanism' },
  { id: 't11-bosskey', pos: [0, -123.5], label: 'Open the big chest (Boss Key)' },
  { id: 't11-bossdoor', pos: [0, -125.2], label: 'Unlock the arena gate' },
  { id: 'boss11', pos: [0, -146], label: 'Beat the Five-Stanced Champion' },
]

export const CHAMP = { center: [0, 0, -147], R: 11 }
