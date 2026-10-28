import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, getState, saveGame, enemiesPaused } from '../engine/store'
import { HYDRA10, shuffled, readMs } from '../chem/rules10'

// World 10's people and creatures, built in Blender (tools/magnus_blender.py → public/models/magnus.glb):
// • Old Magnus (assets/characters/old-magnus.png).
// • Grignard Golems (§10.6): armoured in halide crystal, a δ+ carbon that shrugs off blows. The Magnesium Ring (G)
//   inserts Mg into the C–X bond: the carbon turns δ−, a carbanion and a very strong base. Its armour falls away, but
//   a blade only knocks it back: it dies only when herded or knocked into the forge pool (RMgX + H₂O → RH, p. 328).
// • The Allylic Hydra (§10.3–10.4, §10.6): three heads that are carbons. Round 1: strike the head whose H Br· takes.
//   Round 2: strike the carbons that share the radical's electron inside a window. Round 3: ring every tail that takes Mg.
//   Each round has variants (rules10 HYDRA10); a wrong mark swaps to another one.
preloadModels('magnus')

export function Magnus(props) {
  const M = useMemo(() => ({
    moss: rimMat({ color: '#4e5e2e', roughness: 0.95 }, '#d8ffc0', 0.3), mossDark: rimMat({ color: '#2e3a1a', roughness: 0.95 }, '#d8ffc0', 0.2),
    tunic: rimMat({ color: '#3a3428', roughness: 0.85 }, '#e8f0d8', 0.2), skin: rimMat({ color: '#d8b098', roughness: 0.6 }, '#f0ffe0', 0.25, 3),
    beard: rimMat({ color: '#c0c0b8', roughness: 0.85 }, '#ffffff', 0.35),
  }), [])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 4.8) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="magnus" name="mag_body" mats={M} />
      <group ref={eyes} position={[0, 1.72, 0.05]}><Part model="magnus" name="mag_eyes" castShadow={false} /></group>
      <pointLight position={[-0.33, 1.4, 0.4]} color="#7aff8a" intensity={2.5} distance={5} />
    </group>
  )
}

/** Grignard Golems: blows glance off until the Magnesium Ring flips the carbon's polarity. */
export function Golems({ world, spawns, active = true, zone, xMax = 10, pool, onCleared }) {
  const gs = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), home: new THREE.Vector3(x, 0, z), face: 0, state: 'idle', t: 0, cd: 2 + i, mg: false, kx: 0, kz: 0 })))
  const ko = useRef(null), wasIn = useRef(false), entered = useRef(false) // the entry hold runs once per visit (and again after a knockout)
  // per mount, so a second visit hears the hints again; a flag sets only when its toast actually showed (a low toast
  // gives way to a teaching toast on screen and returns false)
  const told = useRef({ armour: false, ring: false, knock: false, wade: false }).current
  const refs = useRef([]), cores = useRef([])
  const cleared = useRef(false)
  const [, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    const ids = []
    gs.current.forEach((m) => {
      ids.push(world.addTarget({
        pos: () => [m.pos.x, 1.4, m.pos.z], radius: 0.9, tall: 2.4, alive: () => m.state !== 'dead' && m.state !== 'gone',
        onHit: () => {
          if (!m.mg) { sfx('block'); if (!told.armour) { const t = 'The blade rings off its halide armour: a δ+ carbon, electrophilic, nothing for a blade to grip. Put a magnesium ring on it (G).'; told.armour = toast(t, 'warn', readMs(t), true) } return false }
          // a ringed golem staggers and is knocked back ~2.5 m, away from Kai; only water finishes it
          const p = world.player
          const dx = m.pos.x - (p ? p.pos.x : m.pos.x), dz = m.pos.z - (p ? p.pos.z : m.pos.z + 1), dd = Math.hypot(dx, dz) || 1
          m.kx = (dx / dd) * 15; m.kz = (dz / dd) * 15
          sfx('hit'); m.state = 'stagger'; m.t = 0
          if (!told.knock) { const t = 'It reels back, but a blade won’t finish a carbanion. A very strong base, though… and that pool is water.'; told.knock = toast(t, 'warn', readMs(t), true) }
          return true
        },
      }))
      ids.push(world.addLantern({ needs: 'hasRing', omni: true, pos: () => [m.pos.x, 0, m.pos.z], radius: 4, label: () => (m.mg || m.state === 'dead' || m.state === 'gone' ? null : 'Slip the Magnesium Ring onto its C–X bond'), onLantern: () => {
        m.mg = true; m.state = 'stagger'; m.t = 0; sfx('shard'); setN((n) => n + 1) // its tag changes
        if (!told.ring) { const t = 'Mg slides into the C–X bond: R–MgX. The carbon turns δ−, electron-rich, a carbanion. Its armour falls away.'; told.ring = toast(t, 'good', readMs(t), true) }
      } }))
    })
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    let alive = 0
    // grace: after a knockout every golem backs 3 m toward home and holds its slam ~2.5 s; the same hold on room entry
    const kn = world.knockouts || 0
    if (ko.current === null) ko.current = kn
    const inRoom = !!p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
    if (kn !== ko.current || (inRoom && !wasIn.current && !entered.current)) {
      const knocked = kn !== ko.current
      ko.current = kn
      entered.current = !knocked // stepping out and back in doesn't renew the hold; a knockout does
      for (const m of gs.current) {
        if (m.state === 'dead' || m.state === 'gone') continue
        m.cd = Math.max(m.cd, knocked ? 2.5 : 3 + m.i * 1.5) // on entry they come one at a time
        if (m.state === 'slam') { m.state = 'idle'; m.struck = false }
        if (knocked) { const hx = m.home.x - m.pos.x, hz = m.home.z - m.pos.z, hd = Math.hypot(hx, hz); if (hd > 0.01) { const k = Math.min(3, hd) / hd; m.pos.x += hx * k; m.pos.z += hz * k } }
      }
    }
    wasIn.current = inRoom
    for (const m of gs.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.position.y = -m.t * 2; if (m.t > 1) m.state = 'gone'; continue }
      alive++
      // knockback glide (~2.5 m), then water: a ringed golem (a Grignard) that reaches the pool is protonated
      if (m.kx || m.kz) { m.pos.x += m.kx * dt; m.pos.z += m.kz * dt; const f = Math.exp(-6 * dt); m.kx *= f; m.kz *= f; if (Math.hypot(m.kx, m.kz) < 0.3) { m.kx = 0; m.kz = 0 } }
      if (m.mg && pool && Math.hypot(m.pos.x - pool.c[0], m.pos.z - pool.c[1]) < pool.r) {
        m.state = 'dead'; m.t = 0; sfx('pair'); setN((n) => n + 1)
        { const t = 'Into the water! A Grignard is a very strong base: water protonates it to an alkane, RMgX + H₂O → RH.'; toast(t, 'good', readMs(t), true) }
        continue
      }
      const inZone = p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
      if (inZone) {
        const want = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        m.face += (want - m.face) * Math.min(1, dt * 2)
        const d = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        if (m.state === 'idle' && d > 2.2) {
          let sx = Math.sin(want) * dt * (m.mg ? 0.8 : 1.4), sz = Math.cos(want) * dt * (m.mg ? 0.8 : 1.4)
          // an unringed golem paths round the pool: a step that would land within r + 0.6 turns along the rim instead
          if (!m.mg && pool) {
            const rx = m.pos.x + sx - pool.c[0], rz = m.pos.z + sz - pool.c[1], rd = Math.hypot(rx, rz)
            if (rd < pool.r + 0.6) {
              const ux = rx / (rd || 1), uz = rz / (rd || 1), L = Math.hypot(sx, sz)
              let tx = -uz, tz = ux
              if (tx * sx + tz * sz < 0) { tx = -tx; tz = -tz }
              sx = tx * L; sz = tz * L
            }
          }
          m.pos.x += sx; m.pos.z += sz
        }
        m.cd -= dt
        // stagger: only one golem winds up at a time
        if (m.state === 'idle' && d < 2.6 && m.cd <= 0 && !gs.current.some((o) => o !== m && o.state === 'slam')) { m.state = 'slam'; m.t = 0 }
      }
      // keep apart from each other, and inside their room
      for (const o of gs.current) {
        if (o === m || o.state === 'dead' || o.state === 'gone') continue
        const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z, dd = Math.hypot(dx, dz)
        if (dd > 0.01 && dd < 2.2) { m.pos.x += (dx / dd) * (2.2 - dd) * 0.5; m.pos.z += (dz / dd) * (2.2 - dd) * 0.5 }
      }
      m.pos.x = Math.max(-xMax, Math.min(xMax, m.pos.x))
      if (zone) m.pos.z = Math.min(zone[0] - 1.5, Math.max(zone[1] + 1.5, m.pos.z))
      // an unringed golem pushed into the water (by its partner) is unharmed: an R–X doesn't mind water. It wades out.
      if (!m.mg && pool) {
        const rx = m.pos.x - pool.c[0], rz = m.pos.z - pool.c[1], rd = Math.hypot(rx, rz)
        if (rd < pool.r) {
          if (!told.wade) { const t = 'An alkyl halide doesn’t mind water. A Grignard would.'; told.wade = toast(t, 'info', readMs(t), true) }
          const k = Math.min(pool.r + 0.6 - rd, dt * 1.2) / (rd || 1); m.pos.x += rx * k; m.pos.z += rz * k
        }
      }
      if (m.state === 'slam' && m.t > 0.8 && !m.struck) { m.struck = true; sfx('stomp'); world.shake = 0.3; if (p && !p.rolling && Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 2.8) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
      if (m.state === 'slam' && m.t > 1.4) { m.state = 'idle'; m.struck = false; m.cd = 2.6 }
      if (m.state === 'stagger' && m.t > 0.8) m.state = 'idle'
      g.position.set(m.pos.x, 0, m.pos.z)
      g.rotation.y = m.face
      g.rotation.x = m.state === 'slam' ? -Math.min(0.3, m.t * 0.5) + (m.t > 0.8 ? 0.5 : 0) : 0
      const c = cores.current[m.i]
      if (c) c.material.color.set(m.mg ? '#a060ff' : '#ff3a3a')
    }
    if (alive === 0 && !cleared.current && gs.current.every((m) => m.state === 'gone' || m.state === 'dead')) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => (
        <group key={i} ref={(r) => (refs.current[i] = r)}>
          <Part model="magnus" name="gol_body" />
          <mesh ref={(r) => (cores.current[i] = r)} position={[0, 1.42, 0.45]}><sphereGeometry args={[0.13, 12, 10]} /><meshBasicMaterial color="#ff3a3a" toneMapped={false} /></mesh>
          <pointLight position={[0, 1.4, 0.8]} color="#ff5a3a" intensity={1.5} distance={4} />
          {gs.current[i] && (gs.current[i].mg ? <Tag position={[0, 3.0, 0]} df={9}>R–MgX · δ− carbon</Tag> : <Tag position={[0, 3.0, 0]} df={9}><span style={{ display: 'block', whiteSpace: 'normal', maxWidth: 150, textAlign: 'center', lineHeight: 1.25 }}>Ring its C–Br.<br />Then what kills a Grignard?</span></Tag>)}
        </group>
      ))}
    </group>
  )
}

const NECK_SEG = 6
/** a Hydra neck along local y (−0.5…0.5, stretched to length): tapered scaled segments with dark joints, a dorsal ridge, belly plates */
function HydraNeck() {
  const M = useMemo(() => ({
    a: new THREE.MeshStandardMaterial({ color: '#5a7a4a', roughness: 0.6, flatShading: true }), b: new THREE.MeshStandardMaterial({ color: '#4a6a3c', roughness: 0.7, flatShading: true }),
    joint: new THREE.MeshStandardMaterial({ color: '#2a3e24', roughness: 0.85 }), fin: new THREE.MeshStandardMaterial({ color: '#8a9a48', roughness: 0.55, flatShading: true }),
    belly: new THREE.MeshStandardMaterial({ color: '#a8b878', roughness: 0.7, flatShading: true }),
  }), [])
  const h = 1 / NECK_SEG
  return (
    <>
      {[...Array(NECK_SEG)].map((_, k) => {
        const r0 = 0.52 - 0.22 * (k * h), r1 = 0.52 - 0.22 * ((k + 1) * h)
        return (
          <group key={k} position={[0, -0.5 + (k + 0.5) * h, 0]}>
            <mesh material={k % 2 ? M.b : M.a}><cylinderGeometry args={[r1, r0 * 1.04, h, 10]} /></mesh>
            <mesh position={[0, -h / 2, 0]} material={M.joint}><cylinderGeometry args={[r0 * 1.09, r0 * 1.09, h * 0.12, 10]} /></mesh>
            <mesh position={[0, 0, -r0 * 0.98]} rotation={[0.35, 0, 0]} material={M.fin}><boxGeometry args={[0.06, h * 0.55, 0.3]} /></mesh>
            <mesh position={[0, 0, r0 * 0.9]} material={M.belly}><boxGeometry args={[r0 * 0.95, h * 0.8, 0.12]} /></mesh>
          </group>
        )
      })}
    </>
  )
}

const HEAD_MATS = {
  hydra: rimMat({ color: '#6e9a58', roughness: 0.55, emissive: '#1e3a16', emissiveIntensity: 0.45, flatShading: true }, '#d8ffc0', 0.5),
  hydraBelly: rimMat({ color: '#b8c888', roughness: 0.6 }, '#f0ffe0', 0.35),
}
const NAME = 'The Allylic Hydra'
const SPARK_AT = { y: 4.2, z: 0.7 } // Malradix's spark rides in its chest, between the necks
const SLOT_Z = 3.4 // its three heads stand in a row in front of the body, 3.6 m apart
/**
 * The boss: three rounds, three ideas (rules10 HYDRA10). Its three heads are carbons; each round they carry new marks at
 * shuffled spots. 1 (§10.3): which H does Br· take first? Strike that head. 2 (§10.4): strike both carbons that share
 * the allyl radical's electron, inside the window. 3 (§10.6): G the Magnesium Ring onto every tail that takes Mg.
 * A wrong mark lashes (half a heart) and swaps the round to a different variant (a new molecule or tail set) at new spots,
 * so elimination doesn't carry over; a knockout restarts the round, reshuffled, after ~2.5 s of grace.
 */
export default function Hydra10({ world, center, active, onDefeated }) {
  // won rounds are saved (t10hydraRound), so a reload and Continue resume at the current round, as a knockout does
  const [round, setRound] = useState(() => Math.min(HYDRA10.length - 1, Math.max(0, getState().save.t10hydraRound || 0)))
  // per round: which variant is up (random at first) and the order its marks stand in
  const [first] = useState(() => HYDRA10.map((r) => Math.floor(Math.random() * r.variants.length)))
  const [vars, setVars] = useState(first)
  const [orders, setOrders] = useState(() => HYDRA10.map((r, i) => shuffled(r.variants[first[i]].marks.map((m) => m.id))))
  const [, bumpRing] = useState(0)
  // a fresh order that always differs from the current one, so the heads visibly shift
  const reshuffle = (r) => setOrders((o) => o.map((x, i) => { if (i !== r) return x; let n = x; while (n.join() === x.join()) n = shuffled(x); return n }))
  // a wrong mark: the next variant of this round (a different molecule or tail set), its marks at shuffled spots
  const swapVariant = (r) => {
    const nv = (vars[r] + 1) % HYDRA10[r].variants.length
    setVars((v) => v.map((x, i) => (i === r ? nv : x)))
    setOrders((o) => o.map((x, i) => (i === r ? shuffled(HYDRA10[r].variants[nv].marks.map((m) => m.id)) : x)))
  }
  const [gone, setGone] = useState(false)
  const st = useRef({ mode: 'fight', t: 0, first: null, firstT: 0, biteT: 3, biting: -1 })
  const heads = useRef([]), necks = useRef([]), body = useRef(), glow = useRef(), spark = useRef(), wave = useRef(), tails = useRef([]), ripples = useRef([])
  const ko = useRef(null)
  const ri = Math.min(round, HYDRA10.length - 1)
  const R = HYDRA10[ri]
  const V = R.variants[vars[ri]]
  const order = orders[ri]
  const markOf = (id) => V.marks.find((m) => m.id === id) || V.marks[0]
  const slotX = (i) => center[0] + (i - 1) * 3.6
  const headPos = (i) => {
    const s = st.current, now = performance.now()
    const lift = R.id === 'g' ? 1.0 : 0
    return [slotX(i) + Math.sin(now / 900 + i) * 0.3, 2.8 + lift + (s.mode === 'gone' ? -s.t * 2 : 0), center[2] + SLOT_Z + Math.sin(now / 600 + i * 2) * 0.4 + (s.biting === i ? 2.4 : 0)]
  }
  const tailPos = (i) => [slotX(i), 0.35, center[2] + SLOT_Z + 1.6]
  // the spark's world position is shared so the scene can frame it in the intro and follow it on defeat
  useEffect(() => { world.hydraSpark = new THREE.Vector3(center[0], SPARK_AT.y, center[2] + SPARK_AT.z); world.hydraSparkGone = false; return () => { world.hydraSpark = null; world.hydraSparkGone = false } }, [world])

  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: HYDRA10.length - round, max: HYDRA10.length }, objective: `Round ${round + 1} of 3 · ${V.title}` })
    world.bossCam = true
    s.first = null
    s.ringed = []
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), hydra10: s, hydraRound: () => round, hydraOrder: () => order, hydraVariant: () => V }
    const lash = (why) => {
      sfx('wrong'); s.mode = 'lash'; s.t = 0; s.first = null; s.ringed = []; world.shake = 0.35
      const p = world.player
      if (p) p.hurt(1, [center[0], 0, center[2]], true)
      const m = `${why} It writhes and becomes something new.`
      toast(m, 'warn', readMs(m))
      swapVariant(ri)
    }
    const win = (msg) => {
      const next = round + 1
      setState({ bossHp: { name: NAME, hp: HYDRA10.length - next, max: HYDRA10.length } })
      sfx('pair'); world.shake = 0.4
      toast(msg, 'good', readMs(msg))
      if (next >= HYDRA10.length) { saveGame({ t10hydraRound: 0 }); s.mode = 'gone'; s.t = 0; s.sparkT = 0; s.fadeT = 0; setGone(true); setTimeout(() => onDefeated && onDefeated(), 400); return }
      saveGame({ t10hydraRound: next })
      s.mode = 'pause'; s.t = 0; s.first = null
      setTimeout(() => setRound(next), 1800)
    }
    const ids = []
    if (R.id !== 'g') {
      order.forEach((id, i) => ids.push(world.addTarget({
        pos: () => headPos(i), radius: 0.9, tall: 1.6, alive: () => s.mode === 'fight',
        onHit: () => {
          const m = markOf(id)
          if (!m.right) { lash(m.why); return true }
          if (R.id === 'h') { win(V.win); return true }
          // round 2: both ends of the allyl radical, inside the window (game time, so a stalled frame doesn't eat it)
          const now = world.time
          if (s.first && s.first !== id && now - s.firstT <= R.window) { s.first = null; win('Both ends at once! The electron had nowhere left to hide. Now its tails…'); return true }
          s.first = id; s.firstT = now; sfx('hit')
          if (!s.toldOne || now - s.toldOne > 8) { s.toldOne = now; toast('It shrugs: that carbon only shares the electron. Strike its partner, fast!', 'warn', 4200, true) }
          return true
        },
      })))
    } else {
      order.forEach((id, i) => {
        const m = markOf(id)
        ids.push(world.addTarget({ pos: () => tailPos(i), radius: 0.7, tall: 0.8, alive: () => s.mode === 'fight', onHit: () => { sfx('block'); if (!s.toldTail || performance.now() - s.toldTail > 6000) { s.toldTail = performance.now(); toast('The tail just coils. Put the Magnesium Ring on one (G).', 'warn', 3600, true) } return false } }))
        ids.push(world.addLantern({ needs: 'hasRing', omni: true, aim: true, priority: 1, pos: () => tailPos(i), radius: 2.4, label: () => (s.mode === 'fight' && !(s.ringed || []).includes(id) ? `Slip the Magnesium Ring onto the ${m.label}` : null), onLantern: () => {
          if (s.mode !== 'fight') return
          if (!m.right) { lash(m.why); return }
          if (s.ringed.includes(id)) return
          s.ringed = [...s.ringed, id]; sfx('shard'); bumpRing((n) => n + 1)
          const need = V.marks.filter((x) => x.right).map((x) => x.id)
          if (need.every((x) => s.ringed.includes(x))) { win('Every C–X that takes Mg now holds it: R–MgX, a δ− carbon, a very strong base, sitting in water. R–H! The Hydra sinks.'); return }
          toast('Mg slides into that C–X bond: R–MgX. Is that every tail that takes it?', 'good', 3600, true)
        } }))
      })
    }
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round, orders, vars])

  // a knockout restarts the current round (won rounds stay won): marks reshuffle, and the heads hold off ~2.5 s
  useEffect(() => {
    if (!active) return
    if (ko.current === null) ko.current = world.knockouts || 0
    const t = setInterval(() => {
      const n = world.knockouts || 0
      if (n === ko.current) return
      ko.current = n
      const s = st.current
      if (s.mode === 'gone') return
      s.first = null; s.ringed = []; s.biting = -1; s.bitHit = false; s.biteT = 2.5
      reshuffle(ri)
      setTimeout(() => toast('While you were down, its heads shifted. This round starts over.', 'warn', 4200), 600)
    }, 250)
    return () => clearInterval(t)
  }, [active, round])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += s.mode === 'gone' ? rawDt : dt // the defeat plays out during Pi's line, which pauses enemies
    const p = world.player
    if (s.mode === 'lash' && s.t > 1.0) { s.mode = 'fight'; s.t = 0 }
    if (s.mode === 'pause' && s.t > 2.4) { s.mode = 'fight'; s.t = 0 }
    if (s.first && R.window && world.time - s.firstT > R.window) { s.first = null; { const t = 'Too slow! It’s on both ends at once. Strike both, together.'; toast(t, 'warn', readMs(t), true) } }
    // one head bites at a time, never two together: the head nearest Kai
    if (s.mode === 'fight') {
      s.biteT -= dt
      if (s.biteT <= 0 && s.biting < 0 && p && Math.abs(p.pos.z - (center[2] + SLOT_Z)) < 5) { let bi = 0, bd = Infinity; for (let i = 0; i < 3; i++) { const d = Math.abs(p.pos.x - slotX(i)); if (d < bd) { bd = d; bi = i } } s.biting = bi; s.biteAt = 0; sfx('dash') }
      if (s.biting >= 0) {
        s.biteAt += dt
        if (s.biteAt > 0.55 && !s.bitHit) { s.bitHit = true; const hp = headPos(s.biting); if (p && !p.rolling && Math.hypot(p.pos.x - hp[0], p.pos.z - hp[2]) < 2.0) p.hurt(1, [hp[0], 0, hp[2]]) }
        if (s.biteAt > 1.1) { s.biting = -1; s.bitHit = false; s.biteT = R.bite }
      }
    } else if (s.mode !== 'gone') { s.biting = -1; s.bitHit = false }
    const bodyY = s.mode === 'gone' ? -Math.min(4, s.t * 1.6) : s.mode === 'pause' ? -0.4 : 0
    if (body.current) body.current.position.y = bodyY
    const v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
    heads.current.forEach((g, i) => {
      if (!g) return
      const hp = headPos(i)
      g.position.set(hp[0] - center[0], hp[1], hp[2] - center[2])
      if (p) g.rotation.y = Math.atan2(p.pos.x - hp[0], p.pos.z - hp[2])
      const nk = necks.current[i]
      if (nk) {
        const a = new THREE.Vector3(0, 1.6 + bodyY, 0.4), b = new THREE.Vector3(hp[0] - center[0], hp[1] - 0.5, hp[2] - center[2])
        v.subVectors(b, a); const L = Math.max(0.01, v.length())
        nk.position.copy(a).addScaledVector(v, 0.5); nk.scale.set(1, L, 1); nk.quaternion.setFromUnitVectors(up, v.normalize())
      }
    })
    tails.current.forEach((g, i) => {
      if (!g) return
      const tp = tailPos(i), a = new THREE.Vector3(0, 0.5 + bodyY, -0.2), b = new THREE.Vector3(tp[0] - center[0], tp[1] + Math.sin(state.clock.elapsedTime * 2 + i) * 0.08, tp[2] - center[2])
      v.subVectors(b, a); const L = Math.max(0.01, v.length())
      g.position.copy(a).addScaledVector(v, 0.5); g.scale.set(1, L, 1); g.quaternion.setFromUnitVectors(up, v.normalize())
    })
    if (glow.current) glow.current.intensity = s.first ? 6 : 3 + Math.sin(state.clock.elapsedTime * 6)
    if (wave.current) { wave.current.visible = s.mode === 'lash' && s.t < 0.7; wave.current.scale.setScalar(1 + s.t * 12) }
    ripples.current.forEach((m, k) => { if (!m) return; const ph = (state.clock.elapsedTime * 0.22 + k * 0.5) % 1; m.scale.setScalar(1.2 + ph * 4.6); m.material.opacity = 0.42 * (1 - ph) })
    // the spark rides in its chest; on defeat it tears free and flies east (+x) and up, toward the Volcanic Wastes
    if (spark.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.15
      if (s.mode !== 'gone') { spark.current.position.set(0, SPARK_AT.y + bodyY, SPARK_AT.z); spark.current.scale.setScalar(pulse); spark.current.visible = true }
      else {
        s.sparkT = (s.sparkT || 0) + rawDt
        const k = Math.min(1, s.sparkT * 2)
        // east along the pool, under the forge's vault (y 8.6), to the east wall's top (x 12.8), where it hovers on camera
        // until Pi's line is closed (the scene sets world.hydraSparkGone); then it shrinks away into the wall
        spark.current.position.x = Math.min(12.8, spark.current.position.x + rawDt * 3.6 * k); spark.current.position.y = Math.min(7.2, spark.current.position.y + rawDt * 1.4 * k)
        if (world.hydraSparkGone) s.fadeT = (s.fadeT || 0) + rawDt
        const f = Math.max(0, 1 - (s.fadeT || 0) * 2)
        spark.current.scale.setScalar(1.8 * pulse * Math.max(0.01, f)); spark.current.visible = f > 0
      }
      if (world.hydraSpark) world.hydraSpark.set(spark.current.position.x + center[0], spark.current.position.y, spark.current.position.z + center[2])
    }
  })

  const showMarks = active && !gone
  return (
    <group position={center}>
      {/* the pool round it */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[6.45, 48]} /><meshStandardMaterial color="#1e4a48" metalness={0.6} roughness={0.12} emissive="#0a3a36" emissiveIntensity={0.55} transparent opacity={0.84} depthWrite={false} /></mesh>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[6.0, 6.45, 48]} /><meshBasicMaterial color="#d8f0e0" transparent opacity={0.26} depthWrite={false} /></mesh>
      {[0, 1].map((k) => <mesh key={'rp' + k} ref={(r) => (ripples.current[k] = r)} position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.95, 1, 48]} /><meshBasicMaterial color="#c8fff0" transparent opacity={0.4} depthWrite={false} /></mesh>)}
      <group ref={body}><Part model="magnus" name="hyd_body" scale={2} /><pointLight ref={glow} position={[0, 4.5, 0]} color="#ffe8a0" intensity={3} distance={9} /></group>
      {[0, 1, 2].map((i) => <group key={'n' + i} ref={(r) => (necks.current[i] = r)}><HydraNeck /></group>)}
      {[0, 1, 2].map((i) => (
        <group key={i} ref={(r) => (heads.current[i] = r)}>
          {/* a lighter, faintly lit hide and two glowing eyes on the snout (the model's own eyes sit inside the skull) */}
          <group scale={1.3}>
            <Part model="magnus" name="hyd_head" mats={HEAD_MATS} />
            {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.2, 0.15, 0.62]}><sphereGeometry args={[0.075, 10, 8]} /><meshBasicMaterial color="#ffd23a" toneMapped={false} /></mesh>)}
          </group>
          {showMarks && R.id === 'h' && <group>
            {/* the H atom on a short C–H bond stick from the head */}
            <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.055, 0.055, 0.5, 8]} /><meshStandardMaterial color="#d0d0c0" roughness={0.45} /></mesh>
            <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.25, 20, 16]} /><meshStandardMaterial color="#f6f6f6" roughness={0.3} emissive="#bfe8ff" emissiveIntensity={0.35} /></mesh>
          </group>}
          {showMarks && R.id !== 'g' && <Tag position={[0, 1.7, 0]} df={11} far={40}>{markOf(order[i]).label}</Tag>}
        </group>
      ))}
      {showMarks && R.id === 'g' && order.map((id, i) => (
        <group key={'t' + id}>
          <mesh ref={(r) => (tails.current[i] = r)}><cylinderGeometry args={[0.14, 0.32, 1, 8]} /><meshStandardMaterial color="#4e6a3e" roughness={0.75} /></mesh>
          <group position={[slotX(i) - center[0], 0.45, SLOT_Z + 1.6]}>
            <mesh><icosahedronGeometry args={[0.32, 0]} /><meshStandardMaterial color="#c8c8b8" emissive="#6a6a5a" emissiveIntensity={0.4} flatShading /></mesh>
            <Tag position={[0, 1.0, 0]} df={11} far={40}>{(st.current.ringed || []).includes(id) ? `${markOf(id).label} · R–MgX` : markOf(id).label}</Tag>
          </group>
        </group>
      ))}
      <group ref={spark} visible={false}>
        <mesh><sphereGeometry args={[0.28, 14, 10]} /><meshBasicMaterial color="#f4e0ff" toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.6, 14, 10]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[1.0, 14, 10]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.18} depthWrite={false} toneMapped={false} /></mesh>
        <pointLight color="#c070ff" intensity={8} distance={9} />
      </group>
      <mesh ref={wave} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[0.6, 0.75, 32]} /><meshBasicMaterial color="#c8ffb0" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      {showMarks && <Tag position={[0, 5.5, 0]} df={12} far={40}>{V.title.split(' · ')[0]}</Tag>}
    </group>
  )
}
