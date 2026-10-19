import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * The sea around the reefs, with some life in it: a gently heaving, translucent water
 * surface over a visible seabed — sand and weed patches, coral clusters, rocks, kelp that
 * sways, little schools of fish — and a few paper lanterns bobbing on the swell. Everything
 * is seeded, so a level's sea looks the same every visit.
 *
 * y: water level · area: [cx, cz, width, depth] of the detailed patch · depth: water depth
 * palette: { water, deep, sand, weed, coral: [..] } · calm: smaller waves (Mirror Shoals)
 * avoid(x, z): true where nothing should grow (e.g. under a reef, so it doesn't poke up)
 */

const DEFAULT_PALETTE = {
  water: '#0e4a52',
  deep: '#06161c',
  sand: '#3a6660',
  weed: '#1f5a40',
  coral: ['#ff7a8a', '#ffb070', '#c58bff', '#5ad6c8', '#ffd27a'],
}

function rng(seed) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}
// a smooth value noise for the seabed's patches
function noise2(seed) {
  const r = rng(seed)
  const g = Array.from({ length: 64 * 64 }, () => r())
  const at = (i, j) => g[((j & 63) << 6) | (i & 63)]
  return (x, z) => {
    const i = Math.floor(x)
    const j = Math.floor(z)
    const fx = x - i
    const fz = z - j
    const sx = fx * fx * (3 - 2 * fx)
    const sz = fz * fz * (3 - 2 * fz)
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx
    return a + (b - a) * sz
  }
}

function Seabed({ area, y, palette, seed }) {
  const geo = useMemo(() => {
    const [cx, cz, w, d] = area
    const g = new THREE.PlaneGeometry(w, d, 90, 90)
    g.rotateX(-Math.PI / 2)
    const n = noise2(seed)
    const pos = g.attributes.position
    const col = []
    const sand = new THREE.Color(palette.sand)
    const weed = new THREE.Color(palette.weed)
    const deep = new THREE.Color(palette.deep)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx
      const z = pos.getZ(i) + cz
      const big = n(x * 0.08, z * 0.08)
      const small = n(x * 0.5 + 17, z * 0.5 + 31)
      pos.setY(i, (big - 0.5) * 1.2 + (small - 0.5) * 0.25)
      c.copy(sand).lerp(weed, THREE.MathUtils.smoothstep(small, 0.45, 0.7)).lerp(deep, THREE.MathUtils.smoothstep(big, 0.55, 0.85) * 0.7)
      col.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    g.computeVertexNormals()
    return g
  }, [area, palette, seed])
  return (
    <mesh geometry={geo} position={[area[0], y, area[1]]}>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  )
}

/** Scatter `n` things over the area (skipping `avoid`), returning [x, z, r1, r2, r3]. */
function scatter(area, n, seed, avoid) {
  const r = rng(seed)
  const [cx, cz, w, d] = area
  const out = []
  for (let k = 0; k < n * 4 && out.length < n; k++) {
    const x = cx + (r() - 0.5) * w
    const z = cz + (r() - 0.5) * d
    if (avoid && avoid(x, z)) continue
    out.push([x, z, r(), r(), r()])
  }
  return out
}

function Coral({ area, y, palette, seed, avoid, count }) {
  const spots = useMemo(() => scatter(area, count, seed + 1, avoid), [area, count, seed, avoid])
  const branches = useRef()
  const knobs = useRef()
  useLayoutEffect(() => {
    const m = new THREE.Object3D()
    const c = new THREE.Color()
    let bi = 0
    let ki = 0
    spots.forEach(([x, z, a, b, cc]) => {
      c.set(palette.coral[Math.floor(cc * palette.coral.length)])
      const n = 3 + Math.floor(a * 3)
      for (let j = 0; j < n; j++) {
        const ang = (j / n) * Math.PI * 2 + b * 6
        const h = 0.45 + a * 0.6
        m.position.set(x + Math.cos(ang) * 0.12, y + h / 2, z + Math.sin(ang) * 0.12)
        m.rotation.set(Math.cos(ang) * 0.35, 0, Math.sin(ang) * 0.35)
        m.scale.set(1, h, 1)
        m.updateMatrix()
        branches.current.setMatrixAt(bi, m.matrix)
        branches.current.setColorAt(bi, c)
        bi++
        m.position.set(x + Math.cos(ang) * (0.12 + h * 0.33), y + h, z + Math.sin(ang) * (0.12 + h * 0.33))
        m.rotation.set(0, 0, 0)
        m.scale.setScalar(0.09 + b * 0.07)
        m.updateMatrix()
        knobs.current.setMatrixAt(ki, m.matrix)
        knobs.current.setColorAt(ki, c)
        ki++
      }
    })
    branches.current.count = bi
    knobs.current.count = ki
    branches.current.instanceMatrix.needsUpdate = true
    knobs.current.instanceMatrix.needsUpdate = true
    if (branches.current.instanceColor) branches.current.instanceColor.needsUpdate = true
    if (knobs.current.instanceColor) knobs.current.instanceColor.needsUpdate = true
  }, [spots, y, palette])
  const max = count * 6
  return (
    <>
      <instancedMesh ref={branches} args={[null, null, max]}>
        <cylinderGeometry args={[0.04, 0.08, 1, 6]} />
        <meshStandardMaterial roughness={0.6} emissive="#331622" emissiveIntensity={0.6} />
      </instancedMesh>
      <instancedMesh ref={knobs} args={[null, null, max]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.4} emissive="#442233" emissiveIntensity={0.9} />
      </instancedMesh>
    </>
  )
}

function Rocks({ area, y, seed, avoid, count }) {
  const spots = useMemo(() => scatter(area, count, seed + 2, avoid), [area, count, seed, avoid])
  const ref = useRef()
  useLayoutEffect(() => {
    const m = new THREE.Object3D()
    spots.forEach(([x, z, a, b, c], i) => {
      const s = 0.15 + a * 0.5
      m.position.set(x, y + s * 0.3, z)
      m.rotation.set(b * 3, c * 6, a * 2)
      m.scale.set(s * (1 + c * 0.6), s * 0.7, s)
      m.updateMatrix()
      ref.current.setMatrixAt(i, m.matrix)
    })
    ref.current.count = spots.length
    ref.current.instanceMatrix.needsUpdate = true
  }, [spots, y])
  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#1a2228" roughness={0.9} flatShading />
    </instancedMesh>
  )
}

function Kelp({ area, y, top, seed, avoid, count }) {
  const spots = useMemo(() => scatter(area, count, seed + 3, avoid), [area, count, seed, avoid])
  const ref = useRef()
  const m = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    spots.forEach(([x, z, a, b], i) => {
      const h = (top - y) * (0.5 + a * 0.45)
      m.position.set(x, y + h / 2, z)
      m.rotation.set(Math.sin(t * 0.8 + b * 6) * 0.18, b * 6, Math.cos(t * 0.6 + a * 6) * 0.18)
      m.scale.set(1, h, 1)
      m.updateMatrix()
      ref.current.setMatrixAt(i, m.matrix)
    })
    ref.current.count = spots.length
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <boxGeometry args={[0.06, 1, 0.16]} />
      <meshStandardMaterial color="#2a6a40" roughness={0.7} emissive="#0a2a14" emissiveIntensity={0.5} />
    </instancedMesh>
  )
}

function Fish({ area, y, seed, schools = 4, per = 10 }) {
  const ref = useRef()
  const plan = useMemo(() => {
    const r = rng(seed + 4)
    const [cx, cz, w, d] = area
    return Array.from({ length: schools }, () => ({ x: cx + (r() - 0.5) * w * 0.7, z: cz + (r() - 0.5) * d * 0.7, R: 2 + r() * 4, sp: (0.15 + r() * 0.2) * (r() < 0.5 ? -1 : 1), ph: r() * 6, offs: Array.from({ length: per }, () => [r() - 0.5, r() - 0.5, r() - 0.5]) }))
  }, [area, seed, schools, per])
  const m = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    let i = 0
    for (const s of plan) {
      const a = s.ph + t * s.sp
      const hx = s.x + Math.cos(a) * s.R
      const hz = s.z + Math.sin(a) * s.R
      const heading = Math.atan2(-Math.sin(a) * Math.sign(s.sp), Math.cos(a) * Math.sign(s.sp))
      for (const [ox, oy, oz] of s.offs) {
        m.position.set(hx + ox * 0.9, y + oy * 0.3, hz + oz * 0.9)
        m.rotation.set(Math.PI / 2, 0, -heading + Math.sin(t * 9 + ox * 20) * 0.25)
        m.updateMatrix()
        ref.current.setMatrixAt(i++, m.matrix)
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, schools * per]}>
      <coneGeometry args={[0.08, 0.34, 4]} />
      <meshStandardMaterial color="#cfe8ff" emissive="#4ab0c8" emissiveIntensity={0.7} metalness={0.4} roughness={0.3} />
    </instancedMesh>
  )
}

function Water({ area, y, palette, calm }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(area[2] * 1.6, area[3] * 1.6, 96, 96)
    g.rotateX(-Math.PI / 2)
    return g
  }, [area])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  const amp = calm ? 0.02 : 0.06
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      const z = base[i * 3 + 2]
      pos.array[i * 3 + 1] = amp * (Math.sin(x * 0.6 + t * 0.9) + Math.sin(z * 0.45 - t * 0.7) * 0.8 + Math.sin((x + z) * 1.3 + t * 1.6) * 0.35)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return (
    <>
      <mesh geometry={geo} position={[area[0], y, area[1]]}>
        <meshStandardMaterial color={palette.water} transparent opacity={calm ? 0.62 : 0.42} roughness={0.12} metalness={0.35} emissive={palette.water} emissiveIntensity={0.18} depthWrite={false} />
      </mesh>
      {/* the deep beyond the detailed patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[area[0], y - 0.05, area[1]]}>
        <ringGeometry args={[Math.min(area[2], area[3]) * 0.55, 260, 64, 1]} />
        <meshStandardMaterial color={palette.deep} roughness={0.3} metalness={0.5} emissive={palette.water} emissiveIntensity={0.08} />
      </mesh>
    </>
  )
}

/** Little glowing anemones dotted over the bed, pulsing slowly. */
function Anemones({ area, y, seed, avoid, count }) {
  const spots = useMemo(() => scatter(area, count, seed + 6, avoid), [area, count, seed, avoid])
  const ref = useRef()
  const cols = useMemo(() => ['#7fe8dc', '#ff8ab0', '#c58bff', '#ffe08a'].map((c) => new THREE.Color(c)), [])
  useLayoutEffect(() => {
    const m = new THREE.Object3D()
    spots.forEach(([x, z, a, b], i) => {
      m.position.set(x, y + 0.05, z)
      m.scale.setScalar(0.05 + a * 0.06)
      m.updateMatrix()
      ref.current.setMatrixAt(i, m.matrix)
      ref.current.setColorAt(i, cols[Math.floor(b * cols.length)])
    })
    ref.current.count = spots.length
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [spots, y, cols])
  useFrame(({ clock }) => {
    ref.current.material.opacity = 0.75 + Math.sin(clock.elapsedTime * 1.3) * 0.2
  })
  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial transparent toneMapped={false} />
    </instancedMesh>
  )
}

/** A couple of drifting pools of light on the seabed, like sun through the swell. */
function Caustics({ area, y }) {
  const a = useRef()
  const b = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    a.current.position.set(area[0] + Math.sin(t * 0.07) * area[2] * 0.3, y, area[1] + Math.cos(t * 0.05) * area[3] * 0.3)
    b.current.position.set(area[0] + Math.cos(t * 0.06 + 2) * area[2] * 0.3, y, area[1] + Math.sin(t * 0.08 + 1) * area[3] * 0.3)
  })
  return (
    <>
      <pointLight ref={a} color="#7fe8dc" intensity={14} distance={22} decay={1.6} />
      <pointLight ref={b} color="#9ad8ff" intensity={10} distance={18} decay={1.6} />
    </>
  )
}

function Lanterns({ area, y, seed, avoid, count }) {
  const spots = useMemo(() => scatter(area, count, seed + 5, avoid), [area, count, seed, avoid])
  const g = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current.children.forEach((c, i) => {
      const [, , a, b] = spots[i]
      c.position.y = y + 0.08 + Math.sin(t * 1.2 + a * 6) * 0.04
      c.rotation.z = Math.sin(t * 0.9 + b * 6) * 0.08
    })
  })
  return (
    <group ref={g}>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.14, 0.2, 8]} />
            <meshStandardMaterial color="#ffcf80" emissive="#ff9a3a" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 16]} />
            <meshBasicMaterial color="#ffb060" transparent opacity={0.18} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function Seascape({ y = -0.5, depth = 2.4, area: areaIn = [0, 0, 80, 70], palette = DEFAULT_PALETTE, seed = 7, calm = false, avoid = null, life = 1, lanterns = 10, bed = true }) {
  // levels pass these inline; keep them stable so nothing is rebuilt on every render
  const pk = JSON.stringify(palette)
  const ak = areaIn.join(',')
  const pal = useMemo(() => ({ ...DEFAULT_PALETTE, ...palette }), [pk]) // eslint-disable-line react-hooks/exhaustive-deps
  const area = useMemo(() => areaIn, [ak]) // eslint-disable-line react-hooks/exhaustive-deps
  const bedY = y - depth
  const n = (k) => Math.round(k * life)
  return (
    <>
      {bed && (
        <>
          <Seabed area={area} y={bedY} palette={pal} seed={seed} />
          <Coral area={area} y={bedY + 0.1} palette={pal} seed={seed} avoid={avoid} count={n(150)} />
          <Rocks area={area} y={bedY} seed={seed} avoid={avoid} count={n(80)} />
          <Kelp area={area} y={bedY} top={y - 0.25} seed={seed} avoid={avoid} count={n(120)} />
          <Anemones area={area} y={bedY} seed={seed} avoid={avoid} count={n(320)} />
          <Fish area={area} y={bedY + depth * 0.55} seed={seed} />
        </>
      )}
      <Water area={area} y={y} palette={pal} calm={calm} />
      {bed && <Caustics area={area} y={bedY + 1.2} />}
      {lanterns > 0 && <Lanterns area={area} y={y} seed={seed} avoid={avoid} count={lanterns} />}
    </>
  )
}
