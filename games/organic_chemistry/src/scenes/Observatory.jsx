import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Sorcerer, { Spectra, Phantoms } from '../actors/SummitFolk'
import { Octavia } from '../actors/OctaviaModel'
import { PiFollower } from './Village'
import { NoticeBoard } from './SunkenDressing'
import { MarbleFlags, StarCeiling, EntranceWall, Plinth, PlaqueStand, IsoDoor, MagnetArc, GreatLens, TelescopeHall, CrownBeat } from './ObservatoryDressing'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { PLAQUES, DOOR_RULE, PLAQUE_NOTE, BELLS, N_BELLS, BELL_PAIR, MS, dealPlaques, msWindow, shuffled, readMs } from '../chem/rules12'
import { MSOf } from '../ui/Panels12'
import { W12 as W, ROOMS12, STATIONS12, PLAQUE_SLOTS, DOOR_SLOTS, ISO_DOORS, BELL_SLOTS, GOALS12, SORC, FIGHT_GATE_Z, BOSS_Z, SHARD12 } from '../data/dungeon12'

// Dungeon 12 — the Observatory of Light (Chapter 12, Mass Spectrometry and Infrared Spectroscopy). Rooms along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Spectra Lens in a big chest, a Boss Key.
// Puzzles: hexane's fragments and two unlabeled samples (§12.1–12.2); isotope plaques to their doors (§12.3); the
// dome's lens on the IR band (§12.5); IR bells named by their bands (§12.6–12.8); the Disguised Sorcerer. The finale:
// his false shape breaks, Pi pairs his lone electron, the twelve shards make the Crown again, and Octavia walks free.

preloadModels('spectra', 'intro')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-110, -150] }
const TWO = { display: 'block', whiteSpace: 'normal', width: 'max-content', textAlign: 'center', lineHeight: 1.25 }
const nw = (t) => String(t).split(' · ').map((p, i) => <span key={i}>{i ? <br /> : null}<span style={{ whiteSpace: 'nowrap' }}>{p}</span></span>)
const portrait = () => Math.max(1, 1.2 / (window.innerWidth / Math.max(1, window.innerHeight))) // backs a shot off in portrait
const WARD_AT = [0, 15.5, -150.8] // the Keep's wards, seen far off in the dome's slit (just inside the dome, over the far wall)
const SHARD_Z = SHARD12[2] + 1.8 // where Kai stands to take the shard: the shard just behind him, the telescope pier beyond

/** per visit: which five plaques stand where (placed ones kept, every door covered) and the window each shows on its
 *  M⁺ region; which door where; which five bells hang where (rung ones kept; the ketone and nitro bells first) */
function layout() {
  const sv = getState().save
  const rung = sv.t12bells || {}
  const have = BELLS.filter((b) => rung[b.id]).map((b) => b.id)
  const free = shuffled(BELLS.filter((b) => !rung[b.id]).map((b) => b.id)).sort((a, b) => BELL_PAIR.includes(b) - BELL_PAIR.includes(a))
  const rest = free.slice(0, Math.max(0, N_BELLS - have.length))
  const plaques = dealPlaques(sv.t12placed || {})
  return {
    plaques,
    win: Object.fromEntries(plaques.map((id) => [id, msWindow(MS[id].M)])),
    doors: shuffled(ISO_DOORS),
    bells: shuffled([...have, ...rest].slice(0, N_BELLS)),
  }
}

function Walls({ world }) {
  const parts = useModelParts('spectra')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -108; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -112; z > -148; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -110], [-W, 9, 8]), world.addSolid([W, -9, -110], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -111], [-W, 9, -109]), world.addSolid([W, -9, -111], [ARENA.x, 9, -109]),
      world.addSolid([-1.6, 0, ARENA.z[1] + 1.4], [1.6, 4, ARENA.z[1] + 4.6]), // the telescope's pier
      ...[-3.6, 3.6].map((x) => world.addSolid([x - 0.7, 0, -34.9], [x + 0.7, 3, -31.1])), // the magnet's coils
      world.addSolid([-1.6, 0, -77.6], [1.6, 3.6, -74.4]), // the great lens's mount
      ...BELL_SLOTS.map(([x, z]) => world.addSolid([x - 1.0, 0, z - 0.2], [x + 1.0, 2.8, z + 0.2])),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="o12_wall" items={items} />
}

/** the plaque Kai carries, held up over his head, its spectrum on its face (children) */
function Carried({ world, on, children }) {
  const g = useRef()
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x, world.player.pos.y + 2.4 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!on) return null
  return <group ref={g}><mesh rotation={[-0.2, 0, 0]}><boxGeometry args={[0.7, 0.48, 0.05]} /><meshStandardMaterial color="#efe2bc" emissive="#5a4a20" emissiveIntensity={0.3} /></mesh>{children}</group>
}

/** the Keep's wards breaking, far off: a white flash on the horizon and a ring of light flying apart */
function WardFlash({ on }) {
  const g = useRef(), t0 = useRef(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    if (!on) { t0.current = null; g.current.visible = false; return }
    if (t0.current === null) t0.current = clock.elapsedTime
    // a fast swell, a full white peak held ~2.2 s (into the line), then a slow fade: 4.1 s in all
    const t = clock.elapsedTime - t0.current, up = Math.min(1, t / 0.35), fall = Math.min(1, Math.max(0, t - 2.6) / 1.5), k = Math.min(1, t / 4.1)
    g.current.visible = true
    const [flash, ring, light, glow] = g.current.children
    flash.scale.setScalar((0.6 + up * 2.6) * (1 + 0.15 * Math.sin(t * 14) * (1 - fall))); flash.material.opacity = up * (1 - fall)
    glow.scale.setScalar(1 + up * 4 + fall * 2); glow.material.opacity = 0.55 * up * (1 - fall)
    ring.scale.setScalar(0.4 + k * 7); ring.material.opacity = Math.max(0, 1 - k)
    light.intensity = 120 * up * (1 - fall)
  })
  return (
    <group ref={g} position={WARD_AT} visible={false}>
      <mesh><sphereGeometry args={[0.8, 16, 10]} /><meshBasicMaterial color="#ffffff" transparent toneMapped={false} fog={false} depthWrite={false} /></mesh>
      <mesh rotation={[0.3, 0, 0]}><ringGeometry args={[0.8, 1.0, 40]} /><meshBasicMaterial color="#e8f0ff" transparent side={2} toneMapped={false} fog={false} depthWrite={false} /></mesh>
      <pointLight color="#ffffff" intensity={0} distance={60} />
      <mesh><sphereGeometry args={[0.8, 16, 10]} /><meshBasicMaterial color="#cfe0ff" transparent opacity={0} toneMapped={false} fog={false} depthWrite={false} /></mesh>
    </group>
  )
}

/** the far horizon in the slit while the wards break: a dark ridge line and the Keep's towers, the flash over them */
function KeepHorizon({ on }) {
  if (!on) return null
  const ink = <meshBasicMaterial color="#080a16" fog={false} toneMapped={false} />
  const T = [[-1.6, 1.3, 0.34], [-0.75, 1.8, 0.4], [0, 2.6, 0.5], [0.75, 1.8, 0.4], [1.6, 1.3, 0.34]] // x, height, half-width
  return (
    <group position={[WARD_AT[0], WARD_AT[1] - 2.9, WARD_AT[2] + 0.4]} rotation={[0, 0.7, 0]}>{/* turned square to the wards shot's camera */}
      <mesh position={[0, -0.35, 0]}><boxGeometry args={[5.2, 1.1, 0.05]} />{ink}</mesh>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[4.2, 0.9, 0.05]} />{ink}</mesh>
      {T.map(([x, h, w], i) => (
        <group key={i} position={[x, 0.2 + h / 2, 0]}>
          <mesh><boxGeometry args={[w * 2, h, 0.05]} />{ink}</mesh>
          <mesh position={[0, h / 2 + w * 0.7, 0]}><coneGeometry args={[w * 1.25, w * 1.6, 4]} />{ink}</mesh>
          <mesh position={[0, h * 0.15, 0.03]}><planeGeometry args={[w * 0.5, w * 0.7]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} fog={false} /></mesh>
        </group>))}
      <mesh position={[0, 0.05, -0.02]}><planeGeometry args={[5.6, 0.3]} /><meshBasicMaterial color="#3a4a7a" transparent opacity={0.6} toneMapped={false} fog={false} depthWrite={false} /></mesh>
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

function ObsLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const bossLive = useRef(false) // the fight is running: room triggers hold still
  const [lay] = useState(layout)
  const [plaque, setPlaque] = useState(null)
  const plaqueRef = useRef(null)
  plaqueRef.current = plaque
  // the finale's beats: the reveal keeps him mounted; Pi pairs his spark; he goes; then the shard, the crown, Octavia
  const [reveal, setReveal] = useState(false)
  const [sorcUp, setSorcUp] = useState(() => !has('boss12')) // mounted from the fight through the reveal; never after
  const revealRef = useRef(false)
  const [paired, setPaired] = useState(false)
  const [fade, setFade] = useState(false)
  const [spectraHere, setSpectraHere] = useState(false)
  const [crownOn, setCrownOn] = useState(false)
  const [octaviaHere, setOctaviaHere] = useState(false)
  const [wards, setWards] = useState(false)
  const placed = save.t12placed || {}
  const rung = save.t12bells || {}
  const plaqueAt = (id) => PLAQUE_SLOTS[lay.plaques.indexOf(id)]
  const doorAt = (door) => DOOR_SLOTS[lay.doors.indexOf(door)]
  const bellAt = (id) => BELL_SLOTS[lay.bells.indexOf(id)]
  const hangBells = BELLS.filter((b) => lay.bells.includes(b.id))

  useEffect(() => {
    world.map = {
      floor: '#c8c4d0', wall: '#2a2a3a', pit: '#0e0e18',
      labels: ROOMS12.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t12-map']) return null; const seen = sv.t12seen || {}; return ROOMS12.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t12-compass']) return null
        const g = GOALS12.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 12) return { pos: [SHARD12[0], SHARD12[2]], label: 'Take the last Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Summit' }
      },
    }
    return () => { world.map = null }
  }, [world])

  // a knockout drops a carried plaque back on its stand
  useEffect(() => {
    let kn = world.knockouts || 0
    const t = setInterval(() => {
      const n = world.knockouts || 0
      if (n === kn) return
      kn = n
      if (plaqueRef.current) { setPlaque(null); setTimeout(() => toast('While you were down, the plaque slid back onto its stand.', 'warn', 3600), 700) }
    }, 250)
    return () => clearInterval(t)
  }, [world])
  useEffect(() => {
    if (plaque) setState({ objective: 'Carrying a plaque: read its peaks · which door?' })
  }, [plaque])

  useEffect(() => {
    playMusic('observatory')
    world.killY = -8
    const f = [world.addFloor(-W, -110, W, 8, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -109, 0)]
    const HINTS = {
      '12-1': 'A great magnet, bending broken molecules round an arc. Heavier pieces curve less!',
      '12-2': 'Five plaques, each with a mass spectrum on it, and four doors: chlorine, bromine, nitrogen, and none of those.',
      '12-3': 'The dome’s great lens. Which light makes bonds ring?',
      '12-4': 'Bells! Each one is a molecule. The Lens will show where each one rings.',
    }
    const t = ROOMS12.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      if (bossLive.current) return // no checkpoint or objective changes while the fight runs
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t12seen || {}
      saveGame({ checkpoint: { scene: 'observatory', room: r.id }, t12seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ hideFormTag: r.id.startsWith('12-'), objective: plaqueRef.current ? getState().objective : r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', readMs(HINTS[r.id])), 400)
    }))
    // the boss trigger spans the arena's near end, the checkpoint (z -114) included
    const bossT = world.addTrigger([-ARENA.x, -2, BOSS_Z - 3], [ARENA.x, 8, FIGHT_GATE_Z - 0.6], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t12-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Summit', onInteract: () => onExit('summit', { scene: 'summit', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -83.2], radius: 2.2, label: () => (has('t12-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -109.2], radius: 2.4, label: () => (has('t12-bossdoor') ? null : 'Unlock the telescope door'), onInteract: () => unlockBossDoor() }),
    ]
    // 12-2 plaques and doors (where each stands is dealt per visit)
    lay.plaques.forEach((id) => { const [x, z] = plaqueAt(id); ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.3, label: () => (plaqueRef.current || (getState().save.t12placed || {})[id] ? null : 'Take the plaque'), onInteract: () => { setPlaque(id); sfx('pickup') } })) })
    // a door takes any number of plaques, and none opens until all five hang, so the last plaque is never forced
    ISO_DOORS.forEach((door) => { const [x, z] = doorAt(door); ia.push(world.addInteractable({ pos: [x, 0, z + 1.2], radius: 1.7, label: () => (plaqueRef.current && !has('12-2') ? `Hang it on the ${door} door` : null), onInteract: () => hang(door) })) })
    // 12-4 bells: the Lens shows a bell's spectrum; then name it
    const lanterns = hangBells.map((b) => { const [x, z] = bellAt(b.id); return world.addLantern({ needs: 'hasLens', omni: true, pos: [x, 0, z], radius: 3.2, label: () => ((getState().save.t12bells || {})[b.id] ? null : 'Turn the Spectra Lens on the bell'), onLantern: () => ringBell(b) }) })
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS12.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
      window.__valence.layout12 = lay
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...lanterns].forEach((i) => world.remove(i)); setState({ hideFormTag: false }) }
  }, [world])

  // ---------------------------------------------------------------- actions
  const wrong = (m, at) => { sfx('wrong'); setTimeout(() => world.player && world.player.hurt(1, at, true), 50); toast(m, 'warn', readMs(m)) }
  const hang = (door) => {
    const id = plaqueRef.current
    if (!id) return
    const pl = PLAQUES.find((x) => x.id === id)
    const [x, z] = doorAt(door)
    setPlaque(null)
    setState({ objective: 'The Isotope Gallery  ·  §12.3' })
    if (pl.door !== door) { wrong(`The plaque slides off and back to its stand. ${DOOR_RULE[door]}`, [x, 0, z]); return }
    const next = { ...(getState().save.t12placed || {}), [id]: door }
    saveGame({ t12placed: next }); sfx('right')
    const m = `It hangs. That was ${id}${MS[id].built ? ' (its spectrum is built from its formula, †)' : ''}: ${PLAQUE_NOTE[door]}`
    toast(m, 'good', readMs(m))
    if (lay.plaques.every((p) => next[p]) && !has('12-2')) { markSolved('12-2'); sfx('open'); setTimeout(() => toast('All five plaques hang. The four doors sink open, and a big chest stands behind them.', 'good', 3600), 2600) }
  }
  const ringBell = async (b) => {
    if ((getState().save.t12bells || {})[b.id] || busy.current) return
    busy.current = true
    sfx('stance')
    let miss = null
    const ok = await openPanel('bell', { bell: b.id, onWrong: (t) => { miss = t } })
    busy.current = false
    const [x, z] = bellAt(b.id)
    if (!ok) { if (miss) wrong(miss, [x, 0, z]); return }
    const next = { ...(getState().save.t12bells || {}), [b.id]: true }
    saveGame({ t12bells: next }); sfx('right')
    if (Object.keys(next).length >= N_BELLS && !has('12-4')) { markSolved('12-4'); sfx('open'); setTimeout(() => say([{ who: 'Pi', text: 'Five bells, five families, just from where they ring!' }, { who: 'Pi', text: 'And a big chest by the telescope door.' }]), 500) }
  }
  // a station's trial: a wrong answer closes the panel, toasts its rule and costs half a heart
  const runStation = async (id) => {
    const st = STATIONS12[id]
    if (busy.current) return
    busy.current = true
    let miss = null
    const ok = await openPanel(st.panel, { ...st.props, onWrong: (t) => { miss = t } })
    busy.current = false
    if (!ok) { if (miss) wrong(miss, [st.pos[0], 0, st.pos[2]]); return }
    markSolved(id)
    if (id === '12-3') { sfx('open'); toast('The lens swings to the infrared. A small chest appears.', 'good', 3200) }
    if (id === '12-1b' && has('12-1a')) toast('Both readings done. The hall’s gate opens.', 'good', 3000)
    if (id === '12-1a' && has('12-1b')) toast('Both readings done. The hall’s gate opens.', 'good', 3000)
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: No one can ever know what I truly am. Look all you like.' },
      { who: 'Pi', text: 'Spectra has drawn a little rainbow on it.' },
    ])
    markSolved('t12-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t12-door')) return
    if (!getState().save.t12key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t12key: false }); markSolved('t12-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t12-bossdoor')) return
    if (!has('t12-bosskey')) { toast('Violet light leaks round this door. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t12-bossdoor'); sfx('open'); toast('The Boss Key turns. Someone laughs, in a voice you know…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't12-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't12-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't12-key') { saveGame({ t12key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't12-lens') {
      saveGame({ hasLens: true })
      await itemGet(world, { model: 'spectra', name: 't12_lens', scale: 2.4, color: '#bff4ff' }, [
        { who: '', text: 'You got the Spectra Lens!' },
        { who: 'Pi', text: 'Point it at a molecule and press G: you’ll see where it soaks up infrared light.' },
        { who: 'Pi', text: 'Every bond rings at its own place on the chart. Read where the dips fall.' },
      ])
    }
    if (id === 't12-bosskey') { saveGame({ t12bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss12') || bossStarted.current || busy.current) return
    bossStarted.current = true
    bossLive.current = true
    busy.current = true
    setState({ hideFormTag: true })
    playMusic('boss')
    world.respawn = [0, 0, BOSS_Z] // well clear of the fight gate, so the camera has room behind Kai
    if (world.player && world.player.pos.z > BOSS_Z + 0.5) world.player.teleport([world.player.pos.x, 0, BOSS_Z], Math.PI) // (a Continue lands at z -114)
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t12bossIntro) {
      saveGame({ t12bossIntro: true })
      // frame the false shape's chest and the violet spark in it (enemies hold still while they talk)
      const q = world.sorcSpark
      world.camOverride = q ? { pos: [q.x + 1.8, 3.4, q.z + 7.5 * portrait()], look: [q.x, q.y - 0.2, q.z] } : { pos: [3, 3.5, SORC.center[2] + 9], look: [SORC.center[0], 2, SORC.center[2]] }
      await say([
        { who: 'Malradix', text: 'Little knight. You chased my spark across the whole kingdom, and you still can’t see what I am.' },
        { who: 'Malradix', text: 'Spectra’s magnet makes a radical of everything it weighs. Why fear one more?' },
        { who: 'Pi', text: 'There’s the spark, inside a false shape! Weigh him on the crystals, then the Lens. Then name him.' },
        { who: 'Pi', text: 'And roll through his rings of light!' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Weigh him, look at him, name him!' }])
    busy.current = false
  }
  const bossDown = async () => {
    revealRef.current = true; setReveal(true)
    bossLive.current = false
    markSolved('boss12')
    setState({ objective: 'Malradix, unmasked' })
    playMusic('observatory')
    // framed on his spot under the telescope: he drifts back there as the shape breaks, wherever the last name landed
    const c = { x: SORC.center[0], z: SORC.center[2] }
    // the camera sits on Kai's side of him, a little off the line between them, so his face and the spark fill the shot
    const kp = world.player ? world.player.pos : { x: c.x, z: c.z + 6 }
    let ux = kp.x - c.x, uz = kp.z - c.z
    const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul
    const cd = 5.2 * portrait()
    const camPos = [Math.max(-ARENA.x + 1.5, Math.min(ARENA.x - 1.5, c.x + ux * cd - uz * 1.6)), 2.7, Math.max(ARENA.z[1] + 2, Math.min(FIGHT_GATE_Z - 1, c.z + uz * cd + ux * 1.6))]
    const follow = setInterval(() => { const q = world.sorcPos; if (q) world.camOverride = { pos: camPos, look: [q.x, 2.3, q.z] } }, 16)
    await new Promise((r) => setTimeout(r, 1600))
    await say([
      { who: 'Pi', text: 'The shape’s gone. That’s really him. And the spark…' },
      { who: 'Malradix', text: 'Random, I said. Instant. Any which way. You proved every law. And now you see me: one electron, alone.' },
      { who: 'Pi', text: 'Then stop tearing. Share one. I’ll share mine.' },
    ])
    // Pi drifts to the spark and pairs it; the camera holds while it settles from violet to gold
    const q = world.sorcSpark
    if (q) world.piAside = [q.x + 0.35, q.y + 0.1, q.z + 0.45]
    setPaired(true); sfx('pair')
    await new Promise((r) => setTimeout(r, 2600))
    await say([{ who: 'Malradix', text: '…Paired. So this is what a bond feels like. It doesn’t hurt at all.' }])
    setFade(true)
    await new Promise((r) => setTimeout(r, 2200))
    clearInterval(follow)
    world.camOverride = null
    world.piAside = null
    revealRef.current = false; setReveal(false); setSorcUp(false)
    setState({ objective: 'Take the last Bond Shard', hideFormTag: false })
    await say([{ who: 'Pi', text: 'He’s not gone, just… not a radical any more. The chain’s over! Now, the last shard.' }])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 12 || busy.current || revealRef.current) return
    busy.current = true
    sfx('shard')
    setSpectraHere(true)
    // Kai stands square on to the camera with Spectra on his right; Pi hovers above and behind them; the far wall and
    // the telescope's pier fill the background
    const kz = SHARD_Z
    if (world.player) world.player.teleport([0, 0, kz], 0)
    world.piAside = [0.9, 2.9, kz - 1.3]
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = { pos: [-1.1, 1.6, kz + 6.0 * portrait()], look: [-1.1, 1.0, kz] }
    await say([{ who: 'Astronomer Spectra', text: 'You saw him for what he is. One question, and the last shard is yours.' }])
    let miss = null
    const ok = await openPanel('finalCheck', { onWrong: (t) => { miss = t } })
    if (!ok && miss) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, [-2.2, 0, kz], true); toast(miss, 'warn', readMs(miss)) }
    if (!ok) { await say([{ who: 'Astronomer Spectra', text: 'Look again. The light will wait.' }]); world.camOverride = null; world.piAside = null; busy.current = false; return }
    saveGame({ shards: 12, checkpoint: { scene: 'summit', at: 'gate' } })
    setState({ objective: 'All twelve Bond Shards' })
    // the crown: the twelve shards ring Kai and fuse; the camera holds on him
    world.camOverride = { pos: [0, 2.4, kz + 5.2 * portrait()], look: [0, 2.1, kz] }
    setCrownOn(true)
    await new Promise((r) => setTimeout(r, 400))
    await say([{ who: '', text: 'The twelfth shard rises from Kai’s hands, and the other eleven rise to meet it…' }])
    await new Promise((r) => setTimeout(r, 1800))
    await say([{ who: '', text: 'The Crown of Tetravalence. Whole again.' }])
    // up through the slit: far off on the horizon, the Keep's wards flash white and break
    // off the telescope's line, so the tube frames the slit rather than filling it
    world.camOverride = { pos: [6.5, 2.2, kz - 1], look: [0.8, WARD_AT[1] - 1.4, WARD_AT[2]] }
    setWards(true); sfx('open')
    await new Promise((r) => setTimeout(r, 1200))
    await say([{ who: '', text: 'Far off, through the slit, the wards on the Keep shatter like glass.' }])
    setWards(false)
    // Octavia walks free: she steps in on Kai's left; a wider shot holds all three, and Pi
    sfx('warp'); setOctaviaHere(true)
    world.camOverride = { pos: [0, 1.7, kz + 6.6 * portrait()], look: [0, 1.25, kz] }
    world.piAside = [1.3, 3.3, kz - 1.0] // beside the crown, not inside it
    await new Promise((r) => setTimeout(r, 900))
    await say([
      { who: 'Princess Octavia', text: 'Kai. The wards broke, and the Crown’s light carried me here. Every bond in the kingdom is holding.' },
      { who: 'Princess Octavia', text: 'He said no one could know him. You named him, and Pi gave him a partner. That’s how a chain ends.' },
      { who: 'Astronomer Spectra', text: 'Everything gives itself away. You weighed him, and you looked. That is all it ever takes.' },
      { who: 'Pi', text: 'I gave him one of mine, Kai. I’m a little lighter. Still yours, though. Let’s go home.' },
    ])
    // the last beat: Octavia knights him, the crown over them both
    if (world.player) world.player.teleport([0, 0, kz], 1.0) // square on to Octavia, half turned to the camera
    world.camOverride = { pos: [0.6, 1.8, kz + 5.4 * portrait()], look: [0.6, 1.45, kz] }
    await new Promise((r) => setTimeout(r, 300))
    await say([{ who: 'Princess Octavia', text: 'Kneel, Kai.' }])
    // a lowered stance: Kai sinks 0.3 m and bows (the shard-warp lift and stretch hooks), then rises on the knighting
    await new Promise((r) => { const t0 = performance.now(); const id = setInterval(() => { const u = Math.min(1, (performance.now() - t0) / 450); world.kaiLift = -0.3 * u; world.kaiStretch = 1 - 0.12 * u; if (u >= 1) { clearInterval(id); r() } }, 16) })
    sfx('shard')
    await say([{ who: 'Princess Octavia', text: 'Rise, Sir Kai, Knight of Valence.' }])
    world.kaiLift = 0; world.kaiStretch = 1
    world.camOverride = null
    world.piAside = null
    await warpOut(world, { checkpoint: { scene: 'summit', at: 'gate' }, card: 12 })
    busy.current = false
    onExit('summit', { scene: 'summit', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: SHARD12, radius: 2.6, label: 'Take the last Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss12 && (getState().save.shards || 0) < 12 && !revealRef.current)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => {
    // in a portrait window the gallery's camera rises and aims past Kai, so he doesn't hide the middle plaques
    const pz = world.player ? world.player.pos.z : 0
    const gallery = pz < -38 && pz > -62 && window.innerWidth < window.innerHeight
    world.camBoost = world.bossCam ? { dist: 7.5, pitchSet: 0.45, lookY: 1.8, lookAhead: 1.5 } : gallery ? { pitchSet: 0.5, lookY: 0.5, lookAhead: 1.8 } : null
    // the camera stays on the arena side of the fight gate while the fight runs
    world.camMaxZ = world.bossCam ? FIGHT_GATE_Z - 0.6 : undefined
    world.camMaxY = world.bossCam ? 7 : undefined
  })
  useEffect(() => () => { world.camMaxZ = undefined; world.camMaxY = undefined; world.piAside = null }, [])

  return (
    <group>
      <color attach="background" args={['#0e1024']} />
      <fog attach="fog" args={['#1a1c34', 22, 80]} />
      <hemisphereLight args={['#d8e0ff', '#2a2440', 0.85]} />
      <ambientLight intensity={0.35} color="#e0e8ff" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#e8f0ff" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <MarbleFlags x0={-W} x1={W} z0={8} z1={-110} base="#a29eb4" />
      <MarbleFlags x0={-ARENA.x} x1={ARENA.x} z0={-110} z1={ARENA.z[1]} size={2.5} base="#9894ae" seed={13} />
      <StarCeiling x={W} z0={8} z1={-110} />
      <EntranceWall x={W} z={8.6} />
      <TelescopeHall center={SORC.center} x={ARENA.x} zFar={ARENA.z[1]} />
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -24, -36, -48, -60, -72, -90, -102].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#bfe0ff" />))}
      {[-116, -126, -136, -146].flatMap((z) => [-1, 1].map((sd) => <Torch key={'a' + z + sd} pos={[sd * (ARENA.x - 1.2), 0, z]} color="#d8c8ff" />))}

      {/* entrance */}
      <group position={[5, 0, -9]} rotation={[0, -0.4, 0]}><NoticeBoard /><Tag position={[0, 2.5, 0]} df={10} far={20}>Malradix's notice</Tag></group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t12-map']} onOpen={() => openChest('t12-map')} />
      <Tag position={[0, 6.5, -13]} df={16} far={30}>The Observatory of Light</Tag>

      {/* 12-1 the weighing hall: the magnetic arc and its m/z plates */}
      <group position={[0, 0, -33]}>
        <MagnetArc />
        {[71, 57, 43, 29].map((mz, i) => (
          <group key={mz} position={[-4.5 + i * 3, 0, -2.6]}>
            <Plinth r={0.42} h={0.8} />
            <mesh position={[0, 0.86, 0]}><boxGeometry args={[1.0, 0.06, 0.7]} /><meshStandardMaterial color="#c8a050" metalness={0.75} roughness={0.3} emissive="#5a3a10" emissiveIntensity={0.3} /></mesh>
            {solved['12-1a'] && <Tag position={[0, 1.5, 0]} df={8} far={20}>{`m/z ${mz}`}</Tag>}
          </group>
        ))}
      </group>
      <Gate world={world} pos={[0, 0, -37.5]} size={[2 * W, 7, 0.8]} open={!!(solved['12-1a'] && solved['12-1b'])} color="#3a3a5a" glow="#ff6a6a" />

      {/* 12-2 the isotope gallery: five plaques (each its M⁺ region as a bar graph), four doors (both dealt per visit) */}
      {lay.plaques.map((id) => { const [x, z] = plaqueAt(id); const gone = !!placed[id] || plaque === id; return (
        <group key={id} position={[x, 0, z]}>
          <PlaqueStand placed={gone} />
          {!gone && <Tag position={[0, 2.6, 0]} df={8} far={22}><MSOf id={id} win={lay.win[id]} compact width={150} /></Tag>}
        </group>
      ) })}
      {ISO_DOORS.map((door) => { const [x, z] = doorAt(door); const done = !!solved['12-2']; const n = lay.plaques.filter((id) => placed[id] === door).length; return (
        <group key={door} position={[x, 0, z]}>
          <IsoDoor open={done} />
          <Tag position={[0, 3.6, 0.4]} df={10} far={24} className={done ? 'ok-tag' : ''}><span style={{ ...TWO, maxWidth: 140 }}>{door === 'none of the three' ? <>none of<br />the three</> : `the ${door} door`}{n > 0 && !done ? <><br />{`${n} hung`}</> : null}</span></Tag>
        </group>
      ) })}
      <Carried world={world} on={!!plaque}>{plaque && <Tag position={[0, 0.95, 0]} df={8} far={22}><MSOf id={plaque} win={lay.win[plaque]} compact width={130} /></Tag>}</Carried>
      <Chest world={world} pos={[0, 0, -59.5]} big opened={!!solved['t12-lens']} show={!!solved['12-2']} onOpen={() => openChest('t12-lens')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -62]} size={[2 * W, 7, 0.8]} open={!!solved['t12-lens']} color="#3a3a5a" glow="#bff4ff" />

      {/* 12-3 the spectrum dome */}
      <Chest world={world} pos={[-7.6, 0, -66]} rotY={Math.PI / 2} opened={!!solved['t12-compass']} onOpen={() => openChest('t12-compass')} />
      <group position={[0, 0, -76]}><GreatLens lit={!!solved['12-3']} /></group>
      <Phantoms world={world} spawns={[[-4, -72], [4, -77]]} active={!!solved['t12-compass']} zone={[-62, -84]} />
      <Chest world={world} pos={[0, 0, -81]} opened={!!solved['t12-key']} show={!!solved['12-3']} onOpen={() => openChest('t12-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -84]} size={[2 * W, 7, 0.8]} open={!!solved['t12-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.4, -83.6]} df={13} far={26}>{solved['t12-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 12-4 the ringing bonds: five of the eight bells, dealt per visit */}
      <Suspense fallback={null}>
        {hangBells.map((b) => { const [x, z] = bellAt(b.id); return (
          <group key={b.id} position={[x, 0, z]}>
            <Part model="spectra" name="o12_bell" />
            <Tag position={[0, 3.3, 0]} df={9} far={22} className={rung[b.id] ? 'ok-tag' : ''}>{rung[b.id] ? b.family : 'a bell: an unknown molecule'}</Tag>
          </group>
        ) })}
      </Suspense>
      <Chest world={world} pos={[0, 0, -107.5]} big opened={!!solved['t12-bosskey']} show={!!solved['12-4']} onOpen={() => openChest('t12-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -110]} size={[2 * W, 7, 0.8]} open={!!solved['t12-bossdoor']} color="#3a2a50" glow="#c9a3ff" />
      {/* the fight gate: shut behind Kai while the fight runs; the follow camera ignores it */}
      <Gate world={world} pos={[0, 0, FIGHT_GATE_Z]} size={[2 * ARENA.x, 7, 0.6]} open={!bossOn || !!solved.boss12} color="#3a2a50" glow="#c9a3ff" noCam />

      {Object.entries(STATIONS12).map(([id, st]) => <Station key={id} world={world} pos={st.pos} label={solved[id] ? null : st.label} enabled={!solved[id]} solved={!!solved[id]} onUse={() => runStation(id)} />)}

      {/* boss */}
      {sorcUp && <Sorcerer world={world} center={SORC.center} crystals={SORC.crystals} active={bossOn} onDefeated={bossDown} paired={paired} fade={fade} />}
      {spectraHere && <Spectra position={[-2.2, 0, SHARD_Z]} rotation={[0, 0.5, 0]} />}
      {octaviaHere && <group position={[2.3, 0, SHARD_Z]} rotation={[0, -0.5, 0]}><Octavia /><pointLight position={[0, 2, 1]} color="#ffe0c0" intensity={3} distance={6} /></group>}
      <CrownBeat at={[0, 0, SHARD_Z]} on={crownOn} />
      <WardFlash on={wards} />
      <KeepHorizon on={wards} />
      <Shard show={!!solved.boss12 && !reveal && (save.shards || 0) < 12 && !crownOn} pos={SHARD12} />
      <Motes count={200} area={[20, 6, 150]} center={[0, 1, -70]} color="#e8f0ff" size={0.04} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Observatory({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'observatory' ? ROOMS12.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#0e1024" camDist={6.2}>
      {(world) => <ObsLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
