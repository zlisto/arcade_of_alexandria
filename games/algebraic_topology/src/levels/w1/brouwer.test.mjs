import assert from 'node:assert/strict'
import test from 'node:test'
import {
  antipode,
  boundaryIndex,
  boundaryPolyIndex,
  circleLoop,
  fieldAngle,
  hasAntipodalMatch,
  innerShrinkLoop,
  makeRimTracker,
  retractionImpossible,
  unitRoots,
  windingIndex,
} from './brouwer.js'

test('rim tracker counts one lap', () => {
  const tr = makeRimTracker([0, 0], 4, 0.8)
  let done = null
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2
    done = tr.update(4 * Math.cos(a), 4 * Math.sin(a))
    if (done) break
  }
  assert.equal(done?.event, 'done')
  assert.equal(done?.winding, 1)
})

test('disk loop has zero winding; rim has one', () => {
  const rim = circleLoop(0, 0, 3)
  const inner = [
    [1.8, 0.1],
    [1.6, 0.35],
    [1.35, 0.15],
    [1.55, -0.2],
  ]
  assert.equal(Math.round(windingIndex(rim, [0, 0])), 1)
  assert.ok(Math.abs(windingIndex(inner, [0, 0])) < 0.2)
  assert.ok(retractionImpossible(1, windingIndex(inner, [0, 0])))
})

test('swirl field index is 1 on a basin rim', () => {
  const focus = [0.4, -0.3]
  const at = (x, z) => fieldAngle('swirl', x, z, { focus })
  const rim = circleLoop(0, 0, 4.2, 80)
  assert.equal(boundaryIndex(rim, at), 1)
})

test('z^3 field has index 3 on outer circle', () => {
  const rim = circleLoop(0, 0, 5, 96)
  assert.equal(boundaryPolyIndex(rim, 3, 0.42), 3)
})

test('unit roots and antipodal match', () => {
  const roots = unitRoots(3)
  assert.equal(roots.length, 3)
  const [ax, az] = antipode(roots[0].x, roots[0].z, 2.2)
  assert.ok(Math.hypot(ax + roots[0].x, az + roots[0].z) < 0.01)
  const stations = [
    { id: 'n', x: 0, z: 2, readings: [2, 5] },
    { id: 's', x: 0, z: -2, readings: [2, 5] },
    { id: 'e', x: 2, z: 0, readings: [1, 9] },
  ]
  assert.ok(hasAntipodalMatch(stations, 2))
})
