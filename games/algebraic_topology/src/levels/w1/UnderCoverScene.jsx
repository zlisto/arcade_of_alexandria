import { Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Seascape from '../../world/Seascape'
import { CausewaySlab } from '../../world/ReefScenery'
import { EmmyBubble } from '../w0/FoundryScene'
import { makeTrack } from '../w0/cells'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'

const S = 0.7
const GLASS = '#88ccff'
const AMBER = '#ffb347'

function ViaductSky() {
  return (
    <>
      <color attach="background" args={['#0a1424']} />
      <fog attach="fog" args={['#0a1424', 28, 72]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#a8d8ff', '#0c0a18', 0.55]} />
      <directionalLight position={[10, 14, -18]} intensity={0.95} color="#c8e8ff" />
      <Stars radius={90} depth={40} count={800} factor={2} fade speed={0.15} />
      <Sparkles count={90} scale={[50, 6, 50]} position={[0, 3, -4]} size={2.2} speed={0.25} color="#a8e0ff" />
      <Seascape y={-2.4} depth={2.4} area={[0, -2, 70, 64]} seed={88} palette={{ water: '#1a3a58', sand: '#3a4a58', weed: '#2a4a48' }} lanterns={10} />
    </>
  )
}

function GlassSheets({ site, sheets, liftSheet, current }) {
  if (!sheets || sheets < 2) return null
  const y0 = 3.2
  const step = 1.35
  const sh = site.def.add[0]
  const r = sh.r || 5
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      {Array.from({ length: sheets }, (_, i) => (
        <mesh key={i} position={[0, y0 + i * step, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * 0.55, r * 0.92, 48]} />
          <meshStandardMaterial color={GLASS} transparent opacity={0.22 + i * 0.04} emissive="#66aaff" emissiveIntensity={current ? 0.35 : 0.15} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, y0 + (liftSheet - 1) * step + 0.08, 0]}>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Deck({ site, current }) {
  const rim = useRef()
  useFrame(({ clock }) => {
    rim.current.material.opacity = current ? 0.65 + Math.sin(clock.elapsedTime * 2.2) * 0.22 : 0.38
  })
  const r = site.def.add[0].r
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[r, r * 1.02, 0.35, 40]} />
        <meshStandardMaterial color="#3a4558" roughness={0.85} />
      </mesh>
      <mesh ref={rim} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.92, r * 0.98, 48]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1.2} transparent opacity={0.45} toneMapped={false} />
      </mesh>
    </group>
  )
}

function TrackLoop({ track, origin, label, current }) {
  const pts = track.pts.map(([x, z]) => [origin[0] + x, 0.18, origin[1] + z])
  const col = label === 'a' ? '#e04040' : '#8060d0'
  return (
    <>
      <Line points={pts} color={col} lineWidth={current ? 4 : 2.5} toneMapped={false} />
      <mesh position={[origin[0], 0.25, origin[1]]}>
        <cylinderGeometry args={[0.35, 0.45, 0.5, 16]} />
        <meshStandardMaterial color="#2a3544" emissive={AMBER} emissiveIntensity={0.5} />
      </mesh>
    </>
  )
}

function PortMarkers({ site, onPortClick, show }) {
  if (!show || !site.ports) return null
  return site.ports.map(([x, z, label], i) => (
    <mesh
      key={i}
      position={[site.pos[0] + x, 0.55, site.pos[1] + z]}
      onClick={(e) => (e.stopPropagation(), onPortClick?.(label))}
    >
      <octahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color={label === 'a' ? '#e04040' : '#8060d0'} emissive="#fff2c4" emissiveIntensity={1.6} toneMapped={false} />
    </mesh>
  ))
}

export default function UnderCoverScene({
  layout,
  sites,
  current,
  liftSheet,
  cover,
  emmyAt,
  emmyTalking,
  emmyNear,
  emmyOnSheet,
  exitOpen,
  walkable,
  game,
  gameKey,
  stateRef,
  frameRef,
  spawnRef,
  playEnabled,
  tool,
  tracksBySite,
  onAction,
  onTrackMove,
  onEnemies,
  onHearts,
  onPortClick,
  showPorts,
}) {
  const stations = sites.filter((s) => s.stage === 'station')
  const emmyScript = useMemo(
    () => () => {
      const at = emmyAt.current
      const y = emmyOnSheet ? 0.55 + (emmyOnSheet - 1) * 1.35 * S : 0
      return { pos: [at.x / S, y, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.7 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
    },
    [emmyAt, emmyTalking, emmyOnSheet],
  )
  return (
    <>
      <ViaductSky />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {stations.map((s) => (
        <group key={s.id}>
          <Deck site={s} current={s.id === current} />
          <GlassSheets site={s} sheets={s.sheets} liftSheet={s.id === current ? liftSheet + 1 : 1} current={s.id === current} />
          {(tracksBySite[s.id] || []).map((tr, i) => (
            <TrackLoop key={i} track={tr} origin={s.pos} label={s.tracks[i]?.label || (i ? 'b' : 'a')} current={s.id === current} />
          ))}
          <PortMarkers site={s} show={showPorts && s.id === current} onPortClick={onPortClick} />
        </group>
      ))}
      {exitOpen && (
        <mesh position={[layout.exit.gate[0], 1.2, layout.exit.gate[1]]}>
          <torusGeometry args={[1.4, 0.12, 8, 32]} />
          <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={1.8} toneMapped={false} />
        </mesh>
      )}
      <group scale={S}>
        <Emmy script={emmyScript} />
      </group>
      <EmmyBubble emmyAt={emmyAt} show={emmyNear} />
      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        tool={tool}
        sim={null}
        tRef={{ current: 0 }}
        stateRef={stateRef}
        spawnRef={spawnRef}
        onAction={onAction}
        onTrackMove={onTrackMove}
        onEnemies={onEnemies}
        onHearts={onHearts}
      />
      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.6} luminanceSmoothing={0.22} />
        <Vignette offset={0.3} darkness={0.62} />
      </EffectComposer>
    </>
  )
}

export function buildTracks(sites) {
  return Object.fromEntries(
    sites
      .filter((s) => s.tracks)
      .map((s) => [s.id, s.tracks.map((t) => makeTrack(t, s.pos))]),
  )
}
