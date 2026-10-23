import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'
import { part, merge, bolt } from '../engine/geo'

// Malradix the Unpaired, modeled on assets/characters/malradix.png: a tall, gaunt sorcerer in a
// tattered crimson hooded robe over black, a dark mantle traced with glowing violet molecule sigils,
// a pale hollow face with violet eyes, a spiked silver crown, and a twisted staff whose curled head
// holds a violet star — a radical's single unpaired electron. Violet sparks crackle round his hand.

// a jagged, tattered hem: an open cone whose bottom edge is cut into uneven points
function raggedCone(rTop, rBot, h, seg, seed, gap = 0) {
  // gap: an opening at the front (+z), in radians
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 6, true, gap / 2, Math.PI * 2 - gap)
  const p = g.attributes.position
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const cut = [...Array(seg + 1)].map(() => rnd())
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    const k = (y + h / 2) / h // 0 at the hem
    const a = Math.atan2(p.getX(i), p.getZ(i))
    const idx = Math.round(((a + Math.PI) / (Math.PI * 2)) * seg) % (seg + 1)
    if (k < 0.2) p.setY(i, y + (0.2 - k) * cut[idx] * h * 0.9)
    // folds: ripple the radius around the body
    const ripple = 1 + Math.sin(a * 7 + seed) * 0.05 * (1 - k)
    p.setX(i, p.getX(i) * ripple); p.setZ(i, p.getZ(i) * ripple)
  }
  g.computeVertexNormals()
  return g
}

function useMalradixAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const M = {
      robe: rimMat({ color: '#7a1a28', roughness: 0.75, side: THREE.DoubleSide }, '#ff6a8a', 0.35, 2.2),
      robeDark: rimMat({ color: '#18121c', roughness: 0.85, side: THREE.DoubleSide }, '#a06bff', 0.3, 2.2),
      mantle: rimMat({ color: '#2a1e2e', roughness: 0.7, side: THREE.DoubleSide }, '#b48cff', 0.35, 2.2),
      skin: rimMat({ color: '#b9b0b6', roughness: 0.55 }, '#d8c8ff', 0.35, 2.4),
      silver: new THREE.MeshStandardMaterial({ color: '#c6cad2', metalness: 0.95, roughness: 0.22, envMap: env, envMapIntensity: 1.2 }),
      wood: rimMat({ color: '#3a2620', roughness: 0.8 }, '#a06bff', 0.25),
      sigil: new THREE.MeshBasicMaterial({ color: '#b07aff', toneMapped: false }),
      eye: new THREE.MeshBasicMaterial({ color: '#f0d8ff', toneMapped: false }),
      dark: new THREE.MeshBasicMaterial({ color: '#0a070c' }),
      star: new THREE.MeshStandardMaterial({ color: '#e7d2ff', emissive: new THREE.Color('#a06bff'), emissiveIntensity: 4, toneMapped: false }),
      spark: new THREE.MeshBasicMaterial({ color: '#c79bff', transparent: true, opacity: 0.9, toneMapped: false }),
    }
    const outer = raggedCone(0.34, 0.95, 2.0, 40, 3, 0.9)
    const inner = raggedCone(0.25, 0.7, 1.9, 32, 9)
    const sleeve = raggedCone(0.09, 0.26, 0.75, 18, 5)
    // twisted staff: a wobbling tube with a curl at the top
    const pts = []
    for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(Math.sin(t * 9) * 0.025, t * 2.45, Math.cos(t * 7) * 0.02)) }
    for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI * 1.6; pts.push(new THREE.Vector3(Math.sin(a) * 0.13 - 0.0, 2.45 + (1 - Math.cos(a)) * 0.13, 0)) }
    const staff = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.032, 7, false)
    // molecule sigils on the mantle: little hexagon rings joined by bonds (benzene-like marks)
    const hex = (cx, cy, r) => {
      const out = []
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6, b = ((k + 1) / 6) * Math.PI * 2 + Math.PI / 6
        out.push(part(new THREE.BoxGeometry(r, 0.008, 0.004), [cx + Math.cos((a + b) / 2) * r * 0.87, cy + Math.sin((a + b) / 2) * r * 0.87, 0], [0, 0, (a + b) / 2 + Math.PI / 2]))
      }
      return out
    }
    const sig = merge([...hex(-0.09, 0.0, 0.05), ...hex(0.09, 0.03, 0.045), ...hex(0.0, -0.45, 0.055), ...hex(0.02, -0.85, 0.05),
      part(new THREE.BoxGeometry(0.008, 0.38, 0.004), [0.0, -0.22, 0]), part(new THREE.BoxGeometry(0.008, 0.33, 0.004), [0.01, -0.66, 0])])
    const sparks = merge([...bolt([0, 0, 0], [0.18, 0.22, 0.05], 3, 4, 0.06, 0.006), ...bolt([0, 0, 0], [-0.12, 0.25, -0.08], 7, 4, 0.06, 0.006), ...bolt([0, 0, 0], [0.05, -0.2, 0.12], 13, 4, 0.06, 0.006)])
    return { M, outer, inner, sleeve, staff, sig, sparks }
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
    M.star.emissiveIntensity = (3.5 + Math.sin(t * 5) * 0.8) * staffGlow
  })
  return (
    <group {...props}>
      {/* robes: black under-robe, tattered crimson outer robe, dark mantle with sigils */}
      <group ref={robe}>
        <mesh geometry={A.inner} position={[0, 0.96, 0.02]} material={M.robeDark} castShadow />
        <mesh geometry={A.outer} position={[0, 1.0, -0.02]} scale={[1, 1, 0.9]} material={M.robe} castShadow />
      </group>
      {/* front opening of the outer robe shows the black robe; a sigil strip runs down it */}
      <mesh geometry={A.sig} position={[0, 1.55, 0.37]} rotation={[-0.27, 0, 0]} scale={[1.25, 1, 1]} material={M.sigil} />
      {/* shoulders, mantle collar points */}
      <mesh position={[0, 1.98, 0]} scale={[1, 0.55, 0.75]} material={M.mantle}><sphereGeometry args={[0.36, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.16, 1.88, 0.2]} rotation={[0.3, 0, s * 0.5]} material={M.mantle}><coneGeometry args={[0.1, 0.4, 4]} /></mesh>)}
      <mesh position={[0, 1.76, 0.27]} rotation={[0.1, 0, Math.PI]} material={M.silver}><coneGeometry args={[0.035, 0.12, 4]} /></mesh>
      {/* arms: the right holds the staff, the left hangs with sparks at the fingers */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.34, 1.95, 0]} rotation={[s > 0 ? -0.35 : 0.05, 0, s * 0.18]}>
          <mesh geometry={A.sleeve} position={[0, -0.38, 0]} material={M.robe} castShadow />
          <mesh position={[0, -0.8, 0.02]} scale={[0.9, 1.3, 0.7]} material={M.skin}><sphereGeometry args={[0.05, 12, 10]} /></mesh>
          {[0, 1, 2, 3].map((k) => <mesh key={k} position={[-0.03 + k * 0.02, -0.88, 0.02]} rotation={[0.2, 0, 0]} material={M.skin}><capsuleGeometry args={[0.008, 0.07, 3, 6]} /></mesh>)}
          {s < 0 && <group ref={crackle} position={[0, -0.92, 0.04]}><mesh geometry={A.sparks} material={M.spark} /></group>}
        </group>
      ))}
      {/* staff with the curled head and the star */}
      <group position={[0.52, 0.0, 0.32]} rotation={[0.08, 0, -0.06]}>
        <mesh geometry={A.staff} material={M.wood} castShadow />
        <group position={[0.0, 2.62, 0]}>
          <group ref={star}>
            {[0, 1].map((k) => <mesh key={k} rotation={[0, 0, k * Math.PI / 4]} scale={[0.6, 1.6, 0.6]} material={M.star}><octahedronGeometry args={[0.1, 0]} /></mesh>)}
            {[0, 1].map((k) => <mesh key={'h' + k} rotation={[0, 0, Math.PI / 2 + k * Math.PI / 4]} scale={[0.6, 1.6, 0.6]} material={M.star}><octahedronGeometry args={[0.1, 0]} /></mesh>)}
          </group>
          <pointLight color="#a06bff" intensity={6 * staffGlow} distance={9} />
        </group>
      </group>
      {/* head in its hood */}
      <group position={[0, 2.28, 0.02]}>
        <mesh position={[0, 0.02, -0.03]} scale={[1, 1.15, 1.05]} material={M.robe}><sphereGeometry args={[0.24, 22, 14, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.78]} /></mesh>
        <mesh position={[0, 0.02, -0.03]} scale={[1, 1.15, 1.05]} material={M.robe}><sphereGeometry args={[0.24, 22, 8, 0, Math.PI * 2, 0, Math.PI * 0.2]} /></mesh>
        <mesh position={[0, -0.02, -0.04]} scale={[0.95, 1.1, 0.6]} material={M.dark}><sphereGeometry args={[0.2, 16, 12]} /></mesh>
        {/* gaunt face: long skull, hollow cheeks, sharp chin */}
        <mesh position={[0, -0.01, 0.05]} scale={[0.72, 1.0, 0.82]} material={M.skin}><sphereGeometry args={[0.17, 22, 16]} /></mesh>
        <mesh position={[0, -0.13, 0.08]} scale={[0.5, 0.6, 0.6]} material={M.skin}><sphereGeometry args={[0.1, 14, 10]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.07, -0.05, 0.16]} scale={[0.6, 1, 0.4]} material={M.dark}><sphereGeometry args={[0.03, 8, 6]} /></mesh>)}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.048, 0.03, 0.17]}>
            <mesh scale={[1, 0.6, 0.5]} material={M.dark}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
            <mesh position={[0, 0, 0.012]} scale={[1, 0.55, 0.5]} material={M.eye}><sphereGeometry args={[0.018, 10, 8]} /></mesh>
          </group>
        ))}
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.05, 0.07, 0.17]} rotation={[0, 0, s * 0.4]} material={M.dark}><boxGeometry args={[0.06, 0.008, 0.01]} /></mesh>)}
        <mesh position={[0, -0.1, 0.18]} material={M.dark}><boxGeometry args={[0.05, 0.005, 0.01]} /></mesh>
        <mesh position={[0, 0.0, 0.195]} rotation={[-0.3, 0, 0]} scale={[0.5, 1, 0.6]} material={M.skin}><coneGeometry args={[0.022, 0.07, 6]} /></mesh>
        {/* spiked silver crown on the hood */}
        <group position={[0, 0.2, 0.0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={M.silver}><torusGeometry args={[0.16, 0.015, 8, 28]} /></mesh>
          {[-2, -1, 0, 1, 2].map((k) => {
            const a = k * 0.42
            return <mesh key={k} position={[Math.sin(a) * 0.16, (k === 0 ? 0.2 : 0.11 - Math.abs(k) * 0.015), Math.cos(a) * 0.16]} rotation={[Math.cos(a) * 0.1, 0, -Math.sin(a) * 0.1]} material={M.silver}><coneGeometry args={[0.028, k === 0 ? 0.42 : 0.24, 4]} /></mesh>
          })}
          <mesh position={[0, 0.03, 0.17]} material={M.sigil}><octahedronGeometry args={[0.025, 0]} /></mesh>
        </group>
      </group>
    </group>
  )
}
