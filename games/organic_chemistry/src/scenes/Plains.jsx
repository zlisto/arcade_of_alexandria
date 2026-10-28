import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Wisps } from '../actors/PeaksFolk'
import { Markov } from '../actors/PlainsFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Plains of Addition — World 7's route and prep. Golden wheat at sunset, Farmer Markov's farm and windmill,
// and the Tower of Addition wrapped in its glowing double-bond spiral (assets/locations/world-7-tower-of-addition.png).
// Markov opens the tower once Kai can label his seed sacks: naming alkenes (§7.3).
// Built in Blender (tools/tower_blender.py, tools/markov_blender.py).

preloadModels('tower', 'markov')
const MARKOV = [-15.5, 0, 3.2]
const SACKS = [-12.6, 0, 6.4]
const TOWER = [0, 0, -50]
const DOOR_Z = -43.6

function Sunset() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#5a4a7a'); gr.addColorStop(0.4, '#c87a6a'); gr.addColorStop(0.62, '#f0a868'); gr.addColorStop(0.72, '#ffd890'); gr.addColorStop(1, '#c89a6a')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return <mesh><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
}

/** the wheat: tufts scattered over the fields, kept off the road, the farmyard and the tower's foot */
function Wheat() {
  const parts = useModelParts('tower')
  const items = useMemo(() => {
    const out = []
    let seed = 7
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    const road = [[-49, 6], [-34, 8], [-22, 4], [-10, -6], [-2, -22], [0, -38]]
    const nearRoad = (x, z) => road.slice(0, -1).some(([ax, az], i) => {
      const [bx, bz] = road[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
      return Math.hypot(x - ax - dx * t, z - az - dz * t) < 4
    })
    for (let i = 0; i < 900; i++) {
      const x = -47 + rnd() * 94, z = -47 + rnd() * 94
      if (nearRoad(x, z)) continue
      if (Math.hypot(x + 20, z + 2) < 11 || Math.hypot(x + 30, z + 14) < 5) continue // the farmyard, the mill
      if (Math.hypot(x - TOWER[0], z - TOWER[2]) < 11) continue
      if (Math.abs(z - 20) < 1.5 || Math.abs(z - 24) < 1.5 || Math.abs(z + 20) < 1.5 || Math.abs(z + 18) < 1.5) continue // hedgerows
      out.push([x, 0, z, 0.8 + rnd() * 0.5, rnd() * 6.28])
    }
    return out
  }, [])
  return <InstancedPart parts={parts} name="pl_wheat" items={items} />
}

function Sails() {
  const g = useRef()
  useFrame((_, dt) => { if (g.current) g.current.rotation.z += dt * 0.4 })
  return <group ref={g} position={[-30, 6.8, -12.1]}><Part model="tower" name="pl_sails" /></group>
}

function PlainsLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.markovShot)
  const busy = useRef(false)

  useEffect(() => {
    playMusic('plains')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 2]), world.addSolid([-52, 0, 10], [-50, 8, 50]),
      world.addSolid([50, 0, -50], [52, 8, 50]), world.addSolid([-50, 0, 50], [-3.5, 8, 52]), world.addSolid([3.5, 0, 50], [50, 8, 52]), world.addSolid([-50, 0, -52], [50, 8, -50]),
      world.addSolid([-22 - 3.4, 0, -4 - 2.6], [-22 + 3.4, 4, -4 + 2.6]), // the farmhouse
      world.addSolid([-32, 0, -16], [-28, 8, -12]), // the mill
      world.addSolid([MARKOV[0] - 0.4, 0, MARKOV[2] - 0.4], [MARKOV[0] + 0.4, 1.9, MARKOV[2] + 0.4]),
    ]
    // the tower: a ring of solids round its base, the door gap facing south
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue
      const x = TOWER[0] + Math.sin(a) * 5.6, z = TOWER[2] + Math.cos(a) * 5.6
      ids.push(world.addSolid([x - 1.3, 0, z - 1.3], [x + 1.3, 30, z + 1.3]))
    }
    const back = world.addTrigger([-52, 0, 2], [-49.2, 4, 10], () => onExit('peaks', { scene: 'peaks', at: 'east' }))
    const into = world.addTrigger([-1.6, 0, DOOR_Z - 1.5], [1.6, 4, DOOR_Z + 0.3], () => { if (getState().save.t7seeds) onExit('tower', { scene: 'tower', room: 'entrance' }) })
    const door = world.addSolid([-1.5, 0, DOOR_Z - 0.3], [1.5, 4, DOOR_Z + 0.2])
    world.setEnabled(door, !getState().save.t7seeds)
    world.towerDoor = door
    const ma = world.addInteractable({ pos: MARKOV, radius: 2.6, label: 'Speak with Farmer Markov', onInteract: () => talk() })
    const near = world.addTrigger([-26, 0, -2], [-6, 4, 14], () => { if (!getState().save.metMarkov) talk() })
    const rocks = world.addSolid([-3.5, 0, 49], [3.5, 8, 52])
    world.setEnabled(rocks, !roadOpen(8, getState().save.shards))
    const toOrchard = world.addTrigger([-3.5, 0, 49.6], [3.5, 4, 52], () => { if (roadOpen(8, getState().save.shards)) onExit('orchard', { scene: 'orchard', at: 'north' }) })
    ids.push(back, into, door, ma, near, rocks, toOrchard)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.towerDoor) world.setEnabled(world.towerDoor, !save.t7seeds) }, [save.t7seeds])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 7 ? 'Take the south road to the Reagent Orchards' : !s.metMarkov ? 'Follow the road to the farm' : !s.t7seeds ? 'Label Markov’s seed sacks' : 'Climb the Tower of Addition' })
    if (!s.plainsSeen) {
      saveGame({ plainsSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'Wheat as far as I can see! And that tower has a glowing double bond wrapped round it.' },
        { who: 'Pi', text: 'The violet spark went in at the top. I saw it!' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#d8b060', wall: '#6a4a2a', pit: '#3a2a1a',
      labels: [{ pos: [-44, 6], text: '← Activation Peaks', align: 'left' }, { pos: [0, 45], text: '↓ Reagent Orchards', align: 'center' }, { pos: [0, -40], text: 'The Tower of Addition', align: 'center' }, { pos: [-22, 2], text: 'Markov’s farm', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metMarkov) return { pos: [MARKOV[0], MARKOV[2]], label: 'Speak with Farmer Markov' }
        if (!s.t7seeds) return { pos: [SACKS[0], SACKS[2]], label: 'Label the seed sacks' }
        if ((s.shards || 0) < 7) return { pos: [0, DOOR_Z], label: 'Enter the Tower of Addition' }
        if ((s.shards || 0) < 9) return { pos: [0, 49], label: 'Take the south road to the Reagent Orchards' }
        return { pos: [-48, 6], label: 'Back to the Activation Peaks' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metMarkov) {
      saveGame({ metMarkov: true })
      if (world.player) world.player.teleport([MARKOV[0] + 1.4, 0, MARKOV[2] + 2.2], Math.atan2(-1.4, -2.2))
      world.camOverride = twoShot(world, MARKOV, 3.6, 0.5)
      setState({ markovShot: true })
      await say([
        { who: 'Farmer Markov', text: 'Ho there! Mind the wheat, lad. Every stalk out here’s waiting for something to add on.' },
        { who: 'Farmer Markov', text: 'Markov. I farm the plains and I keep the tower. Or I did, till a violet spark moved in up top.' },
        { who: 'Farmer Markov', text: 'Malradix nailed a notice to my door: “HX adds to a double bond any which way.” Any which way! Ha!' },
        { who: 'Pi', text: 'It doesn’t?' },
        { who: 'Farmer Markov', text: 'Never has. The rich get richer: the carbon with more H gets the H. You’ll see inside.' },
        { who: 'Farmer Markov', text: 'But first, my seed sacks lost their labels in the wind. Name the crop in each and I’ll unbar the door.' },
      ])
      world.camOverride = null
      setState({ markovShot: false, objective: 'Label Markov’s seed sacks' })
    } else if (!s.t7seeds) {
      await say([{ who: 'Farmer Markov', text: 'Longest chain with the double bond in it. Count from the end nearest the double bond. That’s all there is.' }])
    } else if ((s.shards || 0) < 7) {
      await say([{ who: 'Farmer Markov', text: s.hasSling ? 'That sling was my grandad’s. Aim the proton where the H’s already are.' : 'Grandad’s Proton Sling is up on the third floor. You’ll want it.' }])
    } else {
      await say([{ who: 'Farmer Markov', text: 'Harvest’s in and the tower’s quiet. Borana’s orchards are next. She grows reagents. On trees!' }])
    }
    busy.current = false
  }
  const useSacks = async () => {
    if (getState().save.t7seeds) return
    if (!getState().save.metMarkov) { await talk(); return }
    const ok = await openPanel('seedLabels', {})
    if (!ok) return
    saveGame({ t7seeds: true }); sfx('open')
    setState({ objective: 'Climb the Tower of Addition' })
    await say([
      { who: 'Farmer Markov', text: 'Lovely. The tower door’s open. Every floor is a lesson in what adds where.' },
      { who: 'Farmer Markov', text: 'And when you meet that phantom: a carbocation always wants the best seat. Get there first.' },
    ])
  }

  return (
    <>
      <Sunset />
      <fog attach="fog" args={['#e8b88a', 60, 220]} />
      <hemisphereLight args={['#ffe0b0', '#7a5a3a', 0.85]} />
      <ambientLight intensity={0.3} color="#ffe0c0" />
      <directionalLight position={[-60, 30, -30]} intensity={1.6} color="#ffc880" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={50} visible={false} />
      <Suspense fallback={null}>
        <Part model="tower" name="pl_ground" castShadow={false} receiveShadow />
        <Part model="tower" name="pl_hills" castShadow={false} />
        <Part model="tower" name="pl_road" castShadow={false} receiveShadow />
        <Part model="tower" name="pl_tower" position={TOWER} />
        <Part model="tower" name="pl_farm" position={[-22, 0, -4]} />
        <Part model="tower" name="pl_mill" position={[-30, 0, -14]} />
        <Sails />
        <Wheat />
      </Suspense>
      <Tag position={[0, 6.5, DOOR_Z + 0.5]} df={14}>{save.t7seeds ? 'The Tower of Addition' : 'The Tower of Addition · barred'}</Tag>
      {!save.t7seeds && <mesh position={[0, 1.8, DOOR_Z]}><boxGeometry args={[3, 3.6, 0.3]} /><meshStandardMaterial color="#4a2e1a" roughness={0.9} /></mesh>}
      <Markov position={MARKOV} rotation={[0, 0.5, 0]} />
      {!shot && <Tag position={[MARKOV[0], 2.5, MARKOV[2]]} df={8}>Farmer Markov</Tag>}
      <Station world={world} pos={SACKS} label={save.t7seeds ? null : 'Label the seed sacks'} enabled={!save.t7seeds} solved={!!save.t7seeds} onUse={useSacks} />
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[SACKS[0] + 1.6 + k * 0.9, 0.45, SACKS[2] - 0.8]} castShadow><sphereGeometry args={[0.45, 14, 10]} /><meshStandardMaterial color="#c8b088" roughness={0.95} /></mesh>
      ))}
      <Signpost pos={[-45, 0, 3]} rotY={Math.PI / 2} text="← Activation Peaks · Tower ↑" />
      <Signpost pos={[4.5, 0, 45]} rotY={Math.PI} text="Reagent Orchards ↓" />
      {!roadOpen(8, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[-3 + i * 1.0, 0.8 + (i % 3) * 0.9, 50.6]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#9a8466" roughness={0.9} flatShading /></mesh>)}
      <Motes count={160} area={[90, 6, 90]} center={[0, 1.2, 0]} color="#ffe8a0" size={0.07} />
      <WolfPack world={world} spawns={[[22, 14], [26, 18], [18, 20]]} tutorial={false} />
      <Wisps world={world} spawns={[[20, -24], [-22, -30]]} active />
      <PiFollower world={world} />
    </>
  )
}

export default function Plains({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromTower = cp.at === 'gate', fromOrchard = cp.at === 'south'
  return (
    <GameScene start={fromOrchard ? [0, 0, 46] : fromTower ? [0, 0, -38] : [-46, 0, 6]} startFacing={fromOrchard ? Math.PI : fromTower ? 0 : Math.PI / 2} background="#e8a070" camDist={6.2}>
      {(world) => <PlainsLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
