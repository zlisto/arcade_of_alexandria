import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TimberScene from '../levels/w0/TimberScene'
import LevelMovie from './LevelMovie'
import LevelMap from './LevelMap'
import { useExitTrigger } from './exitTrigger'
import { PETAL_SIZE, chiOf, closesLoop, edgePath, nearestEdge, petalAngles, petalsOf, treeReach } from '../levels/w0/graphs'
import { DEFINITION06, HINTS06, OPENING, STATIONS, STATION_ORDER, emmyAdvice06 } from '../levels/w0/stages06'
import layout from '../world/timberyard.json'
import { buildSites, makeSiteWalkable } from '../world/sites'
import {
  dialogOpen,
  duckMusic,
  readMuted,
  setMuted as setAudioMuted,
  sfxBridge,
  sfxChew,
  sfxCorrect,
  sfxFell,
  sfxMark,
  sfxRefuse,
  sfxWrong,
  sfxZoot,
  startTimberMusic,
  stopMusic,
  textBlip,
  unlockAudio,
} from '../audio/chip'
import TimberLesson, { TimberLessonOverlay } from '../movies/TimberLesson'
import MathText from './MathText'

/**
 * World 0 · Level 6 "Timber!" — the Timber Yard.
 *   The Sapling Deck — fell one walkway (nothing lost); a triangle (a tree, then one petal)
 *   The Thicket      — five platforms, seven walkways: fell a spanning tree, three petals
 *   The Wrong Cut    — a walkway that is already a loop can't be felled; guard the petals
 *                      from Loop-biters
 *   The Census Deck  — predict by χ which two tangles fell alike, fell them, forge the bridge
 * The Spool (2) marks and unmarks walkways (never closing a loop); the Cell-Smith (3) fells a
 * spanning tree onto whichever platform is clicked, restrings bitten petals, and forges the bridge.
 */

const TYPE_CPS = 45
const FELL_SECONDS = 2.4
const SITES = buildSites(layout)
const SITE = Object.fromEntries(SITES.map((s) => [s.id, s]))
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const stationAt = (x, z) => SITES.find((s) => s.stage === 'station' && s.containsWorld(x, z)) || null
const originOf = (id, gi) => {
  const s = SITE[id]
  const off = s.graphs[gi].offset || [0, 0]
  return [s.pos[0] + off[0], s.pos[1] + off[1]]
}
const freshYard = () => Object.fromEntries(STATION_ORDER.map((id) => [id, { marked: {}, felled: {}, bitten: {}, roots: {} }]))
const nonTree = (g, tree) => g.edges.map((_, j) => j).filter((j) => !tree.includes(j))
/** A tangle with the platform its tree was felled onto as its root (any platform will do). */
const rooted = (g, r) => (r == null ? g : { ...g, root: r })
const TOOL_KEYS = { Digit1: 'lash', Digit2: 'spool', Digit3: 'smith' }

/** Which tangles a deck shows: the current goal's, else the last ones felled there. */
function visibleFor(id, gi, isDone) {
  const goals = STATIONS[id].goals
  const upto = isDone ? goals.length - 1 : gi
  for (let i = upto; i >= 0; i--) if (goals[i].graphs) return goals[i].graphs
  return goals.find((g) => g.graphs)?.graphs || [0]
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

export default function Level06({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-6')
  const skipTo = Math.max(0, STATION_ORDER.indexOf(startAt))

  const [done, setDone] = useState(() => Object.fromEntries(STATION_ORDER.slice(0, skipTo).map((id) => [id, true])))
  const [goalIdx, setGoalIdx] = useState({})
  const [yard, setYard] = useState(() => {
    // decks skipped past show their tangles already felled
    const y = freshYard()
    for (const id of STATION_ORDER.slice(0, skipTo)) {
      const gs = visibleFor(id, 0, true)
      for (const gi of gs) {
        const g = SITE[id].graphs[gi]
        const tree = []
        for (let e = 0; e < g.edges.length; e++) if (!closesLoop(g, tree, e)) tree.push(e)
        y[id].felled[gi] = tree
      }
    }
    return y
  })
  const fellKs = useMemo(() => Object.fromEntries(STATION_ORDER.map((id) => [id, SITE[id].graphs.map(() => ({ current: STATION_ORDER.indexOf(id) < skipTo ? 1 : 0 }))])), [skipTo])
  const bridgeK = useRef(0)
  const [met, setMet] = useState({})
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
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
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const emmyAt = useRef({ x: layout.start[0] - 1.2, z: layout.start[1] - 0.8, rotY: Math.PI, walk: 0 })
  const emmyTalking = useRef(false)
  const [nearEmmy, setNearEmmy] = useState(false)
  const waveSeen = useRef(false)

  const current = STATION_ORDER.find((id) => !done[id]) || null
  const goals = current ? STATIONS[current].goals : []
  const gi = current ? goalIdx[current] || 0 : 0
  const goal = goals[gi] || null
  const visibleGraphs = Object.fromEntries(STATION_ORDER.map((id) => [id, visibleFor(id, goalIdx[id] || 0, !!done[id])]))

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

  // music
  useEffect(() => {
    unlockAudio()
    startTimberMusic()
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
      const curG = list[goalIdx[station] || 0]
      if (curG?.wave) {
        setWaveOn(true)
        setWaveSpawned(true)
        spawnRef.current?.(SITE[station].wave.map(([type, x, z]) => ({ type, x: x + SITE[station].pos[0], z: z + SITE[station].pos[1], site: station })))
      }
      const next = (goalIdx[station] || 0) + 1
      if (next >= list.length) {
        setDone((d) => ({ ...d, [station]: true }))
        setCheckpoint([SITE[station].pos[0] + 1.2, SITE[station].pos[1] + 3.2])
        return say(lines)
      }
      setGoalIdx((m) => ({ ...m, [station]: next }))
      if (list[next].type === 'bridge') {
        // the yard is clear: the bridge to the Throne builds itself — zzzooot
        afterTalk.current = () => {
          sfxZoot()
          sfxBridge()
          const t0 = performance.now()
          const tick = () => {
            bridgeK.current = Math.min(1, (performance.now() - t0) / 1800)
            if (bridgeK.current < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          setExitOpen(true)
          setTimeout(() => {
            setDone((d) => ({ ...d, [station]: true }))
            say(list[next].done)
          }, 1900)
        }
        return say(lines, 'after')
      }
      if (list[next].type === 'ask') {
        afterTalk.current = () => setAskOpen(true)
        return say(lines, 'after')
      }
      say(lines)
    },
    [goalIdx, say],
  )

  // ---------- where is Gyroid; Emmy walks to the current deck
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
      const target = current ? [SITE[current].pos[0] + SITE[current].emmy[0], SITE[current].pos[1] + SITE[current].emmy[1]] : [layout.bridge.foot[0] - 2, layout.bridge.foot[1] + 1]
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
        const look = current ? SITE[current].pos : layout.bridge.gate
        e.rotY = Math.atan2(look[0] - e.x, look[1] - e.z)
      }
    }, 50)
    return () => clearInterval(id)
  }, [current])

  // arriving at a deck
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
    const first = STATIONS[st].goals[goalIdx[st] || 0]
    say(STATIONS[st].arrive, first?.type === 'ask' ? 'ask' : 'play')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here.site, phase, current, met, done, say])

  // a question that's due always comes back (e.g. if a knockout interrupted the lines before it)
  useEffect(() => {
    if (goal?.type === 'ask' && phase === 'play' && !askOpen && here.site === current && met[current]) setAskOpen(true)
  }, [goal, phase, askOpen, here.site, current, met])

  // knocked out
  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    say([HINTS06.knockout])
  }, [hearts, say])

  const atWork = !!current && here.site === current && met[current] && phase === 'play' && !askOpen
  const setY = (id, f) => setYard((m) => ({ ...m, [id]: f(m[id]) }))

  // ---------- the Spool: mark / unmark walkways
  const onSpoolClick = (gx, gz, cx, cz) => {
    if (!atWork) return flash(current ? `Walk onto ${SITE[current].name} first` : 'Head for the bridge')
    if (goal?.type !== 'fell') return flash(goal?.type === 'guard' ? 'Lash the Loop-biters! (1)' : goal?.type === 'bridge' ? 'Take the Cell-Smith (3) to the foot of the bridge' : 'Nothing to mark right now')
    const y = yard[current]
    let hit = null
    for (const g of goal.graphs) {
      if (y.felled[g]) continue
      const o = originOf(current, g)
      const graph = SITE[current].graphs[g]
      const h = nearestEdge(graph, graph.nodes, cx - o[0], cz - o[1], 0.65)
      if (h && (!hit || h.d < hit.d)) hit = { ...h, g }
    }
    if (!hit) return flash('Click right on a walkway to mark it')
    const graph = SITE[current].graphs[hit.g]
    const marked = y.marked[hit.g] || []
    if (marked.includes(hit.i)) {
      setY(current, (yy) => ({ ...yy, marked: { ...yy.marked, [hit.g]: marked.filter((e) => e !== hit.i) } }))
      sfxMark(false)
      return flash('Unmarked')
    }
    const ed = graph.edges[hit.i]
    if (ed.a === ed.b) {
      sfxRefuse()
      return once('selfLoop', HINTS06.selfLoop, 'That walkway is already a loop — it can’t be part of a tree')
    }
    if (closesLoop(graph, marked, hit.i)) {
      sfxRefuse()
      return once('loop', HINTS06.loop, 'That would close a loop — a tree never does')
    }
    const next = [...marked, hit.i]
    setY(current, (yy) => ({ ...yy, marked: { ...yy.marked, [hit.g]: next } }))
    sfxMark(true)
    const r = treeReach(graph, next)
    flash(r.spanning ? 'The tree reaches every platform — fell it: Cell-Smith (3), click any of its platforms' : HINTS06.notSpanning(r.reached, graph.nodes.length))
  }

  // ---------- the Cell-Smith: fell, restring, forge the bridge
  const fell = (id, g, root) => {
    const tree = yard[id].marked[g] || []
    setY(id, (yy) => ({ ...yy, felled: { ...yy.felled, [g]: tree }, roots: { ...yy.roots, [g]: root } }))
    sfxFell()
    const k = fellKs[id][g]
    k.current = 0
    const t0 = performance.now()
    const tick = () => {
      k.current = Math.min(1, (performance.now() - t0) / 1000 / FELL_SECONDS)
      if (k.current < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    const graph = SITE[id].graphs[g]
    flash(`Timber! ${graph.nodes.length} platforms → 1 · ${petalsOf(graph)} petal${petalsOf(graph) === 1 ? '' : 's'}`, 3400)
    const all = goal.graphs.every((x) => x === g || yard[id].felled[x])
    if (all) {
      const gl = goal
      setTimeout(() => advanceGoal(id, gl.done), FELL_SECONDS * 1000 + 500)
    }
  }
  const onAction = (gx, gz, cx, cz) => {
    if (!atWork) return flash(current ? `Walk onto ${SITE[current].name} first` : 'Walk across the bridge')
    if (!goal) return
    const y = yard[current]
    if (goal.type === 'fell') {
      // the platform nearest the click (forgiving): the tree falls onto it — any platform will do
      let best = null
      for (const g of goal.graphs) {
        if (y.felled[g]) continue
        const o = originOf(current, g)
        const graph = SITE[current].graphs[g]
        graph.nodes.forEach((p, i) => {
          const d = Math.hypot(cx - o[0] - p[0], cz - o[1] - p[1])
          if (d < 1.6 && (!best || d < best.d)) best = { g, node: i, d }
        })
        // a click on the tangle but off its platforms falls onto its nearest platform
        if (!best && Math.hypot(cx - o[0], cz - o[1]) < 3.2) {
          const near = graph.nodes.map((p, i) => [Math.hypot(cx - o[0] - p[0], cz - o[1] - p[1]), i]).sort((a, b) => a[0] - b[0])[0]
          best = { g, node: near[1], d: near[0] }
        }
      }
      if (!best) return flash('Click one of the tangle’s platforms')
      const graph = SITE[current].graphs[best.g]
      const r = treeReach(graph, y.marked[best.g] || [])
      if (!r.spanning) {
        sfxWrong()
        return flash(`${HINTS06.notSpanning(r.reached, graph.nodes.length)} (use the Spool, 2)`, 3400)
      }
      return fell(current, best.g, best.node)
    }
    if (goal.type === 'guard') {
      // restring a bitten petal near the click
      for (const g of visibleGraphs[current]) {
        const tree = y.felled[g]
        const bit = y.bitten[g] || []
        if (!tree || !bit.length) continue
        const graph = SITE[current].graphs[g]
        const o = originOf(current, g)
        const rp = graph.nodes[rooted(graph, y.roots?.[g]).root]
        const angles = petalAngles(rooted(graph, y.roots?.[g]), nonTree(graph, tree).length)
        for (const p of bit) {
          const m = [o[0] + rp[0] + Math.cos(angles[p]) * PETAL_SIZE * 0.7, o[1] + rp[1] + Math.sin(angles[p]) * PETAL_SIZE * 0.7]
          if (Math.hypot(cx - m[0], cz - m[1]) < 1.6) {
            setY(current, (yy) => ({ ...yy, bitten: { ...yy.bitten, [g]: (yy.bitten[g] || []).filter((q) => q !== p) } }))
            sfxCorrect()
            return flash('Petal restrung — its hole is back')
          }
        }
      }
      return flash(Object.values(y.bitten).some((b) => b.length) ? 'Click the bitten (violet) petal to restring it' : 'Lash the Loop-biters (1)!')
    }
    if (goal.type === 'bridge') {
      const f = layout.bridge.foot
      if (Math.hypot(cx - f[0], cz - f[1]) > 2.4) return flash('Click the foot of the bridge, at the north edge of the deck')
      sfxBridge()
      const t0 = performance.now()
      const tick = () => {
        bridgeK.current = Math.min(1, (performance.now() - t0) / 1800)
        if (bridgeK.current < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      setExitOpen(true)
      const gl = goal
      setTimeout(() => advanceGoal(current, gl.done), 1900)
    }
  }

  // the guard: done when the wave is gone and every petal is whole
  useEffect(() => {
    if (goal?.type !== 'guard' || !waveSpawned || phase !== 'play') return
    if (!waveSeen.current) {
      // wait until the wave has actually landed on the deck
      if ((enemies[current] || 0) >= SITE[current].wave.length) waveSeen.current = true
      return
    }
    const bitten = Object.values(yard[current].bitten).some((b) => b.length)
    if (enemies[current]) return
    if (bitten) return flash('The Loop-biters are gone — restring the bitten petal (Cell-Smith, 3)', 3400)
    const gl = goal
    setWaveOn(false)
    advanceGoal(current, gl.done)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies, yard, goal, waveSpawned, phase])

  // the question
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

  // Loop-biters chew petals; Unglues tear marked walkways loose
  ribbonApi.current = {
    target: (e) => {
      if (done[e.site] || e.site !== current) return null
      const y = yard[e.site]
      const spots = []
      for (const g of visibleGraphs[e.site]) {
        const graph = SITE[e.site].graphs[g]
        const o = originOf(e.site, g)
        const tree = y.felled[g]
        if (e.type === 'biter') {
          if (!tree || fellKs[e.site][g].current < 1) continue
          const others = nonTree(graph, tree)
          const angles = petalAngles(rooted(graph, y.roots?.[g]), others.length)
          const rp = graph.nodes[rooted(graph, y.roots?.[g]).root]
          others.forEach((_, p) => {
            if (!(y.bitten[g] || []).includes(p)) spots.push([o[0] + rp[0] + Math.cos(angles[p]) * PETAL_SIZE, o[1] + rp[1] + Math.sin(angles[p]) * PETAL_SIZE])
          })
        } else if (!tree) {
          for (const m of y.marked[g] || []) {
            const ed = graph.edges[m]
            const P = edgePath(ed, graph.nodes[ed.a], graph.nodes[ed.b])
            spots.push([o[0] + P[12][0], o[1] + P[12][1]])
          }
        }
      }
      if (!spots.length) return null
      return spots[Math.floor(e.seed * 7) % spots.length]
    },
    snip: (x, z) => {
      const id = current
      if (!id) return false
      const y = yard[id]
      for (const g of visibleGraphs[id]) {
        const graph = SITE[id].graphs[g]
        const o = originOf(id, g)
        const tree = y.felled[g]
        if (tree) {
          const others = nonTree(graph, tree)
          const angles = petalAngles(rooted(graph, y.roots?.[g]), others.length)
          const rp = graph.nodes[rooted(graph, y.roots?.[g]).root]
          const p = others.findIndex((_, q) => !(y.bitten[g] || []).includes(q) && Math.hypot(o[0] + rp[0] + Math.cos(angles[q]) * PETAL_SIZE - x, o[1] + rp[1] + Math.sin(angles[q]) * PETAL_SIZE - z) < 0.9)
          if (p >= 0) {
            setY(id, (yy) => ({ ...yy, bitten: { ...yy.bitten, [g]: [...(yy.bitten[g] || []), p] } }))
            sfxChew()
            flash('A Loop-biter chewed a petal down — a hole is gone! Restring it with the Cell-Smith (3)', 3600)
            return true
          }
        } else {
          for (const m of y.marked[g] || []) {
            const ed = graph.edges[m]
            const P = edgePath(ed, graph.nodes[ed.a], graph.nodes[ed.b])
            if (Math.hypot(o[0] + P[12][0] - x, o[1] + P[12][1] - z) < 0.9) {
              setY(id, (yy) => ({ ...yy, marked: { ...yy.marked, [g]: (yy.marked[g] || []).filter((q) => q !== m) } }))
              sfxRefuse()
              flash('An Unglue tore a marked walkway loose — mark it again', 3200)
              return true
            }
          }
        }
      }
      return false
    },
  }

  // tools
  useEffect(() => {
    const key = (e) => {
      if (TOOL_KEYS[e.code]) setTool(TOOL_KEYS[e.code])
      else if (e.code === 'KeyQ') setTool((w) => (w === 'lash' ? 'spool' : w === 'spool' ? 'smith' : 'lash'))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // ---------- talking to Emmy: walk up to her and press E (or the button) for advice
  const canTalk = nearEmmy && phase === 'play' && !askOpen && !levelClear && !lesson
  const talkToEmmy = () => {
    if (!canTalk) return
    const s = stateRef.current
    const em = emmyAt.current
    if (s) em.rotY = Math.atan2(s.x - em.x, s.z - em.z) // she turns to face him
    say(emmyAdvice06({
        station: current,
        goal,
        here: here.site,
        name: current ? SITE[current].name : '',
        exitOpen,
        enemies: current ? enemies[current] : 0,
        tangles: current
          ? visibleGraphs[current].map((gi) => {
              const g = SITE[current].graphs[gi]
              const r = treeReach(g, yard[current].marked[gi] || [])
              return { label: g.label, reached: r.reached, total: g.nodes.length, spanning: r.spanning, felled: !!yard[current].felled[gi], bitten: (yard[current].bitten[gi] || []).length > 0 }
            })
          : [],
      }))
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
  const gameKey = `timber:${knockouts}`
  const walkable = useMemo(() => makeSiteWalkable(layout, SITES, exitOpen ? [[layout.exit.a, layout.exit.b]] : []), [exitOpen])
  const game = useMemo(() => {
    const list = []
    for (const s of SITES) {
      if (!s.enemies || done[s.id]) continue
      for (const [type, x, z] of s.enemies) list.push({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id })
    }
    if (waveOn) for (const [type, x, z] of SITE.wrong_cut.wave) list.push({ type, x: x + SITE.wrong_cut.pos[0], z: z + SITE.wrong_cut.pos[1], site: 'wrong_cut' })
    return { mode: 'overworld', bySite: true, start: checkpoint, enemies: list }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])
  // zoom in on the deck being worked — close enough to read, with the whole tangle still in view
  const FRAME = { one_edge: 8.0, spanning_tree: 8.8, wrong_cut: 8.8, census: 12.6 }
  frameRef.current = current && here.site === current && met[current] ? { center: [SITE[current].pos[0] + (current === 'census' ? 0.6 : 1.0), SITE[current].pos[1] + 0.3], size: FRAME[current], follow: 0.12 } : null
  useExitTrigger(exitOpen, stateRef, (x, z) => Math.abs(x - layout.exit.gate[0]) < 1.6 && z < layout.exit.gate[1] - 0.8, () => setLevelClear(true))

  if (import.meta.env.DEV) window.__lvl6 = { here, done, goalIdx, yard, phase, enemies, setTool, current, goal, SITE, originOf, visibleGraphs } // dev

  const scene = (
    <TimberScene
      layout={layout}
      sites={SITES}
      yard={yard}
      fellKs={fellKs}
      visibleGraphs={visibleGraphs}
      bridgeK={bridgeK}
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
      onSpoolClick={onSpoolClick}
      onEnemies={(by) => setEnemies(by)}
      onHearts={setHearts}
    />
  )

  const nDone = STATION_ORDER.filter((id) => done[id]).length
  const objective = exitOpen ? 'Walk across the bridge to the Hollow Throne' : current ? `Decks ${nDone}/4 · next: ${SITE[current].name}` : ''
  const atStation = current && here.site === current && met[current]
  const stepText = (() => {
    if (!goal) return ''
    if (goal.type === 'ask') return 'Answer Emmy'
    if (goal.type === 'guard') return 'Lash the Loop-biters (1) · restring bitten petals (3)'
    if (goal.type === 'bridge') return 'Cell-Smith (3): click the foot of the bridge'
    if (tool === 'spool') return 'Click walkways to mark a tree that reaches every platform'
    if (tool === 'smith') return 'Click any platform of a finished tree to fell it onto that platform'
    return 'Spool (2) to mark walkways · Cell-Smith (3) to fell'
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
            <button type="button" className="btn ghost" onClick={(e) => (setLesson(true), e.currentTarget.blur())} title="Watch the lesson: felling trees">
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Level 6 · Timber Yard</span>
            <h2>{levelMeta?.title || 'Timber!'}</h2>
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
          <div className="rules-panel forge-panel works-panel">
            <h3>{STATIONS[current].blueprint}</h3>
            {visibleGraphs[current].map((g) => {
              const graph = SITE[current].graphs[g]
              const y = yard[current]
              const tree = y.felled[g]
              const r = treeReach(graph, y.marked[g] || [])
              return (
                <div key={g} className="carry-line tangle-line">
                  {graph.label && <strong>{graph.label}</strong>}
                  <span className="cells-line">
                    {tree ? (
                      <>
                        felled: 1 platform, {petalsOf(graph)} petal{petalsOf(graph) === 1 ? '' : 's'} · χ = 1 − {petalsOf(graph)} = <b>{chiOf(graph)}</b>
                      </>
                    ) : (
                      <>
                        {graph.nodes.length} platforms − {graph.edges.length} walkways · χ = <b>{chiOf(graph)}</b> · tree reaches {r.reached}/{graph.nodes.length}
                      </>
                    )}
                  </span>
                </div>
              )
            })}
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
          <button type="button" className="btn talk-btn" onClick={(e) => (talkToEmmy(), e.currentTarget.blur())}>
            💬 Talk to Emmy <kbd>E</kbd>
          </button>
        )}

        {!levelClear && !line && !askOpen && <LevelMap layout={layout} sites={SITES} done={done} next={current || (exitOpen ? 'exit' : null)} pos={here.pos} title="Timber Yard" />}

        {!talking && !levelClear && !askOpen && (
          <div className="controls">
            <div className="weapons" role="group" aria-label="Tool">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={(e) => (setTool('lash'), e.currentTarget.blur())}>
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'spool' ? 'active' : ''}`} onClick={(e) => (setTool('spool'), e.currentTarget.blur())} title="The Spool: click walkways to mark a tree">
                ◎ Spool <kbd>2</kbd>
              </button>
              <button type="button" className={`weapon ${tool === 'smith' ? 'active' : ''}`} onClick={(e) => (setTool('smith'), e.currentTarget.blur())} title="The Cell-Smith: fell a finished tree onto a platform; restring petals; forge the bridge">
                ✦ Cell-Smith <kbd>3</kbd>
              </button>
            </div>
          </div>
        )}
        {playEnabled && !toast && <div className="hint">{atStation ? stepText : 'WASD to move · click to crack the Lash · 2 Spool · 3 Cell-Smith · lost? walk up to Emmy and press E'}</div>}
      </div>

      {lesson && (
        <LevelMovie
          videoId="level-0-6-lesson"
          Scene={TimberLesson}
          Overlay={TimberLessonOverlay}
          kicker="World 0 · Level 6 · Lesson"
          name="Felling Trees"
          embedded
          onDone={() => (setLesson(false), startTimberMusic())}
          onSkip={() => (setLesson(false), startTimberMusic())}
        />
      )}

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 · Level 6 clear</span>
            <h2>{levelMeta?.title || 'Timber!'}</h2>
            <p className="def">{DEFINITION06.text}</p>
            <p className="cite">
              {DEFINITION06.cite}{' '}
              <a href={DEFINITION06.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Across the bridge: the Hollow Throne, Count Null’s castle.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn" onClick={onBackToTitle}>
                Back to title
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                Continue ▸ The Hollow Throne
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
