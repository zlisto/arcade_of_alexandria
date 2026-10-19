/**
 * Final Fantasy VII-style captions for the movies: a line types out, then the movie
 * holds on that frame until the player clicks (or presses Space / Enter).
 *
 * makeGate(captions, acked, held) returns gate(t0, t1): given the story time now (t0)
 * and where the clock would go next (t1), it returns the time to stop at — just before
 * an unacknowledged caption ends — or null to carry on. `acked` is a Set of caption
 * start times the player has clicked through; `held.current` says whether we're waiting.
 */
export const HOLD_EPS = 0.001

export function makeGate(captions, acked, held) {
  return (t0, t1) => {
    for (const c of captions) {
      if (acked.has(c.t)) continue
      const stop = c.end - HOLD_EPS
      if (t1 >= stop && t0 <= stop + 1e-6 && t0 >= c.t - 0.5) {
        held.current = c.t
        return stop
      }
    }
    held.current = null
    return null
  }
}

/** Is a click/press meant for the caption (not a button like Skip or Sound)? */
export const isAdvanceEvent = (e) => !(e.target instanceof Element && e.target.closest('button, input, a'))
