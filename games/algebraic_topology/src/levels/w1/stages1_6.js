/**
 * World 1 · Level 6 "Free Word Play" — Free-Word Forge.
 * Hatcher §1.2: free group on a, b; reduced words; ab ≠ ba (proof deferred to covers, 1-8).
 */

const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })
const G = (text) => ({ speaker: 'Gyroid', portrait: 'gyroid', text })
const N = (text) => ({ speaker: 'Count Null', portrait: 'count-null', text })

export const STATION_ORDER = ['laps_letters', 'cancel_deck', 'order_deck', 'patrol_yard']

export const OPENING = [
  N('Every lap you run here leaves a letter. Spell them wrong and the patrol will know.'),
  E('Red district is $a$, violet is $b$. Backwards is the inverse. Meet me at the beacon — first deck ahead.'),
]

/**
 * Goal types:
 *   lap track dir     — complete one lap on that track (+1 forward, −1 backward)
 *   tape tokens       — reduced tape must match parseTokens(tokens)
 *   reduce from to    — player tape must reduce to match `to` after walking cancel pairs
 *   ask               — multiple choice
 *   patrol            — lash the ribbon patrol in reverse word order
 *   clasp             — click the beacon with the Van Kampen Clasp to join tapes (demo)
 */
export const STATIONS = {
  laps_letters: {
    blueprint: 'Laps are letters',
    arrive: [
      E('The red loop is generator $a$, the violet loop is $b$. Run a full lap from the beacon and back — each lap prints a letter on your tape.'),
      E('Run $a$ once forward, then $a$ backward. Watch the pair cancel.'),
    ],
    goals: [
      { type: 'lap', track: 0, dir: 1, done: [E('Red lap: $a$ on the tape.')] },
      { type: 'lap', track: 0, dir: -1, done: [G('Snap — opposites side by side cancel. Empty tape.'), E('That’s free reduction. Nothing else cancels unless it’s an adjacent inverse.')] },
      { type: 'lap', track: 1, dir: 1, done: [E('Violet lap: $b$. You’re spelling words with your feet. On to Cancel — south along the causeway.')] },
    ],
    early: [E('Laps Are Letters starts at the beacon deck — just ahead.')],
  },
  cancel_deck: {
    blueprint: 'Cancel',
    arrive: [
      E('Long patrol words clutter the tape. Walk laps until only the reduced word remains.'),
      E('Try $a b a⁻¹ b⁻¹$ — the Commutator’s march. It never shrinks.'),
    ],
    goals: [
      {
        type: 'tape',
        tokens: 'a b a- b-',
        done: [G('Four letters. Nothing cancels.'), E('That word is the figure-eight’s famous loop. It’s nontrivial in the free group.')],
      },
      {
        type: 'reduce',
        from: 'a a- b b- a',
        to: 'a',
        done: [E('Only adjacent opposites vanish. The leftover reduced word is unique — we’ll prove that at the Viaduct.'), E('East: Order Matters.')] },
    ],
    early: [E('Cancel deck is south of the beacon.')],
  },
  order_deck: {
    blueprint: 'Order matters',
    arrive: [
      E('Walk $a$ then $b$ from the beacon. Then clear your tape and walk $b$ then $a$.'),
      E('No homotopy slides one into the other on this bouquet — order matters in $F_2$.'),
    ],
    goals: [
      { type: 'tape', tokens: 'a b', done: [E('Tape reads $a b$.')] },
      { type: 'tape', tokens: 'b a', afterClear: true, done: [E('Tape reads $b a$. Different reduced word — different loop class.')] },
      {
        type: 'ask',
        question: 'Can a homotopy rel the beacon turn a then b into b then a?',
        options: ['Yes — slide one into the other', 'No — not on this bouquet'],
        answer: 'No — not on this bouquet',
        right: [E('Correct. In the free group $ab ≠ ba$. I’ll show you a covering-space proof at Sheetwater.')],
        wrong: [E('They’re different reduced words, so they’re different loops here. Try again.')],
      },
    ],
    early: [E('Order Matters is east of Cancel.')],
  },
  patrol_yard: {
    blueprint: 'The patrol',
    arrive: [
      E('Ribbon patrol — the Commutator’s guard. It walks $a b a⁻¹ b⁻¹$ forever.'),
      E('You can’t talk it down: the word doesn’t reduce. Lash it in reverse word order — $b⁻¹$, then $a⁻¹$, then $b$, then $a$.'),
      E('Take the Van Kampen Clasp (5): at the beacon it keeps generator order visible when you join tapes.'),
    ],
    goals: [
      { type: 'clasp', done: [E('Clasp locked. Generators stay in order when you merge words at the beacon.')] },
      {
        type: 'patrol',
        word: 'a b a- b-',
        wave: true,
        done: [G('Reverse order — one lash per letter. Patrol dissolved.'), E('That’s the free group in motion. Glue Works is next — walk out through the gate when you’re ready.')],
      },
    ],
    early: [E('The patrol yard is the last deck — north of Order Matters.')],
  },
}

export const DEFINITION16 = {
  text: 'The fundamental group of a bouquet of two circles is the free group on two generators: equivalence classes of based loops, written as reduced words in a and b, with only adjacent inverse pairs cancelling.',
  cite: 'Hatcher, Algebraic Topology, §1.2 (pp. 43–44). Uniqueness of reduced form is shown via covering spaces (§1.3).',
  url: 'https://pi.math.cornell.edu/~hatcher/AT/ATch1.pdf',
}

export const HINTS16 = {
  knockout: E('Hearts back — your tape and progress stay. Lash the spawn, then keep walking laps from the beacon.'),
  far: E('Walk closer to the beacon hub — laps start and end there.'),
  wrongLash: E('Wrong letter in the reverse order — wait until the patrol is on that lap, then lash.'),
  abandon: E('Go all the way round the loop and back to the beacon.'),
  clasp: E('Van Kampen Clasp (5): click the amber beacon to lock the clasp.'),
}

export function emmyAdvice16(state) {
  const { current, done, goal, tape, here, enemies, patrolStep, waveOn } = state
  if (!current) return [E('The gate north is open — walk out to finish.')]
  if (here?.site !== current) return [E(`Head to ${state.siteName || 'the next deck'} — follow the map’s NEXT ring.`)]
  if (!goal) return [E('Keep exploring — something’s still ahead on this deck.')]
  if (enemies?.[current] > 0) {
    if (goal.type === 'patrol') return [E(`Patrol still up — lash in reverse word order (step ${patrolStep || 0} of 4).`)]
    return [E('Lash the spawn (1) before you work the loops.')]
  }
  if (goal.type === 'lap') return [E(`Run a full lap on the ${goal.track ? 'violet ($b$)' : 'red ($a$)'} loop ${goal.dir < 0 ? 'backward' : 'forward'} from the beacon.`)]
  if (goal.type === 'tape') return [E(`Your tape should read ${goal.tokens.replace(/-/g, '⁻¹ ').replace(/\s+/g, ' ').trim()} when reduced.`)]
  if (goal.type === 'reduce') return [E('Cancel adjacent opposites by walking inverse laps.')]
  if (goal.type === 'ask') return [E('Think about reduced words: can $ab$ and $ba$ be the same in $F_2$?')]
  if (goal.type === 'clasp') return [E('Equip the Clasp (5) and click the beacon.')]
  if (goal.type === 'patrol' && waveOn) return [E('Wait for the patrol to march in — then reverse-order lashes.')]
  return [E('Walk loops from the beacon; watch the tape above you.')]
}
