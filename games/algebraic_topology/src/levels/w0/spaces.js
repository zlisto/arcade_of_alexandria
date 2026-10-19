/**
 * Operations on spaces for the Cone Zone (0-5). Hatcher, Algebraic Topology, Chapter 0,
 * pp. 8–10: products, quotients, cones, suspensions, wedge sums — and the cells each
 * one inherits or adds.
 *
 * A specimen is { key, name, cells: [#0-cells, #1-cells, #2-cells, …] } with a standard
 * cell structure. Each operation returns the result's key and its cells, computed from
 * the inputs' cells by Hatcher's recipes:
 *   cone CX       — X's cells, one cone cell (one dimension up) on each, plus the tip
 *   suspension SX — two tips, plus a suspension cell (one dimension up) on each cell of X
 *   wedge X ∨ Y   — X's cells and Y's, with one 0-cell from each identified
 *   product X × Y — a cell eᵐ × eⁿ (dimension m + n) for each pair of cells
 *   quotient X/A  — X's cells with A's collapsed to one new 0-cell
 * The results' names come from a table of the spaces the terrace can make.
 */

export const SPECIMENS = {
  point: { key: 'point', name: 'a point', cells: [1] },
  s0: { key: 's0', name: 'two points (S⁰)', cells: [2] },
  interval: { key: 'interval', name: 'an interval', cells: [2, 1] },
  circle: { key: 'circle', name: 'a circle (S¹)', cells: [1, 1] },
  disk: { key: 'disk', name: 'a disk', cells: [1, 1, 1] },
  cone_circle: { key: 'cone_circle', name: 'a cone on a circle (a disk)', cells: [2, 2, 1] },
  vee: { key: 'vee', name: 'a cone on two points (a V)', cells: [3, 2] },
  sphere: { key: 'sphere', name: 'a sphere (S²)', cells: [2, 1, 1] },
  sphere_q: { key: 'sphere_q', name: 'a sphere (S²)', cells: [1, 0, 1] },
  s3: { key: 's3', name: 'a 3-sphere (S³)', cells: [2, 1, 1, 1] },
  eight: { key: 'eight', name: 'a figure-eight (S¹ ∨ S¹)', cells: [1, 2] },
  torus: { key: 'torus', name: 'a torus (S¹ × S¹)', cells: [1, 2, 1] },
  two_circles: { key: 'two_circles', name: 'two circles (S⁰ × S¹)', cells: [2, 2] },
  cylinder: { key: 'cylinder', name: 'a cylinder (S¹ × I)', cells: [2, 3, 1] },
  sphere_circle: { key: 'sphere_circle', name: 'a sphere with a circle attached (S² ∨ S¹)', cells: [1, 2, 1] },
  cone_any: { key: 'cone_any', name: 'a cone — contractible', cells: [1] },
  other: { key: 'other', name: 'a new space', cells: [1] },
}

/** Which keys count as "the same space" for a target (a sphere made two ways is still a sphere). */
export const SAME = { sphere_q: 'sphere', cone_circle: 'disk' }
export const canon = (key) => SAME[key] || key

const shiftUp = (c) => [0, ...c]
const add = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] || 0) + (b[i] || 0))
const trim = (c) => {
  const out = [...c]
  while (out.length > 1 && out[out.length - 1] === 0) out.pop()
  return out
}
export const chiOf = (c) => c.reduce((s, n, i) => s + (i % 2 ? -n : n), 0)

export const OPS = {
  cone: {
    label: 'CONE',
    inputs: 1,
    blurb: 'join every point to one tip',
    run: ([x]) => {
      const cells = trim(add(add(x.cells, shiftUp(x.cells)), [1]))
      const key = { circle: 'cone_circle', s0: 'vee', point: 'interval' }[x.key] || 'cone_any'
      return { key, cells }
    },
  },
  suspension: {
    label: 'SUSPENSION',
    inputs: 1,
    blurb: 'a tip above and a tip below',
    run: ([x]) => {
      const cells = trim(add([2], shiftUp(x.cells)))
      const key = { s0: 'circle', circle: 'sphere', sphere: 's3', sphere_q: 's3', point: 'interval' }[x.key] || 'other'
      return { key, cells }
    },
  },
  wedge: {
    label: 'WEDGE',
    inputs: 2,
    blurb: 'glue two spaces at one point',
    run: ([x, y]) => {
      const cells = trim(add(add(x.cells, y.cells), [-1]))
      const pair = [canon(x.key), canon(y.key)].sort().join('+')
      const key = { 'circle+circle': 'eight', 'circle+sphere': 'sphere_circle' }[pair] || (x.key === 'point' ? y.key : y.key === 'point' ? x.key : 'other')
      return { key, cells }
    },
  },
  product: {
    label: 'PRODUCT',
    inputs: 2,
    blurb: 'every point of one, times every point of the other',
    run: ([x, y]) => {
      const cells = []
      x.cells.forEach((m, i) => y.cells.forEach((n, j) => (cells[i + j] = (cells[i + j] || 0) + m * n)))
      const pair = [canon(x.key), canon(y.key)].sort().join('+')
      const key = { 'circle+circle': 'torus', 'circle+s0': 'two_circles', 'circle+interval': 'cylinder' }[pair] || (x.key === 'point' ? y.key : y.key === 'point' ? x.key : 'other')
      return { key, cells: trim(cells) }
    },
  },
  quotient: {
    label: 'QUOTIENT',
    inputs: 1,
    blurb: 'collapse the boundary to one point',
    run: ([x]) => {
      // the terrace's quotient press collapses a specimen's boundary: a disk's rim, an interval's ends
      if (canon(x.key) === 'disk') return { key: 'sphere_q', cells: [1, 0, 1] }
      if (x.key === 'interval') return { key: 'circle', cells: [1, 1] }
      return { key: x.key, cells: x.cells, nothing: true }
    },
  },
}

/** Make a specimen from an op's result. */
export const fromResult = (r) => ({ ...SPECIMENS[r.key], key: r.key, cells: r.cells })

export const cellText = (c) => c.map((n, i) => `${n}×e${'⁰¹²³'[i]}`).join(' + ')
