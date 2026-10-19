import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Gyroid from '../characters/Gyroid'
import CountNull from '../characters/CountNull'
import { DevAdvance } from '../levels/w0/OverworldScene'
import FlatsScenery, { LiveLine, Post } from '../levels/w0/FlatsScenery'
import { CausewaySlab } from '../world/ReefScenery'
import layout from '../world/tidewarpFlats.json'

/**
 * Intro movie for World 0 · Level 2, "The Tide Bends Everything" (videos.json
 * level-0-2-intro). Story seconds:
 *   A 0–6    the Spool bridges the broken causeway; Gyroid crosses onto the flats
 *   B 6–14   the tide bends three ribbons, all pinned through one lit middle post
 *   C 14–21  Count Null's image over his pool snaps a ribbon to a point — violet sparks
 *   D 21–28  the tide slowed: a ribbon bends frame by frame, its end post never moving
 *   E 28–32  crane up over the flats; title card
 */

const S = 0.7 // Gyroid's scale, as in the levels
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

// camera shots: [from t, to t, start pos, end pos, start look, end look]
const SHOTS = [
  [0, 6, [-18.6, 3.0, 16.2], [-17.2, 3.6, 14.8], [-22.4, 0.3, 11.3], [-20.2, 0.3, 10.4]],
  [6, 14, [-15, 8, 13], [-2, 8.5, 10], [-8, 0, 1], [0, 0, -2]],
  [14, 21, [9.2, 4.0, 3.4], [10.8, 3.6, 2.0], [13, 1.0, -4.8], [13, 1.0, -5.2]],
  [21, 28, [-2.2, 6.2, 4.2], [-1.6, 5.6, 3.4], [-2.6, 0, -4.0], [-2.4, 0, -4.2]],
  [28, 40, [-1.6, 5.6, 3.4], [0, 24, 22], [-2.4, 0, -4.2], [0, 0, -2]],
]

function MovieCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const sh = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1]
    const k = smooth(seg(t, sh[0], sh[1]))
    camera.position.set(...mix3(sh[2], sh[3], k))
    look.set(...mix3(sh[4], sh[5], k))
    camera.lookAt(look)
  })
  return null
}

// ---- Gyroid's blocking
const E = layout.entry
const onEntry = (x) => [x, E.a[1] + ((E.b[1] - E.a[1]) * (x - E.a[0])) / (E.b[0] - E.a[0])]
const ENTRY_FACE = Math.atan2(E.b[0] - E.a[0], E.b[1] - E.a[1])
const KEYS = [
  // [t, x, z, rotY] — Gyroid walks between keys; run when moving
  [0, ...onEntry(-24.3), ENTRY_FACE],
  [4.9, ...onEntry(-24.3), ENTRY_FACE],
  [6, ...onEntry(-19.6), ENTRY_FACE],
  [6.01, -16.5, 8.4, 2.2],
  [14, -10.5, 4.2, 2.2],
  [14.01, 8.3, -1.3, 2.33],
  [21, 8.3, -1.3, 2.33],
  [21.01, 2.2, -1.0, -2.3],
  [24.4, 0.85, -2.45, -2.3],
  [40, 0.85, -2.45, -2.3],
]
function gyroidAt(t) {
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const k = seg(t, a[0], b[0])
  const moving = Math.hypot(b[1] - a[1], b[2] - a[2]) > 0.05 && b[0] - a[0] > 0.1 && k > 0 && k < 1
  return { x: mix(a[1], b[1], k), z: mix(a[2], b[2], k), rotY: b[0] - a[0] > 0.1 ? mix(a[3], b[3], Math.min(1, k * 3)) : a[3], moving }
}

// ---- the ribbons
const M = [-3, -1.5] // the lit middle post every B ribbon passes through
const B_RIBBONS = [
  [[-9, -1.5], [3, -1.5]],
  [[-3, -7], [-3, 4]],
  [[-7.6, -5.6], [1.6, 2.6]],
]
/** A ribbon from p0 through M to p1, bent by the tide at phase ph (pinned at both ends and at M). */
function tideRibbon(p0, p1, ph, amp, n = 80) {
  const out = []
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1)
    const [a, b, u] = s < 0.5 ? [p0, M, s * 2] : [M, p1, s * 2 - 1]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const L = Math.hypot(dx, dz) || 1
    const d = amp * Math.sin(Math.PI * u) * Math.sin(ph + (s < 0.5 ? 0 : 1.3))
    out.push([a[0] + dx * u - (dz / L) * d, a[1] + dz * u + (dx / L) * d])
  }
  return out
}
// the ribbon Null snaps: just in front of his pool, between Gyroid and Null
const C_RIB = { a: [10, -3.2], b: [15.8, -3.6] }
const NULL_POOL = layout.pools.find((p) => p.zone === 'nulls_snap')
const HOLD = layout.zones.find((z) => z.id === 'hold_posts')
function bentRibbon(a, b, bulge, n = 80) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  return Array.from({ length: n }, (_, i) => {
    const s = i / (n - 1)
    const d = bulge * Math.sin(Math.PI * s)
    return [a[0] + dx * s + (dz / L) * d, a[1] + dz * s - (dx / L) * d]
  })
}

function Scene({ tRef }) {
  const gyroScript = () => {
    const t = tRef.current
    const g = gyroidAt(t)
    return {
      pos: [g.x / S, 0, g.z / S],
      rotY: g.rotY,
      run: g.moving ? 1 : 0,
      cast: t > 1 && t < 4 ? 0.6 : t > 24.6 && t < 28.5 ? 0.45 : 0,
      whip: 0,
      loop: 0,
      loopDrop: 0,
    }
  }
  const nullGroup = useRef()
  const nullFlash = useRef()
  const sparks = useRef()
  const gapSlab = useRef()
  const midPost = useRef()
  const postsB = useRef()
  const postsC = useRef()
  const postsD = useRef()
  const nullScript = () => {
    const t = tRef.current
    return { gesture: t > 17 && t < 19.5 ? 1 : 0.15, crown: 0.4 + seg(t, 16.5, 17.6) * 0.6 * (1 - seg(t, 18.2, 19.5)), crownY: 0 }
  }
  useFrame(() => {
    const t = tRef.current
    // A: the gap's slab rises into place along the Spool thread
    const rise = smooth(seg(t, 3.3, 4.8))
    gapSlab.current.position.y = mix(-1.6, 0, rise)
    gapSlab.current.visible = rise > 0
    // each scene shows only its own posts
    postsB.current.visible = t > 5.5 && t < 14.3
    postsC.current.visible = t > 13.9 && t < 21.3
    postsD.current.visible = t > 20.9
    // B: the middle post glows
    midPost.current.material.opacity = t > 6 && t < 14 ? 0.55 + Math.sin(t * 4) * 0.2 : 0
    // C: Null appears in a violet flash
    const appear = smooth(seg(t, 14.4, 15.4))
    nullGroup.current.visible = t > 14.3 && t < 22
    nullGroup.current.scale.setScalar(0.6 * Math.max(0.01, appear))
    nullFlash.current.intensity = t > 14.3 && t < 22 ? 8 + 40 * Math.max(0, 1 - Math.abs(t - 14.6) * 3) + 30 * Math.max(0, 1 - Math.abs(t - 17.8) * 3) : 0
    sparks.current.visible = t > 17.75 && t < 20.5
  })

  // thread across the gap (A)
  const g0 = onEntry(E.gap[0] - 0.6)
  const g1 = onEntry(E.gap[1] + 0.7)
  const thread = () => {
    const t = tRef.current
    const k = smooth(seg(t, 1.2, 3.2))
    if (k <= 0 || t > 5.5) return null
    return [
      [g0[0], g0[1], 0.35],
      [mix(g0[0], g1[0], k), mix(g0[1], g1[1], k), 0.35 - Math.sin(Math.PI * k) * 0.15],
    ]
  }
  const gapA = onEntry(E.gap[0])
  const gapB = onEntry(E.gap[1])

  // B ribbons and their ghosts
  const bLine = (i, lag) => () => {
    const t = tRef.current - lag
    if (tRef.current < 6 || tRef.current > 14.2) return null
    return tideRibbon(...B_RIBBONS[i], t * 1.1 + i * 0.9, 1.3 + i * 0.25)
  }
  // C: the ribbon Null snaps to his post
  const cLine = (lag) => () => {
    const t = tRef.current - lag
    if (tRef.current < 14 || tRef.current > 21.5) return null
    if (t >= 17.8) return lag ? null : [[...C_RIB.b], [C_RIB.b[0] + 0.01, C_RIB.b[1]]]
    return bentRibbon(C_RIB.a, C_RIB.b, 0.8 * Math.sin(t * 1.2))
  }
  // D: the tide slowed — the ribbon bends frame by frame toward its stake; earlier frames linger as ghosts
  const D_STEPS = 9
  const dFrame = (k) => bentRibbon(HOLD.ribbon.a, HOLD.ribbon.b, 3.3 * smooth(k / D_STEPS))
  const dLine = (back) => () => {
    const t = tRef.current
    if (t < 21 || t > 40) return null
    const k = Math.min(D_STEPS, Math.floor(seg(t, 21.6, 27.4) * (D_STEPS + 1)))
    if (back > k) return null
    return dFrame(k - back)
  }

  return (
    <>
      <FlatsScenery layout={layout} bridged={false} />
      <group ref={gapSlab}>
        <CausewaySlab a={gapA} b={gapB} />
      </group>
      <LiveLine getPts={thread} color="#ffd27a" width={5} />

      <group ref={postsB}>
        {B_RIBBONS.flat().map((p, i) => (
          <Post key={i} pos={p} />
        ))}
        <Post pos={M} kind="post" />
      </group>
      <mesh ref={midPost} rotation={[-Math.PI / 2, 0, 0]} position={[M[0], 0.05, M[1]]}>
        <ringGeometry args={[0.3, 0.55, 32]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0} toneMapped={false} />
      </mesh>
      {B_RIBBONS.map((_, i) => (
        <group key={i}>
          <LiveLine getPts={bLine(i, 0.6)} color="#ffe6b0" width={3} opacity={0.18} />
          <LiveLine getPts={bLine(i, 0.3)} color="#ffe6b0" width={3} opacity={0.32} />
          <LiveLine getPts={bLine(i, 0)} color="#ffb347" width={12} opacity={0.22} />
          <LiveLine getPts={bLine(i, 0)} color="#ffd27a" width={5} />
        </group>
      ))}

      <group ref={postsC}>
        <Post pos={C_RIB.a} />
        <Post pos={C_RIB.b} />
      </group>
      <LiveLine getPts={cLine(0.35)} color="#ffe6b0" width={3} opacity={0.25} />
      <LiveLine getPts={cLine(0)} color="#ffd27a" width={5} />
      <group ref={nullGroup} position={[NULL_POOL.c[0], 0.2, NULL_POOL.c[1]]} rotation={[0, -0.5, 0]}>
        <CountNull script={nullScript} />
      </group>
      <pointLight ref={nullFlash} position={[NULL_POOL.c[0], 2.5, NULL_POOL.c[1]]} distance={14} color="#a259ff" intensity={0} />
      <group ref={sparks} position={[C_RIB.b[0], 0.4, C_RIB.b[1]]}>
        <Sparkles count={60} scale={[2.2, 1.2, 2.2]} size={6} speed={1.6} color="#c58bff" />
      </group>

      <group ref={postsD}>
        <Post pos={HOLD.ribbon.a} />
        <Post pos={HOLD.ribbon.b} />
      </group>
      {[3, 2, 1].map((b) => (
        <LiveLine key={b} getPts={dLine(b)} color="#ffe6b0" width={3} opacity={0.12 + (3 - b) * 0.1} />
      ))}
      <LiveLine getPts={dLine(0)} color="#ffb347" width={12} opacity={0.22} />
      <LiveLine getPts={dLine(0)} color="#ffd27a" width={5} />

      <group scale={S}>
        <Gyroid script={gyroScript} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.75} />
      </EffectComposer>
    </>
  )
}

export default Scene
