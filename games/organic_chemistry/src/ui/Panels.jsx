import { useEffect, useMemo, useState } from 'react'
import { setState, useGame } from '../engine/store'
import { setInputEnabled, releaseMouse } from '../engine/input'
import { sfx } from '../audio/sfx'
import {
  ELEMENTS, identifyAtom, KNOWN_ISOTOPES, ORBITALS, checkConfiguration, configString, checkOctets,
  h2Energy, H2, carbonHybridization, hydrogensOnCarbon, HYBRIDS,
} from '../chem/rules'

// Puzzle panels opened at puzzle stations. Each validates with chem/rules.js and explains mistakes
// with the rule from the book. onClose(true) when solved.

export default function Panels() {
  const p = useGame((s) => s.panel)
  useEffect(() => { setInputEnabled(!p); if (p) releaseMouse() }, [p])
  if (!p) return null
  const close = (ok) => { const f = p.onClose; setState({ panel: null }); setTimeout(() => f && f(ok), 0) }
  const C = { atomForge: AtomForge, shells: Shells, octet: OctetBridge, well: EnergyWell, skeleton: Skeleton, hybridCheck: HybridCheck }[p.kind]
  return (
    <div className="panel-wrap">
      <div className="panel">
        <button className="pclose" onClick={() => close(false)} title="Step away">✕</button>
        <C {...p.props} done={() => close(true)} />
      </div>
    </div>
  )
}

function Feedback({ fb }) {
  if (!fb) return null
  return <div className={'fb ' + (fb.ok ? 'ok' : 'bad')}>{fb.text}</div>
}

// ---------- 1-1 Nucleus Grotto: build an atom (§1.1)
const Row = ({ label, v, set, color }) => (
  <div className="row"><span className="lbl" style={{ color }}>{label}</span>
    <button onClick={() => set((x) => Math.max(0, x - 1))}>−</button><b className="num">{v}</b><button onClick={() => set((x) => Math.min(10, x + 1))}>+</button></div>
)

function AtomForge({ goal, done }) {
  const [pr, setPr] = useState(1)
  const [ne, setNe] = useState(0)
  const [el, setEl] = useState(1)
  const [fb, setFb] = useState(null)
  const info = identifyAtom({ protons: pr, neutrons: ne, electrons: el })
  const check = () => {
    if (goal.symbol && info.symbol !== goal.symbol) {
      sfx('wrong'); return setFb({ ok: false, text: `The gate wants ${ELEMENTS[goal.symbol].name}. An element is set by its number of protons (atomic number Z = ${ELEMENTS[goal.symbol].z}). You have Z = ${pr}${info.name ? ` (${info.name})` : ''}.` })
    }
    if (info.charge !== 0) { sfx('wrong'); return setFb({ ok: false, text: `Atoms are neutral overall: protons and electrons must be equal. You have ${pr} protons and ${el} electrons.` }) }
    if (goal.massNumber && info.massNumber !== goal.massNumber) {
      sfx('wrong'); return setFb({ ok: false, text: `Right element, but this gate wants mass number A = ${goal.massNumber}. A = protons + neutrons; you have A = ${info.massNumber}.` })
    }
    const iso = KNOWN_ISOTOPES[pr] || []
    if (!iso.includes(info.massNumber)) { sfx('wrong'); return setFb({ ok: false, text: `${info.name}-${info.massNumber} isn't a natural isotope — that nucleus has the wrong number of neutrons to be stable. ${pr === 6 ? 'Natural carbon is carbon-12, -13, or a trace of -14.' : ''}` }) }
    sfx('right')
    setFb({ ok: true, text: goal.massNumber ? `${info.name}-${info.massNumber}: same element, same chemistry, different mass. That's an isotope.` : `${info.name}-${info.massNumber}: Z = ${pr}, A = ${info.massNumber}, neutral.` })
    setTimeout(done, 1400)
  }
  return (
    <div>
      <h2>Nucleus Forge</h2>
      <p className="ins">{goal.prompt} <span className="cite">§1.1</span></p>
      <div className="forge">
        <svg viewBox="-60 -60 120 120" className="atomsvg">
          {[...Array(el)].map((_, i) => { const a = (i / Math.max(1, el)) * Math.PI * 2; const r = i < 2 ? 28 : 46; return <circle key={'e' + i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r="3.5" fill="#43e6f5" /> })}
          <circle r="28" fill="none" stroke="#2d3a4a" /><circle r="46" fill="none" stroke="#2d3a4a" />
          {[...Array(pr + ne)].map((_, i) => { const a = i * 2.4; const r = 3 + Math.sqrt(i) * 3; return <circle key={'n' + i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r="4" fill={i < pr ? '#e0453b' : '#9aa3ad'} /> })}
        </svg>
        <div>
          <Row label="Protons" v={pr} set={setPr} color="#e0453b" />
          <Row label="Neutrons" v={ne} set={setNe} color="#9aa3ad" />
          <Row label="Electrons" v={el} set={setEl} color="#43e6f5" />
          <div className="readout">Z = {pr} · A = {info.massNumber} · charge {info.charge > 0 ? '+' : ''}{info.charge}<br /><b>{info.name ? `${info.name}-${info.massNumber}` : 'unknown element'}</b></div>
        </div>
      </div>
      <button className="go" onClick={check}>Offer to the gate</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 1-2 Hall of Shells: electron configuration (§1.3)
function Shells({ symbol, done }) {
  const el = ELEMENTS[symbol]
  const empty = () => Object.fromEntries(ORBITALS.map((o) => [o.id, [...Array(o.boxes)].map(() => [false, false])]))
  const [fill, setFill] = useState(empty)
  const [fb, setFb] = useState(null)
  const click = (oid, bi) => {
    setFill((cur) => {
      const f = JSON.parse(JSON.stringify(cur))
      const b = f[oid][bi]
      // cycle: empty → ↑ → ↑↓ → empty (lets players make Pauli/Hund mistakes on purpose)
      if (!b[0] && !b[1]) b[0] = true
      else if (b[0] && !b[1]) b[1] = true
      else { b[0] = false; b[1] = false }
      return f
    })
    setFb(null)
  }
  const check = () => {
    const r = checkConfiguration(fill, el.z)
    if (r.ok) { sfx('right'); setFb({ ok: true, text: `${el.name}: ${configString(fill)}. ${r.message}` }); setTimeout(done, 1500) }
    else { sfx('wrong'); setFb({ ok: false, text: r.message }) }
  }
  const total = ORBITALS.reduce((s, o) => s + fill[o.id].reduce((t, b) => t + b[0] + b[1], 0), 0)
  return (
    <div>
      <h2>Hall of Shells</h2>
      <p className="ins">Light the lamps for <b>{el.name}</b> ({el.z} electrons). Click a lamp to add an electron (first ↑, then ↓). Lowest energy fills first; two per lamp, opposite spins; spread out before pairing. <span className="cite">§1.3</span></p>
      <div className="shells">
        {[...ORBITALS].reverse().map((o) => (
          <div key={o.id} className="orbrow"><span className="oid">{o.id}</span>
            {fill[o.id].map((b, i) => (
              <button key={i} className={'lamp ' + (b[0] ? 'lit' : '')} onClick={() => click(o.id, i)}>
                <span>{b[0] ? '↑' : ''}</span><span>{b[1] ? '↓' : ''}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="readout">{total} / {el.z} electrons · {configString(fill) || '—'}</div>
      <button className="go" onClick={check}>Light the hall</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 1-3 Socket Bridge: valence and octets (§1.4)
// Each molecule: heavy-atom slots (choose element), explicit H atoms, bonds with orders.
const BRIDGES = [
  { name: 'Methylamine, CH₃NH₂', nodes: [{ x: 90, y: 80 }, { x: 190, y: 80 }], hs: [[0, 40, 80], [0, 90, 30], [0, 90, 130], [1, 230, 40], [1, 230, 120]], bonds: [[0, 1, 1]] },
  { name: 'Ethanol, CH₃CH₂OH', nodes: [{ x: 70, y: 80 }, { x: 150, y: 80 }, { x: 230, y: 80 }], hs: [[0, 25, 80], [0, 70, 30], [0, 70, 130], [1, 150, 30], [1, 150, 130], [2, 275, 80]], bonds: [[0, 1, 1], [1, 2, 1]] },
  { name: 'Formaldehyde, CH₂O', nodes: [{ x: 120, y: 80 }, { x: 220, y: 80 }], hs: [[0, 75, 40], [0, 75, 120]], bonds: [[0, 1, 2]] },
]
function OctetBridge({ index = 0, done }) {
  const m = BRIDGES[index]
  const [els, setEls] = useState(m.nodes.map(() => 'C'))
  const [fb, setFb] = useState(null)
  const cycle = (i) => { const order = ['C', 'N', 'O']; setEls((cur) => cur.map((x, k) => (k === i ? order[(order.indexOf(x) + 1) % 3] : x))); setFb(null) }
  const atoms = [...els, ...m.hs.map(() => 'H')]
  const bonds = [...m.bonds, ...m.hs.map(([n], k) => [n, els.length + k, 1])]
  const check = () => {
    const r = checkOctets(atoms, bonds)
    if (r.ok) { sfx('right'); setFb({ ok: true, text: `Every atom has the bonds it needs: H 1, C 4, N 3, O 2. ${m.name} holds the bridge.` }); setTimeout(done, 1500) }
    else {
      sfx('wrong')
      const b = r.bad.find((x) => x.i < els.length) || r.bad[0]
      setFb({ ok: false, text: `${ELEMENTS[b.s].name} needs ${b.need} bond${b.need > 1 ? 's' : ''} to reach an octet, but this spot has ${b.got}. Try another element here.` })
    }
  }
  const got = atoms.map(() => 0)
  bonds.forEach(([i, j, o]) => { got[i] += o; got[j] += o })
  return (
    <div>
      <h2>Socket Bridge</h2>
      <p className="ins">Each bridge stone is an atom. Click a heavy-atom stone to change it (C, N, O). The bridge holds only when every atom forms exactly as many bonds as it needs for an octet. <span className="cite">§1.4</span></p>
      <svg viewBox="0 0 300 160" className="molsvg">
        {m.bonds.map(([i, j, o], k) => {
          const a = m.nodes[i], b = m.nodes[j]
          return <g key={k}>{o === 2 ? <><line x1={a.x} y1={a.y - 4} x2={b.x} y2={b.y - 4} className="bnd" /><line x1={a.x} y1={a.y + 4} x2={b.x} y2={b.y + 4} className="bnd" /></> : <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="bnd" />}</g>
        })}
        {m.hs.map(([n, x, y], k) => <g key={'h' + k}><line x1={m.nodes[n].x} y1={m.nodes[n].y} x2={x} y2={y} className="bnd" /><circle cx={x} cy={y} r="11" fill="#f4f4f4" /><text x={x} y={y + 4} textAnchor="middle" className="hl">H</text></g>)}
        {m.nodes.map((nd, i) => {
          const ok = got[i] === ELEMENTS[els[i]].valence
          return <g key={i} onClick={() => cycle(i)} style={{ cursor: 'pointer' }}>
            <circle cx={nd.x} cy={nd.y} r="20" fill={ELEMENTS[els[i]].color} stroke={ok ? '#43e6f5' : '#c0394b'} strokeWidth="3" />
            <text x={nd.x} y={nd.y + 6} textAnchor="middle" className="al">{els[i]}</text>
            <text x={nd.x} y={nd.y + 38} textAnchor="middle" className="cnt">{got[i]}/{ELEMENTS[els[i]].valence}</text>
          </g>
        })}
      </svg>
      <p className="mname">{m.name.split(',')[0].replace(/./g, (c, i) => (i === 0 ? c : c))} — bonds shown under each stone</p>
      <button className="go" onClick={check}>Cross the bridge</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 1-3 Energy well: bond length and strength of H₂ (§1.5)
function EnergyWell({ done }) {
  const [r, setR] = useState(200)
  const [fb, setFb] = useState(null)
  const E = h2Energy(r)
  const pts = useMemo(() => {
    const out = []
    for (let x = 35; x <= 260; x += 3) { const e = Math.min(250, h2Energy(x)); out.push([x, e]) }
    return out
  }, [])
  const sx = (x) => 20 + (x - 30) * 1.15
  const sy = (e) => 12 + (250 - e) * 0.18 // +250 kJ/mol at the top, the −436 well bottom near the bottom
  const check = () => {
    if (Math.abs(r - H2.length) <= 5) { sfx('right'); setFb({ ok: true, text: `Bond length ≈ ${H2.length} pm at the bottom of the well; forming the bond releases ${H2.depth} kJ/mol, its bond strength.` }); setTimeout(done, 1700) }
    else if (r < H2.length) { sfx('wrong'); setFb({ ok: false, text: 'Too close: the two positive nuclei repel each other and the energy climbs.' }) }
    else { sfx('wrong'); setFb({ ok: false, text: "Too far apart: the atoms can't share their electrons, so little energy is released." }) }
  }
  return (
    <div>
      <h2>The Energy Well</h2>
      <p className="ins">Pull the two hydrogen atoms together. Lock them where the energy is lowest — that distance is the bond length. <span className="cite">§1.5</span></p>
      <svg viewBox="0 0 300 152" className="molsvg">
        <line x1="20" y1={sy(0)} x2="290" y2={sy(0)} stroke="#3a3346" strokeDasharray="4 4" />
        <polyline fill="none" stroke="#e8c46a" strokeWidth="2.5" points={pts.map(([x, e]) => `${sx(x)},${sy(e)}`).join(' ')} />
        <circle cx={sx(r)} cy={sy(Math.min(250, E))} r="6" fill="#43e6f5" />
        <text x="180" y="147" className="axis">internuclear distance →</text>
        <text x="22" y={sy(0) - 3} className="axis">0 kJ/mol</text>
      </svg>
      <div className="h2pair"><span className="hatom">H</span><span style={{ width: (r - 30) * 0.8 }} className="gap" /><span className="hatom">H</span></div>
      <input type="range" min="35" max="260" value={r} onChange={(e) => { setR(+e.target.value); setFb(null) }} className="slider" />
      <div className="readout">distance {r} pm · energy {Math.round(E)} kJ/mol</div>
      <button className="go" onClick={check}>Lock the bond</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- 1-5 Skeleton Gallery: count hidden hydrogens (§1.12)
const SKELETONS = [
  { name: 'Isoprene', formula: 'C₅H₈', nodes: [[40, 110], [90, 80], [90, 25], [140, 110], [190, 80]], bonds: [[0, 1, 2], [1, 2, 1], [1, 3, 1], [3, 4, 2]] },
  { name: 'Methylcyclohexane', formula: 'C₇H₁₄', nodes: [[150, 40], [195, 65], [195, 115], [150, 140], [105, 115], [105, 65], [150, -5]], bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1], [0, 6, 1]] },
]
function Skeleton({ index = 0, done }) {
  const m = SKELETONS[index]
  const [hs, setHs] = useState(m.nodes.map(() => null))
  const [fb, setFb] = useState(null)
  const orders = m.nodes.map((_, i) => m.bonds.filter(([a, b]) => a === i || b === i).map(([, , o]) => o))
  const answer = orders.map((o) => hydrogensOnCarbon(o))
  const click = (i) => { setHs((cur) => cur.map((x, k) => (k === i ? (x === null ? 0 : (x + 1) % 4) : x))); setFb(null) }
  const check = () => {
    const wrong = hs.findIndex((h, i) => h !== answer[i])
    if (wrong < 0) { sfx('right'); setFb({ ok: true, text: `${m.name}, ${m.formula}. Every corner and line end is a carbon; carbon makes four bonds, so the drawing hides the rest as hydrogens.` }); setTimeout(done, 1700) }
    else { sfx('wrong'); setFb({ ok: false, text: `Check the highlighted carbon: the lines drawn to it add up to ${orders[wrong].reduce((s, o) => s + o, 0)} bond${orders[wrong].reduce((s, o) => s + o, 0) > 1 ? 's' : ''}${orders[wrong].includes(2) ? ' (a double line counts as two)' : ''}, so it needs ${answer[wrong]} hidden hydrogen${answer[wrong] === 1 ? '' : 's'} to make four.` }) }
  }
  const wrongIdx = fb && !fb.ok ? hs.findIndex((h, i) => h !== answer[i]) : -1
  return (
    <div>
      <h2>Skeleton Gallery</h2>
      <p className="ins">This painting shows <b>{m.name}</b> as a skeletal structure: a carbon at every corner and every line end, hydrogens not drawn. Click each carbon to set how many hydrogens it hides. <span className="cite">§1.12</span></p>
      <svg viewBox="0 -20 300 180" className="molsvg">
        {m.bonds.map(([i, j, o], k) => {
          const [ax, ay] = m.nodes[i], [bx, by] = m.nodes[j]
          const nx = -(by - ay), ny = bx - ax, L = Math.hypot(nx, ny) || 1
          return <g key={k}><line x1={ax} y1={ay} x2={bx} y2={by} className="bnd" />{o === 2 && <line x1={ax + (nx / L) * 7} y1={ay + (ny / L) * 7} x2={bx + (nx / L) * 7} y2={by + (ny / L) * 7} className="bnd" />}</g>
        })}
        {m.nodes.map(([x, y], i) => (
          <g key={i} onClick={() => click(i)} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r="13" fill={hs[i] === null ? '#1d1a24' : '#2b2b2b'} stroke={i === wrongIdx ? '#c0394b' : '#43e6f5'} strokeWidth="2" />
            <text x={x} y={y + 4} textAnchor="middle" className="hl2">{hs[i] === null ? '?' : `H${hs[i]}`}</text>
          </g>
        ))}
      </svg>
      <button className="go" onClick={check}>Reveal the painting</button>
      <Feedback fb={fb} />
    </div>
  )
}

// ---------- Learning check: hybridization of propene's carbons (§1.8)
function HybridCheck({ done }) {
  // propene CH3–CH=CH2: carbon bond orders (C–H count as single bonds)
  const carbons = [{ label: 'CH₃', orders: [1, 1, 1, 1] }, { label: 'CH', orders: [1, 2, 1] }, { label: 'CH₂', orders: [2, 1, 1] }]
  const [pick, setPick] = useState(carbons.map(() => null))
  const [fb, setFb] = useState(null)
  const opts = ['sp3', 'sp2', 'sp']
  const check = () => {
    const ans = carbons.map((c) => carbonHybridization(c.orders))
    const bad = pick.findIndex((p, i) => p !== ans[i])
    if (bad < 0) { sfx('right'); setFb({ ok: true, text: 'CH₃ is sp³ (four single bonds, 109.5°); both double-bond carbons are sp² (120°, one π bond each).' }); setTimeout(done, 1800) }
    else { sfx('wrong'); setFb({ ok: false, text: `Carbon ${bad + 1} (${carbons[bad].label}) has ${carbons[bad].orders.some((o) => o === 2) ? 'a double bond — one π bond needs one unhybridized p orbital' : 'only single bonds — four equivalent hybrid orbitals'}.` }) }
  }
  return (
    <div>
      <h2>Pi's Challenge</h2>
      <p className="ins">Build propene, CH₃–CH=CH₂: pick the hybrid shape of each carbon. <span className="cite">§1.6–1.8</span></p>
      <div className="propene">
        {carbons.map((c, i) => (
          <div key={i} className="ccol"><div className="clab">{c.label}</div>
            {opts.map((o) => <button key={o} className={pick[i] === o ? 'sel' : ''} onClick={() => { setPick((cur) => cur.map((x, k) => (k === i ? o : x))); setFb(null) }}>{HYBRIDS[o].label}</button>)}
          </div>
        ))}
      </div>
      <button className="go" onClick={check}>Show Pi</button>
      <Feedback fb={fb} />
    </div>
  )
}
