/**
 * Level 0-1 math: deformation retractions of a reef X onto a hand-drawn spine A.
 *
 * Hatcher (Ch. 0, pp. 1–2) shrinks a thick letter onto a thin one by sliding each
 * point along a path into the thin letter, with the thin letter fixed. The thick
 * letter is a mapping cylinder: a collar between its outer edge and the spine.
 *
 * That is exactly the test we run. The spine cuts X into regions (the components of
 * X − A). X deformation retracts onto A this way when
 *   - A is connected, and
 *   - every region touches exactly one "shore" of X — the outer edge or one hole —
 *     so each region is a collar between that shore and the spine.
 * A region touching two shores means a hole isn't wrapped by the spine (points there
 * are pulled two ways and tear); a region touching no shore is a solid patch fenced
 * in by spine, which can't be squashed onto its fence without tearing.
 *
 * For each collar we solve Laplace's equation (φ = 1 on the shore, 0 on the spine)
 * and slide points down the gradient of φ. In a two-boundary region a harmonic φ has
 * no critical points, so flow lines never split: the slide is continuous, starts at
 * the identity, ends on A, and never moves A. Each point moves at constant speed
 * along its flow line, reaching the spine at t = 1.
 *
 * For invalid spines we still animate a slide (the same flow, or a push out from the
 * middle of a fenced-in patch) so the player sees where it tears.
 */

// ---------------------------------------------------------------- shapes

const inPrim = (p, x, z) => {
  if (p.type === 'rect') return x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1
  if (p.type === 'circle') return (x - p.cx) ** 2 + (z - p.cz) ** 2 <= p.r * p.r
  return false
}

export function makeShape(def) {
  const inside = (x, z) => def.add.some((p) => inPrim(p, x, z)) && !(def.sub || []).some((p) => inPrim(p, x, z))
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  for (const p of def.add) {
    const [x0, x1, z0, z1] = p.type === 'rect' ? [p.x0, p.x1, p.z0, p.z1] : [p.cx - p.r, p.cx + p.r, p.cz - p.r, p.cz + p.r]
    b.minX = Math.min(b.minX, x0)
    b.maxX = Math.max(b.maxX, x1)
    b.minZ = Math.min(b.minZ, z0)
    b.maxZ = Math.max(b.maxZ, z1)
  }
  return { inside, bounds: b }
}

/** Grid samples of X (cell centers), the grid itself, and right/down neighbor pairs. */
export function sampleShape(shape, h = 0.14) {
  const { minX, maxX, minZ, maxZ } = shape.bounds
  const nx = Math.ceil((maxX - minX) / h)
  const nz = Math.ceil((maxZ - minZ) / h)
  const index = new Int32Array(nx * nz).fill(-1)
  const xs = []
  const zs = []
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = minX + (i + 0.5) * h
      const z = minZ + (j + 0.5) * h
      if (shape.inside(x, z)) {
        index[j * nx + i] = xs.length
        xs.push(x)
        zs.push(z)
      }
    }
  }
  const pairs = []
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = index[j * nx + i]
      if (a < 0) continue
      if (i + 1 < nx && index[j * nx + i + 1] >= 0) pairs.push(a, index[j * nx + i + 1])
      if (j + 1 < nz && index[(j + 1) * nx + i] >= 0) pairs.push(a, index[(j + 1) * nx + i])
    }
  }
  return { h, nx, nz, minX, minZ, index, count: xs.length, x: Float32Array.from(xs), z: Float32Array.from(zs), pairs: Int32Array.from(pairs) }
}

// ---------------------------------------------------------------- spine

/** Smooth a hand-drawn stroke (Chaikin) and resample it evenly. */
export function cleanStroke(pts, step = 0.08) {
  if (pts.length < 2) return pts.slice()
  let p = pts
  for (let k = 0; k < 2; k++) {
    const q = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i]
      const [bx, bz] = p[i + 1]
      q.push([0.75 * ax + 0.25 * bx, 0.75 * az + 0.25 * bz], [0.25 * ax + 0.75 * bx, 0.25 * az + 0.75 * bz])
    }
    q.push(p[p.length - 1])
    p = q
  }
  const out = [p[0]]
  let carry = 0
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, az] = p[i]
    const [bx, bz] = p[i + 1]
    const len = Math.hypot(bx - ax, bz - az)
    let d = step - carry
    while (d <= len) {
      out.push([ax + ((bx - ax) * d) / len, az + ((bz - az) * d) / len])
      d += step
    }
    carry = len - (d - step)
  }
  const last = p[p.length - 1]
  if (Math.hypot(last[0] - out[out.length - 1][0], last[1] - out[out.length - 1][1]) > step * 0.3) out.push(last)
  return out
}

function segments(strokes) {
  const segs = []
  for (const s of strokes) {
    if (s.length === 1) segs.push([s[0][0], s[0][1], s[0][0], s[0][1]])
    for (let i = 0; i < s.length - 1; i++) segs.push([s[i][0], s[i][1], s[i + 1][0], s[i + 1][1]])
  }
  return segs
}

function nearestOnSegs(segs, x, z) {
  let best = Infinity
  let bx = x
  let bz = z
  for (const [ax, az, cx, cz] of segs) {
    const dx = cx - ax
    const dz = cz - az
    const l2 = dx * dx + dz * dz
    let u = l2 > 0 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0
    u = u < 0 ? 0 : u > 1 ? 1 : u
    const px = ax + u * dx
    const pz = az + u * dz
    const d = (px - x) ** 2 + (pz - z) ** 2
    if (d < best) {
      best = d
      bx = px
      bz = pz
    }
  }
  return [bx, bz, Math.sqrt(best)]
}

export function distanceToSpine(strokes, x, z) {
  const segs = segments(strokes)
  return segs.length ? nearestOnSegs(segs, x, z)[2] : Infinity
}

/**
 * Snap a stroke end onto the existing spine if within `radius`, so strokes join.
 * (No snapping to beacons: that bends the stroke into a spike; the beacon check
 * is forgiving instead.)
 */
export function snapPoint(strokes, x, z, radius = 0.3) {
  const segs = segments(strokes)
  if (!segs.length) return [x, z]
  const [nx, nz, d] = nearestOnSegs(segs, x, z)
  return d < radius ? [nx, nz] : [x, z]
}

// ---------------------------------------------------------------- the slide

export const TEAR_DISTANCE = 0.6
export const BEACON_RADIUS = 0.35
const SPINE_CELL = 0.8 // cells within this many cell-widths of a stroke belong to the spine
const SPECK = 8 // fenced-in patches this small are scribble, not a real patch: count them as spine

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]]

/**
 * Classify the spine and build the slide of every sample onto it.
 * Returns per-sample flow paths (for animation) and endpoints, torn neighbor pairs,
 * the problem if any ('empty' | 'disconnected' | 'leak' | 'enclosed'), cells in bad
 * regions, and which beacons the spine reaches.
 */
export function simulateSlide(shape, samples, strokes, beacons) {
  const { nx, nz, index, h, minX, minZ } = samples
  const n = samples.count
  const N = nx * nz
  const segs = segments(strokes)
  const cx = (c) => minX + ((c % nx) + 0.5) * h
  const cz = (c) => minZ + (Math.floor(c / nx) + 0.5) * h
  const inX = (c) => index[c] >= 0
  const neighbors = (c, dirs, fn) => {
    const i = c % nx
    const j = Math.floor(c / nx)
    for (const [di, dj] of dirs) {
      const a = i + di
      const b = j + dj
      fn(a < 0 || b < 0 || a >= nx || b >= nz ? -1 : b * nx + a, di, dj, i, j)
    }
  }

  const beaconHit = beacons.map(([bx, bz]) => (segs.length ? nearestOnSegs(segs, bx, bz)[2] <= BEACON_RADIUS : false))
  const result = (fields) => ({
    exitT: new Float32Array(n).fill(Infinity), // every path stays on the reef
    beaconHit,
    ...fields,
    rules: {
      startsStill: true,
      onReef: true,
      endsOnSpine: segs.length > 0,
      spineFixed: true,
      continuous: !fields.problem,
    },
    valid: !fields.problem && beaconHit.every(Boolean),
  })

  if (!segs.length) {
    const off = new Int32Array(n)
    for (let i = 0; i < n; i++) off[i] = i
    return result({
      problem: 'empty',
      rx: Float32Array.from(samples.x),
      rz: Float32Array.from(samples.z),
      tears: new Int32Array(0),
      bad: new Uint8Array(n),
      path: { off, len: new Int32Array(n).fill(1), x: Float32Array.from(samples.x), z: Float32Array.from(samples.z), s: new Float32Array(n) },
    })
  }

  // 1. spine cells
  const isA = new Uint8Array(N)
  for (let c = 0; c < N; c++) if (inX(c) && nearestOnSegs(segs, cx(c), cz(c))[2] <= SPINE_CELL * h) isA[c] = 1

  // 2. shores: components of the complement of X (anything reaching the grid edge is the open sea, id 0)
  const shore = new Int32Array(N).fill(-1)
  let nextShore = 1
  for (let c0 = 0; c0 < N; c0++) {
    if (inX(c0) || shore[c0] !== -1) continue
    const stack = [c0]
    const cells = []
    let sea = false
    shore[c0] = -2
    while (stack.length) {
      const c = stack.pop()
      cells.push(c)
      neighbors(c, N4, (d) => {
        if (d < 0) sea = true
        else if (!inX(d) && shore[d] === -1) {
          shore[d] = -2
          stack.push(d)
        }
      })
    }
    const id = sea ? 0 : nextShore++
    for (const c of cells) shore[c] = id
  }

  // 3. regions of X − A, and the shores each one touches
  const reg = new Int32Array(N).fill(-1)
  const regions = []
  for (let c0 = 0; c0 < N; c0++) {
    if (!inX(c0) || isA[c0] || reg[c0] !== -1) continue
    const id = regions.length
    const cells = []
    const shores = new Set()
    const stack = [c0]
    reg[c0] = id
    while (stack.length) {
      const c = stack.pop()
      cells.push(c)
      neighbors(c, N4, (d) => {
        if (d < 0) shores.add(0)
        else if (!inX(d)) shores.add(shore[d])
        else if (!isA[d] && reg[d] === -1) {
          reg[d] = id
          stack.push(d)
        }
      })
    }
    regions.push({ cells, shores })
  }
  for (const r of regions) {
    if (r.shores.size === 0 && r.cells.length <= SPECK) {
      for (const c of r.cells) (isA[c] = 1), (reg[c] = -1)
      r.cells = []
    }
  }

  // 4. is the spine one piece? (8-connected spine cells)
  let spinePieces = 0
  const seen = new Uint8Array(N)
  for (let c0 = 0; c0 < N; c0++) {
    if (!isA[c0] || seen[c0]) continue
    spinePieces++
    const stack = [c0]
    seen[c0] = 1
    while (stack.length) {
      neighbors(stack.pop(), N8, (d) => {
        if (d >= 0 && isA[d] && !seen[d]) (seen[d] = 1), stack.push(d)
      })
    }
  }
  const leaks = regions.filter((r) => r.cells.length && r.shores.size >= 2)
  const fenced = regions.filter((r) => r.cells.length && r.shores.size === 0)
  const problem = spinePieces > 1 ? 'disconnected' : leaks.length ? 'leak' : fenced.length ? 'enclosed' : null

  // 5. φ: harmonic in each region; 1 just beyond its shore(s), 0 on the spine (SOR).
  // The shore value sits outside the reef, so every reef cell has a real slope.
  const phi = new Float32Array(N)
  const free = []
  for (const r of regions) {
    if (!r.cells.length || r.shores.size === 0) continue
    for (const c of r.cells) (phi[c] = 0.5), free.push(c)
  }
  for (let it = 0; it < 4000; it++) {
    let delta = 0
    for (const c of free) {
      let sum = 0
      let k = 0
      neighbors(c, N4, (d) => {
        sum += d < 0 || !inX(d) ? 1 : isA[d] ? 0 : phi[d]
        k++
      })
      const v = phi[c] + 1.85 * (sum / k - phi[c])
      delta = Math.max(delta, Math.abs(v - phi[c]))
      phi[c] = v
    }
    if (delta < 1e-5) break
  }

  // BFS steps to the spine: a fallback descent wherever φ is flat
  const toA = new Int32Array(N).fill(1 << 30)
  const queue = []
  for (let c = 0; c < N; c++) if (isA[c]) (toA[c] = 0), queue.push(c)
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q]
    neighbors(c, N4, (d) => {
      if (d >= 0 && inX(d) && toA[d] > toA[c] + 1) (toA[d] = toA[c] + 1), queue.push(d)
    })
  }

  // 6. paths
  const cellAt = (x, z) => {
    const i = Math.floor((x - minX) / h)
    const j = Math.floor((z - minZ) / h)
    if (i < 0 || j < 0 || i >= nx || j >= nz) return -1
    const c = j * nx + i
    return inX(c) ? c : -1
  }
  // φ at grid node (i, j): 0 on the spine, 1 off the reef (the shore), harmonic between
  const node = (i, j) => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return 1
    const c = j * nx + i
    return !inX(c) ? 1 : isA[c] ? 0 : phi[c]
  }
  const gradPhi = (x, z, out) => {
    const u = (x - minX) / h - 0.5
    const v = (z - minZ) / h - 0.5
    const i = Math.floor(u)
    const j = Math.floor(v)
    const fu = u - i
    const fv = v - j
    const v00 = node(i, j)
    const v10 = node(i + 1, j)
    const v01 = node(i, j + 1)
    const v11 = node(i + 1, j + 1)
    out[0] = ((1 - fv) * (v10 - v00) + fv * (v11 - v01)) / h
    out[1] = ((1 - fu) * (v01 - v00) + fu * (v11 - v10)) / h
    return out
  }
  const cellOf = new Int32Array(n)
  for (let c = 0; c < N; c++) if (index[c] >= 0) cellOf[index[c]] = c
  const fencedCenter = new Map()
  for (const r of fenced) {
    let best = r.cells[0]
    for (const c of r.cells) if (toA[c] > toA[best]) best = c
    for (const c of r.cells) fencedCenter.set(c, best)
  }
  const bad = new Uint8Array(n)
  for (const r of [...leaks, ...fenced]) for (const c of r.cells) bad[index[c]] = 1

  const off = new Int32Array(n)
  const len = new Int32Array(n)
  const px = []
  const pz = []
  const rx = new Float32Array(n)
  const rz = new Float32Array(n)

  // streamline from (x0, z0) down the (bilinearly interpolated) gradient of φ, ending on the spine
  const stream = (x0, z0, c0) => {
    const pts = [[x0, z0]]
    let x = x0
    let z = z0
    const g = [0, 0]
    for (let step = 0; step < 1200; step++) {
      const c = cellAt(x, z)
      if (c < 0) break
      // stop on true distance to the drawn spine (smooth), not on entering a jagged spine cell
      if (toA[c] <= 2 && nearestOnSegs(segs, x, z)[2] < 0.5 * h) break
      gradPhi(x, z, g)
      const gl = Math.hypot(g[0], g[1])
      let nx2
      let nz2
      if (gl > 1e-6) {
        nx2 = x - (g[0] / gl) * h * 0.3
        nz2 = z - (g[1] / gl) * h * 0.3
      }
      const nc = gl > 1e-6 ? cellAt(nx2, nz2) : -1
      if (nc < 0 || (!isA[nc] && reg[nc] !== reg[c0])) {
        // flat spot or about to leave the region: step to the neighbor closest to the spine
        let fb = -1
        neighbors(c, N4, (d) => {
          if (d >= 0 && inX(d) && toA[d] < toA[c] && (fb < 0 || toA[d] < toA[fb])) fb = d
        })
        if (fb < 0) break
        nx2 = cx(fb)
        nz2 = cz(fb)
      }
      x = nx2
      z = nz2
      if (step % 2 === 1) pts.push([x, z])
    }
    pts.push(nearestOnSegs(segs, x, z).slice(0, 2))
    return pts
  }

  for (let s = 0; s < n; s++) {
    const c0 = cellOf[s]
    const x0 = samples.x[s]
    const z0 = samples.z[s]
    let pts = [[x0, z0]]
    if (fencedCenter.has(c0)) {
      // fenced-in patch: push out from its middle to the fence — the middle tears
      const m = fencedCenter.get(c0)
      let dx = x0 - cx(m)
      let dz = z0 - cz(m)
      const l = Math.hypot(dx, dz)
      if (l < 1e-6) (dx = 1), (dz = 0)
      else (dx /= l), (dz /= l)
      let x = x0
      let z = z0
      for (let k = 0; k < 400; k++) {
        const i = Math.floor((x - minX) / h)
        const j = Math.floor((z - minZ) / h)
        if (i < 0 || j < 0 || i >= nx || j >= nz || !inX(j * nx + i) || isA[j * nx + i]) break
        x += dx * h * 0.5
        z += dz * h * 0.5
      }
      const [ex, ez] = nearestOnSegs(segs, x, z)
      pts.push([ex, ez])
    } else if (!isA[c0]) {
      pts = stream(x0, z0, c0)
    } else {
      const [ex, ez] = nearestOnSegs(segs, x0, z0)
      pts.push([ex, ez])
    }
    off[s] = px.length
    len[s] = pts.length
    for (const [x, z] of pts) px.push(x), pz.push(z)
    rx[s] = pts[pts.length - 1][0]
    rz[s] = pts[pts.length - 1][1]
  }

  // constant speed: cumulative arc length → s ∈ [0, 1] along each path
  const sArr = new Float32Array(px.length)
  for (let k = 0; k < n; k++) {
    const o = off[k]
    let total = 0
    for (let q = 1; q < len[k]; q++) total += Math.hypot(px[o + q] - px[o + q - 1], pz[o + q] - pz[o + q - 1])
    let acc = 0
    for (let q = 1; q < len[k]; q++) {
      acc += Math.hypot(px[o + q] - px[o + q - 1], pz[o + q] - pz[o + q - 1])
      sArr[o + q] = total > 0 ? acc / total : 1
    }
  }

  // 7. tears — shown only for invalid spines; a valid spine's slide is continuous by construction
  const tears = []
  if (problem) {
    for (let k = 0; k < samples.pairs.length; k += 2) {
      const a = samples.pairs[k]
      const b = samples.pairs[k + 1]
      if (Math.hypot(rx[a] - rx[b], rz[a] - rz[b]) > TEAR_DISTANCE) tears.push(a, b)
    }
  }

  return result({
    problem,
    rx,
    rz,
    tears: Int32Array.from(tears),
    bad,
    path: { off, len, x: Float32Array.from(px), z: Float32Array.from(pz), s: sArr },
    /** where the slide sends an arbitrary point of the reef (valid regions only) */
    endpointAt: (x, z) => {
      const c = cellAt(x, z)
      if (c < 0) return null
      if (isA[c]) return nearestOnSegs(segs, x, z).slice(0, 2)
      if (fencedCenter.has(c)) return null
      const p = stream(x, z, c)
      return p[p.length - 1]
    },
  })
}

/** Position of sample i at time t: constant speed along its flow path. */
export function slidePosition(samples, sim, i, t, out) {
  const { off, len, x, z, s } = sim.path
  const o = off[i]
  const L = len[i]
  out[1] = 0
  if (L === 1 || t <= 0) {
    out[0] = x[o]
    out[2] = z[o]
    return out
  }
  let k = 1
  while (k < L - 1 && s[o + k] < t) k++
  const s0 = s[o + k - 1]
  const s1 = s[o + k]
  const u = s1 > s0 ? Math.min(1, Math.max(0, (t - s0) / (s1 - s0))) : 1
  out[0] = x[o + k - 1] + (x[o + k] - x[o + k - 1]) * u
  out[2] = z[o + k - 1] + (z[o + k] - z[o + k - 1]) * u
  return out
}
