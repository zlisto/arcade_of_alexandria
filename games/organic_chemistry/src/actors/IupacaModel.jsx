import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'

// Archivist Iupaca, modeled on assets/characters/sage-iupaca.png: a precise elderly scholar with a
// silver bun and round wire spectacles, an ink-stained forest-green robe with a leather belt, an open
// scroll whose zigzag carbon chain glows cyan, and a small brass lantern at her hip.

function useIupacaAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    return {
      robe: rimMat({ color: '#2f5a3e', roughness: 0.85 }, '#bfe8c8', 0.3),
      robeDark: rimMat({ color: '#21402c', roughness: 0.9 }, '#bfe8c8', 0.2),
      trim: rimMat({ color: '#6a8a58', roughness: 0.7 }, '#e0f0c0', 0.2),
      ink: new THREE.MeshStandardMaterial({ color: '#141a16', roughness: 0.9 }),
      skin: rimMat({ color: '#e0ac90', roughness: 0.6 }, '#ffd8c0', 0.2, 3),
      hair: rimMat({ color: '#d8d6d2', roughness: 0.75 }, '#ffffff', 0.35, 2),
      leather: rimMat({ color: '#7a4a2a', roughness: 0.7 }, '#ffcf9a', 0.2),
      brass: new THREE.MeshStandardMaterial({ color: '#b8904a', metalness: 0.85, roughness: 0.3, envMap: env, envMapIntensity: 1 }),
      wire: new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.9, roughness: 0.25, envMap: env }),
      lens: new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05, envMap: env, depthWrite: false }),
      paper: rimMat({ color: '#cfc2a2', roughness: 0.95, side: THREE.DoubleSide }, '#fff6dc', 0.05),
      glow: new THREE.MeshStandardMaterial({ color: '#7ff4ff', emissive: new THREE.Color('#2fd8f0'), emissiveIntensity: 2.2, toneMapped: false }),
      node: new THREE.MeshStandardMaterial({ color: '#1a1a22', roughness: 0.4 }),
      flame: new THREE.MeshStandardMaterial({ color: '#fff0c0', emissive: new THREE.Color('#ffb04a'), emissiveIntensity: 2.6, toneMapped: false }),
      eye: new THREE.MeshBasicMaterial({ color: '#2a3440' }),
    }
  }, [gl])
}

// the scroll's chain: a zigzag of carbons, like the one on her portrait
const CHAIN = [[-0.11, 0.2], [-0.03, 0.15], [0.05, 0.2], [0.05, 0.1], [-0.05, 0.05], [-0.09, -0.04], [-0.02, -0.1], [-0.07, -0.18], [0.03, -0.22]]

export function Iupaca(props) {
  const M = useIupacaAssets()
  const body = useRef(), head = useRef(), lamp = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.position.y = Math.sin(t * 1.3) * 0.01
    if (head.current) { head.current.rotation.y = Math.sin(t * 0.5) * 0.15; head.current.rotation.x = 0.12 + Math.sin(t * 0.7) * 0.03 }
    if (lamp.current) lamp.current.rotation.z = Math.sin(t * 1.6) * 0.12
  })
  const sticks = useMemo(() => CHAIN.slice(1).map((b, i) => {
    const a = CHAIN[i], dx = b[0] - a[0], dy = b[1] - a[1]
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, l: Math.hypot(dx, dy), r: Math.atan2(dy, dx) }
  }), [])
  return (
    <group {...props}>
      <group ref={body}>
        {/* robe: a long flared cone, hem darker, with ink spatters */}
        <mesh position={[0, 0.62, 0]} material={M.robe} castShadow><cylinderGeometry args={[0.24, 0.46, 1.24, 18]} /></mesh>
        <mesh position={[0, 0.05, 0]} material={M.robeDark}><cylinderGeometry args={[0.465, 0.48, 0.1, 18]} /></mesh>
        <mesh position={[0, 1.36, 0]} scale={[1, 0.9, 0.82]} material={M.robe} castShadow><sphereGeometry args={[0.27, 18, 14]} /></mesh>
        <mesh position={[0, 1.54, 0.02]} material={M.robeDark}><cylinderGeometry args={[0.1, 0.16, 0.12, 14]} /></mesh>
        {[[0.18, 0.9, 0.36], [-0.22, 0.55, 0.38], [0.1, 0.32, 0.44], [-0.05, 1.15, 0.24]].map((p, i) => <mesh key={i} position={p} material={M.ink}><sphereGeometry args={[0.035 + (i % 2) * 0.015, 8, 6]} /></mesh>)}
        {/* embroidered trim down the front */}
        <mesh position={[0, 0.7, 0.33]} rotation={[0.18, 0, 0]} material={M.trim}><boxGeometry args={[0.07, 1.05, 0.02]} /></mesh>
        {/* belt and buckle */}
        <mesh position={[0, 1.06, 0]} material={M.leather}><torusGeometry args={[0.27, 0.035, 8, 22]} /></mesh>
        <mesh position={[0, 1.06, 0.28]} material={M.brass}><boxGeometry args={[0.09, 0.08, 0.03]} /></mesh>
        {/* head */}
        <group ref={head} position={[0, 1.73, 0.02]}>
          <mesh material={M.skin} castShadow><sphereGeometry args={[0.17, 20, 16]} /></mesh>
          <mesh position={[0, -0.03, 0.16]} material={M.skin}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
          {/* silver hair, swept back into a bun */}
          <mesh position={[0, 0.05, -0.03]} scale={[1.05, 0.85, 1.05]} material={M.hair}><sphereGeometry args={[0.175, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} /></mesh>
          <mesh position={[0, 0.13, -0.15]} material={M.hair}><sphereGeometry args={[0.09, 14, 12]} /></mesh>
          {/* round wire spectacles */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.065, 0.015, 0.155]}>
              <mesh material={M.wire}><torusGeometry args={[0.042, 0.006, 6, 18]} /></mesh>
              <mesh material={M.lens}><circleGeometry args={[0.04, 16]} /></mesh>
              <mesh position={[0, 0, -0.01]} material={M.eye}><sphereGeometry args={[0.014, 8, 6]} /></mesh>
            </group>
          ))}
          <mesh position={[0, 0.015, 0.16]} material={M.wire}><boxGeometry args={[0.04, 0.006, 0.006]} /></mesh>
          {/* a thin, unimpressed mouth */}
          <mesh position={[0, -0.085, 0.158]} material={M.ink}><boxGeometry args={[0.05, 0.007, 0.004]} /></mesh>
        </group>
        {/* arms in wide sleeves, both holding the scroll in front */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.27, 1.38, 0.02]} rotation={[-0.9, 0, s * 0.35]}>
            <mesh position={[0, -0.22, 0]} material={M.robe} castShadow><cylinderGeometry args={[0.07, 0.12, 0.46, 12]} /></mesh>
            <mesh position={[0, -0.47, 0]} material={M.skin}><sphereGeometry args={[0.055, 10, 8]} /></mesh>
          </group>
        ))}
        {/* the scroll, with its glowing zigzag chain */}
        <group position={[0, 1.22, 0.42]} rotation={[-0.35, 0, 0]}>
          <mesh material={M.paper}><planeGeometry args={[0.34, 0.5]} /></mesh>
          {[0.26, -0.26].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} material={M.paper}><cylinderGeometry args={[0.03, 0.03, 0.38, 10]} /></mesh>)}
          {CHAIN.map(([x, y], i) => <mesh key={i} position={[x, y, 0.012]} material={M.node}><sphereGeometry args={[0.016, 8, 6]} /></mesh>)}
          {sticks.map((st, i) => <mesh key={'s' + i} position={[st.x, st.y, 0.008]} rotation={[0, 0, st.r]} material={M.glow}><boxGeometry args={[st.l, 0.008, 0.004]} /></mesh>)}
          <pointLight position={[0, 0, 0.15]} color="#7ff4ff" intensity={0.3} distance={1.2} />
        </group>
        {/* brass lantern on her belt */}
        <group ref={lamp} position={[0.3, 1.02, 0.12]}>
          <mesh position={[0, -0.1, 0]} material={M.brass}><cylinderGeometry args={[0.012, 0.012, 0.08, 6]} /></mesh>
          <mesh position={[0, -0.2, 0]} material={M.brass}><cylinderGeometry args={[0.06, 0.06, 0.02, 10]} /></mesh>
          <mesh position={[0, -0.27, 0]} material={M.flame}><sphereGeometry args={[0.035, 10, 8]} /></mesh>
          {[0, 1, 2, 3].map((k) => <mesh key={k} position={[Math.cos(k * Math.PI / 2) * 0.05, -0.27, Math.sin(k * Math.PI / 2) * 0.05]} material={M.brass}><boxGeometry args={[0.01, 0.12, 0.01]} /></mesh>)}
          <mesh position={[0, -0.34, 0]} material={M.brass}><cylinderGeometry args={[0.065, 0.055, 0.025, 10]} /></mesh>
          <pointLight position={[0, -0.27, 0.05]} color="#ffb04a" intensity={1.4} distance={2.5} />
        </group>
      </group>
    </group>
  )
}
