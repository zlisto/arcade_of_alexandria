/**
 * World 1 · Level 4 "No Way Out" — Brouwer's Basin math (pure, no React).
 *
 * Hatcher Ch. 1: no retraction D² → S¹ because π₁(D²) = 0 and π₁(S¹) ≅ ℤ;
 * winding number detects loops that cannot shrink; fixed points via index of a vector field;
 * roots via winding of z ↦ zⁿ on a circle; Borsuk–Ulam on S² (antipodal readings match).
 */

/** Signed winding of a closed polyline around `center`, in full turns (integer for simple loops). */
export function windingIndex(loop, center) {
  let w = 0
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i]
    const q = loop[(i + 1) % loop.length]
    const a = Math.atan2(p[1] - center[1], p[0] - center[0])
    const b = Math.atan2(q[1] - center[1], q[0] - center[0])
    let d = b - a
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    w += d
  }
  return w / (2 * Math.PI)
}

/** Sample a circle as a closed loop (counter-clockwise). */
export function circleLoop(cx, cz, r, n = 64) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)]
  })
}

/**
 * Track laps on a circular rim: call `update(x,z)` while Gyroid walks the ring.
 * Returns `{ event: 'done', winding }` after one full turn (|winding| ≥ 0.92).
 */
export function makeRimTracker(center, radius, band = 0.75) {
  let prev = null
  let turns = 0
  let armed = false
  const update = (x, z) => {
    const dx = x - center[0]
    const dz = z - center[1]
    const d = Math.hypot(dx, dz)
    if (Math.abs(d - radius) > band) {
      if (armed && Math.abs(turns) >= 0.92) {
        const w = Math.round(turns)
        prev = null
        turns = 0
        armed = false
        return { event: 'done', winding: w }
      }
      prev = null
      return null
    }
    armed = true
    const a = Math.atan2(dz, dx)
    if (prev != null) {
      let da = a - prev
      if (da > Math.PI) da -= 2 * Math.PI
      if (da < -Math.PI) da += 2 * Math.PI
      turns += da / (2 * Math.PI)
    }
    prev = a
    if (Math.abs(turns) >= 0.92) {
      const w = Math.round(turns)
      prev = null
      turns = 0
      armed = false
      return { event: 'done', winding: w }
    }
    return null
  }
  const progress = () => Math.min(1, Math.abs(turns))
  const reset = () => {
    prev = null
    turns = 0
    armed = false
  }
  return { update, progress, reset, turns: () => turns }
}

/** A contractible loop in the disk (shrinks to the center). */
export function innerShrinkLoop(cx, cz, r0, r1, n = 48) {
  return Array.from({ length: n }, (_, i) => {
    const u = i / n
    const r = r0 + (r1 - r0) * u
    const a = u * Math.PI * 4
    return [cx + r * Math.cos(a) * (1 - u), cz + r * Math.sin(a) * (1 - u)]
  })
}

/** Retractor proof: rim winding must stay 1 while inner loop winding goes to 0 — impossible for a retraction. */
export function retractionImpossible(rimWinding, innerWinding) {
  return rimWinding !== 0 && Math.abs(innerWinding) < 0.15 && rimWinding !== innerWinding
}

/** Arrow field: angle (radians) at local (x,z). `kind: 'swirl' | 'poly'`. */
export function fieldAngle(kind, x, z, params) {
  if (kind === 'swirl') {
    const [fx, fz] = params.focus
    const dx = fx - x
    const dz = fz - z
    return Math.atan2(dz, dx) + Math.PI / 2
  }
  if (kind === 'poly') {
    const { degree, scale = 1 } = params
    const zc = [x * scale, z * scale]
    const r2 = zc[0] ** 2 + zc[1] ** 2
    if (r2 < 1e-8) return 0
    return degree * Math.atan2(zc[1], zc[0])
  }
  return 0
}

/** Winding index of $z^{\text{degree}}$ on a closed boundary (argument principle). */
export function boundaryPolyIndex(boundary, degree, scale = 1) {
  let sum = 0
  for (let i = 0; i < boundary.length; i++) {
    const p = boundary[i]
    const q = boundary[(i + 1) % boundary.length]
    const a = Math.atan2(p[1] * scale, p[0] * scale)
    const b = Math.atan2(q[1] * scale, q[0] * scale)
    let d = b - a
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    sum += d * degree
  }
  return Math.round(sum / (2 * Math.PI))
}

/** Index of a planar field on a simple closed boundary (winding of the direction along the loop). */
export function boundaryIndex(boundary, fieldAt) {
  let idx = 0
  for (let i = 0; i < boundary.length; i++) {
    const p = boundary[i]
    const q = boundary[(i + 1) % boundary.length]
    const a0 = fieldAt(p[0], p[1])
    const a1 = fieldAt(q[0], q[1])
    let d = a1 - a0
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    idx += d
  }
  return Math.round(idx / (2 * Math.PI))
}

/** Nearest tile whose arrow magnitude is below `tol` (a still point). */
export function findStillTile(tiles, fieldAt, tol = 0.22) {
  let best = null
  for (const t of tiles) {
    const ang = fieldAt(t.x, t.z)
    const fx = Math.cos(ang)
    const fz = Math.sin(ang)
    const mag = Math.hypot(fx, fz)
    const d = Math.hypot(t.x - (t.stillX ?? t.x), t.z - (t.stillZ ?? t.z))
    const score = d + mag
    if (score < tol && (!best || score < best.score)) best = { ...t, score }
  }
  return best
}

/** Roots of z^degree − 1 in the plane (unit roots), scaled. */
export function unitRoots(degree, scale = 2.2) {
  return Array.from({ length: degree }, (_, k) => {
    const a = (2 * Math.PI * k) / degree
    return { x: scale * Math.cos(a), z: scale * Math.sin(a), id: k }
  })
}

/** On S² (local chart), antipode of (x,z) on a sphere cap of radius `r`. */
export function antipode(x, z, r) {
  const d = Math.hypot(x, z)
  if (d < 1e-6) return [0, 0]
  const u = Math.min(1, d / r)
  return [(-x / d) * r * u, (-z / d) * r * u]
}

/** Two stations match if their reading pairs are equal (order-insensitive). */
export function readingsMatch(a, b) {
  const sa = [...a].sort().join(',')
  const sb = [...b].sort().join(',')
  return sa === sb
}

/** Borsuk–Ulam check: some antipodal pair on `stations` has equal readings. */
export function hasAntipodalMatch(stations, r) {
  for (const s of stations) {
    const [ax, az] = antipode(s.x, s.z, r)
    const mate = stations.find((t) => t.id !== s.id && Math.hypot(t.x - ax, t.z - az) < 0.55)
    if (mate && readingsMatch(s.readings, mate.readings)) return { a: s, b: mate }
  }
  return null
}
