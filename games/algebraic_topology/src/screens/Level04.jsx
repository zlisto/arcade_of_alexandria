import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FoundryScene from '../levels/w0/FoundryScene'
import LevelMovie from './LevelMovie'
import LevelMap from './LevelMap'
import { useExitTrigger } from './exitTrigger'
import { HUB_RADIUS, LETTERS, chi, identify, letterText, makeTrack, makeTracker, parseWord, sameWord } from '../levels/w0/cells'
import { LETTER_COLORS } from '../levels/w0/Hologram'
import { DEFINITION04, HINTS04, OPENING, STATIONS, STATION_ORDER, WRONG, emmyAdvice } from '../levels/w0/stages04'
import layout from '../world/foundry.json'
import { buildSites, makeSiteWalkable } from '../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxAnvil,
  sfxCorrect,
  sfxFold,
  sfxForgeEdge,
  sfxLetter,
  sfxPress,
  sfxRip,
  sfxWrong,
  startForgeMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../audio/chip'
import CellsLesson, { CellsLessonOverlay } from '../movies/CellsLesson'
import MathText from './MathText'

/**
 * World 0 · Level 4 "Some Assembly Required" — the Skeleton Foundry's Assembly Hall.
 * Four forge stations, each building a cell complex with one point:
 *   The Sphere Press  — point + disk (rim crushed to the point): a sphere; again as two
 *                       hemispheres on one edge — same χ = 2
 *   Twin Loops        — edges a, b and a disk on a b a⁻¹ b⁻¹: the torus, χ = 0
 *   One Loop          — a disk on a (just a disk) vs. on a a: the projective plane
 *   Blueprint Wall    — a b a⁻¹ b: the Klein bottle, under an Unglue wave; then χ unlocks
 *                       the door to the Cone Zone
 * The Cell-Smith (2): click the furnace hub to forge the point or to press a disk; walk a
 * track out and back to forge an edge, or to add a letter to the disk's word.
 */

const TYPE_CPS = 45
const FOLD_SECONDS = 2.6
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const TRACKS = Object.fromEntries(SITES.filter((s) => s.tracks).map((s) => [s.id, s.tracks.map((t) => makeTrack(t, s.pos))]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
  commutator: ['500%', '53%', '19%'],
}
const emptyComplex = () => ({ point: false, edges: [], disks: [] })
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

/** A word as a polygon with arrowed, lettered sides (the blueprint's 2-cell). */
function WordPolygon({ word, size = 120 }) {
  const c = size / 2
  const R = size * 0.36
  if (!word.length)
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="word-poly" aria-label="a disk whose rim goes to the point">
        <circle cx={c} cy={c} r={R} fill="rgba(255,210,122,0.18)" stroke="#ffd27a" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx={c} cy={c - R} r="4" fill="#ffd27a" />
        <text x={c} y={c + 4} textAnchor="middle" fill="#ffe6a8" fontSize="10">
          rim → point
        </text>
      </svg>
    )
  const n = word.length
  const pts = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2 - (n === 2 ? Math.PI / 2 : 0)
    return [c + R * Math.cos(a), c + R * Math.sin(a)]
  })
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="word-poly" aria-label={`a disk along ${word.map(letterText).join(' ')}`}>
      <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="rgba(255,210,122,0.18)" />
      {word.map((l, i) => {
        const p = pts[i]
        const q = pts[(i + 1) % n]
        // n = 1: a circle; n = 2: two bulging arcs
        const col = LETTER_COLORS[l.e]
        const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
        const out = [mid[0] - c, mid[1] - c]
        const ol = Math.hypot(...out) || 1
        const bulge = n <= 2 ? R * 0.9 : 0
        const ctrl = [mid[0] + (out[0] / ol) * bulge, mid[1] + (out[1] / ol) * bulge]
        const [from, to] = l.s > 0 ? [p, q] : [q, p]
        const d = n === 1 ? `M ${c} ${c - R} A ${R} ${R} 0 1 1 ${c - 0.01} ${c - R}` : `M ${p[0]} ${p[1]} Q ${ctrl[0]} ${ctrl[1]} ${q[0]} ${q[1]}`
        // an arrowhead at the side's midpoint, pointing from → to
        const am = n === 1 ? [c + R, c] : [(p[0] + 2 * ctrl[0] + q[0]) / 4, (p[1] + 2 * ctrl[1] + q[1]) / 4]
        const dir = n === 1 ? [0, l.s > 0 ? 1 : -1] : [to[0] - from[0], to[1] - from[1]]
        const dl = Math.hypot(...dir) || 1
        const ux = dir[0] / dl
        const uy = dir[1] / dl
        const head = `${am[0] + ux * 6},${am[1] + uy * 6} ${am[0] - ux * 4 - uy * 5},${am[1] - uy * 4 + ux * 5} ${am[0] - ux * 4 + uy * 5},${am[1] - uy * 4 - ux * 5}`
        const lab = [am[0] + (out[0] / ol) * 12 * (n === 1 ? 0 : 1) + (n === 1 ? 12 : 0), am[1] + (out[1] / ol) * 12 * (n === 1 ? 0 : 1)]
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={col} strokeWidth="3" />
            <polygon points={head} fill={col} />
            <text x={lab[0]} y={lab[1] + 4} textAnchor="middle" fill={col} fontSize="13" fontWeight="700">
              {LETTERS[l.e]}
            </text>
          </g>
        )
      })}
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#fff2c4" />
      ))}
    </svg>
  )
}

export default function Level04({ concept, onBackToTitle, onNext, onGo, startAt }) {
  const levelMeta = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-4')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [complexes, setComplexes] = useState(() => Object.fromEntries(STATION_ORDER.map((id) => [id, emptyComplex()])))
  const [word, setWord] = useState([])
  const [holograms, setHolograms] = useState({})
  const holoKRef = useMemo(() => Object.fromEntries(STATION_ORDER.map((id) => [id, { current: 0 }])), [])
  const slamRefs = useMemo(() => Object.fromEntries(STATION_ORDER.map((id) => [id, { current: 0 }])), [])
  const progressRef = useRef(null)
  const trackers = useRef(Object.fromEntries(STATION_ORDER.map((id) => [id, makeTracker(TRACKS[id], SITE[id].pos)])))
  const [met, setMet] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(() => (skipTo ? SITE[STATION_ORDER[skipTo]].pos.map((v, i) => v + (i ? 2.2 : 0)) : layout.start))
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('lash')
  const [waveOn, setWaveOn] = useState(false)
  const [chiOpen, setChiOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [levelClear, setLevelClear] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [here, setHere] = useState({ site: null, pos: checkpoint })
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
  const cx = current ? complexes[current] : emptyComplex()

  const flash = (text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }
  const say = useCallback((ls, next = 'play') => {
    setLines(ls)
    setLineIdx(0)
    setPhase(ls.length ? 'talk:' + next : next)
  }, [])

  // music
  useEffect(() => {
    unlockAudio()
    startForgeMusic()
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
      const next = (goalIdx[station] || 0) + 1
      if (next >= list.length) {
        setDone((d) => ({ ...d, [station]: true }))
        setCheckpoint(SITE[station].pos.map((v, i) => v + (i ? 2.2 : 0)))
        return say(lines)
      }
      const g = list[next]
      setGoalIdx((m) => ({ ...m, [station]: next }))
      if (g.type === 'reset') {
        // clear the press once Emmy's done talking about what's on it: keep the point (and the
        // edges, if asked), drop the disks
        setGoalIdx((m) => ({ ...m, [station]: next + 1 }))
        afterTalk.current = () => {
          setComplexes((m) => ({ ...m, [station]: { ...m[station], edges: g.keepEdges ? m[station].edges : [], disks: [] } }))
          setHolograms((h) => ({ ...h, [station]: null }))
          setWord([])
        }
        return say([...lines, ...g.done], 'after')
      }
      if (g.type === 'chi') {
        afterTalk.current = () => setChiOpen(true)
        return say(lines, 'after')
      }
      say(lines)
    },
    [goalIdx, say],
  )

  // ---------- where is Gyroid; Emmy walks to the current station
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

  // arriving at a station
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

  // the χ lock always comes back when it's due (e.g. if a knockout interrupted the lines before it)
  useEffect(() => {
    if (goal?.type === 'chi' && phase === 'play' && !chiOpen && !exitOpen && here.site === current && met[current]) setChiOpen(true)
  }, [goal, phase, chiOpen, exitOpen, here.site, current, met])

  // knocked out
  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    say([HINTS04.knockout])
  }, [hearts, say])

  // ---------- walking the tracks (Cell-Smith in hand): forge edges, or spell the disk's word
  const working = !!current && here.site === current && met[current] && phase === 'play' && !chiOpen
  const stateForTick = useRef({})
  stateForTick.current = { working, tool, current, goal, cx, enemies }
  useEffect(() => {
    const id = setInterval(() => {
      const { working: w, tool: tl, current: cur, goal: g, cx: c } = stateForTick.current
      const s = stateRef.current
      if (!s || !cur) return
      const tr = trackers.current[cur]
      if (!w || tl !== 'smith') {
        tr.reset()
        progressRef.current = null
        return
      }
      const ev = tr.update(s.x, s.z)
      const curT = tr.current()
      progressRef.current = curT ? { track: curT.track, dir: curT.dir, best: tr.progress() } : null
      if (!ev) return
      if (ev.event === 'abandon') return flash('Go all the way round the track and back to the furnace')
      if (ev.event !== 'done') return
      const edge = c.edges.find((e) => e.track === ev.track)
      if (edge && edge.torn) {
        // re-forge a torn edge (it keeps its letter; its arrow follows this walk)
        setComplexes((m) => ({ ...m, [cur]: { ...m[cur], edges: m[cur].edges.map((e) => (e.track === ev.track ? { ...e, torn: false, dir: ev.dir } : e)) } }))
        sfxForgeEdge()
        return flash(`Edge ${LETTERS[edge.letter]} re-forged`)
      }
      if (g?.type === 'edges') {
        if (edge) return flash(`Edge ${LETTERS[edge.letter]} is already forged — walk the other track`)
        if (!c.point) return flash('Forge the point first: click the furnace')
        const letter = c.edges.length
        const edges = [...c.edges, { track: ev.track, dir: ev.dir, letter, torn: false }]
        setComplexes((m) => ({ ...m, [cur]: { ...m[cur], edges } }))
        sfxForgeEdge()
        flash(`Forged edge ${LETTERS[letter]} — a loop at the point`)
        if (edges.length >= g.n) {
          if (g.wave) {
            setWaveOn(true)
            spawnRef.current?.(SITE[cur].wave.map(([type, x, z]) => ({ type, x: x + SITE[cur].pos[0], z: z + SITE[cur].pos[1], site: cur })))
          }
          advanceGoal(cur, g.done)
        }
        return
      }
      if (g?.type === 'disk' && edge) {
        const l = { e: edge.letter, s: ev.dir * edge.dir }
        setWord((w0) => [...w0, l])
        sfxLetter(l.e, l.s)
      }
    }, 40)
    return () => clearInterval(id)
  }, [advanceGoal])

  // ---------- clicking with the Cell-Smith: the furnace forges the point, or presses a disk
  const pressed = useRef(null) // a tentative disk shown in the hologram: { station, keep }
  const foldHologram = (station, kind, w) => {
    setHolograms((h) => ({ ...h, [station]: { kind, word: w } }))
    const k = holoKRef[station]
    k.current = 0
    slamRefs[station].current = 1
    const t0 = performance.now()
    const tick = () => {
      const u = (performance.now() - t0) / 1000
      slamRefs[station].current = Math.max(0, 1 - u * 2.2)
      k.current = Math.min(1, Math.max(0, (u - 0.35) / FOLD_SECONDS))
      if (u < FOLD_SECONDS + 0.4) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    setTimeout(() => sfxFold(), 380)
  }
  const onAction = (x, z) => {
    if (!working || !goal) return
    const onHub = Math.hypot(x - SITE[current].pos[0], z - SITE[current].pos[1]) < HUB_RADIUS + 0.25
    if (goal.type === 'point') {
      if (!onHub) return flash('Stand on the furnace in the middle, then click')
      setComplexes((m) => ({ ...m, [current]: { ...m[current], point: true } }))
      sfxAnvil()
      return advanceGoal(current, goal.done)
    }
    if (goal.type === 'edges') return flash(onHub ? 'Walk a track out and back to forge an edge' : 'Walk the track all the way round, back to the furnace')
    if (goal.type !== 'disk') return
    if (!onHub) return flash('Come back to the furnace and click to press the disk')
    if (enemies[current]) return say([HINTS04.spawn])
    if (word.some((l) => cx.edges.find((e) => e.letter === l.e)?.torn) || cx.edges.some((e) => e.torn)) return say([HINTS04.torn])
    // press: build what the walked word says, show it, then judge it against the blueprint
    const target = parseWord(goal.word)
    if (goal.word !== '' && word.length === 0) {
      // nothing walked yet: don't press — explain how to write the word
      const first = target[0]
      const fwd = first.s > 0
      return say([
        {
          speaker: 'Emmy Boundary',
          portrait: 'emmy-boundary',
          text: `Not yet — the press needs a word to glue the disk along, and you write it with your feet. Walk the ${LETTERS[first.e]} track: out from the furnace, round its loop ${fwd ? 'the way its little arrows point' : 'against its arrows'}, and back onto the furnace. That writes $${letterText(first)}$.`,
        },
        {
          speaker: 'Emmy Boundary',
          portrait: 'emmy-boundary',
          text: target.length > 1 ? `Keep going until “walked” on your panel reads $${target.map(letterText).join(' ')}$, then click the furnace.` : 'Then stand on the furnace and click it to press.',
        },
      ])
    }
    const trial = { ...cx, disks: [...cx.disks, word] }
    const kind = identify(trial)
    const holoKind = kind === 'sphere' && trial.disks.length === 2 ? 'hemi' : ['sphere', 'disk', 'torus', 'klein', 'rp2', 'pinched'].includes(kind) ? kind : 'disk'
    sfxPress()
    foldHologram(current, holoKind, word)
    const ok = (goal.word === '' ? word.length === 0 : sameWord(word, target)) && kind === goal.expect
    if (ok) {
      setComplexes((m) => ({ ...m, [current]: trial }))
      setWord([])
      sfxCorrect()
      const st = current
      setTimeout(() => advanceGoal(st, goal.done), 1400)
      return
    }
    sfxWrong()
    const st = current
    pressed.current = { station: st }
    setWord([])
    setTimeout(
      () =>
        say(
          [
            {
              speaker: 'Emmy Boundary',
              portrait: 'emmy-boundary',
              text: `You walked $${word.length ? word.map(letterText).join(' ') : '∅'}$, and that made ${WRONG[kind] || 'something else'}. The blueprint wants ${goal.word ? '$' + target.map(letterText).join(' ') + '$' : 'the rim crushed to the point'}. The press lets go — walk the word again (R clears it), then click.`,
            },
          ],
          'unpress',
        ),
      1600,
    )
  }

  // the χ lock on the door
  const answerChi = (v) => {
    const g = goal
    if (v !== g.answer) {
      sfxWrong()
      return say(g.wrong, 'chi')
    }
    sfxCorrect()
    setChiOpen(false)
    setExitOpen(true)
    advanceGoal(current, g.right)
  }

  // Unglues go for forged edges at their own station
  ribbonApi.current = {
    target: (e) => {
      const c = complexes[e.site]
      if (!c || done[e.site]) return null
      const live = c.edges.filter((ed) => !ed.torn)
      if (!live.length) return null
      const ed = live[Math.floor(e.seed * 7) % live.length]
      return TRACKS[e.site][ed.track].at(0.5)
    },
    snip: (x, z) => {
      for (const id of STATION_ORDER) {
        const c = complexes[id]
        for (const ed of c.edges) {
          if (ed.torn) continue
          const m = TRACKS[id][ed.track].nearest(x, z)
          if (m.d < 0.8) {
            setComplexes((mm) => ({ ...mm, [id]: { ...mm[id], edges: mm[id].edges.map((q) => (q.track === ed.track ? { ...q, torn: true } : q)) } }))
            sfxRip()
            flash(`An Unglue tore edge ${LETTERS[ed.letter]} loose — lash it, then walk that track again`)
            return true
          }
        }
      }
      return false
    },
  }

  // the wave at the Blueprint Wall is done when its spawn are gone
  useEffect(() => {
    if (waveOn && !enemies.blueprint_wall) setWaveOn(false)
  }, [waveOn, enemies])

  // weapons
  useEffect(() => {
    const key = (e) => {
      if (e.code === 'Digit1') setTool('lash')
      else if (e.code === 'Digit2') setTool('smith')
      else if (e.code === 'KeyQ') setTool((w) => (w === 'lash' ? 'smith' : 'lash'))
      else if (e.code === 'KeyR') setWord([])
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
  const canTalk = nearEmmy && phase === 'play' && !chiOpen && !levelClear && !lesson
  const talkToEmmy = () => {
    if (!canTalk) return
    const s = stateRef.current
    const e = emmyAt.current
    if (s) e.rotY = Math.atan2(s.x - e.x, s.z - e.z) // she turns to face him
    say(emmyAdvice({ station: current, goal, cx, word, enemies: current ? enemies[current] : 0, here: here.site, exitOpen }))
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
    if (next === 'unpress') {
      const p = pressed.current
      pressed.current = null
      if (p) setHolograms((h) => ({ ...h, [p.station]: null }))
      setPhase('play')
    } else if (next === 'after') {
      setPhase('play')
      afterTalk.current?.()
      afterTalk.current = null
    } else if (next === 'chi') {
      setPhase('play')
      setChiOpen(true)
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
  const playEnabled = (phase === 'play' || phase === 'clear') && !lesson && !chiOpen && !levelClear
  const gameKey = `foundry:${knockouts}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
    }
    if (waveOn) for (const [type, x, z] of SITE.blueprint_wall.wave) list.push({ type, x: x + SITE.blueprint_wall.pos[0], z: z + SITE.blueprint_wall.pos[1], site: 'blueprint_wall' })
    return { mode: 'overworld', bySite: true, start: checkpoint, enemies: list }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])
  frameRef.current = current && here.site === current && met[current] ? { center: SITE[current].pos, size: 12.5 } : null
  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  if (import.meta.env.DEV) window.__lvl4 = { here, done, goalIdx, complexes, word, phase, enemies, setTool, current, goal, trackers: trackers.current, progressRef, working, TRACKS } // dev

  const scene = (
    <FoundryScene
      layout={layout}
      sites={SITES}
      complexes={complexes}
      holograms={holograms}
      holoKRef={holoKRef}
      slamRefs={slamRefs}
      progressRef={progressRef}
      tracksBySite={TRACKS}
      current={current}
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
  const objective = exitOpen ? 'Walk through the forge door to the Cone Zone' : current ? `Presses ${nDone}/4 · next: ${SITE[current].name}` : ''
  const atStation = current && here.site === current && met[current]
  const target = goal?.type === 'disk' ? parseWord(goal.word) : null
  const V = cx.point ? 1 : 0
  const Ecount = cx.edges.length
  const F = cx.disks.length
  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'point') return 'Stand on the furnace · click (Cell-Smith) to forge the point'
    if (goal.type === 'edges') return `Walk a track out and back · edges ${Ecount}/${goal.n}`
    if (goal.type === 'disk') return goal.word === '' ? 'Click the furnace: press a disk with its rim crushed to the point' : 'Walk the word along the edges, then click the furnace'
    if (goal.type === 'chi') return 'Answer the door'
    return ''
  })()

  return (
    <div className="screen level">
      <Canvas camera={{ position: [0, 11, 26], fov: 45 }} dpr={[1, 1.75]} frameloop={lesson ? 'never' : 'always'}>
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
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())} title="Watch the lesson: cell complexes">
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Level 4 · Skeleton Foundry</span>
            <h2>{levelMeta?.title || 'Some Assembly Required'}</h2>
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

        {atStation && (
          <div className="rules-panel forge-panel">
            <h3>Blueprint · {STATIONS[current].blueprint}</h3>
            {target && <WordPolygon word={target} />}
            {target && (
              <p className="forge-word">
                disk along <span className="rule-math">{goal.word ? target.map(letterText).join(' ') : 'its rim → the point'}</span>
              </p>
            )}
            <div className="forge-cells">
              <span className={V ? 'on' : ''}>
                <b>{V}</b> point
              </span>
              <span className={Ecount ? 'on' : ''}>
                <b>{Ecount}</b> edge{Ecount === 1 ? '' : 's'}
                {cx.edges.length > 0 && (
                  <>
                    {' '}
                    (
                    {cx.edges.map((e, i) => (
                      <i key={i} style={{ color: e.torn ? '#c58bff' : LETTER_COLORS[e.letter] }}>
                        {LETTERS[e.letter]}
                        {i < cx.edges.length - 1 ? ' ' : ''}
                      </i>
                    ))}
                    )
                  </>
                )}
              </span>
              <span className={F ? 'on' : ''}>
                <b>{F}</b> disk{F === 1 ? '' : 's'}
              </span>
            </div>
            <p className="forge-chi">
              χ = {V} − {Ecount} + {F} = <b>{chi(cx)}</b>
            </p>
            {goal?.type === 'disk' && goal.word !== '' && (
              <div className="forge-walked">
                <span>walked:</span>
                {word.length ? (
                  word.map((l, i) => (
                    <kbd key={i} style={{ borderColor: LETTER_COLORS[l.e], color: LETTER_COLORS[l.e] }}>
                      {letterText(l)}
                    </kbd>
                  ))
                ) : (
                  <em>nothing yet</em>
                )}
                <button type="button" className="btn ghost small" onClick={(e) => (setWord([]), e.currentTarget.blur())} disabled={!word.length}>
                  Clear <kbd>R</kbd>
                </button>
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

        {chiOpen && !line && (
          <div className="dialog verdict">
            <Portrait id="emmy-boundary" name="Emmy Boundary" />
            <div className="dialog-body">
              <span className="speaker">The forge door</span>
              <p>{goal?.question}</p>
            </div>
            <div className="btn-row">
              {(goal?.options || []).map((v) => (
                <button key={v} type="button" className="btn small" onClick={() => answerChi(v)}>
                  χ = {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {toast && !line && <div className="toast">{toast}</div>}

        {!levelClear && !line && !chiOpen && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Skeleton Foundry" />}

        {canTalk && (
          <button type="button" className="btn talk-btn" onClick={(e) => (talkToEmmy(), e.currentTarget.blur())}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}

        {!talking && !levelClear && !chiOpen && (
          <div className="controls">
            <div className="weapons" role="group" aria-label="Weapon">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={(e) => (setTool('lash'), e.currentTarget.blur())}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'smith' ? 'active' : ''}`} onClick={(e) => (setTool('smith'), e.currentTarget.blur())} title="The Cell-Smith: click the furnace to forge or press; walk tracks to forge edges and spell words">
                ✦ Cell-Smith <kbd>2</kbd>
              </button>
            </div>
          </div>
        )}
        {playEnabled && phase === 'play' && !toast && (
          <div className="hint">
            {atStation ? (tool === 'smith' ? stepText : 'Press 2 for the Cell-Smith') : 'WASD to move · click to crack the Lash · 2 for the Cell-Smith · lost? walk up to Emmy and press E'}
          </div>
        )}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-0-4-lesson"
          Scene={CellsLesson}
          Overlay={CellsLessonOverlay}
          kicker="World 0 · Level 4 · Lesson"
          name="Built from Cells"
          embedded
          onDone={() => (setLesson(false), startForgeMusic())}
          onSkip={() => (setLesson(false), startForgeMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 · Level 4 clear</span>
            <h2>{levelMeta?.title || 'Some Assembly Required'}</h2>
            <p className="def">{DEFINITION04.text}</p>
            <p className="cite">
              {DEFINITION04.cite}{' '}
              <a href={DEFINITION04.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Beyond the forge door: the Cone Zone. Next: 0-5 · Cone Zone.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn" onClick={() => onGo('movie0b')} title="A sealed side door off the Assembly Hall">
                Bonus ▸ 0-B
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ 0-5
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
