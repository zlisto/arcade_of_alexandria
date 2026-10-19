import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../../characters/Gyroid'
import { sfxCrack, sfxHammer, sfxHit, sfxHurt, sfxPop, sfxRefuse, sfxRoot, sfxWhoosh } from '../../audio/chip'
import {
  BeaconSpawn,
  ConerSpawn,
  DeckGuardSpawn,
  HedgeSpawn,
  LiftlingSpawn,
  LoopBiterSpawn,
  PatrolSpawn,
  ProjectorImpSpawn,
  RetractorSpawn,
  ShardSpawn,
  MirrorSpawn,
  SnapperSpawn,
  SphereSpawn,
  StackSentinelSpawn,
  TorusSpawn,
  UnglueSpawn,
  WhirlSpawn,
} from '../../characters/Spawn'
import {
  ACTION_TOOLS,
  BladeProp,
  CasterProp,
  ClaspProp,
  CoilProp,
  CompassProp,
  CordProp,
  DialProp,
  ExtensionProp,
  SlingProp,
  STROKE_TOOLS,
  SWING_TOOLS,
  WandProp,
  WORLD_TOOLS,
} from './worldTools'

export { WORLD_TOOLS } from './worldTools'

/**
 * The playable layer of Retract Reef. Gyroid runs (WASD / arrows) and carries two
 * weapons: the Fundamental Lash (click to crack it toward the mouse) and the Spool,
 * a thick amber loop (click to start paying out spine thread, walk, click to stop).
 *
 *   sphere spawn — one lash: every loop slides right off a sphere, so it collapses to a point
 *   torus spawn  — two lashes: it holds two loops it can't shed (around the tube, through
 *                  the hole); each lash lights one, and with both caught it collapses
 *   snapper      — one lash: a crab from Tidewarp Flats (0-2) that goes for ribbons and
 *                  clips them (a clipped ribbon is no longer a continuous map)
 *
 * (A preview of World 1, where the torus has two independent loops and the sphere none.)
 */

export const GYROID_SCALE = 0.7
const SPEED = 3.6
const WHIP_TIME = 0.42
const WHIP_HIT_AT = 0.45 // fraction of the swing when the lash lands
const WHIP_RANGE = 1.35
const WHIP_ARC = Math.PI * 0.42
const CONTACT = 0.36
const HEARTS = 3

const ENEMY = {
  sphere: { hp: 1, speed: 0.95, radius: 0.32 },
  torus: { hp: 2, speed: 0.72, radius: 0.44 },
  snapper: { hp: 1, speed: 1.25, radius: 0.42 },
  mirror: { hp: 1, speed: 0.9, radius: 0.36 },
  unglue: { hp: 1, speed: 1.3, radius: 0.34 },
  coner: { hp: 2, speed: 1.0, radius: 0.4 },
  biter: { hp: 2, speed: 1.15, radius: 0.36 },
  beacon: { hp: 1, speed: 0, radius: 0.6 }, // the castle's judgment beacons: they never move or bite
  shard: { hp: 1, speed: 2.1, radius: 0.3 },
  // --- World 1 (one row per type, shared by every level that uses it)
  hedge: { hp: 1, speed: 0.4, radius: 0.5, rootTime: 4.2 }, // 1-1: roots into a hedge unless lashed in time
  retractor: { hp: 2, speed: 1.3, radius: 0.42 }, // 1-4: chases like a Torus
  whirl: { hp: 1, speed: 1.9, radius: 0.38 }, // 1-4
  projector_imp: { hp: 1, speed: 0.95, radius: 0.38 }, // 1-5
  patrol: { hp: 2, speed: 0.85, radius: 0.42 }, // 1-6, 1-7, 1-8 (1-6 patrols get one hp per letter of their word)
  liftling: { hp: 2, speed: 1.05, radius: 0.34 }, // 1-8, 1-9 (1-8: only hittable on its own sheet, via stage.canHit)
  stack_sentinel: { hp: 2, speed: 0, radius: 0.55, harmless: true }, // 1-9: stands at the tower; lashing it swaps the start vertex (stage.onEnemyHit keeps it standing)
  deck_guard: { hp: 1, speed: 0.85, radius: 0.38 }, // 1-10: one lash clears every linked copy, once stacked (stage.canHit)
}

/** Starting hit points: a definition may set `hp`; a 1-6 patrol gets one per letter of its word. */
function enemyHp(type, def) {
  if (def?.hp) return def.hp
  if (type === 'patrol' && def?.word) return Math.max(1, def.word.trim().split(/\s+/).filter(Boolean).length)
  return ENEMY[type].hp
}

/** Models for the World 1 spawn (Worlds 2–4 append here too). */
const SPAWN_VIEW = {
  hedge: HedgeSpawn,
  retractor: RetractorSpawn,
  whirl: WhirlSpawn,
  projector_imp: ProjectorImpSpawn,
  patrol: PatrolSpawn,
  liftling: LiftlingSpawn,
  stack_sentinel: StackSentinelSpawn,
  deck_guard: DeckGuardSpawn,
}

/** The Fundamental Lash: an amber cord cracked from Gyroid's hand. */
function Lash({ state }) {
  const line = useRef()
  const flash = useRef()
  const pts = useMemo(() => Array.from({ length: 16 }, () => new THREE.Vector3()), [])
  useFrame(() => {
    const s = state.current
    const on = s.whip > 0
    line.current.visible = on
    flash.current.visible = on && s.whip > WHIP_HIT_AT && s.whip < WHIP_HIT_AT + 0.25
    if (!on) return
    const fx = Math.sin(s.face)
    const fz = Math.cos(s.face)
    const hx = s.x + fx * 0.17 - fz * 0.22 // right hand
    const hz = s.z + fz * 0.17 + fx * 0.22
    const ext = s.whip < 0.3 ? 0.25 : Math.min(1, (s.whip - 0.3) / 0.25) * (1 - Math.max(0, s.whip - 0.75) / 0.5)
    const reach = 0.25 + WHIP_RANGE * ext
    const arr = []
    for (let k = 0; k < pts.length; k++) {
      const u = k / (pts.length - 1)
      const sway = Math.sin(u * Math.PI) * (0.35 - ext * 0.3) * (s.whip < 0.3 ? -1 : 1)
      const x = hx + fx * reach * u - fz * sway
      const z = hz + fz * reach * u + fx * sway
      const y = 0.85 - u * 0.6 + Math.sin(u * Math.PI) * 0.3 * (1 - ext)
      arr.push(x, y, z)
    }
    line.current.geometry.setPositions(arr)
    flash.current.position.set(arr[arr.length - 3], arr[arr.length - 2], arr[arr.length - 1])
  })
  return (
    <>
      <Line ref={line} points={pts.map(() => [0, 0, 0])} color="#ffcf6a" lineWidth={4} toneMapped={false} />
      <mesh ref={flash}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
    </>
  )
}

// ---------------------------------------------------------------- the game

/** Renders the spawn list, picking up spawn added mid-play. */
function EnemyList({ enemies }) {
  const [n, setN] = useState(enemies.current.length)
  useFrame(() => {
    if (enemies.current.length !== n) setN(enemies.current.length)
  })
  return enemies.current
    .slice(0, n)
    .map((e, i) =>
      e.type === 'torus' ? <TorusSpawn key={i} e={e} maxHp={ENEMY.torus.hp} /> : e.type === 'snapper' ? <SnapperSpawn key={i} e={e} /> : e.type === 'mirror' ? <MirrorSpawn key={i} e={e} /> : e.type === 'unglue' ? <UnglueSpawn key={i} e={e} /> : e.type === 'coner' ? <ConerSpawn key={i} e={e} /> : e.type === 'biter' ? <LoopBiterSpawn key={i} e={e} /> : e.type === 'beacon' ? <BeaconSpawn key={i} e={e} /> : e.type === 'shard' ? <ShardSpawn key={i} e={e} /> : SPAWN_VIEW[e.type] ? createElement(SPAWN_VIEW[e.type], { key: i, e }) : <SphereSpawn key={i} e={e} />,
    )
}

/** Aim marker on the reef under the mouse. */
function Reticle({ aim, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const a = aim.current
    g.current.visible = !!a
    if (!a) return
    g.current.position.set(a[0], 0.06, a[1])
    g.current.rotation.z = clock.elapsedTime * (STROKE_TOOLS.has(tool) ? 1.5 : 3)
  })
  return (
    <group ref={g} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={STROKE_TOOLS.has(tool) ? [0.14, 0.2, 24] : [0.1, 0.14, 4]} />
        <meshBasicMaterial color={STROKE_TOOLS.has(tool) ? '#ffd27a' : '#fff2c4'} transparent opacity={0.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** The Spool weapon: a thick amber loop carried in Gyroid's hand; it spins while paying out thread. */
function SpoolLoop({ state, tool }) {
  const g = useRef()
  useFrame((_, dt) => {
    const s = state.current
    g.current.visible = tool === 'spool'
    const fx = Math.sin(s.face)
    const fz = Math.cos(s.face)
    g.current.position.set(s.x + fx * 0.28 - fz * 0.2, 0.62, s.z + fz * 0.28 + fx * 0.2)
    g.current.rotation.y = s.face
    g.current.rotation.x += dt * (s.spooling ? 9 : 1.2)
  })
  return (
    <group ref={g}>
      <mesh>
        <torusGeometry args={[0.16, 0.045, 10, 32]} />
        <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** The Tide Glass (0-2): a small amber hourglass held up while scrubbing time. */
function GlassProp({ state, tool }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'glass'
    const fx = Math.sin(s.face)
    const fz = Math.cos(s.face)
    g.current.position.set(s.x + fx * 0.3 - fz * 0.18, 0.72 + Math.sin(clock.elapsedTime * 2) * 0.03, s.z + fz * 0.3 + fx * 0.18)
    g.current.rotation.y = clock.elapsedTime * 0.8
  })
  return (
    <group ref={g}>
      {[1, -1].map((sd) => (
        <mesh key={sd} position={[0, sd * 0.07, 0]} rotation={[sd > 0 ? Math.PI : 0, 0, 0]}>
          <coneGeometry args={[0.08, 0.14, 16, 1, true]} />
          <meshStandardMaterial color="#ffe6a8" emissive="#ffb347" emissiveIntensity={1.2} transparent opacity={0.75} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {[1, -1].map((sd) => (
        <mesh key={`c${sd}`} position={[0, sd * 0.15, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
          <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** The Cell-Smith (0-4): a brass-and-indigo gauntlet whose palm shows a point, a loop and a disk. */
/**
 * The Cell-Smith: a forge hammer — a dark wooden haft, a brass-bound steel head with a
 * glowing gold rune band. Gyroid carries it at his side; a click winds it up and brings it
 * down (state.swing 0 → 1), with a flash of sparks at the strike.
 */
function SmithProp({ state, tool }) {
  const g = useRef()
  const pivot = useRef()
  const sparks = useRef()
  const band = useRef()
  useFrame(({ clock }) => {
    const s = state.current
    g.current.visible = tool === 'smith'
    const fx = Math.sin(s.face)
    const fz = Math.cos(s.face)
    // in his right hand, a little ahead
    g.current.position.set(s.x + fx * 0.1 - fz * 0.26, 0.5, s.z + fz * 0.1 + fx * 0.26)
    g.current.rotation.y = s.face
    const u = s.swing
    // rest: head up and back over the shoulder; wind-up lifts it; strike slams it forward and down
    let pitch = -0.5 + Math.sin(clock.elapsedTime * 2) * 0.03
    if (u > 0) {
      if (u < 0.4) pitch = -0.5 - 1.1 * Math.sin((u / 0.4) * (Math.PI / 2))
      else if (u < 0.55) pitch = -1.6 + 3.3 * ((u - 0.4) / 0.15)
      else pitch = 1.7 - 2.2 * ((u - 0.55) / 0.45)
    }
    pivot.current.rotation.x = pitch
    const hit = u > 0.55 && u < 0.8
    sparks.current.visible = hit
    if (hit) {
      const k = (u - 0.55) / 0.25
      sparks.current.children.forEach((c, i) => {
        const a = (i / sparks.current.children.length) * Math.PI * 2
        c.position.set(Math.cos(a) * 0.25 * k, 0.05 + Math.sin(k * Math.PI) * 0.18, 0.55 + Math.sin(a) * 0.25 * k)
        c.scale.setScalar(0.03 * (1 - k) + 0.005)
      })
    }
    band.current.material.color.set(hit ? '#ffffff' : '#ffd27a')
  })
  return (
    <group ref={g} scale={1.8}>
      <group ref={pivot}>
        {/* the haft, running forward from the hand */}
        <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.026, 0.46, 8]} />
          <meshStandardMaterial color="#4a2e1c" roughness={0.7} />
        </mesh>
        {/* the head, across the end of the haft */}
        <group position={[0, 0, 0.43]}>
          <mesh>
            <boxGeometry args={[0.22, 0.11, 0.11]} />
            <meshStandardMaterial color="#6a7078" metalness={0.9} roughness={0.3} />
          </mesh>
          {[-0.115, 0.115].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.02, 0.125, 0.125]} />
              <meshStandardMaterial color="#b88a3a" metalness={0.85} roughness={0.3} emissive="#3a2408" emissiveIntensity={0.3} />
            </mesh>
          ))}
          <mesh ref={band}>
            <boxGeometry args={[0.06, 0.115, 0.115]} />
            <meshBasicMaterial color="#ffd27a" toneMapped={false} />
          </mesh>
        </group>
      </group>
      {/* sparks at the strike */}
      <group ref={sparks} visible={false}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 6, 4]} />
            <meshBasicMaterial color={i % 2 ? '#ffd27a' : '#fff2c4'} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export default function ReefGame({
  stage,
  shape,
  playEnabled,
  spoolEnabled,
  tool,
  sim,
  tRef,
  stateRef,
  spawnRef,
  ribbonApi,
  onAction,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onTrackMove,
  onEnemies,
  onHearts,
  onSpooling,
}) {
  const b = shape.bounds
  const start = stage.start || [b.minX + 0.4, b.maxZ - 0.4]
  const pier = useMemo(() => [b.minX - 0.9, b.maxZ * 0.5], [b])
  const onPier = stage.mode === 'forgery'

  const state = useRef(null)
  if (!state.current) {
    state.current = {
      x: onPier ? pier[0] : start[0],
      z: onPier ? pier[1] : start[1],
      face: Math.PI / 2,
      moving: 0,
      whip: 0,
      swing: 0, // the Cell-Smith's hammer swing, 0 → 1
      hitDone: false,
      hearts: HEARTS,
      hurt: 0,
      spooling: false,
      slideFrom: null,
    }
  }
  const enemies = useRef(null)
  const makeEnemy = (def, i) => {
      const [type, x, z, site] = Array.isArray(def) ? def : [def.type, def.x, def.z, def.site]
      return {
      axis: Array.isArray(def) ? undefined : def.axis, // mirror spawn: their reflection's mirror line
      type,
      site,
      x,
      z,
      hx: x, // home: spawn stay near where they were placed
      hz: z,
      hp: enemyHp(type, Array.isArray(def) ? undefined : def),
      maxHp: enemyHp(type, Array.isArray(def) ? undefined : def),
      word: Array.isArray(def) ? undefined : def.word, // 1-6 patrols: the word they walk, and how many letters are lashed so far
      lashStep: Array.isArray(def) ? 0 : def.lashStep || 0,
      sheet: Array.isArray(def) ? undefined : def.sheet, // 1-8 liftlings: the sheet they live on
      linked: Array.isArray(def) ? false : !!def.linked, // 1-10 deck guards: one lash clears every linked copy at the site
      rooting: 0,
      alive: true,
      dying: 0,
      stun: 0,
      flash: 0,
      face: 0,
      seed: i * 1.7,
      tx: x,
      tz: z,
      retarget: 0,
      snipping: 0,
      cooldown: type === 'snapper' || type === 'unglue' || type === 'coner' || type === 'biter' ? 3.5 : 0, // they size things up before the first snip
      beam: 0, // Coners: seconds of beaming left
      }
  }
  if (!enemies.current) enemies.current = (stage.enemies || []).map(makeEnemy)
  if (stateRef) stateRef.current = state.current
  if (spawnRef) {
    // levels can add spawn mid-play (waves, Snappers arriving)
    spawnRef.current = (defs) => {
      const n = enemies.current.length
      enemies.current.push(...defs.map((d, k) => makeEnemy(d, n + k)))
      report()
    }
    // …and take them away again (e.g. the castle's beacons between rounds)
    spawnRef.current.remove = (test) => {
      for (const e of enemies.current) if (e.alive && test(e)) (e.alive = false), (e.dying = 0.3)
      report()
    }
  }
  // alive spawn per site (or the total, for single-stage boards)
  const report = () => {
    const by = {}
    for (const e of enemies.current) if (e.alive) by[e.site ?? 'all'] = (by[e.site ?? 'all'] || 0) + 1
    onEnemies?.(stage.bySite || stage.enemies?.some((d) => !Array.isArray(d)) ? by : by.all || 0)
  }
  const keys = useRef({})
  const aim = useRef(null) // reef point under the mouse
  const clicks = useRef([]) // clicks waiting for the game loop
  if (import.meta.env.DEV) {
    // dev inspection / test shortcuts
    window.__game = {
      state: state.current,
      enemies: enemies.current,
      click: (x, z) => clicks.current.push([x, z]),
      killSite: (site) => {
        for (const e of enemies.current) if (e.site === site) e.alive = false
        report()
      },
    }
  }

  useEffect(() => {
    report()
    onHearts?.(state.current.hearts)
    const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    const down = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return
      if (MOVE.includes(e.code)) {
        keys.current[e.code] = true
        e.preventDefault() // movement keys never nudge a focused slider or scroll the page
      }
    }
    const up = (e) => (keys.current[e.code] = false)
    const blur = () => (keys.current = {})
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
    // run once per mount (the board remounts per stage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const inside = (x, z) => shape.inside(x, z)
  const enemyInside = (x, z) => (shape.insideForSpawn || shape.inside)(x, z)

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    const t = tRef?.current ?? 0

    // ride the slide: Gyroid's own point is carried to the spine like every other
    if (sim && t > 0 && !onPier) {
      if (!s.slideFrom) {
        const end = sim.endpointAt?.(s.x, s.z) || [s.x, s.z]
        s.slideFrom = [s.x, s.z, end[0], end[1]]
      }
      const [x0, z0, x1, z1] = s.slideFrom
      s.x = x0 + (x1 - x0) * t
      s.z = z0 + (z1 - z0) * t
      s.moving = 0
      clicks.current.length = 0
      return
    }
    if (s.slideFrom) {
      // slide undone: back to where Gyroid stood
      ;[s.x, s.z] = s.slideFrom
      s.slideFrom = null
    }

    // --- movement (WASD / arrows)
    let mx = 0
    let mz = 0
    if (playEnabled && !onPier) {
      const k = keys.current
      mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0)
      mz = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0)
    }
    const ml = Math.hypot(mx, mz)
    if (ml > 0) {
      mx /= ml
      mz /= ml
      const step = SPEED * dt
      const nx = s.x + mx * step
      const nz = s.z + mz * step
      if (inside(nx, nz)) (s.x = nx), (s.z = nz)
      else if (inside(nx, s.z)) s.x = nx // slide along the shore
      else if (inside(s.x, nz)) s.z = nz
      if (s.whip === 0) s.face = Math.atan2(mx, mz)
    }
    s.moving = THREE.MathUtils.lerp(s.moving, ml > 0 ? 1 : 0, Math.min(1, dt * 12))

    // --- clicks: lash toward the click, stroke tools, or action tools (see worldTools.jsx)
    const canStroke = spoolEnabled && STROKE_TOOLS.has(tool)
    for (const [cx, cz] of clicks.current) {
      if (!playEnabled || onPier) continue
      if (STROKE_TOOLS.has(tool)) {
        if (!canStroke) continue
        if (!s.spooling) {
          if (onStrokeStart?.(s.x, s.z, cx, cz) === false) continue // nothing to take hold of here
          s.spooling = true
          onSpooling?.(true)
        } else {
          // (the level may pick something else up in onStrokeEnd and set spooling again)
          s.spooling = false
          onSpooling?.(false)
          onStrokeEnd?.(cx, cz)
        }
      } else if (ACTION_TOOLS.has(tool)) {
        s.face = Math.atan2(cx - s.x, cz - s.z)
        if (SWING_TOOLS.has(tool)) {
          s.swing = 0.0001
          s.clanged = false
        }
        onAction?.(s.x, s.z, cx, cz) // the level decides what the tool does
      } else if (tool === 'lash' && s.whip === 0) {
        s.face = Math.atan2(cx - s.x, cz - s.z)
        s.whip = 0.0001
        s.hitDone = false
        sfxWhoosh()
      }
    }
    clicks.current.length = 0
    if (s.spooling && s.spoolDropped) {
      // the level let go for us (e.g. the ribbon was clipped)
      s.spooling = false
      s.spoolDropped = false
      onSpooling?.(false)
    }
    if (s.spooling && !canStroke) {
      // switched weapons or the stage moved on: tie off the thread
      s.spooling = false
      onStrokeEnd?.()
      onSpooling?.(false)
    }
    if (s.spooling && ml > 0) onStrokeMove?.(s.x, s.z)
    if (tool === 'cord' && ml > 0 && playEnabled && !onPier) onTrackMove?.(s.x, s.z)

    // --- whip
    if (s.swing > 0) {
      s.swing += dt / 0.42
      if (!s.clanged && s.swing >= 0.55) {
        s.clanged = true
        sfxHammer()
      }
      if (s.swing >= 1) s.swing = 0
    }
    if (s.whip > 0) {
      s.whip += dt / WHIP_TIME
      if (!s.hitDone && s.whip >= WHIP_HIT_AT) {
        s.hitDone = true
        sfxCrack()
        for (const e of enemies.current) {
          if (!e.alive) continue
          const dx = e.x - s.x
          const dz = e.z - s.z
          const d = Math.hypot(dx, dz)
          let da = Math.atan2(dx, dz) - s.face
          da = Math.atan2(Math.sin(da), Math.cos(da))
          if (d < WHIP_RANGE + ENEMY[e.type].radius && Math.abs(da) < WHIP_ARC) {
            // levels can refuse a hit (1-8 liftlings on another sheet, 1-10 guards that haven't stacked)
            if (stage.canHit && stage.canHit(e) === false) {
              e.refused = 0.8
              e.stun = 0.25
              sfxRefuse()
              stage.onRefused?.(e)
              continue
            }
            // 1-6: a patrol only takes a hit if it is on the loop its word says to strike next
            if (e.type === 'patrol' && ribbonApi?.current?.patrolLash && !ribbonApi.current.patrolLash(e)) continue
            e.hp--
            e.flash = 0.15
            sfxHit()
            // a level can react to a hit, and can keep the target standing (1-9's Stack sentinel swaps the start vertex, again and again)
            if (stage.onEnemyHit?.(e) === 'keep') e.hp++
            e.stun = 0.5
            const kb = e.type === 'beacon' || ENEMY[e.type].speed === 0 ? 0 : 0.55 / (d || 1)
            const kx = e.x + dx * kb
            const kz = e.z + dz * kb
            if (enemyInside(kx, kz)) (e.x = kx), (e.z = kz)
            if (e.hp <= 0) {
              e.alive = false
              e.dying = e.type === 'torus' ? 0.6 : 0.5
              if (e.linked) {
                // 1-10: the copies of a guard on every sheet fall together
                for (const o of enemies.current) if (o.alive && o !== e && o.linked && o.type === e.type && o.site === e.site) (o.alive = false), (o.dying = 0.5)
              }
              sfxPop()
              report()
            }
          }
        }
      }
      if (s.whip >= 1) s.whip = 0
    }

    // --- spawn: wander, chase when close, hurt on contact
    s.hurt = Math.max(0, s.hurt - dt)
    const drift = playEnabled && stage.drift ? stage.drift(clock.elapsedTime) : null
    for (const e of enemies.current) {
      e.flash = Math.max(0, e.flash - dt)
      e.snipping = Math.max(0, e.snipping - dt)
      e.refused = Math.max(0, (e.refused || 0) - dt)
      if (e.dying > 0) {
        e.dying = Math.max(0, e.dying - dt)
        continue
      }
      if (!e.alive) continue
      if (e.type === 'beacon') continue // beacons just stand and wait to be judged
      if (e.type === 'hedge' && playEnabled && !onPier) {
        // 1-1: a hedge-sprout swells and takes root unless it is lashed first
        e.rooting = Math.min(1, (e.rooting || 0) + dt / ENEMY.hedge.rootTime)
        if (e.rooting >= 1) {
          sfxRoot()
          if (ribbonApi?.current?.sproutHedge?.(e.x, e.z)) {
            e.alive = false
            e.dying = 0.4
            report()
            continue
          }
          e.rooting = 0 // nowhere to take root here: it uproots and tries again
        }
      }
      if (e.stun > 0) {
        e.stun -= dt
        e.beam = 0 // a lashed Coner loses its beam
        continue
      }
      const cfg = ENEMY[e.type]
      const dx = s.x - e.x
      const dz = s.z - e.z
      const d = Math.hypot(dx, dz)
      const leash = Math.hypot(s.x - e.hx, s.z - e.hz) < 6.5 // spawn guard their own patch of reef
      e.cooldown = Math.max(0, e.cooldown - dt)
      const ribbonGoal = (e.type === 'snapper' || e.type === 'unglue' || e.type === 'coner' || e.type === 'biter') && e.cooldown === 0 && playEnabled && !onPier ? ribbonApi?.current?.target(e) : null
      if (drift && e.type !== 'snapper' && e.type !== 'unglue' && e.type !== 'coner' && e.type !== 'biter') {
        // spawn drift with the tide
        const nx = e.x + drift[0] * dt
        const nz = e.z + drift[1] * dt
        if (enemyInside(nx, nz)) (e.x = nx), (e.z = nz)
      }
      if (ribbonGoal && d > 1.4) {
        // Snappers go for the ribbon; when they reach it, they clip it
        e.tx = ribbonGoal[0]
        e.tz = ribbonGoal[1]
        const beams = e.type === 'coner' || e.type === 'biter'
        if (beams && Math.hypot(e.tx - e.x, e.tz - e.z) < 0.45) {
          // Coners hover and beam, Loop-biters chew; it lands only if they run their course
          if (!e.beam) e.beam = e.type === 'biter' ? 2.2 : 2.6
          e.beam -= dt
          e.tx = e.x
          e.tz = e.z
          if (e.beam <= 0) {
            e.beam = 0
            ribbonApi.current.snip(e.x, e.z)
            e.cooldown = 8
            e.retarget = 0
          }
        } else if (!beams && Math.hypot(e.tx - e.x, e.tz - e.z) < 0.28) {
          if (ribbonApi.current.snip(e.x, e.z)) e.snipping = 0.5
          e.cooldown = 6
          e.retarget = 0
        }
      } else if (d < 3.2 && leash && playEnabled && !onPier) {
        e.tx = s.x
        e.tz = s.z
      } else if ((e.retarget -= dt) <= 0 || Math.hypot(e.tx - e.x, e.tz - e.z) < 0.2) {
        for (let tries = 0; tries < 20; tries++) {
          const rx = e.hx + (Math.random() * 2 - 1) * 3
          const rz = e.hz + (Math.random() * 2 - 1) * 3
          if (enemyInside(rx, rz)) {
            e.tx = rx
            e.tz = rz
            break
          }
        }
        e.retarget = 2 + Math.random() * 2
      }
      // levels can steer a spawn themselves (1-6 patrols walk their word, 1-10 guards stack): the hook sets e.x/e.z (and e.tx/e.tz)
      stage.enemyAI?.(e, dt, s)
      const vx = e.tx - e.x
      const vz = e.tz - e.z
      const vl = Math.hypot(vx, vz)
      if (vl > 0.01 && playEnabled) {
        const nx = e.x + (vx / vl) * cfg.speed * dt
        const nz = e.z + (vz / vl) * cfg.speed * dt
        if (enemyInside(nx, nz)) (e.x = nx), (e.z = nz)
        else if (enemyInside(nx, e.z)) e.x = nx
        else if (enemyInside(e.x, nz)) e.z = nz
        else e.retarget = 0
        e.face = Math.atan2(vx, vz)
      }
      if (d < CONTACT + cfg.radius * 0.5 && s.hurt === 0 && playEnabled && !onPier && !cfg.harmless) {
        s.hurt = 1.3
        s.hearts = Math.max(0, s.hearts - 1)
        sfxHurt()
        onHearts?.(s.hearts)
        const kx = s.x + (dx / (d || 1)) * 0.7
        const kz = s.z + (dz / (d || 1)) * 0.7
        if (inside(kx, kz)) (s.x = kx), (s.z = kz)
        e.stun = 0.8
      }
    }
  })

  const gyroidScript = () => {
    const s = state.current
    const blink = s.hurt > 0 && Math.floor(s.hurt * 12) % 2 === 0
    return {
      pos: [s.x / GYROID_SCALE, blink ? -40 : 0, s.z / GYROID_SCALE],
      rotY: onPier ? Math.atan2(-pier[0], -pier[1]) : s.face,
      run: s.moving,
      cast: STROKE_TOOLS.has(tool) && !onPier ? 0.3 : 0,
      whip: s.whip,
      loop: 0,
      loopDrop: 0,
    }
  }

  return (
    <>
      {onPier && (
        <mesh position={[pier[0], -0.25, pier[1]]}>
          <cylinderGeometry args={[0.5, 0.65, 0.5, 8]} />
          <meshStandardMaterial color="#1a1f29" roughness={0.9} flatShading />
        </mesh>
      )}
      <group scale={GYROID_SCALE}>
        <Gyroid script={gyroidScript} />
      </group>
      <Lash state={state} />
      {!onPier && <SpoolLoop state={state} tool={tool} />}
      {!onPier && <GlassProp state={state} tool={tool} />}
      {!onPier && <SmithProp state={state} tool={tool} />}
      {!onPier && <SlingProp state={state} tool={tool} />}
      {!onPier && <CordProp state={state} tool={tool} />}
      {!onPier && <ClaspProp state={state} tool={tool} />}
      {!onPier && <CompassProp state={state} tool={tool} />}
      {!onPier && <CoilProp state={state} tool={tool} />}
      {!onPier && <BladeProp state={state} tool={tool} />}
      {!onPier && <DialProp state={state} tool={tool} />}
      {!onPier && <CasterProp state={state} tool={tool} />}
      {!onPier && <WandProp state={state} tool={tool} />}
      {!onPier && <ExtensionProp state={state} tool={tool} />}
      <EnemyList enemies={enemies} />
      {playEnabled && <Reticle aim={aim} tool={tool} />}

      {/* mouse: aim under the cursor; click to lash toward it, or to start / stop the thread */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        onPointerMove={(e) => (aim.current = [e.point.x, e.point.z])}
        onPointerOut={() => (aim.current = null)}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          aim.current = [e.point.x, e.point.z]
          clicks.current.push([e.point.x, e.point.z])
        }}
      >
        <planeGeometry args={[240, 240]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}
