import { Html, Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import Emmy from '../../characters/Emmy'
import { LAND } from '../../theme/palette'
import { CausewaySlab } from '../../world/ReefScenery'
import { Clouds, FloatingRocks } from '../../world/Dressing'
import Seascape from '../../world/Seascape'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import { Platform, Track, EmmyBubble, ForgeDoor } from '../w0/FoundryScene'
import { HUB_RADIUS, makeTrack } from '../w0/cells'
import { wordText } from './freeWords'
import { LETTER_COLORS } from '../w0/Hologram'

const S = 0.7
const TRACK_COL = { red: '#e04040', violet: '#8060d0' }

function LanternRing({ r, color }) {
  const n = 10
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        return (
          <group key={i} position={[Math.cos(a) * (r - 0.35), 0.55, Math.sin(a) * (r - 0.35)]}>
            <mesh>
              <boxGeometry args={[0.12, 0.35, 0.12]} />
              <meshStandardMaterial color={LAND.stoneDark} roughness={0.7} />
            </mesh>
            <pointLight color={color} intensity={4} distance={3.5} />
            <mesh position={[0, 0.22, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function DistrictPlatform({ site, lit, current, tracks }) {
  const r = site.def.add[0].r ?? 5.4
  const isRect = site.def.add[0].type === 'rect'
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      {isRect ? (
        <mesh position={[0, -0.28, 0]}>
          <boxGeometry args={[site.def.add[0].x1 - site.def.add[0].x0, 0.55, site.def.add[0].z1 - site.def.add[0].z0]} />
          <meshStandardMaterial color="#2a2c36" roughness={0.65} />
        </mesh>
      ) : (
        <Platform site={site} lit={lit} current={current} />
      )}
      {!isRect && <LanternRing r={r} color={lit ? '#ffb347' : '#554466'} />}
      {tracks.map((t, i) => (
        <Track key={i} track={t.track} edge={{ letter: i, dir: 1, torn: false }} progressRef={t.progressRef} trackIdx={i} pos={site.pos} />
      ))}
    </group>
  )
}

/** Colored bead tape above Gyroid. */
function WordTape({ stateRef, tape }) {
  const g = useRef()
  useFrame(() => {
    const s = stateRef.current
    if (!s) return
    g.current.visible = tape.length > 0
    g.current.position.set(s.x, 2.05, s.z)
  })
  return (
    <group ref={g}>
      <Html center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
        <div className="w16-word-tape" aria-label={`word tape: ${wordText(tape)}`}>
          {tape.map((l, i) => (
            <span key={i} className="w16-bead" style={{ background: LETTER_COLORS[l.e] }}>
              {l.s < 0 ? '⁻¹' : ''}
            </span>
          ))}
          {!tape.length && <span className="w16-bead empty">…</span>}
        </div>
      </Html>
    </group>
  )
}

export default function FreeWordScene({
  layout,
  sites,
  tracksBySite,
  current,
  progressRef,
  stateRef,
  frameRef,
  emmyAt,
  emmyTalking,
  nearEmmy,
  checkpoint,
  gameKey,
  game,
  walkable,
  spawnRef,
  ribbonApi,
  playEnabled,
  tool,
  onAction,
  onEnemies,
  onHearts,
  tape,
  clasped,
  exitOpen,
  emmyNear,
}) {
  return (
    <>
      <color attach="background" args={['#080a12']} />
      <fog attach="fog" args={['#080a12', 24, 58]} />
      <ambientLight intensity={0.28} />
      <hemisphereLight args={['#a8b8ff', '#120818', 0.42]} />
      <directionalLight position={[-8, 16, 6]} intensity={0.85} color="#ffe2c4" />
      <Stars radius={80} depth={36} count={800} factor={2} fade speed={0.15} />
      <Sparkles count={180} scale={[36, 5, 36]} position={[0, 2, -6]} size={2.2} speed={0.35} color="#b090ff" />
      <Seascape bounds={layout.bounds} y={-1.2} />
      <FloatingRocks bounds={layout.bounds} count={14} y={4} />
      <Clouds bounds={layout.bounds} y={8} />

      {layout.causeways?.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {sites.map((site) => {
        if (site.kind === 'start') return null
        const tracks = (tracksBySite[site.id] || []).map((tr, i) => ({ track: tr, progressRef }))
        return (
          <DistrictPlatform
            key={site.id}
            site={site}
            lit={current === site.id}
            current={current === site.id}
            tracks={tracks}
          />
        )
      })}

      <ForgeDoor exit={layout.exit} open={exitOpen} />
      {clasped && (
        <mesh position={[0, 0.2, 0]}>
          <torusGeometry args={[0.35, 0.06, 8, 24]} />
          <meshStandardMaterial color="#b87333" emissive="#ffb347" emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      )}

      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <group scale={S}>
        <Emmy
          script={() => {
            const at = emmyAt.current
            return { pos: [at.x / S, 0, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.7 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
          }}
        />
      </group>
      <EmmyBubble emmyAt={emmyAt} show={emmyNear} />
      <WordTape stateRef={stateRef} tape={tape} />

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
        onEnemies={onEnemies}
        onHearts={onHearts}
      />

      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.85} intensity={0.55} />
        <Vignette eskil offset={0.22} darkness={0.55} />
      </EffectComposer>
    </>
  )
}

/** Build world tracks from layout site defs. */
export function buildTracks(sites, siteMap) {
  const out = {}
  for (const s of sites) {
    if (!s.tracks) continue
    const hub = s.pos
    out[s.id] = s.tracks.map((def) => makeTrack({ angle: def.angle, length: def.length ?? 4.2 }, hub))
  }
  return out
}

export { HUB_RADIUS, S }
