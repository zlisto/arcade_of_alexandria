/**
 * Node tests: node src/levels/w1/glue.test.js
 */
import {
  attachDisk,
  emptyPresentation,
  freeReduce,
  isTrivial,
  parseWord,
  sameClass,
  vanKampenMerge,
  wordText,
} from './glue.js'

let pass = 0
let fail = 0
const ok = (name, cond) => {
  if (cond) {
    pass++
    console.log('  ok', name)
  } else {
    fail++
    console.error(' FAIL', name)
  }
}

console.log('glue.js')

ok('freeReduce cancels', wordText(freeReduce(parseWord('a a-'))) === '1')

let p = emptyPresentation(1)
p = attachDisk(p, parseWord('a'))
ok('disk on a kills a', isTrivial(p, parseWord('a')))
ok('disk on a kills a^-1', isTrivial(p, parseWord('a-')))

p = emptyPresentation(2)
p = attachDisk(p, parseWord('a b a- b-'))
ok('commutator: ab ~ ba', sameClass(p, parseWord('a b'), parseWord('b a')))
ok('commutator: aba- not trivial', !isTrivial(p, parseWord('a b a-')))

p = emptyPresentation(1)
p = attachDisk(p, parseWord('a a'))
ok('RP2: a nontrivial', !isTrivial(p, parseWord('a')))
ok('RP2: aa trivial', isTrivial(p, parseWord('a a')))

const left = emptyPresentation(1)
const right = { gens: 2, rels: [] }
const merged = vanKampenMerge(left, right, parseWord('a'), parseWord('b'))
ok('VK merge rel', merged.rels.length === 1)
ok('VK: a equals b', sameClass(merged, parseWord('a'), parseWord('b')))
ok('VK: a b^-1 trivial', isTrivial(merged, parseWord('a b-')))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
