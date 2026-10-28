import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Walden } from '../actors/ArenaFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Volcanic Wastes — World 11's route and prep. Black rock veined with lava, ash drifts, a volcano and a dark
// keep on the horizon, and the Coliseum of the Five (assets/locations/world-11-arena-of-five.png). Sage Walden opens
// the gladiators' gate once Kai can find the inverting step of a Walden cycle (§11.1).
// Built in Blender (tools/wastes_blender.py, tools/walden_blender.py).

preloadModels('wastes', 'walden')
const WALDEN = [-9.5, 0, 3.0]
const CYCLE = [-6.4, 0, 6.2]
const COL = [0, 0, -46]
const GATE_Z = -29.6

function Ember() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#1a1024'); gr.addColorStop(0.5, '#4a2a3a'); gr.addColorStop(0.72, '#8a3a2a'); gr.addColorStop(1, '#2a1a1a')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group>
      <mesh><sphereGeometry args={[280, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <mesh position={[40, 110, -220]}><sphereGeometry args={[9, 20, 14]} /><meshBasicMaterial color="#e0a0ff" fog={false} /></mesh>
    </group>
  )
}

function Rocks({ world }) {
  const parts = useModelParts('wastes')
  const items = useMemo(() => [[-24, -8], [-30, 20], [22, 14], [28, -16], [-36, -30], [34, 34], [-14, 30], [16, 34], [40, -2]].map(([x, z], i) => [x, 0, z, 0.9 + (i % 3) * 0.25, i]), [])
  useEffect(() => { const ids = items.map(([x, , z]) => world.addSolid([x - 1, 0, z - 1], [x + 1, 5, z + 1])); return () => ids.forEach((i) => world.remove(i)) }, [world])
  return <InstancedPart parts={parts} name="vw_rock" items={items} castShadow />
}

function WastesLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.waldenShot)
  const busy = useRef(false)

  useEffect(() => {
    playMusic('wastes')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 2]), world.addSolid([-52, 0, 10], [-50, 8, 50]),
      world.addSolid([50, 0, -50], [52, 8, 4]), world.addSolid([50, 0, 12], [52, 8, 50]), world.addSolid([-50, 0, 50], [50, 8, 52]), world.addSolid([-50, 0, -52], [50, 8, -50]),
      world.addSolid([WALDEN[0] - 0.4, 0, WALDEN[2] - 0.4], [WALDEN[0] + 0.4, 1.9, WALDEN[2] + 0.4]),
    ]
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2
      if (Math.abs(Math.sin(a)) < 0.12 && Math.cos(a) > 0) continue
      const x = COL[0] + Math.sin(a) * 16, z = COL[2] + Math.cos(a) * 16
      ids.push(world.addSolid([x - 2.2, 0, z - 2.2], [x + 2.2, 14, z + 2.2]))
    }
    const back = world.addTrigger([-52, 0, 2], [-49.2, 4, 10], () => onExit('marsh', { scene: 'marsh', at: 'east' }))
    const into = world.addTrigger([-2.2, 0, GATE_Z - 2], [2.2, 4, GATE_Z + 0.5], () => { if (getState().save.t11cycle) onExit('coliseum', { scene: 'coliseum', room: 'entrance' }) })
    const portcullis = world.addSolid([-2.6, 0, GATE_Z - 0.4], [2.6, 7, GATE_Z + 0.2])
    world.setEnabled(portcullis, !getState().save.t11cycle)
    world.colGate = portcullis
    const wa = world.addInteractable({ pos: WALDEN, radius: 2.6, label: 'Speak with Sage Walden', onInteract: () => talk() })
    const near = world.addTrigger([-22, 0, -4], [2, 4, 14], () => { if (!getState().save.metWalden) talk() })
    const rocks = world.addSolid([49, 0, 4], [52, 8, 12])
    world.setEnabled(rocks, !roadOpen(12, getState().save.shards))
    const toSummit = world.addTrigger([49.8, 0, 4], [52, 4, 12], () => { if (roadOpen(12, getState().save.shards)) onExit('summit', { scene: 'summit', at: 'west' }) })
    ids.push(back, into, portcullis, wa, near, rocks, toSummit)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.colGate) world.setEnabled(world.colGate, !save.t11cycle) }, [save.t11cycle])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 11 ? 'Take the east road up to the Summit of Light' : !s.metWalden ? 'Follow the lava road' : !s.t11cycle ? 'Solve Walden’s cycle' : 'Enter the Coliseum' })
    if (!s.wastesSeen) {
      saveGame({ wastesSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'It’s so hot my glow is sweating. Is that a castle on the horizon?' },
        { who: 'Pi', text: 'That’s Malradix’s Keep. We’re close. But first, that arena.' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#3a3234', wall: '#1a1418', pit: '#0a0608',
      labels: [{ pos: [-44, 6], text: '← Halogen Marsh', align: 'left' }, { pos: [40, 8], text: 'Summit of Light →', align: 'left' }, { pos: [0, -46], text: 'The Coliseum', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metWalden) return { pos: [WALDEN[0], WALDEN[2]], label: 'Speak with Sage Walden' }
        if (!s.t11cycle) return { pos: [CYCLE[0], CYCLE[2]], label: 'Solve Walden’s cycle' }
        if ((s.shards || 0) < 11) return { pos: [0, GATE_Z], label: 'Enter the Coliseum' }
        if ((s.shards || 0) < 12) return { pos: [49, 8], label: 'Take the east road to the Summit of Light' }
        return { pos: [-48, 6], label: 'Back to the Marsh' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metWalden) {
      saveGame({ metWalden: true })
      if (world.player) world.player.teleport([WALDEN[0] + 1.6, 0, WALDEN[2] + 2.0], Math.atan2(-1.6, -2.0))
      world.camOverride = twoShot(world, WALDEN, 3.6, 0.6)
      setState({ waldenShot: true })
      await say([
        { who: 'Sage Walden', text: 'A challenger! Splendid. Mind the cracks, they’re hotter than they look.' },
        { who: 'Sage Walden', text: 'Walden. I ran this arena. Five gates, five ways a halide can leave its carbon.' },
        { who: 'Sage Walden', text: 'Then Malradix’s champion took the floor, and his herald posted this: “Substitution and elimination are random luck.”' },
        { who: 'Pi', text: 'Are they?' },
        { who: 'Sage Walden', text: 'Luck? Every one of those five can be called before the bell. If you know what to look at.' },
        { who: 'Sage Walden', text: 'Prove you can spot an inversion. My cycle is on the stone. Find the step that turns it inside out.' },
      ])
      world.camOverride = null
      setState({ waldenShot: false, objective: 'Solve Walden’s cycle' })
    } else if (!s.t11cycle) {
      await say([{ who: 'Sage Walden', text: 'Which step breaks a bond at the chirality centre itself? Only that one can invert it.' }])
    } else if ((s.shards || 0) < 11) {
      await say([{ who: 'Sage Walden', text: s.hasUmbrella ? 'You have my umbrella. Attack from behind, always from behind.' : 'My umbrella is in the under-halls, past the ghouls. Take it. You’ll need the back door.' }])
    } else {
      await say([{ who: 'Sage Walden', text: 'Five for five! Go north. Spectra’s observatory sees everything. Even Malradix.' }])
    }
    busy.current = false
  }
  const useCycle = async () => {
    if (getState().save.t11cycle) return
    if (!getState().save.metWalden) { await talk(); return }
    const ok = await openPanel('waldenCycle', {})
    if (!ok) return
    saveGame({ t11cycle: true }); sfx('open')
    setState({ objective: 'Enter the Coliseum' })
    await say([{ who: 'Sage Walden', text: 'Exactly. The gladiators’ gate is open. Go down, and come up on the arena floor.' }])
  }

  return (
    <>
      <Ember />
      <fog attach="fog" args={['#3a2a2a', 50, 220]} />
      <hemisphereLight args={['#ffb08a', '#1a1014', 0.7]} />
      <ambientLight intensity={0.3} color="#ffd0c0" />
      <directionalLight position={[-30, 40, 30]} intensity={1.0} color="#ffc0a0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={50} visible={false} />
      <Suspense fallback={null}>
        <Part model="wastes" name="vw_ground" castShadow={false} receiveShadow />
        <Part model="wastes" name="vw_far" castShadow={false} />
        <Part model="wastes" name="vw_path" castShadow={false} receiveShadow />
        <Part model="wastes" name="vw_col" position={COL} />
        <Rocks world={world} />
      </Suspense>
      <pointLight position={[0, 4, GATE_Z + 1]} color="#ff8a3a" intensity={5} distance={12} />
      {!save.t11cycle && <mesh position={[0, 3.5, GATE_Z - 0.1]}><boxGeometry args={[5.2, 7, 0.2]} /><meshStandardMaterial color="#2a2a30" metalness={0.7} roughness={0.45} /></mesh>}
      <Tag position={[0, 9.0, GATE_Z]} df={14}>{save.t11cycle ? 'The Coliseum of the Five' : 'The Coliseum · gate down'}</Tag>
      <Walden position={WALDEN} rotation={[0, 0.6, 0]} />
      {!shot && <Tag position={[WALDEN[0], 2.4, WALDEN[2]]} df={8}>Sage Walden</Tag>}
      <Station world={world} pos={CYCLE} label={save.t11cycle ? null : 'Solve Walden’s cycle'} enabled={!save.t11cycle} solved={!!save.t11cycle} onUse={useCycle} />
      <mesh position={[CYCLE[0] + 1.8, 1.0, CYCLE[2] - 1.2]} castShadow><boxGeometry args={[2.0, 2.0, 0.3]} /><meshStandardMaterial color="#3a3234" /></mesh>
      <Signpost pos={[-45, 0, 3]} rotY={Math.PI / 2} text="← Marsh · Coliseum ↑" />
      <Signpost pos={[45, 0, 3]} rotY={-Math.PI / 2} text="Summit of Light →" />
      {!roadOpen(12, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[50.6, 0.8 + (i % 3) * 0.9, 5 + i * 1.1]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#3a3234" roughness={0.9} flatShading /></mesh>)}
      <Motes count={200} area={[90, 8, 90]} center={[0, 2, 0]} color="#ffa060" size={0.05} />
      <WolfPack world={world} spawns={[[20, 20], [24, 24], [18, 26]]} tutorial={false} />
      <PiFollower world={world} />
    </>
  )
}

export default function Wastes({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromCol = cp.at === 'gate', fromSummit = cp.at === 'east'
  return (
    <GameScene start={fromSummit ? [46, 0, 8] : fromCol ? [0, 0, -24] : [-46, 0, 6]} startFacing={fromSummit ? -Math.PI / 2 : fromCol ? 0 : Math.PI / 2} background="#3a2a2a" camDist={6.2}>
      {(world) => <WastesLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
