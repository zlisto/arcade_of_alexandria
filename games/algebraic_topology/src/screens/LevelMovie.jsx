import { Canvas, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import videos from '../../videos.json'
import { dialogOpen, duckMusic, readMuted, setMuted as setAudioMuted, stopMusic, switchMusic, textBlip, unlockAudio } from '../audio/chip'
import { isAdvanceEvent, makeGate } from './captionHold'
import MathText from './MathText'

/**
 * Plays a level's intro movie from videos.json: a 3D scene driven by story time,
 * letterboxed, with typed captions (SNES blips), the title card, music, and skip.
 * The scene component gets `tRef` (story seconds) and draws whatever that time calls for.
 * Captions work like Final Fantasy VII: each line types out, then the movie holds on
 * that frame until the player clicks (Space / Enter too); Esc skips the movie.
 */

const CHARS_PER_SEC = 30
const PORTRAIT_CROP = {
  gyroid: ['400%', '63%', '9%'],
  'count-null': ['600%', '50%', '26%'],
  'emmy-boundary': ['400%', '54%', '5%'],
  commutator: ['500%', '53%', '19%'],
}
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))

/** Story clock inside the canvas (frame-driven, so dev frame-stepping works). */
function MovieClock({ tRef, start, rate, onTick, paused, gate }) {
  const wall = useRef(0)
  useFrame((_, dt) => {
    if (!paused) {
      const t0 = start + wall.current * rate
      const next = wall.current + Math.min(dt, 0.1)
      const stop = gate(t0, start + next * rate)
      wall.current = stop === null ? next : Math.max(wall.current, (stop - start) / rate)
    }
    tRef.current = start + wall.current * rate
    onTick(tRef.current)
  })
  return null
}

export default function LevelMovie({ videoId, Scene, Overlay, kicker, name, startMusic, musicCues = [], onDone, onSkip, embedded = false }) {
  const video = useMemo(() => videos.videos.find((v) => v.id === videoId), [videoId])
  const q = new URLSearchParams(embedded ? '' : window.location.search) // dev: ?t=…&pause
  const start = q.has('t') ? Number(q.get('t')) : video.story_start
  const paused = q.has('pause')
  const rate = video.pace?.[0]?.[2] ?? 1
  const tRef = useRef(start)
  const [t, setT] = useState(start)
  const lastQ = useRef(-1)
  const done = useRef(false)
  const [muted, setMuted] = useState(readMuted)
  const lastCap = useRef(null)
  const acked = useRef(new Set())
  const held = useRef(null)
  const gate = useMemo(() => makeGate(video.captions, acked.current, held), [video])
  const [isHeld, setIsHeld] = useState(false)

  useEffect(() => {
    unlockAudio()
    startMusic?.()
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      stopMusic()
    }
  }, [startMusic])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onSkip?.()
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        advanceRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSkip])

  const onTick = useCallback(
    (time) => {
      const k = Math.floor(time * 20)
      setIsHeld(held.current !== null)
      if (k !== lastQ.current) {
        lastQ.current = k
        setT(time)
      }
      if (time >= video.story_end && !done.current) {
        done.current = true
        onDone?.()
      }
    },
    [video, onDone],
  )

  // music cues: [{ t, start }] — switch themes when the story reaches t (e.g. Count Null's entrance)
  let cueIdx = -1
  musicCues.forEach((c, i) => t >= c.t && (cueIdx = i))
  const lastCue = useRef(-1)
  useEffect(() => {
    if (cueIdx === lastCue.current) return
    lastCue.current = cueIdx
    switchMusic(cueIdx >= 0 ? musicCues[cueIdx].start : startMusic || (() => {}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cueIdx])

  const cap = video.captions.find((c) => t >= c.t && t < c.end)
  // each line types out on its own clock (blips every couple of letters), even while the movie holds
  const [typed, setTyped] = useState(0)
  const typedNow = useRef(0) // the typed count right now (a skip jumps it to the end)
  typedNow.current = typed
  useEffect(() => {
    if (cap && cap !== lastCap.current) dialogOpen()
    lastCap.current = cap
    duckMusic(!!cap)
    setTyped(0)
    if (!cap) return
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped((n) => Math.max(n, i))
      // skipped ahead (Enter, Space, ▶▶)? the line is done: stop typing, and stop the blips
      if (typedNow.current >= cap.text.length) return clearInterval(id)
      const ch = cap.text[i - 1]
      if (ch && ch !== ' ' && i % 2 === 0) textBlip(cap.speaker)
      if (i >= cap.text.length) clearInterval(id)
    }, 1000 / CHARS_PER_SEC)
    return () => clearInterval(id)
  }, [cap])
  const shown = cap ? cap.text.slice(0, typed) : ''
  const lineDone = !!cap && typed >= cap.text.length

  // click / Space / Enter: finish the line, or (once it's held) move on
  const advance = () => {
    if (!cap) return
    if (!lineDone) return setTyped(cap.text.length)
    if (held.current !== null) {
      acked.current.add(held.current)
      held.current = null
      setIsHeld(false)
    }
  }
  const advanceRef = useRef(advance)
  advanceRef.current = advance

  const tc = video.title_card
  const title = tc ? seg(t, tc.t, tc.t + 1) * (1 - seg(t, tc.end - 0.7, tc.end)) : 0
  const fade = Math.max(1 - seg(t, video.story_start, video.story_start + 1), seg(t, video.story_end - 0.7, video.story_end))
  const base = import.meta.env.BASE_URL
  const scene = useMemo(() => <Scene tRef={tRef} />, [Scene])

  return (
    <div className={`screen intro${embedded ? ' embedded' : ''}`} onPointerDown={(e) => isAdvanceEvent(e) && advance()}>
      <Canvas camera={{ position: [-20, 6, 18], fov: 40, near: 0.1, far: 220 }} dpr={[1, 1.75]}>
        <MovieClock tRef={tRef} start={start} rate={rate} onTick={onTick} paused={paused} gate={gate} />
        {scene}
      </Canvas>
      <div className="letterbox top" />
      <div className="letterbox bottom" />
      <div className="intro-fade" style={{ opacity: fade }} />

      <div className="ui-overlay">
        <div className="hud-top">
          <div />
          <div className="btn-row">
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setMuted(!muted)
                setAudioMuted(!muted)
              }}
              aria-pressed={muted}
            >
              {muted ? '♪ Sound off' : '♪ Sound on'}
            </button>
            <button type="button" className="btn ghost" onClick={onSkip}>
              Skip ▸
            </button>
          </div>
        </div>

        {Overlay && <Overlay t={t} tRef={tRef} />}

        {cap && (
          <div key={cap.t} className={`intro-caption ${cap.portrait ? 'has-portrait' : 'narrator'}`}>
            {cap.portrait && (
              <div
                className="portrait"
                role="img"
                aria-label={cap.speaker}
                style={{
                  backgroundImage: `url(${base}assets/characters/${cap.portrait}.png)`,
                  backgroundSize: (PORTRAIT_CROP[cap.portrait] || PORTRAIT_CROP.gyroid)[0],
                  backgroundPosition: `${(PORTRAIT_CROP[cap.portrait] || PORTRAIT_CROP.gyroid)[1]} ${(PORTRAIT_CROP[cap.portrait] || PORTRAIT_CROP.gyroid)[2]}`,
                }}
              />
            )}
            <div>
              <span className="speaker">{cap.speaker}</span>
              <p>
                <MathText text={cap.text} shown={shown} />
              </p>
            </div>
            {isHeld && lineDone && (
              <span className="caption-next" aria-label="Click to continue">
                ▼
              </span>
            )}
          </div>
        )}

        {title > 0 && (
          <div className="intro-title" style={{ opacity: title }}>
            <p className="level-tag">{kicker}</p>
            <h1>{name || video.title}</h1>
          </div>
        )}
      </div>
    </div>
  )
}
