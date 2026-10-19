import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { circleLoop, fieldAngle } from '../../levels/w1/brouwer'

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const RIM = 3.8

function LessonCamera() {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(0.5, 0, 0.2), [])
  useFrame(() => {
    camera.position.set(1.0, 11.5, 9.2)
    camera.lookAt(look)
  })
  return null
}

function useStage(tRef, fn) {
  const [stage, setStage] = useState(() => fn(tRef.current))
  const last = useRef(JSON.stringify(stage))
  useFrame(() => {
    const s = fn(tRef.current)
    const k = JSON.stringify(s)
    if (k !== last.current) {
      last.current = k
      setStage(s)
    }
  })
  return stage
}

export const BEATS = { rimDone: 14, shrink: 22, still: 38, roots: 52, demo: 58, summary: 66 }

export default function NoWayOutLesson({ tRef }) {
  const gy = useRef()
  const stage = useStage(tRef, (t) => ({
    rimLit: t >= 6,
    shrunk: t >= BEATS.shrink,
    showStill: t >= 30 && t < 46,
    showRoots: t >= 46,
    demo: t >= BEATS.demo,
  }))
  useFrame(() => {
    const t = tRef.current
    const walk = t >= 8 && t < BEATS.rimDone
    const a = t * (walk ? 0.45 : 0.08)
    gy.current.position.set(RIM * Math.cos(a) * (stage.shrunk ? 0.15 : 1), 0, RIM * Math.sin(a) * (stage.shrunk ? 0.15 : 1))
    gy.current.rotation.y = -a
  })
  const loop = useMemo(() => circleLoop(0, 0, RIM, 64), [])
  return (
    <>
      <color attach="background" args={['#120818']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 10, 4]} intensity={0.95} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 40]} />
        <meshStandardMaterial color="#3a3848" roughness={0.88} />
      </mesh>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={loop.length}
            array={new Float32Array(loop.flatMap(([x, z]) => [x, 0.2, z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={stage.rimLit ? '#ffcf6a' : '#665544'} />
      </line>
      {stage.showStill &&
        Array.from({ length: 5 }, (_, i) => {
          for (let j = 0; j < 5; j++) {
            /* rendered below */
          }
          return null
        })}
      {stage.showStill &&
        [-2, -1, 0, 1, 2].flatMap((x) =>
          [-2, -1, 0, 1, 2].map((z) => {
            const ang = fieldAngle('swirl', x * 0.9, z * 0.9, { focus: [0.2, -0.15] })
            const still = Math.hypot(x * 0.9 - 0.2, z * 0.9 + 0.15) < 0.4
            return (
              <mesh key={`${x}-${z}`} position={[x * 0.9, 0.05, z * 0.9]} rotation={[-Math.PI / 2, 0, -ang]}>
                <coneGeometry args={[0.08, 0.2, 6]} />
                <meshStandardMaterial color={still ? '#ffe6a8' : '#ffb347'} emissive="#ffb347" emissiveIntensity={still ? 2 : 1} toneMapped={false} />
              </mesh>
            )
          }),
        )}
      <group scale={S} ref={gy}>
        <Gyroid script={() => ({ pos: [0, 0, 0], rotY: 0.3, run: 0, cast: 0, loop: 0, loopDrop: 0 })} />
      </group>
      {stage.demo && (
        <Html center position={[2.2, 1.2, 0]} distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="lesson-steps w1-14-lesson-steps">
            <strong>Controls</strong>
            <p>Walk loops with the Winding Cord (4). Click still tiles and roots. Lash (1) for spawn.</p>
          </div>
        </Html>
      )}
      <LessonCamera />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.6} />
        <Vignette offset={0.28} darkness={0.6} />
      </EffectComposer>
    </>
  )
}

export function NoWayOutLessonOverlay({ t }) {
  const card = (title, rows, note) => (
    <div className="lesson-card w1-14-lesson-card">
      <h3>{title}</h3>
      {rows.map(([k, v]) => (
        <p key={k}>
          <span>{k}</span> <span className="lesson-math">{v}</span>
        </p>
      ))}
      {note && <p className="lesson-note">{note}</p>}
    </div>
  )
  if (t < 12) return card('Rim vs disk', [['Rim loop', 'winding 1'], ['Inner loop', 'winding 0']], 'No retraction D² → S¹')
  if (t < 28) return card('Retractor', [['Would need', '0 ↦ 1 on π₁']], 'Engine seizes')
  if (t < 44) return card('Still point', [['Boundary index', '≠ 0 ⇒ zero inside']], 'Brouwer in the plane')
  if (t < BEATS.demo) return card('Roots', [['Winding on circle', 'n ⇒ n roots']], 'Fundamental theorem of algebra flavor')
  return card('Summary', [['Tools', 'Cord + Lash']], 'Antipodes on the last deck')
}
