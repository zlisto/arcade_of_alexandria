import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MirrorScene from '../levels/w0/MirrorScene'
import LevelMovie from './LevelMovie'
import { useExitTrigger } from './exitTrigger'
import { MapNext } from './LevelMap'
import { cleanStroke, sampleShape, simulateSlide, snapPoint } from '../levels/w0/retraction'
import { grab, hookedStakes, loopShrunk, makeLoopRibbon, makeSiteEnv, release } from '../levels/w0/ribbon'
import { HINTS, RULES } from '../levels/w0/stages01'
import { DEFINITION03, HINTS03, OPENING, SITES03, SITE_ORDER } from '../levels/w0/stages03'
import layout from '../world/mirrorShoals.json'
import { buildSites, makeSiteWalkable, siteAtIn } from '../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxGrab,
  sfxHook,
  sfxRelease,
  sfxWrong,
  startMirrorMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../audio/chip'
import MirrorLesson, { MirrorLessonOverlay } from '../movies/MirrorLesson'
import MathText from './MathText'

/**
 * World 0 · Level 3 "Same Shape, Different Look" — Mirror Shoals.
 *
 *   Solid Shoal  — a loop on a reef with no holes shrinks to its post; a one-point
 *                  spine slides the whole reef onto a point: contractible
 *   Ring Reef    — its loop catches on the hole (proving it can't shrink waits for World 1)
 *   Twin Mirror  — one two-hole reef slides onto a figure-eight AND onto a theta: the
 *                  two are homotopy equivalent (both deformation retracts of one space)
 *   Dumbbell     — Null's ring spine leaks (a hole without a loop); a barbell works
 *   Mirror Gate  — any valid spine on an odd two-hole reef; the gate lights figure-eight,
 *                  theta, barbell — the ring stays dark — and opens onto the Foundry
 *
 * Mirror spawn come with intangible reflections across their reef's mirror line.
 */

const SLIDE_SECONDS = 2.6
const REGROW_SECONDS = 1.6
const TYPE_CPS = 45
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const siteAt = siteAtIn(SITES)
/** Where Gyroid stands on a reef (its center may be a hole: then by the loop's post). */
const spawnOf = (s) => (s.loop ? s.toWorld(...s.loop.post) : s.pos)
const REACH = 2.6 // how far from Gyroid a clicked stake can be grabbed
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
  commutator: ['500%', '53%', '19%'],
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

/** Minimap: reefs (gold once proven), causeways, the channel, Gyroid. */
function ShoalsMap({ pos, done, current, next, gateOpen }) {
  const P = ([x, z]) => [50 + x * 2.25, 30 + z * 1.8]
  const [gx, gz] = P(pos)
  const [c0] = P([layout.channel.x0, 0])
  const [c1] = P([layout.channel.x1, 0])
  return (
    <svg className="minimap" viewBox="0 0 100 60" aria-label="Mirror Shoals map">
      <rect width="100" height="60" rx="3" fill="#0b1626" />
      <rect x={c0} y="0" width={c1 - c0} height="60" fill="#9fd8ff" opacity="0.08" />
      {layout.causeways.map((c, i) => {
        const [x1, y1] = P(c.a)
        const [x2, y2] = P(c.b)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5c6680" strokeWidth="1.1" />
      })}
      {SITES.map((s) => {
        const [x, y] = P(s.pos)
        return <circle key={s.id} cx={x} cy={y} r={s.id === current ? 3.6 : 3} fill={done[s.id] ? '#ffb347' : s.kind === 'start' ? '#3ecfbf' : 'transparent'} stroke={s.id === current ? '#fff' : '#ffb347'} strokeWidth="0.7" />
      })}
      {(() => {
        const [x, y] = P(layout.gate.pos)
        return <rect x={x - 2.5} y={y - 1.5} width="5" height="3" fill="#ff8a3a" opacity="0.7" />
      })()}
      <MapNext from={[gx, gz]} to={next ? P(SITE[next].pos) : gateOpen ? P(layout.gate.pos) : null} label={next ? 'NEXT' : 'EXIT'} />
      <circle cx={gx} cy={gz} r="1.6" fill="#3ecfbf" stroke="#fff" strokeWidth="0.5" />
    </svg>
  )
}

export default function Level03({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-3')
  const samplesBySite = useMemo(() => Object.fromEntries(SITES.map((s) => [s.id, sampleShape(s.shape)])), [])
  const skipTo = Math.max(0, SITE_ORDER.indexOf(startAt))

  // loop ribbons (site-local), stepped by the scene
  const loopsRef = useRef(null)
  const freshLoops = () => ({ ribbons: Object.fromEntries(SITES.filter((s) => s.loop).map((s) => [s.id, { r: makeLoopRibbon(s.loop), env: makeSiteEnv(s.def), site: s }])) })
  if (!loopsRef.current) {
    loopsRef.current = freshLoops()
    for (const id of SITE_ORDER.slice(0, Math.max(0, SITE_ORDER.indexOf(startAt)))) {
      const e = loopsRef.current.ribbons[id]
      if (!e) continue
      while (e.r.pins.length > 2) e.r.pins.splice(1, 1) && e.r.spans.splice(0, 2, [...e.r.spans[0], ...e.r.spans[1].slice(1)])
    }
  }

  const [done, setDone] = useState(() => Object.fromEntries(SITE_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [loopDone, setLoopDone] = useState(() => Object.fromEntries(SITE_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [spineIdx, setSpineIdx] = useState({})
  const [strokesBySite, setStrokesBySite] = useState({})
  const [liveStroke, setLiveStroke] = useState(null)
  const drawing = useRef(null)
  const [sim, setSim] = useState(null)
  const [simSite, setSimSite] = useState(null)
  const [t, setT] = useState(0)
  const tRef = useRef(0)
  const [running, setRunning] = useState(0)
  const [enemies, setEnemies] = useState({})
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? spawnOf(SITE[SITE_ORDER[skipTo]]) : layout.start))
  const [tool, setTool] = useState('lash')
  const [spooling, setSpooling] = useState(false)
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  shownNow.current = shown
  const [met, setMet] = useState({})
  const [hooked, setHooked] = useState({})
  const [gateLit, setGateLit] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const [levelClear, setLevelClear] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [lesson, setLesson] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const flash = (text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }
  const [here, setHere] = useState({ site: null, pos: checkpoint })
  const stateRef = useRef(null)
  const frameRef = useRef(null)
  const spawnRef = useRef(null)
  const grabbing = useRef(null)
  const judged = useRef(null)
  const reported = useRef(false)
  const afterRegrow = useRef(null)

  const current = SITE_ORDER.find((id) => !done[id]) || null
  const setTime = useCallback((v) => {
    tRef.current = v
    setT(v)
  }, [])
  const say = useCallback((ls, next = 'play') => {
    setLines(ls)
    setLineIdx(0)
    setPhase(ls.length ? 'talk:' + next : next)
  }, [])

  useEffect(() => {
    unlockAudio()
    startMirrorMusic()
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

  // where is Gyroid; which stakes still hold the loops
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const at = siteAt(s.x, s.z)?.id || null
      setHere((h) => (h.site === at && Math.abs(h.pos[0] - s.x) < 0.05 && Math.abs(h.pos[1] - s.z) < 0.05 ? h : { site: at, pos: [s.x, s.z] }))
      const L = loopsRef.current.ribbons
      const hk = Object.fromEntries(Object.keys(L).map((k) => [k, hookedStakes(L[k].r)]))
      setHooked((old) => (JSON.stringify(old) === JSON.stringify(hk) ? old : hk))
    }, 150)
    return () => clearInterval(id)
  }, [])
  const site = here.site ? SITE[here.site] : null
  const working = site && site.id === current && met[site.id]

  // arriving at a reef
  useEffect(() => {
    if (!site || phase !== 'play' || done[site.id]) return
    if (site.id !== current) {
      if (!met['early:' + site.id]) {
        setMet((m) => ({ ...m, ['early:' + site.id]: true }))
        say(SITES03[site.id].early)
      }
      return
    }
    if (met[site.id]) return
    setMet((m) => ({ ...m, [site.id]: true }))
    const extra = site.enemies?.some(([type]) => type === 'mirror') && !met.mirrorHint ? [HINTS03.mirror] : []
    if (extra.length) setMet((m) => ({ ...m, mirrorHint: true }))
    say([...SITES03[site.id].arrive, ...extra])
  }, [site, phase, current, met, done, say])

  // knocked out → back to the last proven reef
  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    if (grabbing.current) release(loopsRef.current.ribbons[grabbing.current].r, [])
    grabbing.current = null
    say([HINTS03.knockout])
  }, [hearts, say])

  // a loop let go of all its stakes: shrinks (solid ground) or catches (a hole)
  useEffect(() => {
    const id = setInterval(() => {
      if (phase !== 'play') return
      for (const sid of ['solid_shoal', 'ring_reef']) {
        if (loopDone[sid] || sid !== current) continue
        const { r } = loopsRef.current.ribbons[sid]
        const free = !r.pins.some((p) => p.kind === 'stake' || p.kind === 'grab')
        if (!free) continue
        if (sid === 'solid_shoal' && loopShrunk(r)) {
          setLoopDone((d) => ({ ...d, [sid]: true }))
          sfxCorrect()
          say(SITES03.solid_shoal.loopDone)
        }
        if (sid === 'ring_reef') {
          setLoopDone((d) => ({ ...d, [sid]: true }))
          setDone((d) => ({ ...d, ring_reef: true }))
          setCheckpoint(spawnOf(SITE.ring_reef))
          sfxWrong()
          say(SITES03.ring_reef.done)
        }
      }
    }, 400)
    return () => clearInterval(id)
  }, [phase, loopDone, current, say])

  // slide / regrow animation
  useEffect(() => {
    if (!running) return
    let raf
    const t0 = performance.now()
    const from = tRef.current
    const tick = () => {
      const el = (performance.now() - t0) / 1000
      if (running > 0) {
        const v = Math.min(1, from + el / SLIDE_SECONDS)
        setTime(v)
        if (v >= 1) return setRunning(0)
      } else {
        const v = Math.max(0, from - el / REGROW_SECONDS)
        setTime(v)
        if (v <= 0) {
          setRunning(0)
          setSim(null)
          setSimSite(null)
          afterRegrow.current?.()
          afterRegrow.current = null
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, setTime])

  const spinesOf = (id) => SITE[id].spines || []
  const spineOf = (id) => spinesOf(id)[spineIdx[id] || 0]

  // verdict at the end of a slide
  useEffect(() => {
    if (t < 1 || !sim || running || phase !== 'play' || judged.current === sim) return
    judged.current = sim
    const id = simSite
    const k = spineIdx[id] || 0
    const spec = spinesOf(id)[k]
    const words = SITES03[id]
    const nextSpine = () => {
      setSpineIdx((m) => ({ ...m, [id]: k + 1 }))
      setStrokesBySite((m) => ({ ...m, [id]: [] }))
    }
    if (spec?.doomed) {
      // Null's ring spine on the dumbbell: it can only leak
      sfxWrong()
      afterRegrow.current = nextSpine
      return say(words.doomed, 'regrow')
    }
    if (!sim.valid) {
      sfxWrong()
      const key = !(strokesBySite[id] || []).length ? 'empty' : sim.problem || (!sim.beaconHit.every(Boolean) ? 'beacons' : null)
      return say([HINTS[key] || HINTS.leak], 'back')
    }
    sfxCorrect()
    if (k + 1 < spinesOf(id).length) {
      afterRegrow.current = nextSpine
      return say(words.spines?.[k] || [], 'regrow')
    }
    // the reef's last spine: proven
    setDone((d) => ({ ...d, [id]: true }))
    setCheckpoint(spawnOf(SITE[id]))
    if (id === 'mirror_gate') {
      setGateLit(true)
      afterRegrow.current = () => {
        setGateOpen(true) // the mirror lifts; the level ends when Gyroid walks through
        setPhase('clear')
      }
      return say(words.done, 'regrow')
    }
    // the reef grows back from its spine, proven (gold-tinted)
    say(id === 'solid_shoal' ? words.done : words.spines?.[k] || words.done || [], 'regrow')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, sim, running, phase, simSite])

  // ---------- Spool: loops (grab / let go) or spine thread
  const invalidate = () => {
    setSim(null)
    setSimSite(null)
    setTime(0)
  }
  const loopMode = (s) => s && s.loop && !loopDone[s.id] && s.id === current
  const onStrokeStart = (x, z, cx = x, cz = z) => {
    const s = siteAt(x, z)
    if (!s || s.id !== current || done[s.id] || phase !== 'play') return false
    if (loopMode(s)) {
      const { r } = loopsRef.current.ribbons[s.id]
      if (!grabbing.current) release(r, []) // never leave a loop held with nobody holding it
      // grab where Gyroid stands — or the stake / ribbon the player clicked, if it's within reach
      const [lx, lz] = s.toLocal(x, z)
      const [mx, mz] = s.toLocal(cx, cz)
      const nearClick = Math.hypot(mx - lx, mz - lz) <= REACH
      // on a loop island the job is unhooking stakes: the one under Gyroid, else the one clicked
      const g = grab(r, lx, lz, 0.95, { stakesOnly: true }) || (nearClick && grab(r, mx, mz, 1.1, { stakesOnly: true }))
      if (!g) {
        flash('Get Gyroid closer to a × stake, then click it with the Spool')
        return false
      }
      grabbing.current = s.id
      sfxGrab()
      return true
    }
    if (!s.spines) return false
    const [lx, lz] = s.toLocal(x, z)
    drawing.current = { site: s.id, pts: [snapPoint(strokesBySite[s.id] || [], lx, lz)] }
    setLiveStroke(drawing.current.pts)
    if (simSite === s.id) invalidate()
    return true
  }
  const commit = (cx, cz) => {
    if (grabbing.current) {
      const id = grabbing.current
      grabbing.current = null
      const { r, site: ls } = loopsRef.current.ribbons[id]
      const res = release(r, [])
      if (res === 'hook') sfxHook()
      else sfxRelease()
      // letting go while standing on another pinned stake unhooks that one too, in the same click
      const s = stateRef.current
      if (s && r.pins.some((p) => p.kind === 'stake')) {
        const [lx, lz] = ls.toLocal(s.x, s.z)
        const [mx, mz] = cx === undefined ? [lx, lz] : ls.toLocal(cx, cz)
        const reach = Math.hypot(mx - lx, mz - lz) <= REACH
        if (grab(r, lx, lz, 0.95, { stakesOnly: true }) === 'unhook' || (reach && grab(r, mx, mz, 1.1, { stakesOnly: true }) === 'unhook')) {
          grabbing.current = id
          s.spooling = true
          setSpooling(true)
          sfxGrab()
        }
      }
      return
    }
    const d = drawing.current
    drawing.current = null
    setLiveStroke(null)
    if (!d || !d.pts.length) return
    const prev = strokesBySite[d.site] || []
    const s = d.pts
    const end = snapPoint(prev, s[s.length - 1][0], s[s.length - 1][1])
    const closes = s.length > 8 && Math.hypot(end[0] - s[0][0], end[1] - s[0][1]) < 0.4
    const pts = [...s.slice(0, -1), closes ? s[0] : end]
    setStrokesBySite((m) => ({ ...m, [d.site]: [...prev, pts.length > 1 ? cleanStroke(pts) : pts] }))
  }
  const onStrokeMove = (x, z) => {
    const d = drawing.current
    if (!d) return
    const s = SITE[d.site]
    if (!s.containsWorld(x, z)) return commit()
    const [lx, lz] = s.toLocal(x, z)
    const last = d.pts[d.pts.length - 1]
    if (Math.hypot(lx - last[0], lz - last[1]) < 0.06) return
    d.pts = [...d.pts, [lx, lz]]
    setLiveStroke(d.pts)
  }

  const siteClear = (id) => !enemies[id]
  const drawSite = !!site && site.id === current && !!site.spines && !loopMode(site) && !done[site.id]
  const canSlideHere = drawSite && siteClear(site.id) && (strokesBySite[site.id] || []).length > 0
  const slide = () => {
    if (!canSlideHere) return
    const sp = spineOf(site.id)
    const result = simulateSlide(site.shape, samplesBySite[site.id], strokesBySite[site.id], sp?.beacons || [])
    setSim(result)
    setSimSite(site.id)
    setTime(0)
    setRunning(1)
  }
  const undo = () => site && (setStrokesBySite((m) => ({ ...m, [site.id]: (m[site.id] || []).slice(0, -1) })), simSite === site.id && invalidate())
  const clearSite = () => site && (setStrokesBySite((m) => ({ ...m, [site.id]: [] })), simSite === site.id && invalidate())
  const resetLoop = () => {
    if (!site?.loop) return
    loopsRef.current.ribbons[site.id] = { r: makeLoopRibbon(site.loop), env: makeSiteEnv(site.def), site }
    grabbing.current = null
    if (stateRef.current) stateRef.current.spoolDropped = true
  }

  // weapons
  useEffect(() => {
    const key = (e) => {
      if (e.code === 'Digit1') setTool('lash')
      else if (e.code === 'Digit2') setTool('spool')
      else if (e.code === 'KeyQ') setTool((w) => (w === 'lash' ? 'spool' : 'lash'))
    }
    const wheel = (e) => Math.abs(e.deltaY) > 4 && setTool((w) => (w === 'lash' ? 'spool' : 'lash'))
    window.addEventListener('keydown', key)
    window.addEventListener('wheel', wheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('wheel', wheel)
    }
  }, [])

  // ---------- dialogue
  const advance = () => {
    const full = lines[lineIdx]?.text.length ?? 0
    if (shown < full) return setShown(full)
    if (lineIdx + 1 < lines.length) return setLineIdx(lineIdx + 1)
    const next = phase.split(':')[1]
    if (next === 'regrow') {
      setPhase('play')
      setRunning(-1)
    } else if (next === 'back') {
      setPhase('play')
      invalidate()
    } else if (next === 'keep') {
      setPhase('play')
    } else if (next === 'clear') {
      setGateOpen(true)
      setPhase('clear')
    } else setPhase(next)
  }
  const talking = phase.startsWith('talk:')
  const line = talking ? lines[lineIdx] : null
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
      // never type backwards over a line the player already finished with a click
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

  // Final Fantasy VII-style: Space / Enter finish the line, then move to the next box
  const advanceRef = useRef(null)
  advanceRef.current = line ? advance : null
  useEffect(() => {
    const onKey = (e) => {
      if (!advanceRef.current || (e.code !== 'Space' && e.code !== 'Enter')) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return
      e.preventDefault()
      advanceRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- game layer
  const playEnabled = (phase === 'play' || phase === 'clear') && !running && !lesson && t === 0
  const spoolEnabled = playEnabled && phase === 'play' && !!site && site.id === current && (loopMode(site) || drawSite)
  const gameKey = `shoals:${knockouts}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, gateOpen ? [[layout.gate.exit.a, layout.gate.exit.b]] : []), [gateOpen])
  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id, axis: s.pos[0] })
    }
    return { mode: 'overworld', bySite: true, start: checkpoint, enemies: list }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])
  const simWorld = useMemo(() => {
    if (!sim || !simSite) return null
    const s = SITE[simSite]
    return { endpointAt: (x, z) => (s.containsWorld(x, z) ? s.toWorld(...(sim.endpointAt(...s.toLocal(x, z)) || s.toLocal(x, z))) : [x, z]) }
  }, [sim, simSite])
  frameRef.current = working && !done[site.id] ? { center: site.pos, size: 9.5 } : null

  if (import.meta.env.DEV) window.__lvl3 = { here, done, loopDone, spineIdx, phase, strokesBySite, sim, enemies, setTool, loops: loopsRef.current, setStrokes: setStrokesBySite, grabbing } // dev

  const scene = (
    <MirrorScene
      layout={layout}
      sites={SITES}
      samplesBySite={samplesBySite}
      strokesBySite={strokesBySite}
      liveStroke={liveStroke}
      drawingSite={drawing.current?.site}
      activeSite={simSite}
      sim={sim}
      simWorld={simWorld}
      tRef={tRef}
      saved={done}
      spineIdx={spineIdx}
      loopsRef={loopsRef}
      hooked={hooked}
      gateLit={gateLit}
      gateOpen={gateOpen}
      walkable={walkable}
      game={game}
      gameKey={gameKey}
      stateRef={stateRef}
      frameRef={frameRef}
      spawnRef={spawnRef}
      playEnabled={playEnabled}
      spoolEnabled={spoolEnabled}
      tool={tool}
      onStrokeStart={onStrokeStart}
      onStrokeMove={onStrokeMove}
      onStrokeEnd={commit}
      onEnemies={(by) => ((reported.current = true), setEnemies(by))}
      onHearts={setHearts}
      onSpooling={setSpooling}
    />
  )

  const proven = SITE_ORDER.filter((id) => done[id]).length
  const objective = levelClear || done.mirror_gate ? (gateOpen ? 'Walk through the Mirror Gate' : 'The gate is judging…') : `Reefs proven ${proven}/5 · next: ${SITE[current]?.name}`
  // past the gate's threshold, onto the causeway toward the Foundry
  useExitTrigger(gateOpen, stateRef, (x, z) => Math.abs(x - layout.gate.pos[0]) < 1.4 && z < layout.gate.pos[1] - 0.8, () => setLevelClear(true))
  const spawnHere = site ? enemies[site.id] || 0 : 0
  const sp = site && site.spines ? spineOf(site.id) : null
  const ruleState = (id) => (!sim || simSite !== here.site || t < 1 ? 'idle' : sim.rules[id] ? 'ok' : 'bad')
  const beaconsOk = sim && simSite === here.site && t >= 1 ? sim.beaconHit.every(Boolean) : null
  const showRules = drawSite

  return (
    <div className="screen level">
      <Canvas camera={{ position: [0, 11, 22], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
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
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())} title="Watch the lesson: homotopy equivalence">
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Level 3 · Mirror Shoals</span>
            <h2>{levelMeta?.title || 'Same Shape, Different Look'}</h2>
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
            {site && (
              <div className="here">
                <strong>{site.name}</strong>
                {done[site.id] ? ' · proven' : spawnHere ? ` · Null’s spawn: ${spawnHere}` : ' · clear'}
              </div>
            )}
          </div>
        </div>

        {!line && <ShoalsMap pos={here.pos} done={done} current={here.site} next={current} gateOpen={gateOpen} />}

        {showRules && (
          <div className="rules-panel">
            <h3>
              {sp?.name && sp.name !== 'any' ? `Spine: ${sp.name}` : site.id === 'solid_shoal' ? 'Spine: a single point' : 'Spine: anything that works'} · deformation retraction
            </h3>
            <ul>
              {RULES.map((r) => {
                const st = ruleState(r.id)
                return (
                  <li key={r.id} className={`rule ${st}`}>
                    <span className="rule-mark">{st === 'ok' ? '✓' : st === 'bad' ? '✗' : '·'}</span>
                    <span className="rule-label">{r.label}</span>
                    <span className="rule-math">{r.math}</span>
                  </li>
                )
              })}
              {sp?.beacons?.length > 0 && (
                <li className={`rule goal ${beaconsOk === null ? 'idle' : beaconsOk ? 'ok' : 'bad'}`}>
                  <span className="rule-mark">{beaconsOk === null ? '·' : beaconsOk ? '✓' : '✗'}</span>
                  <span className="rule-label">Spine through every beacon</span>
                </li>
              )}
            </ul>
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

        {!talking && !levelClear && (
          <div className="controls">
            <div className="weapons" role="group" aria-label="Weapon">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={(e) => (setTool('lash'), e.currentTarget.blur())}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'spool' ? 'active' : ''} ${spooling ? 'threading' : ''}`} onClick={(e) => (setTool('spool'), e.currentTarget.blur())}>
                ◯ Spool <kbd>2</kbd>
              </button>
            </div>
            {drawSite && (
              <>
                <button type="button" className="btn ghost" onClick={undo} disabled={!(strokesBySite[site.id] || []).length || !!running}>
                  Undo
                </button>
                <button type="button" className="btn ghost" onClick={clearSite} disabled={!(strokesBySite[site.id] || []).length || !!running}>
                  Clear
                </button>
                <button type="button" className="btn primary" onClick={slide} disabled={!canSlideHere || !!running || (!!sim && t > 0)} title={!siteClear(site.id) ? 'Clear Null’s spawn first' : ''}>
                  Slide ▶
                </button>
              </>
            )}
            {site && loopMode(site) && (
              <button type="button" className="btn ghost" onClick={(e) => (resetLoop(), e.currentTarget.blur())}>
                ↺ Reset loop
              </button>
            )}
          </div>
        )}
        {playEnabled && phase === 'play' && (
          <div className="hint">
            {spooling
              ? grabbing.current
                ? 'Holding the loop · click to let go — or click on the next × stake to unhook it too'
                : 'Threading… walk to lay spine · click to stop'
              : tool === 'spool'
                ? site && loopMode(site)
                  ? 'Walk onto a pinned stake (×) and click to grab the loop there'
                  : drawSite
                    ? site.id === 'solid_shoal'
                      ? 'Stand on the beacon · click, then click again: a one-point spine'
                      : 'Click to start the thread · walk it through the beacons · click to stop'
                    : 'The Spool works on the reef you’re proving'
                : drawSite && !siteClear(site.id)
                  ? 'Clear the spawn first — lash the solid ones, not the reflections'
                  : 'WASD to move · click to crack the Lash · 2 for the Spool'}
          </div>
        )}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-0-3-lesson"
          Scene={MirrorLesson}
          Overlay={MirrorLessonOverlay}
          kicker="World 0 · Level 3 · Lesson"
          name="Same Shape"
          embedded
          onDone={() => (setLesson(false), startMirrorMusic())}
          onSkip={() => (setLesson(false), startMirrorMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 · Level 3 clear</span>
            <h2>{levelMeta?.title || 'Same Shape, Different Look'}</h2>
            <p className="def">{DEFINITION03.text}</p>
            <p className="cite">
              {DEFINITION03.cite}{' '}
              <a href={DEFINITION03.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Through the Mirror Gate, the Skeleton Foundry’s forges are burning. Next: 0-4 · Some Assembly Required.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                On to the Skeleton Foundry ▸
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
