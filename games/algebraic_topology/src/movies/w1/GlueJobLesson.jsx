import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { Platform, Press, Track } from '../../levels/w0/FoundryScene'
import Hologram from '../../levels/w0/Hologram'
import { makeTrack } from '../../levels/w0/cells'

/** Lesson: level-1-7-lesson — relations from disks, torus, RP², Van Kampen clasp demo */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const HUB = [1.2, -0.5]
const TRACK = makeTrack({ angle: Math.PI, length: 2.6 }, HUB)
export const DEMO = { walk: [52, 56], press: 56.5, torus: [58, 64], clasp: [66, 70] }

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    if (t >= 52) {
      camera.position.set(HUB[0] - 0.5, 7.2, HUB[1] + 9.8)
      look.set(HUB[0] - 0.6, 0.4, HUB[1] + 0.8)
    } else {
      camera.position.set(0.6, 5.4, 10.5)
      look.set(0.4, 0.8, 0)
    }
    camera.lookAt(look)
  })
  return null
}

export function GlueJobLessonOverlay({ tRef }) {
  const t = tRef.current
  const card = (title, rows, note) => (
    <div className="lesson-card glue-lesson-card">
      <h3>{title}</h3>
      {rows.map(([k, v]) => (
        <div key={k} className="lesson-row">
          <span>{k}</span>
          <span className="lesson-math">{v}</span>
        </div>
      ))}
      {note && <p className="lesson-note">{note}</p>}
    </div>
  )
  if (t < 12) return card('Relation', [['Glue along', 'a'], ['Then', 'a = 1']], 'The loop slides across the disk.')
  if (t < 34) return card('Torus', [['Attach', 'a b a⁻¹ b⁻¹'], ['So', 'a b = b a']], 'π₁(T²) ≅ ℤ × ℤ')
  if (t < 50) return card('Half turn', [['Attach', 'a a'], ['Group', 'ℤ₂']], 'Once counts; twice vanishes.')
  if (t < 66) return card('Van Kampen', [['Overlap', 'c = a = b'], ['Amalgamate', 'a b⁻¹']], 'Two pieces, one group.')
  return (
    <div className="lesson-card glue-lesson-card lesson-steps">
      <h3>Controls</h3>
      <p>Cell-Smith (2): walk a word, click furnace.</p>
      <p>Van Kampen Clasp (5): click the overlap clasp.</p>
    </div>
  )
}

export default function GlueJobLesson({ tRef }) {
  const slam = useRef(0)
  const fold = useRef(0)
  const holo = useRef()
  const [edge, setEdge] = useState(null)
  const progressRef = useRef(null)
  const fakeSite = { pos: HUB, def: { add: [{ r: 4.8 }] } }
  useFrame(() => {
    const t = tRef.current
    const w = t >= DEMO.walk[0] && t < DEMO.walk[1] ? (t - DEMO.walk[0]) / (DEMO.walk[1] - DEMO.walk[0]) : null
    progressRef.current = w != null ? { track: 0, dir: 1, best: w } : null
    if (t >= DEMO.press && !edge) setEdge({ letter: 0, dir: 1, torn: false })
    slam.current = t > DEMO.press && t < DEMO.press + 0.5 ? 1 - (t - DEMO.press) / 0.5 : 0
    fold.current = seg(t, DEMO.press + 0.3, DEMO.press + 2.5)
    if (holo.current) holo.current.visible = t >= DEMO.press + 0.2
  })
  const gyroScript = useMemo(
    () => (t) => {
      const walk = t >= DEMO.walk[0] && t < DEMO.walk[1]
      return { pos: [HUB[0] / S + 0.3, 0, (HUB[1] + (walk ? 1.2 : 0)) / S], rotY: Math.PI, run: walk ? 0.7 : 0, cast: 0, loop: 0, loopDrop: 0 }
    },
    [],
  )
  return (
    <>
      <color attach="background" args={['#0a0708']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 12, 8]} intensity={0.9} />
      <Platform site={fakeSite} lit={tRef.current > 52} current />
      <Track track={TRACK} trackIdx={0} pos={HUB} edge={edge} progressRef={progressRef} />
      <Press pos={HUB} slamRef={slam} />
      <group ref={holo} position={[HUB[0], 3.8, HUB[1] - 0.8]}>
        <Hologram kind="disk" word={[{ e: 0, s: 1 }]} kRef={fold} />
      </group>
      <group scale={S}>
        <Gyroid script={gyroScript} />
      </group>
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.8} luminanceThreshold={0.25} mipmapBlur />
        <Vignette eskil offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
