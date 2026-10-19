/**
 * Node tests: node src/levels/w1/covers.test.js
 */
import {
  coverTwoSheetAA,
  conjugateOrder,
  liftWord,
  orderMatches,
  ORDER_TWO_SHEET_AA,
  parseWord,
  reduceWord,
  torusLift,
  treeStep,
  wordEqual,
} from './covers.js'

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

const C = coverTwoSheetAA()
ok('two-sheet valid', orderMatches(C, 0, ORDER_TWO_SHEET_AA))
ok('a does not close', !liftWord(C, 0, ['a']).closed)
ok('aa closes', liftWord(C, 0, ['a', 'a']).closed)
ok('b closes', liftWord(C, 0, ['b']).closed)

const conj = conjugateOrder(ORDER_TWO_SHEET_AA, 'a')
ok('conjugate still satisfies cover at base 1', orderMatches(C, 1, { rules: conj.rules }))

ok('tree reduce', wordEqual(treeStep([], 'a'), ['a']))
ok('tree ab', wordEqual(treeStep(treeStep([], 'a'), 'b'), ['a', 'b']))
ok('tree cancel', wordEqual(treeStep(treeStep([], 'a'), 'A'), []))

ok('torus ab', torusLift([0, 0], ['a', 'b']).join(',') === '1,1')
ok('torus loop mn', torusLift([0, 0], parseWord('aAbB')).join(',') === '0,0')

ok('parse aa', parseWord('aa').length === 2)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
