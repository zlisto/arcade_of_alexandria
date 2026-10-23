import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getState, setState, toast } from '../engine/store'
import { sfx } from '../audio/sfx'
import { HYBRIDS } from '../chem/rules'

// The Unbonded Colossus (boss of the Orbital Caverns; book §1.4, §1.6–1.9).
// A giant of loose atoms with empty sockets. Pattern: stomp shockwave (roll through it or hop over it),
// arm sweep (block or dodge), then it kneels and exposes its core: a carbon that needs one bonding geometry.
// Kai must strike the core in the matching hybrid stance. Three phases: sp³ → sp² → sp.

const PHASES = [
  { need: 'sp3', why: 'A carbon with four single bonds: tetrahedral, 109.5°. Strike in sp³!', speed: 1 },
  { need: 'sp2', why: 'A carbon in a double bond: three σ bonds at 120° plus one π bond. Strike in sp²!', speed: 1.25 },
  { need: 'sp', why: 'A carbon in a triple bond: two σ bonds at 180° plus two π bonds. Strike in sp!', speed: 1.5 },
]
const HITS_PER_PHASE = 3

export default function Colossus({ world, center, active, onDefeated }) {
  const g = useRef()
  const armL = useRef()
  const armR = useRef()
  const core = useRef()
  const coreMat = useRef()
  const wave = useRef()
  const st = useRef({ phase: 0, hits: 0, mode: 'idle', t: 0, waveR: 0, waveOn: false, facing: 0, pos: new THREE.Vector3(center[0], 0, center[2]), cycle: 0, dead: false, flinch: 0 })
  const [label, setLabel] = useState(null)
  const atoms = useMemo(() => {
    // torso cluster of loose atoms (colors: C black, O red, N blue, H white)
    const cols = ['#2b2b2b', '#2b2b2b', '#e0453b', '#3b6fe0', '#f4f4f4']
    const out = []
    let s = 3
    const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2
      const h = rnd()
      const r = 1.5 * Math.sin(h * Math.PI) + 0.4
      out.push({ p: [Math.cos(a) * r, 2.6 + h * 3.6, Math.sin(a) * r * 0.8], r: 0.35 + rnd() * 0.35, c: cols[i % cols.length] })
    }
    return out
  }, [])

  useEffect(() => {
    if (!active) return
    const id = world.addTarget({
      pos: () => { const s = st.current; return [s.pos.x, s.mode === 'exposed' ? 1.2 : 3.6, s.pos.z] },
      alive: () => !st.current.dead,
      radius: 1.6,
      tall: 2,
      onHit: (dir, dmg, kind, stance) => {
        const s = st.current
        if (s.dead) return false
        if (s.mode !== 'exposed') { sfx('block'); return false }
        const need = PHASES[s.phase].need
        if (stance !== need) {
          sfx('wrong')
          toast(`The core rejects a ${HYBRIDS[stance].label} strike. ${PHASES[s.phase].why} (press R to change shape)`, 'warn', 3200)
          return false
        }
        s.hits++
        s.flinch = 0.25
        sfx('hit')
        setState({ bossHp: { name: 'The Unbonded Colossus', hp: PHASES.length * HITS_PER_PHASE - (s.phase * HITS_PER_PHASE + s.hits), max: PHASES.length * HITS_PER_PHASE } })
        if (s.hits >= HITS_PER_PHASE) {
          s.hits = 0
          s.phase++
          sfx('bond')
          if (s.phase >= PHASES.length) {
            s.dead = true
            s.mode = 'dying'
            s.t = 0
            setLabel(null)
            setState({ bossHp: null })
            setTimeout(() => onDefeated && onDefeated(), 2200)
          } else {
            toast(`The atoms lock into place — every one with a full octet. It rises again, faster!`, 'good', 2800)
            s.mode = 'rise'; s.t = 0
            setLabel(null)
          }
        }
        return true
      },
    })
    setState({ bossHp: { name: 'The Unbonded Colossus', hp: PHASES.length * HITS_PER_PHASE, max: PHASES.length * HITS_PER_PHASE } })
    st.current.mode = 'rise'
    st.current.t = 0
    return () => { world.remove(id); setState({ bossHp: null }) }
  }, [active])

  useFrame((state, rawDt) => {
    if (!g.current) return
    const s = st.current
    const dt = world.hitStop > 0 ? 0 : Math.min(rawDt, 1 / 30)
    const sp = PHASES[Math.min(s.phase, PHASES.length - 1)].speed
    s.t += dt * (s.mode === 'exposed' || s.mode === 'dying' ? 1 : sp)
    const p = world.player
    if (active && p && !s.dead) {
      const a = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
      if (s.mode !== 'exposed') s.facing += Math.atan2(Math.sin(a - s.facing), Math.cos(a - s.facing)) * Math.min(1, dt * 1.6)
      // slow walk toward Kai between attacks
      if (s.mode === 'idle') {
        const d = Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
        if (d > 5) { s.pos.x += Math.sin(s.facing) * dt * 1.6 * sp; s.pos.z += Math.cos(s.facing) * dt * 1.6 * sp }
        const off = Math.hypot(s.pos.x - center[0], s.pos.z - center[2])
        if (off > 8) { s.pos.x = center[0] + ((s.pos.x - center[0]) / off) * 8; s.pos.z = center[2] + ((s.pos.z - center[2]) / off) * 8 }
      }
      switch (s.mode) {
        case 'rise': if (s.t > 1.6) { s.mode = 'idle'; s.t = 0 } break
        case 'idle':
          if (s.t > 1.2) { s.cycle++; s.mode = s.cycle % 3 === 0 ? 'kneel' : s.cycle % 2 ? 'stomp' : 'sweep'; s.t = 0 }
          break
        case 'stomp':
          if (s.t > 0.9 && !s.waveOn && s.t < 1.0) { s.waveOn = true; s.waveR = 1; sfx('stomp') }
          if (s.t > 2.0) { s.mode = 'idle'; s.t = 0 }
          break
        case 'sweep': {
          if (s.t > 0.8 && s.t < 1.05 && !s.swept) {
            const d = Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
            const a2 = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
            const diff = Math.abs(Math.atan2(Math.sin(a2 - s.facing), Math.cos(a2 - s.facing)))
            if (d < 6.2 && diff < 1.2 && !p.rolling && p.pos.y < 1.2) { s.swept = true; p.hurt(2, [s.pos.x, 0, s.pos.z]) }
          }
          if (s.t > 1.6) { s.mode = 'idle'; s.t = 0; s.swept = false }
          break
        }
        case 'kneel':
          if (s.t > 0.8) {
            s.mode = 'exposed'; s.t = 0
            setLabel(PHASES[s.phase].need)
            if (s.phase === 0 && !s.toldExpose) { s.toldExpose = true; toast(PHASES[0].why, 'info', 3600) }
          }
          break
        case 'exposed':
          if (s.t > 5.5) { s.mode = 'rise'; s.t = 0; setLabel(null) }
          break
        default:
      }
      // shockwave ring
      if (s.waveOn) {
        s.waveR += dt * 9 * sp
        const d = Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
        if (Math.abs(d - s.waveR) < 0.6 && p.pos.y < 0.4 && !p.rolling) p.hurt(2, [s.pos.x, 0, s.pos.z])
        if (s.waveR > 16) s.waveOn = false
      }
    }
    // pose
    const kneel = s.mode === 'kneel' ? Math.min(1, s.t / 0.8) : s.mode === 'exposed' ? 1 : s.mode === 'rise' ? Math.max(0, 1 - s.t / 1.2) : s.mode === 'dying' ? 1 : 0
    g.current.position.set(s.pos.x, -kneel * 1.6 - (s.mode === 'dying' ? s.t * 2 : 0), s.pos.z)
    g.current.rotation.y = s.facing
    g.current.rotation.x = s.flinch > 0 ? -0.08 : 0
    s.flinch = Math.max(0, s.flinch - dt)
    const t = state.clock.elapsedTime
    const stompLift = s.mode === 'stomp' ? Math.sin(Math.min(1, s.t / 0.9) * Math.PI) * 1.2 : 0
    const sweep = s.mode === 'sweep' ? (s.t < 0.8 ? -1.2 * (s.t / 0.8) : -1.2 + Math.min(1, (s.t - 0.8) / 0.25) * 2.6) : 0
    armL.current.rotation.set(-0.3 - stompLift * 0.8, 0, 0.3 + Math.sin(t) * 0.05)
    armR.current.rotation.set(-0.3 - stompLift * 0.8, sweep, -0.3 - Math.sin(t) * 0.05)
    const exposed = s.mode === 'exposed'
    core.current.position.y = exposed ? 3.6 : 4.4
    core.current.scale.setScalar(exposed ? 1.35 + Math.sin(t * 6) * 0.08 : 0.8)
    coreMat.current.emissiveIntensity = exposed ? 3 : 0.6
    wave.current.visible = s.waveOn
    if (s.waveOn) { wave.current.position.set(s.pos.x, 0.08, s.pos.z); wave.current.scale.setScalar(s.waveR) }
    if (s.mode === 'dying') g.current.scale.setScalar(Math.max(0.01, 1 - s.t * 0.35))
  })

  if (!active && !st.current.dead) return null
  return (
    <group>
      <group ref={g}>
        {atoms.map((a, i) => (
          <mesh key={i} position={a.p} castShadow><sphereGeometry args={[a.r, 12, 10]} /><meshStandardMaterial color={a.c} roughness={0.4} metalness={0.15} emissive="#110a1a" /></mesh>
        ))}
        {/* empty sockets dotted over its body */}
        {atoms.filter((_, i) => i % 5 === 0).map((a, i) => (
          <mesh key={'s' + i} position={[a.p[0] * 1.18, a.p[1], a.p[2] * 1.18]}><torusGeometry args={[0.18, 0.04, 6, 14]} /><meshBasicMaterial color="#a06bff" toneMapped={false} /></mesh>
        ))}
        {/* legs */}
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 1.1, 0, 0]}>
            {[0.5, 1.3, 2.1].map((y, k) => <mesh key={k} position={[0, y, 0]} castShadow><sphereGeometry args={[0.55, 12, 10]} /><meshStandardMaterial color={k === 1 ? '#3b6fe0' : '#2b2b2b'} roughness={0.4} /></mesh>)}
          </group>
        ))}
        {/* arms: chains of atoms */}
        <group ref={armL} position={[-2.1, 5.4, 0]}>
          {[0, 1, 2, 3].map((k) => <mesh key={k} position={[-0.2 * k, -0.9 * k - 0.4, 0.3 * k]} castShadow><sphereGeometry args={[0.5 - k * 0.04, 12, 10]} /><meshStandardMaterial color={k % 2 ? '#e0453b' : '#2b2b2b'} roughness={0.4} /></mesh>)}
        </group>
        <group ref={armR} position={[2.1, 5.4, 0]}>
          {[0, 1, 2, 3].map((k) => <mesh key={k} position={[0.2 * k, -0.9 * k - 0.4, 0.3 * k]} castShadow><sphereGeometry args={[0.5 - k * 0.04, 12, 10]} /><meshStandardMaterial color={k % 2 ? '#e0453b' : '#2b2b2b'} roughness={0.4} /></mesh>)}
        </group>
        {/* the core: a carbon heart */}
        <group ref={core} position={[0, 4.4, 0.9]}>
          <mesh><icosahedronGeometry args={[0.55, 1]} /><meshStandardMaterial ref={coreMat} color="#1a1a1a" emissive="#43e6f5" emissiveIntensity={0.6} roughness={0.2} toneMapped={false} /></mesh>
          <pointLight color="#43e6f5" intensity={4} distance={8} />
          {label && (
            <Html position={[0, 1.4, 0]} center distanceFactor={12}>
              <div className="coretag">needs <b>{HYBRIDS[label].label}</b> · {HYBRIDS[label].angle}°</div>
            </Html>
          )}
        </group>
        {/* head */}
        <mesh position={[0, 6.8, 0]} castShadow><sphereGeometry args={[0.75, 14, 12]} /><meshStandardMaterial color="#2b2b2b" roughness={0.35} /></mesh>
        <mesh position={[-0.28, 6.9, 0.62]}><sphereGeometry args={[0.12, 8, 6]} /><meshBasicMaterial color="#d6b4ff" toneMapped={false} /></mesh>
        <mesh position={[0.28, 6.9, 0.62]}><sphereGeometry args={[0.12, 8, 6]} /><meshBasicMaterial color="#d6b4ff" toneMapped={false} /></mesh>
      </group>
      <mesh ref={wave} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.93, 1, 64]} />
        <meshBasicMaterial color="#a06bff" transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}
