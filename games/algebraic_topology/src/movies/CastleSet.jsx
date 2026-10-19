import { useMemo } from 'react'
import * as THREE from 'three'
import { Hall, Throne } from '../levels/w0/CastleScene'

/**
 * The castle movies' shared set: the gold-seamed bridge running north to the black spire,
 * a spiral stair round the spire's outside, and the throne room on top (TOP units up).
 * World coordinates: bridge from z = +24 to the spire at z = 0; the throne room's floor at
 * y = TOP, centered over the spire.
 */

export const TOP = 24
export const SPIRE_R = (y) => 3.2 + (y / TOP) * 1.8
/** A point on the spiral stair at height y. */
export const stairAt = (y) => {
  const a = Math.PI / 2 + y * 0.55
  const r = SPIRE_R(y) + 0.9
  return [Math.cos(a) * r, y, Math.sin(a) * r, a]
}

export default function CastleSet({ showTop = true }) {
  const steps = useMemo(() => {
    const out = []
    for (let y = 0.2; y < TOP; y += 0.32) out.push(stairAt(y))
    return out
  }, [])
  return (
    <>
      {/* the bridge */}
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} position={[0, -0.1, 4.4 + i * 0.5]}>
          <boxGeometry args={[1.8, 0.16, 0.42]} />
          <meshStandardMaterial color="#7a5232" roughness={0.8} emissive="#ff9a3a" emissiveIntensity={0.15} />
        </mesh>
      ))}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0.02, 14.4]}>
          <boxGeometry args={[0.05, 0.05, 20]} />
          <meshBasicMaterial color="#ffd27a" toneMapped={false} />
        </mesh>
      ))}
      {/* the bridgehead platform (where Emmy waits) */}
      <mesh position={[0, -0.3, 26]}>
        <cylinderGeometry args={[2.4, 2.4, 0.4, 32]} />
        <meshStandardMaterial color="#33241a" roughness={0.85} />
      </mesh>
      {/* the spire */}
      <mesh position={[0, TOP / 2 - 0.4, 0]}>
        <cylinderGeometry args={[SPIRE_R(TOP), SPIRE_R(0), TOP, 6, 1]} />
        <meshStandardMaterial color="#0e0b13" roughness={0.25} metalness={0.6} flatShading />
      </mesh>
      <mesh position={[0, -6, 0]}>
        <cylinderGeometry args={[SPIRE_R(0), SPIRE_R(0) + 1.5, 12, 6, 1]} />
        <meshStandardMaterial color="#0e0b13" roughness={0.25} metalness={0.6} flatShading />
      </mesh>
      {steps.map(([x, y, z, a], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, -a, 0]}>
          <boxGeometry args={[0.5, 0.1, 1.3]} />
          <meshStandardMaterial color="#1a1424" roughness={0.3} metalness={0.5} emissive={i % 6 === 0 ? '#5a2aa8' : '#000'} emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* the sea */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#12233a" roughness={0.25} metalness={0.5} emissive="#0a1626" emissiveIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>
      {showTop && (
        <group position={[0, TOP, 0]}>
          <Hall />
          <Throne />
        </group>
      )}
    </>
  )
}
