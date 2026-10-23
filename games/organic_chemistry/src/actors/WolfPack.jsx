import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sfx } from '../audio/sfx'
import { toast } from '../engine/store'

// Radical Wolves (book §6.6, §10.2): each carries one unpaired electron.
// • A sword hit knocks a wolf back. If it lands without meeting another wolf, it abstracts an atom and
//   leaves a new radical behind — it SPLITS in two (chain propagation).
// • If a knocked wolf slams into another wolf, their unpaired electrons pair up — both vanish (termination).
// So the way to win is aim: lock on and knock wolves into each other.

const MAX = 6
const VIOLET = new THREE.Color('#a06bff')

function WolfBody({ refs, i }) {
  return (
    <group ref={(g) => (refs.current[i] = g)} visible={false}>
      <group name="body">
        <mesh position={[0, 0.62, 0]} scale={[0.42, 0.42, 0.95]} castShadow><sphereGeometry args={[1, 14, 12]} /><meshStandardMaterial color="#4a3466" roughness={0.7} emissive="#3a1a6a" emissiveIntensity={0.55} /></mesh>
        <mesh position={[0, 0.82, 0.7]} scale={[0.27, 0.27, 0.4]} castShadow><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#523a70" roughness={0.7} emissive="#3a1a6a" emissiveIntensity={0.45} /></mesh>
        <mesh position={[0, 0.76, 1.05]} scale={[0.14, 0.12, 0.25]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#1c1428" /></mesh>
        <mesh position={[-0.12, 1.06, 0.68]} rotation={[0, 0, 0.2]}><coneGeometry args={[0.07, 0.22, 6]} /><meshStandardMaterial color="#4a3466" emissive="#3a1a6a" emissiveIntensity={0.4} /></mesh>
        <mesh position={[0.12, 1.06, 0.68]} rotation={[0, 0, -0.2]}><coneGeometry args={[0.07, 0.22, 6]} /><meshStandardMaterial color="#4a3466" emissive="#3a1a6a" emissiveIntensity={0.4} /></mesh>
        <mesh position={[-0.1, 0.88, 0.95]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#d7b8ff" toneMapped={false} /></mesh>
        <mesh position={[0.1, 0.88, 0.95]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#d7b8ff" toneMapped={false} /></mesh>
        <mesh position={[0, 0.78, -0.95]} rotation={[0.9, 0, 0]}><coneGeometry args={[0.12, 0.6, 6]} /><meshStandardMaterial color="#4a3466" emissive="#3a1a6a" emissiveIntensity={0.4} /></mesh>
        {[[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.5], [0.2, -0.5]].map(([x, z], k) => (
          <mesh key={k} position={[x, 0.25, z]} name={'leg' + k}><capsuleGeometry args={[0.06, 0.36, 3, 6]} /><meshStandardMaterial color="#3a2a52" /></mesh>
        ))}
        {/* the unpaired electron */}
        <mesh position={[0, 0.98, 0.2]} name="spark"><sphereGeometry args={[0.15, 12, 10]} /><meshStandardMaterial color="#c9a6ff" emissive={VIOLET} emissiveIntensity={3} toneMapped={false} /></mesh>
        <pointLight position={[0, 0.7, 0.2]} color="#a06bff" intensity={1.2} distance={3.5} />
      </group>
      <mesh name="flash" visible={false}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#e9dcff" transparent opacity={0.6} toneMapped={false} /></mesh>
    </group>
  )
}

export default function WolfPack({ world, spawns, onCleared, active = true, tutorial = true, arena }) {
  const refs = useRef([])
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
        w.vel.set(dir[0], 0, dir[2]).multiplyScalar(kind === 'spin' ? 12 : 14)
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
        w.pos.addScaledVector(w.vel, dt)
        w.vel.y -= 14 * dt
        w.pos.y = Math.max(0, w.pos.y + w.vel.y * dt)
        w.vel.x *= 1 - dt * 2.2
        w.vel.z *= 1 - dt * 2.2
        if (arena) clampArena(w.pos, arena)
        const [cx, cz] = world.collide(w.pos.x, w.pos.y + 0.1, w.pos.z, 0.5, 0.9)
        if (Math.hypot(cx - w.pos.x, cz - w.pos.z) > 0.01) { w.vel.multiplyScalar(0.4); w.pos.x = cx; w.pos.z = cz }
        // termination: slam into another wolf → both pair and vanish
        for (const o of list) {
          if (!o || o === w || !(o.state === 'chase' || o.state === 'windup' || o.state === 'lunge' || o.state === 'knocked')) continue
          if (o.pos.distanceTo(w.pos) < 1.25) {
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
          // propagation: alone, it abstracts an atom and leaves another radical behind
          w.state = 'chase'
          w.t = 0
          const alive = list.filter((o) => o && o.state !== 'gone' && o.state !== 'pairing').length
          if (alive < MAX) {
            const a = Math.random() * Math.PI * 2
            const nw = spawnWolf(w.pos.x + Math.cos(a) * 1.6, w.pos.z + Math.sin(a) * 1.6)
            if (nw) { nw.flash = 0.4; sfx('split') }
            if (tutorial && !told.current.split) { told.current.split = true; toast('Hitting a radical just made another one! Knock a wolf INTO another wolf to pair them.', 'warn', 5200) }
          }
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
          if (l < 2.4 && l > 0.001) desired.addScaledVector(d.normalize(), (2.4 - l) * 3)
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
      const sp = body.getObjectByName('spark')
      sp.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 12 + i) * 0.25)
      const legSwing = Math.sin(state.clock.elapsedTime * 14 + i) * Math.min(1, w.vel.length() / 3) * 0.6
      for (let k = 0; k < 4; k++) { const l = body.getObjectByName('leg' + k); l.rotation.x = (k % 2 ? 1 : -1) * legSwing }
    }
    const pending = list.some((w) => w && (w.state === 'spawning' || w.state === 'pairing'))
    if (alive === 0 && !pending && !cleared.current && list.length) {
      cleared.current = true
      onCleared && onCleared()
    }
  })

  return <group>{[...Array(MAX)].map((_, i) => <WolfBody key={i} refs={refs} i={i} />)}</group>
}

function clampArena(p, a) {
  const dx = p.x - a.c[0]
  const dz = p.z - a.c[1]
  const d = Math.hypot(dx, dz)
  if (d > a.r) { p.x = a.c[0] + (dx / d) * a.r; p.z = a.c[1] + (dz / d) * a.r }
}
