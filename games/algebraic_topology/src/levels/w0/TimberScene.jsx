import { useFrame } from '@react-three/fiber'
import { Html, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import { LiveLine } from './FlatsScenery'
import { edgePath, felledAt } from './graphs'
import { DevAdvance, FollowCamera } from './OverworldScene'
import ReefGame from './ReefGame'
import { EmmyBubble } from './FoundryScene'
import Seascape from '../../world/Seascape'

/**
 * Level 0-6's scene: the Timber Yard at dusk, a web of wooden decks on pilings over the
 * sea. Each deck carries tangles — small platforms joined by narrow walkways. Marked
 * walkways glow amber; a felled tree pulls every platform onto the one Gyroid clicked, and
 * the leftover walkways round out into the petals of a bouquet. The unbuilt bridge runs
 * north toward the black spire of the Hollow Throne.
 */

const S = 0.7
const WOOD = '#d8a46a'
const AMBER = '#ffb347'
const PETAL = '#ffd27a'
const BITTEN = '#b070ff'

export function Yard() {
  return (
    <>
      <color attach="background" args={['#160c1c']} />
      <fog attach="fog" args={['#160c1c', 26, 70]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#ffb08a', '#0c0a18', 0.55]} />
      <directionalLight position={[14, 12, -20]} intensity={1.0} color="#ffc49a" />
      <pointLight position={[0, 6, 2]} intensity={10} distance={30} color="#ffb070" />
      <Stars radius={90} depth={40} count={900} factor={2.2} fade speed={0.2} />
      {/* the low sun behind the Throne */}
      <mesh position={[14, 8, -70]}>
        <sphereGeometry args={[5, 32, 20]} />
        <meshBasicMaterial color="#ff8a5a" toneMapped={false} />
      </mesh>
      <Sparkles count={120} scale={[44, 4, 50]} position={[0, 1, -2]} size={2} speed={0.3} color="#ffd2a0" />
      {/* the sea, with its seabed, and boats moored among the pilings */}
      <Seascape y={-2.2} depth={2.2} area={[0, -2, 64, 60]} seed={41} palette={{ water: '#1a3a52', sand: '#4a5a50', weed: '#2a4a38' }} lanterns={8} />
      {BOATS.map(([x, z, r], i) => (
        <Boat key={i} at={[x, z]} rot={r} seed={i} />
      ))}
    </>
  )
}

const BOATS = [[-6.5, 14, 0.4], [7.5, 15, -0.6], [-18, 6, 1.4], [18.5, -6, -1.2], [-15, -14, 2.2], [13, -21, 0.8]]

/** A little rowing boat, rocking on the swell. */
function Boat({ at, rot, seed }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed
    g.current.position.y = -2.15 + Math.sin(t * 1.1) * 0.05
    g.current.rotation.z = Math.sin(t * 0.9) * 0.06
    g.current.rotation.x = Math.cos(t * 0.7) * 0.04
  })
  return (
    <group ref={g} position={[at[0], -2.15, at[1]]} rotation={[0, rot, 0]}>
      <mesh scale={[0.7, 0.35, 1.6]}>
        <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#6a4228" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.66, 1.52, 1]}>
        <circleGeometry args={[1, 20]} />
        <meshStandardMaterial color="#4a2e1c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.02, 0.2]}>
        <boxGeometry args={[1.2, 0.06, 0.25]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, -1.0]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshStandardMaterial color="#ffd080" emissive="#ff9a3a" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** A wooden deck on pilings. */
export function Deck({ site, current }) {
  const rim = useRef()
  useFrame(({ clock }) => {
    rim.current.material.opacity = current ? 0.7 + Math.sin(clock.elapsedTime * 2.4) * 0.25 : 0.45
  })
  const sh = site.def.add[0]
  const rect = sh.type === 'rect'
  const w = rect ? sh.x1 - sh.x0 : 0
  const d = rect ? sh.z1 - sh.z0 : 0
  const piles = useMemo(() => {
    if (rect) return [[-w / 2 + 0.6, -d / 2 + 0.6], [w / 2 - 0.6, -d / 2 + 0.6], [-w / 2 + 0.6, d / 2 - 0.6], [w / 2 - 0.6, d / 2 - 0.6], [0, -d / 2 + 0.6], [0, d / 2 - 0.6]]
    return Array.from({ length: 7 }, (_, i) => [Math.cos((i / 7) * Math.PI * 2) * sh.r * 0.8, Math.sin((i / 7) * Math.PI * 2) * sh.r * 0.8])
  }, [rect, w, d, sh.r])
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh position={[0, -0.25, 0]}>
        {rect ? <boxGeometry args={[w, 0.4, d]} /> : <cylinderGeometry args={[sh.r, sh.r, 0.4, 48]} />}
        <meshStandardMaterial color="#33241a" roughness={0.85} />
      </mesh>
      <mesh ref={rim} position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {rect ? <planeGeometry args={[w + 0.24, d + 0.24]} /> : <ringGeometry args={[sh.r - 0.1, sh.r + 0.02, 64]} />}
        <meshBasicMaterial color="#e0a050" transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {rect && (
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#33241a" roughness={0.85} />
        </mesh>
      )}
      {piles.map(([x, z], i) => (
        <mesh key={i} position={[x, -1.3, z]}>
          <cylinderGeometry args={[0.22, 0.26, 2.2, 8]} />
          <meshStandardMaterial color="#2e2018" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** One tangle: platforms and walkways, marked tree, felling animation, petals. */
export function GraphView({ graph, origin, marked, tree, fellK, bitten, label, current, markColor = AMBER }) {
  const cur = useRef(null)
  const nodeRefs = useRef([])
  const compute = () => {
    if (tree) return felledAt(graph, tree, fellK.current)
    return { nodes: graph.nodes, edges: graph.edges.map((ed) => ({ pts: edgePath(ed, graph.nodes[ed.a], graph.nodes[ed.b]), tree: false })) }
  }
  if (!cur.current) cur.current = compute()
  useFrame(({ clock }) => {
    cur.current = compute()
    cur.current.nodes.forEach((p, i) => {
      const m = nodeRefs.current[i]
      if (m) m.position.set(p[0], 0.08, p[1])
    })
  })
  const lift = (pts) => pts.map(([x, z]) => [x, z, 0.12])
  return (
    <group position={[origin[0], 0, origin[1]]}>
      {graph.edges.map((ed, i) => {
        const isTree = !!tree && tree.includes(i)
        const isMarked = !tree && marked.includes(i)
        const petalIdx = tree && !isTree ? graph.edges.map((_, j) => j).filter((j) => !tree.includes(j)).indexOf(i) : -1
        const isBitten = petalIdx >= 0 && bitten.includes(petalIdx)
        const color = isTree ? markColor : isMarked ? markColor : petalIdx >= 0 ? (isBitten ? BITTEN : PETAL) : WOOD
        const get = () => {
          const e = cur.current.edges[i]
          if (isTree && fellK.current > 0.97) return null
          return lift(e.pts)
        }
        return (
          <group key={i}>
            <LiveLine getPts={get} color={color} width={isMarked || petalIdx >= 0 ? 8 : 6} dashed={isBitten} opacity={isBitten ? 0.6 : 1} />
            {(isMarked || (petalIdx >= 0 && !isBitten)) && <LiveLine getPts={get} color={color} width={18} opacity={0.18} />}
          </group>
        )
      })}
      {graph.nodes.map((_, i) => (
        <mesh key={i} ref={(m) => (nodeRefs.current[i] = m)} position={[graph.nodes[i][0], 0.08, graph.nodes[i][1]]}>
          <cylinderGeometry args={[0.42, 0.46, 0.2, 18]} />
          <meshStandardMaterial color="#8a6040" roughness={0.7} />
        </mesh>
      ))}
      {label && (
        <Html position={[0, 0.2, 2.9]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="graph-label">{label}</div>
        </Html>
      )}
    </group>
  )
}

/** The bridge north to the Throne: posts, and planks that forge one by one. */
function Bridge({ bridge, kRef }) {
  const N = 14
  const planks = useRef()
  const [ax, az] = bridge.a
  const [bx, bz] = bridge.b
  useFrame(() => {
    const k = kRef.current
    planks.current.children.forEach((c, i) => {
      const on = k * N > i
      c.visible = on
      c.position.y = on ? -0.12 - Math.max(0, 1 - (k * N - i)) * 0.6 : -1
    })
  })
  return (
    <group>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[bridge.gate[0] + x, 1.1, bridge.gate[1]]}>
          <boxGeometry args={[0.35, 2.6, 0.35]} />
          <meshStandardMaterial color="#3a2a1e" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[bridge.gate[0], 2.45, bridge.gate[1]]}>
        <boxGeometry args={[2.6, 0.25, 0.4]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.8} />
      </mesh>
      <group ref={planks}>
        {Array.from({ length: N }, (_, i) => {
          const u = (i + 0.5) / N
          return (
            <mesh key={i} position={[ax + (bx - ax) * u, -1, az + (bz - az) * u]}>
              <boxGeometry args={[1.7, 0.16, ((bz - az) / N) * 0.86]} />
              <meshStandardMaterial color="#7a5232" roughness={0.8} emissive="#ff9a3a" emissiveIntensity={0.15} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** The Hollow Throne, far across the water: a black spire under a violet crown. */
export function Throne({ at }) {
  return (
    <group position={[at[0], -2, at[1]]}>
      <mesh position={[0, 7, 0]}>
        <coneGeometry args={[3, 18, 6, 1, true]} />
        <meshStandardMaterial color="#0e0b13" roughness={0.4} metalness={0.5} flatShading side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 17, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.1, 8, 40]} />
        <meshStandardMaterial color="#0d0a12" emissive="#a259ff" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 17, 3]} color="#a259ff" intensity={30} distance={30} />
    </group>
  )
}

export default function TimberScene({
  layout,
  sites,
  yard, // { [siteId]: { marked: {gi: [e]}, felled: {gi: tree}, bitten: {gi: [petal]} } }
  fellKs, // { [siteId]: [kRef per graph] }
  visibleGraphs, // { [siteId]: [gi] }
  bridgeK,
  current,
  emmyAt,
  emmyTalking,
  emmyNear,
  exitOpen,
  walkable,
  game,
  gameKey,
  stateRef,
  frameRef,
  spawnRef,
  ribbonApi,
  playEnabled,
  tool,
  onAction,
  onSpoolClick,
  onEnemies,
  onHearts,
}) {
  const stations = sites.filter((s) => s.stage === 'station')
  const emmyScript = useMemo(
    () => () => {
      const at = emmyAt.current
      return { pos: [at.x / S, 0, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.7 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
    },
    [emmyAt, emmyTalking],
  )
  return (
    <>
      <Yard />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {sites
        .filter((s) => s.kind === 'start')
        .map((s) => (
          <mesh key={s.id} position={[s.pos[0], -0.25, s.pos[1]]}>
            <cylinderGeometry args={[s.def.add[0].r, s.def.add[0].r, 0.4, 32]} />
            <meshStandardMaterial color="#33241a" roughness={0.85} />
          </mesh>
        ))}
      {stations.map((s) => {
        const y = yard[s.id]
        return (
          <group key={s.id}>
            <Deck site={s} current={s.id === current} />
            {visibleGraphs[s.id].map((gi) => {
              const g = s.graphs[gi]
              const off = g.offset || [0, 0]
              return (
                <GraphView
                  key={gi}
                  graph={y.roots?.[gi] != null ? { ...g, root: y.roots[gi] } : g}
                  origin={[s.pos[0] + off[0], s.pos[1] + off[1]]}
                  marked={y.marked[gi] || []}
                  tree={y.felled[gi] || null}
                  fellK={fellKs[s.id][gi]}
                  bitten={y.bitten[gi] || []}
                  label={g.label}
                  current={s.id === current}
                />
              )
            })}
          </group>
        )
      })}
      <Bridge bridge={layout.bridge} kRef={bridgeK} />
      <Throne at={layout.throne} />
      <group scale={S}>
        <Emmy script={emmyScript} />
      </group>
      <EmmyBubble emmyAt={emmyAt} show={emmyNear} />

      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled
        tool={tool}
        sim={null}
        tRef={{ current: 0 }}
        stateRef={stateRef}
        spawnRef={spawnRef}
        ribbonApi={ribbonApi}
        onAction={onAction}
        onStrokeStart={(x, z, cx, cz) => (onSpoolClick(x, z, cx, cz), false)}
        onStrokeMove={() => {}}
        onStrokeEnd={() => {}}
        onEnemies={onEnemies}
        onHearts={onHearts}
        onSpooling={() => {}}
      />
      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </>
  )
}
