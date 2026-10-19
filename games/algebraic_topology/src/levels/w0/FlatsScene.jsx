import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import CountNull from '../../characters/CountNull'
import FlatsScenery, { LiveLine, MarkerStone, Post, Shrine } from './FlatsScenery'
import { DevAdvance, FollowCamera } from './OverworldScene'
import ReefGame from './ReefGame'
import { grabPin, ribbonLength, ribbonPieces, sampleMovie, snapshot, stepRibbon } from './ribbon'

/**
 * Level 0-2's 3D scene: the flats, the Tide Line's scripted homotopy, the two
 * playable ribbons (stepped here every frame), the Tide Glass replay of what the
 * player did, Count Null's fake deformations — and Gyroid, via ReefGame.
 */

const GHOST = 0.035 // the Tide Glass shows the frames this far either side of the current one
const RECORD_EVERY = 0.1

/** Steps the playable ribbons; the held point follows Gyroid, who can't stretch a ribbon past its limit. */
function RibbonSystem({ ribbonsRef, flats, stateRef }) {
  const clock = useRef(0)
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const R = ribbonsRef.current
    const s = stateRef.current
    clock.current += dt
    const record = clock.current >= RECORD_EVERY
    if (record) clock.current = 0
    for (const id of Object.keys(R.ribbons)) {
      const r = R.ribbons[id]
      const g = grabPin(r)
      if (g && s) {
        const prev = [...g.pos]
        g.pos = [s.x, s.z]
        stepRibbon(r, flats)
        if (ribbonLength(r) > R.maxLength[id]) {
          // as far as it stretches: Gyroid is held back
          s.x = prev[0]
          s.z = prev[1]
          g.pos = prev
          stepRibbon(r, flats)
          R.strained = 0.6
        }
      } else stepRibbon(r, flats)
      if (record && R.recording === id) {
        const h = R.history[id] || (R.history[id] = [])
        h.push(snapshot(r))
        if (h.length > 600) h.splice(0, h.length - 600)
      }
    }
    R.strained = Math.max(0, (R.strained || 0) - dt)
  })
  return null
}

/** One playable ribbon: live pieces (or the replayed recording), its held point and any cuts. */
function PlayRibbon({ id, ribbonsRef }) {
  const grabRing = useRef()
  const cuts = [useRef(), useRef(), useRef()]
  const frame = () => {
    const R = ribbonsRef.current
    const rp = R.replay
    if (rp && rp.id === id) {
      const h = rp.frames
      return h[Math.min(h.length - 1, Math.floor(rp.t * (h.length - 1)))]
    }
    return null
  }
  const pieces = (k) => () => {
    const f = frame()
    if (f) return f.pieces[k]
    const r = ribbonsRef.current.ribbons[id]
    return r ? ribbonPieces(r)[k] : null
  }
  const ghost = (back) => () => {
    const rp = ribbonsRef.current.replay
    if (!rp || rp.id !== id) return null
    const h = rp.frames
    const i = Math.floor(rp.t * (h.length - 1)) - back
    return i >= 0 ? h[i].pieces[0] : null
  }
  useFrame(({ clock }) => {
    const r = ribbonsRef.current.ribbons[id]
    const g = r && grabPin(r)
    grabRing.current.visible = !!g && !ribbonsRef.current.replay
    if (g) {
      grabRing.current.position.set(g.pos[0], 0.12, g.pos[1])
      grabRing.current.rotation.z = clock.elapsedTime * 3
    }
    const cutPins = r ? r.pins.filter((p) => p.kind === 'cut') : []
    cuts.forEach((c, k) => {
      const p = cutPins[k]
      c.current.visible = !!p
      if (p) {
        c.current.position.set(p.pos[0], 0.15, p.pos[1])
        c.current.scale.setScalar(0.8 + Math.abs(Math.sin(clock.elapsedTime * 10 + k)) * 0.6)
      }
    })
  })
  const piece = [0, 1, 2, 3]
  return (
    <>
      {[16, 12, 8].map((back, i) => (
        <LiveLine key={`g${back}`} getPts={ghost(back)} color="#ffe6b0" width={3} opacity={0.12 + i * 0.08} />
      ))}
      {piece.map((k) => (
        <LiveLine key={`w${k}`} getPts={pieces(k)} color="#ffb347" width={12} opacity={0.22} />
      ))}
      {piece.map((k) => (
        <LiveLine key={k} getPts={pieces(k)} color="#ffd27a" width={5} />
      ))}
      <mesh ref={grabRing} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.24, 6]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
      {cuts.map((c, k) => (
        <mesh key={k} ref={c}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshBasicMaterial color="#c58bff" toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

/** A scripted homotopy H(s, t) drawn at the Tide Glass's frame, with its neighbors as ghosts; wet stretches glow violet. */
function MovieRibbon({ H, tRef, flats, ghosts = true, autoSpeed = 0 }) {
  const t = useRef(0)
  useFrame(({ clock }) => {
    t.current = autoSpeed ? (clock.elapsedTime * autoSpeed) % 1 : tRef.current
  })
  const at = (dt) => () => {
    const tt = t.current + dt
    return tt < 0 || tt > 1 ? null : sampleMovie(H, tt, 90)
  }
  const wet = (k) => () => {
    const pts = sampleMovie(H, t.current, 120)
    const runs = []
    let cur = null
    for (const p of pts) {
      if (flats.inPool(p[0], p[1])) {
        if (!cur) runs.push((cur = []))
        cur.push([p[0], p[1], 0.2])
      } else cur = null
    }
    return runs[k] || null
  }
  return (
    <>
      {ghosts && <LiveLine getPts={at(-GHOST)} color="#dfe9ff" width={3} opacity={0.35} />}
      {ghosts && <LiveLine getPts={at(GHOST)} color="#dfe9ff" width={3} opacity={0.35} />}
      <LiveLine getPts={at(0)} color="#ffb347" width={12} opacity={0.22} />
      <LiveLine getPts={at(0)} color="#ffd27a" width={5} />
      {[0, 1].map((k) => (
        <LiveLine key={k} getPts={wet(k)} color="#b070ff" width={7} />
      ))}
    </>
  )
}

export default function FlatsScene({
  layout,
  flats,
  zones,
  view,
  ribbonsRef,
  glassTRef,
  movies,
  walkable,
  game,
  gameKey,
  stateRef,
  frameRef,
  spawnRef,
  ribbonApi,
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
  const Z = Object.fromEntries(zones.map((z) => [z.id, z]))
  const tide = Z.tide_line
  const snap = Z.nulls_snap
  const nullScript = useMemo(() => () => ({ gesture: 0.6 + Math.sin(Date.now() / 900) * 0.3, crown: 0.6, crownY: 0 }), [])
  return (
    <>
      <FlatsScenery layout={layout} bridged exitOpen={view.exitOpen} />

      {/* shrines */}
      {zones.map((z) => (
        <Shrine key={z.id} pos={z.shrine} state={view.shrine[z.id]} />
      ))}

      {/* Tide Line: the tide's homotopy, played by itself until Gyroid holds the Tide Glass */}
      <Post pos={tide.ribbon.a} />
      <Post pos={tide.ribbon.b} />
      <MovieRibbon H={movies.tide} tRef={glassTRef} flats={flats} ghosts={view.glassAt === 'tide_line'} autoSpeed={view.glassAt === 'tide_line' ? 0 : 0.06} />
      {movies.markers.map((m, i) => (
        <MarkerStone key={i} pos={m} lit={view.markersLit[i]} />
      ))}

      {/* the playable ribbons */}
      {['hold_posts', 'the_pools'].map((id) => (
        <group key={id}>
          <Post pos={Z[id].ribbon.a} />
          <Post pos={Z[id].ribbon.b} />
          {(Z[id].stakes || []).map((st) => {
            const order = view.targetStakes[id]?.indexOf(st.id) ?? -1
            return <Post key={st.id} pos={st.pos} kind="stake" lit={view.hooked.includes(st.id)} badge={order >= 0 ? order + 1 : null} />
          })}
          <PlayRibbon id={id} ribbonsRef={ribbonsRef} />
          {view.target[id] && <LiveLine getPts={() => view.target[id]} color="#ffe6a8" width={3} opacity={0.5} dashed y={0.05} />}
        </group>
      ))}
      <RibbonSystem ribbonsRef={ribbonsRef} flats={flats} stateRef={stateRef} />

      {/* Null's Snap */}
      <Post pos={snap.jump.a} />
      <Post pos={snap.jump.b} />
      <Post pos={snap.loop.post} />
      {view.movie === 0 && <MovieRibbon H={movies.jump} tRef={glassTRef} flats={flats} />}
      {view.movie === 1 && <MovieRibbon H={movies.loop} tRef={glassTRef} flats={flats} />}
      {view.nullHere && (
        <group position={[snap.nullAt[0], 0, snap.nullAt[1]]} rotation={[0, -2.4, 0]} scale={0.6}>
          <CountNull script={nullScript} />
          <pointLight position={[0, 2, 0]} intensity={6} distance={8} color="#a259ff" />
        </group>
      )}

      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled={spoolEnabled}
        tool={tool}
        sim={null}
        tRef={{ current: 0 }}
        stateRef={stateRef}
        spawnRef={spawnRef}
        ribbonApi={ribbonApi}
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
