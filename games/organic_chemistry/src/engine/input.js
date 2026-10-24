// Keyboard + mouse + gamepad, mapped to game actions. Read once per frame with input.poll().
//
// Keyboard/mouse: WASD move · mouse look (click the game to capture the mouse) · Left click attack (hold to charge)
// Right click / Tab lock-on · Space roll (sidestep/backhop when locked) · Shift block · E interact
// R switch hybrid stance · 1–4 items · Esc release mouse / pause.
// Gamepad: left stick move · right stick camera · X attack · A roll/interact · LT lock-on · RB block · Y stance.

const keys = new Set()
const pressed = new Set() // edge-triggered this frame
let mouseDX = 0
let mouseDY = 0
let lmb = false
let rmb = false
let lmbPressed = false
let lmbReleased = false
let rmbPressed = false
let enabled = true
const gpPrev = {}

function down(code) {
  if (!keys.has(code)) pressed.add(code)
  keys.add(code)
}

export function initInput(target) {
  const kd = (e) => {
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault()
    down(e.code)
  }
  const ku = (e) => keys.delete(e.code)
  const mm = (e) => {
    if (document.pointerLockElement) { mouseDX += e.movementX; mouseDY += e.movementY }
  }
  const md = (e) => {
    if (e.button === 0) { lmb = true; lmbPressed = true }
    if (e.button === 2) { rmb = true; rmbPressed = true }
  }
  const mu = (e) => {
    if (e.button === 0) { lmb = false; lmbReleased = true }
    if (e.button === 2) rmb = false
  }
  const cm = (e) => e.preventDefault()
  const blur = () => { keys.clear(); lmb = rmb = false }
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  window.addEventListener('mousemove', mm)
  target.addEventListener('mousedown', md)
  window.addEventListener('mouseup', mu)
  target.addEventListener('contextmenu', cm)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', kd)
    window.removeEventListener('keyup', ku)
    window.removeEventListener('mousemove', mm)
    target.removeEventListener('mousedown', md)
    window.removeEventListener('mouseup', mu)
    target.removeEventListener('contextmenu', cm)
    window.removeEventListener('blur', blur)
  }
}

export function setInputEnabled(v) {
  enabled = v
  if (!v) { keys.clear(); lmb = rmb = false }
}

const DEAD = 0.18
const axis = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD))

/** Snapshot of the actions for this frame. */
export function poll() {
  const gp = (navigator.getGamepads ? [...navigator.getGamepads()] : []).find(Boolean)
  const g = { mx: 0, my: 0, cx: 0, cy: 0, attack: false, attackP: false, attackR: false, roll: false, lock: false, lockP: false, block: false, stanceP: false, interactP: false }
  if (gp) {
    const b = (i) => !!gp.buttons[i]?.pressed
    const edge = (i) => { const now = b(i); const was = gpPrev[i]; gpPrev[i] = now; return now && !was }
    const rel = (i) => { const now = b(i); const was = gpPrev['r' + i]; gpPrev['r' + i] = now; return !now && was }
    g.mx = axis(gp.axes[0] || 0)
    g.my = axis(gp.axes[1] || 0)
    g.cx = axis(gp.axes[2] || 0)
    g.cy = axis(gp.axes[3] || 0)
    g.attack = b(2)
    g.attackP = edge(2)
    g.attackR = rel(2)
    g.roll = edge(0)
    g.lock = b(6)
    g.lockP = edge(6)
    g.block = b(5)
    g.stanceP = edge(3)
    g.interactP = g.roll
    g.hookP = edge(1)
  }
  const k = (c) => keys.has(c)
  const p = (c) => pressed.has(c)
  const out = {
    moveX: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0) + g.mx,
    moveY: (k('KeyS') || k('ArrowDown') ? 1 : 0) - (k('KeyW') || k('ArrowUp') ? 1 : 0) + g.my,
    lookX: mouseDX * 0.0024 + g.cx * 0.05 + ((k('KeyL') ? 1 : 0) - (k('KeyJ') ? 1 : 0)) * 0.035,
    lookY: mouseDY * 0.0018 + g.cy * 0.03,
    attack: lmb || g.attack,
    attackPressed: lmbPressed || p('KeyF') || g.attackP,
    attackReleased: lmbReleased || g.attackR,
    roll: p('Space') || g.roll,
    lockHeld: rmb || g.lock,
    lockPressed: rmbPressed || p('Tab') || g.lockP,
    block: k('ShiftLeft') || k('ShiftRight') || g.block,
    stance: p('KeyR') || g.stanceP,
    interact: p('KeyE') || g.interactP,
    hook: p('KeyQ') || !!g.hookP,
    item: ['Digit1', 'Digit2', 'Digit3', 'Digit4'].findIndex((c) => p(c)),
    advance: p('Space') || p('Enter') || p('KeyE') || g.roll,
    pause: p('Escape') || p('KeyP'),
  }
  const len = Math.hypot(out.moveX, out.moveY)
  if (len > 1) { out.moveX /= len; out.moveY /= len }
  pressed.clear()
  mouseDX = mouseDY = 0
  lmbPressed = lmbReleased = rmbPressed = false
  if (!enabled) {
    return { ...out, moveX: 0, moveY: 0, lookX: 0, lookY: 0, attack: false, attackPressed: false, attackReleased: false, roll: false, lockHeld: false, lockPressed: false, block: false, stance: false, interact: false, hook: false, item: -1 }
  }
  return out
}

/** Dialogue / menu advance without consuming game input. */
export function peekAdvance() {
  return pressed.has('Space') || pressed.has('Enter') || pressed.has('KeyE')
}

// Let go of the mouse on purpose (a panel opened, the scene ended) — so the app can tell that apart
// from the player pressing Esc, which the browser turns into a pointer-lock exit.
let intentionalRelease = 0
export function releaseMouse() {
  if (!document.pointerLockElement) return
  intentionalRelease = performance.now()
  document.exitPointerLock()
}
export function wasIntentionalRelease() { return performance.now() - intentionalRelease < 600 }

// Capture the mouse for camera look; quietly does nothing where the browser refuses (embedded views, too soon after Esc).
export function captureMouse(el) {
  if (!el || !el.requestPointerLock || document.pointerLockElement) return
  try { const r = el.requestPointerLock(); if (r && r.catch) r.catch(() => {}) } catch { /* not allowed here */ }
}
