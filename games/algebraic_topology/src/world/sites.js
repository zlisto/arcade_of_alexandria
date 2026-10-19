/**
 * Generic reef-site helpers for an overworld built from a layout JSON (sites with
 * shapes in site-local units, causeways between them). Retract Reef has its own copy
 * in reef.js; new levels (Mirror Shoals, …) use this.
 */
import { makeShape } from '../levels/w0/retraction'

const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  const u = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0
  return Math.hypot(x - (ax + u * dx), z - (az + u * dz))
}
export { segDist }

/** Sites with their shapes and local/world transforms. */
export function buildSites(layout) {
  return layout.sites.map((s) => {
    const shape = makeShape(s.shape)
    return {
      ...s,
      def: s.shape,
      shape,
      toLocal: (x, z) => [x - s.pos[0], z - s.pos[1]],
      toWorld: (x, z) => [x + s.pos[0], z + s.pos[1]],
      containsWorld: (x, z) => shape.inside(x - s.pos[0], z - s.pos[1]),
    }
  })
}

/** Walkable = any site or causeway (plus extra segments, e.g. a gate's exit once open). */
export function makeSiteWalkable(layout, sites, extra = []) {
  const half = layout.causewayWidth / 2
  const segs = [...layout.causeways.map((c) => [c.a, c.b]), ...extra]
  const inside = (x, z) => sites.some((s) => s.containsWorld(x, z)) || segs.some(([a, b]) => segDist(x, z, a, b) <= half)
  const insideForSpawn = (x, z) => sites.some((s) => s.containsWorld(x, z))
  return { inside, insideForSpawn, bounds: layout.bounds }
}

/** The site with a stage (a playable one) containing world point (x, z). */
export const siteAtIn = (sites) => (x, z) => sites.find((s) => s.stage && s.containsWorld(x, z)) || null
