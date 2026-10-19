import { useEffect, useRef } from 'react'
import { sfxExit } from '../audio/chip'

/**
 * A level's exit: once `active` (the level is won and its way out is open), calls
 * `onReach` when Gyroid walks into `inside(x, z)` — and again each time he walks back
 * in after leaving (so "Keep exploring" doesn't strand the end-of-level menu).
 */
export function useExitTrigger(active, stateRef, inside, onReach) {
  const was = useRef(false)
  const cb = useRef(onReach)
  cb.current = onReach
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const now = inside(s.x, s.z)
      if (now && !was.current) {
        sfxExit() // zzzooosh — the screen irises shut while it plays
        cb.current()
      }
      was.current = now
    }, 150)
    return () => clearInterval(id)
    // `inside` is a fixed region per level
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stateRef])
}
