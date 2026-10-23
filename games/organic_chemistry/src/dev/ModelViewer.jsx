import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import KaiModel from '../actors/KaiModel'

// Dev-only turntable for character models: open the game with ?viewer. Lighting presets match the
// village (day) and the caverns (cave); buttons drive the pose so animation can be checked too.

function Driver({ kai, anim, stance, sockets }) {
  const t = useRef(0)
  useFrame((_, dt) => {
    const p = kai.current
    if (!p) return
    t.current += dt
    p.stance = stance
    p.sockets = sockets ? ['H', 'H', 'C', 'O'] : []
    p.run = anim === 'run' ? 1 : 0
    p.phase = anim === 'run' ? t.current * 10 : 0
    p.swing = anim === 'slash' ? Math.sin(t.current * 4) : 0
    p.swingSide = 1
    p.block = anim === 'block' ? 1 : 0
    p.charge = anim === 'charge' ? 1 : 0
    p.spin = 0; p.roll = 0; p.hurt = 0
  })
  return null
}

const VIEWS = { full: [[0, 1.25, 3.3], [0, 1.0, 0]], face: [[0.25, 1.82, 0.75], [0, 1.77, 0]], back: [[0, 1.6, -2.6], [0, 1.0, 0]], side: [[2.8, 1.3, 0.4], [0, 1.0, 0]] }
function Cam({ view }) {
  const { camera, controls } = useThree()
  useEffect(() => { const [p, t] = VIEWS[view]; camera.position.set(...p); if (controls) { controls.target.set(...t); controls.update() } }, [view, controls])
  return null
}

export default function ModelViewer() {
  const kai = useRef()
  const [light, setLight] = useState('cave')
  const [anim, setAnim] = useState('idle')
  const [stance, setStance] = useState('sp3')
  const [sockets, setSockets] = useState(false)
  const [view, setView] = useState('full')
  useEffect(() => { window.__viewer = { setLight, setAnim, setStance, setSockets, setView } }, [])
  const cave = light === 'cave'
  const btn = (on, label, f) => <button key={label} onClick={f} style={{ background: on ? '#43e6f5' : '#222', color: on ? '#000' : '#ddd', border: '1px solid #444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>{label}</button>
  return (
    <div style={{ position: 'fixed', inset: 0, background: cave ? '#0b0a12' : '#87a9c9' }}>
      <Canvas shadows camera={{ position: [0, 1.25, 3.3], fov: 40 }}>
        <color attach="background" args={[cave ? '#0b0a12' : '#87a9c9']} />
        {cave ? (<>
          <ambientLight intensity={0.5} color="#8a9ad0" />
          <hemisphereLight args={['#6a7ab0', '#2a2232', 0.75]} />
          <directionalLight position={[6, 20, 4]} intensity={0.6} color="#9fb8ff" />
          <pointLight position={[1.5, 2, 1.5]} color="#43e6f5" intensity={4} distance={8} />
        </>) : (<>
          <hemisphereLight args={['#dff0ff', '#6a8a4a', 0.9]} />
          <directionalLight position={[8, 14, 6]} intensity={1.6} castShadow />
        </>)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[3, 48]} /><meshStandardMaterial color={cave ? '#3d3a4a' : '#6f9a55'} /></mesh>
        <KaiModel ref={kai} />
        <Driver kai={kai} anim={anim} stance={stance} sockets={sockets} />
        <OrbitControls makeDefault target={[0, 1.0, 0]} />
        <Cam view={view} />
      </Canvas>
      <div style={{ position: 'fixed', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap', font: '13px Inter, sans-serif' }}>
        {btn(cave, 'cave', () => setLight('cave'))}{btn(!cave, 'day', () => setLight('day'))}
        {['idle', 'run', 'slash', 'block', 'charge'].map((a) => btn(anim === a, a, () => setAnim(a)))}
        {['sp3', 'sp2', 'sp'].map((s) => btn(stance === s, s, () => setStance(s)))}
        {btn(sockets, 'atoms', () => setSockets(!sockets))}
        {Object.keys(VIEWS).map((v) => btn(view === v, 'cam:' + v, () => setView(v)))}
      </div>
    </div>
  )
}
