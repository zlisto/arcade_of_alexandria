import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv, softDot } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, inCinematic, getState } from '../engine/store'

// World 6's people and creatures, built in Blender (tools/peaks_folk_blender.py → public/models/peaksfolk.glb):
// • Pass-Warden Hammond, the mountain guide (assets/characters/warden-hammond.png).
// • Carbocation Wisps (§6.4): flat ghosts with an empty orbital — a carbon with only six electrons and a positive
//   charge. A sword passes right through. They are electrophiles: the Hookshot, which latches only on
//   electron-poor things, catches one and drags it to Kai, solid for a moment; then strike.
preloadModels('peaksfolk')

export function Hammond(props) {
  const gl = useThree((s) => s.gl)
  const M = useMemo(() => {
    const env = getEnv(gl)
    return {
      parka: rimMat({ color: '#d0682c', roughness: 0.75 }, '#ffd0a0', 0.35), parkaDark: rimMat({ color: '#8a4018', roughness: 0.8 }, '#ffd0a0', 0.25),
      fur: rimMat({ color: '#f2ece2', roughness: 0.95 }, '#ffffff', 0.35, 2), trousers: rimMat({ color: '#2a2a30', roughness: 0.9 }, '#c8d0e0', 0.15),
      boots: rimMat({ color: '#3a2a1e', roughness: 0.8 }, '#ffcf9a', 0.15), glove: rimMat({ color: '#5a3a24', roughness: 0.75 }, '#ffcf9a', 0.2),
      belt: rimMat({ color: '#2a1e16', roughness: 0.6 }, '#ffcf9a', 0.1), buckle: new THREE.MeshStandardMaterial({ color: '#a0a0ae', metalness: 0.85, roughness: 0.3, envMap: env }),
      rope: rimMat({ color: '#8a7050', roughness: 0.9 }, '#ffcf9a', 0.15), skin: rimMat({ color: '#d49a7e', roughness: 0.6 }, '#ffd0b0', 0.2, 3),
      beard: rimMat({ color: '#8e8e92', roughness: 0.85 }, '#ffffff', 0.3, 2), wood: rimMat({ color: '#6a4428', roughness: 0.75 }, '#ffcf9a', 0.2),
      eye: new THREE.MeshStandardMaterial({ color: '#f2eee8', roughness: 0.3 }), iris: new THREE.MeshBasicMaterial({ color: '#2a3a4a' }), dark: new THREE.MeshBasicMaterial({ color: '#141010' }),
    }
  }, [gl])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 4.4) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="peaksfolk" name="ham_body" mats={M} />
      <group ref={eyes} position={[0, 1.6, 0.04]}><Part model="peaksfolk" name="ham_eyes" mats={M} castShadow={false} /></group>
      <pointLight position={[0, 2.3, 1]} color="#ffd8b0" intensity={1.2} distance={5} />
    </group>
  )
}

const told = { pass: false, hooked: false }
export function Wisps({ world, spawns, active = true, zone }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: new THREE.Color('#7ac8ff'), emissiveIntensity: 1.6, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }), [])
  const matsArr = useMemo(() => spawns.map(() => ({ wisp: mat.clone() })), [mat])
  const refs = useRef([])
  const ws = useRef(spawns.map(([x, z], i) => ({ i, home: new THREE.Vector3(x, 0, z), pos: new THREE.Vector3(x, 0, z), t: Math.random() * 6, state: 'float', hp: 2, solid: 0 })))
  useEffect(() => {
    if (!active) return
    const ids = []
    ws.current.forEach((m) => {
      ids.push(world.addTarget({
        pos: () => [m.pos.x, 1.4, m.pos.z], radius: 0.7, tall: 1.6, alive: () => m.state !== 'gone' && m.state !== 'dead',
        onHit: () => {
          if (m.solid <= 0) { if (!told.pass) { told.pass = true; toast('The blade passes through: a carbocation, an empty orbital and a + charge. It is electron-poor. What latches onto electron-poor things?', 'warn', 5400, true) } return false }
          m.hp--; sfx('hit'); if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('pair') }
          return true
        },
      }))
      ids.push(world.addHook({
        pos: () => [m.pos.x, 1.5, m.pos.z], kind: 'hit', enabled: true,
        accepts: () => true,
        onHook: () => { m.solid = 3.5; sfx('hookHit'); if (!told.hooked) { told.hooked = true; toast('Hooked! An electrophile takes what the hook gives: for a moment it holds still and solid. Strike!', 'good', 4400, true) } },
      }))
    })
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = inCinematic() || getState().dialogue || getState().panel ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    for (const m of ws.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.scale.setScalar(Math.max(0.01, 1 - m.t * 2)); if (m.t > 0.5) m.state = 'gone'; continue }
      const inZone = p && (!zone || (p.pos.z > zone[0] && p.pos.z < zone[1]))
      if (m.solid > 0) m.solid -= dt
      else if (inZone) {
        // drift toward Kai, swaying; touch hurts
        const to = new THREE.Vector3(p.pos.x - m.pos.x, 0, p.pos.z - m.pos.z)
        const d = to.length()
        if (d > 0.6) m.pos.addScaledVector(to.normalize(), 1.4 * dt)
        m.pos.x += Math.sin(m.t * 1.7 + m.i) * 0.6 * dt
        if (d < 1.0 && (m.bite || 0) <= 0) { p.hurt(1, [m.pos.x, 0, m.pos.z]); m.bite = 1.5 }
      }
      if (m.bite > 0) m.bite -= dt
      g.position.set(m.pos.x, Math.sin(m.t * 2) * 0.15, m.pos.z)
      g.rotation.y = m.t * 0.6
      matsArr[m.i].wisp.opacity = m.solid > 0 ? 1 : 0.5
    }
  })
  if (!active) return null
  return <group>{spawns.map((_, i) => <group key={i} ref={(g) => (refs.current[i] = g)}><Part model="peaksfolk" name="wsp_body" mats={matsArr[i]} castShadow={false} /><pointLight position={[0, 1.5, 0]} color="#9ad8ff" intensity={1.6} distance={4} /></group>)}</group>
}
