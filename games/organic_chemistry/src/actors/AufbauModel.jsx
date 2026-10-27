import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'
import { Part } from '../engine/models'

// Sage Aufbau, modeled on assets/characters/sage-aufbau.png: a stocky old miner-sage with a great
// white beard, bushy brows and a ruddy nose; a leather coat with straps, belt and pouches; a steel
// miner's helmet with a headlamp; and a crystal pickaxe. On his helmet sits a stack of glowing bulbs
// that fills from the bottom up — 1s, then 2s, then the three 2p — his own rule (§1.3).
// Built in Blender (tools/aufbau_blender.py → public/models/aufbau.glb); the bulbs stay procedural.

function useAufbauAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    return {
      leather: rimMat({ color: '#6a4a30', roughness: 0.75 }, '#ffcf9a', 0.25),
      leatherDark: rimMat({ color: '#43301f', roughness: 0.8 }, '#ffcf9a', 0.2),
      cloth: rimMat({ color: '#5f6a44', roughness: 0.9 }, '#c8e0b0', 0.2),
      skin: rimMat({ color: '#d99a7e', roughness: 0.6 }, '#ffd0b0', 0.2, 3),
      nose: rimMat({ color: '#d4806c', roughness: 0.6 }, '#ffc0a0', 0.2, 3),
      beard: rimMat({ color: '#ece8e2', roughness: 0.85 }, '#ffffff', 0.35, 2),
      steel: new THREE.MeshStandardMaterial({ color: '#4a4e56', metalness: 0.85, roughness: 0.3, envMap: env, envMapIntensity: 1 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.85, roughness: 0.3, envMap: env, envMapIntensity: 1 }),
      wood: rimMat({ color: '#5a3c26', roughness: 0.8 }, '#ffcf9a', 0.15),
      rope: rimMat({ color: '#8a7050', roughness: 0.9 }, '#ffcf9a', 0.1),
      trousers: rimMat({ color: '#2f3a2c', roughness: 0.9 }, '#c8e0b0', 0.15),
      dark: new THREE.MeshBasicMaterial({ color: '#141010' }),
      eye: new THREE.MeshStandardMaterial({ color: '#f2eee8', roughness: 0.3 }),
      iris: new THREE.MeshBasicMaterial({ color: '#2a3a4a' }),
      crystal: new THREE.MeshStandardMaterial({ color: '#43d8ee', emissive: new THREE.Color('#1fb8d4'), emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92, flatShading: true }),
      bulb: new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: new THREE.Color('#ffcf6a'), emissiveIntensity: 2, roughness: 0.2, toneMapped: false }),
      glass: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1, envMap: env, depthWrite: false }),
    }
  }, [gl])
}

function Bulb({ M, pos, refCb }) {
  const mat = useMemo(() => M.bulb.clone(), [M]) // each bulb lights on its own
  return (
    <group position={pos}>
      <mesh material={M.glass}><sphereGeometry args={[0.075, 16, 12]} /></mesh>
      <mesh ref={refCb} material={mat}><sphereGeometry args={[0.04, 12, 10]} /></mesh>
    </group>
  )
}

export function Aufbau(props) {
  const M = useAufbauAssets()
  const root = useRef()
  const beard = useRef()
  const eyes = useRef()
  const bulbs = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (root.current) root.current.scale.y = 1 + Math.sin(t * 1.8) * 0.008
    if (beard.current) beard.current.rotation.x = Math.sin(t * 1.3) * 0.03
    if (eyes.current) eyes.current.scale.y = (t % 4.1) < 0.12 ? 0.12 : 1
    // bulbs fill bottom-up, then all glow together, then reset — the Aufbau order
    const cyc = (t * 0.8) % 7
    bulbs.current.forEach((b, i) => { if (b) b.material.emissiveIntensity = cyc > i ? 2.2 : 0.25 })
  })
  return (
    <group {...props}>
      <group ref={root}>
        {/* body, coat, arms, pickaxe, head and helmet: built in Blender (tools/aufbau_blender.py) */}
        <Part model="aufbau" name="auf_body" mats={M} />
        <group position={[0, 1.18, 0.02]}>
          <group ref={eyes} position={[0, 0.03, 0]}><Part model="aufbau" name="auf_eyes" mats={M} castShadow={false} /></group>
          <group ref={beard} position={[0, -0.095, 0]}><Part model="aufbau" name="auf_beard" mats={M} /></group>
          {/* the Aufbau stack: 1s, then 2s, then three 2p, bottom-up (the rack itself is in the model) */}
          <group position={[0, 0.3, -0.01]}>
            <Bulb M={M} pos={[0, 0.02, 0]} refCb={(m) => (bulbs.current[0] = m)} />
            <Bulb M={M} pos={[0, 0.17, 0]} refCb={(m) => (bulbs.current[1] = m)} />
            {[-1, 0, 1].map((k, i) => <Bulb key={k} M={M} pos={[k * 0.15, 0.32, 0]} refCb={(m) => (bulbs.current[2 + i] = m)} />)}
          </group>
        </group>
        <pointLight position={[-0.45, 0.6, 0.45]} color="#43e6f5" intensity={1.2} distance={2.5} />
        <pointLight position={[0, 2.3, 0.9]} color="#ffe6a0" intensity={1.4} distance={6} />
      </group>
    </group>
  )
}
