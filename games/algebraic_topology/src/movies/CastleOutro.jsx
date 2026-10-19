import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import CountNull from '../characters/CountNull'
import Emmy from '../characters/Emmy'
import Gyroid from '../characters/Gyroid'
import { LiveLine } from '../levels/w0/FlatsScenery'
import { DevAdvance } from '../levels/w0/OverworldScene'
import { NULL_AT } from '../levels/w0/stagesCastle'
import CastleSet, { TOP } from './CastleSet'

/**
 * Outro movie for World 0 · Castle, "A Ring Is a Ring" (videos.json castle-0-outro):
 *   A 0–8    the arena still; Null lifts a glowing ring
 *   B 8–16   on the floor, a loop round a hole tries to shrink — every slide stops at the hole
 *   C 16–24  Null steps back off the spire onto a violet ribbon of light racing north
 *   D 24–32  dawn at the bridgehead: Emmy and Gyroid look north
 *   E 32–38  “World 0 complete”
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]
const HOLE = [0, -1.5] // the hole on the arena floor (B)
const EDGE = [NULL_AT[0] + 0.5, NULL_AT[1] - 1.8] // where Null steps off

const SHOTS = [
  [0, 8, [[1.2, TOP + 2.2, NULL_AT[1] + 4.2], [NULL_AT[0], TOP + 2.0, NULL_AT[1]]], [[0.6, TOP + 2.1, NULL_AT[1] + 3.4], [NULL_AT[0], TOP + 2.2, NULL_AT[1]]]],
  [8, 16, [[0, TOP + 5.5, HOLE[1] + 5.5], [HOLE[0], TOP, HOLE[1]]], [[1, TOP + 4.6, HOLE[1] + 4.4], [HOLE[0], TOP, HOLE[1]]]],
  [16, 24, [[4, TOP + 3, 2], [EDGE[0], TOP + 1.5, EDGE[1]]], [[6, TOP + 5, 8], [0, TOP + 4, -40]]],
  [24, 32, [[4.6, 1.7, 28.6], [-0.2, 1.1, 26.4]], [[4.2, 2.4, 30.5], [-2, 5, -20]]],
  [32, 40, [[0, 6, 36], [0, 6, -10]], [[0, 7, 38], [0, 7, -10]]],
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

export default function CastleOutro({ tRef }) {
  const ring = useRef()
  const nullG = useRef()
  const dawn = useRef()
  const sun = useRef()
  // B: the loop round the hole: it shrinks toward the hole and stalls at its rim, again and again
  const loopPts = () => {
    const t = tRef.current
    if (t < 8 || t > 16.2) return null
    const u = ((t - 8) % 2.6) / 2.6
    const r = 0.62 + 1.1 * (1 - Math.sin(Math.PI * Math.min(1, u * 1.4)))
    const wob = 0.12 * Math.sin(t * 3)
    return Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2
      const rr = r + wob * Math.sin(3 * a)
      return [HOLE[0] + rr * Math.cos(a), HOLE[1] + rr * Math.sin(a), TOP + 0.12]
    })
  }
  // C: Null's ribbon of light, racing north
  const ribbon = () => {
    const t = tRef.current
    if (t < 17.6 || t > 24) return null
    const k = seg(t, 17.6, 22.5)
    const n = 40
    return Array.from({ length: n }, (_, i) => {
      const s = (i / (n - 1)) * k
      return [EDGE[0] + Math.sin(s * 3) * 3, EDGE[1] - s * 60, TOP + 0.5 + s * 6 + Math.sin(s * 8) * 0.6]
    })
  }
  useFrame(() => {
    const t = tRef.current
    ring.current.visible = t > 1.5 && t < 16.4
    ring.current.rotation.y = t * 0.9
    // C: Null walks back off the edge and is carried away
    const back = smooth(seg(t, 16.4, 17.8))
    const fly = smooth(seg(t, 17.8, 22))
    const x = mix(NULL_AT[0], EDGE[0], back) + Math.sin(fly * 3) * 3
    const z = mix(NULL_AT[1], EDGE[1], back) - fly * 60
    nullG.current.position.set(x, TOP + 0.3 + fly * 6, z)
    nullG.current.visible = t < 22.6
    dawn.current.intensity = t > 24 ? 2.2 : 0
    sun.current.visible = t > 24
    sun.current.position.y = 2 + seg(t, 24, 32) * 5
  })
  const nullScript = () => {
    const t = tRef.current
    return { gesture: t < 16 ? 1 : 0.3, crown: 1, crownY: 0 }
  }
  const gyroScript = () => {
    const t = tRef.current
    if (t >= 24) return { pos: [0.9 / S, 0, 26.6 / S], rotY: Math.PI, run: 0, cast: 0, whip: 0, loop: 0, loopDrop: 0 }
    return { pos: [(HOLE[0] + 1.6) / S, TOP / S, (HOLE[1] + 2.4) / S], rotY: Math.PI + 0.5, run: 0, cast: t > 8 && t < 16 ? 0.8 : 0, whip: 0, loop: 0, loopDrop: 0 }
  }
  const emmyScript = () => ({ pos: [-0.8 / S, 0, 26.4 / S], rotY: Math.PI, walk: 0, bow: 0, gesture: tRef.current > 24.4 ? 0.6 : 0, talk: tRef.current > 24.4 && tRef.current < 28.6 ? 1 : 0 })
  return (
    <>
      <CastleSet />
      <mesh ref={sun} position={[-25, 3, -70]}>
        <sphereGeometry args={[6, 32, 20]} />
        <meshBasicMaterial color="#ffb070" toneMapped={false} />
      </mesh>
      <directionalLight ref={dawn} position={[30, 8, -20]} color="#ffb88a" intensity={0} />
      <group ref={nullG} scale={0.8}>
        <CountNull script={nullScript} />
        <group ref={ring} position={[0.45, 2.1, 0.5]}>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.32, 0.04, 10, 40]} />
            <meshBasicMaterial color="#ffd27a" toneMapped={false} />
          </mesh>
        </group>
      </group>
      {/* B: a hole in the arena floor, and a loop that won't shrink past it */}
      <mesh position={[HOLE[0], TOP + 0.08, HOLE[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 40]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <LiveLine getPts={loopPts} color="#ffd27a" width={7} />
      <LiveLine getPts={ribbon} color="#c58bff" width={10} />
      <group scale={S}>
        <Gyroid script={gyroScript} />
        <Emmy script={emmyScript} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.6} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.72} />
      </EffectComposer>
    </>
  )
}
