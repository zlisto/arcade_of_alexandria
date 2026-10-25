import { CONFORMERS, conformerName } from '../chem/rules3'
import { setState, getState } from '../engine/store'

// The Newman Lantern's view: the bond seen end-on (§3.6, Fig 3.7). Front carbon = the dot with three
// spokes to its centre; back carbon = the circle, its spokes starting at the rim. A live energy readout
// uses the book's numbers (Fig 3.8, 3.9, 3.10). Used by the HUD (state.newman) and by trial panels.

export function NewmanSvg({ kind, angle, size = 150 }) {
  const C = CONFORMERS[kind]
  const r = size * 0.22, L = size * 0.4, c = size / 2, pad = size * 0.2
  // eclipsed bonds sit exactly behind the front ones; draw them 8° off so both carbons stay visible (as Fig 3.7 does)
  const shown = ((Math.round(angle) % 120) + 120) % 120 === 0 ? angle + 8 : angle
  const spoke = (deg, from, to) => { const a = ((deg - 90) * Math.PI) / 180; return [c + Math.cos(a) * from, c + Math.sin(a) * from, c + Math.cos(a) * to, c + Math.sin(a) * to] }
  const eclipsed = shown !== angle
  const label = (deg, txt, key, back) => {
    const a = ((deg - 90 + (back && eclipsed ? 14 : 0)) * Math.PI) / 180, d = L + size * (back && eclipsed ? 0.22 : 0.08)
    const me = txt === 'CH₃'
    return <text key={key} x={c + Math.cos(a) * d} y={c + Math.sin(a) * d + 4} textAnchor="middle" fontSize={size * 0.085} fontWeight="700" fill={me ? (back ? '#ff9ad0' : '#ff6fb3') : '#e8e2d0'}>{txt}</text>
  }
  return (
    <svg viewBox={`${-pad} ${-pad} ${size + 2 * pad} ${size + 2 * pad}`} width={size} height={size}>
      {/* back carbon: spokes from the rim, rotated by the dihedral */}
      {C.back.map((g, i) => { const d = shown + i * 120; const [x1, y1, x2, y2] = spoke(d, r, L); return <g key={'b' + i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9fb6c8" strokeWidth={size * 0.025} strokeLinecap="round" />{label(d, g, 'bl' + i, true)}</g> })}
      <circle cx={c} cy={c} r={r} fill="#14202a" stroke="#cfe6ff" strokeWidth={size * 0.02} />
      {/* front carbon: spokes meet at the centre */}
      {C.front.map((g, i) => { const d = i * 120; const [x1, y1, x2, y2] = spoke(d, 0, L); return <g key={'f' + i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={size * 0.03} strokeLinecap="round" />{label(d, g, 'fl' + i, false)}</g> })}
      <circle cx={c} cy={c} r={size * 0.035} fill="#ffffff" />
    </svg>
  )
}

export function EnergyBar({ kind, angle }) {
  const C = CONFORMERS[kind]
  const e = C.energy(angle)
  const k = e / 19
  return (
    <div className="nm-energy">
      <div className="nm-bar"><i style={{ height: `${Math.max(4, k * 100)}%`, background: e === 0 ? '#6fe39a' : e < 5 ? '#ffd760' : '#ff6a5a' }} /></div>
      <div className="nm-num"><b>+{e}</b> kJ/mol<br /><small>above the lowest</small></div>
    </div>
  )
}

/** HUD overlay: { kind, angle, title, note, blind } — blind hides the name and energy (read the drawing!) */
export default function NewmanHud({ n }) {
  const nameNow = conformerName(n.kind, n.angle)
  const dihedral = ((Math.round(n.angle) % 360) + 360) % 360
  return (
    <div className="newman-hud">
      <div className="nm-title">{n.title || 'Newman Lantern'}</div>
      <div className="nm-row">
        <NewmanSvg kind={n.kind} angle={n.angle} />
        {!n.blind && <EnergyBar kind={n.kind} angle={n.angle} />}
      </div>
      {n.blind ? <div className="nm-name">Read the drawing: where are the CH₃ groups?</div> : <div className="nm-name">{nameNow}{n.kind === 'butane' ? ` · CH₃–CH₃ ${dihedral > 180 ? 360 - dihedral : dihedral}°` : ''}</div>}
      {n.note && <div className="nm-note">{n.note}</div>}
    </div>
  )
}

/** Show the Lantern's view in the HUD for a few seconds (each turn restarts the timer). */
let nmTimer = null
export function flashNewman(n, ms = 3800) {
  setState({ newman: n })
  clearTimeout(nmTimer)
  nmTimer = setTimeout(() => { if (getState().newman === n) setState({ newman: null }) }, ms)
}
