import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Html } from '@react-three/drei'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Block, Slab, Scatter, scatter, Motes, Torch, twoShot } from '../engine/kit'
import { Pi, Villager } from '../actors/Figures'
import WolfPack from '../actors/WolfPack'
import { useModelParts, ModelPart, InstancedPart, preloadModels } from '../engine/models'
import { getState, setState, saveGame, say, toast, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'

// Hydrogen Village — the tutorial. Teaches movement and the bond sockets (§1.4), the line-bond
// shorthand (§1.12), and the radical rule (§6.6) with the first wolf fight. Then the cave opens.

preloadModels('village', 'wolf', 'pi', 'caverns', 'aufbau', 'colossus') // the cave loads while you're still in the village

const START = [0, 0, 10]
const WELL = [7, 0, -3]
const CAVE = [0, 0, -36]
const LOOSE_H = [[-9, 2], [12, 6], [-4, -12], [15, -11]]

const roofMats = {}
/** A prop from the village kit. roof: tints the cottage roof tiles. */
function KitPart({ name, roof, ...props }) {
  const parts = useModelParts('village')
  const override = useMemo(() => {
    if (!roof) return null
    if (!roofMats[roof]) {
      const base = (parts.cottage || []).find((x) => x.material.name === 'roof')
      if (base) { roofMats[roof] = base.material.clone(); roofMats[roof].color.set(roof) }
    }
    return { roof: roofMats[roof] }
  }, [parts, roof])
  return <ModelPart parts={parts} name={name} override={override} {...props} />
}

function Cottage({ world, pos, rot = 0, roof = '#6f8a3a' }) {
  return (
    <group>
      <Block world={world} pos={[pos[0], 1.7, pos[1]]} size={[4.6, 3.4, 4.6]} visible={false} />
      {/* round cottage, tiled roof, a single chimney: hydrogen makes one bond */}
      <Suspense fallback={null}><KitPart name="cottage" position={[pos[0], 0, pos[1]]} rotation={[0, rot, 0]} roof={roof} /></Suspense>
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
          <Suspense fallback={null}><KitPart name="fencePost" /></Suspense>
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
      <Suspense fallback={null}><KitPart name="pedestal" /></Suspense>
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
  // crystals in clusters of three, growing from the rocky rim of the tunnel mouth
  const crystals = useMemo(() => scatter(7, 31, (r) => { const a = Math.PI * (0.12 + r() * 0.76); const x = Math.cos(a) * 2.95, y = Math.sin(a) * 4.15; return [0, 1, 2].map((k) => [x * 1.08 + (k - 1) * 0.24, y * 1.06 + (k % 2) * 0.2, 0.3 + r() * 0.3, r() * 6]) }).flat(), [])
  return (
    <group position={[CAVE[0], 0, CAVE[2] - 4]}>
      {/* the mountain, the boulder cliff and the stone arch (village kit) */}
      <Suspense fallback={null}><KitPart name="caveHill" castShadow={false} /><KitPart name="caveCliff" /><KitPart name="caveTunnel" castShadow={false} /></Suspense>
      <mesh position={[0, 2.85, 1.64]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.22, 0.22, 0.02]} /><meshBasicMaterial color={open ? '#43e6f5' : '#3a5a60'} toneMapped={false} /></mesh>
      {crystals.map(([x, y, sc, rot], k) => (
        <mesh key={k} position={[x, y, 1.45]} rotation={[0.3, rot, Math.atan2(y - 0.8, x) - Math.PI / 2]} scale={[sc * 0.7, sc * 1.6, sc * 0.7]}><octahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#9ff3ff" emissive="#43e6f5" emissiveIntensity={open ? 1.4 : 0.3} roughness={0.2} toneMapped={false} /></mesh>
      ))}
      {/* the tunnel: dark walls running back into the hill, glowing at the far end */}
      <mesh position={[1.4, 1.1, -11.2]}><circleGeometry args={[1.6, 24]} /><meshBasicMaterial color={open ? '#0e3a46' : '#141318'} /></mesh>
      <mesh ref={glow} position={[1.4, 1.1, -11.1]}><circleGeometry args={[1.6, 24]} /><meshBasicMaterial color="#43e6f5" transparent opacity={0} toneMapped={false} /></mesh>
      {open && <pointLight position={[0.6, 1.6, -6]} color="#43e6f5" intensity={8} distance={9} />}
      {/* the rock plug while the wolves roam */}
      {!open && (
        <group position={[0, 0, 1.2]}>
          <Suspense fallback={null}>
            <KitPart name="rock0" position={[0, 0.4, 0]} scale={[2.0, 2.2, 1.0]} />
            <KitPart name="rock1" position={[-1.2, 2.3, -0.1]} scale={[1.1, 1.2, 0.8]} />
            <KitPart name="rock2" position={[1.2, 2.4, -0.1]} scale={[1.1, 1.2, 0.8]} />
          </Suspense>
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
          { who: 'Pi', text: 'And you\'re carbon. See your four sockets? Villagers hold one bond each. You can hold four.' },
          { who: 'Pi', text: 'Run with WASD. Click the game to steer the camera with the mouse. The Elder is by the well — let\'s go!' },
        ])
      }, 700)
    }
  }, [])

  const talkElder = async () => {
    if (busyRef.current) return
    busyRef.current = true
    const s = getState()
    world.camOverride = twoShot(world, [WELL[0] - 4.2, 0, WELL[2] + 2.6])
    if (s.save.well) {
      await say([{ who: 'Elder Proton', text: 'Those sparks shout that carbon bonds any which way. Our seal says otherwise. Mind the cave — old Aufbau\'s down there.' }])
    } else if (quest === 'none') {
      await say([
        { who: 'Elder Proton', text: 'Kai, my boy. Those violet sparks came in the night and tore the methane seal off our well. Look at them still crackling.' },
        { who: 'Elder Proton', text: 'The seal was one carbon heart holding four hydrogens. The sparks tore them loose. They\'re drifting by the fence.' },
        { who: 'Elder Proton', text: 'Bring me four. We hold one bond apiece, but you\'re carbon, lad. You can carry four.' },
        { who: 'Pi', text: 'Walk up to a glowing hydrogen and press E to bond it into a socket.' },
      ])
      setQuest('gather')
      setState({ objective: `Bond 4 loose hydrogens (${getState().sockets.filter((x) => x === 'H').length}/4)` })
    } else {
      await say([{ who: 'Elder Proton', text: `${4 - getState().sockets.length} more to go. Carbon makes four bonds — no more, no less.` }])
    }
    world.camOverride = null
    busyRef.current = false
  }

  const take = (i) => {
    const s = getState()
    if (quest === 'none') { say([{ who: 'Pi', text: "That's a hydrogen from the fence. Let's hear what the Elder needs first." }]); return }
    if (s.sockets.length >= 4) { sfx('wrong'); toast('Sockets full. Carbon makes exactly four bonds (§1.4).', 'warn'); return }
    sfx('pickup')
    const sockets = [...s.sockets, 'H']
    setState({ sockets, objective: `Bond 4 loose hydrogens (${sockets.length}/4) — then bring them to the well` })
    setTaken((t) => t.map((x, k) => (k === i ? true : x)))
    if (sockets.length === 1) toast('Bonded! Hydrogen makes one bond. Carbon makes four.', 'good')
    if (sockets.length === 4) { setState({ objective: 'Bring your four hydrogens to the well' }); toast('Four bonds, every socket full: an octet, like the C in CH₄.', 'good', 4200) }
  }

  const examineMethane = async () => {
    if (busyRef.current) return
    busyRef.current = true
    sfx('lock')
    await say([
      { who: 'Pi', text: 'Methane, CH₄: your seal. Carbon needs four bonds for its octet; each hydrogen needs one (§1.4).' },
      { who: 'Pi', text: 'Carbon mixes one 2s and three 2p orbitals into four identical sp³ hybrids (§1.6).' },
      { who: 'Pi', text: 'They point to a tetrahedron\'s corners. Every H–C–H angle is 109.5°. See the arc?' },
      { who: 'Pi', text: 'Each C–H bond is 109 pm long and takes 439 kJ/mol to break. Four equal, strong bonds.' },
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
      { who: 'Elder Proton', text: 'The seal holds! Bless you, lad—' },
      { who: 'Pi', text: 'Kai — wolves! Violet ones! Those are Malradix\'s radicals!' },
    ])
    busyRef.current = false
    setWolvesOn(true)
    setState({ objective: 'Drive off the Radical Wolves' })
    setTimeout(() => say([
      { who: 'Pi', text: 'Each wolf burns with one unpaired electron. Hit one (left click) and watch…' },
      { who: 'Pi', text: 'Right click or Tab locks on. Space rolls. Locked on, Space plus a direction sidesteps.' },
    ]), 400)
  }

  const cleared = async () => {
    saveGame({ wolvesCleared: true, villageDone: true, checkpoint: { scene: 'village' } })
    setWolvesOn(false)
    await say([
      { who: 'Pi', text: 'They paired up and vanished! Two unpaired electrons became one shared bond — like two H atoms making H₂ (§1.5).' },
      { who: 'Pi', text: 'Hit alone, one just passed its spark along. That\'s how Malradix\'s spells spread.' },
    ])
    world.shake = 0.9
    sfx('stomp'); sfx('open')
    await say([{ who: 'Pi', text: 'That rumble — the hill! The last spark fled into the old cave!' }])
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
      <Sky sunPosition={[80, 9, -60]} turbidity={2.2} rayleigh={1.3} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <fog attach="fog" args={['#e2dcc4', 45, 160]} />
      <hemisphereLight args={['#dbe9ff', '#5a6a3a', 0.65]} />
      <directionalLight position={[30, 40, 20]} intensity={1.9} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-bias={-0.0004} />
      <Slab world={world} x0={-44} z0={-46} x1={44} z1={44} y={0} visible={false} />
      {/* grass with soft patches, winding paths with a plaza round the well, rolling hills to the horizon */}
      <Suspense fallback={null}>
        <KitPart name="ground" castShadow={false} />
        <KitPart name="paths" castShadow={false} />
        <KitPart name="horizon" castShadow={false} receiveShadow={false} />
      </Suspense>
      <EastGate open={save.shards >= 1} />
      {COTTAGES.map(([x, z, rot, roof], i) => <Cottage key={i} world={world} pos={[x, z]} rot={rot} roof={roof} />)}
      <ChimneySmoke />
      {/* trees among the houses (they stand in your way, like trees do) */}
      {VILLAGE_TREES.map(([x, z], i) => <Block key={i} world={world} pos={[x, 1, z]} size={[0.8, 2, 0.8]} visible={false} />)}
      <HFence from={[-22, 18]} to={[-10, 18]} />
      <HFence from={[8, 18]} to={[22, 18]} />
      <HFence from={[-24, -8]} to={[-24, 8]} n={6} />
      {/* the well */}
      <group position={[WELL[0], 0, WELL[2]]}>
        <Suspense fallback={null}><KitPart name="well" /></Suspense>
        <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.02, 28]} /><meshStandardMaterial color={save.well ? '#1f5a78' : '#1d2a33'} emissive={save.well ? '#123a50' : '#000'} emissiveIntensity={0.3} roughness={0.15} /></mesh>
      </group>
      <Block world={world} pos={[WELL[0], 0.5, WELL[2]]} size={[2.4, 1, 2.4]} visible={false} />
      <WellStation world={world} done={!!save.well} onUse={useWell} label={() => (getState().save.well ? null : getState().sockets.length >= 4 ? 'Seal the well with CH₄' : 'Examine the broken well')} />
      <Methane world={world} show={!!save.well} onExamine={examineMethane} />
      {!save.well && <Motes count={70} area={[5, 3, 5]} center={[WELL[0], 0.6, WELL[2]]} color="#c070ff" size={0.12} />}
      {/* villagers: hydrogens, so they go about in pairs (H₂) */}
      <NPC world={world} pos={[WELL[0] - 4.2, WELL[2] + 2.6]} name="Elder Proton" hat="#4a4a8a" kind="elder" onTalk={talkElder} />
      <NPC world={world} pos={[-4, 13]} name="Hilda & Hal" pair onTalk={() => say([{ who: 'Hilda', text: "We hydrogens can only hold one hand each. So we go about in twos — H₂, the two of us." }, { who: 'Hal', text: 'Four bonds, though? Kai, you must be exhausted.' }])} />
      <NPC world={world} pos={[16, 2]} name="Old Deut" hat="#2a6a4a" kind="deut" onTalk={() => say([{ who: 'Old Deut', text: 'Extra neutron in my nucleus: deuterium. Heavier, but the same element. Same one bond.' }, { who: 'Pi', text: 'An isotope: same number of protons (atomic number), different mass number.' }])} />
      <NPC world={world} pos={[-10, -10]} name="Pip" hat="#c08a2a" kind="kid" onTalk={() => say([{ who: 'Pip', text: 'The cave sage says electrons fill from the bottom, like water in a jug: 1s, then 2s, then 2p.' }])} />
      {LOOSE_H.map((p, i) => <LooseH key={i} world={world} pos={p} taken={taken[i]} onTake={() => take(i)} />)}
      <WolfPack world={world} spawns={[[2, 2], [9, 7], [5, 9]]} active={wolvesOn} onCleared={cleared} />
      <CaveMouth open={save.wolvesCleared} />
      <Suspense fallback={null}><VillageNature trees={trees} rocks={rocks} flowers={flowers} /></Suspense>
      {[[-3, 4], [3, 4]].map(([x, z], i) => <VillageTorch key={i} pos={[x, 0, z - 30]} />)}
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

const FLOWER_COLORS = ['#ffffff', '#ffd6e8', '#fff3a0', '#cfe8ff'].map((c) => new THREE.Color(c))
// cottages: [x, z, turn, moss roof]
const COTTAGES = [[-8, 8, 0.4, '#6f8a3a'], [-14, -4, 1.2, '#7d9442'], [14, 10, -0.6, '#5f7d36'], [18, -4, -1.4, '#738c3c'], [-6, -20, 0.2, '#68843a'], [12, -20, -0.3, '#7a9040']]
const CHIMNEY = [0.75, 5.75, -0.85] // the chimney top, in a cottage's own frame
const VILLAGE_TREES = [[-18, 12], [-20, 2], [-11, 15], [26, 15], [20, 14], [24, 4], [22, -12], [-8, -15], [7.5, -14], [-12, -14], [-20, -12], [18, -16], [8, -27], [-14, -24]]

/** Smoke curling up from every chimney: one instanced batch of soft puffs. */
function ChimneySmoke() {
  const ref = useRef()
  const N = 5
  const tops = useMemo(() => COTTAGES.map(([x, z, rot]) => [x + CHIMNEY[0] * Math.cos(rot) + CHIMNEY[2] * Math.sin(rot), CHIMNEY[1], z - CHIMNEY[0] * Math.sin(rot) + CHIMNEY[2] * Math.cos(rot)]), [])
  const d = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    tops.forEach(([x, y, z], c) => {
      for (let k = 0; k < N; k++) {
        const u = ((t * 0.18 + k / N + c * 0.13) % 1)
        d.position.set(x + Math.sin(u * 5 + c) * 0.35 + u * 0.9, y + u * 3.2, z + Math.cos(u * 4 + c) * 0.25)
        d.scale.setScalar(0.18 + u * 0.55 * (1 - u * 0.45))
        d.updateMatrix()
        ref.current.setMatrixAt(c * N + k, d.matrix)
      }
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, COTTAGES.length * N]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 3]} />
      <meshStandardMaterial color="#f4f1ec" transparent opacity={0.28} depthWrite={false} roughness={1} />
    </instancedMesh>
  )
}
/** Trees, rocks, grass tufts and flowers from the village kit, each kind drawn in one go. */
function VillageNature({ trees, rocks, flowers }) {
  const parts = useModelParts('village')
  const sets = useMemo(() => {
    const pine = [], oak = [], r = [[], [], []]
    trees.forEach(([x, z, sc, rot], i) => (i % 3 === 0 ? oak.push([x, 0, z, sc * 1.05, rot]) : pine.push([x, 0, z, sc * 0.92, rot])))
    VILLAGE_TREES.forEach(([x, z], i) => (i % 2 ? oak.push([x, 0, z, 1.0 + (i % 3) * 0.12, i]) : pine.push([x, 0, z, 1.1 + (i % 3) * 0.1, i])))
    const shrubs = []
    COTTAGES.forEach(([cx, cz, rot]) => [1.3, 2.2, 3.7, 4.7].forEach((a, k) => { const b = a + rot; shrubs.push([cx + Math.sin(b) * 2.75, 0, cz + Math.cos(b) * 2.75, 0.8 + (k % 2) * 0.3, k + cx]) }))
    rocks.forEach(([x, z, sc, rot], i) => r[i % 3].push([x, 0, z, sc * 0.55, rot]))
    const fl = flowers.map(([x, z, sc, rot]) => [x, 0, z, 0.75 + sc * 2, rot])
    // grass tufts everywhere but the paths, the houses, the well and the cave
    const tufts = scatter(2200, 41, (rn) => {
      const x = (rn() - 0.5) * 84, z = (rn() - 0.5) * 84
      if (Math.abs(x) < 2.6 && z < 16 && z > -41) return null
      if (x > 0 && x < 7.2 && Math.abs(z + 3) < 1.6) return null
      if (x > 7 && Math.abs(z) < 1.7) return null
      if (z < -32 && Math.abs(x) < 17) return null
      if (Math.hypot(x - WELL[0], z - WELL[2]) < 3.4) return null
      if (COTTAGES.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 2.6)) return null
      return [x, 0, z, 0.6 + rn() * 0.5, rn() * 6.3]
    })
    return { pine, oak, r, fl, tufts, shrubs }
  }, [trees, rocks, flowers])
  return (
    <group>
      <InstancedPart parts={parts} name="pine" items={sets.pine} castShadow />
      <InstancedPart parts={parts} name="oak" items={sets.oak} castShadow />
      {sets.r.map((items, k) => <InstancedPart key={k} parts={parts} name={'rock' + k} items={items} castShadow />)}
      <InstancedPart parts={parts} name="tuft" items={sets.tufts} />
      <InstancedPart parts={parts} name="shrub" items={sets.shrubs} castShadow />
      <InstancedPart parts={parts} name="flowerHead" items={sets.fl} colors={FLOWER_COLORS} />
      <InstancedPart parts={parts} name="flowerStem" items={sets.fl} />
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
      : getState().lanternPrompt || world.piAside // aiming at a lantern (or a scene asks): give way, up and out to Kai's side, out of the line of fire
        ? new THREE.Vector3(p.pos.x + Math.sin(p.facing + 2.0) * 1.6, p.pos.y + 2.5, p.pos.z + Math.cos(p.facing + 2.0) * 1.6)
        : new THREE.Vector3(p.pos.x + Math.sin(p.facing + 2.3) * 0.8, p.pos.y + 1.9, p.pos.z + Math.cos(p.facing + 2.3) * 0.8)
    pos.current.lerp(target, Math.min(1, dt * (world.lockPos ? 8 : 4)))
    g.current.position.copy(pos.current)
  })
  return <group ref={g}><Pi /></group>
}

const BRAMBLES = [...Array(9)].map((_, k) => [(k % 3 - 1) * 0.4, 0, -2.6 + k * 0.65, 1.1 + (k % 2) * 0.25, k])
function Brambles() {
  const parts = useModelParts('village')
  return <InstancedPart parts={parts} name="bramble" items={BRAMBLES} castShadow />
}

/** A torch post from the kit with a flickering flame. */
function VillageTorch({ pos }) {
  const flame = useRef()
  const light = useRef()
  useFrame(({ clock }) => {
    const f = 1 + Math.sin(clock.elapsedTime * 13 + pos[0]) * 0.12 + Math.sin(clock.elapsedTime * 7.3) * 0.08
    if (flame.current) flame.current.scale.set(1, f, 1)
    if (light.current) light.current.intensity = 3 * f
  })
  return (
    <group position={pos}>
      <Suspense fallback={null}><KitPart name="torch" /></Suspense>
      <mesh ref={flame} position={[0, 1.72, 0]}><coneGeometry args={[0.1, 0.32, 10]} /><meshBasicMaterial color="#ffb347" toneMapped={false} /></mesh>
      <mesh position={[0, 1.66, 0]}><sphereGeometry args={[0.08, 10, 8]} /><meshBasicMaterial color="#fff0a0" toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, 1.9, 0]} color="#ffb35a" intensity={3} distance={8} />
    </group>
  )
}

function EastGate({ open }) {
  return (
    <group position={[43, 0, 0]}>
      <Suspense fallback={null}><KitPart name="gate" /></Suspense>
      {!open && <Suspense fallback={null}><Brambles /></Suspense>}
      <Html position={[-1.5, 2.6, 2.6]} center distanceFactor={11}><div className="tag3d">{open ? 'East road → Valence Fields' : 'East road · overgrown'}</div></Html>
    </group>
  )
}

export default function Village({ onExit }) {
  const save = getState().save
  const fromEast = save.checkpoint && save.checkpoint.scene === 'village' && save.checkpoint.at === 'east'
  const fromCave = save.checkpoint && save.checkpoint.scene === 'village' && save.checkpoint.at === 'cave' // warped out of the caverns
  const start = fromEast ? [38, 0, 0] : fromCave ? [0, 0, -28] : save.wolvesCleared ? [0, 0, -20] : START
  return (
    <GameScene start={start} startFacing={fromEast ? -Math.PI / 2 : fromCave ? 0 : Math.PI} background="#9ec3e6">
      {(world) => <VillageLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
