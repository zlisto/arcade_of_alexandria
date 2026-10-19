import { useMemo, useRef } from 'react'
import { Html, Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Hall, Platform, Press, Track, EmmyBubble, ForgeDoor } from '../w0/FoundryScene'
import Hologram from '../w0/Hologram'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import Emmy from '../../characters/Emmy'
import { ClaspProp } from '../w0/worldTools'
import { CausewaySlab } from '../../world/ReefScenery'
import { FloatingRocks } from '../../world/Dressing'
import { presentationLabel } from './glue.js'

const S = 0.7

// FoundryScene's Platform draws a round deck; a rectangular station gets a round hub plus a slab
const platformSite = (s) => {
  const a = s.def.add[0]
  return a.type === 'rect' ? { ...s, def: { add: [{ r: Math.min(a.x1 - a.x0, a.z1 - a.z0) / 2 }] } } : s
}

function ClaspPedestal({ pos, active }) {
  const glow = useRef()
  return (
    <group position={[pos[0], 0.12, pos[1]]}>
      <mesh>
        <cylinderGeometry args={[0.55, 0.65, 0.2, 24]} />
        <meshStandardMaterial color="#3a2a22" roughness={0.6} />
      </mesh>
      <mesh ref={glow}>
        <torusGeometry args={[0.42, 0.06, 8, 32]} />
        <meshStandardMaterial color="#ffb347" emissive="#ffb347" emissiveIntensity={active ? 2.2 : 0.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function GlueScene({
  layout,
  sites,
  walkable,
  game,
  gameKey,
  frameRef,
  stateRef,
  spawnRef,
  emmyAt,
  emmyTalking,
  emmyNear,
  exitOpen,
  ribbonApi,
  playEnabled,
  tool,
  onAction,
  onEnemies,
  onHearts,
  complexes,
  tracks,
  progressRef,
  slamRefs,
  holoKRef,
  holograms,
  current,
  presentation,
  claspReady,
}) {
  const stations = sites.filter((s) => s.stage === 'station')
  const emmyScript = useMemo(
    () => () => {
      const at = emmyAt.current
      return { pos: [at.x / S, 0, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.7 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
    },
    [emmyAt, emmyTalking],
  )
  const hallLayout = useMemo(() => ({ bounds: layout.bounds }), [layout])
  return (
    <>
      <Hall layout={hallLayout} />
      <FloatingRocks count={12} spread={38} y={4} color="#2a3544" />
      <Sparkles count={80} scale={[30, 8, 30]} position={[0, 3, -2]} size={2.2} speed={0.35} color="#ffb070" />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {exitOpen && <CausewaySlab a={layout.exit.a} b={layout.exit.b} width={layout.causewayWidth} />}
      {stations.map((s) => {
        const cx = complexes[s.id]
        return (
          <group key={s.id}>
            <Platform site={platformSite(s)} lit={!!cx?.point} current={s.id === current} />
            {s.def.add[0].type === 'rect' && (
              <mesh position={[s.pos[0] + (s.def.add[0].x0 + s.def.add[0].x1) / 2, -0.32, s.pos[1] + (s.def.add[0].z0 + s.def.add[0].z1) / 2]}>
                <boxGeometry args={[s.def.add[0].x1 - s.def.add[0].x0, 0.6, s.def.add[0].z1 - s.def.add[0].z0]} />
                <meshStandardMaterial color="#2a2c36" roughness={0.6} metalness={0.15} />
              </mesh>
            )}
            {(tracks[s.id] || []).map((tr, ti) => (
              <Track key={ti} track={tr} trackIdx={ti} pos={s.pos} edge={cx?.edges.find((e) => e.track === ti) || null} progressRef={s.id === current ? progressRef : { current: null }} />
            ))}
            <Press pos={s.pos} slamRef={slamRefs[s.id]} />
            {holograms[s.id] && (
              <group position={[s.pos[0], 4.3, s.pos[1] - 1.1]} scale={1.05}>
                <Hologram kind={holograms[s.id].kind} word={holograms[s.id].word} kRef={holoKRef[s.id]} />
              </group>
            )}
            {s.id === 'two_pieces' && <ClaspPedestal pos={s.overlap.map((v, i) => v + s.pos[i])} active={claspReady} />}
          </group>
        )
      })}
      <ForgeDoor exit={layout.exit} open={exitOpen} />
      <group scale={S}>
        <Emmy script={emmyScript} />
        <ClaspProp state={stateRef} tool={tool} />
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
      {presentation && current && (
        <Html position={[stations.find((s) => s.id === current).pos[0] + 4.2, 2.2, stations.find((s) => s.id === current).pos[1] - 3.8]} className="glue-pres-hud">
          <div className="glue-pres-panel">
            <div className="glue-pres-title">Group</div>
            <div className="lesson-math">{presentationLabel(presentation)}</div>
          </div>
        </Html>
      )}
    </>
  )
}
