import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import GameScene from '../engine/GameScene'
import { itemGet } from '../engine/ItemGet'
import { warpOut } from '../engine/Warp'
import { Gate, Station, Torch, Motes, Chest, Tag, twoShot } from '../engine/kit'
import { Part, useModelParts, InstancedPart, preloadModels } from '../engine/models'
import Champion, { Walden, Ghouls } from '../actors/ArenaFolk'
import { ChairRing } from '../actors/ChairRing'
import { PiFollower } from './Village'
import { getState, setState, saveGame, markSolved, say, toast, openPanel, useGame } from '../engine/store'
import { playMusic, sfx } from '../audio/sfx'
import { DIALS, dialOk } from '../chem/rules11'
import { isAxial } from '../chem/rules4'
import { W11 as W, ROOMS11, STATIONS11, CENTRES11, DIALS_POS, PIT11, RING11, GOALS11, CHAMP } from '../data/dungeon11'

// Dungeon 11 — the Coliseum's under-halls (Chapter 11, Nucleophilic Substitutions and Eliminations).
// Ocarina-style: Dungeon Map, Compass, a small key, the Inversion Umbrella in a big chest, a Boss Key.
// Puzzles: backside attack and inversion (§11.1–11.2); the four SN2 dials (§11.3); the SN1 cation (§11.4–11.5);
// trans-diaxial E2 on a chair and Zaitsev (§11.7–11.9); naming the mechanism (§11.10–11.12).

preloadModels('wastes', 'walden')
const has = (id) => !!getState().save.solved[id]
const ARENA = { x: 14, z: [-126, -166] }

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
      world.addSolid([PIT11.centre[0] - 1.0, 0, PIT11.centre[1] - 1.0], [PIT11.centre[0] + 1.0, 1.0, PIT11.centre[1] + 1.0]),
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

/** a chirality centre on a pedestal: three groups and a leaving group (Br) pointing toward the entrance (+z) */
function CentreStatue({ c, inverted }) {
  return (
    <group position={[c.pos[0], 0, c.pos[1]]}>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.7, 0.8, 1.2, 12]} /><meshStandardMaterial color="#4a3e3e" /></mesh>
      <group position={[0, 2.0, 0]}>
        <mesh><sphereGeometry args={[0.3, 14, 10]} /><meshStandardMaterial color="#3a3640" /></mesh>
        {[[0, 0.9, 0.0, 'H', '#f2f2f2'], [0.8, -0.4, inverted ? 0.4 : -0.4, 'CH₃', '#ff6fb3'], [-0.8, -0.4, inverted ? 0.4 : -0.4, 'C₂H₅', '#d0508e']].map(([x, y, z, l, col]) => (
          <group key={l}>
            <mesh position={[x * 0.5, y * 0.5, z * 0.5]} quaternion={undefined}><sphereGeometry args={[0.06, 6, 4]} /><meshStandardMaterial color="#c8c4d8" /></mesh>
            <mesh position={[x, y, z]}><sphereGeometry args={[l === 'H' ? 0.18 : 0.26, 12, 10]} /><meshStandardMaterial color={col} /></mesh>
            <Tag position={[x * 1.4, y * 1.4 + 0.2, z]} df={8} far={12}>{l}</Tag>
          </group>
        ))}
        {inverted
          ? <><mesh position={[0, 0, -0.95]}><sphereGeometry args={[0.26, 12, 10]} /><meshStandardMaterial color="#ff9a3a" /></mesh><Tag position={[0, 0.4, -1.3]} df={8} far={12}>OH</Tag></>
          : <><mesh position={[0, 0, 0.95]}><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#b0503a" emissive="#5a2010" emissiveIntensity={0.5} /></mesh><Tag position={[0, 0.4, 1.3]} df={8} far={12}>Br (leaving group)</Tag></>}
      </group>
      <Tag position={[0, 3.4, 0]} df={10} far={16} className={inverted ? 'ok-tag' : ''}>{inverted ? c.product : `${c.name} · the gate wants ${c.want}`}</Tag>
    </group>
  )
}

function ColLevel({ world, onExit }) {
  const save = useGame((s) => s.save)
  const solved = save.solved
  const busy = useRef(false)
  const [bossOn, setBossOn] = useState(false)
  const bossStarted = useRef(false)
  const [waldenHere, setWaldenHere] = useState(false)
  const dials = save.t11dials || {}
  const pit = save.t11pit || {}
  const flip = !!save.t11flip

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
        if ((sv.shards || 0) < 11) return { pos: [0, -160], label: 'Take the Bond Shard' }
        return { pos: [0, 6], label: 'Back to the Wastes' }
      },
    }
    return () => { world.map = null }
  }, [world])

  useEffect(() => {
    playMusic('coliseum')
    world.killY = -8
    const f = [world.addFloor(-W, -126, W, 8, 0), world.addFloor(-ARENA.x, ARENA.z[1], ARENA.x, -125, 0)]
    const HINTS = {
      '11-1': 'Ghouls! And statues with a bromine pointing straight at us.',
      '11-2': 'Four dials and a lever. Make the fastest SN2 there is.',
      '11-3': 'A tertiary bromide sitting in water. Maybe we just… wait?',
      '11-4': 'A chair on the floor! Your old Gauntlet will work here.',
      '11-5': 'The challengers’ bench. Five of them, five mechanisms.',
    }
    const t = ROOMS11.map((r) => world.addTrigger([-ARENA.x, -8, r.z[1] + 0.5], [ARENA.x, 12, r.z[0] - 1], () => {
      const sv = getState().save
      world.respawn = r.checkpoint
      const seen = sv.t11seen || {}
      saveGame({ checkpoint: { scene: 'coliseum', room: r.id }, t11seen: seen[r.id] ? seen : { ...seen, [r.id]: true } })
      setState({ objective: r.title + (r.sections.length ? `  ·  §${r.sections.join(', §')}` : '') })
      if (!seen[r.id] && HINTS[r.id]) setTimeout(() => toast('Pi: ' + HINTS[r.id], 'info', 4800), 400)
    }))
    const bossT = world.addTrigger([-6, 0, -132], [6, 6, -128], () => startBoss())
    const decreeT = world.addTrigger([-W, -2, -7], [W, 6, -4], () => { if (!getState().save.solved['t11-decree']) readDecree() })
    const ia = [
      world.addInteractable({ pos: [5, 0, -9], radius: 2.2, label: 'Read the herald’s notice', onInteract: () => readDecree() }),
      world.addInteractable({ pos: [0, 0, 6.5], radius: 2.4, label: 'Leave for the Wastes', onInteract: () => onExit('wastes', { scene: 'wastes', at: 'gate' }) }),
      world.addInteractable({ pos: [0, 0, -105.2], radius: 2.2, label: () => (has('t11-door') ? null : 'Unlock the door'), onInteract: () => unlockDoor() }),
      world.addInteractable({ pos: [0, 0, -125.2], radius: 2.4, label: () => (has('t11-bossdoor') ? null : 'Unlock the arena gate'), onInteract: () => unlockBossDoor() }),
    ]
    // 11-2 the dials and the lever
    DIALS.forEach((d) => { const [x, z] = DIALS_POS[d.id]; ia.push(world.addInteractable({ pos: [x, 0, z + 1.0], radius: 1.4, label: () => (has('11-2') ? null : `Turn the ${d.name} dial`), onInteract: () => turnDial(d) })) })
    ia.push(world.addInteractable({ pos: [DIALS_POS.run[0], 0, DIALS_POS.run[1] + 1.0], radius: 1.6, label: () => (has('11-2') ? null : 'Pull the lever: run the SN2'), onInteract: () => runSN2() }))
    // 11-3 the pit
    ia.push(world.addInteractable({ pos: [PIT11.centre[0], 0, PIT11.centre[1] + 1.6], radius: 1.8, label: () => (has('11-3') || (getState().save.t11pit || {}).ion ? null : 'Wait for the leaving group to go'), onInteract: () => ionize() }))
    ;['top', 'bottom'].forEach((face) => { const [x, z] = PIT11[face]; ia.push(world.addInteractable({ pos: [x, 0, z], radius: 1.6, label: () => ((getState().save.t11pit || {}).ion && !(getState().save.t11pit || {})[face] ? `Let water in from the ${face} face` : null), onInteract: () => attackFace(face) })) })
    // 11-4 the ring: flip it with the Gauntlet; eliminate with E
    const lanterns = [world.addLantern({ needs: 'hasGauntlet', omni: true, pos: [RING11.centre[0], 0, RING11.centre[1]], radius: 4.5, label: () => (has('11-4e') ? null : 'Ring-flip the chair'), onLantern: () => { saveGame({ t11flip: !getState().save.t11flip }); sfx('stomp'); world.shake = 0.2 } })]
    ia.push(world.addInteractable({ pos: [RING11.centre[0], 0, RING11.centre[1] + 3.6], radius: 1.8, label: () => (has('11-4e') ? null : 'Bring the base in: eliminate HCl (E2)'), onInteract: () => eliminate() }))
    // 11-1 the umbrella on the centres
    CENTRES11.forEach((c) => lanterns.push(world.addLantern({ needs: 'hasUmbrella', omni: true, pos: [c.pos[0], 0, c.pos[1]], radius: 3.2, label: () => (has(c.id) ? null : `Attack ${c.name} with ${c.nu}`), onLantern: () => backside(c) })))
    if (import.meta.env.DEV) {
      window.__valence = window.__valence || {}
      window.__valence.warp = (room) => { const r = ROOMS11.find((x) => x.id === room); if (r) world.player.teleport(r.checkpoint, Math.PI) }
      window.__valence.solve = (...ids) => ids.forEach((id) => markSolved(id))
    }
    return () => { [...f, ...t, bossT, decreeT, ...ia, ...lanterns].forEach((i) => world.remove(i)) }
  }, [world])

  // ---------------------------------------------------------------- actions
  const backside = (c) => {
    if (has(c.id)) return
    const p = world.player
    const behind = p.pos.z < c.pos[1] - 0.6 // the leaving group points +z; the back side is −z
    if (!behind) { sfx('block'); toast('The umbrella bounces off. The Br is facing you: SN2 comes in from the side opposite the leaving group.', 'warn', 4800); return }
    markSolved(c.id); sfx('shard'); world.shake = 0.3
    toast(`From behind! ${c.nu} pushes in, Br is pushed out the far side, and the centre turns inside out like an umbrella: ${c.product}. Inversion (§11.2).`, 'good', 6400)
  }
  const turnDial = (d) => {
    const cur = getState().save.t11dials || {}
    const i = d.opts.findIndex(([v]) => v === cur[d.id])
    const next = d.opts[(i + 1) % d.opts.length][0]
    saveGame({ t11dials: { ...cur, [d.id]: next } }); sfx('pickup')
  }
  const runSN2 = () => {
    if (has('11-2')) return
    const cur = getState().save.t11dials || {}
    const wrong = DIALS.find((d) => !cur[d.id] || !dialOk(d, cur[d.id]))
    if (wrong) { sfx('wrong'); toast(cur[wrong.id] ? `${wrong.name}: ${wrong.why[cur[wrong.id]] || 'not the fastest choice.'}` : `Set the ${wrong.name} dial first.`, 'warn', 5600); return }
    markSolved('11-2'); sfx('open'); toast('Methyl, a charged nucleophile, a good leaving group, a polar aprotic solvent: the fastest SN2 there is.', 'good', 5200)
  }
  const ionize = () => {
    if ((getState().save.t11pit || {}).ion) return
    sfx('dash'); toast('You wait… the Br leaves on its own: a flat tertiary carbocation, held up by the water around it (SN1, step 1).', 'info', 4800)
    setTimeout(() => saveGame({ t11pit: { ...(getState().save.t11pit || {}), ion: true } }), 1800)
  }
  const attackFace = (face) => {
    const p = { ...(getState().save.t11pit || {}), [face]: true }
    saveGame({ t11pit: p }); sfx('right')
    toast(face === 'top' ? 'Water adds from the top face: one enantiomer.' : 'And from the bottom: the other. The flat cation can be attacked from either side.', 'good', 3800)
    if (p.top && p.bottom && !has('11-3')) { markSolved('11-3'); sfx('open'); setTimeout(() => say([{ who: 'Pi', text: 'Both enantiomers: mostly racemic! The leaving group sometimes still shields one face for a moment, so there’s a bit of extra inversion (§11.5).' }]), 500) }
  }
  const eliminate = () => {
    if (has('11-4e')) return
    const axial = isAxial(1, 'top', !!getState().save.t11flip)
    if (!axial) { sfx('wrong'); toast('Cl is equatorial: no neighbouring H lines up anti to it. E2 needs H and Cl trans-diaxial. Flip the ring (G).', 'warn', 5200); return }
    markSolved('11-4e'); sfx('open')
    toast('Cl axial, the H on the next carbon axial and pointing the other way: anti-periplanar. One step, and HCl is gone (§11.9).', 'good', 5600)
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
    if (!has('t11-bosskey')) { toast('The arena gate. A crowd roars beyond it. It needs the Boss Key.', 'warn', 3200); sfx('wrong'); return }
    markSolved('t11-bossdoor'); sfx('open'); toast('The Boss Key turns. The gate grinds up into the light…', 'good', 3200)
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
        { who: 'Pi', text: 'Aim it at a chirality centre and press G. It only works from the side opposite the leaving group.' },
        { who: 'Pi', text: 'Then the centre flips inside out, like this umbrella in a gale. R becomes S!' },
      ])
    }
    if (id === 't11-bosskey') { saveGame({ t11bossKey: true }); await say([{ who: '', text: 'You got the Boss Key!' }]) }
    busy.current = false
  }

  const startBoss = async () => {
    if (has('boss11') || bossStarted.current || busy.current) return
    bossStarted.current = true
    busy.current = true
    playMusic('boss')
    world.respawn = [0, 0, -129]
    setBossOn(true)
    await new Promise((r) => setTimeout(r, 900))
    if (!getState().save.t11bossIntro) {
      saveGame({ t11bossIntro: true })
      world.camOverride = { pos: [3, 4, -130], look: [CHAMP.center[0], 2, CHAMP.center[2]] }
      await say([
        { who: 'Pi', text: 'The Five-Stanced Champion! See the banners? They change the conditions.' },
        { who: 'Pi', text: 'Read the conditions, strike the banner of the mechanism that will happen. Then it shows you its weak spot.' },
      ])
      world.camOverride = null
    } else await say([{ who: 'Pi', text: 'Conditions first. Then the banner. Then it.' }])
    busy.current = false
  }
  const bossDown = async () => {
    markSolved('boss11')
    playMusic('coliseum')
    await say([
      { who: 'Pi', text: 'Four stances, four calls, no luck needed!' },
      { who: 'Pi', text: 'The spark went north, up a mountain, to some kind of dome. The shard!' },
    ])
  }
  const takeShard = async () => {
    if ((getState().save.shards || 0) >= 11 || busy.current) return
    busy.current = true
    sfx('shard')
    setWaldenHere(true)
    if (world.player) world.player.teleport([0, 0, -158.4], Math.PI)
    await new Promise((r) => setTimeout(r, 300))
    world.camOverride = twoShot(world, [-2.2, 0, -158.4], 3.8, Math.PI / 2)
    await say([{ who: 'Sage Walden', text: 'Bravo! Bravo. One last question from the old master, and the shard is yours.' }])
    const ok = await openPanel('champCheck', {})
    if (!ok) { await say([{ who: 'Sage Walden', text: 'Take a breath. The arena isn’t going anywhere.' }]); world.camOverride = null; busy.current = false; return }
    saveGame({ shards: 11, checkpoint: { scene: 'wastes', at: 'gate' } })
    setState({ objective: 'Bond Shard 11 of 12 recovered' })
    await say([
      { who: '', text: 'The shard glows warm in Kai’s hands…' },
      { who: 'Princess Octavia', text: 'Kai… eleven. One more, and the Keep’s wards will fall.' },
      { who: 'Princess Octavia', text: 'He called it luck. You called every stance before it moved.' },
      { who: 'Sage Walden', text: 'Keep the umbrella. North, to Spectra’s observatory. Malradix hides behind a false face there.' },
      { who: 'Pi', text: 'Eleven down, ONE to go!' },
    ])
    world.camOverride = null
    await warpOut(world, { checkpoint: { scene: 'wastes', at: 'gate' }, card: 11 })
    busy.current = false
    onExit('wastes', { scene: 'wastes', at: 'gate' })
  }
  useEffect(() => {
    const id = world.addInteractable({ pos: [0, 0, -160], radius: 2.6, label: 'Take the Bond Shard', onInteract: () => takeShard() })
    const tick = () => world.setEnabled(id, !!getState().save.solved.boss11 && (getState().save.shards || 0) < 11)
    tick()
    const tt = setInterval(tick, 300)
    return () => { clearInterval(tt); world.remove(id) }
  }, [world])
  useFrame(() => { world.camBoost = world.bossCam ? { dist: 7.5, pitchSet: 0.45, lookY: 1.6 } : null })

  return (
    <group>
      <color attach="background" args={['#1a1014']} />
      <fog attach="fog" args={['#2a181a', 18, 70]} />
      <hemisphereLight args={['#ffc8b0', '#1a1014', 0.8]} />
      <ambientLight intensity={0.3} color="#ffd8c8" />
      <directionalLight position={[10, 40, -60]} intensity={0.8} color="#ffd0b0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={110} shadow-camera-bottom={-110} shadow-camera-far={200} />
      <mesh position={[0, -0.01, -59]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * W, 134]} /><meshStandardMaterial color="#3a3032" roughness={0.9} /></mesh>
      <mesh position={[0, -0.01, -146]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2 * ARENA.x, 40]} /><meshStandardMaterial color="#5a4a40" roughness={0.95} /></mesh>
      <Suspense fallback={null}><Walls world={world} /></Suspense>
      {[2, -12, -26, -46, -66, -78, -90, -102, -114].flatMap((z) => [-1, 1].map((sd) => <Torch key={z + '' + sd} pos={[sd * (W - 1), 0, z]} color="#ff8a3a" />))}

      {/* entrance */}
      <group position={[5, 0, -9]}>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 1.6, 0.8]} /><meshStandardMaterial color="#3a2a2a" roughness={0.9} /></mesh>
        <mesh position={[0, 1.2, 0.41]}><planeGeometry args={[0.9, 0.7]} /><meshBasicMaterial color="#a06bff" transparent opacity={0.6} /></mesh>
        <Tag position={[0, 2.1, 0]} df={10}>The herald’s notice</Tag>
      </group>
      <Chest world={world} pos={[-6, 0, -8]} rotY={Math.PI / 2} opened={!!solved['t11-map']} onOpen={() => openChest('t11-map')} />
      <Tag position={[0, 6.5, -13]} df={16}>The Under-Halls</Tag>

      {/* 11-1 the Walden gate */}
      <Ghouls world={world} spawns={[[-4, -20], [4, -22], [0, -26]]} active={!solved['t11-ghouls']} zone={[-14, -40]} onCleared={() => { if (!has('t11-ghouls')) { markSolved('t11-ghouls'); sfx('open'); toast('The ghouls have left. A big chest rises!', 'good', 3000) } }} />
      <Chest world={world} pos={[0, 0, -22]} big opened={!!solved['t11-umb']} show={!!solved['t11-ghouls']} onOpen={() => openChest('t11-umb')} label="Open the big chest" />
      {CENTRES11.map((c) => <CentreStatue key={c.id} c={c} inverted={!!solved[c.id]} />)}
      <Gate world={world} pos={[0, 0, -39.5]} size={[2 * W, 7, 0.8]} open={!!(solved['11-1a'] && solved['11-1b'])} color="#4a2a2a" glow="#ff8a6a" />

      {/* 11-2 four dials */}
      <Chest world={world} pos={[-7.6, 0, -42]} rotY={Math.PI / 2} opened={!!solved['t11-compass']} onOpen={() => openChest('t11-compass')} />
      {DIALS.map((d) => {
        const [x, z] = DIALS_POS[d.id], v = dials[d.id], label = v ? d.opts.find(([k]) => k === v)[1] : '—'
        return (
          <group key={d.id} position={[x, 0, z]}>
            <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.6, 0.7, 1.2, 12]} /><meshStandardMaterial color="#4a3e3e" /></mesh>
            <mesh position={[0, 1.25, 0.5]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.08, 20]} /><meshStandardMaterial color="#c8a050" metalness={0.8} roughness={0.3} /></mesh>
            <Tag position={[0, 2.4, 0]} df={9} far={12}>{d.name}</Tag>
            <Tag position={[0, 1.9, 0]} df={8} far={12} className={solved['11-2'] ? 'ok-tag' : ''}>{label}</Tag>
          </group>
        )
      })}
      <group position={[DIALS_POS.run[0], 0, DIALS_POS.run[1]]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[1.0, 1.0, 0.6]} /><meshStandardMaterial color="#3a3032" /></mesh>
        <mesh position={[0.2, 1.3, 0]} rotation={[0, 0, solved['11-2'] ? -0.6 : 0.6]}><cylinderGeometry args={[0.05, 0.05, 1.0, 8]} /><meshStandardMaterial color="#c8c8d0" metalness={0.8} /></mesh>
      </group>
      <Gate world={world} pos={[0, 0, -59.5]} size={[2 * W, 7, 0.8]} open={!!solved['11-2']} color="#4a2a2a" glow="#4a8aff" />

      {/* 11-3 the cation pit */}
      <group position={[PIT11.centre[0], 0, PIT11.centre[1]]}>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[1.0, 1.2, 1.0, 16]} /><meshStandardMaterial color="#3a5a7a" metalness={0.3} roughness={0.2} /></mesh>
        <group position={[0, 2.0, 0]}>
          <mesh><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color={pit.ion ? '#e0b0ff' : '#3a3640'} emissive={pit.ion ? '#c070ff' : '#000'} emissiveIntensity={1.2} /></mesh>
          {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.9, pit.ion ? 0 : -0.3, Math.sin(a) * 0.9]}><sphereGeometry args={[0.24, 10, 8]} /><meshStandardMaterial color="#ff6fb3" /></mesh> })}
          {!pit.ion && <mesh position={[0, 0.95, 0]}><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#b0503a" /></mesh>}
        </group>
        <Tag position={[0, 3.6, 0]} df={10} far={16} className={solved['11-3'] ? 'ok-tag' : ''}>{solved['11-3'] ? 'both enantiomers: mostly racemic' : pit.ion ? 'a flat tertiary carbocation, in water' : 'a tertiary bromide, in water'}</Tag>
      </group>
      {['top', 'bottom'].map((face) => { const [x, z] = PIT11[face]; return (
        <group key={face} position={[x, 0, z]}>
          <mesh position={[0, 1.6, 0]}><boxGeometry args={[2.4, 3.2, 0.3]} /><meshStandardMaterial color={pit[face] ? '#9affb8' : pit.ion ? '#c8a050' : '#3a3032'} /></mesh>
          <Tag position={[0, 3.6, 0]} df={9} far={12}>{`the ${face} face`}</Tag>
        </group>
      ) })}
      <Gate world={world} pos={[0, 0, -81.5]} size={[2 * W, 7, 0.8]} open={!!solved['11-3']} color="#4a2a2a" glow="#f0f0f0" />

      {/* 11-4 the elimination ring */}
      <ChairRing position={[RING11.centre[0], 1.2, RING11.centre[1]]} R={2.6} amp={0.5} atom={0.3} bond={0.09} len={1.0} flip={flip} subs={[{ c: 1, face: 'top', label: 'Cl', color: '#6fe39a', size: 0.34 }]} />
      <Tag position={[RING11.centre[0], 3.8, RING11.centre[1]]} df={11} far={16} className={solved['11-4e'] ? 'ok-tag' : ''}>{solved['11-4e'] ? 'H and Cl trans-diaxial: eliminated' : 'chlorocyclohexane: get Cl axial'}</Tag>
      <Chest world={world} pos={[0, 0, -104]} opened={!!solved['t11-key']} show={!!(solved['11-4e'] && solved['11-4z'])} onOpen={() => openChest('t11-key')} label="Open the small chest" />
      <Gate world={world} pos={[0, 0, -106]} size={[2 * W, 7, 0.8]} open={!!solved['t11-door']} color="#5a4020" glow="#ffcf6a" />
      <Tag position={[0, 7.8, -105.6]} df={13}>{solved['t11-door'] ? 'unlocked' : 'locked · small key'}</Tag>

      {/* 11-5 the trial */}
      <Chest world={world} pos={[0, 0, -123.5]} big opened={!!solved['t11-bosskey']} show={!!solved['11-5']} onOpen={() => openChest('t11-bosskey')} label="Open the big chest" />
      <Gate world={world} pos={[0, 0, -126]} size={[2 * W, 7, 0.8]} open={!!solved['t11-bossdoor']} color="#3a2a50" glow="#c9a3ff" />

      {Object.entries(STATIONS11).map(([id, st]) => {
        const once = id !== '11-1info'
        return <Station key={id} world={world} pos={st.pos} label={once && solved[id] ? null : st.label} enabled={!(once && solved[id])} solved={!!solved[id]} onUse={async () => { const ok = await openPanel(st.panel, st.props); if (!ok) return; markSolved(id); if (id === '11-5') { sfx('open'); toast('Five for five. A big chest rises by the arena gate.', 'good', 3000) } }} />
      })}

      {/* boss */}
      {!solved.boss11 && <Champion world={world} center={CHAMP.center} R={CHAMP.R} active={bossOn && !solved.boss11} onDefeated={bossDown} />}
      {waldenHere && <Walden position={[-2.2, 0, -158.4]} rotation={[0, Math.PI / 2, 0]} />}
      <Shard show={!!solved.boss11 && (save.shards || 0) < 11} pos={[0, 0, -160]} />
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
    <GameScene start={start} startFacing={Math.PI} background="#1a1014" camDist={6.2}>
      {(world) => <ColLevel world={world} onExit={onExit} />}
    </GameScene>
  )
}
