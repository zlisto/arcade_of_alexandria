import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../characters/Emmy'
import Gyroid from '../characters/Gyroid'
import { Hall, Platform, Press } from '../levels/w0/FoundryScene'
import Hologram from '../levels/w0/Hologram'
import { LiveLine } from '../levels/w0/FlatsScenery'
import { DevAdvance } from '../levels/w0/OverworldScene'
import { CausewaySlab } from '../world/ReefScenery'
import layout from '../world/foundry.json'
import { buildSites } from '../world/sites'

/**
 * Intro movie for World 0 · Level 4, "Emmy's Foundry" (videos.json level-0-4-intro):
 *   A 0–7    through the Mirror Gate into the cold Foundry, faintly violet
 *   B 7–14   Emmy stops at the oldest press; her triangle mark glows on its frame
 *   C 14–22  her confession: she built the presses; the memory of them turning violet
 *   D 22–31  she gives Gyroid the Cell-Smith: a point, a loop, a disk; a square folds to a torus
 *   E 31–36  the furnace relights gold; title card
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const SITES = buildSites(layout)
const PRESS = SITES.find((s) => s.id === 'sphere_press')
const [PX, PZ] = PRESS.pos
const SHOTS = [
  [0, 7, [[0, 3.2, 20], [0, 1.4, 8]], [[0, 3.0, 14], [0, 1.4, 4]]],
  [7, 14, [[PX + 3.2, 2.2, PZ + 3.6], [PX - 0.4, 1.6, PZ - 0.9]], [[PX + 2.4, 1.9, PZ + 2.6], [PX - 0.6, 1.7, PZ - 0.9]]],
  // C: in front of Emmy (she faces east, toward the press), close on her face
  [14, 22, [[PX - 0.2, 1.3, PZ + 1.1], [PX - 1.6, 1.0, PZ + 0.5]], [[PX - 0.35, 1.22, PZ + 0.95], [PX - 1.6, 0.98, PZ + 0.5]]],
  [22, 31, [[PX - 0.1, 2.3, PZ + 4.4], [PX - 1.05, 1.6, PZ + 0.5]], [[PX - 0.3, 2.4, PZ + 3.9], [PX - 1.05, 1.8, PZ + 0.5]]],
  [31, 40, [[PX + 0.5, 3.0, PZ + 5.5], [PX, 0.6, PZ]], [[PX, 5.5, PZ + 8], [PX, 0.6, PZ - 1]]],
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

// blocking: [t, x, z, rotY] for each of them; they walk between keys
const GYROID_KEYS = [
  [0, 0.6, 14.5, Math.PI],
  [6.5, 0.6, 8.6, Math.PI],
  [7.5, PX + 0.7, PZ + 1.6, Math.PI + 0.5],
  [22, PX + 0.7, PZ + 1.6, -2.4],
  [24, PX + 0.4, PZ + 1.0, -2.4],
  [31, PX + 0.3, PZ + 0.6, Math.PI],
  [40, PX + 0.3, PZ + 0.6, Math.PI],
]
const EMMY_KEYS = [
  [0, -0.6, 14.8, Math.PI],
  [6.8, -0.6, 8.8, Math.PI],
  [8.5, PX - 1.6, PZ + 0.5, Math.PI - 0.3],
  [22, PX - 1.6, PZ + 0.5, 1.3],
  [40, PX - 1.6, PZ + 0.5, 1.3],
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

export default function FoundryMovie({ tRef }) {
  const slam = useRef(0)
  const kTorus = useRef(0)
  const hub = useRef({ lit: false })
  const violet = useRef()
  const mark = useRef()
  const torus = useRef()
  const relight = useRef()
  const dot = useRef()
  useFrame(() => {
    const t = tRef.current
    // C: the memory — the press flushed violet
    const mem = Math.max(0, Math.min(1, seg(t, 17.5, 18.5) * (1 - seg(t, 21, 22))))
    violet.current.intensity = mem * 40
    mark.current.visible = t > 7.5 && t < 22
    mark.current.material.opacity = 0.5 + 0.4 * Math.sin(t * 3)
    // D: the torus folds above Emmy's palm
    kTorus.current = smooth(seg(t, 26, 30.5))
    torus.current.visible = t > 25.5 && t < 31.5
    dot.current.visible = t > 22.6 && t < 25.6
    // E: the furnace relights
    relight.current.intensity = t > 31.6 ? 14 * smooth(seg(t, 31.6, 32.6)) : 0
    slam.current = t > 31.4 && t < 32 ? 1 - seg(t, 31.4, 32) : 0
    hub.current.lit = t > 31.6
  })
  const emmyScript = () => {
    const t = tRef.current
    const e = keyed(EMMY_KEYS, t)
    return {
      pos: [e.x / S, 0, e.z / S],
      rotY: e.rotY,
      walk: e.moving ? 1 : 0,
      bow: t > 14 && t < 22 ? 1 : 0,
      gesture: t > 22.6 && t < 31.5 ? 1 : 0,
      talk: (t > 14.2 && t < 22) || (t > 22.4 && t < 31) ? 1 : 0,
    }
  }
  const gyroScript = () => {
    const t = tRef.current
    const g = keyed(GYROID_KEYS, t)
    return { pos: [g.x / S, 0, g.z / S], rotY: g.rotY, run: g.moving ? 0.6 : 0, cast: t > 31 ? 0.5 : 0, whip: 0, loop: 0, loopDrop: 0 }
  }
  // D: point → loop → disk, conjured above the palm
  const conj = useMemo(() => [PX - 1.15, 2.0, PZ + 0.6], [])
  const loopPts = () => {
    const t = tRef.current
    if (t < 23.2 || t > 26) return null
    const k = smooth(seg(t, 23.2, 24.4))
    const n = Math.max(2, Math.round(64 * k))
    return Array.from({ length: n }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return [conj[0] + 0.18 * Math.sin(a), conj[2] - 0.18 * (1 - Math.cos(a)), conj[1]]
    })
  }
  return (
    <>
      <Hall layout={layout} />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {SITES.filter((s) => s.stage === 'station').map((s) => (
        <Platform key={s.id} site={s} lit={false} current={false} />
      ))}
      <mesh position={[0, -0.32, 14]}>
        <cylinderGeometry args={[1.7, 1.5, 0.6, 32]} />
        <meshStandardMaterial color="#2a2c36" roughness={0.6} />
      </mesh>
      <Press pos={PRESS.pos} slamRef={slam} />
      {/* Emmy's maker's mark on the press frame */}
      <mesh ref={mark} position={[PX - 1.3, 2.2, PZ - 0.77]}>
        <circleGeometry args={[0.16, 3]} />
        <meshBasicMaterial color="#7fe8dc" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <pointLight ref={violet} position={[PX, 2.5, PZ - 0.5]} color="#a259ff" distance={10} intensity={0} />
      <pointLight ref={relight} position={[PX, 1, PZ]} color="#ffb347" distance={9} intensity={0} />
      <group position={[PX, 2.2, PZ - 0.5]}>
        <Sparkles count={50} scale={[3, 2, 2]} size={4} speed={0.6} color="#c58bff" />
      </group>

      {/* D: the Cell-Smith's lesson, above Emmy's palm */}
      <mesh ref={dot} position={conj}>
        <sphereGeometry args={[0.025, 12, 10]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
      <LiveLine getPts={loopPts} color="#ff9a5a" width={4} />
      <group ref={torus} position={[conj[0], conj[1] + 0.05, conj[2]]} scale={0.22}>
        <Hologram kind="torus" kRef={kTorus} />
      </group>

      <group scale={S}>
        <Gyroid script={gyroScript} />
        <Emmy script={emmyScript} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.6} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.75} />
      </EffectComposer>
    </>
  )
}
