import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Block, Slab, Scatter, scatter, Motes, Torch } from '../engine/kit'
import { Pi, Villager } from '../actors/Figures'
import WolfPack from '../actors/WolfPack'
import { getState, setState, saveGame, say, toast, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'

// Hydrogen Village — the tutorial. Teaches movement and the bond sockets (§1.4), the line-bond
// shorthand (§1.12), and the radical rule (§6.6) with the first wolf fight. Then the cave opens.

const START = [0, 0, 10]
const WELL = [7, 0, -3]
const CAVE = [0, 0, -36]
const LOOSE_H = [[-9, 2], [12, 6], [-4, -12], [15, -11]]

function Cottage({ world, pos, rot = 0, roof = '#b24a3a' }) {
  return (
    <group>
      <Block world={world} pos={[pos[0], 1.3, pos[1]]} size={[3.6, 2.6, 3.6]} visible={false} />
      <group position={[pos[0], 0, pos[1]]} rotation={[0, rot, 0]}>
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow><cylinderGeometry args={[1.8, 1.9, 2.4, 14]} /><meshStandardMaterial color="#eeeae2" roughness={0.9} /></mesh>
        <mesh position={[0, 3.05, 0]} castShadow><coneGeometry args={[2.3, 1.6, 14]} /><meshStandardMaterial color={roof} roughness={0.85} /></mesh>
        {/* a single chimney: hydrogen makes one bond */}
        <mesh position={[0.9, 3.6, 0.2]} castShadow><cylinderGeometry args={[0.2, 0.24, 1.1, 8]} /><meshStandardMaterial color="#8a8580" /></mesh>
        <mesh position={[0, 0.8, 1.86]}><boxGeometry args={[0.8, 1.5, 0.12]} /><meshStandardMaterial color="#6a4a32" /></mesh>
        <mesh position={[-1, 1.5, 1.6]}><boxGeometry args={[0.5, 0.5, 0.1]} /><meshStandardMaterial color="#ffe3a0" emissive="#ffcf6a" emissiveIntensity={0.6} /></mesh>
      </group>
    </group>
  )
}

/** A fence of H–H pairs: posts linked two by two. broken = loose atoms float above. */
function HFence({ from, to, n = 8 }) {
  const posts = []
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1)
    posts.push([from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k])
  }
  return (
    <group>
      {posts.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 1, 6]} /><meshStandardMaterial color="#7a5a3a" /></mesh>
          <mesh position={[0, 1.08, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#f4f4f4" /></mesh>
        </group>
      ))}
      {posts.filter((_, i) => i % 2 === 0 && i + 1 < posts.length).map(([x, z], k) => {
        const [x2, z2] = posts[k * 2 + 1]
        return <mesh key={k} position={[(x + x2) / 2, 1.08, (z + z2) / 2]} rotation={[0, -Math.atan2(z2 - z, x2 - x), Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, Math.hypot(x2 - x, z2 - z), 6]} /><meshStandardMaterial color="#e8e2d6" /></mesh>
      })}
    </group>
  )
}

function LooseH({ world, pos, taken, onTake }) {
  const g = useRef()
  const id = useRef(null)
  const cb = useRef(onTake)
  cb.current = onTake
  useEffect(() => {
    id.current = world.addInteractable({ pos: [pos[0], 0, pos[1]], radius: 2, label: 'Bond the loose hydrogen', onInteract: () => cb.current() })
    return () => world.remove(id.current)
  }, [world])
  useEffect(() => { world.setEnabled(id.current, !taken) }, [taken])
  useFrame(({ clock }) => { if (g.current) { g.current.position.y = 1 + Math.sin(clock.elapsedTime * 2 + pos[0]) * 0.15 } })
  if (taken) return null
  return (
    <group ref={g} position={[pos[0], 1, pos[1]]}>
      <mesh castShadow><sphereGeometry args={[0.28, 16, 12]} /><meshStandardMaterial color="#f8f8f8" emissive="#bfe8ff" emissiveIntensity={0.5} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.45, 0.02, 6, 24]} /><meshBasicMaterial color="#9fe8ff" toneMapped={false} /></mesh>
      <pointLight color="#bfe8ff" intensity={1} distance={3} />
    </group>
  )
}

// where the methane seal shows itself once the well is fixed: on a stone pedestal beside the well,
// at eye level, where Kai can walk up and examine it
const METHANE_AT = [WELL[0] + 2.4, WELL[2] + 0.8]

function Methane({ world, show, onExamine }) {
  // ball-and-stick CH4: C black, four H at the corners of a tetrahedron, 109.5° (§1.6, Figure 1.12)
  const g = useRef()
  const arc = useRef()
  const dirs = useMemo(() => [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((d) => new THREE.Vector3(...d).normalize()), [])
  const mats = useMemo(() => ({
    c: new THREE.MeshPhysicalMaterial({ color: '#2b2b31', roughness: 0.25, clearcoat: 0.8 }),
    h: new THREE.MeshPhysicalMaterial({ color: '#f4f4f4', roughness: 0.25, clearcoat: 0.8 }),
    bond: new THREE.MeshStandardMaterial({ color: '#b8bec8', metalness: 0.7, roughness: 0.3 }),
    stone: new THREE.MeshStandardMaterial({ color: '#8a8678', roughness: 0.95, flatShading: true }),
    glow: new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.6, toneMapped: false }),
  }), [])
  const cb = useRef(onExamine)
  cb.current = onExamine
  useEffect(() => {
    const id = world.addInteractable({ pos: [METHANE_AT[0], 0, METHANE_AT[1]], radius: 1.9, label: 'Examine the methane', onInteract: () => cb.current() })
    const solid = world.addSolid([METHANE_AT[0] - 0.4, 0, METHANE_AT[1] - 0.4], [METHANE_AT[0] + 0.4, 0.9, METHANE_AT[1] + 0.4])
    world.setEnabled(id, show); world.setEnabled(solid, show)
    return () => { world.remove(id); world.remove(solid) }
  }, [world, show])
  useFrame(({ clock }, dt) => {
    if (g.current) { g.current.rotation.y += dt * 0.5; g.current.position.y = 1.55 + Math.sin(clock.elapsedTime * 1.6) * 0.04 }
    if (arc.current) arc.current.material.opacity = 0.35 + Math.sin(clock.elapsedTime * 3) * 0.2
  })
  // the 109.5° angle between two of the bonds, drawn as a glowing arc in their plane
  const { angleArc, arcQ } = useMemo(() => {
    const a = dirs[0], b = dirs[1]
    const n = a.clone().cross(b).normalize()
    const basis = new THREE.Matrix4().makeBasis(a, n.clone().cross(a), n)
    return { angleArc: new THREE.TorusGeometry(0.42, 0.012, 6, 24, Math.acos(a.dot(b))), arcQ: new THREE.Quaternion().setFromRotationMatrix(basis) }
  }, [dirs])
  if (!show) return null
  return (
    <group position={[METHANE_AT[0], 0, METHANE_AT[1]]}>
      {/* pedestal */}
      <mesh position={[0, 0.42, 0]} material={mats.stone} castShadow><cylinderGeometry args={[0.32, 0.42, 0.84, 8]} /></mesh>
      <mesh position={[0, 0.88, 0]} material={mats.stone}><cylinderGeometry args={[0.42, 0.36, 0.1, 8]} /></mesh>
      <mesh position={[0, 0.94, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.glow}><ringGeometry args={[0.2, 0.3, 32]} /></mesh>
      <group ref={g} position={[0, 1.55, 0]} scale={0.62}>
        <mesh material={mats.c} castShadow><sphereGeometry args={[0.35, 24, 18]} /></mesh>
        {dirs.map((d, i) => (
          <group key={i}>
            <mesh position={d.clone().multiplyScalar(0.45)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)} material={mats.bond}><cylinderGeometry args={[0.06, 0.06, 0.6, 10]} /></mesh>
            <mesh position={d.clone().multiplyScalar(0.85)} material={mats.h} castShadow><sphereGeometry args={[0.22, 20, 14]} /></mesh>
          </group>
        ))}
        <mesh ref={arc} geometry={angleArc} quaternion={arcQ} material={mats.glow} />
      </group>
      <Html position={[0, 2.35, 0]} center distanceFactor={9}><div className="tag3d">CH₄ · methane · 109.5°</div></Html>
      <pointLight position={[0, 1.6, 0.6]} color="#ffe6b0" intensity={2} distance={5} />
    </group>
  )
}

function CaveMouth({ open }) {
  // A cliff face with a stone arch and a tunnel you can see into, the mountain set back behind it.
  // Collision (in VillageLevel) is unchanged: rock either side of x = ±2.2, overhead from y = 4.1.
  const glow = useRef()
  useFrame(({ clock }) => { if (glow.current) glow.current.material.opacity = open ? 0.5 + Math.sin(clock.elapsedTime * 2) * 0.15 : 0 })
  const rocks = useMemo(() => scatter(46, 23, (r) => {
    const side = r() < 0.5 ? -1 : 1
    const sc = 1.1 + r() * 1.5
    const x = side * (2.9 + sc * 0.9 + r() * 11) // keep clear of the mouth (|x| < 2.2)
    return [x, r() * 6.5, 0.6 + r() * 1.2, sc, r() * 6]
  }), [])
  const crystals = useMemo(() => scatter(10, 31, (r) => { const a = Math.PI * (0.1 + r() * 0.8); return [Math.cos(a) * (3 + r() * 0.6), Math.sin(a) * (3 + r() * 0.6) + 0.8, 0.25 + r() * 0.35, r() * 6] }), [])
  const rock = '#6b6658', rockDark = '#4e4a40'
  return (
    <group position={[CAVE[0], 0, CAVE[2] - 4]}>
      {/* the mountain, well behind the cliff so it never covers the mouth */}
      <mesh position={[0, 7, -17]} castShadow><coneGeometry args={[17, 16, 9]} /><meshStandardMaterial color="#5a6a4a" roughness={0.95} flatShading /></mesh>
      <mesh position={[-10, 4, -12]}><coneGeometry args={[8, 9, 7]} /><meshStandardMaterial color="#617052" roughness={0.95} flatShading /></mesh>
      <mesh position={[11, 3.5, -11]}><coneGeometry args={[7, 8, 7]} /><meshStandardMaterial color="#56654a" roughness={0.95} flatShading /></mesh>
      {/* cliff face: rock either side of the mouth and a band above it */}
      <mesh position={[-9.1, 3.5, -2.5]} castShadow><boxGeometry args={[13.8, 7, 7]} /><meshStandardMaterial color={rockDark} roughness={1} flatShading /></mesh>
      <mesh position={[9.1, 3.5, -2.5]} castShadow><boxGeometry args={[13.8, 7, 7]} /><meshStandardMaterial color={rockDark} roughness={1} flatShading /></mesh>
      <mesh position={[0, 5.9, -2.5]}><boxGeometry args={[4.6, 3.6, 7]} /><meshStandardMaterial color={rockDark} roughness={1} flatShading /></mesh>
      {rocks.map(([x, y, z, sc, rot], k) => (
        <mesh key={k} position={[x, y, 1 + z * 0.4]} rotation={[rot, rot * 1.3, 0]} scale={sc} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={k % 3 ? rock : '#7a7464'} roughness={1} flatShading /></mesh>
      ))}
      <mesh position={[-1.5, 7.4, 0.6]} rotation={[0.3, 0.2, 0]} scale={[2.2, 1.2, 1.4]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={rock} roughness={1} flatShading /></mesh>
      <mesh position={[1.8, 7.2, 0.5]} rotation={[0.1, 0.9, 0.3]} scale={[2, 1.1, 1.3]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={rock} roughness={1} flatShading /></mesh>
      {/* stone arch with a keystone, and cyan crystals growing round it */}
      <mesh position={[0, 0.2, 1.05]}><torusGeometry args={[2.55, 0.42, 6, 18, Math.PI]} /><meshStandardMaterial color="#8a8474" roughness={0.9} flatShading /></mesh>
      {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 2.55, 0.1, 1.05]}><boxGeometry args={[0.9, 0.5, 0.9]} /><meshStandardMaterial color="#8a8474" roughness={0.9} flatShading /></mesh>)}
      <mesh position={[0, 2.85, 1.15]}><boxGeometry args={[0.7, 0.8, 0.95]} /><meshStandardMaterial color="#9a9482" roughness={0.85} flatShading /></mesh>
      <mesh position={[0, 2.85, 1.64]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.22, 0.22, 0.02]} /><meshBasicMaterial color={open ? '#43e6f5' : '#3a5a60'} toneMapped={false} /></mesh>
      {crystals.map(([x, y, sc, rot], k) => (
        <mesh key={k} position={[x, y, 1.2]} rotation={[0.3, rot, Math.atan2(y - 0.8, x) - Math.PI / 2]} scale={[sc * 0.6, sc * 1.6, sc * 0.6]}><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#9ff3ff" emissive="#43e6f5" emissiveIntensity={open ? 1.4 : 0.3} roughness={0.2} toneMapped={false} /></mesh>
      ))}
      {/* the tunnel: dark walls running back into the hill, glowing at the far end */}
      <mesh position={[0, 2.1, -3.5]} rotation={[0, 0, 0]}><boxGeometry args={[4.4, 4.2, 8]} /><meshStandardMaterial color="#1e1c22" roughness={1} side={THREE.BackSide} /></mesh>
      <mesh position={[0, 2.0, -7.4]}><planeGeometry args={[4.2, 4]} /><meshBasicMaterial color={open ? '#0e3a46' : '#141318'} /></mesh>
      <mesh ref={glow} position={[0, 2.0, -7.3]}><planeGeometry args={[4.2, 4]} /><meshBasicMaterial color="#43e6f5" transparent opacity={0} toneMapped={false} /></mesh>
      {/* the rock plug while the wolves roam */}
      {!open && (
        <group position={[0, 0, 1.2]}>
          <mesh position={[0, 1.4, 0]} scale={[1.9, 1.5, 0.9]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#7a7464" roughness={1} flatShading /></mesh>
          <mesh position={[-1.2, 3.0, -0.1]} scale={[1, 0.9, 0.7]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#6e6a5e" roughness={1} flatShading /></mesh>
          <mesh position={[1.2, 3.1, -0.1]} scale={[1, 0.9, 0.7]}><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#6e6a5e" roughness={1} flatShading /></mesh>
        </group>
      )}
      {open && <pointLight position={[0, 2.2, 0]} color="#43e6f5" intensity={10} distance={16} />}
    </group>
  )
}

function VillageLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const sockets = useGame((s) => s.sockets)
  const [taken, setTaken] = useState(() => LOOSE_H.map(() => save.well))
  const [wolvesOn, setWolvesOn] = useState(save.well && !save.wolvesCleared)
  const [quest, setQuest] = useState(save.well ? 'done' : 'none') // none | gather | done
  const busyRef = useRef(false)
  // the map: points at whatever the quest needs next
  const live = useRef({})
  live.current = { quest, taken }
  useEffect(() => {
    world.map = {
      floor: '#6f9a55', wall: '#4a4038', pit: '#2a3a2a',
      labels: [
        { pos: [WELL[0], WELL[2] + 2.2], text: 'Well', align: 'center' },
        { pos: [CAVE[0], CAVE[2] - 4.5], text: 'Orbital Caverns', align: 'center' },
        { pos: [-4, 15.5], text: 'Hydrogen Village', align: 'center' },
      ],
      goal: () => {
        const s = getState()
        const { quest: q, taken: tk } = live.current
        if (!s.save.well) {
          if (q === 'none') return { pos: [WELL[0] - 4.2, WELL[2] + 2.6], label: 'Talk to Elder Proton' }
          if (s.sockets.length >= 4) return { pos: [WELL[0], WELL[2]], label: 'Seal the well with CH₄' }
          const p = world.player ? world.player.pos : { x: 0, z: 0 }
          const left = LOOSE_H.filter((_, i) => !tk[i])
          if (!left.length) return { pos: [WELL[0], WELL[2]], label: 'Back to the well' }
          const near = left.reduce((a, b) => (Math.hypot(a[0] - p.x, a[1] - p.z) < Math.hypot(b[0] - p.x, b[1] - p.z) ? a : b))
          return { pos: near, label: `Bond a loose hydrogen (${s.sockets.length}/4)` }
        }
        if (!s.save.wolvesCleared) {
          const wolves = [...world.targets.values()].filter((t) => t.alive())
          if (wolves.length) { const w = wolves[0].pos(); return { pos: [w[0], w[2]], label: 'Drive off the Radical Wolves' } }
          return { pos: [5, 4], label: 'Drive off the Radical Wolves' }
        }
        if (s.save.shards >= 1) return { pos: [41, 0], label: 'Take the east road to the Valence Fields' }
        return { pos: [CAVE[0], CAVE[2] - 5], label: 'Enter the Orbital Caverns' }
      },
    }
    return () => { world.map = null }
  }, [world])

  // boundary walls + cave hill
  useEffect(() => {
    const ids = [
      world.addSolid([-44, 0, -46], [-42, 6, 44]), world.addSolid([42, 0, -46], [44, 6, -3.2]), world.addSolid([42, 0, 3.2], [44, 6, 44]),
      world.addSolid([-44, 0, 42], [44, 6, 44]), world.addSolid([-44, 0, -46], [44, 6, -44]),
      // the hill around the cave mouth
      world.addSolid([-16, 0, -54], [-2.2, 12, -39]), world.addSolid([2.2, 0, -54], [16, 12, -39]), world.addSolid([-2.2, 4.1, -54], [2.2, 12, -39]),
      world.addSolid([-2.2, 0, -46], [2.2, 4.1, -44]),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  // the rock plug blocks the cave until the wolves are gone
  const plug = useRef(null)
  useEffect(() => { plug.current = world.addSolid([-2.2, 0, -40.2], [2.2, 4.1, -39]); return () => world.remove(plug.current) }, [world])
  useEffect(() => { world.setEnabled(plug.current, !save.wolvesCleared) }, [save.wolvesCleared])

  // the east road: brambles until the first shard is won, then out to the Valence Fields (World 2)
  const bramble = useRef(null)
  useEffect(() => {
    bramble.current = world.addSolid([42, 0, -3.2], [44, 6, 3.2])
    world.setEnabled(bramble.current, getState().save.shards < 1)
    const t = world.addTrigger([41.2, 0, -3], [44, 4, 3], () => { if (getState().save.shards >= 1) onExit('field', { scene: 'field', at: 'village' }) })
    const near = world.addTrigger([36, 0, -4], [41, 4, 4], () => { if (getState().save.shards < 1) toast('Brambles block the east road. It only opens for someone carrying a Bond Shard.', 'info', 3400) })
    return () => { world.remove(bramble.current); world.remove(t); world.remove(near) }
  }, [world])
  useEffect(() => { world.setEnabled(bramble.current, save.shards < 1) }, [save.shards])

  // the cave entrance
  useEffect(() => {
    const t = world.addTrigger([-2.2, 0, -44], [2.2, 4, -40.3], () => { if (getState().save.wolvesCleared) onExit('caverns') })
    return () => world.remove(t)
  }, [world])

  // opening: Pi arrives
  useEffect(() => {
    playMusic('village')
    const sv = getState().save
    setState({ objective: !sv.well ? 'Talk to the Elder at the well' : !sv.wolvesCleared ? 'Drive off the Radical Wolves' : sv.shards >= 1 ? 'Take the east road to the Valence Fields' : 'Enter the glowing cave north of the village' })
    if (!sv.piMet) {
      saveGame({ piMet: true })
      setTimeout(async () => {
        await say([
          { who: 'Pi', text: "Kai! Kai, wake up! Something's wrong — the bonds are breaking all over the village!" },
          { who: 'Pi', text: "I'm Pi. A π-electron cloud — I float above and below things, so I see where electrons are." },
          { who: 'Pi', text: "And you're a carbon. See the four glowing sockets on your armor? Nobody else in Hydrogen Village can hold more than one bond. You can hold four." },
          { who: 'Pi', text: 'Run with WASD. Click the game to steer the camera with the mouse. The Elder is by the well — let\'s go!' },
        ])
      }, 700)
    }
  }, [])

  const talkElder = async () => {
    if (busyRef.current) return
    busyRef.current = true
    const s = getState()
    if (s.save.well) {
      await say([{ who: 'Elder Proton', text: 'Our well holds again, thanks to you. Mind those wolves, and mind the cave — old Aufbau lives down there.' }])
    } else if (quest === 'none') {
      await say([
        { who: 'Elder Proton', text: "Kai, my boy. The violet sparks came in the night and tore the methane seal off our well." },
        { who: 'Elder Proton', text: 'The seal is one carbon heart holding four hydrogens. Every hydrogen in the village fence that snapped loose is floating about.' },
        { who: 'Elder Proton', text: "Bring four loose hydrogens to the well. We villagers can only hold one bond each — but you're carbon. You can carry four." },
        { who: 'Pi', text: 'Walk up to a glowing hydrogen and press E to bond it into one of your sockets.' },
      ])
      setQuest('gather')
      setState({ objective: `Bond 4 loose hydrogens (${getState().sockets.filter((x) => x === 'H').length}/4)` })
    } else {
      await say([{ who: 'Elder Proton', text: `${4 - getState().sockets.length} more to go. Carbon makes four bonds — no more, no less.` }])
    }
    busyRef.current = false
  }

  const take = (i) => {
    const s = getState()
    if (quest === 'none') { say([{ who: 'Pi', text: "That's a hydrogen from the fence. Let's hear what the Elder needs first." }]); return }
    if (s.sockets.length >= 4) { sfx('wrong'); toast('All four sockets are full. Carbon forms four bonds — no more (§1.4).', 'warn'); return }
    sfx('pickup')
    const sockets = [...s.sockets, 'H']
    setState({ sockets, objective: `Bond 4 loose hydrogens (${sockets.length}/4) — then bring them to the well` })
    setTaken((t) => t.map((x, k) => (k === i ? true : x)))
    if (sockets.length === 1) toast('Bonded! One H in one socket. Hydrogen makes one bond; carbon makes four.', 'good')
    if (sockets.length === 4) toast('Four bonds — every socket full. Now Kai has an octet, like the C in CH₄.', 'good', 4200)
  }

  const examineMethane = async () => {
    if (busyRef.current) return
    busyRef.current = true
    sfx('lock')
    await say([
      { who: 'Pi', text: "That's methane, CH₄ — the seal you made. One carbon holding four hydrogens: carbon needs four bonds to fill its octet, and each hydrogen needs just one (§1.4)." },
      { who: 'Pi', text: 'Carbon mixes its one 2s and three 2p orbitals into four identical sp³ hybrid orbitals. They point to the corners of a tetrahedron, so every H–C–H angle is 109.5° — see the glowing arc (§1.6).' },
      { who: 'Pi', text: 'Each C–H bond is 109 pm long and takes 439 kJ/mol to break. Four equal, strong bonds — that is why the seal holds.' },
    ])
    busyRef.current = false
  }

  const useWell = async () => {
    if (busyRef.current) return
    const s = getState()
    if (s.save.well) return
    if (quest === 'none') return talkElder()
    if (s.sockets.length < 4) { toast(`The seal needs four hydrogens. You carry ${s.sockets.length}.`, 'warn'); return }
    busyRef.current = true
    sfx('bond')
    setState({ sockets: [] })
    saveGame({ well: true })
    setQuest('done')
    await say([
      { who: 'Pi', text: 'Look! A carbon heart with four hydrogens — methane, CH₄. All four bonds point to the corners of a tetrahedron, 109.5° apart.' },
      { who: 'Pi', text: 'Drawing every atom is slow, so chemists use line-bond structures: a line for each shared pair of electrons. H–C–H, four times over.' },
      { who: 'Elder Proton', text: 'The seal holds! Bless you, lad—' },
      { who: 'Pi', text: 'Kai — wolves! Violet ones! Those are Malradix\'s radicals!' },
    ])
    busyRef.current = false
    setWolvesOn(true)
    setState({ objective: 'Drive off the Radical Wolves' })
    setTimeout(() => say([
      { who: 'Pi', text: 'Each wolf has one unpaired electron burning in its chest. Hit one with your sword (left click) and see what happens…' },
      { who: 'Pi', text: 'Right click (or Tab) locks on, so you can aim. Space rolls out of the way — and while locked on, Space plus a direction sidesteps or hops back.' },
    ]), 400)
  }

  const cleared = async () => {
    saveGame({ wolvesCleared: true, villageDone: true, checkpoint: { scene: 'village' } })
    setWolvesOn(false)
    await say([
      { who: 'Pi', text: 'They paired up and vanished! A radical only stops when it meets another radical — two unpaired electrons become one shared bond.' },
      { who: 'Pi', text: "Hitting one alone just made another. That's how Malradix's spells spread: a chain reaction." },
      { who: 'Pi', text: '…Do you feel that rumble? The hill to the north!' },
    ])
    sfx('open')
    setState({ objective: 'Enter the glowing cave north of the village' })
    toast('The cave to the north has opened.', 'good')
  }

  const trees = useMemo(() => scatter(90, 7, (r) => {
    const a = r() * Math.PI * 2
    const d = 30 + r() * 12
    const x = Math.cos(a) * d
    const z = Math.sin(a) * d
    if (z < -30 && Math.abs(x) < 18) return null
    if (x > 20 && Math.abs(z) < 7) return null // keep the east road clear
    return [x, z, 0.9 + r() * 0.9, r() * 6]
  }), [])
  const rocks = useMemo(() => scatter(40, 11, (r) => [(r() - 0.5) * 70, (r() - 0.5) * 70, 0.4 + r() * 0.8, r() * 6]).filter(([x, z]) => Math.hypot(x, z - 3) > 8 && Math.hypot(x - WELL[0], z - WELL[2]) > 4), [])
  const flowers = useMemo(() => scatter(160, 23, (r) => [(r() - 0.5) * 70, (r() - 0.5) * 70, 0.12 + r() * 0.1, r() * 6]), [])

  return (
    <group>
      <Sky sunPosition={[60, 25, -40]} turbidity={6} rayleigh={1.4} mieCoefficient={0.006} />
      <fog attach="fog" args={['#c7d6e3', 35, 110]} />
      <hemisphereLight args={['#dbe9ff', '#5a6a3a', 0.65]} />
      <directionalLight position={[30, 40, 20]} intensity={1.9} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-bias={-0.0004} />
      <Slab world={world} x0={-44} z0={-46} x1={44} z1={44} y={0} color="#6f9a4e" />
      {/* path to the cave and the well */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -14]} receiveShadow><planeGeometry args={[3.2, 52]} /><meshStandardMaterial color="#b49c74" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.5, 0.012, -3]} receiveShadow><planeGeometry args={[7, 2.6]} /><meshStandardMaterial color="#b49c74" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[26, 0.011, 0]} receiveShadow><planeGeometry args={[36, 2.8]} /><meshStandardMaterial color="#b49c74" roughness={1} /></mesh>
      <EastGate open={save.shards >= 1} />
      <Cottage world={world} pos={[-8, 8]} rot={0.4} />
      <Cottage world={world} pos={[-14, -4]} rot={1.2} roof="#3a6ab2" />
      <Cottage world={world} pos={[14, 10]} rot={-0.6} roof="#c08a2a" />
      <Cottage world={world} pos={[18, -4]} rot={-1.4} />
      <Cottage world={world} pos={[-6, -20]} rot={0.2} roof="#5a8a4a" />
      <Cottage world={world} pos={[12, -20]} rot={-0.3} roof="#8a4ab2" />
      <HFence from={[-22, 18]} to={[-10, 18]} />
      <HFence from={[8, 18]} to={[22, 18]} />
      <HFence from={[-24, -8]} to={[-24, 8]} n={6} />
      {/* the well */}
      <group position={[WELL[0], 0, WELL[2]]}>
        <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[1.2, 1.3, 1, 14, 1, true]} /><meshStandardMaterial color="#8a8580" roughness={0.95} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.15, 20]} /><meshStandardMaterial color={save.well ? '#3a9ac8' : '#1d2a33'} emissive={save.well ? '#1a6a98' : '#000'} emissiveIntensity={0.6} /></mesh>
        <mesh position={[-1.1, 1.4, 0]}><cylinderGeometry args={[0.08, 0.08, 1.8, 6]} /><meshStandardMaterial color="#6a4a32" /></mesh>
        <mesh position={[1.1, 1.4, 0]}><cylinderGeometry args={[0.08, 0.08, 1.8, 6]} /><meshStandardMaterial color="#6a4a32" /></mesh>
        <mesh position={[0, 2.35, 0]} rotation={[0, 0, Math.PI / 2]}><coneGeometry args={[0.9, 2.8, 4]} /><meshStandardMaterial color="#9a4a3a" /></mesh>
      </group>
      <Block world={world} pos={[WELL[0], 0.5, WELL[2]]} size={[2.4, 1, 2.4]} visible={false} />
      <WellStation world={world} done={!!save.well} onUse={useWell} label={() => (getState().save.well ? null : getState().sockets.length >= 4 ? 'Seal the well with CH₄' : 'Examine the broken well')} />
      <Methane world={world} show={!!save.well} onExamine={examineMethane} />
      {/* villagers: hydrogens, so they go about in pairs (H₂) */}
      <NPC world={world} pos={[WELL[0] - 4.2, WELL[2] + 2.6]} name="Elder Proton" hat="#4a4a8a" kind="elder" onTalk={talkElder} />
      <NPC world={world} pos={[-4, 13]} name="Hilda & Hal" pair onTalk={() => say([{ who: 'Hilda', text: "We hydrogens can only hold one hand each. So we go about in twos — H₂, the two of us." }, { who: 'Hal', text: 'Four bonds, though? Kai, you must be exhausted.' }])} />
      <NPC world={world} pos={[16, 2]} name="Old Deut" hat="#2a6a4a" kind="deut" onTalk={() => say([{ who: 'Old Deut', text: "I'm a hydrogen with an extra neutron in my nucleus. Heavier — deuterium, they call it — but the same element. Same one bond." }, { who: 'Pi', text: 'An isotope: same number of protons (atomic number), different mass number.' }])} />
      <NPC world={world} pos={[-10, -10]} name="Pip" hat="#c08a2a" kind="kid" onTalk={() => say([{ who: 'Pip', text: "The sage in the cave once told me carbon's electrons fill up from the bottom like water in a jug. 1s first, then 2s, then 2p." }])} />
      {LOOSE_H.map((p, i) => <LooseH key={i} world={world} pos={p} taken={taken[i]} onTake={() => take(i)} />)}
      <WolfPack world={world} spawns={[[2, 2], [9, 7]]} active={wolvesOn} onCleared={cleared} />
      <CaveMouth open={save.wolvesCleared} />
      <Scatter items={trees} kind="tree" />
      <Scatter items={rocks} kind="rock" color="#8a8580" />
      <Flowers items={flowers} />
      {[[-3, 4], [3, 4]].map(([x, z], i) => <Torch key={i} pos={[x, 0, z - 30]} />)}
      <Motes count={80} area={[60, 6, 60]} center={[0, 0.3, 0]} color="#fff6c0" size={0.07} />
      <PiFollower world={world} />
    </group>
  )
}

function WellStation({ world, onUse, label, done }) {
  const cb = useRef(onUse)
  cb.current = onUse
  const id = useRef(null)
  useEffect(() => {
    id.current = world.addInteractable({ pos: WELL, radius: 3.4, label, onInteract: () => cb.current() })
    return () => world.remove(id.current)
  }, [world])
  // once sealed, the well has nothing more to say — let E reach the methane beside it
  useEffect(() => { world.setEnabled(id.current, !done) }, [done])
  return null
}

function NPC({ world, pos, name, onTalk, hat, pair, kind }) {
  const cb = useRef(onTalk)
  cb.current = onTalk
  useEffect(() => {
    const id = world.addInteractable({ pos: [pos[0], 0, pos[1]], radius: 2.4, label: `Talk to ${name}`, onInteract: () => cb.current() })
    const s = world.addSolid([pos[0] - 0.5, 0, pos[1] - 0.5], [pos[0] + 0.5, 1.4, pos[1] + 0.5])
    return () => { world.remove(id); world.remove(s) }
  }, [world])
  const g = useRef()
  useFrame(({ clock }) => {
    if (!g.current || !world.player) return
    const p = world.player.pos
    const a = Math.atan2(p.x - pos[0], p.z - pos[1])
    if (Math.hypot(p.x - pos[0], p.z - pos[1]) < 6) g.current.rotation.y += (a - g.current.rotation.y) * 0.08
    g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 2 + pos[0])) * 0.04
  })
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <group ref={g}>
        {pair ? <><Villager position={[-0.45, 0, 0]} hat="#c0394b" /><Villager position={[0.45, 0, 0]} hat="#3a6ab2" />
          <mesh position={[0, 0.55, 0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.6, 6]} /><meshStandardMaterial color="#f0d2b8" /></mesh></>
          : <Villager hat={hat} kind={kind} />}
      </group>
      <Html position={[0, 1.9, 0]} center distanceFactor={10}><div className="tag3d">{name}</div></Html>
    </group>
  )
}

function Flowers({ items }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => ['#ffffff', '#ffd6e8', '#fff3a0', '#cfe8ff'], [])
  useEffect(() => {
    items.forEach(([x, z, s], i) => {
      dummy.position.set(x, s * 0.5, z)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
      ref.current.setColorAt(i, new THREE.Color(colors[i % 4]))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [items])
  return <instancedMesh ref={ref} args={[null, null, items.length]}><sphereGeometry args={[0.5, 6, 5]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
}

/** Pi drifts at Kai's shoulder and hovers over the lock-on target. */
export function PiFollower({ world }) {
  const g = useRef()
  const pos = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    const p = world.player
    if (!p || !g.current) return
    const target = world.lockPos
      ? new THREE.Vector3(world.lockPos[0], world.lockPos[1] + 2.1, world.lockPos[2])
      : new THREE.Vector3(p.pos.x + Math.sin(p.facing + 2.3) * 0.8, p.pos.y + 1.9, p.pos.z + Math.cos(p.facing + 2.3) * 0.8)
    pos.current.lerp(target, Math.min(1, dt * (world.lockPos ? 8 : 4)))
    g.current.position.copy(pos.current)
  })
  return <group ref={g}><Pi /></group>
}

function EastGate({ open }) {
  return (
    <group position={[43, 0, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 3.6]}>
          <mesh position={[0, 1.6, 0]} castShadow><boxGeometry args={[1.2, 3.2, 1.2]} /><meshStandardMaterial color="#8a8474" roughness={0.95} flatShading /></mesh>
          <mesh position={[0, 3.35, 0]}><boxGeometry args={[1.5, 0.3, 1.5]} /><meshStandardMaterial color="#6a6458" roughness={0.9} /></mesh>
        </group>
      ))}
      <mesh position={[0, 3.6, 0]}><boxGeometry args={[0.5, 0.4, 8.4]} /><meshStandardMaterial color="#6a4a32" roughness={0.9} /></mesh>
      {!open && [...Array(9)].map((_, k) => <mesh key={k} position={[(k % 3 - 1) * 0.4, 0.5 + (k % 2) * 0.5, -2.6 + k * 0.65]} castShadow><icosahedronGeometry args={[0.7, 0]} /><meshStandardMaterial color="#3d5a2a" roughness={1} flatShading /></mesh>)}
      <Html position={[-1.5, 2.6, 2.6]} center distanceFactor={11}><div className="tag3d">{open ? 'East road → Valence Fields' : 'East road · overgrown'}</div></Html>
    </group>
  )
}

export default function Village({ onExit }) {
  const save = getState().save
  const fromEast = save.checkpoint && save.checkpoint.scene === 'village' && save.checkpoint.at === 'east'
  const start = fromEast ? [38, 0, 0] : save.wolvesCleared ? [0, 0, -20] : START
  return (
    <GameScene start={start} startFacing={fromEast ? -Math.PI / 2 : Math.PI} background="#9ec3e6">
      {(world) => <VillageLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
