import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TALKERS } from './guide/talk.js'
import { gameById } from './games.js'

// Blocky, voxel-style cabinet (inspired by craft/arcade builds): stepped silhouette, wood control
// deck, torch joysticks, colorful buttons, subject-colored marquee and side panels.

const BOX = new THREE.BoxGeometry(1, 1, 1)
const mats = new Map()
const mat = (color, o = {}) => {
  const k = color + JSON.stringify(o)
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }))
  return mats.get(k)
}

const DEFAULT_THEME = { primary: '#6a7a8a', secondary: '#2a3038', accent: '#d0d8e0', wood: '#6b4a2a', label: 'GAME' }

function marqueeTex(title, theme) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')
  // grass/dirt-ish strip like the reference, tinted by subject
  g.fillStyle = theme.secondary
  g.fillRect(0, 0, 256, 64)
  for (let i = 0; i < 32; i++) {
    g.fillStyle = i % 2 ? theme.primary : theme.secondary
    g.fillRect((i % 16) * 16, Math.floor(i / 16) * 32, 16, 32)
  }
  g.fillStyle = 'rgba(0,0,0,0.35)'
  g.fillRect(0, 18, 256, 32)
  g.fillStyle = '#f4f4f0'
  g.font = 'bold 22px monospace'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const label = (title.length > 16 ? title.slice(0, 15) + '…' : title).toUpperCase()
  g.fillText(label, 128, 34)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  return t
}

function sideIconTex(theme) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = theme.secondary
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = theme.primary
  g.fillRect(8, 8, 48, 48)
  g.fillStyle = theme.accent
  g.fillRect(20, 20, 24, 24)
  g.fillStyle = '#111'
  g.font = 'bold 14px monospace'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText((theme.label || 'GO').slice(0, 4), 32, 32)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  return t
}

function Block({ p, s, c, o, m: material }) {
  return <mesh geometry={BOX} material={material ?? mat(c, o)} position={p} scale={s} />
}

function TorchStick({ x, z }) {
  return (
    <group position={[x, 0.78, z]}>
      <Block p={[0, 0.06, 0]} s={[0.08, 0.12, 0.08]} c="#3a2416" />
      <Block p={[0, 0.16, 0]} s={[0.05, 0.14, 0.05]} c="#5a3a22" />
      <Block p={[0, 0.28, 0]} s={[0.1, 0.1, 0.1]} c="#e23b3b" o={{ emissive: '#ff3030', emissiveIntensity: 1.4, roughness: 0.4 }} />
    </group>
  )
}

export default function ArcadeMachine({ id, gameId, x, z, rot, title }) {
  const root = useRef()
  const screen = useRef()
  const game = gameById(gameId)
  const theme = game?.theme ?? DEFAULT_THEME
  const live = !!(game && game.href)
  const name = game?.title ?? title ?? 'Empty'

  const marquee = useMemo(() => new THREE.MeshStandardMaterial({ map: marqueeTex(name, theme), roughness: 0.55 }), [name, theme])
  const sideIcon = useMemo(() => new THREE.MeshStandardMaterial({ map: sideIconTex(theme), roughness: 0.7 }), [theme])
  const glass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0e1420',
        emissive: theme.primary,
        emissiveIntensity: live ? 0.55 : 0.28,
        roughness: 0.35,
      }),
    [theme, live],
  )

  useEffect(() => {
    TALKERS.set(id, root.current)
    return () => TALKERS.delete(id)
  }, [id])

  useFrame(({ clock }) => {
    if (!screen.current) return
    const base = live ? 0.55 : 0.22
    screen.current.material.emissiveIntensity = base + Math.sin(clock.elapsedTime * 2 + (x + z)) * 0.12
  })

  // stepped voxel silhouette (widths / depths in "blocks")
  return (
    <group ref={root} position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* base plinth, stepped */}
      <Block p={[0, 0.1, 0]} s={[1.35, 0.2, 1.15]} c="#3a322c" />
      <Block p={[0, 0.28, 0.05]} s={[1.2, 0.18, 1.0]} c="#4a3a30" />

      {/* lower body */}
      <Block p={[0, 0.7, 0]} s={[1.15, 0.7, 0.9]} c={theme.secondary} />
      {/* mid body / bezel frame (obsidian-ish) */}
      <Block p={[0, 1.35, -0.02]} s={[1.2, 0.85, 0.85]} c="#1a1522" />
      {/* upper body / marquee housing */}
      <Block p={[0, 1.95, -0.05]} s={[1.25, 0.45, 0.75]} c={theme.secondary} />
      {/* stepped side ears */}
      <Block p={[-0.68, 1.2, 0]} s={[0.2, 1.4, 0.7]} c={theme.secondary} />
      <Block p={[0.68, 1.2, 0]} s={[0.2, 1.4, 0.7]} c={theme.secondary} />
      <Block p={[-0.78, 0.55, 0.05]} s={[0.18, 0.45, 0.55]} c="#2a2430" />
      <Block p={[0.78, 0.55, 0.05]} s={[0.18, 0.45, 0.55]} c="#2a2430" />

      {/* screen + bezel */}
      <Block p={[0, 1.4, 0.4]} s={[0.95, 0.7, 0.08]} c="#0a0a10" />
      <mesh ref={screen} geometry={BOX} material={glass} position={[0, 1.4, 0.45]} scale={[0.78, 0.55, 0.05]} />
      {/* pixel "game" blobs on screen */}
      <Block p={[-0.15, 1.35, 0.48]} s={[0.12, 0.12, 0.02]} c={theme.accent} o={{ emissive: theme.accent, emissiveIntensity: 0.4 }} />
      <Block p={[0.12, 1.42, 0.48]} s={[0.18, 0.08, 0.02]} c={theme.primary} o={{ emissive: theme.primary, emissiveIntensity: 0.5 }} />
      <Block p={[0.05, 1.28, 0.48]} s={[0.28, 0.06, 0.02]} c="#5fe39b" o={{ emissive: '#2a8f5a', emissiveIntensity: 0.35 }} />

      {/* marquee */}
      <mesh geometry={BOX} material={marquee} position={[0, 2.05, 0.32]} scale={[1.15, 0.28, 0.12]} />
      <Block p={[0, 2.22, 0.2]} s={[1.2, 0.08, 0.5]} c={theme.primary} o={{ emissive: theme.primary, emissiveIntensity: 0.35 }} />

      {/* control deck — oak plank look */}
      <Block p={[0, 0.95, 0.55]} s={[1.15, 0.12, 0.55]} c={theme.wood} />
      <Block p={[0, 0.88, 0.72]} s={[1.1, 0.08, 0.2]} c="#5a3a22" />
      {/* front badge */}
      <mesh geometry={BOX} material={sideIcon} position={[0, 0.55, 0.48]} scale={[0.35, 0.35, 0.06]} />

      {/* torch joysticks + arcade buttons */}
      <TorchStick x={-0.32} z={0.62} />
      <TorchStick x={0.08} z={0.62} />
      {[
        [0.28, '#e23b3b'],
        [0.4, '#e8c547'],
        [0.52, '#3d9e5a'],
        [0.64, '#3a7bd5'],
      ].map(([bx, col], i) => (
        <Block key={i} p={[bx - 0.15, 1.02, 0.68]} s={[0.09, 0.05, 0.09]} c={col} o={{ emissive: col, emissiveIntensity: 0.25 }} />
      ))}

      {/* side panel collage — grid of subject tiles */}
      {[-1, 1].map((side) =>
        [-0.35, 0.05, 0.45].map((sy, i) => (
          <mesh key={`${side}${i}`} geometry={BOX} material={sideIcon} position={[0.72 * side, 1.15 + sy, 0.05]} scale={[0.06, 0.28, 0.28]} />
        )),
      )}
      {/* creeper-ish / subject accent squares */}
      <Block p={[-0.72, 1.55, 0.2]} s={[0.07, 0.22, 0.22]} c={theme.accent} />
      <Block p={[0.72, 1.55, 0.2]} s={[0.07, 0.22, 0.22]} c={theme.primary} o={{ emissive: theme.primary, emissiveIntensity: 0.2 }} />

      <pointLight position={[0, 1.45, 0.75]} color={theme.primary} intensity={live ? 3.5 : 2.2} distance={3.5} decay={2} />
      <pointLight position={[-0.32, 1.15, 0.7]} color="#ff5050" intensity={0.8} distance={1.5} decay={2} />
    </group>
  )
}
