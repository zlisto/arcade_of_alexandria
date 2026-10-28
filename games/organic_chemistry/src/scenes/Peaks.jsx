import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Hammond, Wisps } from '../actors/PeaksFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Activation Peaks — World 6's route and prep. A snowfield ringed by mountains; to the north the skyline is an
// energy diagram, two passes with a valley between (assets/locations/world-6-activation-peaks.png). Pass-Warden
// Hammond keeps the trail and opens the cave road once Kai can name the four kinds of reaction (§6.1).
// Built in Blender (tools/peaks_blender.py, tools/peaks_folk_blender.py).

preloadModels('peaks', 'peaksfolk')
const HAMMOND = [-11.6, 0, 18.2]
const SIGNS = [-8.6, 0, 20.8]
const MOUTH_Z = -48

function Dusk() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#3a3a6a'); gr.addColorStop(0.45, '#7a7ab0'); gr.addColorStop(0.66, '#e0a8a0'); gr.addColorStop(0.74, '#f4d0a0'); gr.addColorStop(1, '#8a90b0')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return <mesh><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
}

/** falling snow round the camera */
function Snow() {
  const ref = useRef()
  const geo = useMemo(() => { const p = []; for (let i = 0; i < 700; i++) p.push((Math.random() - 0.5) * 60, Math.random() * 18, (Math.random() - 0.5) * 60); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g }, [])
  useFrame(({ camera }, dt) => {
    const a = geo.attributes.position
    for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 1.2; if (y < 0) y += 18; a.setY(i, y) }
    a.needsUpdate = true
    if (ref.current) ref.current.position.set(camera.position.x, 0, camera.position.z)
  })
  return <points ref={ref} geometry={geo}><pointsMaterial color="#ffffff" size={0.09} transparent opacity={0.85} /></points>
}

function PeaksLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.hammondShot)
  const busy = useRef(false)

  useEffect(() => {
    playMusic('peaks')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 4]), world.addSolid([-52, 0, 12], [-50, 8, 50]),
      world.addSolid([50, 0, -50], [52, 8, 4]), world.addSolid([50, 0, 12], [52, 8, 50]), world.addSolid([-50, 0, 50], [50, 8, 52]),
      world.addSolid([-50, 0, -52], [-3.2, 12, MOUTH_Z - 1]), world.addSolid([3.2, 0, -52], [50, 12, MOUTH_Z - 1]),
      world.addSolid([-14 - 2.4, 0, 14 - 2], [-14 + 2.4, 4, 14 + 2]), // the hut
      world.addSolid([HAMMOND[0] - 0.4, 0, HAMMOND[2] - 0.4], [HAMMOND[0] + 0.4, 1.9, HAMMOND[2] + 0.4]),
    ]
    const back = world.addTrigger([-52, 0, 4], [-49.2, 4, 12], () => onExit('lake', { scene: 'lake', at: 'east' }))
    const into = world.addTrigger([-3, 0, MOUTH_Z - 2], [3, 4, MOUTH_Z + 0.5], () => { if (getState().save.t6signs) onExit('caves', { scene: 'caves', room: 'entrance' }) })
    const ha = world.addInteractable({ pos: HAMMOND, radius: 2.6, label: 'Speak with Pass-Warden Hammond', onInteract: () => talk() })
    const near = world.addTrigger([-26, 0, 6], [-4, 4, 24], () => { if (!getState().save.metHammond) talk() })
    const seal = world.addSolid([-3, 0, MOUTH_Z - 1], [3, 8, MOUTH_Z + 0.4])
    world.setEnabled(seal, !getState().save.t6signs)
    const rocks = world.addSolid([49, 0, 4], [52, 8, 12])
    world.setEnabled(rocks, !roadOpen(7, getState().save.shards))
    const toPlains = world.addTrigger([49.8, 0, 4], [52, 4, 12], () => { if (roadOpen(7, getState().save.shards)) onExit('plains', { scene: 'plains', at: 'west' }) })
    ids.push(back, into, ha, near, seal, rocks, toPlains)
    world.mouthSeal = seal
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.mouthSeal) world.setEnabled(world.mouthSeal, !save.t6signs) }, [save.t6signs])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 6 ? 'Take the east road to the Plains of Addition' : !s.metHammond ? 'Follow the trail to the warden’s hut' : !s.t6signs ? 'Sort Hammond’s trail signs' : 'Enter the cave under the peaks' })
    if (!s.peaksSeen) {
      saveGame({ peaksSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'Brrr. Look at the skyline: up, down, up higher, then way down. Like a graph!' },
        { who: 'Pi', text: 'And something long and shiny is curled round the tallest peak.' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#d8dce8', wall: '#3a3448', pit: '#1a1828',
      labels: [{ pos: [-44, 8], text: '← Mirror Lake', align: 'left' }, { pos: [0, -46], text: 'The Pass Caves', align: 'center' }, { pos: [-14, 10], text: 'Warden’s hut', align: 'center' }, { pos: [40, 8], text: 'Plains of Addition →', align: 'left' }],
      goal: () => {
        const s = getState().save
        if (!s.metHammond) return { pos: [HAMMOND[0], HAMMOND[2]], label: 'Speak with Pass-Warden Hammond' }
        if (!s.t6signs) return { pos: [SIGNS[0], SIGNS[2]], label: 'Sort the trail signs' }
        if ((s.shards || 0) < 6) return { pos: [0, MOUTH_Z], label: 'Enter the Pass Caves' }
        if ((s.shards || 0) < 8) return { pos: [49, 8], label: 'Take the east road to the Plains of Addition' }
        return { pos: [-48, 8], label: 'Back to the Mirror Lake' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metHammond) {
      saveGame({ metHammond: true })
      if (world.player) world.player.teleport([HAMMOND[0] + 1.6, 0, HAMMOND[2] + 2.0], Math.atan2(-1.6, -2.0))
      world.camOverride = twoShot(world, HAMMOND, 3.6, 0.4)
      setState({ hammondShot: true })
      await say([
        { who: 'Pass-Warden Hammond', text: 'Off the snow, lad. You’re standing where the avalanches like to sit.' },
        { who: 'Pass-Warden Hammond', text: 'Hammond. I keep the passes. Forty years of watching things get over these mountains, or not.' },
        { who: 'Pass-Warden Hammond', text: 'Malradix says anything that rolls downhill must get there in an instant. Then why does my soup still take an hour?' },
        { who: 'Pi', text: 'And the dragon on the peak?' },
        { who: 'Pass-Warden Hammond', text: 'The Wyrm. It sits on the tops of passes. You don’t fight it. You get over it, if you pick your pass.' },
        { who: 'Pass-Warden Hammond', text: 'First: every traveller here takes one of four trails. Sort my signs and I’ll open the cave road.' },
      ])
      world.camOverride = null
      setState({ hammondShot: false, objective: 'Sort Hammond’s trail signs' })
    } else if (!s.t6signs) {
      await say([{ who: 'Pass-Warden Hammond', text: 'Count what goes in and what comes out. Two into one, one into two, a swap, or a reshuffle.' }])
    } else if ((s.shards || 0) < 6) {
      await say([{ who: 'Pass-Warden Hammond', text: s.hasBoots ? 'Those boots hold what you put in them. A vent at room temperature won’t lift you over the big pass.' : 'My old boots are down in the caves, past the Ledger. You’ll want them for the passes.' }])
    } else {
      await say([{ who: 'Pass-Warden Hammond', text: 'Over the Wyrm and back. Not many can say that. Mind the next country: it’s all alkenes.' }])
    }
    busy.current = false
  }
  const useSigns = async () => {
    if (getState().save.t6signs) return
    if (!getState().save.metHammond) { await talk(); return }
    const ok = await openPanel('trailSigns', {})
    if (!ok) return
    saveGame({ t6signs: true }); sfx('open')
    setState({ objective: 'Enter the cave under the peaks' })
    await say([
      { who: 'Pass-Warden Hammond', text: 'Good. The cave road’s open. Inside it’s mechanisms: who gives electrons, who takes them.' },
      { who: 'Pass-Warden Hammond', text: 'And remember: the mountain doesn’t care how far down the other side goes. It cares how high the pass is.' },
    ])
  }

  return (
    <>
      <Dusk />
      <Snow />
      <fog attach="fog" args={['#b0b4d0', 50, 200]} />
      <hemisphereLight args={['#e8e8ff', '#6a6a8a', 0.8]} />
      <ambientLight intensity={0.3} color="#f0e0ff" />
      <directionalLight position={[40, 30, -40]} intensity={1.4} color="#ffd8b8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={50} visible={false} />
      <Suspense fallback={null}>
        <Part model="peaks" name="pk_ground" castShadow={false} receiveShadow />
        <Part model="peaks" name="pk_range" castShadow={false} />
        <Part model="peaks" name="pk_trail" castShadow={false} receiveShadow />
        <Part model="peaks" name="pk_hut" position={[-14, 0, 14]} />
        <Part model="peaks" name="pk_mouth" position={[0, 0, MOUTH_Z - 1.5]} />
      </Suspense>
      <pointLight position={[-13.4, 1.6, 16.2]} color="#ffcf7a" intensity={3} distance={8} />
      {!save.t6signs && <mesh position={[0, 3, MOUTH_Z - 0.3]}><boxGeometry args={[6, 6, 0.6]} /><meshStandardMaterial color="#cfe8f4" transparent opacity={0.75} roughness={0.2} /></mesh>}
      <Tag position={[0, 8.2, MOUTH_Z]} df={14}>{save.t6signs ? 'The Pass Caves' : 'The Pass Caves · iced shut'}</Tag>
      <Hammond position={HAMMOND} rotation={[0, 0.4, 0]} />
      {!shot && <Tag position={[HAMMOND[0], 2.4, HAMMOND[2]]} df={8}>Pass-Warden Hammond</Tag>}
      <Station world={world} pos={SIGNS} label={save.t6signs ? null : 'Sort the trail signs'} enabled={!save.t6signs} solved={!!save.t6signs} onUse={useSigns} />
      {['addition', 'elimination', 'substitution', 'rearrangement'].map((k, i) => (
        <group key={k} position={[SIGNS[0] + 2 + i * 1.3, 0, SIGNS[2] - 1.6]} rotation={[0, -0.3, 0]}>
          <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.06, 0.07, 2.0, 6]} /><meshStandardMaterial color="#5a3e2a" /></mesh>
          <mesh position={[0, 1.8, 0.05]}><boxGeometry args={[1.1, 0.3, 0.06]} /><meshStandardMaterial color="#c8a070" /></mesh>
          <Tag position={[0, 2.3, 0]} df={8} far={14}>{k}</Tag>
        </group>
      ))}
      <Signpost pos={[-45, 0, 5]} rotY={Math.PI / 2} text="← Mirror Lake · Pass Caves ↑" />
      <Signpost pos={[45, 0, 3]} rotY={-Math.PI / 2} text="Plains of Addition →" />
      {!roadOpen(7, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[50.6, 0.8 + (i % 3) * 0.9, 5 + i * 1.1]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#8a8496" roughness={0.9} flatShading /></mesh>)}
      <Motes count={100} area={[90, 5, 90]} center={[0, 0.5, 0]} color="#ffffff" size={0.05} />
      <WolfPack world={world} spawns={[[22, 18], [26, 22], [20, 24]]} tutorial={false} />
      <Wisps world={world} spawns={[[16, -18], [-18, -22]]} active={(save.shards || 0) >= 5} />
      <PiFollower world={world} />
    </>
  )
}

export default function Peaks({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromCaves = cp.at === 'gate', fromPlains = cp.at === 'east'
  return (
    <GameScene start={fromPlains ? [46, 0, 8] : fromCaves ? [0, 0, -42] : [-46, 0, 8]} startFacing={fromPlains ? -Math.PI / 2 : fromCaves ? 0 : Math.PI / 2} background="#5a5a8a" camDist={6.2}>
      {(world) => <PeaksLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
