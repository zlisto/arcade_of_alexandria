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

// the Br⁺ bridge reads gold, and the chest's three-ring sigil glows (the concept art's "Br⁺ bridge" cue)
const WRAITH_MATS = {
  shield: new THREE.MeshStandardMaterial({ color: '#ffc640', metalness: 0.85, roughness: 0.22, emissive: '#b07a10', emissiveIntensity: 0.75 }),
  shieldGlow: new THREE.MeshStandardMaterial({ color: '#fff0b0', emissive: '#ffd060', emissiveIntensity: 2.6, toneMapped: false }),
}
const RING_MAT = new THREE.MeshBasicMaterial({ color: '#ffd080', toneMapped: false })
const told = { front: false, back: false }
/** Bromonium Wraiths: the shield (the Br⁺ bridge) turns slowly toward Kai; only a blow from the far side lands. */
export function Wraiths({ world, spawns, active = true, zone, onCleared }) {
  const ws = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), home: new THREE.Vector3(x, 0, z), face: 0, hp: 2, state: 'idle', t: Math.random() * 3, cd: 2 + i * 0.8 })))
  // one lunge at a time, with a gap after each, so a pack takes turns instead of striking together
  const pack = useRef({ gap: 0, was: false })
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
    const pk = pack.current
    pk.gap = Math.max(0, pk.gap - dt)
    const lunging = ws.current.some((o) => o.state === 'lunge')
    if (pk.was && !lunging) pk.gap = 1.4 // a lunge just ended (or was cut short): the next waits
    pk.was = lunging
    let taken = lunging
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
        // separation: live wraiths push apart, so they fan out round Kai instead of stacking
        for (const o of ws.current) {
          if (o === m || o.state === 'dead' || o.state === 'gone') continue
          const sx = m.pos.x - o.pos.x, sz = m.pos.z - o.pos.z, sd = Math.hypot(sx, sz)
          if (sd < 1.8) { const k = Math.min(0.9, (1.8 - sd) * 0.5) / (sd || 1), ux = sd ? sx : Math.sin(m.i * 2.1), uz = sd ? sz : Math.cos(m.i * 2.1); m.pos.x += ux * k; m.pos.z += uz * k }
        }
        m.cd -= dt
        if (m.state === 'idle' && dist < 2.4 && m.cd <= 0 && !taken && pk.gap <= 0) { m.state = 'lunge'; m.t = 0; taken = true }
        if (m.state === 'lunge' && m.t > 0.45 && !m.struck) { m.struck = true; if (Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 2.6 && !p.rolling) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.state === 'lunge' && m.t > 1.0) { m.state = 'idle'; m.struck = false; m.cd = 3.0 + m.i * 0.5 }
      }
      if (m.state !== 'lunge') m.struck = false
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
          <Part model="borana" name="wrt_body" mats={WRAITH_MATS} />
          {[0, 1, 2].map((k) => <mesh key={k} position={[Math.sin((k / 3) * Math.PI * 2) * 0.1, 1.42 + Math.cos((k / 3) * Math.PI * 2) * 0.1, 0.27]} material={RING_MAT}><torusGeometry args={[0.1, 0.018, 6, 20]} /></mesh>)}
          <pointLight position={[0, 1.5, 0.4]} color="#ff6a5a" intensity={1.5} distance={4} />
        </group>
      ))}
    </group>
  )
}

/** a monomer egg: a pale shell round two carbons and their C=C (two bars), on a little stalk; a crack shows before it rolls */
function MonomerPod() {
  return (
    <group>
      <mesh scale={[1.25, 0.85, 0.9]}><sphereGeometry args={[0.42, 16, 12]} /><meshStandardMaterial color="#dce8ff" emissive="#6a8ad0" emissiveIntensity={0.35} transparent opacity={0.45} roughness={0.2} depthWrite={false} /></mesh>
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.24, 0, 0]}><sphereGeometry args={[0.17, 14, 10]} /><meshStandardMaterial color="#e8f0ff" emissive="#8ab0ff" emissiveIntensity={0.9} /></mesh>)}
      {[-0.07, 0.07].map((dy) => <mesh key={dy} position={[0, dy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 0.34, 8]} /><meshStandardMaterial color="#5ff0ff" emissive="#2ab0d0" emissiveIntensity={1.2} /></mesh>)}
      <mesh position={[0, -0.36, 0]}><cylinderGeometry args={[0.03, 0.06, 0.16, 6]} /><meshStandardMaterial color="#6a8a5a" /></mesh>
      <group name="crack" visible={false}>
        {[[-0.12, 0.2, 0.6], [0.02, 0.26, -0.5], [0.16, 0.18, 0.7]].map(([x, y, r], i) => <mesh key={i} position={[x, y, 0.3]} rotation={[0, 0, r]}><boxGeometry args={[0.16, 0.025, 0.04]} /><meshBasicMaterial color="#1a1a2a" /></mesh>)}
        <mesh scale={[1.3, 0.9, 0.95]}><sphereGeometry args={[0.43, 12, 8]} /><meshBasicMaterial color="#ff9a5a" transparent opacity={0.18} depthWrite={false} toneMapped={false} /></mesh>
      </group>
    </group>
  )
}

const NAME = 'The Polymer Leviathan · –(CH₂CH₂)ₙ–'
/**
 * The boss. Its head (a radical) chases the nearest monomer egg and adds it: a segment grows (propagation).
 * Strike the peroxide vent: the O–O bond breaks, and a Ph· radical floats up (initiation). Carry it (E) to the head:
 * two radicals pair, the chain stops (termination) and the head lies still. Strike it. Three rounds.
 * Every segment hurts on touch, so each egg eaten is more body to dodge. Strike eggs to smash them; one left
 * alone ~7 s rolls to the head by itself (and bowls Kai over on the way).
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
  const [gone, setGone] = useState(false) // beaten: drop the R· tag while the spark flies off
  // hide Kai's stance tag while he carries the Ph· (it would sit on top of the Ph· tag)
  useEffect(() => { setState({ carrying: carry }) }, [carry])
  useEffect(() => () => setState({ carrying: false }), [])
  const st = useRef({ head: new THREE.Vector3(center[0], 0, center[2] - 6), dir: new THREE.Vector3(0, 0, 1), trail: [], segs: 4, mode: 'hunt', t: 0, eggT: 2, eggId: 0, eggs: [] })
  const head = useRef(), segRefs = useRef([]), phRef = useRef(), eggRefs = useRef({}), spark = useRef()
  // Malradix's violet spark rides the radical head; its world position is shared so the scene's cameras can frame it
  useEffect(() => { world.leviSpark = new THREE.Vector3(center[0], 2, center[2] - 6); return () => { world.leviSpark = null } }, [world])
  const P = LEVIATHAN[Math.min(round, 2)]
  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: 3 - round, max: 3 } })
    world.bossCam = true
    s.mode = 'hunt'; s.t = 0; s.segs = 4 + round * 2
    if (round > 0) {
      // a fresh chain starts across the arena from Kai, not on top of him
      const p = world.player
      let ax = p ? center[0] - p.pos.x : 0, az = p ? center[2] - p.pos.z : -1
      const l = Math.hypot(ax, az)
      if (l < 0.5) { ax = 0; az = -1 } else { ax /= l; az /= l }
      s.head.set(center[0] + ax * (R - 2), 0, center[2] + az * (R - 2))
      s.dir.set(-ax, 0, -az); s.trail = []
    }
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), levi: s, leviRound: () => round }
    const ids = [
      world.addTarget({ pos: () => [vent[0], 0.8, vent[2]], radius: 0.8, tall: 1.4, alive: () => !carryRef.current && s.mode !== 'down', onHit: () => {
        sfx('stomp'); setPh(true)
        if (!s.toldVent) { s.toldVent = true; toast('The O–O bond snaps: a Ph· radical. Take it to the chain’s end!', 'good', 4000) }
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
        if (next >= 3) {
          s.mode = 'gone'; s.t = 0; s.sparkT = 0; setGone(true); setTimeout(() => onDefeated && onDefeated(), 350) // Pi calls the spark while it is still in the air
          setTimeout(() => { s.eggs = []; setEggs([]) }, 1000) // the leftover eggs shrink away with the body (useFrame), then go
          return true
        }
        s.mode = 'reset'; s.t = 0
        toast(next === 1 ? 'It shakes off the dead end and starts a fresh chain. Faster now.' : 'One more chain to stop!', 'warn', 3400)
        setTimeout(() => setRound(next), 1600)
        return true
      } }),
      // strike a monomer egg to smash it before the head can add it
      ...[0, 1, 2, 3].map((k) => world.addTarget({ pos: () => { const e = s.eggs[k]; return e ? [e.x, 0.4, e.z] : [0, -50, 0] }, radius: 0.6, tall: 0.9, alive: () => !!s.eggs[k] && s.mode === 'hunt', onHit: () => {
        const e = s.eggs[k]
        if (!e) return false
        s.eggs = s.eggs.filter((x) => x !== e); setEggs([...s.eggs]); sfx('hit')
        if (!s.toldSmash) { s.toldSmash = true; toast('No monomer, no growth. With no eggs left, it hunts you instead.', 'info', 3600, true) }
        return true
      } })),
    ]
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += s.mode === 'gone' ? rawDt : dt // the defeat plays out during Pi's line, which pauses enemies
    const p = world.player
    // monomer eggs drop in round the arena
    s.eggT -= dt
    if (s.mode === 'hunt' && s.eggT <= 0 && s.eggs.length < 4) {
      s.eggT = P.every
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * (R - 5)
      s.eggs.push({ id: ++s.eggId, x: center[0] + Math.cos(a) * r, z: center[2] + Math.sin(a) * r, age: 0 })
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
      // an egg left alone too long hatches loose and rolls to the radical end; it bowls Kai over on the way
      for (const e of s.eggs) {
        e.age += dt
        const eg = eggRefs.current[e.id]
        if (e.age < 7) {
          // the last second before it rolls: the pod cracks and wobbles, a warning
          if (eg && e.age > 6) {
            const k = e.age - 6
            eg.rotation.set(Math.cos(e.age * 31) * 0.22 * k, 0, Math.sin(e.age * 38) * 0.32 * k, 'YXZ')
            eg.position.y = 0.4 + Math.abs(Math.sin(e.age * 19)) * 0.12 * k
            const c = eg.getObjectByName('crack')
            if (c && !c.visible) c.visible = true
          }
          continue
        }
        if (!e.rolling) { e.rolling = true; if (!s.toldRoll) { s.toldRoll = true; toast('Ignored monomer rolls to the chain on its own. Smash eggs early!', 'warn', 3600, true) } }
        const ex = s.head.x - e.x, ez = s.head.z - e.z, el = Math.hypot(ex, ez) || 1
        e.x += (ex / el) * 2.2 * dt; e.z += (ez / el) * 2.2 * dt
        e.spin = (e.spin || 0) + dt * 5.5
        if (eg) { eg.position.set(e.x - center[0], 0.4, e.z - center[2]); eg.rotation.set(e.spin, Math.atan2(ex, ez) + Math.PI / 2, 0, 'YXZ') }
        if (p && !p.rolling && Math.hypot(p.pos.x - e.x, p.pos.z - e.z) < 0.8) {
          if (p.hurt(1, [e.x, 0, e.z]) && carryRef.current) { setCarry(false); toast('You dropped the Ph·. Strike the vent for another.', 'warn', 3000, true) }
        }
      }
      if (best && Math.hypot(best.x - s.head.x, best.z - s.head.z) < 1.0) {
        s.eggs = s.eggs.filter((e) => e !== best); setEggs([...s.eggs])
        s.segs = Math.min(16, s.segs + 1); sfx('pickup')
        if (!s.toldGrow) { s.toldGrow = true; toast('It ate a monomer and grew: propagation. Its end is still a radical.', 'info', 4000, true) }
      }
      if (p && !p.rolling && Math.hypot(p.pos.x - s.head.x, p.pos.z - s.head.z) < 1.3) {
        if (p.hurt(1, [s.head.x, 0, s.head.z]) && carryRef.current) { setCarry(false); toast('You dropped the Ph·. Strike the vent for another.', 'warn', 3000, true) }
      }
      // the body is solid chain: touching any grown segment hurts, so a longer chain fills more of the arena
      if (p && !p.rolling) {
        for (let k = 0; k < s.segs; k++) {
          const q = s.trail[Math.min(s.trail.length - 1, (k + 1) * 9)]
          if (!q || Math.hypot(p.pos.x - q.x, p.pos.z - q.z) >= 0.9) continue
          if (p.hurt(1, [q.x, 0, q.z])) {
            if (carryRef.current) { setCarry(false); toast('You dropped the Ph·. Strike the vent for another.', 'warn', 3000, true) }
            if (!s.toldBody) { s.toldBody = true; toast('Its body is chain too. Every segment it adds is more to dodge.', 'warn', 3600, true) }
          }
          break
        }
      }
    }
    // beaten: the leftover monomer eggs shrink away with the body
    if (s.mode === 'gone') for (const e of s.eggs) { const eg = eggRefs.current[e.id]; if (eg) eg.scale.setScalar(Math.max(0.01, 1 - s.t)) }
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
    // the spark sits on the head; when the chain is beaten it tears free and flies east (+x) and up through the glass roof
    if (spark.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.15
      if (s.mode !== 'gone') {
        const ry = Math.atan2(s.dir.x, s.dir.z)
        spark.current.position.set(s.head.x - center[0] + Math.sin(ry) * 0.3, 0.9 + (s.mode === 'down' ? -0.5 : 0) + 0.8, s.head.z - center[2] + Math.cos(ry) * 0.3)
        spark.current.scale.setScalar(pulse); spark.current.visible = true
      } else {
        s.sparkT += rawDt
        const k = Math.min(1, s.sparkT * 2) // a quick tear-free, then full speed
        spark.current.position.x += rawDt * 4.5 * k; spark.current.position.y += rawDt * 7 * k
        spark.current.scale.setScalar(1.8 * pulse); spark.current.visible = s.sparkT < 3.2
      }
      if (world.leviSpark) world.leviSpark.set(spark.current.position.x + center[0], spark.current.position.y, spark.current.position.z + center[2])
    }
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
        {active && !gone && <Tag position={[0, 1.5, 0]} df={12}>{st.current.mode === 'down' ? 'terminated: strike!' : 'R· (the chain’s radical end)'}</Tag>}
      </group>
      <group ref={spark} visible={false}>
        <mesh><sphereGeometry args={[0.24, 14, 10]} /><meshBasicMaterial color="#f4e0ff" toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.5, 14, 10]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.9, 14, 10]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.18} depthWrite={false} toneMapped={false} /></mesh>
        <pointLight color="#c070ff" intensity={8} distance={9} />
      </group>
      {[...Array(16)].map((_, k) => <group key={k} ref={(r) => (segRefs.current[k] = r)} visible={false}><Part model="borana" name="lev_seg" /></group>)}
      {eggs.map((e) => (
        <group key={e.id} ref={(r) => { if (r) eggRefs.current[e.id] = r; else delete eggRefs.current[e.id] }} position={[e.x - center[0], 0.4, e.z - center[2]]}>
          <MonomerPod />
          <Tag position={[0, 0.85, 0]} df={8} far={12}>CH₂=CH₂</Tag>
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
        {(ph || carry) && <Tag position={[0, 0.6, 0]} df={9}>Ph·</Tag>}
      </group>
    </group>
  )
}
