import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { Spectra } from '../actors/SummitFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, openPanel, useGame } from '../engine/store'
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

function SummitLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.spectraShot)
  const busy = useRef(false)

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

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 12 ? 'All twelve Bond Shards! The Keep’s wards are down (the finale is coming soon)' : !s.metSpectra ? 'Climb to the observatory' : !s.t12scope ? 'Set Spectra’s telescope' : 'Enter the Observatory' })
    if (!s.summitSeen) {
      saveGame({ summitSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'We’re above the clouds! And that crystal is splitting starlight into a rainbow.' },
        { who: 'Pi', text: 'The last shard is in that dome. I can feel it humming.' },
      ]), 900)
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
        { who: 'Astronomer Spectra', text: 'Walden’s challenger? A violet spark streaked up the mountain an hour ahead of you. Brave, climbing after it in the dark.' },
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
      await say([{ who: 'Astronomer Spectra', text: 'Twelve. The Keep’s wards are falling, I can see it from here. Whatever comes next, look carefully.' }])
    }
    busy.current = false
  }
  const useScope = async () => {
    if (getState().save.t12scope) return
    if (!getState().save.metSpectra) { await talk(); return }
    const ok = await openPanel('telescope', {})
    if (!ok) return
    saveGame({ t12scope: true }); sfx('open')
    setState({ objective: 'Enter the Observatory' })
    await say([{ who: 'Astronomer Spectra', text: 'Infrared, just past red. That’s the light bonds answer to. The door is open.' }])
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
      <Tag position={[0, 5.0, DOOR_Z + 0.5]} df={14}>{save.t12scope ? 'The Observatory' : 'The Observatory · locked'}</Tag>
      <Spectra position={SPECTRA} rotation={[0, 0.6, 0]} />
      {!shot && <Tag position={[SPECTRA[0], 2.4, SPECTRA[2]]} df={8}>Astronomer Spectra</Tag>}
      <Station world={world} pos={SCOPE} label={save.t12scope ? null : 'Set the telescope’s filters'} enabled={!save.t12scope} solved={!!save.t12scope} onUse={useScope} />
      <group position={[SCOPE[0] + 1.6, 0, SCOPE[2] - 1.0]}>
        <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.06, 0.1, 1.4, 8]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.3} /></mesh>
        <mesh position={[0, 1.5, 0.2]} rotation={[-0.8, 0, 0]}><cylinderGeometry args={[0.12, 0.18, 1.4, 14]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.3} /></mesh>
      </group>
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
