import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// World 11's set dressing in plain three.js (the World 9–10 kit, re-coloured for the volcano): basalt flagstones with
// ember seams, carved plinths, a lever stand, sluice doors, the under-halls' vault and the arena's stands.

export const BASALT = '#4a3e3e', BASALT_D = '#2e2628', BRASS = '#b0904a', IRON = '#2a2426', EMBER = '#ff7a2a'

/** flagstones: an instanced grid of slightly varied basalt slabs in running bond over a glowing ember grout */
export function AshFlags({ x0, x1, z0, z1, size = 2, base = '#5a4a46', seed = 5 }) {
  const ref = useRef()
  const cells = useMemo(() => {
    let s = seed
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const out = []
    let row = 0
    for (let z = z0 - size / 2; z > z1; z -= size, row++) {
      for (let x = x0 - (row % 2 ? size / 2 : 0); x < x1; x += size) {
        const lo = Math.max(x, x0), hi = Math.min(x + size, x1)
        if (hi - lo > 0.2) out.push([(lo + hi) / 2, z, hi - lo, 0.75 + rnd() * 0.35, (rnd() - 0.5) * 0.03, rnd() * 0.015, rnd() < 0.12])
      }
    }
    return out
  }, [x0, x1, z0, z1, size, seed])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D(), c = new THREE.Color(base), ash = new THREE.Color('#8a7a72'), tmp = new THREE.Color()
    cells.forEach(([x, z, w, k, r, h, ashy], i) => {
      d.position.set(x, -0.02 + h, z); d.rotation.set(0, r, 0); d.scale.set(w - 0.08, 1, size - 0.08); d.updateMatrix()
      m.setMatrixAt(i, d.matrix); m.setColorAt(i, tmp.copy(c).lerp(ash, ashy ? 0.4 : 0).multiplyScalar(k))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [cells, base, size])
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, -0.03, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[x1 - x0, Math.abs(z0 - z1)]} /><meshStandardMaterial color="#3a1a10" emissive="#7a2a08" emissiveIntensity={0.35} roughness={1} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} receiveShadow><boxGeometry args={[1, 0.04, 1]} /><meshStandardMaterial roughness={0.92} /></instancedMesh>
    </group>
  )
}

/** a small carved plinth (top at h): footing, octagonal shaft with a brass band, moulded cap */
export function Plinth({ r = 0.3, h = 0.86 }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow><boxGeometry args={[r * 2.6, 0.12, r * 2.6]} /><meshStandardMaterial color={BASALT_D} roughness={0.9} /></mesh>
      <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[r * 1.15, r * 1.25, 0.08, 8]} /><meshStandardMaterial color={BASALT} roughness={0.9} flatShading /></mesh>
      <mesh position={[0, h / 2 + 0.02, 0]} castShadow><cylinderGeometry args={[r * 0.82, r, h - 0.32, 8]} /><meshStandardMaterial color={BASALT} roughness={0.85} flatShading /></mesh>
      <mesh position={[0, h * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r * 0.9, 0.025, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, h - 0.11, 0]}><cylinderGeometry args={[r * 1.05, r * 0.85, 0.1, 8]} /><meshStandardMaterial color={BASALT} flatShading /></mesh>
      <mesh position={[0, h - 0.03, 0]} castShadow><cylinderGeometry args={[r * 1.25, r * 1.2, 0.06, 8]} /><meshStandardMaterial color="#6a5a56" flatShading /></mesh>
    </group>
  )
}

/** the SN2 lever: a riveted iron housing on a stone footing, with a brass-knobbed handle that throws when solved */
export function LeverStand({ thrown }) {
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow><cylinderGeometry args={[0.75, 0.85, 0.2, 10]} /><meshStandardMaterial color={BASALT_D} roughness={0.9} flatShading /></mesh>
      <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.42, 0.5, 0.8, 8]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.45} flatShading /></mesh>
      {[0.32, 0.88].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.47, 0.03, 6, 18]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>)}
      <mesh position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.5, 10]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <group position={[0, 1.02, 0]} rotation={[0, 0, thrown ? -0.7 : 0.7]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.04, 0.05, 1.0, 8]} /><meshStandardMaterial color="#c8c8d0" metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0, 1.02, 0]}><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color={thrown ? '#ffd27a' : '#c03a2a'} emissive={thrown ? '#a06a10' : '#400a04'} emissiveIntensity={0.6} /></mesh>
      </group>
    </group>
  )
}

/** a sluice in a stone frame (posts and lintel); its slab rises when `open`, and a water sheet pours through */
export function Sluice({ open, lit }) {
  const slab = useRef()
  useFrame((_, dt) => { if (slab.current) slab.current.position.y += ((open ? 4.4 : 1.6) - slab.current.position.y) * Math.min(1, dt * 3) })
  return (
    <group>
      {[-1.35, 1.35].map((x) => <mesh key={x} position={[x, 1.7, 0]} castShadow><boxGeometry args={[0.4, 3.4, 0.6]} /><meshStandardMaterial color={BASALT} roughness={0.9} flatShading /></mesh>)}
      <mesh position={[0, 3.55, 0]} castShadow><boxGeometry args={[3.2, 0.4, 0.7]} /><meshStandardMaterial color="#5a4a46" roughness={0.85} /></mesh>
      <mesh position={[0, 3.78, 0]}><boxGeometry args={[3.4, 0.07, 0.78]} /><meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.4} /></mesh>
      <group ref={slab} position={[0, 1.6, 0]}>
        <mesh castShadow><boxGeometry args={[2.3, 3.0, 0.22]} /><meshStandardMaterial color={lit ? '#7a5a3a' : '#3a3032'} emissive={lit ? '#a06a20' : '#000'} emissiveIntensity={lit ? 0.35 : 0} roughness={0.8} /></mesh>
        {[-0.8, 0, 0.8].map((y) => <mesh key={y} position={[0, y, 0.12]}><boxGeometry args={[2.2, 0.05, 0.02]} /><meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} /></mesh>)}
      </group>
      {open && <mesh position={[0, 1.6, 0.05]}><planeGeometry args={[2.2, 3.2]} /><meshStandardMaterial color="#8ac8f0" transparent opacity={0.45} emissive="#2a6aa0" emissiveIntensity={0.4} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
    </group>
  )
}

/** a water-filled stone basin (the cation pit's well): coped rim and a rippling surface */
export function Basin({ r = 1.2, h = 1.0 }) {
  const w = useRef()
  useFrame(({ clock }) => { if (w.current) w.current.position.y = h - 0.08 + Math.sin(clock.elapsedTime * 2) * 0.012 })
  return (
    <group>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow><cylinderGeometry args={[r, r * 1.15, h, 14, 1, true]} /><meshStandardMaterial color={BASALT} roughness={0.9} flatShading side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.1, 6, 28]} /><meshStandardMaterial color="#6a5a56" roughness={0.85} flatShading /></mesh>
      <mesh ref={w} position={[0, h - 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[r - 0.05, 28]} /><meshStandardMaterial color="#3a6a8a" metalness={0.3} roughness={0.15} emissive="#0a2a3a" emissiveIntensity={0.4} /></mesh>
    </group>
  )
}

/** the under-halls' vault: a dark basalt ceiling with hanging rock teeth, over the dungeon's rooms */
export function HallVault({ x = 11, z0 = 8, z1 = -126, y = 8.6 }) {
  const teeth = useMemo(() => {
    let s = 13
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const out = []
    for (let i = 0; i < 150; i++) out.push([(rnd() * 2 - 1) * (x - 0.6), z0 - rnd() * (z0 - z1), 0.4 + rnd() * 1.4, 0.1 + rnd() * 0.22])
    return out
  }, [x, z0, z1])
  const ref = useRef()
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D()
    teeth.forEach(([px, pz, L, r], i) => { d.position.set(px, y - L / 2, pz); d.rotation.set(0, 0, Math.PI); d.scale.set(r, L, r); d.updateMatrix(); m.setMatrixAt(i, d.matrix) })
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere()
  }, [teeth, y])
  return (
    <group>
      <mesh position={[0, y, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2 * x + 8, Math.abs(z0 - z1) + 8]} /><meshStandardMaterial color="#1e1416" roughness={1} side={THREE.DoubleSide} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, teeth.length]}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial color="#3a2e2e" roughness={0.9} flatShading /></instancedMesh>
    </group>
  )
}

/** the arena's stands: three tiers of stone benches behind each side wall and across the far end, a back wall with a
 *  carved frieze so a low shot sees stone rather than sky, and a smoky red sky band above */
export function ArenaStands({ x = 14, z0 = -127, z1 = -166 }) {
  const tiers = [0, 1, 2]
  return (
    <group>
      {[-1, 1].map((sd) => tiers.map((k) => (
        <mesh key={sd + ':' + k} position={[sd * (x + 1.0 + k * 1.2), 9 + k * 1.1, (z0 + z1) / 2]} castShadow receiveShadow><boxGeometry args={[1.2, 0.5, Math.abs(z0 - z1)]} /><meshStandardMaterial color={k % 2 ? '#5a4a46' : BASALT} roughness={0.9} /></mesh>
      )))}
      {tiers.map((k) => <mesh key={'e' + k} position={[0, 9 + k * 1.1, z1 - 1.0 - k * 1.2]} castShadow receiveShadow><boxGeometry args={[2 * x + 8, 0.5, 1.2]} /><meshStandardMaterial color={k % 2 ? '#5a4a46' : BASALT} roughness={0.9} /></mesh>)}
      {/* the far wall, floor to stands, with a brass-banded frieze and three carved roundels */}
      <mesh position={[0, 4.6, z1 - 0.3]} receiveShadow><boxGeometry args={[2 * x + 1, 9.6, 0.6]} /><meshStandardMaterial color="#3e3234" roughness={0.95} emissive="#2a0a04" emissiveIntensity={0.3} /></mesh>
      {[2.2, 7.6].map((y) => <mesh key={y} position={[0, y, z1 + 0.02]}><boxGeometry args={[2 * x + 1, 0.12, 0.06]} /><meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.4} /></mesh>)}
      {[-8, 0, 8].map((px) => <mesh key={px} position={[px, 4.9, z1 + 0.04]}><ringGeometry args={[0.9, 1.25, 10]} /><meshStandardMaterial color="#6a5a56" roughness={0.85} side={THREE.DoubleSide} /></mesh>)}
      {/* the side walls under the stands are faced (just inside the near-black lava-crack blocks) in the far wall's stone,
          lit a little more as they face away from the sun, with its frieze bands and roundels, so the defeat flight's
          wide shot east never looks into a black void */}
      {[-1, 1].map((sd) => (
        <group key={'sw' + sd}>
          <mesh position={[sd * (x - 0.01), 4.7, (z0 + z1) / 2]} receiveShadow><boxGeometry args={[0.06, 9.4, Math.abs(z0 - z1)]} /><meshStandardMaterial color="#3e3234" roughness={0.95} emissive="#4a1c10" emissiveIntensity={0.8} /></mesh>
          {[2.2, 7.6].map((y) => <mesh key={y} position={[sd * (x - 0.06), y, (z0 + z1) / 2]}><boxGeometry args={[0.06, 0.12, Math.abs(z0 - z1)]} /><meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.4} emissive="#5a3a10" emissiveIntensity={0.4} /></mesh>)}
          {/* wall sconces, lighting the facing warm */}
          {[-134, -146, -158].map((pz) => (
            <group key={'sc' + pz} position={[sd * (x - 0.25), 5.2, pz + 6]}>
              <mesh><boxGeometry args={[0.5, 0.12, 0.3]} /><meshStandardMaterial color="#2a2426" metalness={0.6} roughness={0.45} /></mesh>
              <mesh position={[0, 0.22, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshBasicMaterial color="#ffb050" toneMapped={false} /></mesh>
              <pointLight position={[-sd * 1.2, 0.4, 0]} color="#ff9a4a" intensity={14} distance={14} />
            </group>
          ))}
          {[-134, -146, -158].map((pz) => <mesh key={pz} position={[sd * (x - 0.07), 4.9, pz]} rotation={[0, -sd * Math.PI / 2, 0]}><ringGeometry args={[0.9, 1.25, 10]} /><meshStandardMaterial color="#8a7a66" roughness={0.85} emissive="#3a2a1a" emissiveIntensity={0.4} side={THREE.DoubleSide} /></mesh>)}
        </group>
      ))}
      {/* a smoky sky band above the stands, so a high shot never ends in black */}
      <mesh position={[0, 16, z1 - 6]}><planeGeometry args={[2 * x + 40, 14]} /><meshBasicMaterial color="#4a2a2a" fog={false} /></mesh>
      {[-1, 1].map((sd) => <mesh key={'sk' + sd} position={[sd * (x + 7), 16, (z0 + z1) / 2]} rotation={[0, -sd * Math.PI / 2, 0]}><planeGeometry args={[Math.abs(z0 - z1) + 14, 14]} /><meshBasicMaterial color="#4a2a2a" fog={false} /></mesh>)}
    </group>
  )
}
