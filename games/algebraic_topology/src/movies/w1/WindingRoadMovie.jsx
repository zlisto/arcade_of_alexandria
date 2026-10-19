import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Gyroid from '../../characters/Gyroid'
import { DevAdvance } from '../../levels/w0/OverworldScene'
import Seascape from '../../world/Seascape'
import layout from '../../world/windingRoad.json'
import { buildSites } from '../../world/sites'

/** Intro movie World 1 · Level 3 (level-1-3-intro). */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

const SITES = buildSites(layout)
const HELIX = SITES.find((s) => s.id === 'the_helix')
const [TX, TZ] = HELIX.pos

const SHOTS = [
  [0, 8, [[TX + 6, 12, TZ + 8], [TX, 4, TZ]], [[TX + 4, 10, TZ + 6], [TX, 2, TZ]]],
  [8, 16, [[TX + 5, 3.5, TZ + 5], [TX, 1.2, TZ]], [[TX + 3.5, 5, TZ + 4], [TX, 3, TZ + 1]]],
  [16, 24, [[TX + 4, 4, TZ + 4], [TX, 0.5, TZ]], [[TX + 3, 3.5, TZ + 3], [TX, 0.5, TZ]]],
  [24, 28, [[TX - 2, 3, TZ + 2], [TX - 1.5, 1, TZ - 1]], [[TX - 1, 2.5, TZ + 1.5], [TX - 1, 1, TZ]]],
  [28, 36, [[TX - 2, 5, TZ + 6], [TX, 1, TZ]], [[TX - 1, 6, TZ + 8], [TX, 1, TZ]]],
]

function MovieCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const [a, b, from, to] = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1]
    const k = smooth(seg(t, a, b))
    camera.position.set(...mix3(from[0], to[0], k))
    look.set(...mix3(from[1], to[1], k))
    camera.lookAt(look)
  })
  return null
}

export default function WindingRoadMovie({ tRef }) {
  const gy = useRef({ x: TX + 4.2, z: TZ, face: 0 })
  const shadowY = useRef(0.5)
  useFrame(() => {
    const t = tRef.current
    const lap = seg(t, 8, 16)
    const theta = lap * Math.PI * 2
    gy.current.x = TX + 4.2 * Math.cos(theta)
    gy.current.z = TZ + 4.2 * Math.sin(theta)
    gy.current.face = theta + Math.PI / 2
    shadowY.current = 0.5 + Math.floor(lap * 1.01) * 2.35
    if (t > 16 && t < 24) {
      const w = Math.sin(t * 3) * 0.4
      gy.current.x = TX + (4.2 + w) * Math.cos(theta)
      gy.current.z = TZ + (4.2 + w) * Math.sin(theta)
    }
  })
  return (
    <>
      <color attach="background" args={['#060912']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[-8, 16, -6]} intensity={1} />
      <Seascape y={-5} area={[TX, TZ, 40, 40]} bed={false} lanterns={4} />
      <mesh position={[TX, -0.2, TZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial color="#1a1824" />
      </mesh>
      <mesh position={[TX, 6, TZ]}>
        <cylinderGeometry args={[1.1, 1.1, 12, 32, 8, true]} />
        <meshStandardMaterial color="#2a2838" emissive="#8060d0" emissiveIntensity={0.2} wireframe />
      </mesh>
      <group position={[TX, shadowY.current, TZ]}>
        <mesh scale={S * 0.9}>
          <capsuleGeometry args={[0.2, 0.45, 6, 10]} />
          <meshStandardMaterial color="#3ecfc4" emissive="#5ee0d8" emissiveIntensity={0.9} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      </group>
      <Gyroid
        scale={S}
        script={() => ({ pos: [gy.current.x / S, 0, gy.current.z / S], rotY: gy.current.face, walk: 0.85, talk: 0, gesture: 0, bow: 0 })}
      />
      <Emmy scale={S} script={() => ({ pos: [(TX - 3) / S, 0, (TZ + 2) / S], rotY: 0.6, walk: 0, talk: tRef.current > 8 && tRef.current < 20 ? 1 : 0, gesture: 0, bow: 0 })} />
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.4} intensity={0.75} />
        <Vignette eskil offset={0.2} darkness={0.5} />
      </EffectComposer>
    </>
  )
}
