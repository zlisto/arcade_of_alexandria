import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useExitTrigger } from './exitTrigger'
import { MapNext } from './LevelMap'
import OverworldScene from '../levels/w0/OverworldScene'
import { cleanStroke, sampleShape, simulateSlide, snapPoint } from '../levels/w0/retraction'
import { DEFINITION, HINTS, RULES, STAGES } from '../levels/w0/stages01'
import { SITE, SITES, gateSegments, layout, makeWalkable, siteAt, worldToMap } from '../world/reef'
import { dialogOpen, duckMusic, readMuted, setMuted as setAudioMuted, sfxCorrect, sfxWrong, startReefMusic, stopReefMusic, textBlip, unlockAudio } from '../audio/chip'
import MathText from './MathText'

/**
 * World 0 · Level 1 "A Good Deformation" as an overworld: Gyroid lands at the
 * Landing Pier and roams Retract Reef (third-person follow camera). Each 0-1 site —
 * the Walkway, the Fork, the O, Twin Lagoons — has spawn to clear and a reef to
 * shrink onto a spine. With all four saved, Null's Mirage tests the rules; winning
 * mends the broken causeway toward Tidewarp Flats (0-2).
 */

const SLIDE_SECONDS = 2.6
const TYPE_CPS = 45 // dialogue typing speed, characters per second
const REGROW_SECONDS = 1.6
const ORDER = ['the_walkway', 'the_fork', 'the_o', 'twin_lagoons'] // suggested order; any order works
const STAGE_OF = Object.fromEntries(STAGES.map((s) => [s.id, s]))
const PLAYABLE = SITES.filter((s) => s.playable)
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const E = (text) => ({ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text })

function Portrait({ id, name }) {
  const [size, x, y] = PORTRAIT_CROP[id]
  return (
    <div
      className="portrait"
      role="img"
      aria-label={name}
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}assets/characters/${id}.png)`, backgroundSize: size, backgroundPosition: `${x} ${y}` }}
    />
  )
}

function firstHint(stage, strokes, sim) {
  const key = !strokes.length ? 'empty' : sim.problem || (!sim.beaconHit.every(Boolean) ? 'beacons' : null)
  return (stage.hints && stage.hints[key]) || HINTS[key]
}

/** Site intro lines, reworded for walking up to the site in the overworld. */
function arrivalLines(site, stage) {
  if (site.stage === 'walkway') {
    return [
      E('There — the Walkway. Null’s spawn are crawling all over it. WASD to run, click to crack the Fundamental Lash toward your mouse.'),
      E('Spheres are slippery — every loop slides right off them — so one lash collapses each to a point.'),
    ]
  }
  return stage.intro
}

/** Minimap from the same layout as the bible's map. */
function Minimap({ pos, saved, current, gateOpen }) {
  const nextId = ORDER.find((id) => !saved[id])
  const P = (x, z) => worldToMap(x, z)
  const [gx, gz] = P(pos[0], pos[1])
  const [fx, fz] = P(...layout.scenery.skeleton_foundry.pos)
  return (
    <svg className="minimap" viewBox="0 0 100 60" aria-label="Retract Reef map">
      <rect width="100" height="60" rx="3" fill="#0b1626" />
      <circle cx={fx} cy={fz} r="7" fill="#3b4255" opacity="0.6" />
      {layout.causeways.map((c, i) => {
        const [x1, y1] = P(...c.a)
        const [x2, y2] = P(...c.b)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5c6680" strokeWidth="1.1" />
      })}
      {gateSegments(gateOpen).map(([a, b], i) => {
        const [x1, y1] = P(...a)
        const [x2, y2] = P(...b)
        return <line key={`g${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={gateOpen ? '#ffd27a' : '#5c6680'} strokeWidth="1.1" strokeDasharray={gateOpen ? '' : '1.5 1'} />
      })}
      {[layout.scenery.tidewarp_flats, layout.scenery.mirror_shoals, layout.scenery.hollow_throne].map((s, i) => {
        const [x, y] = P(...s.pos)
        return <circle key={i} cx={x} cy={y} r="2.2" fill={i === 2 ? '#a259ff' : '#3b4255'} opacity="0.85" />
      })}
      {SITES.map((s) => {
        const [x, y] = P(...s.pos)
        const fill = s.kind === 'start' ? '#3ecfbf' : saved[s.id] ? '#ffb347' : 'transparent'
        return <circle key={s.id} cx={x} cy={y} r={s.id === current ? 3.4 : 2.6} fill={fill} stroke={s.id === current ? '#fff' : '#ffb347'} strokeWidth="0.7" />
      })}
      <MapNext from={[gx, gz]} to={nextId ? P(...SITE[nextId].pos) : gateOpen ? P(...layout.gate.b) : null} label={nextId ? 'NEXT' : 'EXIT'} />
      <circle cx={gx} cy={gz} r="1.8" fill="#3ecfbf" stroke="#fff" strokeWidth="0.5" />
    </svg>
  )
}

export default function Level01({ concept, onBackToTitle, onNext, startAt }) {
  const levelMeta = concept?.worlds?.[0]?.levels?.find((l) => l.id === '0-1')
  const samplesBySite = useMemo(() => Object.fromEntries(PLAYABLE.map((s) => [s.id, sampleShape(s.shape)])), [])
  const given = (site) => (site.givenSpine ? site.givenSpine.map((s) => cleanStroke(s)) : [])

  // debug: start at a later reef (or Null's Mirage), with the earlier reefs already saved
  const skip = startAt === 'nulls_mirage' ? ORDER.length : Math.max(0, ORDER.indexOf(startAt))
  const preSaved = Object.fromEntries(ORDER.slice(0, skip).map((id) => [id, true]))
  const startPos = skip ? SITE[skip < ORDER.length ? ORDER[skip] : 'nulls_mirage'].pos : SITE.landing_pier.pos
  const [saved, setSaved] = useState(preSaved)
  const [gateOpen, setGateOpen] = useState(false)
  const [strokesBySite, setStrokesBySite] = useState(() => Object.fromEntries(PLAYABLE.map((s) => [s.id, given(s)])))
  const [liveStroke, setLiveStroke] = useState(null)
  const drawing = useRef(null) // { site, pts }
  const [sim, setSim] = useState(null)
  const [simSite, setSimSite] = useState(null)
  const [t, setT] = useState(0)
  const tRef = useRef(0)
  const [running, setRunning] = useState(0) // 1 = sliding, -1 = regrowing
  const [enemies, setEnemies] = useState({})
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [checkpoint, setCheckpoint] = useState(startPos)
  const [tool, setTool] = useState('lash')
  const [spooling, setSpooling] = useState(false)
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play') // play | talk:<next> | quiz | clear
  const [met, setMet] = useState(preSaved)
  const [cleared, setCleared] = useState({})
  const [forgeryIdx, setForgeryIdx] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [levelClear, setLevelClear] = useState(false)
  const stateRef = useRef(null)
  const [here, setHere] = useState({ site: null, pos: startPos })
  const judged = useRef(null)
  const [shown, setShown] = useState(0) // characters of the current line typed out so far
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  shownNow.current = shown
  const [muted, setMuted] = useState(readMuted)
  const reported = useRef(false) // the game has reported spawn counts at least once

  const setTime = useCallback((v) => {
    tRef.current = v
    setT(v)
  }, [])
  const say = useCallback((ls, next = 'play') => {
    setLines(ls)
    setLineIdx(0)
    setPhase(ls.length ? 'talk:' + next : next)
  }, [])

  // the Retract Reef theme, for as long as the level is open
  useEffect(() => {
    unlockAudio()
    startReefMusic()
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      stopReefMusic()
    }
  }, [])

  // opening line
  useEffect(() => {
    if (skip) return
    say([E('The spines held — so the reef can be saved. Start with the Walkway, just up from the pier. Every patch of reef we shrink onto its spine is one Null can’t erase.')])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [say])

  // where is Gyroid? (polled; drives arrivals, the HUD and the minimap)
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current
      if (!s) return
      const at = siteAt(s.x, s.z)?.id || null
      setHere((h) => (h.site === at && Math.abs(h.pos[0] - s.x) < 0.05 && Math.abs(h.pos[1] - s.z) < 0.05 ? h : { site: at, pos: [s.x, s.z] }))
    }, 120)
    return () => clearInterval(id)
  }, [])
  const site = here.site ? SITE[here.site] : null
  const stage = site ? STAGE_OF[site.stage] : null
  const allSaved = ORDER.every((id) => saved[id])

  // arriving at a site
  useEffect(() => {
    if (!site || phase !== 'play' || met[site.id]) return
    if (site.stage === 'forgeries') {
      if (!allSaved) {
        setMet((m) => ({ ...m, nulls_mirage_early: true }))
        if (!met.nulls_mirage_early) say([E('Null’s Mirage. Something’s waiting out here — but save the other four reefs first.')])
        return
      }
      setMet((m) => ({ ...m, [site.id]: true }))
      setForgeryIdx(0)
      setAnswer(null)
      setTime(0)
      return say(stage.intro, 'quiz')
    }
    setMet((m) => ({ ...m, [site.id]: true }))
    say(arrivalLines(site, stage))
  }, [site, phase, met, allSaved, stage, say, setTime])

  // a site's spawn cleared → that stage's "cleared" lines
  useEffect(() => {
    for (const s of PLAYABLE) {
      if (!s.enemies?.length || cleared[s.id] || saved[s.id] || !met[s.id]) continue
      if (reported.current && !enemies[s.id]) {
        setCleared((c) => ({ ...c, [s.id]: true }))
        say(STAGE_OF[s.stage].cleared || [HINTS.cleared])
        return
      }
    }
  }, [enemies, cleared, saved, met, say])
  const siteClear = (id) => !SITE[id].enemies?.length || cleared[id] || saved[id] || !enemies[id]

  // knocked out → back to the last checkpoint; spawn of unsaved reefs come back
  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    setCleared((c) => Object.fromEntries(Object.entries(c).filter(([id]) => saved[id])))
    say([HINTS.knockout])
  }, [hearts, saved, say])

  // slide / regrow / forgery-loop animation
  useEffect(() => {
    const looping = phase === 'quiz' && !answer
    if (!running && !looping) return
    let raf
    const t0 = performance.now()
    const from = tRef.current
    const tick = () => {
      const el = (performance.now() - t0) / 1000
      if (looping) setTime(Math.min(1, (el % (SLIDE_SECONDS + 1.2)) / SLIDE_SECONDS))
      else if (running > 0) {
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
          return
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, phase, answer, forgeryIdx, setTime])

  // verdict at the end of a slide
  useEffect(() => {
    if (t < 1 || !sim || running || phase !== 'play' || judged.current === sim) return
    judged.current = sim
    const st = STAGE_OF[SITE[simSite].stage]
    if (sim.valid) {
      setSaved((s) => ({ ...s, [simSite]: true }))
      const b = SITE[simSite].beacons?.[0]
      if (b) setCheckpoint(SITE[simSite].toWorld(...b))
      const out = [...st.success]
      const next = ORDER.find((id) => id !== simSite && !saved[id])
      if (next) out.push(E(`Reef saved — it’ll grow back whole now. Next: ${SITE[next].name}. Follow the causeway.`))
      else out.push(E('That’s all four. Now — out past Twin Lagoons to the broken causeway. Something’s waiting at Null’s Mirage.'))
      say(out, 'regrow')
    } else say([firstHint(st, strokesBySite[simSite] || [], sim)])
  }, [t, sim, running, phase, simSite, saved, strokesBySite, say])

  // ---------- spine thread (Gyroid's Spool), routed to the reef he's standing on
  const invalidate = () => {
    setSim(null)
    setSimSite(null)
    setTime(0)
  }
  const onStrokeStart = (x, z) => {
    const s = siteAt(x, z)
    if (!s || s.stage === 'walkway' || s.stage === 'forgeries' || saved[s.id]) return
    const [lx, lz] = s.toLocal(x, z)
    drawing.current = { site: s.id, pts: [snapPoint(strokesBySite[s.id] || [], lx, lz)] }
    setLiveStroke(drawing.current.pts)
    if (simSite === s.id) invalidate()
  }
  const commit = () => {
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
    if (!d) return onStrokeStart(x, z)
    const s = SITE[d.site]
    if (!s.containsWorld(x, z)) return commit() // stepping off the reef ties off the thread
    const [lx, lz] = s.toLocal(x, z)
    const last = d.pts[d.pts.length - 1]
    if (Math.hypot(lx - last[0], lz - last[1]) < 0.06) return
    d.pts = [...d.pts, [lx, lz]]
    setLiveStroke(d.pts)
  }

  const canSlideHere = !!site && site.stage !== 'forgeries' && !saved[site.id] && siteClear(site.id) && (strokesBySite[site.id] || []).length > 0
  const slide = () => {
    if (!canSlideHere) return
    const result = simulateSlide(site.shape, samplesBySite[site.id], strokesBySite[site.id], site.beacons || [])
    setSim(result)
    setSimSite(site.id)
    setTime(0)
    setRunning(1)
  }
  const undo = () => {
    if (!site) return
    setStrokesBySite((m) => ({ ...m, [site.id]: (m[site.id] || []).slice(0, -1) }))
    if (simSite === site.id) invalidate()
  }
  const clearSite = () => {
    if (!site) return
    setStrokesBySite((m) => ({ ...m, [site.id]: [] }))
    if (simSite === site.id) invalidate()
  }

  // weapon switch: 1 = Lash, 2 = Spool, Q / wheel toggles
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

  // ---------- Null's Mirage
  const mirage = STAGE_OF.forgeries
  const forgery = phase === 'quiz' ? mirage.forgeries[forgeryIdx] : null
  const pick = (ruleId) => {
    const correct = ruleId === forgery.broken
    setAnswer({ rule: ruleId, correct })
    if (correct) setTime(1)
    ;(correct ? sfxCorrect : sfxWrong)()
  }
  const nextForgery = () => {
    setAnswer(null)
    setTime(0)
    if (forgeryIdx + 1 < mirage.forgeries.length) setForgeryIdx(forgeryIdx + 1)
    else {
      setSaved((s) => ({ ...s, nulls_mirage: true }))
      say([...mirage.success, E('Now the causeway. Lay the Spool across the gap…'), E('There — mended. Tidewarp Flats is open — walk across when you’re ready.')], 'clear')
    }
  }

  // ---------- dialogue
  const advance = () => {
    const full = lines[lineIdx]?.text.length ?? 0
    if (shown < full) return setShown(full) // first click finishes the line
    if (lineIdx + 1 < lines.length) return setLineIdx(lineIdx + 1)
    const next = phase.split(':')[1]
    if (next === 'regrow') {
      setPhase('play')
      setRunning(-1) // the saved reef grows back from its spine
    } else if (next === 'clear') {
      setGateOpen(true) // the way on is open; the level ends when Gyroid walks it
      setPhase('clear')
    } else setPhase(next)
  }

  const talking = phase.startsWith('talk:')
  const line = talking ? lines[lineIdx] : null

  // dialogue box opens: chime, and the music dips under the voices
  useEffect(() => {
    if (talking) dialogOpen()
    duckMusic(talking)
  }, [talking])
  // type the line out, SNES style, with a blip every couple of letters
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
  const playEnabled = (phase === 'play' || phase === 'clear') && !running && t === 0 && !levelClear
  const drawSite = !!site && ['fork', 'ring', 'lagoons'].includes(site.stage) && !saved[site.id]
  const spoolEnabled = playEnabled && drawSite
  const gameKey = `ow:${knockouts}`
  const walkable = useMemo(() => makeWalkable({ gateOpen }), [gateOpen])
  const game = useMemo(
    () => ({
      mode: 'overworld',
      start: checkpoint,
      enemies: PLAYABLE.filter((s) => !saved[s.id]).flatMap((s) => (s.enemies || []).map(([type, x, z]) => ({ type, x: x + s.pos[0], z: z + s.pos[1], site: s.id }))),
    }),
    // spawn are placed when the game (re)mounts — at the start and after a knockout
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameKey],
  )
  const simWorld = useMemo(() => {
    if (!sim || !simSite) return null
    const s = SITE[simSite]
    return { endpointAt: (x, z) => (s.containsWorld(x, z) ? s.toWorld(...(sim.endpointAt(...s.toLocal(x, z)) || s.toLocal(x, z))) : [x, z]) }
  }, [sim, simSite])
  const quizActive = phase === 'quiz'

  if (import.meta.env.DEV) window.__lvl = { here, saved, strokesBySite, sim, simSite, enemies, phase, setTool, save: (ids) => setSaved((s) => ({ ...s, ...Object.fromEntries(ids.map((i) => [i, true])) })) } // dev

  const scene = useMemo(
    () => (
      <OverworldScene
        samplesBySite={samplesBySite}
        strokesBySite={strokesBySite}
        liveStroke={liveStroke}
        drawingSite={drawing.current?.site}
        activeSite={quizActive ? 'nulls_mirage' : simSite}
        sim={sim}
        simWorld={simWorld}
        tRef={tRef}
        saved={saved}
        forgery={forgery?.id || null}
        walkable={walkable}
        game={game}
        stateRef={stateRef}
        gameKey={gameKey}
        playEnabled={playEnabled}
        spoolEnabled={spoolEnabled}
        tool={tool}
        gateOpen={gateOpen}
        onStrokeStart={onStrokeStart}
        onStrokeMove={onStrokeMove}
        onStrokeEnd={commit}
        onEnemies={(by) => ((reported.current = true), setEnemies(by))}
        onHearts={setHearts}
        onSpooling={setSpooling}
      />
    ),
    // handlers close over strokes and the current site, which are listed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [samplesBySite, strokesBySite, liveStroke, sim, simWorld, simSite, saved, forgery, walkable, game, gameKey, playEnabled, spoolEnabled, tool, gateOpen, quizActive, here.site],
  )

  const objective = (() => {
    if (levelClear || saved.nulls_mirage) return 'Walk the mended causeway to Tidewarp Flats'
    if (allSaved) return 'Go to Null’s Mirage, past Twin Lagoons'
    const next = ORDER.find((id) => !saved[id])
    return `Reefs saved ${ORDER.filter((id) => saved[id]).length}/4 · next: ${SITE[next].name}`
  })()

  const ruleState = (id) => (!sim || simSite !== here.site || t < 1 ? 'idle' : sim.rules[id] ? 'ok' : 'bad')
  // the end-of-level menu waits until Gyroid walks the mended causeway to its far end
  useExitTrigger(phase === 'clear', stateRef, (x, z) => Math.hypot(x - layout.gate.b[0], z - layout.gate.b[1]) < 1.6, () => setLevelClear(true))
  const showRules = quizActive || (!!site && site.stage !== 'forgeries')
  const siteEnemies = site ? enemies[site.id] || 0 : 0
  const beaconsOk = sim && simSite === here.site && t >= 1 ? sim.beaconHit.every(Boolean) : null

  return (
    <div className="screen level">
      <Canvas camera={{ position: [7.7, 11, 18], fov: 45 }} dpr={[1, 1.75]}>
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
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Level 1 · Retract Reef</span>
            <h2>{levelMeta?.title || 'A Good Deformation'}</h2>
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
                {saved[site.id] ? ' · saved' : siteEnemies ? ` · Null’s spawn: ${siteEnemies}` : site.stage !== 'forgeries' ? ' · clear' : ''}
              </div>
            )}
          </div>
        </div>

        {!line && <Minimap pos={here.pos} saved={saved} current={here.site} gateOpen={gateOpen} />}

        {showRules && (
          <div className="rules-panel">
            <h3>{quizActive ? 'Which rule breaks?' : 'Deformation retraction rules'}</h3>
            <ul>
              {RULES.map((r) => {
                const st = ruleState(r.id)
                const chosen = answer?.rule === r.id
                return (
                  <li key={r.id} className={`rule ${quizActive ? '' : st} ${chosen ? (answer.correct ? 'ok' : 'bad') : ''}`}>
                    {quizActive ? (
                      <button type="button" className="rule-btn" disabled={answer?.correct} onClick={() => pick(r.id)}>
                        <span className="rule-label">{r.label}</span>
                        <span className="rule-math">{r.math}</span>
                      </button>
                    ) : (
                      <>
                        <span className="rule-mark">{st === 'ok' ? '✓' : st === 'bad' ? '✗' : '·'}</span>
                        <span className="rule-label">{r.label}</span>
                        <span className="rule-math">{r.math}</span>
                      </>
                    )}
                  </li>
                )
              })}
              {!quizActive && site?.beacons?.length > 0 && (
                <li className={`rule goal ${beaconsOk === null ? 'idle' : beaconsOk ? 'ok' : 'bad'}`}>
                  <span className="rule-mark">{beaconsOk === null ? '·' : beaconsOk ? '✓' : '✗'}</span>
                  <span className="rule-label">Spine through every beacon</span>
                </li>
              )}
            </ul>
            {quizActive && (
              <p className="forgery-count">
                Forgery {forgeryIdx + 1} of {mirage.forgeries.length} · t = {t.toFixed(2)}
                <br />
                The dim grid underneath is where the reef started.
              </p>
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

        {answer && quizActive && (
          <div className={`dialog verdict ${answer.correct ? 'ok' : 'bad'}`}>
            <Portrait id="emmy-boundary" name="Emmy Boundary" />
            <div className="dialog-body">
              <span className="speaker">Emmy Boundary</span>
              <p>{answer.correct ? forgery.explain : 'Not that one — that rule holds here. Watch it again closely.'}</p>
            </div>
            <button type="button" className="btn primary small" onClick={answer.correct ? nextForgery : () => setAnswer(null)}>
              {answer.correct ? 'Next' : 'Watch again'}
            </button>
          </div>
        )}

        {!talking && !levelClear && !quizActive && (
          <div className="controls">
            <div className="weapons" role="group" aria-label="Weapon">
              <button type="button" className={`weapon ${tool === 'lash' ? 'active' : ''}`} onClick={(e) => (setTool('lash'), e.currentTarget.blur())} title="Fundamental Lash — click the reef to crack it (1)">
                ⚡ Lash <kbd>1</kbd>
              </button>
              <button
                type="button"
                className={`weapon ${tool === 'spool' ? 'active' : ''} ${spooling ? 'threading' : ''}`}
                onClick={(e) => (setTool('spool'), e.currentTarget.blur())}
                title="Spool — on a reef: click to start the thread, walk, click to stop (2)"
              >
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
              </>
            )}
            {site && site.stage !== 'forgeries' && !saved[site.id] && (
              <button type="button" className="btn primary" onClick={slide} disabled={!canSlideHere || !!running || (!!sim && t > 0)} title={!siteClear(site.id) ? 'Clear Null’s spawn first' : ''}>
                Slide ▶
              </button>
            )}
            {sim && !sim.valid && t >= 1 && !running && (
              <button type="button" className="btn primary" onClick={invalidate}>
                ↺ Back to the reef
              </button>
            )}
          </div>
        )}
        {playEnabled && (
          <div className="hint">
            {spooling
              ? 'Threading… walk to lay spine · click to stop'
              : tool === 'spool'
                ? drawSite
                  ? 'Click to start the thread · walk it through the beacons · click to stop'
                  : 'The Spool lays spine on a reef — walk onto one'
                : 'WASD to move · click to crack the Lash · 2 / Q for the Spool'}
          </div>
        )}
      </div>

      {levelClear && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 · Level 1 clear</span>
            <h2>{levelMeta?.title || 'A Good Deformation'}</h2>
            <p className="def">{DEFINITION.text}</p>
            <p className="cite">
              {DEFINITION.cite}{' '}
              <a href={DEFINITION.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">The broken causeway is mended. Next: 0-2 · Bend, Don’t Break at Tidewarp Flats.</p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setLevelClear(false)}>
                Keep exploring
              </button>
              <button type="button" className="btn primary" onClick={onNext}>
                On to Tidewarp Flats ▸
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
