import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Hydra10, { Magnus, Golems } from '../actors/MarshFolk'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { CX, BOG_GOALS, stoneTag, CH_BDE, CYCLO_H, SPRINGS, ALC_REAGENTS, convert, shuffled, shown, readMs } from '../chem/rules10'
import { W10 as W, ROOMS10, STATIONS10, BOG, ALLYL, SPRINGS_POS, FORGE10, GOALS10, HYDRA } from '../data/dungeon10'
import { Flagstones, Plinth, Brazier, NoticeBoard, AllylDoor, SpringBasin, Vault, ArenaVault, PoolDressing } from './SunkenDressing'

// Dungeon 10 — The Sunken Forge (Chapter 10, Organohalides). Rooms along −z.
// Ocarina-style: Dungeon Map, Compass, a small key, the Magnesium Ring in a big chest, a Boss Key.
// Puzzles: bond stones by strength (§10.1); predicting a radical hunt (§10.2); the weakest C–H and the shared
// allyl electron (§10.3–10.4); alcohols to halides (§10.5); Grignards, a Gilman coupling, oxidation levels (§10.6–10.8).

preloadModels('marsh', 'magnus')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-132, -172] }
const padXZ = (k) => { const a = (k / 6) * Math.PI * 2; return [ALLYL.centre[0] + Math.sin(a) * ALLYL.R, ALLYL.centre[1] - Math.cos(a) * ALLYL.R] }
const STAND = SPRINGS_POS.stand
const standXZ = (i) => [STAND[0] + (i % 2) * 1.6, STAND[1] - Math.floor(i / 2) * 1.8]
// a goal that fits any stones already laid (a reload mid-bog keeps a consistent order)
const bogGoal = () => { const l = getState().save.t10laid || []; return shuffled(Object.keys(BOG_GOALS)).find((k) => l.every((id, i) => BOG_GOALS[k].order[i] === id)) || 'strong' }
// drawn once per visit: which spot each bog stone and reagent flask sits on, and which ring pad is C1 (the ring turns)
const layout = () => ({
  stones: shuffled(CX.map((c) => c.id)), // stones[i] sits on BOG.stones[i]
  flasks: shuffled(Object.keys(ALC_REAGENTS)).map((id, i) => [id, ...standXZ(i)]),
  ring: Math.floor(Math.random() * 6),
  bog: bogGoal(), // what the sockets want this visit: strongest, weakest, longest or shortest first
})
// a laid stone sinks by its bond length (Table 10.1): C–F 139 pm sits highest, C–I 214 pm lowest
const sinkOf = (id) => -(CX.find((c) => c.id === id).len - 139) / 250
const LQ_MAG = [-1.6, 0, -162.5], LQ_KAI = [1.6, 0, -162.5] // Magnus's question: either side, in front of the shard (z -166), wide enough that Kai's blade stops short of it

function Walls({ world }) {
  const parts = useModelParts('marsh')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -130; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -134; z > -170; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -132], [-W, 9, 8]), world.addSolid([W, -9, -132], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -133], [-W, 9, -131]), world.addSolid([W, -9, -133], [ARENA.x, 9, -131]),
      ...['10-4a', '10-4b', '10-4c'].map((id) => { const [x, z] = SPRINGS_POS[id]; return world.addSolid([x - 0.9, 0, z - 0.9], [x + 0.9, 1.0, z + 0.9]) }),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="f10_wall" items={items} />
}

function Carried({ world, label, color }) {
  const g = useRef()
  // to Kai's side, not on his head (World 9 Presentation #7)
  useFrame(({ clock }) => { if (g.current && world.player) g.current.position.set(world.player.pos.x + 0.6, world.player.pos.y + 2.0 + Math.sin(clock.elapsedTime * 4) * 0.06, world.player.pos.z) })
  if (!label) return null
  return (
    <group ref={g}>
      <mesh><icosahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} /></mesh>
      <pointLight color={color} intensity={1.2} distance={3.5} />
      <Tag position={[0, 0.6, 0]} df={9}>{label}</Tag>
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

function SunkenLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const bossLive = useRef(false) // the fight is running: room triggers hold still
  const sparkFly = useRef(false) // keeps the beaten Hydra mounted while its spark flies east (a ref, so the render markSolved forces already sees it)
  const [, bumpSpark] = useState(0)
  const [lay] = useState(layout)
  const layRef = useRef(lay)
  const pad = (k) => padXZ((k + lay.ring) % 6) // CYCLO_H[k] (carbon k+1) sits on this pad
  const [stone, setStone] = useState(null)
  const stoneRef = useRef(null)
  stoneRef.current = stone
  const [magnusHere, setMagnusHere] = useState(false)
  const laid = save.t10laid || []
  const ends = save.t10ends || {}
  const held = save.t10flask || null
  const struck = save.t10allyl || 3 // the allylic carbon whose H went: the radical then sits on it and on C1 (C3) or C2 (C6)
  const radical = struck === 6 ? [2, 6] : [1, 3]

  useEffect(() => {
    world.map = {
      floor: '#6a7a5a', wall: '#2a3424', pit: '#1a1a10',
      labels: ROOMS10.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t10-map']) return null; const seen = sv.t10seen || {}; return ROOMS10.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t10-compass']) return null
        const g = GOALS10.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 10) return { pos: [0, -166], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Marsh' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('sunken')
    world.killY = -6
    const f = [world.addFloor(-W, BOG.z[0], W, 8, 0), world.addFloor(-W, -132, W, BOG.z[1], 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -131, 0)]
    const HINTS = {
      '10-1': 'A bog, and four bond stones. Some sink deeper than others.',
      '10-2': 'Gates that want numbers. Count the hydrogens!',
      '10-3': 'A ring on the floor with lamps on every hydrogen. Which one breaks easiest?',
      '10-4': 'Three springs of alcohol, and a rack of reagents.',
      '10-5': 'Golems. Hitting them does nothing… yet.',
    }
    const t = ROOMS10.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      if (bossLive.current) return // no room chip or checkpoint changes while the Hydra fight runs
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t10seen || {}
      saveGame({ checkpoint: { scene: 'sunken', room: r.id }, t10seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    // spans the arena and covers the boss checkpoint (z -140): a Continue there spawns inside it and starts the fight.
    // It starts ~6 m past the pool gate, so the fight camera has room behind Kai
    const bossT = world.addTrigger([-ARENA.x, -2, -141.5], [ARENA.x, 8, -137.8], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t10-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Marsh', onInteract: () => onExit('marsh', { scene: 'marsh', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -103.2], radius: 2.2, label: () => (has('t10-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -131.2], radius: 2.4, label: () => (has('t10-bossdoor') ? null : 'Unlock the pool door'), onInteract: () => unlockBossDoor() }),
    ]
    // 10-1: pick up a stone; lay it in the next socket
    CX.forEach((c) => {
      const [x, z] = BOG.stones[layRef.current.stones.indexOf(c.id)]
      ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.2, label: () => (stoneRef.current || (getState().save.t10laid || []).includes(c.id) ? null : `Pick up ${stoneTag(c, layRef.current.bog)}`), onInteract: () => { setStone(c.id); sfx('pickup') } }))
    })
    ia.push(world.addInteractable({ pos: [0, 0, BOG.z[0] + 0.8], radius: 2.4, label: () => (stoneRef.current ? 'Lay the stone in the next socket' : null), onInteract: () => layStone() }))
    // 10-3: strike an H lamp
    const targets = CYCLO_H.map((h, k) => { const [x, z] = padXZ((k + layRef.current.ring) % 6); return world.addTarget({ pos: () => [x, 1.6, z], radius: 0.5, tall: 0.8, alive: () => !has('10-3a'), onHit: () => strikeH(h) }) })
    // after the strike: Br₂ can be let in at any of the six pads; only the carbons that hold the radical's electron take it
    CYCLO_H.forEach((h, k) => { const [x, z] = padXZ((k + layRef.current.ring) % 6); ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.1, label: () => (has('10-3a') && !has('10-3b') && !(getState().save.t10ends || {})[h.c] ? 'Let Br₂ in at this carbon' : null), onInteract: () => brominate(h.c) })) })
    // 10-4: flasks and springs
    layRef.current.flasks.forEach(([id, x, z]) => ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.0, label: () => (getState().save.hasSatchel && getState().save.t10flask !== id ? `Take the flask: ${ALC_REAGENTS[id]}` : null), onInteract: () => { saveGame({ t10flask: id }); sfx('pickup') } })))
    const lanterns = SPRINGS.map((sp) => { const [x, z] = SPRINGS_POS[sp.id]; return world.addLantern({ needs: 'hasSatchel', omni: true, pos: [x, 0, z], radius: 2.8, label: () => (has(sp.id) || !getState().save.t10flask ? null : `Pour ${ALC_REAGENTS[getState().save.t10flask]} into the ${sp.alcohol}`), onLantern: () => pourSpring(sp) }) })
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS10.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...targets, ...lanterns].forEach((i) => world.remove(i)) }
  }, [world])

  // the laid stones become floor across the bog only once all four are in, each at its sunk depth (stones are laid from
  // the bank, so nothing needs to stand on a half-built path; a gate at z -34.4 also holds until 10-1 is solved)
  useEffect(() => {
    if (laid.length < 4) return
    const ids = laid.map((id, k) => { const z = BOG.sockets[k][1]; return world.addFloor(-1.2, z - 1.45, 1.2, z + 1.45, sinkOf(id)) })
    ids.push(world.addFloor(-1.2, BOG.z[1], 1.2, BOG.sockets[3][1] - 1.4, 0), world.addFloor(-1.2, BOG.sockets[0][1] + 1.4, 1.2, BOG.z[0], 0))
    return () => ids.forEach((i) => world.remove(i))
  }, [world, laid.length])

  // ---------------------------------------------------------------- actions
  const layStone = () => {
    const id = stoneRef.current
    if (!id) return
    const cur = getState().save.t10laid || []
    const goal = BOG_GOALS[layRef.current.bog]
    const want = goal.order[cur.length]
    const c = CX.find((x) => x.id === id)
    setStone(null)
    if (id !== want) { sfx('wrong'); world.player.hurt(1, [0, 0, BOG.z[0]], true); const m = `${stoneTag(c, layRef.current.bog).replace(/^a/, 'The')} sinks and slides back to the bank: ${goal.tag === 'len' ? `${c.D} kJ/mol` : `${c.len} pm`}. The next socket wants ${goal.next}.`; toast(m, 'warn', readMs(m)); return }
    const next = [...cur, id]
    saveGame({ t10laid: next }); sfx('right')
    toast(`${c.bond}: ${c.len} pm, ${c.D} kJ/mol. It holds.`, 'good', 3200)
    if (next.length === 4) { markSolved('10-1'); sfx('open'); const m = `${goal.sum}: ${next.map((x) => CX.find((y) => y.id === x).bond).join(', ')}. Down the group, C–X bonds get longer and weaker.`; toast(m, 'good', readMs(m)) }
  }
  const strikeH = (h) => {
    if (has('10-3a')) return false
    if (h.kind !== 'allylic') {
      sfx('wrong'); world.player.hurt(1, [ALLYL.centre[0], 0, ALLYL.centre[1]], true)
      const m = h.kind === 'vinylic' ? `C${h.c}–H is vinylic, on the double bond itself: about ${CH_BDE.vinylic} kJ/mol, the strongest here.` : `C${h.c}–H is a plain secondary C–H, about ${CH_BDE.secondary} kJ/mol. Something on this ring holds an H more weakly.`
      toast(m, 'warn', readMs(m))
      return true
    }
    saveGame({ t10allyl: h.c }); markSolved('10-3a'); sfx('open')
    setTimeout(() => say([
      { who: 'Pi', text: `C${h.c}–H snapped: the allylic one, only about ${CH_BDE.allylic} kJ/mol! NBS does exactly this.` },
      { who: 'Pi', text: 'Now there’s a radical on the ring. Where can its electron be? Br goes there: stand on a pad and let the Br₂ in.' },
    ]), 400)
    return true
  }
  // Br₂ at a pad: right only at the radical's ends; a wrong pad costs half a heart and clears the pads (t10ends: carbon → true)
  const brominate = (c) => {
    if (!has('10-3a') || has('10-3b')) return
    const sv = getState().save
    const ends = (sv.t10allyl || 3) === 6 ? [2, 6] : [1, 3]
    const mid = ends[0] === 1 ? 2 : 1
    if (!ends.includes(c)) {
      sfx('wrong'); const [x, z] = padXZ((CYCLO_H.findIndex((h) => h.c === c) + layRef.current.ring) % 6); world.player.hurt(1, [x, 0, z], true)
      saveGame({ t10ends: {} })
      const m = c === mid ? `C${c} gets no share of the unpaired electron. Only the two ends hold it. The pads reset.` : `C${c} isn’t part of the radical: its electrons are all paired. Br₂ finds nothing there. The pads reset.`
      toast(m, 'warn', readMs(m))
      return
    }
    const e = { ...(sv.t10ends || {}), [c]: true }
    saveGame({ t10ends: e }); sfx('right')
    const both = ends.every((x) => e[x])
    const m = !both ? `Br bonds at C${c}. Is that the only place the electron could be?` : `And at C${ends.find((x) => x !== c)} too: the electron was shared by both ends. Cyclohexene’s radical is symmetrical, so both ends give the same product, 3-bromocyclohexene.`
    toast(m, 'good', readMs(m))
    if (both && !has('10-3b')) {
      markSolved('10-3b'); sfx('open')
      setTimeout(() => say([{ who: 'Pi', text: 'A lopsided chain, like 1-octene, would give two different bromides. A big chest!' }]), 500)
    }
  }
  const pourSpring = (sp) => {
    if (has(sp.id)) return
    const f = getState().save.t10flask
    if (!f) return
    saveGame({ t10flask: null })
    const r = convert(sp, f)
    if (r.ok) { markSolved(sp.id); sfx('open'); toast(r.text, 'good', readMs(r.text)) } else { sfx('wrong'); const [x, z] = SPRINGS_POS[sp.id]; world.player.hurt(1, [x, 0, z], true); toast(r.text, 'warn', readMs(r.text)) }
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: "Malradix's notice", text: 'BY ORDER OF MALRADIX: My radicals strike at random. No hydrogen is safe, and none is likelier than any other.' },
      { who: 'Pi', text: 'Magnus scratched “COUNT THEM” underneath. Twice.' },
    ])
    markSolved('t10-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t10-door')) return
    if (!getState().save.t10key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t10key: false }); markSolved('t10-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t10-bossdoor')) return
    if (!has('t10-bosskey')) { toast('Something splashes beyond this door. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t10-bossdoor'); sfx('open'); toast('The Boss Key turns. Three hisses answer, from one throat…', 'good', 3200)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't10-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't10-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't10-key') { saveGame({ t10key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't10-ring') {
      saveGame({ hasRing: true })
      await itemGet(world, { model: 'magnus', name: 't10_ring', scale: 3, color: '#e8f0ff' }, [
        { who: '', text: 'You got the Magnesium Ring!' },
        { who: 'Pi', text: 'Aim it at a carbon–halogen bond and press G: magnesium slides right in. R–X becomes R–MgX.' },
        { who: 'Pi', text: 'The carbon flips from δ+ to δ−. A Grignard reagent! Very strong base. Keep it away from water…' },
      ])
    }
    if (id === 't10-bosskey') { saveGame({ t10bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  // a station's trial: a wrong answer closes the panel, toasts its rule and costs half a heart
  const runStation = async (id) => {
    const st = STATIONS10[id]
    if (busy.current) return
    busy.current = true
    let wrong = null
    // the bog tablet states this visit's goal (which order the sockets want)
    const props = id === '10-1info' ? { ...st.props, text: `${st.props.text} Tonight the sockets want ${BOG_GOALS[layRef.current.bog].label}.` } : st.props
    const ok = await openPanel(st.panel, { ...props, onWrong: (t) => { wrong = t } })
    busy.current = false
    if (!ok) { if (wrong) { world.player.hurt(1, [st.pos[0], 0, st.pos[2]], true); toast(wrong, 'warn', readMs(wrong)) } return }
    markSolved(id)
  }
  const startBoss = async () => {
    if (has('boss10') || bossStarted.current || busy.current) return
    bossStarted.current = true
    bossLive.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -140] // well clear of the pool gate (z -133.2), so the camera has room behind Kai
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t10bossIntro) {
      saveGame({ t10bossIntro: true })
      // frame the Hydra's chest and the violet spark in it (enemies hold still while Pi talks)
      const q = world.hydraSpark
      world.camOverride = q ? { pos: [q.x, 6.6, q.z + 18], look: [q.x, q.y - 0.4, q.z] } : { pos: [4, 5, -137], look: [HYDRA.center[0], 2, HYDRA.center[2]] }
      await say([
        { who: 'Pi', text: 'The Allylic Hydra! Three heads, one body… and that violet spark in its chest.' },
        { who: 'Pi', text: 'Its heads are carbons. Read their tags before you swing.' },
        { who: 'Pi', text: 'And keep moving. Those necks reach.' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Read the heads first. Then swing!' }])
    busy.current = false
  }
  const bossDown = async () => {
    sparkFly.current = true // the Hydra stays mounted until Pi's line is read
    bossLive.current = false
    markSolved('boss10')
    setState({ objective: 'Take the Bond Shard' })
    playMusic('sunken')
    // the spark tears out of the sinking Hydra and flies east (+x) and up, toward the Volcanic Wastes: a wide shot from the
    // arena's west side follows it. It stops at the east wall's top (x 12.8) and hovers there, on camera, until Pi's line
    // is closed; then it fades out through the wall
    world.hydraSparkGone = false
    const camPos = [-11, 3.4, HYDRA.center[2] + 9]
    const lookAt = (q) => [q.x + 1.5, 1.6 + (q.y - 1.6) * 0.65, q.z]
    const follow = setInterval(() => { const q = world.hydraSpark; if (q) world.camOverride = { pos: camPos, look: lookAt(q) } }, 16)
    const flight = new Promise((r) => setTimeout(r, 3600))
    await Promise.all([say([{ who: 'Pi', text: 'Protonated! Nothing left but a hydrocarbon. Look, the spark!' }]), flight])
    world.hydraSparkGone = true
    await new Promise((r) => setTimeout(r, 700))
    clearInterval(follow)
    world.camOverride = null
    sparkFly.current = false; bumpSpark((n) => n + 1)
    await say([{ who: 'Pi', text: 'East again. Somewhere hot, I bet. First, the shard!' }])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 10 || busy.current) return
    busy.current = true
    sfx('shard')
    setMagnusHere(true)
    // Kai and Magnus stand either side of the shard, in front of it, framed low from the pool side so both heads sit
    // above the panel and the shard glows between them (World 9's Lindlar framing)
    if (world.player) world.player.teleport(LQ_KAI, -Math.PI / 2)
    // Pi hovers above and behind, between the two heads (clear of the frame edge and the shard counter); the camera sits
    // square on the pair, nudged toward Magnus, and pitched only a little down so the arena's back wall fills the top
    world.piAside = [-0.4, 2.9, LQ_KAI[2] - 1.3]
    await new Promise((r) => setTimeout(r, 300))
    const mid = (LQ_KAI[0] + LQ_MAG[0]) / 2
    world.camOverride = { pos: [mid, 1.5, LQ_KAI[2] + 6.2], look: [mid - 0.4, 0.9, LQ_KAI[2]] }
    await say([{ who: 'Old Magnus', text: 'Waded all the way down here. One question, boy, and then it’s yours.' }])
    let wrong = null
    const ok = await openPanel('hydraCheck', { onWrong: (t) => { wrong = t } })
    if (!ok && wrong) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, LQ_MAG, true); toast(wrong, 'warn', readMs(wrong)) } // a tick after the panel closes (hurt is ignored while a panel is open), before Magnus speaks
    if (!ok) { await say([{ who: 'Old Magnus', text: 'Count first. Answer after.' }]); world.camOverride = null; world.piAside = null; busy.current = false; return }
    saveGame({ shards: 10, checkpoint: { scene: 'marsh', at: 'gate' } })
    setState({ objective: 'Bond Shard 10 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… ten. The marsh mist is lifting. I can almost see the Keep from here.' },
      { who: 'Princess Octavia', text: 'He said his radicals strike at random. You counted every one.' },
      { who: 'Old Magnus', text: 'Keep the ring. Walden’s arena is east, in the Volcanic Wastes. Tell him Magnus sent you.' },
      { who: 'Pi', text: 'Ten down, two to go!' },
    ])
    world.camOverride = null
    world.piAside = null
    await warpOut(world, { checkpoint: { scene: 'marsh', at: 'gate' }, card: 10 })
    busy.current = false
    onExit('marsh', { scene: 'marsh', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -166], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss10 && (getState().save.shards || 0) < 10)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => {
    // on the bog's near bank (before it's solved) the camera stands back, so all four stones are in frame at portrait width
    const p = world.player, bank = !!p && p.pos.z < -14 && p.pos.z > -22 && !has('10-1')
    world.camBoost = world.bossCam ? { dist: 7, pitchSet: 0.45, lookY: 1.6, lookAhead: 1.5 } : bank ? { dist: 2.5, pitch: 0.42 } : null
    world.camMaxZ = world.bossCam ? -133.8 : undefined
    world.camMaxY = world.bossCam ? 5.6 : undefined
  })
  // while a stone or flask is carried, Kai's form tag steps aside (KaiModel reads `carrying`)
  useEffect(() => { setState({ carrying: !!(held || stone) }) }, [held, stone])
  useEffect(() => () => setState({ carrying: false }), [])

  const st = stone ? CX.find((c) => c.id === stone) : null
  return (
    <group>
      <color attach="background" args={['#161c14']} />
      <fog attach="fog" args={['#222a1e', 16, 66]} />
      <hemisphereLight args={['#d8f0c8', '#1e2418', 0.85]} />
      <ambientLight intensity={0.3} color="#e0f0d8" />
      <directionalLight position={[10, 40, -60]} intensity={0.7} color="#e8f8e0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <Flagstones x0={-W} x1={W} z0={8} z1={BOG.z[0]} seed={3} />
      <Flagstones x0={-W} x1={W} z0={BOG.z[1]} z1={-132} seed={5} />
      <Flagstones x0={-ARENA.x} x1={ARENA.x} z0={-132} z1={-172} size={2.4} base="#5e6a52" seed={9} />
      <mesh position={[0, -0.6, (BOG.z[0] + BOG.z[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2 * W, Math.abs(BOG.z[0] - BOG.z[1])]} /><meshStandardMaterial color="#3a3020" metalness={0.2} roughness={0.3} /></mesh>
      {[...Array(14)].map((_, i) => <mesh key={'bg' + i} position={[((i * 7) % 19) - 9.5, -0.45, BOG.z[0] - 0.8 - ((i * 5) % 11)]} rotation={[-Math.PI / 2, 0, i]}><circleGeometry args={[0.5 + (i % 3) * 0.25, 10]} /><meshStandardMaterial color="#4a5a2a" roughness={1} /></mesh>)}
      {[...Array(24)].map((_, i) => { const x = (i % 2 ? 1 : -1) * (W - 0.6 - (i % 3) * 0.5), z = BOG.z[0] - 0.6 - (i * 0.47) % 11.4; return <mesh key={'br' + i} position={[x, 0.1, z]} rotation={[0.1 * (i % 3), 0, 0.12 * ((i % 5) - 2)]}><cylinderGeometry args={[0.02, 0.035, 1.6 + (i % 4) * 0.3, 4]} /><meshStandardMaterial color="#6a7a3a" roughness={1} /></mesh> })}
      <Vault x={ARENA.x} />
      <ArenaVault x={ARENA.x} z0={ARENA.z[0]} z1={ARENA.z[1]} />
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -40, -52, -64, -76, -88, -100, -112, -124].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#9aff8a" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <NoticeBoard />
        <Tag position={[0, 2.4, 0]} df={10} far={18}>Malradix's notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t10-map']} onOpen={() => openChest('t10-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Sunken Forge</Tag>

      {/* 10-1 the naming bog */}
      <Suspense fallback={null}>
        {CX.map((c) => {
          const [x, z] = BOG.stones[lay.stones.indexOf(c.id)]
          if (laid.includes(c.id) || stone === c.id) return null
          return <group key={c.id} position={[x, 0, z]}><Part model="marsh" name="f10_stone" scale={0.8} /><Tag position={[0, 1.4, 0]} df={9} far={16}>{stoneTag(c, lay.bog)}</Tag></group>
        })}
        {laid.map((id, k) => { const c = CX.find((x) => x.id === id); return <group key={id} position={[BOG.sockets[k][0], -0.3 + sinkOf(id), BOG.sockets[k][1]]}><Part model="marsh" name="f10_stone" scale={[1.3, 1, 1.5]} /><Tag position={[0, 1.6, 0]} df={9} far={18}>{`${c.bond} · ${c.len} pm · ${c.D} kJ/mol`}</Tag></group> })}
      </Suspense>
      {BOG.sockets.slice(laid.length).map(([x, z], k) => <mesh key={k} position={[x, -0.5, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.9, 1.1, 24]} /><meshBasicMaterial color="#c8ffb0" transparent opacity={0.4} /></mesh>)}
      {st && <Carried world={world} label={stoneTag(st, lay.bog)} color="#8a9a7a" />}
      {!solved['10-1'] && <Tag position={[0, 2.6, BOG.z[0] - 0.6]} df={11} far={22}>{`The sockets want ${BOG_GOALS[lay.bog].label}`}</Tag>}
      <Gate world={world} pos={[0, 0, -34.4]} size={[2 * W, 7, 0.6]} open={!!solved['10-1']} color="#3a4a32" glow="#c8ffb0" />

      {/* 10-2 the hunt */}
      <Chest world={world} pos={[7.6, 0, -38]} rotY={-Math.PI / 2} opened={!!solved['t10-compass']} onOpen={() => openChest('t10-compass')} />
      <Gate world={world} pos={[0, 0, -57.5]} size={[2 * W, 7, 0.8]} open={!!(solved['10-2a'] && solved['10-2b'])} color="#3a4a32" glow="#c8ffb0" />

      {/* 10-3 the allyl crossing: a cyclohexene ring of pads, an H lamp on each carbon */}
      {CYCLO_H.map((h, k) => {
        const [x, z] = pad(k)
        const lit = !!ends[h.c] || (!!solved['10-3b'] && radical.includes(h.c)) // only where Br has bonded: no clue before
        return (
          <group key={k} position={[x, 0, z]}>
            <mesh position={[0, 0.04, 0]} receiveShadow><cylinderGeometry args={[1.0, 1.08, 0.08, 6]} /><meshStandardMaterial color="#7a8466" emissive="#3a4a2a" emissiveIntensity={0.35} roughness={0.9} flatShading /></mesh>
            <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.85, 6]} /><meshStandardMaterial color={lit ? '#ffe8a0' : '#6a705a'} emissive={lit ? '#a08a3a' : '#000'} emissiveIntensity={0.6} /></mesh>
            {!solved['10-3a'] && <><mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.05, 0.05, 1.4, 6]} /><meshStandardMaterial color="#8a8a7a" /></mesh><mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color="#f2f2f2" emissive="#bfe8ff" emissiveIntensity={0.8} /></mesh></>}
            <Tag position={[0, 1.2, 0]} df={8} far={22}>{lit ? `C${h.c}–Br` : `C${h.c} carbon`}</Tag>
          </group>
        )
      })}
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const [x1, z1] = padXZ(k), [x2, z2] = padXZ((k + 1) % 6), L = Math.hypot(x2 - x1, z2 - z1)
        const cA = ((k - lay.ring + 6) % 6) + 1, cB = (cA % 6) + 1 // the carbons this bond joins
        const allyl = !!solved['10-3a'] && ((radical[0] === 1 && (cA === 1 || cA === 2)) || (radical[0] === 2 && (cA === 6 || cA === 1)))
        const dbl = !solved['10-3a'] && cA === 1 && cB === 2
        return [0, ...(dbl || allyl ? [0.35] : [])].map((off) => {
          const half = allyl && off > 0 // a half bond: the π electrons spread over the allyl system
          return <mesh key={k + '-' + off} position={[(x1 + x2) / 2 + off * (z2 - z1) / L, 0.16, (z1 + z2) / 2 - off * (x2 - x1) / L]} rotation={[0, -Math.atan2(z2 - z1, x2 - x1), Math.PI / 2]}><cylinderGeometry args={[half ? 0.05 : 0.08, half ? 0.05 : 0.08, L - 1.6, 8]} /><meshStandardMaterial color={dbl ? '#5ff0ff' : half ? '#ffe8a0' : '#c8c8b8'} emissive={dbl ? '#2ab0d0' : half ? '#a08a3a' : '#000'} emissiveIntensity={0.8} transparent={half} opacity={half ? 0.6 : 1} /></mesh>
        })
      })}
      <Tag position={[ALLYL.centre[0], 3.0, ALLYL.centre[1]]} df={11} far={22}>{solved['10-3b'] ? '3-bromocyclohexene' : solved['10-3a'] ? 'an allylic radical · where is its electron?' : 'cyclohexene · C1=C2'}</Tag>
      {['left', 'right'].map((side) => { const [x, z] = ALLYL.doors[side]; return (
        <group key={side} position={[x, 0, z]}>
          <AllylDoor open={!!solved['10-3b']} color="#3a3a32" />
        </group>
      ) })}
      <Chest world={world} pos={[0, 0, -79.5]} big opened={!!solved['t10-ring']} show={!!solved['10-3b']} onOpen={() => openChest('t10-ring')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -82]} size={[2 * W, 7, 0.8]} open={!!solved['t10-ring']} color="#3a4a32" glow="#e8f0ff" />

      {/* 10-4 the alcohol spring */}
      {lay.flasks.map(([id, x, z]) => (
        <group key={id} position={[x, 0, z]}>
          <Plinth r={0.3} h={0.86} />
          {held !== id && <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.1, 0.1, 0.36, 10]} /><meshStandardMaterial color="#c8e8d0" emissive="#6a9a7a" emissiveIntensity={0.5} transparent opacity={0.9} /></mesh>}
          <Tag position={[0, 1.7, 0]} df={8} far={16}>{ALC_REAGENTS[id]}</Tag>
        </group>
      ))}
      {SPRINGS.map((sp) => { const [x, z] = SPRINGS_POS[sp.id]; const sx = x > 3 ? -0.5 : x < -3 ? 0.5 : 0; return (
        <group key={sp.id} position={[x, 0, z]}>
          <SpringBasin water={solved[sp.id] ? '#9affb8' : '#9ac8e8'} />
          <Tag position={[sx, 2.5, 0]} df={9} far={20}>{`wants: ${shown(sp.want)}`}</Tag>
          <Tag position={[sx, 2.0, 0]} df={10} far={20} className={solved[sp.id] ? 'ok-tag' : ''}>{solved[sp.id] ? shown(sp.want) : sp.alcohol}</Tag>
        </group>
      ) })}
      <Brazier pos={[-9.5, 0, -95]} light /><Brazier pos={[9.5, 0, -95]} light />
      {held && <Carried world={world} label={ALC_REAGENTS[held]} color="#c8e8d0" />}
      <Chest world={world} pos={[0, 0, -102]} opened={!!solved['t10-key']} show={!!(solved['10-4a'] && solved['10-4b'] && solved['10-4c'])} onOpen={() => openChest('t10-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -104]} size={[2 * W, 7, 0.8]} open={!!solved['t10-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -103.6]} df={13}>{solved['t10-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 10-5 the metal forge */}
      <mesh position={[FORGE10.pool[0], 0.03, FORGE10.pool[1]]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3, 24]} /><meshStandardMaterial color="#4a6a7a" metalness={0.3} roughness={0.2} /></mesh>
      <mesh position={[FORGE10.pool[0], 0.06, FORGE10.pool[1]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3, 3.5, 32]} /><meshStandardMaterial color="#5e6654" roughness={0.9} /></mesh>
      {[[-8.5, -116], [8.5, -116]].map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.9, 1.1, 1.4, 10]} /><meshStandardMaterial color="#3a3028" roughness={0.8} flatShading /></mesh>
          <mesh position={[0, 1.42, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.75, 16]} /><meshBasicMaterial color="#ff8a3a" toneMapped={false} /></mesh>
          <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.25, 0.4, 2.2, 8]} /><meshStandardMaterial color="#2a2e28" metalness={0.5} roughness={0.5} /></mesh>
          <pointLight position={[0, 2, 0]} color="#ff9a4a" intensity={2.4} distance={7} />
        </group>
      ))}
      <group position={[0, 0, -126]}><mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.6, 1.0, 0.8]} /><meshStandardMaterial color="#2a2e28" metalness={0.6} roughness={0.4} /></mesh><mesh position={[0, 1.05, 0]}><boxGeometry args={[2.0, 0.12, 0.9]} /><meshStandardMaterial color="#3a3e38" metalness={0.6} roughness={0.4} /></mesh></group>
      <Golems world={world} spawns={FORGE10.golems} pool={{ c: FORGE10.pool, r: 3 }} active={!!solved['t10-door'] && !solved['10-5g']} zone={[-106.5, -132]} onCleared={() => { if (!has('10-5g')) { markSolved('10-5g'); sfx('open'); toast('Both golems protonated. The forge is quiet.', 'good', 3000) } }} />
      <Chest world={world} pos={[0, 0, -129.5]} big opened={!!solved['t10-bosskey']} show={!!(solved['10-5g'] && solved['10-5gilman'] && solved['10-5ox'])} onOpen={() => openChest('t10-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -132]} size={[2 * W, 7, 0.8]} open={!!solved['t10-bossdoor']} color="#3a2a50" glow="#c9a3ff" />
      {/* a second gate shuts the pool while the Hydra fights */}
      <Gate world={world} pos={[0, 0, -133.2]} size={[2 * W, 7, 0.6]} open={!bossOn || !!solved.boss10} color="#3a2a50" glow="#c9a3ff" noCam />
      <PoolDressing center={HYDRA.center} />

      {Object.entries(STATIONS10).map(([id, st]) => {
        const once = !id.endsWith('info')
        return <Station key={id} world={world} pos={st.pos} label={once && solved[id] ? null : st.label} enabled={!(once && solved[id])} solved={!!solved[id]} onUse={() => runStation(id)} />
      })}

      {/* boss */}
      {(!solved.boss10 || sparkFly.current) && <Hydra10 world={world} center={HYDRA.center} active={bossOn && (!solved.boss10 || sparkFly.current)} onDefeated={bossDown} />}
      {magnusHere && <Magnus position={LQ_MAG} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss10 && (save.shards || 0) < 10} pos={[0, 0, -166]} />
      <Motes count={160} area={[20, 6, 170]} center={[0, 0.6, -80]} color="#c8ffb0" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Sunken({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'sunken' ? ROOMS10.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#161c14" camDist={6.2}>
      {(world) => <SunkenLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
