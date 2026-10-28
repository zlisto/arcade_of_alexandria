import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, getState, setState, enemiesPaused } from '../engine/store'
import { PHANTOM_ROUNDS, skeleton, DEG } from '../chem/rules7'
import { SKEL_POS } from '../data/dungeon7'

// World 7's people and its boss, built in Blender (tools/markov_blender.py → public/models/markov.glb):
// • Farmer Markov (assets/characters/farmer-markov.png).
// • The Carbocation Phantom (§7.9, 7.11): it lives on a carbon skeleton drawn on the roof. Each round it appears
//   as a cation on one carbon. If a neighbour would make a more substituted cation, it shifts there (a hydride or
//   a methyl moves the other way, with its electron pair). Stand on the carbon where it will end up: caught as it
//   arrives, it holds still; strike. Stand anywhere else and it lashes out. A tertiary cation has nowhere better
//   to go: stay put.
preloadModels('markov')

export function Markov(props) {
  const M = useMemo(() => ({
    denim: rimMat({ color: '#3a5272', roughness: 0.85 }, '#ffd8a0', 0.25), denimDark: rimMat({ color: '#2a3a54', roughness: 0.9 }, '#ffd8a0', 0.2),
    plaid: rimMat({ color: '#b85a40', roughness: 0.85 }, '#ffd8a0', 0.3), plaidLine: rimMat({ color: '#5a2418', roughness: 0.85 }, '#ffd8a0', 0.2),
    boots: rimMat({ color: '#4a3020', roughness: 0.8 }, '#ffd8a0', 0.15), leather: rimMat({ color: '#6a3e22', roughness: 0.7 }, '#ffd8a0', 0.2),
    skin: rimMat({ color: '#e0a080', roughness: 0.6 }, '#ffd8b0', 0.25, 3), hair: rimMat({ color: '#4a2a18', roughness: 0.8 }, '#ffd8a0', 0.2),
    straw: rimMat({ color: '#d0ac68', roughness: 0.85 }, '#fff0c0', 0.35), strawDark: rimMat({ color: '#9a7a3a', roughness: 0.9 }, '#fff0c0', 0.2),
    wheat: rimMat({ color: '#e8c050', roughness: 0.6 }, '#fff0c0', 0.35),
  }), [])
  const eyes = useRef()
  useFrame(({ clock }) => { if (eyes.current) eyes.current.scale.y = (clock.elapsedTime % 3.9) < 0.12 ? 0.12 : 1 })
  return (
    <group {...props}>
      <Part model="markov" name="mkv_body" mats={M} />
      <group ref={eyes} position={[0, 1.62, 0.05]}><Part model="markov" name="mkv_eyes" castShadow={false} /></group>
      <pointLight position={[0, 2.3, 1]} color="#ffe0b0" intensity={1.2} distance={5} />
    </group>
  )
}

const NAME = 'The Carbocation Phantom · R⁺'
// before a round's H⁺ is slung the ghost waits here, off every skeleton, so its spot gives nothing away
export const GHOST_WAIT = [0, -9.5]
const padsOf = (sk, center) => SKEL_POS[sk].pads.map(([x, z]) => [center[0] + x, center[2] + z])

/** the skeleton drawn on the roof for one round: carbon pads, bonds, names */
export function SkeletonFloor({ sk, center, pads, lit = -1, tags = true }) {
  const S = skeleton(sk)
  const P = pads || padsOf(sk, center)
  return (
    <group>
      {S.bonds.map(([a, b], i) => {
        const [x1, z1] = P[a], [x2, z2] = P[b], L = Math.hypot(x2 - x1, z2 - z1)
        return <mesh key={'b' + i} position={[(x1 + x2) / 2, 0.06, (z1 + z2) / 2]} rotation={[0, -Math.atan2(z2 - z1, x2 - x1), Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, L - 1.6, 8]} /><meshStandardMaterial color="#e8d8b0" emissive="#8a6a3a" emissiveIntensity={0.5} /></mesh>
      })}
      {P.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.95, 28]} /><meshStandardMaterial color={i === lit ? '#d8a0ff' : '#5a4a3a'} emissive={i === lit ? '#a050ff' : '#2a1e14'} emissiveIntensity={i === lit ? 1.2 : 0.4} /></mesh>
          <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.85, 1.0, 28]} /><meshBasicMaterial color="#ffe0a0" /></mesh>
          {tags && <Tag position={[0, 0.25, 1.05]} df={8} far={22}>{S.carbons[i].n}</Tag>}
        </group>
      ))}
    </group>
  )
}

export default function Phantom({ world, center, active, armed, onDefeated }) {
  const M = useMemo(() => ({
    phantom: new THREE.MeshStandardMaterial({ color: '#8a5ac8', emissive: new THREE.Color('#5a2a9a'), emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.4 }),
    phantomDark: new THREE.MeshBasicMaterial({ color: '#1a0a30', transparent: true }),
    phantomGlow: new THREE.MeshStandardMaterial({ color: '#e0b0ff', emissive: new THREE.Color('#c070ff'), emissiveIntensity: 2.4, toneMapped: false }),
    plus: new THREE.MeshStandardMaterial({ color: '#ffe8ff', emissive: new THREE.Color('#ffc0ff'), emissiveIntensity: 3, toneMapped: false }),
  }), [])
  const [round, setRound] = useState(0)
  const st = useRef({ mode: 'idle', t: 0, at: 0, from: 0, pos: new THREE.Vector3(), hits: 0, caught: false })
  const g = useRef(), core = useRef(), mover = useRef(), lash = useRef(), spark = useRef(), halo = useRef()
  const [tag, setTag] = useState(null)
  const [moving, setMoving] = useState(false) // the H:⁻ / CH₃:⁻ tag shows only during the shift
  const [awaiting, setAwaiting] = useState(false) // each round opens with Kai slinging H⁺ onto the alkene
  const R = PHANTOM_ROUNDS[Math.min(round, 2)]
  const S = skeleton(R.sk)
  const pads = useMemo(() => padsOf(R.sk, center), [R.sk, center])
  const end = S.end
  const hAt = R.sk === 't' ? 3 : 0 // the carbon that takes the H⁺ (Markovnikov): C1 of the 1-alkenes, C3 of 2-methyl-2-butene
  const hOther = R.sk === 't' ? 2 : 1 // the other alkene carbon: slinging here is the anti-Markovnikov mistake

  const startRound = (long = false) => {
    const s = st.current
    s.mode = 'appear'; s.t = 0; s.at = R.start; s.from = R.start; s.caught = false; s.long = long
    const [x, z] = pads[R.start]
    s.pos.set(x, 0, z)
    setTag(`+ on ${S.carbons[R.start].n}`)
  }
  useEffect(() => {
    if (!active) return
    setState({ bossHp: { name: NAME, hp: 3 - round, max: 3 }, objective: `Round ${round + 1} of 3 · ${S.name}: ${R.label}` })
    world.bossCam = true
    { const s = st.current; s.mode = 'await'; s.t = 0; s.at = R.start; s.ko = world.knockouts || 0; s.pos.set(center[0] + GHOST_WAIT[0], 0, center[2] + GHOST_WAIT[1]); setTag(null); setMoving(false); setAwaiting(true) }
    // two lanterns, one on each alkene carbon, labelled by carbon number only: choosing where H⁺ goes is the Markovnikov test
    const sls = [hAt, hOther].map((i) => world.addLantern({
      needs: 'hasSling', omni: true, aim: true, priority: 1, pos: [pads[i][0], 0, pads[i][1]], radius: 4.5,
      label: () => (armed && st.current.mode === 'await' ? `Sling a proton onto ${S.carbons[i].n}` : null),
      onLantern: () => {
        const s = st.current
        if (s.mode !== 'await' || performance.now() < (s.slingCd || 0)) return
        s.slingCd = performance.now() + 900
        sfx('hookFire'); if (world.slingFx) world.slingFx([pads[i][0], 1.2, pads[i][1]])
        if (i === hOther) {
          sfx('wrong'); if (world.player) world.player.hurt(1, [pads[i][0], 0, pads[i][1]], true)
          toast(`H⁺ on ${S.carbons[i].n} leaves a ${DEG[S.carbons[hAt].deg]} cation on ${S.carbons[hAt].n}. The other way gives a ${DEG[S.carbons[R.start].deg]} one: steadier, so that one forms.`, 'warn', 6200)
          return
        }
        setAwaiting(false); startRound(true)
      },
    }))
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), phantom: st.current, phantomRound: () => round }
    const id = world.addTarget({
      pos: () => [st.current.pos.x, 1.8, st.current.pos.z], radius: 1.2, tall: 3.0,
      alive: () => ['appear', 'shift', 'caught', 'wait'].includes(st.current.mode),
      onHit: () => {
        const s = st.current
        if (s.mode === 'caught') {
          s.mode = 'hit'; s.t = 0; sfx('hit'); world.shake = 0.4
          const next = round + 1
          setState({ bossHp: { name: NAME, hp: 3 - next, max: 3 } })
          if (next >= 3) { s.mode = 'gone'; s.t = 0; setTag(null); setTimeout(() => onDefeated && onDefeated(), 350); return true } // Pi calls the spark while it is still in the air
          toast(next === 1 ? `Caught on ${S.carbons[end].n}! A hydride slid over and the charge moved. Again!` : `Caught on ${S.carbons[end].n}! This time a methyl moved. Once more.`, 'good', 3600)
          setTimeout(() => setRound(next), 1400)
          return true
        }
        sfx('block')
        if (s.mode === 'appear' && end !== R.start && !s.toldEarly) { s.toldEarly = true; toast('Not yet: a cation next to a better carbon doesn’t stay. Where will it go?', 'warn', 4200) }
        return false
      },
    })
    return () => { world.remove(id); sls.forEach((l) => world.remove(l)); world.bossCam = false; setState({ bossHp: null }) }
  }, [active, round, armed])

  useFrame((state, rawDt) => {
    const s = st.current
    if (!active || !g.current) return
    const dt = enemiesPaused() || !armed ? 0 : Math.min(rawDt, 1 / 30)
    if ((world.knockouts || 0) !== s.ko) { s.ko = world.knockouts || 0; if (s.mode !== 'await' && s.mode !== 'hit' && s.mode !== 'wait' && s.mode !== 'gone') { s.lashed = false; startRound(true) } } // a fair restart after a knockout
    s.t += dt
    const p = world.player
    const T = state.clock.elapsedTime
    const onPad = (i) => p && Math.hypot(p.pos.x - pads[i][0], p.pos.z - pads[i][1]) < 1.4
    if (s.mode === 'appear' && s.t > (s.long ? 4 : 2.6)) { // the first appear of a round, or after a knockout, gets 4 s
      s.ready = onPad(end) // judged now, before it moves: Kai must already be waiting where it will settle
      if (end !== s.at) { s.mode = 'shift'; s.t = 0; s.from = s.at; sfx('dash'); setMoving(true); setTag(S.kind === 'hydride' ? 'a hydride (H:⁻) moves over…' : 'a methyl (CH₃:⁻) moves over…') }
      else { s.mode = 'arrive'; s.t = 0 }
    }
    if (s.mode === 'shift') {
      const k = Math.min(1, s.t / 0.8)
      const [x0, z0] = pads[s.from], [x1, z1] = pads[end]
      s.pos.set(x0 + (x1 - x0) * k, 0, z0 + (z1 - z0) * k)
      if (mover.current) { mover.current.visible = true; mover.current.position.set(x1 + (x0 - x1) * k - center[0], 1.2, z1 + (z0 - z1) * k - center[2]) }
      if (k >= 1) { s.at = end; s.mode = 'arrive'; s.t = 0; setMoving(false); if (mover.current) mover.current.visible = false }
    }
    if (s.mode === 'arrive') {
      if (s.ready && onPad(s.at)) { s.mode = 'caught'; s.t = 0; sfx('pair'); setTag(`caught on ${S.carbons[s.at].n}: strike!`) }
      else { s.mode = 'lash'; s.t = 0; setTag(`+ on ${S.carbons[s.at].n}`) }
    }
    if (s.mode === 'caught' && s.t > 3.0) { s.mode = 'lash'; s.t = 0 }
    if (s.mode === 'lash') {
      if (lash.current) { lash.current.visible = s.t < 0.6; lash.current.position.set(s.pos.x - center[0], 0.1, s.pos.z - center[2]); lash.current.scale.setScalar(1 + s.t * 10) }
      if (s.t > 0.15 && !s.lashed) {
        s.lashed = true; sfx('stomp'); world.shake = 0.3
        if (p && Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 7.5 && !p.rolling) p.hurt(1, [s.pos.x, 0, s.pos.z])
        if (!s.toldMiss) { s.toldMiss = true; toast('Missed. Find the carbon where the + is steadiest, and be waiting there before it moves.', 'warn', 4600) }
      }
      if (s.t > 1.6) { s.lashed = false; startRound() }
    }
    if (s.mode === 'hit' && s.t > 1.2) { s.mode = 'wait' }
    // drawing
    const bob = Math.sin(T * 2) * 0.15
    // before each round's H⁺ is slung it hangs faint off the skeleton (GHOST_WAIT), so Pi's intro shows it
    const ghost = s.mode === 'await'
    M.phantom.opacity = ghost ? 0.3 : 0.85
    M.phantomDark.opacity = ghost ? 0.3 : 1
    const fade = ghost ? 1 : s.mode === 'appear' ? Math.min(1, s.t / 0.6) : s.mode === 'gone' ? Math.max(0, 1 - s.t) : 1
    g.current.position.set(s.pos.x - center[0], 0.3 + bob + (s.mode === 'caught' ? -0.3 : 0), s.pos.z - center[2])
    g.current.scale.setScalar(0.9 * Math.max(0.01, fade))
    if (p) g.current.rotation.y = Math.atan2(p.pos.x - s.pos.x, p.pos.z - s.pos.z)
    g.current.rotation.z = s.mode === 'caught' ? Math.sin(T * 30) * 0.05 : 0
    if (core.current) core.current.rotation.y = T * 2
    // Malradix's violet spark rides in the Phantom's hood; when it falls the spark tears free and flies south (+z)
    if (spark.current) {
      const pulse = 1 + Math.sin(T * 5) * 0.18 // a slow throb so it reads as alive, even ghosted
      if (s.mode !== 'gone') { s.sparkT = -1; spark.current.visible = true; const ry = g.current.rotation.y; spark.current.position.set(g.current.position.x + Math.sin(ry) * 0.55 + Math.sin(T * 6) * 0.08, g.current.position.y + 2.6 * 0.9 * Math.max(0.01, fade), g.current.position.z + Math.cos(ry) * 0.55); /* in the hood's opening, not buried in the cloth */ spark.current.scale.setScalar((ghost ? 0.75 : 1) * pulse); if (halo.current) halo.current.opacity = ghost ? 0.08 : 0.18 }
      else { if (s.sparkT < 0) s.sparkT = 0; s.sparkT += rawDt; spark.current.scale.setScalar(1.3 * pulse); spark.current.position.z += rawDt * 6; spark.current.position.y += rawDt * 3.2; spark.current.visible = s.sparkT < 2.6 }
    }
  })

  return (
    <group position={center}>
      {active && <group position={[-center[0], 0, -center[2]]}><SkeletonFloor sk={R.sk} center={center} pads={pads} lit={awaiting ? -1 : st.current.at} /></group>}
      <group ref={g} visible={active}>
        <Part model="markov" name="phn_body" mats={M} />
        <group ref={core} position={[0, 1.9, 0.62]}><Part model="markov" name="phn_core" mats={M} castShadow={false} /></group>
        <pointLight position={[0, 2, 1]} color="#c070ff" intensity={5} distance={9} />
        {tag && <Tag position={[0, 3.9, 0]} df={12}>{tag}</Tag>}
      </group>
      <group visible={active}><group ref={spark} visible={false}><mesh><sphereGeometry args={[0.28, 14, 10]} /><meshBasicMaterial color="#f4e0ff" toneMapped={false} /></mesh><mesh><sphereGeometry args={[0.6, 14, 10]} /><meshBasicMaterial color="#b050ff" transparent opacity={0.5} depthWrite={false} toneMapped={false} /></mesh><mesh><sphereGeometry args={[1.05, 14, 10]} /><meshBasicMaterial ref={halo} color="#a040ff" transparent opacity={0.18} depthWrite={false} toneMapped={false} /></mesh><pointLight color="#c070ff" intensity={9} distance={9} /></group></group>
      <group ref={mover} visible={false}>
        <mesh><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color="#ffffff" emissive="#99aaff" emissiveIntensity={1.5} /></mesh>
        {moving && <Tag position={[0, 0.7, 0]} df={9}>{S.kind === 'methyl' ? 'CH₃:⁻' : 'H:⁻'}</Tag>}
      </group>
      <mesh ref={lash} visible={false} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.6, 0.75, 32]} /><meshBasicMaterial color="#c070ff" transparent opacity={0.7} side={THREE.DoubleSide} /></mesh>
      {active && <Tag position={[awaiting ? -3 : 0, 3.0, -13]} df={12} far={30}>{S.name}</Tag>}
      {active && armed && awaiting && [hAt, hOther].map((i) => <Tag key={i} position={[pads[i][0] - center[0], 2.2, pads[i][1] - center[2]]} df={11}>{`G: H⁺ onto ${S.carbons[i].n}?`}</Tag>)}
    </group>
  )
}
