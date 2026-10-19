// Dev-only playtest helpers (loaded only under `vite` dev, never in production builds).
//   __tp(x, z)        teleport Gyroid
//   __dlg()           click through every open dialogue box, returns the lines seen
//   __key(code, ms)   hold a key for ms
//   __box()           height/width of the open dialogue box (to catch resizing glitches)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
window.__sleep = sleep
window.__errs = []
window.addEventListener('error', (e) => window.__errs.push(String(e.message)))
window.addEventListener('unhandledrejection', (e) => window.__errs.push('rej: ' + String(e.reason)))
const origErr = console.error
console.error = (...a) => {
  window.__errs.push(a.map(String).join(' ').slice(0, 300))
  origErr(...a)
}
window.__tp = (x, z) => {
  window.__game.state.x = x
  window.__game.state.z = z
}
window.__dlg = async (max = 60) => {
  const log = []
  for (let i = 0; i < max; i++) {
    const d = document.querySelector('.dialog')
    if (!d) break
    log.push(`${d.querySelector('.speaker')?.textContent}: ${d.querySelector('p')?.textContent.slice(0, 60)}`)
    d.querySelector('button')?.click()
    await sleep(40)
    document.querySelector('.dialog button')?.click()
    await sleep(150)
  }
  return log
}
/** first <button> whose text starts with t (clicks go through real handlers) */
window.__btn = (t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(t))
/** click a button by text, with a short wait */
window.__ck = async (t, ms = 120) => {
  const b = window.__btn(t)
  if (!b) return `MISSING ${t}`
  b.click()
  await sleep(ms)
  return null
}
/** Click through a movie/lesson with Space until it ends (or maxSec); returns caption stats + glitches. */
window.__movie = async (maxSec = 100) => {
  const t0 = performance.now()
  const seen = new Map()
  const glitches = []
  let sizes = new Set()
  while (performance.now() - t0 < maxSec * 1000) {
    const m = document.querySelector('.screen.intro')
    if (!m) return JSON.stringify({ ended: true, secs: Math.round((performance.now() - t0) / 1000), captions: seen.size, glitches, errs: window.__errs })
    const c = m.querySelector('.intro-caption')
    if (c) {
      const key = c.querySelector('p')?.textContent.length + ':' + c.querySelector('.speaker')?.textContent
      const r = c.getBoundingClientRect()
      const full = c.querySelector('.caption-next')
      const rec = seen.get(c.className + c.dataset?.k) || null
      if (full) {
        const txt = c.querySelector('p').textContent
        if (!seen.has(txt)) {
          seen.set(txt, 1)
          if (c.scrollHeight > c.clientHeight + 2) glitches.push('overflow: ' + txt.slice(0, 40))
          const pr = c.querySelector('.portrait')
          if (c.classList.contains('has-portrait') && !pr) glitches.push('no portrait: ' + txt.slice(0, 40))
          sizes.add(Math.round(r.height))
        }
      }
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }))
    await sleep(120)
  }
  return JSON.stringify({ ended: false, captions: seen.size, glitches, sizes: [...sizes], errs: window.__errs, cap: document.querySelector('.intro-caption')?.textContent?.slice(0, 80) })
}
/** points of a petal track (same formula as cells.makeTrack), forward or reversed */
window.__track = (hub, { angle, length = 4.2, spread = 1.15 }, dir = 1, n = 70) => {
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const s = i / n
    const r = length * Math.sin(Math.PI * s) ** 0.85
    const a = angle + spread * (s - 0.5)
    return [hub[0] + r * Math.cos(a), hub[1] + r * Math.sin(a)]
  })
  return dir > 0 ? pts : pts.reverse()
}
/** teleport Gyroid along a list of [x,z], one step per ms */
/** (holdKey: keep a move key down so the game sees "moving" — needed by tools that only count while walking) */
window.__walk = async (pts, ms = 45, holdKey = null) => {
  if (holdKey) window.dispatchEvent(new KeyboardEvent('keydown', { code: holdKey, bubbles: true }))
  for (const [x, z] of pts) {
    window.__tp(x, z)
    await sleep(ms)
  }
  if (holdKey) window.dispatchEvent(new KeyboardEvent('keyup', { code: holdKey, bubbles: true }))
}
/** a circle of points around (cx,cz), counter-clockwise by default */
window.__circle = (cx, cz, r, turns = 1, n = 90) => Array.from({ length: Math.round(n * Math.abs(turns)) + 1 }, (_, i) => {
  const a = Math.sign(turns) * (2 * Math.PI * i) / n
  return [cx + r * Math.cos(a), cz + r * Math.sin(a)]
})
window.__key = async (code, ms) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }))
  await sleep(ms)
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))
}
window.__box = () => {
  const r = document.querySelector('.dialog')?.getBoundingClientRect()
  return r && [Math.round(r.width), Math.round(r.height)]
}
