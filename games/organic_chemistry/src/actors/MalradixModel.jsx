import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'
import { merge, bolt } from '../engine/geo'
import { Part } from '../engine/models'

// Malradix the Unpaired, modeled on assets/characters/malradix.png: a tall, gaunt sorcerer in a
// tattered crimson hooded robe over black, a dark mantle traced with glowing violet molecule sigils,
// a pale hollow face with violet eyes, a spiked silver crown, and a twisted staff whose curled head
// holds a violet star — a radical's single unpaired electron. Violet sparks crackle round his hand.
// The robes, body, head and staff are built in Blender (tools/intro_blender.py → public/models/intro.glb);
// the star, its light and the crackling sparks stay procedural here.

function useMalradixAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const M = {
      robe: rimMat({ color: '#5c1220', roughness: 0.8, side: THREE.DoubleSide }, '#c84a66', 0.22, 2.4),
      robeDark: rimMat({ color: '#18121c', roughness: 0.85, side: THREE.DoubleSide }, '#a06bff', 0.3, 2.2),
      mantle: rimMat({ color: '#2a1e2e', roughness: 0.7, side: THREE.DoubleSide }, '#b48cff', 0.35, 2.2),
      skin: rimMat({ color: '#a9a8ae', roughness: 0.55 }, '#c8c4d8', 0.25, 2.4),
      silver: new THREE.MeshStandardMaterial({ color: '#c6cad2', metalness: 0.95, roughness: 0.22, envMap: env, envMapIntensity: 1.2 }),
      wood: rimMat({ color: '#3a2620', roughness: 0.8 }, '#a06bff', 0.25),
      sigil: new THREE.MeshBasicMaterial({ color: '#b07aff', toneMapped: false }),
      eye: new THREE.MeshBasicMaterial({ color: '#d0a0ff', toneMapped: false }),
      dark: new THREE.MeshBasicMaterial({ color: '#0a070c' }),
      star: new THREE.MeshStandardMaterial({ color: '#9a5ae8', emissive: new THREE.Color('#a06bff'), emissiveIntensity: 1.6, toneMapped: false }),
      spark: new THREE.MeshBasicMaterial({ color: '#c79bff', transparent: true, opacity: 0.9, toneMapped: false }),
    }
    const sparks = merge([...bolt([0, 0, 0], [0.18, 0.22, 0.05], 3, 4, 0.06, 0.006), ...bolt([0, 0, 0], [-0.12, 0.25, -0.08], 7, 4, 0.06, 0.006), ...bolt([0, 0, 0], [0.05, -0.2, 0.12], 13, 4, 0.06, 0.006)])
    M.staffWood = M.wood
    return { M, sparks }
  }, [gl])
}

export function Malradix({ staffGlow = 1, ...props }) {
  const A = useMalradixAssets()
  const { M } = A
  const star = useRef()
  const robe = useRef()
  const crackle = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (star.current) { star.current.rotation.z = t * 1.5; star.current.rotation.y = t * 0.7; star.current.scale.setScalar(1 + Math.sin(t * 5) * 0.12) }
    if (robe.current) { robe.current.rotation.y = Math.sin(t * 0.7) * 0.03; robe.current.scale.x = 1 + Math.sin(t * 1.4) * 0.015 }
    if (crackle.current) { crackle.current.visible = Math.sin(t * 19) + Math.sin(t * 6.1) > -0.2; crackle.current.rotation.y = t * 3 }
    M.star.emissiveIntensity = (1.5 + Math.sin(t * 5) * 0.4) * staffGlow
  })
  return (
    <group {...props}>
      <group ref={robe}><Part model="intro" name="mal_robe" mats={M} /></group>
      <Part model="intro" name="mal_body" mats={M} />
      <Part model="intro" name="mal_head" mats={M} />
      {/* the left hand's crackle, in the hanging arm's frame */}
      <group position={[-0.34, 1.95, 0]} rotation={[0.05, 0, -0.18]}>
        <group ref={crackle} position={[0, -0.92, 0.04]}><mesh geometry={A.sparks} material={M.spark} /></group>
      </group>
      {/* staff with the curled head and the star */}
      <group position={[0.52, 0.0, 0.32]} rotation={[0.08, 0, -0.06]}>
        <Part model="intro" name="mal_staff" mats={M} />
        <group position={[0.0, 2.62, 0]}>
          <group ref={star}>
            {[0, 1].map((k) => <mesh key={k} rotation={[0, 0, k * Math.PI / 4]} scale={[0.6, 1.6, 0.6]} material={M.star}><octahedronGeometry args={[0.1, 0]} /></mesh>)}
            {[0, 1].map((k) => <mesh key={'h' + k} rotation={[0, 0, Math.PI / 2 + k * Math.PI / 4]} scale={[0.6, 1.6, 0.6]} material={M.star}><octahedronGeometry args={[0.1, 0]} /></mesh>)}
          </group>
          <pointLight color="#a06bff" intensity={3 * staffGlow} distance={7} />
        </group>
      </group>
    </group>
  )
}
