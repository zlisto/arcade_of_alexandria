import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Malradix, Octavia, Crown } from '../actors/Figures'
import { Torch, Motes } from '../engine/kit'
import { playMusic, sfx } from '../audio/sfx'
import { setState, useGame } from '../engine/store'

// Opening cutscene. Each caption holds until the player clicks / presses Space (or Skip).
const BEATS = [
  { cap: 'In the Kingdom of Valence, everything is made of molecules: the houses, the rivers, the beasts, the people.', cam: [[0, 4, 16], [0, 2.5, 0]] },
  { cap: 'Their law is the Octet, kept by the Crown of Tetravalence: four bonds of light around a carbon heart.', cam: [[2.2, 3.6, 4.6], [0, 3, 0]] },
  { cap: 'But one sorcerer refused to share.', who: 'Malradix', cam: [[2.5, 2.8, 0.5], [0, 2.2, 7]], mal: 1 },
  { cap: 'Malradix the Unpaired: “Sharing is weakness. I keep my electron to myself — and I will break every bond in this kingdom.”', who: 'Malradix', cam: [[-1.6, 2.7, -0.4], [0, 2.4, 2.4]], mal: 2 },
  { cap: 'He struck the crown. It shattered into twelve Bond Shards, and they streaked away to the twelve corners of the kingdom.', cam: [[0, 4.5, 11], [0, 4, -1]], shatter: true },
  { cap: 'Princess Octavia: “Find the one who can carry four bonds…” Then the dark took her.', who: 'Octavia', cam: [[-4, 2.4, 2.5], [-1.6, 1.8, -0.8]], taken: true },
  { cap: 'Without the crown, Malradix’s violet sparks went hunting through the kingdom, tearing bonds apart.', cam: [[0, 6, 14], [0, 3, -2]], sparks: true },
  { cap: 'Far away, in quiet Hydrogen Village, a young carbon named Kai woke to the sound of bonds breaking.', cam: [[0, 9, 18], [0, 3, 0]], end: true },
]

function Hall({ beat, tBeat }) {
  const { camera } = useThree()
  const crownRef = useRef({ shatter: 0 })
  const [shatter, setShatter] = useState(0)
  const shards = useRef()
  const shardDirs = useMemo(() => [...Array(12)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return new THREE.Vector3(Math.cos(a), 0.6 + (i % 3) * 0.3, Math.sin(a)).normalize() }), [])
  const mal = useRef()
  const oct = useRef()
  const target = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())
  useFrame((_, dt) => {
    const b = BEATS[beat]
    target.current.set(...b.cam[0])
    camera.position.lerp(target.current, Math.min(1, dt * 1.2))
    look.current.lerp(new THREE.Vector3(...b.cam[1]), Math.min(1, dt * 1.6))
    camera.lookAt(look.current)
    // Malradix walks in
    if (mal.current) {
      const goal = beat >= 3 ? 2.2 : beat === 2 ? 7 : 14
      mal.current.position.z += (goal - mal.current.position.z) * Math.min(1, dt * 0.8)
    }
    if (beat >= 4 && crownRef.current.shatter < 1) {
      crownRef.current.shatter = Math.min(1, crownRef.current.shatter + dt * 1.6)
      setShatter(crownRef.current.shatter)
    }
    if (shards.current) {
      shards.current.children.forEach((m, i) => {
        const k = beat >= 4 ? Math.min(1, tBeat.current * 0.22) : 0
        m.position.copy(shardDirs[i]).multiplyScalar(k * k * 30).add(new THREE.Vector3(0, 3, -1.6))
        m.rotation.y += 0.1
        m.visible = beat >= 4 && k < 1
      })
    }
    if (oct.current && beat >= 5) {
      oct.current.position.y += (beat >= 5 && tBeat.current > 1.2 ? -dt * 0.9 : 0)
      oct.current.scale.setScalar(Math.max(0.01, oct.current.scale.x - (tBeat.current > 1.2 ? dt * 0.35 : 0)))
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 40]} /><meshStandardMaterial color="#1b1720" roughness={0.6} metalness={0.2} /></mesh>
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
      <group ref={oct} position={[-1.6, 0, -0.8]}><Octavia rotation={[0, 0.5, 0]} /></group>
      <group ref={mal} position={[0, 0, 14]}><Malradix rotation={[0, Math.PI, 0]} /></group>
      <Motes count={140} area={[20, 9, 30]} center={[0, 0.5, 2]} color="#ffd9a0" size={0.05} />
      {beat >= 5 && <pointLight position={[-1.6, 2, -0.8]} color="#a06bff" intensity={8} distance={6} />}
      {BEATS[beat].sparks && <Motes count={160} area={[18, 6, 18]} center={[0, 0.5, 0]} color="#c070ff" size={0.14} />}
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
