import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { warpOut } from '../engine/Warp'
import { Slab, Gate, Station, Torch, Motes, Chest, scatter, Scatter, Tag } from '../engine/kit'
import { ImpPack } from '../actors/Critters'
import EclipsedBats from '../actors/EclipsedBats'
import Serpent from '../actors/Serpent'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { judgeWalk, nameFrom, conformerName, CONFORMERS } from '../chem/rules3'
import { flashNewman } from '../ui/Newman'
import { W3 as W, ROOMS3, STATIONS3, CRESTS, SPIRITS, GROUP_WHY, MAZES, DOORS3, ROOSTS3, ARENA_ROOSTS, STRAIN_SUM, GOALS3, SERPENT } from '../data/dungeon3'

// Dungeon 3 — The Chain Labyrinth (Chapter 3, Alkanes and Their Stereochemistry).
// Ocarina-style again: Dungeon Map, Compass, a small key, the Newman Lantern in a big chest, a Boss Key.
// Two puzzles happen in the world, not in panels: carrying molecule spirits to their family crests
// (§3.1) and walking a skeleton's longest chain from the right end (§3.4).

const has = (id) => !!getState().save.solved[id]
const ghost = { addFloor: () => 0, remove: () => {} }
const ARENA = { x: 14, z: [-140, -178] }
const MAZE_ZONES = { A: [-65.6, -79.5], B: [-85.7, -99.5] } // z ranges where the floor is a chasm
const RING_R = 13.2 // the boss ring's fence
// walkable squares under each stone and along each bridge of a maze skeleton
function mazeTiles(mz) {
  const t = mz.atoms.map(([x, z]) => [x - 0.95, z - 0.95, x + 0.95, z + 0.95])
  for (const [a, b] of mz.bonds) {
    const A = mz.atoms[a], B = mz.atoms[b], n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / 0.4)
    for (let k = 0; k <= n; k++) { const x = A[0] + ((B[0] - A[0]) * k) / n, z = A[1] + ((B[1] - A[1]) * k) / n; t.push([x - 0.55, z - 0.55, x + 0.55, z + 0.55]) }
  }
  return t
}
// root bridges that grow from a solved maze's last stone to the far ledge
const EXIT_BRIDGES = { A: { from: [-1.5, -73], to: -79.5, id: '3-3walkA' }, B: { from: [0.6, -96.4], to: -99.5, id: '3-3walkB' } }
const MOSS = '#2c4434', ROOT = '#4a3426'

/** Root walls: thick wooden walls with zigzag carbon-chain roots crawling along them. */
function RootWalls({ world, z0, z1, half = W, h = 7 }) {
  const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2
  useEffect(() => {
    const a = world.addSolid([-half - 2, -2, Math.min(z0, z1)], [-half, h, Math.max(z0, z1)])
    const b = world.addSolid([half, -2, Math.min(z0, z1)], [half + 2, h, Math.max(z0, z1)])
    return () => { world.remove(a); world.remove(b) }
  }, [world])
  const knots = []
  for (let z = z0 - 1.2; z > z1 + 0.6; z -= 1.6) knots.push(z)
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (half + 1), h / 2 - 1, zc]} receiveShadow><boxGeometry args={[2, h + 2, len]} /><meshStandardMaterial color="#3a2a1e" roughness={1} /></mesh>
          {/* a carbon-chain root zigzagging along the wall */}
          {knots.map((z, i) => <mesh key={i} position={[s * (half - 0.05), 2.2 + (i % 2) * 0.7, z]} castShadow><sphereGeometry args={[0.32, 10, 8]} /><meshStandardMaterial color="#5a3e2c" emissive="#12301e" emissiveIntensity={0.4} roughness={0.85} /></mesh>)}
          <mesh position={[s * (half + 0.9), h + 0.1, zc]}><boxGeometry args={[2.6, 0.5, len]} /><meshStandardMaterial color="#1f3a2a" roughness={1} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** A molecule spirit: a glowing wisp with its formula, carried overhead once picked up. */
function Spirit({ sp, placedAt, carried, world }) {
  const g = useRef()
  // a spirit only takes its family's colour once it is home, so the crests can't be matched by colour
  const color = placedAt ? { alkene: '#7ad8ff', alcohol: '#ff8a6a', ether: '#ffd060', amine: '#8a8aff' }[sp.group] : '#cfe8dc'
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    if (carried && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.2 + Math.sin(t * 4) * 0.06, world.player.pos.z)
    else if (placedAt) g.current.position.set(placedAt[0], 2.1 + Math.sin(t * 2 + sp.size) * 0.08, placedAt[2] + 0.2)
    else g.current.position.set(sp.pos[0], 1.9 + Math.sin(t * 2 + sp.size) * 0.12, sp.pos[2])
    g.current.rotation.y = t * 0.8
  })
  return (
    <group ref={g}>
      <mesh scale={sp.size * 0.42}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color={placedAt ? color : '#e8fff4'} emissive={color} emissiveIntensity={placedAt ? 1.6 : 0.6} transparent opacity={0.85} flatShading /></mesh>
      <pointLight color={color} intensity={1.4} distance={4} />
      <Tag position={[0, sp.size * 0.42 + 0.45, 0]} df={11}>{placedAt ? sp.name : sp.shown || sp.formula}</Tag>
    </group>
  )
}

function Pedestal({ pos, color = '#6a5a44', h = 1.1 }) {
  return (
    <group position={pos}>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.45, 0.6, h, 8]} /><meshStandardMaterial color={color} roughness={0.85} /></mesh>
      <mesh position={[0, h + 0.04, 0]}><cylinderGeometry args={[0.6, 0.5, 0.08, 8]} /><meshStandardMaterial color="#3a3028" /></mesh>
    </group>
  )
}

/** A skeleton drawn in root-stones on the floor (the naming maze). lit = path atoms, nums = their numbers. */
function MazeFloor({ maze, lit, nums, solved, branches = {} }) {
  return (
    <group>
      {maze.bonds.map(([a, b], k) => {
        const A = maze.atoms[a], B = maze.atoms[b], dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz)
        const on = lit.includes(a) && lit.includes(b)
        return <mesh key={k} position={[(A[0] + B[0]) / 2, 0.08, (A[1] + B[1]) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]} receiveShadow><boxGeometry args={[l, 0.16, 1.1]} /><meshStandardMaterial color={on ? '#8a6a3a' : ROOT} emissive={on ? (solved ? '#2a8a4a' : '#7a5a10') : '#000'} emissiveIntensity={0.6} roughness={0.85} /></mesh>
      })}
      {maze.atoms.map(([x, z], i) => {
        const on = lit.includes(i)
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.14, 0]} castShadow receiveShadow><cylinderGeometry args={[0.95, 1.05, 0.28, 14]} /><meshStandardMaterial color={on ? '#d8c890' : '#a89478'} emissive={on ? (solved ? '#4ad87a' : '#ffcf6a') : '#3a2a1a'} emissiveIntensity={on ? 0.5 : 0.35} roughness={0.7} /></mesh>
            <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color="#1a1a22" /></mesh>
            {nums[i] !== undefined && <Tag position={[0, 1.2, 0]} df={9} className="maze-num">{nums[i]}</Tag>}
            {branches[i] && <Tag position={[0, 1.2, 0]} df={10}>{branches[i]}</Tag>}
          </group>
        )
      })}
    </group>
  )
}

/** A round Newman door: three fixed front spokes, three back spokes that turn with the Lantern. */
function NewmanDoor({ world, door, open, angle }) {
  const id = useRef(null), slab = useRef(), back = useRef(), h = useRef(open ? 1 : 0)
  useEffect(() => { id.current = world.addSolid([-W, 0, door.z - 0.6], [W, 8, door.z + 0.6]); return () => world.remove(id.current) }, [world])
  useEffect(() => { world.setEnabled(id.current, !open) }, [open])
  useFrame((_, dt) => {
    h.current += ((open ? 1 : 0) - h.current) * Math.min(1, dt * 1.8)
    if (slab.current) slab.current.position.y = -h.current * 8.2
    const shown = ((angle % 120) + 120) % 120 === 0 ? angle + 14 : angle // eclipsed spokes peek out, like Fig 3.7
    if (back.current) back.current.rotation.z += ((-shown * Math.PI) / 180 - back.current.rotation.z) * Math.min(1, dt * 8)
  })
  const C = CONFORMERS[door.kind]
  const e = C.energy(angle)
  const glow = e === 0 ? '#6fe39a' : e < 5 ? '#ffd760' : '#ff6a5a'
  const spoke = (deg, inner, outer, mat, key, label) => {
    const a = (deg * Math.PI) / 180, mid = (inner + outer) / 2
    return (
      <group key={key} rotation={[0, 0, -a]}>
        <mesh position={[0, mid, 0]}>{mat}<boxGeometry args={[0.32, outer - inner, 0.2]} /></mesh>
        {label === 'CH₃' && <mesh position={[0, outer + 0.4, 0]}><sphereGeometry args={[0.42, 12, 10]} /><meshStandardMaterial color="#ff6fb3" emissive="#ff3a90" emissiveIntensity={0.7} /></mesh>}
        {label === 'H' && <mesh position={[0, outer + 0.25, 0]}><sphereGeometry args={[0.24, 10, 8]} /><meshStandardMaterial color="#f2f2f2" /></mesh>}
      </group>
    )
  }
  return (
    <group position={[0, 0, door.z]}>
      <group ref={slab}>
        <mesh position={[0, 4, 0]} castShadow><boxGeometry args={[2 * W, 8, 0.8]} /><meshStandardMaterial color="#3a2a1e" roughness={1} /></mesh>
        <group position={[0, 2.9, 0.45]}>
          {/* back carbon: the ring and its spokes from the rim outward */}
          <group ref={back}>{C.back.map((g, i) => spoke(i * 120, 1.25, 2.6, <meshStandardMaterial color="#9fb6c8" metalness={0.5} roughness={0.4} />, 'b' + i, g))}</group>
          <mesh position={[0, 0, 0.12]}><torusGeometry args={[1.25, 0.12, 10, 40]} /><meshStandardMaterial color="#cfe6ff" emissive={glow} emissiveIntensity={0.8} /></mesh>
          <mesh position={[0, 0, 0.05]}><circleGeometry args={[1.18, 32]} /><meshStandardMaterial color="#14202a" /></mesh>
          {/* front carbon: spokes meeting in the centre */}
          <group position={[0, 0, 0.25]}>{C.front.map((g, i) => spoke(i * 120, 0, 2.6, <meshStandardMaterial color="#f2efe6" metalness={0.3} roughness={0.4} />, 'f' + i, g))}
            <mesh><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#f2efe6" /></mesh></group>
          <pointLight position={[0, 0, 1.5]} color={glow} intensity={3} distance={7} />
        </group>
      </group>
      {!open && <Tag position={[0, 8.6, 0.6]} df={13}>{door.title} · opens when {door.goal}</Tag>}
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

/** A hedge-statue of a C₅ skeleton, grown in the Isomer Garden. */
function Hedge({ pos, atoms, bonds = [], show, label }) {
  if (!show) return null
  return (
    <group position={pos}>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[1.6, 1.7, 0.4, 16]} /><meshStandardMaterial color="#5a4030" roughness={1} /></mesh>
      {atoms.map(([x, y], i) => <mesh key={i} position={[x, 1 + y, 0]} castShadow><dodecahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#3f7a46" roughness={1} flatShading /></mesh>)}
      {bonds.map(([a, b], k) => { const A = atoms[a], B = atoms[b], dx = B[0] - A[0], dy = B[1] - A[1]; return <mesh key={'b' + k} position={[(A[0] + B[0]) / 2, 1 + (A[1] + B[1]) / 2, 0]} rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, Math.hypot(dx, dy), 6]} /><meshStandardMaterial color="#5a3e2c" /></mesh> })}
      <Tag position={[0, 3.2, 0]} df={11}>{label}</Tag>
    </group>
  )
}
const HEDGES = [
  { key: 'pentane', label: 'pentane', atoms: [[-1.2, 0], [-0.6, 0.35], [0, 0], [0.6, 0.35], [1.2, 0]], bonds: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  { key: '2-methylbutane (isopentane)', label: '2-methylbutane', atoms: [[-1, 0], [-0.4, 0.35], [0.2, 0], [0.8, 0.35], [-0.4, 1.05]], bonds: [[0, 1], [1, 2], [2, 3], [1, 4]] },
  { key: '2,2-dimethylpropane (neopentane)', label: '2,2-dimethylpropane', atoms: [[0, 0.6], [-0.9, 0.6], [0.9, 0.6], [0, 1.5], [0, -0.3]], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
]

function LabyrinthLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [carry, setCarry] = useState(null)
  const carryRef = useRef(null)
  carryRef.current = carry
  const placed = save.t3placed || {}
  const [doorAngles, setDoorAngles] = useState(() => DOORS3.map((d) => (getState().save.solved[d.id] ? (d.goal === 'anti' ? 180 : d.goal === 'eclipsed' ? 0 : 60) : typeof d.start === 'function' ? d.start() : d.start)))
  const angRef = useRef(doorAngles)
  angRef.current = doorAngles
  // naming maze: the current walk and what each stone shows
  const [walk, setWalk] = useState({ A: { lit: [], nums: {} }, B: { lit: [], nums: {} } })
  const walkRef = useRef({ key: null, path: [], warnT: 0, needOff: false })
  const [arenaBats, setArenaBats] = useState(false)
  const gapRef = useRef([])
  const lookedDoor = useRef(-1)
  const exitBridge = useRef({})
  useEffect(() => { setState({ carrying: !!carry }) }, [carry])
  useEffect(() => { for (const k of ['A', 'B']) if (exitBridge.current[k]) world.setEnabled(exitBridge.current[k], !!solved[EXIT_BRIDGES[k].id]) }, [solved['3-3walkA'], solved['3-3walkB']])
  useEffect(() => () => setState({ carrying: false, newman: null }), [])

  // ---- the map, Ocarina rules
  useEffect(() => {
    world.map = {
      floor: '#4a5e44', wall: '#1e2a20', pit: '#0e1a14',
      labels: ROOMS3.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => {
        const sv = getState().save
        if (sv.solved['t3-map']) return null
        const seen = sv.t3seen || {}
        return ROOMS3.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]])
      },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t3-compass']) return null
        const g = GOALS3.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 3) return { pos: [0, -160], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Chain Forest' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('labyrinth')
    world.killY = -6
    const f = [
      world.addFloor(-W, MAZE_ZONES.A[0], W, 8, 0), world.addFloor(-W, MAZE_ZONES.B[0], W, MAZE_ZONES.A[1], 0), world.addFloor(-W, -140, W, MAZE_ZONES.B[1], 0),
      world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -140, 0),
      ...['A', 'B'].flatMap((k) => mazeTiles(MAZES[k]).map(([x0, z0, x1, z1]) => world.addFloor(x0, z0, x1, z1, 0))),
      world.addFloor(-1.8, -88.6, -0.4, MAZE_ZONES.B[0] + 0.1, 0), // B: a root step onto stone 4 (C4, a middle stone)
    ]
    // the boss ring: a fence of root stakes, its north gap closing when the fight starts
    const ring = [], gap = []
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2, x = Math.sin(a) * RING_R, z = SERPENT.center[2] + Math.cos(a) * RING_R
      const id = world.addSolid([x - 0.7, -2, z - 0.7], [x + 0.7, 3, z + 0.7])
      world.solids.get(id).noCam = true
      ;(Math.cos(a) > 0.96 ? gap : ring).push(id)
    }
    gap.forEach((id) => world.setEnabled(id, false))
    gapRef.current = gap
    for (const k of ['A', 'B']) {
      const eb = EXIT_BRIDGES[k]
      const id = world.addFloor(eb.from[0] - 1.0, eb.to - 0.3, eb.from[0] + 1.0, eb.from[1], 0)
      world.setEnabled(id, !!getState().save.solved[eb.id])
      exitBridge.current[k] = id
      f.push(id)
    }
    const s = [
      world.addSolid([-W, -2, 8], [W, 7, 10]),
      world.addSolid([-ARENA.x - 2, -2, ARENA.z[1]], [-ARENA.x, 8, ARENA.z[0]]), world.addSolid([ARENA.x, -2, ARENA.z[1]], [ARENA.x + 2, 8, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -2, ARENA.z[1] - 2], [ARENA.x + 2, 8, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -2, -141], [-W, 8, -139]), world.addSolid([W, -2, -141], [ARENA.x, 8, -139]),
    ]
    const HINTS = {
      '3-1': 'Molecule spirits! Carry each to its family crest. E to lift, E to place.',
      '3-2': 'A garden of isomers: same five carbons, different connections.',
      '3-3': 'The floor is a skeleton over a chasm! Read the Naming Laws first.',
      '3-4': 'Round doors with spokes — bonds seen end-on. That big chest…',
    }
    const t = ROOMS3.map((r) => world.addTrigger([-ARENA.x, -2, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t3seen || {}
      saveGame({ checkpoint: { scene: 'labyrinth', room: r.id }, t3seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4600), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -153], [6, 6, -148.5], () => startBoss())
    // Malradix's decree reads itself the first time Kai walks in
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t3-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the decree', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Chain Forest', onInteract: () => onExit('forest', { scene: 'forest', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -58.8], radius: 2.2, label: () => (has('t3-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -139], radius: 2.4, label: () => (has('t3-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlockBossDoor() }),
    ]
    // spirits and crests (§3.1)
    SPIRITS.forEach((sp) => ia.push(world.addInteractable({
      pos: sp.pos, radius: 2,
      label: () => ((getState().save.t3placed || {})[sp.id] || carryRef.current ? null : `Pick up ${sp.name}`),
      onInteract: () => { if ((getState().save.t3placed || {})[sp.id] || carryRef.current) return; setCarry(sp.id); sfx('pickup') },
    })))
    CRESTS.forEach((cr) => ia.push(world.addInteractable({
      pos: cr.pos, radius: 2,
      label: () => { const c = carryRef.current; if (!c) return null; const sp = SPIRITS.find((x) => x.id === c); return `Place ${sp.name} on the ${cr.label.split(' ·')[0]} crest` },
      onInteract: () => placeSpirit(cr),
    })))
    const ts = world.addSolid([4.4, 0, -9.4], [5.6, 1.6, -8.6])
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS3.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
      window.__valence.placeAll = () => { setCarry(null); saveGame({ t3placed: Object.fromEntries(SPIRITS.map((sp) => [sp.id, sp.group])) }); markSolved('3-1') }
    }
    return () => { [...f, ...s, ...t, bossT, ...ia, ts, decreeT, ...ring, ...gap].forEach((i) => world.remove(i)) }
  }, [world])

  // ---- naming maze: watch Kai's feet on the root-stones
  useFrame(() => {
    const p = world.player
    if (!p) return
    stepMaze(p.pos.x, p.pos.z)
    const inMaze = p.pos.z < -62 && p.pos.z > -100
    if (getState().save.hasLantern) {
      const di = DOORS3.findIndex((d) => !getState().save.solved[d.id] && Math.abs(p.pos.z - (d.z + 1.5)) < 2.6)
      if (di !== lookedDoor.current) {
        lookedDoor.current = di
        if (di >= 0) { const d = DOORS3[di]; flashNewman({ kind: d.kind, angle: angRef.current[di], title: d.title, note: d.goal === 'eclipsed' ? 'This one wants the strained shape: eclipsed.' : `Wants ${d.goal}. Which way is shorter?` }, 4200) }
      }
    }
    world.camBoost = inMaze ? { dist: 2.6, pitch: 0.6 } : world.bossCam ? { dist: 3.4, pitch: 0.36 } : getState().lanternPrompt ? { dist: 2.2, pitch: 0.42 } : null
  })
  useEffect(() => { if (import.meta.env.DEV) { window.__valence = window.__valence || {}; window.__valence.mazeStep = (x, z) => stepMaze(x, z) } }, [])
  const stepMaze = (px, pz) => {
    const key = pz < -63 && pz > -80 ? 'A' : pz < -84 && pz > -100 ? 'B' : null
    const W_ = walkRef.current
    const sv = getState().save
    if (!key || sv.solved[MAZES[key].id] || (key === 'B' && !sv.solved[MAZES.A.id])) { if (W_.path.length && W_.key) resetWalk(null); return }
    const mz = MAZES[key]
    let stone = -1
    mz.atoms.forEach(([x, z], i) => { if (Math.hypot(px - x, pz - z) < 1.0) stone = i })
    let onBond = false
    for (const [a, b] of mz.bonds) {
      const A = mz.atoms[a], B = mz.atoms[b], dx = B[0] - A[0], dz = B[1] - A[1], l2 = dx * dx + dz * dz
      const u = Math.max(0, Math.min(1, ((px - A[0]) * dx + (pz - A[1]) * dz) / l2))
      if (Math.hypot(px - (A[0] + dx * u), pz - (A[1] + dz * u)) < 0.7) { onBond = true; break }
    }
    const deg = (i) => mz.bonds.filter((b) => b.includes(i)).length
    const adjacent = (i, j) => mz.bonds.some(([a, b]) => (a === i && b === j) || (a === j && b === i))
    if (W_.key !== key) { W_.key = key; W_.path = [] }
    if (!W_.path.length) {
      if (W_.needOff) { if (stone < 0 || deg(stone) !== 1) W_.needOff = false; return }
      if (stone >= 0 && deg(stone) === 1) { W_.path = [stone]; sfx('pickup'); paint(key, W_.path) }
      return
    }
    if (stone < 0 && !onBond) { resetWalk(W_.path.length >= 2 ? 'Off the roots! Start again from an end stone.' : null); return }
    if (stone < 0) return
    const last = W_.path[W_.path.length - 1]
    if (stone === last) return
    if (W_.path.length > 1 && stone === W_.path[W_.path.length - 2]) { W_.path.pop(); paint(key, W_.path); return } // stepping back
    if (!adjacent(last, stone) || W_.path.includes(stone)) { resetWalk('Not bonded to the last stone. Start again from an end stone.'); return }
    W_.path.push(stone); sfx('lock'); paint(key, W_.path)
    if (deg(stone) === 1) finishWalk(key, mz)
  }

  const adjOf = (mz) => { const a = mz.atoms.map(() => []); mz.bonds.forEach(([x, y]) => { a[x].push(y); a[y].push(x) }); return a }
  const paint = (key, path, solvedNums) => setWalk((w) => ({ ...w, [key]: { lit: [...path], nums: solvedNums || Object.fromEntries(path.map((v, i) => [v, i + 1])) } }))
  const resetWalk = (msg) => {
    const W_ = walkRef.current
    if (msg && performance.now() - W_.warnT > 1500) { toast(msg, 'warn', 2600); W_.warnT = performance.now() }
    if (W_.key) paint(W_.key, [])
    W_.path = []
  }
  const finishWalk = (key, mz) => {
    const W_ = walkRef.current
    const path = W_.path
    const res = judgeWalk(adjOf(mz), path[0], path[path.length - 1])
    if (!res.ok) { sfx('wrong'); toast(res.why, 'warn', 5200); W_.needOff = true; W_.path = []; setTimeout(() => { if (!walkRef.current.path.length) paint(key, []) }, 2200); return }
    sfx('right'); markSolved(mz.id)
    saveGame({ ['t3chain' + key]: res.chain })
    world.setEnabled(exitBridge.current[key], true)
    paint(key, res.chain, Object.fromEntries(res.chain.map((v, i) => [v, i + 1])))
    if (key === 'A') setTimeout(() => say([
      { who: 'Pi', text: `Six! The row of five was a trap. ${nameFrom(res.chain, res.subs)}: the branch gets 3, not 4.` },
      { who: 'Archivist Iupaca', text: '(Her voice echoes down the roots.) Corners are allowed. Laziness is not.' },
      { who: 'Pi', text: 'A root bridge grew to the far ledge!' },
    ]), 300)
    else setTimeout(() => say([{ who: 'Pi', text: 'Eight stones! The branches lit up. Cross the new bridge and speak its name.' }]), 300)
  }

  const placeSpirit = async (cr) => {
    const c = carryRef.current
    if (!c) return
    const sp = SPIRITS.find((x) => x.id === c)
    if (sp.group !== cr.id) { sfx('wrong'); setCarry(null); toast(`Rejected — it floats back to its pedestal. ${sp.name}: ${GROUP_WHY[sp.group]}.`, 'warn', 4000); return }
    const next = { ...(getState().save.t3placed || {}), [sp.id]: cr.id }
    saveGame({ t3placed: next }); setCarry(null); sfx('right')
    if (sp.id === 'menthene' && next.ethylene || sp.id === 'ethylene' && next.menthene) toast('Tiny ethylene, big menthene. Both C=C, both add Br₂ the same way.', 'good', 3800)
    if (sp.id === 'propylamine' && next.isopropylamine || sp.id === 'isopropylamine' && next.propylamine) toast('Propylamine and isopropylamine: same formula, N on a different carbon. Isomers again!', 'info', 3800)
    if (sp.id === 'dme' && !next.ethanol || sp.id === 'ethanol' && !next.dme) toast(`${sp.name} is C₂H₆O… and so is its cousin. Same formula, different family.`, 'info', 3600)
    if (SPIRITS.every((x) => next[x.id])) {
      markSolved('3-1'); sfx('open')
      setTimeout(() => say([
        { who: 'Pi', text: 'Every spirit home! Same formula, two families: the group decides.' },
        { who: 'Pi', text: 'So much for "too many to ever know." Four crests sorted six molecules.' },
      ]), 300)
    }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's decree", text: 'BY ORDER OF MALRADIX: Every molecule is its own strange beast. There are too many to ever know. Do not try.' },
      { who: 'Pi', text: 'Iupaca already called that rubbish. Let\'s prove her right.' },
      { who: 'Pi', text: 'Chests again. Map and Compass first.' },
    ])
    markSolved('t3-decree')
    busy.current = false
  }

  const unlockDoor = () => {
    if (has('t3-door')) return
    if (!getState().save.t3key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t3key: false }); markSolved('t3-door'); sfx('open')
    toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t3-bossdoor')) return
    if (!has('t3-bosskey')) { toast('A great lock carved like a coiled serpent. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t3-bossdoor'); sfx('open')
    toast('The Boss Key turns. Something long uncoils beyond the door…', 'good', 3200)
  }

  const useStation = async (id) => {
    const st = STATIONS3[id]
    if (has(id)) { toast('Already done.', 'info', 1200); return }
    if (st.needs && !st.needs.every(has)) { toast(id === '3-2b' ? 'Grow the isomers first.' : 'Walk the skeleton\'s longest chain first.', 'warn'); return }
    const ok = await openPanel(st.panel, st.props)
    if (!ok) return
    markSolved(id); sfx('open')
    const after = {
      '3-2a': [{ who: 'Pi', text: 'Three hedges! Same formula, three different skeletons — constitutional isomers.' }],
      '3-2b': [{ who: 'Pi', text: 'Badges done — and a little chest popped up by the door!' }],
      '3-3b': [{ who: 'Archivist Iupaca', text: '(From somewhere above.) 4-Ethyl-2-methyloctane. Correct, and alphabetized. I may frame this.' }],
    }[id]
    if (after) setTimeout(() => say(after), 300)
  }

  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id)
    sfx('shard')
    if (id === 't3-map') await say([{ who: '', text: 'You got the Dungeon Map!' }, { who: 'Pi', text: 'Press M — the whole labyrinth, every root.' }])
    if (id === 't3-compass') await say([{ who: '', text: 'You got the Compass!' }, { who: 'Pi', text: 'The star is back on the map.' }])
    if (id === 't3-key') { saveGame({ t3key: true }); await say([{ who: '', text: 'You got a Small Key!' }, { who: 'Pi', text: 'For the locked door at the end of the garden.' }]) }
    if (id === 't3-lantern') {
      saveGame({ hasLantern: true })
      await say([
        { who: '', text: 'You got the Newman Lantern!' },
        { who: 'Pi', text: 'It shows a bond end-on. Try it on ethane first.' },
      ])
      busy.current = false
      await openPanel('newman', {})
      await say([{ who: 'Pi', text: 'G turns 60° one way, Shift+G the other. Careful — those bats just woke up. Turn their rod too!' }])
      return
    }
    if (id === 't3-bosskey') { saveGame({ t3bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }, { who: 'Pi', text: 'The serpent\'s door is right there.' }]) }
    busy.current = false
  }

  // ---- Newman doors (§3.6–3.7)
  useEffect(() => {
    const ids = DOORS3.map((d, i) => world.addLantern({
      pos: [0, 0, d.z + 0.9], radius: 4.5,
      label: () => (has(d.id) ? null : `Turn the ${d.kind} bond to ${d.goal} · G / Shift+G${d.noSpark ? '' : ' · eclipsed sparks'}`),
      onLantern: (dir = 1) => {
        if (has(d.id)) return
        const a = (angRef.current[i] + 60 * dir + 360) % 360
        setDoorAngles((arr) => arr.map((v, k) => (k === i ? a : v)))
        const name = conformerName(d.kind, a), e = CONFORMERS[d.kind].energy(a)
        const ok = d.want(a)
        const sum = (STRAIN_SUM[d.kind] || {})[name]
        const note = ok ? (d.goal === 'eclipsed' ? `Eclipsed: ${sum}. You set the strained shape — the door unlocks.` : `${name[0].toUpperCase() + name.slice(1)}: no strain. The door unlocks.`) : d.kind === 'butane' && name === 'gauche' ? `Gauche — ${sum}. Close: this door wants them 180° apart.` : name.startsWith('eclipsed') ? `Eclipsed! ${sum || e + ' kJ/mol'}. The door jams and sparks.` : d.goal === 'eclipsed' ? `${name}: the low shape. This door wants the strained one.` : `${name}: ${e} kJ/mol.`
        flashNewman({ kind: d.kind, angle: a, title: d.title, note }, 4200)
        if (ok) { markSolved(d.id); sfx('open') }
        else if (name.startsWith('eclipsed') && !d.noSpark) { sfx('hurt'); setState({ hp: Math.max(1, getState().hp - 1) }) }
      },
    }))
    return () => ids.forEach((id) => world.remove(id))
  }, [world])

  // ---- boss
  const startBoss = async () => {
    if (has('boss3') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -151]
    gapRef.current.forEach((id) => world.setEnabled(id, true))
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t3bossIntro) {
      saveGame({ t3bossIntro: true })
      await say([
        { who: 'Pi', text: 'The Gauche Serpent, a living butane! That glowing knot is its C2–C3 bond.' },
        { who: 'Pi', text: 'Side-step its lunge (Space rolls) or block it (Shift). If it misses, it coils up dazed.' },
        { who: 'Pi', text: 'Then G at the knot — you get two turns. Twist until its CH₃ ends eclipse. It hates that.' },
        { who: 'Pi', text: 'And that violet spark inside the knot… that\'s Malradix\'s!' },
      ])
    } else await say([{ who: 'Pi', text: 'Again! Dodge, then two turns to eclipse its CH₃ ends.' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss3')
    playMusic('labyrinth')
    gapRef.current.forEach((id) => world.setEnabled(id, false))
    setArenaBats(false)
    await say([
      { who: 'Pi', text: 'It stretched into a perfect zigzag and went still. Anti — no strain at all.' },
      { who: 'Pi', text: 'The spark tore loose and fled north — toward the Chair Fortress? Malradix kept it wound up and strained.' },
      { who: 'Pi', text: 'Every move it made followed one energy curve. Not such a strange beast. Look — the shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 3 || busy.current) return
    busy.current = true
    sfx('shard')
    await say([{ who: 'Archivist Iupaca', text: '(She steps out of the roots.) Before you take it — one question. I insist.' }])
    const ok = await openPanel('butaneCheck', {})
    if (!ok) { await say([{ who: 'Archivist Iupaca', text: 'Think on it. The shard will keep.' }]); busy.current = false; return }
    saveGame({ shards: 3, checkpoint: { scene: 'forest', at: 'gate' } })
    setState({ objective: 'Bond Shard 3 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai\'s hands…' },
      { who: 'Princess Octavia', text: 'Kai… three shards. The castle\'s inner gate is stirring. And so is he — he felt his spark torn loose.' },
      { who: 'Princess Octavia', text: 'He calls molecules chaos. You sorted them, named them, and read every twist.' },
      { who: 'Archivist Iupaca', text: 'I wanted it back on my desk. …It turns more bonds in your hand. Keep it. The Chair Fortress twists too.' },
      { who: 'Pi', text: 'Three down, nine to go!' },
    ])
    await warpOut(world, { checkpoint: { scene: 'forest', at: 'gate' }, card: 3 })
    busy.current = false
    onExit('forest', { scene: 'forest', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -160], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss3 && (getState().save.shards || 0) < 3)
    tick()
    const t = setInterval(tick, 300)
    return () => { clearInterval(t); world.remove(id) }
  }, [world])

  const ferns = useMemo(() => scatter(70, 91, (r) => { const side = r() < 0.5 ? -1 : 1; return [side * (W - 0.6 - r() * 0.8), 4 - r() * 140, 0.5 + r() * 0.6, r() * 6] }).filter(([, z]) => !(z < -62 && z > -101)), [])

  return (
    <group>
      <color attach="background" args={['#0e1a14']} />
      <fog attach="fog" args={['#12241a', 12, 55]} />
      <hemisphereLight args={['#8fd8c0', '#1a2a20', 0.8]} />
      <ambientLight intensity={0.3} color="#a8ffe0" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#cfe8d8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <Slab world={ghost} x0={-W} z0={8} x1={W} z1={MAZE_ZONES.A[0]} color={MOSS} />
      <Slab world={ghost} x0={-W} z0={MAZE_ZONES.A[1]} x1={W} z1={MAZE_ZONES.B[0]} color={MOSS} />
      <Slab world={ghost} x0={-W} z0={MAZE_ZONES.B[1]} x1={W} z1={-140} color={MOSS} />
      {/* glowing moss light over the skeleton floors, so the chain reads against the dark chasm */}
      {[[-3, -69], [4, -71], [-4, -91], [3, -92]].map(([x, z], i) => <pointLight key={'ml' + i} position={[x, 5, z]} color="#bfffe0" intensity={9} distance={14} />)}
      {/* the stones and bridges stand on root pillars rising out of the chasm */}
      {['A', 'B'].map((k) => MAZES[k].atoms.map(([x, z], i) => <mesh key={k + i} position={[x, -1.4, z]}><cylinderGeometry args={[0.7, 0.45, 2.8, 8]} /><meshStandardMaterial color="#5a4030" emissive="#1a2a1a" emissiveIntensity={0.4} roughness={1} /></mesh>))}
      <Slab world={ghost} x0={-ARENA.x} z0={-140} x1={ARENA.x} z1={ARENA.z[1]} color="#34402e" />
      <RootWalls world={world} z0={8} z1={-140} />
      <RootWalls world={world} z0={-140} z1={-178} half={ARENA.x} h={8} />
      <Scatter items={ferns} kind="tree" color="#2f5a3a" />
      {[2, -12, -26, -42, -54, -64, -83, -102, -112, -122, -131].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#7ff4d8" />))}

      {/* ---- entrance */}
      <mesh position={[0, 0.02, 7]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4, 2]} /><meshBasicMaterial color="#7ff4d8" transparent opacity={0.3} /></mesh>
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3644" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's decree</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t3-map']} onOpen={() => openChest('t3-map')} />
      <Tag position={[0, 6, -13]} df={16}>The Chain Labyrinth</Tag>

      {/* ---- 3-1 Hall of Families */}
      {SPIRITS.map((sp) => <Pedestal key={sp.id} pos={sp.pos} />)}
      {CRESTS.map((cr) => (
        <group key={cr.id} position={cr.pos}>
          <Pedestal pos={[0, 0, 0]} color="#3a3028" h={1.3} />
          <mesh position={[0, 2.2, -0.6]}><circleGeometry args={[0.95, 6]} /><meshStandardMaterial color={cr.color} emissive={cr.color} emissiveIntensity={0.5} side={THREE.DoubleSide} /></mesh>
          <Tag position={[0, 0.9, 0.7]} df={14} far={30} className="crest">{cr.label}</Tag>
        </group>
      ))}
      {SPIRITS.map((sp) => <Spirit key={sp.id} sp={sp} world={world} carried={carry === sp.id} placedAt={placed[sp.id] ? CRESTS.find((c) => c.id === placed[sp.id]).pos : null} />)}
      <Chest world={world} pos={[7.6, 0, -15.5]} rotY={-Math.PI / 2} opened={!!solved['t3-compass']} onOpen={() => openChest('t3-compass')} />
      <Gate world={world} pos={[0, 0, -36]} size={[2 * W, 7, 0.8]} open={!!solved['3-1']} color="#3a2a1e" glow="#7ff4d8" />

      {/* ---- 3-2 Isomer Garden */}
      {HEDGES.map((hg, i) => <Hedge key={i} pos={[-5 + i * 5, 0, -50]} atoms={hg.atoms} bonds={hg.bonds} label={hg.label} show={!!solved['3-2a'] || (save.t3isomers || []).includes(hg.key)} />)}
      {[-5, 0, 5].map((x, i) => !(solved['3-2a'] || (save.t3isomers || []).includes(HEDGES[i].key)) && <mesh key={x} position={[x, 0.15, -50]}><cylinderGeometry args={[1.6, 1.7, 0.3, 16]} /><meshStandardMaterial color="#5a4030" roughness={1} /></mesh>)}
      <Chest world={world} pos={[0, 0, -56]} opened={!!solved['t3-key']} show={!!solved['3-2b']} onOpen={() => openChest('t3-key')} label="Open the small chest" />
      <ImpPack world={world} spawns={[[-6, -45], [6, -46], [0, -53.5]]} active />
      <Gate world={world} pos={[0, 0, -60]} size={[2 * W, 7, 0.8]} open={!!solved['t3-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -59.6]} df={13}>{solved['t3-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* ---- 3-3 The Naming Maze */}
      {/* the chasms under the two skeleton floors */}
      {['A', 'B'].map((k) => <mesh key={k} position={[0, -2.5, (MAZE_ZONES[k][0] + MAZE_ZONES[k][1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, Math.abs(MAZE_ZONES[k][1] - MAZE_ZONES[k][0])]} /><meshBasicMaterial color="#050807" /></mesh>)}
      <mesh position={[-1.1, -0.1, (-88.6 + MAZE_ZONES.B[0]) / 2]} receiveShadow><boxGeometry args={[1.4, 0.4, Math.abs(-88.6 - MAZE_ZONES.B[0])]} /><meshStandardMaterial color="#8a6a46" emissive="#2a3a1a" emissiveIntensity={0.3} roughness={0.85} /></mesh>
      {['A', 'B'].map((k) => solved[EXIT_BRIDGES[k].id] && <mesh key={'eb' + k} position={[EXIT_BRIDGES[k].from[0], -0.1, (EXIT_BRIDGES[k].from[1] + EXIT_BRIDGES[k].to) / 2]} receiveShadow><boxGeometry args={[2, 0.4, Math.abs(EXIT_BRIDGES[k].to - EXIT_BRIDGES[k].from[1]) + 0.5]} /><meshStandardMaterial color="#9a7a4e" emissive="#2a8a4a" emissiveIntensity={0.45} roughness={0.85} /></mesh>)}
      <MazeFloor maze={MAZES.A} lit={solved['3-3walkA'] ? (save.t3chainA || [0, 1, 2, 3, 4, 5]) : walk.A.lit} nums={solved['3-3walkA'] ? Object.fromEntries((save.t3chainA || [0, 1, 2, 3, 4, 5]).map((v, i) => [v, i + 1])) : walk.A.nums} solved={!!solved['3-3walkA']} branches={solved['3-3walkA'] ? { 6: 'methyl' } : {}} />
      <Gate world={world} pos={[0, 0, -81]} size={[2 * W, 7, 0.8]} open={!!solved['3-3walkA']} color="#3a2a1e" glow="#7ff4d8" />
      <MazeFloor maze={MAZES.B} lit={solved['3-3walkB'] ? (save.t3chainB || [0, 1, 2, 3, 4, 5, 6, 7]) : walk.B.lit} nums={solved['3-3walkB'] ? Object.fromEntries((save.t3chainB || [0, 1, 2, 3, 4, 5, 6, 7]).map((v, i) => [v, i + 1])) : walk.B.nums} solved={!!solved['3-3walkB']} branches={solved['3-3walkB'] ? Object.fromEntries([...((save.t3chainB || [0]).includes(8) ? [[0, 'methyl']] : [[8, 'methyl']]), [9, 'ethyl'], [10, 'ethyl']]) : {}} />
      <Gate world={world} pos={[0, 0, -104]} size={[2 * W, 7, 0.8]} open={!!solved['3-3b']} color="#3a2a1e" glow="#7ff4d8" />

      {/* ---- 3-4 The Turning Halls */}
      <Chest world={world} pos={[0, 0, -108]} big opened={!!solved['t3-lantern']} onOpen={() => openChest('t3-lantern')} label="Open the big chest" />
      {DOORS3.map((d, i) => <NewmanDoor key={d.id} world={world} door={d} open={!!solved[d.id]} angle={doorAngles[i]} />)}
      <EclipsedBats world={world} roosts={ROOSTS3} active={!!save.hasLantern || !!solved['t3-lantern']} saved={save.t3bats} onTurn={(i, d) => { const b = [...(getState().save.t3bats || [0, 0, 0])]; b[i] = d; saveGame({ t3bats: b }) }} />
      <Chest world={world} pos={[0, 0, -137.5]} big opened={!!solved['t3-bosskey']} onOpen={() => openChest('t3-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -140]} size={[2 * W, 7, 0.8]} open={!!solved['t3-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {/* ---- stations */}
      {Object.entries(STATIONS3).map(([id, st]) => (
        <Station key={id} world={world} pos={st.pos} label={solved[id] ? null : st.label} enabled={!solved[id]} solved={!!solved[id]} onUse={() => useStation(id)} />
      ))}

      {/* ---- boss arena */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = ((k + 0.5) / 8) * Math.PI * 2; return <Torch key={'b' + k} pos={[Math.cos(a) * 12.5, 0, SERPENT.center[2] + Math.sin(a) * 15]} color="#ffb04a" /> })}
      <mesh position={[0, 0.02, SERPENT.center[2]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[12.6, 13.1, 64]} /><meshBasicMaterial color="#ffb04a" toneMapped={false} /></mesh>
      <Serpent world={world} center={SERPENT.center} arenaR={RING_R - 0.6} active={bossOn && !solved.boss3} onDefeated={bossDown} onPhase={(ph) => { if (ph >= 2) setArenaBats(true) }} />
      <EclipsedBats world={world} roosts={ARENA_ROOSTS} active={arenaBats && !solved.boss3} />
      {/* the ring fence of root stakes */}
      <StakeRing world={world} closed={bossOn && !solved.boss3} />
      <Shard show={!!solved.boss3 && (save.shards || 0) < 3} pos={SERPENT.center} />
      <Motes count={200} area={[18, 6, 180]} center={[0, 0.2, -85]} color="#9ff8e0" size={0.06} />
      <PiFollower world={world} />
    </group>
  )
}

// The boss ring's fence of root stakes. Stakes near the camera, or between it and Kai, turn see-through
// so they never wall off the bottom of the frame.
function StakeRing({ world, closed }) {
  const camera = useThree((s) => s.camera)
  const refs = useRef([])
  const mats = useMemo(() => {
    const mk = (color, faded) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, transparent: faded, opacity: faded ? 0.25 : 1, depthWrite: !faded })
    return { root: [mk('#4a3426', false), mk('#4a3426', true)], gap: [mk('#6a3a5a', false), mk('#6a3a5a', true)] }
  }, [])
  const geo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.3, 1.1, 6), [])
  const stakes = useMemo(() => [...Array(48)].map((_, k) => {
    const a = (k / 48) * Math.PI * 2
    return { k, a, gap: Math.cos(a) > 0.96, x: Math.sin(a) * RING_R, z: SERPENT.center[2] + Math.cos(a) * RING_R }
  }), [])
  useFrame(() => {
    const p = world.player
    if (!p) return
    const cx = camera.position.x, cz = camera.position.z, vx = p.pos.x - cx, vz = p.pos.z - cz, L2 = vx * vx + vz * vz || 1
    stakes.forEach((st) => {
      const m = refs.current[st.k]
      if (!m) return
      const u = Math.max(0, Math.min(1, ((st.x - cx) * vx + (st.z - cz) * vz) / L2))
      const ex = cx + vx * u - st.x, ez = cz + vz * u - st.z
      const fade = Math.hypot(st.x - cx, st.z - cz) < 5 || ex * ex + ez * ez < 1.6
      m.material = mats[st.gap ? 'gap' : 'root'][fade ? 1 : 0]
    })
  })
  return (
    <group>
      {stakes.map((st) => (st.gap && !closed ? null : (
        <mesh key={st.k} ref={(m) => (refs.current[st.k] = m)} geometry={geo} material={mats[st.gap ? 'gap' : 'root'][0]} position={[st.x, 0.55, st.z]} rotation={[0, st.a, (st.k % 2 ? 1 : -1) * 0.12]} castShadow />
      )))}
    </group>
  )
}

export default function Labyrinth({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'labyrinth' ? ROOMS3.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#0e1a14" camDist={6.2}>
      {(world) => <LabyrinthLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
