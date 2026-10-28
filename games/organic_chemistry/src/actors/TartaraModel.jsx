import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'

// Sister Tartara (World 5's sage), modeled on assets/characters/sister-tartara.png: a serene young scholar-nun
// in a silver and pale-blue habit, silver tweezers in each hand, sorting mirror-image crystals as Pasteur did.
// Built in Blender (tools/tartara_blender.py → public/models/tartara.glb).
preloadModels('tartara')

function useTartaraAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const metal = (c, r = 0.2) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: r, envMap: env, envMapIntensity: 1.2 })
    return {
      robe: rimMat({ color: '#b8c4d8', roughness: 0.7 }, '#ffffff', 0.35),
      robeLight: rimMat({ color: '#e2e8f4', roughness: 0.65 }, '#ffffff', 0.3),
      veil: rimMat({ color: '#8a9cbc', roughness: 0.7 }, '#e8f0ff', 0.35),
      wimple: rimMat({ color: '#f2f5fa', roughness: 0.6 }, '#ffffff', 0.25),
      skin: rimMat({ color: '#ecc8b4', roughness: 0.55 }, '#ffe8d8', 0.25, 3),
      lip: rimMat({ color: '#c07a78', roughness: 0.5 }, '#ffd0c8', 0.1),
      hair: rimMat({ color: '#2a2228', roughness: 0.5 }, '#a8b0d0', 0.35, 2),
      silver: metal('#e0e2ee'),
      eye: new THREE.MeshStandardMaterial({ color: '#f2eee8', roughness: 0.3 }),
      iris: new THREE.MeshBasicMaterial({ color: '#3a5a7a' }),
      dark: new THREE.MeshBasicMaterial({ color: '#120e18' }),
      stone: rimMat({ color: '#5a6070', roughness: 0.85 }, '#c8d8f0', 0.2),
      stoneLight: rimMat({ color: '#7a8296', roughness: 0.8 }, '#d8e4ff', 0.2),
      gold: new THREE.MeshStandardMaterial({ color: '#ffe090', emissive: new THREE.Color('#ffb840'), emissiveIntensity: 1.6, roughness: 0.2, toneMapped: false }),
      crys: new THREE.MeshStandardMaterial({ color: '#f0f8ff', emissive: new THREE.Color('#bfe0ff'), emissiveIntensity: 1.3, roughness: 0.1, toneMapped: false }),
      mirror: new THREE.MeshStandardMaterial({ color: '#dce6f2', metalness: 1, roughness: 0.04, envMap: env, envMapIntensity: 1.6 }),
      frame: metal('#9aa0b0', 0.3),
    }
  }, [gl])
}

export function Tartara({ withTable = true, ...props }) {
  const M = useTartaraAssets()
  const root = useRef(), eyes = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (root.current) root.current.rotation.x = Math.sin(t * 0.9) * 0.015 // leaning over her crystals
    if (eyes.current) eyes.current.scale.y = (t % 5.1) < 0.12 ? 0.12 : 1
  })
  return (
    <group {...props}>
      <group ref={root}>
        <Part model="tartara" name="tar_body" mats={M} />
        <group ref={eyes} position={[0, 1.58, 0]}><Part model="tartara" name="tar_eyes" mats={M} castShadow={false} /></group>
      </group>
      {withTable && <Part model="tartara" name="tar_table" mats={M} />}
      <pointLight position={[0, 2.2, 1.2]} color="#e8f0ff" intensity={1.4} distance={5} />
      {withTable && <pointLight position={[0, 1.3, 0.85]} color="#ffe0a0" intensity={1.2} distance={2.5} />}
    </group>
  )
}
