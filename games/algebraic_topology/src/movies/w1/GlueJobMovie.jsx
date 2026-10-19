import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { Hall, Platform, Press } from '../../levels/w0/FoundryScene'
import Hologram from '../../levels/w0/Hologram'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { makeTrack } from '../../levels/w0/cells'

/** Intro: level-1-7-intro "Glue Job" */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const HUB = [0, 6]
const TRACK = makeTrack({ angle: 1.5708, length: 3.8 }, HUB)
const SHOTS = [
  [0, 7, [[2.5, 3.2, 12], [0, 1.2, 6]], [[1.8, 2.8, 9], [0, 1.2, 6]]],
  [7, 15, [[2.2, 2.4, 9.5], [0, 1.0, 6]], [[1.4, 2.2, 8.2], [0, 1.0, 6]]],
  [15, 24, [[-1.2, 2.6, 8.8], [-0.2, 1.2, 6]], [[-0.6, 2.5, 7.8], [-0.2, 1.2, 6]]],
  [24, 26, [[1.8, 2.0, 8], [0.8, 0.9, 6.2]], [[1.8, 2.0, 8], [0.8, 0.9, 6.2]]],
  [26, 34, [[0.5, 4.2, 11], [0, 0.8, 6]], [[0, 5.5, 13], [0, 0.6, 6]]],
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

const G_KEYS = [
  [0, 0.4, 12, Math.PI],
  [6, 0.2, 8.5, Math.PI],
  [7.5, 0.2, 7.2, Math.PI + 0.4],
  [15, 0.5, 6.8, -2.2],
  [26, 0.3, 6.2, Math.PI],
]
const E_KEYS = [
  [0, -0.5, 12.2, Math.PI],
  [7, -1.2, 7.4, 1.1],
  [15, -1.4, 6.6, 0.8],
  [26, -1.2, 6.8, 0.9],
]
function keyed(keys, t) {
  let i = 0
  while (i < keys.length - 2 && keys[i + 1][0] <= t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const k = seg(t, a[0], b[0])
  return { x: mix(a[1], b[1], k), z: mix(a[2], b[2], k), rotY: mix(a[3], b[3], Math.min(1, k * 2)), moving: k > 0 && k < 1 }
}

export default function GlueJobMovie({ tRef }) {
  const slam = useRef(0)
  const fold = useRef(0)
  const holo = useRef()
  const unglue = useRef()
  const gRef = useRef({ x: 0, z: 12, rotY: Math.PI, moving: 0 })
  const eRef = useRef({ x: -0.5, z: 12, rotY: Math.PI, moving: 0 })
  useFrame(() => {
    const t = tRef.current
    slam.current = t > 8.5 && t < 9.2 ? 1 - (t - 8.5) / 0.7 : 0
    fold.current = smooth(seg(t, 16, 22))
    holo.current.visible = t > 8.2
    unglue.current.visible = t > 24
    Object.assign(gRef.current, keyed(G_KEYS, t))
    Object.assign(eRef.current, keyed(E_KEYS, t))
  })
  const fakeSite = { pos: HUB, def: { add: [{ r: 5.4 }] } }
  const gyroScript = useMemo(() => () => ({ pos: [gRef.current.x / S, 0, gRef.current.z / S], rotY: gRef.current.rotY, run: gRef.current.moving ? 0.6 : 0, cast: 0, loop: 0, loopDrop: 0 }), [])
  const emmyScript = useMemo(
    () => () => ({
      pos: [eRef.current.x / S, 0, eRef.current.z / S],
      rotY: eRef.current.rotY,
      walk: eRef.current.moving ? 1 : 0,
      talk: tRef.current > 14 && tRef.current < 23 ? 1 : 0,
      gesture: 0,
      bow: 0,
    }),
    [tRef],
  )
  return (
    <>
      <Hall layout={{ bounds: { minX: -20, maxX: 20, minZ: -10, maxZ: 20 } }} />
      <Platform site={fakeSite} lit current />
      <Press pos={HUB} slamRef={slam} />
      <Sparkles count={120} scale={[18, 6, 18]} position={[HUB[0], 2, HUB[1]]} size={2.4} speed={0.4} color="#ffb070" />
      <group ref={holo} position={[HUB[0], 4.2, HUB[1] - 1]}>
        <Hologram kind="torus" word={[{ e: 0, s: 1 }, { e: 1, s: 1 }, { e: 0, s: -1 }, { e: 1, s: -1 }]} kRef={fold} />
      </group>
      <group ref={unglue} position={[HUB[0] + 2.2, 0.5, HUB[1] - 1.8]}>
        <mesh>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshStandardMaterial color="#8060d0" emissive="#b090ff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      </group>
      <group scale={S}>
        <Gyroid script={gyroScript} />
        <Emmy script={emmyScript} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.85} luminanceThreshold={0.25} mipmapBlur />
        <Vignette eskil offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
