import { useFrame } from '@react-three/fiber'
import { Html, Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import { EmmyBubble } from '../w0/FoundryScene'
import { LiveLine, Post } from '../w0/FlatsScenery'
import { linearHomotopy } from './routes'

const S = 0.7
const STONE = '#5a6678'
const HEDGE = '#1a3028'
const GOLD = '#ffb347'
const GATE = '#c9a84a'

export function GardensSky() {
  return (
    <>
      <color attach="background" args={['#0e1424']} />
      <fog attach="fog" args={['#0e1424', 28, 72]} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#a8c8ff', '#0a0a14', 0.55]} />
      <directionalLight position={[12, 18, -8]} intensity={0.9} color="#c8d8ff" />
      <pointLight position={[-8, 5, 6]} intensity={8} distance={28} color="#ffd2a0" />
      <Stars radius={80} depth={35} count={700} factor={2} fade speed={0.15} />
      <Sparkles count={80} scale={[50, 3, 50]} position={[0, 2, 0]} size={1.8} speed={0.2} color="#ffe6a8" />
    </>
  )
}

export function Gatehouse({ pos, rot = 0 }) {
  return (
    <group position={[pos[0], 0, pos[1]]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.4, 1.8, 1.1]} />
        <meshStandardMaterial color={STONE} roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <boxGeometry args={[1.6, 0.35, 1.3]} />
        <meshStandardMaterial color={STONE} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.1, 0.58]}>
        <boxGeometry args={[0.55, 1.1, 0.08]} />
        <meshStandardMaterial color="#2a1810" roughness={0.9} />
      </mesh>
      <mesh position={[0.45, 2.35, 0.5]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={GATE} emissive="#ffb347" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0.45, 2.35, 0.6]} intensity={4} distance={5} color="#ffb070" />
    </group>
  )
}

export function HedgeBed({ c, r }) {
  return (
    <group position={[c[0], 0, c[1]]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[r, r * 1.05, 1.1, 24]} />
        <meshStandardMaterial color={HEDGE} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[r * 0.92, r, 0.35, 20]} />
        <meshStandardMaterial color="#243830" roughness={0.9} />
      </mesh>
    </group>
  )
}

// route points are deck-local [x, z]; the deck's group is already at the site's position
function RouteThread({ pts, color = GOLD, opacity = 1, dashed = false }) {
  const linePts = useMemo(() => pts.map(([x, z]) => [x, 0.22, z]), [pts])
  return (
    <Line points={linePts} color={color} lineWidth={dashed ? 1.2 : 2.4} transparent opacity={opacity} dashed={dashed} dashSize={0.35} gapSize={0.22} />
  )
}

function GhostHomotopy({ a, b, t }) {
  const pts = useMemo(() => linearHomotopy(a, b, t), [a, b, t])
  return <RouteThread pts={pts} color="#ffe6a8" opacity={0.45} />
}

function GardenDeck({ site, current, ledger, glassT, slidePair, routes }) {
  const [px, pz] = site.pos
  const gates = site.gates
  const showRoutes = routes || site.routes || {}
  const sh = site.def.add[0]
  const deckR = sh.r || 5
  return (
    <group position={[px, 0, pz]}>
      {sh.type === 'rect' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(sh.x0 + sh.x1) / 2, 0.02, (sh.z0 + sh.z1) / 2]}>
          <planeGeometry args={[sh.x1 - sh.x0, sh.z1 - sh.z0]} />
          <meshStandardMaterial color="#4a5568" roughness={0.88} />
        </mesh>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[deckR, 48]} />
          <meshStandardMaterial color="#4a5568" roughness={0.88} />
        </mesh>
      )}
      {sh.type !== 'rect' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[deckR - 0.15, deckR, 64]} />
          <meshStandardMaterial color={current ? GOLD : '#6a7896'} emissive={current ? '#ffb347' : '#000'} emissiveIntensity={current ? 0.35 : 0} transparent opacity={0.85} />
        </mesh>
      )}
      {(site.hedges || []).map((h, i) => (
        <HedgeBed key={i} c={h.c} r={h.r} />
      ))}
      {gates && (
        <>
          <Gatehouse pos={gates.a} rot={Math.PI / 2} />
          <Gatehouse pos={gates.b} rot={-Math.PI / 2} />
          <Post pos={gates.a} />
          <Post pos={gates.b} />
        </>
      )}
      {gates?.c && <Gatehouse pos={gates.c} rot={0} />}
      {Object.entries(showRoutes).map(([id, pts]) => {
        const cls = ledger?.[id]
        const col = cls === 0 ? '#ffb347' : cls === 1 ? '#b090ff' : cls === 2 ? '#7fe8dc' : GOLD
        const sel = slidePair?.includes(id)
        return <RouteThread key={id} pts={pts} color={col} opacity={sel ? 1 : 0.75} dashed={id.includes('fast')} />
      })}
      {slidePair?.length === 2 && showRoutes[slidePair[0]] && showRoutes[slidePair[1]] && (
        <GhostHomotopy a={showRoutes[slidePair[0]]} b={showRoutes[slidePair[1]]} t={glassT} />
      )}
      {site.id === current && (
        <Html position={[0, 3.2, 0]} center className="deck-label" style={{ pointerEvents: 'none' }}>
          {site.name}
        </Html>
      )}
    </group>
  )
}

const ZERO_T = { current: 0 }

/** The Garden Gate: a plain stone disc where the player arrives (no puzzle on it). */
function LandingPad({ site }) {
  const r = site.def?.add?.[0]?.r ?? 2
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[r, r, 0.24, 40]} />
        <meshStandardMaterial color="#5e6a80" roughness={0.7} metalness={0.1} emissive="#1c2230" emissiveIntensity={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[r * 0.55, r * 0.62, 40]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function EndpointGardensScene({
  layout,
  sites,
  walkable,
  current,
  frameRef,
  checkpoint,
  gameKey,
  enemies,
  spawnRef,
  stateRef,
  emmyAt,
  emmyTalking,
  nearEmmy,
  playEnabled,
  tool,
  onAction,
  ribbonApi,
  onEnemies,
  onHearts,
  ledger,
  glassT,
  slidePair,
  routeOverrides,
}) {
  const emmyRef = useRef()
  const game = useMemo(() => ({ mode: 'overworld', bySite: true, start: checkpoint, enemies }), [checkpoint, enemies])
  useFrame(() => {
    const e = emmyAt.current
    emmyRef.current?.position.set(e.x, 0, e.z)
    emmyRef.current.rotation.y = e.rotY
  })
  return (
    <>
      <GardensSky />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} tint="#6a7588" />
      ))}
      {sites.map((s) =>
        s.stage === 'station' ? (
          <GardenDeck
            key={s.id}
            site={s}
            current={s.id === current}
            ledger={ledger[s.id]}
            glassT={glassT}
            slidePair={s.id === current ? slidePair : null}
            routes={routeOverrides?.[s.id]}
          />
        ) : (
          <LandingPad key={s.id} site={s} />
        ),
      )}
      <FollowCamera stateRef={stateRef} frameRef={frameRef} checkpoint={checkpoint} />
      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled={false}
        tool={tool}
        sim={null}
        tRef={ZERO_T}
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
      <group ref={emmyRef}>
        <Emmy scale={S} script={() => ({ pos: [0, 0, 0], rotY: 0, walk: emmyAt.current.walk, gesture: emmyTalking.current ? 0.8 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 })} />
        {nearEmmy && playEnabled && <EmmyBubble />}
      </group>
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} intensity={0.85} mipmapBlur />
        <Vignette eskil offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
