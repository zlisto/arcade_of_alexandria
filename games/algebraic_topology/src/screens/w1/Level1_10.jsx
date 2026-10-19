import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DeckHallsScene from '../../levels/w1/DeckHallsScene'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import { useExitTrigger } from '../exitTrigger'
import {
  COVER_CYCLIC3,
  COVER_LOPSIDED,
  COVER_QUOTIENT,
  deckShiftLabel,
  isNormalCover,
  isValidDeckShift,
  loopLiftKind,
} from '../../levels/w1/deckShift'
import { DEFINITION, HINTS, OPENING, STATIONS, STATION_ORDER, emmyAdvice110 } from '../../levels/w1/stages1_10'
import { WORLD_TOOLS } from '../../levels/w0/worldTools'
import layout from '../../world/level-1-10.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxRefuse,
  sfxWrong,
  startDeckRoundMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'
import DeckHallsLesson, { DeckHallsLessonOverlay } from '../../movies/w1/DeckHallsLesson'
import MathText from '../MathText'

const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const COVERS = { cyclic3: COVER_CYCLIC3, lopsided: COVER_LOPSIDED, quotient: COVER_QUOTIENT }
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const stationAt = (x, z) => SITES.find((s) => s.stage === 'station' && s.containsWorld(x, z)) || null
const TOOL_KEYS = { Digit1: 'lash', Digit6: 'compass', KeyZ: 'compass' }

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

export default function Level1_10({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-10') || concept?.worlds?.[0]?.levels?.find((l) => l.id === '1-10')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [shift, setShift] = useState(0)
  const [guardsAligned, setGuardsAligned] = useState(false)
  const [walkLoop, setWalkLoop] = useState(null)
  const [walkProgress, setWalkProgress] = useState(0)
  const [met, setMet] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [gameKey, setGameKey] = useState(0)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? [SITE[STATION_ORDER[skipTo]].pos[0] + 1.2, SITE[STATION_ORDER[skipTo]].pos[1] + 3] : layout.start))
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('compass')
  const [exitOpen, setExitOpen] = useState(false)
  const [levelClear, setLevelClear] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [here, setHere] = useState({ site: null, pos: checkpoint })
  const [seen, setSeen] = useState({})
  const stateRef = useRef(null)
  const frameRef = useRef(null)
  const spawnRef = useRef(null)
  const ribbonApi = useRef(null)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: layout.start[0] - 1, z: layout.start[1] - 0.6, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)
  const guardWave = useRef(false)
  const alignedRef = useRef(false)
  alignedRef.current = guardsAligned

  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null

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
    startDeckRoundMusic()
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
    if (!skipTo) say(OPENING)
  }, [say, skipTo])

  const advanceGoal = useCallback(
    (station, ls = []) => {
      const list = STATIONS[station].goals
      const next = (goalIdx[station] || 0) + 1
      if (next >= list.length) {
        setDone((d) => ({ ...d, [station]: true }))
        setShift(0)
        setGuardsAligned(false)
        setWalkLoop(null)
        setCheckpoint([SITE[station].pos[0] + 1.2, SITE[station].pos[1] + 3])
        if (STATION_ORDER.every((id) => id === station || done[id])) {
          setExitOpen(true)
        }
        return say(ls)
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      return say(ls)
    },
    [done, goalIdx, say],
  )

  useEffect(() => {
    if (current === 'shift_deck' && goal?.guards && here.site === 'shift_deck' && !guardWave.current) {
      guardWave.current = true
      setGameKey((k) => k + 1)
    }
  }, [current, goal, here.site])

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const st = stationAt(s.x, s.z)?.id || null
      const em = emmyAt.current
      setNearEmmy(Math.hypot(s.x - em.x, s.z - em.z) < 2.4)
      setHere((h) => (h.site === st && Math.abs(h.pos[0] - s.x) < 0.05 && Math.abs(h.pos[1] - s.z) < 0.05 ? h : { site: st, pos: [s.x, s.z] }))
    }, 150)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      if (!current || !SITE[current]?.emmy) return
      const [dx, dz] = SITE[current].emmy
      const target = [SITE[current].pos[0] + dx, SITE[current].pos[1] + dz]
      const e = emmyAt.current
      const ddx = target[0] - e.x
      const ddz = target[1] - e.z
      const d = Math.hypot(ddx, ddz)
      if (d > 0.05) {
        const step = Math.min(d, 0.13)
        e.x += (ddx / d) * step
        e.z += (ddz / d) * step
        e.rotY = Math.atan2(ddx, ddz)
        e.walk = 1
      } else e.walk = 0
    }, 50)
    return () => clearInterval(id)
  }, [current])

  const tryShift = useCallback(() => {
    if (!current || phase !== 'play') return
    const coverKey = SITE[current].cover
    const cover = COVERS[coverKey]
    if (!cover) return
    const gx = stateRef.current?.x ?? 0
    const gz = stateRef.current?.z ?? 0
    const [wx, wz] = [SITE[current].pos[0], SITE[current].pos[1]]
    if (Math.hypot(gx - wx, gz - wz) > 2.8) {
      flash('Walk closer to the deck wheel.')
      return
    }
    const next = (shift + 1) % cover.sheets
    if (!isValidDeckShift(cover, next)) {
      sfxRefuse()
      if (!seen.badShift) {
        setSeen((s) => ({ ...s, badShift: true }))
        say(HINTS.refuse_shift)
      } else flash('That shift mismatches a port label.')
      return
    }
    setShift(next)
    sfxCorrect()
    if (goal?.type === 'shift' && goal.needShift === next) {
      if (goal.guards) {
        setGuardsAligned(true)
        flash('Deck guards stacked — Lash them.')
      } else advanceGoal(current, STATIONS[current].goals[gi].done)
    }
  }, [advanceGoal, current, gi, goal, phase, say, seen.badShift, shift])

  const onAction = useCallback(
    (_gx, _gz, cx, cz) => {
      if (tool !== 'compass') return
      const st = stationAt(cx, cz) || stationAt(_gx, _gz)
      if (st?.id === current) tryShift()
    },
    [current, tool, tryShift],
  )

  const onWheelClick = tryShift

  useEffect(() => {
    if (current && here.site === current && !met[current]) {
      setMet((m) => ({ ...m, [current]: true }))
      say(STATIONS[current].arrive)
    } else if (here.site && STATION_ORDER.indexOf(here.site) > STATION_ORDER.indexOf(current || 'antipodal') && current && !met['early-' + here.site]) {
      setMet((m) => ({ ...m, ['early-' + here.site]: true }))
      say(STATIONS[here.site].early)
    }
  }, [here.site, current, met, say])

  useEffect(() => {
    if (!current || !SITE[current]) return
    const [x, z] = SITE[current].pos
    const r = SITE[current].def.add[0].r || 6
    frameRef.current = { center: [x + 1, z + 0.2], size: r > 5.5 ? 12.6 : 8.8, follow: 0.12 }
  }, [current])

  const walkable = useMemo(() => {
    const extra = exitOpen && layout.exit ? [{ a: layout.exit.a, b: layout.exit.b }] : []
    return makeSiteWalkable(layout, SITES, extra)
  }, [exitOpen])

  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
    }
    if (current === 'shift_deck' && goal?.guards && guardWave.current && !guardsAligned) {
      for (const [type, dx, dz] of SITE.shift_deck.wave) {
        list.push({ type, x: SITE.shift_deck.pos[0] + dx, z: SITE.shift_deck.pos[1] + dz, site: 'shift_deck', linked: true })
      }
    }
    return {
      mode: 'overworld',
      bySite: true,
      start: checkpoint,
      enemies: list,
      // a Deck guard is copied on every sheet: it only falls once the copies are stacked, and then one lash takes them all
      canHit: (e) => e.type !== 'deck_guard' || alignedRef.current,
      onRefused: (e) => e.type === 'deck_guard' && flash('A guard is copied on every sheet — rotate the deck until the copies stack, then lash once.'),
      // when the deck has rotated to the right shift the copies slide together onto one spot
      enemyAI: (e, dt) => {
        if (e.type !== 'deck_guard' || !alignedRef.current) return
        const [cx, cz] = SITE[e.site].pos
        const dx = cx - e.x
        const dz = cz - e.z
        const d = Math.hypot(dx, dz)
        if (d > 0.02) {
          const k = Math.min(1, (2.4 * dt) / d)
          e.x += dx * k
          e.z += dz * k
        }
        e.tx = e.x
        e.tz = e.z
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, done, current, goal, guardsAligned, checkpoint])

  useEffect(() => {
    if (STATION_ORDER.every((id) => done[id])) setExitOpen(true)
  }, [done])

  useExitTrigger(
    exitOpen && !levelClear,
    stateRef,
    (x, z) => layout.exit && Math.hypot(x - layout.exit.gate[0], z - layout.exit.gate[1]) < 2.2,
    () => setLevelClear(true),
  )

  const answer = (v) => {
    if (goal?.type !== 'ask') return
    setAskOpen(false)
    if (v === goal.answer) {
      sfxCorrect()
      advanceGoal(current, goal.right)
    } else {
      sfxWrong()
      say(goal.wrong)
    }
  }
  const [askOpen, setAskOpen] = useState(false)

  useEffect(() => {
    if (goal?.type === 'ask' && phase === 'play' && !lines.length) setAskOpen(true)
    else setAskOpen(false)
  }, [goal, phase, lines.length])

  useEffect(() => {
    if (current === 'antipodal' && goal?.type === 'walk' && here.site === 'antipodal') {
      setWalkLoop(goal.loopId)
      const d = Math.hypot(here.pos[0] - SITE.antipodal.pos[0], here.pos[1] - SITE.antipodal.pos[1])
      if (d > 4 && d < 5.2) setWalkProgress((p) => Math.min(1, p + 0.02))
    }
  }, [here, current, goal])

  useEffect(() => {
    if (walkProgress >= 1 && goal?.type === 'walk') {
      sfxCorrect()
      setWalkProgress(0)
      advanceGoal(current, goal.done)
    }
  }, [walkProgress, goal, advanceGoal, current])

  useEffect(() => {
    if (guardsAligned && enemies[current] === 0 && goal?.guards) advanceGoal(current, goal.done)
  }, [guardsAligned, enemies, current, goal, advanceGoal])

  const talking = phase.startsWith('talk')
  const line = talking ? lines[lineIdx] : null
  const playEnabled = phase === 'play'
  const canTalk = nearEmmy && playEnabled && !line

  useEffect(() => {
    if (!line) return
    dialogOpen()
    duckMusic(true)
    setShown(0)
    let i = 0
    const iv = setInterval(() => {
      i++
      setShown((n) => Math.max(n, i))
      textBlip(line.speaker)
      if (i >= line.text.length) clearInterval(iv)
    }, 1000 / TYPE_CPS)
    return () => clearInterval(iv)
  }, [line])

  const advance = () => {
    if (shown < (line?.text.length || 0)) {
      setShown(line.text.length)
      return
    }
    if (lineIdx + 1 < lines.length) {
      setLineIdx(lineIdx + 1)
      return
    }
    setLines([])
    const next = phase.split(':')[1] || 'play'
    setPhase(next)
    duckMusic(false)
    afterTalk.current?.()
    afterTalk.current = null
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyE' && nearEmmy && playEnabled) say(emmyAdvice110({ current, goal, done, shift, guardsAligned, here, enemies }))
      if (TOOL_KEYS[e.code]) setTool(TOOL_KEYS[e.code])
      if (e.code === 'KeyQ') setTool((t) => (t === 'lash' ? 'compass' : 'lash'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nearEmmy, playEnabled, say, current, goal, done, shift, guardsAligned, here, enemies])

  const objective = current
    ? `Halls ${STATION_ORDER.filter((id) => done[id]).length}/${STATION_ORDER.length} · ${STATIONS[current].blueprint}${goal?.type === 'shift' ? ` · shift +${goal.needShift}` : ''}`
    : 'Walk out the north gate'

  const stepText =
    tool === 'compass'
      ? 'Sheet Compass (6): click the deck wheel to rotate all sheets.'
      : guardsAligned
        ? 'Lash (1): one strike clears every stacked guard.'
        : 'Lash (1) for Null’s spawn.'

  const cover = current ? COVERS[SITE[current]?.cover] : null
  const atStation = current && here.site === current

  if (import.meta.env.DEV)
    window.__lvl1_10 = {
      here,
      done,
      goalIdx,
      shift,
      guardsAligned,
      phase,
      enemies,
      setTool,
      current,
      goal,
      tryShift,
      isNormal: cover ? isNormalCover(cover) : null,
      deckLabel: cover ? deckShiftLabel(cover, shift) : null,
      loopLift: loopLiftKind('half'),
    }

  return (
    <div className="screen level-screen">
      <Canvas className="world-canvas" shadows dpr={[1, 1.5]} camera={{ position: [0, 14, 18], fov: 42 }}>
        <DeckHallsScene
          layout={layout}
          sites={SITES}
          current={current}
          shift={shift}
          guardsAligned={guardsAligned}
          walkLoop={walkLoop}
          onWheelClick={onWheelClick}
          gameKey={gameKey}
          game={game}
          walkable={walkable}
          playEnabled={playEnabled}
          stateRef={stateRef}
          frameRef={frameRef}
          emmyAt={emmyAt}
          emmyTalking={emmyTalking}
          nearEmmy={nearEmmy}
          tool={tool}
          onAction={onAction}
          spawnRef={spawnRef}
          ribbonApi={ribbonApi}
          exitOpen={exitOpen}
          onEnemies={setEnemies}
          onHearts={(h) => {
            if (h <= 0) {
              setHearts(3)
              setGameKey((k) => k + 1)
              setKnockouts((n) => n + 1)
              say(HINTS.knockout)
            } else setHearts(h)
          }}
        />
      </Canvas>

      <div className="hud-wrap">
        <div className="hud-top">
          <div className="hud-actions">
            <button type="button" className="btn small" onClick={onBackToTitle}>
              ◂ Title
            </button>
            <button type="button" className="btn small" onClick={() => (setMuted(!muted), setAudioMuted(!muted))}>
              {muted ? '♪ off' : '♪ on'}
            </button>
            <button type="button" className="btn small" onClick={() => setLesson(true)}>
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 1 · Level 10 · Deck Halls</span>
            <h2>{levelMeta?.title || 'Deck the Halls'}</h2>
            <div className="hud">
              <span className="hearts">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < hearts ? 'heart' : 'heart lost'}>
                    ♥
                  </span>
                ))}
              </span>
              <span className="objective">{objective}</span>
            </div>
          </div>
        </div>

        {atStation && cover && (
          <div className="rules-panel forge-panel works-panel level-1-10-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            <p className="cells-line">
              Sheets: <b>{cover.sheets}</b> · deck shift: <b>{deckShiftLabel(cover, shift)}</b>
              {cover.id !== 'lopsided' && <> · normal: <b>{isNormalCover(cover) ? 'yes' : 'no'}</b></>}
            </p>
            <p className="forgery-count">{stepText}</p>
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

        {askOpen && !line && goal?.type === 'ask' && (
          <div className="dialog verdict">
            <Portrait id="emmy-boundary" name="Emmy Boundary" />
            <div className="dialog-body">
              <span className="speaker">Emmy Boundary</span>
              <p>{goal.question}</p>
            </div>
            <div className="btn-row">
              {goal.options.map((v) => (
                <button key={v} type="button" className="btn small" onClick={() => answer(v)}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {toast && !line && <div className="toast">{toast}</div>}
        {canTalk && (
          <button type="button" className="btn talk-btn" onClick={() => say(emmyAdvice110({ current, goal, done, shift, guardsAligned, here, enemies }))}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}
        {!levelClear && !line && !askOpen && (
          <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit_path' : null)} pos={stateRef.current ? [stateRef.current.x, stateRef.current.z] : checkpoint} title="Deck Halls" />
        )}

        {!talking && !levelClear && !askOpen && (
          <div className="controls">
            <div className="weapons">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={() => setTool('lash')}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'compass' ? 'active' : ''}`} onClick={() => setTool('compass')}>
                ✧ {WORLD_TOOLS.compass.label} <kbd>6</kbd>
              </button>
            </div>
          </div>
        )}
        {playEnabled && !toast && <div className="hint">{atStation ? stepText : 'WASD · 6 Sheet Compass · 1 Lash · Talk to Emmy (E)'}</div>}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-1-10-lesson"
          Scene={DeckHallsLesson}
          Overlay={DeckHallsLessonOverlay}
          kicker="World 1 · Level 10 · Lesson"
          name="Deck Shifts"
          embedded
          startMusic={startDeckRoundMusic}
          onDone={() => (setLesson(false), startDeckRoundMusic())}
          onSkip={() => (setLesson(false), startDeckRoundMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 1 · Level 10 clear</span>
            <h2>{levelMeta?.title || 'Deck the Halls'}</h2>
            <p className="def">{DEFINITION.text}</p>
            <p className="cite">
              {DEFINITION.cite}{' '}
              <a href={DEFINITION.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: The Commutator&apos;s Keep — Null waits on the sphere.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Finish ▸ Title (the castle comes next)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}