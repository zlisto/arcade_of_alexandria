/**
 * Belt-road trackers for the Winding Cord: detect walking on a circular track and count laps.
 */

const ON = 0.85

function nearestOnCircle(x, z, cx, cz, r) {
  const dx = x - cx
  const dz = z - cz
  const d = Math.hypot(dx, dz)
  const ang = Math.atan2(dz, dx)
  const px = cx + Math.cos(ang) * r
  const pz = cz + Math.sin(ang) * r
  return { ang, d: Math.hypot(x - px, z - pz), on: Math.abs(d - r) < ON }
}

/**
 * Single circle belt. Returns { on, laps, reset }.
 * A full lap is detected when the angle accumulates past ~one revolution.
 */
export function makeCircleTracker(cx, cz, radius) {
  let lastAng = null
  let laps = 0
  let accum = 0

  const tick = (x, z) => {
    const m = nearestOnCircle(x, z, cx, cz, radius)
    if (!m.on) {
      lastAng = null
      return { on: false, laps }
    }
    if (lastAng == null) {
      lastAng = m.ang
      return { on: true, laps }
    }
    let d = m.ang - lastAng
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    accum += d
    lastAng = m.ang
    if (Math.abs(accum) >= Math.PI * 1.85) {
      laps += accum > 0 ? 1 : -1
      accum = 0
    }
    return { on: true, laps }
  }

  return {
    tick,
    reset: () => {
      laps = 0
      accum = 0
      lastAng = null
    },
    laps: () => laps,
  }
}

/**
 * Two belts on one deck (torus terrace): outer tube circle and inner hole circle.
 */
export function makeTorusTracker(tube, hole) {
  const tubeTr = makeCircleTracker(tube.cx, tube.cz, tube.r)
  const holeTr = makeCircleTracker(hole.cx, hole.cz, hole.r)

  const tick = (x, z) => {
    const t = nearestOnCircle(x, z, tube.cx, tube.cz, tube.r)
    const h = nearestOnCircle(x, z, hole.cx, hole.cz, hole.r)
    const pick = t.on && (!h.on || t.d <= h.d) ? 'tube' : h.on ? 'hole' : null
    if (pick === 'tube') tubeTr.tick(x, z)
    else if (pick === 'hole') holeTr.tick(x, z)
    return {
      on: !!pick,
      road: pick,
      pair: [tubeTr.laps(), holeTr.laps()],
    }
  }

  return {
    tick,
    reset: () => {
      tubeTr.reset()
      holeTr.reset()
    },
    pair: () => [tubeTr.laps(), holeTr.laps()],
  }
}
