import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { softDot } from './materials'

// Reusable scene pieces. Each piece that blocks or carries Kai registers itself with the world.

/** Solid box: visible + collidable. pos = center, size = [w,h,d]. */
export function Block({ world, pos, size, color = '#555', mat, visible = true, noCam = false, children, rotationY = 0 }) {
  useEffect(() => {
    const min = [pos[0] - size[0] / 2, pos[1] - size[1] / 2, pos[2] - size[2] / 2]
    const max = [pos[0] + size[0] / 2, pos[1] + size[1] / 2, pos[2] + size[2] / 2]
    const id = world.addSolid(min, max)
    if (noCam) world.solids.get(id).noCam = true
    return () => world.remove(id)
  }, [world, ...pos, ...size])
  if (!visible) return null
  return (
    <mesh position={pos} rotation={[0, rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      {mat || <meshStandardMaterial color={color} roughness={0.85} />}
      {children}
    </mesh>
  )
}

/** Walkable slab whose top is at y. */
export function Slab({ world, x0, z0, x1, z1, y = 0, thick = 0.5, color = '#3a3540', mat, visible = true }) {
  useEffect(() => {
    const id = world.addFloor(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), y)
    return () => world.remove(id)
  }, [world, x0, z0, x1, z1, y])
  if (!visible) return null
  return (
    <mesh position={[(x0 + x1) / 2, y - thick / 2, (z0 + z1) / 2]} receiveShadow>
      <boxGeometry args={[Math.abs(x1 - x0), thick, Math.abs(z1 - z0)]} />
      {mat || <meshStandardMaterial color={color} roughness={0.92} />}
    </mesh>
  )
}

// closed gates, so floating Tags behind one stay hidden (labels never show through a shut door)
export const closedGates = new Map()
let gateSeq = 0
/** A gate that blocks until `open`, then slides into the floor. */
export function Gate({ world, pos, size = [4, 4, 0.6], open, color = '#2a3550', glow = '#43e6f5', label, noCam = false }) {
  const ref = useRef()
  const idRef = useRef(null)
  const cur = useRef(open ? 1 : 0)
  useEffect(() => {
    const min = [pos[0] - size[0] / 2, pos[1], pos[2] - size[2] / 2]
    const max = [pos[0] + size[0] / 2, pos[1] + size[1], pos[2] + size[2] / 2]
    idRef.current = world.addSolid(min, max)
    if (noCam) world.solids.get(idRef.current).noCam = true // the follow camera's ray ignores it (Kai still can't pass)
    return () => world.remove(idRef.current)
  }, [world])
  useEffect(() => { world.setEnabled(idRef.current, !open) }, [open])
  const gk = useRef(++gateSeq)
  useEffect(() => () => closedGates.delete(gk.current), [])
  useFrame((_, dt) => {
    cur.current += ((open ? 1 : 0) - cur.current) * Math.min(1, dt * 2.5)
    if (cur.current < 0.6) closedGates.set(gk.current, { z: pos[2], x0: pos[0] - size[0] / 2, x1: pos[0] + size[0] / 2, y1: pos[1] + size[1] })
    else closedGates.delete(gk.current)
    if (ref.current) ref.current.position.y = pos[1] + size[1] / 2 - cur.current * (size[1] + 0.05)
  })
  return (
    <group>
      <group ref={ref} position={[pos[0], pos[1] + size[1] / 2, pos[2]]}>
        {/* a pane of dark crystal behind a portcullis of glowing bars: it reads as a door and you can glimpse the room beyond */}
        <mesh><boxGeometry args={[size[0], size[1], size[2] * 0.4]} /><meshStandardMaterial color={color} roughness={0.2} metalness={0.3} transparent opacity={0.55} depthWrite={false} emissive={glow} emissiveIntensity={0.06} /></mesh>
        {[...Array(Math.max(2, Math.round(size[0] / 1.6)))].map((_, i, a) => (
          <mesh key={i} position={[-size[0] / 2 + (i + 0.5) * (size[0] / a.length), 0, size[2] * 0.3]}><boxGeometry args={[0.1, size[1], 0.1]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.35} emissive={glow} emissiveIntensity={0.9} toneMapped={false} /></mesh>
        ))}
        {[-0.3, 0.3].map((f) => <mesh key={f} position={[0, f * size[1], size[2] * 0.3]}><boxGeometry args={[size[0], 0.1, 0.1]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.35} emissive={glow} emissiveIntensity={0.5} /></mesh>)}
      </group>
      {/* frame */}
      <mesh position={[pos[0] - size[0] / 2 - 0.25, pos[1] + size[1] / 2 + 0.2, pos[2]]}><boxGeometry args={[0.5, size[1] + 0.4, size[2] + 0.4]} /><meshStandardMaterial color="#3a4652" roughness={0.85} /></mesh>
      <mesh position={[pos[0] + size[0] / 2 + 0.25, pos[1] + size[1] / 2 + 0.2, pos[2]]}><boxGeometry args={[0.5, size[1] + 0.4, size[2] + 0.4]} /><meshStandardMaterial color="#3a4652" roughness={0.85} /></mesh>
      <mesh position={[pos[0], pos[1] + size[1] + 0.25, pos[2]]}><boxGeometry args={[size[0] + 1, 0.5, size[2] + 0.4]} /><meshStandardMaterial color="#3a4652" roughness={0.85} /></mesh>
      <mesh position={[pos[0], pos[1] + size[1] + 0.25, pos[2] + size[2] / 2 + 0.21]}><boxGeometry args={[size[0] * 0.6, 0.12, 0.02]} /><meshBasicMaterial color={open ? '#2e4a3c' : glow} toneMapped={false} /></mesh>
    </group>
  )
}

/** A puzzle station: glowing pedestal you press E at. */
export function Station({ world, pos, label, onUse, enabled = true, solved = false, color = '#c8102e', glow = '#ff3a50', orb: showOrb = true }) {
  const idRef = useRef(null)
  const cb = useRef(onUse)
  cb.current = onUse
  useEffect(() => {
    idRef.current = world.addInteractable({ pos, radius: 2.2, label, onInteract: () => cb.current && cb.current() })
    const s = world.addSolid([pos[0] - 0.45, pos[1], pos[2] - 0.45], [pos[0] + 0.45, pos[1] + 1.05, pos[2] + 0.45])
    return () => { world.remove(idRef.current); world.remove(s) }
  }, [world])
  useEffect(() => { const it = world.interactables.get(idRef.current); if (it) { it.enabled = enabled; it.label = label } }, [enabled, label])
  const orb = useRef()
  useFrame(({ clock }) => { if (orb.current) { orb.current.position.y = pos[1] + 1.45 + Math.sin(clock.elapsedTime * 2) * 0.08; orb.current.rotation.y += 0.02 } })
  // an unsolved trial holds a ruby; it turns green once solved
  const c = solved ? '#6fe39a' : color
  const light = solved ? '#6fe39a' : glow
  return (
    <group>
      <mesh position={[pos[0], pos[1] + 0.5, pos[2]]} castShadow><cylinderGeometry args={[0.38, 0.5, 1.0, 8]} /><meshStandardMaterial color="#d8d3c4" roughness={0.6} /></mesh>
      <mesh position={[pos[0], pos[1] + 1.02, pos[2]]}><cylinderGeometry args={[0.5, 0.42, 0.08, 8]} /><meshStandardMaterial color="#c9a24a" metalness={0.7} roughness={0.35} /></mesh>
      <group ref={orb} position={[pos[0], pos[1] + 1.45, pos[2]]} visible={showOrb}>
        {/* a faceted gem: deep colour on the outside, a bright core glowing through */}
        <mesh scale={[1, 1.45, 1]}><octahedronGeometry args={[0.2, 0]} /><meshPhysicalMaterial color={c} emissive={c} emissiveIntensity={solved ? 1.4 : 0.9} roughness={0.12} metalness={0.05} clearcoat={1} clearcoatRoughness={0.05} flatShading transparent opacity={0.9} /></mesh>
        <mesh scale={[1, 1.45, 1]}><octahedronGeometry args={[0.09, 0]} /><meshBasicMaterial color={light} toneMapped={false} /></mesh>
      </group>
      <pointLight position={[pos[0], pos[1] + 1.6, pos[2]]} color={light} intensity={2.4} distance={6} />
    </group>
  )
}

/** Instanced scatter: trees, rocks, crystals. items = [[x,z,scale,rotY], ...] */
export function Scatter({ items, kind = 'rock', y = 0, color }) {
  const ref = useRef()
  const ref2 = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useLayoutEffect(() => {
    items.forEach(([x, z, s = 1, r = 0], i) => {
      dummy.position.set(x, y + (kind === 'tree' ? 1.2 * s : kind === 'crystal' ? 0.6 * s : 0.25 * s), z)
      dummy.rotation.set(kind === 'crystal' ? 0.15 * Math.sin(i) : 0, r, kind === 'crystal' ? 0.15 * Math.cos(i * 1.7) : 0)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      if (ref2.current) {
        dummy.position.set(x, y + 0.6 * s, z)
        dummy.rotation.set(0, r, 0)
        dummy.updateMatrix()
        ref2.current.setMatrixAt(i, dummy.matrix)
      }
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref2.current) ref2.current.instanceMatrix.needsUpdate = true
  }, [items])
  if (kind === 'tree') {
    return (
      <group>
        <instancedMesh ref={ref} args={[null, null, items.length]} castShadow>
          <coneGeometry args={[1.1, 2.6, 7]} />
          <meshStandardMaterial color={color || '#2f5a3a'} roughness={0.9} />
        </instancedMesh>
        <instancedMesh ref={ref2} args={[null, null, items.length]}>
          <cylinderGeometry args={[0.16, 0.22, 1.2, 6]} />
          <meshStandardMaterial color="#4a3426" roughness={0.9} />
        </instancedMesh>
      </group>
    )
  }
  if (kind === 'crystal') {
    return (
      <instancedMesh ref={ref} args={[null, null, items.length]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color || '#43c8e6'} emissive={color || '#1fa7c4'} emissiveIntensity={1.1} roughness={0.25} metalness={0.1} transparent opacity={0.92} />
      </instancedMesh>
    )
  }
  return (
    <instancedMesh ref={ref} args={[null, null, items.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color={color || '#5a5560'} roughness={0.95} flatShading />
    </instancedMesh>
  )
}

export function Torch({ pos, color = '#ffb35a' }) {
  const flame = useRef()
  const light = useRef()
  useFrame(({ clock }) => {
    const f = 1 + Math.sin(clock.elapsedTime * 13 + pos[0]) * 0.12 + Math.sin(clock.elapsedTime * 7.3) * 0.08
    if (flame.current) flame.current.scale.set(1, f, 1)
    if (light.current) light.current.intensity = 2.4 * f
  })
  return (
    <group position={pos}>
      <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.06, 0.09, 1.4, 6]} /><meshStandardMaterial color="#2a2420" /></mesh>
      <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.18, 0.1, 0.18, 8]} /><meshStandardMaterial color="#3a3028" /></mesh>
      {/* the flame: a soft outer tongue, a hot white core and a glow, all additive */}
      <group ref={flame} position={[0, 1.58, 0]}>
        <mesh position={[0, 0.17, 0]} scale={[1, 1.9, 1]}><sphereGeometry args={[0.12, 10, 8]} /><meshBasicMaterial color={color} transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
        <mesh position={[0, 0.12, 0]} scale={[1, 1.7, 1]}><sphereGeometry args={[0.06, 8, 6]} /><meshBasicMaterial color="#fff2c8" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
        <sprite position={[0, 0.18, 0]} scale={0.9}><spriteMaterial map={softDot()} color={color} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
      </group>
      <pointLight ref={light} position={[0, 1.8, 0]} color={color} intensity={2.4} distance={8} />
    </group>
  )
}

/** Deterministic pseudo-random scatter generator. */
export function scatter(n, seed, fn) {
  let s = seed
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  const out = []
  for (let i = 0; i < n; i++) { const v = fn(rnd, i); if (v) out.push(v) }
  return out
}

/** Floating motes / sparks for atmosphere. */
export function Motes({ count = 120, area = [40, 8, 40], center = [0, 2, 0], color = '#9fe8ff', size = 0.06 }) {
  const ref = useRef()
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3] = center[0] + (Math.random() - 0.5) * area[0]
      p[i * 3 + 1] = center[1] + Math.random() * area[1]
      p[i * 3 + 2] = center[2] + (Math.random() - 0.5) * area[2]
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [count])
  useFrame((_, dt) => {
    const a = geo.attributes.position.array
    for (let i = 0; i < count; i++) {
      a[i * 3 + 1] += dt * 0.25
      if (a[i * 3 + 1] > center[1] + area[1]) a[i * 3 + 1] = center[1]
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={color} size={size * 1.6} map={softDot()} alphaTest={0.02} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  )
}

/** Hookshot anchor: a blue δ+ ring on a post — an electron sink the Curved-Arrow Hookshot can latch onto.
 *  land = where Kai ends up. accepts() may return a message string to refuse (a decoy). */
export function HookTarget({ world, pos, land, enabled = true, accepts, color = '#4aa8ff', post = true, label }) {
  const id = useRef(null)
  const ring = useRef()
  const acc = useRef(accepts)
  acc.current = accepts
  useEffect(() => {
    id.current = world.addHook({ pos: [pos[0], pos[1] + 1.6, pos[2]], land: land || [pos[0], pos[1], pos[2] + 1.1], kind: 'pull', accepts: () => (acc.current ? acc.current() : true) })
    return () => world.remove(id.current)
  }, [world])
  useEffect(() => { world.setEnabled(id.current, enabled) }, [enabled])
  useFrame(({ clock }) => { if (ring.current) { ring.current.rotation.z = clock.elapsedTime * 0.8; ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.06) } })
  return (
    <group position={pos}>
      {post && <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, 1.6, 8]} /><meshStandardMaterial color="#5a6270" metalness={0.6} roughness={0.4} /></mesh>}
      <group position={[0, 1.6, 0]}>
        <mesh ref={ring}><torusGeometry args={[0.32, 0.07, 10, 28]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={enabled ? 1.6 : 0.2} toneMapped={false} /></mesh>
        <mesh><sphereGeometry args={[0.1, 12, 10]} /><meshStandardMaterial color="#cfe6ff" emissive={color} emissiveIntensity={enabled ? 1 : 0.1} /></mesh>
        {label && <Html position={[0, 0.65, 0]} center distanceFactor={9}><div className="tag3d">{label}</div></Html>}
      </group>
      {enabled && <pointLight position={[0, 1.6, 0.3]} color={color} intensity={1.6} distance={4} />}
    </group>
  )
}

/** Treasure chest (Ocarina style): press E, the lid swings open, onOpen() runs once. */
export function Chest({ world, pos, rotY = 0, opened, onOpen, show = true, big = false, label = 'Open the chest' }) {
  const lid = useRef()
  const cb = useRef(onOpen)
  cb.current = onOpen
  const openedRef = useRef(opened)
  openedRef.current = opened
  useEffect(() => {
    if (!show) return
    const it = world.addInteractable({ pos, radius: 1.9, label: () => (openedRef.current ? null : label), onInteract: () => { if (!openedRef.current) cb.current && cb.current() } })
    const s = world.addSolid([pos[0] - 0.55, pos[1], pos[2] - 0.45], [pos[0] + 0.55, pos[1] + 0.8, pos[2] + 0.45])
    return () => { world.remove(it); world.remove(s) }
  }, [world, show])
  useFrame((_, dt) => { if (lid.current) lid.current.rotation.x += ((opened ? -1.9 : 0) - lid.current.rotation.x) * Math.min(1, dt * 6) })
  if (!show) return null
  const sc = big ? 1.35 : 1
  const wood = big ? '#3a2a50' : '#6a4426'
  const trim = big ? '#c9a3ff' : '#d8b060'
  return (
    <group position={pos} rotation={[0, rotY, 0]} scale={sc}>
      <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[1, 0.6, 0.75]} /><meshStandardMaterial color={wood} roughness={0.8} /></mesh>
      {[-0.42, 0.42].map((x) => <mesh key={x} position={[x, 0.3, 0]}><boxGeometry args={[0.08, 0.62, 0.78]} /><meshStandardMaterial color={trim} metalness={0.8} roughness={0.3} /></mesh>)}
      <group ref={lid} position={[0, 0.6, -0.375]}>
        <mesh position={[0, 0.12, 0.375]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.37, 0.37, 1, 14, 1, false, 0, Math.PI]} /><meshStandardMaterial color={wood} roughness={0.8} /></mesh>
        <mesh position={[0, 0.04, 0.76]}><boxGeometry args={[0.16, 0.18, 0.05]} /><meshStandardMaterial color={trim} metalness={0.8} roughness={0.3} /></mesh>
      </group>
      {opened ? <pointLight position={[0, 1.2, 0]} color={trim} intensity={2} distance={4} /> : <pointLight position={[0, 1.4, 0.8]} color={trim} intensity={1.2} distance={3.5} />}
    </group>
  )
}

/** Wooden signpost with a floating label. */
export function Signpost({ pos, rotY = 0, text }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.07, 0.08, 1.4, 6]} /><meshStandardMaterial color="#6a4a32" roughness={0.9} /></mesh>
      <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[1.1, 0.42, 0.08]} /><meshStandardMaterial color="#8a6440" roughness={0.85} /></mesh>
      <Html position={[0, 1.95, 0]} center distanceFactor={11}><div className="tag3d">{text}</div></Html>
    </group>
  )
}

/** A floating label that stays readable: it fades out when the camera is very close (so it never fills
 *  the screen) or far away, and it always sits beneath the HUD and dialogue. */
const _tagV = new THREE.Vector3()
export function Tag({ position, children, df = 10, near = 3.2, far = 24, className = '' }) {
  const g = useRef(), el = useRef()
  const camera = useThree((st) => st.camera)
  useFrame(() => {
    if (!g.current || !el.current) return
    const d = camera.position.distanceTo(g.current.getWorldPosition(_tagV))
    let hidden = d < near || d > far
    if (!hidden) for (const gt of closedGates.values()) {
      // a shut gate between the camera and the tag (both sides at least 0.4 m clear of it) hides the tag
      const cz = camera.position.z - gt.z, tz = _tagV.z - gt.z
      if (cz * tz < 0 && Math.abs(cz) > 0.4 && Math.abs(tz) > 0.4) {
        const t = cz / (cz - tz), xa = camera.position.x + (_tagV.x - camera.position.x) * t, ya = camera.position.y + (_tagV.y - camera.position.y) * t
        if (xa > gt.x0 && xa < gt.x1 && ya < gt.y1 + 0.6) { hidden = true; break }
      }
    }
    el.current.style.opacity = hidden ? '0' : d < near + 1 ? String(d - near) : '1'
    // readable at every distance: shrink gently with distance, but never below ~11 px or above ~18 px
    el.current.style.transform = `scale(${Math.min(1.45, Math.max(0.95, (df * 1.1) / Math.max(1, d)))})`
  })
  return (
    <group ref={g} position={position}>
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}><div ref={el} className={'tag3d ' + className}>{children}</div></Html>
    </group>
  )
}

/** A side-on dialogue camera framing Kai and whoever he's talking to (set world.camOverride; clear after). */
export function twoShot(world, npc, dist = 3.8, npcFacing) {
  const p = world.player && world.player.pos
  if (!p) return null
  const mx = (p.x + npc[0]) / 2, mz = (p.z + npc[2]) / 2
  let dx = npc[0] - p.x, dz = npc[2] - p.z
  const l = Math.hypot(dx, dz) || 1
  dx /= l; dz /= l
  if (world.player.teleport) world.player.teleport([p.x, p.y, p.z], Math.atan2(dx, dz))
  // stand off to the side of the line between them, a little toward Kai's back so both faces show
  // either side of the line between them works; prefer the one in front of the NPC if we know where it faces
  let side = 1
  if (npcFacing !== undefined) {
    const fx = Math.sin(npcFacing), fz = Math.cos(npcFacing)
    if ((-dz) * fx + dx * fz < 0) side = -1
  }
  return { pos: [mx - side * dz * dist - dx * 1.2, 2.0, mz + side * dx * dist - dz * 1.2], look: [mx, 1.45, mz] }
}
