// Level select (title screen): jump to any point in the game. Each entry is a save to load and the
// scene to open. Cavern entries mark every goal before that point solved (from GOALS, in play order),
// so gates are open and bridges raised behind you.
import { GOALS } from './dungeon1'
import { GOALS2, ROOMS2 } from './dungeon2'
import { GOALS3, ROOMS3, SPIRITS } from './dungeon3'
import { GOALS4, ROOMS4, ALTARS } from './dungeon4'
import { GOALS5, ROOMS5 } from './dungeon5'
import { GOALS6, ROOMS6 } from './dungeon6'
import { GOALS7, ROOMS7 } from './dungeon7'
import { GOALS8, ROOMS8 } from './dungeon8'

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

// World 4 starts from a finished World 3
const W3_DONE = () => ({ ...lab('boss', null).save, shards: 3 })
const fort = (room, upTo, extra = {}) => {
  const base = W3_DONE()
  const i = upTo ? GOALS4.findIndex((g) => g.id === upTo) : GOALS4.length
  const done = Object.fromEntries(GOALS4.slice(0, i).map((g) => [g.id, true]))
  const r = ROOMS4.findIndex((x) => x.id === room)
  return {
    screen: 'fortress',
    save: {
      ...base, hillsSeen: true, metSachse: true, t4rings: true,
      solved: { ...base.solved, ...done, 't4-map': true, 't4-decree': true },
      t4marks: { '4-1a': done['4-1a'] ? { 0: 'top', 1: 'top' } : {}, '4-1b': done['4-1b'] ? { 0: 'top', 2: 'bottom' } : {} },
      t4placed: done['4-2'] ? { 3: 115, 4: 110, 5: 26, 6: 0 } : {},
      hasGauntlet: !!done['t4-gauntlet'], t4key: !!done['t4-key'] && !done['t4-door'], t4bossKey: !!done['t4-bosskey'],
      t4throne: !!done['4-3'], t4tables: Object.fromEntries(['4-4a', '4-4b', '4-4c'].filter((id) => done[id]).map((id) => [id, true])), // solved tables sit in their better chair
      t4decalin: done['4-5'] ? ['top', 'bottom'] : ['top', 'top'],
      t4seen: Object.fromEntries(ROOMS4.slice(0, r + 1).map((x) => [x.id, true])),
      checkpoint: { scene: 'fortress', room }, ...extra,
    },
  }
}

// World 5 starts from a finished World 4
const W4_DONE = () => ({ ...fort('boss', null).save, shards: 4 })
const pal = (room, upTo, extra = {}) => {
  const base = W4_DONE()
  const i = upTo ? GOALS5.findIndex((g) => g.id === upTo) : GOALS5.length
  const done = Object.fromEntries(GOALS5.slice(0, i).map((g) => [g.id, true]))
  const r = ROOMS5.findIndex((x) => x.id === room)
  return {
    screen: 'palace',
    save: {
      ...base, lakeSeen: true, metTartara: true, t5crystals: true,
      solved: { ...base.solved, ...done, 't5-map': true, 't5-decree': true },
      t5statues: done['5-1'] ? { s1: 'achiral', s2: 'achiral', s3: 'achiral', s4: 'chiral' } : {},
      hasShield: !!done['t5-shield'], t5key: !!done['t5-key'] && !done['t5-door'], t5bossKey: !!done['t5-bosskey'],
      t5read: Object.fromEntries(['5-3a', '5-3b', '5-3c', '5-5c'].filter((id) => done[id]).map((id) => [id, true])),
      t5place: done['5-3a'] ? { '5-3a': ['H', 'CO₂H', 'OH', 'CH₃'] } : {},
      t5thr: done['5-4b'] ? ['S', 'R'] : done['5-4a'] ? ['S', 'S'] : ['R', 'R'], t5tart: done['5-4c'] ? ['R', 'S'] : ['R', 'R'],
      t5pool: done['5-5a'] ? 'split' : null,
      t5seen: Object.fromEntries(ROOMS5.slice(0, r + 1).map((x) => [x.id, true])),
      checkpoint: { scene: 'palace', room }, ...extra,
    },
  }
}

// World 6 starts from a finished World 5
const W5_DONE = () => ({ ...pal('boss', null).save, shards: 5 })
const cav = (room, upTo, extra = {}) => {
  const base = W5_DONE()
  const i = upTo ? GOALS6.findIndex((g) => g.id === upTo) : GOALS6.length
  const done = Object.fromEntries(GOALS6.slice(0, i).map((g) => [g.id, true]))
  const r = ROOMS6.findIndex((x) => x.id === room)
  return {
    screen: 'caves',
    save: {
      ...base, peaksSeen: true, metHammond: true, t6signs: true,
      solved: { ...base.solved, ...done, 't6-map': true, 't6-decree': true },
      hasBoots: !!done['t6-boots'], t6meter: done['6-5'] ? 80 : 0, t6made: done['6-3'] ? 3 : 0,
      t6key: !!done['t6-key'] && !done['t6-door'], t6bossKey: !!done['t6-bosskey'],
      t6seen: Object.fromEntries(ROOMS6.slice(0, r + 1).map((x) => [x.id, true])),
      checkpoint: { scene: 'caves', room }, ...extra,
    },
  }
}

// World 7 starts from a finished World 6
const W6_DONE = () => ({ ...cav('boss', null).save, shards: 6 })
const tow = (room, upTo, extra = {}) => {
  const base = W6_DONE()
  const i = upTo ? GOALS7.findIndex((g) => g.id === upTo) : GOALS7.length
  const done = Object.fromEntries(GOALS7.slice(0, i).map((g) => [g.id, true]))
  const r = ROOMS7.findIndex((x) => x.id === room)
  if (done['7-4']) ['b1', 'b2', 'b3', 'b4', 'b5'].forEach((b) => (done[b] = true))
  return {
    screen: 'tower',
    save: {
      ...base, plainsSeen: true, metMarkov: true, t7seeds: true,
      solved: { ...base.solved, ...done, 't7-map': true, 't7-decree': true },
      hasSling: !!done['t7-sling'], t7key: !!done['t7-key'] && !done['t7-door'], t7bossKey: !!done['t7-bosskey'],
      t7dials: done['7-1'] ? { c1: 2, c2: 1, c3: 2, c4: 2 } : {},
      t7ez: done['7-2'] ? { e1: { L: 'top', R: 'bot', done: 'E' }, e3: { L: 'top', R: 'top', done: 'Z' }, e4: { L: 'top', R: 'bot', done: 'E' }, e5: { done: 'none' } } : {},
      t7placed: done['7-3'] ? { tetra: 0, tri: 1, trans2b: 2, cis2b: 3, propene: 4, ethylene: 5 } : {},
      t7seen: Object.fromEntries(ROOMS7.slice(0, r + 1).map((x) => [x.id, true])),
      checkpoint: { scene: 'tower', room }, ...extra,
    },
  }
}

// World 8 starts from a finished World 7
const W7_DONE = () => ({ ...tow('boss', null).save, shards: 7 })
const gla = (room, upTo, extra = {}) => {
  const base = W7_DONE()
  const i = upTo ? GOALS8.findIndex((g) => g.id === upTo) : GOALS8.length
  const done = Object.fromEntries(GOALS8.slice(0, i).map((g) => [g.id, true]))
  const r = ROOMS8.findIndex((x) => x.id === room)
  if (done['t8-satchel']) done['t8-wraiths'] = true
  if (done['8-4c']) done['8-4'] = true
  return {
    screen: 'glasshouse',
    save: {
      ...base, orchardSeen: true, metBorana: true, t8board: true,
      solved: { ...base.solved, ...done, 't8-map': true, 't8-decree': true },
      hasSatchel: !!done['t8-satchel'], t8key: !!done['t8-key'] && !done['t8-door'], t8bossKey: !!done['t8-bosskey'],
      t8cut: !!done['8-4s'], t8halves: done['8-4s'] ? { left: 'acetone', right: 'acetaldehyde' } : {},
      t8seen: Object.fromEntries(ROOMS8.slice(0, r + 1).map((x) => [x.id, true])),
      checkpoint: { scene: 'glasshouse', room }, ...extra,
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
      { label: '1-5 Skeleton Gallery · §1.12', ...cave('1-5', '1-5a', { hasCrystal: true }) },
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
    group: 'World 4 · The Chair Fortress',
    items: [
      { label: 'Chain Forest · the east road (shard 3 in hand)', screen: 'forest', save: { ...W3_DONE(), checkpoint: { scene: 'forest', at: 'gate' } } },
      { label: 'Chair Hills · meet Lady Sachse', screen: 'hills', save: { ...W3_DONE(), checkpoint: { scene: 'hills', at: 'west' } } },
      { label: 'Chair Hills · the Banner Rings · §4.1', screen: 'hills', save: { ...W3_DONE(), hillsSeen: true, metSachse: true, checkpoint: { scene: 'hills', at: 'west' } } },
      { label: 'Fortress entrance · map chest', ...fort('entrance', '4-1a') },
      { label: '4-1 Gate of Two Faces · §4.1–4.2', ...fort('4-1', '4-1a') },
      { label: '4-2 Strain Towers · §4.3–4.5', ...fort('4-2', '4-2') },
      { label: '4-3 Chair Throne Room · the Gauntlet chest', ...fort('4-3', 't4-gauntlet') },
      { label: '4-3 Chair Throne Room · flip and cross · §4.6', ...fort('4-3', '4-3a') },
      { label: '4-4 Crowded Banquet · §4.7–4.8', ...fort('4-4', '4-4a') },
      { label: '4-5 Fused Keep · §4.9', ...fort('4-5', '4-5') },
      { label: 'Boss · The tert-Butyl Titan', ...fort('boss', 'boss4') },
      { label: 'Bond Shard 4 (boss beaten)', ...fort('boss', null) },
    ],
  },
  {
    group: 'World 5 · The Mirror Palace',
    items: [
      { label: 'Chair Hills · the east road (shard 4 in hand)', screen: 'hills', save: { ...W4_DONE(), checkpoint: { scene: 'hills', at: 'gate' } } },
      { label: 'Mirror Lake · meet Sister Tartara', screen: 'lake', save: { ...W4_DONE(), checkpoint: { scene: 'lake', at: 'south' } } },
      { label: 'Mirror Lake · Pasteur’s crystals · §5.4', screen: 'lake', save: { ...W4_DONE(), lakeSeen: true, metTartara: true, checkpoint: { scene: 'lake', at: 'south' } } },
      { label: 'Palace entrance · map chest', ...pal('entrance', '5-1') },
      { label: '5-1 Hall of Hands · §5.1–5.2', ...pal('5-1', '5-1') },
      { label: '5-2 The Polarized Window · §5.3', ...pal('5-2', '5-2') },
      { label: '5-3 Steering-Wheel Locks · the Shield chest', ...pal('5-3', 't5-shield') },
      { label: '5-3 Steering-Wheel Locks · §5.5', ...pal('5-3', '5-3a') },
      { label: '5-4 Halls of Many Centres · §5.6–5.7', ...pal('5-4', '5-4a') },
      { label: '5-5 The Resolution Hall · §5.8–5.12', ...pal('5-5', '5-5a') },
      { label: 'Boss · The Racemic King', ...pal('boss', 'boss5') },
      { label: 'Bond Shard 5 (boss beaten)', ...pal('boss', null) },
    ],
  },
  {
    group: 'World 6 · The Activation Peaks',
    items: [
      { label: 'Mirror Lake · the east road (shard 5 in hand)', screen: 'lake', save: { ...W5_DONE(), checkpoint: { scene: 'lake', at: 'gate' } } },
      { label: 'Activation Peaks · meet Hammond', screen: 'peaks', save: { ...W5_DONE(), checkpoint: { scene: 'peaks', at: 'west' } } },
      { label: 'Activation Peaks · the trail signs · §6.1', screen: 'peaks', save: { ...W5_DONE(), peaksSeen: true, metHammond: true, checkpoint: { scene: 'peaks', at: 'west' } } },
      { label: 'Pass Caves entrance · map chest', ...cav('entrance', '6-1a') },
      { label: '6-1 The Splitting Forge · §6.2', ...cav('6-1', '6-1a') },
      { label: '6-2 Electron Radar Gorge · §6.3–6.5', ...cav('6-2', 't6-compass') },
      { label: '6-3 The Chain Cave · §6.6', ...cav('6-3', '6-3') },
      { label: '6-4 The Ledger of Bonds · the Boots chest · §6.7–6.8', ...cav('6-4', '6-4') },
      { label: '6-5 The Twin Passes · §6.9–6.10', ...cav('6-5', '6-5') },
      { label: 'Boss · The Transition Wyrm', ...cav('boss', 'boss6') },
      { label: 'Bond Shard 6 (boss beaten)', ...cav('boss', null) },
    ],
  },
  {
    group: 'World 7 · The Tower of Addition',
    items: [
      { label: 'Activation Peaks · the east road (shard 6 in hand)', screen: 'peaks', save: { ...W6_DONE(), checkpoint: { scene: 'peaks', at: 'gate' } } },
      { label: 'Plains of Addition · meet Farmer Markov', screen: 'plains', save: { ...W6_DONE(), checkpoint: { scene: 'plains', at: 'west' } } },
      { label: 'Plains · the seed sacks · §7.3', screen: 'plains', save: { ...W6_DONE(), plainsSeen: true, metMarkov: true, checkpoint: { scene: 'plains', at: 'west' } } },
      { label: 'Tower entrance · map chest', ...tow('entrance', '7-1') },
      { label: '7-1 Counting Fields · §7.1–7.2', ...tow('7-1', '7-1') },
      { label: '7-2 Name and Geometry · §7.4–7.5', ...tow('7-2', 't7-compass') },
      { label: '7-3 The Stability Scales · §7.6', ...tow('7-3', '7-3') },
      { label: '7-4 The Harvest Hall · the Sling · §7.7–7.10', ...tow('7-4', '7-4') },
      { label: '7-5 The Shifting Crypt · §7.11', ...tow('7-5', '7-5h') },
      { label: 'Boss · The Carbocation Phantom', ...tow('boss', 'boss7') },
      { label: 'Bond Shard 7 (boss beaten)', ...tow('boss', null) },
    ],
  },
  {
    group: 'World 8 · The Reagent Orchards',
    items: [
      { label: 'Plains · the south road (shard 7 in hand)', screen: 'plains', save: { ...W7_DONE(), checkpoint: { scene: 'plains', at: 'gate' } } },
      { label: 'Reagent Orchards · meet Borana', screen: 'orchard', save: { ...W7_DONE(), checkpoint: { scene: 'orchard', at: 'north' } } },
      { label: 'Orchards · the recipe board · §8.2–8.9', screen: 'orchard', save: { ...W7_DONE(), orchardSeen: true, metBorana: true, checkpoint: { scene: 'orchard', at: 'north' } } },
      { label: 'Glasshouse entrance · map chest', ...gla('entrance', 't8-satchel') },
      { label: '8-1 Grove of Halogens · the wraiths · §8.2–8.3', ...gla('8-1', 't8-satchel') },
      { label: '8-1 Grove of Halogens · the altars', ...gla('8-1', '8-1a') },
      { label: '8-2 The Two Waters · §8.4–8.5', ...gla('8-2', '8-2a') },
      { label: '8-3 Garden of Faces · §8.6–8.7', ...gla('8-3', '8-3a') },
      { label: '8-4 The Ozone Shears · §8.8–8.9', ...gla('8-4', '8-4s') },
      { label: '8-5 The Chain Barn · §8.10–8.12', ...gla('8-5', '8-5p') },
      { label: 'Boss · The Polymer Leviathan', ...gla('boss', 'boss8') },
      { label: 'Bond Shard 8 (boss beaten)', ...gla('boss', null) },
    ],
  },
  {
    group: 'Shard warps (arrive outside, world card)',
    items: [
      { label: 'World 1 cleared · Cavern Mouth', screen: 'village', warpIn: { card: 1 }, save: { ...VILLAGE_DONE, solved: solvedBefore(null), hasCrystal: true, bossDone: true, shards: 1, checkpoint: { scene: 'village', at: 'cave' } } },
      { label: 'World 2 cleared · Tide Coast dock', screen: 'coast', warpIn: { card: 2 }, save: { ...temple('boss', null).save, shards: 2, checkpoint: { scene: 'coast', at: 'dock' } } },
      { label: 'World 3 cleared · Chain Forest gate', screen: 'forest', warpIn: { card: 3 }, save: { ...lab('boss', null).save, shards: 3, checkpoint: { scene: 'forest', at: 'gate' } } },
      { label: 'World 4 cleared · the Chair Hills drawbridge', screen: 'hills', warpIn: { card: 4 }, save: { ...fort('boss', null).save, shards: 4, checkpoint: { scene: 'hills', at: 'gate' } } },
      { label: 'World 5 cleared · the Mirror Lake shore', screen: 'lake', warpIn: { card: 5 }, save: { ...pal('boss', null).save, shards: 5, checkpoint: { scene: 'lake', at: 'gate' } } },
      { label: 'World 6 cleared · the Pass Caves mouth', screen: 'peaks', warpIn: { card: 6 }, save: { ...cav('boss', null).save, shards: 6, checkpoint: { scene: 'peaks', at: 'gate' } } },
      { label: 'World 7 cleared · the Tower door', screen: 'plains', warpIn: { card: 7 }, save: { ...tow('boss', null).save, shards: 7, checkpoint: { scene: 'plains', at: 'gate' } } },
      { label: 'World 8 cleared · the Glasshouse door', screen: 'orchard', warpIn: { card: 8 }, save: { ...gla('boss', null).save, shards: 8, checkpoint: { scene: 'orchard', at: 'gate' } } },
    ],
  },
]
