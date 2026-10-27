import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'
import { Part } from '../engine/models'

// Princess Octavia, modeled on assets/characters/octavia.png: tall and slender, long straight black
// hair with blunt bangs, a gold circlet set with cyan lights, a warm smile, and a flowing white gown
// with a gold V-neck mantle, wide bell sleeves with gold cuffs, a gold V-belt and gold bands to the hem.
// Her hands are cupped in front of her (in the intro the crown hovers there).
// Built in Blender (tools/intro_blender.py → public/models/intro.glb): oct_body, oct_head, oct_eyes, oct_hair.

function useOctaviaAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const M = {
      silk: rimMat({ color: '#f3efe6', roughness: 0.55, envMap: env, envMapIntensity: 0.35 }, '#fff2d0', 0.35, 2.4),
      silkShade: rimMat({ color: '#efe9de', roughness: 0.6, side: THREE.DoubleSide }, '#fff2d0', 0.25),
      gold: new THREE.MeshStandardMaterial({ color: '#d8b060', metalness: 0.9, roughness: 0.28, envMap: env, envMapIntensity: 1.1 }),
      skin: rimMat({ color: '#efcbb0', roughness: 0.55 }, '#ffe2cc', 0.2, 3),
      hair: rimMat({ color: '#0d0d12', roughness: 0.35, metalness: 0.2, envMap: env, envMapIntensity: 0.5, side: THREE.DoubleSide }, '#8a9cff', 0.4, 2),
      eye: new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.3 }),
      iris: new THREE.MeshStandardMaterial({ color: '#4a3226', roughness: 0.25 }),
      dark: new THREE.MeshBasicMaterial({ color: '#100c0c' }),
      lip: new THREE.MeshStandardMaterial({ color: '#a8484c', roughness: 0.45 }),
      blush: new THREE.MeshBasicMaterial({ color: '#f29a9a', transparent: true, opacity: 0.25, depthWrite: false }),
      light: new THREE.MeshBasicMaterial({ color: '#bff6ff', toneMapped: false }),
    }
    // Blender material names -> the game's lit materials
    Object.assign(M, { octGold: M.gold, octSkin: M.skin, eyeWhite: M.eye, pupil: M.dark, lash: M.dark })
    return { M }
  }, [gl])
}

export function Octavia(props) {
  const A = useOctaviaAssets()
  const root = useRef()
  const eyes = useRef()
  const hair = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (root.current) root.current.rotation.z = Math.sin(t * 0.8) * 0.012
    if (hair.current) hair.current.rotation.x = Math.sin(t * 1.1) * 0.025
    if (eyes.current) eyes.current.scale.y = (t % 4.3) < 0.12 ? 0.1 : 1
  })
  const { M } = A
  return (
    <group {...props}>
      <group ref={root}>
        <Part model="intro" name="oct_body" mats={M} />
        <group position={[0, 1.735, 0]} scale={1.22}>
          <Part model="intro" name="oct_head" mats={M} />
          <group ref={eyes} position={[0, 0.005, 0]}><Part model="intro" name="oct_eyes" mats={M} castShadow={false} /></group>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.058, -0.03, 0.088]} scale={[1, 0.6, 0.4]} material={M.blush}><sphereGeometry args={[0.02, 10, 8]} /></mesh>)}
          <group ref={hair}><Part model="intro" name="oct_hair" mats={M} /></group>
        </group>
        <pointLight position={[0, 1.95, 0.55]} color="#ffe9b8" intensity={3} distance={3} />
      </group>
    </group>
  )
}
