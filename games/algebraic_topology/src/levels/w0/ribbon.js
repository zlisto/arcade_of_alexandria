/**
 * Ribbons for Tidewarp Flats (0-2): paths f : I → X in the flats X (a plane region
 * with tide pools cut out), and the homotopies that move them.
 *
 * A playable ribbon is an elastic band laid between pins. Pins are its two end posts
 * (always fixed: a homotopy rel endpoints), stakes it has been hooked onto (also
 * fixed), the point Gyroid is holding, and cuts a Snapper made. Between pins the band
 * relaxes toward taut and wraps around pools instead of crossing them, so every
 * frame is a continuous path in X and consecutive frames are close: the recorded
 * frames are a homotopy. Cuts are the one way to break continuity, and the shrines
 * refuse a cut ribbon.
 *
 * Whether the ribbon matches a shrine's target path is the question "are these two
 * paths homotopic rel endpoints in X?" With the pins equal, it is answered by winding:
 * the ribbon followed by the target backwards is a loop, and in a plane with disks
 * removed that loop must wind zero times around every pool. (Exact for one pool; for
 * several pools winding numbers only see the abelianization of π₁ — World 2's
 * H₁ — which is enough for the shrine paths used here.)
 *
 * Also here: the scripted homotopies — the tide's movie at the Tide Line, and Count
 * Null's two fake deformations, one that jumps in time and one that leaves the flats.
 */

const SPACING = 0.16 // target distance between ribbon points
const RELAX_ITERS = 14
const POOL_PAD = 0.06

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

// ---------------------------------------------------------------- the space X

/** The flats from the layout: inside the outline, outside every pool. */
export function makeFlats(layout) {
  const poly = layout.outline
  const pools = layout.pools.map((p) => ({ ...p }))
  const inPoly = (x, z) => {
    let c = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i]
      const [xj, zj] = poly[j]
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c
    }
    return c
  }
  const inPool = (x, z, pad = 0) => pools.find((p) => Math.hypot(x - p.c[0], z - p.c[1]) < p.r + pad) || null
  return { poly, pools, inPoly, inPool, inside: (x, z) => inPoly(x, z) && !inPool(x, z) }
}

// ---------------------------------------------------------------- polylines

export function polyLength(pts) {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i])
  return L
}

/** Resample a polyline to n points evenly spaced by arc length (same path, new parametrization). */
export function resample(pts, n) {
  if (pts.length < 2) return Array.from({ length: n }, () => [...pts[0]])
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  const L = cum[cum.length - 1]
  const out = []
  let j = 1
  for (let k = 0; k < n; k++) {
    const s = (L * k) / (n - 1)
    while (j < pts.length - 1 && cum[j] < s) j++
    const seg = cum[j] - cum[j - 1] || 1
    const u = Math.min(1, Math.max(0, (s - cum[j - 1]) / seg))
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u])
  }
  return out
}

/** Total signed turning of a closed loop around point c, in full turns. */
export function winding(loop, c) {
  let w = 0
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i]
    const q = loop[(i + 1) % loop.length]
    const a = Math.atan2(p[1] - c[1], p[0] - c[0])
    const b = Math.atan2(q[1] - c[1], q[0] - c[0])
    let d = b - a
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    w += d
  }
  return w / (2 * Math.PI)
}

// ---------------------------------------------------------------- playable ribbons

/**
 * pins: [{ kind: 'post'|'stake'|'grab'|'cut', pos, id? }], spans[i] runs from pins[i] to pins[i+1].
 */
export function makeRibbon({ a, b, via = [] }) {
  const path = [a, ...via, b]
  const n = Math.max(6, Math.round(polyLength(path) / SPACING))
  return {
    pins: [
      { kind: 'post', pos: [...a] },
      { kind: 'post', pos: [...b] },
    ],
    spans: [resample(path, n)],
  }
}

const spanCount = (L) => Math.max(4, Math.min(160, Math.round(L / SPACING) + 1))

function pushOutOfPools(p, flats) {
  for (const pool of flats.pools) {
    const dx = p[0] - pool.c[0]
    const dz = p[1] - pool.c[1]
    const d = Math.hypot(dx, dz)
    const R = pool.r + POOL_PAD
    if (d < R) {
      const k = d > 1e-6 ? R / d : 1
      p[0] = pool.c[0] + (d > 1e-6 ? dx * k : R)
      p[1] = pool.c[1] + (d > 1e-6 ? dz * k : 0)
    }
  }
}

/** Keep each segment off the water: push a segment that dips into a pool back out. */
function fixSegments(span, flats) {
  for (let i = 0; i + 1 < span.length; i++) {
    const p = span[i]
    const q = span[i + 1]
    for (const pool of flats.pools) {
      const dx = q[0] - p[0]
      const dz = q[1] - p[1]
      const l2 = dx * dx + dz * dz || 1e-9
      const u = Math.max(0, Math.min(1, ((pool.c[0] - p[0]) * dx + (pool.c[1] - p[1]) * dz) / l2))
      const cx = p[0] + dx * u
      const cz = p[1] + dz * u
      let nx = cx - pool.c[0]
      let nz = cz - pool.c[1]
      const d = Math.hypot(nx, nz)
      const R = pool.r + POOL_PAD
      if (d >= R) continue
      if (d < 1e-6) ((nx = -dz), (nz = dx))
      const nl = Math.hypot(nx, nz) || 1
      const push = R - d
      const movable = (k) => k > 0 && k < span.length - 1
      if (movable(i)) ((p[0] += (nx / nl) * push), (p[1] += (nz / nl) * push))
      if (movable(i + 1)) ((q[0] += (nx / nl) * push), (q[1] += (nz / nl) * push))
    }
  }
}

/** One physics step: pins hold, the band between them relaxes toward taut around the pools. */
export function stepRibbon(r, flats) {
  for (let s = 0; s < r.spans.length; s++) {
    let span = r.spans[s]
    const a = r.pins[s].pos
    const b = r.pins[s + 1].pos
    span[0] = [a[0], a[1]]
    span[span.length - 1] = [b[0], b[1]]
    span = resample(span, spanCount(polyLength(span)))
    for (let it = 0; it < RELAX_ITERS; it++) {
      for (let i = 1; i < span.length - 1; i++) {
        const p = span[i]
        const mx = (span[i - 1][0] + span[i + 1][0]) / 2
        const mz = (span[i - 1][1] + span[i + 1][1]) / 2
        const ox = p[0]
        const oz = p[1]
        p[0] += (mx - p[0]) * 0.5
        p[1] += (mz - p[1]) * 0.5
        pushOutOfPools(p, flats)
        if (!flats.inPoly(p[0], p[1])) ((p[0] = ox), (p[1] = oz))
      }
      fixSegments(span, flats)
    }
    r.spans[s] = span
  }
}

/** The whole ribbon as one polyline (cuts included as ordinary points). */
export function ribbonPoints(r) {
  const out = []
  r.spans.forEach((sp, i) => out.push(...(i ? sp.slice(1) : sp)))
  return out
}

/** The ribbon split at its cuts: one polyline per unbroken piece. */
export function ribbonPieces(r) {
  const pieces = [[]]
  r.spans.forEach((sp, i) => {
    const cur = pieces[pieces.length - 1]
    cur.push(...(cur.length ? sp.slice(1) : sp))
    if (r.pins[i + 1].kind === 'cut') pieces.push([[...r.pins[i + 1].pos]])
  })
  return pieces
}

export const ribbonLength = (r) => r.spans.reduce((L, sp) => L + polyLength(sp), 0)
export const hasCut = (r) => r.pins.some((p) => p.kind === 'cut')
export const grabPin = (r) => r.pins.find((p) => p.kind === 'grab') || null
export const hookedStakes = (r) => r.pins.filter((p) => p.kind === 'stake').map((p) => p.id)

/** Nearest point on the band (not at a pin) to (x, z): { span, index, pos, d }. */
export function nearestOnRibbon(r, x, z, { skipPins = 0.25 } = {}) {
  let best = null
  r.spans.forEach((sp, s) => {
    for (let i = 1; i < sp.length - 1; i++) {
      const d = Math.hypot(sp[i][0] - x, sp[i][1] - z)
      if (best && d >= best.d) continue
      if (dist(sp[i], r.pins[s].pos) < skipPins || dist(sp[i], r.pins[s + 1].pos) < skipPins) continue
      best = { span: s, index: i, pos: [...sp[i]], d }
    }
  })
  return best
}

function splitAt(r, at, pin) {
  const sp = r.spans[at.span]
  r.spans.splice(at.span, 1, sp.slice(0, at.index + 1), sp.slice(at.index))
  r.pins.splice(at.span + 1, 0, pin)
}

function removePin(r, k) {
  const merged = [...r.spans[k - 1], ...r.spans[k].slice(1)]
  r.spans.splice(k - 1, 2, merged)
  r.pins.splice(k, 1)
}

/** Grab the ribbon near (x, z): unhook a stake there, or (unless stakesOnly) take hold of the band. */
export function grab(r, x, z, radius = 0.95, { stakesOnly = false } = {}) {
  if (grabPin(r)) return false
  const k = r.pins.findIndex((p) => p.kind === 'stake' && Math.hypot(p.pos[0] - x, p.pos[1] - z) < radius)
  if (k > 0) {
    r.pins[k] = { kind: 'grab', pos: [...r.pins[k].pos], from: r.pins[k].id }
    return 'unhook'
  }
  if (stakesOnly) return false
  const at = nearestOnRibbon(r, x, z)
  if (!at || at.d > radius) return false
  splitAt(r, at, { kind: 'grab', pos: at.pos })
  return 'grab'
}

/** Let go: hook onto a free stake nearby, or let the band relax there. */
export function release(r, stakes) {
  const k = r.pins.findIndex((p) => p.kind === 'grab')
  if (k < 0) return null
  const p = r.pins[k].pos
  const used = new Set(hookedStakes(r))
  const st = (stakes || []).find((s) => !used.has(s.id) && Math.hypot(s.pos[0] - p[0], s.pos[1] - p[1]) < 0.6)
  if (st) {
    r.pins[k] = { kind: 'stake', id: st.id, pos: [...st.pos] }
    return 'hook'
  }
  removePin(r, k)
  return 'release'
}

/** A Snapper clips the band near (x, z). */
export function cut(r, x, z) {
  const at = nearestOnRibbon(r, x, z, { skipPins: 0.45 })
  if (!at || at.d > 0.6) return null
  splitAt(r, at, { kind: 'cut', pos: at.pos })
  return at.pos
}

/** Re-tie a cut near (x, z). */
export function retie(r, x, z, radius = 1.1) {
  const k = r.pins.findIndex((p) => p.kind === 'cut' && Math.hypot(p.pos[0] - x, p.pos[1] - z) < radius)
  if (k < 0) return false
  removePin(r, k)
  return true
}

/** A point somewhere along the band for a Snapper to go for. */
export function snapperTarget(r, seed) {
  const pts = ribbonPoints(r)
  const i = Math.floor(pts.length * (0.25 + 0.5 * ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1))
  return pts[Math.max(1, Math.min(pts.length - 2, i))]
}

/** The shrine's target path: end post → stakes in order → end post. */
export function targetPath(ribbonDef, target, stakes) {
  const byId = Object.fromEntries((stakes || []).map((s) => [s.id, s.pos]))
  return [ribbonDef.a, ...target.stakes.map((id) => byId[id]), ribbonDef.b]
}

/**
 * Does the ribbon match the target, up to homotopy rel its pins?
 * Same stakes in the same order, no cut, not being held, and the ribbon followed by
 * the target backwards winds zero times around every pool.
 */
export function matchesTarget(r, ribbonDef, target, stakes, flats) {
  if (hasCut(r) || grabPin(r)) return { ok: false, why: hasCut(r) ? 'cut' : 'held' }
  const hooked = hookedStakes(r)
  if (hooked.join() !== target.stakes.join()) return { ok: false, why: 'stakes' }
  const path = targetPath(ribbonDef, target, stakes)
  const back = resample(path, Math.max(8, Math.round(polyLength(path) / SPACING))).reverse()
  const loop = [...ribbonPoints(r), ...back.slice(1, -1)]
  for (const pool of flats.pools) if (Math.abs(winding(loop, pool.c)) > 0.5) return { ok: false, why: 'side', pool: pool.id }
  return { ok: true }
}

/** Copy of the ribbon's shape (for the Tide Glass recording). */
export const snapshot = (r) => ({ pieces: ribbonPieces(r).map((p) => p.map((q) => [q[0], q[1]])), pins: r.pins.map((p) => ({ kind: p.kind, pos: [...p.pos] })) })

// ---------------------------------------------------------------- scripted homotopies

const smoothstep = (x) => x * x * (3 - 2 * x)

/** Points of a path s ↦ H(s, t) for fixed t. */
export function sampleMovie(H, t, n = 72) {
  return Array.from({ length: n }, (_, i) => H(i / (n - 1), t))
}

/** The tide at the Tide Line: a homotopy rel endpoints from the straight path back to itself. */
export function tideHomotopy(a, b) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  const nx = -dz / L
  const nz = dx / L
  return (s, t) => {
    const d = 1.7 * Math.sin(Math.PI * s) * Math.sin(2 * Math.PI * t) + 0.9 * Math.sin(2 * Math.PI * s) * Math.sin(Math.PI * t)
    return [a[0] + dx * s + nx * d, a[1] + dz * s + nz * d]
  }
}

/** Distance from point m to the frame H(·, t). */
export function frameDistance(H, t, m) {
  let best = Infinity
  for (let i = 0; i <= 96; i++) {
    const p = H(i / 96, t)
    best = Math.min(best, Math.hypot(p[0] - m[0], p[1] - m[1]))
  }
  return best
}

/** Null's first 'deformation': smooth until frame `tear`, then the ribbon jumps to a different shape. */
export function jumpMovie(a, b, tear) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  const nx = -dz / L
  const nz = dx / L
  return (s, t) => {
    const d = t < tear ? 1.5 * Math.sin(Math.PI * s) * Math.sin((Math.PI / 2) * (t / tear)) : -1.3 * Math.sin(2 * Math.PI * s) * (1 - smoothstep((t - tear) / (1 - tear)))
    return [a[0] + dx * s + nx * d, a[1] + dz * s + nz * d]
  }
}

/** Null's second: the loop around his pool, shrunk toward his post by scaling — smooth, but it crosses the water. */
export function loopMovie(post, center, radius) {
  const th0 = Math.atan2(post[1] - center[1], post[0] - center[0])
  return (s, t) => {
    const th = th0 + 2 * Math.PI * s
    const px = center[0] + radius * Math.cos(th)
    const pz = center[1] + radius * Math.sin(th)
    const k = 1 - t
    return [post[0] + (px - post[0]) * k, post[1] + (pz - post[1]) * k]
  }
}

/** First frame at which a movie's path touches water (or 1 if it never does). */
export function firstWetFrame(H, flats, steps = 400) {
  for (let k = 0; k <= steps; k++) {
    const t = k / steps
    for (let i = 0; i <= 120; i++) {
      const p = H(i / 120, t)
      if (flats.inPool(p[0], p[1])) return t
    }
  }
  return 1
}

// ---------------------------------------------------------------- loops (0-3)

/**
 * A loop: a ribbon that starts and ends at the same post, pinned to stakes along the
 * way. Unhook every stake and the band relaxes: on solid ground it shrinks to the post
 * (the loop is null-homotopic), around a hole it catches and can't.
 */
export function makeLoopRibbon({ post, stakes }) {
  const pins = [{ kind: 'post', pos: [...post] }, ...stakes.map((s) => ({ kind: 'stake', id: s.id, pos: [...s.pos] })), { kind: 'post', pos: [...post] }]
  const spans = []
  for (let i = 0; i + 1 < pins.length; i++) {
    const a = pins[i].pos
    const b = pins[i + 1].pos
    spans.push(resample([a, b], Math.max(6, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / SPACING))))
  }
  return { pins, spans }
}

/** Has the loop shrunk to (nearly) a point at its post? */
export const loopShrunk = (r) => !r.pins.some((p) => p.kind === 'stake' || p.kind === 'grab') && ribbonLength(r) < 0.35

/**
 * A ribbon environment from a reef site (shape in the site's local units): solid
 * ground is the site's `add` parts, and its `sub` circles are the holes a band must
 * wrap around. Same interface as makeFlats.
 */
export function makeSiteEnv(def) {
  const inAdd = (x, z) =>
    def.add.some((p) => (p.type === 'circle' ? (x - p.cx) ** 2 + (z - p.cz) ** 2 <= p.r * p.r : x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1))
  const pools = (def.sub || []).filter((p) => p.type === 'circle').map((p, i) => ({ id: `hole${i}`, c: [p.cx, p.cz], r: p.r }))
  const inPool = (x, z, pad = 0) => pools.find((p) => Math.hypot(x - p.c[0], z - p.c[1]) < p.r + pad) || null
  return { pools, inPoly: inAdd, inPool, inside: (x, z) => inAdd(x, z) && !inPool(x, z) }
}
