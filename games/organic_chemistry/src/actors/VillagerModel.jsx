import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'

// Hydrogen villagers: round, cheerful little folk. Each is a hydrogen atom — one proton (their round
// body) and one electron, which orbits their head as a glowing dot (§1.1, §1.4: hydrogen makes one
// bond). Variants: elder (white beard, cane, taller hat), deut (deuterium: heavier, with a two-dot
// badge for its proton + neutron nucleus), kid (smaller).

const shared = {}
function mats() {
  if (shared.ready) return shared
  shared.body = rimMat({ color: '#f4f2ee', roughness: 0.55 }, '#ffffff', 0.25, 2.4)
  shared.skin = rimMat({ color: '#f2d4bc', roughness: 0.55 }, '#ffe4d0', 0.18, 3)
  shared.dark = new THREE.MeshBasicMaterial({ color: '#221a18' })
  shared.white = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  shared.cheek = new THREE.MeshBasicMaterial({ color: '#f29a9a', transparent: true, opacity: 0.45, depthWrite: false })
  shared.beard = rimMat({ color: '#f2f0ea', roughness: 0.85, flatShading: true }, '#ffffff', 0.3)
  shared.wood = rimMat({ color: '#6a4a32', roughness: 0.8 }, '#ffd0a0', 0.15)
  shared.shoe = rimMat({ color: '#5a3c2a', roughness: 0.7 }, '#ffd0a0', 0.15)
  shared.electron = new THREE.MeshBasicMaterial({ color: '#9fe8ff', toneMapped: false })
  shared.orbit = new THREE.MeshBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false })
  shared.proton = new THREE.MeshBasicMaterial({ color: '#e0453b' })
  shared.neutron = new THREE.MeshBasicMaterial({ color: '#9aa3ad' })
  shared.ready = true
  return shared
}

export function Villager({ color = '#f4f4f4', hat = '#c0394b', kind = 'adult', ...props }) {
  const M = mats()
  const own = useMemo(() => ({
    hat: rimMat({ color: hat, roughness: 0.7 }, '#ffffff', 0.2),
    vest: rimMat({ color: new THREE.Color(hat).multiplyScalar(0.7).getStyle(), roughness: 0.8 }, '#ffffff', 0.15),
  }), [hat])
  const e = useRef()
  const eyes = useRef()
  const arms = useRef([])
  const seed = useMemo(() => Math.random() * 10, [])
  const sc = kind === 'kid' ? 0.75 : kind === 'deut' ? 1.12 : 1
  const elder = kind === 'elder'
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed
    if (e.current) { e.current.rotation.y = t * 2.2; e.current.rotation.x = 0.4 + Math.sin(t * 0.7) * 0.2 }
    if (eyes.current) eyes.current.scale.y = (t % 3.9) < 0.12 ? 0.1 : 1
    arms.current.forEach((a, i) => { if (a) a.rotation.x = Math.sin(t * 2 + i * Math.PI) * 0.15 })
  })
  return (
    <group {...props}>
      <group scale={sc}>
        {/* feet */}
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.15, 0.06, 0.06]} scale={[1, 0.6, 1.4]} material={M.shoe} castShadow><sphereGeometry args={[0.09, 12, 8]} /></mesh>)}
        {/* round body (the proton) with a little vest */}
        <mesh position={[0, 0.48, 0]} scale={[1, 0.95, 0.92]} material={M.body} castShadow><sphereGeometry args={[0.4, 24, 18]} /></mesh>
        <mesh position={[0, 0.48, 0]} scale={[1.03, 0.98, 0.95]} material={own.vest}><sphereGeometry args={[0.4, 36, 18, Math.PI * 0.62, Math.PI * 1.76, Math.PI * 0.3, Math.PI * 0.45]} /></mesh>
        {kind === 'deut' && (
          // deuterium's badge: proton + neutron
          <group position={[0, 0.58, 0.37]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={own.hat}><cylinderGeometry args={[0.07, 0.07, 0.02, 16]} /></mesh>
            <mesh position={[-0.025, 0, 0.012]} material={M.proton}><sphereGeometry args={[0.022, 10, 8]} /></mesh>
            <mesh position={[0.025, 0, 0.012]} material={M.neutron}><sphereGeometry args={[0.022, 10, 8]} /></mesh>
          </group>
        )}
        {/* stubby arms */}
        {[-1, 1].map((s, i) => (
          <group key={s} ref={(g) => (arms.current[i] = g)} position={[s * 0.36, 0.6, 0]} rotation={[0, 0, s * 0.5]}>
            <mesh position={[0, -0.12, 0]} material={M.body}><capsuleGeometry args={[0.06, 0.14, 4, 8]} /></mesh>
            <mesh position={[0, -0.24, 0]} material={M.skin}><sphereGeometry args={[0.055, 10, 8]} /></mesh>
          </group>
        ))}
        {/* head and face */}
        <group position={[0, 1.02, 0]}>
          <mesh material={M.skin} castShadow><sphereGeometry args={[0.24, 24, 18]} /></mesh>
          <group ref={eyes} position={[0, 0.03, 0.222]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.075, 0, 0]}>
                <mesh scale={[1, 1.3, 0.5]} material={M.dark}><sphereGeometry args={[0.028, 10, 8]} /></mesh>
                <mesh position={[0.008, 0.012, 0.012]} material={M.white}><sphereGeometry args={[0.008, 6, 6]} /></mesh>
              </group>
            ))}
          </group>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.12, -0.04, 0.198]} scale={[1, 0.6, 0.4]} material={M.cheek}><sphereGeometry args={[0.04, 10, 8]} /></mesh>)}
          <mesh position={[0, -0.06, 0.226]} rotation={[0.35, 0, Math.PI]} material={M.dark}><torusGeometry args={[0.035, 0.007, 6, 12, Math.PI]} /></mesh>
          {elder && (
            <group position={[0, -0.12, 0.13]}>
              <mesh scale={[1, 1.3, 0.7]} material={M.beard}><sphereGeometry args={[0.15, 12, 10]} /></mesh>
              {[-1, 1].map((s) => <mesh key={s} position={[s * 0.06, 0.08, 0.08]} rotation={[0, 0, s * 0.5]} scale={[1.6, 0.6, 0.7]} material={M.beard}><sphereGeometry args={[0.04, 8, 6]} /></mesh>)}
            </group>
          )}
          {/* a soft cap with a brim band */}
          <group position={[0, 0.17, 0]} rotation={[-0.15, 0, 0.12]}>
            <mesh position={[0, 0.0, 0]} material={own.hat}><cylinderGeometry args={[0.235, 0.25, 0.06, 20]} /></mesh>
            <mesh position={[0, elder ? 0.2 : 0.14, -0.02]} rotation={[-0.2, 0, 0]} material={own.hat}><coneGeometry args={[0.2, elder ? 0.42 : 0.3, 18]} /></mesh>
            <mesh position={[0.02, elder ? 0.43 : 0.31, -0.07]} material={M.body}><sphereGeometry args={[0.04, 10, 8]} /></mesh>
          </group>
          {/* the one electron, orbiting the head */}
          <group ref={e}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={M.orbit}><torusGeometry args={[0.36, 0.004, 4, 40]} /></mesh>
            <mesh position={[0.36, 0, 0]} material={M.electron}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
          </group>
        </group>
        {elder && (
          <group position={[0.42, 0, 0.12]} rotation={[0, 0, -0.08]}>
            <mesh position={[0, 0.5, 0]} material={M.wood}><cylinderGeometry args={[0.025, 0.03, 1.0, 8]} /></mesh>
            <mesh position={[-0.05, 1.0, 0]} rotation={[0, 0, Math.PI / 2]} material={M.wood}><torusGeometry args={[0.05, 0.025, 6, 12, Math.PI]} /></mesh>
          </group>
        )}
      </group>
    </group>
  )
}
