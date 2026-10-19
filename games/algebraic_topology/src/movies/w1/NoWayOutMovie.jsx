import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import CountNull from '../../characters/CountNull'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import { circleLoop } from '../../levels/w1/brouwer'
import layout from '../../world/basin.json'
import { buildSites } from '../../world/sites'

/**
 * Intro: level-1-4-intro — Brouwer's Basin / Retractor seizes.
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const SITES = buildSites(layout)
const RET = SITES.find((s) => s.id === 'retractor')
const [RX, RZ] = RET.pos
const RIM = RET.rimRadius

const SHOTS = [
  [0, 8, [[RX + 6, 9, RZ + 10], [RX, 0, RZ]], [[RX + 2, 7, RZ + 6], [RX, 0, RZ]]],
  [8, 16, [[RX + 4, 6, RZ + 5], [RX, 1.5, RZ]], [[RX + 3, 5.5, RZ + 4], [RX, 1.2, RZ]]],
  [16, 26, [[RX - 3, 4, RZ + 5], [RX, 0.5, RZ]], [[RX - 1, 3.5, RZ + 4.5], [RX, 0.4, RZ]]],
  [26, 30, [[RX - 5, 5, RZ - 2], [RX + 0.3, 0, RZ - 0.2]], [[RX - 4, 4.5, RZ - 1], [RX + 0.3, 0, RZ - 0.2]]],
  [30, 36, [[RX - 2, 3.5, RZ + 7], [RX + 5, 0.5, RZ - 4]], [[RX - 1, 4.2, RZ + 8], [RX + 6, 0.5, RZ - 30]]],
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

function RimLoop({ t, seized }) {
  const loop = useMemo(() => circleLoop(RX, RZ, RIM, 72), [])
  const kShrink = smooth(seg(t, 18, 24))
  const pts = loop.map(([x, z], i) => {
    const u = i / loop.length
    const cx = RX + (x - RX) * (1 - kShrink * 0.92)
    const cz = RZ + (z - RZ) * (1 - kShrink * 0.92)
    return [cx, 0.25, cz]
  })
  const flat = new Float32Array(pts.flat())
  return (
    <group>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={pts.length} array={flat} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={seized ? '#8060d0' : '#ffcf6a'} />
      </line>
      <mesh position={[RX, 1.2, RZ]}>
        <boxGeometry args={[2.6, 2.2, 2]} />
        <meshStandardMaterial color="#1a1028" emissive="#8060d0" emissiveIntensity={seized ? 0.25 : 1.4} />
      </mesh>
    </group>
  )
}

export default function NoWayOutMovie({ tRef }) {
  const stage = useStage(tRef, (t) => ({ seized: t >= 22.5, nullOn: t >= 8 && t < 16 }))
  const gy = useRef()
  useFrame(() => {
    const t = tRef.current
    const k = smooth(seg(t, 16, 24))
    const a = (t * 0.35) % (Math.PI * 2)
    gy.current.position.set(RX + RIM * Math.cos(a) * (1 - k * 0.15), 0, RZ + RIM * Math.sin(a) * (1 - k * 0.15))
    gy.current.rotation.y = -a
  })
  const emmyScript = () => ({
    pos: [(RX - 2.8) / S, 0, (RZ + 3.2) / S],
    rotY: 0.5,
    walk: 0,
    gesture: tRef.current > 20 ? 0.85 : 0,
    talk: tRef.current > 20 && tRef.current < 26 ? 1 : 0,
    bow: 0,
  })
  const nullScript = () => ({
    pos: [(RX + 1.2) / S, 1.8, (RZ - 0.5) / S],
    rotY: -0.4,
    talk: stage.nullOn ? 1 : 0,
    visible: stage.nullOn,
  })
  return (
    <>
      <color attach="background" args={['#120818']} />
      <fog attach="fog" args={['#120818', 22, 55]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 12, 6]} intensity={1} color="#e0c0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[RX, 0, RZ]}>
        <circleGeometry args={[5.2, 48]} />
        <meshStandardMaterial color="#4a4a55" roughness={0.9} />
      </mesh>
      <RimLoop t={tRef.current} seized={stage.seized} />
      <group scale={S} ref={gy}>
        <Gyroid script={() => ({ pos: [0, 0, 0], rotY: 0.3, run: 0, cast: 0, loop: 0, loopDrop: 0 })} />
      </group>
      <group scale={S}>
        <Emmy script={emmyScript} />
        <CountNull script={nullScript} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.58} />
        <Vignette offset={0.3} darkness={0.62} />
      </EffectComposer>
    </>
  )
}
