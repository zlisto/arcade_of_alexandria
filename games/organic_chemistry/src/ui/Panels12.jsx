import { useRef, useState } from 'react'
import { sfx } from '../audio/sfx'
import { EM, HEXANE, LOSSES, SAMPLES, MS, msWindow, msRange, FAMILIES, BELLS, irBands, BEAMS_IR, BEAMS_OTHER, SORC_POOL, C2_NAME, shuffled, readMs, shown } from '../chem/rules12'

// Trial panels for World 12, the Observatory of Light (book Chapter 12). Same contract as Panels11.jsx: props.done()
// when solved. A wrong answer shows its rule, hands it to the scene through onWrong (it toasts it and takes half a
// heart), then closes the panel through fail. Options are shuffled once per mount.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = readMs(text)) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }
const miss = (setFb, text, onWrong, fail) => { bad(setFb, text); if (onWrong) onWrong(text); if (fail) setTimeout(fail, 1400) }

/** an IR spectrum: transmittance falls at each band (wavenumber runs 4000 → 400 left to right). No band is labelled:
 *  its position is read off the axis, as on a real chart */
export function IRChart({ bands }) {
  const x = (nu) => 24 + ((4000 - nu) / 3600) * 360
  const pts = []
  for (let nu = 4000; nu >= 400; nu -= 5) {
    let t = 1
    bands.forEach((b) => { t -= b.s * Math.exp(-Math.pow((nu - b.at) / (b.w / 2), 2)) })
    pts.push(`${x(nu).toFixed(1)},${(18 + (1 - Math.max(0.03, t)) * 112).toFixed(1)}`)
  }
  const major = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500]
  const minor = []
  for (let nu = 3900; nu > 400; nu -= 100) if (nu % 500) minor.push(nu)
  return (
    <svg viewBox="0 0 408 172" className="ir-svg">
      {major.map((nu) => <line key={'g' + nu} x1={x(nu)} y1="16" x2={x(nu)} y2="134" stroke="#2a3654" strokeWidth="1" />)}
      {minor.map((nu) => <line key={'m' + nu} x1={x(nu)} y1="130" x2={x(nu)} y2="134" stroke="#5a6a88" />)}
      <line x1="24" y1="18" x2="384" y2="18" stroke="#3a4a6a" strokeDasharray="3 3" />
      <line x1="24" y1="134" x2="384" y2="134" stroke="#5a6a88" />
      <polyline points={pts.join(' ')} fill="none" stroke="#9af0ff" strokeWidth="2" />
      {major.map((nu) => <text key={nu} x={x(nu)} y="150" textAnchor="middle" fill="#a8b8d8" fontSize="12">{nu}</text>)}
      <text x="204" y="168" textAnchor="middle" fill="#8090b0" fontSize="12">wavenumber (cm⁻¹) · dips are absorptions</text>
    </svg>
  )
}

/** a mass spectrum drawn as the book draws it: a bar graph of relative abundance (%) against m/z, between lo and hi.
 *  No bar is labelled: m/z is read off the axis. When every bar in the window is short, the window is magnified and
 *  says so (×k), as a real spectrum's expanded region does. pick(m) makes it clickable: a click snaps to the nearest bar
 *  of at least 3%. mark colours chosen bars; hl points an arrow at a bar to read. built: a † spectrum (see MS) */
export function MSChart({ peaks, lo, hi, pick, mark = {}, hl = null, built = false, label = null, width, compact = false }) {
  // compact: a small, large-print chart for a plaque's face in the world
  const W = compact ? 200 : 408, H = compact ? 124 : 172, L = compact ? 28 : 36, R = W - (compact ? 8 : 12), T = compact ? 10 : 16, B = H - (compact ? 34 : 38)
  const fs = compact ? 13 : 12
  const ref = useRef(null)
  const inR = peaks.filter(([m]) => m >= lo && m <= hi)
  const top = Math.max(1, ...inR.map((p) => p[1]))
  const k = top < 90 ? Math.max(1, Math.floor(95 / top)) : 1 // floor, so no magnified bar is clipped into a false twin
  const span = hi - lo
  const x = (m) => L + ((m - lo) / span) * (R - L)
  const yv = (pct) => B - (Math.min(100, pct) / 100) * (B - T)
  const minor = span <= 20 ? 1 : 5, major = span <= 20 ? 2 : span <= 100 ? 10 : 20
  const ticks = []
  for (let m = Math.ceil(lo / minor) * minor; m <= hi; m += minor) ticks.push(m)
  const bw = span <= 20 ? 8 : 2.6
  const click = (e) => {
    if (!pick || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const mz = lo + ((((e.clientX - r.left) / r.width) * W - L) / (R - L)) * span
    // nearest bar, with a slight pull toward taller ones, so a click a hair off a tall bar doesn't land on a stub beside it
    let best = null, bs = 1e9
    inR.forEach(([m, v]) => { const d = Math.abs(m - mz), sc = d - 0.5 * Math.min(1, (v * k) / 100); if (v * k >= 3 && d <= Math.max(2, span / 40) && sc < bs) { best = m; bs = sc } })
    if (best !== null) pick(best)
  }
  const hp = hl !== null ? inR.find(([m]) => m === hl) : null
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="ir-svg" onClick={click} style={{ ...(pick ? { cursor: 'crosshair' } : {}), ...(width ? { width, maxWidth: width, margin: 0 } : {}) }}>
      {[20, 40, 60, 80, 100].map((v) => <line key={'g' + v} x1={L} y1={yv(v)} x2={R} y2={yv(v)} stroke="#232c48" />)}
      <line x1={L} y1={B} x2={R} y2={B} stroke="#5a6a88" />
      <line x1={L} y1={T - 4} x2={L} y2={B} stroke="#5a6a88" />
      {(compact ? [0, 100] : [0, 50, 100]).map((v) => <text key={'y' + v} x={L - 4} y={yv(v) + 4} textAnchor="end" fill="#a8b8d8" fontSize={fs - 1}>{v}</text>)}
      {ticks.map((m) => <line key={'t' + m} x1={x(m)} y1={B} x2={x(m)} y2={B + (m % major ? 4 : 8)} stroke="#5a6a88" />)}
      {ticks.filter((m) => m % major === 0).map((m) => <text key={'l' + m} x={x(m)} y={B + (compact ? 20 : 21)} textAnchor="middle" fill="#c8d4ee" fontSize={fs + 1}>{m}</text>)}
      {inR.map(([m, v]) => <line key={'b' + m} x1={x(m)} y1={B} x2={x(m)} y2={yv(v * k)} stroke={mark[m] || (hl === m ? '#ffd27a' : '#9af0ff')} strokeWidth={compact ? 6 : bw} />)}
      {hp && <polygon points={`${x(hl) - 7},${yv(hp[1] * k) - 14} ${x(hl) + 7},${yv(hp[1] * k) - 14} ${x(hl)},${yv(hp[1] * k) - 4}`} fill="#ffd27a" />}
      {label && <text x={R - 4} y={T + 4} textAnchor="end" fill="#e8d8a8" fontSize="14">{label}</text>}
      <text x={(L + R) / 2} y={H - 3} textAnchor="middle" fill="#8090b0" fontSize={fs - 1}>{compact ? `m/z${k > 1 ? ` · ×${k}` : ''}${built ? ' · † built' : ''}` : `m/z · height = relative abundance (%)${k > 1 ? ` · magnified ×${k}` : ''}${built ? ' · † built' : ''}`}</text>
    </svg>
  )
}
/** a spectrum by its MS key: the whole range, or (win) the M⁺ region */
export function MSOf({ id, win, quiet = false, ...rest }) {
  // quiet: hold back the † built tag (the boss names it after the round, so the tag can't single out an answer)
  const S = MS[id]
  const [lo, hi] = win || msRange(S.M)
  return <MSChart peaks={S.peaks} lo={lo} hi={hi} built={!quiet && !!S.built} {...rest} />
}

// ---------- Prep: Spectra's telescope — the electromagnetic spectrum by energy (§12.5)
export function Telescope({ done, onWrong, fail }) {
  const [opts] = useState(() => shuffled(EM))
  const [order, setOrder] = useState([])
  const [fb, setFb] = useState(null)
  const click = (r) => {
    if (order.includes(r) || (fb && !fb.ok)) return
    const next = [...order, r]
    if (EM[next.length - 1] !== r) return miss(setFb, 'Not next. ε = hν = hc/λ: the longer the wave, the less energy it carries.', onWrong, fail)
    setOrder(next); setFb(null); sfx('pickup')
    if (next.length === EM.length) good(setFb, 'Lowest energy to highest. Right.', done)
  }
  return (
    <div>
      <h2>Spectra’s Telescope</h2>
      <p className="ins">Set the telescope’s filters from lowest energy to highest. <span className="cite">§12.5, Fig 12.17</span></p>
      <div className="res-opts">{opts.map((r) => <button key={r} disabled={order.includes(r)} onClick={() => click(r)}>{r}</button>)}</div>
      <div className="pka-ladder">{order.map((r, k) => <div key={r} className="pka-rung"><b>{k + 1}</b> {r}</div>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 12-1: hexane on the magnetic arc (§12.2, Figs 12.6–12.7). First read the chart (M⁺, then the base peak),
// then name what broke off for each fragment the arrow points at, in a shuffled order. No m/z is printed: read the axis
const HEX_RANGE = [10, 100]
export function MassHall({ done, onWrong, fail }) {
  const [peaks] = useState(() => shuffled(HEXANE.peaks))
  const [opts] = useState(() => shuffled(LOSSES))
  const [step, setStep] = useState(0) // 0 = find M⁺, 1 = find the base peak, 2+ = the fragments
  const [fb, setFb] = useState(null)
  const base = HEXANE.peaks.find((p) => p.base).mz
  const P = step >= 2 ? peaks[step - 2] : null
  const mark = { ...(step > 0 ? { [HEXANE.M]: '#ff9ad0' } : {}), ...(step > 1 ? { [base]: '#a6ffb0' } : {}) }
  const next = () => { setFb(null); if (step + 1 >= peaks.length + 2) done(); else setStep(step + 1) }
  const tap = (m) => {
    if (fb || step > 1) return
    if (step === 0) {
      if (m !== HEXANE.M) return miss(setFb, 'Not M⁺. The molecular ion is the whole molecule, unbroken: the last real peak at the high-m/z end, not the tallest one (a tiny one just past it is M + 1, from ¹³C).', onWrong, fail)
      return good(setFb, `M⁺ = ${HEXANE.M}: hexane, C₆H₁₄, unbroken. It is far from the tallest peak.`, next, 2600)
    }
    if (m !== base) return miss(setFb, 'Not the base peak. The base peak is simply the tallest bar, the one set to 100%.', onWrong, fail)
    good(setFb, `The base peak, m/z ${base}: the most abundant ion, set to 100%.`, next, 2600)
  }
  const pick = (l) => {
    if (fb || !P) return
    if (l !== P.lost) return miss(setFb, `Not ${l}. Read the arrowed peak’s m/z off the axis; M⁺ minus that is the mass of the radical that broke off. Count C as 12, H as 1.`, onWrong, fail)
    good(setFb, `${HEXANE.M} − ${HEXANE.M - P.mz} = ${P.mz}: hexane lost ${P.lost}.`, next, 2600)
  }
  return (
    <div>
      <h2>The Magnetic Arc · hexane</h2>
      <p className="ins">
        {step === 0 && <>Hexane’s mass spectrum (Fig 12.6). Tap the molecular ion, M⁺.</>}
        {step === 1 && <>Now tap the base peak.</>}
        {P && <>The arrow marks a fragment ({step - 1} of {peaks.length}). Read its m/z. What broke off?</>}
        {' '}<span className="cite">§12.2, Fig 12.6</span>
      </p>
      <MSOf id="hexane" win={HEX_RANGE} pick={step < 2 ? tap : undefined} mark={mark} hl={P ? P.mz : null} />
      {P && <div className="res-opts">{opts.map((l) => <button key={l} onClick={() => pick(l)}>{l}</button>)}</div>}
      <Feedback fb={fb} />
    </div>
  )
}
// Worked Example 12.1 (Fig 12.8): which chart is sample A, and which compound is asked for, are dealt per mount
export function Samples({ done, onWrong, fail }) {
  const [deal] = useState(() => ({ aIsMethyl: Math.random() < 0.5, ask: Math.random() < 0.5 ? 'methylcyclohexane' : 'ethylcyclopentane' }))
  const [opts] = useState(() => shuffled(['a', 'b', 'n']))
  const [fb, setFb] = useState(null)
  const idA = deal.aIsMethyl ? 'methylcyclohexane' : 'ethylcyclopentane', idB = deal.aIsMethyl ? 'ethylcyclopentane' : 'methylcyclohexane'
  const right = (deal.ask === 'methylcyclohexane') === deal.aIsMethyl ? 'a' : 'b'
  const label = { a: 'Sample A', b: 'Sample B', n: 'Neither: they weigh the same, so there’s no telling' }
  const pick = (o) => {
    if (fb) return
    if (o === right) return good(setFb, `Right. ${deal.ask === 'methylcyclohexane' ? 'Methylcyclohexane loses its CH₃: base peak 98 − 15 = 83' : 'Ethylcyclopentane loses its ethyl: base peak 98 − 29 = 69'}.`, done)
    miss(setFb, o === 'n' ? 'Same weight, but they break differently. Find each chart’s tallest bar: what does 98 minus it say was lost?' : 'Find that chart’s base peak, its tallest bar, and take it from 98: which group weighs that much, and which compound has it to lose?', onWrong, fail)
  }
  return (
    <div>
      <h2>Two Unlabeled Samples</h2>
      <p className="ins">Both are C₇H₁₄. Which sample is <b>{deal.ask}</b>? <span className="cite">Worked Example 12.1, Fig 12.8</span></p>
      <MSOf id={idA} win={[20, 110]} label="Sample A" />
      <MSOf id={idB} win={[20, 110]} label="Sample B" />
      <div className="res-opts">{opts.map((o) => <button key={o} onClick={() => pick(o)}>{label[o]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 12-3: the dome's lens — which radiation makes bonds stretch and bend? (§12.5–12.6, Problems 12-5, 12-6)
// Three kinds of deal, per mount: the IR beam given as a wavelength; given as a frequency (so ν = c/λ must be worked);
// or Problem 12-5's task first, ordering the four beams by energy, then choosing. Each deal mixes λ and ν distractors
export function Dome({ done, onWrong, fail }) {
  const [deal] = useState(() => {
    const mode = ['lam', 'nu', 'order'][Math.floor(Math.random() * 3)]
    const irs = BEAMS_IR.filter((b) => (mode === 'lam' ? !b.nu : mode === 'nu' ? b.nu : true))
    const ir = irs[Math.floor(Math.random() * irs.length)]
    // the λ distractor is a near miss (microwave or visible) unless the deal is about ordering, where X and gamma rays keep the whole span
    const lamD = shuffled(BEAMS_OTHER.filter((b) => !b.nu && (mode === 'order' || b.near)))[0]
    const nuD = shuffled(BEAMS_OTHER.filter((b) => b.nu && b.lam !== lamD.lam)) // never the same beam twice, once as λ and once as ν
    return { mode, ir, opts: shuffled([ir, lamD, nuD[0], nuD[1]]) }
  })
  const [order, setOrder] = useState([])
  const [fb, setFb] = useState(null)
  const won = useRef(false)
  const byEnergy = [...deal.opts].sort((a, b) => b.lam - a.lam) // longest wave first: lowest energy first
  const ordering = deal.mode === 'order' && order.length < 4
  const pick = (b) => {
    if (won.current || (fb && !fb.ok)) return
    if (ordering) {
      if (order.includes(b)) return
      if (byEnergy[order.length] !== b) return miss(setFb, 'Not next. ε = hc/λ = hν: turn every frequency into a wavelength (λ = c/ν, c = 3.00 × 10⁸ m/s); the longest wave carries the least energy.', onWrong, fail)
      const n = [...order, b]; setOrder(n); setFb(null); sfx('pickup')
      if (n.length === 4) setFb({ ok: true, text: 'Lowest to highest, right. Now set the lens on the one that makes bonds stretch and bend.' })
      return
    }
    if (b === deal.ir) { won.current = true; return good(setFb, `${b.t}${b.nu ? ` is λ = c/ν = ${b.lam === 2.0e-5 ? '2.0 × 10⁻⁵' : '9.1 × 10⁻⁶'} m (worked out, †)` : ''}: inside 2.5 × 10⁻⁶ to 2.5 × 10⁻⁵ m. Infrared: it makes bonds stretch and bend, each kind at its own frequency.`, done) }
    miss(setFb, b.why, onWrong, fail)
  }
  return (
    <div>
      <h2>The Spectrum Dome</h2>
      <p className="ins">{ordering ? 'Four beams can pass the great lens. First set them in order, from lowest energy to highest.' : 'Four beams can pass the great lens. Set it to the one whose energy makes bonds stretch and bend.'} <span className="cite">§12.5–12.6, Problems 12-5, 12-6</span></p>
      <div className="res-opts">{deal.opts.map((b) => <button key={b.t} disabled={ordering && order.includes(b)} onClick={() => pick(b)}>{b.t}</button>)}</div>
      {deal.mode === 'order' && order.length > 0 && <div className="pka-ladder">{order.map((b, k) => <div key={b.t} className="pka-rung"><b>{k + 1}</b> {b.t}</div>)}</div>}
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 12-4: a bell, seen through the Lens (§12.7–12.8, Table 12.1)
export function BellPanel({ done, bell, onWrong, fail }) {
  const B = BELLS.find((b) => b.id === bell)
  const [opts] = useState(() => shuffled(FAMILIES))
  const [bands] = useState(() => irBands(B.ir)) // drawn fresh each time the Lens is turned on it
  const [fb, setFb] = useState(null)
  const pick = (f) => {
    if (fb) return
    if (f !== B.family) return miss(setFb, `Not a${/^[aeiou]/.test(f) ? 'n' : ''} ${f}. Read where each dip sits against Table 12.1, and which bands are missing.`, onWrong, fail)
    good(setFb, B.why, done)
  }
  return (
    <div>
      <h2>A Ringing Bell</h2>
      <p className="ins">The Lens shows where this molecule absorbs. What kind of compound is it? <span className="cite">§12.8, Table 12.1</span></p>
      <IRChart bands={bands} />
      <div className="res-opts">{opts.map((f) => <button key={f} onClick={() => pick(f)}>{f}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- the boss: name the disguise from all the evidence (§12.2–12.3, 12.8)
export function SorcererPanel({ done, pool = 0, v = 0, onWrong, fail }) {
  const D = SORC_POOL[pool] || SORC_POOL[0]
  const V = D.variants[v] || D.variants[0]
  const [opts] = useState(() => shuffled(D.opts))
  const [win] = useState(() => msWindow(MS[V.ms].M))
  const [bands] = useState(() => irBands(V.ir)) // never a bell's drawing: built fresh from the variant's bands
  const [fb, setFb] = useState(null)
  const pick = (o) => {
    if (fb) return
    if (o === V.answer) return good(setFb, `${shown(o)}: every clue fits. The disguise breaks!${MS[V.ms].built ? ' (His spectrum here was † built from facts the book states; the book prints no figure of it.)' : ''}`, done, 2400)
    miss(setFb, `Not ${shown(o)}. ${D.sig[o]}`, onWrong, fail)
  }
  const cap = (t) => t[0].toUpperCase() + t.slice(1)
  return (
    <div>
      <h2>Name Him</h2>
      <p className="ins">The weighing crystal, his M⁺ region (any M + 2 twin shows here): <span className="cite">§12.2–12.3, 12.8</span></p>
      <MSOf id={V.ms} win={win} quiet />
      {V.c2 === 'exact'
        ? <p className="ins">{cap(C2_NAME.exact)}: the exact mass of M⁺ is <b>{V.mass} amu</b>.</p>
        : <><p className="ins">{cap(C2_NAME.frag)}, his whole spectrum:</p><MSOf id={V.ms} quiet /></>}
      <p className="ins" style={{ fontSize: 12, opacity: 0.75 }}>Some of his spectra are † built from book-stated facts; you are told which once he is named.</p>
      <p className="ins">And the Lens:</p>
      <IRChart bands={bands} />
      <div className="res-opts">{opts.map((o) => <button key={o} onClick={() => pick(o)}>{shown(o)}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Spectra's question (§12.2, 12.7)
const SQ = [
  ['a', 'The mass spectrometer weighed him and broke him into pieces; the infrared showed which bonds he holds.', null],
  ['b', 'The infrared weighed him, and the mass spectrum showed which functional groups he holds, peak by peak.', 'Infrared makes bonds stretch and bend; it weighs nothing. Weighing is the mass spectrometer’s work.'],
  ['c', 'His weight was the m/z of his base peak, the tallest bar on the mass chart; the infrared named his bonds.', 'The base peak is the most abundant ion, often a fragment: propane’s M⁺ at 44 is only about a third as high as its base peak at 29 (Fig 12.4).'],
  ['d', 'His infrared bands matched one whole molecule listed in Table 12.1, so the mass spectrum was hardly needed.', 'Table 12.1 lists the bands of functional groups, not whole molecules, and the infrared can’t weigh him.'],
]
export function FinalCheck({ done, onWrong, fail }) {
  const [opts] = useState(() => shuffled(SQ))
  const [fb, setFb] = useState(null)
  const pick = ([id, t, why]) => {
    if (fb) return
    if (!why) return good(setFb, 'Yes. The magnet weighed him and broke him; the infrared read his bonds. Together they named him.', done)
    miss(setFb, why, onWrong, fail)
  }
  return (
    <div>
      <h2>Spectra’s Question</h2>
      <p className="ins">Malradix said no one could ever know what he truly is. How did you? <span className="cite">§12.2, 12.7</span></p>
      <div className="res-opts">{opts.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
