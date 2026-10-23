import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'

// Pi, modeled on assets/characters/pi.png: a living p orbital — two luminous lobes with a red rim
// glow, a bright nucleus at the node between them, two eyes in the upper lobe, and a cloud of
// twinkling sparkles. He bobs and sways (no spinning, so his face stays toward you) and blinks.

// a soft round dot for sparkles (points are square without a texture)
let dotTex = null
function dotTexture() {
  if (dotTex) return dotTex
  const c = document.createElement('canvas'); c.width = c.height = 32
  const g = c.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32)
  dotTex = new THREE.CanvasTexture(c)
  return dotTex
}

export function Pi({ glow = 1, ...props }) {
  const g = useRef()
  const lobes = useRef()
  const eyes = useRef()
  const sparks = useRef()
  const { lobeMat, lobeMat2, sparkGeo, sparkMat } = useMemo(() => {
    const mk = (c, e) => {
      const m = rimMat({ color: c, emissive: new THREE.Color(e), emissiveIntensity: 1.6, transparent: true, opacity: 0.82, roughness: 0.3, depthWrite: false }, '#ff5a5a', 1.4, 2.2)
      m.toneMapped = false
      return m
    }
    // sparkles: a soft cloud around both lobes
    const n = 70
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.16 + Math.random() * 0.2, y = (Math.random() - 0.5) * 0.7
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return {
      lobeMat: mk('#d8f6ff', '#7fd6ff'),
      lobeMat2: mk('#d0f0ff', '#6cc8f4'),
      sparkGeo: geo,
      sparkMat: new THREE.PointsMaterial({ color: '#cfefff', size: 0.03, map: dotTexture(), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    }
  }, [])
  const tmp = useMemo(() => ({ wp: new THREE.Vector3(), pq: new THREE.Quaternion(), e: new THREE.Euler() }), [])
  useFrame(({ clock, camera }) => {
    if (!g.current) return
    const t = clock.elapsedTime
    g.current.position.y = (props.position?.[1] || 0) + Math.sin(t * 3) * 0.1
    // turn to face the camera (so you see his eyes), with a little sway
    g.current.getWorldPosition(tmp.wp)
    const yaw = Math.atan2(camera.position.x - tmp.wp.x, camera.position.z - tmp.wp.z)
    const parentYaw = g.current.parent ? tmp.e.setFromQuaternion(g.current.parent.getWorldQuaternion(tmp.pq), 'YXZ').y : 0
    g.current.rotation.y = yaw - parentYaw + Math.sin(t * 0.9) * 0.3
    g.current.rotation.z = Math.sin(t * 1.7) * 0.08
    const pulse = 1 + Math.sin(t * 4) * 0.04
    lobes.current.scale.set(pulse, 1 + Math.sin(t * 4 + 1) * 0.05, pulse)
    lobeMat.emissiveIntensity = (1.5 + Math.sin(t * 4) * 0.25) * glow
    lobeMat2.emissiveIntensity = (1.3 + Math.sin(t * 4 + 1.5) * 0.25) * glow
    eyes.current.scale.y = (t % 3.3) < 0.12 ? 0.15 : 1
    sparks.current.rotation.y = t * 0.6
    sparkMat.opacity = 0.6 + Math.sin(t * 7) * 0.25
  })
  return (
    <group ref={g} {...props}>
      <group ref={lobes}>
        <mesh position={[0, 0.145, 0]} scale={[0.82, 1, 0.82]} material={lobeMat}><sphereGeometry args={[0.13, 24, 18]} /></mesh>
        <mesh position={[0, -0.145, 0]} scale={[0.82, 1, 0.82]} material={lobeMat2}><sphereGeometry args={[0.13, 24, 18]} /></mesh>
        {/* inner glow cores */}
        <mesh position={[0, 0.15, 0]} scale={[0.5, 0.6, 0.5]}><sphereGeometry args={[0.13, 14, 10]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35} toneMapped={false} depthWrite={false} /></mesh>
        <mesh position={[0, -0.15, 0]} scale={[0.5, 0.6, 0.5]}><sphereGeometry args={[0.13, 14, 10]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.3} toneMapped={false} depthWrite={false} /></mesh>
      </group>
      {/* the nucleus at the node */}
      <mesh><sphereGeometry args={[0.038, 14, 10]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh><sphereGeometry args={[0.06, 14, 10]} /><meshBasicMaterial color="#e8fbff" transparent opacity={0.35} toneMapped={false} depthWrite={false} /></mesh>
      {/* eyes */}
      <group ref={eyes} position={[0, 0.17, 0.095]}>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.032, 0, 0]} scale={[1, 1.25, 0.6]}><sphereGeometry args={[0.013, 10, 8]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>)}
      </group>
      <points ref={sparks} geometry={sparkGeo} material={sparkMat} />
      <pointLight color="#9fe3ff" intensity={1.6 * glow} distance={4} />
    </group>
  )
}
