import { useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import Seascape from '../../world/Seascape'
import { Clouds, FloatingRocks } from '../../world/Dressing'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import { EmmyBubble } from '../w0/FoundryScene'

const S = 0.7

function HallSky() {
  return (
    <>
      <color attach="background" args={['#060912']} />
      <fog attach="fog" args={['#060912', 22, 58]} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#a8c8ff', '#0a0818', 0.55]} />
      <directionalLight position={[8, 18, -10]} intensity={0.95} color="#d0e4ff" />
      <Stars radius={80} depth={36} count={1400} factor={2.4} fade speed={0.25} />
      <Seascape y={-6} area={[0, 20, 90, 80]} bed={false} lanterns={4} palette={{ water: '#0f2848', deep: '#060c18' }} />
      <Clouds y={4} area={[0, 10, 50, 70]} count={12} color="#8898cc" opacity={0.22} seed={11} speed={0.2} />
      <FloatingRocks area={[0, 8, 40, 50]} count={8} seed={3} />
    </>
  )
}

function GlassDeck({ site, current, shift, sheets = 3 }) {
  const rim = useRef()
  useFrame(({ clock }) => {
    if (rim.current) rim.current.material.emissiveIntensity = current ? 1.2 + Math.sin(clock.elapsedTime * 2.2) * 0.4 : 0.7
  })
  const [x, z] = site.pos
  const layers = Array.from({ length: sheets }, (_, i) => i)
  return (
    <group position={[x, 0, z]}>
      {layers.map((i) => {
        const Ïƒ = Array.from({ length: sheets }, (_, j) => (j + shift) % sheets)
        const layer = Ïƒ.indexOf(i)
        return (
          <mesh key={i} position={[0, 0.12 + layer * 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[site.def.add[0].r || 5, 48]} />
            <meshStandardMaterial color="#1a2838" transparent opacity={0.35 + layer * 0.08} roughness={0.2} metalness={0.4} />
          </mesh>
        )
      })}
      <mesh ref={rim} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[(site.def.add[0].r || 5) - 0.15, (site.def.add[0].r || 5) + 0.08, 64]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={0.8} toneMapped={false} transparent opacity={current ? 0.9 : 0.45} />
      </mesh>
    </group>
  )
}

function DeckWheel({ site, onClick, active }) {
  const g = useRef()
  const [x, z] = site.pos
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * (active ? 0.5 : 0.15)
  })
  return (
    <group ref={g} position={[x + (site.wheel?.[0] || 0), 0.4, z + (site.wheel?.[1] || 0)]} onClick={(e) => (e.stopPropagation(), onClick?.())}>
      <mesh>
        <torusGeometry args={[0.55, 0.12, 10, 32]} />
        <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} position={[Math.sin((i * Math.PI * 2) / 3) * 0.35, 0, Math.cos((i * Math.PI * 2) / 3) * 0.35]}>
          <boxGeometry args={[0.12, 0.2, 0.35]} />
          <meshStandardMaterial color="#ffe6a8" emissive="#fff2c4" emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function AntipodalSphere({ site, current }) {
  const [x, z] = site.pos
  const pulse = useRef()
  useFrame(({ clock }) => {
    if (pulse.current) pulse.current.material.emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 2) * 0.5
  })
  return (
    <group position={[x, 0, z]}>
      <mesh>
        <sphereGeometry args={[5.5, 32, 24]} />
        <meshStandardMaterial color="#182030" transparent opacity={0.25} roughness={0.1} metalness={0.5} />
      </mesh>
      {(site.doors || []).map(([dx, dz], i) => (
        <group key={i} position={[dx, 1.2, dz]}>
          <mesh ref={i === 0 ? pulse : undefined}>
            <boxGeometry args={[1.2, 2.4, 0.2]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[4.8, 5.2, 64]} />
        <meshStandardMaterial color="#ff8ad8" emissive="#ff8ad8" emissiveIntensity={current ? 1.2 : 0.4} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

function LoopTrack({ site, loopId, active }) {
  const [x, z] = site.pos
  const col = loopId === 'half' ? '#ffb347' : '#506080'
  const scale = loopId === 'meridian' ? [0.35, 1] : [1, 1]
  const rot = loopId === 'meridian' ? Math.PI / 2 : 0
  return (
    <mesh rotation={[-Math.PI / 2, rot, 0]} position={[x, 0.08, z]} scale={scale}>
      <ringGeometry args={[loopId === 'half' ? 4.2 : 4.5, loopId === 'half' ? 4.9 : 4.85, loopId === 'half' ? 32 : 64, 1, loopId === 'half' ? 0 : Math.PI * 2]} />
      <meshStandardMaterial color={col} emissive={col} emissiveIntensity={active ? 1.6 : 0.35} toneMapped={false} transparent opacity={active ? 0.95 : 0.35} />
    </mesh>
  )
}

export default function DeckHallsScene({
  layout,
  sites,
  current,
  shift,
  guardsAligned,
  walkLoop,
  onWheelClick,
  gameKey,
  game,
  walkable,
  playEnabled,
  stateRef,
  frameRef,
  emmyAt,
  emmyTalking,
  nearEmmy,
  onEnemies,
  onHearts,
  tool,
  onAction,
  spawnRef,
  ribbonApi,
  exitOpen,
}) {
  const emmyScript = () => ({
    pos: [emmyAt.current.x / S, 0, emmyAt.current.z / S],
    rotY: emmyAt.current.rotY,
    walk: emmyAt.current.walk,
    gesture: emmyTalking.current ? 0.85 : 0,
    talk: emmyTalking.current ? 1 : 0,
    bow: 0,
  })
  return (
    <>
      <HallSky />
      {layout.causeways?.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth || 1.5} />
      ))}
      {exitOpen && layout.exit && <CausewaySlab a={layout.exit.a} b={layout.exit.b} width={layout.causewayWidth || 1.5} />}
      {sites.map((site) => {
        if (site.kind === 'start' || site.id === 'exit_path' || site.id === 'north_gate') {
          const [x, z] = site.pos
          return (
            <mesh key={site.id} position={[x, -0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[site.def.add[0].r || 2, 32]} />
              <meshStandardMaterial color="#1c2430" roughness={0.85} />
            </mesh>
          )
        }
        if (site.id === 'antipodal') {
          return (
            <group key={site.id}>
              <AntipodalSphere site={site} current={current === site.id} />
              {site.loops?.map((lid) => (
                <LoopTrack key={lid} site={site} loopId={lid} active={walkLoop === lid || (current === site.id && lid === 'half')} />
              ))}
            </group>
          )
        }
        const sheets = site.cover === 'quotient' ? 2 : site.cover === 'lopsided' || site.cover === 'cyclic3' ? 3 : 1
        return (
          <group key={site.id}>
            <GlassDeck site={site} current={current === site.id} shift={current === site.id ? shift : 0} sheets={sheets} />
            {site.wheel && current === site.id && <DeckWheel site={site} active onClick={onWheelClick} />}
          </group>
        )
      })}
      <group scale={S}>
        <Emmy script={emmyScript} />
      </group>
      <EmmyBubble emmyAt={emmyAt} show={nearEmmy && !!current} />
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
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.85} intensity={0.85} />
        <Vignette eskil offset={0.12} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
