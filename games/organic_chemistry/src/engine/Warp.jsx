import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getState, setState, saveGame, openPanel } from './store'
import { setInputEnabled } from './input'
import { softDot } from './materials'
import { sfx } from '../audio/sfx'

// The shard warp, Zelda-style. warpOut(): Kai glows, rises, and shoots up as a beam of light; the screen
// flashes white. The caller then changes scene. In the new scene <WarpFx> (mounted by GameScene) sees
// `warpIn` in the store and plays the arrival: a beam comes down outside the dungeon's entrance, Kai
// fades in from the light, and the world's "Bond Shard N" card opens.

const OUT_T = 3.6
const IN_T = 2.4
const setFlash = (v) => { if (Math.abs((getState().flash || 0) - v) > 0.004 || (v === 0) !== (getState().flash === 0)) setState({ flash: v }) }
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/** Play the warp-out. `checkpoint` is where Kai arrives; `card` is the world number for the summary card. */
export function warpOut(world, { checkpoint, card }) {
  return new Promise((resolve) => {
    saveGame({ checkpoint })
    setState({ cutscene: true, prompt: null, lockTarget: null, bossHp: null })
    world.warp = { mode: 'out', t: 0, done: () => { setState({ warpIn: { card }, cutscene: false }); resolve() } }
  })
}

// the beam: a soft-edged band, brightest down its middle, fading out towards the top
function columnTexture() {
  const W = 64, H = 128
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')
  const img = g.createImageData(W, H)
  for (let y = 0; y < H; y++) {
    const up = y / (H - 1) // 0 at the top of the canvas
    const vert = Math.min(1, (1 - up) * 0 + Math.pow(up, 0.6)) // fades towards the top
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1)) * 2 - 1
      const a = Math.exp(-u * u * 5) * vert
      const k = (y * W + x) * 4
      img.data[k] = 255; img.data[k + 1] = 255; img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255)
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const MOTES = 36

export function WarpFx({ world }) {
  const camera = useThree((s) => s.camera)
  const root = useRef(), column = useRef(), core = useRef(), light = useRef(), rings = useRef([]), motes = useRef([])
  const glowMats = useRef(null) // Kai's materials and their own emissive, restored afterwards
  const camFrom = useRef(new THREE.Vector3())
  const camAng = useRef(0)
  const mats = useMemo(() => {
    const add = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    const col = add('#bff6ff', 0)
    col.map = columnTexture()
    return { column: col, ring: add('#e8fcff', 0), dot: new THREE.SpriteMaterial({ map: softDot(), color: '#e8fcff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), mote: new THREE.SpriteMaterial({ map: softDot(), color: '#9ff8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }) }
  }, [])
  const seeds = useMemo(() => [...Array(MOTES)].map((_, i) => ({ a: (i / MOTES) * Math.PI * 2 * 3, r: 0.5 + ((i * 37) % 10) / 14, v: 0.8 + ((i * 53) % 10) / 8, o: ((i * 29) % 100) / 100 })), [])

  const kaiGroup = () => (world.player && world.player.group) || null
  const setGlow = (g) => {
    const grp = kaiGroup()
    if (!grp) return
    if (!glowMats.current) {
      const list = new Map()
      grp.traverse((o) => {
        if (!o.isMesh) return
        ;[].concat(o.material).forEach((m) => { if (m && m.emissive && !list.has(m)) list.set(m, { e: m.emissive.clone(), i: m.emissiveIntensity }) })
      })
      if (!list.size) return // Kai's model hasn't loaded yet: try again next frame
      glowMats.current = list
    }
    const white = new THREE.Color('#c8f8ff')
    glowMats.current.forEach((o, m) => { m.emissive.copy(o.e).lerp(white, g * (0.45 + 0.55 * g)); m.emissiveIntensity = o.i + g * g * 1.4 })
  }
  const restoreGlow = () => {
    if (glowMats.current) glowMats.current.forEach((o, m) => { m.emissive.copy(o.e); m.emissiveIntensity = o.i })
    glowMats.current = null
  }
  const setKai = (lift, stretch) => { world.kaiLift = lift; world.kaiStretch = stretch }

  // arriving: start the warp-in as soon as the scene (and Kai) exist
  useEffect(() => {
    const w = getState().warpIn
    if (!w) return
    setInputEnabled(false)
    world.warp = { mode: 'in', t: 0, card: w.card }
    // face Kai from the front, the dungeon entrance behind him (and never boxed in by a wall at his back)
    if (world.player && world.cam) { world.cam.yaw = world.player.facing + 0.35; world.cam.pitch = 0.28 }
    setKai(6, 3)
    return () => { restoreGlow(); setKai(0, 1) }
  }, [world])
  useEffect(() => () => { restoreGlow(); setKai(0, 1); if (world.warp && world.warp.mode === 'out') setState({ cutscene: false }) }, [world])

  useFrame((_, rawDt) => {
    const w = world.warp, p = world.player
    if (!root.current) return
    if (!w || !p) { root.current.visible = false; return }
    root.current.visible = true
    const dt = Math.min(rawDt, 1 / 30)
    w.t += dt
    const t = w.t
    root.current.position.set(p.pos.x, p.pos.y, p.pos.z)

    let colA, glow, lift, stretch, ringA, moteA, coreA
    if (w.mode === 'out') {
      if (t === dt) { sfx('shard'); camFrom.current.copy(camera.position); camAng.current = Math.atan2(camera.position.x - p.pos.x, camera.position.z - p.pos.z); w.r0 = Math.hypot(camera.position.x - p.pos.x, camera.position.z - p.pos.z) }
      if (!w.zoom && t > 2.55) { w.zoom = true; sfx('warp') }
      glow = ss(0.2, 2.0, t) * 0.55 + ss(2.4, 2.8, t) * 0.45 // a readable glow, then white as he launches
      lift = t < 2.6 ? ss(0.6, 2.4, t) * 1.0 : 1.0 + (t - 2.6) * (t - 2.6) * 34
      stretch = t < 2.6 ? 1 : 1 + (t - 2.6) * 5
      colA = ss(0, 0.9, t) * 0.45 + ss(2.3, 2.8, t) * 0.55
      ringA = ss(0.3, 1.0, t) * (1 - ss(2.6, 3.0, t))
      moteA = ss(0.2, 0.9, t)
      coreA = ss(1.6, 2.6, t) * 0.8
      setFlash(ss(2.7, 3.4, t))
      // the camera eases from where it was into a slow low orbit, looking up as Kai rises
      const front = p.facing + 0.5
      const da = Math.atan2(Math.sin(front - camAng.current), Math.cos(front - camAng.current)) // the short way round
      const k = ss(0, 1.3, t)
      const ang = camAng.current + da * k + Math.min(t, 2.4) * 0.3
      const r = (w.r0 || 6) * (1 - k) + (7.2 - ss(0, 2.4, t) * 1.2) * k
      const y = camFrom.current.y * (1 - k) + (p.pos.y + 1.1 + ss(0.6, 2.6, t) * 0.5) * k
      camera.position.set(p.pos.x + Math.sin(ang) * r, y, p.pos.z + Math.cos(ang) * r)
      camera.lookAt(p.pos.x, p.pos.y + 1.0 + Math.min(lift, 7) * 0.7, p.pos.z)
      if (t >= OUT_T && !w.ended) { w.ended = true; setState({ flash: 1 }); w.done() }
    } else {
      if (t === dt) sfx('shard')
      setFlash(1 - ss(0, 0.9, t))
      lift = 6 * (1 - ss(0, 1.0, t))
      stretch = 1 + 2 * (1 - ss(0, 1.0, t))
      glow = 0.6 * (1 - ss(0.5, 1.6, t))
      colA = 0.7 * (1 - ss(0.8, 1.9, t))
      ringA = ss(0.6, 1.0, t) * (1 - ss(1.6, 2.2, t))
      moteA = 1 - ss(1.2, 2.3, t)
      coreA = 0.8 * (1 - ss(0.8, 1.8, t))
      if (t >= IN_T && !w.ended) {
        w.ended = true
        world.warp = null
        restoreGlow(); setKai(0, 1)
        setState({ warpIn: null, flash: 0 })
        setInputEnabled(true)
        if (w.card) setTimeout(() => openPanel('worldDone', { n: w.card }), 400)
        return
      }
    }
    setKai(lift, stretch)
    setGlow(glow)
    mats.column.opacity = colA
    column.current.rotation.y = Math.atan2(camera.position.x - p.pos.x, camera.position.z - p.pos.z) // the beam always faces the camera
    mats.ring.opacity = ringA * 0.8
    rings.current.forEach((m, k) => { if (!m) return; const u = (t * 0.55 + k / 3) % 1; m.position.y = 0.1 + u * 4.2; m.scale.setScalar(1.1 - u * 0.5); m.material.opacity = ringA * 0.8 * (1 - u) })
    mats.mote.opacity = moteA * 0.9
    motes.current.forEach((s, i) => { if (!s) return; const sd = seeds[i]; const u = (sd.o + t * sd.v * 0.35) % 1; const a = sd.a + t * 2.2; s.position.set(Math.sin(a) * sd.r * (1 - u * 0.5), u * 5, Math.cos(a) * sd.r * (1 - u * 0.5)); s.scale.setScalar(0.16 * (1 - u * 0.6)) })
    mats.dot.opacity = coreA
    core.current.position.y = 1.1 + Math.min(lift, 6)
    core.current.scale.setScalar(1.2 + coreA * 2.2)
    light.current.position.y = 1.2 + Math.min(lift, 4)
    light.current.intensity = glow * 7
  })

  return (
    <group ref={root} visible={false}>
      <mesh ref={column} position={[0, 15, 0]} material={mats.column}><planeGeometry args={[2.6, 30]} /></mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} ref={(m) => (rings.current[k] = m)} rotation={[-Math.PI / 2, 0, 0]} material={mats.ring.clone()}><ringGeometry args={[0.9, 1.05, 40]} /></mesh>
      ))}
      {seeds.map((_, i) => <sprite key={i} ref={(s) => (motes.current[i] = s)} material={mats.mote} />)}
      <sprite ref={core} material={mats.dot} />
      <pointLight ref={light} color="#bff6ff" intensity={0} distance={9} />
    </group>
  )
}
