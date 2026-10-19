import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConeScene from '../levels/w0/ConeScene'
import LevelMovie from './LevelMovie'
import LevelMap from './LevelMap'
import { useExitTrigger } from './exitTrigger'
import { OPS, SPECIMENS, canon, cellText, chiOf, fromResult } from '../levels/w0/spaces'
import { DEFINITION05, HINTS05, OPENING, STATIONS, STATION_ORDER, emmyAdvice05 } from '../levels/w0/stages05'
import layout from '../world/conezone.json'
import { buildSites, makeSiteWalkable } from '../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxFeed,
  sfxMachine,
  sfxPickup,
  sfxPlug,
  sfxWrong,
  startConeMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../audio/chip'
import ConeLesson, { ConeLessonOverlay } from '../movies/ConeLesson'
import MathText from './MathText'

/**
 * World 0 · Level 5 "Cone Zone" — the terrace of operation works on the Foundry cliff.
 *   The Cone Works       — cone a ring (the hole fills), cone two points; χ of any cone is 1
 *   The Suspension Works — suspend two points (a circle), then the circle (a sphere), then S³
 *   Wedge & Product      — circle ∨ circle, circle × circle; its cells match the Hall's torus
 *   The Recipe Board     — chain operations from a point, two points and a disk to make a
 *                          sphere, a torus and S² ∨ S¹, while Coners plug the pedestals
 * The Cell-Smith (2): click a pedestal to take a copy of its space, click the machine to
 * feed what you carry, click the shelf to take a result. Coners beam a cone onto a
 * pedestal ("plug" it); click a plugged pedestal to pull the plug.
 */

const TYPE_CPS = 45
const BIRTH_SECONDS = 1.8
const REACH = 3.6
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const stationAt = (x, z) => SITES.find((s) => s.stage === 'station' && s.containsWorld(x, z)) || null
const W = (site, p) => [p[0] + site.pos[0], p[1] + site.pos[1]]
const freshWorks = (id) => ({
  sources: SITE[id].sources.map((s) => ({ spec: SPECIMENS[s.spec], plugged: false })),
  shelf: [null, null],
  last: 1,
  hopper: [],
  op: STATIONS[id].ops[0],
})
const plugOf = (spec) => {
  const r = OPS.cone.run([spec])
  return { ...fromResult(r), name: `${spec.name}, plugged — a cone on it`, plugged: true }
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

function Cells({ spec }) {
  if (!spec) return null
  return (
    <span className="cells-line">
      {cellText(spec.cells)} · χ = <b>{chiOf(spec.cells)}</b>
    </span>
  )
}

export default function Level05({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-5')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [works, setWorks] = useState(() => Object.fromEntries(STATION_ORDER.map((id) => [id, freshWorks(id)])))
  const shelfK = useMemo(() => Object.fromEntries(STATION_ORDER.map((id) => [id, [{ current: 1 }, { current: 1 }]])), [])
  const runRefs = useMemo(() => Object.fromEntries(STATION_ORDER.map((id) => [id, { current: 0 }])), [])
  const [carried, setCarried] = useState(null)
  const [lastMade, setLastMade] = useState(null)
  const [met, setMet] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? W(SITE[STATION_ORDER[skipTo]], [0, 2.4]) : layout.start))
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('lash')
  const [waveOn, setWaveOn] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [levelClear, setLevelClear] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [here, setHere] = useState({ site: null, pos: checkpoint })
  const [plugSeen, setPlugSeen] = useState(false)
  const [busy, setBusy] = useState(false) // a machine is running
  const stateRef = useRef(null)
  const frameRef = useRef(null)
  const spawnRef = useRef(null)
  const ribbonApi = useRef(null)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: layout.start[0] - 1.2, z: layout.start[1] - 0.8, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)

  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null
  const wk = current ? works[current] : null
  const worksRef = useRef(works)
  worksRef.current = works

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

  // music
  useEffect(() => {
    unlockAudio()
    startConeMusic()
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

  // ---------- goals
  const advanceGoal = useCallback(
    (station, lines = []) => {
      const list = STATIONS[station].goals
      const cur = list[goalIdx[station] || 0]
      if (cur?.wave) {
        setWaveOn(true)
        spawnRef.current?.(SITE[station].wave.map(([type, x, z]) => ({ type, x: x + SITE[station].pos[0], z: z + SITE[station].pos[1], site: station })))
      }
      const next = (goalIdx[station] || 0) + 1
      if (next >= list.length) {
        setDone((d) => ({ ...d, [station]: true }))
        setCheckpoint(W(SITE[station], [0, 2.4]))
        setCarried(null)
        setLastMade(null)
        if (station === STATION_ORDER[STATION_ORDER.length - 1]) setExitOpen(true)
        return say(lines)
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      if (list[next].type === 'ask') {
        afterTalk.current = () => setAskOpen(true)
        return say(lines, 'after')
      }
      say(lines)
    },
    [goalIdx, say],
  )

  // ---------- where is Gyroid; Emmy walks to the current works
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
      const target = current ? W(SITE[current], SITE[current].emmy) : layout.exit.a.map((v, i) => v + (i ? 1.2 : -1.6))
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
        const look = current ? W(SITE[current], SITE[current].machine) : layout.exit.gate
        e.rotY = Math.atan2(look[0] - e.x, look[1] - e.z)
      }
    }, 50)
    return () => clearInterval(id)
  }, [current])

  // arriving at a works
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
    if (carried) setCarried(null) // nothing comes along from another works
    say(STATIONS[st].arrive)
  }, [here.site, phase, current, met, done, say, carried])

  // a question that's due always comes back (e.g. if a knockout interrupted the lines before it)
  useEffect(() => {
    if (goal?.type === 'ask' && phase === 'play' && !askOpen && here.site === current && met[current]) setAskOpen(true)
  }, [goal, phase, askOpen, here.site, current, met])

  // knocked out
  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    say([HINTS05.knockout])
  }, [hearts, say])

  // ---------- the machine
  const setW = (id, f) => setWorks((m) => ({ ...m, [id]: f(m[id]) }))
  const run = (st, inputs, op) => {
    const r = OPS[op].run(inputs)
    if (r.nothing) {
      sfxWrong()
      setW(st, (w) => ({ ...w, hopper: [] }))
      setCarried(inputs[0])
      return flash(`Nothing to collapse in ${inputs[0].name} — the quotient press collapses a disk’s rim, or an interval’s two ends`, 4200)
    }
    const spec = { ...fromResult(r), via: op, fromPlug: inputs.some((x) => x.plugged || x.fromPlug) }
    setBusy(true)
    sfxMachine()
    const rr = runRefs[st]
    const t0 = performance.now()
    const tick = () => {
      const u = (performance.now() - t0) / 1000
      rr.current = Math.max(0, 1 - u / 0.9)
      if (u < 0.9) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    setW(st, (w) => ({ ...w, hopper: [] }))
    setTimeout(() => {
      // the new space lands on the free shelf place (or replaces the older result)
      const w0 = worksRef.current[st]
      const slot = !w0.shelf[0] ? 0 : !w0.shelf[1] ? 1 : 1 - w0.last
      shelfK[st][slot].current = 0
      setWorks((m) => {
        const w = m[st]
        const shelf = [...w.shelf]
        shelf[slot] = spec
        return { ...m, [st]: { ...w, shelf, last: slot } }
      })
      setTimeout(() => {
        const k = shelfK[st][slot]
        k.current = 0
        const b0 = performance.now()
        const grow = () => {
          k.current = Math.min(1, (performance.now() - b0) / 1000 / BIRTH_SECONDS)
          if (k.current < 1) requestAnimationFrame(grow)
        }
        requestAnimationFrame(grow)
      }, 0)
      setLastMade(spec)
      setBusy(false)
      judge(st, spec)
    }, 900)
  }
  const judgeRef = useRef(null)
  const judge = (st, spec) => judgeRef.current?.(st, spec)
  judgeRef.current = (st, spec) => {
    const g = STATIONS[st].goals[goalIdx[st] || 0]
    if (g?.type === 'make' && canon(spec.key) === canon(g.target)) {
      sfxCorrect()
      setTimeout(() => advanceGoal(st, g.done), 1500)
      return
    }
    if (spec.fromPlug) {
      sfxWrong()
      return say([{ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text: `That made ${spec.name} — one of its inputs was plugged, coned by a Coner. A cone shrinks to a point, so the plug changed everything. Pull the plug and try again.` }])
    }
    flash(`Made ${spec.name} · ${cellText(spec.cells)} · χ = ${chiOf(spec.cells)}${g?.type === 'make' ? ` — the board wants ${SPECIMENS[g.target].name}` : ''}`, 4200)
  }

  // ---------- clicking with the Cell-Smith
  const onAction = (gx, gz, cx, cz) => {
    if (!current || here.site !== current || !met[current]) return flash(current ? `Walk to ${SITE[current].name} first` : 'Head for the gate')
    if (phase !== 'play' || askOpen) return
    const s = SITE[current]
    const w = works[current]
    // what did the click land on? (the nearest thing, forgivingly)
    const things = [
      { kind: 'machine', at: W(s, s.machine), r: 1.5 },
      ...s.sources.map((src, i) => ({ kind: 'source', i, at: W(s, src.at), r: 0.95 })),
      ...s.shelf.map((at, i) => ({ kind: 'shelf', i, at: W(s, at), r: 0.95 })),
    ]
      .map((t) => ({ ...t, d: Math.hypot(cx - t.at[0], cz - t.at[1]) }))
      .filter((t) => t.d < t.r + 0.45)
      .sort((a, b) => a.d - b.d)
    const t = things[0]
    if (!t) return flash(carried ? 'Click the machine to feed it what you’re carrying' : 'Click a pedestal to pick up its space')
    const far = Math.hypot(gx - t.at[0], gz - t.at[1]) > REACH
    const name = t.kind === 'machine' ? 'the machine' : t.kind === 'shelf' ? 'the shelf' : 'that pedestal'
    if (far) return flash(`Walk closer to ${name}`)
    if (busy) return flash('The machine is running…')
    if (t.kind === 'source') {
      const src = w.sources[t.i]
      if (src.plugged) {
        setW(current, (ww) => ({ ...ww, sources: ww.sources.map((q, i) => (i === t.i ? { spec: SPECIMENS[s.sources[i].spec], plugged: false } : q)) }))
        sfxCorrect()
        return flash(`Plug pulled — ${SPECIMENS[s.sources[t.i].spec].name} again`)
      }
      setCarried({ ...src.spec })
      sfxPickup()
      return flash(`Carrying ${src.spec.name}`)
    }
    if (t.kind === 'shelf') {
      const sp = w.shelf[t.i]
      if (!sp) return flash('The output shelf — new spaces land here')
      setCarried({ ...sp })
      setW(current, (ww) => ({ ...ww, shelf: ww.shelf.map((q, i) => (i === t.i ? null : q)) }))
      sfxPickup()
      return flash(sp.plugged ? `Carrying ${sp.name} — plugged! Feed it in and you’ll be working with a cone` : `Carrying ${sp.name}`, sp.plugged ? 3800 : 2800)
    }
    // the machine
    if (!carried) return flash('Carry a space here first: click a pedestal or the shelf')
    const op = OPS[w.op]
    const hopper = [...w.hopper, carried]
    setCarried(null)
    sfxFeed()
    if (hopper.length < op.inputs) {
      setW(current, (ww) => ({ ...ww, hopper }))
      return flash(`${op.label}: one in — feed it a second space`)
    }
    run(current, hopper, w.op)
  }

  const chooseOp = (op) => {
    if (!wk || wk.op === op) return
    const back = wk.hopper
    setW(current, (w) => ({ ...w, op, hopper: [] }))
    if (back.length && !carried) {
      setCarried(back[0])
      flash(`${OPS[op].label} · ${back[0].name} came back out of the hopper`)
    } else flash(`${OPS[op].label}: ${OPS[op].blurb}`)
  }

  // the question at the end of a works
  const answer = (v) => {
    const g = goal
    if (v !== g.answer) {
      sfxWrong()
      setAskOpen(false)
      return say(g.wrong, 'ask')
    }
    sfxCorrect()
    setAskOpen(false)
    advanceGoal(current, g.right)
  }

  // Coners go for unplugged pedestals at their own works
  ribbonApi.current = {
    target: (e) => {
      const w = works[e.site]
      if (!w || done[e.site] || e.site !== current) return null
      const s = SITE[e.site]
      const open = [
        ...w.sources.map((q, i) => (q.plugged ? null : s.sources[i].at)),
        ...w.shelf.map((q, i) => (q && !q.plugged ? s.shelf[i] : null)),
      ].filter(Boolean)
      if (!open.length) return null
      return W(s, open[Math.floor(e.seed * 7) % open.length])
    },
    snip: (x, z) => {
      const near = (id, at) => Math.hypot(W(SITE[id], at)[0] - x, W(SITE[id], at)[1] - z) < 0.9
      for (const id of STATION_ORDER) {
        const s = SITE[id]
        const w = works[id]
        const i = s.sources.findIndex((src, k) => !w.sources[k].plugged && near(id, src.at))
        const j = i < 0 ? s.shelf.findIndex((at, k) => w.shelf[k] && !w.shelf[k].plugged && near(id, at)) : -1
        if (i < 0 && j < 0) continue
        if (i >= 0) setW(id, (ww) => ({ ...ww, sources: ww.sources.map((q, k) => (k === i ? { spec: plugOf(q.spec), plugged: true } : q)) }))
        else setW(id, (ww) => ({ ...ww, shelf: ww.shelf.map((q, k) => (k === j && q ? { ...plugOf(q), via: 'plug' } : q)) }))
        sfxPlug()
        const what = i >= 0 ? SPECIMENS[s.sources[i].spec].name : w.shelf[j].name
        if (!plugSeen) {
          setPlugSeen(true)
          if (phase === 'play') say(HINTS05.firstPlug)
        } else flash(i >= 0 ? `A Coner plugged ${what} — click the pedestal to pull the plug` : `A Coner plugged ${what} on the shelf — it’s a cone now`, 3600)
        return true
      }
      return false
    },
  }

  // the wave at the Recipe Board is done when its spawn are gone
  useEffect(() => {
    if (waveOn && !enemies.recipe_board) setWaveOn(false)
  }, [waveOn, enemies])

  // weapons
  useEffect(() => {
    const key = (e) => {
      if (e.code === 'Digit1') setTool('lash')
      else if (e.code === 'Digit2') setTool('smith')
      else if (e.code === 'KeyQ') setTool((w) => (w === 'lash' ? 'smith' : 'lash'))
    }
    const wheel = (e) => Math.abs(e.deltaY) > 4 && setTool((w) => (w === 'lash' ? 'smith' : 'lash'))
    window.addEventListener('keydown', key)
    window.addEventListener('wheel', wheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('wheel', wheel)
    }
  }, [])

  // ---------- talking to Emmy: walk up to her and press E (or the button) for advice
  const canTalk = nearEmmy && phase === 'play' && !askOpen && !levelClear && !lesson
  const talkToEmmy = () => {
    if (!canTalk) return
    const s = stateRef.current
    const em = emmyAt.current
    if (s) em.rotY = Math.atan2(s.x - em.x, s.z - em.z) // she turns to face him
    say(emmyAdvice05({ station: current, goal, works: wk, carried, here: here.site, exitOpen, enemies: current ? enemies[current] : 0, name: current ? SITE[current].name : '' }))
  }
  const talkRef = useRef(null)
  talkRef.current = talkToEmmy
  useEffect(() => {
    const k = (e) => {
      if (e.code === 'KeyE') talkRef.current?.()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

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
    } else if (next === 'ask') {
      setPhase('play')
      setAskOpen(true)
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

  // ---------- game layer
  const playEnabled = phase === 'play' && !lesson && !askOpen && !levelClear
  const gameKey = `cone:${knockouts}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
    }
    if (waveOn) for (const [type, x, z] of SITE.recipe_board.wave) list.push({ type, x: x + SITE.recipe_board.pos[0], z: z + SITE.recipe_board.pos[1], site: 'recipe_board' })
    return { mode: 'overworld', bySite: true, start: checkpoint, enemies: list }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])
  frameRef.current = current && here.site === current && met[current] ? { center: [SITE[current].pos[0] + 1.1, SITE[current].pos[1] + 0.4], size: 8.6, follow: 0.12 } : null
  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  if (import.meta.env.DEV) window.__lvl5 = { here, done, goalIdx, works, carried, phase, enemies, setTool, current, goal, chooseOp, SITE, W } // dev

  const scene = (
    <ConeScene
      layout={layout}
      sites={SITES}
      works={works}
      shelfK={shelfK}
      runRefs={runRefs}
      current={current}
      carried={carried}
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
      ribbonApi={ribbonApi}
      playEnabled={playEnabled}
      tool={tool}
      onAction={onAction}
      onEnemies={(by) => setEnemies(by)}
      onHearts={setHearts}
    />
  )

  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen ? 'Walk through the gate to the Timber Yard' : current ? `Works ${nDone}/4 · next: ${SITE[current].name}` : ''
  const atStation = current && here.site === current && met[current]
  const ops = current ? STATIONS[current].ops : []
  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'ask') return 'Answer Emmy'
    if (carried) return `Carrying ${carried.name} — click the machine to feed it`
    return 'Click a pedestal (or the shelf) to pick up a space'
  })()

  return (
    <div className="screen level">
      <Canvas camera={{ position: [0, 11, 28], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
        {scene}
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
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())} title="Watch the lesson: operations on spaces">
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Level 5 · Cone Zone</span>
            <h2>{levelMeta?.title || 'Cone Zone'}</h2>
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
            {here.site && (
              <div className="here">
                <strong>{SITE[here.site].name}</strong>
                {done[here.site] ? ' · finished' : enemies[here.site] ? ` · Null’s spawn: ${enemies[here.site]}` : ' · clear'}
              </div>
            )}
          </div>
        </div>

        {atStation && wk && (
          <div className="rules-panel forge-panel works-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            {goal?.type === 'make' && (
              <p className="forge-word">
                make: <span className="rule-math">{SPECIMENS[goal.target].name}</span>
              </p>
            )}
            {ops.length > 1 && (
              <div className="op-row" role="group" aria-label="Operation">
                {ops.map((op) => (
                  <button key={op} type="button" className={`btn small op ${wk.op === op ? 'active' : ''}`} onClick={(e) => (chooseOp(op), e.currentTarget.blur())} title={OPS[op].blurb}>
                    {OPS[op].label}
                  </button>
                ))}
              </div>
            )}
            <p className="op-blurb">
              <b>{OPS[wk.op].label}</b>: {OPS[wk.op].blurb}
              {OPS[wk.op].inputs > 1 && ` · ${wk.hopper.length}/2 in the hopper`}
            </p>
            <div className="carry-line">
              <span>carrying:</span> {carried ? <strong className={carried.plugged ? 'plugged' : ''}>{carried.name}</strong> : <em>nothing</em>}
              {carried && <Cells spec={carried} />}
            </div>
            {lastMade && (
              <div className="carry-line made">
                <span>last made:</span> <strong>{lastMade.name}</strong>
                <Cells spec={lastMade} />
              </div>
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
                  {typeof v === 'number' ? `χ = ${v}` : v}
                </button>
              ))}
            </div>
          </div>
        )}

        {toast && !line && <div className="toast">{toast}</div>}

        {canTalk && (
          <button type="button" className="btn talk-btn" onClick={(e) => (talkToEmmy(), e.currentTarget.blur())}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}

        {!levelClear && !line && !askOpen && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Cone Zone" />}

        {!talking && !levelClear && !askOpen && (
          <div className="controls">
            <div className="weapons" role="group" aria-label="Weapon">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={(e) => (setTool('lash'), e.currentTarget.blur())}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'smith' ? 'active' : ''}`} onClick={(e) => (setTool('smith'), e.currentTarget.blur())} title="The Cell-Smith: click pedestals to pick up spaces, click the machine to feed them">
                ✦ Cell-Smith <kbd>2</kbd>
              </button>
            </div>
          </div>
        )}
        {playEnabled && !toast && (
          <div className="hint">{atStation ? (tool === 'smith' ? stepText : 'Press 2 for the Cell-Smith · lash Coners before their beam lands') : 'WASD to move · click to crack the Lash · 2 for the Cell-Smith · lost? walk up to Emmy and press E'}</div>
        )}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-0-5-lesson"
          Scene={ConeLesson}
          Overlay={ConeLessonOverlay}
          kicker="World 0 · Level 5 · Lesson"
          name="New Spaces from Old"
          embedded
          onDone={() => (setLesson(false), startConeMusic())}
          onSkip={() => (setLesson(false), startConeMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 · Level 5 clear</span>
            <h2>{levelMeta?.title || 'Cone Zone'}</h2>
            <p className="def">{DEFINITION05.text}</p>
            <p className="cite">
              {DEFINITION05.cite}{' '}
              <a href={DEFINITION05.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Beyond the gate: the Timber Yard. Next: 0-6 · Timber!</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ 0-6
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
