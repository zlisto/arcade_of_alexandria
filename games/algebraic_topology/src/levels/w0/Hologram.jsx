import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { LiveLine } from './FlatsScenery'

/**
 * The Foundry press's hologram: the flat cells you glued, folding into the space they
 * make. `kRef.current` runs 0 (flat) → 1 (folded). Kinds:
 *   sphere   — a disk whose whole rim is crushed to one point (curls into a ball)
 *   hemi     — two disks glued along one equator (two bowls closing into a ball)
 *   disk     — a disk glued along a loop walked once (it just fills the loop)
 *   torus    — a square, edges a b a⁻¹ b⁻¹: rolls into a tube, the tube bends into a ring
 *   klein    — a square, edges a b a⁻¹ b: can't close up in 3D without passing through
 *              itself (shown as the figure-eight immersion)
 *   rp2      — a disk on a a: likewise only sits in 3D crossing itself (Steiner's
 *              Roman surface, a map of the projective plane into space)
 *   pinched  — a disk on a a⁻¹ with both ends of a at the one point: a sphere with two
 *              points glued (shown as a horn torus)
 * Square edges are drawn in their letters' colors so you can watch matching arrows meet.
 */

export const LETTER_COLORS = ['#ff9a5a', '#7fd6ff', '#c9a7ff', '#9cf0a0']
const N = 44
const smooth = (x) => x * x * (3 - 2 * x)
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

// ---- disk-parametrized surfaces: (r ∈ [0,1], φ ∈ [0,2π)) → R³

const R = 1.3 // the flat disk's radius / the square's half-side
const flatDisk = (r, ph) => [R * r * Math.cos(ph), 0, R * r * Math.sin(ph)]

/** A disk curled into a spherical cap spanning polar angle `ext` (arc length kept). */
function cap(r, ph, ext) {
  if (ext < 1e-3) return flatDisk(r, ph)
  const rho = R / ext
  const th = ext * r
  return [rho * Math.sin(th) * Math.cos(ph), rho * (1 - Math.cos(th)), rho * Math.sin(th) * Math.sin(ph)]
}

const DISK_SURFACES = {
  sphere: (r, ph, k) => cap(r, ph, Math.PI * smooth(k)),
  disk: (r, ph, k) => cap(r, ph, 0.9 * smooth(k)),
  rp2: (r, ph, k) => {
    // flat → hemisphere (k < ½) → Roman surface (k > ½): (x, y, z) ↦ (yz, xz, xy) on the hemisphere
    const k1 = smooth(Math.min(1, k * 2))
    const k2 = smooth(Math.max(0, k * 2 - 1))
    const th = (Math.PI / 2) * r
    const hx = Math.sin(th) * Math.cos(ph)
    const hz = Math.sin(th) * Math.sin(ph)
    const hy = Math.cos(th)
    const hemi = [hx * R, (1 - hy) * R, hz * R]
    const roman = [hz * hy * R * 2.2, hx * hz * R * 2.2 + 0.6, hx * hy * R * 2.2]
    return lerp3(lerp3(flatDisk(r, ph), hemi, k1), roman, k2)
  },
  pinched: (r, ph, k) => {
    const k1 = smooth(Math.min(1, k * 2))
    const k2 = smooth(Math.max(0, k * 2 - 1))
    const ball = cap(r, ph, Math.PI * k1)
    const v = Math.PI * (2 * r - 1)
    const a = R * 0.55
    const horn = [a * (1 + Math.cos(v)) * Math.cos(ph), a * Math.sin(v) + R * 0.6, a * (1 + Math.cos(v)) * Math.sin(ph)]
    return lerp3(ball, horn, k2)
  },
}

// ---- square-parametrized surfaces: (u, v ∈ [0,1]) → R³

const flatSquare = (u, v) => [R * (2 * u - 1), 0, R * (2 * v - 1)]

/** Roll the square's v-direction into a tube (k1), then bend the tube's axis into a ring (k2). */
function torusFold(u, v, k) {
  const k1 = smooth(Math.min(1, k * 2))
  const k2 = smooth(Math.max(0, k * 2 - 1))
  const L = 2 * R
  // roll: v ↦ angle around a tube whose axis runs along x
  let y
  let z
  if (k1 < 1e-3) {
    y = 0
    z = R * (2 * v - 1)
  } else {
    const rt = L / (2 * Math.PI * k1)
    const a = 2 * Math.PI * k1 * (v - 0.5)
    y = rt * (1 - Math.cos(a))
    z = rt * Math.sin(a)
  }
  const x = R * (2 * u - 1)
  if (k2 < 1e-3) return [x, y, z]
  // bend: the tube's axis curls into a ring in the x–z plane (ring radius ends 1.8× the tube's);
  // each cross-section rides along, its z-offset pointing out from the ring's center
  const rt1 = L / (2 * Math.PI)
  const Rb = (1.8 * rt1) / k2
  const b = 2 * Math.PI * k2 * (u - 0.5)
  return [(Rb + z) * Math.sin(b), y, (Rb + z) * Math.cos(b) - Rb]
}

function klein(u, v, k) {
  const U = 2 * Math.PI * u
  const V = 2 * Math.PI * v
  const r = 1.6
  const w = r + Math.cos(U / 2) * Math.sin(V) - Math.sin(U / 2) * Math.sin(2 * V)
  const target = [w * Math.cos(U) * 0.55, (Math.sin(U / 2) * Math.sin(V) + Math.cos(U / 2) * Math.sin(2 * V)) * 0.55 + 1.2, w * Math.sin(U) * 0.55]
  return lerp3(flatSquare(u, v), target, smooth(k))
}

const SQUARE_SURFACES = { torus: torusFold, klein }

/** Two disks closing onto one equator (the sphere as two hemispheres). */
function hemi(i, r, ph, k) {
  const sgn = i === 0 ? 1 : -1
  const flat = [R * r * Math.cos(ph), sgn * 0.7, R * r * Math.sin(ph)]
  const th = (Math.PI / 2) * (1 - r)
  const ball = [R * Math.sin(Math.PI / 2 - th) * Math.cos(ph), sgn * R * Math.cos(Math.PI / 2 - th), R * Math.sin(Math.PI / 2 - th) * Math.sin(ph)]
  return lerp3(flat, ball, smooth(k))
}

function Surface({ fn, kRef, square, color = '#ffd27a' }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array((N + 1) * (N + 1) * 3)
    const idx = []
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const a = i * (N + 1) + j
        const b = a + 1
        const c = a + N + 1
        const d = c + 1
        idx.push(a, c, b, b, c, d)
      }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setIndex(idx)
    return g
  }, [])
  const last = useRef(-1)
  useFrame(() => {
    const k = kRef.current
    if (Math.abs(k - last.current) < 1e-4) return
    last.current = k
    const pos = geo.attributes.position.array
    let o = 0
    for (let i = 0; i <= N; i++)
      for (let j = 0; j <= N; j++) {
        const p = square ? fn(i / N, j / N, k) : fn(i / N, (j / N) * Math.PI * 2, k)
        pos[o++] = p[0]
        pos[o++] = p[1]
        pos[o++] = p[2]
      }
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
  })
  return (
    <>
      <mesh geometry={geo}>
        <meshStandardMaterial color={color} emissive="#ff9a2a" emissiveIntensity={0.35} metalness={0.3} roughness={0.35} transparent opacity={0.62} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh geometry={geo}>
        <meshBasicMaterial color="#fff2c4" wireframe transparent opacity={0.12} toneMapped={false} />
      </mesh>
    </>
  )
}

/** The square's four sides in their letters' colors, folding with it. */
function SquareEdges({ fn, kRef }) {
  const side = (which) => () => {
    const k = kRef.current
    return Array.from({ length: 41 }, (_, i) => {
      const t = i / 40
      const [u, v] = which === 'u0' ? [0, t] : which === 'u1' ? [1, t] : which === 'v0' ? [t, 0] : [t, 1]
      const p = fn(u, v, k)
      return [p[0], p[2], p[1] + 0.01]
    })
  }
  return (
    <>
      <LiveLine getPts={side('v0')} color={LETTER_COLORS[0]} width={4} />
      <LiveLine getPts={side('v1')} color={LETTER_COLORS[0]} width={4} />
      <LiveLine getPts={side('u0')} color={LETTER_COLORS[1]} width={4} />
      <LiveLine getPts={side('u1')} color={LETTER_COLORS[1]} width={4} />
    </>
  )
}

/** The disk's rim in the colors of the letters it's glued along. */
function DiskRim({ fn, kRef, word }) {
  const seg = (i) => () => {
    const k = kRef.current
    const n = Math.max(1, word.length)
    return Array.from({ length: 31 }, (_, j) => {
      const ph = ((i + j / 30) / n) * Math.PI * 2
      const p = fn(1, ph, k)
      return [p[0], p[2], p[1] + 0.01]
    })
  }
  return (word.length ? word : [{ e: -1 }]).map((l, i) => <LiveLine key={i} getPts={seg(i)} color={l.e >= 0 ? LETTER_COLORS[l.e] : '#ffd27a'} width={4} />)
}

export default function Hologram({ kind, kRef, word = [] }) {
  if (!kind) return null
  if (kind === 'hemi')
    return (
      <>
        {[0, 1].map((i) => (
          <Surface key={i} fn={(r, ph, k) => hemi(i, r, ph, k)} kRef={kRef} />
        ))}
        <DiskRim fn={(r, ph, k) => hemi(0, r, ph, k)} kRef={kRef} word={[{ e: 0 }]} />
      </>
    )
  if (SQUARE_SURFACES[kind])
    return (
      <>
        <Surface fn={SQUARE_SURFACES[kind]} kRef={kRef} square />
        <SquareEdges fn={SQUARE_SURFACES[kind]} kRef={kRef} />
      </>
    )
  const fn = DISK_SURFACES[kind] || DISK_SURFACES.disk
  return (
    <>
      <Surface fn={fn} kRef={kRef} />
      <DiskRim fn={fn} kRef={kRef} word={kind === 'sphere' ? [] : word} />
    </>
  )
}
