import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { GardensSky, Gatehouse, HedgeBed } from '../../levels/w1/EndpointGardensScene'
import { linearHomotopy } from '../../levels/w1/routes'
import { Line } from '@react-three/drei'

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const GA = [-4, 0]
const GB = [4, 0]
const STRAIGHT = [GA, [0, 0.1], GB]
const WAVY = [GA, [-2, 0.8], [0, -0.6], [2, 0.7], GB]
const LEFT = [GA, [-2, 1.9], [0, 2], [2, 1.9], GB]
const RIGHT = [GA, [-2, -1.9], [0, -2], [2, -1.9], GB]

const SHOTS = [
  [0, 7, [[8, 9, 14], [0, 0, 0]], [[2, 7.5, 10], [0, 0, 0]]],
  [7, 15, [[2, 6.5, 8], [0, 0, 0]], [[2, 6.2, 6], [0, 0, 0]]],
  [15, 23, [[3, 5.5, 4], [0, 0, 0]], [[1, 5.2, 2], [0, 0, 0]]],
  [23, 26, [[5, 3.5, 2], [4, 0, 0]], [[4.5, 3.2, 1.5], [3, 0, 0]]],
  [26, 32, [[0, 5, 10], [0, 0, 2]], [[0, 4.5, 8], [0, 0, 0]]],
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

function RouteLine({ pts, tSlide = 0, color = '#ffb347', opacity = 1 }) {
  const line = useMemo(() => {
    if (tSlide <= 0) return pts.map(([x, z]) => [x, 0.2, z])
    const morphed = linearHomotopy(pts, STRAIGHT, Math.min(1, tSlide))
    return morphed.map(([x, z]) => [x, 0.2, z])
  }, [pts, tSlide])
  return <Line points={line} color={color} lineWidth={2.2} transparent opacity={opacity} />
}

export default function EndpointsMovie({ tRef }) {
  const slideK = useRef(0)
  useFrame(() => {
    const t = tRef.current
    slideK.current = t >= 7 && t < 15 ? smooth(seg(t, 8, 14)) : t >= 15 && t < 23 ? smooth(seg(t, 16, 22)) * 0.35 : 0
  })
  const t = () => tRef.current
  const emmy = () => ({
    pos: [mix(-2.5, -1.2, smooth(seg(t(), 26, 29))) / S, 0, mix(2, 1.5, smooth(seg(t(), 26, 29))) / S],
    rotY: 0.5,
    talk: (t() > 7 && t() < 14) || (t() > 19 && t() < 23) ? 1 : 0,
    gesture: t() > 7 && t() < 15 ? 0.7 : 0,
    walk: 0,
    bow: 0,
  })
  const gyro = () => ({
    pos: [mix(1.5, 0.5, smooth(seg(t(), 26, 29))) / S, 0, mix(-1, 0.5, smooth(seg(t(), 26, 29))) / S],
    rotY: Math.PI * 0.55,
    run: t() > 26 && t() < 29 ? 0.5 : 0,
    cast: 0,
    whip: t() > 23 && t() < 26 ? 0.5 : 0,
    loop: 0,
    loopDrop: 0,
  })
  return (
    <>
      <GardensSky />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#4a5568" />
      </mesh>
      <Gatehouse pos={GA} rot={Math.PI / 2} />
      <Gatehouse pos={GB} rot={-Math.PI / 2} />
      <HedgeBed c={[0, 0]} r={1.35} />
      <RouteLine pts={WAVY} tSlide={t() >= 7 && t() < 15 ? slideK.current : 0} />
      {t() >= 15 && t() < 23 && (
        <>
          <RouteLine pts={LEFT} color="#ffb347" />
          <RouteLine pts={RIGHT} color="#b090ff" opacity={0.85} tSlide={slideK.current} />
        </>
      )}
      <Emmy scale={S} script={emmy} />
      <Gyroid scale={S} script={gyro} />
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} intensity={0.8} mipmapBlur />
        <Vignette eskil offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
