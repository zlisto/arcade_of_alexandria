import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Block, Slab, Gate, Station, Scatter, scatter, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Aufbau } from '../actors/Figures'
import WolfPack from '../actors/WolfPack'
import Colossus from '../actors/Colossus'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { ROOMS, STATIONS, FORGE, BOSS, GOALS } from '../data/dungeon1'

// Dungeon 1 — The Orbital Caverns (Chapter 1). Teach → practice → twist → master in each chamber.

const W = 8 // half width of the halls
const has = (id) => !!getState().save.solved[id]

function CaveDressing() {
  const crystals = useMemo(() => scatter(120, 5, (r) => {
    const z = -2 - r() * 150
    const side = r() < 0.5 ? -1 : 1
    if (z < -126 && z > -158) return [side * (11 + r() * 3), z, 0.6 + r() * 1.4, r() * 6]
    return [side * (W - 0.3 - r() * 0.6), z, 0.5 + r() * 1.2, r() * 6]
  }), [])
  const stalac = useMemo(() => scatter(110, 9, (r) => [(r() - 0.5) * 15, -2 - r() * 155, 0.6 + r() * 1.3, r() * 6]), [])
  const rocks = useMemo(() => scatter(70, 13, (r) => {
    const side = r() < 0.5 ? -1 : 1
    return [side * (W - 0.8 - r() * 1.2), -2 - r() * 120, 0.5 + r() * 0.9, r() * 6]
  }), [])
  const sref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => {
    stalac.forEach(([x, z, s], i) => { dummy.position.set(x, 9 - s * 0.8, z); dummy.rotation.set(Math.PI, 0, 0); dummy.scale.set(s * 0.5, s * 1.6, s * 0.5); dummy.updateMatrix(); sref.current.setMatrixAt(i, dummy.matrix) })
    sref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <group>
      <Scatter items={crystals} kind="crystal" />
      <Scatter items={rocks} kind="rock" color="#3a3848" />
      <instancedMesh ref={sref} args={[null, null, stalac.length]}><coneGeometry args={[0.5, 1, 6]} /><meshStandardMaterial color="#2a2836" roughness={0.9} flatShading /></instancedMesh>
      <mesh position={[0, 9.5, -78]}><boxGeometry args={[40, 1, 170]} /><meshStandardMaterial color="#1e2a34" roughness={1} /></mesh>
      <Motes count={260} area={[16, 8, 160]} center={[0, 0.2, -78]} color="#8fe8ff" size={0.05} />
      {/* teal crystal veins running along both walls, like the concept art's glowing tube */}
      {[-1, 1].map((sd) => [...Array(14)].map((_, k) => <mesh key={sd + '-' + k} position={[sd * (W - 0.02), 2.2 + (k % 3) * 1.6, -6 - k * 8.6]} rotation={[0, 0, sd * (0.5 + (k % 2) * 0.5)]}><boxGeometry args={[0.05, 3.2, 0.18]} /><meshBasicMaterial color="#43e6f5" toneMapped={false} /></mesh>))}
      {/* a ring of lamp-dots overhead at the start of every room: shells of light */}
      {[-14, -32, -50, -76, -112].map((z) => [...Array(16)].map((_, k) => { const a = (k / 16) * Math.PI; return <mesh key={z + '-' + k} position={[Math.cos(a) * (W - 0.4), 0.6 + Math.sin(a) * 7.6, z - 0.6]}><sphereGeometry args={[0.13, 8, 6]} /><meshBasicMaterial color="#bff6ff" toneMapped={false} /></mesh> }))}
    </group>
  )
}

/** Side walls for a stretch of hall, with p-orbital murals in the Hall of Shells. */
function Walls({ world, z0, z1, half = W, color = '#3a4052' }) {
  const len = Math.abs(z1 - z0)
  const zc = (z0 + z1) / 2
  return (
    <group>
      <Block world={world} pos={[-half - 1, 4.5, zc]} size={[2, 9, len]} color={color} />
      <Block world={world} pos={[half + 1, 4.5, zc]} size={[2, 9, len]} color={color} />
    </group>
  )
}

/** "You got it!": the item rises out of the chest and turns, glowing. */
function ItemReveal({ kind, pos }) {
  const g = useRef()
  useFrame(({ clock }, dt) => { if (g.current) { g.current.position.y = Math.min(2.1, g.current.position.y + dt * 1.6); g.current.rotation.y = clock.elapsedTime * 2 } })
  const gold = <meshStandardMaterial color="#ffe08a" emissive="#ffcf4a" emissiveIntensity={1.6} metalness={0.4} roughness={0.25} toneMapped={false} />
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <group ref={g} position={[0, 0.8, 0]}>
        {kind === '1-4crystal' && <mesh><octahedronGeometry args={[0.4, 0]} /><meshStandardMaterial color="#43e6f5" emissive="#43e6f5" emissiveIntensity={2.4} toneMapped={false} /></mesh>}
        {(kind === 't1-key' || kind === 't1-bosskey') && <group scale={kind === 't1-bosskey' ? 1.5 : 1}><mesh position={[0, 0.25, 0]}><torusGeometry args={[0.16, 0.05, 8, 18]} />{gold}</mesh><mesh position={[0, -0.12, 0]}><boxGeometry args={[0.07, 0.6, 0.07]} />{gold}</mesh><mesh position={[0.1, -0.35, 0]}><boxGeometry args={[0.18, 0.07, 0.07]} />{gold}</mesh></group>}
        {kind === 't1-map' && <mesh rotation={[0.3, 0, 0]}><planeGeometry args={[0.7, 0.5]} /><meshStandardMaterial color="#e8dcb8" side={THREE.DoubleSide} emissive="#6a5a30" emissiveIntensity={0.4} /></mesh>}
        {kind === 't1-compass' && <group><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 0.08, 20]} />{gold}</mesh><mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.05, 0.4, 4]} /><meshBasicMaterial color="#c0394b" /></mesh></group>}
      </group>
      <pointLight position={[0, 2.2, 0.6]} color="#ffe6a0" intensity={4} distance={6} />
    </group>
  )
}

/** The Nucleus Grotto's landmark: a cluster of protons and neutrons with electrons orbiting far out. */
function Nucleus({ pos }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.rotation.y = clock.elapsedTime * 0.3 })
  const balls = useMemo(() => [...Array(13)].map((_, i) => { const a = i * 2.4, r = 0.25 + Math.sqrt(i) * 0.25; return [Math.cos(a) * r, Math.sin(i * 1.7) * 0.35, Math.sin(a) * r, i % 2] }), [])
  return (
    <group position={pos}>
      <group ref={g}>
        {balls.map(([x, y, z, n], i) => <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.32, 14, 12]} /><meshStandardMaterial color={n ? '#9aa3ad' : '#e0453b'} roughness={0.4} /></mesh>)}
        {[0, 1].map((k) => <group key={k} rotation={[k ? 1.1 : 0.3, 0, k ? 0.4 : -0.3]}><mesh><torusGeometry args={[2.4 + k * 1.2, 0.02, 6, 60]} /><meshBasicMaterial color="#43e6f5" transparent opacity={0.5} /></mesh><mesh position={[2.4 + k * 1.2, 0, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshBasicMaterial color="#43e6f5" toneMapped={false} /></mesh></group>)}
      </group>
      <pointLight color="#ff8a6a" intensity={3} distance={8} />
    </group>
  )
}

function Lamps({ z, lit }) {
  // a lamp row above the exit gate: 1s · 2s · 2p 2p 2p — the shells fill as the stations are solved.
  // Kept high (y 7.9) so it never blocks the walkway or the camera.
  const lamps = [[0, -3.6, '1s'], [1, -1.8, '2s'], [2, 0.2, '2p'], [2, 1.4, ''], [2, 2.6, '']]
  return (
    <group position={[0, 4.4, z]}>
      <mesh position={[-0.5, 0, -0.25]}><boxGeometry args={[8.6, 1.1, 0.3]} /><meshStandardMaterial color="#1c1a22" roughness={0.9} /></mesh>
      {lamps.map(([r, x, tag]) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh><sphereGeometry args={[0.34, 14, 12]} /><meshStandardMaterial color={lit > r ? '#ffe6a0' : '#333'} emissive={lit > r ? '#ffcf6a' : '#000'} emissiveIntensity={1.6} toneMapped={false} /></mesh>
          {tag && <Html position={[0, -0.75, 0]} center distanceFactor={12}><div className="tag3d">{tag}</div></Html>}
        </group>
      ))}
      {lit > 0 && <pointLight position={[0, -2, 2]} color="#ffe6a0" intensity={3 + lit * 2} distance={12} />}
    </group>
  )
}

function OrbitalMural({ pos, axis = 'x', color = '#43e6f5' }) {
  const rot = axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]
  return (
    <group position={pos} rotation={rot}>
      <mesh position={[0, 0.7, 0]} scale={[0.55, 0.85, 0.55]}><sphereGeometry args={[0.8, 16, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent opacity={0.55} /></mesh>
      <mesh position={[0, -0.7, 0]} scale={[0.55, 0.85, 0.55]}><sphereGeometry args={[0.8, 16, 12]} /><meshStandardMaterial color="#c0394b" emissive="#c0394b" emissiveIntensity={0.9} transparent opacity={0.55} /></mesh>
    </group>
  )
}

function Painting({ pos, rotY, title, solved }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh><boxGeometry args={[3.2, 2.4, 0.15]} /><meshStandardMaterial color="#6a4a22" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0, 0, 0.09]}><planeGeometry args={[2.8, 2]} /><meshStandardMaterial color={solved ? '#f2efe6' : '#cfcabd'} emissive={solved ? '#fff3c4' : '#000'} emissiveIntensity={0.25} /></mesh>
      <Html position={[0, 0, 0.12]} center transform distanceFactor={4} occlude={false}><div className="paint">{title}</div></Html>
    </group>
  )
}

function BridgePiece({ world, z0, z1, raised }) {
  const ref = useRef()
  const id = useRef(null)
  const h = useRef(raised ? 0 : -6)
  useEffect(() => { id.current = world.addFloor(-1.9, Math.min(z0, z1), 1.9, Math.max(z0, z1), 0); return () => world.remove(id.current) }, [world])
  useEffect(() => { world.setEnabled(id.current, raised) }, [raised])
  useFrame((_, dt) => {
    h.current += ((raised ? 0 : -6) - h.current) * Math.min(1, dt * 2)
    if (ref.current) { ref.current.position.y = h.current - 0.3; ref.current.visible = h.current > -5.8 }
  })
  return (
    <mesh ref={ref} position={[0, -6, (z0 + z1) / 2]} castShadow receiveShadow>
      <boxGeometry args={[3.8, 0.6, Math.abs(z1 - z0) - 0.1]} />
      <meshStandardMaterial color="#3a4a5a" emissive="#43e6f5" emissiveIntensity={0.15} roughness={0.6} />
    </mesh>
  )
}

function PiPillar({ pos, angle, onTurn, world }) {
  const g = useRef()
  const cb = useRef(onTurn)
  cb.current = onTurn
  useEffect(() => {
    const id = world.addInteractable({ pos, radius: 2, label: 'Turn the p orbital 45°', onInteract: () => cb.current() })
    const s = world.addSolid([pos[0] - 0.5, 0, pos[2] - 0.5], [pos[0] + 0.5, 1.4, pos[2] + 0.5])
    return () => { world.remove(id); world.remove(s) }
  }, [world])
  useFrame((_, dt) => { if (g.current) g.current.rotation.z += ((angle * Math.PI) / 180 - g.current.rotation.z) * Math.min(1, dt * 6) })
  return (
    <group position={pos}>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.45, 0.5, 1.4, 8]} /><meshStandardMaterial color="#2a2733" /></mesh>
      <group ref={g} position={[0, 2.5, 0]}>
        <mesh position={[0, 0.6, 0]} scale={[0.45, 0.75, 0.45]}><sphereGeometry args={[0.8, 14, 12]} /><meshStandardMaterial color="#43e6f5" emissive="#43e6f5" emissiveIntensity={1} transparent opacity={0.75} /></mesh>
        <mesh position={[0, -0.6, 0]} scale={[0.45, 0.75, 0.45]}><sphereGeometry args={[0.8, 14, 12]} /><meshStandardMaterial color="#c0394b" emissive="#c0394b" emissiveIntensity={1} transparent opacity={0.75} /></mesh>
        <mesh><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color="#2b2b2b" /></mesh>
      </group>
    </group>
  )
}

function CrystalPickup({ world, pos, show, onTake }) {
  const g = useRef()
  const cb = useRef(onTake)
  cb.current = onTake
  useEffect(() => {
    const id = world.addInteractable({ pos, radius: 2.2, label: 'Take the Hybrid Crystal', onInteract: () => cb.current() })
    return () => world.remove(id)
  }, [world])
  useEffect(() => { for (const it of world.interactables.values()) if (it.label === 'Take the Hybrid Crystal') it.enabled = show }, [show])
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = clock.elapsedTime; g.current.position.y = 1.6 + Math.sin(clock.elapsedTime * 2) * 0.12 } })
  if (!show) return null
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.6, 0.75, 1, 8]} /><meshStandardMaterial color="#2a2733" /></mesh>
      <group ref={g}>
        <mesh><octahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color="#43e6f5" emissive="#43e6f5" emissiveIntensity={2.5} toneMapped={false} /></mesh>
        <mesh position={[0, 0.5, 0]}><coneGeometry args={[0.08, 0.5, 4]} /><meshStandardMaterial color="#bff6ff" emissive="#43e6f5" emissiveIntensity={2} toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0, 2, 0]} color="#43e6f5" intensity={5} distance={9} />
    </group>
  )
}

function Shard({ show, pos }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = clock.elapsedTime * 1.5; g.current.position.y = 2.6 + Math.sin(clock.elapsedTime * 2) * 0.2 } })
  if (!show) return null
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <group ref={g}>
        <mesh scale={[0.7, 1.2, 0.7]}><octahedronGeometry args={[0.55, 0]} /><meshStandardMaterial color="#ffe08a" emissive="#ffcf4a" emissiveIntensity={2.5} metalness={0.3} roughness={0.2} toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0, 2, 0]} color="#ffd76a" intensity={8} distance={12} />
    </group>
  )
}

function CavernsLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const stance = useGame((s) => s.stance)
  const [piAng, setPiAng] = useState(() => (has('1-4pi') ? [0, 0] : [45, 135]))
  const [reveal, setReveal] = useState(null)
  const lookedRef = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [onPlate, setOnPlate] = useState(false)
  const met = !!solved['met-aufbau']
  const busy = useRef(false)
  const gateOpen = (room) => room.exitNeeds.every((id) => solved[id])

  // the map: Ocarina rules — only visited rooms until the Dungeon Map; no star until the Compass
  useEffect(() => {
    world.map = {
      floor: '#3b3850', wall: '#14121c', pit: '#06050a',
      labels: ROOMS.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => {
        const sv = getState().save
        if (sv.solved['t1-map']) return null
        const seen = sv.t1seen || {}
        return ROOMS.filter((r) => seen[r.id] || r.id === 'entrance').map((r) => [r.z[0], r.z[1]])
      },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['met-aufbau']) return { pos: [3, -9], label: 'Talk to Sage Aufbau' }
        if (!sv.solved['t1-compass']) return null
        const g = GOALS.find((x) => !sv.solved[x.id])
        if (g) return g
        if (sv.shards < 1) return { pos: [BOSS.center[0], BOSS.center[2]], label: 'Take the Bond Shard' }
        return null
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    world.ceilingY = 9
    world.killY = -8
    playMusic('cave')
    // floors: every room except the chasm in 1-3, the dash gap in 1-4, plus the boss arena
    const f = [
      world.addFloor(-W, -55, W, 0.5, 0), // entrance → 1-3 near ledge
      world.addFloor(-W, -94, W, -67, 0), // 1-3 far ledge → 1-4 before the gap
      world.addFloor(-W, -126, W, FORGE.gap.z[1], 0), // after the gap → gallery
      world.addFloor(-15, -158, 15, -126, 0), // boss arena
    ]
    // end walls, the forge slot, hall walls for the arena
    const s = [
      world.addSolid([-W, 0, 0.5], [W, 9, 2]),
      world.addSolid([-17, 0, -160], [17, 9, -158]),
      world.addSolid([-17, 0, -158], [-15, 9, -126]), world.addSolid([15, 0, -158], [17, 9, -126]),
      world.addSolid([-15, 0, -127], [-W, 9, -126]), world.addSolid([W, 0, -127], [15, 9, -126]),
      // forge slot: full wall except a low tunnel only sp² Kai fits through
      ...[world.addSolid([-W, 0, FORGE.slot.z[1]], [FORGE.slot.x[0], 9, FORGE.slot.z[0]]),
      world.addSolid([FORGE.slot.x[1], 0, FORGE.slot.z[1]], [W, 9, FORGE.slot.z[0]]),
      world.addSolid([FORGE.slot.x[0], FORGE.slot.ceiling, FORGE.slot.z[1]], [FORGE.slot.x[1], 9, FORGE.slot.z[0]])].map((id) => { world.solids.get(id).noCam = true; return id }),
    ]
    // room checkpoints + titles
    const t = ROOMS.map((r) => world.addTrigger([-15, 0, r.z[1] + 0.5], [15, 9, r.z[0] - 1], () => {
      if (bossStarted.current && !getState().save.solved.boss) return // mid-fight: keep the arena checkpoint
      world.respawn = r.checkpoint
      const seen = getState().save.t1seen || {}
      saveGame({ checkpoint: { scene: 'caverns', room: r.id }, t1seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
    }))
    // hint zones
    const hints = [
      world.addTrigger([-W, 0, -86], [W, 9, -83], () => { if (getState().stance !== 'sp2') toast('Too low! An ethylene arch: each C has one double bond. Which shape fits? (R)', 'info', 4000) }),
      world.addTrigger([-W, 0, -94], [W, 9, -91.5], () => { if (getState().stance !== 'sp') toast('Too far to jump. An acetylene gap: a triple bond. Which shape is that?', 'info', 4000) }),
      world.addTrigger([-15, 0, -134], [15, 9, -128], () => startBoss()),
    ]
    // plate trigger for the tetrahedral seal
    const pl = world.addTrigger([FORGE.tetraPlate[0] - 1.2, 0, FORGE.tetraPlate[2] - 1.2], [FORGE.tetraPlate[0] + 1.2, 3, FORGE.tetraPlate[2] + 1.2], () => setOnPlate(true), () => setOnPlate(false))
    // Malradix's decree reads itself as Kai walks in
    const decreeT = world.addTrigger([-W, 0, -7], [W, 6, -4.5], () => { if (!getState().save.solved['t1-decree']) readDecree() })
    const dId = world.addInteractable({ pos: [-5, 0, -10], radius: 2.2, label: 'Read the decree', onInteract: () => readDecree() })
    const dS = world.addSolid([-5.6, 0, -10.4], [-4.4, 1.6, -9.6])
    // the locked doors
    const doorId = world.addInteractable({ pos: [0, 0, -74.8], radius: 2.2, label: () => (has('t1-door') ? null : 'Unlock the door'), onInteract: () => unlock('t1-door', 't1key', 'Locked. It needs a small key.') })
    const bossDoorId = world.addInteractable({ pos: [0, 0, -124.8], radius: 2.4, label: () => (has('t1-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlock('t1-bossdoor', 't1bossKey', 'A great lock shaped like an empty socket. It needs the Boss Key.') })
    // Aufbau
    const aId = world.addInteractable({ pos: [3, 0, -9], radius: 2.6, label: 'Talk to Sage Aufbau', onInteract: () => talkAufbau() })
    const aS = world.addSolid([2.4, 0, -9.6], [3.6, 1.6, -8.4])
    // dev hooks
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...s, ...t, ...hints, pl, aId, aS, decreeT, dId, dS, doorId, bossDoorId].forEach((i) => world.remove(i)) }
  }, [world])

  // tetrahedral seal: stand on the plate in sp³
  useEffect(() => {
    if (onPlate && !has('1-4tetra')) {
      if (stance === 'sp3') {
        markSolved('1-4tetra'); sfx('right')
        toast('Four single bonds at 109.5° — the methane seal accepts a tetrahedral carbon.', 'good', 3200)
      } else toast('The seal wants four single bonds, a tetrahedron — not this shape.', 'warn', 3200)
    }
  }, [onPlate, stance])

  const talkAufbau = async () => {
    if (busy.current) return
    busy.current = true
    world.camOverride = twoShot(world, [3, 0, -9])
    if (!has('met-aufbau')) {
      await say([
        { who: 'Sage Aufbau', text: 'Hmph. A carbon. Took your time. I\'m Aufbau. Down here, everything fills from the bottom up.' },
        { who: 'Sage Aufbau', text: "Malradix's Colossus dragged the Bond Shard to the deepest hall. Want it? Learn what you're made of. Bottom first." },
        { who: 'Sage Aufbau', text: 'Protons and neutrons in a tiny nucleus, electrons around it. Count the protons: that\'s the element, Z.' },
        { who: 'Pi', text: 'The first gate wants atoms. Find the glowing pedestal and press E.' },
      ])
      markSolved('met-aufbau')
      sfx('open')
    } else {
      await say([{ who: 'Sage Aufbau', text: 'Lowest first. Two to an orbital, spins opposed. Spread out before you pair. My rules. Not optional.' }])
    }
    world.camOverride = null
    busy.current = false
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's decree", text: 'BY ORDER OF MALRADIX: Carbon bonds any way it likes. Four bonds, two kinds, any angle. Rules are for the weak.' },
      { who: 'Pi', text: 'Any angle? The well seal looked awfully neat to me…' },
    ])
    markSolved('t1-decree')
    busy.current = false
  }
  const unlock = (id, keyFlag, lockedMsg) => {
    if (has(id)) return
    if (!getState().save[keyFlag]) { toast(lockedMsg, 'warn', 3000); sfx('wrong'); return }
    saveGame({ [keyFlag]: false }); markSolved(id); sfx('open')
    toast(id === 't1-bossdoor' ? 'The Boss Key turns. Something huge stirs below…' : 'You used the small key. The door opens.', 'good', 3000)
  }
  const CHEST_AT = { 't1-map': [-6.5, 0, -17], 't1-compass': [6.5, 0, -35.5], 't1-key': [0, 0, -73.5], 't1-bosskey': [0, 0, -122.5], '1-4crystal': FORGE.crystalAt }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    world.camOverride = twoShot(world, CHEST_AT[id], 3.2)
    setReveal({ id, pos: CHEST_AT[id] })
    setTimeout(() => { setReveal(null); world.camOverride = null }, 3200)
    if (id === '1-4crystal') { takeCrystal(); return }
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't1-map') await say([{ who: '', text: 'You got the Dungeon Map!' }, { who: 'Pi', text: 'Press M — now the whole cave shows, even rooms we haven\'t seen.' }])
    if (id === 't1-compass') await say([{ who: '', text: 'You got the Compass!' }, { who: 'Pi', text: 'With the Compass, the map shows a gold star where to go next.' }])
    if (id === 't1-key') { saveGame({ t1key: true }); await say([{ who: '', text: 'You got a Small Key!' }, { who: 'Pi', text: 'The door at the end of this hall has a keyhole.' }]) }
    if (id === 't1-bosskey') { saveGame({ t1bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }, { who: 'Pi', text: 'The big door below. The Colossus is behind it.' }]) }
    busy.current = false
  }

  const useStation = async (id) => {
    const st = STATIONS[id]
    if (has(id)) { toast('Already solved.', 'info', 1200); return }
    if (st.needs && !st.needs.every(has)) { toast(id === '1-3b0' ? 'First find the bond length at the energy well.' : 'Raise the earlier bridge stones first.', 'warn'); return }
    const ok = await openPanel(st.panel, st.props)
    if (ok) {
      markSolved(id)
      ;(st.also || []).forEach((x) => markSolved(x))
      sfx('open')
      // room-complete chatter
      const r = ROOMS.find((x) => x.id === st.room)
      if (r.exitNeeds.every((x) => getState().save.solved[x])) toast(`${r.title}: the way ahead opens.`, 'good')
      if (id === '1-3b2') setTimeout(() => say([
        { who: 'Pi', text: 'The bridge holds! Every atom is full: H one bond, C four, N three, O two.' },
        { who: 'Pi', text: 'Uh-oh. Violet wolves on the far side — Malradix\'s radicals again.' },
      ]), 300)
    }
  }

  const takeCrystal = async () => {
    if (has('1-4crystal')) return
    markSolved('1-4crystal')
    saveGame({ hasCrystal: true })
    sfx('shard')
    await say([
      { who: '', text: 'You got the Hybrid Crystal!' },
      { who: 'Sage Aufbau', text: "(His voice echoes up the hall.) You've one 2s and three 2p orbitals. That crystal lets you mix them." },
      { who: 'Sage Aufbau', text: 'Mix all four: four sp³ hybrids, 109.5° apart. Four equal bonds — not "two kinds", whatever Malradix says.' },
      { who: 'Sage Aufbau', text: 'Mix three: three flat sp², 120° apart, one p left for a π bond. Mix two: two sp, 180°, two p left.' },
      { who: 'Pi', text: 'Press R to change shape: sp³ → sp² → sp. In sp, Space is a straight-line dash!' },
    ])
    toast('Got the Hybrid Crystal! Press R to change shape.', 'good', 4000)
  }

  const turnPi = (i) => {
    if (has('1-4pi')) return
    // a p orbital is only free to overlap on a carbon that kept one out of its hybrids
    if (getState().stance === 'sp3') { sfx('wrong'); toast('In sp³ every orbital is in a hybrid — no p left to turn. Change shape (R).', 'warn', 3600); return }
    const next = piAng.map((v, k) => (k === i ? (v + 45) % 180 : v))
    setPiAng(next)
    sfx('stance')
    if (next[0] === next[1]) {
      markSolved('1-4pi')
      sfx('right')
      toast('Parallel p orbitals overlap side by side: a π bond! The door unlocks.', 'good', 3600)
    }
  }

  const startBoss = async () => {
    // a ref, not bossOn: the trigger keeps the first render's closure, so bossOn would always read false here
    if (has('boss') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.setEnabled(arenaSeal.current, true) // the hall behind closes until the fight is over
    world.respawn = [0, 0, -131]
    await say([
      { who: 'Pi', text: 'The Unbonded Colossus! Loose atoms, empty sockets everywhere.' },
      { who: 'Pi', text: 'Swords bounce off its body. Roll through the stomp wave (Space); block the sweep (Shift).' },
      { who: 'Pi', text: 'When it kneels, its core names a carbon. Work out that carbon\'s shape, switch with R, and strike!' },
    ])
    busy.current = false
    setBossOn(true)
  }

  const bossDown = async () => {
    markSolved('boss')
    saveGame({ bossDone: true })
    world.setEnabled(arenaSeal.current, false)
    playMusic('cave')
    await say([
      { who: 'Pi', text: 'Every atom locked into a filled shell. It\'s just a stable molecule now!' },
      { who: 'Pi', text: 'Three shapes, three set angles. Not "any angle"! Look — the Bond Shard!' },
    ])
  }

  const takeShard = async () => {
    if (getState().save.shards >= 1 || busy.current) return
    busy.current = true
    sfx('shard')
    await say([{ who: 'Pi', text: "Before you take it — show me you've got it. A quick one from me." }])
    let ok = false
    while (!ok) {
      ok = await openPanel('hybridCheck', {})
      if (!ok) await say([{ who: 'Pi', text: "Come back when you're ready — the shard isn't going anywhere." }])
      if (!ok) { busy.current = false; return }
    }
    saveGame({ shards: 1 })
    setState({ objective: 'Bond Shard 1 of 12 recovered' })
    await say([
      { who: 'Princess Octavia', text: 'Kai… can you hear me? The shard carries my voice.' },
      { who: 'Princess Octavia', text: 'Malradix holds me beyond the volcano. Eleven shards remain, each guarded by one of his creatures.' },
      { who: 'Princess Octavia', text: 'He swore carbon bonds any way it likes. You proved it has rules. Take the east road — the Tide Temple waits.' },
      { who: 'Pi', text: 'One down, eleven to go!' },
    ])
    busy.current = false
    onExit('credits')
  }

  const arenaSeal = useRef(null)
  useEffect(() => { arenaSeal.current = world.addSolid([-15, 0, -126.6], [15, 9, -125.6]); world.setEnabled(arenaSeal.current, false); return () => world.remove(arenaSeal.current) }, [world])
  // camera help: frame the giant in the boss hall
  useFrame(() => {
    const p = world.player
    if (!p) return
    const inSlot = p.pos.z < FORGE.slot.z[0] + 1.5 && p.pos.z > FORGE.slot.z[1] - 0.5
    world.camBoost = (bossStarted.current && !getState().save.solved.boss) ? { dist: 4.2, pitch: 0.42 } : null
  })

  // shard pickup interactable
  useEffect(() => {
    const id = world.addInteractable({ pos: [BOSS.center[0], 0, BOSS.center[2]], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    world.setEnabled(id, has('boss'))
    const off = () => world.setEnabled(id, getState().save.solved.boss && getState().save.shards < 1)
    const t = setInterval(off, 300)
    return () => { clearInterval(t); world.remove(id) }
  }, [world])

  return (
    <group>
      <fog attach="fog" args={['#0d1820', 20, 70]} />
      <ambientLight intensity={0.6} color="#8ab0d0" />
      <hemisphereLight args={["#6a7ab0", "#2a2232", 0.75]} />
      <directionalLight position={[6, 20, 4]} intensity={0.6} color="#9fb8ff" />
      <CaveDressing />
      {/* visible floors */}
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-W} z0={0.5} x1={W} z1={-55} color="#4a4a5c" />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-W} z0={-67} x1={W} z1={-94} color="#4a4a5c" />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-W} z0={FORGE.gap.z[1]} x1={W} z1={-126} color="#4a4a5c" />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-15} z0={-126} x1={15} z1={-158} color="#34303f" />
      {/* chasm and gap glow */}
      <mesh position={[0, -7, -61]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 12]} /><meshBasicMaterial color="#0f3a4a" /></mesh>
      <mesh position={[0, -7, (FORGE.gap.z[0] + FORGE.gap.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, FORGE.gap.z[0] - FORGE.gap.z[1]]} /><meshBasicMaterial color="#0f3a4a" /></mesh>
      <pointLight position={[0, -4, -61]} color="#43e6f5" intensity={6} distance={14} />
      <pointLight position={[0, -4, -97.7]} color="#43e6f5" intensity={6} distance={12} />
      {/* hall walls (the boss arena has its own) */}
      <Walls world={world} z0={0.5} z1={-126} />
      {/* forge slot visuals */}
      <mesh position={[(-W + FORGE.slot.x[0]) / 2, 4.5, (FORGE.slot.z[0] + FORGE.slot.z[1]) / 2]}><boxGeometry args={[W + FORGE.slot.x[0], 9, 3.5]} /><meshStandardMaterial color="#2f2b3a" /></mesh>
      <mesh position={[(W + FORGE.slot.x[1]) / 2, 4.5, (FORGE.slot.z[0] + FORGE.slot.z[1]) / 2]}><boxGeometry args={[W - FORGE.slot.x[1], 9, 3.5]} /><meshStandardMaterial color="#2f2b3a" /></mesh>
      <mesh position={[0, (FORGE.slot.ceiling + 9) / 2, (FORGE.slot.z[0] + FORGE.slot.z[1]) / 2]}><boxGeometry args={[FORGE.slot.x[1] - FORGE.slot.x[0], 9 - FORGE.slot.ceiling, 3.5]} /><meshStandardMaterial color="#2f2b3a" /></mesh>
      <mesh position={[0, FORGE.slot.ceiling + 0.05, FORGE.slot.z[0] + 0.02]}><boxGeometry args={[3.2, 0.1, 0.05]} /><meshBasicMaterial color="#43e6f5" toneMapped={false} /></mesh>
      <Tag position={[0, 3, FORGE.slot.z[0] + 0.3]} df={10}>Ethylene arch · H₂C=CH₂ · every C has a double bond</Tag>
      <Tag position={[0, 2.2, FORGE.gap.z[0] + 0.5]} df={10}>Acetylene gap · HC≡CH · a triple bond</Tag>
      {/* glowing lips so the slot and the gap's edges read */}
      {[FORGE.slot.z[0] + 0.02, FORGE.slot.z[1] - 0.02].map((z) => [-1, 1].map((sd) => <mesh key={z + '' + sd} position={[sd * (FORGE.slot.x[1] + 0.05), FORGE.slot.ceiling / 2, z]}><boxGeometry args={[0.08, FORGE.slot.ceiling, 0.06]} /><meshBasicMaterial color="#43e6f5" toneMapped={false} /></mesh>))}
      {[FORGE.gap.z[0], FORGE.gap.z[1]].map((z) => <mesh key={'gl' + z} position={[0, 0.03, z]}><boxGeometry args={[2 * W, 0.04, 0.18]} /><meshBasicMaterial color="#ffcf6a" toneMapped={false} /></mesh>)}
      {/* exit gates */}
      {ROOMS.slice(0, -2).map((r) => <Gate key={r.id} world={world} pos={[0, 0, r.z[1]]} size={[2 * W, 7, 0.8]} open={gateOpen(r)} {...(r.id === '1-3' ? { color: '#5a4020', glow: '#ffcf6a' } : {})} />)}
      <Gate world={world} pos={[0, 0, FORGE.door]} size={[2 * W, 7, 0.8]} open={!!(solved['1-4tetra'] && solved['1-4pi'])} />
      <Gate world={world} pos={[0, 0, -126]} size={[2 * W, 7, 0.8]} open={gateOpen(ROOMS[5])} color="#3a2a50" glow="#c9a3ff" />
      {/* entrance */}
      <Aufbau position={[3, 0, -9]} rotation={[0, -0.6, 0]} />
      <Tag position={[3, 2.3, -9]} df={9}>Sage Aufbau</Tag>
      <Torch pos={[-6, 0, -4]} /><Torch pos={[6, 0, -4]} /><Torch pos={[-6, 0, -12]} /><Torch pos={[6, 0, -12]} />
      {/* 1-1 */}
      <Torch pos={[-6.5, 0, -18]} /><Torch pos={[6.5, 0, -18]} />
      <Tag position={[0, 5.5, -31.5]} df={12}>Carbon Gate · Z = 6</Tag>
      {/* 1-2 lamp wall + orbital murals */}
      <Lamps z={-49.3} lit={['1-2C', '1-2N', '1-2O'].filter((x) => solved[x]).length} />
      <OrbitalMural pos={[-7.6, 3.4, -38]} axis="x" /><OrbitalMural pos={[7.6, 3.4, -38]} axis="x" />
      <OrbitalMural pos={[-7.6, 3.4, -45]} axis="y" /><OrbitalMural pos={[7.6, 3.4, -45]} axis="y" />
      {/* 1-3 bridge */}
      <BridgePiece world={world} z0={-55} z1={-59} raised={!!solved['1-3b0']} />
      <BridgePiece world={world} z0={-59} z1={-63} raised={!!solved['1-3b1']} />
      <BridgePiece world={world} z0={-63} z1={-67} raised={!!solved['1-3b2']} />
      <WolfPack world={world} spawns={[[-3, -70.5], [3, -71], [-2.5, -73.5], [2.5, -74]]} active={!!solved['1-3b2'] && !solved['1-3wolves']} arena={{ c: [0, -71.8], r: 5.2 }}
        onCleared={() => { markSolved('1-3wolves'); sfx('open'); toast('The radicals paired off — and one dropped a chest!', 'good') }} />
      {/* 1-4 forge */}
      <Chest world={world} pos={FORGE.crystalAt} big opened={!!solved['1-4crystal']} onOpen={() => openChest('1-4crystal')} label="Open the big chest" />
      <Chest world={world} pos={[-6.5, 0, -17]} rotY={Math.PI / 2} opened={!!solved['t1-map']} onOpen={() => openChest('t1-map')} />
      <Chest world={world} pos={[6.5, 0, -35.5]} rotY={-Math.PI / 2} opened={!!solved['t1-compass']} onOpen={() => openChest('t1-compass')} />
      <Chest world={world} pos={[0, 0, -73.5]} opened={!!solved['t1-key']} show={!!solved['1-3wolves']} onOpen={() => openChest('t1-key')} label="Open the small chest" />
      <Chest world={world} pos={[0, 0, -122.5]} big opened={!!solved['t1-bosskey']} show={!!(solved['1-5a'] && solved['1-5b'])} onOpen={() => openChest('t1-bosskey')} label="Open the big chest" />
      <Tag position={[0, 7.8, -75.6]} df={13}>{solved['t1-door'] ? 'unlocked' : 'locked · small key'}</Tag>
      <group position={[-5, 0, -10]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3644" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color={solved.boss ? '#3a3046' : '#a06bff'} transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>{solved.boss ? "Malradix's decree — cracked" : "Malradix's decree"}</Tag>
      </group>
      <Nucleus pos={[0, 4.3, -20]} />
      {reveal && <ItemReveal kind={reveal.id} pos={reveal.pos} />}
      <group position={FORGE.tetraPlate}>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.1, 3]} /><meshStandardMaterial color={solved['1-4tetra'] ? '#6fe39a' : '#43e6f5'} emissive={solved['1-4tetra'] ? '#2a8a4a' : '#1fa7c4'} emissiveIntensity={1.2} /></mesh>
        <Tag position={[0, 1.2, 0]} df={9}>Methane seal · CH₄ · four single bonds</Tag>
      </group>
      <PiPillar world={world} pos={FORGE.piPillars[0]} angle={solved['1-4pi'] ? 0 : piAng[0]} onTurn={() => turnPi(0)} />
      <PiPillar world={world} pos={FORGE.piPillars[1]} angle={solved['1-4pi'] ? 0 : piAng[1]} onTurn={() => turnPi(1)} />
      <Tag position={[4, 4.6, -105.5]} df={10}>π door · the two p orbitals must be parallel</Tag>
      <Torch pos={[-6.5, 0, -79]} /><Torch pos={[6.5, 0, -79]} /><Torch pos={[-6.5, 0, -103]} /><Torch pos={[6.5, 0, -103]} />
      {/* 1-5 gallery */}
      <Painting pos={[-6.6, 3, -119]} rotY={Math.PI / 4} title="Isoprene" solved={!!solved['1-5a']} />
      <Painting pos={[6.6, 3, -119]} rotY={-Math.PI / 4} title="Methylcyclohexane" solved={!!solved['1-5b']} />
      <Torch pos={[-6.5, 0, -114]} /><Torch pos={[6.5, 0, -114]} />
      {/* stations */}
      {Object.entries(STATIONS).map(([id, st]) => (
        <Station key={id} world={world} pos={st.pos} label={has(id) ? null : st.label} enabled={!solved[id]} solved={!!solved[id]} onUse={() => useStation(id)} />
      ))}
      {/* boss arena */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = ((k + 0.5) / 8) * Math.PI * 2; return <Torch key={k} pos={[Math.cos(a) * 13.8, 0, BOSS.center[2] + Math.sin(a) * 13.8]} color="#c79bff" /> })}
      <mesh position={[0, 0.02, BOSS.center[2]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[12.5, 13, 64]} /><meshBasicMaterial color="#a06bff" toneMapped={false} /></mesh>
      <Colossus world={world} center={BOSS.center} active={bossOn && !solved.boss} onDefeated={bossDown} />
      <Shard show={!!solved.boss && save.shards < 1} pos={BOSS.center} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Caverns({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'caverns' ? ROOMS.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, -2]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#0b0a12" camDist={5.8}>
      {(world) => <CavernsLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
