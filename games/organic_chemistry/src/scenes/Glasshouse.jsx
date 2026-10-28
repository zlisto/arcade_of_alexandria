import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Leviathan, { Borana, Wraiths } from '../actors/OrchardFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { REAGENTS, ALTARS8, pour, shown, wantShown, GROVES8, SHEAR_HALVES, POLY, RACEMATE, raceCfg } from '../chem/rules8'
import { W8 as W, ROOMS8, STATIONS8, ALTAR8_POS, DOORS8, TREES8, SHEARS, BARN, RACE, GOALS8, LEVI } from '../data/dungeon8'

// Dungeon 8 — Borana's Glasshouse (Chapter 8, Alkenes: Reactions and Synthesis). Greenhouse halls along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Reagent Satchel in a big chest, a Boss Key.
// The Satchel carries one flask from a grove tree; G pours it onto an alkene altar, which makes whatever that
// reagent makes. Each door wants one product (§8.2–8.9). Then a polymer chain by hand and a racemate (§8.10–8.12).

preloadModels('orchard', 'borana')
const has = (id) => !!getState().save.solved[id]
/** a toast long enough to read at about 3.5 words a second */
const readMs = (t) => Math.max(3200, Math.round((t.split(/\s+/).length / 3.5) * 1000) + 800)
const shuffled = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }
/** a balanced bag of configurations for the racemate basin: as many (S) as (R), in a fresh order. Each pour then
 *  mirrors the model's arms at random and takes the face that gives that configuration, so faces are independent */
const cfgBag = () => shuffled([...Array(RACEMATE.per)].flatMap(() => ['S', 'R']))
/** where the two 8-3c ring stands sit, either side of the altar toward the entrance */
const RING_STANDS = { left: [2.6, -71.2], right: [6.6, -71.2] }
const ARENA = { x: 14, z: [-140, -180] }
/** coloured glass on the altars' crowns */
const WANT84 = 'the door wants: CH₃ and CH₂CH₃ on the same ring face'
const GLASS8 = ['#ffb030', '#5aff8a', '#b46aff', '#5ad0ff']
const flaskSpots = (room) => { const [x, z] = TREES8[room]; return GROVES8[room].map((r, i, a) => { const ang = -Math.PI / 2 + (i / Math.max(1, a.length - 1)) * Math.PI; return [r, x + 2.0 + Math.cos(ang) * 1.2, z + Math.sin(ang) * 2.6] }) }

function Walls({ world }) {
  const parts = useModelParts('orchard')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -138; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -142; z > -178; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -140], [-W, 9, 8]), world.addSolid([W, -9, -140], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -141], [-W, 9, -139]), world.addSolid([W, -9, -141], [ARENA.x, 9, -139]),
      ...Object.values(TREES8).map(([x, z]) => world.addSolid([x - 0.4, 0, z - 0.4], [x + 0.4, 4, z + 0.4])),
      ...Object.values(ALTAR8_POS).map(([x, z]) => world.addSolid([x - 0.6, 0, z - 0.6], [x + 0.6, 1.2, z + 0.6])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="g8_wall" items={items} />
}

/** whatever Kai is carrying, floating over his head */
function Carried({ world, what, label, color }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.3 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!what) return null
  return (
    <group ref={g}>
      <mesh><cylinderGeometry args={[0.12, 0.12, 0.42, 12]} /><meshStandardMaterial color="#e8f8f4" transparent opacity={0.5} /></mesh>
      <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.28, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} /></mesh>
      <pointLight color={color} intensity={1.4} distance={3.5} />
      <Tag position={[0, 0.5, 0]} df={9}>{label}</Tag>
    </group>
  )
}

const BRASS8 = { color: '#c8a050', metalness: 0.8, roughness: 0.35 }

/** the hothouse floor: terracotta tiles of slightly varied tone with pale grout (a canvas texture), and planter beds
 *  of ferns along both glass walls, outside the Leviathan's ring */
const PLANTERS8 = [-146, -152, -158, -164, -170, -176].flatMap((z) => [-1, 1].map((sd) => [sd * (ARENA.x - 0.75), z]))
function BossFloor({ world }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'), n = 8, px = 32
    c.width = c.height = n * px
    const g = c.getContext('2d')
    g.fillStyle = '#c8b898'; g.fillRect(0, 0, c.width, c.height)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const k = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, v = k - Math.floor(k), dark = (i + j) % 2
      g.fillStyle = `hsl(${16 + v * 10}, ${42 + v * 14}%, ${(dark ? 34 : 42) + v * 7}%)`
      g.fillRect(i * px + 1.5, j * px + 1.5, px - 3, px - 3)
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set((2 * ARENA.x) / 8, 40 / 8); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    return t
  }, [])
  useEffect(() => { const ids = PLANTERS8.map(([x, z]) => world.addSolid([x - 0.6, 0, z - 1.3], [x + 0.6, 0.7, z + 1.3])); return () => ids.forEach((i) => world.remove(i)) }, [world])
  return (
    <group>
      <mesh position={[0, -0.01, -160]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial map={tex} roughness={0.85} /></mesh>
      {PLANTERS8.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[1.2, 0.7, 2.6]} /><meshStandardMaterial color="#8a5a3a" roughness={0.9} /></mesh>
          <mesh position={[0, 0.66, 0]}><boxGeometry args={[1.3, 0.08, 2.7]} /><meshStandardMaterial color="#6a665c" roughness={0.9} /></mesh>
          <mesh position={[0, 0.71, 0]}><boxGeometry args={[1.0, 0.04, 2.4]} /><meshStandardMaterial color="#3a2a1a" roughness={1} /></mesh>
          {[-0.75, 0, 0.75].map((dz, j) => (
            <group key={j} position={[0, 0.72, dz]} rotation={[0, (i + j) * 1.3, 0]}>
              {[0, 1, 2, 3, 4].map((f) => <mesh key={f} position={[Math.sin(f * 1.26) * 0.18, 0.28, Math.cos(f * 1.26) * 0.18]} rotation={[Math.cos(f * 1.26) * 0.7, 0, -Math.sin(f * 1.26) * 0.7]}><coneGeometry args={[0.1, 0.7, 4]} /><meshStandardMaterial color={j === 1 ? '#3a8a4a' : '#4aa05a'} roughness={0.8} /></mesh>)}
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

/** the hothouse roof: a glass barrel vault on iron arches over the boss arena, with glass end walls */
function GlassRoof() {
  const R = ARENA.x, z0 = (ARENA.z[0] + ARENA.z[1]) / 2, len = ARENA.z[0] - ARENA.z[1]
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfeee0', emissive: '#4a7a68', emissiveIntensity: 0.45, transparent: true, opacity: 0.42, roughness: 0.12, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }), [])
  const iron = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e3a30', metalness: 0.7, roughness: 0.4 }), [])
  const arches = []
  for (let z = ARENA.z[0] - 0.2; z >= ARENA.z[1]; z -= 4) arches.push(z)
  return (
    <group>
      <mesh position={[0, 7, z0]} rotation={[-Math.PI / 2, 0, 0]} material={glass}><cylinderGeometry args={[R, R, len, 28, 1, true, -Math.PI / 2, Math.PI]} /></mesh>
      {[ARENA.z[0] - 0.1, ARENA.z[1] + 0.1].map((z) => <mesh key={z} position={[0, 7, z]} material={glass}><circleGeometry args={[R, 28, 0, Math.PI]} /></mesh>)}
      {/* the far end wall: a stone footing, glass panes and iron mullions up to the vault */}
      <mesh position={[0, 0.5, ARENA.z[1] + 0.3]}><boxGeometry args={[2 * R, 1.0, 0.6]} /><meshStandardMaterial color="#8a8478" roughness={0.9} /></mesh>
      <mesh position={[0, 4, ARENA.z[1] + 0.1]} material={glass}><planeGeometry args={[2 * R, 6]} /></mesh>
      {[...Array(15)].map((_, k) => <mesh key={'m' + k} position={[-R + k * 2, 4, ARENA.z[1] + 0.15]} material={iron}><boxGeometry args={[0.14, 6, 0.14]} /></mesh>)}
      {[1.2, 4.0, 6.9].map((y) => <mesh key={'r' + y} position={[0, y, ARENA.z[1] + 0.15]} material={iron}><boxGeometry args={[2 * R, 0.12, 0.14]} /></mesh>)}
      {arches.map((z) => <mesh key={z} position={[0, 7, z]} material={iron}><torusGeometry args={[R - 0.05, 0.12, 6, 32, Math.PI]} /></mesh>)}
      {[1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI; return <mesh key={k} position={[Math.cos(a) * (R - 0.08), 7 + Math.sin(a) * (R - 0.08), z0]} rotation={[0, 0, a]} material={iron}><boxGeometry args={[0.16, 0.16, len]} /></mesh> })}
      {/* lanterns hanging from the vault */}
      {[-150, -162, -174].flatMap((z) => [-5, 5].map((x) => (
        <group key={z + '' + x} position={[x, 0, z]}>
          <mesh position={[0, 11.5, 0]} material={iron}><cylinderGeometry args={[0.02, 0.02, 7, 4]} /></mesh>
          <mesh position={[0, 7.8, 0]}><sphereGeometry args={[0.26, 10, 8]} /><meshStandardMaterial color="#d8ffd0" emissive="#b8ffb0" emissiveIntensity={2.2} toneMapped={false} /></mesh>
          {/* a brass lantern frame: a cap, a foot ring and four ribs round the glow */}
          <mesh position={[0, 8.28, 0]}><coneGeometry args={[0.42, 0.34, 8]} /><meshStandardMaterial {...BRASS8} /></mesh>
          <mesh position={[0, 8.08, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.36, 0.035, 5, 16]} /><meshStandardMaterial {...BRASS8} /></mesh>
          <mesh position={[0, 7.42, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.3, 0.04, 5, 16]} /><meshStandardMaterial {...BRASS8} /></mesh>
          {[0, 1, 2, 3].map((k) => { const a = (k * Math.PI) / 2 + Math.PI / 4; return <mesh key={k} position={[Math.sin(a) * 0.34, 7.75, Math.cos(a) * 0.34]}><boxGeometry args={[0.04, 0.66, 0.04]} /><meshStandardMaterial {...BRASS8} /></mesh> })}
          <mesh position={[0, 7.3, 0]}><coneGeometry args={[0.12, 0.2, 8]} /><meshStandardMaterial {...BRASS8} /></mesh>
        </group>
      )))}
      <pointLight position={[0, 9, -156]} color="#e8ffe0" intensity={14} distance={30} />
      <pointLight position={[0, 9, -170]} color="#e8ffe0" intensity={14} distance={30} />
    </group>
  )
}

/** an ethylene / propylene pod: two carbons and their double bond (big: a CH3 on the right carbon) */
function CC({ dim, color = '#e8f0ff', glow = '#8ab0ff', big = false }) {
  const m = { color: dim ? '#5a5a5a' : color, emissive: glow, emissiveIntensity: dim ? 0 : 0.6 }
  return (
    <group>
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.3, 0, 0]}><sphereGeometry args={[big && sd > 0 ? 0.24 : 0.2, 14, 10]} /><meshStandardMaterial {...m} /></mesh>)}
      {[-0.08, 0.08].map((dy) => <mesh key={dy} position={[0, dy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.4, 8]} /><meshStandardMaterial color={dim ? '#3a3a3a' : '#5ff0ff'} emissive="#2ab0d0" emissiveIntensity={dim ? 0 : 0.9} /></mesh>)}
      {big && <>
        <mesh position={[0.52, 0.18, 0]} rotation={[0, 0, -1.0]}><cylinderGeometry args={[0.04, 0.04, 0.3, 8]} /><meshStandardMaterial color="#c8c8c8" /></mesh>
        <mesh position={[0.66, 0.28, 0]}><sphereGeometry args={[0.15, 12, 8]} /><meshStandardMaterial {...m} /></mesh>
      </>}
    </group>
  )
}

/** a racemate lock: a brass plate with a raised rim, a keyhole, and a big curling arrow, left for (S), right for (R) */
function LockPlate({ cfg, n, per }) {
  const brass = { color: '#d8a848', metalness: 0.85, roughness: 0.3, emissive: '#4a3008', emissiveIntensity: 0.3 }
  const glow = cfg === 'S' ? '#7ae8ff' : '#ffb07a'
  return (
    <group>
      <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.0, 0.5, 0.6]} /><meshStandardMaterial color="#7a766c" roughness={0.9} /></mesh>
      <mesh position={[0, 1.05, 0]}><boxGeometry args={[1.1, 1.3, 0.16]} /><meshStandardMaterial {...brass} /></mesh>
      {[[0, 1.67, 1.2, 0.1], [0, 0.43, 1.2, 0.1], [-0.57, 1.05, 0.1, 1.34], [0.57, 1.05, 0.1, 1.34]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.06]}><boxGeometry args={[w, h, 0.12]} /><meshStandardMaterial color="#8a6420" metalness={0.8} roughness={0.35} /></mesh>)}
      <mesh position={[0, 1.79, 0]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial {...brass} /></mesh>
      {/* the curling arrow (mirrored for R) */}
      <group position={[0, 1.22, 0.1]} scale={[cfg === 'R' ? -1 : 1, 1, 1]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.27, 0.045, 6, 24, Math.PI * 1.5]} /><meshStandardMaterial color="#fff0c0" emissive={glow} emissiveIntensity={1.0} /></mesh>
        <mesh position={[0.27, 0.04, 0]}><coneGeometry args={[0.1, 0.2, 8]} /><meshStandardMaterial color="#fff0c0" emissive={glow} emissiveIntensity={1.0} /></mesh>
      </group>
      {/* the keyhole */}
      <mesh position={[0, 1.22, 0.09]}><circleGeometry args={[0.07, 12]} /><meshBasicMaterial color="#120c06" /></mesh>
      <mesh position={[0, 1.13, 0.09]}><planeGeometry args={[0.06, 0.16]} /><meshBasicMaterial color="#120c06" /></mesh>
      {[...Array(per)].map((_, k) => <mesh key={k} position={[(k - (per - 1) / 2) * 0.35, 0.7, 0.1]}><boxGeometry args={[0.22, 0.16, 0.05]} /><meshStandardMaterial color={k < n ? '#9affb8' : '#2a2430'} emissive={k < n ? '#2a8a4a' : '#000'} emissiveIntensity={0.7} /></mesh>)}
    </group>
  )
}

/**
 * the 1-butene cation over the racemate basin (C2 of the 2-butyl cation), drawn flat in the horizontal plane:
 * H points -z (toward the boss gate, away from a player walking in), CH₂CH₃ to -x (their left), CH₃ to +x (their right).
 * While a 2-butanol is carried, its OH sits on the face the water came from (up = top, down = bottom), so the player
 * can name it by CIP from the model. Geometry checked: OH up here is (S), OH down (R), matching Fig 8.13.
 */
// [label, x, z, colour, radius, tag colour]; CH₂CH₃ is a big orange two-ball arm, CH₃ a small teal ball, H a small white one.
// `mirror` swaps the CH₃ and CH₂CH₃ sides (a fresh draw on each pour), which swaps which face gives (S)
const CATION_ARMS = [['H', 0, -1, '#f4f4f4', 0.13, '#ffffff'], ['CH₂CH₃', -0.87, 0.5, '#ff9a3a', 0.24, '#ffb870'], ['CH₃', 0.87, 0.5, '#2ad0c0', 0.15, '#7af0e0']]
function CationModel({ oh, mirror }) {
  const L = 0.75
  return (
    <group scale={1.3}>
      <mesh><sphereGeometry args={[0.2, 14, 10]} /><meshStandardMaterial color="#4a4a52" emissive={oh ? '#000' : '#5a2a8a'} emissiveIntensity={0.6} /></mesh>
      {/* the empty p orbital, open above and below while the cation is flat */}
      {!oh && [1, -1].map((s) => <mesh key={s} position={[0, s * 0.42, 0]} scale={[0.55, 1, 0.55]}><sphereGeometry args={[0.32, 12, 10]} /><meshStandardMaterial color="#c9a3ff" transparent opacity={0.25} depthWrite={false} /></mesh>)}
      {CATION_ARMS.map(([lab, x0, z, c, r, tc]) => {
        const x = lab === 'H' || !mirror ? x0 : -x0
        const et = lab === 'CH₂CH₃'
        return (
          <group key={lab}>
            <mesh position={[(x * L) / 2, 0, (z * L) / 2]} rotation={[Math.PI / 2, 0, Math.atan2(-x, z)]}><cylinderGeometry args={[0.05, 0.05, L, 8]} /><meshStandardMaterial color="#d8d0c0" /></mesh>
            <mesh position={[x * L, 0, z * L]}><sphereGeometry args={[r, 14, 10]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} /></mesh>
            {/* the ethyl's second carbon, so the long arm reads as longer even without its tag */}
            {et && <mesh position={[x * (L + 0.36), 0, z * (L + 0.36)]}><sphereGeometry args={[0.19, 12, 10]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.35} /></mesh>}
            {/* the H tag rides higher, so with the OH on (H pointing away) it doesn't sit on C */}
            <Tag position={[x * (L + (et ? 0.75 : 0.4)), lab === 'H' ? 0.42 : 0.22, z * (L + (et ? 0.75 : 0.4))]} df={11} near={1.5} far={18}><b style={{ color: tc, fontSize: 14 }}>{lab}</b></Tag>
          </group>
        )
      })}
      {oh && (
        <group position={[0, oh === 'top' ? L : -L, 0]}>
          <mesh position={[0, oh === 'top' ? -L / 2 : L / 2, 0]}><cylinderGeometry args={[0.05, 0.05, L, 8]} /><meshStandardMaterial color="#d8d0c0" /></mesh>
          <mesh><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color="#ff5a5a" emissive="#8a1a1a" emissiveIntensity={0.5} /></mesh>
          <Tag position={[0, oh === 'top' ? 0.35 : -0.35, 0]} df={11} near={1.5} far={18}><b style={{ color: '#ff8a8a', fontSize: 14 }}>OH</b></Tag>
        </group>
      )}
      {!oh && <Tag position={[0, 0.25, 0]} df={11} near={1.5} far={18}>C⁺</Tag>}
    </group>
  )
}

/** a 1,2-dimethylcyclohexane ring for the 8-3c stands: flat hexagon, CH₃ (teal) on two neighbouring carbons, each
 *  with its H on the other face. cis: both CH₃ up; trans: one up, one down. Unlabelled, and slowly turning */
function RingModel({ cis }) {
  const g = useRef()
  useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.5 })
  const R = 0.5
  const pts = [...Array(6)].map((_, k) => [Math.cos((k * Math.PI) / 3) * R, Math.sin((k * Math.PI) / 3) * R])
  const subs = [[0, 1], [1, cis ? 1 : -1]] // [carbon index, CH₃ face]
  return (
    <group ref={g} scale={1.3}>
      {pts.map(([x, z], k) => {
        const [x2, z2] = pts[(k + 1) % 6], mx = (x + x2) / 2, mz = (z + z2) / 2
        return (
          <group key={k}>
            <mesh position={[x, 0, z]}><sphereGeometry args={[0.1, 12, 8]} /><meshStandardMaterial color="#9a9aa8" emissive="#5a5a6a" emissiveIntensity={0.35} /></mesh>
            <mesh position={[mx, 0, mz]} rotation={[Math.PI / 2, 0, Math.atan2(-(x2 - x), z2 - z)]}><cylinderGeometry args={[0.035, 0.035, R, 6]} /><meshStandardMaterial color="#d8d0c0" /></mesh>
          </group>
        )
      })}
      {subs.map(([k, f]) => {
        const [x, z] = pts[k]
        return (
          <group key={k} position={[x, 0, z]}>
            <mesh position={[0, f * 0.22, 0]}><cylinderGeometry args={[0.035, 0.035, 0.44, 6]} /><meshStandardMaterial color="#d8d0c0" /></mesh>
            <mesh position={[0, f * 0.46, 0]}><sphereGeometry args={[0.13, 12, 8]} /><meshStandardMaterial color="#2ad0c0" emissive="#2ad0c0" emissiveIntensity={0.4} /></mesh>
            <mesh position={[0, -f * 0.16, 0]}><cylinderGeometry args={[0.025, 0.025, 0.32, 6]} /><meshStandardMaterial color="#d8d0c0" /></mesh>
            <mesh position={[0, -f * 0.34, 0]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#f4f4f4" /></mesh>
          </group>
        )
      })}
    </group>
  )
}

/** a 2-pentene drawn for an altar tag: C=C across the middle, CH₃ on the left carbon, CH₂CH₃ on the right; cis puts
 *  both on the top side, trans puts CH₂CH₃ underneath. No name, so the door can't be matched by words */
function PenteneArt({ cis }) {
  return (
    <svg width="160" height="60" viewBox="0 0 160 60" style={{ display: 'block' }}>
      <g stroke="#e8e8f0" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="50" y1="27" x2="82" y2="27" /><line x1="50" y1="33" x2="82" y2="33" />
        <line x1="50" y1="30" x2="36" y2="14" /><line x1="50" y1="30" x2="36" y2="46" />
        <line x1="82" y1="30" x2="96" y2={cis ? 14 : 46} /><line x1="82" y1="30" x2="96" y2={cis ? 46 : 14} />
      </g>
      <g fontSize="12" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
        <text x="33" y="14" textAnchor="end" fill="#7af0e0">CH₃</text>
        <text x="33" y="54" textAnchor="end" fill="#e8e8f0">H</text>
        <text x="99" y={cis ? 14 : 54} fill="#ffb870">CH₂CH₃</text>
        <text x="99" y={cis ? 54 : 14} fill="#e8e8f0">H</text>
      </g>
    </svg>
  )
}

/** the chain barn's dressing: hay, crates and wall lanterns against the planters */
const HAY8 = [[-9.3, 0, -117], [-9.3, 0.8, -117.3], [9.3, 0, -128], [-9.3, 0, -132]]
const CRATES8 = [[9.3, -118], [9.3, -119.1], [-9.3, -125], [9.3, -137]]
function BarnDressing({ world }) {
  useEffect(() => {
    const ids = [...HAY8.filter(([, y]) => y === 0).map(([x, , z]) => world.addSolid([x - 0.65, 0, z - 0.45], [x + 0.65, 1.6, z + 0.45])), ...CRATES8.map(([x, z]) => world.addSolid([x - 0.45, 0, z - 0.45], [x + 0.45, 0.9, z + 0.45]))]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return (
    <group>
      {HAY8.map(([x, y, z], i) => (
        <group key={'h' + i} position={[x, y, z]} rotation={[0, i * 0.3, 0]}>
          <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.2, 0.8, 0.8]} /><meshStandardMaterial color="#d8b860" roughness={1} /></mesh>
          {[-0.3, 0.3].map((dx) => <mesh key={dx} position={[dx, 0.4, 0]}><boxGeometry args={[0.05, 0.82, 0.82]} /><meshStandardMaterial color="#8a6a30" /></mesh>)}
        </group>
      ))}
      {CRATES8.map(([x, z], i) => (
        <group key={'c' + i} position={[x, 0, z]} rotation={[0, i * 0.4, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.9, 0.9, 0.9]} /><meshStandardMaterial color="#8a6040" roughness={0.9} /></mesh>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.94, 0.12, 0.94]} /><meshStandardMaterial color="#5a3a20" /></mesh>
          <mesh position={[0, 0.45, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[1.2, 0.08, 0.92]} /><meshStandardMaterial color="#5a3a20" /></mesh>
        </group>
      ))}
      {[-119, -126, -131, -137].flatMap((z) => [-1, 1].map((sd) => (
        <group key={z + '' + sd} position={[sd * 10.1, 3.3, z]}>
          <mesh position={[-sd * 0.25, 0.35, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.03, 0.03, 0.5, 4]} /><meshStandardMaterial color="#2e2a24" /></mesh>
          <mesh position={[-sd * 0.5, 0, 0]}><boxGeometry args={[0.26, 0.36, 0.26]} /><meshStandardMaterial color="#3a3226" metalness={0.5} /></mesh>
          <mesh position={[-sd * 0.5, 0, 0]}><boxGeometry args={[0.2, 0.28, 0.28]} /><meshStandardMaterial color="#ffd890" emissive="#ffb040" emissiveIntensity={2.0} toneMapped={false} /></mesh>
        </group>
      )))}
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

function GlassLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const sparkFly = useRef(false) // keeps the beaten Leviathan mounted while its spark flies east (a ref, so the render markSolved forces already sees it)
  const [, bumpSpark] = useState(0)
  const bossStarted = useRef(false)
  const [frag, setFrag] = useState(null) // a carried fragment in the shears room
  const fragRef = useRef(null)
  fragRef.current = frag
  const [chain, setChain] = useState(null) // { n, used: [] } while carrying a growing chain in the barn
  const chainRef = useRef(null)
  chainRef.current = chain
  const [barnPh, setBarnPh] = useState(false)
  const barnPhRef = useRef(false)
  barnPhRef.current = barnPh
  const [boranaHere, setBoranaHere] = useState(false)
  // the shears' halves sit on shuffled pedestals, drawn once per visit
  const [halfSpot] = useState(() => shuffled(SHEAR_HALVES.map((_, i) => i)))
  // the racemate gate: the 2-butanol being carried (its face), the locks' counts, and the bag of faces still to come
  const [coin, setCoin] = useState(null)
  const coinRef = useRef(null)
  coinRef.current = coin
  // the lock counts persist in the save (t8race), so Continue mid-gate keeps them
  const [locks, setLocks] = useState(() => ({ S: 0, R: 0, ...(getState().save.t8race || {}) }))
  const locksRef = useRef(locks)
  locksRef.current = locks
  const [mirror, setMirror] = useState(false) // the cation model's arms: CH₃/CH₂CH₃ swapped (redrawn on each pour)
  const mirrorRef = useRef(false)
  mirrorRef.current = mirror
  const bagRef = useRef(null)
  // the bag holds only the configurations still to come (a reload mid-gate keeps it balanced)
  if (!bagRef.current) bagRef.current = shuffled(['S', 'R'].flatMap((c) => [...Array(Math.max(0, RACEMATE.per - locks[c]))].map(() => c)))
  const alt = save.t8alt || {}
  const flask = save.t8flask || null
  const placedHalves = save.t8halves || {}

  useEffect(() => {
    world.map = {
      floor: '#a8c8a0', wall: '#3a4a34', pit: '#1a2414',
      labels: ROOMS8.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t8-map']) return null; const seen = sv.t8seen || {}; return ROOMS8.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t8-compass']) return null
        const g = GOALS8.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 8) return { pos: [0, -174], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Orchards' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('glasshouse')
    world.killY = -8
    const f = [world.addFloor(-W, -140, W, 8, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -139, 0)]
    const HINTS = {
      '8-1': 'Wraiths with golden shields. And a tree full of bromine. Hit them from behind!',
      '8-2': 'Two doors, one alkene, three flasks that add water. Read the doors.',
      '8-3': 'Three doors. Some want cis, one wants trans. Read each altar.',
      '8-4': 'Giant shears! They cut double bonds in half.',
      '8-5': 'A barn full of ethylene. Something here grows on its own.',
    }
    const t = ROOMS8.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t8seen || {}
      saveGame({ checkpoint: { scene: 'glasshouse', room: r.id }, t8seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -146], [6, 6, -142], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t8-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Orchards', onInteract: () => onExit('orchard', { scene: 'orchard', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -88.9], radius: 2.2, label: () => (has('t8-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -138.9], radius: 2.4, label: () => (has('t8-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlockBossDoor() }),
      world.addInteractable({ pos: [SHEARS.pos[0], 0, SHEARS.pos[1] + 1.3], radius: 1.8, label: () => (getState().save.t8cut ? null : 'Cut the alkene with the ozone shears'), onInteract: () => cut() }),
    ]
    // the grove trees: one flask each
    Object.keys(TREES8).forEach((room) => flaskSpots(room).forEach(([rg, x, z]) => {
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.0, label: () => (getState().save.hasSatchel && getState().save.t8flask !== rg ? `Take the flask: ${REAGENTS[rg].name}` : null), onInteract: () => { saveGame({ t8flask: rg }); sfx('pickup') } }))
    }))
    // the altars: pour with G
    const lanterns = ALTARS8.map((a) => {
      const [x, z] = ALTAR8_POS[a.id]
      return world.addLantern({ needs: 'hasSatchel', omni: true, aim: true, pos: [x, 0, z], radius: 2.8, label: () => (has(a.solves || a.id) ? null : getState().save.t8flask ? `Pour ${REAGENTS[getState().save.t8flask].name} on the ${((getState().save.t8alt || {})[a.id] || {}).sub === 'epoxide' ? 'epoxide' : a.spot ? `${a.spot} ${a.title}` : a.title}` : null), onLantern: () => doPour(a) })
    })
    // 8-3c: after the H₂ pour, two unlabelled rings on stands; the player offers the one the pour made
    Object.entries(RING_STANDS).forEach(([side, [x, z]]) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.1, label: () => (((getState().save.t8alt || {})['8-3c'] || {}).pick && !has('8-3c') ? 'Offer this ring to the door' : null), onInteract: () => chooseRing(side) })))
    // the shears room: fragments and pedestals
    SHEAR_HALVES.forEach((h, i) => {
      const [x, z] = SHEARS.halves[halfSpot[i]]
      // pick a half up here, or put the carried one back on its own rack (free)
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.1, label: () => (fragRef.current === h.id ? `Put it back: ${h.label}` : getState().save.t8cut && !fragRef.current && !Object.values(getState().save.t8halves || {}).includes(h.id) && !has('8-4s') ? `Pick up: ${h.label}` : null), onInteract: () => {
        if (fragRef.current === h.id) { setFrag(null); sfx('pickup'); return }
        if (!fragRef.current) { setFrag(h.id); sfx('pickup') }
      } }))
    })
    Object.entries(SHEARS.peds).forEach(([side, [x, z]]) => {
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.3, label: () => (fragRef.current && !(getState().save.t8halves || {})[side] ? `Set it on the ${side} carbon’s pedestal` : null), onInteract: () => placeHalf(side) }))
    })
    // the barn
    const targets = [world.addTarget({ pos: () => [BARN.brazier[0], 0.8, BARN.brazier[1]], radius: 0.8, tall: 1.4, alive: () => !has('8-5p') && !chainRef.current, onHit: () => { setBarnPh(true); sfx('stomp'); toast('The peroxide’s O–O bond breaks: a Ph· radical (initiation). Take it!', 'good', 4200); return true } })]
    ia.push(world.addInteractable({ pos: [BARN.brazier[0], 0, BARN.brazier[1] + 1.3], radius: 1.6, label: () => (barnPhRef.current && !chainRef.current ? 'Take the Ph· radical' : null), onInteract: () => { setBarnPh(false); setChain({ n: 0, used: [] }); sfx('pickup') } }))
    BARN.monomers.forEach(([x, z], i) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.4, label: () => (chainRef.current && !chainRef.current.used.includes(i) ? 'Add this ethylene to your radical' : null), onInteract: () => addMonomer(i) })))
    // the propylene font: which end does the radical bond to? (p. 267)
    ;[['ch2', -1], ['chme', 1]].forEach(([end, sd]) => ia.push(world.addInteractable({ pos: [BARN.propylene[0] + sd * 1.0, 0, BARN.propylene[1]], radius: 0.9, label: () => (chainRef.current && !chainRef.current.prop ? `Bond your radical to the ${end === 'ch2' ? 'CH₂' : 'CHCH₃'} end` : null), onInteract: () => addPropylene(end) })))
    // the racemate gate: a 1-butene basin and two locks (§8.12, Fig 8.13)
    ia.push(world.addInteractable({ pos: [RACE.basin[0], 0, RACE.basin[1]], radius: 1.4, label: () => (!has('8-5race') && !coinRef.current ? 'Add H₂O, H⁺ to the 1-butene' : null), onInteract: () => pourRace() }))
    Object.entries(RACE.locks).forEach(([cfg, [x, z]]) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.2, label: () => (coinRef.current ? `Seat it in the (${cfg}) lock` : null), onInteract: () => seat(cfg) })))
    ia.push(world.addInteractable({ pos: [BARN.other[0], 0, BARN.other[1]], radius: 1.8, label: () => (chainRef.current ? 'Meet the other growing chain' : null), onInteract: () => terminate() }))
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS8.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...lanterns, ...targets].forEach((i) => world.remove(i)) }
  }, [world])

  // the 8-4 room clears when the shears, the riddle and the carbene altar are all done
  useEffect(() => { if (!solved['8-4'] && solved['8-4s'] && solved['8-4back'] && solved['8-4c']) { markSolved('8-4'); sfx('open'); toast('The Shears room is done. The door opens.', 'good', 3000) } }, [solved['8-4s'], solved['8-4back'], solved['8-4c']])

  // ---------------------------------------------------------------- actions
  const doPour = (a) => {
    if (has(a.solves || a.id)) return
    const sv = getState().save
    const rg = sv.t8flask
    if (!rg) { toast('The satchel is empty. Take a flask from the tree.', 'info', 3000); return }
    const all = sv.t8alt || {}
    const sub = (all[a.id] || {}).sub || a.sub
    const r = pour(a, sub, rg)
    saveGame({ t8flask: null })
    sfx('pickup')
    const [px, pz] = ALTAR8_POS[a.id]
    if (!r.product) { sfx('wrong'); world.player.hurt(1, [px, 0, pz], true); toast(r.why, 'warn', readMs(r.why)); return }
    const name = shown(r.product, r.flag)
    if (r.next) { saveGame({ t8alt: { ...all, [a.id]: { sub: r.next, product: r.product, flag: r.flag } } }); const m = `${name}. ${r.why} The door still waits.`; toast(m, 'info', readMs(m)); return }
    if (r.ok && a.pick) {
      // 8-3c: the pour is right, but the door takes the ring itself; draw which stand holds the cis one
      saveGame({ t8alt: { ...all, [a.id]: { sub, product: r.product, flag: r.flag, pick: true, cisLeft: Math.random() < 0.5 } } })
      const m = 'The H₂ is taken up on the catalyst. Two rings rise on the stands; only one is what this pour made. Offer it to the door.'
      toast(m, 'info', readMs(m))
      return
    }
    if (r.ok) {
      // ok: this altar's own pour made the wanted product (a shared goal can also be met at the other altar)
      saveGame({ t8alt: { ...all, [a.id]: { sub, product: r.product, flag: r.flag, ok: true } } }); markSolved(a.solves || a.id); sfx('open')
      const m = `${name}! ${r.why}`
      toast(m, 'good', readMs(m))
      return
    }
    sfx('wrong'); world.player.hurt(1, [px, 0, pz], true)
    saveGame({ t8alt: { ...all, [a.id]: { sub: a.sub, product: r.product, flag: r.flag, wrong: true } } })
    const msg = `You made ${name}. ${r.why} The door wants ${a.wantText || wantShown(a)}.`
    toast(msg, 'warn', readMs(msg))
  }
  const chooseRing = (side) => {
    if (has('8-3c')) return
    const all = getState().save.t8alt || {}
    const st = all['8-3c'] || {}
    if (!st.pick) return
    const [px, pz] = RING_STANDS[side]
    if ((side === 'left') === !!st.cisLeft) {
      saveGame({ t8alt: { ...all, '8-3c': { sub: st.sub, product: st.product, flag: st.flag, ok: true } } }); markSolved('8-3c'); sfx('open')
      const m = 'cis-1,2-dimethylcyclohexane! Both H came from the catalyst’s face, so both CH₃ were pushed to the other face together: syn (§8.6, p. 255).'
      toast(m, 'good', readMs(m))
      return
    }
    sfx('wrong'); world.player.hurt(1, [px, 0, pz], true)
    saveGame({ t8alt: { ...all, '8-3c': {} } })
    const m = 'That ring has its CH₃ groups on opposite faces. Both H came from the catalyst’s face, so they can’t be. The rings sink: pour H₂ again.'
    toast(m, 'warn', readMs(m))
  }
  const cut = () => {
    if (getState().save.t8cut) return
    saveGame({ t8cut: true }); sfx('stomp'); world.shake = 0.3
    toast('Snip! Each carbon now has a C=O. Which two halves fell out?', 'good', 4000)
  }
  const placeHalf = (side) => {
    const id = fragRef.current
    if (!id) return
    const h = SHEAR_HALVES.find((x) => x.id === id)
    if (h.decoy || h.from !== side) {
      sfx('wrong'); setFrag(null)
      const [px, pz] = SHEARS.peds[side]
      world.player.hurt(1, [px, 0, pz], true)
      const msg = h.decoy || 'That half’s C=O carbon came from the other end. Count its methyls.'
      toast(msg, 'warn', readMs(msg))
      return
    }
    const next = { ...(getState().save.t8halves || {}), [side]: id }
    saveGame({ t8halves: next }); setFrag(null); sfx('right')
    if (next.left && next.right) { markSolved('8-4s'); toast(`${shown('Acetone and acetaldehyde', true)}: a trisubstituted alkene gives one ketone and one aldehyde.`, 'good', 5200); return }
    const msg = side === 'left' ? 'Yes. (CH₃)₂C= has two methyls, so its C=O is a ketone: acetone.' : 'Yes. =CHCH₃ keeps its H, so its C=O is an aldehyde: acetaldehyde.'
    toast(msg, 'good', readMs(msg))
  }
  const addMonomer = (i) => {
    const c = chainRef.current
    if (!c || c.used.includes(i)) return
    const n = c.n + 1
    setChain({ ...c, n, used: [...c.used, i] }); sfx('pickup')
    toast(n === 1 ? 'Ph· adds to ethylene: one bond forms, and the radical moves to the end (propagation).' : `Another ethylene: the chain is ${n} long, still a radical at the end.`, 'good', 3600)
  }
  const addPropylene = (end) => {
    const c = chainRef.current
    if (!c || c.prop) return
    if (end !== 'ch2') {
      setChain(null); sfx('wrong'); world.player.hurt(1, [BARN.propylene[0] + 1, 0, BARN.propylene[1]], true)
      toast('That leaves a primary radical, RCH₂·. Only the secondary one forms. Chain lost: strike the brazier again.', 'warn', 5200)
      return
    }
    setChain({ ...c, n: c.n + 1, prop: true }); sfx('pickup')
    toast('CH₂ end: the radical lands on CH, secondary. That’s the one that forms.', 'good', 4000)
  }
  const terminate = () => {
    const c = chainRef.current
    if (!c || has('8-5p')) return
    if (c.n < POLY.need) {
      setChain(null); sfx('wrong')
      toast(`Radicals paired: the chain stops at ${c.n}. Too short. Strike the brazier again.`, 'warn', 4400)
      return
    }
    setChain(null); markSolved('8-5p'); sfx('open')
    toast('Two growing chains meet and their radicals pair: termination. One long polymer, finished.', 'good', 4800)
  }
  // the racemate gate: each pour, water reaches the flat cation from one face, and the model's arms are redrawn (CH₃ and
  // CH₂CH₃ may swap sides), so which face gives (S) changes from pour to pour: the lock has to be read off by CIP.
  // As first drawn, top gives (S) and bottom (R), as in Fig 8.13; mirrored, the other way round (raceCfg)
  const pourRace = () => {
    if (has('8-5race') || coinRef.current) return
    if (!bagRef.current.length) bagRef.current = cfgBag()
    const cfg = bagRef.current.pop()
    const m = Math.random() < 0.5
    const face = ['top', 'bottom'].find((f) => raceCfg(f, m) === cfg)
    setMirror(m); mirrorRef.current = m
    setCoin(face); sfx('pickup')
    toast(`Water came from the ${face}. Read the model.`, 'info', 2600)
  }
  const seat = (cfg) => {
    const face = coinRef.current
    if (!face) return
    const L = locksRef.current
    if (raceCfg(face, mirrorRef.current) !== cfg) {
      // a wrong seat empties both locks; the toast doesn't say which lock was right
      setCoin(null); setLocks({ S: 0, R: 0 }); saveGame({ t8race: { S: 0, R: 0 } }); bagRef.current = cfgBag(); sfx('wrong')
      const [px, pz] = RACE.locks[cfg]
      world.player.hurt(1, [px, 0, pz], true)
      const m = 'Wrong lock, and both locks spill empty. Stand so the H points away from you, find OH, CH₂CH₃ and CH₃ on the model, and trace 1 → 2 → 3.'
      toast(m, 'warn', readMs(m))
      return
    }
    const next = { ...L, [cfg]: L[cfg] + 1 }
    setLocks(next); setCoin(null); saveGame({ t8race: next }); sfx('right')
    toast(`(${cfg}) seated. ${next.S + next.R}/${2 * RACEMATE.per}`, 'good', 1800)
    if (next.S >= RACEMATE.per && next.R >= RACEMATE.per) {
      markSolved('8-5race'); sfx('open')
      toast('Two (R), two (S): equal amounts. Achiral reactants give a racemate (§8.12).', 'good', 4400)
    }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: Water is water. Every way of adding it to a double bond gives the same alcohol.' },
      { who: 'Pi', text: 'Borana pinned a note under it: “Prove it.”' },
    ])
    markSolved('t8-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t8-door')) return
    if (!getState().save.t8key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t8key: false }); markSolved('t8-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t8-bossdoor')) return
    if (!has('t8-bosskey')) { toast('A glass door clouded violet. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t8-bossdoor'); sfx('open'); toast('The Boss Key turns. Something long is moving in the hothouse…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't8-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't8-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't8-key') { saveGame({ t8key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't8-satchel') {
      saveGame({ hasSatchel: true })
      await itemGet(world, { model: 'borana', name: 't8_satchel', scale: 2.0, color: '#7ae8ff' }, [
        { who: '', text: 'You got the Reagent Satchel!' },
        { who: 'Pi', text: 'Pick a flask (E), pour it on an altar (G). One at a time!' },
        { who: 'Pi', text: 'Most flasks make something. Read the door first, so it makes the right thing!' },
      ])
    }
    if (id === 't8-bosskey') { saveGame({ t8bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss8') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -143]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t8bossIntro) {
      saveGame({ t8bossIntro: true })
      // frame the radical head and the violet spark riding it (enemies hold still while Pi talks)
      const q = world.leviSpark
      world.camOverride = q ? { pos: [q.x + 3, 3.4, q.z + 7], look: [q.x, q.y - 0.4, q.z] } : { pos: [4, 6, -144], look: [LEVI.center[0], 1, LEVI.center[2]] }
      await say([
        { who: 'Pi', text: 'The spark’s riding its head! A radical, eating eggs. Every one’s another segment.' },
        { who: 'Pi', text: 'You can’t cut a growing chain. You have to end it. Two radicals pair up and stop!' },
        { who: 'Pi', text: 'Hit that peroxide vent, grab the radical, and take it to the head!' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Vent, radical, head. End the chain!' }])
    busy.current = false
  }
  const bossDown = async () => {
    sparkFly.current = true // the Leviathan stays mounted until its spark has flown
    markSolved('boss8')
    playMusic('glasshouse')
    // from well back on the west side (inside the glass walls): the spark flies east and up, away from the camera.
    // The look leads the spark a little and stays below it, so the fading Leviathan and the roof both stay in frame.
    const q0 = world.leviSpark
    const hx = q0 ? q0.x : 0, hz = q0 ? q0.z : -160
    const camPos = [Math.max(-ARENA.x + 1.5, hx - 12), 3.5, Math.min(ARENA.z[0] - 1.5, Math.max(ARENA.z[1] + 1.5, hz + 9))]
    const lookAt = (q) => [q.x + 1.5, 1.5 + (q.y - 1.5) * 0.65, q.z]
    world.camOverride = { pos: camPos, look: q0 ? lookAt(q0) : [0, 2, -160] }
    const follow = setInterval(() => { const q = world.leviSpark; if (q) world.camOverride = { pos: camPos, look: lookAt(q) } }, 16)
    // the spark vanishes at ~3.2 s: hand the camera back to Kai then, even if Pi's line is still open
    const flight = new Promise((r) => setTimeout(() => { clearInterval(follow); world.camOverride = null; r() }, 3200))
    setTimeout(() => { sparkFly.current = false; bumpSpark((n) => n + 1) }, 3400)
    await Promise.all([say([{ who: 'Pi', text: 'The spark tore free! Up through the roof, east toward those cliffs.' }]), flight])
    clearInterval(follow)
    world.camOverride = null
    await say([
      { who: 'Pi', text: 'Quiet now. Just polyethylene. He was the radical all along!' },
      { who: 'Pi', text: 'Now, the shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 8 || busy.current) return
    busy.current = true
    sfx('shard')
    setBoranaHere(true)
    if (world.player) world.player.teleport([0, 0, -172.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -172.4], 3.8, Math.PI / 2)
    await say([{ who: 'Alchemist Borana', text: 'Before you pocket that. One question. Then I’ll believe you were paying attention.' }])
    let wrong = null
    const ok = await openPanel('leviCheck', { onWrong: (t) => { wrong = t } })
    if (!ok && wrong) { world.player.hurt(1, [-2.2, 0, -172.4], true); toast(wrong, 'warn', readMs(wrong)) }
    if (!ok) { await say([{ who: 'Alchemist Borana', text: 'Think. Then come back.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 8, checkpoint: { scene: 'orchard', at: 'gate' } })
    setState({ objective: 'Bond Shard 8 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… eight. The orchards are fruiting again. I can see them from my window.' },
      { who: 'Princess Octavia', text: 'He said water is water. You opened two doors with it.' },
      { who: 'Alchemist Borana', text: 'Keep the satchel. Lindlar’s cliffs are east. Bring her something to argue about.' },
      { who: 'Pi', text: 'Eight down, four to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'orchard', at: 'gate' }, card: 8 })
    busy.current = false
    onExit('orchard', { scene: 'orchard', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -174], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss8 && (getState().save.shards || 0) < 8)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  // boss camera: about 7 m back and 5 m up (base 6.2 + 1.8 at a 0.45 pitch), so Kai, the eggs and the glass read
  // (pitch lowered a little from 0.45, with the look raised, so the vault's lower ribs show over the floor)
  // At the racemate basin: closer, higher (looking over Kai's head) and aimed up at the model, so the cation, both locks and Kai frame and the
  // nearest copper tank drops out of shot. Pi moves to a fixed spot past the basin's right side, off the model
  const nearBasin = useRef(false)
  useFrame(() => {
    const p = world.player
    const near = !!(p && !getState().save.solved['8-5race'] && Math.hypot(p.pos.x - RACE.basin[0], p.pos.z - RACE.basin[1]) < 3.2)
    if (near !== nearBasin.current) { nearBasin.current = near; world.piAside = near ? [RACE.basin[0] + 2.6, 1.6, RACE.basin[1] - 0.6] : false }
    world.camBoost = world.bossCam ? { dist: 1.8, pitchSet: 0.37, lookY: 1.1 } : near ? { dist: -0.8, pitchSet: 0.6, lookY: 0.9 } : null
  })
  useEffect(() => () => { world.piAside = false; world.camBoost = null }, [world])
  // Kai's stance tag sits on the altar drawings and crowns (and on the cation model): hide it near an unsolved altar or the basin
  const nearAltar = useRef(false)
  useFrame(() => {
    const p = world.player
    if (!p) return
    const sv = getState().save.solved
    const near = ALTARS8.some((a) => { const [x, z] = ALTAR8_POS[a.id]; return !sv[a.solves || a.id] && Math.hypot(p.pos.x - x, p.pos.z - z) < 3 }) || nearBasin.current
    if (near !== nearAltar.current) { nearAltar.current = near; setState({ hideFormTag: near }) }
  })
  useEffect(() => () => setState({ hideFormTag: false }), [])
  // Kai's stance tag would sit on top of whatever he carries: hide it while he carries anything
  useEffect(() => { setState({ carrying: !!(flask || frag || chain || coin) }) }, [flask, frag, chain, coin])
  useEffect(() => () => setState({ carrying: false }), [])

  const fl = flask ? REAGENTS[flask] : null
  return (
    <group>
      <color attach="background" args={['#14201a']} />
      <fog attach="fog" args={['#1e2e24', 18, 70]} />
      <hemisphereLight args={['#e8ffe8', '#1e2e24', 0.9]} />
      <ambientLight intensity={0.35} color="#e8fff0" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#f0fff0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <mesh position={[0, -0.01, -66]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, 148]} /><meshStandardMaterial color="#8a9a7a" roughness={0.9} /></mesh>
      <BossFloor world={world} />
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -26, -40, -52, -70, -84, -98, -110, -122, -134].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#b8ffb0" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3a2a" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t8-map']} onOpen={() => openChest('t8-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>Borana’s Glasshouse</Tag>

      {/* the grove trees and their flasks */}
      <Suspense fallback={null}>
        {Object.entries(TREES8).map(([room, [x, z]]) => <Part key={room} model="orchard" name="g8_tree" position={[x, 0, z]} />)}
      </Suspense>
      {Object.keys(TREES8).map((room) => flaskSpots(room).map(([rg, x, z]) => (
        <group key={room + rg} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.25, 0.3, 0.8, 10]} /><meshStandardMaterial color="#6a5a3a" /></mesh>
          {flask !== rg && <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.36, 10]} /><meshStandardMaterial color={REAGENTS[rg].color} emissive={REAGENTS[rg].color} emissiveIntensity={0.7} transparent opacity={0.9} /></mesh>}
          <Tag position={[0, 1.7, 0]} df={8} far={10}>{REAGENTS[rg].name}</Tag>
        </group>
      )))}
      <Carried world={world} what={flask} label={fl ? fl.name : ''} color={fl ? fl.color : '#fff'} />

      {/* altars and doors */}
      {ALTARS8.map((a) => {
        const [x, z] = ALTAR8_POS[a.id]
        const st = alt[a.id] || {}
        const done = !!solved[a.solves || a.id]
        // green only when this altar's own pour made the wanted product; a goal met at the other altar leaves it neutral
        const won = done && !st.wrong && (!a.solves || st.ok)
        const pname = st.product ? shown(st.product, st.flag) : null
        return (
          <group key={a.id} position={[x, 0, z]}>
            <Suspense fallback={null}><Part model="orchard" name="g8_altar" /></Suspense>
            {/* a carved octagonal crown, four coloured glass prisms, and a little brazier on an arm */}
            <mesh position={[0, 1.33, 0]} rotation={[Math.PI / 2, 0, Math.PI / 8]}><torusGeometry args={[0.72, 0.07, 4, 8]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.35} /></mesh>
            {[0, 1, 2, 3].map((k) => { const ga = (k / 4) * Math.PI * 2 + Math.PI / 4, gc = GLASS8[(k + ALTARS8.indexOf(a)) % GLASS8.length]; return <mesh key={k} position={[Math.sin(ga) * 0.72, 1.55, Math.cos(ga) * 0.72]}><cylinderGeometry args={[0.05, 0.09, 0.4, 6]} /><meshStandardMaterial color={gc} emissive={gc} emissiveIntensity={0.9} transparent opacity={0.85} /></mesh> })}
            <group position={[0.95, 0, 0]}>
              <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.05, 0.07, 0.9, 6]} /><meshStandardMaterial color="#3a3226" metalness={0.6} /></mesh>
              <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.2, 0.12, 0.14, 10]} /><meshStandardMaterial color="#3a3226" metalness={0.6} /></mesh>
              <mesh position={[0, 1.13, 0]}><coneGeometry args={[0.12, 0.3, 8]} /><meshStandardMaterial color="#ffb050" emissive="#ff7a1a" emissiveIntensity={2.2} toneMapped={false} /></mesh>
            </group>
            <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color={won ? '#9affb8' : !done && st.wrong ? '#ff9a8a' : '#d8d0e8'} emissive={won ? '#2a8a4a' : !done && st.wrong ? '#8a2a2a' : '#3a3a5a'} emissiveIntensity={0.7} /></mesh>
            {/* kept low, and only for nearby altars, so the tags sit under the toast band rather than in it */}
            <Tag position={[0, a.art ? 2.6 : 2.05, 0]} df={10} far={12} className={won ? 'ok-tag' : ''}>{won ? pname || a.title : done ? a.name || a.title : st.pick ? 'H₂ added: offer the ring it made' : pname ? (st.wrong ? `made: ${pname}` : pname) : a.art ? <><PenteneArt cis={a.art === 'cis'} />{a.spot && <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.8 }}>{a.spot} altar</div>}</> : a.title}</Tag>
            {/* drawn altars (8-4) share one door: its requirement shows once, between them, not on each altar */}
            {!done && !a.art && <Tag position={[0, 2.5, 0]} df={9} far={12}>{`wants: ${a.wantText || wantShown(a)}`}</Tag>}
          </group>
        )
      })}
      {/* 8-4: the one requirement both drawn altars share, shown once between them and again on the room's door */}
      {!solved['8-4c'] && (() => { const [x1, z1] = ALTAR8_POS['8-4c'], [x2, z2] = ALTAR8_POS['8-4t']; return <Tag position={[(x1 + x2) / 2, 3.4, (z1 + z2) / 2]} df={10} far={13}>{WANT84}</Tag> })()}
      {!solved['8-4'] && <Tag position={[0, 7.8, -113.1]} df={13}>{WANT84}</Tag>}
      {/* 8-3c: the two ring stands (rings shown only while a pick is pending) */}
      {Object.entries(RING_STANDS).map(([side, [x, z]]) => {
        const st = alt['8-3c'] || {}
        return (
          <group key={side} position={[x, 0, z]}>
            <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.35, 0.42, 0.9, 10]} /><meshStandardMaterial color="#6a6a62" /></mesh>
            {st.pick && !solved['8-3c'] && <group position={[0, 1.55, 0]}><RingModel cis={(side === 'left') === !!st.cisLeft} /></group>}
          </group>
        )
      })}
      <Wraiths world={world} spawns={[[-4, -26], [4, -28], [0, -32]]} active={!solved['t8-wraiths']} zone={[-16, -44]} onCleared={() => { if (!has('t8-wraiths')) { markSolved('t8-wraiths'); sfx('open'); toast('The wraiths are gone. A big chest rises!', 'good', 3000) } }} />
      <Chest world={world} pos={[0, 0, -25]} big opened={!!solved['t8-satchel']} show={!!solved['t8-wraiths']} onOpen={() => openChest('t8-satchel')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, DOORS8['8-1']]} size={[2 * W, 7, 0.8]} open={!!(solved['8-1a'] && solved['8-1b'])} color="#3a5a3a" glow="#c86a3a" />
      <Gate world={world} pos={[0, 0, DOORS8['8-2']]} size={[2 * W, 7, 0.8]} open={!!(solved['8-2a'] && solved['8-2b'])} color="#3a5a3a" glow="#8ad0ff" />
      <Chest world={world} pos={[7.6, 0, -62]} rotY={-Math.PI / 2} opened={!!solved['t8-compass']} onOpen={() => openChest('t8-compass')} />
      <Chest world={world} pos={[0, 0, -87]} opened={!!solved['t8-key']} show={!!(solved['8-3a'] && solved['8-3b'] && solved['8-3c'])} onOpen={() => openChest('t8-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -89.5]} size={[2 * W, 7, 0.8]} open={!!solved['t8-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -89.1]} df={13}>{solved['t8-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 8-4 the ozone shears */}
      <group position={[SHEARS.pos[0], 0, SHEARS.pos[1]]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[3.2, 1.0, 1.4]} /><meshStandardMaterial color="#5a5a62" metalness={0.5} roughness={0.4} /></mesh>
        {!save.t8cut && <>
          <mesh position={[-0.6, 1.4, 0]}><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color="#3a3640" /></mesh>
          <mesh position={[0.6, 1.4, 0]}><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color="#3a3640" /></mesh>
          {[-0.1, 0.1].map((dy) => <mesh key={dy} position={[0, 1.4 + dy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 1.0, 8]} /><meshStandardMaterial color="#5ff0ff" emissive="#2ab0d0" emissiveIntensity={0.8} /></mesh>)}
        </>}
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.5, 2.6, 0]} rotation={[0, 0, s * (save.t8cut ? 0.2 : 0.6)]}><boxGeometry args={[0.2, 1.8, 0.1]} /><meshStandardMaterial color="#c8c8d8" metalness={0.8} roughness={0.25} /></mesh>)}
        <Tag position={[0, 3.8, 0]} df={11} far={10}>{save.t8cut ? 'left (CH₃)₂C ✂ CHCH₃ right · O₃, then Zn' : '2-methyl-2-butene: left (CH₃)₂C=CHCH₃ right'}</Tag>
      </group>
      {save.t8cut && SHEAR_HALVES.map((h, i) => {
        const [x, z] = SHEARS.halves[halfSpot[i]]
        const gone = Object.values(placedHalves).includes(h.id) || frag === h.id
        return (
          <group key={h.id} position={[x, 0, z]}>
            <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.35, 0.4, 0.8, 10]} /><meshStandardMaterial color="#6a6a62" /></mesh>
            {!gone && <mesh position={[0, 1.0, 0]}><octahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#e8d0a0" emissive="#8a6a3a" emissiveIntensity={0.5} /></mesh>}
            {!gone && <Tag position={[0, 1.6, 0]} df={8} far={10}>{h.label}</Tag>}
          </group>
        )
      })}
      {Object.entries(SHEARS.peds).map(([side, [x, z]]) => (
        <group key={side} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.4, 1.0, 1.4]} /><meshStandardMaterial color="#8a8478" /></mesh>
          {placedHalves[side] && <mesh position={[0, 1.3, 0]}><octahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#9affb8" emissive="#2a8a4a" emissiveIntensity={0.6} /></mesh>}
          <Tag position={[0, 2.0, 0]} df={9} far={12}>{placedHalves[side] ? SHEAR_HALVES.find((h) => h.id === placedHalves[side]).label : side === 'left' ? 'the left carbon’s half' : 'the right carbon’s half'}</Tag>
        </group>
      ))}
      {frag && <Carried world={world} what={frag} label={SHEAR_HALVES.find((h) => h.id === frag).label} color="#e8d0a0" />}
      <Gate world={world} pos={[0, 0, -113.5]} size={[2 * W, 7, 0.8]} open={!!solved['8-4']} color="#3a5a3a" glow="#7ae8ff" />

      {/* 8-5 the chain barn */}
      <group position={[BARN.brazier[0], 0, BARN.brazier[1]]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.6, 0.8, 1.0, 10]} /><meshStandardMaterial color="#5a4a3a" /></mesh>
        <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.45, 0.45, 0.1, 12]} /><meshStandardMaterial color="#ff8a3a" emissive="#ff5a1a" emissiveIntensity={1.4} /></mesh>
        {barnPh && <mesh position={[0, 1.8, 0]}><sphereGeometry args={[0.28, 14, 10]} /><meshStandardMaterial color="#ffd060" emissive="#ffb020" emissiveIntensity={1.4} /></mesh>}
        <Tag position={[0, 2.6, 0]} df={10}>{solved['8-5p'] ? 'the peroxide brazier' : 'benzoyl peroxide: strike to heat it'}</Tag>
      </group>
      {BARN.monomers.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* a copper ethylene tank: domed cap, bands, a feed pipe, and the monomer in a glass globe on top */}
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.45, 0.5, 1.0, 14]} /><meshStandardMaterial color="#b0703a" metalness={0.7} roughness={0.35} /></mesh>
          <mesh position={[0, 1.0, 0]}><sphereGeometry args={[0.45, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#b0703a" metalness={0.7} roughness={0.35} /></mesh>
          {[0.2, 0.8].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.49, 0.04, 5, 20]} /><meshStandardMaterial color="#5a3a1a" metalness={0.6} /></mesh>)}
          <mesh position={[0.6, 0.35, 0]}><cylinderGeometry args={[0.07, 0.07, 0.7, 8]} /><meshStandardMaterial color="#8a8a90" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0.52, 0.7, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.2, 8]} /><meshStandardMaterial color="#8a8a90" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 1.7, 0]}><sphereGeometry args={[0.5, 16, 12]} /><meshStandardMaterial color="#e8f8ff" transparent opacity={0.25} roughness={0.05} depthWrite={false} /></mesh>
          <group position={[0, 1.7, 0]}><CC dim={chain && chain.used.includes(i)} /></group>
          <Tag position={[0, 2.5, 0]} df={8} far={12}>CH₂=CH₂</Tag>
        </group>
      ))}
      <group position={[BARN.other[0], 0, BARN.other[1]]}>
        {!solved['8-5p'] && [...Array(5)].map((_, k) => <mesh key={k} position={[-k * 0.5, 1.0 + Math.sin(k) * 0.15, 0]}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color="#b8a0e8" emissive={k === 0 ? '#c070ff' : '#000'} emissiveIntensity={k === 0 ? 1.4 : 0} /></mesh>)}
        <Tag position={[0, 2.0, 0]} df={9} far={12}>{solved['8-5p'] ? 'one long polymer' : 'another growing chain, R·'}</Tag>
      </group>
      <group position={[BARN.propylene[0], 0, BARN.propylene[1]]}>
        {/* a stone font fed by two brass pipes, the propylene floating over it */}
        <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.85, 0.6, 0.8, 12]} /><meshStandardMaterial color="#8a8478" roughness={0.9} /></mesh>
        <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.85, 0.1, 6, 24]} /><meshStandardMaterial color="#6a665c" roughness={0.9} /></mesh>
        <mesh position={[0, 0.79, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.78, 20]} /><meshStandardMaterial color="#ffd890" emissive="#c08a3a" emissiveIntensity={0.6} /></mesh>
        {[-0.5, 0.5].map((x) => <group key={x}>
          <mesh position={[x, 1.1, -0.95]}><cylinderGeometry args={[0.07, 0.07, 2.2, 8]} /><meshStandardMaterial color="#c8a050" metalness={0.85} roughness={0.3} /></mesh>
          <mesh position={[x, 2.2, -0.75]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.4, 8]} /><meshStandardMaterial color="#c8a050" metalness={0.85} roughness={0.3} /></mesh>
        </group>)}
        <group position={[-0.1, 1.25, 0]} scale={1.4}><CC dim={chain && chain.prop} color="#ffe0a8" glow="#c08a3a" big /></group>
        <Tag position={[0, 2.2, 0]} df={8} far={12}>CH₂=CHCH₃</Tag>
        <Tag position={[-1.0, 1.2, 0]} df={8} far={8}>CH₂ end</Tag>
        <Tag position={[1.0, 1.2, 0]} df={8} far={8}>CHCH₃ end</Tag>
      </group>
      {chain && <Carried world={world} what="chain" label={`chain ${chain.n}/${POLY.need}`} color="#ffd060" />}
      <BarnDressing world={world} />
      {/* the racemate gate: the 1-butene basin and the (S) and (R) locks */}
      <group position={[RACE.basin[0], 0, RACE.basin[1]]}>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.7, 0.6, 0.9, 12]} /><meshStandardMaterial color="#4a5a6a" /></mesh>
        <mesh position={[0, 0.92, 0]}><cylinderGeometry args={[0.55, 0.55, 0.06, 14]} /><meshStandardMaterial color="#8ad0ff" emissive="#3a8ad0" emissiveIntensity={0.7} /></mesh>
        {/* a stone rim with carved blocks, and a light over the water */}
        <mesh position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.13, 6, 20]} /><meshStandardMaterial color="#8a8478" roughness={0.9} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} position={[Math.sin((k * Math.PI) / 3) * 0.72, 1.0, Math.cos((k * Math.PI) / 3) * 0.72]} rotation={[0, (k * Math.PI) / 3, 0]}><boxGeometry args={[0.3, 0.16, 0.34]} /><meshStandardMaterial color="#6a665c" roughness={0.9} /></mesh>)}
        <pointLight position={[0, 1.8, 0]} color="#8ad0ff" intensity={2} distance={4} />
        {/* the flat cation floats over the water; the carried 2-butanol's OH shows on the face it came from */}
        {!solved['8-5race'] && <group position={[0, 2.1, 0]}><CationModel oh={coin} mirror={mirror} /></group>}
        {!coin && <Tag position={[0, 3.3, 0]} df={9} far={12}>{solved['8-5race'] ? '(±)-2-butanol' : '1-butene · H₂O, H⁺'}</Tag>}
      </group>
      {Object.entries(RACE.locks).map(([cfg, [x, z]]) => {
        const n = solved['8-5race'] ? RACEMATE.per : locks[cfg]
        return (
          <group key={cfg} position={[x, 0, z]}>
            <LockPlate cfg={cfg} n={n} per={RACEMATE.per} />
            <Tag position={[0, 0.2, 0.55]} df={9} far={13}>{`(${cfg}) lock · ${n}/${RACEMATE.per}`}</Tag>
          </group>
        )
      })}
      {/* no vial over Kai for the 2-butanol: from the usual camera it sat right in front of the cation model; the model's OH shows what is carried */}
      <Chest world={world} pos={[0, 0, -137.5]} big opened={!!solved['t8-bosskey']} show={!!(solved['8-5p'] && solved['8-5race'])} onOpen={() => openChest('t8-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -140]} size={[2 * W, 7, 0.8]} open={!!solved['t8-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS8).map(([id, st]) => {
        const once = ['8-4back'].includes(id)
        return (
          <Station key={id} world={world} pos={st.pos} label={once && solved[id] ? null : st.label} enabled={!(once && solved[id])} solved={!!solved[id]}
            onUse={async () => {
              let wrong = null
              const ok = await openPanel(st.panel, { ...st.props, onWrong: (t) => { wrong = t } })
              if (!ok) { if (wrong) { world.player.hurt(1, [st.pos[0], 0, st.pos[2]], true); toast(wrong, 'warn', readMs(wrong)) } return }
              markSolved(id)
            }} />
        )
      })}

      {/* boss */}
      <GlassRoof />
      {(!solved.boss8 || sparkFly.current) && <Leviathan world={world} center={LEVI.center} R={LEVI.R} vent={[-11, 0, -152]} active={bossOn && (!solved.boss8 || sparkFly.current)} onDefeated={bossDown} />}
      {boranaHere && <Borana position={[-2.2, 0, -172.4]} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss8 && (save.shards || 0) < 8} pos={[0, 0, -174]} />
      <Motes count={180} area={[20, 7, 180]} center={[0, 0.6, -85]} color="#d8ffd0" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Glasshouse({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'glasshouse' ? ROOMS8.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#14201a" camDist={6.2}>
      {(world) => <GlassLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
