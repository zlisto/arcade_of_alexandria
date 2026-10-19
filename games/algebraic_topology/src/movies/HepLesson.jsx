import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { DevAdvance } from '../levels/w0/OverworldScene'
import { Chamber, Column, Floor, Glass, Slice } from '../levels/w0/CylinderScene'
import { allCells, inA } from '../levels/w0/hep'
import { FLOORS } from '../levels/w0/stages0B'

/**
 * "One Cell at a Time" (videos.json level-0-b-lesson): the homotopy extension property.
 *   A 0–10   the floor X × {0}; time goes up; A's motion rises as a teal column
 *   B 10–20  extend: the free point stays put; then the edge stretches between its ends
 *   C 20–32  a disk waits for its whole rim — points, edges, then the disk
 *   D 32–40  why it always works: Dⁿ × I squashes onto its floor and walls
 *   E 40–48  how to play; F 48–52 summary
 */

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const EDGE = FLOORS[0].cx
const SQUARE = FLOORS[2].cx
// fill order and times
const EDGE_FILLS = [['v1', 12], ['e0', 15.5]]
const SQUARE_FILLS = [['v0', 23], ['v1', 24], ['e0', 25.2], ['e1', 26.2], ['e3', 27.2], ['f0', 29.4]]

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(0.8, 1.2, 0), [])
  useFrame(() => {
    const a = tRef.current * 0.08
    camera.position.set(1.2 + Math.sin(a) * 2, 8.4, 11 + Math.cos(a) * 1)
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

/** Fill-rise refs driven by story time. */
function useFillKs(tRef, fills) {
  const ks = useMemo(() => Object.fromEntries(fills.map(([id]) => [id, { current: 0 }])), [fills])
  useFrame(() => {
    for (const [id, at] of fills) ks[id].current = seg(tRef.current, at, at + 1.1)
  })
  return ks
}

export default function HepLesson({ tRef }) {
  const stage = useStage(tRef, (t) => {
    const square = t >= 20 && t < 48
    const fills = square ? SQUARE_FILLS : EDGE_FILLS
    return { square, filled: fills.filter(([, at]) => t >= at).map(([id]) => id), refused: t >= 21 && t < 22.6 }
  })
  const edgeKs = useFillKs(tRef, EDGE_FILLS)
  const squareKs = useFillKs(tRef, SQUARE_FILLS)
  const refusedRef = useRef(null)
  const cx = stage.square ? SQUARE : EDGE
  const ks = stage.square ? squareKs : edgeKs
  refusedRef.current = stage.refused ? { ids: ['v0', 'v1', 'e0', 'e1', 'e3'], until: performance.now() / 1000 + 2 } : null
  const given = allCells(cx).filter((id) => inA(cx, id))
  return (
    <>
      <Chamber />
      <Glass />
      <Floor key={stage.square ? 'sq' : 'ed'} cx={cx} filled={stage.filled} refusedRef={refusedRef} />
      {given.map((id) => (
        <Column key={(stage.square ? 's' : 'e') + id} cx={cx} id={id} color="#5ad6c8" />
      ))}
      {stage.filled.map((id) => (
        <Column key={(stage.square ? 's' : 'e') + id} cx={cx} id={id} color="#ffd27a" kRef={ks[id]} />
      ))}
      <Slice cx={cx} decided={[...given, ...stage.filled]} />
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </>
  )
}

// ---------------------------------------------------------------- the 2D diagram

const GOLD = '#ffd27a'
const TEAL = '#5ad6c8'
const INK = '#e8eefc'
const SOFT = '#9fb0d0'
const PINK = '#ff8ad8' // math is pink everywhere
const MATH = { fontFamily: "'Cambria Math', 'STIX Two Math', serif" }

function Card({ title, rows, foot }) {
  return (
    <svg viewBox="0 0 260 180" className="lesson-svg">
      <text x="130" y="30" textAnchor="middle" fill={PINK} fontSize="17" style={MATH}>
        {title}
      </text>
      {rows.map(([a, b], i) => (
        <g key={i}>
          <text x="18" y={66 + i * 28} fill={PINK} fontSize="14" style={MATH}>
            {a}
          </text>
          <text x="242" y={66 + i * 28} fill={SOFT} fontSize="12" textAnchor="end">
            {b}
          </text>
        </g>
      ))}
      {foot && (
        <text x="130" y="168" textAnchor="middle" fill={SOFT} fontSize="11.5">
          {foot}
        </text>
      )}
    </svg>
  )
}

/** D: the square Dⁿ × I with its floor and walls lit, projected from a point above. */
function Retraction() {
  return (
    <svg viewBox="0 0 260 180" className="lesson-svg">
      <text x="130" y="24" textAnchor="middle" fill={PINK} fontSize="15" style={MATH}>
        Dⁿ × I → Dⁿ × {'{0}'} ∪ ∂Dⁿ × I
      </text>
      <rect x="80" y="70" width="100" height="80" fill="rgba(255,210,122,0.12)" />
      <line x1="80" y1="150" x2="180" y2="150" stroke={GOLD} strokeWidth="4" />
      <line x1="80" y1="150" x2="80" y2="70" stroke={TEAL} strokeWidth="4" />
      <line x1="180" y1="150" x2="180" y2="70" stroke={TEAL} strokeWidth="4" />
      <circle cx="130" cy="38" r="4" fill={INK} />
      {[95, 115, 145, 165].map((x) => (
        <line key={x} x1="130" y1="38" x2={x + (x - 130) * 0.9} y2="150" stroke={SOFT} strokeWidth="1" strokeDasharray="3 3" />
      ))}
      <text x="130" y="172" textAnchor="middle" fill={SOFT} fontSize="11">
        project from a point above: the box lands on floor and walls
      </text>
    </svg>
  )
}

function Diagram({ t }) {
  if (t < 10) return <Card title="X × I: space × time" rows={[['floor: X × {0}', 'where things start'], ['up: time t', '0 → 1'], ['A × I (teal)', 'a motion already chosen']]} foot="can we move all of X, matching both?" />
  if (t < 20) return <Card title="extend, cell by cell" rows={[['a free point', 'just stays put'], ['an edge', 'stretches between its ends'], ['the floor never changes', '']]} />
  if (t < 32) return <Card title="boundary first" rows={[['a disk’s column needs', ''], ['its floor and its walls', 'rim decided first'], ['points → edges → disks', 'in order of dimension']]} foot="refused until its rim moves" />
  if (t < 40) return <Retraction />
  return null
}

function Steps({ t }) {
  if (t >= 48)
    return (
      <div className="lesson-steps">
        <h4>The homotopy extension property</h4>
        <p className="lesson-math">X × {'{0}'} ∪ A × I → X × I</p>
        <p className="lesson-note">every CW pair (X, A) has it — Hatcher, Prop. 0.16</p>
      </div>
    )
  const steps = [
    ['click', 'a glowing cell on the floor', t < 43],
    ['✕', 'refused if its boundary isn’t decided (red)', t >= 43 && t < 45.6],
    ['↑', 'fill every column to finish the floor', t >= 45.6],
  ]
  return (
    <div className="lesson-steps">
      <h4>✦ The Cell-Smith</h4>
      {steps.map(([k, label, on], i) => (
        <div key={i} className={`lesson-step ${on ? 'on' : ''}`}>
          <kbd>{k}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

/** The diagram beside the 3D demo. */
export function HepLessonOverlay({ t }) {
  if (t >= 50) return null
  return <div className="lesson-card">{t >= 40 ? <Steps t={t} /> : <Diagram t={t} />}</div>
}
