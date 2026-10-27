import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part } from '../engine/models'
import { setState, toast } from '../engine/store'
import { sfx } from '../audio/sfx'

// The Resonance Hydra (boss of the Tide Temple; book §2.4–2.6). It is the carbonate ion, CO₃²⁻:
// three heads, each one of carbonate's three resonance forms (the C=O double bond on a different
// oxygen). Striking one head does nothing, because no single form is the real ion (§2.5).
// Pattern: water spit (block it) and bites (dodge), then the heads tire. Hookshot all three heads while
// they rest, and the hybrid core, the real ion, surfaces. Strike it three times. Three phases, faster.

const PHASES = [{ speed: 1 }, { speed: 1.25 }, { speed: 1.5 }]
const HITS = 3
const NAME = 'The Resonance Hydra · CO₃²⁻'
// The trunk, heads, jaws and neck segments are built in Blender (tools/hydra_blender.py → public/models/hydra.glb).
const FORM_LABELS = ['form 1 · C=O up', 'form 2 · C=O left', 'form 3 · C=O right']

function Head({ refCb, M, k, showLabel }) {
  return (
    <group ref={refCb}>
      <group name="skull">
        <Part model="hydra" name="hyd_skull" mats={M} />
        <group name="jaw" position={[0, -0.12, 0.2]}><Part model="hydra" name="hyd_jaw" mats={M} /></group>
        <group name="ring" position={[0, 0.95, 0]}>
          <mesh><torusGeometry args={[0.36, 0.07, 10, 26]} /><meshStandardMaterial name="ringMat" color="#4aa8ff" emissive="#4aa8ff" emissiveIntensity={1.6} toneMapped={false} /></mesh>
        </group>
      </group>
      {showLabel && <Html position={[0, 1.55, 0]} center distanceFactor={12}><div className="tag3d">{FORM_LABELS[k]}</div></Html>}
    </group>
  )
}

export default function Hydra({ world, center, pool, active, onDefeated }) {
  const M = useMemo(() => ({
    skin: rimMat({ color: '#2f8a9a', roughness: 0.35, metalness: 0.1 }, '#a8f0ff', 0.4),
    skinDark: rimMat({ color: '#1f5a6a', roughness: 0.45 }, '#a8f0ff', 0.3),
    fin: rimMat({ color: '#7a3ab8', roughness: 0.4 }, '#e0b0ff', 0.35),
    eye: new THREE.MeshBasicMaterial({ color: '#fff3a0', toneMapped: false }),
    tooth: new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.4 }),
    oxy: new THREE.MeshStandardMaterial({ color: '#ff5050', emissive: new THREE.Color('#ff3030'), emissiveIntensity: 1.8, toneMapped: false }),
    neck: rimMat({ color: '#2a7a8a', roughness: 0.4 }, '#a8f0ff', 0.35),
    belly: rimMat({ color: '#9ad8c8', roughness: 0.5 }, '#e0fff8', 0.2),
    gold: new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.9, roughness: 0.3 }),
    spit: new THREE.MeshStandardMaterial({ color: '#bff6ff', emissive: new THREE.Color('#43c8e6'), emissiveIntensity: 1.6, transparent: true, opacity: 0.85, toneMapped: false }),
    core: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color('#ffd76a'), emissiveIntensity: 1.6, toneMapped: false }),
    coreO: new THREE.MeshStandardMaterial({ color: '#ff7070', emissive: new THREE.Color('#ff3030'), emissiveIntensity: 1.2, toneMapped: false }),
    bond: new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: new THREE.Color('#ffcf6a'), emissiveIntensity: 1, transparent: true, opacity: 0.8, toneMapped: false }),
  }), [])
  const C = useMemo(() => new THREE.Vector3(center[0], 0, center[2]), [center])
  const body = useRef(), coreG = useRef(), spitRefs = useRef([]), headRefs = useRef([]), neckRefs = useRef([[], [], []])
  const st = useRef({
    phase: 0, hits: 0, mode: 'idle', t: 0, cycle: 0, dead: false, facing: 0, flinch: 0, toldHead: 0,
    heads: [0, 1, 2].map((k) => ({ k, pos: new THREE.Vector3(), target: new THREE.Vector3(), hooked: false, act: null, actT: 0, strike: new THREE.Vector3(), bit: false })),
    shots: [], corePos: new THREE.Vector3(C.x, -3, C.z),
  })
  const [coreUp, setCoreUp] = useState(false) // shows the core's label only while it is up

  // where the core surfaces: at the pool edge nearest Kai, so the sword can reach it from the walkway
  const coreSpot = (p) => {
    const dx = p.pos.x - C.x, dz = p.pos.z - C.z, l = Math.hypot(dx, dz) || 1
    const ux = dx / l, uz = dz / l
    const hx = (pool.x[1] - pool.x[0]) / 2, hz = (pool.z[1] - pool.z[0]) / 2
    const edge = Math.min(Math.abs(ux) > 1e-3 ? hx / Math.abs(ux) : 99, Math.abs(uz) > 1e-3 ? hz / Math.abs(uz) : 99)
    return new THREE.Vector3(C.x + ux * (edge - 1.1), 1.0, C.z + uz * (edge - 1.1))
  }

  useEffect(() => {
    if (!active) return
    const s = st.current
    const sp = () => PHASES[Math.min(s.phase, PHASES.length - 1)].speed
    const ids = []
    // the core: the only thing that can be hurt, and only once it has surfaced
    ids.push(world.addTarget({
      pos: () => [s.corePos.x, s.corePos.y, s.corePos.z],
      alive: () => !s.dead && s.mode === 'exposed',
      radius: 1.0,
      onHit: () => {
        if (s.dead || s.mode !== 'exposed') return false
        s.hits++; s.flinch = 0.3; sfx('hit')
        setState({ bossHp: { name: NAME, hp: PHASES.length * HITS - (s.phase * HITS + s.hits), max: PHASES.length * HITS } })
        if (s.hits >= HITS) {
          s.hits = 0; s.phase++; sfx('bond')
          if (s.phase >= PHASES.length) {
            s.dead = true; s.mode = 'dying'; s.t = 0; setCoreUp(false)
            setState({ bossHp: null })
            setTimeout(() => onDefeated && onDefeated(), 2400)
          } else {
            toast('The hybrid core sinks. The Hydra rises again, faster!', 'good', 2600)
            s.mode = 'recover'; s.t = 0; setCoreUp(false)
          }
        }
        return true
      },
    }))
    // the three heads: sword hits explain; the hookshot pins them while they rest
    s.heads.forEach((h) => {
      ids.push(world.addTarget({
        pos: () => [h.pos.x, h.pos.y - 0.4, h.pos.z],
        alive: () => !s.dead && s.mode !== 'exposed',
        radius: 0.8, tall: 3,
        onHit: () => {
          if (s.dead) return false
          sfx('block')
          if (performance.now() - s.toldHead > 3500) {
            s.toldHead = performance.now()
            toast('The blade passes through — this head is only one resonance form, and no single form is the real ion. Catch all three with the hookshot (Q) while they rest!', 'warn', 4600)
          }
          return false
        },
      }))
      ids.push(world.addHook({
        kind: 'hit',
        pos: () => [h.pos.x, h.pos.y + 0.95, h.pos.z],
        accepts: () => {
          if (s.mode !== 'tired') return 'The head is thrashing. Wait until the heads tire and sink to rest.'
          if (h.hooked) return 'That form is already caught. Catch the other heads!'
          return true
        },
        onHook: () => {
          h.hooked = true; sfx('pair')
          const n = s.heads.filter((x) => x.hooked).length
          if (n < 3) toast(`Caught resonance form ${n} of 3.`, 'info', 1800)
          else {
            s.mode = 'exposed'; s.t = 0; setCoreUp(true)
            s.corePos.copy(coreSpot(world.player))
            s.corePos.y = -2
            toast('All three forms at once: the hybrid core surfaces! Strike it!', 'good', 3000)
            sfx('open')
          }
        },
      }))
    })
    setState({ bossHp: { name: NAME, hp: PHASES.length * HITS, max: PHASES.length * HITS } })
    s.mode = 'rise'; s.t = 0
    s.heads.forEach((h) => h.pos.set(C.x, -3, C.z)) // heads rise out of the pool, not from the world origin
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), hydra: s }
    s._sp = sp
    return () => { ids.forEach((i) => world.remove(i)); setState({ bossHp: null }) }
  }, [active])

  useFrame((state, rawDt) => {
    const s = st.current
    const dt = world.hitStop > 0 ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    const T = state.clock.elapsedTime
    if (!body.current) return
    if (!active && !s.dead) { body.current.position.set(C.x, -6, C.z); body.current.visible = false; return }
    body.current.visible = true
    s.t += dt
    const sp = s._sp ? s._sp() : 1
    // the body faces Kai
    if (p && !s.dead) {
      const want = Math.atan2(p.pos.x - C.x, p.pos.z - C.z)
      const d = Math.atan2(Math.sin(want - s.facing), Math.cos(want - s.facing))
      s.facing += d * Math.min(1, dt * 1.6)
    }
    // body height: rises at the start, sinks low while exposed, sinks away when beaten
    let by = 0.2 + Math.sin(T * 1.2) * 0.12
    if (s.mode === 'rise') by = -4 + Math.min(1, s.t / 1.6) * 4.2
    if (s.mode === 'dying') by = 0.2 - s.t * 2.2
    body.current.position.set(C.x, by, C.z)
    body.current.rotation.y = s.facing

    // ---- the fight's rhythm
    if (s.mode === 'rise' && s.t > 1.8) { s.mode = 'idle'; s.t = 0 }
    if (s.mode === 'recover' && s.t > 1.4) { s.mode = 'idle'; s.t = 0; s.heads.forEach((h) => (h.hooked = false)) }
    const inArena = !!p && p.pos.z < -141
    if (s.mode === 'idle' && !inArena) s.t = 0
    if (s.mode === 'idle' && s.t > 1.2 / sp) {
      // attack in order: spit volley, then a bite from each head, then rest
      s.mode = 'attack'; s.t = 0; s.cycle++
      s.heads.forEach((h, i) => { h.act = s.cycle % 2 ? 'spit' : 'bite'; h.actT = -i * (0.9 / sp); h.bit = false; h.shot = false })
    }
    if (s.mode === 'attack' && s.heads.every((h) => h.act === null)) {
      if (s.cycle % 2 === 0) { s.mode = 'tired'; s.t = 0; toast('The heads tire and sink to rest — hookshot them (Q)!', 'info', 2400) }
      else { s.mode = 'idle'; s.t = 0 }
    }
    if (s.mode === 'tired' && s.t > 14 / sp && s.heads.some((h) => !h.hooked)) {
      s.mode = 'recover'; s.t = 0
      toast('Too slow — the forms slip free. Catch all three before they recover.', 'warn', 2600)
    }
    if (s.mode === 'exposed') {
      s.corePos.y += (1.0 - s.corePos.y) * Math.min(1, dt * 4)
      if (s.t > 13 / sp) { s.mode = 'recover'; s.t = 0; setCoreUp(false); toast('The core sinks back. Catch the heads again!', 'warn', 2200) }
    } else if (!s.dead) s.corePos.y += (-3 - s.corePos.y) * Math.min(1, dt * 3)

    // ---- heads
    s.heads.forEach((h, i) => {
      const fan = s.facing + (i - 1) * 0.85
      const rest = new THREE.Vector3(C.x + Math.sin(fan) * 3.2, by + 3.4 + Math.sin(T * 1.6 + i * 2) * 0.3, C.z + Math.cos(fan) * 3.2)
      let tgt = rest, rate = 4
      if (s.mode === 'exposed') {
        // spent: the heads slump back against the trunk so the core in front is clear
        const back = fan + (i - 1) * 0.5 + Math.PI
        tgt = new THREE.Vector3(C.x + Math.sin(back) * 2.6, 0.6, C.z + Math.cos(back) * 2.6)
        rate = 3
      } else if (s.mode === 'tired' || s.mode === 'recover' && s.t < 0.6) {
        // resting: heads droop onto the water near the pool edge, ring glowing
        const out = Math.min(5.4, Math.min((pool.x[1] - pool.x[0]) / 2, (pool.z[1] - pool.z[0]) / 2) - 0.6)
        tgt = new THREE.Vector3(C.x + Math.sin(fan) * out, h.hooked ? 0.5 : 0.9 + Math.sin(T * 2 + i) * 0.1, C.z + Math.cos(fan) * out)
        rate = 3
      } else if (s.mode === 'dying') {
        tgt = rest.clone().setY(rest.y - s.t * 3)
      } else if (h.act && p) {
        h.actT += dt * sp
        if (h.act === 'spit') {
          if (h.actT > 0 && h.actT < 0.6) tgt = rest.clone().setY(rest.y + 0.6)
          if (h.actT >= 0.6 && !h.shot && !inArena) h.shot = true
          if (h.actT >= 0.6 && !h.shot) {
            h.shot = true; sfx('hookFire')
            const from = h.pos.clone()
            const aim = new THREE.Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z).sub(from).normalize()
            s.shots.push({ pos: from, vel: aim.multiplyScalar(9 + s.phase * 1.5), life: 3 })
          }
          if (h.actT > 1.1) h.act = null
        } else if (h.act === 'bite') {
          if (h.actT > 0 && h.actT < 0.8) {
            // wind up: rear back, and mark where it will strike
            const dx = p.pos.x - C.x, dz = p.pos.z - C.z, l = Math.hypot(dx, dz) || 1, reach = Math.min(l, 10)
            h.strike.set(C.x + (dx / l) * reach, 1.0, C.z + (dz / l) * reach)
            tgt = rest.clone().lerp(C, 0.4).setY(rest.y + 1.4)
            rate = 6
          } else if (h.actT >= 0.8 && h.actT < 1.25) {
            tgt = h.strike; rate = 16
            if (!h.bit && h.pos.distanceTo(h.strike) < 1.2) {
              h.bit = true; sfx('stomp')
              if (p && Math.hypot(p.pos.x - h.strike.x, p.pos.z - h.strike.z) < 1.7) p.hurt(1, [h.strike.x - (p.pos.x - h.strike.x), 0, h.strike.z - (p.pos.z - h.strike.z)])
            }
          } else if (h.actT >= 1.25) h.act = null
        }
      }
      h.pos.lerp(tgt, Math.min(1, dt * rate))
      const g = headRefs.current[i]
      if (g) {
        g.position.copy(h.pos)
        const look = p ? Math.atan2(p.pos.x - h.pos.x, p.pos.z - h.pos.z) : fan
        g.rotation.set(s.mode === 'tired' ? 0.4 : h.act === 'bite' && h.actT >= 0.8 ? 0.6 : 0, look, 0)
        const jaw = g.getObjectByName('jaw')
        if (jaw) jaw.rotation.x = (h.act === 'spit' && h.actT > 0.4 && h.actT < 0.8) || (h.act === 'bite' && h.actT > 0.5 && h.actT < 0.85) ? 0.6 : 0.05
        const ring = g.getObjectByName('ring')
        if (ring) {
          ring.visible = s.mode === 'tired' || h.hooked
          ring.rotation.y = T * 2
          const rm = ring.children[0].material
          rm.color.set(h.hooked ? '#6fe39a' : '#4aa8ff'); rm.emissive.set(h.hooked ? '#6fe39a' : '#4aa8ff')
        }
      }
      // neck: a curve of beads from the body to the head
      const base = new THREE.Vector3(C.x + Math.sin(fan) * 0.8, by + 1.4, C.z + Math.cos(fan) * 0.8)
      const mid = base.clone().lerp(h.pos, 0.5).setY(Math.max(base.y, h.pos.y) + 1.2)
      const beads = neckRefs.current[i]
      for (let b = 0; b < beads.length; b++) {
        const m = beads[b]
        if (!m) continue
        const u = (b + 1) / (beads.length + 1)
        const a = base.clone().lerp(mid, u), c = mid.clone().lerp(h.pos, u)
        m.position.copy(a.lerp(c, u))
      }
    })

    // ---- water spit: a frontal block stops it
    s.shots = s.shots.filter((sh) => {
      sh.life -= dt
      sh.pos.addScaledVector(sh.vel, dt)
      if (p && sh.pos.distanceTo(new THREE.Vector3(p.pos.x, p.pos.y + 1.0, p.pos.z)) < 0.8) {
        p.hurt(1, [sh.pos.x, 0, sh.pos.z])
        return false
      }
      return sh.life > 0 && sh.pos.y > -0.5
    })
    for (let k = 0; k < 4; k++) {
      const m = spitRefs.current[k], sh = s.shots[k]
      if (!m) continue
      m.visible = !!sh
      if (sh) m.position.copy(sh.pos)
    }
    // ---- the core: carbonate's hybrid, one C with three identical partial C–O bonds
    if (coreG.current) {
      coreG.current.position.copy(s.corePos)
      coreG.current.rotation.y = T * 0.8
      coreG.current.visible = s.corePos.y > -1.5
      const f = s.flinch > 0 ? 1 + s.flinch : 1
      coreG.current.scale.setScalar(f)
      s.flinch = Math.max(0, s.flinch - dt)
    }
  })

  if (!active) return null
  return (
    <group>
      <group ref={body}>
        {/* the trunk: the central carbon, rising out of the pool */}
        <Part model="hydra" name="hyd_trunk" mats={M} />
        <Html position={[0, 3.2, 0]} center distanceFactor={14}><div className="tag3d">CO₃²⁻</div></Html>
      </group>
      {[0, 1, 2].map((i) => (
        <group key={i}>
          {[...Array(7)].map((_, b) => <group key={b} ref={(m) => (neckRefs.current[i][b] = m)} scale={0.42 - b * 0.025}><Part model="hydra" name="hyd_bead" mats={M} /></group>)}
          <Head k={i} M={M} showLabel={!coreUp} refCb={(g) => (headRefs.current[i] = g)} />
        </group>
      ))}
      {[...Array(4)].map((_, k) => <mesh key={'s' + k} ref={(m) => (spitRefs.current[k] = m)} visible={false} material={M.spit}><sphereGeometry args={[0.24, 14, 12]} /></mesh>)}
      <group ref={coreG} visible={false}>
        <mesh material={M.core}><sphereGeometry args={[0.38, 18, 14]} /></mesh>
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2
          return (
            <group key={k} rotation={[0, a, 0]}>
              {/* each C–O bond is the same: drawn as one solid and one dashed line, like the book's hybrid */}
              <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]} material={M.bond}><cylinderGeometry args={[0.06, 0.06, 0.7, 8]} /></mesh>
              {[0, 1, 2].map((d) => <mesh key={d} position={[0.13, 0, 0.35 + d * 0.25]} material={M.bond}><sphereGeometry args={[0.045, 8, 6]} /></mesh>)}
              <mesh position={[0, 0, 1.05]} material={M.coreO}><sphereGeometry args={[0.3, 16, 12]} /></mesh>
            </group>
          )
        })}
        <pointLight color="#ffd76a" intensity={6} distance={9} />
        {coreUp && <Html position={[0, 1.4, 0]} center distanceFactor={11}><div className="tag3d">hybrid · three identical C–O bonds</div></Html>}
      </group>
    </group>
  )
}
