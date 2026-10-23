import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ELEMENTS } from '../chem/rules'

// Kai, built from primitives to match assets/characters/kai.png: graphite armor, four cyan bond-orb
// sockets in a tetrahedral pattern, dark hair, a blade of cyan light, a small buckler on the left arm.
// pose (set every frame by the controller):
//   run 0..1, phase (radians), roll 0..1 (tumble progress), swing -1..1 (slash arc, 0 = none), swingSide (1|-1),
//   spin 0..1, block 0..1, hurt 0..1, stance 'sp3'|'sp2'|'sp', sockets [symbols], charge 0..1

const ARMOR = { color: '#454b57', metalness: 0.45, roughness: 0.42 }
const UNDER = { color: '#23252d', roughness: 0.8 }
const SKIN = { color: '#e0b394', roughness: 0.7 }
const HAIR = { color: '#0d0d10', roughness: 0.6 }
const CYAN = '#43e6f5'

// four socket directions at tetrahedral angles (front-up, front-down-left, front-down-right, back)
const SOCKET_POS = [
  [0, 1.42, 0.2],
  [-0.2, 1.18, 0.2],
  [0.2, 1.18, 0.2],
  [0, 1.28, -0.22],
]

const KaiModel = forwardRef(function KaiModel(_, ref) {
  const pose = useRef({ run: 0, phase: 0, roll: 0, swing: 0, swingSide: 1, spin: 0, block: 0, hurt: 0, stance: 'sp3', sockets: [], charge: 0 })
  useImperativeHandle(ref, () => pose.current)
  const root = useRef()
  const body = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const blade = useRef()
  const bladeMat = useRef()
  const sockRefs = useRef([])
  const atomRefs = useRef([])
  const trail = useRef()
  const glowMats = useRef([])
  const cyan = useMemo(() => new THREE.Color(CYAN), [])

  useFrame(({ clock }, dt) => {
    const p = pose.current
    const t = clock.elapsedTime
    // stance silhouette: sp3 = full tetrahedral stance, sp2 = flattened (slips under slots), sp = narrow lance
    const target = p.stance === 'sp2' ? [1.25, 0.58, 1.1] : p.stance === 'sp' ? [0.82, 1.06, 0.82] : [1, 1, 1]
    const s = body.current.scale
    s.x += (target[0] - s.x) * Math.min(1, dt * 12)
    s.y += (target[1] - s.y) * Math.min(1, dt * 12)
    s.z += (target[2] - s.z) * Math.min(1, dt * 12)

    const sw = Math.sin(p.phase) * p.run
    legL.current.rotation.x = sw * 0.9
    legR.current.rotation.x = -sw * 0.9
    // arms: right holds the blade, left the buckler
    let rArmX = -sw * 0.6 - 0.2
    let rArmZ = -0.15
    let rArmY = 0
    if (p.swing !== 0) {
      // horizontal slash: arm sweeps across the body
      rArmX = -1.35
      rArmY = p.swing * 1.6 * p.swingSide
    }
    if (p.spin > 0) { rArmX = -1.5; rArmY = 0 }
    if (p.charge > 0) { rArmX = -0.4; rArmZ = -0.9 }
    armR.current.rotation.set(rArmX, rArmY, rArmZ)
    armL.current.rotation.set(p.block > 0.1 ? -1.4 * p.block : sw * 0.6 - 0.2, p.block * 0.6, 0.15)

    // whole-body moves
    const r = root.current
    r.rotation.x = p.roll > 0 ? p.roll * Math.PI * 2 : 0
    r.position.y = p.roll > 0 ? 0.35 * Math.sin(p.roll * Math.PI) - 0.25 * Math.sin(p.roll * Math.PI) : Math.abs(Math.sin(p.phase)) * 0.06 * p.run
    r.rotation.y = p.spin > 0 ? -p.spin * Math.PI * 2 : 0
    body.current.rotation.z = p.hurt * 0.3 * Math.sin(t * 40)

    // blade glow and charge
    const glow = 1.6 + Math.sin(t * 6) * 0.3 + p.charge * 3 + (p.swing !== 0 || p.spin > 0 ? 1.5 : 0)
    bladeMat.current.emissiveIntensity = glow
    blade.current.scale.y = 1 + p.charge * 0.25
    trail.current.visible = p.swing !== 0 || p.spin > 0
    trail.current.material.opacity = 0.35

    // sockets: lit when empty-but-ready; carried atoms orbit in them
    for (let i = 0; i < 4; i++) {
      const sym = p.sockets[i]
      const a = atomRefs.current[i]
      if (!a) continue
      a.visible = !!sym
      if (sym) {
        a.material.color.set(ELEMENTS[sym]?.color || '#ffffff')
        const sp = SOCKET_POS[i]
        const dir = new THREE.Vector3(sp[0] * 2.2, (sp[1] - 1.3) * 2.2, sp[2] * 2.2).normalize()
        a.position.set(sp[0] + dir.x * 0.32, sp[1] + dir.y * 0.32, sp[2] + dir.z * 0.32)
      }
    }
    glowMats.current.forEach((m, i) => { if (m) m.emissiveIntensity = 1.4 + Math.sin(t * 3 + i) * 0.4 })
  })

  return (
    <group ref={root}>
      <group ref={body}>
        {/* legs */}
        <group ref={legL} position={[-0.13, 0.82, 0]}>
          <mesh position={[0, -0.4, 0]} castShadow><capsuleGeometry args={[0.085, 0.62, 4, 10]} /><meshStandardMaterial {...UNDER} /></mesh>
          <mesh position={[0, -0.25, 0.03]}><capsuleGeometry args={[0.1, 0.3, 4, 10]} /><meshStandardMaterial {...ARMOR} /></mesh>
          <mesh position={[0, -0.78, 0.05]}><boxGeometry args={[0.15, 0.1, 0.28]} /><meshStandardMaterial {...ARMOR} /></mesh>
        </group>
        <group ref={legR} position={[0.13, 0.82, 0]}>
          <mesh position={[0, -0.4, 0]} castShadow><capsuleGeometry args={[0.085, 0.62, 4, 10]} /><meshStandardMaterial {...UNDER} /></mesh>
          <mesh position={[0, -0.25, 0.03]}><capsuleGeometry args={[0.1, 0.3, 4, 10]} /><meshStandardMaterial {...ARMOR} /></mesh>
          <mesh position={[0, -0.78, 0.05]}><boxGeometry args={[0.15, 0.1, 0.28]} /><meshStandardMaterial {...ARMOR} /></mesh>
        </group>
        {/* torso + tabard */}
        <mesh position={[0, 1.22, 0]} castShadow><capsuleGeometry args={[0.24, 0.42, 6, 14]} /><meshStandardMaterial {...ARMOR} /></mesh>
        <mesh position={[0, 0.86, 0.02]}><cylinderGeometry args={[0.24, 0.3, 0.26, 14]} /><meshStandardMaterial {...UNDER} /></mesh>
        <mesh position={[0, 0.96, 0]}><torusGeometry args={[0.25, 0.04, 8, 20]} /><meshStandardMaterial {...ARMOR} /></mesh>
        {/* shoulder pauldrons */}
        <mesh position={[-0.3, 1.46, 0]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial {...ARMOR} /></mesh>
        <mesh position={[0.3, 1.46, 0]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial {...ARMOR} /></mesh>
        {/* bond sockets */}
        {SOCKET_POS.map((sp, i) => (
          <group key={i}>
            <mesh position={sp} ref={(m) => (sockRefs.current[i] = m)}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color={CYAN} emissive={cyan} emissiveIntensity={1.6} ref={(m) => (glowMats.current[i] = m)} />
            </mesh>
            <mesh ref={(m) => (atomRefs.current[i] = m)} visible={false}>
              <sphereGeometry args={[0.13, 14, 12]} />
              <meshStandardMaterial color="#fff" roughness={0.35} emissive="#223" />
            </mesh>
          </group>
        ))}
        {/* socket links */}
        <mesh position={[-0.1, 1.3, 0.2]} rotation={[0, 0, 0.75]}><cylinderGeometry args={[0.008, 0.008, 0.3, 4]} /><meshBasicMaterial color={CYAN} /></mesh>
        <mesh position={[0.1, 1.3, 0.2]} rotation={[0, 0, -0.75]}><cylinderGeometry args={[0.008, 0.008, 0.3, 4]} /><meshBasicMaterial color={CYAN} /></mesh>
        {/* head */}
        <mesh position={[0, 1.72, 0]} castShadow><sphereGeometry args={[0.17, 18, 16]} /><meshStandardMaterial {...SKIN} /></mesh>
        <mesh position={[0, 1.8, -0.02]} scale={[1.08, 0.75, 1.1]}><sphereGeometry args={[0.18, 16, 12]} /><meshStandardMaterial {...HAIR} /></mesh>
        {/* back of the head is hair, so Kai reads as facing away from the camera */}
        <mesh position={[0, 1.72, -0.01]}><sphereGeometry args={[0.176, 16, 12, Math.PI, Math.PI, 0, Math.PI * 0.78]} /><meshStandardMaterial {...HAIR} /></mesh>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.1, 0.14, 0.12, 12]} /><meshStandardMaterial {...ARMOR} /></mesh>
        <mesh position={[-0.06, 1.73, 0.155]}><sphereGeometry args={[0.018, 8, 6]} /><meshBasicMaterial color="#2a3a44" /></mesh>
        <mesh position={[0.06, 1.73, 0.155]}><sphereGeometry args={[0.018, 8, 6]} /><meshBasicMaterial color="#2a3a44" /></mesh>
        {/* left arm + buckler */}
        <group ref={armL} position={[-0.34, 1.42, 0]}>
          <mesh position={[0, -0.28, 0]}><capsuleGeometry args={[0.07, 0.42, 4, 10]} /><meshStandardMaterial {...ARMOR} /></mesh>
          <mesh position={[-0.06, -0.42, 0.08]} rotation={[0, -0.4, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 18]} /><meshStandardMaterial color="#2c3038" metalness={0.6} roughness={0.35} /></mesh>
          <mesh position={[-0.07, -0.42, 0.11]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.015, 6, 20]} /><meshBasicMaterial color={CYAN} /></mesh>
        </group>
        {/* right arm + light blade */}
        <group ref={armR} position={[0.34, 1.42, 0]}>
          <mesh position={[0, -0.28, 0]}><capsuleGeometry args={[0.07, 0.42, 4, 10]} /><meshStandardMaterial {...ARMOR} /></mesh>
          <group position={[0, -0.55, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.03, 0.03, 0.18, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
            <mesh position={[0, 0.05, 0]}><boxGeometry args={[0.2, 0.03, 0.05]} /><meshStandardMaterial {...ARMOR} /></mesh>
            <mesh ref={blade} position={[0, 0.5, 0]}>
              <boxGeometry args={[0.06, 0.85, 0.015]} />
              <meshStandardMaterial ref={bladeMat} color={CYAN} emissive={cyan} emissiveIntensity={1.8} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
      {/* slash trail */}
      <mesh ref={trail} position={[0, 1.05, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.6, 1.55, 32, 1, 0, Math.PI * 1.25]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
})

export default KaiModel
