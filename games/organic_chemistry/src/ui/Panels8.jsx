import { useState } from 'react'
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
/** a fresh order for a panel's options, drawn once per mount (useState initialiser) so the answer isn't in a fixed slot */
const shuffled = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }
/** a wrong pick: show why, hand the reason to the scene (it toasts it and takes half a heart), then close the panel */
const miss = (setFb, text, onWrong, fail) => { bad(setFb, text); if (onWrong) onWrong(text); if (fail) setTimeout(fail, 1400) }

// ---------- Prep: Borana's recipe board — what each reagent adds across a C=C (§8.2–8.9)
export function RecipeBoard({ done }) {
  const [order] = useState(() => shuffled(RECIPES))
  const [slots] = useState(() => shuffled(ADDS))
  const [placed, setPlaced] = useState({})
  const [last, setLast] = useState([]) // placement order, so a wrong drop can knock the latest one off
  const [held, setHeld] = useState(null)
  const [fb, setFb] = useState(null)
  const drop = (adds) => {
    if (!held) return
    const want = REAGENTS[held].adds
    if (want !== adds) {
      const hint = held === 'hg' || held === 'bh3' ? 'Both add water. Which puts the OH on the more substituted carbon?' : held === 'oso4' ? 'OsO₄ adds two O at once, from one face.' : held === 'o3' ? 'Ozone doesn’t add across the bond. It cuts it.' : 'Read the reagent: what atoms does it bring?'
      const off = last[last.length - 1]
      if (off) { const p = { ...placed }; delete p[off]; setPlaced(p); setLast(last.slice(0, -1)) }
      return bad(setFb, `Not that one. ${hint}${off ? ` The board shakes: ${REAGENTS[off].name} falls off.` : ''}`)
    }
    const next = { ...placed, [held]: adds }
    setPlaced(next); setLast([...last, held]); setHeld(null); setFb(null); sfx('pickup')
    if (Object.keys(next).length === RECIPES.length) good(setFb, 'Every recipe in its place. Same alkene, different reagent, different product.', done, 2400)
  }
  return (
    <div>
      <h2>Borana’s Recipe Board</h2>
      <p className="ins">Pick up a reagent, then click what it adds across a double bond. <span className="cite">§8.2–8.9</span></p>
      <div className="rx-list">{order.filter((r) => !placed[r]).map((r) => <button key={r} className={'rx' + (held === r ? ' sel' : '')} onClick={() => { setHeld(r); setFb(null) }}>{REAGENTS[r].name}</button>)}</div>
      <div className="rx-trails">{slots.map((a) => <button key={a} className="rx-trail" onClick={() => drop(a)}><b>{a}</b><span>{RECIPES.filter((r) => placed[r] === a).map((r) => <i key={r}>{REAGENTS[r].name}</i>)}</span></button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 8-4: Borana's riddle, working backward from ozonolysis (§8.8, Problem 8-49)
export function Backward({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [opts] = useState(() => shuffled(BACKWARD.opts))
  const pick = (o) => { if (fb) return; if (o[2]) good(setFb, o[3], done, 3000); else miss(setFb, o[3], onWrong, fail) }
  return (
    <div>
      <h2>Borana’s Riddle</h2>
      <p className="ins">{BACKWARD.q} Each alkene carbon becomes a C=O. Put the halves back together. <span className="cite">§8.8</span></p>
      <div className="res-opts">{opts.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// 8-5: the racemate gate is a world puzzle now (Glasshouse.jsx); its plate is an InfoCard

// ---------- After the boss: Borana's question (§8.4–8.5)
const BQ = [
  ['a', 'Hg(OAc)₂, H₂O then NaBH₄: 1-methylcyclopentanol. BH₃ then H₂O₂, OH⁻: trans-2-methylcyclopentanol.'],
  ['b', 'Both give 1-methylcyclopentanol; hydroboration is just cleaner, with no mercury.'],
  ['c', 'Hg(OAc)₂, H₂O then NaBH₄: trans-2-methylcyclopentanol. BH₃ then H₂O₂, OH⁻: 1-methylcyclopentanol.'],
]
export function LeviCheck({ done, fail, onWrong }) {
  const [fb, setFb] = useState(null)
  const [opts] = useState(() => shuffled(BQ))
  const pick = (id) => {
    if (fb) return
    if (id === 'a') return good(setFb, 'Right. Oxymercuration puts OH on the more substituted carbon (Markovnikov); hydroboration puts it on the less substituted one, with H and OH added syn (§8.4–8.5).', done, 4000)
    if (id === 'b') return miss(setFb, 'Then the Two Waters would have had one door. You opened two.', onWrong, fail)
    miss(setFb, 'Backwards. Boron goes to the less substituted carbon, and the OH ends up where the boron was.', onWrong, fail)
  }
  return (
    <div>
      <h2>Borana’s Question</h2>
      <p className="ins">Malradix said water is water: every way of adding it gives the same alcohol. Set him straight: what does 1-methylcyclopentene give with each? <span className="cite">§8.4–8.5</span></p>
      <div className="res-opts">{opts.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
