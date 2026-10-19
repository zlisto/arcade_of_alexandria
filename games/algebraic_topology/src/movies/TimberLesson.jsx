import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Gyroid from '../characters/Gyroid'
import { DevAdvance } from '../levels/w0/OverworldScene'
import { LiveLine } from '../levels/w0/FlatsScenery'
import { GraphView, Yard } from '../levels/w0/TimberScene'
import { PETAL_SIZE, petalAngles } from '../levels/w0/graphs'

/**
 * "Felling Trees" (videos.json level-0-6-lesson): collapsing trees in graphs, slowly.
 *   A 0–11   a tree: Gyroid marks its n − 1 = 3 edges and fells it — it collapses to one point.
 *            Safe: a tree has no hole (it's contractible)
 *   B 11–19  a graph with a cycle: a triangle with a tail; the cycle goes round a hole
 *   C 19–31  Gyroid marks n − 1 = 3 edges that touch every node; the 4th is refused — it
 *            would close the cycle
 *   D 31–40  fell: the tree collapses to one node; the unmarked edge becomes a loop (a petal);
 *            the hole survives
 *   E 40–48  the wrong cut: collapse every edge, cycle and all — the hole dies (violet)
 *   F 48–55  the count: nodes − edges, before and after; petals = 1 − χ
 *   G 55–63  how to play; H 63–70 summary
 * The diagram (TimberLessonOverlay) runs on the same clock.
 */

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const ORIGIN = [-0.8, 0.5]
const S = 0.7

// a tree: 4 nodes, 3 edges, no cycle
const TREE_G = { nodes: [[-2.1, 1.2], [-0.4, -0.2], [1.5, 1.0], [1.3, -1.7]], edges: [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 1, b: 3 }], root: 1 }
// a graph with one cycle: a triangle (nodes 0, 1, 2) with a tail (2 – 3)
const CYC_G = { nodes: [[-1.8, -1.4], [1.8, -1.4], [0, 1.4], [0, 3.0]], edges: [{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 0 }, { a: 2, b: 3 }], root: 2 }
const HOLE = [0, -0.45] // the middle of the triangle
// where the hole ends up once the tree is felled: inside the one petal, at the root
const PETAL_HOLE = (() => {
  const a = petalAngles(CYC_G, 1)[0]
  const r = CYC_G.nodes[CYC_G.root]
  return [r[0] + Math.cos(a) * PETAL_SIZE * 0.55, r[1] + Math.sin(a) * PETAL_SIZE * 0.55]
})()

export const BEATS = {
  treeMarks: [2.6, 3.8, 5.0],
  treeFell: 7.2,
  cycMarks: [20.6, 22.2, 23.8], // the tail, then two sides of the triangle
  cycMarkEdges: [3, 1, 2],
  refuse: [26.2, 28.8], // edge 0 would close the cycle
  cycFell: 32.4,
  wrongMarks: 41.4,
  wrongFell: 43.4,
}

function LessonCamera() {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(1.0, 0, 0.8), [])
  useFrame(() => {
    camera.position.set(1.2, 11.8, 9.0)
    camera.lookAt(look)
  })
  return null
}

/** Re-renders only when the lesson's discrete state changes. */
function useStage(tRef, fn) {
  const [stage, setStage] = useState(() => fn(tRef.current))
  const last = useRef(JSON.stringify(stage))
  useFrame(() => {
    const s = fn(tRef.current)
    const k = JSON.stringify(s)
    if (k !== last.current) {
      last.current = k
      setStage(s)
    }
  })
  return stage
}

export default function TimberLesson({ tRef }) {
  const kTree = useRef(0)
  const kCyc = useRef(0)
  const kWrong = useRef(0)
  const hole = useRef()
  const stage = useStage(tRef, (t) => ({
    show: t < 11 ? 'tree' : t >= 40 && t < 48 ? 'wrong' : 'cycle',
    treeMarked: [0, 1, 2].filter((i) => t >= BEATS.treeMarks[i]),
    treeFelled: t >= BEATS.treeFell,
    cycMarked: t < 40 || t >= 48 ? BEATS.cycMarkEdges.filter((_, i) => t >= BEATS.cycMarks[i]) : [],
    cycFelled: (t >= BEATS.cycFell && t < 40) || t >= 48,
    wrongMarked: t >= BEATS.wrongMarks,
    wrongFelled: t >= BEATS.wrongFell,
    refused: t >= BEATS.refuse[0] && t < BEATS.refuse[1],
    cycleGlow: t >= 13 && t < 19,
  }))
  useFrame(({ clock }) => {
    const t = tRef.current
    kTree.current = seg(t, BEATS.treeFell, BEATS.treeFell + 2.4)
    kCyc.current = t >= 48 ? 1 : seg(t, BEATS.cycFell, BEATS.cycFell + 2.6)
    kWrong.current = seg(t, BEATS.wrongFell, BEATS.wrongFell + 2.4)
    // the hole: there with the cycle (and after an honest fell), gone when the wrong cut squashes it
    const inWrong = t >= 40 && t < 48
    hole.current.visible = t >= 13 && !(inWrong && kWrong.current > 0.7)
    hole.current.material.opacity = (inWrong ? 1 - kWrong.current : 1) * (0.55 + Math.sin(clock.elapsedTime * 2) * 0.15)
    // an honest fell carries the hole along into the petal; the wrong cut squashes it where it is
    const k = inWrong ? 0 : kCyc.current
    hole.current.position.set(HOLE[0] + (PETAL_HOLE[0] - HOLE[0]) * k, 0.03, HOLE[1] + (PETAL_HOLE[1] - HOLE[1]) * k)
    hole.current.scale.setScalar(inWrong ? Math.max(0.01, 1 - kWrong.current) : 1 - 0.45 * k)
  })
  // C: the edge that would close the cycle flashes red
  const refusedPts = () => {
    if (!stage.refused) return null
    const [a, b] = [CYC_G.nodes[0], CYC_G.nodes[1]]
    return [
      [a[0], a[1], 0.22],
      [b[0], b[1], 0.22],
    ]
  }
  // B: the cycle itself, glowing pink
  const cyclePts = () => {
    if (!stage.cycleGlow) return null
    const [p, q, r] = CYC_G.nodes
    return [p, q, r, p].map(([x, z]) => [x, z, 0.24])
  }
  const gyro = () => {
    const t = tRef.current
    const acts = [...BEATS.treeMarks, BEATS.treeFell, ...BEATS.cycMarks, BEATS.refuse[0], BEATS.cycFell, BEATS.wrongMarks, BEATS.wrongFell]
    const casting = acts.some((m) => t >= m - 0.25 && t < m + 0.45)
    return { pos: [(ORIGIN[0] + 3.4) / S, 0, (ORIGIN[1] + 0.8) / S], rotY: -Math.PI / 2 - 0.2, run: 0, cast: casting ? 1 : 0.2, whip: 0, loop: 0, loopDrop: 0 }
  }
  return (
    <>
      <Yard />
      <mesh position={[ORIGIN[0], -0.25, ORIGIN[1]]}>
        <cylinderGeometry args={[4.4, 4.4, 0.4, 48]} />
        <meshStandardMaterial color="#33241a" roughness={0.85} />
      </mesh>

      {stage.show === 'tree' && <GraphView graph={TREE_G} origin={ORIGIN} marked={stage.treeMarked} tree={stage.treeFelled ? [0, 1, 2] : null} fellK={kTree} bitten={[]} current />}
      {stage.show === 'cycle' && <GraphView graph={CYC_G} origin={ORIGIN} marked={stage.cycMarked} tree={stage.cycFelled ? BEATS.cycMarkEdges : null} fellK={kCyc} bitten={[]} current />}
      {stage.show === 'wrong' && (
        <GraphView graph={CYC_G} origin={ORIGIN} marked={stage.wrongMarked ? [0, 1, 2, 3] : []} tree={stage.wrongFelled ? [0, 1, 2, 3] : null} fellK={kWrong} bitten={[]} current markColor="#b070ff" />
      )}
      <group position={[ORIGIN[0], 0, ORIGIN[1]]}>
        <LiveLine getPts={refusedPts} color="#ff4a5a" width={10} />
        <LiveLine getPts={cyclePts} color="#ff8ad8" width={9} />
        {/* the hole inside the cycle */}
        <mesh ref={hole} position={[HOLE[0], 0.03, HOLE[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.7, 32]} />
          <meshBasicMaterial color="#05070c" transparent opacity={0.6} depthWrite={false} />
        </mesh>
        {stage.cycleGlow && (
          <Html position={[HOLE[0], 0.3, HOLE[1]]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="hole-tag">hole</div>
          </Html>
        )}
      </group>
      <group scale={S}>
        <Gyroid script={gyro} />
      </group>

      <LessonCamera />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </>
  )
}

// ---------------------------------------------------------------- the 2D diagram

const GOLD = '#ffd27a'
const INK = '#e8eefc'
const SOFT = '#9fb0d0'
const PINK = '#ff8ad8' // math is pink everywhere
const MATH = { fontFamily: "'Cambria Math', 'STIX Two Math', serif" }

/** rows: [left, right, isMath] */
function Card({ title, rows, foot }) {
  return (
    <svg viewBox="0 0 260 180" className="lesson-svg">
      <text x="130" y="30" textAnchor="middle" fill={GOLD} fontSize="16" fontWeight="700">
        {title}
      </text>
      {rows.map(([a, b, math], i) => (
        <g key={i}>
          <text x="18" y={64 + i * 27} fill={math ? PINK : INK} fontSize="13.5" style={math ? MATH : undefined} fontWeight={math ? 700 : 400}>
            {a}
          </text>
          <text x="242" y={64 + i * 27} fill={SOFT} fontSize="11.5" textAnchor="end">
            {b}
          </text>
        </g>
      ))}
      {foot && (
        <text x="130" y="170" textAnchor="middle" fill={SOFT} fontSize="11">
          {foot}
        </text>
      )}
    </svg>
  )
}

function Diagram({ t }) {
  if (t < 11)
    return (
      <Card
        title="a tree"
        rows={[['nodes (platforms): 4', ''], ['edges (walkways): 3', ''], ['3 = n − 1', 'a tree always has', true], ['no cycle, no hole', 'so it shrinks to a point']]}
        foot={t >= BEATS.treeFell ? 'felled: one point — nothing lost' : 'mark every edge, then fell'}
      />
    )
  if (t < 19)
    return <Card title="a graph with a cycle" rows={[['nodes: 4', ''], ['edges: 4', ''], ['the triangle is a cycle', 'a loop of edges'], ['inside it: a hole', 'that must survive']]} foot="you can't shrink a cycle without killing its hole" />
  if (t < 31) {
    const k = BEATS.cycMarks.filter((m) => t >= m).length
    return (
      <Card
        title="mark a spanning tree"
        rows={[['touch every node', 'with the edges you mark'], [`marked ${k} of n − 1 = 3`, '', true], ['never close a cycle', t >= BEATS.refuse[0] ? 'the 4th edge: refused' : '']]}
        foot="spanning tree: reaches every node, no cycle"
      />
    )
  }
  if (t < 40) return <Card title="fell the tree" rows={[['tree → one node', 'safe: no hole in it'], ['the unmarked edge', 'now starts and ends there'], ['it becomes a loop', 'a petal — the hole survives']]} foot="Hatcher, Example 0.7 and Proposition 0.17" />
  if (t < 48) return <Card title="the wrong cut" rows={[['collapse the cycle too', 'every edge marked'], ['everything → a point', ''], ['the hole is gone', 'a different space']]} foot="that's Null's move" />
  if (t < 55)
    return (
      <Card
        title="χ = nodes − edges"
        rows={[['tree: 4 − 3 = 1', '→ 0 petals: a point', true], ['cycle: 4 − 4 = 0', '→ 1 petal: a circle', true], ['petals = 1 − χ', 'felling never changes χ', true]]}
        foot="the Thicket: 5 − 7 = −2 → 3 petals"
      />
    )
  return null
}

function Steps({ t }) {
  if (t >= 63)
    return (
      <div className="lesson-steps">
        <h4>Felling trees</h4>
        <p className="lesson-math">graph ≃ bouquet of 1 − χ circles</p>
        <p className="lesson-note">mark a spanning tree (n − 1 edges, every node, no cycle), then fell it</p>
        <p className="lesson-math">never collapse a cycle</p>
        <p className="lesson-note">its hole would die with it</p>
      </div>
    )
  const steps = [
    ['2', 'the Spool: click edges (walkways) to mark a tree', t < 57.2],
    ['✕', 'an edge that would close a cycle is refused', t >= 57.2 && t < 59.2],
    ['3', 'the Cell-Smith: click any node (platform) to fell onto it', t >= 59.2 && t < 61.2],
    ['⚡', 'lash Loop-biters; restring a bitten petal (3)', t >= 61.2],
  ]
  return (
    <div className="lesson-steps">
      <h4>◎ Spool · ✦ Cell-Smith</h4>
      {steps.map(([k, label, on], i) => (
        <div key={i} className={`lesson-step ${on ? 'on' : ''}`}>
          <kbd>{k}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

/** The diagram beside the 3D demo. */
export function TimberLessonOverlay({ t }) {
  if (t >= 67) return null
  return <div className="lesson-card">{t >= 55 ? <Steps t={t} /> : <Diagram t={t} />}</div>
}
