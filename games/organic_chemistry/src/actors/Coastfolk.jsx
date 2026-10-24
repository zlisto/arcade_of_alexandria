import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'

// Tide Coast cast: the Proton Ferrymen in their boat, and the water-folk who live on the coast.

// Brønsted and Lowry, the Proton Ferrymen: twin boatmen (one in red, one in blue) passing a glowing
// proton between their poles — the proton always rides from acid to base (§2.7).
function Boatman({ coat, side, M }) {
  const coatMat = useMemo(() => rimMat({ color: coat, roughness: 0.7 }, '#ffffff', 0.25), [coat])
  return (
    <group position={[side * 0.95, 0.35, 0]}>
      <mesh position={[0, 0.55, 0]} material={M.trousers}><capsuleGeometry args={[0.2, 0.4, 4, 10]} /></mesh>
      <mesh position={[0, 1.05, 0]} scale={[1, 1, 0.85]} material={coatMat} castShadow><capsuleGeometry args={[0.28, 0.45, 6, 12]} /></mesh>
      <mesh position={[0, 0.8, 0]} scale={[1.1, 0.35, 0.95]} material={coatMat}><cylinderGeometry args={[0.3, 0.36, 0.5, 14]} /></mesh>
      <mesh position={[0, 1.36, 0]} material={M.belt}><torusGeometry args={[0.26, 0.04, 6, 18]} /></mesh>
      <group position={[0, 1.66, 0.02]}>
        <mesh material={M.skin} castShadow><sphereGeometry args={[0.2, 18, 14]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, 0.03, 0.17]} material={M.eye}><sphereGeometry args={[0.025, 8, 6]} /></mesh>)}
        <mesh position={[0, -0.02, 0.19]} material={M.skin}><sphereGeometry args={[0.04, 8, 6]} /></mesh>
        <mesh position={[0, -0.1, 0.12]} scale={[1, 0.8, 0.7]} material={M.beard}><sphereGeometry args={[0.16, 12, 10]} /></mesh>
        {/* sailor's cap */}
        <mesh position={[0, 0.15, 0]} material={coatMat}><cylinderGeometry args={[0.17, 0.21, 0.14, 16]} /></mesh>
        <mesh position={[0, 0.09, 0.12]} rotation={[0.3, 0, 0]} material={M.belt}><boxGeometry args={[0.3, 0.02, 0.12]} /></mesh>
      </group>
      {/* the pole, angled toward the middle of the boat */}
      <mesh position={[-side * 0.25, 1.4, 0.15]} rotation={[0, 0, side * 0.55]} material={M.wood}><cylinderGeometry args={[0.03, 0.03, 2.4, 6]} /></mesh>
    </group>
  )
}

export function Ferrymen(props) {
  const M = useMemo(() => ({
    hull: rimMat({ color: '#7a5030', roughness: 0.8 }, '#ffd8a0', 0.2),
    trim: rimMat({ color: '#d8b060', roughness: 0.5, metalness: 0.5 }, '#ffe0a0', 0.2),
    wood: new THREE.MeshStandardMaterial({ color: '#5a3c26', roughness: 0.8 }),
    trousers: new THREE.MeshStandardMaterial({ color: '#2a2a33', roughness: 0.9 }),
    belt: new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.7 }),
    skin: rimMat({ color: '#d9a07e', roughness: 0.6 }, '#ffd0b0', 0.2),
    eye: new THREE.MeshBasicMaterial({ color: '#1a1414' }),
    beard: rimMat({ color: '#e8e2d8', roughness: 0.9, flatShading: true }, '#ffffff', 0.2),
    proton: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color('#fff2d0'), emissiveIntensity: 2.6, toneMapped: false }),
  }), [])
  const boat = useRef(), proton = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (boat.current) { boat.current.position.y = Math.sin(t * 1.3) * 0.08; boat.current.rotation.z = Math.sin(t * 0.9) * 0.04 }
    // the proton rides back and forth in an arc between the two poles
    if (proton.current) { const k = (Math.sin(t * 1.4) + 1) / 2; proton.current.position.set(-1.1 + 2.2 * k, 2.6 + Math.sin(k * Math.PI) * 0.6, 0.15) }
  })
  return (
    <group {...props}>
      <group ref={boat}>
        <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.55]} material={M.hull} castShadow><cylinderGeometry args={[0.6, 0.6, 3.6, 18, 1, true, 0, Math.PI]} /></mesh>
        <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.wood}><planeGeometry args={[3.4, 0.62]} /></mesh>
        {[-1.8, 1.8].map((x) => <mesh key={x} position={[x, 0.5, 0]} rotation={[0, 0, x > 0 ? -0.5 : 0.5]} material={M.hull}><coneGeometry args={[0.32, 0.8, 8]} /></mesh>)}
        <mesh position={[0, 0.58, 0]} rotation={[0, 0, Math.PI / 2]} material={M.trim}><torusGeometry args={[0.02, 0.02, 4, 4]} /></mesh>
        <Boatman coat="#c0394b" side={-1} M={M} />
        <Boatman coat="#2f6fd8" side={1} M={M} />
        <mesh ref={proton} material={M.proton}><sphereGeometry args={[0.13, 14, 12]} /></mesh>
        <pointLight position={[0, 2.8, 0.4]} color="#fff2d0" intensity={2} distance={6} />
      </group>
    </group>
  )
}

// Water-folk: each is an H₂O — a round red oxygen body with two white hydrogen "ears" at a bent
// angle (§2.2: water is bent, so its dipoles add up), with a face and a little hat.
export function WaterFolk({ hat = '#2f6fd8', ...props }) {
  const M = useMemo(() => ({
    o: rimMat({ color: '#d8423a', roughness: 0.45 }, '#ffc0b0', 0.3),
    h: rimMat({ color: '#f6f6f6', roughness: 0.4 }, '#ffffff', 0.25),
    face: new THREE.MeshBasicMaterial({ color: '#2a0a0a' }),
    hat: rimMat({ color: hat, roughness: 0.7 }, '#ffffff', 0.2),
    lp: new THREE.MeshBasicMaterial({ color: '#ffd760', toneMapped: false }),
  }), [hat])
  const g = useRef()
  const seed = useMemo(() => Math.random() * 6, [])
  useFrame(({ clock }) => { if (g.current) g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 2 + seed)) * 0.05 })
  return (
    <group {...props}>
      <group ref={g}>
        <mesh position={[0, 0.62, 0]} material={M.o} castShadow><sphereGeometry args={[0.5, 24, 18]} /></mesh>
        {/* the two hydrogens, 104.5° apart */}
        {[-1, 1].map((s) => { const a = s * (104.5 / 2) * Math.PI / 180; return <mesh key={s} position={[Math.sin(a) * 0.55, 0.62 + Math.cos(a) * 0.55, 0]} material={M.h} castShadow><sphereGeometry args={[0.24, 18, 14]} /></mesh> })}
        {[-1, 1].map((s) => <mesh key={'e' + s} position={[s * 0.14, 0.72, 0.45]} scale={[1, 1.3, 0.5]} material={M.face}><sphereGeometry args={[0.05, 10, 8]} /></mesh>)}
        <mesh position={[0, 0.54, 0.47]} rotation={[0.2, 0, Math.PI]} material={M.face}><torusGeometry args={[0.08, 0.015, 6, 14, Math.PI]} /></mesh>
        {/* two lone pairs glowing faintly on the underside */}
        {[-1, 1].map((s) => <mesh key={'l' + s} position={[s * 0.22, 0.28, 0.32]} material={M.lp}><sphereGeometry args={[0.035, 8, 6]} /></mesh>)}
        <mesh position={[0, 1.08, 0]} material={M.hat}><cylinderGeometry args={[0.16, 0.22, 0.16, 14]} /></mesh>
        {[-1, 1].map((s) => <mesh key={'f' + s} position={[s * 0.18, 0.08, 0.05]} scale={[1, 0.5, 1.4]} material={M.o}><sphereGeometry args={[0.12, 10, 8]} /></mesh>)}
      </group>
    </group>
  )
}
