import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, getState, saveGame, enemiesPaused, openPanel } from '../engine/store'
import { Malradix } from './MalradixModel'
import { SORC_POOL, SORC_N, C2_NAME, C2_SHORT, sorcDraw, sorcValid, sorcSwap, reroll, readMs } from '../chem/rules12'

// World 12's people and creatures, built in Blender (tools/spectra_blender.py → public/models/spectra.glb):
// • Astronomer Spectra (assets/characters/astronomer-spectra.png).
// • Fragment Phantoms (§12.1–12.2): cation radicals. A blow knocks a fragment off, lighter than the whole; the core
//   keeps coming until a second blow breaks it.
// • The Disguised Sorcerer (§12.2–12.8): Malradix behind a false shape. Strike the two mass crystals to weigh him,
//   turn the Spectra Lens on him, then name the molecule that fits it all. Three rounds, each a different idea.
preloadModels('spectra', 'intro')

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

/** Fragment Phantoms. They hold off in turn when Kai first walks in (once a visit), back off and hold after a
 *  knockout, keep apart, claw one at a time, and stay 5 m inside their room's entrance edge (off the checkpoint) */
export function Phantoms({ world, spawns, active = true, zone, xMax = 9 }) {
  const ps = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), home: new THREE.Vector3(x, 0, z), hp: 2, state: 'idle', t: Math.random() * 3, cd: 2 + i })))
  const refs = useRef([]), frags = useRef([])
  const ko = useRef(null), wasIn = useRef(false), entered = useRef(false)
  const told = useRef({ frag: false }).current // per mount; set only when its toast actually showed
  useEffect(() => {
    if (!active) return
    const ids = ps.current.map((m) => world.addTarget({
      pos: () => [m.pos.x, 1.2, m.pos.z], radius: 0.8, tall: 2, alive: () => m.state !== 'dead' && m.state !== 'gone',
      onHit: () => {
        if (m.state === 'stagger' && m.t < 0.3) return false // one blow at a time
        m.hp--; sfx('hit')
        if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('pair') } else { m.state = 'stagger'; m.t = 0; m.hit = false; m.fragT = 0 }
        if (!told.frag && m.hp > 0) { const t = 'A piece breaks off, lighter than the whole: a fragment. The core is still coming.'; told.frag = toast(t, 'info', readMs(t), true) }
        return true
      },
    }))
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((state, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    const kn = world.knockouts || 0
    if (ko.current === null) ko.current = kn
    const inRoom = !!p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
    if (kn !== ko.current || (inRoom && !wasIn.current && !entered.current)) {
      const knocked = kn !== ko.current
      ko.current = kn
      if (!knocked) entered.current = true // stepping out and back doesn't renew the hold; a knockout does
      for (const m of ps.current) {
        if (m.state === 'dead' || m.state === 'gone') continue
        m.cd = Math.max(m.cd, knocked ? 2.5 : 2.5 + m.i * 1.5)
        if (m.state === 'strike') { m.state = 'idle'; m.hit = false }
        if (knocked) { const hx = m.home.x - m.pos.x, hz = m.home.z - m.pos.z, hd = Math.hypot(hx, hz); if (hd > 0.01) { const k = Math.min(3, hd) / hd; m.pos.x += hx * k; m.pos.z += hz * k } }
      }
    }
    wasIn.current = inRoom
    for (const m of ps.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      const fr = frags.current[m.i]
      if (fr) { m.fragT = (m.fragT ?? 9) + dt; fr.visible = m.fragT < 0.8; fr.position.set(m.pos.x + m.fragT * 1.6, 1.4 + m.fragT * 1.2, m.pos.z); fr.scale.setScalar(Math.max(0.01, 1 - m.fragT * 1.2)) }
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.scale.setScalar(Math.max(0.01, 1 - m.t * 2)); if (m.t > 0.5) m.state = 'gone'; continue }
      g.scale.setScalar(m.hp >= 2 ? 1 : 0.8)
      if (inRoom) {
        const want = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z), d = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        if (m.state === 'idle' && d > 1.8) { m.pos.x += Math.sin(want) * dt * 1.5; m.pos.z += Math.cos(want) * dt * 1.5 }
        m.cd -= dt
        if (m.state === 'idle' && d < 2.0 && m.cd <= 0 && !ps.current.some((o) => o !== m && o.state === 'strike')) { m.state = 'strike'; m.t = 0 }
        if (m.state === 'strike' && m.t > 0.5 && !m.hit) { m.hit = true; if (d < 2.2 && !p.rolling) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.state === 'strike' && m.t > 1) { m.state = 'idle'; m.hit = false; m.cd = 2.2 }
      }
      if (m.state === 'stagger' && m.t > 0.6) { m.state = 'idle'; m.cd = Math.max(m.cd, 0.6) }
      for (const o of ps.current) {
        if (o === m || o.state === 'dead' || o.state === 'gone') continue
        const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z, dd = Math.hypot(dx, dz)
        if (dd > 0.01 && dd < 1.8) { m.pos.x += (dx / dd) * (1.8 - dd) * 0.5; m.pos.z += (dz / dd) * (1.8 - dd) * 0.5 }
      }
      m.pos.x = Math.max(-xMax, Math.min(xMax, m.pos.x))
      if (zone) m.pos.z = Math.min(zone[0] - 5, Math.max(zone[1] + 1.5, m.pos.z))
      g.position.set(m.pos.x, 0.2 + Math.sin(state.clock.elapsedTime * 2 + m.i) * 0.15, m.pos.z)
      g.rotation.y += dt * 0.6
    }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => <group key={i} ref={(r) => (refs.current[i] = r)}><Part model="spectra" name="frg_body" /><pointLight position={[0, 1.2, 0]} color="#ff6ad0" intensity={1.4} distance={4} /></group>)}
      {spawns.map((_, i) => <mesh key={'f' + i} ref={(r) => (frags.current[i] = r)} visible={false}><octahedronGeometry args={[0.28, 0]} /><meshBasicMaterial color="#ffa0e0" transparent opacity={0.8} toneMapped={false} /></mesh>)}
    </group>
  )
}

// ---------------------------------------------------------------- the Disguised Sorcerer
const NAME = 'The Disguised Sorcerer'
const SPARK_Y = 1.95 // Malradix's spark rides in the false shape's chest
const SHELL = ['#7ae0ff', '#ffd27a', '#a6ffb0'] // the false shape's colour, by round only (it says nothing about the answer)
const STOMP_R = 24 // the ring of light runs out to the arena's corners, so idling anywhere isn't free
const RING_V = 12 // m/s
/**
 * Malradix in a false shape (§12.2–12.8). Three rounds, one per idea, in a shuffled order saved as t12sorcSeq with the
 * won-round count t12sorcRound (both clear on the win). Each round: strike the weighing crystal and the second crystal
 * (named for its clue: high-resolution or fragment), turn the Lens on him, then name him. A wrong name costs half a
 * heart, cuts 0.5 s from his attack timer for the rest of the round (up to 1.5 s), and swaps in a later round of another
 * idea (on the last round it re-deals another variant, with a different answer). A knockout re-forms the disguise:
 * this round's evidence is lost (won rounds stay won), with ~2.5 s of grace. Between, he winds up a ring of light
 * (a roll goes through it) or a lunge, and drifts back to his spot after it.
 * After the last round the shape shatters: Malradix himself, the spark in his chest. `paired` dims the spark (Pi has
 * paired it); `fade` lets him go.
 */
const _cv = new THREE.Vector3() // scratch: the camera's distance to the false shape
export default function Sorcerer({ world, center, crystals, active, onDefeated, paired = false, fade = false }) {
  const [round, setRound] = useState(() => Math.min(SORC_N - 1, Math.max(0, getState().save.t12sorcRound || 0)))
  const [seq, setSeq] = useState(() => { const q = getState().save.t12sorcSeq; return sorcValid(q) ? q : sorcDraw() })
  useEffect(() => { if (!sorcValid(getState().save.t12sorcSeq)) saveGame({ t12sorcSeq: seq }) }, [])
  const [vars, setVars] = useState(() => SORC_POOL.map((r) => Math.floor(Math.random() * r.variants.length)))
  const [flip, setFlip] = useState(() => Math.random() < 0.5) // which side the weighing crystal stands on, per round
  const [ev, setEv] = useState({ m1: false, m2: false, ir: false })
  const evRef = useRef(ev)
  evRef.current = ev
  const [gone, setGone] = useState(false)
  const st = useRef({ mode: 'idle', t: 0, pos: new THREE.Vector3(center[0], 0, center[2]), face: 0, next: 4, grace: 2, press: 0 }) // press: seconds a wrong name has cut from his attack timer this round
  const pending = useRef(false)
  const g = useRef(), shell = useRef(), mal = useRef(), ringM = useRef(), spark = useRef(), sparkMat = useRef(), sparkLight = useRef(), bits = useRef([])
  const ko = useRef(null)
  const ri = seq[Math.min(round, SORC_N - 1)]
  const D = SORC_POOL[ri]
  const V = D.variants[vars[ri]]
  const cAt = (k) => crystals[(k === 0) === flip ? 0 : 1] // k 0 = the weighing crystal
  const told = useRef({ blade: 0 }).current

  useEffect(() => { world.sorcSpark = new THREE.Vector3(center[0], SPARK_Y, center[2]); world.sorcPos = st.current.pos; return () => { world.sorcSpark = null; world.sorcPos = null } }, [world])
  // the round question rides in the objective line
  useEffect(() => {
    if (!active || gone) return
    const tick = (b) => (b ? '✓' : '?')
    setState({ objective: `Round ${round + 1} of ${SORC_N} · weigh ${tick(ev.m1)} · ${C2_SHORT[V.c2]} ${tick(ev.m2)} · Lens ${tick(ev.ir)} · what is he really?` })
  }, [active, gone, round, ev, V])

  useEffect(() => {
    if (!active || gone) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: SORC_N - round, max: SORC_N } })
    world.bossCam = true
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), sorc: s, sorcRound: () => round, sorcSeq: () => seq, sorcVariant: () => V, sorcEv: () => evRef.current }
    const ids = [0, 1].map((k) => world.addTarget({
      pos: () => { const [x, z] = cAt(k); return [x, 1.6, z] }, radius: 0.9, tall: 2.6, alive: () => !(k ? evRef.current.m2 : evRef.current.m1),
      onHit: () => {
        sfx('shard'); setEv((e) => ({ ...e, [k ? 'm2' : 'm1']: true }))
        const t = k ? (V.c2 === 'exact' ? `The high-resolution crystal rings out an exact mass for M⁺, ${V.mass} amu.` : 'The fragment crystal rings. His whole mass spectrum is held for when you name him.') : 'The weighing crystal rings. His M⁺ peaks are held for when you name him.'
        toast(t, 'good', readMs(t))
        return true
      },
    }))
    ids.push(world.addTarget({
      pos: () => [s.pos.x, 1.8, s.pos.z], radius: 1.0, tall: 3, alive: () => s.mode !== 'gone',
      onHit: () => { sfx('block'); if (world.time - told.blade > 8) { told.blade = world.time; { const t = 'The blade passes through a false shape. Weigh him on the crystals, then use the Lens.'; toast(t, 'info', readMs(t), true) } } return false },
    }))
    ids.push(world.addLantern({ needs: 'hasLens', omni: true, priority: 1, pos: () => [s.pos.x, 0, s.pos.z], radius: 8, label: () => (evRef.current.ir ? null : 'Turn the Spectra Lens on him'), onLantern: () => {
      if (evRef.current.ir) return
      sfx('stance'); setEv((e) => ({ ...e, ir: true }))
      toast('His light splits into bands. The Lens will hold the spectrum for you.', 'good', 3600)
    } }))
    ids.push(world.addInteractable({ pos: () => [s.pos.x, 0, s.pos.z], radius: 3.6, label: () => (!pending.current && s.mode !== 'gone' && evRef.current.m1 && evRef.current.m2 && evRef.current.ir ? 'Name what he truly is' : null), onInteract: async () => {
      if (pending.current) return
      pending.current = true
      let miss = null
      const ok = await openPanel('sorcerer', { pool: ri, v: vars[ri], onWrong: (t) => { miss = t } })
      if (!ok) {
        pending.current = false
        if (!miss) return
        // a wrong name: half a heart a tick after the panel closes, and a new false shape: a later round of another
        // idea takes this slot (on the last round, the same round re-deals a variant with a different answer)
        await new Promise((r) => setTimeout(r, 50))
        const p = world.player
        if (p) p.hurt(1, [s.pos.x, 0, s.pos.z], true)
        s.press = Math.min(1.5, s.press + 0.5) // guessing costs pressure: he attacks sooner for the rest of this round
        const m = `${miss} The disguise shifts, and he strikes faster now.`
        toast(m, 'warn', readMs(m))
        sfx('wrong'); world.shake = 0.3
        const n = sorcSwap(seq, round)
        if (n) { setSeq(n); saveGame({ t12sorcSeq: n }) }
        else if (D.idea === 'ir') { // the last round: maybe the other same-weight round, else another variant of this one
          const other = SORC_POOL.findIndex((r, i) => i !== ri && r.idea === 'ir' && !seq.includes(i))
          if (other >= 0 && Math.random() < 0.5) { const q = [...seq]; q[round] = other; setSeq(q); saveGame({ t12sorcSeq: q }) }
        }
        setVars((v) => v.map((x, i) => (i === ri ? reroll(SORC_POOL[i].variants.length, x) : x)))
        setEv({ m1: false, m2: false, ir: false }); setFlip(Math.random() < 0.5)
        s.mode = 'idle'; s.t = 0; s.next = Math.max(1.2, 2.5 - s.press); s.grace = 1.5
        return
      }
      setTimeout(() => (pending.current = false), 2000)
      sfx('shard'); world.shake = 0.5
      const next = round + 1
      setState({ bossHp: { name: NAME, hp: SORC_N - next, max: SORC_N } })
      if (next >= SORC_N) { saveGame({ t12sorcRound: 0, t12sorcSeq: null }); s.mode = 'gone'; s.t = 0; setGone(true); setTimeout(() => onDefeated && onDefeated(), 700); return }
      saveGame({ t12sorcRound: next })
      s.mode = 'pause'; s.t = 0
      { const t = ['Malradix: “A lucky guess. Weigh this one.” Another shape forms beneath it.', 'Malradix: “Still guessing, knight?” Another shape forms beneath it.'][round] || 'The false shape shatters, and another forms beneath it!'; toast(t, 'warn', readMs(t)) }
      setTimeout(() => { setEv({ m1: false, m2: false, ir: false }); setFlip(Math.random() < 0.5); setRound(next); s.mode = 'idle'; s.t = 0; s.next = 3; s.grace = 2; s.press = 0 }, 1400)
    } }))
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, gone, round, seq, vars, flip])

  // a knockout re-forms the disguise: this round's evidence is lost (won rounds stay won), with ~2.5 s of grace
  useEffect(() => {
    if (!active || gone) return
    if (ko.current === null) ko.current = world.knockouts || 0
    const t = setInterval(() => {
      const n = world.knockouts || 0
      if (n === ko.current) return
      ko.current = n
      const s = st.current
      if (s.mode === 'gone') return
      s.mode = 'idle'; s.t = 0; s.next = 3; s.grace = 2.5; s.hit = false
      setEv({ m1: false, m2: false, ir: false }); setFlip(Math.random() < 0.5)
      setTimeout(() => toast('While you were down, his disguise re-formed. Weigh him again.', 'warn', 4200), 600)
    }, 250)
    return () => clearInterval(t)
  }, [active, gone])

  useFrame((state, rawDt) => {
    if (!active || !g.current) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += s.mode === 'gone' ? rawDt : dt // the reveal plays out under dialogue, which pauses enemies
    s.grace = Math.max(0, s.grace - dt)
    const p = world.player
    const pd = p ? Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) : 99
    const turn = (rate) => { if (!p) return; let d = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z) - s.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; s.face += Math.sign(d) * Math.min(Math.abs(d), rate * dt) }
    const home = (k) => { const hx = center[0] - s.pos.x, hz = center[2] - s.pos.z; s.pos.x += hx * Math.min(1, k); s.pos.z += hz * Math.min(1, k) }
    let glow = 0.6, lift = 0
    if (ringM.current) ringM.current.visible = false
    if (s.mode === 'idle') {
      turn(2.5); home(dt * 2)
      s.next -= dt
      if (s.next <= 0 && s.grace <= 0) { s.mode = pd < 9 && Math.random() < 0.6 ? 'windLunge' : 'windRing'; s.t = 0; s.hit = false }
    } else if (s.mode === 'windRing') {
      // the tell: he rises and burns brighter for 0.8 s
      turn(2.5); lift = Math.min(0.6, s.t * 0.9); glow = 0.6 + s.t * 1.8
      if (s.t > 0.8) { s.mode = 'ring'; s.t = 0; sfx('dash') }
    } else if (s.mode === 'ring') {
      const r = Math.max(0.2, s.t * RING_V)
      if (ringM.current) { ringM.current.visible = true; ringM.current.position.set(s.pos.x - center[0], 0.12, s.pos.z - center[2]); ringM.current.scale.setScalar(r) }
      if (!s.hit && s.grace <= 0 && p && !p.rolling && Math.abs(pd - r) < 0.7) { s.hit = true; p.hurt(1, [s.pos.x, 0, s.pos.z]) }
      if (r >= STOMP_R) { s.mode = 'idle'; s.t = 0; s.next = Math.max(1.6, Math.max(2.6, 4.4 - round * 0.6) - s.press) }
    } else if (s.mode === 'windLunge') {
      // the tell: he draws back and turns square on for 0.6 s
      turn(5); lift = -0.2; glow = 0.6 + s.t * 2
      if (s.t > 0.6) {
        const dx = p ? p.pos.x - s.pos.x : 0, dz = p ? p.pos.z - s.pos.z : 0, l = Math.hypot(dx, dz) || 1, go = Math.max(0, Math.min(7, l - 1.4))
        s.lunge = { x0: s.pos.x, z0: s.pos.z, x1: s.pos.x + (dx / l) * go, z1: s.pos.z + (dz / l) * go }
        s.mode = 'lunge'; s.t = 0; sfx('dash')
      }
    } else if (s.mode === 'lunge') {
      const k = Math.min(1, s.t / 0.45), e = 1 - (1 - k) * (1 - k)
      s.pos.x = s.lunge.x0 + (s.lunge.x1 - s.lunge.x0) * e; s.pos.z = s.lunge.z0 + (s.lunge.z1 - s.lunge.z0) * e
      if (k >= 1 && !s.hit) { s.hit = true; world.shake = 0.25; if (s.grace <= 0 && p && !p.rolling && pd < 2.2) p.hurt(1, [s.pos.x, 0, s.pos.z]) }
      if (s.t > 0.75) { s.mode = 'recover'; s.t = 0 }
    } else if (s.mode === 'recover') {
      // back to his spot under the telescope, about a second after a lunge
      turn(2); home(dt * 3.5)
      if (s.t > 1.2) { s.mode = 'idle'; s.t = 0; s.next = Math.max(1.4, Math.max(2.4, 4.0 - round * 0.6) - s.press) }
    } else if (s.mode === 'pause') { home(dt * 3) }
    else if (s.mode === 'gone') { home(rawDt * 3.5) }
    g.current.position.set(s.pos.x - center[0], 0.35 + lift + (s.mode === 'gone' ? 0 : Math.sin(state.clock.elapsedTime * 1.4) * 0.15), s.pos.z - center[2])
    g.current.rotation.y = s.face
    // the false shape: whole while he fights; it shatters outward on the last name
    const shatter = s.mode === 'gone' ? s.t : 0
    if (shell.current) {
      shell.current.visible = shatter < 0.05
      // with the camera within ~4 m (pressed in close in the fight) the shape goes thin, so it never hides Kai
      const cd = state.camera.position.distanceTo(_cv.set(s.pos.x, 1.6, s.pos.z)), thin = cd < 4 ? 0.28 + 0.6 * Math.max(0, (cd - 2.5) / 1.5) : 1
      shell.current.children.forEach((c) => { if (!c.material) return; c.material.emissiveIntensity = glow; if (c.material.userData.op === undefined) c.material.userData.op = c.material.opacity; c.material.opacity = c.material.userData.op * Math.min(1, thin); c.material.transparent = true; c.material.depthWrite = thin >= 1 })
    }
    bits.current.forEach((b, k) => {
      if (!b) return
      b.visible = shatter > 0 && shatter < 1.6
      if (!b.visible) return
      const a = (k / bits.current.length) * Math.PI * 2, u = shatter * 5
      b.position.set(Math.sin(a) * u, 1.4 + Math.cos(k * 1.7) * 0.8 + shatter * 1.5, Math.cos(a) * u)
      b.rotation.set(shatter * 6 + k, shatter * 4, 0)
      b.material.opacity = Math.max(0, 0.9 - shatter * 0.6)
    })
    // his true form shows once the shape is gone; `fade` lets him go, up into the starlight
    if (mal.current) {
      mal.current.visible = s.mode === 'gone'
      if (fade) { s.fadeT = (s.fadeT || 0) + rawDt; const f = Math.max(0.001, 1 - s.fadeT * 0.7); mal.current.scale.setScalar(1.25 * f); mal.current.position.y = s.fadeT * 1.2 }
      else mal.current.scale.setScalar(1.25)
    }
    // the spark in his chest; Pi's pairing turns it from violet to a calm white-gold, and it stops pulsing
    if (spark.current) {
      if (paired) s.pairT = Math.min(1, (s.pairT || 0) + rawDt * 0.5)
      const pt = s.pairT || 0
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.15 * (1 - pt)
      spark.current.position.set(s.pos.x - center[0] + Math.sin(s.face) * 0.42, SPARK_Y + (s.mode === 'gone' ? 0.4 : 0.35 + lift), s.pos.z - center[2] + Math.cos(s.face) * 0.42)
      const f = fade ? Math.max(0, 1 - (s.fadeT || 0) * 0.7) : 1
      spark.current.scale.setScalar((s.mode === 'gone' ? 1.5 : 1) * pulse * (1 - pt * 0.4) * Math.max(0.01, f))
      spark.current.visible = f > 0.02
      if (sparkMat.current) sparkMat.current.color.set('#a040ff').lerp(new THREE.Color('#ffe6a8'), pt)
      if (sparkLight.current) { sparkLight.current.color.set('#c070ff').lerp(new THREE.Color('#ffe0a0'), pt); sparkLight.current.intensity = 8 - pt * 5 }
      if (world.sorcSpark) world.sorcSpark.set(spark.current.position.x + center[0], spark.current.position.y, spark.current.position.z + center[2])
    }
  })
  const live = active && !gone
  const col = SHELL[Math.min(round, SHELL.length - 1)]
  return (
    <group position={center}>
      <group ref={g}>
        {/* the false shape: a faceted, glassy figure of light, hiding him */}
        <group ref={shell}>
          <mesh position={[0, 1.25, 0]} castShadow><coneGeometry args={[0.95, 2.5, 7, 1, true]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.6} transparent opacity={0.82} flatShading side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 2.62, 0]} castShadow><icosahedronGeometry args={[0.42, 0]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.6} transparent opacity={0.85} flatShading /></mesh>
          {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.62, 2.05, 0]} rotation={[0, 0, sd * -0.9]}><coneGeometry args={[0.16, 0.9, 5]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.6} transparent opacity={0.85} flatShading /></mesh>)}
          <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.78, 0.04, 6, 20]} /><meshStandardMaterial color="#ffffff" emissive={col} emissiveIntensity={1.2} /></mesh>
        </group>
        <group ref={mal} visible={false}><Malradix staffGlow={paired ? 0.25 : 1} /></group>
        <pointLight position={[0, 2.2, 1]} color={gone ? '#c79bff' : col} intensity={4} distance={9} />
        {live && (
          <Tag position={[0, 4.1, 0]} df={12} far={40}>
            <span style={{ display: 'block', whiteSpace: 'normal', width: 'max-content', maxWidth: 230, textAlign: 'center', lineHeight: 1.25 }}>{NAME}<br />{ev.m1 && ev.m2 && ev.ir ? 'E: name him' : 'weigh him · the Lens'}</span>
          </Tag>
        )}
      </group>
      {Array.from({ length: 10 }).map((_, k) => <mesh key={k} ref={(r) => (bits.current[k] = r)} visible={false}><octahedronGeometry args={[0.22, 0]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={1} transparent opacity={0.9} flatShading /></mesh>)}
      <group ref={spark}>
        <mesh renderOrder={3}><sphereGeometry args={[0.2, 14, 10]} /><meshBasicMaterial color="#f4e0ff" toneMapped={false} /></mesh>
        <mesh renderOrder={3}><sphereGeometry args={[0.3, 14, 10]} /><meshBasicMaterial ref={sparkMat} color="#a040ff" transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh>
        <pointLight ref={sparkLight} color="#c070ff" intensity={8} distance={8} />
      </group>
      <mesh ref={ringM} visible={false} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.96, 1.0, 64]} /><meshBasicMaterial color="#d8c8ff" transparent opacity={0.7} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      {live && [0, 1].map((k) => { const [x, z] = cAt(k); const lit = k ? ev.m2 : ev.m1; return (
        <group key={k} position={[x - center[0], 0, z - center[2]]}>
          <mesh position={[0, 0.12, 0]} receiveShadow><cylinderGeometry args={[1.0, 1.1, 0.24, 10]} /><meshStandardMaterial color="#5a5e74" roughness={0.85} flatShading /></mesh>
          <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.55, 0.75, 0.8, 8]} /><meshStandardMaterial color="#8a8ea4" roughness={0.7} flatShading /></mesh>
          <mesh position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.6, 0.05, 6, 20]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 1.9, 0]} castShadow><octahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color={lit ? '#ffe8a0' : '#9ab0c8'} emissive={lit ? '#c8a040' : '#2a3a4a'} emissiveIntensity={0.8} flatShading /></mesh>
          <Tag position={[0, 3.1, 0]} df={10} far={36}>{k ? C2_NAME[V.c2] : 'the weighing crystal'}</Tag>
        </group>
      ) })}
    </group>
  )
}
