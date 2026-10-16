import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TALKERS } from './guide/talk.js'
import { gameById } from './games.js'

// A textbook-game cabinet. Registers with TALKERS so aim + click / E can "play" it.

const BOX = new THREE.BoxGeometry(1, 1, 1)

export default function ArcadeMachine({ id, gameId, x, z, rot, title }) {
  const root = useRef()
  const screen = useRef()
  const game = gameById(gameId)
  const live = !!(game && game.href)
  const neon = useMemo(() => new THREE.MeshStandardMaterial({ color: live ? '#5fe39b' : '#ff4fa3', emissive: live ? '#2a8f5a' : '#ff4fa3', emissiveIntensity: 0.85, roughness: 0.4 }), [live])
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a2030', emissive: live ? '#3a6a9a' : '#402050', emissiveIntensity: 0.6, roughness: 0.25 }), [live])
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2430', roughness: 0.7 }), [])
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4a2a', roughness: 0.85 }), [])

  useEffect(() => {
    TALKERS.set(id, root.current)
    return () => TALKERS.delete(id)
  }, [id])

  useFrame(({ clock }) => {
    if (!screen.current) return
    const pulse = 0.55 + Math.sin(clock.elapsedTime * 2.2 + (gameId ? 1 : 0)) * 0.2
    screen.current.material.emissiveIntensity = pulse
  })

  return (
    <group ref={root} position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* pedestal */}
      <mesh geometry={BOX} material={wood} position={[0, 0.15, 0]} scale={[1.1, 0.3, 0.95]} />
      {/* cabinet body */}
      <mesh geometry={BOX} material={body} position={[0, 1.05, 0]} scale={[1.0, 1.5, 0.85]} />
      {/* screen */}
      <mesh ref={screen} geometry={BOX} material={glass} position={[0, 1.35, 0.38]} scale={[0.75, 0.55, 0.06]} />
      {/* marquee */}
      <mesh geometry={BOX} material={neon} position={[0, 1.95, 0.2]} scale={[1.05, 0.22, 0.5]} />
      {/* control panel shelf */}
      <mesh geometry={BOX} material={body} position={[0, 0.72, 0.42]} scale={[0.95, 0.12, 0.35]} />
      {/* joystick stub + buttons */}
      <mesh geometry={BOX} material={neon} position={[-0.2, 0.82, 0.5]} scale={[0.06, 0.12, 0.06]} />
      <mesh geometry={BOX} material={neon} position={[0.15, 0.8, 0.5]} scale={[0.08, 0.05, 0.08]} />
      <mesh geometry={BOX} material={neon} position={[0.32, 0.8, 0.5]} scale={[0.08, 0.05, 0.08]} />
      {/* soft glow */}
      <pointLight position={[0, 1.4, 0.6]} color={live ? '#5fe39b' : '#ff4fa3'} intensity={live ? 4 : 2.5} distance={4} decay={2} />
    </group>
  )
}
