/**
 * Cell complexes for the Skeleton Foundry (0-4). Hatcher, Algebraic Topology, Chapter 0,
 * pp. 5–8: a cell complex is built inductively — a discrete set of points X⁰ (0-cells),
 * then 1-cells (edges) glued to X⁰ by their endpoints, then 2-cells (disks) glued to the
 * 1-skeleton along maps of their boundary circles.
 *
 * Every forge station here builds complexes with ONE point (the hub): each edge is a
 * loop at the hub — a "track" that leaves the hub and comes back — so the 1-skeleton is
 * a bouquet of circles, and a disk is attached along a word in the edges (a, a⁻¹, b, …).
 * That one-vertex form is how Hatcher builds the torus (a b a⁻¹ b⁻¹), the projective
 * plane (a a) and the closed surfaces generally.
 *
 * Here: track geometry, a tracker that turns Gyroid's walking into traversals (which
 * track, which way round), words, χ = V − E + F, and what a single-vertex complex is.
 */

// ---------------------------------------------------------------- tracks (loops at the hub)

/**
 * A petal-shaped track leaving the hub at `angle` (radians, in the x–z plane), `length`
 * out, `spread` wide. s ∈ [0, 1] runs hub → tip → hub; increasing s is the track's
 * "forward" way round (counter-clockwise seen from above).
 */
export function makeTrack({ angle, length = 4.2, spread = 1.15 }, hub = [0, 0], n = 120) {
  const at = (s) => {
    const r = length * Math.sin(Math.PI * s) ** 0.85
    const a = angle + spread * (s - 0.5)
    return [hub[0] + r * Math.cos(a), hub[1] + r * Math.sin(a)]
  }
  const pts = Array.from({ length: n + 1 }, (_, i) => at(i / n))
  /** nearest point of the track to (x, z): { s, d } */
  const nearest = (x, z) => {
    let best = { s: 0, d: Infinity }
    for (let i = 0; i <= n; i++) {
      const d = Math.hypot(pts[i][0] - x, pts[i][1] - z)
      if (d < best.d) best = { s: i / n, d }
    }
    return best
  }
  return { at, pts, nearest, angle, length }
}

// ---------------------------------------------------------------- the walking tracker

export const HUB_RADIUS = 0.95
const ON_TRACK = 0.7 // how close to a track's line counts as walking it
const OFF_TRACK = 1.6 // wander this far from it and the traversal is abandoned
const ALL_THE_WAY = 0.86 // must get at least this far round before coming home

/**
 * Turns positions into traversals. Call `update(x, z)` every tick; it returns
 *   { event: 'leave', track } when Gyroid sets off along a track,
 *   { event: 'done', track, dir: +1 | −1 } when he comes back to the hub having gone
 *     (nearly) all the way round — dir +1 for the track's forward way, −1 for backward,
 *   { event: 'abandon', track } if he turns back or wanders off,
 *   or null.
 * `progress()` reports how far round the current traversal is (0..1).
 */
export function makeTracker(tracks, hub = [0, 0]) {
  let state = { at: 'hub' } // or { at: 'track', track, entry: 's0' | 's1', best }
  let started = false
  const update = (x, z) => {
    const atHub = Math.hypot(x - hub[0], z - hub[1]) < HUB_RADIUS
    if (state.at === 'hub' || state.at === 'off') {
      if (atHub) {
        state = { at: 'hub' }
        started = true
        return null
      }
      if (!started || state.at === 'off') return null // must set off from the hub
      // left the hub: onto which track, from which end?
      let pick = null
      tracks.forEach((t, i) => {
        const m = t.nearest(x, z)
        if (m.d < ON_TRACK && (!pick || m.d < pick.d)) pick = { track: i, s: m.s, d: m.d }
      })
      if (!pick) return null
      state = { at: 'track', track: pick.track, entry: pick.s < 0.5 ? 's0' : 's1', best: 0 }
      return { event: 'leave', track: pick.track }
    }
    // on a track
    const t = tracks[state.track]
    const m = t.nearest(x, z)
    if (atHub) {
      const done = state.best >= ALL_THE_WAY
      const ev = done ? { event: 'done', track: state.track, dir: state.entry === 's0' ? 1 : -1 } : { event: 'abandon', track: state.track }
      state = { at: 'hub' }
      return ev
    }
    if (m.d > OFF_TRACK) {
      const ev = { event: 'abandon', track: state.track }
      state = { at: 'off' }
      return ev
    }
    if (m.d < ON_TRACK) {
      const p = state.entry === 's0' ? m.s : 1 - m.s
      // progress only counts while it's continuous (no cutting across the petal)
      if (p > state.best && p - state.best < 0.25) state.best = p
    }
    return null
  }
  const progress = () => (state.at === 'track' ? state.best : 0)
  const current = () => (state.at === 'track' ? { track: state.track, dir: state.entry === 's0' ? 1 : -1 } : null)
  const reset = () => {
    state = { at: 'hub' }
    started = false
  }
  return { update, progress, current, reset }
}

// ---------------------------------------------------------------- words

export const LETTERS = ['a', 'b', 'c', 'd']
/** A letter of a word: { e: edge index, s: +1 | −1 } */
export const letterText = ({ e, s }) => LETTERS[e] + (s < 0 ? '⁻¹' : '')
export const wordText = (w) => (w.length ? w.map(letterText).join(' ') : '—')

/** Freely reduce a word (cancel x x⁻¹ pairs, cyclically too). */
export function reduceCyclic(w) {
  const out = []
  for (const l of w) {
    const top = out[out.length - 1]
    if (top && top.e === l.e && top.s === -l.s) out.pop()
    else out.push(l)
  }
  while (out.length > 1 && out[0].e === out[out.length - 1].e && out[0].s === -out[out.length - 1].s) {
    out.shift()
    out.pop()
  }
  return out
}

/** Do two words name the same attaching loop up to where you start and which way you go round? */
export function sameWord(w1, w2) {
  if (w1.length !== w2.length) return false
  const key = (w) => w.map((l) => `${l.e}${l.s > 0 ? '+' : '-'}`)
  const inv = (w) => [...w].reverse().map((l) => ({ e: l.e, s: -l.s }))
  const target = key(w2).join(',')
  for (const cand of [w1, inv(w1)]) {
    const k = key(cand)
    for (let i = 0; i < k.length; i++) if ([...k.slice(i), ...k.slice(0, i)].join(',') === target) return true
  }
  return false
}

// ---------------------------------------------------------------- the complex

/**
 * The complex at a station: { point: bool, edges: [{ dir: ±1, torn }], disks: [word] }.
 * χ = V − E + F.
 */
export const chi = (c) => (c.point ? 1 : 0) - c.edges.length + c.disks.length

/**
 * What a one-point complex is, from its cells (only the cases the Foundry builds):
 *   'point' · 'bouquet' (no disks) · 'disk' (one disk on a loop walked once)
 *   'sphere' (a disk with its rim crushed to the point, or a a⁻¹, or two disks on one loop)
 *   'torus' · 'rp2' · 'klein' (one disk whose word uses each edge twice)
 *   'pinched' (a disk on a a⁻¹: a sphere with two points glued — the edge's ends are one point)
 *   'other' (a perfectly good cell complex, just not one of these surfaces)
 */
export function identify(c) {
  if (!c.point) return 'nothing'
  const E = c.edges.length
  const F = c.disks.length
  if (F === 0) return E === 0 ? 'point' : 'bouquet'
  if (E === 0 && F === 1) return 'sphere' // a disk whose whole boundary goes to the point
  if (F === 2 && E === 1) {
    const [w1, w2] = c.disks
    if (w1.length === 1 && w2.length === 1) return 'sphere' // two hemispheres on one equator
  }
  if (F !== 1) return 'other'
  const w = c.disks[0]
  const used = new Map()
  for (const l of w) used.set(l.e, [...(used.get(l.e) || []), l.s])
  if (E === 1 && w.length === 1) return 'disk'
  // a disk on a a⁻¹ zips shut into a sphere — but the edge's two ends are the one point,
  // so two points of that sphere end up glued together (χ = 1, not 2)
  if (E === 1 && w.length === 2 && w[0].s === -w[1].s) return 'pinched'
  if (used.size !== E) return 'other' // some edge left out of the disk's word
  const counts = [...used.values()]
  if (!counts.every((s) => s.length === 2)) return 'other'
  const orientable = counts.every((s) => s[0] === -s[1])
  const x = chi(c)
  if (orientable && x === 2) return 'sphere'
  if (orientable && x === 0) return 'torus'
  if (!orientable && x === 1) return 'rp2'
  if (!orientable && x === 0) return 'klein'
  return 'other'
}

export const SPACE_NAME = {
  nothing: 'nothing yet',
  point: 'a point',
  bouquet: 'a bouquet of circles',
  disk: 'a disk',
  pinched: 'a sphere with two of its points glued together',
  sphere: 'a sphere',
  torus: 'a torus',
  rp2: 'a projective plane',
  klein: 'a Klein bottle',
  other: 'a cell complex (not one of the blueprint surfaces)',
}

/** Parse a blueprint word like "a b a- b-" into letters. */
export const parseWord = (str) =>
  str
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => ({ e: LETTERS.indexOf(tok[0]), s: tok.endsWith('-') ? -1 : 1 }))
