import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Spectra } from '../actors/SummitFolk'
import { Octavia } from '../actors/OctaviaModel'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame, toast } from '../engine/store'
import { readMs } from '../chem/rules12'
import { playMusic, sfx } from '../audio/sfx'

// The Summit of Light — World 12's route and prep. A snowy peak above a sea of cloud under the stars, the
// observatory dome, and a great crystal splitting starlight into a rainbow (assets/locations/world-12-observatory.png).
// Astronomer Spectra opens the observatory once Kai can order the electromagnetic spectrum by energy (§12.5).
// Built in Blender (tools/spectra_blender.py).

preloadModels('spectra')
const SPECTRA = [-9, 0, 3]
const SCOPE = [-6, 0, 6.4]
const OBS = [0, 0, -36]
const DOOR_Z = -28.8
const OCTAVIA = [-2.2, 0, -26.2] // after the finale she waits by the dome's door, in view as Kai arrives from the gate

function Night() {
  const stars = useMemo(() => { const p = []; for (let i = 0; i < 1200; i++) { const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2 + 0.05, r = 240; p.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r) } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g }, [])
  return (
    <group>
      <mesh><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial color="#0e1430" side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <points geometry={stars}><pointsMaterial color="#e8f0ff" size={1.2} sizeAttenuation={false} fog={false} /></points>
    </group>
  )
}

/** the rainbow from the great crystal, out into the sky */
function Rainbow() {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.children.forEach((m, i) => (m.material.opacity = 0.45 + 0.1 * Math.sin(clock.elapsedTime + i))) })
  const cols = ['#ff4a4a', '#ff9a3a', '#ffe04a', '#6aff6a', '#4ab0ff', '#7a5aff']
  return (
    <group ref={g} position={[12, 5, -24]} rotation={[0, 0.5, 0.55]}>
      {cols.map((c, i) => <mesh key={c} position={[0, i * 0.5, 40]}><boxGeometry args={[0.5, 0.5, 80]} /><meshBasicMaterial color={c} transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh>)}
    </group>
  )
}

/** Malradix's violet spark: on the first arrival it streaks in from the west road and over the dome; after that it
 *  hangs above the dome's slit until he is unmasked */
const SPARK_FROM = [-40, 6, 4], SPARK_AT = [0, 15.5, -36]
function SummitSpark({ world, fly }) {
  const g = useRef(), t = useRef(fly ? 0 : 99)
  useEffect(() => { world.summitSpark = new THREE.Vector3(...(fly ? SPARK_FROM : SPARK_AT)); return () => { world.summitSpark = null } }, [world])
  useFrame(({ clock }, dt) => {
    if (!g.current) return
    t.current += Math.min(dt, 1 / 30)
    const k = Math.min(1, t.current / 3.2), e = k * k * (3 - 2 * k)
    const x = SPARK_FROM[0] + (SPARK_AT[0] - SPARK_FROM[0]) * e, z = SPARK_FROM[2] + (SPARK_AT[2] - SPARK_FROM[2]) * e
    const y = SPARK_FROM[1] + (SPARK_AT[1] - SPARK_FROM[1]) * e + Math.sin(Math.PI * k) * 6
    g.current.position.set(x, y + (k >= 1 ? Math.sin(clock.elapsedTime * 1.6) * 0.3 : 0), z)
    g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 6) * 0.15)
    if (world.summitSpark) world.summitSpark.copy(g.current.position)
  })
  return (
    <group ref={g} position={fly ? SPARK_FROM : SPARK_AT}>
      <mesh><sphereGeometry args={[0.45, 14, 10]} /><meshBasicMaterial color="#f4e0ff" toneMapped={false} fog={false} /></mesh>
      <mesh><sphereGeometry args={[0.8, 14, 10]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.45} depthWrite={false} toneMapped={false} fog={false} /></mesh>
      <mesh><sphereGeometry args={[1.3, 14, 10]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.16} depthWrite={false} toneMapped={false} fog={false} /></mesh>
      <pointLight color="#c070ff" intensity={10} distance={18} />
    </group>
  )
}

/** the snowfield's dressing: boulders, pines, prayer-flag lines on the dome path and the west road, and lanterns */
const ROCKS = [[-38, -30, 1.6], [-30, -40, 1.1], [-42, 22, 1.4], [-24, 34, 1.0], [34, -36, 1.5], [40, -8, 1.2], [38, 30, 1.7], [12, 40, 1.1], [-16, -34, 0.9], [24, -42, 1.3], [-44, -10, 1.0], [30, 6, 0.8], [-18, 18, 0.7], [16, -6, 0.6]]
const PINES = [[-40, -38], [-34, -44], [-44, 30], [-36, 40], [-28, 44], [42, -40], [44, -20], [44, 12], [40, 40], [28, 44], [-46, -22], [6, 44], [-12, 42], [36, -44]]
const FLAG_LINES = [[[-3.4, -12], [-3.4, -25]], [[3.4, -12], [3.4, -25]], [[-30, -0.6], [-30, 12.6]], [[-18, -0.2], [-18, 10.8]]]
const FLAG_COLS = ['#3a6aff', '#ffffff', '#ff4a4a', '#4ad06a', '#ffd84a']
function SummitDressing({ world }) {
  useEffect(() => {
    const ids = [...ROCKS.map(([x, z, r]) => world.addSolid([x - r * 0.8, 0, z - r * 0.8], [x + r * 0.8, r * 1.4, z + r * 0.8])), ...PINES.map(([x, z]) => world.addSolid([x - 0.5, 0, z - 0.5], [x + 0.5, 4, z + 0.5])),
      ...FLAG_LINES.flatMap((ab) => ab.map(([x, z]) => world.addSolid([x - 0.15, 0, z - 0.15], [x + 0.15, 3.4, z + 0.15])))]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  const flags = useMemo(() => FLAG_LINES.map(([a, b]) => { const n = 12, out = []; for (let i = 1; i < n; i++) { const t = i / n; out.push([a[0] + (b[0] - a[0]) * t, 3.1 - Math.sin(Math.PI * t) * 0.7, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])]) } return out }), [])
  return (
    <group>
      {ROCKS.map(([x, z, r], i) => <mesh key={'r' + i} position={[x, r * 0.45, z]} rotation={[i * 0.7, i * 1.3, i * 0.4]} scale={[r, r * 0.8, r * 1.1]} castShadow receiveShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={i % 2 ? '#5a6070' : '#6c7282'} roughness={0.95} flatShading /></mesh>)}
      {ROCKS.map(([x, z, r], i) => <mesh key={'rs' + i} position={[x, r * 0.95, z]} scale={[r * 0.8, r * 0.18, r * 0.9]}><sphereGeometry args={[1, 10, 6]} /><meshStandardMaterial color="#eef2fa" roughness={1} /></mesh>)}
      {PINES.map(([x, z], i) => { const h = 1 + (i % 3) * 0.2; return (
        <group key={'p' + i} position={[x, 0, z]} scale={h}>
          <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.18, 0.24, 1.2, 7]} /><meshStandardMaterial color="#4a3428" roughness={1} /></mesh>
          {[0, 1, 2].map((k) => <mesh key={k} position={[0, 1.6 + k * 1.1, 0]} castShadow><coneGeometry args={[1.6 - k * 0.42, 1.9, 9]} /><meshStandardMaterial color={k === 2 ? '#e8eef8' : '#1f4a3a'} roughness={0.9} flatShading /></mesh>)}
          {[0, 1].map((k) => <mesh key={'s' + k} position={[0, 2.25 + k * 1.1, 0]}><coneGeometry args={[1.25 - k * 0.42, 0.5, 9]} /><meshStandardMaterial color="#e8eef8" roughness={1} /></mesh>)}
        </group>) })}
      {FLAG_LINES.map(([a, b], i) => (
        <group key={'f' + i}>
          {[a, b].map(([x, z], j) => (
            <group key={j} position={[x, 0, z]}>
              <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.07, 0.09, 3.4, 8]} /><meshStandardMaterial color="#6a4a30" roughness={0.9} /></mesh>
              <mesh position={[0, 3.45, 0]}><sphereGeometry args={[0.16, 10, 8]} /><meshBasicMaterial color="#ffd890" toneMapped={false} /></mesh>
            </group>))}
          {flags[i].map(([x, y, z, ry], k) => <mesh key={k} position={[x, y - 0.22, z]} rotation={[0, ry + Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.4]} /><meshStandardMaterial color={FLAG_COLS[k % 5]} side={2} roughness={0.8} emissive={FLAG_COLS[k % 5]} emissiveIntensity={0.15} /></mesh>)}
        </group>))}
      {[[-3.4, -12], [3.4, -12], [-3.4, -25], [3.4, -25], [-30, 6], [-18, 5]].map(([x, z], i) => <pointLight key={'l' + i} position={[x, 3.4, z]} color="#ffd890" intensity={4} distance={11} />)}
    </group>
  )
}

/** after the finale: the Crown of Tetravalence rides just above Kai's head */
function KaiCrown({ world }) {
  const g = useRef()
  useFrame(({ clock }) => { const p = world.player && world.player.pos; if (g.current && p) { g.current.position.set(p.x, p.y + 2.2 + Math.sin(clock.elapsedTime * 2) * 0.04, p.z); g.current.rotation.y = clock.elapsedTime * 0.5 } })
  const gold = <meshStandardMaterial color="#ffd870" metalness={0.9} roughness={0.2} emissive="#ffb030" emissiveIntensity={1.1} />
  return (
    <group ref={g} scale={0.7}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.42, 0.07, 10, 32]} />{gold}</mesh>
      {[0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.42, 0.2, Math.sin(a) * 0.42]}><coneGeometry args={[0.08, 0.38, 6]} />{gold}</mesh> })}
      {[0, 1, 2, 3].map((k) => { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; return <mesh key={'g' + k} position={[Math.cos(a) * 0.44, 0.02, Math.sin(a) * 0.44]}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh> })}
      <pointLight color="#ffd76a" intensity={2} distance={4} />
    </group>
  )
}

function SummitLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.spectraShot)
  const busy = useRef(false)
  const [sparkFly] = useState(() => !getState().save.summitSeen) // the first arrival watches the spark reach the dome

  useEffect(() => {
    playMusic('summit')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 2]), world.addSolid([-52, 0, 10], [-50, 8, 50]),
      world.addSolid([50, 0, -50], [52, 8, 50]), world.addSolid([-50, 0, 50], [50, 8, 52]), world.addSolid([-50, 0, -52], [50, 8, -50]),
      world.addSolid([SPECTRA[0] - 0.4, 0, SPECTRA[2] - 0.4], [SPECTRA[0] + 0.4, 1.9, SPECTRA[2] + 0.4]),
      world.addSolid([12 - 1.4, 0, -24 - 1.4], [12 + 1.4, 6, -24 + 1.4]),
    ]
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2
      if (Math.abs(Math.sin(a)) < 0.16 && Math.cos(a) > 0) continue
      const x = OBS[0] + Math.sin(a) * 6.8, z = OBS[2] + Math.cos(a) * 6.8
      ids.push(world.addSolid([x - 1.3, 0, z - 1.3], [x + 1.3, 10, z + 1.3]))
    }
    const back = world.addTrigger([-52, 0, 2], [-49.2, 4, 10], () => onExit('wastes', { scene: 'wastes', at: 'east' }))
    const into = world.addTrigger([-1.4, 0, DOOR_Z - 1.6], [1.4, 4, DOOR_Z + 0.3], () => { if (getState().save.t12scope) onExit('observatory', { scene: 'observatory', room: 'entrance' }) })
    const door = world.addSolid([-1.3, 0, DOOR_Z - 0.3], [1.3, 3.4, DOOR_Z + 0.2])
    world.setEnabled(door, !getState().save.t12scope)
    world.obsDoor = door
    const sa = world.addInteractable({ pos: SPECTRA, radius: 2.6, label: 'Speak with Astronomer Spectra', onInteract: () => talk() })
    const near = world.addTrigger([-22, 0, -4], [2, 4, 14], () => { if (!getState().save.metSpectra) talk() })
    ids.push(back, into, door, sa, near)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.obsDoor) world.setEnabled(world.obsDoor, !save.t12scope) }, [save.t12scope])
  const crowned = (save.shards || 0) >= 12
  // crowned, Kai's form chip would sit right under the crown: the crown says who he is now
  useEffect(() => { setState({ hideFormTag: crowned }); return () => setState({ hideFormTag: false }) }, [crowned])
  useEffect(() => {
    if (!crowned) return
    const ids = [
      world.addSolid([OCTAVIA[0] - 0.4, 0, OCTAVIA[2] - 0.4], [OCTAVIA[0] + 0.4, 1.9, OCTAVIA[2] + 0.4]),
      world.addInteractable({ pos: OCTAVIA, radius: 2.4, label: 'Speak with Princess Octavia', onInteract: () => say([{ who: 'Princess Octavia', text: 'Sir Kai. Every bond is holding. Go and see the kingdom you put back together.' }]) }),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world, crowned])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 12 ? 'The Crown is whole · the kingdom’s bonds hold' : !s.metSpectra ? 'Climb to the observatory' : !s.t12scope ? 'Set Spectra’s telescope' : 'Enter the Observatory' })
    if (!s.summitSeen) {
      saveGame({ summitSeen: true })
      // the spark streaks in over Kai's head and drops onto the dome; the camera holds on it through Pi's line
      setTimeout(async () => {
        const follow = setInterval(() => { const q = world.summitSpark; if (q) world.camOverride = { pos: [-38, 4.5, 12], look: [q.x, q.y, q.z] } }, 16)
        await Promise.all([say([{ who: 'Pi', text: 'We’re above the clouds! And look, the spark! It’s streaking for that dome.' }]), new Promise((r) => setTimeout(r, 3600))])
        clearInterval(follow)
        world.camOverride = null
        await say([{ who: 'Pi', text: 'It went in under the slit. The last shard is in there too. I can feel it humming.' }])
      }, 600)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#d8dce8', wall: '#3a3a4a', pit: '#1a1a2a',
      labels: [{ pos: [-44, 6], text: '← Volcanic Wastes', align: 'left' }, { pos: [0, -36], text: 'The Observatory', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metSpectra) return { pos: [SPECTRA[0], SPECTRA[2]], label: 'Speak with Astronomer Spectra' }
        if (!s.t12scope) return { pos: [SCOPE[0], SCOPE[2]], label: 'Set the telescope' }
        if ((s.shards || 0) < 12) return { pos: [0, DOOR_Z], label: 'Enter the Observatory' }
        return { pos: [-48, 6], label: 'Back to the Wastes' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metSpectra) {
      saveGame({ metSpectra: true })
      if (world.player) world.player.teleport([SPECTRA[0] + 1.6, 0, SPECTRA[2] + 2.0], Math.atan2(-1.6, -2.0))
      world.camOverride = twoShot(world, SPECTRA, 3.6, 0.6)
      setState({ spectraShot: true })
      await say([
        { who: 'Astronomer Spectra', text: 'Walden’s challenger? That violet spark just streaked into my dome. Brave, climbing after it in the dark.' },
        { who: 'Astronomer Spectra', text: 'Spectra. I read light. A molecule can’t hide from the right light.' },
        { who: 'Astronomer Spectra', text: 'Malradix is in my observatory, in a false shape. He wrote: “No one can ever know what I truly am.”' },
        { who: 'Pi', text: 'Can we?' },
        { who: 'Astronomer Spectra', text: 'Everything gives itself away. You only have to know which light to look in.' },
        { who: 'Astronomer Spectra', text: 'Set my telescope’s filters, lowest energy to highest, and the door is yours.' },
      ])
      world.camOverride = null
      setState({ spectraShot: false, objective: 'Set Spectra’s telescope' })
    } else if (!s.t12scope) {
      await say([{ who: 'Astronomer Spectra', text: 'Energy rises with frequency. Long waves gentle, short waves fierce.' }])
    } else if ((s.shards || 0) < 12) {
      await say([{ who: 'Astronomer Spectra', text: s.hasLens ? 'You have my lens. Weigh him, then look at him in infrared.' : 'My lens is past the isotope gallery. You’ll need it for the bells, and for him.' }])
    } else {
      await say([{ who: 'Astronomer Spectra', text: 'The Crown is whole, and the sky is quiet again. Look carefully, always. Everything gives itself away.' }])
    }
    busy.current = false
  }
  const useScope = async () => {
    if (getState().save.t12scope) return
    if (!getState().save.metSpectra) { await talk(); return }
    let miss = null
    const ok = await openPanel('telescope', { onWrong: (t) => { miss = t } })
    if (!ok) { if (miss) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, SCOPE, true); toast(miss, 'warn', readMs(miss)) } return }
    saveGame({ t12scope: true }); sfx('open')
    setState({ objective: 'Enter the Observatory' })
    await say([{ who: 'Astronomer Spectra', text: 'Radio to gamma. Remember that inside. The door is open.' }])
  }

  return (
    <>
      <Night />
      <Rainbow />
      <fog attach="fog" args={['#1e2440', 60, 240]} />
      <hemisphereLight args={['#c8d8ff', '#2a2a40', 0.7]} />
      <ambientLight intensity={0.35} color="#d8e0ff" />
      <directionalLight position={[-40, 60, 20]} intensity={1.0} color="#d8e4ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={50} visible={false} />
      <Suspense fallback={null}>
        <Part model="spectra" name="sm_ground" castShadow={false} receiveShadow />
        <Part model="spectra" name="sm_obs" position={OBS} />
        <Part model="spectra" name="sm_crystal" position={[12, 0, -24]} />
      </Suspense>
      <pointLight position={[12, 4, -24]} color="#e8f8ff" intensity={6} distance={14} />
      <pointLight position={[0, 3, DOOR_Z + 1]} color="#ffe0a0" intensity={3} distance={8} />
      <Tag position={[0, 5.0, DOOR_Z + 0.5]} df={14} far={36}>{save.t12scope ? 'The Observatory' : 'The Observatory · locked'}</Tag>
      <Spectra position={SPECTRA} rotation={[0, 0.6, 0]} />
      {crowned && <Suspense fallback={null}><group position={OCTAVIA} rotation={[0, 0.6, 0]}><Octavia /></group></Suspense>}
      {crowned && !shot && <Tag position={[OCTAVIA[0], 2.3, OCTAVIA[2]]} df={8} far={24}>Princess Octavia</Tag>}
      {crowned && <KaiCrown world={world} />}
      {!save.solved.boss12 && <SummitSpark world={world} fly={sparkFly} />}
      {!shot && <Tag position={[SPECTRA[0], 2.4, SPECTRA[2]]} df={8} far={24}>Astronomer Spectra</Tag>}
      <Station world={world} pos={SCOPE} label={save.t12scope ? null : 'Set the telescope’s filters'} enabled={!save.t12scope} solved={!!save.t12scope} onUse={useScope} />
      <group position={[SCOPE[0] + 1.6, 0, SCOPE[2] - 1.0]}>
        <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.06, 0.1, 1.4, 8]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0, 1.5, 0.2]} rotation={[-0.8, 0, 0]}><cylinderGeometry args={[0.12, 0.18, 1.4, 14]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.3} /></mesh>
      </group>
      <SummitDressing world={world} />
      <Signpost pos={[-45, 0, 3]} rotY={Math.PI / 2} text="← Wastes · Observatory ↑" />
      <Motes count={200} area={[90, 8, 90]} center={[0, 2, 0]} color="#ffffff" size={0.04} />
      <WolfPack world={world} spawns={[[22, 16], [26, 20], [20, 22]]} tutorial={false} />
      <PiFollower world={world} />
    </>
  )
}

export default function Summit({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromObs = cp.at === 'gate'
  return (
    <GameScene start={fromObs ? [0, 0, -23] : [-46, 0, 6]} startFacing={fromObs ? 0 : Math.PI / 2} background="#0e1430" camDist={6.2}>
      {(world) => <SummitLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
