import { useEffect, useRef, useState } from 'react'
import { setState, useGame } from '../engine/store'
import { setInputEnabled } from '../engine/input'
import { sfx } from '../audio/sfx'

// FF7-style dialogue: fixed-size box, the whole line is laid out (untyped part invisible), ▶▶ finishes the line,
// Next ▾ advances; Space / Enter / E do the same.

export const PORTRAITS = {
  Pi: 'art/pi.png',
  Kai: 'art/kai.png',
  'Sage Aufbau': 'art/sage-aufbau.png',
  Malradix: 'art/malradix.png',
  'Malradix the Unpaired': 'art/malradix.png',
  'Princess Octavia': 'art/octavia.png',
  Octavia: 'art/octavia.png',
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
  const portrait = PORTRAITS[line.who]
  return (
    <div className="dialogue" onClick={advance}>
      {portrait && <img className="portrait" src={portrait} alt={line.who} />}
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
