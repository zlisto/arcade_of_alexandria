import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Leviathan, { Borana, Wraiths } from '../actors/OrchardFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { REAGENTS, ALTARS8, pour, GROVES8, SHEAR_HALVES, POLY } from '../chem/rules8'
import { W8 as W, ROOMS8, STATIONS8, ALTAR8_POS, DOORS8, TREES8, SHEARS, BARN, GOALS8, LEVI } from '../data/dungeon8'

// Dungeon 8 — Borana's Glasshouse (Chapter 8, Alkenes: Reactions and Synthesis). Greenhouse halls along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Reagent Satchel in a big chest, a Boss Key.
// The Satchel carries one flask from a grove tree; G pours it onto an alkene altar, which makes whatever that
// reagent makes. Each door wants one product (§8.2–8.9). Then a polymer chain by hand and a racemate (§8.10–8.12).

preloadModels('orchard', 'borana')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-140, -180] }
const flaskSpots = (room) => { const [x, z] = TREES8[room]; return GROVES8[room].map((r, i, a) => { const ang = -Math.PI / 2 + (i / Math.max(1, a.length - 1)) * Math.PI; return [r, x + 2.0 + Math.cos(ang) * 0.4, z + Math.sin(ang) * 2.0] }) }

function Walls({ world }) {
  const parts = useModelParts('orchard')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -138; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -142; z > -178; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -140], [-W, 9, 8]), world.addSolid([W, -9, -140], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -141], [-W, 9, -139]), world.addSolid([W, -9, -141], [ARENA.x, 9, -139]),
      ...Object.values(TREES8).map(([x, z]) => world.addSolid([x - 0.4, 0, z - 0.4], [x + 0.4, 4, z + 0.4])),
      ...Object.values(ALTAR8_POS).map(([x, z]) => world.addSolid([x - 0.6, 0, z - 0.6], [x + 0.6, 1.2, z + 0.6])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="g8_wall" items={items} />
}

/** whatever Kai is carrying, floating over his head */
function Carried({ world, what, label, color }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.3 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!what) return null
  return (
    <group ref={g}>
      <mesh><cylinderGeometry args={[0.12, 0.12, 0.42, 12]} /><meshStandardMaterial color="#e8f8f4" transparent opacity={0.5} /></mesh>
      <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.28, 12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} /></mesh>
      <pointLight color={color} intensity={1.4} distance={3.5} />
      <Tag position={[0, 0.55, 0]} df={9}>{label}</Tag>
    </group>
  )
}

function Shard({ show, pos }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current) { g.current.rotation.y = clock.elapsedTime * 1.5; g.current.position.y = 1.8 + Math.sin(clock.elapsedTime * 2) * 0.2 } })
  if (!show) return null
  return (
    <group position={[pos[0], 0, pos[2]]}>
      <group ref={g}>
        <mesh><cylinderGeometry args={[0.08, 0.08, 1.1, 8]} /><meshStandardMaterial color="#ffe08a" emissive="#ffcf4a" emissiveIntensity={3} toneMapped={false} /></mesh>
        <mesh position={[0, 0.6, 0]}><sphereGeometry args={[0.13, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh>
        <mesh position={[0, -0.6, 0]}><sphereGeometry args={[0.13, 10, 8]} /><meshBasicMaterial color="#9ff6ff" toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0, 2, 0]} color="#ffd76a" intensity={8} distance={12} />
    </group>
  )
}

function GlassLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [frag, setFrag] = useState(null) // a carried fragment in the shears room
  const fragRef = useRef(null)
  fragRef.current = frag
  const [chain, setChain] = useState(null) // { n, used: [] } while carrying a growing chain in the barn
  const chainRef = useRef(null)
  chainRef.current = chain
  const [barnPh, setBarnPh] = useState(false)
  const barnPhRef = useRef(false)
  barnPhRef.current = barnPh
  const [boranaHere, setBoranaHere] = useState(false)
  const alt = save.t8alt || {}
  const flask = save.t8flask || null
  const placedHalves = save.t8halves || {}

  useEffect(() => {
    world.map = {
      floor: '#a8c8a0', wall: '#3a4a34', pit: '#1a2414',
      labels: ROOMS8.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t8-map']) return null; const seen = sv.t8seen || {}; return ROOMS8.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t8-compass']) return null
        const g = GOALS8.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 8) return { pos: [0, -174], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Orchards' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('glasshouse')
    world.killY = -8
    const f = [world.addFloor(-W, -140, W, 8, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -139, 0)]
    const HINTS = {
      '8-1': 'Wraiths with golden shields. And a tree full of bromine. Hit them from behind!',
      '8-2': 'Two doors, one alkene, and both flasks add water. Read the doors.',
      '8-3': 'One door wants cis, one wants trans. Same alkene again.',
      '8-4': 'Giant shears! They cut double bonds in half.',
      '8-5': 'A barn full of ethylene. Something here grows on its own.',
    }
    const t = ROOMS8.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t8seen || {}
      saveGame({ checkpoint: { scene: 'glasshouse', room: r.id }, t8seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -146], [6, 6, -142], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t8-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Orchards', onInteract: () => onExit('orchard', { scene: 'orchard', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -88.9], radius: 2.2, label: () => (has('t8-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -138.9], radius: 2.4, label: () => (has('t8-bossdoor') ? null : 'Unlock the boss door'), onInteract: () => unlockBossDoor() }),
      world.addInteractable({ pos: [SHEARS.pos[0], 0, SHEARS.pos[1] + 1.3], radius: 1.8, label: () => (getState().save.t8cut ? null : 'Cut the alkene with the ozone shears'), onInteract: () => cut() }),
    ]
    // the grove trees: one flask each
    Object.keys(TREES8).forEach((room) => flaskSpots(room).forEach(([rg, x, z]) => {
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.0, label: () => (getState().save.hasSatchel && getState().save.t8flask !== rg ? `Take the flask: ${REAGENTS[rg].name}` : null), onInteract: () => { saveGame({ t8flask: rg }); sfx('pickup') } }))
    }))
    // the altars: pour with G
    const lanterns = ALTARS8.map((a) => {
      const [x, z] = ALTAR8_POS[a.id]
      return world.addLantern({ needs: 'hasSatchel', omni: true, pos: [x, 0, z], radius: 2.8, label: () => (has(a.id) ? null : getState().save.t8flask ? `Pour ${REAGENTS[getState().save.t8flask].name} on the ${((getState().save.t8alt || {})[a.id] || {}).sub === 'epoxide' ? 'epoxide' : a.title}` : null), onLantern: () => doPour(a) })
    })
    // the shears room: fragments and pedestals
    SHEAR_HALVES.forEach((h, i) => {
      const [x, z] = SHEARS.halves[i]
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.1, label: () => (getState().save.t8cut && !fragRef.current && !Object.values(getState().save.t8halves || {}).includes(h.id) && !has('8-4s') ? `Pick up: ${h.label}` : null), onInteract: () => { setFrag(h.id); sfx('pickup') } }))
    })
    Object.entries(SHEARS.peds).forEach(([side, [x, z]]) => {
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.3, label: () => (fragRef.current && !(getState().save.t8halves || {})[side] ? `Set it on the ${side === 'left' ? '(CH₃)₂C=' : '=CHCH₃'} pedestal` : null), onInteract: () => placeHalf(side) }))
    })
    // the barn
    const targets = [world.addTarget({ pos: () => [BARN.brazier[0], 0.8, BARN.brazier[1]], radius: 0.8, tall: 1.4, alive: () => !has('8-5p') && !chainRef.current, onHit: () => { setBarnPh(true); sfx('stomp'); toast('The peroxide’s O–O bond breaks: a Ph· radical (initiation). Take it!', 'good', 4200); return true } })]
    ia.push(world.addInteractable({ pos: [BARN.brazier[0], 0, BARN.brazier[1] + 1.3], radius: 1.6, label: () => (barnPhRef.current && !chainRef.current ? 'Take the Ph· radical' : null), onInteract: () => { setBarnPh(false); setChain({ n: 0, used: [] }); sfx('pickup') } }))
    BARN.monomers.forEach(([x, z], i) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.4, label: () => (chainRef.current && !chainRef.current.used.includes(i) ? 'Add this ethylene to your radical' : null), onInteract: () => addMonomer(i) })))
    ia.push(world.addInteractable({ pos: [BARN.other[0], 0, BARN.other[1]], radius: 1.8, label: () => (chainRef.current ? 'Meet the other growing chain' : null), onInteract: () => terminate() }))
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS8.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...lanterns, ...targets].forEach((i) => world.remove(i)) }
  }, [world])

  // the 8-4 room clears when the shears, the riddle and the carbene altar are all done
  useEffect(() => { if (!solved['8-4'] && solved['8-4s'] && solved['8-4back'] && solved['8-4c']) { markSolved('8-4'); sfx('open'); toast('The Shears room is done. The door opens.', 'good', 3000) } }, [solved['8-4s'], solved['8-4back'], solved['8-4c']])

  // ---------------------------------------------------------------- actions
  const doPour = (a) => {
    if (has(a.id)) return
    const sv = getState().save
    const rg = sv.t8flask
    if (!rg) { toast('The satchel is empty. Take a flask from the tree.', 'info', 3000); return }
    const all = sv.t8alt || {}
    const sub = (all[a.id] || {}).sub || a.sub
    const r = pour(a, sub, rg)
    saveGame({ t8flask: null })
    sfx('pickup')
    if (!r.product) { sfx('wrong'); toast(r.why, 'warn', 4400); return }
    if (r.next) { saveGame({ t8alt: { ...all, [a.id]: { sub: r.next, product: r.product } } }); toast(`${r.product}. ${r.why} The door still waits.`, 'info', 5600); return }
    if (r.ok) {
      saveGame({ t8alt: { ...all, [a.id]: { sub, product: r.product } } }); markSolved(a.id); sfx('open')
      toast(`${r.product}! ${r.why}`, 'good', 6000)
      return
    }
    sfx('wrong')
    saveGame({ t8alt: { ...all, [a.id]: { sub: a.sub, product: r.product, wrong: true } } })
    toast(`You made ${r.product}. ${r.why} The door wants ${a.want}.`, 'warn', 7000)
  }
  const cut = () => {
    if (getState().save.t8cut) return
    saveGame({ t8cut: true }); sfx('stomp'); world.shake = 0.3
    toast('Snip! The C=C is gone, and each carbon now has a C=O. Which two halves fell out?', 'good', 4600)
  }
  const placeHalf = (side) => {
    const id = fragRef.current
    if (!id) return
    const h = SHEAR_HALVES.find((x) => x.id === id)
    if (h.decoy || h.from !== side) {
      sfx('wrong'); setFrag(null)
      toast(h.decoy || `That half came from the other end: ${side === 'left' ? 'the (CH₃)₂C= end has two methyls, so it becomes a ketone' : 'the =CHCH₃ end keeps its H, so it becomes an aldehyde'}.`, 'warn', 5600)
      return
    }
    const next = { ...(getState().save.t8halves || {}), [side]: id }
    saveGame({ t8halves: next }); setFrag(null); sfx('right')
    if (next.left && next.right) { markSolved('8-4s'); toast('Acetone and acetaldehyde: a trisubstituted alkene gives one ketone and one aldehyde.', 'good', 5200) }
  }
  const addMonomer = (i) => {
    const c = chainRef.current
    if (!c || c.used.includes(i)) return
    const n = c.n + 1
    setChain({ n, used: [...c.used, i] }); sfx('pickup')
    toast(n === 1 ? 'Ph· adds to ethylene: one bond forms, and the radical moves to the end (propagation).' : `Another ethylene: the chain is ${n} long, still a radical at the end.`, 'good', 3600)
  }
  const terminate = () => {
    const c = chainRef.current
    if (!c || has('8-5p')) return
    if (c.n < POLY.need) { toast(`Your chain is only ${c.n} monomers long. Grow it to ${POLY.need} first.`, 'warn', 3200); return }
    setChain(null); markSolved('8-5p'); sfx('open')
    toast('Two growing chains meet and their radicals pair: termination. One long polymer, finished.', 'good', 4800)
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: Water is water. Every way of adding it to a double bond gives the same alcohol.' },
      { who: 'Pi', text: 'Borana pinned a note under it: “Prove it.”' },
    ])
    markSolved('t8-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t8-door')) return
    if (!getState().save.t8key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t8key: false }); markSolved('t8-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t8-bossdoor')) return
    if (!has('t8-bosskey')) { toast('A glass door clouded violet. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t8-bossdoor'); sfx('open'); toast('The Boss Key turns. Something long is moving in the hothouse…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't8-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't8-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't8-key') { saveGame({ t8key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't8-satchel') {
      saveGame({ hasSatchel: true })
      await itemGet(world, { model: 'borana', name: 't8_satchel', scale: 2.0, color: '#7ae8ff' }, [
        { who: '', text: 'You got the Reagent Satchel!' },
        { who: 'Pi', text: 'Take a flask from a tree (E), then pour it on an altar (G). One flask at a time.' },
        { who: 'Pi', text: 'Every flask makes something. Read the door first, so it makes the right thing!' },
      ])
    }
    if (id === 't8-bosskey') { saveGame({ t8bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss8') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -143]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t8bossIntro) {
      saveGame({ t8bossIntro: true })
      world.camOverride = { pos: [4, 6, -144], look: [LEVI.center[0], 1, LEVI.center[2]] }
      await say([
        { who: 'Pi', text: 'The Polymer Leviathan! Its head is a radical. Every egg it eats is one more segment.' },
        { who: 'Pi', text: 'You can’t cut a growing chain. You have to end it. Two radicals pair up and stop!' },
        { who: 'Pi', text: 'Hit that peroxide vent, grab the radical, and take it to the head!' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Vent, radical, head. End the chain!' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss8')
    playMusic('glasshouse')
    await say([
      { who: 'Pi', text: 'It’s just a long, quiet chain now. Polyethylene!' },
      { who: 'Pi', text: 'The spark shot out through the roof. East, toward those cliffs. The shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 8 || busy.current) return
    busy.current = true
    sfx('shard')
    setBoranaHere(true)
    if (world.player) world.player.teleport([0, 0, -172.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -172.4], 3.8, Math.PI / 2)
    await say([{ who: 'Alchemist Borana', text: 'Before you pocket that. One question. Then I’ll believe you were paying attention.' }])
    const ok = await openPanel('leviCheck', {})
    if (!ok) { await say([{ who: 'Alchemist Borana', text: 'Think. Then come back.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 8, checkpoint: { scene: 'orchard', at: 'gate' } })
    setState({ objective: 'Bond Shard 8 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… eight. The orchards are fruiting again. I can see them from my window.' },
      { who: 'Princess Octavia', text: 'He said water is water. You opened two doors with it.' },
      { who: 'Alchemist Borana', text: 'Keep the satchel. Lindlar’s cliffs are east. Bring her something to argue about.' },
      { who: 'Pi', text: 'Eight down, four to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'orchard', at: 'gate' }, card: 8 })
    busy.current = false
    onExit('orchard', { scene: 'orchard', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -174], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss8 && (getState().save.shards || 0) < 8)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 7, pitchSet: 0.55, lookY: 0.8 } : null })

  const fl = flask ? REAGENTS[flask] : null
  return (
    <group>
      <color attach="background" args={['#14201a']} />
      <fog attach="fog" args={['#1e2e24', 18, 70]} />
      <hemisphereLight args={['#e8ffe8', '#1e2e24', 0.9]} />
      <ambientLight intensity={0.35} color="#e8fff0" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#f0fff0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <mesh position={[0, -0.01, -66]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, 148]} /><meshStandardMaterial color="#8a9a7a" roughness={0.9} /></mesh>
      <mesh position={[0, -0.01, -160]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial color="#6a7a5a" roughness={0.9} /></mesh>
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -26, -40, -52, -70, -84, -98, -110, -122, -134].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#b8ffb0" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a3a2a" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t8-map']} onOpen={() => openChest('t8-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>Borana’s Glasshouse</Tag>

      {/* the grove trees and their flasks */}
      <Suspense fallback={null}>
        {Object.entries(TREES8).map(([room, [x, z]]) => <Part key={room} model="orchard" name="g8_tree" position={[x, 0, z]} />)}
      </Suspense>
      {Object.keys(TREES8).map((room) => flaskSpots(room).map(([rg, x, z]) => (
        <group key={room + rg} position={[x, 0, z]}>
          <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.25, 0.3, 0.8, 10]} /><meshStandardMaterial color="#6a5a3a" /></mesh>
          {flask !== rg && <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.36, 10]} /><meshStandardMaterial color={REAGENTS[rg].color} emissive={REAGENTS[rg].color} emissiveIntensity={0.7} transparent opacity={0.9} /></mesh>}
          <Tag position={[0, 1.7, 0]} df={8} far={10}>{REAGENTS[rg].name}</Tag>
        </group>
      )))}
      <Carried world={world} what={flask} label={fl ? fl.name : ''} color={fl ? fl.color : '#fff'} />

      {/* altars and doors */}
      {ALTARS8.map((a) => {
        const [x, z] = ALTAR8_POS[a.id]
        const st = alt[a.id] || {}
        const done = !!solved[a.id]
        return (
          <group key={a.id} position={[x, 0, z]}>
            <Suspense fallback={null}><Part model="orchard" name="g8_altar" /></Suspense>
            <mesh position={[0, 1.15, 0]}><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color={done ? '#9affb8' : st.wrong ? '#ff9a8a' : '#d8d0e8'} emissive={done ? '#2a8a4a' : st.wrong ? '#8a2a2a' : '#3a3a5a'} emissiveIntensity={0.7} /></mesh>
            <Tag position={[0, 2.3, 0]} df={10} far={14} className={done ? 'ok-tag' : ''}>{st.product ? (done ? st.product : st.wrong ? `made: ${st.product}` : st.product) : a.title}</Tag>
            <Tag position={[0, 2.9, 0]} df={9} far={14}>{`wants: ${a.want}`}</Tag>
          </group>
        )
      })}
      <Wraiths world={world} spawns={[[-4, -26], [4, -28], [0, -32]]} active={!solved['t8-wraiths']} zone={[-16, -44]} onCleared={() => { if (!has('t8-wraiths')) { markSolved('t8-wraiths'); sfx('open'); toast('The wraiths are gone. A big chest rises!', 'good', 3000) } }} />
      <Chest world={world} pos={[0, 0, -25]} big opened={!!solved['t8-satchel']} show={!!solved['t8-wraiths']} onOpen={() => openChest('t8-satchel')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, DOORS8['8-1']]} size={[2 * W, 7, 0.8]} open={!!(solved['8-1a'] && solved['8-1b'])} color="#3a5a3a" glow="#c86a3a" />
      <Gate world={world} pos={[0, 0, DOORS8['8-2']]} size={[2 * W, 7, 0.8]} open={!!(solved['8-2a'] && solved['8-2b'])} color="#3a5a3a" glow="#8ad0ff" />
      <Chest world={world} pos={[7.6, 0, -62]} rotY={-Math.PI / 2} opened={!!solved['t8-compass']} onOpen={() => openChest('t8-compass')} />
      <Chest world={world} pos={[0, 0, -87]} opened={!!solved['t8-key']} show={!!(solved['8-3a'] && solved['8-3b'])} onOpen={() => openChest('t8-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -89.5]} size={[2 * W, 7, 0.8]} open={!!solved['t8-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -89.1]} df={13}>{solved['t8-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 8-4 the ozone shears */}
      <group position={[SHEARS.pos[0], 0, SHEARS.pos[1]]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[3.2, 1.0, 1.4]} /><meshStandardMaterial color="#5a5a62" metalness={0.5} roughness={0.4} /></mesh>
        {!save.t8cut && <>
          <mesh position={[-0.6, 1.4, 0]}><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color="#3a3640" /></mesh>
          <mesh position={[0.6, 1.4, 0]}><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color="#3a3640" /></mesh>
          {[-0.1, 0.1].map((dy) => <mesh key={dy} position={[0, 1.4 + dy, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, 1.0, 8]} /><meshStandardMaterial color="#5ff0ff" emissive="#2ab0d0" emissiveIntensity={0.8} /></mesh>)}
        </>}
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.5, 2.6, 0]} rotation={[0, 0, s * (save.t8cut ? 0.2 : 0.6)]}><boxGeometry args={[0.2, 1.8, 0.1]} /><meshStandardMaterial color="#c8c8d8" metalness={0.8} roughness={0.25} /></mesh>)}
        <Tag position={[0, 3.8, 0]} df={11} far={16}>{save.t8cut ? 'cut: O₃, then Zn' : '2-methyl-2-butene, (CH₃)₂C=CHCH₃'}</Tag>
      </group>
      {save.t8cut && SHEAR_HALVES.map((h, i) => {
        const [x, z] = SHEARS.halves[i]
        const gone = Object.values(placedHalves).includes(h.id) || frag === h.id
        return (
          <group key={h.id} position={[x, 0, z]}>
            <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.35, 0.4, 0.8, 10]} /><meshStandardMaterial color="#6a6a62" /></mesh>
            {!gone && <mesh position={[0, 1.0, 0]}><octahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#e8d0a0" emissive="#8a6a3a" emissiveIntensity={0.5} /></mesh>}
            {!gone && <Tag position={[0, 1.6, 0]} df={8} far={10}>{h.label}</Tag>}
          </group>
        )
      })}
      {Object.entries(SHEARS.peds).map(([side, [x, z]]) => (
        <group key={side} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.4, 1.0, 1.4]} /><meshStandardMaterial color="#8a8478" /></mesh>
          {placedHalves[side] && <mesh position={[0, 1.3, 0]}><octahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#9affb8" emissive="#2a8a4a" emissiveIntensity={0.6} /></mesh>}
          <Tag position={[0, 2.0, 0]} df={9} far={12}>{placedHalves[side] ? SHEAR_HALVES.find((h) => h.id === placedHalves[side]).label : side === 'left' ? 'from the (CH₃)₂C= end' : 'from the =CHCH₃ end'}</Tag>
        </group>
      ))}
      {frag && <Carried world={world} what={frag} label={SHEAR_HALVES.find((h) => h.id === frag).label} color="#e8d0a0" />}
      <Gate world={world} pos={[0, 0, -113.5]} size={[2 * W, 7, 0.8]} open={!!solved['8-4']} color="#3a5a3a" glow="#7ae8ff" />

      {/* 8-5 the chain barn */}
      <group position={[BARN.brazier[0], 0, BARN.brazier[1]]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.6, 0.8, 1.0, 10]} /><meshStandardMaterial color="#5a4a3a" /></mesh>
        <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.45, 0.45, 0.1, 12]} /><meshStandardMaterial color="#ff8a3a" emissive="#ff5a1a" emissiveIntensity={1.4} /></mesh>
        {barnPh && <mesh position={[0, 1.8, 0]}><sphereGeometry args={[0.28, 14, 10]} /><meshStandardMaterial color="#ffd060" emissive="#ffb020" emissiveIntensity={1.4} /></mesh>}
        <Tag position={[0, 2.6, 0]} df={10}>{solved['8-5p'] ? 'the peroxide brazier' : 'benzoyl peroxide: strike to heat it'}</Tag>
      </group>
      {BARN.monomers.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.5, 0.6, 0.7, 10]} /><meshStandardMaterial color="#6a5a4a" /></mesh>
          <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color={chain && chain.used.includes(i) ? '#5a5a5a' : '#e8f0ff'} emissive="#8ab0ff" emissiveIntensity={chain && chain.used.includes(i) ? 0 : 0.5} /></mesh>
          <Tag position={[0, 1.6, 0]} df={8} far={12}>CH₂=CH₂</Tag>
        </group>
      ))}
      <group position={[BARN.other[0], 0, BARN.other[1]]}>
        {!solved['8-5p'] && [...Array(5)].map((_, k) => <mesh key={k} position={[-k * 0.5, 1.0 + Math.sin(k) * 0.15, 0]}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color="#b8a0e8" emissive={k === 0 ? '#c070ff' : '#000'} emissiveIntensity={k === 0 ? 1.4 : 0} /></mesh>)}
        <Tag position={[0, 2.0, 0]} df={9} far={12}>{solved['8-5p'] ? 'one long polymer' : 'another growing chain, R·'}</Tag>
      </group>
      {chain && <Carried world={world} what="chain" label={`Ph–(CH₂CH₂)${chain.n}·`} color="#ffd060" />}
      <Chest world={world} pos={[0, 0, -137.5]} big opened={!!solved['t8-bosskey']} show={!!(solved['8-5p'] && solved['8-5race'])} onOpen={() => openChest('t8-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -140]} size={[2 * W, 7, 0.8]} open={!!solved['t8-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS8).map(([id, st]) => {
        const once = ['8-4back', '8-5race'].includes(id)
        return (
          <Station key={id} world={world} pos={st.pos} label={once && solved[id] ? null : st.label} enabled={!(once && solved[id])} solved={!!solved[id]}
            onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id); if (id === '8-5race') { sfx('open'); toast('Both locks turn at once: (R) and (S), half and half.', 'good', 3200) } }} />
        )
      })}

      {/* boss */}
      {!solved.boss8 && <Leviathan world={world} center={LEVI.center} R={LEVI.R} vent={[-11, 0, -152]} active={bossOn && !solved.boss8} onDefeated={bossDown} />}
      {boranaHere && <Borana position={[-2.2, 0, -172.4]} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss8 && (save.shards || 0) < 8} pos={[0, 0, -174]} />
      <Motes count={180} area={[20, 7, 180]} center={[0, 0.6, -85]} color="#d8ffd0" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Glasshouse({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'glasshouse' ? ROOMS8.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#14201a" camDist={6.2}>
      {(world) => <GlassLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
