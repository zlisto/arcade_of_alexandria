import { useEffect, useState } from 'react'
import { useGame, setState, getState } from '../engine/store'
import { getActiveWorld } from '../engine/active'
import { ELEMENTS, HYBRIDS } from '../chem/rules'
import { CODEX, BOOK } from '../data/codex'
import { ROOMS } from '../data/dungeon1'
import { ROOMS2 } from '../data/dungeon2'
import { ROOMS3 } from '../data/dungeon3'
import { sfx } from '../audio/sfx'
import { MOLECULES } from '../data/molecules'
import MoleculeView from './MoleculeView'

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
  hookshot: <svg viewBox="0 0 40 40"><path d="M7 32 C 10 12, 26 8, 32 9" fill="none" stroke="#4aa8ff" strokeWidth="3" strokeLinecap="round" /><polygon points="33,4 37,12 28,11" fill="#cfe6ff" /><circle cx="7" cy="32" r="3.5" fill="#ffd760" /><circle cx="12" cy="31" r="3.5" fill="#ffd760" /></svg>,
  lantern: <svg viewBox="0 0 40 40"><rect x="15" y="4" width="10" height="4" rx="1" fill="#b8904a" /><circle cx="20" cy="21" r="13" fill="#b8904a" /><circle cx="20" cy="21" r="9" fill="#ffd8a0" /><g stroke="#2fd8f0" strokeWidth="1.6"><line x1="20" y1="21" x2="20" y2="13" /><line x1="20" y1="21" x2="13" y2="25" /><line x1="20" y1="21" x2="27" y2="25" /></g><circle cx="20" cy="21" r="5" fill="none" stroke="#2fd8f0" strokeWidth="1.2" /></svg>,
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
    s.save.hasHookshot
      ? { id: 'hookshot', name: 'Curved-Arrow Hookshot', icon: Icon.hookshot, text: 'Press Q. Like a curved arrow in a mechanism, it flies from your electron pair to an electron-poor target (a blue ring) and pulls you there. Lewis bases give pairs; Lewis acids take them (§2.11).' }
      : s.save.shards >= 1 ? { id: 'hookshot', name: '???', icon: Icon.locked, text: 'Something waits in the Tide Temple.' } : null,
    s.save.hasLantern
      ? { id: 'lantern', name: 'Newman Lantern', icon: Icon.lantern, text: 'Press G facing a bond — a round door, a bat roost, a serpent\'s knot — to see it end-on as a Newman projection and turn the back carbon 60°. The dial shows the strain in kJ/mol (§3.6–3.7).' }
      : s.save.shards >= 2 ? { id: 'lantern', name: '???', icon: Icon.locked, text: 'Something waits in the Chain Labyrinth.' } : null,
  ].filter(Boolean)
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
      {s.screen === 'labyrinth' && (
        <div className="im-box im-dungeon">
          <h4>Chain Labyrinth</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t3-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t3-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t3key ? 'got' : ''}>🗝 Small Key ×{s.save.t3key ? 1 : 0}</span>
            <span className={s.save.t3bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'temple' && (
        <div className="im-box im-dungeon">
          <h4>Tide Temple</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t2-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t2-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t2key ? 'got' : ''}>🗝 Small Key ×{s.save.t2key ? 1 : 0}</span>
            <span className={s.save.t2bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
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

function Gauntlet({ s }) {
  // every molecule Kai has met, logged on his gauntlet
  const got = MOLECULES.filter((m) => { try { return !!m.unlocked(s.save) } catch { return false } })
  const [id, setId] = useState(null)
  const m = got.find((x) => x.id === id) || got[got.length - 1]
  if (!got.length) return <div className="im-empty">No molecules logged yet. Each one you meet is recorded here.</div>
  return (
    <div className="im-gauntlet">
      <div className="mg-list">
        <p className="small">{got.length} of {MOLECULES.length} logged</p>
        {MOLECULES.map((x) => {
          const have = got.includes(x)
          return have
            ? <button key={x.id} className={'mg-item' + (x === m ? ' sel' : '')} onClick={() => setId(x.id)}><b>{x.formula}</b><span>{x.name}</span></button>
            : <div key={x.id} className="mg-item locked"><b>?</b><span>not met yet</span></div>
        })}
      </div>
      <div className="mg-detail">
        <div className="mg-top">
          <MoleculeView key={m.id} geo={m.geo} size={210} />
          <div>
            <h3>{m.name} <span className="mg-formula">{m.formula}</span></h3>
            <dl>
              <dt>Shape</dt><dd>{m.shape}</dd>
              <dt>Hybridization</dt><dd>{m.hybrid}</dd>
              <dt>Bond angles</dt><dd>{m.angles}</dd>
              <dt>Met</dt><dd>{m.met}</dd>
            </dl>
          </div>
        </div>
        <p className="mg-fact">{m.fact}</p>
        <p className="mg-use"><span className="mg-beyond">Beyond the book</span> {m.use}</p>
        <p className="cite-line">{BOOK.author}, <i>{BOOK.title}</i> ({BOOK.publisher}) · §{m.section}, pp. {m.pages} · drag the model to turn it</p>
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
        {s.save.shards >= 1 && (<>
          <h4>The Tide Temple · Chapter 2</h4>
          <ul className="im-steps">
            <li className={s.save.fieldSeen ? 'done' : ''}>Take the east road across the Valence Fields</li>
            <li className={s.save.lighthouseLit ? 'done' : ''}>Light the Tide Lighthouse <span className="sec"> §2.1</span></li>
            {ROOMS2.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 2 ? 'done' : ''}>Recover Bond Shard 2</li>
          </ul>
        </>)}
        {s.save.shards >= 2 && (<>
          <h4>The Chain Labyrinth · Chapter 3</h4>
          <ul className="im-steps">
            <li className={s.save.forestSeen ? 'done' : ''}>Take the forest road to the Chain Forest</li>
            <li className={s.save.t3shelf ? 'done' : ''}>Shelve the first ten alkanes for Iupaca <span className="sec"> §3.2</span></li>
            {ROOMS3.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 3 ? 'done' : ''}>Recover Bond Shard 3</li>
          </ul>
        </>)}
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
  const tabs = [['items', 'Items'], ['gauntlet', 'Gauntlet'], ['notes', 'Notes'], ['quest', 'Quest']]
  return (
    <div className="itemmenu" onClick={(e) => { if (e.target === e.currentTarget) resume() }}>
      <div className="im-box-outer">
        <div className="im-side">
          <div className="im-portrait" style={{ backgroundImage: 'url(art/portraits/kai.jpg)' }} />
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
            {tab === 'gauntlet' && <Gauntlet s={s} />}
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
