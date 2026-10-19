import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { StacksSky } from '../../levels/w1/SheetMusicScene'

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k)

/** level-1-9-intro scenes A–E (design/world-1.json). */
const SHOTS = [
  [0, 8, [[8, 9, 22], [0, 0, 4]], [[2, 7, 14], [-2, 0, 0]]],
  [8, 15, [[-1, 6, 10], [0, 0, 0]], [[0.5, 5.5, 8], [0, 0, -1]]],
  [15, 24, [[6, 8, 6], [2, 0, -4]], [[4, 7, 2], [0, 0, -8]]],
  [24, 26, [[-3, 5, 2], [0, 0, 0]], [[-2, 4.5, 0], [0, 0, 2]]],
  [26, 32, [[0, 6, 12], [0, 0.5, 0]], [[0, 7, 14], [0, 1, 0]]],
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

export default function SheetMusicMovie({ tRef }) {
  const stage = useStage(tRef, (t) => ({
    tower: t >= 8 && t < 15,
    tree: t >= 15,
    grid: t >= 24,
  }))
  return (
    <>
      <StacksSky />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[14, 32]} />
        <meshStandardMaterial color="#2a3548" />
      </mesh>
      {stage.tower && (
        <group position={[0, 0.4, 0]}>
          {[0, 1].map((i) => (
            <mesh key={i} position={[i * 1.2 - 0.6, i * 0.5, 0]}>
              <boxGeometry args={[2.4, 0.08, 2.4]} />
              <meshStandardMaterial color="#a8e0ff" transparent opacity={0.45} emissive="#88ccff" emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>
      )}
      {stage.tree && (
        <group position={[2, 0.2, -6]}>
          {[
            [0, 0, 4],
            [0.6, 0.2, 2],
            [-0.5, 0.3, 0],
            [1.2, 0.5, -2],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.25, 10, 8]} />
              <meshStandardMaterial color="#ffb347" emissive="#ffb347" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {stage.grid && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2, 1.2, 2]}>
          <planeGeometry args={[6, 6, 6, 6]} />
          <meshStandardMaterial color="#a8e0ff" wireframe emissive="#88ccff" emissiveIntensity={0.8} />
        </mesh>
      )}
      <Gyroid script={() => ({ pos: [-1.2, 0, 2], rotY: 0.4, run: 0.2, cast: 0, loop: 0, loopDrop: 0 })} />
      <Emmy script={() => ({ pos: [-2.2, 0, 1.2], rotY: 0.5, walk: 0, gesture: tRef.current > 8 ? 0.7 : 0, talk: tRef.current > 8 && tRef.current < 24, bow: 0 })} scale={0.7} />
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} intensity={0.8} />
        <Vignette eskil={false} offset={0.22} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
