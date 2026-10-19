/**
 * Pure math for World 1 · Level 5 "Push It Forward".
 * Hatcher, Algebraic Topology, §1.1 (pp. 34–39): induced homomorphisms, retractions,
 * and π₁ of a product. The game uses ℤ winding on S¹ and ℤ² on T² = S¹ × S¹.
 */

/** Induced map on π₁(S¹): a k-fold covering/wrap sends winding w to k·w. */
export function pushWinding(w, degree) {
  if (!Number.isInteger(w) || !Number.isInteger(degree)) throw new Error('winding and degree must be integers')
  return w * degree
}

/** After a retraction onto a subspace, two loop classes stay distinct iff their windings differ. */
export function stillDistinct(w1, w2) {
  return w1 !== w2
}

/** One step on the torus grid lift: tube = first factor, hole = second factor. */
export function torusStep([m, n], road) {
  if (road === 'tube') return [m + 1, n]
  if (road === 'hole') return [m, n + 1]
  throw new Error(`unknown road ${road}`)
}

/** Tube-then-hole vs hole-then-tube reach the same lattice point (commutativity in ℤ²). */
export function commuteSame(m = 1, n = 1) {
  let a = [0, 0]
  for (let i = 0; i < m; i++) a = torusStep(a, 'tube')
  for (let i = 0; i < n; i++) a = torusStep(a, 'hole')
  let b = [0, 0]
  for (let i = 0; i < n; i++) b = torusStep(b, 'hole')
  for (let i = 0; i < m; i++) b = torusStep(b, 'tube')
  return a[0] === b[0] && a[1] === b[1]
}

/** π₁(X × Y) ≅ π₁(X) × π₁(Y): record the pair of factor windings. */
export function productClass(wTube, wHole) {
  return [wTube, wHole]
}

/** Split a torus class into its two circle shadows (project to each factor). */
export function shadowSplit([m, n]) {
  return { tube: m, hole: n }
}

/** Rebuild a torus class from its two shadows. */
export function shadowRebuild(m, n) {
  return [m, n]
}

export function eqPair(a, b) {
  return a[0] === b[0] && a[1] === b[1]
}
