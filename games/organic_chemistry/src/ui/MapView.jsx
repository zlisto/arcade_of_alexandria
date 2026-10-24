import { useEffect, useRef } from 'react'
import { getActiveWorld } from '../engine/active'
import { getState, setState, useGame } from '../engine/store'

// Top-down map drawn straight from the scene's collision data (floors, walls, open pits), so any
// level gets a map for free. North (−z) is up. Shows Kai with a cone of light where he faces,
// the next goal (gold star; an edge arrow when it's off the minimap), stations and enemies.
// The scene fills in world.map = { floor, wall, pit, labels, goal() }.

const GROUND_WALL = 1.0 // solids starting below this height block walking; higher ones are low ceilings

function bounds(world) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity
  for (const f of world.floors.values()) { x0 = Math.min(x0, f.min[0]); z0 = Math.min(z0, f.min[1]); x1 = Math.max(x1, f.max[0]); z1 = Math.max(z1, f.max[1]) }
  if (!isFinite(x0)) for (const s of world.solids.values()) { x0 = Math.min(x0, s.min[0]); z0 = Math.min(z0, s.min[2]); x1 = Math.max(x1, s.max[0]); z1 = Math.max(z1, s.max[2]) }
  return isFinite(x0) ? [x0, z0, x1, z1] : [-20, -20, 20, 20]
}

function draw(ctx, w, h, world, view, opts) {
  const m = world.map || {}
  const [cx, cz, scale] = view
  const X = (x) => (x - cx) * scale + w / 2
  const Y = (z) => (z - cz) * scale + h / 2
  const t = performance.now() / 1000
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = m.pit || '#07060b'
  ctx.fillRect(0, 0, w, h)
  // Ocarina-style: without the Dungeon Map, only the stretches (z-ranges) you've visited are drawn
  const mask = m.mask && m.mask()
  ctx.save()
  if (mask) {
    ctx.beginPath()
    for (const [za, zb] of mask) ctx.rect(0, Y(Math.min(za, zb)), w, (Math.abs(za - zb)) * scale)
    ctx.clip()
  }
  // walkable floor
  ctx.fillStyle = m.floor || '#3b3850'
  for (const f of world.floors.values()) {
    if (!f.enabled) continue
    ctx.fillRect(X(f.min[0]), Y(f.min[1]), (f.max[0] - f.min[0]) * scale, (f.max[1] - f.min[1]) * scale)
  }
  // walls, then low ceilings (passable only when flat) as a dashed outline
  ctx.fillStyle = m.wall || '#14121c'
  const low = []
  for (const s of world.solids.values()) {
    if (!s.enabled) continue
    if (s.min[1] >= GROUND_WALL) { if (s.min[1] < 3) low.push(s); continue }
    ctx.fillRect(X(s.min[0]), Y(s.min[2]), (s.max[0] - s.min[0]) * scale, (s.max[2] - s.min[2]) * scale)
  }
  ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(67,230,245,.7)'; ctx.lineWidth = 1
  for (const s of low) ctx.strokeRect(X(s.min[0]), Y(s.min[2]), (s.max[0] - s.min[0]) * scale, (s.max[2] - s.min[2]) * scale)
  ctx.setLineDash([])
  // labels (full map only)
  if (opts.full && m.labels) {
    ctx.font = '600 12px Inter, system-ui, sans-serif'
    ctx.fillStyle = 'rgba(240,230,200,.85)'
    for (const l of m.labels) { ctx.textAlign = l.align || 'center'; ctx.fillText(l.text, X(l.pos[0]), Y(l.pos[1]) + 4) }
  }
  // stations / talkable things
  for (const it of world.interactables.values()) {
    if (!it.enabled) continue
    const p = typeof it.pos === 'function' ? it.pos() : it.pos
    ctx.fillStyle = 'rgba(67,230,245,.9)'
    ctx.beginPath(); ctx.arc(X(p[0]), Y(p[2]), opts.full ? 3 : 2.5, 0, Math.PI * 2); ctx.fill()
  }
  // enemies
  for (const e of world.targets.values()) {
    if (!e.alive()) continue
    const p = e.pos()
    ctx.fillStyle = '#c070ff'
    ctx.beginPath(); ctx.arc(X(p[0]), Y(p[2]), opts.full ? 4 : 3, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
  // goal
  const goal = m.goal && m.goal()
  if (goal) {
    let gx = X(goal.pos[0]), gy = Y(goal.pos[1])
    const pad = 12
    const off = gx < pad || gy < pad || gx > w - pad || gy > h - pad
    if (off) {
      // arrow on the edge, pointing toward the goal
      const dx = gx - w / 2, dy = gy - h / 2
      const k = Math.min((w / 2 - pad) / Math.abs(dx || 1e-6), (h / 2 - pad) / Math.abs(dy || 1e-6))
      const ex = w / 2 + dx * k, ey = h / 2 + dy * k
      const a = Math.atan2(dy, dx)
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a)
      ctx.fillStyle = '#ffd76a'
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill()
      ctx.restore()
    } else {
      const r = (opts.full ? 9 : 7) * (1 + 0.15 * Math.sin(t * 4))
      ctx.strokeStyle = 'rgba(255,215,106,.45)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(gx, gy, r + 5 + 3 * Math.sin(t * 4), 0, Math.PI * 2); ctx.stroke()
      star(ctx, gx, gy, r, '#ffd76a')
      if (opts.full) {
        ctx.font = '600 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(goal.label, gx, gy - r - 8)
        ctx.fillStyle = '#ffe9a8'; ctx.fillText(goal.label, gx, gy - r - 8)
      }
    }
  }
  // Kai: a cone of light where he faces, then the marker
  const p = world.player
  if (p) {
    const px = X(p.pos.x), py = Y(p.pos.z)
    // facing f moves Kai along (sin f, cos f) in x,z; on the map +z is down, so the canvas angle is atan2(cos f, sin f)
    const a = Math.atan2(Math.cos(p.facing), Math.sin(p.facing))
    const len = opts.full ? Math.max(28, 9 * scale) : 34
    const spread = 0.55
    const g = ctx.createRadialGradient(px, py, 2, px, py, len)
    g.addColorStop(0, 'rgba(255,250,210,.75)'); g.addColorStop(1, 'rgba(255,250,210,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, len, a - spread, a + spread); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#43e6f5'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(px, py, opts.full ? 5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
  return goal
}

function star(ctx, x, y, r, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath(); ctx.fill()
}

function useCanvasLoop(ref, size, render) {
  useEffect(() => {
    let raf
    const cv = ref.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const world = getActiveWorld()
      if (!cv || !world || !world.map) return
      const [w, h] = size()
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
      const ctx = cv.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      render(ctx, w, h, world)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}

export function MiniMap() {
  const ref = useRef()
  const hidden = useGame((s) => !!(s.dialogue || s.panel || s.mapOpen))
  useCanvasLoop(ref, () => { const el = ref.current?.parentElement; return el && el.clientWidth ? [el.clientWidth, el.clientHeight] : [168, 168] }, (ctx, w, h, world) => {
    const p = world.player
    draw(ctx, w, h, world, [p ? p.pos.x : 0, p ? p.pos.z : 0, 3.4], { full: false })
  })
  return (
    <div className="minimap" style={{ display: hidden ? 'none' : 'block' }} onClick={(e) => { e.stopPropagation(); setState({ mapOpen: true }) }} title="Map (M)">
      <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
      <span className="mm-n">N</span>
      <span className="mm-key"><span className="key">M</span> map</span>
    </div>
  )
}

export function FullMap() {
  const open = useGame((s) => s.mapOpen)
  const ref = useRef()
  const goalRef = useRef()
  const zoom = useRef(1) // scroll-wheel multiplier on the default view
  useEffect(() => { if (open) zoom.current = 1 }, [open])
  useCanvasLoop(ref, () => { const el = ref.current?.parentElement; return el ? [el.clientWidth, el.clientHeight] : [600, 400] }, (ctx, w, h, world) => {
    if (!getState().mapOpen) return
    const [x0, z0, x1, z1] = bounds(world)
    const pad = 28
    const fit = Math.min((w - pad * 2) / Math.max(1, x1 - x0), (h - pad * 2) / Math.max(1, z1 - z0))
    // default view frames Kai and the goal (at least ~50 m across), so long dungeons aren't a thin strip
    const p = world.player
    const px = p ? p.pos.x : (x0 + x1) / 2, pz = p ? p.pos.z : (z0 + z1) / 2
    const g = world.map.goal && world.map.goal()
    const span = g ? Math.max(50, Math.hypot(g.pos[0] - px, g.pos[1] - pz) * 2.4) : 50
    const base = Math.max(fit, Math.min(w, h) / span)
    const scale = Math.max(fit, Math.min(fit * 14, base * zoom.current))
    let cx = g ? (px + g.pos[0]) / 2 : px, cz = g ? (pz + g.pos[1]) / 2 : pz
    // keep the level on screen: center it on an axis where it fits, otherwise clamp to its edges
    const hw = w / 2 / scale - pad / scale, hh = h / 2 / scale - pad / scale
    cx = (x1 - x0) <= hw * 2 ? (x0 + x1) / 2 : Math.min(x1 - hw, Math.max(x0 + hw, cx))
    cz = (z1 - z0) <= hh * 2 ? (z0 + z1) / 2 : Math.min(z1 - hh, Math.max(z0 + hh, cz))
    const goal = draw(ctx, w, h, world, [cx, cz, scale], { full: true })
    if (goalRef.current) goalRef.current.textContent = goal ? goal.label : 'Explore freely'
  })
  const onWheel = (e) => { zoom.current = Math.max(0.05, Math.min(14, zoom.current * (e.deltaY < 0 ? 1.2 : 1 / 1.2))) }
  return (
    <div className="fullmap" style={{ display: open ? 'flex' : 'none' }} onClick={() => setState({ mapOpen: false })}>
      <div className="fm-box" onClick={(e) => e.stopPropagation()}>
        <div className="fm-head"><b>Map</b><span className="fm-goal">Next: <span ref={goalRef} /></span><span className="fm-hint">scroll to zoom</span><button onClick={() => setState({ mapOpen: false })}>Close <span className="key">M</span></button></div>
        <div className="fm-canvas" onWheel={onWheel}><canvas ref={ref} style={{ width: '100%', height: '100%' }} /></div>
        <div className="fm-legend">
          <span><i className="lg kai" /> Kai (cone = facing)</span><span><i className="lg goal" /> Go here next</span>
          <span><i className="lg st" /> Station / person</span><span><i className="lg en" /> Enemy</span><span><i className="lg low" /> Low tunnel (sp²)</span>
        </div>
      </div>
    </div>
  )
}
