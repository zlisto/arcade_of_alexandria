import { useMemo, useState } from 'react'
import { sfx } from '../audio/sfx'
import { getState, saveGame } from '../engine/store'
import { ALKANE_NAMES, checkSkeleton, treeCode, CONFORMERS, conformerName } from '../chem/rules3'
import { NewmanSvg, EnergyBar } from './Newman'

// Trial panels for World 3, the Chain Labyrinth (book Chapter 3). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1700) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }
const shuffle = (a, seed) => { const r = [...a]; let s = seed; for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }

// ---------- Prep: Iupaca's Shelf of Ten — the first ten straight-chain alkanes (§3.2)
export function Shelf({ done }) {
  const books = useMemo(() => shuffle(ALKANE_NAMES, 7), [])
  const [slots, setSlots] = useState(Array(10).fill(null))
  const [held, setHeld] = useState(null)
  const [fb, setFb] = useState(null)
  const [missed, setMissed] = useState({})
  const place = (i) => {
    if (held === null || slots[i]) return
    const n = ALKANE_NAMES.indexOf(held) + 1
    if (n !== i + 1) {
      const root = held.replace('ane', '')
      if (!missed[held]) { setMissed({ ...missed, [held]: true }); return bad(setFb, n <= 4 ? `Not shelf ${i + 1}. ${held[0].toUpperCase() + held.slice(1)} is one of the four old names: meth 1, eth 2, prop 3, but 4.` : `Not shelf ${i + 1}. Count the Greek root: ${root}- = ?`) }
      return bad(setFb, `${held[0].toUpperCase() + held.slice(1)} has ${n} carbons, so it goes on shelf ${n}.`)
    }
    const next = slots.map((s, k) => (k === i ? held : s))
    setSlots(next); setHeld(null); sfx('pickup'); setFb(null)
    if (next.every(Boolean)) good(setFb, 'All ten shelved, methane to decane.', done)
  }
  return (
    <div>
      <h2>The Shelf of Ten</h2>
      <p className="ins">Pick up a book, then click the shelf for its number of carbons. These ten names are the roots of every name in the labyrinth. <span className="cite">§3.2</span></p>
      <div className="shelf-books">{books.filter((b) => !slots.includes(b)).map((b) => <button key={b} className={'book' + (held === b ? ' sel' : '')} onClick={() => { setHeld(b); setFb(null) }}>{b}</button>)}</div>
      <div className="shelf-row">{slots.map((s, i) => <button key={i} className={'shelf-slot' + (s ? ' full' : '')} onClick={() => place(i)}><span className="n">C{i + 1}H{2 * (i + 1) + 2}</span>{s || ''}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 3-1 The Family Register (§3.1, Table 3.1): what to look for before sorting the spirits
export function Families({ done }) {
  return (
    <div>
      <h2>The Family Register</h2>
      <p className="ins">Each crest at the far end is a family. Carry each spirit (E to pick up, E at a crest to place it) to the crest whose group it carries. Big or small doesn't matter, only the group. <span className="cite">§3.1</span></p>
      <div className="fam-grid">
        <div><b>Alkene</b><span>C=C</span></div>
        <div><b>Alcohol</b><span>C–O–H</span></div>
        <div><b>Ether</b><span>C–O–C</span></div>
        <div><b>Amine</b><span>C–N</span></div>
      </div>
      <button className="go" onClick={() => { sfx('right'); done() }}>Start sorting</button>
    </div>
  )
}

// ---------- 3-2a The Isomer Garden: build every C₅H₁₂ skeleton (§3.2)
const GW = 7, GH = 5
const mk = (n, edges) => { const a = [...Array(n)].map(() => []); edges.forEach(([x, y]) => { a[x].push(y); a[y].push(x) }); return a }
const C5 = [
  { name: 'pentane', code: treeCode(mk(5, [[0, 1], [1, 2], [2, 3], [3, 4]])) },
  { name: '2-methylbutane (isopentane)', code: treeCode(mk(5, [[0, 1], [1, 2], [2, 3], [1, 4]])) },
  { name: '2,2-dimethylpropane (neopentane)', code: treeCode(mk(5, [[0, 1], [0, 2], [0, 3], [0, 4]])) },
]
export function Isomers({ done }) {
  const [cells, setCells] = useState([])
  const [found, setFound] = useState(() => getState().save.t3isomers || [])
  const [fb, setFb] = useState(null)
  const key = (x, y) => x + ',' + y
  const has = (x, y) => cells.some((c) => c[0] === x && c[1] === y)
  const toggle = (x, y) => {
    setFb(null)
    if (has(x, y)) { setCells(cells.filter((c) => !(c[0] === x && c[1] === y))); return }
    if (cells.length >= 5) return bad(setFb, 'C₅H₁₂ has exactly five carbons. Remove one first.')
    setCells([...cells, [x, y]])
  }
  const plant = () => {
    if (cells.length !== 5) return bad(setFb, `C₅H₁₂ needs five carbons; you placed ${cells.length}.`)
    const idx = new Map(cells.map((c, i) => [key(c[0], c[1]), i]))
    const adj = cells.map(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => idx.get(key(x + dx, y + dy))).filter((v) => v !== undefined))
    const why = checkSkeleton(adj)
    if (why) return bad(setFb, why)
    const iso = C5.find((c) => c.code === treeCode(adj))
    if (found.includes(iso.name)) return bad(setFb, `That's ${iso.name} again — just drawn differently. Same connections, same compound (§3.2, Fig 3.3).`)
    const next = [...found, iso.name]
    setFound(next); setCells([]); saveGame({ t3isomers: next })
    if (next.length === 3) good(setFb, 'Three isomers, and no more exist: pentane, isopentane and neopentane share C₅H₁₂ but differ in how the carbons connect — constitutional isomers.', done, 2400)
    else { sfx('right'); setFb({ ok: true, text: `New isomer: ${iso.name}! A hedge grows in the garden. ${3 - next.length} to go.` }) }
  }
  return (
    <div>
      <h2>The Isomer Garden</h2>
      <p className="ins">Click squares to place five carbons, bonded side by side. Hydrogens are implied. Plant every different skeleton of C₅H₁₂. Turning or bending one doesn't make a new one. <span className="cite">§3.2</span></p>
      <div className="iso-wrap">
        <div className="iso-grid" style={{ gridTemplateColumns: `repeat(${GW}, 34px)` }}>
          {[...Array(GH)].map((_, y) => [...Array(GW)].map((_, x) => {
            const on = has(x, y)
            const bondR = on && has(x + 1, y), bondD = on && has(x, y + 1)
            return <button key={key(x, y)} className={'iso-cell' + (on ? ' on' : '')} onClick={() => toggle(x, y)}>{on ? 'C' : ''}{bondR && <i className="b-r" />}{bondD && <i className="b-d" />}</button>
          }))}
        </div>
        <ul className="iso-found">{C5.map((c) => <li key={c.name} className={found.includes(c.name) ? 'got' : ''}>{found.includes(c.name) ? '✓ ' + c.name : '· · ·'}</li>)}</ul>
      </div>
      <button className="go" onClick={plant}>Plant it</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 3-2b Badge the carbons: 1°, 2°, 3°, 4° (§3.3)
const BADGE_MOLS = [
  { name: '2-methylbutane', atoms: [[20, 60], [60, 40], [100, 60], [140, 40], [60, 5]], bonds: [[0, 1], [1, 2], [2, 3], [1, 4]] },
  { name: '2,2-dimethylpropane', atoms: [[80, 45], [35, 45], [125, 45], [80, 8], [80, 82]], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
]
export function Badges({ done }) {
  const [marks, setMarks] = useState(BADGE_MOLS.map((m) => m.atoms.map(() => 0)))
  const [fb, setFb] = useState(null)
  const [bad1, setBad1] = useState(null) // [mol, atom] of the carbon to look at again
  const deg = (m, i) => m.bonds.filter((b) => b.includes(i)).length
  const cycle = (mi, ai) => { setFb(null); setMarks((mk) => mk.map((r, k) => (k === mi ? r.map((v, j) => (j === ai ? (v % 4) + 1 : v)) : r))) }
  const check = () => {
    for (let mi = 0; mi < BADGE_MOLS.length; mi++) for (let ai = 0; ai < BADGE_MOLS[mi].atoms.length; ai++) {
      const d = deg(BADGE_MOLS[mi], ai)
      if (marks[mi][ai] !== d) { setBad1([mi, ai]); return bad(setFb, marks[mi][ai] === 0 ? 'Badge every carbon.' : `In ${BADGE_MOLS[mi].name}, count the red-ringed carbon\'s carbon neighbours again (ignore hydrogens).`) }
    }
    setBad1(null)
    good(setFb, 'Every carbon badged. Primary, secondary, tertiary, quaternary: just count its carbon neighbours. Later chapters show these classes react differently.', done, 2200)
  }
  const ORD = ['?', '1°', '2°', '3°', '4°']
  return (
    <div>
      <h2>Badge the Carbons</h2>
      <p className="ins">Click each carbon to set its class: <b>1°</b> bonded to one other carbon, <b>2°</b> to two, <b>3°</b> to three, <b>4°</b> to four. <span className="cite">§3.3</span></p>
      <div className="badge-row">
        {BADGE_MOLS.map((m, mi) => (
          <div key={m.name} className="badge-mol">
            <svg viewBox="0 0 160 90" width="240" height="135">
              {m.bonds.map(([a, b], k) => <line key={k} x1={m.atoms[a][0]} y1={m.atoms[a][1]} x2={m.atoms[b][0]} y2={m.atoms[b][1]} stroke="#cfd6e0" strokeWidth="3" />)}
              {m.atoms.map(([x, y], ai) => <g key={ai} onClick={() => cycle(mi, ai)} style={{ cursor: 'pointer' }}><circle cx={x} cy={y} r="11" fill={marks[mi][ai] ? ['', '#6fe39a', '#7ad8ff', '#ffd760', '#ff8a6a'][marks[mi][ai]] : '#2a2f3a'} stroke={bad1 && bad1[0] === mi && bad1[1] === ai ? '#ff3a3a' : '#fff'} strokeWidth={bad1 && bad1[0] === mi && bad1[1] === ai ? 3.5 : 1.5} /><text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#111">{ORD[marks[mi][ai]]}</text></g>)}
            </svg>
            <span>{m.name}</span>
          </div>
        ))}
      </div>
      <button className="go" onClick={check}>Check the badges</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 3-3 The Naming Laws (§3.4): read before walking the maze
export function NamingRules({ done }) {
  return (
    <div>
      <h2>The Naming Laws</h2>
      <p className="ins">The floors ahead are carbon skeletons drawn in root-stone. Step onto an end stone and walk along the bonds to another end. That walk is your parent chain. <span className="cite">§3.4</span></p>
      <ol className="law-list">
        <li><b>Longest chain:</b> it may turn corners. Count every stone.</li>
        <li><b>Start at the end nearer the first branch,</b> so the branch gets the lowest number.</li>
        <li><b>Stay on the roots:</b> the floor between them is a chasm.</li>
      </ol>
      <button className="go" onClick={() => { sfx('right'); done() }}>I'll walk it</button>
    </div>
  )
}

// ---------- 3-3b Speak the true name: assemble 4-ethyl-2-methyloctane (§3.4 steps 3–4)
const TILES = ['2-', '4-', '5-', '7-', 'methyl', 'ethyl', 'propyl', 'di', '-', 'octane', 'heptane']
export function NameTiles({ done }) {
  const tiles = useMemo(() => shuffle(TILES, 11), [])
  const [seq, setSeq] = useState([])
  const [fb, setFb] = useState(null)
  const check = () => {
    const s = seq.join('')
    if (s === '4-ethyl-2-methyloctane') return good(setFb, '4-Ethyl-2-methyloctane. Parent from the longest chain, numbers from the nearer end, ethyl before methyl because e comes before m.', done, 2400)
    if (seq.includes('heptane')) return bad(setFb, 'Count your walk again: the parent chain has eight carbons, so the parent is octane.')
    if (seq.includes('5-') || seq.includes('7-')) return bad(setFb, 'Those numbers come from the wrong end. Number from the end nearer the first branch, as you walked.')
    if (seq.includes('di')) return bad(setFb, 'di- is for two of the same group. Here the two branches are different.')
    if (seq.includes('propyl')) return bad(setFb, 'The branch on C4 has two carbons, so it is ethyl, not propyl.')
    if (s === '2-methyl-4-ethyloctane') return bad(setFb, 'Right pieces, wrong order: list substituents alphabetically — ethyl before methyl.')
    return bad(setFb, 'One word: each substituent as number-name (alphabetical), joined by hyphens, then the parent.')
  }
  return (
    <div>
      <h2>The Chain's True Name</h2>
      <p className="ins">Name the skeleton you just walked, from your own numbering. Click tiles in order. <span className="cite">§3.4</span></p>
      <div className="tile-out">{seq.length ? seq.join('') : <i>…</i>}</div>
      <div className="tiles">{tiles.map((t, i) => <button key={i} onClick={() => { setSeq([...seq, t]); setFb(null) }}>{t}</button>)}</div>
      <div className="tile-ctl"><button onClick={() => setSeq(seq.slice(0, -1))}>⌫ Undo</button><button onClick={() => setSeq([])}>Clear</button></div>
      <button className="go" onClick={check}>Speak the name</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- The Newman Lantern's first lesson: turn ethane, read the energy (§3.6)
export function NewmanPractice({ done }) {
  const [a, setA] = useState(0)
  const [fb, setFb] = useState(null)
  const turn = (d) => { setA((x) => x + d); setFb(null); sfx('stance') }
  const hold = () => {
    if (conformerName('ethane', a) === 'staggered') good(setFb, `Staggered: the lowest. Eclipsed is ${CONFORMERS.ethane.barrier} kJ/mol higher — torsional strain.`, done, 2600)
    else bad(setFb, 'Eclipsed: each back H hides behind a front H, 12 kJ/mol higher. Turn 60° either way.')
  }
  return (
    <div>
      <h2>The Newman Lantern</h2>
      <p className="ins">Look down the C–C bond of ethane. The front carbon's bonds meet in the centre; the back carbon's start at the circle. Turn the back carbon and hold it where the energy is lowest. <span className="cite">§3.6</span></p>
      <div className="nm-row center"><NewmanSvg kind="ethane" angle={a} size={170} /><EnergyBar kind="ethane" angle={a} /></div>
      <p className="nm-name">{conformerName('ethane', a)}</p>
      <div className="tile-ctl"><button onClick={() => turn(-60)}>⟲ −60° (Shift+G)</button><button onClick={() => turn(60)}>+60° (G) ⟳</button></div>
      <button className="go" onClick={hold}>Hold it here</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- The shard's question: why anti? (§3.7)
const BQ = [
  ['a', 'Torsional strain: some of its bonds are eclipsed'],
  ['b', 'Steric strain: the two CH₃ groups are close enough to crowd each other'],
  ['c', 'The two CH₃ groups start to bond to each other'],
]
export function ButaneCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'b') return good(setFb, 'Steric strain: 60° apart, the CH₃ groups crowd. Anti keeps them farthest apart — the lowest energy.', done, 3000)
    if (id === 'a') return bad(setFb, 'Gauche is staggered — nothing is eclipsed, so there is no torsional strain. Something else costs the 3.8 kJ/mol.')
    bad(setFb, 'They don\'t bond. Bonding would lower the energy; gauche costs energy.')
  }
  return (
    <div>
      <h2>Iupaca's Question</h2>
      <p className="ins">The Serpent rested at anti. Gauche butane is staggered too, yet it sits 3.8 kJ/mol higher. Why? <span className="cite">§3.7</span></p>
      <div className="res-opts">{BQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
