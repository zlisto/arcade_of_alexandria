import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part } from '../engine/models'

// Tide Coast cast: the Proton Ferrymen in their boat, and the water-folk who live on the coast.
// Built in Blender (tools/coastfolk_blender.py → public/models/coastfolk.glb); the proton stays procedural.

// Brønsted and Lowry, the Proton Ferrymen: twin boatmen (one in red, one in blue) passing a glowing
// proton between their poles — the proton always rides from acid to base (§2.7).
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
    coatRed: rimMat({ color: '#a8303e', roughness: 0.75 }, '#ffffff', 0.2),
    coatBlue: rimMat({ color: '#2a4a8a', roughness: 0.75 }, '#ffffff', 0.2),
    hair: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.6 }),
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
        <Part model="coastfolk" name="fm_boat" mats={M} />
        <Part model="coastfolk" name="fm_manL" mats={{ ...M, coat: M.coatRed }} />
        <Part model="coastfolk" name="fm_manR" mats={{ ...M, coat: M.coatBlue }} />
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
        <Part model="coastfolk" name="wf_body" mats={M} />
      </group>
    </group>
  )
}
