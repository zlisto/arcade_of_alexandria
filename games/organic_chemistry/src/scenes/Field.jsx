import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, scatter, Motes, Signpost } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { ImpPack, CrabPack } from '../actors/Critters'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, toast, useGame } from '../engine/store'
import { playMusic } from '../audio/sfx'

// The Valence Fields: the overworld between Hydrogen Village (west), the Tide Coast (north-east),
// and Carbon Castle (north, sealed). Roads, a stream with a bridge, hills, ruins, the sea to the east.
// Enemies roam (Radical Wolves, Lone-Pair Imps, Hydronium Crabs on the beach) and return each visit.
// The land, roads, beach, horizon, bridge, gatehouses, castle, ruins, hills and fences are built in Blender
// (tools/field_blender.py → public/models/field.glb); trees, rocks and flowers reuse the village kit.

const HALF = 70
preloadModels('field', 'critters', 'hydra')
const COAST_GATE = [62, -43] // the gap in the sea wall (z −46 … −40)
const CASTLE_GATE = [0, -66]
const VILLAGE_GATE = [-68, 0]
const FOREST_GATE = [-40, -68] // north-west: the forest road to the Chain Forest (World 3)
const SEA_X = 58 // east of this is beach, then sea

function Sea() {
  // the sea east of the beach, with a gentle swell
  const ref = useRef()
  const geo = useMemo(() => new THREE.PlaneGeometry(60, 160, 30, 60), [])
  const base = useMemo(() => geo.attributes.position.array.slice(), [geo])
  useFrame(({ clock }) => {
    const p = geo.attributes.position, t = clock.elapsedTime
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(base[i * 3] * 0.35 + t * 1.2) * 0.12 + Math.cos(base[i * 3 + 1] * 0.25 + t) * 0.1)
    p.needsUpdate = true
  })
  return <mesh ref={ref} geometry={geo} position={[SEA_X + 38, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}><meshStandardMaterial color="#2a8fb0" roughness={0.25} metalness={0.1} transparent opacity={0.92} /></mesh>
}

function Castle() {
  // Carbon Castle in the north distance, beyond the sealed gate
  return (
    <group position={[0, 0, -118]}>
      <Part model="field" name="fld_castle" castShadow={false} />
      {/* the empty crown cradle at the top glows faintly: four arms of light, all broken */}
      <mesh position={[0, 49, -2]}><icosahedronGeometry args={[1.4, 1]} /><meshStandardMaterial color="#111" emissive="#ffcf4a" emissiveIntensity={0.6} /></mesh>
      <pointLight position={[0, 48, 4]} color="#ffd76a" intensity={8} distance={40} />
    </group>
  )
}

function Ruin({ pos, rot = 0 }) {
  return <Part model="field" name="fld_ruin" position={pos} rotation={[0, rot, 0]} />
}

const gateMats = {}
function Gatehouse({ pos, rotY = 0, label, sealed = false, color = '#8a8474' }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <Part model="field" name="fld_gate" mats={(gateMats[color] = gateMats[color] || { stone: new THREE.MeshStandardMaterial({ color, roughness: 0.9 }) })} />
      {sealed && <mesh position={[0, 2.4, 0]}><boxGeometry args={[4.6, 4.8, 0.3]} /><meshStandardMaterial color="#3a2a50" emissive="#a06bff" emissiveIntensity={0.5} transparent opacity={0.85} /></mesh>}
      <Html position={[0, 6.6, 0]} center distanceFactor={14}><div className="tag3d">{label}</div></Html>
    </group>
  )
}

const FLOWER_COLORS = ['#ffd760', '#ff8aa8', '#ffffff', '#cfa8ff'].map((c) => new THREE.Color(c))
function FieldNature({ trees, rocks, flowers, hills }) {
  const parts = useModelParts('village')
  const field = useModelParts('field')
  const sets = useMemo(() => {
    const pine = [], oak = [], r = [[], [], []]
    trees.forEach(([x, z, sc, rot], i) => (i % 3 === 0 ? oak.push([x, 0, z, sc * 1.15, rot]) : pine.push([x, 0, z, sc * 1.05, rot])))
    rocks.forEach(([x, z, sc, rot], i) => r[i % 3].push([x, 0, z, sc * 0.6, rot]))
    const fl = flowers.map(([x, z, c], i) => [x, 0, z, 0.8 + c * 0.6, i])
    const tufts = scatter(2600, 53, (rn) => {
      const x = (rn() - 0.5) * 2 * (HALF - 1), z = (rn() - 0.5) * 2 * (HALF - 1)
      if (x > SEA_X - 4 || (Math.abs(z) < 3 && x < 20)) return null
      if (hills.some(([hx, hz, rr]) => Math.hypot(x - hx, z - hz) < rr * 0.8)) return null
      return [x, 0, z, 0.7 + rn() * 0.6, rn() * 6.3]
    })
    const fences = [...Array(10)].map((_, i) => [-60 + i * 4, 0, 3.6, 1, 0])
    return { pine, oak, r, fl, tufts, fences }
  }, [trees, rocks, flowers, hills])
  return (
    <group>
      <InstancedPart parts={parts} name="pine" items={sets.pine} castShadow />
      <InstancedPart parts={parts} name="oak" items={sets.oak} castShadow />
      {sets.r.map((items, k) => <InstancedPart key={k} parts={parts} name={'rock' + k} items={items} castShadow />)}
      <InstancedPart parts={parts} name="tuft" items={sets.tufts} />
      <InstancedPart parts={parts} name="flowerHead" items={sets.fl} colors={FLOWER_COLORS} />
      <InstancedPart parts={parts} name="flowerStem" items={sets.fl} />
      <InstancedPart parts={field} name="fld_fence" items={sets.fences} castShadow />
    </group>
  )
}

function FieldLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const trees = useMemo(() => scatter(160, 41, (r) => {
    const x = (r() - 0.5) * 2 * (HALF - 3), z = (r() - 0.5) * 2 * (HALF - 3)
    // keep roads, the beach and gate mouths clear
    if (x > SEA_X - 6) return null
    if (Math.abs(z) < 5 && x < 20) return null
    if (Math.hypot(x - COAST_GATE[0], z - COAST_GATE[1]) < 12 || Math.hypot(x - CASTLE_GATE[0], z - CASTLE_GATE[1]) < 10) return null
    if (Math.abs(x) < 4 && z < 0 && z > -66) return null // the castle road
    { const t = Math.max(0, Math.min(1, ((x + 20) * -20 + z * -68) / (400 + 4624))); if (Math.hypot(x - (-20 - 20 * t), z - (-68 * t)) < 5) return null } // the forest road
    return [x, z, 0.8 + r() * 0.9, r() * 6]
  }).filter(Boolean), [])
  const rocks = useMemo(() => scatter(70, 43, (r) => [(r() - 0.5) * 120, (r() - 0.5) * 120, 0.4 + r() * 1.1, r() * 6]).filter(([x, z]) => x < SEA_X - 3 && !(Math.abs(z) < 4 && x < 20)), [])
  const hills = useMemo(() => scatter(14, 47, (r) => [(r() < 0.5 ? -1 : 1) * (30 + r() * 30), (r() - 0.5) * 120, 6 + r() * 8, 3 + r() * 4]).filter(([x, z, rr]) => x < SEA_X - 12 && Math.abs(z) > rr + 3), [])
  const flowers = useMemo(() => scatter(120, 49, (r) => [(r() - 0.5) * 120, (r() - 0.5) * 120, r()]).filter(([x]) => x < SEA_X - 4), [])

  useEffect(() => {
    playMusic('village')
    const ids = [
      world.addSolid([-HALF - 2, 0, -HALF - 2], [-HALF, 6, -3.2]), world.addSolid([-HALF - 2, 0, 3.2], [-HALF, 6, HALF + 2]),
      world.addSolid([-HALF, 0, HALF], [HALF, 6, HALF + 2]), world.addSolid([-HALF, 0, -HALF - 2], [FOREST_GATE[0] - 3.2, 6, -HALF]), world.addSolid([FOREST_GATE[0] + 3.2, 0, -HALF - 2], [-3.2, 6, -HALF]), world.addSolid([3.2, 0, -HALF - 2], [HALF, 6, -HALF]),
      world.addSolid([HALF, 0, -HALF], [HALF + 2, 6, HALF]),
      world.addSolid([-3.2, 0, -HALF - 1], [3.2, 6, -HALF + 1.2]), // the castle gate is sealed
      // the sea: wade no further than the surf
      world.addSolid([SEA_X + 8, 0, -HALF], [HALF, 6, COAST_GATE[1] - 3]), world.addSolid([SEA_X + 8, 0, COAST_GATE[1] + 3], [HALF, 6, HALF]),
    ]
    // thorny roots across the forest road until two shards are held
    const thorns = world.addSolid([FOREST_GATE[0] - 3.2, 0, -HALF - 1], [FOREST_GATE[0] + 3.2, 6, -HALF + 0.8])
    world.setEnabled(thorns, (getState().save.shards || 0) < 2)
    ids.push(thorns)
    // hills are solid mounds
    hills.forEach(([x, z, rr]) => ids.push(world.addSolid([x - rr * 0.84, 0, z - rr * 0.84], [x + rr * 0.84, 4, z + rr * 0.84])))
    const toVillage = world.addTrigger([-HALF - 1, 0, -3.2], [-HALF + 1.4, 4, 3.2], () => onExit('village', { scene: 'village', at: 'east' }))
    const toCoast = world.addTrigger([HALF - 3, 0, COAST_GATE[1] - 3], [HALF, 4, COAST_GATE[1] + 3], () => onExit('coast', { scene: 'coast', at: 'road' }))
    const castle = world.addTrigger([-4, 0, -HALF + 1], [4, 4, -HALF + 4], () => setState({ toast: { text: 'Carbon Castle is sealed by Malradix. The sages say the crown must be rebuilt shard by shard.', kind: 'info', id: Date.now() } }))
    const toForest = world.addTrigger([FOREST_GATE[0] - 3, 0, -HALF - 1], [FOREST_GATE[0] + 3, 4, -HALF + 1.4], () => {
      if ((getState().save.shards || 0) >= 2) onExit('forest', { scene: 'forest', at: 'south' })
      else toast('Thorny roots. Two Bond Shards will part them.', 'info', 3200)
    })
    ids.push(toVillage, toCoast, castle, toForest)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])

  // map: roads, gates, what to do next
  useEffect(() => {
    world.map = {
      floor: '#6f9a55', wall: '#4a4038', pit: '#2a6f8a',
      labels: [
        { pos: [VILLAGE_GATE[0] + 6, VILLAGE_GATE[1] + 4], text: '← Hydrogen Village', align: 'left' },
        { pos: [COAST_GATE[0] - 6, COAST_GATE[1] + 6], text: 'Tide Coast →', align: 'right' },
        { pos: [CASTLE_GATE[0], CASTLE_GATE[1] + 6], text: 'Carbon Castle (sealed)', align: 'center' },
        { pos: [SEA_X + 4, 20], text: 'Beach', align: 'center' },
        { pos: [FOREST_GATE[0], FOREST_GATE[1] + 6], text: 'Chain Forest ↑', align: 'center' },
      ],
      goal: () => {
        const s = getState().save
        if ((s.shards || 0) < 2) return { pos: [HALF - 2, COAST_GATE[1]], label: 'Head to the Tide Coast' }
        if ((s.shards || 0) < 3) return { pos: [FOREST_GATE[0], FOREST_GATE[1] + 1], label: 'Take the forest road to the Chain Forest' }
        return { pos: [VILLAGE_GATE[0] + 2, 0], label: 'Back to Hydrogen Village' }
      },
    }
    return () => { world.map = null }
  }, [world])

  // first visit
  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) < 2 ? 'Cross the Valence Fields to the Tide Coast' : (s.shards || 0) < 3 ? 'Take the forest road north-west to the Chain Forest' : 'The Valence Fields' })
    if ((s.shards || 0) >= 2 && !s.thornsSeen) { saveGame({ thornsSeen: true }); setTimeout(() => toast('Pi: The forest-road thorns pulled back! Two shards — the road north-west is open.', 'good', 4200), 1500) }
    if (!s.fieldSeen) {
      saveGame({ fieldSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'The Valence Fields! Carbon Castle is way up north — see the empty crown cradle on its tower?' },
        { who: 'Pi', text: "Octavia said the next shard is at the Tide Temple. The road north-east goes to the Tide Coast. Watch out: Malradix's creatures roam out here." },
        { who: 'Pi', text: 'Press M any time — the map shows where to go, and the Kingdom tab shows the whole realm.' },
      ]), 800)
    }
  }, [])

  return (
    <>
      <Sky sunPosition={[60, 40, -30]} turbidity={6} rayleigh={1.4} />
      <hemisphereLight args={['#dff0ff', '#6a8a4a', 0.9]} />
      <directionalLight position={[30, 40, 18]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
      <fog attach="fog" args={['#cfe2f0', 95, 340]} />
      {/* ground, beach, roads, stream */}
      <Slab world={world} x0={-HALF} z0={-HALF} x1={HALF} z1={HALF} y={0} color="#6f9a4e" visible={false} />
      <Part model="field" name="fld_ground" castShadow={false} receiveShadow />
      <Part model="field" name="fld_roads" castShadow={false} receiveShadow />
      <Part model="field" name="fld_beach" castShadow={false} receiveShadow />
      <Part model="field" name="fld_banks" castShadow={false} receiveShadow />
      <Part model="field" name="fld_horizon" castShadow={false} />
      <mesh position={[18, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0.25]}><planeGeometry args={[5, 150]} /><meshStandardMaterial color="#3f8fb0" roughness={0.2} transparent opacity={0.85} /></mesh>
      <Part model="field" name="fld_bridge" position={[16, 0, -3.5]} rotation={[0, 0.25 + Math.PI / 2, 0]} />
      <Sea />
      {/* gates, landmarks */}
      <Gatehouse pos={[HALF - 1.5, 0, COAST_GATE[1]]} rotY={Math.PI / 2} label="Tide Coast" color="#c7b48a" />
      <Gatehouse pos={[0, 0, -HALF + 0.4]} label="Carbon Castle — sealed" sealed />
      <Gatehouse pos={[-HALF + 0.6, 0, 0]} rotY={Math.PI / 2} label="Hydrogen Village" />
      <Gatehouse pos={[FOREST_GATE[0], 0, -HALF + 0.4]} label={(save.shards || 0) >= 2 ? 'Chain Forest' : 'Chain Forest — thorny roots'} sealed={(save.shards || 0) < 2} color="#6a5a44" />
      <Castle />
      <Ruin pos={[-30, 0, -32]} rot={0.4} /><Ruin pos={[30, 0, 40]} rot={-0.8} /><Ruin pos={[-45, 0, 38]} rot={1.6} />
      <Signpost pos={[-17, 0, 3.5]} rotY={0.3} text="← Village · Castle ↑ · Tide Coast →" />
      <Signpost pos={[38, 0, -27]} rotY={-0.6} text="Tide Coast →" />
      {hills.map(([x, z, rr, h], i) => <Part key={i} model="field" name="fld_hill" position={[x, -0.4, z]} scale={[rr * 0.78, h, rr * 0.78]} receiveShadow />)}
      <Suspense fallback={null}><FieldNature trees={trees} rocks={rocks} flowers={flowers} hills={hills} /></Suspense>
      <Motes count={90} area={[120, 6, 120]} center={[0, 0.4, 0]} color="#fff6c0" size={0.08} />
      {/* creatures */}
      <WolfPack world={world} spawns={[[-28, 14], [-22, 18]]} tutorial={false} />
      <WolfPack world={world} spawns={[[8, -40], [14, -44], [4, -46]]} tutorial={false} />
      <ImpPack world={world} spawns={[[24, -14], [28, -18], [20, -20], [-8, -22], [-12, -18]]} />
      <CrabPack world={world} spawns={[[SEA_X + 3, 6], [SEA_X + 5, 22], [SEA_X + 3, 38], [SEA_X + 4, -16]]} />
      <PiFollower world={world} />
    </>
  )
}

export default function Field({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const start = cp.at === 'coast' ? [HALF - 7, 0, COAST_GATE[1]] : cp.at === 'forest' ? [FOREST_GATE[0], 0, -HALF + 5] : [-HALF + 5, 0, 0]
  const facing = cp.at === 'coast' ? -Math.PI / 2 : cp.at === 'forest' ? 0 : Math.PI / 2
  return (
    <GameScene start={start} startFacing={facing} background="#a8cfe8" camDist={6.4}>
      {(world) => <FieldLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
