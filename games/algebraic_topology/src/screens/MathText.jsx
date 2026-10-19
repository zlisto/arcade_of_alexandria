/**
 * Dialogue text with its math picked out: anything that would be typeset as math —
 * χ = 1 − 0 + 1 = 2, a b a⁻¹ b⁻¹, S¹ × S¹, D²/∂D² — is shown bold and pink.
 * Math can be marked explicitly with $…$; otherwise it's found by its symbols: a run of
 * words counts as math when one of them carries a math symbol (χ, ×, ∨, ≃, ∂, ⁻¹,
 * super/subscripts, =), and the run may include plain numbers, operators and single
 * letters next to it (so "a b a⁻¹ b⁻¹" is all math, but "a disk" isn't).
 *
 * Typing: `shown` is how many characters have typed out (a number), or the typed prefix
 * (a string); the rest is laid out invisibly so the box never changes size.
 */

import { TERM_RE } from './terms'

const STRONG = /[χπ∨×≃≅∂ℝℤΣ∪∩⊂⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁻⁺₀₁₂₃₄=→]/
const WEAK = /^(?:[a-zA-Z]|[−-]?\d+(?:\.\d+)?|[−+×=/–-])$/
const PUNCT = /^([("“]*)(.*?)([)"”.,:;!?—]*)$/

/** Split text into [{ text, math }] segments. */
/** Split the plain (non-math) segments further, picking out vocabulary terms. */
function withTerms(segs) {
  const out = []
  for (const seg of segs) {
    if (seg.math) {
      out.push(seg)
      continue
    }
    let last = 0
    for (const m of seg.text.matchAll(TERM_RE)) {
      if (m.index > last) out.push({ text: seg.text.slice(last, m.index), math: false })
      out.push({ text: m[0], math: false, term: true })
      last = m.index + m[0].length
    }
    if (last < seg.text.length) out.push({ text: seg.text.slice(last), math: false })
  }
  return out
}

export function mathSegments(text) {
  return withTerms(mathOnly(text))
}

function mathOnly(text) {
  // explicit $…$ first; the parts outside the dollars still get the automatic treatment
  if (text.includes('$')) {
    const out = []
    text.split('$').forEach((t, i) => {
      for (const seg of i % 2 === 1 ? [{ text: t, math: true }] : autoSegments(t)) {
        const prev = out[out.length - 1]
        if (prev && prev.math === seg.math) prev.text += seg.text
        else if (seg.text) out.push({ ...seg })
      }
    })
    return out
  }
  return autoSegments(text)
}

function autoSegments(text) {
  const parts = text.split(/(\s+)/) // words and the spaces between
  const words = parts.map((p) => {
    if (/^\s+$/.test(p) || !p) return { p, kind: 'space' }
    let [, pre, core, post] = p.match(PUNCT)
    // keep a closing bracket with its opening one: S(S¹) stays whole
    while (post.startsWith(')') && (core.match(/\(/g) || []).length > (core.match(/\)/g) || []).length) {
      core += ')'
      post = post.slice(1)
    }
    const kind = STRONG.test(core) ? 'strong' : core && WEAK.test(core) ? 'weak' : 'text'
    return { p, pre, core, post, kind }
  })
  // find runs of strong/weak words (spaces between are fine) that contain a strong word
  const math = new Array(words.length).fill(false)
  let i = 0
  while (i < words.length) {
    if (words[i].kind !== 'strong' && words[i].kind !== 'weak') {
      i++
      continue
    }
    let j = i
    let strong = false
    let last = i
    while (j < words.length && (words[j].kind === 'strong' || words[j].kind === 'weak' || words[j].kind === 'space')) {
      if (words[j].kind === 'strong') strong = true
      if (words[j].kind !== 'space') last = j
      // a word ending in sentence punctuation closes the run
      if (words[j].kind !== 'space' && /[.,:;!?—]$/.test(words[j].post || '')) break
      j++
    }
    if (strong) for (let k = i; k <= last; k++) math[k] = true
    i = Math.max(last, i) + 1
  }
  // build segments; punctuation around a math word stays plain
  const segs = []
  const push = (t, m) => {
    if (!t) return
    const prev = segs[segs.length - 1]
    if (prev && prev.math === m) prev.text += t
    else segs.push({ text: t, math: m })
  }
  words.forEach((w, k) => {
    if (w.kind === 'space') return push(w.p, math[k] && math[k - 1] && math[k + 1])
    if (!math[k]) return push(w.p, false)
    push(w.pre, false)
    push(w.core, true)
    push(w.post, false)
  })
  return segs
}

export default function MathText({ text, shown }) {
  const n = typeof shown === 'string' ? shown.length : shown ?? text.length
  const segs = mathSegments(text)
  let at = 0
  const typed = []
  const rest = []
  segs.forEach((s, i) => {
    const a = at
    const b = at + s.text.length
    at = b
    const cut = Math.max(0, Math.min(s.text.length, n - a))
    const Tag = s.math || s.term ? 'b' : 'span'
    const cls = s.math ? 'math' : s.term ? 'term' : undefined
    if (cut > 0) typed.push(<Tag key={'t' + i} className={cls}>{s.text.slice(0, cut)}</Tag>)
    if (cut < s.text.length) rest.push(<Tag key={'r' + i} className={cls}>{s.text.slice(cut)}</Tag>)
  })
  return (
    <>
      {typed}
      <span className="untyped">{rest}</span>
    </>
  )
}
