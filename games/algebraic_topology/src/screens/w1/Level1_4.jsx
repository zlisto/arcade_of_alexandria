import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BasinScene from '../../levels/w1/BasinScene'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import { useExitTrigger } from '../exitTrigger'
import {
  DEFINITION,
  HINTS,
  OPENING,
  STATIONS,
  STATION_ORDER,
  emmyAdvice14,
} from '../../levels/w1/stages1_4'
import {
  antipode,
  fieldAngle,
  hasAntipodalMatch,
  makeRimTracker,
  readingsMatch,
  retractionImpossible,
  unitRoots,
} from '../../levels/w1/brouwer'
import layout from '../../world/basin.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxRefuse,
  sfxWrong,
  sfxZoot,
  startBasinMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'
import NoWayOutLesson, { NoWayOutLessonOverlay } from '../../movies/w1/NoWayOutLesson'
import MathText from '../MathText'

const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const TOOL_KEYS = { Digit1: 'lash', Digit4: 'cord' }
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

export default function Level1_4({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-4')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [met, setMet] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() =>
    skipTo ? [SITE[STATION_ORDER[skipTo]].pos[0] + 1.2, SITE[STATION_ORDER[skipTo]].pos[1] + 3.2] : layout.start,
  )
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('cord')
  const [exitOpen, setExitOpen] = useState(false)
  const [levelClear, setLevelClear] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [here, setHere] = useState({ site: null, pos: checkpoint })
  const [seen, setSeen] = useState({})
  const [basinState, setBasinState] = useState({
    retractorSeized: skipTo > 0,
    stillFound: {},
    foundRoots: {},
    pairPick: { a: null, b: null },
    rimWinding: {},
  })
  const [waveOn, setWaveOn] = useState(false)
  const [waveSeen, setWaveSeen] = useState(0)

  const stateRef = useRef(null)
  const frameRef = useRef(null)
  const spawnRef = useRef(null)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: layout.start[0] - 1.2, z: layout.start[1] - 0.8, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)
  const rimTrackers = useRef(
    Object.fromEntries(
      STATION_ORDER.filter((id) => SITE[id]?.rimRadius).map((id) => {
        const s = SITE[id]
        return [id, makeRimTracker([s.pos[0], s.pos[1]], s.rimRadius)]
      }),
    ),
  )

  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null

  const flash = (text, ms = 2800) => {
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

  const advanceGoal = useCallback(
    (station, ls = []) => {
      const list = STATIONS[station].goals
      const curG = list[goalIdx[station] || 0]
      // the goal marked `wave` releases the drones when it finishes; the following `guard` goal waits for them to be cleared
      if (curG?.wave && SITE[station].wave) {
        setWaveOn(true)
        spawnRef.current?.(
          SITE[station].wave.map(([type, x, z]) => ({
            type,
            x: x + SITE[station].pos[0],
            z: z + SITE[station].pos[1],
            site: station,
          })),
        )
      }
      const next = (goalIdx[station] || 0) + 1
      // an `exit` goal is just "walk out the gate": the deck is finished when it comes up, and the gate opens
      if (next >= list.length || list[next]?.type === 'exit') {
        setDone((d) => ({ ...d, [station]: true }))
        setCheckpoint([SITE[station].pos[0] + 1.2, SITE[station].pos[1] + 3.2])
        if (station === 'antipodes') {
          afterTalk.current = () => {
            sfxZoot()
            setExitOpen(true)
          }
          return say(ls, 'after')
        }
        return say(ls)
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      return say(ls)
    },
    [goalIdx, say],
  )

  useEffect(() => {
    unlockAudio()
    startBasinMusic()
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

  const once = useCallback(
    (key, ls, fallback) => {
      if (!seen[key]) {
        setSeen((m) => ({ ...m, [key]: true }))
        say(ls)
      } else flash(fallback, 3400)
    },
    [say, seen],
  )

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
      const target = current
        ? [SITE[current].pos[0] + SITE[current].emmy[0], SITE[current].pos[1] + SITE[current].emmy[1]]
        : layout.start
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
      } else e.walk = 0
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

  // guard goal
  useEffect(() => {
    if (!current || goal?.type !== 'guard') return
    if (waveOn && enemies[current] > 0) setWaveSeen((n) => Math.max(n, enemies[current]))
    if (waveOn && waveSeen > 0 && (enemies[current] || 0) === 0) {
      setWaveOn(false)
      advanceGoal(current, goal.done)
    }
  }, [advanceGoal, current, enemies, goal, waveOn, waveSeen])

  const onTrackMove = useCallback(
    (x, z) => {
      if (!current || !goal || goal.type !== 'rim') return
      const site = SITE[current]
      if (!site?.rimRadius) return
      if (!site.containsWorld(x, z)) return
      const tr = rimTrackers.current[current]
      const ev = tr.update(x, z, goal.winding)
      if (ev?.event === 'done') {
        if (ev.winding === goal.winding) {
          sfxCorrect()
          setBasinState((b) => ({ ...b, rimWinding: { ...b.rimWinding, [current]: ev.winding } }))
          advanceGoal(current, goal.done)
        } else {
          sfxWrong()
          once(`rim-wrong-${current}`, [HINTS.wrongRim(goal.winding)], `Need ${goal.winding} turn(s) on this rim.`)
          tr.reset()
        }
      }
    },
    [advanceGoal, current, goal, once],
  )

  const onAction = useCallback(
    (gx, gz, cx, cz) => {
      if (phase !== 'play' || !current || !goal) return
      const site = SITE[current]
      if (!site.containsWorld(cx, cz)) return
      const lx = cx - site.pos[0]
      const lz = cz - site.pos[1]

      if (goal.type === 'shrink' && current === 'retractor') {
        const d = Math.hypot(lx, lz)
        if (d > site.rimRadius - 1.2) {
          flash('Click the basin floor inside the rim road.')
          sfxRefuse()
          return
        }
        if (retractionImpossible(1, 0)) {
          sfxCorrect()
          setBasinState((b) => ({ ...b, retractorSeized: true }))
          advanceGoal(current, goal.done)
        }
        return
      }

      if (goal.type === 'still' && site.field) {
        const f = site.field
        const near = Math.hypot(lx - f.still[0], lz - f.still[1]) < 0.75
        if (near) {
          sfxCorrect()
          setBasinState((b) => ({ ...b, stillFound: { ...b.stillFound, [current]: true } }))
          advanceGoal(current, goal.done)
        } else {
          sfxWrong()
          once('not-still', HINTS.notStill, 'Not the still tile.')
        }
        return
      }

      if (goal.type === 'roots' && site.field?.kind === 'poly') {
        const roots = unitRoots(site.field.degree, 2.15)
        const hit = roots.findIndex((r) => Math.hypot(lx - r.x, lz - r.z) < 0.65)
        if (hit < 0) {
          sfxWrong()
          once('bad-root', HINTS.wrongRoot, 'Not a root.')
          return
        }
        setBasinState((b) => {
          const prev = b.foundRoots[current] || []
          if (prev.includes(hit)) return b
          const next = [...prev, hit]
          sfxCorrect()
          if (next.length >= goal.count) setTimeout(() => advanceGoal(current, goal.done), 0)
          return { ...b, foundRoots: { ...b.foundRoots, [current]: next } }
        })
        return
      }

      if (goal.type === 'pair' && site.stations) {
        const hit = site.stations.find((st) => Math.hypot(lx - st.x, lz - st.z) < 0.75)
        if (!hit) {
          flash(HINTS.tooFar('a station'))
          return
        }
        setBasinState((b) => {
          const { a, b: pb } = b.pairPick
          if (!a) return { ...b, pairPick: { a: hit.id, b: null } }
          if (a === hit.id) return b
          const sa = site.stations.find((s) => s.id === a)
          const [ax, az] = antipode(sa.x, sa.z, site.sphereRadius)
          const antipodal = Math.hypot(hit.x - ax, hit.z - az) < 0.85
          if (antipodal && readingsMatch(sa.readings, hit.readings)) {
            sfxCorrect()
            setTimeout(() => advanceGoal(current, goal.done), 0)
            return { ...b, pairPick: { a, b: hit.id } }
          }
          sfxWrong()
          once('bad-pair', HINTS.wrongPair, 'Not a matching antipodal pair.')
          return { ...b, pairPick: { a: null, b: null } }
        })
      }
    },
    [advanceGoal, current, goal, once, phase],
  )

  const knockout = useCallback(() => {
    setHearts(3)
    setKnockouts((k) => k + 1)
    say(HINTS.knockout)
  }, [say])

  useEffect(() => {
    if (hearts === 0) knockout()
  }, [hearts, knockout])

  const line = lines[lineIdx]
  const talking = phase.startsWith('talk:')
  const advanceRef = useRef(null)
  const advance = useCallback(() => {
    if (shown < (line?.text?.length || 0)) {
      setShown(line.text.length)
      return
    }
    if (lineIdx + 1 < lines.length) {
      setLineIdx((i) => i + 1)
      setShown(0)
      return
    }
    const next = phase.split(':')[1] || 'play'
    setLines([])
    setPhase(next === 'after' ? 'play' : next) // 'after' only means "run afterTalk"; play must resume either way
    if (next === 'after' && afterTalk.current) {
      const fn = afterTalk.current
      afterTalk.current = null
      fn()
    }
  }, [line, lineIdx, lines.length, phase, shown])

  advanceRef.current = advance
  useEffect(() => {
    if (!line) return
    dialogOpen()
    duckMusic(true)
    let i = 0
    setShown(0) // every line types out from the start (a new say() used to inherit the last line's full length)
    const id = setInterval(() => {
      i += 1
      setShown((n) => Math.max(n, i))
      if (i >= line.text.length) clearInterval(id)
      else textBlip()
    }, 1000 / TYPE_CPS)
    return () => {
      clearInterval(id)
      duckMusic(false)
    }
  }, [line, lineIdx])

  useEffect(() => {
    const onKey = (e) => {
      if (TOOL_KEYS[e.code]) setTool(TOOL_KEYS[e.code])
      if (e.code === 'KeyE' && nearEmmy && phase === 'play') {
        emmyTalking.current = true
        say(emmyAdvice14({
          current,
          goal,
          stationId: here.site,
          siteName: (id) => SITE[id]?.name || id,
          enemies: here.site ? enemies[here.site] : 0,
          progress: {
            rim: basinState.rimWinding[current],
            roots: (basinState.foundRoots[current] || []).length,
          },
        }))
        setTimeout(() => {
          emmyTalking.current = false
        }, 400)
      }
      if ((e.code === 'Space' || e.code === 'Enter') && talking) {
        e.preventDefault()
        advanceRef.current?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [basinState, current, enemies, goal, here.site, nearEmmy, phase, say, talking])

  const playEnabled = phase === 'play' && !lesson && !levelClear
  const gameKey = `basin:${knockouts}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
    }
    return { mode: 'overworld', bySite: true, start: checkpoint, enemies: list }
  }, [checkpoint, done, gameKey])

  const FRAME = { retractor: 8.8, still_point: 8.6, roots: 8.6, antipodes: 8.4 }
  frameRef.current =
    current && here.site === current && met[current]
      ? { center: [SITE[current].pos[0] + 1.0, SITE[current].pos[1] + 0.3], size: FRAME[current], follow: 0.12 }
      : null

  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  if (import.meta.env.DEV) {
    window.__lvl1_4 = {
      done,
      goalIdx,
      current,
      goal,
      basinState,
      phase,
      setTool,
      advanceGoal,
      SITE,
      hasMatch: () => hasAntipodalMatch(SITE.antipodes.stations, SITE.antipodes.sphereRadius),
    }
  }

  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen
    ? 'Walk through the north gate'
    : current
      ? `Decks ${nDone}/4 · next: ${SITE[current].name}`
      : ''
  const atStation = current && here.site === current && met[current]
  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'rim') return `Winding Cord (4): walk the rim — need ${goal.winding} turn${goal.winding === 1 ? '' : 's'}`
    if (goal.type === 'shrink') return 'Click the basin floor inside the rim to shrink a loop'
    if (goal.type === 'still') return 'Click the still tile (arrow fades)'
    if (goal.type === 'roots') return `Click each root whirlpool (${(basinState.foundRoots[current] || []).length}/${goal.count})`
    if (goal.type === 'pair') return 'Click a station, then its opposite with matching numbers'
    if (goal.type === 'guard') return 'Lash retractor drones (1) until the wave is clear'
    if (goal.type === 'exit') return 'Walk north through the gate'
    return 'Lash (1) · Winding Cord (4)'
  })()

  return (
    <div className="screen level w1-14-level">
      <Canvas camera={{ position: [0, 11, 30], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        <BasinScene
          layout={layout}
          sites={SITES}
          current={current}
          basinState={basinState}
          emmyAt={emmyAt}
          emmyTalking={emmyTalking}
          emmyNear={nearEmmy && phase === 'play'}
          exitOpen={exitOpen}
          walkable={walkable}
          game={game}
          gameKey={gameKey}
          stateRef={stateRef}
          frameRef={frameRef}
          spawnRef={spawnRef}
          playEnabled={playEnabled}
          tool={tool}
          onAction={onAction}
          onTrackMove={onTrackMove}
          onEnemies={setEnemies}
          onHearts={setHearts}
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
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())}>
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 1 · Level 4 · Brouwer&apos;s Basin</span>
            <h2>{levelMeta?.title || 'No Way Out'}</h2>
            <div className="hud">
              <span className="hearts" aria-label={`${hearts} hearts`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < hearts ? 'heart' : 'heart lost'}>
                    ♥
                  </span>
                ))}
              </span>
              <span className="objective">{objective}</span>
            </div>
            {here.site && SITE[here.site] && (
              <div className="here">
                <strong>{SITE[here.site].name}</strong>
                {done[here.site] ? ' · finished' : enemies[here.site] ? ` · spawn: ${enemies[here.site]}` : ' · clear'}
              </div>
            )}
          </div>
        </div>

        {atStation && (
          <div className="rules-panel forge-panel works-panel w1-14-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            {goal?.type === 'rim' && (
              <p className="cells-line">
                Cord progress: <b>{Math.round((rimTrackers.current[current]?.progress?.(goal.winding) || 0) * 100)}%</b>
              </p>
            )}
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

        {nearEmmy && phase === 'play' && !levelClear && (
          <button type="button" className="btn talk-btn" onClick={() => say(emmyAdvice14({ current, goal, stationId: here.site, siteName: (id) => SITE[id]?.name, enemies: enemies[here.site] || 0, progress: { rim: basinState.rimWinding[current], roots: (basinState.foundRoots[current] || []).length } }))}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}

        {!levelClear && !line && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Brouwer's Basin" />}

        {!talking && !levelClear && (
          <div className="controls">
            <div className="weapons" role="group" aria-label="Tool">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={() => setTool('lash')}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'cord' ? 'active' : ''}`} onClick={() => setTool('cord')}>
                ◎ Winding Cord <kbd>4</kbd>
              </button>
            </div>
          </div>
        )}
        {playEnabled && !toast && <div className="hint">{atStation ? stepText : 'WASD to move · 1 Lash · 4 Winding Cord · E talk to Emmy'}</div>}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-1-4-lesson"
          Scene={NoWayOutLesson}
          Overlay={NoWayOutLessonOverlay}
          kicker="World 1 · Level 4 · Lesson"
          name="No Way Out"
          embedded
          onDone={() => (setLesson(false), startBasinMusic())}
          onSkip={() => (setLesson(false), startBasinMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 1 · Level 4 clear</span>
            <h2>{levelMeta?.title || 'No Way Out'}</h2>
            <p className="def">{DEFINITION.text}</p>
            <p className="cite">
              {DEFINITION.cite}{' '}
              <a href={DEFINITION.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: Torus Terraces — Push It Forward.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ Push It Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
