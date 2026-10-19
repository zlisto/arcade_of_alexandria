import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EndpointGardensScene from '../../levels/w1/EndpointGardensScene'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import { useExitTrigger } from '../exitTrigger'
import {
  DEFINITION,
  HINTS,
  OPENING,
  STATIONS,
  STATION_ORDER,
  WRONG,
  emmyAdvice11,
} from '../../levels/w1/stages1_1'
import {
  classOfChainRoutes,
  homotopicRelEndpoints,
  linearHomotopy,
  routeClass,
  validateLedger,
} from '../../levels/w1/routes'
import layout from '../../world/endpointGardens.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setGlassTick,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxRefuse,
  sfxWrong,
  sfxZoot,
  sfxExit,
  sfxLedger,
  startBastionMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'
import EndpointsLesson, { EndpointsLessonOverlay } from '../../movies/w1/EndpointsLesson'
import MathText from '../MathText'
import { WORLD_TOOLS } from '../../levels/w0/worldTools'

const startLevelMusic = startBastionMusic

const TYPE_CPS = 45
const SCRUB_PER_SEC = 0.24
const SLIDE_MATCH = 0.12
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const TOOLS = ['lash', 'spool', 'glass']
const TOOL_KEYS = { Digit1: 'lash', Digit2: 'spool', Digit3: 'glass' }

const stationAt = (x, z) => SITES.find((s) => s.stage === 'station' && s.containsWorld(x, z)) || null

function envFor(site) {
  const g = site.gates
  const routes = site.routes || {}
  const canonical = routes.L1 || routes.straight || routes.slow || Object.values(routes)[0]
  return { gates: { a: g.a, b: g.b || g.c }, hedges: site.hedges || [], canonical, routes }
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

export default function Level1_1({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-1') || concept?.worlds?.[0]?.levels?.find((l) => l.id === '1-1')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [ledger, setLedger] = useState(() => Object.fromEntries(STATION_ORDER.map((id) => [id, {}])))
  const [paceConfirmed, setPaceConfirmed] = useState(false)
  const [chainSwap, setChainSwap] = useState(false)
  const [met, setMet] = useState({})
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
  const [tool, setTool] = useState('spool')
  const [glassT, setGlassTState] = useState(0)
  const glassTRef = useRef(0)
  const setGlassT = useCallback((v) => {
    const c = Math.min(1, Math.max(0, typeof v === 'function' ? v(glassTRef.current) : v))
    glassTRef.current = c
    setGlassTState(c)
  }, [])
  const [exitOpen, setExitOpen] = useState(false)
  const [levelClear, setLevelClear] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [here, setHere] = useState({ site: null, pos: checkpoint })
  const [seen, setSeen] = useState({})
  const [selectedRoute, setSelectedRoute] = useState(null)
  const stateRef = useRef(null)
  const frameRef = useRef(null)
  const spawnRef = useRef(null)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: layout.start[0] - 1, z: layout.start[1] - 0.8, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)
  const waveSpawned = useRef(false)

  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null
  const site = current ? SITE[current] : null

  const extraSegs = exitOpen ? [[layout.exit.a, layout.exit.b]] : []
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, extraSegs), [exitOpen])

  const flash = (text, ms = 2800) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  const ribbonApi = useRef(null)
  ribbonApi.current = {
    target: () => null,
    snip: () => false,
    // a hedge-sprout that finishes rooting: the bed is only a threat, so it uproots again; say so
    sproutHedge: () => {
      flash('A hedge-sprout is taking root — lash it before it blocks the route!')
      return false
    },
  }

  const say = useCallback((ls, next = 'play') => {
    setLines(ls)
    setLineIdx(0)
    setPhase(ls.length ? 'talk:' + next : next)
  }, [])

  const advanceGoal = useCallback(
    (station, lines = []) => {
      const list = STATIONS[station].goals
      const curG = list[goalIdx[station] || 0]
      if (curG?.wave && !waveSpawned.current) {
        waveSpawned.current = true
        spawnRef.current?.(
          (SITE[station].wave || []).map(([type, x, z]) => ({
            type,
            x: x + SITE[station].pos[0],
            z: z + SITE[station].pos[1],
            site: station,
          })),
        )
      }
      const next = (goalIdx[station] || 0) + 1
      if (next >= list.length) {
        setDone((d) => {
          const nd = { ...d, [station]: true }
          if (STATION_ORDER.every((id) => nd[id])) {
            sfxZoot()
            setExitOpen(true)
          }
          return nd
        })
        setCheckpoint([SITE[station].pos[0] + 1, SITE[station].pos[1] + 3])
        return say(lines)
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      say(lines)
    },
    [done, goalIdx, say],
  )

  useEffect(() => {
    unlockAudio()
    startLevelMusic()
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

  useEffect(() => setGlassTick(tool === 'glass'), [tool])

  // camera frame
  useEffect(() => {
    if (!site || phase.startsWith('talk')) return
    const r = site.def.add[0].r || 5
    const w = site.def.add[0].type === 'rect' ? site.def.add[0].x1 - site.def.add[0].x0 : r * 2
    frameRef.current = { center: [site.pos[0] + 1, site.pos[1] + 0.3], size: w > 10 ? 12.6 : r > 5.2 ? 8.8 : 8, follow: 0.12 }
  }, [site, phase])

  // arrival
  useEffect(() => {
    if (!current || phase !== 'play') return
    const st = here.site
    if (st === current && !met[current]) {
      setMet((m) => ({ ...m, [current]: true }))
      say(STATIONS[current].arrive)
    } else if (st && st !== current && !done[st] && STATIONS[st]?.early && !seen[`early-${st}`]) {
      setSeen((s) => ({ ...s, [`early-${st}`]: true }))
      say(STATIONS[st].early)
    }
  }, [here.site, current, met, done, phase, say, seen])

  // slide goal check
  useEffect(() => {
    if (!goal || goal.type !== 'slide' || !site || tool !== 'glass' || phase !== 'play') return
    const [a, b] = goal.pair
    const ra = site.routes[a]
    const rb = site.routes[b]
    if (!ra || !rb) return
    const ghost = linearHomotopy(ra, rb, glassT)
    const ref = rb
    let maxD = 0
    const n = Math.min(ghost.length, ref.length)
    for (let i = 0; i < n; i++) maxD = Math.max(maxD, Math.hypot(ghost[i][0] - ref[i][0], ghost[i][1] - ref[i][1]))
    if (maxD < SLIDE_MATCH && glassT > 0.85) {
      sfxCorrect()
      advanceGoal(current, STATIONS[current].goals[gi].done)
    }
  }, [glassT, goal, site, tool, phase, advanceGoal, current, gi])

  const assignBin = (cls) => {
    if (!selectedRoute || !current) return
    setLedger((L) => ({
      ...L,
      [current]: { ...L[current], [selectedRoute]: cls },
    }))
    setSelectedRoute(null)
    sfxLedger()
  }

  const checkLedger = () => {
    if (!site || !goal || goal.type !== 'ledger') return
    const routes = site.routes
    const assign = ledger[current]
    const env = envFor(site)
    const v = validateLedger(assign, routes, env)
    if (!v.ok) {
      sfxWrong()
      once('ledger-wrong', WRONG.ledgerMix, 'Those routes don’t share a slide — check the hedge.')
      return
    }
    if (goal.expectClasses && v.classes !== goal.expectClasses) {
      sfxRefuse()
      flash(`Need ${goal.expectClasses} class${goal.expectClasses > 1 ? 'es' : ''} on the ledger.`)
      return
    }
    advanceGoal(current, goal.done)
  }

  const once = (key, ls, fallback) => {
    if (!seen[key]) {
      setSeen((m) => ({ ...m, [key]: true }))
      say(ls)
    } else flash(fallback, 3400)
  }

  const confirmPace = () => {
    if (!site || goal?.type !== 'pace') return
    const env = envFor(site)
    if (homotopicRelEndpoints(site.routes.slow, site.routes.fast, env)) {
      setPaceConfirmed(true)
      sfxCorrect()
      advanceGoal(current, goal.done)
    } else {
      sfxWrong()
      flash('Same image, different steps — still one class.')
    }
  }

  const confirmChain = () => {
    if (!site || goal?.type !== 'chain') return
    const g = site.gates
    const r = site.routes
    const chainEnv = { gates: { a: g.a, b: g.b, c: g.c }, hedges: site.hedges, canonical: r.AC_left }
    const ab = chainSwap ? r.AB_right : r.AB_left
    const bc = chainSwap ? r.BC_right : r.BC_left
    const c1 = classOfChainRoutes(ab, bc, chainEnv)
    const c2 = classOfChainRoutes(ab, chainSwap ? r.BC_left : r.BC_right, chainEnv)
    if (c1 === c2) {
      sfxCorrect()
      advanceGoal(current, goal.done)
    } else {
      sfxWrong()
      once('chain', HINTS.refuse.chain, 'Swap only the middle leg for a route in the same class.')
    }
  }

  const guardClear = useCallback(() => {
    if (goal?.type === 'guard' && current && !enemies[current]) advanceGoal(current, goal.done)
  }, [goal, current, enemies, advanceGoal])

  useEffect(() => {
    guardClear()
  }, [guardClear, enemies])

  const advance = () => {
    const line = lines[lineIdx]
    if (shown < line.text.length) {
      setShown(line.text.length)
      return
    }
    if (lineIdx + 1 < lines.length) {
      setLineIdx(lineIdx + 1)
      setShown(0)
      dialogOpen()
      return
    }
    const next = phase.split(':')[1] || 'play'
    setLines([])
    setPhase(next)
    if (next === 'after' && afterTalk.current) {
      afterTalk.current()
      afterTalk.current = null
    }
  }

  useEffect(() => {
    if (!lines.length) return
    emmyTalking.current = lines[lineIdx]?.speaker === 'Emmy Boundary'
    duckMusic(true)
    dialogOpen()
    setShown(0)
    let i = 0
    const tick = () => {
      if (i >= lines[lineIdx].text.length) return
      if (shownNow.current >= lines[lineIdx].text.length) return
      i++
      setShown(i)
      textBlip(lines[lineIdx].speaker)
      setTimeout(tick, 1000 / TYPE_CPS)
    }
    tick()
    return () => duckMusic(false)
  }, [lines, lineIdx])

  const gameKey = knockouts
  const gameEnemies = useMemo(() => {
    const list = []
    for (const s of SITES) {
      for (const [type, dx, dz] of s.enemies || []) {
        list.push({ type, x: s.pos[0] + dx, z: s.pos[1] + dz, site: s.id })
      }
    }
    return list
  }, [])

  useExitTrigger(exitOpen && !levelClear, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  const playEnabled = phase === 'play' && !lesson
  const talking = phase.startsWith('talk')
  const line = talking ? lines[lineIdx] : null
  const canTalk = nearEmmy && playEnabled && !line

  const talkToEmmy = () => {
    const st = SITE[current]
    say(
      emmyAdvice11({
        station: current,
        stationName: st?.name,
        name: st?.name,
        here: here.site,
        goal,
        exitOpen,
        enemies: enemies[current],
      }),
    )
  }

  useEffect(() => {
    const onKey = (e) => {
      if (talking) return
      if (e.code === 'KeyE' && canTalk) talkToEmmy()
      if (TOOL_KEYS[e.code]) setTool(TOOL_KEYS[e.code])
      if (e.code === 'KeyQ') setTool((w) => TOOLS[(TOOLS.indexOf(w) + 1) % TOOLS.length])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const glassActive = tool === 'glass' && playEnabled && goal?.type === 'slide'
  useEffect(() => {
    if (!glassActive) return
    let raf
    let last = performance.now()
    const step = (now) => {
      const dt = (now - last) / 1000
      last = now
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    const down = (e) => {
      if (e.code === 'KeyZ') setGlassT((t) => t - SCRUB_PER_SEC * 0.05)
      if (e.code === 'KeyX') setGlassT((t) => t + SCRUB_PER_SEC * 0.05)
    }
    const wheel = (e) => setGlassT((t) => t + Math.sign(e.deltaY) * 0.012)
    window.addEventListener('keydown', down)
    window.addEventListener('wheel', wheel, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', down)
      window.removeEventListener('wheel', wheel)
    }
  }, [glassActive, setGlassT])

  useEffect(() => {
    const tick = () => {
      const s = stateRef.current
      if (!s) return
      const st = stationAt(s.x, s.z)
      setHere({ site: st?.id || null, pos: [s.x, s.z] })
      const em = st ? SITE[st.id] : null
      if (em?.emmy) {
        const [ex, ez] = em.toWorld(em.emmy[0], em.emmy[1])
        emmyAt.current.x = ex
        emmyAt.current.z = ez
        setNearEmmy(Math.hypot(s.x - ex, s.z - ez) < 2.4)
      } else setNearEmmy(false)
    }
    const id = setInterval(tick, 120)
    return () => clearInterval(id)
  }, [])

  if (import.meta.env.DEV)
    window.__lvl1_1 = {
      here,
      done,
      goalIdx,
      ledger,
      phase,
      glassT,
      setGlassT,
      setTool,
      current,
      goal,
      assignBin,
      checkLedger,
      confirmChain,
      chainSwap,
      setChainSwap,
      enemies,
    }

  const slidePair = goal?.type === 'slide' ? goal.pair : null
  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen ? 'Walk north through the garden exit' : current ? `Gardens ${nDone}/4 · ${SITE[current].name}` : ''

  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'slide') return 'Tide Glass (3): scrub t with Z / X until routes match'
    if (goal.type === 'ledger') return selectedRoute ? 'Pick a ledger bin (I or II)' : 'Click a route, then a bin · Confirm when sorted'
    if (goal.type === 'pace') return 'Confirm the fast route is the same class'
    if (goal.type === 'chain') return chainSwap ? 'Confirm swap keeps the chain class' : 'Chain routes · toggle swap · confirm'
    if (goal.type === 'guard') return 'Lash hedge spawn (1) before they root'
    return `${WORLD_TOOLS.spool.label} (2) · ${WORLD_TOOLS.glass.label} (3)`
  })()

  const routeIds = site?.routes ? Object.keys(site.routes) : []

  return (
    <div className="screen level w1-1-level">
      <Canvas camera={{ position: [0, 11, 28], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        <EndpointGardensScene
          layout={layout}
          sites={SITES}
          walkable={walkable}
          current={current}
          frameRef={frameRef}
          checkpoint={checkpoint}
          gameKey={gameKey}
          enemies={gameEnemies}
          spawnRef={spawnRef}
          stateRef={stateRef}
          emmyAt={emmyAt}
          emmyTalking={emmyTalking}
          nearEmmy={nearEmmy}
          playEnabled={playEnabled}
          tool={tool}
          ribbonApi={ribbonApi}
          onEnemies={setEnemies}
          onHearts={(h) => {
            if (h <= 0) {
              setKnockouts((k) => k + 1)
              setHearts(3)
              say(HINTS.knockout)
            } else setHearts(h)
          }}
          ledger={ledger}
          glassT={glassT}
          slidePair={slidePair}
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
            <span className="lvl-kicker">World 1 · Level 1 · Endpoint Gardens</span>
            <h2>{levelMeta?.title || 'Fixed Endpoints'}</h2>
            <div className="hud">
              <span className="hearts">{[0, 1, 2].map((i) => (<span key={i} className={i < hearts ? 'heart' : 'heart lost'}>♥</span>))}</span>
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

        {current && here.site === current && goal && (
          <div className="rules-panel forge-panel works-panel w1-1-ledger-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            {goal.type === 'ledger' && (
              <div className="w1-1-route-picks">
                {routeIds.map((id) => (
                  <button key={id} type="button" className={`btn small ${selectedRoute === id ? 'primary' : ''}`} onClick={() => setSelectedRoute(id)}>
                    {id}
                    {ledger[current][id] != null ? ` · class ${ledger[current][id] + 1}` : ''}
                  </button>
                ))}
                <div className="btn-row">
                  <button type="button" className="btn small" onClick={() => assignBin(0)}>
                    Bin I
                  </button>
                  <button type="button" className="btn small" onClick={() => assignBin(1)}>
                    Bin II
                  </button>
                  <button type="button" className="btn primary small" onClick={checkLedger}>
                    Stamp ledger
                  </button>
                </div>
              </div>
            )}
            {goal.type === 'pace' && (
              <button type="button" className="btn primary small" onClick={confirmPace}>
                Same class
              </button>
            )}
            {goal.type === 'chain' && (
              <div className="btn-row">
                <button type="button" className="btn small" onClick={() => setChainSwap((s) => !s)}>
                  {chainSwap ? 'Middle leg: alt class' : 'Middle leg: default'}
                </button>
                <button type="button" className="btn primary small" onClick={confirmChain}>
                  Confirm chain class
                </button>
              </div>
            )}
            <p className="forgery-count">{stepText}</p>
          </div>
        )}

        {line && (
          <div className="dialog" onClick={advance}>
            <Portrait id={line.portrait || 'gyroid'} name={line.speaker} />
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
        {canTalk && (
          <button type="button" className="btn talk-btn" onClick={talkToEmmy}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}
        {!levelClear && !line && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Endpoint Gardens" />}
        {playEnabled && !levelClear && (
          <div className="controls">
            <div className="weapons">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={() => setTool('lash')}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'spool' ? 'active' : ''}`} onClick={() => setTool('spool')}>
                ◎ Spool <kbd>2</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'glass' ? 'active' : ''}`} onClick={() => setTool('glass')}>
                ◑ Tide Glass <kbd>3</kbd>
              </button>
            </div>
            <div className="hint">{stepText || 'WASD · lost? Talk to Emmy (E)'}</div>
          </div>
        )}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-1-1-lesson"
          Scene={EndpointsLesson}
          Overlay={EndpointsLessonOverlay}
          kicker="World 1 · Level 1 · Lesson"
          name="Fixed Endpoints"
          embedded
          onDone={() => (setLesson(false), startLevelMusic())}
          onSkip={() => (setLesson(false), startLevelMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 1 · Level 1 clear</span>
            <h2>{levelMeta?.title || 'Fixed Endpoints'}</h2>
            <p className="def">{DEFINITION.text}</p>
            <p className="cite">
              {DEFINITION.cite}{' '}
              <a href={DEFINITION.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: Loop de Loop — loops that come home to the beacon.</p>
            <div className="btn-row">
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ Loop de Loop
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
