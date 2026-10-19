import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * A small glowing model of a space from the Cone Zone's table (spaces.js keys), with a
 * "birth" animation driven by kRef (0 → 1) when a machine makes it:
 *   cone_circle — the tip rises out of the ring, pulling it into a cone
 *   sphere      — (from suspension) a double cone grows above and below the circle, then rounds out
 * everything else grows in and settles.
 */

const GOLD = '#ffd27a'
const mat = (opacity = 0.62) => (
  <meshStandardMaterial color={GOLD} emissive="#ff9a2a" emissiveIntensity={0.4} metalness={0.3} roughness={0.35} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
)
const wire = () => <meshBasicMaterial color="#fff2c4" wireframe transparent opacity={0.16} toneMapped={false} />
const rim = () => <meshBasicMaterial color="#fff2c4" toneMapped={false} />
const smooth = (x) => x * x * (3 - 2 * x)

const R = 0.45

function Dot({ p = [0, 0, 0], r = 0.07 }) {
  return (
    <mesh position={p}>
      <sphereGeometry args={[r, 14, 10]} />
      {rim()}
    </mesh>
  )
}
function Ring({ r = R, p = [0, 0, 0], rot = [Math.PI / 2, 0, 0], tube = 0.028 }) {
  return (
    <mesh position={p} rotation={rot}>
      <torusGeometry args={[r, tube, 10, 56]} />
      {rim()}
    </mesh>
  )
}
function Rod({ a, b, r = 0.025 }) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
  const len = v.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize())
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[r, r, len, 8]} />
      {rim()}
    </mesh>
  )
}

/** A circle pulled up into a cone as its tip rises (k: 0 flat disk → 1 cone). */
function ConeMorph({ kRef }) {
  const geo = useMemo(() => new THREE.ConeGeometry(R, 1, 48, 1, true), [])
  const g = useRef()
  const tip = useRef()
  useFrame(() => {
    const h = 0.02 + 0.7 * smooth(kRef.current)
    g.current.scale.set(1, h, 1)
    g.current.position.y = h / 2
    tip.current.position.y = h
  })
  return (
    <>
      <group ref={g}>
        <mesh geometry={geo}>{mat()}</mesh>
        <mesh geometry={geo}>{wire()}</mesh>
      </group>
      <Ring />
      <group ref={tip}>
        <Dot />
      </group>
    </>
  )
}

/** A circle suspended: tips grow above and below (a double cone), then it rounds into a sphere. */
function SuspensionMorph({ kRef }) {
  const N = 40
  const { geo, U, ANG } = useMemo(() => {
    const pts = Array.from({ length: N + 1 }, (_, i) => new THREE.Vector2(0.01, -R + (2 * R * i) / N))
    const g = new THREE.LatheGeometry(pts, 48)
    const pos = g.attributes.position
    // each vertex's height (−1 … 1) and angle, kept from the start (the positions get rewritten)
    const u = new Float32Array(pos.count)
    const ang = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      u[i] = Math.max(-1, Math.min(1, pos.getY(i) / R))
      ang[i] = Math.atan2(pos.getZ(i), pos.getX(i))
    }
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.2)
    return { geo: g, U: u, ANG: ang }
  }, [])
  const top = useRef()
  const bot = useRef()
  const last = useRef(-1)
  useFrame(() => {
    const k = kRef.current
    if (Math.abs(k - last.current) < 1e-4) return
    last.current = k
    const k1 = smooth(Math.min(1, k * 1.8)) // tips out
    const k2 = smooth(Math.max(0, k * 1.8 - 0.8) / 1) // round out
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const ang = ANG[i]
      const u = U[i] // −1 bottom … 1 top
      // double cone: radius R(1 − |u|), height ±R·k1 ; sphere: radius R√(1−u²)
      const rCone = R * (1 - Math.abs(u))
      const rSph = R * Math.sqrt(Math.max(0, 1 - u * u))
      const rr = rCone + (rSph - rCone) * k2
      pos.setXYZ(i, rr * Math.cos(ang), u * R * Math.max(0.02, k1), rr * Math.sin(ang))
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    top.current.position.y = R * Math.max(0.02, k1)
    bot.current.position.y = -R * Math.max(0.02, k1)
  })
  return (
    <group position={[0, R, 0]}>
      <mesh geometry={geo}>{mat()}</mesh>
      <mesh geometry={geo}>{wire()}</mesh>
      <Ring />
      <group ref={top}>
        <Dot />
      </group>
      <group ref={bot}>
        <Dot />
      </group>
    </group>
  )
}

function Static({ k }) {
  switch (k) {
    case 'point':
      return <Dot p={[0, 0.3, 0]} r={0.1} />
    case 's0':
      return (
        <>
          <Dot p={[-0.3, 0.3, 0]} r={0.1} />
          <Dot p={[0.3, 0.3, 0]} r={0.1} />
        </>
      )
    case 'interval':
      return (
        <>
          <Dot p={[-0.4, 0.3, 0]} />
          <Dot p={[0.4, 0.3, 0]} />
          <Rod a={[-0.4, 0.3, 0]} b={[0.4, 0.3, 0]} />
        </>
      )
    case 'circle':
      return <Ring p={[0, 0.3, 0]} />
    case 'disk':
      return (
        <group position={[0, 0.3, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[R, 48]} />
            {mat()}
          </mesh>
          <Ring />
        </group>
      )
    case 'vee':
      return (
        <>
          <Dot p={[-0.35, 0.05, 0]} />
          <Dot p={[0.35, 0.05, 0]} />
          <Dot p={[0, 0.7, 0]} />
          <Rod a={[-0.35, 0.05, 0]} b={[0, 0.7, 0]} />
          <Rod a={[0.35, 0.05, 0]} b={[0, 0.7, 0]} />
        </>
      )
    case 'sphere':
    case 'sphere_q':
      return (
        <group position={[0, R, 0]}>
          <mesh>
            <sphereGeometry args={[R, 32, 20]} />
            {mat()}
          </mesh>
          <mesh>
            <sphereGeometry args={[R, 16, 10]} />
            {wire()}
          </mesh>
        </group>
      )
    case 's3':
      return (
        <group position={[0, R, 0]}>
          <mesh>
            <sphereGeometry args={[R, 32, 20]} />
            {mat(0.4)}
          </mesh>
          <mesh>
            <sphereGeometry args={[R * 0.55, 24, 16]} />
            {mat(0.7)}
          </mesh>
          <mesh>
            <sphereGeometry args={[R * 0.25, 16, 10]} />
            {rim()}
          </mesh>
        </group>
      )
    case 'eight':
      return (
        <>
          <Ring r={0.3} p={[-0.3, 0.4, 0]} rot={[0, 0, 0]} />
          <Ring r={0.3} p={[0.3, 0.4, 0]} rot={[0, 0, 0]} />
          <Dot p={[0, 0.4, 0]} r={0.06} />
        </>
      )
    case 'two_circles':
      return (
        <>
          <Ring r={0.26} p={[-0.38, 0.36, 0]} rot={[0, 0, 0]} />
          <Ring r={0.26} p={[0.38, 0.36, 0]} rot={[0, 0, 0]} />
        </>
      )
    case 'torus':
      return (
        <group position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <torusGeometry args={[0.36, 0.15, 24, 48]} />
            {mat()}
          </mesh>
          <mesh>
            <torusGeometry args={[0.36, 0.15, 12, 24]} />
            {wire()}
          </mesh>
        </group>
      )
    case 'cylinder':
      return (
        <group position={[0, 0.4, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.6, 40, 1, true]} />
            {mat()}
          </mesh>
          <Ring r={0.3} p={[0, 0.3, 0]} />
          <Ring r={0.3} p={[0, -0.3, 0]} />
        </group>
      )
    case 'sphere_circle':
      return (
        <>
          <group position={[-0.18, 0.36, 0]}>
            <mesh>
              <sphereGeometry args={[0.32, 28, 18]} />
              {mat()}
            </mesh>
          </group>
          <Ring r={0.26} p={[0.4, 0.36, 0]} rot={[0, 0, 0]} />
        </>
      )
    case 'cone_circle':
      return (
        <group>
          <mesh position={[0, 0.36, 0]}>
            <coneGeometry args={[R, 0.72, 48, 1, true]} />
            {mat()}
          </mesh>
          <Ring />
          <Dot p={[0, 0.72, 0]} />
        </group>
      )
    default:
      return (
        <mesh position={[0, 0.35, 0]}>
          <icosahedronGeometry args={[0.3, 1]} />
          {mat()}
        </mesh>
      )
  }
}

/**
 * kind: a specimen key; kRef: birth animation 0 → 1 (omit for a settled model);
 * via: the operation that made it ('cone' | 'suspension' | …), for the special morphs.
 */
export default function SpaceModel({ kind, kRef, via, spin = true }) {
  const g = useRef()
  useFrame(({ clock }) => {
    if (!g.current) return
    const k = kRef ? kRef.current : 1
    if (spin) g.current.rotation.y = clock.elapsedTime * 0.6
    const s = via === 'cone' || via === 'suspension' ? 1 : 0.2 + 0.8 * smooth(k)
    g.current.scale.setScalar(s)
  })
  if (!kind) return null
  let body = <Static k={kind} />
  if (kRef && via === 'cone' && kind === 'cone_circle') body = <ConeMorph kRef={kRef} />
  if (kRef && via === 'suspension' && kind === 'sphere') body = <SuspensionMorph kRef={kRef} />
  return <group ref={g}>{body}</group>
}
