import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Magnus } from '../actors/MarshFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, toast, openPanel, useGame } from '../engine/store'
import { readMs } from '../chem/rules10'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Halogen Marsh — World 10's route and prep. Mist, dead twisted trees, reeds, brown bromine pools and green
// chlorine fog, Old Magnus's stilt hut with a glowing ring over its door (assets/locations/world-10-halogen-marsh.png).
// Magnus opens the Sunken Forge once Kai can name the haloalkanes on his markers (§10.1).
// Built in Blender (tools/marsh_blender.py, tools/magnus_blender.py).

preloadModels('marsh', 'magnus')
const MAGNUS = [9, 0, -1.5]
const MARKERS = [5.8, 0, 1.2]
const MOUTH_Z = -44
const KAI_MEET = [MAGNUS[0] - 1.6, 0, MAGNUS[2] + 2.0] // where Kai stands to meet Magnus
const SHOT_CAM = [12.3, 4.3] // about where the first two-shot's camera stands (twoShot 6.2 m off the line, so Kai fits at 800 px)
const SHOT_LINES = [[[KAI_MEET[0], KAI_MEET[2]], [MAGNUS[0], MAGNUS[2]]], [SHOT_CAM, [KAI_MEET[0], KAI_MEET[2]]], [SHOT_CAM, [MAGNUS[0], MAGNUS[2]]]]
const segDist = (x, z, [ax, az], [bx, bz]) => { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - ax - vx * t, z - az - vz * t) }

function Gloom() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#2a3428'); gr.addColorStop(0.55, '#5a6a54'); gr.addColorStop(0.75, '#8a9a7a'); gr.addColorStop(1, '#3a4232')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return <mesh><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
}

/** drifting chlorine mist over the green pools */
function Mist() {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.children.forEach((m, i) => { m.position.y = 0.8 + Math.sin(clock.elapsedTime * 0.4 + i) * 0.3; m.material.opacity = 0.18 + 0.08 * Math.sin(clock.elapsedTime * 0.3 + i * 2) }) })
  return (
    <group ref={g}>
      {[[22, 24], [8, 36], [-12, -34], [20, 26], [-14, -32]].map(([x, z], i) => <mesh key={i} position={[x, 0.8, z]}><sphereGeometry args={[4 + (i % 2), 14, 8]} /><meshBasicMaterial color="#9ad06a" transparent opacity={0.2} depthWrite={false} /></mesh>)}
    </group>
  )
}

function Scenery({ world }) {
  const parts = useModelParts('marsh')
  const trees = useMemo(() => [[-20, -8], [-14, -22], [24, 8], [30, -14], [-34, 6], [-26, 30], [34, 30], [16, -30], [-8, 24], [38, -36], [-40, -30]].map(([x, z], i) => [x, 0, z, 0.9 + (i % 3) * 0.15, i * 1.7]), [])
  const reeds = useMemo(() => { const o = []; for (let i = 0; i < 70; i++) { const a = i * 2.39996, r = 8 + (i * 37) % 40; const x = Math.sin(a) * r, z = Math.cos(a) * r; if (Math.abs(x) < 4 && z > -46) continue; if (SHOT_LINES.some(([p, q]) => segDist(x, z, p, q) < 2)) continue; o.push([x, 0, z, 0.8 + (i % 4) * 0.15, i]) } return o }, [])
  useEffect(() => {
    const ids = trees.map(([x, , z]) => world.addSolid([x - 0.5, 0, z - 0.5], [x + 0.5, 5, z + 0.5]))
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return (
    <group>
      <InstancedPart parts={parts} name="ms_tree" items={trees} castShadow />
      <InstancedPart parts={parts} name="ms_reeds" items={reeds} />
    </group>
  )
}

/** Malradix's violet spark, glowing over the forge grate until Shard 10 (World 8's TowerSpark) */
function ForgeSpark() {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.18) })
  return (
    <group ref={g} position={[0, 4.6, MOUTH_Z + 0.6]}>
      <mesh><sphereGeometry args={[0.6, 20, 16]} /><meshStandardMaterial color="#f0d0ff" emissive="#c070ff" emissiveIntensity={3.4} toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[1.4, 20, 16]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.36} depthWrite={false} toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[2.4, 20, 16]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.13} depthWrite={false} toneMapped={false} /></mesh>
      <pointLight color="#c070ff" intensity={30} distance={18} />
    </group>
  )
}

/** the forge grate: an iron frame with bars, rivets and a chain, lowered once the markers are named */
function Grate() {
  return (
    <group position={[0, 0, MOUTH_Z - 0.2]}>
      {[-3, 3].map((x) => <mesh key={x} position={[x, 3, 0]} castShadow><boxGeometry args={[0.3, 6, 0.4]} /><meshStandardMaterial color="#2e322a" metalness={0.7} roughness={0.45} /></mesh>)}
      {[0.3, 3, 5.8].map((y) => <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[6.2, 0.26, 0.36]} /><meshStandardMaterial color="#2e322a" metalness={0.7} roughness={0.45} /></mesh>)}
      {[...Array(11)].map((_, i) => <mesh key={i} position={[-2.5 + i * 0.5, 3, 0]} castShadow><cylinderGeometry args={[0.06, 0.06, 5.6, 6]} /><meshStandardMaterial color="#3a3e34" metalness={0.75} roughness={0.4} /></mesh>)}
      {[...Array(12)].map((_, i) => <mesh key={'r' + i} position={[-2.75 + (i % 6) * 1.1, i < 6 ? 3 : 5.8, 0.2]}><sphereGeometry args={[0.06, 6, 4]} /><meshStandardMaterial color="#8a7a50" metalness={0.8} roughness={0.3} /></mesh>)}
      <mesh position={[0, 4.3, 0.24]}><torusGeometry args={[0.7, 0.07, 6, 24]} /><meshStandardMaterial color="#9a8a5a" metalness={0.8} roughness={0.3} /></mesh>
    </group>
  )
}

/** one of Magnus's marker posts: a weathered stake with a name board; the boards are blank until Kai names them */
function MarkerPost({ position, tilt = 0, named }) {
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 1.5, 6]} /><meshStandardMaterial color="#4a3a2a" roughness={0.95} flatShading /></mesh>
      <mesh position={[0, 1.3, 0.09]} castShadow><boxGeometry args={[0.62, 0.32, 0.05]} /><meshStandardMaterial color="#7a6646" roughness={0.9} /></mesh>
      {named && [0.06, -0.04].map((y) => <mesh key={y} position={[0, 1.3 + y, 0.12]}><planeGeometry args={[0.46, 0.035]} /><meshBasicMaterial color="#2a2018" /></mesh>)}
      <mesh position={[0, 1.5, 0.09]}><coneGeometry args={[0.36, 0.14, 4, 1]} /><meshStandardMaterial color="#3a2e20" roughness={0.9} flatShading /></mesh>
      <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.22, 0.28, 0.2, 7]} /><meshStandardMaterial color="#3a4a2a" roughness={1} /></mesh>
    </group>
  )
}

function MarshLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.magnusShot)
  const busy = useRef(false)

  useEffect(() => {
    playMusic('marsh')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 2]), world.addSolid([-52, 0, 10], [-50, 8, 50]),
      world.addSolid([50, 0, -50], [52, 8, 4]), world.addSolid([50, 0, 12], [52, 8, 50]), world.addSolid([-50, 0, 50], [50, 8, 52]),
      world.addSolid([-50, 0, -52], [-3.2, 12, MOUTH_Z - 1]), world.addSolid([3.2, 0, -52], [50, 12, MOUTH_Z - 1]),
      world.addSolid([14 - 2.6, 0, -6 - 2.2], [14 + 2.6, 5, -6 + 2.0]), // the hut
      world.addSolid([MAGNUS[0] - 0.4, 0, MAGNUS[2] - 0.4], [MAGNUS[0] + 0.4, 1.9, MAGNUS[2] + 0.4]),
    ]
    const back = world.addTrigger([-52, 0, 2], [-49.2, 4, 10], () => onExit('cliffs', { scene: 'cliffs', at: 'east' }))
    const into = world.addTrigger([-2.6, 0, MOUTH_Z - 2], [2.6, 4, MOUTH_Z + 0.6], () => { if (getState().save.t10markers) onExit('sunken', { scene: 'sunken', room: 'entrance' }) })
    const grate = world.addSolid([-3, 0, MOUTH_Z - 0.6], [3, 6, MOUTH_Z + 0.2])
    world.setEnabled(grate, !getState().save.t10markers)
    world.forgeGrate = grate
    const ma = world.addInteractable({ pos: MAGNUS, radius: 2.6, label: 'Speak with Old Magnus', onInteract: () => talk() })
    const near = world.addTrigger([-4, 0, -10], [18, 4, 10], () => { if (!getState().save.metMagnus) talk() })
    const rocks = world.addSolid([49, 0, 4], [52, 8, 12])
    world.setEnabled(rocks, !roadOpen(11, getState().save.shards))
    const toWastes = world.addTrigger([49.8, 0, 4], [52, 4, 12], () => { if (roadOpen(11, getState().save.shards)) onExit('wastes', { scene: 'wastes', at: 'west' }) })
    ids.push(back, into, grate, ma, near, rocks, toWastes)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.forgeGrate) world.setEnabled(world.forgeGrate, !save.t10markers) }, [save.t10markers])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 10 ? 'Take the east road to the Volcanic Wastes' : !s.metMagnus ? 'Follow the boardwalk to the hut' : !s.t10markers ? 'Name Magnus’s markers' : 'Enter the Sunken Forge' })
    if (!s.marshSeen) {
      saveGame({ marshSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'It smells like a swimming pool and a rusty nail had a fight.' },
        { who: 'Pi', text: 'Eyes in the reeds… radical wolves. And a violet glow over that forge.' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#4a5a3a', wall: '#2a3424', pit: '#1a2014',
      labels: [{ pos: [-44, 6], text: '← Thunder Cliffs', align: 'left' }, { pos: [40, 8], text: 'Volcanic Wastes →', align: 'left' }, { pos: [0, -40], text: 'The Sunken Forge', align: 'center' }, { pos: [14, -3], text: 'Magnus’s hut', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metMagnus) return { pos: [MAGNUS[0], MAGNUS[2]], label: 'Speak with Old Magnus' }
        if (!s.t10markers) return { pos: [MARKERS[0], MARKERS[2]], label: 'Name the markers' }
        if ((s.shards || 0) < 10) return { pos: [0, MOUTH_Z], label: 'Enter the Sunken Forge' }
        if ((s.shards || 0) < 12) return { pos: [49, 8], label: 'Take the east road to the Volcanic Wastes' }
        return { pos: [-48, 6], label: 'Back to the Cliffs' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metMagnus) {
      saveGame({ metMagnus: true })
      if (world.player) world.player.teleport(KAI_MEET, Math.atan2(1.6, -2.0))
      const shot = twoShot(world, MAGNUS, 6.2, -0.3)
      world.camOverride = shot
      setState({ magnusShot: true })
      await say([
        { who: 'Old Magnus', text: 'Lindlar sent you? Stay on the planks, boy. The bog keeps what it takes.' },
        { who: 'Old Magnus', text: 'Magnus. I’ve watched this marsh sixty years.' },
      ])
      // while he names it, the camera turns to the violet spark over the forge grate (Presentation round 2, #3)
      world.camOverride = { pos: [4, 3, -30], look: [0, 4.6, MOUTH_Z + 0.6] }
      await say([{ who: 'Old Magnus', text: 'Something violet came over the cliffs just now and dropped into my forge.' }])
      world.camOverride = shot
      await say([
        { who: 'Old Magnus', text: 'Malradix nailed a notice in my forge: “My radicals strike at random.” Random! Ha.' },
        { who: 'Pi', text: 'They don’t?' },
        { who: 'Old Magnus', text: 'Nothing in this marsh is random. You just haven’t counted yet.' },
        { who: 'Old Magnus', text: 'My markers lost their names in the mist. Put them back and I’ll lift the forge grate.' },
      ])
      world.camOverride = null
      setState({ magnusShot: false, objective: 'Name Magnus’s markers' })
    } else if (!s.t10markers) {
      await say([{ who: 'Old Magnus', text: 'A halogen is just another branch on the chain. Lowest numbers. Then the alphabet.' }])
    } else if ((s.shards || 0) < 10) {
      await say([{ who: 'Old Magnus', text: s.hasRing ? 'That’s my ring. Mind the water once it’s on: a Grignard can’t abide it.' : 'My ring’s down in the forge, past the allyl crossing. You’ll want it for the golems.' }])
    } else {
      await say([{ who: 'Old Magnus', text: 'The wolves are quiet. Go on, then. Walden’s arena is east, past the rocks, and hot. Take water. No, wait. Don’t.' }])
    }
    busy.current = false
  }
  const useMarkers = async () => {
    if (getState().save.t10markers) return
    if (!getState().save.metMagnus) { await talk(); return }
    let wrong = null
    const ok = await openPanel('markers', { onWrong: (t) => { wrong = t } })
    if (!ok) { if (wrong) { world.player.hurt(1, MARKERS, true); toast(wrong, 'warn', readMs(wrong)) } return }
    saveGame({ t10markers: true }); sfx('open')
    setState({ objective: 'Enter the Sunken Forge' })
    await say([{ who: 'Old Magnus', text: 'Good. The grate’s up. Down there, count before you swing.' }])
  }

  return (
    <>
      <Gloom />
      <Mist />
      <fog attach="fog" args={['#6a7a62', 18, 120]} />
      <hemisphereLight args={['#c8e0b8', '#2a3020', 0.7]} />
      <ambientLight intensity={0.3} color="#d8f0c8" />
      <directionalLight position={[-30, 40, 20]} intensity={0.9} color="#e0f0d0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={50} visible={false} />
      <Suspense fallback={null}>
        <Part model="marsh" name="ms_ground" castShadow={false} receiveShadow />
        <Part model="marsh" name="ms_pools" castShadow={false} />
        <Part model="marsh" name="ms_path" castShadow={false} receiveShadow />
        <Part model="marsh" name="ms_hut" position={[14, 0, -6]} rotation={[0, -0.5, 0]} />
        <Part model="marsh" name="ms_forge" position={[0, 0, MOUTH_Z - 1.2]} />
        <Scenery world={world} />
      </Suspense>
      <pointLight position={[14.5, 3.9, -4.3]} color="#e8f0ff" intensity={4} distance={10} />
      {!save.t10markers && <Grate />}
      {(save.shards || 0) < 10 && <ForgeSpark />}
      <Tag position={[0, 8.2, MOUTH_Z]} df={14} far={40}>{save.t10markers ? 'The Sunken Forge' : 'The Sunken Forge · grated'}</Tag>
      <Magnus position={MAGNUS} rotation={[0, -0.5, 0]} />
      {!shot && <Tag position={[MAGNUS[0], 2.5, MAGNUS[2]]} df={8} far={20}>Old Magnus</Tag>}
      <Station world={world} pos={MARKERS} label={save.t10markers ? null : 'Name the markers'} enabled={!save.t10markers} solved={!!save.t10markers} onUse={useMarkers} />
      {[0, 1, 2].map((k) => <MarkerPost key={k} position={[MARKERS[0] - 1.6 - k * 1.0, 0, MARKERS[2] - 1.0]} tilt={(k - 1) * 0.08} named={!!save.t10markers} />)}
      <Signpost pos={[-45, 0, 3]} rotY={Math.PI / 2} text="← Cliffs · Forge ↓" />
      <Signpost pos={[45, 0, 3]} rotY={-Math.PI / 2} text="Volcanic Wastes →" />
      {!roadOpen(11, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[50.6, 0.8 + (i % 3) * 0.9, 5 + i * 1.1]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#4a4e3e" roughness={0.9} flatShading /></mesh>)}
      <Motes count={200} area={[90, 6, 90]} center={[0, 1.5, 0]} color="#c8ffb0" size={0.05} />
      <WolfPack world={world} spawns={[[-24, 14], [-28, 18], [-22, 20], [22, -20], [26, -16]]} tutorial={false} />
      <PiFollower world={world} />
    </>
  )
}

export default function Marsh({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromForge = cp.at === 'gate', fromWastes = cp.at === 'east'
  return (
    <GameScene start={fromWastes ? [46, 0, 8] : fromForge ? [0, 0, -38] : [-46, 0, 6]} startFacing={fromWastes ? -Math.PI / 2 : fromForge ? 0 : Math.PI / 2} background="#5a6a54" camDist={6.2}>
      {(world) => <MarshLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
