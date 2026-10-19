import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Gyroid from '../characters/Gyroid'
import { LiveLine } from '../levels/w0/FlatsScenery'
import { MirrorGate, MirrorSea, Plinth } from '../levels/w0/MirrorScene'
import { DevAdvance, SiteReef } from '../levels/w0/OverworldScene'
import { cleanStroke, sampleShape, simulateSlide } from '../levels/w0/retraction'
import { CausewaySlab } from '../world/ReefScenery'
import layout from '../world/mirrorShoals.json'
import { buildSites } from '../world/sites'
import { eight, f, gOf, theta, thread } from './shapeMaps'

/**
 * Intro movie for World 0 · Level 3, "Two Reefs, One Shape" (videos.json level-0-3-intro):
 *   A 0–7    Mirror Shoals from above: reefs either side of a still, mirrored channel
 *   B 7–14   remember the lagoons: one two-hole reef slides onto a figure-eight, then a theta
 *   C 14–23  a figure-eight and a theta float over the channel; gold threads map one into
 *            the other and back, and a round trip slides home
 *   D 23–29  the Mirror Gate, shut, the Foundry's forge-light through it
 *   E 29–34  Gyroid steps onto the causeway across the channel; title card
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const SITES = buildSites(layout)
const TWIN = SITES.find((s) => s.id === 'twin_mirror')
const GATE = layout.gate.pos
const HOVER = 2.2 // the floating graphs' height over the channel
const X = eight([-3.9, 6.6], 0.9)
const Y = theta([3.9, 6.6], 1.4, 1.05)
const lift = (pts, h = HOVER) => pts.map(([x, z, y]) => [x, z, (y ?? 0) + h])

const SHOTS = [
  [0, 7, [[0, 14, 26], [0, 0, 2]], [[2, 10, 17], [3, 0, 0]]],
  [7, 14, [[TWIN.pos[0] - 1, 8.5, TWIN.pos[1] + 7], [TWIN.pos[0], 0, TWIN.pos[1]]], [[TWIN.pos[0] + 0.5, 7.5, TWIN.pos[1] + 6], [TWIN.pos[0], 0, TWIN.pos[1]]]],
  [14, 23, [[0, 10.5, 19.5], [0, 1.4, 6.2]], [[0, 9.6, 18], [0, 1.4, 6.4]]],
  [23, 29, [[GATE[0] + 1.5, 2.8, GATE[1] + 6.5], [GATE[0], 1.8, GATE[1]]], [[GATE[0] + 0.4, 2.4, GATE[1] + 4.6], [GATE[0], 1.8, GATE[1]]]],
  [29, 40, [[-4, 3.4, 10.5], [0.5, 0.6, 6.8]], [[-3.2, 3.8, 11.5], [1, 0.6, 6.6]]],
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

function gyroidAt(t) {
  if (t < 7) return { x: mix(0, -0.9, seg(t, 1, 6)), z: mix(13.6, 12.1, seg(t, 1, 6)), rotY: Math.PI + 0.5, run: t > 1 && t < 6 ? 1 : 0 }
  if (t < 23) return { x: -1.6, z: 7.1, rotY: Math.PI / 2, run: 0 }
  if (t < 29) return { x: GATE[0], z: GATE[1] + 2.6, rotY: Math.PI, run: 0 }
  const k = seg(t, 29.4, 33)
  return { x: mix(-1.8, 1.4, k), z: mix(7.2, 6.75, k), rotY: Math.PI / 2 - 0.1, run: k > 0 && k < 1 ? 1 : 0 }
}

const circ = (r, cx = 0, cz = 0, n = 64) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI)])
const line = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n])

export default function MirrorMovie({ tRef }) {
  const samples = useMemo(() => Object.fromEntries(SITES.map((s) => [s.id, sampleShape(s.shape)])), [])
  const twin = useMemo(() => {
    const mk = (strokes, beacons) => {
      const clean = strokes.map((s) => cleanStroke(s))
      return { strokes: clean, sim: simulateSlide(TWIN.shape, samples.twin_mirror, clean, beacons) }
    }
    return {
      eight: mk([circ(1.25, -1.35, 0), circ(1.25, 1.35, 0)], TWIN.spines[0].beacons),
      theta: mk([circ(2.35), line([0, -2.35], [0, 2.35], 30)], TWIN.spines[1].beacons),
    }
  }, [samples])
  const t8 = useRef(0)
  const tT = useRef(0)
  const g8 = useRef()
  const gT = useRef()
  const gPlain = useRef()
  const bead = useRef()
  useFrame(() => {
    const t = tRef.current
    t8.current = t < 10.6 ? smooth(seg(t, 8, 10.2)) : 1 - smooth(seg(t, 10.6, 11.3))
    tT.current = smooth(seg(t, 11.4, 13.6))
    g8.current.visible = t >= 7 && t < 11.35
    gT.current.visible = t >= 11.35 && t < 14
    gPlain.current.visible = !(t >= 7 && t < 14)
    const show = t >= 19.6 && t < 23
    bead.current.visible = show
    if (show) {
      const p = X.at('L', 0.3)
      const fp = f(Y, 'L', 0.3)
      const gfp = gOf(X, 'L', fp)
      let q
      if (t < 20.6) q = thread(p, fp.pt, 1.1, 40)[Math.round(seg(t, 19.6, 20.6) * 40)]
      else if (t < 21.6) q = thread(fp.pt, gfp, 1.1, 40)[Math.round(seg(t, 20.6, 21.6) * 40)]
      else q = [...X.at('L', mix(fp.u, 0.3, smooth(seg(t, 21.8, 22.8)))), 0]
      bead.current.position.set(q[0], (q[2] ?? 0) + HOVER, q[1])
    }
  })

  const on = (a, b) => () => tRef.current >= a && tRef.current < b
  const graphs = on(14, 23)
  const xLoop = (w) => () => (graphs() ? lift(X.loop(w).map(([x, z]) => [x, z, 0])) : null)
  const yOut = () => (graphs() ? lift(Y.outline().map(([x, z]) => [x, z, 0])) : null)
  const yBar = () => (graphs() ? lift(Y.bar.map(([x, z]) => [x, z, 0])) : null)
  const fThread = (k) => () => {
    const t = tRef.current
    if (t < 14.6 + k * 0.28 || t >= 19.3) return null
    const loop = k < 6 ? 'L' : 'R'
    const a = ((k % 6) + 0.5) / 6
    return lift(thread(X.at(loop, a), f(Y, loop, a).pt, 1.0))
  }
  const gThread = (k) => () => {
    const t = tRef.current
    if (t < 17.4 + k * 0.25 || t >= 19.6) return null
    const side = k < 4 ? -1 : 1
    const u = ((k % 4) + 0.5) / 4
    return lift(thread(Y.arc(side, u), X.at(side < 0 ? 'L' : 'R', u), 0.8))
  }

  return (
    <>
      <color attach="background" args={['#050913']} />
      <fog attach="fog" args={['#050913', 26, 64]} />
      <ambientLight intensity={0.36} />
      <hemisphereLight args={['#6d9cc4', '#0a0a14', 0.55]} />
      <directionalLight position={[-8, 16, 12]} intensity={1.2} color="#dcefff" />
      <Stars radius={90} depth={40} count={2600} factor={3} fade speed={0.2} />
      <Sparkles count={160} scale={[6, 2, 40]} position={[0, 0.2, 0]} size={2.5} speed={0.15} color="#cfe8ff" />
      <MirrorSea channel={layout.channel} />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} />
      ))}
      {SITES.map((s) => (
        <Plinth key={`p${s.id}`} site={s} />
      ))}
      <group ref={gPlain}>
        {SITES.filter((s) => s.id !== 'twin_mirror').map((s) => (
          <SiteReef key={s.id} site={s} samples={samples[s.id]} strokes={[]} sim={null} tRef={{ current: 0 }} active={false} saved={false} />
        ))}
        <SiteReef site={TWIN} samples={samples.twin_mirror} strokes={[]} sim={null} tRef={{ current: 0 }} active={false} saved={false} />
      </group>
      <group ref={g8}>
        {SITES.filter((s) => s.id !== 'twin_mirror').map((s) => (
          <SiteReef key={s.id} site={s} samples={samples[s.id]} strokes={[]} sim={null} tRef={{ current: 0 }} active={false} saved={false} />
        ))}
        <SiteReef site={{ ...TWIN, beacons: TWIN.spines[0].beacons }} samples={samples.twin_mirror} strokes={twin.eight.strokes} sim={twin.eight.sim} tRef={t8} active saved={false} />
      </group>
      <group ref={gT}>
        {SITES.filter((s) => s.id !== 'twin_mirror').map((s) => (
          <SiteReef key={s.id} site={s} samples={samples[s.id]} strokes={[]} sim={null} tRef={{ current: 0 }} active={false} saved={false} />
        ))}
        <SiteReef site={{ ...TWIN, beacons: TWIN.spines[1].beacons }} samples={samples.twin_mirror} strokes={twin.theta.strokes} sim={twin.theta.sim} tRef={tT} active saved={false} />
      </group>
      <MirrorGate pos={GATE} lit={false} open={false} />

      {/* C: the two shapes over the channel, and the maps between them */}
      <LiveLine getPts={xLoop('L')} color="#ffd27a" width={5} />
      <LiveLine getPts={xLoop('R')} color="#ffd27a" width={5} />
      <LiveLine getPts={yOut} color="#ffd27a" width={5} />
      <LiveLine getPts={yBar} color="#ffd27a" width={5} />
      {Array.from({ length: 12 }, (_, k) => (
        <LiveLine key={`f${k}`} getPts={fThread(k)} color="#ffb347" width={2} opacity={0.8} />
      ))}
      {Array.from({ length: 8 }, (_, k) => (
        <LiveLine key={`g${k}`} getPts={gThread(k)} color="#9fd8ff" width={2} opacity={0.85} />
      ))}
      <mesh ref={bead}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>

      <group scale={S}>
        <Gyroid
          script={() => {
            const g = gyroidAt(tRef.current)
            return { pos: [g.x / S, 0, g.z / S], rotY: g.rotY, run: g.run, cast: 0, whip: 0, loop: 0, loopDrop: 0 }
          }}
        />
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
