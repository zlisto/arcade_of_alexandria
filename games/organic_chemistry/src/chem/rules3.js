// Chapter 3 rules (McMurry, Organic Chemistry 10e, §3.1–3.7): alkane names, isomers by connectivity,
// carbon classes, IUPAC parent chains and numbering, and conformation energies.

// §3.2 — the first ten straight-chain alkanes
export const ALKANE_NAMES = ['methane', 'ethane', 'propane', 'butane', 'pentane', 'hexane', 'heptane', 'octane', 'nonane', 'decane']
export const ALKYL = { 1: 'methyl', 2: 'ethyl', 3: 'propyl', 4: 'butyl' }

// ---------------------------------------------------------------- graphs of carbons
// A carbon skeleton is an adjacency list: adj[i] = [j, k, …]. Alkanes here are trees (no rings — rings are Chapter 4).

/** Canonical code of a tree: the smallest rooted AHU string over all roots. Same code = same compound. */
export function treeCode(adj) {
  const n = adj.length
  const rooted = (v, parent) => '(' + adj[v].filter((u) => u !== parent).map((u) => rooted(u, v)).sort().join('') + ')'
  let best = null
  for (let r = 0; r < n; r++) { const c = rooted(r, -1); if (best === null || c < best) best = c }
  return best
}

/** Is this graph one connected tree with no carbon over four bonds? Returns null if fine, else a reason. */
export function checkSkeleton(adj) {
  const n = adj.length
  if (!n) return 'Place some carbons first.'
  const edges = adj.reduce((s, a) => s + a.length, 0) / 2
  const seen = new Set([0]), stack = [0]
  while (stack.length) { const v = stack.pop(); for (const u of adj[v]) if (!seen.has(u)) { seen.add(u); stack.push(u) } }
  if (seen.size !== n) return 'Every carbon must be bonded into one skeleton — some are floating on their own.'
  if (edges !== n - 1) return 'That closes a ring. Rings are cycloalkanes (Chapter 4); this garden grows open chains.'
  if (adj.some((a) => a.length > 4)) return 'A carbon can make only four bonds.'
  return null
}

// §3.3 — a carbon is 1°, 2°, 3° or 4° by how many other carbons it is bonded to
export const carbonClass = (adj, i) => adj[i].length // 1..4 (0 for methane's lone carbon)

/** The unique path between two carbons in a tree. */
export function pathBetween(adj, a, b) {
  const prev = new Map([[a, -1]]), q = [a]
  while (q.length) { const v = q.shift(); if (v === b) break; for (const u of adj[v]) if (!prev.has(u)) { prev.set(u, v); q.push(u) } }
  const out = []
  for (let v = b; v !== -1; v = prev.get(v)) out.push(v)
  return out.reverse()
}

/** Size of the branch hanging off chain atom `at` through `from` (a substituent's carbon count). */
function branchSize(adj, start, from) {
  let n = 0
  const st = [[start, from]]
  while (st.length) { const [v, p] = st.pop(); n++; for (const u of adj[v]) if (u !== p) st.push([u, v]) }
  return n
}

/** §3.4: substituents on a chain (array of atoms in numbering order): [{ locant, size }]. */
export function substituents(adj, chain) {
  const on = new Set(chain), out = []
  chain.forEach((v, i) => adj[v].forEach((u) => { if (!on.has(u)) out.push({ locant: i + 1, size: branchSize(adj, u, v) }) }))
  return out
}

/** All leaf-to-leaf chains, best first by IUPAC rules: longest; ties → more substituents; then lowest locants. */
export function rankChains(adj) {
  const leaves = adj.map((a, i) => (a.length === 1 ? i : -1)).filter((i) => i >= 0)
  const all = []
  for (const a of leaves) for (const b of leaves) if (a !== b) {
    const chain = pathBetween(adj, a, b)
    const subs = substituents(adj, chain)
    all.push({ chain, subs, locants: subs.map((s) => s.locant).sort((x, y) => x - y) })
  }
  const cmpLoc = (x, y) => { for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0 }
  all.sort((p, q) => q.chain.length - p.chain.length || q.subs.length - p.subs.length || cmpLoc(p.locants, q.locants))
  return all
}

/** Judge a walk from leaf a to leaf b as the parent chain, numbered from a. Returns { ok, why }. */
export function judgeWalk(adj, a, b) {
  const ranked = rankChains(adj)
  const best = ranked[0]
  const chain = pathBetween(adj, a, b)
  const subs = substituents(adj, chain)
  const loc = subs.map((s) => s.locant).sort((x, y) => x - y)
  if (chain.length < best.chain.length) return { ok: false, why: `Only ${chain.length} carbons. A longer chain (${best.chain.length}) runs here — chains can turn corners.` }
  if (subs.length < best.subs.length) return { ok: false, why: 'Two chains tie for longest. Pick the one with more branches on it.' }
  const same = loc.length === best.locants.length && loc.every((x, i) => x === best.locants[i])
  if (!same) return { ok: false, why: `Right chain, wrong end: branches at ${loc.join(',')}. Start nearer the first branch: ${best.locants.join(',')}.` }
  return { ok: true, chain, subs }
}

/** The IUPAC name from a chain and its substituents (simple alkyl groups only). */
export function nameFrom(chain, subs) {
  const groups = {}
  subs.forEach((s) => { const g = ALKYL[s.size]; (groups[g] = groups[g] || []).push(s.locant) })
  const MULT = ['', '', 'di', 'tri', 'tetra']
  const parts = Object.keys(groups).sort().map((g) => `${groups[g].sort((x, y) => x - y).join(',')}-${MULT[groups[g].length]}${g}`)
  return parts.join('-') + ALKANE_NAMES[chain.length - 1]
}

// ---------------------------------------------------------------- conformations (§3.6–3.7)
// dihedral in degrees between the two tracked groups (0 = eclipsed, 60 gauche/staggered, 180 anti)
const norm = (d) => ((Math.round(d) % 360) + 360) % 360
export const CONFORMERS = {
  // ethane: three H↔H eclipsing interactions ≈ 4.0 kJ/mol each → 12 kJ/mol (§3.6, Fig 3.8)
  ethane: { front: ['H', 'H', 'H'], back: ['H', 'H', 'H'], energy: (d) => (norm(d) % 120 === 0 ? 12 : 0), barrier: 12 },
  // propane: two H↔H plus one H↔CH₃ (6.0) → 14 kJ/mol (§3.7, Fig 3.9)
  propane: { front: ['CH₃', 'H', 'H'], back: ['H', 'H', 'H'], energy: (d) => (norm(d) % 120 === 0 ? 14 : 0), barrier: 14 },
  // butane about C2–C3, tracking the CH₃–CH₃ dihedral (§3.7, Fig 3.10)
  butane: { front: ['CH₃', 'H', 'H'], back: ['CH₃', 'H', 'H'], energy: (d) => ({ 0: 19, 60: 3.8, 120: 16, 180: 0, 240: 16, 300: 3.8 })[norm(d)] ?? 0, barrier: 19 },
}

export function conformerName(kind, d) {
  const a = norm(d)
  const eclipsed = a % 120 === 0
  if (kind !== 'butane') return eclipsed ? 'eclipsed' : 'staggered'
  if (a === 180) return 'anti'
  if (a === 60 || a === 300) return 'gauche'
  if (a === 0) return 'eclipsed · CH₃↔CH₃'
  return 'eclipsed · CH₃↔H'
}
