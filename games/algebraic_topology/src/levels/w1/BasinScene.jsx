import { Html } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import Seascape from '../../world/Seascape'
import { Clouds, Gear } from '../../world/Dressing'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import { EmmyBubble } from '../w0/FoundryScene'
import { fieldAngle, unitRoots } from './brouwer'

const S = 0.7
const GOLD = '#ffb347'
const STONE = '#4a4a52'
const VIOLET = '#8060d0'

function BasinSky() {
  return (
    <>
      <color attach="background" args={['#120818']} />
      <fog attach="fog" args={['#120818', 28, 72]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#c8a0ff', '#0a0610', 0.55]} />
      <directionalLight position={[12, 14, -8]} intensity={0.95} color="#e8c8ff" />
      <pointLight position={[0, 8, 4]} intensity={14} distance={36} color="#ffb070" />
      <Seascape y={-2.4} depth={2.4} area={[0, 4, 70, 50]} seed={14} palette={{ water: '#1a2840', sand: '#3a4048', weed: '#2a3848' }} lanterns={6} />
      <Clouds y={14} area={[0, 0, 70, 55]} count={12} seed={4} />
      <Gear position={[-16, 0.2, 12]} r={2.1} speed={0.15} />
      <Gear position={[17, 0.4, 8]} r={1.6} speed={-0.12} rotation={[0, 1.2, 0]} />
    </>
  )
}

function Deck({ site, current }) {
  const r = site.def.add[0].r
  const pulse = current ? 0.35 + Math.sin(performance.now() * 0.003) * 0.15 : 0.12
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[r, 48]} />
        <meshStandardMaterial color={STONE} roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[r - 0.08, r, 64]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={pulse} toneMapped={false} />
      </mesh>
    </group>
  )
}

function RimRoad({ cx, cz, r }) {
  const pts = useMemo(() => {
    const out = []
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2
      out.push(cx + r * Math.cos(a), 0.12, cz + r * Math.sin(a))
    }
    return new Float32Array(out)
  }, [cx, cz, r])
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={pts.length / 3} array={pts} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#ffcf6a" linewidth={1} />
    </line>
  )
}

function RetractorEngine({ cx, cz, seized }) {
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.8, 2.4, 2.2]} />
        <meshStandardMaterial color="#1a1028" emissive={VIOLET} emissiveIntensity={seized ? 0.2 : 1.2} roughness={0.5} metalness={0.4} />
      </mesh>
      {[-1.2, 1.2].map((sd) => (
        <mesh key={sd} position={[sd * 1.8, 0.6, 0]} rotation={[0, 0, sd * 0.4]}>
          <cylinderGeometry args={[0.08, 0.08, 3.6, 8]} />
          <meshStandardMaterial color="#2a1838" emissive={VIOLET} emissiveIntensity={seized ? 0.15 : 0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.5, 0.65, 0.5, 12]} />
        <meshStandardMaterial color="#0e0814" emissive="#a259ff" emissiveIntensity={seized ? 0.3 : 2.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function ArrowTile({ x, z, angle, dim = false, highlight = false }) {
  const len = dim ? 0.15 : 0.42
  const fx = Math.cos(angle) * len
  const fz = Math.sin(angle) * len
  return (
    <group position={[x, 0.08, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.85, 0.85]} />
        <meshStandardMaterial color="#3a3848" roughness={0.9} emissive={highlight ? GOLD : '#000000'} emissiveIntensity={highlight ? 1.4 : 0} />
      </mesh>
      {!dim && (
        <>
          <mesh position={[fx * 0.5, 0.02, fz * 0.5]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[len, 0.04, 0.06]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
          <mesh position={[fx, 0.03, fz]} rotation={[0, -angle, 0]}>
            <coneGeometry args={[0.08, 0.14, 6]} />
            <meshStandardMaterial color="#ffe6a8" emissive={GOLD} emissiveIntensity={2} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

function FieldGrid({ site, field, foundRoots = [], stillFound = false }) {
  if (!field) return null
  const step = site.gridStep || 1.05
  const r = site.def.add[0].r - 0.9
  const roots = field.kind === 'poly' ? unitRoots(field.degree, 2.15) : []
  const tiles = []
  for (let x = -r; x <= r; x += step) {
    for (let z = -r; z <= r; z += step) {
      if (x * x + z * z > r * r) continue
      const ang = fieldAngle(field.kind, x, z, field)
      const nearStill = field.still && Math.hypot(x - field.still[0], z - field.still[1]) < step * 0.55
      const rootIdx = roots.findIndex((rt) => Math.hypot(x - rt.x, z - rt.z) < 0.55)
      const found = rootIdx >= 0 && foundRoots.includes(rootIdx)
      tiles.push(
        <ArrowTile
          key={`${x}-${z}`}
          x={x}
          z={z}
          angle={ang}
          dim={nearStill && stillFound}
          highlight={found || (nearStill && stillFound)}
        />,
      )
    }
  }
  return <group position={[site.pos[0], 0, site.pos[1]]}>{tiles}</group>
}

function SphereCap({ site, pickA, pickB }) {
  const R = site.sphereRadius || 3.4
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh position={[0, R * 0.35, 0]}>
        <sphereGeometry args={[R, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color="#2a2838" roughness={0.75} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>
      {site.stations?.map((st) => (
        <group key={st.id} position={[st.x, R * 0.35 + Math.sqrt(Math.max(0, R * R - st.x * st.x - st.z * st.z)) * 0.15, st.z]}>
          <mesh>
            <cylinderGeometry args={[0.35, 0.35, 0.12, 12]} />
            <meshStandardMaterial
              color={pickA === st.id || pickB === st.id ? GOLD : '#5a5870'}
              emissive={pickA === st.id || pickB === st.id ? GOLD : VIOLET}
              emissiveIntensity={pickA === st.id || pickB === st.id ? 1.8 : 0.5}
            />
          </mesh>
          <Html center distanceFactor={14} style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <div className="w1-14-station-label">
              {st.readings.join(' · ')}
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}

function ExitGate({ open, gate }) {
  if (!open) return null
  return (
    <group position={[gate[0], 0, gate[1]]}>
      <mesh position={[0, 2.2, 0]}>
        <torusGeometry args={[1.4, 0.12, 8, 32]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function BasinScene({
  layout,
  sites,
  current,
  basinState,
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
  playEnabled,
  tool,
  onAction,
  onTrackMove,
  onEnemies,
  onHearts,
}) {
  const emmyScript = useMemo(
    () => () => {
      const at = emmyAt.current
      return { pos: [at.x / S, 0, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.75 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
    },
    [emmyAt, emmyTalking],
  )
  const stations = sites.filter((s) => s.stage === 'station')
  return (
    <>
      <BasinSky />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {sites
        .filter((s) => s.kind === 'start')
        .map((s) => (
          <Deck key={s.id} site={s} current={false} />
        ))}
      {stations.map((s) => (
        <group key={s.id}>
          <Deck site={s} current={s.id === current} />
          {s.rimRadius && <RimRoad cx={s.pos[0]} cz={s.pos[1]} r={s.rimRadius} />}
          {s.id === 'retractor' && (
            <RetractorEngine cx={s.pos[0]} cz={s.pos[1]} seized={basinState.retractorSeized} />
          )}
          {s.field && (
            <FieldGrid
              site={s}
              field={s.field}
              foundRoots={basinState.foundRoots[s.id] || []}
              stillFound={basinState.stillFound[s.id]}
            />
          )}
          {s.stations && (
            <SphereCap site={s} pickA={basinState.pairPick.a} pickB={basinState.pairPick.b} />
          )}
        </group>
      ))}
      <ExitGate open={exitOpen} gate={layout.exit.gate} />
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
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.58} luminanceSmoothing={0.22} />
        <Vignette offset={0.28} darkness={0.62} />
      </EffectComposer>
    </>
  )
}
