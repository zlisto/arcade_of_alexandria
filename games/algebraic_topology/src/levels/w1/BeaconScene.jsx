import { useFrame } from '@react-three/fiber'
import { Html, Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import { Clouds, FloatingRocks, PlateFloor } from '../../world/Dressing'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import { LiveLine } from '../w0/FlatsScenery'
import { Platform, EmmyBubble } from '../w0/FoundryScene'
import { LOOP_NAMES } from './loops'
import ReefGame from '../w0/ReefGame'

const S = 0.7
const BEACON_COL = '#ffb347'

function BeaconTower({ scale = 1, pulseRef }) {
  const glow = useRef()
  useFrame(({ clock }) => {
    const p = pulseRef?.current || 0
    glow.current.material.emissiveIntensity = 1.2 + p * 0.9 + Math.sin(clock.elapsedTime * 2.2) * 0.25
  })
  return (
    <group scale={scale}>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.35, 0.55, 4.4, 8]} />
        <meshStandardMaterial color="#3a2818" roughness={0.75} />
      </mesh>
      <mesh ref={glow} position={[0, 4.6, 0]}>
        <sphereGeometry args={[0.55, 12, 10]} />
        <meshStandardMaterial color={BEACON_COL} emissive={BEACON_COL} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 0.5, 16]} />
        <meshStandardMaterial color="#2a2420" roughness={0.8} />
      </mesh>
    </group>
  )
}

function LoopTrack({ track, edge, progressRef, trackIdx, sitePos }) {
  const color = edge ? ['#ffcf6a', '#88ccff', '#ff8ad8', '#b8ff9a'][edge.letter] || '#ffcf6a' : '#4a4038'
  const local = useMemo(() => track.pts.map(([x, z]) => [x - sitePos[0], 0.12, z - sitePos[1]]), [track, sitePos])
  const lit = () => {
    const pr = progressRef.current
    if (!pr || pr.track !== trackIdx || pr.best <= 0.02) return null
    const n = local.length - 1
    const k = Math.round(pr.best * n)
    const seg = pr.dir > 0 ? local.slice(0, k + 1) : local.slice(n - k)
    return seg.map(([x, , z]) => [x, z, 0.15])
  }
  const tip = track.at(0.5)
  return (
    <group>
      <Line points={local} color={color} lineWidth={edge ? 8 : 4} transparent opacity={edge ? 1 : 0.75} toneMapped={false} />
      <LiveLine getPts={lit} color="#fff2c4" width={7} />
      {edge && !edge.torn && (
        <Html position={[tip[0] - sitePos[0], 0.85, tip[1] - sitePos[1]]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="edge-tag loop-tag" style={{ background: color }}>
            {LOOP_NAMES[edge.letter]}
          </div>
        </Html>
      )}
    </group>
  )
}

function ExitGate({ exit, open }) {
  const left = useRef()
  const right = useRef()
  useFrame(() => {
    const k = open ? 1 : 0
    left.current.position.x = -0.8 - k * 1.2
    right.current.position.x = 0.8 + k * 1.2
  })
  return (
    <group position={[exit.gate[0], 0, exit.gate[1]]}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[3.2, 2.8, 0.35]} />
        <meshStandardMaterial color="#2a2428" emissive="#ffb347" emissiveIntensity={open ? 0.5 : 0.15} />
      </mesh>
      <mesh ref={left} position={[-0.8, 1.7, 0]}>
        <boxGeometry args={[1.6, 3.4, 0.2]} />
        <meshStandardMaterial color="#4a3020" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh ref={right} position={[0.8, 1.7, 0]}>
        <boxGeometry args={[1.6, 3.4, 0.2]} />
        <meshStandardMaterial color="#4a3020" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

function BastionSky() {
  return (
    <>
      <color attach="background" args={['#0a0c14']} />
      <fog attach="fog" args={['#0a0c14', 24, 58]} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#c8d8ff', '#1a1020', 0.42]} />
      <directionalLight position={[8, 20, 6]} intensity={0.85} color="#ffe8c8" />
      <Stars radius={80} depth={36} count={800} factor={2} fade speed={0.15} />
      <Sparkles count={180} scale={[36, 8, 36]} position={[0, 3, -4]} size={2.4} speed={0.35} color="#ffb070" />
      <Clouds area={[-20, -30, 20, 16]} count={12} y={14} />
      <FloatingRocks center={[0, 0, -4]} radius={[14, 22]} count={8} />
      <PlateFloor bounds={{ minX: -18, maxX: 18, minZ: -28, maxZ: 16 }} color="#252830" />
    </>
  )
}

export default function BeaconScene({
  layout,
  sites,
  walkable,
  current,
  done,
  tracksBySite,
  forged,
  progressRef,
  beaconPulseRef,
  stateRef,
  frameRef,
  game,
  gameKey,
  spawnRef,
  emmyAt,
  emmyTalking,
  emmyNear,
  exitOpen,
  playEnabled,
  tool,
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
      <BastionSky />
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
        const edges = forged[s.id] || []
        return (
          <group key={s.id}>
            <Platform site={s} lit={s.id === current && !done[s.id]} current={s.id === current} />
            <group position={[s.pos[0], 0, s.pos[1]]}>
              <BeaconTower scale={s.beacon === 'south' ? 0.72 : s.id === 'home_base' ? 1.15 : 0.95} pulseRef={beaconPulseRef} />
            </group>
            {(tracksBySite[s.id] || []).map((tr, ti) => (
              <group key={ti} position={[s.pos[0], 0, s.pos[1]]}>
                <LoopTrack track={tr} trackIdx={ti} sitePos={s.pos} edge={edges.find((e) => e.track === ti) || null} progressRef={s.id === current ? progressRef : { current: null }} />
              </group>
            ))}
          </group>
        )
      })}
      <ExitGate exit={layout.exit} open={exitOpen} />
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
        ribbonApi={{ current: null }}
        onAction={() => {}}
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
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

export { S }
