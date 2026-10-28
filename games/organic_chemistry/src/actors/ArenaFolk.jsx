import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, enemiesPaused } from '../engine/store'
import { STANCES } from '../chem/rules11'
import { BANNERS, BANNER_COLOR } from '../data/dungeon11'

// World 11's people and creatures, built in Blender (tools/walden_blender.py → public/models/walden.glb):
// • Sage Walden (assets/characters/sage-walden.png).
// • Tosylate Ghouls (§11.1): a tosylate is as good a leaving group as a halide. Struck from behind, a ghoul simply
//   leaves; from the front its sigil soaks up two blows.
// • The Five-Stanced Champion (§11.12): the banners set the conditions; it takes the stance they dictate.
//   Strike the banner of the mechanism, then exploit the stance.
preloadModels('walden')

export function Walden(props) {
  const M = useMemo(() => ({
    tunic: rimMat({ color: '#2a2224', roughness: 0.85 }, '#ffb08a', 0.25), cape: rimMat({ color: '#8a1e1e', roughness: 0.75 }, '#ffb08a', 0.35),
    skin: rimMat({ color: '#d8a88a', roughness: 0.6 }, '#ffe0c8', 0.25, 3), hair: rimMat({ color: '#9a9a96', roughness: 0.8 }, '#ffffff', 0.3),
  }), [])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 4.3) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="walden" name="wal_body" mats={M} />
      <group ref={eyes} position={[0, 1.7, 0.05]}><Part model="walden" name="wal_eyes" castShadow={false} /></group>
      <pointLight position={[0, 2.3, 1]} color="#ffc8a0" intensity={1.2} distance={5} />
    </group>
  )
}

const told = { back: false }
export function Ghouls({ world, spawns, active = true, zone, onCleared }) {
  const gs = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), face: Math.PI, hp: 2, state: 'idle', t: Math.random() * 2, cd: 1.5 + i * 0.5 })))
  const refs = useRef([])
  const cleared = useRef(false)
  useEffect(() => {
    if (!active) return
    const ids = gs.current.map((m) => world.addTarget({
      pos: () => [m.pos.x, 1.2, m.pos.z], radius: 0.7, tall: 1.8, alive: () => m.state !== 'dead' && m.state !== 'gone',
      onHit: () => {
        const p = world.player
        const dx = p.pos.x - m.pos.x, dz = p.pos.z - m.pos.z, l = Math.hypot(dx, dz) || 1
        const front = (dx * Math.sin(m.face) + dz * Math.cos(m.face)) / l
        m.hp -= front < -0.3 ? 2 : 1
        sfx('hit')
        if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('pair'); if (front < -0.3 && !told.back) { told.back = true; toast('From behind, it just… leaves. A tosylate is as good a leaving group as a halide.', 'good', 4400, true) } }
        else { m.state = 'stagger'; m.t = 0 }
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
    for (const m of gs.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.scale.setScalar(Math.max(0.01, 1 - m.t * 2)); if (m.t > 0.5) m.state = 'gone'; continue }
      alive++
      const inZone = p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
      if (inZone) {
        const want = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        let d = want - m.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
        m.face += Math.sign(d) * Math.min(Math.abs(d), dt * 2.0)
        const dist = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        if (m.state === 'idle' && dist > 1.8) { m.pos.x += Math.sin(m.face) * dt * 1.6; m.pos.z += Math.cos(m.face) * dt * 1.6 }
        m.cd -= dt
        if (m.state === 'idle' && dist < 2.0 && m.cd <= 0) { m.state = 'claw'; m.t = 0 }
        if (m.state === 'claw' && m.t > 0.45 && !m.hit) { m.hit = true; if (dist < 2.2 && !p.rolling) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.state === 'claw' && m.t > 0.9) { m.state = 'idle'; m.hit = false; m.cd = 1.8 }
      }
      if (m.state === 'stagger' && m.t > 0.5) m.state = 'idle'
      g.position.set(m.pos.x, 0, m.pos.z)
      g.rotation.y = m.face
    }
    if (alive === 0 && !cleared.current && gs.current.every((m) => m.state === 'gone' || m.state === 'dead')) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return <group>{spawns.map((_, i) => <group key={i} ref={(r) => (refs.current[i] = r)}><Part model="walden" name="gho_body" /><pointLight position={[0, 1.2, 0.5]} color="#ffe04a" intensity={1.2} distance={3} /></group>)}</group>
}

const NAME = 'The Five-Stanced Champion'
/**
 * The boss. Each round the banners set the conditions; strike the banner of the mechanism that will happen.
 * Right: the Champion takes that stance and opens up in its own way. Wrong: it punishes the guess.
 *   SN2: it turns side-on; Umbrella (G) from behind. SN1: it lets its leaving group go: wait, then strike.
 *   E2: an anti-periplanar sweep: roll through it, then strike. E1cB: strike before it expels the leaving group.
 */
export default function Champion({ world, center, R = 11, active, onDefeated }) {
  const [round, setRound] = useState(0)
  const [stance, setStance] = useState(null)
  const st = useRef({ mode: 'read', t: 0, pos: new THREE.Vector3(center[0], 0, center[2]), face: 0, open: false })
  const g = useRef(), sweep = useRef()
  const S = STANCES[Math.min(round, STANCES.length - 1)]
  const bannerPos = (k) => { const a = Math.PI * (1.15 + 0.7 * (k / 4)); return [center[0] + Math.cos(a) * R, center[2] + Math.sin(a) * R] }
  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: STANCES.length - round, max: STANCES.length } })
    world.bossCam = true
    s.mode = 'read'; s.t = 0; s.open = false; setStance(null)
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), champ: s, champRound: () => round }
    const ids = BANNERS.map((b, k) => world.addTarget({
      pos: () => { const [x, z] = bannerPos(k); return [x, 2.0, z] }, radius: 0.9, tall: 2.6, alive: () => st.current.mode === 'read',
      onHit: () => {
        if (b === S.mech) { sfx('right'); s.mode = 'stance'; s.t = 0; setStance(b); const p0 = world.player; if (p0) s.face = Math.atan2(p0.pos.x - s.pos.x, p0.pos.z - s.pos.z) + Math.PI / 2; toast(`${b}! ${S.tell}`, 'good', 5200) }
        else { sfx('wrong'); s.mode = 'punish'; s.t = 0; toast(`Not ${b} under these conditions: ${S.cond}. It punishes the guess.`, 'warn', 4800) }
        return true
      },
    }))
    ids.push(world.addTarget({
      pos: () => [s.pos.x, 1.8, s.pos.z], radius: 1.1, tall: 3, alive: () => s.mode !== 'gone',
      onHit: () => {
        if (!s.open || S.mech === 'SN2') { sfx('block'); if (s.mode === 'read') toast('Read the banners first: which mechanism do these conditions call for?', 'info', 3200, true); return false }
        return land()
      },
    }))
    ids.push(world.addLantern({ needs: 'hasUmbrella', omni: true, priority: 1, pos: () => [s.pos.x, 0, s.pos.z], radius: 3.5, label: () => (s.mode === 'stance' && S.mech === 'SN2' ? 'Attack from behind with the Umbrella' : null), onLantern: () => {
      const p = world.player
      const dx = p.pos.x - s.pos.x, dz = p.pos.z - s.pos.z, l = Math.hypot(dx, dz) || 1
      const front = (dx * Math.sin(s.face) + dz * Math.cos(s.face)) / l
      if (front > -0.3) { sfx('block'); toast('That’s its leaving-group side. SN2 comes from the opposite side: get behind it.', 'warn', 3600); return }
      land()
    } }))
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round])
  const land = () => {
    const s = st.current
    sfx('hit'); world.shake = 0.4
    const next = round + 1
    setState({ bossHp: { name: NAME, hp: STANCES.length - next, max: STANCES.length } })
    if (next >= STANCES.length) { s.mode = 'gone'; s.t = 0; setTimeout(() => onDefeated && onDefeated(), 1800); return true }
    s.mode = 'reset'; s.t = 0; s.open = false
    toast('The banners change. New conditions!', 'info', 3000)
    setTimeout(() => setRound(next), 1400)
    return true
  }
  useFrame((state, rawDt) => {
    if (!active || !g.current) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += dt
    const p = world.player
    if (p && s.mode !== 'stance') s.face = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
    if (s.mode === 'stance') {
      if (S.mech === 'SN2') { if (s.t > 9) { s.mode = 'read'; toast('It squares up again. Read the banners.', 'warn', 2600, true) } }
      if (S.mech === 'SN1') { s.open = s.t > 2.5 && s.t < 6; if (s.t > 2.5 && !s.toldIon) { s.toldIon = true; toast('Its leaving group drops away: a flat carbocation. Now!', 'good', 2600) } if (s.t > 6) { s.mode = 'read'; s.toldIon = false } }
      if (S.mech === 'E2') {
        if (sweep.current) { sweep.current.visible = s.t > 1 && s.t < 1.5; sweep.current.scale.setScalar(1 + (s.t - 1) * 16) }
        if (s.t > 1.2 && !s.swept) { s.swept = true; sfx('stomp'); if (p && !p.rolling && Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 7) p.hurt(1, [s.pos.x, 0, s.pos.z]) }
        s.open = s.t > 1.5 && s.t < 4.5
        if (s.t > 4.5) { s.mode = 'read'; s.swept = false }
      }
      if (S.mech === 'E1cB') { s.open = s.t < 3; if (s.t > 3) { s.mode = 'read'; toast('Too slow: it expelled the leaving group. Read again.', 'warn', 2600, true) } }
    }
    if (s.mode === 'punish') {
      if (sweep.current) { sweep.current.visible = s.t < 0.5; sweep.current.scale.setScalar(1 + s.t * 16) }
      if (s.t > 0.2 && !s.punished) { s.punished = true; sfx('stomp'); if (p && !p.rolling && Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 9) p.hurt(1, [s.pos.x, 0, s.pos.z]) }
      if (s.t > 1.2) { s.mode = 'read'; s.punished = false }
    }
    g.current.position.set(s.pos.x - center[0], 0, s.pos.z - center[2])
    g.current.rotation.y = s.face
    g.current.rotation.x = s.open ? 0.15 : 0
    g.current.scale.setScalar(s.mode === 'gone' ? Math.max(0.01, 1 - s.t) : 1)
  })
  return (
    <group position={center}>
      <group ref={g}>
        <Part model="walden" name="chp_body" />
        <group position={[-0.7, 1.7, 0.4]} rotation={[0, -0.3, 0]}><Part model="walden" name="chp_shield" /></group>
        <pointLight position={[0, 2.6, 1]} color="#ff8a5a" intensity={3} distance={8} />
        {active && <Tag position={[0, 3.6, 0]} df={12}>{stance ? `stance: ${stance}` : 'reading the banners…'}</Tag>}
      </group>
      <mesh ref={sweep} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[0.6, 0.75, 32]} /><meshBasicMaterial color="#ff6a3a" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      {active && BANNERS.map((b, k) => {
        const [x, z] = bannerPos(k)
        return (
          <group key={b} position={[x - center[0], 0, z - center[2]]}>
            <Part model="wastes" name="a11_gate" scale={0.6} rotation={[0, Math.atan2(-(x - center[0]), -(z - center[2])), 0]} />
            <mesh position={[0, 3.6, 0]}><boxGeometry args={[1.0, 1.8, 0.06]} /><meshStandardMaterial color={BANNER_COLOR[b]} emissive={BANNER_COLOR[b]} emissiveIntensity={0.4} /></mesh>
            <Tag position={[0, 4.9, 0]} df={11} far={26}>{b}</Tag>
          </group>
        )
      })}
      {active && <Tag position={[0, 6.4, -6]} df={15}>{`Conditions: ${S.cond}`}</Tag>}
    </group>
  )
}
