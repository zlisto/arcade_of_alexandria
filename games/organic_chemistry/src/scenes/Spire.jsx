import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Mimic, { Lindlar, Vipers } from '../actors/SpireFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { WELLS, REDUCE, HALIDES, SUMMIT_ORDER, SUMMIT_FLASKS } from '../chem/rules9'
import { W9 as W, ROOMS9, STATIONS9, GAP9, WELLS9, REDUCE9, STAIR9, SUMMIT9, GOALS9, MIMIC } from '../data/dungeon9'

// Dungeon 9 — The Triple Spire (Chapter 9, Alkynes: An Introduction to Organic Synthesis). Rooms along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Retrosynthesis Map in a big chest, a Boss Key.
// Puzzles: raise triple bridges by two eliminations (§9.2); hydrate an alkyne two ways (§9.4); reduce it three ways
// (§9.5); a pKa ladder and an acetylide stair (§9.7–9.8); plan a synthesis backward, then run it (§9.9).

preloadModels('spire', 'lindlar')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-130, -170] }
const SEGS = 3
const segZ = (k) => { const L = (GAP9.z[0] - GAP9.z[1]) / SEGS; return [GAP9.z[0] - k * L, GAP9.z[0] - (k + 1) * L] }
const stand = (base, list) => list.map((id, i) => [id, base[0] + (i % 2) * 1.6, base[1] - Math.floor(i / 2) * 1.8 - (i % 2) * 0.9])
const FL_WELLS = stand(WELLS9.stand, ['hg', 'bh3', 'h2'])
const FL_RED = stand(REDUCE9.stand, ['pd', 'lindlar', 'li'])
const FL_NAMES = { hg: WELLS.routes.hg.name, bh3: WELLS.routes.bh3.name, h2: 'H₂, Pd/C', pd: REDUCE.routes.pd.name, lindlar: REDUCE.routes.lindlar.name, li: REDUCE.routes.li.name, ...Object.fromEntries(Object.entries(SUMMIT_FLASKS).map(([k, v]) => ['s_' + k, v])) }
const FL_SUMMIT = Object.keys(SUMMIT_FLASKS).map((k, i) => ['s_' + k, SUMMIT9.flasks[i][0], SUMMIT9.flasks[i][1]])
const FL_COLOR = { hg: '#c8c8d8', bh3: '#8ad0ff', h2: '#e8e8e8', pd: '#a0a0a8', lindlar: '#9af0c0', li: '#e8d0ff', s_nanh2: '#7ae8ff', s_mei: '#ffb07a', s_lindlar: '#9af0c0', s_li: '#e8d0ff', s_hbr: '#ff8a8a' }

function Walls({ world }) {
  const parts = useModelParts('spire')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -128; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -132; z > -168; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -130], [-W, 9, 8]), world.addSolid([W, -9, -130], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -131], [-W, 9, -129]), world.addSolid([W, -9, -131], [ARENA.x, 9, -129]),
      ...[WELLS9['9-2a'], WELLS9['9-2b'], REDUCE9['9-3a'], REDUCE9['9-3b'], SUMMIT9.altar].map(([x, z]) => world.addSolid([x - 0.9, 0, z - 0.9], [x + 0.9, 1.0, z + 0.9])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="s9_wall" items={items} />
}

function Carried({ world, label, color }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.3 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!label) return null
  return (
    <group ref={g}>
      <mesh><cylinderGeometry args={[0.12, 0.12, 0.42, 12]} /><meshStandardMaterial color="#e8f8f4" transparent opacity={0.5} /></mesh>
      <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.28, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} /></mesh>
      <pointLight color={color} intensity={1.4} distance={3.5} />
      <Tag position={[0, 0.55, 0]} df={9}>{label}</Tag>
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

/** a stand of flasks: E takes one into the Satchel */
function Flasks({ list, held }) {
  return list.map(([id, x, z]) => (
    <group key={id} position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.25, 0.3, 0.8, 10]} /><meshStandardMaterial color="#5a5e66" /></mesh>
      {held !== id && <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.36, 10]} /><meshStandardMaterial color={FL_COLOR[id]} emissive={FL_COLOR[id]} emissiveIntensity={0.7} transparent opacity={0.9} /></mesh>}
      <Tag position={[0, 1.7, 0]} df={8} far={10}>{FL_NAMES[id]}</Tag>
    </group>
  ))
}

function SpireLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [halide, setHalide] = useState(null)
  const halideRef = useRef(null)
  halideRef.current = halide
  const [lindlarHere, setLindlarHere] = useState(false)
  const segs = save.t9segs || [0, 0, 0]
  const held = save.t9flask || null
  const wells = save.t9wells || {}
  const summit = save.t9summit || []
  const steps = save.t9steps || []

  useEffect(() => {
    world.map = {
      floor: '#8a8e96', wall: '#2a2e36', pit: '#0e1218',
      labels: ROOMS9.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t9-map']) return null; const seen = sv.t9seen || {}; return ROOMS9.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t9-compass']) return null
        const g = GOALS9.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 9) return { pos: [0, -164], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Cliffs' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('spire')
    world.killY = -8
    const f = [world.addFloor(-W, GAP9.z[0], W, 8, 0), world.addFloor(-W, -130, W, GAP9.z[1], 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -129, 0)]
    const HINTS = {
      '9-1': 'A chasm, and dihalide bridges lying flat. Strike them to pull off HX!',
      '9-2': 'Wells that bubble and shift. Two doors want two different carbonyls.',
      '9-3': 'Same alkyne, two doors: one bent cis, one bent trans.',
      '9-4': 'A stair that needs building, and a ladder of pKa numbers.',
      '9-5': 'A planning table and a row of flasks. Plan first!',
    }
    const t = ROOMS9.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t9seen || {}
      saveGame({ checkpoint: { scene: 'spire', room: r.id }, t9seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -136], [6, 6, -132], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t9-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Cliffs', onInteract: () => onExit('cliffs', { scene: 'cliffs', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -107.2], radius: 2.2, label: () => (has('t9-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -129.2], radius: 2.4, label: () => (has('t9-bossdoor') ? null : 'Unlock the summit door'), onInteract: () => unlockBossDoor() }),
    ]
    const targets = []
    // 9-1: strike each bridge segment twice (two eliminations)
    for (let k = 0; k < SEGS; k++) {
      const [z0] = segZ(k)
      targets.push(world.addTarget({ pos: () => [0, 0.6, z0 - 0.4], radius: 1.4, tall: 1.2, alive: () => ((getState().save.t9segs || [0, 0, 0])[k] || 0) < 2, onHit: () => strikeSeg(k) }))
    }
    // flasks
    ;[...FL_WELLS, ...FL_RED, ...FL_SUMMIT].forEach(([id, x, z]) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.0, label: () => (getState().save.hasSatchel && getState().save.t9flask !== id ? `Take the flask: ${FL_NAMES[id]}` : null), onInteract: () => { saveGame({ t9flask: id }); sfx('pickup') } })))
    // pour (G) on the wells, the reduction altars and the summit altar
    const lanterns = [
      ...['9-2a', '9-2b'].map((id) => world.addLantern({ needs: 'hasSatchel', omni: true, pos: [WELLS9[id][0], 0, WELLS9[id][1]], radius: 2.8, label: () => (has(id) || !getState().save.t9flask ? null : `Pour ${FL_NAMES[getState().save.t9flask]} into the well`), onLantern: () => pourWell(id) })),
      ...['9-3a', '9-3b'].map((id) => world.addLantern({ needs: 'hasSatchel', omni: true, pos: [REDUCE9[id][0], 0, REDUCE9[id][1]], radius: 2.8, label: () => (has(id) || !getState().save.t9flask ? null : `Pour ${FL_NAMES[getState().save.t9flask]} on the 5-decyne`), onLantern: () => pourReduce(id) })),
      world.addLantern({ needs: 'hasSatchel', omni: true, pos: [SUMMIT9.altar[0], 0, SUMMIT9.altar[1]], radius: 2.8, label: () => (has('9-5') || !getState().save.t9flask ? null : `Add ${FL_NAMES[getState().save.t9flask]} to the flask on the altar`), onLantern: () => pourSummit() }),
    ]
    // 9-4: carry halide crates to the stair
    HALIDES.forEach((h, i) => {
      const [x, z] = STAIR9.halides[i]
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.1, label: () => (has('9-4ladder') && !halideRef.current && !(getState().save.t9steps || []).includes(h.id) && !has('9-4') ? `Pick up: ${h.name}` : null), onInteract: () => { setHalide(h.id); sfx('pickup') } }))
    })
    STAIR9.steps.slice(0, 2).forEach(([x, z], k) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.6, label: () => (halideRef.current && (getState().save.t9steps || []).length === k ? 'Alkylate the acetylide with it' : null), onInteract: () => placeHalide(k) })))
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS9.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...targets, ...lanterns].forEach((i) => world.remove(i)) }
  }, [world])

  // the raised bridge segments are floors
  useEffect(() => {
    const ids = segs.map((n, k) => { if (n < 2) return null; const [a, b] = segZ(k); return world.addFloor(-1.6, b, 1.6, a, 0) }).filter((x) => x !== null)
    return () => ids.forEach((i) => world.remove(i))
  }, [world, segs.join(',')])

  // ---------------------------------------------------------------- actions
  const strikeSeg = (k) => {
    const s = [...(getState().save.t9segs || [0, 0, 0])]
    if (k > 0 && s[k - 1] < 2) { toast('Raise the nearer bridge first.', 'info', 2400); return false }
    s[k] = Math.min(2, (s[k] || 0) + 1)
    saveGame({ t9segs: s }); sfx('stomp'); world.shake = 0.2
    if (s[k] === 1) toast('One HX gone: a vinylic halide, half raised and wobbly. Once more!', 'info', 3600)
    else toast('The second HX goes: two π bonds, sp carbons, a straight triple bridge.', 'good', 3600)
    if (s.every((n) => n >= 2) && !has('9-1')) { markSolved('9-1'); sfx('open') }
    return true
  }
  const takeFlask = () => { const f = getState().save.t9flask; saveGame({ t9flask: null }); return f }
  const pourWell = (id) => {
    if (has(id) || String((getState().save.t9wells || {})[id] || '').startsWith('enol:')) return
    const f = takeFlask(); if (!f) return
    const r = WELLS.routes[f]
    if (!r) { sfx('wrong'); toast(f === 'h2' ? 'That reduces the alkyne; it doesn’t add water. The well stays still.' : 'Nothing happens.', 'warn', 3600); return }
    sfx('pickup')
    saveGame({ t9wells: { ...(getState().save.t9wells || {}), [id]: 'enol:' + r.enol } })
    toast(`An enol rises: ${r.enol}. It won’t stay…`, 'info', 2400)
    setTimeout(() => {
      const want = WELLS.doors[id]
      saveGame({ t9wells: { ...(getState().save.t9wells || {}), [id]: r.product } })
      if (r.product === want) { markSolved(id); sfx('open'); toast(`It shifts: ${r.product}! ${r.why}`, 'good', 6000) }
      else { sfx('wrong'); toast(`It shifts into ${r.product}. ${r.why} This well wants ${want}.`, 'warn', 6500); setTimeout(() => saveGame({ t9wells: { ...(getState().save.t9wells || {}), [id]: null } }), 3500) }
    }, 2200)
  }
  const pourReduce = (id) => {
    if (has(id)) return
    const f = takeFlask(); if (!f) return
    const r = REDUCE.routes[f]
    if (!r) { sfx('wrong'); toast('That doesn’t reduce an alkyne here.', 'warn', 3000); return }
    const want = REDUCE.doors[id]
    if (r.product === want) { markSolved(id); sfx('open'); toast(`${r.product}. ${r.why}`, 'good', 5600); return }
    sfx('wrong'); toast(`You made ${r.product}. ${r.why} This door is shaped for ${want}.`, 'warn', 6400)
  }
  const pourSummit = () => {
    if (has('9-5')) return
    if (!has('9-5map')) { toast('Plan it on the Map first. Lindlar would insist.', 'warn', 3000); return }
    const f = takeFlask(); if (!f) return
    const key = f.replace('s_', '')
    const seq = [...(getState().save.t9summit || [])]
    const want = SUMMIT_ORDER[seq.length]
    if (key !== want) {
      sfx('wrong'); saveGame({ t9summit: [] })
      const msg = seq.length === 0 ? 'Start where your plan starts: 1-pentyne needs to lose its proton first (NaNH₂).' : seq.length === 1 ? 'You have the acetylide anion. Now give it a primary halide to add the methyl.' : 'You have 2-hexyne. The target is the cis alkene: which reduction stops at cis?'
      toast(`The flask clouds over and empties. ${msg}`, 'warn', 6000); return
    }
    seq.push(key); saveGame({ t9summit: seq }); sfx('right')
    const names = { nanh2: '1-pentyne → its acetylide anion', mei: 'acetylide + CH₃I → 2-hexyne', lindlar: '2-hexyne → cis-2-hexene' }
    toast(names[key], 'good', 3200)
    if (seq.length === SUMMIT_ORDER.length) { markSolved('9-5'); sfx('open'); setTimeout(() => say([{ who: 'Pi', text: 'cis-2-hexene! Planned backward, made forward.' }, { who: 'Pi', text: 'A big chest by the summit door!' }]), 600) }
  }
  const placeHalide = (k) => {
    const id = halideRef.current
    if (!id) return
    const h = HALIDES.find((x) => x.id === id)
    setHalide(null)
    if (!h.ok) { sfx('wrong'); world.shake = 0.3; toast(`The step crumbles. ${h.why}`, 'warn', 6000); return }
    const next = [...(getState().save.t9steps || []), id]
    saveGame({ t9steps: next }); sfx('right')
    toast(`${h.name}: a ${h.kind} halide. The acetylide swaps in for the halide and the stair grows a step.`, 'good', 4600)
    if (next.length >= 2) { markSolved('9-4'); sfx('open'); toast('The stair is built. A little chest glints at the top.', 'good', 3200) }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: To make something, just start somewhere and hope.' },
      { who: 'Pi', text: 'Someone’s scratched underneath: “and then?” —L.' },
    ])
    markSolved('t9-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t9-door')) return
    if (!getState().save.t9key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t9key: false }); markSolved('t9-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t9-bossdoor')) return
    if (!has('t9-bosskey')) { toast('The summit door crackles with violet light. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t9-bossdoor'); sfx('open'); toast('The Boss Key turns. Thunder, very close…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't9-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't9-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't9-key') { saveGame({ t9key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't9-retro') {
      saveGame({ hasRetro: true })
      await itemGet(world, { model: 'lindlar', name: 't9_map', scale: 2.2, color: '#5ff0ff' }, [
        { who: '', text: 'You got the Retrosynthesis Map!' },
        { who: 'Pi', text: 'It starts at the thing you want, and branches backward to the things you have.' },
        { who: 'Pi', text: 'At a planning table, open it and pick what came just before. Step by step.' },
      ])
    }
    if (id === 't9-bosskey') { saveGame({ t9bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss9') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -133]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t9bossIntro) {
      saveGame({ t9bossIntro: true })
      world.camOverride = { pos: [3, 4, -134], look: [MIMIC.center[0], 1.8, MIMIC.center[2]] }
      await say([
        { who: 'Pi', text: 'Malradix’s Mimic! It’s wearing a molecule like a costume.' },
        { who: 'Pi', text: 'Hit the pedestal with whatever came just before it. Peel it back, step by step!' },
        { who: 'Pi', text: 'And keep moving. It lunges.' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'What came just before? Back, back, back!' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss9')
    playMusic('spire')
    await say([
      { who: 'Pi', text: 'Nothing left under all that but a faceless doll. And the spark!' },
      { who: 'Pi', text: 'It went south, down into a misty marsh. The shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 9 || busy.current) return
    busy.current = true
    sfx('shard')
    setLindlarHere(true)
    if (world.player) world.player.teleport([0, 0, -162.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -162.4], 3.8, Math.PI / 2)
    await say([{ who: 'Sage Lindlar', text: 'A question before you take it. Just the one. Ask it of yourself afterwards, too.' }])
    const ok = await openPanel('mimicCheck', {})
    if (!ok) { await say([{ who: 'Sage Lindlar', text: 'Take your time. Plans that are rushed come back to the start.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 9, checkpoint: { scene: 'cliffs', at: 'gate' } })
    setState({ objective: 'Bond Shard 9 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… nine. The storm over the cliffs has broken. I can see stars.' },
      { who: 'Princess Octavia', text: 'He said start anywhere and hope. You started at the end.' },
      { who: 'Sage Lindlar', text: 'Keep the Map. The marsh is south. Magnus knows what radicals really do.' },
      { who: 'Pi', text: 'Nine down, three to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'cliffs', at: 'gate' }, card: 9 })
    busy.current = false
    onExit('cliffs', { scene: 'cliffs', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -164], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss9 && (getState().save.shards || 0) < 9)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 6.5, pitchSet: 0.5, lookY: 1.2 } : null })

  const hName = held ? FL_NAMES[held] : null
  const hh = halide ? HALIDES.find((x) => x.id === halide) : null
  return (
    <group>
      <color attach="background" args={['#14161e']} />
      <fog attach="fog" args={['#1e2230', 18, 70]} />
      <hemisphereLight args={['#d8e4ff', '#1e2230', 0.85]} />
      <ambientLight intensity={0.3} color="#dfe8ff" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#e8f0ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      {[[8, GAP9.z[0]], [GAP9.z[1], -130]].map(([a, b], i) => <mesh key={i} position={[0, -0.01, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, Math.abs(a - b)]} /><meshStandardMaterial color="#7a7e86" roughness={0.9} /></mesh>)}
      <mesh position={[0, -0.01, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial color="#5a5e66" roughness={0.9} /></mesh>
      <mesh position={[0, -7, (GAP9.z[0] + GAP9.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, 15]} /><meshBasicMaterial color="#05070c" /></mesh>
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -40, -52, -64, -76, -90, -102, -114, -124].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#7ae8ff" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3e46" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t9-map']} onOpen={() => openChest('t9-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Triple Spire</Tag>

      {/* 9-1 the linear halls: dihalide bridges */}
      {[...Array(SEGS)].map((_, k) => {
        const [a, b] = segZ(k), n = segs[k] || 0
        return (
          <group key={k}>
            {n >= 2
              ? [-0.45, 0, 0.45].map((dx) => <mesh key={dx} position={[dx, -0.1, (a + b) / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, Math.abs(a - b), 8]} /><meshStandardMaterial color="#5ff0ff" emissive="#2ab0d0" emissiveIntensity={1.2} /></mesh>)
              : <mesh position={[0, -1.4 + n * 0.8, (a + b) / 2]} rotation={[n === 1 ? 0.25 : 0.6, 0, 0]}><boxGeometry args={[3.0, 0.3, Math.abs(a - b)]} /><meshStandardMaterial color={n === 1 ? '#8a7a9a' : '#6a5a6a'} /></mesh>}
            {n >= 2 && <mesh position={[0, -0.25, (a + b) / 2]}><boxGeometry args={[3.2, 0.2, Math.abs(a - b)]} /><meshStandardMaterial color="#3a4652" transparent opacity={0.5} /></mesh>}
            {n < 2 && <Tag position={[0, 1.6, a - 0.4]} df={10} far={14}>{n === 0 ? 'a 1,2-dihalide: strike it (base)' : 'a vinylic halide: once more'}</Tag>}
          </group>
        )
      })}

      {/* 9-2 the shifting wells */}
      <Chest world={world} pos={[7.6, 0, -40]} rotY={-Math.PI / 2} opened={!!solved['t9-compass']} onOpen={() => openChest('t9-compass')} />
      <Flasks list={FL_WELLS} held={held} />
      {['9-2a', '9-2b'].map((id) => {
        const [x, z] = WELLS9[id], st = wells[id]
        return (
          <group key={id} position={[x, 0, z]}>
            <Suspense fallback={null}><Part model="spire" name="s9_well" /></Suspense>
            {st && <mesh position={[0, 1.2 + (String(st).startsWith('enol') ? 0.3 : 0), 0]}><icosahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color={solved[id] ? '#9affb8' : String(st).startsWith('enol') ? '#ffd060' : '#ff9a8a'} emissive="#3a3a1a" emissiveIntensity={0.6} /></mesh>}
            <Tag position={[0, 2.6, 0]} df={9} far={14}>{`wants: ${WELLS.doors[id]}`}</Tag>
            <Tag position={[0, 2.1, 0]} df={10} far={14} className={solved[id] ? 'ok-tag' : ''}>{st ? String(st).replace('enol:', '') : '1-hexyne'}</Tag>
          </group>
        )
      })}
      <Vipers world={world} spawns={[[-5, -54], [5, -55]]} active={!!solved['t9-compass']} zone={[-36, -58]} />
      <Gate world={world} pos={[0, 0, -58]} size={[2 * W, 7, 0.8]} open={!!(solved['9-2a'] && solved['9-2b'])} color="#3a4652" glow="#ffd060" />

      {/* 9-3 three reductions */}
      <Flasks list={FL_RED} held={held} />
      {['9-3a', '9-3b'].map((id) => {
        const [x, z] = REDUCE9[id]
        const want = REDUCE.doors[id]
        return (
          <group key={id} position={[x, 0, z]}>
            <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.8, 0.9, 1.0, 12]} /><meshStandardMaterial color="#6a6e76" /></mesh>
            {[-0.7, 0.7].map((dx) => <mesh key={dx} position={[dx, 1.5, 0]}><sphereGeometry args={[0.2, 10, 8]} /><meshStandardMaterial color="#3a3640" /></mesh>)}
            {solved[id] && [-1, 1].map((s) => <mesh key={s} position={[s * 1.1, 1.5 + (want.startsWith('cis') ? 0.5 : s * 0.5), 0]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color="#9affb8" /></mesh>)}
            <Tag position={[0, 2.8, 0]} df={9} far={14}>{`door shaped for: ${want}`}</Tag>
            <Tag position={[0, 2.3, 0]} df={10} far={14} className={solved[id] ? 'ok-tag' : ''}>{solved[id] ? want : '5-decyne'}</Tag>
          </group>
        )
      })}
      <Chest world={world} pos={[0, 0, -79.5]} big opened={!!solved['t9-retro']} show={!!(solved['9-3a'] && solved['9-3b'])} onOpen={() => openChest('t9-retro')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -82]} size={[2 * W, 7, 0.8]} open={!!solved['t9-retro']} color="#3a4652" glow="#5ff0ff" />

      {/* 9-4 the acetylide stair */}
      {HALIDES.map((h, i) => {
        const [x, z] = STAIR9.halides[i]
        const gone = steps.includes(h.id) || halide === h.id
        return (
          <group key={h.id} position={[x, 0, z]}>
            {!gone && <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.8, 0.8, 0.8]} /><meshStandardMaterial color="#8a7a5a" /></mesh>}
            {!gone && <Tag position={[0, 1.3, 0]} df={8} far={10}>{h.name}</Tag>}
          </group>
        )
      })}
      {STAIR9.steps.slice(0, 2).map(([x, z], k) => (
        <group key={k} position={[x, 0, z]}>
          <mesh position={[0, 0.2 + (steps.length > k ? 0.4 * (k + 1) : 0), 0]}><boxGeometry args={[3.0, 0.4 + (steps.length > k ? 0.8 * (k + 1) : 0), 2.4]} /><meshStandardMaterial color={steps.length > k ? '#9af0ff' : '#4a4e56'} emissive={steps.length > k ? '#2a8aa0' : '#000'} emissiveIntensity={0.4} /></mesh>
          <Tag position={[0, 2.2, 0]} df={9} far={12}>{steps.length > k ? `${HALIDES.find((h) => h.id === steps[k]).name}: added` : 'an acetylide waits here (R–C≡C:⁻)'}</Tag>
        </group>
      ))}
      {hh && <Carried world={world} label={hh.name} color="#ffb07a" />}
      <Vipers world={world} spawns={[[5, -92], [-4, -100]]} active={!!solved['t9-door'] || !!solved['9-4ladder']} zone={[-82, -108]} />
      <Chest world={world} pos={[0, 0, -106]} opened={!!solved['t9-key']} show={!!solved['9-4']} onOpen={() => openChest('t9-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -108]} size={[2 * W, 7, 0.8]} open={!!solved['t9-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -107.6]} df={13}>{solved['t9-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 9-5 the planner's summit */}
      <Flasks list={FL_SUMMIT} held={held} />
      <group position={[SUMMIT9.altar[0], 0, SUMMIT9.altar[1]]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.8, 0.9, 1.0, 12]} /><meshStandardMaterial color="#6a6e76" /></mesh>
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.35, 14, 10]} /><meshStandardMaterial color={solved['9-5'] ? '#9affb8' : '#d8d0e8'} emissive={solved['9-5'] ? '#2a8a4a' : '#3a3a5a'} emissiveIntensity={0.6} transparent opacity={0.85} /></mesh>
        <Tag position={[0, 2.4, 0]} df={10} far={14}>{solved['9-5'] ? 'cis-2-hexene' : summit.length === 0 ? '1-pentyne · make cis-2-hexene' : summit.length === 1 ? 'the acetylide of 1-pentyne' : '2-hexyne'}</Tag>
      </group>
      <Carried world={world} label={hName} color={held ? FL_COLOR[held] : '#fff'} />
      <Chest world={world} pos={[0, 0, -127.5]} big opened={!!solved['t9-bosskey']} show={!!solved['9-5']} onOpen={() => openChest('t9-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -130]} size={[2 * W, 7, 0.8]} open={!!solved['t9-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS9).map(([id, st]) => {
        const gated = id === '9-5map' ? !!save.hasRetro : true
        const once = ['9-4ladder', '9-5map'].includes(id)
        return (
          <Station key={id} world={world} pos={st.pos} label={!gated ? null : once && solved[id] ? null : st.label.replace(' (G)', '')} enabled={gated && !(once && solved[id])} solved={!!solved[id]}
            onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id); if (id === '9-4ladder') toast('NaNH₂ it is. The halide crates unlock.', 'good', 2800); if (id === '9-5map') toast('The plan glows on the Map. Now run it, in order.', 'good', 3000) }} />
        )
      })}

      {/* boss */}
      {!solved.boss9 && <Mimic world={world} center={MIMIC.center} active={bossOn && !solved.boss9} onDefeated={bossDown} />}
      {lindlarHere && <Lindlar position={[-2.2, 0, -162.4]} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss9 && (save.shards || 0) < 9} pos={[0, 0, -164]} />
      <Motes count={160} area={[20, 7, 170]} center={[0, 0.6, -80]} color="#c8e8ff" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Spire({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'spire' ? ROOMS9.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#14161e" camDist={6.2}>
      {(world) => <SpireLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
