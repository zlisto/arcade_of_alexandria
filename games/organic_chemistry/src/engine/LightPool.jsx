import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// A fixed pool of real point lights that stand in for the nearest of the scene's many point lights.
//
// three.js shades every pixel against every light in the scene, so a dungeon with 40+ torches, chests and
// lamps costs ~50 ms a frame once its walls fill the screen. Here every point light the level declares
// becomes "virtual": it stays in the scene graph (so its component can still animate its intensity,
// colour and position) but is hidden from the renderer. Each frame the pool copies the K nearest visible
// virtual lights into K real lights. The real light count never changes, so shaders never recompile.
const SCAN_EVERY = 0.5 // seconds between scans for newly mounted lights

// Measured on an Intel iGPU: 6 point lights (plus the sun's shadow map) render in ~5 ms; at 7 the shader
// falls off a cliff (130+ ms). Keep k at 6.
export default function LightPool({ k = 6 }) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const pool = useMemo(() => [...Array(k)].map(() => {
    const l = new THREE.PointLight('#ffffff', 0, 1)
    l.userData.pool = true
    return l
  }), [k])
  const virt = useRef([])
  const scanT = useRef(0)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    pool.forEach((l) => scene.add(l))
    return () => {
      pool.forEach((l) => scene.remove(l))
      // give the scene its lights back
      virt.current.forEach((o) => { o.visible = o.userData.wasVisible !== false; delete o.userData.virtual })
      virt.current = []
    }
  }, [scene, pool])

  useFrame((_, dt) => {
    scanT.current -= dt
    if (scanT.current <= 0) {
      scanT.current = SCAN_EVERY
      const list = []
      scene.traverse((o) => {
        if (!o.isPointLight || o.userData.pool) return
        if (!o.userData.virtual) { o.userData.virtual = true; o.userData.wasVisible = o.visible }
        list.push(o)
      })
      virt.current = list
    }
    // score each light the level wants on: nearest first, with its reach counted in its favour
    const cands = []
    for (const o of virt.current) {
      // a component may have toggled visible itself: read that as "on/off", then hide it from the renderer
      if (o.visible) { o.userData.wasVisible = true; o.visible = false }
      if (!o.userData.wasVisible || o.intensity <= 0 || !o.parent) continue
      let p = o.parent, on = true
      while (p) { if (!p.visible) { on = false; break } p = p.parent }
      if (!on) continue
      o.getWorldPosition(tmp)
      const d = tmp.distanceTo(camera.position)
      const reach = o.distance > 0 ? o.distance : 30
      if (d > reach + 20) continue
      cands.push({ o, s: d - reach * 0.6, x: tmp.x, y: tmp.y, z: tmp.z })
    }
    cands.sort((a, b) => a.s - b.s)
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i], c = cands[i]
      if (!c) { l.intensity = 0; continue }
      l.position.set(c.x, c.y, c.z)
      l.color.copy(c.o.color)
      l.intensity = c.o.intensity
      l.distance = c.o.distance
      l.decay = c.o.decay
    }
  })
  return null
}
