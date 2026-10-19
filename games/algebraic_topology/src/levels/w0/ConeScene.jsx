import { useFrame } from '@react-three/fiber'
import { Html, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import { EmmyBubble, ForgeDoor } from './FoundryScene'
import { DevAdvance, FollowCamera } from './OverworldScene'
import ReefGame from './ReefGame'
import Seascape from '../../world/Seascape'
import { Clouds } from '../../world/Dressing'
import SpaceModel from './SpaceModel'
import { OPS } from './spaces'

/**
 * Level 0-5's scene: the Cone Zone, a moonlit terrace of operation works on the Foundry
 * cliff above the sea. Each works has a machine (a hopper over a press, its operation on
 * a sign), source pedestals that dispense specimen spaces (a plugged one wears a violet
 * cone), and a two-place output shelf where new spaces are born.
 */

const S = 0.7 // character scale
export const PEDESTAL_TOP = 0.78

// ---------------------------------------------------------------- terrace

function Terrace() {
  return (
    <>
      <color attach="background" args={['#070b16']} />
      <fog attach="fog" args={['#070b16', 24, 64]} />
      <ambientLight intensity={0.36} />
      <hemisphereLight args={['#9ab8ff', '#0a0a14', 0.5]} />
      <directionalLight position={[-12, 20, -14]} intensity={1.0} color="#cfe0ff" />
      <pointLight position={[0, 6, 7]} intensity={14} distance={26} color="#ffc070" />
      <pointLight position={[0, 6, -12]} intensity={14} distance={26} color="#ffc070" />
      <Stars radius={90} depth={40} count={1600} factor={2.6} fade speed={0.3} />
      {/* the moon */}
      <mesh position={[-30, 26, -58]}>
        <sphereGeometry args={[4, 32, 20]} />
        <meshBasicMaterial color="#f3f0dc" toneMapped={false} />
      </mesh>
      <Sparkles count={160} scale={[40, 5, 44]} position={[0, 1.5, -2]} size={2.2} speed={0.4} color="#ffe2a0" />
      {/* the sea far below the cliff, and clouds drifting under the terrace */}
      <Seascape y={-7} area={[0, -4, 110, 100]} bed={false} lanterns={0} palette={{ water: '#123060', deep: '#081428' }} />
      <Clouds y={-4} area={[0, -2, 70, 60]} count={16} color="#b8c8ff" opacity={0.28} seed={5} speed={0.35} />
      {/* the cliff face the terrace is cut into (east and west walls) */}
      {[-19, 19].map((x) => (
        <mesh key={x} position={[x, -3, -3]}>
          <boxGeometry args={[4, 9, 50]} />
          <meshStandardMaterial color="#1c1a22" roughness={0.9} flatShading />
        </mesh>
      ))}
    </>
  )
}

/** A works platform: a basalt drum with a brass rim, on a pillar down to the sea. */
/** A brass lamp post on a platform's rim. */
function Lamp({ at }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 1.8, 8]} />
        <meshStandardMaterial color="#6a5030" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <sphereGeometry args={[0.16, 14, 10]} />
        <meshStandardMaterial color="#ffe0a0" emissive="#ffb050" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  )
}

function WorksPlatform({ site, current }) {
  const rim = useRef()
  useFrame(({ clock }) => {
    rim.current.material.opacity = current ? 0.75 + Math.sin(clock.elapsedTime * 2.4) * 0.25 : 0.55
  })
  const r = site.def.add[0].r
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[r, r * 0.92, 0.6, 48]} />
        <meshStandardMaterial color="#2a2c36" roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, -4, 0]}>
        <cylinderGeometry args={[r * 0.55, r * 0.35, 7, 20]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.9} flatShading />
      </mesh>
      <mesh ref={rim} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[r - 0.12, r, 64]} />
        <meshBasicMaterial color="#d8a84a" transparent toneMapped={false} />
      </mesh>
      {[0.6, 2.2, 3.9, 5.4].map((a) => (
        <Lamp key={a} at={[Math.cos(a) * (r - 0.35), Math.sin(a) * (r - 0.35)]} />
      ))}
    </group>
  )
}

/** A pedestal (source or shelf) with the space it holds on top. */
function Pedestal({ at, spec, plugged, kind = 'source', kRef, via, label, showLabel }) {
  const top = useRef()
  useFrame(({ clock }) => {
    if (top.current) top.current.material.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 2 + at[0]) * 0.2
  })
  const col = kind === 'shelf' ? '#5ad6c8' : '#ffd27a'
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.42, 0.52, 0.72, 8]} />
        <meshStandardMaterial color="#34303a" roughness={0.6} metalness={0.25} flatShading />
      </mesh>
      <mesh ref={top} position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.06, 24]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      {spec && (
        <group position={[0, PEDESTAL_TOP, 0]} scale={0.95}>
          <SpaceModel kind={spec.key} kRef={kRef} via={via} />
        </group>
      )}
      {plugged && (
        // the plug: a violet cone of light over the space
        <mesh position={[0, PEDESTAL_TOP + 0.5, 0]}>
          <coneGeometry args={[0.55, 1.0, 32, 1, true]} />
          <meshBasicMaterial color="#c58bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {showLabel && label && (
        <Html position={[0, -0.05, 0.75]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`space-tag ${kind}${plugged ? ' plugged' : ''}`}>{label}</div>
        </Html>
      )}
    </group>
  )
}

/** The machine: a press with a hopper on top and its operation on a sign; it shakes while it runs. */
function Machine({ at, op, hopper, inputs, runRef, showLabel }) {
  const body = useRef()
  const ring = useRef()
  useFrame(({ clock }, dt) => {
    const k = runRef.current // 1 → 0 while running
    body.current.position.x = k > 0 ? Math.sin(clock.elapsedTime * 60) * 0.03 * k : 0
    ring.current.rotation.z += dt * (0.6 + k * 12)
    ring.current.material.color.set(k > 0 ? '#fff2c4' : '#ffb04a')
  })
  return (
    <group position={[at[0], 0, at[1]]}>
      <group ref={body}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.8, 1.4, 1.3]} />
          <meshStandardMaterial color="#3a3442" metalness={0.5} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.7, 0.66]}>
          <boxGeometry args={[1.3, 0.8, 0.04]} />
          <meshStandardMaterial color="#1a1620" emissive="#ff9a2a" emissiveIntensity={0.25} />
        </mesh>
        {/* the hopper */}
        <mesh position={[0, 1.75, 0]}>
          <cylinderGeometry args={[0.75, 0.3, 0.7, 24, 1, true]} />
          <meshStandardMaterial color="#b88a3a" metalness={0.85} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={ring} position={[0, 0.7, 0.7]}>
          <torusGeometry args={[0.3, 0.04, 8, 6]} />
          <meshBasicMaterial color="#ffb04a" toneMapped={false} />
        </mesh>
        {/* what's waiting in the hopper (two-input operations) */}
        {inputs > 1 &&
          [0, 1].map((i) => (
            <group key={i} position={[i ? 0.38 : -0.38, 2.25, 0]} scale={0.45}>
              {hopper[i] ? (
                <SpaceModel kind={hopper[i].key} />
              ) : (
                <mesh position={[0, 0.3, 0]}>
                  <torusGeometry args={[0.3, 0.03, 6, 24]} />
                  <meshBasicMaterial color="#6a5a48" toneMapped={false} />
                </mesh>
              )}
            </group>
          ))}
      </group>
      {showLabel && (
        <Html position={[0, 3.2, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className="machine-sign">
            {OPS[op].label}
            {inputs > 1 && <small> · {hopper.filter(Boolean).length}/2 in</small>}
          </div>
        </Html>
      )}
    </group>
  )
}

/** The space Gyroid is carrying, bobbing over his head. */
function Carried({ stateRef, spec }) {
  const g = useRef()
  useFrame(({ clock }) => {
    const s = stateRef.current
    if (!s || !g.current) return
    g.current.position.set(s.x, 1.45 + Math.sin(clock.elapsedTime * 3) * 0.06, s.z)
  })
  if (!spec) return null
  return (
    <group ref={g} scale={0.55}>
      <SpaceModel kind={spec.key} />
      {spec.plugged && (
        <mesh position={[0, 0.5, 0]}>
          <coneGeometry args={[0.55, 1.0, 24, 1, true]} />
          <meshBasicMaterial color="#c58bff" transparent opacity={0.4} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

export default function ConeScene({
  layout,
  sites,
  works, // { [id]: { sources: [{spec, plugged}], shelf: [spec|null, spec|null], hopper: [], op } }
  shelfK, // { [id]: [kRef, kRef] }
  runRefs,
  current,
  carried,
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
      <Terrace />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {exitOpen && <CausewaySlab a={layout.exit.a} b={layout.exit.b} width={layout.causewayWidth} />}
      {sites
        .filter((s) => s.kind === 'start')
        .map((s) => (
          <mesh key={s.id} position={[s.pos[0], -0.32, s.pos[1]]}>
            <cylinderGeometry args={[s.def.add[0].r, s.def.add[0].r * 0.9, 0.6, 32]} />
            <meshStandardMaterial color="#2a2c36" roughness={0.6} />
          </mesh>
        ))}
      {stations.map((s) => {
        const w = works[s.id]
        const here = s.id === current
        const W = (p) => [p[0] + s.pos[0], p[1] + s.pos[1]]
        return (
          <group key={s.id}>
            <WorksPlatform site={s} current={here} />
            <Machine at={W(s.machine)} op={w.op} hopper={w.hopper} inputs={OPS[w.op].inputs} runRef={runRefs[s.id]} showLabel={here} />
            {s.sources.map((src, i) => (
              <Pedestal key={i} at={W(src.at)} spec={w.sources[i].spec} plugged={w.sources[i].plugged} label={w.sources[i].spec.name} showLabel={here} />
            ))}
            {s.shelf.map((at, i) => (
              <Pedestal key={'s' + i} at={W(at)} kind="shelf" spec={w.shelf[i]} plugged={!!w.shelf[i]?.plugged} kRef={shelfK[s.id][i]} via={w.shelf[i]?.via} label={w.shelf[i]?.name} showLabel={here && !!w.shelf[i]} />
            ))}
          </group>
        )
      })}
      <Carried stateRef={stateRef} spec={carried} />
      <ForgeDoor exit={layout.exit} open={exitOpen} />
      <group scale={S}>
        <Emmy script={emmyScript} />
      </group>
      <EmmyBubble emmyAt={emmyAt} show={emmyNear} />

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
        ribbonApi={ribbonApi}
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
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.65} />
      </EffectComposer>
    </>
  )
}
