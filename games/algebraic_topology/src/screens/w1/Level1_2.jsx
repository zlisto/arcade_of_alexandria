import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BeaconScene from '../../levels/w1/BeaconScene'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import MathText from '../MathText'
import { useExitTrigger } from '../exitTrigger'
import layout from '../../world/beacon-loop.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import { makeTrack, makeTracker } from '../../levels/w0/cells'
import { addLap, letter, reduce, sequenceOk, wordText } from '../../levels/w1/loops'
import { DEFINITION, HINTS, OPENING, STATIONS, STATION_ORDER, emmyAdvice12 } from '../../levels/w1/stages1_2'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxLoopClose,
  sfxRefuse,
  sfxWrong,
  sfxZoot,
  startBastionMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'
import LoopLesson, { LoopLessonOverlay } from '../../movies/w1/LoopLesson'
import LoopMovie from '../../movies/w1/LoopMovie'

const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const TRACKS = Object.fromEntries(SITES.filter((s) => s.tracks).map((s) => [s.id, s.tracks.map((t) => makeTrack(t, s.pos))]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'emmy-boundary': ['400%', '54%', '5%'],
  commutator: ['500%', '53%', '19%'],
}
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

export default function Level1_2({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-2') || { title: 'Loop de Loop' }
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [met, setMet] = useState({})
  const [bag, setBag] = useState([])
  const [lapIdx, setLapIdx] = useState(0)
  const [runCount, setRunCount] = useState(0)
  const [homeBag, setHomeBag] = useState([])
  const [forged, setForged] = useState(() => Object.fromEntries(STATION_ORDER.map((id) => [id, []])))
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [gameKey, setGameKey] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? [SITE[STATION_ORDER[skipTo]].pos[0], SITE[STATION_ORDER[skipTo]].pos[1] + 2.2] : layout.start))
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('lash')
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
  const progressRef = useRef(null)
  const beaconPulseRef = useRef(0)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: layout.start[0] - 1.2, z: layout.start[1] - 0.8, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)
  const trackers = useRef(Object.fromEntries(STATION_ORDER.map((id) => [id, makeTracker(TRACKS[id] || [], SITE[id].pos)])))

  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null

  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])

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

  useEffect(() => {
    unlockAudio()
    startBastionMusic()
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
        setCheckpoint([SITE[station].pos[0], SITE[station].pos[1] + 2.2])
        setLapIdx(0)
        setRunCount(0)
        setBag([])
        if (STATION_ORDER.every((id) => (id === station ? true : done[id]))) {
          sfxZoot()
          setExitOpen(true)
        }
        return say(ls)
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      setLapIdx(0)
      setRunCount(0)
      setBag([])
      const ng = list[next]
      if (ng.type === 'ask') {
        afterTalk.current = () => setAskOpen(true)
        return say(ls, 'after')
      }
      return say(ls)
    },
    [bag, done, goalIdx, say],
  )

  const onLapDone = useCallback(
    (station, track, dir) => {
      const lap = letter(track, dir)
      const need = goal?.seq?.[lapIdx]
      if (goal?.type === 'loop' || goal?.type === 'reduce') {
        if (need && (need.track !== track || need.dir !== dir)) {
          sfxRefuse()
          return flash(`That lap was ${wordText([lap])} — next need ${wordText([letter(need.track, need.dir)])}`)
        }
      }
      beaconPulseRef.current = 1
      sfxLoopClose()
      setForged((f) => ({
        ...f,
        [station]: [...(f[station] || []).filter((e) => e.track !== track), { track, letter: track, dir, torn: false }],
      }))
      const nextBag = addLap(bag, lap)
      setBag(nextBag)
      const nextLap = lapIdx + 1
      if (goal?.type === 'reduce' && goal.seq && nextLap >= goal.seq.length) {
        if (!sequenceOk(goal.seq, goal.expect || [])) {
          sfxWrong()
          setLapIdx(0)
          setBag([])
          return say([HINTS.abandon, E(`That chain reduced to $${wordText(reduce(nextBag))}$ — we need $${wordText(goal.expect || [])}$. Try again.`)])
        }
        sfxCorrect()
        return advanceGoal(station, goal.done)
      }
      if (goal?.type === 'loop' && goal.seq && nextLap >= goal.seq.length) {
        const runs = goal.runs || 1
        if (runCount + 1 < runs) {
          setRunCount((r) => r + 1)
          setLapIdx(0)
          setBag([])
          flash('Same three laps again — compare the ledger.')
          return say(goal.mid || [])
        }
        sfxCorrect()
        if (station === 'brackets') setHomeBag(nextBag)
        return advanceGoal(station, goal.done)
      }
      if (goal?.type === 'carry' && nextLap >= 1) {
        sfxCorrect()
        return advanceGoal(station, goal.done)
      }
      setLapIdx(nextLap)
      flash(`Loop closed: ${wordText([lap])} · ledger $${wordText(nextBag)}$`)
    },
    [advanceGoal, bag, goal, lapIdx, runCount, say, homeBag],
  )

  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    setGameKey((k) => k + 1)
    say([HINTS.knockout])
  }, [hearts, say])

  useEffect(() => {
    if (goal?.type === 'ask' && phase === 'play' && !askOpen && !exitOpen && here.site === current && met[current]) setAskOpen(true)
  }, [goal, phase, askOpen, exitOpen, here.site, current, met])

  useEffect(() => {
    if (goal?.type !== 'arrive_b' || phase !== 'play' || here.site !== 'second_beacon' || !met.second_beacon) return
    advanceGoal('second_beacon', goal.done)
  }, [goal, phase, here.site, met, advanceGoal])

  const working = !!current && here.site === current && met[current] && phase === 'play' && !askOpen
  const stateForTick = useRef({})
  stateForTick.current = { working, tool, current, goal, lapIdx }
  useEffect(() => {
    const id = setInterval(() => {
      const { working: w, tool: tl, current: cur } = stateForTick.current
      const s = stateRef.current
      if (!s || !cur || !TRACKS[cur]?.length) return
      const tr = trackers.current[cur]
      if (!w || tl !== 'lash') {
        tr.reset()
        progressRef.current = null
        return
      }
      const ev = tr.update(s.x, s.z)
      const curT = tr.current()
      progressRef.current = curT ? { track: curT.track, dir: curT.dir, best: tr.progress() } : null
      if (!ev) return
      if (ev.event === 'abandon') return flash('Go all the way round the gold ring and back to the beacon.')
      if (ev.event !== 'done') return
      onLapDone(cur, ev.track, ev.dir)
    }, 40)
    return () => clearInterval(id)
  }, [onLapDone])

  useEffect(() => {
    const st = here.site
    if (!st || phase !== 'play') return
    if (st !== current && STATIONS[st]?.early && !met[`early:${st}`]) {
      setMet((m) => ({ ...m, [`early:${st}`]: true }))
      say(STATIONS[st].early)
      return
    }
    if (st !== current || done[st]) return
    if (met[st]) return
    setMet((m) => ({ ...m, [st]: true }))
    say(STATIONS[st].arrive)
  }, [here.site, phase, current, met, done, say])

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const st = stationAt(s.x, s.z)
      setHere({ site: st?.id || null, pos: [s.x, s.z] })
      if (current && SITE[current]) {
        const [ex, ez] = SITE[current].emmy
        const wx = SITE[current].pos[0] + ex
        const wz = SITE[current].pos[1] + ez
        emmyAt.current.x += (wx - emmyAt.current.x) * 0.04
        emmyAt.current.z += (wz - emmyAt.current.z) * 0.04
        emmyAt.current.rotY = Math.atan2(s.x - emmyAt.current.x, s.z - emmyAt.current.z)
        setNearEmmy(Math.hypot(s.x - emmyAt.current.x, s.z - emmyAt.current.z) < 2.4)
      }
    }, 80)
    return () => clearInterval(id)
  }, [current])

  const line = lines[lineIdx]
  const talking = phase.startsWith('talk')
  emmyTalking.current = talking
  useEffect(() => {
    if (!line) return
    dialogOpen()
    duckMusic(true)
    let i = 0
    const tick = () => {
      if (i >= line.text.length) return
      if (shownNow.current >= line.text.length) return
      i++
      setShown(i)
      textBlip(line.speaker)
      setTimeout(tick, 1000 / TYPE_CPS)
    }
    setShown(0)
    tick()
    return () => duckMusic(false)
  }, [line, lineIdx])

  const advance = () => {
    if (shown < line.text.length) {
      setShown(line.text.length)
      return
    }
    if (lineIdx + 1 < lines.length) {
      setLineIdx((i) => i + 1)
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
  }

  const talkToEmmy = () => say(emmyAdvice12({ current, done, goal, here, bag, lapIdx, enemies, phase }))
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyE' && nearEmmy && phase === 'play') talkToEmmy()
      if (e.code === 'Digit1') setTool('lash')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const answerAsk = (v) => {
    if (v !== goal.answer) {
      sfxWrong()
      return say(goal.wrong, 'ask')
    }
    sfxCorrect()
    setAskOpen(false)
    advanceGoal(current, goal.right)
  }

  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
    }
    return { mode: 'overworld', bySite: true, start: checkpoint, enemies: list }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, checkpoint, done])

  if (current && here.site === current && met[current]) {
    const r = SITE[current].def.add[0].r
    frameRef.current = { center: [SITE[current].pos[0] + 1, SITE[current].pos[1] + 0.3], size: r > 5.4 ? 8.8 : 8.2, follow: 0.12 }
  } else frameRef.current = null

  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.5 && z < layout.exit.gate[1] - 0.6, () => setLevelClear(true))

  const playEnabled = !talking && !askOpen && !levelClear
  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen ? 'Walk south through the exit gate' : current ? `Beacons ${nDone}/4 · next: ${STATIONS[current].blueprint}` : ''
  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'loop' || goal.type === 'reduce') {
      const need = goal.seq?.[lapIdx]
      return need ? `Lash lap ${lapIdx + 1}/${goal.seq.length}: ${wordText([letter(need.track, need.dir)])}` : 'Close loops at the beacon'
    }
    if (goal.type === 'arrive_b') return 'Walk the causeway to Beacon B'
    if (goal.type === 'carry') return 'Close one loop at Beacon B — the same ledger, new basepoint.'
    if (goal.type === 'ask') return 'Answer Emmy’s question'
    return ''
  })()

  if (import.meta.env.DEV)
    window.__lvl1_2 = {
      here,
      done,
      goal,
      bag,
      lapIdx,
      advance: () => window.__advance?.(1),
      click: (x, z) => window.__game?.click?.(x, z),
    }

  return (
    <div className="screen level level-1-2">
      <Canvas camera={{ position: [0, 11, 26], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        <BeaconScene
          layout={layout}
          sites={SITES}
          walkable={walkable}
          current={current}
          done={done}
          tracksBySite={TRACKS}
          forged={forged}
          progressRef={progressRef}
          beaconPulseRef={beaconPulseRef}
          stateRef={stateRef}
          frameRef={frameRef}
          game={game}
          gameKey={gameKey}
          spawnRef={spawnRef}
          emmyAt={emmyAt}
          emmyTalking={emmyTalking}
          emmyNear={nearEmmy && phase === 'play'}
          exitOpen={exitOpen}
          playEnabled={playEnabled}
          tool={tool}
          onEnemies={(by) => setEnemies(by)}
          onHearts={setHearts}
        />
      </Canvas>

      <div className="ui-overlay">
        <div className="lvl-top">
          <div className="btn-row" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn ghost" onClick={onBackToTitle}>
              ◂ Title
            </button>
            <button type="button" className="btn ghost" aria-pressed={muted} onClick={(e) => (setMuted(!muted), setAudioMuted(!muted), e.currentTarget.blur())}>
              {muted ? '♪ off' : '♪ on'}
            </button>
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())}>
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 1 · Level 2 · Basepoint Beacon</span>
            <h2>{levelMeta.title}</h2>
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
            {here.site && (
              <div className="here">
                <strong>{SITE[here.site]?.name || here.site}</strong>
                {done[here.site] ? ' · finished' : enemies[here.site] ? ` · spawn: ${enemies[here.site]}` : ' · clear'}
              </div>
            )}
          </div>
        </div>

        {current && here.site === current && met[current] && (
          <div className="rules-panel forge-panel works-panel level-1-2-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            <p className="forgery-count">
              Loop ledger: <b className="rule-math">${wordText(bag)}$</b>
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
                <button key={v} type="button" className="btn small" onClick={() => answerAsk(v)}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {toast && !line && <div className="toast">{toast}</div>}
        {nearEmmy && phase === 'play' && !levelClear && (
          <button type="button" className="btn talk-btn" onClick={() => talkToEmmy()}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}
        {!levelClear && !line && !askOpen && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Loop de Loop" />}
        {playEnabled && !toast && (
          <div className="controls">
            <div className="weapons">
              <button type="button" className={`weapon active`} title="Loop Lash — close loops (1)">
                ⚡ Loop Lash <kbd>1</kbd>
              </button>
            </div>
            <div className="hint">WASD to move · Lash (1) closes loops at the beacon · lost? Talk to Emmy (E)</div>
          </div>
        )}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-1-2-lesson"
          Scene={LoopLesson}
          Overlay={LoopLessonOverlay}
          kicker="World 1 · Level 2 · Lesson"
          name="Loops at a Point"
          embedded
          startMusic={startBastionMusic}
          onDone={() => (setLesson(false), startBastionMusic())}
          onSkip={() => (setLesson(false), startBastionMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 1 · Level 2 clear</span>
            <h2>{levelMeta.title}</h2>
            <p className="def">{DEFINITION.text}</p>
            <p className="cite">
              {DEFINITION.cite}{' '}
              <a href={DEFINITION.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: The Winding Road — winding numbers on a circle.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ Winding Road
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
