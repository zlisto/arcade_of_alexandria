import assert from 'node:assert/strict'
import { commuteSame, eqPair, productClass, pushWinding, shadowRebuild, shadowSplit, stillDistinct, torusStep } from './inducedMaps.js'
import { makeCircleTracker, makeTorusTracker } from './loopTrack.js'

assert.equal(pushWinding(1, 2), 2)
assert.equal(pushWinding(-1, 3), -3)
assert.equal(stillDistinct(1, 2), true)
assert.equal(stillDistinct(2, 2), false)
assert.deepEqual(torusStep([0, 0], 'tube'), [1, 0])
assert.deepEqual(torusStep([1, 0], 'hole'), [1, 1])
assert.equal(commuteSame(2, 3), true)
assert.deepEqual(productClass(2, -1), [2, -1])
assert.deepEqual(shadowSplit([2, 3]), { tube: 2, hole: 3 })
assert.deepEqual(shadowRebuild(2, 3), [2, 3])
assert.equal(eqPair([1, 2], [1, 2]), true)

const ring = makeCircleTracker(0, 0, 4)
let laps = 0
for (let i = 0; i < 64; i++) {
  const ang = (i / 64) * Math.PI * 2 * 1.1
  const r = ring.tick(Math.cos(ang) * 4, Math.sin(ang) * 4)
  laps = r.laps
}
assert.ok(Math.abs(laps) >= 1, 'circle tracker should count at least one lap')

const torus = makeTorusTracker({ cx: 0, cz: 0, r: 4.5 }, { cx: 0, cz: 0, r: 2.2 })
for (let i = 0; i < 40; i++) {
  const ang = (i / 40) * Math.PI * 2
  torus.tick(Math.cos(ang) * 4.5, Math.sin(ang) * 4.5)
}
const [m] = torus.pair()
assert.ok(Math.abs(m) >= 1, 'tube belt should register laps')

console.log('inducedMaps.test.mjs: all passed')
