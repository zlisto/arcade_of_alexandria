import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CylinderScene from '../levels/w0/CylinderScene'
import LevelMovie from './LevelMovie'
import { useExitTrigger } from './exitTrigger'
import { allCells, canFill, cellAt, cellName, inA } from '../levels/w0/hep'
import { DEFINITION0B, FLOORS, HINTS0B, OPENING } from '../levels/w0/stages0B'
import { dialogOpen, duckMusic, readMuted, setMuted as setAudioMuted, sfxCorrect, sfxFill, sfxRefuse, startMusicBox, stopMusic, textBlip, unlockAudio } from '../audio/chip'
import HepLesson, { HepLessonOverlay } from '../movies/HepLesson'
import MathText from './MathText'

/**
 * World 0 · Bonus "Extension Cord" — the Cylinder Works, a quiet puzzle room off the
 * Assembly Hall. Four floors (a cell complex X with a subcomplex A whose motion is given);
 * click a cell on the floor with the Cell-Smith to fill its column — allowed only once its
 * whole boundary is decided. No enemies.
 */

const TYPE_CPS = 45
const FILL_SECONDS = 1.1
const START = [0, 7.4]
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const WALK = {
  inside: (x, z) => Math.hypot(x, z) < 5.5 || (Math.abs(x) < 0.8 && z > 4 && z < 10.6),
  insideForSpawn: () => false,
  bounds: { minX: -9, maxX: 9, minZ: -9, maxZ: 11 },
}

function Portrait({ id, name }) {
  const [size, x, y] = PORTRAIT_CROP[id] || PORTRAIT_CROP.gyroid
  return (
    <div
      className="portrait"
      role="img"
      aria-label={name}
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/characters/${id}.png)`, backgroundSize: size, backgroundPosition: `${x} ${y}` }}
    />
  )
}

export default function Level0B({ onBackToTitle, onGo, startAt }) {
  const [floor, setFloor] = useState(() => Math.max(0, Math.min(FLOORS.length - 1, Number(startAt) || 0)))
  const [filled, setFilled] = useState([])
  const fillKs = useMemo(() => ({}), [floor]) // eslint-disable-line react-hooks/exhaustive-deps
  const refusedRef = useRef(null)
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  shownNow.current = shown
  const [exitOpen, setExitOpen] = useState(false)
  const [levelClear, setLevelClear] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [seen, setSeen] = useState({})
  const [complete, setComplete] = useState(false)
  const stateRef = useRef(null)
  const frameRef = useRef({ center: [0, 0], size: 12.5 })
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: -5.2, z: 3.4, rotY: 2.2, walk: 0 })
  const emmyTalking = useRef(false)

  const F = FLOORS[floor]
  const cx = F.cx
  const todo = allCells(cx).filter((id) => !inA(cx, id))

  const flash = (text, ms = 2800) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }
  const say = useCallback((ls, next = 'play') => {
    setLines(ls)
    setLineIdx(0)
    setPhase(ls.length ? 'talk:' + next : next)
  }, [])

  useEffect(() => {
    unlockAudio()
    startMusicBox()
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      stopMusic()
    }
  }, [])
  useEffect(() => {
    say(floor === 0 ? [...OPENING, ...F.intro] : F.intro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- filling columns
  const onAction = (gx, gz, x, z) => {
    if (phase !== 'play' || complete) return
    const id = cellAt(cx, x, z)
    if (!id) return flash('Click a point, an edge or a disk on the floor')
    const r = canFill(cx, filled, id)
    if (r.given) return flash(HINTS0B.given)
    if (r.done) return flash(HINTS0B.done)
    if (!r.ok) {
      sfxRefuse()
      refusedRef.current = { ids: r.missing, until: performance.now() / 1000 + 1.8 }
      if (id[0] === 'f' && !seen.wrongOrder) {
        setSeen((m) => ({ ...m, wrongOrder: true }))
        return say(HINTS0B.wrongOrder)
      }
      return flash(`Not yet — this ${cellName(id)}’s boundary isn’t decided: ${r.missing.length} cell${r.missing.length === 1 ? '' : 's'} (flashing red) first`, 3200)
    }
    const k = { current: 0 }
    fillKs[id] = k
    const t0 = performance.now()
    const tick = () => {
      k.current = Math.min(1, (performance.now() - t0) / 1000 / FILL_SECONDS)
      if (k.current < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    sfxFill()
    const next = [...filled, id]
    setFilled(next)
    if (todo.every((c) => next.includes(c))) {
      setComplete(true)
      setTimeout(() => {
        sfxCorrect()
        if (floor + 1 < FLOORS.length) {
          afterTalk.current = () => {
            setFloor(floor + 1)
            setFilled([])
            setComplete(false)
            say(FLOORS[floor + 1].intro)
          }
          say(F.done, 'after')
        } else {
          setExitOpen(true)
          say(F.done)
        }
      }, FILL_SECONDS * 1000 + 500)
    } else flash(`Filled the ${cellName(id)} — ${todo.length - next.length} to go`)
  }

  // ---------- dialogue (FF7 style)
  const advance = () => {
    const full = lines[lineIdx]?.text.length ?? 0
    if (shown < full) return setShown(full)
    if (lineIdx + 1 < lines.length) return setLineIdx(lineIdx + 1)
    const next = phase.split(':')[1]
    if (next === 'after') {
      setPhase('play')
      afterTalk.current?.()
      afterTalk.current = null
    } else setPhase(next)
  }
  const talking = phase.startsWith('talk:')
  const line = talking ? lines[lineIdx] : null
  emmyTalking.current = !!line && line.speaker === 'Emmy Boundary'
  useEffect(() => {
    if (talking) dialogOpen()
    duckMusic(talking)
  }, [talking])
  useEffect(() => {
    setShown(0)
    if (!line) return
    let i = 0
    const id = setInterval(() => {
      i++
      setShown((n) => {
        if (n >= line.text.length) {
          clearInterval(id)
          return n
        }
        return Math.max(n, i)
      })
      // skipped ahead (Enter, Space, ▶▶)? the line is done: stop typing, and stop the blips
      if (shownNow.current >= line.text.length) return clearInterval(id)
      const ch = line.text[i - 1]
      if (ch && ch !== ' ' && i % 2 === 0) textBlip(line.speaker)
      if (i >= line.text.length) clearInterval(id)
    }, 1000 / TYPE_CPS)
    return () => clearInterval(id)
  }, [line])
  const advanceRef = useRef(null)
  advanceRef.current = line ? advance : null
  useEffect(() => {
    const onKey = (e) => {
      if (!advanceRef.current || (e.code !== 'Space' && e.code !== 'Enter')) return
      e.preventDefault()
      advanceRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const playEnabled = phase === 'play' && !lesson && !levelClear
  const game = useMemo(() => ({ mode: 'overworld', bySite: true, start: START, enemies: [] }), [])
  useExitTrigger(exitOpen, stateRef, (x, z) => z > 9.4, () => setLevelClear(true))

  if (import.meta.env.DEV) window.__lvl0b = { floor, filled, phase, cx, todo } // dev

  const given = allCells(cx).filter((id) => inA(cx, id))
  return (
    <div className="screen level">
      <Canvas camera={{ position: [0, 11, 18], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        <CylinderScene
          cx={cx}
          filled={filled}
          fillKs={fillKs}
          refusedRef={refusedRef}
          exitOpen={exitOpen}
          emmyAt={emmyAt}
          emmyTalking={emmyTalking}
          walkable={WALK}
          game={game}
          gameKey="cylinder"
          stateRef={stateRef}
          frameRef={frameRef}
          playEnabled={playEnabled}
          onAction={onAction}
          onEnemies={() => {}}
          onHearts={() => {}}
        />
      </Canvas>

      <div className="ui-overlay">
        <div className="lvl-top">
          <div className="btn-row" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn ghost" onClick={onBackToTitle}>
              ◂ Title
            </button>
            <button
              type="button"
              className="btn ghost"
              aria-pressed={muted}
              onClick={(e) => {
                setMuted(!muted)
                setAudioMuted(!muted)
                e.currentTarget.blur()
              }}
            >
              {muted ? '♪ off' : '♪ on'}
            </button>
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())} title="Watch the lesson: extending a motion">
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Bonus · Cylinder Works</span>
            <h2>Extension Cord</h2>
            <div className="hud">
              <span className="objective">{exitOpen ? 'Walk out through the door' : `Floor ${floor + 1}/4 · ${F.name}`}</span>
            </div>
          </div>
        </div>

        {!exitOpen && (
          <div className="rules-panel forge-panel works-panel">
            <h3>{F.name}</h3>
            <div className="carry-line">
              <span>given (A):</span> <strong style={{ color: '#5ad6c8' }}>{given.map(cellName).join(', ') || '—'}</strong>
            </div>
            <div className="carry-line">
              <span>filled:</span> <strong>{filled.length}</strong> / {todo.length}
            </div>
            <p className="forgery-count">Click a glowing cell: points, then edges, then disks</p>
          </div>
        )}

        {line && (
          <div className="dialog" onClick={advance}>
            <Portrait id={line.portrait} name={line.speaker} />
            <div className="dialog-body">
              <span className="speaker">{line.speaker}</span>
              <p>
                <MathText text={line.text} shown={shown} />
              </p>
            </div>
            <button type="button" className="btn primary small" onClick={(e) => (e.stopPropagation(), advance())}>
              {shown < line.text.length ? '▶▶' : lineIdx + 1 < lines.length ? 'Next ▾' : 'OK'}
            </button>
          </div>
        )}

        {toast && !line && <div className="toast">{toast}</div>}
        {playEnabled && !toast && <div className="hint">WASD to move · click a cell on the floor with the Cell-Smith</div>}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-0-b-lesson"
          Scene={HepLesson}
          Overlay={HepLessonOverlay}
          kicker="World 0 · Bonus · Lesson"
          name="One Cell at a Time"
          embedded
          onDone={() => (setLesson(false), startMusicBox())}
          onSkip={() => (setLesson(false), startMusicBox())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 · Bonus clear</span>
            <h2>Extension Cord</h2>
            <p className="def">{DEFINITION0B.text}</p>
            <p className="cite">
              {DEFINITION0B.cite}{' '}
              <a href={DEFINITION0B.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={() => onGo('movie05')}>
                Continue ▸ 0-5
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
