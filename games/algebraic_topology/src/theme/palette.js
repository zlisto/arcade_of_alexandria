/**
 * Winding World palette. Three identity colors, and land that takes none of them:
 *   teal   — Gyroid
 *   violet — Count Null and his spawn
 *   gold   — spines, the Lash, the Spool, beacons (what Gyroid makes)
 * The land is neutral blue-gray basalt so all three read clearly on it.
 */
export const LAND = {
  stone: '#4b5367', // reef tiles, island tops
  stoneEmissive: '#141a27',
  stoneLit: '#8a95b3', // a reef that has collapsed cleanly onto its spine
  stoneDark: '#323949', // island flanks, orb islands
  footprint: '#262d3c', // where the reef started (f₀)
  rock: '#1a1f29', // rock under islands, pillars
  causeway: '#c9dcff', // glowing routes between islands
  causewayCore: '#2c3550',
  light: '#a9bde0', // cool fill light over the land
}

export const GYROID_TEAL = '#3ecfbf'
export const NULL_VIOLET = '#8a3cff'
export const GOLD = '#ffb347'
