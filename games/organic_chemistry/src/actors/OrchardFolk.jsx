import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, getState, setState, enemiesPaused } from '../engine/store'
import { LEVIATHAN } from '../chem/rules8'

// World 8's people and creatures, built in Blender (tools/borana_blender.py → public/models/borana.glb):
// • Alchemist Borana (assets/characters/alchemist-borana.png).
// • Bromonium Wraiths (§8.2): a cyclopentene wraith whose Br⁺ bridge covers one face as a golden shield. The
//   bridge blocks that face, so a blow (like the Br⁻ that opens a bromonium) only lands from the other side: anti.
// • The Polymer Leviathan (§8.10): a chain-growth polymer. Its head is a radical that adds monomer after monomer.
preloadModels('borana')

export function Borana(props) {
  const M = useMemo(() => ({
    coat: rimMat({ color: '#6a4028', roughness: 0.7 }, '#ffe0a0', 0.3), coatDark: rimMat({ color: '#4a2a18', roughness: 0.75 }, '#ffe0a0', 0.2),
    vest: rimMat({ color: '#5a5a62', roughness: 0.8 }, '#e8f0ff', 0.2), skin: rimMat({ color: '#e8c0a8', roughness: 0.55 }, '#fff0e0', 0.25, 3),
    hair: rimMat({ color: '#e0e0ea', roughness: 0.7 }, '#ffffff', 0.4), leather: rimMat({ color: '#3a2418', roughness: 0.7 }, '#ffe0a0', 0.15),
  }), [])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 4.1) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="borana" name="bor_body" mats={M} />
      <group ref={eyes} position={[0, 1.64, 0.05]}><Part model="borana" name="bor_eyes" castShadow={false} /></group>
      <pointLight position={[0, 2.3, 1]} color="#fff0d0" intensity={1.2} distance={5} />
    </group>
  )
}

const told = { front: false, back: false }
/** Bromonium Wraiths: the shield (the Br⁺ bridge) turns slowly toward Kai; only a blow from the far side lands. */
export function Wraiths({ world, spawns, active = true, zone, onCleared }) {
  const ws = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), home: new THREE.Vector3(x, 0, z), face: 0, hp: 2, state: 'idle', t: Math.random() * 3, cd: 2 })))
  const refs = useRef([])
  const [, setN] = useState(0)
  const cleared = useRef(false)
  useEffect(() => {
    if (!active) return
    const ids = ws.current.map((m) => world.addTarget({
      pos: () => [m.pos.x, 1.4, m.pos.z], radius: 0.7, tall: 1.8, alive: () => m.state !== 'dead' && m.state !== 'gone',
      onHit: () => {
        const p = world.player
        if (!p) return false
        // the shield faces direction m.face; a hit from within ~70° of it is blocked
        const dx = p.pos.x - m.pos.x, dz = p.pos.z - m.pos.z, l = Math.hypot(dx, dz) || 1
        const front = (dx * Math.sin(m.face) + dz * Math.cos(m.face)) / l
        if (front > 0.35) {
          sfx('block')
          if (!told.front) { told.front = true; toast('The Br⁺ bridge covers that face. Bromide opens a bromonium from the other side. Get behind it!', 'warn', 5200, true) }
          return false
        }
        m.hp--; sfx('hit'); m.state = 'stagger'; m.t = 0
        if (!told.back) { told.back = true; toast('From the back! Anti: the opposite face to the bridge.', 'good', 3600, true) }
        if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('pair'); setN((n) => n + 1) }
        return true
      },
    }))
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    let alive = 0
    for (const m of ws.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.scale.setScalar(Math.max(0.01, 1 - m.t * 2)); if (m.t > 0.5) m.state = 'gone'; continue }
      alive++
      const inZone = p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
      if (p && inZone) {
        const want = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        let d = want - m.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
        m.face += Math.sign(d) * Math.min(Math.abs(d), dt * 1.3)
        const dist = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        if (m.state === 'idle' && dist > 2.2) { m.pos.x += Math.sin(want) * dt * 1.3; m.pos.z += Math.cos(want) * dt * 1.3 }
        m.cd -= dt
        if (m.state === 'idle' && dist < 2.4 && m.cd <= 0) { m.state = 'lunge'; m.t = 0 }
        if (m.state === 'lunge' && m.t > 0.45 && !m.struck) { m.struck = true; if (Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 2.6 && !p.rolling) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.state === 'lunge' && m.t > 1.0) { m.state = 'idle'; m.struck = false; m.cd = 2.2 }
      }
      if (m.state === 'stagger' && m.t > 0.6) m.state = 'idle'
      g.position.set(m.pos.x, 0.25 + Math.sin(state.clock.elapsedTime * 2 + m.i) * 0.12, m.pos.z)
      // the model's shield is on its +x side: turn it so +x points along m.face
      g.rotation.y = m.face - Math.PI / 2
      g.rotation.z = m.state === 'stagger' ? 0.25 : 0
    }
    if (alive === 0 && !cleared.current && ws.current.every((m) => m.state === 'gone' || m.state === 'dead')) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => (
        <group key={i} ref={(r) => (refs.current[i] = r)}>
          <Part model="borana" name="wrt_body" />
          <pointLight position={[0, 1.5, 0.4]} color="#ff6a5a" intensity={1.5} distance={4} />
        </group>
      ))}
    </group>
  )
}

const NAME = 'The Polymer Leviathan · –(CH₂CH₂)ₙ–'
/**
 * The boss. Its head (a radical) chases the nearest monomer egg and adds it: a segment grows (propagation).
 * Strike the peroxide vent: the O–O bond breaks, and a Ph· radical floats up (initiation). Carry it (E) to the head:
 * two radicals pair, the chain stops (termination) and the head lies still. Strike it. Three rounds.
 */
export default function Leviathan({ world, center, R = 12, vent, active, onDefeated }) {
  const [round, setRound] = useState(0)
  const [carry, setCarry] = useState(false)
  const carryRef = useRef(false)
  carryRef.current = carry
  const [ph, setPh] = useState(false)
  const phOn = useRef(false)
  phOn.current = ph
  const [eggs, setEggs] = useState([])
  const st = useRef({ head: new THREE.Vector3(center[0], 0, center[2] - 6), dir: new THREE.Vector3(0, 0, 1), trail: [], segs: 4, mode: 'hunt', t: 0, eggT: 2, eggId: 0, eggs: [] })
  const head = useRef(), segRefs = useRef([]), phRef = useRef()
  const P = LEVIATHAN[Math.min(round, 2)]
  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: 3 - round, max: 3 } })
    world.bossCam = true
    s.mode = 'hunt'; s.t = 0; s.segs = 4 + round * 2
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), levi: s, leviRound: () => round }
    const ids = [
      world.addTarget({ pos: () => [vent[0], 0.8, vent[2]], radius: 0.8, tall: 1.4, alive: () => !carryRef.current && s.mode !== 'down', onHit: () => {
        sfx('stomp'); setPh(true)
        if (!s.toldVent) { s.toldVent = true; toast('The peroxide’s weak O–O bond snaps: a phenyl radical, Ph·, floats up. Take it to the chain’s end!', 'good', 4800) }
        return true
      } }),
      world.addInteractable({ pos: [vent[0], 0, vent[2] + 1.2], radius: 1.8, label: () => (phOn.current && !carryRef.current ? 'Take the Ph· radical' : null), onInteract: () => { if (!carryRef.current) { setCarry(true); setPh(false); sfx('pickup') } } }),
      world.addInteractable({ pos: () => [s.head.x, 0, s.head.z], radius: 2.6, label: () => (carryRef.current && s.mode === 'hunt' ? 'Pair Ph· with the chain’s radical end' : null), onInteract: () => {
        if (!carryRef.current || s.mode !== 'hunt') return
        setCarry(false); s.mode = 'down'; s.t = 0; sfx('pair'); world.shake = 0.3
        toast('Two radicals pair their electrons: termination. The chain stops growing. Strike!', 'good', 3600)
      } }),
      world.addTarget({ pos: () => [s.head.x, 1.0, s.head.z], radius: 1.2, tall: 1.8, alive: () => s.mode !== 'gone', onHit: () => {
        if (s.mode !== 'down') { sfx('block'); if (!s.toldHard || performance.now() - s.toldHard > 7000) { s.toldHard = performance.now(); toast('A growing chain shrugs that off. End the chain first: bring it a second radical.', 'warn', 4200, true) } return false }
        sfx('hit'); world.shake = 0.4
        const next = round + 1
        setState({ bossHp: { name: NAME, hp: 3 - next, max: 3 } })
        if (next >= 3) { s.mode = 'gone'; s.t = 0; setTimeout(() => onDefeated && onDefeated(), 1800); return true }
        s.mode = 'reset'; s.t = 0
        toast(next === 1 ? 'It shakes off the dead end and starts a fresh chain. Faster now.' : 'One more chain to stop!', 'warn', 3400)
        setTimeout(() => setRound(next), 1600)
        return true
      } }),
    ]
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += dt
    const p = world.player
    // monomer eggs drop in round the arena
    s.eggT -= dt
    if (s.mode === 'hunt' && s.eggT <= 0 && s.eggs.length < 4) {
      s.eggT = P.every
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * (R - 5)
      s.eggs.push({ id: ++s.eggId, x: center[0] + Math.cos(a) * r, z: center[2] + Math.sin(a) * r })
      setEggs([...s.eggs])
    }
    if (s.mode === 'hunt') {
      // go for the nearest egg; with none, for Kai
      let tx = p ? p.pos.x : center[0], tz = p ? p.pos.z : center[2]
      let best = null, bd = 1e9
      for (const e of s.eggs) { const d = Math.hypot(e.x - s.head.x, e.z - s.head.z); if (d < bd) { bd = d; best = e } }
      if (best) { tx = best.x; tz = best.z }
      const want = new THREE.Vector3(tx - s.head.x, 0, tz - s.head.z).normalize()
      s.dir.lerp(want, Math.min(1, dt * 2.2)).normalize()
      s.head.addScaledVector(s.dir, P.speed * dt)
      const off = Math.hypot(s.head.x - center[0], s.head.z - center[2])
      if (off > R - 1) { s.head.x = center[0] + ((s.head.x - center[0]) * (R - 1)) / off; s.head.z = center[2] + ((s.head.z - center[2]) * (R - 1)) / off }
      if (best && bd < 1.0) {
        s.eggs = s.eggs.filter((e) => e !== best); setEggs([...s.eggs])
        s.segs = Math.min(16, s.segs + 1); sfx('pickup')
        if (!s.toldGrow) { s.toldGrow = true; toast('It added a monomer and grew a segment: propagation. The radical is still on the end.', 'info', 4200, true) }
      }
      if (p && !p.rolling && Math.hypot(p.pos.x - s.head.x, p.pos.z - s.head.z) < 1.3) {
        if (p.hurt(1, [s.head.x, 0, s.head.z]) && carryRef.current) { setCarry(false); toast('You dropped the Ph·. Strike the vent for another.', 'warn', 3000, true) }
      }
    }
    if (s.mode === 'down' && s.t > 5) { s.mode = 'hunt'; toast('It found a new monomer and restarted. Again!', 'warn', 3000, true) }
    // the body follows the head's trail
    s.trail.unshift(s.head.clone())
    if (s.trail.length > 600) s.trail.length = 600
    if (head.current) {
      head.current.position.set(s.head.x - center[0], 0.9 + (s.mode === 'down' ? -0.5 : 0), s.head.z - center[2])
      head.current.rotation.y = Math.atan2(s.dir.x, s.dir.z)
      head.current.visible = s.mode !== 'gone' || s.t < 1
    }
    segRefs.current.forEach((g, k) => {
      if (!g) return
      const idx = Math.min(s.trail.length - 1, (k + 1) * 9)
      const q = s.trail[idx] || s.head
      const q2 = s.trail[Math.min(s.trail.length - 1, idx + 4)] || q
      g.visible = k < s.segs && (s.mode !== 'gone' || s.t < 1)
      g.position.set(q.x - center[0], 0.65, q.z - center[2])
      g.rotation.y = Math.atan2(q.x - q2.x, q.z - q2.z)
    })
    if (phRef.current && p) {
      if (carryRef.current) phRef.current.position.set(p.pos.x - center[0], 2.4 + Math.sin(state.clock.elapsedTime * 4) * 0.08, p.pos.z - center[2])
      else phRef.current.position.set(vent[0] - center[0], 1.8, vent[2] - center[2])
      phRef.current.visible = carryRef.current || phOn.current
    }
  })

  return (
    <group position={center}>
      <group ref={head} visible={active}>
        <Part model="borana" name="lev_head" />
        <pointLight position={[0, 1, 0.5]} color="#c070ff" intensity={4} distance={8} />
        {active && <Tag position={[0, 2.4, 0]} df={12}>{st.current.mode === 'down' ? 'terminated: strike!' : 'R· (the chain’s radical end)'}</Tag>}
      </group>
      {[...Array(16)].map((_, k) => <group key={k} ref={(r) => (segRefs.current[k] = r)} visible={false}><Part model="borana" name="lev_seg" /></group>)}
      {eggs.map((e) => (
        <group key={e.id} position={[e.x - center[0], 0.4, e.z - center[2]]}>
          <mesh><sphereGeometry args={[0.35, 14, 10]} /><meshStandardMaterial color="#e8f0ff" emissive="#8ab0ff" emissiveIntensity={0.6} /></mesh>
          <Tag position={[0, 0.7, 0]} df={8} far={16}>CH₂=CH₂</Tag>
        </group>
      ))}
      <group position={[vent[0] - center[0], 0, vent[2] - center[2]]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.6, 0.8, 1.0, 10]} /><meshStandardMaterial color="#5a4a3a" /></mesh>
        <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.45, 0.45, 0.1, 12]} /><meshStandardMaterial color="#ff8a3a" emissive="#ff5a1a" emissiveIntensity={1.4} /></mesh>
        <Tag position={[0, 2.6, 0]} df={10}>benzoyl peroxide vent: strike it</Tag>
      </group>
      <group ref={phRef} visible={false}>
        <mesh><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color="#ffd060" emissive="#ffb020" emissiveIntensity={1.4} /></mesh>
        <pointLight color="#ffd060" intensity={2} distance={4} />
        <Tag position={[0, 0.6, 0]} df={9}>Ph·</Tag>
      </group>
    </group>
  )
}
