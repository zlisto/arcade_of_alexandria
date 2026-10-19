import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import ReefScenery from '../../world/ReefScenery'
import Seascape from '../../world/Seascape'
import { SITES } from '../../world/reef'
import { Beacon, Footprint, Spine, TearLines, Tiles, Trails } from './ReefBoard'
import ReefGame from './ReefGame'

const ZERO = { current: 0 }

/**
 * Overhead three-quarter follow camera (classic Metal Gear / Zelda angle), fixed yaw.
 * `frameRef.current = { center: [x, z], size, follow }` frames a whole puzzle (a shrine)
 * while Gyroid works it, still drifting with him by `follow` (0 = locked on the puzzle).
 */
export function FollowCamera({ stateRef, frameRef }) {
  const { camera, size } = useThree()
  const look = useRef(new THREE.Vector3())
  const goal = useMemo(() => new THREE.Vector3(), [])
  const focus = useMemo(() => new THREE.Vector3(), [])
  const snapped = useRef(false)
  useFrame((_, dt) => {
    const s = stateRef.current
    if (!s) return
    const narrow = size.width / size.height < 1.1
    const fr = frameRef?.current
    let fx = s.x
    let fz = s.z - 0.6
    let back = narrow ? 13 : 8.5
    let up = narrow ? 15 : 10.5
    if (fr) {
      // frame the puzzle: look between Gyroid and its center, from higher and farther back
      const f = fr.follow ?? 0.35 // how much the view still drifts with Gyroid
      fx = s.x * f + fr.center[0] * (1 - f)
      fz = s.z * f + fr.center[1] * (1 - f)
      const zoom = (fr.size || 10) / 10
      back = (narrow ? 15 : 10) * zoom
      up = (narrow ? 19 : 13.5) * zoom
    }
    goal.set(fx, up, fz + 0.6 + back)
    const k = snapped.current ? Math.min(1, dt * (fr ? 2.5 : 4)) : 1
    snapped.current = true
    camera.position.lerp(goal, k)
    look.current.lerp(focus.set(fx, 0, fz), k)
    camera.lookAt(look.current)
  })
  return null
}

export function DevAdvance() {
  const { advance } = useThree()
  useEffect(() => {
    if (import.meta.env.DEV) window.__advance = advance
  }, [advance])
  return null
}

/** One playable site's reef: tiles, footprint, spine, beacons — and its slide when active. */
export function SiteReef({ site, samples, strokes, liveStroke, sim, tRef, active, saved, forgery, showTrails }) {
  const simRef = useRef(sim)
  simRef.current = active ? sim : null
  const tears = useMemo(() => (active && sim ? Array.from(sim.tears) : []), [active, sim])
  const tornSet = useMemo(() => new Set(tears), [tears])
  const t = active ? tRef : ZERO
  const all = liveStroke && liveStroke.length ? [...strokes, liveStroke] : strokes
  const beaconState = (i) => (!active || !sim ? (saved ? 'hit' : 'idle') : sim.beaconHit[i] ? 'hit' : 'missed')
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <Footprint samples={samples} />
      <Tiles samples={samples} simRef={simRef} tRef={t} forgery={forgery} tornSet={tornSet} saved={saved} />
      {showTrails && active && sim && <Trails samples={samples} sim={sim} tRef={tRef} />}
      {active && <TearLines samples={samples} simRef={simRef} tRef={tRef} forgery={forgery} pairs={tears} />}
      <Spine strokes={all} forgery={forgery} tRef={t} glow={saved || (active && sim?.valid)} />
      {(site.beacons || []).map((p, i) => (
        <Beacon key={i} position={p} state={beaconState(i)} />
      ))}
    </group>
  )
}

export default function OverworldScene({
  samplesBySite,
  strokesBySite,
  liveStroke,
  drawingSite,
  activeSite,
  sim,
  simWorld,
  tRef,
  saved,
  forgery,
  walkable,
  game,
  stateRef,
  gameKey,
  playEnabled,
  spoolEnabled,
  tool,
  gateOpen,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onEnemies,
  onHearts,
  onSpooling,
}) {
  return (
    <>
      <color attach="background" args={['#060a14']} />
      <fog attach="fog" args={['#060a14', 22, 55]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#5b8fb8', '#0a0a14', 0.55]} />
      <directionalLight position={[8, 16, 10]} intensity={1.2} color="#d8eef8" />
      <Stars radius={90} depth={40} count={2200} factor={3} fade speed={0.3} />
      <Sparkles count={260} scale={[70, 4, 50]} position={[0, 1, -8]} size={2} speed={0.25} color="#7fe8dc" />
      <Seascape y={-0.5} area={[0, -6, 90, 70]} seed={11} />

      <ReefScenery gateOpen={gateOpen} />
      {SITES.filter((s) => s.playable).map((site) => (
        <SiteReef
          key={site.id}
          site={site}
          samples={samplesBySite[site.id]}
          strokes={strokesBySite[site.id] || []}
          liveStroke={drawingSite === site.id ? liveStroke : null}
          sim={sim}
          tRef={tRef}
          active={activeSite === site.id}
          saved={!!saved[site.id]}
          forgery={site.stage === 'forgeries' ? forgery : null}
          showTrails={site.stage === 'walkway'}
        />
      ))}

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
        onStrokeStart={onStrokeStart}
        onStrokeMove={onStrokeMove}
        onStrokeEnd={onStrokeEnd}
        onEnemies={onEnemies}
        onHearts={onHearts}
        onSpooling={onSpooling}
      />
      <FollowCamera stateRef={stateRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.65} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

