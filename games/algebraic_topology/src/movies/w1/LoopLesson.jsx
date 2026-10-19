import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Line, Sparkles } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { makeTrack } from '../../levels/w0/cells'
import { LiveLine } from '../../levels/w0/FlatsScenery'

/**
 * level-1-2-lesson: π₁ basics + Loop Lash controls demo (ends with Gyroid on the ring).
 */
const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const HUB = [1.2, -0.6]
const TRACK = makeTrack({ angle: Math.PI, length: 2.9 }, HUB)
export const DEMO = { walk: [52, 57], lap: [57, 62], summary: 66 }

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    if (t >= DEMO.walk[0] && t < DEMO.summary) {
      camera.position.set(HUB[0] - 0.5, 7.2, HUB[1] + 9.8)
      look.set(HUB[0] - 0.6, 0.4, HUB[1] + 0.8)
    } else {
      camera.position.set(1.5, 5.5, 9)
      look.set(0.5, 0.8, 0)
    }
    camera.lookAt(look)
  })
  return null
}

export function LoopLessonOverlay({ t }) {
  return (
    <div className="lesson-overlay">
      {t < 12 && (
        <div className="lesson-card">
          <h3 className="lesson-title">Based loops</h3>
          <p className="lesson-math">A loop at x₀ is a path that starts and ends at x₀.</p>
          <p className="lesson-note">Up to sliding (homotopy), loops can be concatenated.</p>
        </div>
      )}
      {t >= 12 && t < 28 && (
        <div className="lesson-card">
          <h3 className="lesson-title">The group law</h3>
          <p className="lesson-math">$[α][β] = $ run $α$, then run $β$ (same basepoint).</p>
          <p className="lesson-math">Identity: stand still. Inverse: run the loop backwards.</p>
        </div>
      )}
      {t >= 28 && t < 44 && (
        <div className="lesson-card">
          <h3 className="lesson-title">Change of base</h3>
          <p className="lesson-math">Along a path h from x₀ to x₁: γ ↦ h γ h⁻¹.</p>
        </div>
      )}
      {t >= 44 && t < 52 && (
        <div className="lesson-card">
          <h3 className="lesson-title">Loop Lash</h3>
          <p>Equip the Lash (1). Leave the beacon, go round a gold ring, return — the ledger records the loop.</p>
        </div>
      )}
      {t >= DEMO.summary && (
        <div className="lesson-card lesson-steps">
          <h3 className="lesson-title">Summary</h3>
          <ul>
            <li>Close loops at the beacon with the Loop Lash</li>
            <li>Reverse a loop to cancel — identity</li>
            <li>Concatenate three loops — associativity</li>
            <li>Carry the ledger to Beacon B</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default function LoopLesson({ tRef }) {
  const progressRef = useRef(null)
  const [edge, setEdge] = useState(false)
  useFrame(() => {
    const t = tRef.current
    const w = t >= DEMO.lap[0] && t < DEMO.lap[1] ? smooth(seg(t, DEMO.lap[0], DEMO.lap[1])) : null
    progressRef.current = w != null ? { track: 0, dir: 1, best: w } : null
    if (t >= DEMO.lap[1] - 0.2 && !edge) setEdge(true)
    if (t < DEMO.lap[0] - 0.5 && edge) setEdge(false)
  })
  const gy = () => {
    const t = tRef.current
    const wIn = smooth(seg(t, DEMO.walk[0], DEMO.walk[1]))
    const onLap = t >= DEMO.lap[0] && t < DEMO.lap[1]
    const p = onLap ? TRACK.at(smooth(seg(t, DEMO.lap[0], DEMO.lap[1]))) : [HUB[0] + wIn * 0.3, HUB[1]]
    return { pos: [p[0] / S, 0, p[1] / S], rotY: 0.3, walk: onLap || (t > DEMO.walk[0] && t < DEMO.walk[1]) ? 0.65 : 0 }
  }
  const local = TRACK.pts.map(([x, z]) => [x, 0.12, z])
  const lit = () => {
    const pr = progressRef.current
    if (!pr || pr.best <= 0.02) return null
    const n = local.length - 1
    const k = Math.round(pr.best * n)
    return local.slice(0, k + 1).map(([x, , z]) => [x, z, 0.14])
  }
  return (
    <>
      <color attach="background" args={['#0a0c14']} />
      <ambientLight intensity={0.38} />
      <directionalLight position={[5, 12, 6]} intensity={0.85} />
      <Sparkles count={80} scale={[14, 4, 14]} position={[HUB[0], 2, HUB[1]]} size={2} color="#ffb070" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[HUB[0], -0.02, HUB[1]]}>
        <circleGeometry args={[4.5, 40]} />
        <meshStandardMaterial color="#2a2830" />
      </mesh>
      <mesh position={[HUB[0], 0.12, HUB[1]]}>
        <cylinderGeometry args={[0.5, 0.55, 0.12, 24]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ff8a2a" emissiveIntensity={edge ? 1.2 : 0.4} toneMapped={false} />
      </mesh>
      <group position={[HUB[0], 0, HUB[1]]}>
        <Line points={local.map(([x, y, z]) => [x - HUB[0], y, z - HUB[1]])} color={edge ? '#ffcf6a' : '#5a5048'} lineWidth={edge ? 7 : 4} toneMapped={false} />
        <LiveLine getPts={lit} color="#fff2c4" width={6} />
      </group>
      <group scale={S}>
        <Gyroid script={gy} />
      </group>
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.28} intensity={0.75} />
        <Vignette offset={0.15} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
