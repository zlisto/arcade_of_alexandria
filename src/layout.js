import { pickSpawn } from './mvw.js'
import { GAMES } from './games.js'

// Arcade of Alexandria: a long hall of textbook-game cabinets, with Callimachus the librarian.
// Units are meters. +x = east, -z = north, y = up.

export const H = 5.2
export const SPEED = { walk: 12, run: 20 }
export const EYE = 1.65
export const R_PLAYER = 0.35
export const ROOM = { xMin: -14, xMax: 14, zMin: -18, zMax: 14 }

export const SPAWNS = {
  default: { x: 0, z: 8, yaw: 0 }, // facing the arcade down the hall
  from_square: { x: 0, z: -15.2, yaw: Math.PI }, // in front of hub portal, facing in
  hub_portal: { x: 0, z: -15.2, yaw: Math.PI },
}
export const SPAWN = pickSpawn(SPAWNS)

export const PORTAL = {
  x: 0,
  z: ROOM.zMin + 0.1,
  href: import.meta.env.DEV ? 'http://localhost:5178/' : 'https://zlisto.github.io/hub_world/',
  spawn: 'by_arcade_of_alexandria',
  back: 'from_square',
  label: 'Metaverse Square',
}

// At default spawn (0, 8) you face -z; left is -x. Blue floor is outside the ±1.6m beige aisle.
// Keep him close on that blue strip so you can turn left and talk — not down the hall behind a cabinet.
export const GUIDE = { x: -2.5, z: 7.2, r: 0.45 }
GUIDE.rot = Math.atan2(SPAWNS.default.x - GUIDE.x, SPAWNS.default.z - GUIDE.z)

// One cabinet per catalog game, alternating left / right down the hall.
const slots = [-12, -8, -4, 0, 4, 8]
export const MACHINES = GAMES.map((g, i) => {
  const left = i % 2 === 0
  const row = Math.floor(i / 2)
  return {
    id: g.id,
    gameId: g.id,
    x: left ? ROOM.xMin + 1.55 : ROOM.xMax - 1.55,
    z: slots[row] ?? 8,
    rot: left ? Math.PI / 2 : -Math.PI / 2,
    title: g.title,
  }
})

// Featured: Algebraic Topology just off the aisle (not blocking the walk or the librarian)
export const FEATURED = {
  id: 'featured_algebraic_topology',
  gameId: 'algebraic_topology',
  x: 3.2,
  z: -6,
  rot: -Math.PI / 2 + 0.35,
  title: 'Algebraic Topology',
}

export const ALL_MACHINES = [...MACHINES, FEATURED]

export function collide(pos) {
  pos.x = Math.max(ROOM.xMin + R_PLAYER, Math.min(ROOM.xMax - R_PLAYER, pos.x))
  pos.z = Math.max(ROOM.zMin + R_PLAYER, Math.min(ROOM.zMax - R_PLAYER, pos.z))
  {
    const dx = pos.x - GUIDE.x
    const dz = pos.z - GUIDE.z
    const d = Math.hypot(dx, dz)
    const rr = R_PLAYER + GUIDE.r
    if (d < rr && d > 1e-6) {
      pos.x = GUIDE.x + (dx / d) * rr
      pos.z = GUIDE.z + (dz / d) * rr
    }
  }
  for (const m of ALL_MACHINES) {
    const hw = 0.7
    const hd = 0.55
    const cx = Math.max(m.x - hw, Math.min(m.x + hw, pos.x))
    const cz = Math.max(m.z - hd, Math.min(m.z + hd, pos.z))
    const ex = pos.x - cx
    const ez = pos.z - cz
    const d = Math.hypot(ex, ez)
    if (d < R_PLAYER && d > 1e-6) {
      pos.x = cx + (ex / d) * R_PLAYER
      pos.z = cz + (ez / d) * R_PLAYER
    }
  }
  return pos
}

export function locate(x, z) {
  if (Math.hypot(x - GUIDE.x, z - GUIDE.z) < 2.4) return 'Arcade of Alexandria · with Callimachus'
  for (const m of ALL_MACHINES) {
    if (Math.hypot(x - m.x, z - m.z) < 2.2) return `Arcade of Alexandria · at ${m.title}`
  }
  if (z < PORTAL.z + 2.5) return 'Arcade of Alexandria · by the portal to Metaverse Square'
  if (z > 6) return 'Arcade of Alexandria · near the entrance'
  return 'Arcade of Alexandria · among the cabinets'
}
