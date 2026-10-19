import { useFrame, useThree } from '@react-three/fiber'
import { Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { DevAdvance } from '../levels/w0/OverworldScene'
import Hologram, { LETTER_COLORS } from '../levels/w0/Hologram'
import { LiveLine } from '../levels/w0/FlatsScenery'
import { Press, Track } from '../levels/w0/FoundryScene'
import { makeTrack } from '../levels/w0/cells'
import Gyroid from '../characters/Gyroid'

/**
 * "Built from Cells" (videos.json level-0-4-lesson): cell complexes, slowly.
 *   A 0–12   the skeletons X⁰ ⊂ X¹ ⊂ X²: points; edges glued by their ends; a disk glued along a loop
 *   B 12–22  the sphere: one point and a disk whose whole rim is crushed to it
 *   C 22–34  the torus: one point, loops a and b, a square glued along a b a⁻¹ b⁻¹ (it folds)
 *   D 34–44  arrows matter: a disk along a a — the projective plane, which crosses itself in 3D
 *   E 44–52  χ = points − edges + disks
 *   F 52–66 how to play: Gyroid works a furnace — forges the point, walks the track for
 *            edge a, walks it again to write a, and presses the disk
 *   G 66–72 summary
 * The diagram (CellsLessonOverlay) runs on the same clock.
 */

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k

/** Story time → camera. The demo sits left of center; the diagram card takes the right. */
function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    if (t >= 52 && t < 66) {
      // the demo: close on the furnace and its track
      camera.position.set(HUB[0] - 0.6, 7.6, HUB[1] + 10.4)
      look.set(HUB[0] - 0.8, 0.5, HUB[1] + 1.3)
    } else {
      const orbit = t * 0.12
      camera.position.set(0.9 + Math.sin(orbit) * 1.0, 5.8, 10.2 + Math.cos(orbit) * 0.6)
      look.set(0.9, 1.0, 0)
    }
    camera.lookAt(look)
  })
  return null
}

// ---------------------------------------------------------------- F: Gyroid works a furnace

const S = 0.7
const HUB = [1.6, -0.8]
const DEMO_TRACK = makeTrack({ angle: Math.PI, length: 2.8 }, HUB)
// the demo's beats (story seconds)
export const DEMO = { walkIn: [52, 53.3], point: 53.7, edgeWalk: [54.1, 57.3], edge: 57.4, wordWalk: [57.9, 61.0], word: 61.0, press: 61.5 }

function Demo({ tRef }) {
  const hub = useRef()
  const slam = useRef(0)
  const fold = useRef(0)
  const holo = useRef()
  const progressRef = useRef(null)
  const [edge, setEdge] = useState(null)
  useFrame(() => {
    const t = tRef.current
    const lit = t >= DEMO.point
    hub.current.material.color.set(lit ? '#ffd27a' : '#5a3a28')
    hub.current.material.emissiveIntensity = lit ? 1.6 : 0.3
    // the track lights up as he walks it
    const walk = (a, b) => (t >= a && t < b ? (t - a) / (b - a) : null)
    const w1 = walk(...DEMO.edgeWalk)
    const w2 = walk(...DEMO.wordWalk)
    const w = w1 ?? w2
    progressRef.current = w != null ? { track: 0, dir: 1, best: w } : null
    const wantEdge = t >= DEMO.edge
    if (wantEdge !== !!edge) setEdge(wantEdge ? { letter: 0, dir: 1, torn: false } : null)
    slam.current = t > DEMO.press && t < DEMO.press + 0.5 ? 1 - (t - DEMO.press) / 0.5 : 0
    fold.current = smooth(seg(t, DEMO.press + 0.35, DEMO.press + 2.8))
    holo.current.visible = t >= DEMO.press + 0.3
  })
  const gyro = () => {
    const t = tRef.current
    let x
    let z
    let rotY = Math.PI
    let run = 0
    const [a0, a1] = DEMO.walkIn
    if (t < a1) {
      const k = smooth(seg(t, a0, a1))
      x = mix(HUB[0] + 0.4, HUB[0], k)
      z = mix(HUB[1] + 2.4, HUB[1], k)
      rotY = Math.atan2(-0.4, -2.4)
      run = k > 0 && k < 1 ? 0.7 : 0
    } else {
      const lap = (a, b) => (t >= a && t < b ? (t - a) / (b - a) : null)
      const u = lap(...DEMO.edgeWalk) ?? lap(...DEMO.wordWalk)
      if (u != null) {
        const p = DEMO_TRACK.at(u)
        const q = DEMO_TRACK.at(Math.min(1, u + 0.02))
        x = p[0]
        z = p[1]
        rotY = Math.atan2(q[0] - p[0], q[1] - p[1])
        run = 0.8
      } else {
        x = HUB[0]
        z = HUB[1]
      }
    }
    const casting = Math.abs(t - DEMO.point) < 0.5 || Math.abs(t - DEMO.press) < 0.5
    return { pos: [x / S, 0, z / S], rotY, run, cast: casting ? 1 : 0.35, whip: 0, loop: 0, loopDrop: 0 }
  }
  return (
    <>
      <mesh position={[HUB[0], 0.06, HUB[1]]}>
        <cylinderGeometry args={[0.85, 0.95, 0.14, 32]} />
        <meshStandardMaterial color="#3a2a22" roughness={0.5} />
      </mesh>
      <mesh ref={hub} position={[HUB[0], 0.14, HUB[1]]}>
        <cylinderGeometry args={[0.55, 0.55, 0.04, 32]} />
        <meshStandardMaterial color="#5a3a28" emissive="#ff8a2a" emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
      <Track track={DEMO_TRACK} trackIdx={0} pos={[0, 0]} edge={edge} progressRef={progressRef} />
      <Press pos={HUB} slamRef={slam} />
      <group ref={holo} position={[HUB[0] - 1.7, 1.7, HUB[1] - 0.4]} scale={0.6}>
        <Hologram kind="disk" word={[{ e: 0, s: 1 }]} kRef={fold} />
      </group>
      <group scale={S}>
        <Gyroid script={gyro} />
      </group>
    </>
  )
}

const P = [-1.2, 0.1, 0] // the one point (0-cell), in beat A
const loop = (cx, cz, r, n = 64, lift = 0.1) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cz + r * Math.sin((i / n) * 2 * Math.PI), lift])

export default function CellsLesson({ tRef }) {
  // per-beat fold clocks for the holograms
  const kSphere = useRef(0)
  const kTorus = useRef(0)
  const kRp2 = useRef(0)
  const gA = useRef()
  const gSphere = useRef()
  const gTorus = useRef()
  const gRp2 = useRef()
  const gDemo = useRef()
  const point = useRef()
  const disk = useRef()
  useFrame(() => {
    const t = tRef.current
    kSphere.current = smooth(seg(t, 14.5, 19))
    kTorus.current = smooth(seg(t, 26, 32.5))
    kRp2.current = smooth(seg(t, 37, 42))
    gA.current.visible = t < 12
    gSphere.current.visible = (t >= 12 && t < 22) || (t >= 44 && t < 52)
    gTorus.current.visible = (t >= 22 && t < 34) || t >= 66
    gDemo.current.visible = t >= 52 && t < 66
    gRp2.current.visible = t >= 34 && t < 44
    point.current.visible = t >= 1 && t < 12
    point.current.scale.setScalar(smooth(seg(t, 1, 2)))
    disk.current.visible = t >= 8 && t < 12
    disk.current.scale.setScalar(Math.max(0.01, smooth(seg(t, 8, 9.5))))
  })
  // beat A: the two loops (edges a, b) grow out of the point; then a disk fills loop a
  const edgeLoop = (i, t0) => () => {
    const t = tRef.current
    if (t < t0 || t >= 12) return null
    const k = smooth(seg(t, t0, t0 + 1.6))
    const cx = P[0] + (i === 0 ? -1.1 : 1.1)
    const pts = loop(cx, P[2], 1.1, 64).map(([x, z]) => [x, z, P[1]])
    // start at the point and sweep round
    const start = i === 0 ? 0 : 32
    const rot = [...pts.slice(start), ...pts.slice(1, start + 1)]
    return rot.slice(0, Math.max(2, Math.round(k * rot.length)))
  }
  return (
    <>
      <color attach="background" args={['#0a0708']} />
      <fog attach="fog" args={['#0a0708', 16, 40]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#ffb27a', '#120808', 0.5]} />
      <directionalLight position={[-4, 10, 8]} intensity={1.1} color="#ffe2c4" />
      <pointLight position={[1, 4, 3]} intensity={10} distance={14} color="#ff9a4a" />
      <Stars radius={60} depth={30} count={700} factor={2} fade speed={0.2} />
      <Sparkles count={120} scale={[16, 6, 10]} position={[1, 2, 0]} size={2.4} speed={0.4} color="#ffb070" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#140d0b" roughness={0.85} emissive="#2a0c04" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[1.2, -0.3, 0]}>
        <cylinderGeometry args={[4.2, 4.4, 0.4, 48]} />
        <meshStandardMaterial color="#2a2c36" roughness={0.6} />
      </mesh>

      {/* A: X⁰ ⊂ X¹ ⊂ X² */}
      <group ref={gA}>
        <mesh ref={point} position={P}>
          <sphereGeometry args={[0.16, 20, 14]} />
          <meshBasicMaterial color="#fff2c4" toneMapped={false} />
        </mesh>
        <LiveLine getPts={edgeLoop(0, 3.4)} color={LETTER_COLORS[0]} width={6} />
        <LiveLine getPts={edgeLoop(1, 5)} color={LETTER_COLORS[1]} width={6} />
        <mesh ref={disk} position={[P[0] - 1.1, P[1] + 0.02, P[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.1, 48]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ff9a2a" emissiveIntensity={0.4} transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* B and E: the sphere */}
      <group ref={gSphere} position={[0.4, 0.2, 0]}>
        <Hologram kind="sphere" kRef={kSphere} />
      </group>
      {/* C and F, G: the torus */}
      <group ref={gTorus} position={[0.4, 0.4, 0]} scale={0.9}>
        <Hologram kind="torus" kRef={kTorus} />
      </group>
      {/* D: the projective plane */}
      <group ref={gRp2} position={[0.4, 0.2, 0]}>
        <Hologram kind="rp2" kRef={kRp2} word={[{ e: 0, s: 1 }, { e: 0, s: 1 }]} />
      </group>

      {/* F: Gyroid works a furnace */}
      <group ref={gDemo}>
        <Demo tRef={tRef} />
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
const INK = '#e8eefc'
const DIM = '#5c6680'
const PINK = '#ff8ad8' // math is pink everywhere
const MATH = { fontFamily: "'Cambria Math', 'STIX Two Math', serif" }
const A = LETTER_COLORS[0]
const B = LETTER_COLORS[1]

function Arrow({ x1, y1, x2, y2, color }) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const l = Math.hypot(dx, dy)
  const ux = dx / l
  const uy = dy / l
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="3.5" />
      <polygon points={`${mx + ux * 7},${my + uy * 7} ${mx - ux * 5 - uy * 6},${my - uy * 5 + ux * 6} ${mx - ux * 5 + uy * 6},${my - uy * 5 - ux * 6}`} fill={color} />
    </g>
  )
}

function Diagram({ t }) {
  if (t < 12) {
    const stage = t < 3.4 ? 0 : t < 8 ? 1 : 2
    const row = (i, label, text) => (
      <g key={i} opacity={stage >= i ? 1 : 0.3}>
        <text x="20" y={40 + i * 42} fill={stage === i ? GOLD : INK} fontSize="17" style={MATH}>
          {label}
        </text>
        <text x="70" y={40 + i * 42} fill="#9fb0d0" fontSize="13">
          {text}
        </text>
      </g>
    )
    return (
      <svg viewBox="0 0 260 170" className="lesson-svg">
        {row(0, 'X⁰', 'points — the 0-cells')}
        {row(1, 'X¹', 'edges, glued by their ends')}
        {row(2, 'X²', 'disks, glued along loops')}
        <text x="130" y="160" textAnchor="middle" fill={PINK} fontSize="15" style={MATH}>
          X⁰ ⊂ X¹ ⊂ X²
        </text>
      </svg>
    )
  }
  if (t < 22)
    return (
      <svg viewBox="0 0 260 170" className="lesson-svg">
        <circle cx="80" cy="80" r="40" fill="rgba(255,210,122,0.18)" stroke={GOLD} strokeWidth="2.5" strokeDasharray="5 4" />
        <circle cx="80" cy="40" r="5" fill={GOLD} />
        <text x="80" y="140" textAnchor="middle" fill="#9fb0d0" fontSize="12">
          its whole rim → the point
        </text>
        <text x="190" y="72" textAnchor="middle" fill={PINK} fontSize="16" style={MATH}>
          e⁰ ∪ e²
        </text>
        <text x="190" y="100" textAnchor="middle" fill={PINK} fontSize="18" style={MATH}>
          = S²
        </text>
      </svg>
    )
  if (t < 34)
    return (
      <svg viewBox="0 0 260 180" className="lesson-svg">
        <rect x="40" y="30" width="100" height="100" fill="rgba(255,210,122,0.18)" />
        <Arrow x1={40} y1={130} x2={140} y2={130} color={A} />
        <Arrow x1={40} y1={30} x2={140} y2={30} color={A} />
        <Arrow x1={40} y1={130} x2={40} y2={30} color={B} />
        <Arrow x1={140} y1={130} x2={140} y2={30} color={B} />
        <text x="90" y="150" textAnchor="middle" fill={A} fontSize="14" fontWeight="700">
          a
        </text>
        <text x="90" y="22" textAnchor="middle" fill={A} fontSize="14" fontWeight="700">
          a
        </text>
        <text x="28" y="84" fill={B} fontSize="14" fontWeight="700">
          b
        </text>
        <text x="148" y="84" fill={B} fontSize="14" fontWeight="700">
          b
        </text>
        <text x="210" y="70" textAnchor="middle" fill={PINK} fontSize="15" style={MATH}>
          a b a⁻¹ b⁻¹
        </text>
        <text x="210" y="100" textAnchor="middle" fill={PINK} fontSize="18" style={MATH}>
          = T²
        </text>
        <text x="130" y="172" textAnchor="middle" fill="#9fb0d0" fontSize="12">
          matching arrows glue together
        </text>
      </svg>
    )
  if (t < 44)
    return (
      <svg viewBox="0 0 260 170" className="lesson-svg">
        <circle cx="80" cy="80" r="44" fill="rgba(255,210,122,0.18)" stroke={A} strokeWidth="3.5" />
        <polygon points="80,30 72,40 88,40" fill={A} transform="rotate(90 80 36)" />
        <polygon points="80,130 72,120 88,120" fill={A} transform="rotate(90 80 124)" />
        <text x="80" y="22" textAnchor="middle" fill={A} fontSize="14" fontWeight="700">
          a
        </text>
        <text x="80" y="148" textAnchor="middle" fill={A} fontSize="14" fontWeight="700">
          a
        </text>
        <text x="190" y="70" textAnchor="middle" fill={PINK} fontSize="16" style={MATH}>
          a a
        </text>
        <text x="190" y="100" textAnchor="middle" fill={PINK} fontSize="18" style={MATH}>
          = ℝP²
        </text>
        <text x="190" y="128" textAnchor="middle" fill="#9fb0d0" fontSize="11">
          crosses itself in 3D
        </text>
      </svg>
    )
  if (t < 52)
    return (
      <svg viewBox="0 0 260 180" className="lesson-svg">
        <text x="130" y="32" textAnchor="middle" fill={PINK} fontSize="17" style={MATH}>
          χ = points − edges + disks
        </text>
        {[
          ['sphere', '1 − 0 + 1', '2'],
          ['sphere (hemispheres)', '1 − 1 + 2', '2'],
          ['torus', '1 − 2 + 1', '0'],
          ['projective plane', '1 − 1 + 1', '1'],
        ].map(([n, sum, v], i) => (
          <g key={n}>
            <text x="16" y={66 + i * 26} fill="#9fb0d0" fontSize="12">
              {n}
            </text>
            <text x="160" y={66 + i * 26} fill={PINK} fontSize="14" style={MATH}>
              {sum}
            </text>
            <text x="236" y={66 + i * 26} fill={PINK} fontSize="15" style={MATH} textAnchor="end">
              {v}
            </text>
          </g>
        ))}
      </svg>
    )
  return null
}

function Steps({ t }) {
  if (t >= 66)
    return (
      <div className="lesson-steps">
        <h4>Cell complexes</h4>
        <p className="lesson-math">X⁰ ⊂ X¹ ⊂ X² ⊂ ⋯</p>
        <p className="lesson-note">points, then edges glued by their ends, then disks glued along loops</p>
        <p className="lesson-math">the word decides the space</p>
        <p className="lesson-note">a b a⁻¹ b⁻¹ torus · a a projective plane</p>
        <p className="lesson-math">χ = V − E + F</p>
      </div>
    )
  const steps = [
    ['2', 'hold the Cell-Smith; stand on the furnace', t < DEMO.point - 0.3],
    ['click', 'the furnace: forge the point', t >= DEMO.point - 0.3 && t < DEMO.edgeWalk[0]],
    ['walk', 'out round the track and back: edge a', t >= DEMO.edgeWalk[0] && t < DEMO.wordWalk[0]],
    ['walk', 'it again: write a on the disk’s rim', t >= DEMO.wordWalk[0] && t < DEMO.press - 0.2],
    ['click', 'the furnace: press the disk along a', t >= DEMO.press - 0.2 && t < 64.4],
    ['⚡', 'lash Unglues; re-walk a torn edge', t >= 64.4],
  ]
  const walked = t >= DEMO.word ? 'a' : '—'
  return (
    <div className="lesson-steps">
      <h4>✦ The Cell-Smith</h4>
      {steps.map(([k, label, on], i) => (
        <div key={i} className={`lesson-step ${on ? 'on' : ''}`}>
          <kbd>{k}</kbd>
          <span>{label}</span>
        </div>
      ))}
      <p className="lesson-note">
        walked: <b className="math">{walked}</b>
      </p>
    </div>
  )
}

/** The diagram beside the 3D demo. */
export function CellsLessonOverlay({ t }) {
  if (t >= 69.5) return null
  return <div className="lesson-card">{t >= 52 ? <Steps t={t} /> : <Diagram t={t} />}</div>
}

export { DIM }
