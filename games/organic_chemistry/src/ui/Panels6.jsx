import { useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { KINDS, KIND_RULE, REACTIONS, ARROW_STEPS, BDE, LEDGER, ledgerH } from '../chem/rules6'

// Trial panels for World 6, the Activation Peaks (book Chapter 6). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

// ---------- Prep: Hammond's trail signs — the four kinds of reaction (§6.1)
export function TrailSigns({ done }) {
  const order = useMemo(() => [3, 0, 5, 2, 6, 1, 4].map((i) => REACTIONS[i]), [])
  const [placed, setPlaced] = useState({})
  const [held, setHeld] = useState(null)
  const [fb, setFb] = useState(null)
  const drop = (kind) => {
    if (!held) return
    const r = REACTIONS.find((x) => x.id === held)
    if (r.kind !== kind) return bad(setFb, `Not ${kind}: ${kind} means ${KIND_RULE[kind]}. Count the reactants and the products.`)
    const next = { ...placed, [held]: kind }
    setPlaced(next); setHeld(null); setFb(null); sfx('pickup')
    if (Object.keys(next).length === REACTIONS.length) good(setFb, 'All seven on the right trails. Four kinds: the book sorts reactions this way.', done, 3500)
  }
  return (
    <div>
      <h2>Hammond's Trail Signs</h2>
      <p className="ins">The book sorts reactions into four general types. Pick up a reaction, then click its trail. <span className="cite">§6.1</span></p>
      <div className="rx-list">{order.filter((r) => !placed[r.id]).map((r) => <button key={r.id} className={'rx' + (held === r.id ? ' sel' : '')} onClick={() => { setHeld(r.id); setFb(null) }}>{r.eq}</button>)}</div>
      <div className="rx-trails">{KINDS.map((k) => <button key={k} className="rx-trail" onClick={() => drop(k)}><b>{k}</b><span>{REACTIONS.filter((r) => placed[r.id] === k).map((r) => <i key={r.id}>{r.eq}</i>)}</span></button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 6-2 Curved arrows for HBr + ethylene (§6.4–6.5): pick where the electrons come from, then where they go
export function Arrows({ done }) {
  const [i, setI] = useState(0)
  const [from, setFrom] = useState(null)
  const [fb, setFb] = useState(null)
  const S = ARROW_STEPS[i]
  const [drawn, setDrawn] = useState(null)
  const pick = (x) => {
    if (!from) {
      if (x !== S.want[0]) return bad(setFb, `An arrow can't start there. ${S.tip}`)
      setFrom(x); setFb({ ok: true, text: 'Electrons from here. Now: where do they go?' }); sfx('pickup'); return
    }
    if (x !== S.want[1]) return bad(setFb, 'They have to go to the electron-poor atom, and the charge must balance at the end.')
    setDrawn([from, x])
    good(setFb, S.ok, () => { setFb(null); setFrom(null); setDrawn(null); if (i + 1 >= ARROW_STEPS.length) done(); else setI(i + 1) }, 4500)
  }
  return (
    <div>
      <h2>Draw the arrows · {S.step}</h2>
      <p className="ins">{i === 0 ? 'Ethylene meets HBr. The arrow starts at a pair of electrons (the nucleophile) and points to where they go (the electrophile).' : 'Now a carbocation and a bromide ion.'} <span className="cite">§6.4–6.5</span></p>
      <ArrowScene step={i} from={from} drawn={drawn} pick={pick} />
      <div className="res-opts">{S.from.map((x) => <button key={x} className={from === x ? 'sel' : ''} onClick={() => pick(x)}>{from === x ? '↷ ' : ''}{x}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// the two steps of HBr + ethylene, drawn: each pickable spot is a hotspot on the drawing
const SPOTS = [
  { 'π bond (C=C)': [80, 52], 'C–H bond': [30, 30], 'H of HBr': [190, 60], 'Br of HBr': [240, 60] },
  { 'the CH₂ carbon': [110, 60], 'C–H bond': [50, 60], 'Br⁻': [220, 60], 'π bond (C=C)': [80, 92] },
]
function ArrowScene({ step, from, drawn, pick }) {
  const sp = SPOTS[step]
  const at = (k) => sp[k] || [0, 0]
  const T = (x, y, t, c = '#e8ecf4', s = 15) => <text x={x} y={y} fill={c} fontSize={s} textAnchor="middle" fontFamily="sans-serif">{t}</text>
  return (
    <svg viewBox="0 0 280 110" className="arrow-scene" style={{ width: '100%', maxWidth: 460, display: 'block', margin: '6px auto', background: '#141a28', borderRadius: 8 }}>
      {step === 0 ? <>
        {T(30, 22, 'H', '#ccc', 11)}{T(30, 98, 'H', '#ccc', 11)}{T(130, 22, 'H', '#ccc', 11)}{T(130, 98, 'H', '#ccc', 11)}
        {T(55, 66, 'C')}{T(105, 66, 'C')}
        <line x1="64" y1="56" x2="96" y2="56" stroke="#e8ecf4" strokeWidth="2" /><line x1="64" y1="64" x2="96" y2="64" stroke="#7ab0ff" strokeWidth="2" />
        <line x1="36" y1="28" x2="50" y2="52" stroke="#aaa" /><line x1="36" y1="90" x2="50" y2="70" stroke="#aaa" /><line x1="124" y1="28" x2="110" y2="52" stroke="#aaa" /><line x1="124" y1="90" x2="110" y2="70" stroke="#aaa" />
        {T(190, 66, 'H')}{T(240, 66, 'Br', '#ff8a6a')}<line x1="198" y1="61" x2="228" y2="61" stroke="#e8ecf4" strokeWidth="2" />
      </> : <>
        {T(55, 66, 'H₃C')}{T(110, 66, 'CH₂')}{T(128, 50, '+', '#ffcf6a', 16)}<line x1="74" y1="61" x2="94" y2="61" stroke="#e8ecf4" strokeWidth="2" />
        {T(220, 66, 'Br', '#ff8a6a')}{T(240, 50, '−', '#7ab0ff', 18)}
        {[[205, 52], [205, 58], [235, 52], [235, 58], [216, 44], [224, 44], [216, 72], [224, 72]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="1.8" fill="#fff" />)}
        {T(80, 96, 'no π bond now', '#667', 9)}
      </>}
      {Object.entries(sp).map(([k, [x, y]]) => <circle key={k} cx={x} cy={y} r={11} fill={from === k ? 'rgba(255,207,106,0.35)' : 'rgba(255,255,255,0.04)'} stroke={from === k ? '#ffcf6a' : 'rgba(255,255,255,0.15)'} style={{ cursor: 'pointer' }} onClick={() => pick(k)}><title>{k}</title></circle>)}
      {drawn && (() => { const [a, b] = [at(drawn[0]), at(drawn[1])]; const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 40; return <g><path d={`M${a[0]},${a[1] - 8} Q${mx},${my} ${b[0]},${b[1] - 12}`} fill="none" stroke="#ffcf6a" strokeWidth="2.5" markerEnd="url(#ah)" /><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ffcf6a" /></marker></defs></g> })()}
    </svg>
  )
}

// ---------- 6-4 The Ledger of Bonds (§6.7–6.8, Table 6.3): bonds broken on one pan, bonds formed on the other
export function Ledger({ done }) {
  const [i, setI] = useState(0)
  const [broken, setBroken] = useState([])
  const [formed, setFormed] = useState([])
  const [stage, setStage] = useState('bonds') // bonds → dh → (after the last case) keq
  const [fb, setFb] = useState(null)
  const miss = useRef(0)
  const L = LEDGER[Math.min(i, LEDGER.length - 1)]
  const all = Object.keys(BDE)
  const sumB = broken.reduce((s, b) => s + BDE[b], 0), sumF = formed.reduce((s, b) => s + BDE[b], 0)
  const dH = ledgerH(L)
  const opts = [...new Set([dH, dH + BDE[L.formed[1]], dH - BDE[L.broken[0]], dH + BDE[L.formed[0]] - BDE[L.broken[1]]])].sort((x, y) => ((x * 7919) % 13) - ((y * 7919) % 13)) // right; a formed bond left off; a broken bond left off; mis-paired bonds
  const tilt = stage === 'dh' && fb && fb.ok ? Math.max(-18, Math.min(18, (sumF - sumB) / 6)) : 0
  const toggle = (list, set, b) => { if (stage !== 'bonds') return; set(list.includes(b) ? list.filter((x) => x !== b) : [...list, b]) }
  const checkBonds = () => {
    const okB = L.broken.every((b) => broken.includes(b)) && broken.length === L.broken.length
    const okF = L.formed.every((b) => formed.includes(b)) && formed.length === L.formed.length
    if (!okB) return bad(setFb, 'Bonds broken: the bonds in the reactants that are gone in the products.')
    if (!okF) return bad(setFb, 'Bonds formed: the new bonds in the products.')
    sfx('pickup'); setFb(null); setStage('dh')
  }
  const pickDH = (v) => {
    if (v !== dH) {
      miss.current += 1
      if (miss.current >= 1) { miss.current = 0; setBroken([]); setFormed([]); setStage('bonds'); return bad(setFb, 'The pans tip out. ΔH = (energy of bonds broken) − (energy of bonds formed). Add each pan yourself.') }
      return bad(setFb, 'Add each pan from the numbers on its bonds: ΔH = broken − formed. One more try.')
    }
    miss.current = 0
    const exo = dH < 0
    good(setFb, `ΔH = ${sumB} − ${sumF} = ${dH > 0 ? '+' : '−'}${Math.abs(dH)} kJ/mol: ${exo ? 'exothermic. The new bonds are stronger, so heat comes out.' : 'endothermic! The bonds broken are stronger than those formed, so heat goes in.'}`, () => {
      setFb(null); setBroken([]); setFormed([])
      if (i + 1 >= LEDGER.length) { setStage('keq'); setI(i + 1) } else { setStage('bonds'); setI(i + 1) }
    }, 3400)
  }
  const pickKeq = (id) => {
    if (id === 'a') return good(setFb, 'Yes. A large Keq means a negative ΔG°: products favoured (ΔG° = −RT ln Keq, −44.8 kJ/mol here). How fast? Keq can’t say.', done, 6500)
    if (id === 'b') return bad(setFb, 'Keq above 1 favours products. ΔG° = −RT ln Keq: what is ln of a big number?')
    bad(setFb, 'Keq tells how far, not how fast. Speed is the barrier, ΔG‡.')
  }
  if (stage === 'keq') {
    return (
      <div>
        <h2>The Ledger's last page</h2>
        <p className="ins">Ethylene + HBr → bromoethane has Keq = 7.1 × 10⁷ at room temperature. What does that tell you? <span className="cite">§6.7, p. 185–187</span></p>
        <div className="res-opts">
          <button onClick={() => pickKeq('c')}>ΔG° is negative, so the reaction is fast.</button>
          <button onClick={() => pickKeq('b')}>ΔG° is positive: reactants favoured.</button>
          <button onClick={() => pickKeq('a')}>ΔG° is negative: products favoured. It says nothing about speed.</button>
        </div>
        <Feedback fb={fb} />
      </div>
    )
  }
  return (
    <div>
      <h2>The Ledger of Bonds <span className="small">({i + 1}/{LEDGER.length})</span></h2>
      <p className="formula">{L.eq}</p>
      <p className="ins">{stage === 'bonds' ? 'Put each bond that breaks on the left pan and each bond that forms on the right (energies from Table 6.3, kJ/mol).' : 'Now add each pan and work out ΔH = broken − formed.'} Breaking takes energy in; forming gives it out. <span className="cite">§6.8</span></p>
      <div className="ledger">
        <div className="ledger-pan"><b>broken · in</b>{all.map((b) => <button key={b} className={broken.includes(b) ? 'sel' : ''} onClick={() => toggle(broken, setBroken, b)}>{b} {BDE[b]}</button>)}</div>
        <svg viewBox="-60 -30 120 60" className="ledger-beam"><g transform={`rotate(${tilt})`}><rect x="-50" y="-3" width="100" height="6" fill="#c9a24a" /><circle cx="-46" cy="6" r="6" fill="#8a96b0" /><circle cx="46" cy="6" r="6" fill="#8a96b0" /></g><polygon points="0,4 -6,24 6,24" fill="#5a6070" /></svg>
        <div className="ledger-pan"><b>formed · out</b>{all.map((b) => <button key={b} className={formed.includes(b) ? 'sel' : ''} onClick={() => toggle(formed, setFormed, b)}>{b} {BDE[b]}</button>)}</div>
      </div>
      {stage === 'bonds' && <button className="go" onClick={checkBonds}>Weigh the pans</button>}
      {stage === 'dh' && <div className="res-opts">{opts.map((v) => <button key={v} onClick={() => pickDH(v)}>ΔH = {v > 0 ? '+' : '−'}{Math.abs(v)} kJ/mol</button>)}</div>}
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Hammond's question (§6.7, 6.9)
const WQ = [
  ['a', 'No. ΔG° says how far downhill the products are, not how fast. The rate depends on the barrier, ΔG‡.'],
  ['b', 'Yes. The more energy a reaction gives off, the faster it goes.'],
  ['c', 'Yes, if its Keq is large enough.'],
]
export function WyrmCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. Downhill by 44.8, yet its first barrier is near 140: slow at room temperature.', done, 4200)
    if (id === 'b') return bad(setFb, 'The Wyrm guarded routes that sometimes ended further downhill, and they were still the slow way. What did the faster route have?')
    bad(setFb, 'Keq says how much product there is at equilibrium. It says nothing about how long it takes to get there.')
  }
  return (
    <div>
      <h2>Hammond's Question</h2>
      <p className="ins">Malradix decreed that a reaction that gives off energy must happen instantly. Does it? <span className="cite">§6.7, 6.9</span></p>
      <div className="res-opts">{WQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
