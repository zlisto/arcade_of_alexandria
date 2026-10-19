import { useFrame } from '@react-three/fiber'
import { Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { LiveLine } from './FlatsScenery'
import { allCells, canFill, edgeAt, faceRim, inA, vertAt } from './hep'
import { DevAdvance, FollowCamera } from './OverworldScene'
import ReefGame from './ReefGame'
import { Gear } from '../../world/Dressing'

/**
 * Level 0-B's scene: the Cylinder Works, Emmy's first machine — a sealed stone chamber with
 * an arched window on the moonlit sea and a tall glass cylinder standing on the floor. The
 * floor is X × {0}; height is time. A's given motion rises as teal columns; each column
 * Gyroid fills rises gold. A slice of light sweeps up and down the cylinder, drawing the
 * moving picture X at time t wherever the motion is decided.
 */

const S = 0.7
export const H = 3.4 // the cylinder's height: t = 1
export const CYL_R = 5.9
const TEAL = '#5ad6c8'
const GOLD = '#ffd27a'

export function Chamber() {
  return (
    <>
      <color attach="background" args={['#08070c']} />
      <fog attach="fog" args={['#08070c', 20, 48]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#c8d4ff', '#100c08', 0.45]} />
      <directionalLight position={[-6, 12, -8]} intensity={0.8} color="#d8e2ff" />
      <pointLight position={[0, 5, 0]} intensity={12} distance={20} color="#ffd8a0" />
      <Stars radius={60} depth={20} count={500} factor={2} fade speed={0.2} />
      {/* stone floor and walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#1c1a20" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[9, 9, 8, 48, 1, true, Math.PI * 0.62, Math.PI * 1.76]} />
        <meshStandardMaterial color="#26222a" roughness={0.9} side={THREE.BackSide} flatShading />
      </mesh>
      {/* the arched window on the sea (north) */}
      <group position={[0, 2.6, -8.7]}>
        <mesh>
          <planeGeometry args={[3.4, 4.2]} />
          <meshBasicMaterial color="#13284a" toneMapped={false} />
        </mesh>
        <mesh position={[0.6, 1.0, 0.01]}>
          <circleGeometry args={[0.45, 32]} />
          <meshBasicMaterial color="#f3f0dc" toneMapped={false} />
        </mesh>
        <mesh position={[0, -1.4, 0.01]}>
          <planeGeometry args={[3.4, 1.4]} />
          <meshBasicMaterial color="#0b1a33" toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.1, 0.02]}>
          <torusGeometry args={[1.7, 0.18, 8, 32, Math.PI]} />
          <meshStandardMaterial color="#3a343e" roughness={0.8} />
        </mesh>
      </group>
      <Sparkles count={70} scale={[10, 4, 10]} position={[0, 2, 0]} size={2} speed={0.25} color="#ffe2a0" />
      {/* Emmy's old machinery: gears turning in the walls */}
      {[[-1.9, 2.6, 1.6, 0.2], [-1.25, 4.6, 1.0, -0.32], [1.95, 2.2, 1.3, -0.25], [1.4, 4.4, 0.9, 0.4], [2.45, 3.4, 0.7, 0.5]].map(([a, y, r, sp], i) => (
        <Gear key={i} position={[Math.sin(a) * 8.7, y, Math.cos(a) * 8.7]} rotation={[0, a + Math.PI, 0]} r={r} speed={sp} color="#5a4430" emissive="#3a2008" />
      ))}
      {/* candles round the cylinder (none in the doorway) */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + 0.2
        if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) > 0) return null
        return (
          <group key={i} position={[Math.sin(a) * 6.6, 0, Math.cos(a) * 6.6]}>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.08, 0.09, 0.5, 10]} />
              <meshStandardMaterial color="#e8dcc0" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.58, 0]} scale={[0.05, 0.1, 0.05]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color="#ffc060" toneMapped={false} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/** The door back to the Assembly Hall (south). */
export function Door({ open }) {
  const l = useRef()
  const r = useRef()
  const k = useRef(0)
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.lerp(k.current, open ? 1 : 0, Math.min(1, dt * 1.5))
    l.current.position.x = -0.55 - k.current * 1.0
    r.current.position.x = 0.55 + k.current * 1.0
  })
  return (
    <group position={[0, 0, 8.8]}>
      {[l, r].map((ref, i) => (
        <mesh key={i} ref={ref} position={[i ? 0.55 : -0.55, 1.4, 0]}>
          <boxGeometry args={[1.1, 2.8, 0.2]} />
          <meshStandardMaterial color="#4a3020" metalness={0.5} roughness={0.5} emissive="#2a1004" emissiveIntensity={0.4} />
        </mesh>
      ))}
      <pointLight position={[0, 1.6, -1]} color="#ffb070" intensity={open ? 10 : 2} distance={8} />
    </group>
  )
}

/** A ruled sheet over an edge: points edgeAt(s, t) at height t·H. */
function useEdgeSheet(cx, e) {
  return useMemo(() => {
    const NS = 16
    const NT = 14
    const pos = []
    for (let j = 0; j <= NT; j++)
      for (let i = 0; i <= NS; i++) {
        const t = j / NT
        const [x, z] = edgeAt(cx, e, i / NS, t)
        pos.push(x, t * H, z)
      }
    const idx = []
    for (let j = 0; j < NT; j++)
      for (let i = 0; i < NS; i++) {
        const a = j * (NS + 1) + i
        idx.push(a, a + 1, a + NS + 1, a + 1, a + NS + 2, a + NS + 1)
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [cx, e])
}

/** A face's cap at time t (a fan from its rim's centroid). */
function capGeometry(cx, f, t) {
  const rim = faceRim(cx, f, t)
  const cxm = rim.reduce((s, p) => s + p[0], 0) / rim.length
  const czm = rim.reduce((s, p) => s + p[1], 0) / rim.length
  const pos = [cxm, t * H, czm]
  rim.forEach(([x, z]) => pos.push(x, t * H, z))
  const idx = []
  for (let i = 0; i < rim.length; i++) idx.push(0, 1 + i, 1 + ((i + 1) % rim.length))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export function Column({ cx, id, color, kRef }) {
  const g = useRef()
  useFrame(() => {
    if (g.current) g.current.scale.y = Math.max(0.001, kRef ? kRef.current : 1)
  })
  const k = id[0]
  const i = Number(id.slice(1))
  return (
    <group ref={g}>
      {k === 'v' && <VertColumn cx={cx} v={i} color={color} />}
      {k === 'e' && <EdgeColumn cx={cx} e={i} color={color} />}
      {k === 'f' && <FaceColumn cx={cx} f={i} color={color} />}
    </group>
  )
}
function VertColumn({ cx, v, color }) {
  const pts = useMemo(() => Array.from({ length: 21 }, (_, j) => {
    const t = j / 20
    const [x, z] = vertAt(cx, v, t)
    return [x, t * H, z]
  }), [cx, v])
  return <Line points={pts} color={color} lineWidth={5} toneMapped={false} />
}
function EdgeColumn({ cx, e, color }) {
  const geo = useEdgeSheet(cx, e)
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}
function FaceColumn({ cx, f, color }) {
  const top = useMemo(() => capGeometry(cx, f, 1), [cx, f])
  return (
    <mesh geometry={top}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

/** The floor: X × {0}, each cell colored by its state. */
export function Floor({ cx, filled, refusedRef }) {
  const vRefs = useRef([])
  const eRefs = useRef([])
  const fRefs = useRef([])
  const faces = useMemo(() => cx.faces.map((_, f) => capGeometry(cx, f, 0)), [cx])
  const colorFor = (id, t) => {
    const r = refusedRef.current
    if (r && r.until > performance.now() / 1000 && r.ids.includes(id)) return Math.sin(t * 20) > 0 ? '#ff4a5a' : '#ffa0a8'
    if (inA(cx, id)) return TEAL
    if (filled.includes(id)) return GOLD
    if (canFill(cx, filled, id).ok) return Math.sin(t * 4) > 0 ? '#fff2c4' : '#c8b88a'
    return '#6a6070'
  }
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    vRefs.current.forEach((m, i) => m && m.material.color.set(colorFor('v' + i, t)))
    eRefs.current.forEach((m, i) => m && m.material.color.set(colorFor('e' + i, t)))
    fRefs.current.forEach((m, i) => m && m.material.color.set(colorFor('f' + i, t)))
  })
  return (
    <group position={[0, 0.02, 0]}>
      {faces.map((g, i) => (
        <mesh key={i} ref={(m) => (fRefs.current[i] = m)} geometry={g}>
          <meshBasicMaterial transparent opacity={0.22} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      {cx.edges.map(([u, v], i) => {
        const a = cx.verts[u]
        const b = cx.verts[v]
        const l = Math.hypot(b[0] - a[0], b[1] - a[1])
        return (
          <mesh key={i} ref={(m) => (eRefs.current[i] = m)} position={[(a[0] + b[0]) / 2, 0.04, (a[1] + b[1]) / 2]} rotation={[0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0]}>
            <boxGeometry args={[l, 0.06, 0.16]} />
            <meshBasicMaterial toneMapped={false} />
          </mesh>
        )
      })}
      {cx.verts.map((p, i) => (
        <mesh key={i} ref={(m) => (vRefs.current[i] = m)} position={[p[0], 0.08, p[1]]}>
          <cylinderGeometry args={[0.26, 0.26, 0.1, 20]} />
          <meshBasicMaterial toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** The slice of light: X at time τ, drawn wherever the motion is decided. */
export function Slice({ cx, decided }) {
  const tau = useRef(0)
  const dots = useRef([])
  useFrame(({ clock }) => {
    const u = (clock.elapsedTime * 0.22) % 2
    tau.current = u < 1 ? u : 2 - u
    cx.verts.forEach((_, v) => {
      const m = dots.current[v]
      if (!m) return
      const on = decided.includes('v' + v)
      m.visible = on
      if (on) {
        const [x, z] = vertAt(cx, v, tau.current)
        m.position.set(x, tau.current * H, z)
      }
    })
  })
  return (
    <>
      {cx.verts.map((_, v) => (
        <mesh key={v} ref={(m) => (dots.current[v] = m)}>
          <sphereGeometry args={[0.1, 12, 8]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
      {cx.edges.map((_, e) =>
        decided.includes('e' + e) ? (
          <LiveLine key={e} color="#ffffff" width={4} getPts={() => Array.from({ length: 17 }, (_, i) => [...edgeAt(cx, e, i / 16, tau.current), tau.current * H])} />
        ) : null,
      )}
      {cx.faces.map((_, f) =>
        decided.includes('f' + f) ? <FaceSlice key={f} cx={cx} f={f} tau={tau} /> : null,
      )}
    </>
  )
}
function FaceSlice({ cx, f, tau }) {
  const m = useRef()
  useFrame(() => {
    const g = capGeometry(cx, f, tau.current)
    m.current.geometry.dispose()
    m.current.geometry = g
  })
  return (
    <mesh ref={m}>
      <bufferGeometry />
      <meshBasicMaterial color="#fff2c4" transparent opacity={0.28} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

/** The glass cylinder: X × I's outline. */
export function Glass() {
  return (
    <group>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[CYL_R, CYL_R, H, 64, 1, true]} />
        <meshStandardMaterial color="#9ad8ff" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} metalness={0.2} roughness={0.1} />
      </mesh>
      {[0.01, H].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CYL_R - 0.06, CYL_R + 0.06, 96]} />
          <meshBasicMaterial color="#b8e6ff" transparent opacity={0.6} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export default function CylinderScene({ cx, filled, fillKs, refusedRef, exitOpen, emmyAt, emmyTalking, walkable, game, gameKey, stateRef, frameRef, playEnabled, onAction, onEnemies, onHearts }) {
  const emmyScript = useMemo(
    () => () => {
      const at = emmyAt.current
      return { pos: [at.x / S, 0, at.z / S], rotY: at.rotY, walk: at.walk || 0, gesture: emmyTalking.current ? 0.7 : 0, talk: emmyTalking.current ? 1 : 0, bow: 0 }
    },
    [emmyAt, emmyTalking],
  )
  const given = allCells(cx).filter((id) => inA(cx, id))
  const decided = [...given, ...filled]
  return (
    <>
      <Chamber />
      <Glass />
      <Floor cx={cx} filled={filled} refusedRef={refusedRef} />
      {given.map((id) => (
        <Column key={id} cx={cx} id={id} color={TEAL} />
      ))}
      {filled.map((id) => (
        <Column key={id} cx={cx} id={id} color={GOLD} kRef={fillKs[id]} />
      ))}
      <Slice cx={cx} decided={decided} />
      <Door open={exitOpen} />
      <group scale={S}>
        <Emmy script={emmyScript} />
      </group>
      <ReefGame
        key={gameKey}
        stage={game}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled={false}
        tool="smith"
        sim={null}
        tRef={{ current: 0 }}
        stateRef={stateRef}
        spawnRef={{ current: null }}
        ribbonApi={{ current: null }}
        onAction={onAction}
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
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </>
  )
}
