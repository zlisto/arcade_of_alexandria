import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { pushWinding } from '../../levels/w1/inducedMaps'

/**
 * Lesson World 1 · Level 5 (level-1-5-lesson): induced maps, grid lift, controls demo.
 */

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)

const SHOTS = [
  [0, 18, [[-2.2, 2.8, 5.5], [-0.5, 0.4, 0]], [[-1.8, 2.4, 4.8], [-0.5, 0.4, 0]]],
  [18, 40, [[-2.2, 2.8, 5.5], [-0.5, 0.4, 0]], [[-1.8, 2.4, 4.8], [-0.5, 0.4, 0]]],
  [40, 62, [[-2.2, 2.8, 5.5], [-0.5, 0.4, 0]], [[-1.8, 2.4, 4.8], [-0.5, 0.4, 0]]],
]

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const [a, b, from, to] = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[0]
    const k = smooth(seg(t, a, b))
    camera.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k)
    look.set(-0.5, 0.4, 0)
    camera.lookAt(look)
  })
  return null
}

function DemoStage({ tRef }) {
  const ring = useRef()
  const gy = useRef()
  useFrame(() => {
    const t = tRef.current
    const walk = t >= 52 && t < 58
    const ang = walk ? (t - 52) * 1.4 : 0
    gy.current.position.set(-0.5 + Math.cos(ang) * 1.6, 0, Math.sin(ang) * 1.6)
    gy.current.rotation.y = ang + Math.PI / 2
    ring.current.material.emissiveIntensity = walk ? 1.4 : 0.6
  })
  return (
    <group>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.07, 10, 48]} />
        <meshStandardMaterial color="#ffb347" emissive="#ffd27a" emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
      <mesh position={[1.8, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.06, 10, 40]} />
        <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      <group ref={gy} scale={0.65}>
        <Gyroid script={() => ({ pos: [0, 0, 0], rotY: 0, run: tRef.current >= 52 && tRef.current < 58 ? 0.7 : 0, cast: 0, loop: 0, loopDrop: 0 })} />
      </group>
    </group>
  )
}

export default function PushForwardLesson({ tRef }) {
  return (
    <>
      <color attach="background" args={['#120818']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={1} />
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <DemoStage tRef={tRef} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.5} luminanceThreshold={0.22} />
        <Vignette eskil={false} offset={0.12} darkness={0.6} />
      </EffectComposer>
    </>
  )
}

export function PushForwardLessonOverlay({ t = 0 }) {
  const w = pushWinding(1, 2)
  return (
    <div className="lesson-card lvl15-lesson-card">
      {t < 18 && (
        <>
          <h3>Induced map</h3>
          <p className="lesson-math">f_* : π₁(S¹) → π₁(S¹), w ↦ {w} when f wraps twice</p>
          <p className="lesson-note">Walk the source road, click the projector.</p>
        </>
      )}
      {t >= 18 && t < 40 && (
        <>
          <h3>Torus grid</h3>
          <p className="lesson-math">π₁(T²) ≅ ℤ² — endpoint (m, n)</p>
          <p className="lesson-note">Tube lap + hole lap; order between roads doesn’t matter.</p>
        </>
      )}
      {t >= 40 && (
        <>
          <h3>Controls</h3>
          <ul className="lesson-steps">
            <li>4 — Winding Cord on gold roads</li>
            <li>Click projector / Rebuild board</li>
            <li>5 — Sling to upper terrace</li>
          </ul>
        </>
      )}
    </div>
  )
}
