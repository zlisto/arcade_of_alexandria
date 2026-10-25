// Level select (title screen): jump to any point in the game. Each entry is a save to load and the
// scene to open. Cavern entries mark every goal before that point solved (from GOALS, in play order),
// so gates are open and bridges raised behind you.
import { GOALS } from './dungeon1'
import { GOALS2, ROOMS2 } from './dungeon2'
import { GOALS3, ROOMS3, SPIRITS } from './dungeon3'

const VILLAGE_DONE = { introSeen: true, villageDone: true, well: true, wolvesCleared: true, piMet: true }
const solvedBefore = (id) => {
  const i = id ? GOALS.findIndex((g) => g.id === id) : GOALS.length
  return Object.fromEntries(GOALS.slice(0, i < 0 ? GOALS.length : i).map((g) => [g.id, true]))
}
const cave = (room, upTo, extra = {}) => ({
  screen: 'caverns',
  save: { ...VILLAGE_DONE, solved: solvedBefore(upTo), checkpoint: { scene: 'caverns', room }, ...extra },
})

// World 2 starts from a finished World 1
const W1_DONE = { ...VILLAGE_DONE, solved: solvedBefore(null), hasCrystal: true, bossDone: true, shards: 1, fieldSeen: true }
const COAST_DONE = { ...W1_DONE, coastSeen: true, metFerrymen: true, lighthouseLit: true }
const temple = (room, upTo, extra = {}) => {
  const i = upTo ? GOALS2.findIndex((g) => g.id === upTo) : GOALS2.length
  const done = Object.fromEntries(GOALS2.slice(0, i).map((g) => [g.id, true]))
  const r = ROOMS2.findIndex((x) => x.id === room)
  return {
    screen: 'temple',
    save: {
      ...COAST_DONE, solved: { ...W1_DONE.solved, ...done },
      hasHookshot: !!done['t2-hookshot'], t2key: !!done['t2-key'] && !done['t2-door'], t2bossKey: !!done['t2-bosskey'],
      t2seen: Object.fromEntries(ROOMS2.slice(0, r + 1).map((x) => [x.id, true])),
      checkpoint: { scene: 'temple', room }, ...extra,
    },
  }
}

// World 3 starts from a finished World 2
const W2_DONE = () => ({ ...temple('boss', null).save, shards: 2 })
const lab = (room, upTo, extra = {}) => {
  const base = W2_DONE()
  const i = upTo ? GOALS3.findIndex((g) => g.id === upTo) : GOALS3.length
  const done = Object.fromEntries(GOALS3.slice(0, i).map((g) => [g.id, true]))
  const r = ROOMS3.findIndex((x) => x.id === room)
  return {
    screen: 'labyrinth',
    save: {
      ...base, forestSeen: true, metIupaca: true, t3shelf: true,
      solved: { ...base.solved, ...done, 't3-map': true, 't3-decree': true },
      t3placed: done['3-1'] ? Object.fromEntries(SPIRITS.map((sp) => [sp.id, sp.group])) : {},
      hasLantern: !!done['t3-lantern'], t3key: !!done['t3-key'] && !done['t3-door'], t3bossKey: !!done['t3-bosskey'],
      t3seen: Object.fromEntries(ROOMS3.slice(0, r + 1).map((x) => [x.id, true])),
      checkpoint: { scene: 'labyrinth', room }, ...extra,
    },
  }
}

export const LEVELS = [
  { group: 'Intro', items: [{ label: 'Opening cutscene', screen: 'intro', save: {} }] },
  {
    group: 'Hydrogen Village',
    items: [
      { label: 'Arrive (meet Pi)', screen: 'village', save: { introSeen: true, checkpoint: { scene: 'village' } } },
      { label: "Elder's quest (bond 4 hydrogens)", screen: 'village', save: { introSeen: true, piMet: true, checkpoint: { scene: 'village' } } },
      { label: 'Radical Wolves fight', screen: 'village', save: { introSeen: true, piMet: true, well: true, checkpoint: { scene: 'village' } } },
      { label: 'Cave open (methane on display)', screen: 'village', save: { ...VILLAGE_DONE, checkpoint: { scene: 'village' } } },
    ],
  },
  {
    group: 'World 1 · The Orbital Caverns',
    items: [
      { label: 'Cavern Mouth · Sage Aufbau', ...cave('entrance', 'met-aufbau') },
      { label: '1-1 Nucleus Grotto · §1.1', ...cave('1-1', '1-1a') },
      { label: '1-2 Hall of Shells · §1.2–1.3', ...cave('1-2', '1-2C') },
      { label: '1-3 Socket Bridge · §1.4–1.5', ...cave('1-3', '1-3well') },
      { label: '1-3 Wolf arena', ...cave('1-3', '1-3wolves') },
      { label: '1-4 Forge of Hybrids · §1.6–1.10', ...cave('1-4', '1-4crystal') },
      { label: '1-4 Forge, Hybrid Crystal in hand', ...cave('1-4', '1-4tetra', { hasCrystal: true }) },
      { label: '1-5 Skeleton Gallery · §1.11–1.12', ...cave('1-5', '1-5a', { hasCrystal: true }) },
      { label: 'Boss · The Unbonded Colossus', ...cave('boss', 'boss', { hasCrystal: true }) },
      { label: 'Bond Shard (boss beaten)', ...cave('boss', null, { hasCrystal: true, bossDone: true }) },
    ],
  },
  {
    group: 'World 2 · The Tide Temple',
    items: [
      { label: 'Village east road (shard 1 in hand)', screen: 'village', save: { ...W1_DONE, fieldSeen: false, checkpoint: { scene: 'village', at: 'east' } } },
      { label: 'Valence Fields (overworld)', screen: 'field', save: { ...W1_DONE, fieldSeen: false, checkpoint: { scene: 'field', at: 'village' } } },
      { label: 'Tide Coast · meet the Ferrymen', screen: 'coast', save: { ...W1_DONE, checkpoint: { scene: 'coast', at: 'road' } } },
      { label: 'Tide Coast · the lighthouse · §2.1', screen: 'coast', save: { ...W1_DONE, coastSeen: true, metFerrymen: true, checkpoint: { scene: 'coast', at: 'road' } } },
      { label: 'Temple entrance · map chest', ...temple('entrance', '2-1') },
      { label: '2-1 Tug-of-War Hall · §2.2', ...temple('2-1', '2-1') },
      { label: '2-2 Hall of Accounts · §2.3', ...temple('2-2', 't2-compass') },
      { label: '2-3 Tidepools · the Hookshot chest', ...temple('2-3', 't2-hookshot') },
      { label: '2-3 Tidepools · hook across · §2.4–2.6', ...temple('2-3', '2-3') },
      { label: '2-4 pKa Ladder · §2.7–2.10', ...temple('2-4', '2-4a') },
      { label: '2-5 Lewis Docks · §2.11–2.12', ...temple('2-5', '2-5') },
      { label: 'Boss · The Resonance Hydra', ...temple('boss', 'boss2') },
      { label: 'Bond Shard 2 (boss beaten)', ...temple('boss', null) },
    ],
  },
  {
    group: 'World 3 · The Chain Labyrinth',
    items: [
      { label: 'Fields · the forest road (shard 2 in hand)', screen: 'field', save: { ...W2_DONE(), thornsSeen: true, checkpoint: { scene: 'field', at: 'forest' } } },
      { label: 'Chain Forest · meet Iupaca', screen: 'forest', save: { ...W2_DONE(), checkpoint: { scene: 'forest', at: 'south' } } },
      { label: 'Chain Forest · the Shelf of Ten · §3.2', screen: 'forest', save: { ...W2_DONE(), forestSeen: true, metIupaca: true, checkpoint: { scene: 'forest', at: 'south' } } },
      { label: 'Labyrinth entrance · map chest', ...lab('entrance', '3-1') },
      { label: '3-1 Hall of Families · §3.1', ...lab('3-1', '3-1') },
      { label: '3-2 Isomer Garden · §3.2–3.3', ...lab('3-2', '3-2a') },
      { label: '3-3 Naming Maze · §3.4', ...lab('3-3', '3-3walkA') },
      { label: '3-3 Naming Maze, second floor', ...lab('3-3', '3-3walkB') },
      { label: '3-4 Turning Halls · the Lantern chest', ...lab('3-4', 't3-lantern') },
      { label: '3-4 Turning Halls · Newman doors · §3.6–3.7', ...lab('3-4', '3-4a') },
      { label: 'Boss · The Gauche Serpent', ...lab('boss', 'boss3') },
      { label: 'Bond Shard 3 (boss beaten)', ...lab('boss', null) },
    ],
  },
  {
    group: 'Credits',
    items: [
      { label: 'Chapter 1 credits', screen: 'credits', save: { ...VILLAGE_DONE, solved: solvedBefore(null), hasCrystal: true, bossDone: true, shards: 1 } },
      { label: 'Chapter 2 credits', screen: 'credits2', save: { ...temple('boss', null).save, shards: 2, checkpoint: { scene: 'coast', at: 'dock' } } },
      { label: 'Chapter 3 credits', screen: 'credits3', save: { ...lab('boss', null).save, shards: 3, checkpoint: { scene: 'forest', at: 'gate' } } },
    ],
  },
]
