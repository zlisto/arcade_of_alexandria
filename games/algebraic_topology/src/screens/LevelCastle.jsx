import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CastleScene from '../levels/w0/CastleScene'
import LevelMovie from './LevelMovie'
import { BEACON_OFFSET, DEFINITION_CASTLE, HINTS_CASTLE, NULL_AT, OPENING, PANELS, PUNISH, RING, TRIALS, WAVES } from '../levels/w0/stagesCastle'
import { dialogOpen, duckMusic, readMuted, setMuted as setAudioMuted, sfxCorrect, sfxWrong, startNullMusic, startReefMusic, stopMusic, textBlip, unlockAudio } from '../audio/chip'
import CastleOutro from '../movies/CastleOutro'
import MathText from './MathText'

/**
 * World 0 · Castle "The Hollow Throne" — Count Null's three trials on the top of his spire.
 * Each round: three demonstrations on the floor, a judgment beacon by each. Lash the
 * beacons of the forgeries (the Lash's crack is the verdict); lashing an honest one brings
 * the Crown's shards and restarts the round. Waves of spawn between trials; then the ring,
 * and the outro movie.
 */

const TYPE_CPS = 45
const START = [0, 7.2]
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
}
const WALK = {
  inside: (x, z) => Math.hypot(x, z) < 8.3 && Math.hypot(x - NULL_AT[0], z - NULL_AT[1]) > 2.3,
  insideForSpawn: (x, z) => Math.hypot(x, z) < 8.0 && Math.hypot(x - NULL_AT[0], z - NULL_AT[1]) > 2.3,
  bounds: { minX: -9, maxX: 9, minZ: -9, maxZ: 9 },
}
const key = (ex) => (Array.isArray(ex) ? ex.join('+') : ex)
const isHonest = (t, ex) => (t === 2 ? TRIALS[2].honestPairs.includes(key(ex)) : TRIALS[t].honest.includes(ex))
const beaconSite = (t, r, i, epoch) => `b:${t}:${r}:${i}:${epoch}`

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

export default function LevelCastle({ onBackToTitle, onNext, onGo, startAt }) {
  const skipTo = Math.max(0, Math.min(3, Number(startAt) || 0)) // dev: trial to start at (3 = the ring)
  const [step, setStep] = useState('intro') // intro | trial | wave | ring | outro
  const [trial, setTrial] = useState(Math.min(2, skipTo))
  const [roundIdx, setRoundIdx] = useState(0)
  const [epoch, setEpoch] = useState(0)
  const [panelStates, setPanelStates] = useState(['live', 'live', 'live'])
  const [lines, setLines] = useState([])
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState('play')
  const [shown, setShown] = useState(0)
  const shownNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  shownNow.current = shown
  const [hearts, setHearts] = useState(3)
  const [knockouts, setKnockouts] = useState(0)
  const [enemies, setEnemies] = useState({})
  const [tool, setTool] = useState('lash')
  const [rules, setRules] = useState(false)
  const [muted, setMuted] = useState(readMuted)
  const [toast, setToast] = useState(null)
  const [complete, setComplete] = useState(false)
  const stateRef = useRef(null)
  const frameRef = useRef({ center: [0, -0.6], size: 15.5 })
  const spawnRef = useRef(null)
  const toastTimer = useRef(null)
  const afterTalk = useRef(null)
  const seenSites = useRef(new Set())
  const nullTalking = useRef(false)

  const round = TRIALS[trial].rounds[roundIdx]
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
    startNullMusic()
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      stopMusic()
    }
  }, [])

  // ---------- the flow
  const beaconsFor = (t, r, ep, states) =>
    PANELS.map((p, i) => (states[i] === 'live' ? { type: 'beacon', x: p[0] + BEACON_OFFSET[0], z: p[1] + BEACON_OFFSET[1], site: beaconSite(t, r, i, ep) } : null)).filter(Boolean)
  const startRound = (t, r, ep) => {
    setStep('trial')
    setTrial(t)
    setRoundIdx(r)
    setEpoch(ep)
    const st = ['live', 'live', 'live']
    setPanelStates(st)
    spawnRef.current?.(beaconsFor(t, r, ep, st))
  }
  const startWave = (t) => {
    setStep('wave')
    spawnRef.current?.(WAVES[t].map(([type, x, z]) => ({ type, x, z, site: 'arena' })))
  }
  const startTrial = (t) => {
    afterTalk.current = () => startRound(t, 0, epoch + 1)
    say(TRIALS[t].intro, 'after')
  }
  useEffect(() => {
    if (skipTo === 3) {
      setStep('ring')
      afterTalk.current = () => setStep('outro')
      return say(RING, 'after')
    }
    afterTalk.current = () => startRound(skipTo, 0, 0)
    say(skipTo === 0 ? [...OPENING, ...TRIALS[0].intro] : TRIALS[skipTo].intro, 'after')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- verdicts: a beacon was lashed (its site's count fell to 0)
  useEffect(() => {
    for (const s of Object.keys(enemies)) if (enemies[s] > 0) seenSites.current.add(s)
    if (step !== 'trial' || phase !== 'play') return
    PANELS.forEach((_, i) => {
      const site = beaconSite(trial, roundIdx, i, epoch)
      if (panelStates[i] !== 'live' || !seenSites.current.has(site) || enemies[site]) return
      judge(i)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies])
  const judge = (i) => {
    const ex = round[i]
    const T = TRIALS[trial]
    if (isHonest(trial, ex)) {
      sfxWrong()
      setPanelStates((p) => p.map((s, j) => (j === i ? 'spared' : s)))
      spawnRef.current?.(PUNISH.map(([type, x, z]) => ({ type, x, z, site: 'arena' })))
      afterTalk.current = () => {
        // the round starts over
        spawnRef.current?.remove((e) => e.site?.startsWith('b:'))
        startRound(trial, roundIdx, epoch + 1)
      }
      return say(HINTS_CASTLE.wrong(T.spared[key(ex)]), 'after')
    }
    sfxCorrect()
    const next = panelStates.map((s, j) => (j === i ? 'exposed' : s))
    setPanelStates(next)
    const left = round.some((e, j) => next[j] === 'live' && !isHonest(trial, e))
    const line = [{ speaker: 'Emmy Boundary', portrait: 'emmy-boundary', text: `Forgery! ${T.why[key(ex)]}` }]
    if (left) return say(line)
    // the round is won: spare the honest ones and move on
    afterTalk.current = () => {
      spawnRef.current?.remove((e) => e.site?.startsWith('b:'))
      if (roundIdx + 1 < T.rounds.length) return startRound(trial, roundIdx + 1, epoch + 1)
      afterTalk.current = () => startWave(trial)
      say(T.done, 'after')
    }
    say(line, 'after')
  }

  // waves end when the arena is clear
  useEffect(() => {
    if (step !== 'wave' || phase !== 'play') return
    if (!seenSites.current.has('arena') || enemies.arena) return
    seenSites.current.delete('arena')
    if (trial < 2) return startTrial(trial + 1)
    setStep('ring')
    afterTalk.current = () => setStep('outro')
    say(RING, 'after')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies, step, phase])

  // knocked out: the round (or wave) starts over
  useEffect(() => {
    if (hearts > 0) return
    setHearts(3)
    setKnockouts((k) => k + 1)
    if (step === 'trial') setPanelStates(['live', 'live', 'live'])
    say([HINTS_CASTLE.knockout])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hearts])

  // tools: the Lash is all you need here
  useEffect(() => {
    const k = (e) => e.code === 'Digit1' && setTool('lash')
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
      const f = afterTalk.current
      afterTalk.current = null
      f?.()
    } else setPhase(next)
  }
  const talking = phase.startsWith('talk:')
  const line = talking ? lines[lineIdx] : null
  nullTalking.current = !!line && line.speaker === 'Count Null'
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

  // ---------- game layer (rebuilt after a knockout with what should be on the floor)
  const playEnabled = phase === 'play' && !rules && step !== 'outro' && !complete
  const gameKey = `castle:${knockouts}`
  const game = useMemo(() => {
    const list = step === 'trial' ? beaconsFor(trial, roundIdx, epoch, ['live', 'live', 'live']) : step === 'wave' ? WAVES[trial].map(([type, x, z]) => ({ type, x, z, site: 'arena' })) : []
    return { mode: 'overworld', bySite: true, start: START, enemies: list }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey])
  const nullScript = () => ({ gesture: nullTalking.current ? 1 : 0.2, crown: step === 'ring' ? 1 : 0.6, crownY: 0 })

  if (import.meta.env.DEV) window.__castle = { step, trial, roundIdx, epoch, panelStates, phase, enemies, round } // dev

  const T = TRIALS[trial]
  const objective =
    step === 'trial' ? `Trial ${trial + 1}/3 · ${T.name} · round ${roundIdx + 1}/${T.rounds.length}` : step === 'wave' ? 'Clear the spawn' : step === 'ring' ? 'The ring' : 'The Hollow Throne'

  return (
    <div className="screen level">
      <Canvas camera={{ position: [0, 14, 18], fov: 45 }} dpr={[1, 1.75]} frameloop={step === 'outro' ? 'never' : 'always'}>
        <CastleScene
          trial={trial}
          round={round}
          panelStates={panelStates}
          showPanels={step === 'trial'}
          nullScript={nullScript}
          walkable={WALK}
          game={game}
          gameKey={gameKey}
          stateRef={stateRef}
          frameRef={frameRef}
          spawnRef={spawnRef}
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
            <button type="button" className="btn ghost" onClick={(e) => (setRules(true), e.currentTarget.blur())}>
              ? How it works
            </button>
          </div>
          <div className="lvl-title">
            <span className="lvl-kicker">World 0 · Castle</span>
            <h2>The Hollow Throne</h2>
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
          </div>
        </div>

        {step === 'trial' && (
          <div className="rules-panel forge-panel works-panel">
            <h3>Trial {trial + 1} · {T.name}</h3>
            <p className="op-blurb">
              {trial === 0 && 'A real deformation stays on the reef, never tears, never jumps the hole.'}
              {trial === 1 && 'Felling a tree or shrinking a disk is legal. Shrinking a loop or coning a hole is not.'}
              {trial === 2 && 'Null says every pair is the same shape. Count χ: if it differs, he’s lying.'}
            </p>
            <p className="forgery-count">⚡ Lash the beacon of each forgery · spare the honest ones</p>
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
        {playEnabled && !toast && !line && <div className="hint">WASD to move · click to crack the Lash toward a beacon or a spawn</div>}

        {rules && (
          <div className="win-banner" onClick={() => setRules(false)}>
            <div className="win-card wide">
              <span className="lvl-kicker">The Hollow Throne · how it works</span>
              <h2>Null’s trials</h2>
              <p className="def">Each round, Null runs three demonstrations on the floor, with a violet beacon by each. Walk up to the beacon of a forgery and crack the Lash at it. Lashing an honest one summons Crown shards and the round starts over.</p>
              <p className="def">Trial 1 tests deformations (0-1, 0-2). Trial 2 tests collapses (0-5, 0-6). Trial 3 tests “same shape” claims using χ (0-3, 0-4).</p>
              <div className="btn-row">
                <button type="button" className="btn primary">
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {step === 'outro' && !complete && (
        <LevelMovie videoId="castle-0-outro" Scene={CastleOutro} kicker="World 0 · Castle" name="A Ring Is a Ring" startMusic={startReefMusic} embedded onDone={() => setComplete(true)} onSkip={() => setComplete(true)} />
      )}

      {complete && (
        <div className="win-banner exit">
          <div className="win-card wide">
            <span className="lvl-kicker">World 0 complete — Retract Reef restored</span>
            <h2>The Hollow Throne</h2>
            <p className="def">{DEFINITION_CASTLE.text}</p>
            <p className="cite">
              {DEFINITION_CASTLE.cite}{' '}
              <a href={DEFINITION_CASTLE.url} target="_blank" rel="noreferrer">
                Read the book
              </a>
            </p>
            <p className="next-up">Next: World 1 — the fundamental group, where loops get counted.</p>
            <div className="btn-row">
              {onNext && (
                <button type="button" className="btn primary" onClick={onNext}>
                  Continue ▸ World 1
                </button>
              )}
              <button type="button" className={onNext ? 'btn ghost' : 'btn primary'} onClick={onBackToTitle}>
                Back to title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
