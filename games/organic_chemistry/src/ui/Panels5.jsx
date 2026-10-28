import { useMemo, useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { TETRA, configOf, LOCKS, ROTATIONS, observed, GROUP_COLOR } from '../chem/rules5'

// Trial panels for World 5, the Mirror Palace (book Chapter 5). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

// ---------- Prep: Sister Tartara's crystals — sort by handedness, as Pasteur did (§5.4, Fig 5.7)
// Each crystal is a hexagonal outline with one extra facet cut on a corner; the cut is on the left or the right
// of the top edge. A crystal can be turned any way in the tray — turning never changes its hand; only a mirror does.
const CRYSTALS = [...Array(8)].map((_, i) => ({ id: i, hand: [1, -1, -1, 1, 1, -1, 1, -1][i], rot: [0, 50, 160, 220, 300, 110, 25, 260][i] }))
const spin = {} // a crystal put in the wrong tray comes back turned a new way, so guessing twice doesn't work
function CrystalSvg({ hand, rot, size = 84 }) {
  // hexagon, with a small triangular facet cut beside the top-right (hand 1) or top-left (hand −1) corner
  const pts = [...Array(6)].map((_, k) => { const a = (k / 6) * Math.PI * 2 - Math.PI / 2; return [Math.cos(a) * 24, Math.sin(a) * 30] })
  const corner = pts[hand > 0 ? 1 : 5]
  return (
    <svg viewBox="-34 -36 68 72" width={size} height={size}>
      <g transform={`rotate(${rot})`}>
        <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="#dfeaf6" stroke="#5a6a8a" strokeWidth="2" />
        <polygon points={`${corner[0]},${corner[1]} ${corner[0] * 0.35},${corner[1] * 0.6} ${corner[0] * 0.8},${corner[1] * 0.1}`} fill="#ffd060" stroke="#8a6a20" strokeWidth="1.5" />
        <line x1="0" y1="-30" x2="0" y2="30" stroke="#9aa8c0" strokeWidth="1" strokeDasharray="3 3" />
      </g>
    </svg>
  )
}
export function PasteurCrystals({ done }) {
  const [tray, setTray] = useState({})
  const [held, setHeld] = useState(null)
  const [stage, setStage] = useState('sort')
  const [fb, setFb] = useState(null)
  const misses = useRef(0)
  const place = (side) => {
    if (held === null) return
    const c = CRYSTALS[held]
    // the left tray takes the crystals whose facet sits LEFT of the long axis when the crystal stands upright
    if ((side === 'L') !== (c.hand < 0)) { spin[held] = ((spin[held] || 0) + 97 + Math.floor(Math.random() * 120)) % 360; setHeld(null); misses.current += 1; if (misses.current >= 2) { misses.current = 0; setTray({}); return bad(setFb, 'Two wrong trays: the crystals tumble out, every one. Stand each upright in your head first: which side is the gold facet?') } return bad(setFb, 'Wrong tray: it slides back, turned a new way. Turning never changes its hand.') }
    const next = { ...tray, [held]: side }
    misses.current = 0; setTray(next); setHeld(null); setFb(null); sfx('pickup')
    if (Object.keys(next).length === CRYSTALS.length) { sfx('right'); setStage('ask') }
  }
  if (stage === 'ask') {
    const pick = (id) => {
      if (id === 'b') return good(setFb, 'Yes. Pasteur found exactly that: the two solutions rotated plane-polarized light by the same amount, in opposite directions. Enantiomers differ in nothing else.', done, 3600)
      if (id === 'a') return bad(setFb, 'They are mirror images: every physical property is the same except the direction of rotation.')
      bad(setFb, 'Each pile alone is a single enantiomer, and single enantiomers are optically active.')
    }
    return (
      <div>
        <h2>Sister Tartara's crystals</h2>
        <p className="ins">Two piles, mirror images of each other. Dissolve each in water and shine plane-polarized light through it. What happens? <span className="cite">§5.4</span></p>
        <div className="res-opts">
          <button onClick={() => pick('a')}>The left pile rotates light much more than the right</button>
          <button onClick={() => pick('b')}>Both rotate light by the same amount, in opposite directions</button>
          <button onClick={() => pick('c')}>Neither rotates light at all</button>
        </div>
        <Feedback fb={fb} />
      </div>
    )
  }
  return (
    <div>
      <h2>Sister Tartara's crystals</h2>
      <p className="ins">Like Pasteur in 1848: pick up each crystal and put it in the tray for its hand. Stand it upright, its long point up: a left-handed crystal has its gold facet left of that point; a right-handed one, right. They come in turned every which way. <span className="cite">§5.4, Fig 5.7</span></p>
      <div className="crys-row">{CRYSTALS.filter((c) => !tray[c.id] && tray[c.id] !== 0).map((c) => <button key={c.id} className={'crys' + (held === c.id ? ' sel' : '')} onClick={() => { setHeld(c.id); setFb(null) }}><CrystalSvg hand={c.hand} rot={c.rot + (spin[c.id] || 0)} /></button>)}</div>
      <div className="crys-trays">
        {['L', 'R'].map((side) => <button key={side} className="crys-tray" onClick={() => place(side)}><b>{side === 'L' ? 'Left-handed' : 'Right-handed'}</b><span>{CRYSTALS.filter((c) => tray[c.id] === side).map((c) => <CrystalSvg key={c.id} hand={c.hand} rot={0} size={30} />)}</span></button>)}
      </div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 5-2 The polarimeter (§5.3, Table 5.1, Worked Example 5.2)
export function Polarimeter({ done }) {
  const [step, setStep] = useState(0)
  const [ang, setAng] = useState(0)
  const [len, setLen] = useState(1)
  const [conc, setConc] = useState(0.05)
  const [ans, setAns] = useState('')
  const [fb, setFb] = useState(null)
  // step 0: an unknown at c = 0.05 g/mL; find α with the analyzer, compute [α] yourself, then name it
  const pool = ROTATIONS.filter((r) => Math.abs(r.a) >= 15 && Math.abs(r.a) <= 140 && r.name !== 'Sucrose')
  const roll = () => pool[Math.floor(Math.random() * pool.length)]
  const [unknownR, setUnknownR] = useState(roll)
  const [specOk, setSpecOk] = useState(false)
  const misses = useRef(0)
  const unknown = unknownR.a
  const [spec, setSpec] = useState('')
  const alpha = step === 0 ? observed(unknown, len, 0.05) : observed(66.47, len, conc)
  // the light is brightest only within a fraction of a degree of α: you have to hunt for it
  const light = Math.exp(-Math.pow((ang - alpha) / 0.6, 2))
  const name = () => {
    if (Math.abs(ang - alpha) > 0.1) return bad(setFb, 'The light isn’t at its brightest yet: turn the analyzer until the meter peaks, and read α off it.')
    const v = parseFloat(spec.replace('−', '-'))
    const want = +(ang / (len * 0.05)).toFixed(1)
    if (!specOk) {
      if (!isFinite(v) || Math.abs(v - want) > Math.max(2, Math.abs(want) * 0.03)) {
        misses.current += 1
        if (misses.current >= 2) { misses.current = 0; setUnknownR(roll()); setAng(0); setSpec(''); return bad(setFb, 'The tube clouds and is refilled: a new unknown. [α]D = α ÷ (l × c). Read α again.') }
        return bad(setFb, `[α]D = α / (l × c): your reading ÷ (${len} dm × 0.05 g/mL). One more try.`)
      }
      setSpecOk(true); sfx("pickup"); setFb({ ok: true, text: `[α]D ≈ ${want}. Now find it in Table 5.1.` }); return
    }
    const guess = ROTATIONS.find((r) => r.name === ans)
    if (!guess) return bad(setFb, 'Now pick the compound whose specific rotation matches yours.')
    if (guess.a !== unknown) return bad(setFb, `Your [α] is about ${want}. ${guess.name}’s is ${guess.a}. Look again in Table 5.1.`)
    sfx('right'); setFb({ ok: true, text: `${guess.name}: [α]D = ${alpha} / (${len} × 0.05) = ${unknown}. ${unknown < 0 ? 'Levorotatory (−).' : 'Dextrorotatory (+).'}` }); setTimeout(() => { setFb(null); setStep(1); setAng(0); setLen(1); setConc(0.2) }, 2600)
  }
  const target = 6.65
  const check2 = () => {
    if (Math.abs(alpha - target) > 0.01) return bad(setFb, `Sucrose's [α] is +66.47, so α = 66.47 × l × c. You'd get ${alpha}°. The window wants +${target}°.`)
    good(setFb, `α = 66.47 × ${len} × ${conc} = +${target}°. The window opens. Longer tube or stronger solution, more rotation.`, done, 2600)
  }
  return (
    <div>
      <h2>The Polarized Window</h2>
      <p className="ins">{step === 0 ? 'An unknown in the tube, 0.05 g/mL. Choose a tube length, turn the analyzer until the meter peaks (that angle is α), work out [α]D = α / (l × c) yourself, then name it from Table 5.1.' : 'Now the window itself: it opens at α = +6.65° with sucrose ([α]D = +66.47). Pick the tube and the concentration.'} <span className="cite">§5.3</span></p>
      <div className="polar">
        <div><div className="polar-light" style={{ opacity: step === 0 ? 0.08 + 0.92 * light : 0.6 }} />{step === 0 && <div className="small">light meter: {(light * 100).toFixed(1)}%</div>}</div>
        <div className="polar-ctrl">
          <label>tube l: {[0.5, 1, 2].map((l) => <button key={l} className={len === l ? 'sel' : ''} disabled={step === 0 && specOk} onClick={() => setLen(l)}>{l} dm</button>)}</label>
          {step === 0 && <label>analyzer: <input type="range" min="-20" max="20" step="0.05" disabled={specOk} value={ang} onChange={(e) => setAng(+e.target.value)} /> <b>{ang.toFixed(2)}°</b></label>}
          {step === 1 && <label>concentration c: {[0.05, 0.1, 0.2].map((c) => <button key={c} className={conc === c ? 'sel' : ''} onClick={() => setConc(c)}>{c} g/mL</button>)}</label>}
          {step === 0 && <label>your [α]D: <input value={spec} disabled={specOk} onChange={(e) => setSpec(e.target.value)} placeholder="e.g. −31.5" style={{ width: 80 }} /></label>}
          {step === 0 && !specOk && <button className="go" onClick={name}>Check my [α]</button>}
          {step === 0 && specOk && <label>it is: <select value={ans} onChange={(e) => setAns(e.target.value)}><option value="">…</option>{ROTATIONS.map((r) => <option key={r.name} value={r.name}>{r.name} ({r.a > 0 ? '+' : ''}{r.a})</option>)}</select> <button className="go" onClick={name}>Name it</button></label>}
          {step === 1 && <button className="go" onClick={check2}>Set the window</button>}
        </div>
      </div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 5-3 / 5-5 a chirality-centre lock: rank, then read the wheel (§5.5, Figs 5.8–5.10)
export function CipLock({ done, lockId, place, want }) {
  const L = LOCKS.find((x) => x.id === lockId)
  const [order, setOrder] = useState([])
  const [fb, setFb] = useState(null)
  const [stage, setStage] = useState('rank')
  const [misses, setMisses] = useState(0)
  const cfg = configOf(place, L.rank)
  // the view with the lowest group pointing away: the three others round the centre as the viewer sees them
  const view = useMemo(() => {
    const low = place.findIndex((g) => L.rank[g] === 4)
    const v4 = TETRA[low]
    const up = Math.abs(v4[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
    const sub = (a, b, k) => a.map((x, i) => x - b[i] * k)
    const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    const n = v4.map((x) => -x) // towards the viewer
    let ex = cr(up, n); const l = Math.hypot(...ex); ex = ex.map((x) => x / l)
    const ey = cr(n, ex)
    return place.map((g, i) => (i === low ? null : { g, x: dot(sub(TETRA[i], n, dot(TETRA[i], n)), ex), y: dot(sub(TETRA[i], n, dot(TETRA[i], n)), ey) })).filter(Boolean)
  }, [place, L])
  const click = (g) => {
    if (stage !== 'rank' || order.includes(g)) return
    const next = [...order, g]
    if (L.rank[g] !== next.length) { const m = misses + 1; setMisses(m); bad(setFb, m < 2 ? `Not ${next.length === 1 ? 'first' : 'next'}. Compare the atoms bonded straight to the centre: higher atomic number wins. Tied? Look one atom further out.` : `Not ${next.length === 1 ? 'first' : 'next'}. ${L.why}`); setOrder([]); return }
    setOrder(next); setFb(null); sfx('pickup')
    if (next.length === 4) { sfx('right'); setStage('turn') }
  }
  const turn = (dir) => {
    const said = dir === 'cw' ? 'R' : 'S'
    if (said !== cfg) { setOrder([]); setStage('rank'); return bad(setFb, 'The wheel locks up and resets. With the lowest group pointing away from you, follow 1 → 2 → 3: which way does it really go?') }
    sfx('pickup'); setFb({ ok: true, text: `${said}. Now: the lock wants ${want}. Does it open as it is?` }); setStage('decide')
  }
  const decide = (open) => {
    if (open !== (cfg === want)) return bad(setFb, open ? `It’s ${cfg} and the lock wants ${want}: not as it is.` : `It’s already ${cfg}, which is what the lock wants. Reflecting would make it ${cfg === 'R' ? 'S' : 'R'}.`)
    good(setFb, open ? `${cfg}: it opens.` : `Right: reflect the centre in the Mirror Shield (G). Its mirror image is ${want}.`, () => done(), 2400)
  }
  return (
    <div>
      <h2>{L.name} · the steering wheel</h2>
      <p className="ins">{stage === 'rank' ? 'Rank the four groups: click them from highest priority (1) to lowest (4). Higher atomic number first; if tied, look at the next atoms out; a double bond counts its atom twice.' : 'Now look with the lowest group (4) pointing away from you. Does 1 → 2 → 3 turn clockwise or counterclockwise?'} <span className="cite">§5.5</span></p>
      <div className="cip">
        <svg viewBox="-100 -100 200 200" className="cip-svg">
          <circle r="10" fill="#3a3650" />
          {view.map((v) => {
            const x = v.x * 70, y = -v.y * 70, k = order.indexOf(v.g)
            return (
              <g key={v.g} onClick={() => click(v.g)} style={{ cursor: 'pointer' }}>
                <line x1="0" y1="0" x2={x} y2={y} stroke="#c8c0e8" strokeWidth="4" />
                <circle cx={x} cy={y} r="22" fill={GROUP_COLOR[v.g] || '#ccc'} stroke="#fff" strokeWidth="2" />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1a1428">{v.g}</text>
                {k >= 0 && stage === 'turn' && <text x={x * 1.45} y={y * 1.45 + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="#ffd760">{k + 1}</text>}
              </g>
            )
          })}
          {/* the lowest group, pointing away (dashed) */}
          {(() => { const lg = place.find((g) => L.rank[g] === 4); return <g onClick={() => click(lg)} style={{ cursor: 'pointer' }}><circle r="17" cx="0" cy="0" fill="rgba(0,0,0,0.01)" stroke="#9aa8c0" strokeDasharray="4 3" /><text x="0" y="-26" textAnchor="middle" fontSize="12" fill="#c8d0e8">{lg} (away)</text></g> })()}
        </svg>
        <div className="cip-side">
          <div className="cip-order">{order.map((g, i) => <span key={g}>{i + 1}. {g}</span>)}</div>
          {stage === 'turn' && <div className="res-opts"><button onClick={() => turn('cw')}>Clockwise → R</button><button onClick={() => turn('ccw')}>Counterclockwise → S</button></div>}
          {stage === 'decide' && <div className="res-opts"><button onClick={() => decide(true)}>It opens as it is</button><button onClick={() => decide(false)}>It needs reflecting</button></div>}
          {stage === 'rank' && <button onClick={() => { setOrder([]); setFb(null) }}>Start again</button>}
        </div>
      </div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Sister Tartara's question (§5.8, Figs 5.13–5.14)
const KQ = [
  ['b', 'With achiral methylamine, the two salts have different solubilities, so they separate.'],
  ['c', 'Racemic mixtures can’t be separated; each enantiomer has to be made from scratch.'],
  ['a', 'With achiral methylamine, the two salts are mirror images: same properties, no separation.'],
]
export function KingCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. Only a single-enantiomer partner, like (R)-1-phenylethylamine, gives R,R and S,R salts: diastereomers, with different properties. Separate them, then take the amine away (Fig 5.14).', done, 4400)
    if (id === 'b') return bad(setFb, 'An achiral partner treats both enantiomers identically, so the two salts are still mirror images (Fig 5.13).')
    bad(setFb, 'They can: that is resolution. What turned the King\'s halves into two different things?')
  }
  return (
    <div>
      <h2>Sister Tartara's Question</h2>
      <p className="ins">The King's halves only came apart with a single-handed glove. In the lab, which of these is true about resolving racemic lactic acid? <span className="cite">§5.8</span></p>
      <div className="res-opts">{KQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
