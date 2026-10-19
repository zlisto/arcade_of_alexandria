import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { GardensSky, Gatehouse } from '../../levels/w1/EndpointGardensScene'
import { linearHomotopy } from '../../levels/w1/routes'
import { Line } from '@react-three/drei'

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const A = [-3.5, 0]
const B = [3.5, 0]
const PATH = [A, [-1, 0.7], [1, -0.5], B]
const FLAT = [A, [0, 0], B]

export function tau(time) {
  if (time < 18) return 0
  if (time < 42) return 0.5 - 0.5 * Math.cos((time - 18) * 0.12)
  if (time < 58) return smooth(seg(time, 42, 52))
  return 1
}

const SHOTS = [
  [0, 38, [[-2, 8, 6], [-1, 0, 0]], [[-1.5, 7.5, 5], [-1, 0, 0]]],
  [38, 58, [[0.5, 6.5, 4], [0, 0, -0.5]], [[0.2, 6, 3.5], [-0.5, 0, -0.5]]],
  [58, 68, [[-1, 10, 8], [0, 0, 0]], [[0, 12, 10], [0, 0, 0]]],
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

export default function EndpointsLesson({ tRef }) {
  const homoT = useRef(0)
  const [, redraw] = useState(0)
  const lastQ = useRef(-1)
  useFrame(() => {
    homoT.current = tau(tRef.current)
    // re-render when the homotopy (or the story beat) has moved enough to show
    const q = Math.round(homoT.current * 40) * 1000 + Math.floor(tRef.current)
    if (q !== lastQ.current) {
      lastQ.current = q
      redraw((n) => n + 1)
    }
  })
  const t = () => tRef.current
  const gPos = () => {
    if (t() < 38) return { pos: [2, 0, -1], rotY: -2.2, run: 0 }
    const k = smooth(seg(t(), 40, 48))
    return { pos: [mix(2, -0.5, k), 0, mix(-1, -2.2, k)], rotY: Math.PI, run: k > 0 && k < 1 ? 0.7 : 0 }
  }
  const pts = linearHomotopy(PATH, FLAT, homoT.current).map(([x, z]) => [x, 0.22, z])
  return (
    <>
      <GardensSky />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6, 40]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <Gatehouse pos={A} rot={Math.PI / 2} />
      <Gatehouse pos={B} rot={-Math.PI / 2} />
      <Line points={pts} color="#ffb347" lineWidth={2.4} />
      {t() >= 18 && t() < 42 && (
        <Line points={linearHomotopy(PATH, FLAT, Math.max(0, homoT.current - 0.08)).map(([x, z]) => [x, 0.18, z])} color="#ffe6a8" transparent opacity={0.35} lineWidth={1.2} />
      )}
      <Gyroid scale={S} script={() => ({ ...gPos(), cast: t() > 38 ? 0.5 : 0, whip: 0, loop: 0, loopDrop: 0 })} />
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} intensity={0.75} mipmapBlur />
        <Vignette eskil offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}

const PINK = '#ff8ad8'

export function EndpointsLessonOverlay({ tRef }) {
  const t = tRef.current
  const show = t >= 2
  if (!show) return null
  let title = 'Routes between gates'
  let rows = []
  let note = ''
  if (t < 18) {
    title = 'A route is a path'
    rows = [['Endpoints', 'A and B fixed'], ['Route', 'f : I → X']]
    note = 'Same gates — maybe different shapes.'
  } else if (t < 38) {
    title = 'Homotopy rel A'
    rows = [
      ['Frame', 'f_t at time t'],
      ['Fixed', 'f_t(a)=f₀(a) for a ∈ A'],
    ]
    note = 'Slide one route into another; gates never move.'
  } else if (t < 58) {
    title = 'Controls demo'
    rows = [
      ['Spool', '2 — walk / tie a route'],
      ['Tide Glass', '3 — scrub homotopy time t'],
    ]
    note = 'Try it on the open lawn in Endpoint Gardens.'
  } else {
    title = 'Delivery ledger'
    rows = [
      ['Same class', 'homotopic rel gates'],
      ['Hedge', 'left vs right — different classes'],
    ]
    note = 'Concatenation respects classes when gates match.'
  }
  return (
    <div className="lesson-card">
      <h3>{title}</h3>
      <ul className="lesson-math">
        {rows.map(([k, v]) => (
          <li key={k}>
            <span>{k}</span> <strong style={{ color: PINK }}>{v}</strong>
          </li>
        ))}
      </ul>
      {note && <p className="lesson-note">{note}</p>}
      {t >= 58 && (
        <ol className="lesson-steps">
          <li>Spool a route between gatehouses.</li>
          <li>Tide Glass: slide onto another route.</li>
          <li>Sort routes into ledger bins.</li>
        </ol>
      )}
    </div>
  )
}
