/**
 * Winding numbers on a circle (World 1 · Level 3). Hatcher, Algebraic Topology, Ch. 1:
 * the universal cover ℝ → S¹, path lifting, homotopy lifting, π₁(S¹) ≅ ℤ.
 *
 * Pure geometry — no React. Tracks angle on a ring road and turns closed loops into
 * integer winding numbers; concatenation adds, reversal negates.
 */

const TAU = Math.PI * 2

/** Angle in radians, −π .. π, from center to (x, z). */
export function angleAt(x, z, center = [0, 0]) {
  return Math.atan2(z - center[1], x - center[0])
}

/** Shortest signed angle from a to b. */
export function angleDelta(a, b) {
  let d = b - a
  while (d > Math.PI) d -= TAU
  while (d < -Math.PI) d += TAU
  return d
}

/** Integer winding from total radians (handles negative laps). */
export function windingFromRadians(total) {
  return Math.round(total / TAU)
}

export function addWindings(a, b) {
  return a + b
}

export function negateWinding(w) {
  return -w
}

/** Homotopy invariance: only the net angle change mod 2π matters for the floor. */
export function sameWinding(radA, radB) {
  return windingFromRadians(radA) === windingFromRadians(radB)
}

/**
 * Tracks laps on an annular ring road. Call `update(x, z)` while walking.
 * Returns events:
 *   { event: 'lap', winding, total } — one full counter-clockwise lap (winding +1)
 *   { event: 'lap', winding: -1, total } — clockwise
 *   { event: 'leave' } / { event: 'enter' }
 *   null otherwise
 */
export function makeRingTracker(center, rInner, rOuter, opts = {}) {
  const minLap = opts.minLap ?? 0.82 * TAU
  let on = false
  let last = null
  let total = 0
  let enteredAt = null

  const onRing = (x, z) => {
    const d = Math.hypot(x - center[0], z - center[1])
    return d >= rInner && d <= rOuter
  }

  const reset = () => {
    on = false
    last = null
    total = 0
    enteredAt = null
  }

  const update = (x, z) => {
    const inside = onRing(x, z)
    if (!inside) {
      if (on) {
        on = false
        last = null
        return { event: 'leave' }
      }
      return null
    }
    const a = angleAt(x, z, center)
    if (!on) {
      on = true
      last = a
      enteredAt = a
      return { event: 'enter' }
    }
    const da = angleDelta(last, a)
    if (Math.abs(da) < 0.02) return null
    total += da
    last = a
    if (Math.abs(total) >= minLap) {
      const w = windingFromRadians(total)
      const ev = { event: 'lap', winding: w, total }
      total = 0
      enteredAt = a
      return ev
    }
    return null
  }

  const progress = () => (on ? Math.min(1, Math.abs(total) / TAU) : 0)
  const radians = () => total
  return { update, reset, progress, radians, onRing, onRingNow: (x, z) => onRing(x, z) && on }
}

/**
 * Deformed loop samples for Tide Glass demo: same winding, different shape.
 * t ∈ [0,1] homotopy between two closed polylines on the ring (by angle).
 */
export function homotopyLoop(center, r, t, wiggle = 0.35) {
  const n = 64
  const pts = []
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * TAU
    const wob = wiggle * Math.sin(u * 3 + t * TAU) * (1 - t * 0.3)
    const rad = r + wob * (0.5 + 0.5 * Math.sin(t * Math.PI))
    pts.push([center[0] + rad * Math.cos(u), center[1] + rad * Math.sin(u)])
  }
  return pts
}

/** Helix lift height for winding w and pitch (world units per turn). */
export function helixHeight(w, pitch = 2.4) {
  return w * pitch
}

/** Helix (x, y, z) for display: angle θ on ring, height from winding progress. */
export function helixPoint(center, ringR, theta, height, helixR = 1.1) {
  return [
    center[0] + helixR * Math.cos(theta),
    height,
    center[1] + helixR * Math.sin(theta),
  ]
}
