import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Walden } from '../actors/ArenaFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'
import { readMs } from '../chem/rules11'

// The Volcanic Wastes — World 11's route and prep. Black rock veined with lava, ash drifts, a volcano and a dark
// keep on the horizon, and the Coliseum of the Five (assets/locations/world-11-arena-of-five.png). Sage Walden opens
// the gladiators' gate once Kai can find the inverting step of a Walden cycle (§11.1).
// Built in Blender (tools/wastes_blender.py, tools/walden_blender.py).

preloadModels('wastes', 'walden')
const WALDEN = [-9.5, 0, 3.0]
const CYCLE = [-6.4, 0, 6.2]
const COL = [0, 0, -46]
const GATE_Z = -29.6
const SPARK = [0, 27, -46] // Malradix's spark (high enough to clear the gate tower from the road), hovering over the Coliseum until the Champion falls

/** Malradix's violet spark over the arena (World 10's ForgeSpark, scaled up to read from the road) */
function ArenaSpark() {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.18) })
  return (
    <group ref={g} position={SPARK}>
      <mesh><sphereGeometry args={[0.9, 20, 16]} /><meshStandardMaterial color="#f0d0ff" emissive="#c070ff" emissiveIntensity={3.4} toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[2.0, 20, 16]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.36} depthWrite={false} toneMapped={false} fog={false} /></mesh>
      <mesh><sphereGeometry args={[3.4, 20, 16]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.13} depthWrite={false} toneMapped={false} fog={false} /></mesh>
      <pointLight color="#c070ff" intensity={40} distance={30} />
    </group>
  )
}

/** the gladiators' portcullis: an iron grid in a frame, with rivets and a ring (down until Walden's cycle is solved) */
function Portcullis() {
  return (
    <group position={[0, 0, GATE_Z - 0.1]}>
      {[...Array(9)].map((_, i) => <mesh key={'v' + i} position={[-2.4 + i * 0.6, 3.5, 0]} castShadow><cylinderGeometry args={[0.07, 0.07, 7, 6]} /><meshStandardMaterial color="#2a2a30" metalness={0.75} roughness={0.4} /></mesh>)}
      {[0.6, 2.3, 4.0, 5.7].map((y) => <mesh key={'h' + y} position={[0, y, 0]} castShadow><boxGeometry args={[5.2, 0.16, 0.2]} /><meshStandardMaterial color="#2a2a30" metalness={0.75} roughness={0.4} /></mesh>)}
      {[...Array(9)].map((_, i) => <mesh key={'t' + i} position={[-2.4 + i * 0.6, -0.05, 0]}><coneGeometry args={[0.1, 0.3, 6]} /><meshStandardMaterial color="#3a3a40" metalness={0.75} roughness={0.4} /></mesh>)}
      <mesh position={[0, 4.0, 0.14]}><torusGeometry args={[0.5, 0.06, 6, 20]} /><meshStandardMaterial color="#9a7a4a" metalness={0.8} roughness={0.3} /></mesh>
    </group>
  )
}

/** Walden's cycle carved on a basalt stele: three arrows in a ring round a chirality centre */
function CycleStele({ pos }) {
  return (
    <group position={pos} rotation={[0, 0.5, 0]}>
      <mesh position={[0, 0.15, 0]} receiveShadow><cylinderGeometry args={[1.2, 1.35, 0.3, 8]} /><meshStandardMaterial color="#2e2628" roughness={0.9} flatShading /></mesh>
      <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[1.8, 2.0, 0.34]} /><meshStandardMaterial color="#3a3234" roughness={0.9} /></mesh>
      <mesh position={[0, 2.38, 0]} castShadow><cylinderGeometry args={[0.9, 0.9, 0.34, 3, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#3a3234" roughness={0.9} flatShading /></mesh>
      <mesh position={[0, 1.35, 0.18]}><torusGeometry args={[0.55, 0.05, 6, 28]} /><meshStandardMaterial color="#c8a050" metalness={0.7} roughness={0.35} emissive="#5a3a10" emissiveIntensity={0.4} /></mesh>
      {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.55, 1.35 + Math.sin(a) * 0.55, 0.2]} rotation={[0, 0, a]}><coneGeometry args={[0.1, 0.22, 4]} /><meshStandardMaterial color="#ffb070" emissive="#ff7a2a" emissiveIntensity={0.6} /></mesh> })}
      <mesh position={[0, 1.35, 0.19]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#ff9a5a" emissive="#ff6a2a" emissiveIntensity={0.8} /></mesh>
    </group>
  )
}

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
      {/* a pale ember-sun, well off the arena's bearing, so it never reads as the violet spark */}
      <mesh position={[150, 120, -150]}><sphereGeometry args={[9, 20, 14]} /><meshBasicMaterial color="#ffd8b0" fog={false} /></mesh>
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
      // the follow camera faces along the road on arrival; the spark line cuts to the spark over the Coliseum
      setTimeout(async () => {
        await say([{ who: 'Pi', text: 'It’s so hot my glow is sweating. Is that a castle on the horizon?' }])
        world.camOverride = { pos: [-44, 5, 8], look: SPARK }
        await say([{ who: 'Pi', text: 'That’s Malradix’s Keep. We’re close. And look, the spark! Hanging over that arena.' }])
        world.camOverride = null
      }, 900)
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
      // back the camera off in portrait, so Kai's whole head stays in frame
      const shot = twoShot(world, WALDEN, 3.6 * Math.max(1, 1.2 / (window.innerWidth / Math.max(1, window.innerHeight))), 0.6)
      world.camOverride = shot
      setState({ waldenShot: true })
      await say([
        { who: 'Sage Walden', text: 'Magnus sent you? A challenger, then! Splendid.' },
        { who: 'Sage Walden', text: 'Walden. I ran this arena. Five gates, five ways a halide can leave its carbon.' },
      ])
      // while he names it, the camera turns to the violet spark over the Coliseum
      world.camOverride = { pos: [-5, 3.2, -6], look: SPARK }
      await say([{ who: 'Sage Walden', text: 'Then Malradix’s champion took the floor. That violet spark over the arena came with him. Malradix’s herald posted: “Substitution and elimination are random luck.”' }])
      world.camOverride = shot
      await say([
        { who: 'Pi', text: 'Are they?' },
        { who: 'Sage Walden', text: 'Luck? Every one of those five can be called before the bell. If you know what to look at.' },
        { who: 'Sage Walden', text: 'Prove you can spot an inversion. My cycle is on the stone. Find the step that turns it inside out.' },
      ])
      world.camOverride = null
      setState({ waldenShot: false, objective: 'Solve Walden’s cycle' })
    } else if (!s.t11cycle) {
      await say([{ who: 'Sage Walden', text: 'Which step breaks a bond at the chirality centre itself? Only that one can invert it.' }])
    } else if ((s.shards || 0) < 11) {
      await say([{ who: 'Sage Walden', text: s.hasUmbrella ? 'You have my spare umbrella. Attack from behind, always from behind.' : 'My spare umbrella is in the under-halls, past the ghouls. Take it. You’ll need the back door.' }])
    } else {
      await say([{ who: 'Sage Walden', text: 'Five for five! Take the east road up to the Summit. Spectra’s observatory sees everything. Even Malradix.' }])
    }
    busy.current = false
  }
  const useCycle = async () => {
    if (getState().save.t11cycle) return
    if (!getState().save.metWalden) { await talk(); return }
    if (busy.current) return
    busy.current = true
    let miss = null
    const ok = await openPanel('waldenCycle', { onWrong: (t) => { miss = t } })
    busy.current = false
    // a wrong step closes the panel, toasts its rule and costs half a heart (a tick after the panel closes)
    if (!ok) { if (miss) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, CYCLE, true); toast(miss, 'warn', readMs(miss)) } return }
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
      {!save.t11cycle && <Portcullis />}
      {!save.solved.boss11 && <ArenaSpark />}
      {!shot && <Tag position={[0, 9.0, GATE_Z]} df={14} far={40}>{save.t11cycle ? 'The Coliseum of the Five' : 'The Coliseum · gate down'}</Tag>}
      <Walden position={WALDEN} rotation={[0, 0.6, 0]} />
      {!shot && <Tag position={[WALDEN[0], 2.4, WALDEN[2]]} df={8} far={24}>Sage Walden</Tag>}
      <Station world={world} pos={CYCLE} label={save.t11cycle ? null : 'Solve Walden’s cycle'} enabled={!save.t11cycle} solved={!!save.t11cycle} onUse={useCycle} />
      <CycleStele pos={[CYCLE[0] + 1.8, 0, CYCLE[2] - 1.2]} />
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
