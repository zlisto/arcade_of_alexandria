import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { judgeNumbering, locantsFor, RING_NAMES } from '../chem/rules4'

// Trial panels for World 4, the Chair Fortress (book Chapter 4). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1800) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }
const LABEL = { methyl: 'CH₃', ethyl: 'CH₂CH₃', bromo: 'Br', chloro: 'Cl' }

// ---------- Prep: Lady Sachse's Banner Rings — numbering and naming substituted cycloalkanes (§4.1)
const RINGS = [
  { n: 6, subs: { 0: 'methyl', 2: 'methyl' } },
  { n: 5, subs: { 0: 'methyl', 1: 'ethyl' } },
  { n: 6, subs: { 0: 'ethyl', 2: 'methyl', 4: 'methyl' } },
  { parent: true, q: 'A cyclopropane ring with a four-carbon chain on it. Which name follows Step 1?', opts: [['a', '1-Cyclopropylbutane'], ['b', 'Butylcyclopropane']], right: 'a',
    yes: 'Right: the chain (4 C) is bigger than the ring (3 C), so the chain is the parent and the ring is a cyclopropyl substituent.',
    no: 'Count first: the ring has 3 carbons, the chain 4. When the substituent is bigger than the ring, the chain is the parent.' },
]

function RingDraw({ n, subs, start, dir, onPick }) {
  const R = 62, cx = 130, cy = 128
  const pts = [...Array(n)].map((_, k) => { const a = (k / n) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R, a] })
  const num = (k) => (start === null || dir === null ? null : ((((k - start) * dir) % n) + n) % n + 1)
  return (
    <svg viewBox="0 0 260 250" className="ring-svg">
      <polygon points={pts.map((p) => p[0] + ',' + p[1]).join(' ')} fill="none" stroke="#c8c0e8" strokeWidth="4" />
      {pts.map(([x, y, a], k) => (
        <g key={k} onClick={() => onPick(k)} style={{ cursor: 'pointer' }}>
          {subs[k] && <line x1={x} y1={y} x2={x + Math.cos(a) * 34} y2={y + Math.sin(a) * 34} stroke="#c8c0e8" strokeWidth="4" />}
          {subs[k] && <text x={x + Math.cos(a) * 52} y={y + Math.sin(a) * 52 + 6} textAnchor="middle" fill="#ffb0d8" fontSize="17" fontWeight="700">{LABEL[subs[k]]}</text>}
          <circle cx={x} cy={y} r="15" fill={k === start ? '#ffd760' : '#3a3458'} stroke="#e8e0ff" strokeWidth="2" />
          {num(k) && <text x={x} y={y + 5} textAnchor="middle" fill={k === start ? '#1a1428' : '#fff'} fontSize="17" fontWeight="800">{num(k)}</text>}
        </g>
      ))}
    </svg>
  )
}

// the name's pieces after a correct numbering: the right substituent chips and the parent, plus decoys
function chipsFor(n, list) {
  const groups = {}
  list.forEach(({ locant, sub }) => (groups[sub] = groups[sub] || []).push(locant))
  const MUL = ['', '', 'di', 'tri']
  const piece = (sub, ls) => (list.length === 1 ? sub : `${ls.join(',')}-${MUL[ls.length]}${sub}`)
  const right = Object.keys(groups).sort().map((sub) => piece(sub, groups[sub]))
  const decoys = Object.keys(groups).map((sub) => piece(sub, groups[sub].map((l) => (l === 1 ? 1 : n + 2 - l)))).filter((x) => !right.includes(x))
  // and a piece with the multiplier left off ("1,3-methyl"), so the player has to choose di- or tri- themselves
  Object.keys(groups).filter((sub) => groups[sub].length > 1).forEach((sub) => decoys.push(`${groups[sub].join(',')}-${sub}`))
  const parent = RING_NAMES[n], wrongParent = RING_NAMES[n === 6 ? 5 : 6]
  return { right, parent, chips: [...right, ...decoys, parent, wrongParent].sort((a, b) => (a.length * 7 + a.charCodeAt(1)) % 5 - (b.length * 7 + b.charCodeAt(1)) % 5) }
}

export function RingNames({ done }) {
  const [i, setI] = useState(0)
  const [start, setStart] = useState(null)
  const [dir, setDir] = useState(null)
  const [stage, setStage] = useState('number') // number → name
  const [built, setBuilt] = useState([])
  const [fb, setFb] = useState(null)
  const r = RINGS[i]
  const next = () => { setFb(null); setStart(null); setDir(null); setStage('number'); setBuilt([]); if (i + 1 >= RINGS.length) done(); else setI(i + 1) }
  if (r.parent) {
    return (
      <div>
        <h2>The Banner Rings · {i + 1}/{RINGS.length}</h2>
        <p className="ins">{r.q} <span className="cite">§4.1, Step 1</span></p>
        <div className="res-opts">{r.opts.map(([id, t]) => <button key={id} onClick={() => (id === r.right ? good(setFb, r.yes, next, 2600) : bad(setFb, r.no))}>{t}</button>)}</div>
        <Feedback fb={fb} />
      </div>
    )
  }
  const pick = (k) => {
    if (stage !== 'number') return
    setFb(null)
    if (start === null || (dir !== null)) { setStart(k); setDir(null); return }
    if (k === start) { setStart(null); return }
    const d = ((k - start + r.n) % r.n) === 1 ? 1 : ((start - k + r.n) % r.n) === 1 ? -1 : null
    if (d === null) { bad(setFb, 'Carbon 2 must be next to carbon 1: click a neighbour to set the direction round the ring.'); return }
    setDir(d)
  }
  const check = () => {
    if (start === null || dir === null) return bad(setFb, 'Click a carbon to make it C1, then a neighbour to set the direction.')
    const res = judgeNumbering(r.n, r.subs, start, dir)
    if (!res.ok) return bad(setFb, res.why)
    sfx('right'); setFb({ ok: true, text: 'Numbered correctly. Now build the name: substituents in alphabetical order, the parent last.' }); setStage('name')
  }
  const list = start !== null && dir !== null && r.subs[start] !== undefined ? locantsFor(r.n, r.subs, start, dir) : []
  const C = stage === 'name' ? chipsFor(r.n, list) : null
  const tryName = () => {
    const want = C.right.join('-') + C.parent
    const got = built.slice(0, -1).join('-') + (built[built.length - 1] || '')
    if (got === want) return good(setFb, `Named: ${want}.`, next, 2200)
    if (built[built.length - 1] !== C.parent) return bad(setFb, 'The parent ring goes last, and it must match the ring’s size.')
    const bare = built.slice(0, -1).find((x) => /^[\d,]+,[\d]+-[a-z]/.test(x) && !/-(di|tri)/.test(x))
    if (bare) { const n = bare.split('-')[0].split(',').length; return bad(setFb, `Two of the same group take di-, three take tri-: ${bare.replace('-', n === 3 ? '-tri' : '-di')}, not ${bare}.`) }
    if (built.slice(0, -1).some((x) => !C.right.includes(x))) return bad(setFb, 'One of those pieces has numbers your numbering didn’t give. Read them off the ring.')
    if (built.length - 1 < C.right.length) return bad(setFb, 'A substituent is missing.')
    bad(setFb, 'Right pieces, wrong order: substituents go alphabetically (prefixes like di- and tri- don’t count).')
  }
  return (
    <div>
      <h2>The Banner Rings · {i + 1}/{RINGS.length}</h2>
      <p className="ins">{stage === 'number' ? 'Number the ring: click a carbon to make it C1, then a neighbour to go round that way. Start at a substituent; give the next one the lowest number you can; if it ties, the alphabet decides. Halogens count like alkyl groups.' : 'Build the name from the pieces: click them in order. Substituents alphabetically, then the parent.'} <span className="cite">§4.1</span></p>
      <div className="ring-wrap">
        <RingDraw n={r.n} subs={r.subs} start={start} dir={dir} onPick={pick} />
        <div className="ring-side">
          {stage === 'number' ? (<>
            <p className="small">parent: a ring of {r.n} carbons</p>
            <button className="go" onClick={check}>Check the numbering</button>
            <button onClick={() => { setStart(null); setDir(null); setFb(null) }}>Clear</button>
          </>) : (<>
            <div className="ring-name">{built.length ? built.slice(0, -1).concat(built.slice(-1)).join(' · ') : '…'}</div>
            <div className="chips">{C.chips.map((c) => <button key={c} disabled={built.includes(c)} onClick={() => setBuilt([...built, c])}>{c}</button>)}</div>
            <button className="go" onClick={tryName}>Name it</button>
            <button onClick={() => { setBuilt([]); setFb(null) }}>Clear</button>
          </>)}
        </div>
      </div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- Info stations: the lesson card is the content; this just starts the room
export function InfoCard({ done, title, text }) {
  return (
    <div>
      <h2>{title}</h2>
      <p className="ins">{text}</p>
      <button className="go" onClick={() => { sfx('right'); done() }}>Got it</button>
    </div>
  )
}

// ---------- 4-5: predict before you flip (§4.9, Fig 4.18, Problem 4-52)
export function DecalinPredict({ done, kind }) {
  const [fb, setFb] = useState(null)
  const [lock, setLock] = useState(false)
  const right = kind === 'cis' ? 'yes' : 'no'
  const pick = (a) => {
    if (lock) return
    if (a !== right) { setLock(true); setTimeout(() => setLock(false), 3000) }
    if (a === right) return good(setFb, kind === 'cis' ? 'Right: cis-decalin can ring-flip, both rings together.' : 'Right: trans-decalin is rigid. It cannot ring-flip (Problem 4-52).', done, 2200)
    bad(setFb, kind === 'cis' ? 'Look at its bridgehead H: on the same face, one axial and one equatorial, as in a cis-1,2 ring. That ring can flip. Try again.' : 'Look at its bridgehead H: on opposite faces. Picture each ring as a chair: where are the bonds that join the two rings, and where would a flip send them? Try again.')
  }
  return (
    <div>
      <h2>Before you flip</h2>
      <p className="ins">{kind}-Decalin is on the altar: bridgehead hydrogens {kind === 'cis' ? 'on the same face' : 'on opposite faces'}. Can this one ring-flip? <span className="cite">§4.9</span></p>
      <div className="res-opts"><button onClick={() => pick('yes')}>Yes, it can flip</button><button onClick={() => pick('no')}>No, it is locked</button></div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Lady Sachse's question (§4.7–4.8, Worked Example 4.3)
const TQ = [
  ['a', 'An axial tert-butyl is eclipsed with the bonds on its neighbouring carbons, adding torsional strain.'],
  ['b', 'An axial tert-butyl bumps the axial hydrogens on C3 and C5 of the same face.'],
  ['c', 'An axial tert-butyl forces its carbon’s bond angles away from 109.5°, adding angle strain.'],
]
export function TitanCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'b') return good(setFb, 'Exactly: 1,3-diaxial interactions (steric strain). A methyl pays 2 × 3.8 = 7.6 kJ/mol; a tert-butyl 2 × 11.4 = 22.8. That is why bulky groups take the equator, even if a chlorine must go axial instead.', done, 4600)
    if (id === 'a') return bad(setFb, 'In the chair every neighbouring bond is staggered, axial or not, so there is no torsional strain to add. Look at Fig 4.15: what is near an axial group?')
    bad(setFb, 'The chair keeps every angle near 111.5° whichever seat a group takes. The cost is crowding: what does an axial group bump into?')
  }
  return (
    <div>
      <h2>Lady Sachse's Question</h2>
      <p className="ins">The Titan sat on every equatorial seat and fell the moment it was forced axial. What made the axial seat so bad for a tert-butyl group? <span className="cite">§4.7–4.8</span></p>
      <div className="res-opts">{TQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
