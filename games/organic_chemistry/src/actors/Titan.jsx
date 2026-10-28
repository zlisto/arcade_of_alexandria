import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { carbonUp } from '../chem/rules4'
import { padPos, useFlipProgress } from './ChairRing'
import { setState, getState, toast } from '../engine/store'
import { sfx } from '../audio/sfx'

// The tert-Butyl Titan (boss of the Chair Fortress; book §4.6–4.8). The arena floor is a giant chair:
// six seat-pads round the hall, three raised and three lowered. Anything standing on the TOP face of a
// raised carbon is axial; on a lowered carbon it is equatorial. The Titan — a tert-butyl group, the bulkiest
// of all (11.4 kJ/mol per 1,3-diaxial H, Worked Example 4.3) — only ever lands on a lowered pad.
// Kai flips the arena with the Ring-Flip Gauntlet: its pad rises, it is axial, and the other two raised pads
// (its 1,3-diaxial partners, two seats away either side) slam it: 2 × 11.4 = 22.8 kJ/mol. It staggers; hit it.
// Two hits a phase, three phases: faster leaps, then shockwaves when it lands.
// Built in Blender (tools/giants_blender.py → public/models/giants.glb).
preloadModels('giants')

const PHASES = [{ stagger: 4.6, leap: 1.3, slam: 1.25, every: 0 }, { stagger: 3.9, leap: 1.05, slam: 1.05, every: 6.5 }, { stagger: 3.3, leap: 0.85, slam: 0.9, every: 5 }]
const HITS = 3
const PAD_R = 7.2
const NAME = 'The tert-Butyl Titan · (CH₃)₃C–'

export default function Titan({ world, center, active, onDefeated, onPhase }) {
  const M = useMemo(() => ({
    stone: rimMat({ color: '#8a84a8', roughness: 0.8 }, '#e8e0ff', 0.45),
    stoneDark: rimMat({ color: '#625c80', roughness: 0.85 }, '#e8e0ff', 0.35),
    core: new THREE.MeshStandardMaterial({ color: '#4a4062', metalness: 0.3, roughness: 0.4 }),
    seam: new THREE.MeshStandardMaterial({ color: '#c890ff', emissive: new THREE.Color('#a060ff'), emissiveIntensity: 2.2, toneMapped: false }),
    methyl: rimMat({ color: '#d0508e', roughness: 0.45 }, '#ffd0e8', 0.4),
    hydrogen: rimMat({ color: '#f2f2f2', roughness: 0.35 }, '#ffffff', 0.3),
    titanEye: new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: new THREE.Color('#ffb04a'), emissiveIntensity: 2.4, toneMapped: false }),
    dark: new THREE.MeshBasicMaterial({ color: '#140e0e' }),
    beam: new THREE.MeshBasicMaterial({ color: '#e8fcff', transparent: true, opacity: 0.85, toneMapped: false }),
    mark: new THREE.MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: 0.6, toneMapped: false, side: THREE.DoubleSide }),
    wave: new THREE.MeshBasicMaterial({ color: '#ffd0a0', transparent: true, opacity: 0.8, toneMapped: false, side: THREE.DoubleSide }),
  }), [])
  const C = useMemo(() => new THREE.Vector3(...center), [center])
  const st = useRef(null)
  if (!st.current) st.current = { flip: false, phase: 0, hits: 0, mode: 'rise', t: 0, pad: 1, from: 1, to: 1, aim: new THREE.Vector3(), cd: 2.5, idle: 0, wave: -1, flipCd: 0 }
  const flipRef = useRef(false)
  const prog = useFlipProgress(false, 3)
  const spark = useRef()
  const lean = useRef(), body = useRef(), armL = useRef(), armR = useRef(), pads = useRef([]), beams = useRef([]), mark = useRef(), wave = useRef()
  const padFloors = useRef([])
  const [strainedTag, setStrainedTag] = useState(false)

  const padXZ = (k) => { const [x, z] = padPos(k, PAD_R); return [C.x + x, C.z + z] }
  const isUp = (k) => carbonUp(k, st.current.flip)
  const downPads = () => [0, 1, 2, 3, 4, 5].filter((k) => !isUp(k))

  // pad floors: the raised pads are 0.4 m high, a step Kai can take
  useEffect(() => {
    padFloors.current = [0, 1, 2, 3, 4, 5].map((k) => { const [x, z] = padXZ(k); const id = world.addFloor(x - 1.3, z - 1.3, x + 1.3, z + 1.3, 0.4); world.setEnabled(id, isUp(k)); return id })
    return () => padFloors.current.forEach((id) => world.remove(id))
  }, [world])

  useEffect(() => {
    if (!active) return
    const s = st.current
    const total = PHASES.length * HITS
    const hp = () => setState({ bossHp: { name: NAME, hp: total - (s.phase * HITS + s.hits), max: total } })
    hp()
    s.hpFn = hp
    world.bossCam = true
    const ids = []
    ids.push(world.addLantern({
      needs: 'hasGauntlet', pos: [C.x, 0, C.z], radius: 16, priority: 2, omni: true,
      label: () => (s.mode === 'down' || s.mode === 'rise' ? null : 'Ring-flip the arena'),
      onLantern: () => flipArena(),
    }))
    ids.push(world.addTarget({
      pos: () => { const [x, z] = padXZ(s.pad); return [x, s.mode === 'strained' ? 1.6 : 3, z] }, radius: 2.0, tall: 3,
      alive: () => s.mode !== 'down' && s.mode !== 'rise',
      onHit: () => {
        if (s.mode !== 'strained') {
          sfx('block')
          if (!s.toldGlance || performance.now() - s.toldGlance > 5000) { s.toldGlance = performance.now(); toast('It sits equatorial: comfortable, untouchable. Flip the arena (G) while it\'s on a pad.', 'warn', 3600) }
          return false
        }
        s.hits++; s.stagHits = (s.stagHits || 0) + 1; sfx('hit'); world.shake = 0.3
        if (s.hits < HITS && s.stagHits >= 2) { hp(); toast('It wrenches itself loose and leaps! Make it sit axial again.', 'info', 3000, true); leap(); return true }
        if (s.hits >= HITS) {
          s.hits = 0; s.phase++
          if (s.phase >= PHASES.length) { s.mode = 'down'; s.t = 0; setState({ bossHp: { name: NAME, hp: 0, max: total } }); setTimeout(() => onDefeated && onDefeated(), 2600); return true }
          onPhase && onPhase(s.phase)
          toast(s.phase === 1 ? 'It shakes it off and leaps: faster now, and it won\'t sit still.' : 'Last phase! Its landings send shockwaves: roll through them.', 'good', 3600)
          leap()
        }
        hp()
        return true
      },
    }))
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), titan: s, flipArena: () => flipArena() }
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active])

  const flipArena = () => {
    const s = st.current
    if (s.flipCd > 0 || s.mode === 'down' || s.mode === 'rise') return
    s.flip = !s.flip; flipRef.current = s.flip; s.flipCd = 1.1
    sfx('stomp'); world.shake = 0.35
    padFloors.current.forEach((id, k) => world.setEnabled(id, isUp(k)))
    if (s.mode === 'perch' || s.mode === 'windup') strain()
    else if (s.mode === 'strained' && !isUp(s.pad)) {
      // it was already axial, and the flip let it off: its bond points out round the equator again
      s.mode = 'windup'; s.t = 0; s.aim.set(world.player ? world.player.pos.x : C.x, 0, world.player ? world.player.pos.z : C.z)
      if (s.hits > 0) { s.hits--; s.hpFn && s.hpFn() }
      toast('Equatorial again: comfortable and furious! Check its pad before you flip.', 'warn', 4600)
    }
  }
  const strain = (free = false) => {
    const s = st.current
    if (!isUp(s.pad)) return
    s.mode = 'strained'; s.t = 0; s.stagHits = 0; s.stagMax = free ? 1.5 : null; sfx('hurt')
    if (!s.toldStrain) { s.toldStrain = true; toast('Axial! Its two 1,3-diaxial partners slam it: 2 × 11.4 = 22.8 kJ/mol. Strike!', 'good', 4200) }
  }
  const leap = () => {
    const s = st.current
    // from phase 2 it sometimes lands on a raised pad: already axial. Flipping then would rescue it.
    const pool = s.phase >= 1 && Math.random() < 0.35 ? [0, 1, 2, 3, 4, 5].filter((k) => isUp(k)) : downPads()
    const opts = pool.filter((k) => k !== s.pad)
    s.from = s.pad; s.to = opts[Math.floor(Math.random() * opts.length)] ?? s.pad
    s.mode = 'leap'; s.t = 0; s.idle = 0; sfx('dash')
  }

  useFrame((state, rawDt) => {
    const s = st.current
    const g = body.current
    if (!g) return
    // the arena pads see-saw with the flip progress
    prog.current += ((s.flip ? 1 : 0) - prog.current) * Math.min(1, rawDt * 3)
    const f = prog.current
    for (let k = 0; k < 6; k++) {
      const m = pads.current[k]
      if (!m) continue
      const up0 = carbonUp(k, false) ? 1 : 0
      const h = up0 ? 1 - f : f // 1 = raised
      m.position.y = -0.6 + h * 0.4
      const ring = m.getObjectByName('padRing')
      if (ring) ring.material.color.set(h > 0.5 ? '#ff8a6a' : '#6fe39a')
      const axH = m.getObjectByName('axH')
      if (axH) axH.visible = h > 0.5 && !(st.current.pad === k && st.current.mode !== 'leap')
    }
    if (!active) { g.visible = !getState().save.solved.boss4 ? true : g.visible; return }
    const frozen = !!(getState().dialogue || getState().panel)
    const dt = world.hitStop > 0 || frozen ? 0 : Math.min(rawDt, 1 / 30)
    const P = PHASES[Math.min(s.phase, PHASES.length - 1)]
    const p = world.player
    s.t += dt; s.flipCd -= dt
    // a knockout puts Kai back at the door: the Titan recovers too (the fight starts over)
    if (p) { if (s.lastP && Math.hypot(p.pos.x - s.lastP[0], p.pos.z - s.lastP[1]) > 6 && s.mode !== 'down') { s.phase = 0; s.hits = 0; s.hpFn && s.hpFn(); toast('The Titan steadies itself. Start again.', 'info', 2600) } s.lastP = [p.pos.x, p.pos.z] }
    const [px, pz] = padXZ(s.pad)
    const padY = (k) => { const up0 = carbonUp(k, false) ? 1 : 0; return (up0 ? 1 - f : f) * 0.4 }
    let y = padY(s.pad), x = px, z = pz, kneel = 0
    beams.current.forEach((b) => b && (b.visible = false))
    if (s.mode === 'rise') {
      y = -8 + Math.min(1, s.t / 2) * 8
      if (s.t > 2.2) { s.mode = 'perch'; s.t = 0 }
    } else if (s.mode === 'perch') {
      s.cd -= dt; s.idle += dt
      if (P.every && s.idle > P.every) leap()
      else if (s.cd <= 0 && p) { s.mode = 'windup'; s.t = 0; s.aim.set(p.pos.x, 0, p.pos.z) }
    } else if (s.mode === 'windup') {
      if (p && s.t < P.slam * 0.6) s.aim.set(p.pos.x, 0, p.pos.z) // tracks, then commits
      if (s.t > P.slam) {
        s.mode = 'perch'; s.cd = 2.4 - s.phase * 0.4; s.t = 0; sfx('stomp'); world.shake = 0.4
        if (p && Math.hypot(p.pos.x - s.aim.x, p.pos.z - s.aim.z) < 2.3 && !p.rolling) p.hurt(2, [s.aim.x, 0, s.aim.z])
      }
    } else if (s.mode === 'strained') {
      kneel = Math.min(1, s.t * 3)
      // the two other raised pads — two seats away on either side — strike it: 1,3-diaxial
      ;[(s.pad + 2) % 6, (s.pad + 4) % 6].forEach((k, i) => {
        const b = beams.current[i]
        if (!b) return
        const [bx, bz] = padXZ(k)
        const A = new THREE.Vector3(bx - C.x, 1.25, bz - C.z), B = new THREE.Vector3(px - C.x, 2.4, pz - C.z) // from the axial H on that pad
        b.visible = true
        b.position.copy(A).add(B).multiplyScalar(0.5)
        b.scale.set(1 + Math.sin(s.t * 30) * 0.3, A.distanceTo(B), 1 + Math.sin(s.t * 30) * 0.3)
        b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize())
      })
      if (s.t > (s.stagMax || P.stagger)) leap()
    } else if (s.mode === 'leap') {
      const u = Math.min(1, s.t / P.leap)
      const [ax, az] = padXZ(s.from), [bx, bz] = padXZ(s.to)
      x = ax + (bx - ax) * u; z = az + (bz - az) * u
      y = padY(s.to) * u + padY(s.from) * (1 - u) + Math.sin(u * Math.PI) * 6
      if (u >= 1) {
        s.pad = s.to; s.mode = 'perch'; s.t = 0; s.cd = 1.4; sfx('stomp'); world.shake = 0.5
        if (s.phase >= 2) { s.wave = 0; s.waveC = [bx, bz] }
        if (isUp(s.pad)) strain(true) // it landed on a raised pad: axial, but only for a moment
      }
    } else if (s.mode === 'down') {
      kneel = Math.min(1.6, s.t * 0.8)
      y = padY(s.pad) - Math.max(0, s.t - 1.2) * 2
    }
    // the landing shockwave (phase 3): a ring rolling out; roll through it or jump
    if (s.wave >= 0) {
      s.wave += dt * 9
      const r = s.wave
      if (wave.current) { wave.current.visible = true; wave.current.position.set(s.waveC[0] - C.x, 0.08, s.waveC[1] - C.z); wave.current.scale.setScalar(Math.max(0.01, r)); wave.current.material.opacity = Math.max(0, 0.9 - r / 16) }
      if (p && !p.rolling && p.pos.y < 0.5 && Math.abs(Math.hypot(p.pos.x - s.waveC[0], p.pos.z - s.waveC[1]) - r) < 0.55 && !s.waveHit) { s.waveHit = true; p.hurt(1, [s.waveC[0], 0, s.waveC[1]]) }
      if (r > 15) { s.wave = -1; s.waveHit = false; if (wave.current) wave.current.visible = false }
    }
    // telegraph of the fist slam
    if (mark.current) {
      mark.current.visible = s.mode === 'windup'
      if (s.mode === 'windup') { mark.current.position.set(s.aim.x - C.x, 0.06, s.aim.z - C.z); mark.current.material.opacity = 0.3 + 0.5 * Math.abs(Math.sin(s.t * 10)) }
    }
    // its bond to the ring: straight up on a raised pad (axial), tipped out round the equator on a lowered one
    world.bossFocus = [x, y, z]
    if (lean.current) {
      lean.current.position.set(x - C.x, y - kneel * 1.6, z - C.z)
      const eq = !isUp(s.pad) && s.mode !== 'leap' && s.mode !== 'rise'
      const [ox, oz] = padPos(s.pad, 1)
      const want = eq ? new THREE.Vector3(ox * 0.42, 1, oz * 0.42).normalize() : new THREE.Vector3(0, 1, 0)
      lean.current.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), want), Math.min(1, dt * 4 + 0.001))
    }
    g.position.set(0, 0, 0)
    if (p && s.mode !== 'leap') g.rotation.y += (Math.atan2(p.pos.x - x, p.pos.z - z) - g.rotation.y) * Math.min(1, dt * 3)
    g.rotation.z = s.mode === 'strained' ? Math.sin(s.t * 18) * 0.06 : 0
    g.rotation.x = s.mode === 'down' ? Math.min(1.3, s.t * 0.6) : kneel * 0.25
    const sw = s.mode === 'windup' ? -Math.min(2.6, s.t * 3) : s.mode === 'perch' && s.t < 0.3 ? -2.6 + s.t * 8.6 : 0
    if (armR.current) armR.current.rotation.x = sw
    if (armL.current) armL.current.rotation.x = s.mode === 'strained' ? -0.8 : Math.sin(state.clock.elapsedTime * 1.3) * 0.08
    if ((s.mode === 'strained') !== strainedTag) setStrainedTag(s.mode === 'strained')
    // Malradix's violet spark, lodged in its chest; when it falls the spark tears free and flees east
    if (spark.current) {
      const T2 = state.clock.elapsedTime
      if (s.mode !== 'down') { s.sparkT = -1; spark.current.visible = true; spark.current.position.set(x - C.x + Math.sin(T2 * 7) * 0.15, y + 4.6 + Math.cos(T2 * 9) * 0.15, z - C.z + 1.2) }
      else {
        if (s.sparkT < 0) { s.sparkT = 0; sfx('shard') }
        s.sparkT += rawDt
        spark.current.position.set(x - C.x + s.sparkT * 9, y + 4.6 + s.sparkT * 4, z - C.z)
        spark.current.visible = s.sparkT < 2.4
      }
    }
  })

  return (
    <group position={[C.x, 0, C.z]}>
      {/* the chair floor: six seat-pads at alternating heights, bonds between them */}
      {[0, 1, 2, 3, 4, 5].map((k) => { const [x, z] = padPos(k, PAD_R); return (
        <group key={k} ref={(m) => (pads.current[k] = m)} position={[x, -0.6, z]}>
          <group scale={[1.2, 1, 1.2]}><Part model="fortress" name="f4_pad" /></group>
          {/* the axial H on this carbon's top face: there only while the carbon is raised */}
          <mesh name="axH" position={[0, 1.25, 0]}><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color="#ffffff" emissive="#bfe8ff" emissiveIntensity={1.2} toneMapped={false} /></mesh>
          <mesh name="padRing" position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.0, 1.3, 32]} /><meshBasicMaterial color="#6fe39a" toneMapped={false} /></mesh>
        </group>
      ) })}
      {[0, 1, 2, 3, 4, 5].map((k) => { const [x0, z0] = padPos(k, PAD_R), [x1, z1] = padPos((k + 1) % 6, PAD_R); const l = Math.hypot(x1 - x0, z1 - z0); return (
        <mesh key={'b' + k} position={[(x0 + x1) / 2, 0.03, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, -Math.atan2(z1 - z0, x1 - x0)]}><planeGeometry args={[l - 2.6, 0.5]} /><meshStandardMaterial color="#8a86a0" emissive="#5ff0ff" emissiveIntensity={0.25} /></mesh>
      ) })}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.4, 6]} /><meshStandardMaterial color="#5ff0ff" emissive="#3ad8ff" emissiveIntensity={0.8} /></mesh>
      <group ref={spark} visible={false}>
        <mesh><sphereGeometry args={[0.28, 14, 10]} /><meshBasicMaterial color="#c070ff" toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.55, 14, 10]} /><meshBasicMaterial color="#a050ff" transparent opacity={0.3} depthWrite={false} toneMapped={false} /></mesh>
        <pointLight color="#c070ff" intensity={4} distance={6} />
      </group>
      <group ref={lean} position={[0, -8, 0]}><group ref={body}>
        <Part model="giants" name="ttn_body" mats={M} />
        <group ref={armL} position={[-1.75, 4.3, 0]}><Part model="giants" name="ttn_armL" mats={M} /></group>
        <group ref={armR} position={[1.75, 4.3, 0]}><Part model="giants" name="ttn_armR" mats={M} /></group>
        <pointLight position={[0, 4, 2.5]} color="#c890ff" intensity={5} distance={10} />
        {strainedTag && <Tag position={[0, 8, 0]} df={16}>axial! 2 × 11.4 = 22.8 kJ/mol</Tag>}
      </group></group>
      {[0, 1].map((i) => <mesh key={'beam' + i} ref={(m) => (beams.current[i] = m)} visible={false} material={M.beam}><cylinderGeometry args={[0.18, 0.18, 1, 10]} /></mesh>)}
      <mesh ref={mark} visible={false} rotation={[-Math.PI / 2, 0, 0]} material={M.mark}><circleGeometry args={[2.3, 32]} /></mesh>
      <mesh ref={wave} visible={false} rotation={[-Math.PI / 2, 0, 0]} material={M.wave}><ringGeometry args={[0.92, 1.0, 64]} /></mesh>
    </group>
  )
}
