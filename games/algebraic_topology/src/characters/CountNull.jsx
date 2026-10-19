import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Count Null — procedural figure modeled on assets/characters/count-null.png:
 * a tall pointed hood over a long porcelain mask, a layered mantle with sharp
 * shoulder points, obsidian robes that flare into a pointed trailing hem, a
 * chevroned front panel with dark orbs at collar and chest, a floating spiked
 * halo crown, and torn surface fragments orbiting one open, raised hand.
 * Everything is lathed with smooth normals and violet back-face rims.
 *
 * `script(t)` → { gesture, crown, crownY }
 *   gesture: 0 hand at side … 1 hand thrust forward
 *   crown:   0..1 crown glow / beam charge
 */

const VIOLET = '#a259ff'
const ROBE = { color: '#15111c', roughness: 0.72, metalness: 0.15 }
const TRIM = { color: '#211a2c', roughness: 0.55, metalness: 0.3 }
export const CROWN_Y = 3.18 // the collapse beam leaves from here

const v2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y))
const tri = (x) => 1 - Math.abs(((x % 1) + 1) % 1 * 2 - 1) // 0 → 1 → 0 sawtooth peak

/**
 * Lathe a profile ([radius, y] from bottom to top) into cloth: vertical folds
 * that deepen toward the hem, and a hem cut into `points` pointed tails that
 * spread outward (or hang down, for capes). `depth` flattens front-to-back.
 */
function cloth(profile, { seg = 72, folds = 9, fold = 0.05, points = 0, phase = 0, tail = 0, hang = false, depth = 0.78, seed = 0, phiStart = 0, phiLength = Math.PI * 2 } = {}) {
  const g = new THREE.LatheGeometry(v2(profile), seg, phiStart, phiLength)
  const p = g.attributes.position
  const y0 = profile[0][1]
  const y1 = profile[profile.length - 1][1]
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i)
    let y = p.getY(i)
    let z = p.getZ(i)
    const a = Math.atan2(x, z) // 0 = front
    const low = 1 - (y - y0) / (y1 - y0) // 1 at hem, 0 at top
    const k = 1 + fold * low * Math.sin(a * folds + seed) + fold * 0.4 * low * Math.sin(a * folds * 2.3 + seed * 3)
    x *= k
    z *= k
    if (points && low > 0.999) {
      const peak = tri((a / (Math.PI * 2)) * points + 0.5 + phase) ** 1.6
      if (hang) y -= peak * tail
      else {
        const out = 1 + peak * tail
        x *= out
        z *= out
        y += (1 - peak) * tail * 0.12
      }
    }
    p.setXYZ(i, x, y, z * depth)
  }
  g.computeVertexNormals()
  return g
}

/** Mesh plus a slightly inflated back-face shell that reads as the violet rim light. */
function Rimmed({ geometry, children, rim = 1.03, rimColor = VIOLET, rimOpacity = 0.85, ...props }) {
  return (
    <group {...props}>
      <mesh geometry={geometry}>{children}</mesh>
      <mesh geometry={geometry} scale={rim}>
        <meshBasicMaterial color={rimColor} side={THREE.BackSide} transparent opacity={rimOpacity} toneMapped={false} />
      </mesh>
    </group>
  )
}

const Robe = (props) => <meshStandardMaterial {...ROBE} side={THREE.DoubleSide} {...props} />

function Fragments({ count = 18 }) {
  const group = useRef()
  const shards = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        a: (i / count) * Math.PI * 2 + Math.sin(i * 3.7) * 0.12,
        r: 0.3 + (i % 3) * 0.045,
        y: Math.sin(i * 2.1) * 0.05,
        s: [0.022 + (i % 4) * 0.01, 0.016 + ((i * 5) % 3) * 0.008, 0.012],
        spin: 0.4 + (i % 5) * 0.25,
        kind: i % 3,
      })),
    [count],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    group.current.children.forEach((m, i) => {
      const d = shards[i]
      if (!d) return
      const a = d.a + t * 0.5
      m.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 1.3 + i) * 0.03, Math.sin(a) * d.r)
      m.rotation.set(t * d.spin + i, t * d.spin * 0.7, i)
    })
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.075, 32, 24]} />
        <meshStandardMaterial color="#050308" roughness={0.15} metalness={0.9} />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[0.075, 32, 24]} />
        <meshBasicMaterial color={VIOLET} side={THREE.BackSide} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <group ref={group}>
        {shards.map((d, i) => (
          <mesh key={i} scale={d.s}>
            {d.kind === 0 ? <tetrahedronGeometry args={[1, 0]} /> : d.kind === 1 ? <octahedronGeometry args={[1, 0]} /> : <dodecahedronGeometry args={[1, 0]} />}
            <meshStandardMaterial color="#1a1222" emissive={VIOLET} emissiveIntensity={1.3} toneMapped={false} flatShading />
          </mesh>
        ))}
      </group>
      <pointLight color={VIOLET} intensity={0.8} distance={1.2} />
    </group>
  )
}

/** Floating halo crown: a broken black ring of upward spikes, tallest at front and back, with short inward prongs. */
export function NullCrown({ glowRef }) {
  const mats = useRef([])
  const GAP = 0.32
  const ringGeo = useMemo(() => new THREE.TorusGeometry(0.3, 0.022, 12, 96, Math.PI * 2 - GAP), [])
  useFrame(() => {
    const g = 0.25 + (glowRef?.current ?? 0) * 1.3
    mats.current.forEach((m) => m && (m.emissiveIntensity = g))
  })
  const spikes = useMemo(() => {
    const out = []
    const n = 16
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * (Math.PI * 2 - GAP) // along the ring's arc, skipping the break
      const h = 0.09 + 0.2 * Math.abs(Math.cos(a - Math.PI)) ** 3 + ((i * 7) % 3) * 0.015
      out.push({ a, h, up: true })
    }
    for (let i = 0; i < 8; i++) out.push({ a: ((i + 0.5) / 8) * (Math.PI * 2 - GAP), h: 0.09, up: false })
    return out
  }, [])
  const mat = (i) => (
    <meshStandardMaterial ref={(m) => (mats.current[i] = m)} color="#0d0a12" metalness={0.85} roughness={0.25} emissive={VIOLET} emissiveIntensity={0.6} toneMapped={false} />
  )
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={ringGeo} rotation={[Math.PI / 2, 0, 0]}>
        {mat(0)}
      </mesh>
      {spikes.map((s, i) => (
        <group key={i} rotation={[0, -s.a, 0]}>
          {s.up ? (
            <mesh position={[0.3, s.h / 2, 0]} rotation={[0, 0, -0.12]}>
              <coneGeometry args={[0.02, s.h, 6]} />
              {mat(i + 1)}
            </mesh>
          ) : (
            // inward prongs, pointing at the empty center
            <mesh position={[0.25, -0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.014, s.h, 5]} />
              {mat(i + 1)}
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

/** Gloved open hand in its forearm's frame: fingers along -y, palm facing +z. */
function Hand({ glow = 0.5, curl = 0.35 }) {
  return (
    <group>
      <mesh scale={[0.085, 0.095, 0.03]}>
        <sphereGeometry args={[0.5, 16, 12]} />
        <meshStandardMaterial color="#1b1424" roughness={0.5} emissive={VIOLET} emissiveIntensity={glow} />
      </mesh>
      {[-1.5, -0.5, 0.5, 1.5].map((f) => (
        <group key={f} position={[f * 0.019, -0.045, 0]} rotation={[-curl, 0, f * 0.06]}>
          <mesh position={[0, -0.032, 0]}>
            <capsuleGeometry args={[0.0085, 0.05 - Math.abs(f) * 0.008, 4, 8]} />
            <meshStandardMaterial color="#1b1424" roughness={0.5} emissive={VIOLET} emissiveIntensity={glow} />
          </mesh>
        </group>
      ))}
      <group position={[0.045, -0.005, 0.005]} rotation={[-0.3, 0, 0.9]}>
        <mesh position={[0, -0.025, 0]}>
          <capsuleGeometry args={[0.009, 0.035, 4, 8]} />
          <meshStandardMaterial color="#1b1424" roughness={0.5} emissive={VIOLET} emissiveIntensity={glow} />
        </mesh>
      </group>
    </group>
  )
}

export default function CountNull({ script, scale = 1 }) {
  const root = useRef()
  const arm = useRef()
  const forearm = useRef()
  const crown = useRef()
  const orb = useRef()
  const glowRef = useRef(0)
  const cur = useRef({ gesture: 0 })

  const geo = useMemo(
    () => ({
      robe: cloth(
        [[0.86, 0.02], [0.78, 0.22], [0.7, 0.6], [0.56, 1.05], [0.46, 1.5], [0.4, 1.9], [0.34, 2.2], [0.24, 2.36]],
        { seg: 96, folds: 11, fold: 0.07, points: 9, tail: 0.24, seed: 1 },
      ),
      underRobe: cloth([[0.6, 0.0], [0.5, 0.6], [0.42, 1.4], [0.3, 2.1]], { folds: 7, fold: 0.04, depth: 0.85, seed: 4 }),
      mantleLow: cloth([[0.7, 1.86], [0.6, 2.04], [0.42, 2.26], [0.2, 2.44]], { folds: 6, fold: 0.03, points: 6, phase: 0.5, tail: 0.2, hang: true, depth: 0.66, seed: 2 }),
      mantleHigh: cloth([[0.56, 2.08], [0.46, 2.2], [0.3, 2.36], [0.17, 2.47]], { folds: 5, fold: 0.03, points: 6, tail: 0.12, hang: true, depth: 0.7, seed: 6 }),
      // tall pointed hood, open over the face (phi = 0 is the front)
      hood: cloth(
        [[0.2, -0.22], [0.225, -0.05], [0.22, 0.1], [0.185, 0.22], [0.12, 0.32], [0.05, 0.39], [0.005, 0.42]],
        { seg: 48, folds: 4, fold: 0.03, depth: 1.02, phiStart: 0.78, phiLength: Math.PI * 2 - 1.56 },
      ),
      // long porcelain mask tapering to a pointed chin
      mask: new THREE.LatheGeometry(
        v2([[0.0, -0.23], [0.03, -0.19], [0.065, -0.12], [0.092, -0.04], [0.105, 0.04], [0.1, 0.11], [0.075, 0.165], [0.035, 0.195], [0.0, 0.205]]),
        48,
      ),
      sleeve: cloth([[0.17, -0.58], [0.12, -0.3], [0.085, 0.0]], { seg: 32, folds: 5, fold: 0.06, points: 4, tail: 0.1, hang: true, depth: 0.9, seed: 3 }),
      upperSleeve: cloth([[0.11, -0.56], [0.1, -0.25], [0.09, 0.02]], { seg: 32, folds: 4, fold: 0.04, depth: 0.95, seed: 5 }),
      restSleeve: cloth([[0.22, -0.98], [0.15, -0.6], [0.1, -0.2], [0.085, 0.02]], { seg: 32, folds: 6, fold: 0.07, points: 5, tail: 0.16, hang: true, depth: 0.85, seed: 7 }),
      panel: (() => {
        // long front panel, pointed at the bottom
        const s = new THREE.Shape()
        s.moveTo(-0.16, 0.85)
        s.lineTo(0.16, 0.85)
        s.lineTo(0.13, -0.48)
        s.lineTo(0, -0.7)
        s.lineTo(-0.13, -0.48)
        s.closePath()
        return new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 })
      })(),
      chevron: (() => {
        const s = new THREE.Shape()
        s.moveTo(-0.13, 0.05)
        s.lineTo(0, -0.06)
        s.lineTo(0.13, 0.05)
        s.lineTo(0.13, 0.0)
        s.lineTo(0, -0.11)
        s.lineTo(-0.13, 0.0)
        s.closePath()
        return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false })
      })(),
    }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = script(t)
    const c = cur.current
    c.gesture = THREE.MathUtils.lerp(c.gesture, s.gesture, Math.min(1, dt * 5))
    glowRef.current = s.crown
    root.current.position.y = Math.sin(t * 1.1) * 0.03
    arm.current.rotation.x = THREE.MathUtils.lerp(-0.5, -1.45, c.gesture)
    arm.current.rotation.z = THREE.MathUtils.lerp(0.42, 0.14, c.gesture)
    forearm.current.rotation.x = THREE.MathUtils.lerp(-1.0, -0.12, c.gesture)
    crown.current.position.y = CROWN_Y + (s.crownY ?? 0) + Math.sin(t * 1.6) * 0.025
    crown.current.rotation.y = Math.sin(t * 0.3) * 0.5
    orb.current.emissiveIntensity = 0.8 + s.crown * 2.5 + Math.sin(t * 2) * 0.2
  })

  // the robe's slope under the front panel
  const PANEL_TILT = -0.2

  return (
    <group scale={scale}>
      <group ref={root}>
        {/* robes */}
        <Rimmed geometry={geo.robe} rim={1.025}>
          <Robe />
        </Rimmed>
        <mesh geometry={geo.underRobe} position={[0, 0, 0.05]}>
          <meshStandardMaterial color="#1b1524" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>

        {/* front panel with chevrons and the chest orb */}
        <group position={[0, 1.08, 0.45]} rotation={[PANEL_TILT, 0, 0]}>
          <mesh geometry={geo.panel}>
            <meshStandardMaterial {...TRIM} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} geometry={geo.chevron} position={[0, 0.45 - i * 0.12, 0.03]}>
              <meshStandardMaterial color="#2e2540" roughness={0.4} metalness={0.4} emissive={VIOLET} emissiveIntensity={0.15 + i * 0.05} />
            </mesh>
          ))}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.2, -0.05, -0.01]} rotation={[0, 0, sd * 0.02]}>
              <boxGeometry args={[0.035, 1.4, 0.02]} />
              <meshStandardMaterial {...TRIM} />
            </mesh>
          ))}
        </group>
        <group position={[0, 1.72, 0.42]}>
          <mesh>
            <sphereGeometry args={[0.065, 32, 24]} />
            <meshStandardMaterial ref={orb} color="#120818" roughness={0.15} metalness={0.6} emissive={VIOLET} emissiveIntensity={1} toneMapped={false} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.09, 0.012, 8, 4]} />
            <meshStandardMaterial {...TRIM} emissive={VIOLET} emissiveIntensity={0.3} />
          </mesh>
        </group>

        {/* mantle: two layers of pointed cape */}
        <Rimmed geometry={geo.mantleLow} scale={[1.18, 1, 1]} rim={1.03}>
          <Robe />
        </Rimmed>
        <Rimmed geometry={geo.mantleHigh} scale={[1.1, 1, 1]} rim={1.03}>
          <meshStandardMaterial {...TRIM} side={THREE.DoubleSide} />
        </Rimmed>
        <mesh position={[0, 2.38, 0.2]}>
          <sphereGeometry args={[0.045, 24, 16]} />
          <meshStandardMaterial color="#120818" roughness={0.15} metalness={0.6} emissive={VIOLET} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>

        {/* head: pointed hood, dark hollow, porcelain mask */}
        <group position={[0, 2.66, 0]}>
          <Rimmed geometry={geo.hood} rim={1.05}>
            <Robe />
          </Rimmed>
          <mesh position={[0, 0.0, -0.08]}>
            <sphereGeometry args={[0.16, 24, 16]} />
            <meshBasicMaterial color="#030205" />
          </mesh>
          <group position={[0, 0.0, 0.09]} scale={[1, 1, 0.6]}>
            <mesh geometry={geo.mask}>
              <meshStandardMaterial color="#e6e1ea" roughness={0.22} metalness={0.05} emissive="#4a4258" emissiveIntensity={0.6} />
            </mesh>
          </group>
          {/* angled dark eye slits */}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.042, 0.045, 0.145]} rotation={[0, sd * 0.45, sd * 0.38]}>
              <boxGeometry args={[0.058, 0.02, 0.012]} />
              <meshStandardMaterial color="#07040b" emissive={VIOLET} emissiveIntensity={0.12} />
            </mesh>
          ))}
        </group>

        {/* floating crown */}
        <group ref={crown} position={[0, CROWN_Y, 0]}>
          <NullCrown glowRef={glowRef} />
        </group>

        {/* resting (right) sleeve */}
        <group position={[-0.42, 2.2, 0.02]} rotation={[0.05, 0, -0.12]}>
          <Rimmed geometry={geo.restSleeve}>
            <Robe />
          </Rimmed>
          <group position={[0.02, -1.0, 0.05]} rotation={[0.1, 0, 0]}>
            <Hand glow={0.15} curl={0.9} />
          </group>
        </group>

        {/* raised (left) arm: open palm, fragments orbiting above it */}
        <group ref={arm} position={[0.42, 2.2, 0.02]}>
          <Rimmed geometry={geo.upperSleeve}>
            <Robe />
          </Rimmed>
          <group ref={forearm} position={[0, -0.52, 0]}>
            <Rimmed geometry={geo.sleeve}>
              <Robe />
            </Rimmed>
            <group position={[0, -0.6, 0.02]}>
              <Hand glow={0.6} />
              <group position={[0, -0.12, 0.3]}>
                <Fragments />
              </group>
            </group>
          </group>
        </group>

        <pointLight position={[0.9, 2.6, 1.6]} color={VIOLET} intensity={2.2} distance={4} />
        <pointLight position={[-0.7, 0.4, -0.9]} color="#ff9a3c" intensity={1.1} distance={2.6} />
      </group>
    </group>
  )
}
