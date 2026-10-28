import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getEnv } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { setState, getState, toast } from '../engine/store'
import { sfx } from '../audio/sfx'

// The Racemic King (boss of the Mirror Palace; book §5.8, 5.12). Two mirror-image halves, gold (R) and
// silver (S), fused into one king. Strike one half and the other undoes it: like a racemate, whose two
// enantiomers cancel each other's rotation, the pair shows nothing. Mirror images share every property,
// so nothing achiral can tell them apart. When its crown glows, G pairs the King with Sister Tartara's
// single-handed (R) glove: R·R and S·R are diastereomers, with different properties, so the halves come
// apart — the gold half heavy and slow, the silver light. Strike each while they are apart.
// Built in Blender (tools/king_blender.py → public/models/king.glb).
preloadModels('king')

const PHASES = [{ glow: 2.8, every: 5.5, speed: 1.6, wind: 1.2 }, { glow: 2.2, every: 4.6, speed: 2.1, wind: 1.0 }, { glow: 1.7, every: 4.0, speed: 2.6, wind: 0.85 }]
const SPLIT = 5.5
const NAME = 'The Racemic King · (±)'

export default function RacemicKing({ world, center, active, onDefeated }) {
  const gl = useThree((s) => s.gl)
  const M = useMemo(() => {
    const env = getEnv(gl)
    const metal = (c, r = 0.25) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.95, roughness: r, envMap: env, envMapIntensity: 1.2 })
    return {
      gold: metal('#e0b048'), goldDark: metal('#8a6420', 0.35), goldRobe: new THREE.MeshStandardMaterial({ color: '#a87828', metalness: 0.3, roughness: 0.6 }),
      silver: metal('#e2e6f0', 0.18), silverDark: metal('#7a8090', 0.3), silverRobe: new THREE.MeshStandardMaterial({ color: '#a4aec2', metalness: 0.3, roughness: 0.6 }),
      void: new THREE.MeshBasicMaterial({ color: '#0e0a18' }),
      eyeG: new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: new THREE.Color('#ffb040'), emissiveIntensity: 2.4, toneMapped: false }),
      eyeS: new THREE.MeshStandardMaterial({ color: '#e0f4ff', emissive: new THREE.Color('#7ac8ff'), emissiveIntensity: 2.4, toneMapped: false }),
      gemG: new THREE.MeshStandardMaterial({ color: '#ff8a5a', emissive: new THREE.Color('#ff5a2a'), emissiveIntensity: 1.6, toneMapped: false }),
      gemS: new THREE.MeshStandardMaterial({ color: '#7ab8ff', emissive: new THREE.Color('#3a88ff'), emissiveIntensity: 1.6, toneMapped: false }),
    }
  }, [gl])
  const C = useMemo(() => new THREE.Vector3(...center), [center])
  const st = useRef(null)
  if (!st.current) st.current = { phase: 0, mode: 'rise', t: 0, pos: new THREE.Vector3(C.x, 0, C.z - 4), facing: 0, glowT: -99, nextGlow: 3, split: 0, hitG: false, hitS: false, cd: 3, aim: new THREE.Vector3() }
  const gold = useRef(), silver = useRef(), crown = useRef(), mark = useRef(), spark = useRef()
  const [tagMode, setTagMode] = useState(null)

  useEffect(() => {
    if (!active) return
    const s = st.current
    const total = PHASES.length * 2
    const hp = () => setState({ bossHp: { name: NAME, hp: total - (s.phase * 2 + (s.hitG ? 1 : 0) + (s.hitS ? 1 : 0)), max: total } })
    hp()
    world.bossCam = true
    const half = (which) => world.addTarget({
      pos: () => { const p = halfPos(which); return [p.x, 2.0, p.z] }, radius: 1.3, tall: 3.6,
      alive: () => s.mode !== 'down' && s.mode !== 'rise',
      onHit: () => {
        if (s.split <= 0) {
          sfx('block')
          if (!s.toldCancel || performance.now() - s.toldCancel > 6000) { s.toldCancel = performance.now(); toast('The other half undoes the blow. Two mirror images, cancelling: racemic. Wait for the crown to glow (G).', 'warn', 4800) }
          return false
        }
        if (which === 'gold' ? s.hitG : s.hitS) return false
        if (which === 'gold') s.hitG = true; else s.hitS = true
        sfx('hit'); world.shake = 0.3; hp()
        if (s.hitG && s.hitS) {
          s.phase++; s.hitG = s.hitS = false; s.split = 0; s.mode = 'rejoin'; s.t = 0
          if (s.phase >= PHASES.length) { s.mode = 'down'; s.t = 0; setState({ bossHp: { name: NAME, hp: 0, max: total } }); setTimeout(() => onDefeated && onDefeated(), 2600) }
          else toast(s.phase === 1 ? 'They fuse again, angrier. The crown will glow for less time.' : 'Last phase! Faster still.', 'good', 3600)
        }
        return true
      },
    })
    const ids = [half('gold'), half('silver')]
    ids.push(world.addLantern({
      needs: 'hasShield', omni: true, pos: () => [s.pos.x, 0, s.pos.z], radius: 16, priority: 2,
      label: () => (s.mode === 'down' || s.mode === 'rise' || s.split > 0 || s.t < s.glowT || s.t > s.glowT + PHASES[Math.min(s.phase, 2)].glow ? null : 'Pair it with the chiral glove'),
      onLantern: () => {
        if (s.split > 0 || s.mode === 'down' || s.mode === 'rise') return
        if (s.t < s.glowT || s.t > s.glowT + PHASES[Math.min(s.phase, 2)].glow) { sfx('wrong'); toast('The glove slips off: its crown isn’t open. It answers with both sceptres!', 'warn', 3000); if (s.mode === 'walk' && world.player) { s.mode = 'wind'; s.wt = PHASES[Math.min(s.phase, 2)].wind * 0.4; s.aim.set(world.player.pos.x, 0, world.player.pos.z) } return }
        s.split = SPLIT; s.mode = 'split'; s.splitT = 0; sfx('shard'); world.shake = 0.4
        if (!s.toldSplit) { s.toldSplit = true; toast('R·R and S·R: diastereomers, with different properties. They split. Strike each!', 'good', 4600) }
      },
    }))
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), king: s }
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active])

  // where each half is: together at the King's position, or pulled apart along its left/right
  const halfPos = (which) => {
    const s = st.current
    const sgn = which === 'gold' ? -1 : 1
    const k = s.split > 0 ? Math.min(1, (s.splitT || 0) * 2) : 0
    const side = new THREE.Vector3(Math.cos(s.facing), 0, -Math.sin(s.facing))
    return s.pos.clone().addScaledVector(side, sgn * k * 3.2)
  }

  useFrame((state, rawDt) => {
    const s = st.current
    if (!gold.current) return
    if (!active) return
    const frozen = !!(getState().dialogue || getState().panel)
    const dt = world.hitStop > 0 || frozen ? 0 : Math.min(rawDt, 1 / 30)
    const P = PHASES[Math.min(s.phase, PHASES.length - 1)]
    const p = world.player
    s.t += dt
    let lift = 0
    if (s.mode === 'rise') {
      lift = -6 + Math.min(1, s.t / 1.8) * 6
      if (s.t > 2) { s.mode = 'walk'; s.nextGlow = s.t + 2.5 }
    } else if (s.mode === 'walk' || s.mode === 'wind') {
      // the crown opens now and then: that's when the glove can take
      if (s.t > s.nextGlow) { s.glowT = s.t; s.nextGlow = s.t + P.every + P.glow; sfx('lock') }
      if (s.mode === 'walk' && p) {
        const to = new THREE.Vector3(p.pos.x - s.pos.x, 0, p.pos.z - s.pos.z)
        const d = to.length()
        s.facing = Math.atan2(to.x, to.z)
        if (d > 3.2) { s.pos.addScaledVector(to.normalize(), P.speed * dt) }
        const r = Math.hypot(s.pos.x - C.x, s.pos.z - C.z)
        if (r > 10.5) { s.pos.x = C.x + (s.pos.x - C.x) * 10.5 / r; s.pos.z = C.z + (s.pos.z - C.z) * 10.5 / r }
        s.cd -= dt
        if (s.cd <= 0 && d < 6) { s.mode = 'wind'; s.wt = 0; s.aim.copy(s.pos).add(new THREE.Vector3(Math.sin(s.facing), 0, Math.cos(s.facing)).multiplyScalar(2.6)) }
      } else if (s.mode === 'wind') {
        s.wt += dt
        if (s.wt > P.wind) {
          // both sceptres sweep down at once, mirror images: a wide fan in front
          s.mode = 'walk'; s.cd = 2.2 - s.phase * 0.3; sfx('stomp'); world.shake = 0.35
          if (p && !p.rolling && Math.hypot(p.pos.x - s.aim.x, p.pos.z - s.aim.z) < 2.8) p.hurt(2, [s.pos.x, 0, s.pos.z])
        }
      }
    } else if (s.mode === 'split') {
      s.splitT += dt; s.split -= dt
      // apart, each half still swings at Kai when he comes close
      s.splitAtk = (s.splitAtk ?? 1.2) - dt
      if (s.splitAtk <= 0 && p) {
        s.splitAtk = 1.6 - s.phase * 0.25
        const near = ['gold', 'silver'].some((w) => { const hp2 = halfPos(w); return Math.hypot(p.pos.x - hp2.x, p.pos.z - hp2.z) < 2.6 })
        if (near) { sfx('stomp'); if (!p.rolling) p.hurt(1, [s.pos.x, 0, s.pos.z]) }
      }
      if (s.split <= 0) { s.mode = 'rejoin'; s.t = 0; s.hitG = s.hitS = false; s.hpFix = true; toast('They fuse again: racemic. Wait for the crown.', 'info', 2800) }
    } else if (s.mode === 'rejoin') {
      if (s.t > 0.8) { s.mode = 'walk'; s.nextGlow = s.t + 4.2; s.cd = Math.min(s.cd, 0.8) }
    } else if (s.mode === 'down') {
      lift = -Math.max(0, s.t - 1) * 1.5
    }
    if (s.hpFix) { s.hpFix = false; const total = PHASES.length * 2; setState({ bossHp: { name: NAME, hp: total - s.phase * 2, max: total } }) }
    // place the halves
    const gp = halfPos('gold'), sp = halfPos('silver')
    const heavy = s.split > 0 ? Math.min(1, s.splitT * 2) : 0
    gold.current.position.set(gp.x - C.x, lift - heavy * 0.6, gp.z - C.z)
    silver.current.position.set(sp.x - C.x, lift + heavy * 0.9 + Math.sin(state.clock.elapsedTime * 3) * 0.15 * heavy, sp.z - C.z)
    gold.current.rotation.y = silver.current.rotation.y = s.facing
    gold.current.rotation.z = s.split > 0 ? 0.12 * heavy : 0
    silver.current.rotation.z = s.split > 0 ? -0.08 * heavy : 0
    const wind = s.mode === 'wind' ? Math.min(1, s.wt / P.wind) : 0
    gold.current.rotation.x = silver.current.rotation.x = -wind * 0.18
    // the crown's glow
    const open = s.mode !== 'split' && s.t >= s.glowT && s.t <= s.glowT + P.glow
    if (crown.current) { crown.current.visible = open; crown.current.position.set(s.pos.x - C.x, 4.4 + lift, s.pos.z - C.z) }
    if (mark.current) { mark.current.visible = s.mode === 'wind'; if (s.mode === 'wind') { mark.current.position.set(s.aim.x - C.x, 0.06, s.aim.z - C.z); mark.current.material.opacity = 0.3 + 0.5 * Math.abs(Math.sin(s.wt * 10)) } }
    if (spark.current) {
      if (s.mode !== 'down') { s.sparkT = -1; spark.current.visible = true; spark.current.position.set(s.pos.x - C.x + Math.sin(state.clock.elapsedTime * 7) * 0.12, 4.0 + lift, s.pos.z - C.z) }
      else { if (s.sparkT < 0) { s.sparkT = 0; sfx('shard') } s.sparkT += rawDt; spark.current.position.set(s.pos.x - C.x + s.sparkT * 5, 4.0 + s.sparkT * 2.5, s.pos.z - C.z); spark.current.visible = s.sparkT < 2.5 }
    }
    const tm = open ? 'open' : s.split > 0 ? 'split' : null
    if (tm !== tagMode) setTagMode(tm)
  })

  return (
    <group position={[C.x, 0, C.z]}>
      <group ref={gold} position={[0, -6, 0]}><Part model="king" name="kng_gold" mats={M} /><pointLight position={[-1, 3, 1.5]} color="#ffcf6a" intensity={3} distance={8} /></group>
      <group ref={silver} position={[0, -6, 0]}><Part model="king" name="kng_silver" mats={M} /><pointLight position={[1, 3, 1.5]} color="#bfe8ff" intensity={3} distance={8} /></group>
      <group ref={spark}><mesh><sphereGeometry args={[0.24, 14, 10]} /><meshBasicMaterial color="#e0b0ff" toneMapped={false} /></mesh><mesh><sphereGeometry args={[0.55, 14, 10]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.35} depthWrite={false} toneMapped={false} /></mesh><pointLight color="#c070ff" intensity={5} distance={7} /></group>
      <group ref={crown} visible={false}>
        <mesh><torusGeometry args={[0.7, 0.08, 10, 32]} /><meshBasicMaterial color="#fff6c0" toneMapped={false} /></mesh>
        <pointLight color="#fff6c0" intensity={6} distance={10} />
      </group>
      {tagMode === 'open' && <group position={[0, 5.4, 0]}><Tag position={[0, 0, 0]} df={14}>crown open: the glove can take (G)</Tag></group>}
      <mesh ref={mark} visible={false} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.0, 2.8, 32]} /><meshBasicMaterial color="#ff5a4a" transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}
