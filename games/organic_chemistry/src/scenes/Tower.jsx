import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import { Wisps } from '../actors/PeaksFolk'
import Phantom, { Markov, SkeletonFloor } from '../actors/PlainsFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { CRATES, unsat, crateHint, STATUES7, higherAt, ezOf, rankWhy, STAB, STAB_ORDER, BRIDGES7, protonate, DEG, SHIFTS } from '../chem/rules7'
import { W7 as W, ROOMS7, STATIONS7, CRATE_POS, CRATE_DOOR, STATUE7_POS, EZ_DOOR, WEIGHT_POS, STEP_POS, PIT7, BRIDGE7_Z, ISLANDS7, SKEL_POS, GOALS7, PHANTOM } from '../data/dungeon7'

// Dungeon 7 — The Tower of Addition (Chapter 7, Alkenes: Structure and Reactivity). Each room is a floor.
// Ocarina-style: Dungeon Map, Compass, a small key, the Proton Sling in a big chest, a Boss Key.
// In-world puzzles: degree of unsaturation dials (§7.2); E/Z statues (§7.5); a stability scale (§7.6);
// Markovnikov bridges built with the Proton Sling (§7.7–7.10); catching carbocation shifts (§7.11).

preloadModels('tower', 'markov')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-152, -192] }
const SHOW = {
  b1: ['CH₂=', '=CH–CH₃'], b2: ['CH₂=', '=C(CH₃)₂'], b3: ['ring C2 (=CH–)', 'ring C1 (=C(CH₃)–)'],
  b4: ['ring C2 (=CH–)', 'ring C1 (=C(CH₂CH₃)–)'], b5: ['CH₃–CH= (C2)', '=CH–CH₂CH₃ (C3)'],
}
const skAbs = (id) => { const P = SKEL_POS[id]; return P.pads.map(([x, z]) => [P.origin[0] + x, P.origin[1] + z]) }

function Walls({ world }) {
  const parts = useModelParts('tower')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -150; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -154; z > -190; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -152], [-W, 9, 8]), world.addSolid([W, -9, -152], [W + 2, 9, 8]),
      world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -153], [-W, 9, -151]), world.addSolid([W, -9, -153], [ARENA.x, 9, -151]),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="t7_wall" items={items} />
}

/** something carried over Kai's head (a weight for the scale) */
function Carried({ world, what }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.3 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!what) return null
  const s = STAB.find((x) => x.id === what)
  return (
    <group ref={g}>
      <mesh><boxGeometry args={[0.6, 0.45, 0.45]} /><meshStandardMaterial color="#8a8a96" metalness={0.7} roughness={0.35} /></mesh>
      <Tag position={[0, 0.6, 0]} df={9}>{s.name}</Tag>
    </group>
  )
}

function Shard({ show, pos }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = clock.elapsedTime * 1.5; g.current.position.y = 1.8 + Math.sin(clock.elapsedTime * 2) * 0.2 } })
  if (!show) return null
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <group ref={g}>
        <mesh><cylinderGeometry args={[0.08, 0.08, 1.1, 8]} /><meshStandardMaterial color="#ffe08a" emissive="#ffcf4a" emissiveIntensity={3} toneMapped={false} /></mesh>
        <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.13, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh>
        <mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.13, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0, 2, 0]} color="#ffd76a" intensity={8} distance={12} />
    </group>
  )
}

/** an E/Z statue: a C=C bar with a group at each corner; strike a group to light it */
function Statue({ st, z, lit, done }) {
  const corners = { Ltop: [-1.7, 3.0], Lbot: [-1.7, 1.3], Rtop: [1.7, 3.0], Rbot: [1.7, 1.3] }
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[4.6, 1.0, 1.2]} /><meshStandardMaterial color="#9a8a7a" roughness={0.85} /></mesh>
      {[-0.8, 0.8].map((x) => <mesh key={x} position={[x, 2.15, 0]}><sphereGeometry args={[0.32, 16, 12]} /><meshStandardMaterial color="#3a3640" /></mesh>)}
      {[-0.1, 0.1].map((dy) => <mesh key={dy} position={[0, 2.15 + dy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 1.6, 8]} /><meshStandardMaterial color="#5ff0ff" emissive="#2ab0d0" emissiveIntensity={0.8} /></mesh>)}
      {Object.entries(corners).map(([k, [x, y]]) => {
        const end = k[0], pos = k.slice(1) === 'top' ? 'top' : 'bot'
        const grp = st[end][pos]
        const on = lit && lit[end] === pos
        const cx = end === 'L' ? -0.8 : 0.8
        return (
          <group key={k}>
            <mesh position={[(x + cx) / 2, (y + 2.15) / 2, 0]} rotation={[0, 0, Math.atan2(y - 2.15, x - cx) - Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, Math.hypot(x - cx, y - 2.15), 6]} /><meshStandardMaterial color="#c8c0b0" /></mesh>
            <mesh position={[x, y, 0]}><sphereGeometry args={[grp === 'H' ? 0.2 : 0.32, 14, 10]} /><meshStandardMaterial color={on ? '#ffe070' : '#d8d0c0'} emissive={on ? '#ffb020' : '#000'} emissiveIntensity={on ? 1.6 : 0} /></mesh>
            {on && <pointLight position={[x, y, 0.6]} color="#ffd060" intensity={2} distance={3} />}
            <Tag position={[x + (end === 'L' ? -0.55 : 0.55), y, 0.2]} df={9} far={14}>{grp}</Tag>
          </group>
        )
      })}
      <Tag position={[0, 3.9, 0]} df={10} far={16} className={done ? 'ok-tag' : ''}>{done ? `${st.name}: ${done === 'none' ? 'no E/Z' : done}` : st.name}</Tag>
      {!done && st.id !== 'e5' && <>
        <Tag position={[-3.6, 2.6, 0.6]} df={10} far={12}>E arch</Tag>
        <Tag position={[3.6, 2.6, 0.6]} df={10} far={12}>Z arch</Tag>
      </>}
      {[-3.6, 3.6].map((x) => <group key={x} position={[x, 0, 0.6]}>
        {[-0.7, 0.7].map((dx) => <mesh key={dx} position={[dx, 1.1, 0]}><boxGeometry args={[0.3, 2.2, 0.3]} /><meshStandardMaterial color="#b8a890" /></mesh>)}
        <mesh position={[0, 2.3, 0]}><boxGeometry args={[1.8, 0.3, 0.3]} /><meshStandardMaterial color="#b8a890" /></mesh>
      </group>)}
    </group>
  )
}

function TowerLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [carry, setCarry] = useState(null)
  const carryRef = useRef(null)
  carryRef.current = carry
  const [crypt, setCrypt] = useState({ h: null, m: null }) // the cation's carbon index in each crypt skeleton
  const cryptRef = useRef(crypt)
  cryptRef.current = crypt
  const [markovHere, setMarkovHere] = useState(false)
  const dials = save.t7dials || {}
  const ez = save.t7ez || {}
  const placed = save.t7placed || {}

  useEffect(() => {
    world.map = {
      floor: '#d8c8a8', wall: '#5a4a3a', pit: '#1a140c',
      labels: ROOMS7.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t7-map']) return null; const seen = sv.t7seen || {}; return ROOMS7.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t7-compass']) return null
        const g = GOALS7.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 7) return { pos: [0, -184], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Plains' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('tower')
    world.killY = -8
    const f = [
      world.addFloor(-W, PIT7.z[0], W, 8, 0), world.addFloor(-W, -152, W, PIT7.z[1], 0),
      ...ISLANDS7.map(([a, b]) => world.addFloor(-W, b, W, a, 0)),
      world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -151, 0),
    ]
    const HINTS = {
      '7-1': 'Crates with dials. How many rings and double bonds hide in each formula?',
      '7-2': 'Statues with a double bond. Light the bigger group on each end!',
      '7-3': 'A scale with six steps. Most stable at the top, Markov says.',
      '7-4': 'A pit, and ghost bridges. Each one is a double bond waiting for HX.',
      '7-5': 'Skeletons on the floor. A cation here won’t sit still…',
    }
    const t = ROOMS7.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t7seen || {}
      saveGame({ checkpoint: { scene: 'tower', room: r.id }, t7seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -158], [6, 6, -154], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t7-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Plains', onInteract: () => onExit('plains', { scene: 'plains', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, CRATE_DOOR + 1.3], radius: 2.2, label: () => (has('7-1') ? null : 'Press the door: check the dials'), onInteract: () => checkCrates() }),
      world.addInteractable({ pos: [0, 0, -122.8], radius: 2.2, label: () => (has('t7-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -150.8], radius: 2.4, label: () => (has('t7-bossdoor') ? null : 'Unlock the roof door'), onInteract: () => unlockBossDoor() }),
    ]
    const targets = []
    // 7-1: strike a dial to turn it
    Object.entries(CRATE_POS).forEach(([id, [x, z]]) => {
      targets.push(world.addTarget({ pos: () => [x, 1.0, z + 0.65], radius: 0.6, tall: 1.0, alive: () => !has('7-1'), onHit: () => { const d = getState().save.t7dials || {}; saveGame({ t7dials: { ...d, [id]: ((d[id] || 0) + 1) % 5 } }); sfx('pickup'); return true } }))
    })
    // 7-2: strike a group to light it; call the statue at its arches
    STATUES7.filter((s) => STATUE7_POS[s.id] !== undefined).forEach((s) => {
      const z = STATUE7_POS[s.id]
      ;[['L', 'top', -1.7, 3.0], ['L', 'bot', -1.7, 1.3], ['R', 'top', 1.7, 3.0], ['R', 'bot', 1.7, 1.3]].forEach(([end, pos, x, y]) => {
        targets.push(world.addTarget({ pos: () => [x, y - 0.6, z], radius: 0.55, tall: 1.2, alive: () => !(getState().save.t7ez || {})[s.id]?.done, onHit: () => lightGroup(s, end, pos) }))
      })
      if (s.id !== 'e5') {
        ia.push(world.addInteractable({ pos: [-3.6, 0, z + 0.6], radius: 1.4, label: () => (((getState().save.t7ez || {})[s.id] || {}).done ? null : 'Call it E (opposite sides)'), onInteract: () => callEZ(s, 'E') }))
        ia.push(world.addInteractable({ pos: [3.6, 0, z + 0.6], radius: 1.4, label: () => (((getState().save.t7ez || {})[s.id] || {}).done ? null : 'Call it Z (same side)'), onInteract: () => callEZ(s, 'Z') }))
      }
    })
    // 7-3: pick up a weight; set it on a step
    Object.entries(WEIGHT_POS).forEach(([id, [x, z]]) => {
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.3, label: () => (carryRef.current || (getState().save.t7placed || {})[id] !== undefined ? null : `Pick up: ${STAB.find((s) => s.id === id).name}`), onInteract: () => { if (!carryRef.current) { setCarry(id); sfx('pickup') } } }))
    })
    STEP_POS.forEach(([x, z], k) => {
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.4, label: () => (carryRef.current ? `Set it on step ${k + 1}` : null), onInteract: () => placeWeight(k) }))
    })
    // 7-4: the Proton Sling on each bridge's two carbons
    const lanterns = []
    BRIDGES7.forEach((br) => {
      const [z0] = BRIDGE7_Z[br.id]
      ;['a', 'b'].forEach((on) => {
        lanterns.push(world.addLantern({ needs: 'hasSling', omni: true, pos: [on === 'a' ? -1.6 : 1.6, 0, z0 - 0.3], radius: 3.6, label: () => (has(br.id) ? null : `Sling a proton onto ${SHOW[br.id][on === 'a' ? 0 : 1]}`), onLantern: () => sling(br, on) }))
      })
    })
    // 7-5: sling onto C1 or C2 of each crypt skeleton; plant the chloride on a pad
    SHIFTS.forEach((sk) => {
      const P = skAbs(sk.id)
      ;[0, 1].forEach((i) => lanterns.push(world.addLantern({ needs: 'hasSling', omni: true, pos: [P[i][0], 0, P[i][1]], radius: 3.4, label: () => (has('7-5' + sk.id) || cryptRef.current[sk.id] !== null ? null : `Sling a proton onto ${sk.carbons[i].n}`), onLantern: () => cryptSling(sk, i) })))
      P.forEach(([x, z], i) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.2, label: () => (cryptRef.current[sk.id] === i ? 'Plant the chloride here' : null), onInteract: () => plant(sk, i) })))
    })
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS7.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...targets, ...lanterns].forEach((i) => world.remove(i)) }
  }, [world])

  // the bridges: a floor strip appears when built
  useEffect(() => {
    const ids = BRIDGES7.filter((b) => solved[b.id]).map((b) => { const [a, c] = BRIDGE7_Z[b.id]; return world.addFloor(-2.2, c, 2.2, a, 0) })
    return () => ids.forEach((i) => world.remove(i))
  }, [world, ...BRIDGES7.map((b) => !!solved[b.id])])

  // ---------------------------------------------------------------- actions
  const checkCrates = () => {
    if (has('7-1')) return
    const d = getState().save.t7dials || {}
    const wrong = CRATES.find((c) => (d[c.id] || 0) !== unsat(c))
    if (wrong) { sfx('wrong'); toast(`${wrong.f}: not ${d[wrong.id] || 0}. ${crateHint(wrong, d[wrong.id] || 0)}`, 'warn', 6000); return }
    markSolved('7-1'); sfx('open')
    toast('Every dial right. Each ring or π bond costs a molecule two hydrogens.', 'good', 4400)
  }
  const lightGroup = (s, end, pos) => {
    const all = getState().save.t7ez || {}
    const cur = all[s.id] || {}
    if (cur.done) return false
    const hi = higherAt(s[end])
    if (!hi) {
      // two identical groups on this end: no cis–trans isomer exists
      saveGame({ t7ez: { ...all, [s.id]: { ...cur, done: 'none' } } }); sfx('open')
      toast(rankWhy(s[end], pos) + ' This statue is neither E nor Z.', 'good', 6000)
      setTimeout(checkEZRoom, 100)
      return true
    }
    if (hi !== pos) { sfx('wrong'); toast(rankWhy(s[end], pos), 'warn', 5200); return true }
    saveGame({ t7ez: { ...all, [s.id]: { ...cur, [end]: pos } } }); sfx('pickup')
    return true
  }
  const callEZ = (s, call) => {
    const all = getState().save.t7ez || {}
    const cur = all[s.id] || {}
    if (cur.done) return
    if (!cur.L || !cur.R) { sfx('wrong'); toast('Light the higher group on both ends first. Then look: same side, or opposite?', 'warn', 4000); return }
    const right = ezOf(s)
    if (call !== right) { sfx('wrong'); toast(right === 'Z' ? 'Look again: both lit groups are on the same side (both up, or both down). Together: Z.' : 'Look again: one lit group is up and the other down. Opposite: E.', 'warn', 4600); return }
    saveGame({ t7ez: { ...all, [s.id]: { ...cur, done: call } } }); sfx('right')
    toast(call === 'Z' ? 'Z: zusammen, together. The arch opens.' : 'E: entgegen, opposite. The arch opens.', 'good', 3200)
    setTimeout(checkEZRoom, 100)
  }
  const checkEZRoom = () => {
    const all = getState().save.t7ez || {}
    if (!has('7-2') && Object.keys(STATUE7_POS).every((id) => all[id] && all[id].done)) { markSolved('7-2'); sfx('open'); toast('All four statues called. The way up opens.', 'good', 3200) }
  }
  const placeWeight = (k) => {
    const id = carryRef.current
    if (!id) return
    const s = STAB.find((x) => x.id === id)
    const want = STAB.find((x) => x.id === STAB_ORDER[k])
    if (STAB_ORDER[k] !== id) {
      sfx('wrong'); setCarry(null)
      toast(`Not step ${k + 1}. ${s.name} (${s.kind}) gives off ${-s.dH} kJ/mol when hydrogenated. ${-s.dH > -want.dH ? 'More heat out: less stable, lower down.' : 'Less heat out: more stable, higher up.'}`, 'warn', 6400)
      return
    }
    const next = { ...(getState().save.t7placed || {}), [id]: k }
    saveGame({ t7placed: next }); setCarry(null); sfx('right')
    if (Object.keys(next).length === STAB.length) {
      markSolved('7-3'); sfx('open')
      setTimeout(() => say([
        { who: 'Pi', text: 'More groups on the double bond, the steadier it sits. And trans beats cis!' },
        { who: 'Pi', text: 'A big chest by the stairs!' },
      ]), 400)
    } else toast(`${s.name}: ${-s.dH} kJ/mol out on hydrogenation. Step ${k + 1}.`, 'good', 3000)
  }
  const sling = (br, on) => {
    if (has(br.id)) return
    const order = BRIDGES7.findIndex((b) => b.id === br.id)
    if (order > 0 && !has(BRIDGES7[order - 1].id)) { toast('Build the bridges in order, from the near side.', 'info', 2600); return }
    const r = protonate(br, on)
    sfx('hookFire')
    if (!r.ok) { sfx('wrong'); toast(`H⁺ there leaves a ${DEG[r.deg]} cation on the other carbon. The other way gives a ${DEG[r.alt]} one, more stable. That’s the one that forms.`, 'warn', 6200); return }
    markSolved(br.id); sfx('open')
    const X = br.hx === 'HBr' ? 'Br⁻' : 'Cl⁻'
    toast(br.mixture ? `Both carbons give a secondary cation: neither wins, so you get a mixture. ${X} adds: ${br.product}.` : `H⁺ adds, a ${DEG[r.deg]} cation forms, ${X} adds to it: ${br.product}.`, 'good', 5600)
    if (BRIDGES7.every((b) => b.id === br.id || has(b.id))) { markSolved('7-4'); setTimeout(() => say([{ who: 'Pi', text: 'Every bridge built! The H always went where the H’s already were.' }, { who: 'Pi', text: 'And the + landed on the carbon with more groups. Read that stone.' }]), 900) }
  }
  const cryptSling = (sk, i) => {
    if (has('7-5' + sk.id) || cryptRef.current[sk.id] !== null) return
    sfx('hookFire')
    if (i === 1) { sfx('wrong'); toast('H⁺ on C2 would leave a primary cation on C1. Protonate C1, the end with more H.', 'warn', 4600); return }
    setCrypt((c) => ({ ...c, [sk.id]: 1 }))
    toast(`H⁺ on C1: a secondary cation on C2. Will it stay there?`, 'info', 3600)
    setTimeout(() => {
      if (cryptRef.current[sk.id] !== 1) return
      setCrypt((c) => ({ ...c, [sk.id]: 2 })); sfx('dash')
      toast(sk.kind === 'hydride' ? 'A hydride slid from C3 to C2: the + is now on C3, tertiary!' : 'A methyl slid from C3 to C2: the + is now on C3, tertiary!', 'info', 4200)
      setTimeout(() => { if (cryptRef.current[sk.id] === 2 && !has('7-5' + sk.id)) { setCrypt((c) => ({ ...c, [sk.id]: null })); toast('Too slow: it fell apart. Sling again, and be on the right carbon.', 'warn', 3600) } }, 5000)
    }, 2600)
  }
  const plant = (sk, i) => {
    const at = cryptRef.current[sk.id]
    if (at !== i) return
    setCrypt((c) => ({ ...c, [sk.id]: null }))
    if (i === 1) { sfx('wrong'); toast(`Cl on C2: ${sk.plain}. That forms too, before any shift. But the door wants the product after the shift.`, 'warn', 6000); return }
    markSolved('7-5' + sk.id); sfx('open')
    toast(`Cl on C3, where the charge moved: ${sk.product}.`, 'good', 4600)
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: HX adds to a double bond any which way. Where the H lands is luck.' },
      { who: 'Pi', text: 'Markov laughed at that one.' },
    ])
    markSolved('t7-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t7-door')) return
    if (!getState().save.t7key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t7key: false }); markSolved('t7-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t7-bossdoor')) return
    if (!has('t7-bosskey')) { toast('A heavy trapdoor to the roof. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t7-bossdoor'); sfx('open'); toast('The Boss Key turns. Wind, and violet light, from the roof…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't7-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't7-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't7-key') { saveGame({ t7key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't7-sling') {
      saveGame({ hasSling: true })
      await itemGet(world, { model: 'markov', name: 't7_sling', scale: 2.2, color: '#ff8aa0' }, [
        { who: '', text: 'You got the Proton Sling!' },
        { who: 'Pi', text: 'Aim at a carbon of a double bond and press G. It lands an H⁺ right there.' },
        { who: 'Pi', text: 'Then the + ends up on the other carbon. Pick the end that leaves the steadier one!' },
      ])
    }
    if (id === 't7-bosskey') { saveGame({ t7bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss7') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -156]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t7bossIntro) {
      saveGame({ t7bossIntro: true })
      world.camOverride = { pos: [3, 5, -158], look: [PHANTOM.center[0], 1.5, PHANTOM.center[2]] }
      await say([
        { who: 'Pi', text: 'The Carbocation Phantom! It’s a + charge in a cloak, and the spark’s inside it.' },
        { who: 'Pi', text: 'It sits on a carbon of that skeleton. If a neighbour is steadier, it shifts over.' },
        { who: 'Pi', text: 'Don’t chase it. Get to where it’s going, and be waiting!' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Where will the + end up? Be there first.' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss7')
    playMusic('tower')
    await say([
      { who: 'Pi', text: 'Caught it every time! It always ran to the most substituted carbon.' },
      { who: 'Pi', text: 'The spark’s loose again. South, toward the orchards. And there’s the shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 7 || busy.current) return
    busy.current = true
    sfx('shard')
    setMarkovHere(true)
    if (world.player) world.player.teleport([0, 0, -182.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -182.4], 3.8, Math.PI / 2)
    await say([{ who: 'Farmer Markov', text: 'Puffed my way up all those stairs. One question before you take it, lad.' }])
    const ok = await openPanel('phantomCheck', {})
    if (!ok) { await say([{ who: 'Farmer Markov', text: 'Chew on it. The shard’ll keep.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 7, checkpoint: { scene: 'plains', at: 'gate' } })
    setState({ objective: 'Bond Shard 7 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… seven. The double bonds out on the plains are holding again.' },
      { who: 'Princess Octavia', text: 'He said any which way. Every time, it went to the steadier carbon.' },
      { who: 'Farmer Markov', text: 'Keep the sling. Borana’s orchards are south. She’ll show you more ways to add.' },
      { who: 'Pi', text: 'Seven down, five to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'plains', at: 'gate' }, card: 7 })
    busy.current = false
    onExit('plains', { scene: 'plains', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -184], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss7 && (getState().save.shards || 0) < 7)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 6.5, pitchSet: 0.5, lookY: 1.0 } : null })

  return (
    <group>
      <color attach="background" args={['#1e1610']} />
      <fog attach="fog" args={['#2a2014', 18, 70]} />
      <hemisphereLight args={['#ffe0b0', '#2a2014', 0.85]} />
      <ambientLight intensity={0.35} color="#ffe8c8" />
      <directionalLight position={[10, 40, -60]} intensity={0.7} color="#ffd8a0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={220} />
      {[[8, PIT7.z[0]], [PIT7.z[1], -152]].map(([a, b], i) => <mesh key={i} position={[0, -0.01, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, Math.abs(a - b)]} /><meshStandardMaterial color="#b89a70" roughness={0.9} /></mesh>)}
      {ISLANDS7.map(([a, b], i) => <mesh key={'is' + i} position={[0, -0.01, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, Math.abs(a - b)]} /><meshStandardMaterial color="#a88a60" roughness={0.9} /></mesh>)}
      <mesh position={[0, -0.01, -172]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial color="#9a8468" roughness={0.9} /></mesh>
      <mesh position={[0, -6, (PIT7.z[0] + PIT7.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, 26]} /><meshStandardMaterial color="#c8a050" emissive="#3a2a10" emissiveIntensity={0.4} roughness={1} /></mesh>
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -26, -40, -52, -68, -80, -100, -112, -130, -144].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#ffc070" />))}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = ((k + 0.5) / 8) * Math.PI * 2; return <Torch key={'b' + k} pos={[Math.cos(a) * 12.5, 0, PHANTOM.center[2] + Math.sin(a) * 17]} color="#d8a0ff" /> })}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#4a3a2a" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t7-map']} onOpen={() => openChest('t7-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Tower of Addition</Tag>

      {/* 7-1 Counting Fields */}
      <Suspense fallback={null}>
        {CRATES.map((c) => {
          const [x, z] = CRATE_POS[c.id], d = dials[c.id] || 0
          return (
            <group key={c.id} position={[x, 0, z]}>
              <Part model="tower" name="t7_crate" />
              <mesh position={[0, 1.0, 0.7]} rotation={[0, 0, -Math.PI / 2 + (d * Math.PI) / 4]}><boxGeometry args={[0.06, 0.32, 0.03]} /><meshBasicMaterial color="#ffe070" toneMapped={false} /></mesh>
              <Tag position={[0, 2.0, 0]} df={10} far={16}>{`${c.f} · dial: ${d}`}</Tag>
            </group>
          )
        })}
      </Suspense>
      <Gate world={world} pos={[0, 0, CRATE_DOOR]} size={[2 * W, 7, 0.8]} open={!!solved['7-1']} color="#5a4a30" glow="#ffd070" />
      <Tag position={[0, 7.6, CRATE_DOOR + 0.6]} df={12}>{solved['7-1'] ? 'open' : 'Rings + π bonds, for every crate'}</Tag>

      {/* 7-2 Name and Geometry */}
      <Chest world={world} pos={[-7.6, 0, -36]} rotY={Math.PI / 2} opened={!!solved['t7-compass']} onOpen={() => openChest('t7-compass')} />
      {STATUES7.filter((s) => STATUE7_POS[s.id] !== undefined).map((s) => <Statue key={s.id} st={s} z={STATUE7_POS[s.id]} lit={ez[s.id]} done={ez[s.id] && ez[s.id].done} />)}
      <Wisps world={world} spawns={[[-6, -45], [6, -57]]} active={!!solved['t7-compass']} zone={[-64, -36]} />
      <Gate world={world} pos={[0, 0, EZ_DOOR]} size={[2 * W, 7, 0.8]} open={!!solved['7-2']} color="#5a4a30" glow="#5ff0ff" />

      {/* 7-3 The Stability Scales */}
      {STAB.map((s) => {
        const [x, z] = WEIGHT_POS[s.id]
        const on = placed[s.id]
        return (
          <group key={s.id}>
            <mesh position={[x, 0.45, z]}><cylinderGeometry args={[0.6, 0.7, 0.9, 10]} /><meshStandardMaterial color="#8a7a6a" roughness={0.85} /></mesh>
            {on === undefined && carry !== s.id && <mesh position={[x, 1.15, z]} castShadow><boxGeometry args={[0.6, 0.45, 0.45]} /><meshStandardMaterial color="#8a8a96" metalness={0.7} roughness={0.35} /></mesh>}
            {on === undefined && carry !== s.id && <Tag position={[x, 1.9, z]} df={9} far={14}>{s.name}</Tag>}
          </group>
        )
      })}
      {STEP_POS.map(([x, z], k) => {
        const id = Object.keys(placed).find((w) => placed[w] === k)
        const h = 0.4 + (5 - k) * 0.35
        return (
          <group key={k} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]} castShadow><boxGeometry args={[2.4, h, 2.6]} /><meshStandardMaterial color="#b8a890" roughness={0.8} /></mesh>
            {id && <mesh position={[0, h + 0.23, 0]}><boxGeometry args={[0.6, 0.45, 0.45]} /><meshStandardMaterial color="#c8b060" metalness={0.7} roughness={0.35} /></mesh>}
            <Tag position={[-1.6, h + 0.9, 0]} df={9} far={16}>{id ? `${k + 1} · ${STAB.find((s) => s.id === id).name} · ${STAB.find((s) => s.id === id).dH}` : k === 0 ? '1 · most stable' : k === 5 ? '6 · least stable' : `${k + 1}`}</Tag>
          </group>
        )
      })}
      <Carried world={world} what={carry} />
      <Chest world={world} pos={[0, 0, -88.5]} big opened={!!solved['t7-sling']} show={!!solved['7-3']} onOpen={() => openChest('t7-sling')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -90]} size={[2 * W, 7, 0.8]} open={!!solved['t7-sling']} color="#5a4a30" glow="#ff8aa0" />

      {/* 7-4 The Harvest Hall: alkene bridges over the grain pit */}
      {BRIDGES7.map((br) => {
        const [a, c] = BRIDGE7_Z[br.id], built = !!solved[br.id]
        return (
          <group key={br.id}>
            {built
              ? <mesh position={[0, -0.15, (a + c) / 2]} receiveShadow castShadow><boxGeometry args={[4.4, 0.3, Math.abs(a - c)]} /><meshStandardMaterial color="#8a6a40" roughness={0.85} /></mesh>
              : [-0.18, 0.18].map((dx) => <mesh key={dx} position={[dx, -0.05, (a + c) / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, Math.abs(a - c), 8]} /><meshStandardMaterial color="#5ff0ff" emissive="#2ab0d0" emissiveIntensity={1} transparent opacity={0.7} /></mesh>)}
            {['a', 'b'].map((on) => (
              <group key={on} position={[on === 'a' ? -1.6 : 1.6, 0, a - 0.3]}>
                <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.1, 0.12, 1.2, 8]} /><meshStandardMaterial color="#6a5a4a" /></mesh>
                <mesh position={[0, 1.35, 0]}><sphereGeometry args={[0.28, 14, 10]} /><meshStandardMaterial color={built ? '#9affb8' : '#3a3640'} emissive={built ? '#2a8a4a' : '#000'} emissiveIntensity={0.6} /></mesh>
                <Tag position={[0, 2.0, 0]} df={9} far={12}>{SHOW[br.id][on === 'a' ? 0 : 1]}</Tag>
              </group>
            ))}
            <Tag position={[0, 2.8, a - 0.3]} df={11} far={14} className={built ? 'ok-tag' : ''}>{built ? br.product : `${br.name} + ${br.hx}`}</Tag>
          </group>
        )
      })}
      <Chest world={world} pos={[-6, 0, -121.5]} opened={!!solved['t7-key']} show={!!solved['7-4hammond']} onOpen={() => openChest('t7-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -124]} size={[2 * W, 7, 0.8]} open={!!solved['t7-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -123.6]} df={13}>{solved['t7-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 7-5 The Shifting Crypt */}
      {SHIFTS.map((sk) => {
        const P = skAbs(sk.id)
        const done = !!solved['7-5' + sk.id]
        return (
          <group key={sk.id}>
            <SkeletonFloor sk={sk.id} pads={P} lit={crypt[sk.id] === null ? (done ? sk.end : -1) : crypt[sk.id]} />
            {crypt[sk.id] !== null && <group position={[P[crypt[sk.id]][0], 1.4, P[crypt[sk.id]][1]]}>
              <mesh><sphereGeometry args={[0.4, 16, 12]} /><meshStandardMaterial color="#e0b0ff" emissive="#c070ff" emissiveIntensity={2} toneMapped={false} /></mesh>
              <pointLight color="#c070ff" intensity={3} distance={5} />
              <Tag position={[0, 0.8, 0]} df={10}>+</Tag>
            </group>}
            <Tag position={[P[0][0] - 2.4, 2.2, P[0][1]]} df={11} far={16} className={done ? 'ok-tag' : ''}>{done ? sk.product : `${sk.name}`}</Tag>
          </group>
        )
      })}
      <Chest world={world} pos={[0, 0, -149.5]} big opened={!!solved['t7-bosskey']} show={!!solved['7-5name']} onOpen={() => openChest('t7-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -152]} size={[2 * W, 7, 0.8]} open={!!solved['t7-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS7).map(([id, st]) => {
        const gated = id === '7-4hammond' ? !!solved['7-4'] : id === '7-5name' ? !!(solved['7-5h'] && solved['7-5m']) : true
        const once = ['7-4hammond', '7-5name'].includes(id)
        return (
          <Station key={id} world={world} pos={st.pos} label={!gated || (once && solved[id]) ? null : st.label} enabled={gated && !(once && solved[id])} solved={!!solved[id]}
            onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id); if (id === '7-4hammond') toast('A little chest appears by the door.', 'good', 2600); if (id === '7-5name') { sfx('open'); toast('A big chest rises by the roof door.', 'good', 2800) } }} />
        )
      })}

      {/* boss */}
      <Phantom world={world} center={PHANTOM.center} active={bossOn && !solved.boss7} onDefeated={bossDown} />
      {markovHere && <Markov position={[-2.2, 0, -182.4]} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss7 && (save.shards || 0) < 7} pos={[0, 0, -184]} />
      <Motes count={180} area={[20, 7, 190]} center={[0, 0.5, -90]} color="#ffe8a0" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Tower({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'tower' ? ROOMS7.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#1e1610" camDist={6.2}>
      {(world) => <TowerLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
