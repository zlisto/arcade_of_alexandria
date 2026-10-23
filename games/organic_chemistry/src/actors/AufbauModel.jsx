import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'

// Sage Aufbau, modeled on assets/characters/sage-aufbau.png: a stocky old miner-sage with a great
// white beard, bushy brows and a ruddy nose; a leather coat with straps, belt and pouches; a steel
// miner's helmet with a headlamp; and a crystal pickaxe. On his helmet sits a stack of glowing bulbs
// that fills from the bottom up — 1s, then 2s, then the three 2p — his own rule (§1.3).

function useAufbauAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    return {
      leather: rimMat({ color: '#6a4a30', roughness: 0.75 }, '#ffcf9a', 0.25),
      leatherDark: rimMat({ color: '#43301f', roughness: 0.8 }, '#ffcf9a', 0.2),
      cloth: rimMat({ color: '#3a4a34', roughness: 0.9 }, '#c8e0b0', 0.2),
      skin: rimMat({ color: '#d99a7e', roughness: 0.6 }, '#ffd0b0', 0.2, 3),
      nose: rimMat({ color: '#d4806c', roughness: 0.6 }, '#ffc0a0', 0.2, 3),
      beard: rimMat({ color: '#ece8e2', roughness: 0.85, flatShading: true }, '#ffffff', 0.35, 2),
      steel: new THREE.MeshStandardMaterial({ color: '#4a4e56', metalness: 0.85, roughness: 0.3, envMap: env, envMapIntensity: 1 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b08a4a', metalness: 0.85, roughness: 0.3, envMap: env, envMapIntensity: 1 }),
      wood: rimMat({ color: '#5a3c26', roughness: 0.8 }, '#ffcf9a', 0.15),
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
      <mesh position={[0, -0.075, 0]} material={M.brass}><cylinderGeometry args={[0.03, 0.035, 0.04, 10]} /></mesh>
    </group>
  )
}

export function Aufbau(props) {
  const M = useAufbauAssets()
  const root = useRef()
  const beard = useRef()
  const eyes = useRef()
  const bulbs = useRef([])
  // the beard: overlapping tufts, longest in the middle
  const tufts = useMemo(() => {
    const out = []
    let s = 11
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 22; i++) {
      const x = (r() - 0.5) * 0.36
      const len = 0.28 + (1 - Math.abs(x) / 0.18) * 0.22 + r() * 0.08
      out.push({ p: [x, -len / 2 + 0.02, 0.13 + (0.18 - Math.abs(x)) * 0.25 + r() * 0.02], s: [0.06 + r() * 0.03, len / 2, 0.05], rz: x * 0.6 + (r() - 0.5) * 0.2 })
    }
    return out
  }, [])
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
        {/* boots and trousers */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.13, 0, 0]}>
            <RoundedBox args={[0.17, 0.14, 0.3]} radius={0.05} smoothness={3} position={[0, 0.07, 0.04]} material={M.leatherDark} castShadow />
            <mesh position={[0, 0.2, 0]} material={M.leatherDark}><cylinderGeometry args={[0.09, 0.1, 0.16, 12]} /></mesh>
            <mesh position={[0, 0.36, 0]} material={M.cloth}><capsuleGeometry args={[0.09, 0.16, 4, 10]} /></mesh>
          </group>
        ))}
        {/* coat: a stout barrel body, a skirt split at the front, straps and belt with pouches */}
        <mesh position={[0, 0.72, 0]} scale={[1, 1, 0.85]} material={M.leather} castShadow><capsuleGeometry args={[0.28, 0.4, 6, 16]} /></mesh>
        <mesh position={[0, 0.5, 0]} scale={[1, 1, 0.85]} material={M.leather}><cylinderGeometry args={[0.3, 0.34, 0.22, 18, 1, true, 0.25, Math.PI * 2 - 0.5]} /></mesh>
        <mesh position={[0, 0.64, 0]} scale={[1, 1, 0.86]} material={M.leatherDark}><cylinderGeometry args={[0.305, 0.305, 0.07, 20]} /></mesh>
        <RoundedBox args={[0.1, 0.08, 0.03]} radius={0.01} smoothness={2} position={[0, 0.64, 0.265]} material={M.brass} />
        {[-1, 1].map((s) => <RoundedBox key={s} args={[0.12, 0.13, 0.07]} radius={0.02} smoothness={2} position={[s * 0.2, 0.55, 0.2]} rotation={[0, s * 0.5, 0]} material={M.leatherDark} />)}
        <mesh position={[0, 0.92, 0.02]} rotation={[0, 0, 0.75]} scale={[1, 1, 0.9]} material={M.leatherDark}><torusGeometry args={[0.29, 0.022, 6, 24, Math.PI]} /></mesh>
        {/* shoulders and arms holding the pickaxe across the body */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.3, 0.98, 0]} rotation={[-0.5, 0, s * 0.25]}>
            <mesh position={[0, 0.02, 0]} material={M.leatherDark}><sphereGeometry args={[0.1, 14, 10]} /></mesh>
            <mesh position={[0, -0.16, 0]} material={M.leather}><capsuleGeometry args={[0.075, 0.18, 4, 10]} /></mesh>
            <group position={[0, -0.3, 0]} rotation={[-0.8, 0, -s * 0.6]}>
              <mesh position={[0, -0.1, 0]} material={M.leather}><capsuleGeometry args={[0.068, 0.14, 4, 10]} /></mesh>
              <mesh position={[0, -0.12, 0]} material={M.leatherDark}><cylinderGeometry args={[0.075, 0.075, 0.08, 12]} /></mesh>
              <mesh position={[0, -0.24, 0.01]} material={M.leatherDark}><sphereGeometry args={[0.06, 12, 10]} /></mesh>
            </group>
          </group>
        ))}
        <group position={[0.05, 0.66, 0.36]} rotation={[0.1, 0.15, -0.55]}>
          <mesh material={M.wood}><cylinderGeometry args={[0.025, 0.028, 0.95, 8]} /></mesh>
          <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} material={M.steel}><cylinderGeometry args={[0.035, 0.035, 0.1, 8]} /></mesh>
          <mesh position={[0.14, 0.5, 0]} rotation={[0, 0, -Math.PI / 2 - 0.25]} scale={[0.7, 1.6, 0.45]} material={M.crystal}><octahedronGeometry args={[0.11, 0]} /></mesh>
          <mesh position={[-0.11, 0.5, 0]} rotation={[0, 0, Math.PI / 2 + 0.2]} material={M.steel}><coneGeometry args={[0.03, 0.14, 6]} /></mesh>
          <pointLight position={[0.15, 0.5, 0.1]} color="#43e6f5" intensity={1.2} distance={2.5} />
        </group>
        {/* head */}
        <group position={[0, 1.18, 0.02]}>
          <mesh scale={[0.95, 1, 0.95]} material={M.skin} castShadow><sphereGeometry args={[0.16, 24, 18]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.152, 0.0, -0.01]} scale={[0.45, 1, 0.7]} material={M.skin}><sphereGeometry args={[0.035, 10, 8]} /></mesh>)}
          <group ref={eyes} position={[0, 0.03, 0]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.05, 0, 0.142]}>
                <mesh scale={[1, 0.6, 0.5]} material={M.eye}><sphereGeometry args={[0.022, 12, 8]} /></mesh>
                <mesh position={[0, 0, 0.009]} material={M.iris}><sphereGeometry args={[0.011, 8, 6]} /></mesh>
              </group>
            ))}
          </group>
          {/* bushy brows, ruddy nose and cheeks */}
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.055, 0.065, 0.135]} rotation={[0.2, 0, s * -0.25]} scale={[1, 0.45, 0.6]} material={M.beard}><sphereGeometry args={[0.04, 8, 6]} /></mesh>)}
          <mesh position={[0, -0.012, 0.158]} scale={[0.85, 0.9, 0.8]} material={M.nose}><sphereGeometry args={[0.032, 14, 10]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.085, -0.02, 0.115]} scale={[1, 0.7, 0.5]} material={M.nose}><sphereGeometry args={[0.028, 10, 8]} /></mesh>)}
          {/* moustache and the great beard */}
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.05, -0.055, 0.15]} rotation={[0, 0, s * 0.45]} scale={[1.5, 0.5, 0.6]} material={M.beard}><sphereGeometry args={[0.035, 10, 8]} /></mesh>)}
          <group ref={beard} position={[0, -0.095, 0]}>
            <mesh position={[0, -0.05, 0.06]} scale={[0.9, 0.7, 0.72]} material={M.beard}><sphereGeometry args={[0.16, 16, 12]} /></mesh>
            {tufts.map((t, i) => <mesh key={i} position={t.p} rotation={[0.15, 0, t.rz]} scale={t.s} material={M.beard}><sphereGeometry args={[1, 8, 8]} /></mesh>)}
          </group>
          {/* white hair at the sides under the helmet */}
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.14, 0.02, -0.06]} scale={[0.5, 1, 0.9]} material={M.beard}><sphereGeometry args={[0.1, 10, 8]} /></mesh>)}
          {/* miner's helmet with brim and headlamp */}
          <group position={[0, 0.08, -0.005]}>
            <mesh material={M.steel}><sphereGeometry args={[0.172, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
            <mesh position={[0, 0.005, 0]} scale={[1, 1, 1.08]} material={M.steel}><cylinderGeometry args={[0.2, 0.2, 0.018, 28]} /></mesh>
            <mesh position={[0, 0.12, 0]} rotation={[0, 0, 0]} scale={[0.14, 1, 1]} material={M.steel}><sphereGeometry args={[0.15, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
            <group position={[0, 0.07, 0.165]} rotation={[0.25, 0, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={M.brass}><cylinderGeometry args={[0.05, 0.055, 0.05, 16]} /></mesh>
              <mesh position={[0, 0, 0.028]} material={M.bulb}><circleGeometry args={[0.042, 16]} /></mesh>
            </group>
          </group>
          {/* the Aufbau stack: 1s, then 2s, then three 2p, bottom-up */}
          <group position={[0, 0.3, -0.01]}>
            <mesh position={[0, -0.02, 0]} material={M.brass}><cylinderGeometry args={[0.012, 0.012, 0.5, 6]} /></mesh>
            <Bulb M={M} pos={[0, 0.02, 0]} refCb={(m) => (bulbs.current[0] = m)} />
            <Bulb M={M} pos={[0, 0.17, 0]} refCb={(m) => (bulbs.current[1] = m)} />
            {[-1, 0, 1].map((k, i) => <Bulb key={k} M={M} pos={[k * 0.15, 0.32, 0]} refCb={(m) => (bulbs.current[2 + i] = m)} />)}
            <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} material={M.brass}><cylinderGeometry args={[0.01, 0.01, 0.32, 6]} /></mesh>
          </group>
        </group>
        <pointLight position={[0, 2.3, 0.9]} color="#ffe6a0" intensity={1.4} distance={6} />
      </group>
    </group>
  )
}
