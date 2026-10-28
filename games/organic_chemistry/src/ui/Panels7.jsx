import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { SEEDS, SHIFTS } from '../chem/rules7'

// Trial panels for World 7, the Tower of Addition (book Chapter 7). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

/** a zigzag skeleton: n carbons left to right, a C=C from carbon dbl to dbl + 1, substituents hanging off */
export function Skeleton({ n, dbl, subs = {}, w = 300 }) {
  const dx = (w - 40) / (n - 1)
  const P = [...Array(n)].map((_, i) => [20 + i * dx, i % 2 ? 50 : 80])
  return (
    <svg viewBox={`0 0 ${w} 130`} className="skel-svg">
      {P.slice(0, -1).map(([x, y], i) => {
        const [x2, y2] = P[i + 1]
        const d = i === dbl
        const nx = -(y2 - y), ny = x2 - x, L = Math.hypot(nx, ny)
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x2} y2={y2} stroke="#e8e4f4" strokeWidth="3" />
            {d && <line x1={x + (nx / L) * 7 + (x2 - x) * 0.15} y1={y + (ny / L) * 7 + (y2 - y) * 0.15} x2={x2 + (nx / L) * 7 - (x2 - x) * 0.15} y2={y2 + (ny / L) * 7 - (y2 - y) * 0.15} stroke="#5ff0ff" strokeWidth="3" />}
          </g>
        )
      })}
      {Object.entries(subs).map(([i, lab]) => {
        const [x, y] = P[+i]
        const up = +i % 2 === 1
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={up ? y - 32 : y + 32} stroke="#e8e4f4" strokeWidth="3" />
            <text x={x} y={up ? y - 38 : y + 48} textAnchor="middle" fill="#ffb0d8" fontSize="15" fontWeight="700">{lab}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------- Prep: Markov's seed labels (§7.3)
export function SeedLabels({ done }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const S = SEEDS[i]
  const pick = (id) => {
    if (id !== S.right) return bad(setFb, S.why[id])
    good(setFb, i + 1 < SEEDS.length ? 'Right label on the sack.' : 'All three sacks labelled. The longest chain with the C=C, numbered from the end nearer it.', () => { setFb(null); if (i + 1 >= SEEDS.length) done(); else setI(i + 1) }, 1700)
  }
  return (
    <div>
      <h2>Markov’s Seed Labels · {i + 1} / {SEEDS.length}</h2>
      <p className="ins">Every corner of the skeleton is a carbon. Find the longest chain that holds the double bond (cyan), number from the end nearer it, and pick the label. <span className="cite">§7.3</span></p>
      <Skeleton n={S.chain} dbl={S.dbl} subs={S.subs} />
      <div className="res-opts">{S.opts.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 7-4: the Hammond stone (§7.10)
const HQ = [
  ['a', 'The tertiary cation’s pass is lower, so it forms faster.'],
  ['b', 'Both passes are the same height; the tertiary cation just lasts longer.'],
  ['c', 'The primary cation’s pass is lower, because a primary cation is smaller.'],
]
export function HammondStone({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. Protonation is uphill, so its transition state looks like the carbocation: what steadies the cation lowers the pass too (Fig 7.17).', done, 3800)
    if (id === 'b') return bad(setFb, 'The Hammond postulate says the transition state looks like the nearest species in energy: here, the cation. A steadier cation means a steadier transition state.')
    bad(setFb, 'Primary cations are the least stable: 3° > 2° > 1° > methyl (§7.9). Their pass is the highest.')
  }
  return (
    <div>
      <h2>The Hammond Stone</h2>
      <p className="ins">2-Methylpropene can be protonated two ways: one gives a tertiary cation, the other a primary one. Carved on the stone are two passes. Which is lower? <span className="cite">§7.10</span></p>
      <svg viewBox="0 0 300 120" className="skel-svg">
        <path d="M10 95 C 50 95, 70 40, 100 40 S 140 70, 160 70" stroke="#ffb0d8" strokeWidth="3" fill="none" />
        <path d="M10 95 C 50 95, 70 15, 100 15 S 140 50, 160 50" stroke="#9ad0ff" strokeWidth="3" fill="none" strokeDasharray="5 4" />
        <text x="168" y="74" fill="#ffb0d8" fontSize="13">cation A</text>
        <text x="168" y="54" fill="#9ad0ff" fontSize="13">cation B</text>
        <text x="10" y="112" fill="#c8c0d8" fontSize="12">alkene + HCl</text>
      </svg>
      <div className="res-opts">{HQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 7-5: name what formed in the crypt (§7.11)
export function ShiftName({ done }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const S = SHIFTS[i]
  const opts = [S.product, S.plain, S.id === 'h' ? '1-chloro-3-methylbutane' : '1-chloro-3,3-dimethylbutane']
  const order = i === 0 ? [1, 0, 2] : [2, 1, 0]
  const pick = (k) => {
    if (k === 0) return good(setFb, `Yes: the cation moved to the tertiary carbon before the Cl⁻ arrived, so Cl sits there: ${S.product}.`, () => { setFb(null); if (i + 1 >= SHIFTS.length) done(); else setI(i + 1) }, 2600)
    if (k === 1) return bad(setFb, `That one forms too: it’s the product with no shift (p. 230–231). But the crypt caught the cation after the ${S.kind} shift. Where did the charge end up?`)
    bad(setFb, 'Cl⁻ adds where the positive charge is, never at C1: a primary cation is the least stable.')
  }
  return (
    <div>
      <h2>Name What Formed · {S.name}</h2>
      <p className="ins">You caught the cation after the {S.kind} shift and planted the chloride there. What did you make? <span className="cite">§7.11</span></p>
      <div className="res-opts">{order.map((k) => <button key={k} onClick={() => pick(k)}>{opts[k]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Markov's question (§7.8)
const MQ = [
  ['a', 'H goes to the end with more H, so the more stable (more substituted) carbocation forms, and X adds there.'],
  ['b', 'Any which way: the two products form about equally.'],
  ['c', 'X goes to the carbon with more H, because it is less crowded.'],
]
export function PhantomCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. 2-Methylpropene + HCl gives only 2-chloro-2-methylpropane (p. 222). Markovnikov’s rule, restated with carbocations.', done, 4000)
    if (id === 'b') return bad(setFb, 'Then 2-methylpropene would give two chlorides. It gives one. What decides it?')
    bad(setFb, 'Backwards: the H goes to the carbon that already has more H. The X follows the positive charge.')
  }
  return (
    <div>
      <h2>Markov’s Question</h2>
      <p className="ins">Malradix said HX adds to a double bond any which way. How does it really add? <span className="cite">§7.8–7.9</span></p>
      <div className="res-opts">{MQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
