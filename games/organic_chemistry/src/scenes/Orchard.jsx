import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Borana } from '../actors/OrchardFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Reagent Orchards — World 8's route and prep. Old broad trees hung with glowing flasks, crystals in the moss,
// and Alchemist Borana's glass-and-brass tower (assets/locations/world-8-reagent-orchards.png). Borana opens her
// glasshouse once Kai can match each reagent to what it adds across a double bond (§8.2–8.9).
// Built in Blender (tools/orchard_blender.py, tools/borana_blender.py).

preloadModels('orchard', 'borana')
const BORANA = [4.6, 0, -24.5]
const BOARD = [7.4, 0, -22.2]
const TOWER = [0, 0, -36]
const DOOR_Z = -31.4

function Canopy() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#4a6a5a'); gr.addColorStop(0.5, '#8ab098'); gr.addColorStop(0.7, '#d8e8c8'); gr.addColorStop(1, '#6a8a6a')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return <mesh><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
}

const TREES = (() => {
  const out = []
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
    const side = c < 2 ? -1 : 1
    const x = side * (12 + (c % 2) * 14) + ((r * 7 + c * 3) % 5) - 2
    const z = 40 - r * 13 + ((c * 5) % 4)
    if (Math.hypot(x - TOWER[0], z - TOWER[2]) < 12) continue
    out.push([x, 0, z, 0.9 + ((r + c) % 3) * 0.1, r * 1.3 + c])
  }
  return out
})()

function Trees({ world }) {
  const parts = useModelParts('orchard')
  useEffect(() => {
    const ids = TREES.map(([x, , z]) => world.addSolid([x - 0.7, 0, z - 0.7], [x + 0.7, 6, z + 0.7]))
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  const crystals = useMemo(() => [[-6, 20], [8, 12], [-18, -6], [20, -10], [-9, -40], [12, -44], [26, 30], [-28, 28]].map(([x, z], i) => [x, 0, z, 1 + (i % 3) * 0.3, i]), [])
  return (
    <group>
      <InstancedPart parts={parts} name="or_tree" items={TREES} castShadow />
      <InstancedPart parts={parts} name="or_crystal" items={crystals} />
    </group>
  )
}

function OrchardLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.boranaShot)
  const busy = useRef(false)

  useEffect(() => {
    playMusic('orchard')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 50]), world.addSolid([50, 0, -50], [52, 8, 4]), world.addSolid([50, 0, 12], [52, 8, 50]),
      world.addSolid([-50, 0, 50], [-3.5, 8, 52]), world.addSolid([3.5, 0, 50], [50, 8, 52]), world.addSolid([-50, 0, -52], [50, 8, -50]),
      world.addSolid([BORANA[0] - 0.4, 0, BORANA[2] - 0.4], [BORANA[0] + 0.4, 1.9, BORANA[2] + 0.4]),
    ]
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2
      if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) > 0) continue // the door gap, facing +z
      const x = TOWER[0] + Math.sin(a) * 4.2, z = TOWER[2] + Math.cos(a) * 4.2
      ids.push(world.addSolid([x - 1.0, 0, z - 1.0], [x + 1.0, 20, z + 1.0]))
    }
    const back = world.addTrigger([-3.5, 0, 49], [3.5, 4, 52], () => onExit('plains', { scene: 'plains', at: 'south' }))
    const into = world.addTrigger([-1.4, 0, DOOR_Z - 1.6], [1.4, 4, DOOR_Z + 0.2], () => { if (getState().save.t8board) onExit('glasshouse', { scene: 'glasshouse', room: 'entrance' }) })
    const door = world.addSolid([-1.2, 0, DOOR_Z - 0.3], [1.2, 3.2, DOOR_Z + 0.2])
    world.setEnabled(door, !getState().save.t8board)
    world.glassDoor = door
    const ba = world.addInteractable({ pos: BORANA, radius: 2.6, label: 'Speak with Alchemist Borana', onInteract: () => talk() })
    const near = world.addTrigger([-8, 0, -30], [14, 4, -14], () => { if (!getState().save.metBorana) talk() })
    const rocks = world.addSolid([49, 0, 4], [52, 8, 12])
    world.setEnabled(rocks, !roadOpen(9, getState().save.shards))
    const toCliffs = world.addTrigger([49.8, 0, 4], [52, 4, 12], () => { if (roadOpen(9, getState().save.shards)) onExit('cliffs', { scene: 'cliffs', at: 'west' }) })
    ids.push(back, into, door, ba, near, rocks, toCliffs)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.glassDoor) world.setEnabled(world.glassDoor, !save.t8board) }, [save.t8board])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 8 ? 'Take the east road to the Thunder Cliffs' : !s.metBorana ? 'Find the alchemist’s tower' : !s.t8board ? 'Fill in Borana’s recipe board' : 'Enter Borana’s Glasshouse' })
    if (!s.orchardSeen) {
      saveGame({ orchardSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'The trees are growing bottles! Red, blue, purple… is that one fizzing?' },
        { who: 'Pi', text: 'There’s a glass tower ahead. The spark went in there. I’d bet my glow on it.' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#6a8a4a', wall: '#2a3a24', pit: '#1a2414',
      labels: [{ pos: [0, 46], text: '↑ Plains of Addition', align: 'center' }, { pos: [40, 8], text: 'Thunder Cliffs →', align: 'left' }, { pos: [0, -42], text: 'Borana’s tower', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metBorana) return { pos: [BORANA[0], BORANA[2]], label: 'Speak with Alchemist Borana' }
        if (!s.t8board) return { pos: [BOARD[0], BOARD[2]], label: 'Fill in the recipe board' }
        if ((s.shards || 0) < 8) return { pos: [0, DOOR_Z], label: 'Enter the Glasshouse' }
        if ((s.shards || 0) < 10) return { pos: [49, 8], label: 'Take the east road to the Thunder Cliffs' }
        return { pos: [0, 48], label: 'Back to the Plains' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metBorana) {
      saveGame({ metBorana: true })
      if (world.player) world.player.teleport([BORANA[0] - 1.6, 0, BORANA[2] + 2.0], Math.atan2(1.6, -2.0))
      world.camOverride = twoShot(world, BORANA, 3.6, -0.6)
      setState({ boranaShot: true })
      await say([
        { who: 'Alchemist Borana', text: 'Don’t touch the blue ones. Or the red. Actually, touch nothing.' },
        { who: 'Alchemist Borana', text: 'Borana. Markov sent you, I suppose. Every tree here grows one reagent. My glasshouse holds the recipes. Held. Something violet moved in.' },
        { who: 'Alchemist Borana', text: 'Malradix pinned this to my door: “Water is water. Every way of adding it gives the same alcohol.”' },
        { who: 'Pi', text: 'Is he wrong?' },
        { who: 'Alchemist Borana', text: 'Spectacularly. Same alkene, same water, different reagent, different alcohol. I’ll show you.' },
        { who: 'Alchemist Borana', text: 'But nobody enters my glasshouse who can’t read a recipe. The board. Fill it in.' },
      ])
      world.camOverride = null
      setState({ boranaShot: false, objective: 'Fill in Borana’s recipe board' })
    } else if (!s.t8board) {
      await say([{ who: 'Alchemist Borana', text: 'Each reagent brings its own atoms. Read the name: what does it add?' }])
    } else if ((s.shards || 0) < 8) {
      await say([{ who: 'Alchemist Borana', text: s.hasSatchel ? 'You have my satchel. One flask at a time, and read the door before you pour.' : 'My satchel’s inside, past the halogen grove. Mind the wraiths: hit them from behind.' }])
    } else {
      await say([{ who: 'Alchemist Borana', text: 'Recipes back where they belong. Lindlar’s cliffs are next. She likes triple bonds. Odd woman.' }])
    }
    busy.current = false
  }
  const useBoard = async () => {
    if (getState().save.t8board) return
    if (!getState().save.metBorana) { await talk(); return }
    const ok = await openPanel('recipeBoard', {})
    if (!ok) return
    saveGame({ t8board: true }); sfx('open')
    setState({ objective: 'Enter Borana’s Glasshouse' })
    await say([
      { who: 'Alchemist Borana', text: 'Adequate. The door’s open. Inside, every altar asks for one product. Pour the wrong flask and you’ll still make something.' },
      { who: 'Alchemist Borana', text: 'You just won’t like it.' },
    ])
  }

  return (
    <>
      <Canopy />
      <fog attach="fog" args={['#9ab8a0', 40, 160]} />
      <hemisphereLight args={['#e8f8e0', '#3a4a2a', 0.8]} />
      <ambientLight intensity={0.3} color="#e8ffe0" />
      <directionalLight position={[30, 40, 20]} intensity={1.3} color="#fff4d8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={50} visible={false} />
      <Suspense fallback={null}>
        <Part model="orchard" name="or_ground" castShadow={false} receiveShadow />
        <Part model="orchard" name="or_hills" castShadow={false} />
        <Part model="orchard" name="or_path" castShadow={false} receiveShadow />
        <Part model="orchard" name="or_tower" position={TOWER} />
        <Trees world={world} />
      </Suspense>
      <pointLight position={[0, 4, DOOR_Z + 1]} color="#ffdf9a" intensity={4} distance={10} />
      <Tag position={[0, 5.2, DOOR_Z + 0.5]} df={14}>{save.t8board ? 'Borana’s Glasshouse' : 'Borana’s Glasshouse · locked'}</Tag>
      <Borana position={BORANA} rotation={[0, -0.6, 0]} />
      {!shot && <Tag position={[BORANA[0], 2.4, BORANA[2]]} df={8}>Alchemist Borana</Tag>}
      <Station world={world} pos={BOARD} label={save.t8board ? null : 'Fill in the recipe board'} enabled={!save.t8board} solved={!!save.t8board} onUse={useBoard} />
      <mesh position={[BOARD[0] + 1.5, 1.4, BOARD[2] - 0.6]} rotation={[0, -0.5, 0]} castShadow><boxGeometry args={[1.8, 1.2, 0.1]} /><meshStandardMaterial color="#3a2a1a" /></mesh>
      <Signpost pos={[4, 0, 44]} rotY={Math.PI} text="↑ Plains · Borana’s tower ↓" />
      <Signpost pos={[45, 0, 3]} rotY={-Math.PI / 2} text="Thunder Cliffs →" />
      {!roadOpen(9, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[50.6, 0.8 + (i % 3) * 0.9, 5 + i * 1.1]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#6a6458" roughness={0.9} flatShading /></mesh>)}
      <Motes count={180} area={[90, 8, 90]} center={[0, 2, 0]} color="#d8ffd0" size={0.06} />
      <WolfPack world={world} spawns={[[-22, 4], [-26, 8], [-20, 10]]} tutorial={false} />
      <PiFollower world={world} />
    </>
  )
}

export default function Orchard({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromGlass = cp.at === 'gate', fromCliffs = cp.at === 'east'
  return (
    <GameScene start={fromCliffs ? [46, 0, 8] : fromGlass ? [0, 0, -27] : [0, 0, 46]} startFacing={fromCliffs ? -Math.PI / 2 : fromGlass ? 0 : Math.PI} background="#8ab098" camDist={6.2}>
      {(world) => <OrchardLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
