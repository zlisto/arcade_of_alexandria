/**
 * Free-Word Forge theme — two-voice canon (red / violet) that never quite aligns.
 * Integrator: paste scheduleFreeWord + startFreeWordMusic into src/audio/chip.js (see integration/1_6.md).
 * Until merged, Level 1-6 falls back to startForgeMusic.
 */

/** @typedef {(step: number, t: number, buf: AudioBuffer) => void} ScheduleFn */

/** Paste block for chip.js — uses blipAt, hatAt, padAt, hz, musicBus, echo, startLoop. */
export const FREEWORD_CHIP_APPEND = `
const FREEWORD_STEP = 60 / 96 / 4
const FREEWORD_RED = [
  [0, 0, 64, 6], [0, 8, 67, 4], [1, 0, 69, 8],
  [2, 0, 67, 4], [2, 6, 64, 6], [3, 0, 62, 8],
]
const FREEWORD_VIO = [
  [0, 4, 71, 6], [1, 4, 69, 4], [2, 4, 67, 8],
  [3, 4, 64, 4], [3, 10, 62, 6],
]
function scheduleFreeWord(step, t, buf) {
  const s = step % 64
  const bar = Math.floor(s / 16)
  const k = s % 16
  if (k % 4 === 0) blipAt(t, hz(36), { dur: FREEWORD_STEP * 3, type: 'triangle', vol: 0.11, bus: musicBus })
  if (k % 2 === 1) hatAt(t, buf, 0.018)
  for (const [b, ls, midi, len] of FREEWORD_RED)
    if (b === bar && ls === k) blipAt(t, hz(midi), { dur: FREEWORD_STEP * len, type: 'square', vol: 0.045, bus: musicBus, out: echo })
  for (const [b, ls, midi, len] of FREEWORD_VIO)
    if (b === bar && ls === k) blipAt(t, hz(midi + 1), { dur: FREEWORD_STEP * len, type: 'triangle', vol: 0.038, bus: musicBus })
}
export function startFreeWordMusic() { startLoop(scheduleFreeWord, FREEWORD_STEP) }
`

/** Runtime fallback when chip export missing. */
export function startFreeWordMusicFallback(startForgeMusic) {
  if (typeof startForgeMusic === 'function') startForgeMusic()
}
