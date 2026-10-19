/**
 * Free-group words for World 1 · Level 6 (π₁(S¹ ∨ S¹) ≅ F₂ on generators a, b).
 * Hatcher, Algebraic Topology, §1.2 (pp. 43–44): reduced words; ab ≠ ba in F₂.
 *
 * Pure module — no React. Letters match cells.js: { e: 0|1, s: +1|-1 } for a|b.
 */

export const GENERATORS = ['a', 'b']

/** Display one letter (e.g. a⁻¹). */
export const letterText = ({ e, s }) => GENERATORS[e] + (s < 0 ? '⁻¹' : '')

/** Display a word with spaces. */
export const wordText = (w) => (w.length ? w.map(letterText).join(' ') : '—')

/** Parse tokens like "a", "a-", "b", "b-". */
export function parseTokens(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const e = GENERATORS.indexOf(tok[0])
      if (e < 0) throw new Error(`unknown generator: ${tok}`)
      return { e, s: tok.endsWith('-') ? -1 : 1 }
    })
}

/** Lap on track 0 → a, track 1 → b; dir +1 forward, −1 backward (inverse). */
export function lapLetter(track, dir) {
  if (track < 0 || track > 1) throw new Error('track')
  return { e: track, s: dir > 0 ? 1 : -1 }
}

/** Freely reduce by cancelling adjacent inverses (standard normal form). */
export function reduceFree(w) {
  const out = []
  for (const l of w) {
    const top = out[out.length - 1]
    if (top && top.e === l.e && top.s === -l.s) out.pop()
    else out.push({ e: l.e, s: l.s })
  }
  return out
}

export const concat = (w1, w2) => reduceFree([...w1, ...w2])

export const reverseWord = (w) => [...w].reverse().map((l) => ({ e: l.e, s: -l.s }))

/** True if reduced forms match. */
export function sameReduced(w1, w2) {
  const a = reduceFree(w1)
  const b = reduceFree(w2)
  if (a.length !== b.length) return false
  return a.every((l, i) => l.e === b[i].e && l.s === b[i].s)
}

/** Append one lap letter; returns new tape and whether a cancel happened. */
export function appendLap(tape, track, dir) {
  const before = tape.length
  const next = reduceFree([...tape, lapLetter(track, dir)])
  return { tape: next, cancelled: next.length < before + 1 }
}

/** Patrol lash order: last letter of the walked word first (same orientation as walked). */
export function reverseLashOrder(word) {
  return [...word].reverse()
}

/** Expected generator index for lash step k (0-based) against patrol word. */
export function expectedLashLetter(word, step) {
  const rev = reverseLashOrder(word)
  return rev[step] ?? null
}

/** True if ab and ba differ in F₂ (reduced forms not equal). */
export function commutatorDistinct() {
  const ab = reduceFree(parseTokens('a b'))
  const ba = reduceFree(parseTokens('b a'))
  return !sameReduced(ab, ba)
}

/** Patrol word a b a⁻¹ b⁻¹ does not reduce (nontrivial commutator relator in F₂). */
export function patrolWordReduced() {
  return reduceFree(parseTokens('a b a- b-'))
}
