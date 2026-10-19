import { useFrame } from '@react-three/fiber'
import { Html, Line, Sparkles, Stars } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Seascape from '../../world/Seascape'
import { LAND } from '../../theme/palette'
import { CausewaySlab } from '../../world/ReefScenery'

/**
 * Tidewarp Flats scenery, shared by Level 0-2 and its intro movie: a wide slab of
 * wet basalt with the tide pools cut clean through it, stone posts and stakes,
 * marker stones, shrine arches, the causeway in from Retract Reef and the bridge out
 * toward Mirror Shoals. Built from tidewarpFlats.json.
 */

const SEA = '#04161a'

/** Hexagonal basalt-column pattern for the wet flats (procedural, tiling). */
function useBasaltTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const g = c.getContext('2d')
    g.fillStyle = '#6a7390'
    g.fillRect(0, 0, 512, 512)
    const R = 42
    const h = Math.sqrt(3) * R
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let row = -1; row < 512 / h + 1; row++) {
      for (let col = -1; col < 512 / (1.5 * R) + 1; col++) {
        const cx = col * 1.5 * R
        const cy = row * h + (col % 2 ? h / 2 : 0)
        const shade = 96 + Math.floor(rnd() * 30)
        g.fillStyle = `rgb(${shade - 8},${shade},${shade + 18})`
        g.strokeStyle = '#3a4258'
        g.lineWidth = 4
        g.beginPath()
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k
          const x = cx + (R - 2) * Math.cos(a)
          const y = cy + (R - 2) * Math.sin(a)
          k ? g.lineTo(x, y) : g.moveTo(x, y)
        }
        g.closePath()
        g.fill()
        g.stroke()
      }
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(0.16, 0.16)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [])
}

/** The flats: an extruded slab with a hole for every pool. */
function FlatsGround({ layout }) {
  const tex = useBasaltTexture()
  const geo = useMemo(() => {
    const shape = new THREE.Shape(layout.outline.map(([x, z]) => new THREE.Vector2(x, z)))
    for (const p of layout.pools) {
      const hole = new THREE.Path()
      hole.absarc(p.c[0], p.c[1], p.r, 0, Math.PI * 2, true)
      shape.holes.push(hole)
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 2, curveSegments: 40 })
  }, [layout])
  return (
    <mesh geometry={geo} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <meshStandardMaterial map={tex} color="#c4cde4" roughness={0.24} metalness={0.25} emissive="#1a2133" emissiveIntensity={0.7} />
    </mesh>
  )
}

/** A tide pool: dark deep water with a slow teal shimmer and a ring of rim stones. */
function Pool({ pool, wet = false }) {
  const water = useRef()
  const glow = useRef()
  const stones = useMemo(() => {
    const n = Math.round(pool.r * 9)
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.sin(i * 7.1) * 0.1
      const rr = pool.r + 0.12 + Math.sin(i * 3.3) * 0.05
      return { pos: [pool.c[0] + rr * Math.cos(a), 0.02, pool.c[1] + rr * Math.sin(a)], s: 0.07 + ((i * 37) % 5) * 0.012, rot: i * 1.3 }
    })
  }, [pool])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    water.current.material.emissiveIntensity = 0.55 + Math.sin(t * 0.9 + pool.c[0]) * 0.15
    water.current.position.y = -0.32 + Math.sin(t * 0.5 + pool.c[1]) * 0.03 // the tide breathing
    glow.current.material.opacity = 0.35 + Math.sin(t * 1.3 + pool.r) * 0.12
    glow.current.material.color.set(wet ? '#a259ff' : '#4fe0d0')
  })
  return (
    <group>
      <mesh ref={water} rotation={[-Math.PI / 2, 0, 0]} position={[pool.c[0], -0.32, pool.c[1]]}>
        <circleGeometry args={[pool.r + 0.05, 48]} />
        <meshStandardMaterial color="#03222a" emissive="#0a5a62" emissiveIntensity={0.55} roughness={0.08} metalness={0.7} />
      </mesh>
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[pool.c[0], -0.2, pool.c[1]]}>
        <ringGeometry args={[pool.r - 0.12, pool.r, 64]} />
        <meshBasicMaterial color="#4fe0d0" transparent opacity={0.4} toneMapped={false} />
      </mesh>
      {stones.map((st, i) => (
        <mesh key={i} position={st.pos} rotation={[st.rot, st.rot * 2, 0]} scale={st.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={LAND.stoneDark} roughness={0.5} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/**
 * A ribbon's end post (tall, gold-ringed: it never moves) or a stake (short; gold cap
 * once hooked). A stake the shrine wants gets a pulsing ring and a numbered badge
 * (`badge`: 1, 2, …) giving the order to hook it in.
 */
export function Post({ pos, kind = 'post', lit = false, y = 0, badge = null }) {
  const cap = useRef()
  const ring = useRef()
  const tall = kind === 'post'
  useFrame(({ clock }) => {
    if (!cap.current) return
    cap.current.material.emissiveIntensity = lit || tall ? 1.4 + Math.sin(clock.elapsedTime * 3) * 0.4 : badge ? 0.6 : 0.15
    if (ring.current) {
      ring.current.material.opacity = lit ? 0.9 : 0.35 + Math.abs(Math.sin(clock.elapsedTime * 2.5)) * 0.45
      ring.current.scale.setScalar(lit ? 1 : 1 + Math.abs(Math.sin(clock.elapsedTime * 2.5)) * 0.25)
    }
  })
  const h = tall ? 0.72 : 0.42
  return (
    <group position={[pos[0], y, pos[1]]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[tall ? 0.12 : 0.08, tall ? 0.16 : 0.11, h, 7]} />
        <meshStandardMaterial color={LAND.rock} roughness={0.7} flatShading />
      </mesh>
      <mesh ref={cap} position={[0, h + 0.03, 0]}>
        <cylinderGeometry args={[tall ? 0.15 : 0.1, tall ? 0.13 : 0.09, 0.06, 12]} />
        <meshStandardMaterial color={lit || tall ? '#ffd27a' : '#6d6450'} emissive="#ffb347" emissiveIntensity={0.15} toneMapped={false} />
      </mesh>
      {tall && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.2, 0.26, 24]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.6} toneMapped={false} />
        </mesh>
      )}
      {badge && (
        <>
          <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <ringGeometry args={[0.3, 0.42, 32]} />
            <meshBasicMaterial color="#ffd27a" transparent opacity={0.6} toneMapped={false} />
          </mesh>
          <Html position={[0, 0.95, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`stake-badge${lit ? ' lit' : ''}`}>{badge}</div>
          </Html>
        </>
      )}
    </group>
  )
}

/** A marker stone at the Tide Line: lights gold once the ribbon has touched it. */
export function MarkerStone({ pos, lit }) {
  const ring = useRef()
  useFrame(({ clock }) => {
    ring.current.material.opacity = lit ? 0.95 : 0.35 + Math.sin(clock.elapsedTime * 2 + pos[0]) * 0.15
    ring.current.material.color.set(lit ? '#ffd27a' : '#9fb4d8')
  })
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 0.08, 10]} />
        <meshStandardMaterial color={lit ? '#7d6a40' : LAND.stoneDark} emissive={lit ? '#ffb347' : '#000000'} emissiveIntensity={lit ? 0.8 : 0} roughness={0.5} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[0.26, 0.32, 24]} />
        <meshBasicMaterial color="#9fb4d8" transparent opacity={0.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A shrine: a low basalt altar with a glyph ring that glows when the shrine is satisfied (low, so it never hides Gyroid). */
export function Shrine({ pos, state = 'idle', face = 0 }) {
  const glyph = useRef()
  useFrame(({ clock }) => {
    const col = state === 'done' ? '#ffd27a' : state === 'active' ? '#7fe8dc' : '#56607a'
    glyph.current.material.color.set(col)
    glyph.current.material.opacity = state === 'idle' ? 0.5 : 0.75 + Math.sin(clock.elapsedTime * 2.5) * 0.2
  })
  return (
    <group position={[pos[0], 0, pos[1]]} rotation={[0, face, 0]}>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.2, 0.44, 0.2]} />
          <meshStandardMaterial color={LAND.stoneDark} roughness={0.6} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.38, 0.46, 0.32, 8]} />
        <meshStandardMaterial color={LAND.stoneDark} roughness={0.6} flatShading />
      </mesh>
      <mesh ref={glyph} position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.04, 8, 32]} />
        <meshBasicMaterial color="#56607a" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.03, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshStandardMaterial color={LAND.footprint} roughness={0.4} />
      </mesh>
    </group>
  )
}

/**
 * A polyline redrawn every frame from getPts() (a ribbon, a ghost frame, a target).
 *
 * The line's buffer has a fixed capacity: the renderer sizes a fat line's draw count
 * from the first data it sees, so a buffer that grows later gets cut short (a long
 * zigzag ribbon would stop drawing partway). Unused slots repeat the last point, which
 * draws nothing; longer paths are thinned to fit.
 */
const LINE_CAPACITY = 640

export function LiveLine({ getPts, color = '#ffcf6a', width = 5, opacity = 1, dashed = false, y = 0.08 }) {
  const ref = useRef()
  const init = useMemo(() => Array.from({ length: LINE_CAPACITY }, (_, i) => [i * 1e-4, -50, 0]), [])
  const arr = useMemo(() => new Float32Array(LINE_CAPACITY * 3), [])
  useFrame(() => {
    const line = ref.current
    if (!line) return
    const pts = getPts()
    if (!pts || pts.length < 2) {
      line.visible = false
      return
    }
    line.visible = true
    const n = Math.min(pts.length, LINE_CAPACITY)
    const step = (pts.length - 1) / (n - 1)
    for (let i = 0; i < LINE_CAPACITY; i++) {
      const p = pts[i < n ? Math.round(i * step) : pts.length - 1]
      arr[i * 3] = p[0]
      arr[i * 3 + 1] = p[2] ?? y
      arr[i * 3 + 2] = p[1]
    }
    line.geometry.setPositions(arr)
    if (dashed) line.computeLineDistances()
  })
  return (
    <Line
      ref={ref}
      points={init}
      color={color}
      lineWidth={width}
      transparent
      opacity={opacity}
      dashed={dashed}
      dashSize={0.25}
      gapSize={0.18}
      toneMapped={false}
      depthWrite={false}
      frustumCulled={false}
    />
  )
}

export default function FlatsScenery({ layout, bridged = true, exitOpen = false }) {
  const e = layout.entry
  const x = layout.exit
  const along = (a, b, X) => {
    const u = (X - a[0]) / (b[0] - a[0])
    return [X, a[1] + (b[1] - a[1]) * u]
  }
  const g0 = along(e.a, e.b, e.gap[0])
  const g1 = along(e.a, e.b, e.gap[1])
  const exitStub = [x.a[0] + (x.b[0] - x.a[0]) * 0.25, x.a[1] + (x.b[1] - x.a[1]) * 0.25]
  return (
    <>
      <color attach="background" args={['#060a14']} />
      <fog attach="fog" args={['#060a14', 24, 60]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#6d9cc4', '#0a0a14', 0.6]} />
      <directionalLight position={[-10, 18, 12]} intensity={1.25} color="#dcefff" />
      <pointLight position={[0, 6, 0]} intensity={8} distance={30} color="#7fe8dc" />
      <Stars radius={90} depth={40} count={2200} factor={3} fade speed={0.3} />
      <Sparkles count={220} scale={[44, 3, 30]} position={[0, 0.8, 0]} size={2} speed={0.2} color="#7fe8dc" />
      <Seascape y={-0.55} area={[0, 0, 70, 56]} seed={23} palette={{ water: '#0c4a5a', sand: '#3e6a5a', weed: '#2a5a38' }} lanterns={8} />

      <FlatsGround layout={layout} />
      {layout.pools.map((p) => (
        <Pool key={p.id} pool={p} />
      ))}

      {/* the causeway in from Retract Reef (its broken middle bridged by the Spool) */}
      {bridged ? (
        <CausewaySlab a={e.a} b={e.b} />
      ) : (
        <>
          <CausewaySlab a={e.a} b={g0} />
          <CausewaySlab a={g1} b={e.b} />
        </>
      )}
      {/* the way on toward Mirror Shoals — a stub until the tide goes out */}
      <CausewaySlab a={x.a} b={exitOpen ? x.b : exitStub} spine={exitOpen} />

      {/* far-off silhouettes: Mirror Shoals to the north-east, the reef to the west */}
      {[
        [44, -30, 6, 1.4],
        [52, -16, 4, 0.9],
        [-46, -4, 5, 1.1],
        [-40, -26, 4, 0.8],
      ].map(([px, pz, r, h], i) => (
        <mesh key={i} position={[px, h / 2 - 0.9, pz]}>
          <cylinderGeometry args={[r * 0.8, r, h, 9]} />
          <meshStandardMaterial color={LAND.stoneDark} roughness={0.8} flatShading />
        </mesh>
      ))}
    </>
  )
}
