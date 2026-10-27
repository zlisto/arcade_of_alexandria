import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Scatter, scatter, Station, Signpost, Motes, Tag } from '../engine/kit'
import WolfPack from '../actors/WolfPack'
import { ImpPack } from '../actors/Critters'
import { Iupaca } from '../actors/IupacaModel'
import EclipsedBats from '../actors/EclipsedBats'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { preloadModels } from '../engine/models'

// The Chain Forest — World 3's route and prep. Giant trees whose roots zigzag like carbon chains,
// lanterns, green mist. Archivist Iupaca guards the library tower; she opens the root gate into the
// Chain Labyrinth once Kai can name the first ten alkanes (§3.2).

preloadModels('creatures3', 'critters')
const HALF = 46
const TOWER = [0, 0, -24]
const IUPACA = [2.6, 0, -17.4]
const SHELF = [-2.8, 0, -17.6]
const GATE_Z = -44

/** A giant tree: a fat trunk, buttress roots that zigzag like a carbon chain, a dark crown. */
function GiantTree({ pos, s = 1, world }) {
  useEffect(() => {
    const id = world.addSolid([pos[0] - 1.3 * s, 0, pos[2] - 1.3 * s], [pos[0] + 1.3 * s, 14, pos[2] + 1.3 * s])
    return () => world.remove(id)
  }, [world])
  const roots = useMemo(() => [0, 1, 2, 3, 4].map((k) => (k / 5) * Math.PI * 2 + s), [s])
  return (
    <group position={pos} scale={s}>
      <mesh position={[0, 6, 0]} castShadow><cylinderGeometry args={[1.1, 1.6, 12, 10]} /><meshStandardMaterial color="#4a3426" roughness={0.95} /></mesh>
      {roots.map((a, k) => (
        <group key={k} rotation={[0, a, 0]}>
          {/* a root of four zigzag "carbons" running out from the trunk */}
          {[0, 1, 2, 3].map((j) => <mesh key={j} position={[1.5 + j * 0.9, 0.35 + (j % 2) * 0.25, 0]} castShadow><sphereGeometry args={[0.38 - j * 0.05, 10, 8]} /><meshStandardMaterial color="#5a3e2c" roughness={0.9} /></mesh>)}
          {[0, 1, 2].map((j) => <mesh key={'b' + j} position={[1.95 + j * 0.9, 0.48, 0]} rotation={[0, 0, j % 2 ? 0.27 : -0.27]}><cylinderGeometry args={[0.16, 0.18, 0.95, 6]} /><meshStandardMaterial color="#5a3e2c" roughness={0.9} /></mesh>)}
        </group>
      ))}
      <mesh position={[0, 13.5, 0]} castShadow><dodecahedronGeometry args={[4.5, 0]} /><meshStandardMaterial color="#1f3a2c" roughness={1} flatShading /></mesh>
      <mesh position={[2.2, 11.5, 1]} castShadow><dodecahedronGeometry args={[3, 0]} /><meshStandardMaterial color="#244432" roughness={1} flatShading /></mesh>
    </group>
  )
}

/** Hanging lantern on a branch (warm light in the teal gloom). */
function Lantern({ pos }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 1.2 + pos[0]) * 0.08 })
  return (
    <group position={pos}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.02, 0.02, 1.2, 4]} /><meshStandardMaterial color="#2a2420" /></mesh>
      <group ref={g}>
        <mesh><cylinderGeometry args={[0.18, 0.22, 0.4, 6]} /><meshStandardMaterial color="#ffd08a" emissive="#ffb04a" emissiveIntensity={1.6} toneMapped={false} /></mesh>
        <mesh position={[0, 0.25, 0]}><coneGeometry args={[0.24, 0.16, 6]} /><meshStandardMaterial color="#3a2a1a" metalness={0.5} /></mesh>
      </group>
      <pointLight position={[0, -0.2, 0]} color="#ffb04a" intensity={3} distance={9} />
    </group>
  )
}

/** A carbon-chain root arching over the path: a zigzag of carbons, like the labyrinth's own walls. */
function ChainArch({ z, w = 9 }) {
  const n = 9
  return (
    <group position={[0, 0, z]}>
      {[...Array(n)].map((_, i) => {
        const u = i / (n - 1), x = -w + u * 2 * w, y = Math.sin(u * Math.PI) * 6 + (i % 2) * 0.5
        return <mesh key={i} position={[x, y, 0]} castShadow><sphereGeometry args={[0.45, 12, 10]} /><meshStandardMaterial color="#5a3e2c" emissive="#1a3a2a" emissiveIntensity={0.3} roughness={0.85} /></mesh>
      })}
      {[...Array(n - 1)].map((_, i) => {
        const u0 = i / (n - 1), u1 = (i + 1) / (n - 1)
        const a = new THREE.Vector3(-w + u0 * 2 * w, Math.sin(u0 * Math.PI) * 6 + (i % 2) * 0.5, 0), b = new THREE.Vector3(-w + u1 * 2 * w, Math.sin(u1 * Math.PI) * 6 + ((i + 1) % 2) * 0.5, 0)
        const m = a.clone().add(b).multiplyScalar(0.5), d = b.clone().sub(a)
        return <mesh key={'b' + i} position={m} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())}><cylinderGeometry args={[0.18, 0.18, d.length(), 6]} /><meshStandardMaterial color="#4a3426" roughness={0.9} /></mesh>
      })}
      {[...Array(n)].map((_, i) => i % 3 === 1 && <mesh key={'g' + i} position={[-w + (i / (n - 1)) * 2 * w, Math.sin((i / (n - 1)) * Math.PI) * 6 - 0.6, 0]}><sphereGeometry args={[0.12, 8, 6]} /><meshBasicMaterial color="#7ff4d8" toneMapped={false} /></mesh>)}
    </group>
  )
}

/** Decane: a ten-carbon root lying across the path where Iupaca stops you. */
function DecaneRoot() {
  return (
    <group position={[0, 0, -12.2]}>
      {[...Array(10)].map((_, i) => <mesh key={i} position={[-5.4 + i * 1.2, 0.22, (i % 2) * 0.7 - 0.35]} castShadow><sphereGeometry args={[0.32, 10, 8]} /><meshStandardMaterial color="#2a2420" emissive="#3affc0" emissiveIntensity={0.35} roughness={0.6} /></mesh>)}
      {[...Array(9)].map((_, i) => <mesh key={'b' + i} position={[-4.8 + i * 1.2, 0.2, 0]} rotation={[0, i % 2 ? 0.53 : -0.53, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 1.38, 6]} /><meshStandardMaterial color="#5a3e2c" roughness={0.9} /></mesh>)}
    </group>
  )
}

function Tower({ world, lit }) {
  useEffect(() => { const id = world.addSolid([TOWER[0] - 4.2, 0, TOWER[2] - 4.2], [TOWER[0] + 4.2, 30, TOWER[2] + 4.2]); return () => world.remove(id) }, [world])
  return (
    <group position={TOWER}>
      {[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[0, 2.6 + k * 4.4, 0]} castShadow><cylinderGeometry args={[3.6 - k * 0.25, 3.9 - k * 0.25, 4.4, 14]} /><meshStandardMaterial color={k % 2 ? '#2e3438' : '#363d42'} roughness={0.9} /></mesh>)}
      {[0, 1, 2, 3, 4].map((k) => <mesh key={'r' + k} position={[0, 4.8 + k * 4.4, 0]}><cylinderGeometry args={[4.1 - k * 0.25, 4.1 - k * 0.25, 0.3, 14]} /><meshStandardMaterial color="#2a2420" roughness={0.9} /></mesh>)}
      <mesh position={[0, 25.5, 0]} castShadow><coneGeometry args={[3.4, 4.5, 14]} /><meshStandardMaterial color="#2a3038" roughness={0.8} /></mesh>
      {/* warm windows all round */}
      {[0, 1, 2, 3].map((k) => [0, 1, 2, 3, 4, 5].map((j) => { const a = (j / 6) * Math.PI * 2 + k * 0.5; const r = 3.65 - k * 0.25; return <mesh key={k + '-' + j} position={[Math.sin(a) * r, 6 + k * 4.4, Math.cos(a) * r]} rotation={[0, a, 0]}><planeGeometry args={[0.5, 0.9]} /><meshStandardMaterial color={k >= 2 && !lit ? '#1a1a1e' : '#ffd08a'} emissive={k >= 2 && !lit ? '#000000' : '#ffb04a'} emissiveIntensity={1.4} toneMapped={false} side={THREE.DoubleSide} /></mesh> }))}
      {/* the door, facing the path */}
      <mesh position={[0, 1.6, 3.85]}><boxGeometry args={[1.8, 3.2, 0.2]} /><meshStandardMaterial color="#5a3a22" roughness={0.8} /></mesh>
      <mesh position={[0, 3.3, 3.9]}><torusGeometry args={[0.9, 0.12, 6, 16, Math.PI]} /><meshStandardMaterial color="#b8904a" metalness={0.8} roughness={0.3} /></mesh>
      <pointLight position={[0, 3, 5]} color="#ffb04a" intensity={4} distance={10} />
      <Tag position={[0, 5.4, 4.2]} df={14}>The Library of Names</Tag>
    </group>
  )
}

/** The root gate into the labyrinth: tangled roots until Iupaca parts them. */
function RootGate({ world, open }) {
  const id = useRef(null), g = useRef(), h = useRef(open ? -6 : 0)
  useEffect(() => { id.current = world.addSolid([-5, 0, GATE_Z - 1], [5, 8, GATE_Z + 1]); return () => world.remove(id.current) }, [world])
  useEffect(() => { world.setEnabled(id.current, !open) }, [open])
  useFrame((_, dt) => { h.current += ((open ? -6 : 0) - h.current) * Math.min(1, dt * 1.5); if (g.current) g.current.position.y = h.current })
  return (
    <group position={[0, 0, GATE_Z]}>
      {/* the archway: two great trunks and a lintel of chain-root */}
      {[-6, 6].map((x) => <mesh key={x} position={[x, 5, 0]} castShadow><cylinderGeometry args={[1.2, 1.6, 10, 10]} /><meshStandardMaterial color="#4a3426" roughness={0.95} /></mesh>)}
      <mesh position={[0, 9.6, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.8, 0.8, 13, 10]} /><meshStandardMaterial color="#4a3426" roughness={0.95} /></mesh>
      <group ref={g}>
        {[...Array(14)].map((_, i) => <mesh key={i} position={[-4.5 + (i % 7) * 1.5, 1 + Math.floor(i / 7) * 3.2 + (i % 2) * 0.8, (i % 3 - 1) * 0.3]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.5]} castShadow><cylinderGeometry args={[0.28, 0.32, 3.6, 6]} /><meshStandardMaterial color="#3e2a1e" roughness={0.95} /></mesh>)}
      </group>
      <pointLight position={[0, 4, 3]} color="#7ff4d8" intensity={open ? 6 : 2} distance={14} />
      <Tag position={[0, 11.4, 0.8]} df={15}>{open ? 'The Chain Labyrinth' : 'The Chain Labyrinth · sealed by roots'}</Tag>
    </group>
  )
}

function ForestLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.iupacaShot)
  const busy = useRef(false)
  const giants = useMemo(() => scatter(26, 77, (r) => {
    const x = (r() - 0.5) * 2 * (HALF - 4), z = (r() - 0.5) * 2 * (HALF - 4)
    if (Math.abs(x) < 9 || Math.hypot(x - TOWER[0], z - TOWER[2]) < 10) return null
    return [x, z, 0.8 + r() * 0.6]
  }), [])
  const small = useMemo(() => scatter(90, 79, (r) => {
    const x = (r() - 0.5) * 2 * (HALF - 2), z = (r() - 0.5) * 2 * (HALF - 2)
    if (Math.abs(x) < 6 || Math.hypot(x - TOWER[0], z - TOWER[2]) < 9) return null
    return [x, z, 0.8 + r() * 0.7, r() * 6]
  }), [])
  const glow = useMemo(() => scatter(40, 83, (r) => [(r() - 0.5) * 80, (r() - 0.5) * 80, 0.12 + r() * 0.14]), [])

  useEffect(() => {
    playMusic('forest')
    const ids = [
      world.addSolid([-HALF - 2, 0, -HALF - 2], [-HALF, 8, HALF + 2]), world.addSolid([HALF, 0, -HALF - 2], [HALF + 2, 8, HALF + 2]),
      world.addSolid([-HALF, 0, -HALF - 2], [HALF, 8, GATE_Z - 1.5]),
      world.addSolid([-HALF, 0, GATE_Z - 1.5], [-5, 8, GATE_Z + 1]), world.addSolid([5, 0, GATE_Z - 1.5], [HALF, 8, GATE_Z + 1]),
      world.addSolid([-HALF, 0, HALF], [-3.5, 8, HALF + 2]), world.addSolid([3.5, 0, HALF], [HALF, 8, HALF + 2]),
    ]
    const back = world.addTrigger([-3.5, 0, HALF - 1.2], [3.5, 4, HALF + 2], () => onExit('field', { scene: 'field', at: 'forest' }))
    const into = world.addTrigger([-5, 0, GATE_Z - 1.5], [5, 4, GATE_Z - 0.2], () => onExit('labyrinth', { scene: 'labyrinth', room: 'entrance' }))
    const iu = world.addInteractable({ pos: IUPACA, radius: 2.6, label: 'Talk to Archivist Iupaca', onInteract: () => talkIupaca() })
    const iuS = world.addSolid([IUPACA[0] - 0.4, 0, IUPACA[2] - 0.4], [IUPACA[0] + 0.4, 1.8, IUPACA[2] + 0.4])
    const near = world.addTrigger([-8, 0, -14], [8, 4, -10], () => { if (!getState().save.metIupaca) talkIupaca() })
    ids.push(back, into, iu, iuS, near)
    if (import.meta.env.DEV) { window.__valence = window.__valence || {}; window.__valence.forest = { talk: () => talkIupaca() } }
    return () => ids.forEach((i) => world.remove(i))
  }, [world])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 3 ? 'Bond Shard 3 recovered: the Chair Fortress awaits (Chapter 4, coming soon)' : !s.metIupaca ? 'Follow the path to the library tower' : !s.t3shelf ? 'Shelve the first ten alkanes for Iupaca' : 'Enter the Chain Labyrinth' })
    if (!s.forestSeen) {
      saveGame({ forestSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'Whoa. Trees made of chains — every root zigzags like a row of carbons!' },
        { who: 'Pi', text: 'Octavia said the archivist here keeps the kingdom\'s names. There\'s a tower up the path.' },
      ]), 800)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#2f4a3a', wall: '#1a2620', pit: '#0e1a14',
      labels: [
        { pos: [0, HALF - 4], text: '↓ Valence Fields', align: 'center' },
        { pos: [TOWER[0], TOWER[2] - 6], text: 'Library of Names', align: 'center' },
        { pos: [0, GATE_Z - 3], text: 'Chain Labyrinth', align: 'center' },
      ],
      goal: () => {
        const s = getState().save
        if (!s.metIupaca) return { pos: [IUPACA[0], IUPACA[2]], label: 'Talk to Archivist Iupaca' }
        if (!s.t3shelf) return { pos: [SHELF[0], SHELF[2]], label: 'Shelve the first ten alkanes' }
        if ((s.shards || 0) < 3) return { pos: [0, GATE_Z - 1], label: 'Enter the Chain Labyrinth' }
        return { pos: [0, HALF - 2], label: 'Back to the Valence Fields' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talkIupaca = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metIupaca) {
      saveGame({ metIupaca: true })
      world.camOverride = { pos: [4.6, 1.7, -10.2], look: [1.4, 1.35, -16.2] }
      setState({ iupacaShot: true })
      await say([
        { who: 'Archivist Iupaca', text: 'Halt. You are standing on decane. Do mind your feet.' },
        { who: 'Archivist Iupaca', text: 'I am Iupaca, keeper of the Library of Names. One compound, one name. I will not hear "that long wiggly one."' },
        { who: 'Archivist Iupaca', text: 'Malradix says every molecule is its own strange beast — too many to ever know. Rubbish. There are families, and there are rules.' },
        { who: 'Archivist Iupaca', text: 'A kingdom that cannot name things cannot find them. That is why he wants my library dark.' },
        { who: 'Archivist Iupaca', text: 'His serpent coiled into my labyrinth. My Newman Lantern lies in the Turning Halls, right below its lair.' },
        { who: 'Archivist Iupaca', text: 'I have tried. That serpent will not hold still for an old woman. I open the roots only for someone who can count carbons.' },
        { who: 'Archivist Iupaca', text: 'Shelve the first ten alkanes at my door, by carbon count. Methane first. Honestly, it is the easiest one.' },
      ])
      world.camOverride = null
      setState({ iupacaShot: false, objective: 'Shelve the first ten alkanes for Iupaca' })
    } else if (!s.t3shelf) {
      await say([{ who: 'Archivist Iupaca', text: 'The shelf is by the door. Meth, eth, prop, but — then the Greek numbers. Pent is five.' }])
    } else {
      await say([{ who: 'Archivist Iupaca', text: getState().save.hasLantern ? 'You have my Lantern. Those bats above my door have not slept in a week. Do something.' : 'The Lantern is in the Turning Halls, past the maze. Mind the bats — like the pair above my door. They hate being eclipsed.' }])
    }
    busy.current = false
  }

  const useShelf = async () => {
    if (getState().save.t3shelf) return
    if (!getState().save.metIupaca) { await talkIupaca(); return }
    const ok = await openPanel('shelf', {})
    if (!ok) return
    saveGame({ t3shelf: true })
    sfx('open')
    setState({ objective: 'Enter the Chain Labyrinth' })
    await say([
      { who: 'Archivist Iupaca', text: 'Adequate.' },
      { who: 'Archivist Iupaca', text: 'The roots will part. In my maze, the parent chain is the longest one. Corners count.' },
      { who: 'Pi', text: '"Adequate"! From her, I think that\'s a hug.' },
    ])
  }

  return (
    <>
      <color attach="background" args={['#14261e']} />
      <fog attach="fog" args={['#1c3a2e', 14, 70]} />
      <hemisphereLight args={['#8fd8c0', '#1a2a20', 0.75]} />
      <ambientLight intensity={0.25} color="#a8ffe0" />
      <directionalLight position={[-20, 40, 10]} intensity={0.9} color="#cfe8d8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} />
      <Slab world={world} x0={-HALF} z0={-HALF} x1={HALF} z1={HALF} color="#2f4a36" />
      {/* the path north to the tower, then on to the root gate */}
      <mesh position={[0, 0.02, 12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[4.2, 70]} /><meshStandardMaterial color="#6a5a44" roughness={1} /></mesh>
      <mesh position={[0, 0.02, -34]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[4.2, 20]} /><meshStandardMaterial color="#6a5a44" roughness={1} /></mesh>
      <mesh position={[0, 0.021, -20]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[5, 7.5, 24]} /><meshStandardMaterial color="#6a5a44" roughness={1} /></mesh>
      {giants.map(([x, z, s], i) => <GiantTree key={i} world={world} pos={[x, 0, z]} s={s} />)}
      <Scatter items={small} kind="tree" color="#244a34" />
      {glow.map(([x, z, r], i) => <mesh key={i} position={[x, r, z]}><sphereGeometry args={[r, 8, 6]} /><meshBasicMaterial color="#7ff4d8" toneMapped={false} /></mesh>)}
      <ChainArch z={30} /><ChainArch z={8} /><ChainArch z={-34} />
      {[[-3, 3.2, 36], [3, 3.2, 22], [-3, 3.2, 0], [3, 3.2, -36], [-3.4, 3.2, -14], [3.4, 3.2, -12]].map((p, i) => <Lantern key={i} pos={p} />)}
      <Tower world={world} lit={(save.shards || 0) >= 3} />
      <Iupaca position={IUPACA} rotation={[0, -0.5, 0]} />
      {!shot && <Tag position={[IUPACA[0], 2.4, IUPACA[2]]} df={8}>Archivist Iupaca</Tag>}
      <Station world={world} pos={SHELF} label={save.t3shelf ? null : 'Shelve the first ten alkanes'} enabled={!save.t3shelf} solved={!!save.t3shelf} onUse={useShelf} />
      <RootGate world={world} open={!!save.t3shelf} />
      <DecaneRoot />
      {/* the bats above Iupaca's door: out of reach until Kai has the Lantern — then a little secret */}
      <EclipsedBats world={world} roosts={[[0, -19.2]]} decor active saved={save.t3forestBats ? [180] : [0]} onSleep={() => { if (!getState().save.t3forestBats) { saveGame({ t3forestBats: true }); setTimeout(() => say([{ who: 'Archivist Iupaca', text: 'Asleep. At last. Here — a page from my own shelf. Hexane: six carbons, an all-anti zigzag.' }]), 800) } }} />
      <Signpost pos={[3, 0, HALF - 4]} rotY={Math.PI} text="↓ Valence Fields · Library ↑" />
      <Motes count={160} area={[90, 6, 90]} center={[0, 0.3, 0]} color="#9ff8e0" size={0.07} />
      <WolfPack world={world} spawns={[[-26, 20], [-22, 24], [-28, 26]]} tutorial={false} />
      <ImpPack world={world} spawns={[[12, 10], [16, 6], [10, 2], [14, -4]]} />
      <PiFollower world={world} />
    </>
  )
}

export default function Forest({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromDungeon = cp.at === 'gate'
  return (
    <GameScene start={fromDungeon ? [0, 0, GATE_Z + 4] : [0, 0, HALF - 4]} startFacing={fromDungeon ? 0 : Math.PI} background="#14261e" camDist={6.2}>
      {(world) => <ForestLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
