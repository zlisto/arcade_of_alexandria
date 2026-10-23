import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Block, Slab, Gate, Station, Scatter, scatter, Torch, Motes } from '../engine/kit'
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
      <mesh position={[0, 9.5, -78]}><boxGeometry args={[40, 1, 170]} /><meshStandardMaterial color="#17151e" roughness={1} /></mesh>
      <Motes count={260} area={[16, 8, 160]} center={[0, 0.2, -78]} color="#8fe8ff" size={0.05} />
    </group>
  )
}

/** Side walls for a stretch of hall, with p-orbital murals in the Hall of Shells. */
function Walls({ world, z0, z1, half = W, color = '#2a2734' }) {
  const len = Math.abs(z1 - z0)
  const zc = (z0 + z1) / 2
  return (
    <group>
      <Block world={world} pos={[-half - 1, 4.5, zc]} size={[2, 9, len]} color={color} />
      <Block world={world} pos={[half + 1, 4.5, zc]} size={[2, 9, len]} color={color} />
    </group>
  )
}

function Lamps({ z, lit }) {
  // a lamp row above the exit gate: 1s · 2s · 2p 2p 2p — the shells fill as the stations are solved.
  // Kept high (y 7.9) so it never blocks the walkway or the camera.
  const lamps = [[0, -3.6, '1s'], [1, -1.8, '2s'], [2, 0.2, '2p'], [2, 1.4, ''], [2, 2.6, '']]
  return (
    <group position={[0, 7.9, z]}>
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

function PiPillar({ pos, upright, onTurn, world }) {
  const g = useRef()
  const cb = useRef(onTurn)
  cb.current = onTurn
  useEffect(() => {
    const id = world.addInteractable({ pos, radius: 2, label: 'Turn the p orbital', onInteract: () => cb.current() })
    const s = world.addSolid([pos[0] - 0.5, 0, pos[2] - 0.5], [pos[0] + 0.5, 1.4, pos[2] + 0.5])
    return () => { world.remove(id); world.remove(s) }
  }, [world])
  useFrame((_, dt) => { if (g.current) g.current.rotation.z += ((upright ? 0 : Math.PI / 2) - g.current.rotation.z) * Math.min(1, dt * 6) })
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

function CavernsLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const stance = useGame((s) => s.stance)
  const [piUp, setPiUp] = useState([false, has('1-4pi')])
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [onPlate, setOnPlate] = useState(false)
  const met = !!solved['met-aufbau']
  const busy = useRef(false)
  const gateOpen = (room) => room.exitNeeds.every((id) => solved[id])

  // the map: room names, and the first unsolved goal (then the shard)
  useEffect(() => {
    world.map = {
      floor: '#3b3850', wall: '#14121c', pit: '#06050a',
      labels: ROOMS.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      goal: () => {
        const sv = getState().save
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
      world.addFloor(-W, -126, W, -101.5, 0), // after the gap → gallery
      world.addFloor(-15, -158, 15, -126, 0), // boss arena
    ]
    // end walls, the forge slot, hall walls for the arena
    const s = [
      world.addSolid([-W, 0, 0.5], [W, 9, 2]),
      world.addSolid([-17, 0, -160], [17, 9, -158]),
      world.addSolid([-17, 0, -158], [-15, 9, -126]), world.addSolid([15, 0, -158], [17, 9, -126]),
      world.addSolid([-15, 0, -127], [-W, 9, -126]), world.addSolid([W, 0, -127], [15, 9, -126]),
      // forge slot: full wall except a low tunnel only sp² Kai fits through
      world.addSolid([-W, 0, FORGE.slot.z[1]], [FORGE.slot.x[0], 9, FORGE.slot.z[0]]),
      world.addSolid([FORGE.slot.x[1], 0, FORGE.slot.z[1]], [W, 9, FORGE.slot.z[0]]),
      world.addSolid([FORGE.slot.x[0], FORGE.slot.ceiling, FORGE.slot.z[1]], [FORGE.slot.x[1], 9, FORGE.slot.z[0]]),
    ]
    // room checkpoints + titles
    const t = ROOMS.map((r) => world.addTrigger([-15, 0, r.z[1] + 0.5], [15, 9, r.z[0] - 1], () => {
      world.respawn = r.checkpoint
      saveGame({ checkpoint: { scene: 'caverns', room: r.id } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
    }))
    // hint zones
    const hints = [
      world.addTrigger([-W, 0, -86], [W, 9, -83], () => { if (getState().stance !== 'sp2') toast('A low tunnel. Press R to change shape until you are flat (sp²).', 'info', 3200) }),
      world.addTrigger([-W, 0, -94], [W, 9, -91.5], () => { if (getState().stance !== 'sp') toast('Too far to jump. In the sp shape, Space is a straight-line dash. Run up and dash!', 'info', 3600) }),
      world.addTrigger([-15, 0, -134], [15, 9, -128], () => startBoss()),
    ]
    // plate trigger for the tetrahedral seal
    const pl = world.addTrigger([FORGE.tetraPlate[0] - 1.2, 0, FORGE.tetraPlate[2] - 1.2], [FORGE.tetraPlate[0] + 1.2, 3, FORGE.tetraPlate[2] + 1.2], () => setOnPlate(true), () => setOnPlate(false))
    // Aufbau
    const aId = world.addInteractable({ pos: [3, 0, -9], radius: 2.6, label: 'Talk to Sage Aufbau', onInteract: () => talkAufbau() })
    const aS = world.addSolid([2.4, 0, -9.6], [3.6, 1.6, -8.4])
    // dev hooks
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...s, ...t, ...hints, pl, aId, aS].forEach((i) => world.remove(i)) }
  }, [world])

  // tetrahedral seal: stand on the plate in sp³
  useEffect(() => {
    if (onPlate && !has('1-4tetra')) {
      if (stance === 'sp3') {
        markSolved('1-4tetra'); sfx('right')
        toast('Four bonds at 109.5° — the tetrahedral seal accepts an sp³ carbon.', 'good', 3200)
      } else toast(`The seal is shaped like a tetrahedron. It won't accept a ${stance === 'sp2' ? 'flat sp²' : 'linear sp'} shape.`, 'warn', 2600)
    }
  }, [onPlate, stance])

  const talkAufbau = async () => {
    if (busy.current) return
    busy.current = true
    if (!has('met-aufbau')) {
      await say([
        { who: 'Sage Aufbau', text: "Ho there, little carbon. I am Aufbau. Down here, everything fills from the bottom up." },
        { who: 'Sage Aufbau', text: "Malradix's Colossus has taken the Bond Shard to the deepest chamber. To reach it you'll need to understand what you are made of." },
        { who: 'Sage Aufbau', text: 'An atom: a tiny heavy nucleus of protons and neutrons, and electrons all around it in orbitals. The number of protons decides the element — that is the atomic number, Z.' },
        { who: 'Pi', text: 'The first gates ask for atoms. Walk up to the glowing pedestals and press E.' },
      ])
      markSolved('met-aufbau')
      sfx('open')
    } else {
      await say([{ who: 'Sage Aufbau', text: 'Lowest orbitals first, two electrons to an orbital, spins opposed — and spread out before you pair up. Those are my rules.' }])
    }
    busy.current = false
  }

  const useStation = async (id) => {
    const st = STATIONS[id]
    if (has(id)) { toast('Already solved.', 'info', 1200); return }
    if (st.needs && !st.needs.every(has)) { toast(id === '1-3b0' ? 'First find the bond length at the energy well.' : 'Raise the earlier bridge stones first.', 'warn'); return }
    const ok = await openPanel(st.panel, st.props)
    if (ok) {
      markSolved(id)
      sfx('open')
      // room-complete chatter
      const r = ROOMS.find((x) => x.id === st.room)
      if (r.exitNeeds.every((x) => getState().save.solved[x])) toast(`${r.title}: the way ahead opens.`, 'good')
      if (id === '1-3b2') setTimeout(() => say([
        { who: 'Pi', text: "The bridge holds — every atom has its octet! Hydrogen one bond, carbon four, nitrogen three, oxygen two." },
        { who: 'Pi', text: 'Uh-oh. More radicals on the far side…' },
      ]), 300)
    }
  }

  const takeCrystal = async () => {
    if (has('1-4crystal')) return
    markSolved('1-4crystal')
    saveGame({ hasCrystal: true })
    sfx('shard')
    await say([
      { who: 'Sage Aufbau', text: 'The Hybrid Crystal! Carbon has one 2s and three 2p orbitals, but it can mix them.' },
      { who: 'Sage Aufbau', text: 'Mix all four and you get four sp³ hybrids pointing to the corners of a tetrahedron, 109.5° apart. Four strong single bonds — that is you, standing tall.' },
      { who: 'Sage Aufbau', text: 'Mix only three and you get three sp² hybrids flat in a plane, 120° apart, with one p orbital left over for a π bond. Flat and quick.' },
      { who: 'Sage Aufbau', text: 'Mix just two and you get two sp hybrids, 180° apart — a straight line, with two p orbitals left for two π bonds. Linear, like a lance.' },
      { who: 'Pi', text: 'Press R to change shape: sp³ → sp² → sp. In the sp shape, Space becomes a straight-line dash!' },
    ])
    toast('Got the Hybrid Crystal! Press R to change shape.', 'good', 4000)
  }

  const turnPi = (i) => {
    if (has('1-4pi')) return
    const next = piUp.map((v, k) => (k === i ? !v : v))
    setPiUp(next)
    sfx('stance')
    if (next[0] && next[1]) {
      markSolved('1-4pi')
      sfx('right')
      toast('Both p orbitals parallel: they overlap side by side — a π bond. The door unlocks.', 'good', 3400)
    }
  }

  const startBoss = async () => {
    // a ref, not bossOn: the trigger keeps the first render's closure, so bossOn would always read false here
    if (has('boss') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -131]
    await say([
      { who: 'Pi', text: "That's it — the Unbonded Colossus! A giant made of loose atoms with empty sockets everywhere." },
      { who: 'Pi', text: "Its body can't be hurt while it stands. Dodge its stomp by rolling through the wave (Space), and block or dodge its sweep (Shift)." },
      { who: 'Pi', text: "When it kneels, its carbon core opens and shows which bonds it needs. Change to that shape with R and strike the core!" },
    ])
    busy.current = false
    setBossOn(true)
  }

  const bossDown = async () => {
    markSolved('boss')
    saveGame({ bossDone: true })
    playMusic('cave')
    await say([{ who: 'Pi', text: 'Every atom locked into place with a full octet… it fell apart into a stable molecule! Look — the Bond Shard!' }])
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
      { who: 'Princess Octavia', text: 'Malradix holds me beyond the volcano. Eleven more shards are hidden across the kingdom, each in a sage\'s keeping.' },
      { who: 'Princess Octavia', text: 'Go to Carbon Castle. The road from the village is open now — and the Tide Coast waits beyond it. Hurry.' },
      { who: 'Pi', text: 'One down, eleven to go!' },
    ])
    busy.current = false
    onExit('credits')
  }

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
      <fog attach="fog" args={['#0b0a12', 10, 48]} />
      <ambientLight intensity={0.5} color="#8a9ad0" />
      <hemisphereLight args={["#6a7ab0", "#2a2232", 0.75]} />
      <directionalLight position={[6, 20, 4]} intensity={0.6} color="#9fb8ff" />
      <CaveDressing />
      {/* visible floors */}
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-W} z0={0.5} x1={W} z1={-55} color="#3d3a4a" />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-W} z0={-67} x1={W} z1={-94} color="#3d3a4a" />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-W} z0={-101.5} x1={W} z1={-126} color="#3d3a4a" />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-15} z0={-126} x1={15} z1={-158} color="#34303f" />
      {/* chasm and gap glow */}
      <mesh position={[0, -7, -61]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 12]} /><meshBasicMaterial color="#0f3a4a" /></mesh>
      <mesh position={[0, -7, -97.7]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 7.5]} /><meshBasicMaterial color="#0f3a4a" /></mesh>
      <pointLight position={[0, -4, -61]} color="#43e6f5" intensity={6} distance={14} />
      <pointLight position={[0, -4, -97.7]} color="#43e6f5" intensity={6} distance={12} />
      {/* hall walls (the boss arena has its own) */}
      <Walls world={world} z0={0.5} z1={-126} />
      {/* forge slot visuals */}
      <mesh position={[(-W + FORGE.slot.x[0]) / 2, 4.5, (FORGE.slot.z[0] + FORGE.slot.z[1]) / 2]}><boxGeometry args={[W + FORGE.slot.x[0], 9, 3.5]} /><meshStandardMaterial color="#2f2b3a" /></mesh>
      <mesh position={[(W + FORGE.slot.x[1]) / 2, 4.5, (FORGE.slot.z[0] + FORGE.slot.z[1]) / 2]}><boxGeometry args={[W - FORGE.slot.x[1], 9, 3.5]} /><meshStandardMaterial color="#2f2b3a" /></mesh>
      <mesh position={[0, (FORGE.slot.ceiling + 9) / 2, (FORGE.slot.z[0] + FORGE.slot.z[1]) / 2]}><boxGeometry args={[FORGE.slot.x[1] - FORGE.slot.x[0], 9 - FORGE.slot.ceiling, 3.5]} /><meshStandardMaterial color="#2f2b3a" /></mesh>
      <mesh position={[0, FORGE.slot.ceiling + 0.05, FORGE.slot.z[0] + 0.02]}><boxGeometry args={[3.2, 0.1, 0.05]} /><meshBasicMaterial color="#43e6f5" toneMapped={false} /></mesh>
      <Html position={[0, 3, FORGE.slot.z[0] + 0.3]} center distanceFactor={10}><div className="tag3d">120° · flat passage</div></Html>
      <Html position={[0, 2.2, FORGE.gap.z[0] + 0.5]} center distanceFactor={10}><div className="tag3d">180° · straight-line dash</div></Html>
      {/* exit gates */}
      {ROOMS.slice(0, -2).map((r) => <Gate key={r.id} world={world} pos={[0, 0, r.z[1]]} size={[2 * W, 7, 0.8]} open={gateOpen(r)} />)}
      <Gate world={world} pos={[0, 0, FORGE.door]} size={[2 * W, 7, 0.8]} open={!!(solved['1-4tetra'] && solved['1-4pi'])} />
      <Gate world={world} pos={[0, 0, -126]} size={[2 * W, 7, 0.8]} open={gateOpen(ROOMS[5])} />
      {/* entrance */}
      <Aufbau position={[3, 0, -9]} rotation={[0, -0.6, 0]} />
      <Html position={[3, 2.3, -9]} center distanceFactor={10}><div className="tag3d">Sage Aufbau</div></Html>
      <Torch pos={[-6, 0, -4]} /><Torch pos={[6, 0, -4]} /><Torch pos={[-6, 0, -12]} /><Torch pos={[6, 0, -12]} />
      {/* 1-1 */}
      <Torch pos={[-6.5, 0, -18]} /><Torch pos={[6.5, 0, -18]} />
      <Html position={[0, 5.5, -31.5]} center distanceFactor={14}><div className="tag3d">Carbon Gate · Z = 6</div></Html>
      {/* 1-2 lamp wall + orbital murals */}
      <Lamps z={-49.3} lit={['1-2C', '1-2N', '1-2O'].filter((x) => solved[x]).length} />
      <OrbitalMural pos={[-7.6, 3.4, -38]} axis="x" /><OrbitalMural pos={[7.6, 3.4, -38]} axis="x" />
      <OrbitalMural pos={[-7.6, 3.4, -45]} axis="y" /><OrbitalMural pos={[7.6, 3.4, -45]} axis="y" />
      {/* 1-3 bridge */}
      <BridgePiece world={world} z0={-55} z1={-59} raised={!!solved['1-3b0']} />
      <BridgePiece world={world} z0={-59} z1={-63} raised={!!solved['1-3b1']} />
      <BridgePiece world={world} z0={-63} z1={-67} raised={!!solved['1-3b2']} />
      <WolfPack world={world} spawns={[[-3, -71], [3, -72], [0, -74]]} active={!!solved['1-3b2'] && !solved['1-3wolves']} arena={{ c: [0, -71.8], r: 4.2 }}
        onCleared={() => { markSolved('1-3wolves'); sfx('open'); toast('The radicals paired off. The gate opens.', 'good') }} />
      {/* 1-4 forge */}
      <CrystalPickup world={world} pos={FORGE.crystalAt} show={!solved['1-4crystal']} onTake={takeCrystal} />
      <group position={FORGE.tetraPlate}>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.1, 3]} /><meshStandardMaterial color={solved['1-4tetra'] ? '#6fe39a' : '#43e6f5'} emissive={solved['1-4tetra'] ? '#2a8a4a' : '#1fa7c4'} emissiveIntensity={1.2} /></mesh>
        <Html position={[0, 1.2, 0]} center distanceFactor={9}><div className="tag3d">tetrahedral seal · 109.5°</div></Html>
      </group>
      <PiPillar world={world} pos={FORGE.piPillars[0]} upright={piUp[0] || !!solved['1-4pi']} onTurn={() => turnPi(0)} />
      <PiPillar world={world} pos={FORGE.piPillars[1]} upright={piUp[1] || !!solved['1-4pi']} onTurn={() => turnPi(1)} />
      <Html position={[4, 4.6, -105.5]} center distanceFactor={10}><div className="tag3d">π door · p orbitals must be parallel</div></Html>
      <Torch pos={[-6.5, 0, -79]} /><Torch pos={[6.5, 0, -79]} /><Torch pos={[-6.5, 0, -103]} /><Torch pos={[6.5, 0, -103]} />
      {/* 1-5 gallery */}
      <Painting pos={[-7.4, 3, -119]} rotY={Math.PI / 2} title="Isoprene" solved={!!solved['1-5a']} />
      <Painting pos={[7.4, 3, -119]} rotY={-Math.PI / 2} title="Methylcyclohexane" solved={!!solved['1-5b']} />
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
