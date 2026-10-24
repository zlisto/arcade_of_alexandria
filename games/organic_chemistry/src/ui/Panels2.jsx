import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { EN, bondPolarity, formalCharge, VALENCE_E, PKA } from '../chem/rules2'

// Trial panels for World 2, the Tide Temple (book Chapter 2). Same contract as Panels.jsx:
// props.done() when solved; wrong answers explain the rule from the book.

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}
const solved = (setFb, text, done, ms = 1600) => { sfx('right'); setFb({ ok: true, text }); setTimeout(done, ms) }
const wrong = (setFb, text) => { sfx('wrong'); setFb({ ok: false, text }) }

// ---------- Prep: the lighthouse — which end of each bond is δ− (§2.1)
const BONDS = [['C', 'O'], ['C', 'H'], ['O', 'H'], ['C', 'Cl'], ['N', 'H']]
export function Polarity({ done }) {
  const [pick, setPick] = useState(BONDS.map(() => null)) // atom symbol or 'non'
  const [fb, setFb] = useState(null)
  const check = () => {
    for (let i = 0; i < BONDS.length; i++) {
      const [a, b] = BONDS[i]
      const r = bondPolarity(a, b)
      const want = r.kind === 'nonpolar' ? 'non' : r.negEnd
      if (pick[i] !== want) {
        return wrong(setFb, r.kind === 'nonpolar'
          ? `${a}–${b}: ΔEN = |${EN[a]} − ${EN[b]}| = ${r.d}, under 0.5, so the bond is essentially nonpolar.`
          : `${a}–${b}: ΔEN = ${r.d}. The more electronegative atom, ${r.negEnd} (EN ${EN[r.negEnd]}), pulls the shared pair closer and becomes δ−.`)
      }
    }
    solved(setFb, 'The lamp blazes! Electronegativity decides which end of a bond is δ− — and C–H is close enough to nonpolar.', done)
  }
  return (
    <div>
      <h2>The Tide Lighthouse</h2>
      <p className="ins">The lamp only lights when every bond's charges are marked. For each bond, click the atom that becomes <b>δ−</b> — or choose <b>nonpolar</b> if the electronegativities differ by less than 0.5. <span className="cite">§2.1</span></p>
      <div className="en-row">{Object.entries({ H: EN.H, C: EN.C, N: EN.N, O: EN.O, Cl: EN.Cl }).map(([k, v]) => <span key={k} className="en-chip"><b>{k}</b> {v}</span>)}</div>
      <div className="bond-list">
        {BONDS.map(([a, b], i) => (
          <div key={i} className="bond-row">
            {[a, b].map((el) => <button key={el} className={'atom-btn' + (pick[i] === el ? ' sel' : '')} onClick={() => { setPick((p) => p.map((x, k) => (k === i ? el : x))); setFb(null) }}>{pick[i] === el ? 'δ− ' : ''}{el}</button>)}
            <span className="bond-line">—</span>
            <button className={'atom-btn non' + (pick[i] === 'non' ? ' sel' : '')} onClick={() => { setPick((p) => p.map((x, k) => (k === i ? 'non' : x))); setFb(null) }}>nonpolar</button>
          </div>
        ))}
      </div>
      <button className="go" onClick={check}>Light the lamp</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 2-1 Tug-of-War Hall: which molecules have a net dipole (§2.2)
const DIPOLES = [
  { f: 'H₂O', polar: true, why: 'bent, with two lone pairs on O: the two O–H dipoles add up.' },
  { f: 'CO₂', polar: false, why: 'linear: the two C=O dipoles point opposite ways and cancel.' },
  { f: 'NH₃', polar: true, why: 'pyramid-shaped with a lone pair on N: the N–H dipoles add up.' },
  { f: 'CH₄', polar: false, why: 'a symmetric tetrahedron: the small bond polarities cancel exactly.' },
  { f: 'CH₃Cl', polar: true, why: 'one C–Cl bond is far more polar than the C–H bonds, so nothing cancels it.' },
  { f: 'CCl₄', polar: false, why: 'four identical C–Cl bonds pointing to a tetrahedron\'s corners cancel out.' },
]
export function Dipole({ done }) {
  const [pick, setPick] = useState(DIPOLES.map(() => null))
  const [fb, setFb] = useState(null)
  const check = () => {
    const i = DIPOLES.findIndex((m, k) => pick[k] !== m.polar)
    if (i >= 0) return wrong(setFb, pick[i] === null ? `Decide for ${DIPOLES[i].f} too.` : `${DIPOLES[i].f} ${DIPOLES[i].polar ? 'does have' : 'has no'} net dipole: ${DIPOLES[i].why}`)
    solved(setFb, 'The polar statues swing round to face the field. A molecule\'s dipole is the vector sum of its bond dipoles (and lone pairs) — symmetry can cancel it to zero.', done, 2000)
  }
  return (
    <div>
      <h2>Tug-of-War Hall</h2>
      <p className="ins">A field runs through the hall. Statues of molecules with a <b>net dipole</b> turn to line up with it; the others don't move. Mark each one. <span className="cite">§2.2</span></p>
      <div className="dipole-grid">
        {DIPOLES.map((m, i) => (
          <div key={m.f} className="dipole-card">
            <b>{m.f}</b>
            <div>
              <button className={pick[i] === true ? 'sel' : ''} onClick={() => { setPick((p) => p.map((x, k) => (k === i ? true : x))); setFb(null) }}>turns (polar)</button>
              <button className={pick[i] === false ? 'sel' : ''} onClick={() => { setPick((p) => p.map((x, k) => (k === i ? false : x))); setFb(null) }}>stays (no dipole)</button>
            </div>
          </div>
        ))}
      </div>
      <button className="go" onClick={check}>Switch on the field</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 2-2 Hall of Accounts: formal charges (§2.3)
const FORMALS = [
  { mol: 'H₃O⁺ (hydronium)', el: 'O', bonds: 3, lp: 1 },
  { mol: 'OH⁻ (hydroxide)', el: 'O', bonds: 1, lp: 3 },
  { mol: 'NH₄⁺ (ammonium)', el: 'N', bonds: 4, lp: 0 },
  { mol: 'CH₃⁻ (methyl anion)', el: 'C', bonds: 3, lp: 1 },
  { mol: '(CH₃)₂SO — the sulfur', el: 'S', bonds: 3, lp: 1 },
  { mol: '(CH₃)₂SO — the oxygen', el: 'O', bonds: 1, lp: 3 },
]
function AtomSketch({ bonds, lp, el }) {
  // the atom with its bond sticks and lone-pair dots
  const items = bonds + lp
  return (
    <svg viewBox="-40 -40 80 80" className="atom-sketch">
      {[...Array(items)].map((_, k) => {
        const a = (k / items) * Math.PI * 2 - Math.PI / 2
        const x = Math.cos(a), y = Math.sin(a)
        return k < bonds
          ? <line key={k} x1={x * 12} y1={y * 12} x2={x * 32} y2={y * 32} stroke="#cfd6e0" strokeWidth="3" strokeLinecap="round" />
          : <g key={k}>{[-1, 1].map((s) => <circle key={s} cx={x * 19 - y * 4 * s} cy={y * 19 + x * 4 * s} r="2.6" fill="#ffd760" />)}</g>
      })}
      <circle r="11" fill="#1d2230" stroke="#43e6f5" strokeWidth="1.5" />
      <text y="4.5" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{el}</text>
    </svg>
  )
}
export function Formal({ done }) {
  const [pick, setPick] = useState(FORMALS.map(() => null))
  const [fb, setFb] = useState(null)
  const check = () => {
    for (let i = 0; i < FORMALS.length; i++) {
      const f = FORMALS[i], want = formalCharge(f.el, f.bonds, f.lp)
      if (pick[i] !== want) {
        return wrong(setFb, `${f.mol}: ${f.el} has ${VALENCE_E[f.el]} valence electrons; it owns ${2 * f.lp} nonbonding + ${f.bonds} (half of ${2 * f.bonds} bonding) = ${2 * f.lp + f.bonds}. Formal charge = ${VALENCE_E[f.el]} − ${2 * f.lp + f.bonds} = ${want > 0 ? '+' : ''}${want}.`)
      }
    }
    solved(setFb, 'Every rune glows. Formal charge = valence electrons − (nonbonding electrons + half the bonding electrons). A chest unlocks with a click…', done, 2000)
  }
  return (
    <div>
      <h2>Hall of Accounts</h2>
      <p className="ins">Each rune shows an atom with its bonds (lines) and lone pairs (dots). Set its <b>formal charge</b>. <span className="cite">§2.3</span></p>
      <div className="formal-grid">
        {FORMALS.map((f, i) => (
          <div key={i} className="formal-card">
            <AtomSketch {...f} />
            <div className="formal-name">{f.mol}</div>
            <div className="formal-btns">{[-1, 0, 1].map((v) => <button key={v} className={pick[i] === v ? 'sel' : ''} onClick={() => { setPick((p) => p.map((x, k) => (k === i ? v : x))); setFb(null) }}>{v > 0 ? '+1' : v}</button>)}</div>
          </div>
        ))}
      </div>
      <button className="go" onClick={check}>Balance the accounts</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 2-3 Resonance Tidepools: two curved arrows on the acetate ion (§2.4–2.6)
const STEPS = [
  { q: 'Arrow 1 starts from…', opts: [['lp', 'a lone pair on the lower, negative oxygen'], ['ch', 'a C–H bond on the CH₃'], ['me', 'the CH₃ carbon itself']], ok: 'lp',
    why: { ch: 'A C–H bond is a σ bond. Resonance only moves π electrons and lone pairs (rule 2).', me: 'Arrows move electrons, never atoms (rule 2).' } },
  { q: '…and points to:', opts: [['co', 'between that oxygen and the carbon (a new C=O π bond)'], ['ch3', 'the CH₃ carbon'], ['h', 'a hydrogen']], ok: 'co',
    why: { ch3: 'That would give the CH₃ carbon five bonds — every form must obey the octet rule (rule 4).', h: 'Hydrogen can only have one bond (and two electrons).' } },
  { q: 'Arrow 2 starts from…', opts: [['pi', 'the π bond of the upper C=O'], ['sig', 'the σ bond of the upper C–O'], ['lp2', 'a lone pair on the upper oxygen']], ok: 'pi',
    why: { sig: 'Breaking the σ bond would separate the atoms; resonance only moves π and nonbonding electrons.', lp2: 'The carbon would end up with five bonds after arrow 1 — the π bond has to move away to make room.' } },
  { q: '…and points to:', opts: [['ou', 'onto the upper oxygen, as a new lone pair'], ['c', 'onto the carbon'], ['ol', 'onto the lower oxygen']], ok: 'ou',
    why: { c: 'Carbon would hold too many electrons — it already got a new π bond from arrow 1.', ol: 'Curved arrows go from where electrons are to a neighbouring atom or bond; the π electrons settle on the oxygen they came from.' } },
  { q: 'So which picture is the real acetate ion?', opts: [['a', 'The first form (charge on the lower O)'], ['b', 'The second form (charge on the upper O)'], ['h', 'Neither — a hybrid of both: the two C–O bonds are identical (127 pm) and the charge is shared']], ok: 'h',
    why: { a: 'Neither single form is real; the molecule does not flip between them (rule 1). Both C–O bonds measure the same.', b: 'Neither single form is real; the molecule does not flip between them (rule 1). Both C–O bonds measure the same.' } },
]
function Acetate({ form }) {
  // form 0: upper O double, lower O⁻ ; form 1: the reverse
  const up = form === 0 ? 2 : 1, lo = form === 0 ? 1 : 2
  const bond = (x1, y1, x2, y2, n) => n === 2
    ? <g><line x1={x1 - 3} y1={y1 - 2} x2={x2 - 3} y2={y2 - 2} className="bnd" /><line x1={x1 + 3} y1={y1 + 2} x2={x2 + 3} y2={y2 + 2} className="bnd" /></g>
    : <line x1={x1} y1={y1} x2={x2} y2={y2} className="bnd" />
  return (
    <svg viewBox="0 0 220 130" className="molsvg">
      {bond(60, 65, 110, 65, 1)}
      {bond(110, 65, 150, 30, up)}
      {bond(110, 65, 150, 100, lo)}
      <text x="40" y="70" className="al" textAnchor="middle">H₃C</text>
      <circle cx="110" cy="65" r="12" fill="#2b2b31" /><text x="110" y="70" textAnchor="middle" className="al">C</text>
      <circle cx="158" cy="26" r="13" fill="#e0453b" /><text x="158" y="31" textAnchor="middle" className="al">O</text>
      <circle cx="158" cy="104" r="13" fill="#e0453b" /><text x="158" y="109" textAnchor="middle" className="al">O</text>
      <text x="180" y={form === 0 ? 110 : 22} className="al" fill="#ffd760">−</text>
    </svg>
  )
}
export function Resonance({ done }) {
  const [step, setStep] = useState(0)
  const [fb, setFb] = useState(null)
  const S = STEPS[step]
  const choose = (id) => {
    if (id !== S.ok) return wrong(setFb, S.why[id] || 'Not quite.')
    sfx('right')
    if (step === STEPS.length - 1) return solved(setFb, 'The tidepools settle into one calm surface. The real ion is the resonance hybrid; the forms are just our drawings of it (§2.4–2.5).', done, 2200)
    setFb({ ok: true, text: step === 3 ? 'That gives the second resonance form — the charge has moved to the upper oxygen. The atoms stayed put.' : 'Yes.' })
    setStep(step + 1)
  }
  return (
    <div>
      <h2>Resonance Tidepools</h2>
      <p className="ins">The acetate ion, CH₃CO₂⁻, has two resonance forms. Draw the curved arrows that turn the first into the second. Only π electrons and lone pairs move; atoms never do. <span className="cite">§2.4–2.6</span></p>
      <div className="res-row">
        <div><Acetate form={0} /><p className="small">form 1</p></div>
        {step >= 4 && <><span className="res-arrow">⟷</span><div><Acetate form={1} /><p className="small">form 2</p></div></>}
      </div>
      <p className="res-q"><b>{S.q}</b></p>
      <div className="res-opts">{S.opts.map(([id, t]) => <button key={id} onClick={() => choose(id)}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 2-4 The pKa Ladder: which way does the proton go? (§2.7–2.10)
const PKQ = [
  {
    q: `Hydroxide (OH⁻) meets acetic acid (pKa ${PKA['CH₃COOH (acetic acid)']}). Hydroxide's conjugate acid is water (pKa ${PKA['H₂O (water)']}). What happens?`,
    opts: [['go', 'Acetic acid gives its H⁺ to hydroxide: acetate + water'], ['no', 'Nothing — the proton stays on acetic acid'], ['rev', 'Hydroxide gives an H⁺ to acetic acid']], ok: 'go',
    yes: 'H⁺ moves from the stronger acid (acetic acid, 4.76) to the stronger base, forming the weaker acid, water (15.74).',
    why: { no: 'Compare pKa: acetic acid (4.76) is a far stronger acid than water (15.74), so the proton moves to hydroxide.', rev: 'Hydroxide has no proton to spare in this direction — it is the base here.' },
  },
  {
    q: `Hydroxide meets acetylene (pKa ${PKA['HC≡CH (acetylene)']}). Water's pKa is ${PKA['H₂O (water)']}. What happens?`,
    opts: [['go', 'Acetylene gives its H⁺ to hydroxide'], ['no', 'Hardly any reaction — water is the stronger acid, so the proton stays on acetylene']], ok: 'no',
    yes: 'Right: a reaction runs toward the weaker acid. Water (15.74) is stronger than acetylene (25), so hydroxide can\'t take acetylene\'s proton.',
    why: { go: 'The proton would have to move from a weaker acid (acetylene, 25) to make a stronger one (water, 15.74). Reactions go the other way (§2.9).' },
  },
  {
    q: 'Which of these is the strongest base?',
    opts: [['cl', `Cl⁻ (conjugate base of HCl, pKa ${PKA.HCl})`], ['ac', `CH₃CO₂⁻ (from acetic acid, pKa ${PKA['CH₃COOH (acetic acid)']})`], ['oh', `OH⁻ (from water, pKa ${PKA['H₂O (water)']})`], ['et', `CH₃CH₂O⁻ (from ethanol, pKa ${PKA['CH₃CH₂OH (ethanol)']})`]], ok: 'et',
    yes: 'The weakest acid (ethanol, highest pKa) has the strongest conjugate base, ethoxide.',
    why: { cl: 'HCl is the strongest acid here, so Cl⁻ is the weakest base: a strong acid has a weak conjugate base (§2.8).', ac: 'Acetic acid is a fairly strong acid, so acetate is a weak base.', oh: 'Close! But ethanol (16.00) is a slightly weaker acid than water (15.74), so ethoxide is the stronger base.' },
  },
]
export function PKa({ index = 0, done }) {
  const Q = PKQ[index]
  const [fb, setFb] = useState(null)
  return (
    <div>
      <h2>The pKa Ladder · step {index + 1}</h2>
      <p className="ins">The water lock opens when the proton goes the right way: <b>from the stronger acid to the stronger base</b>. Lower pKa = stronger acid. <span className="cite">§2.8–2.9</span></p>
      <p className="res-q"><b>{Q.q}</b></p>
      <div className="res-opts">{Q.opts.map(([id, t]) => <button key={id} onClick={() => (id === Q.ok ? solved(setFb, Q.yes, done, 2000) : wrong(setFb, Q.why[id]))}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 2-5 Lewis Docks: which pairs can hydrogen-bond (§2.12)
const HB = [
  { p: 'H₂O ··· H₂O', yes: true, why: 'an O–H hydrogen meets a lone pair on another oxygen.' },
  { p: 'CH₄ ··· CH₄', yes: false, why: 'no H on O or N, and no lone pairs — only weak dispersion forces.' },
  { p: 'CH₃CH₂OH ··· H₂O', yes: true, why: 'ethanol\'s O–H can bond to water\'s lone pair (and the other way round).' },
  { p: 'CH₃Cl ··· CH₃Cl', yes: false, why: 'polar, so dipole–dipole attraction — but no H on O or N, so no hydrogen bond.' },
  { p: 'NH₃ ··· H₂O', yes: true, why: 'an N–H or O–H hydrogen reaches a lone pair on the other molecule.' },
]
export function HBond({ done }) {
  const [pick, setPick] = useState(HB.map(() => null))
  const [fb, setFb] = useState(null)
  const check = () => {
    const i = HB.findIndex((h, k) => pick[k] !== h.yes)
    if (i >= 0) return wrong(setFb, pick[i] === null ? `Decide for ${HB[i].p} too.` : `${HB[i].p}: ${HB[i].yes ? 'yes' : 'no'} — ${HB[i].why}`)
    solved(setFb, 'The bridge of hands holds. A hydrogen bond needs an H on O or N and a lone pair on another O or N (§2.12).', done, 2000)
  }
  return (
    <div>
      <h2>The Hydrogen-Bond Bridge</h2>
      <p className="ins">The last bridge is built from molecules holding hands. Which pairs can form a <b>hydrogen bond</b>? <span className="cite">§2.12</span></p>
      <div className="dipole-grid">
        {HB.map((h, i) => (
          <div key={h.p} className="dipole-card">
            <b>{h.p}</b>
            <div>
              <button className={pick[i] === true ? 'sel' : ''} onClick={() => { setPick((p) => p.map((x, k) => (k === i ? true : x))); setFb(null) }}>H-bond</button>
              <button className={pick[i] === false ? 'sel' : ''} onClick={() => { setPick((p) => p.map((x, k) => (k === i ? false : x))); setFb(null) }}>no H-bond</button>
            </div>
          </div>
        ))}
      </div>
      <button className="go" onClick={check}>Raise the bridge</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- Shard check: the carbonate ion (the Hydra) (§2.4–2.6)
export function ResonanceCheck({ done }) {
  const [fb, setFb] = useState(null)
  const opts = [
    ['flip', 'One C=O and two C–O bonds that swap places very fast'],
    ['hyb', 'Three identical C–O bonds — the real ion is a hybrid of its three resonance forms, with the charge spread over all three oxygens'],
    ['one', 'Whichever form is drawn first is the real one'],
  ]
  const why = { flip: 'It doesn\'t flip: the forms are imaginary drawings and the hybrid is real (rule 1, §2.5).', one: 'No single form is real — the hybrid is (§2.5).' }
  return (
    <div>
      <h2>The Ferrymen's Question</h2>
      <p className="ins">The Hydra was the carbonate ion, CO₃²⁻, with three resonance forms. What are its C–O bonds really like? <span className="cite">§2.4–2.6</span></p>
      <div className="res-opts">{opts.map(([id, t]) => <button key={id} onClick={() => (id === 'hyb' ? solved(setFb, 'Exactly: three equal bonds and the −2 charge shared by all three oxygens. That\'s why striking one head did nothing.', done, 2200) : wrong(setFb, why[id]))}>{t}</button>)}</div>
      <Feedback fb={fb} />
    </div>
  )
}
