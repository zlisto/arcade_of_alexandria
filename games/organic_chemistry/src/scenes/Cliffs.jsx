import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Lindlar } from '../actors/SpireFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'

// The Thunder Cliffs — World 9's route and prep. A storm over sea cliffs; three straight spires rise from the water,
// joined by bridges of three glowing bars (assets/locations/world-9-triple-spire.png). Sage Lindlar opens the spire
// bridge once Kai can name the alkynes carved on his cairns (§9.1).
// Built in Blender (tools/spire_blender.py, tools/lindlar_blender.py).

preloadModels('spire', 'lindlar')
const LINDLAR = [-9.5, 0, 3.5]
const CAIRNS = [-6.4, 0, 6.6]
const GATE_Z = -44

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
    if (s.t <= 0) { s.t = 4 + Math.random() * 6; s.flash = 0.25; if (bolt.current) bolt.current.position.set((Math.random() - 0.5) * 60, 0, -90 - Math.random() * 30) }
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

  useEffect(() => {
    playMusic('cliffs')
    const ids = [
      world.addSolid([-52, 0, -50], [-50, 8, 2]), world.addSolid([-52, 0, 10], [-50, 8, 50]),
      world.addSolid([50, 0, -50], [52, 8, 50]), world.addSolid([-50, 0, 43], [50, 8, 46]),
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
    ids.push(back, into, bar, la, near)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  useEffect(() => { if (world.spireBar) world.setEnabled(world.spireBar, !save.t9cairns) }, [save.t9cairns])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 9 ? 'Bond Shard 9 recovered: the Halogen Marsh awaits (Chapter 10, coming soon)' : !s.metLindlar ? 'Follow the cliff path' : !s.t9cairns ? 'Name Lindlar’s cairns' : 'Cross to the Triple Spire' })
    if (!s.cliffsSeen) {
      saveGame({ cliffsSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'Three towers, straight as rulers, and bridges with three bars each. Triple bonds!' },
        { who: 'Pi', text: 'And the storm keeps lighting up the middle one. That’s where the spark is.' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#4a6a4a', wall: '#2a2e36', pit: '#1a2a34',
      labels: [{ pos: [-44, 6], text: '← Reagent Orchards', align: 'left' }, { pos: [0, -40], text: 'The Triple Spire', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metLindlar) return { pos: [LINDLAR[0], LINDLAR[2]], label: 'Speak with Sage Lindlar' }
        if (!s.t9cairns) return { pos: [CAIRNS[0], CAIRNS[2]], label: 'Name the cairns' }
        if ((s.shards || 0) < 9) return { pos: [0, GATE_Z], label: 'Cross to the Triple Spire' }
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
        { who: 'Sage Lindlar', text: 'You came along the cliff path. Good. Most people try to climb straight up the rock.' },
        { who: 'Sage Lindlar', text: 'Lindlar. I build the bridges here: three bonds each, perfectly straight. They have to be.' },
        { who: 'Sage Lindlar', text: 'Malradix wrote on my door: “To make something, just start somewhere and hope.”' },
        { who: 'Pi', text: 'That’s how I build sandcastles.' },
        { who: 'Sage Lindlar', text: 'And how do they turn out? Never ask where to start. Ask what came just before.' },
        { who: 'Sage Lindlar', text: 'First, the cairns. Name what’s carved on them and I’ll lower the bridge bar.' },
      ])
      world.camOverride = null
      setState({ lindlarShot: false, objective: 'Name Lindlar’s cairns' })
    } else if (!s.t9cairns) {
      await say([{ who: 'Sage Lindlar', text: 'Number from the end nearer the triple bond. If a double and a triple tie, the double bond takes the lower number.' }])
    } else if ((s.shards || 0) < 9) {
      await say([{ who: 'Sage Lindlar', text: s.hasRetro ? 'You carry my Map. Use it before you pour anything.' : 'My Map is on the third floor. You won’t reach the summit without it.' }])
    } else {
      await say([{ who: 'Sage Lindlar', text: 'Planned backward, built forward. The marsh is next. Magnus will want to see your hands.' }])
    }
    busy.current = false
  }
  const useCairns = async () => {
    if (getState().save.t9cairns) return
    if (!getState().save.metLindlar) { await talk(); return }
    const ok = await openPanel('cairns', {})
    if (!ok) return
    saveGame({ t9cairns: true }); sfx('open')
    setState({ objective: 'Cross to the Triple Spire' })
    await say([{ who: 'Sage Lindlar', text: 'The bar is down. Walk the bridge; it’s straight. Everything about an alkyne is.' }])
  }

  return (
    <>
      <Storm />
      <Lightning />
      <fog attach="fog" args={['#3a4258', 50, 260]} />
      <hemisphereLight args={['#a8b8d8', '#2a3a2a', 0.7]} />
      <ambientLight intensity={0.3} color="#c8d8f0" />
      <directionalLight position={[-30, 40, 30]} intensity={1.0} color="#c8d8ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} />
      <Slab world={world} x0={-50} z0={-50} x1={50} z1={44} visible={false} />
      <Suspense fallback={null}>
        <Part model="spire" name="cl_ground" castShadow={false} receiveShadow />
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
      {[0, 1, 2].map((k) => <mesh key={k} position={[CAIRNS[0] + 1.8 + k * 1.1, 0.7, CAIRNS[2] - 1.2]} castShadow><cylinderGeometry args={[0.3, 0.5, 1.4, 6]} /><meshStandardMaterial color="#7a7e86" roughness={0.9} flatShading /></mesh>)}
      <Signpost pos={[-45, 0, 3]} rotY={Math.PI / 2} text="← Orchards · Spire ↑" />
      <Motes count={240} area={[90, 10, 90]} center={[0, 3, 0]} color="#c8e0ff" size={0.04} />
      <WolfPack world={world} spawns={[[18, 10], [22, 14], [16, 16]]} tutorial={false} />
      <PiFollower world={world} />
    </>
  )
}

export default function Cliffs({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromSpire = cp.at === 'gate'
  return (
    <GameScene start={fromSpire ? [0, 0, -38] : [-46, 0, 6]} startFacing={fromSpire ? 0 : Math.PI / 2} background="#3a4258" camDist={6.2}>
      {(world) => <CliffsLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
