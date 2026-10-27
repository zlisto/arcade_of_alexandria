import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Malradix, Octavia, Crown } from '../actors/Figures'
import KaiModel from '../actors/KaiModel'
import { Torch, Motes } from '../engine/kit'
import { playMusic, sfx } from '../audio/sfx'
import { setState, useGame } from '../engine/store'

// Opening cutscene. Each caption holds until the player clicks / presses Space (or Skip).
// the village set for the closing beats sits far off to the side of the throne hall
const V = 80

const BEATS = [
  { cap: 'In the Kingdom of Valence, everything is made of molecules: the houses, the rivers, the beasts, the people.', cam: [[0, 4, 16], [0, 2.5, 0]] },
  { cap: 'Their law is the Octet, kept by the Crown of Tetravalence: four bonds of light around a carbon heart.', cam: [[2.2, 3.6, 4.6], [0, 3, 0]] },
  { cap: 'But one sorcerer refused to share.', who: 'Malradix', cam: [[2.5, 2.8, 0.5], [0, 2.2, 7]], look0: [0, 2.2, 7], mal: 1 },
  { cap: 'Malradix the Unpaired: “Sharing is weakness. I keep my electron to myself — and I will break every bond in this kingdom.”', who: 'Malradix', cam: [[-1.6, 2.7, -0.4], [0, 2.4, 2.4]], mal: 2 },
  { cap: 'He struck the crown. It shattered into twelve Bond Shards, and they streaked away to the twelve corners of the kingdom.', cam: [[0, 4.5, 11], [0, 4, -1]], shatter: true },
  { cap: 'Princess Octavia: “Find the one who can carry four bonds. Through the shards, I will call to them.”', who: 'Octavia', cam: [[-3.4, 2.1, 1.2], [-1.6, 1.55, -0.8]], look0: [-1.6, 1.55, -0.8] },
  { cap: 'Malradix’s dark coiled round her and bore her away, past the fire-mountain, to his fortress beyond the volcano.', cam: [[-4.4, 3.0, 6.8], [-0.7, 1.5, 0.8]], look0: [-0.7, 1.5, 0.8], cut: true, taken: true },
  { cap: 'Without the crown, Malradix’s violet sparks went hunting through the kingdom, tearing bonds apart.', cam: [[0, 6, 14], [0, 3, -2]], sparks: true },
  { cap: 'Only carbon holds four bonds. Far away, one shard fell burning into quiet Hydrogen Village…', cam: [[V - 0.6, 2.2, 10.5], [V - 0.6, 3.2, 0]], look0: [V - 0.6, 3.2, 0], village: true },
  { cap: '…at the feet of a young carbon named Kai. And in its glow, faintly, a princess called his name.', cam: [[V + 2.0, 1.3, 4.2], [V + 0.5, 0.65, 0.8]], village: true, end: true },
]

// clone a model's materials so the intro can fade it without touching the in-game copies
function fadeable(g) {
  g.traverse((o) => {
    if (!o.material) return
    o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone()
    ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.transparent = true })
  })
}
function setOpacity(g, a) {
  g.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.opacity = a }) })
  g.visible = a > 0.01
}

// Malradix's dark: a coil of violet sparks that spirals round the princess
function Vortex({ vRef }) {
  const pts = useMemo(() => [...Array(24)].map((_, i) => ({ a: (i / 24) * Math.PI * 2 * 3, y: (i / 24) * 2.2, r: 0.55 + (i % 3) * 0.12 })), [])
  return (
    <group ref={vRef} visible={false}>
      {pts.map((p, i) => <mesh key={i} position={[Math.cos(p.a) * p.r, p.y, Math.sin(p.a) * p.r]}><sphereGeometry args={[0.07, 8, 6]} /><meshBasicMaterial color="#c070ff" toneMapped={false} /></mesh>)}
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
    shard.current.position.set(V + 0.8 - (1 - k) * 6, 0.35 + (1 - k * k) * 9, 1.5 - (1 - k) * 3)
    shard.current.scale.setScalar(k < 1 ? 1.8 : 1)
    if (trail.current) trail.current.visible = k < 1
    if (glow.current) glow.current.intensity = k >= 1 ? 6 + Math.sin(tBeat.current * 3) * 1.5 : 2
  })
  const huts = [[-5, -4], [4.5, -5], [-7, 1], [7, -1]]
  return (
    <group>
      <mesh position={[V, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[34, 30]} /><meshStandardMaterial color="#2c4a2a" roughness={0.95} /></mesh>
      <mesh position={[V, 0.006, 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.2, 16]} /><meshStandardMaterial color="#4a3f30" roughness={1} /></mesh>
      {huts.map(([x, z], i) => (
        <group key={i} position={[V + x, 0, z]}>
          <mesh position={[0, 0.85, 0]} castShadow><cylinderGeometry args={[1.3, 1.4, 1.7, 14]} /><meshStandardMaterial color="#8a8070" roughness={0.9} /></mesh>
          <mesh position={[0, 2.3, 0]} castShadow><coneGeometry args={[1.75, 1.4, 14]} /><meshStandardMaterial color="#3e6a3a" roughness={0.9} /></mesh>
          <mesh position={[0, 0.6, 1.36]}><boxGeometry args={[0.6, 1.1, 0.08]} /><meshStandardMaterial color="#3a2a1c" /></mesh>
          <mesh position={[0.75, 1.05, 1.15]}><boxGeometry args={[0.35, 0.35, 0.06]} /><meshBasicMaterial color="#ffc070" toneMapped={false} /></mesh>
        </group>
      ))}
      {[[-10, -8], [10, -9], [-12, -2], [12, 3], [-3, -10], [2, -11]].map(([x, z], i) => (
        <mesh key={i} position={[V + x, 2, z]} castShadow><coneGeometry args={[1.2, 4, 8]} /><meshStandardMaterial color="#1f3a24" /></mesh>
      ))}
      <pointLight position={[V, 5, 4]} intensity={10} distance={18} color="#9fb8ff" />
      <group position={[V, 0, 0]} rotation={[0, 0.35, 0]}><KaiModel noTag /></group>
      <group ref={shard} visible={false}>
        <mesh scale={[0.6, 1.6, 0.6]}><octahedronGeometry args={[0.28, 0]} /><meshBasicMaterial color="#ffd76a" toneMapped={false} /></mesh>
        <pointLight ref={glow} color="#ffd76a" intensity={2} distance={5} />
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
  const target = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3(0, 2.5, 0))
  const lastBeat = useRef(-1)
  useEffect(() => { if (oct.current) fadeable(oct.current); if (mal.current) fadeable(mal.current) }, [])
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
      const k = Math.min(1, Math.max(0, shardT.current - 0.4) * 0.22)
      shards.current.children.forEach((m, i) => {
        m.position.copy(shardDirs[i]).multiplyScalar(k * k * 30).add(new THREE.Vector3(0, 3, -1.6))
        m.rotation.y += 0.1
        m.visible = beat >= 4 && shardT.current > 0.4 && k < 1
      })
    }

    // the abduction: his dark coils round Octavia, lifts her and carries her to him; then both vanish in a violet burst
    const o = oct.current
    if (o) {
      if (beat < 6) { o.position.set(-1.6, 0, -0.8); o.rotation.z = 0; setOpacity(o, 1) }
      else if (beat === 6) {
        const lift = THREE.MathUtils.smoothstep(t, 0.8, 2.6)
        o.position.set(-1.6 + 0.9 * lift, 1.1 * lift, -0.8 + 1.6 * lift)
        o.rotation.z = Math.sin(t * 3) * 0.06 * lift
        setOpacity(o, 1 - THREE.MathUtils.smoothstep(t, 2.6, 3.3))
      } else setOpacity(o, 0)
    }
    if (mal.current) {
      if (beat === 6) setOpacity(mal.current, 1 - THREE.MathUtils.smoothstep(t, 2.7, 3.4))
      else setOpacity(mal.current, beat > 6 ? 0 : 1)
    }
    if (vortex.current) {
      const on = beat === 6 && t < 3.4 && !!o
      vortex.current.visible = on
      if (on) {
        const sc = Math.min(1, t / 0.8) * (1 - THREE.MathUtils.smoothstep(t, 2.8, 3.4))
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
        const from = new THREE.Vector3(0.45, 1.9, mal.current.position.z - 0.3)
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
      <ambientLight intensity={0.55} color="#b8a8d8" />
      <hemisphereLight args={['#8a7aaa', '#2a2030', 0.8]} />
      <directionalLight position={[4, 12, 10]} intensity={0.9} color="#ffd9b0" castShadow />
      <pointLight position={[0, 6, 6]} intensity={14} distance={24} color="#ffcf9a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 60]} /><meshStandardMaterial color="#1b1720" roughness={0.6} metalness={0.2} /></mesh>
      <mesh position={[0, 0.01, 4]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.4, 26]} /><meshStandardMaterial color="#5a1a26" roughness={0.9} /></mesh>
      {pillars.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, 4, z]} castShadow><cylinderGeometry args={[0.45, 0.55, 8, 10]} /><meshStandardMaterial color="#2a2632" roughness={0.8} /></mesh>
          <Torch pos={[x * 0.78, 0, z]} color="#ffb35a" />
        </group>
      ))}
      <mesh position={[0, 0.6, -1.5]}><boxGeometry args={[3, 1.2, 2]} /><meshStandardMaterial color="#24202c" /></mesh>
      <mesh position={[0, 1.6, -1.6]}><boxGeometry args={[0.6, 0.8, 0.6]} /><meshStandardMaterial color="#3a3442" /></mesh>
      <Crown position={[0, 3, -1.6]} shatter={shatter} />
      <group ref={shards}>{[...Array(12)].map((_, i) => <mesh key={i} scale={[0.6, 1.6, 0.6]}><octahedronGeometry args={[0.28, 0]} /><meshBasicMaterial color="#ffd76a" toneMapped={false} /></mesh>)}</group>
      <group ref={oct} position={[-1.6, 0, -0.8]}><Octavia rotation={[0, 0.45, 0]} /></group>
      <group ref={mal} position={[0, 0, 24]}><Malradix rotation={[0, Math.PI, 0]} /></group>
      <Vortex vRef={vortex} />
      <mesh ref={tendril} visible={false}><cylinderGeometry args={[0.05, 0.12, 1, 8, 1, true]} /><meshBasicMaterial color="#b060ff" toneMapped={false} transparent opacity={0.85} /></mesh>
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
  return <Hall beat={beat} tBeat={tBeatShared} />
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
