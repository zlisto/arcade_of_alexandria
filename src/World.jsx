import { useMemo } from 'react'
import * as THREE from 'three'
import Portal from './Portal.jsx'
import ArcadeMachine from './ArcadeMachine.jsx'
import Librarian from './guide/Librarian.jsx'
import { ALL_MACHINES, GUIDE, H, PORTAL, ROOM } from './layout.js'

const W = ROOM.xMax - ROOM.xMin
const D = ROOM.zMax - ROOM.zMin
const CX = (ROOM.xMin + ROOM.xMax) / 2
const CZ = (ROOM.zMin + ROOM.zMax) / 2

function Wall({ x, z, len, alongX, color = '#e8e0d0' }) {
  return (
    <mesh position={[x, H / 2, z]}>
      <boxGeometry args={alongX ? [len, H, 0.12] : [0.12, H, len]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  )
}

function Column({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[0.35, 0.4, H, 16]} />
        <meshStandardMaterial color="#f0e6d2" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.4, 16]} />
        <meshStandardMaterial color="#d4a73a" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, H - 0.2, 0]}>
        <cylinderGeometry args={[0.5, 0.45, 0.4, 16]} />
        <meshStandardMaterial color="#d4a73a" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

function ShelfRow({ x, z, rot = 0 }) {
  // decorative scroll shelves between cabinets
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.35, 2.4, 2.2]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.9} />
      </mesh>
      {[-0.6, 0, 0.6].map((dz, i) => (
        <mesh key={i} position={[0.12, 1.2 + (i % 3) * 0.35, dz]}>
          <cylinderGeometry args={[0.06, 0.06, 0.55, 10]} />
          <meshStandardMaterial color="#efe3bd" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export default function World({ talking = false, onTalk }) {
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3344', roughness: 0.9 }), [])
  const ceilMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1520' }), [])
  return (
    <>
      <color attach="background" args={['#0c0a12']} />
      <fog attach="fog" args={['#0c0a12', 18, 55]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffe8c8', '#2a2035', 0.55]} />
      <pointLight position={[0, H - 0.5, 0]} intensity={40} distance={30} color="#ffd6a0" />
      <pointLight position={[-8, 3, -6]} intensity={16} distance={16} color="#e8a86a" />
      <pointLight position={[8, 3, -6]} intensity={16} distance={16} color="#6ab0c9" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CX, 0, CZ]} material={floorMat}>
        <planeGeometry args={[W, D]} />
      </mesh>
      {/* marble aisle runner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, CZ]}>
        <planeGeometry args={[3.2, D - 0.4]} />
        <meshStandardMaterial color="#c9b896" roughness={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[CX, H, CZ]} material={ceilMat}>
        <planeGeometry args={[W, D]} />
      </mesh>

      <Wall x={CX} z={ROOM.zMin} len={W} alongX color="#2a3548" />
      <Wall x={CX} z={ROOM.zMax} len={W} alongX color="#e8e0d0" />
      <Wall x={ROOM.xMin} z={CZ} len={D} color="#e8e0d0" />
      <Wall x={ROOM.xMax} z={CZ} len={D} color="#e8e0d0" />

      {[-10, -3, 4, 10].map((z) => (
        <Column key={`c${z}`} x={-4.5} z={z} />
      ))}
      {[-10, -3, 4, 10].map((z) => (
        <Column key={`d${z}`} x={4.5} z={z} />
      ))}

      {[-12, -7, -2, 3].map((z) => (
        <ShelfRow key={`sl${z}`} x={ROOM.xMin + 0.4} z={z} rot={Math.PI / 2} />
      ))}
      {[-12, -7, -2, 3].map((z) => (
        <ShelfRow key={`sr${z}`} x={ROOM.xMax - 0.4} z={z} rot={-Math.PI / 2} />
      ))}

      {ALL_MACHINES.map((m) => (
        <ArcadeMachine key={m.id} {...m} />
      ))}

      <Librarian talking={talking} onTalk={onTalk} />

      <Portal x={PORTAL.x} z={PORTAL.z} href={PORTAL.href} spawn={PORTAL.spawn} back={PORTAL.back} label={PORTAL.label} sub="every world · portal" />
    </>
  )
}
