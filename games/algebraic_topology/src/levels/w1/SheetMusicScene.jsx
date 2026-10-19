import { Html, Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import Seascape from '../../world/Seascape'
import { CausewaySlab } from '../../world/ReefScenery'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import { EmmyBubble } from '../w0/FoundryScene'
import { letterText } from './covers.js'

const S = 0.7
const GLASS = '#a8e0ff'
const GOLD = '#ffb347'

export function StacksSky() {
  return (
    <>
      <color attach="background" args={['#0a1428']} />
      <fog attach="fog" args={['#0a1428', 28, 72]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#c8e8ff', '#080818', 0.55]} />
      <directionalLight position={[12, 18, -8]} intensity={1.05} color="#d0f0ff" />
      <pointLight position={[0, 8, 4]} intensity={12} distance={36} color="#88ccff" />
      <Stars radius={80} depth={36} count={1100} factor={2} fade speed={0.15} />
      <Sparkles count={90} scale={[50, 6, 50]} position={[0, 2, -4]} size={2.2} speed={0.25} color="#ffe6a8" />
      <Seascape y={-2.4} depth={2.4} area={[0, -4, 70, 64]} seed={19} palette={{ water: '#1a3050', sand: '#3a4a58', weed: '#2a4858' }} lanterns={10} />
    </>
  )
}

function GlassDeck({ site, current, done, children }) {
  const rim = useRef()
  const pulse = current && !done
  useFrame(({ clock }) => {
    if (!rim.current) return
    rim.current.material.emissiveIntensity = pulse ? 0.9 + Math.sin(clock.elapsedTime * 3) * 0.35 : done ? 0.35 : 0.15
  })
  const [x, z] = site.pos
  const r = site.def?.add?.[0]?.r || 5
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[r, 32]} />
        <meshStandardMaterial color="#2a3548" roughness={0.85} metalness={0.2} />
      </mesh>
      <mesh ref={rim} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[r - 0.15, r + 0.08, 48]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.2} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[r * 0.92, 32]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.22} emissive="#4488cc" emissiveIntensity={0.25} />
      </mesh>
      {children}
    </group>
  )
}

function CoverSheets({ cover, base, local }) {
  if (!cover) return null
  const h0 = 0.35
  const h1 = 0.85
  const ports = [
    [-2.2, 0.4],
    [2.2, 0.4],
  ]
  return (
    <group position={local}>
      {ports.map(([px, pz], vi) => (
        <group key={vi} position={[px, 0, pz]}>
          <mesh position={[0, h0, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.06, 20]} />
            <meshStandardMaterial color={GLASS} transparent opacity={0.5} emissive="#88ccff" emissiveIntensity={base === vi ? 1.2 : 0.3} toneMapped={false} />
          </mesh>
          <mesh position={[0, h1, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.05, 20]} />
            <meshStandardMaterial color={GLASS} transparent opacity={0.35} emissive="#aaccee" emissiveIntensity={0.2} />
          </mesh>
          {base === vi && (
            <mesh position={[0, h0 + 0.2, 0]}>
              <coneGeometry args={[0.12, 0.28, 8]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={2} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      {[0, 1].map((v) =>
        ['a', 'b'].map((L) => {
          const w = cover.adj[v][L]
          const from = ports[v]
          const to = ports[w] || from
          const y = L === 'a' ? h0 : h1
          const col = L === 'a' ? '#e04040' : '#8060d0'
          return (
            <Line
              key={`${v}-${L}`}
              points={[
                [from[0], y, from[1]],
                [to[0], y, to[1]],
              ]}
              color={col}
              lineWidth={3}
              toneMapped={false}
            />
          )
        }),
      )}
    </group>
  )
}

function TreeViaduct({ treeWord, targets, treeHits }) {
  const branches = useMemo(
    () => [
      { letter: 'a', from: [0, 0], to: [3.5, -1.2], color: '#e04040' },
      { letter: 'A', from: [0, 0], to: [-3.5, -1.2], color: '#ff6688' },
      { letter: 'b', from: [0, 0], to: [0.8, 3.8], color: '#8060d0' },
      { letter: 'B', from: [0, 0], to: [-0.8, 3.8], color: '#b090ff' },
    ],
    [],
  )
  const wStr = treeWord?.map((L) => (L === 'A' ? 'A' : L === 'B' ? 'B' : L)).join('') || ''
  return (
    <group position={[0, 0.15, 0]}>
      {branches.map((b) => (
        <group key={b.letter}>
          <Line points={[[b.from[0], 0.2, b.from[1]], [b.to[0], 0.35, b.to[1]]]} color={b.color} lineWidth={2.5} toneMapped={false} />
          <mesh position={[b.to[0], 0.4, b.to[1]]}>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={targets?.includes(wStr) || treeHits?.[wStr] ? 1.8 : 0.5} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <Html position={[0, 1.2, -4]} center className="sheet-label">
        <span>{treeWord?.length ? treeWord.map((L) => letterText(L)).join(' ') : 'origin'}</span>
      </Html>
    </group>
  )
}

function TorusGrid({ site, highlight }) {
  const [tx, tz] = site.pos
  const cells = []
  for (let m = -2; m <= 2; m++) for (let n = -2; n <= 2; n++) cells.push([m, n])
  return (
    <group position={[tx, 1.2, tz - 2]}>
      {cells.map(([m, n]) => {
        const hit = highlight && highlight[0] === m && highlight[1] === n
        return (
          <mesh key={`${m},${n}`} position={[m * 1.1, 0, n * 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshStandardMaterial color={hit ? GOLD : GLASS} transparent opacity={hit ? 0.85 : 0.25} emissive={hit ? GOLD : '#4488aa'} emissiveIntensity={hit ? 1.5 : 0.2} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function SheetMusicScene({
  layout,
  sites,
  current,
  done,
  cover,
  base,
  treeWord,
  treeTargets,
  treeHits,
  torusHighlight,
  exitOpen,
  walkable,
  game,
  gameKey,
  stateRef,
  frameRef,
  spawnRef,
  playEnabled,
  tool,
  onAction,
  onEnemies,
  onHearts,
  emmyAt,
  emmyTalking,
  emmyNear,
}) {
  const emmy = useRef()
  useFrame(() => {
    const e = emmyAt.current
    emmy.current?.position.set(e.x, 0, e.z)
    emmy.current?.rotation.set(0, e.rotY, 0)
  })
  return (
    <>
      <StacksSky />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {sites
        .filter((s) => s.stage)
        .map((s) => (
          <GlassDeck key={s.id} site={s} current={current === s.id} done={done[s.id]}>
            {s.id === 'to_order' && <CoverSheets cover={cover} base={base} local={[0, 0, 0]} />}
            {s.id === 'moving_start' && cover && <CoverSheets cover={cover} base={base} local={[0, 0, 0]} />}
            {s.id === 'endless_tree' && <TreeViaduct treeWord={treeWord} targets={treeTargets} treeHits={treeHits} />}
            {s.id === 'plane_torus' && <TorusGrid site={{ pos: [0, 0] }} highlight={torusHighlight} />}
          </GlassDeck>
        ))}
      {exitOpen && (
        <mesh position={[layout.exit.gate[0], 0.5, layout.exit.gate[1]]}>
          <torusGeometry args={[1.4, 0.12, 12, 32]} />
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.2} toneMapped={false} />
        </mesh>
      )}
      <group ref={emmy} scale={S}>
        <Emmy script={() => ({ pos: [0, 0, 0], rotY: 0, walk: emmyAt.current.walk, gesture: emmyTalking.current ? 0.8 : 0, talk: emmyTalking.current, bow: 0 })} />
        {emmyNear && <EmmyBubble />}
      </group>
      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        tool={tool}
        stateRef={stateRef}
        spawnRef={spawnRef}
        onAction={onAction}
        onEnemies={onEnemies}
        onHearts={onHearts}
      />
      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.85} intensity={0.85} />
        <Vignette eskil={false} offset={0.22} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
