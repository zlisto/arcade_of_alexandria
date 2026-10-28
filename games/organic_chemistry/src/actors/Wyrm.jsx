import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Part, preloadModels } from '../engine/models'
import { Tag } from '../engine/kit'
import { setState, getState, toast } from '../engine/store'
import { sfx } from '../audio/sfx'
import { Ridge, ridgeNodes, energyAt, SCALE } from './EnergyRidge'
import { WYRM_ROUTES, highestTS, fasterRoute } from '../chem/rules6'

// The Transition Wyrm (boss of the Pass Caves; book §6.9–6.10). It lives only on summits: it is the top of the
// pass, and can't be struck, only crossed. Each phase shows two routes from the same reactants to their products,
// as walkable energy diagrams. The Wyrm coils on the taller summit and strikes anyone who climbs that route: a
// high pass is a slow one. Cross the route whose highest pass is lower — even if the other one ends further
// downhill (ΔG° says how far, not how fast). Three crossings and it unwinds.
// Built in Blender (tools/peaks_folk_blender.py → public/models/peaksfolk.glb).
preloadModels('peaksfolk')
const NAME = 'The Transition Wyrm · ‡'
const Z0 = -146, Z1 = -170, XS = { a: -5, b: 5 }

export default function Wyrm({ world, center, active, onDefeated }) {
  const [phase, setPhase] = useState(0)
  const st = useRef({ mode: 'idle', t: 0, strikeT: 0, waveT: 4, wave: -1, crossing: false })
  const coil = useRef(), head = useRef(), wave = useRef()
  const R = WYRM_ROUTES[Math.min(phase, 2)]
  const slow = fasterRoute(R) === 'a' ? 'b' : 'a'
  // where the slow route's summit is
  const summit = useMemo(() => {
    const route = R[slow], nodes = ridgeNodes(route)
    const top = nodes.reduce((m, n) => (n.kind === 'ts' && n.y > m.y ? n : m), { y: -1e9 })
    const len = Math.abs(Z1 - Z0) - 4
    return { x: XS[slow], z: Z0 - 2 - top.u * len, y: top.y * SCALE, e: top.y }
  }, [phase])

  useEffect(() => {
    if (!active) return
    setState({ bossHp: { name: NAME, hp: 3 - phase, max: 3 } })
    world.bossCam = true
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), wyrm: st.current, wyrmPhase: () => phase }
    return () => { world.bossCam = false; setState({ bossHp: null }) }
  }, [active, phase])

  const crossed = (which) => {
    if (!active || st.current.done) return
    if (which === slow) {
      // rolled past the coil: the slow route still counts as slow. Back to the start.
      sfx('wrong'); world.player && world.player.teleport([0, 0, -143], Math.PI)
      toast(`Over the ${highestTS(R[slow])} pass, but that was the slow way. The Wyrm only yields to the lower pass.`, 'warn', 4800)
      return
    }
    st.current.done = true
    sfx('shard'); world.shake = 0.4
    const next = phase + 1
    if (next >= 3) { setState({ bossHp: { name: NAME, hp: 0, max: 3 } }); st.current.mode = 'gone'; st.current.t = 0; setTimeout(() => onDefeated && onDefeated(), 1800); return }
    toast(next === 1 ? 'Over! The Wyrm uncoils and finds a new summit. Read the next pair of routes.' : 'Once more. The last pair.', 'good', 3800)
    setTimeout(() => {
      if (world.player) world.player.teleport([0, 0, -143], Math.PI)
      st.current.done = false
      setPhase(next)
    }, 1200)
  }

  useFrame((state, rawDt) => {
    const s = st.current
    if (!active) return
    const dt = getState().dialogue || getState().panel ? 0 : Math.min(rawDt, 1 / 30)
    s.t += dt
    const p = world.player
    const T = state.clock.elapsedTime
    // coil on the slow summit, the head rearing above it
    if (coil.current) {
      coil.current.position.set(summit.x - center[0], summit.y - 0.2 + (s.mode === 'gone' ? -s.t * 4 : 0), summit.z - center[2])
      coil.current.rotation.y = T * 0.15
      coil.current.scale.setScalar(s.mode === 'gone' ? Math.max(0.01, 0.42 * (1 - s.t / 1.5)) : 0.42)
    }
    // strike anyone climbing the slow route near its summit: the pass slams shut
    if (p && s.mode !== 'gone') {
      const onSlow = Math.abs(p.pos.x - summit.x) < 2 && p.pos.z < Z0 && p.pos.z > Z1
      const near = Math.abs(p.pos.z - summit.z) < 3.4
      if (s.strikeT > 0) s.strikeT -= dt
      if (onSlow && near && s.strikeT <= 0 && !p.rolling) {
        s.strikeT = 1.6; sfx('stomp'); world.shake = 0.5
        p.hurt(2, [summit.x, summit.y, summit.z - 3])
        if (!s.toldSlow) { s.toldSlow = true; toast(`The Wyrm slams the pass shut: ${summit.e} kJ/mol is the higher barrier, the slow way over. Try the other route.`, 'warn', 5200) }
      }
      if (head.current) {
        const strike = Math.max(0, s.strikeT - 1.0) / 0.6
        head.current.position.set(summit.x - center[0], summit.y + 3.8 - strike * 2.4, summit.z - center[2] + 1 + strike * 2.2)
        head.current.rotation.x = 0.4 + strike * 0.9
        head.current.lookAt(p.pos.x, p.pos.y + 1, p.pos.z)
      }
      // a sweep of cold breath down both ridges now and then: roll through it
      s.waveT -= dt
      if (s.waveT <= 0 && s.wave < 0) { s.wave = 0; s.waveT = 5.5 - phase * 1.2; sfx('dash') }
      if (s.wave >= 0) {
        s.wave += dt * 10
        const zw = Z0 - s.wave
        if (wave.current) { wave.current.visible = true; wave.current.position.set(0, 1.5, zw - center[2]) }
        if (!p.rolling && Math.abs(p.pos.z - zw) < 0.6 && p.pos.z < Z0 && !s.waveHit) { s.waveHit = true; p.hurt(1, [p.pos.x, 0, zw + 2]) }
        if (s.wave > Math.abs(Z1 - Z0)) { s.wave = -1; s.waveHit = false; if (wave.current) wave.current.visible = false }
      }
    }
  })

  return (
    <>
    {active && (['a', 'b'].map((k) => (
      <Ridge key={k + phase} world={world} route={R[k]} x={XS[k]} z0={Z0} z1={Z1} meter={() => 120} label={`Route ${k.toUpperCase()} · highest pass ${highestTS(R[k])} kJ/mol`} color={k === 'a' ? '#c8e4f4' : '#d8ecf8'} onEnd={() => crossed(k)} />
    )))}
    <group position={center}>
      <group ref={coil}><Part model="peaksfolk" name="wyr_body" castShadow={false} /><pointLight position={[0, 6, 0]} color="#bfe8ff" intensity={4} distance={14} /></group>
      <group ref={head}>
        <group scale={0.9}><Part model="peaksfolk" name="wyr_head" /><group position={[-0.2, -0.2, -0.6]}><Part model="peaksfolk" name="wyr_wingL" /></group><group position={[0.2, -0.2, -0.6]}><Part model="peaksfolk" name="wyr_wingR" /></group></group>
      </group>
      <mesh ref={wave} visible={false}><boxGeometry args={[22, 3, 0.4]} /><meshBasicMaterial color="#dff4ff" transparent opacity={0.45} toneMapped={false} /></mesh>
      {active && <Tag position={[0, 7.5, (Z0 + Z1) / 2 - center[2]]} df={16}>Two routes, same reactants. Which pass is lower?</Tag>}
    </group>
    </>
  )
}
