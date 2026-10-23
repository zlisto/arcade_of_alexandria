// Level select (title screen): jump to any point in the game. Each entry is a save to load and the
// scene to open. Cavern entries mark every goal before that point solved (from GOALS, in play order),
// so gates are open and bridges raised behind you.
import { GOALS } from './dungeon1'

const VILLAGE_DONE = { introSeen: true, villageDone: true, well: true, wolvesCleared: true, piMet: true }
const solvedBefore = (id) => {
  const i = id ? GOALS.findIndex((g) => g.id === id) : GOALS.length
  return Object.fromEntries(GOALS.slice(0, i < 0 ? GOALS.length : i).map((g) => [g.id, true]))
}
const cave = (room, upTo, extra = {}) => ({
  screen: 'caverns',
  save: { ...VILLAGE_DONE, solved: solvedBefore(upTo), checkpoint: { scene: 'caverns', room }, ...extra },
})

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
  { group: 'Credits', items: [{ label: 'Chapter 1 credits', screen: 'credits', save: { ...VILLAGE_DONE, solved: solvedBefore(null), hasCrystal: true, bossDone: true, shards: 1 } }] },
]
