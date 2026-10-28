import { useMemo, useState } from 'react'
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
    if (Object.keys(next).length === REACTIONS.length) good(setFb, 'All seven on the right trails. Four kinds, and every reaction in the book is one of them.', done, 2400)
  }
  return (
    <div>
      <h2>Hammond's Trail Signs</h2>
      <p className="ins">Every reaction takes one of four trails. Pick up a reaction, then click its trail. <span className="cite">§6.1</span></p>
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
  const pick = (x) => {
    if (!from) {
      if (x !== S.want[0]) return bad(setFb, `An arrow can't start there. ${S.tip}`)
      setFrom(x); setFb({ ok: true, text: 'Electrons from here. Now: where do they go?' }); sfx('pickup'); return
    }
    if (x !== S.want[1]) return bad(setFb, 'They have to go to the electron-poor atom, and the charge must balance at the end.')
    good(setFb, S.ok, () => { setFb(null); setFrom(null); if (i + 1 >= ARROW_STEPS.length) done(); else setI(i + 1) }, 2600)
  }
  return (
    <div>
      <h2>Draw the arrows · {S.step}</h2>
      <p className="ins">{i === 0 ? 'Ethylene meets HBr. The arrow starts at a pair of electrons (the nucleophile) and points to where they go (the electrophile).' : 'Now a carbocation and a bromide ion.'} <span className="cite">§6.4–6.5</span></p>
      <div className="res-opts">{S.from.map((x) => <button key={x} className={from === x ? 'sel' : ''} onClick={() => pick(x)}>{from === x ? '↷ ' : ''}{x}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 6-4 The Ledger of Bonds (§6.7–6.8, Table 6.3): bonds broken on one pan, bonds formed on the other
export function Ledger({ done }) {
  const [i, setI] = useState(0)
  const [broken, setBroken] = useState([])
  const [formed, setFormed] = useState([])
  const [answer, setAnswer] = useState(null)
  const [fb, setFb] = useState(null)
  const L = LEDGER[i]
  const all = Object.keys(BDE)
  const sumB = broken.reduce((s, b) => s + BDE[b], 0), sumF = formed.reduce((s, b) => s + BDE[b], 0)
  const tilt = Math.max(-18, Math.min(18, (sumF - sumB) / 6))
  const toggle = (list, set, b) => set(list.includes(b) ? list.filter((x) => x !== b) : [...list, b])
  const check = () => {
    const okB = L.broken.every((b) => broken.includes(b)) && broken.length === L.broken.length
    const okF = L.formed.every((b) => formed.includes(b)) && formed.length === L.formed.length
    if (!okB) return bad(setFb, 'Bonds broken: the bonds in the reactants that are gone in the products.')
    if (!okF) return bad(setFb, 'Bonds formed: the new bonds in the products.')
    const dH = ledgerH(L)
    if (answer === null) return bad(setFb, 'Now read the scale: does the reaction give off heat, or take it in?')
    if ((answer === 'exo') !== (dH < 0)) return bad(setFb, 'Heat goes in to break bonds and comes out when bonds form. Which pan is heavier?')
    good(setFb, `ΔH = ${sumB} − ${sumF} = ${dH} kJ/mol: exothermic. The products' bonds are stronger.`, () => { setFb(null); setBroken([]); setFormed([]); setAnswer(null); if (i + 1 >= LEDGER.length) done(); else setI(i + 1) }, 3000)
  }
  return (
    <div>
      <h2>The Ledger of Bonds · {L.eq}</h2>
      <p className="ins">Put each bond that breaks on the left pan and each bond that forms on the right (energies from Table 6.3, kJ/mol). Breaking takes energy in; forming gives it out. <span className="cite">§6.8</span></p>
      <div className="ledger">
        <div className="ledger-pan"><b>broken · in</b>{all.map((b) => <button key={b} className={broken.includes(b) ? 'sel' : ''} onClick={() => toggle(broken, setBroken, b)}>{b} {BDE[b]}</button>)}<i>{sumB} kJ/mol</i></div>
        <svg viewBox="-60 -30 120 60" className="ledger-beam"><g transform={`rotate(${tilt})`}><rect x="-50" y="-3" width="100" height="6" fill="#c9a24a" /><circle cx="-46" cy="6" r="6" fill="#8a96b0" /><circle cx="46" cy="6" r="6" fill="#8a96b0" /></g><polygon points="0,4 -6,24 6,24" fill="#5a6070" /></svg>
        <div className="ledger-pan"><b>formed · out</b>{all.map((b) => <button key={b} className={formed.includes(b) ? 'sel' : ''} onClick={() => toggle(formed, setFormed, b)}>{b} {BDE[b]}</button>)}<i>{sumF} kJ/mol</i></div>
      </div>
      <div className="res-opts"><button className={answer === 'exo' ? 'sel' : ''} onClick={() => setAnswer('exo')}>Exothermic (gives off heat)</button><button className={answer === 'endo' ? 'sel' : ''} onClick={() => setAnswer('endo')}>Endothermic (takes it in)</button></div>
      <button className="go" onClick={check}>Close the ledger</button>
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
    if (id === 'a') return good(setFb, 'Right. Ethylene + HBr is downhill (ΔG° −44.8 kJ/mol, Keq about 7 × 10⁷), yet its first step has a barrier near 140: slow at room temperature.', done, 4200)
    if (id === 'b') return bad(setFb, 'The Wyrm sat on routes that ended far downhill and still couldn’t be crossed. What did the faster route have?')
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
