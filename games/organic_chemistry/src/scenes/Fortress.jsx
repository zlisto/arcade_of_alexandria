import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Slab, Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Sachse } from '../actors/SachseModel'
const SACHSE_AT = [-2.2, 0, -157.4]
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import { ImpPack } from '../actors/Critters'
import AxialOgres from '../actors/AxialOgres'
import Titan from '../actors/Titan'
import { ChairRing, padPos, useFlipProgress, groupDir } from '../actors/ChairRing'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { judgeCisTrans, RING_STRAIN, TABLES, chairStrain, bestFlip, carbonUp, isAxial, decalinKind } from '../chem/rules4'
import { W4 as W, ROOMS4, ALTARS, CRYSTALS, PLINTHS, THRONE, BRIDGES4, STATIONS4, TABLE_POS, TABLE_DOORS, DOOR_NEEDS, DECALIN, GOALS4, TITAN } from '../data/dungeon4'

// Dungeon 4 — The Chair Fortress (Chapter 4, Cycloalkanes and Their Stereochemistry).
// Ocarina-style: Dungeon Map, Compass, a small key, the Ring-Flip Gauntlet in a big chest, a Boss Key.
// In-world puzzles: banner posts on ring altars (cis/trans, §4.2), carrying ring crystals to their strain
// plinths (§4.3–4.4), a throne-room floor that IS a chair — flip it and every bridge swings between axial
// and equatorial (§4.6) — banquet tables to seat in their better chair (§4.7–4.8), and a decalin altar (§4.9).

preloadModels('fortress', 'giants', 'critters')
const has = (id) => !!getState().save.solved[id]
const ghost = { addFloor: () => 0, remove: () => {} }
const ARENA = { x: 14, z: [-140, -178] }
const TC = THRONE.c // throne room centre [x, z]
const LEDGE_R = 9.3
const STONE = '#4e4a64'

/** A flagstone floor texture (violet-grey slabs with dark joints). */
function useFlagstones(repeat = [6, 30]) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    g.fillStyle = '#2a2638'; g.fillRect(0, 0, 256, 256)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
      const x = k * 64 + (r % 2 ? 32 : 0), y = r * 64
      const v = 74 + ((r * 7 + k * 13) % 5) * 7
      g.fillStyle = `rgb(${v},${v - 6},${v + 18})`
      g.fillRect((x % 256) + 3, y + 3, 58, 58)
      if (x + 64 > 256) g.fillRect(3 - (256 - x), y + 3, 58, 58)
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

/** Hall walls on both sides: Blender wall runs (zigzag merlons along the top), with colliders. */
function Halls({ world }) {
  const parts = useModelParts('fortress')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -138; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -142; z > -178; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  const cols = useMemo(() => {
    const out = []
    for (let z = 0; z > -136; z -= 8) { if (z < -64 && z > -94) continue; out.push([-W + 1.3, 0, z, 1, 0]); out.push([W - 1.3, 0, z, 1, 0]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -4, -140], [-W, 9, 8]), world.addSolid([W, -4, -140], [W + 2, 9, 8]),
      world.addSolid([-W, -4, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -4, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -4, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -4, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -4, -141], [-W, 9, -139]), world.addSolid([W, -4, -141], [ARENA.x, 9, -139]),
      ...cols.map(([x, , z]) => world.addSolid([x - 0.6, 0, z - 0.6], [x + 0.6, 7, z + 0.6])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return (
    <group>
      <InstancedPart parts={parts} name="f4_wall" items={items} />
      <InstancedPart parts={parts} name="f4_column" items={cols} castShadow />
    </group>
  )
}

function Banner({ pos, rotY = 0, color = '#6a3aa8' }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0, 0.05]}><planeGeometry args={[1.3, 3.4]} /><meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} /></mesh>
      {/* the chair sigil: a zigzag ring in silver */}
      <mesh position={[0, 0.5, 0.07]}><torusGeometry args={[0.32, 0.04, 6, 6]} /><meshStandardMaterial color="#dcdcea" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 1.74, 0.05]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 1.6, 6]} /><meshStandardMaterial color="#b8904a" metalness={0.8} roughness={0.3} /></mesh>
    </group>
  )
}

// ---------------------------------------------------------------- 4-1 ring altars (§4.1–4.2)
/** A flat ring plate on an altar; a banner post at each carbon; a methyl above or below the plate. */
function RingAltar({ altar, marks, solved }) {
  const n = altar.n, r = altar.r
  const verts = useMemo(() => [...Array(n)].map((_, k) => { const a = (k / n) * Math.PI * 2; return [Math.sin(a) * r, -Math.cos(a) * r] }), [n, r])
  return (
    <group position={[altar.pos[0], 0, altar.pos[1]]}>
      <Part model="fortress" name="f4_altar" scale={[1.6, 1, 1.6]} />
      {/* the ring plate: translucent so both faces show */}
      <mesh position={[0, 1.95, 0]} rotation={[0, Math.PI / n, 0]}><cylinderGeometry args={[r, r, 0.1, n]} /><meshStandardMaterial color={solved ? '#6fe39a' : '#a8a0d0'} transparent opacity={0.55} emissive={solved ? '#2a8a4a' : '#3a3a6a'} emissiveIntensity={0.4} /></mesh>
      {/* bright C–C bonds round the rim, so the ring's shape reads from the follow camera */}
      {verts.map(([x, z], k) => {
        const [x2, z2] = verts[(k + 1) % n], L = Math.hypot(x2 - x, z2 - z)
        return <mesh key={'b' + k} position={[(x + x2) / 2, 2.02, (z + z2) / 2]} rotation={[0, -Math.atan2(z2 - z, x2 - x), Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, L, 8]} /><meshStandardMaterial color={solved ? '#9affb8' : '#7ae8ff'} emissive={solved ? '#2a8a4a' : '#3ac8ff'} emissiveIntensity={1.1} toneMapped={false} /></mesh>
      })}
      {verts.map(([x, z], k) => {
        const m = marks[k]
        return (
          <group key={k} position={[x, 1.95, z]}>
            <mesh><sphereGeometry args={[0.26, 14, 10]} /><meshStandardMaterial color="#d8d4ea" metalness={0.2} roughness={0.4} emissive="#5a5680" emissiveIntensity={0.4} /></mesh>
            {/* the banner post through the carbon, with a face marker */}
            <mesh><cylinderGeometry args={[0.05, 0.05, 2.4, 6]} /><meshStandardMaterial color="#8a86a0" metalness={0.6} roughness={0.4} /></mesh>
            {m && (
              <group position={[0, m === 'top' ? 0.85 : -0.85, 0]}>
                <mesh><sphereGeometry args={[0.3, 16, 12]} /><meshStandardMaterial color="#ff6fb3" emissive="#ff3a90" emissiveIntensity={0.6} /></mesh>
                <mesh position={[0.32, 0.1, 0]}><planeGeometry args={[0.5, 0.36]} /><meshStandardMaterial color={m === 'top' ? '#ffd760' : '#5ab0ff'} side={THREE.DoubleSide} emissive={m === 'top' ? '#a07a10' : '#1a5aa0'} emissiveIntensity={0.5} /></mesh>
              </group>
            )}
          </group>
        )
      })}
      <mesh position={[0, 3.1, 0]}><sphereGeometry args={[0.06, 6, 6]} /><meshBasicMaterial color="#ffd760" /></mesh>
      <Tag position={[0, 3.9, 0]} df={12}>{altar.name}</Tag>
      <Tag position={[0, 0.5, r + 1.3]} df={9} far={14}>top face ↑ gold · bottom face ↓ blue</Tag>
    </group>
  )
}

// ---------------------------------------------------------------- 4-2 ring crystals (§4.3–4.5)
/** A ring of n carbons that slowly breathes between flat (Baeyer's guess) and its real shape. */
const plinthTop = (strain) => 0.8 + (strain / 115) * 1.6
const PLINTH_NAME = { 115: 'most strained', 110: 'nearly as strained', 26: 'a little strained', 0: 'no strain' }
function RingCrystal({ n, carried, placedAt, placedStrain, home, world }) {
  const g = useRef(), atoms = useRef([])
  const info = RING_STRAIN.find((x) => x.n === n)
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    if (carried && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.4, world.player.pos.z)
    else if (placedAt) g.current.position.set(placedAt[0], plinthTop(placedStrain) + 0.9, placedAt[1])
    else g.current.position.set(home[0], 1.9 + Math.sin(t * 1.5 + n) * 0.1, home[1])
    g.current.rotation.y = t * 0.5
    // pucker: 0 = flat; cyclobutane lifts one corner, cyclopentane one carbon (envelope), cyclohexane a chair
    const pk = 0.5 + 0.5 * Math.sin(t * 1.2)
    atoms.current.forEach((m, k) => {
      if (!m) return
      let y = 0
      if (n === 4) y = k === 0 ? 0.32 * pk : 0
      if (n === 5) y = k === 0 ? 0.42 * pk : 0
      if (n === 6) y = (k % 2 ? -1 : 1) * 0.22 * pk
      m.position.y = y
    })
  })
  const R = 0.62
  return (
    <group ref={g}>
      {[...Array(n)].map((_, k) => { const a = (k / n) * Math.PI * 2; return <mesh key={k} ref={(m) => (atoms.current[k] = m)} position={[Math.sin(a) * R, 0, Math.cos(a) * R]}><sphereGeometry args={[0.16, 12, 10]} /><meshStandardMaterial color="#e8e4ff" emissive={placedAt ? '#4ad87a' : '#8a6aff'} emissiveIntensity={0.8} /></mesh> })}
      <mesh rotation={[0, Math.PI / n, 0]}><cylinderGeometry args={[R * 0.98, R * 0.98, 0.04, n, 1, true]} /><meshStandardMaterial color="#c8b8ff" transparent opacity={0.45} side={THREE.DoubleSide} emissive="#6a4aff" emissiveIntensity={0.5} /></mesh>
      <pointLight color={placedAt ? '#6fe39a' : '#a07aff'} intensity={1.4} distance={4} />
      <Tag position={[0, 0.9, 0]} df={10}>{info.name} · {info.real}</Tag>
    </group>
  )
}

// ---------------------------------------------------------------- 4-3 the throne-room chair (§4.5–4.6)
function ThroneChair({ flip, solved }) {
  const prog = useFlipProgress(flip, 1.6)
  const pads = useRef([]), arms = useRef([])
  useFrame(() => {
    const f = prog.current
    for (let k = 0; k < 6; k++) {
      const m = pads.current[k]
      if (!m) continue
      const up0 = carbonUp(k, false) ? 1 : -1
      m.position.y = -0.62 + up0 * (1 - 2 * f) * 0.45
    }
    // each top-face group swings between a pillar (axial, straight up) and a walkway (equatorial, outward)
    BRIDGES4.forEach((b, i) => {
      const a = arms.current[i]
      if (!a) return
      const ax0 = isAxial(b.k, 'top', false) ? 1 : 0, ax1 = isAxial(b.k, 'top', true) ? 1 : 0
      const ax = ax0 + (ax1 - ax0) * f
      a.rotation.x = (1 - ax) * Math.PI / 2 // 0 = standing up (axial); 90° = lying outward (equatorial)
    })
  })
  return (
    <group position={[TC[0], 0, TC[1]]}>
      {/* the central floor of the throne (walkable), the six carbon pads round it */}
      <mesh position={[0, -0.2, 0]} receiveShadow><cylinderGeometry args={[THRONE.R + 1.1, THRONE.R + 1.1, 0.4, 6]} /><meshStandardMaterial color="#5e5a78" roughness={0.8} /></mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}><ringGeometry args={[THRONE.R - 0.5, THRONE.R - 0.3, 6]} /><meshBasicMaterial color={solved ? '#6fe39a' : '#5ff0ff'} toneMapped={false} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((k) => { const [x, z] = padPos(k, THRONE.R); return (
        <group key={k} ref={(m) => (pads.current[k] = m)} position={[x, -0.62, z]}>
          <group scale={[0.8, 1, 0.8]}><Part model="fortress" name="f4_pad" /></group>
        </group>
      ) })}
      {BRIDGES4.map((b, i) => {
        const [x, z] = padPos(b.k, THRONE.R + 0.7), ang = Math.atan2(x, z)
        const L = LEDGE_R - THRONE.R - 0.7
        return (
          <group key={b.k} position={[x, 0, z]} rotation={[0, ang, 0]}>
            <group ref={(g) => (arms.current[i] = g)}>
              {/* a walkway of stone slabs, built pointing up (+y) from the hinge */}
              {[...Array(Math.ceil(L))].map((_, j) => <group key={j} position={[0, j + 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><Part model="fortress" name="f4_bridge" /></group>)}
              <mesh position={[0, L + 0.25, 0]}><sphereGeometry args={[0.35, 14, 10]} /><meshStandardMaterial color="#ff6fb3" emissive="#ff3a90" emissiveIntensity={0.7} /></mesh>
            </group>
          </group>
        )
      })}
      {/* the fixed causeway in from the south */}
      <Tag position={[0, 4.2, 0]} df={14}>The Chair Throne · G flips it</Tag>
    </group>
  )
}

// ---------------------------------------------------------------- 4-4 banquet tables (§4.7–4.8)
function BanquetTable({ t, flip, solved }) {
  const pos = TABLE_POS[t.id]
  const s = chairStrain(t.subs, flip)
  const subs = useMemo(() => t.subs.map((x) => ({ ...x, label: { methyl: 'CH₃', 'tert-butyl': 'C(CH₃)₃', chloro: 'Cl' }[x.kind], color: { methyl: '#ff6fb3', 'tert-butyl': '#d0508e', chloro: '#6fe39a' }[x.kind], size: x.kind === 'tert-butyl' ? 0.5 : 0.32 })), [t])
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[1.0, 1.3, 1.0, 6]} /><meshStandardMaterial color="#4a3a2a" roughness={0.8} /></mesh>
      <mesh position={[0, 1.02, 0]}><cylinderGeometry args={[2.2, 2.2, 0.08, 6]} /><meshStandardMaterial color="#6a5038" roughness={0.7} /></mesh>
      <ChairRing position={[0, 2.3, 0]} R={1.15} amp={0.28} atom={0.2} bond={0.06} len={0.75} flip={flip} subs={subs} />
      <Tag position={[0, 3.8, 0]} df={12} near={4.6} far={11}>{t.title}</Tag>
      <Tag position={[0, 3.3, 0]} df={10} near={4.6} far={11} className={solved ? 'ok-tag' : ''}>{solved ? `seated · ${s.total} kJ/mol${s.parts.length ? ' · ' + s.parts.join(' + ') : ''}` : `this chair: ${s.parts.length ? s.parts.map((x) => x.split(':')[0]).join(' · ') : 'nothing axial, no gauche pair'}`}</Tag>
    </group>
  )
}

// ---------------------------------------------------------------- 4-5 decalin altar (§4.9)
function DecalinAltar({ h, flip, shake }) {
  const prog = useFlipProgress(flip, 2)
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.position.x = shake > 0 ? Math.sin(clock.elapsedTime * 60) * 0.06 : 0 })
  // two chairs sharing one bond (the bridgeheads, at x = 0, z = ±R/2): ring A's carbons 1–2 are ring B's 5–4,
  // and their heights agree in either flip state
  const R = 1.0
  return (
    <group position={[DECALIN.pos[0], 0, DECALIN.pos[1]]}>
      <Part model="fortress" name="f4_altar" scale={[2.4, 1, 1.6]} />
      <group ref={g} position={[0, 1.9, 0]}>
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * R * 0.866, 0, 0]}>
            <ChairRing position={[0, 0, 0]} R={R} amp={0.25} atom={0.17} bond={0.05} len={0.5} flip={flip} showH={false} subs={[]} tags={false} carbon={decalinKind(h[0], h[1]) === 'trans' ? '#5a5670' : '#6a5a90'} />
          </group>
        ))}
        {/* the bridgehead hydrogens, gold on top or blue below */}
        {[0, 1].map((i) => (
          <group key={i} position={[0, (h[i] === 'top' ? 0.7 : -0.7) + (i ? 0.25 : -0.25), i ? 0.5 * R : -0.5 * R]}>
            <mesh><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color={h[i] === 'top' ? '#ffd760' : '#5ab0ff'} emissive={h[i] === 'top' ? '#a07a10' : '#1a5aa0'} emissiveIntensity={0.7} /></mesh>
            <Tag position={[0, h[i] === 'top' ? 0.45 : -0.45, 0]} df={8}>H</Tag>
          </group>
        ))}
      </group>
      <Tag position={[0, 4.6, 0]} df={12}>{`${decalinKind(h[0], h[1])}-Decalin`}</Tag>
    </group>
  )
}

/** A steroid's four fused rings carved on the wall: testosterone, three six-membered and one five-membered (§4.9, p. 124). */
function SteroidMural({ pos }) {
  const rings = [[-1.9, 0, 6], [-0.6, 0.75, 6], [0.7, 0, 6], [1.85, 0.7, 5]]
  return (
    <group position={pos} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.05]}><planeGeometry args={[6, 3.4]} /><meshStandardMaterial color="#3a364c" roughness={0.9} /></mesh>
      {rings.map(([x, y, n], i) => <mesh key={i} position={[x, y, 0]} rotation={[0, 0, n === 6 ? Math.PI / 6 : 0]}><torusGeometry args={[0.72, 0.06, 6, n]} /><meshStandardMaterial color="#dcdcea" emissive="#8a6aff" emissiveIntensity={0.5} /></mesh>)}
      <Tag position={[0, 2.1, 0.2]} df={11}>Testosterone: a steroid · three six-membered rings and one five (p. 124)</Tag>
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

function FortressLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [sachseHere, setSachseHere] = useState(false)
  const marks = save.t4marks || { '4-1a': {}, '4-1b': {} }
  const placed = save.t4placed || {}
  const [carry, setCarry] = useState(null)
  const carryRef = useRef(null)
  carryRef.current = carry
  const throneFlip = !!save.t4throne
  const tableFlip = { ...Object.fromEntries(TABLES.map((tb) => [tb.id, !!tb.start])), ...(save.t4tables || {}) }
  const decH = save.t4decalin || ['top', 'top']
  const decFlip = !!save.t4decFlip
  const [decShake, setDecShake] = useState(0)
  const flagstone = useFlagstones([5, 34])
  const bridgeFloors = useRef({})
  useEffect(() => { setState({ carrying: !!carry }) }, [carry])
  useEffect(() => () => setState({ carrying: false }), [])

  // ---- the map, Ocarina rules
  useEffect(() => {
    world.map = {
      floor: '#6a6680', wall: '#24202e', pit: '#100c18',
      labels: ROOMS4.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => {
        const sv = getState().save
        if (sv.solved['t4-map']) return null
        const seen = sv.t4seen || {}
        return ROOMS4.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]])
      },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t4-compass']) return null
        const g = GOALS4.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 4) return { pos: [0, -160], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Chair Hills' }
      },
    }
    return () => { world.map = null }
  }, [world])

  // ---- floors, triggers, interactables
  useEffect(() => {
    playMusic('fortress')
    world.killY = -6
    const PIT = [-66.5, -91.5] // the throne room: a chasm round the chair
    const f = [
      world.addFloor(-W, PIT[0], W, 8, 0), world.addFloor(-W, -140, W, PIT[1], 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -140, 0),
      // the throne's own floor (a hexagon, approximated by a square and its corners) and the fixed causeway
      world.addFloor(TC[0] - 4.6, TC[1] - 4.6, TC[0] + 4.6, TC[1] + 4.6, 0),
      world.addFloor(-1.2, TC[1] + 4.0, 1.2, PIT[0] + 0.1, 0),
    ]
    // ledges at the end of each bridge, and the walkways themselves (enabled while equatorial)
    BRIDGES4.forEach((b) => {
      const [lx, lz] = padPos(b.k, LEDGE_R)
      f.push(world.addFloor(TC[0] + lx - 1.8, TC[1] + lz - 1.8, TC[0] + lx + 1.8, TC[1] + lz + 1.8, 0))
      if (b.lever) { const [ox, oz] = padPos(b.k, LEDGE_R + 2.0); f.push(world.addSolid([TC[0] + ox - 1.8, 0, TC[1] + oz - 1.8], [TC[0] + ox + 1.8, 1.2, TC[1] + oz + 1.8])) } // the curb beyond
      const tiles = []
      for (let r = THRONE.R + 0.4; r <= LEDGE_R - 0.8; r += 0.5) { const [x, z] = padPos(b.k, r); tiles.push(world.addFloor(TC[0] + x - 0.9, TC[1] + z - 0.9, TC[0] + x + 0.9, TC[1] + z + 0.9, 0)) }
      tiles.forEach((id) => world.setEnabled(id, !isAxial(b.k, 'top', !!getState().save.t4throne)))
      bridgeFloors.current[b.k] = tiles
      f.push(...tiles)
    })
    // the exit ledge (north) runs on to the gate
    { const [lx, lz] = padPos(0, LEDGE_R); f.push(world.addFloor(-2, PIT[1] - 0.1, 2, TC[1] + lz + 1.0, 0)) }
    const HINTS = {
      '4-1': 'Ring altars! Hit a post to put a methyl on top or below.',
      '4-2': 'Four ring crystals and four strain plinths. Which ring is the strained one?',
      '4-3': 'The whole floor is a chair! Those pillars… and that big chest.',
      '4-4': 'Tables seated with groups. Flip each one (G) and weigh both chairs.',
      '4-5': 'Two rings fused into one. Decalin! Will it flip?',
    }
    const t = ROOMS4.map((r) => world.addTrigger([-ARENA.x, -2, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t4seen || {}
      saveGame({ checkpoint: { scene: 'fortress', room: r.id }, t4seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -153], [6, 6, -146], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t4-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the decree', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Chair Hills', onInteract: () => onExit('hills', { scene: 'hills', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -60.8], radius: 2.2, label: () => (has('t4-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -139], radius: 2.4, label: () => (has('t4-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlockBossDoor() }),
    ]
    // 4-1: the banner posts and the present-it plates
    ALTARS.forEach((al) => {
      for (let k = 0; k < al.n; k++) {
        const a = (k / al.n) * Math.PI * 2, x = al.pos[0] + Math.sin(a) * al.r, z = al.pos[1] - Math.cos(a) * al.r
        ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.0, label: () => (has(al.id) || (al.needs && !has(al.needs)) ? null : `Carbon post: ${({ undefined: 'add a methyl on top', top: 'move it below', bottom: 'take it off' })[(getState().save.t4marks || {})[al.id]?.[k]]}`), onInteract: () => cyclePost(al, k) }))
      }
      ia.push(world.addInteractable({ pos: [al.pos[0], 0, al.pos[1] + al.r + 1.6], radius: 1.4, label: () => (has(al.id) || (al.needs && !has(al.needs)) ? null : `Present it: ${al.name}`), onInteract: () => presentAltar(al) }))
    })
    // 4-2: crystals and plinths
    CRYSTALS.forEach((c) => ia.push(world.addInteractable({
      pos: [c.pos[0], 0, c.pos[1]], radius: 1.8,
      label: () => ((getState().save.t4placed || {})[c.n] !== undefined || carryRef.current ? null : `Pick up the ${RING_STRAIN.find((x) => x.n === c.n).name} crystal`),
      onInteract: () => { if ((getState().save.t4placed || {})[c.n] !== undefined || carryRef.current) return; setCarry(c.n); sfx('pickup') },
    })))
    PLINTHS.forEach((pl) => ia.push(world.addInteractable({
      pos: [pl.pos[0], 0, pl.pos[1]], radius: 1.4,
      label: () => (carryRef.current ? `Set it on the “${PLINTH_NAME[pl.strain]}” plinth` : null),
      onInteract: () => placeCrystal(pl),
    })))
    // 4-3: levers on the ledges
    BRIDGES4.filter((b) => b.lever).forEach((b) => {
      const [lx, lz] = padPos(b.k, LEDGE_R + 0.8)
      ia.push(world.addInteractable({ pos: [TC[0] + lx, 0, TC[1] + lz], radius: 1.6, label: () => (has(b.lever) ? null : 'Pull the lever'), onInteract: () => pullLever(b.lever) }))
    })
    // 4-5: two pedestals, cis- and trans-decalin; set one on the altar
    ;[['cis', -3.4], ['trans', 3.4]].forEach(([kind, x]) => ia.push(world.addInteractable({ pos: [DECALIN.pos[0] + x, 0, DECALIN.pos[1] + 1.2], radius: 1.4, label: () => (has('4-5') ? null : `Set ${kind}-decalin on the altar`), onInteract: () => setDecalin(kind) })))
    const ts = world.addSolid([4.4, 0, -9.4], [5.6, 1.6, -8.6])
    const altarS = ALTARS.map((al) => world.addSolid([al.pos[0] - 0.9, 0, al.pos[1] - 0.9], [al.pos[0] + 0.9, 3, al.pos[1] + 0.9]))
    const tableS = Object.values(TABLE_POS).map(([x, z]) => world.addSolid([x - 1.4, 0, z - 1.4], [x + 1.4, 1.1, z + 1.4]))
    const decS = world.addSolid([DECALIN.pos[0] - 1.6, 0, DECALIN.pos[1] - 1.0], [DECALIN.pos[0] + 1.6, 2.5, DECALIN.pos[1] + 1.0])
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS4.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ts, ...altarS, ...tableS, decS].forEach((i) => world.remove(i)) }
  }, [world])

  // the bridges follow the throne's flip state
  useEffect(() => { BRIDGES4.forEach((b) => (bridgeFloors.current[b.k] || []).forEach((id) => world.setEnabled(id, !isAxial(b.k, 'top', throneFlip)))) }, [throneFlip])

  // ---- G targets: the throne, the tables, the decalin
  useEffect(() => {
    const ids = []
    ids.push(world.addLantern({
      needs: 'hasGauntlet', pos: [TC[0], 0, TC[1]], radius: 4.4, omni: true,
      label: () => 'Ring-flip the throne',
      onLantern: () => {
        const p = world.player
        if (p && Math.hypot(p.pos.x - TC[0], p.pos.z - TC[1]) > THRONE.R + 0.6) { toast('Stand on the throne itself to flip it.', 'warn', 2400); return }
        const next = !getState().save.t4throne
        saveGame({ t4throne: next }); sfx('stomp'); world.shake = 0.3
        if (!getState().save.t4flipTold) { saveGame({ t4flipTold: true }); setTimeout(() => toast('Every axial pillar swung down to equatorial, and every equatorial walkway swung up to axial. Nothing changed face: top is still top.', 'good', 5600), 900) }
      },
    }))
    TABLES.forEach((tb) => ids.push(world.addInteractable({
      pos: [TABLE_POS[tb.id][0], 0, TABLE_POS[tb.id][1] + 2.2], radius: 1.6,
      label: () => (has(tb.id) ? null : `Seat the guests in this chair: ${tb.title}`), onInteract: () => seatTable(tb),
    })))
    TABLES.forEach((tb) => ids.push(world.addLantern({
      needs: 'hasGauntlet', pos: [TABLE_POS[tb.id][0], 0, TABLE_POS[tb.id][1]], radius: 4,
      label: () => (has(tb.id) ? null : `Ring-flip the table: ${tb.title}`),
      onLantern: () => flipTable(tb),
    })))
    ids.push(world.addLantern({
      needs: 'hasGauntlet', pos: [DECALIN.pos[0], 0, DECALIN.pos[1]], radius: 4.2,
      label: () => (has('4-5') ? null : 'Ring-flip the decalin'),
      onLantern: () => flipDecalin(),
    }))
    return () => ids.forEach((id) => world.remove(id))
  }, [world])

  // ---------------------------------------------------------------- actions
  const cyclePost = (al, k) => {
    if (has(al.id) || (al.needs && !has(al.needs))) return
    const all = { ...(getState().save.t4marks || {}) }
    const m = { ...(all[al.id] || {}) }
    m[k] = m[k] === undefined ? 'top' : m[k] === 'top' ? 'bottom' : undefined
    if (m[k] === undefined) delete m[k]
    all[al.id] = m
    saveGame({ t4marks: all }); sfx('pickup')
  }
  const presentAltar = async (al) => {
    if (has(al.id) || busy.current) return
    const m = (getState().save.t4marks || {})[al.id] || {}
    const r = judgeCisTrans(al.n, m, al.want)
    if (!r.ok) { sfx('wrong'); toast(r.why, 'warn', 5200); return }
    markSolved(al.id); sfx('open')
    if (al.id === '4-1a') setTimeout(() => say([{ who: 'Pi', text: 'Both methyls on top: cis! Flat cyclopropane can\'t twist one round. That\'s a different compound from trans.' }]), 300)
    else setTimeout(() => say([
      { who: 'Pi', text: 'One up, one down, two carbons apart: trans-1,3! The gate rolled open.' },
      { who: 'Pi', text: 'Same atoms, same bonds, different faces: stereoisomers. They’ll never swap!' },
    ]), 300)
  }
  const placeCrystal = (pl) => {
    const n = carryRef.current
    if (!n) return
    const info = RING_STRAIN.find((x) => x.n === n)
    if (info.strain !== pl.strain) { sfx('wrong'); setCarry(null); toast(`Not that plinth. ${info.name[0].toUpperCase() + info.name.slice(1)}: ${info.why[0].toLowerCase() + info.why.slice(1)}`, 'warn', 8000); return }
    const next = { ...(getState().save.t4placed || {}), [n]: pl.strain }
    saveGame({ t4placed: next }); setCarry(null); sfx('right')
    if (Object.keys(next).length === 4) {
      markSolved('4-2'); sfx('open')
      setTimeout(() => say([
        { who: 'Pi', text: 'Three is strained, four nearly as bad, five a little, six none at all!' },
        { who: 'Pi', text: 'Flat, cyclohexane would be 120°. It puckers into a chair instead: 111.5°, nothing eclipsed. So much for "rings are flat."' },
        { who: 'Pi', text: 'A little chest opened by the door. The key!' },
      ]), 300)
    }
  }
  const pullLever = (id) => {
    if (has(id)) return
    if (id === '4-3b' && !has('4-3a')) { sfx('wrong'); toast('Rusted fast. Something on another ledge has to move first.', 'warn', 3600); return }
    markSolved(id); sfx('open')
    const both = ['4-3a', '4-3b'].every((x) => x === id || has(x))
    if (both) { markSolved('4-3'); setTimeout(() => toast('Both levers down: the north gate lifts! The north bridge reaches it when it\'s equatorial.', 'good', 4600), 300) }
    else toast('A lever down. Another one somewhere on the far ledges.', 'info', 3200)
  }
  const flipTable = (tb) => {
    if (has(tb.id)) return
    const all = getState().save.t4tables || {}
    const cur = all[tb.id] !== undefined ? all[tb.id] : !!tb.start
    saveGame({ t4tables: { ...all, [tb.id]: !cur }, t4seenBoth: { ...(getState().save.t4seenBoth || {}), [tb.id]: true } }); sfx('stomp')
  }
  const seatTable = (tb) => {
    if (has(tb.id)) return
    const all = getState().save.t4tables || {}
    const cur = all[tb.id] !== undefined ? all[tb.id] : !!tb.start
    const here = chairStrain(tb.subs, cur), best = bestFlip(tb.subs)
    if (!(getState().save.t4seenBoth || {})[tb.id]) { sfx('wrong'); toast('Lady Sachse’s rule: compare both chairs before you seat anyone. Flip it (G) and look.', 'warn', 4200); return }
    if (best === null || best === cur) {
      markSolved(tb.id); sfx('open')
      const opens = DOOR_NEEDS[tb.id === '4-4d' ? '4-4a' : tb.id]?.every((x) => x === tb.id || has(x))
      toast(tb.done + (opens ? ' A door rolls open.' : ''), 'good', 7200)
    } else { sfx('hurt'); setState({ hp: Math.max(1, getState().hp - 1) }); toast(`A plate flies! ${here.total} kJ/mol in this chair (${here.parts.join(' + ')}). That isn’t the better one.`, 'warn', 5200) }
  }
  const setDecalin = (kind) => {
    if (has('4-5')) return
    saveGame({ t4decalin: kind === 'cis' ? ['top', 'top'] : ['top', 'bottom'], t4decFlip: false }); sfx('pickup')
    toast(`${kind}-Decalin on the altar: bridgehead H ${kind === 'cis' ? 'on the same face' : 'on opposite faces'}.`, 'info', 3200)
  }
  const flipDecalin = async () => {
    if (has('4-5') || busy.current) return
    const sv = getState().save
    const h = sv.t4decalin || ['top', 'top']
    const kind = decalinKind(h[0], h[1])
    const pred = sv.t4pred || {}
    if (!pred[kind]) {
      busy.current = true
      const ok = await openPanel('decalinPredict', { kind })
      busy.current = false
      if (!ok) return
      saveGame({ t4pred: { ...pred, [kind]: true } })
    }
    if (kind === 'cis') {
      saveGame({ t4decFlip: !getState().save.t4decFlip }); sfx('stomp')
      toast('cis-Decalin flips: both rings at once.', 'good', 3200)
    } else {
      sfx('wrong'); setDecShake(1.2); setTimeout(() => setDecShake(0), 1200)
      toast('trans-Decalin holds: it can’t ring-flip.', 'warn', 3200)
    }
    const now = getState().save.t4pred || {}
    if (now.cis && now.trans && !has('4-5')) {
      markSolved('4-5'); sfx('open')
      setTimeout(() => say([
        { who: 'Pi', text: 'cis flips, trans holds tight. And neither ever turns into the other!' },
        { who: 'Pi', text: 'The big chest is open!' },
      ]), 700)
    }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's decree", text: 'BY ORDER OF MALRADIX: Rings are flat. So small rings and big rings must all be strained. Every ring is a cage.' },
      { who: 'Pi', text: 'Lady Sachse sits on a ring all day and looks perfectly comfortable.' },
      { who: 'Pi', text: 'Map and Compass first, like always.' },
    ])
    markSolved('t4-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t4-door')) return
    if (!getState().save.t4key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t4key: false }); markSolved('t4-door'); sfx('open')
    toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t4-bossdoor')) return
    if (!has('t4-bosskey')) { toast('A great lock shaped like a six-pointed seat. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t4-bossdoor'); sfx('open')
    toast('The Boss Key turns. Something enormous shifts its weight…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id)
    sfx('shard')
    if (id === 't4-map') await say([{ who: '', text: 'You got the Dungeon Map!' }, { who: 'Pi', text: 'Press M. The fortress, every hall.' }])
    if (id === 't4-compass') await say([{ who: '', text: 'You got the Compass!' }, { who: 'Pi', text: 'The gold star is back on the map.' }])
    if (id === 't4-key') { saveGame({ t4key: true }); await say([{ who: '', text: 'You got a Small Key!' }, { who: 'Pi', text: 'For the door at the end of the towers.' }]) }
    if (id === 't4-gauntlet') {
      saveGame({ hasGauntlet: true })
      await itemGet(world, { model: 'fortress', name: 'f4_gauntlet', scale: 1.4, color: '#7ae8ff' }, [
        { who: '', text: 'You got the Ring-Flip Gauntlet!' },
        { who: 'Pi', text: 'Aim at a chair and press G: it ring-flips. Every axial seat goes equatorial, every equatorial goes axial.' },
        { who: 'Pi', text: 'The whole floor here is a chair. Stand on the throne and try it!' },
      ])
    }
    if (id === 't4-bosskey') { saveGame({ t4bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }, { who: 'Pi', text: 'The Titan\'s door is right ahead.' }]) }
    busy.current = false
  }

  // ---- boss
  const startBoss = async () => {
    if (has('boss4') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -148]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 1200))
    if (!getState().save.t4bossIntro) {
      saveGame({ t4bossIntro: true })
      // frame the Titan from just inside the door, a little high
      const tp = world.bossFocus
      world.camOverride = { pos: [3.5, 4.4, -147], look: tp ? [tp[0], 3.2, tp[2]] : [TITAN.center[0], 3.2, TITAN.center[2]] }
      await say([
        { who: 'Pi', text: 'The tert-Butyl Titan! Three CH₃ boulders on one carbon. Huge!' },
        { who: 'Pi', text: 'And the violet spark, in its chest. Malradix’s again!' },
        { who: 'Pi', text: 'The floor is a chair. On a lowered carbon its bond tips out round the equator. Comfortable. Nothing hurts it.' },
        { who: 'Pi', text: 'Flip the arena (G)! Its seat rises axial, into those glowing H. Then strike!' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Again! Flip it axial, then strike. Mind its fist.' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss4')
    playMusic('fortress')
    await say([
      { who: 'Pi', text: 'It sat axial and the whole ring pushed back! Too big for an axial seat.' },
      { who: 'Pi', text: 'There goes the spark, east, toward the lake! And look: the shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 4 || busy.current) return
    busy.current = true
    sfx('shard')
    // Lady Sachse arrives on screen beside the shard: a two-shot of the pair
    setSachseHere(true)
    if (world.player) world.player.teleport([0, 0, -157.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, SACHSE_AT, 3.8, Math.PI / 2)
    await say([{ who: 'Lady Sachse', text: 'Before you take it, Sir Kai. One question. Indulge me.' }])
    const ok = await openPanel('titanCheck', {})
    if (!ok) { await say([{ who: 'Lady Sachse', text: 'Consider it. The shard will wait; it has nowhere to sit.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 4, checkpoint: { scene: 'hills', at: 'gate' } })
    setState({ objective: 'Bond Shard 4 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai\'s hands…' },
      { who: 'Princess Octavia', text: 'Kai… four shards. I can see light through the keep\'s windows now.' },
      { who: 'Princess Octavia', text: 'He swore rings were cages. You found the one shape that strains nothing.' },
      { who: 'Princess Octavia', text: 'He felt this one break, too. He’s gone to the Mirror Lake.' },
      { who: 'Lady Sachse', text: 'My throne room is mine again. Keep the Gauntlet. Sister Tartara keeps the Mirror Lake. Tell her I sent you.' },
      { who: 'Pi', text: 'Four down, eight to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'hills', at: 'gate' }, card: 4 })
    busy.current = false
    onExit('hills', { scene: 'hills', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -160], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss4 && (getState().save.shards || 0) < 4)
    tick()
    const t = setInterval(tick, 300)
    return () => { clearInterval(t); world.remove(id) }
  }, [world])
  useFrame(() => {
    world.camBoost = world.bossCam ? { dist: 5.5, pitchSet: 0.24, lookY: 2.2 } : null
  })

  return (
    <group>
      <color attach="background" args={['#120e1c']} />
      <fog attach="fog" args={['#1a1428', 16, 70]} />
      <hemisphereLight args={['#c8b8ff', '#1a1428', 0.75]} />
      <ambientLight intensity={0.3} color="#d8ccff" />
      <directionalLight position={[10, 40, -60]} intensity={0.9} color="#e8dcff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      {/* floors: flagstones, with the throne room's chasm */}
      <mesh position={[0, -0.01, (8 - 66.5) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, 74.5]} /><meshStandardMaterial map={flagstone} roughness={0.9} /></mesh>
      <mesh position={[0, -0.01, (-91.5 - 140) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, 48.5]} /><meshStandardMaterial map={flagstone} roughness={0.9} /></mesh>
      <mesh position={[0, -0.01, -159]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 38]} /><meshStandardMaterial color="#3a364c" roughness={0.9} /></mesh>
      <mesh position={[0, -4, -79]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, 26]} /><meshBasicMaterial color="#05030a" /></mesh>
      <Suspense fallback={null}><Halls world={world} /></Suspense>
      {[2, -12, -26, -40, -54, -100, -114, -128].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#c8a8ff" />))}
      {[-8, -34, -50, -110].flatMap((z) => [-1, 1].map((sd) => <Banner key={'bn' + z + sd} pos={[sd * (W - 0.05), 4.6, z]} rotY={sd > 0 ? -Math.PI / 2 : Math.PI / 2} />))}

      {/* ---- entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3644" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's decree</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t4-map']} onOpen={() => openChest('t4-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Chair Fortress</Tag>

      {/* ---- 4-1 Gate of Two Faces */}
      {ALTARS.map((al) => <RingAltar key={al.id} altar={al} marks={marks[al.id] || {}} solved={!!solved[al.id]} />)}
      <Gate world={world} pos={[0, 0, -38]} size={[2 * W, 7, 0.8]} open={!!solved['4-1b']} color={STONE} glow="#c8a8ff" />
      <Tag position={[0, 7.8, -37.6]} df={13}>{solved['4-1b'] ? 'open' : 'Gate of Two Faces · set both altars'}</Tag>

      {/* ---- 4-2 Strain Towers */}
      {CRYSTALS.map((c) => <group key={'ped' + c.n} position={[c.pos[0], 0, c.pos[1]]}><Part model="fortress" name="f4_altar" /></group>)}
      {PLINTHS.map((pl) => (
        <group key={pl.strain} position={[pl.pos[0], 0, pl.pos[1]]}>
          <mesh position={[0, plinthTop(pl.strain) / 2, 0]} castShadow><boxGeometry args={[1.4, plinthTop(pl.strain), 1.4]} /><meshStandardMaterial color="#5e5a78" roughness={0.8} /></mesh>
          <Tag position={[0, 0.9, 0.9]} df={10}>{Object.values(placed).includes(pl.strain) ? `${PLINTH_NAME[pl.strain]} · ${pl.strain} kJ/mol` : PLINTH_NAME[pl.strain]}</Tag>
        </group>
      ))}
      {CRYSTALS.map((c) => <RingCrystal key={c.n} n={c.n} world={world} home={c.pos} carried={carry === c.n} placedAt={placed[c.n] !== undefined ? PLINTHS.find((p) => p.strain === placed[c.n]).pos : null} placedStrain={placed[c.n]} />)}
      <Chest world={world} pos={[-7.6, 0, -40]} rotY={Math.PI / 2} opened={!!solved['t4-compass']} onOpen={() => openChest('t4-compass')} />
      <Chest world={world} pos={[0, 0, -59]} opened={!!solved['t4-key']} show={!!solved['4-2']} onOpen={() => openChest('t4-key')} label="Open the small chest" />
      <ImpPack world={world} spawns={[[-7, -45], [7, -50]]} active />
      <Gate world={world} pos={[0, 0, -62]} size={[2 * W, 7, 0.8]} open={!!solved['t4-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -61.6]} df={13}>{solved['t4-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* ---- 4-3 Chair Throne Room */}
      <Chest world={world} pos={[2.4, 0, -64.5]} big opened={!!solved['t4-gauntlet']} onOpen={() => openChest('t4-gauntlet')} label="Open the big chest" />
      <mesh position={[0, -0.2, (TC[1] + 4.0 - 66.5) / 2]} receiveShadow><boxGeometry args={[2.4, 0.4, Math.abs(TC[1] + 4.0 + 66.5)]} /><meshStandardMaterial color="#6e6a86" roughness={0.8} /></mesh>
      <ThroneChair flip={throneFlip} solved={!!solved['4-3']} />
      {BRIDGES4.map((b) => { const [lx, lz] = padPos(b.k, LEDGE_R); return (
        <group key={'ledge' + b.k} position={[TC[0] + lx, 0, TC[1] + lz]}>
          <mesh position={[0, -1.6, 0]} receiveShadow><boxGeometry args={[3.6, 3.2, 3.6]} /><meshStandardMaterial color="#5e5a78" roughness={0.85} /></mesh>
          {b.lever && <mesh position={[(lx / LEDGE_R) * 2.0, 0.6, (lz / LEDGE_R) * 2.0]}><boxGeometry args={[3.6, 1.2, 3.6]} /><meshStandardMaterial color="#6e6a86" roughness={0.85} /></mesh>}
          {b.lever && (
            <group position={[Math.sign(lx) * 0.6, 0, Math.sign(lz) * 0.6]}>
              <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.5, 1.0, 0.5]} /><meshStandardMaterial color="#3a3650" /></mesh>
              <mesh position={[0, 1.2, 0]} rotation={[solved[b.lever] ? 0.9 : -0.9, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 1.2, 6]} /><meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} /></mesh>
              <pointLight position={[0, 2, 0]} color={solved[b.lever] ? '#6fe39a' : '#ff6a5a'} intensity={2.5} distance={5} />
            </group>
          )}
        </group>
      ) })}
      <mesh position={[0, -0.2, (-91.5 + TC[1] + padPos(0, LEDGE_R)[1] + 1) / 2]} receiveShadow><boxGeometry args={[4, 0.4, Math.abs(-91.5 - (TC[1] + padPos(0, LEDGE_R)[1] + 1))]} /><meshStandardMaterial color="#6e6a86" roughness={0.8} /></mesh>
      <Gate world={world} pos={[0, 0, -96]} size={[2 * W, 7, 0.8]} open={!!solved['4-3']} color={STONE} glow="#5ff0ff" />
      <Tag position={[0, 7.8, -95.6]} df={13}>{solved['4-3'] ? 'open' : 'two levers lift this gate'}</Tag>

      {/* ---- 4-4 Crowded Banquet */}
      {TABLES.map((tb) => <BanquetTable key={tb.id} t={tb} flip={!!tableFlip[tb.id]} solved={!!solved[tb.id]} />)}
      {Object.keys(TABLE_DOORS).map((id) => <Gate key={'g' + id} world={world} pos={[0, 0, TABLE_DOORS[id]]} size={[2 * W, 4, 0.6]} open={DOOR_NEEDS[id].every((x) => !!solved[x])} color={STONE} glow="#ffd760" />)}
      <AxialOgres world={world} spawns={[[0, -107.5], [-5, -110]]} startAxial={[false, true]} active={!!save.hasGauntlet} zone={[-111.5, -104]} />

      {/* ---- 4-5 Fused Keep */}
      <DecalinAltar h={decH} flip={decFlip} shake={decShake} />
      {[['cis', -3.4], ['trans', 3.4]].map(([kind, x]) => (
        <group key={kind} position={[DECALIN.pos[0] + x, 0, DECALIN.pos[1] + 1.2]}>
          <Part model="fortress" name="f4_altar" scale={[0.7, 0.75, 0.7]} />
          <mesh position={[0, 1.6, 0]}><octahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color={kind === 'cis' ? '#b8a0ff' : '#8a86a0'} emissive={kind === 'cis' ? '#6a4aff' : '#4a4660'} emissiveIntensity={0.7} /></mesh>
          <Tag position={[0, 2.3, 0]} df={9}>{kind}-decalin</Tag>
        </group>
      ))}
      <SteroidMural pos={[-W + 0.2, 3.6, -131]} />
      <AxialOgres world={world} spawns={[[6, -128]]} active={!!solved['4-4c']} zone={[-138, -125]} />
      <Chest world={world} pos={[0, 0, -136]} big opened={!!solved['t4-bosskey']} show={!!solved['4-5']} onOpen={() => openChest('t4-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -140]} size={[2 * W, 7, 0.8]} open={!!solved['t4-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS4).map(([id, st]) => (
        <Station key={id} world={world} pos={st.pos} label={st.label} enabled solved={!!solved[id]} onUse={async () => { const ok = await openPanel(st.panel, st.props); if (ok) markSolved(id) }} />
      ))}

      {/* ---- boss arena */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = ((k + 0.5) / 8) * Math.PI * 2; return <Torch key={'b' + k} pos={[Math.cos(a) * 12.4, 0, TITAN.center[2] + Math.sin(a) * 15.5]} color="#c8a8ff" /> })}
      <Titan world={world} center={TITAN.center} active={bossOn && !solved.boss4} onDefeated={bossDown} />
      <Shard show={!!solved.boss4 && (save.shards || 0) < 4} pos={TITAN.center} />
      <Motes count={180} area={[20, 7, 180]} center={[0, 0.3, -85]} color="#d8c8ff" size={0.06} />
      {sachseHere && <Sachse position={SACHSE_AT} rotation={[0, Math.PI / 2, 0]} />}
      <PiFollower world={world} />
    </group>
  )
}

export default function Fortress({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'fortress' ? ROOMS4.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#120e1c" camDist={6.2}>
      {(world) => <FortressLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
