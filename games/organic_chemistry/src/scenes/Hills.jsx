import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import GameScene from '../engine/GameScene'
import { Slab, Station, Signpost, Motes, Tag, twoShot } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import WolfPack from '../actors/WolfPack'
import { ImpPack } from '../actors/Critters'
import AxialOgres from '../actors/AxialOgres'
import { Sachse, SachseThrone } from '../actors/SachseModel'
import { PiFollower } from './Village'
import { getState, setState, saveGame, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { roadOpen } from '../data/release'

// The Chair Hills — World 4's route and prep. Rolling olive-gold hills under a violet sky; on the ridge the
// Chair Fortress: a six-sided palace whose walls rise and fall like a chair's carbons, a cramped triangular
// tower, a square keep (assets/locations/world-4-chair-fortress.png). Lady Sachse waits at the drawbridge
// and lowers it once Kai can number a ring (§4.1). Built in Blender (tools/fortress_blender.py).

preloadModels('fortress', 'sachse', 'giants', 'critters')
const HALF = 50
const SACHSE = [4.6, 0, -36.5]
const BANNERS = [-3.8, 0, -36.2]
const BRIDGE_Z = -46.4 // the drawbridge hinge (it runs toward +z when lowered)

/** A gradient sky dome: deep violet overhead, a warm amber band at the horizon (concept art). */
function SkyDome() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#2a1a3e'); gr.addColorStop(0.45, '#5a3a6a'); gr.addColorStop(0.62, '#a0586a'); gr.addColorStop(0.72, '#e0a060'); gr.addColorStop(1, '#5a4a50')
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return <mesh><sphereGeometry args={[260, 32, 16]} /><meshBasicMaterial map={tex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
}

/** Malradix's red lightning in the clouds over the fortress (concept art), flickering now and then. */
function Lightning() {
  const g = useRef()
  const bolts = useMemo(() => [...Array(4)].map((_, i) => {
    const pts = []
    let x = -40 + i * 26, y = 70
    for (let k = 0; k < 7; k++) { pts.push(new THREE.Vector3(x, y, -150)); x += (Math.sin(i * 7 + k * 3) * 9); y -= 5 }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }), [])
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    g.current.children.forEach((l, i) => { l.material.opacity = Math.max(0, Math.sin(t * 0.9 + i * 1.7) - 0.85) * 6 })
  })
  return <group ref={g}>{bolts.map((b, i) => <line key={i} geometry={b}><lineBasicMaterial color="#ff4a7a" transparent opacity={0} fog={false} toneMapped={false} /></line>)}</group>
}

function Drawbridge({ world, down }) {
  const g = useRef(), a = useRef(down ? 0 : -1.45)
  const id = useRef(null)
  useEffect(() => { id.current = world.addSolid([-4, 0, BRIDGE_Z - 2.5], [4, 9, BRIDGE_Z + 0.3]); return () => world.remove(id.current) }, [world])
  useEffect(() => { world.setEnabled(id.current, !down) }, [down])
  useFrame((_, dt) => { a.current += ((down ? 0 : -1.45) - a.current) * Math.min(1, dt * 1.2); if (g.current) g.current.rotation.x = a.current })
  return <group ref={g} position={[0, 0.05, BRIDGE_Z]}><Part model="fortress" name="hl_drawbridge" /></group>
}

/** A pen of stakes around the ogre on the road: it can glower, not reach. */
function Pen({ world, c, r = 3.4 }) {
  useEffect(() => {
    const ids = []
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; const x = c[0] + Math.sin(a) * r, z = c[1] + Math.cos(a) * r; ids.push(world.addSolid([x - 0.4, 0, z - 0.4], [x + 0.4, 2.2, z + 0.4])) }
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return (
    <group position={[c[0], 0, c[1]]}>
      {[...Array(14)].map((_, k) => { const a = (k / 14) * Math.PI * 2; return <mesh key={k} position={[Math.sin(a) * r, 1.0, Math.cos(a) * r]} rotation={[0, 0, (k % 2 ? 1 : -1) * 0.1]} castShadow><cylinderGeometry args={[0.16, 0.22, 2.0, 6]} /><meshStandardMaterial color="#5a4030" roughness={0.9} /></mesh> })}
      <Tag position={[0, 3.6, 0]} df={12}>Axial Ogre · penned</Tag>
    </group>
  )
}

function HillsLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const shot = useGame((s) => !!s.sachseShot)
  const busy = useRef(false)

  useEffect(() => {
    playMusic('hills')
    const ids = [
      world.addSolid([-HALF - 2, 0, -HALF], [-HALF, 8, 2]), world.addSolid([-HALF - 2, 0, 10], [-HALF, 8, HALF]),
      world.addSolid([HALF, 0, -HALF], [HALF + 2, 8, -36]), world.addSolid([HALF, 0, -28], [HALF + 2, 8, HALF]), world.addSolid([-HALF, 0, HALF], [HALF, 8, HALF + 2]),
      // the curtain wall and the gatehouse towers (the drawbridge fills the gap)
      world.addSolid([-HALF, 0, -HALF - 2], [-4, 12, -47.2]), world.addSolid([4, 0, -HALF - 2], [HALF, 12, -47.2]),
      world.addSolid([SACHSE[0] - 0.4, 0, SACHSE[2] - 0.4], [SACHSE[0] + 0.4, 1.9, SACHSE[2] + 0.4]),
      world.addSolid([SACHSE[0] + 1.3, 0, SACHSE[2] - 2.5], [SACHSE[0] + 3.0, 2.4, SACHSE[2] - 0.8]), // her throne
    ]
    const back = world.addTrigger([-HALF - 2, 0, 2], [-HALF + 1.2, 4, 10], () => onExit('forest', { scene: 'forest', at: 'east' }))
    // the east road to the Mirror Lake: a rockfall until Shard 4 is held
    const rocks = world.addSolid([HALF - 1, 0, -36], [HALF + 2, 8, -28])
    world.setEnabled(rocks, !roadOpen(5, getState().save.shards))
    const toLake = world.addTrigger([HALF - 1.2, 0, -36], [HALF + 2, 4, -28], () => { if (roadOpen(5, getState().save.shards)) onExit('lake', { scene: 'lake', at: 'south' }) })
    ids.push(rocks, toLake)
    const into = world.addTrigger([-3.5, 0, -50], [3.5, 4, BRIDGE_Z - 1.0], () => { if (getState().save.t4rings) onExit('fortress', { scene: 'fortress', room: 'entrance' }) })
    const sa = world.addInteractable({ pos: SACHSE, radius: 2.6, label: 'Speak with Lady Sachse', onInteract: () => talkSachse() })
    const near = world.addTrigger([-10, 0, -32], [10, 4, -26], () => { if (!getState().save.metSachse) talkSachse() })
    ids.push(back, into, sa, near)
    if (import.meta.env.DEV) { window.__valence = window.__valence || {}; window.__valence.hills = { talk: () => talkSachse() } }
    return () => ids.forEach((i) => world.remove(i))
  }, [world])

  useEffect(() => {
    const s = getState().save
    setState({ objective: (s.shards || 0) >= 4 ? 'Take the east road to the Mirror Lake' : !s.metSachse ? 'Follow the road to the fortress' : !s.t4rings ? 'Name Lady Sachse\'s banner rings' : 'Cross the drawbridge into the Chair Fortress' })
    if (!s.hillsSeen) {
      saveGame({ hillsSeen: true })
      setTimeout(() => say([
        { who: 'Pi', text: 'A fortress shaped like a chair! The walls go up, down, up, down, all the way round.' },
        { who: 'Pi', text: 'And a squashed little triangle tower beside it. That one looks uncomfortable.' },
      ]), 900)
    }
  }, [])

  useEffect(() => {
    world.map = {
      floor: '#7a7a4a', wall: '#2a2638', pit: '#141020',
      labels: [
        { pos: [-HALF + 6, 6], text: '← Chain Forest', align: 'left' },
        { pos: [0, -44], text: 'The Chair Fortress', align: 'center' },
        { pos: [HALF - 10, -32], text: 'Mirror Lake →', align: 'left' },
      ],
      goal: () => {
        const s = getState().save
        if (!s.metSachse) return { pos: [SACHSE[0], SACHSE[2]], label: 'Speak with Lady Sachse' }
        if (!s.t4rings) return { pos: [BANNERS[0], BANNERS[2]], label: 'Name the banner rings' }
        if ((s.shards || 0) < 4) return { pos: [0, -47], label: 'Enter the Chair Fortress' }
        if ((s.shards || 0) < 6) return { pos: [HALF - 1, -32], label: 'Take the east road to the Mirror Lake' }
        return { pos: [-HALF + 2, 6], label: 'Back to the Chain Forest' }
      },
    }
    return () => { world.map = null }
  }, [world])

  const talkSachse = async () => {
    if (busy.current) return
    busy.current = true
    const s = getState().save
    if (!s.metSachse) {
      saveGame({ metSachse: true })
      // place Kai on a mark facing her, then a side-on two-shot of the pair
      if (world.player) world.player.teleport([2.6, 0, -34.8], Math.atan2(SACHSE[0] - 2.6, SACHSE[2] + 34.8))
      world.camOverride = twoShot(world, SACHSE, 3.6, -0.6)
      setState({ sachseShot: true })
      await say([
        { who: 'Lady Sachse', text: 'A carbon knight, and a very small light. I am Sachse, Lady of the Chair.' },
        { who: 'Lady Sachse', text: 'A lady sits only where nothing strains. My throne room was such a place.' },
        { who: 'Lady Sachse', text: 'Then Malradix posted a decree: rings are flat, so every ring is strained. And he sent a Titan.' },
        { who: 'Lady Sachse', text: 'It sits wherever it pleases. Equatorially, of course. I have not sat down in a month.' },
        { who: 'Pi', text: 'We\'ll get your throne back! We\'ve beaten a Colossus, a Hydra and a Serpent.' },
        { who: 'Lady Sachse', text: 'Charming. I lower my drawbridge for those who can number a ring. Courtiers who cannot, I keep outside.' },
        { who: 'Lady Sachse', text: 'My banner rings are by the gate. Number each one properly and the bridge is yours.' },
      ])
      world.camOverride = null
      setState({ sachseShot: false, objective: 'Name Lady Sachse\'s banner rings' })
    } else if (!s.t4rings) {
      await say([{ who: 'Lady Sachse', text: 'Start at a substituent. The next one takes the lowest number you can manage. If it ties, the alphabet decides.' }])
    } else if ((s.shards || 0) < 4) {
      await say([{ who: 'Lady Sachse', text: s.hasGauntlet ? 'You wear my Gauntlet. Flip the Titan\'s seat and let the ring do the rest.' : 'My Ring-Flip Gauntlet lies in the throne room. Without it, the Titan never leaves its comfortable seat.' }])
    } else {
      await say([{ who: 'Lady Sachse', text: 'I sat down this morning. Nothing strained at all. Thank you, Sir Kai.' }])
    }
    busy.current = false
  }

  const useBanners = async () => {
    if (getState().save.t4rings) return
    if (!getState().save.metSachse) { await talkSachse(); return }
    const ok = await openPanel('ringNames', {})
    if (!ok) return
    saveGame({ t4rings: true })
    sfx('open')
    setState({ objective: 'Cross the drawbridge into the Chair Fortress' })
    await say([
      { who: 'Lady Sachse', text: 'You number like a courtier. The drawbridge is yours.' },
      { who: 'Lady Sachse', text: 'Inside, mind the ogres. They are comfortable, and comfortable things are hard to move.' },
      { who: 'Pi', text: 'Did she just compliment you? I think she did!' },
    ])
  }

  return (
    <>
      <SkyDome />
      <Lightning />
      <fog attach="fog" args={['#6a4a6a', 40, 170]} />
      <hemisphereLight args={['#ffd8b0', '#4a3a50', 0.75]} />
      <ambientLight intensity={0.25} color="#ffd8c8" />
      <directionalLight position={[-40, 30, 20]} intensity={1.6} color="#ffc890" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
      <Slab world={world} x0={-HALF} z0={-HALF} x1={HALF} z1={HALF} color="#8a8a4c" visible={false} />
      <Suspense fallback={null}>
        <Part model="fortress" name="hl_ground" castShadow={false} receiveShadow />
        <Part model="fortress" name="hl_hills" castShadow={false} receiveShadow />
        <Part model="fortress" name="hl_road" castShadow={false} receiveShadow />
        <Part model="fortress" name="hl_fortress" receiveShadow />
      </Suspense>
      <Drawbridge world={world} down={!!save.t4rings} />
      <pointLight position={[0, 5, -45]} color="#ffb070" intensity={4} distance={14} />
      <Sachse position={SACHSE} rotation={[0, -0.6, 0]} />
      <SachseThrone position={[SACHSE[0] + 2.2, 0, SACHSE[2] - 1.6]} rotation={[0, -0.4, 0]} scale={0.9} />
      {!shot && <Tag position={[SACHSE[0], 2.3, SACHSE[2]]} df={8}>Lady Sachse</Tag>}
      <Station world={world} pos={BANNERS} label={save.t4rings ? null : 'Name the banner rings'} enabled={!save.t4rings} solved={!!save.t4rings} onUse={useBanners} />
      {[-1, 1].map((s) => (
        <group key={s} position={[BANNERS[0] + s * 1.6, 0, BANNERS[2] - 0.6]}>
          <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[0.06, 0.06, 3.6, 6]} /><meshStandardMaterial color="#3a3650" /></mesh>
          <mesh position={[0, 2.6, 0.05]}><planeGeometry args={[1.0, 1.4]} /><meshStandardMaterial color="#6a3aa8" side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 2.6, 0.08]}><torusGeometry args={[0.3, 0.04, 6, s > 0 ? 6 : 5]} /><meshStandardMaterial color="#dcdcea" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      ))}
      <Pen world={world} c={[-20, -22]} />
      <AxialOgres world={world} spawns={[[-20, -22]]} decor active />
      <Signpost pos={[-HALF + 5, 0, 2]} rotY={Math.PI / 2} text="← Chain Forest · Fortress ↑" />
      <Signpost pos={[HALF - 5, 0, -27]} rotY={-Math.PI / 2} text="Mirror Lake →" />
      {!roadOpen(5, save.shards) && [...Array(7)].map((_, i) => <mesh key={'rk' + i} position={[HALF - 0.8, 0.8 + (i % 3) * 0.9, -35 + i * 1.1]} castShadow><dodecahedronGeometry args={[1.0, 0]} /><meshStandardMaterial color="#6a6478" roughness={0.9} flatShading /></mesh>)}
      <Motes count={120} area={[90, 6, 90]} center={[0, 0.5, 0]} color="#ffe0b0" size={0.07} />
      <WolfPack world={world} spawns={[[-30, 18], [-26, 22], [-32, 24]]} tutorial={false} />
      <ImpPack world={world} spawns={[[14, -8], [18, -12], [10, -16]]} />
      <PiFollower world={world} />
    </>
  )
}

export default function Hills({ onExit }) {
  const cp = getState().save.checkpoint || {}
  const fromFortress = cp.at === 'gate', fromLake = cp.at === 'north'
  return (
    <GameScene start={fromLake ? [HALF - 4, 0, -32] : fromFortress ? [0, 0, -40] : [-HALF + 4, 0, 6]} startFacing={fromLake ? -Math.PI / 2 : fromFortress ? 0 : Math.PI / 2} background="#3a2a4a" camDist={6.2}>
      {(world) => <HillsLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
