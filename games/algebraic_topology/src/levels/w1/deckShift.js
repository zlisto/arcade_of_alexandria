/**
 * Deck transformations and normal covers for World 1 · Level 10.
 * Hatcher, Algebraic Topology, Chapter 1 (pp. 68–82): deck transformations,
 * normal covers, quotients by free properly discontinuous actions; S² → RP².
 *
 * A cover is { sheets, ports[], edges[] } in sheet-local indices:
 *   ports[p] = { node, matches: [{ sheet, edgeIdx, label }] } — one match per sheet at a base node
 *   edges[s][e] = { a, b, label } on sheet s (same graph on every sheet)
 * A deck shift is a permutation σ on {0..sheets-1}. It is valid if every port’s labels still
 * align after relabeling sheet i → sheet σ(i).
 */

export function permuteSheets(n, shift) {
  return Array.from({ length: n }, (_, i) => (i + shift + n) % n)
}

/** After applying cyclic shift `k`, which sheet index sits where sheet `s` was? */
export function sheetAt(cover, shift, s) {
  const σ = permuteSheets(cover.sheets, shift)
  return σ.indexOf(s)
}

export function isValidDeckShift(cover, shift) {
  const k = ((shift % cover.sheets) + cover.sheets) % cover.sheets
  if (k === 0) return true
  if (cover.validShifts) return cover.validShifts.includes(k)
  return false
}

/** BFS: sheets reachable from sheet 0 using valid nontrivial shifts as generators. */
export function reachableSheets(cover, generators = null) {
  const gens = generators ?? (cover.validShifts || []).filter((g) => g > 0)
  const seen = new Set([0])
  const q = [0]
  while (q.length) {
    const s = q.shift()
    for (const g of gens) {
      const σ = permuteSheets(cover.sheets, g)
      const t = σ[s]
      if (!seen.has(t)) {
        seen.add(t)
        q.push(t)
      }
    }
  }
  return seen
}

export function isNormalCover(cover) {
  const r = reachableSheets(cover)
  return r.size === cover.sheets
}

/** Antipodal sphere cover of RP²: two sheets, one equatorial loop lifts to a path between antipodes. */
export const ANTIPODAL_LOOPS = [
  { id: 'rim', closes: true, lift: 'closed' },
  { id: 'meridian', closes: true, lift: 'closed' },
  { id: 'half', closes: false, lift: 'antipodal' },
]

export function loopLiftKind(loopId) {
  return ANTIPODAL_LOOPS.find((l) => l.id === loopId)?.lift || 'closed'
}

/** Three-sheet cyclic cover of a triangle — rotation by 1 preserves all port labels. */
export const COVER_CYCLIC3 = {
  id: 'cyclic3',
  sheets: 3,
  validShifts: [1, 2],
  ports: [
    {
      id: 'hub',
      matches: [
        { sheet: 0, label: 'a', end: 'a' },
        { sheet: 1, label: 'a', end: 'a' },
        { sheet: 2, label: 'a', end: 'a' },
      ],
    },
    {
      id: 'east',
      matches: [
        { sheet: 0, label: 'b', end: 'b' },
        { sheet: 1, label: 'b', end: 'b' },
        { sheet: 2, label: 'b', end: 'b' },
      ],
    },
    {
      id: 'north',
      matches: [
        { sheet: 0, label: 'c', end: 'b' },
        { sheet: 1, label: 'c', end: 'b' },
        { sheet: 2, label: 'c', end: 'b' },
      ],
    },
  ],
}

/** Sheets 0 and 1 share ports; sheet 2 is isolated — not normal. */
export const COVER_LOPSIDED = {
  id: 'lopsided',
  sheets: 3,
  validShifts: [],
  ports: [
    {
      id: 'gate',
      matches: [
        { sheet: 0, label: 'u', end: 'a' },
        { sheet: 1, label: 'u', end: 'a' },
      ],
    },
    {
      id: 'lone',
      matches: [{ sheet: 2, label: 'v', end: 'a' }],
    },
  ],
}

/** Quotient of a segment by ℤ/2 flipping — two sheets, one deck shift swapping them. */
export const COVER_QUOTIENT = {
  id: 'quotient',
  sheets: 2,
  validShifts: [1],
  ports: [
    {
      id: 'mid',
      matches: [
        { sheet: 0, label: 's', end: 'a' },
        { sheet: 1, label: 's', end: 'b' },
      ],
    },
  ],
}

export function deckShiftLabel(cover, shift) {
  const k = ((shift % cover.sheets) + cover.sheets) % cover.sheets
  if (k === 0) return 'identity'
  return isValidDeckShift(cover, k) ? `rotate +${k}` : 'blocked'
}

export function alignedGuardWorldPos(sitePos, local, sheet, shift, sheetHeight = 0.55) {
  const σ = permuteSheets(3, shift)
  const stacked = σ.indexOf(sheet)
  return [sitePos[0] + local[0], sitePos[1] + local[1] - stacked * 0.08]
}
