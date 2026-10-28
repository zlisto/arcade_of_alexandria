import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, enemiesPaused } from '../engine/store'
import { ROUTES } from '../chem/rules9'

// World 9's people and creatures, built in Blender (tools/lindlar_blender.py → public/models/lindlar.glb):
// • Sage Lindlar (assets/characters/sage-lindlar.png).
// • Acetylide Vipers (§9.7–9.8): a carbanion with its lone pair on an sp carbon. They strike in perfectly straight
//   lines (an alkyne is linear): step aside, then hit them while they recoil.
// • Malradix's Mimic (§9.9): it wears a target molecule as a disguise. Strike the pedestal holding the immediate
//   precursor, one step back at a time; each right answer tears a shell away.
preloadModels('lindlar')

export function Lindlar(props) {
  const M = useMemo(() => ({
    robe: rimMat({ color: '#8e8e94', roughness: 0.85 }, '#c8f0ff', 0.35), robeDark: rimMat({ color: '#5a5a62', roughness: 0.9 }, '#c8f0ff', 0.2),
    sash: rimMat({ color: '#6a4a30', roughness: 0.8 }, '#ffe0c0', 0.2), skin: rimMat({ color: '#e0b898', roughness: 0.55 }, '#e8f8ff', 0.25, 3),
    hair: rimMat({ color: '#2a2420', roughness: 0.75 }, '#c8f0ff', 0.25),
  }), [])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 4.6) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="lindlar" name="lin_body" mats={M} />
      <group ref={eyes} position={[0, 1.66, 0.05]}><Part model="lindlar" name="lin_eyes" castShadow={false} /></group>
      <pointLight position={[0.3, 2.2, 0.6]} color="#7af0ff" intensity={2} distance={5} />
    </group>
  )
}

const told = { line: false, hit: false }
/** Acetylide Vipers: coil, aim (a straight telegraph line), strike along it, recoil (open to a blow). */
export function Vipers({ world, spawns, active = true, zone, onCleared }) {
  const vs = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), face: Math.PI, hp: 2, state: 'idle', t: Math.random() * 2, cd: 1.5 + i * 0.6, dir: new THREE.Vector3(0, 0, 1), from: new THREE.Vector3() })))
  const refs = useRef([]), lines = useRef([])
  const cleared = useRef(false)
  useEffect(() => {
    if (!active) return
    const ids = vs.current.map((m) => world.addTarget({
      pos: () => [m.pos.x, 0.6, m.pos.z], radius: 0.7, tall: 1.2, alive: () => m.state !== 'dead' && m.state !== 'gone',
      onHit: () => {
        if (m.state !== 'recoil') { sfx('block'); if (!told.line) { told.line = true; toast('Too quick while it’s coiled. Step out of its straight line, then hit it as it recoils.', 'warn', 4800, true) } return false }
        m.hp--; sfx('hit')
        if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('pair') }
        return true
      },
    }))
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((_, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    let alive = 0
    for (const m of vs.current) {
      const g = refs.current[m.i], ln = lines.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; if (ln) ln.visible = false; continue }
      if (m.state === 'dead') { g.scale.setScalar(Math.max(0.01, 1 - m.t * 2)); if (ln) ln.visible = false; if (m.t > 0.5) m.state = 'gone'; continue }
      alive++
      const inZone = p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
      if (m.state === 'idle' && inZone) {
        m.face = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        m.cd -= dt
        if (m.cd <= 0 && Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 11) { m.state = 'aim'; m.t = 0; m.dir.set(Math.sin(m.face), 0, Math.cos(m.face)); m.from.copy(m.pos) }
      }
      if (m.state === 'aim' && m.t > 0.9) { m.state = 'strike'; m.t = 0; sfx('dash') }
      if (m.state === 'strike') {
        m.pos.addScaledVector(m.dir, dt * 16)
        if (p && !m.bit && !p.rolling && Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 0.9) { m.bit = true; p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.t > 0.45) { m.state = 'recoil'; m.t = 0; m.bit = false }
      }
      if (m.state === 'recoil' && m.t > 1.4) { m.state = 'idle'; m.cd = 1.6 + Math.random() }
      if (ln) {
        ln.visible = m.state === 'aim'
        if (ln.visible) { ln.position.set(m.from.x + m.dir.x * 3.6, 0.06, m.from.z + m.dir.z * 3.6); ln.rotation.y = m.face }
      }
      g.position.set(m.pos.x, 0, m.pos.z)
      g.rotation.y = m.face
      g.rotation.z = m.state === 'recoil' ? Math.sin(m.t * 20) * 0.1 : 0
    }
    if (alive === 0 && !cleared.current && vs.current.every((m) => m.state === 'gone' || m.state === 'dead')) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => (
        <group key={i}>
          <group ref={(r) => (refs.current[i] = r)}><Part model="lindlar" name="vip_body" scale={1.3} /><pointLight position={[0, 1.2, 0.6]} color="#7af0ff" intensity={1.2} distance={3} /></group>
          <mesh ref={(r) => (lines.current[i] = r)} visible={false} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.5, 7.2]} /><meshBasicMaterial color="#7af0ff" transparent opacity={0.35} /></mesh>
        </group>
      ))}
    </group>
  )
}

const NAME = 'Malradix’s Mimic · ?'
const PED_R = 7
/**
 * The boss. Each round is a synthesis (Worked Examples 9.1, 9.2). The Mimic wears the target; four pedestals carry
 * candidate precursors. Strike the immediate precursor: a shell tears away and the Mimic becomes that precursor.
 * Reach the start and it stands bare: strike it. A wrong pedestal and it lashes out; it also lunges now and then.
 */
export default function Mimic({ world, center, active, onDefeated }) {
  const [round, setRound] = useState(0)
  const [step, setStep] = useState(0)
  const st = useRef({ mode: 'plan', t: 0, lungeT: 4, pos: new THREE.Vector3(center[0], 0, center[2]) })
  const body = useRef(), shells = useRef([]), wave = useRef()
  const key = round === 0 ? 'we1' : 'we2'
  const R = ROUTES[key]
  const cur = R.back[Math.min(step, R.back.length - 1)]
  const bare = step >= R.back.length
  const opts = useMemo(() => (bare ? [] : [...cur.pick].sort((a, b) => ((a.length * 13 + round * 7) % 5) - ((b.length * 13 + round * 7) % 5))), [round, step])
  const pedPos = (i) => { const a = Math.PI * (0.15 + 0.7 * (i / 3)); return [center[0] + Math.cos(a + Math.PI) * PED_R, center[2] + Math.sin(a + Math.PI) * PED_R * 0.8 + 2] }

  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: 2 - round, max: 2 } })
    world.bossCam = true
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), mimic: s, mimicStep: () => [round, step] }
    const ids = opts.map((o, i) => world.addTarget({
      pos: () => { const [x, z] = pedPos(i); return [x, 1.2, z] }, radius: 0.8, tall: 1.6, alive: () => true,
      onHit: () => {
        if (o === cur.right) {
          sfx('shard'); world.shake = 0.3
          toast(`Yes: ${cur.right} → (${cur.step}) → ${cur.have}. A shell tears away.`, 'good', 4600)
          setStep(step + 1)
        } else {
          sfx('wrong'); s.mode = 'lash'; s.t = 0
          toast(cur.why[o] || 'That isn’t what came just before.', 'warn', 5600)
        }
        return true
      },
    }))
    ids.push(world.addTarget({
      pos: () => [s.pos.x, 1.6, s.pos.z], radius: 1.1, tall: 2.6, alive: () => true,
      onHit: () => {
        if (!bare) { sfx('block'); if (!s.toldShell || performance.now() - s.toldShell > 6000) { s.toldShell = performance.now(); toast(`It’s still wearing ${cur.have}. Work backward: strike the pedestal with what came just before it.`, 'warn', 4800, true) } return false }
        sfx('hit'); world.shake = 0.4
        const next = round + 1
        setState({ bossHp: { name: NAME, hp: 2 - next, max: 2 } })
        if (next >= 2) { s.mode = 'gone'; s.t = 0; setTimeout(() => onDefeated && onDefeated(), 1800); return true }
        toast('Unmasked! It snatches another disguise…', 'warn', 3400)
        setTimeout(() => { setRound(next); setStep(0) }, 1400)
        return true
      },
    }))
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round, step])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += dt
    const p = world.player
    // now and then it lunges at Kai; a lash (after a wrong answer) is a ring of force round it
    s.lungeT -= dt
    if (s.mode === 'plan' && s.lungeT <= 0 && p) { s.mode = 'lunge'; s.t = 0; s.aim = new THREE.Vector3(p.pos.x, 0, p.pos.z) }
    if (s.mode === 'lunge') {
      if (s.t < 0.7) { /* wind up */ } else if (s.t < 1.1) { s.pos.lerp(s.aim, Math.min(1, dt * 8)); if (p && !s.hit && !p.rolling && Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 1.3) { s.hit = true; p.hurt(1, [s.pos.x, 0, s.pos.z]) } } else { s.mode = 'back'; s.t = 0; s.hit = false }
    }
    if (s.mode === 'back') { s.pos.lerp(new THREE.Vector3(center[0], 0, center[2]), Math.min(1, dt * 3)); if (s.t > 1.2) { s.mode = 'plan'; s.lungeT = bare ? 99 : 5 + Math.random() * 2 } }
    if (s.mode === 'lash') {
      if (wave.current) { wave.current.visible = s.t < 0.7; wave.current.scale.setScalar(1 + s.t * 14) }
      if (s.t > 0.2 && !s.lashed) { s.lashed = true; if (p && !p.rolling && Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 9) p.hurt(1, [s.pos.x, 0, s.pos.z]) }
      if (s.t > 1.0) { s.mode = 'plan'; s.lashed = false }
    }
    if (body.current) {
      body.current.position.set(s.pos.x - center[0], 0.2 + Math.sin(state.clock.elapsedTime * 1.6) * 0.1, s.pos.z - center[2])
      if (p) body.current.rotation.y = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
      body.current.scale.setScalar(s.mode === 'gone' ? Math.max(0.01, 1 - s.t) : s.mode === 'lunge' && s.t < 0.7 ? 1 + s.t * 0.15 : 1)
    }
    shells.current.forEach((g, k) => {
      if (!g) return
      const n = R.back.length - step // shells left
      g.visible = k < n && s.mode !== 'gone'
      g.rotation.y = state.clock.elapsedTime * (0.3 + k * 0.15) * (k % 2 ? -1 : 1)
      g.scale.setScalar(1 + k * 0.12)
    })
  })

  return (
    <group position={center}>
      <group ref={body}>
        <Part model="lindlar" name="mim_body" />
        {[0, 1, 2].map((k) => <group key={k} ref={(r) => (shells.current[k] = r)}><Part model="lindlar" name="mim_shell" /></group>)}
        <pointLight position={[0, 2, 1]} color="#b070ff" intensity={4} distance={8} />
        {active && <Tag position={[0, 3.8, 0]} df={13}>{bare ? `bare: ${R.start}. Strike!` : `I am ${cur.have}.`}</Tag>}
      </group>
      <mesh ref={wave} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[0.6, 0.75, 32]} /><meshBasicMaterial color="#b070ff" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      {active && opts.map((o, i) => {
        const [x, z] = pedPos(i)
        return (
          <group key={o} position={[x - center[0], 0, z - center[2]]}>
            <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.6, 0.7, 1.0, 10]} /><meshStandardMaterial color="#6a6e76" /></mesh>
            <mesh position={[0, 1.3, 0]}><octahedronGeometry args={[0.32, 0]} /><meshStandardMaterial color="#9af0ff" emissive="#3ab0d0" emissiveIntensity={0.8} /></mesh>
            <Tag position={[0, 2.1, 0]} df={10} far={20}>{o}</Tag>
          </group>
        )
      })}
      {active && <Tag position={[0, 6.2, -4]} df={15}>{`${R.title}: what came just before?`}</Tag>}
    </group>
  )
}
