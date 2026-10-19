import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { Deck } from '../../levels/w1/UnderCoverScene'
import layout from '../../world/sheetwater.json'
import { buildSites } from '../../world/sites'

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const SITES = buildSites(layout)
const RESCUE = SITES.find((s) => s.id === 'rescue')

const SHOTS = [
  [0, 8, [[8, 9, 22], [0, 0, 8]], [[2, 7, 14], [0, 0, 0]]],
  [8, 16, [[RESCUE.pos[0] + 3, 6, RESCUE.pos[1] + 6], [RESCUE.pos[0], 4, RESCUE.pos[1]]], [[RESCUE.pos[0] + 1, 5, RESCUE.pos[1] + 4], [RESCUE.pos[0], 3.5, RESCUE.pos[1]]]],
  [16, 26, [[0, 3.5, 8], [0, 0.5, 0]], [[1.2, 4.2, 9], [0, 0.5, 0]]],
  [26, 30, [[0, 2.8, 10], [0, 0.6, 0]], [[0.5, 3.2, 11], [0, 0.6, 0]]],
  [30, 36, [[0, 2.6, 12], [0, 0.6, 0]], [[0, 3.4, 14], [0, 0.6, 0]]],
]

function MovieCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const shot = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1]
    const [a, b, from, to] = shot
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

export default function UnderCoverMovie({ tRef }) {
  const stage = useStage(tRef, (t) => ({
    liftY: 3.2 + (t >= 16 ? Math.min(1, (t - 16) / 6) : 0) * 1.35,
    emmyUp: t >= 8 && t < 26,
  }))
  const gy = useMemo(() => () => ({ pos: [0, 0, 1.2], rotY: 0.2, run: 0.15, cast: 0, loop: 0, loopDrop: 0 }), [])
  return (
    <>
      <color attach="background" args={['#0a1424']} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 12, -10]} intensity={1} color="#c8e8ff" />
      {SITES.filter((s) => s.stage).slice(0, 2).map((s) => (
        <Deck key={s.id} site={s} current={s.id === 'two_floors'} />
      ))}
      <mesh position={[0, stage.liftY, 0]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
      <group scale={S}>
        <Gyroid script={gy} />
        <Emmy script={() => ({ pos: [stage.emmyUp ? 0 : -1.2, stage.emmyUp ? 1.2 : 0, stage.emmyUp ? -1 : 2], rotY: 0.4, walk: 0, talk: stage.emmyUp ? 1 : 0, gesture: 0, bow: 0 })} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.62} />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  )
}
