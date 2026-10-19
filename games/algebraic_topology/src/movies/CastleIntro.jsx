import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import CountNull from '../characters/CountNull'
import Emmy from '../characters/Emmy'
import Gyroid from '../characters/Gyroid'
import { ShardSpawn } from '../characters/Spawn'
import { DevAdvance } from '../levels/w0/OverworldScene'
import { NULL_AT, PANELS } from '../levels/w0/stagesCastle'
import CastleSet, { TOP, stairAt } from './CastleSet'

/**
 * Intro movie for World 0 · Castle, "The Hollow Throne" (videos.json castle-0-intro):
 *   A 0–7    Gyroid runs the gold-seamed bridge to the black spire; Emmy stays at the bridgehead
 *   B 7–13   the spiral stair round the spire, the sea falling away
 *   C 13–22  the throne room: the floor ripples; Null before the empty throne, the Crown above
 *   D 22–30  three violet sigils light in the floor; Crown shards begin to orbit
 *   E 30–34  title card
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const SHOTS = [
  [0, 7, [[3.5, 2.2, 30], [0, 1.2, 22]], [[2.5, 3.5, 14], [0, 6, -2]]],
  [7, 13, null, null], // B: orbits with Gyroid up the stair (below)
  [13, 22, [[0, TOP + 3.2, 10], [NULL_AT[0], TOP + 1.6, NULL_AT[1]]], [[1.5, TOP + 2.6, 2.5], [NULL_AT[0], TOP + 1.8, NULL_AT[1]]]],
  [22, 30, [[0, TOP + 11, 11], [0, TOP, -1]], [[0, TOP + 12.5, 12], [0, TOP, -1.5]]],
  [30, 40, [[0, TOP + 8, 15], [0, TOP + 1, -3]], [[0, TOP + 10, 18], [0, TOP + 1, -3]]],
]
const climbY = (t) => smooth(seg(t, 7, 13)) * TOP
function MovieCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const sh = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1]
    if (!sh[2]) {
      const y = climbY(t)
      const [x, , z, a] = stairAt(Math.max(0.3, y))
      camera.position.set(Math.cos(a - 0.5) * 11, y + 3.5, Math.sin(a - 0.5) * 11)
      look.set(x, y + 0.8, z)
    } else {
      const k = smooth(seg(t, sh[0], sh[1]))
      camera.position.set(...mix3(sh[2][0], sh[3][0], k))
      look.set(...mix3(sh[2][1], sh[3][1], k))
    }
    camera.lookAt(look)
  })
  return null
}

export default function CastleIntro({ tRef }) {
  const sigils = useRef()
  const shardG = useRef()
  const shards = useMemo(() => [0, 1, 2, 3, 4].map((i) => ({ x: 0, z: 0, seed: i, alive: true, dying: 0, face: 0, flash: 0 })), [])
  useFrame(() => {
    const t = tRef.current
    sigils.current.children.forEach((m, i) => {
      const k = seg(t, 22.6 + i * 0.5, 23.4 + i * 0.5)
      m.visible = k > 0
      m.material.opacity = k
    })
    const on = t > 24
    shardG.current.visible = on
    shards.forEach((e, i) => {
      const a = t * 1.4 + (i / 5) * Math.PI * 2
      e.x = NULL_AT[0] + Math.cos(a) * 2.6
      e.z = NULL_AT[1] + Math.sin(a) * 2.6
      e.face = a
    })
  })
  const gyroScript = () => {
    const t = tRef.current
    if (t < 7) {
      const k = seg(t, 0, 7)
      return { pos: [0, 0, mix(25, 4.6, k) / S], rotY: Math.PI, run: 1, cast: 0, whip: 0, loop: 0, loopDrop: 0 }
    }
    if (t < 13) {
      const y = climbY(t)
      const [x, , z, a] = stairAt(Math.max(0.3, y))
      return { pos: [x / S, y / S, z / S], rotY: -a + Math.PI, run: 1, cast: 0, whip: 0, loop: 0, loopDrop: 0 }
    }
    const k = smooth(seg(t, 13, 16))
    return { pos: [0, TOP / S, mix(7.6, 4.2, k) / S], rotY: Math.PI, run: k > 0 && k < 1 ? 0.7 : 0, cast: t > 26.4 ? 0.7 : 0, whip: 0, loop: 0, loopDrop: 0 }
  }
  const emmyScript = () => ({ pos: [0.9 / S, 0, 26.2 / S], rotY: Math.PI, walk: 0, bow: 0, gesture: tRef.current < 5 ? 0.8 : 0, talk: tRef.current > 0.6 && tRef.current < 4.6 ? 1 : 0 })
  const nullScript = () => {
    const t = tRef.current
    return { gesture: (t > 13.6 && t < 18) || t > 22.4 ? 1 : 0.2, crown: 0.5 + seg(t, 22.4, 23.4) * 0.5, crownY: 0 }
  }
  return (
    <>
      <CastleSet />
      <group position={[NULL_AT[0], TOP + 0.3, NULL_AT[1]]} scale={0.8}>
        <CountNull script={nullScript} />
      </group>
      <group ref={sigils} position={[0, TOP + 0.06, 0]}>
        {PANELS.map((p, i) => (
          <mesh key={i} position={[p[0], 0, p[1]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.5, 2.0, 6]} />
            <meshBasicMaterial color="#b070ff" transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <group ref={shardG} position={[0, TOP + 1.2, 0]}>
        {shards.map((e, i) => (
          <ShardSpawn key={i} e={e} />
        ))}
      </group>
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
