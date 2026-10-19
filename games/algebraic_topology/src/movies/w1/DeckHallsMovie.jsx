import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'

/**
 * Intro movie World 1 · Level 10 (videos.json level-1-10-intro).
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

const SHOTS = [
  [0, 8, [[0, 9, 14], [0, 0, 0]], [[0, 6, 10], [0, 0, 0]]],
  [8, 15, [[2.5, 4.5, 6], [0, 0.5, 0]], [[1.8, 3.8, 5.2], [0, 0.4, 0]]],
  [15, 24, [[0, 3.2, 8], [0, 1.2, 0]], [[0, 2.8, 6.5], [0, 1, 0]]],
  [24, 26, [[0, 2.4, 5], [0, 0.8, 0]], [[0, 2.2, 4.5], [0, 0.7, 0]]],
  [26, 32, [[-2, 3.5, 7], [0, 0.6, 0]], [[-1.2, 3.2, 6], [0, 0.6, 0]]],
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

function CarouselFloors({ tRef }) {
  const g = useRef()
  useFrame(() => {
    const t = tRef.current
    g.current.rotation.y = t * 0.25
  })
  return (
    <group ref={g}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 32]} />
          <meshStandardMaterial color="#1a2838" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export default function DeckHallsMovie({ tRef }) {
  const wheel = useRef()
  useFrame(() => {
    wheel.current.rotation.y = tRef.current * 0.6
  })
  return (
    <>
      <color attach="background" args={['#060912']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 12, 4]} intensity={0.9} />
      <MovieCamera tRef={tRef} />
      <CarouselFloors tRef={tRef} />
      <group ref={wheel} position={[0, 0.5, 0]}>
        <mesh>
          <torusGeometry args={[0.7, 0.14, 8, 32]} />
          <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[2.5, 24, 18]} />
        <meshStandardMaterial color="#182030" transparent opacity={0.35} />
      </mesh>
      {[[0, -2.4], [0, 2.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.2, z]}>
          <boxGeometry args={[0.8, 1.6, 0.15]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      <group scale={S} position={[-1.2, 0, 1.8]}>
        <Gyroid script={() => ({ pos: [0, 0, 0], rotY: 0.4, walk: tRef.current > 8 && tRef.current < 20 ? 0.6 : 0, face: 0.4 })} />
      </group>
      <group scale={S} position={[1.4, 0, -1.2]}>
        <Emmy script={() => ({ pos: [0, 0, 0], rotY: -0.5, walk: 0, gesture: tRef.current > 8 && tRef.current < 14 ? 0.9 : 0, talk: 0, bow: 0 })} />
      </group>
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} intensity={0.8} />
        <Vignette offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
