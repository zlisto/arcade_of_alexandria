import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { LiveLine } from '../levels/w0/FlatsScenery'
import { DevAdvance, SiteReef } from '../levels/w0/OverworldScene'
import { cleanStroke, makeShape, sampleShape, simulateSlide } from '../levels/w0/retraction'
import { eight, f, gOf, theta, thread } from './shapeMaps'

/**
 * "Same Shape" (videos.json level-0-3-lesson): homotopy equivalence, slowed down.
 *   A 0–10   a figure-eight X and a theta Y: same shape?
 *   B 10–24  the maps: f : X → Y (gold threads), g : Y → X collapsing the bar (blue threads)
 *   C 24–36  a point's round trip p → f(p) → g(f(p)) lands nearby and slides home: g∘f ≃ 1
 *   D 36–48  one two-hole reef slides onto the eight, regrows, slides onto the theta: X ≃ Y
 *   E 48–56  a solid reef slides onto a point (contractible); a loop round a ring's hole catches
 *   F 56–64  how to play; G 64–70 summary
 * The 2D diagram (MirrorLessonOverlay) runs on the same clock.
 */

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k

const X = eight([-3.6, 0], 0.85)
const Y = theta([0.6, 0], 1.4, 1.05)
const F_SAMPLES = Array.from({ length: 16 }, (_, k) => [k < 8 ? 'L' : 'R', ((k % 8) + 0.5) / 8])
const G_SAMPLES = [
  ...[0.15, 0.35, 0.5, 0.65, 0.85].map((u) => ({ side: -1, u })),
  ...[0.15, 0.35, 0.5, 0.65, 0.85].map((u) => ({ side: 1, u })),
  { bar: 0.25 },
  { bar: 0.75 },
]
const BEAD = { loop: 'L', a: 0.3 }

// the reefs for beats D–G (local shapes as in the level)
const LAGOONS = { add: [{ type: 'circle', cx: 0, cz: 0, r: 3.1 }], sub: [{ type: 'circle', cx: -1.35, cz: 0, r: 0.75 }, { type: 'circle', cx: 1.35, cz: 0, r: 0.75 }] }
const SOLID = { add: [{ type: 'circle', cx: 0, cz: 0, r: 1.4 }] }
const RING = { add: [{ type: 'circle', cx: 0, cz: 0, r: 1.4 }], sub: [{ type: 'circle', cx: 0, cz: 0, r: 0.55 }] }
const circ = (r, cx = 0, cz = 0, n = 64) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI)])
const line = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n])

function useReef(def, strokes, beacons) {
  return useMemo(() => {
    const shape = makeShape(def)
    const samples = sampleShape(shape)
    const clean = strokes.map((s) => (s.length > 1 ? cleanStroke(s) : s))
    const sim = simulateSlide(shape, samples, clean, beacons)
    return { shape, samples, strokes: clean, sim }
  }, [def, strokes, beacons])
}

/** Story time → the lesson camera. */
function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const wide = smooth(seg(t, 64, 70))
    // the demo sits in the left of the frame; the diagram card takes the right
    camera.position.set(0.5, mix(13.5, 17, wide), mix(5.4, 7.5, wide))
    look.set(0.5, 0, -0.3)
    camera.lookAt(look)
  })
  return null
}

export default function MirrorLesson({ tRef }) {
  const eightStrokes = useMemo(() => [circ(1.25, -1.35, 0), circ(1.25, 1.35, 0)], [])
  const thetaStrokes = useMemo(() => [circ(2.35), line([0, -2.35], [0, 2.35], 30)], [])
  const eightBeacons = useMemo(() => [[0, 0], [-2.45, 0], [2.45, 0]], [])
  const thetaBeacons = useMemo(() => [[0, -1.75], [0, 1.75], [0, 0]], [])
  const pointStrokes = useMemo(() => [[[0, 0]]], [])
  const pointBeacons = useMemo(() => [[0, 0]], [])
  const R8 = useReef(LAGOONS, eightStrokes, eightBeacons)
  const RT = useReef(LAGOONS, thetaStrokes, thetaBeacons)
  const RS = useReef(SOLID, pointStrokes, pointBeacons)
  const ringShape = useMemo(() => sampleShape(makeShape(RING)), [])

  // per-reef slide clocks, driven from story time
  const t8 = useRef(0)
  const tT = useRef(0)
  const tS = useRef(0)
  const g8 = useRef()
  const gT = useRef()
  const gS = useRef()
  const gR = useRef()
  const bead = useRef()
  const home = useRef()
  useFrame(() => {
    const t = tRef.current
    t8.current = t < 44 ? smooth(seg(t, 41, 43.4)) : t < 56 ? 1 - smooth(seg(t, 44, 44.8)) : 0
    tT.current = t < 60 ? smooth(seg(t, 44.9, 47.4)) : 1
    tS.current = smooth(seg(t, 48.6, 51.4))
    g8.current.visible = (t >= 36 && t < 44.85) || (t >= 56 && t < 64)
    gT.current.visible = (t >= 44.85 && t < 48) || t >= 64
    gS.current.visible = t >= 48 && t < 56
    gR.current.visible = t >= 48 && t < 56
    // the round-trip bead (beat C)
    const show = t >= 24.2 && t < 36
    bead.current.visible = show
    home.current.visible = show // p itself, so you can see where the round trip should end
    if (show) {
      const p = X.at(BEAD.loop, BEAD.a)
      const fp = f(Y, BEAD.loop, BEAD.a)
      const gfp = gOf(X, BEAD.loop, fp)
      let q
      if (t < 26.4) q = thread(p, fp.pt, 1.2, 48)[Math.round(seg(t, 24.4, 26.4) * 48)]
      else if (t < 28.4) q = thread(fp.pt, gfp, 1.2, 48)[Math.round(seg(t, 26.4, 28.4) * 48)]
      else if (t < 32.8) q = [...gfp, 0.1]
      else {
        const a0 = fp.u // g∘f(p) sits at fraction fp.u of the loop; slide it back to BEAD.a
        const a = mix(a0, BEAD.a, smooth(seg(t, 32.8, 35)))
        q = [...X.at(BEAD.loop, a), 0.1]
      }
      bead.current.position.set(q[0], q[2] ?? 0.1, q[1])
      bead.current.scale.setScalar(t >= 28.4 && t < 32.8 ? 1 + 0.3 * Math.abs(Math.sin(t * 6)) : 1)
    }
  })

  const graphsOn = () => tRef.current < 36
  const xLoop = (which) => () => (graphsOn() ? X.loop(which) : null)
  const yOutline = () => (graphsOn() ? Y.outline() : null)
  const yBar = () => (graphsOn() ? Y.bar : null)
  const fThread = (k) => () => {
    const t = tRef.current
    if (t < 10.4 + (k % 8) * 0.45 + (k >= 8 ? 0.2 : 0) || t >= 24) return null
    const [loop, a] = F_SAMPLES[k]
    return thread(X.at(loop, a), f(Y, loop, a).pt, 1.1)
  }
  const gThread = (k) => () => {
    const t = tRef.current
    if (t < 19 + k * 0.3 || t >= 24) return null
    const s = G_SAMPLES[k]
    const from = s.bar !== undefined ? [Y.M[0], Y.T[1] + (Y.B[1] - Y.T[1]) * s.bar] : Y.arc(s.side, s.u)
    const to = s.bar !== undefined ? X.crossing : X.at(s.side < 0 ? 'L' : 'R', s.u)
    return thread(from, to, 0.9)
  }
  const beadThreads = (which) => () => {
    const t = tRef.current
    if (t < 24.2 || t >= 36) return null
    const p = X.at(BEAD.loop, BEAD.a)
    const fp = f(Y, BEAD.loop, BEAD.a)
    if (which === 0) return thread(p, fp.pt, 1.2)
    return t >= 26.4 ? thread(fp.pt, gOf(X, BEAD.loop, fp), 1.2) : null
  }
  // the loop around the ring's hole (beat E): shrinks until it catches
  const ringLoop = () => {
    const t = tRef.current
    if (t < 52.2 || t >= 56) return null
    return circ(mix(1.25, 0.62, smooth(seg(t, 52.4, 54.4))), 1.0, 0)
  }

  const reefSite = (pos, beacons) => ({ pos, beacons })
  return (
    <>
      <color attach="background" args={['#050913']} />
      <fog attach="fog" args={['#050913', 18, 40]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#6d9cc4', '#0a0a14', 0.55]} />
      <directionalLight position={[-6, 14, 10]} intensity={1.2} color="#dcefff" />
      <Stars radius={60} depth={30} count={1600} factor={3} fade speed={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0a1828" metalness={0.6} roughness={0.3} emissive="#06243a" emissiveIntensity={0.4} />
      </mesh>

      {/* A–C: the two graphs and the maps between them */}
      <LiveLine getPts={xLoop('L')} color="#ffd27a" width={5} y={0.1} />
      <LiveLine getPts={xLoop('R')} color="#ffd27a" width={5} y={0.1} />
      <LiveLine getPts={yOutline} color="#ffd27a" width={5} y={0.1} />
      <LiveLine getPts={yBar} color="#ffd27a" width={5} y={0.1} />
      {F_SAMPLES.map((_, k) => (
        <LiveLine key={`f${k}`} getPts={fThread(k)} color="#ffb347" width={2} opacity={0.75} />
      ))}
      {G_SAMPLES.map((_, k) => (
        <LiveLine key={`g${k}`} getPts={gThread(k)} color="#9fd8ff" width={2} opacity={0.8} />
      ))}
      <LiveLine getPts={beadThreads(0)} color="#ffb347" width={3} opacity={0.9} />
      <LiveLine getPts={beadThreads(1)} color="#9fd8ff" width={3} opacity={0.9} />
      <mesh ref={bead}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
      <mesh ref={home} position={[X.at(BEAD.loop, BEAD.a)[0], 0.12, X.at(BEAD.loop, BEAD.a)[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.28, 28]} />
        <meshBasicMaterial color="#fff2c4" transparent opacity={0.8} toneMapped={false} />
      </mesh>

      {/* D, F: one two-hole reef, sliding onto the eight; then (D, G) onto the theta */}
      <group ref={g8}>
        <SiteReef site={reefSite([-1.6, 0], eightBeacons)} samples={R8.samples} strokes={R8.strokes} sim={R8.sim} tRef={t8} active saved={false} />
      </group>
      <group ref={gT}>
        <SiteReef site={reefSite([-1.6, 0], thetaBeacons)} samples={RT.samples} strokes={RT.strokes} sim={RT.sim} tRef={tT} active saved={false} />
      </group>
      {/* E: contractible vs. a ring */}
      <group ref={gS}>
        <SiteReef site={reefSite([-3.6, 0], pointBeacons)} samples={RS.samples} strokes={RS.strokes} sim={RS.sim} tRef={tS} active saved={false} />
      </group>
      <group ref={gR}>
        <SiteReef site={reefSite([1.0, 0], [])} samples={ringShape} strokes={[]} sim={null} tRef={{ current: 0 }} active={false} saved={false} />
      </group>
      <LiveLine getPts={ringLoop} color="#ffd27a" width={5} y={0.12} />

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
const BLUE = '#9fd8ff'
const INK = '#e8eefc'
const DIM = '#5c6680'
const PINK = '#ff8ad8' // math is pink everywhere
const MATH = { fontFamily: "'Cambria Math', 'STIX Two Math', serif" }

function Eight({ x, y, s = 1, color = GOLD }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} fill="none" stroke={color} strokeWidth="2.5">
      <circle cx="-11" cy="0" r="11" />
      <circle cx="11" cy="0" r="11" />
    </g>
  )
}
function Theta({ x, y, s = 1, color = GOLD }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} fill="none" stroke={color} strokeWidth="2.5">
      <ellipse cx="0" cy="0" rx="20" ry="15" />
      <line x1="0" y1="-15" x2="0" y2="15" />
    </g>
  )
}

function Diagram({ t }) {
  if (t < 10)
    return (
      <svg viewBox="0 0 260 150" className="lesson-svg">
        <Eight x={70} y={60} s={1.6} />
        <Theta x={190} y={60} s={1.6} />
        <text x="130" y="68" textAnchor="middle" fill={PINK} fontSize="22" style={MATH}>
          ≟
        </text>
        <text x="70" y="118" textAnchor="middle" fill="#9fb0d0" fontSize="15" style={MATH}>
          X
        </text>
        <text x="190" y="118" textAnchor="middle" fill="#9fb0d0" fontSize="15" style={MATH}>
          Y
        </text>
      </svg>
    )
  if (t < 24) {
    const fOn = t < 19
    return (
      <svg viewBox="0 0 260 170" className="lesson-svg">
        <Eight x={50} y={80} s={1.3} />
        <Theta x={210} y={80} s={1.3} />
        <path d="M 85 62 Q 130 30 175 62" fill="none" stroke={GOLD} strokeWidth={fOn ? 3.5 : 1.5} opacity={fOn ? 1 : 0.5} markerEnd="url(#ah)" />
        <path d="M 175 100 Q 130 132 85 100" fill="none" stroke={BLUE} strokeWidth={!fOn ? 3.5 : 1.5} opacity={!fOn ? 1 : 0.4} markerEnd="url(#ahb)" />
        <defs>
          <marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={GOLD} />
          </marker>
          <marker id="ahb" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill={BLUE} />
          </marker>
        </defs>
        <text x="130" y="32" textAnchor="middle" fill={PINK} fontSize="17" style={MATH}>
          f : X → Y
        </text>
        <text x="130" y="152" textAnchor="middle" fill={BLUE} fontSize="17" style={MATH}>
          g : Y → X
        </text>
      </svg>
    )
  }
  if (t < 36)
    return (
      <svg viewBox="0 0 260 170" className="lesson-svg">
        <text x="130" y="34" textAnchor="middle" fill={PINK} fontSize="17" style={MATH}>
          p ↦ f(p) ↦ g(f(p))
        </text>
        <text x="130" y="80" textAnchor="middle" fill={t >= 32.8 ? GOLD : DIM} fontSize="20" style={MATH}>
          g∘f ≃ 1
          <tspan fontSize="13" dy="5">X</tspan>
        </text>
        <text x="130" y="114" textAnchor="middle" fill={t >= 32.8 ? BLUE : DIM} fontSize="20" style={MATH}>
          f∘g ≃ 1
          <tspan fontSize="13" dy="5">Y</tspan>
        </text>
        <text x="130" y="150" textAnchor="middle" fill="#9fb0d0" fontSize="13">
          round trips slide home
        </text>
      </svg>
    )
  if (t < 48)
    return (
      <svg viewBox="0 0 260 190" className="lesson-svg">
        <g transform="translate(130,40)">
          <circle r="28" fill="#2d3a5c" stroke={DIM} />
          <circle cx="-11" r="6" fill="#0a1828" />
          <circle cx="11" r="6" fill="#0a1828" />
        </g>
        <text x="130" y="88" textAnchor="middle" fill="#9fb0d0" fontSize="14" style={MATH}>
          Z
        </text>
        <line x1="112" y1="72" x2="68" y2="112" stroke={t < 44.85 ? GOLD : DIM} strokeWidth="2.5" />
        <line x1="148" y1="72" x2="192" y2="112" stroke={t >= 44.85 ? GOLD : DIM} strokeWidth="2.5" />
        <Eight x={58} y={130} s={1.1} color={t < 44.85 ? GOLD : DIM} />
        <Theta x={202} y={130} s={1.1} color={t >= 44.85 ? GOLD : DIM} />
        <text x="130" y="176" textAnchor="middle" fill={PINK} fontSize="17" style={MATH}>
          X ≃ Z ≃ Y
        </text>
      </svg>
    )
  if (t < 56)
    return (
      <svg viewBox="0 0 260 150" className="lesson-svg">
        <circle cx="62" cy="50" r="22" fill="#2d3a5c" stroke={DIM} />
        <text x="110" y="56" textAnchor="middle" fill={PINK} fontSize="18" style={MATH}>
          ≃
        </text>
        <circle cx="150" cy="50" r="4" fill={GOLD} />
        <text x="205" y="56" textAnchor="middle" fill={GOLD} fontSize="14">
          contractible
        </text>
        <circle cx="62" cy="112" r="20" fill="none" stroke="#2d3a5c" strokeWidth="9" />
        <text x="110" y="118" textAnchor="middle" fill={PINK} fontSize="18" style={MATH}>
          ≃ • ?
        </text>
        <text x="200" y="118" textAnchor="middle" fill="#9fb0d0" fontSize="12">
          World 1
        </text>
      </svg>
    )
  return null
}

function Steps({ t }) {
  if (t >= 64)
    return (
      <div className="lesson-steps">
        <h4>Same shape</h4>
        <p className="lesson-math">f : X → Y, g : Y → X</p>
        <p className="lesson-math">g∘f ≃ 1, f∘g ≃ 1</p>
        <p className="lesson-note">homotopy equivalent — same homotopy type</p>
        <p className="lesson-math">X ≃ • : contractible</p>
        <p className="lesson-note">one reef sliding onto both shapes proves it</p>
      </div>
    )
  const steps = [
    ['2', 'hold the Spool', t < 57.4],
    ['click', 'start the thread', t >= 57.4 && t < 58.4],
    ['walk', 'through every beacon', t >= 58.4 && t < 59.4],
    ['click', 'stop · then Slide ▶', t >= 59.4 && t < 60.4],
    ['⚡', 'lash the solid Mirror spawn, not its reflection', t >= 60.4],
  ]
  return (
    <div className="lesson-steps">
      <h4>Proving a reef</h4>
      {steps.map(([k, label, on], i) => (
        <div key={i} className={`lesson-step ${on ? 'on' : ''}`}>
          <kbd>{k}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

/** The diagram beside the 3D demo. */
export function MirrorLessonOverlay({ t }) {
  if (t >= 66.5) return null
  return <div className="lesson-card">{t >= 56 ? <Steps t={t} /> : <Diagram t={t} />}</div>
}
