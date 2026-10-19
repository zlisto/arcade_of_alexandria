import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const PINK = '#ff8ad8'
const GOLD = '#ffd27a'

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const orbit = t * 0.08
    camera.position.set(-1.2 + Math.sin(orbit) * 0.5, 3.2, 6.8 + Math.cos(orbit) * 0.3)
    look.set(0.2, 0.6, 0)
    camera.lookAt(look)
  })
  return null
}

export function DeckHallsLessonOverlay({ t }) {
  let title = 'Deck transformations'
  let rows = ['Rotate all sheets together', 'Ports must still match']
  let note = 'Allowed shifts form the deck group.'
  if (t >= 12 && t < 28) {
    title = 'Normal covers'
    rows = ['Every sheet reaches every sheet', 'Transitive deck action on fibers']
    note = 'Otherwise the cover is lopsided.'
  } else if (t >= 28 && t < 44) {
    title = 'Antipodal hall'
    rows = ['S² double-covers ℝP²', 'Half-loop lift: door to opposite door']
    note = 'Example 1.14 in Hatcher.'
  } else if (t >= 44) {
    title = 'How to play'
    rows = ['6 — Sheet Compass on the wheel', '1 — Lash stacked deck guards']
    note = 'Walk the glowing half-arc in the sphere hall.'
  }
  return (
    <div className="lesson-card deck-halls-lesson">
      <h3 style={{ color: GOLD }}>{title}</h3>
      <ul>
        {rows.map((r) => (
          <li key={r} className="lesson-math">
            {r}
          </li>
        ))}
      </ul>
      <p className="lesson-note" style={{ color: PINK }}>
        {note}
      </p>
    </div>
  )
}

export default function DeckHallsLesson({ tRef }) {
  const wheel = useRef()
  const gy = useRef()
  useFrame(() => {
    const t = tRef.current
    wheel.current.rotation.y = t * 0.5
    const demo = t >= 44 && t < 58
    gy.current.visible = demo
    if (demo) gy.current.position.x = -0.8 + smooth(seg(t, 46, 52)) * 1.6
  })
  return (
    <>
      <color attach="background" args={['#060912']} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[4, 10, 6]} intensity={0.85} />
      <LessonCamera tRef={tRef} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.8, 28]} />
          <meshStandardMaterial color="#1a2838" transparent opacity={0.45} />
        </mesh>
      ))}
      <group ref={wheel} position={[0, 0.35, 0]}>
        <mesh>
          <torusGeometry args={[0.55, 0.1, 8, 28]} />
          <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      </group>
      <group ref={gy} scale={S} visible={false}>
        <Gyroid script={() => ({ pos: [0, 0, 0], rotY: 0.5, walk: tRef.current > 48 && tRef.current < 54 ? 0.7 : 0, face: 0.5 })} />
      </group>
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} intensity={0.75} />
        <Vignette offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
