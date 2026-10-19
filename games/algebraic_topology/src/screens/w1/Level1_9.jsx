import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SheetMusicScene from '../../levels/w1/SheetMusicScene'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import { useExitTrigger } from '../exitTrigger'
import {
  BUILD_PRESETS,
  ORDER_TWO_SHEET_AA,
  conjugateOrder,
  coverTwoSheetAA,
  letterText,
  nearestPort,
  orderMatches,
  parseWord,
  presetMatchesOrder,
  reduceWord,
  torusLift,
  treeStep,
} from '../../levels/w1/covers.js'
import { DEFINITION19, HINTS19, OPENING, STATIONS, STATION_ORDER, emmyAdvice19 } from '../../levels/w1/stages1_9.js'
import layout from '../../world/sheetstacks.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxRefuse,
  sfxWrong,
  sfxStackSwap,
  sfxZoot,
  startSheetCanonMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'
import SheetMusicLesson, { SheetMusicLessonOverlay } from '../../movies/w1/SheetMusicLesson'
import MathText from '../MathText'

const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const TOOL_KEYS = { Digit1: 'lash', Digit5: 'clasp', Digit6: 'compass' }
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

export default function Level1_9({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-9')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [presetIdx, setPresetIdx] = useState(0)
  const [base, setBase] = useState(0)
  const [treeWord, setTreeWord] = useState([])
  const [treeHits, setTreeHits] = useState({})
  const [torusHits, setTorusHits] = useState({})
  const [torusAsk, setTorusAsk] = useState(null)
  const [orderLabel, setOrderLabel] = useState(ORDER_TWO_SHEET_AA.label)
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
  const [tool, setTool] = useState('clasp')
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
  const emmyAt = useRef({ x: layout.start[0] - 1.2, z: layout.start[1] - 0.8, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)

  const cover = useMemo(() => {
    const c = BUILD_PRESETS[presetIdx] || coverTwoSheetAA()
    return { n: c.n, adj: c.adj.map((row) => ({ ...row })) }
  }, [presetIdx])

  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null
  const coverOk = goal?.type === 'cover' && presetMatchesOrder(presetIdx, base, goal.order)

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
  const once = (key, ls, fallback) => {
    if (!seen[key]) {
      setSeen((m) => ({ ...m, [key]: true }))
      say(ls)
    } else flash(fallback, 3400)
  }

  useEffect(() => {
    unlockAudio()
    startSheetCanonMusic()
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
        setCheckpoint([SITE[station].pos[0] + 1.2, SITE[station].pos[1] + 3.2])
        return say(ls)
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      return say(ls)
    },
    [done, goalIdx, say],
  )

  useEffect(() => {
    if (phase !== 'play' || !current || here.site !== current) return
    if (!met[current] && stationAt(here.pos[0], here.pos[1])?.id === current) {
      setMet((m) => ({ ...m, [current]: true }))
      say(STATIONS[current].arrive)
    }
  }, [here, current, met, phase, say])

  useEffect(() => {
    if (!goal || phase !== 'play' || here.site !== current) return
    if (goal.type === 'cover' && coverOk) {
      sfxCorrect()
      advanceGoal(current, goal.done)
    }
    if (goal.type === 'start' && base === goal.targetBase) {
      sfxCorrect()
      advanceGoal(current, goal.done)
    }
    if (goal.type === 'tree') {
      const all = (goal.targets || []).every((w) => treeHits[w])
      if (all) advanceGoal(current, goal.done)
    }
    if (goal.type === 'torus') {
      const all = (goal.loops || []).every((l) => torusHits[l.word])
      if (all) advanceGoal(current, goal.done)
    }
  }, [goal, coverOk, base, treeHits, torusHits, phase, here, current, advanceGoal])

  useEffect(() => {
    if (current === 'moving_start') setPresetIdx(2)
  }, [current])

  useEffect(() => {
    if (STATION_ORDER.every((id) => done[id]) && !exitOpen) {
      sfxZoot()
      setExitOpen(true)
    }
  }, [done, exitOpen])

  const onAction = useCallback(
    (gx, gz, cx, cz) => {
      if (phase !== 'play' || !current) return
      const site = stationAt(gx, gz)
      if (!site || site.id !== current) {
        flash('Walk onto the current deck first.')
        return
      }
      const lx = cx - site.pos[0]
      const lz = cz - site.pos[1]

      if (tool === 'clasp' && current === 'to_order') {
        const port = nearestPort(SITE.to_order.cover.ports, lx, lz, 1.5)
        if (!port) {
          once('clasp_far', HINTS19.wrongCover, 'Clasp (5) a glowing port on the glass.')
          sfxRefuse()
          return
        }
        setPresetIdx((i) => (i + 1) % BUILD_PRESETS.length)
        if (!presetMatchesOrder((presetIdx + 1) % BUILD_PRESETS.length, base, ORDER_TWO_SHEET_AA)) sfxWrong()
        else sfxCorrect()
        return
      }

      if (tool === 'compass' && current === 'endless_tree') {
        const branches = [
          { letter: 'a', x: 3.5, z: -1.2 },
          { letter: 'A', x: -3.5, z: -1.2 },
          { letter: 'b', x: 0.8, z: 3.8 },
          { letter: 'B', x: -0.8, z: 3.8 },
        ]
        const hit = branches.find((b) => Math.hypot(lx - b.x, lz - b.z) < 1.3)
        if (!hit) {
          sfxRefuse()
          flash('Compass (6) a gold branch tip.')
          return
        }
        const nw = treeStep(treeWord, hit.letter)
        setTreeWord(nw)
        const wStr = nw.map((L) => (L === 'A' ? 'A' : L === 'B' ? 'B' : L)).join('')
        if ((goal?.targets || []).includes(wStr)) {
          setTreeHits((h) => ({ ...h, [wStr]: true }))
          sfxCorrect()
        }
        return
      }

      if (tool === 'compass' && current === 'plane_torus') {
        const loops = goal?.loops || []
        const hit = loops.find((l) => Math.hypot(lx, lz + 2) < 2)
        if (!hit) {
          sfxRefuse()
          flash('Compass (6) a loop pedestal on the torus deck.')
          return
        }
        setTorusAsk(hit)
        return
      }
    },
    [phase, current, tool, presetIdx, base, treeWord, goal, once, flash],
  )

  const pickTorus = (m, n) => {
    if (!torusAsk) return
    const ans = torusAsk.answer
    const ok = ans[0] === m && ans[1] === n
    if (ok) {
      setTorusHits((h) => ({ ...h, [torusAsk.word]: true }))
      sfxCorrect()
    } else {
      once('torus_wrong', HINTS19.torus, 'Count grid steps from the origin.')
      sfxWrong()
    }
    setTorusAsk(null)
  }

  useEffect(() => {
    const tick = () => {
      const s = stateRef.current
      if (!s) return
      const x = s.x
      const z = s.z
      const site = stationAt(x, z)
      setHere({ site: site?.id || null, pos: [x, z] })
      if (current && site?.id === current) {
        const [ex, ez] = SITE[current].emmy
        emmyAt.current.x = site.pos[0] + ex
        emmyAt.current.z = site.pos[1] + ez
        setNearEmmy(Math.hypot(x - emmyAt.current.x, z - emmyAt.current.z) < 2.4)
      } else setNearEmmy(false)
    }
    const id = setInterval(tick, 120)
    return () => clearInterval(id)
  }, [current])

  useEffect(() => {
    const k = (e) => {
      if (e.code === 'KeyE' && nearEmmy && phase === 'play') say(emmyAdvice19({ here, current, goal, done, cover, base, treeWord, torusHits, coverOk }))
      if (TOOL_KEYS[e.code]) setTool(TOOL_KEYS[e.code])
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [nearEmmy, phase, here, current, goal, done, cover, base, treeWord, torusHits, coverOk, say])

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
      setShown((n) => (n >= line.text.length ? (clearInterval(id), n) : Math.max(n, i)))
      if (shownNow.current >= line.text.length) clearInterval(id)
      const ch = line.text[i - 1]
      if (ch && ch !== ' ' && i % 2 === 0) textBlip(line.speaker)
      if (i >= line.text.length) clearInterval(id)
    }, 1000 / TYPE_CPS)
    return () => clearInterval(id)
  }, [line])

  const playEnabled = phase === 'play' && !lesson && !levelClear && !torusAsk
  const gameKey = `sheet19:${knockouts}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  // Lashing the Stack sentinel (moving_start) swaps which vertex is the start; the sentinel stays standing so it can be swapped back
  const baseRef = useRef(0)
  baseRef.current = base
  const swapStart = () => {
    if (current !== 'moving_start') {
      sfxRefuse()
      return flash('The sentinel only swaps the start on its own deck — Moving the Start.')
    }
    const next = baseRef.current === 0 ? 1 : 0
    setBase(next)
    const conj = conjugateOrder(ORDER_TWO_SHEET_AA, next === 1 ? 'a' : 'A')
    setOrderLabel(conj.label)
    sfxStackSwap()
    flash(next === 1 ? 'Start vertex on sheet 2 — order conjugated.' : 'Start back on sheet 1.')
  }
  const swapRef = useRef(swapStart)
  swapRef.current = swapStart

  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
    }
    return {
      mode: 'overworld',
      bySite: true,
      start: checkpoint,
      enemies: list,
      onEnemyHit: (e) => {
        if (e.type !== 'stack_sentinel') return undefined
        swapRef.current()
        return 'keep'
      },
      enemyAI: (e) => {
        if (e.type !== 'stack_sentinel') return
        e.x = e.hx
        e.z = e.hz
        e.tx = e.hx
        e.tz = e.hz
      },
    }
  }, [gameKey, done, checkpoint])

  const FRAME = { to_order: 8.8, moving_start: 8.6, endless_tree: 12.6, plane_torus: 8.8 }
  frameRef.current = current && here.site === current && met[current] ? { center: [SITE[current].pos[0] + 1.0, SITE[current].pos[1] + 0.3], size: FRAME[current], follow: 0.12 } : null
  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  if (import.meta.env.DEV)
    window.__lvl19 = {
      here,
      done,
      goalIdx,
      presetIdx,
      base,
      treeWord,
      treeHits,
      torusHits,
      setTool,
      setPresetIdx,
      setBase,
      coverOk,
      advanceGoal: () => advanceGoal(current, []),
    }

  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen ? 'Walk out through the Stack Outflow' : current ? `Stacks ${nDone}/4 · ${SITE[current].name}` : ''

  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'cover') return `Clasp (5) ports · order: ${orderLabel}`
    if (goal.type === 'start') return 'Lash (1) the Stack sentinel to swap the start vertex'
    if (goal.type === 'tree') return `Compass (6) branches · reached ${Object.keys(treeHits).length}/${(goal.targets || []).length}`
    if (goal.type === 'torus') return 'Compass (6) a loop pedestal, then pick its (m, n)'
    return 'Lash (1) · Clasp (5) · Compass (6)'
  })()

  return (
    <div className="screen level level-1-9">
      <Canvas camera={{ position: [0, 11, 30], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        <SheetMusicScene
          layout={layout}
          sites={SITES}
          current={current}
          done={done}
          cover={cover}
          base={base}
          treeWord={treeWord}
          treeTargets={goal?.type === 'tree' ? goal.targets : []}
          treeHits={treeHits}
          torusHighlight={torusAsk ? torusLift([0, 0], parseWord(torusAsk.word)) : null}
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
          onEnemies={setEnemies}
          onHearts={setHearts}
          emmyAt={emmyAt}
          emmyTalking={emmyTalking}
          emmyNear={nearEmmy}
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
            <span className="lvl-kicker">World 1 · Level 9 · Sheet Stacks</span>
            <h2>{levelMeta?.title || 'Sheet Music'}</h2>
            <div className="hud">
              <span className="hearts">{[0, 1, 2].map((i) => (<span key={i} className={i < hearts ? 'heart' : 'heart lost'}>♥</span>))}</span>
              <span className="objective">{objective}</span>
            </div>
          </div>
        </div>

        {current && here.site === current && met[current] && (
          <div className="rules-panel forge-panel works-panel level-1-9-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            <p className="forgery-count">{stepText}</p>
          </div>
        )}

        {!talking && !levelClear && (
          <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Sheet Stacks" />
        )}

        <div className="tool-row">
          {['lash', 'clasp', 'compass'].map((t) => (
            <button key={t} type="button" className={tool === t ? 'tool active' : 'tool'} onClick={() => setTool(t)}>
              {t === 'lash' ? '1 Lash' : t === 'clasp' ? '5 Clasp' : '6 Compass'}
            </button>
          ))}
        </div>
        {toast && <div className="toast">{toast}</div>}

        {torusAsk && (
          <div className="ask-panel level-1-9-torus-ask">
            <p>
              Lift ends at $(m,n)$ for {torusAsk.label}?
            </p>
            <div className="ask-grid">
              {[
                [1, 1],
                [1, 0],
                [0, 1],
                [0, 0],
                [2, -1],
              ].map(([m, n]) => (
                <button key={`${m},${n}`} type="button" className="btn" onClick={() => pickTorus(m, n)}>
                  ({m}, {n})
                </button>
              ))}
            </div>
          </div>
        )}

        {talking && line && (
          <div className="dialog">
            <Portrait id={line.portrait || 'gyroid'} name={line.speaker} />
            <div className="dialog-body">
              <span className="speaker">{line.speaker}</span>
              <p>
                <MathText text={line.text.slice(0, shown)} />
                <span className="untyped">{line.text.slice(shown)}</span>
              </p>
              <button type="button" className="btn dialog-adv" onClick={advance}>
                {shown < line.text.length ? '▶▶' : lineIdx + 1 < lines.length ? 'Next ▾' : 'OK'}
              </button>
            </div>
          </div>
        )}

        {lesson && (
          <LevelMovie
            videoId="level-1-9-lesson"
            Scene={SheetMusicLesson}
            Overlay={SheetMusicLessonOverlay}
            kicker="World 1 · Level 9 · Lesson"
            name="Sheet Music"
            embedded
            onDone={() => setLesson(false)}
            onSkip={() => setLesson(false)}
          />
        )}

        {levelClear && (
          <div className="win-banner exit">
            <h2>Sheet Music</h2>
            <p>{DEFINITION19.body}</p>
            <p className="cite">{DEFINITION19.cite}</p>
            <a href={DEFINITION19.href} target="_blank" rel="noreferrer">
              Read the book
            </a>
            <button type="button" className="btn primary" onClick={() => onNext?.()}>
              Next: {DEFINITION19.next} ▸
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
