/**
 * Node: node src/levels/w1/loops.test.js
 */
import {
  addLap,
  assocEqual,
  conjugate,
  concat,
  inverse,
  letter,
  reduce,
  sameLoop,
  sequenceOk,
} from './loops.js'

let pass = 0
let fail = 0
function ok(cond, msg) {
  if (cond) {
    pass++
  } else {
    fail++
    console.error('FAIL:', msg)
  }
}

const a = letter(0, 1)
const b = letter(1, 1)
const c = letter(2, 1)

ok(sameLoop(concat([a], inverse([a])), []), 'loop times inverse is identity')
ok(sequenceOk([a, letter(0, -1)], []), 'there and back cancels')
ok(assocEqual([a], [b], [c]), 'associativity α (β γ) vs (α β) γ')
const abc = concat(concat([a], [b]), [c])
ok(sameLoop(reduce(abc), abc), 'reduce is idempotent on reduced words')

const h = [letter(3, 1)]
const gamma = [a, b]
const moved = conjugate(gamma, h)
ok(sameLoop(conjugate(moved, inverse(h)), gamma), 'conjugate round-trip along h')

ok(addLap([], a).length === 1, 'addLap records α')

console.log(`${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
