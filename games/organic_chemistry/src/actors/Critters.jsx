import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { sfx } from '../audio/sfx'
import { toast } from '../engine/store'

// Overworld critters for the Tide Coast region (World 2).
// • Lone-Pair Imps (§2.11): small red imps carrying an electron pair, leaping at Kai. One hit pops them.
// • Hydronium Crabs (§2.7–2.9): blue crabs flinging protons. Their shell shrugs off the sword; block
//   (Shift) a proton and it flies back and knocks the crab out — a strong acid getting its own H⁺ back.

const told = { imp: false, crab: false, crabHit: false }

// ---------------------------------------------------------------- Lone-Pair Imps
function ImpModel({ refCb, M }) {
  return (
    <group ref={refCb} visible={false}>
      <group name="body">
        <mesh position={[0, 0.32, 0]} scale={[1, 1.1, 0.95]} material={M.red} castShadow><sphereGeometry args={[0.22, 16, 12]} /></mesh>
        <mesh position={[0, 0.62, 0.02]} material={M.red} castShadow><sphereGeometry args={[0.19, 16, 12]} /></mesh>
        {[-1, 1].map((s) => <mesh key={'e' + s} position={[s * 0.2, 0.68, 0]} rotation={[0, 0, -s * 1.1]} scale={[0.55, 1, 0.3]} material={M.redDark}><coneGeometry args={[0.12, 0.3, 8]} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={'h' + s} position={[s * 0.08, 0.82, 0.02]} rotation={[0.2, 0, -s * 0.35]} material={M.horn}><coneGeometry args={[0.03, 0.12, 6]} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={'y' + s} position={[s * 0.065, 0.66, 0.16]} scale={[1, 1.3, 0.5]} material={M.eye}><sphereGeometry args={[0.035, 10, 8]} /></mesh>)}
        <mesh position={[0, 0.56, 0.17]} rotation={[0.3, 0, Math.PI]} material={M.dark}><torusGeometry args={[0.05, 0.01, 6, 12, Math.PI]} /></mesh>
        <mesh position={[0, 0.25, -0.24]} rotation={[-0.9, 0, 0]} material={M.redDark}><coneGeometry args={[0.03, 0.3, 6]} /></mesh>
        {[-1, 1].map((s) => <mesh key={'l' + s} position={[s * 0.1, 0.08, 0]} material={M.redDark}><capsuleGeometry args={[0.045, 0.08, 3, 6]} /></mesh>)}
        {/* the lone pair, held out in both hands */}
        <group name="pair" position={[0, 0.38, 0.24]}>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, 0, 0]} material={M.pair}><sphereGeometry args={[0.05, 10, 8]} /></mesh>)}
        </group>
      </group>
      <mesh name="puff" visible={false}><sphereGeometry args={[0.5, 12, 10]} /><meshBasicMaterial color="#ffd0d0" transparent opacity={0.6} /></mesh>
    </group>
  )
}

export function ImpPack({ world, spawns, active = true }) {
  const M = useMemo(() => ({
    red: rimMat({ color: '#d0303c', roughness: 0.55 }, '#ffb0a0', 0.35),
    redDark: rimMat({ color: '#8a1c26', roughness: 0.6 }, '#ffb0a0', 0.3),
    horn: new THREE.MeshStandardMaterial({ color: '#2a1a1a', roughness: 0.4 }),
    eye: new THREE.MeshBasicMaterial({ color: '#fff3a0', toneMapped: false }),
    dark: new THREE.MeshBasicMaterial({ color: '#2a0a0a' }),
    pair: new THREE.MeshStandardMaterial({ color: '#fff7c0', emissive: new THREE.Color('#ffd760'), emissiveIntensity: 2, toneMapped: false }),
  }), [])
  const refs = useRef([])
  const imps = useRef(spawns.map(([x, z], i) => ({ i, home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), state: 'idle', t: Math.random(), cd: 0, facing: 0 })))
  useEffect(() => {
    if (!active) return
    const ids = imps.current.map((m) => world.addTarget({
      pos: () => [m.pos.x, m.pos.y + 0.4, m.pos.z],
      alive: () => m.state !== 'dead' && m.state !== 'gone',
      radius: 0.45,
      onHit: () => {
        if (m.state === 'dead' || m.state === 'gone') return false
        m.state = 'dead'; m.t = 0; sfx('pair')
        if (!told.imp) { told.imp = true; toast('Popped a Lone-Pair Imp! A lone pair is a Lewis base: it goes looking for something electron-poor (§2.11).', 'good', 4200) }
        return true
      },
    }))
    return () => ids.forEach((id) => world.remove(id))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = world.hitStop > 0 ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    for (const m of imps.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      g.visible = true
      const body = g.getObjectByName('body'), puff = g.getObjectByName('puff')
      if (m.state === 'dead') {
        body.scale.setScalar(Math.max(0.01, 1 - m.t * 3))
        puff.visible = true; puff.scale.setScalar(0.4 + m.t * 2.5); puff.material.opacity = Math.max(0, 0.6 - m.t)
        if (m.t > 0.6) m.state = 'gone'
        g.position.copy(m.pos); continue
      }
      puff.visible = false
      const to = p ? new THREE.Vector3(p.pos.x - m.pos.x, 0, p.pos.z - m.pos.z) : new THREE.Vector3()
      const d = to.length()
      if (m.state === 'idle' || m.state === 'hop') {
        m.cd -= dt
        if (m.cd <= 0) {
          // hop toward Kai if he's near, otherwise wander around home
          const aim = p && d < 14 ? to.clone().normalize() : m.home.clone().sub(m.pos).add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(4)).setY(0).normalize()
          m.vel.copy(aim).multiplyScalar(p && d < 14 ? 3.4 : 1.6); m.vel.y = 3.6
          m.cd = 0.75 + Math.random() * 0.3
          m.state = 'hop'
          if (p && d < 3.6) { m.state = 'windup'; m.t = 0; m.vel.set(0, 0, 0) }
        }
      } else if (m.state === 'windup') {
        if (m.t > 0.45) { m.state = 'leap'; m.t = 0; m.vel.copy(to.normalize()).multiplyScalar(8.5); m.vel.y = 4 }
      } else if (m.state === 'leap') {
        if (p && d < 0.8 && Math.abs(p.pos.y - m.pos.y) < 1 && !m.bit) { m.bit = true; p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.t > 0.5) { m.state = 'idle'; m.bit = false; m.cd = 1.1 }
      }
      // gravity and ground
      m.vel.y -= 14 * dt
      const ox = m.pos.x, oz = m.pos.z
      m.pos.addScaledVector(m.vel, dt)
      // stay on the floors: never hop out over water or a pit, never climb onto a higher tier
      let gy = world.groundAt(m.pos.x, m.pos.z, m.pos.y + 0.5)
      if (gy === -Infinity) { m.pos.x = ox; m.pos.z = oz; m.vel.x = 0; m.vel.z = 0; gy = world.groundAt(ox, oz, m.pos.y + 0.5); if (gy === -Infinity) gy = 0 }
      if (m.pos.y <= gy) { m.pos.y = gy; m.vel.y = 0; m.vel.x *= 0.6; m.vel.z *= 0.6 }
      const [cx, cz] = world.collide(m.pos.x, m.pos.y + 0.1, m.pos.z, 0.3, 0.6)
      m.pos.x = cx; m.pos.z = cz
      if (d > 0.1) m.facing = Math.atan2(to.x, to.z)
      g.position.copy(m.pos)
      g.rotation.y = m.facing
      body.scale.set(1, m.state === 'windup' ? 0.8 + Math.sin(m.t * 30) * 0.05 : 1, 1)
      body.getObjectByName('pair').position.y = 0.38 + Math.sin(state.clock.elapsedTime * 8 + m.i) * 0.03
    }
  })
  if (!active) return null
  return <group>{spawns.map((_, i) => <ImpModel key={i} M={M} refCb={(g) => (refs.current[i] = g)} />)}</group>
}

// ---------------------------------------------------------------- Hydronium Crabs
function CrabModel({ refCb, M }) {
  return (
    <group ref={refCb} visible={false}>
      <group name="body">
        <mesh position={[0, 0.3, 0]} scale={[1, 0.5, 0.8]} material={M.shell} castShadow><sphereGeometry args={[0.42, 20, 14]} /></mesh>
        {/* three hydrogens on the shell: H₃O⁺ */}
        {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.17, 0.5, Math.sin(a) * 0.14]} material={M.h}><sphereGeometry args={[0.07, 12, 10]} /></mesh> })}
        {[-1, 1].map((s) => <group key={'st' + s} position={[s * 0.12, 0.45, 0.28]}><mesh position={[0, 0.06, 0]} material={M.shellDark}><cylinderGeometry args={[0.018, 0.018, 0.14, 6]} /></mesh><mesh position={[0, 0.15, 0]} material={M.eye}><sphereGeometry args={[0.04, 8, 6]} /></mesh></group>)}
        {[-1, 1].map((s) => [0, 1, 2].map((k) => <mesh key={s + '-' + k} position={[s * 0.38, 0.14, -0.15 + k * 0.15]} rotation={[0, 0, s * 0.9]} material={M.shellDark}><capsuleGeometry args={[0.025, 0.22, 3, 6]} /></mesh>))}
        {/* claws; the right one holds up the proton */}
        {[-1, 1].map((s) => (
          <group key={'c' + s} name={s > 0 ? 'clawR' : 'clawL'} position={[s * 0.36, 0.32, 0.3]}>
            <mesh position={[0, 0, 0.1]} scale={[1, 0.7, 1.3]} material={M.shell}><sphereGeometry args={[0.11, 12, 10]} /></mesh>
            <mesh position={[s * 0.03, 0.03, 0.24]} rotation={[0.4, 0, 0]} material={M.shellDark}><coneGeometry args={[0.04, 0.14, 6]} /></mesh>
          </group>
        ))}
        <mesh name="proton" position={[0.36, 0.62, 0.4]} material={M.proton}><sphereGeometry args={[0.08, 12, 10]} /></mesh>
      </group>
      <mesh name="puff" visible={false}><sphereGeometry args={[0.6, 12, 10]} /><meshBasicMaterial color="#cfe8ff" transparent opacity={0.6} /></mesh>
    </group>
  )
}

export function CrabPack({ world, spawns, active = true }) {
  const M = useMemo(() => ({
    shell: rimMat({ color: '#2f6fd8', roughness: 0.25, metalness: 0.2 }, '#bfe0ff', 0.45),
    shellDark: rimMat({ color: '#1d4592', roughness: 0.35 }, '#bfe0ff', 0.3),
    h: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, emissive: new THREE.Color('#9fd0ff'), emissiveIntensity: 0.4 }),
    eye: new THREE.MeshBasicMaterial({ color: '#101820' }),
    proton: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color('#ffeedd'), emissiveIntensity: 2.5, toneMapped: false }),
  }), [])
  const refs = useRef([])
  const shots = useRef([])
  const shotRefs = useRef([])
  const crabs = useRef(spawns.map(([x, z], i) => ({ i, home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 0, z), state: 'walk', t: Math.random() * 2, side: 1, cd: 1 + Math.random() * 2, facing: 0 })))
  useEffect(() => {
    if (!active) return
    const ids = crabs.current.map((c) => world.addTarget({
      pos: () => [c.pos.x, 0.35, c.pos.z],
      alive: () => c.state !== 'dead' && c.state !== 'gone',
      radius: 0.5,
      onHit: () => {
        if (c.state === 'dead' || c.state === 'gone') return false
        sfx('block')
        if (!told.crabHit) { told.crabHit = true; toast('Clang — its shell is too hard. Block (Shift) the proton it throws and knock it back!', 'warn', 4200) }
        return false
      },
    }))
    return () => ids.forEach((id) => world.remove(id))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = world.hitStop > 0 ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    for (const c of crabs.current) {
      const g = refs.current[c.i]
      if (!g) continue
      c.t += dt
      if (c.state === 'gone') { g.visible = false; continue }
      g.visible = true
      const body = g.getObjectByName('body'), puff = g.getObjectByName('puff')
      if (c.state === 'dead') {
        body.rotation.z = Math.min(Math.PI, c.t * 8)
        puff.visible = true; puff.scale.setScalar(0.4 + c.t * 2); puff.material.opacity = Math.max(0, 0.6 - c.t)
        if (c.t > 0.8) c.state = 'gone'
        continue
      }
      puff.visible = false
      const to = p ? new THREE.Vector3(p.pos.x - c.pos.x, 0, p.pos.z - c.pos.z) : new THREE.Vector3()
      const d = to.length()
      const near = p && d < 12
      if (near) c.facing = Math.atan2(to.x, to.z)
      if (c.state === 'walk') {
        // sideways scuttle around home
        const side = new THREE.Vector3(Math.cos(c.facing), 0, -Math.sin(c.facing))
        c.pos.addScaledVector(side, Math.sin(c.t * 1.3) * 1.6 * dt)
        if (c.pos.distanceTo(c.home) > 3.5) c.pos.lerp(c.home, dt)
        c.cd -= dt
        if (near && c.cd <= 0) { c.state = 'windup'; c.t = 0 }
      } else if (c.state === 'windup') {
        if (c.t > 0.55 && p) {
          // fling the proton at Kai's chest
          const from = new THREE.Vector3(c.pos.x, 0.7, c.pos.z)
          const aim = new THREE.Vector3(p.pos.x, p.pos.y + 1.1, p.pos.z).sub(from).normalize()
          shots.current.push({ pos: from, vel: aim.multiplyScalar(8), owner: c, back: false, life: 3 })
          c.state = 'walk'; c.cd = 2.6 + Math.random() * 0.8; sfx('hookFire')
          if (!told.crab) { told.crab = true; toast('A Hydronium Crab (H₃O⁺, a strong acid) flings protons. Block with Shift to send one back!', 'info', 4200) }
        }
      }
      g.position.copy(c.pos)
      g.rotation.y = c.facing
      const clawR = body.getObjectByName('clawR')
      clawR.rotation.x = c.state === 'windup' ? -1.2 * Math.min(1, c.t * 2) : Math.sin(state.clock.elapsedTime * 3 + c.i) * 0.1
      body.getObjectByName('proton').visible = c.state === 'windup' || c.cd < 0.8
      body.position.y = Math.abs(Math.sin(c.t * 9)) * 0.02
    }
    // protons in flight: block reflects them; a reflected proton knocks its crab out
    shots.current = shots.current.filter((sh) => {
      sh.life -= dt
      sh.pos.addScaledVector(sh.vel, dt)
      if (sh.back) {
        const c = sh.owner
        if (c.state !== 'dead' && c.state !== 'gone' && sh.pos.distanceTo(new THREE.Vector3(c.pos.x, 0.5, c.pos.z)) < 0.8) {
          c.state = 'dead'; c.t = 0; sfx('pair')
          toast('The crab got its own proton back — knocked out!', 'good', 2200)
          return false
        }
      } else if (p && sh.pos.distanceTo(new THREE.Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z)) < 0.75) {
        const blocking = p.mode === 'block'
        const hit = p.hurt(1, [sh.pos.x, 0, sh.pos.z])
        if (!hit && blocking) {
          // bounce it straight back at the crab that threw it
          const c = sh.owner
          sh.vel = new THREE.Vector3(c.pos.x, 0.5, c.pos.z).sub(sh.pos).normalize().multiplyScalar(11)
          sh.back = true; sh.life = 2
          return true
        }
        return false
      }
      return sh.life > 0 && sh.pos.y > -1
    })
    for (let k = 0; k < 6; k++) {
      const m = shotRefs.current[k], sh = shots.current[k]
      if (!m) continue
      m.visible = !!sh
      if (sh) m.position.copy(sh.pos)
    }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => <CrabModel key={i} M={M} refCb={(g) => (refs.current[i] = g)} />)}
      {[...Array(6)].map((_, k) => <mesh key={'s' + k} ref={(m) => (shotRefs.current[k] = m)} visible={false} material={M.proton}><sphereGeometry args={[0.12, 12, 10]} /></mesh>)}
    </group>
  )
}
