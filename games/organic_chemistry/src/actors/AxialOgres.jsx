import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, softDot } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, inCinematic, getState } from '../engine/store'

// Axial Ogres (World 4, book §4.6–4.7). Each ogre squats on a chair seal: a little cyclohexane ring glowing
// under its feet, with the ogre sitting in an equatorial seat. Equatorial is comfortable, so the sword
// glances off. Flip its seal with the Ring-Flip Gauntlet (G) and the ogre is forced axial: the two axial
// hydrogens three seats away (1,3-diaxial) bump it from both sides and it staggers. Then it can be hit.
// Built in Blender (tools/giants_blender.py → public/models/giants.glb).
preloadModels('giants')
const told = { glance: false, flip: false }
const STAGGER = 3.6

function OgreModel({ refCb, M }) {
  return (
    <group ref={refCb} visible={false}>
      <group name="body" scale={0.85}>
        <Part model="giants" name="ogr_body" mats={M} />
        <group name="arm" position={[0.62, 1.95, 0]}><Part model="giants" name="ogr_arm" mats={M} /></group>
      </group>
      {/* the chair seal under its feet: six points at alternating heights round a ring */}
      <group name="seal" position={[0, 0.04, -1.12]}>{/* the ogre stands on carbon 0 of its seal */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.05, 1.2, 6]} /><meshBasicMaterial name="ring" color="#6fe39a" transparent opacity={0.8} toneMapped={false} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return <mesh key={k} name={'c' + k} position={[Math.sin(a) * 1.12, 0.12, Math.cos(a) * 1.12]} material={M.seal}><sphereGeometry args={[k === 0 ? 0.17 : 0.1, 8, 6]} /></mesh> })}
      </group>
      {/* the two 1,3-diaxial hydrogens that bump it when it's forced axial */}
      {[-1, 1].map((s) => (
        <group key={s} name={'h' + (s > 0 ? 'R' : 'L')} visible={false}>
          <mesh material={M.hyd}><sphereGeometry args={[0.22, 14, 10]} /></mesh>
          <sprite scale={0.9}><spriteMaterial map={softDot()} color="#e8fcff" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
        </group>
      ))}
      {/* the ogre's bond to its seal, shown beside it: straight up when axial, tipped out round the equator when not */}
      <group name="bond" position={[0.95, 0.15, 0]}>
        <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.06, 0.06, 2.4, 8]} /><meshStandardMaterial color="#d8fbff" emissive="#5ae8ff" emissiveIntensity={1.4} toneMapped={false} /></mesh>
        <mesh position={[0, 2.45, 0]}><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#d8fbff" emissive="#5ae8ff" emissiveIntensity={1.6} toneMapped={false} /></mesh>
      </group>
      <mesh name="puff" visible={false}><sphereGeometry args={[1.0, 12, 10]} /><meshBasicMaterial color="#d8d0ff" transparent opacity={0.6} /></mesh>
    </group>
  )
}

/** spawns: [[x, z]]; decor: stands still, no fighting (seen before Kai has the Gauntlet). zone: [zMin, zMax] it keeps to. */
export default function AxialOgres({ world, spawns, active = true, decor = false, zone, onCleared, startAxial = [] }) {
  const M = useMemo(() => ({
    ogreSkin: rimMat({ color: '#7e8e5c', roughness: 0.7 }, '#e8ffb0', 0.35),
    ogreDark: rimMat({ color: '#56623e', roughness: 0.75 }, '#e8ffb0', 0.25),
    tusk: new THREE.MeshStandardMaterial({ color: '#efe4c8', roughness: 0.45 }),
    cloth: rimMat({ color: '#6a4a30', roughness: 0.9 }, '#ffcf9a', 0.15),
    eye: new THREE.MeshStandardMaterial({ color: '#ffd860', emissive: new THREE.Color('#ffb020'), emissiveIntensity: 1.4, toneMapped: false }),
    dark: new THREE.MeshBasicMaterial({ color: '#140e0e' }),
    club: rimMat({ color: '#5a5468', roughness: 0.85 }, '#d8d0ff', 0.2),
    rope: rimMat({ color: '#8a7050', roughness: 0.9 }, '#ffcf9a', 0.1),
    seal: new THREE.MeshStandardMaterial({ color: '#c8f8d8', emissive: new THREE.Color('#4ad87a'), emissiveIntensity: 1.2, toneMapped: false }),
    hyd: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color('#bfe8ff'), emissiveIntensity: 1.4, toneMapped: false }),
  }), [])
  const refs = useRef([])
  const ogres = useRef(spawns.map(([x, z], i) => ({ i, home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 0, z), state: 'idle', t: Math.random() * 2, hp: 3, facing: Math.PI, axial: startAxial[i] ? STAGGER + 1 : 0, cd: 1 + i * 0.4, hitT: 0, state0: startAxial[i] })))
  ogres.current.forEach((m) => { if (m.state0 && m.state === 'idle') m.state = 'stagger' })
  const cleared = useRef(false)
  const lastP = useRef(null)
  const lastKo = useRef(0)

  useEffect(() => {
    if (!active || decor) return
    const ids = []
    ogres.current.forEach((m) => {
      ids.push(world.addTarget({
        pos: () => [m.pos.x, 1.4, m.pos.z], radius: 0.95, tall: 2.2,
        alive: () => m.state !== 'dead' && m.state !== 'gone',
        onHit: () => {
          if (m.state === 'dead' || m.state === 'gone') return false
          if (m.axial <= 0) {
            sfx('block')
            if (!told.glance && toast('It shrugs the blade off. Its carbon sits low: equatorial, comfortable. Flip its seal (G) to force it axial.', 'warn', 4800, true)) told.glance = true
            return false
          }
          m.hp -= 1; m.hitT = 0.25; sfx('hit')
          if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('stomp') }
          return true
        },
      }))
      ids.push(world.addLantern({
        needs: 'hasGauntlet', pos: () => [m.pos.x, 0, m.pos.z], radius: 5, priority: 0.5,
        label: () => (m.state === 'dead' || m.state === 'gone' ? null : 'Flip the ogre’s seal'),
        onLantern: () => {
          if (m.state === 'dead' || m.state === 'gone') return
          if (m.axial > 0) { m.axial = 0; m.state = 'idle'; m.cd = 0.4; sfx('wrong'); if (!told.arm && toast('You flipped it equatorial: comfortable, armoured again. Before you flip, look at its carbon: raised is axial.', 'warn', 5200, true)) told.arm = true; return }
          m.axial = STAGGER; m.state = 'stagger'; m.t = 0; sfx('stomp')
          if (!told.flip && toast('Axial! The axial H on C3 and C5 bump it. Hit it!', 'good', 4600, true)) told.flip = true
        },
      }))
    })
    return () => ids.forEach((id) => world.remove(id))
  }, [active, decor])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = world.hitStop > 0 || inCinematic() || getState().dialogue || getState().panel ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    // Kai was knocked out and put back at the door: give him a moment before anyone charges
    const ko = (world.knockouts || 0) !== (lastKo.current || 0)
    lastKo.current = world.knockouts || 0
    const jumped = ko || (p && lastP.current && Math.hypot(p.pos.x - lastP.current[0], p.pos.z - lastP.current[1]) > 6)
    if (p) lastP.current = [p.pos.x, p.pos.z]
    if (jumped) ogres.current.forEach((m) => { m.cd = 3.5; if (m.state === 'windup' || m.state === 'slam') m.state = 'idle'; m.pos.copy(m.home) })
    const T = state.clock.elapsedTime
    let alive = 0
    for (const m of ogres.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      g.visible = true
      const body = g.getObjectByName('body'), arm = body.getObjectByName('arm'), seal = g.getObjectByName('seal'), puff = g.getObjectByName('puff')
      const hL = g.getObjectByName('hL'), hR = g.getObjectByName('hR')
      if (m.state === 'dead') {
        body.rotation.x = Math.min(1.4, m.t * 2.2)
        body.position.y = -Math.max(0, m.t - 0.6) * 1.5
        puff.visible = m.t > 0.5; puff.scale.setScalar(0.5 + (m.t - 0.5) * 3); puff.material.opacity = Math.max(0, 0.6 - (m.t - 0.5))
        hL.visible = hR.visible = false
        if (m.t > 1.6) m.state = 'gone'
        continue
      }
      alive++
      const to = p ? new THREE.Vector3(p.pos.x - m.pos.x, 0, p.pos.z - m.pos.z) : new THREE.Vector3()
      const d = to.length()
      if (decor) {
        body.position.y = Math.sin(T * 1.5 + m.i) * 0.02
        if (p && d < 18) m.facing += (Math.atan2(to.x, to.z) - m.facing) * Math.min(1, dt * 2)
      } else if (m.axial > 0) {
        // forced axial: bolt upright, rocked from both sides by the 1,3-diaxial hydrogens
        if (p && d < 9) m.seen = true
        if (!m.state0 || m.seen) m.axial -= dt // an ogre that starts axial holds until Kai is near
        const jolt = Math.sin(m.t * 16) * Math.max(0, 1 - m.t)
        body.rotation.z = jolt * 0.15
        body.position.y = 0.25 + Math.abs(Math.sin(m.t * 8)) * 0.08
        const k = Math.min(1, m.t * 4)
        hL.visible = hR.visible = true
        hL.position.set(-1.4 + Math.sin(m.t * 9) * 0.25 * k, 1.6, 0); hR.position.set(1.4 - Math.sin(m.t * 9) * 0.25 * k, 1.6, 0)
        if (m.axial <= 0) { m.state = 'idle'; m.cd = 0.8; body.rotation.z = 0; hL.visible = hR.visible = false; if (!told.back && toast('It flipped itself back to equatorial. Chairs flip fast, and a bulky group spends most of its time equatorial.', 'info', 5200, true)) told.back = true }
      } else {
        body.position.y = 0
        hL.visible = hR.visible = false
        m.cd -= dt
        if (m.state === 'idle') {
          const chase = p && d < 13
          const goal = chase ? to.clone().normalize() : m.home.clone().sub(m.pos).setY(0)
          if (!chase && goal.length() < 0.5) goal.set(0, 0, 0)
          else goal.normalize()
          const v = chase ? 1.9 : 1.0
          m.pos.addScaledVector(goal, v * dt)
          if (zone) m.pos.z = Math.max(zone[0], Math.min(zone[1], m.pos.z))
          const [cx, cz] = world.collide(m.pos.x, 0.1, m.pos.z, 0.8, 2)
          m.pos.x = cx; m.pos.z = cz
          if (chase) m.facing = Math.atan2(to.x, to.z)
          body.rotation.z = Math.sin(m.t * 5) * 0.04 * (chase ? 1 : 0.4)
          if (chase && d < 2.8 && m.cd <= 0) { m.state = 'windup'; m.t = 0 }
        } else if (m.state === 'windup') {
          arm.rotation.x = -Math.min(1.9, m.t * 2.4)
          if (m.t > 0.9) { m.state = 'slam'; m.t = 0; sfx('stomp'); world.shake = 0.25
            const fx = Math.sin(m.facing), fz = Math.cos(m.facing)
            const hx = m.pos.x + fx * 1.6, hz = m.pos.z + fz * 1.6
            if (p && Math.hypot(p.pos.x - hx, p.pos.z - hz) < 1.8) p.hurt(2, [m.pos.x, 0, m.pos.z])
          }
        } else if (m.state === 'slam') {
          arm.rotation.x = -1.9 + Math.min(2.6, m.t * 14)
          if (m.t > 0.7) { m.state = 'idle'; m.cd = 1.6; arm.rotation.x = 0 }
        }
      }
      if (m.hitT > 0) { m.hitT -= dt; body.position.x = Math.sin(m.hitT * 60) * 0.06 } else body.position.x = 0
      g.position.set(m.pos.x, 0, m.pos.z)
      g.rotation.y = m.facing
      // the seal stays one colour: its carbon 0 (the big one, under the ogre) sits raised while axial, lowered while equatorial
      const bond = g.getObjectByName('bond')
      if (bond) bond.rotation.z += ((m.axial > 0 ? 0 : -1.05) - bond.rotation.z) * Math.min(1, dt * 8)
      const ring = seal.children[0].material
      ring.color.set('#c8d0e0') // neutral: read the carbon it stands on, raised (axial) or lowered (equatorial)
      seal.children.slice(1).forEach((c, k) => { c.position.y = 0.12 + (m.axial > 0 ? (k % 2 ? -0.08 : 0.2) : (k % 2 ? 0.16 : -0.02)) })
    }
    if (!decor && alive === 0 && !cleared.current) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => <OgreModel key={i} M={M} refCb={(g) => (refs.current[i] = g)} />)}
      {!decor && spawns.map((_, i) => <OgreTag key={'t' + i} ogres={ogres} i={i} />)}
    </group>
  )
}

function OgreTag({ ogres, i }) {
  const g = useRef()
  const [on, setOn] = useState(false)
  useFrame(() => {
    const m = ogres.current[i]
    if (!m) return
    if (g.current) g.current.position.set(m.pos.x, 2.9, m.pos.z)
    const want = m.axial > 0 && m.state !== 'dead' && m.state !== 'gone'
    if (want !== on) setOn(want)
  })
  return <group ref={g}>{on && <Tag position={[0, 0, 0]} df={10}>axial · 1,3-diaxial strain!</Tag>}</group>
}
