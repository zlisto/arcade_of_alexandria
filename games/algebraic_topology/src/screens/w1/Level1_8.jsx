import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import UnderCoverScene, { buildTracks } from '../../levels/w1/UnderCoverScene'
import {
  coverBrokenThreeSheet,
  coverConnectedFrom,
  coverThreeSheetAbSep,
  coverTwoSheetCircle,
  cyclePortAt,
  isValidCover,
  liftWord,
  parseWord,
} from '../../levels/w1/covers'
import { HUB_RADIUS, makeTracker } from '../../levels/w0/cells'
import { DEFINITION18, HINTS18, OPENING, STATIONS, STATION_ORDER, emmyAdvice18 } from '../../levels/w1/stages1_8'
import layout from '../../world/sheetwater.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import MathText from '../MathText'
import { useExitTrigger } from '../exitTrigger'
import UnderCoverLesson, { UnderCoverLessonOverlay } from '../../movies/w1/UnderCoverLesson'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxRefuse,
  sfxWrong,
  sfxZoot,
  sfxExit,
  startSheetwaterMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'

const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const TRACKS = buildTracks(SITES)
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const TOOL_KEYS = { Digit1: 'lash', Digit4: 'cord', Digit6: 'compass' }
const stationAt = (x, z) => SITES.find((s) => s.stage === 'station' && s.containsWorld(x, z)) || null

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

export default function Level1_8({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-8')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [met, setMet] = useState({})
  const [cover, setCover] = useState(() => (skipTo > 0 ? coverThreeSheetAbSep() : coverTwoSheetCircle()))
  const [liftSheet, setLiftSheet] = useState(0)
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? [SITE[STATION_ORDER[skipTo]].pos[0] + 1, SITE[STATION_ORDER[skipTo]].pos[1] + 3] : layout.start))
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('cord')
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
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: layout.start[0] - 1, z: layout.start[1] - 0.6, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)
  const trackerRef = useRef(null)
  const lapCount = useRef(0)
  const liftRef = useRef(0)
  liftRef.current = liftSheet

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
    setPhase(ls.length ? `talk:${next}` : next)
  }, [])
  const once = (key, ls, fallback) => {
    if (!seen[key]) {
      setSeen((m) => ({ ...m, [key]: true }))
      say(ls)
    } else flash(fallback, 3400)
  }

  useEffect(() => {
    unlockAudio()
    startSheetwaterMusic()
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

  useEffect(() => {
    if (current === 'build_cover' && !done.build_cover) setCover(coverBrokenThreeSheet())
    if (current === 'rescue' || current === 'order_proved') setCover(coverThreeSheetAbSep())
    if (current === 'two_floors') setCover(coverTwoSheetCircle())
    lapCount.current = 0
    setLiftSheet(0)
    trackerRef.current = current && TRACKS[current] ? makeTracker(TRACKS[current], SITE[current].pos) : null
  }, [current, done.build_cover])

  const advanceGoal = useCallback(
    (station, ls = []) => {
      const list = STATIONS[station].goals
      const next = (goalIdx[station] || 0) + 1
      if (next >= list.length) {
        setDone((d) => ({ ...d, [station]: true }))
        setCheckpoint([SITE[station].pos[0] + 1, SITE[station].pos[1] + 3])
        if (station === 'order_proved' && list[next - 1]?.type === 'prove') {
          afterTalk.current = () => {
            sfxZoot()
            setExitOpen(true)
          }
        }
        return say(ls, afterTalk.current ? 'after' : 'play')
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      if (list[next]?.type === 'exit') {
        sfxZoot()
        setExitOpen(true)
      }
      return say(ls)
    },
    [goalIdx, say],
  )

  const onPortClick = useCallback(
    (label) => {
      if (tool !== 'compass') {
        flash('Sheet Compass (6) to rewire ports.')
        sfxRefuse()
        return
      }
      setCover((c) => {
        const next = cyclePortAt(c, 0, label)
        if (goal?.type === 'wire' && isValidCover(next) && coverConnectedFrom(next, 0) && next.n === 3) {
          sfxCorrect()
          setTimeout(() => advanceGoal(current, goal.done), 0)
        }
        return next
      })
    },
    [advanceGoal, current, flash, goal, tool],
  )

  const onTrackMove = useCallback(
    (x, z) => {
      if (!playEnabledRef.current || !current || !trackerRef.current) return
      const ev = trackerRef.current.update(x, z)
      if (!ev || ev.event !== 'done') return
      const tracks = SITE[current].tracks
      const L = tracks[ev.track]?.label === 'b' ? (ev.dir > 0 ? 'b' : 'B') : ev.dir > 0 ? 'a' : 'A'
      const { end } = liftWord(cover, liftRef.current, [L])
      setLiftSheet(end)
      if (goal?.type === 'lap') {
        lapCount.current += 1
        if (lapCount.current === goal.count) {
          sfxCorrect()
          advanceGoal(current, STATIONS[current].goals[gi].done)
          lapCount.current = 0
          setLiftSheet(0)
        } else if (goal.count === 2 && lapCount.current === 1 && end !== 1) {
          once('lap1', HINTS18.wrongLap, 'One lap should land on sheet two.')
          sfxWrong()
        }
      }
      if (goal?.type === 'rescue' && end === (goal.targetSheet ?? 2) - 1) {
        sfxCorrect()
        advanceGoal(current, goal.done)
      }
    },
    [advanceGoal, cover, current, gi, goal, once],
  )

  const playEnabledRef = useRef(true)
  const playEnabled = phase === 'play' && !lesson && !levelClear
  playEnabledRef.current = playEnabled

  const onAction = useCallback(
    (gx, gz, cx, cz) => {
      if (!current || !playEnabled || tool !== 'compass') return // (the Cord is a track tool; it now sends clicks too)
      const site = stationAt(gx, gz)
      if (site?.id !== current) {
        flash('Walk to the active deck first.')
        sfxRefuse()
        return
      }
      const hub = Math.hypot(gx - site.pos[0], gz - site.pos[1]) < HUB_RADIUS
      if (tool === 'compass' && hub && goal?.type === 'prove') {
        const ab = liftWord(cover, 0, parseWord('ab'))
        const ba = liftWord(cover, 0, parseWord('ba'))
        if (ab.closed && !ba.closed) {
          sfxCorrect()
          advanceGoal(current, goal.done)
        } else {
          once('prove', HINTS18.proveNeed, 'ab must close and ba must not — rewire the ports.')
          sfxWrong()
        }
        return
      }
      if (tool === 'compass' && site.ports) onPortClick(Math.abs(cx - site.pos[0]) > Math.abs(cz - site.pos[1]) ? 'a' : 'b')
    },
    [advanceGoal, cover, current, flash, goal, once, onPortClick, playEnabled, tool],
  )

  // dialogue typing
  const line = lines[lineIdx]
  useEffect(() => {
    if (!line) return
    dialogOpen()
    duckMusic(true)
    setShown(0)
    let i = 0
    const id = setInterval(() => {
      i++
      setShown((n) => Math.max(n, i))
      textBlip(line.speaker)
      if (i >= line.text.length) clearInterval(id)
    }, 1000 / TYPE_CPS)
    return () => clearInterval(id)
  }, [line])
  useEffect(() => {
    if (!line) duckMusic(false)
  }, [line])

  const advance = useCallback(() => {
    if (!line) return
    if (shownNow.current < line.text.length) {
      setShown(line.text.length)
      return
    }
    if (lineIdx + 1 < lines.length) {
      setLineIdx(lineIdx + 1)
      return
    }
    const next = phase.split(':')[1] || 'play'
    setLines([])
    setPhase(next)
    if (next === 'after' && afterTalk.current) {
      afterTalk.current()
      afterTalk.current = null
    }
  }, [line, lineIdx, lines.length, phase])

  const advanceRef = useRef(advance)
  advanceRef.current = advance
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return
      if (lines.length) {
        e.preventDefault()
        advanceRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lines.length])

  // arrival / emmy
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      setHere({ site: stationAt(s.x, s.z)?.id || null, pos: [s.x, s.z] })
      const st = current && stationAt(s.x, s.z)
      if (st?.id === current && !met[current]) {
        setMet((m) => ({ ...m, [current]: true }))
        say(STATIONS[current].arrive)
      }
      if (st && st.id !== current && !done[st.id] && !seen[`early-${st.id}`]) {
        setSeen((m) => ({ ...m, [`early-${st.id}`]: true }))
        say(STATIONS[st.id].early)
      }
      const em = SITE[current]
      if (em) {
        const ex = em.pos[0] + (em.emmy?.[0] || 0)
        const ez = em.pos[1] + (em.emmy?.[1] || 0)
        emmyAt.current.x += (ex - emmyAt.current.x) * 0.04
        emmyAt.current.z += (ez - emmyAt.current.z) * 0.04
        setNearEmmy(Math.hypot(s.x - ex, s.z - ez) < 2.4)
      }
    }, 120)
    return () => clearInterval(id)
  }, [current, done, met, say, seen])

  const talkToEmmy = () => say(emmyAdvice18({ current, done, goal, liftSheet, cover, here, enemies, siteName: (id) => SITE[id]?.name || id }))
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyE' && nearEmmy && phase === 'play') talkToEmmy()
      const t = TOOL_KEYS[e.code]
      if (t) setTool(t)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nearEmmy, phase, goal, liftSheet, cover, here, enemies, current, done])

  const gameKey = `sheetwater:${knockouts}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const row of s.enemies) {
        const [type, x, z] = row
        list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id, sheet: row[3] })
      }
    }
    return {
      mode: 'overworld',
      bySite: true,
      start: checkpoint,
      enemies: list,
      // a Liftling lives on one sheet: the Lash only lands when your lift is on it
      canHit: (e) => e.type !== 'liftling' || e.sheet == null || e.sheet === liftRef.current,
      onRefused: (e) => e.type === 'liftling' && flash(`That Liftling lives on sheet ${e.sheet + 1} — lift onto it, then lash.`),
    }
  }, [gameKey, done])

  const FRAME = { two_floors: 8.2, build_cover: 8.8, rescue: 8.8, order_proved: 8.8 }
  frameRef.current = current && here.site === current && met[current] ? { center: [SITE[current].pos[0] + 1, SITE[current].pos[1] + 0.3], size: FRAME[current], follow: 0.12 } : null
  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.5 && z < layout.exit.gate[1] - 0.6, () => {
    sfxExit()
    setLevelClear(true)
  })

  if (import.meta.env.DEV) window.__lvl1_8 = { here, done, goalIdx, cover, liftSheet, phase, current, goal, advanceGoal, setTool }

  const emmyOnSheet = current === 'rescue' ? SITE.rescue.emmySheet : null
  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen ? 'Walk north off the viaduct' : current ? `Decks ${nDone}/4 · ${SITE[current].name}` : ''
  const atStation = current && here.site === current && met[current]
  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'lap') return `Winding Cord (4): walk the loop ${goal.count}× · lift on sheet ${liftSheet + 1}`
    if (goal.type === 'wire') return 'Compass (6): click ports until the three-sheet cover matches'
    if (goal.type === 'rescue') return 'Walk a loop that lifts you to sheet 2'
    if (goal.type === 'prove') return 'Compass (6) on beacon: confirm ab closes, ba does not'
    if (goal.type === 'exit') return 'Walk north through the exit'
    return 'Cord (4) walks loops · Compass (6) wires and tests'
  })()

  return (
    <div className="screen level level-1-8">
      <Canvas camera={{ position: [0, 11, 30], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        <UnderCoverScene
          layout={layout}
          sites={SITES}
          current={current}
          liftSheet={liftSheet}
          cover={cover}
          emmyAt={emmyAt}
          emmyTalking={emmyTalking}
          emmyNear={nearEmmy && phase === 'play'}
          emmyOnSheet={emmyOnSheet}
          exitOpen={exitOpen}
          walkable={walkable}
          game={game}
          gameKey={gameKey}
          stateRef={stateRef}
          frameRef={frameRef}
          spawnRef={spawnRef}
          playEnabled={playEnabled}
          tool={tool}
          tracksBySite={TRACKS}
          onAction={onAction}
          onTrackMove={onTrackMove}
          onEnemies={setEnemies}
          onHearts={setHearts}
          onPortClick={onPortClick}
          showPorts={goal?.type === 'wire' || goal?.type === 'prove'}
        />
      </Canvas>
      <div className="ui-overlay">
        <div className="lvl-top">
          <div className="btn-row" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn ghost" onClick={onBackToTitle}>
              ◂ Title
            </button>
            <button type="button" className="btn ghost" aria-pressed={muted} onClick={() => (setMuted(!muted), setAudioMuted(!muted))}>
              {muted ? '♪ off' : '♪ on'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setLesson(true)}>
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 1 · Level 8 · Sheetwater Viaduct</span>
            <h2>{levelMeta?.title || 'Under Cover'}</h2>
            <div className="hud">
              <span className="hearts">{[0, 1, 2].map((i) => (i < hearts ? '♥' : '♡')).join('')}</span>
              <span className="objective">{objective}</span>
            </div>
            {here.site && (
              <div className="here">
                <strong>{SITE[here.site].name}</strong> · lift sheet {liftSheet + 1}/{cover.n}
              </div>
            )}
          </div>
        </div>
        {atStation && (
          <div className="rules-panel forge-panel works-panel">
            <h3>{STATIONS[current].blueprint}</h3>
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
        {toast && !line && <div className="toast">{toast}</div>}
        {nearEmmy && phase === 'play' && (
          <button type="button" className="btn talk-btn" onClick={talkToEmmy}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}
        {!levelClear && !line && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Sheetwater" />}
        {!line && !levelClear && (
          <div className="controls">
            <div className="weapons">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={() => setTool('lash')}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'cord' ? 'active' : ''}`} onClick={() => setTool('cord')}>
                ◎ Winding Cord <kbd>4</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'compass' ? 'active' : ''}`} onClick={() => setTool('compass')}>
                🧭 Sheet Compass <kbd>6</kbd>
              </button>
            </div>
            {playEnabled && !toast && <div className="hint">{atStation ? stepText : 'WASD · Cord (4) walks loops · Compass (6) · Talk to Emmy (E)'}</div>}
          </div>
        )}
      </div>
      {lesson && (
        <LevelMovie
          videoId="level-1-8-lesson"
          Scene={UnderCoverLesson}
          Overlay={UnderCoverLessonOverlay}
          kicker="World 1 · Level 8 · Lesson"
          name="Covers and Lifts"
          embedded
          onDone={() => setLesson(false)}
          onSkip={() => setLesson(false)}
        />
      )}
      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 1 · Level 8 clear</span>
            <h2>{levelMeta?.title || 'Under Cover'}</h2>
            <p className="def">{DEFINITION18.text}</p>
            <p className="cite">
              {DEFINITION18.cite}{' '}
              <a href={DEFINITION18.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: Sheet Stacks — covers built to order.</p>
            <div className="btn-row">
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ Sheet Music
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
