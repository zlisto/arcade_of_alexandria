import { useFrame } from '@react-three/fiber'
import { Html, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import CountNull from '../../characters/CountNull'
import { LiveLine } from './FlatsScenery'
import { petalPath } from './graphs'
import { DevAdvance, FollowCamera } from './OverworldScene'
import ReefGame from './ReefGame'
import SpaceModel from './SpaceModel'
import { GraphView } from './TimberScene'
import { Clouds, FloatingRocks } from '../../world/Dressing'
import { NULL_AT, PANELS } from './stagesCastle'

/**
 * The Hollow Throne's top: a round hall of black glass open to the night through tall
 * arches, its floor a field of reef tiles that ripple with Null's power. Null waits on a
 * dais before an empty throne with the Null Crown turning overhead. Three demonstration
 * panels on the floor play each trial's exhibits.
 */

const ARENA_R = 8.6
const CYCLE = 6 // seconds per demonstration loop
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)

export function Hall() {
  // reef tiles in rings; they ripple outward from the dais
  const tiles = useMemo(() => {
    const out = []
    for (let r = 1.2; r < ARENA_R; r += 0.8) {
      const n = Math.round((2 * Math.PI * r) / 0.8)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r
        out.push([Math.cos(a) * r, Math.sin(a) * r, r])
      }
    }
    return out
  }, [])
  const inst = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    tiles.forEach(([x, z], i) => {
      const d = Math.hypot(x - NULL_AT[0], z - NULL_AT[1])
      dummy.position.set(x, -0.06 + Math.sin(d * 1.3 - t * 2.2) * 0.035, z)
      dummy.rotation.set(0, Math.atan2(x, z), 0)
      dummy.updateMatrix()
      inst.current.setMatrixAt(i, dummy.matrix)
    })
    inst.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <color attach="background" args={['#06040c']} />
      <fog attach="fog" args={['#06040c', 22, 60]} />
      <ambientLight intensity={0.32} />
      <hemisphereLight args={['#b8a8ff', '#0a0612', 0.45]} />
      <directionalLight position={[8, 16, 10]} intensity={0.7} color="#d8d0ff" />
      <pointLight position={[NULL_AT[0], 5, NULL_AT[1]]} intensity={30} distance={22} color="#a259ff" />
      <pointLight position={[0, 6, 4]} intensity={10} distance={20} color="#ffd8a0" />
      <Stars radius={90} depth={40} count={1800} factor={2.6} fade speed={0.3} />
      <Sparkles count={160} scale={[20, 6, 20]} position={[0, 2, 0]} size={2.2} speed={0.35} color="#c58bff" />
      <FloatingRocks center={[0, 0, 0]} radius={[12.5, 24]} count={30} seed={13} ySpread={[-8, 1]} />
      <Clouds y={-5} area={[0, 0, 70, 70]} count={18} color="#9a7ad8" opacity={0.22} seed={8} speed={0.25} />
      {/* the world far below */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -30, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0b1630" emissive="#06102a" emissiveIntensity={0.8} />
      </mesh>
      {/* the black-glass floor and its rim */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[ARENA_R + 0.4, ARENA_R - 0.6, 0.6, 64]} />
        <meshStandardMaterial color="#0d0a14" roughness={0.15} metalness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <ringGeometry args={[ARENA_R - 0.1, ARENA_R + 0.25, 96]} />
        <meshBasicMaterial color="#8a5aff" toneMapped={false} />
      </mesh>
      <instancedMesh ref={inst} args={[null, null, tiles.length]}>
        <boxGeometry args={[0.66, 0.08, 0.66]} />
        <meshStandardMaterial color="#1c1630" roughness={0.3} metalness={0.5} emissive="#2a1050" emissiveIntensity={0.35} />
      </instancedMesh>
      {/* pillars and open arches */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.3) return null // the gap where Gyroid came in
        return (
          <group key={i} position={[Math.cos(a) * (ARENA_R + 0.9), 0, Math.sin(a) * (ARENA_R + 0.9)]} rotation={[0, -a, 0]}>
            <mesh position={[0, 3.2, 0]}>
              <boxGeometry args={[0.6, 6.8, 0.6]} />
              <meshStandardMaterial color="#120e1a" roughness={0.2} metalness={0.6} flatShading />
            </mesh>
            <mesh position={[0, 6.7, 2.2]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[2.2, 0.16, 6, 20, Math.PI]} />
              <meshStandardMaterial color="#120e1a" roughness={0.2} metalness={0.6} />
            </mesh>
            <mesh position={[0.31, 3.2, 0]}>
              <boxGeometry args={[0.03, 5.6, 0.12]} />
              <meshBasicMaterial color="#8a5aff" toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/** The dais, the empty throne behind it, and the Null Crown turning overhead. */
export function Throne({ crownRef }) {
  const crown = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    crown.current.rotation.y = t * 0.6
    crown.current.position.y = 4.4 + Math.sin(t * 1.2) * 0.15
    if (crownRef) crownRef.current = crown.current
  })
  return (
    <group position={[NULL_AT[0], 0, NULL_AT[1]]}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.9, 2.1, 0.4, 6]} />
        <meshStandardMaterial color="#120e1a" roughness={0.2} metalness={0.6} flatShading />
      </mesh>
      {/* the throne: a tall black back with a hollow circle cut through it */}
      <group position={[0, 0.3, -1.4]}>
        <mesh position={[0, 0.5, 0.3]}>
          <boxGeometry args={[1.4, 0.3, 1]} />
          <meshStandardMaterial color="#0e0b13" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[1.5, 3.8, 0.25]} />
          <meshStandardMaterial color="#0e0b13" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 3, 0.14]}>
          <torusGeometry args={[0.45, 0.06, 8, 32]} />
          <meshBasicMaterial color="#a259ff" toneMapped={false} />
        </mesh>
      </group>
      <group ref={crown} position={[0, 4.4, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.08, 8, 40]} />
          <meshStandardMaterial color="#0d0a12" emissive="#a259ff" emissiveIntensity={1.8} toneMapped={false} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.7, 0.25, Math.sin(a) * 0.7]}>
              <coneGeometry args={[0.08, 0.5, 4]} />
              <meshStandardMaterial color="#d8b8ff" emissive="#a259ff" emissiveIntensity={1.5} toneMapped={false} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- the demonstrations

const RED = '#ff4a6a'
const GOLD = '#ffd27a'

/** Trial 1: a ring of reef with a loop on it doing something (honest or not). */
function RingDemo({ kind, frozen }) {
  const clock = useRef(0)
  const col = useRef(GOLD)
  const loopPts = () => {
    const u = (clock.current % CYCLE) / CYCLE
    const N = 48
    const circ = (cx, cz, r, wob = 0, ph = 0) => Array.from({ length: N + 1 }, (_, i) => {
      const a = (i / N) * Math.PI * 2
      const rr = r + wob * Math.sin(3 * a + ph)
      return [cx + rr * Math.cos(a), cz + rr * Math.sin(a), 0.14]
    })
    if (kind === 'slide') return circ(0.12 * Math.sin(u * 6.28), 0.1 * Math.cos(u * 6.28), 1.05 + 0.18 * Math.sin(u * 6.28), 0.1, u * 6.28)
    if (kind === 'wander') {
      const a = u * Math.PI * 2
      return circ(Math.cos(a) * 1.07, Math.sin(a) * 1.07, 0.22)
    }
    if (kind === 'tear') return circ(0, 0, Math.max(0.02, 1.1 * (1 - smooth(seg(u, 0.15, 0.75)))))
    if (kind === 'leave') {
      const r = 1.07 + 1.3 * Math.sin(Math.PI * seg(u, 0.15, 0.85))
      return circ(r, 0, 0.22)
    }
    if (kind === 'jump') {
      const a = u < 0.5 ? 0 : Math.PI
      return circ(Math.cos(a) * 1.07, Math.sin(a) * 1.07, 0.22)
    }
    return null
  }
  const line = useRef()
  useFrame((_, dt) => {
    if (!frozen) clock.current += dt
    const u = (clock.current % CYCLE) / CYCLE
    const bad =
      (kind === 'tear' && 1.1 * (1 - smooth(seg(u, 0.15, 0.75))) < 0.55) ||
      (kind === 'leave' && 1.07 + 1.3 * Math.sin(Math.PI * seg(u, 0.15, 0.85)) > 1.38) ||
      (kind === 'jump' && Math.abs(u - 0.5) < 0.04)
    col.current = bad ? RED : GOLD
    if (line.current) line.current.material.color.set(col.current)
  })
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.55, 1.6, 64]} />
        <meshStandardMaterial color="#2c5a58" emissive="#0e3432" emissiveIntensity={0.6} roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#05030a" />
      </mesh>
      <DemoLine getPts={loopPts} lineRef={line} />
    </>
  )
}

/** A LiveLine whose color the demo can change each frame. */
function DemoLine({ getPts, lineRef }) {
  return (
    <group
      ref={(g) => {
        if (g) lineRef.current = g.children[0]
      }}
    >
      <LiveLine getPts={getPts} color={GOLD} width={6} />
    </group>
  )
}

const TREE_GRAPH = {
  nodes: [[-0.9, -0.3], [0.9, -0.3], [0, 1.1], [0, -1.4]],
  edges: [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 0 }, { a: 0, b: 3 }],
  root: 0,
}

/** Trial 2: a collapse — legal (a tree felled, a disk shrunk) or not (a loop felled, a ring coned). */
function CollapseDemo({ kind, frozen }) {
  const clock = useRef(0)
  const k = useRef(0)
  useFrame((_, dt) => {
    if (!frozen) clock.current += dt
    const u = (clock.current % CYCLE) / CYCLE
    k.current = seg(u, 0.2, 0.65)
  })
  const disk = useRef()
  useFrame(() => {
    if (disk.current) disk.current.scale.setScalar(Math.max(0.001, 1 - smooth(k.current)))
  })
  if (kind === 'tree') return <GraphView graph={TREE_GRAPH} origin={[0, 0]} marked={[0, 1, 3]} tree={[0, 1, 3]} fellK={k} bitten={[]} current={false} />
  if (kind === 'loopfell')
    return (
      <>
        <mesh position={[0, 0.08, 0.7]}>
          <cylinderGeometry args={[0.42, 0.46, 0.2, 18]} />
          <meshStandardMaterial color="#a07040" roughness={0.7} />
        </mesh>
        <LiveLine getPts={() => (k.current > 0.99 ? null : petalPath([0, 0.7], -Math.PI / 2, 32, 1.8 * (1 - smooth(k.current))).map(([x, z]) => [x, z, 0.14]))} color={RED} width={7} />
      </>
    )
  if (kind === 'cone')
    return (
      <group scale={1.7}>
        <SpaceModel kind="cone_circle" via="cone" kRef={k} spin={false} />
      </group>
    )
  // contract: a disk shrinking to its middle
  return (
    <>
      <mesh ref={disk} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[1.3, 48]} />
        <meshStandardMaterial color={GOLD} emissive="#ff9a2a" emissiveIntensity={0.4} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshBasicMaterial color="#fff2c4" toneMapped={false} />
      </mesh>
    </>
  )
}

/** Trial 3: two spaces side by side, "the same shape?" */
function PairDemo({ pair }) {
  return (
    <>
      <group position={[-0.95, 0.1, 0]} scale={1.15}>
        <SpaceModel kind={pair[0]} />
      </group>
      <group position={[0.95, 0.1, 0]} scale={1.15}>
        <SpaceModel kind={pair[1]} />
      </group>
      <Html position={[0, 0.5, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pair-eq">≃?</div>
      </Html>
    </>
  )
}

export function Panel({ at, trial, exhibit, state }) {
  const frozen = state === 'exposed' || state === 'spared'
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.0, 48]} />
        <meshStandardMaterial color="#120e1c" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
        <ringGeometry args={[1.95, 2.08, 64]} />
        <meshBasicMaterial color={state === 'exposed' ? RED : '#6a4aa8'} toneMapped={false} />
      </mesh>
      {trial === 0 && <RingDemo kind={exhibit} frozen={frozen} />}
      {trial === 1 && <CollapseDemo kind={exhibit} frozen={frozen} />}
      {trial === 2 && <PairDemo pair={exhibit} />}
      {state === 'exposed' && (
        <Html position={[0, 0.2, 2.3]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="verdict-tag bad">FORGERY ✕</div>
        </Html>
      )}
    </group>
  )
}

export default function CastleScene({ trial, round, panelStates, showPanels, nullScript, walkable, game, gameKey, stateRef, frameRef, spawnRef, playEnabled, tool, onEnemies, onHearts }) {
  return (
    <>
      <Hall />
      <Throne />
      <group position={[NULL_AT[0], 0.3, NULL_AT[1]]} scale={0.8}>
        <CountNull script={nullScript} />
      </group>
      {showPanels &&
        PANELS.map((at, i) => <Panel key={`${trial}:${round}:${i}`} at={at} trial={trial} exhibit={round[i]} state={panelStates[i]} />)}
      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled={false}
        tool={tool}
        sim={null}
        tRef={{ current: 0 }}
        stateRef={stateRef}
        spawnRef={spawnRef}
        ribbonApi={{ current: null }}
        onAction={() => {}}
        onStrokeStart={() => false}
        onStrokeMove={() => {}}
        onStrokeEnd={() => {}}
        onEnemies={onEnemies}
        onHearts={onHearts}
        onSpooling={() => {}}
      />
      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.6} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}
