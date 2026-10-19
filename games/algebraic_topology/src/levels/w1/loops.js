/**
 * Based loops at a point (World 1 · Level 2). Hatcher, Algebraic Topology, §1.1:
 * concatenation of based loops up to homotopy is a group; change of base along a path h
 * sends γ ↦ h γ h⁻¹.
 *
 * Letters are track indices 0, 1, 2 … rendered as α, β, γ.
 */

export const LOOP_NAMES = ['α', 'β', 'γ', 'δ']

/** One oriented lap on track `t` (+1 forward, −1 backward). */
export function letter(t, d = 1) {
  return { t, d: d < 0 ? -1 : 1 }
}

export function letterText(l) {
  if (!l) return '—'
  return LOOP_NAMES[l.t] + (l.d < 0 ? '⁻¹' : '')
}

export function wordText(w) {
  return w.length ? w.map(letterText).join(' ') : '∅'
}

export function concat(a, b) {
  return [...a, ...b]
}

export function inverse(w) {
  return [...w].reverse().map((l) => letter(l.t, -l.d))
}

/** Cancel adjacent inverses (free reduction). */
export function reduce(w) {
  const out = []
  for (const l of w) {
    const top = out[out.length - 1]
    if (top && top.t === l.t && top.d === -l.d) out.pop()
    else out.push({ t: l.t, d: l.d })
  }
  return out
}

const key = (w) => reduce(w).map((l) => `${l.t}${l.d > 0 ? '+' : '-'}`).join(',')

/** Same loop class after reduction. */
export function sameLoop(w1, w2) {
  return key(w1) === key(w2)
}

/** Associativity in the token model: (a∘b)∘c and a∘(b∘c) reduce the same. */
export function assocEqual(a, b, c) {
  return sameLoop(concat(concat(a, b), c), concat(a, concat(b, c)))
}

/**
 * Change of base: carry loops along path h (a word in the same letters).
 * γ ↦ h γ h⁻¹ as concatenation in the based loop group at the new point.
 */
export function conjugate(word, pathWord) {
  return reduce(concat(concat(pathWord, word), inverse(pathWord)))
}

/** Append one completed lap; returns new reduced word. */
export function addLap(word, lap) {
  return reduce(concat(word, [lap]))
}

/** Does `seq` of laps reduce to `expect` (default empty = identity)? */
export function sequenceOk(seq, expect = []) {
  let w = []
  for (const lap of seq) w = addLap(w, lap)
  return sameLoop(w, expect)
}
