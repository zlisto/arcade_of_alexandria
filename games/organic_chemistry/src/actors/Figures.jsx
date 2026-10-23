import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Procedural cast members, modeled on their Gemini portraits (assets/characters/*.png).

export function Malradix({ staffGlow = 1, ...props }) {
  const star = useRef()
  useFrame(({ clock }) => {
    if (star.current) { star.current.rotation.z = clock.elapsedTime * 1.5; star.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.12) }
  })
  return (
    <group {...props}>
      <mesh position={[0, 1.1, 0]} castShadow><coneGeometry args={[0.75, 2.3, 10, 1, true]} /><meshStandardMaterial color="#6e1a26" roughness={0.75} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 1.05, 0.02]}><coneGeometry args={[0.6, 2.2, 10]} /><meshStandardMaterial color="#17121a" roughness={0.8} /></mesh>
      <mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.24, 14, 12]} /><meshStandardMaterial color="#c8bfc4" roughness={0.6} /></mesh>
      <mesh position={[0, 2.32, -0.04]} scale={[1.1, 1.2, 1.1]}><sphereGeometry args={[0.27, 12, 10, 0, Math.PI * 2, 0, 1.9]} /><meshStandardMaterial color="#5a1420" side={THREE.DoubleSide} /></mesh>
      {[-2, -1, 0, 1, 2].map((k) => (
        <mesh key={k} position={[k * 0.09, 2.62 + (k === 0 ? 0.12 : 0), 0.05]}><coneGeometry args={[0.035, k === 0 ? 0.42 : 0.22, 4]} /><meshStandardMaterial color="#c0c4cc" metalness={0.8} roughness={0.3} /></mesh>
      ))}
      <mesh position={[-0.08, 2.27, 0.21]}><sphereGeometry args={[0.03, 8, 6]} /><meshBasicMaterial color="#e3c4ff" toneMapped={false} /></mesh>
      <mesh position={[0.08, 2.27, 0.21]}><sphereGeometry args={[0.03, 8, 6]} /><meshBasicMaterial color="#e3c4ff" toneMapped={false} /></mesh>
      {/* staff with the unpaired electron */}
      <mesh position={[0.6, 1.3, 0.15]} rotation={[0, 0, -0.08]}><cylinderGeometry args={[0.035, 0.045, 2.7, 6]} /><meshStandardMaterial color="#3a2620" /></mesh>
      <group position={[0.7, 2.75, 0.15]}>
        <mesh ref={star}><octahedronGeometry args={[0.2, 0]} /><meshStandardMaterial color="#d6b4ff" emissive="#a06bff" emissiveIntensity={4 * staffGlow} toneMapped={false} /></mesh>
        <pointLight color="#a06bff" intensity={6 * staffGlow} distance={9} />
      </group>
    </group>
  )
}

// Octavia has her own detailed model
export { Octavia } from './OctaviaModel'

export function Crown({ shatter = 0, glow = 1, ...props }) {
  // four arms of light at tetrahedral angles around a carbon heart
  const dirs = useMemo(() => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((d) => new THREE.Vector3(...d).normalize()), [])
  const g = useRef()
  useFrame((_, dt) => { if (g.current && shatter === 0) g.current.rotation.y += dt * 0.5 })
  return (
    <group ref={g} {...props}>
      {shatter < 1 && (
        <>
          <mesh scale={1 - shatter}><icosahedronGeometry args={[0.28, 1]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} emissive="#2a2a40" /></mesh>
          {dirs.map((d, i) => (
            <mesh key={i} position={d.clone().multiplyScalar(0.55 * (1 + shatter * 4))} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)}>
              <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
              <meshStandardMaterial color="#ffe08a" emissive="#ffcf4a" emissiveIntensity={2.5 * glow} toneMapped={false} transparent opacity={1 - shatter} />
            </mesh>
          ))}
        </>
      )}
      <pointLight color="#ffd76a" intensity={5 * glow * (1 - shatter)} distance={10} />
    </group>
  )
}

export function Pi({ glow = 1, ...props }) {
  const g = useRef()
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    g.current.position.y = (props.position?.[1] || 0) + Math.sin(t * 3) * 0.12
    g.current.rotation.y = t * 1.5
  })
  return (
    <group ref={g} {...props}>
      <mesh position={[0, 0.13, 0]} scale={[0.7, 1, 0.7]}><sphereGeometry args={[0.12, 14, 12]} /><meshStandardMaterial color="#cfefff" emissive="#7fd6ff" emissiveIntensity={2.5 * glow} transparent opacity={0.85} toneMapped={false} /></mesh>
      <mesh position={[0, -0.13, 0]} scale={[0.7, 1, 0.7]}><sphereGeometry args={[0.12, 14, 12]} /><meshStandardMaterial color="#ffd0d0" emissive="#ff8a8a" emissiveIntensity={1.6 * glow} transparent opacity={0.8} toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[0.05, 10, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      <pointLight color="#9fe3ff" intensity={1.6 * glow} distance={4} />
    </group>
  )
}

export function Aufbau(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.55, 0]} castShadow><capsuleGeometry args={[0.32, 0.5, 6, 12]} /><meshStandardMaterial color="#5a4332" roughness={0.85} /></mesh>
      <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.24, 14, 12]} /><meshStandardMaterial color="#d9a888" /></mesh>
      <mesh position={[0, 0.95, 0.15]} scale={[1, 1.4, 0.7]}><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color="#e9e6e0" roughness={0.9} /></mesh>
      <mesh position={[0, 1.32, 0]}><cylinderGeometry args={[0.27, 0.3, 0.18, 12]} /><meshStandardMaterial color="#6a6a70" metalness={0.5} roughness={0.4} /></mesh>
      {/* stacked lamps: 1, then 4 (shell 1, shell 2) */}
      <mesh position={[0, 1.62, 0]}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color="#ffe6a0" toneMapped={false} /></mesh>
      {[-0.18, -0.06, 0.06, 0.18].map((x) => <mesh key={x} position={[x, 1.46, 0.12]}><sphereGeometry args={[0.045, 8, 6]} /><meshBasicMaterial color="#bfefff" toneMapped={false} /></mesh>)}
      <mesh position={[0.4, 0.7, 0.1]} rotation={[0, 0, -0.6]}><cylinderGeometry args={[0.03, 0.03, 1.1, 6]} /><meshStandardMaterial color="#4a3426" /></mesh>
      <mesh position={[0.68, 1.15, 0.1]} rotation={[0, 0, 0.9]}><octahedronGeometry args={[0.14, 0]} /><meshStandardMaterial color="#43e6f5" emissive="#1fa7c4" emissiveIntensity={1.5} /></mesh>
      <pointLight position={[0, 1.7, 0.3]} color="#ffe6a0" intensity={1.6} distance={5} />
    </group>
  )
}

/** A Hydrogen villager: a small round white person. */
export function Villager({ color = '#f4f4f4', hat = '#c0394b', ...props }) {
  return (
    <group {...props}>
      <mesh position={[0, 0.5, 0]} castShadow><sphereGeometry args={[0.42, 14, 12]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh position={[0, 1.02, 0]}><sphereGeometry args={[0.24, 12, 10]} /><meshStandardMaterial color="#f0d2b8" /></mesh>
      <mesh position={[0, 1.24, 0]}><coneGeometry args={[0.22, 0.3, 10]} /><meshStandardMaterial color={hat} /></mesh>
      <mesh position={[-0.08, 1.04, 0.21]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#222" /></mesh>
      <mesh position={[0.08, 1.04, 0.21]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#222" /></mesh>
    </group>
  )
}
