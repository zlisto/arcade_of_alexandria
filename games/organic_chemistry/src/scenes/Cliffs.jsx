import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Lindlar } from '../actors/SpireFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, toast, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Thunder Cliffs — World 9's route and prep. A storm over sea cliffs; three straight spires rise from the water,
// joined by bridges of three glowing bars (assets/locations/world-9-triple-spire.png). Sage Lindlar opens the spire
// bridge once Kai can name the alkynes carved on his cairns (§9.1).
// Built in Blender (tools/spire_blender.py, tools/lindlar_blender.py).

preloadModels('spire', 'lindlar')
const LINDLAR = [-9.5, 0, 3.5]
const CAIRNS = [-6.4, 0, 6.6]
const GATE_Z = -44
const SPARK = [0, 92, -86] // the top of the middle spire (tools/spire_blender.py SP)
const readMs = (t) => Math.max(3200, Math.round((t.split(/\s+/).length / 3.5) * 1000) + 800)

// the meadow's grass: instanced tufts (three tilted blades each) with per-tuft colour, kept off the path ribbon
// (tools/spire_blender.py) and the bridge gate, so the cliff-top lawn isn't a flat sheet (Presentation round 2)
const PATH = [[-49, 6], [-30, 10], [-12, 4], [-4, -14], [0, -30], [0, -44]]
const nearPath = (x, z, r) => PATH.slice(1).some(([bx, bz], i) => {
  const [ax, az] = PATH[i], dx = bx - ax, dz = bz - az
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - ax - t * dx, z - az - t * dz) < r
})
function GrassTufts({ n = 2200 }) {
  const ref = useRef()
  const blades = useMemo(() => {
    let s = 91
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const out = []
    while (out.length < n * 3) {
      const x = -48 + rnd() * 96, z = -48 + rnd() * 90
      if (nearPath(x, z, 2.6) || (z < -38 && Math.abs(x) < 6) || Math.hypot(x - LINDLAR[0], z - LINDLAR[2]) < 1.2) continue
      const h = 0.25 + rnd() * 0.3, k = 0.75 + rnd() * 0.45, yaw = rnd() * Math.PI
      for (let b = 0; b < 3; b++) out.push([x + (rnd() - 0.5) * 0.18, z + (rnd() - 0.5) * 0.18, h * (0.8 + rnd() * 0.4), yaw + b * 2.1, (rnd() - 0.5) * 0.7, k])
    }
    return out
  }, [n])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D(), c = new THREE.Color()
    blades.forEach(([x, z, h, yaw, tilt, k], i) => {
      d.position.set(x, h / 2, z); d.rotation.set(tilt, yaw, 0); d.scale.set(1, h, 1); d.updateMatrix()
      m.setMatrixAt(i, d.matrix); m.setColorAt(i, c.setRGB(0.32 * k, 0.46 * k, 0.26 * k))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [blades])
  return <instancedMesh ref={ref} args={[undefined, undefined, blades.length]} frustumCulled={false}><coneGeometry args={[0.05, 1, 3]} /><meshStandardMaterial roughness={0.95} /></instancedMesh>
}

function Storm() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#1e2232'); gr.addColorStop(0.5, '#3a4258'); gr.addColorStop(0.72, '#5a6478'); gr.addColorStop(1, '#2a3040')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return <mesh><sphereGeometry args={[300, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
}

/** after Shard 9 the storm has broken: a clear night sky with stars (Octavia: "I can see stars") */
function NightSky() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#060812'); gr.addColorStop(0.4, '#101a34'); gr.addColorStop(0.5, '#24345a'); gr.addColorStop(0.56, '#1a2236'); gr.addColorStop(1, '#0e1220')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const stars = useMemo(() => {
    const n = 800, a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.44
      a[i * 3] = Math.cos(th) * Math.sin(ph) * 280; a[i * 3 + 1] = Math.cos(ph) * 280 + 10; a[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 280
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); return g
  }, [])
  return (
    <group>
      <mesh renderOrder={-2}><sphereGeometry args={[300, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <points geometry={stars} renderOrder={-1}><pointsMaterial color="#e8eeff" size={1.7} sizeAttenuation={false} fog={false} transparent opacity={0.9} depthWrite={false} /></points>
    </group>
  )
}

/** Malradix's violet spark on the middle spire's top until the Mimic falls (World 8's TowerSpark) */
function SpireSpark() {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.18) })
  return (
    <group ref={g} position={SPARK}>
      <mesh><sphereGeometry args={[1.8, 20, 16]} /><meshStandardMaterial color="#f0d0ff" emissive="#c070ff" emissiveIntensity={3.4} toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[4.2, 20, 16]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.36} depthWrite={false} toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[7.0, 20, 16]} /><meshBasicMaterial color="#a040ff" transparent opacity={0.13} depthWrite={false} toneMapped={false} /></mesh>
      <pointLight color="#c070ff" intensity={80} distance={40} />
    </group>
  )
}

/** lightning: now and then the sky flashes and a bolt hangs over the spires */
function Lightning() {
  const light = useRef(), bolt = useRef()
  const st = useRef({ t: 3 })
  const geo = useMemo(() => {
    const pts = [new THREE.Vector3(0, 120, 0)]
    for (let k = 1; k < 10; k++) pts.push(new THREE.Vector3((Math.random() - 0.5) * 12, 120 - k * 11, (Math.random() - 0.5) * 6))
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [])
  useFrame((_, dt) => {
    const s = st.current
    s.t -= dt
    if (s.t <= 0) { s.t = 4 + Math.random() * 6; s.flash = 0.25; if (bolt.current) bolt.current.position.set((Math.random() - 0.5) * 12, 0, -82 - Math.random() * 8) } // over the middle spire, where the spark is
    if (s.flash > 0) s.flash -= dt
    const on = s.flash > 0 && (s.flash > 0.15 || s.flash < 0.08)
    if (light.current) light.current.intensity = on ? 2.5 : 0
    if (bolt.current) bolt.current.visible = on
  })
  return (
    <>
      <directionalLight ref={light} position={[0, 80, -60]} color="#c8e0ff" intensity={0} />
      <line ref={bolt} geometry={geo}><lineBasicMaterial color="#e8f4ff" /></line>
    </>
  )
}

function CliffsLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.lindlarShot)
  const busy = useRef(false)
  const clear = (save.shards || 0) >= 9 // the storm broke with Shard 9

  useEffect(() => {
    playMusic('cliffs')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 2]), world.addSolid([-52, 0, 10], [-50, 8, 50]),
      world.addSolid([50, 0, -50], [52, 8, 4]), world.addSolid([50, 0, 12], [52, 8, 50]), world.addSolid([-50, 0, 43], [50, 8, 46]),
      world.addSolid([-50, 0, -52], [-3.2, 12, GATE_Z - 1]), world.addSolid([3.2, 0, -52], [50, 12, GATE_Z - 1]),
      world.addSolid([LINDLAR[0] - 0.4, 0, LINDLAR[2] - 0.4], [LINDLAR[0] + 0.4, 1.9, LINDLAR[2] + 0.4]),
    ]
    const back = world.addTrigger([-52, 0, 2], [-49.2, 4, 10], () => onExit('orchard', { scene: 'orchard', at: 'east' }))
    const into = world.addTrigger([-2.4, 0, GATE_Z - 2], [2.4, 4, GATE_Z + 0.5], () => { if (getState().save.t9cairns) onExit('spire', { scene: 'spire', room: 'entrance' }) })
    const bar = world.addSolid([-2.6, 0, GATE_Z - 0.6], [2.6, 6, GATE_Z + 0.2])
    world.setEnabled(bar, !getState().save.t9cairns)
    world.spireBar = bar
    const la = world.addInteractable({ pos: LINDLAR, radius: 2.6, label: 'Speak with Sage Lindlar', onInteract: () => talk() })
    const near = world.addTrigger([-22, 0, -4], [2, 4, 14], () => { if (!getState().save.metLindlar) talk() })
    const rocks = world.addSolid([49, 0, 4], [52, 8, 12])
    world.setEnabled(rocks, !roadOpen(10, getState().save.shards))
    const toMarsh = world.addTrigger([49.8, 0, 4], [52, 4, 12], () => { if (roadOpen(10, getState().save.shards)) onExit('marsh', { scene: 'marsh', at: 'west' }) })
    ids.push(back, into, bar, la, near, rocks, toMarsh)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.spireBar) world.setEnabled(world.spireBar, !save.t9cairns) }, [save.t9cairns])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 9 ? 'Take the east road down to the Halogen Marsh' : !s.metLindlar ? 'Follow the cliff path' : !s.t9cairns ? 'Name Lindlar’s cairns' : 'Cross to the Triple Spire' })
    if (!s.cliffsSeen) {
      saveGame({ cliffsSeen: true })
      setTimeout(async () => {
        // hold the camera on the middle spire's top (and its violet spark) while Pi points it out
        for (let k = 0; k < 30 && !(world.player && world.player.pos); k++) await new Promise((r) => setTimeout(r, 100)) // Kai may not be placed yet on a slow load
        const p = world.player && world.player.pos
        if (p) {
          let dx = p.x - SPARK[0], dz = p.z - SPARK[2]
          const l = Math.hypot(dx, dz) || 1
          dx /= l; dz /= l
          world.camOverride = { pos: [p.x + dx * 6, p.y + 3, p.z + dz * 6], look: [SPARK[0], SPARK[1] - 14, SPARK[2]] }
        }
        await say([
          { who: 'Pi', text: 'Three towers, straight as rulers, and bridges with three bars each. Triple bonds!' },
          { who: 'Pi', text: 'And the storm keeps lighting up the middle one. That’s where the spark is.' },
        ])
        world.camOverride = null
      }, 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#4a6a4a', wall: '#2a2e36', pit: '#1a2a34',
      labels: [{ pos: [-44, 6], text: '← Reagent Orchards', align: 'left' }, { pos: [40, 8], text: 'Halogen Marsh →', align: 'left' }, { pos: [0, -40], text: 'The Triple Spire', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metLindlar) return { pos: [LINDLAR[0], LINDLAR[2]], label: 'Speak with Sage Lindlar' }
        if (!s.t9cairns) return { pos: [CAIRNS[0], CAIRNS[2]], label: 'Name the cairns' }
        if ((s.shards || 0) < 9) return { pos: [0, GATE_Z], label: 'Cross to the Triple Spire' }
        if ((s.shards || 0) < 11) return { pos: [49, 8], label: 'Take the east road to the Halogen Marsh' }
        return { pos: [-48, 6], label: 'Back to the Orchards' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metLindlar) {
      saveGame({ metLindlar: true })
      if (world.player) world.player.teleport([LINDLAR[0] + 1.6, 0, LINDLAR[2] + 2.0], Math.atan2(-1.6, -2.0))
      world.camOverride = twoShot(world, LINDLAR, 3.6, 0.6)
      setState({ lindlarShot: true })
      await say([
        { who: 'Sage Lindlar', text: 'Borana sent you? Along the cliff path, good. Most people try to climb straight up the rock.' },
        { who: 'Sage Lindlar', text: 'Lindlar. I build the bridges here: three bonds each, perfectly straight. They have to be.' },
        { who: 'Sage Lindlar', text: 'Malradix wrote on my door: “To make something, just start somewhere and hope.”' },
        { who: 'Sage Lindlar', text: 'Then something violet landed on my summit. It copies whatever it sees, and never asks how.' },
        { who: 'Pi', text: 'That’s how I build sandcastles.' },
        { who: 'Sage Lindlar', text: 'And how do they turn out? Never ask where to start. Ask what came just before.' },
        { who: 'Sage Lindlar', text: 'First, the cairns. Name what’s carved on them and I’ll lower the bridge bar.' },
      ])
      world.camOverride = null
      setState({ lindlarShot: false, objective: 'Name Lindlar’s cairns' })
    } else if (!s.t9cairns) {
      await say([{ who: 'Sage Lindlar', text: 'Count from the end nearest the triple bond. A tie? The double bond wins. Engineers settle ties.' }])
    } else if ((s.shards || 0) < 9) {
      await say([{ who: 'Sage Lindlar', text: s.hasRetro ? 'You carry my Map. Use it before you pour anything.' : 'My Map is on the third floor. You won’t reach the summit without it.' }])
    } else {
      await say([{ who: 'Sage Lindlar', text: 'Planned backward, built forward. Magnus is east, in the marsh. He counts everything.' }])
    }
    busy.current = false
  }
  const useCairns = async () => {
    if (getState().save.t9cairns) return
    if (!getState().save.metLindlar) { await talk(); return }
    let wrong = null
    const ok = await openPanel('cairns', { onWrong: (t) => { wrong = t } })
    if (!ok) { if (wrong && world.player) { world.player.hurt(1, CAIRNS, true); toast(`${wrong} Start the cairns again.`, 'warn', readMs(wrong) + 800) } return }
    saveGame({ t9cairns: true }); sfx('open')
    setState({ objective: 'Cross to the Triple Spire' })
    await say([{ who: 'Sage Lindlar', text: 'The bar is down. Walk the bridge; it’s straight. Everything about an alkyne is.' }])
  }

  return (
    <>
      {clear ? <NightSky /> : <><Storm /><Lightning /></>}
      {!clear && !(save.solved || {}).boss9 && <SpireSpark />}
      <fog attach="fog" args={clear ? ['#1a2236', 60, 280] : ['#3a4258', 50, 260]} />
      <hemisphereLight args={['#a8b8d8', '#2a3a2a', 0.7]} />
      <ambientLight intensity={0.3} color="#c8d8f0" />
      <directionalLight position={[-30, 40, 30]} intensity={1.0} color="#c8d8ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={44} visible={false} />
      <Suspense fallback={null}>
        <Part model="spire" name="cl_ground" castShadow={false} receiveShadow />
        <GrassTufts />
        <Part model="spire" name="cl_sea" castShadow={false} />
        <Part model="spire" name="cl_path" castShadow={false} receiveShadow />
        <Part model="spire" name="cl_spires" castShadow={false} />
        {[[14, 18], [-22, 24], [24, -10], [-30, -24]].map(([x, z], i) => <Part key={i} model="spire" name="cl_rock" position={[x, 0, z]} />)}
      </Suspense>
      {!save.t9cairns && <mesh position={[0, 3, GATE_Z - 0.2]}><boxGeometry args={[5.2, 0.4, 0.4]} /><meshStandardMaterial color="#6a6e76" /></mesh>}
      <Tag position={[0, 8.2, GATE_Z]} df={14}>{save.t9cairns ? 'The Triple Spire' : 'The Triple Spire · bridge barred'}</Tag>
      <Lindlar position={LINDLAR} rotation={[0, 0.6, 0]} />
      {!shot && <Tag position={[LINDLAR[0], 2.4, LINDLAR[2]]} df={8}>Sage Lindlar</Tag>}
      <Station world={world} pos={CAIRNS} label={save.t9cairns ? null : 'Name the cairns'} enabled={!save.t9cairns} solved={!!save.t9cairns} onUse={useCairns} />
      {/* the cairns: stacked, slightly turned stones with a carved, glowing triple-bar plate (not plain domes) */}
      {[0, 1, 2].map((k) => (
        <group key={k} position={[CAIRNS[0] + 1.8 + k * 1.1, 0, CAIRNS[2] - 1.2]} rotation={[0, k * 0.7, 0]}>
          {[[0.5, 0.22, 0.2], [0.42, 0.2, 0.58], [0.34, 0.18, 0.93], [0.24, 0.15, 1.22], [0.14, 0.12, 1.44]].map(([r, hy, y], j) => (
            <mesh key={j} position={[(j % 2 ? 0.04 : -0.03), y, (j % 2 ? -0.03 : 0.03)]} rotation={[0, j * 1.1, (j % 2 ? 0.06 : -0.05)]} scale={[1, hy / r, 1]} castShadow receiveShadow>
              <dodecahedronGeometry args={[r, 0]} /><meshStandardMaterial color={j % 2 ? '#7a7e86' : '#6a6e76'} roughness={0.95} flatShading />
            </mesh>
          ))}
          {[-0.07, 0, 0.07].map((dy) => <mesh key={dy} position={[0, 0.58 + dy, 0.41]}><boxGeometry args={[0.36, 0.03, 0.02]} /><meshStandardMaterial color="#7ae8ff" emissive="#2ab0d0" emissiveIntensity={1.2} /></mesh>)}
        </group>
      ))}
      <Signpost pos={[-45, 0, 3]} rotY={Math.PI / 2} text="← Orchards · Spire ↑" />
      <Signpost pos={[45, 0, 3]} rotY={-Math.PI / 2} text="Halogen Marsh →" />
      {!roadOpen(10, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[50.6, 0.8 + (i % 3) * 0.9, 5 + i * 1.1]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#6a6e76" roughness={0.9} flatShading /></mesh>)}
      <Motes count={240} area={[90, 10, 90]} center={[0, 3, 0]} color="#c8e0ff" size={0.04} />
      <WolfPack world={world} spawns={[[18, 10], [22, 14], [16, 16]]} tutorial={false} />
      <PiFollower world={world} />
    </>
  )
}

export default function Cliffs({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromSpire = cp.at === 'gate', fromMarsh = cp.at === 'east'
  return (
    <GameScene start={fromMarsh ? [46, 0, 8] : fromSpire ? [0, 0, -38] : [-46, 0, 6]} startFacing={fromMarsh ? -Math.PI / 2 : fromSpire ? 0 : Math.PI / 2} background="#3a4258" camDist={6.2}>
      {(world) => <CliffsLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
