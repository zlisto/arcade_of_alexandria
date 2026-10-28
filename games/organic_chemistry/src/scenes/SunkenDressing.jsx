import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// World 10's set dressing in plain three.js (the World 9 kit, re-coloured for the marsh): flagstone floors, carved
// plinths, braziers, a notice board, door frames, spring basins, the forge's dripping vault and the Hydra's pool.

export const STONE = '#5e6654', STONE_D = '#404836', BRASS = '#a8925a', IRON = '#2a2e28', MOSS = '#4e6a32'

/** flagstones: an instanced grid of slightly varied slabs in running bond over a dark grout plane */
export function Flagstones({ x0, x1, z0, z1, size = 2, base = '#6e7860', seed = 7 }) {
  const ref = useRef()
  const cells = useMemo(() => {
    let s = seed
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const out = []
    let row = 0
    for (let z = z0 - size / 2; z > z1; z -= size, row++) {
      for (let x = x0 - (row % 2 ? size / 2 : 0); x < x1; x += size) {
        const lo = Math.max(x, x0), hi = Math.min(x + size, x1)
        if (hi - lo > 0.2) out.push([(lo + hi) / 2, z, hi - lo, 0.8 + rnd() * 0.3, (rnd() - 0.5) * 0.03, rnd() * 0.015, rnd() < 0.18])
      }
    }
    return out
  }, [x0, x1, z0, z1, size, seed])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D(), c = new THREE.Color(base), moss = new THREE.Color(MOSS), tmp = new THREE.Color()
    cells.forEach(([x, z, w, k, r, h, mossy], i) => {
      d.position.set(x, -0.02 + h, z); d.rotation.set(0, r, 0); d.scale.set(w - 0.08, 1, size - 0.08); d.updateMatrix()
      m.setMatrixAt(i, d.matrix); m.setColorAt(i, tmp.copy(c).lerp(moss, mossy ? 0.45 : 0).multiplyScalar(k))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [cells, base, size])
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, -0.03, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[x1 - x0, Math.abs(z0 - z1)]} /><meshStandardMaterial color="#1e2418" roughness={1} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} receiveShadow><boxGeometry args={[1, 0.04, 1]} /><meshStandardMaterial roughness={0.92} /></instancedMesh>
    </group>
  )
}

/** a small carved plinth (top at h): footing, octagonal shaft with a brass band, moulded cap */
export function Plinth({ r = 0.3, h = 0.86 }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow><boxGeometry args={[r * 2.6, 0.12, r * 2.6]} /><meshStandardMaterial color={STONE_D} roughness={0.9} /></mesh>
      <mesh position={[0, 0.14, 0]}><cylinderGeometry args={[r * 1.15, r * 1.25, 0.08, 8]} /><meshStandardMaterial color={STONE} roughness={0.9} flatShading /></mesh>
      <mesh position={[0, h / 2 + 0.02, 0]} castShadow><cylinderGeometry args={[r * 0.82, r, h - 0.32, 8]} /><meshStandardMaterial color={STONE} roughness={0.85} flatShading /></mesh>
      <mesh position={[0, h * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r * 0.9, 0.025, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[0, h - 0.11, 0]}><cylinderGeometry args={[r * 1.05, r * 0.85, 0.1, 8]} /><meshStandardMaterial color={STONE} flatShading /></mesh>
      <mesh position={[0, h - 0.03, 0]} castShadow><cylinderGeometry args={[r * 1.25, r * 1.2, 0.06, 8]} /><meshStandardMaterial color="#76806a" flatShading /></mesh>
    </group>
  )
}

/** a brazier on three legs: bowl, coals and an additive flame */
export function Brazier({ pos, color = '#9aff8a', h = 1.1, light = false }) {
  const fl = useRef()
  useFrame(({ clock }) => { if (fl.current) fl.current.scale.y = 1 + Math.sin(clock.elapsedTime * 11 + pos[0] * 3 + pos[2]) * 0.15 })
  return (
    <group position={pos}>
      {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[Math.sin(a) * 0.14, h / 2, Math.cos(a) * 0.14]} rotation={[Math.cos(a) * 0.18, 0, -Math.sin(a) * 0.18]}><cylinderGeometry args={[0.025, 0.03, h, 5]} /><meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} /></mesh> })}
      <mesh position={[0, h, 0]}><cylinderGeometry args={[0.26, 0.12, 0.2, 10]} /><meshStandardMaterial color={IRON} metalness={0.6} roughness={0.45} /></mesh>
      <mesh position={[0, h + 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.26, 0.025, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
      <mesh ref={fl} position={[0, h + 0.3, 0]}><coneGeometry args={[0.15, 0.45, 8]} /><meshBasicMaterial color={color} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[0, h + 0.18, 0]}><sphereGeometry args={[0.1, 8, 6]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      {light && <pointLight position={[0, h + 0.5, 0]} color={color} intensity={1.6} distance={5} />}
    </group>
  )
}

/** a wooden notice board on two posts, a violet decree pinned to it */
export function NoticeBoard() {
  return (
    <group>
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 0.95, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 1.9, 6]} /><meshStandardMaterial color="#4a3a28" roughness={0.95} flatShading /></mesh>)}
      <mesh position={[0, 1.25, 0]} castShadow><boxGeometry args={[1.3, 0.85, 0.08]} /><meshStandardMaterial color="#6a5236" roughness={0.9} /></mesh>
      {[0.98, 1.52].map((y) => <mesh key={y} position={[0, y, 0.045]}><boxGeometry args={[1.32, 0.04, 0.02]} /><meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} /></mesh>)}
      <mesh position={[0, 1.95, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.18, 0.18, 0.16]} /><meshStandardMaterial color="#4a3a28" /></mesh>
      <mesh position={[0, 1.25, 0.05]}><planeGeometry args={[0.8, 0.6]} /><meshStandardMaterial color="#d8c8f0" emissive="#6a3aa0" emissiveIntensity={0.5} roughness={0.8} /></mesh>
      <mesh position={[0, 1.5, 0.06]}><circleGeometry args={[0.06, 10]} /><meshBasicMaterial color="#a06bff" toneMapped={false} /></mesh>
      {[1.32, 1.22, 1.12, 1.04].map((y, i) => <mesh key={y} position={[-0.05 + (i % 2) * 0.05, y, 0.055]}><planeGeometry args={[0.55 - i * 0.06, 0.025]} /><meshBasicMaterial color="#3a2a5a" /></mesh>)}
    </group>
  )
}

/** a stone door frame (posts and lintel) round a slab door, which slides down into the floor when `open` */
export function AllylDoor({ open, color = '#3a3a32', glow = '#000', glowI = 0 }) {
  const slab = useRef()
  useFrame((_, dt) => { if (slab.current) slab.current.position.y += ((open ? -1.6 : 1.8) - slab.current.position.y) * Math.min(1, dt * 3) })
  return (
    <group>
      {[-1.75, 1.75].map((x) => <mesh key={x} position={[x, 2.1, 0]} castShadow><boxGeometry args={[0.5, 4.2, 0.7]} /><meshStandardMaterial color={STONE} roughness={0.9} flatShading /></mesh>)}
      <mesh position={[0, 4.35, 0]} castShadow><boxGeometry args={[4.1, 0.5, 0.8]} /><meshStandardMaterial color="#6a7460" roughness={0.85} /></mesh>
      <mesh position={[0, 4.62, 0]}><boxGeometry args={[4.4, 0.08, 0.9]} /><meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.4} /></mesh>
      <group ref={slab} position={[0, 1.8, 0]}>
        <mesh castShadow><boxGeometry args={[3.0, 3.6, 0.3]} /><meshStandardMaterial color={color} emissive={glow} emissiveIntensity={glowI} roughness={0.8} /></mesh>
        {[-0.9, 0, 0.9].map((y) => <mesh key={y} position={[0, y, 0.16]}><boxGeometry args={[2.8, 0.06, 0.02]} /><meshStandardMaterial color={IRON} metalness={0.5} roughness={0.5} /></mesh>)}
        <mesh position={[0, 0, 0.17]}><ringGeometry args={[0.3, 0.38, 6]} /><meshStandardMaterial color="#b0a080" metalness={0.5} /></mesh>
      </group>
    </group>
  )
}

/** a spring basin: a coped stone ring, a rim of moss, the water surface (neutral until solved) and a trickle spout */
export function SpringBasin({ water = '#9ac8e8' }) {
  const w = useRef()
  useFrame(({ clock }) => { if (w.current) w.current.position.y = 0.9 + Math.sin(clock.elapsedTime * 2) * 0.012 })
  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow><cylinderGeometry args={[1.12, 1.18, 0.12, 12]} /><meshStandardMaterial color={STONE_D} roughness={0.9} flatShading /></mesh>
      <mesh position={[0, 0.48, 0]} castShadow><cylinderGeometry args={[0.95, 1.02, 0.8, 12, 1, true]} /><meshStandardMaterial color={STONE} roughness={0.9} flatShading side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.97, 0.09, 6, 24]} /><meshStandardMaterial color="#76806a" roughness={0.85} flatShading /></mesh>
      <mesh position={[0, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.99, 0.04, 5, 24]} /><meshStandardMaterial color={MOSS} roughness={1} /></mesh>
      <mesh ref={w} position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.9, 24]} /><meshStandardMaterial color={water} metalness={0.3} roughness={0.15} /></mesh>
      <group position={[0, 0, -1.0]}>
        <mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[0.36, 1.5, 0.3]} /><meshStandardMaterial color={STONE} roughness={0.9} /></mesh>
        <mesh position={[0, 1.3, 0.22]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.06, 0.3, 8]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>
        <mesh position={[0, 1.08, 0.38]}><cylinderGeometry args={[0.02, 0.02, 0.4, 6]} /><meshBasicMaterial color={water} transparent opacity={0.6} /></mesh>
      </group>
    </group>
  )
}

/** the forge's vault: a dark rock ceiling with hanging dripstones and roots, over the whole dungeon */
export function Vault({ x = 11, z0 = 8, z1 = -172, y = 8.6 }) {
  const drips = useMemo(() => {
    let s = 11
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const out = []
    for (let i = 0; i < 160; i++) out.push([(rnd() * 2 - 1) * (x - 0.6), z0 - rnd() * (z0 - z1), 0.4 + rnd() * 1.5, 0.08 + rnd() * 0.2, rnd() < 0.3])
    return out
  }, [x, z0, z1])
  const ref = useRef(), rootRef = useRef()
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    let a = 0, b = 0
    drips.forEach(([px, pz, L, r, root]) => {
      d.position.set(px, y - L / 2, pz); d.rotation.set(0, 0, Math.PI); d.scale.set(r, L, r); d.updateMatrix()
      if (root) { if (rootRef.current) rootRef.current.setMatrixAt(b++, d.matrix) } else if (ref.current) ref.current.setMatrixAt(a++, d.matrix)
    })
    if (ref.current) { ref.current.count = a; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere() }
    if (rootRef.current) { rootRef.current.count = b; rootRef.current.instanceMatrix.needsUpdate = true; rootRef.current.computeBoundingSphere() }
  }, [drips, y])
  return (
    <group>
      <mesh position={[0, y, (z0 + z1) / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2 * x + 8, Math.abs(z0 - z1) + 8]} /><meshStandardMaterial color="#1a2016" roughness={1} side={THREE.DoubleSide} /></mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, drips.length]}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial color="#3e4636" roughness={0.9} flatShading /></instancedMesh>
      <instancedMesh ref={rootRef} args={[undefined, undefined, drips.length]}><coneGeometry args={[0.35, 1, 4]} /><meshStandardMaterial color="#3a2e1e" roughness={1} /></instancedMesh>
    </group>
  )
}

/** the Hydra's pool: a stone kerb, reeds and roots round the water, mossy pillars and brazier light */
export function PoolDressing({ center }) {
  const reeds = useMemo(() => [...Array(36)].map((_, i) => { const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.05; const r = 7.2 + (i % 4) * 0.25; return [Math.cos(a) * r, Math.sin(a) * r, 0.6 + (i % 5) * 0.18, (i % 7) * 0.3] }), [])
  return (
    <group position={center}>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[6.4, 7.0, 48]} /><meshStandardMaterial color={STONE} roughness={0.9} /></mesh>
      {/* a low coped rim round the water */}
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.55]} receiveShadow><torusGeometry args={[6.62, 0.24, 6, 72]} /><meshStandardMaterial color="#76806a" roughness={0.85} flatShading /></mesh>
      {reeds.map(([x, z, h, t], i) => <mesh key={i} position={[x, h / 2, z]} rotation={[Math.sin(t) * 0.12, 0, Math.cos(t) * 0.12]}><cylinderGeometry args={[0.02, 0.035, h, 4]} /><meshStandardMaterial color={i % 2 ? '#6a7a3a' : '#5a6a2e'} roughness={1} /></mesh>)}
      {[[-11, -6], [11, -6], [-11, 8], [11, 8], [-11, -15], [11, -15]].map(([x, z]) => (
        <group key={x + ',' + z} position={[x, 0, z]}>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.5, 1.6]} /><meshStandardMaterial color={STONE_D} roughness={0.9} /></mesh>
          <mesh position={[0, 3.8, 0]} castShadow><cylinderGeometry args={[0.55, 0.65, 6.6, 8]} /><meshStandardMaterial color={STONE} roughness={0.85} flatShading /></mesh>
          {[1.2, 4.4].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.05, 6, 16]} /><meshStandardMaterial color={BRASS} metalness={0.7} roughness={0.35} /></mesh>)}
          <mesh position={[0, 2.6, 0]}><cylinderGeometry args={[0.6, 0.66, 1.0, 8, 1, true]} /><meshStandardMaterial color={MOSS} roughness={1} transparent opacity={0.85} /></mesh>
        </group>
      ))}
      {[[-6, 13], [6, 13], [-8, -12], [8, -12]].map(([x, z]) => <Brazier key={x + ',' + z} pos={[x, 0, z]} color="#9aff8a" h={1.3} light={z > 0} />)}
      {[[-9.6, 2, 0.5], [9.8, -3, 0.4], [-8.8, -9, 0.35], [9.1, 10, 0.45]].map(([x, z, r], i) => <mesh key={'rb' + i} position={[x, r * 0.6, z]} rotation={[i, i * 2, 0]} castShadow><dodecahedronGeometry args={[r, 0]} /><meshStandardMaterial color={STONE} roughness={0.95} flatShading /></mesh>)}
    </group>
  )
}

/** the arena's upper walls and vault (closing the black band above the walls in the wide defeat shot): a jagged rock
 *  frieze along the wall tops, denser dripstones and roots over the pool, root strands down the walls, moss in
 *  irregular patches, and a dim green wash so the vault reads instead of going black */
export function ArenaVault({ x = 14, z0 = -132, z1 = -172, y = 8.6 }) {
  const D = useMemo(() => {
    let s = 29
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const rocks = [], drips = [], roots = [], strands = [], moss = []
    for (let z = z0 - 0.6; z > z1; z -= 1.3) for (const sd of [-1, 1]) rocks.push([sd * (x - 0.2 - rnd() * 0.5), y - 0.5 - rnd() * 0.9, z + (rnd() - 0.5) * 0.6, 0.55 + rnd() * 0.6, rnd() * 6])
    for (let zz = z1 + 1; zz < z1 + 3; zz += 1) for (let xx = -x + 0.6; xx < x; xx += 1.3) rocks.push([xx + (rnd() - 0.5) * 0.4, y - 0.6 - rnd() * 0.8, zz, 0.6 + rnd() * 0.6, rnd() * 6])
    for (let i = 0; i < 90; i++) { const px = (rnd() * 2 - 1) * (x - 0.8), pz = z0 - 0.5 - rnd() * (z0 - z1 - 1), L = 0.6 + rnd() * 2.0, r = 0.1 + rnd() * 0.24; (rnd() < 0.35 ? roots : drips).push([px, pz, L, r]) }
    for (let i = 0; i < 28; i++) { const sd = i % 2 ? 1 : -1, pz = z0 - 1 - rnd() * (z0 - z1 - 2); strands.push([sd * (x - 0.12), pz, 1.8 + rnd() * 3.4, rnd()]) }
    for (let i = 0; i < 36; i++) { const sd = i % 2 ? 1 : -1; moss.push([sd * (x - 0.06), 0.8 + rnd() * 6.2, z0 - 1 - rnd() * (z0 - z1 - 2), 0.5 + rnd() * 1.3, 0.35 + rnd() * 0.9, rnd()]) }
    return { rocks, drips, roots, strands, moss }
  }, [x, z0, z1, y])
  const rk = useRef(), dr = useRef(), rt = useRef()
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    const put = (m, list, f) => { if (!m) return; list.forEach((it, i) => { f(it); d.updateMatrix(); m.setMatrixAt(i, d.matrix) }); m.count = list.length; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere() }
    put(rk.current, D.rocks, ([px, py, pz, r, a]) => { d.position.set(px, py, pz); d.rotation.set(a, a * 1.7, a * 0.6); d.scale.set(r, r * 0.8, r * 1.2) })
    put(dr.current, D.drips, ([px, pz, L, r]) => { d.position.set(px, y - L / 2, pz); d.rotation.set(0, 0, Math.PI); d.scale.set(r, L, r) })
    put(rt.current, D.roots, ([px, pz, L, r]) => { d.position.set(px, y - L / 2, pz); d.rotation.set(0.15, 0, Math.PI + 0.1); d.scale.set(r * 0.5, L, r * 0.5) })
  }, [D, y])
  return (
    <group>
      {/* the arena's back wall (z1): a mossy rock face up to the vault, so a low shot toward the shard sees stone, not void */}
      <mesh position={[0, y / 2, z1 - 0.3]} receiveShadow><boxGeometry args={[2 * x + 1, y + 0.4, 0.6]} /><meshStandardMaterial color="#3e4836" roughness={0.95} emissive="#1a2a12" emissiveIntensity={0.3} /></mesh>
      {[[-8, 2.4, 1.5, 0.9], [-4.5, 5.2, 1.8, 0.7], [4.5, 1.4, 1.3, 0.7], [9, 4.0, 1.6, 0.9], [1.5, 6.8, 2.0, 0.6], [-10.5, 6.0, 1.2, 0.6]].map(([px, py, w, h], i) => <mesh key={'bw' + i} position={[px, py, z1 + 0.02]} scale={[w, h, 1]}><circleGeometry args={[1, 7]} /><meshStandardMaterial color={i % 2 ? MOSS : '#5a7a3a'} roughness={1} emissive="#2a4a1a" emissiveIntensity={0.25} /></mesh>)}
      <instancedMesh ref={rk} args={[undefined, undefined, D.rocks.length]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#4a5440" roughness={0.95} flatShading /></instancedMesh>
      <instancedMesh ref={dr} args={[undefined, undefined, D.drips.length]}><coneGeometry args={[1, 1, 6]} /><meshStandardMaterial color="#465040" roughness={0.9} flatShading /></instancedMesh>
      <instancedMesh ref={rt} args={[undefined, undefined, D.roots.length]}><coneGeometry args={[0.35, 1, 4]} /><meshStandardMaterial color="#4a3a24" roughness={1} /></instancedMesh>
      {D.strands.map(([px, pz, L, t], i) => <mesh key={'s' + i} position={[px - Math.sign(px) * 0.1, y - L / 2, pz]} rotation={[0, 0, Math.sign(px) * (0.04 + t * 0.06)]}><cylinderGeometry args={[0.025, 0.05, L, 4]} /><meshStandardMaterial color={t < 0.5 ? '#5a4a2e' : '#4e6a32'} roughness={1} /></mesh>)}
      {D.moss.map(([px, py, pz, w, h, t], i) => <mesh key={'m' + i} position={[px, py, pz]} rotation={[t * 0.6, px > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} scale={[w, h, 1]}><circleGeometry args={[1, 7]} /><meshStandardMaterial color={t < 0.5 ? MOSS : '#5a7a3a'} roughness={1} emissive="#2a4a1a" emissiveIntensity={0.25} side={THREE.DoubleSide} /></mesh>)}
      {[[x - 2, z0 - 10], [x - 2, z0 - 28], [-x + 2, z0 - 19]].map(([px, pz]) => <pointLight key={px + ',' + pz} position={[px, y - 1.2, pz]} color="#9aff8a" intensity={4} distance={13} />)}
    </group>
  )
}
