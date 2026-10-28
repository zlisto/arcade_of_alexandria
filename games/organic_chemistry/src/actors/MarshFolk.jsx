import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, enemiesPaused } from '../engine/store'
import { HYDRA10 } from '../chem/rules10'

// World 10's people and creatures, built in Blender (tools/magnus_blender.py → public/models/magnus.glb):
// • Old Magnus (assets/characters/old-magnus.png).
// • Grignard Golems (§10.6): armoured in halide crystal, a δ+ carbon that shrugs off blows. The Magnesium Ring (G)
//   inserts Mg into the C–X bond: the carbon turns δ−, a carbanion and a very strong base. Its armour falls away;
//   strike it and the marsh water protonates it to an alkane (RMgX + H₂O → RH).
// • The Allylic Hydra (§10.3–10.4): two heads on one allyl body, the unpaired electron shared equally by both
//   ends. Strike one head and the other still holds the radical: hit both, quickly. Then ring its brominated tail.
preloadModels('magnus')

export function Magnus(props) {
  const M = useMemo(() => ({
    moss: rimMat({ color: '#4e5e2e', roughness: 0.95 }, '#d8ffc0', 0.3), mossDark: rimMat({ color: '#2e3a1a', roughness: 0.95 }, '#d8ffc0', 0.2),
    tunic: rimMat({ color: '#3a3428', roughness: 0.85 }, '#e8f0d8', 0.2), skin: rimMat({ color: '#d8b098', roughness: 0.6 }, '#f0ffe0', 0.25, 3),
    beard: rimMat({ color: '#c0c0b8', roughness: 0.85 }, '#ffffff', 0.35),
  }), [])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 4.8) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="magnus" name="mag_body" mats={M} />
      <group ref={eyes} position={[0, 1.72, 0.05]}><Part model="magnus" name="mag_eyes" castShadow={false} /></group>
      <pointLight position={[-0.33, 1.4, 0.4]} color="#7aff8a" intensity={2.5} distance={5} />
    </group>
  )
}

const told = { armour: false, ring: false }
/** Grignard Golems: blows glance off until the Magnesium Ring flips the carbon's polarity. */
export function Golems({ world, spawns, active = true, zone, onCleared }) {
  const gs = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), home: new THREE.Vector3(x, 0, z), face: 0, hp: 2, state: 'idle', t: 0, cd: 2 + i, mg: false })))
  const refs = useRef([]), cores = useRef([])
  const cleared = useRef(false)
  const [, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    const ids = []
    gs.current.forEach((m) => {
      ids.push(world.addTarget({
        pos: () => [m.pos.x, 1.4, m.pos.z], radius: 0.9, tall: 2.4, alive: () => m.state !== 'dead' && m.state !== 'gone',
        onHit: () => {
          if (!m.mg) { sfx('block'); if (!told.armour) { told.armour = true; toast('The blade rings off its halide armour: a δ+ carbon, well defended. Put a magnesium ring on it (G).', 'warn', 4800, true) } return false }
          m.hp--; sfx('hit'); m.state = 'stagger'; m.t = 0
          if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('pair'); setN((n) => n + 1); toast('The marsh water gets it: a Grignard is a very strong base, and water protonates it to an alkane.', 'good', 4600, true) }
          return true
        },
      }))
      ids.push(world.addLantern({ needs: 'hasRing', omni: true, pos: () => [m.pos.x, 0, m.pos.z], radius: 4, label: () => (m.mg || m.state === 'dead' || m.state === 'gone' ? null : 'Slip the Magnesium Ring onto its C–X bond'), onLantern: () => {
        m.mg = true; m.state = 'stagger'; m.t = 0; sfx('shard')
        if (!told.ring) { told.ring = true; toast('Mg slides into the C–X bond: R–MgX. The carbon turns δ−, electron-rich, a carbanion. Its armour falls away. Strike!', 'good', 5200, true) }
      } }))
    })
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    let alive = 0
    for (const m of gs.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.position.y = -m.t * 2; if (m.t > 1) m.state = 'gone'; continue }
      alive++
      const inZone = p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
      if (inZone) {
        const want = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        m.face += (want - m.face) * Math.min(1, dt * 2)
        const d = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        if (m.state === 'idle' && d > 2.2) { m.pos.x += Math.sin(want) * dt * (m.mg ? 0.8 : 1.4); m.pos.z += Math.cos(want) * dt * (m.mg ? 0.8 : 1.4) }
        m.cd -= dt
        if (m.state === 'idle' && d < 2.6 && m.cd <= 0) { m.state = 'slam'; m.t = 0 }
      }
      if (m.state === 'slam' && m.t > 0.8 && !m.struck) { m.struck = true; sfx('stomp'); world.shake = 0.3; if (p && !p.rolling && Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 2.8) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
      if (m.state === 'slam' && m.t > 1.4) { m.state = 'idle'; m.struck = false; m.cd = 2.6 }
      if (m.state === 'stagger' && m.t > 0.8) m.state = 'idle'
      g.position.set(m.pos.x, 0, m.pos.z)
      g.rotation.y = m.face
      g.rotation.x = m.state === 'slam' ? -Math.min(0.3, m.t * 0.5) + (m.t > 0.8 ? 0.5 : 0) : 0
      const c = cores.current[m.i]
      if (c) c.material.color.set(m.mg ? '#a060ff' : '#ff3a3a')
    }
    if (alive === 0 && !cleared.current && gs.current.every((m) => m.state === 'gone' || m.state === 'dead')) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => (
        <group key={i} ref={(r) => (refs.current[i] = r)}>
          <Part model="magnus" name="gol_body" />
          <mesh ref={(r) => (cores.current[i] = r)} position={[0, 1.42, 0.45]}><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial color="#ff3a3a" toneMapped={false} /></mesh>
          <pointLight position={[0, 1.4, 0.8]} color="#ff5a3a" intensity={1.5} distance={4} />
          {gs.current[i] && gs.current[i].mg && <Tag position={[0, 3.0, 0]} df={9}>R–MgX · δ− carbon</Tag>}
        </group>
      ))}
    </group>
  )
}

const NAME = 'The Allylic Hydra · CH₂=CH–CH₂·'
/** The boss: hit both heads within the window (the radical lives on both ends), then ring its brominated tail. */
export default function Hydra10({ world, center, active, onDefeated }) {
  const [round, setRound] = useState(0)
  const st = useRef({ mode: 'fight', t: 0, first: null, firstT: 0, biteT: 3, biting: -1, sink: 0 })
  const heads = useRef([]), body = useRef(), glow = useRef()
  const P = HYDRA10[Math.min(round, 2)]
  const headPos = (k) => { const s = st.current; const sway = Math.sin(performance.now() / 600 + k * 2) * 0.6; return [center[0] + (k ? 3.2 : -3.2) + (s.biting === k ? (k ? -1 : 1) * 1.2 : 0), 2.4, center[2] + 1.2 + sway + (s.biting === k ? 2.6 : 0)] }
  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: 3 - round, max: 3 } })
    world.bossCam = true
    s.mode = 'fight'; s.first = null
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), hydra10: s, hydraRound: () => round }
    const ids = [0, 1].map((k) => world.addTarget({
      pos: () => headPos(k), radius: 1.0, tall: 1.6, alive: () => s.mode === 'fight',
      onHit: () => {
        sfx('hit')
        const now = performance.now() / 1000
        if (s.first === null || s.first === k || now - s.firstT > P.window) {
          s.first = k; s.firstT = now
          if (!s.toldOne) { s.toldOne = true; toast('It shrugs: the other head still holds the radical. The electron is shared by both ends. Hit both, fast!', 'warn', 4600, true) }
          return true
        }
        s.mode = 'open'; s.t = 0; s.first = null; sfx('pair'); world.shake = 0.3
        toast('Both ends at once! Its radical is pinned down. Now ring the brominated tail (G)!', 'good', 4200)
        return true
      },
    }))
    ids.push(world.addLantern({ needs: 'hasRing', omni: true, priority: 1, pos: [center[0], 0, center[2] - 3.2], radius: 4.5, label: () => (s.mode === 'open' ? 'Ring the C–Br tail: make it a Grignard' : null), onLantern: () => {
      if (s.mode !== 'open') return
      s.mode = 'sink'; s.t = 0; sfx('shard'); world.shake = 0.5
      const next = round + 1
      setState({ bossHp: { name: NAME, hp: 3 - next, max: 3 } })
      toast(next >= 3 ? 'Its tail turns Grignard, and the marsh water does the rest.' : 'R–MgBr! It thrashes into the water, protonated. It climbs back out…', 'good', 4200)
      if (next >= 3) setTimeout(() => onDefeated && onDefeated(), 2200)
      else setTimeout(() => setRound(next), 2600)
    } }))
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += dt
    const p = world.player
    if (s.mode === 'open' && s.t > 6) { s.mode = 'fight'; toast('Too slow: the radical slips free again.', 'warn', 3000, true) }
    if (s.mode === 'fight') {
      s.biteT -= dt
      if (s.biteT <= 0 && s.biting < 0 && p) { s.biting = p.pos.x < center[0] ? 0 : 1; s.biteAt = 0; sfx('dash') }
      if (s.biting >= 0) {
        s.biteAt += dt
        if (s.biteAt > 0.5 && !s.bitHit) { s.bitHit = true; const hp = headPos(s.biting); if (p && !p.rolling && Math.hypot(p.pos.x - hp[0], p.pos.z - hp[2]) < 2.2) p.hurt(1, [hp[0], 0, hp[2]]) }
        if (s.biteAt > 1.1) { s.biting = -1; s.bitHit = false; s.biteT = P.bite }
      }
    }
    heads.current.forEach((g, k) => {
      if (!g) return
      const hp = headPos(k)
      g.position.set(hp[0] - center[0], hp[1] - (s.mode === 'open' ? 1.0 : 0) - (s.mode === 'sink' ? s.t * 2 : 0), hp[2] - center[2])
      if (p) g.rotation.y = Math.atan2(p.pos.x - hp[0], p.pos.z - hp[2])
    })
    if (body.current) body.current.position.y = s.mode === 'sink' ? -s.t * 2 : s.mode === 'open' ? -0.6 : 0
    if (glow.current) glow.current.intensity = s.mode === 'open' ? 1 : 3 + Math.sin(state.clock.elapsedTime * 6)
    if (s.mode === 'sink' && s.t > 2.4 && round < 3) { s.mode = 'fight'; s.t = 0 }
  })
  return (
    <group position={center}>
      {/* the pool round it */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[6.5, 40]} /><meshStandardMaterial color="#5a4a2a" metalness={0.3} roughness={0.2} /></mesh>
      <group ref={body}><Part model="magnus" name="hyd_body" scale={2} /><pointLight ref={glow} position={[0, 4.5, 0]} color="#ffe8a0" intensity={3} distance={9} /></group>
      {[0, 1].map((k) => <group key={k} ref={(r) => (heads.current[k] = r)}><Part model="magnus" name="hyd_head" scale={1.6} /></group>)}
      {active && <Tag position={[0, 6.4, 0]} df={14}>one unpaired electron, shared by both ends</Tag>}
    </group>
  )
}
