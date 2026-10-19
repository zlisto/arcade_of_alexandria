import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FlatsScene from '../levels/w0/FlatsScene'
import LevelMovie from './LevelMovie'
import { useExitTrigger } from './exitTrigger'
import { MapNext } from './LevelMap'
import TidewarpLesson, { LessonOverlay } from '../movies/TidewarpLesson'
import {
  cut,
  firstWetFrame,
  frameDistance,
  grab,
  hasCut,
  hookedStakes,
  jumpMovie,
  loopMovie,
  makeFlats,
  makeRibbon,
  matchesTarget,
  release,
  retie,
  snapperTarget,
  targetPath,
  tideHomotopy,
} from '../levels/w0/ribbon'
import { DEFINITION02, HINTS02, RULES02, ZONES, ZONE_ORDER, OPENING } from '../levels/w0/stages02'
import layout from '../world/tidewarpFlats.json'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setGlassTick,
  setMuted as setAudioMuted,
  sfxCorrect,
  sfxGrab,
  sfxHook,
  sfxMarker,
  sfxRelease,
  sfxSnip,
  sfxTear,
  sfxTie,
  sfxWrong,
  startNullMusic,
  startTideMusic,
  stopMusic,
  switchMusic,
  textBlip,
  unlockAudio,
} from '../audio/chip'
import MathText from './MathText'

/**
 * World 0 · Level 2 "Bend, Don't Break" — Tidewarp Flats. Gyroid crosses the mended
 * causeway onto the wet flats and works four shrines in order:
 *
 *   Tide Line      — scrub the Tide Glass through the tide's homotopy; each frame is a map
 *   Hold the Posts — reshape a ribbon with the Spool, end posts fixed (homotopy rel endpoints),
 *                    hooking it onto stakes; Snappers clip it (a cut ribbon isn't continuous)
 *   The Pools      — one target goes round the near side of a pool and can be reached; the
 *                    far-side one can't, and proving that needs World 1's winding numbers
 *   Null's Snap    — find the frame where each of Null's fake deformations tears: one jumps
 *                    in time, one leaves the flats; then fight off his wave
 *
 * Clearing all four lets the tide go out and opens the way to Mirror Shoals (0-3).
 */

const TYPE_CPS = 45
const REPLAY_SECONDS = 3.2
const SCRUB_PER_SEC = 0.22
const MAX_LENGTH = { hold_posts: 19, the_pools: 22 }
const ZONE = Object.fromEntries(layout.zones.map((z) => [z.id, z]))
const RIBBON_ZONES = ['hold_posts', 'the_pools']
const TOOLS = ['lash', 'spool', 'glass']
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

const segDist = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax
  const dz = bz - az
  const l2 = dx * dx + dz * dz
  const u = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0
  return Math.hypot(x - (ax + u * dx), z - (az + u * dz))
}

const zoneAt = (x, z) => layout.zones.find((zn) => Math.hypot(x - zn.center[0], z - zn.center[1]) < zn.radius) || null

/** Minimap of the flats: outline, pools, shrines (gold once done), Gyroid. */
function FlatsMap({ pos, done, current, next, exitOpen }) {
  const P = ([x, z]) => [50 + x * 2.3, 30 + z * 2.3]
  const outline = layout.outline.map((p) => P(p).join(',')).join(' ')
  const [gx, gz] = P(pos)
  return (
    <svg className="minimap" viewBox="0 0 100 60" aria-label="Tidewarp Flats map">
      <rect width="100" height="60" rx="3" fill="#0b1626" />
      <polygon points={outline} fill="#2c3448" stroke="#5c6680" strokeWidth="0.6" />
      {layout.pools.map((p) => {
        const [x, y] = P(p.c)
        return <circle key={p.id} cx={x} cy={y} r={p.r * 2.3} fill="#0a4a52" />
      })}
      {layout.zones.map((zn) => {
        const [x, y] = P(zn.shrine)
        return <circle key={zn.id} cx={x} cy={y} r={zn.id === current ? 2.6 : 2} fill={done[zn.id] ? '#ffb347' : 'transparent'} stroke={zn.id === current ? '#fff' : '#ffb347'} strokeWidth="0.6" />
      })}
      <MapNext from={[gx, gz]} to={next ? P(layout.zones.find((z) => z.id === next).shrine) : exitOpen ? P(layout.exit.b) : null} label={next ? 'NEXT' : 'EXIT'} />
      <circle cx={gx} cy={gz} r="1.6" fill="#3ecfbf" stroke="#fff" strokeWidth="0.5" />
    </svg>
  )
}

export default function Level02({ concept, onBackToTitle, onNext, startAt }) {
  // debug: start at a later shrine, with the earlier ones done
  const skipTo = Math.max(0, ZONE_ORDER.indexOf(startAt))
  const levelMeta = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-2')
  const flats = useMemo(() => makeFlats(layout), [])

  // scripted homotopies and where the Tide Line's markers sit
  const movies = useMemo(() => {
    const tz = ZONE.tide_line
    const tide = tideHomotopy(tz.ribbon.a, tz.ribbon.b)
    const sz = ZONE.nulls_snap
    const pool = layout.pools.find((p) => p.zone === 'nulls_snap')
    const loop = loopMovie(sz.loop.post, pool.c, sz.loop.radius)
    return {
      tide,
      markers: tz.markers.map(([s, t]) => tide(s, t)),
      jump: jumpMovie(sz.jump.a, sz.jump.b, sz.jump.tear),
      loop,
      tears: [
        [sz.jump.tear - 0.025, sz.jump.tear + 0.025],
        (() => {
          const t0 = firstWetFrame(loop, flats)
          return [t0 - 0.02, t0 + 0.05]
        })(),
      ],
    }
  }, [flats])

  // playable ribbons live in a ref: the scene steps them every frame
  const ribbonsRef = useRef(null)
  if (!ribbonsRef.current) {
    ribbonsRef.current = {
      ribbons: Object.fromEntries(RIBBON_ZONES.map((id) => [id, makeRibbon(ZONE[id].ribbon)])),
      maxLength: MAX_LENGTH,
      history: {},
      recording: null,
      replay: null,
    }
  }

  const [done, setDone] = useState(() => Object.fromEntries(ZONE_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [targetIdx, setTargetIdx] = useState({ hold_posts: 0, the_pools: 0 })
  const [askOpen, setAskOpen] = useState(false)
  const [markersLit, setMarkersLit] = useState([false, false, false])
  const [movie, setMovie] = useState(null) // Null's movie on show: 0 jump, 1 loop
  const [wave, setWave] = useState(null) // null | 'on' | 'done'
  const [nullHere, setNullHere] = useState(false)
  const [snappersOut, setSnappersOut] = useState({})
  const [met, setMet] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play') // play | talk:<next> | replay | clear
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => {
    if (!skipTo) return layout.entry.start
    const zn = ZONE[ZONE_ORDER[skipTo]]
    const [cx, cz] = zn.center
    const [sx, sz] = zn.shrine
    const d = Math.hypot(sx - cx, sz - cz) || 1
    return [sx + ((sx - cx) / d) * 1.2, sz + ((sz - cz) / d) * 1.2] // just outside the shrine, facing in
  })
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('lash')
  const [glassUnlocked, setGlassUnlocked] = useState(skipTo > 0)
  const [glassT, setGlassTState] = useState(0)
  const glassTRef = useRef(0)
  const [spooling, setSpooling] = useState(false)
  const [here, setHere] = useState({ zone: null, pos: checkpoint })
  const [status, setStatus] = useState({ hooked: [], cut: false, match: null, strained: false })
  const [levelClear, setLevelClear] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [lesson, setLesson] = useState(false) // the 'How the Tide Works' lesson, over the level
  const stateRef = useRef(null)
  const frameRef = useRef(null) // the camera frames the shrine Gyroid is working
  const spawnRef = useRef(null)
  const ribbonApi = useRef(null)
  const grabbing = useRef(null)
  const reported = useRef(false)
  const solving = useRef(false)

  const current = ZONE_ORDER.find((id) => !done[id]) || null
  const setGlassT = useCallback((v) => {
    const c = Math.min(1, Math.max(0, v))
    glassTRef.current = c
    setGlassTState(c)
  }, [])
  const say = useCallback((ls, next = 'play') => {
    setLines(ls)
    setLineIdx(0)
    setPhase(ls.length ? 'talk:' + next : next)
  }, [])
  const toastTimer = useRef(null)
  const flash = (text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }
  const replayRaf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(replayRaf.current), [])

  // music
  useEffect(() => {
    unlockAudio()
    startTideMusic()
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      setGlassTick(false)
      stopMusic()
    }
  }, [])
  useEffect(() => setGlassTick(tool === 'glass'), [tool])

  // Count Null's boss theme while he's here and through his wave; the tide theme otherwise
  const boss = nullHere || wave === 'on'
  const levelTheme = boss ? startNullMusic : startTideMusic
  const wasBoss = useRef(false)
  useEffect(() => {
    if (boss === wasBoss.current) return
    wasBoss.current = boss
    switchMusic(boss ? startNullMusic : startTideMusic)
  }, [boss])

  useEffect(() => {
    if (!skipTo) say(OPENING)
  }, [say, skipTo])

  // where is Gyroid, and the live state of the ribbon in front of him
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const zn = zoneAt(s.x, s.z)?.id || null
      setHere((h) => (h.zone === zn && Math.abs(h.pos[0] - s.x) < 0.05 && Math.abs(h.pos[1] - s.z) < 0.05 ? h : { zone: zn, pos: [s.x, s.z] }))
      const R = ribbonsRef.current
      const all = RIBBON_ZONES.flatMap((rid) => hookedStakes(R.ribbons[rid]))
      const rz = RIBBON_ZONES.includes(zn) ? zn : null
      const r = rz && R.ribbons[rz]
      const tgt = rz && ZONE[rz].targets[targetIdx[rz]]
      const match = r && tgt && !done[rz] ? matchesTarget(r, ZONE[rz].ribbon, tgt, ZONE[rz].stakes, flats) : null
      setStatus((st) => {
        const next = { hooked: all, cut: !!r && hasCut(r), match, strained: R.strained > 0 }
        return JSON.stringify(st) === JSON.stringify(next) ? st : next
      })
    }, 150)
    return () => clearInterval(id)
  }, [targetIdx, done, flats])

  const zoneClear = (id) => !enemies[id]

  // the Snappers' view of the ribbons
  ribbonApi.current = {
    target: (e) => {
      if (!RIBBON_ZONES.includes(e.site) || done[e.site] || phase === 'replay') return null
      const r = ribbonsRef.current.ribbons[e.site]
      if (hasCut(r)) return null
      return snapperTarget(r, e.seed + Math.floor(Date.now() / 7000))
    },
    snip: (x, z) => {
      for (const id of RIBBON_ZONES) {
        if (done[id]) continue
        const r = ribbonsRef.current.ribbons[id]
        if (cut(r, x, z)) {
          sfxSnip()
          if (grabbing.current === id) {
            release(r, [])
            grabbing.current = null
            if (stateRef.current) stateRef.current.spoolDropped = true
          }
          flash('A Snapper clipped the ribbon — lash it, then re-tie the cut with the Spool')
          return true
        }
      }
      return false
    },
  }

  const startRecording = (id) => {
    const R = ribbonsRef.current
    R.recording = id
    R.history[id] = []
  }

  // arriving at a shrine
  useEffect(() => {
    const zn = here.zone
    if (!zn || phase !== 'play' || done[zn]) return
    if (zn !== current) {
      if (!met['early:' + zn]) {
        setMet((m) => ({ ...m, ['early:' + zn]: true }))
        say(ZONES[zn].early)
      }
      return
    }
    if (met[zn]) return
    setMet((m) => ({ ...m, [zn]: true }))
    if (zn === 'tide_line') {
      setGlassUnlocked(true)
      setGlassT(0.05)
    }
    if (RIBBON_ZONES.includes(zn)) {
      startRecording(zn)
      if (zn === 'the_pools' && !snappersOut.the_pools) {
        spawnRef.current?.((ZONE.the_pools.snappers || []).map(([x, z]) => ({ type: 'snapper', x, z, site: 'the_pools' })))
        setSnappersOut((s) => ({ ...s, the_pools: true }))
      }
    }
    if (zn === 'nulls_snap') {
      setNullHere(true)
      setMovie(0)
      setGlassT(0)
    }
    say(ZONES[zn].arrive)
  }, [here.zone, phase, current, met, done, say, setGlassT, snappersOut])

  // spawn report → knockout handling
  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    grabbing.current = null
    for (const id of RIBBON_ZONES) release(ribbonsRef.current.ribbons[id], [])
    say([HINTS02.knockout])
  }, [hearts, say])

  // Tide Line: light the markers the current frame touches
  useEffect(() => {
    if (current !== 'tide_line' || here.zone !== 'tide_line' || tool !== 'glass' || phase !== 'play') return
    if (!zoneClear('tide_line')) return
    let lit = false
    const next = markersLit.map((on, i) => {
      if (on) return on
      if (frameDistance(movies.tide, glassT, movies.markers[i]) < 0.17) {
        lit = true
        return true
      }
      return on
    })
    if (!lit) return
    sfxMarker()
    setMarkersLit(next)
    if (next.every(Boolean)) {
      setDone((d) => ({ ...d, tide_line: true }))
      setCheckpoint(ZONE.tide_line.shrine)
      sfxCorrect()
      say(ZONES.tide_line.done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glassT, current, here.zone, tool, phase, enemies])

  // a ribbon shrine is satisfied → replay the recorded homotopy, then the next step
  useEffect(() => {
    const id = here.zone
    if (!RIBBON_ZONES.includes(id) || id !== current || phase !== 'play' || solving.current) return
    if (!status.match?.ok || !zoneClear(id)) return
    solving.current = true
    sfxCorrect()
    const R = ribbonsRef.current
    R.recording = null
    const frames = (R.history[id] || []).slice()
    if (frames.length < 2) frames.push(...frames, ...frames)
    R.replay = { id, frames, t: 0 }
    setPhase('replay')
    // the replay runs on its own clock (not tied to this effect, which re-runs as the phase changes)
    const t0 = performance.now()
    const tick = () => {
      const u = Math.min(1, (performance.now() - t0) / 1000 / REPLAY_SECONDS)
      R.replay.t = u
      if (u < 1) replayRaf.current = requestAnimationFrame(tick)
      else finishTarget(id)
    }
    replayRaf.current = requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, here.zone, current, phase])

  const finishTarget = (id) => {
    const R = ribbonsRef.current
    R.replay = null
    solving.current = false
    const k = targetIdx[id]
    const spec = ZONES[id].targets[k]
    const nextK = k + 1
    const zone = ZONE[id]
    if (id === 'hold_posts' && nextK < zone.targets.length) {
      setTargetIdx((t) => ({ ...t, [id]: nextK }))
      startRecording(id)
      if (!snappersOut.hold_posts) {
        spawnRef.current?.((zone.snappers || []).map(([x, z]) => ({ type: 'snapper', x, z, site: id })))
        setSnappersOut((s) => ({ ...s, hold_posts: true }))
      }
      return say([...spec.done, ...ZONES[id].targets[nextK].intro])
    }
    if (id === 'the_pools') {
      setTargetIdx((t) => ({ ...t, [id]: 1 }))
      startRecording(id)
      return say(spec.done, 'ask')
    }
    setDone((d) => ({ ...d, [id]: true }))
    setCheckpoint(zone.shrine)
    say([...spec.done, ...ZONES[id].done])
  }

  // The Pools: the far-side pedestal's question
  const answerAsk = (impossible) => {
    setAskOpen(false)
    if (!impossible) return say(ZONES.the_pools.ask.wrong)
    sfxCorrect()
    ribbonsRef.current.recording = null
    setDone((d) => ({ ...d, the_pools: true }))
    setCheckpoint(ZONE.the_pools.shrine)
    say([...ZONES.the_pools.ask.right, ...ZONES.the_pools.done])
  }

  // Null's Snap: mark the frame where his 'deformation' tears
  const markTear = () => {
    if (movie === null || phase !== 'play' || here.zone !== 'nulls_snap') return
    const [lo, hi] = movies.tears[movie]
    const m = ZONES.nulls_snap.movies[movie]
    if (glassT < lo || glassT > hi) {
      sfxWrong()
      return say(ZONES.nulls_snap.wrong)
    }
    sfxTear()
    if (movie === 0) {
      setMovie(1)
      setGlassT(0)
      return say([...m.right, ...m.then])
    }
    setMovie(null)
    setNullHere(false)
    say(m.right, 'wave')
  }

  // Null's wave cleared → the tide goes out
  useEffect(() => {
    if (wave !== 'on' || !reported.current || enemies.nulls_snap) return
    setWave('done')
    setDone((d) => ({ ...d, nulls_snap: true }))
    say(ZONES.nulls_snap.done, 'clear')
  }, [wave, enemies, say])

  // ---------- Spool: grab / let go / re-tie
  const onStrokeStart = (x, z, cx = x, cz = z) => {
    const zn = zoneAt(x, z)?.id
    if (!RIBBON_ZONES.includes(zn) || done[zn] || phase !== 'play') return false
    const r = ribbonsRef.current.ribbons[zn]
    const nearClick = Math.hypot(cx - x, cz - z) <= 2.6 // the clicked spot counts if it's within reach
    if (retie(r, x, z) || (nearClick && retie(r, cx, cz))) {
      sfxTie()
      return false
    }
    const g = grab(r, x, z) || (nearClick && grab(r, cx, cz, 0.8))
    if (!g) {
      flash('Walk right up to the ribbon to grab it')
      return false
    }
    grabbing.current = zn
    sfxGrab()
    return true
  }
  const onStrokeEnd = () => {
    const zn = grabbing.current
    grabbing.current = null
    if (!zn) return
    const res = release(ribbonsRef.current.ribbons[zn], ZONE[zn].stakes)
    if (res === 'hook') sfxHook()
    else if (res === 'release') sfxRelease()
  }

  // ---------- keys: weapons, Tide Glass scrubbing, marking
  const scrubKeys = useRef({})
  useEffect(() => {
    const down = (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return
      if (e.code === 'Digit1') setTool('lash')
      else if (e.code === 'Digit2') setTool('spool')
      else if (e.code === 'Digit3' && glassUnlocked) setTool('glass')
      else if (e.code === 'KeyQ') setTool((w) => TOOLS.filter((t) => t !== 'glass' || glassUnlocked)[(TOOLS.indexOf(w) + 1) % (glassUnlocked ? 3 : 2)])
      else if (e.code === 'KeyZ' || e.code === 'KeyX') scrubKeys.current[e.code] = true
      else if (e.code === 'KeyE') markRef.current?.()
    }
    const up = (e) => (scrubKeys.current[e.code] = false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [glassUnlocked])
  const markRef = useRef(null)
  markRef.current = markTear

  const glassActive = tool === 'glass' && phase === 'play' && ((here.zone === 'tide_line' && current === 'tide_line') || (here.zone === 'nulls_snap' && movie !== null))
  useEffect(() => {
    if (!glassActive) return
    let raf
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const k = scrubKeys.current
      const dir = (k.KeyX ? 1 : 0) - (k.KeyZ ? 1 : 0)
      if (dir) setGlassT(glassTRef.current + dir * SCRUB_PER_SEC * dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const wheel = (e) => setGlassT(glassTRef.current + Math.sign(e.deltaY) * 0.008)
    window.addEventListener('wheel', wheel, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', wheel)
    }
  }, [glassActive, setGlassT])
  useEffect(() => {
    if (glassActive) return
    const wheel = (e) => Math.abs(e.deltaY) > 4 && setTool((w) => (w === 'lash' ? 'spool' : 'lash'))
    window.addEventListener('wheel', wheel, { passive: true })
    return () => window.removeEventListener('wheel', wheel)
  }, [glassActive])

  // ---------- dialogue
  const advance = () => {
    const full = lines[lineIdx]?.text.length ?? 0
    if (shown < full) return setShown(full)
    if (lineIdx + 1 < lines.length) return setLineIdx(lineIdx + 1)
    const next = phase.split(':')[1]
    if (next === 'ask') {
      setPhase('play')
      setAskOpen(true)
    } else if (next === 'wave') {
      setPhase('play')
      setWave('on')
      spawnRef.current?.(ZONE.nulls_snap.wave.map(([type, x, z]) => ({ type, x, z, site: 'nulls_snap' })))
      say(ZONES.nulls_snap.wave)
    } else if (next === 'clear') {
      setExitOpen(true) // the bridge appears; the level ends when Gyroid crosses it
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

  // ---------- the game layer
  const playEnabled = (phase === 'play' || phase === 'clear') && !askOpen && !lesson
  const inRibbonZone = RIBBON_ZONES.includes(here.zone) && here.zone === current
  const spoolEnabled = playEnabled && phase === 'play' && inRibbonZone
  const gameKey = `flats:${knockouts}`
  const walkable = useMemo(() => {
    const half = layout.causewayWidth / 2
    return {
      inside: (x, z) => flats.inside(x, z) || segDist(x, z, layout.entry.a, layout.entry.b) <= half || (exitOpen && segDist(x, z, layout.exit.a, layout.exit.b) <= half),
      insideForSpawn: (x, z) => flats.inside(x, z),
      bounds: { minX: -28, maxX: 28, minZ: -16, maxZ: 16 },
    }
  }, [flats, exitOpen])
  const game = useMemo(() => {
    const list = []
    for (const zn of layout.zones) {
      if (done[zn.id]) continue
      for (const [type, x, z] of zn.enemies || []) list.push({ type, x, z, site: zn.id })
      if (snappersOut[zn.id]) for (const [x, z] of zn.snappers || []) list.push({ type: 'snapper', x, z, site: zn.id })
    }
    if (wave === 'on') for (const [type, x, z] of ZONE.nulls_snap.wave) list.push({ type, x, z, site: 'nulls_snap' })
    return { mode: 'overworld', bySite: true, start: checkpoint, enemies: list, drift: (t) => [Math.sin(t * 0.35) * 0.35, Math.cos(t * 0.27) * 0.15] }
    // spawn are placed when the game (re)mounts — at the start and after a knockout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])

  const target = {}
  const targetStakes = {}
  for (const id of RIBBON_ZONES) {
    const zn = ZONE[id]
    const tg = zn.targets[targetIdx[id]]
    if (!done[id] && tg && met[id]) {
      target[id] = targetPath(zn.ribbon, tg, zn.stakes)
      targetStakes[id] = tg.stakes
    }
  }
  // frame the whole shrine while Gyroid is working it (so the target shape is on screen)
  const working = here.zone && here.zone === current && met[here.zone] && !done[here.zone]
  frameRef.current = working ? { center: ZONE[here.zone].center, size: ZONE[here.zone].radius * 2.1 } : null
  const view = {
    shrine: Object.fromEntries(layout.zones.map((zn) => [zn.id, done[zn.id] ? 'done' : zn.id === current ? 'active' : 'idle'])),
    glassAt: tool === 'glass' && here.zone === 'tide_line' && current === 'tide_line' ? 'tide_line' : null,
    markersLit,
    hooked: status.hooked,
    target,
    targetStakes,
    movie,
    nullHere,
    exitOpen,
  }

  if (import.meta.env.DEV) window.__lvl2 = { here, done, phase, status, targetIdx, ribbons: ribbonsRef.current, setTool, setGlassT, movie, movies, enemies, markTear } // dev

  const scene = (
    <FlatsScene
      layout={layout}
      flats={flats}
      zones={layout.zones}
      view={view}
      ribbonsRef={ribbonsRef}
      glassTRef={glassTRef}
      movies={movies}
      walkable={walkable}
      game={game}
      gameKey={gameKey}
      stateRef={stateRef}
      frameRef={frameRef}
      spawnRef={spawnRef}
      ribbonApi={ribbonApi}
      playEnabled={playEnabled}
      spoolEnabled={spoolEnabled}
      tool={tool}
      onStrokeStart={onStrokeStart}
      onStrokeMove={() => {}}
      onStrokeEnd={onStrokeEnd}
      onEnemies={(by) => ((reported.current = true), setEnemies(by))}
      onHearts={setHearts}
      onSpooling={setSpooling}
    />
  )

  const objective = (() => {
    if (done.nulls_snap) return 'Cross the bridge to Mirror Shoals (north-east)'
    const n = ZONE_ORDER.filter((id) => done[id]).length
    return `Shrines ${n}/4 · next: ${ZONE[current].name}`
  })()
  const zoneHere = here.zone ? ZONE[here.zone] : null
  useExitTrigger(exitOpen, stateRef, (x, z) => Math.hypot(x - layout.exit.b[0], z - layout.exit.b[1]) < 2, () => setLevelClear(true))
  const spawnHere = here.zone ? enemies[here.zone] || 0 : 0
  const showRules = inRibbonZone && !done[here.zone] && met[here.zone]
  const ruleState = (id) => {
    if (id === 'whole') return status.cut ? 'bad' : 'ok'
    if (id === 'posts' || id === 'land') return 'ok'
    if (id === 'target') return status.match?.ok ? 'ok' : 'idle'
    return 'idle'
  }
  const why = status.match && !status.match.ok ? status.match.why : null
  const showGlassPanel = (here.zone === 'tide_line' && current === 'tide_line' && met.tide_line) || (here.zone === 'nulls_snap' && movie !== null)

  return (
    <div className="screen level">
      <Canvas camera={{ position: [-17, 11, 18], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
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
              title="Sound on / off"
            >
              {muted ? '♪ off' : '♪ on'}
            </button>
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())} title="Watch the lesson: homotopies, the Tide Glass and the Spool">
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Level 2 · Tidewarp Flats</span>
            <h2>{levelMeta?.title || 'Bend, Don’t Break'}</h2>
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
            {zoneHere && (
              <div className="here">
                <strong>{zoneHere.name}</strong>
                {done[zoneHere.id] ? ' · done' : spawnHere ? ` · Null’s spawn: ${spawnHere}` : ' · clear'}
              </div>
            )}
          </div>
        </div>

        {!line && <FlatsMap pos={here.pos} done={done} current={here.zone} next={current} exitOpen={exitOpen} />}

        {showRules && (
          <div className="rules-panel">
            <h3>Homotopy rules</h3>
            <ul>
              {RULES02.map((r) => {
                const st = ruleState(r.id)
                return (
                  <li key={r.id} className={`rule ${st}`}>
                    <span className="rule-mark">{st === 'ok' ? '✓' : st === 'bad' ? '✗' : '·'}</span>
                    <span className="rule-label">{r.label}</span>
                    <span className="rule-math">{r.math}</span>
                  </li>
                )
              })}
            </ul>
            <p className="forgery-count">
              {here.zone === 'hold_posts' ? `Shrine path ${targetIdx.hold_posts + 1} of 2` : targetIdx.the_pools === 0 ? 'Near-side pedestal' : 'Far-side pedestal'}
              {why === 'stakes' && ' · hook the ribbon onto the shrine’s stakes, in order'}
              {why === 'side' && ' · it goes round the pool the other way'}
              {why === 'cut' && ' · re-tie the cut first'}
              {!zoneClear(here.zone) && ' · clear the spawn first'}
            </p>
          </div>
        )}

        {showGlassPanel && (
          <div className="rules-panel glass-panel">
            <h3>{here.zone === 'tide_line' ? 'Tide Glass · the tide’s homotopy' : `Null’s movie · ${ZONES.nulls_snap.movies[movie]?.name}`}</h3>
            <p className="glass-t">
              t = {glassT.toFixed(3)} <span className="rule-math">fₜ = F( · , t)</span>
            </p>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={glassT}
              disabled={tool !== 'glass'}
              onChange={(e) => setGlassT(Number(e.target.value))}
              onPointerUp={(e) => e.currentTarget.blur()}
              aria-label="Tide Glass time"
            />
            {here.zone === 'tide_line' ? (
              <p className="forgery-count">
                Markers {markersLit.filter(Boolean).length}/3 · {tool === 'glass' ? 'Z / X or wheel to scrub' : 'press 3 to hold the Tide Glass'}
                {!zoneClear('tide_line') && ' · clear the spawn first'}
              </p>
            ) : (
              <>
                <p className="forgery-count">{tool === 'glass' ? ZONES.nulls_snap.movies[movie]?.hint : 'press 3 to hold the Tide Glass'}</p>
                <button type="button" className="btn primary small" disabled={tool !== 'glass' || phase !== 'play'} onClick={(e) => (markTear(), e.currentTarget.blur())}>
                  {ZONES.nulls_snap.movies[movie]?.mark || 'Mark the tear'} <kbd>E</kbd>
                </button>
              </>
            )}
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

        {askOpen && (
          <div className="dialog verdict">
            <Portrait id="emmy-boundary" name="Emmy Boundary" />
            <div className="dialog-body">
              <span className="speaker">The far-side pedestal</span>
              <p>{ZONES.the_pools.ask.question}</p>
            </div>
            <div className="btn-row">
              <button type="button" className="btn small" onClick={() => answerAsk(false)}>
                {ZONES.the_pools.ask.keep}
              </button>
              <button type="button" className="btn primary small" onClick={() => answerAsk(true)}>
                {ZONES.the_pools.ask.no}
              </button>
            </div>
          </div>
        )}

        {toast && !line && <div className="toast">{toast}</div>}
        {status.strained && !line && <div className="toast">{HINTS02.stretch.text}</div>}

        {!talking && !levelClear && phase !== 'replay' && (
          <div className="controls">
            <div className="weapons" role="group" aria-label="Weapon">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={(e) => (setTool('lash'), e.currentTarget.blur())} title="Fundamental Lash (1)">
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'spool' ? 'active' : ''} ${spooling ? 'threading' : ''}`} onClick={(e) => (setTool('spool'), e.currentTarget.blur())} title="Spool — grab and pull a ribbon (2)">
                ◯ Spool <kbd>2</kbd>
              </button>
              {glassUnlocked && (
                <button type="button" className={`weapon ${tool === 'glass' ? 'active' : ''}`} onClick={(e) => (setTool('glass'), e.currentTarget.blur())} title="Tide Glass — scrub time (3)">
                  ⌛ Tide Glass <kbd>3</kbd>
                </button>
              )}
            </div>
            {here.zone === 'the_pools' && current === 'the_pools' && targetIdx.the_pools === 1 && !askOpen && (
              <button type="button" className="btn primary" onClick={() => setAskOpen(true)}>
                Answer the pedestal
              </button>
            )}
            {inRibbonZone && (
              <button
                type="button"
                className="btn ghost"
                onClick={(e) => {
                  ribbonsRef.current.ribbons[here.zone] = makeRibbon(ZONE[here.zone].ribbon)
                  grabbing.current = null
                  if (stateRef.current) stateRef.current.spoolDropped = true
                  startRecording(here.zone)
                  e.currentTarget.blur()
                }}
                title="Put the ribbon back how it started"
              >
                ↺ Reset ribbon
              </button>
            )}
          </div>
        )}
        {phase === 'replay' && <div className="hint">The Tide Glass replays your homotopy: every frame, posts fixed…</div>}
        {playEnabled && phase === 'play' && !toast && (
          <div className="hint">
            {spooling
              ? 'Holding the ribbon · walk to pull · click to let go (beside a stake to hook it)'
              : tool === 'spool'
                ? inRibbonZone
                  ? 'Walk up to the ribbon and click to grab it · click a cut to re-tie it'
                  : 'The Spool grabs ribbons at the shrines'
                : tool === 'glass'
                  ? glassActive
                    ? 'Z / X or the wheel to scrub time'
                    : 'The Tide Glass works at the Tide Line and at Null’s pool'
                  : 'WASD to move · click to crack the Lash · 2 Spool · 3 Tide Glass'}
          </div>
        )}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-0-2-lesson"
          Scene={TidewarpLesson}
          Overlay={LessonOverlay}
          kicker="World 0 · Level 2 · Lesson"
          name="How the Tide Works"
          embedded
          onDone={() => (setLesson(false), levelTheme())}
          onSkip={() => (setLesson(false), levelTheme())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 · Level 2 clear</span>
            <h2>{levelMeta?.title || 'Bend, Don’t Break'}</h2>
            <p className="def">{DEFINITION02.text}</p>
            <p className="cite">
              {DEFINITION02.cite}{' '}
              <a href={DEFINITION02.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">The tide has gone out. Next: 0-3 · Same Shape, Different Look at Mirror Shoals.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                On to Mirror Shoals ▸
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
