import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'

// Lady Sachse of the Chair (World 4's sage), modeled on assets/characters/sage-sachse.png: a regal
// noblewoman in a violet-grey armour-dress under a silver diadem. She sits only on strain-free thrones.
// Built in Blender (tools/sachse_blender.py → public/models/sachse.glb).
preloadModels('sachse')

function useSachseAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const metal = (color, rough = 0.32) => new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: rough, envMap: env, envMapIntensity: 1.1 })
    return {
      gown: rimMat({ color: '#5a4a80', roughness: 0.7 }, '#d8c8ff', 0.4),
      gownLight: rimMat({ color: '#8a7aaa', roughness: 0.65 }, '#efe4ff', 0.35),
      trim: metal('#d0c8e0', 0.3),
      armor: metal('#8e8aa6'),
      armorDark: metal('#4e4a66', 0.38),
      skin: rimMat({ color: '#e8c2ac', roughness: 0.55 }, '#ffe0d0', 0.25, 3),
      lip: rimMat({ color: '#b8686a', roughness: 0.5 }, '#ffc0c0', 0.1),
      hair: rimMat({ color: '#2a2034', roughness: 0.5 }, '#9a8ac8', 0.45, 2),
      silver: metal('#e4e4f0', 0.18),
      gem: new THREE.MeshStandardMaterial({ color: '#b06af0', emissive: new THREE.Color('#9a4ae8'), emissiveIntensity: 1.6, roughness: 0.15, toneMapped: false }),
      eye: new THREE.MeshStandardMaterial({ color: '#f2eee8', roughness: 0.3 }),
      iris: new THREE.MeshBasicMaterial({ color: '#4a2a6a' }),
      dark: new THREE.MeshBasicMaterial({ color: '#140e18' }),
      stone: rimMat({ color: '#4a4660', roughness: 0.85 }, '#b8b0e0', 0.2),
      stoneLight: rimMat({ color: '#6a6680', roughness: 0.8 }, '#d8d0ff', 0.25),
      flame: new THREE.MeshStandardMaterial({ color: '#9ff8ff', emissive: new THREE.Color('#3ae8ff'), emissiveIntensity: 2.6, toneMapped: false }),
    }
  }, [gl])
}

export function Sachse(props) {
  const M = useSachseAssets()
  const root = useRef(), eyes = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (root.current) root.current.scale.y = 1 + Math.sin(t * 1.4) * 0.006
    if (eyes.current) eyes.current.scale.y = (t % 4.7) < 0.12 ? 0.12 : 1
  })
  return (
    <group {...props}>
      <group ref={root}>
        <Part model="sachse" name="sac_body" mats={M} />
        <group ref={eyes} position={[0, 1.62, 0]}><Part model="sachse" name="sac_eyes" mats={M} castShadow={false} /></group>
        <pointLight position={[0, 2.2, 1.0]} color="#e8dcff" intensity={1.4} distance={5} />
      </group>
    </group>
  )
}

/** Her chair throne: a zigzag six-carbon back with six cyan-flame posts. */
export function SachseThrone(props) {
  const M = useSachseAssets()
  return (
    <group {...props}>
      <Part model="sachse" name="sac_throne" mats={M} />
      <pointLight position={[0, 1.8, 0.4]} color="#5ff0ff" intensity={2.2} distance={6} />
    </group>
  )
}
