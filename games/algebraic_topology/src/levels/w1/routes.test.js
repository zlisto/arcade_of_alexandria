/**
 * Run: node src/levels/w1/routes.test.js
 */
import {
  concat,
  homotopicRelEndpoints,
  reparametrize,
  resample,
  routeClass,
  validateLedger,
  winding,
} from './routes.js'

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg)
}

const gates = { a: [-4, 0], b: [4, 0] }
const hedge = [{ c: [0, 0], r: 1.2 }]
const envConvex = { gates, hedges: [] }
const envHedge = { gates, hedges: hedge, canonical: null }

const straight = [
  [-4, 0],
  [0, 0],
  [4, 0],
]
const arcLeft = [
  [-4, 0],
  [-2, 1.8],
  [0, 2.2],
  [2, 1.8],
  [4, 0],
]
const arcRight = [
  [-4, 0],
  [-2, -1.8],
  [0, -2.2],
  [2, -1.8],
  [4, 0],
]

envHedge.canonical = arcLeft

assert(homotopicRelEndpoints(straight, resample(straight, 20), envConvex), 'convex: reparam same class')
assert(homotopicRelEndpoints(arcLeft, reparametrize(arcLeft, 2), envHedge), 'reparametrize homotopic')
assert(!homotopicRelEndpoints(arcLeft, arcRight, envHedge), 'left vs right not homotopic')
assert(routeClass(arcLeft, envHedge) === 0, 'left is class 0')
assert(routeClass(arcRight, envHedge) === 1, 'right is class 1')

const loop = [...arcLeft, ...arcRight.slice().reverse()]
assert(Math.abs(winding(loop, hedge[0].c)) > 0.9, 'difference loop winds')

const mid = { a: gates.a, b: [0, 0], c: gates.b }
const rAB = [
  [-4, 0],
  [-1, 1.5],
  [0, 0],
]
const rBC = [
  [0, 0],
  [1, -1.5],
  [4, 0],
]
const whole = concat(rAB, rBC, mid)
const whole2 = concat(rAB, [[0, 0], [1, -1.2], [4, 0]], mid)
assert(routeClass(whole, { gates: { a: mid.a, b: mid.c }, hedges: hedge, canonical: whole }) === routeClass(whole2, { gates: { a: mid.a, b: mid.c }, hedges: hedge, canonical: whole }), 'swap middle leg same class')

const ledger = validateLedger({ a: 0, b: 0, c: 1, d: 1 }, { a: arcLeft, b: reparametrize(arcLeft), c: arcRight, d: resample(arcRight, 12) }, envHedge)
assert(ledger.ok && ledger.classes === 2, 'ledger two classes')

assert(validateLedger({ a: 0, b: 0, c: 1, d: 1 }, { a: arcLeft, b: arcRight, c: arcLeft, d: arcRight }, envHedge).ok === false, 'bad ledger rejected')

console.log('routes.test.js: all passed')
