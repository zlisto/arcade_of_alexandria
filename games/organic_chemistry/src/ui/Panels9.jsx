import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { CAIRNS, BASES, ALKYNE_PKA, baseWorks, ROUTES } from '../chem/rules9'

// Trial panels for World 9, the Triple Spire (book Chapter 9). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

// ---------- Prep: Lindlar's cairns — naming alkynes (§9.1)
export function Cairns({ done }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const C = CAIRNS[i]
  const pick = (id) => {
    if (id !== C.right) return bad(setFb, C.why[id])
    good(setFb, i + 1 < CAIRNS.length ? 'Carved right.' : 'Three cairns named. Lowest number to the multiple bond; on a tie, the double bond wins.', () => { setFb(null); if (i + 1 >= CAIRNS.length) done(); else setI(i + 1) }, 1800)
  }
  return (
    <div>
      <h2>Lindlar’s Cairns · {i + 1} / {CAIRNS.length}</h2>
      <p className="ins">Name the alkyne carved on the cairn. Suffix -yne; number from the end nearer the triple bond. <span className="cite">§9.1</span></p>
      <div className="formula-big">{C.formula}</div>
      <div className="res-opts">{C.opts.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 9-4: the pKa ladder (§9.7)
export function PkaLadder({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (b) => {
    if (baseWorks(b)) return good(setFb, `Right: ${b.conj} (pKa ${b.pKa}) is a weaker acid than the alkyne (pKa ${ALKYNE_PKA}), so ${b.name} pulls the alkyne’s proton off. An acetylide anion!`, done, 3400)
    bad(setFb, `${b.conj} has pKa ${b.pKa}: a stronger acid than the alkyne (pKa ${ALKYNE_PKA}). ${b.name} is too weak a base; the equilibrium stays on the alkyne’s side.`)
  }
  const rungs = [{ name: 'alkane (CH₄)', pKa: 60 }, { name: 'alkene (ethylene)', pKa: 44 }, { name: 'NH₃', pKa: 35 }, { name: 'terminal alkyne', pKa: 25, me: true }, { name: 'H₂O', pKa: 15.7 }, { name: 'H₂CO₃', pKa: 6.4 }]
  return (
    <div>
      <h2>The pKa Ladder</h2>
      <p className="ins">To pull the proton off a terminal alkyne, you need a base whose conjugate acid is weaker: higher on the ladder. <span className="cite">§9.7, Table 9.1</span></p>
      <div className="pka-ladder">{rungs.map((r) => <div key={r.name} className={'pka-rung' + (r.me ? ' me' : '')}><b>{r.pKa}</b> {r.name}</div>)}</div>
      <div className="res-opts">{BASES.map((b) => <button key={b.id} onClick={() => pick(b)}>{b.name} (its conjugate acid: {b.conj})</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 9-5: the Retrosynthesis Map — plan backward one step at a time (§9.9)
export function RetroPlan({ done, route = 'we1' }) {
  const R = ROUTES[route]
  const [i, setI] = useState(0)
  const [chain, setChain] = useState([R.target])
  const [fb, setFb] = useState(null)
  const S = R.back[i]
  const pick = (o) => {
    if (o !== S.right) return bad(setFb, S.why[o] || 'That isn’t what came just before.')
    const next = [...chain, `${S.step} ↑`, o]
    setChain(next); sfx('pickup')
    if (i + 1 >= R.back.length) good(setFb, `Planned. Now read it upward: ${R.start} → ${R.back.map((b) => b.step).reverse().join(' → ')} → ${R.target}.`, done, 4200)
    else { setFb({ ok: true, text: `${o}. And what came before that?` }); setI(i + 1) }
  }
  return (
    <div>
      <h2>The Retrosynthesis Map · {R.title}</h2>
      <p className="ins">Don’t ask where to start. Ask what came just before the product, then before that, back to {R.start}. <span className="cite">§9.9, {R.cite}</span></p>
      <div className="retro-chain">{chain.map((c, k) => <div key={k} className={k % 2 ? 'retro-step' : 'retro-node'}>{c}</div>)}</div>
      {i < R.back.length && <>
        <p className="small">What came just before <b>{S.have}</b>?</p>
        <div className="res-opts">{S.pick.map((o) => <button key={o} onClick={() => pick(o)}>{o}</button>)}</div>
      </>}
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Lindlar's question (§9.9)
const LQ = [
  ['a', 'Start from the product and ask what came just before it, one step at a time, back to what you have.'],
  ['b', 'Start from what you have and try reactions until something useful turns up.'],
  ['c', 'Pick the reaction with the highest yield first, then work out the rest.'],
]
export function MimicCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. Work backward in a retrosynthetic direction: “What was the immediate precursor of that product?” (§9.9).', done, 3800)
    if (id === 'b') return bad(setFb, 'That’s Malradix’s way: start somewhere and hope. The Mimic laughed at that.')
    bad(setFb, 'Yields matter, but a plan comes first. Where did you look first on the Map?')
  }
  return (
    <div>
      <h2>Lindlar’s Question</h2>
      <p className="ins">Malradix said: to make something, just start somewhere and hope. How do you really plan a synthesis? <span className="cite">§9.9</span></p>
      <div className="res-opts">{LQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
