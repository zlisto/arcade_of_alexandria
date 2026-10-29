import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// World 12's set dressing in plain three.js (the World 10–11 kit, re-coloured for a night observatory): pale marble
// flagstones on brass-inlaid grout, a star-painted ceiling on brass ribs, carved isotope doors, plaque stands, the
// magnetic arc, the dome's great lens, and the finale's hall: a star dome open to the sky over the great telescope.

export const MARBLE = '#d4d0dc', MARBLE_D = '#8a879a', BRASS = '#c8a050', NAVY = '#141a3a', IRON = '#2a2a36'

/** flagstones: an instanced grid of slightly varied marble slabs in running bond over a brass-lit grout */
export function MarbleFlags({ x0, x1, z0, z1, size = 2, base = '#cfcbd8', seed = 7 }) {
  const ref = useRef()
  const cells = useMemo(() => {
    let s = seed
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const out = []
    let row = 0
    for (let z = z0 - size / 2; z > z1; z -= size, row++) {
      for (let x = x0 - (row % 2 ? size / 2 : 0); x < x1; x += size) {
        const lo = Math.max(x, x0), hi = Math.min(x + size, x1)
        if (hi - lo > 0.2) out.push([(lo + hi) / 2, z, hi - lo, 0.82 + rnd() * 0.25, (rnd() - 0.5) * 0.02, rnd() * 0.012, rnd() < 0.1])
      }
    }
    return out
  }, [x0, x1, z0, z1, size, seed])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D(), c = new THREE.Color(base), vein = new THREE.Color('#9a94b8'), tmp = new THREE.Color()
    cells.forEach(([x, z, w, k, r, h, veined], i) => {
      d.position.set(x, -0.02 + h, z); d.rotation.set(0, r, 0); d.scale.set(w - 0.07, 1, size - 0.07); d.updateMatrix()
      m.setMatrixAt(i, d.matrix); m.setColorAt(i, tmp.copy(c).lerp(vein, veined ? 0.35 : 0).multiplyScalar(k))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [cells, base, size])
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, -0.03, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[x1 - x0, Math.abs(z0 - z1)]} /><meshStandardMaterial color="#5a4a2a" emissive="#6a4a10" emissiveIntensity={0.3} roughness={1} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} receiveShadow><boxGeometry args={[1, 0.04, 1]} /><meshStandardMaterial roughness={0.55} metalness={0.05} /></instancedMesh>
    </group>
  )
}

function useStars(n, fn, seed = 3) {
  return useMemo(() => {
    let s = seed
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const p = []
    for (let i = 0; i < n; i++) p.push(...fn(rnd))
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g
  }, [n, seed])
}

/** the hall's ceiling: night-blue panels painted with stars, on brass ribs every 8 m */
export function StarCeiling({ x = 11, z0 = 8, z1 = -110, y = 8.2 }) {
  const stars = useStars(500, (r) => [(r() * 2 - 1) * x, y - 0.05, z0 - r() * (z0 - z1)])
  const ribs = []
  for (let z = z0 - 2; z > z1; z -= 8) ribs.push(z)
  return (
    <group>
      <mesh position={[0, y, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2 * x, Math.abs(z0 - z1)]} /><meshStandardMaterial color={NAVY} emissive="#0a1030" emissiveIntensity={0.6} roughness={0.9} /></mesh>
      <points geometry={stars}><pointsMaterial color="#f0f4ff" size={2} sizeAttenuation={false} /></points>
      {ribs.map((z) => <mesh key={z} position={[0, y - 0.25, z]}><boxGeometry args={[2 * x, 0.45, 0.35]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>)}
    </group>
  )
}

/** the entrance's back wall: dressed stone round the door out to the Summit, with a brass star over the lintel */
export function EntranceWall({ x = 11, z = 8.6 }) {
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * (x + 1.6) / 2, 4, 0]} receiveShadow><boxGeometry args={[x - 1.6, 8, 0.6]} /><meshStandardMaterial color={MARBLE} roughness={0.8} /></mesh>)}
      <mesh position={[0, 6.2, 0]}><boxGeometry args={[3.2, 3.6, 0.6]} /><meshStandardMaterial color={MARBLE} roughness={0.8} /></mesh>
      <mesh position={[0, 2.2, 0.1]}><boxGeometry args={[3.2, 4.4, 0.2]} /><meshStandardMaterial color="#1a2248" emissive="#2a3a80" emissiveIntensity={0.5} /></mesh>
      {[-1.75, 1.75].map((px) => <mesh key={px} position={[px, 2.3, -0.4]} castShadow><boxGeometry args={[0.4, 4.6, 0.4]} /><meshStandardMaterial color={MARBLE_D} roughness={0.8} /></mesh>)}
      <mesh position={[0, 4.8, -0.42]}><boxGeometry args={[4.0, 0.4, 0.45]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, 5.7, -0.4]} rotation={[0, 0, Math.PI / 4]}><octahedronGeometry args={[0.35, 0]} /><meshStandardMaterial color="#fff2c0" emissive="#ffd060" emissiveIntensity={1.5} /></mesh>
    </group>
  )
}

/** a small carved plinth (top at h) in marble with a brass band */
export function Plinth({ r = 0.3, h = 0.86 }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow><boxGeometry args={[r * 2.6, 0.12, r * 2.6]} /><meshStandardMaterial color={MARBLE_D} roughness={0.8} /></mesh>
      <mesh position={[0, h / 2 + 0.02, 0]} castShadow><cylinderGeometry args={[r * 0.82, r, h - 0.2, 8]} /><meshStandardMaterial color={MARBLE} roughness={0.7} flatShading /></mesh>
      <mesh position={[0, h * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r * 0.9, 0.025, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, h - 0.03, 0]} castShadow><cylinderGeometry args={[r * 1.25, r * 1.2, 0.06, 8]} /><meshStandardMaterial color="#e8e4f0" flatShading /></mesh>
    </group>
  )
}

/** a plaque on a stand: a brass-framed tablet with two little peaks etched on it */
export function PlaqueStand({ placed }) {
  return (
    <group>
      <Plinth r={0.34} h={0.9} />
      <mesh position={[0, 1.15, 0]} rotation={[-0.25, 0, 0]}><boxGeometry args={[0.9, 0.04, 0.6]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      {!placed && <mesh position={[0, 1.42, -0.05]} rotation={[-0.35, 0, 0]} castShadow><boxGeometry args={[0.78, 0.52, 0.04]} /><meshStandardMaterial color="#efe2bc" roughness={0.8} /></mesh>}
    </group>
  )
}

/** a carved door for the isotope gallery: marble posts, a brass lintel, and a slab that sinks when `open` */
export function IsoDoor({ open }) {
  const slab = useRef()
  useFrame((_, dt) => { if (slab.current) slab.current.position.y += ((open ? -1.7 : 1.8) - slab.current.position.y) * Math.min(1, dt * 3) })
  return (
    <group>
      {[-1.7, 1.7].map((x) => <mesh key={x} position={[x, 2.1, 0]} castShadow><boxGeometry args={[0.45, 4.2, 0.6]} /><meshStandardMaterial color={MARBLE} roughness={0.75} flatShading /></mesh>)}
      <mesh position={[0, 4.35, 0]} castShadow><boxGeometry args={[3.9, 0.45, 0.7]} /><meshStandardMaterial color={MARBLE_D} roughness={0.8} /></mesh>
      <mesh position={[0, 4.6, 0]}><boxGeometry args={[4.2, 0.08, 0.8]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <group ref={slab} position={[0, 1.8, 0]}>
        <mesh castShadow><boxGeometry args={[2.9, 3.6, 0.25]} /><meshStandardMaterial color="#3a3e5a" roughness={0.7} /></mesh>
        <mesh position={[0, 0.4, 0.14]}><ringGeometry args={[0.45, 0.52, 24]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
        {[-0.25, 0.25].map((x, k) => <mesh key={k} position={[x, 0.4 + (k ? -0.05 : 0.05), 0.14]}><boxGeometry args={[0.06, k ? 0.5 : 0.6, 0.02]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>)}
      </group>
    </group>
  )
}

/** the magnetic arc (Fig 12.2): two coil yokes either side of a curved brass flight tube, ions glowing round it */
export function MagnetArc() {
  const ions = useRef([])
  useFrame(({ clock }) => ions.current.forEach((m, k) => { if (!m) return; const u = (clock.elapsedTime * 0.35 + k / 4) % 1, R = 3.2 + k * 0.45, a = Math.PI * u; m.position.set(-R * Math.cos(a), 3 + R * Math.sin(a) * 0.15, -R * Math.sin(a) * 0.6) }))
  return (
    <group>
      {[-1, 1].map((sd) => (
        <group key={sd} position={[0, 0, sd * 1.1]}>
          <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.6, 0.32, 10, 40, Math.PI]} /><meshStandardMaterial color="#9a2a2a" metalness={0.5} roughness={0.45} /></mesh>
          {[-3.6, 3.6].map((x) => <mesh key={x} position={[x, 1.5, 0]} castShadow><cylinderGeometry args={[0.55, 0.65, 3, 14]} /><meshStandardMaterial color="#b87333" metalness={0.75} roughness={0.35} /></mesh>)}
        </group>
      ))}
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.6, 0.14, 8, 40, Math.PI]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} /></mesh>
      {[0, 1, 2, 3].map((k) => <mesh key={k} ref={(r) => (ions.current[k] = r)}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color="#ff9ad0" toneMapped={false} /></mesh>)}
      <pointLight position={[0, 3.5, 0]} color="#ff7a9a" intensity={2.5} distance={9} />
    </group>
  )
}

/** the dome room's great lens: a glass disc in a brass ring on a fork mount, and a painted band of light behind it */
export function GreatLens({ lit }) {
  const ring = useRef()
  useFrame((_, dt) => { if (ring.current) ring.current.rotation.z += dt * (lit ? 0.4 : 0.1) })
  const band = ['#5a2a8a', '#3a4ac8', '#3ab0e8', '#5ae87a', '#e8e04a', '#e8903a', '#d83a3a']
  return (
    <group>
      <mesh position={[0, 0.15, 0]} receiveShadow><cylinderGeometry args={[1.5, 1.7, 0.3, 16]} /><meshStandardMaterial color={MARBLE_D} roughness={0.8} flatShading /></mesh>
      {[-1.25, 1.25].map((x) => <mesh key={x} position={[x, 2.0, 0]} castShadow><boxGeometry args={[0.2, 3.6, 0.3]} /><meshStandardMaterial color={BRASS} metalness={0.75} roughness={0.3} /></mesh>)}
      <group position={[0, 3.2, 0]}>
        <group ref={ring}><mesh><torusGeometry args={[1.1, 0.1, 10, 36]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.25} /></mesh>
          {[0, 1, 2, 3].map((k) => <mesh key={k} rotation={[0, 0, (k * Math.PI) / 2]} position={[Math.cos((k * Math.PI) / 2) * 1.1, Math.sin((k * Math.PI) / 2) * 1.1, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshStandardMaterial color="#fff0c0" emissive="#ffd060" emissiveIntensity={0.8} /></mesh>)}
        </group>
        <mesh><circleGeometry args={[1.02, 36]} /><meshStandardMaterial color="#bff4ff" emissive={lit ? '#ff4a6a' : '#3a6a8a'} emissiveIntensity={lit ? 0.8 : 0.3} transparent opacity={0.45} side={THREE.DoubleSide} /></mesh>
      </group>
      <group position={[0, 5.6, -1.4]}>
        <mesh><boxGeometry args={[11.4, 1.0, 0.12]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
        {band.map((c, i) => <mesh key={c} position={[-4.8 + i * 1.6, 0, 0.08]}><planeGeometry args={[1.58, 0.75]} /><meshBasicMaterial color={c} transparent opacity={0.75} toneMapped={false} /></mesh>)}
      </group>
    </group>
  )
}

const WALL_WIN = [-10.4, -5.2, 5.2, 10.4], WALL_PIL = [-13.4, -7.8, -2.6, 2.6, 7.8, 13.4]
/** the finale's hall: a star dome open to the sky, a stone drum round its foot, armillary rings turning overhead, and
 *  the great telescope on its pier at the far end, aimed up through the slit */
export function TelescopeHall({ center = [0, 0, -132], R = 25, x = 14, zFar = -150 }) {
  const stars = useStars(900, (r) => { const a = r() * Math.PI * 2, e = r() * 1.35 + 0.08, rr = R - 0.4; return [center[0] + Math.cos(a) * Math.cos(e) * rr, Math.sin(e) * rr, center[2] + Math.sin(a) * Math.cos(e) * rr] }, 11)
  // stars seen through the far wall's four windows (just in front of their night-blue panes)
  const winStars = useStars(220, (r) => { const px = WALL_WIN[Math.floor(r() * 4)], u = r() * 2 - 1, v = r() * 7.2; const w = v > 6 ? Math.sqrt(Math.max(0, 1 - ((v - 6) / 1.2) ** 2)) : 1; return [px + u * 1.1 * w, 0.8 + v, zFar + 0.1] }, 17)
  const rings = useRef()
  useFrame((_, dt) => { if (rings.current) rings.current.children.forEach((c, k) => { c.rotation.y += dt * (0.08 + k * 0.05); c.rotation.x += dt * 0.03 * (k - 1) }) })
  return (
    <group>
      <mesh position={center}><sphereGeometry args={[R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1a2250" emissive="#0c1440" emissiveIntensity={0.7} side={THREE.BackSide} roughness={1} /></mesh>
      <points geometry={stars}><pointsMaterial color="#f4f6ff" size={2.2} sizeAttenuation={false} /></points>
      {/* the slit: a band of open sky along the dome's spine */}
      <mesh position={[center[0], center[1], center[2]]} rotation={[0, 0, 0]}><sphereGeometry args={[R - 0.2, 8, 20, -Math.PI / 2 - 0.12, 0.24, 0, Math.PI / 2]} /><meshBasicMaterial color="#3a4a9a" side={THREE.BackSide} transparent opacity={0.7} /></mesh>
      {/* the far wall: the stone drum behind the telescope, with a brass frieze and star windows */}
      <mesh position={[0, 5, zFar - 0.3]} receiveShadow><boxGeometry args={[2 * x + 2, 10, 0.6]} /><meshStandardMaterial color="#2c3050" roughness={0.85} /></mesh>
      {[0.25, 8.4].map((y) => <mesh key={y} position={[0, y, zFar + 0.05]}><boxGeometry args={[2 * x, y < 1 ? 0.5 : 0.3, 0.16]} /><meshStandardMaterial color={y < 1 ? MARBLE_D : BRASS} metalness={y < 1 ? 0 : 0.7} roughness={0.4} /></mesh>)}
      {/* pilasters between tall arched windows of night sky, open from the floor course up */}
      {WALL_PIL.map((px) => <mesh key={px} position={[px, 4.2, zFar + 0.2]} castShadow><boxGeometry args={[0.8, 8.2, 0.5]} /><meshStandardMaterial color={MARBLE_D} roughness={0.7} /></mesh>)}
      {WALL_WIN.map((px) => <group key={px} position={[px, 0, zFar + 0.07]}>
        <mesh position={[0, 3.8, 0]}><planeGeometry args={[2.4, 6]} /><meshBasicMaterial color="#0a1238" toneMapped={false} /></mesh>
        <mesh position={[0, 6.8, 0]}><circleGeometry args={[1.2, 20, 0, Math.PI]} /><meshBasicMaterial color="#0a1238" toneMapped={false} /></mesh>
        <mesh position={[0, 6.8, 0.01]}><ringGeometry args={[1.2, 1.36, 20, 1, 0, Math.PI]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      </group>)}
      <points geometry={winStars}><pointsMaterial color="#f4f6ff" size={2} sizeAttenuation={false} /></points>
      {/* the great telescope: a pier, a fork, and the long brass tube up through the slit */}
      <group position={[0, 0, zFar + 3]}>
        <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[1.3, 1.6, 2.4, 12]} /><meshStandardMaterial color={MARBLE_D} roughness={0.8} flatShading /></mesh>
        {[-0.9, 0.9].map((px) => <mesh key={px} position={[px, 3.2, 0]} castShadow><boxGeometry args={[0.3, 1.8, 0.6]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} /></mesh>)}
        <group position={[0, 3.9, 0]} rotation={[0.35, 0, 0]}>
          <mesh position={[0, 3.2, 0]} castShadow><cylinderGeometry args={[0.55, 0.75, 9, 20]} /><meshStandardMaterial color={BRASS} metalness={0.85} roughness={0.25} /></mesh>
          {[0, 2.4, 4.8, 7.2].map((y) => <mesh key={y} position={[0, y - 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.06, 6, 20]} /><meshStandardMaterial color="#8a6a30" metalness={0.8} roughness={0.35} /></mesh>)}
          <mesh position={[0, 7.75, 0]}><circleGeometry args={[0.5, 20]} /><meshBasicMaterial color="#bff4ff" toneMapped={false} side={THREE.DoubleSide} /></mesh>
        </group>
      </group>
      {/* armillary rings turning high over the floor */}
      <group ref={rings} position={[center[0], 10.5, center[2] + 2]}>
        {[3.2, 4.0, 4.8].map((r) => <mesh key={r}><torusGeometry args={[r, 0.07, 8, 48]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} emissive="#6a4a10" emissiveIntensity={0.3} /></mesh>)}
      </group>
      {/* a balustrade round the fight floor's edge */}
      {[-1, 1].map((sd) => <group key={sd}>
        <mesh position={[sd * (x - 0.6), 0.5, (center[2] + zFar) / 2 + 9]}><boxGeometry args={[0.35, 1.0, 36]} /><meshStandardMaterial color={MARBLE_D} roughness={0.8} /></mesh>
        <mesh position={[sd * (x - 0.6), 1.05, (center[2] + zFar) / 2 + 9]}><boxGeometry args={[0.5, 0.1, 36]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      </group>)}
      <pointLight position={[0, 7, center[2]]} color="#c8d4ff" intensity={14} distance={34} />
    </group>
  )
}

/** the Crown of Tetravalence re-forming: twelve shards spiral in round Kai and fuse into a crown that hovers */
export function CrownBeat({ at, on }) {
  const g = useRef(), crown = useRef(), shards = useRef([]), t0 = useRef(null)
  useFrame(({ clock }) => {
    if (!g.current || !on) return
    if (t0.current === null) t0.current = clock.elapsedTime
    const t = clock.elapsedTime - t0.current
    shards.current.forEach((m, k) => {
      if (!m) return
      const a = (k / 12) * Math.PI * 2 + t * 2.2, r = Math.max(0, 1.8 - t * 0.7), y = 1.2 + Math.min(1.6, t * 0.6)
      m.visible = t < 2.7
      m.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
      m.rotation.y = a
    })
    if (crown.current) { const k = Math.min(1, Math.max(0, (t - 2.4) / 0.6)); crown.current.visible = k > 0; crown.current.scale.setScalar(0.01 + k * 0.99); crown.current.rotation.y = t * 0.6; crown.current.position.y = 2.9 + Math.sin(t * 1.5) * 0.08 }
  })
  if (!on) return null
  return (
    <group ref={g} position={at}>
      {Array.from({ length: 12 }).map((_, k) => <mesh key={k} ref={(r) => (shards.current[k] = r)}><cylinderGeometry args={[0.05, 0.05, 0.5, 6]} /><meshStandardMaterial color="#ffe08a" emissive="#ffcf4a" emissiveIntensity={3} toneMapped={false} /></mesh>)}
      <group ref={crown} visible={false}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.42, 0.07, 10, 32]} /><meshStandardMaterial color="#ffd870" metalness={0.9} roughness={0.2} emissive="#ffb030" emissiveIntensity={1.2} /></mesh>
        {[0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.42, 0.2, Math.sin(a) * 0.42]}><coneGeometry args={[0.08, 0.38, 6]} /><meshStandardMaterial color="#ffd870" metalness={0.9} roughness={0.2} emissive="#ffb030" emissiveIntensity={1.2} /></mesh> })}
        {[0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; return <mesh key={'g' + k} position={[Math.cos(a) * 0.44, 0.02, Math.sin(a) * 0.44]}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh> })}
        <pointLight color="#ffd76a" intensity={6} distance={8} />
      </group>
    </group>
  )
}
