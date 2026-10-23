import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { getState } from './store'

// Third-person camera. Free orbit around Kai; while locked on it frames Kai and the target together.
// Pulls in when a wall is between the camera and Kai.

const tmp = new THREE.Vector3()
const look = new THREE.Vector3()

export default function CameraRig({ world, dist = 6.2, height = 1.5 }) {
  const { camera } = useThree()
  const smoothPos = useRef(new THREE.Vector3())
  const smoothLook = useRef(new THREE.Vector3())
  const init = useRef(false)

  useFrame((_, dt) => {
    const p = world.player
    if (!p || !world.cam) return
    if (getState().cutscene) return
    const cam = world.cam
    const pos = p.pos
    let yaw = cam.yaw
    let pitch = cam.pitch
    const lockPos = world.lockPos
    look.set(pos.x, pos.y + (p.stance === 'sp2' ? 0.8 : 1.3), pos.z)
    let d = dist
    if (lockPos) {
      // behind Kai, on the line away from the target, a little to the side
      const ang = Math.atan2(pos.x - lockPos[0], pos.z - lockPos[2])
      cam.yaw += Math.atan2(Math.sin(ang + 0.25 - cam.yaw), Math.cos(ang + 0.25 - cam.yaw)) * Math.min(1, dt * 6)
      yaw = cam.yaw
      pitch = 0.32
      look.lerp(tmp.set(lockPos[0], lockPos[1] + 1, lockPos[2]), 0.35)
      d = dist + Math.min(4, Math.hypot(pos.x - lockPos[0], pos.z - lockPos[2]) * 0.2)
    }
    if (world.camOverride) {
      const o = world.camOverride
      tmp.set(...o.pos)
      look.set(...o.look)
    } else {
      tmp.set(
        pos.x + Math.sin(yaw) * Math.cos(pitch) * d,
        pos.y + height + Math.sin(pitch) * d,
        pos.z + Math.cos(yaw) * Math.cos(pitch) * d,
      )
      // pull in front of walls
      const from = look.clone()
      const dir = tmp.clone().sub(from)
      const len = dir.length()
      dir.normalize()
      let free = len
      for (let s = 0.4; s < len; s += 0.25) {
        const q = from.clone().addScaledVector(dir, s)
        if (insideSolid(world, q)) { free = Math.max(0.8, s - 0.35); break }
      }
      tmp.copy(from).addScaledVector(dir, free)
      if (world.camMaxY !== undefined) tmp.y = Math.min(tmp.y, world.camMaxY)
    }
    if (!init.current) { smoothPos.current.copy(tmp); smoothLook.current.copy(look); init.current = true }
    const k = world.camOverride ? Math.min(1, dt * 3) : Math.min(1, dt * 10)
    smoothPos.current.lerp(tmp, k)
    smoothLook.current.lerp(look, Math.min(1, dt * 12))
    camera.position.copy(smoothPos.current)
    camera.lookAt(smoothLook.current)
  })
  return null
}

function insideSolid(world, q) {
  for (const s of world.solids.values()) {
    if (!s.enabled || s.noCam) continue
    if (q.x > s.min[0] && q.x < s.max[0] && q.y > s.min[1] && q.y < s.max[1] && q.z > s.min[2] && q.z < s.max[2]) return true
  }
  if (world.ceilingY !== undefined && q.y > world.ceilingY) return true
  return false
}
