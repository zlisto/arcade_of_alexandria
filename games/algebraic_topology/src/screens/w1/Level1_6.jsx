import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FreeWordScene, { buildTracks, HUB_RADIUS } from '../../levels/w1/FreeWordScene'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import { useExitTrigger } from '../exitTrigger'
import { makeTracker } from '../../levels/w0/cells'
import { WORLD_TOOLS } from '../../levels/w0/worldTools'
import {
  appendLap,
  expectedLashLetter,
  parseTokens,
  reduceFree,
  sameReduced,
  wordText,
} from '../../levels/w1/freeWords'
import { DEFINITION16, HINTS16, OPENING, STATIONS, STATION_ORDER, emmyAdvice16 } from '../../levels/w1/stages1_6'
import layout from '../../world/freewordforge.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxLetter,
  sfxRefuse,
  sfxWrong,
  sfxZoot,
  startFreeWordMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'
import FreeWordLesson, { FreeWordLessonOverlay } from '../../movies/w1/FreeWordLesson'
import MathText from '../MathText'
import useDialogKeys from '../useDialogKeys'

const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const TRACKS = buildTracks(SITES, SITE)
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
  commutator: ['500%', '53%', '19%'],
}
const stationAt = (x, z) => SITES.find((s) => s.stage === 'station' && s.containsWorld(x, z)) || null
const TOOL_KEYS = { Digit1: 'lash', Digit5: 'clasp', KeyQ: 'cycle' }

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

export default function Level1_6({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-6')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [tape, setTape] = useState([])
  const [clasped, setClasped] = useState(false)
  const [patrolStep, setPatrolStep] = useState(0)
  const [met, setMet] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? [SITE[STATION_ORDER[skipTo]].pos[0] + 1.2, SITE[STATION_ORDER[skipTo]].pos[1] + 3.2] : layout.start))
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('lash')
  const [waveOn, setWaveOn] = useState(false)
  const [waveSpawned, setWaveSpawned] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
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
  const patrolApi = useRef(null)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const waveSeen = useRef(false)
  const emmyAt = useRef({ x: layout.start[0] - 1.2, z: layout.start[1] - 0.8, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)
  const progressRef = useRef(null)
  const trackers = useRef(Object.fromEntries(STATION_ORDER.map((id) => [id, makeTracker(TRACKS[id] || [], SITE[id]?.pos || [0, 0])])))
  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null

  const flash = (text, ms = 2600) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }
  const say = useCallback((raw, next = 'play') => {
    const ls = Array.isArray(raw) ? raw : raw ? [raw] : [] // a single line object is fine too
    setLines(ls)
    setLineIdx(0)
    setPhase(ls.length ? 'talk:' + next : next)
  }, [])

  useEffect(() => {
    unlockAudio()
    startFreeWordMusic()
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
        setTape([]) // each deck starts with a clean tape (a leftover letter would make the next deck's target unreachable)
        setCheckpoint(SITE[station].pos.map((v, i) => v + (i ? 2.2 : 0)))
        if (station === STATION_ORDER[STATION_ORDER.length - 1]) {
          setExitOpen(true)
          sfxZoot()
        }
        return say(ls)
      }
      const g = list[next]
      setGoalIdx((m) => ({ ...m, [station]: next }))
      if (g.afterClear) setTape([])
      if (g.type === 'ask') {
        afterTalk.current = () => setAskOpen(true)
        return say([...ls, ...(g.done || [])], 'after')
      }
      if (g.type === 'patrol' && g.wave) {
        waveSeen.current = false
        setWaveOn(true)
        setWaveSpawned(true)
      }
      if (g.type === 'reduce') setTape(parseTokens(g.from))
      say(ls)
    },
    [goalIdx, say],
  )

  const checkGoal = useCallback(
    (station, newTape) => {
      const g = STATIONS[station].goals[goalIdx[station] || 0]
      if (!g) return
      if (g.type === 'lap') {
        /* lap completion handled in tracker tick */
        return
      }
      if (g.type === 'tape' && sameReduced(newTape, parseTokens(g.tokens))) advanceGoal(station, g.done)
      if (g.type === 'reduce' && sameReduced(newTape, parseTokens(g.to))) advanceGoal(station, g.done)
    },
    [goalIdx, advanceGoal],
  )

  const onLapDone = useCallback(
    (station, track, dir) => {
      const g = STATIONS[station].goals[goalIdx[station] || 0]
      setTape((prev) => {
        const { tape: next, cancelled } = appendLap(prev, track, dir)
        sfxLetter(track, dir)
        if (cancelled) flash('Adjacent inverses cancel.')
        if (g?.type === 'lap' && g.track === track && g.dir === dir) {
          setTimeout(() => advanceGoal(station, g.done), 0)
        } else checkGoal(station, next)
        return next
      })
    },
    [goalIdx, advanceGoal, checkGoal],
  )

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s || !current) return
      const st = stationAt(s.x, s.z)?.id
      if (st !== current || phase !== 'play') {
        trackers.current[current].reset()
        progressRef.current = null
        return
      }
      const tr = trackers.current[current]
      const hub = SITE[current].pos
      const atHub = Math.hypot(s.x - hub[0], s.z - hub[1]) < HUB_RADIUS
      const ev = tr.update(s.x, s.z)
      const curT = tr.current()
      progressRef.current = curT ? { track: curT.track, dir: curT.dir, best: tr.progress() } : null
      if (ev?.event === 'abandon') flash(HINTS16.abandon.text.replace(/\$[^$]+\$/g, '').trim())
      if (ev?.event === 'done') onLapDone(current, ev.track, ev.dir)
    }, 80)
    return () => clearInterval(id)
  }, [current, phase, onLapDone])

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const st = stationAt(s.x, s.z)?.id || null
      const e = emmyAt.current
      setNearEmmy(Math.hypot(s.x - e.x, s.z - e.z) < 2.4)
      setHere((h) => (h.site === st && Math.abs(h.pos[0] - s.x) < 0.05 && Math.abs(h.pos[1] - s.z) < 0.05 ? h : { site: st, pos: [s.x, s.z] }))
    }, 150)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const target = current ? SITE[current].emmy.map((v, i) => v + SITE[current].pos[i]) : layout.exit.a
      const e = emmyAt.current
      const dx = target[0] - e.x
      const dz = target[1] - e.z
      const d = Math.hypot(dx, dz)
      if (d > 0.05) {
        const step = Math.min(d, 2.6 * 0.05)
        e.x += (dx / d) * step
        e.z += (dz / d) * step
        e.rotY = Math.atan2(dx, dz)
        e.walk = 1
      } else {
        e.walk = 0
        const hub = current ? SITE[current].pos : layout.exit.gate
        e.rotY = Math.atan2(hub[0] - e.x, hub[1] - e.z)
      }
    }, 50)
    return () => clearInterval(id)
  }, [current])

  useEffect(() => {
    const st = here.site
    if (!st || phase !== 'play' || done[st]) return
    if (st !== current) {
      if (!met['early:' + st]) {
        setMet((m) => ({ ...m, ['early:' + st]: true }))
        say(STATIONS[st].early)
      }
      return
    }
    if (met[st]) return
    setMet((m) => ({ ...m, [st]: true }))
    say(STATIONS[st].arrive)
  }, [here.site, phase, current, met, done, say])

  useEffect(() => {
    if (goal?.type === 'ask' && phase === 'play' && !askOpen && here.site === current && met[current]) setAskOpen(true)
  }, [goal, phase, askOpen, here.site, current, met])

  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    say([HINTS16.knockout])
  }, [hearts, say])

  useEffect(() => {
    if (!current) return
    const s = SITE[current]
    const r = s.def.add[0].r ?? 8.5
    const wide = s.def.add[0].type === 'rect'
    frameRef.current = { center: [s.pos[0] + 0.8, s.pos[1] + 0.3], size: wide ? 12.6 : 8.8, follow: 0.12 }
  }, [current])

  ribbonApi.current = {
    patrolLash(e) {
      return patrolApi.current?.onLashHit(e) !== false
    },
  }
  patrolApi.current = {
    onLashHit(e) {
      if (e.type !== 'patrol' || !e.word) return true
      const w = parseTokens(e.word)
      const exp = expectedLashLetter(w, e.lashStep || 0)
      if (!exp) return true
      const cur = e.patrolTrack != null ? { e: e.patrolTrack, s: e.patrolDir ?? 1 } : null
      if (!cur || cur.e !== exp.e || cur.s !== exp.s) {
        sfxRefuse()
        flash(HINTS16.wrongLash.text)
        return false
      }
      e.lashStep = (e.lashStep || 0) + 1
      setPatrolStep(e.lashStep)
      if (e.lashStep >= w.length) {
        e.hp = 0
        sfxCorrect()
      }
      return true
    },
  }

  const onAction = (gx, gz, cx, cz) => {
    if (!current || here.site !== current || phase !== 'play') return
    const hub = SITE[current].pos
    if (tool !== 'clasp') return
    if (Math.hypot(cx - hub[0], cz - hub[1]) > 1.2) return flash('Walk closer to the beacon hub.')
    const g = goal
    if (g?.type !== 'clasp') return flash('Not yet — finish the patrol briefing first.')
    setClasped(true)
    sfxCorrect()
    advanceGoal(current, g.done)
  }

  const answer = (v) => {
    setAskOpen(false)
    if (v === goal.answer) {
      sfxCorrect()
      advanceGoal(current, goal.right)
    } else {
      sfxWrong()
      say(goal.wrong, 'ask')
    }
  }

  const gameKey = `freeword:${knockouts}:${current}:${gi}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const row of s.enemies) {
        const [type, x, z] = row
        list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
      }
    }
    if (waveOn && waveSpawned && current === 'patrol_yard') {
      for (const row of SITE.patrol_yard.wave || []) {
        const [type, x, z, word] = row
        list.push({ type, x: x + SITE.patrol_yard.pos[0], z: z + SITE.patrol_yard.pos[1], site: 'patrol_yard', word, lashStep: 0 })
      }
    }
    return {
      mode: 'overworld',
      bySite: true,
      start: checkpoint,
      enemies: list,
      // a patrol walks its word, loop by loop (a, b, a⁻¹, b⁻¹ …) along the deck's tracks, so the lash order means something
      enemyAI: (e, dt) => {
        if (e.type !== 'patrol' || !e.word) return
        const letters = e.letters || (e.letters = parseTokens(e.word))
        e.patrolIdx = e.patrolIdx ?? 0
        e.patrolU = (e.patrolU ?? 0) + dt / 4.2
        if (e.patrolU >= 1) {
          e.patrolU = 0
          e.patrolIdx = (e.patrolIdx + 1) % letters.length
        }
        const L = letters[e.patrolIdx]
        const tr = TRACKS[e.site]?.[L.e]
        if (!tr) return
        const [x, z] = tr.at(L.s > 0 ? e.patrolU : 1 - e.patrolU)
        e.x = x
        e.z = z
        e.tx = x
        e.tz = z
        e.patrolTrack = L.e
        e.patrolDir = L.s
      },
    }
  }, [gameKey, waveOn, waveSpawned, done, checkpoint, current])

  const advance = () => {
    const line = lines[lineIdx]
    if (shown < line.text.length) {
      setShown(line.text.length)
      return
    }
    if (lineIdx + 1 < lines.length) {
      setLineIdx(lineIdx + 1)
      setShown(0)
      return
    }
    const next = phase.split(':')[1] || 'play'
    setLines([])
    setPhase(next)
    if (next === 'after' && afterTalk.current) {
      const fn = afterTalk.current
      afterTalk.current = null
      fn()
    }
    if (next === 'ask') setAskOpen(true)
  }

  useEffect(() => {
    if (!lines.length) return
    dialogOpen()
    duckMusic(true)
    const line = lines[lineIdx]
    setShown(0)
    let i = 0
    const id = setInterval(() => {
      if (shownNow.current >= line.text.length) return clearInterval(id)
      i++
      setShown(i)
      textBlip(line.speaker)
    }, 1000 / TYPE_CPS)
    return () => {
      clearInterval(id)
      duckMusic(false)
    }
  }, [lines, lineIdx])

  const talkToEmmy = () => {
    emmyTalking.current = true
    say(
      emmyAdvice16({
        current,
        done,
        goal,
        tape,
        here,
        enemies,
        patrolStep,
        waveOn,
        siteName: current ? SITE[current].name : '',
      }),
    )
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyE' && nearEmmy && phase === 'play') talkToEmmy()
      if (TOOL_KEYS[e.code]) {
        if (e.code === 'KeyQ') setTool((t) => (t === 'lash' ? 'clasp' : 'lash'))
        else setTool(TOOL_KEYS[e.code])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nearEmmy, phase])

  useEffect(() => {
    if (goal?.type !== 'patrol' || !waveSpawned || current !== 'patrol_yard') return
    // the engine drops a site from `enemies` once nothing is alive there, so "0" is `undefined`; wait until the wave has appeared first
    if (enemies.patrol_yard > 0) waveSeen.current = true
    else if (waveSeen.current) advanceGoal('patrol_yard', goal.done)
  }, [enemies, goal, waveSpawned, current, advanceGoal])

  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  const playEnabled = phase === 'play' && !askOpen && !lines.length
  const talking = lines.length > 0
  const canTalk = nearEmmy && playEnabled
  const line = lines[lineIdx]
  useDialogKeys(!!line, advance)
  const atStation = current && here.site === current && met[current]
  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen ? 'Walk north through the gate to Glue Works' : current ? `Decks ${nDone}/4 · next: ${SITE[current].name}` : ''

  const scene = (
    <FreeWordScene
      layout={layout}
      sites={SITES}
      tracksBySite={TRACKS}
      current={current}
      progressRef={progressRef}
      stateRef={stateRef}
      frameRef={frameRef}
      emmyAt={emmyAt}
      emmyTalking={emmyTalking}
      nearEmmy={nearEmmy}
      checkpoint={checkpoint}
      gameKey={gameKey}
      game={game}
      walkable={walkable}
      spawnRef={spawnRef}
      ribbonApi={ribbonApi}
      playEnabled={playEnabled}
      tool={tool}
      onAction={onAction}
      onEnemies={setEnemies}
      onHearts={setHearts}
      tape={tape}
      clasped={clasped}
      exitOpen={exitOpen}
      emmyNear={nearEmmy && phase === 'play'}
    />
  )

  if (import.meta.env.DEV)
    window.__lvl1_6 = {
      stateRef,
      tape,
      done,
      goal,
      click: (x, z) => stateRef.current && ((stateRef.current.x = x), (stateRef.current.z = z)),
      setTool,
      advanceGoal: () => current && advanceGoal(current, []),
      patrolApi,
    }

  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'lap') return `Run a full lap on loop ${goal.track ? 'b (violet)' : 'a (red)'} ${goal.dir < 0 ? 'backward' : 'forward'} from the beacon`
    if (goal.type === 'tape') return `Reduced tape should read: ${goal.tokens.replace(/-/g, '⁻¹ ')}`
    if (goal.type === 'reduce') return `Cancel ${goal.from} down to ${goal.to || 'empty'}`
    if (goal.type === 'ask') return 'Answer Emmy'
    if (goal.type === 'clasp') return 'Van Kampen Clasp (5): click the beacon'
    if (goal.type === 'patrol') return `Lash patrol in reverse order (${patrolStep}/4)`
    return 'Walk laps from the beacon · watch the tape'
  })()

  return (
    <div className="screen level">
      <Canvas camera={{ position: [0, 11, 30], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        {scene}
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
            <span className="lvl-kicker">World 1 · Level 6 · Free-Word Forge</span>
            <h2>{levelMeta?.title || 'Free Word Play'}</h2>
            <div className="hud">
              <span className="hearts">{[0, 1, 2].map((i) => (i < hearts ? '♥' : '♡'))}</span>
              <span className="objective">{objective}</span>
            </div>
            {here.site && (
              <div className="here">
                <strong>{SITE[here.site]?.name}</strong>
                {done[here.site] ? ' · finished' : enemies[here.site] ? ` · spawn: ${enemies[here.site]}` : ' · clear'}
              </div>
            )}
          </div>
        </div>

        {atStation && (
          <div className="rules-panel forge-panel works-panel w16-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            <p className="cells-line">
              Tape: <b className="rule-math">{wordText(tape)}</b>
              {tape.length ? ` (${tape.length} letters, ${reduceFree(tape).length} reduced)` : ''}
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
          <button type="button" className="btn talk-btn" onClick={talkToEmmy}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}
        {!levelClear && !line && !askOpen && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Free-Word Forge" />}

        {!talking && !levelClear && !askOpen && (
          <div className="controls">
            <div className="weapons">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={() => setTool('lash')}>
                ⚡ {WORLD_TOOLS.lash.label} <kbd>{WORLD_TOOLS.lash.key}</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'clasp' ? 'active' : ''}`} onClick={() => setTool('clasp')}>
                ⧉ {WORLD_TOOLS.clasp.label} <kbd>{WORLD_TOOLS.clasp.key}</kbd>
              </button>
            </div>
          </div>
        )}
        {playEnabled && !toast && <div className="hint">{atStation ? stepText : 'WASD · 1 Lash · 5 Van Kampen Clasp · Q cycle · lost? talk to Emmy (E)'}</div>}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-1-6-lesson"
          Scene={FreeWordLesson}
          Overlay={FreeWordLessonOverlay}
          kicker="World 1 · Level 6 · Lesson"
          name="Free Words"
          embedded
          onDone={() => (setLesson(false), startFreeWordMusic())}
          onSkip={() => (setLesson(false), startFreeWordMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 1 · Level 6 clear</span>
            <h2>{levelMeta?.title || 'Free Word Play'}</h2>
            <p className="def">{DEFINITION16.text}</p>
            <p className="cite">
              {DEFINITION16.cite}{' '}
              <a href={DEFINITION16.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: 1-7 · Glue Job (Van Kampen relations).</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ 1-7
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
