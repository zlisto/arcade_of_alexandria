import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { helixHeight, homotopyLoop } from '../../levels/w1/winding'
import layout from '../../world/windingRoad.json'
import { buildSites } from '../../world/sites'

/** Lesson level-1-3-lesson: helix cover, winding number, homotopy invariance, controls demo. */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

const SITES = buildSites(layout)
const HELIX = SITES.find((s) => s.id === 'the_helix')
const [TX, TZ] = HELIX.pos
const PITCH = layout.helixPitch || 2.35

export function tauLesson(t) {
  if (t < 12) return 0
  if (t < 28) return smooth(seg(t, 12, 28))
  if (t < 48) return 0.35 + 0.3 * Math.sin((t - 28) * 0.5)
  return 0.5
}

const SHOTS = [
  [0, 38, [[TX + 4, 8, TZ + 5], [TX, 2, TZ]], [[TX + 3, 7, TZ + 4], [TX, 2, TZ]]],
  [38, 52, [[TX + 3, 4, TZ + 3.5], [TX, 0.8, TZ]], [[TX + 2.5, 3.5, TZ + 3], [TX, 0.8, TZ]]],
  [52, 68, [[TX + 5, 5, TZ + 4], [TX, 1, TZ]], [[TX + 4, 6, TZ + 5], [TX, 1, TZ]]],
]

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const [a, b, from, to] = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1]
    const k = smooth(seg(t, a, b))
    camera.position.set(...mix3(from[0], to[0], k))
    look.set(...mix3(from[1], to[1], k))
    camera.lookAt(look)
  })
  return null
}

export function WindingRoadLessonOverlay({ tRef }) {
  const t = tRef.current
  const w = t < 20 ? 0 : t < 32 ? 1 : 1
  const card = t > 58
  return (
    <div className="lesson-overlay w13-lesson-overlay">
      {!card ? (
        <div className="lesson-card">
          <h3>Helix cover</h3>
          <p className="lesson-math">ℝ → S¹ · lift ends at n ∈ ℤ</p>
          <p>Floor reached: <b>{w}</b></p>
          {t > 28 && t < 48 && <p className="lesson-note">Homotopy: deform the loop, keep the floor.</p>}
          {t > 48 && <p className="lesson-note">Winding Cord (4) counts laps · Tide Glass (3) slides them.</p>}
        </div>
      ) : (
        <div className="lesson-card lesson-steps">
          <h3>On the road</h3>
          <ol>
            <li>Run laps on the gold ring with the Cord.</li>
            <li>Bank at the beacon — laps add.</li>
            <li>Unwind Winders, then lash.</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default function WindingRoadLesson({ tRef }) {
  const gy = useRef({ x: TX + 4.2, z: TZ, face: 0 })
  const demoT = useRef(0.5)
  useFrame(() => {
    const t = tRef.current
    demoT.current = tauLesson(t)
    const lap = t > 38 ? seg(t, 40, 48) : seg(t, 14, 22)
    const theta = lap * Math.PI * 2
    gy.current.x = TX + (4.2 + (t > 28 && t < 48 ? Math.sin(t * 2) * 0.35 : 0)) * Math.cos(theta)
    gy.current.z = TZ + (4.2 + (t > 28 && t < 48 ? Math.cos(t * 2) * 0.35 : 0)) * Math.sin(theta)
    gy.current.face = theta + Math.PI / 2
  })
  const h = helixHeight(1, PITCH)
  return (
    <>
      <color attach="background" args={['#060912']} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[-6, 14, -8]} intensity={1} />
      <mesh position={[TX, -0.15, TZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial color="#1a1824" />
      </mesh>
      <mesh position={[TX, h * 0.5 + 0.5, TZ]}>
        <cylinderGeometry args={[1, 1, h + 1, 24, 6, true]} />
        <meshStandardMaterial color="#2a2838" emissive="#6040a0" emissiveIntensity={0.15} />
      </mesh>
      <group position={[TX, h + 0.5, TZ]}>
        <mesh scale={S * 0.85}>
          <capsuleGeometry args={[0.18, 0.4, 6, 10]} />
          <meshStandardMaterial color="#3ecfc4" emissive="#5ee0d8" emissiveIntensity={0.85} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      </group>
      <Gyroid
        scale={S}
        script={() => ({ pos: [gy.current.x / S, 0, gy.current.z / S], rotY: gy.current.face, walk: tRef.current > 38 ? 1 : 0.6, talk: 0, gesture: 0, bow: 0 })}
      />
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.38} intensity={0.7} />
        <Vignette eskil offset={0.2} darkness={0.48} />
      </EffectComposer>
    </>
  )
}
