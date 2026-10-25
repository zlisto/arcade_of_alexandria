import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sfx } from '../audio/sfx'
import { toast } from '../engine/store'
import { WolfBody, useWolfAssets, animateWolf } from './WolfModel'

// Radical Wolves (book §6.6, §10.2): each carries one unpaired electron.
// • A sword hit knocks a wolf back. If it lands without meeting another wolf, it abstracts an atom and
//   leaves a new radical behind — it SPLITS in two (chain propagation).
// • If a knocked wolf slams into another wolf, their unpaired electrons pair up — both vanish (termination).
// So the way to win is aim: lock on and knock wolves into each other.

const MAX = 6
// tuning for the "knock one into another" mechanic
const PAIR_RADIUS = 1.9 // how close two wolves must pass to pair (bodies are ~1.6 m long)
const AIM_CONE = Math.cos((55 * Math.PI) / 180) // aim assist: wolves within 55° of the knock direction…
const AIM_RANGE = 9 // …and this many metres away pull the knocked wolf toward them
const SPACING = 1.8 // hunting wolves keep at least this far apart (was 2.4)
const huntable = (o) => o && (o.state === 'chase' || o.state === 'windup' || o.state === 'lunge')
const pairable = (o) => huntable(o) || (o && o.state === 'knocked')
// distance from point c to the segment a→b, on the ground plane
function segDist(a, b, c) {
  const abx = b.x - a.x, abz = b.z - a.z
  const l2 = abx * abx + abz * abz
  const t = l2 > 1e-6 ? Math.max(0, Math.min(1, ((c.x - a.x) * abx + (c.z - a.z) * abz) / l2)) : 0
  return Math.hypot(a.x + abx * t - c.x, a.z + abz * t - c.z)
}

export default function WolfPack({ world, spawns, onCleared, active = true, tutorial = true, arena }) {
  const refs = useRef([])
  const A = useWolfAssets()
  const wolves = useRef([])
  const told = useRef({ split: false, pair: false })
  const ids = useRef([])
  const cleared = useRef(false)

  const spawnWolf = (x, z, delay = 0) => {
    const slot = wolves.current.findIndex((w) => !w || w.state === 'gone')
    const idx = slot >= 0 ? slot : wolves.current.length
    if (idx >= MAX) return null
    const w = { idx, pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), state: delay ? 'spawning' : 'chase', t: -delay, facing: 0, orbit: Math.random() * 6, attackCd: 1 + Math.random(), flash: 0 }
    wolves.current[idx] = w
    return w
  }

  useEffect(() => {
    if (!active) return
    cleared.current = false
    spawns.forEach(([x, z], k) => spawnWolf(x, z, k * 0.15))
    // register lock-on targets for every slot
    ids.current = [...Array(MAX)].map((_, i) => world.addTarget({
      pos: () => { const w = wolves.current[i]; return w ? [w.pos.x, w.pos.y, w.pos.z] : [0, -99, 0] },
      alive: () => { const w = wolves.current[i]; return !!w && (w.state === 'chase' || w.state === 'windup' || w.state === 'lunge' || w.state === 'knocked') },
      radius: 0.6,
      onHit: (dir, dmg, kind) => {
        const w = wolves.current[i]
        if (!w || w.state === 'knocked' || w.state === 'pairing' || w.state === 'gone') return false
        w.state = 'knocked'
        w.t = 0
        // aim assist: if another wolf is roughly where you knocked this one, fly straight at it
        const d = new THREE.Vector3(dir[0], 0, dir[2]).normalize()
        let best = null, bestScore = Infinity
        for (const o of wolves.current) {
          if (!huntable(o) || o === w) continue
          const v = new THREE.Vector3(o.pos.x - w.pos.x, 0, o.pos.z - w.pos.z)
          const dist = v.length()
          if (dist < 0.01 || dist > AIM_RANGE) continue
          const cos = v.dot(d) / dist
          if (cos < AIM_CONE) continue
          const score = dist * (2 - cos) // nearer and straighter wins
          if (score < bestScore) { bestScore = score; best = o }
        }
        w.homing = best
        if (best) {
          const v = new THREE.Vector3(best.pos.x - w.pos.x, 0, best.pos.z - w.pos.z)
          const gap = v.length()
          // fast enough to reach it before the knock wears off
          w.vel.copy(v.multiplyScalar(1 / gap)).multiplyScalar(Math.max(14, gap * 3.2))
        } else {
          w.vel.copy(d).multiplyScalar(kind === 'spin' ? 12 : 14)
        }
        w.vel.y = 3
        sfx('growl')
        return true
      },
    }))
    return () => { ids.current.forEach((id) => world.remove(id)); ids.current = []; wolves.current = [] }
  }, [active])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = world.hitStop > 0 ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    const list = wolves.current
    for (const w of list) {
      if (!w || w.state === 'gone') continue
      w.t += dt
      const g = refs.current[w.idx]
      if (w.state === 'spawning') { if (w.t >= 0) w.state = 'chase'; continue }
      if (w.state === 'pairing') {
        if (w.t > 0.55) w.state = 'gone'
        continue
      }
      const toP = p ? new THREE.Vector3(p.pos.x - w.pos.x, 0, p.pos.z - w.pos.z) : new THREE.Vector3()
      const dist = toP.length()
      if (w.state === 'knocked') {
        const prev = w.pos.clone()
        // keep homing on the chosen partner while it moves
        if (w.homing && huntable(w.homing)) {
          const v = new THREE.Vector3(w.homing.pos.x - w.pos.x, 0, w.homing.pos.z - w.pos.z)
          const sp = Math.hypot(w.vel.x, w.vel.z)
          if (v.lengthSq() > 0.01) { v.normalize().multiplyScalar(sp); w.vel.x += (v.x - w.vel.x) * Math.min(1, dt * 8); w.vel.z += (v.z - w.vel.z) * Math.min(1, dt * 8) }
        }
        w.pos.addScaledVector(w.vel, dt)
        w.vel.y -= 14 * dt
        w.pos.y = Math.max(0, w.pos.y + w.vel.y * dt)
        w.vel.x *= 1 - dt * 2.2
        w.vel.z *= 1 - dt * 2.2
        if (arena) clampArena(w.pos, arena)
        const [cx, cz] = world.collide(w.pos.x, w.pos.y + 0.1, w.pos.z, 0.5, 0.9)
        if (Math.hypot(cx - w.pos.x, cz - w.pos.z) > 0.01) { w.vel.multiplyScalar(0.4); w.pos.x = cx; w.pos.z = cz }
        // termination: slam into another wolf → both pair and vanish
        // checked along this frame's whole path, so a fast wolf can't skip past its partner
        for (const o of list) {
          if (!pairable(o) || o === w) continue
          if (segDist(prev, w.pos, o.pos) < PAIR_RADIUS) {
            w.state = 'pairing'; o.state = 'pairing'; w.t = 0; o.t = 0
            const mid = w.pos.clone().add(o.pos).multiplyScalar(0.5)
            w.pairAt = mid; o.pairAt = mid
            sfx('pair')
            world.emit('pair', { at: [mid.x, mid.y, mid.z] })
            if (tutorial && !told.current.pair) { told.current.pair = true; toast('Termination! Two radicals paired their electrons — both are gone.', 'good', 3600) }
            break
          }
        }
        if (w.state === 'knocked' && w.t > 0.75) {
          // alone, a radical just passes its unpaired electron along — still one radical, as angry as before.
          // The very last one, with no partner left, finally meets a stray H· and pairs with it (H–R).
          const others = list.filter((o) => o && o !== w && pairable(o)).length
          if (others === 0) {
            w.state = 'pairing'; w.t = 0; w.pairAt = w.pos.clone(); sfx('pair')
            world.emit('pair', { at: [w.pos.x, w.pos.y, w.pos.z] })
            if (tutorial) toast('The last radical grabbed a stray H· — two unpaired electrons, one bond. Gone!', 'good', 3600)
            continue
          }
          w.state = 'chase'
          w.t = 0
          w.flash = 0.4; sfx('split')
          if (tutorial && !told.current.split) { told.current.split = true; toast('Alone, it just passes its spark on — still a radical! Knock it into another wolf.', 'warn', 4600) }
        }
      } else if (p) {
        // chase / circle / lunge
        w.attackCd -= dt
        let desired = new THREE.Vector3()
        if (w.state === 'chase') {
          if (dist > 3.2) desired.copy(toP).normalize().multiplyScalar(4.6)
          else {
            w.orbit += dt * 0.9
            const tang = new THREE.Vector3(-toP.z, 0, toP.x).normalize()
            desired.copy(tang).multiplyScalar(2.4).addScaledVector(toP.clone().normalize(), (dist - 2.6) * 2)
          }
          if (w.attackCd <= 0 && dist < 4.5) { w.state = 'windup'; w.t = 0 }
        } else if (w.state === 'windup') {
          desired.set(0, 0, 0)
          if (w.t > 0.55) { w.state = 'lunge'; w.t = 0; w.lungeDir = toP.clone().normalize() }
        } else if (w.state === 'lunge') {
          desired.copy(w.lungeDir).multiplyScalar(12 * Math.max(0, 1 - w.t / 0.35))
          if (dist < 1.0 && !w.bit) { w.bit = true; p.hurt(1, [w.pos.x, 0, w.pos.z]) }
          if (w.t > 0.4) { w.state = 'chase'; w.t = 0; w.bit = false; w.attackCd = 1.8 + Math.random() * 1.5 }
        }
        // radicals keep apart from each other while hunting (so pairing needs the player's help)
        for (const o of list) {
          if (!o || o === w || o.state === 'gone' || o.state === 'pairing') continue
          const d = w.pos.clone().sub(o.pos); d.y = 0
          const l = d.length()
          if (l < SPACING && l > 0.001) desired.addScaledVector(d.normalize(), (SPACING - l) * 3)
        }
        w.vel.lerp(desired, Math.min(1, dt * 6))
        w.pos.addScaledVector(w.vel, dt)
        w.pos.y = 0
        const [cx, cz] = world.collide(w.pos.x, 0.1, w.pos.z, 0.5, 0.9)
        w.pos.x = cx; w.pos.z = cz
        if (arena) clampArena(w.pos, arena)
        if (w.vel.lengthSq() > 0.2 || w.state === 'windup') w.facing = Math.atan2(w.state === 'windup' ? toP.x : w.vel.x, w.state === 'windup' ? toP.z : w.vel.z)
      }
      w.flash = Math.max(0, w.flash - dt)
    }
    // render
    let alive = 0
    for (let i = 0; i < MAX; i++) {
      const g = refs.current[i]
      const w = list[i]
      if (!g) continue
      if (!w || w.state === 'gone' || w.state === 'spawning') { g.visible = false; continue }
      g.visible = true
      const body = g.getObjectByName('body')
      const flash = g.getObjectByName('flash')
      if (w.state === 'pairing') {
        const k = w.t / 0.55
        g.position.lerp(w.pairAt, 0.2)
        body.scale.setScalar(Math.max(0.01, 1 - k))
        flash.visible = true
        flash.scale.setScalar(0.5 + k * 1.8)
        flash.material.opacity = 0.7 * (1 - k)
        continue
      }
      alive++
      flash.visible = w.flash > 0
      if (flash.visible) { flash.scale.setScalar(0.9); flash.material.opacity = w.flash }
      body.scale.setScalar(w.state === 'windup' ? 1 + Math.sin(w.t * 30) * 0.04 : 1)
      g.position.copy(w.pos)
      g.rotation.y = w.facing
      g.rotation.z = w.state === 'knocked' ? Math.sin(w.t * 20) * 0.6 : 0
      animateWolf(g, state.clock.elapsedTime, w.vel.length(), i)
    }
    const pending = list.some((w) => w && (w.state === 'spawning' || w.state === 'pairing'))
    if (alive === 0 && !pending && !cleared.current && list.length) {
      cleared.current = true
      onCleared && onCleared()
    }
  })

  return <group>{[...Array(MAX)].map((_, i) => <WolfBody key={i} A={A} groupRef={(g) => (refs.current[i] = g)} />)}</group>
}

function clampArena(p, a) {
  const dx = p.x - a.c[0]
  const dz = p.z - a.c[1]
  const d = Math.hypot(dx, dz)
  if (d > a.r) { p.x = a.c[0] + (dx / d) * a.r; p.z = a.c[1] + (dz / d) * a.r }
}
