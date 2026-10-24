import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Scatter, scatter, Motes, Signpost } from '../engine/kit'
import WolfPack from '../actors/WolfPack'
import { ImpPack, CrabPack } from '../actors/Critters'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, useGame } from '../engine/store'
import { playMusic } from '../audio/sfx'

// The Valence Fields: the overworld between Hydrogen Village (west), the Tide Coast (north-east),
// and Carbon Castle (north, sealed). Roads, a stream with a bridge, hills, ruins, the sea to the east.
// Enemies roam (Radical Wolves, Lone-Pair Imps, Hydronium Crabs on the beach) and return each visit.

const HALF = 70
const COAST_GATE = [62, -43] // the gap in the sea wall (z −46 … −40)
const CASTLE_GATE = [0, -66]
const VILLAGE_GATE = [-68, 0]
const SEA_X = 58 // east of this is beach, then sea

function Road({ pts, width = 4.2, color = '#9a8462' }) {
  // dirt road segments between points (visual only)
  return pts.slice(1).map((b, i) => {
    const a = pts[i]
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz)
    return <mesh key={i} position={[(a[0] + b[0]) / 2, 0.03, (a[1] + b[1]) / 2]} rotation={[-Math.PI / 2, 0, -Math.atan2(dz, dx)]} receiveShadow><planeGeometry args={[l + width, width]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
  })
}

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
  const stone = '#5a5f6e', dark = '#3a3e4a', roof = '#2d3a5a'
  return (
    <group position={[0, 0, -118]}>
      <mesh position={[0, 9, 0]}><boxGeometry args={[30, 18, 16]} /><meshStandardMaterial color={stone} roughness={0.9} /></mesh>
      {[-15, 15].map((x) => <group key={x} position={[x, 0, 8]}><mesh position={[0, 12, 0]}><cylinderGeometry args={[3.2, 3.6, 24, 12]} /><meshStandardMaterial color={dark} roughness={0.9} /></mesh><mesh position={[0, 26, 0]}><coneGeometry args={[4, 7, 12]} /><meshStandardMaterial color={roof} /></mesh></group>)}
      <mesh position={[0, 24, -2]}><cylinderGeometry args={[4.5, 5, 30, 12]} /><meshStandardMaterial color={stone} roughness={0.9} /></mesh>
      <mesh position={[0, 42, -2]}><coneGeometry args={[6, 10, 12]} /><meshStandardMaterial color={roof} /></mesh>
      {/* the empty crown cradle at the top glows faintly: four arms of light, all broken */}
      <mesh position={[0, 49, -2]}><icosahedronGeometry args={[1.4, 1]} /><meshStandardMaterial color="#111" emissive="#ffcf4a" emissiveIntensity={0.6} /></mesh>
      <pointLight position={[0, 48, 4]} color="#ffd76a" intensity={8} distance={40} />
    </group>
  )
}

function Ruin({ pos, rot = 0 }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {[[-1.5, 2.6], [1.5, 1.4], [0, 3.2]].map(([x, h], i) => <mesh key={i} position={[x, h / 2, i === 2 ? -1.6 : 0]} castShadow><cylinderGeometry args={[0.45, 0.55, h, 8]} /><meshStandardMaterial color="#bdb6a4" roughness={0.9} flatShading /></mesh>)}
      <mesh position={[0, 0.25, -0.6]} rotation={[0, 0.4, 0.1]} castShadow><boxGeometry args={[3.4, 0.5, 1]} /><meshStandardMaterial color="#a8a190" roughness={0.95} flatShading /></mesh>
    </group>
  )
}

function Gatehouse({ pos, rotY = 0, label, sealed = false, color = '#8a8474' }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {[-3, 3].map((x) => <mesh key={x} position={[x, 2.5, 0]} castShadow><boxGeometry args={[1.4, 5, 1.4]} /><meshStandardMaterial color={color} roughness={0.9} flatShading /></mesh>)}
      <mesh position={[0, 5.4, 0]} castShadow><boxGeometry args={[8, 1.1, 1.6]} /><meshStandardMaterial color={color} roughness={0.9} flatShading /></mesh>
      {sealed && <mesh position={[0, 2.4, 0]}><boxGeometry args={[4.6, 4.8, 0.3]} /><meshStandardMaterial color="#3a2a50" emissive="#a06bff" emissiveIntensity={0.5} transparent opacity={0.85} /></mesh>}
      <Html position={[0, 6.6, 0]} center distanceFactor={14}><div className="tag3d">{label}</div></Html>
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
    return [x, z, 0.8 + r() * 0.9, r() * 6]
  }).filter(Boolean), [])
  const rocks = useMemo(() => scatter(70, 43, (r) => [(r() - 0.5) * 120, (r() - 0.5) * 120, 0.4 + r() * 1.1, r() * 6]).filter(([x, z]) => x < SEA_X - 3 && !(Math.abs(z) < 4 && x < 20)), [])
  const hills = useMemo(() => scatter(14, 47, (r) => [(r() < 0.5 ? -1 : 1) * (30 + r() * 30), (r() - 0.5) * 120, 6 + r() * 8, 3 + r() * 4]).filter(([x, z, rr]) => x < SEA_X - 12 && Math.abs(z) > rr + 3), [])
  const flowers = useMemo(() => scatter(120, 49, (r) => [(r() - 0.5) * 120, (r() - 0.5) * 120, r()]).filter(([x]) => x < SEA_X - 4), [])

  useEffect(() => {
    playMusic('village')
    const ids = [
      world.addSolid([-HALF - 2, 0, -HALF - 2], [-HALF, 6, -3.2]), world.addSolid([-HALF - 2, 0, 3.2], [-HALF, 6, HALF + 2]),
      world.addSolid([-HALF, 0, HALF], [HALF, 6, HALF + 2]), world.addSolid([-HALF, 0, -HALF - 2], [-3.2, 6, -HALF]), world.addSolid([3.2, 0, -HALF - 2], [HALF, 6, -HALF]),
      world.addSolid([HALF, 0, -HALF], [HALF + 2, 6, HALF]),
      world.addSolid([-3.2, 0, -HALF - 1], [3.2, 6, -HALF + 1.2]), // the castle gate is sealed
      // the sea: wade no further than the surf
      world.addSolid([SEA_X + 8, 0, -HALF], [HALF, 6, COAST_GATE[1] - 3]), world.addSolid([SEA_X + 8, 0, COAST_GATE[1] + 3], [HALF, 6, HALF]),
    ]
    // hills are solid mounds
    hills.forEach(([x, z, rr]) => ids.push(world.addSolid([x - rr * 0.6, 0, z - rr * 0.6], [x + rr * 0.6, 4, z + rr * 0.6])))
    const toVillage = world.addTrigger([-HALF - 1, 0, -3.2], [-HALF + 1.4, 4, 3.2], () => onExit('village', { scene: 'village', at: 'east' }))
    const toCoast = world.addTrigger([HALF - 3, 0, COAST_GATE[1] - 3], [HALF, 4, COAST_GATE[1] + 3], () => onExit('coast', { scene: 'coast', at: 'road' }))
    const castle = world.addTrigger([-4, 0, -HALF + 1], [4, 4, -HALF + 4], () => setState({ toast: { text: 'Carbon Castle is sealed by Malradix. The sages say the crown must be rebuilt shard by shard.', kind: 'info', id: Date.now() } }))
    ids.push(toVillage, toCoast, castle)
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
      ],
      goal: () => {
        const s = getState().save
        if ((s.shards || 0) < 2) return { pos: [HALF - 2, COAST_GATE[1]], label: 'Head to the Tide Coast' }
        return { pos: [VILLAGE_GATE[0] + 2, 0], label: 'Back to Hydrogen Village' }
      },
    }
    return () => { world.map = null }
  }, [world])

  // first visit
  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) < 2 ? 'Cross the Valence Fields to the Tide Coast' : 'The Valence Fields' })
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
      <fog attach="fog" args={['#cfe2f0', 70, 190]} />
      {/* ground, beach, roads, stream */}
      <Slab world={world} x0={-HALF} z0={-HALF} x1={HALF} z1={HALF} y={0} color="#6f9a4e" />
      <mesh position={[SEA_X + 4, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[16, HALF * 2]} /><meshStandardMaterial color="#e3d3a0" roughness={1} /></mesh>
      <Road pts={[[-HALF, 0], [-20, 0], [10, -8], [35, -30], [HALF, COAST_GATE[1]]]} />
      <Road pts={[[-20, 0], [-10, -30], [0, -66]]} width={3.6} />
      <Road pts={[[10, -8], [30, 20], [SEA_X - 2, 30]]} width={3.2} />
      <mesh position={[18, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0.25]}><planeGeometry args={[5, 150]} /><meshStandardMaterial color="#3f8fb0" roughness={0.2} transparent opacity={0.85} /></mesh>
      <group position={[16, 0, -3.5]} rotation={[0, 0.25 + Math.PI / 2, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[7.5, 0.25, 4.2]} /><meshStandardMaterial color="#7a5a3a" roughness={0.9} /></mesh>
        {[-1.9, 1.9].map((z) => <mesh key={z} position={[0, 0.8, z]}><boxGeometry args={[7.5, 0.12, 0.12]} /><meshStandardMaterial color="#5a4028" /></mesh>)}
      </group>
      <Sea />
      {/* gates, landmarks */}
      <Gatehouse pos={[HALF - 1.5, 0, COAST_GATE[1]]} rotY={Math.PI / 2} label="Tide Coast" color="#c7b48a" />
      <Gatehouse pos={[0, 0, -HALF + 0.4]} label="Carbon Castle — sealed" sealed />
      <Gatehouse pos={[-HALF + 0.6, 0, 0]} rotY={Math.PI / 2} label="Hydrogen Village" />
      <Castle />
      <Ruin pos={[-30, 0, -32]} rot={0.4} /><Ruin pos={[30, 0, 40]} rot={-0.8} /><Ruin pos={[-45, 0, 38]} rot={1.6} />
      <Signpost pos={[-17, 0, 3.5]} rotY={0.3} text="← Village · Castle ↑ · Tide Coast →" />
      <Signpost pos={[38, 0, -27]} rotY={-0.6} text="Tide Coast →" />
      {hills.map(([x, z, rr, h], i) => <mesh key={i} position={[x, h / 2 - 0.4, z]} castShadow receiveShadow><coneGeometry args={[rr, h, 9]} /><meshStandardMaterial color={i % 2 ? '#5f8a46' : '#6a9450'} roughness={0.95} flatShading /></mesh>)}
      <Scatter items={trees} kind="tree" />
      <Scatter items={rocks} kind="rock" color="#8a8580" />
      {flowers.map(([x, z, c], i) => <mesh key={i} position={[x, 0.12, z]}><sphereGeometry args={[0.1, 6, 5]} /><meshStandardMaterial color={c < 0.33 ? '#ffd760' : c < 0.66 ? '#ff8aa8' : '#ffffff'} /></mesh>)}
      {/* fences along the main road */}
      {[...Array(10)].map((_, i) => <mesh key={i} position={[-60 + i * 4, 0.5, 3.6]} castShadow><boxGeometry args={[3.6, 0.12, 0.12]} /><meshStandardMaterial color="#7a5a3a" /></mesh>)}
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
  const start = cp.at === 'coast' ? [HALF - 7, 0, COAST_GATE[1]] : [-HALF + 5, 0, 0]
  const facing = cp.at === 'coast' ? -Math.PI / 2 : Math.PI / 2
  return (
    <GameScene start={start} startFacing={facing} background="#a8cfe8" camDist={6.4}>
      {(world) => <FieldLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
