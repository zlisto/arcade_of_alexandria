import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import WindingRoadScene from '../../levels/w1/WindingRoadScene'
import LevelMovie from '../LevelMovie'
import LevelMap from '../LevelMap'
import { useExitTrigger } from '../exitTrigger'
import { WORLD_TOOLS } from '../../levels/w0/worldTools'
import { addWindings, makeRingTracker, sameWinding } from '../../levels/w1/winding'
import { DEFINITION13, HINTS13, OPENING, STATIONS, STATION_ORDER, WRONG, emmyAdvice13 } from '../../levels/w1/stages1_3'
import layout from '../../world/windingRoad.json'
import { buildSites, makeSiteWalkable } from '../../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxWrong,
  sfxZoot,
  sfxExit,
  sfxFloor,
  sfxGate,
  startHelixMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../../audio/chip'
import WindingRoadLesson, { WindingRoadLessonOverlay } from '../../movies/w1/WindingRoadLesson'
import MathText from '../MathText'

const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const TOOL_KEYS = { Digit1: 'lash', Digit2: 'spool', Digit3: 'glass', Digit4: 'cord' }
const BEACON_R = 0.85
const S = 0.7

const stationAt = (x, z) => SITES.find((s) => s.stage === 'station' && s.containsWorld(x, z)) || null
const ringCenter = (site) => [site.pos[0] + site.ring.cx, site.pos[1] + site.ring.cz]

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

function freshWinders() {
  const out = []
  for (const site of SITES) {
    ;(site.winders || []).forEach(([w, dx, dz], i) => {
      out.push({ id: `${site.id}-${i}`, site: site.id, winding: w, x: site.pos[0] + dx, z: site.pos[1] + dz, net: 0, unwound: false, killed: false })
    })
  }
  return out
}

export default function Level1_3({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[1]?.levels?.find((l) => l.id === '1-3')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [met, setMet] = useState({})
  const [bank, setBank] = useState(0)
  const [pendingLap, setPendingLap] = useState(null)
  const [lastLap, setLastLap] = useState(null)
  const [homotopyT, setHomotopyT] = useState(0.5)
  const [slideBase, setSlideBase] = useState(null)
  const [winders, setWinders] = useState(freshWinders)
  const [gatesOpen, setGatesOpen] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? [SITE[STATION_ORDER[skipTo]].pos[0], SITE[STATION_ORDER[skipTo]].pos[1] + 3] : layout.start))
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
  const tRef = useRef(0)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)

  const trackers = useRef(Object.fromEntries(STATION_ORDER.map((id) => [id, makeRingTracker(ringCenter(SITE[id]), SITE[id].ring.inner, SITE[id].ring.outer)])))

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

  const advanceGoal = useCallback(
    (station, ls = []) => {
      const list = STATIONS[station].goals
      const next = (goalIdx[station] || 0) + 1
      if (next >= list.length) {
        setDone((d) => ({ ...d, [station]: true }))
        setCheckpoint([SITE[station].pos[0], SITE[station].pos[1] + 3])
        if (STATION_ORDER.every((id) => id === station || done[id])) {
          afterTalk.current = () => {
            sfxZoot()
            setExitOpen(true)
          }
        }
        return say(ls, ls.length ? 'after' : 'play')
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      return say(ls)
    },
    [done, goalIdx, say],
  )

  useEffect(() => {
    unlockAudio()
    startHelixMusic()
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
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    say([HINTS13.knockout])
  }, [hearts, say])

  const advance = () => {
    const line = lines[lineIdx]
    if (shown < line.text.length) {
      setShown(line.text.length)
      return
    }
    if (lineIdx + 1 < lines.length) {
      setLineIdx((i) => i + 1)
      setShown(0)
      return
    }
    setLines([])
    setLineIdx(0)
    setShown(0)
    const next = phase.replace('talk:', '') || 'play'
    setPhase(next === 'after' ? 'play' : next)
    if (next === 'after' && afterTalk.current) {
      const fn = afterTalk.current
      afterTalk.current = null
      fn()
    }
  }

  useEffect(() => {
    const line = lines[lineIdx]
    if (!line || phase.indexOf('talk:') !== 0) return
    dialogOpen()
    duckMusic(true)
    setShown(0)
    let i = 0
    const iv = setInterval(() => {
      if (shownNow.current >= line.text.length) return clearInterval(iv)
      i++
      setShown((n) => Math.max(n, i))
      if (i <= line.text.length) textBlip(line.speaker)
    }, 1000 / TYPE_CPS)
    return () => clearInterval(iv)
  }, [lines, lineIdx, phase])

  useEffect(() => {
    const st = here.site
    if (!st || phase !== 'play') return
    if (st !== current && !done[st] && !met['early:' + st]) {
      setMet((m) => ({ ...m, ['early:' + st]: true }))
      say(STATIONS[st].early)
      return
    }
    if (st !== current || met[st]) return
    setMet((m) => ({ ...m, [st]: true }))
    say(STATIONS[st].arrive)
  }, [here.site, phase, current, met, done, say])

  const playEnabled = phase === 'play' && !lines.length
  const talking = phase.startsWith('talk:')
  const line = talking ? lines[lineIdx] : null

  const working = !!current && here.site === current && met[current] && playEnabled

  const bankLap = useCallback(
    (w) => {
      setPendingLap(null)
      setLastLap(w)
      setBank((b) => addWindings(b, w))
      if (goal?.type === 'lap' && goal.n === w) {
        sfxFloor()
        advanceGoal(current, goal.done)
      } else if (goal?.type === 'lap') {
        sfxWrong()
        flash(HINTS13.wrongWinding.text)
      }
      if (goal?.type === 'slide' && slideBase == null) setSlideBase(w)
    },
    [advanceGoal, current, goal, slideBase],
  )

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s || !working || tool !== 'cord') return
      const site = SITE[current]
      const tr = trackers.current[current]
      const ev = tr.update(s.x, s.z)
      if (ev?.event === 'lap') {
        if (goal?.type === 'unwind') {
          setWinders((ws) =>
            ws.map((w) => {
              if (w.site !== current || w.unwound || w.killed || w.winding !== goal.winder) return w
              const net = w.net + ev.winding
              return { ...w, net, unwound: net === -w.winding }
            }),
          )
        }
        setPendingLap(ev.winding)
        flash(`Lap closed: winding ${ev.winding > 0 ? '+' : ''}${ev.winding}. Touch the beacon to bank.`)
      }
      if (pendingLap != null && Math.hypot(s.x - site.pos[0], s.z - site.pos[1]) < BEACON_R) {
        bankLap(pendingLap)
      }
    }, 40)
    return () => clearInterval(id)
  }, [working, tool, current, goal, pendingLap, bankLap])

  const confirmSlide = () => {
    if (goal?.type !== 'slide' || !working || slideBase == null) return
    if (Math.abs(homotopyT - 0.5) < 0.12) return flash('Scrub the Tide Glass (Z/X) to deform the loop first.')
    if (!sameWinding(slideBase * Math.PI * 2, slideBase * Math.PI * 2)) return say([WRONG.slideChanged])
    sfxCorrect()
    advanceGoal(current, goal.done)
  }

  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const st = stationAt(s.x, s.z)?.id || null
      setHere((h) => (h.site === st && Math.abs(h.pos[0] - s.x) < 0.05 && Math.abs(h.pos[1] - s.z) < 0.05 ? h : { site: st, pos: [s.x, s.z] }))
    }, 150)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (goal?.type !== 'unwind') return
    const target = winders.find((w) => w.site === current && !w.killed && goal.winder === w.winding)
    if (target?.unwound && !target.killed) {
      spawnRef.current?.([{ type: 'sphere', x: target.x, z: target.z, site: current }])
      setWinders((ws) => ws.map((w) => (w.id === target.id ? { ...w, killed: true } : w)))
      const left = winders.filter((w) => w.site === current && !w.killed && w.id !== target.id)
      if (!left.length) advanceGoal(current, goal.done)
    }
  }, [winders, goal, current, advanceGoal])

  useEffect(() => {
    if (goal?.type !== 'gate' || !working) return
    if (bank === goal.n && !gatesOpen[goal.n]) {
      sfxGate()
      setGatesOpen((g) => ({ ...g, [goal.n]: true }))
      setBank(0)
      advanceGoal(current, goal.done)
    }
  }, [bank, goal, working, gatesOpen, advanceGoal, current])

  useEffect(() => {
    const s = stateRef.current
    if (!s || !current) return
    const site = SITE[current]
    frameRef.current = { center: [site.pos[0] + 1, site.pos[1] + 0.3], size: 8.8, follow: 0.12 }
  }, [current, here])

  useExitTrigger(exitOpen && !levelClear, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  useEffect(() => {
    const down = (e) => {
      if (TOOL_KEYS[e.code]) setTool(TOOL_KEYS[e.code])
      if (e.code === 'KeyE' && nearEmmy && playEnabled) {
        say(emmyAdvice13({ current, done, goal, here: here.site, bank, lastLap, winders, gateOpen: gatesOpen, enemies, met }))
      }
      if (tool === 'glass' && playEnabled) {
        if (e.code === 'KeyZ') setHomotopyT((t) => Math.max(0, t - 0.08))
        if (e.code === 'KeyX') setHomotopyT((t) => Math.min(1, t + 0.08))
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [nearEmmy, playEnabled, say, current, done, goal, here.site, bank, lastLap, winders, gatesOpen, enemies, met, tool])

  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  const stage = useMemo(
    () => ({
      start: checkpoint,
      enemies: SITES.flatMap((s) => (s.enemies || []).map(([type, dx, dz]) => [type, s.pos[0] + dx, s.pos[1] + dz, s.id])),
      bySite: true,
    }),
    [checkpoint],
  )

  const emmyScript = (site) => () => {
    const [ex, ez] = site.emmy
    return { pos: [ex / S, 0, ez / S], rotY: 0.5, walk: 0, talk: emmyTalking.current ? 1 : 0, gesture: 0, bow: 0 }
  }

  useEffect(() => {
    const s = stateRef.current
    if (!s || !current) return
    const site = SITE[current]
    const [ex, ez] = site.emmy
    const wx = site.pos[0] + ex
    const wz = site.pos[1] + ez
    setNearEmmy(Math.hypot(s.x - wx, s.z - wz) < 2.4)
  })

  if (import.meta.env.DEV) {
    window.__lvl13 = { here, done, goalIdx, goal, bank, pendingLap, winders, phase, tool, trackers: trackers.current, setTool, advanceGoal }
  }

  const stepText =
    goal?.type === 'lap'
      ? `Next: lap with winding ${goal.n > 0 ? '+' : ''}${goal.n} · cord ${bank}`
      : goal?.type === 'slide'
        ? `Tide Glass — floor stays at ${slideBase ?? lastLap ?? 1}`
        : goal?.type === 'unwind'
          ? `Unwind Winder ${goal.winder > 0 ? '+' : ''}${goal.winder}`
          : goal?.type === 'gate'
            ? `Gate wants ${goal.n > 0 ? '+' : ''}${goal.n} · cord ${bank}`
            : 'Explore the Winding Road'

  return (
    <div className="screen level-screen w13-level">
      <Canvas shadows camera={{ position: [0, 14, 18], fov: 42 }} style={{ touchAction: 'none' }}>
        <WindingRoadScene
          layout={layout}
          sites={SITES}
          walkable={walkable}
          current={current}
          done={done}
          exitOpen={exitOpen}
          bank={bank}
          homotopyT={goal?.type === 'slide' ? homotopyT : null}
          winders={winders}
          gatesOpen={gatesOpen}
          frameRef={frameRef}
          gameKey={knockouts}
          stage={stage}
          tool={tool}
          tRef={tRef}
          sim={tool === 'glass' && goal?.type === 'slide' ? { endpointAt: () => null } : null}
          stateRef={stateRef}
          spawnRef={spawnRef}
          onTrackMove={() => {}}
          onEnemies={setEnemies}
          onHearts={setHearts}
          emmyScript={emmyScript}
          playEnabled={playEnabled}
        />
      </Canvas>

      <div className="hud">
        <div className="hud-top">
          <button type="button" className="btn ghost" onClick={onBackToTitle}>
            ◂ Title
          </button>
          <button type="button" className="btn ghost" onClick={() => (setMuted(!muted), setAudioMuted(!muted))}>
            {muted ? '♪ off' : '♪ on'}
          </button>
          <button type="button" className="btn ghost" onClick={() => setLesson(true)}>
            ? How it works
          </button>
        </div>
        <span className="lvl-kicker">World 1 · Level 3 · Winding Road</span>
        <h1>{levelMeta?.title || 'The Winding Road'}</h1>
        <p className="objective">
          {current ? STATIONS[current].blueprint : 'Complete'} · {stepText}
        </p>
        <p className="forgery-count">♥ {hearts} · here: {here.site || 'path'}</p>
      </div>

      {working && (
        <div className="rules-panel forge-panel works-panel w13-panel">
          <p className="blueprint">{STATIONS[current].blueprint}</p>
          <p className="forgery-count">Winding bank: {bank > 0 ? '+' : ''}{bank}</p>
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
      {!levelClear && !line && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Winding Road" />}
      {nearEmmy && !line && playEnabled && (
        <button type="button" className="btn talk-btn" onClick={() => say(emmyAdvice13({ current, done, goal, here: here.site, bank, lastLap, winders, gateOpen: gatesOpen, enemies, met }))}>
          💬 Talk to Emmy <kbd>E</kbd>
        </button>
      )}

      {!talking && !levelClear && (
        <div className="controls">
          <div className="weapons">
            {['lash', 'glass', 'cord'].map((id) => (
              <button key={id} type="button" className={`weapon ${tool === id ? 'active' : ''}`} onClick={() => setTool(id)}>
                {WORLD_TOOLS[id].label} <kbd>{WORLD_TOOLS[id].key}</kbd>
              </button>
            ))}
          </div>
          <div className="hint">
            WASD · {tool === 'cord' ? 'run laps on the gold ring' : tool === 'glass' ? 'Z/X scrub homotopy' : 'lash spawn'} · bank at beacon
            {goal?.type === 'slide' && slideBase != null && (
              <button type="button" className="btn small primary" style={{ marginLeft: 8 }} onClick={confirmSlide}>
                Floor held — continue
              </button>
            )}
          </div>
        </div>
      )}

      {lesson && (
        <LevelMovie
          videoId="level-1-3-lesson"
          Scene={WindingRoadLesson}
          Overlay={WindingRoadLessonOverlay}
          kicker="World 1 · Level 3 · Lesson"
          name="The Winding Number"
          embedded
          onDone={() => setLesson(false)}
          onSkip={() => setLesson(false)}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 1 · Level 3 clear</span>
            <h2>{levelMeta?.title || 'The Winding Road'}</h2>
            <p className="def">{DEFINITION13.text}</p>
            <p className="cite">
              {DEFINITION13.cite}{' '}
              <a href={DEFINITION13.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: 1-4 · No Way Out (Brouwer&apos;s Basin).</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ 1-4
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
