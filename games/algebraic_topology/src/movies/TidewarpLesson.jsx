import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Gyroid from '../characters/Gyroid'
import { DevAdvance } from '../levels/w0/OverworldScene'
import FlatsScenery, { LiveLine, Post } from '../levels/w0/FlatsScenery'
import { cut, grab, makeFlats, makeRibbon, release, ribbonPieces, sampleMovie, stepRibbon, tideHomotopy } from '../levels/w0/ribbon'
import layout from '../world/tidewarpFlats.json'

/**
 * "How the Tide Works" (videos.json level-0-2-lesson): the idea of 0-2 and its two
 * tools, slowed down. A 3D demo on the flats plays beside a 2D diagram (LessonOverlay)
 * driven by the same clock, so the bead on the interval and the row of the square
 * always match the ribbon on screen.
 *
 *   A 0–9    a path is a map f : I → X (bead on [0, 1] ↔ bead on the ribbon)
 *   B 9–21   a homotopy is a movie: frames fₜ freeze; the square I × I, one row per frame
 *   C 21–30  the Tide Glass scrubs t; ghosts of the neighbouring frames hug the ribbon
 *   D 30–38  rel A: the ribbon's pinned points never move (the square's side edges)
 *   E 38–50  the Spool: grab, walk, hook onto a stake (real ribbon physics)
 *   F 50–60  what breaks a homotopy: a cut, a jump, crossing water
 *   G 60–70  summary
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const HOLD = layout.zones.find((z) => z.id === 'hold_posts')
const POOLS = layout.zones.find((z) => z.id === 'the_pools')
const A = HOLD.ribbon.a
const B = HOLD.ribbon.b
const TIDE = tideHomotopy(A, B)
const FREEZE = [0, 0.25, 0.5, 0.75, 1]

// ---------------------------------------------------------------- the shared clock

/** The homotopy time t shown at story time `time` — itself continuous (this is a lesson about continuity). */
export function tau(time) {
  if (time < 9.5) return 0
  if (time < 13) return smooth(seg(time, 9.5, 13))
  if (time < 21) return 0.5 + 0.5 * Math.cos((Math.PI * (time - 13)) / 8)
  if (time < 60) return 0.5 - 0.5 * Math.cos((time - 21) * 0.85)
  return 0.5 - 0.5 * Math.cos((time - 21) * 0.4)
}
/** The bead's s in beat A. */
export const beadS = (time) => (time < 4.6 ? smooth(seg(time, 1.2, 4.4)) : smooth(seg(time, 5, 8.5)))
/** How far through the tide's first pass (freeze frames appear as it passes them). */
const freezeShown = (time, k) => time >= 9.5 + 3.5 * (k / 4) && time < 30
const SPOOL = { arrive: 40.4, grab: 40.9, pullFrom: 42.4, pullTo: 45.6, hook: 46.9, cut: 50.6 }
export { SPOOL }

// ---------------------------------------------------------------- camera

const TOP = [[-1.4, 15.5, 2.4], [-1.4, 0, -3.3]] // both posts and the tide's bends in the left of frame; the diagram sits on the right
const SPOOL_CAM = [[0.6, 7, 3.4], [-1.2, 0, -4]]
const POOL_CAM = [[9.4, 8, 10], [9.4, 0, 3]]
const WIDE = [[0, 24, 22], [0, 0, -2]]
const SHOTS = [
  [0, 38, TOP, [[-1.5, 15, 2.2], [-1.5, 0, -3.4]]],
  [38, 56.4, SPOOL_CAM, [[0.4, 6.7, 3.1], [-1.3, 0, -4.1]]],
  [56.4, 60, POOL_CAM, [[9.6, 7.7, 9.6], [9.5, 0, 3]]],
  [60, 70.5, [[9.6, 7.7, 9.6], [9.5, 0, 3]], WIDE],
]
function LessonCamera({ tRef }) {
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

// ---------------------------------------------------------------- Gyroid

function gyroidAt(t) {
  if (t < 38) return { x: 1.5, z: -0.6, rotY: -2.2, run: 0 }
  if (t < SPOOL.arrive) {
    const k = seg(t, 38, SPOOL.arrive)
    return { x: -3, z: mix(-0.4, -2.75, k), rotY: Math.PI, run: k > 0 && k < 1 ? 1 : 0 }
  }
  if (t < SPOOL.pullFrom) return { x: -3, z: -2.75, rotY: Math.PI, run: 0 }
  const k = seg(t, SPOOL.pullFrom, SPOOL.pullTo)
  return { x: -3, z: mix(-2.75, -6.4, k), rotY: Math.PI, run: k > 0 && k < 1 ? 1 : 0 }
}

// ---------------------------------------------------------------- scene

function bent(a, b, bulge, n = 90) {
  const dx = b[0] - a[0]
  const dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  return Array.from({ length: n }, (_, i) => {
    const s = i / (n - 1)
    const d = bulge * Math.sin(Math.PI * s)
    return [a[0] + dx * s - (dz / L) * d, a[1] + dz * s + (dx / L) * d]
  })
}
/** A homotopy that jumps at τ = 0.5 (for "what breaks a homotopy"). */
const JUMP = (s, t) => {
  const d = t < 0.5 ? 1.6 * Math.sin(Math.PI * s) : -1.4 * Math.sin(2 * Math.PI * s)
  return [A[0] + (B[0] - A[0]) * s, A[1] + d]
}

export default function TidewarpLesson({ tRef }) {
  const flats = useMemo(() => makeFlats(layout), [])
  const phys = useRef({ r: makeRibbon(HOLD.ribbon), grabbed: false, released: false, cut: false })
  const bead = useRef()
  const grabRing = useRef()
  const cutMark = useRef()
  const hookRing = useRef()
  const postGlow = [useRef(), useRef()]

  useFrame(({ clock }) => {
    const t = tRef.current
    const P = phys.current
    // the Spool demo runs real ribbon physics; rewind resets it
    if (t < 38 || (P.cut && t < SPOOL.cut) || (P.released && t < SPOOL.hook) || (P.grabbed && t < SPOOL.grab)) {
      phys.current = { r: makeRibbon(HOLD.ribbon), grabbed: false, released: false, cut: false }
    }
    const Q = phys.current
    const g = gyroidAt(t)
    if (t >= 38 && t < 53.6) {
      if (t >= SPOOL.grab && !Q.grabbed) Q.grabbed = !!grab(Q.r, g.x, g.z)
      if (Q.grabbed && !Q.released) {
        const pin = Q.r.pins.find((p) => p.kind === 'grab')
        if (pin) pin.pos = [g.x, g.z]
      }
      if (t >= SPOOL.hook && Q.grabbed && !Q.released) {
        release(Q.r, HOLD.stakes)
        Q.released = true
      }
      if (t >= SPOOL.cut && !Q.cut) {
        cut(Q.r, -4.7, -4.6)
        Q.cut = true
      }
      stepRibbon(Q.r, flats)
    }
    // the bead in beat A
    bead.current.visible = t < 9.2
    const p = TIDE(beadS(t), 0)
    bead.current.position.set(p[0], 0.18, p[1])
    // the posts glow in beat D (rel A)
    postGlow.forEach((r) => {
      r.current.visible = t > 30 && t < 38.2
      r.current.scale.setScalar(1 + Math.abs(Math.sin(clock.elapsedTime * 3)) * 0.4)
    })
    const gp = Q.r.pins.find((pp) => pp.kind === 'grab')
    grabRing.current.visible = !!gp && t >= 38 && t < 53.6
    if (gp) grabRing.current.position.set(gp.pos[0], 0.14, gp.pos[1])
    grabRing.current.rotation.z = clock.elapsedTime * 3
    const cp = Q.r.pins.find((pp) => pp.kind === 'cut')
    cutMark.current.visible = !!cp && t < 53.6
    if (cp) {
      cutMark.current.position.set(cp.pos[0], 0.2, cp.pos[1])
      cutMark.current.scale.setScalar(0.8 + Math.abs(Math.sin(clock.elapsedTime * 10)) * 0.7)
    }
    hookRing.current.visible = Q.released && t < 53.6
  })

  const gyroScript = () => {
    const t = tRef.current
    const g = gyroidAt(t)
    return { pos: [g.x / S, 0, g.z / S], rotY: g.rotY, run: g.run, cast: t >= SPOOL.arrive && t < 53.6 ? 0.45 : 0, whip: 0, loop: 0, loopDrop: 0 }
  }

  // the tide's movie (beats A–D, G)
  const tideAt = (dt) => () => {
    const t = tRef.current
    if (!(t < 38 || t >= 60)) return null
    if (dt && !(t >= 21 && t < 38)) return null
    const tt = tau(t) + dt
    return tt < 0 || tt > 1 ? null : sampleMovie(TIDE, tt, 90)
  }
  const freeze = (k) => () => (freezeShown(tRef.current, k) ? sampleMovie(TIDE, FREEZE[k], 90) : null)
  const physPiece = (k) => () => {
    const t = tRef.current
    return t >= 38 && t < 53.6 ? ribbonPieces(phys.current.r)[k] : null
  }
  // the jump (53.6–56.4): sweep across the break; ghosts show the neighbouring frames
  const jt = () => 0.3 + 0.4 * seg(tRef.current, 54, 56)
  const jumpAt = (dt) => () => {
    const t = tRef.current
    if (t < 53.6 || t >= 56.4) return null
    return sampleMovie(JUMP, Math.min(1, Math.max(0, jt() + dt)), 90)
  }
  // crossing water (56.4–60): the pool shrine's ribbon dragged straight over the pool
  const crossAt = (wet) => () => {
    const t = tRef.current
    if (t < 56.4) return null
    if (t >= 60) return wet ? null : bent(POOLS.ribbon.a, POOLS.ribbon.b, 2.4) // back round the near side: a fine homotopy
    const pts = bent(POOLS.ribbon.a, POOLS.ribbon.b, mix(2.4, -2.4, smooth(seg(t, 56.8, 59.4))))
    if (!wet) return pts
    const run = pts.filter((q) => flats.inPool(q[0], q[1])).map((q) => [q[0], q[1], 0.2])
    return run.length > 1 ? run : null
  }

  return (
    <>
      <FlatsScenery layout={layout} bridged />
      <Post pos={A} />
      <Post pos={B} />
      {postGlow.map((r, i) => (
        <mesh key={i} ref={r} rotation={[-Math.PI / 2, 0, 0]} position={[[A, B][i][0], 0.06, [A, B][i][1]]}>
          <ringGeometry args={[0.3, 0.42, 32]} />
          <meshBasicMaterial color="#ffd27a" toneMapped={false} />
        </mesh>
      ))}
      {HOLD.stakes.map((st) => (
        <Post key={st.id} pos={st.pos} kind="stake" />
      ))}
      <mesh ref={hookRing} rotation={[-Math.PI / 2, 0, 0]} position={[HOLD.stakes[0].pos[0], 0.06, HOLD.stakes[0].pos[1]]}>
        <ringGeometry args={[0.22, 0.32, 32]} />
        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
      </mesh>
      <Post pos={POOLS.ribbon.a} />
      <Post pos={POOLS.ribbon.b} />

      {FREEZE.map((_, k) => (
        <LiveLine key={k} getPts={freeze(k)} color="#dfe9ff" width={2.5} opacity={0.32} />
      ))}
      <LiveLine getPts={tideAt(-0.05)} color="#dfe9ff" width={3} opacity={0.4} />
      <LiveLine getPts={tideAt(0.05)} color="#dfe9ff" width={3} opacity={0.4} />
      <LiveLine getPts={tideAt(0)} color="#ffb347" width={12} opacity={0.22} />
      <LiveLine getPts={tideAt(0)} color="#ffd27a" width={5} />
      <mesh ref={bead}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>

      {[0, 1, 2].map((k) => (
        <LiveLine key={`p${k}`} getPts={physPiece(k)} color="#ffd27a" width={5} />
      ))}
      <mesh ref={grabRing} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.24, 6]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
      <mesh ref={cutMark}>
        <octahedronGeometry args={[0.13, 0]} />
        <meshBasicMaterial color="#c58bff" toneMapped={false} />
      </mesh>

      <LiveLine getPts={jumpAt(-0.04)} color="#dfe9ff" width={3} opacity={0.45} />
      <LiveLine getPts={jumpAt(0.04)} color="#dfe9ff" width={3} opacity={0.45} />
      <LiveLine getPts={jumpAt(0)} color="#ffd27a" width={5} />
      <LiveLine getPts={crossAt(false)} color="#ffd27a" width={5} />
      <LiveLine getPts={crossAt(true)} color="#b070ff" width={8} />

      <group scale={S}>
        <Gyroid script={gyroScript} />
      </group>
      <LessonCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

// ---------------------------------------------------------------- the 2D diagram

const GOLD = '#ffd27a'
const DIM = '#5c6680'
const INK = '#e8eefc'
const PINK = '#ff8ad8' // math is pink everywhere
const MATH = { fontFamily: "'Cambria Math', 'STIX Two Math', serif" }

function Interval({ s }) {
  const x = 30 + 200 * s
  return (
    <svg viewBox="0 0 260 170" className="lesson-svg">
      <text x="130" y="22" textAnchor="middle" fill={PINK} fontSize="15" style={MATH}>
        f : I → X
      </text>
      <line x1="30" y1="70" x2="230" y2="70" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
      <text x="30" y="96" textAnchor="middle" fill={PINK} fontSize="14" style={MATH}>
        0
      </text>
      <text x="230" y="96" textAnchor="middle" fill={PINK} fontSize="14" style={MATH}>
        1
      </text>
      <text x="130" y="52" textAnchor="middle" fill="#9fb0d0" fontSize="13" style={MATH}>
        I = [0, 1]
      </text>
      <circle cx={x} cy="70" r="8" fill="#fff2c4" />
      <text x={x} y="118" textAnchor="middle" fill={PINK} fontSize="15" style={MATH}>
        s = {s.toFixed(2)}
      </text>
      <text x="130" y="152" textAnchor="middle" fill="#9fb0d0" fontSize="13">
        the bead on the ribbon is f(s)
      </text>
    </svg>
  )
}

function Square({ t, time }) {
  const X0 = 50
  const Y0 = 20
  const W = 180
  const rowY = (tt) => Y0 + W * (1 - tt)
  const relA = time >= 30 && time < 38.2
  const glass = time >= 21 && time < 30
  return (
    <svg viewBox="0 0 260 290" className="lesson-svg">
      <defs>
        <linearGradient id="sqfill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#1d2840" />
          <stop offset="1" stopColor="#2d3a5c" />
        </linearGradient>
      </defs>
      <rect x={X0} y={Y0} width={W} height={W} fill="url(#sqfill)" stroke={DIM} strokeWidth="1.5" />
      {FREEZE.map((f, k) =>
        freezeShown(time, k) ? <line key={k} x1={X0} y1={rowY(f)} x2={X0 + W} y2={rowY(f)} stroke="#dfe9ff" strokeOpacity="0.35" strokeWidth="1.5" /> : null,
      )}
      {(glass || relA) && (
        <>
          <line x1={X0} y1={rowY(Math.min(1, t + 0.05))} x2={X0 + W} y2={rowY(Math.min(1, t + 0.05))} stroke="#dfe9ff" strokeOpacity="0.5" strokeDasharray="4 4" />
          <line x1={X0} y1={rowY(Math.max(0, t - 0.05))} x2={X0 + W} y2={rowY(Math.max(0, t - 0.05))} stroke="#dfe9ff" strokeOpacity="0.5" strokeDasharray="4 4" />
        </>
      )}
      <line x1={X0} y1={rowY(t)} x2={X0 + W} y2={rowY(t)} stroke={GOLD} strokeWidth="4" />
      <text x={X0 + W + 6} y={rowY(t) + 5} fill={PINK} fontSize="14" style={MATH}>
        fₜ
      </text>
      {relA && (
        <>
          <line x1={X0} y1={Y0} x2={X0} y2={Y0 + W} stroke={GOLD} strokeWidth="5" />
          <line x1={X0 + W} y1={Y0} x2={X0 + W} y2={Y0 + W} stroke={GOLD} strokeWidth="5" />
          <text x={X0 - 8} y={Y0 + W / 2} textAnchor="end" fill={PINK} fontSize="13" style={MATH}>
            a
          </text>
          <text x={X0 + W + 8} y={Y0 + W / 2 + 22} fill={PINK} fontSize="13" style={MATH}>
            b
          </text>
        </>
      )}
      <text x={X0 + W / 2} y={Y0 + W + 20} textAnchor="middle" fill="#9fb0d0" fontSize="13" style={MATH}>
        s →
      </text>
      <text x={X0 - 22} y={Y0 + 12} textAnchor="middle" fill="#9fb0d0" fontSize="13" style={MATH}>
        t ↑
      </text>
      <text x="130" y={Y0 + W + 44} textAnchor="middle" fill={PINK} fontSize="15" style={MATH}>
        {relA ? 'F(0, t) = a,  F(1, t) = b' : 'F : I × I → X,  F(s, t) = fₜ(s)'}
      </text>
      {glass ? (
        <g transform={`translate(0, ${Y0 + W + 56})`}>
          <text x="22" y="16" fill={GOLD} fontSize="13">
            ⌛ 3
          </text>
          <rect x="60" y="8" width="150" height="6" rx="3" fill={DIM} />
          <circle cx={60 + 150 * t} cy="11" r="8" fill={GOLD} />
          <text x="226" y="16" fill={INK} fontSize="12">
            Z · X
          </text>
        </g>
      ) : (
        <text x="130" y={Y0 + W + 70} textAnchor="middle" fill="#9fb0d0" fontSize="13" style={MATH}>
          t = {t.toFixed(2)}
        </text>
      )}
    </svg>
  )
}

function SpoolSteps({ time }) {
  const steps = [
    ['2', 'hold the Spool', time >= 38 && time < SPOOL.grab],
    ['click', 'grab the ribbon', time >= SPOOL.grab - 0.4 && time < SPOOL.pullFrom],
    ['walk', 'pull — every step a frame', time >= SPOOL.pullFrom && time < SPOOL.hook - 0.3],
    ['click', 'let go by a stake: hooked', time >= SPOOL.hook - 0.3],
  ]
  return (
    <div className="lesson-steps">
      <h4>◯ The Spool</h4>
      {steps.map(([k, label, on], i) => (
        <div key={i} className={`lesson-step ${on ? 'on' : ''}`}>
          <kbd>{k}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

function Breaks({ time }) {
  const items = [
    ['a cut', 'the ribbon must stay in one piece', time < 53.6],
    ['a jump', 'no frame leaps from the last', time >= 53.6 && time < 56.4],
    ['crossing water', 'every frame stays on the flats', time >= 56.4],
  ]
  return (
    <div className="lesson-steps">
      <h4>Not a homotopy</h4>
      {items.map(([k, label, on], i) => (
        <div key={i} className={`lesson-step bad ${on ? 'on' : ''}`}>
          <kbd>✗</kbd>
          <span>
            <strong>{k}</strong> — {label}
          </span>
        </div>
      ))}
    </div>
  )
}

function Summary() {
  return (
    <div className="lesson-steps">
      <h4>Homotopy</h4>
      <p className="lesson-math">F : I × I → X continuous</p>
      <p className="lesson-note">s runs along the ribbon, t is time: one frame fₜ(s) = F(s, t) for each t</p>
      <p className="lesson-math">rel A: F(a, t) = F(a, 0) for a ∈ A</p>
      <p className="lesson-note">A = the points of the ribbon pinned to posts and stakes; they never move</p>
      <div className="lesson-step on">
        <kbd>3</kbd>
        <span>⌛ Tide Glass — scrub t</span>
      </div>
      <div className="lesson-step on">
        <kbd>2</kbd>
        <span>◯ Spool — reshape the ribbon by hand</span>
      </div>
    </div>
  )
}

/** The diagram beside the 3D demo; same clock. */
export function LessonOverlay({ t }) {
  let body = null
  if (t < 9) body = <Interval s={beadS(t)} />
  else if (t < 38) body = <Square t={tau(t)} time={t} />
  else if (t < 50) body = <SpoolSteps time={t} />
  else if (t < 60) body = <Breaks time={t} />
  else if (t < 65.5) body = <Summary />
  if (!body) return null
  return <div className="lesson-card">{body}</div>
}
