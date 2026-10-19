import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { Platform } from '../../levels/w0/FoundryScene'
import layout from '../../world/freewordforge.json'
import { buildSites } from '../../world/sites'

/** Intro: level-1-6-intro "Laps Are Letters" (design/world-1.json). */
const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

const HUB = buildSites(layout).find((s) => s.id === 'laps_letters')
const [HX, HZ] = HUB.pos

const SHOTS = [
  [0, 8, [[HX + 2, 8, HZ + 10], [HX, 0, HZ]], [[HX - 1, 6.5, HZ + 7], [HX, 0, HZ]]],
  [8, 16, [[HX + 3, 5, HZ + 6], [HX + 0.5, 0.5, HZ + 0.5]], [[HX + 2.2, 4.2, HZ + 5], [HX, 0, HZ]]],
  [16, 24, [[HX - 3, 4, HZ - 2], [HX, 0, HZ - 3]], [[HX - 2, 3.5, HZ - 1], [HX, 0, HZ]]],
  [24, 32, [[HX - 2.5, 5, HZ + 7], [HX, 0.5, HZ]], [[HX - 1.5, 6, HZ + 8], [HX, 0.5, HZ]]],
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

function BeadTape({ tRef }) {
  const g = useRef()
  useFrame(() => {
    const t = tRef.current
    const n = t < 12 ? 1 : t < 14 ? 2 : t < 16 ? 0 : 4
    g.current.visible = n > 0
    g.current.position.set(HX + 0.3, 2.1, HZ + 0.2)
    g.current.children.forEach((c, i) => {
      c.visible = i < n
    })
  })
  return (
    <group ref={g}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[i * 0.22 - 0.33, 0, 0]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshBasicMaterial color={i % 2 ? '#8060d0' : '#e04040'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function FreeWordMovie({ tRef }) {
  const [snap, setSnap] = useState(false)
  useFrame(() => {
    const t = tRef.current
    if (t > 13.2 && t < 13.5 && !snap) setSnap(true)
    if (t < 12) setSnap(false)
  })
  const gy = () => {
    const t = tRef.current
    return {
      pos: [(HX + 0.8) / S, 0, (HZ + 1.2) / S],
      rotY: -0.4,
      walk: t > 8 && t < 15 ? 1 : 0,
      gesture: t > 16 && t < 24 ? 0.8 : 0,
      talk: 0,
      bow: 0,
    }
  }
  const em = () => {
    const t = tRef.current
    return {
      pos: [(HX - 2.8) / S, 0, (HZ + 2.2) / S],
      rotY: 0.5,
      walk: 0,
      gesture: t > 24 ? 0.9 : 0,
      talk: t > 24 && t < 28 ? 1 : 0,
      bow: 0,
    }
  }
  return (
    <>
      <color attach="background" args={['#080a12']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-6, 12, 8]} intensity={0.9} color="#ffe2c4" />
      <Platform site={HUB} lit current />
      <BeadTape tRef={tRef} />
      {snap && (
        <mesh position={[HX + 0.5, 2.1, HZ + 0.5]}>
          <ringGeometry args={[0.2, 0.35, 16]} />
          <meshBasicMaterial color="#fff2c4" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      )}
      <group scale={S}>
        <Gyroid script={gy} />
        <Emmy script={em} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.4} intensity={0.5} />
        <Vignette offset={0.25} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
