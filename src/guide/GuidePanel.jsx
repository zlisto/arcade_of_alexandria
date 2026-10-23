import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { FACTS, GREETING } from './facts.js'
import { gameById, searchGames } from '../games.js'
import { PORTAL } from '../layout.js'
import { navigate } from '../mvw.js'
import { fadeOut, whoosh } from '../audio.js'

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|https:\/\/[^\s)]+[^\s).,:])/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('https://'))
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer">
          {part.replace('https://', '')}
        </a>
      )
    return <Fragment key={i}>{part}</Fragment>
  })
}

function Rich({ text }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*-\s+(.*)/)
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else if (line.trim()) blocks.push({ type: 'p', text: line })
  }
  return blocks.map((b, i) =>
    b.type === 'ul' ? (
      <ul key={i}>
        {b.items.map((it, j) => (
          <li key={j}>{inline(it)}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>{inline(b.text)}</p>
    ),
  )
}

let saved = null

export default function GuidePanel({ visitor, onClose, onPlayGame }) {
  const [messages, setMessages] = useState(() => saved ?? [{ who: 'guide', text: GREETING(visitor) }])
  const [typing, setTyping] = useState(false)
  const [query, setQuery] = useState('')
  const log = useRef()
  // Only games that are playable now; coming-soon cabinets stay in the hall but not in the chat.
  const games = useMemo(() => searchGames(query).filter((g) => g.href), [query])

  useEffect(() => {
    saved = messages
    // Scroll to the top of the newest message so long answers read from their start.
    const el = log.current
    const last = el?.querySelectorAll('.guide-msg')
    if (el && last?.length) {
      const top = last[last.length - 1].getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 8
      el.scrollTo({ top, behavior: 'smooth' })
    }
  }, [messages, typing])
  useEffect(() => {
    const esc = (e) => e.code === 'Escape' && onClose()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [onClose])

  const asked = new Set(messages.filter((m) => m.who === 'you').map((m) => m.text))
  const ask = (fact) => {
    if (typing) return
    setMessages((m) => [...m, { who: 'you', text: fact.q }])
    setTyping(true)
    setTimeout(() => {
      setMessages((m) => [...m, { who: 'guide', text: fact.a, gameId: fact.gameId }])
      setTyping(false)
    }, 650)
  }
  const goHub = () => {
    fadeOut()
    whoosh()
    navigate(PORTAL.href, PORTAL.spawn, PORTAL.back)
  }

  return (
    <div className="guide" role="dialog" aria-label="Talking with Callimachus">
      <header>
        <div className="guide-avatar">📜</div>
        <div className="guide-title">
          Callimachus
          <span>librarian · Arcade of Alexandria</span>
        </div>
        <button className="guide-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      <div className="guide-games">
        <input
          type="search"
          placeholder="Search games…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
        />
        {games.length === 0 ? (
          <p className="world-none">No games match that search.</p>
        ) : (
          games.map((g) => (
            <div key={g.id} className="guide-game">
              <span className="world-dot" />
              <div className="guide-game-name">
                <b>{g.title}</b>
                <span>{g.subject}</span>
              </div>
              <button type="button" onClick={() => onPlayGame?.(g)}>
                Play →
              </button>
            </div>
          ))
        )}
      </div>
      <div className="guide-log" ref={log}>
        {messages.map((m, i) => (
          <div key={i} className={`guide-msg ${m.who === 'you' ? 'you' : 'tauhid'}`}>
            <Rich text={m.text} />
            {m.gameId && gameById(m.gameId)?.href && (
              <button type="button" className="guide-play" onClick={() => onPlayGame?.(gameById(m.gameId))}>
                Play {gameById(m.gameId).title} →
              </button>
            )}
          </div>
        ))}
        {typing && <div className="guide-msg tauhid typing">…</div>}
      </div>
      <div className="guide-asks">
        {FACTS.map((f) => (
          <button key={f.q} className={asked.has(f.q) ? 'asked' : ''} onClick={() => ask(f)} disabled={typing}>
            {f.q}
          </button>
        ))}
      </div>
      <div className="guide-foot">
        <span>Esc or × to keep exploring</span>
        <button type="button" onClick={goHub}>
          Metaverse Square →
        </button>
      </div>
    </div>
  )
}
