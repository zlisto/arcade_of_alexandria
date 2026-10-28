import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Hydra10, { Magnus, Golems } from '../actors/MarshFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { CX, CX_ORDER, CH_BDE, CYCLO_H, SPRINGS, ALC_REAGENTS, convert } from '../chem/rules10'
import { W10 as W, ROOMS10, STATIONS10, BOG, ALLYL, SPRINGS_POS, FORGE10, GOALS10, HYDRA } from '../data/dungeon10'

// Dungeon 10 — The Sunken Forge (Chapter 10, Organohalides). Rooms along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Magnesium Ring in a big chest, a Boss Key.
// Puzzles: bond stones by strength (§10.1); predicting a radical hunt (§10.2); the weakest C–H and the shared
// allyl electron (§10.3–10.4); alcohols to halides (§10.5); Grignards, a Gilman coupling, oxidation levels (§10.6–10.8).

preloadModels('marsh', 'magnus')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-132, -172] }
const padXZ = (k) => { const a = (k / 6) * Math.PI * 2; return [ALLYL.centre[0] + Math.sin(a) * ALLYL.R, ALLYL.centre[1] - Math.cos(a) * ALLYL.R] }
const STAND = SPRINGS_POS.stand
const FLASKS10 = Object.keys(ALC_REAGENTS).map((id, i) => [id, STAND[0] + (i % 2) * 1.6, STAND[1] - Math.floor(i / 2) * 1.8])

function Walls({ world }) {
  const parts = useModelParts('marsh')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -130; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -134; z > -170; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -132], [-W, 9, 8]), world.addSolid([W, -9, -132], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -133], [-W, 9, -131]), world.addSolid([W, -9, -133], [ARENA.x, 9, -131]),
      ...['10-4a', '10-4b', '10-4c'].map((id) => { const [x, z] = SPRINGS_POS[id]; return world.addSolid([x - 0.9, 0, z - 0.9], [x + 0.9, 1.0, z + 0.9]) }),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="f10_wall" items={items} />
}

function Carried({ world, label, color }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.3 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!label) return null
  return (
    <group ref={g}>
      <mesh><icosahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
      <pointLight color={color} intensity={1.2} distance={3.5} />
      <Tag position={[0, 0.6, 0]} df={9}>{label}</Tag>
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

function SunkenLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [stone, setStone] = useState(null)
  const stoneRef = useRef(null)
  stoneRef.current = stone
  const [magnusHere, setMagnusHere] = useState(false)
  const laid = save.t10laid || []
  const ends = save.t10ends || {}
  const held = save.t10flask || null

  useEffect(() => {
    world.map = {
      floor: '#6a7a5a', wall: '#2a3424', pit: '#1a1a10',
      labels: ROOMS10.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t10-map']) return null; const seen = sv.t10seen || {}; return ROOMS10.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t10-compass']) return null
        const g = GOALS10.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 10) return { pos: [0, -166], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Marsh' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('sunken')
    world.killY = -6
    const f = [world.addFloor(-W, BOG.z[0], W, 8, 0), world.addFloor(-W, -132, W, BOG.z[1], 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -131, 0)]
    const HINTS = {
      '10-1': 'A bog, and four bond stones. Some sink deeper than others.',
      '10-2': 'Gates that want numbers. Count the hydrogens!',
      '10-3': 'A ring on the floor with lamps on every hydrogen. Which one breaks easiest?',
      '10-4': 'Three springs of alcohol, and a rack of reagents.',
      '10-5': 'Golems. Hitting them does nothing… yet.',
    }
    const t = ROOMS10.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t10seen || {}
      saveGame({ checkpoint: { scene: 'sunken', room: r.id }, t10seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -138], [6, 6, -134], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t10-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Marsh', onInteract: () => onExit('marsh', { scene: 'marsh', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -103.2], radius: 2.2, label: () => (has('t10-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -131.2], radius: 2.4, label: () => (has('t10-bossdoor') ? null : 'Unlock the pool door'), onInteract: () => unlockBossDoor() }),
    ]
    // 10-1: pick up a stone; lay it in the next socket
    CX.forEach((c, i) => {
      const [x, z] = BOG.stones[i]
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.2, label: () => (stoneRef.current || (getState().save.t10laid || []).includes(c.id) ? null : `Pick up the ${c.bond} stone`), onInteract: () => { setStone(c.id); sfx('pickup') } }))
    })
    ia.push(world.addInteractable({ pos: [0, 0, BOG.z[0] + 0.8], radius: 2.4, label: () => (stoneRef.current ? 'Lay the stone in the next socket' : null), onInteract: () => layStone() }))
    // 10-3: strike an H lamp
    const targets = CYCLO_H.map((h, k) => { const [x, z] = padXZ(k); return world.addTarget({ pos: () => [x, 1.6, z], radius: 0.5, tall: 0.8, alive: () => !has('10-3a'), onHit: () => strikeH(h) }) })
    ;['left', 'right'].forEach((side) => { const [x, z] = ALLYL.doors[side]; ia.push(world.addInteractable({ pos: [x, 0, z + 1.2], radius: 1.8, label: () => (has('10-3a') && !(getState().save.t10ends || {})[side] ? 'Let Br₂ meet the radical at this end' : null), onInteract: () => brominate(side) })) })
    // 10-4: flasks and springs
    FLASKS10.forEach(([id, x, z]) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.0, label: () => (getState().save.hasSatchel && getState().save.t10flask !== id ? `Take the flask: ${ALC_REAGENTS[id]}` : null), onInteract: () => { saveGame({ t10flask: id }); sfx('pickup') } })))
    const lanterns = SPRINGS.map((sp) => { const [x, z] = SPRINGS_POS[sp.id]; return world.addLantern({ needs: 'hasSatchel', omni: true, pos: [x, 0, z], radius: 2.8, label: () => (has(sp.id) || !getState().save.t10flask ? null : `Pour ${ALC_REAGENTS[getState().save.t10flask]} into the ${sp.alcohol}`), onLantern: () => pourSpring(sp) }) })
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS10.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...targets, ...lanterns].forEach((i) => world.remove(i)) }
  }, [world])

  // laid stones are floor across the bog
  useEffect(() => {
    const ids = laid.map((_, k) => { const z = BOG.sockets[k][1]; return world.addFloor(-1.2, z - 1.45, 1.2, z + 1.45, 0) })
    if (laid.length === 4) ids.push(world.addFloor(-1.2, BOG.z[1], 1.2, BOG.sockets[3][1] - 1.4, 0), world.addFloor(-1.2, BOG.sockets[0][1] + 1.4, 1.2, BOG.z[0], 0))
    return () => ids.forEach((i) => world.remove(i))
  }, [world, laid.length])

  // ---------------------------------------------------------------- actions
  const layStone = () => {
    const id = stoneRef.current
    if (!id) return
    const cur = getState().save.t10laid || []
    const want = CX_ORDER[cur.length]
    const c = CX.find((x) => x.id === id), w = CX.find((x) => x.id === want)
    setStone(null)
    if (id !== want) { sfx('wrong'); toast(`The ${c.bond} stone sinks: ${c.D} kJ/mol, ${c.len} pm. A longer, weaker bond. The next socket wants a stronger one.`, 'warn', 5200); return }
    const next = [...cur, id]
    saveGame({ t10laid: next }); sfx('right')
    toast(`${c.bond}: ${c.D} kJ/mol, ${c.len} pm. It holds.`, 'good', 2800)
    if (next.length === 4) { markSolved('10-1'); sfx('open'); toast('Strongest to weakest: C–F, C–Cl, C–Br, C–I. Down the group, longer and weaker.', 'good', 4600) }
  }
  const strikeH = (h) => {
    if (has('10-3a')) return false
    if (h.kind !== 'allylic') {
      sfx('block')
      toast(h.kind === 'vinylic' ? `C${h.c}–H is vinylic, on the double bond itself: ${CH_BDE.vinylic} kJ/mol, the strongest here.` : `C${h.c}–H is an ordinary secondary C–H: ${CH_BDE.secondary} kJ/mol. One of its neighbours is weaker.`, 'warn', 4800)
      return true
    }
    markSolved('10-3a'); sfx('open')
    setTimeout(() => say([
      { who: 'Pi', text: `C${h.c}–H snapped: the allylic one, only ${CH_BDE.allylic} kJ/mol! NBS does exactly this (§10.3).` },
      { who: 'Pi', text: 'Look at the radical, though. Its glow is on both ends at once, shared equally (Fig 10.5).' },
      { who: 'Pi', text: 'So the bromine can land at either end. Both doors!' },
    ]), 400)
    return true
  }
  const brominate = (side) => {
    const e = { ...(getState().save.t10ends || {}), [side]: true }
    saveGame({ t10ends: e }); sfx('right')
    toast(side === 'left' ? 'Br bonds at this end of the allyl radical.' : 'And at the other end too: the same radical, a different product.', 'good', 3200)
    if (e.left && e.right && !has('10-3b')) {
      markSolved('10-3b'); sfx('open')
      setTimeout(() => say([{ who: 'Pi', text: 'Two products from one radical: 1-octene with NBS gives 3-bromo-1-octene and 1-bromo-2-octene, just like this.' }, { who: 'Pi', text: 'A big chest!' }]), 500)
    }
  }
  const pourSpring = (sp) => {
    if (has(sp.id)) return
    const f = getState().save.t10flask
    if (!f) return
    saveGame({ t10flask: null })
    const r = convert(sp, f)
    if (r.ok) { markSolved(sp.id); sfx('open'); toast(r.text, 'good', 5200) } else { sfx('wrong'); toast(r.text, 'warn', 5600) }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: My radicals strike at random. No hydrogen is safe, and none is likelier than any other.' },
      { who: 'Pi', text: 'Magnus scratched “COUNT THEM” underneath. Twice.' },
    ])
    markSolved('t10-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t10-door')) return
    if (!getState().save.t10key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t10key: false }); markSolved('t10-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t10-bossdoor')) return
    if (!has('t10-bosskey')) { toast('Something splashes beyond this door. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t10-bossdoor'); sfx('open'); toast('The Boss Key turns. Two hisses answer, from two directions…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't10-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't10-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't10-key') { saveGame({ t10key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't10-ring') {
      saveGame({ hasRing: true })
      await itemGet(world, { model: 'magnus', name: 't10_ring', scale: 3, color: '#e8f0ff' }, [
        { who: '', text: 'You got the Magnesium Ring!' },
        { who: 'Pi', text: 'Aim it at a carbon–halogen bond and press G: magnesium slides right in. R–X becomes R–MgX.' },
        { who: 'Pi', text: 'The carbon flips from δ+ to δ−. A Grignard reagent! Very strong base. Keep it away from water…' },
      ])
    }
    if (id === 't10-bosskey') { saveGame({ t10bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss10') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -135]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t10bossIntro) {
      saveGame({ t10bossIntro: true })
      world.camOverride = { pos: [4, 5, -137], look: [HYDRA.center[0], 2, HYDRA.center[2]] }
      await say([
        { who: 'Pi', text: 'The Allylic Hydra! Two heads, one body… and one unpaired electron glowing between them.' },
        { who: 'Pi', text: 'Hit one head and the other still has it. It’s shared! Hit both, quick.' },
        { who: 'Pi', text: 'Then its tail: that’s a C–Br. You know what the ring does to those.' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Both heads, fast. Then the tail!' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss10')
    playMusic('sunken')
    await say([
      { who: 'Pi', text: 'Protonated! It’s just a hydrocarbon now, floating in the pool.' },
      { who: 'Pi', text: 'The spark went south, toward a red glow. Volcanoes? The shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 10 || busy.current) return
    busy.current = true
    sfx('shard')
    setMagnusHere(true)
    if (world.player) world.player.teleport([0, 0, -164.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -164.4], 3.8, Math.PI / 2)
    await say([{ who: 'Old Magnus', text: 'Waded all the way down here. One question, boy, and then it’s yours.' }])
    const ok = await openPanel('hydraCheck', {})
    if (!ok) { await say([{ who: 'Old Magnus', text: 'Count first. Answer after.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 10, checkpoint: { scene: 'marsh', at: 'gate' } })
    setState({ objective: 'Bond Shard 10 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… ten. The marsh mist is lifting. I can almost see the Keep from here.' },
      { who: 'Princess Octavia', text: 'He said his radicals strike at random. You counted every one.' },
      { who: 'Old Magnus', text: 'Keep the ring. Walden’s arena is south. Five gates, five ways a halide can leave.' },
      { who: 'Pi', text: 'Ten down, two to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'marsh', at: 'gate' }, card: 10 })
    busy.current = false
    onExit('marsh', { scene: 'marsh', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -166], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss10 && (getState().save.shards || 0) < 10)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 7, pitchSet: 0.45, lookY: 1.6 } : null })

  const st = stone ? CX.find((c) => c.id === stone) : null
  return (
    <group>
      <color attach="background" args={['#161c14']} />
      <fog attach="fog" args={['#222a1e', 16, 66]} />
      <hemisphereLight args={['#d8f0c8', '#1e2418', 0.85]} />
      <ambientLight intensity={0.3} color="#e0f0d8" />
      <directionalLight position={[10, 40, -60]} intensity={0.7} color="#e8f8e0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      {[[8, BOG.z[0]], [BOG.z[1], -132]].map(([a, b], i) => <mesh key={i} position={[0, -0.01, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, Math.abs(a - b)]} /><meshStandardMaterial color="#5a6450" roughness={0.95} /></mesh>)}
      <mesh position={[0, -0.01, -152]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial color="#4a5440" roughness={0.95} /></mesh>
      <mesh position={[0, -0.6, (BOG.z[0] + BOG.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, Math.abs(BOG.z[0] - BOG.z[1])]} /><meshStandardMaterial color="#3a3020" metalness={0.2} roughness={0.3} /></mesh>
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -40, -52, -64, -76, -88, -100, -112, -124].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#9aff8a" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3a2a" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t10-map']} onOpen={() => openChest('t10-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Sunken Forge</Tag>

      {/* 10-1 the naming bog */}
      <Suspense fallback={null}>
        {CX.map((c, i) => {
          const [x, z] = BOG.stones[i]
          if (laid.includes(c.id) || stone === c.id) return null
          return <group key={c.id} position={[x, 0, z]}><Part model="marsh" name="f10_stone" scale={0.8} /><Tag position={[0, 1.4, 0]} df={9} far={12}>{`${c.bond} · ${c.len} pm`}</Tag></group>
        })}
        {laid.map((id, k) => { const c = CX.find((x) => x.id === id); return <group key={id} position={[BOG.sockets[k][0], -0.3, BOG.sockets[k][1]]}><Part model="marsh" name="f10_stone" scale={[1.3, 1, 1.5]} /><Tag position={[0, 1.6, 0]} df={9} far={12}>{`${c.bond} · ${c.D} kJ/mol`}</Tag></group> })}
      </Suspense>
      {BOG.sockets.slice(laid.length).map(([x, z], k) => <mesh key={k} position={[x, -0.5, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1.1, 24]} /><meshBasicMaterial color="#c8ffb0" transparent opacity={0.4} /></mesh>)}
      {st && <Carried world={world} label={`${st.bond} stone`} color="#8a9a7a" />}

      {/* 10-2 the hunt */}
      <Chest world={world} pos={[7.6, 0, -38]} rotY={-Math.PI / 2} opened={!!solved['t10-compass']} onOpen={() => openChest('t10-compass')} />
      <Gate world={world} pos={[0, 0, -57.5]} size={[2 * W, 7, 0.8]} open={!!(solved['10-2a'] && solved['10-2b'])} color="#3a4a32" glow="#c8ffb0" />

      {/* 10-3 the allyl crossing: a cyclohexene ring of pads, an H lamp on each carbon */}
      {CYCLO_H.map((h, k) => {
        const [x, z] = padXZ(k)
        return (
          <group key={k} position={[x, 0, z]}>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.9, 20]} /><meshStandardMaterial color={solved['10-3a'] && (k === 0 || k === 2 || k === 1) ? '#ffe8a0' : '#5a5e4a'} emissive={solved['10-3a'] && k !== 1 && (k === 0 || k === 2) ? '#a08a3a' : '#000'} emissiveIntensity={0.6} /></mesh>
            {!solved['10-3a'] && <><mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.05, 0.05, 1.4, 6]} /><meshStandardMaterial color="#8a8a7a" /></mesh><mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color="#f2f2f2" emissive="#bfe8ff" emissiveIntensity={0.8} /></mesh></>}
            <Tag position={[0, 2.2, 0]} df={8} far={12}>{`C${h.c}`}</Tag>
          </group>
        )
      })}
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const [x1, z1] = padXZ(k), [x2, z2] = padXZ((k + 1) % 6), L = Math.hypot(x2 - x1, z2 - z1), dbl = k === 0
        return [0, ...(dbl ? [0.35] : [])].map((off) => <mesh key={k + '-' + off} position={[(x1 + x2) / 2 + off * (z2 - z1) / L, 0.12, (z1 + z2) / 2 - off * (x2 - x1) / L]} rotation={[0, -Math.atan2(z2 - z1, x2 - x1), Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, L - 1.6, 8]} /><meshStandardMaterial color={dbl ? '#5ff0ff' : '#c8c8b8'} emissive={dbl ? '#2ab0d0' : '#000'} emissiveIntensity={0.8} /></mesh>)
      })}
      <Tag position={[ALLYL.centre[0], 3.0, ALLYL.centre[1]]} df={11} far={18}>{solved['10-3a'] ? 'an allylic radical: the electron spread over C1 and C3' : 'cyclohexene · C1=C2'}</Tag>
      {['left', 'right'].map((side) => { const [x, z] = ALLYL.doors[side]; return (
        <group key={side} position={[x, 0, z]}>
          <mesh position={[0, 1.8, 0]}><boxGeometry args={[3.0, 3.6, 0.4]} /><meshStandardMaterial color={ends[side] ? '#8a4a2a' : solved['10-3a'] ? '#c8a050' : '#3a3a32'} emissive={solved['10-3a'] && !ends[side] ? '#6a5a20' : '#000'} emissiveIntensity={0.5} /></mesh>
          <Tag position={[0, 4.1, 0]} df={10} far={14}>{ends[side] ? 'Br bonded here' : side === 'left' ? 'one end of the radical' : 'the other end'}</Tag>
        </group>
      ) })}
      <Chest world={world} pos={[0, 0, -79.5]} big opened={!!solved['t10-ring']} show={!!solved['10-3b']} onOpen={() => openChest('t10-ring')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -82]} size={[2 * W, 7, 0.8]} open={!!solved['t10-ring']} color="#3a4a32" glow="#e8f0ff" />

      {/* 10-4 the alcohol spring */}
      {FLASKS10.map(([id, x, z]) => (
        <group key={id} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.25, 0.3, 0.8, 10]} /><meshStandardMaterial color="#5a5e4a" /></mesh>
          {held !== id && <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.36, 10]} /><meshStandardMaterial color="#c8e8d0" emissive="#6a9a7a" emissiveIntensity={0.5} transparent opacity={0.9} /></mesh>}
          <Tag position={[0, 1.7, 0]} df={8} far={10}>{ALC_REAGENTS[id]}</Tag>
        </group>
      ))}
      {SPRINGS.map((sp) => { const [x, z] = SPRINGS_POS[sp.id]; return (
        <group key={sp.id} position={[x, 0, z]}>
          <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.9, 1.0, 0.9, 16]} /><meshStandardMaterial color="#6a6e5a" /></mesh>
          <mesh position={[0, 0.92, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.8, 20]} /><meshStandardMaterial color={solved[sp.id] ? '#9affb8' : '#9ac8e8'} metalness={0.3} roughness={0.2} /></mesh>
          <Tag position={[0, 2.4, 0]} df={9} far={14}>{`wants: ${sp.want}`}</Tag>
          <Tag position={[0, 1.9, 0]} df={10} far={14} className={solved[sp.id] ? 'ok-tag' : ''}>{solved[sp.id] ? sp.want : `${sp.alcohol} (${sp.kind})`}</Tag>
        </group>
      ) })}
      {held && <Carried world={world} label={ALC_REAGENTS[held]} color="#c8e8d0" />}
      <Chest world={world} pos={[0, 0, -102]} opened={!!solved['t10-key']} show={!!(solved['10-4a'] && solved['10-4b'] && solved['10-4c'])} onOpen={() => openChest('t10-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -104]} size={[2 * W, 7, 0.8]} open={!!solved['t10-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -103.6]} df={13}>{solved['t10-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 10-5 the metal forge */}
      <mesh position={[FORGE10.pool[0], 0.03, FORGE10.pool[1]]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3, 24]} /><meshStandardMaterial color="#4a6a7a" metalness={0.3} roughness={0.2} /></mesh>
      <Golems world={world} spawns={FORGE10.golems} active={!!solved['t10-door'] && !solved['10-5g']} zone={[-104, -132]} onCleared={() => { if (!has('10-5g')) { markSolved('10-5g'); sfx('open'); toast('Both golems protonated. The forge is quiet.', 'good', 3000) } }} />
      <Chest world={world} pos={[0, 0, -129.5]} big opened={!!solved['t10-bosskey']} show={!!(solved['10-5g'] && solved['10-5gilman'] && solved['10-5ox'])} onOpen={() => openChest('t10-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -132]} size={[2 * W, 7, 0.8]} open={!!solved['t10-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS10).map(([id, st]) => {
        const once = id !== '10-1info'
        return <Station key={id} world={world} pos={st.pos} label={once && solved[id] ? null : st.label} enabled={!(once && solved[id])} solved={!!solved[id]} onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id) }} />
      })}

      {/* boss */}
      {!solved.boss10 && <Hydra10 world={world} center={HYDRA.center} active={bossOn && !solved.boss10} onDefeated={bossDown} />}
      {magnusHere && <Magnus position={[-2.2, 0, -164.4]} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss10 && (save.shards || 0) < 10} pos={[0, 0, -166]} />
      <Motes count={160} area={[20, 6, 170]} center={[0, 0.6, -80]} color="#c8ffb0" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Sunken({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'sunken' ? ROOMS10.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#161c14" camDist={6.2}>
      {(world) => <SunkenLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
