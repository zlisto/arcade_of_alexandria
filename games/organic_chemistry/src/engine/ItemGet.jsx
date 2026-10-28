import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Part } from './models'
import { getState, setState, say, useGame } from './store'
import { sfx } from '../audio/sfx'

// The item get, Zelda-style: Kai turns to the camera, the item rises over his head and spins in a glow while
// the "You got…" lines play. itemGet(world, item, lines) runs it; <ItemGetFx> (mounted by GameScene) draws it.
// item: { model, name, scale, color } — a part from one of the Blender .glb files.

export async function itemGet(world, item, lines) {
  const p = world.player
  if (p) {
    // Kai turns round, away from the chest he just opened, and the camera stands in front of him: open ground
    const f = p.facing + Math.PI
    if (p.teleport) p.teleport([p.pos.x, p.pos.y, p.pos.z], f)
    world.camOverride = { pos: [p.pos.x + Math.sin(f) * 4.6, p.pos.y + 1.7, p.pos.z + Math.cos(f) * 4.6], look: [p.pos.x, p.pos.y + 1.6, p.pos.z] }
  }
  setState({ itemGet: { ...item, t0: performance.now() } })
  sfx('shard')
  await new Promise((r) => setTimeout(r, 700))
  await say(lines)
  setState({ itemGet: null })
  world.camOverride = null
}

export function ItemGetFx({ world }) {
  const it = useGame((s) => s.itemGet)
  const g = useRef(), spin = useRef()
  useFrame(() => {
    const p = world.player
    if (!it || !p || !g.current) return
    const t = (performance.now() - it.t0) / 1000
    const rise = Math.min(1, t / 0.6)
    g.current.position.set(p.pos.x, p.pos.y + 1.6 + rise * 0.9, p.pos.z)
    if (spin.current) spin.current.rotation.y = t * 1.6
    g.current.scale.setScalar(0.3 + 0.7 * rise)
  })
  if (!it) return null
  const col = it.color || '#ffe08a'
  return (
    <group ref={g}>
      <group ref={spin} scale={it.scale || 1}><Part model={it.model} name={it.name} /></group>
      <mesh><sphereGeometry args={[0.55, 20, 14]} /><meshBasicMaterial color={col} transparent opacity={0.18} depthWrite={false} toneMapped={false} /></mesh>
      <pointLight color={col} intensity={6} distance={6} />
    </group>
  )
}
