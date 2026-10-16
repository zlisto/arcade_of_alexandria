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

export const GUIDE = { x: 0, z: 4.5, r: 0.45 }
GUIDE.rot = Math.atan2(SPAWNS.default.x - GUIDE.x, SPAWNS.default.z - GUIDE.z)

// Arcade cabinets: left and right rows. First game gets a real machine; extras are empty "coming soon" slots.
const leftZs = [-10, -5, 0, 5]
const rightZs = [-10, -5, 0, 5]
export const MACHINES = [
  ...leftZs.map((z, i) => ({
    id: GAMES[i]?.id ?? `empty_l_${i}`,
    gameId: GAMES[i]?.id ?? null,
    x: ROOM.xMin + 1.4,
    z,
    rot: Math.PI / 2, // face into the hall (+x)
    title: GAMES[i]?.title ?? 'Empty cabinet',
  })),
  ...rightZs.map((z, i) => ({
    id: GAMES[i + leftZs.length]?.id ?? `empty_r_${i}`,
    gameId: GAMES[i + leftZs.length]?.id ?? null,
    x: ROOM.xMax - 1.4,
    z,
    rot: -Math.PI / 2,
    title: GAMES[i + leftZs.length]?.title ?? 'Empty cabinet',
  })),
]

// Put Algebraic Topology on a prominent center-front cabinet too
export const FEATURED = {
  id: 'featured_algebraic_topology',
  gameId: 'algebraic_topology',
  x: 0,
  z: -8,
  rot: Math.PI, // face south, toward spawn
  title: 'Algebraic Topology',
}

export const ALL_MACHINES = [...MACHINES, FEATURED]

export function collide(pos) {
  pos.x = Math.max(ROOM.xMin + R_PLAYER, Math.min(ROOM.xMax - R_PLAYER, pos.x))
  pos.z = Math.max(ROOM.zMin + R_PLAYER, Math.min(ROOM.zMax - R_PLAYER, pos.z))
  // librarian
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
  // cabinets (rough boxes)
  for (const m of ALL_MACHINES) {
    const hw = 0.55
    const hd = 0.45
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
