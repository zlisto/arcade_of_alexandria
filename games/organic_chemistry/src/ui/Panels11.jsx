import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { WALDEN_STEPS, MECHS, TRIAL, ZAITSEV, CENTRES, CENTRE_WHY, PIT_MIX, trialMiss, shuffled, readMs, shown } from '../chem/rules11'

// Trial panels for World 11, the Arena of Five (book Chapter 11). Same contract as Panels10.jsx: props.done() when
// solved. A wrong answer shows its rule, hands the reason to the scene through onWrong (it toasts it and takes half a
// heart), then closes the panel through fail. Options are shuffled once per mount.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = readMs(text)) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) } // ms: long enough to read
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }
const miss = (setFb, text, onWrong, fail) => { bad(setFb, text); if (onWrong) onWrong(text); if (fail) setTimeout(fail, 1400) }

// the cycle's three steps as a row of arrows (after Fig 11.3); no step is marked, so it can't point at the answer
function CycleSvg() {
  const nodes = [['(+) alcohol', 45], ['tosylate', 155], ['acetate', 265], ['(−) alcohol', 365]]
  const steps = [['1', 'TsCl', 100], ['2', 'CH₃CO₂⁻', 210], ['3', 'HO⁻', 315]]
  return (
    <svg viewBox="0 0 410 96" className="ir-svg">
      <defs><marker id="w11arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#ffb08a" /></marker></defs>
      {nodes.map(([t, x]) => <g key={t}><rect x={x - 40} y="46" width="80" height="26" rx="6" fill="#2a1a22" stroke="#8a6a70" /><text x={x} y="63" textAnchor="middle" fill="#f0e0e0" fontSize="12">{t}</text></g>)}
      {steps.map(([n, r, x]) => <g key={n}><line x1={x - 14} y1="59" x2={x + 14} y2="59" stroke="#ffb08a" strokeWidth="2" markerEnd="url(#w11arr)" /><text x={x} y="22" textAnchor="middle" fill="#ffd060" fontSize="12">step {n}</text><text x={x} y="38" textAnchor="middle" fill="#c8b8c0" fontSize="12">{r}</text></g>)}
      <text x="205" y="91" textAnchor="middle" fill="#8a7a80" fontSize="12">1-phenyl-2-propanol: a three-step cycle (after Fig 11.3)</text>
    </svg>
  )
}

// the halide's carbon skeleton (zigzag, Br on C2); the products stay as formulas in the options
function HalideSvg({ id }) {
  const C = [[60, 70], [120, 40], [180, 70], [240, 40]]
  const bond = (a, b, k) => <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#e0d8e0" strokeWidth="2.5" />
  const br = id === 'z2' ? [150, 12] : [120, 8]
  return (
    <svg viewBox="0 0 300 110" className="ir-svg" style={{ maxWidth: 360 }}>
      {C.slice(1).map((c, k) => bond(C[k], c, k))}
      {bond(C[1], [br[0] - (id === 'z2' ? 6 : 0), br[1] + 8], 'br')}
      {id === 'z2' && bond(C[1], [88, 14], 'me')}
      <text x={br[0] + 4} y={br[1] + 4} fill="#ff9a6a" fontSize="14" fontWeight="700">Br</text>
      {/* C2 carries the Br (and, in z2, the methyl) above it, so its label sits below the atom */}
      {C.map(([x, y], k) => <text key={k} x={x} y={y + (k === 1 ? 20 : k % 2 ? -10 : 20)} textAnchor="middle" fill="#8a9ab8" fontSize="12">C{k + 1}</text>)}
      <text x="150" y="106" textAnchor="middle" fill="#6a7a98" fontSize="12">{id === 'z2' ? '2-bromo-2-methylbutane' : '2-bromobutane'}</text>
    </svg>
  )
}

// ---------- Prep: Sage Walden's cycle (§11.1, Fig 11.3)
export function WaldenCycle({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [order] = useState(() => shuffled(WALDEN_STEPS))
  const pick = (s) => {
    if (fb) return
    if (!s.right) return miss(setFb, s.why, onWrong, fail)
    good(setFb, `${s.why} One inversion in three steps: (+) goes round to (−).`, done)
  }
  return (
    <div>
      <h2>Walden’s Cycle</h2>
      <p className="ins">(+)-1-Phenyl-2-propanol goes round three steps and comes back as (−). One step must invert the chirality centre. Which? <span className="cite">§11.1, Fig 11.3</span></p>
      <CycleSvg />
      <div className="res-opts">{order.map((s) => <button key={s.id} onClick={() => pick(s)}>{s.text}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 11-1: before the inversion lands, call the product's configuration (§11.2, Worked Example 11.1, Problem
// 11-1). No option carries a †, so the dagger can't point at the answer; the solved tag shows it.
export function CentrePredict({ id, done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const C = CENTRES[id]
  const [order] = useState(() => shuffled(C.opts))
  const pick = ([k]) => {
    if (fb) return
    if (k !== 'inv') return miss(setFb, CENTRE_WHY[k], onWrong, fail)
    good(setFb, `Right: ${shown(C.product)}. The nucleophile takes the leaving group’s place in the priorities, so inverting the centre flips the label too.`, done)
  }
  return (
    <div>
      <h2>Which Configuration?</h2>
      <p className="ins">{C.nu} is in from behind {C.name}, and Br⁻ is leaving. What comes out? <span className="cite">§11.2</span></p>
      <div className="res-opts">{order.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 11-3: after both faces take water, predict the mixture (§11.5, p. 354)
export function PitMix({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [order] = useState(() => shuffled(PIT_MIX.opts))
  const pick = (o) => {
    if (fb) return
    if (!o[2]) return miss(setFb, PIT_MIX.no[o[0]], onWrong, fail)
    good(setFb, PIT_MIX.yes, done)
  }
  return (
    <div>
      <h2>What Does the Pit Hold?</h2>
      <p className="ins">{PIT_MIX.q} <span className="cite">§11.5</span></p>
      <div className="res-opts">{order.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 11-4: Zaitsev (§11.7). One of the book's two examples per mount; options are condensed formulas only
// (no name to match against the question's), shuffled.
export function Zaitsev({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [Z] = useState(() => ZAITSEV[Math.floor(Math.random() * ZAITSEV.length)])
  const [order] = useState(() => shuffled(Z.opts))
  const pick = (o) => {
    if (fb) return
    if (!o[2]) return miss(setFb, Z.no[o[0]], onWrong, fail)
    good(setFb, Z.yes, done)
  }
  return (
    <div>
      <h2>Which Product Wins?</h2>
      <p className="ins">{Z.q} <span className="cite">§11.7</span></p>
      <HalideSvg id={Z.id} />
      <div className="res-opts">{order.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 11-5: the Champion's trial — name each challenger's mechanism (§11.12). A miss closes the panel; the next
// attempt (this session) keeps the challengers already called right, but a new challenger from those left steps out
// first (the missed one goes back into the line, later). A knockout (resetTrial, from the scene) starts the whole
// trial over, so guessing through it costs more than half a heart a guess.
let trialLeft = null // challengers not yet called right, in this session
export const resetTrial = () => { const had = !!(trialLeft && trialLeft.length && trialLeft.length < TRIAL.length); trialLeft = null; return had }
export function Trial({ done, fail, onWrong }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const [list] = useState(() => {
    if (!trialLeft || !trialLeft.length) return shuffled(TRIAL)
    const [missed, ...rest] = trialLeft
    if (!rest.length) return [missed]
    const r = shuffled(rest), at = 1 + Math.floor(Math.random() * r.length) // never first
    return [...r.slice(0, at), missed, ...r.slice(at)]
  })
  const [mechs] = useState(() => shuffled(MECHS))
  const T = list[i]
  const total = TRIAL.length, at = total - list.length + i + 1
  const pick = (m) => {
    if (fb) return
    if (m !== T.right && m !== T.alt) { trialLeft = list.slice(i); return miss(setFb, trialMiss(T), onWrong, fail) }
    good(setFb, T.why, () => { setFb(null); if (i + 1 >= list.length) { trialLeft = null; done() } else { trialLeft = list.slice(i + 1); setI(i + 1) } })
  }
  return (
    <div>
      <h2>The Champion’s Trial · {at} / {total}</h2>
      <p className="ins">A challenger steps out: <b>{T.sub}</b>, {T.cond}. Which mechanism? <span className="cite">§11.12</span></p>
      <div className="res-opts">{mechs.map((m) => <button key={m} onClick={() => pick(m)}>{m}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Walden's question (§11.12, pp. 371–372). All four options have one form, a pair of factors
// and the rule they give, so none is the odd one out; each wrong rule is refuted by a reaction from the arena.
const WQ = [
  ['a', 'The carbon and the reagent: for a tertiary halide, a strong base decides it, E2 with one present; SN1 and E1 without.'],
  ['b', 'The carbon and the solvent: a tertiary halide in a protic solvent goes SN1; in an aprotic one it eliminates by E2.'],
  ['c', 'The reagent and the solvent: a strong base in ethanol substitutes; the same base in DMSO eliminates by E2.'],
  ['d', 'The carbon and the reagent: a primary halide with any strong base eliminates by E2; a tertiary one goes SN1 regardless.'],
]
const WQ_WHY = {
  b: 'Tertiary 2-bromo-2-methylbutane with sodium ethoxide in ethanol, a protic solvent, eliminated: E2, not SN1. A strong base on the field decides it.',
  c: '2-Bromobutane and sodium ethoxide in ethanol eliminated: E2 predominates (p. 363). The solvent tunes the rate; it doesn’t pick the mechanism alone.',
  d: '1-Bromobutane with KOH substitutes: SN2 (Problem 11-4). A primary halide needs a strong, hindered base such as tert-butoxide to eliminate (Problem 11-28), and a tertiary one with ethoxide did E2.',
}
export function ChampCheck({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [order] = useState(() => shuffled(WQ))
  const pick = (id) => {
    if (fb) return
    if (id !== 'a') return miss(setFb, WQ_WHY[id], onWrong, fail)
    good(setFb, 'Bravo. The carbon, and what meets it. That is how you called every round before the bell. Never luck.', done)
  }
  return (
    <div>
      <h2>Walden’s Question</h2>
      <p className="ins">Malradix said substitution and elimination are random luck. Which rule did the arena really follow? <span className="cite">§11.12</span></p>
      <div className="res-opts">{order.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
