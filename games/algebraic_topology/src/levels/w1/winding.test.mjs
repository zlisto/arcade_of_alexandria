/**
 * Node tests for winding.js — run: node src/levels/w1/winding.test.mjs
 */
import {
  angleAt,
  angleDelta,
  windingFromRadians,
  addWindings,
  negateWinding,
  sameWinding,
  makeRingTracker,
  helixHeight,
} from './winding.js'

let pass = 0
let fail = 0
const ok = (name, cond) => {
  if (cond) {
    pass++
    console.log('ok', name)
  } else {
    fail++
    console.error('FAIL', name)
  }
}

ok('angleDelta quarter turn', Math.abs(angleDelta(0, Math.PI / 2) - Math.PI / 2) < 1e-9)
ok('winding one lap', windingFromRadians(Math.PI * 2) === 1)
ok('winding half lap rounds', windingFromRadians(Math.PI) === 0 || windingFromRadians(Math.PI * 1.01) === 1)
ok('add negates', addWindings(2, negateWinding(2)) === 0)
ok('homotopy same floor', sameWinding(Math.PI * 2.1, Math.PI * 2.05))
ok('helix height', Math.abs(helixHeight(3, 2.35) - 7.05) < 1e-6)

const center = [5, 5]
const tr = makeRingTracker(center, 3.3, 5.0)
const R = 4.2
let totalW = 0
let lastA = 0
for (let step = 0; step <= 120; step++) {
  const t = (step / 120) * Math.PI * 2
  const x = center[0] + R * Math.cos(t)
  const z = center[1] + R * Math.sin(t)
  const ev = tr.update(x, z)
  if (ev?.event === 'lap') totalW += ev.winding
  lastA = t
}
ok('ring tracker one ccw lap', totalW === 1)

// clockwise lap
tr.reset()
totalW = 0
for (let step = 0; step <= 120; step++) {
  const t = -(step / 120) * Math.PI * 2
  const x = center[0] + R * Math.cos(t)
  const z = center[1] + R * Math.sin(t)
  const ev = tr.update(x, z)
  if (ev?.event === 'lap') totalW += ev.winding
}
ok('ring tracker one cw lap', totalW === -1)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
