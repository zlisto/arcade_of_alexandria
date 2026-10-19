/**
 * Path homotopy rel fixed endpoints for Endpoint Gardens (World 1 · Level 1).
 * Routes are polylines in the plane minus circular hedge disks; gates are fixed.
 * Hatcher, Algebraic Topology, Chapter 1, pp. 25–26 (path homotopy, rel a subset).
 */

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

export function sameEndpoints(r, gates, tol = 0.2) {
  if (!r?.length || r.length < 2) return false
  const a = gates.a
  const b = gates.b
  const near = (p, q) => dist(p, q) <= tol
  return (near(r[0], a) && near(r[r.length - 1], b)) || (near(r[0], b) && near(r[r.length - 1], a))
}

/** Closed loop: route r from A→B followed by reference ref from B→A. */
export function loopDifference(r, ref) {
  const back = ref.slice().reverse()
  if (back.length && dist(back[0], r[r.length - 1]) < 0.01) back.shift()
  return [...r, ...back]
}

/** Signed winding of a closed polyline around c, in full turns. */
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

/** Every sample stays outside hedge disks (with pad). */
export function staysInDomain(pts, hedges, pad = 0.08) {
  for (const p of pts) {
    for (const h of hedges) {
      if (dist(p, h.c) < h.r + pad) return false
    }
  }
  return true
}

/**
 * Two routes A→B are homotopic rel {A,B} in X = (convex lawn minus hedges)
 * iff the difference loop winds zero around every hedge.
 */
export function homotopicRelEndpoints(r1, r2, env) {
  if (!sameEndpoints(r1, env.gates)) return false
  if (!sameEndpoints(r2, env.gates)) return false
  if (!staysInDomain(r1, env.hedges) || !staysInDomain(r2, env.hedges)) return false
  if (!env.hedges.length) return true
  const loop = loopDifference(r1, r2)
  return env.hedges.every((h) => Math.abs(winding(loop, h.c)) < 0.05)
}

/** Straight-line homotopy sample at parameter t ∈ [0,1]. */
export function linearHomotopy(r1, r2, t) {
  const n = Math.max(r1.length, r2.length, 8)
  const a = resample(r1, n)
  const b = resample(r2, n)
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t])
}

/** Resample by arc length to n points. */
export function resample(pts, n) {
  if (pts.length < 2) return Array.from({ length: n }, () => [...pts[0]])
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  const L = cum[cum.length - 1]
  const out = []
  let j = 1
  for (let k = 0; k < n; k++) {
    const s = (L * k) / (n - 1 || 1)
    while (j < pts.length - 1 && cum[j] < s) j++
    const seg = cum[j] - cum[j - 1] || 1
    const u = Math.min(1, Math.max(0, (s - cum[j - 1]) / seg))
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u])
  }
  return out
}

/** Reparametrize by arc-length speed scale (same image, different parametrization). */
export function reparametrize(pts, density = 1.4) {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]))
  const L = cum[cum.length - 1]
  const n = Math.max(6, Math.round((pts.length - 1) * density))
  const out = []
  for (let k = 0; k < n; k++) {
    const s = (L * k) / (n - 1)
    let j = 1
    while (j < pts.length - 1 && cum[j] < s) j++
    const seg = cum[j] - cum[j - 1] || 1
    const u = Math.min(1, Math.max(0, (s - cum[j - 1]) / seg))
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u])
  }
  return out
}

/** Concatenate A→B with B→C (must meet at gates.b). */
export function concat(rAB, rBC, gates) {
  const mid = gates.b
  const tol = 0.25
  let ab = rAB
  let bc = rBC
  if (dist(ab[ab.length - 1], mid) > tol) throw new Error('concat: first route must end at middle gate')
  if (dist(bc[0], mid) > tol) {
    if (dist(bc[bc.length - 1], mid) <= tol) bc = bc.slice().reverse()
    else throw new Error('concat: second route must start at middle gate')
  }
  const tail = bc.slice(1)
  return [...ab, ...tail]
}

/** Integer class label: 0 on convex lawn; with one hedge, 0 = left/canonical, 1 = right. */
export function routeClass(route, env) {
  if (!env.hedges.length) return 0
  const ref = env.canonical || env.routes?.[0]
  if (!ref) return 0
  return homotopicRelEndpoints(route, ref, env) ? 0 : 1
}

/** Ledger partition check: every id maps to a class and homotopy agrees within bins. */
export function validateLedger(assignments, routesById, env) {
  const ids = Object.keys(routesById)
  if (ids.some((id) => assignments[id] == null)) return { ok: false, reason: 'incomplete' }
  if (!env.hedges.length) {
    const vals = ids.map((id) => assignments[id])
    const same = vals.every((v) => v === vals[0])
    return same ? { ok: true, classes: 1 } : { ok: false, reason: 'mixed on convex lawn' }
  }
  const byClass = {}
  for (const [id, cls] of Object.entries(assignments)) {
    const r = routesById[id]
    if (!r) return { ok: false, reason: 'missing route' }
    const computed = routeClass(r, env)
    if (cls !== computed) return { ok: false, reason: `route ${id} wrong bin`, id }
    if (!byClass[cls]) byClass[cls] = []
    byClass[cls].push(id)
    for (const other of byClass[cls]) {
      if (other === id) continue
      if (!homotopicRelEndpoints(r, routesById[other], env)) return { ok: false, reason: 'mixed classes', id }
    }
  }
  return { ok: true, classes: Object.keys(byClass).length }
}

/** Chaining: class of concat depends only on classes of pieces (one hedge → XOR). */
export function classOfChain(classAB, classBC, env) {
  if (!env.hedges.length) return 0
  return (classAB + classBC) % 2
}

export function classOfChainRoutes(rAB, rBC, env) {
  const mid = env.gates.b
  const end = env.gates.c ?? env.gates.b
  const whole = concat(rAB, rBC, { a: env.gates.a, b: mid })
  const fullEnv = { gates: { a: env.gates.a, b: end }, hedges: env.hedges, canonical: env.canonical }
  return routeClass(whole, fullEnv)
}
