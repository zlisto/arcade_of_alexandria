import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Mimic, { Lindlar, Vipers } from '../actors/SpireFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { WELLS, REDUCE, HALIDES, SUMMIT, SUMMIT_ORDER, SUMMIT_FLASKS, SUMMIT_WHY, BRIDGE_BASES, shown, shuffled } from '../chem/rules9'
import { W9 as W, ROOMS9, STATIONS9, GAP9, WELLS9, REDUCE9, STAIR9, SUMMIT9, GOALS9, MIMIC } from '../data/dungeon9'

// Dungeon 9 — The Triple Spire (Chapter 9, Alkynes: An Introduction to Organic Synthesis). Rooms along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Retrosynthesis Map in a big chest, a Boss Key.
// Puzzles: raise triple bridges by two eliminations (§9.2); hydrate an alkyne two ways (§9.4); reduce it three ways
// (§9.5); a pKa ladder and an acetylide stair (§9.7–9.8); plan a synthesis backward, then run it (§9.9).

preloadModels('spire', 'lindlar')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-130, -170] }
const SEGS = 3
const segZ = (k) => { const L = (GAP9.z[0] - GAP9.z[1]) / SEGS; return [GAP9.z[0] - k * L, GAP9.z[0] - (k + 1) * L] }
const stand = (base, list) => list.map((id, i) => [id, base[0] + (i % 2) * 1.6, base[1] - Math.floor(i / 2) * 1.8 - (i % 2) * 0.9])
const BASE_STAND = [3.2, -14.6]
/** every stand, the halide crates and the summit flasks are laid out afresh per visit, so no answer sits in a fixed place */
const layout = () => ({
  base: stand(BASE_STAND, shuffled(BRIDGE_BASES.map((b) => 'b_' + b.id))),
  wells: stand(WELLS9.stand, shuffled(['hg', 'bh3', 'h2'])),
  red: stand(REDUCE9.stand, shuffled(['pd', 'lindlar', 'li'])),
  summit: shuffled(Object.keys(SUMMIT_FLASKS)).map((k, i) => ['s_' + k, SUMMIT9.flasks[i][0], SUMMIT9.flasks[i][1]]),
  halides: shuffled(STAIR9.halides),
})
const LQ_LIN = [-1.1, 0, -160.5], LQ_KAI = [1.3, 0, -160.5] // Lindlar's question: either side of the shard (z -164)
const readMs = (t) => Math.max(3200, Math.round((t.split(/\s+/).length / 3.5) * 1000) + 800)
const FL_NAMES = { ...Object.fromEntries(BRIDGE_BASES.map((b) => ['b_' + b.id, b.name])), hg: WELLS.routes.hg.name, bh3: WELLS.routes.bh3.name, h2: 'H₂, Pd/C', pd: REDUCE.routes.pd.name, lindlar: REDUCE.routes.lindlar.name, li: REDUCE.routes.li.name, ...Object.fromEntries(Object.entries(SUMMIT_FLASKS).map(([k, v]) => ['s_' + k, v])) }
// one neutral altar glow, a pale white-blue that matches no flask, so no altar points at its answer by colour
const ALTAR_GLOW = '#c4e2ff'
const FL_COLOR = { b_koh: '#f0f0f8', b_nanh2: '#7ae8ff', b_nahco3: '#f8f0d0', b_h2o: '#8ab8ff', hg: '#c8c8d8', bh3: '#8ad0ff', h2: '#e8e8e8', pd: '#a0a0a8', lindlar: '#9af0c0', li: '#e8d0ff', s_nanh2: '#7ae8ff', s_mei: '#ffb07a', s_lindlar: '#9af0c0', s_li: '#e8d0ff', s_etbr: '#ffd08a' }

function Walls({ world }) {
  const parts = useModelParts('spire')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -128; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -132; z > -168; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    for (let x = -12; x <= 12; x += 4) out.push([x, 0, ARENA.z[1], 1, -Math.PI / 2]) // the arena's back wall, facing +z
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -130], [-W, 9, 8]), world.addSolid([W, -9, -130], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -131], [-W, 9, -129]), world.addSolid([W, -9, -131], [ARENA.x, 9, -129]),
      ...[WELLS9['9-2a'], WELLS9['9-2b'], REDUCE9['9-3a'], REDUCE9['9-3b'], SUMMIT9.altar].map(([x, z]) => world.addSolid([x - 0.9, 0, z - 0.9], [x + 0.9, 1.0, z + 0.9])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="s9_wall" items={items} />
}

function Carried({ world, label, color }) {
  const g = useRef()
  // to Kai's side, not behind his head (Presentation #7)
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x + 0.6, world.player.pos.y + 2.0 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!label) return null
  return (
    <group ref={g}>
      <mesh><cylinderGeometry args={[0.12, 0.12, 0.42, 12]} /><meshStandardMaterial color="#e8f8f4" transparent opacity={0.5} /></mesh>
      <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.28, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} /></mesh>
      <pointLight color={color} intensity={1.4} distance={3.5} />
      <Tag position={[0, 0.55, 0]} df={9}>{label}</Tag>
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

// ---------------------------------------------------------------- dressing (Presentation round 1: no bare primitives)
const STONE = '#6a6e78', STONE_D = '#4a4e58', BRASS = '#b0905a', IRON = '#2e3036'
/** flagstones: an instanced grid of slightly varied slabs in running bond over a dark grout plane */
function Flagstones({ x0, x1, z0, z1, size = 2, base = '#8a8e96', seed = 7 }) {
  const ref = useRef()
  const cells = useMemo(() => {
    let s = seed
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const out = []
    let row = 0
    for (let z = z0 - size / 2; z > z1; z -= size, row++) {
      for (let x = x0 - (row % 2 ? size / 2 : 0); x < x1; x += size) {
        const lo = Math.max(x, x0), hi = Math.min(x + size, x1)
        if (hi - lo > 0.2) out.push([(lo + hi) / 2, z, hi - lo, 0.86 + rnd() * 0.22, (rnd() - 0.5) * 0.03, rnd() * 0.015])
      }
    }
    return out
  }, [x0, x1, z0, z1, size, seed])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D(), c = new THREE.Color(base), tmp = new THREE.Color()
    cells.forEach(([x, z, w, k, r, h], i) => {
      d.position.set(x, -0.02 + h, z); d.rotation.set(0, r, 0); d.scale.set(w - 0.08, 1, size - 0.08); d.updateMatrix()
      m.setMatrixAt(i, d.matrix); m.setColorAt(i, tmp.copy(c).multiplyScalar(k))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [cells, base, size])
  return <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} receiveShadow><boxGeometry args={[1, 0.04, 1]} /><meshStandardMaterial roughness={0.92} /></instancedMesh>
}

/** a small carved plinth (top at h): footing, octagonal shaft with a brass band, moulded cap */
function Plinth({ r = 0.3, h = 0.86 }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow><boxGeometry args={[r * 2.6, 0.12, r * 2.6]} /><meshStandardMaterial color={STONE_D} roughness={0.9} /></mesh>
      <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[r * 1.15, r * 1.25, 0.08, 8]} /><meshStandardMaterial color={STONE} roughness={0.9} flatShading /></mesh>
      <mesh position={[0, h / 2 + 0.02, 0]} castShadow><cylinderGeometry args={[r * 0.82, r, h - 0.32, 8]} /><meshStandardMaterial color={STONE} roughness={0.85} flatShading /></mesh>
      <mesh position={[0, h * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r * 0.9, 0.025, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, h - 0.11, 0]}><cylinderGeometry args={[r * 1.05, r * 0.85, 0.1, 8]} /><meshStandardMaterial color={STONE} flatShading /></mesh>
      <mesh position={[0, h - 0.03, 0]} castShadow><cylinderGeometry args={[r * 1.25, r * 1.2, 0.06, 8]} /><meshStandardMaterial color="#7e828c" flatShading /></mesh>
    </group>
  )
}

/** a brazier on three legs: bowl, coals and an additive flame (no light of its own unless asked) */
function Brazier({ pos, color = '#7ae8ff', h = 1.1, light = false }) {
  const fl = useRef()
  useFrame(({ clock }) => { if (fl.current) fl.current.scale.y = 1 + Math.sin(clock.elapsedTime * 11 + pos[0] * 3 + pos[2]) * 0.15 })
  return (
    <group position={pos}>
      {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[Math.sin(a) * 0.14, h / 2, Math.cos(a) * 0.14]} rotation={[Math.cos(a) * 0.18, 0, -Math.sin(a) * 0.18]}><cylinderGeometry args={[0.025, 0.03, h, 5]} /><meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} /></mesh> })}
      <mesh position={[0, h, 0]}><cylinderGeometry args={[0.26, 0.12, 0.2, 10]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.45} /></mesh>
      <mesh position={[0, h + 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.26, 0.025, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh ref={fl} position={[0, h + 0.3, 0]}><coneGeometry args={[0.15, 0.45, 8]} /><meshBasicMaterial color={color} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[0, h + 0.18, 0]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      {light && <pointLight position={[0, h + 0.5, 0]} color={color} intensity={1.6} distance={5} />}
    </group>
  )
}

/** a reduction / summit altar (top at 1.0): stepped base, fluted shaft with an iron band, carved top with a glowing ring */
function Altar({ glow = '#5ff0ff', tank = false }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow><cylinderGeometry args={[1.08, 1.14, 0.16, 8]} /><meshStandardMaterial color={STONE_D} roughness={0.9} flatShading /></mesh>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.7, 0.8, 0.7, 12]} /><meshStandardMaterial color={STONE} roughness={0.85} flatShading /></mesh>
      {[...Array(8)].map((_, k) => { const a = (k / 8) * Math.PI * 2; return <mesh key={k} position={[Math.sin(a) * 0.76, 0.5, Math.cos(a) * 0.76]} rotation={[0, a, 0]}><boxGeometry args={[0.1, 0.7, 0.06]} /><meshStandardMaterial color="#7e828c" roughness={0.8} /></mesh> })}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.79, 0.035, 6, 24]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.91, 0]} castShadow><cylinderGeometry args={[0.98, 0.84, 0.18, 12]} /><meshStandardMaterial color="#7e828c" roughness={0.8} flatShading /></mesh>
      <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.95, 0.03, 6, 28]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, 1.005, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.5, 0.58, 6]} /><meshBasicMaterial color={glow} transparent opacity={0.7} toneMapped={false} /></mesh>
      {tank && <group position={[0.55, 0, -1.15]}>
        <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.9, 12]} /><meshStandardMaterial color="#4a7a5a" metalness={0.4} roughness={0.45} /></mesh>
        <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#4a7a5a" metalness={0.4} roughness={0.45} /></mesh>
        <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.05, 0.05, 0.16, 8]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.205, 0.02, 6, 16]} /><meshStandardMaterial color="#e8e8e8" /></mesh>
      </group>}
      <Brazier pos={[-1.3, 0, 0.2]} color={glow} />
      <Brazier pos={[1.3, 0, 0.2]} color={glow} light />
    </group>
  )
}

/** a halide crate: planks, dark corner posts, two iron bands and a stencilled plate */
function Crate() {
  return (
    <group position={[0, 0.4, 0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[0.78, 0.78, 0.78]} /><meshStandardMaterial color="#8a7a5a" roughness={0.9} /></mesh>
      {[-1, 1].flatMap((a) => [-1, 1].map((b) => <mesh key={a + ',' + b} position={[a * 0.38, 0, b * 0.38]}><boxGeometry args={[0.08, 0.8, 0.08]} /><meshStandardMaterial color="#5a4a32" roughness={0.9} /></mesh>))}
      {[-0.22, 0.22].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.82, 0.05, 0.82]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.45} /></mesh>)}
      {[-0.1, 0.1].map((y) => <mesh key={y} position={[0, y, 0.395]}><boxGeometry args={[0.7, 0.012, 0.01]} /><meshStandardMaterial color="#6a5a3a" /></mesh>)}
      <mesh position={[0, 0, 0.4]}><circleGeometry args={[0.13, 6]} /><meshStandardMaterial color="#e8d8a0" emissive="#5a4a20" emissiveIntensity={0.5} /></mesh>
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.13, 6]} /><meshStandardMaterial color="#e8d8a0" emissive="#5a4a20" emissiveIntensity={0.5} /></mesh>
    </group>
  )
}

/** a stair pad: unbuilt it's a carved stone frame with a dim acetylide mark; built it's a block with three glowing treads */
function StepPad({ built, hgt }) {
  const { width: Wd, depth: D } = STAIR9
  if (!built) {
    return (
      <group>
        {[D / 2 - 0.1, -D / 2 + 0.1].map((z) => <mesh key={z} position={[0, 0.06, z]} receiveShadow><boxGeometry args={[Wd, 0.12, 0.2]} /><meshStandardMaterial color={STONE} roughness={0.9} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={s} position={[s * (Wd / 2 - 0.1), 0.06, 0]} receiveShadow><boxGeometry args={[0.2, 0.12, D]} /><meshStandardMaterial color={STONE} roughness={0.9} /></mesh>)}
        <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[Wd - 0.4, 0.03, D - 0.4]} /><meshStandardMaterial color="#3a3e48" roughness={0.95} /></mesh>
        {[-0.3, 0, 0.3].map((dz) => <mesh key={dz} position={[0, 0.045, dz]}><boxGeometry args={[Wd * 0.55, 0.01, 0.08]} /><meshStandardMaterial color="#2a6a78" emissive="#1a4a58" emissiveIntensity={0.5} /></mesh>)}
      </group>
    )
  }
  return (
    <group>
      <mesh position={[0, hgt / 2, 0]} castShadow receiveShadow><boxGeometry args={[Wd, hgt, D - 0.05]} /><meshStandardMaterial color="#5a6a7a" roughness={0.8} /></mesh>
      <mesh position={[0, hgt - 0.03, 0]}><boxGeometry args={[Wd + 0.1, 0.06, D + 0.05]} /><meshStandardMaterial color="#7e8a96" roughness={0.75} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * (Wd / 2 + 0.06), hgt / 2, 0]}><boxGeometry args={[0.04, hgt * 0.6, D - 0.3]} /><meshStandardMaterial color="#9af0ff" emissive="#2a8aa0" emissiveIntensity={0.8} /></mesh>)}
      {[-0.35, 0, 0.35].map((dz) => <mesh key={dz} position={[0, hgt + 0.012, dz + D / 2 - 0.6]}><boxGeometry args={[Wd * 0.8, 0.025, 0.1]} /><meshStandardMaterial color="#9af0ff" emissive="#5ff0ff" emissiveIntensity={1.2} toneMapped={false} /></mesh>)}
    </group>
  )
}

/** the ledge under the small chest: coursed stone, an overhanging cap, two banded corner posts and a brazier */
function Ledge() {
  const L = STAIR9.ledge, w = 2 * L.x, d = L.z[0] - L.z[1], z = (L.z[0] + L.z[1]) / 2
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, L.y / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, L.y, d]} /><meshStandardMaterial color="#5a5e68" roughness={0.9} /></mesh>
      <mesh position={[0, L.y - 0.04, 0]} castShadow receiveShadow><boxGeometry args={[w + 0.16, 0.08, d + 0.16]} /><meshStandardMaterial color="#7e828c" roughness={0.8} /></mesh>
      {[0.4, 0.8].map((y) => <mesh key={y} position={[0, y, d / 2 + 0.005]}><boxGeometry args={[w, 0.035, 0.01]} /><meshStandardMaterial color="#3a3e46" /></mesh>)}
      {[-1.6, -0.4, 0.8, 2.0].map((x, i) => <mesh key={x} position={[x - (i % 2) * 0.6, i % 2 ? 0.6 : 0.2, d / 2 + 0.005]}><boxGeometry args={[0.035, 0.4, 0.01]} /><meshStandardMaterial color="#3a3e46" /></mesh>)}
      {[-1, 1].map((s) => <group key={s} position={[s * (L.x - 0.15), 0, -d / 2 + 0.15]}>
        <mesh position={[0, (L.y + 0.4) / 2, 0]} castShadow><boxGeometry args={[0.36, L.y + 0.4, 0.36]} /><meshStandardMaterial color={STONE} roughness={0.85} /></mesh>
        <mesh position={[0, L.y + 0.42, 0]}><boxGeometry args={[0.44, 0.08, 0.44]} /><meshStandardMaterial color="#7e828c" /></mesh>
        {[0.3, 0.9].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.39, 0.05, 0.39]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.45} /></mesh>)}
      </group>)}
      <Brazier pos={[L.x - 0.6, L.y, -d / 2 + 0.7]} color="#ffcf6a" h={0.7} />
    </group>
  )
}

/** an unraised bridge: three dim cables stretched almost taut between stone abutments, a little below the walk line,
 *  with halide clamps (two on a 1,2-dihalide, one on a vinylic halide). It reads as an unbuilt span, not a rope
 *  dangling into the pit (Presentation round 2, #7). */
function SagBridge({ a, b, n }) {
  const sag = n === 1 ? 0.12 : 0.28
  const geos = useMemo(() => [-0.45, 0, 0.45].map((dx) => {
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(dx, -0.1, a), new THREE.Vector3(dx, -0.1 - 2 * sag, (a + b) / 2), new THREE.Vector3(dx, -0.1, b))
    return new THREE.TubeGeometry(c, 24, 0.07, 6, false)
  }), [a, b, sag])
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos])
  const clamps = n === 1 ? [0.5] : [0.36, 0.64]
  const yAt = (t) => -0.1 - 2 * sag * 2 * t * (1 - t)
  return (
    <group>
      {geos.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color={n === 1 ? '#3a8a9a' : '#2a6a78'} emissive="#103a44" emissiveIntensity={n === 1 ? 0.7 : 0.4} roughness={0.5} /></mesh>)}
      {[a, b].map((z) => <mesh key={z} position={[0, -0.1, z]}><boxGeometry args={[1.4, 0.3, 0.3]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.45} /></mesh>)}
      {[a, b].map((z, i) => <mesh key={'ab' + z} position={[0, -0.75, z + (i ? 0.35 : -0.35)]} castShadow receiveShadow><boxGeometry args={[2.0, 1.3, 0.7]} /><meshStandardMaterial color={STONE_D} roughness={0.9} /></mesh>)}
      <pointLight position={[0, -3, (a + b) / 2]} color="#3a9aaa" intensity={2} distance={8} />
      {clamps.map((t) => (
        <group key={t} position={[0, yAt(t), a + (b - a) * t]}>
          <mesh><boxGeometry args={[1.2, 0.16, 0.22]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.45} /></mesh>
          <mesh position={[0, -0.16, 0]}><cylinderGeometry args={[0.03, 0.03, 0.2, 6]} /><meshStandardMaterial color={IRON} /></mesh>
          <mesh position={[0, -0.36, 0]}><sphereGeometry args={[0.22, 14, 10]} /><meshStandardMaterial color="#a8442a" emissive="#4a1408" emissiveIntensity={0.5} roughness={0.5} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** the summit's sky: a storm gradient with stars over the open arena (from the halls it reads as the dark room colour) */
function SummitSky() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#06070e'); gr.addColorStop(0.35, '#12142a'); gr.addColorStop(0.47, '#2e2850'); gr.addColorStop(0.53, '#1e2230'); gr.addColorStop(1, '#0e1018')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const stars = useMemo(() => {
    const n = 700, a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.42
      a[i * 3] = Math.cos(th) * Math.sin(ph) * 240; a[i * 3 + 1] = Math.cos(ph) * 240 + 10; a[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 240
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g
  }, [])
  return (
    <group position={[0, 0, -150]}>
      <mesh renderOrder={-2}><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <points geometry={stars} renderOrder={-1}><pointsMaterial color="#dfe8ff" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.85} depthWrite={false} /></points>
    </group>
  )
}

/** the Mimic's arena: banded pillars with violet banners, alcoves of violet glass, braziers, rubble and a rune ring */
function ArenaDressing() {
  const zs = [-136, -144, -152, -160, -167]
  const rubble = useMemo(() => [[-10.5, -164, 0.5], [-9.6, -165.2, 0.3], [10.2, -137.5, 0.45], [11, -146.5, 0.35], [-11.2, -141, 0.4], [9.4, -166, 0.55], [8.8, -164.8, 0.3]], [])
  return (
    <group>
      {zs.flatMap((z) => [-1, 1].map((s) => (
        <group key={z + ',' + s} position={[s * 12.6, 0, z]}>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[1.7, 0.5, 1.7]} /><meshStandardMaterial color={STONE_D} roughness={0.9} /></mesh>
          <mesh position={[0, 3.8, 0]} castShadow><cylinderGeometry args={[0.55, 0.65, 6.6, 8]} /><meshStandardMaterial color={STONE} roughness={0.85} flatShading /></mesh>
          {[1.4, 4.6].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.05, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>)}
          <mesh position={[0, 7.25, 0]} castShadow><boxGeometry args={[1.6, 0.4, 1.6]} /><meshStandardMaterial color="#7e828c" roughness={0.8} /></mesh>
          <mesh position={[-s * 0.64, 4.0, 0]} rotation={[0, -s * Math.PI / 2, 0]}><planeGeometry args={[0.9, 3.2]} /><meshStandardMaterial color="#4a2a6a" emissive="#2a1040" emissiveIntensity={0.6} side={THREE.DoubleSide} roughness={0.9} /></mesh>
          <mesh position={[-s * 0.66, 4.6, 0]} rotation={[0, -s * Math.PI / 2, 0]}><circleGeometry args={[0.26, 6]} /><meshBasicMaterial color="#c9a3ff" toneMapped={false} /></mesh>
        </group>
      )))}
      {[-140, -148, -156, -164].flatMap((z) => [-1, 1].map((s) => (
        <group key={'al' + z + s} position={[s * 13.9, 0, z]}>
          <mesh position={[0, 3.2, 0]} rotation={[0, -s * Math.PI / 2, 0]}><planeGeometry args={[2.2, 4.4]} /><meshStandardMaterial color="#1a1028" emissive="#3a1a5a" emissiveIntensity={0.7} /></mesh>
          <mesh position={[-s * 0.01, 5.4, 0]} rotation={[0, -s * Math.PI / 2, 0]}><circleGeometry args={[1.1, 16, 0, Math.PI]} /><meshStandardMaterial color="#1a1028" emissive="#5a2a8a" emissiveIntensity={0.8} /></mesh>
          <mesh position={[-s * 0.2, 0.3, 0]}><boxGeometry args={[0.4, 0.6, 2.4]} /><meshStandardMaterial color={STONE_D} roughness={0.9} /></mesh>
        </group>
      )))}
      {[[-7, -140], [7, -140], [-8, -162], [8, -162]].map(([x, z]) => <Brazier key={x + ',' + z} pos={[x, 0, z]} color="#c9a3ff" h={1.3} light={z === -140} />)}
      {rubble.map(([x, z, r], i) => <mesh key={i} position={[x, r * 0.6, z]} rotation={[i, i * 2, 0]} castShadow><dodecahedronGeometry args={[r, 0]} /><meshStandardMaterial color={STONE} roughness={0.95} flatShading /></mesh>)}
      <group position={[-10.4, 0, -152]}>
        <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0.12]} castShadow><cylinderGeometry args={[0.5, 0.6, 1.8, 8]} /><meshStandardMaterial color={STONE} flatShading roughness={0.9} /></mesh>
        <mesh position={[1.2, 0.4, 0.4]} rotation={[Math.PI / 2, 0.4, 0.1]} castShadow><cylinderGeometry args={[0.45, 0.5, 2.0, 8]} /><meshStandardMaterial color={STONE} flatShading roughness={0.9} /></mesh>
      </group>
      {[[5.4, 5.6], [8.2, 8.4]].map(([r0, r1]) => <mesh key={r0} position={[0, 0.03, -150]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r0, r1, 48]} /><meshBasicMaterial color="#8a5ac8" transparent opacity={0.45} toneMapped={false} /></mesh>)}
      {[...Array(12)].map((_, k) => { const a = (k / 12) * Math.PI * 2; return <mesh key={'rn' + k} position={[Math.cos(a) * 6.9, 0.03, -150 + Math.sin(a) * 6.9]} rotation={[-Math.PI / 2, 0, -a]}><planeGeometry args={[0.5, 0.18]} /><meshBasicMaterial color="#b98aff" transparent opacity={0.5} toneMapped={false} /></mesh> })}
    </group>
  )
}

/** the Retrosynthesis Map left lying open on the planning table once it's been worked: the planned chain, inked backward */
function OpenMap({ pos }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512; c.height = 320
    const g = c.getContext('2d')
    g.fillStyle = '#e8dcb8'; g.fillRect(0, 0, 512, 320)
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 6; g.strokeRect(10, 10, 492, 300)
    g.fillStyle = '#3a2a18'; g.textAlign = 'center'
    g.font = 'bold 34px serif'; g.fillText('cis-2-hexene', 256, 66)
    g.font = '24px serif'; g.fillText('↑ H₂, Lindlar catalyst', 256, 112)
    g.font = 'bold 34px serif'; g.fillText('2-hexyne', 256, 160)
    g.font = '24px serif'; g.fillText('↑ NaNH₂, then CH₃I', 256, 206)
    g.font = 'bold 34px serif'; g.fillText('1-pentyne', 256, 254)
    g.fillStyle = '#2a6a78'; g.font = 'italic 20px serif'; g.fillText('planned backward · Worked Example 9.1', 256, 294)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    // held up off the table, tilted 30° toward the approach (+z), 1.4× and unlit, so it reads over Kai's shoulder
    // and isn't washed out (Presentation round 2, #5); the table's crystal is hidden while it lies here
    <group position={[pos[0], pos[1] + 1.45, pos[2] - 0.1]}>
      <group rotation={[Math.PI / 6, 0, 0]} scale={1.4}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.95, 0.6]} /><meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.5, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.62, 10]} /><meshStandardMaterial color="#d8c898" roughness={0.9} /></mesh>)}
      </group>
      <Tag position={[0, 0.85, 0]} df={10} far={10}>The Map: planned backward (WE 9.1)</Tag>
    </group>
  )
}

/** a stand of flasks: E takes one into the Satchel */
function Flasks({ list, held }) {
  return list.map(([id, x, z]) => (
    <group key={id} position={[x, 0, z]}>
      <Plinth r={0.3} h={0.86} />
      {held !== id && <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.36, 10]} /><meshStandardMaterial color={FL_COLOR[id]} emissive={FL_COLOR[id]} emissiveIntensity={0.7} transparent opacity={0.9} /></mesh>}
      <Tag position={[0, 1.7, 0]} df={8} far={16}>{FL_NAMES[id]}</Tag>
    </group>
  ))
}

function SpireLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const bossLive = useRef(false) // the fight is running: room triggers hold still
  const sparkFly = useRef(false) // keeps the beaten Mimic mounted while its spark flies east (a ref, so the render markSolved forces already sees it)
  const [, bumpSpark] = useState(0)
  const [halide, setHalide] = useState(null)
  const halideRef = useRef(null)
  halideRef.current = halide
  const [lindlarHere, setLindlarHere] = useState(false)
  const [lay] = useState(layout)
  // the enol is a passing phase: kept in local state only, so a reload mid-shift can't leave a well stuck (Play #1)
  const [enols, setEnols] = useState({})
  const enolRef = useRef({})
  const segs = save.t9segs || [0, 0, 0]
  const held = save.t9flask || null
  const wells = save.t9wells || {}
  const summit = save.t9summit || []
  const steps = save.t9steps || []

  useEffect(() => {
    world.map = {
      floor: '#8a8e96', wall: '#2a2e36', pit: '#0e1218',
      labels: ROOMS9.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t9-map']) return null; const seen = sv.t9seen || {}; return ROOMS9.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t9-compass']) return null
        const g = GOALS9.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 9) return { pos: [0, -164], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Cliffs' }
      },
    }
    return () => { world.map = null }
  }, [world])

  // older saves may hold a transient 'enol:' value; drop it so those wells take a pour again
  useEffect(() => {
    const w = getState().save.t9wells || {}
    if (Object.values(w).some((v) => String(v || '').startsWith('enol:'))) saveGame({ t9wells: Object.fromEntries(Object.entries(w).map(([k, v]) => [k, String(v || '').startsWith('enol:') ? null : v])) })
  }, [])

  useEffect(() => {
    playMusic('spire')
    world.killY = -8
    const f = [world.addFloor(-W, GAP9.z[0], W, 8, 0), world.addFloor(-W, -130, W, GAP9.z[1], 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -129, 0)]
    const HINTS = {
      '9-1': 'Dihalide bridges lying flat, and a stand of bases. Which base can pull off HX?',
      '9-2': 'Wells that bubble and shift. Two doors want two different carbonyls.',
      '9-3': 'Same alkyne, two doors: one bent cis, one bent trans.',
      '9-4': 'A stair that needs building, and a ladder of pKa numbers.',
      '9-5': 'A planning table and a row of flasks. Plan first!',
    }
    const t = ROOMS9.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      if (bossLive.current) return // no room chip or checkpoint changes while the Mimic fight runs (Presentation round 2, #2)
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t9seen || {}
      saveGame({ checkpoint: { scene: 'spire', room: r.id }, t9seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    // covers the boss checkpoint (z -138): a Continue there spawns inside it and starts the fight (soft-lock fix)
    const bossT = world.addTrigger([-ARENA.x, -2, -142], [ARENA.x, 8, -132], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t9-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Cliffs', onInteract: () => onExit('cliffs', { scene: 'cliffs', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -107.2], radius: 2.2, label: () => (has('t9-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -129.2], radius: 2.4, label: () => (has('t9-bossdoor') ? null : 'Unlock the summit door'), onInteract: () => unlockBossDoor() }),
    ]
    const targets = []
    // 9-1: carry a base from the stand, then strike each bridge segment twice (two eliminations)
    for (let k = 0; k < SEGS; k++) {
      const [z0] = segZ(k)
      // on the near side of the lip, so a standing swing's lunge never carries Kai into the gap (Play round 2, #1)
      targets.push(world.addTarget({ pos: () => [0, 0.6, z0 + 0.5], radius: 1.4, tall: 1.2, alive: () => ((getState().save.t9segs || [0, 0, 0])[k] || 0) < 2, onHit: () => strikeSeg(k) }))
    }
    // flasks
    ;[...lay.base, ...lay.wells, ...lay.red, ...lay.summit].forEach(([id, x, z]) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.0, label: () => (getState().save.hasSatchel && getState().save.t9flask !== id ? `Take the flask: ${FL_NAMES[id]}` : null), onInteract: () => { saveGame({ t9flask: id }); sfx('pickup') } })))
    // pour (G) on the wells, the reduction altars and the summit altar
    const lanterns = [
      world.addLantern({ needs: 'hasRetro', omni: true, priority: 1, pos: STATIONS9['9-5map'].pos, radius: 2.4, label: () => (has('9-5map') ? null : 'Unfold the Retrosynthesis Map'), onLantern: () => runStation('9-5map') }),
      ...['9-2a', '9-2b'].map((id) => world.addLantern({ needs: 'hasSatchel', omni: true, pos: [WELLS9[id][0], 0, WELLS9[id][1]], radius: 2.8, label: () => (has(id) || !getState().save.t9flask ? null : `Pour ${FL_NAMES[getState().save.t9flask]} into the well`), onLantern: () => pourWell(id) })),
      ...['9-3a', '9-3b'].map((id) => world.addLantern({ needs: 'hasSatchel', omni: true, pos: [REDUCE9[id][0], 0, REDUCE9[id][1]], radius: 2.8, label: () => (has(id) || !getState().save.t9flask ? null : `Pour ${FL_NAMES[getState().save.t9flask]} on the 5-decyne`), onLantern: () => pourReduce(id) })),
      world.addLantern({ needs: 'hasSatchel', omni: true, pos: [SUMMIT9.altar[0], 0, SUMMIT9.altar[1]], radius: 2.8, label: () => (has('9-5') || !getState().save.t9flask ? null : `Add ${FL_NAMES[getState().save.t9flask]} to the flask on the altar`), onLantern: () => pourSummit() }),
    ]
    // 9-4: carry halide crates to the stair
    HALIDES.forEach((h, i) => {
      const [x, z] = lay.halides[i]
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.1,
        label: () => (has('9-4') ? null : halideRef.current === h.id ? `Put it back: ${h.name}` : has('9-4ladder') && !halideRef.current && !(getState().save.t9steps || []).includes(h.id) ? `Pick up: ${h.name}` : null),
        onInteract: () => {
          if (halideRef.current === h.id) { setHalide(null); sfx('pickup'); return }
          if (halideRef.current) return
          setHalide(h.id); sfx('pickup')
          if (!getState().save.t9crateTip) { saveGame({ t9crateTip: true }); toast('Carry it to the stair, or press E back here to put it down.', 'info', 3600) }
        } }))
    })
    STAIR9.steps.slice(0, 2).forEach(([x, z], k) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.6, label: () => (halideRef.current && (getState().save.t9steps || []).length === k ? 'Alkylate the acetylide with it' : null), onInteract: () => placeHalide(k) })))
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS9.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
      window.__valence.world9 = world
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...targets, ...lanterns].forEach((i) => world.remove(i)) }
  }, [world])

  // the raised bridge segments are floors
  useEffect(() => {
    const ids = segs.map((n, k) => { if (n < 2) return null; const [a, b] = segZ(k); return world.addFloor(-1.6, b, 1.6, a, 0) }).filter((x) => x !== null)
    return () => ids.forEach((i) => world.remove(i))
  }, [world, segs.join(',')])

  // the built stair steps are floors (0.4, 0.8 m); a low solid under the second stops Kai walking in beneath it.
  // The ledge (1.2 m) with the small chest is always there, but only a built second step reaches it (Play #3).
  useEffect(() => {
    const { depth: D, width: Wd, rise } = STAIR9
    const ids = []
    STAIR9.steps.forEach(([x, z], k) => {
      if (steps.length <= k) return
      const top = rise * (k + 1)
      ids.push(world.addFloor(x - Wd / 2, z - D / 2, x + Wd / 2, z + D / 2, top))
      if (k > 0) ids.push(world.addSolid([x - Wd / 2, 0, z - D / 2], [x + Wd / 2, top - 0.45, z + D / 2]))
    })
    return () => ids.forEach((i) => world.remove(i))
  }, [world, steps.join(',')])
  useEffect(() => {
    const L = STAIR9.ledge
    const ids = [world.addFloor(-L.x, L.z[1], L.x, L.z[0], L.y), world.addSolid([-L.x, 0, L.z[1]], [L.x, L.y - 0.45, L.z[0]])]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])

  // ---------------------------------------------------------------- actions
  const strikeSeg = (k) => {
    const s = [...(getState().save.t9segs || [0, 0, 0])]
    if (k > 0 && s[k - 1] < 2) { toast('Raise the nearer bridge first.', 'info', 2400); return false }
    const f = getState().save.t9flask
    const base = f && f.startsWith('b_') ? BRIDGE_BASES.find((b) => 'b_' + b.id === f) : null
    if (!base) { toast('The blow alone does nothing. Pulling off HX takes a base: carry one from the stand.', 'info', 4200); return true }
    if (!base.strong) {
      saveGame({ t9flask: null }); sfx('wrong'); world.player.hurt(1, [0, 0, segZ(k)[0]], true)
      toast(`The ${base.name} fizzles away. ${base.why}`, 'warn', readMs(base.why) + 800); return true
    }
    s[k] = Math.min(2, (s[k] || 0) + 1)
    const allUp = s.every((n) => n >= 2) // an excess of strong base (p. 289): one flask raises all three, then it's spent
    saveGame({ t9segs: s, ...(allUp ? { t9flask: null } : {}) }); sfx('stomp'); world.shake = 0.2
    if (s[k] === 1) toast('One HX gone: a vinylic halide, half raised and wobbly.', 'info', 3200)
    else toast(`The second HX goes: two π bonds, sp carbons, a straight triple bridge. ${allUp ? 'The flask is spent.' : 'The flask held an excess of strong base, more than the two HX each bridge needs (p. 289): plenty left for the next bridge.'}`, 'good', 4600)
    if (s.every((n) => n >= 2) && !has('9-1')) { markSolved('9-1'); sfx('open') }
    return true
  }
  const runStation = async (id) => {
    const st = STATIONS9[id]
    if (busy.current || (['9-4ladder', '9-5map'].includes(id) && has(id))) return
    busy.current = true
    let wrong = null
    const ok = await openPanel(st.panel, { ...st.props, onWrong: (t) => { wrong = t } })
    busy.current = false
    if (!ok) { if (wrong) { world.player.hurt(1, [st.pos[0], 0, st.pos[2]], true); toast(wrong, 'warn', readMs(wrong)) } return }
    markSolved(id)
    if (id === '9-4ladder') toast('NaNH₂ it is. The halide crates unlock.', 'good', 2800)
    if (id === '9-5map') toast('Planned. Now a new target at the altar: ask the same backward questions.', 'good', 3600)
  }
  const takeFlask = () => { const f = getState().save.t9flask; saveGame({ t9flask: null }); return f }
  const pourWell = (id) => {
    if (has(id) || enolRef.current[id]) return
    const f = takeFlask(); if (!f) return
    const r = WELLS.routes[f]
    if (!r) { sfx('wrong'); world.player.hurt(1, [WELLS9[id][0], 0, WELLS9[id][1]], true); toast(f === 'h2' || f === 'pd' ? 'H₂ over Pd/C reduces the alkyne; it doesn’t add water. The well stays still.' : 'Nothing happens: that adds no water.', 'warn', 3600); return }
    sfx('pickup')
    enolRef.current = { ...enolRef.current, [id]: r.enol }; setEnols(enolRef.current)
    toast(`An enol rises: ${r.enol}. It won’t stay…`, 'info', 2400)
    setTimeout(() => {
      const want = WELLS.doors[id]
      enolRef.current = { ...enolRef.current, [id]: null }; setEnols(enolRef.current)
      saveGame({ t9wells: { ...(getState().save.t9wells || {}), [id]: r.product } })
      if (r.product === want) { markSolved(id); sfx('open'); const m = `It shifts: ${shown(r.product)}! ${r.why}`; toast(m, 'good', readMs(m) + 600) }
      else { sfx('wrong'); world.player.hurt(1, [WELLS9[id][0], 0, WELLS9[id][1]], true); const m = `It shifts into ${shown(r.product)}. ${r.why} This well wants ${shown(want)}.`; toast(m, 'warn', readMs(m)); setTimeout(() => { const cur = (getState().save.t9wells || {})[id]; if (!has(id) && !enolRef.current[id] && cur === r.product) saveGame({ t9wells: { ...(getState().save.t9wells || {}), [id]: null } }) }, 3500) }
    }, 2200)
  }
  const pourReduce = (id) => {
    if (has(id)) return
    const f = takeFlask(); if (!f) return
    const r = REDUCE.routes[f === 'h2' ? 'pd' : f] // the wells' H₂/Pd/C flask is the same reagent as the Pd/C here
    const at = [REDUCE9[id][0], 0, REDUCE9[id][1]]
    if (!r) { sfx('wrong'); world.player.hurt(1, at, true); toast('That doesn’t reduce an alkyne here.', 'warn', 3000); return }
    const want = REDUCE.doors[id]
    if (r.product === want) { markSolved(id); sfx('open'); toast(`${shown(r.product)}. ${r.why}`, 'good', 5600); return }
    sfx('wrong'); world.player.hurt(1, at, true); const m = `You made ${shown(r.product)}. ${r.why} This door is shaped for ${shown(want)}.`; toast(m, 'warn', readMs(m))
  }
  const pourSummit = () => {
    if (has('9-5')) return
    if (!has('9-5map')) { toast('Plan it on the Map first. Lindlar would insist.', 'warn', 3000); return }
    const f = takeFlask(); if (!f) return
    // flasks carried up from the earlier stands count as the same reagents (H₂/Pd/C from the wells is the 9-3 Pd/C)
    const key = f === 'h2' ? 'pd' : f.replace(/^[sb]_/, '') // the bridge's b_nanh2 is the same NaNH₂ as the summit's s_nanh2
    const seq = [...(getState().save.t9summit || [])]
    const want = SUMMIT_ORDER[seq.length]
    if (key !== want) {
      sfx('wrong'); saveGame({ t9summit: [] }); world.player.hurt(1, [SUMMIT9.altar[0], 0, SUMMIT9.altar[1]], true)
      const W = SUMMIT_WHY[seq.length], msg = W[key] || W['*']
      toast(`The flask clouds over and empties. Back to ${SUMMIT.start}. ${msg}`, 'warn', readMs(msg) + 1600); return
    }
    seq.push(key); saveGame({ t9summit: seq }); sfx('right')
    toast(SUMMIT.done[key], 'good', 4200)
    if (seq.length === SUMMIT_ORDER.length) { markSolved('9-5'); sfx('open'); setTimeout(() => say([{ who: 'Pi', text: `${SUMMIT.target}! A new target, and the same backward questions.` }, { who: 'Pi', text: 'A big chest by the summit door!' }]), 600) }
  }
  const placeHalide = (k) => {
    const id = halideRef.current
    if (!id) return
    const h = HALIDES.find((x) => x.id === id)
    setHalide(null)
    if (!h.ok) { sfx('wrong'); world.shake = 0.3; world.player.hurt(1, [STAIR9.steps[k][0], 0, STAIR9.steps[k][1]], true); saveGame({ t9steps: [] }); toast(`The stair crumbles to the floor. ${h.why}`, 'warn', 6000); return }
    const next = [...(getState().save.t9steps || []), id]
    saveGame({ t9steps: next }); sfx('right')
    toast(`${h.name}: a ${h.kind} halide. The acetylide swaps in for the halide and the stair grows a step.`, 'good', 4600)
    if (next.length >= 2) { markSolved('9-4'); sfx('open'); toast('The stair is built. A little chest glints on the ledge at the top: climb!', 'good', 3200) }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: To make something, just start somewhere and hope.' },
      { who: 'Pi', text: 'Someone’s scratched underneath: “and then?” —L.' },
    ])
    markSolved('t9-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t9-door')) return
    if (!getState().save.t9key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t9key: false }); markSolved('t9-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t9-bossdoor')) return
    if (!has('t9-bosskey')) { toast('The summit door crackles with violet light. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t9-bossdoor'); sfx('open'); toast('The Boss Key turns. Thunder, very close…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't9-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't9-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't9-key') { saveGame({ t9key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't9-retro') {
      saveGame({ hasRetro: true })
      await itemGet(world, { model: 'lindlar', name: 't9_map', scale: 2.2, color: '#5ff0ff' }, [
        { who: '', text: 'You got the Retrosynthesis Map!' },
        { who: 'Pi', text: 'It starts at the thing you want, and branches backward to the things you have.' },
        { who: 'Pi', text: 'Find a planning table and press G. Then we walk it backward!' },
      ])
    }
    if (id === 't9-bosskey') { saveGame({ t9bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss9') || bossStarted.current || busy.current) return
    bossStarted.current = true
    bossLive.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = ROOMS9.find((r) => r.id === 'boss').checkpoint // in front of the summit door, camera inside the arena
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t9bossIntro) {
      saveGame({ t9bossIntro: true })
      // frame the Mimic's chest and the violet spark in it (enemies hold still while Pi talks)
      const q = world.mimicSpark
      world.camOverride = q ? { pos: [q.x + 2.5, 3.0, q.z + 8], look: [q.x, q.y - 0.2, q.z] } : { pos: [3, 4, -134], look: [MIMIC.center[0], 1.8, MIMIC.center[2]] }
      await say([
        { who: 'Pi', text: 'Malradix’s Mimic! It’s wearing a molecule like a costume.' },
        { who: 'Pi', text: 'Hit the pedestal with whatever came just before it. Peel it back, step by step!' },
        { who: 'Pi', text: 'And keep moving. It lunges.' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'What came just before? Back, back, back!' }])
    busy.current = false
  }
  const bossDown = async () => {
    sparkFly.current = true // the Mimic (and its doll) stays mounted until Pi's line is read
    bossLive.current = false
    markSolved('boss9')
    playMusic('spire')
    // Pi's line names the doll, then the spark, so the camera does too (Narrative 1c): first a low, close shot on the
    // faceless doll (the spark tears out of the top of that frame), then a wide shot from the arena's west side that
    // follows the spark east (+x) and up, toward the marsh.
    const q0 = world.mimicSpark, d = world.mimicDoll
    const hx = d ? d.x : q0 ? q0.x : MIMIC.center[0], hz = d ? d.z : q0 ? q0.z : MIMIC.center[2]
    world.camOverride = { pos: [hx - 3.4, 1.7, hz + 3.0], look: [hx, 0.75, hz] }
    const camPos = [Math.max(-10.5, hx - 11), 3.2, Math.min(-133, hz + 8)]
    const lookAt = (q) => [q.x + 1.5, 1.4 + (q.y - 1.4) * 0.65, q.z]
    let follow = null
    const cut = setTimeout(() => { follow = setInterval(() => { const q = world.mimicSpark; if (q) world.camOverride = { pos: camPos, look: lookAt(q) } }, 16) }, 1500)
    // the spark vanishes 4.0 s after the Mimic falls (~3.6 s from here): stop following then, but keep that last frame
    // (looking east, where it went) until Pi's line is closed, so her words never play over Kai's back (Play round 2, #2)
    const flight = new Promise((r) => setTimeout(() => { clearTimeout(cut); clearInterval(follow); r() }, 3600))
    await Promise.all([say([{ who: 'Pi', text: 'Nothing left under all that but a faceless doll. And the spark!' }]), flight])
    clearTimeout(cut); clearInterval(follow)
    world.camOverride = null
    sparkFly.current = false; bumpSpark((n) => n + 1)
    await say([{ who: 'Pi', text: 'East, over the cliffs! Down toward that misty marsh. The shard!' }])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 9 || busy.current) return
    busy.current = true
    sfx('shard')
    setLindlarHere(true)
    // Kai and Lindlar stand either side of the shard, in front of it, framed from the arena side so both heads sit
    // above the panel and the shard glows between them, not through Kai (Presentation #4)
    if (world.player) world.player.teleport(LQ_KAI, -Math.PI / 2)
    await new Promise((r) => setTimeout(r, 300))
    const shot = twoShot(world, LQ_LIN, 5.5, Math.PI / 2)
    // low, looking under the heads, so both faces sit above the lesson card and the panel in a portrait window (Presentation round 2, #1)
    world.camOverride = shot && { pos: [(LQ_KAI[0] + LQ_LIN[0]) / 2 + 0.9, 1.35, LQ_KAI[2] + 5.4], look: [(LQ_KAI[0] + LQ_LIN[0]) / 2, 0.35, LQ_KAI[2]] }
    await say([{ who: 'Sage Lindlar', text: 'A question before you take it. Just the one. Ask it of yourself afterwards, too.' }])
    let wrong = null
    const ok = await openPanel('mimicCheck', { onWrong: (t) => { wrong = t } })
    if (!ok && wrong) { world.player.hurt(1, LQ_LIN, true); toast(wrong, 'warn', readMs(wrong)) }
    if (!ok) { await say([{ who: 'Sage Lindlar', text: 'Take your time. Plans that are rushed come back to the start.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 9, checkpoint: { scene: 'cliffs', at: 'gate' } })
    setState({ objective: 'Bond Shard 9 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… nine. The storm over the cliffs has broken. I can see stars.' },
      { who: 'Princess Octavia', text: 'He said start anywhere and hope. You started at the end.' },
      { who: 'Sage Lindlar', text: 'Keep the Map. The marsh is east, down the cliff road. Ask Magnus what radicals really do.' },
      { who: 'Pi', text: 'Nine down, three to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'cliffs', at: 'gate' }, card: 9 })
    busy.current = false
    onExit('cliffs', { scene: 'cliffs', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -164], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss9 && (getState().save.shards || 0) < 9)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 6.5, pitchSet: 0.5, lookY: 1.2 } : null })
  // a carried flask or crate hides Kai's form tag, so the two labels never collide (Presentation #7)
  useEffect(() => { setState({ carrying: !!(held || halide) }) }, [held, halide])
  useEffect(() => () => setState({ carrying: false }), [])

  const hName = held ? FL_NAMES[held] : null
  const hh = halide ? HALIDES.find((x) => x.id === halide) : null
  return (
    <group>
      <color attach="background" args={['#14161e']} />
      <fog attach="fog" args={['#1e2230', 18, 70]} />
      <hemisphereLight args={['#d8e4ff', '#1e2230', 0.85]} />
      <ambientLight intensity={0.3} color="#dfe8ff" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#e8f0ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      {/* dark grout under instanced flagstones (Presentation #6) */}
      {[[8, GAP9.z[0]], [GAP9.z[1], -130]].map(([a, b], i) => <mesh key={i} position={[0, -0.03, (a + b) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, Math.abs(a - b)]} /><meshStandardMaterial color="#33363e" roughness={0.95} /></mesh>)}
      <mesh position={[0, -0.03, -150]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial color="#2a2a34" roughness={0.95} /></mesh>
      <Flagstones x0={-W} x1={W} z0={8} z1={GAP9.z[0]} seed={3} />
      <Flagstones x0={-W} x1={W} z0={GAP9.z[1]} z1={-130} seed={11} />
      <Flagstones x0={-ARENA.x} x1={ARENA.x} z0={-130} z1={-170} size={2.5} base="#6e6a7e" seed={29} />
      <SummitSky />
      <ArenaDressing />
      <mesh position={[0, -7, (GAP9.z[0] + GAP9.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, 15]} /><meshBasicMaterial color="#05070c" /></mesh>
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -40, -52, -64, -76, -90, -102, -114, -124].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#7ae8ff" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3e46" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t9-map']} onOpen={() => openChest('t9-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Triple Spire</Tag>

      {/* 9-1 the linear halls: dihalide bridges */}
      {[...Array(SEGS)].map((_, k) => {
        const [a, b] = segZ(k), n = segs[k] || 0
        return (
          <group key={k}>
            {n >= 2
              ? [-0.45, 0, 0.45].map((dx) => <mesh key={dx} position={[dx, -0.1, (a + b) / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, Math.abs(a - b), 8]} /><meshStandardMaterial color="#5ff0ff" emissive="#2ab0d0" emissiveIntensity={1.2} /></mesh>)
              : <SagBridge a={a} b={b} n={n} />}
            {n >= 2 && <mesh position={[0, -0.25, (a + b) / 2]}><boxGeometry args={[3.2, 0.2, Math.abs(a - b)]} /><meshStandardMaterial color="#3a4652" transparent opacity={0.5} /></mesh>}
            {/* tags sit to alternate sides, clear of Kai's head and Pi, and never stacked in one column (Presentation round 2, #4) */}
            {n < 2 && <Tag position={[k % 2 ? 2.1 : -2.1, 1.4, a - 1.2]} df={10} far={22}>{n === 0 ? 'a 1,2-dihalide' : 'a vinylic halide'}</Tag>}
            {n >= 2 && <Tag position={[k % 2 ? 2.1 : -2.1, 2.3, (a + b) / 2]} df={10} far={22}>{k === 0 ? 'C≡C: sp carbons, 180°, 120 pm (§9.3)' : k === 1 ? 'one σ + two π bonds (§9.3)' : '≈965 kJ/mol: the strongest C–C bond (§9.3)'}</Tag>}
          </group>
        )
      })}

      <Flasks list={lay.base} held={held} />
      <Tag position={[BASE_STAND[0] + 0.4, 2.5, BASE_STAND[1] - 1.8]} df={9} far={18}>bases</Tag>

      {/* 9-2 the shifting wells */}
      <Chest world={world} pos={[7.6, 0, -40]} rotY={-Math.PI / 2} opened={!!solved['t9-compass']} onOpen={() => openChest('t9-compass')} />
      <Flasks list={lay.wells} held={held} />
      {['9-2a', '9-2b'].map((id) => {
        const [x, z] = WELLS9[id], st = enols[id] ? 'enol:' + enols[id] : wells[id]
        return (
          <group key={id} position={[x, 0, z]}>
            <Suspense fallback={null}><Part model="spire" name="s9_well" /></Suspense>
            {st && <mesh position={[0, 1.2 + (String(st).startsWith('enol') ? 0.3 : 0), 0]}><icosahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color={solved[id] ? '#9affb8' : String(st).startsWith('enol') ? '#ffd060' : '#ff9a8a'} emissive="#3a3a1a" emissiveIntensity={0.6} /></mesh>}
            <Tag position={[0, 2.6, 0]} df={9} far={22}>{`wants: ${shown(WELLS.doors[id])}`}</Tag>
            <Tag position={[0, 2.1, 0]} df={10} far={22} className={solved[id] ? 'ok-tag' : ''}>{st ? (String(st).startsWith('enol:') ? String(st).replace('enol:', '') : shown(String(st))) : '1-hexyne'}</Tag>
          </group>
        )
      })}
      <Vipers world={world} spawns={[[-5, -54], [5, -55]]} active={!!solved['t9-compass']} zone={[-36, -58]} />
      <Gate world={world} pos={[0, 0, -58]} size={[2 * W, 7, 0.8]} open={!!(solved['9-2a'] && solved['9-2b'])} color="#3a4652" glow="#ffd060" />

      {/* 9-3 three reductions */}
      <Flasks list={lay.red} held={held} />
      {['9-3a', '9-3b'].map((id) => {
        const [x, z] = REDUCE9[id]
        const want = REDUCE.doors[id]
        return (
          <group key={id} position={[x, 0, z]}>
            <Altar glow={solved[id] ? '#9affb8' : ALTAR_GLOW} tank />
            {[-0.7, 0.7].map((dx) => <mesh key={dx} position={[dx, 1.5, 0]}><sphereGeometry args={[0.2, 10, 8]} /><meshStandardMaterial color="#3a3640" /></mesh>)}
            {solved[id] && [-1, 1].map((s) => <mesh key={s} position={[s * 1.1, 1.5 + (want.startsWith('cis') ? 0.5 : s * 0.5), 0]}><sphereGeometry args={[0.16, 8, 6]} /><meshStandardMaterial color="#9affb8" /></mesh>)}
            <Tag position={[-Math.sign(x) * 0.4, 2.8, 0]} df={9} far={22}>{`door shaped for: ${shown(want)}`}</Tag>
            <Tag position={[-Math.sign(x) * 0.4, 2.3, 0]} df={10} far={22} className={solved[id] ? 'ok-tag' : ''}>{solved[id] ? shown(want) : '5-decyne'}</Tag>
          </group>
        )
      })}
      <Chest world={world} pos={[0, 0, -79.5]} big opened={!!solved['t9-retro']} show={!!(solved['9-3a'] && solved['9-3b'])} onOpen={() => openChest('t9-retro')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -82]} size={[2 * W, 7, 0.8]} open={!!solved['t9-retro']} color="#3a4652" glow="#5ff0ff" />

      {/* 9-4 the acetylide stair */}
      {HALIDES.map((h, i) => {
        const [x, z] = lay.halides[i]
        const gone = steps.includes(h.id) || halide === h.id
        return (
          <group key={h.id} position={[x, 0, z]}>
            {!gone && <Crate />}
            {!gone && <Tag position={[0, 1.3, 0]} df={8} far={16}>{h.name}</Tag>}
          </group>
        )
      })}
      {STAIR9.steps.map(([x, z], k) => {
        const built = steps.length > k, hgt = built ? STAIR9.rise * (k + 1) : 0.06
        return (
        <group key={k} position={[x, 0, z]}>
          <StepPad built={built} hgt={hgt} />
          <Tag position={[0, hgt + 1.8, 0]} df={9} far={18}>{steps.length > k ? <>{HALIDES.find((h) => h.id === steps[k]).name.split(' (')[0]}<br />added</> : <>an acetylide waits here<br />(R–C≡C:⁻)</>}</Tag>
        </group>
        )
      })}
      <Ledge />
      {hh && <Carried world={world} label={hh.name} color="#ffb07a" />}
      <Vipers world={world} spawns={[[5, -92], [6, -100]]} active={!!solved['t9-door'] || !!solved['9-4ladder']} zone={[-82, -108]} />
      <Chest world={world} pos={[0, STAIR9.ledge.y, (STAIR9.ledge.z[0] + STAIR9.ledge.z[1]) / 2]} opened={!!solved['t9-key']} show={!!solved['9-4']} onOpen={() => openChest('t9-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -108]} size={[2 * W, 7, 0.8]} open={!!solved['t9-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -107.6]} df={13}>{solved['t9-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 9-5 the planner's summit */}
      <Flasks list={lay.summit} held={held} />
      <Tag position={[SUMMIT9.altar[0] - 0.6, 3.0, SUMMIT9.altar[1]]} df={9} far={22}>{`${SUMMIT.cite}, p. 312`}</Tag>
      <group position={[SUMMIT9.altar[0], 0, SUMMIT9.altar[1]]}>
        <Altar glow={solved['9-5'] ? '#9affb8' : ALTAR_GLOW} />
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.35, 14, 10]} /><meshStandardMaterial color={solved['9-5'] ? '#9affb8' : '#d8d0e8'} emissive={solved['9-5'] ? '#2a8a4a' : '#3a3a5a'} emissiveIntensity={0.6} transparent opacity={0.85} /></mesh>
        <Tag position={[-0.6, 2.4, 0]} df={10} far={22}>{solved['9-5'] ? shown(SUMMIT.target) : <>{shown(SUMMIT.states[Math.min(summit.length, SUMMIT.states.length - 1)])}<br />{`make ${shown(SUMMIT.target)}`}</>}</Tag>
      </group>
      <Carried world={world} label={hName} color={held ? FL_COLOR[held] : '#fff'} />
      <Chest world={world} pos={[0, 0, -127.5]} big opened={!!solved['t9-bosskey']} show={!!solved['9-5']} onOpen={() => openChest('t9-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -130]} size={[2 * W, 7, 0.8]} open={!!solved['t9-bossdoor']} color="#3a2a50" glow="#c9a3ff" />
      {/* the arena seals behind Kai while the Mimic fights, so no lunge can knock him back down the spire (Presentation round 2, #2) */}
      <Gate world={world} pos={[0, 0, -131.2]} size={[2 * W, 7, 0.6]} open={!bossOn || !!solved.boss9} color="#3a2a50" glow="#c9a3ff" />

      {solved['9-5map'] && <OpenMap pos={STATIONS9['9-5map'].pos} />}
      {Object.entries(STATIONS9).map(([id, st]) => {
        const isMap = id === '9-5map' // the Map is a G item: the table's E prompt only says so
        const once = ['9-4ladder', '9-5map'].includes(id)
        return (
          <Station key={id} world={world} pos={st.pos} label={isMap ? (!save.hasRetro && !solved[id] ? 'A planning table: it needs a map' : null) : once && solved[id] ? null : st.label} enabled={isMap ? !save.hasRetro && !solved[id] : !(once && solved[id])} solved={!!solved[id]} orb={!(isMap && solved[id])}
            onUse={() => (isMap ? toast('A planning table, bare. Something in this spire must unfold on it.', 'info', 3000) : runStation(id))} />
        )
      })}

      {/* boss */}
      {(!solved.boss9 || sparkFly.current) && <Mimic world={world} center={MIMIC.center} active={bossOn && (!solved.boss9 || sparkFly.current)} onDefeated={bossDown} />}
      {lindlarHere && <Lindlar position={LQ_LIN} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss9 && (save.shards || 0) < 9} pos={[0, 0, -164]} />
      <Motes count={160} area={[20, 7, 170]} center={[0, 0.6, -80]} color="#c8e8ff" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Spire({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'spire' ? ROOMS9.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#14161e" camDist={6.2}>
      {(world) => <SpireLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
