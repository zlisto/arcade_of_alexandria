import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Count Null's spawn, modeled on the concept sheets in assets/characters/enemies/:
 *
 *   SphereSpawn  — an obsidian orb split by a jagged violet mouth of crystal teeth that
 *                  gnashes open, four slit eyes, a floating halo, violet smoke and
 *                  orbiting shards. One lash collapses it to a point.
 *   TorusSpawn   — an armored, spiked ring standing on edge like a wheel, violet
 *                  joints between its plates, one slit eye glaring from the hole, two
 *                  energy loops (around the tube, through the hole) that turn gold as
 *                  each lash catches one. Two lashes.
 *   SnapperSpawn — a cracked obsidian crab with oversized snipping claws, six jointed
 *                  legs that scuttle, eyes on wobbling stalks, gold thread caught in its
 *                  pincers. One lash.
 *
 * Each reads the live enemy record `e` (position, facing, flash, stun, dying, hp…).
 */

const VIOLET = '#b070ff'
const LAVENDER = '#f1e6ff'
const obsidian = (extra = {}) => <meshStandardMaterial color="#17101f" roughness={0.22} metalness={0.6} emissive="#3a1466" emissiveIntensity={0.55} {...extra} />
const glow = (color = VIOLET, extra = {}) => <meshBasicMaterial color={color} toneMapped={false} {...extra} />

/** Common per-frame placement: hover, face, flash, collapse-to-a-point when dying. */
function place(g, e, y, dieTime, t, size = 1) {
  g.visible = e.alive || e.dying > 0
  g.position.set(e.x, y, e.z)
  g.rotation.y = e.face
  g.scale.setScalar(size * (e.dying > 0 ? Math.max(0.001, e.dying / dieTime) : 1 + (e.flash > 0 ? 0.12 : 0)))
}

// ---------------------------------------------------------------- sphere spawn

export function SphereSpawn({ e }) {
  const g = useRef()
  const top = useRef()
  const halo = useRef()
  const shards = useRef()
  const smoke = [useRef(), useRef(), useRef()]
  const shell = useRef()
  const R = 0.32
  const teeth = useMemo(() => Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.62 + Math.sin(t * 3) * 0.06, 0.5, t, 1.15)
    // the mouth gnashes: wider when it's close to biting (stunned = slack-jawed)
    const open = e.stun > 0 ? 0.5 : 0.12 + 0.28 * Math.max(0, Math.sin(t * 5.5)) ** 3
    top.current.rotation.x = -open
    halo.current.position.y = R + 0.22 + Math.sin(t * 2) * 0.03
    halo.current.rotation.z = Math.sin(t * 1.3) * 0.15
    shards.current.rotation.y = t * 1.6
    smoke.forEach((s, i) => {
      const k = ((t * 0.7 + i / 3) % 1)
      s.current.position.set(Math.sin(i * 2.1 + t) * 0.08, -R - k * 0.45, Math.cos(i * 1.7 + t) * 0.08)
      s.current.scale.setScalar(0.12 * (1 - k) + 0.03)
      s.current.material.opacity = 0.55 * (1 - k)
    })
    shell.current.material.emissiveIntensity = e.flash > 0 ? 2.5 : 0.35
  })
  const eye = (x, y, z, rz) => (
    <mesh position={[x, y, z]} rotation={[0, 0, rz]} scale={[0.055, 0.03, 0.03]}>
      <sphereGeometry args={[1, 12, 8]} />
      {glow(LAVENDER)}
    </mesh>
  )
  return (
    <group ref={g}>
      {/* lower jaw */}
      <mesh rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {obsidian({ side: THREE.DoubleSide })}
      </mesh>
      {teeth.map((a, i) => (
        <mesh key={`b${i}`} position={[Math.sin(a) * R * 0.94, 0.03, Math.cos(a) * R * 0.94]} rotation={[0, a, 0]}>
          <coneGeometry args={[0.035, 0.09, 4]} />
          {glow('#d4a8ff')}
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R * 0.96, 0.02, 6, 40]} />
        {glow()}
      </mesh>
      {/* upper half, hinged at the back so the mouth opens toward its target */}
      <group position={[0, 0, -R * 0.9]}>
        <group ref={top}>
          <group position={[0, 0, R * 0.9]}>
            <mesh ref={shell}>
              <sphereGeometry args={[R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              {obsidian({ side: THREE.DoubleSide })}
            </mesh>
            {teeth.map((a, i) => (
              <mesh key={`t${i}`} position={[Math.sin(a + 0.2) * R * 0.94, -0.03, Math.cos(a + 0.2) * R * 0.94]} rotation={[Math.PI, a, 0]}>
                <coneGeometry args={[0.035, 0.09, 4]} />
                {glow('#d4a8ff')}
              </mesh>
            ))}
            {eye(-0.09, 0.2, R * 0.82, 0.35)}
            {eye(0.09, 0.2, R * 0.82, -0.35)}
            {eye(-0.06, 0.28, R * 0.66, 0.5)}
            {eye(0.06, 0.28, R * 0.66, -0.5)}
            <mesh scale={1.05}>
              <sphereGeometry args={[R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshBasicMaterial color={VIOLET} side={THREE.BackSide} transparent opacity={0.55} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh rotation={[Math.PI, 0, 0]} scale={1.05}>
        <sphereGeometry args={[R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={VIOLET} side={THREE.BackSide} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.014, 6, 40]} />
        {glow()}
      </mesh>
      <group ref={shards}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.48, -0.05 + i * 0.06, Math.sin((i * Math.PI * 2) / 3) * 0.48]} scale={[0.04, 0.07, 0.04]}>
            <octahedronGeometry args={[1, 0]} />
            {glow('#c58bff')}
          </mesh>
        ))}
      </group>
      {smoke.map((s, i) => (
        <mesh key={i} ref={s}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#8a3cff" transparent opacity={0.5} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- torus spawn

export function TorusSpawn({ e, maxHp = 2 }) {
  const g = useRef()
  const wheel = useRef()
  const eye = useRef()
  const meridian = useRef()
  const longitude = useRef()
  const RR = 0.44
  const r = 0.17
  const spikes = useMemo(() => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2), [])
  const joints = useMemo(() => Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.8 + Math.sin(t * 2.2) * 0.06, 0.6, t)
    wheel.current.rotation.z += dt * (e.stun > 0 ? 7 : 1.4) // spins on its axle
    eye.current.scale.y = 1 - 0.85 * Math.max(0, Math.sin(t * 0.7) - 0.96) / 0.04 // the odd slow blink
    const caught = maxHp - e.hp
    meridian.current.material.color.set(caught >= 1 || e.dying > 0 ? '#ffd27a' : VIOLET)
    longitude.current.material.color.set(caught >= 2 || e.dying > 0 ? '#ffd27a' : VIOLET)
    meridian.current.material.opacity = caught >= 1 ? 1 : 0.55
    longitude.current.material.opacity = caught >= 2 ? 1 : 0.55
  })
  return (
    <group ref={g}>
      <group rotation={[-0.6, 0, 0]}>
      <group ref={wheel}>
        <mesh>
          <torusGeometry args={[RR, r, 10, 20]} />
          {obsidian({ flatShading: true })}
        </mesh>
        {/* violet joints between the armor plates */}
        {joints.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * RR, Math.sin(a) * RR, 0]} rotation={[0, 0, a]}>
            <torusGeometry args={[r * 1.02, 0.012, 6, 20]} />
            {glow()}
          </mesh>
        ))}
        {spikes.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * (RR + r + 0.05), Math.sin(a) * (RR + r + 0.05), 0]} rotation={[0, 0, a - Math.PI / 2]}>
            <coneGeometry args={[0.04, 0.16, 5]} />
            {obsidian()}
          </mesh>
        ))}
        {/* the two loops a lash can catch: around the tube, and through the hole */}
        <mesh ref={meridian} position={[RR, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r + 0.06, 0.016, 6, 28]} />
          <meshBasicMaterial color={VIOLET} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={longitude} rotation={[0.35, 0.25, 0]}>
        <torusGeometry args={[RR + r + 0.12, 0.016, 6, 60]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {/* the slit eye in the hole, glaring at its target (it doesn't spin) */}
      <group ref={eye}>
        <mesh scale={[0.13, 0.24, 0.06]}>
          <sphereGeometry args={[1, 18, 12]} />
          {glow('#d9c2ff')}
        </mesh>
        <mesh position={[0, 0, 0.055]} scale={[0.025, 0.2, 0.02]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#1a0730" />
        </mesh>
      </group>
      <mesh scale={1.06}>
        <torusGeometry args={[RR, r, 10, 20]} />
        <meshBasicMaterial color={VIOLET} side={THREE.BackSide} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- snapper

function Leg({ side, i, phase }) {
  const hip = useRef()
  const knee = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 11 + phase + i * 2.1 + (side > 0 ? Math.PI : 0)
    hip.current.rotation.y = side * (0.25 + Math.sin(t) * 0.35)
    knee.current.rotation.z = side * (0.9 + Math.max(0, Math.cos(t)) * 0.4)
  })
  return (
    <group position={[side * 0.2, 0.02, 0.08 - i * 0.11]}>
      <group ref={hip}>
        <mesh position={[side * 0.12, 0.04, 0]} rotation={[0, 0, side * -0.5]}>
          <cylinderGeometry args={[0.022, 0.018, 0.26, 6]} />
          {obsidian()}
        </mesh>
        <group position={[side * 0.23, 0.1, 0]}>
          <group ref={knee}>
            <mesh position={[side * 0.1, -0.06, 0]} rotation={[0, 0, side * 0.6]}>
              <coneGeometry args={[0.02, 0.26, 5]} />
              {obsidian()}
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

function Claw({ side, e }) {
  const upper = useRef()
  const lower = useRef()
  const arm = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    const snip = e.snipping > 0 ? Math.abs(Math.sin(t * 30)) : 0.3 + 0.3 * Math.max(0, Math.sin(t * 3 + side))
    upper.current.rotation.x = -snip * 0.7
    lower.current.rotation.x = snip * 0.5
    arm.current.rotation.y = side * (0.35 + Math.sin(t * 2.2) * 0.12)
  })
  return (
    <group position={[side * 0.24, 0.06, 0.18]}>
      <group ref={arm}>
        <mesh position={[side * 0.08, 0.02, 0.1]} rotation={[Math.PI / 2.4, 0, side * -0.4]}>
          <cylinderGeometry args={[0.035, 0.03, 0.22, 7]} />
          {obsidian()}
        </mesh>
        <group position={[side * 0.13, 0.05, 0.24]}>
          {/* the pincer: a fat palm and two curved blades edged in violet */}
          <mesh scale={[0.09, 0.075, 0.11]}>
            <sphereGeometry args={[1, 14, 10]} />
            {obsidian()}
          </mesh>
          <group ref={upper} position={[0, 0.03, 0.08]}>
            <mesh position={[0, 0.015, 0.1]} rotation={[Math.PI / 2 + 0.25, 0, 0]} scale={[0.6, 1, 0.45]}>
              <coneGeometry args={[0.06, 0.24, 6]} />
              {obsidian()}
            </mesh>
            <mesh position={[0, -0.005, 0.1]} rotation={[Math.PI / 2 + 0.25, 0, 0]} scale={[0.25, 1.02, 0.12]}>
              <coneGeometry args={[0.06, 0.24, 6]} />
              {glow()}
            </mesh>
          </group>
          <group ref={lower} position={[0, -0.03, 0.08]}>
            <mesh position={[0, -0.01, 0.08]} rotation={[Math.PI / 2 - 0.2, 0, 0]} scale={[0.55, 0.85, 0.4]}>
              <coneGeometry args={[0.055, 0.2, 6]} />
              {obsidian()}
            </mesh>
          </group>
          {/* a few strands of cut gold thread caught in it */}
          <mesh position={[side * 0.03, -0.07, 0.06]} rotation={[0.2, 0, side * 0.3]}>
            <cylinderGeometry args={[0.004, 0.004, 0.14, 4]} />
            {glow('#ffd27a')}
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function SnapperSpawn({ e }) {
  const g = useRef()
  const shell = useRef()
  const stalks = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.16 + Math.abs(Math.sin(t * 11)) * 0.03, 0.5, t, 1.5)
    shell.current.material.emissiveIntensity = e.flash > 0 ? 2.5 : 0.35
    stalks.current.children.forEach((c, i) => {
      c.rotation.z = Math.sin(t * 3 + i * 1.3) * 0.25
      c.rotation.x = Math.cos(t * 2.4 + i) * 0.15
    })
  })
  const cracks = useMemo(() => [[0, 0.3, 0.5], [0.6, -0.4, 0.35], [-0.7, 0.2, 0.4], [2.4, 0.1, 0.45]], [])
  return (
    <group ref={g}>
      {/* carapace */}
      <mesh ref={shell} scale={[0.36, 0.14, 0.28]} position={[0, 0.1, 0]}>
        <sphereGeometry args={[1, 22, 12]} />
        {obsidian()}
      </mesh>
      <mesh scale={[0.38, 0.15, 0.3]} position={[0, 0.1, 0]}>
        <sphereGeometry args={[1, 22, 12]} />
        <meshBasicMaterial color={VIOLET} side={THREE.BackSide} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {/* glowing cracks across the shell */}
      {cracks.map(([a, x, len], i) => (
        <mesh key={i} position={[x * 0.25, 0.235, Math.sin(a) * 0.08]} rotation={[0, a, 0]}>
          <boxGeometry args={[len * 0.4, 0.006, 0.012]} />
          {glow()}
        </mesh>
      ))}
      {/* the mouth plate and two low eyes */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.08, 0.13, 0.26]} scale={0.03}>
          <sphereGeometry args={[1, 10, 8]} />
          {glow(LAVENDER)}
        </mesh>
      ))}
      {/* eye stalks */}
      <group ref={stalks} position={[0, 0.2, 0.06]}>
        {[-0.12, -0.06, 0, 0.06, 0.12].map((x, i) => (
          <group key={i} position={[x, 0, (i % 2) * 0.05]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.006, 0.008, 0.16, 5]} />
              <meshStandardMaterial color="#6d4a9c" />
            </mesh>
            <mesh position={[0, 0.17, 0]} scale={0.026}>
              <sphereGeometry args={[1, 10, 8]} />
              {glow(LAVENDER)}
            </mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((sd) => [0, 1, 2].map((i) => <Leg key={`${sd}${i}`} side={sd} i={i} phase={e.seed} />))}
      <Claw side={-1} e={e} />
      <Claw side={1} e={e} />
    </group>
  )
}

// ---------------------------------------------------------------- mirror spawn (0-3)

function MirrorBody({ e, ghost, axis }) {
  const g = useRef()
  const core = useRef()
  const eye = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    const x = ghost ? 2 * axis - e.x : e.x
    g.current.visible = ghost ? e.alive : e.alive || e.dying > 0
    g.current.position.set(x, 0.62 + Math.sin(t * 2.6) * 0.07, e.z)
    g.current.rotation.y = ghost ? -e.face : e.face
    const s = e.dying > 0 && !ghost ? Math.max(0.001, e.dying / 0.5) : 1 + (e.flash > 0 && !ghost ? 0.12 : 0)
    g.current.scale.setScalar(1.15 * s)
    core.current.rotation.y = t * 0.9 * (ghost ? -1 : 1)
    core.current.rotation.x = Math.sin(t * 0.7) * 0.3
    eye.current.scale.y = 1 - 0.85 * Math.max(0, Math.sin(t * 0.9) - 0.95) / 0.05
    if (ghost) core.current.material.opacity = 0.32 + Math.sin(t * 7) * 0.08 // the reflection flickers
  })
  return (
    <group ref={g}>
      {/* a faceted mirror-crystal body */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial
          color={ghost ? '#6c4aa8' : '#2a1e3d'}
          metalness={1}
          roughness={0.08}
          emissive="#5a1ea8"
          emissiveIntensity={ghost ? 0.9 : 0.5}
          flatShading
          transparent={ghost}
          opacity={ghost ? 0.35 : 1}
          depthWrite={!ghost}
        />
      </mesh>
      <mesh scale={1.1}>
        <icosahedronGeometry args={[0.32, 0]} />
        <meshBasicMaterial color={VIOLET} wireframe transparent opacity={ghost ? 0.35 : 0.85} toneMapped={false} />
      </mesh>
      {/* one wide eye — lavender on the real one, hollow on its reflection */}
      <group ref={eye} position={[0, 0.04, 0.27]}>
        <mesh scale={[0.12, 0.07, 0.04]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshBasicMaterial color={ghost ? '#3a2266' : LAVENDER} transparent opacity={ghost ? 0.6 : 1} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.03]} scale={[0.02, 0.06, 0.02]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color={ghost ? '#c58bff' : '#1a0730'} toneMapped={false} />
        </mesh>
      </group>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 0.46, 0, Math.sin((i * Math.PI) / 2) * 0.46]} rotation={[0, 0, Math.PI / 4]} scale={0.05}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={VIOLET} transparent opacity={ghost ? 0.35 : 0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Mirror spawn: a faceted mirror-crystal creature with one wide eye, always shadowed by
 * its reflection across its reef's mirror line (`e.axis`). Only the real one can be
 * lashed — the reflection flickers, its eye is hollow, and a lash passes through it.
 */
export function MirrorSpawn({ e }) {
  const axis = e.axis ?? e.hx
  return (
    <>
      <MirrorBody e={e} axis={axis} ghost={false} />
      <MirrorBody e={e} axis={axis} ghost />
    </>
  )
}

// ---------------------------------------------------------------- unglue (0-4)

/**
 * Unglue: a violet seam-ripper sprite from the Skeleton Foundry — a hooked needle head
 * with one glaring eye and a whipping tail of torn thread. It goes for forged edges and
 * pulls them loose (a torn edge must be re-forged). One lash.
 */
export function UnglueSpawn({ e }) {
  const g = useRef()
  const hook = useRef()
  const tail = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.7 + Math.sin(t * 4) * 0.08, 0.5, t, 1.25)
    hook.current.rotation.x = e.snipping > 0 ? -0.9 + Math.sin(t * 30) * 0.4 : -0.3 + Math.sin(t * 2.5) * 0.15
    tail.current.children.forEach((c, i) => {
      c.position.set(Math.sin(t * 6 + i * 0.8) * 0.05 * i, -0.1 - i * 0.07, -0.06 - i * 0.05)
    })
  })
  return (
    <group ref={g}>
      {/* the body: a long needle */}
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        {obsidian()}
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]} scale={1.12}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshBasicMaterial color={VIOLET} side={THREE.BackSide} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {/* the ripper hook */}
      <group ref={hook} position={[0, 0.05, 0.2]}>
        <mesh position={[0, 0.06, 0.06]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.07, 0.016, 6, 16, Math.PI * 1.3]} />
          {glow()}
        </mesh>
      </group>
      {/* one eye */}
      <mesh position={[0, 0.06, 0.12]} scale={[0.05, 0.035, 0.03]}>
        <sphereGeometry args={[1, 12, 8]} />
        {glow(LAVENDER)}
      </mesh>
      {/* torn thread trailing behind */}
      <group ref={tail}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} scale={0.035 - i * 0.004}>
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial color={i % 2 ? '#ffd27a' : VIOLET} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- coner (0-5)

/**
 * Coner: a violet engineer drone — a faceted body under a spinning rotor ring, with a
 * projector that throws a cone of violet light down onto a space to plug its hole.
 * While it beams (e.beam > 0) the cone of light grows; lash it before the beam finishes.
 * Two lashes.
 */
export function ConerSpawn({ e }) {
  const g = useRef()
  const rotor = useRef()
  const beam = useRef()
  const eye = useRef()
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 1.25 + Math.sin(t * 2.4) * 0.08, 0.5, t, 1.2)
    rotor.current.rotation.y += dt * 14
    const b = e.beam > 0 ? 1 - e.beam / 2.6 : 0
    beam.current.visible = e.beam > 0
    beam.current.scale.set(0.3 + b * 0.9, 1, 0.3 + b * 0.9)
    beam.current.material.opacity = 0.18 + b * 0.35
    eye.current.material.color.set(e.beam > 0 ? '#ff6ad5' : LAVENDER)
  })
  return (
    <group ref={g}>
      <mesh scale={[1, 0.7, 1]}>
        <octahedronGeometry args={[0.28, 0]} />
        {obsidian({ flatShading: true })}
      </mesh>
      <mesh scale={[1.08, 0.76, 1.08]}>
        <octahedronGeometry args={[0.28, 0]} />
        <meshBasicMaterial color={VIOLET} wireframe transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <group ref={rotor} position={[0, 0.28, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.02, 6, 32]} />
          {glow()}
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.6, 0.015, 0.06]} />
            {obsidian()}
          </mesh>
        ))}
      </group>
      <mesh ref={eye} position={[0, -0.08, 0.2]} scale={[0.07, 0.045, 0.04]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={LAVENDER} toneMapped={false} />
      </mesh>
      {/* the coning beam: a cone of light down onto its target */}
      <mesh ref={beam} position={[0, -0.75, 0]}>
        <coneGeometry args={[0.55, 1.3, 32, 1, true]} />
        <meshBasicMaterial color="#c58bff" transparent opacity={0.3} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- loop-biter (0-6)

/**
 * Loop-biter: a violet beetle — an obsidian shell split down the middle, six legs that
 * scuttle, and big crystal mandibles. It perches on a petal loop and chews it (e.beam > 0:
 * the mandibles work and gold splinters fly); lash it before it finishes. Two lashes.
 */
export function LoopBiterSpawn({ e }) {
  const g = useRef()
  const jaws = useRef()
  const legs = useRef()
  const chips = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    const chewing = e.beam > 0
    place(g.current, e, 0.18 + (chewing ? Math.abs(Math.sin(t * 14)) * 0.04 : 0), 0.5, t, 1.25)
    const open = chewing ? 0.25 + Math.abs(Math.sin(t * 16)) * 0.5 : 0.25 + Math.sin(t * 2) * 0.08
    jaws.current.children.forEach((c, i) => (c.rotation.y = (i ? -1 : 1) * open))
    legs.current.children.forEach((c, i) => (c.rotation.x = Math.sin(t * 14 + i * 1.7) * (chewing ? 0.1 : 0.45)))
    chips.current.visible = chewing
    chips.current.children.forEach((c, i) => {
      const u = (t * 2.2 + i * 0.27) % 1
      c.position.set(Math.sin(i * 2.3) * 0.25 * u, 0.1 + u * 0.35 - u * u * 0.3, 0.32 + u * 0.15)
    })
  })
  return (
    <group ref={g}>
      {/* the shell, split down the back */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.085, 0.12, -0.02]} rotation={[0, 0, sd * -0.25]} scale={[0.16, 0.12, 0.3]}>
          <sphereGeometry args={[1, 14, 10, 0, Math.PI]} />
          {obsidian({ side: THREE.DoubleSide })}
        </mesh>
      ))}
      <mesh position={[0, 0.13, -0.02]} scale={[0.02, 0.13, 0.3]}>
        <sphereGeometry args={[1, 8, 6]} />
        {glow()}
      </mesh>
      {/* head and eyes */}
      <mesh position={[0, 0.1, 0.28]} scale={[0.11, 0.08, 0.09]}>
        <sphereGeometry args={[1, 12, 8]} />
        {obsidian()}
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.06, 0.15, 0.34]} scale={0.025}>
          <sphereGeometry args={[1, 8, 6]} />
          {glow(LAVENDER)}
        </mesh>
      ))}
      {/* mandibles */}
      <group ref={jaws} position={[0, 0.08, 0.34]}>
        {[-1, 1].map((sd) => (
          <group key={sd} position={[sd * 0.05, 0, 0]}>
            <mesh position={[sd * 0.04, 0, 0.09]} rotation={[Math.PI / 2, 0, sd * 0.5]}>
              <coneGeometry args={[0.03, 0.2, 5]} />
              {glow()}
            </mesh>
          </group>
        ))}
      </group>
      {/* six legs */}
      <group ref={legs}>
        {[-1, 1].flatMap((sd) =>
          [-0.14, 0, 0.14].map((z) => (
            <mesh key={`${sd}${z}`} position={[sd * 0.2, 0.05, z]} rotation={[0, 0, sd * 0.9]}>
              <cylinderGeometry args={[0.012, 0.008, 0.2, 5]} />
              {obsidian()}
            </mesh>
          )),
        )}
      </group>
      {/* gold splinters from the chewed loop */}
      <group ref={chips}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} scale={0.022}>
            <boxGeometry args={[1, 1, 2.5]} />
            <meshBasicMaterial color="#ffd27a" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- castle (castle-0)

/**
 * A judgment beacon: a tall violet crystal on a black-glass stand above one of Null's
 * demonstrations. Lash it to call that demonstration a forgery. It flares gold when hit.
 * (Level code reads e.label for nothing — the beacon is the same everywhere.)
 */
export function BeaconSpawn({ e }) {
  const g = useRef()
  const gem = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0, 0.5, t, 1)
    g.current.rotation.y = 0
    gem.current.rotation.y = t * 0.8
    gem.current.position.y = 1.25 + Math.sin(t * 2) * 0.06
    gem.current.material.emissiveIntensity = e.flash > 0 ? 3 : 0.9 + Math.sin(t * 3) * 0.3
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.12, 0.26, 0.7, 6]} />
        {obsidian({ flatShading: true })}
      </mesh>
      <mesh ref={gem} position={[0, 1.25, 0]} scale={[0.32, 0.55, 0.32]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#c58bff" emissive="#8a3aff" emissiveIntensity={1} roughness={0.15} metalness={0.3} flatShading toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A crown shard: a spinning violet splinter of the Null Crown that dives at Gyroid. One lash. */
export function ShardSpawn({ e }) {
  const g = useRef()
  const m = useRef()
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.9 + Math.sin(t * 5) * 0.15, 0.4, t, 1.2)
    m.current.rotation.x += dt * 6
    m.current.rotation.z += dt * 4
  })
  return (
    <group ref={g}>
      <mesh ref={m} scale={[0.14, 0.38, 0.14]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#d8b8ff" emissive="#a259ff" emissiveIntensity={1.4} flatShading toneMapped={false} />
      </mesh>
      <mesh scale={0.35}>
        <sphereGeometry args={[1, 10, 8]} />
        {glow(VIOLET, { transparent: true, opacity: 0.18 })}
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- World 1 · Bouquet Bastion

/**
 * Hedge-sprout (1-1): a thorny violet seed that roots into a patch of ground. It swells as
 * `e.rooting` (0 → 1) climbs; lash it before it takes root. One lash.
 */
export function HedgeSpawn({ e }) {
  const g = useRef()
  const bud = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.3, 0.4, t, 0.8 + (e.rooting || 0) * 0.7)
    bud.current.rotation.y = t * 2
    bud.current.material.emissiveIntensity = 0.8 + (e.rooting || 0) * 1.6
  })
  return (
    <group ref={g}>
      <mesh ref={bud}>
        <icosahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial color="#17101f" emissive="#8060d0" emissiveIntensity={1} flatShading toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.5, 12]} />
        {glow(VIOLET, { transparent: true, opacity: 0.35 })}
      </mesh>
    </group>
  )
}

/** Retractor drone (1-4): a chained violet drone that tugs toward the rim. Two lashes. */
export function RetractorSpawn({ e }) {
  const g = useRef()
  const ring = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.7 + Math.sin(t * 3) * 0.06, 0.5, t, 1.1)
    ring.current.rotation.z = t * 2.4
  })
  return (
    <group ref={g}>
      <mesh>
        <octahedronGeometry args={[0.3, 0]} />
        {obsidian({ flatShading: true })}
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.46, 0.04, 6, 20]} />
        {glow(VIOLET)}
      </mesh>
      <mesh position={[0, -0.34, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 5]} />
        {glow('#ffb347')}
      </mesh>
    </group>
  )
}

/** Whirl (1-4): a spinning top that scrambles arrow fields. One lash. */
export function WhirlSpawn({ e }) {
  const g = useRef()
  const top = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.55, 0.4, t, 1)
    top.current.rotation.y = t * 9
  })
  return (
    <group ref={g}>
      <mesh ref={top} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.3, 0.6, 6]} />
        {obsidian({ flatShading: true })}
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.34, 16]} />
        {glow(LAVENDER, { transparent: true, opacity: 0.6 })}
      </mesh>
    </group>
  )
}

/** Projector imp (1-5): hijacks a map projector until lashed. One lash. */
export function ProjectorImpSpawn({ e }) {
  const g = useRef()
  const cone = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.75 + Math.sin(t * 4) * 0.08, 0.4, t, 1)
    cone.current.rotation.y = t * 1.2
  })
  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[0.26, 10, 8]} />
        {obsidian()}
      </mesh>
      <mesh ref={cone} position={[0, 0.26, 0]}>
        <coneGeometry args={[0.12, 0.28, 6]} />
        <meshStandardMaterial color="#6040a0" emissive="#b090ff" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Ribbon patrol (1-6, 1-7, 1-8): a capsule guard with a torn word-ribbon hung from one
 * shoulder. It shrinks as it takes hits (`e.hp` / `e.maxHp`: one per letter of its word).
 */
export function PatrolSpawn({ e }) {
  const g = useRef()
  const knot = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    const frac = e.maxHp ? Math.max(0.4, e.hp / e.maxHp) : 1
    place(g.current, e, 0.55 + Math.sin(t * 2) * 0.04, 0.5, t, 0.8 + frac * 0.35)
    knot.current.rotation.x = t * 2
  })
  return (
    <group ref={g}>
      <mesh>
        <capsuleGeometry args={[0.28, 0.6, 6, 12]} />
        {obsidian()}
      </mesh>
      <mesh ref={knot} position={[0.38, 0.3, 0]} rotation={[0, 0, 0.4]}>
        <torusGeometry args={[0.22, 0.05, 8, 20]} />
        {glow('#ffb347')}
      </mesh>
      <mesh position={[0, 0.12, 0.27]} scale={[1, 0.18, 0.4]}>
        <sphereGeometry args={[0.3, 8, 6]} />
        {glow(VIOLET)}
      </mesh>
    </group>
  )
}

/** Liftling (1-8, 1-9): a violet octahedron bound to one sheet of a cover. Two lashes. */
export function LiftlingSpawn({ e }) {
  const g = useRef()
  const gem = useRef()
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.55 + Math.sin(t * 4) * 0.08, 0.4, t, 1)
    gem.current.rotation.y += dt * 2.2
    gem.current.material.emissiveIntensity = e.refused > 0 ? 0.2 : 1.2
  })
  return (
    <group ref={g}>
      <mesh ref={gem}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#17101f" emissive="#8a5aff" emissiveIntensity={1.2} flatShading toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <ringGeometry args={[0.3, 0.42, 4]} />
        {glow('#a8e0ff', { transparent: true, opacity: 0.5 })}
      </mesh>
    </group>
  )
}

/** Stack sentinel (1-9): a tall obsidian post with a gold cap that guards the start vertex. Two lashes. */
export function StackSentinelSpawn({ e }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0, 0.5, t, 1)
    g.current.rotation.y = t * 0.5
  })
  return (
    <group ref={g}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.32, 0.42, 1.5, 8]} />
        {obsidian({ flatShading: true })}
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <coneGeometry args={[0.25, 0.5, 8]} />
        <meshStandardMaterial color="#ffb347" emissive="#ffb347" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Deck guard (1-10): one copy of a guard per sheet; every copy dies when one is lashed (only once they stack). */
export function DeckGuardSpawn({ e }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + e.seed
    place(g.current, e, 0.5, 0.5, t, 1)
    g.current.rotation.y = t * 0.4
  })
  return (
    <group ref={g}>
      <mesh>
        <capsuleGeometry args={[0.22, 0.5, 4, 8]} />
        {obsidian()}
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <octahedronGeometry args={[0.12, 0]} />
        {glow('#ffb347')}
      </mesh>
    </group>
  )
}
