import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { Platform, Track } from '../../levels/w0/FoundryScene'
import { makeTrack } from '../../levels/w0/cells'
import { wordText, parseTokens, reduceFree } from '../../levels/w1/freeWords'
import layout from '../../world/freewordforge.json'
import { buildSites } from '../../world/sites'

/** Lesson: level-1-6-lesson — free group words + controls demo (see integration/1_6.md for videos.json). */
const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const HUB = buildSites(layout).find((s) => s.id === 'laps_letters')
const [HX, HZ] = HUB.pos
const DEMO = { walk: [52, 58], lapA: [58, 62], lapB: [62.5, 66], clasp: 66.5 }
const TRACK_A = makeTrack({ angle: Math.PI, length: 2.6 }, [HX, HZ])
const TRACK_B = makeTrack({ angle: 0, length: 2.6 }, [HX, HZ])

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    if (t >= 52 && t < 68) {
      camera.position.set(HX - 0.5, 7.4, HZ + 9.8)
      look.set(HX - 0.6, 0.6, HZ + 0.4)
    } else {
      camera.position.set(HX + 1.2, 6, HZ + 11)
      look.set(HX, 0.8, HZ)
    }
    camera.lookAt(look)
  })
  return null
}

function Demo({ tRef }) {
  const progressRef = useRef(null)
  const [tape, setTape] = useState([])
  useFrame(() => {
    const t = tRef.current
    if (t >= DEMO.lapA[0] && t < DEMO.lapA[1]) progressRef.current = { track: 0, dir: 1, best: seg(t, DEMO.lapA[0], DEMO.lapA[1]) }
    else if (t >= DEMO.lapB[0] && t < DEMO.lapB[1]) progressRef.current = { track: 1, dir: 1, best: seg(t, DEMO.lapB[0], DEMO.lapB[1]) }
    else progressRef.current = null
    if (Math.abs(t - DEMO.lapA[1]) < 0.05) setTape(parseTokens('a'))
    if (Math.abs(t - DEMO.lapB[1]) < 0.05) setTape(parseTokens('a b'))
  })
  const gy = () => {
    const t = tRef.current
    const w = t >= DEMO.walk[0] && t < DEMO.lapA[1]
    const onB = t >= DEMO.lapB[0] && t < DEMO.lapB[1]
    const p = w ? TRACK_A.at(seg(t, DEMO.walk[0], DEMO.lapA[1])) : onB ? TRACK_B.at(seg(t, DEMO.lapB[0], DEMO.lapB[1])) : [HX + 0.6, HZ + 2]
    return { pos: [p[0] / S, 0, p[1] / S], rotY: w || onB ? 0.2 : -0.3, walk: w || onB ? 1 : 0, gesture: t >= DEMO.clasp ? 0.7 : 0, talk: 0, bow: 0 }
  }
  return (
    <>
      <Platform site={HUB} lit current />
      <Track track={TRACK_A} edge={{ letter: 0, dir: 1, torn: false }} progressRef={progressRef} trackIdx={0} pos={[HX, HZ]} />
      <Track track={TRACK_B} edge={{ letter: 1, dir: 1, torn: false }} progressRef={progressRef} trackIdx={1} pos={[HX, HZ]} />
      <group scale={S}>
        <Gyroid script={gy} />
      </group>
      {tape.length > 0 && (
        <mesh position={[HX + 0.2, 2, HZ + 0.3]}>
          <boxGeometry args={[0.02, 0.02, 0.02]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}
    </>
  )
}

export function FreeWordLessonOverlay({ t = 0 }) {
  // an HTML overlay (outside the Canvas): derive the tape from the story time
  const tape = parseTokens(t >= DEMO.lapB[1] ? 'a b' : t >= DEMO.lapA[1] ? 'a' : '')
  if (t < 4) return null
  return (
    <div className="lesson-card">
      <h3>Free words</h3>
      {t < 52 && (
        <>
          <p className="lesson-math">Loops → letters a, b; inverses cancel when adjacent.</p>
          <p className="lesson-math">Reduced form is unique (proof at 1-8).</p>
          <p className="lesson-note">On a bouquet, ab ≠ ba.</p>
        </>
      )}
      {t >= 52 && (
        <>
          <p className="lesson-math">Tape: {wordText(tape)}</p>
          <p className="lesson-note">Reduced: {wordText(reduceFree(tape))}</p>
          <ul className="lesson-steps">
            <li>Walk a full lap from the beacon</li>
            <li>5 — Van Kampen Clasp at the hub</li>
            <li>1 — Lash patrol in reverse word order</li>
          </ul>
        </>
      )}
    </div>
  )
}

export default function FreeWordLesson({ tRef }) {
  return (
    <>
      <color attach="background" args={['#080a12']} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[-5, 14, 6]} intensity={0.85} />
      <Demo tRef={tRef} />
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.42} intensity={0.45} />
        <Vignette offset={0.22} darkness={0.5} />
      </EffectComposer>
    </>
  )
}
