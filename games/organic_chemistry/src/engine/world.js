// A small kinematic world: solid boxes (walls/blocks), floor slabs (walkable tops), triggers, and actors.
// Each scene builds one with createWorld() and registers geometry as it mounts.

let nextId = 1

export function createWorld() {
  const w = {
    solids: new Map(), // id -> { min:[x,y,z], max:[x,y,z], enabled }
    floors: new Map(), // id -> { min:[x,z], max:[x,z], y, enabled }
    triggers: new Map(), // id -> { min, max, onEnter, onExit, inside }
    targets: new Map(), // id -> { pos:()=>Vector3-like, radius, hp?, alive:()=>bool, onHit(dir, dmg, kind) }
    interactables: new Map(), // id -> { pos:[x,y,z], radius, label, onInteract, enabled }
    // hookshot targets: { pos:()=>[x,y,z] | [x,y,z], kind:'pull'|'hit', land?:[x,y,z], onHook?(), accepts?()=>true|string, enabled }
    hooks: new Map(),
    // Newman Lantern targets (World 3): { pos:()=>[x,y,z] | [x,y,z], radius, label, onLantern(), enabled }
    lanterns: new Map(),
    player: null, // set by Player: { pos, vel, state }
    time: 0,
    hitStop: 0,
    events: [],
    killY: -12,
    respawn: [0, 0, 0],
    // set by each scene for the map: { floor, wall, labels: [{ pos:[x,z], text }], goal: () => ({ pos:[x,z], label }) | null }
    map: null,
  }

  w.addSolid = (min, max) => { const id = nextId++; w.solids.set(id, { min, max, enabled: true }); return id }
  w.addFloor = (minX, minZ, maxX, maxZ, y = 0) => { const id = nextId++; w.floors.set(id, { min: [minX, minZ], max: [maxX, maxZ], y, enabled: true }); return id }
  w.remove = (id) => { w.solids.delete(id); w.floors.delete(id); w.triggers.delete(id); w.targets.delete(id); w.interactables.delete(id); w.hooks.delete(id); w.lanterns.delete(id) }
  w.addLantern = (l) => { const id = nextId++; w.lanterns.set(id, { enabled: true, radius: 3.2, ...l }); return id }
  w.addHook = (h) => { const id = nextId++; w.hooks.set(id, { enabled: true, kind: 'pull', ...h }); return id }
  w.setEnabled = (id, on) => { const s = w.solids.get(id) || w.floors.get(id) || w.interactables.get(id) || w.hooks.get(id) || w.lanterns.get(id); if (s) s.enabled = on }
  w.addTrigger = (min, max, onEnter, onExit) => { const id = nextId++; w.triggers.set(id, { min, max, onEnter, onExit, inside: false }); return id }
  w.addTarget = (t) => { const id = nextId++; w.targets.set(id, t); return id }
  w.addInteractable = (it) => { const id = nextId++; w.interactables.set(id, { enabled: true, radius: 1.8, ...it }); return id }

  /** Height of the highest floor under (x,z) that is at or below `maxY`; -Infinity over a pit. */
  w.groundAt = (x, z, maxY = Infinity, r = 0) => {
    let best = -Infinity
    for (const f of w.floors.values()) {
      if (!f.enabled) continue
      if (x + r * 0.5 < f.min[0] || x - r * 0.5 > f.max[0] || z + r * 0.5 < f.min[1] || z - r * 0.5 > f.max[1]) continue
      if (f.y <= maxY && f.y > best) best = f.y
    }
    for (const s of w.solids.values()) {
      if (!s.enabled) continue
      if (x < s.min[0] || x > s.max[0] || z < s.min[2] || z > s.max[2]) continue
      if (s.max[1] <= maxY && s.max[1] > best) best = s.max[1]
    }
    return best
  }

  /** Push a vertical capsule (center x,z, feet y, height h, radius r) out of solid boxes. Returns corrected [x,z]. */
  w.collide = (x, y, z, r, h) => {
    for (let pass = 0; pass < 2; pass++) {
      for (const s of w.solids.values()) {
        if (!s.enabled) continue
        if (y + h <= s.min[1] + 0.001 || y >= s.max[1] - 0.05) continue // above or below (standing on it)
        const cx = Math.max(s.min[0], Math.min(x, s.max[0]))
        const cz = Math.max(s.min[2], Math.min(z, s.max[2]))
        const dx = x - cx
        const dz = z - cz
        const d2 = dx * dx + dz * dz
        if (d2 >= r * r) continue
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2)
          x = cx + (dx / d) * r
          z = cz + (dz / d) * r
        } else {
          // center inside the box: push out along the shallowest axis
          const ex = [x - s.min[0], s.max[0] - x]
          const ez = [z - s.min[2], s.max[2] - z]
          const m = Math.min(ex[0], ex[1], ez[0], ez[1])
          if (m === ex[0]) x = s.min[0] - r
          else if (m === ex[1]) x = s.max[0] + r
          else if (m === ez[0]) z = s.min[2] - r
          else z = s.max[2] + r
        }
      }
    }
    return [x, z]
  }

  w.updateTriggers = (p) => {
    for (const t of w.triggers.values()) {
      const inside = p[0] >= t.min[0] && p[0] <= t.max[0] && p[1] >= t.min[1] - 0.5 && p[1] <= t.max[1] && p[2] >= t.min[2] && p[2] <= t.max[2]
      if (inside && !t.inside) { t.inside = true; t.onEnter && t.onEnter() }
      else if (!inside && t.inside) { t.inside = false; t.onExit && t.onExit() }
    }
  }

  w.nearestInteractable = (p) => {
    let best = null
    let bd = Infinity
    for (const it of w.interactables.values()) {
      if (!it.enabled) continue
      if (typeof it.label === 'function' && !it.label()) continue
      const pos = typeof it.pos === 'function' ? it.pos() : it.pos
      const d = Math.hypot(p[0] - pos[0], p[2] - pos[2])
      if (d < it.radius && d < bd && Math.abs(p[1] - pos[1]) < 2.5) { bd = d; best = it }
    }
    return best
  }

  /** Lowest solid underside above feet height y at (x,z) (Infinity if open sky). */
  w.ceilingAt = (x, z, y) => {
    let c = Infinity
    for (const s of w.solids.values()) {
      if (!s.enabled) continue
      if (x < s.min[0] || x > s.max[0] || z < s.min[2] || z > s.max[2]) continue
      if (s.min[1] > y + 0.2 && s.min[1] < c) c = s.min[1]
    }
    return c
  }

  w.emit = (type, data) => w.events.push({ type, data, t: w.time })
  return w
}
