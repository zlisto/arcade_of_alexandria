import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, enemiesPaused } from '../engine/store'
import { ROUTES, MIMIC_ROUNDS, shown, shuffled } from '../chem/rules9'

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

// ---------- the Mimic's costume: a ball-and-stick of the molecule it is wearing (heavy atoms only, as a skeletal
// formula would draw it). Each disguise in MIMIC_ROUNDS, plus the bare start, is spelled out here as a carbon chain:
// n carbons, b = { i: order of the C(i)-C(i+1) bond }, s = [[carbon, element, bond order]] substituents.
const SKEL = {
  acetylene: { n: 2, b: { 1: 3 } },
  '1-pentyne': { n: 5, b: { 1: 3 } },
  '1-pentene': { n: 5, b: { 1: 2 } },
  '2-bromopentane': { n: 5, s: [[2, 'Br', 1]] },
  '5-methyl-1-hexyne': { n: 6, b: { 1: 3 }, s: [[5, 'C', 1]] },
  '5-methyl-1-hexene': { n: 6, b: { 1: 2 }, s: [[5, 'C', 1]] },
  '5-methyl-1-hexanol': { n: 6, s: [[1, 'O', 1]] },
  '1-heptyne': { n: 7, b: { 1: 3 } },
  '2-heptanone': { n: 7, s: [[2, 'O', 2]] },
}
const ATOM = { C: ['#e6e6ee', 0.15, '#6a6488'], O: ['#ff4a4a', 0.15, '#5a1010'], Br: ['#b0502a', 0.19, '#401808'] }
const BL = 0.42
function buildSkel(name) {
  const k = SKEL[String(name).replace(/ †$/, '')]
  if (!k) return null
  const ord = (i) => (k.b && k.b[i]) || 1
  const sp = (i) => ord(i) === 3 || ord(i + 1) === 3 // carbon i (1-based) is sp: keep the chain straight through it
  const P = [new THREE.Vector2(0, 0)]
  let h = -Math.PI / 6, turn = 1
  for (let i = 2; i <= k.n; i++) {
    P.push(P[i - 2].clone().add(new THREE.Vector2(Math.cos(h), Math.sin(h)).multiplyScalar(BL)))
    if (!sp(i)) { h += turn * (Math.PI / 3); turn = -turn }
  }
  const atoms = P.map((p) => ['C', p]), bonds = []
  for (let i = 1; i < k.n; i++) bonds.push([i - 1, i, ord(i)])
  for (const [c, el, o] of k.s || []) {
    const i = c - 1, at = P[i]
    let dir
    if (i > 0 && i < k.n - 1) dir = P[i - 1].clone().sub(at).normalize().add(P[i + 1].clone().sub(at).normalize()).multiplyScalar(-1).normalize()
    else { const nb = P[i === 0 ? 1 : i - 1].clone().sub(at).normalize(); dir = nb.rotateAround(new THREE.Vector2(), (2 * Math.PI) / 3) }
    atoms.push([el, at.clone().add(dir.multiplyScalar(BL))]); bonds.push([i, atoms.length - 1, o])
  }
  const c = atoms.reduce((m, [, p]) => m.add(p), new THREE.Vector2()).multiplyScalar(1 / atoms.length)
  return { atoms: atoms.map(([el, p]) => [el, p.clone().sub(c)]), bonds }
}
const _up = new THREE.Vector3(0, 1, 0)
function Costume({ name }) {
  const g = useRef(), t = useRef(0)
  const m = useMemo(() => buildSkel(name), [name])
  useEffect(() => { t.current = 0 }, [name])
  useFrame(({ clock }, dt) => {
    if (!g.current) return
    t.current += dt
    g.current.scale.setScalar(2.2 * Math.min(1, t.current * 2.5)) // read from the boss camera, 11 m off (Presentation #6)
    g.current.rotation.y = Math.sin(clock.elapsedTime * 0.7) * 0.35
    g.current.position.y = 1.75 + Math.sin(clock.elapsedTime * 1.3) * 0.06
  })
  if (!m) return null
  return (
    <group ref={g} position={[0, 1.75, 1.05]}>
      {m.atoms.map(([el, p], i) => <mesh key={i} position={[p.x, p.y, 0]}><sphereGeometry args={[ATOM[el][1], 16, 12]} /><meshStandardMaterial color={ATOM[el][0]} emissive={ATOM[el][2]} emissiveIntensity={el === 'C' ? 1.2 : 0.8} roughness={0.35} metalness={0.1} /></mesh>)}
      {m.bonds.flatMap(([a, b, o], j) => {
        const A = m.atoms[a][1], B = m.atoms[b][1], d = B.clone().sub(A), L = d.length(), nrm = new THREE.Vector2(-d.y, d.x).normalize()
        const q = new THREE.Quaternion().setFromUnitVectors(_up, new THREE.Vector3(d.x, d.y, 0).normalize())
        return [...Array(o)].map((_, k) => {
          const off = (k - (o - 1) / 2) * 0.085
          return <mesh key={j + '.' + k} position={[(A.x + B.x) / 2 + nrm.x * off, (A.y + B.y) / 2 + nrm.y * off, 0]} quaternion={q}><cylinderGeometry args={[0.035, 0.035, L, 6]} /><meshStandardMaterial color="#d8c8f0" emissive="#5a3a8a" emissiveIntensity={0.6} /></mesh>
        })
      })}
    </group>
  )
}

const readMs = (t) => Math.max(3200, Math.round((t.split(/\s+/).length / 3.5) * 1000) + 800)
const SPARK_AT = new THREE.Vector3(0, 1.25, 0.5) // in the Mimic's chest, under the costume
const NAME = 'Malradix’s Mimic · ?'
const PED_R = 7
/**
 * The boss. Three rounds, each a synthesis that turns on a different idea (Worked Examples 9.2 and 9.3, Problem 9-13(d));
 * WE 9.1 belongs to the Map, so nothing here repeats it. The Mimic wears the target; four pedestals carry candidate
 * precursors. Strike the immediate precursor: a shell tears away and the Mimic becomes that precursor. Reach the start
 * and it stands bare: strike it. A wrong pedestal and it lashes out and every shell grows back; it also lunges.
 * Every wrong pick and every knockout redraws the pedestals, so positions can't be learned by elimination; a knockout
 * also regrows the current round's shells (finished rounds stay won). G with the Retrosynthesis Map reads the reagent
 * of the current step back, never the precursor: the pedestal still tests that.
 */
export default function Mimic({ world, center, active, onDefeated }) {
  const [round, setRound] = useState(0)
  const [step, setStep] = useState(0)
  const st = useRef({ mode: 'plan', t: 0, lungeT: 4, pos: new THREE.Vector3(center[0], 0, center[2]) })
  const body = useRef(), shells = useRef([]), wave = useRef(), spark = useRef(), doll = useRef()
  const [gone, setGone] = useState(false) // beaten: drop the costume and tags while the spark flies off
  // Malradix's violet spark sits in its chest; its world position is shared so the scene's cameras can frame it
  useEffect(() => { world.mimicSpark = new THREE.Vector3(center[0], SPARK_AT.y + 0.2, center[2] + SPARK_AT.z); return () => { world.mimicSpark = null } }, [world])
  // where the doll will stand (the Mimic's feet, a live vector), so the defeat camera can frame it first
  useEffect(() => { world.mimicDoll = st.current.pos; return () => { world.mimicDoll = null } }, [world])
  const ROUNDS = MIMIC_ROUNDS.length
  const [orders, setOrders] = useState(() => MIMIC_ROUNDS.map((k) => ROUTES[k].back.map((b) => shuffled(b.pick))))
  const reshuffle = (r) => setOrders((o) => o.map((x, i) => (i === r ? ROUTES[MIMIC_ROUNDS[r]].back.map((b) => shuffled(b.pick)) : x)))
  const ko = useRef(null)
  const R = ROUTES[MIMIC_ROUNDS[round]]
  const cur = R.back[Math.min(step, R.back.length - 1)]
  const bare = step >= R.back.length
  const opts = bare ? [] : orders[round][step]
  const pedPos = (i) => { const a = Math.PI * (0.15 + 0.7 * (i / 3)); return [center[0] + Math.cos(a + Math.PI) * PED_R, center[2] + Math.sin(a + Math.PI) * PED_R * 0.8 + 2] }

  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: ROUNDS - round, max: ROUNDS } })
    world.bossCam = true
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), mimic: s, mimicStep: () => [round, step] }
    const ids = opts.map((o, i) => world.addTarget({
      pos: () => { const [x, z] = pedPos(i); return [x, 1.2, z] }, radius: 0.8, tall: 1.6, alive: () => true,
      onHit: () => {
        if (o === cur.right) {
          sfx('shard'); world.shake = 0.3
          const m = `Yes: ${shown(cur.right)} → (${cur.step}) → ${shown(cur.have)}. A shell tears away.`
          toast(m, 'good', readMs(m))
          setStep(step + 1)
        } else {
          sfx('wrong'); s.mode = 'lash'; s.t = 0; s.hit = false
          const w = cur.why[o] || 'That isn’t what came just before.'
          toast(step > 0 ? `${w} Its shells grow back and the pedestals shift: start again from ${shown(R.target)}.` : `${w} The pedestals shift.`, 'warn', step > 0 ? 7400 : 5600)
          setStep(0); reshuffle(round)
        }
        return true
      },
    }))
    ids.push(world.addTarget({
      pos: () => [s.pos.x, 1.6, s.pos.z], radius: 1.1, tall: 2.6, alive: () => true,
      onHit: () => {
        if (!bare) { sfx('block'); if (!s.toldShell || performance.now() - s.toldShell > 6000) { s.toldShell = performance.now(); toast(`It’s still wearing ${shown(cur.have)}. Work backward: strike the pedestal with what came just before it.`, 'warn', 4800, true) } return false }
        sfx('hit'); world.shake = 0.4
        const next = round + 1
        setState({ bossHp: { name: NAME, hp: ROUNDS - next, max: ROUNDS } })
        if (next >= ROUNDS) { s.mode = 'gone'; s.t = 0; s.sparkT = 0; setGone(true); setTimeout(() => onDefeated && onDefeated(), 400); return true } // Pi calls the spark while it is in the air
        toast('Unmasked! It snatches another disguise…', 'warn', 3400)
        setTimeout(() => { setRound(next); setStep(0) }, 1400)
        return true
      },
    }))
    // the Retrosynthesis Map (G): it names the reagent of this step back, never the precursor
    const mapId = world.addLantern({
      needs: 'hasRetro', omni: true, radius: 14, pos: () => [s.pos.x, 0, s.pos.z],
      label: () => (bare || s.mode === 'gone' ? null : 'Read the Map: how was this made?'),
      onLantern: () => toast(`Map: ${shown(cur.have)} was made with ${cur.hint || cur.step}. From what? Strike that pedestal.`, 'info', 5200, true),
    })
    ids.push(mapId)
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round, step, orders])

  // a knockout costs the round: its shells regrow and the pedestals shift (completed rounds are kept)
  useEffect(() => {
    if (!active) return
    if (ko.current === null) ko.current = world.knockouts || 0
    const t = setInterval(() => {
      const n = world.knockouts || 0
      if (n === ko.current) return
      ko.current = n
      const m = st.current
      if (m.mode === 'gone') return
      // a respawn gets a grace: it breaks off any lunge, walks back to its spot (1.2 s), then waits ~1.3 s (Play #3)
      m.mode = 'back'; m.t = 0; m.hit = false; m.lashed = false; m.grace = true
      setStep(0); reshuffle(round)
      setTimeout(() => toast(`While you were down, its shells grew back. Start again from ${shown(R.target)}.`, 'warn', 4800), 600)
    }, 250)
    return () => clearInterval(t)
  }, [active, round])

  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += s.mode === 'gone' ? rawDt : dt // the defeat plays out during Pi's line, which pauses enemies
    const p = world.player
    // now and then it lunges at Kai; a lash (after a wrong answer) is a ring of force round it
    s.lungeT -= dt
    if (s.mode === 'plan' && s.lungeT <= 0 && p) { s.mode = 'lunge'; s.t = 0; s.aim = new THREE.Vector3(p.pos.x, 0, Math.min(p.pos.z, center[2] + 8)) } // never as far as the -138 respawn
    if (s.mode === 'lunge') {
      if (s.t < 0.7) { /* wind up */ } else if (s.t < 1.1) { s.pos.lerp(s.aim, Math.min(1, dt * 8)); if (p && !s.hit && !p.rolling && Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 1.3) { s.hit = true; p.hurt(1, [s.pos.x, 0, s.pos.z]) } } else { s.mode = 'back'; s.t = 0; s.hit = false }
    }
    if (s.mode === 'back') { s.pos.lerp(new THREE.Vector3(center[0], 0, center[2]), Math.min(1, dt * 3)); if (s.t > 1.2) { s.mode = 'plan'; s.lungeT = bare ? 99 : s.grace ? 1.3 : 5 + Math.random() * 2; s.grace = false } }
    if (s.mode === 'lash') {
      if (wave.current) { wave.current.visible = s.t < 0.7; wave.current.scale.setScalar(1 + s.t * 14) }
      if (s.t > 0.2 && !s.lashed) { s.lashed = true; if (p && !p.rolling && Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 9) p.hurt(1, [s.pos.x, 0, s.pos.z]) }
      if (s.t > 1.0) { s.mode = 'back'; s.t = 0; s.lashed = false }
    }
    if (body.current) {
      body.current.position.set(s.pos.x - center[0], 0.2 + Math.sin(state.clock.elapsedTime * 1.6) * 0.1, s.pos.z - center[2])
      if (p) body.current.rotation.y = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
      body.current.scale.setScalar(s.mode === 'gone' ? Math.max(0.01, 1 - s.t) : s.mode === 'lunge' && s.t < 0.7 ? 1 + s.t * 0.15 : 1)
    }
    // beaten: the violet body fades and leaves a small grey faceless doll behind
    if (doll.current) {
      doll.current.visible = s.mode === 'gone'
      if (s.mode === 'gone') { doll.current.position.set(s.pos.x - center[0], 0, s.pos.z - center[2]); doll.current.scale.setScalar(Math.min(1, s.t * 1.5)) }
    }
    // the spark sits in its chest; when the Mimic is beaten it tears free and flies east (+x) and up, toward the marsh
    if (spark.current && body.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.15
      if (s.mode !== 'gone') {
        const ry = body.current.rotation.y, bp = body.current.position
        spark.current.position.set(bp.x + Math.sin(ry) * SPARK_AT.z, bp.y + SPARK_AT.y, bp.z + Math.cos(ry) * SPARK_AT.z)
        spark.current.scale.setScalar(pulse); spark.current.visible = true
      } else {
        s.sparkT = (s.sparkT || 0) + rawDt
        const k = Math.min(1, s.sparkT * 2) // a quick tear-free, then full speed
        spark.current.position.x += rawDt * 5 * k; spark.current.position.y += rawDt * 6 * k
        spark.current.scale.setScalar(1.8 * pulse); spark.current.visible = s.sparkT < 4.0
      }
      if (world.mimicSpark) world.mimicSpark.set(spark.current.position.x + center[0], spark.current.position.y, spark.current.position.z + center[2])
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
        {active && !gone && <Costume name={bare ? R.start : cur.have} />}
        {active && !gone && <Tag position={[0, 3.8, 0]} df={13} far={40}>{bare ? `bare: ${R.start}. Strike!` : `I am ${shown(cur.have)}.`}</Tag>}
      </group>
      <group ref={spark} visible={false}>
        <mesh><sphereGeometry args={[0.24, 14, 10]} /><meshBasicMaterial color="#f4e0ff" toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.5, 14, 10]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.9, 14, 10]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.18} depthWrite={false} toneMapped={false} /></mesh>
        <pointLight color="#c070ff" intensity={8} distance={9} />
      </group>
      <group ref={doll} visible={false}>
        <mesh position={[0, 0.55, 0]}><capsuleGeometry args={[0.2, 0.55, 6, 10]} /><meshStandardMaterial color="#8a8a90" roughness={0.9} /></mesh>
        <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.18, 14, 10]} /><meshStandardMaterial color="#9a9aa0" roughness={0.9} /></mesh>
      </group>
      <mesh ref={wave} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[0.6, 0.75, 32]} /><meshBasicMaterial color="#b070ff" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      {active && !gone && opts.map((o, i) => {
        const [x, z] = pedPos(i)
        return (
          <group key={o} position={[x - center[0], 0, z - center[2]]}>
            <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.6, 0.7, 1.0, 10]} /><meshStandardMaterial color="#6a6e76" /></mesh>
            <mesh position={[0, 1.3, 0]}><octahedronGeometry args={[0.32, 0]} /><meshStandardMaterial color="#9af0ff" emissive="#3ab0d0" emissiveIntensity={0.8} /></mesh>
            <Tag position={[0, 2.1, 0]} df={10} far={40}>{o}</Tag>
          </group>
        )
      })}
      {active && !gone && <Tag position={[0, 6.2, -4]} df={15} far={40}>{`${R.title}: what came just before?`}</Tag>}
    </group>
  )
}
