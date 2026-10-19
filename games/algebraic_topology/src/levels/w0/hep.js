/**
 * The Cylinder Works (0-B): the homotopy extension property, cell by cell. Hatcher,
 * Algebraic Topology, Chapter 0, pp. 14–15: a pair (X, A) has the HEP if every map
 * X × {0} → Y together with a homotopy A × I → Y extends to X × I → Y; Proposition 0.16
 * proves CW pairs have it by extending over X × I one cell at a time — each cell's column
 * eⁿ × I can be filled once the motion on its boundary (eⁿ × {0} ∪ ∂eⁿ × I) is decided,
 * because Dⁿ × I retracts onto Dⁿ × {0} ∪ ∂Dⁿ × I.
 *
 * A complex here is { verts: [[x, z]], edges: [[u, v]], faces: [[v0, v1, …]] } (faces by
 * their boundary cycle of vertices) with A = { verts, edges } and A's motion: each A vertex
 * drifts by `move[v]` over time, and A's edges bow out by `bow` at the end.
 * Cells are ids 'v3', 'e1', 'f0'.
 */

const smooth = (x) => x * x * (3 - 2 * x)

/** The edge index joining u and v (either way round). */
export const edgeOf = (cx, u, v) => cx.edges.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u))

/** A cell's boundary cells (all of them, down to the points). */
export function boundary(cx, id) {
  const k = id[0]
  const i = Number(id.slice(1))
  if (k === 'v') return []
  if (k === 'e') return cx.edges[i].map((v) => 'v' + v)
  const cyc = cx.faces[i]
  const out = cyc.map((v) => 'v' + v)
  cyc.forEach((v, j) => out.push('e' + edgeOf(cx, v, cyc[(j + 1) % cyc.length])))
  return out
}

export const inA = (cx, id) => (id[0] === 'v' ? cx.A.verts.includes(Number(id.slice(1))) : id[0] === 'e' ? cx.A.edges.includes(Number(id.slice(1))) : false)

export function allCells(cx) {
  return [...cx.verts.map((_, i) => 'v' + i), ...cx.edges.map((_, i) => 'e' + i), ...cx.faces.map((_, i) => 'f' + i)]
}

/** Can the column over `id` be filled now? → { ok, missing: [ids] } */
export function canFill(cx, filled, id) {
  if (inA(cx, id)) return { ok: false, given: true, missing: [] }
  if (filled.includes(id)) return { ok: false, done: true, missing: [] }
  const missing = boundary(cx, id).filter((b) => !inA(cx, b) && !filled.includes(b))
  return { ok: missing.length === 0, missing }
}

export const cellName = (id) => ({ v: 'point', e: 'edge', f: 'disk' })[id[0]]

/** Where vertex v is at time t (A vertices follow their motion; filled ones stay put). */
export function vertAt(cx, v, t) {
  const p = cx.verts[v]
  const m = cx.A.verts.includes(v) ? cx.move?.[v] : null
  if (!m) return p
  const k = smooth(t)
  return [p[0] + m[0] * k, p[1] + m[1] * k]
}

/** A point on edge e at parameter s, time t: between its ends; A's edges bow out. */
export function edgeAt(cx, e, s, t) {
  const [u, v] = cx.edges[e]
  const a = vertAt(cx, u, t)
  const b = vertAt(cx, v, t)
  let x = a[0] + (b[0] - a[0]) * s
  let z = a[1] + (b[1] - a[1]) * s
  if (cx.A.edges.includes(e) && cx.bow) {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const l = Math.hypot(dx, dz) || 1
    const w = cx.bow * smooth(t) * Math.sin(Math.PI * s)
    x += (-dz / l) * w
    z += (dx / l) * w
  }
  return [x, z]
}

/** The boundary of face f at time t, as a closed polyline. */
export function faceRim(cx, f, t, n = 10) {
  const cyc = cx.faces[f]
  const out = []
  cyc.forEach((v, j) => {
    const w = cyc[(j + 1) % cyc.length]
    const e = edgeOf(cx, v, w)
    const fwd = cx.edges[e][0] === v
    for (let i = 0; i < n; i++) out.push(edgeAt(cx, e, fwd ? i / n : 1 - i / n, t))
  })
  return out
}

/** Hit-test the floor (X × {0}) — points first, then edges, then disks. */
export function cellAt(cx, x, z) {
  let best = null
  cx.verts.forEach((p, i) => {
    const d = Math.hypot(x - p[0], z - p[1])
    if (d < 0.7 && (!best || d < best.d)) best = { id: 'v' + i, d }
  })
  if (best) return best.id
  cx.edges.forEach(([u, v], i) => {
    const a = cx.verts[u]
    const b = cx.verts[v]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const l2 = dx * dx + dz * dz
    const s = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2))
    const d = Math.hypot(x - a[0] - s * dx, z - a[1] - s * dz)
    if (d < 0.5 && (!best || d < best.d)) best = { id: 'e' + i, d }
  })
  if (best) return best.id
  const f = cx.faces.findIndex((cyc) => pointInPoly(x, z, cyc.map((v) => cx.verts[v])))
  return f >= 0 ? 'f' + f : null
}

function pointInPoly(x, z, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
