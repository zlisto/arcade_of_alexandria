import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { LAND } from '../theme/palette'
import { makeShape, sampleShape } from '../levels/w0/retraction'
import { SITES, gateSegments, layout } from './reef'

/**
 * Retract Reef scenery shared by the overworld level and the intro: everything that
 * isn't a playable site's reef tiles. Built from retractReef.json, so the intro, the
 * level and the bible map all show the same world.
 */

const TILE = 0.22

/** A reef shape as static basalt tiles (the same look as playable reefs). */
export function StaticReef({ shapeDef, pos, y = 0, h = 0.14, color = LAND.stone }) {
  const mesh = useRef()
  const samples = useMemo(() => sampleShape(makeShape(shapeDef), h), [shapeDef, h])
  useEffect(() => {
    const d = new THREE.Object3D()
    for (let i = 0; i < samples.count; i++) {
      d.position.set(samples.x[i], -TILE / 2, samples.z[i])
      d.updateMatrix()
      mesh.current.setMatrixAt(i, d.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [samples])
  return (
    <group position={[pos[0], y, pos[1]]}>
      <instancedMesh ref={mesh} args={[null, null, samples.count]}>
        <boxGeometry args={[h * 0.92, TILE, h * 0.92]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.12} emissive={LAND.stoneEmissive} emissiveIntensity={0.5} />
      </instancedMesh>
    </group>
  )
}

/** A straight walkable causeway slab with an amber spine down its middle. */
export function CausewaySlab({ a, b, y = 0, width = layout.causewayWidth, spine = true }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  const ang = Math.atan2(b[0] - a[0], b[1] - a[1])
  return (
    <group position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]} rotation={[0, ang, 0]}>
      <mesh position={[0, -TILE / 2, 0]}>
        <boxGeometry args={[width, TILE, len]} />
        <meshStandardMaterial color={LAND.stone} roughness={0.55} metalness={0.12} emissive={LAND.stoneEmissive} emissiveIntensity={0.5} />
      </mesh>
      {spine && (
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.08, 0.02, len]} />
          <meshStandardMaterial color="#f0b27a" emissive="#ff9a2a" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[width * 0.5, 3, Math.max(0.5, len * 0.6)]} />
        <meshStandardMaterial color={LAND.rock} roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

function Pillar({ x, z, top = 0, r = 0.6 }) {
  return (
    <mesh position={[x, top - 2.2, z]}>
      <cylinderGeometry args={[r * 0.55, r, 4.4, 7]} />
      <meshStandardMaterial color={LAND.rock} roughness={0.95} flatShading />
    </mesh>
  )
}

/** Where the Ringed Isle stood: open water inside a ring of dead beacon stumps. */
function RingedIsleRuin() {
  const glow = useRef()
  useFrame(({ clock }) => {
    if (glow.current) glow.current.material.opacity = 0.07 + Math.sin(clock.elapsedTime * 1.3) * 0.03
  })
  const { pos, R } = layout.ringedIsle
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * (R + 0.4), -0.25, Math.sin(a) * (R + 0.4)]} rotation={[0.2 * Math.sin(a), 0, 0.2 * Math.cos(a)]}>
            <cylinderGeometry args={[0.12, 0.22, 0.9, 6]} />
            <meshStandardMaterial color="#2a2236" roughness={0.8} emissive="#5a2a9a" emissiveIntensity={0.25} />
          </mesh>
        )
      })}
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <ringGeometry args={[R - 0.8, R + 0.9, 48]} />
        <meshBasicMaterial color="#8a3cff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  )
}

function TidewarpFlats() {
  const { pos, r } = layout.scenery.tidewarp_flats
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(r, 40)
    const p = g.attributes.position
    for (let i = 1; i < p.count; i++) {
      const a = Math.atan2(p.getY(i), p.getX(i))
      const k = 1 + 0.12 * Math.sin(a * 3) + 0.07 * Math.sin(a * 7 + 1)
      p.setXY(i, p.getX(i) * k, p.getY(i) * k)
    }
    return g
  }, [r])
  return (
    <group position={[pos[0], -0.12, pos[1]]}>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color={LAND.stoneDark} roughness={0.25} metalness={0.4} emissive="#1c2a44" emissiveIntensity={0.4} />
      </mesh>
      {/* gold ribbons between posts: 0-2's homotopies */}
      {[-1.6, 0, 1.6].map((z, i) => (
        <group key={i}>
          <mesh position={[-2.4, 0.3, z]}>
            <cylinderGeometry args={[0.08, 0.1, 0.6, 6]} />
            <meshStandardMaterial color="#3b3326" />
          </mesh>
          <mesh position={[2.4, 0.3, z]}>
            <cylinderGeometry args={[0.08, 0.1, 0.6, 6]} />
            <meshStandardMaterial color="#3b3326" />
          </mesh>
          <mesh position={[0, 0.03, z + Math.sin(i) * 0.3]} rotation={[0, 0.15 * (i - 1), 0]}>
            <boxGeometry args={[4.8, 0.02, 0.08]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <Pillar x={0} z={0} top={-0.1} r={1.6} />
    </group>
  )
}

const FIGURE_EIGHT = {
  add: [
    { type: 'circle', cx: -1.05, cz: 0, r: 1.25 },
    { type: 'circle', cx: 1.05, cz: 0, r: 1.25 },
  ],
  sub: [
    { type: 'circle', cx: -1.05, cz: 0, r: 0.55 },
    { type: 'circle', cx: 1.05, cz: 0, r: 0.55 },
  ],
}
const THETA = {
  add: [{ type: 'circle', cx: 0, cz: 0, r: 2 }],
  sub: [
    { type: 'rect', x0: -1.35, x1: -0.3, z0: -1.1, z1: 1.1 },
    { type: 'rect', x0: 0.3, x1: 1.35, z0: -1.1, z1: 1.1 },
  ],
}

function MirrorShoals() {
  const [x, z] = layout.scenery.mirror_shoals.pos
  return (
    <group>
      <StaticReef shapeDef={FIGURE_EIGHT} pos={[x - 3.4, z]} />
      <StaticReef shapeDef={THETA} pos={[x + 3.2, z]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.3, z]}>
        <planeGeometry args={[2.2, 5]} />
        <meshStandardMaterial color="#9fb4d8" roughness={0.05} metalness={0.9} transparent opacity={0.35} />
      </mesh>
      {/* the Mirror Gate */}
      <mesh position={[x, 1.1, z - 2.8]}>
        <boxGeometry args={[1.8, 2.4, 0.25]} />
        <meshStandardMaterial color="#c9d6e6" roughness={0.05} metalness={1} />
      </mesh>
      <Pillar x={x - 3.4} z={z} r={1.4} />
      <Pillar x={x + 3.2} z={z} r={1.4} />
    </group>
  )
}

function Furnace({ x, z }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.emissiveIntensity = 1.6 + Math.sin(clock.elapsedTime * 3 + x) * 0.4
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.45, 0.6, 1.1, 8]} />
        <meshStandardMaterial color="#2c3240" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.5, 0.48]}>
        <boxGeometry args={[0.36, 0.42, 0.08]} />
        <meshStandardMaterial ref={ref} color="#ffb347" emissive="#ff8a1f" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.9, 6]} />
        <meshStandardMaterial color="#232834" />
      </mesh>
    </group>
  )
}

function Foundry() {
  const f = layout.scenery.skeleton_foundry
  const [cx, cz] = f.pos
  return (
    <group>
      {/* the raised basalt cliff */}
      <mesh position={[cx, -1.2, cz]}>
        <cylinderGeometry args={[7.5, 8.6, 4.4, 9]} />
        <meshStandardMaterial color={LAND.stoneDark} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[cx, 1.0, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7.5, 9]} />
        <meshStandardMaterial color={LAND.stone} roughness={0.6} />
      </mesh>
      <group position={[0, 1.0, 0]}>
        {f.sites.map((s, i) => (
          <group key={s.id}>
            <Furnace x={s.pos[0] - 0.9} z={s.pos[1]} />
            <Furnace x={s.pos[0] + 0.9} z={s.pos[1] + 0.4} />
            {/* crane arm */}
            <mesh position={[s.pos[0], 1.6, s.pos[1] - 0.8]} rotation={[0, i, 0.5]}>
              <boxGeometry args={[0.14, 2.4, 0.14]} />
              <meshStandardMaterial color="#3a4152" metalness={0.5} roughness={0.5} />
            </mesh>
            {/* disk press */}
            <mesh position={[s.pos[0], 0.12, s.pos[1] + 1.3]}>
              <cylinderGeometry args={[0.7, 0.7, 0.18, 24]} />
              <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={s.bonus ? 0.4 : 0.9} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

/** The unbuilt bridge to the Hollow Throne: a line of broken pylons. */
function ThroneBridgeRuin() {
  const { a, b } = layout.scenery.throne_bridge
  const n = 9
  return Array.from({ length: n }, (_, i) => {
    const u = (i + 0.5) / n
    const x = a[0] + (b[0] - a[0]) * u
    const z = a[1] + (b[1] - a[1]) * u
    return (
      <mesh key={i} position={[x, -0.8 - (i % 3) * 0.35, z]} rotation={[0.1 * (i % 2), 0, 0.12 * ((i % 3) - 1)]}>
        <cylinderGeometry args={[0.25, 0.4, 2.6, 6]} />
        <meshStandardMaterial color={LAND.rock} roughness={0.9} flatShading />
      </mesh>
    )
  })
}

/** Null's spire (the Hollow Throne), for the level; the intro draws its own taller one. */
export function HollowThrone({ height = 7.2 }) {
  const [x, z] = layout.scenery.hollow_throne.pos
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, (height - 7) / 2 - 0.15, 0]}>
        <coneGeometry args={[1.6, height + 7, 6, 1, true]} />
        <meshStandardMaterial color="#0e0b13" roughness={0.4} metalness={0.5} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, height + 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.05, 8, 40]} />
        <meshStandardMaterial color="#0d0a12" emissive="#a259ff" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Everything around the playable sites.
 * staticSites: also draw the playable sites as static reefs (the intro); the level draws its own.
 * skipSites: site ids not to draw statically (e.g. the intro's crumbling Walkway).
 * gateOpen: the broken causeway has been mended.
 * ruin: show the Ringed Isle's ruin (after the collapse).
 */
export default function ReefScenery({ y = 0, staticSites = false, skipSites = [], gateOpen = false, ruin = true, throne = true }) {
  return (
    <group position={[0, y, 0]}>
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} />
      ))}
      {gateSegments(gateOpen).map(([a, b], i) => (
        <CausewaySlab key={`g${i}`} a={a} b={b} spine={gateOpen} />
      ))}
      {SITES.filter((s) => s.id === 'landing_pier' || (staticSites && !skipSites.includes(s.id))).map((s) => (
        <StaticReef key={s.id} shapeDef={s.def} pos={s.pos} />
      ))}
      {SITES.filter((s) => s.id !== 'landing_pier').map((s) => (
        <Pillar key={s.id} x={s.pos[0]} z={s.pos[1]} top={-0.35} r={1.2} />
      ))}
      <TidewarpFlats />
      <MirrorShoals />
      <Foundry />
      <ThroneBridgeRuin />
      {ruin && <RingedIsleRuin />}
      {throne && <HollowThrone />}
    </group>
  )
}
