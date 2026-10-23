import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv, bend } from '../engine/materials'

// Princess Octavia, modeled on assets/characters/octavia.png: tall and slender, long straight black
// hair with blunt bangs, a gold circlet set with cyan lights, a warm smile, and a flowing white gown
// with a gold V-neck mantle, wide bell sleeves with gold cuffs, a gold V-belt and gold bands to the hem.
// Her hands are cupped in front of her (in the intro the crown hovers there).

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
    // gown: a long flare from a slim waist to a pooled hem; bodice above
    const gown = new THREE.LatheGeometry([[0.13, 1.12], [0.15, 0.95], [0.21, 0.7], [0.3, 0.4], [0.42, 0.12], [0.5, 0.02], [0.47, 0]].map(([r, y]) => new THREE.Vector2(r, y)).reverse(), 32)
    const bodice = new THREE.LatheGeometry([[0.125, 1.1], [0.13, 1.2], [0.145, 1.33], [0.145, 1.42], [0.12, 1.49], [0.06, 1.53], [0.04, 1.54]].map(([r, y]) => new THREE.Vector2(r, y)), 28)
    const hemBand = new THREE.LatheGeometry([[0.505, 0.02], [0.5, 0.09], [0.46, 0.15]].map(([r, y]) => new THREE.Vector2(r, y)), 32, 0, Math.PI * 2)
    // gold V shapes: neckline mantle and belt
    const vee = (w, h, t) => {
      const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(-w + t, 0); s.lineTo(0, -h + t * 1.4); s.lineTo(w - t, 0); s.lineTo(w, 0); s.lineTo(0, -h); s.closePath()
      return bend(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }), 6)
    }
    const neckV = vee(0.15, 0.17, 0.045), beltV = vee(0.15, 0.16, 0.035)
    // long hair: a curved sheet down the back, plus two locks in front of the shoulders
    const backHair = new THREE.CylinderGeometry(0.118, 0.17, 0.95, 24, 6, true, Math.PI * 0.6, Math.PI * 0.8)
    return { M, gown, bodice, hemBand, neckV, beltV, backHair }
  }, [gl])
}

function Sleeve({ side, A }) {
  // upper arm down the side, forearm forward and in, so the hands cup in front of the waist;
  // a wide bell sleeve drapes down from the elbow with a gold cuff
  return (
    <group position={[side * 0.165, 1.46, 0]} rotation={[0.1, 0, side * 0.1]}>
      <mesh position={[0, -0.13, 0]} material={A.M.silk}><capsuleGeometry args={[0.042, 0.2, 4, 10]} /></mesh>
      <mesh position={[side * 0.01, 0.0, 0]} scale={[1, 0.5, 1]} material={A.M.gold}><sphereGeometry args={[0.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <group position={[0, -0.27, 0]}>
        {/* the bell: hangs down and slightly back from the elbow */}
        <group rotation={[0.12, 0, side * 0.04]}>
          <mesh position={[0, -0.16, 0]} material={A.M.silkShade}><cylinderGeometry args={[0.05, 0.1, 0.32, 18, 1, true]} /></mesh>
          <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]} material={A.M.gold}><torusGeometry args={[0.1, 0.01, 8, 26]} /></mesh>
        </group>
        {/* forearm and hand, palm up, reaching to the front */}
        <group rotation={[-1.35, side * 0.55, 0]}>
          <mesh position={[0, -0.12, 0]} material={A.M.skin}><capsuleGeometry args={[0.026, 0.18, 4, 8]} /></mesh>
          <mesh position={[0, -0.25, 0.01]} scale={[0.85, 0.4, 1.25]} material={A.M.skin}><sphereGeometry args={[0.04, 12, 10]} /></mesh>
          {[0, 1, 2, 3].map((k) => <mesh key={k} position={[-0.024 + k * 0.016, -0.29, 0.03]} rotation={[0.7, 0, 0]} material={A.M.skin}><capsuleGeometry args={[0.007, 0.035, 3, 6]} /></mesh>)}
        </group>
      </group>
    </group>
  )
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
        {/* gown, bodice, gold hem band and the vertical gold bands */}
        <mesh geometry={A.gown} material={M.silk} castShadow />
        <mesh geometry={A.hemBand} material={M.gold} />
        <mesh geometry={A.bodice} material={M.silk} castShadow />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.085, 0.58, 0.245]} rotation={[0.23, 0, s * 0.12]} material={M.gold}><boxGeometry args={[0.03, 1.02, 0.008]} /></mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={'o' + s} position={[s * 0.27, 0.42, 0.13]} rotation={[0.15, s * 0.55, s * 0.3]} material={M.gold}><boxGeometry args={[0.028, 0.75, 0.008]} /></mesh>
        ))}
        <mesh geometry={A.beltV} position={[0, 1.15, 0.13]} material={M.gold} />
        <mesh position={[0, 1.15, 0]} scale={[1, 1, 0.85]} material={M.gold}><torusGeometry args={[0.135, 0.012, 8, 28]} /></mesh>
        <mesh geometry={A.neckV} position={[0, 1.51, 0.14]} rotation={[-0.14, 0, 0]} material={M.gold} />
        <Sleeve side={-1} A={A} />
        <Sleeve side={1} A={A} />
        {/* neck and head */}
        <mesh position={[0, 1.575, 0]} material={M.skin}><cylinderGeometry args={[0.038, 0.045, 0.1, 12]} /></mesh>
        <group position={[0, 1.735, 0]} scale={1.22}>
          <mesh scale={[0.86, 1.08, 0.95]} material={M.skin} castShadow><sphereGeometry args={[0.12, 28, 22]} /></mesh>
          <mesh position={[0, -0.045, 0.006]} scale={[0.74, 0.62, 0.82]} material={M.skin}><sphereGeometry args={[0.1, 24, 16]} /></mesh>
          <group ref={eyes} position={[0, 0.005, 0]}>
            {[-1, 1].map((s) => (
              <group key={s} position={[s * 0.04, 0, 0.098]}>
                <mesh scale={[1.15, 0.7, 0.45]} material={M.eye}><sphereGeometry args={[0.021, 14, 10]} /></mesh>
                <mesh position={[0, -0.002, 0.007]} scale={[1, 1, 0.4]} material={M.iris}><sphereGeometry args={[0.013, 12, 10]} /></mesh>
                <mesh position={[0, -0.002, 0.011]} material={M.dark}><sphereGeometry args={[0.0055, 8, 6]} /></mesh>
                <mesh position={[s * 0.004, 0.014, 0.006]} rotation={[0, 0, s * -0.15]} material={M.dark}><boxGeometry args={[0.05, 0.005, 0.006]} /></mesh>
              </group>
            ))}
          </group>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.042, 0.04, 0.105]} rotation={[0.1, 0, s * -0.12]} material={M.dark}><boxGeometry args={[0.04, 0.005, 0.006]} /></mesh>)}
          <mesh position={[0, -0.025, 0.118]} rotation={[-0.3, 0, 0]} scale={[0.6, 1, 0.8]} material={M.skin}><sphereGeometry args={[0.014, 10, 8]} /></mesh>
          {/* a smile */}
          <mesh position={[0, -0.05, 0.104]} rotation={[0.3, 0, Math.PI]} scale={[1, 0.55, 1]} material={M.lip}><torusGeometry args={[0.018, 0.0032, 6, 14, Math.PI]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[s * 0.06, -0.03, 0.085]} scale={[1, 0.6, 0.4]} material={M.blush}><sphereGeometry args={[0.022, 10, 8]} /></mesh>)}
          {/* hair: crown, blunt bangs, the long back sheet, and two front locks */}
          <group ref={hair}>
            <mesh position={[0, 0.02, -0.012]} scale={[0.95, 1.04, 1.02]} material={M.hair}><sphereGeometry args={[0.132, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} /></mesh>
            <mesh position={[0, 0.072, 0.01]} material={M.hair}><cylinderGeometry args={[0.122, 0.128, 0.05, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84]} /></mesh>
            <mesh geometry={A.backHair} position={[0, -0.4, -0.03]} scale={[1, 1, 0.78]} material={M.hair} />
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, -0.2, 0.035]} rotation={[0.1, 0, s * -0.04]} material={M.hair}><boxGeometry args={[0.04, 0.5, 0.03]} /></mesh>)}
            {[-1, 1].map((s) => <mesh key={'sd' + s} position={[s * 0.112, -0.02, -0.01]} scale={[0.35, 1, 0.9]} material={M.hair}><sphereGeometry args={[0.1, 14, 12]} /></mesh>)}
          </group>
          {/* gold circlet with eight cyan lights on little peaks */}
          <group position={[0, 0.075, -0.005]} rotation={[-0.2, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={M.gold}><torusGeometry args={[0.128, 0.006, 6, 36]} /></mesh>
            {[...Array(8)].map((_, i) => {
              const a = -1.25 + (i / 7) * 2.5
              const x = Math.sin(a) * 0.13, z = Math.cos(a) * 0.13
              return (
                <group key={i} position={[x, 0, z]}>
                  <mesh position={[0, 0.02, 0]} material={M.gold}><coneGeometry args={[0.008, 0.04, 4]} /></mesh>
                  <mesh position={[0, 0.045, 0]} material={M.light}><sphereGeometry args={[0.011, 8, 6]} /></mesh>
                </group>
              )
            })}
          </group>
        </group>
        <pointLight position={[0, 2.1, 0.35]} color="#ffe9b8" intensity={1.5} distance={4} />
      </group>
    </group>
  )
}
