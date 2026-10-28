import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, HookTarget, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import { Wisps, Hammond } from '../actors/PeaksFolk'
import Wyrm from '../actors/Wyrm'
import { Ridge } from '../actors/EnergyRidge'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { CRYSTALS6, PILLARS, CHAIN, PASSES, ROOM_T, highestTS } from '../chem/rules6'
import { W6 as W, ROOMS6, STATIONS6, FORGE6, GORGE, PILLAR_POS, CHAIN_POS, PASS_ROOM, GOALS6, WYRM } from '../data/dungeon6'

// Dungeon 6 — The Pass Caves under the Activation Peaks (Chapter 6, An Overview of Organic Reactions).
// Ocarina-style: Dungeon Map, Compass, a small key, the Activation Boots in a big chest, a Boss Key.
// In-world puzzles: split bonds into ions or radicals (§6.2); hook across a gorge on δ+ carbons only (§6.3);
// run a radical chain by hand (§6.6); cross an energy diagram with the boots (§6.9–6.10).

preloadModels('peaks', 'peaksfolk')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-140, -178] }
const PASS_Z = { z0: -110, z1: -130 }
const RIDGE_X = { direct: -4.5, enzyme: 4.5 }

function Walls({ world }) {
  const parts = useModelParts('peaks')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -138; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -142; z > -178; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  const spikes = useMemo(() => { const o = []; for (let z = 2; z > -136; z -= 7) { o.push([-W + 1.2, 0, z - 1.5, 0.8 + ((z * 7) % 5) * 0.08, z]); o.push([W - 1.2, 0, z + 1.5, 0.7 + ((z * 3) % 5) * 0.08, -z]) } return o.filter(([, , z]) => !(z < -38 && z > -54) && !(z < -108 && z > -134)) }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -140], [-W, 9, 8]), world.addSolid([W, -9, -140], [W + 2, 9, 8]),
      world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -141], [-W, 9, -139]), world.addSolid([W, -9, -141], [ARENA.x, 9, -139]),
      ...spikes.map(([x, , z]) => world.addSolid([x - 0.5, 0, z - 0.5], [x + 0.5, 2.6, z + 0.5])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return (
    <group>
      <InstancedPart parts={parts} name="c6_wall" items={items} />
      <InstancedPart parts={parts} name="c6_spike" items={spikes} castShadow />
    </group>
  )
}

/** a radical (or an ion) floating over Kai's head while he carries it */
function Carried({ world, what }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.3 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!what) return null
  const col = what === 'Cl' ? '#6fe39a' : '#ff9a6a'
  return (
    <group ref={g}>
      <mesh><sphereGeometry args={[0.28, 16, 12]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.9} /></mesh>
      <mesh position={[0.32, 0.18, 0]}><sphereGeometry args={[0.06, 8, 6]} /><meshBasicMaterial color="#fff7c0" toneMapped={false} /></mesh>
      <pointLight color={col} intensity={1.6} distance={4} />
      <Tag position={[0, 0.6, 0]} df={9}>{what === 'Cl' ? 'Cl· (a radical: one unpaired electron)' : '·CH₃ (a methyl radical)'}</Tag>
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

function CavesLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [hammondHere, setHammondHere] = useState(false)
  const [carry, setCarry] = useState(null)
  const carryRef = useRef(null)
  carryRef.current = carry
  const meter = save.t6meter || 0
  const meterRef = useRef(meter)
  meterRef.current = meter
  const made = save.t6made || 0

  useEffect(() => {
    world.map = {
      floor: '#c8d0e0', wall: '#2a2838', pit: '#0c0a18',
      labels: ROOMS6.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t6-map']) return null; const seen = sv.t6seen || {}; return ROOMS6.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t6-compass']) return null
        const g = GOALS6.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 6) return { pos: [0, -160], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Activation Peaks' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('caves')
    world.killY = -8
    const f = [
      world.addFloor(-W, GORGE.z[0], W, 8, 0), world.addFloor(-W, PASS_Z.z0, W, GORGE.z[1], 0),
      world.addFloor(-W, -140, W, PASS_Z.z1 - 4, 0), // the far side of the Twin Passes
      world.addFloor(-ARENA.x, -146, ARENA.x, -140, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -170 - 4, 0),
      ...Object.values(PILLAR_POS).map(([x, z]) => world.addFloor(x - 0.9, z - 0.9, x + 0.9, z + 0.9, 0)),
    ]
    const HINTS = {
      '6-1': 'Two hammers and two crystals. Ions, or radicals?',
      '6-2': 'A gorge, and pillars with molecules on them. The Hookshot only bites electron-poor carbon.',
      '6-3': 'A cave that runs on a chain reaction. Light it, then keep it going.',
      '6-4': 'A great scale of bonds. And a big chest!',
      '6-5': 'The floor is an energy diagram! Two ways across.',
    }
    const t = ROOMS6.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t6seen || {}
      saveGame({ checkpoint: { scene: 'caves', room: r.id }, t6seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const gorgeT = world.addTrigger([-W, -1, GORGE.z[1] - 3], [W, 4, GORGE.z[1] - 0.3], () => { if (!has('6-2gorge')) { markSolved('6-2gorge'); sfx('open'); toast('Across! Every hold you took was a δ+ carbon: electron-poor, electrophilic.', 'good', 4200) } })
    const bossT = world.addTrigger([-6, 0, -146], [6, 6, -142], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t6-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the decree', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Activation Peaks', onInteract: () => onExit('peaks', { scene: 'peaks', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -60.8], radius: 2.2, label: () => (has('t6-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -139], radius: 2.4, label: () => (has('t6-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlockBossDoor() }),
    ]
    // 6-1: each crystal, each hammer
    CRYSTALS6.forEach((c, i) => {
      const x = i ? 2.2 : -2.2
      ia.push(world.addInteractable({ pos: [x - 0.9, 0, FORGE6.anvil[1] + 1.2], radius: 1.1, label: () => (doneForge(c.id) ? null : `Strike ${c.bond} with the full-arrow hammer`), onInteract: () => strike(c, 'full') }))
      ia.push(world.addInteractable({ pos: [x + 0.9, 0, FORGE6.anvil[1] + 1.2], radius: 1.1, label: () => (doneForge(c.id) ? null : `Strike ${c.bond} with the fishhook hammer`), onInteract: () => strike(c, 'fish') }))
    })
    // 6-3: the chain stations
    const C = CHAIN_POS
    ia.push(world.addInteractable({ pos: [C.uv[0], 0, C.uv[1]], radius: 1.8, label: () => (has('6-3') || carryRef.current ? null : 'Shine the UV crystal on Cl₂ (initiation)'), onInteract: () => initiate() }))
    ia.push(world.addInteractable({ pos: [C.methane[0], 0, C.methane[1]], radius: 1.8, label: () => (carryRef.current ? `Bring ${carryRef.current === 'Cl' ? 'Cl·' : '·CH₃'} to the methane font` : null), onInteract: () => font('methane') }))
    ia.push(world.addInteractable({ pos: [C.chlorine[0], 0, C.chlorine[1]], radius: 1.8, label: () => (carryRef.current ? `Bring ${carryRef.current === 'Cl' ? 'Cl·' : '·CH₃'} to the chlorine font` : null), onInteract: () => font('chlorine') }))
    ia.push(world.addInteractable({ pos: [C.stray[0], 0, C.stray[1]], radius: 1.8, label: () => (carryRef.current && !has('6-3') ? 'Pair your radical with this one' : null), onInteract: () => terminate() }))
    // 6-5: the vent
    ia.push(world.addInteractable({ pos: [PASS_ROOM.vent[0], 0, PASS_ROOM.vent[1]], radius: 1.8, label: () => (getState().save.hasBoots ? 'Stand in the vent: charge the boots' : null), onInteract: () => vent() }))
    const solids = [world.addSolid([4.4, 0, -9.4], [5.6, 1.6, -8.6]), world.addSolid([-1.6, 0, FORGE6.anvil[1] - 0.6], [1.6, 1.1, FORGE6.anvil[1] + 0.6])]
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS6.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, gorgeT, bossT, decreeT, ...ia, ...solids].forEach((i) => world.remove(i)) }
  }, [world])

  // ---------------------------------------------------------------- actions
  const doneForge = (cid) => (cid === 'HBr' ? has('6-1a') : has('6-1b'))
  const strike = (c, hammer) => {
    const out = hammer === 'full' ? c.ions : c.radicals
    const kind = hammer === 'full' ? 'ions' : 'radicals'
    sfx('stomp'); world.shake = 0.2
    const door = Object.entries(FORGE6.doors).find(([, d]) => d.crystal === c.id)
    const [id, d] = door
    if (id === '6-1b' && !has('6-1a')) { toast(`${c.bond} splits: ${out}. The second door waits until the first is open.`, 'info', 3600); return }
    if (kind !== d.want) { sfx('wrong'); toast(`${c.bond} splits ${hammer === 'full' ? 'heterolytically: both electrons to one side' : 'homolytically: one electron each'}, giving ${out}. This door wants ${d.want}.`, 'warn', 5200); return }
    markSolved(id); sfx('open')
    toast(hammer === 'full' ? `Heterolytic: both electrons go with Br. ${out}: ions, the stuff of polar reactions.` : `Homolytic: one electron each way. ${out}: radicals, the stuff of radical reactions.`, 'good', 5200)
  }
  const initiate = () => {
    if (has('6-3') || carryRef.current) return
    setCarry('Cl'); sfx('shard')
    toast('Light splits Cl₂ into two Cl· radicals (initiation). Take one where it can react.', 'good', 4200)
  }
  const font = (which) => {
    const c = carryRef.current
    if (!c) return
    if (which === 'methane' && c === 'Cl') { setCarry('CH3'); sfx('pickup'); toast('Cl· takes an H from CH₄: HCl, and a methyl radical ·CH₃ (propagation, step 1).', 'good', 4200); return }
    if (which === 'chlorine' && c === 'CH3') {
      const n = (getState().save.t6made || 0) + 1
      saveGame({ t6made: n }); setCarry('Cl'); sfx('right')
      toast(n >= CHAIN.need ? `·CH₃ takes a Cl from Cl₂: CH₃Cl, and a new Cl· (propagation, step 2). ${n} made. The chain could run forever. End it.` : `·CH₃ + Cl₂ → CH₃Cl + Cl· (propagation, step 2). ${n} CH₃Cl made. The new Cl· carries on.`, 'good', 4600)
      return
    }
    sfx('wrong')
    toast(c === 'Cl' ? 'Cl· and Cl₂ just trade places. Cl· needs an H to take: the methane.' : '·CH₃ has nothing to take from methane. It wants a Cl atom: the chlorine.', 'warn', 4200)
  }
  const terminate = () => {
    if (!carryRef.current || has('6-3')) return
    if ((getState().save.t6made || 0) < CHAIN.need) { toast(`Not yet: the door wants ${CHAIN.need} CH₃Cl. Keep the chain going first.`, 'warn', 3400); return }
    setCarry(null); markSolved('6-3'); sfx('open')
    toast('Two radicals meet and pair their electrons: termination. The chain stops, and the door opens.', 'good', 4600)
  }
  const vent = () => {
    if (!getState().save.hasBoots) return
    saveGame({ t6meter: Math.max(getState().save.t6meter || 0, ROOM_T) }); sfx('stance')
    toast(`The boots charge to ${ROOM_T} kJ/mol: about what room temperature can lift a molecule over (p. 190).`, 'good', 4600)
  }
  const passCrossed = (route) => {
    if (has('6-5')) return
    markSolved('6-5'); sfx('open')
    setTimeout(() => say(route === 'enzyme' ? [
      { who: 'Pi', text: 'Lots of little passes, none over 60. Like an enzyme: many small steps, no big climb (§6.10).' },
      { who: 'Pi', text: 'The direct way ends just as far down, but its first pass is 140. Too high for room temperature!' },
    ] : [{ who: 'Pi', text: 'You made it over the tall one?!' }]), 400)
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's decree", text: 'BY ORDER OF MALRADIX: If a reaction gives off energy, it must happen instantly. Downhill is down. Wait for nothing.' },
      { who: 'Pi', text: 'Hammond’s soup disagrees.' },
    ])
    markSolved('t6-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t6-door')) return
    if (!getState().save.t6key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t6key: false }); markSolved('t6-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t6-bossdoor')) return
    if (!has('t6-bosskey')) { toast('A great lock shaped like a mountain pass. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t6-bossdoor'); sfx('open'); toast('The Boss Key turns. Wind howls over a summit beyond…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't6-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't6-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't6-key') { saveGame({ t6key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't6-boots') {
      saveGame({ hasBoots: true })
      await itemGet(world, { model: 'peaks', name: 'c6_boots', scale: 1.2, color: '#ffb04a' }, [
        { who: '', text: 'You got the Activation Boots!' },
        { who: 'Pi', text: 'They hold energy. A vent fills them; a pass you can’t reach, you can’t climb.' },
        { who: 'Pi', text: 'Think of it as how much energy a molecule has to get over a barrier. (The boots are a picture; molecules don’t wear boots.)' },
      ])
    }
    if (id === 't6-bosskey') { saveGame({ t6bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss6') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -143]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t6bossIntro) {
      saveGame({ t6bossIntro: true })
      await say([
        { who: 'Pi', text: 'The Transition Wyrm! It sits on top of the pass. You can’t hit the top of a pass.' },
        { who: 'Pi', text: 'Two routes each time. It guards the taller pass: that one is slow. Take the lower pass, whichever ends further down.' },
        { who: 'Pi', text: 'The boots are full: 120 here. Watch its breath and roll!' },
      ])
    } else await say([{ who: 'Pi', text: 'Lower pass wins. Roll through the breath.' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss6')
    playMusic('caves')
    await say([
      { who: 'Pi', text: 'Over all three! It never was a monster to beat. It was the top of a hill to get past.' },
      { who: 'Pi', text: 'The spark fled south-east, toward the plains. The shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 6 || busy.current) return
    busy.current = true
    sfx('shard')
    setHammondHere(true)
    if (world.player) world.player.teleport([0, 0, -172.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -172.4], 3.8, Math.PI / 2)
    await say([{ who: 'Pass-Warden Hammond', text: 'Climbed all the way up after you. One question, lad. Humour an old man.' }])
    const ok = await openPanel('wyrmCheck', {})
    if (!ok) { await say([{ who: 'Pass-Warden Hammond', text: 'Think it over. The shard’s not going anywhere. Neither am I.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 6, checkpoint: { scene: 'peaks', at: 'gate' } })
    setState({ objective: 'Bond Shard 6 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… six shards. Half the kingdom’s bonds are whole again.' },
      { who: 'Princess Octavia', text: 'He said downhill means instant. You crossed every pass by its height, not its drop.' },
      { who: 'Pass-Warden Hammond', text: 'Keep the boots. South-east are the plains, and a tower where things only ever add on.' },
      { who: 'Pi', text: 'Six down, six to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'peaks', at: 'gate' }, card: 6 })
    busy.current = false
    onExit('peaks', { scene: 'peaks', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -174], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss6 && (getState().save.shards || 0) < 6)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  // once the Wyrm is gone, its ridges go too: a floor across the pit to the shard
  useEffect(() => { if (!solved.boss6) return; const id = world.addFloor(-ARENA.x, -174, ARENA.x, -146, 0); return () => world.remove(id) }, [world, solved.boss6])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 4, pitchSet: 0.3, lookY: 1.2 } : null })

  return (
    <group>
      <color attach="background" args={['#14121e']} />
      <fog attach="fog" args={['#1e1c2e', 18, 70]} />
      <hemisphereLight args={['#d8e4ff', '#1e1c2e', 0.85]} />
      <ambientLight intensity={0.3} color="#dfe8ff" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#e8f0ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      {/* floors (snow-dusted rock), the gorge, the chasm under the passes */}
      {[[8, GORGE.z[0]], [GORGE.z[1], PASS_Z.z0], [PASS_Z.z1 - 4, -140]].map(([a, b], i) => <mesh key={i} position={[0, -0.01, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, Math.abs(a - b)]} /><meshStandardMaterial color="#c8d0e0" roughness={0.9} /></mesh>)}
      <mesh position={[0, -0.01, -160]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * ARENA.x, 38]} /><meshStandardMaterial color="#9aa4b8" roughness={0.9} /></mesh>
      {solved.boss6 && <mesh position={[0, 0.02, -160]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * ARENA.x, 28]} /><meshStandardMaterial color="#c8d4e4" roughness={0.6} /></mesh>}
      {[[GORGE.z[0], GORGE.z[1]], [PASS_Z.z0, PASS_Z.z1 - 4], [-146, -174]].map(([a, b], i) => <mesh key={'pit' + i} position={[0, -7, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * ARENA.x, Math.abs(a - b)]} /><meshBasicMaterial color="#05040a" /></mesh>)}
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -24, -36, -58, -70, -82, -92, -102].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#ffb04a" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3644" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's decree</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t6-map']} onOpen={() => openChest('t6-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Pass Caves</Tag>

      {/* 6-1 the Splitting Forge */}
      <mesh position={[0, 0.55, FORGE6.anvil[1]]} castShadow><boxGeometry args={[3.2, 1.1, 1.2]} /><meshStandardMaterial color="#3a3a44" metalness={0.6} roughness={0.4} /></mesh>
      {CRYSTALS6.map((c, i) => {
        const x = i ? 2.2 : -2.2
        const done = doneForge(c.id)
        return (
          <group key={c.id} position={[x, 1.1, FORGE6.anvil[1]]}>
            {!done && <>
              <mesh position={[-0.35, 0.45, 0]}><sphereGeometry args={[0.28, 14, 10]} /><meshStandardMaterial color={c.id === 'HBr' ? '#f2f2f2' : '#6fe39a'} emissive="#6a8aa0" emissiveIntensity={0.3} /></mesh>
              <mesh position={[0.35, 0.45, 0]}><sphereGeometry args={[0.34, 14, 10]} /><meshStandardMaterial color={c.id === 'HBr' ? '#b0503a' : '#6fe39a'} emissive="#6a8aa0" emissiveIntensity={0.3} /></mesh>
              <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.7, 8]} /><meshStandardMaterial color="#fff7c0" emissive="#ffd760" emissiveIntensity={0.8} /></mesh>
            </>}
            <Tag position={[0, 1.3, 0]} df={10}>{done ? `${c.bond}: split` : `${c.bond} · a bond: two shared electrons`}</Tag>
            <Tag position={[-0.9, -0.6, 1.2]} df={8} far={10}>full arrow ↷</Tag>
            <Tag position={[0.9, -0.6, 1.2]} df={8} far={10}>fishhook ⇀</Tag>
          </group>
        )
      })}
      {Object.entries(FORGE6.doors).map(([id, d]) => (
        <group key={id}>
          <Gate world={world} pos={[0, 0, d.z]} size={[2 * W, 7, 0.8]} open={!!solved[id]} color="#4a5a7a" glow={d.want === 'ions' ? '#ff9a6a' : '#6fe39a'} />
          <Tag position={[0, 7.6, d.z + 0.6]} df={12}>{`This door wants ${d.want}`}</Tag>
        </group>
      ))}

      {/* 6-2 Electron Radar Gorge */}
      <Chest world={world} pos={[-7.6, 0, -36]} rotY={Math.PI / 2} opened={!!solved['t6-compass']} onOpen={() => openChest('t6-compass')} />
      {PILLARS.map((pl) => {
        const [x, z] = PILLAR_POS[pl.id]
        return (
          <group key={pl.id}>
            <mesh position={[x, -3.5, z]}><cylinderGeometry args={[0.9, 0.7, 7, 10]} /><meshStandardMaterial color="#5a5060" roughness={0.9} /></mesh>
            <HookTarget world={world} pos={[x, 0, z]} land={[x, 0, z]} color={'#4aa8ff'} accepts={() => (pl.delta === '+' ? true : `${pl.mol}: ${pl.why}`)} label={pl.mol} />
          </group>
        )
      })}
      <HookTarget world={world} pos={[0, 0, GORGE.z[1] - 3]} land={[0, 0, GORGE.z[1] - 3.6]} label="the far bank" />
      <Tag position={[0, 3.6, GORGE.z[0] + 0.5]} df={12}>Hook only where the carbon is δ+ (electron-poor)</Tag>
      <Chest world={world} pos={[0, 0, -59.5]} opened={!!solved['t6-key']} show={!!solved['6-2arrows']} onOpen={() => openChest('t6-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -62]} size={[2 * W, 7, 0.8]} open={!!solved['t6-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -61.6]} df={13}>{solved['t6-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 6-3 the Chain Cave */}
      {[['uv', '#c89aff', 'UV crystal'], ['methane', '#ffb0d8', 'methane font · CH₄'], ['chlorine', '#6fe39a', 'chlorine font · Cl₂'], ['stray', '#ff9a6a', 'a stray radical']].map(([k, col, label]) => {
        const [x, z] = CHAIN_POS[k]
        if (k === 'stray' && solved['6-3']) return null
        return (
          <group key={k} position={[x, 0, z]}>
            {k !== 'stray' && <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.7, 0.85, 1.0, 10]} /><meshStandardMaterial color="#5a5868" roughness={0.8} /></mesh>}
            <mesh position={[0, k === 'stray' ? 1.6 : 1.4, 0]}><sphereGeometry args={[k === 'uv' ? 0.45 : 0.35, 14, 10]} /><meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.8} transparent opacity={0.85} /></mesh>
            <pointLight position={[0, 1.8, 0]} color={col} intensity={1.6} distance={5} />
            <Tag position={[0, 2.4, 0]} df={10}>{label}</Tag>
          </group>
        )
      })}
      <group position={[6, 0, -82]}>
        {[...Array(CHAIN.need)].map((_, i) => <mesh key={i} position={[(i - 1) * 0.6, 1.0, 0]}><cylinderGeometry args={[0.18, 0.22, 0.6, 10]} /><meshStandardMaterial color={i < made ? '#9aff9a' : '#3a3a44'} emissive={i < made ? '#2a8a4a' : '#000'} emissiveIntensity={0.5} transparent opacity={0.85} /></mesh>)}
        <Tag position={[0, 1.9, 0]} df={10}>{`CH₃Cl made: ${Math.min(made, CHAIN.need)} / ${CHAIN.need}`}</Tag>
      </group>
      <Carried world={world} what={carry} />
      <Wisps world={world} spawns={[[-4, -66], [5, -76]]} active={!!solved['t6-door']} zone={[-86, -62]} />
      <Gate world={world} pos={[0, 0, -86]} size={[2 * W, 7, 0.8]} open={!!solved['6-3']} color="#4a5a7a" glow="#ff9a6a" />

      {/* 6-4 the Ledger of Bonds */}
      <Chest world={world} pos={[3, 0, -98]} big opened={!!solved['t6-boots']} show={!!solved['6-4']} onOpen={() => openChest('t6-boots')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -104]} size={[2 * W, 7, 0.8]} open={!!solved['t6-boots']} color="#4a5a7a" glow="#ffd760" />

      {/* 6-5 the Twin Passes */}
      <group position={[PASS_ROOM.vent[0], 0, PASS_ROOM.vent[1]]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.2, 24]} /><meshStandardMaterial color="#ffb04a" emissive="#ff7a1a" emissiveIntensity={1.2} /></mesh>
        <pointLight position={[0, 1, 0]} color="#ffb04a" intensity={3} distance={6} />
        <Tag position={[0, 2.2, 0]} df={10}>{`heat vent · room temperature · ${ROOM_T} kJ/mol`}</Tag>
      </group>
      <Ridge world={world} route={PASSES.direct} x={RIDGE_X.direct} z0={PASS_Z.z0} z1={PASS_Z.z1} meter={() => meterRef.current} label={`The direct way · highest pass ${highestTS(PASSES.direct)} kJ/mol`} onEnd={() => passCrossed('direct')} />
      <Ridge world={world} route={PASSES.enzyme} x={RIDGE_X.enzyme} z0={PASS_Z.z0} z1={PASS_Z.z1} meter={() => meterRef.current} label={`The enzyme way · highest pass ${highestTS(PASSES.enzyme)} kJ/mol`} color="#d8f0e8" onEnd={() => passCrossed('enzyme')} />
      <Tag position={[0, 5.5, -108]} df={12}>{save.hasBoots ? `your boots: ${meter} kJ/mol` : 'the boots are back in the Ledger room'}</Tag>
      <Chest world={world} pos={[0, 0, -137]} big opened={!!solved['t6-bosskey']} show={!!solved['6-5']} onOpen={() => openChest('t6-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -140]} size={[2 * W, 7, 0.8]} open={!!solved['t6-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS6).map(([id, st]) => (
        <Station key={id} world={world} pos={st.pos} label={solved[id] && ['6-2arrows', '6-4ledger'].includes(id) ? null : st.label} enabled={!(solved[id] && ['6-2arrows', '6-4ledger'].includes(id))} solved={!!solved[id === '6-4ledger' ? '6-4' : id]}
          onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id === '6-4ledger' ? '6-4' : id); if (id === '6-2arrows') toast('A little chest appears by the door.', 'good', 2600); if (id === '6-4ledger') { sfx('open'); toast('The scale settles. A big chest rises.', 'good', 2800) } }} />
      ))}

      {/* boss */}
      {!solved.boss6 && <Wyrm world={world} center={WYRM.center} active={bossOn && !solved.boss6} onDefeated={bossDown} />}
      <Shard show={!!solved.boss6 && (save.shards || 0) < 6} pos={[0, 0, -174]} />
      <Motes count={200} area={[20, 7, 180]} center={[0, 0.3, -85]} color="#ffffff" size={0.05} />
      {hammondHere && <Hammond position={[-2.2, 0, -172.4]} rotation={[0, Math.PI / 2, 0]} />}
      <PiFollower world={world} />
    </group>
  )
}

export default function Caves({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'caves' ? ROOMS6.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#14121e" camDist={6.2}>
      {(world) => <CavesLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
