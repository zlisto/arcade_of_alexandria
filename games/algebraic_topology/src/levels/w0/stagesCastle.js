/**
 * World 0 · Castle "The Hollow Throne" — Count Null's three trials, a review of World 0.
 * In each round Null runs three demonstrations on the arena floor; a judgment beacon hovers
 * by each. Lash the beacons of the forgeries; spare the honest ones.
 *   Trial 1  Live forgeries   — deformations of loops on a ring of reef (0-1, 0-2)
 *   Trial 2  Simplifications  — collapses: a tree felled, a loop felled, a hole coned (0-5, 0-6)
 *   Trial 3  Same shape?      — Null's claims that two spaces match (0-3, 0-4's χ)
 * Then the ring: Null claims a ring is a point, and nothing from World 0 can refute him.
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const PANELS = [
  [-5, 0.6],
  [0, 3.4],
  [5, 0.6],
]
export const BEACON_OFFSET = [0, -2.1]
export const NULL_AT = [0, -7.3]

export const OPENING = [
  N('Welcome to the top of my spire, courier. Three trials. Each round, I show you three things happening on my floor.'),
  N('Some are honest. Some are my forgeries. Lash the beacon over a forgery — and spare the honest ones, or my Crown will cut you.'),
]

/**
 * Trial 1 demos (a ring of reef: a disk with a hole):
 *   slide   — honest: a loop around the hole slides and wobbles, staying on the reef
 *   wander  — honest: a small loop travels round the ring
 *   tear    — forgery: a loop around the hole shrinks right across the hole
 *   leave   — forgery: a loop drifts off the edge of the reef
 *   jump    — forgery: a loop vanishes on one side and reappears on the other
 */
export const TRIALS = [
  {
    name: 'Live forgeries',
    intro: [
      N('Trial one. Three loops, moving on three rings of reef. A real deformation stays on the reef, never tears, and never jumps the hole.'),
      E('Watch each one all the way through before you lash.'),
    ],
    rounds: [
      ['slide', 'tear', 'wander'],
      ['wander', 'slide', 'leave'],
      ['jump', 'wander', 'slide'],
    ],
    honest: ['slide', 'wander'],
    why: {
      tear: 'It shrank straight across the hole — the hole isn’t reef, so the loop left the space.',
      leave: 'It slid off the edge of the reef. A deformation has to stay in the space the whole time.',
      jump: 'It jumped — gone on one side, back on the other, with nothing in between. That’s a tear, not a deformation.',
    },
    spared: {
      slide: 'That loop wobbled, but it stayed on the reef and went round the hole the whole time. Honest.',
      wander: 'That little loop just travelled round the ring, on the reef all along. Honest.',
    },
    done: [N('Hmph. You can see a tear.'), N('Let us see if you can count. Spawn — entertain him.')],
  },
  {
    name: 'Simplifications',
    intro: [N('Trial two. Collapses. I squash things to make them simpler — the way your Emmy taught you. Or the way I prefer.')],
    rounds: [
      ['tree', 'loopfell', 'cone'],
      ['cone', 'contract', 'tree'],
    ],
    honest: ['tree', 'contract'],
    why: {
      loopfell: 'He shrank a loop to its platform. A loop has one end — its hole died with it.',
      cone: 'He coned the ring. A cone shrinks to a point, so the ring’s hole is plugged — that’s not the same space.',
    },
    spared: {
      tree: 'That was a tree being felled — walkways with two different ends. Legal: nothing lost.',
      contract: 'A disk shrinking to its middle point. A disk has no hole to lose. Legal.',
    },
    done: [N('You learn quickly. Too quickly.'), N('One more test. And then my Crown will finish this.')],
  },
  {
    name: 'Same shape?',
    intro: [
      N('Trial three. Pairs of spaces. I say each pair is the same shape. Lash the beacon of every lie.'),
      E('Count their cells, Gyroid. If χ differs, they’re not the same — or at least, that’s what χ says. We haven’t proved χ can’t change yet.'),
    ],
    rounds: [
      [['disk', 'point'], ['eight', 'circle'], ['cylinder', 'circle']],
      [['sphere', 'disk'], ['cone_circle', 'point'], ['torus', 'sphere']],
    ],
    // a pair is honest when the two really are the same shape (homotopy equivalent)
    honestPairs: ['disk+point', 'cylinder+circle', 'cone_circle+point'],
    why: {
      'eight+circle': 'A figure-eight has χ = 1 − 2 = −1; a circle has χ = 0. Different counts.',
      'sphere+disk': 'A sphere has χ = 2; a disk has χ = 1. Different counts.',
      'torus+sphere': 'A torus has χ = 0; a sphere has χ = 2. Different counts.',
    },
    spared: {
      'disk+point': 'A disk shrinks to a point. Same shape.',
      'cylinder+circle': 'A cylinder squashes down onto its middle circle. Same shape.',
      'cone_circle+point': 'A cone shrinks to its tip. Same shape.',
    },
    done: [N('Enough!'), N('Crown — to me!')],
  },
]

export const WAVES = [
  [['sphere', -3, 2], ['sphere', 3, 2], ['torus', 0, 5], ['shard', -5, -3], ['shard', 5, -3]],
  [['torus', -4, 3], ['coner', 4, 3], ['biter', 0, 5.5], ['shard', -5, -2], ['shard', 5, -2], ['shard', 0, -4]],
  [['shard', -5, -2], ['shard', 5, -2], ['shard', -3, -4.5], ['shard', 3, -4.5], ['torus', 0, 5], ['sphere', -4, 4], ['sphere', 4, 4]],
]

export const PUNISH = [
  ['shard', -2, -5],
  ['shard', 2, -5],
]

export const RING = [
  N('Every trick of mine, exposed. Well done.'),
  N('Now — this ring. It is a point. Prove that it isn’t.'),
  G('χ! A ring has one point and one edge: χ = 0. A point has χ = 1.'),
  N('And who proved your χ can’t change when you rebuild a space differently? Your Emmy? You? She said so herself: not yet.'),
  G('Then — every slide I try stops at the hole. It won’t shrink.'),
  N('Won’t — or can’t? You don’t know. Nobody here knows.'),
]

export const HINTS_CASTLE = {
  wrong: (why) => [N(`Ha! That one was honest. ${why}`), N('My Crown punishes the unjust. Shards!')],
  knockout: E('Up, Gyroid! Shake it off — Null’s restarted the round.'),
  wave: 'Clear the spawn',
}

export const DEFINITION_CASTLE = {
  text: 'World 0 in one sentence: two spaces are the same shape (homotopy equivalent) when each deforms into the other — deformations stay in the space and never tear; collapsing a tree or anything else contractible is allowed, collapsing a loop is not; and χ counts cells. What World 0 cannot do is prove that a circle is not a point. For that we need an invariant that counts loops: the fundamental group.',
  cite: 'Allen Hatcher, Algebraic Topology, Chapter 0 (homotopy, cell complexes, operations on spaces); the circle’s fundamental group is Theorem 1.7, Chapter 1.',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html',
}
