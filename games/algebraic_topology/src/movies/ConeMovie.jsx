import { useFrame, useThree } from '@react-three/fiber'
import { Html, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import CountNull from '../characters/CountNull'
import Emmy from '../characters/Emmy'
import Gyroid from '../characters/Gyroid'
import { ConerSpawn } from '../characters/Spawn'
import { DevAdvance } from '../levels/w0/OverworldScene'
import SpaceModel from '../levels/w0/SpaceModel'
import { CausewaySlab } from '../world/ReefScenery'
import layout from '../world/conezone.json'

/**
 * Intro movie for World 0 · Level 5, "Null's Plugs" (videos.json level-0-5-intro):
 *   A 0–7    the moonlit terrace; Coners hover over a glowing ring and beam it
 *   B 7–14   the ring is a cone now — the hole is filled; Null admires his "completion"
 *   C 14–24  Emmy walks the row: a cone, a suspension, a wedge, a product
 *   D 24–28  the Coners turn on Gyroid; he readies the Lash
 *   E 28–32  wide over the terrace; title card
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const RING = [0, 7] // the ring being plugged, on the Cone Works
const ROW_Z = 9.7
const ROW = [
  { x: -3, kind: 'cone_circle', via: 'cone', t: 18.9, label: 'cone' },
  { x: -1, kind: 'sphere', via: 'suspension', t: 20.0, label: 'suspension' },
  { x: 1, kind: 'eight', via: 'wedge', t: 21.2, label: 'wedge' },
  { x: 3, kind: 'torus', via: 'product', t: 22.4, label: 'product' },
]
const NULL_AT = [3.2, 4.4]

const SHOTS = [
  [0, 7, [[0, 3.2, 19.5], [0, 1.0, 8]], [[0.4, 2.6, 13.4], [0, 1.1, 7]]],
  [7, 14, [[2.2, 2.0, 10.6], [0.2, 1.0, 7]], [[1.0, 3.0, 13.0], [1.7, 1.5, 5.6]]],
  [14, 24, [[-1.2, 3.4, 14.6], [-1.6, 1.0, ROW_Z]], [[1.2, 3.4, 14.6], [1.6, 1.0, ROW_Z]]],
  [24, 28, [[-2.6, 2.0, 14.8], [0.4, 1.0, 10.6]], [[-2.2, 1.8, 14.0], [0.5, 1.1, 10.8]]],
  [28, 40, [[0, 6, 20.5], [0, 0.6, 4]], [[0, 10, 25], [0, 0, -1]]],
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

// blocking: [t, x, z, rotY]
const GYROID_KEYS = [
  [0, 0.6, 16.4, Math.PI],
  [6, 0.6, 11.4, Math.PI],
  [14, 0.6, 11.4, Math.PI],
  [15.5, 4.9, 11.6, Math.PI - 0.5],
  [24, 4.9, 11.6, Math.PI - 0.5],
  [25, 0.6, 11.2, Math.PI],
  [40, 0.6, 11.2, Math.PI],
]
const EMMY_KEYS = [
  [0, -0.6, 16.6, Math.PI],
  [6.2, -0.7, 11.6, Math.PI],
  [14, -0.7, 11.6, Math.PI],
  [16.5, -3.6, ROW_Z - 1.2, 0],
  [18.8, -3.6, ROW_Z - 1.2, 0],
  [23.6, 3.6, ROW_Z - 1.2, 0],
  [25, 3.6, ROW_Z - 1.2, 0],
  [40, 3.6, ROW_Z - 1.2, -0.6],
]
function keyed(keys, t) {
  let i = 0
  while (i < keys.length - 2 && keys[i + 1][0] <= t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const k = seg(t, a[0], b[0])
  const moving = Math.hypot(b[1] - a[1], b[2] - a[2]) > 0.05 && k > 0 && k < 1
  return { x: mix(a[1], b[1], k), z: mix(a[2], b[2], k), rotY: mix(a[3], b[3], Math.min(1, k * 2)), moving }
}

function Pedestal({ at, glow = '#ffd27a' }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.42, 0.52, 0.72, 8]} />
        <meshStandardMaterial color="#34303a" roughness={0.6} metalness={0.25} flatShading />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.06, 24]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** One of Emmy's four demonstrations: it is born when its time comes. */
function RowModel({ item, tRef }) {
  const g = useRef()
  const k = useRef(0)
  useFrame(() => {
    const t = tRef.current
    k.current = smooth(seg(t, item.t, item.t + 1.4))
    g.current.visible = t >= item.t && t < 28.5
  })
  return (
    <group ref={g} position={[item.x, 0.78, ROW_Z]} scale={0.95}>
      <SpaceModel kind={item.kind} via={item.via} kRef={k} />
      <Html position={[0, -0.1, 0.7]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="space-tag">{item.label}</div>
      </Html>
    </group>
  )
}

export default function ConeMovie({ tRef }) {
  const kCone = useRef(0)
  const ringG = useRef()
  const violet = useRef()
  const nullG = useRef()
  const nullLight = useRef()
  const rowG = useRef()
  // three Coners: one beams the ring, two circle it; in D they turn on Gyroid
  const coners = useMemo(
    () =>
      [0, 1, 2].map((i) => ({ x: RING[0], z: RING[1], seed: i * 1.7, alive: true, dying: 0, face: 0, flash: 0, beam: 0, type: 'coner' })),
    [],
  )
  useFrame(() => {
    const t = tRef.current
    kCone.current = smooth(seg(t, 3, 6.8))
    coners.forEach((e, i) => {
      if (t < 24) {
        if (i === 0 && t < 6.8) {
          e.x = RING[0]
          e.z = RING[1]
          e.beam = t > 1.5 ? Math.max(0.01, 2.6 * (1 - seg(t, 1.5, 6.8))) : 0
        } else {
          // circling; the beamer joins them once the plug is done
          const a = t * 0.7 + (i * Math.PI * 2) / 3
          const r = i === 0 ? 2.6 * smooth(seg(t, 6.8, 8.5)) : 2.6
          e.x = RING[0] + Math.cos(a) * r
          e.z = RING[1] - 0.6 + Math.sin(a) * r * 0.7
          e.beam = 0
        }
        e.face = Math.atan2(0.6 - e.x, 11.2 - e.z)
      } else {
        // D: they drift toward Gyroid
        const k = smooth(seg(t, 24, 27.5))
        const a0 = 24 * 0.7 + (i * Math.PI * 2) / 3
        const home = [RING[0] + Math.cos(a0) * 2.6, RING[1] - 0.6 + Math.sin(a0) * 1.8]
        e.x = mix(home[0], 0.6 + (i - 1) * 1.1, k * 0.8)
        e.z = mix(home[1], 10.4, k * 0.8)
        e.beam = 0
        e.face = Math.atan2(0.6 - e.x, 11.2 - e.z)
      }
    })
    // B: the plugged ring pulses violet; Null appears behind it
    const pulse = t > 6.8 && t < 14 ? 0.5 + 0.5 * Math.sin(t * 5) : 0
    violet.current.intensity = pulse * 18
    const nv = seg(t, 10.2, 10.9) * (1 - seg(t, 13.8, 14.4))
    nullG.current.visible = nv > 0.01
    nullG.current.scale.setScalar(S * (0.6 + 0.4 * nv))
    nullLight.current.intensity = nv * 30
    ringG.current.visible = t < 14.2 || t >= 28
    // C: Emmy's row rises out of the terrace (it isn't there before, so it can't block the ring)
    const up = smooth(seg(t, 14.2, 16.4))
    rowG.current.visible = t >= 14.2 && t < 28.5
    rowG.current.position.y = (up - 1) * 1.2
  })
  const nullScript = () => {
    const t = tRef.current
    return { gesture: t > 10.8 && t < 13.6 ? 1 : 0.15, crown: 0.4 + seg(t, 10.4, 11.2) * 0.6, crownY: 0 }
  }
  const emmyScript = () => {
    const t = tRef.current
    const e = keyed(EMMY_KEYS, t)
    return {
      pos: [e.x / S, 0, e.z / S],
      rotY: e.rotY,
      walk: e.moving ? 1 : 0,
      bow: 0,
      gesture: (t > 14.4 && t < 23.6) || t > 27.6 ? 0.8 : 0,
      talk: (t > 5 && t < 10.4) || (t > 14.4 && t < 23.6) || t > 27.6 ? 1 : 0,
    }
  }
  const gyroScript = () => {
    const t = tRef.current
    const g = keyed(GYROID_KEYS, t)
    return { pos: [g.x / S, 0, g.z / S], rotY: g.rotY, run: g.moving ? 0.6 : 0, cast: t > 25 ? 0.6 : 0, whip: 0, loop: 0, loopDrop: 0 }
  }
  const sites = layout.sites.filter((s) => s.stage === 'station')
  return (
    <>
      <color attach="background" args={['#070b16']} />
      <fog attach="fog" args={['#070b16', 22, 60]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#9ab8ff', '#0a0a14', 0.5]} />
      <directionalLight position={[-12, 20, -14]} intensity={1.0} color="#cfe0ff" />
      <pointLight position={[0, 5, 9]} intensity={12} distance={22} color="#ffc070" />
      <Stars radius={90} depth={40} count={1600} factor={2.6} fade speed={0.3} />
      <mesh position={[-30, 26, -58]}>
        <sphereGeometry args={[4, 32, 20]} />
        <meshBasicMaterial color="#f3f0dc" toneMapped={false} />
      </mesh>
      <Sparkles count={140} scale={[36, 5, 40]} position={[0, 1.5, 0]} size={2.2} speed={0.4} color="#ffe2a0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7, -4]}>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color="#0b1a33" roughness={0.3} metalness={0.4} emissive="#06142a" emissiveIntensity={0.6} />
      </mesh>
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      <mesh position={[0, -0.32, 16]}>
        <cylinderGeometry args={[1.7, 1.5, 0.6, 32]} />
        <meshStandardMaterial color="#2a2c36" roughness={0.6} />
      </mesh>
      {sites.map((s) => (
        <group key={s.id} position={[s.pos[0], 0, s.pos[1]]}>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[5.4, 5.0, 0.6, 48]} />
            <meshStandardMaterial color="#2a2c36" roughness={0.6} metalness={0.15} />
          </mesh>
          <mesh position={[0, -4, 0]}>
            <cylinderGeometry args={[3, 1.9, 7, 20]} />
            <meshStandardMaterial color="#1a1a22" roughness={0.9} flatShading />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[5.28, 5.4, 64]} />
            <meshBasicMaterial color="#d8a84a" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* A–B: the ring being plugged */}
      <group ref={ringG}>
        <Pedestal at={RING} />
        <group position={[RING[0], 0.78, RING[1]]} scale={1.3}>
          <SpaceModel kind="cone_circle" via="cone" kRef={kCone} spin={false} />
        </group>
      </group>
      <pointLight ref={violet} position={[RING[0], 1.8, RING[1]]} color="#a259ff" distance={8} intensity={0} />
      {coners.map((e, i) => (
        <ConerSpawn key={i} e={e} />
      ))}
      <group ref={nullG} position={[NULL_AT[0], 0.2, NULL_AT[1]]} rotation={[0, -0.5, 0]}>
        <CountNull script={nullScript} />
      </group>
      <pointLight ref={nullLight} position={[NULL_AT[0], 2.5, NULL_AT[1] + 1]} distance={10} color="#a259ff" intensity={0} />

      {/* C: Emmy's row of operations */}
      <group ref={rowG}>
        {ROW.map((it) => (
          <group key={it.x}>
            <Pedestal at={[it.x, ROW_Z]} />
            <RowModel item={it} tRef={tRef} />
          </group>
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
