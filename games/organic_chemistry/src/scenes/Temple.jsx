import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Sky } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Gate, Station, Torch, Motes, HookTarget, Chest } from '../engine/kit'
import { ImpPack, CrabPack } from '../actors/Critters'
import { Ferrymen } from '../actors/Coastfolk'
import Hydra from '../actors/Hydra'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { W2 as W, ROOMS2, STATIONS2, LADDER, BUOYS, GOALS2, HYDRA } from '../data/dungeon2'

// Dungeon 2 — The Tide Temple (Chapter 2, Polar Covalent Bonds; Acids and Bases).
// Ocarina-style: a Dungeon Map and Compass in chests, a small key for a locked door, the dungeon item
// (the Curved-Arrow Hookshot) in a big chest, then a Boss Key and the boss. The sea runs under it all.

const has = (id) => !!getState().save.solved[id]
const ghost = { addFloor: () => 0, remove: () => {} } // visual-only Slab
const STONE = '#6f8590', STONE_DARK = '#4c5f6a'
const ARENA = { x: 13, z: [-140, -176] }

function Sea() {
  const geo = useMemo(() => new THREE.PlaneGeometry(110, 210, 44, 84), [])
  const base = useMemo(() => geo.attributes.position.array.slice(), [geo])
  useFrame(({ clock }) => {
    const p = geo.attributes.position, t = clock.elapsedTime
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(base[i * 3] * 0.35 + t * 1.2) * 0.12 + Math.cos(base[i * 3 + 1] * 0.25 + t * 0.9) * 0.1)
    p.needsUpdate = true
  })
  return <mesh geometry={geo} position={[0, -0.55, -85]} rotation={[-Math.PI / 2, 0, 0]}><meshStandardMaterial color="#1b7290" roughness={0.15} metalness={0.2} transparent opacity={0.92} /></mesh>
}

/** A row of temple pillars: red for electron-rich (δ−), blue for electron-poor (δ+), like the book's potential maps. */
function Pillars({ z0, z1, x = W - 0.4, y = 0, step = 4 }) {
  const items = []
  for (let z = z0 - 1; z > z1; z -= step) items.push(z)
  return (
    <group>
      {items.map((z, i) => [-1, 1].map((s) => (
        <group key={i + '-' + s} position={[s * x, y, z]}>
          <mesh position={[0, 3, 0]} castShadow><cylinderGeometry args={[0.42, 0.48, 6, 12]} /><meshStandardMaterial color={(i + (s > 0 ? 1 : 0)) % 2 ? '#c0394b' : '#2f6fd8'} roughness={0.55} /></mesh>
          <mesh position={[0, 6.15, 0]}><boxGeometry args={[1.2, 0.3, 1.2]} /><meshStandardMaterial color="#d8d0bc" roughness={0.8} /></mesh>
          <mesh position={[0, 0.12, 0]}><boxGeometry args={[1.1, 0.24, 1.1]} /><meshStandardMaterial color="#d8d0bc" roughness={0.8} /></mesh>
        </group>
      )))}
    </group>
  )
}

/** Side walls for a stretch of the temple. Low (so the camera sees over), with a cornice. */
function Walls({ world, z0, z1, half = W, h = 7, y = 0 }) {
  const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2
  useEffect(() => {
    const a = world.addSolid([-half - 2, y - 4, Math.min(z0, z1)], [-half, y + h, Math.max(z0, z1)])
    const b = world.addSolid([half, y - 4, Math.min(z0, z1)], [half + 2, y + h, Math.max(z0, z1)])
    return () => { world.remove(a); world.remove(b) }
  }, [world])
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * (half + 1), y + h / 2 - 2, zc]} receiveShadow><boxGeometry args={[2, h + 4, len]} /><meshStandardMaterial color={STONE_DARK} roughness={0.95} /></mesh>
          <mesh position={[s * (half + 1), y + h + 0.15, zc]}><boxGeometry args={[2.6, 0.3, len]} /><meshStandardMaterial color="#d8d0bc" roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** A floating molecule statue for the Tug-of-War Hall: shows its bond dipoles and whether they cancel. */
function DipoleStatue({ pos, kind, on }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.rotation.y = clock.elapsedTime * 0.4 })
  const red = <meshStandardMaterial color="#d8423a" roughness={0.4} />
  const white = <meshStandardMaterial color="#f2f2f2" roughness={0.4} />
  const black = <meshStandardMaterial color="#3a3a3a" roughness={0.4} />
  const arrow = (from, to, key) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a), l = d.length()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
    return (
      <group key={key} position={a.clone().add(b).multiplyScalar(0.5)} quaternion={q}>
        <mesh><cylinderGeometry args={[0.04, 0.04, l * 0.8, 6]} /><meshBasicMaterial color="#ffe08a" toneMapped={false} /></mesh>
        <mesh position={[0, l * 0.45, 0]}><coneGeometry args={[0.12, 0.25, 8]} /><meshBasicMaterial color="#ffe08a" toneMapped={false} /></mesh>
      </group>
    )
  }
  const a = (104.5 / 2) * Math.PI / 180
  return (
    <group position={pos}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.7, 0.85, 1, 10]} /><meshStandardMaterial color="#d8d0bc" roughness={0.8} /></mesh>
      <group ref={g} position={[0, 2.6, 0]}>
        {kind === 'water' ? (
          <group>
            <mesh>{red}<sphereGeometry args={[0.5, 20, 16]} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[Math.sin(s * a) * 0.75, -Math.cos(a) * 0.75, 0]}>{white}<sphereGeometry args={[0.3, 16, 12]} /></mesh>)}
            {on && arrow([0, -0.9, 0], [0, 0.9, 0], 'net')}
          </group>
        ) : (
          <group>
            <mesh>{black}<sphereGeometry args={[0.42, 20, 16]} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.95, 0, 0]}>{red}<sphereGeometry args={[0.45, 18, 14]} /></mesh>)}
            {on && [-1, 1].map((s) => arrow([s * 0.2, 0.7, 0], [s * 1.1, 0.7, 0], 'b' + s))}
          </group>
        )}
      </group>
      <Html position={[0, 4.4, 0]} center distanceFactor={11}><div className="tag3d">{kind === 'water' ? 'H₂O · bent · μ = 1.85 D' : 'CO₂ · linear · μ = 0 D'}</div></Html>
    </group>
  )
}

/** A floating platform under a Lewis-acid buoy (visual bob; the floor itself stays put). */
function Buoy({ b }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.position.y = Math.sin(clock.elapsedTime * 1.4 + b.pos[0]) * 0.05 })
  const P = b.platform
  return (
    <group ref={g}>
      {P && <mesh position={[(P[0] + P[2]) / 2, -0.05, (P[1] + P[3]) / 2]} castShadow receiveShadow><boxGeometry args={[P[2] - P[0], 0.5, P[3] - P[1]]} /><meshStandardMaterial color="#8a6440" roughness={0.9} /></mesh>}
      {!P && <mesh position={[b.pos[0], -0.25, b.pos[2]]}><cylinderGeometry args={[0.55, 0.65, 0.6, 12]} /><meshStandardMaterial color={b.acid ? '#d8b060' : '#8a8a8a'} roughness={0.6} /></mesh>}
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

/** "You got …!" — the item fanfare, Ocarina style. */
async function gotItem(name, lines) {
  sfx('shard')
  await say([{ who: '', text: `You got ${name}!` }, ...lines])
}

function TempleLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)

  // ---- the map: Ocarina rules. Without the Dungeon Map only rooms you've been in show; without the
  // Compass there is no star.
  useEffect(() => {
    world.map = {
      floor: '#8fa3ad', wall: '#2c3a42', pit: '#14506a',
      labels: ROOMS2.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => {
        const sv = getState().save
        if (sv.solved['t2-map']) return null
        const seen = sv.t2seen || {}
        return ROOMS2.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]])
      },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t2-compass']) return null
        const g = GOALS2.find((x) => !sv.solved[x.id])
        if (g) return g
        if (sv.shards < 2) return { pos: [0, -146], label: 'Take the Bond Shard' }
        return { pos: [0, 5], label: 'Ride the ferry home' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    world.killY = -3
    playMusic('temple')
    const f = []
    const fl = (x0, z0, x1, z1, y = 0) => f.push(world.addFloor(x0, z0, x1, z1, y))
    fl(-3, 4, 3, 9) // ferry landing
    fl(-W, -62, W, 4) // entrance → 2-3 near side
    fl(-W, -84, W, -72) // 2-3 far side
    // the pKa Ladder: tiers joined by short stairs behind each water lock
    LADDER.tiers.forEach((t, i) => {
      const zTop = i === 0 ? -84 : LADDER.locks[i - 1].z - 1.6
      fl(-W, t.z[1], W, zTop, t.y)
      if (i > 0) {
        const lz = LADDER.locks[i - 1].z, py = LADDER.tiers[i - 1].y
        fl(-W, lz - 0.8, W, lz, py + 0.4)
        fl(-W, lz - 1.6, W, lz - 0.8, py + 0.8)
      }
    })
    fl(-W, -121, W, -116) // Lewis Docks, near shore
    BUOYS.forEach((b) => b.platform && fl(b.platform[0], b.platform[1], b.platform[2], b.platform[3], 0.2))
    fl(-W, -140, W, -134) // far shore
    // boss arena: a walkway around the Hydra's pool
    const P = HYDRA.pool
    fl(-ARENA.x, P.z[1], ARENA.x, -140); fl(-ARENA.x, ARENA.z[1], ARENA.x, P.z[0])
    fl(-ARENA.x, P.z[0], P.x[0], P.z[1]); fl(P.x[1], P.z[0], ARENA.x, P.z[1])
    // rails at the landing, the arena's walls
    const s = [
      world.addSolid([-W, 0, 4], [-3, 1.2, 4.6]), world.addSolid([3, 0, 4], [W, 1.2, 4.6]),
      world.addSolid([-3.6, 0, 4], [-3, 1.2, 9]), world.addSolid([3, 0, 4], [3.6, 1.2, 9]), world.addSolid([-3.6, 0, 9], [3.6, 1.2, 9.6]),
      world.addSolid([-ARENA.x - 2, -4, ARENA.z[1]], [-ARENA.x, 8, ARENA.z[0]]), world.addSolid([ARENA.x, -4, ARENA.z[1]], [ARENA.x + 2, 8, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -4, ARENA.z[1] - 2], [ARENA.x + 2, 8, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -4, -141], [-W, 8, -139]), world.addSolid([W, -4, -141], [ARENA.x, 8, -139]),
    ]
    // room checkpoints, titles, "rooms seen" for the map, and a word from Pi the first time
    const HINTS = {
      '2-1': 'Tug-of-War Hall. Some molecules pull their electrons one way overall, and some cancel out.',
      '2-2': 'The Hall of Accounts. Every atom here keeps careful books on its electrons.',
      '2-3': 'Tidepools! The water ripples between shapes but never really changes. Hmm…',
      '2-4': 'A ladder of water locks. Each one only opens if the proton goes the right way.',
      '2-5': 'The Lewis Docks. Your hookshot is an electron pair looking for an empty orbital. Only some buoys will take it.',
    }
    const t = ROOMS2.map((r) => world.addTrigger([-ARENA.x, -2, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t2seen || {}
      saveGame({ checkpoint: { scene: 'temple', room: r.id }, t2seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4200), 400)
    }))
    const bossT = world.addTrigger([-ARENA.x, 0, -151], [ARENA.x, 6, -143], () => startBoss())
    // the tablet, the ferry home, the locked doors
    const ia = [
      world.addInteractable({ pos: [5, 0, -11], radius: 2.2, label: 'Read the tablet', onInteract: () => readTablet() }),
      world.addInteractable({ pos: [0, 0, 7.5], radius: 2.4, label: 'Ride the ferry back to the coast', onInteract: () => rideHome() }),
      world.addInteractable({ pos: [0, 0, -52.8], radius: 2.2, label: () => (has('t2-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -138.8], radius: 2.4, label: () => (has('t2-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlockBossDoor() }),
    ]
    const ts = world.addSolid([4.4, 0, -11.4], [5.6, 1.6, -10.6])
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS2.find((x) => x.id === room); if (r) world.player.teleport(r.id === '2-4' ? [0, 0, -86] : r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...s, ...t, bossT, ...ia, ts].forEach((i) => world.remove(i)) }
  }, [world])

  const readTablet = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: 'Tablet', text: 'BY ORDER OF MALRADIX: A molecule is exactly the one drawing you make of it. Its electrons sit still, right where the lines put them. Any other teaching is forbidden.' },
      { who: 'Pi', text: "Electrons sitting still? That doesn't sound right… The Ferrymen said we'd learn better out here." },
      { who: 'Pi', text: 'Look — chests! Ocarina rules: find the Dungeon Map and the Compass and the temple stops being a maze.' },
    ])
    markSolved('t2-tablet')
    busy.current = false
  }

  const rideHome = async () => {
    if (busy.current) return
    busy.current = true
    await say([{ who: 'Brønsted', text: 'Heading back to the coast? Hop in.' }])
    busy.current = false
    onExit('coast', { scene: 'coast', at: 'dock' })
  }

  const unlockDoor = async () => {
    if (has('t2-door')) return
    if (!getState().save.t2key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t2key: false })
    markSolved('t2-door'); sfx('open')
    toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = async () => {
    if (has('t2-bossdoor')) return
    if (!has('t2-bosskey')) { toast('A huge lock, sealed with a carbonate crest. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    if (!has('2-5')) { toast('The floor before the door is flooded. Raise the hydrogen-bond bridge first.', 'warn', 3000); return }
    markSolved('t2-bossdoor'); sfx('open')
    toast('The Boss Key turns. Something huge stirs beyond the door…', 'good', 3200)
  }

  const useStation = async (id) => {
    const st = STATIONS2[id]
    if (has(id)) { toast('Already solved.', 'info', 1200); return }
    const ok = await openPanel(st.panel, st.props)
    if (!ok) return
    markSolved(id); sfx('open')
    const after = {
      '2-1': [{ who: 'Pi', text: 'The bent molecules pull one way and stay polar; the symmetric ones cancel. The gate is open!' }],
      '2-2': [{ who: 'Pi', text: 'Every account balanced! Look — a small chest just appeared by the door.' }],
      '2-3': [{ who: 'Pi', text: "The pools went still! The arrows only moved electrons — the atoms never moved. So the 'two drawings' were one molecule all along." }],
      '2-4c': [{ who: 'Pi', text: 'All three locks open. A big chest at the top!' }],
      '2-5': [{ who: 'Pi', text: 'A bridge of hydrogen bonds — H on O or N reaching for a lone pair. Now the boss door!' }],
    }[id]
    if (after) setTimeout(() => say(after), 300)
  }

  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id)
    if (id === 't2-map') await gotItem('the Dungeon Map', [{ who: 'Pi', text: 'Press M: now the whole temple shows up, even rooms we haven\'t been to.' }])
    if (id === 't2-compass') await gotItem('the Compass', [{ who: 'Pi', text: 'With the Compass, the map shows a star where we need to go next.' }])
    if (id === 't2-key') { saveGame({ t2key: true }); await gotItem('a Small Key', [{ who: 'Pi', text: 'It fits the locked door at the end of this hall.' }]) }
    if (id === 't2-hookshot') {
      saveGame({ hasHookshot: true })
      await gotItem('the Curved-Arrow Hookshot', [
        { who: 'Pi', text: "In the book, a curved arrow shows a pair of electrons moving: it starts at the electrons and points to where they go." },
        { who: 'Pi', text: 'This one works the same way. It flies from your electron pair to anything electron-poor, marked with a blue ring, and pulls you over.' },
        { who: 'Pi', text: 'Press Q to fire it. Aim with your facing, or lock on with Tab.' },
      ])
      toast('Got the Curved-Arrow Hookshot! Press Q at a blue ring.', 'good', 4200)
    }
    if (id === 't2-bosskey') { saveGame({ t2bossKey: true }); await gotItem('the Boss Key', [{ who: 'Pi', text: 'Now hook across the channel to the Lewis Docks. The boss door is on the far side.' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss2') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -144]
    await say([
      { who: 'Pi', text: "It's the Resonance Hydra! Three heads — and each one is a different drawing of the carbonate ion, with its C=O on a different oxygen." },
      { who: 'Pi', text: 'Block its water spit with Shift, and roll away from the bites.' },
      { who: 'Pi', text: "Hitting one head won't work — none of the drawings is the real ion. When the heads tire, hookshot all three, and the real thing will show itself!" },
    ])
    busy.current = false
    setBossOn(true)
  }

  const bossDown = async () => {
    markSolved('boss2')
    playMusic('temple')
    await say([
      { who: 'Pi', text: 'The three forms collapsed into one! The real carbonate ion was never any single drawing. It was the hybrid of all three all along.' },
      { who: 'Pi', text: 'Look — the Bond Shard!' },
    ])
  }

  const takeShard = async () => {
    if (getState().save.shards >= 2 || busy.current) return
    busy.current = true
    sfx('shard')
    await say([{ who: 'Lowry', text: 'Before you take that shard, little carbon — one question from the Ferrymen.' }])
    const ok = await openPanel('resonanceCheck', {})
    if (!ok) { await say([{ who: 'Pi', text: "Come back when you're ready — the shard isn't going anywhere." }]); busy.current = false; return }
    saveGame({ shards: 2, checkpoint: { scene: 'coast', at: 'dock' } })
    setState({ objective: 'Bond Shard 2 of 12 recovered' })
    await say([
      { who: 'Princess Octavia', text: 'Kai… the second shard. I can hear the sea through it.' },
      { who: 'Princess Octavia', text: "Malradix wants everyone to believe a molecule is one fixed picture. You've shown it's more than any single drawing." },
      { who: 'Lowry', text: 'And you sent every proton the right way. Come on, little carbon — the boat is waiting.' },
      { who: 'Pi', text: 'Two down, ten to go!' },
    ])
    busy.current = false
    onExit('credits2')
  }

  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -146], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss2 && getState().save.shards < 2)
    tick()
    const t = setInterval(tick, 300)
    return () => { clearInterval(t); world.remove(id) }
  }, [world])

  const P = HYDRA.pool
  return (
    <group>
      <Sky sunPosition={[30, 6, -100]} turbidity={9} rayleigh={2.6} mieCoefficient={0.01} />
      <hemisphereLight args={['#cfe6ff', '#3a5a66', 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[20, 40, -60]} intensity={1.25} color="#ffe2b8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <fog attach="fog" args={['#bcd6e0', 40, 120]} />
      <Sea />

      {/* ---- floors (visual) */}
      <Slab world={ghost} x0={-3} z0={4} x1={3} z1={9} color="#8a6440" thick={1.2} />
      <Slab world={ghost} x0={-W} z0={4} x1={W} z1={-62} color={STONE} thick={2} />
      <Slab world={ghost} x0={-W} z0={-72} x1={W} z1={-84} color={STONE} thick={2} />
      {LADDER.tiers.map((t, i) => (
        <group key={i}>
          <Slab world={ghost} x0={-W} z0={i === 0 ? -84 : LADDER.locks[i - 1].z - 1.6} x1={W} z1={t.z[1]} y={t.y} color={i % 2 ? '#7a909a' : STONE} thick={t.y + 2} />
          {i > 0 && [0.4, 0.8].map((dy, k) => <Slab key={k} world={ghost} x0={-W} z0={LADDER.locks[i - 1].z - k * 0.8} x1={W} z1={LADDER.locks[i - 1].z - (k + 1) * 0.8} y={LADDER.tiers[i - 1].y + dy} color="#d8d0bc" thick={LADDER.tiers[i - 1].y + dy + 2} />)}
        </group>
      ))}
      <Slab world={ghost} x0={-W} z0={-116} x1={W} z1={-121} color={STONE} thick={2} />
      <Slab world={ghost} x0={-W} z0={-134} x1={W} z1={-140} color={STONE} thick={2} />
      <Slab world={ghost} x0={-ARENA.x} z0={-140} x1={ARENA.x} z1={P.z[1]} color="#5f7480" thick={2} />
      <Slab world={ghost} x0={-ARENA.x} z0={P.z[0]} x1={ARENA.x} z1={ARENA.z[1]} color="#5f7480" thick={2} />
      <Slab world={ghost} x0={-ARENA.x} z0={P.z[1]} x1={P.x[0]} z1={P.z[0]} color="#5f7480" thick={2} />
      <Slab world={ghost} x0={P.x[1]} z0={P.z[1]} x1={ARENA.x} z1={P.z[0]} color="#5f7480" thick={2} />
      {/* the pool glows */}
      <mesh position={[0, -0.4, (P.z[0] + P.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[P.x[1] - P.x[0], P.z[1] - P.z[0]]} /><meshBasicMaterial color="#2fb8c8" transparent opacity={0.5} /></mesh>
      <pointLight position={[0, 1, -158]} color="#43e6f5" intensity={8} distance={16} />

      {/* ---- walls and pillars */}
      <Walls world={world} z0={4} z1={-84} />
      <Walls world={world} z0={-84} z1={-110} h={10} />
      <Walls world={world} z0={-116} z1={-140} />
      <Walls world={world} z0={-140} z1={-176} half={ARENA.x} h={8} />
      <Pillars z0={4} z1={-62} /><Pillars z0={-72} z1={-84} /><Pillars z0={-116} z1={-121} step={3} /><Pillars z0={-134} z1={-140} step={3} />
      <Pillars z0={-140} z1={-176} x={ARENA.x - 0.6} step={4.5} />

      {/* ---- entrance */}
      <Ferrymen position={[0, -0.2, 11]} rotation={[0, Math.PI, 0]} />
      <Html position={[0, 3.6, 11]} center distanceFactor={11}><div className="tag3d">Brønsted & Lowry</div></Html>
      <group position={[5, 0, -11]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3644" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Html position={[0, 2.1, 0]} center distanceFactor={10}><div className="tag3d">Malradix's decree</div></Html>
      </group>
      <Chest world={world} pos={[-6, 0, -10]} rotY={Math.PI / 2} opened={!!solved['t2-map']} onOpen={() => openChest('t2-map')} />
      <Torch pos={[-6, 0, -2]} color="#7ff4ff" /><Torch pos={[6, 0, -2]} color="#7ff4ff" />
      <Html position={[0, 6, -15]} center distanceFactor={16}><div className="tag3d">The Tide Temple</div></Html>

      {/* ---- 2-1 Tug-of-War Hall */}
      <DipoleStatue pos={[-5, 0, -24]} kind="water" on={!!solved['2-1']} />
      <DipoleStatue pos={[5, 0, -24]} kind="co2" on={!!solved['2-1']} />
      <Gate world={world} pos={[0, 0, -36]} size={[2 * W, 7, 0.8]} open={!!solved['2-1']} />

      {/* ---- 2-2 Hall of Accounts */}
      <Chest world={world} pos={[6, 0, -40]} rotY={-Math.PI / 2} opened={!!solved['t2-compass']} onOpen={() => openChest('t2-compass')} />
      <Chest world={world} pos={[3, 0, -51]} rotY={Math.PI} opened={!!solved['t2-key']} show={!!solved['2-2']} onOpen={() => openChest('t2-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -54]} size={[2 * W, 7, 0.8]} open={!!solved['t2-door']} color="#5a4020" glow="#ffcf6a" />
      <Html position={[0, 7.8, -53.6]} center distanceFactor={13}><div className="tag3d">{solved['t2-door'] ? 'unlocked' : 'locked · small key'}</div></Html>

      {/* ---- 2-3 Resonance Tidepools: the Hookshot, then hook across the water */}
      <ImpPack world={world} spawns={[[-4, -58], [4, -59], [0, -60.5]]} active />
      <Chest world={world} pos={[0, 0, -57.5]} rotY={Math.PI} big opened={!!solved['t2-hookshot']} onOpen={() => openChest('t2-hookshot')} label="Open the big chest" />
      <HookTarget world={world} pos={[-4, 0, -73.2]} land={[-4, 0, -72.6]} label="δ+" />
      <HookTarget world={world} pos={[4, 0, -73.2]} land={[4, 0, -72.6]} label="δ+" />
      <HookTarget world={world} pos={[0, 0, -60.8]} land={[0, 0, -61.3]} />
      <mesh position={[0, -0.42, -67]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, 10]} /><meshBasicMaterial color="#43e6f5" transparent opacity={0.25} /></mesh>
      <Html position={[-4, 3.2, -67]} center distanceFactor={12}><div className="tag3d">acetate · form A</div></Html>
      <Html position={[4, 3.2, -67]} center distanceFactor={12}><div className="tag3d">acetate · form B</div></Html>
      <Html position={[0, 4.2, -67]} center distanceFactor={12}><div className="tag3d">↔</div></Html>
      <Gate world={world} pos={[0, 0, -84]} size={[2 * W, 7, 0.8]} open={!!solved['2-3']} />

      {/* ---- 2-4 the pKa Ladder */}
      {LADDER.locks.map((l, i) => (
        <group key={i}>
          <Gate world={world} pos={[0, LADDER.tiers[i].y, l.z]} size={[2 * W, 5, 0.8]} open={!!solved[l.needs]} color="#1f6a8a" glow="#7ff4ff" />
          <Html position={[0, LADDER.tiers[i].y + 6, l.z]} center distanceFactor={12}><div className="tag3d">water lock {['I', 'II', 'III'][i]}</div></Html>
        </group>
      ))}
      <Chest world={world} pos={[-4, 3.6, -108]} rotY={Math.PI / 2} big opened={!!solved['t2-bosskey']} onOpen={() => openChest('t2-bosskey')} label="Open the big chest" />
      <HookTarget world={world} pos={[0, 0, -117.4]} land={[0, 0, -118.2]} enabled={!!solved['t2-bosskey']} label="to the docks" />
      <HookTarget world={world} pos={[3, 3.6, -108.6]} land={[3, 3.6, -107.6]} />

      {/* ---- 2-5 the Lewis Docks */}
      {BUOYS.map((b) => (
        <group key={b.id}>
          <Buoy b={b} />
          <HookTarget world={world} pos={b.pos} land={b.land} post color={b.acid ? '#4aa8ff' : '#8aa0b4'} label={b.label} accepts={() => (b.acid ? true : b.why)} />
        </group>
      ))}
      <HbBridge world={world} raised={!!solved['2-5']} />
      <CrabPack world={world} spawns={[[5.5, -137.5], [-6.5, -137]]} active />
      <Gate world={world} pos={[0, 0, -140]} size={[2 * W, 7, 0.8]} open={!!solved['t2-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {/* ---- stations */}
      {Object.entries(STATIONS2).map(([id, st]) => (
        <Station key={id} world={world} pos={st.pos} label={solved[id] ? null : st.label} enabled={!solved[id]} solved={!!solved[id]} onUse={() => useStation(id)} />
      ))}

      {/* ---- boss */}
      {[0, 1, 2, 3, 4, 5].map((k) => { const a = ((k + 0.5) / 6) * Math.PI * 2; return <Torch key={k} pos={[Math.cos(a) * 11.5, 0, -158 + Math.sin(a) * 15]} color="#7ff4ff" /> })}
      <Hydra world={world} center={HYDRA.center} pool={HYDRA.pool} active={bossOn && !solved.boss2} onDefeated={bossDown} />
      <Shard show={!!solved.boss2 && save.shards < 2} pos={[0, 0, -146]} />
      <Motes count={160} area={[18, 6, 180]} center={[0, 0.2, -85]} color="#e6fbff" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

/** The hydrogen-bond bridge across the Lewis Docks, raised by the 2-5 trial. */
function HbBridge({ world, raised }) {
  const ref = useRef(), id = useRef(null), h = useRef(raised ? 0 : -3)
  useEffect(() => { id.current = world.addFloor(-1.5, -134, 1.5, -121, 0); return () => world.remove(id.current) }, [world])
  useEffect(() => { world.setEnabled(id.current, raised) }, [raised])
  useFrame((_, dt) => { h.current += ((raised ? 0 : -3) - h.current) * Math.min(1, dt * 2); if (ref.current) { ref.current.position.y = h.current - 0.25; ref.current.visible = h.current > -2.9 } })
  return (
    <group ref={ref} position={[0, -3, -127.5]}>
      <mesh receiveShadow castShadow><boxGeometry args={[3, 0.5, 13]} /><meshStandardMaterial color="#cfe8f0" emissive="#43c8e6" emissiveIntensity={0.25} roughness={0.5} /></mesh>
      {[...Array(6)].map((_, k) => <mesh key={k} position={[0, 0.3, -5.5 + k * 2.2]}><boxGeometry args={[3.1, 0.08, 0.2]} /><meshBasicMaterial color="#ffe08a" toneMapped={false} /></mesh>)}
    </group>
  )
}

export default function Temple({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'temple' ? ROOMS2.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 6]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#bcd6e0" camDist={6.2}>
      {(world) => <TempleLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
