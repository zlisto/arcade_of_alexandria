import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Emmy from '../characters/Emmy'
import Gyroid from '../characters/Gyroid'
import { DevAdvance } from '../levels/w0/OverworldScene'
import { Chamber, Column, Door, Floor, Glass, Slice } from '../levels/w0/CylinderScene'
import { allCells, inA } from '../levels/w0/hep'
import { FLOORS } from '../levels/w0/stages0B'

/**
 * Intro movie for World 0 · Bonus, "The Cylinder Works" (videos.json level-0-b-intro):
 *   A 0–7    the side door answers the Cell-Smith and slides open on a tall glass cylinder
 *   B 7–16   a gold pattern on the floor; teal bands of motion rise up the cylinder
 *   C 16–24  the machine fills the interior, cell by cell, until the whole cylinder glows
 *   D 24–28  title card
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]
const CX = FLOORS[3].cx
const ORDER = ['v2', 'v3', 'e1', 'e2', 'e3', 'e4', 'e5', 'f0', 'f1']
const FILL_AT = ORDER.map((_, i) => 16.4 + i * 0.8)

const SHOTS = [
  [0, 7, [[0.5, 1.8, 13.5], [0, 1.4, 8.8]], [[0.2, 2.6, 12.2], [0, 1.6, 4]]],
  [7, 16, [[9.5, 8.5, 11.5], [0, 1.2, 0]], [[-9, 8.0, 11], [0, 1.4, 0]]],
  [16, 24, [[0, 11, 12.5], [0, 1.2, 0]], [[3, 9, 11.5], [0, 1.6, 0]]],
  [24, 40, [[0, 6.5, 12.5], [0, 1.6, 0]], [[0, 8, 14.5], [0, 1.6, 0]]],
]
function MovieCamera({ tRef }) {
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

export default function CylinderMovie({ tRef }) {
  const stage = useStage(tRef, (t) => ({ open: t > 3.5, bands: t > 8, filled: ORDER.filter((_, i) => t >= FILL_AT[i]) }))
  const ks = useMemo(() => Object.fromEntries(ORDER.map((id) => [id, { current: 0 }])), [])
  const bandK = useRef(0)
  useFrame(() => {
    const t = tRef.current
    ORDER.forEach((id, i) => (ks[id].current = seg(t, FILL_AT[i], FILL_AT[i] + 0.9)))
    bandK.current = seg(t, 8, 11)
  })
  const given = allCells(CX).filter((id) => inA(CX, id))
  const gyroScript = () => {
    const t = tRef.current
    const k = smooth(seg(t, 4, 7.5))
    return { pos: [0.5 / S, 0, mix(10.6, 6.6, k) / S], rotY: Math.PI, run: k > 0 && k < 1 ? 0.6 : 0, cast: t < 4 ? 0.6 : 0, whip: 0, loop: 0, loopDrop: 0 }
  }
  const emmyScript = () => {
    const t = tRef.current
    const k = smooth(seg(t, 4.4, 8))
    return { pos: [mix(-0.6, -5.0, k) / S, 0, mix(10.8, 3.6, k) / S], rotY: k > 0 && k < 1 ? Math.PI + 0.6 : 2.2, walk: k > 0 && k < 1 ? 1 : 0, bow: 0, gesture: t > 9 ? 0.8 : 0, talk: (t > 5 && t < 8.8) || (t > 9.2 && t < 23.6) ? 1 : 0 }
  }
  return (
    <>
      <Chamber />
      <Glass />
      <Door open={stage.open} />
      <Floor cx={CX} filled={stage.filled} refusedRef={{ current: null }} />
      {stage.bands && given.map((id) => <Column key={id} cx={CX} id={id} color="#5ad6c8" kRef={bandK} />)}
      {stage.filled.map((id) => (
        <Column key={id} cx={CX} id={id} color="#ffd27a" kRef={ks[id]} />
      ))}
      {stage.bands && <Slice cx={CX} decided={[...given, ...stage.filled]} />}
      <group scale={S}>
        <Gyroid script={gyroScript} />
        <Emmy script={emmyScript} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.6} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}
