import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import KaiModel from './KaiModel'
import { getEnv } from '../engine/materials'
import { Tag } from '../engine/kit'
import { sfx } from '../audio/sfx'
import { toast, inCinematic, getState } from '../engine/store'

// Enantiomer Shades (World 5, book §5.1, 5.12): Kai's own mirror image, chrome-silver. Each shade stands
// across a mirror line (x = mirrorX) and moves as Kai's reflection: step left and it steps right. It is
// his perfect mirror image, so it meets every blow with the same blow and parries it. The Mirror Shield (G)
// breaks the symmetry for a few seconds — no longer an exact mirror image — and then it can be hit.
const told = { parry: false, broke: false }
const BROKEN = 4.2

function Shade({ s, register }) {
  const gl = useThree((st) => st.gl)
  const model = useRef(), root = useRef()
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dfe6f2', metalness: 1, roughness: 0.15, envMap: getEnv(gl), envMapIntensity: 1.4 }), [gl])
  const dim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a96b0', metalness: 0.6, roughness: 0.45, envMap: getEnv(gl), envMapIntensity: 0.6 }), [gl])
  const done = useRef(false)
  useFrame(() => {
    if (!root.current) return
    // once the model has loaded, make every mesh chrome (twice: whole, or dull while broken)
    root.current.traverse((o) => { if (o.isMesh && o.material !== chrome && o.material !== dim && !o.userData.keep) { o.userData.orig = o.material; o.material = chrome; done.current = true } })
    root.current.traverse((o) => { if (o.isMesh && o.userData.orig) o.material = s.broken > 0 ? dim : chrome })
  })
  useEffect(() => { register(s.i, { root, model }) }, [])
  return (
    <group ref={root}>
      {/* the mirror image: Kai's model reflected through its own x */}
      <group scale={[-1, 1, 1]}><KaiModel ref={model} noTag /></group>
      <pointLight position={[0, 1.6, 0.8]} color="#bfe8ff" intensity={1.2} distance={4} />
    </group>
  )
}

/** spawns: [[x, z]] (their start; then they mirror Kai across x = mirrorX); zone: [zMin, zMax] they act in */
export default function EnantiomerShades({ world, spawns, mirrorX = 0, zone, active = true, onCleared }) {
  const shades = useRef(spawns.map(([x, z], i) => ({ i, pos: new THREE.Vector3(x, 0, z), facing: 0, broken: 0, hp: 2, state: 'idle', t: 0, swing: 0, parryT: 0, hitT: 0 })))
  const views = useRef({})
  const [tags, setTags] = useState(spawns.map(() => false))
  const cleared = useRef(false)
  useEffect(() => {
    if (!active) return
    const ids = []
    shades.current.forEach((m) => {
      ids.push(world.addTarget({
        pos: () => [m.pos.x, 1.1, m.pos.z], radius: 0.6, tall: 1.8,
        alive: () => m.state !== 'gone' && m.state !== 'dead',
        onHit: () => {
          if (m.state === 'dead' || m.state === 'gone') return false
          if (m.broken <= 0) {
            m.parryT = 0.35; sfx('block')
            if (!told.parry) { told.parry = true; toast('Clang! Your mirror image meets every blow with the same blow. Break the symmetry: the Mirror Shield (G).', 'warn', 5200, true) }
            return false
          }
          m.hp -= 1; m.hitT = 0.3; sfx('hit')
          if (m.hp <= 0) { m.state = 'dead'; m.t = 0; sfx('shatter') }
          return true
        },
      }))
      ids.push(world.addLantern({
        needs: 'hasShield', pos: () => [m.pos.x, 0, m.pos.z], radius: 7, priority: 0.5,
        label: () => (m.state === 'dead' || m.state === 'gone' || m.broken > 0 ? null : 'Show it the Mirror Shield'),
        onLantern: () => {
          if (m.broken > 0 || m.state === 'dead') return
          m.broken = BROKEN; sfx('shard')
          if (!told.broke) { told.broke = true; toast('Its reflection of you breaks: for a moment it is not your mirror image. Strike!', 'good', 4200, true) }
        },
      }))
    })
    return () => ids.forEach((i) => world.remove(i))
  }, [active])

  useFrame((_, rawDt) => {
    if (!active) return
    const dt = world.hitStop > 0 || inCinematic() || getState().dialogue ? 0 : Math.min(rawDt, 1 / 30)
    const p = world.player
    let alive = 0
    const want = []
    for (const m of shades.current) {
      const v = views.current[m.i]
      if (!v || !v.root.current) continue
      const g = v.root.current
      m.t += dt
      if (m.state === 'gone') { g.visible = false; want.push(false); continue }
      if (m.state === 'dead') {
        g.scale.setScalar(Math.max(0.01, 1 - m.t * 1.5)); g.position.y = m.t * 0.6
        if (m.t > 0.7) m.state = 'gone'
        want.push(false); continue
      }
      alive++
      const inZone = p && (!zone || (p.pos.z > zone[0] && p.pos.z < zone[1]))
      if (m.broken > 0) {
        m.broken -= dt
        // broken: it staggers in place, no longer a mirror image
        g.rotation.z = Math.sin(m.t * 14) * 0.08
      } else if (inZone) {
        // the reflection of Kai across the line x = mirrorX: same z, opposite side, mirrored facing
        const tx = 2 * mirrorX - p.pos.x, tz = p.pos.z + (m.i % 2 ? 1.2 : -1.2)
        m.pos.x += (tx - m.pos.x) * Math.min(1, dt * 6); m.pos.z += (tz - m.pos.z) * Math.min(1, dt * 6)
        const [cx, cz] = world.collide(m.pos.x, 0.1, m.pos.z, 0.4, 1.8)
        m.pos.x = cx; m.pos.z = cz
        m.facing = -p.facing
        g.rotation.z = 0
        // it copies Kai's swing; if he is in reach, the mirrored blow lands on him
        const swinging = p.mode === 'attack' || p.mode === 'spin'
        if (swinging && !m.swinging && Math.hypot(p.pos.x - m.pos.x, p.pos.z - m.pos.z) < 1.9) p.hurt(1, [m.pos.x, 0, m.pos.z])
        m.swinging = swinging
      }
      g.position.set(m.pos.x + (m.hitT > 0 ? Math.sin(m.hitT * 60) * 0.05 : 0), 0, m.pos.z)
      g.rotation.y = m.facing
      if (m.hitT > 0) m.hitT -= dt
      const pose = v.model.current
      if (pose && p) {
        pose.run = m.broken > 0 ? 0 : Math.min(1, Math.hypot(p.pos.x - (m.lx ?? p.pos.x), p.pos.z - (m.lz ?? p.pos.z)) / Math.max(1e-3, dt) / 6)
        pose.phase = (pose.phase || 0) + dt * 10 * pose.run
        pose.swing = m.parryT > 0 ? Math.sin((1 - m.parryT / 0.35) * Math.PI) : p.mode === 'attack' && m.broken <= 0 ? Math.sin(m.t * 12) : 0
        pose.block = m.parryT > 0 ? 1 : 0
        m.lx = p.pos.x; m.lz = p.pos.z
      }
      if (m.parryT > 0) m.parryT -= dt
      want.push(m.broken > 0)
    }
    if (want.some((x, i) => x !== tags[i])) setTags(want)
    if (alive === 0 && !cleared.current && shades.current.every((m) => m.state === 'gone')) { cleared.current = true; onCleared && onCleared() }
  })
  if (!active) return null
  return (
    <group>
      {spawns.map((_, i) => <Shade key={i} s={shades.current[i]} register={(k, v) => (views.current[k] = v)} />)}
      {spawns.map((_, i) => tags[i] && <ShadeTag key={'t' + i} m={shades.current[i]} />)}
    </group>
  )
}

function ShadeTag({ m }) {
  const g = useRef()
  useFrame(() => { if (g.current) g.current.position.set(m.pos.x, 2.4, m.pos.z) })
  return <group ref={g}><Tag position={[0, 0, 0]} df={10}>not a mirror image now!</Tag></group>
}
