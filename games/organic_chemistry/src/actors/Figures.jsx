import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Procedural cast members, modeled on their Gemini portraits (assets/characters/*.png).

// Each cast member has its own detailed model file; this module gathers them (and holds the Crown).
export { Octavia } from './OctaviaModel'
export { Malradix } from './MalradixModel'
export { Pi } from './PiModel'
export { Aufbau } from './AufbauModel'
export { Villager } from './VillagerModel'

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

