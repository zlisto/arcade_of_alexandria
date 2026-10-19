import { useFrame } from '@react-three/fiber'
import { Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Seascape from '../../world/Seascape'
import { LAND } from '../../theme/palette'
import { CausewaySlab } from '../../world/ReefScenery'
import { LiveLine, Post } from './FlatsScenery'
import { DevAdvance, FollowCamera, SiteReef } from './OverworldScene'
import ReefGame from './ReefGame'
import { grabPin, ribbonLength, ribbonPieces, stepRibbon } from './ribbon'

/**
 * Level 0-3's scene: Mirror Shoals. A still, reflective sea split by a glassy channel;
 * reefs on plinths either side (the 0-1 tile reefs, so spines and slides work as
 * before); loop ribbons on Solid Shoal and Ring Reef; the Mirror Gate with its four
 * shape plaques and the Foundry's forge-light behind it.
 */

// ---------------------------------------------------------------- the sea and the channel

export function MirrorSea({ channel }) {
  return (
    <>
      <Seascape y={-0.5} area={[0, -8, 80, 76]} seed={31} calm palette={{ water: '#123a5a', sand: '#34505e', weed: '#24485a', coral: ['#9ad8ff', '#c58bff', '#e8eefc', '#7fe8dc'] }} lanterns={0} />
      {/* the channel: a band of still, starlit glass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(channel.x0 + channel.x1) / 2, -0.48, 0]}>
        <planeGeometry args={[channel.x1 - channel.x0, 60]} />
        <meshBasicMaterial color="#9fd8ff" transparent opacity={0.04} toneMapped={false} depthWrite={false} />
      </mesh>
      {[channel.x0, channel.x1].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.47, 0]}>
          <planeGeometry args={[0.05, 60]} />
          <meshBasicMaterial color="#cfe8ff" transparent opacity={0.35} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

/** Rock under a reef: a basalt plinth per part of its shape. */
export function Plinth({ site }) {
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      {site.def.add.map((p, i) =>
        p.type === 'circle' ? (
          <mesh key={i} position={[p.cx, -0.95, p.cz]}>
            <cylinderGeometry args={[p.r * 0.98, p.r * 0.8, 1.2, 28]} />
            <meshStandardMaterial color={LAND.rock} roughness={0.85} flatShading />
          </mesh>
        ) : (
          <mesh key={i} position={[(p.x0 + p.x1) / 2, -0.95, (p.z0 + p.z1) / 2]}>
            <boxGeometry args={[p.x1 - p.x0, 1.2, p.z1 - p.z0]} />
            <meshStandardMaterial color={LAND.rock} roughness={0.85} flatShading />
          </mesh>
        ),
      )}
      {(site.def.sub || []).map((p, i) => (
        <mesh key={`w${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[p.cx, -0.4, p.cz]}>
          <circleGeometry args={[p.r, 32]} />
          <meshStandardMaterial color="#03222a" emissive="#0a5a62" emissiveIntensity={0.6} roughness={0.1} metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------- loops

/** Steps the loop ribbons (site-local); the held point follows Gyroid. */
function LoopSystem({ loopsRef, stateRef }) {
  useFrame(() => {
    const L = loopsRef.current
    const s = stateRef.current
    for (const id of Object.keys(L.ribbons)) {
      const { r, env, site } = L.ribbons[id]
      const g = grabPin(r)
      if (g && s) {
        const [lx, lz] = site.toLocal(s.x, s.z)
        const prev = [...g.pos]
        g.pos = [lx, lz]
        stepRibbon(r, env)
        if (ribbonLength(r) > 16) {
          ;[s.x, s.z] = site.toWorld(...prev)
          g.pos = prev
          stepRibbon(r, env)
        }
      } else stepRibbon(r, env)
    }
  })
  return null
}

function LoopRibbon({ id, loopsRef, loop, hooked }) {
  const grabRing = useRef()
  const piece = (k) => () => {
    const e = loopsRef.current.ribbons[id]
    return e ? ribbonPieces(e.r)[k] : null
  }
  useFrame(({ clock }) => {
    const e = loopsRef.current.ribbons[id]
    const g = e && grabPin(e.r)
    grabRing.current.visible = !!g
    if (g) {
      grabRing.current.position.set(g.pos[0], 0.14, g.pos[1])
      grabRing.current.rotation.z = clock.elapsedTime * 3
    }
  })
  return (
    <>
      <Post pos={loop.post} />
      {loop.stakes.map((st) => (
        <Post key={st.id} pos={st.pos} kind="stake" lit={hooked.includes(st.id)} badge={hooked.includes(st.id) ? '×' : null} />
      ))}
      <LiveLine getPts={piece(0)} color="#ffb347" width={12} opacity={0.22} />
      <LiveLine getPts={piece(0)} color="#ffd27a" width={5} />
      <mesh ref={grabRing} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.24, 6]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
    </>
  )
}

// ---------------------------------------------------------------- the Mirror Gate

const PLAQUES = {
  'figure-eight': () => {
    const c = (cx) => Array.from({ length: 41 }, (_, i) => [cx + 0.17 * Math.cos((i / 40) * Math.PI * 2), 0.17 * Math.sin((i / 40) * Math.PI * 2), 0])
    return [c(-0.17), c(0.17)]
  },
  theta: () => [Array.from({ length: 41 }, (_, i) => [0.3 * Math.cos((i / 40) * Math.PI * 2), 0.24 * Math.sin((i / 40) * Math.PI * 2), 0]), [[-0.3, 0, 0], [0.3, 0, 0]]],
  barbell: () => {
    const c = (cx) => Array.from({ length: 41 }, (_, i) => [cx + 0.12 * Math.cos((i / 40) * Math.PI * 2), 0.12 * Math.sin((i / 40) * Math.PI * 2), 0])
    return [c(-0.22), c(0.22), [[-0.1, 0, 0], [0.1, 0, 0]]]
  },
  ring: () => [Array.from({ length: 41 }, (_, i) => [0.24 * Math.cos((i / 40) * Math.PI * 2), 0.24 * Math.sin((i / 40) * Math.PI * 2), 0])],
}

function Plaque({ kind, lit, x }) {
  const lines = useMemo(() => PLAQUES[kind](), [kind])
  return (
    <group position={[x, 2.1, 0.32]}>
      <mesh>
        <boxGeometry args={[0.85, 0.7, 0.06]} />
        <meshStandardMaterial color={lit ? '#3a2f1a' : '#1a1f2b'} emissive={lit ? '#ffb347' : '#000000'} emissiveIntensity={lit ? 0.25 : 0} roughness={0.5} />
      </mesh>
      {lines.map((pts, i) => (
        <Line key={i} points={pts.map(([px, py]) => [px, py, 0.04])} color={lit ? '#ffd27a' : '#4c5670'} lineWidth={3} toneMapped={false} />
      ))}
    </group>
  )
}

export function MirrorGate({ pos, lit, open }) {
  const mirror = useRef()
  const glow = useRef()
  const k = useRef(0)
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.lerp(k.current, open ? 1 : 0, Math.min(1, dt * 1.2))
    mirror.current.position.y = 1.5 + k.current * 2.6 // the mirror lifts away
    mirror.current.material.opacity = 0.92 * (1 - k.current * 0.85)
    glow.current.intensity = 6 + k.current * 30
  })
  return (
    <group position={[pos[0], 0, pos[1]]}>
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]}>
          <boxGeometry args={[0.5, 3.2, 0.6]} />
          <meshStandardMaterial color={LAND.stoneDark} roughness={0.55} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 3.35, 0]}>
        <boxGeometry args={[4.0, 0.45, 0.7]} />
        <meshStandardMaterial color={LAND.stoneDark} roughness={0.55} flatShading />
      </mesh>
      <mesh ref={mirror} position={[0, 1.5, 0]}>
        <planeGeometry args={[2.9, 2.9]} />
        <meshStandardMaterial color="#b9c7e6" metalness={1} roughness={0.06} emissive="#2a3352" emissiveIntensity={0.6} transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0, 1.3, 0]}>
        {['figure-eight', 'theta', 'barbell', 'ring'].map((kind, i) => (
          <Plaque key={kind} kind={kind} lit={lit && kind !== 'ring'} x={-1.35 + i * 0.9} />
        ))}
      </group>
      {/* the Skeleton Foundry's forge-light, behind the gate */}
      <pointLight ref={glow} position={[0, 1.6, -2.2]} color="#ff8a3a" distance={14} intensity={6} />
      <mesh position={[0, 1.4, -0.4]}>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial color="#ff8a3a" transparent opacity={0.25} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- scene

export default function MirrorScene({
  layout,
  sites,
  samplesBySite,
  strokesBySite,
  liveStroke,
  drawingSite,
  activeSite,
  sim,
  simWorld,
  tRef,
  saved,
  spineIdx = {},
  loopsRef,
  hooked,
  gateLit,
  gateOpen,
  walkable,
  game,
  gameKey,
  stateRef,
  frameRef,
  spawnRef,
  playEnabled,
  spoolEnabled,
  tool,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onEnemies,
  onHearts,
  onSpooling,
}) {
  const loopSites = sites.filter((s) => s.loop)
  return (
    <>
      <color attach="background" args={['#050913']} />
      <fog attach="fog" args={['#050913', 26, 64]} />
      <ambientLight intensity={0.36} />
      <hemisphereLight args={['#6d9cc4', '#0a0a14', 0.55]} />
      <directionalLight position={[-8, 16, 12]} intensity={1.2} color="#dcefff" />
      <Stars radius={90} depth={40} count={2600} factor={3} fade speed={0.2} />
      <Sparkles count={160} scale={[6, 2, 40]} position={[0, 0.2, 0]} size={2.5} speed={0.15} color="#cfe8ff" />
      <MirrorSea channel={layout.channel} />

      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} />
      ))}
      {gateOpen && <CausewaySlab a={layout.gate.exit.a} b={layout.gate.exit.b} />}
      {sites.map((s) => (
        <Plinth key={`p${s.id}`} site={s} />
      ))}
      {sites.map((site) => (
        <SiteReef
          key={site.id}
          // the beacons of the spine this reef is asking for right now (none once proven)
          site={{ ...site, beacons: saved[site.id] ? [] : site.spines?.[spineIdx[site.id] || 0]?.beacons || [] }}
          samples={samplesBySite[site.id]}
          strokes={strokesBySite[site.id] || []}
          liveStroke={drawingSite === site.id ? liveStroke : null}
          sim={sim}
          tRef={tRef}
          active={activeSite === site.id}
          saved={!!saved[site.id]}
          forgery={null}
          showTrails={false}
        />
      ))}
      {loopSites.map((s) => (
        <group key={`l${s.id}`} position={[s.pos[0], 0, s.pos[1]]}>
          <LoopRibbon id={s.id} loopsRef={loopsRef} loop={s.loop} hooked={hooked[s.id] || []} />
        </group>
      ))}
      <LoopSystem loopsRef={loopsRef} stateRef={stateRef} />
      <MirrorGate pos={layout.gate.pos} lit={gateLit} open={gateOpen} />

      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled={spoolEnabled}
        tool={tool}
        sim={simWorld}
        tRef={tRef}
        stateRef={stateRef}
        spawnRef={spawnRef}
        onStrokeStart={onStrokeStart}
        onStrokeMove={onStrokeMove}
        onStrokeEnd={onStrokeEnd}
        onEnemies={onEnemies}
        onHearts={onHearts}
        onSpooling={onSpooling}
      />
      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.65} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}
