import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { BUILD_PRESETS, coverTwoSheetAA, letterText, torusLift } from '../../levels/w1/covers.js'
import { StacksSky } from '../../levels/w1/SheetMusicScene'

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))

export const BEATS = {
  claspCycle: [8, 10, 12],
  sentinel: 22,
  treeSteps: [32, 34, 36],
  torusPick: 44,
  demoClasp: 52,
  demoCompass: 58,
}

function LessonCamera() {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(0.5, 0, 0.5), [])
  useFrame(() => {
    camera.position.set(1.0, 10.5, 9.5)
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

export function SheetMusicLessonOverlay({ tRef }) {
  const t = tRef.current
  const card = t < 20 ? 'order' : t < 30 ? 'conjugate' : t < 42 ? 'tree' : t < 50 ? 'plane' : 'summary'
  return (
    <div className="lesson-card level-1-9-lesson-card">
      {card === 'order' && (
        <>
          <h3>Build to order</h3>
          <p className="lesson-math">a² closes · a not · b closes → 2 sheets</p>
          <p className="lesson-note">Subgroup ⟨a², b⟩ in F₂</p>
        </>
      )}
      {card === 'conjugate' && (
        <>
          <h3>Moving the start</h3>
          <p className="lesson-math">g H g⁻¹ — same cover, new basepoint</p>
        </>
      )}
      {card === 'tree' && (
        <>
          <h3>Universal tree</h3>
          <p className="lesson-math">Reduced words = vertices of Cayley graph</p>
        </>
      )}
      {card === 'plane' && (
        <>
          <h3>Plane over torus</h3>
          <p className="lesson-math">a ↦ (1,0), b ↦ (0,1) on ℤ²</p>
        </>
      )}
      {card === 'summary' && (
        <ul className="lesson-steps">
          <li>Clasp (5) — glue sheets at ports</li>
          <li>Lash (1) — swap start with sentinel</li>
          <li>Compass (6) — read lifts on tree & grid</li>
        </ul>
      )}
    </div>
  )
}

export default function SheetMusicLesson({ tRef }) {
  const stage = useStage(tRef, (t) => ({
    preset: t < 8 ? 0 : BEATS.claspCycle.filter((x) => t >= x).length,
    treeLen: BEATS.treeSteps.filter((x) => t >= x).length,
    torus: t >= BEATS.torusPick,
    demo: t >= BEATS.demoClasp,
  }))
  const cover = stage.preset >= 2 ? coverTwoSheetAA() : BUILD_PRESETS[Math.min(stage.preset, 1)]
  const treeLetters = ['a', 'b', 'a'].slice(0, stage.treeLen)
  const torusEnd = torusLift([0, 0], ['a', 'b'])
  return (
    <>
      <StacksSky />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#2a3548" />
      </mesh>
      {[0, 1].map((v) => (
        <mesh key={v} position={[(v - 0.5) * 2.4, 0.35, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 0.06, 20]} />
          <meshStandardMaterial color="#a8e0ff" transparent opacity={0.5} emissive="#88ccff" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {stage.demo && (
        <Html position={[-2, 1.2, 2]} center>
          <span className="lesson-hint">Clasp ports · Compass branches</span>
        </Html>
      )}
      <Gyroid script={() => ({ pos: [0.5, 0, 1.5], rotY: -0.5, run: stage.demo ? 0.15 : 0, cast: stage.demo ? 0.5 : 0, loop: 0, loopDrop: 0 })} />
      <LessonCamera />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} intensity={0.75} />
        <Vignette eskil={false} offset={0.22} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
