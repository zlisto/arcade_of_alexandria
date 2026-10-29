import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, setState, getState, saveGame, enemiesPaused } from '../engine/store'
import { CHAMP_ROUNDS, CHAMP_N, champValid, champDraw, champSwap, UMB_MISS, shuffled, readMs } from '../chem/rules11'
import { BANNERS, BANNER_CLOTH } from '../data/dungeon11'

// World 11's people and creatures, built in Blender (tools/walden_blender.py → public/models/walden.glb):
// • Sage Walden (assets/characters/sage-walden.png).
// • Tosylate Ghouls (§11.1–11.2): a tosylate is as good a leaving group as a halide. Struck from behind (the side
//   opposite its sigil, like an SN2 nucleophile), a ghoul simply leaves; from the front its sigil parries the blow
//   and it reels for a moment, long enough to circle round it.
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

/**
 * Tosylate Ghouls. They stay in their room (x ±xMax, inside the zone, never within reach of the room's checkpoint),
 * keep apart, and claw one at a time. On entry they hold off in turn (once per visit); after a knockout each backs
 * 3 m toward home and holds ~2.5 s.
 */
export function Ghouls({ world, spawns, active = true, zone, xMax = 9, onCleared }) {
  const gs = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), home: new THREE.Vector3(x, 0, z), face: Math.PI, state: 'idle', t: Math.random() * 2, cd: 2 + i })))
  const refs = useRef([])
  const cleared = useRef(false)
  const ko = useRef(null), wasIn = useRef(false), entered = useRef(false)
  // per mount, so a second visit hears the hints again; a flag sets only when its toast actually showed
  const told = useRef({ back: false, front: false }).current
  useEffect(() => {
    if (!active) return
    const ids = gs.current.map((m) => world.addTarget({
      pos: () => [m.pos.x, 1.2, m.pos.z], radius: 0.7, tall: 1.8, alive: () => m.state !== 'dead' && m.state !== 'gone',
      onHit: () => {
        const p = world.player
        const dx = p.pos.x - m.pos.x, dz = p.pos.z - m.pos.z, l = Math.hypot(dx, dz) || 1
        const front = (dx * Math.sin(m.face) + dz * Math.cos(m.face)) / l
        // only a blow from behind lands; the front and sides are parried by its sigil, and it reels ~0.9 s
        if (front < -0.3) { sfx('hit'); m.state = 'dead'; m.t = 0; sfx('pair'); if (!told.back) { const t = 'From behind, it just… leaves. A tosylate is as good a leaving group as a halide.'; told.back = toast(t, 'good', readMs(t), true) } return true }
        sfx('block')
        // it reels only if it isn't reeling already and its 2 s parry cooldown has run out, so it can't be stun-locked
        if (m.state !== 'stagger' && !(m.pcd > 0)) { m.state = 'stagger'; m.t = 0; m.hit = false; m.pcd = 2.0 }
        if (!told.front) { const t = 'Its sigil parries the blow, and it reels. Something leaves more easily from the other side…'; told.front = toast(t, 'warn', readMs(t), true) }
        return true
      },
    }))
    return () => ids.forEach((i) => world.remove(i))
  }, [active])
  useFrame((_, rawDt) => {
    if (!active) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    const kn = world.knockouts || 0
    if (ko.current === null) ko.current = kn
    const inRoom = !!p && (!zone || (p.pos.z < zone[0] && p.pos.z > zone[1]))
    if (kn !== ko.current || (inRoom && !wasIn.current && !entered.current)) {
      const knocked = kn !== ko.current
      ko.current = kn
      if (!knocked) entered.current = true // stepping out and back in doesn't renew the hold; a knockout does
      for (const m of gs.current) {
        if (m.state === 'dead' || m.state === 'gone') continue
        m.cd = Math.max(m.cd, knocked ? 2.5 : 2.5 + m.i * 1.5)
        if (m.state === 'claw') { m.state = 'idle'; m.hit = false }
        if (knocked) { const hx = m.home.x - m.pos.x, hz = m.home.z - m.pos.z, hd = Math.hypot(hx, hz); if (hd > 0.01) { const k = Math.min(3, hd) / hd; m.pos.x += hx * k; m.pos.z += hz * k } }
      }
    }
    wasIn.current = inRoom
    let alive = 0
    for (const m of gs.current) {
      const g = refs.current[m.i]
      if (!g) continue
      m.t += dt
      m.pcd = Math.max(0, (m.pcd || 0) - dt)
      if (m.state === 'gone') { g.visible = false; continue }
      if (m.state === 'dead') { g.scale.setScalar(Math.max(0.01, 1 - m.t * 2)); if (m.t > 0.5) m.state = 'gone'; continue }
      alive++
      if (inRoom) {
        const want = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        let d = want - m.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
        // a reeling ghoul can't turn: that's the moment to get behind it
        if (m.state !== 'stagger') m.face += Math.sign(d) * Math.min(Math.abs(d), dt * 1.8)
        const dist = Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z)
        if (m.state === 'idle' && dist > 1.8) { m.pos.x += Math.sin(m.face) * dt * 1.6; m.pos.z += Math.cos(m.face) * dt * 1.6 }
        m.cd -= dt
        // one claw at a time
        if (m.state === 'idle' && dist < 2.0 && m.cd <= 0 && !gs.current.some((o) => o !== m && o.state === 'claw')) { m.state = 'claw'; m.t = 0 }
        if (m.state === 'claw' && m.t > 0.45 && !m.hit) { m.hit = true; if (dist < 2.2 && !p.rolling) p.hurt(1, [m.pos.x, 0, m.pos.z]) }
        if (m.state === 'claw' && m.t > 0.9) { m.state = 'idle'; m.hit = false; m.cd = 2.2 }
      }
      if (m.state === 'stagger' && m.t > 0.9) { m.state = 'idle'; m.cd = Math.max(m.cd, 0.6) }
      // keep apart, and inside the room (2.5 m short of its entrance edge, where the checkpoint is)
      for (const o of gs.current) {
        if (o === m || o.state === 'dead' || o.state === 'gone') continue
        const dx = m.pos.x - o.pos.x, dz = m.pos.z - o.pos.z, dd = Math.hypot(dx, dz)
        if (dd > 0.01 && dd < 1.8) { m.pos.x += (dx / dd) * (1.8 - dd) * 0.5; m.pos.z += (dz / dd) * (1.8 - dd) * 0.5 }
      }
      m.pos.x = Math.max(-xMax, Math.min(xMax, m.pos.x))
      if (zone) m.pos.z = Math.min(zone[0] - 5, Math.max(zone[1] + 1.5, m.pos.z))
      g.position.set(m.pos.x, 0, m.pos.z)
      g.rotation.y = m.face
    }
    if (alive === 0 && !cleared.current && gs.current.every((m) => m.state === 'gone' || m.state === 'dead')) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return <group>{spawns.map((_, i) => <group key={i} ref={(r) => (refs.current[i] = r)}><Part model="walden" name="gho_body" /><GhoulSigil /><pointLight position={[0, 1.2, 0.5]} color="#ffe04a" intensity={1.2} distance={3} /></group>)}</group>
}

/** the ghouls' glowing yellow wheel on the chest (the concept art's sigil), bright enough to read at play distance */
function GhoulSigil() {
  return (
    <group position={[0, 1.2, 0.4]}>
      <mesh><torusGeometry args={[0.16, 0.035, 8, 20]} /><meshBasicMaterial color="#ffe04a" toneMapped={false} /></mesh>
      {[0, 1, 2].map((k) => <mesh key={k} rotation={[0, 0, (k * Math.PI) / 3]}><boxGeometry args={[0.3, 0.03, 0.02]} /><meshBasicMaterial color="#ffe04a" toneMapped={false} /></mesh>)}
    </group>
  )
}

const NAME = 'The Five-Stanced Champion'
const SPARK_Y = 1.7 // Malradix's spark rides in its chest (below the head, so the face shows)
const bannerAngle = (k) => Math.PI * (1.25 + 0.5 * (k / 4)) // all five fit a portrait view from the fight camera
// a condition line broken only between its parts (" · "), never inside a compound name
const nwParts = (t) => String(t).split(' · ').map((p, i) => <span key={i}>{i ? ' · ' : ''}<span style={{ whiteSpace: 'nowrap' }}>{p}</span></span>)
/**
 * The boss: four rounds drawn once per fight from the rules11 CHAMP_ROUNDS pool (mechanisms may repeat; at least
 * three distinct), saved (t11champSeq) with the won-round count (t11champRound); both clear on the win. Each round the banners show one of the book's sets of
 * conditions; strike the banner of the mechanism that will happen, at shuffled spots. A right call names only the
 * stance; the exploit is the player's to work out:
 *   SN2: it keeps its leaving group turned toward Kai (turning ~1.2 rad/s): the Umbrella from its back. SN1: it holds
 *   still until its leaving group drops, then strike the cation. E2: it winds up and lunges, and its sweep ring
 *   hurts where the ring is: roll through it, then strike.
 * While Kai reads the banners it stomps every ~7 s (a ring out to the arena walls, rollable), and it walks back to
 * its centre spot after every lunge. A wrong banner costs half a heart and swaps in a round of a different
 * mechanism, at random (the missed round re-rolls its variant; new banner spots). A knockout restarts only the current round, after ~2.5 s of grace.
 */
const N_ROUNDS = CHAMP_N
const RING_R = (t, max = 7) => Math.min(max, 0.75 * (1 + t * 16)) // the sweep ring's radius, t s after it starts
const STOMP_R = 24 // the reading stomp's ring runs out to the arena's far corners (22–24 m), so idling anywhere isn't free
// a fresh variant for round i, different from `cur` when the round has more than one
const reroll = (i, cur) => { const n = CHAMP_ROUNDS[i].variants.length; if (n < 2) return cur; let x = cur; while (x === cur) x = Math.floor(Math.random() * n); return x }
export default function Champion({ world, center, R = 11, active, onDefeated }) {
  const [round, setRound] = useState(() => Math.min(N_ROUNDS - 1, Math.max(0, getState().save.t11champRound || 0)))
  // the fight's round order: saved, so a Continue mid-fight resumes the same order
  const [seq, setSeq] = useState(() => { const q = getState().save.t11champSeq; return champValid(q) ? q : champDraw() })
  useEffect(() => { if (!champValid(getState().save.t11champSeq)) saveGame({ t11champSeq: seq }) }, [])
  const [vars, setVars] = useState(() => CHAMP_ROUNDS.map((r) => Math.floor(Math.random() * r.variants.length)))
  const [order, setOrder] = useState(() => shuffled(BANNERS))
  const [stance, setStance] = useState(null)
  const [gone, setGone] = useState(false)
  const st = useRef({ mode: 'read', t: 0, pos: new THREE.Vector3(center[0], 0, center[2]), face: 0, open: false, grace: 0 })
  const g = useRef(), sweep = useRef(), spark = useRef(), lg = useRef()
  const ko = useRef(null)
  const ri = seq[Math.min(round, N_ROUNDS - 1)]
  const RD = CHAMP_ROUNDS[ri]
  const V = RD.variants[vars[ri]]
  const bannerPos = (k) => { const a = bannerAngle(k); return [center[0] + Math.cos(a) * R, center[2] + Math.sin(a) * R] }
  // the spark's world position is shared so the scene can frame it in the intro and follow it on defeat
  useEffect(() => { world.champSpark = new THREE.Vector3(center[0], SPARK_Y, center[2]); world.champPos = st.current.pos; world.champSparkGone = false; return () => { world.champSpark = null; world.champPos = null; world.champSparkGone = false } }, [world])

  useEffect(() => {
    if (!active) return
    const s = st.current
    setState({ bossHp: { name: NAME, hp: N_ROUNDS - round, max: N_ROUNDS }, objective: `Round ${round + 1} of ${N_ROUNDS} · ${V.cond} · which mechanism?` })
    world.bossCam = true
    // a new round starts in its reading pose; a variant swap inside a round keeps the punish swing playing
    if (s.mode !== 'gone' && s.lastRound !== round) { s.lastRound = round; s.mode = 'read'; s.t = 0; s.open = false; s.stompT = 0; setStance(null) }
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), champ: s, champRound: () => round, champVariant: () => V, champOrder: () => order, champSeq: () => seq, champMech: () => RD.mech }
    const hurtKai = () => { const p = world.player; if (p) setTimeout(() => p.hurt(1, [s.pos.x, 0, s.pos.z], true), 50) }
    const ids = order.map((b, k) => world.addTarget({
      pos: () => { const [x, z] = bannerPos(k); return [x, 2.0, z] }, radius: 0.9, tall: 2.6, alive: () => st.current.mode === 'read',
      onHit: () => {
        if (RD.accept.includes(b)) {
          sfx('right'); s.mode = 'stance'; s.t = 0; s.open = false; s.swept = false; s.call = b; s.lunge = null; setStance(RD.mech)
          const p0 = world.player
          if (p0) s.face = Math.atan2(p0.pos.x - s.pos.x, p0.pos.z - s.pos.z) // its leaving-group side, toward Kai
          toast(RD.tell, 'good', readMs(RD.tell))
          return true
        }
        // a wrong call: half a heart, and new conditions at new banner spots. A round of a different mechanism, picked
        // at random from the pool (never a won one), takes this one's place, so a miss rules no banner out, the last
        // round included. Only the outgoing round re-rolls its variant (the player has seen it); the incoming keeps its
        // own. Only when no swap keeps every mechanism in the fight (the last round, when the won rounds lack its
        // mechanism) does the round stay, under a different round or variant of the same mechanism
        sfx('wrong'); s.mode = 'punish'; s.t = 0; world.shake = 0.35
        hurtKai()
        const m = `Not ${b}. ${RD.miss[b] || 'Not under these conditions.'} It shifts its footing: new conditions.`
        toast(m, 'warn', readMs(m))
        let n = champSwap(seq, round)
        if (!n) { // same mechanism: another unused round of it when there is one, else the same round's other variant
          const same = CHAMP_ROUNDS.map((_, i) => i).filter((i) => i !== ri && CHAMP_ROUNDS[i].mech === RD.mech && !seq.includes(i))
          if (same.length) { n = [...seq]; n[round] = same[Math.floor(Math.random() * same.length)] }
        }
        if (n) { setSeq(n); saveGame({ t11champSeq: n }) }
        setVars((v) => v.map((x, i) => (i === ri ? reroll(i, x) : x)))
        setOrder((o) => { let n = o; while (n.join() === o.join()) n = shuffled(o); return n })
        return true
      },
    }))
    ids.push(world.addTarget({
      pos: () => [s.pos.x, 1.8, s.pos.z], radius: 1.1, tall: 3, alive: () => s.mode !== 'gone',
      onHit: () => {
        if (s.mode === 'read' || s.mode === 'punish') { sfx('block'); if (!s.toldRead || world.time - s.toldRead > 8) { s.toldRead = world.time; toast('It parries. Read the conditions and strike a banner first.', 'info', 3600, true) } return false }
        if (s.mode !== 'stance') return false
        if (RD.mech === 'SN2') { sfx('block'); if (!s.toldBlade || world.time - s.toldBlade > 8) { s.toldBlade = world.time; const m = `A blade won’t do it. ${RD.how}`; toast(m, 'warn', readMs(m), true) } return false }
        if (!s.open) {
          sfx('block'); hurtKai()
          const m = RD.mech === 'SN1' ? `Too soon! It still holds its leaving group. ${s.call || 'SN1'} waits for it to leave first.` : `Too soon! ${RD.how}`
          toast(m, 'warn', readMs(m))
          return false
        }
        land(); return true
      },
    }))
    // the Umbrella is offered in every stance, so its prompt never says which stance wants it
    ids.push(world.addLantern({ needs: 'hasUmbrella', omni: true, priority: 1, pos: () => [s.pos.x, 0, s.pos.z], radius: 3.5, label: () => (s.mode === 'stance' ? 'Attack with the Umbrella' : null), onLantern: () => {
      if (s.mode !== 'stance') return
      if (RD.mech !== 'SN2') { sfx('block'); hurtKai(); const m = UMB_MISS[RD.mech]; toast(m, 'warn', readMs(m)); return }
      const p = world.player
      const dx = p.pos.x - s.pos.x, dz = p.pos.z - s.pos.z, l = Math.hypot(dx, dz) || 1
      const front = (dx * Math.sin(s.face) + dz * Math.cos(s.face)) / l
      if (front > -0.5) { sfx('block'); hurtKai(); const m = 'It bounces off its leaving group. An SN2 nucleophile comes in from the opposite side.'; toast(m, 'warn', readMs(m)); return }
      land()
    } }))
    return () => { ids.forEach((i) => world.remove(i)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round, order, vars, seq])

  // a knockout restarts the current round (won rounds stay won), with ~2.5 s of grace before it can sweep again
  useEffect(() => {
    if (!active) return
    if (ko.current === null) ko.current = world.knockouts || 0
    const t = setInterval(() => {
      const n = world.knockouts || 0
      if (n === ko.current) return
      ko.current = n
      const s = st.current
      if (s.mode === 'gone') return
      s.mode = 'read'; s.t = 0; s.open = false; s.swept = false; s.lunge = null; s.stompT = 0; s.stomp = null; s.grace = 2.5; setStance(null)
      setOrder((o) => shuffled(o))
      setTimeout(() => toast('While you were down, it squared up again. This round starts over.', 'warn', 4200), 600)
    }, 250)
    return () => clearInterval(t)
  }, [active, round])

  const land = () => {
    const s = st.current
    sfx('hit'); world.shake = 0.4
    const next = round + 1
    setState({ bossHp: { name: NAME, hp: N_ROUNDS - next, max: N_ROUNDS } })
    if (next >= N_ROUNDS) { saveGame({ t11champRound: 0, t11champSeq: null }); s.mode = 'gone'; s.t = 0; s.sparkT = 0; s.fadeT = 0; setGone(true); setStance(null); setTimeout(() => onDefeated && onDefeated(), 400); return }
    saveGame({ t11champRound: next })
    s.mode = 'pause'; s.t = 0; s.open = false; setStance(null)
    toast('A clean hit! The banners change. New conditions!', 'good', 3200)
    setTimeout(() => setRound(next), 1600)
  }

  useFrame((state, rawDt) => {
    if (!active || !g.current) return
    const dt = enemiesPaused() ? 0 : Math.min(rawDt, 1 / 30)
    const s = st.current
    s.t += s.mode === 'gone' ? rawDt : dt // the defeat plays out during Pi's line, which pauses enemies
    s.grace = Math.max(0, s.grace - dt)
    const p = world.player
    const pd = p ? Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) : 99
    // turn toward Kai at most `rate` rad/s
    const turn = (rate) => { if (!p) return; let d = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z) - s.face; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; s.face += Math.sign(d) * Math.min(Math.abs(d), rate * dt) }
    // a ring sweeps out from the Champion: it hurts only where the ring is (|dist − r| < 0.7), and a roll goes through it
    const ring = (t0, max = 7, dur = 0.6) => {
      const tt = s.t - t0
      if (sweep.current) { sweep.current.visible = tt >= 0 && tt < dur; sweep.current.position.set(s.pos.x - center[0], 0.1, s.pos.z - center[2]); sweep.current.scale.setScalar(RING_R(Math.max(0, tt), max) / 0.75) }
      if (tt >= 0 && tt < dur && !s.swept && s.grace <= 0 && p && !p.rolling && Math.abs(pd - RING_R(tt, max)) < 0.7) { s.swept = true; p.hurt(1, [s.pos.x, 0, s.pos.z]); return 'hit' }
      return tt >= dur ? 'done' : null
    }
    // out of a stance (reading, punishing, between rounds) it walks back to its centre spot, ~1 s after a lunge
    // and on defeat it slides back there as it sinks (real time: Pi's line pauses enemies), so the defeat shot,
    // framed on the centre, holds it wherever the last hit landed
    if (s.mode === 'read' || s.mode === 'punish' || s.mode === 'pause' || s.mode === 'gone') {
      const hx = center[0] - s.pos.x, hz = center[2] - s.pos.z, hd = Math.hypot(hx, hz)
      if (hd > 0.02) { const k = Math.min(1, (s.mode === 'gone' ? rawDt : dt) * 3.5); s.pos.x += hx * k; s.pos.z += hz * k } else { s.pos.x = center[0]; s.pos.z = center[2] }
    }
    if (s.mode === 'read') {
      turn(3)
      // a slow, rollable stomp every ~7 s while Kai reads the banners: a 0.8 s wind-up (it rears back), then a ring
      // that runs out to the arena corners over 1.95 s (the sweep's speed), so it reaches Kai wherever he stands
      s.stompT = (s.stompT || 0) + dt
      if (!s.stomp && s.stompT > 7 && s.grace <= 0) { s.stomp = { t: s.t }; s.swept = false }
      if (s.stomp) {
        const w = s.t - s.stomp.t
        if (w < 0.8) { s.tilt = -0.22 * Math.min(1, w / 0.4); if (sweep.current) sweep.current.visible = false }
        else {
          s.tilt = 0
          if (!s.stomp.sfx) { s.stomp.sfx = true; sfx('stomp') }
          if (ring(s.stomp.t + 0.8, STOMP_R, 1.95) === 'done') { s.stomp = null; s.stompT = 0; s.swept = false }
        }
      } else if (sweep.current) sweep.current.visible = false
    } else if (s.mode === 'punish') turn(3)
    if (s.mode !== 'read' && s.stomp) { s.stomp = null; s.stompT = 0 }
    if (s.mode === 'stance') {
      // SN2: it keeps its leaving group turned toward Kai, but turns slower than Kai can circle
      if (RD.mech === 'SN2') { turn(1.2); if (s.t > 14) { s.mode = 'read'; setStance(null); toast('It squares up again. Read the banners.', 'warn', 3200, true) } }
      if (RD.mech === 'SN1') {
        s.open = s.t > 2.5 && s.t < 7
        if (s.t > 2.5 && !s.toldIon) { s.toldIon = true; toast('Its leaving group drops away: a flat carbocation. Now!', 'good', 3200) }
        if (s.t > 7) { s.mode = 'read'; s.toldIon = false; s.open = false; setStance(null); toast('The cation picks its leaving group back up. Read the banners.', 'warn', 3600, true) }
      }
      if (RD.mech === 'E2') {
        // wind-up 0–0.4 s (it rears back and turns to Kai), lunge 0.4–1.0 s (up to 5 m, stopping ~2.5 m short of
        // Kai), then the ring from where it landed, 1.0–1.6 s. Standing still, the ring finds Kai; a roll goes
        // through it. A hit means it winds up again; a clean dodge leaves it open until 4.6 s
        if (s.t < 1.0 && sweep.current) sweep.current.visible = false
        if (s.t < 0.4) { turn(4); s.tilt = -0.25 * (s.t / 0.4) }
        else if (s.t < 1.0) {
          if (!s.lunge) { const dx = p ? p.pos.x - s.pos.x : 0, dz = p ? p.pos.z - s.pos.z : 0, l = Math.hypot(dx, dz) || 1; const go = Math.max(0, Math.min(5, l - 2.5)); s.lunge = { x0: s.pos.x, z0: s.pos.z, x1: s.pos.x + (dx / l) * go, z1: s.pos.z + (dz / l) * go } }
          const k = Math.min(1, (s.t - 0.4) / 0.6), e = 1 - (1 - k) * (1 - k)
          let nx = s.lunge.x0 + (s.lunge.x1 - s.lunge.x0) * e, nz = s.lunge.z0 + (s.lunge.z1 - s.lunge.z0) * e
          const cx = nx - center[0], cz = nz - center[2], cl = Math.hypot(cx, cz), lim = R - 2 // stays inside the banner ring
          if (cl > lim) { nx = center[0] + (cx / cl) * lim; nz = center[2] + (cz / cl) * lim }
          s.pos.x = nx; s.pos.z = nz; s.tilt = 0.3 * Math.sin(k * Math.PI)
        } else {
          s.tilt = 0
          if (!s.stompSfx) { s.stompSfx = true; sfx('stomp'); world.shake = 0.25 }
          const r = ring(1.0)
          if (r === 'hit') { s.t = 0; s.lunge = null; s.swept = false; s.stompSfx = false; s.open = false; const m = 'Caught in the sweep! It winds up again.'; toast(m, 'warn', readMs(m), true) }
          else s.open = s.t > 1.6 && s.t < 4.6
        }
        if (s.t > 4.6) { s.mode = 'read'; s.swept = false; s.open = false; s.lunge = null; s.stompSfx = false; setStance(null); toast('It squares up again. Read the banners.', 'warn', 3200, true) }
      }
    }
    if (s.mode === 'punish') {
      if (sweep.current) { sweep.current.visible = s.t < 0.5; sweep.current.position.set(s.pos.x - center[0], 0.1, s.pos.z - center[2]); sweep.current.scale.setScalar(1 + s.t * 16) }
      if (s.t > 1.2) { s.mode = 'read'; s.stompT = 0 }
    }
    if (s.mode !== 'stance' && !s.stomp) s.tilt = 0
    if (s.mode === 'stance' && RD.mech !== 'E2' && sweep.current) sweep.current.visible = false
    if (s.mode === 'pause' || s.mode === 'gone') { if (sweep.current) sweep.current.visible = false }
    g.current.position.set(s.pos.x - center[0], s.mode === 'gone' ? -Math.min(1.2, s.t * 0.8) : 0, s.pos.z - center[2])
    g.current.rotation.y = s.face
    g.current.rotation.x = s.open ? 0.15 : s.mode === 'gone' ? Math.min(0.5, s.t * 0.4) : (s.tilt || 0)
    // its leaving group (the shield) drops while the SN1 cation stands open
    if (lg.current) lg.current.position.y = s.open && RD.mech === 'SN1' ? 0.25 : 1.7
    // the spark rides in its chest; on defeat it tears free and flies east (+x), toward the Summit of Light, stops at
    // the east wall's top (x 12.8) and hovers there on camera until Pi's line is closed, then fades
    if (spark.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.15
      if (s.mode !== 'gone') {
        spark.current.position.set(s.pos.x - center[0] + Math.sin(s.face) * 0.55, SPARK_Y, s.pos.z - center[2] + Math.cos(s.face) * 0.55)
        spark.current.scale.setScalar(pulse); spark.current.visible = true
      } else {
        s.sparkT = (s.sparkT || 0) + rawDt
        const k = Math.min(1, s.sparkT * 2)
        spark.current.position.x = Math.min(12.8, spark.current.position.x + rawDt * 3.6 * k)
        spark.current.position.y = Math.min(6.4, spark.current.position.y + rawDt * 1.4 * k)
        if (world.champSparkGone) s.fadeT = (s.fadeT || 0) + rawDt
        const f = Math.max(0, 1 - (s.fadeT || 0) * 2)
        spark.current.scale.setScalar(1.8 * pulse * Math.max(0.01, f)); spark.current.visible = f > 0
      }
      if (world.champSpark) world.champSpark.set(spark.current.position.x + center[0], spark.current.position.y, spark.current.position.z + center[2])
    }
  })
  const live = active && !gone
  return (
    <group position={center}>
      <group ref={g}>
        <Part model="walden" name="chp_body" />
        <group ref={lg} position={[-0.7, 1.7, 0.4]} rotation={[0, -0.3, 0]}><Part model="walden" name="chp_shield" /></group>
        <pointLight position={[0, 2.6, 1]} color="#ff8a5a" intensity={3} distance={8} />
        {live && (
          <Tag position={[0, 5.0, 0]} df={12} far={40}> {/* high enough to clear the banner tags behind it */}
            <span style={{ display: 'block', whiteSpace: 'normal', width: 'max-content', maxWidth: 250, textAlign: 'center', lineHeight: 1.25 }}>{nwParts(V.cond)}<br />{stance ? `stance: ${stance}` : 'which mechanism?'}</span>
          </Tag>
        )}
      </group>
      <group ref={spark} visible={false}>
        <mesh><sphereGeometry args={[0.24, 14, 10]} /><meshBasicMaterial color="#f4e0ff" toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.34, 14, 10]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.45, 14, 10]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.18} depthWrite={false} toneMapped={false} /></mesh>
        <pointLight color="#c070ff" intensity={8} distance={9} />
      </group>
      <mesh ref={sweep} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}><ringGeometry args={[0.6, 0.75, 32]} /><meshBasicMaterial color="#ff6a3a" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      {live && order.map((b, k) => {
        const [x, z] = bannerPos(k)
        const lx = x - center[0], lz = z - center[2]
        return (
          <group key={b} position={[lx, 0, lz]} rotation={[0, Math.atan2(-lx, -lz), 0]}>
            <Part model="wastes" name="a11_gate" scale={0.6} />
            {/* a standard: an iron pole and crossbar, a cloth with a gold hem, and a finial */}
            <mesh position={[0, 2.9, -0.12]} castShadow><cylinderGeometry args={[0.05, 0.06, 3.4, 8]} /><meshStandardMaterial color="#2a2426" metalness={0.6} roughness={0.45} /></mesh>
            <mesh position={[0, 4.55, -0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 1.2, 6]} /><meshStandardMaterial color="#2a2426" metalness={0.6} roughness={0.45} /></mesh>
            <mesh position={[0, 4.75, -0.12]}><coneGeometry args={[0.09, 0.3, 6]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.3} /></mesh>
            <mesh position={[0, 3.65, -0.06]}><planeGeometry args={[1.0, 1.75]} /><meshStandardMaterial color={BANNER_CLOTH} emissive={BANNER_CLOTH} emissiveIntensity={0.25} roughness={0.85} side={THREE.DoubleSide} /></mesh>
            <mesh position={[0, 2.76, -0.05]}><planeGeometry args={[1.0, 0.07]} /><meshStandardMaterial color="#c8a050" metalness={0.6} roughness={0.4} side={THREE.DoubleSide} /></mesh>
            <Tag position={[0, 3.7, 0.1]} df={11} far={30}>{b}</Tag>
          </group>
        )
      })}
    </group>
  )
}
