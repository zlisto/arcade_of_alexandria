import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './World.jsx'
import Player from './Player.jsx'
import TouchControls from './TouchControls.jsx'
import TalkAim from './guide/TalkAim.jsx'
import GuidePanel from './guide/GuidePanel.jsx'
import { LIBRARIAN_SLUG } from './guide/Librarian.jsx'
import { ALL_MACHINES, EYE, SPAWN } from './layout.js'
import { gameById } from './games.js'
import { onIdentity, presence } from './mvw.js'

const NAME = 'Arcade of Alexandria'
const BLURB =
  'A hall of blocky cabinets for college courses — Biology, Organic Chemistry, Literature, Calculus, and more. Talk to Callimachus, search the catalog, aim at a machine and press E.'

const MACHINE_IDS = new Set(ALL_MACHINES.map((m) => m.id))

export default function App() {
  const [locked, setLocked] = useState(false)
  const [where, setWhere] = useState('')
  const lockRef = useRef()
  const onLock = useCallback((v) => {
    setLocked(v)
    if (v) setFree(false)
  }, [])
  const [free, setFree] = useState(false)
  const freeRef = useRef(free)
  freeRef.current = free
  const onWhere = useCallback((w) => {
    setWhere(w)
    presence(w)
  }, [])
  const [me, setMe] = useState(null)
  useEffect(() => onIdentity(setMe), [])

  const [isTouch] = useState(() => matchMedia('(pointer: coarse)').matches)
  const [touchOn, setTouchOn] = useState(false)
  const touchRef = useRef({ active: false, move: [0, 0], look: [0, 0], jump: false })
  const setTouch = (on) => {
    touchRef.current.active = on
    touchRef.current.move = [0, 0]
    setTouchOn(on)
  }

  const [aim, setAim] = useState(null)
  const [talking, setTalking] = useState(false)
  const [toast, setToast] = useState(null)

  const playGame = useCallback((game) => {
    if (!game) return
    if (game.href) {
      window.open(game.href, '_blank', 'noopener,noreferrer')
      return
    }
    setToast(`${game.title} is coming soon — the cabinet is ready, the game is still being built.`)
    setTimeout(() => setToast(null), 4200)
  }, [])

  const onAimTalk = useCallback(
    (slug) => {
      if (!slug) return
      if (slug === LIBRARIAN_SLUG) {
        setFree(false)
        setTalking(true)
        document.exitPointerLock?.()
        return
      }
      if (MACHINE_IDS.has(slug)) {
        const machine = ALL_MACHINES.find((m) => m.id === slug)
        const game = gameById(machine?.gameId)
        if (game) playGame(game)
        else {
          setToast('This cabinet is empty — more textbook games will arrive here.')
          setTimeout(() => setToast(null), 3500)
        }
      }
    },
    [playGame],
  )

  const startTalk = useCallback(() => onAimTalk(LIBRARIAN_SLUG), [onAimTalk])
  const endTalk = useCallback(() => {
    setTalking(false)
    if (touchOn) return
    setFree(true)
    lockRef.current?.()
  }, [touchOn])

  useEffect(() => {
    document.body.classList.toggle('freelook', free)
  }, [free])
  const playing = locked || touchOn || free || talking
  useEffect(() => {
    if (!free || talking) return
    if (isTouch) {
      setTouch(true)
      setFree(false)
      return
    }
    const click = (e) => !e.target.closest('button, a, .guide, input') && lockRef.current?.()
    addEventListener('mousedown', click)
    return () => removeEventListener('mousedown', click)
  }, [free, talking]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!talking || touchOn) return
    const clickOut = (e) => {
      if (e.button !== 0 || e.target.closest('.guide, button, a, input')) return
      endTalk()
    }
    addEventListener('mousedown', clickOut)
    return () => removeEventListener('mousedown', clickOut)
  }, [talking, touchOn, endTalk])

  const aimLabel = (() => {
    if (!aim) return null
    if (aim === LIBRARIAN_SLUG) return 'Callimachus'
    const m = ALL_MACHINES.find((x) => x.id === aim)
    return m ? m.title : null
  })()
  const aimIsMachine = aim && MACHINE_IDS.has(aim)

  return (
    <>
      <Canvas camera={{ fov: 72, near: 0.05, far: 200, position: [SPAWN.x, EYE, SPAWN.z] }} dpr={[1, 1.75]}>
        <World talking={talking} onTalk={startTalk} />
        <TalkAim enabled={playing && !talking} onAim={setAim} onTalk={onAimTalk} />
        <Player lockRef={lockRef} freeRef={freeRef} touchRef={touchRef} onLock={onLock} onWhere={onWhere} />
      </Canvas>

      <div className="where">
        <span className="dot" style={me?.color ? { background: me.color } : undefined} />
        {where}
      </div>
      {playing && !talking && <div className={aim ? 'crosshair on' : 'crosshair'} />}
      {free && !talking && <div className="hint">Move the mouse to look · click to lock it · WASD to walk</div>}
      {aimLabel && playing && !talking && (
        <div className="talkhint">
          {touchOn ? (
            <button onClick={() => onAimTalk(aim)}>{aimIsMachine ? `Play ${aimLabel}` : `Talk to ${aimLabel}`}</button>
          ) : locked ? (
            <span>
              <b>Click</b> or <b>E</b> to {aimIsMachine ? 'play' : 'talk to'} {aimLabel}
            </span>
          ) : (
            <span>
              <b>E</b> to {aimIsMachine ? 'play' : 'talk to'} {aimLabel}
            </span>
          )}
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      {talking && <GuidePanel visitor={me?.name} onClose={endTalk} onPlayGame={playGame} />}
      {touchOn && !talking && <TouchControls touchRef={touchRef} onPause={() => setTouch(false)} />}

      {!playing && (
        <div className="overlay" onClick={() => (isTouch ? setTouch(true) : lockRef.current?.())}>
          <div className="card">
            <div className="kicker">{me?.name ? `Welcome, ${me.name}` : 'Library of playable knowledge'}</div>
            <h1>{NAME}</h1>
            <p className="sub">{BLURB}</p>
            <button className="go">{isTouch ? 'Tap to walk in' : 'Click to walk in'}</button>
            {!isTouch && (
              <button
                className="go alt"
                onClick={(e) => {
                  e.stopPropagation()
                  setTouch(true)
                }}
              >
                Use on-screen joystick
              </button>
            )}
            <div className="keys">
              {isTouch ? (
                <>
                  <span>
                    <b>Left thumb</b> walk
                  </span>
                  <span>
                    <b>Right thumb</b> drag to look
                  </span>
                </>
              ) : (
                <>
                  <span>
                    <b>WASD</b> walk
                  </span>
                  <span>
                    <b>Mouse</b> look
                  </span>
                  <span>
                    <b>Shift</b> run
                  </span>
                  <span>
                    <b>Space</b> jump
                  </span>
                  <span>
                    <b>E</b> talk / play
                  </span>
                  <span>
                    <b>Esc</b> pause
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
