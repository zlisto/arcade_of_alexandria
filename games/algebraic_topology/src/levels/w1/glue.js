/**
 * Fundamental groups from disk attachments and Van Kampen gluing (World 1 · Level 7).
 * Hatcher, Algebraic Topology, §1.2 (van Kampen), Example 1.6 (torus, RP², sphere).
 *
 * Letters: { e: generator index, s: +1 | −1 }. Generators are named a,b,c,… via index.
 */

export const GEN_NAMES = ['a', 'b', 'c', 'd']

/** @typedef {{ e: number, s: number }} Letter */
/** @typedef {{ gens: number, rels: Letter[][] }} Presentation */

export const letterText = ({ e, s }) => GEN_NAMES[e] + (s < 0 ? '⁻¹' : '')
export const wordText = (w) => (w.length ? w.map(letterText).join(' ') : '1')

/** Cancel adjacent inverses (free reduction). */
export function freeReduce(w) {
  const out = []
  for (const l of w) {
    const top = out[out.length - 1]
    if (top && top.e === l.e && top.s === -l.s) out.pop()
    else out.push({ e: l.e, s: l.s })
  }
  return out
}

export function invertWord(w) {
  return [...w].reverse().map((l) => ({ e: l.e, s: -l.s }))
}

export function concatWords(...parts) {
  return freeReduce(parts.flat())
}

/** Cyclically reduce a relation (for comparing attaching loops). */
export function normalizeRelation(w) {
  const r = freeReduce(w)
  if (!r.length) return r
  let best = r
  const n = r.length
  for (let i = 0; i < n; i++) {
    const rot = [...r.slice(i), ...r.slice(0, i)]
    const inv = invertWord(rot)
    for (const cand of [rot, inv]) {
      const key = cand.map((l) => `${l.e}${l.s > 0 ? '+' : '-'}`).join(',')
      const bestKey = best.map((l) => `${l.e}${l.s > 0 ? '+' : '-'}`).join(',')
      if (key < bestKey) best = cand
    }
  }
  return best
}

export function sameRelation(w1, w2) {
  return normalizeRelation(w1).map((l) => `${l.e}${l.s}`).join() === normalizeRelation(w2).map((l) => `${l.e}${l.s}`).join()
}

export function emptyPresentation(nGens = 0) {
  return { gens: nGens, rels: [] }
}

export function addRelation(p, word) {
  const r = normalizeRelation(word)
  if (!r.length) return p
  if (p.rels.some((q) => sameRelation(q, r))) return p
  return { gens: p.gens, rels: [...p.rels, r] }
}

/** Attach a 2-cell along `word` (adds that loop as a relation). */
export function attachDisk(p, word) {
  return addRelation(p, word)
}

export function netExponent(w, gen) {
  return w.reduce((s, l) => s + (l.e === gen ? l.s : 0), 0)
}

/** Detect the small family of groups this level builds. */
export function classifyPresentation(p) {
  const { gens, rels } = p
  if (gens === 0) return { type: 'trivial' }
  if (gens === 1) {
    if (!rels.length) return { type: 'Z', gen: 0 }
    if (rels.length === 1) {
      const r = rels[0]
      if (r.length === 1 && r[0].e === 0 && r[0].s === 1) return { type: 'trivial' }
      if (r.length === 2 && r[0].e === 0 && r[1].e === 0 && r[0].s === 1 && r[1].s === 1) return { type: 'Z2', gen: 0 }
    }
  }
  if (gens === 2 && rels.length === 1) {
    const r = rels[0]
    const comm = [
      { e: 0, s: 1 },
      { e: 1, s: 1 },
      { e: 0, s: -1 },
      { e: 1, s: -1 },
    ]
    if (sameRelation(r, comm)) return { type: 'Z2_abelian', gens: [0, 1] }
  }
  if (gens === 2 && rels.length === 1) {
    const r = rels[0]
    // a b⁻¹  (identify generators — Van Kampen overlap)
    if (r.length === 2 && r[0].e === 0 && r[0].s === 1 && r[1].e === 1 && r[1].s === -1) return { type: 'Z_merged', gens: [0, 1] }
    if (r.length === 2 && r[0].e === 1 && r[0].s === 1 && r[1].e === 0 && r[1].s === -1) return { type: 'Z_merged', gens: [0, 1] }
  }
  return { type: 'other' }
}

export function presentationLabel(p) {
  const k = classifyPresentation(p)
  if (k.type === 'trivial') return '1 (trivial)'
  if (k.type === 'Z') return 'ℤ'
  if (k.type === 'Z2') return 'ℤ₂'
  if (k.type === 'Z2_abelian') return 'ℤ × ℤ'
  if (k.type === 'Z_merged') return 'ℤ (one generator)'
  return '⟨generators | relations⟩'
}

/** Is `word` the identity in the presentation? (exact for the groups in this level.) */
export function isTrivial(p, word) {
  const w = freeReduce(word)
  if (!w.length) return true
  const k = classifyPresentation(p)
  if (k.type === 'trivial') return true
  if (k.type === 'Z') return false
  if (k.type === 'Z2') return netExponent(w, 0) % 2 === 0
  if (k.type === 'Z2_abelian') return netExponent(w, 0) === 0 && netExponent(w, 1) === 0
  if (k.type === 'Z_merged') return netExponent(w, 0) + netExponent(w, 1) === 0
  return false
}

/** Do two words name the same element? */
export function sameClass(p, w1, w2) {
  return isTrivial(p, concatWords(w1, invertWord(w2)))
}

/** Van Kampen: amalgamate along shared generator c = wordL in left = wordR in right. */
export function vanKampenMerge(left, right, wordInLeft, wordInRight) {
  const gens = Math.max(left.gens, right.gens)
  const rel = concatWords(wordInLeft, invertWord(wordInRight))
  const rels = [...left.rels, ...right.rels]
  const out = { gens, rels }
  return addRelation(out, rel)
}

/** Parse blueprint tokens like "a b a- b-". */
export function parseWord(str) {
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => ({ e: GEN_NAMES.indexOf(tok[0]), s: tok.endsWith('-') ? -1 : 1 }))
}

export function wordFromLetters(letters) {
  return letters.map(({ e, s }) => ({ e, s }))
}
