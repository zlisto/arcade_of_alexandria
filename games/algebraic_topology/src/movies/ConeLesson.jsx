import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DevAdvance } from '../levels/w0/OverworldScene'
import Hologram from '../levels/w0/Hologram'
import SpaceModel from '../levels/w0/SpaceModel'

/**
 * "New Spaces from Old" (videos.json level-0-5-lesson): operations on spaces, slowly.
 *   A 0–11   the cone: a ring's tip rises; a loop on the rim slides up and vanishes at the tip
 *   B 11–22  the suspension: two points → a circle; the circle → a sphere
 *   C 22–29  the wedge: two rings glide together and touch at one point
 *   D 29–39  the product: a small ring travels round a big one, sweeping a torus
 *   E 39–47  the quotient: a disk's rim collapses to a point — a sphere
 *   F 47–56  how to play; G 56–62 summary
 * The diagram (ConeLessonOverlay) runs on the same clock.
 */

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const GOLDC = '#ffd27a'

function LessonCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const orbit = t * 0.1
    camera.position.set(1.0 + Math.sin(orbit) * 0.8, 3.4, 7.4 + Math.cos(orbit) * 0.4)
    look.set(1.0, 0.8, 0)
    camera.lookAt(look)
  })
  return null
}

const rimMat = <meshBasicMaterial color="#fff2c4" toneMapped={false} />

/** A: a loop on the cone's rim that slides up to the tip and shrinks away. */
function SlidingLoop({ tRef }) {
  const m = useRef()
  useFrame(() => {
    const t = tRef.current
    const k = smooth(seg(t, 6.5, 10))
    const h = 0.72 // the cone's height (SpaceModel's cone)
    const r = 0.45 * (1 - k)
    m.current.visible = t >= 6 && t < 11 && r > 0.01
    m.current.position.y = k * h
    m.current.scale.setScalar(Math.max(0.001, r / 0.45))
  })
  return (
    <mesh ref={m} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.45, 0.035, 10, 56]} />
      <meshBasicMaterial color="#7fd6ff" toneMapped={false} />
    </mesh>
  )
}

/** B (first half): two points sprouting arcs to a tip above and a tip below — a circle. */
function TwoPointsToCircle({ tRef }) {
  const arcs = useRef()
  const tips = useRef()
  const R = 0.5
  const geo = useMemo(() => new THREE.TorusGeometry(R, 0.028, 10, 64), [])
  useFrame(() => {
    const t = tRef.current
    const k = smooth(seg(t, 12, 15))
    arcs.current.scale.set(1, Math.max(0.001, k), 1)
    tips.current.children.forEach((c, i) => {
      c.position.y = (i ? -1 : 1) * R * k
      c.visible = k > 0.02
    })
  })
  return (
    <group position={[0, 0.6, 0]}>
      {[-R, R].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <sphereGeometry args={[0.07, 14, 10]} />
          {rimMat}
        </mesh>
      ))}
      <group ref={arcs}>
        <mesh geometry={geo}>{rimMat}</mesh>
      </group>
      <group ref={tips}>
        {[0, 1].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.07, 14, 10]} />
            <meshBasicMaterial color={GOLDC} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** C: two rings gliding together until they share one point. */
function Wedge({ tRef }) {
  const a = useRef()
  const b = useRef()
  const dot = useRef()
  useFrame(() => {
    const k = smooth(seg(tRef.current, 23, 26))
    const x = 0.4 + (1 - k) * 0.9
    a.current.position.x = -x
    b.current.position.x = x
    dot.current.visible = k > 0.98
  })
  return (
    <group position={[0, 0.6, 0]}>
      <group ref={a}>
        <mesh>
          <torusGeometry args={[0.4, 0.03, 10, 56]} />
          <meshBasicMaterial color="#ff9a5a" toneMapped={false} />
        </mesh>
      </group>
      <group ref={b}>
        <mesh>
          <torusGeometry args={[0.4, 0.03, 10, 56]} />
          <meshBasicMaterial color="#7fd6ff" toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={dot}>
        <sphereGeometry args={[0.08, 14, 10]} />
        <meshBasicMaterial color={GOLDC} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** D: a small ring carried round a big one, sweeping out the torus behind it. */
function ProductSweep({ tRef }) {
  const R = 0.6
  const r = 0.2
  const swept = useRef()
  const ring = useRef()
  const lastStep = useRef(-1)
  useFrame(() => {
    const k = smooth(seg(tRef.current, 30, 35))
    const step = Math.round(k * 64)
    if (step !== lastStep.current) {
      lastStep.current = step
      swept.current.geometry.dispose()
      swept.current.geometry = new THREE.TorusGeometry(R, r, 20, Math.max(2, step), Math.max(0.001, (step / 64) * Math.PI * 2))
      swept.current.visible = step > 0
    }
    const a = k * Math.PI * 2
    ring.current.position.set(R * Math.cos(a), R * Math.sin(a), 0)
    ring.current.rotation.set(0, 0, a)
  })
  return (
    <group position={[0, 0.6, 0]} rotation={[-Math.PI / 2 + 0.35, 0, 0]}>
      <mesh>
        <torusGeometry args={[R, 0.015, 8, 80]} />
        <meshBasicMaterial color="#ff9a5a" toneMapped={false} />
      </mesh>
      <mesh ref={swept}>
        <torusGeometry args={[R, r, 20, 2, 0.001]} />
        <meshStandardMaterial color={GOLDC} emissive="#ff9a2a" emissiveIntensity={0.4} metalness={0.3} roughness={0.35} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.025, 8, 40]} />
          <meshBasicMaterial color="#7fd6ff" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

export default function ConeLesson({ tRef }) {
  const kCone = useRef(0)
  const kSusp = useRef(0)
  const kQuot = useRef(0)
  const gA = useRef()
  const gB1 = useRef()
  const gB2 = useRef()
  const gC = useRef()
  const gD = useRef()
  const gE = useRef()
  const gG = useRef()
  useFrame(() => {
    const t = tRef.current
    kCone.current = smooth(seg(t, 1.5, 5.5))
    kSusp.current = smooth(seg(t, 16.5, 21))
    kQuot.current = smooth(seg(t, 40, 44.5))
    gA.current.visible = t < 11 || (t >= 47 && t < 56)
    gB1.current.visible = t >= 11 && t < 16.2
    gB2.current.visible = t >= 16.2 && t < 22
    gC.current.visible = t >= 22 && t < 29
    gD.current.visible = (t >= 29 && t < 39) || t >= 56
    gE.current.visible = t >= 39 && t < 47
    gG.current.visible = t >= 56
  })
  return (
    <>
      <color attach="background" args={['#070b16']} />
      <fog attach="fog" args={['#070b16', 14, 36]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#9ab8ff', '#0a0a14', 0.55]} />
      <directionalLight position={[-4, 10, 8]} intensity={1.1} color="#e8eeff" />
      <pointLight position={[1, 4, 3]} intensity={10} distance={14} color="#ffc070" />
      <Stars radius={60} depth={30} count={1000} factor={2.2} fade speed={0.3} />
      <Sparkles count={90} scale={[12, 5, 8]} position={[1, 1.5, 0]} size={2.2} speed={0.4} color="#ffe2a0" />
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[2.4, 2.6, 0.4, 48]} />
        <meshStandardMaterial color="#2a2c36" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[2.28, 2.4, 64]} />
        <meshBasicMaterial color="#d8a84a" toneMapped={false} />
      </mesh>

      <group ref={gA} scale={1.6}>
        <SpaceModel kind="cone_circle" via="cone" kRef={kCone} spin={false} />
        <SlidingLoop tRef={tRef} />
      </group>
      <group ref={gB1} scale={1.6}>
        <TwoPointsToCircle tRef={tRef} />
      </group>
      <group ref={gB2} scale={1.6}>
        <SpaceModel kind="sphere" via="suspension" kRef={kSusp} spin={false} />
      </group>
      <group ref={gC} scale={1.6}>
        <Wedge tRef={tRef} />
      </group>
      <group ref={gD} scale={1.6}>
        <ProductSweep tRef={tRef} />
      </group>
      <group ref={gE} position={[0, 0.3, 0]} scale={0.8}>
        <Hologram kind="sphere" kRef={kQuot} />
      </group>
      <group ref={gG} />

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
const SOFT = '#9fb0d0'
const PINK = '#ff8ad8' // math is pink everywhere
const MATH = { fontFamily: "'Cambria Math', 'STIX Two Math', serif" }

function Card({ title, rows, foot }) {
  return (
    <svg viewBox="0 0 260 180" className="lesson-svg">
      <text x="130" y="30" textAnchor="middle" fill={PINK} fontSize="18" style={MATH}>
        {title}
      </text>
      {rows.map(([a, b], i) => (
        <g key={i}>
          <text x="18" y={66 + i * 28} fill={PINK} fontSize="15" style={MATH}>
            {a}
          </text>
          <text x="242" y={66 + i * 28} fill={SOFT} fontSize="12" textAnchor="end">
            {b}
          </text>
        </g>
      ))}
      {foot && (
        <text x="130" y="168" textAnchor="middle" fill={SOFT} fontSize="11.5">
          {foot}
        </text>
      )}
    </svg>
  )
}

function Diagram({ t }) {
  if (t < 11) return <Card title="the cone CX" rows={[['X', 'its cells'], ['+ one cell on each', 'one dimension up'], ['+ the tip', 'one point'], ['χ(CX) = 1', 'like a point']]} foot="every cone shrinks to its tip" />
  if (t < 22) return <Card title="the suspension SX" rows={[['two tips', 'above and below'], ['+ one cell on each of X’s', 'one dimension up'], ['S(S⁰) = S¹', 'two points → circle'], ['S(S¹) = S²', 'circle → sphere']]} foot="S(Sⁿ) = Sⁿ⁺¹" />
  if (t < 29) return <Card title="the wedge X ∨ Y" rows={[['X’s cells + Y’s cells', ''], ['− one point', 'the two become one'], ['S¹ ∨ S¹', 'figure-eight: 1, 2']]} foot="glued at a single point" />
  if (t < 39)
    return (
      <Card
        title="the product X × Y"
        rows={[['e⁰ × e⁰', 'a point'], ['e⁰ × e¹, e¹ × e⁰', 'two edges'], ['e¹ × e¹', 'a disk'], ['S¹ × S¹ = T²', '1, 2, 1 · χ = 0']]}
        foot="a cell for each pair of cells"
      />
    )
  if (t < 47) return <Card title="the quotient X/A" rows={[['collapse A to a point', ''], ['D²/∂D² = S²', 'rim collapsed'], ['A a loop', 'the shape changes'], ['A contractible', 'the shape stays']]} foot="the last line: Hatcher, Proposition 0.17" />
  return null
}

function Steps({ t }) {
  if (t >= 56)
    return (
      <div className="lesson-steps">
        <h4>New spaces from old</h4>
        <p className="lesson-math">CX · SX · X ∨ Y · X × Y · X/A</p>
        <p className="lesson-note">cone, suspension, wedge, product, quotient</p>
        <p className="lesson-math">a cone shrinks to its tip</p>
        <p className="lesson-note">a plugged ring is a disk — count its cells</p>
      </div>
    )
  const steps = [
    ['2', 'hold the Cell-Smith', t < 49],
    ['click', 'a pedestal: take a copy of its space', t >= 49 && t < 50.6],
    ['click', 'the machine: feed it in', t >= 50.6 && t < 52],
    ['op', 'pick the operation (two inputs: feed two)', t >= 52 && t < 53.4],
    ['click', 'the shelf: take a result, feed it back', t >= 53.4 && t < 54.8],
    ['⚡', 'lash Coners; click a plug to pull it', t >= 54.8],
  ]
  return (
    <div className="lesson-steps">
      <h4>✦ The works</h4>
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
export function ConeLessonOverlay({ t }) {
  if (t >= 58.5) return null
  return <div className="lesson-card">{t >= 47 ? <Steps t={t} /> : <Diagram t={t} />}</div>
}
