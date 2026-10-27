import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { createWorld } from './world'
import Player from './Player'
import CameraRig from './CameraRig'
import LightPool from './LightPool'
import { getState, setState } from './store'
import { setActiveWorld } from './active'

// A playable scene inside the app's single persistent Canvas: its own world, Kai and the camera.
// children(world) builds the level. (One WebGL context for the whole game; scenes swap inside it.)
export default function GameScene({ children, start, startFacing = 0, background = '#87a9c9', camDist = 6.2 }) {
  const world = useMemo(() => createWorld(), [])
  const gl = useThree((st) => st.gl)
  const scene = useThree((st) => st.scene)
  const camera = useThree((st) => st.camera)
  useEffect(() => {
    world.respawn = start
    setActiveWorld(world)
    if (import.meta.env.DEV) window.__valence = { ...(window.__valence || {}), world, getState, setState, gl, scene, camera } // gl: renderer stats for perf checks
    return () => setActiveWorld(null)
  }, [world])
  return (
    <>
      <color attach="background" args={[background]} />
      <Player world={world} start={start} startFacing={startFacing} />
      <CameraRig world={world} dist={camDist} />
      <LightPool k={6} />
      {children(world)}
    </>
  )
}
