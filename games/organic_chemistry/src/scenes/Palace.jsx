import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import EnantiomerShades from '../actors/EnantiomerShades'
import RacemicKing from '../actors/RacemicKing'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { TETRA, configOf, reflect, PLANES, planeHolds, isChiralCentre, STATUES, GROUP_COLOR, LOCKS, flipRS } from '../chem/rules5'
import { W5 as W, ROOMS5, STATIONS5, STATUE_POS, LOCK_DOORS, LOCK_START, THREONINE, TARTARIC, DOORS4, GOALS5, KING } from '../data/dungeon5'

// Dungeon 5 — The Mirror Palace (Chapter 5, Stereochemistry at Tetrahedral Centers).
// Ocarina-style: Dungeon Map, Compass, a small key, the Mirror Shield in a big chest, a Boss Key.
// In-world puzzles: symmetry planes through statues (§5.1–5.2), steering-wheel locks you read and then
// reflect (§5.5), two-centre statues whose centres reflect one at a time (§5.6–5.7), a racemic pool you
// split with a single-handed partner (§5.8), a centre that holds (§5.10) and a receptor lock (§5.12).

preloadModels('palace', 'king', 'kai')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-140, -178] }
const RECEPTOR = { pos: [6, -132] }
const POOL = { pos: [0, -125] }

function usePolished() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    g.fillStyle = '#5a6680'; g.fillRect(0, 0, 256, 256)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
      const v = 150 + ((r + k) % 2) * 34
      g.fillStyle = `rgb(${v - 18},${v - 8},${v + 14})`
      g.fillRect(k * 64 + 2, r * 64 + 2, 60, 60)
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(5, 36)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
}

function Halls({ world }) {
  const parts = useModelParts('palace')
  const walls = useMemo(() => {
    const out = []
    for (let z = 6; z > -138; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -142; z > -178; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  const colsL = useMemo(() => { const o = []; for (let z = 0; z > -136; z -= 8) o.push([-W + 1.3, 0, z, 1, 0]); return o }, [])
  const colsR = useMemo(() => colsL.map(([x, y, z]) => [-x, y, z, 1, 0]), [colsL])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -4, -140], [-W, 9, 8]), world.addSolid([W, -4, -140], [W + 2, 9, 8]),
      world.addSolid([-W, -4, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -4, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -4, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -4, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -4, -141], [-W, 9, -139]), world.addSolid([W, -4, -141], [ARENA.x, 9, -139]),
      ...[...colsL, ...colsR].map(([x, , z]) => world.addSolid([x - 0.6, 0, z - 0.6], [x + 0.6, 7, z + 0.6])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return (
    <group>
      <InstancedPart parts={parts} name="p5_wall" items={walls} />
      {/* the columns twist one way on the left and the other way on the right: mirror images */}
      <InstancedPart parts={parts} name="p5_colL" items={colsL} castShadow />
      <InstancedPart parts={parts} name="p5_colR" items={colsR} castShadow />
    </group>
  )
}

/** A tetrahedral centre: a carbon with four coloured groups at the TETRA positions. place: [g0..g3]. */
function Centre({ place, s = 0.9, label, glow = '#bfe8ff' }) {
  return (
    <group>
      <mesh><sphereGeometry args={[0.24 * s, 16, 12]} /><meshStandardMaterial color="#3a3a4a" metalness={0.4} roughness={0.3} emissive={glow} emissiveIntensity={0.15} /></mesh>
      {place.map((g, i) => {
        const d = new THREE.Vector3(...TETRA[i])
        const p = d.clone().multiplyScalar(0.85 * s)
        return (
          <group key={i}>
            <mesh position={d.clone().multiplyScalar(0.42 * s)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)}><cylinderGeometry args={[0.06 * s, 0.06 * s, 0.85 * s, 8]} /><meshStandardMaterial color="#c8c4d8" /></mesh>
            <mesh position={p}><sphereGeometry args={[(g === 'H' ? 0.16 : 0.26) * s, 14, 10]} /><meshStandardMaterial color={GROUP_COLOR[g] || '#ccc'} emissive={GROUP_COLOR[g] || '#ccc'} emissiveIntensity={0.25} /></mesh>
            <Tag position={p.clone().multiplyScalar(1.4)} df={7} far={11}>{g}</Tag>
          </group>
        )
      })}
      {label && <Tag position={[0, 1.5 * s, 0]} df={10}>{label}</Tag>}
    </group>
  )
}

/** 5-1: a statue on a plinth, with a glass plane through it and its reflection in a standing mirror beside. */
function Statue({ st, pos, plane, settled }) {
  const n = useMemo(() => {
    const [i, j] = PLANES[plane]
    return new THREE.Vector3().crossVectors(new THREE.Vector3(...TETRA[i]), new THREE.Vector3(...TETRA[j])).normalize()
  }, [plane])
  const holds = planeHolds(st.place, plane)
  const side = pos[0] < 0 ? 1 : -1 // the mirror stands toward the middle of the hall
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <Part model="palace" name="p5_plinth" />
      <group position={[0, 2.1, 0]}>
        <Centre place={st.place} />
        {settled !== 'chiral' && (
          <mesh quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)}>
            <circleGeometry args={[1.25, 40]} />
            <meshStandardMaterial color={holds ? '#6fe39a' : '#bfe8ff'} transparent opacity={holds ? 0.45 : 0.22} side={THREE.DoubleSide} depthWrite={false} emissive={holds ? '#2a8a4a' : '#3a6a9a'} emissiveIntensity={0.5} />
          </mesh>
        )}
      </group>
      {/* the mirror and, behind it, the statue's reflection (its groups mirrored through the mirror's plane) */}
      <group position={[side * 2.2, 0, 0]} rotation={[0, side * Math.PI / 2, 0]}><Part model="palace" name="p5_mirror" /></group>
      <group position={[side * 4.4, 2.1, 0]} scale={[-1, 1, 1]}><Centre place={st.place} s={0.9} glow="#8aa0c0" /></group>
      <Tag position={[0, 3.7, 0]} df={11}>{st.name}</Tag>
      {settled && <Tag position={[0, 3.25, 0]} df={10}>{settled === 'chiral' ? 'chiral: no symmetry plane' : 'achiral: a symmetry plane'}</Tag>}
    </group>
  )
}

/** a centre on a door (5-3 locks, 5-5 receptor), shown with its current R/S once it has been read */
function LockFace({ place, read, rank, want, solved }) {
  const cfg = configOf(place, rank)
  return (
    <group>
      <Centre place={place} s={1.1} glow={solved ? '#6fe39a' : '#ffd760'} />
      <Tag position={[0, -1.6, 0]} df={10}>{solved ? `${cfg} · open` : read ? `this is ${cfg} · wants ${want}` : `wants ${want} · read it (E)`}</Tag>
    </group>
  )
}

/** a two-centre statue (threonine, tartaric acid): two centres side by side, each labelled with its R/S */
function TwinStatue({ pos, cfg, name, meso }) {
  // draw each centre with its groups arranged to match its configuration (R: one arrangement, S: its mirror)
  const R = ['H', 'OH', 'CH₃', 'CO₂H']
  const placeFor = (c) => (c === 'R' ? R : reflect(R))
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <Part model="palace" name="p5_plinth" scale={[1.6, 1, 1]} />
      {[0, 1].map((i) => (
        <group key={i} position={[(i ? 0.75 : -0.75), 2.1, 0]}>
          <Centre place={placeFor(cfg[i])} s={0.65} glow={i ? '#bfe8ff' : '#ffd760'} />
          <Tag position={[0, 1.15, 0]} df={10}>{`C${i + 2}: ${cfg[i]}`}</Tag>
        </group>
      ))}
      <mesh position={[0, 2.1, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 1.5, 8]} /><meshStandardMaterial color="#c8c4d8" /></mesh>
      {meso && <mesh position={[0, 2.1, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.2, 2.2]} /><meshStandardMaterial color="#6fe39a" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
      <Tag position={[0, 3.8, 0]} df={11}>{name}</Tag>
    </group>
  )
}

function Shard({ show, pos }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = clock.elapsedTime * 1.5; g.current.position.y = 1.8 + Math.sin(clock.elapsedTime * 2) * 0.2 } })
  if (!show) return null
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <group ref={g}>
        <mesh><cylinderGeometry args={[0.08, 0.08, 1.1, 8]} /><meshStandardMaterial color="#ffe08a" emissive="#ffcf4a" emissiveIntensity={3} toneMapped={false} /></mesh>
        <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.13, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh>
        <mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.13, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0, 2, 0]} color="#ffd76a" intensity={8} distance={12} />
    </group>
  )
}

/** 5-5: the nitrogen key keeps inverting like an umbrella; the phosphorus key holds still (§5.10) */
function InvertingKey({ pos, kind }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && kind === 'N') g.current.scale.y = Math.cos(clock.elapsedTime * 7) > 0 ? 1 : -1 })
  return (
    <group position={pos}>
      <Part model="palace" name="p5_plinth" scale={[0.7, 1, 0.7]} />
      <group ref={g} position={[0, 2.0, 0]}>
        <mesh><sphereGeometry args={[0.22, 14, 10]} /><meshStandardMaterial color={kind === 'N' ? '#5a8aff' : '#ff9a3a'} emissive={kind === 'N' ? '#2a4aff' : '#c05a10'} emissiveIntensity={0.4} /></mesh>
        {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; const d = new THREE.Vector3(Math.cos(a) * 0.9, -0.42, Math.sin(a) * 0.9).normalize(); return <mesh key={k} position={d.clone().multiplyScalar(0.6)}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color={['#ff6fb3', '#6fe39a', '#ffd04a'][k]} /></mesh> })}
        {/* the lone pair (N) or the fourth group (P): the fourth corner of the tetrahedron */}
        <mesh position={[0, 0.55, 0]}><sphereGeometry args={[kind === 'N' ? 0.12 : 0.16, 10, 8]} /><meshStandardMaterial color={kind === 'N' ? '#fff7c0' : '#c87aff'} emissive={kind === 'N' ? '#ffd760' : '#8a4ac0'} emissiveIntensity={0.8} /></mesh>
      </group>
      <Tag position={[0, 3.2, 0]} df={10}>{kind === 'N' ? 'Amine key · N with three groups and a lone pair' : 'Phosphine key · P with three groups and a lone pair'}</Tag>
    </group>
  )
}

function PalaceLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const floor = usePolished()
  const planes = save.t5planes || {}
  const settled = save.t5statues || {}
  const lockPlace = { ...LOCK_START, ...(save.t5place || {}) }
  const read = save.t5read || {}
  const thr = save.t5thr || THREONINE.start
  const tart = save.t5tart || TARTARIC.start
  const pool = save.t5pool || null

  useEffect(() => {
    world.map = {
      floor: '#8a96b0', wall: '#2a3040', pit: '#0c1428',
      labels: ROOMS5.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t5-map']) return null; const seen = sv.t5seen || {}; return ROOMS5.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t5-compass']) return null
        const g = GOALS5.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 5) return { pos: [0, -160], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Mirror Lake' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('palace')
    const f = [world.addFloor(-W, -140, W, 8, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -140, 0)]
    const HINTS = {
      '5-1': 'Statues beside mirrors. Can each one be its own reflection? E turns a glass plane.',
      '5-2': 'A polarimeter! Light that twists. And a chest by the wall.',
      '5-3': 'Locks shaped like carbon centres. Read each one first (E).',
      '5-4': 'Statues with two centres. And shades with your face. Backwards.',
      '5-5': 'A pool, two keys, a lock like a hand. The last room.',
    }
    const t = ROOMS5.map((r) => world.addTrigger([-ARENA.x, -2, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t5seen || {}
      saveGame({ checkpoint: { scene: 'palace', room: r.id }, t5seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -153], [6, 6, -146], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t5-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the decree', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Mirror Lake', onInteract: () => onExit('lake', { scene: 'lake', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -60.8], radius: 2.2, label: () => (has('t5-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -139], radius: 2.4, label: () => (has('t5-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlockBossDoor() }),
    ]
    // 5-1 statues: E turns the plane; a lever declares chiral
    STATUES.forEach((st) => {
      const [x, z] = STATUE_POS[st.id]
      ia.push(world.addInteractable({ pos: [x, 0, z + 1.2], radius: 1.5, label: () => ((getState().save.t5statues || {})[st.id] ? null : 'Turn the glass plane through the statue'), onInteract: () => turnPlane(st) }))
      ia.push(world.addInteractable({ pos: [x + (x < 0 ? -1.6 : 1.6), 0, z + 1.4], radius: 1.1, label: () => ((getState().save.t5statues || {})[st.id] ? null : 'Pull the lever: no plane will ever work, it is chiral'), onInteract: () => declareChiral(st) }))
    })
    // 5-3 locks and the 5-5 receptor: E reads the centre
    ;[...Object.keys(LOCK_DOORS), '5-5c'].forEach((id) => {
      const z = id === '5-5c' ? RECEPTOR.pos[1] + 1.4 : LOCK_DOORS[id].z + 1.6
      const x = id === '5-5c' ? RECEPTOR.pos[0] : 0
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.8, label: () => (has(id) ? null : 'Read the centre’s steering wheel'), onInteract: () => readLock(id) }))
    })
    // 5-5 the pool fonts and the two keys
    ia.push(world.addInteractable({ pos: [POOL.pos[0] - 4, 0, POOL.pos[1]], radius: 1.6, label: () => (has('5-5a') ? null : 'Pour methylamine (achiral) into the racemic pool'), onInteract: () => pour('achiral') }))
    ia.push(world.addInteractable({ pos: [POOL.pos[0] + 4, 0, POOL.pos[1]], radius: 1.6, label: () => (has('5-5a') ? null : 'Pour (R)-1-phenylethylamine (one hand only) into the pool'), onInteract: () => pour('chiral') }))
    ia.push(world.addInteractable({ pos: [-8, 0, -131], radius: 1.4, label: () => (has('5-5b') ? null : 'Set the amine key in the door'), onInteract: () => useKey('N') }))
    ia.push(world.addInteractable({ pos: [-4, 0, -131], radius: 1.4, label: () => (has('5-5b') ? null : 'Set the phosphine key in the door'), onInteract: () => useKey('P') }))
    const solids = [
      world.addSolid([4.4, 0, -9.4], [5.6, 1.6, -8.6]),
      ...Object.values(STATUE_POS).map(([x, z]) => world.addSolid([x - 0.7, 0, z - 0.7], [x + 0.7, 2, z + 0.7])),
      world.addSolid([THREONINE.pos[0] - 1.1, 0, THREONINE.pos[1] - 0.7], [THREONINE.pos[0] + 1.1, 2, THREONINE.pos[1] + 0.7]),
      world.addSolid([TARTARIC.pos[0] - 1.1, 0, TARTARIC.pos[1] - 0.7], [TARTARIC.pos[0] + 1.1, 2, TARTARIC.pos[1] + 0.7]),
      world.addSolid([POOL.pos[0] - 2.6, 0, POOL.pos[1] - 1.6], [POOL.pos[0] + 2.6, 0.8, POOL.pos[1] + 1.6]),
    ]
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS5.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...solids].forEach((i) => world.remove(i)) }
  }, [world])

  // G targets: the locks (reflect), the twin statues' centres
  useEffect(() => {
    const ids = []
    ;[...Object.keys(LOCK_DOORS), '5-5c'].forEach((id) => {
      const pos = id === '5-5c' ? [RECEPTOR.pos[0], 0, RECEPTOR.pos[1]] : [0, 0, LOCK_DOORS[id].z]
      ids.push(world.addLantern({ needs: 'hasShield', pos, radius: 5, label: () => (has(id) ? null : 'Reflect the centre in the Mirror Shield'), onLantern: () => reflectLock(id) }))
    })
    ;[0, 1].forEach((i) => ids.push(world.addLantern({ needs: 'hasShield', pos: [THREONINE.pos[0] + (i ? 0.75 : -0.75), 0, THREONINE.pos[1]], radius: 3.4, label: () => (has('5-4b') ? null : `Reflect threonine's C${i + 2}`), onLantern: () => reflectTwin('t5thr', THREONINE.start, i) })))
    ;[0, 1].forEach((i) => ids.push(world.addLantern({ needs: 'hasShield', pos: [TARTARIC.pos[0] + (i ? 0.75 : -0.75), 0, TARTARIC.pos[1]], radius: 3.4, label: () => (has('5-4c') ? null : `Reflect tartaric acid's C${i + 2}`), onLantern: () => reflectTwin('t5tart', TARTARIC.start, i) })))
    return () => ids.forEach((id) => world.remove(id))
  }, [world])

  // ---------------------------------------------------------------- actions
  const turnPlane = (st) => {
    const all = getState().save.t5planes || {}
    const k = ((all[st.id] ?? 3) + 1) % PLANES.length // planes start at 3, which holds for none of the four
    saveGame({ t5planes: { ...all, [st.id]: k } }); sfx('pickup')
    if (planeHolds(st.place, k)) {
      settle(st, 'achiral')
      toast(`A symmetry plane! ${st.note}`, 'good', 5200)
    }
  }
  const declareChiral = (st) => {
    if ((getState().save.t5statues || {})[st.id]) return
    if (!isChiralCentre(st.place)) { sfx('wrong'); toast('The mirror disagrees: two of its groups are the same, so some plane can swap them. Keep turning the glass.', 'warn', 4800); return }
    settle(st, 'chiral')
    toast(`Chiral. ${st.note}`, 'good', 5200)
  }
  const settle = (st, how) => {
    const next = { ...(getState().save.t5statues || {}), [st.id]: how }
    saveGame({ t5statues: next }); sfx('right')
    if (STATUES.every((x) => next[x.id])) {
      markSolved('5-1'); sfx('open')
      setTimeout(() => say([
        { who: 'Pi', text: 'Three of them are their own reflections. Only lactic acid, with four different groups, isn’t.' },
        { who: 'Pi', text: 'A thing and its reflection are NOT always the same thing. One down, Malradix.' },
      ]), 600)
    }
  }
  const readLock = async (id) => {
    if (has(id) || busy.current) return
    const L = LOCKS.find((x) => x.id === id)
    const place = ({ ...LOCK_START, ...(getState().save.t5place || {}) })[id]
    const want = id === '5-5c' ? 'S' : LOCK_DOORS[id].want
    busy.current = true
    const ok = await openPanel('cipLock', { lockId: id, place, want })
    busy.current = false
    if (!ok) return
    saveGame({ t5read: { ...(getState().save.t5read || {}), [id]: true } })
    if (configOf(place, L.rank) === want) openLock(id)
  }
  const reflectLock = (id) => {
    if (has(id)) return
    if (!(getState().save.t5read || {})[id]) { sfx('wrong'); toast('Read the centre first (E). Reflect blind and you can’t know which hand you made.', 'warn', 3800); return }
    const L = LOCKS.find((x) => x.id === id)
    const all = { ...LOCK_START, ...(getState().save.t5place || {}) }
    const next = reflect(all[id])
    saveGame({ t5place: { ...(getState().save.t5place || {}), [id]: next } }); sfx('shard')
    const want = id === '5-5c' ? 'S' : LOCK_DOORS[id].want
    const cfg = configOf(next, L.rank)
    if (cfg === want) openLock(id)
    else toast(`Reflected: now ${cfg}. The lock wants ${want}.`, 'warn', 3200)
  }
  const openLock = (id) => {
    markSolved(id); sfx('open')
    const lines = {
      '5-3a': 'R reflected into S. Same groups, other hand.',
      '5-3b': 'This one was already S. No reflection needed.',
      '5-3c': 'Already R. Reading first saved you a wrong turn.',
      '5-5c': 'S-ibuprofen fits. The R form wouldn’t, like a left hand in a right glove (§5.12).',
    }
    toast(lines[id], 'good', 4200)
    if (id === '5-5c') checkBossKey()
  }
  const reflectTwin = (key, start, i) => {
    const cur = [...(getState().save[key] || start)]
    cur[i] = flipRS(cur[i])
    saveGame({ [key]: cur }); sfx('shard')
    if (key === 't5thr') {
      if (!has('5-4a') && DOORS4['5-4a'].want(cur)) { markSolved('5-4a'); sfx('open'); toast('(2S,3S): every centre reflected, so it is the mirror image of (2R,3R). Enantiomers.', 'good', 5000) }
      else if (has('5-4a') && !has('5-4b') && DOORS4['5-4b'].want(cur)) { markSolved('5-4b'); sfx('open'); toast('One centre the same, one opposite: a stereoisomer that is not a mirror image. Diastereomers (Table 5.2).', 'good', 5200) }
    } else if (!has('5-4c') && DOORS4['5-4c'].want(cur)) {
      markSolved('5-4c'); sfx('open')
      setTimeout(() => say([
        { who: 'Pi', text: '(2R,3S)… and look, the plane between the centres! It is its own mirror image.' },
        { who: 'Pi', text: 'Meso: chirality centres, but achiral. (2R,3S) and (2S,3R) are the same compound (Fig 5.12).' },
      ]), 500)
    }
  }
  const pour = (kind) => {
    if (has('5-5a')) return
    if (kind === 'achiral') { saveGame({ t5pool: 'racemic' }); sfx('wrong'); toast('Salts form, but as mirror images of each other: same solubility, one pool. Still no rotation (Fig 5.13).', 'warn', 5200); return }
    saveGame({ t5pool: 'split' }); markSolved('5-5a'); sfx('open')
    toast('R,R and S,R salts: diastereomers, with different solubilities. The pool splits in two (Fig 5.14).', 'good', 5200)
  }
  const useKey = (k) => {
    if (has('5-5b')) return
    if (k === 'N') { sfx('wrong'); toast('It keeps turning inside out, like an umbrella in the wind. An amine inverts too fast: its two hands can’t be kept apart (§5.10).', 'warn', 5200); return }
    markSolved('5-5b'); sfx('open'); toast('The phosphine holds its shape. Phosphines invert slowly enough to keep a handedness (§5.10).', 'good', 4800)
    checkBossKey()
  }
  const checkBossKey = () => { if (['5-5a', '5-5b', '5-5c'].every((x) => has(x))) setTimeout(() => toast('A big chest shimmers into view.', 'good', 2600), 1200) }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's decree", text: 'BY ORDER OF MALRADIX: A thing and its reflection are the same thing. Left is right. Bow to the King of Both.' },
      { who: 'Pi', text: 'Then why does every mirror in here look so smug?' },
    ])
    markSolved('t5-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t5-door')) return
    if (!getState().save.t5key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t5key: false }); markSolved('t5-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t5-bossdoor')) return
    if (!has('t5-bosskey')) { toast('A great lock made of two mirrored halves. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t5-bossdoor'); sfx('open'); toast('The Boss Key turns. Two voices laugh at once, beyond the door…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't5-map') await say([{ who: '', text: 'You got the Dungeon Map!' }, { who: 'Pi', text: 'Press M. Every hall, every mirror.' }])
    if (id === 't5-compass') await say([{ who: '', text: 'You got the Compass!' }, { who: 'Pi', text: 'The star is back.' }])
    if (id === 't5-key') { saveGame({ t5key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't5-shield') {
      saveGame({ hasShield: true })
      await itemGet(world, { model: 'palace', name: 'p5_shield', scale: 1, color: '#e8f0ff' }, [
        { who: '', text: 'You got the Mirror Shield!' },
        { who: 'Pi', text: 'Whatever you show it (G) comes back as its mirror image: R turns into S, S into R.' },
        { who: 'Pi', text: 'But read a lock before you reflect it. Otherwise how do you know which hand you’re making?' },
      ])
    }
    if (id === 't5-bosskey') { saveGame({ t5bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss5') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -148]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 1200))
    if (!getState().save.t5bossIntro) {
      saveGame({ t5bossIntro: true })
      await say([
        { who: 'Pi', text: 'The Racemic King! Half gold, half silver. Mirror images, fused.' },
        { who: 'Pi', text: 'Hit one half and the other cancels it, like a racemate cancelling its own rotation.' },
        { who: 'Pi', text: 'When the crown glows, give it Tartara’s one-handed glove (G). Then the halves aren’t mirror images any more!' },
      ])
    } else await say([{ who: 'Pi', text: 'Wait for the crown. Glove it (G). Then strike both halves!' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss5')
    playMusic('palace')
    await say([
      { who: 'Pi', text: 'Two halves, two different things, once a single-handed partner came along. Not the same at all.' },
      { who: 'Pi', text: 'The violet spark fled east, toward the mountains. And there: the shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 5 || busy.current) return
    busy.current = true
    sfx('shard')
    await say([{ who: 'Sister Tartara', text: '(She steps out of a mirror.) One question, and it is yours.' }])
    const ok = await openPanel('kingCheck', {})
    if (!ok) { await say([{ who: 'Sister Tartara', text: 'Take your time. Patience is the whole trick.' }]); busy.current = false; return }
    saveGame({ shards: 5, checkpoint: { scene: 'lake', at: 'gate' } })
    setState({ objective: 'Bond Shard 5 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… five shards. I can hear the castle bells now.' },
      { who: 'Princess Octavia', text: 'He said a thing and its reflection are the same. Every lock in that palace disagreed.' },
      { who: 'Sister Tartara', text: 'Keep the Shield. East of the lake the mountains climb, and every road needs energy to cross.' },
      { who: 'Pi', text: 'Five down, seven to go!' },
    ])
    await warpOut(world, { checkpoint: { scene: 'lake', at: 'gate' }, card: 5 })
    busy.current = false
    onExit('lake', { scene: 'lake', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -160], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss5 && (getState().save.shards || 0) < 5)
    tick()
    const t = setInterval(tick, 300)
    return () => { clearInterval(t); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 4.5, pitchSet: 0.24, lookY: 1.8 } : null })

  const lockRank = (id) => LOCKS.find((x) => x.id === id).rank
  const bossKeyShown = ['5-5a', '5-5b', '5-5c'].every((x) => solved[x])
  return (
    <group>
      <color attach="background" args={['#1a2236']} />
      <fog attach="fog" args={['#2a3450', 18, 75]} />
      <hemisphereLight args={['#dce8ff', '#2a3040', 0.85]} />
      <ambientLight intensity={0.35} color="#e0ecff" />
      <directionalLight position={[10, 40, -60]} intensity={0.9} color="#eef4ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <mesh position={[0, -0.01, -66]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, 148]} /><meshStandardMaterial map={floor} roughness={0.25} metalness={0.3} /></mesh>
      <mesh position={[0, -0.01, -159]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 38]} /><meshStandardMaterial color="#7a86a0" roughness={0.2} metalness={0.4} /></mesh>
      <Suspense fallback={null}><Halls world={world} /></Suspense>
      {[2, -12, -26, -44, -56, -76, -96, -112, -128].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#bfe8ff" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3644" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's decree</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t5-map']} onOpen={() => openChest('t5-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Mirror Palace</Tag>

      {/* 5-1 Hall of Hands */}
      {STATUES.map((st) => <Statue key={st.id} st={st} pos={STATUE_POS[st.id]} plane={planes[st.id] ?? 3} settled={settled[st.id]} />)}
      {STATUES.map((st) => { const [x, z] = STATUE_POS[st.id]; return (
        <group key={'lv' + st.id} position={[x + (x < 0 ? -1.6 : 1.6), 0, z + 1.4]}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.4, 1.0, 0.4]} /><meshStandardMaterial color="#3a4050" /></mesh>
          <mesh position={[0, 1.15, 0]} rotation={[settled[st.id] === 'chiral' ? 0.9 : -0.9, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 1.0, 6]} /><meshStandardMaterial color="#d8dce8" metalness={0.8} roughness={0.3} /></mesh>
          <Tag position={[0, 1.9, 0]} df={8} far={10}>chiral lever</Tag>
        </group>
      ) })}
      <Gate world={world} pos={[0, 0, -40]} size={[2 * W, 7, 0.8]} open={!!solved['5-1']} color="#5a6a8a" glow="#bfe8ff" />

      {/* 5-2 The Polarized Window */}
      <group position={[0, 0, -52.5]}><Part model="palace" name="p5_scope" /></group>
      <mesh position={[0, 3.5, -61.2]}><circleGeometry args={[2.2, 40]} /><meshStandardMaterial color={solved['5-2'] ? '#fff6c0' : '#5a6a8a'} emissive={solved['5-2'] ? '#ffd760' : '#1a2a4a'} emissiveIntensity={0.8} /></mesh>
      <Chest world={world} pos={[-7.6, 0, -42]} rotY={Math.PI / 2} opened={!!solved['t5-compass']} onOpen={() => openChest('t5-compass')} />
      <Chest world={world} pos={[0, 0, -59]} opened={!!solved['t5-key']} show={!!solved['5-2']} onOpen={() => openChest('t5-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -62]} size={[2 * W, 7, 0.8]} open={!!solved['t5-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -61.6]} df={13}>{solved['t5-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 5-3 The Steering-Wheel Locks */}
      <Chest world={world} pos={[2.6, 0, -64.5]} big opened={!!solved['t5-shield']} onOpen={() => openChest('t5-shield')} label="Open the big chest" />
      {Object.entries(LOCK_DOORS).map(([id, d]) => (
        <group key={id}>
          <Gate world={world} pos={[0, 0, d.z]} size={[2 * W, 7, 0.8]} open={!!solved[id]} color="#4a5a7a" glow={solved[id] ? '#6fe39a' : '#ffd760'} />
          {!solved[id] && <group position={[0, 2.6, d.z + 0.9]}><LockFace place={lockPlace[id]} read={!!read[id]} rank={lockRank(id)} want={d.want} solved={false} /></group>}
          <Tag position={[0, 6.4, d.z + 0.6]} df={12}>{LOCKS.find((x) => x.id === id).name} lock · wants {d.want}</Tag>
        </group>
      ))}

      {/* 5-4 Halls of Many Centres */}
      <TwinStatue pos={THREONINE.pos} cfg={thr} name="Threonine · C2 and C3" />
      <Gate world={world} pos={[0, 0, DOORS4['5-4a'].z]} size={[2 * W, 7, 0.8]} open={!!solved['5-4a']} color="#4a5a7a" glow="#bfe8ff" />
      <Tag position={[0, 7.6, DOORS4['5-4a'].z + 0.6]} df={12}>{DOORS4['5-4a'].label}</Tag>
      <Gate world={world} pos={[0, 0, DOORS4['5-4b'].z]} size={[2 * W, 7, 0.8]} open={!!solved['5-4b']} color="#4a5a7a" glow="#bfe8ff" />
      <Tag position={[0, 7.6, DOORS4['5-4b'].z + 0.6]} df={12}>{DOORS4['5-4b'].label}</Tag>
      <TwinStatue pos={TARTARIC.pos} cfg={tart} name="Tartaric acid · C2 and C3" meso={!!solved['5-4c']} />
      <Gate world={world} pos={[0, 0, DOORS4['5-4c'].z]} size={[2 * W, 7, 0.8]} open={!!solved['5-4c']} color="#4a5a7a" glow="#bfe8ff" />
      <Tag position={[0, 7.6, DOORS4['5-4c'].z + 0.6]} df={12}>{DOORS4['5-4c'].label}</Tag>
      <EnantiomerShades world={world} spawns={[[5, -96], [-5, -110]]} mirrorX={0} zone={[-118, -92]} active={!!save.hasShield} />

      {/* 5-5 The Resolution Hall */}
      <group position={[POOL.pos[0], 0, POOL.pos[1]]}>
        <mesh position={[0, 0.4, 0]}><boxGeometry args={[5.2, 0.8, 3.2]} /><meshStandardMaterial color="#9aa8c0" metalness={0.3} roughness={0.3} /></mesh>
        {pool === 'split' ? (<>
          <mesh position={[-1.25, 0.82, 0]}><boxGeometry args={[2.4, 0.04, 2.8]} /><meshStandardMaterial color="#ffd060" emissive="#c09020" emissiveIntensity={0.6} /></mesh>
          <mesh position={[1.25, 0.82, 0]}><boxGeometry args={[2.4, 0.04, 2.8]} /><meshStandardMaterial color="#c8e0ff" emissive="#6a9ac0" emissiveIntensity={0.6} /></mesh>
        </>) : <mesh position={[0, 0.82, 0]}><boxGeometry args={[4.9, 0.04, 2.9]} /><meshStandardMaterial color="#e8d8a0" emissive="#8a7a50" emissiveIntensity={0.4} /></mesh>}
        <Tag position={[0, 2.0, 0]} df={11}>{pool === 'split' ? 'two salts: R,R and S,R · they separate' : '(±)-lactic acid · racemic · rotation 0°'}</Tag>
        {[-4, 4].map((x) => <group key={x} position={[x, 0, 0]}><Part model="palace" name="p5_plinth" scale={[0.6, 1, 0.6]} /><mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.25, 0.18, 0.6, 10]} /><meshStandardMaterial color={x < 0 ? '#bfe8ff' : '#ffb0d0'} transparent opacity={0.8} /></mesh><Tag position={[0, 2.3, 0]} df={8}>{x < 0 ? 'methylamine (achiral)' : '(R)-1-phenylethylamine'}</Tag></group>)}
      </group>
      <InvertingKey pos={[-8, 0, -131]} kind="N" />
      <InvertingKey pos={[-4, 0, -131]} kind="P" />
      <group position={[RECEPTOR.pos[0], 2.6, RECEPTOR.pos[1]]}>{!solved['5-5c'] && <LockFace place={lockPlace['5-5c']} read={!!read['5-5c']} rank={lockRank('5-5c')} want="S" solved={false} />}<Tag position={[0, 2.2, 0]} df={11}>The Receptor · fits (S)-ibuprofen only</Tag></group>
      <EnantiomerShades world={world} spawns={[[4, -122], [-4, -136]]} mirrorX={0} zone={[-140, -118]} active={!!save.hasShield && !!solved['5-4c']} />
      <Chest world={world} pos={[0, 0, -137]} big opened={!!solved['t5-bosskey']} show={bossKeyShown} onOpen={() => openChest('t5-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -140]} size={[2 * W, 7, 0.8]} open={!!solved['t5-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS5).map(([id, st]) => (
        <Station key={id} world={world} pos={st.pos} label={id === '5-2polar' && solved['5-2'] ? null : st.label} enabled={!(id === '5-2polar' && solved['5-2'])} solved={id === '5-2polar' ? !!solved['5-2'] : !!solved[id]} onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id === '5-2polar' ? '5-2' : id); if (id === '5-2polar') { sfx('open'); toast('The window blazes. A little chest by the door.', 'good', 3000) } }} />
      ))}

      {/* boss arena */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = ((k + 0.5) / 8) * Math.PI * 2; return <Torch key={'b' + k} pos={[Math.cos(a) * 12.4, 0, KING.center[2] + Math.sin(a) * 15.5]} color="#e8f0ff" /> })}
      {[-1, 1].map((s) => <group key={s} position={[s * 12.8, 0, -160]} rotation={[0, -s * Math.PI / 2, 0]} scale={2}><Part model="palace" name="p5_mirror" /></group>)}
      <RacemicKing world={world} center={KING.center} active={bossOn && !solved.boss5} onDefeated={bossDown} />
      <Shard show={!!solved.boss5 && (save.shards || 0) < 5} pos={KING.center} />
      <Motes count={180} area={[20, 7, 180]} center={[0, 0.3, -85]} color="#e8f0ff" size={0.06} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Palace({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'palace' ? ROOMS5.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#1a2236" camDist={6.2}>
      {(world) => <PalaceLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
