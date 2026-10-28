import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { MARKERS, HUNTS, REACT, ratio, OXI, OXI_RUNGS, oxLevel, shuffled, shown, readMs } from '../chem/rules10'

// Trial panels for World 10, the Halogen Marsh (book Chapter 10). Same contract as Panels9.jsx:
// props.done() when solved. A wrong answer shows its rule, hands the reason to the scene through onWrong (it toasts it
// and takes half a heart), then closes the panel through fail. Options are shuffled once per mount.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = readMs(text)) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) } // ms: long enough to read
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }
const miss = (setFb, text, onWrong, fail) => { bad(setFb, text); if (onWrong) onWrong(text); if (fail) setTimeout(fail, 1400) }

// ---------- Prep: Magnus's markers — naming alkyl halides (§10.1)
export function Markers({ done, fail, onWrong }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const [orders] = useState(() => MARKERS.map((m) => shuffled(m.opts)))
  const M = MARKERS[i]
  const pick = (id) => {
    if (fb) return
    if (id !== M.right) return miss(setFb, M.why[id], onWrong, fail)
    good(setFb, i + 1 < MARKERS.length ? 'Right name on the marker.' : 'All three. A halogen is just another substituent: lowest numbers, then the alphabet.', () => { setFb(null); if (i + 1 >= MARKERS.length) done(); else setI(i + 1) })
  }
  return (
    <div>
      <h2>Magnus’s Markers · {i + 1} / {MARKERS.length}</h2>
      <p className="ins">Name the haloalkane on this marker. <span className="cite">§10.1</span></p>
      <div className="formula-big">{M.formula}</div>
      <div className="res-opts">{orders[i].map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 10-2 The Hunt: predict a radical chlorination's product ratio (§10.2)
export function Hunt({ done, fail, onWrong, hunt = 'h1' }) {
  const H = HUNTS.find((h) => h.id === hunt)
  const [counts, setCounts] = useState(H.groups.map(() => ''))
  const [pct, setPct] = useState('')
  const [fb, setFb] = useState(null)
  const want = ratio(H)
  const check = () => {
    if (fb) return
    for (let k = 0; k < H.groups.length; k++) {
      if (+counts[k] !== H.groups[k].n) return miss(setFb, `Count the ${H.groups[k].kind} hydrogens on ${H.name} again: every H on a ${H.groups[k].kind === 'primary' ? 'CH₃' : H.groups[k].kind === 'secondary' ? 'CH₂' : 'CH with three carbons on it'}.`, onWrong, fail)
    }
    const v = parseFloat(pct)
    if (!isFinite(v) || Math.abs(v - want[1]) > 2) return miss(setFb, `Weight each kind: (number of H) × (reactivity per H). Then a product’s share is its weight ÷ the total.`, onWrong, fail)
    const p0 = shown(H.groups[0].product), p1 = shown(H.groups[1].product)
    good(setFb, `${H.groups[0].n} × ${REACT[H.groups[0].kind]} : ${H.groups[1].n} × ${REACT[H.groups[1].kind]} → ${p0} : ${p1}, about ${want[0]} : ${want[1]}. ${H.book ? `The book measures ${H.book}.` : '† worked out from the book’s rules.'} The weaker C–H wins more often.`, done)
  }
  return (
    <div>
      <h2>The Hunt · {H.name}</h2>
      <p className="ins">Cl· radicals hunt the hydrogens of {H.name}. Count each kind of H, weight it by its reactivity, and predict the share of {shown(H.groups[1].product)}. <span className="cite">§10.2</span></p>
      <div className="hunt-grid">
        {H.groups.map((g, k) => (
          <label key={k}>{g.kind} H (reactivity {REACT[g.kind]}): <input value={counts[k]} onChange={(e) => setCounts(counts.map((c, j) => (j === k ? e.target.value : c)))} style={{ width: 50 }} /> → {shown(g.product)}</label>
        ))}
        <label>% {shown(H.groups[1].product)}: <input value={pct} onChange={(e) => setPct(e.target.value)} style={{ width: 60 }} /></label>
      </div>
      <button className="go" onClick={check}>Set the gate</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 10-5 Gilman coupling (§10.7): the book's own example; the lesson card shows a different one (toluene)
const GQ = [
  ['a', 'Undecane: one methyl takes the iodine’s place'],
  ['b', 'Decane: the iodine is simply replaced by H'],
  ['c', 'Nothing: organocopper reagents leave alkyl iodides alone'],
  ['d', 'Dodecane: both of the copper reagent’s methyls join the chain'],
]
const GQ_WHY = {
  b: 'A Gilman reagent delivers an alkyl group, not a hydrogen: one of its methyls replaces the halogen. Count the carbons.',
  c: 'Gilman reagents couple with organochlorides, bromides and iodides. Only fluorides are left alone.',
  d: 'Only one of the reagent’s two alkyl groups replaces the halogen. Count the carbons.',
}
export function Gilman({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [opts] = useState(() => shuffled(GQ))
  const pick = (id) => {
    if (fb) return
    if (id === 'a') return good(setFb, 'Right. (CH₃)₂CuLi + 1-iododecane → undecane, in 90% yield: a new C–C bond.', done)
    miss(setFb, GQ_WHY[id], onWrong, fail)
  }
  return (
    <div>
      <h2>The Coupling Altar</h2>
      <p className="ins">Lithium dimethylcopper, (CH₃)₂CuLi, a Gilman reagent, meets 1-iododecane, CH₃(CH₂)₈CH₂I. What comes out? <span className="cite">§10.7</span></p>
      <div className="res-opts">{opts.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 10-5 The oxidation ladder (§10.8, Worked Example 10.2's own set, p. 332); the lesson card shows Fig 10.7.
// Some compounds share a level, so the player builds rungs: a compound goes on the current rung, or "Start a new rung" moves up.
const sgn = (L) => `${L > 0 ? '+' : ''}${L}`
export function OxLadder({ done, fail, onWrong }) {
  const [rungs, setRungs] = useState([[]])
  const [fb, setFb] = useState(null)
  const [opts] = useState(() => shuffled(OXI.map((m) => m.id)))
  const placed = rungs.flat()
  const lv = (id) => oxLevel(OXI.find((x) => x.id === id))
  const top = rungs[rungs.length - 1]
  const count = (m) => `Count for ${m.name}, over all three carbons: bonds from C to O, N or halogen (a C=O counts as two), minus C–H bonds (an O–H is not one).`
  const click = (id) => {
    if (placed.includes(id) || fb) return
    const m = OXI.find((x) => x.id === id)
    const left = OXI.filter((x) => !placed.includes(x.id))
    const lowest = Math.min(...left.map(oxLevel))
    if (top.length ? lv(top[0]) !== oxLevel(m) : oxLevel(m) !== lowest) {
      return miss(setFb, top.length && oxLevel(m) > lv(top[0]) ? `${m.name} doesn’t share this rung. ${count(m)}` : `Not on this rung. ${count(m)} Lowest first.`, onWrong, fail)
    }
    const next = [...rungs.slice(0, -1), [...top, id]]
    setRungs(next); sfx('pickup')
    if (next.flat().length === OXI.length) {
      if (next.length !== OXI_RUNGS.length) return
      good(setFb, `${next.map((r) => `${r.map((x) => OXI.find((y) => y.id === x).name).join(' = ')} (${sgn(lv(r[0]))})`).join(' < ')}. Worked Example 10.2: a C=C adds no C–O bond, so propene sits with 2-propanol, not with acetone. Going up is oxidation; down, reduction.`, done)
    }
  }
  const newRung = () => {
    if (fb || !top.length) return
    const left = OXI.filter((x) => !placed.includes(x.id))
    if (left.some((x) => oxLevel(x) === lv(top[0]))) return miss(setFb, 'Not yet: a compound still waiting shares this rung. Count each one before you climb.', onWrong, fail)
    setRungs([...rungs, []]); sfx('pickup')
  }
  return (
    <div>
      <h2>The Oxidation Ladder</h2>
      <p className="ins">Put these three-carbon compounds on the ladder, lowest oxidation level first. For each, over all its carbons: C–O, C–N and C–X bonds, minus C–H bonds. Compounds at the same level share a rung. <span className="cite">§10.8 · Worked Example 10.2</span></p>
      <div className="res-opts">{opts.map((id) => { const m = OXI.find((x) => x.id === id); return <button key={id} disabled={placed.includes(id)} onClick={() => click(id)}>{m.name}</button> })}</div>
      <div className="res-opts"><button disabled={!top.length || placed.length === OXI.length} onClick={newRung}>Start a new rung ↑</button></div>
      <div className="pka-ladder">{rungs.map((r, k) => <div key={k} className="pka-rung"><b>{k + 1}</b> {r.length ? r.map((x) => OXI.find((y) => y.id === x).name).join(' = ') : '…'}</div>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Magnus's question, a transfer item (§10.2, Problem 10-4: 2-methylbutane, no printed answer)
// per H: tertiary 5, secondary 3.5, primary 1. C1 + the branch CH₃: 6 × 1 = 6; C2: 1 × 5 = 5; C3: 2 × 3.5 = 7; C4: 3 × 1 = 3.
const MQ = [
  ['a', '2-chloro-3-methylbutane'],
  ['b', '2-chloro-2-methylbutane'],
  ['c', '1-chloro-2-methylbutane'],
  ['d', '1-chloro-3-methylbutane'],
]
const MQ_WHY = {
  b: 'Its tertiary H is the most reactive one, but there is only one of it: 1 × 5. Weigh every kind.',
  c: 'Six primary H, but each one reacts slowly: 6 × 1. Weigh every kind.',
  d: 'Only three primary H on that end: 3 × 1. Weigh every kind.',
}
export function HydraCheck({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [opts] = useState(() => shuffled(MQ))
  const pick = (id) => {
    if (fb) return
    if (id === 'a') return good(setFb, `Right: ${shown('2-chloro-3-methylbutane')}. Its two secondary H give 2 × 3.5 = 7, ahead of 6, 5 and 3. Counted, not random.`, done)
    miss(setFb, MQ_WHY[id], onWrong, fail)
  }
  return (
    <div>
      <h2>Magnus’s Question</h2>
      <p className="ins">Cl· meets 2-methylbutane, (CH₃)₂CHCH₂CH₃. Which monochloro product comes out most? Per H: tertiary 5, secondary 3.5, primary 1. <span className="cite">§10.2 · Problem 10-4</span></p>
      <div className="res-opts">{opts.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
