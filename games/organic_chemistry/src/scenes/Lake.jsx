import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { ImpPack } from '../actors/Critters'
import { Tartara } from '../actors/TartaraModel'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Mirror Lake — World 5's route and prep. A perfectly still lake under moonlight; on its island the
// Mirror Palace, its reflection exact below the water (assets/locations/world-5-mirror-palace.png). Sister
// Tartara sorts mirror-image crystals on the shore, as Pasteur did, and raises the crystal causeway once Kai
// can tell left from right (§5.4). Built in Blender (tools/palace_blender.py, tools/tartara_blender.py).

preloadModels('palace', 'tartara', 'critters')
const TARTARA = [4.2, 0, -5.5]
const SHORE_Z = -10 // the waterline
const CAUSEWAY = { x: [-1.7, 1.7], z: [SHORE_Z, -78] }

function Night() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#0e1630'); gr.addColorStop(0.5, '#2a3a5e'); gr.addColorStop(0.72, '#7a8cb0'); gr.addColorStop(1, '#2a3450')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const stars = useMemo(() => { const p = []; for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.3; p.push(Math.cos(a) * Math.cos(e) * 240, Math.sin(e) * 240, Math.sin(a) * Math.cos(e) * 240) } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g }, [])
  return (
    <group>
      <mesh><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <points geometry={stars}><pointsMaterial color="#e8f0ff" size={1.2} sizeAttenuation={false} fog={false} /></points>
      <mesh position={[-60, 70, -200]}><sphereGeometry args={[9, 24, 16]} /><meshBasicMaterial color="#f4f8ff" fog={false} /></mesh>
    </group>
  )
}

/** The still lake: a dark glassy plane; the palace's reflection is real geometry mirrored below it. */
function Lake() {
  return (
    <group>
      <mesh position={[0, -0.04, SHORE_Z - 110]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[320, 220]} /><meshStandardMaterial color="#5a6e90" metalness={0.9} roughness={0.08} transparent opacity={0.5} depthWrite={false} /></mesh>
      <mesh position={[0, -60, SHORE_Z - 110]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[320, 220]} /><meshBasicMaterial color="#0c1428" /></mesh>
    </group>
  )
}

function Causeway({ world, up }) {
  const g = useRef(), h = useRef(up ? 0 : -1.4)
  const id = useRef(null)
  useEffect(() => { id.current = world.addFloor(CAUSEWAY.x[0], CAUSEWAY.z[1], CAUSEWAY.x[1], CAUSEWAY.z[0], 0); return () => world.remove(id.current) }, [world])
  useEffect(() => { world.setEnabled(id.current, up) }, [up])
  useFrame((_, dt) => { h.current += ((up ? 0 : -1.4) - h.current) * Math.min(1, dt * 1.2); if (g.current) g.current.position.y = h.current })
  const n = Math.round((CAUSEWAY.z[0] - CAUSEWAY.z[1]) / 4)
  return <group ref={g}>{[...Array(n)].map((_, i) => <Part key={i} model="palace" name="lk_causeway" position={[0, 0, CAUSEWAY.z[0] - 2 - i * 4]} />)}</group>
}

function LakeLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.tartaraShot)
  const busy = useRef(false)

  useEffect(() => {
    playMusic('lake')
    world.killY = -3
    const ids = [
      world.addFloor(-45, SHORE_Z, 45, 45, 0),
      world.addSolid([-47, 0, SHORE_Z - 2], [-45, 8, 46]), world.addSolid([45, 0, SHORE_Z - 2], [47, 8, 4]), world.addSolid([45, 0, 12], [47, 8, 46]),
      world.addSolid([-45, 0, 45], [-3.5, 8, 47]), world.addSolid([3.5, 0, 45], [45, 8, 47]),
      world.addSolid([TARTARA[0] - 0.8, 0, TARTARA[2] + 0.2], [TARTARA[0] + 0.8, 1, TARTARA[2] + 1.2]), // her table
      world.addSolid([TARTARA[0] - 0.3, 0, TARTARA[2] - 0.3], [TARTARA[0] + 0.3, 1.8, TARTARA[2] + 0.3]),
    ]
    const back = world.addTrigger([-3.5, 0, 44], [3.5, 4, 47], () => onExit('hills', { scene: 'hills', at: 'north' }))
    // the east road to the Activation Peaks: a rockfall until Shard 5 is held
    const rocks = world.addSolid([44, 0, 4], [47, 8, 12])
    world.setEnabled(rocks, !roadOpen(6, getState().save.shards))
    const toPeaks = world.addTrigger([44.8, 0, 4], [47, 4, 12], () => { if (roadOpen(6, getState().save.shards)) onExit('peaks', { scene: 'peaks', at: 'west' }) })
    const into = world.addTrigger([-2, 0, CAUSEWAY.z[1] - 1], [2, 4, CAUSEWAY.z[1] + 1.5], () => { if (getState().save.t5crystals) onExit('palace', { scene: 'palace', room: 'entrance' }) })
    const ta = world.addInteractable({ pos: [TARTARA[0], 0, TARTARA[2] + 1.8], radius: 2.6, label: 'Speak with Sister Tartara', onInteract: () => talk() })
    const near = world.addTrigger([-12, 0, 0], [12, 4, 6], () => { if (!getState().save.metTartara) talk() })
    ids.push(back, into, ta, near, rocks, toPeaks)
    return () => ids.forEach((i) => world.remove(i))
  }, [world])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 5 ? 'Take the east road to the Activation Peaks' : !s.metTartara ? 'Walk down to the water' : !s.t5crystals ? 'Sort Sister Tartara’s crystals' : 'Cross the crystal causeway to the Mirror Palace' })
    if (!s.lakeSeen) {
      saveGame({ lakeSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'The lake is so still the palace is standing on its own reflection!' },
        { who: 'Pi', text: 'Look at the two spiral towers. One winds left, one winds right.' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#6a7a8a', wall: '#1a2030', pit: '#0c1428',
      labels: [{ pos: [0, 40], text: '↓ Chair Hills', align: 'center' }, { pos: [36, 8], text: 'Activation Peaks →', align: 'left' }, { pos: [0, -90], text: 'The Mirror Palace', align: 'center' }],
      goal: () => {
        const s = getState().save
        if (!s.metTartara || !s.t5crystals) return { pos: [TARTARA[0], TARTARA[2]], label: !s.metTartara ? 'Speak with Sister Tartara' : 'Sort Sister Tartara’s crystals' }
        if ((s.shards || 0) < 5) return { pos: [0, CAUSEWAY.z[1]], label: 'Cross to the Mirror Palace' }
        if ((s.shards || 0) < 7) return { pos: [45, 8], label: 'Take the east road to the Activation Peaks' }
        return { pos: [0, 42], label: 'Back to the Chair Hills' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talk = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metTartara) {
      saveGame({ metTartara: true })
      if (world.player) world.player.teleport([TARTARA[0] - 1.5, 0, TARTARA[2] + 2.4], Math.atan2(1.5, -2.4))
      world.camOverride = twoShot(world, TARTARA, 3.6, 0)
      setState({ tartaraShot: true })
      await say([
        { who: 'Sister Tartara', text: 'Mind the water: it copies everything. You, me, the palace. Even your little light.' },
        { who: 'Sister Tartara', text: 'I am Tartara. Sachse said you would come. I sort crystals: left here, right there. Patience, nothing else.' },
        { who: 'Sister Tartara', text: 'Malradix has decreed that a thing and its reflection are the same thing. He crowned a king made of both.' },
        { who: 'Pi', text: 'But a left glove doesn’t fit a right hand!' },
        { who: 'Sister Tartara', text: 'Quite. Show me you can tell them apart, and I will raise the causeway. Sort these for me.' },
      ])
      world.camOverride = null
      setState({ tartaraShot: false, objective: 'Sort Sister Tartara’s crystals' })
    } else if (!s.t5crystals) {
      await say([{ who: 'Sister Tartara', text: 'Turn them upright in your mind. Turning never changes a hand. Only a mirror does.' }])
    } else if ((s.shards || 0) < 5) {
      await say([{ who: 'Sister Tartara', text: s.hasShield ? 'You carry my Mirror Shield. Whatever it reflects becomes its other hand.' : 'My Mirror Shield is inside, past the Window. You will need it at the locks.' }])
    } else {
      await say([{ who: 'Sister Tartara', text: 'The water still copies everything. But now everyone knows a copy is not the same.' }])
    }
    busy.current = false
  }
  const sort = async () => {
    if (getState().save.t5crystals) return
    if (!getState().save.metTartara) { await talk(); return }
    const ok = await openPanel('pasteur', {})
    if (!ok) return
    saveGame({ t5crystals: true })
    sfx('open')
    setState({ objective: 'Cross the crystal causeway to the Mirror Palace' })
    await say([
      { who: 'Sister Tartara', text: 'Pasteur would have liked you. The causeway is yours.' },
      { who: 'Sister Tartara', text: 'Inside, the shades wear your face, backwards. Do not try to out-fight a mirror.' },
      { who: 'Sister Tartara', text: 'And take my glove. Right-handed, always. It grips both his halves, but never the same way.' },
    ])
  }

  return (
    <>
      <Night />
      <fog attach="fog" args={['#3a4a6a', 60, 230]} />
      <hemisphereLight args={['#c8d8ff', '#1a2030', 0.6]} />
      <ambientLight intensity={0.3} color="#c8d8ff" />
      <directionalLight position={[-60, 70, -100]} intensity={1.1} color="#e8f0ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} />
      <Slab world={{ addFloor: () => 0, remove: () => {} }} x0={-45} z0={SHORE_Z} x1={45} z1={45} visible={false} />
      <Lake />
      <Suspense fallback={null}>
        <Part model="palace" name="lk_shore" castShadow={false} receiveShadow />
        <Part model="palace" name="lk_hills" castShadow={false} />
        <Part model="palace" name="lk_palace" />
        {/* the reflection: the same palace, upside down beneath the still water */}
        <group scale={[1, -1, 1]} position={[0, -0.08, 0]}><Part model="palace" name="lk_palace" castShadow={false} /><Part model="palace" name="lk_hills" castShadow={false} /></group>
      </Suspense>
      <Causeway world={world} up={!!save.t5crystals} />
      <pointLight position={[0, 6, -90]} color="#bfe8ff" intensity={8} distance={40} />
      <Tartara position={TARTARA} rotation={[0, 0, 0]} />
      {!shot && <Tag position={[TARTARA[0], 2.4, TARTARA[2]]} df={8}>Sister Tartara</Tag>}
      <Station world={world} pos={[TARTARA[0] - 2.4, 0, TARTARA[2] + 1.6]} label={save.t5crystals ? null : 'Sort the crystals'} enabled={!save.t5crystals} solved={!!save.t5crystals} onUse={sort} />
      <Signpost pos={[3, 0, 40]} rotY={Math.PI} text="↓ Chair Hills · Mirror Palace ↑" />
      <Signpost pos={[41, 0, 3]} rotY={-Math.PI / 2} text="Activation Peaks →" />
      {!roadOpen(6, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[45.6, 0.8 + (i % 3) * 0.9, 5 + i * 1.1]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#5a6478" roughness={0.9} flatShading /></mesh>)}
      <Motes count={140} area={[80, 5, 50]} center={[0, 0.4, 18]} color="#dfe8ff" size={0.06} />
      <WolfPack world={world} spawns={[[-24, 26], [-20, 30], [-27, 31]]} tutorial={false} />
      <ImpPack world={world} spawns={[[18, 20], [22, 16], [16, 12]]} />
      <PiFollower world={world} />
    </>
  )
}

export default function MirrorLake({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromPalace = cp.at === 'gate', fromPeaks = cp.at === 'east'
  return (
    <GameScene start={fromPeaks ? [41, 0, 8] : fromPalace ? [0, 0, -4] : [0, 0, 40]} startFacing={fromPeaks ? -Math.PI / 2 : fromPalace ? 0 : Math.PI} background="#1a2440" camDist={6.2}>
      {(world) => <LakeLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
