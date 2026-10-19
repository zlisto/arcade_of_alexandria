import { useFrame, useThree } from '@react-three/fiber'
import { Line, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import ReefGame from './ReefGame'
import { LAND } from '../../theme/palette'
import { slidePosition } from './retraction'

const TILE_H = 0.22
const C_TILE = new THREE.Color(LAND.stone)
const C_FALL = new THREE.Color('#7a3cff')
const C_TEAR = new THREE.Color('#ff4d5e')
const C_DONE = new THREE.Color(LAND.stoneLit)
const C_SAVED = new THREE.Color(LAND.stoneLit).lerp(new THREE.Color('#ffd27a'), 0.18) // a reef restored along its spine

// ---------------------------------------------------------------- Null's forgeries (strip, spine z = 0)

const HALF_W = 0.85
const clampX = (x) => Math.max(-3.2, Math.min(3.2, x))

/** Each forgery breaks exactly one rule of a deformation retraction. */
export function forgeryPosition(id, x, z, t, out) {
  let tx = clampX(x)
  let tz = 0
  let sx = x
  let sz = z
  let k = t
  if (id === 'jump-start') {
    sx = x - Math.sign(x) * 0.55 * (Math.abs(z) / HALF_W) // f₀ is a shear, not the identity (spine still fixed)
  } else if (id === 'half-way') {
    k = 0.55 * t // never reaches the spine
  } else if (id === 'torn' && z < 0) {
    tx = clampX(-x) // lower half sent to the mirror-image point: tears along the spine
  }
  out[0] = sx + (tx - sx) * k
  out[2] = sz + (tz - sz) * k
  out[1] = 0
  if (id === 'wobbly-spine') out[2] += wobble(x, z, t)
  return out
}

const wobble = (x, z, t) => 0.32 * Math.sin(Math.PI * t) * Math.sin(x * 1.6 + t * 9) * (1 - Math.abs(z) / HALF_W)

// ---------------------------------------------------------------- pieces

export function Tiles({ samples, simRef, tRef, forgery, tornSet, saved = false }) {
  const mesh = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const p = useMemo(() => [0, 0, 0], [])
  const color = useMemo(() => new THREE.Color(), [])
  const last = useRef({ t: -1, sim: null })

  useEffect(() => {
    last.current.t = -1
  }, [samples, forgery, saved])

  useFrame(() => {
    const t = tRef.current
    const sim = simRef.current
    if (t === last.current.t && sim === last.current.sim) return
    last.current = { t, sim }
    const s = 1 - 0.62 * Math.min(1, t)
    for (let i = 0; i < samples.count; i++) {
      let fallen = false
      if (forgery) forgeryPosition(forgery, samples.x[i], samples.z[i], t, p)
      else if (sim) {
        slidePosition(samples, sim, i, t, p)
        fallen = t > sim.exitT[i]
      } else {
        p[0] = samples.x[i]
        p[1] = 0
        p[2] = samples.z[i]
      }
      dummy.position.set(p[0], p[1] - TILE_H / 2, p[2])
      const sc = fallen ? 1 : s
      dummy.scale.set(sc, 1, sc)
      dummy.rotation.set(fallen ? (t - sim.exitT[i]) * 4 : 0, 0, fallen ? (t - sim.exitT[i]) * 3 : 0)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      if (fallen) color.copy(C_FALL)
      else if (tornSet && tornSet.has(i) && t > 0.03) color.copy(C_TILE).lerp(C_TEAR, Math.min(1, t * 3))
      else if (sim?.bad?.[i] && t > 0.03) color.copy(C_TILE).lerp(C_TEAR, Math.min(0.45, t)) // the region that can't collapse
      else if (saved) color.copy(C_SAVED)
      else color.copy(C_TILE).lerp(C_DONE, sim?.valid ? t : 0)
      mesh.current.setColorAt(i, color)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  })

  const size = samples.h * 0.9
  return (
    <instancedMesh ref={mesh} args={[null, null, samples.count]} key={samples.count}>
      <boxGeometry args={[size, TILE_H, size]} />
      <meshStandardMaterial roughness={0.45} metalness={0.15} emissive={LAND.stoneEmissive} emissiveIntensity={0.5} />
    </instancedMesh>
  )
}

/** Dim copy of the reef where it started — the footprint that f₀ must match. */
export function Footprint({ samples }) {
  const mesh = useRef()
  useEffect(() => {
    const d = new THREE.Object3D()
    for (let i = 0; i < samples.count; i++) {
      d.position.set(samples.x[i], -0.42, samples.z[i])
      d.updateMatrix()
      mesh.current.setMatrixAt(i, d.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [samples])
  return (
    <instancedMesh ref={mesh} args={[null, null, samples.count]} key={samples.count}>
      <boxGeometry args={[samples.h, 0.04, samples.h]} />
      <meshBasicMaterial color={LAND.footprint} transparent opacity={0.6} />
    </instancedMesh>
  )
}

export function Trails({ samples, sim, tRef }) {
  const ref = useRef()
  const geo = useMemo(() => {
    if (!sim) return null
    const pts = []
    const { off, len, x, z } = sim.path // each sampled point's path to the spine
    for (let i = 0; i < samples.count; i += 3) {
      for (let k = off[i]; k < off[i] + len[i] - 1; k++) pts.push(x[k], 0.02, z[k], x[k + 1], 0.02, z[k + 1])
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [samples, sim])
  useFrame(() => {
    if (ref.current) ref.current.material.opacity = 0.35 * (1 - tRef.current)
  })
  if (!geo) return null
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#ffd27a" transparent opacity={0.35} toneMapped={false} />
    </lineSegments>
  )
}

/** Red seams between neighbors that tear apart. */
export function TearLines({ samples, simRef, tRef, forgery, pairs }) {
  const ref = useRef()
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(2, pairs.length) * 3), 3))
    return g
  }, [pairs])
  const a = useMemo(() => [0, 0, 0], [])
  const b = useMemo(() => [0, 0, 0], [])
  useFrame(() => {
    const t = tRef.current
    const sim = simRef.current
    const pos = geo.attributes.position
    ref.current.visible = pairs.length > 0 && t > 0.03
    for (let k = 0; k < pairs.length; k += 2) {
      const i = pairs[k]
      const j = pairs[k + 1]
      if (forgery) {
        forgeryPosition(forgery, samples.x[i], samples.z[i], t, a)
        forgeryPosition(forgery, samples.x[j], samples.z[j], t, b)
      } else if (sim) {
        slidePosition(samples, sim, i, t, a)
        slidePosition(samples, sim, j, t, b)
      }
      pos.setXYZ(k, a[0], 0.08, a[2])
      pos.setXYZ(k + 1, b[0], 0.08, b[2])
    }
    pos.needsUpdate = true
  })
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#ff4d5e" toneMapped={false} />
    </lineSegments>
  )
}

export function Spine({ strokes, forgery, tRef, glow }) {
  const group = useRef()
  const wobbly = forgery === 'wobbly-spine'
  const lines = useRef([])
  useFrame(() => {
    if (!wobbly) return
    const t = tRef.current
    lines.current.forEach((line, si) => {
      if (!line) return
      const src = strokes[si]
      const arr = []
      for (const [x, z] of src) arr.push(x, 0.06, z + wobble(x, 0, t))
      line.geometry.setPositions(arr)
    })
  })
  const dense = useMemo(
    () =>
      strokes.map((s) => {
        if (!wobbly || s.length > 2) return s
        const [[x0, z0], [x1, z1]] = s
        return Array.from({ length: 61 }, (_, k) => [x0 + ((x1 - x0) * k) / 60, z0 + ((z1 - z0) * k) / 60])
      }),
    [strokes, wobbly],
  )
  return (
    <group ref={group}>
      {dense.map((s, i) =>
        s.length > 1 ? (
          <Line
            key={i}
            ref={(el) => (lines.current[i] = el)}
            points={s.map(([x, z]) => [x, 0.06, z])}
            color={glow ? '#ffd27a' : '#ffb347'}
            lineWidth={glow ? 5 : 4}
            toneMapped={false}
          />
        ) : (
          <mesh key={i} position={[s[0][0], 0.08, s[0][1]]}>
            <sphereGeometry args={[0.07, 12, 8]} />
            <meshBasicMaterial color="#ffb347" toneMapped={false} />
          </mesh>
        ),
      )}
    </group>
  )
}

export function Beacon({ position, state }) {
  const gem = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    gem.current.rotation.y = t * 1.5
    gem.current.position.y = 0.32 + Math.sin(t * 2 + position[0]) * 0.03
    const m = gem.current.material
    if (state === 'missed') m.emissive.set('#ff4d5e'), (m.emissiveIntensity = 1.5 + Math.sin(t * 8))
    else m.emissive.set('#ffb347'), (m.emissiveIntensity = state === 'hit' ? 3 : 1.6)
  })
  return (
    <group position={[position[0], 0, position[1]]}>
      {/* ground ring: the spot the spine must pass through */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.2, 0.3, 32]} />
        <meshBasicMaterial color={state === 'missed' ? '#ff4d5e' : '#ffd27a'} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.2, 8]} />
        <meshStandardMaterial color="#6b4a1e" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh ref={gem}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Dev only: lets tests step frames by hand when the browser isn't animating. */
function DevAdvance() {
  const { advance } = useThree()
  useEffect(() => {
    if (import.meta.env.DEV) window.__advance = advance
  }, [advance])
  return null
}

function CameraRig({ camera: cfg }) {
  const { camera, size } = useThree()
  useEffect(() => {
    // each stage cuts to its own framing; on tall narrow screens back off and re-center
    const aspect = size.width / size.height
    const narrow = aspect < 1.1
    const k = narrow ? Math.min(2.3, 1.15 / aspect) : 1
    const target = narrow ? [0, cfg.target[1], cfg.target[2] + 2.2] : cfg.target // lift the reef above the rules panel
    camera.position.set(target[0] + (cfg.pos[0] - cfg.target[0]) * (narrow ? 0 : 1), target[1] + (cfg.pos[1] - cfg.target[1]) * k, target[2] + (cfg.pos[2] - cfg.target[2]) * k)
    camera.lookAt(...target)
  }, [camera, cfg, size.width, size.height])
  return null
}

// ---------------------------------------------------------------- board

export default function ReefBoard({ stage, samples, shape, strokes, liveStroke, sim, tRef, forgery, gameKey, playEnabled, spoolEnabled, tool, onStrokeStart, onStrokeMove, onStrokeEnd, onEnemies, onHearts, onSpooling }) {
  const simRef = useRef(sim)
  simRef.current = sim
  const tornPairs = useMemo(() => {
    if (forgery === 'torn') {
      const out = []
      for (let k = 0; k < samples.pairs.length; k += 2) {
        const i = samples.pairs[k]
        const j = samples.pairs[k + 1]
        if (samples.z[i] < 0 !== samples.z[j] < 0 && Math.abs(samples.x[i]) > 0.4) out.push(i, j)
      }
      return out
    }
    return sim ? Array.from(sim.tears) : []
  }, [sim, forgery, samples])
  const tornSet = useMemo(() => new Set(tornPairs), [tornPairs])

  const beaconState = (i) => (!sim ? 'idle' : sim.beaconHit[i] ? 'hit' : 'missed')
  const allStrokes = liveStroke && liveStroke.length ? [...strokes, liveStroke] : strokes

  return (
    <>
      <color attach="background" args={['#060a14']} />
      <fog attach="fog" args={['#060a14', 14, 40]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#5b8fb8', '#0a0a14', 0.55]} />
      <directionalLight position={[4, 10, 6]} intensity={1.2} color="#d8eef8" />
      <pointLight position={[0, 3, 0]} intensity={4} distance={10} color={LAND.light} />
      <Stars radius={60} depth={30} count={1500} factor={3} fade speed={0.3} />
      <Sparkles count={70} scale={[16, 3, 12]} position={[0, 0.8, 0]} size={2} speed={0.25} color="#7fe8dc" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#04161a" emissive="#06343a" emissiveIntensity={0.45} roughness={0.25} metalness={0.6} />
      </mesh>

      <Footprint samples={samples} />
      <Tiles samples={samples} simRef={simRef} tRef={tRef} forgery={forgery} tornSet={tornSet} />
      {stage.showTrails && <Trails samples={samples} sim={sim} tRef={tRef} />}
      <TearLines samples={samples} simRef={simRef} tRef={tRef} forgery={forgery} pairs={tornPairs} />
      <Spine strokes={allStrokes} forgery={forgery} tRef={tRef} glow={sim?.valid} />
      {stage.beacons.map((p, i) => (
        <Beacon key={i} position={p} state={beaconState(i)} />
      ))}
      <ReefGame
        key={gameKey}
        stage={stage}
        shape={shape}
        playEnabled={playEnabled}
        spoolEnabled={spoolEnabled}
        tool={tool}
        sim={sim}
        tRef={tRef}
        onStrokeStart={onStrokeStart}
        onStrokeMove={onStrokeMove}
        onStrokeEnd={onStrokeEnd}
        onEnemies={onEnemies}
        onHearts={onHearts}
        onSpooling={onSpooling}
      />

      <CameraRig camera={stage.camera} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.65} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}
