import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Background set dressing shared by the levels: soft clouds, turning gears, floating rocks,
 * glowing lava channels. Purely decorative; all seeded.
 */

function rng(seed) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

let puffTex = null
function puffTexture() {
  if (puffTex) return puffTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  grd.addColorStop(0, 'rgba(255,255,255,0.9)')
  grd.addColorStop(0.5, 'rgba(255,255,255,0.35)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  puffTex = new THREE.CanvasTexture(c)
  return puffTex
}

/** Soft drifting clouds: clusters of puffs, flat-ish, at height y over an area. */
export function Clouds({ y = -3, area = [0, 0, 80, 80], count = 14, color = '#c8d4ff', opacity = 0.35, seed = 3, speed = 0.3 }) {
  const puffs = useMemo(() => {
    const r = rng(seed)
    const out = []
    for (let i = 0; i < count; i++) {
      const cx = area[0] + (r() - 0.5) * area[2]
      const cz = area[1] + (r() - 0.5) * area[3]
      const n = 3 + Math.floor(r() * 4)
      for (let j = 0; j < n; j++) out.push([cx + (r() - 0.5) * 6, y + (r() - 0.5) * 0.6, cz + (r() - 0.5) * 3, 3 + r() * 4])
    }
    return out
  }, [y, area, count, seed])
  const g = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current.children.forEach((m, i) => {
      const p = puffs[i]
      let x = p[0] + t * speed
      const w = area[2]
      x = ((((x - area[0] + w / 2) % w) + w) % w) - w / 2 + area[0]
      m.position.set(x, p[1], p[2])
    })
  })
  const tex = puffTexture()
  return (
    <group ref={g}>
      {puffs.map(([x, yy, z, s], i) => (
        <sprite key={i} position={[x, yy, z]} scale={[s, s * 0.6, 1]}>
          <spriteMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} fog />
        </sprite>
      ))}
    </group>
  )
}

/** A big gear, turning slowly (a toothed ring). */
export function Gear({ position, rotation = [0, 0, 0], r = 1.5, teeth = 14, speed = 0.2, color = '#4a3a2a', emissive = '#000' }) {
  const g = useRef()
  useFrame((_, dt) => {
    g.current.rotation.z += dt * speed
  })
  return (
    <group position={position} rotation={rotation}>
      <group ref={g}>
        <mesh>
          <torusGeometry args={[r, r * 0.12, 8, 40]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.4} emissive={emissive} emissiveIntensity={0.3} />
        </mesh>
        {Array.from({ length: teeth }, (_, i) => {
          const a = (i / teeth) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * r * 1.13, Math.sin(a) * r * 1.13, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[r * 0.22, r * 0.2, r * 0.2]} />
              <meshStandardMaterial color={color} metalness={0.7} roughness={0.4} />
            </mesh>
          )
        })}
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <boxGeometry args={[r * 2, r * 0.1, r * 0.1]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Rocks floating around a center, bobbing and slowly orbiting. */
export function FloatingRocks({ center = [0, 0, 0], radius = [12, 20], count = 24, seed = 9, color = '#1a1424', glow = '#a259ff', ySpread = [-4, 6] }) {
  const ref = useRef()
  const plan = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, () => ({ a: r() * Math.PI * 2, R: radius[0] + r() * (radius[1] - radius[0]), y: ySpread[0] + r() * (ySpread[1] - ySpread[0]), s: 0.3 + r() * 1.1, sp: 0.01 + r() * 0.03, ph: r() * 6, rx: r() * 3, ry: r() * 3 }))
  }, [radius, count, seed, ySpread])
  const m = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    plan.forEach((p, i) => {
      const a = p.a + t * p.sp
      m.position.set(center[0] + Math.cos(a) * p.R, center[1] + p.y + Math.sin(t * 0.6 + p.ph) * 0.3, center[2] + Math.sin(a) * p.R)
      m.rotation.set(p.rx + t * 0.1, p.ry + t * 0.07, 0)
      m.scale.set(p.s, p.s * 0.8, p.s)
      m.updateMatrix()
      ref.current.setMatrixAt(i, m.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} emissive={glow} emissiveIntensity={0.25} flatShading />
    </instancedMesh>
  )
}

/** Glowing lava channels in a floor: wavy strips whose glow pulses along them. */
export function LavaChannels({ paths, y = -0.46, width = 0.5, color = '#ff6a1a' }) {
  const geos = useMemo(
    () =>
      paths.map((pts) => {
        // a flat ribbon along the polyline
        const pos = []
        const uv = []
        const idx = []
        let acc = 0
        pts.forEach((p, i) => {
          const q = pts[Math.min(pts.length - 1, i + 1)]
          const o = pts[Math.max(0, i - 1)]
          const dx = q[0] - o[0]
          const dz = q[1] - o[1]
          const l = Math.hypot(dx, dz) || 1
          const nx = (-dz / l) * width * 0.5
          const nz = (dx / l) * width * 0.5
          if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
          pos.push(p[0] + nx, 0, p[1] + nz, p[0] - nx, 0, p[1] - nz)
          uv.push(acc, 0, acc, 1)
          if (i) {
            const a = (i - 1) * 2
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
          }
        })
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
        g.setIndex(idx)
        g.computeVertexNormals()
        return g
      }),
    [paths, width],
  )
  const mats = useRef([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    mats.current.forEach((m, i) => m && (m.opacity = 0.55 + Math.sin(t * 2 + i) * 0.2))
  })
  return (
    <group position={[0, y, 0]}>
      {geos.map((g, i) => (
        <group key={i}>
          <mesh geometry={g}>
            <meshBasicMaterial ref={(m) => (mats.current[i] = m)} color={color} transparent toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={g} position={[0, 0.01, 0]} scale={[1, 1, 1]}>
            <meshBasicMaterial color="#ffb050" transparent opacity={0.12} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Scattered props (boxes) on a floor — crates, ingots, anvils — instanced. */
export function Clutter({ spots, y = 0, color = '#3a2a22', emissive = '#000' }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const m = new THREE.Object3D()
    spots.forEach(([x, z, s = 0.5, rot = 0, h = 1], i) => {
      m.position.set(x, y + (s * h) / 2, z)
      m.rotation.set(0, rot, 0)
      m.scale.set(s, s * h, s * 0.8)
      m.updateMatrix()
      ref.current.setMatrixAt(i, m.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [spots, y])
  return (
    <instancedMesh ref={ref} args={[null, null, spots.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.8} emissive={emissive} emissiveIntensity={0.3} />
    </instancedMesh>
  )
}

/** A floor of metal plates (instanced), each a slightly different shade, with thin gaps. */
export function PlateFloor({ bounds, y = -0.49, size = 2, color = '#1a1412', vary = 0.25, seed = 4 }) {
  const ref = useRef()
  const cells = useMemo(() => {
    const out = []
    for (let x = bounds.minX; x < bounds.maxX; x += size) for (let z = bounds.minZ; z < bounds.maxZ; z += size) out.push([x + size / 2, z + size / 2])
    return out
  }, [bounds, size])
  useLayoutEffect(() => {
    const r = rng(seed)
    const m = new THREE.Object3D()
    const base = new THREE.Color(color)
    const c = new THREE.Color()
    cells.forEach(([x, z], i) => {
      m.position.set(x, y, z)
      m.scale.set(size * 0.94, 1, size * 0.94)
      m.updateMatrix()
      ref.current.setMatrixAt(i, m.matrix)
      c.copy(base).multiplyScalar(1 - vary / 2 + r() * vary)
      ref.current.setColorAt(i, c)
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [cells, y, size, color, vary, seed])
  return (
    <instancedMesh ref={ref} args={[null, null, cells.length]}>
      <boxGeometry args={[1, 0.04, 1]} />
      <meshStandardMaterial roughness={0.55} metalness={0.6} />
    </instancedMesh>
  )
}
