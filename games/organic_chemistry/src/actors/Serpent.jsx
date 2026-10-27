import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part } from '../engine/models'
import { Tag } from '../engine/kit'
import { setState, getState, toast } from '../engine/store'
import { sfx } from '../audio/sfx'
import { conformerName, CONFORMERS } from '../chem/rules3'
import { flashNewman } from '../ui/Newman'
import { STRAIN_SUM } from '../data/dungeon3'

// The Gauche Serpent (boss of the Chain Labyrinth; book §3.7, Fig 3.10). A butane: four carbon
// segments C1–C4, CH₃ head and tail (pink, like the CH₃ on every Newman drawing), and a glowing knot on
// its C2–C3 bond with Malradix's violet spark wound inside it.
// It chases, lunges (side-step or block) and sweeps its tail (block). A lunge that misses — or is
// blocked — leaves it dazed and coiled, posed exactly as its C2–C3 conformation. While it's dazed Kai
// may turn the knot twice with the Lantern (G +60°, Shift+G −60°): pick the short way to CH₃↔CH₃
// eclipsed (0°, 19 kJ/mol), and it convulses. From phase 2 the Lantern shows only the drawing.
// Two convulsions per phase, three phases, faster and shorter dazes. Then it is spent: turn it to anti.

const PHASES = [{ speed: 1, daze: 5.5 }, { speed: 1.25, daze: 4.6 }, { speed: 1.5, daze: 3.8 }]
const HITS = 2
const TURNS = 2
const NAME = 'The Gauche Serpent · butane'
const SEG = 1.6
const busyNow = () => { const s = getState(); return !!(s.dialogue || s.panel) }

function Segment({ M, refCb, head, me, nH }) {
  const r = head ? 0.62 : 0.55
  return (
    <group ref={refCb}>
      {/* built in Blender (tools/creatures3_blender.py): scaled segments, the CH3 head and tail */}
      <Part model="creatures3" name={head ? 'srp_head' : me ? 'srp_tail' : 'srp_mid'} mats={M} />
      {me && <Tag position={[0, r + 0.6, 0]} df={12} className="ch3">CH₃</Tag>}
      {head && (
        <group name="face">
          <pointLight position={[0, 0.3, 0.8]} color="#ffd0e8" intensity={2} distance={5} />
        </group>
      )}
    </group>
  )
}

export default function Serpent({ world, center, arenaR = 13, active, onDefeated, onPhase }) {
  const M = useMemo(() => ({
    carbon: rimMat({ color: '#3e5446', roughness: 0.45, metalness: 0.15 }, '#c8ffe0', 0.5),
    methyl: rimMat({ color: '#d0508e', roughness: 0.4, metalness: 0.1 }, '#ffd0e8', 0.5),
    scale: rimMat({ color: '#5a8a64', roughness: 0.5 }, '#d8ffe0', 0.3),
    h: rimMat({ color: '#eef2ee', roughness: 0.35 }, '#ffffff', 0.25),
    eye: new THREE.MeshBasicMaterial({ color: '#ffe060', toneMapped: false }),
    serpEye: new THREE.MeshBasicMaterial({ color: '#ffe060', toneMapped: false }),
    methylDark: rimMat({ color: '#a8386e', roughness: 0.45 }, '#ffd0e8', 0.35),
    fang: new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.4 }),
    mouth: new THREE.MeshBasicMaterial({ color: '#2a0a12' }),
    bond: rimMat({ color: '#cfd8d0', roughness: 0.45, metalness: 0.2 }, '#ffffff', 0.25),
    knot: new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: new THREE.Color('#ffb02a'), emissiveIntensity: 2, toneMapped: false }),
    spark: new THREE.MeshBasicMaterial({ color: '#c070ff', toneMapped: false }),
  }), [])
  const C = useMemo(() => new THREE.Vector3(center[0], 0, center[2]), [center])
  const segRefs = useRef([]), bondRefs = useRef([]), knot = useRef(), grp = useRef(), spark = useRef()
  const st = useRef(null)
  if (!st.current) {
    const trail = []
    for (let k = 0; k < 120; k++) trail.push(new THREE.Vector3(C.x - 3 + k * 0.05, 0, C.z - 3))
    st.current = { phase: 0, hits: 0, mode: 'rise', t: 0, d: 120, turns: 0, head: new THREE.Vector3(C.x, 0, C.z - 3), dir: new THREE.Vector3(0, 0, 1), trail, lunge: new THREE.Vector3(), bit: false, landed: false, clamped: false, cycle: 0, axis: new THREE.Vector3(1, 0, 0), q: new THREE.Vector3(C.x, 0, C.z), segs: [0, 1, 2, 3].map((k) => new THREE.Vector3(C.x, -2, C.z - k)), shake: 0, toldBody: 0, sparkT: -1 }
  }

  useEffect(() => {
    if (!active) return
    const s = st.current
    const ph = () => PHASES[Math.min(s.phase, PHASES.length - 1)]
    s._ph = ph
    const total = PHASES.length * HITS
    const hp = () => setState({ bossHp: { name: NAME, hp: total - (s.phase * HITS + s.hits), max: total } })
    hp()
    const ids = []
    ids.push(world.addLantern({
      pos: () => [s.q.x, 1, s.q.z], radius: 5, priority: 1,
      label: () => (s.mode === 'dazed' ? `Twist the C2–C3 knot (G · Shift+G back) · ${TURNS - s.turns} left` : s.mode === 'spent' ? 'Let it rest: twist it to the shape with no strain' : null),
      onLantern: (dir = 1) => {
        if (s.mode !== 'dazed' && s.mode !== 'spent') return
        if (s.mode === 'dazed' && s.turns >= TURNS) { toast('The knot has stiffened. Make it overreach again.', 'info', 2000); return }
        s.d = (s.d + 60 * dir + 360) % 360
        if (s.mode === 'dazed') s.turns++
        const name = conformerName('butane', s.d)
        const sum = STRAIN_SUM.butane[name]
        const blind = s.mode === 'dazed' && s.phase >= 1
        const note = s.mode === 'spent'
          ? (name === 'anti' ? 'Anti: no strain at all. It stretches out and goes still.' : `${name}: still strained. Find the shape with none.`)
          : blind ? (name === 'eclipsed · CH₃↔CH₃' ? 'CH₃ behind CH₃ — it convulses!' : 'Not that one. Look where the two CH₃ groups are.')
          : name === 'eclipsed · CH₃↔CH₃' ? `${sum}. The worst strain — it convulses!` : name === 'eclipsed · CH₃↔H' ? `${sum}. Strained, not the worst.` : name === 'gauche' ? 'Gauche: 3.8 — crowded, but not its worst.' : 'Anti: no strain. It\'s perfectly happy.'
        flashNewman({ kind: 'butane', angle: s.d, title: 'The Serpent\'s C2–C3 bond', note, blind }, 3000)
        if (s.mode === 'spent' && name !== 'anti') { s.d = Math.random() < 0.5 ? 120 : 240; if (world.player) world.player.hurt(1, [s.q.x, 0, s.q.z]); flashNewman({ kind: 'butane', angle: s.d, title: 'The Serpent\'s C2–C3 bond', note: 'It lashes and twists back! Read the drawing: which way is anti?', blind: true }, 3500); return }
        if (s.mode === 'spent' && name === 'anti') { s.mode = 'rest'; s.t = 0; s.sparkT = 0; sfx('shard'); setState({ bossHp: null }); setTimeout(() => onDefeated && onDefeated(), 2800); return }
        if (s.mode === 'dazed' && name === 'eclipsed · CH₃↔CH₃') {
          s.hits++; s.shake = 0.8; sfx('hit'); sfx('stomp')
          if (s.hits >= HITS) {
            s.hits = 0; s.phase++
            if (s.phase >= PHASES.length) { s.mode = 'spent'; s.t = 0; s.d = Math.random() < 0.5 ? 120 : 240; setTimeout(() => flashNewman({ kind: 'butane', angle: s.d, title: 'The Serpent\'s C2–C3 bond', note: 'One turn. Which way is anti?', blind: true }, 4000), 600); setState({ bossHp: { name: NAME, hp: 0, max: total } }); toast('It\'s spent. Let it rest: twist it to the shape with no strain at all.', 'good', 4200); return }
            onPhase && onPhase(s.phase)
            toast(s.phase === 1 ? 'It shakes off the strain — faster now. The Lantern shows only the drawing.' : 'Last phase! Bats wake in the arena.', 'good', 3200)
          }
          hp()
          s.mode = 'recover'; s.t = 0
        }
      },
    }))
    ids.push(world.addTarget({
      pos: () => [s.head.x, 1, s.head.z], radius: 1.0, tall: 2,
      alive: () => !['rest', 'spent', 'rise'].includes(s.mode),
      onHit: () => {
        sfx('block')
        if (performance.now() - s.toldBody > 4000) { s.toldBody = performance.now(); toast('Blade slides off. Dodge a lunge, then G at the knot.', 'warn', 3800) }
        return false
      },
    }))
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), serpent: s }
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active])

  useFrame(({ clock }, rawDt) => {
    if (!active || !grp.current) return
    const s = st.current, p = world.player
    const frozen = busyNow()
    const dt = world.hitStop > 0 || (frozen && s.mode !== 'rise') ? 0 : Math.min(rawDt, 1 / 30)
    const T = clock.elapsedTime, P = s._ph ? s._ph() : PHASES[0], sp = P.speed
    s.t += dt
    const toK = p ? new THREE.Vector3(p.pos.x - s.head.x, 0, p.pos.z - s.head.z) : new THREE.Vector3()
    const dist = toK.length()
    // a daze: coil up, pick a starting shape, and give a free look at it (just the drawing from phase 2)
    function startDaze(msg) {
      s.mode = 'dazed'; s.t = 0; s.turns = 0
      s.d = [60, 120, 240, 300][Math.floor(Math.random() * 4)]
      s.axis.set(-s.dir.z, 0, s.dir.x).normalize()
      s.q.copy(s.head).addScaledVector(s.dir, -1.2)
      toast(msg, 'info', 2600)
      flashNewman({ kind: 'butane', angle: s.d, title: 'The Serpent\'s C2–C3 bond', note: s.phase >= 1 ? 'Two turns. Where are the CH₃ groups?' : 'Two turns: make the CH₃ ends eclipse.', blind: s.phase >= 1 }, 3500)
    }
    // ---- behaviour
    if (s.mode === 'rise' && s.t > 1.6) { s.mode = 'chase'; s.t = 0 }
    if (s.mode === 'recover' && s.t > 1.2) { s.mode = 'chase'; s.t = 0 }
    if (s.mode === 'chase') {
      if (dist > 0.1) { const want = toK.clone().normalize(); if (s.dir.dot(want) < -0.9) s.dir.set(-s.dir.z, 0, s.dir.x); s.dir.lerp(want, Math.min(1, dt * 2.5)).normalize() }
      s.head.addScaledVector(s.dir, 3.4 * sp * dt)
      if (dist < 5.5 && s.t > 1.2) {
        s.cycle++
        if (s.cycle % 3 === 0 && dist < 4) { s.mode = 'sweepWind'; s.t = 0; sfx('growl') }
        else { s.mode = 'windup'; s.t = 0; s.bit = false; s.landed = false; sfx('growl') }
      }
    } else if (s.mode === 'windup') {
      if (dist > 0.1) s.dir.lerp(toK.clone().normalize(), Math.min(1, dt * 4)).normalize()
      if (s.t > 0.75 / sp) {
        s.mode = 'lunge'; s.t = 0; s.clamped = false
        let reach = 8.5
        for (; reach > 2; reach -= 0.5) { const q = s.head.clone().addScaledVector(s.dir, reach); if (Math.hypot(q.x - C.x, q.z - C.z) <= arenaR - 0.5) break }
        s.lunge.copy(s.head).addScaledVector(s.dir, reach)
      }
    } else if (s.mode === 'lunge') {
      s.head.lerp(s.lunge, Math.min(1, dt * 7 * sp))
      if (!s.bit && p && dist < 1.4) { s.bit = true; s.landed = p.hurt(1, [s.head.x, 0, s.head.z]) }
      if (s.t > 0.55) {
        if (s.landed) { s.mode = 'chase'; s.t = 0 } // it caught you: no opening
        else startDaze(s.bit ? 'Blocked! It reels back, dazed. G at the knot!' : 'Dazed! G at the glowing knot — two turns.')
      }
    } else if (s.mode === 'sweepWind') {
      if (s.t > 0.7 / sp) { s.mode = 'sweep'; s.t = 0; s.bit = false; sfx('stomp') }
    } else if (s.mode === 'sweep') {
      // the tail swings round in a full circle; block it (Shift, facing it) or be out of reach
      if (!s.bit && p && s.t > 0.2 && Math.hypot(p.pos.x - s.head.x, p.pos.z - s.head.z) < 4.8) { s.bit = true; s.landed = p.hurt(1, [s.head.x, 0, s.head.z]) }
      if (s.t > 0.6) {
        if (s.bit && !s.landed && p && p.mode === 'block') { startDaze('Blocked the tail! It reels, dazed. G at the knot!') }
        else { s.mode = 'chase'; s.t = 0 }
      }
    } else if (s.mode === 'dazed') {
      if (s.t > P.daze) { s.mode = 'chase'; s.t = 0 }
    }
    // keep inside the arena
    const off = new THREE.Vector3(s.head.x - C.x, 0, s.head.z - C.z)
    if (off.length() > arenaR - 0.5) { off.setLength(arenaR - 0.5); s.head.set(C.x + off.x, 0, C.z + off.z); if (s.mode === 'lunge') s.clamped = true }
    const last = s.trail[s.trail.length - 1]
    if (last.distanceTo(s.head) > 0.08) { s.trail.push(s.head.clone()); if (s.trail.length > 200) s.trail.shift() }

    // ---- pose the four carbons
    const coiled = s.mode === 'dazed' || s.mode === 'spent' || s.mode === 'rest' || (s.mode === 'recover' && s.t < 0.5)
    world.bossCam = coiled // the scene pulls the camera back to frame the coil
    const ease = Math.min(1, Math.max(dt, frozen ? 0 : 0.016) * 10)
    if (coiled) {
      // C2–C3 lie on the bond axis; C1 points straight up off C2, C4 off C3 turned by the dihedral
      const u = s.axis, y = s.mode === 'rest' ? 0.9 : 1.5
      const c2 = s.q.clone().addScaledVector(u, -1.15).setY(y), c3 = s.q.clone().addScaledVector(u, 1.15).setY(y)
      const up = new THREE.Vector3(0, 1, 0)
      const out4 = up.clone().applyAxisAngle(u, (s.d * Math.PI) / 180)
      const tilt = s.mode === 'rest' ? 1.1 : 0.5
      const c1 = c2.clone().addScaledVector(up, 1.8).addScaledVector(u, -tilt)
      const c4 = c3.clone().addScaledVector(out4, 1.8).addScaledVector(u, tilt)
      if (c4.y < 0.5) c4.y = 0.5
      if (s.shake > 0) { const j = Math.sin(T * 60) * 0.15 * s.shake; c1.x += j; c4.z += j; s.shake = Math.max(0, s.shake - rawDt) }
      ;[c1, c2, c3, c4].forEach((v, k) => s.segs[k].lerp(v, ease))
    } else if (s.mode === 'sweep') {
      const a = s.t * 11
      ;[0, 1, 2, 3].forEach((k) => s.segs[k].lerp(new THREE.Vector3(s.head.x + Math.sin(a) * k * SEG, 0.8, s.head.z + Math.cos(a) * k * SEG), Math.min(1, dt * 18)))
    } else {
      let k = 1, acc = 0
      s.segs[0].copy(s.head).setY(0.75 + Math.sin(T * 6) * 0.08 + (s.mode === 'windup' || s.mode === 'sweepWind' ? 0.4 : 0))
      for (let i = s.trail.length - 1; i > 0 && k < 4; i--) {
        acc += s.trail[i].distanceTo(s.trail[i - 1])
        if (acc >= SEG * k) { s.segs[k].lerp(s.trail[i - 1].clone().setY(0.65 + Math.sin(T * 6 + k) * 0.1), Math.min(1, ease * 1.4)); k++ }
      }
      if (s.mode === 'rise') s.segs.forEach((v) => (v.y = Math.min(v.y, -1.5 + s.t * 1.6)))
    }
    // ---- write to meshes
    s.segs.forEach((v, k) => { const g = segRefs.current[k]; if (g) g.position.copy(v) })
    const head = segRefs.current[0]
    if (head) head.rotation.y = Math.atan2(s.dir.x, s.dir.z) + (s.mode === 'windup' || s.mode === 'sweepWind' ? Math.sin(T * 30) * 0.08 : 0)
    for (let k = 0; k < 3; k++) {
      const b = bondRefs.current[k]; if (!b) continue
      const a = s.segs[k], c = s.segs[k + 1], mid = a.clone().add(c).multiplyScalar(0.5), dir = c.clone().sub(a)
      b.position.copy(mid); b.scale.set(1, Math.max(0.01, dir.length()), 1)
      if (dir.lengthSq() > 1e-6) b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    }
    if (knot.current) {
      const a = s.segs[1], c = s.segs[2]
      knot.current.position.copy(a.clone().add(c).multiplyScalar(0.5))
      const d = c.clone().sub(a)
      if (d.lengthSq() > 1e-6) knot.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize())
      knot.current.scale.setScalar(coiled && s.mode !== 'rest' ? 1.4 + Math.sin(T * 6) * 0.12 : 0.85)
      if (!coiled || s.mode === 'rest') s.q.copy(knot.current.position).setY(0)
    }
    // Malradix's spark: wound in the knot; when the Serpent rests it tears free and flees north
    if (spark.current) {
      if (s.sparkT < 0) { spark.current.position.set(Math.sin(T * 7) * 0.12, Math.cos(T * 9) * 0.12, 0); spark.current.visible = true }
      else {
        s.sparkT += rawDt
        spark.current.position.set(0, s.sparkT * 4, -s.sparkT * 9)
        spark.current.visible = s.sparkT < 2.2
      }
    }
  })

  if (!active) return null
  return (
    <group ref={grp}>
      <Segment M={M} head me nH={3} refCb={(g) => (segRefs.current[0] = g)} />
      <Segment M={M} nH={2} refCb={(g) => (segRefs.current[1] = g)} />
      <Segment M={M} nH={2} refCb={(g) => (segRefs.current[2] = g)} />
      <Segment M={M} me nH={3} refCb={(g) => (segRefs.current[3] = g)} />
      {[0, 1, 2].map((k) => <group key={k} ref={(m) => (bondRefs.current[k] = m)}><Part model="creatures3" name="srp_bond" mats={M} /></group>)}
      <group ref={knot}>
        <mesh material={M.knot}><torusGeometry args={[0.45, 0.1, 10, 28]} /></mesh>
        <group ref={spark}>
          <mesh material={M.spark}><octahedronGeometry args={[0.16, 0]} /></mesh>
          <pointLight color="#c070ff" intensity={2.5} distance={4} />
        </group>
        <pointLight color="#ffb02a" intensity={3} distance={6} />
      </group>
    </group>
  )
}
