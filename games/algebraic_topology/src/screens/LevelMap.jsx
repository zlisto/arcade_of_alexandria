/**
 * The level map, bottom left: the level's sites and causeways seen from above, finished
 * sites filled gold, the next destination ringed and pulsing (labelled NEXT), and Gyroid
 * (YOU) with a dashed line pointing the way there. Works from any layout made of sites
 * with circle or rect shapes (buildSites), causeways and an exit.
 *
 * sites: buildSites(layout) · done: { id: true } · next: a site id, or 'exit' · pos: [x, z]
 */
export default function LevelMap({ layout, sites, done, next, pos, title }) {
  // fit the level's extent into the map
  const pts = []
  for (const s of sites) {
    const a = s.def.add[0]
    if (a.type === 'rect') pts.push([s.pos[0] + a.x0, s.pos[1] + a.z0], [s.pos[0] + a.x1, s.pos[1] + a.z1])
    else pts.push([s.pos[0] - a.r, s.pos[1] - a.r], [s.pos[0] + a.r, s.pos[1] + a.r])
  }
  if (layout.exit) pts.push(layout.exit.b)
  const minX = Math.min(...pts.map((p) => p[0])) - 1.5
  const maxX = Math.max(...pts.map((p) => p[0])) + 1.5
  const minZ = Math.min(...pts.map((p) => p[1])) - 1.5
  const maxZ = Math.max(...pts.map((p) => p[1])) + 1.5
  const W = 100
  const H = Math.max(50, Math.min(110, (W * (maxZ - minZ)) / (maxX - minX)))
  const k = Math.min(W / (maxX - minX), H / (maxZ - minZ))
  const ox = (W - (maxX - minX) * k) / 2
  const oz = (H - (maxZ - minZ) * k) / 2
  const P = ([x, z]) => [ox + (x - minX) * k, oz + (z - minZ) * k]
  const target = next === 'exit' ? layout.exit?.gate : sites.find((s) => s.id === next)?.pos
  const [gx, gz] = P(pos)
  const [tx, tz] = target ? P(target) : [gx, gz]
  return (
    <svg className="minimap level-map" viewBox={`0 0 ${W} ${H}`} aria-label={`${title || 'Level'} map`}>
      <rect width={W} height={H} rx="4" fill="#0b1220" opacity="0.92" />
      {layout.causeways.map((c, i) => {
        const [x1, y1] = P(c.a)
        const [x2, y2] = P(c.b)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5c6680" strokeWidth={Math.max(1, (layout.causewayWidth || 1.5) * k * 0.7)} strokeLinecap="round" />
      })}
      {layout.exit && (() => {
        const [x1, y1] = P(layout.exit.a)
        const [x2, y2] = P(layout.exit.b)
        return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ff8a3a" strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.8" />
      })()}
      {sites.map((s) => {
        const a = s.def.add[0]
        const fill = done[s.id] ? '#ffb347' : s.kind === 'start' ? '#2a5a58' : '#1c2436'
        const stroke = s.id === next ? '#ffffff' : done[s.id] ? '#ffd27a' : '#6a7896'
        if (a.type === 'rect') {
          const [x0, y0] = P([s.pos[0] + a.x0, s.pos[1] + a.z0])
          const [x1, y1] = P([s.pos[0] + a.x1, s.pos[1] + a.z1])
          return <rect key={s.id} x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="1.5" fill={fill} stroke={stroke} strokeWidth="0.6" opacity={done[s.id] ? 0.75 : 1} />
        }
        const [x, y] = P(s.pos)
        return <circle key={s.id} cx={x} cy={y} r={Math.max(1.6, a.r * k)} fill={fill} stroke={stroke} strokeWidth="0.6" opacity={done[s.id] ? 0.75 : 1} />
      })}
      {target && (
        <>
          <line x1={gx} y1={gz} x2={tx} y2={tz} stroke="#7fe8dc" strokeWidth="0.6" strokeDasharray="1.6 1.4" opacity="0.8" />
          <circle cx={tx} cy={tz} r="4" fill="none" stroke="#7fe8dc" strokeWidth="0.9" className="map-pulse" />
          <text x={tx} y={tz - 5.2} textAnchor="middle" fill="#7fe8dc" fontSize="4" fontWeight="800">
            {next === 'exit' ? 'EXIT' : 'NEXT'}
          </text>
        </>
      )}
      <circle cx={gx} cy={gz} r="1.9" fill="#3ecfbf" stroke="#fff" strokeWidth="0.6" />
      <text x={gx} y={gz + 5.2} textAnchor="middle" fill="#ffffff" fontSize="3.4" fontWeight="700">
        YOU
      </text>
    </svg>
  )
}

/** The "go here next" marker, for maps drawn by hand: a pulsing ring, a label and a dashed line from Gyroid. */
export function MapNext({ from, to, label = 'NEXT' }) {
  if (!to) return null
  return (
    <>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke="#7fe8dc" strokeWidth="0.6" strokeDasharray="1.6 1.4" opacity="0.8" />
      <circle cx={to[0]} cy={to[1]} r="4" fill="none" stroke="#7fe8dc" strokeWidth="0.9" className="map-pulse" />
      <text x={to[0]} y={to[1] - 5.2} textAnchor="middle" fill="#7fe8dc" fontSize="4" fontWeight="800">
        {label}
      </text>
    </>
  )
}
