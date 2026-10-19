/**
 * Shared weapon props and registry for Worlds 1–4. Level screens pick a `tool` id and
 * pass the matching hook on ReefGame (`onAction`, stroke hooks, or `onTrackMove`).
 * Append new entries here — do not fork per level.
 */
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
/** Tool ids, default keys (levels may override in the HUD), and ReefGame hook kind. */
export const WORLD_TOOLS = {
  lash: { key: '1', label: 'Lash', hook: 'lash' },
  spool: { key: '2', label: 'Spool', hook: 'stroke' },
  glass: { key: '3', label: 'Tide Glass', hook: 'glass' },
  smith: { key: '2', label: 'Cell-Smith', hook: 'action', swing: true },
  sling: { key: '4', label: 'Suspension Sling', hook: 'action', item: 'suspension_sling' },
  cord: { key: '4', label: 'Winding Cord', hook: 'track', item: 'winding_cord' },
  clasp: { key: '5', label: 'Van Kampen Clasp', hook: 'action', item: 'van_kampen_clasp' },
  compass: { key: '6', label: 'Sheet Compass', hook: 'action', item: 'sheet_compass' },
  coil: { key: '6', label: 'Covering Coil', hook: 'stroke', item: 'covering_coil' },
  blade: { key: '7', label: 'Boundary Blade', hook: 'action', swing: true, item: 'boundary_blade' },
  dial: { key: '8', label: 'Degree Dial', hook: 'action', item: 'degree_dial' },
  caster: { key: '9', label: 'Cup Caster', hook: 'action', item: 'cup_caster' },
  wand: { key: '0', label: 'Reading Wand', hook: 'action', item: 'reading_wand' },
  extension: { key: 'E', label: 'Extension Cord', hook: 'stroke', item: 'extension_cord' },
}

const handOffset = (s, side = 0.26) => {
  const fx = Math.sin(s.face)
  const fz = Math.cos(s.face)
  return [s.x + fx * 0.1 - fz * side, 0.55, s.z + fz * 0.1 + fx * side, fx, fz]
}

/** Suspension Sling (0-5, 4-4): braided loop on a short pole — click to anchor and lift. */
export function SlingProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'sling'
    const [x, y, z] = handOffset(s, 0.22)
    g.current.position.set(x, y + Math.sin(clock.elapsedTime * 3) * 0.02, z)
    g.current.rotation.y = s.face + clock.elapsedTime * 0.4
  })
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.035, 8, 24]} />
        <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.22, 8]} />
        <meshStandardMaterial color="#3d2914" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Winding Cord (1-3): gold cord spool; tracks laps while Gyroid walks loops. */
export function CordProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'cord'
    const [x, y, z] = handOffset(s, 0.24)
    g.current.position.set(x, y, z)
    g.current.rotation.y = s.face
    g.current.rotation.z = Math.sin(clock.elapsedTime * 4) * 0.08
  })
  return (
    <group ref={g}>
      <mesh>
        <cylinderGeometry args={[0.11, 0.11, 0.08, 16]} />
        <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.35, 8]} />
        <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Van Kampen Clasp (1-6): copper jaws joining red and violet generator cords. */
export function ClaspProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'clasp'
    const [x, y, z] = handOffset(s, 0.2)
    g.current.position.set(x, y + 0.05, z)
    g.current.rotation.y = s.face
    g.current.rotation.x = Math.sin(clock.elapsedTime * 2) * 0.05
  })
  return (
    <group ref={g}>
      <mesh position={[-0.05, 0, 0]}>
        <boxGeometry args={[0.08, 0.06, 0.04]} />
        <meshStandardMaterial color="#b87333" emissive="#ffb347" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.05, 0, 0]}>
        <boxGeometry args={[0.08, 0.06, 0.04]} />
        <meshStandardMaterial color="#b87333" emissive="#ffb347" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
        <meshStandardMaterial color="#e04040" emissive="#ff6688" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh position={[0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
        <meshStandardMaterial color="#8060d0" emissive="#b090ff" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Sheet Compass (1-8) / cover navigation: brass compass with a glass needle. */
export function CompassProp({ state, tool }) {
  const g = useRef()
  const needle = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'compass'
    const [x, y, z] = handOffset(s, 0.28)
    g.current.position.set(x, y + 0.08, z)
    g.current.rotation.y = s.face
    needle.current.rotation.z = clock.elapsedTime * 0.6
  })
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.03, 24]} />
        <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={0.5} />
      </mesh>
      <mesh ref={needle} position={[0, 0.04, 0]}>
        <boxGeometry args={[0.02, 0.14, 0.01]} />
        <meshStandardMaterial color="#ffe6a8" emissive="#fff2c4" emissiveIntensity={1.4} transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Covering Coil (GAME_DESIGN §5.2): twin loops — base trace and lift trace. */
export function CoilProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'coil'
    const [x, y, z] = handOffset(s, 0.25)
    g.current.position.set(x, y, z)
    g.current.rotation.y = s.face + clock.elapsedTime * 0.5
  })
  return (
    <group ref={g}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.025, 8, 24]} />
        <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.018, 8, 20]} />
        <meshStandardMaterial color="#a8e0ff" emissive="#88ccff" emissiveIntensity={1.2} transparent opacity={0.75} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Boundary Blade (2-2): Emmy’s namesake — a glowing gold edge. */
export function BladeProp({ state, tool }) {
  const g = useRef()
  const edge = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'blade'
    const [x, y, z] = handOffset(s, 0.3)
    g.current.position.set(x, y, z)
    g.current.rotation.y = s.face - Math.PI / 4
    const u = s.swing
    edge.current.rotation.x = u > 0 ? -0.3 - u * 2.2 : -0.3 + Math.sin(clock.elapsedTime * 2) * 0.04
  })
  return (
    <group ref={g}>
      <mesh>
        <boxGeometry args={[0.04, 0.04, 0.18]} />
        <meshStandardMaterial color="#3d2914" roughness={0.9} />
      </mesh>
      <mesh ref={edge} position={[0, 0.12, 0]}>
        <boxGeometry args={[0.02, 0.32, 0.06]} />
        <meshStandardMaterial color="#ffe6a8" emissive="#ffb347" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Degree Dial (2-6): brass wheel with a glowing degree tick. */
export function DialProp({ state, tool }) {
  const g = useRef()
  const wheel = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'dial'
    const [x, y, z] = handOffset(s, 0.26)
    g.current.position.set(x, y + 0.06, z)
    g.current.rotation.y = s.face
    wheel.current.rotation.z = clock.elapsedTime * 0.35
  })
  return (
    <group ref={g}>
      <mesh ref={wheel} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.04, 24]} />
        <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0.1, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.04, 0.02, 0.02]} />
        <meshStandardMaterial color="#fff2c4" emissive="#ffb347" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Cup Caster (3-3): twin nozzles that pour two cochain readings into one. */
export function CasterProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'caster'
    const [x, y, z] = handOffset(s, 0.24)
    g.current.position.set(x, y + 0.04, z)
    g.current.rotation.y = s.face
    g.current.rotation.x = Math.sin(clock.elapsedTime * 3) * 0.06
  })
  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[0.09, 12, 10]} />
        <meshStandardMaterial color="#8060d0" emissive="#b090ff" emissiveIntensity={1.3} toneMapped={false} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.08, 0.1, 0]} rotation={[0.4, 0, sd * 0.3]}>
          <coneGeometry args={[0.03, 0.12, 8]} />
          <meshStandardMaterial color="#ffe6a8" emissive="#ff8ad8" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Reading wand (3-1): slender wand extending from the Boundary Blade hilt. */
export function WandProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'wand'
    const fx = Math.sin(s.face)
    const fz = Math.cos(s.face)
    const [x, y, z] = handOffset(s, 0.22)
    g.current.position.set(x + fx * 0.08, y + 0.1, z + fz * 0.08)
    g.current.rotation.y = s.face
    g.current.rotation.z = Math.sin(clock.elapsedTime * 2.5) * 0.05
  })
  return (
    <group ref={g}>
      <mesh rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.38, 8]} />
        <meshStandardMaterial color="#ffe6a8" emissive="#ffb347" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Extension Cord (0-B, 4-12): heavy spool paying out platforms. */
export function ExtensionProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'extension'
    const [x, y, z] = handOffset(s, 0.28)
    g.current.position.set(x, y, z)
    g.current.rotation.y = s.face
    g.current.rotation.x += (s.spooling ? 1 : 0.2) * 0.016 * 60
  })
  return (
    <group ref={g}>
      <mesh>
        <cylinderGeometry args={[0.14, 0.14, 0.1, 16]} />
        <meshStandardMaterial color="#2a3544" emissive="#506080" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.4, 8]} />
        <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Tools that share the forge-hammer / blade swing timing and sfxHammer on strike. */
export const SWING_TOOLS = new Set(['smith', 'blade'])

/** Tools that use Spool-style stroke hooks (start / move / end). */
export const STROKE_TOOLS = new Set(['spool', 'coil', 'extension'])

/** Tools that fire onAction(gx, gz, clickX, clickZ) on click (no lash arc). */
// ('cord' is a track tool, but 1-4 / 1-5 also click things with it: stills, roots, the projector.)
export const ACTION_TOOLS = new Set(['smith', 'blade', 'sling', 'clasp', 'compass', 'dial', 'caster', 'wand', 'cord'])
