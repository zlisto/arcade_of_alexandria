import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Scatter, scatter, Station, Signpost, Motes } from '../engine/kit'
import { Ferrymen, WaterFolk } from '../actors/Coastfolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'

// The Tide Coast — World 2's dungeon prep. The Proton Ferrymen won't row to the Tide Temple until the
// lighthouse burns again; lighting it means reading which end of each bond is δ− (§2.1).

const SEA_Z = -18 // sea north of this
const DOCK = { x: [-1.6, 1.6], z: [-34, SEA_Z] }
const SPIT = { x: [17, 27], z: [-31, SEA_Z] }
const LIGHT = [22, 0, -27]
const FERRY = [0, 0, -36.5]

function Water() {
  const geo = useMemo(() => new THREE.PlaneGeometry(140, 70, 56, 28), [])
  const base = useMemo(() => geo.attributes.position.array.slice(), [geo])
  useFrame(({ clock }) => {
    const p = geo.attributes.position, t = clock.elapsedTime
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(base[i * 3] * 0.3 + t * 1.1) * 0.14 + Math.cos(base[i * 3 + 1] * 0.22 + t * 0.8) * 0.12)
    p.needsUpdate = true
  })
  return <mesh geometry={geo} position={[0, -0.35, SEA_Z - 35]} rotation={[-Math.PI / 2, 0, 0]}><meshStandardMaterial color="#1f8aa8" roughness={0.2} metalness={0.15} transparent opacity={0.9} /></mesh>
}

function Lighthouse({ lit }) {
  const beam = useRef()
  useFrame(({ clock }) => { if (beam.current) beam.current.rotation.y = clock.elapsedTime * 1.2 })
  return (
    <group position={LIGHT}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[3.4, 4, 1.2, 10]} /><meshStandardMaterial color="#6a6458" roughness={1} flatShading /></mesh>
      {[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[0, 2 + k * 2, 0]} castShadow><cylinderGeometry args={[1.6 - k * 0.12, 1.7 - k * 0.12, 2, 16]} /><meshStandardMaterial color={k % 2 ? '#c0394b' : '#f2efe6'} roughness={0.7} /></mesh>)}
      <mesh position={[0, 11.4, 0]}><cylinderGeometry args={[1.4, 1.4, 0.3, 16]} /><meshStandardMaterial color="#2a2a33" metalness={0.6} /></mesh>
      <mesh position={[0, 12.4, 0]}><cylinderGeometry args={[1, 1, 1.8, 12, 1, true]} /><meshStandardMaterial color={lit ? '#fff2c0' : '#4a5260'} emissive={lit ? '#ffcf6a' : '#000'} emissiveIntensity={lit ? 2.5 : 0} transparent opacity={0.85} toneMapped={!lit} /></mesh>
      <mesh position={[0, 13.8, 0]}><coneGeometry args={[1.5, 1.4, 12]} /><meshStandardMaterial color="#2a2a33" metalness={0.6} /></mesh>
      <mesh position={[0, 1.6, 1.62]}><boxGeometry args={[0.9, 1.8, 0.1]} /><meshStandardMaterial color="#5a3c26" /></mesh>
      {lit && (
        <group ref={beam} position={[0, 12.4, 0]}>
          <mesh position={[0, 0, 9]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[2.4, 18, 16, 1, true]} /><meshBasicMaterial color="#fff2c0" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} /></mesh>
          <pointLight color="#ffe0a0" intensity={14} distance={45} />
        </group>
      )}
    </group>
  )
}

function StiltHouse({ pos, rot = 0, roof = '#2f6fd8' }) {
  return (
    <group position={pos} rotation={[0, rot, 0]}>
      {[[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]].map(([x, z], i) => <mesh key={i} position={[x, 0.9, z]}><cylinderGeometry args={[0.14, 0.16, 1.8, 6]} /><meshStandardMaterial color="#6a4a32" /></mesh>)}
      <mesh position={[0, 1.95, 0]} castShadow><boxGeometry args={[4, 0.25, 3.6]} /><meshStandardMaterial color="#8a6440" roughness={0.9} /></mesh>
      <mesh position={[0, 3.1, 0]} castShadow><boxGeometry args={[3.4, 2, 3]} /><meshStandardMaterial color="#e8dcc0" roughness={0.9} /></mesh>
      <mesh position={[0, 4.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[3, 1.6, 4]} /><meshStandardMaterial color={roof} roughness={0.8} /></mesh>
      <mesh position={[0, 2.8, 1.52]}><boxGeometry args={[0.8, 1.4, 0.05]} /><meshStandardMaterial color="#5a3c26" /></mesh>
      <mesh position={[-1, 3.3, 1.52]}><boxGeometry args={[0.6, 0.6, 0.05]} /><meshStandardMaterial color="#ffe3a0" emissive="#ffcf6a" emissiveIntensity={0.5} /></mesh>
    </group>
  )
}

function Palm({ pos, h = 5, lean = 0.2 }) {
  return (
    <group position={pos} rotation={[0, 0, lean]}>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.16, 0.26, h, 7]} /><meshStandardMaterial color="#8a6a46" roughness={0.9} /></mesh>
      {[...Array(7)].map((_, k) => { const a = (k / 7) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.9, h - 0.1, Math.sin(a) * 0.9]} rotation={[Math.sin(a) * 0.9, -a, Math.cos(a) * 0.9 * 0 + 0.5]} castShadow><boxGeometry args={[2.2, 0.06, 0.55]} /><meshStandardMaterial color="#3f8a3a" roughness={0.8} /></mesh> })}
    </group>
  )
}

function TempleOnHorizon() {
  // the Tide Temple far out at sea: red and blue pillars, a stepped tower
  return (
    <group position={[10, -0.3, -120]}>
      <mesh position={[0, 2, 0]}><boxGeometry args={[34, 4, 20]} /><meshStandardMaterial color="#6a7a86" roughness={0.9} /></mesh>
      {[...Array(10)].map((_, i) => <mesh key={i} position={[-15 + i * 3.3, 7, 9]}><cylinderGeometry args={[0.9, 1, 8, 10]} /><meshStandardMaterial color={i % 2 ? '#2f6fd8' : '#c0394b'} /></mesh>)}
      {[0, 1, 2, 3].map((k) => <mesh key={k} position={[0, 6 + k * 3, -2]}><boxGeometry args={[14 - k * 3, 3, 10 - k * 2]} /><meshStandardMaterial color="#8a96a0" roughness={0.9} /></mesh>)}
      <pointLight position={[0, 20, 6]} color="#7ff4ff" intensity={6} distance={50} />
    </group>
  )
}

function CoastLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const busy = useRef(false)
  const palms = useMemo(() => scatter(14, 61, (r) => [(r() - 0.5) * 56, -10 + r() * 34, 4 + r() * 2.5, (r() - 0.5) * 0.5]).filter(([x, z]) => Math.abs(x) > 4 && !(x > 14 && z < -8)), [])
  const shells = useMemo(() => scatter(40, 63, (r) => [(r() - 0.5) * 60, SEA_Z + 1 + r() * 36, 0.3 + r() * 0.4, r() * 6]), [])

  useEffect(() => {
    playMusic('village')
    world.killY = -4
    const ids = [
      // land and the walkable dock + spit
      world.addFloor(-34, SEA_Z, 34, 32, 0),
      world.addFloor(DOCK.x[0], DOCK.z[0], DOCK.x[1], DOCK.z[1], 0.35),
      world.addFloor(SPIT.x[0], SPIT.z[0], SPIT.x[1], SPIT.z[1], 0),
      // edges: cliffs behind, the sea in front stops at the shore (except the dock and spit)
      world.addSolid([-36, 0, 30], [36, 6, 32]), world.addSolid([34, 0, -40], [36, 6, 32]),
      world.addSolid([-36, 0, -40], [-34, 6, 6]), world.addSolid([-36, 0, 14], [-34, 6, 32]),
      world.addSolid([-34, 0, -40], [DOCK.x[0], 4, SEA_Z]), world.addSolid([DOCK.x[1], 0, -40], [SPIT.x[0], 4, SEA_Z]), world.addSolid([SPIT.x[1], 0, -40], [34, 4, SEA_Z]),
      world.addSolid([SPIT.x[0], 0, -40], [SPIT.x[1], 4, SPIT.z[0]]),
      world.addSolid([DOCK.x[0] - 1, 0, -40], [DOCK.x[1] + 1, 4, DOCK.z[0]]),
      world.addSolid([LIGHT[0] - 1.8, 0, LIGHT[2] - 1.8], [LIGHT[0] + 1.8, 14, LIGHT[2] + 1.6]),
    ]
    const back = world.addTrigger([-36, 0, 6], [-33, 4, 14], () => onExit('field', { scene: 'field', at: 'coast' }))
    const fId = world.addInteractable({ pos: [0, 0.35, DOCK.z[0] + 1], radius: 2.6, label: 'Talk to the Ferrymen', onInteract: () => talkFerry() })
    ids.push(back, fId)
    if (import.meta.env.DEV) { window.__valence = window.__valence || {}; window.__valence.coast = { talkFerry: () => talkFerry() } }
    return () => ids.forEach((i) => world.remove(i))
  }, [world])

  useEffect(() => {
    const s = getState().save
    setState({ objective: !s.metFerrymen ? 'Find the Proton Ferrymen at the dock' : !s.lighthouseLit ? 'Light the Tide Lighthouse' : 'Ride with the Ferrymen to the Tide Temple' })
    if (!s.coastSeen) {
      saveGame({ coastSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'The Tide Coast! Look — the Tide Temple, way out on the water.' },
        { who: 'Pi', text: 'We need a boat. Those two at the end of the dock are the Proton Ferrymen, Brønsted and Lowry.' },
      ]), 700)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#e3d3a0', wall: '#6a6458', pit: '#1f8aa8',
      labels: [
        { pos: [-30, 10], text: '← Valence Fields', align: 'left' },
        { pos: [0, DOCK.z[0] - 3], text: 'Ferry dock', align: 'center' },
        { pos: [LIGHT[0], LIGHT[2] - 4], text: 'Tide Lighthouse', align: 'center' },
      ],
      goal: () => {
        const s = getState().save
        if (!s.metFerrymen) return { pos: [0, DOCK.z[0] + 1], label: 'Talk to the Ferrymen' }
        if (!s.lighthouseLit) return { pos: [LIGHT[0], LIGHT[2] + 3.6], label: 'Light the lighthouse' }
        return { pos: [0, DOCK.z[0] + 1], label: 'Ride to the Tide Temple' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talkFerry = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.lighthouseLit) {
      await say([
        { who: 'Brønsted', text: "Ahoy, little carbon! I'm Brønsted, and this is my brother Lowry. We ferry protons — and passengers." },
        { who: 'Lowry', text: 'A proton always rides from the one that gives it away to the one that takes it. An acid gives, a base takes. Remember that out at the temple.' },
        { who: 'Brønsted', text: "But we can't row you out tonight. Malradix put out the Tide Lighthouse — without its light, no boat can find the temple through the fog." },
        { who: 'Lowry', text: "The lamp is lit by reading bonds: which atom pulls the shared electrons harder. Climb out on the spit to the lighthouse and set it right." },
      ])
      saveGame({ metFerrymen: true })
      setState({ objective: 'Light the Tide Lighthouse' })
    } else {
      await say([
        { who: 'Lowry', text: "The light's burning! Hop in — we'll take you to the Tide Temple." },
        { who: 'Brønsted', text: "Malradix brags that a molecule's electrons sit still, exactly where you draw them. Out there you'll learn better. Hold on tight!" },
      ])
      busy.current = false
      sfx('open')
      onExit('temple', { scene: 'temple', room: 'entrance' })
      return
    }
    busy.current = false
  }

  const lightLighthouse = async () => {
    if (getState().save.lighthouseLit) return
    if (!getState().save.metFerrymen) { toast('The lighthouse door is shut. Maybe the Ferrymen know about it.', 'info'); return }
    const ok = await openPanel('polarity', {})
    if (ok) {
      saveGame({ lighthouseLit: true })
      sfx('shard')
      setState({ objective: 'Ride with the Ferrymen to the Tide Temple' })
      await say([
        { who: 'Pi', text: 'The light is on! The more electronegative atom pulls the shared electrons closer and goes δ− — that was the lamp\'s whole secret.' },
        { who: 'Pi', text: 'Back to the dock — the Ferrymen can row us out now.' },
      ])
    }
  }

  return (
    <>
      <Sky sunPosition={[-40, 18, -60]} turbidity={7} rayleigh={1.8} />
      <hemisphereLight args={['#e6f4ff', '#c9b88a', 0.95]} />
      <directionalLight position={[-20, 30, 10]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} />
      <fog attach="fog" args={['#d6eaf4', 60, 170]} />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-34} z0={SEA_Z} x1={34} z1={32} color="#e3d3a0" />
      <mesh position={[0, 0.02, 26]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[68, 10]} /><meshStandardMaterial color="#7a9a56" roughness={1} /></mesh>
      <mesh position={[-20, 0.03, 10]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 4]} /><meshStandardMaterial color="#b89a6a" roughness={1} /></mesh>
      <Water />
      {/* the dock */}
      <group>
        <mesh position={[0, 0.25, (DOCK.z[0] + DOCK.z[1]) / 2]} receiveShadow><boxGeometry args={[3.2, 0.2, DOCK.z[1] - DOCK.z[0]]} /><meshStandardMaterial color="#8a6440" roughness={0.9} /></mesh>
        {[...Array(9)].map((_, k) => [-1.5, 1.5].map((x) => <mesh key={k + '-' + x} position={[x, -0.4, DOCK.z[1] - k * 2]}><cylinderGeometry args={[0.13, 0.13, 1.6, 6]} /><meshStandardMaterial color="#5a3c26" /></mesh>))}
      </group>
      {/* the spit out to the lighthouse */}
      <mesh position={[(SPIT.x[0] + SPIT.x[1]) / 2, 0.01, (SPIT.z[0] + SPIT.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[SPIT.x[1] - SPIT.x[0], SPIT.z[1] - SPIT.z[0]]} /><meshStandardMaterial color="#cfc09a" roughness={1} /></mesh>
      {[[18, -20], [26, -22], [19, -30], [27, -29]].map(([x, z], i) => <mesh key={i} position={[x, 0.5, z]} scale={[1.6, 1, 1.3]} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#7a7468" roughness={1} flatShading /></mesh>)}
      <Lighthouse lit={!!save.lighthouseLit} />
      <Station world={world} pos={[LIGHT[0], 0, LIGHT[2] + 3.6]} label={save.lighthouseLit ? null : 'Light the lamp'} enabled={!save.lighthouseLit} solved={!!save.lighthouseLit} onUse={lightLighthouse} />
      <Ferrymen position={FERRY} />
      <Html position={[0, 3.6, FERRY[2]]} center distanceFactor={11}><div className="tag3d">Brønsted & Lowry</div></Html>
      <StiltHouse pos={[-20, 0, -6]} rot={0.3} />
      <StiltHouse pos={[-10, 0, 10]} rot={-0.2} roof="#c0394b" />
      <StiltHouse pos={[12, 0, 12]} rot={0.5} />
      {palms.map(([x, z, h, l], i) => <Palm key={i} pos={[x, 0, z]} h={h} lean={l} />)}
      <Scatter items={shells} kind="rock" color="#f0e6d0" />
      {/* nets, crates, beached boat */}
      <mesh position={[-6, 0.4, -10]} castShadow><boxGeometry args={[1, 0.8, 1]} /><meshStandardMaterial color="#8a6440" /></mesh>
      <mesh position={[-4.8, 0.3, -9.4]} castShadow><boxGeometry args={[0.8, 0.6, 0.8]} /><meshStandardMaterial color="#7a5636" /></mesh>
      <mesh position={[8, 0.3, -12]} rotation={[0, 0.6, Math.PI / 2]} scale={[1, 1, 0.5]}><cylinderGeometry args={[0.5, 0.5, 3, 14, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#2f6fd8" side={THREE.DoubleSide} /></mesh>
      {/* water-folk */}
      <WaterFolk position={[-8, 0, -4]} rotation={[0, 0.6, 0]} hat="#2f6fd8" />
      <WaterFolk position={[6, 0, 2]} rotation={[0, -0.8, 0]} hat="#d8b060" />
      <Talker world={world} pos={[-8, -4]} name="Wanda" lines={[
        { who: 'Wanda', text: "I'm water! See my two hydrogens? I'm bent — about 104.5° — and my oxygen hogs the electrons." },
        { who: 'Wanda', text: "So my oxygen end is a bit negative and my hydrogen ends a bit positive. That's why we water-folk stick together so well!" },
      ]} />
      <Talker world={world} pos={[6, 2]} name="Old Pip-Ett" lines={[
        { who: 'Old Pip-Ett', text: 'Malradix claims electrons sit still, right where you draw them. Hah! Tell that to the tide.' },
        { who: 'Old Pip-Ett', text: 'Out at the temple they say the waves pull toward the red stones and away from the blue ones. Red for electron-rich, blue for electron-poor.' },
      ]} />
      <Signpost pos={[-29, 0, 13]} rotY={Math.PI / 2} text="← Valence Fields" />
      <TempleOnHorizon />
      <Motes count={60} area={[60, 5, 50]} center={[0, 0.5, 5]} color="#ffffff" size={0.06} />
      <PiFollower world={world} />
    </>
  )
}

function Talker({ world, pos, name, lines }) {
  useEffect(() => {
    const id = world.addInteractable({ pos: [pos[0], 0, pos[1]], radius: 2.2, label: `Talk to ${name}`, onInteract: () => say(lines) })
    const s = world.addSolid([pos[0] - 0.5, 0, pos[1] - 0.5], [pos[0] + 0.5, 1.4, pos[1] + 0.5])
    return () => { world.remove(id); world.remove(s) }
  }, [world])
  return <Html position={[pos[0], 1.9, pos[1]]} center distanceFactor={10}><div className="tag3d">{name}</div></Html>
}

export default function Coast({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromTemple = cp.at === 'dock'
  return (
    <GameScene start={fromTemple ? [0, 0.35, DOCK.z[0] + 2] : [-30, 0, 10]} startFacing={fromTemple ? 0 : Math.PI / 2} background="#a8d4ea" camDist={6.4}>
      {(world) => <CoastLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
