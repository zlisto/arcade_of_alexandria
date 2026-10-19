/**
 * Node tests: node src/levels/w1/freeWords.test.mjs
 */
import {
  appendLap,
  commutatorDistinct,
  expectedLashLetter,
  parseTokens,
  patrolWordReduced,
  reduceFree,
  reverseLashOrder,
  sameReduced,
} from './freeWords.js'

let failed = 0
const ok = (name, cond) => {
  if (!cond) {
    console.error('FAIL:', name)
    failed++
  } else console.log('ok', name)
}

ok('cancel a a⁻¹', sameReduced(reduceFree(parseTokens('a a-')), []))
ok('cancel b⁻¹ b', sameReduced(reduceFree(parseTokens('b- b')), []))
ok('a b a⁻¹ b⁻¹ nontrivial', patrolWordReduced().length === 4)
ok('ab ≠ ba', commutatorDistinct())
ok('append lap forward a', sameReduced(appendLap([], 0, 1).tape, parseTokens('a')))
ok('a then a⁻¹ clears', appendLap(parseTokens('a'), 0, -1).tape.length === 0)
ok('reverse lash order length', reverseLashOrder(parseTokens('a b a- b-')).length === 4)
ok('first reverse lash is b⁻¹', expectedLashLetter(parseTokens('a b a- b-'), 0).e === 1 && expectedLashLetter(parseTokens('a b a- b-'), 0).s === -1)
ok('second reverse lash is a⁻¹', expectedLashLetter(parseTokens('a b a- b-'), 1).e === 0 && expectedLashLetter(parseTokens('a b a- b-'), 1).s === -1)

if (failed) {
  console.error(failed, 'failed')
  process.exit(1)
}
console.log('all passed')
