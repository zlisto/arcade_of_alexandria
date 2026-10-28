import { useMemo, useState } from 'react'
import { sfx } from '../audio/sfx'
import { EM, HEXANE, LOSSES, SAMPLES, FAMILIES, BELLS, DISGUISES } from '../chem/rules12'

// Trial panels for World 12, the Observatory of Light (book Chapter 12). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const good = (setFb, text, done, ms = 1900) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const bad = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

/** an IR spectrum: transmittance falls at each band (wavenumber runs 4000 → 400 left to right) */
export function IRChart({ bands }) {
  const x = (nu) => 20 + ((4000 - nu) / 3600) * 360
  const pts = []
  for (let nu = 4000; nu >= 400; nu -= 10) {
    let t = 1
    bands.forEach((b) => { t -= b.s * Math.exp(-Math.pow((nu - b.at) / (b.w / 2), 2)) })
    pts.push(`${x(nu).toFixed(1)},${(20 + (1 - Math.max(0.03, t)) * 110).toFixed(1)}`)
  }
  return (
    <svg viewBox="0 0 400 170" className="ir-svg">
      <polyline points={pts.join(' ')} fill="none" stroke="#9af0ff" strokeWidth="2" />
      <line x1="20" y1="20" x2="380" y2="20" stroke="#3a4a6a" strokeDasharray="3 3" />
      {[4000, 3000, 2000, 1500, 1000, 500].map((nu) => <g key={nu}><line x1={x(nu)} y1="140" x2={x(nu)} y2="145" stroke="#8a9ab8" /><text x={x(nu)} y="158" textAnchor="middle" fill="#8a9ab8" fontSize="10">{nu}</text></g>)}
      {bands.map((b) => <text key={b.label} x={x(b.at)} y={36 + b.s * 100} textAnchor="middle" fill="#ffd060" fontSize="10">{b.label}</text>)}
      <text x="200" y="168" textAnchor="middle" fill="#6a7a98" fontSize="9">wavenumber (cm⁻¹)</text>
    </svg>
  )
}

// ---------- Prep: Spectra's telescope — the electromagnetic spectrum by energy (§12.5)
export function Telescope({ done }) {
  const shuffled = useMemo(() => [3, 6, 0, 4, 2, 5, 1].map((i) => EM[i]), [])
  const [order, setOrder] = useState([])
  const [fb, setFb] = useState(null)
  const click = (r) => {
    if (order.includes(r)) return
    const next = [...order, r]
    if (EM[next.length - 1] !== r) { setOrder([]); return bad(setFb, 'Not next. ε = hν: higher frequency, shorter wavelength, more energy. Start from the longest waves.') }
    setOrder(next); setFb(null); sfx('pickup')
    if (next.length === EM.length) good(setFb, 'Radio to gamma: lowest energy to highest. Infrared sits between microwaves and visible light, just right for making bonds vibrate.', done, 3600)
  }
  return (
    <div>
      <h2>Spectra’s Telescope</h2>
      <p className="ins">Set the telescope’s filters from lowest energy to highest. <span className="cite">§12.5, Fig 12.17</span></p>
      <div className="res-opts">{shuffled.map((r) => <button key={r} disabled={order.includes(r)} onClick={() => click(r)}>{r}</button>)}</div>
      <div className="pka-ladder">{order.map((r, k) => <div key={r} className="pka-rung"><b>{k + 1}</b> {r}</div>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 12-1: hexane on the magnetic arc (§12.2, Figs 12.6–12.7)
export function MassHall({ done }) {
  const [i, setI] = useState(0)
  const [fb, setFb] = useState(null)
  const P = HEXANE.peaks[i]
  const pick = (l) => {
    if (l !== P.lost) return bad(setFb, `${HEXANE.M} − ${P.mz} = ${HEXANE.M - P.mz}. Which piece weighs ${HEXANE.M - P.mz}?`)
    good(setFb, `${HEXANE.M} − ${HEXANE.M - P.mz} = ${P.mz}: hexane lost ${P.lost}.${P.base ? ' And m/z 57 is the tallest peak: the base peak.' : ''}`, () => { setFb(null); if (i + 1 >= HEXANE.peaks.length) done(); else setI(i + 1) }, 2600)
  }
  return (
    <div>
      <h2>The Magnetic Arc · hexane</h2>
      <p className="ins">Hexane, M⁺ = {HEXANE.M}. A fragment lands at m/z = <b>{P.mz}</b>. What broke off? <span className="cite">§12.2</span></p>
      <div className="res-opts">{LOSSES.map((l) => <button key={l} onClick={() => pick(l)}>{l}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
export function Samples({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (o) => (o[2] ? good(setFb, 'Right: methylcyclohexane loses its CH₃ easily, so 83 is its base peak; ethylcyclopentane loses its ethyl, giving 69 (p. 390).', done, 3800) : bad(setFb, SAMPLES.why[o[0]]))
  return (
    <div>
      <h2>Two Unlabeled Samples</h2>
      <p className="ins">{SAMPLES.q} <span className="cite">§12.2</span></p>
      <div className="res-opts">{SAMPLES.opts.map((o) => <button key={o[0]} onClick={() => pick(o)}>{o[1]}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 12-3: the dome's lens — which band makes bonds vibrate? (§12.5–12.6)
const DQ = [
  ['ir', 'Infrared: 4000–400 cm⁻¹, 48.0 to 4.80 kJ/mol'],
  ['uv', 'Ultraviolet: enough to push an electron to a higher orbital'],
  ['mw', 'Microwaves: only enough to set molecules rotating'],
  ['x', 'X rays: far more energy than any bond vibration'],
]
export function Dome({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'ir') return good(setFb, 'Right. Infrared energy makes bonds stretch and bend; each kind of bond absorbs its own frequency. That’s what the Lens reads.', done, 3600)
    if (id === 'uv') return bad(setFb, 'UV energy moves electrons between orbitals. We want the band that makes bonds stretch and bend.')
    bad(setFb, id === 'mw' ? 'Too little energy: bonds need a bit more to vibrate.' : 'Far too much: that breaks things rather than ringing them.')
  }
  return (
    <div>
      <h2>The Spectrum Dome</h2>
      <p className="ins">Turn the dome’s great lens to the band whose energy matches the vibrations of bonds. <span className="cite">§12.5–12.6</span></p>
      <div className="res-opts">{DQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 12-4: a bell, seen through the Lens (§12.7–12.8, Table 12.1)
export function BellPanel({ done, bell }) {
  const B = BELLS.find((b) => b.id === bell)
  const [fb, setFb] = useState(null)
  const pick = (f) => {
    if (f !== B.family) return bad(setFb, `Not a${/^[aeiou]/.test(f) ? 'n' : ''} ${f}. Read the bands against Table 12.1: where does each one sit?`)
    good(setFb, B.why, done, 3200)
  }
  return (
    <div>
      <h2>A Ringing Bell</h2>
      <p className="ins">The Lens shows where this molecule absorbs. What kind of compound is it? <span className="cite">§12.8, Table 12.1</span></p>
      <IRChart bands={B.bands} />
      <div className="res-opts">{FAMILIES.map((f) => <button key={f} onClick={() => pick(f)}>{f}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- the boss: name the disguise from the evidence (§12.2, 12.8)
export function SorcererPanel({ done, round = 0 }) {
  const D = DISGUISES[Math.min(round, DISGUISES.length - 1)]
  const [fb, setFb] = useState(null)
  const pick = (o) => (o === D.right ? good(setFb, `${D.right}: M⁺ = ${D.M}, and its bands fit. The disguise breaks!`, done, 2400) : bad(setFb, D.why[o]))
  return (
    <div>
      <h2>Name Him</h2>
      <p className="ins">The weighing crystal: M⁺ = <b>{D.M}</b>, no M + 2. The fragment crystal: base peak m/z = <b>{D.base}</b>. And the Lens: <span className="cite">§12.2, 12.8</span></p>
      <IRChart bands={D.bands} />
      <div className="res-opts">{D.opts.map((o) => <button key={o} onClick={() => pick(o)}>{o}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- After the boss: Spectra's question (§12.2, 12.7)
const SQ = [
  ['a', 'Mass spectrometry gives the molecular weight and the pieces; infrared shows which functional groups are present. Together they point to the structure.'],
  ['b', 'Infrared alone gives the molecular weight.'],
  ['c', 'Nothing can tell what a molecule is without taking it apart by hand.'],
]
export function FinalCheck({ done }) {
  const [fb, setFb] = useState(null)
  const pick = (id) => {
    if (id === 'a') return good(setFb, 'Right. M⁺ and its fragments from MS, functional groups from IR: two kinds of light on one molecule.', done, 3800)
    if (id === 'b') return bad(setFb, 'IR shows bonds vibrating; the weighing is done by the mass spectrometer.')
    bad(setFb, 'You just named three disguises without touching them.')
  }
  return (
    <div>
      <h2>Spectra’s Question</h2>
      <p className="ins">Malradix said no one could ever know what he truly is. How did you? <span className="cite">§12.2, 12.7</span></p>
      <div className="res-opts">{SQ.map(([id, t]) => <button key={id} onClick={() => pick(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
