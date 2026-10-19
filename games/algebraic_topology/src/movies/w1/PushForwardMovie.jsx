import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import layout from '../../world/torus-terraces.json'
import { buildSites } from '../../world/sites'

/**
 * Intro movie World 1 · Level 5 — "Two Roads" (level-1-5-intro).
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const SITES = buildSites(layout)
const TWO = SITES.find((s) => s.id === 'two_roads')

const SHOTS = [
  [0, 8, [[0, 4.5, 18], [0, 1, 6]], [[0.5, 3.8, 12], [0, 0.8, 4]]],
  [8, 15, [[2.5, 2.8, 8], [2, 0.6, 4]], [[1.2, 2.4, 6.5], [1.8, 0.5, 4]]],
  [15, 24, [[14, 6.5, -2], [12, 0.5, -4]], [[13, 5.5, -3], [12, 0.5, -4]]],
  [24, 26, [[2.2, 2.2, 6], [1.8, 0.8, 4]], [[2.4, 2.0, 5.5], [1.8, 0.8, 4]]],
  [26, 32, [[0, 8, 20], [0, 0.5, 0]], [[0, 11, 24], [0, 0, -2]]],
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

function keyed(keys, t) {
  let i = 0
  while (i < keys.length - 2 && keys[i + 1][0] <= t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const k = seg(t, a[0], b[0])
  return { x: mix(a[1], b[1], k), z: mix(a[2], b[2], k), rotY: mix(a[3], b[3], Math.min(1, k * 2)) }
}

const G_KEYS = [
  [0, 0, 14, Math.PI],
  [8, 1.5, 6, Math.PI - 0.4],
  [15, 12, -2, Math.PI],
  [24, 1.5, 5.5, Math.PI - 0.3],
  [32, 1.5, 5.5, Math.PI - 0.3],
]
const E_KEYS = [
  [0, -1, 14.2, Math.PI],
  [8, -0.5, 6.2, Math.PI],
  [15, 10.5, -1.5, 0.2],
  [24, -0.4, 5.8, Math.PI],
  [32, -0.4, 5.8, Math.PI],
]

function GridShadow({ tRef }) {
  const g = useRef()
  useFrame(() => {
    const t = tRef.current
    g.current.visible = t >= 15 && t < 24
    const u = smooth(seg(t, 15, 22))
    g.current.position.set(mix(12, 13, u), 5, mix(-4, -3, u))
  })
  return (
    <group ref={g}>
      {[-1, 0, 1].map((i) =>
        [-1, 0, 1].map((j) => (
          <mesh key={`${i}-${j}`} position={[i * 0.85, 0, j * 0.85]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.8]} />
            <meshStandardMaterial color="#506090" emissive="#88a0ff" emissiveIntensity={i === 1 && j === 1 ? 1.2 : 0.2} transparent opacity={0.5} toneMapped={false} />
          </mesh>
        )),
      )}
    </group>
  )
}

export default function PushForwardMovie({ tRef }) {
  const gyroScript = () => {
    const k = keyed(G_KEYS, tRef.current)
    return { pos: [k.x / S, 0, k.z / S], rotY: k.rotY, run: 0, cast: 0, loop: 0, loopDrop: 0 }
  }
  const emmyScript = () => {
    const k = keyed(E_KEYS, tRef.current)
    const t = tRef.current
    return { pos: [k.x / S, 0, k.z / S], rotY: k.rotY, walk: 0, gesture: t > 8 && t < 20 ? 0.8 : 0, talk: t > 8 && t < 20 ? 1 : 0, bow: 0 }
  }
  return (
    <>
      <color attach="background" args={['#120818']} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 12, -10]} intensity={1.1} />
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      {SITES.filter((s) => s.stage).map((s) => (
        <mesh key={s.id} position={[s.pos[0], 0.05, s.pos[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[s.def.add[0].r, 32]} />
          <meshStandardMaterial color="#2a2420" />
        </mesh>
      ))}
      {TWO && (
        <>
          <mesh position={[TWO.pos[0], 0.15, TWO.pos[1]]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[4.2, 0.12, 8, 48]} />
            <meshStandardMaterial color="#ffb347" emissive="#ffd27a" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
          <mesh position={[TWO.pos[0], 0.15, TWO.pos[1]]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.1, 0.08, 8, 40]} />
            <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={1} toneMapped={false} />
          </mesh>
        </>
      )}
      <GridShadow tRef={tRef} />
      <group scale={S}>
        <Gyroid script={gyroScript} />
        <Emmy script={emmyScript} />
      </group>
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.2} />
        <Vignette eskil={false} offset={0.12} darkness={0.65} />
      </EffectComposer>
    </>
  )
}
