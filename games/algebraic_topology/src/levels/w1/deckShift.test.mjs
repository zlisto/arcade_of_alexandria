import {
  ANTIPODAL_LOOPS,
  COVER_CYCLIC3,
  COVER_LOPSIDED,
  COVER_QUOTIENT,
  deckShiftLabel,
  isNormalCover,
  isValidDeckShift,
  loopLiftKind,
  reachableSheets,
} from './deckShift.js'

let failed = 0
function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    failed++
  } else console.log('ok:', msg)
}

ok(isValidDeckShift(COVER_CYCLIC3, 1), 'cyclic3 rotate +1 valid')
ok(isValidDeckShift(COVER_CYCLIC3, 2), 'cyclic3 rotate +2 valid')
ok(isNormalCover(COVER_CYCLIC3), 'cyclic3 is normal')
ok(reachableSheets(COVER_CYCLIC3).size === 3, 'cyclic3 reaches all sheets')

ok(!isValidDeckShift(COVER_LOPSIDED, 1), 'lopsided +1 blocked')
ok(!isNormalCover(COVER_LOPSIDED), 'lopsided not normal')
ok(reachableSheets(COVER_LOPSIDED).size === 1, 'lopsided deck group fixes sheet 0 only')

ok(isValidDeckShift(COVER_QUOTIENT, 1), 'quotient swap valid')
ok(isNormalCover(COVER_QUOTIENT), 'quotient normal')

ok(loopLiftKind('half') === 'antipodal', 'half loop antipodal lift')
ok(ANTIPODAL_LOOPS.filter((l) => l.lift === 'antipodal').length === 1, 'one antipodal loop')
ok(deckShiftLabel(COVER_CYCLIC3, 1) === 'rotate +1', 'label rotate')

if (failed) {
  console.error(`${failed} test(s) failed`)
  process.exit(1)
}
console.log('All deckShift tests passed.')
