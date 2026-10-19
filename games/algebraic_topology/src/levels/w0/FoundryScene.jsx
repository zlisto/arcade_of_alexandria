import { useFrame } from '@react-three/fiber'
import { Html, Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { LAND } from '../../theme/palette'
import { CausewaySlab } from '../../world/ReefScenery'
import { LETTERS } from './cells'
import Hologram, { LETTER_COLORS } from './Hologram'
import { LiveLine } from './FlatsScenery'
import { DevAdvance, FollowCamera } from './OverworldScene'
import { Clutter, Gear, LavaChannels, PlateFloor } from '../../world/Dressing'
import ReefGame from './ReefGame'

/**
 * Level 0-4's scene: the Skeleton Foundry's Assembly Hall. Forge stations (round basalt
 * platforms) each have a furnace hub — the one 0-cell — and petal tracks; walking a track
 * out and back forges it into a glowing edge (a 1-cell) with chevrons running the way it
 * was walked and its letter floating at the tip. A press gantry stamps disks (2-cells),
 * and the hologram above folds what was built into the space it makes.
 */

const S = 0.7 // character scale

// decorative lava channels and floor clutter (level-local units)
const wiggle = (pts, amp, k) => pts.map(([x, z], i) => [x + Math.sin(i * k) * amp, z])
const line = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n])
const PLATE_BOUNDS = { minX: -15, maxX: 15, minZ: -26, maxZ: 18 }
const LAVA = [
  wiggle(line([-15.6, 17], [-15.6, -25], 60), 0.5, 0.5),
  wiggle(line([15.6, 17], [15.6, -25], 60), 0.5, 0.45),
]
const CLUTTER = (() => {
  let s = 77
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const out = []
  for (let i = 0; i < 46; i++) {
    const side = i % 2 ? 1 : -1
    out.push([side * (17.6 + r() * 1.6), -24 + r() * 40, 0.4 + r() * 0.7, r() * 3, 0.5 + r() * 1.2])
  }
  return out
})()

// ---------------------------------------------------------------- hall

export function Hall({ layout }) {
  const cracks = useMemo(() => {
    let seed = 5
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 40 }, () => {
      const x = (rnd() * 2 - 1) * 22
      const z = layout.bounds.minZ + rnd() * (layout.bounds.maxZ - layout.bounds.minZ)
      const pts = [[x, -0.47, z]]
      for (let k = 0; k < 4; k++) pts.push([pts[k][0] + (rnd() - 0.5) * 2.4, -0.47, pts[k][2] + (rnd() - 0.5) * 2.4])
      return pts
    })
  }, [layout])
  return (
    <>
      <color attach="background" args={['#0a0708']} />
      <fog attach="fog" args={['#0a0708', 22, 60]} />
      <ambientLight intensity={0.32} />
      <hemisphereLight args={['#ffb27a', '#120808', 0.45]} />
      <directionalLight position={[-6, 18, 10]} intensity={0.9} color="#ffe2c4" />
      <pointLight position={[0, 6, 4]} intensity={18} distance={30} color="#ff8a3a" />
      <pointLight position={[0, 6, -14]} intensity={14} distance={26} color="#ff9a4a" />
      <Stars radius={90} depth={40} count={900} factor={2} fade speed={0.2} />
      <Sparkles count={240} scale={[40, 6, 40]} position={[0, 2, -4]} size={2.6} speed={0.5} color="#ffb070" />
      {/* the hall floor: dark basalt veined with forge-glow, below the platforms */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -4]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#120c0b" roughness={0.85} emissive="#2a0c04" emissiveIntensity={0.5} />
      </mesh>
      {cracks.map((pts, i) => (
        <Line key={i} points={pts} color="#ff6a1a" lineWidth={2} transparent opacity={0.55} toneMapped={false} />
      ))}
      {/* molten channels in the floor, between the platforms */}
      <LavaChannels paths={LAVA} width={0.3} color="#c8400e" />
      <PlateFloor bounds={PLATE_BOUNDS} color="#2a201c" />
      <Clutter spots={CLUTTER} y={-0.5} color="#2e2420" emissive="#3a1404" />
      {[[-19, 6, 2.6, 0.15], [19, -10, 3.2, -0.1], [-19.5, -18, 2.2, 0.22], [19.5, 12, 2, -0.18]].map(([x, z, r, sp], i) => (
        <Gear key={i} position={[x, -0.42, z]} rotation={[-Math.PI / 2, 0, 0]} r={r} speed={sp} color="#3a2c22" emissive="#ff6a1a" />
      ))}
      {/* pillars down both sides of the hall */}
      {[-17, 17].map((x) =>
        [10, 2, -6, -14, -22].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position={[0, 3, 0]}>
              <boxGeometry args={[1.2, 7, 1.2]} />
              <meshStandardMaterial color={LAND.stoneDark} roughness={0.7} flatShading />
            </mesh>
            <mesh position={[x < 0 ? 0.62 : -0.62, 2.2, 0]}>
              <boxGeometry args={[0.05, 0.9, 0.5]} />
              <meshBasicMaterial color="#ff8a3a" toneMapped={false} />
            </mesh>
          </group>
        )),
      )}
    </>
  )
}

/** A forge platform: basalt disk, gold rim, and the furnace hub. */
export function Platform({ site, lit, current }) {
  const hub = useRef()
  useFrame(({ clock }) => {
    hub.current.material.emissiveIntensity = lit ? 1.6 + Math.sin(clock.elapsedTime * 3) * 0.3 : current ? 0.5 + Math.sin(clock.elapsedTime * 2) * 0.25 : 0.25
  })
  const r = site.def.add[0].r
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[r, r * 0.92, 0.6, 48]} />
        <meshStandardMaterial color="#2a2c36" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <ringGeometry args={[r - 0.12, r, 64]} />
        <meshBasicMaterial color="#b88a3a" toneMapped={false} />
      </mesh>
      {/* the furnace hub: the station's one point */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.14, 32]} />
        <meshStandardMaterial color="#3a2a22" roughness={0.5} />
      </mesh>
      <mesh ref={hub} position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.04, 32]} />
        <meshStandardMaterial color={lit ? '#ffd27a' : '#5a3a28'} emissive="#ff8a2a" emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** The press: a gantry over the hub whose piston slams down when a disk is stamped. */
export function Press({ pos, slamRef }) {
  const piston = useRef()
  useFrame(() => {
    const k = slamRef.current // 1 = just slammed, decays to 0
    piston.current.position.y = 2.7 - Math.sin(Math.min(1, k) * Math.PI) * 2.2
  })
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 1.7, -0.9]}>
          <boxGeometry args={[0.22, 3.4, 0.22]} />
          <meshStandardMaterial color="#3a3030" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 3.45, -0.9]}>
        <boxGeometry args={[2.9, 0.26, 0.3]} />
        <meshStandardMaterial color="#3a3030" metalness={0.5} roughness={0.5} />
      </mesh>
      <group ref={piston} position={[0, 2.7, -0.9]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.9, 10]} />
          <meshStandardMaterial color="#8a7a60" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.45, 0.45, 0.16, 24]} />
          <meshStandardMaterial color="#b88a3a" metalness={0.85} roughness={0.3} emissive="#3a2408" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  )
}

/** One track: an unforged groove, or a forged edge (letter color, marching chevrons, tag); violet if torn. */
export function Track({ track, edge, progressRef, trackIdx, pos }) {
  const chev = useRef()
  const N_CHEV = 7
  const color = edge ? LETTER_COLORS[edge.letter] : '#4a4038'
  useFrame(({ clock }) => {
    if (!chev.current) return
    const t = clock.elapsedTime
    chev.current.children.forEach((c, i) => {
      let s = (t * 0.12 + i / N_CHEV) % 1
      if (edge.dir < 0) s = 1 - s
      const p = track.at(s)
      const q = track.at(Math.min(1, Math.max(0, s + 0.01 * edge.dir)))
      c.position.set(p[0] - pos[0], 0.16, p[1] - pos[1])
      c.rotation.set(0, Math.atan2(q[0] - p[0], q[1] - p[1]), 0)
      c.visible = !edge.torn
    })
  })
  const local = useMemo(() => track.pts.map(([x, z]) => [x - pos[0], 0.1, z - pos[1]]), [track, pos])
  const lit = () => {
    const pr = progressRef.current
    if (!pr || pr.track !== trackIdx || pr.best <= 0.02) return null
    const n = local.length - 1
    const k = Math.round(pr.best * n)
    const seg = pr.dir > 0 ? local.slice(0, k + 1) : local.slice(n - k)
    return seg.map(([x, , z]) => [x, z, 0.13])
  }
  const tip = track.at(0.5)
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <Line points={local} color={color} lineWidth={edge && !edge.torn ? 7 : 3} transparent opacity={edge ? (edge.torn ? 0.5 : 1) : 0.8} dashed={!!edge?.torn} dashSize={0.25} gapSize={0.2} toneMapped={false} />
      {edge && !edge.torn && <Line points={local} color={color} lineWidth={16} transparent opacity={0.18} toneMapped={false} />}
      <LiveLine getPts={lit} color="#fff2c4" width={6} />
      {edge && (
        <group ref={chev}>
          {Array.from({ length: N_CHEV }, (_, i) => (
            <mesh key={i} rotation={[0, 0, 0]}>
              <coneGeometry args={[0.12, 0.3, 3]} />
              <meshBasicMaterial color="#fff2c4" toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      {edge && (
        <Html position={[tip[0] - pos[0], 0.9, tip[1] - pos[1]]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`edge-tag${edge.torn ? ' torn' : ''}`} style={{ background: edge.torn ? '#6a3aa8' : LETTER_COLORS[edge.letter] }}>
            {LETTERS[edge.letter]}
          </div>
        </Html>
      )}
    </group>
  )
}

/** A speech bubble over Emmy when Gyroid is close enough to talk to her. */
export function EmmyBubble({ emmyAt, show }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const at = emmyAt.current
    g.current.position.set(at.x, 2.15 + Math.sin(clock.elapsedTime * 3) * 0.06, at.z)
  })
  return (
    <group ref={g}>
      {show && (
        <Html center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
          <div className="talk-bubble">💬 E</div>
        </Html>
      )}
    </group>
  )
}

/** The way out: a forge door that rolls open onto the causeway to the Cone Zone. */
export function ForgeDoor({ exit, open }) {
  const left = useRef()
  const right = useRef()
  const k = useRef(0)
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.lerp(k.current, open ? 1 : 0, Math.min(1, dt * 1.5))
    left.current.position.x = -0.8 - k.current * 1.4
    right.current.position.x = 0.8 + k.current * 1.4
  })
  return (
    <group position={[exit.gate[0], 0, exit.gate[1]]}>
      {[-2.4, 2.4].map((x) => (
        <mesh key={x} position={[x, 1.9, 0]}>
          <boxGeometry args={[0.7, 3.8, 0.8]} />
          <meshStandardMaterial color={LAND.stoneDark} roughness={0.6} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 3.95, 0]}>
        <boxGeometry args={[5.6, 0.5, 0.9]} />
        <meshStandardMaterial color={LAND.stoneDark} roughness={0.6} flatShading />
      </mesh>
      {[left, right].map((ref, i) => (
        <mesh key={i} ref={ref} position={[i ? 0.8 : -0.8, 1.7, 0]}>
          <boxGeometry args={[1.6, 3.4, 0.2]} />
          <meshStandardMaterial color="#4a3020" metalness={0.6} roughness={0.4} emissive="#3a1404" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <pointLight position={[0, 1.8, -2]} color="#ffb070" intensity={open ? 20 : 4} distance={12} />
    </group>
  )
}

export default function FoundryScene({
  layout,
  sites,
  complexes,
  holograms,
  holoKRef,
  slamRefs,
  progressRef,
  tracksBySite,
  current,
  emmyAt,
  emmyTalking,
  emmyNear,
  exitOpen,
  walkable,
  game,
  gameKey,
  stateRef,
  frameRef,
  spawnRef,
  ribbonApi,
  playEnabled,
  tool,
  onAction,
  onEnemies,
  onHearts,
}) {
  const stations = sites.filter((s) => s.stage === 'station')
  const emmyScript = useMemo(
    () => () => {
      const at = emmyAt.current
      return { pos: [at.x / S, 0, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.7 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
    },
    [emmyAt, emmyTalking],
  )
  return (
    <>
      <Hall layout={layout} />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {exitOpen && <CausewaySlab a={layout.exit.a} b={layout.exit.b} width={layout.causewayWidth} />}
      {sites
        .filter((s) => s.kind === 'start')
        .map((s) => (
          <mesh key={s.id} position={[s.pos[0], -0.32, s.pos[1]]}>
            <cylinderGeometry args={[s.def.add[0].r, s.def.add[0].r * 0.9, 0.6, 32]} />
            <meshStandardMaterial color="#2a2c36" roughness={0.6} />
          </mesh>
        ))}
      {stations.map((s) => {
        const cx = complexes[s.id]
        return (
          <group key={s.id}>
            <Platform site={s} lit={!!cx?.point} current={s.id === current} />
            {tracksBySite[s.id].map((tr, i) => (
              <Track key={i} track={tr} trackIdx={i} pos={s.pos} edge={cx?.edges.find((e) => e.track === i) || null} progressRef={s.id === current ? progressRef : { current: null }} />
            ))}
            <Press pos={s.pos} slamRef={slamRefs[s.id]} />
            {holograms[s.id] && (
              <group position={[s.pos[0], 4.3, s.pos[1] - 1.1]} scale={1.05}>
                <Hologram kind={holograms[s.id].kind} word={holograms[s.id].word} kRef={holoKRef[s.id]} />
              </group>
            )}
          </group>
        )
      })}
      <ForgeDoor exit={layout.exit} open={exitOpen} />
      <group scale={S}>
        <Emmy script={emmyScript} />
      </group>
      <EmmyBubble emmyAt={emmyAt} show={emmyNear} />

      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled={false}
        tool={tool}
        sim={null}
        tRef={{ current: 0 }}
        stateRef={stateRef}
        spawnRef={spawnRef}
        ribbonApi={ribbonApi}
        onAction={onAction}
        onStrokeStart={() => false}
        onStrokeMove={() => {}}
        onStrokeEnd={() => {}}
        onEnemies={onEnemies}
        onHearts={onHearts}
        onSpooling={() => {}}
      />
      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}
