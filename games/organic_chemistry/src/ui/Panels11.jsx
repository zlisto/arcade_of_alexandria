import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { WALDEN_STEPS, MECHS, TRIAL, ZAITSEV } from '../chem/rules11'

// Trial panels for World 11, the Arena of Five (book Chapter 11). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

// ---------- Prep: Sage Walden's cycle (§11.1, Fig 11.3)
export function WaldenCycle({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (s) => (s.right ? good(setFb, `${s.why} One inversion in three steps: (+) goes round to (−).`, done, 3600) : bad(setFb, s.why))
  return (
    <div>
      <h2>Walden’s Cycle</h2>
      <p className="ins">(+)-1-Phenyl-2-propanol goes round three steps and comes back as (−). One step must invert the chirality centre. Which? Look for the step that breaks a bond to the centre itself. <span className="cite">§11.1, Fig 11.3</span></p>
      <div className="res-opts">{WALDEN_STEPS.map((s) => <button key={s.id} onClick={() => pick(s)}>{s.text}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 11-4: Zaitsev (§11.7)
export function Zaitsev({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (o) => (o[2] ? good(setFb, ZAITSEV.yes, done, 3200) : bad(setFb, ZAITSEV.no[o[0]]))
  return (
    <div>
      <h2>Which Alkene Wins?</h2>
      <p className="ins">{ZAITSEV.q} <span className="cite">§11.7</span></p>
      <div className="res-opts">{ZAITSEV.opts.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 11-5: the Champion's trial — name each challenger's mechanism (§11.12)
export function Trial({ done }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const T = TRIAL[i]
  const pick = (m) => {
    if (m !== T.right && m !== T.alt) return bad(setFb, `Not ${m}. Look at the substrate first (${T.sub}), then what it meets.`)
    good(setFb, T.why, () => { setFb(null); if (i + 1 >= TRIAL.length) done(); else setI(i + 1) }, 2600)
  }
  return (
    <div>
      <h2>The Champion’s Trial · {i + 1} / {TRIAL.length}</h2>
      <p className="ins">A challenger steps out: <b>{T.sub}</b>, {T.cond}. Which mechanism? <span className="cite">§11.12</span></p>
      <div className="res-opts">{MECHS.map((m) => <button key={m} onClick={() => pick(m)}>{m}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Walden's question (§11.12)
const WQ = [
  ['a', 'The substrate, the nucleophile or base, the leaving group and the solvent decide which mechanism wins.'],
  ['b', 'Nothing decides it: substitution and elimination are equally likely every time.'],
  ['c', 'Only the leaving group matters: Br always gives substitution, Cl always elimination.'],
]
export function ChampCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. Tertiary with a base: E2. Primary with a good nucleophile: SN2. Tertiary in pure ethanol: SN1 and E1 together (§11.12).', done, 4200)
    if (id === 'b') return bad(setFb, 'You called every stance before the bell. Was it luck?')
    bad(setFb, 'Br and Cl are both good leaving groups; they don’t choose the mechanism on their own.')
  }
  return (
    <div>
      <h2>Walden’s Question</h2>
      <p className="ins">Malradix said substitution and elimination are random luck. What really decides it? <span className="cite">§11.12</span></p>
      <div className="res-opts">{WQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
