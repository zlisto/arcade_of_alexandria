/**
 * Covering spaces for the figure-eight (S¹ ∨ S¹) and torus lifts for World 1 · Level 9.
 * Hatcher, Algebraic Topology, §1.3 (pp. 56–63): connected covers ↔ subgroups of π₁ (up to
 * conjugacy); the universal cover of F₂ is a tree; the universal cover of T² is the plane ℤ².
 */

export const LETTERS = { a: 'a', A: 'a⁻¹', b: 'b', B: 'b⁻¹' }
export const letterText = (L) => LETTERS[L] || L

/** @typedef {{ n: number, adj: Array<Record<'a'|'A'|'b'|'B', number>> }} CoverGraph */

export function makeCover(n, adj) {
  return { n, adj: adj.map((row) => ({ ...row })) }
}

export function makeEmptyCover(n) {
  const adj = Array.from({ length: n }, () => ({ a: 0, A: 0, b: 0, B: 0 }))
  return { n, adj }
}

/** Follow one oriented generator from vertex v. */
export function step(cover, v, letter) {
  return cover.adj[v]?.[letter] ?? v
}

/** Lift a reduced word; empty word stays at start (not counted as closed loop). */
export function liftWord(cover, start, word) {
  let v = start
  for (const L of word) v = step(cover, v, L)
  return { end: v, closed: word.length > 0 && v === start }
}

export function parseWord(s) {
  const out = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === 'a' || c === 'b') out.push(c)
    else if (c === 'A') out.push('A')
    else if (c === 'B') out.push('B')
    else if (c === '⁻' && s[i + 1] === '¹') {
      i++
      if (s[i - 2] === 'a') out.push('A')
      else if (s[i - 2] === 'b') out.push('B')
    }
  }
  return out
}

/** Cancel aa⁻¹ and bb⁻¹ tails. */
export function reduceWord(word) {
  const st = []
  for (const L of word) {
    const inv = L === 'a' ? 'A' : L === 'A' ? 'a' : L === 'b' ? 'B' : 'b'
    if (st.length && st[st.length - 1] === inv) st.pop()
    else st.push(L)
  }
  return st
}

/** Every vertex has four outgoing edges; each undirected generator appears once in each direction globally. */
export function isValidCover(cover) {
  const { n, adj } = cover
  for (let v = 0; v < n; v++) {
    for (const L of ['a', 'A', 'b', 'B']) {
      const w = adj[v][L]
      if (w < 0 || w >= n) return false
      const inv = L === 'a' ? 'A' : L === 'A' ? 'a' : L === 'b' ? 'B' : 'b'
      if (adj[w][inv] !== v) return false
    }
  }
  return true
}

/** Order: which reduced generators must / must not close at the chosen basepoint. */
export function orderMatches(cover, base, order) {
  for (const [wordStr, mustClose] of order.rules) {
    const w = parseWord(wordStr)
    const { closed } = liftWord(cover, base, w)
    if (closed !== mustClose) return false
  }
  return isValidCover(cover)
}

/** Index-2 cover for ⟨a², b⟩: a² and b close; a alone does not. */
export function coverTwoSheetAA() {
  // Cosets H and aH for H = ⟨a², b⟩; see Hatcher §1.3, Example 1.13 (figure-eight covers).
  return makeCover(2, [
    { a: 1, A: 1, b: 0, B: 0 },
    { a: 0, A: 0, b: 1, B: 1 },
  ])
}

/** Wrong glues for the teach deck; last entry is the order solution. */
export const BUILD_PRESETS = [
  makeCover(2, [
    { a: 0, A: 0, b: 0, B: 0 },
    { a: 1, A: 1, b: 1, B: 1 },
  ]),
  makeCover(2, [
    { a: 1, A: 1, b: 0, B: 0 },
    { a: 0, A: 0, b: 1, B: 1 },
  ]),
  coverTwoSheetAA(),
]

export function presetMatchesOrder(index, base, order) {
  return orderMatches(BUILD_PRESETS[index], base, order)
}

export const ORDER_TWO_SHEET_AA = {
  label: 'a² closes · a does not · b closes',
  rules: [
    ['aa', true],
    ['a', false],
    ['b', true],
  ],
}

/** Moving the basepoint along a path w conjugates the subgroup: g ↦ w g w⁻¹. */
export function conjugateOrder(order, moveWord) {
  const w = reduceWord(parseWord(moveWord))
  const winv = [...w].reverse().map((L) => (L === 'a' ? 'A' : L === 'A' ? 'a' : L === 'b' ? 'B' : 'b'))
  const rules = order.rules.map(([wordStr, mustClose]) => {
    const inner = parseWord(wordStr)
    const conj = reduceWord([...w, ...inner, ...winv])
    const readable = conj.map((L) => letterText(L)).join(' ')
    return [conj.map((L) => (L === 'A' ? 'A' : L === 'B' ? 'B' : L)).join(''), mustClose, readable]
  })
  return { ...order, label: `conjugate (${moveWord})`, rules: rules.map(([s, c]) => [s, c]) }
}

/** Cayley tree of F₂: coordinates are the reduced word from the origin. */
export function treeStep(word, letter) {
  return reduceWord([...word, letter])
}

export function wordEqual(a, b) {
  const ra = reduceWord(a)
  const rb = reduceWord(b)
  return ra.length === rb.length && ra.every((L, i) => L === rb[i])
}

/** Torus universal cover ℤ²: a = (1,0), b = (0,1). */
export function torusStep([m, n], letter) {
  if (letter === 'a') return [m + 1, n]
  if (letter === 'A') return [m - 1, n]
  if (letter === 'b') return [m, n + 1]
  return [m, n - 1]
}

export function torusLift(start, word) {
  let p = start
  for (const L of word) p = torusStep(p, L)
  return p
}

/** Index-2 cover of a single a-loop: one a opens, aa closes (Level 1-8 circle deck). */
export function coverTwoSheetCircle() {
  return makeCover(2, [
    { a: 1, A: 1, b: 0, B: 0 },
    { a: 0, A: 0, b: 1, B: 1 },
  ])
}

/**
 * Three-sheet cover of the figure-eight (one basepoint) separating ab from ba.
 * pa swaps sheets 0↔1; pb sends 0→2, 1→0, 2→1.
 */
export function coverThreeSheetAbSep() {
  return makeCover(3, [
    { a: 1, A: 1, b: 2, B: 1 },
    { a: 0, A: 0, b: 0, B: 2 },
    { a: 2, A: 2, b: 1, B: 0 },
  ])
}

export function coverConnectedFrom(cover, base = 0) {
  const seen = new Set([base])
  const q = [base]
  while (q.length) {
    const v = q.pop()
    for (const L of ['a', 'A', 'b', 'B']) {
      const w = step(cover, v, L)
      if (!seen.has(w)) {
        seen.add(w)
        q.push(w)
      }
    }
  }
  return seen.size === cover.n
}

/** Cycle one outgoing port at vertex v (for wiring UI). */
export function cyclePortAt(cover, v, letter) {
  const L = letter === 'a' || letter === 'b' ? letter : null
  if (!L) return cover
  const inv = L === 'a' ? 'A' : 'B'
  const c = makeCover(cover.n, cover.adj)
  if (!c.adj[v]) return cover
  const prev = c.adj[v][L]
  const next = (prev + 1) % c.n
  // Swap, so every label stays a permutation of the sheets (one edge in, one out at each vertex):
  // whoever was sent to `next` is now sent to the sheet that `v` used to reach.
  const u = c.adj.findIndex((row) => row[L] === next)
  if (u >= 0 && u !== v) {
    c.adj[u][L] = prev
    c.adj[prev][inv] = u
  }
  c.adj[v][L] = next
  c.adj[next][inv] = v
  return c
}

/** Broken 3-sheet start for the wiring deck (invalid until player cycles ports). */
export function coverBrokenThreeSheet() {
  return makeCover(3, [
    { a: 0, A: 0, b: 0, B: 0 },
    { a: 1, A: 1, b: 1, B: 1 },
    { a: 2, A: 2, b: 2, B: 2 },
  ])
}

export function coversEqual(a, b) {
  return a.n === b.n && JSON.stringify(a.adj) === JSON.stringify(b.adj)
}

/** Nearest click on a cover port (local xz) within tol. */
export function nearestPort(ports, x, z, tol = 1.35) {
  let best = null
  let d = tol
  for (const p of ports) {
    const dd = Math.hypot(x - p[0], z - p[1])
    if (dd < d) {
      d = dd
      best = p
    }
  }
  return best
}
