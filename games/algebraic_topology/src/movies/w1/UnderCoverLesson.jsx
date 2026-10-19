import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { coverThreeSheetAbSep, coverTwoSheetCircle, liftWord, parseWord } from '../../levels/w1/covers'
import { Deck } from '../../levels/w1/UnderCoverScene'

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))

export const BEATS = { oneLap: 8, twoLap: 14, wire: 22, ab: 38, demo: 52, summary: 62 }

function LessonCamera() {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(0.8, 0, 0.6), [])
  useFrame(() => {
    camera.position.set(1.4, 11.5, 9.2)
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

export default function UnderCoverLesson({ tRef }) {
  const stage = useStage(tRef, (t) => ({
    lap: t >= BEATS.oneLap && t < BEATS.twoLap ? 1 : t >= BEATS.twoLap && t < BEATS.wire ? 2 : 0,
    showFig: t >= BEATS.wire,
    prove: t >= BEATS.ab,
    demo: t >= BEATS.demo,
  }))
  const circle = coverTwoSheetCircle()
  const fig = coverThreeSheetAbSep()
  const lift1 = liftWord(circle, 0, parseWord('a')).end
  const lift2 = liftWord(circle, 0, parseWord('aa')).closed
  const ab = liftWord(fig, 0, parseWord('ab'))
  const ba = liftWord(fig, 0, parseWord('ba'))
  return (
    <>
      <color attach="background" args={['#0a1424']} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[6, 10, -8]} intensity={0.95} color="#c8e8ff" />
      <Deck site={{ pos: [0, 0], def: { add: [{ r: 5.2 }] } }} current />
      <mesh position={[0, 3.2 + (stage.lap === 1 ? 1.35 : stage.lap === 2 ? 0 : 0), 0]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
      {stage.demo && (
        <group scale={S} position={[0, 0, 0]}>
          <Gyroid script={() => ({ pos: [0, 0, 0.6], rotY: 0.3, run: 0.2, cast: 0.4, loop: 0, loopDrop: 0 })} />
        </group>
      )}
      <LessonCamera />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.62} />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  )
}

export function UnderCoverLessonOverlay({ tRef }) {
  const t = tRef.current
  const card = t < BEATS.wire ? 'circle' : t < BEATS.ab ? 'wire' : t < BEATS.demo ? 'prove' : t < BEATS.summary ? 'demo' : 'sum'
  const rows =
    card === 'circle'
      ? [
          ['One lap on a', 'lift → sheet 2'],
          ['Two laps aa', 'lift closes'],
        ]
      : card === 'wire'
        ? [
            ['Local rule', 'one in, one out per label'],
            ['Three sheets', 'connected cover'],
          ]
        : card === 'prove'
          ? [
              ['ab', 'lift closes'],
              ['ba', 'lift open — different loop'],
            ]
          : card === 'demo'
            ? [
                ['Cord (4)', 'walk loops on tracks'],
                ['Compass (6)', 'wire ports · test words'],
              ]
            : [['Cover', 'separates words · proves order']]
  return (
    <div className="lesson-card">
      <h3>Covers & lifts</h3>
      <ul className="lesson-math">
        {rows.map(([k, v]) => (
          <li key={k}>
            <strong>{k}</strong> — {v}
          </li>
        ))}
      </ul>
      {t >= BEATS.summary && (
        <ol className="lesson-steps">
          <li>Winding Cord (4): walk loops</li>
          <li>Sheet Compass (6): ports & tests</li>
        </ol>
      )}
    </div>
  )
}
