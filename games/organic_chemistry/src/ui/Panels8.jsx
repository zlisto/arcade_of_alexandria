import { useMemo, useState } from 'react'
import { sfx } from '../audio/sfx'
import { REAGENTS, RECIPES, ADDS, BACKWARD } from '../chem/rules8'

// Trial panels for World 8, the Reagent Orchards (book Chapter 8). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

// ---------- Prep: Borana's recipe board — what each reagent adds across a C=C (§8.2–8.9)
export function RecipeBoard({ done }) {
  const order = useMemo(() => [5, 2, 7, 0, 4, 1, 6, 3].map((i) => RECIPES[i]), [])
  const [placed, setPlaced] = useState({})
  const [held, setHeld] = useState(null)
  const [fb, setFb] = useState(null)
  const drop = (adds) => {
    if (!held) return
    const want = REAGENTS[held].adds
    if (want !== adds) {
      const hint = held === 'hg' || held === 'bh3' ? 'Both add water. Which puts the OH on the more substituted carbon?' : held === 'oso4' ? 'OsO₄ adds two O at once, from one face.' : held === 'o3' ? 'Ozone doesn’t add across the bond. It cuts it.' : 'Read the reagent: what atoms does it bring?'
      return bad(setFb, `Not that one. ${hint}`)
    }
    const next = { ...placed, [held]: adds }
    setPlaced(next); setHeld(null); setFb(null); sfx('pickup')
    if (Object.keys(next).length === RECIPES.length) good(setFb, 'Every recipe in its place. Same alkene, different reagent, different product.', done, 2400)
  }
  return (
    <div>
      <h2>Borana’s Recipe Board</h2>
      <p className="ins">Pick up a reagent, then click what it adds across a double bond. <span className="cite">§8.2–8.9</span></p>
      <div className="rx-list">{order.filter((r) => !placed[r]).map((r) => <button key={r} className={'rx' + (held === r ? ' sel' : '')} onClick={() => { setHeld(r); setFb(null) }}>{REAGENTS[r].name}</button>)}</div>
      <div className="rx-trails">{ADDS.map((a) => <button key={a} className="rx-trail" onClick={() => drop(a)}><b>{a}</b><span>{RECIPES.filter((r) => placed[r] === a).map((r) => <i key={r}>{REAGENTS[r].name}</i>)}</span></button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 8-4: Borana's riddle, working backward from ozonolysis (§8.8, Problem 8-49)
export function Backward({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (o) => (o[2] ? good(setFb, o[3], done, 3000) : bad(setFb, o[3]))
  return (
    <div>
      <h2>Borana’s Riddle</h2>
      <p className="ins">{BACKWARD.q} Each alkene carbon becomes a C=O. Put the halves back together. <span className="cite">§8.8</span></p>
      <div className="res-opts">{BACKWARD.opts.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 8-5: the racemate gate (§8.12, Fig 8.13)
const RQ = [
  ['a', 'Only (R)-2-butanol: water adds from the top.'],
  ['b', 'Only (S)-2-butanol: water adds from the bottom.'],
  ['c', '(R) and (S) in equal amounts: a racemate, optically inactive.'],
]
export function Racemate({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'c') return good(setFb, 'Right. The carbocation from 1-butene is flat; water adds to the top and the bottom equally. Achiral reactants give a racemic product (Fig 8.13).', done, 3600)
    bad(setFb, 'Look at the carbocation: sp², flat. Is either face easier to reach than the other?')
  }
  return (
    <div>
      <h2>The Racemate Gate</h2>
      <p className="ins">The gate takes the 2-butanol you make from 1-butene, H₂O and acid. Two locks: (R) and (S). What comes out of the flask? <span className="cite">§8.12</span></p>
      <div className="res-opts">{RQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Borana's question (§8.4–8.5)
const BQ = [
  ['a', 'Oxymercuration gives the Markovnikov alcohol; hydroboration gives the non-Markovnikov one, adding H and OH from the same face.'],
  ['b', 'Both give the same alcohol; hydroboration is just faster.'],
  ['c', 'Hydroboration gives the Markovnikov alcohol; oxymercuration gives the non-Markovnikov one.'],
]
export function LeviCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. 1-Methylcyclopentene: oxymercuration gives 1-methylcyclopentanol; hydroboration gives trans-2-methylcyclopentanol (§8.4–8.5).', done, 4000)
    if (id === 'b') return bad(setFb, 'Then the Two Waters would have had one door. You opened two.')
    bad(setFb, 'Backwards. Boron goes to the less substituted carbon, and the OH ends up where the boron was.')
  }
  return (
    <div>
      <h2>Borana’s Question</h2>
      <p className="ins">Malradix said water is water: every way of adding it gives the same alcohol. Set him straight. <span className="cite">§8.4–8.5</span></p>
      <div className="res-opts">{BQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
