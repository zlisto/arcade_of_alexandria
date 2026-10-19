/**
 * Explicit maps between a figure-eight X and a theta Y (0-3's lesson and movie), so
 * the threads on screen are real maps, not decoration.
 *
 * X: two circles (radius r) meeting at the crossing c. A point of X is (loop, a) with
 *    loop ∈ {L, R} and a ∈ [0, 1) the fraction of the way around, starting at c.
 * Y: an oval with a bar down its middle (top vertex T, bottom vertex B, bar midpoint M).
 *    Its left cycle runs M → T (up the bar), T → B (down the left arc), B → M (up the
 *    bar); the right cycle likewise with the right arc.
 *
 *   f : X → Y   sends loop L once around Y's left cycle and loop R around the right
 *               cycle, at constant speed, with c ↦ M.
 *   g : Y → X   collapses the bar to the crossing; the left arc wraps once around L,
 *               the right arc around R.
 *
 * g∘f sends each loop of X once around itself, just pausing at c while f is on the
 * bar: a reparametrization, which slides back to the identity (g∘f ≃ 1). Likewise
 * f∘g ≃ 1 by sliding the bar's points back out along the bar.
 */

export function eight(center = [0, 0], r = 0.9) {
  const [cx, cz] = center
  const cL = [cx - r, cz]
  const cR = [cx + r, cz]
  /** a point of X, from (loop, a) */
  const at = (loop, a) => {
    const th = 2 * Math.PI * a
    // L starts at the crossing (its rightmost point) and runs counterclockwise; R mirrors it
    return loop === 'L' ? [cL[0] + r * Math.cos(th), cL[1] - r * Math.sin(th)] : [cR[0] - r * Math.cos(th), cR[1] - r * Math.sin(th)]
  }
  const loop = (which, n = 64) => Array.from({ length: n + 1 }, (_, i) => at(which, i / n))
  return { at, loop, crossing: [cx, cz] }
}

export function theta(center = [0, 0], rx = 1.5, rz = 1.1) {
  const [cx, cz] = center
  const T = [cx, cz - rz]
  const B = [cx, cz + rz]
  const M = [cx, cz]
  // u: 0 at T, 1 at B, around the left (side −1) or right (side +1) half of the oval
  const arc = (side, u) => [cx + side * rx * Math.sin(Math.PI * u), cz - rz * Math.cos(Math.PI * u)]
  const barLen = rz
  const arcLen = (Math.PI * (rx + rz)) / 2 // rough half-perimeter
  const cycleLen = 2 * barLen + arcLen
  /** a point on the left (side −1) or right (+1) cycle at fraction s ∈ [0,1): M → T → arc → B → M */
  const cycle = (side, s) => {
    const d = s * cycleLen
    if (d < barLen) return { pt: [cx, cz - d], onBar: true, u: null }
    if (d < barLen + arcLen) {
      const u = (d - barLen) / arcLen
      return { pt: arc(side, u), onBar: false, u }
    }
    const e = d - barLen - arcLen
    return { pt: [cx, cz + rz - e], onBar: true, u: null }
  }
  const outline = (n = 80) => [...Array.from({ length: n + 1 }, (_, i) => arc(-1, i / n)), ...Array.from({ length: n + 1 }, (_, i) => arc(1, 1 - i / n))]
  const bar = [T, B]
  return { arc, cycle, outline, bar, T, B, M }
}

/** f : X → Y on (loop, a). */
export function f(Y, loop, a) {
  return Y.cycle(loop === 'L' ? -1 : 1, a)
}

/** g : Y → X on a point of Y's cycle (as returned by f): the bar goes to the crossing. */
export function gOf(X, loop, yPoint) {
  if (yPoint.onBar) return X.crossing
  return X.at(loop, yPoint.u)
}

/** An arcing thread between two ground points (for drawing a map's value), lifted to height h. */
export function thread(p, q, h = 1.2, n = 24) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n
    return [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, 0.1 + Math.sin(Math.PI * s) * h]
  })
}
