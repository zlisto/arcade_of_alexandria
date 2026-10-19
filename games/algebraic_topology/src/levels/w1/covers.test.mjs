import assert from 'node:assert/strict'
import {
  coverConnectedFrom,
  coverThreeSheetAbSep,
  coverTwoSheetCircle,
  isValidCover,
  liftWord,
  parseWord,
} from './covers.js'

{
  const c = coverTwoSheetCircle()
  assert.ok(isValidCover(c))
  assert.ok(coverConnectedFrom(c, 0))
  assert.equal(liftWord(c, 0, parseWord('a')).end, 1)
  assert.equal(liftWord(c, 0, parseWord('a')).closed, false)
  assert.ok(liftWord(c, 0, parseWord('aa')).closed)
}

{
  const c = coverThreeSheetAbSep()
  assert.ok(isValidCover(c))
  assert.ok(coverConnectedFrom(c, 0))
  assert.ok(liftWord(c, 0, parseWord('ab')).closed, 'ab closes')
  assert.ok(!liftWord(c, 0, parseWord('ba')).closed, 'ba does not close')
}

console.log('covers.test.mjs: all passed')
