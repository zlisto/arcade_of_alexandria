import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Sorcerer, { Spectra, Phantoms } from '../actors/SummitFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { PLAQUES, BELLS } from '../chem/rules12'
import { W12 as W, ROOMS12, STATIONS12, PLAQUE_POS, ISO_DOORS, BELL_POS, GOALS12, SORC } from '../data/dungeon12'

// Dungeon 12 — the Observatory of Light (Chapter 12, Mass Spectrometry and Infrared Spectroscopy). Rooms along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Spectra Lens in a big chest, a Boss Key.
// Puzzles: hexane's fragments and two unlabeled samples (§12.1–12.2); isotope plaques to their doors (§12.3); the
// dome's lens on the IR band (§12.5); IR bells named by their bands (§12.6–12.8); the Disguised Sorcerer.

preloadModels('spectra', 'intro')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-110, -150] }

function Walls({ world }) {
  const parts = useModelParts('spectra')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -108; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -112; z > -148; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -110], [-W, 9, 8]), world.addSolid([W, -9, -110], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -111], [-W, 9, -109]), world.addSolid([W, -9, -111], [ARENA.x, 9, -109]),
      ...Object.values(BELL_POS).map(([x, z]) => world.addSolid([x - 1.0, 0, z - 0.2], [x + 1.0, 2.8, z + 0.2])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="o12_wall" items={items} />
}

function Carried({ world, label }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.3 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!label) return null
  return (
    <group ref={g}>
      <mesh><boxGeometry args={[0.7, 0.5, 0.06]} /><meshStandardMaterial color="#e8d8b0" /></mesh>
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

function ObsLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [plaque, setPlaque] = useState(null)
  const plaqueRef = useRef(null)
  plaqueRef.current = plaque
  const [spectraHere, setSpectraHere] = useState(false)
  const placed = save.t12placed || {}
  const rung = save.t12bells || {}

  useEffect(() => {
    world.map = {
      floor: '#c8c4d0', wall: '#2a2a3a', pit: '#0e0e18',
      labels: ROOMS12.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t12-map']) return null; const seen = sv.t12seen || {}; return ROOMS12.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t12-compass']) return null
        const g = GOALS12.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 12) return { pos: [0, -144], label: 'Take the last Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Summit' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('observatory')
    world.killY = -8
    const f = [world.addFloor(-W, -110, W, 8, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -109, 0)]
    const HINTS = {
      '12-1': 'A great magnet bending broken molecules round an arc. Heavier pieces curve less!',
      '12-2': 'Plaques with twin peaks, and doors for chlorine, bromine and nitrogen.',
      '12-3': 'The dome’s lens. Which light makes bonds ring?',
      '12-4': 'Bells! Each one is a molecule. The Lens will show what each one rings at.',
    }
    const t = ROOMS12.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t12seen || {}
      saveGame({ checkpoint: { scene: 'observatory', room: r.id }, t12seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -116], [6, 6, -112], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t12-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Summit', onInteract: () => onExit('summit', { scene: 'summit', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -83.2], radius: 2.2, label: () => (has('t12-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -109.2], radius: 2.4, label: () => (has('t12-bossdoor') ? null : 'Unlock the telescope door'), onInteract: () => unlockBossDoor() }),
    ]
    // 12-2 plaques and doors
    PLAQUES.forEach((pl) => { const [x, z] = PLAQUE_POS[pl.id]; ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.2, label: () => (plaqueRef.current || (getState().save.t12placed || {})[pl.id] ? null : `Take the plaque: M ${pl.M}${pl.M2 ? `, M + 2 ${pl.M2}` : ''}`), onInteract: () => { setPlaque(pl.id); sfx('pickup') } })) })
    Object.entries(ISO_DOORS).forEach(([door, [x, z]]) => ia.push(world.addInteractable({ pos: [x, 0, z + 1.2], radius: 1.6, label: () => (plaqueRef.current ? `Hang it on the ${door} door` : null), onInteract: () => hang(door) })))
    // 12-4 bells: the Lens shows a bell's spectrum; then name it
    const lanterns = BELLS.map((b) => { const [x, z] = BELL_POS[b.id]; return world.addLantern({ needs: 'hasLens', omni: true, pos: [x, 0, z], radius: 3.2, label: () => ((getState().save.t12bells || {})[b.id] ? null : 'Turn the Spectra Lens on the bell'), onLantern: () => ringBell(b) }) })
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS12.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...lanterns].forEach((i) => world.remove(i)) }
  }, [world])

  // ---------------------------------------------------------------- actions
  const hang = (door) => {
    const id = plaqueRef.current
    if (!id) return
    const pl = PLAQUES.find((x) => x.id === id)
    setPlaque(null)
    if (pl.door !== door) { sfx('wrong'); toast(`The plaque slides off. M ${pl.M}${pl.M2 ? ` and M + 2 ${pl.M2} at ${pl.ratio}` : `, ${pl.ratio}`}: what does that pattern mean?`, 'warn', 5200); return }
    const next = { ...(getState().save.t12placed || {}), [id]: door }
    saveGame({ t12placed: next }); sfx('right')
    toast(`${pl.name}: ${pl.note}`, 'good', 5200)
    if (Object.keys(next).length === 3 && !has('12-2')) { markSolved('12-2'); sfx('open'); toast('All three doors open. A big chest stands behind them.', 'good', 3000) }
  }
  const ringBell = async (b) => {
    if ((getState().save.t12bells || {})[b.id] || busy.current) return
    busy.current = true
    sfx('stance')
    const ok = await openPanel('bell', { bell: b.id })
    busy.current = false
    if (!ok) return
    const next = { ...(getState().save.t12bells || {}), [b.id]: true }
    saveGame({ t12bells: next }); sfx('right')
    if (BELLS.every((x) => next[x.id]) && !has('12-4')) { markSolved('12-4'); sfx('open'); setTimeout(() => say([{ who: 'Pi', text: 'Five bells, five families, just from where they ring!' }, { who: 'Pi', text: 'A big chest by the telescope door.' }]), 500) }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: No one can ever know what I truly am. Do not try.' },
      { who: 'Pi', text: 'Spectra has drawn a little rainbow on it.' },
    ])
    markSolved('t12-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t12-door')) return
    if (!getState().save.t12key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t12key: false }); markSolved('t12-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t12-bossdoor')) return
    if (!has('t12-bosskey')) { toast('Violet light leaks round this door. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t12-bossdoor'); sfx('open'); toast('The Boss Key turns. Someone laughs, in a voice you know…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't12-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't12-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't12-key') { saveGame({ t12key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't12-lens') {
      saveGame({ hasLens: true })
      await itemGet(world, { model: 'spectra', name: 't12_lens', scale: 2.4, color: '#bff4ff' }, [
        { who: '', text: 'You got the Spectra Lens!' },
        { who: 'Pi', text: 'Point it at a molecule and press G: you’ll see where it soaks up infrared light.' },
        { who: 'Pi', text: 'Every kind of bond rings at its own number. Read the numbers, name the bonds.' },
      ])
    }
    if (id === 't12-bosskey') { saveGame({ t12bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss12') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -113]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t12bossIntro) {
      saveGame({ t12bossIntro: true })
      world.camOverride = { pos: [3, 3.5, -115], look: [SORC.center[0], 2.2, SORC.center[2]] }
      await say([
        { who: 'Malradix', text: 'Little knight. You’ve come all this way to look at me, and you still don’t know what you see.' },
        { who: 'Pi', text: 'It’s him, wrapped in a false shape! Weigh him on the crystals. Then the Lens.' },
        { who: 'Pi', text: 'And watch for his rings of light. Roll through them!' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Weigh him, look at him, name him!' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss12')
    playMusic('observatory')
    await say([
      { who: 'Malradix', text: 'Mass… and light… Enough. Come to the Keep, then, if you can find the door.' },
      { who: 'Pi', text: 'He’s gone, but he dropped it. The last Bond Shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 12 || busy.current) return
    busy.current = true
    sfx('shard')
    setSpectraHere(true)
    if (world.player) world.player.teleport([0, 0, -142.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -142.4], 3.8, Math.PI / 2)
    await say([{ who: 'Astronomer Spectra', text: 'You saw him for what he is. One question, and the last shard is yours.' }])
    const ok = await openPanel('finalCheck', {})
    if (!ok) { await say([{ who: 'Astronomer Spectra', text: 'Look again. The light will wait.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 12, checkpoint: { scene: 'summit', at: 'gate' } })
    setState({ objective: 'All twelve Bond Shards recovered' })
    await say([
      { who: '', text: 'The twelfth shard glows warm in Kai’s hands, and the other eleven answer it…' },
      { who: 'Princess Octavia', text: 'Kai! Twelve! The wards on the Keep are breaking. I can hear them crack.' },
      { who: 'Princess Octavia', text: 'He said no one could know what he is. You named him, three times over.' },
      { who: 'Astronomer Spectra', text: 'The Keep’s gate will open to you now. Look carefully in there. As you did here.' },
      { who: 'Pi', text: 'Twelve! All of them! Malradix, ready or not!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'summit', at: 'gate' }, card: 12 })
    busy.current = false
    onExit('summit', { scene: 'summit', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -144], radius: 2.6, label: 'Take the last Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss12 && (getState().save.shards || 0) < 12)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 7.5, pitchSet: 0.45, lookY: 1.8 } : null })

  const pl = plaque ? PLAQUES.find((x) => x.id === plaque) : null
  return (
    <group>
      <color attach="background" args={['#0e1024']} />
      <fog attach="fog" args={['#1a1c34', 18, 70]} />
      <hemisphereLight args={['#d8e0ff', '#1a1c34', 0.85]} />
      <ambientLight intensity={0.35} color="#e0e8ff" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#e8f0ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <mesh position={[0, -0.01, -51]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, 118]} /><meshStandardMaterial color="#b8b4c4" roughness={0.8} /></mesh>
      <mesh position={[0, -0.01, -130]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial color="#8a8ea0" roughness={0.8} /></mesh>
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -24, -36, -48, -60, -72, -90, -102].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#bfe0ff" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3a4a" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t12-map']} onOpen={() => openChest('t12-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Observatory of Light</Tag>

      {/* 12-1 the weighing hall: a great magnet and its arc */}
      <group position={[0, 0, -32]}>
        <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[4, 0.5, 12, 40, Math.PI]} /><meshStandardMaterial color="#c83a3a" metalness={0.6} roughness={0.4} /></mesh>
        {[71, 57, 43, 29].map((mz, i) => <group key={mz} position={[-3 + i * 2, 0, 3]}><mesh position={[0, 0.3, 0]}><boxGeometry args={[1.4, 0.6, 1.0]} /><meshStandardMaterial color="#8a8ea0" /></mesh><Tag position={[0, 1.0, 0]} df={8} far={12}>{`m/z ${mz}`}</Tag></group>)}
      </group>
      <Gate world={world} pos={[0, 0, -37.5]} size={[2 * W, 7, 0.8]} open={!!(solved['12-1a'] && solved['12-1b'])} color="#3a3a5a" glow="#ff6a6a" />

      {/* 12-2 the isotope gallery */}
      {PLAQUES.map((p) => { const [x, z] = PLAQUE_POS[p.id]; if (placed[p.id] || plaque === p.id) return null; return (
        <group key={p.id} position={[x, 0, z]}>
          <mesh position={[0, 0.6, 0]}><boxGeometry args={[0.8, 1.2, 0.4]} /><meshStandardMaterial color="#6a6e80" /></mesh>
          <mesh position={[0, 1.5, 0]}><boxGeometry args={[0.9, 0.6, 0.06]} /><meshStandardMaterial color="#e8d8b0" /></mesh>
          <Tag position={[0, 2.2, 0]} df={8} far={12}>{`M ${p.M}${p.M2 ? ` · M+2 ${p.M2} · ${p.ratio}` : ' · no M+2'}`}</Tag>
        </group>
      ) })}
      {Object.entries(ISO_DOORS).map(([door, [x, z]]) => { const done = Object.values(placed).includes(door); return (
        <group key={door} position={[x, 0, z]}>
          <mesh position={[0, 1.8, 0]}><boxGeometry args={[2.8, 3.6, 0.3]} /><meshStandardMaterial color={done ? '#9affb8' : '#4a4e66'} emissive={done ? '#2a8a4a' : '#000'} emissiveIntensity={0.4} /></mesh>
          <Tag position={[0, 4.0, 0]} df={10} far={14}>{`the ${door} door`}</Tag>
        </group>
      ) })}
      {pl && <Carried world={world} label={`plaque: M ${pl.M}${pl.M2 ? `, M+2 ${pl.M2}` : ''}`} />}
      <Chest world={world} pos={[0, 0, -59.5]} big opened={!!solved['t12-lens']} show={!!solved['12-2']} onOpen={() => openChest('t12-lens')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -62]} size={[2 * W, 7, 0.8]} open={!!solved['t12-lens']} color="#3a3a5a" glow="#bff4ff" />

      {/* 12-3 the spectrum dome */}
      <Chest world={world} pos={[-7.6, 0, -66]} rotY={Math.PI / 2} opened={!!solved['t12-compass']} onOpen={() => openChest('t12-compass')} />
      <group position={[0, 0, -76]}>
        {['#ff4a4a', '#ff9a3a', '#ffe04a', '#6aff6a', '#4ab0ff', '#7a5aff'].map((c, i) => <mesh key={c} position={[-5 + i * 2, 4.5, 0]}><boxGeometry args={[1.8, 0.4, 0.2]} /><meshBasicMaterial color={c} transparent opacity={solved['12-3'] && i === 0 ? 1 : 0.6} toneMapped={false} /></mesh>)}
        <mesh position={[-7.4, 4.5, 0]}><boxGeometry args={[1.0, 0.4, 0.2]} /><meshBasicMaterial color={solved['12-3'] ? '#ff3a6a' : '#3a1a2a'} toneMapped={false} /></mesh>
        <Tag position={[-7.4, 5.3, 0]} df={9} far={16}>IR</Tag>
      </group>
      <Phantoms world={world} spawns={[[-4, -70], [4, -76]]} active={!!solved['t12-compass']} zone={[-62, -84]} />
      <Chest world={world} pos={[0, 0, -81]} opened={!!solved['t12-key']} show={!!solved['12-3']} onOpen={() => openChest('t12-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -84]} size={[2 * W, 7, 0.8]} open={!!solved['t12-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -83.6]} df={13}>{solved['t12-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 12-4 the ringing bonds */}
      <Suspense fallback={null}>
        {BELLS.map((b) => { const [x, z] = BELL_POS[b.id]; return (
          <group key={b.id} position={[x, 0, z]}>
            <Part model="spectra" name="o12_bell" />
            <Tag position={[0, 3.3, 0]} df={9} far={14} className={rung[b.id] ? 'ok-tag' : ''}>{rung[b.id] ? b.family : 'a bell: an unknown molecule'}</Tag>
          </group>
        ) })}
      </Suspense>
      <Chest world={world} pos={[0, 0, -107.5]} big opened={!!solved['t12-bosskey']} show={!!solved['12-4']} onOpen={() => openChest('t12-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -110]} size={[2 * W, 7, 0.8]} open={!!solved['t12-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS12).map(([id, st]) => <Station key={id} world={world} pos={st.pos} label={solved[id] ? null : st.label} enabled={!solved[id]} solved={!!solved[id]} onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id); if (id === '12-3') { sfx('open'); toast('The lens swings to infrared. A small chest appears.', 'good', 3000) } }} />)}

      {/* boss */}
      {!solved.boss12 && <Sorcerer world={world} center={SORC.center} active={bossOn && !solved.boss12} onDefeated={bossDown} />}
      {spectraHere && <Spectra position={[-2.2, 0, -142.4]} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss12 && (save.shards || 0) < 12} pos={[0, 0, -144]} />
      <Motes count={200} area={[20, 6, 150]} center={[0, 1, -70]} color="#e8f0ff" size={0.04} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Observatory({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'observatory' ? ROOMS12.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#0e1024" camDist={6.2}>
      {(world) => <ObsLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
