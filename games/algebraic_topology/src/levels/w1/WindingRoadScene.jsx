import { useFrame } from '@react-three/fiber'
import { Html, Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Emmy from '../../characters/Emmy'
import { CausewaySlab } from '../../world/ReefScenery'
import Seascape from '../../world/Seascape'
import { Clouds } from '../../world/Dressing'
import { DevAdvance, FollowCamera } from '../w0/OverworldScene'
import ReefGame from '../w0/ReefGame'
import { helixHeight, homotopyLoop } from './winding'

const S = 0.7

function RingDeck({ site, current, ring }) {
  const rim = useRef()
  useFrame(({ clock }) => {
    if (rim.current) rim.current.material.emissiveIntensity = current ? 0.9 + Math.sin(clock.elapsedTime * 2.2) * 0.35 : 0.55
  })
  return (
    <group position={[site.pos[0], 0, site.pos[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.5, 48]} />
        <meshStandardMaterial color="#1a1824" roughness={0.88} />
      </mesh>
      <mesh ref={rim} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[ring.inner, ring.outer + 0.08, 64]} />
        <meshStandardMaterial color="#c98a2a" emissive="#ffb347" emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      <mesh position={[ring.cx, 0.12, ring.cz]}>
        <cylinderGeometry args={[0.35, 0.45, 0.24, 16]} />
        <meshStandardMaterial color="#2a3544" emissive="#506080" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

function HelixTower({ site, ring, bank, pitch, homotopyT, showShadow }) {
  const group = useRef()
  const shadow = useRef()
  const steps = 24
  const pts = useMemo(() => {
    const out = []
    for (let i = 0; i <= steps * 3; i++) {
      const u = (i / (steps * 3)) * Math.PI * 2
      const h = (i / steps) * pitch
      out.push(new THREE.Vector3(site.pos[0] + 1.15 * Math.cos(u), h + 0.5, site.pos[1] + 1.15 * Math.sin(u)))
    }
    return out
  }, [site.pos, pitch, steps])
  useFrame(() => {
    const h = helixHeight(bank, pitch)
    if (shadow.current) shadow.current.position.y = 0.5 + h
  })
  return (
    <group ref={group} position={[site.pos[0], 0, site.pos[1]]}>
      <mesh>
        <tubeGeometry args={[new THREE.CatmullRomCurve3(pts), 120, 0.22, 10, false]} />
        <meshStandardMaterial color="#2a2838" emissive="#8060d0" emissiveIntensity={0.15} roughness={0.85} />
      </mesh>
      {Array.from({ length: 7 }, (_, f) => (
        <mesh key={f} position={[ring.cx + 1.35, 0.35 + f * pitch, ring.cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.55, 0.72, 24]} />
          <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={f === Math.abs(bank) % 7 ? 1.4 : 0.35} toneMapped={false} />
        </mesh>
      ))}
      {showShadow && (
        <group ref={shadow} position={[ring.cx, 0.5, ring.cz]}>
          <mesh scale={S}>
            <capsuleGeometry args={[0.22, 0.5, 6, 12]} />
            <meshStandardMaterial color="#3ecfc4" emissive="#5ee0d8" emissiveIntensity={0.8} transparent opacity={0.55} toneMapped={false} />
          </mesh>
        </group>
      )}
      {homotopyT != null &&
        homotopyLoop([site.pos[0], site.pos[1]], ring.r, homotopyT).map((p, i, arr) =>
          i < arr.length - 1 ? (
            <mesh key={i} position={[(p[0] + arr[i + 1][0]) / 2, 0.18, (p[1] + arr[i + 1][1]) / 2]} rotation={[0, Math.atan2(arr[i + 1][1] - p[1], arr[i + 1][0] - p[0]), 0]}>
              <boxGeometry args={[Math.hypot(arr[i + 1][0] - p[0], arr[i + 1][1] - p[1]), 0.06, 0.06]} />
              <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          ) : null,
        )}
    </group>
  )
}

function WinderPillar({ x, z, winding, unwound }) {
  const coil = useRef()
  useFrame(({ clock }) => {
    if (coil.current) coil.current.rotation.y = clock.elapsedTime * (winding > 0 ? 0.6 : -0.6)
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.35, 0.42, 2.2, 10]} />
        <meshStandardMaterial color="#1c1a22" roughness={0.9} />
      </mesh>
      {!unwound && (
        <group ref={coil} position={[0, 1.2, 0]}>
          {Array.from({ length: Math.abs(winding) }, (_, i) => (
            <mesh key={i} rotation={[0, (i / Math.abs(winding)) * Math.PI * 2, 0]} position={[0.55 * Math.cos(i), 0.15 * i, 0.55 * Math.sin(i)]}>
              <torusGeometry args={[0.38, 0.06, 8, 24]} />
              <meshStandardMaterial color="#6040a0" emissive="#9060ff" emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

function WindingGate({ x, z, n, open, bank }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.4, 0]}>
        <torusGeometry args={[0.9, 0.08, 8, 32]} />
        <meshStandardMaterial color={open ? '#ffcf6a' : '#6040a0'} emissive={open ? '#ffb347' : '#8060d0'} emissiveIntensity={open ? 1.6 : 0.6} toneMapped={false} />
      </mesh>
      <Html center position={[0, 2.6, 0]} style={{ pointerEvents: 'none', opacity: 0.9 }}>
        <span className="w13-gate-mark" style={{ color: '#ffe6a8', fontFamily: 'monospace', fontSize: 14 }}>
          {n > 0 ? '+' : ''}
          {n}
        </span>
      </Html>
      {!open && Math.abs(bank) !== Math.abs(n) && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.15, 32]} />
          <meshStandardMaterial color="#8060d0" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  )
}

export default function WindingRoadScene({
  layout,
  sites,
  walkable,
  current,
  done,
  exitOpen,
  bank,
  homotopyT,
  winders,
  gatesOpen,
  frameRef,
  gameKey,
  stage,
  tool,
  tRef,
  sim,
  stateRef,
  spawnRef,
  onTrackMove,
  onEnemies,
  onHearts,
  emmyScript,
  playEnabled,
}) {
  const pitch = layout.helixPitch || 2.35
  return (
    <>
      <color attach="background" args={['#060912']} />
      <fog attach="fog" args={['#060912', 28, 72]} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#9ab8ff', '#0a0a14', 0.48]} />
      <directionalLight position={[-10, 22, -8]} intensity={1.05} color="#cfe0ff" />
      <Stars radius={80} depth={36} count={1400} factor={2.4} fade speed={0.25} />
      <Sparkles count={120} scale={[50, 8, 50]} position={[0, 4, 6]} size={2} speed={0.35} color="#ffe2a0" />
      <Seascape y={-6} area={[0, 2, 120, 90]} bed lanterns={6} palette={{ water: '#0e2848', deep: '#060912' }} />
      <Clouds y={-2} area={[0, 0, 80, 70]} count={14} color="#8898cc" opacity={0.22} seed={13} speed={0.28} />

      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}

      {sites
        .filter((s) => s.stage === 'station')
        .map((site) => (
          <group key={site.id}>
            <RingDeck site={site} current={current === site.id} ring={site.ring} />
            <HelixTower site={site} ring={site.ring} bank={site.id === current ? bank : 0} pitch={pitch} homotopyT={site.id === current ? homotopyT : null} showShadow={current === site.id} />
            {(site.winders || []).map(([w, dx, dz], i) => {
              const st = winders?.find((x) => x.id === `${site.id}-${i}`)
              return <WinderPillar key={i} x={site.pos[0] + dx} z={site.pos[1] + dz} winding={w} unwound={st?.unwound} />
            })}
            {site.gates?.map((n, i) => (
              <WindingGate key={i} x={site.pos[0] + 2.2 * Math.cos((i / 3) * Math.PI * 2 - Math.PI / 2)} z={site.pos[1] + 2.2 * Math.sin((i / 3) * Math.PI * 2 - Math.PI / 2)} n={n} open={gatesOpen?.[n]} bank={bank} />
            ))}
            {site.emmy && (
              <Emmy scale={S} script={emmyScript(site)} />
            )}
          </group>
        ))}

      {exitOpen && layout.exit && (
        <mesh position={[layout.exit.gate[0], 0.3, layout.exit.gate[1]]}>
          <torusGeometry args={[1.2, 0.12, 8, 32]} />
          <meshStandardMaterial color="#ffcf6a" emissive="#ffb347" emissiveIntensity={1.8} toneMapped={false} />
        </mesh>
      )}

      <FollowCamera stateRef={stateRef} frameRef={frameRef} />
      <DevAdvance />
      <ReefGame
        key={gameKey}
        stage={stage}
        shape={walkable}
        playEnabled={playEnabled}
        spoolEnabled={false}
        tool={tool}
        sim={sim}
        tRef={tRef}
        stateRef={stateRef}
        spawnRef={spawnRef}
        onTrackMove={onTrackMove}
        onEnemies={onEnemies}
        onHearts={onHearts}
      />
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.85} intensity={0.85} />
        <Vignette eskil offset={0.22} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
