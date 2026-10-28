import { useEffect, useState } from 'react'
import { useGame, setState, getState } from '../engine/store'
import { getActiveWorld } from '../engine/active'
import { ELEMENTS, HYBRIDS } from '../chem/rules'
import { CODEX, BOOK } from '../data/codex'
import { ROOMS } from '../data/dungeon1'
import { ROOMS2 } from '../data/dungeon2'
import { ROOMS3 } from '../data/dungeon3'
import { ROOMS4 } from '../data/dungeon4'
import { ROOMS5 } from '../data/dungeon5'
import { ROOMS6 } from '../data/dungeon6'
import { ROOMS7 } from '../data/dungeon7'
import { ROOMS8 } from '../data/dungeon8'
import { ROOMS9 } from '../data/dungeon9'
import { ROOMS10 } from '../data/dungeon10'
import { ROOMS11 } from '../data/dungeon11'
import { ROOMS12 } from '../data/dungeon12'
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
  shield: <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#c8d0e0" stroke="#7a8090" strokeWidth="2" /><circle cx="20" cy="20" r="10" fill="#e8f0fa" /><circle cx="20" cy="5" r="2" fill="#ff5a6a" /><circle cx="35" cy="20" r="1.8" fill="#5aa0ff" /><circle cx="20" cy="35" r="1.6" fill="#ffd04a" /><circle cx="5" cy="20" r="1.4" fill="#3a3a4a" /></svg>,
  boots: <svg viewBox="0 0 40 40"><path d="M12 6 h10 v18 l10 4 v6 h-22 z" fill="#8a5a3a" stroke="#3a2418" strokeWidth="1.5" /><path d="M12 30 h20" stroke="#ffb04a" strokeWidth="2" /><path d="M14 12 h6 M14 17 h6" stroke="#ffb04a" strokeWidth="1.5" /></svg>,
  sling: <svg viewBox="0 0 40 40"><path d="M20 36 V22 M20 22 L12 8 M20 22 L28 8" stroke="#7a5030" strokeWidth="3.5" fill="none" strokeLinecap="round" /><path d="M12 8 Q20 18 28 8" stroke="#6a3e22" strokeWidth="1.5" fill="none" /><circle cx="20" cy="13" r="3" fill="#ff8aa0" /></svg>,
  satchel: <svg viewBox="0 0 40 40"><rect x="8" y="16" width="24" height="18" rx="4" fill="#2a2428" /><rect x="8" y="14" width="24" height="7" rx="2" fill="#3a3238" /><rect x="12" y="6" width="3" height="10" fill="#4ac8e8" /><rect x="18" y="5" width="3" height="11" fill="#e84a4a" /><rect x="24" y="7" width="3" height="9" fill="#a04ae8" /><rect x="18" y="19" width="4" height="4" fill="#c8a050" /></svg>,
  retro: <svg viewBox="0 0 40 40"><rect x="8" y="6" width="24" height="28" rx="2" fill="#e8d8b0" /><path d="M20 10 V16 M20 16 L14 22 M20 16 L26 22 M14 22 L12 29 M14 22 L17 29 M26 22 L23 29 M26 22 L28 29" stroke="#6a4a2a" strokeWidth="1.4" fill="none" /><circle cx="20" cy="10" r="2" fill="#5ff0ff" /></svg>,
  ring: <svg viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="12" ry="14" fill="none" stroke="#dcdce8" strokeWidth="5" /><path d="M9 12 L13 8 L15 14 Z" fill="#3aff8a" /><circle cx="32" cy="21" r="2.4" fill="#ff5a2a" /></svg>,
  umbrella: <svg viewBox="0 0 40 40"><path d="M8 10 L20 22 L32 10 Q26 16 20 14 Q14 16 8 10 Z" fill="#b82a2a" /><path d="M20 14 V34 Q20 37 17 37" stroke="#6a4428" strokeWidth="2.2" fill="none" /></svg>,
  lens: <svg viewBox="0 0 40 40"><polygon points="8,30 18,8 24,30" fill="#bff4ff" stroke="#5ae8ff" /><circle cx="28" cy="24" r="6" fill="#c82a2a" stroke="#c8a050" strokeWidth="2" /><path d="M24 18 Q32 10 36 16" stroke="#ffe04a" strokeWidth="1.5" fill="none" /></svg>,
  gauntlet: <svg viewBox="0 0 40 40"><rect x="13" y="22" width="14" height="14" rx="2" fill="#4a4a5a" /><rect x="12" y="10" width="16" height="14" rx="3" fill="#5a5a6a" />{[13, 17, 21, 25].map((x) => <rect key={x} x={x} y="3" width="3" height="9" rx="1.4" fill="#5a5a6a" />)}<circle cx="20" cy="17" r="5" fill="none" stroke="#2fd8f0" strokeWidth="1.6" /><path d="M17 18 l2-3 h2 l2 3 l-2 2 h-2 z" fill="none" stroke="#2fd8f0" strokeWidth="1" /></svg>,
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
    s.save.hasGauntlet
      ? { id: 'gauntlet', name: 'Ring-Flip Gauntlet', icon: Icon.gauntlet, text: 'Press G aimed at a chair ring (a throne floor, a banquet table, an ogre’s seal, the arena) to ring-flip it: every axial seat becomes equatorial and every equatorial axial; nothing changes face (§4.6).' }
      : s.save.shards >= 3 ? { id: 'gauntlet', name: '???', icon: Icon.locked, text: 'Something waits in the Chair Fortress.' } : null,
    s.save.hasShield
      ? { id: 'shield', name: 'Mirror Shield', icon: Icon.shield, text: 'Press G aimed at a chirality centre (a lock, a statue’s centre) to reflect it: its mirror image takes its place, R ↔ S. Aimed at an Enantiomer Shade, it breaks the reflection for a moment (§5.1, 5.5).' }
      : s.save.shards >= 4 ? { id: 'shield', name: '???', icon: Icon.locked, text: 'Something waits in the Mirror Palace.' } : null,
    s.save.hasBoots
      ? { id: 'boots', name: 'Activation Boots', icon: Icon.boots, text: `They hold energy: ${s.save.t6meter || 0} kJ/mol now. A heat vent charges them. On an energy-diagram floor, a pass higher than your boots is sealed by frost: the highest pass on a route sets how fast you get across (§6.9–6.10). (A picture: molecules don’t wear boots.)` }
      : s.save.shards >= 5 ? { id: 'boots', name: '???', icon: Icon.locked, text: 'Something waits in the Pass Caves.' } : null,
    s.save.hasSling
      ? { id: 'sling', name: 'Proton Sling', icon: Icon.sling, text: 'Press G aimed at a carbon of a double bond: an H⁺ lands there, and the + ends up on the other carbon. Only the more stable carbocation forms, so aim at the carbon that already has more H (Markovnikov, §7.8).' }
      : s.save.shards >= 6 ? { id: 'sling', name: '???', icon: Icon.locked, text: 'Something waits in the Tower of Addition.' } : null,
    s.save.hasSatchel
      ? { id: 'satchel', name: 'Reagent Satchel', icon: Icon.satchel, text: 'Carries one flask from a grove tree (E). Press G at an alkene altar to pour it. Every reagent makes something; each door wants one product (§8.2–8.9).' }
      : s.save.shards >= 7 ? { id: 'satchel', name: '???', icon: Icon.locked, text: 'Something waits in Borana’s Glasshouse.' } : null,
    s.save.hasRetro
      ? { id: 'retro', name: 'Retrosynthesis Map', icon: Icon.retro, text: 'At a planning table, it starts from the product and asks what came just before it, step by step back to what you have (§9.9).' }
      : s.save.shards >= 8 ? { id: 'retro', name: '???', icon: Icon.locked, text: 'Something waits in the Triple Spire.' } : null,
    s.save.hasRing
      ? { id: 'ring', name: 'Magnesium Ring', icon: Icon.ring, text: 'Press G at a carbon–halogen bond: Mg inserts, R–X becomes R–MgX, and the carbon turns δ−, a strong base. Water destroys it (§10.6).' }
      : s.save.shards >= 9 ? { id: 'ring', name: '???', icon: Icon.locked, text: 'Something waits in the Sunken Forge.' } : null,
    s.save.hasUmbrella
      ? { id: 'umbrella', name: 'Inversion Umbrella', icon: Icon.umbrella, text: 'Press G at a chirality centre from the side opposite its leaving group: a backside attack, and the centre inverts like an umbrella in the wind (SN2, §11.2).' }
      : s.save.shards >= 10 ? { id: 'umbrella', name: '???', icon: Icon.locked, text: 'Something waits under the Coliseum.' } : null,
    s.save.hasLens
      ? { id: 'lens', name: 'Spectra Lens', icon: Icon.lens, text: 'Press G at a molecule to see its infrared spectrum: where it absorbs. Each kind of bond rings at its own wavenumber (Table 12.1).' }
      : s.save.shards >= 11 ? { id: 'lens', name: '???', icon: Icon.locked, text: 'Something waits in the Observatory.' } : null,
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
      {s.screen === 'observatory' && (
        <div className="im-box im-dungeon">
          <h4>The Observatory</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t12-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t12-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t12key ? 'got' : ''}>🗝 Small Key ×{s.save.t12key ? 1 : 0}</span>
            <span className={s.save.t12bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'coliseum' && (
        <div className="im-box im-dungeon">
          <h4>The Under-Halls</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t11-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t11-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t11key ? 'got' : ''}>🗝 Small Key ×{s.save.t11key ? 1 : 0}</span>
            <span className={s.save.t11bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'sunken' && (
        <div className="im-box im-dungeon">
          <h4>The Sunken Forge</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t10-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t10-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t10key ? 'got' : ''}>🗝 Small Key ×{s.save.t10key ? 1 : 0}</span>
            <span className={s.save.t10bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'spire' && (
        <div className="im-box im-dungeon">
          <h4>The Triple Spire</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t9-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t9-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t9key ? 'got' : ''}>🗝 Small Key ×{s.save.t9key ? 1 : 0}</span>
            <span className={s.save.t9bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'glasshouse' && (
        <div className="im-box im-dungeon">
          <h4>Borana’s Glasshouse</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t8-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t8-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t8key ? 'got' : ''}>🗝 Small Key ×{s.save.t8key ? 1 : 0}</span>
            <span className={s.save.t8bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'tower' && (
        <div className="im-box im-dungeon">
          <h4>Tower of Addition</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t7-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t7-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t7key ? 'got' : ''}>🗝 Small Key ×{s.save.t7key ? 1 : 0}</span>
            <span className={s.save.t7bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'caves' && (
        <div className="im-box im-dungeon">
          <h4>Pass Caves</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t6-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t6-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t6key ? 'got' : ''}>🗝 Small Key ×{s.save.t6key ? 1 : 0}</span>
            <span className={s.save.t6bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'palace' && (
        <div className="im-box im-dungeon">
          <h4>Mirror Palace</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t5-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t5-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t5key ? 'got' : ''}>🗝 Small Key ×{s.save.t5key ? 1 : 0}</span>
            <span className={s.save.t5bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
        </div>
      )}
      {s.screen === 'fortress' && (
        <div className="im-box im-dungeon">
          <h4>Chair Fortress</h4>
          <div className="im-ditems">
            <span className={s.save.solved['t4-map'] ? 'got' : ''}>🗺 Dungeon Map</span>
            <span className={s.save.solved['t4-compass'] ? 'got' : ''}>🧭 Compass</span>
            <span className={s.save.t4key ? 'got' : ''}>🗝 Small Key ×{s.save.t4key ? 1 : 0}</span>
            <span className={s.save.t4bossKey ? 'got' : ''}>🔑 Boss Key</span>
          </div>
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
        {s.save.shards >= 3 && (<>
          <h4>The Chair Fortress · Chapter 4</h4>
          <ul className="im-steps">
            <li className={s.save.hillsSeen ? 'done' : ''}>Take the east road to the Chair Hills</li>
            <li className={s.save.t4rings ? 'done' : ''}>Name Lady Sachse's banner rings <span className="sec"> §4.1</span></li>
            {ROOMS4.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 4 ? 'done' : ''}>Recover Bond Shard 4</li>
          </ul>
        </>)}
        {s.save.shards >= 4 && (<>
          <h4>The Mirror Palace · Chapter 5</h4>
          <ul className="im-steps">
            <li className={s.save.lakeSeen ? 'done' : ''}>Take the east road to the Mirror Lake</li>
            <li className={s.save.t5crystals ? 'done' : ''}>Sort Sister Tartara’s crystals <span className="sec"> §5.4</span></li>
            {ROOMS5.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 5 ? 'done' : ''}>Recover Bond Shard 5</li>
          </ul>
        </>)}
        {s.save.shards >= 5 && (<>
          <h4>The Activation Peaks · Chapter 6</h4>
          <ul className="im-steps">
            <li className={s.save.peaksSeen ? 'done' : ''}>Take the east road to the Activation Peaks</li>
            <li className={s.save.t6signs ? 'done' : ''}>Sort Hammond’s trail signs <span className="sec"> §6.1</span></li>
            {ROOMS6.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 6 ? 'done' : ''}>Recover Bond Shard 6</li>
          </ul>
        </>)}
        {s.save.shards >= 6 && (<>
          <h4>The Tower of Addition · Chapter 7</h4>
          <ul className="im-steps">
            <li className={s.save.plainsSeen ? 'done' : ''}>Take the east road to the Plains of Addition</li>
            <li className={s.save.t7seeds ? 'done' : ''}>Label Markov’s seed sacks <span className="sec"> §7.3</span></li>
            {ROOMS7.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 7 ? 'done' : ''}>Recover Bond Shard 7</li>
          </ul>
        </>)}
        {s.save.shards >= 7 && (<>
          <h4>The Reagent Orchards · Chapter 8</h4>
          <ul className="im-steps">
            <li className={s.save.orchardSeen ? 'done' : ''}>Take the south road to the Reagent Orchards</li>
            <li className={s.save.t8board ? 'done' : ''}>Fill in Borana’s recipe board <span className="sec"> §8.2–8.9</span></li>
            {ROOMS8.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 8 ? 'done' : ''}>Recover Bond Shard 8</li>
          </ul>
        </>)}
        {s.save.shards >= 8 && (<>
          <h4>The Triple Spire · Chapter 9</h4>
          <ul className="im-steps">
            <li className={s.save.cliffsSeen ? 'done' : ''}>Take the east road to the Thunder Cliffs</li>
            <li className={s.save.t9cairns ? 'done' : ''}>Name Lindlar’s cairns <span className="sec"> §9.1</span></li>
            {ROOMS9.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 9 ? 'done' : ''}>Recover Bond Shard 9</li>
          </ul>
        </>)}
        {s.save.shards >= 9 && (<>
          <h4>The Halogen Marsh · Chapter 10</h4>
          <ul className="im-steps">
            <li className={s.save.marshSeen ? 'done' : ''}>Take the east road to the Halogen Marsh</li>
            <li className={s.save.t10markers ? 'done' : ''}>Name Magnus’s markers <span className="sec"> §10.1</span></li>
            {ROOMS10.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 10 ? 'done' : ''}>Recover Bond Shard 10</li>
          </ul>
        </>)}
        {s.save.shards >= 10 && (<>
          <h4>The Arena of Five · Chapter 11</h4>
          <ul className="im-steps">
            <li className={s.save.wastesSeen ? 'done' : ''}>Take the east road to the Volcanic Wastes</li>
            <li className={s.save.t11cycle ? 'done' : ''}>Solve Walden’s cycle <span className="sec"> §11.1</span></li>
            {ROOMS11.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 11 ? 'done' : ''}>Recover Bond Shard 11</li>
          </ul>
        </>)}
        {s.save.shards >= 11 && (<>
          <h4>The Observatory of Light · Chapter 12</h4>
          <ul className="im-steps">
            <li className={s.save.summitSeen ? 'done' : ''}>Take the east road to the Summit of Light</li>
            <li className={s.save.t12scope ? 'done' : ''}>Set Spectra’s telescope <span className="sec"> §12.5</span></li>
            {ROOMS12.map((r) => <li key={r.id} className={r.needs.every((id) => solved[id]) ? 'done' : ''}>{r.title}{r.sections.length ? <span className="sec"> §{r.sections[0]}{r.sections.length > 1 ? '–' + r.sections[r.sections.length - 1] : ''}</span> : null}</li>)}
            <li className={s.save.shards >= 12 ? 'done' : ''}>Recover Bond Shard 12</li>
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
  const tabs = [['items', 'Items'], ['gauntlet', 'Album'], ['notes', 'Notes'], ['quest', 'Quest']]
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
