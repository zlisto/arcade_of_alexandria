import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Line, Sparkles, Stars } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import Emmy from '../../characters/Emmy'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { makeTrack } from '../../levels/w0/cells'
import { LiveLine } from '../../levels/w0/FlatsScenery'

/** Intro: level-1-2-intro "Every Road Comes Home" */
const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

const HUB = [0, 2]
const TRACK = makeTrack({ angle: 2.2, length: 3.6 }, HUB)

const SHOTS = [
  [0, 7, [[2, 9, 12], [0, 1, 2]], [[-1, 7.5, 9], [0, 0.5, 2]]],
  [7, 15, [[-2, 6.5, 8], [0, 0.8, 2]], [[1, 6, 7], [0, 0.5, 2]]],
  [15, 23, [[3, 5.5, 6], [0, 0.4, 2]], [[-1, 5, 5.5], [0, 0.4, 2]]],
  [23, 26, [[0, 8, 14], [4, 0.5, 8]], [[0, 7, 12], [4, 0.5, 8]]],
  [26, 34, [[-2, 6, 10], [0, 0.6, 2]], [[-1, 7, 11], [0, 0.6, 2]]],
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

export default function LoopMovie({ tRef }) {
  const progressRef = useRef(null)
  const ghostRef = useRef(null)
  useFrame(() => {
    const t = tRef.current
    const walk = t >= 15.4 && t < 19.6 ? seg(t, 15.4, 19.6) : t >= 16.8 && t < 19 ? 1 - seg(t, 16.8, 19) : null
    progressRef.current = walk != null ? { track: 0, dir: walk > 0.5 ? -1 : 1, best: walk > 0.5 ? 1 - (walk - 0.5) * 2 : walk * 2 } : null
    ghostRef.current = t >= 17 && t < 20 ? TRACK.pts.map(([x, z]) => [x, 0.2, z]) : null
  })
  const emmy = () => ({ pos: [(-2.2) / S, 0, 3.2 / S], rotY: 0.5, walk: 0, gesture: tRef.current > 7 && tRef.current < 14 ? 0.85 : 0, talk: tRef.current > 7 && tRef.current < 11 ? 1 : 0 })
  const gy = () => {
    const t = tRef.current
    const k = smooth(seg(t, 8, 14))
    const p = t >= 15 ? TRACK.at(smooth(seg(t, 15.2, 19.4))) : [HUB[0] + k * 0.4, HUB[1]]
    return { pos: [p[0] / S, 0, p[1] / S], rotY: Math.atan2(TRACK.at(0.55)[0] - p[0], TRACK.at(0.55)[1] - p[1]), walk: t > 8 && t < 19 ? 0.7 : 0 }
  }
  const local = TRACK.pts.map(([x, z]) => [x, 0.14, z])
  return (
    <>
      <color attach="background" args={['#0a0c14']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 14, 8]} intensity={0.9} color="#ffe8c8" />
      <Stars radius={70} depth={30} count={600} factor={2} fade />
      <Sparkles count={120} scale={[20, 6, 20]} position={[0, 4, 0]} size={2.2} color="#ffb070" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color="#2a2830" roughness={0.85} />
      </mesh>
      <mesh position={[HUB[0], 3.8, HUB[1]]}>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshStandardMaterial color="#ffb347" emissive="#ffb347" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <Line points={local} color="#ffcf6a" lineWidth={6} toneMapped={false} />
      <LiveLine getPts={() => (ghostRef.current ? ghostRef.current.map(([x, , z]) => [x, z, 0.16]) : null)} color="#a8e0ff" width={5} />
      <group scale={S}>
        <Emmy script={emmy} />
        <Gyroid script={gy} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.25} intensity={0.8} />
        <Vignette offset={0.15} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
