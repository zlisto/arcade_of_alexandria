import { useEffect, useRef } from 'react'

/**
 * FF7-style dialogue keys (GAME_DESIGN §5.4): while a dialogue box is open, Space / Enter
 * finish the line, then move on. `advance` is the level's own advance function.
 * Keyup is swallowed too, so a focused button (◂ Title, a tool…) never fires a stray click.
 */
export default function useDialogKeys(active, advance) {
  const ref = useRef(advance)
  ref.current = advance
  useEffect(() => {
    if (!active) return undefined
    const isKey = (e) => e.code === 'Space' || e.code === 'Enter'
    const down = (e) => {
      if (!isKey(e)) return
      e.preventDefault()
      if (!e.repeat) ref.current?.()
    }
    const up = (e) => isKey(e) && e.preventDefault()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [active])
}
