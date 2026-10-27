import { useSyncExternalStore } from 'react'

// Tiny global store shared by the 3D scene and the HTML UI.
const SAVE_KEY = 'valence-save-v1'

const defaultSave = () => ({
  introSeen: false,
  villageDone: false,
  well: false,
  wolvesCleared: false,
  hasCrystal: false,
  solved: {}, // chamber/puzzle id -> true
  bossDone: false,
  shards: 0,
  checkpoint: null, // { scene, pos }
})

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) }
  } catch (e) { /* storage blocked: play without saving */ }
  return defaultSave()
}

let state = {
  screen: 'title', // title | intro | village | caverns | field | coast | temple | forest | labyrinth
  flash: 0, // the shard warp's white-out (engine/Warp.jsx)
  warpIn: null, // { card } while Kai warps in outside a dungeon
  save: loadSave(),
  hp: 6,
  maxHp: 6,
  stance: 'sp3',
  sockets: [], // what Kai is carrying in his four bond sockets, e.g. ['H','H']
  dialogue: null, // { lines:[{who, text}], onDone }
  panel: null, // { kind, props }
  prompt: null, // interact label
  toast: null, // { text, kind, id }
  objective: '',
  lockTarget: null,
  bossHp: null, // { name, hp, max }
  paused: false,
  mapOpen: false, // full map overlay (M)
  menuTab: 'items', // item menu (Esc / P) — shown while paused
  stanceRequest: null, // a stance picked in the item menu, applied by the Player on resume
  fade: 0,
}
const subs = new Set()

export function getState() { return state }
export function setState(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  subs.forEach((f) => f())
}
export function subscribe(f) { subs.add(f); return () => subs.delete(f) }
export function useGame(sel = (s) => s) {
  return useSyncExternalStore(subscribe, () => sel(state))
}

export function saveGame(patch = {}) {
  const save = { ...state.save, ...patch }
  setState({ save })
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch (e) { /* ignore */ }
}
export function markSolved(id) {
  saveGame({ solved: { ...state.save.solved, [id]: true } })
}
export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY) } catch (e) { /* ignore */ }
  setState({ save: defaultSave(), hp: 6, sockets: [], stance: 'sp3' })
}

let toastId = 0
export function toast(text, kind = 'info', ms = 3200) {
  const id = ++toastId
  setState({ toast: { text, kind, id } })
  setTimeout(() => { if (state.toast && state.toast.id === id) setState({ toast: null }) }, ms)
}

/** Show dialogue lines; resolves when the player finishes them. */
export function say(lines) {
  return new Promise((resolve) => setState({ dialogue: { lines, onDone: resolve } }))
}
/** True while a cinematic plays (a cutscene, the shard warp or its world card): enemies hold still. */
export function inCinematic() { const s = state; return !!(s.cutscene || s.warpIn || (s.panel && s.panel.kind === 'worldDone')) }

export function openPanel(kind, props = {}) {
  return new Promise((resolve) => setState({ panel: { kind, props, onClose: resolve } }))
}
