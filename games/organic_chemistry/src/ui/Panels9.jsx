import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { CAIRNS, BASES, ALKYNE_PKA, baseWorks, ROUTES, MAP_REAGENTS, shuffled } from '../chem/rules9'

// Trial panels for World 9, the Triple Spire (book Chapter 9). Same contract as Panels.jsx:
// props.done() when solved; a wrong pick explains the rule from the book (without naming the answer), hands the
// reason to the scene through onWrong (it toasts it and takes half a heart), then closes the panel through fail.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }
const miss = (setFb, text, onWrong, fail) => { bad(setFb, text); if (onWrong) onWrong(text); if (fail) setTimeout(fail, 1400) }

// ---------- Prep: Lindlar's cairns — naming alkynes (§9.1)
export function Cairns({ done, fail, onWrong }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const [orders] = useState(() => CAIRNS.map((c) => shuffled(c.opts)))
  const C = CAIRNS[i]
  const pick = (id) => {
    if (fb) return
    if (id !== C.right) return miss(setFb, C.why[id], onWrong, fail)
    good(setFb, i + 1 < CAIRNS.length ? 'Carved right.' : 'Three cairns named. Lowest number to the multiple bond; on a tie, the double bond wins.', () => { setFb(null); if (i + 1 >= CAIRNS.length) done(); else setI(i + 1) }, 1800)
  }
  return (
    <div>
      <h2>Lindlar’s Cairns · {i + 1} / {CAIRNS.length}</h2>
      <p className="ins">Name the alkyne carved on the cairn. Suffix -yne; number from the end nearer the triple bond. <span className="cite">§9.1</span></p>
      <div className="formula-big">{C.formula}</div>
      <div className="res-opts">{orders[i].map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 9-4: the pKa ladder (§9.7)
export function PkaLadder({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [opts] = useState(() => shuffled(BASES))
  const pick = (b) => {
    if (fb) return
    if (baseWorks(b)) return good(setFb, `Right: ${b.conj} (pKa ${b.pKa}) is a weaker acid than the alkyne (pKa ${ALKYNE_PKA}), so ${b.name} pulls the alkyne’s proton off. An acetylide anion!`, done, 3400)
    miss(setFb, `${b.conj} has pKa ${b.pKa}: a stronger acid than the alkyne (pKa ${ALKYNE_PKA}). ${b.name} is too weak a base; the equilibrium stays on the alkyne’s side.`, onWrong, fail)
  }
  const rungs = [{ name: 'alkane (CH₄)', pKa: 60 }, { name: 'alkene (ethylene)', pKa: 44 }, { name: 'NH₃', pKa: 35 }, { name: 'terminal alkyne', pKa: 25, me: true }, { name: 'H₂O', pKa: 15.7 }, { name: 'H₂CO₃', pKa: 6.4 }]
  return (
    <div>
      <h2>The pKa Ladder</h2>
      <p className="ins">To pull the proton off a terminal alkyne, you need a base whose conjugate acid is weaker: higher on the ladder. <span className="cite">§9.7, Table 9.1</span></p>
      <div className="pka-ladder">{rungs.map((r) => <div key={r.name} className={'pka-rung' + (r.me ? ' me' : '')}><b>{r.pKa}</b> {r.name}</div>)}</div>
      <div className="res-opts">{opts.map((b) => <button key={b.id} onClick={() => pick(b)}>{b.name} (its conjugate acid: {b.conj})</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 9-5: the Retrosynthesis Map — plan backward one step at a time (§9.9). Each step back asks two things:
// what came just before, and which reagent turns it into what you have (Worked Example 9.1: Lindlar vs Li/NH₃).
// steps already planned survive a wrong pick: the panel still closes (half a heart), but reopening it resumes at the
// row that was missed instead of the target (World 9 round 2, Play #4). Kept for this visit only.
const retroKept = {}
export function RetroPlan({ done, fail, onWrong, route = 'we1' }) {
  const R = ROUTES[route]
  const kept = retroKept[route]
  const [i, setI] = useState(kept ? kept.i : 0)
  const [part, setPart] = useState('pre') // 'pre': pick the precursor; 'reag': pick the reagent
  const [chain, setChain] = useState(kept ? kept.chain : [R.target])
  const [fb, setFb] = useState(kept ? { ok: true, text: `Your plan so far is kept. What came just before ${R.back[kept.i].have}?` } : null)
  const [fin, setFin] = useState(false)
  const [orders] = useState(() => R.back.map((b) => shuffled(b.pick)))
  const [reags] = useState(() => R.back.map(() => shuffled(MAP_REAGENTS)))
  const S = R.back[i]
  // a miss keeps every finished row (i rows, chain up to them) and drops only the row in progress
  const missRow = (text) => { if (i > 0) retroKept[route] = { i, chain: chain.slice(0, 1 + 2 * i) }; else delete retroKept[route]; miss(setFb, text, onWrong, fail) }
  const pickPre = (o) => {
    if (fb && !fb.ok) return
    if (o !== S.right) return missRow(S.why[o] || 'That isn’t what came just before.')
    setChain([...chain, 'reagent? ↑', o]); sfx('pickup')
    setFb({ ok: true, text: `${o}. Now: what turns it into ${S.have}?` }); setPart('reag')
  }
  const pickReag = ([id, label]) => {
    if (fb && !fb.ok) return
    if (id !== S.r) return missRow(S.rwhy[id] || 'That reagent won’t make that step.')
    const next = [...chain]; next[next.length - 2] = `${label} ↑`
    setChain(next); sfx('pickup')
    if (i + 1 >= R.back.length) { delete retroKept[route]; setFin(true); return good(setFb, `Planned, back to ${R.start}. The altar asks a new target: plan it the same way, backwards first.`, done, 3800) }
    setFb({ ok: true, text: `${label}. And what came before ${S.right}?` }); setI(i + 1); setPart('pre')
  }
  return (
    <div>
      <h2 style={{ paddingRight: '2.6em' }}>Retrosynthesis Map</h2>
      <p className="small">Target: <b>{R.target}</b></p>
      <p className="ins">Don’t ask where to start. Ask what came just before the product, and with what, then before that, back to something simple. <span className="cite">§9.9, {R.cite}</span></p>
      <div className="retro-chain">{chain.map((c, k) => <div key={k} className={k % 2 ? 'retro-step' : 'retro-node'}>{c}</div>)}</div>
      {!fin && part === 'pre' && <>
        <p className="small">What came just before <b>{S.have}</b>?</p>
        <div className="res-opts">{orders[i].map((o) => <button key={o} onClick={() => pickPre(o)}>{o}</button>)}</div>
      </>}
      {!fin && part === 'reag' && <>
        <p className="small">Which reagent turns <b>{S.right}</b> into <b>{S.have}</b>?</p>
        <div className="res-opts">{reags[i].map((r) => <button key={r[0]} onClick={() => pickReag(r)}>{r[1]}</button>)}</div>
      </>}
      <Feedback fb={fb} />
      {fin && <button className="go" onClick={done}>Continue</button>}
    </div>
  )
}

// ---------- After the boss: Lindlar's question (§9.8–9.9). A new idea for the final check (not Lindlar → cis again):
// which disconnection of an internal alkyne works? Problem 9-10 (p. 301) draws cyclohexyl–C≡C–CH₃; p. 300 says the
// other route, propyne anion + bromocyclohexane, gives cyclohexene by elimination. The right route is worked out (†).
const LQ = [
  ['a', 'ethynylcyclohexane: NaNH₂, then CH₃I'],
  ['b', 'propyne: NaNH₂, then iodocyclohexane'],
  ['c', 'ethynylcyclohexane: NaNH₂, then CH₃CH₂I'],
  ['d', 'propyne: NaNH₂, then (iodomethyl)cyclohexane'],
]
const LQ_WHY = {
  b: 'Iodocyclohexane is a secondary halide. The acetylide is a strong base, so it pulls off H instead: elimination, cyclohexene (p. 300).',
  c: 'Count carbons: the ethyl group brings two, giving cyclohexyl–C≡C–CH₂CH₃, one carbon too many. The target ends in CH₃.',
  d: 'A primary halide, so it does alkylate, but it brings a CH₂ with the ring: cyclohexyl–CH₂–C≡C–CH₃, one carbon too many.',
}
export function MimicCheck({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [opts] = useState(() => shuffled(LQ))
  const [won, setWon] = useState(false)
  const pick = (id) => {
    if (fb) return
    if (id === 'a') { setWon(true); return good(setFb, 'Right: ethynylcyclohexane, NaNH₂, then CH₃I gives cyclohexyl–C≡C–CH₃ †. Two cuts look possible; only one uses a methyl or primary halide (p. 300).', done, 4200) }
    miss(setFb, LQ_WHY[id], onWrong, fail)
  }
  return (
    <div>
      <h2>Lindlar’s Question</h2>
      <p className="ins">You want <b>cyclohexyl–C≡C–CH₃</b>. Which terminal alkyne and which reagents make it? <span className="cite">§9.8, Problem 9-10, p. 301</span></p>
      <div className="res-opts">{opts.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
      {won && <button className="go" onClick={done}>Continue</button>}
    </div>
  )
}
