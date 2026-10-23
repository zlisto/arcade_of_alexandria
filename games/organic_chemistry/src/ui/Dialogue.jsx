import { useEffect, useRef, useState } from 'react'
import { setState, useGame } from '../engine/store'
import { setInputEnabled } from '../engine/input'
import { sfx } from '../audio/sfx'

// FF7-style dialogue: fixed-size box, the whole line is laid out (untyped part invisible), ▶▶ finishes the line,
// Next ▾ advances; Space / Enter / E do the same.

// Small face crops (art/portraits/*.jpg, ~8 KB each) so the box never waits on a 1–2 MB poster.
export const PORTRAITS = {
  Pi: 'art/portraits/pi.jpg',
  Kai: 'art/portraits/kai.jpg',
  'Sage Aufbau': 'art/portraits/sage-aufbau.jpg',
  Malradix: 'art/portraits/malradix.jpg',
  'Malradix the Unpaired': 'art/portraits/malradix.jpg',
  'Princess Octavia': 'art/portraits/octavia.jpg',
  Octavia: 'art/portraits/octavia.jpg',
}
// fetch them up front, so the first line of dialogue already has its face
if (typeof window !== 'undefined') Object.values(PORTRAITS).forEach((src) => { const im = new Image(); im.src = src })

function Portrait({ who }) {
  const src = PORTRAITS[who]
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (src && !failed) return <img className="portrait" src={src} alt="" onError={() => setFailed(true)} />
  // no art (villagers) or it failed to load: a lettered badge instead of a broken image
  const initials = who.split(/[\s&]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return <div className="portrait portrait-badge"><span>{initials}</span></div>
}

export default function Dialogue() {
  const d = useGame((s) => s.dialogue)
  const [i, setI] = useState(0)
  const [n, setN] = useState(0)
  const timer = useRef(null)
  const line = d ? d.lines[i] : null
  const full = line ? line.text : ''

  useEffect(() => { setI(0); setN(0) }, [d])
  useEffect(() => {
    if (!d) { setInputEnabled(true); return }
    setInputEnabled(false)
  }, [d])
  useEffect(() => {
    if (!line) return
    setN(0)
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      setN((k) => {
        if (k >= full.length) { clearInterval(timer.current); return k }
        if (k % 3 === 0) sfx('text')
        return k + 1
      })
    }, 18)
    return () => clearInterval(timer.current)
  }, [line, full])

  const advance = () => {
    if (!d) return
    if (n < full.length) { setN(full.length); return }
    if (i + 1 < d.lines.length) setI(i + 1)
    else {
      const done = d.onDone
      setState({ dialogue: null })
      setTimeout(() => done && done(), 0)
    }
  }
  useEffect(() => {
    if (!d) return
    const k = (e) => {
      if (['Space', 'Enter', 'KeyE'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); advance() }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  })
  if (!d || !line) return null
  return (
    <div className="dialogue" onClick={advance}>
      <Portrait who={line.who} />
      <div className="dbox">
        <div className="who">{line.who}</div>
        <div className="dtext">
          <span>{full.slice(0, n)}</span>
          <span style={{ visibility: 'hidden' }}>{full.slice(n)}</span>
        </div>
        <div className="dctl">
          {n < full.length ? <button onClick={(e) => { e.stopPropagation(); setN(full.length) }}>▶▶</button>
            : <button onClick={(e) => { e.stopPropagation(); advance() }}>{i + 1 < d.lines.length ? 'Next ▾' : 'Close ▾'}</button>}
        </div>
      </div>
    </div>
  )
}
