// Chemistry rules for World 4, the Chair Fortress (book Chapter 4, Cycloalkanes, pp. 105–134).
// Everything the puzzles judge comes from here, so it can be checked against the book in one place.

// ---------- §4.1 Naming substituted cycloalkanes
// A ring is n carbons, 0..n−1 round the ring. subs: { [carbon]: 'methyl' | 'ethyl' | 'bromo' | 'chloro' }.
// A numbering is a start carbon and a direction (+1 or −1). Step 2 of §4.1: start at a substituent and make
// the second substituent's number as low as possible, then the third…; if still tied, the substituent first
// in the alphabet gets the lower number. Halogens count just like alkyl groups.
export const RING_NAMES = { 3: 'cyclopropane', 4: 'cyclobutane', 5: 'cyclopentane', 6: 'cyclohexane', 7: 'cycloheptane', 8: 'cyclooctane' }
const MULT = ['', '', 'di', 'tri', 'tetra']

export function locantsFor(n, subs, start, dir) {
  // [{ locant, sub }] for this numbering, sorted by locant
  return Object.entries(subs).map(([c, sub]) => ({ locant: ((((+c - start) * dir) % n) + n) % n + 1, sub })).sort((a, b) => a.locant - b.locant)
}
function cmpLists(a, b) { for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0 }
/** All numberings ranked by the book's rules; the first is correct (several may tie exactly). */
export function bestNumberings(n, subs) {
  const all = []
  for (const c of Object.keys(subs)) for (const dir of [1, -1]) all.push({ start: +c, dir, list: locantsFor(n, subs, +c, dir) })
  const key = (x) => x.list.map((l) => l.locant)
  // alphabetical tie-break: compare the locant given to each substituent name, alphabetically ordered
  const alpha = (x) => [...x.list].sort((p, q) => p.sub.localeCompare(q.sub) || p.locant - q.locant).map((l) => l.locant)
  all.sort((p, q) => cmpLists(key(p), key(q)) || cmpLists(alpha(p), alpha(q)))
  return all
}
export function judgeNumbering(n, subs, start, dir) {
  if (subs[start] === undefined) return { ok: false, why: 'Carbon 1 must carry a substituent: start the numbering at a point of attachment.' }
  const ranked = bestNumberings(n, subs)
  const best = ranked[0]
  const mine = locantsFor(n, subs, start, dir)
  const m = mine.map((l) => l.locant), b = best.list.map((l) => l.locant)
  if (cmpLists(m, b) > 0) return { ok: false, why: `Your numbers are ${m.join(',')}. A lower number is possible for the next substituent: try the other direction, or another start.` }
  const alphaM = [...mine].sort((p, q) => p.sub.localeCompare(q.sub)), alphaB = [...best.list].sort((p, q) => p.sub.localeCompare(q.sub))
  if (cmpLists(alphaM.map((l) => l.locant), alphaB.map((l) => l.locant)) > 0) return { ok: false, why: 'The numbers tie either way round, so the alphabet decides who takes the lower number.' }
  return { ok: true, name: ringName(n, mine) }
}
export function ringName(n, list) {
  const groups = {}
  list.forEach(({ locant, sub }) => (groups[sub] = groups[sub] || []).push(locant))
  const parts = Object.keys(groups).sort().map((sub) => {
    const ls = groups[sub]
    if (list.length === 1) return sub
    return `${ls.join(',')}-${MULT[ls.length]}${sub}`
  })
  return parts.join('-') + RING_NAMES[n]
}

// ---------- §4.2 cis/trans on a ring: positions (relative numbering) and faces
// marks: { [carbon]: 'top' | 'bottom' }. want: { n, a, b, rel: 'cis' | 'trans' } with a, b the locants (1-based).
export function judgeCisTrans(n, marks, want) {
  const cs = Object.keys(marks).map(Number)
  if (cs.length !== 2) return { ok: false, why: cs.length < 2 ? 'Two methyl groups are needed.' : 'Only two methyl groups in this name.' }
  const d = Math.min((((cs[1] - cs[0]) % n) + n) % n, (((cs[0] - cs[1]) % n) + n) % n) // ring distance
  if (d !== want.b - want.a) return { ok: false, why: `Those are ${1}- and ${1 + d}-positions (numbered the short way). The name asks for ${want.a},${want.b}.` }
  const same = marks[cs[0]] === marks[cs[1]]
  if ((want.rel === 'cis') !== same) return { ok: false, why: `Right carbons, wrong faces: ${same ? 'both on one face is cis' : 'one up, one down is trans'}. The name asks for ${want.rel}.` }
  return { ok: true }
}

// ---------- §4.3–4.5 ring strain (Fig 4.4; text p. 111–115)
export const RING_STRAIN = [
  { n: 3, name: 'cyclopropane', strain: 115, flat: 60, real: '60° (rigid, flat) · every C–H eclipsed', why: 'Its 60° angles are far from 109.5°, and every neighbouring C–H is eclipsed: angle plus torsional strain.' },
  { n: 4, name: 'cyclobutane', strain: 110, flat: 90, real: 'puckered: one carbon about 25° out of the plane', why: 'Squeezed angles; it puckers about 25° to ease the eclipsing a little, but it is still nearly as strained as cyclopropane.' },
  { n: 5, name: 'cyclopentane', strain: 26, flat: 108, real: 'four carbons nearly flat, one out of the plane', why: 'Flat, its angles would be fine (108°) but every C–H would eclipse. It puckers, one carbon out of the plane; 26 kJ/mol is left.' },
  { n: 6, name: 'cyclohexane', strain: 0, flat: 120, real: 'chair · 111.5° · every C–H staggered', why: 'The chair: angles 111.5°, every neighbouring C–H staggered. No strain at all.' },
]

// ---------- §4.6 the chair: axial and equatorial
// Carbon k (0..5) of a chair in flip state f is raised ("up") when (k even) XOR f. An axial bond points
// straight up from an up-carbon and straight down from a down-carbon. So a group on the top face is axial
// on an up-carbon and equatorial on a down-carbon (and the reverse for the bottom face). A ring-flip swaps
// up/down carbons: every axial group becomes equatorial and vice versa, and no group changes face.
export const carbonUp = (k, flip) => ((k % 2 === 0) !== !!flip)
export const isAxial = (k, face, flip) => (face === 'top') === carbonUp(k, flip)

// ---------- §4.7–4.8 strain of a substituted chair, from the book's stated values (kJ/mol)
// per 1,3-diaxial interaction with one H: CH₃ 3.8 (p. 119), tert-butyl 11.4 and Cl 1.0 (Worked Example 4.3, p. 122);
// a gauche interaction between neighbouring CH₃ groups 3.8 (p. 121).
export const DIAXIAL_H = { methyl: 3.8, 'tert-butyl': 11.4, chloro: 1.0 }
export const SUB_LABEL = { methyl: 'CH₃', 'tert-butyl': 'C(CH₃)₃', chloro: 'Cl' }
/** subs: [{ c, face, kind }]. Returns { total, parts: [text] } for flip state f. */
export function chairStrain(subs, flip) {
  let total = 0
  const parts = []
  for (const s of subs) {
    if (!isAxial(s.c, s.face, flip)) continue
    const v = DIAXIAL_H[s.kind] * 2
    total += v
    parts.push(`axial ${SUB_LABEL[s.kind]}: 2 × ${DIAXIAL_H[s.kind]} = ${+v.toFixed(1)}`)
  }
  // neighbouring methyls: gauche (3.8) unless both axial (then they point opposite ways, anti) — Figs 4.16–4.17
  for (let i = 0; i < subs.length; i++) for (let j = i + 1; j < subs.length; j++) {
    const a = subs[i], b = subs[j]
    if (a.kind !== 'methyl' || b.kind !== 'methyl') continue
    if ((a.c - b.c + 6) % 6 !== 1 && (b.c - a.c + 6) % 6 !== 1) continue
    if (isAxial(a.c, a.face, flip) && isAxial(b.c, b.face, flip)) continue
    total += 3.8
    parts.push('gauche CH₃↔CH₃: 3.8')
  }
  return { total: +total.toFixed(1), parts }
}
export const TABLES = [
  { id: '4-4a', title: 'Methylcyclohexane', subs: [{ c: 0, face: 'top', kind: 'methyl' }], start: 0, sec: '4.7',
    done: 'Equatorial: 7.6 kJ/mol lower. At room temperature about 95% of methylcyclohexane sits this way.' },
  { id: '4-4d', title: 'cis-1,2-Dimethylcyclohexane', subs: [{ c: 0, face: 'top', kind: 'methyl' }, { c: 1, face: 'top', kind: 'methyl' }], start: 0, sec: '4.8',
    done: 'Equal! Each chair has one axial CH₃ (7.6) and one gauche pair (3.8): 11.4 kJ/mol either way (Fig 4.16).' },
  { id: '4-4b', title: 'trans-1,2-Dimethylcyclohexane', subs: [{ c: 0, face: 'top', kind: 'methyl' }, { c: 1, face: 'bottom', kind: 'methyl' }], start: 1, sec: '4.8',
    done: 'Diequatorial: only one gauche CH₃↔CH₃ (3.8). Diaxial has four 1,3-diaxial CH₃↔H (15.2). 11.4 kJ/mol in favour.' },
  { id: '4-4c', title: 'cis-1-tert-Butyl-4-chlorocyclohexane', subs: [{ c: 0, face: 'top', kind: 'tert-butyl' }, { c: 3, face: 'top', kind: 'chloro' }], start: 0, sec: '4.8',
    done: 'tert-Butyl equatorial, so Cl must go axial: 2 × 11.4 − 2 × 1.0 = 20.8 kJ/mol in favour. The big group wins the equator.' },
]
/** the lower-energy flip state for a table (null if both chairs are equal) */
export function bestFlip(subs) {
  const a = chairStrain(subs, false).total, b = chairStrain(subs, true).total
  return a === b ? null : a < b ? false : true
}

// ---------- §4.9 decalin: two fused chairs; bridgehead H faces
export const decalinKind = (h1, h2) => (h1 === h2 ? 'cis' : 'trans')
