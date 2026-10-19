/**
 * Graphs for the Timber Yard (0-6). Hatcher, Algebraic Topology, Chapter 0, Example 0.7
 * (p. 11): collapsing an edge with two distinct endpoints is a homotopy equivalence;
 * repeating it until every edge is a loop leaves a wedge of circles. Collapsing a whole
 * tree (contractible) at once is Proposition 0.17.
 *
 * A graph is { nodes: [[x, z], …], edges: [{ a, b, bend?, dir? }, …], root }: platforms
 * and walkways in site-local units. `bend` curves a walkway (to draw doubled ones);
 * `dir` is the angle a self-loop (a = b) sticks out at.
 */

/** Union–find over node indices. */
function dsu(n) {
  const p = Array.from({ length: n }, (_, i) => i)
  const find = (x) => (p[x] === x ? x : (p[x] = find(p[x])))
  return { find, union: (a, b) => (p[find(a)] = find(b)) }
}

/** Does marking edge `e` (given the marked set) close a loop? A self-loop always does. */
export function closesLoop(g, marked, e) {
  const ed = g.edges[e]
  if (ed.a === ed.b) return true
  const d = dsu(g.nodes.length)
  for (const m of marked) d.union(g.edges[m].a, g.edges[m].b)
  return d.find(ed.a) === d.find(ed.b)
}

/** How many platforms the marked tree reaches (in its largest piece), and is it spanning? */
export function treeReach(g, marked) {
  const d = dsu(g.nodes.length)
  for (const m of marked) d.union(g.edges[m].a, g.edges[m].b)
  const size = {}
  g.nodes.forEach((_, i) => (size[d.find(i)] = (size[d.find(i)] || 0) + 1))
  const best = Math.max(...Object.values(size))
  return { reached: marked.length ? best : 0, spanning: best === g.nodes.length }
}

export const chiOf = (g) => g.nodes.length - g.edges.length
export const petalsOf = (g) => 1 - chiOf(g)

const smooth = (x) => x * x * (3 - 2 * x)

/** A walkway's path between its ends' current positions (N + 1 points, [x, z]). */
export function edgePath(ed, pa, pb, N = 24) {
  const out = []
  if (ed.a === ed.b) {
    // a self-loop: a teardrop out of the platform
    const th = ed.dir ?? 0
    for (let i = 0; i <= N; i++) {
      const s = i / N
      const phi = th + (s - 0.5) * 1.5
      const rho = 1.5 * Math.sin(Math.PI * s)
      out.push([pa[0] + rho * Math.cos(phi), pa[1] + rho * Math.sin(phi)])
    }
    return out
  }
  const mx = (pa[0] + pb[0]) / 2
  const mz = (pa[1] + pb[1]) / 2
  const dx = pb[0] - pa[0]
  const dz = pb[1] - pa[1]
  const bend = ed.bend || 0
  const cx = mx - dz * bend
  const cz = mz + dx * bend
  for (let i = 0; i <= N; i++) {
    const s = i / N
    const u = 1 - s
    out.push([u * u * pa[0] + 2 * u * s * cx + s * s * pb[0], u * u * pa[1] + 2 * u * s * cz + s * s * pb[1]])
  }
  return out
}

/** The petal a non-tree walkway becomes once the tree is felled: a loop at the root. */
export const PETAL_SIZE = 2.3

export function petalPath(root, angle, N = 24, size = PETAL_SIZE) {
  const out = []
  for (let i = 0; i <= N; i++) {
    const s = i / N
    const phi = angle + (s - 0.5) * 1.3
    const rho = size * Math.sin(Math.PI * s)
    out.push([root[0] + rho * Math.cos(phi), root[1] + rho * Math.sin(phi)])
  }
  return out
}

/**
 * The felled picture at fell-progress k (0 → 1): every platform slides to the root, tree
 * walkways shrink away with them, and the other walkways round out into petals.
 * Returns { nodes: [[x, z]], edges: [{ pts, tree }] } and each petal's angle.
 */
export function felledAt(g, tree, k) {
  const kk = smooth(Math.max(0, Math.min(1, k)))
  const R = g.nodes[g.root]
  const nodes = g.nodes.map((p) => [p[0] + (R[0] - p[0]) * kk, p[1] + (R[1] - p[1]) * kk])
  const others = g.edges.map((_, i) => i).filter((i) => !tree.includes(i))
  const angles = petalAngles(g, others.length)
  const edges = g.edges.map((ed, i) => {
    const P = edgePath(ed, nodes[ed.a], nodes[ed.b])
    const j = others.indexOf(i)
    if (j < 0) return { pts: P, tree: true }
    const Q = petalPath(R, angles[j])
    const w = smooth(Math.max(0, (k - 0.25) / 0.75))
    return { pts: P.map((p, n) => [p[0] + (Q[n][0] - p[0]) * w, p[1] + (Q[n][1] - p[1]) * w]), tree: false, petal: j }
  })
  return { nodes, edges, angles }
}

/** Petals spread evenly round the root, away from the deck's middle where possible. */
export function petalAngles(g, n) {
  const R = g.nodes[g.root]
  const cx = g.nodes.reduce((s, p) => s + p[0], 0) / g.nodes.length
  const cz = g.nodes.reduce((s, p) => s + p[1], 0) / g.nodes.length
  const base = Math.hypot(R[0] - cx, R[1] - cz) > 0.3 ? Math.atan2(cz - R[1], cx - R[0]) : -Math.PI / 2
  if (n === 1) return [base]
  const spread = Math.min(Math.PI * 2 - (Math.PI * 2) / n, Math.PI * 1.6)
  return Array.from({ length: n }, (_, i) => base - spread / 2 + (spread * i) / (n - 1))
}

/** The walkway nearest a point (distance to its drawn path), or null if none within `tol`. */
export function nearestEdge(g, nodes, x, z, tol = 0.55) {
  let best = null
  g.edges.forEach((ed, i) => {
    const P = edgePath(ed, nodes[ed.a], nodes[ed.b], 32)
    for (let n = 0; n < P.length - 1; n++) {
      const d = segDist(x, z, P[n], P[n + 1])
      if (d < tol && (!best || d < best.d)) best = { i, d }
    }
  })
  return best
}

export function segDist(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  const u = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0
  return Math.hypot(x - (ax + u * dx), z - (az + u * dz))
}
