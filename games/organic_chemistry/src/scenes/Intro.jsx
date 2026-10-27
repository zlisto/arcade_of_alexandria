import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Malradix, Octavia, Crown } from '../actors/Figures'
import KaiModel from '../actors/KaiModel'
import { Torch, Motes } from '../engine/kit'
import { Part, preloadModels } from '../engine/models'
import LightPool from '../engine/LightPool'
import { softDot } from '../engine/materials'
import { playMusic, sfx } from '../audio/sfx'
import { setState, useGame } from '../engine/store'

// Opening cutscene. Each caption holds until the player clicks / presses Space (or Skip).
// the village set for the closing beats sits far off to the side of the throne hall
const V = 80
preloadModels('intro', 'village', 'kai')

const BEATS = [
  { cap: 'In the Kingdom of Valence, everything is made of molecules: the houses, the rivers, the beasts, the people.', cam: [[0, 4, 16], [0, 2.5, 0]] },
  { cap: 'Their law is the Octet, kept by the Crown of Tetravalence: four bonds of light around a carbon heart.', cam: [[2.2, 3.6, 4.6], [0, 3.3, 0]] },
  { cap: 'But one sorcerer refused to share.', who: 'Malradix', cam: [[2.5, 2.8, 0.5], [0, 2.2, 7]], look0: [0, 2.2, 7], mal: 1 },
  { cap: 'Malradix the Unpaired: “Sharing is weakness. I keep my electron to myself — and I will break every bond in this kingdom.”', who: 'Malradix', cam: [[-1.6, 2.7, -0.4], [0, 2.4, 2.4]], mal: 2 },
  { cap: 'He struck the crown. It shattered into twelve Bond Shards, and they streaked away to the twelve corners of the kingdom.', cam: [[0, 4.5, 11], [0, 4, -1]], look0: [0, 4, -1], cut: true, shatter: true },
  { cap: 'Princess Octavia: “Find the one who can carry four bonds. Through the shards, I will call to them.”', who: 'Octavia', cam: [[-3.0, 2.0, 1.6], [-1.6, 1.6, -0.8]], look0: [-1.6, 1.6, -0.8], octFace: true },
  { cap: 'Malradix’s dark coiled round her and bore her away, past the fire-mountain, to his fortress beyond the volcano.', cam: [[-5.2, 2.6, 4.2], [-0.7, 1.6, 0.8]], look0: [-0.7, 1.6, 0.8], cut: true, taken: true },
  { cap: 'Without the crown, Malradix’s violet sparks went hunting through the kingdom, tearing bonds apart.', cam: [[0, 6, 14], [0, 3, -2]], sparks: true },
  { cap: 'Only carbon holds four bonds. Far away, one shard fell burning into quiet Hydrogen Village…', cam: [[V - 0.6, 2.2, 10.5], [V - 0.6, 1.6, 0]], look0: [V - 0.6, 1.6, 0], village: true },
  { cap: '…at the feet of a young carbon named Kai. And in its glow, faintly, a princess called his name.', cam: [[V + 2.0, 1.3, 4.2], [V + 0.5, 0.65, 0.8]], village: true, end: true },
]

// fade a model: each mesh gets its own transparent copy of its material the first time it is faded
// (lazily, because the Blender parts load a moment after the intro starts)
function setOpacity(g, a) {
  g.traverse((o) => {
    if (!o.material) return
    if (!o.userData.fadeable) {
      const cl = (m) => { const c = m.clone(); c.onBeforeCompile = m.onBeforeCompile; c.userData.solid = !m.transparent; return c }
      o.material = Array.isArray(o.material) ? o.material.map(cl) : cl(o.material)
      o.userData.fadeable = true
    }
    ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      // only go transparent while fading (a solid robe drawn transparent sorts badly against itself)
      const tr = !m.userData.solid || a < 0.999
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true }
      m.opacity = a
    })
  })
  g.visible = a > 0.01
}

// Malradix's dark: a coil of violet sparks that spirals round the princess
function Vortex({ vRef }) {
  // a coil of dark violet smoke with a few bright sparks riding it
  const { geo, sparks } = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 90; i++) { const t = i / 90; const a = t * Math.PI * 2 * 3.2; const r = 0.62 - t * 0.12; pts.push(new THREE.Vector3(Math.cos(a) * r, t * 2.3, Math.sin(a) * r)) }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.06, 6, false)
    const sp = [...Array(14)].map((_, i) => { const t = (i * 0.37) % 1; const a = t * Math.PI * 2 * 3.2; const r = 0.62 - t * 0.12; return [Math.cos(a) * r, t * 2.3, Math.sin(a) * r, 0.02 + (i % 3) * 0.015] })
    return { geo: g, sparks: sp }
  }, [])
  return (
    <group ref={vRef} visible={false}>
      <mesh geometry={geo}><meshBasicMaterial color="#2a1040" transparent opacity={0.85} depthWrite={false} /></mesh>
      <mesh geometry={geo} scale={[1.08, 1, 1.08]}><meshBasicMaterial color="#7a3ad0" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      {sparks.map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]}><sphereGeometry args={[r, 6, 4]} /><meshBasicMaterial color="#d8a8ff" toneMapped={false} /></mesh>)}
    </group>
  )
}

// a night sky over the village: a dark gradient dome, stars and a pale moon
function NightSky() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(90, 32, 16)
    const c = new Float32Array(g.attributes.position.count * 3)
    const lo = new THREE.Color('#1a2448'), hi = new THREE.Color('#04050c'), t = new THREE.Color()
    for (let i = 0; i < g.attributes.position.count; i++) { t.copy(lo).lerp(hi, Math.min(1, Math.max(0, g.attributes.position.getY(i) / 50))); c.set([t.r, t.g, t.b], i * 3) }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g
  }, [])
  const stars = useMemo(() => {
    const g = new THREE.BufferGeometry(), p = []
    for (let i = 0; i < 500; i++) { const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.3; p.push(Math.cos(a) * Math.cos(e) * 85, Math.sin(e) * 85, Math.sin(a) * Math.cos(e) * 85) }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [])
  return (
    <group position={[V, 0, 0]}>
      <mesh geometry={geo}><meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      <points geometry={stars}><pointsMaterial map={softDot()} size={0.9} color="#dfe8ff" transparent alphaTest={0.02} fog={false} depthWrite={false} /></points>
      <mesh position={[-16, 17, -72]}><sphereGeometry args={[3.2, 20, 14]} /><meshBasicMaterial color="#e8ecff" fog={false} toneMapped={false} /></mesh>
      <sprite position={[-16, 17, -72]} scale={18}><spriteMaterial map={softDot()} color="#9fb4ff" transparent opacity={0.35} fog={false} depthWrite={false} /></sprite>
    </group>
  )
}

// the closing beats: a shard falls into Hydrogen Village and comes to rest at Kai's feet
function VillageSet({ beat, tBeat }) {
  const shard = useRef()
  const glow = useRef()
  const trail = useRef()
  useFrame(() => {
    if (!shard.current) return
    const k = beat === 8 ? Math.min(1, tBeat.current / 2.6) : beat > 8 ? 1 : 0
    shard.current.visible = beat >= 8
    shard.current.position.set(V + 0.75 - (1 - k) * 6, 0.32 + (1 - k * k) * 9, 0.55 - (1 - k) * 3)
    shard.current.scale.setScalar(k < 1 ? 1.5 : 1)
    if (trail.current) trail.current.visible = k < 1
    if (glow.current) glow.current.intensity = k >= 1 ? 6 + Math.sin(tBeat.current * 3) * 1.5 : 2
  })
  // the night village: cottages, trees and ground from the village kit (tools/village_blender.py)
  const huts = [[-5.5, -5, 0.5], [5, -6, -0.4], [-8.5, 0.5, 1.2], [8.5, -1.5, -1.1]]
  return (
    <group>
      <Part model="village" name="ground" position={[V, 0, 0]} castShadow={false} receiveShadow />
      <NightSky />
      {huts.map(([x, z, r], i) => <Part key={i} model="village" name="cottage" position={[V + x, 0, z]} rotation={[0, r, 0]} />)}
      {[[-11, -9, 'pine'], [11, -10, 'pine'], [-13, -3, 'oak'], [13, 3, 'pine'], [-3, -12, 'oak'], [2.5, -13, 'pine'], [-15, 6, 'pine'], [15, -6, 'oak']].map(([x, z, k], i) => (
        <Part key={'t' + i} model="village" name={k} position={[V + x, 0, z]} scale={k === 'pine' ? 0.95 : 1.05} />
      ))}
      {/* a dark tree line all round, so the night sky sits behind woods rather than a void */}
      {[...Array(26)].map((_, i) => {
        const a = (i / 26) * Math.PI * 2, d = 19 + (i % 3) * 2.5
        return <Part key={'r' + i} model="village" name={i % 4 === 1 ? 'oak' : 'pine'} position={[V + Math.cos(a) * d, 0, Math.sin(a) * d - 2]} scale={1.1 + (i % 5) * 0.12} castShadow={false} />
      })}
      <pointLight position={[V, 5, 4]} intensity={10} distance={18} color="#9fb8ff" />
      <group position={[V, 0, 0]} rotation={[0, 0.35, 0]}><KaiModel noTag /></group>
      <group ref={shard} visible={false}>
        <mesh scale={[0.6, 1.6, 0.6]}><octahedronGeometry args={[0.2, 0]} /><meshStandardMaterial color="#ffe08a" emissive="#ffb830" emissiveIntensity={1.6} flatShading metalness={0.3} roughness={0.25} toneMapped={false} /></mesh>
        <sprite scale={1.1}><spriteMaterial map={softDot()} color="#ffd76a" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
        <pointLight ref={glow} position={[0, 0.9, 0]} color="#ffd76a" intensity={2} distance={5} />
        <mesh ref={trail} position={[-0.6, 1.0, -0.3]} rotation={[0.3, 0, 0.55]}><cylinderGeometry args={[0.02, 0.14, 2.2, 8, 1, true]} /><meshBasicMaterial color="#ffe9a8" toneMapped={false} transparent opacity={0.6} /></mesh>
      </group>
      <Motes count={50} area={[16, 4, 12]} center={[V, 1, 0]} color="#ffe9a8" size={0.04} />
    </group>
  )
}

function Hall({ beat, tBeat }) {
  const { camera } = useThree()
  const crownRef = useRef({ shatter: 0 })
  const [shatter, setShatter] = useState(0)
  const shards = useRef()
  const shardT = useRef(0) // counts only from the shatter on, so the burst plays once
  const shardDirs = useMemo(() => [...Array(12)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return new THREE.Vector3(Math.cos(a), 0.6 + (i % 3) * 0.3, Math.sin(a)).normalize() }), [])
  const mal = useRef()
  const oct = useRef()
  const vortex = useRef()
  const tendril = useRef()
  const dark = useRef()
  const strike = useRef()
  const amb = useRef()
  const hemi = useRef()
  const moon = useRef()
  const target = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3(0, 2.5, 0))
  const lastBeat = useRef(-1)
  useFrame((_, dt) => {
    const b = BEATS[beat]
    const t = tBeat.current
    // on a new beat: cut straight to the village (no swoop through the scenery), and start on the beat's own look target
    if (lastBeat.current !== beat) {
      if (b.cut || (b.village && !(BEATS[lastBeat.current] || {}).village)) camera.position.set(...b.cam[0])
      if (b.look0) look.current.set(...b.look0)
      lastBeat.current = beat
    }
    target.current.set(...b.cam[0])
    camera.position.lerp(target.current, Math.min(1, dt * 1.2))
    look.current.lerp(new THREE.Vector3(...b.cam[1]), Math.min(1, dt * 1.6))
    camera.lookAt(look.current)
    // the village beats are moonlit: dim the hall's ambient light and bring up a cold moon
    const night = !!b.village
    if (amb.current) amb.current.intensity += ((night ? 0.12 : 0.35) - amb.current.intensity) * Math.min(1, dt * 4)
    if (hemi.current) hemi.current.intensity += ((night ? 0.3 : 0.8) - hemi.current.intensity) * Math.min(1, dt * 4)
    if (moon.current) moon.current.intensity = night ? 0.9 : 0

    // Malradix walks in out of the dark, then lunges at the crown to strike it
    if (mal.current && beat <= 6) {
      let goal = beat >= 3 ? 2.2 : beat === 2 ? 7 : 24
      if (beat === 4 && t < 0.7) goal = 0.6
      mal.current.position.z += (goal - mal.current.position.z) * Math.min(1, dt * (beat === 4 ? 4 : 0.8))
    }
    if (strike.current) strike.current.intensity = beat === 4 ? Math.max(0, 30 * (1 - Math.abs(t - 0.45) * 3)) : 0
    if (beat >= 4 && crownRef.current.shatter < 1 && t > 0.4) {
      crownRef.current.shatter = Math.min(1, crownRef.current.shatter + dt * 1.6)
      setShatter(crownRef.current.shatter)
    }
    if (beat >= 4) shardT.current += dt
    if (shards.current) {
      const k = Math.min(1, Math.max(0, shardT.current - 0.4) * 0.12)
      shards.current.children.forEach((m, i) => {
        m.position.copy(shardDirs[i]).multiplyScalar(k * k * 30).add(new THREE.Vector3(0, 3, -1.6))
        m.rotation.y += 0.1
        m.visible = beat >= 4 && shardT.current > 0.4 && k < 1
      })
    }

    // the abduction: his dark coils round Octavia, lifts her and carries her to him; then both vanish in a violet burst
    const o = oct.current
    if (o) {
      if (beat < 6) { o.position.set(-1.6, 0, -0.8); o.rotation.z = 0; o.rotation.y += ((b.octFace ? -0.85 : 0) - o.rotation.y) * Math.min(1, dt * 2); setOpacity(o, 1) }
      else if (beat === 6) {
        const lift = THREE.MathUtils.smoothstep(t, 0.8, 2.6)
        o.position.set(-1.6 + 0.9 * lift, 1.1 * lift, -0.8 + 1.6 * lift)
        o.rotation.z = Math.sin(t * 3) * 0.06 * lift
        setOpacity(o, 1 - THREE.MathUtils.smoothstep(t, 2.6, 3.8))
      } else setOpacity(o, 0)
    }
    if (mal.current) {
      if (beat === 6) setOpacity(mal.current, 1 - THREE.MathUtils.smoothstep(t, 2.8, 3.9))
      else setOpacity(mal.current, beat > 6 ? 0 : 1)
    }
    if (vortex.current) {
      const on = beat === 6 && t < 3.9 && !!o
      vortex.current.visible = on
      if (on) {
        const sc = Math.min(1, t / 0.8) * (1 - THREE.MathUtils.smoothstep(t, 3.0, 3.9))
        vortex.current.position.copy(o.position)
        vortex.current.rotation.y += dt * 5
        vortex.current.scale.setScalar(Math.max(0.01, sc))
      }
    }
    if (tendril.current) {
      const on = beat === 6 && t > 0.3 && t < 3.0 && !!o && !!mal.current
      tendril.current.visible = on
      if (on) {
        // a violet beam from his raised hand to the princess
        const from = new THREE.Vector3(-0.5, 2.6, mal.current.position.z - 0.35) // the star on his staff
        const to = o.position.clone().add(new THREE.Vector3(0, 1.1, 0))
        const d = to.clone().sub(from)
        tendril.current.position.copy(from).addScaledVector(d, 0.5)
        tendril.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())
        tendril.current.scale.set(1, Math.max(0.01, d.length() * Math.min(1, (t - 0.3) * 3)), 1)
      }
    }
    if (dark.current) {
      // the violet light swells as the dark takes her, and bursts as they vanish
      dark.current.intensity = beat === 6 ? Math.min(12, t * 8) + 40 * Math.max(0, 1 - Math.abs(t - 3.0) * 3) : beat === 5 ? 2 : 0
      if (o) dark.current.position.set(o.position.x, o.position.y + 1.6, o.position.z)
    }
  })
  const pillars = [-6, -2, 2, 6].flatMap((z) => [[-5, z], [5, z]])
  return (
    <group>
      <color attach="background" args={['#07060b']} />
      <fog attach="fog" args={['#07060b', 12, 40]} />
      <ambientLight ref={amb} intensity={0.35} color="#a8a0c0" />
      <hemisphereLight ref={hemi} args={['#8a7aaa', '#2a2030', 0.8]} />
      <directionalLight ref={moon} position={[V - 20, 30, 25]} intensity={0} color="#7088c0" />
      <pointLight position={[0, 4, 18]} intensity={6} distance={14} color="#ffb070" />
      <directionalLight position={[4, 12, 10]} intensity={0.9} color="#ffd9b0" castShadow />
      <pointLight position={[0, 6, 6]} intensity={14} distance={24} color="#ffcf9a" />
      {/* the throne hall, built in Blender (tools/intro_blender.py) */}
      <Part model="intro" name="hall" castShadow={false} receiveShadow />
      {pillars.map(([x, z], i) => <Torch key={i} pos={[x * 0.78, 0, z]} color="#ffb35a" />)}
      {/* torches either side of the great doors */}
      <Torch pos={[-3.1, 0, 19.2]} color="#ffb35a" /><Torch pos={[3.1, 0, 19.2]} color="#ffb35a" />
      <Crown position={[0, 3, -1.6]} shatter={shatter} />
      <group ref={shards}>{[...Array(12)].map((_, i) => <mesh key={i} scale={[0.6, 1.6, 0.6]}><octahedronGeometry args={[0.28, 0]} /><meshBasicMaterial color="#ffd76a" toneMapped={false} /></mesh>)}</group>
      <group ref={oct} position={[-1.6, 0, -0.8]}><Octavia rotation={[0, 0.45, 0]} /></group>
      <group ref={mal} position={[0, 0, 24]}><Malradix rotation={[0, Math.PI, 0]} /></group>
      <Vortex vRef={vortex} />
      <mesh ref={tendril} visible={false}><cylinderGeometry args={[0.1, 0.025, 1, 8, 1, true]} /><meshBasicMaterial color="#b060ff" toneMapped={false} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <pointLight ref={dark} position={[-1.6, 2, -0.8]} color="#a06bff" intensity={0} distance={8} />
      <pointLight ref={strike} position={[0, 3, -0.4]} color="#c070ff" intensity={0} distance={9} />
      <Motes count={140} area={[20, 9, 30]} center={[0, 0.5, 2]} color="#ffd9a0" size={0.05} />
      {BEATS[beat].sparks && <Motes count={160} area={[18, 6, 18]} center={[0, 0.5, 0]} color="#c070ff" size={0.14} />}
      <VillageSet beat={beat} tBeat={tBeat} />
    </group>
  )
}

const tBeatShared = { current: 0 }

/** 3D half of the cutscene (lives inside the app Canvas). */
export function IntroScene() {
  const beat = useGame((s) => s.introBeat || 0)
  const { camera } = useThree()
  useEffect(() => { camera.position.set(0, 4, 16); camera.fov = 45; camera.updateProjectionMatrix() }, [])
  useFrame((_, dt) => { tBeatShared.current += dt })
  return <><Hall beat={beat} tBeat={tBeatShared} /><LightPool k={6} /></>
}

/** HTML half: captions, click/Space to advance, Skip. */
export default function Intro({ onDone }) {
  const beat = useGame((s) => s.introBeat || 0)
  useEffect(() => { playMusic('intro'); setState({ introBeat: 0 }) }, [])
  useEffect(() => {
    tBeatShared.current = 0
    if (BEATS[beat].shatter) sfx('shatter')
  }, [beat])
  const next = () => { if (beat + 1 < BEATS.length) setState({ introBeat: beat + 1 }); else onDone() }
  useEffect(() => {
    const k = (e) => { if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); next() } if (e.code === 'Escape') onDone() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  const b = BEATS[beat]
  return (
    <div className="overlay-click" onClick={next}>
      <div className="caption"><div className="capbox">{b.cap}<div className="capnext">click or Space ▾</div></div></div>
      <button className="skip" onClick={(e) => { e.stopPropagation(); onDone() }}>Skip ▸▸</button>
    </div>
  )
}
