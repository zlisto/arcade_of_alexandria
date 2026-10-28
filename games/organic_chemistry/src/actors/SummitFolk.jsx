import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, enemiesPaused, openPanel } from '../engine/store'
import { Malradix } from './MalradixModel'
import { DISGUISES } from '../chem/rules12'

// World 12's people and creatures, built in Blender (tools/spectra_blender.py → public/models/spectra.glb):
// • Astronomer Spectra (assets/characters/astronomer-spectra.png).
// • Fragment Phantoms (§12.1–12.2): cation radicals that shatter into fragments, each lighter than the whole.
// • The Disguised Sorcerer (§12.2–12.8): Malradix behind a false form. Strike the two mass crystals to weigh him (M⁺
//   and the base peak), turn the Spectra Lens on him (his IR bands), then name the molecule that fits it all.
preloadModels('spectra')

export function Spectra(props) {
  const M = useMemo(() => ({
    robe: rimMat({ color: '#1e2a6a', roughness: 0.7 }, '#c8d8ff', 0.4), robeDark: rimMat({ color: '#141c48', roughness: 0.75 }, '#c8d8ff', 0.25),
    skin: rimMat({ color: '#e8c4aa', roughness: 0.55 }, '#f0f4ff', 0.25, 3), hair: rimMat({ color: '#5a3a24', roughness: 0.7 }, '#c8d8ff', 0.25),
  }), [])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 4.4) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="spectra" name="spc_body" mats={M} />
      <group ref={eyes} position={[0, 1.66, 0.05]}><Part model="spectra" name="spc_eyes" castShadow={false} /></group>
      <pointLight position={[-0.24, 1.6, 0.6]} color="#e8f0ff" intensity={2.2} distance={5} />
    </group>
  )
}

const told = { frag: false }
export function Phantoms({ world, spawns, active = true, zone }) {
  const ps = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), hp: 2, state: 'idle', t: Math.random() * 3, cd: 2 + i })))
  const refs = useRef([])
  useEffect(() => {
    if (!active) return
    const ids = ps.current.map((m) => world.addTarget({
      pos: () => [m.pos.x, 1.2, m.pos.z], radius: 0.8, tall: 2, alive: () => m.state !== 'dead' && m.state !== 'gone',
      onHit: () => {
        m.hp--; sfx('hit')
        if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('pair') } else { m.state = 'stagger'; m.t = 0 }
        if (!told.frag) { told.frag = true; toast('It shatters into pieces, each lighter than the whole: fragments, below M⁺.', 'info', 4000, true) }
        return true
      },
    }))
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    for (const m of ps.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.scale.setScalar(1 + m.t * 2); g.children.forEach((c) => c.material && (c.material.opacity = Math.max(0, 1 - m.t * 2))); if (m.t > 0.5) m.state = 'gone'; continue }
      const inZone = p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
      if (inZone) {
        const want = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z), d = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        if (m.state === 'idle' && d > 1.8) { m.pos.x += Math.sin(want) * dt * 1.5; m.pos.z += Math.cos(want) * dt * 1.5 }
        m.cd -= dt
        if (m.state === 'idle' && d < 2.0 && m.cd <= 0) { m.state = 'strike'; m.t = 0 }
        if (m.state === 'strike' && m.t > 0.5 && !m.hit) { m.hit = true; if (d < 2.2 && !p.rolling) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.state === 'strike' && m.t > 1) { m.state = 'idle'; m.hit = false; m.cd = 2 }
      }
      if (m.state === 'stagger' && m.t > 0.5) m.state = 'idle'
      g.position.set(m.pos.x, 0.2 + Math.sin(state.clock.elapsedTime * 2 + m.i) * 0.15, m.pos.z)
      g.rotation.y += dt * 0.6
    }
  })
  if (!active) return null
  return <group>{spawns.map((_, i) => <group key={i} ref={(r) => (refs.current[i] = r)}><Part model="spectra" name="frg_body" /><pointLight position={[0, 1.2, 0]} color="#ff6ad0" intensity={1.4} distance={4} /></group>)}</group>
}

const NAME = 'The Disguised Sorcerer · ?'
export default function Sorcerer({ world, center, active, onDefeated }) {
  const [round, setRound] = useState(0)
  const [ev, setEv] = useState({ m1: false, m2: false, ir: false })
  const evRef = useRef(ev)
  evRef.current = ev
  const st = useRef({ mode: 'fight', t: 0, orbT: 3, wave: -1 })
  const pending = useRef(false)
  const g = useRef(), wave = useRef(), cryst = useRef([])
  const D = DISGUISES[Math.min(round, DISGUISES.length - 1)]
  const crystalPos = (k) => [center[0] + (k ? 7 : -7), center[2] + 4]
  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: DISGUISES.length - round, max: DISGUISES.length } })
    world.bossCam = true
    setEv({ m1: false, m2: false, ir: false })
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), sorc: s, sorcRound: () => round }
    const ids = [0, 1].map((k) => world.addTarget({
      pos: () => { const [x, z] = crystalPos(k); return [x, 1.5, z] }, radius: 0.9, tall: 2.4, alive: () => !(k ? evRef.current.m2 : evRef.current.m1),
      onHit: () => { sfx('shard'); setEv((e) => ({ ...e, [k ? 'm2' : 'm1']: true })); toast(k ? `The second crystal rings: the base peak, m/z = ${D.base}.` : `The first crystal rings: M⁺ at m/z = ${D.M}. No M + 2 peak beside it.`, 'good', 4200); return true },
    }))
    ids.push(world.addLantern({ needs: 'hasLens', omni: true, priority: 1, pos: [center[0], 0, center[2]], radius: 8, label: () => (evRef.current.ir ? null : 'Turn the Spectra Lens on him'), onLantern: () => { sfx('stance'); setEv((e) => ({ ...e, ir: true })); toast(`His light splits: bands at ${D.bands.map((b) => b.label).join(', ')} cm⁻¹.`, 'good', 4600) } }))
    ids.push(world.addInteractable({ pos: [center[0], 0, center[2] + 4], radius: 3.2, label: () => (!pending.current && evRef.current.m1 && evRef.current.m2 && evRef.current.ir ? 'Name what he truly is' : null), onInteract: async () => {
      if (pending.current) return
      const ok = await openPanel('sorcerer', { round })
      if (!ok) return
      pending.current = true
      setTimeout(() => (pending.current = false), 2000)
      sfx('shard'); world.shake = 0.5
      const next = round + 1
      setState({ bossHp: { name: NAME, hp: DISGUISES.length - next, max: DISGUISES.length } })
      if (next >= DISGUISES.length) { s.mode = 'gone'; s.t = 0; setTimeout(() => onDefeated && onDefeated(), 1600); return }
      toast('The disguise shatters, and another forms beneath it!', 'warn', 3200)
      setTimeout(() => setRound(next), 1200)
    } }))
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round])
  useFrame((state, rawDt) => {
    if (!active || !g.current) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += dt
    const p = world.player
    s.orbT -= dt
    if (s.mode === 'fight' && s.orbT <= 0 && s.wave < 0) { s.wave = 0; s.orbT = 4.5 - round * 0.7; sfx('dash') }
    if (s.wave >= 0) {
      s.wave += dt * 9
      if (wave.current) { wave.current.visible = true; wave.current.scale.setScalar(Math.max(0.1, s.wave)) }
      if (p && !p.rolling && !s.waveHit && Math.abs(Math.hypot(p.pos.x - center[0], p.pos.z - center[2]) - s.wave) < 0.6) { s.waveHit = true; p.hurt(1, [center[0], 0, center[2]]) }
      if (s.wave > 14) { s.wave = -1; s.waveHit = false; if (wave.current) wave.current.visible = false }
    }
    g.current.position.set(0, 0.4 + Math.sin(state.clock.elapsedTime * 1.4) * 0.2, 0)
    if (p) g.current.rotation.y = Math.atan2(p.pos.x - center[0], p.pos.z - center[2])
    g.current.scale.setScalar(s.mode === 'gone' ? Math.max(0.01, 1.4 * (1 - s.t)) : 1.4)
  })
  const disguiseColor = ['#5ae8ff', '#ffd060', '#9aff9a'][Math.min(round, 2)]
  return (
    <group position={center}>
      <group ref={g}>
        <Malradix />
        {/* the disguise: a shell of coloured light round him */}
        <mesh position={[0, 1.4, 0]}><sphereGeometry args={[1.3, 24, 16]} /><meshStandardMaterial color={disguiseColor} emissive={disguiseColor} emissiveIntensity={0.6} transparent opacity={0.28} depthWrite={false} /></mesh>
        <pointLight position={[0, 2, 1]} color={disguiseColor} intensity={4} distance={9} />
        {active && <Tag position={[0, 3.6, 0]} df={12}>{`M⁺ ${ev.m1 ? D.M : '?'} · base ${ev.m2 ? D.base : '?'} · IR ${ev.ir ? D.bands.map((b) => b.label).join(', ') : '?'}`}</Tag>}
      </group>
      <mesh ref={wave} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[0.92, 1.0, 48]} /><meshBasicMaterial color={disguiseColor} transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>
      {active && [0, 1].map((k) => { const [x, z] = crystalPos(k); const lit = k ? ev.m2 : ev.m1; return (
        <group key={k} position={[x - center[0], 0, z - center[2]]}>
          <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.7, 0.8, 1.0, 8]} /><meshStandardMaterial color="#8a8ea0" /></mesh>
          <mesh position={[0, 1.8, 0]}><octahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color={lit ? '#ffe8a0' : '#9ab0c8'} emissive={lit ? '#c8a040' : '#2a3a4a'} emissiveIntensity={0.8} /></mesh>
          <Tag position={[0, 2.9, 0]} df={10} far={22}>{k ? 'the fragment crystal' : 'the weighing crystal'}</Tag>
        </group>
      ) })}
    </group>
  )
}
