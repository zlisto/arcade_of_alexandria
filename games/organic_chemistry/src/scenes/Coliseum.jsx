import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag } from '../engine/kit'
import { useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Champion, { Walden, Ghouls } from '../actors/ArenaFolk'
import { ChairRing } from '../actors/ChairRing'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { DIALS, dialOk, dialLabel, dialJam, CENTRES, PIT_ACTS, MENTHYL, H_MISS, shuffled, shown, readMs } from '../chem/rules11'
import { isAxial } from '../chem/rules4'
import { resetTrial } from '../ui/Panels11'
import { W11 as W, ROOMS11, STATIONS11, CENTRES11, DIALS_POS, PIT11, RING11, GOALS11, CHAMP } from '../data/dungeon11'
import { AshFlags, Plinth, LeverStand, Sluice, Basin, HallVault, ArenaStands, BRASS } from './ColiseumDressing'
import { NoticeBoard, Brazier } from './SunkenDressing'

// Dungeon 11 — the Coliseum's under-halls (Chapter 11, Nucleophilic Substitutions and Eliminations).
// Ocarina-style: Dungeon Map, Compass, a small key, the Inversion Umbrella in a big chest, a Boss Key.
// Puzzles: backside attack and inversion (§11.1–11.2); the four SN2 dials (§11.3); the SN1 cation (§11.4–11.5);
// trans-diaxial E2 on a chair and Zaitsev (§11.7–11.9); naming the mechanism (§11.10–11.12).

preloadModels('wastes', 'walden')
const has = (id) => !!getState().save.solved[id]
// two-line tags: as wide as their text (up to a cap) instead of the zero-width Html box's min-content, and each
// compound name kept on one line so it never breaks at its hyphens
const TWO = { display: 'block', whiteSpace: 'normal', width: 'max-content', maxWidth: 250, textAlign: 'center', lineHeight: 1.25 }
const NW = (t) => <span style={{ whiteSpace: 'nowrap' }}>{t}</span>
const BOSS_Z = -136 // where the fight starts and Kai respawns: ~8.4 m past the fight gate, so the camera sits at its normal distance
const ARENA = { x: 14, z: [-126, -166] }
const FIGHT_GATE_Z = -127.6
// the shard scene: Kai and Walden either side of the shard, in front of it (World 10's framing)
const SHARD = [0, 0, -160]
const LQ_KAI = [1.6, 0, -158], LQ_WAL = [-1.6, 0, -158]
const DIRS = [0, Math.PI / 2, Math.PI, -Math.PI / 2] // a leaving group's compass direction (0 = toward the entrance, +z)

// each visit: which way each centre's leaving group points, which pedestal holds which dial (and in what order its
// settings turn), where the pit's three
// starts stand, which side each face's sluice is on, and which letter (and base pad) each of the chair's β-H gets.
// The chair itself always starts in menthyl chloride's all-equatorial chair (Fig 11.21b), so E on arrival never works.
const layout = () => ({
  lg: Object.fromEntries(CENTRES11.map((c) => [c.id, DIRS[Math.floor(Math.random() * 4)]])),
  dials: shuffled(DIALS.map((d) => d.id)),
  dialOpts: Object.fromEntries(DIALS.map((d) => [d.id, shuffled(d.opts.map(([v]) => v))])), // each dial's turning order, so no end of the list is the answer
  acts: shuffled(PIT_ACTS.map((a) => a.id)),
  faces: shuffled(['top', 'bottom']),
  hs: shuffled(MENTHYL.hs.map((h) => h.id)), // hs[k] is H (a), (b), (c): the k-th base pad, west to east
})
const H_LETTERS = ['a', 'b', 'c']
const H_PADS = [[-2.6, 4.4], [0, 4.4], [2.6, 4.4]] // base pads, relative to the ring's centre

function Walls({ world }) {
  const parts = useModelParts('wastes')
  const items = useMemo(() => {
    const out = []
    for (let z = 6; z > -124; z -= 4) { out.push([-W, 0, z, 1, 0]); out.push([W, 0, z, 1, Math.PI]) }
    for (let z = -128; z > -164; z -= 4) { out.push([-ARENA.x, 0, z, 1, 0]); out.push([ARENA.x, 0, z, 1, Math.PI]) }
    return out
  }, [])
  useEffect(() => {
    const ids = [
      world.addSolid([-W - 2, -9, -126], [-W, 9, 8]), world.addSolid([W, -9, -126], [W + 2, 9, 8]), world.addSolid([-W, -9, 8], [W, 9, 10]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1]], [-ARENA.x, 9, ARENA.z[0]]), world.addSolid([ARENA.x, -9, ARENA.z[1]], [ARENA.x + 2, 9, ARENA.z[0]]),
      world.addSolid([-ARENA.x - 2, -9, ARENA.z[1] - 2], [ARENA.x + 2, 9, ARENA.z[1]]),
      world.addSolid([-ARENA.x, -9, -127], [-W, 9, -125]), world.addSolid([W, -9, -127], [ARENA.x, 9, -125]),
      ...CENTRES11.map((c) => world.addSolid([c.pos[0] - 0.7, 0, c.pos[1] - 0.7], [c.pos[0] + 0.7, 1.2, c.pos[1] + 0.7])),
      world.addSolid([PIT11.centre[0] - 1.2, 0, PIT11.centre[1] - 1.2], [PIT11.centre[0] + 1.2, 1.0, PIT11.centre[1] + 1.2]),
    ]
    return () => ids.forEach((i) => world.remove(i))
  }, [world])
  return <InstancedPart parts={parts} name="a11_wall" items={items} />
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

/** a chirality centre on a carved plinth: three groups and the leaving group (Br), its leaving group pointing along
 *  the group's local +z; after a backside attack the nucleophile sits on the far side and the three groups flip over */
function CentreStatue({ c, info, dir, inverted }) {
  const g = info.groups
  const cols = ['#f2f2f2', '#ff6fb3', '#d0508e']
  const at = (k) => (k === 0 ? [0, 0.9, inverted ? 0.3 : -0.3] : [k === 1 ? 0.8 : -0.8, -0.4, inverted ? 0.4 : -0.4])
  return (
    <group position={[c.pos[0], 0, c.pos[1]]}>
      <group scale={[2.2, 1.4, 2.2]}><Plinth r={0.32} h={0.86} /></group>
      <group position={[0, 2.0, 0]} rotation={[0, dir, 0]}>
        <mesh><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color="#3a3640" /></mesh>
        {g.map((l, k) => {
          const [x, y, z] = at(k)
          return (
            <group key={l}>
              {[0.33, 0.66].map((f) => <mesh key={f} position={[x * f, y * f, z * f]}><sphereGeometry args={[0.06, 6, 4]} /><meshStandardMaterial color="#c8c4d8" /></mesh>)}
              <mesh position={[x, y, z]}><sphereGeometry args={[k === 0 ? 0.18 : 0.26, 12, 10]} /><meshStandardMaterial color={cols[k]} /></mesh>
              <Tag position={[x * 1.3, y * 1.3 + 0.25, z]} df={8} far={16}>{l}</Tag>
            </group>
          )
        })}
        {[0.33, 0.66].map((f) => <mesh key={'b' + f} position={[0, 0, (inverted ? -0.95 : 0.95) * f]}><sphereGeometry args={[0.06, 6, 4]} /><meshStandardMaterial color="#c8c4d8" /></mesh>)}
        {inverted
          ? <><mesh position={[0, 0, -0.95]}><sphereGeometry args={[0.26, 12, 10]} /><meshStandardMaterial color="#6ab0ff" /></mesh><Tag position={[0, 0.4, -1.3]} df={8} far={16}>{info.nuTag}</Tag></>
          : <><mesh position={[0, 0, 0.95]}><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#b0503a" emissive="#5a2010" emissiveIntensity={0.5} /></mesh><Tag position={[0, 0.4, 1.3]} df={8} far={16}>Br</Tag></>}
      </group>
      <Tag position={[0, 3.6, 0]} df={10} far={28} className={inverted ? 'ok-tag' : ''}>
        <span style={TWO}>{inverted ? NW(shown(info.product)) : <>{NW(info.name)}<br />+ {info.nu}</>}</span>
      </Tag>
    </group>
  )
}

/** the cation pit's molecule: (R)-6-chloro-2,6-dimethyloctane, a tertiary chloride; it flattens when the Cl leaves */
function PitMolecule({ ion, done }) {
  const groups = [['CH₃', '#ff6fb3'], ['C₂H₅', '#d0508e'], ['C₆H₁₃', '#c89ad8']]
  return (
    <group position={[0, 2.0, 0]}>
      <mesh><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color={ion && !done ? '#e0b0ff' : '#3a3640'} emissive={ion && !done ? '#c070ff' : '#000'} emissiveIntensity={1.2} /></mesh>
      {groups.map(([l, col], k) => { const a = (k / 3) * Math.PI * 2; const p = [Math.cos(a) * 0.9, ion ? 0 : -0.3, Math.sin(a) * 0.9]; return (
        <group key={l}>
          <mesh position={p}><sphereGeometry args={[0.24, 10, 8]} /><meshStandardMaterial color={col} /></mesh>
          <Tag position={[p[0] * 1.35, p[1] + 0.35, p[2] * 1.35]} df={8} far={16}>{l}</Tag>
        </group>
      ) })}
      {!ion && <><mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#6fe39a" /></mesh><Tag position={[0, 1.4, 0]} df={8} far={16}>Cl</Tag></>}
      {done && [0.9, -0.9].map((y) => <mesh key={y} position={[0, y, 0]}><sphereGeometry args={[0.24, 10, 8]} /><meshStandardMaterial color="#ff9a3a" transparent opacity={0.75} /></mesh>)}
    </group>
  )
}

function ColLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const bossLive = useRef(false) // the fight is running: room triggers hold still
  const sparkFly = useRef(false) // keeps the beaten Champion mounted while its spark flies east
  const [, bumpSpark] = useState(0)
  const [lay] = useState(layout)
  const [waldenHere, setWaldenHere] = useState(false)
  const dials = save.t11dials || {}
  const pit = save.t11pit || {}
  const flip = !!save.t11flip
  const dialAt = (id) => DIALS_POS.slots[lay.dials.indexOf(id)]
  const actAt = (id) => PIT11.acts[lay.acts.indexOf(id)]
  const faceAt = (face) => PIT11.faces[lay.faces.indexOf(face)]

  useEffect(() => {
    world.map = {
      floor: '#4a3e3e', wall: '#1a1418', pit: '#0a0608',
      labels: ROOMS11.map((r) => ({ pos: [r.id === 'boss' ? 0 : -W + 0.6, (r.z[0] + r.z[1]) / 2], text: r.title, align: r.id === 'boss' ? 'center' : 'left' })),
      mask: () => { const sv = getState().save; if (sv.solved['t11-map']) return null; const seen = sv.t11seen || {}; return ROOMS11.filter((r) => seen[r.id]).map((r) => [r.z[0], r.z[1]]) },
      goal: () => {
        const sv = getState().save
        if (!sv.solved['t11-compass']) return null
        const g = GOALS11.find((x) => !sv.solved[x.id])
        if (g) return g
        if ((sv.shards || 0) < 11) return { pos: [SHARD[0], SHARD[2]], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Wastes' }
      },
    }
    return () => { world.map = null }
  }, [world])

  // the chair starts each visit all-equatorial (menthyl chloride's more stable chair)
  useEffect(() => { if (!has('11-4e')) saveGame({ t11flip: false }) }, [])
  // a knockout in the dial room spins the dials back, so a jam can't be stepped through one dial at a time
  useEffect(() => {
    let kn = world.knockouts || 0
    const t = setInterval(() => {
      const n = world.knockouts || 0
      if (n === kn) return
      kn = n
      const sv = getState().save
      // a knockout mid-trial sends the challengers back to the start of the line
      if (!sv.solved['11-5'] && resetTrial()) setTimeout(() => toast('While you were down, the challengers lined up afresh. The trial starts over.', 'warn', 4200), 700)
      if (sv.solved['11-2'] || !sv.checkpoint || sv.checkpoint.room !== '11-2' || !Object.keys(sv.t11dials || {}).length) return
      saveGame({ t11dials: {} })
      setTimeout(() => toast('While you were down, the dials spun back to blank.', 'warn', 3600), 700)
    }, 250)
    return () => clearInterval(t)
  }, [world])
  const chairSubs = useMemo(() => [...MENTHYL.subs, ...lay.hs.map((id, k) => { const h = MENTHYL.hs.find((x) => x.id === id); return { c: h.c, face: h.face, label: `H (${H_LETTERS[k]})`, color: '#f2f2f2', size: 0.17 } })], [lay])

  useEffect(() => {
    playMusic('coliseum')
    world.killY = -8
    const f = [world.addFloor(-W, -126, W, 8, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -125, 0)]
    const HINTS = {
      '11-1': 'Ghouls! And two statues, each with a bromine sticking out one side.',
      '11-2': 'Four dials and a lever. Make the fastest SN2 there is.',
      '11-3': 'A tertiary chloride in a pool of water, and three ways to begin.',
      '11-4': 'A chair on the floor, and a base waiting beside it.',
      '11-5': 'The challengers’ bench. Read each one.',
    }
    const t = ROOMS11.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      if (bossLive.current) return // no room chip or checkpoint changes while the Champion fight runs
      setState({ hideFormTag: r.id.startsWith('11-') }) // Kai's form chip would sit over the puzzle tags in the rooms
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t11seen || {}
      saveGame({ checkpoint: { scene: 'coliseum', room: r.id }, t11seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) { const m = 'Pi: ' + HINTS[r.id]; setTimeout(() => toast(m, 'info', readMs(m)), 400) }
    }))
    // spans the arena and covers the boss checkpoint (z -133): a Continue there spawns inside it and starts the fight.
    // It starts ~3.4 m past the fight gate (z -127.6), so the fight camera has room behind Kai
    const bossT = world.addTrigger([-ARENA.x, -2, -137], [ARENA.x, 8, -131], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t11-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the herald’s notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Wastes', onInteract: () => onExit('wastes', { scene: 'wastes', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -105.2], radius: 2.2, label: () => (has('t11-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -125.2], radius: 2.4, label: () => (has('t11-bossdoor') ? null : 'Unlock the arena gate'), onInteract: () => unlockBossDoor() }),
    ]
    // 11-2 the dials (dealt to the pedestals per visit) and the lever
    DIALS.forEach((d) => { const [x, z] = dialAt(d.id); ia.push(world.addInteractable({ pos: [x, 0, z + 1.0], radius: 1.4, label: () => (has('11-2') ? null : `Turn the ${d.name} dial`), onInteract: () => turnDial(d) })) })
    ia.push(world.addInteractable({ pos: [DIALS_POS.run[0], 0, DIALS_POS.run[1] + 1.0], radius: 1.6, label: () => (has('11-2') ? null : 'Pull the lever: run the SN2'), onInteract: () => runSN2() }))
    // 11-3 the pit: three ways to begin, then the two faces' sluices, then call the mixture
    ia.push(world.addInteractable({ pos: [PIT11.centre[0], 0, PIT11.centre[1] + 2.2], radius: 1.8, label: () => { const pv = getState().save.t11pit || {}; return !has('11-3') && pv.top && pv.bottom ? 'Predict the mixture' : null }, onInteract: () => predictMix() }))
    PIT_ACTS.forEach((a) => { const [x, z] = actAt(a.id); ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.5, label: () => (has('11-3') || (getState().save.t11pit || {}).ion ? null : a.label), onInteract: () => pitAct(a) })) })
    ;['top', 'bottom'].forEach((face) => { const [x, z] = faceAt(face); ia.push(world.addInteractable({ pos: [x, 0, z + 1.0], radius: 1.6, label: () => (has('11-3') || (getState().save.t11pit || {})[face] ? null : `Open the ${face}-face sluice`), onInteract: () => attackFace(face) })) })
    // 11-4 the ring: flip it with the Gauntlet; send the base for one of the three β-H with E (pads a, b, c)
    const lanterns = [world.addLantern({ needs: 'hasGauntlet', omni: true, pos: [RING11.centre[0], 0, RING11.centre[1]], radius: 4.5, label: () => (has('11-4e') ? null : 'Ring-flip the chair'), onLantern: () => { if (has('11-4e')) return; saveGame({ t11flip: !getState().save.t11flip }); sfx('stomp'); world.shake = 0.2 } })]
    H_PADS.forEach(([dx, dz], k) => ia.push(world.addInteractable({ pos: [RING11.centre[0] + dx, 0, RING11.centre[1] + dz], radius: 1.2, label: () => (has('11-4e') ? null : `Send the base for H (${H_LETTERS[k]})`), onInteract: () => eliminate(lay.hs[k]) })))
    // 11-1 the umbrella on the centres
    CENTRES11.forEach((c) => lanterns.push(world.addLantern({ needs: 'hasUmbrella', omni: true, pos: [c.pos[0], 0, c.pos[1]], radius: 3.2, label: () => (has(c.id) ? null : `Attack with ${CENTRES[c.id].nu} (the Umbrella)`), onLantern: () => backside(c) })))
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS11.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
      window.__valence.col11 = lay
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...lanterns].forEach((i) => world.remove(i)); setState({ hideFormTag: false }) }
  }, [world])

  // ---------------------------------------------------------------- actions
  const wrong = (m, at) => { sfx('wrong'); world.player.hurt(1, at, true); toast(m, 'warn', readMs(m)) }
  const backside = async (c) => {
    if (has(c.id) || busy.current) return
    const info = CENTRES[c.id], a = lay.lg[c.id]
    const p = world.player
    const dx = p.pos.x - c.pos[0], dz = p.pos.z - c.pos[1], l = Math.hypot(dx, dz) || 1
    const along = (dx * Math.sin(a) + dz * Math.cos(a)) / l // +1 on the leaving group's side, −1 straight behind it
    if (along > -0.5) { sfx('block'); return wrong('The umbrella bounces off. SN2 needs the nucleophile on the side opposite the leaving group.', [c.pos[0], 0, c.pos[1]]) }
    // it lands: call the product's configuration before the statue turns inside out
    sfx('right'); world.shake = 0.2
    busy.current = true
    let miss = null
    const ok = await openPanel('centrePredict', { id: c.id, onWrong: (t) => { miss = t } })
    busy.current = false
    if (!ok) { if (miss) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, [c.pos[0], 0, c.pos[1]], true); toast(miss, 'warn', readMs(miss)) } return }
    markSolved(c.id); sfx('shard'); world.shake = 0.3
    const m = `${info.nu} pushes in, Br⁻ leaves from the far side, and the centre turns inside out: ${shown(info.product)}. Inversion.`
    toast(m, 'good', readMs(m))
  }
  const turnDial = (d) => {
    if (has('11-2')) return
    const cur = getState().save.t11dials || {}
    const ord = lay.dialOpts[d.id], i = ord.indexOf(cur[d.id])
    const next = ord[(i + 1) % ord.length]
    saveGame({ t11dials: { ...cur, [d.id]: next } }); sfx('pickup')
  }
  const runSN2 = () => {
    if (has('11-2')) return
    const cur = getState().save.t11dials || {}
    const unset = DIALS.find((d) => !cur[d.id])
    if (unset) { sfx('wrong'); const m = `Set the ${unset.name} dial first.`; toast(m, 'warn', readMs(m)); return }
    const bad = DIALS.filter((d) => !dialOk(d, cur[d.id])).length // how many, never which
    if (bad) return wrong(dialJam(bad), [DIALS_POS.run[0], 0, DIALS_POS.run[1]])
    markSolved('11-2'); sfx('open')
    const m = 'An unhindered carbon, a charged, basic nucleophile, a leaving group that’s a weak base, a polar aprotic solvent: the fastest SN2 here.'
    toast(m, 'good', readMs(m))
  }
  const pitAct = (a) => {
    const pv = getState().save.t11pit || {}
    if (has('11-3') || pv.ion || busy.current) return
    if (!a.right) return wrong(a.why, [PIT11.centre[0], 0, PIT11.centre[1]])
    sfx('dash'); const m = 'You wait… the Cl leaves on its own. A flat tertiary carbocation, held up by the water round it.'
    toast(m, 'info', readMs(m))
    setTimeout(() => saveGame({ t11pit: { ...(getState().save.t11pit || {}), ion: true } }), 1800)
  }
  const attackFace = (face) => {
    const pv = getState().save.t11pit || {}
    if (has('11-3') || pv[face]) return
    if (!pv.ion) return wrong('The sluice won’t budge. The chloride still sits on the carbon: nothing can come in yet.', [faceAt(face)[0], 0, faceAt(face)[1]])
    const p = { ...pv, [face]: true }
    saveGame({ t11pit: p }); sfx('right')
    const m = p.top && p.bottom ? 'Water reaches the other face too: the other enantiomer.' : `Water adds to the ${face} face of the flat cation: one enantiomer.`
    toast(m, 'good', readMs(m))
    if (p.top && p.bottom && !has('11-3')) setTimeout(() => predictMix(), 900)
  }
  // both faces have taken water: call the mixture (p. 354) before the gate opens
  const predictMix = async () => {
    const pv = getState().save.t11pit || {}
    if (has('11-3') || !pv.top || !pv.bottom || busy.current) return
    busy.current = true
    let miss = null
    const ok = await openPanel('pitMix', { onWrong: (t) => { miss = t } })
    busy.current = false
    if (!ok) { if (miss) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, [PIT11.centre[0], 0, PIT11.centre[1]], true); toast(miss, 'warn', readMs(miss)) } return }
    markSolved('11-3'); sfx('open')
    setTimeout(() => say([{ who: 'Pi', text: 'Not quite racemic. The chloride hung about for a moment and got in the way!' }]), 500)
  }
  const eliminate = (hid) => {
    if (has('11-4e') || busy.current) return
    const h = MENTHYL.hs.find((x) => x.id === hid)
    const at = [RING11.centre[0], 0, RING11.centre[1]]
    if (!isAxial(MENTHYL.cl.c, MENTHYL.cl.face, !!getState().save.t11flip)) return wrong('The base finds no H lined up with the Cl. E2 needs H and leaving group anti-periplanar; in a ring, both axial.', at)
    if (!h.right) return wrong(H_MISS[h.id], at)
    markSolved('11-4e'); sfx('open')
    const m = 'The axial H on C2, anti to the axial Cl: one step, and HCl is gone. 2-Menthene, not the Zaitsev 3-menthene. Only that H was trans-diaxial.'
    toast(m, 'good', readMs(m))
  }

  const readDecree = async () => {
    if (busy.current) return
    busy.current = true
    await say([
      { who: 'The herald’s notice', text: 'BY ORDER OF MALRADIX: Substitution and elimination are random luck. Place your bets.' },
      { who: 'Pi', text: 'Walden’s written “NO BETTING” across it in red.' },
    ])
    markSolved('t11-decree')
    busy.current = false
  }
  const unlockDoor = () => {
    if (has('t11-door')) return
    if (!getState().save.t11key) { toast('Locked. It needs a small key.', 'warn'); sfx('wrong'); return }
    saveGame({ t11key: false }); markSolved('t11-door'); sfx('open'); toast('You used the small key. The door opens.', 'good')
  }
  const unlockBossDoor = () => {
    if (has('t11-bossdoor')) return
    if (!has('t11-bosskey')) { toast('The arena gate. A crowd roars beyond it. It needs the Boss Key.', 'warn', 3600); sfx('wrong'); return }
    markSolved('t11-bossdoor'); sfx('open'); toast('The Boss Key turns. The gate grinds up into the light…', 'good', 3600)
  }
  const openChest = async (id) => {
    if (has(id) || busy.current) return
    busy.current = true
    markSolved(id); sfx('shard')
    if (id === 't11-map') await say([{ who: '', text: 'You got the Dungeon Map!' }])
    if (id === 't11-compass') await say([{ who: '', text: 'You got the Compass!' }])
    if (id === 't11-key') { saveGame({ t11key: true }); await say([{ who: '', text: 'You got a Small Key!' }]) }
    if (id === 't11-umb') {
      saveGame({ hasUmbrella: true })
      await itemGet(world, { model: 'walden', name: 't11_umb', scale: 1.4, color: '#ff8a6a' }, [
        { who: '', text: 'You got the Inversion Umbrella!' },
        { who: 'Pi', text: 'Aim it at a chirality centre and press G. Where you stand decides whether it works.' },
        { who: 'Pi', text: 'When it does, the centre flips inside out, like this umbrella in a gale.' },
      ])
    }
    if (id === 't11-bosskey') { saveGame({ t11bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }
  // a station's trial: a wrong answer closes the panel, toasts its rule and costs half a heart
  const runStation = async (id) => {
    const st = STATIONS11[id]
    if (busy.current) return
    busy.current = true
    let miss = null
    const ok = await openPanel(st.panel, { ...st.props, onWrong: (t) => { miss = t } })
    busy.current = false
    if (!ok) { if (miss) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, [st.pos[0], 0, st.pos[2]], true); toast(miss, 'warn', readMs(miss)) } return }
    if (id === '11-1info') return
    markSolved(id)
    if (id === '11-5') { sfx('open'); toast('Every call right. A big chest rises by the arena gate.', 'good', 3600) }
  }

  const startBoss = async () => {
    if (has('boss11') || bossStarted.current || busy.current) return
    bossStarted.current = true
    bossLive.current = true
    busy.current = true
    setState({ hideFormTag: true }) // Kai's form chip would float over him and the banner tags all fight long
    playMusic('boss')
    world.respawn = [0, 0, BOSS_Z] // well clear of the fight gate (z -127.6), so the camera has room behind Kai
    if (world.player && world.player.pos.z > BOSS_Z + 0.5) world.player.teleport([world.player.pos.x, 0, BOSS_Z], Math.PI) // (a Continue lands at z -133)
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t11bossIntro) {
      saveGame({ t11bossIntro: true })
      // frame the Champion's chest and the violet spark in it (enemies hold still while Pi talks)
      const q = world.champSpark
      world.camOverride = q ? { pos: [q.x + 1.5, 4.0, q.z + 11.5], look: [q.x, q.y - 0.1, q.z] } : { pos: [3, 4, -138], look: [CHAMP.center[0], 2, CHAMP.center[2]] }
      await say([
        { who: 'Pi', text: 'The Five-Stanced Champion! Five banners, but only four rounds. And there’s the violet spark, in its chest!' },
        { who: 'Pi', text: 'The banners call the conditions. Read them, strike the right mechanism, then use what it gives you.' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Conditions first. Then the banner. Then it.' }])
    busy.current = false
  }
  const bossDown = async () => {
    sparkFly.current = true // the Champion stays mounted until Pi's line is read
    bossLive.current = false
    setState({ hideFormTag: false })
    markSolved('boss11')
    setState({ objective: 'Take the Bond Shard' })
    playMusic('coliseum')
    // the spark tears out of the kneeling Champion and flies east (+x), toward the Summit of Light: a wide shot from the
    // arena's west side follows it. It stops at the east wall's top (x 12.8) and hovers there, on camera, until Pi's
    // line is closed; then it fades out over the stands
    world.champSparkGone = false
    // framed on the Champion's centre spot: wherever the last hit landed (even mid-lunge), it slides back there as it
    // sinks (ArenaFolk 'gone' mode); the camera stays inside the arena walls
    const cp = { x: CHAMP.center[0], z: CHAMP.center[2] }
    const camPos = [Math.max(-ARENA.x + 1.5, cp.x - 11), 4.5, Math.min(FIGHT_GATE_Z - 1, cp.z + 12)] // far enough back that the kneeling Champion stays whole, left of frame
    const lookAt = (q) => [(q.x + cp.x) / 2 + 0.5, 1.4 + (q.y - 1.4) * 0.5, (q.z + cp.z) / 2] // between the kneeling Champion and the spark, so both stay in frame
    const follow = setInterval(() => { const q = world.champSpark; if (q) world.camOverride = { pos: camPos, look: lookAt(q) } }, 16)
    const flight = new Promise((r) => setTimeout(r, 3600))
    await Promise.all([say([{ who: 'Pi', text: 'Four rounds, four calls, no luck at all! Look, the spark!' }]), flight])
    world.champSparkGone = true
    await new Promise((r) => setTimeout(r, 700))
    clearInterval(follow)
    world.camOverride = null
    sparkFly.current = false; bumpSpark((n) => n + 1)
    await say([{ who: 'Pi', text: 'East again, up the mountain. First, the shard!' }])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 11 || busy.current) return
    busy.current = true
    sfx('shard')
    setWaldenHere(true)
    // Kai and Walden stand either side of the shard, in front of it; Pi hovers above and between them; the camera sits
    // square on the pair, nudged toward Walden, with the arena's far wall behind
    if (world.player) world.player.teleport(LQ_KAI, -Math.PI / 2)
    world.piAside = [-0.4, 2.9, LQ_KAI[2] - 1.3]
    await new Promise((r) => setTimeout(r, 300))
    const mid = (LQ_KAI[0] + LQ_WAL[0]) / 2
    world.camOverride = { pos: [mid, 1.5, LQ_KAI[2] + 6.2 * Math.max(1, 1.2 / (window.innerWidth / Math.max(1, window.innerHeight)))], look: [mid - 0.4, 0.9, LQ_KAI[2]] } // backs off in portrait
    await say([{ who: 'Sage Walden', text: 'Bravo! Bravo. One last question from the old master, and the shard is yours.' }])
    let miss = null
    const ok = await openPanel('champCheck', { onWrong: (t) => { miss = t } })
    if (!ok && miss) { await new Promise((r) => setTimeout(r, 50)); world.player.hurt(1, LQ_WAL, true); toast(miss, 'warn', readMs(miss)) } // a tick after the panel closes (hurt is ignored while a panel is open)
    if (!ok) { await say([{ who: 'Sage Walden', text: 'Take a breath. The arena isn’t going anywhere.' }]); world.camOverride = null; world.piAside = null; busy.current = false; return }
    saveGame({ shards: 11, checkpoint: { scene: 'wastes', at: 'gate' } })
    setState({ objective: 'Bond Shard 11 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… eleven. One more, and the Keep’s wards will fall.' },
      { who: 'Princess Octavia', text: 'He called it luck. You called every stance before it moved.' },
      { who: 'Sage Walden', text: 'Keep the spare umbrella. That spark fled east, up to Spectra’s observatory. Nothing hides from her for long.' },
      { who: 'Pi', text: 'Eleven down, ONE to go!' },
    ])
    world.camOverride = null
    world.piAside = null
    await warpOut(world, { checkpoint: { scene: 'wastes', at: 'gate' }, card: 11 })
    busy.current = false
    onExit('wastes', { scene: 'wastes', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: SHARD, radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss11 && (getState().save.shards || 0) < 11)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => {
    world.camBoost = world.bossCam ? { dist: 7.5, pitchSet: 0.45, lookY: 1.6, lookAhead: 1.5 } : null
    // the camera stays on the arena side of the fight gate while the fight runs
    world.camMaxZ = world.bossCam ? FIGHT_GATE_Z - 0.6 : undefined
    world.camMaxY = world.bossCam ? 6 : undefined
  })
  useEffect(() => () => { world.camMaxZ = undefined; world.camMaxY = undefined }, [])

  const ionNow = !!pit.ion
  return (
    <group>
      <color attach="background" args={['#2a1a1a']} />
      <fog attach="fog" args={['#2a181a', 18, 70]} />
      <hemisphereLight args={['#ffc8b0', '#1a1014', 0.8]} />
      <ambientLight intensity={0.3} color="#ffd8c8" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#ffd0b0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <AshFlags x0={-W} x1={W} z0={8} z1={-126} />
      <AshFlags x0={-ARENA.x} x1={ARENA.x} z0={-125} z1={-166} base="#8a7258" size={2.4} seed={9} />
      <HallVault x={W} z0={8} z1={-125} />
      <ArenaStands x={ARENA.x} z0={-127} z1={ARENA.z[1]} />
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -26, -46, -66, -78, -90, -102, -114].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#ff8a3a" />))}
      {[[-12, -132], [12, -132], [-12, -160], [12, -160]].map(([x, z]) => <Brazier key={x + ',' + z} pos={[x, 0, z]} color="#ffa040" h={1.3} light />)}

      {/* entrance */}
      <group position={[5, 0, -9]} rotation={[0, -0.4, 0]}>
        <NoticeBoard />
        {/* Walden's red “NO BETTING” slash across the decree */}
        <mesh position={[0, 1.25, 0.07]} rotation={[0, 0, 0.5]}><planeGeometry args={[0.9, 0.08]} /><meshBasicMaterial color="#c02020" /></mesh>
      </group>
      <Tag position={[5, 2.5, -9]} df={10} far={20}>The herald’s notice</Tag>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t11-map']} onOpen={() => openChest('t11-map')} />
      <Tag position={[0, 6.5, -13]} df={16} far={30}>The Under-Halls</Tag>

      {/* 11-1 the Walden gate */}
      <Ghouls world={world} spawns={[[-4, -20], [4, -22], [0, -26]]} active={!solved['t11-ghouls']} zone={[-14, -40]} xMax={W - 2} onCleared={() => { if (!has('t11-ghouls')) { markSolved('t11-ghouls'); sfx('open'); toast('The ghouls have left. A big chest rises!', 'good', 3200) } }} />
      <Chest world={world} pos={[0, 0, -22]} big opened={!!solved['t11-umb']} show={!!solved['t11-ghouls']} onOpen={() => openChest('t11-umb')} label="Open the big chest" />
      {CENTRES11.map((c) => <CentreStatue key={c.id} c={c} info={CENTRES[c.id]} dir={lay.lg[c.id]} inverted={!!solved[c.id]} />)}
      <Gate world={world} pos={[0, 0, -39.5]} size={[2 * W, 7, 0.8]} open={!!(solved['11-1a'] && solved['11-1b'])} color="#4a2a2a" glow="#ff8a6a" />

      {/* 11-2 four dials */}
      <Chest world={world} pos={[-7.6, 0, -42]} rotY={Math.PI / 2} opened={!!solved['t11-compass']} onOpen={() => openChest('t11-compass')} />
      {DIALS.map((d) => {
        const [x, z] = dialAt(d.id), v = dials[d.id], k = lay.dialOpts[d.id].indexOf(v)
        return (
          <group key={d.id} position={[x, 0, z]}>
            <group scale={[1.9, 1.35, 1.9]}><Plinth r={0.32} h={0.86} /></group>
            <group position={[0, 1.25, 0.32]} rotation={[0, 0, k < 0 ? 0 : -(k / d.opts.length) * Math.PI * 2]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.08, 20]} /><meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.3} /></mesh>
              <mesh position={[0, 0.28, 0.05]}><boxGeometry args={[0.06, 0.3, 0.04]} /><meshStandardMaterial color="#2a2426" /></mesh>
            </group>
            <Tag position={[0, 2.5, 0]} df={9} far={26}>{d.name}</Tag>
            <Tag position={[0, 2.0, 0]} df={8} far={26} className={solved['11-2'] ? 'ok-tag' : ''}>{dialLabel(d, v)}</Tag>
          </group>
        )
      })}
      <group position={[DIALS_POS.run[0], 0, DIALS_POS.run[1]]}><LeverStand thrown={!!solved['11-2']} /></group>
      <Gate world={world} pos={[0, 0, -59.5]} size={[2 * W, 7, 0.8]} open={!!solved['11-2']} color="#4a2a2a" glow="#ff8a6a" />

      {/* 11-3 the cation pit */}
      <group position={[PIT11.centre[0], 0, PIT11.centre[1]]}>
        <Basin r={1.2} h={1.0} />
        <PitMolecule ion={ionNow} done={!!solved['11-3']} />
        <Tag position={[0, 3.8, 0]} df={10} far={26} className={solved['11-3'] ? 'ok-tag' : ''}>
          <span style={TWO}>{solved['11-3'] ? <>{NW(shown('3,7-dimethyloctan-3-ol'))}<br />40% (R) : 60% (S)</> : pit.top && pit.bottom ? <>{NW(shown('3,7-dimethyloctan-3-ol'))}<br />what mixture?</> : ionNow ? <>a flat tertiary carbocation<br />in water</> : <>{NW('(R)-6-chloro-2,6-dimethyloctane')}<br />in water</>}</span>
        </Tag>
      </group>
      {!ionNow && !solved['11-3'] && PIT_ACTS.map((a) => { const [x, z] = actAt(a.id); return (
        <group key={a.id} position={[x, 0, z]}>
          <Plinth r={0.3} h={0.86} />
          <mesh position={[0, 0.98, 0]}>{a.id === 'base' ? <cylinderGeometry args={[0.12, 0.16, 0.24, 10]} /> : a.id === 'back' ? <torusGeometry args={[0.14, 0.04, 6, 14]} /> : <octahedronGeometry args={[0.14, 0]} />}<meshStandardMaterial color="#c8a050" metalness={0.6} roughness={0.35} /></mesh>
          <Tag position={[0, 1.6, 0]} df={8} far={26}><span style={{ ...TWO, maxWidth: 130 }}>{a.label}</span></Tag>
        </group>
      ) })}
      {['top', 'bottom'].map((face) => { const [x, z] = faceAt(face); return (
        <group key={face} position={[x, 0, z]}>
          <Sluice open={!!pit[face]} lit={ionNow && !pit[face]} />
          {/* on the frame's front, below the lintel, so it never rides up into the HUD at the room's checkpoint */}
          <Tag position={[0, 2.4, 0.6]} df={9} far={20}>{`the ${face} face`}</Tag>
        </group>
      ) })}
      <Gate world={world} pos={[0, 0, -81.5]} size={[2 * W, 7, 0.8]} open={!!solved['11-3']} color="#4a2a2a" glow="#ff8a6a" />

      {/* 11-4 the elimination ring */}
      <mesh position={[RING11.centre[0], 0.04, RING11.centre[1]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[3.6, 4.0, 48]} /><meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.4} /></mesh>
      <ChairRing position={[RING11.centre[0], 1.2, RING11.centre[1]]} R={2.6} amp={0.5} atom={0.3} bond={0.09} len={1.0} flip={flip} subs={chairSubs} />
      <Tag position={[RING11.centre[0], 3.8, RING11.centre[1]]} df={11} far={20} className={solved['11-4e'] ? 'ok-tag' : ''}>{solved['11-4e'] ? '2-menthene · HCl left trans-diaxial' : 'menthyl chloride · a base waits'}</Tag>
      {!solved['11-4e'] && H_PADS.map(([dx, dz], k) => (
        <group key={k} position={[RING11.centre[0] + dx, 0, RING11.centre[1] + dz]}>
          <Plinth r={0.26} h={0.7} />
          <Tag position={[0, 1.3, 0]} df={8} far={16}>{`base → H (${H_LETTERS[k]})`}</Tag>
        </group>
      ))}
      <Chest world={world} pos={[0, 0, -104]} opened={!!solved['t11-key']} show={!!(solved['11-4e'] && solved['11-4z'])} onOpen={() => openChest('t11-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -106]} size={[2 * W, 7, 0.8]} open={!!solved['t11-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -105.6]} df={13} far={24}>{solved['t11-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 11-5 the trial */}
      <Chest world={world} pos={[0, 0, -123.5]} big opened={!!solved['t11-bosskey']} show={!!solved['11-5']} onOpen={() => openChest('t11-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -126]} size={[2 * W, 7, 0.8]} open={!!solved['t11-bossdoor']} color="#3a2a50" glow="#c9a3ff" />
      {/* the fight gate: shut behind Kai while the Champion fight runs; the follow camera ignores it */}
      <Gate world={world} pos={[0, 0, FIGHT_GATE_Z]} size={[2 * ARENA.x, 7, 0.6]} open={!bossOn || !!solved.boss11} color="#3a2a50" glow="#c9a3ff" noCam />

      {Object.entries(STATIONS11).map(([id, st]) => {
        const once = id !== '11-1info'
        return <Station key={id} world={world} pos={st.pos} label={once && solved[id] ? null : st.label} enabled={!(once && solved[id])} solved={!!solved[id]} onUse={() => runStation(id)} />
      })}

      {/* boss */}
      {(!solved.boss11 || sparkFly.current) && <Champion world={world} center={CHAMP.center} R={CHAMP.R} active={bossOn && (!solved.boss11 || sparkFly.current)} onDefeated={bossDown} />}
      {waldenHere && <Walden position={LQ_WAL} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss11 && (save.shards || 0) < 11} pos={SHARD} />
      <Motes count={160} area={[20, 6, 166]} center={[0, 0.6, -80]} color="#ffa060" size={0.05} />
      <PiFollower world={world} />
    </group>
  )
}

export default function Coliseum({ onExit }) {
  const cp = getState().save.checkpoint
  const room = cp && cp.scene === 'coliseum' ? ROOMS11.find((r) => r.id === cp.room) : null
  const start = room ? room.checkpoint : [0, 0, 3]
  return (
    <GameScene start={start} startFacing={Math.PI} background="#2a1a1a" camDist={6.2}>
      {(world) => <ColLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
