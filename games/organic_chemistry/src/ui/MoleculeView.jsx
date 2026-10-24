import { useEffect, useRef, useState } from 'react'
import { ELEMENTS } from '../chem/rules'

// A slowly turning ball-and-stick model drawn as SVG (no second WebGL canvas): atoms and bonds are
// projected and drawn back-to-front; double and triple bonds show as parallel lines.

const R = { H: 0.28, C: 0.42, N: 0.4, O: 0.4 }
// carbon's usual near-black would vanish on the dark panel, so it's drawn charcoal here
const EXTRA = { B: '#f0b0a0', Mg: '#8adf6a' } // not in the Chapter 1 element table
const col = (el) => (el === 'C' ? '#5a5a66' : ELEMENTS[el]?.color || EXTRA[el] || '#ccc')

export default function MoleculeView({ geo, size = 220 }) {
  const [a, setA] = useState(0.6)
  const drag = useRef(null)
  useEffect(() => {
    let raf, last = performance.now()
    const tick = (t) => { if (!drag.current) setA((x) => x + ((t - last) / 1000) * 0.6); last = t; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const tilt = 0.35
  const ca = Math.cos(a), sa = Math.sin(a), ct = Math.cos(tilt), st = Math.sin(tilt)
  const P = geo.atoms.map(([el, [x, y, z]]) => {
    const x1 = x * ca + z * sa, z1 = -x * sa + z * ca
    const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct
    return { el, x: x1, y: -y2, z: z2 }
  })
  const ext = Math.max(1.2, ...P.map((p) => Math.hypot(p.x, p.y) + R[p.el]))
  const k = size / 2 / ext / 1.05
  const items = []
  geo.bonds.forEach(([i, j, o], n) => {
    const A = P[i], B = P[j]
    const dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy) || 1
    const nx = -dy / l, ny = dx / l
    const offs = o === 1 ? [0] : o === 2 ? [-0.09, 0.09] : [-0.13, 0, 0.13]
    items.push({ z: (A.z + B.z) / 2 - 0.01, key: 'b' + n, el: offs.map((d, m) => <line key={m} x1={(A.x + nx * d) * k} y1={(A.y + ny * d) * k} x2={(B.x + nx * d) * k} y2={(B.y + ny * d) * k} stroke="#9aa3ad" strokeWidth={o === 1 ? 0.16 * k : 0.09 * k} strokeLinecap="round" />) })
  })
  P.forEach((p, n) => {
    items.push({ z: p.z, key: 'a' + n, el: <circle cx={p.x * k} cy={p.y * k} r={R[p.el] * k} fill={`url(#g-${p.el})`} stroke="rgba(0,0,0,.35)" strokeWidth={1} /> })
  })
  items.sort((u, v) => u.z - v.z)
  const els = [...new Set(P.map((p) => p.el))]
  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size} className="molview"
      onPointerDown={(e) => { drag.current = { x: e.clientX, a }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => { if (drag.current) setA(drag.current.a + (e.clientX - drag.current.x) * 0.012) }}
      onPointerUp={() => { drag.current = null }}>
      <defs>
        {els.map((el) => (
          <radialGradient key={el} id={`g-${el}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={el === 'H' ? 1 : 0.55} />
            <stop offset="35%" stopColor={col(el)} />
            <stop offset="100%" stopColor={col(el)} stopOpacity="0.8" />
          </radialGradient>
        ))}
      </defs>
      {items.map((it) => <g key={it.key}>{it.el}</g>)}
    </svg>
  )
}
