import { useFrame } from '@react-three/fiber'
import { Html, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import { Clouds, FloatingRocks } from '../../world/Dressing'
import Seascape from '../../world/Seascape'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import { EmmyBubble } from '../w0/FoundryScene'
import { CordProp, SlingProp } from '../w0/worldTools'

const S = 0.7
const AMBER = '#ffb347'
const GOLD = '#ffd27a'
const VIOLET = '#b070ff'

function TerraceSky() {
  return (
    <>
      <color attach="background" args={['#120818']} />
      <fog attach="fog" args={['#120818', 28, 72]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#ffd0a0', '#0a0818', 0.55]} />
      <directionalLight position={[12, 14, -18]} intensity={1.05} color="#ffc49a" />
      <pointLight position={[0, 8, 4]} intensity={12} distance={36} color="#ffb070" />
      <Stars radius={90} depth={40} count={800} factor={2.1} fade speed={0.18} />
      <Sparkles count={90} scale={[50, 5, 50]} position={[0, 2, -4]} size={2} speed={0.25} color="#ffd2a0" />
      <Seascape y={-2.4} depth={2.4} area={[0, -4, 70, 64]} seed={15} palette={{ water: '#1a3050', sand: '#4a5058', weed: '#2a3848' }} lanterns={10} />
      <Clouds seed={5} area={[-20, -24, 40, 40]} y={14} />
      <FloatingRocks seed={8} count={12} center={[0, 6, -4]} radius={[14, 22]} />
    </>
  )
}

function Deck({ site, current }) {
  const rim = useRef()
  const sh = site.def.add[0]
  useFrame(({ clock }) => {
    rim.current.material.opacity = current ? 0.65 + Math.sin(clock.elapsedTime * 2.2) * 0.28 : 0.42
  })
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[sh.r, 32]} />
        <meshStandardMaterial color="#2a2420" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh ref={rim} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[sh.r - 0.08, sh.r, 48]} />
        <meshStandardMaterial color={GOLD} emissive={AMBER} emissiveIntensity={0.9} transparent toneMapped={false} />
      </mesh>
      <Html position={[0, 1.8, 0]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
        <div className="deck-tag">{site.name}</div>
      </Html>
    </group>
  )
}

function BeltRing({ cx, cz, r, color = GOLD, tube = 0.08 }) {
  const pts = useMemo(() => {
    const out = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      out.push(new THREE.Vector3(cx + Math.cos(a) * r, 0.14, cz + Math.sin(a) * r))
    }
    return out
  }, [cx, cz, r])
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), [pts])
  return (
    <line geometry={geo}>
      <lineBasicMaterial color={color} linewidth={1} />
    </line>
  )
}

function Projector({ at, pos, active, hijacked, readout }) {
  const beam = useRef()
  useFrame(({ clock }) => {
    const u = 0.55 + Math.sin(clock.elapsedTime * 3) * 0.15
    beam.current.scale.y = u
    beam.current.material.opacity = hijacked ? 0.25 : 0.65
  })
  const [x, z] = [at[0] + pos[0], at[1] + pos[1]]
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.35, 0.45, 0.7, 8]} />
        <meshStandardMaterial color="#c98a2a" emissive={AMBER} emissiveIntensity={hijacked ? 0.2 : 0.7} />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.12, 0.35, 12]} />
        <meshStandardMaterial color="#ffe6a8" emissive={GOLD} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh ref={beam} position={[0.8, 1.0, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.12, 0.35, 2.2, 8, 1, true]} />
        <meshStandardMaterial color={VIOLET} emissive={VIOLET} emissiveIntensity={active ? 1.6 : 0.4} transparent opacity={0.65} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 1.55, 0]} center zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}>
        <div className="lvl15-readout">{hijacked ? 'scrambled' : readout ?? 'projector'}</div>
      </Html>
    </group>
  )
}

function GridLift({ origin, shadow, visible }) {
  const g = useRef()
  useFrame(() => {
    if (g.current) g.current.visible = visible
  })
  if (!visible) return null
  const [ox, oz] = origin
  const cells = []
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      cells.push([i, j])
    }
  }
  const [mx, mz] = shadow || [0, 0]
  return (
    <group ref={g} position={[ox, 5.2, oz]}>
      {cells.map(([i, j]) => (
        <mesh key={`${i}-${j}`} position={[i * 0.9, 0, j * 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.82, 0.82]} />
          <meshStandardMaterial color="#304060" emissive="#6080c0" emissiveIntensity={i === mx && j === mz ? 1.2 : 0.15} transparent opacity={0.45} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[mx * 0.9, 0.08, mz * 0.9]} scale={0.35}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#88e0ff" emissive="#a8f0ff" emissiveIntensity={2} transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Marker({ at, pos, label }) {
  return (
    <group position={[at[0] + pos[0], 0.2, at[1] + pos[1]]}>
      <mesh>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 8]} />
        <meshStandardMaterial color={VIOLET} emissive={VIOLET} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <Html position={[0, 0.65, 0]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
        <div className="lvl15-marker">{label}</div>
      </Html>
    </group>
  )
}

export default function PushForwardScene({
  layout,
  sites,
  current,
  loops,
  hijacked,
  gridShadow,
  showGrid,
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
  onTrackMove,
  onEnemies,
  onHearts,
  emmyAt,
  emmyTalking,
  emmyNear,
}) {
  const emmyScript = useMemo(
    () => () => {
      const at = emmyAt.current
      return { pos: [at.x / S, 0, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.7 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
    },
    [emmyAt, emmyTalking],
  )
  return (
    <>
      <TerraceSky />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {sites.map((s) => (
        <Deck key={s.id} site={s} current={s.id === current} />
      ))}
      {sites
        .filter((s) => s.projector)
        .map((s) => (
          <Projector
            key={s.id}
            at={s.projector.at}
            pos={s.pos}
            active={current === s.id}
            hijacked={hijacked[s.id]}
            readout={loops?.target != null ? `target w=${loops.target}` : undefined}
          />
        ))}
      {sites
        .filter((s) => s.ring)
        .map((s) => (
          <group key={s.id} position={[s.pos[0], 0, s.pos[1]]}>
            <BeltRing {...s.ring} />
            {s.markers?.map((m, i) => (
              <Marker key={i} at={m.at} pos={[0, 0]} label={`w=${m.w}`} />
            ))}
          </group>
        ))}
      {sites
        .filter((s) => s.tube)
        .map((s) => (
          <group key={s.id} position={[s.pos[0], 0, s.pos[1]]}>
            <BeltRing {...s.tube} r={s.tube.r} color={GOLD} />
            {s.hole && <BeltRing {...s.hole} color="#ffcf6a" />}
          </group>
        ))}
      <GridLift origin={sites.find((s) => s.id === 'two_roads')?.gridOrigin || [12, -9.5]} shadow={gridShadow} visible={showGrid} />
      {exitOpen && (
        <mesh position={[layout.exit.gate[0], 0.5, layout.exit.gate[1]]}>
          <torusGeometry args={[1.1, 0.08, 8, 32, Math.PI]} />
          <meshStandardMaterial color={GOLD} emissive={AMBER} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      )}
      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        tool={tool}
        stateRef={stateRef}
        spawnRef={spawnRef}
        ribbonApi={ribbonApi}
        onAction={onAction}
        onTrackMove={onTrackMove}
        onEnemies={onEnemies}
        onHearts={onHearts}
      />
      <CordProp state={stateRef} tool={tool} />
      <SlingProp state={stateRef} tool={tool} />
      <group scale={S}>
        <Emmy script={emmyScript} />
      </group>
      <EmmyBubble emmyAt={emmyAt} show={emmyNear} />
    </>
  )
}
