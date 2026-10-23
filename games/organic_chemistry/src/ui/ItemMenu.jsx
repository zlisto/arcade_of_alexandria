import { useEffect, useState } from 'react'
import { useGame, setState, getState } from '../engine/store'
import { getActiveWorld } from '../engine/active'
import { ELEMENTS, HYBRIDS } from '../chem/rules'
import { CODEX, BOOK } from '../data/codex'
import { ROOMS } from '../data/dungeon1'
import { sfx } from '../audio/sfx'

// The pause screen, Ocarina-style: Items (gear, the Hybrid Crystal's three forms, bond sockets,
// shards), Notes (what each puzzle taught, with book section + pages) and Quest (where to go next).
// Opens with Esc or P; the game is frozen while it is up.

const FORMS = [
  { id: 'sp3', use: 'Stand tall. Four bonds at 109.5°. Opens tetrahedral seals and strikes sp³ cores.' },
  { id: 'sp2', use: 'Go flat. Three bonds at 120° in a plane. Slips under low tunnels, and runs a little faster.' },
  { id: 'sp', use: 'Go straight. Two bonds at 180°. Space becomes a long straight-line dash across gaps.' },
]

const Icon = {
  blade: <svg viewBox="0 0 40 40"><rect x="18.5" y="4" width="3" height="24" rx="1" fill="#43e6f5" /><rect x="12" y="27" width="16" height="3" rx="1" fill="#8a93a3" /><rect x="18" y="30" width="4" height="7" rx="1" fill="#3a3a3a" /></svg>,
  shield: <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#2c3038" stroke="#8a93a3" strokeWidth="2" /><circle cx="20" cy="20" r="8" fill="none" stroke="#43e6f5" strokeWidth="1.5" /></svg>,
  crystal: <svg viewBox="0 0 40 40"><polygon points="20,3 31,17 20,37 9,17" fill="#43e6f5" opacity=".85" /><polygon points="20,3 31,17 20,20 9,17" fill="#bff6ff" opacity=".8" /></svg>,
  locked: <svg viewBox="0 0 40 40"><polygon points="20,3 31,17 20,37 9,17" fill="none" stroke="#4a4458" strokeWidth="2" strokeDasharray="3 3" /><text x="20" y="25" textAnchor="middle" fill="#5a5468" fontSize="13" fontWeight="700">?</text></svg>,
}

function Items({ s, sel, setSel }) {
  const hasCrystal = s.save.hasCrystal
  const cards = [
    { id: 'blade', name: 'Light Blade', icon: Icon.blade, text: 'Left click for a 3-hit combo. Hold and release for a spin attack. Lock on (right click / Tab) to aim.' },
    { id: 'shield', name: 'Buckler', icon: Icon.shield, text: 'Hold Shift to block attacks from the front. Roll (Space) through shockwaves instead.' },
    hasCrystal
      ? { id: 'crystal', name: 'Hybrid Crystal', icon: Icon.crystal, text: 'Mixes carbon’s 2s and 2p orbitals into hybrids. Pick a form below, or press R in play to cycle sp³ → sp² → sp.' }
      : { id: 'crystal', name: '???', icon: Icon.locked, text: 'Something waits deep in the Orbital Caverns.' },
  ]
  const cur = cards.find((c) => c.id === sel) || cards[0]
  const pickForm = (f) => {
    if (!hasCrystal) return
    sfx('stance')
    setState({ stanceRequest: f })
  }
  const shown = s.stanceRequest || s.stance
  return (
    <div className="im-items">
      <div className="im-grid">
        {cards.map((c) => (
          <button key={c.id} className={'im-card' + (cur.id === c.id ? ' sel' : '')} onClick={() => setSel(c.id)} onMouseEnter={() => setSel(c.id)}>
            <span className="im-ic">{c.icon}</span><span>{c.name}</span>
          </button>
        ))}
      </div>
      <div className="im-detail"><b>{cur.name}</b><p>{cur.text}</p></div>
      {hasCrystal && (
        <div className="im-forms">
          {FORMS.map((f) => (
            <button key={f.id} className={'im-form' + (shown === f.id ? ' on' : '')} onClick={() => pickForm(f.id)}>
              <span className="im-fl">{HYBRIDS[f.id].label}</span>
              <span className="im-fa">{HYBRIDS[f.id].angle}° · {HYBRIDS[f.id].shape}</span>
              <span className="im-fu">{f.use}</span>
            </button>
          ))}
        </div>
      )}
      <div className="im-row">
        <div className="im-box">
          <h4>Bond sockets</h4>
          <div className="im-socks">
            {[0, 1, 2, 3].map((i) => { const sym = s.sockets[i]; return <span key={i} className={'sock ' + (sym ? 'full' : '')} style={sym ? { background: ELEMENTS[sym]?.color, color: sym === 'H' ? '#111' : '#fff' } : null}>{sym || ''}</span> })}
          </div>
          <p className="small">Carbon can hold four bonds — no more, no less.</p>
        </div>
        <div className="im-box">
          <h4>Bond Shards · {s.save.shards} / 12</h4>
          <div className="im-shards">{[...Array(12)].map((_, i) => <i key={i} className={i < s.save.shards ? 'got' : ''} />)}</div>
          <p className="small">One in each sage’s keeping across the kingdom.</p>
        </div>
      </div>
    </div>
  )
}

function Notes({ s }) {
  const open = CODEX.filter((c) => { try { return !!c.unlocked(s.save) } catch { return false } })
  const [i, setI] = useState(0)
  useEffect(() => { if (i >= open.length) setI(Math.max(0, open.length - 1)) }, [open.length])
  if (!open.length) return <div className="im-empty">No notes yet. Solve a puzzle and what it taught will be written here.</div>
  const n = open[Math.min(i, open.length - 1)]
  return (
    <div className="im-notes">
      <ul>
        {CODEX.map((c, k) => {
          const idx = open.indexOf(c)
          return idx < 0
            ? <li key={k} className="lockd">· · ·</li>
            : <li key={k} className={open[i] === c ? 'sel' : ''} onClick={() => setI(idx)}>{c.title}</li>
        })}
      </ul>
      <div className="im-note">
        <h3>{n.title}</h3>
        <p>{n.text}</p>
        <p className="cite-line">{BOOK.author}, <i>{BOOK.title}</i> ({BOOK.publisher}) · §{n.section}, pp. {n.pages}</p>
      </div>
    </div>
  )
}

function Quest({ s }) {
  const world = getActiveWorld()
  const goal = world && world.map && world.map.goal ? world.map.goal() : null
  const solved = s.save.solved
  return (
    <div className="im-quest">
      <div className="im-box"><h4>Now</h4><p className="im-now">{goal ? goal.label : s.objective || 'Explore'}</p><p className="small">Press <span className="key">M</span> for the map — the gold star marks it.</p></div>
      <div className="im-box">
        <h4>Hydrogen Village</h4>
        <ul className="im-steps">
          <li className={s.save.well ? 'done' : ''}>Seal the well with CH₄</li>
          <li className={s.save.wolvesCleared ? 'done' : ''}>Drive off the Radical Wolves</li>
        </ul>
        <h4>The Orbital Caverns · Chapter 1</h4>
        <ul className="im-steps">
          {ROOMS.filter((r) => r.id !== 'entrance').map((r) => <li key={r.id} className={r.exitNeeds.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
          <li className={s.save.shards >= 1 ? 'done' : ''}>Recover Bond Shard 1</li>
        </ul>
      </div>
    </div>
  )
}

export default function ItemMenu({ onTitle, onResume }) {
  const s = useGame()
  const [sel, setSel] = useState('blade')
  if (!s.paused) return null
  const tab = s.menuTab || 'items'
  const resume = () => { setState({ paused: false }); onResume && onResume() }
  const tabs = [['items', 'Items'], ['notes', 'Notes'], ['quest', 'Quest']]
  return (
    <div className="itemmenu" onClick={(e) => { if (e.target === e.currentTarget) resume() }}>
      <div className="im-box-outer">
        <div className="im-side">
          <div className="im-portrait" style={{ backgroundImage: 'url(art/kai.png)' }} />
          <div className="im-name">Kai</div>
          <div className="im-sub">carbon knight · {(s.stanceRequest || s.stance) && HYBRIDS[s.stanceRequest || s.stance].label}</div>
          <div className="im-hp">{[...Array(s.maxHp / 2)].map((_, i) => { const v = Math.max(0, Math.min(2, s.hp - i * 2)); return <span key={i} className={'heart ' + (v === 2 ? 'full' : v === 1 ? 'half' : 'empty')}>♥</span> })}</div>
        </div>
        <div className="im-main">
          <div className="im-tabs">
            {tabs.map(([id, label]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => { sfx('lock'); setState({ menuTab: id }) }}>{label}</button>)}
            <span className="im-paused">Paused</span>
          </div>
          <div className="im-body">
            {tab === 'items' && <Items s={s} sel={sel} setSel={setSel} />}
            {tab === 'notes' && <Notes s={s} />}
            {tab === 'quest' && <Quest s={s} />}
          </div>
          <div className="im-foot">
            <button className="primary" onClick={resume}>Resume <span className="key">Esc</span></button>
            <button onClick={() => setState({ paused: false, mapOpen: true })}>Map <span className="key">M</span></button>
            <button onClick={() => { setState({ paused: false }); onTitle() }}>Back to title</button>
            <span className="small">Progress saves at checkpoints.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
