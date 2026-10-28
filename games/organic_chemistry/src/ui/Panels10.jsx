import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { MARKERS, HUNTS, REACT, ratio, OXI, OXI_ORDER, oxLevel } from '../chem/rules10'

// Trial panels for World 10, the Halogen Marsh (book Chapter 10). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

// ---------- Prep: Magnus's markers — naming alkyl halides (§10.1)
export function Markers({ done }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const M = MARKERS[i]
  const pick = (id) => {
    if (id !== M.right) return bad(setFb, M.why[id])
    good(setFb, i + 1 < MARKERS.length ? 'Right name on the marker.' : 'All three. A halogen is just another substituent: lowest numbers, then the alphabet.', () => { setFb(null); if (i + 1 >= MARKERS.length) done(); else setI(i + 1) }, 1800)
  }
  return (
    <div>
      <h2>Magnus’s Markers · {i + 1} / {MARKERS.length}</h2>
      <p className="ins">Name the haloalkane. Halogens are named as substituents (fluoro, chloro, bromo, iodo) like alkyl groups. <span className="cite">§10.1</span></p>
      <div className="formula-big">{M.formula}</div>
      <div className="res-opts">{M.opts.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 10-2 The Hunt: predict a radical chlorination's product ratio (§10.2)
export function Hunt({ done, hunt = 'h1' }) {
  const H = HUNTS.find((h) => h.id === hunt)
  const [counts, setCounts] = useState(H.groups.map(() => ''))
  const [pct, setPct] = useState('')
  const [fb, setFb] = useState(null)
  const want = ratio(H)
  const check = () => {
    for (let k = 0; k < H.groups.length; k++) {
      if (+counts[k] !== H.groups[k].n) return bad(setFb, `Count the ${H.groups[k].kind} hydrogens on ${H.name} again: every H on a ${H.groups[k].kind === 'primary' ? 'CH₃' : H.groups[k].kind === 'secondary' ? 'CH₂' : 'CH with three carbons on it'}.`)
    }
    const v = parseFloat(pct)
    if (!isFinite(v) || Math.abs(v - want[1]) > 2) return bad(setFb, `Weight each kind: (number of H) × (reactivity per H: primary 1, secondary 3.5, tertiary 5). Then the ${H.groups[1].kind} product’s share is its weight ÷ the total.`)
    good(setFb, `${H.groups[0].n} × ${REACT[H.groups[0].kind]} : ${H.groups[1].n} × ${REACT[H.groups[1].kind]} → ${want[0]} : ${want[1]}. The book measures ${H.book}. Radicals don't pick at random: the weaker C–H wins more often.`, done, 4200)
  }
  return (
    <div>
      <h2>The Hunt · {H.name}</h2>
      <p className="ins">Cl· radicals hunt the hydrogens of {H.name}. Count each kind of H, weight it by how reactive it is, and predict the share of {H.groups[1].product}. <span className="cite">§10.2</span></p>
      <div className="hunt-grid">
        {H.groups.map((g, k) => (
          <label key={k}>{g.kind} H (reactivity {REACT[g.kind]}): <input value={counts[k]} onChange={(e) => setCounts(counts.map((c, j) => (j === k ? e.target.value : c)))} style={{ width: 50 }} /> → {g.product}</label>
        ))}
        <label>% {H.groups[1].product}: <input value={pct} onChange={(e) => setPct(e.target.value)} style={{ width: 60 }} /></label>
      </div>
      <button className="go" onClick={check}>Set the gate</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 10-5 Gilman coupling (§10.7)
const GQ = [
  ['a', 'Undecane, CH₃(CH₂)₉CH₃: one methyl from the copper reagent replaces the iodine.'],
  ['b', '1-Decanol: the copper reagent swaps the iodine for OH.'],
  ['c', 'Nothing: organocopper reagents don’t react with iodides.'],
]
export function Gilman({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. (CH₃)₂CuLi + 1-iododecane → undecane, in 90% yield: a new C–C bond (p. 328).', done, 3600)
    if (id === 'b') return bad(setFb, 'There’s no oxygen in a Gilman reagent. What does it carry?')
    bad(setFb, 'They couple with chlorides, bromides and iodides (but not fluorides).')
  }
  return (
    <div>
      <h2>The Coupling Altar</h2>
      <p className="ins">Lithium dimethylcopper, (CH₃)₂CuLi, a Gilman reagent, meets 1-iododecane. What comes out? <span className="cite">§10.7</span></p>
      <div className="res-opts">{GQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 10-5 The oxidation ladder (§10.8, Fig 10.7, Worked Example 10.2)
export function OxLadder({ done }) {
  const [order, setOrder] = useState([])
  const [fb, setFb] = useState(null)
  const shuffled = ['co2', 'ch3cl', 'hco2h', 'ch4', 'ch2o']
  const click = (id) => {
    if (order.includes(id)) return
    const next = [...order, id]
    if (OXI_ORDER[next.length - 1] !== id) {
      const m = OXI.find((x) => x.id === id)
      setOrder([])
      return bad(setFb, `Not that rung. Count for ${m.name}: bonds from C to O, N or halogen (a C=O counts as two), minus bonds to H. Lowest first.`)
    }
    setOrder(next); setFb(null); sfx('pickup')
    if (next.length === OXI.length) good(setFb, `${OXI_ORDER.map((i) => { const m = OXI.find((x) => x.id === i); return `${m.name} (${oxLevel(m) > 0 ? '+' : ''}${oxLevel(m)})` }).join(' < ')}. Going up is oxidation; down, reduction.`, done, 4200)
  }
  return (
    <div>
      <h2>The Oxidation Ladder</h2>
      <p className="ins">Put these one-carbon compounds on the ladder from lowest oxidation level to highest. For each: C–O, C–N and C–X bonds, minus C–H bonds. <span className="cite">§10.8</span></p>
      <div className="res-opts">{shuffled.map((id) => { const m = OXI.find((x) => x.id === id); return <button key={id} disabled={order.includes(id)} onClick={() => click(id)}>{m.name}</button> })}</div>
      <div className="pka-ladder">{order.map((id, k) => <div key={id} className="pka-rung"><b>{k + 1}</b> {OXI.find((x) => x.id === id).name}</div>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Magnus's question (§10.2–10.3)
const MQ = [
  ['a', 'They take the weakest C–H first: allylic, then tertiary, then secondary, then primary. The product ratios follow.'],
  ['b', 'At random: every hydrogen is equally likely to go.'],
  ['c', 'They always take a primary H, because it’s on the outside of the molecule.'],
]
export function HydraCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. Weaker C–H bonds give more stable radicals: allylic (370 kJ/mol) < tertiary (400) < secondary (410) < primary (421).', done, 4000)
    if (id === 'b') return bad(setFb, 'Then butane would give 6 : 4, not 30 : 70. What made the secondary hydrogens win?')
    bad(setFb, 'Primary C–H bonds are the strongest of the alkyl kinds (421 kJ/mol): the least likely to go.')
  }
  return (
    <div>
      <h2>Magnus’s Question</h2>
      <p className="ins">Malradix said his radicals strike at random. Do they? <span className="cite">§10.2–10.3</span></p>
      <div className="res-opts">{MQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
