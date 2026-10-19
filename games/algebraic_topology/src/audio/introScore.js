/**
 * Procedural score for the intro cinematic, synthesized with Web Audio and
 * cued to the shot list in data/introScript.js (times in story seconds; the
 * scheduler maps them through the intro's pacing, so slowed scenes stretch).
 *
 *  -30–0   prelude       slow D minor pads, sparse celesta, Gyroid's figure
 *   0–6    wonder        D minor pads + celesta arpeggios
 *   6–13   Count Null    sub drone, dissonant pads, timpani, his motif D–E♭–D–A
 *   13–21  the collapse  pulsing bass, riser, boom on the flash, eerie tail
 *   21–28  the run       140 bpm ostinato, drums, heroic lead
 *   28–34  spines hold   soft F major → D major swell on "Anchor set!"
 *   34–40  Null watches  drone + music-box motif
 *   40–46  title         main theme, resolves to D major
 */

import { wallAt } from '../data/introScript'

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const hz = (name) => {
  const m = /^([A-G][b#]?)(-?\d)$/.exec(name)
  const midi = NOTE[m[1]] + (Number(m[2]) + 1) * 12
  return 440 * 2 ** ((midi - 69) / 12)
}

const BPM = 140
const BEAT = 60 / BPM
const BAR = BEAT * 4

export function createIntroScore() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  const ctx = new Ctx()

  // ---- mix bus: instruments → (dry + reverb) → master → compressor → out
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 4
  comp.connect(ctx.destination)
  const master = ctx.createGain()
  master.gain.value = 0.7
  master.connect(comp)

  const reverb = ctx.createConvolver()
  reverb.buffer = impulse(3.2, 2.6)
  const revIn = ctx.createGain()
  revIn.gain.value = 0.45
  revIn.connect(reverb).connect(master)

  const delay = ctx.createDelay(1)
  delay.delayTime.value = BEAT * 0.75
  const fb = ctx.createGain()
  fb.gain.value = 0.32
  delay.connect(fb).connect(delay)
  delay.connect(revIn)
  delay.connect(master)

  const noise = (() => {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return b
  })()

  function impulse(seconds, decay) {
    const len = ctx.sampleRate * seconds
    const b = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay
    }
    return b
  }

  // ---- scheduling: score (story) time → audio time
  let origin = 0 // audio time at which the intro's real clock reads 0
  let offset = 0 // score time we started from (dev seeking)
  const at = (t) => Math.max(0, origin + wallAt(t)) // events before a dev seek land at 0 and start at once
  const live = (t, len) => t + len > offset // skip events that ended before the seek point

  function out(node, wet = 0.5) {
    node.connect(master)
    const send = ctx.createGain()
    send.gain.value = wet
    node.connect(send).connect(revIn)
  }

  function env(g, t0, peak, attack, hold, release) {
    const now = ctx.currentTime
    const a = Math.max(now, at(t0))
    g.gain.setValueAtTime(0, a)
    g.gain.linearRampToValueAtTime(peak, a + attack)
    const end = Math.max(a + attack, at(t0 + attack + hold)) // sustain stretches with the pacing
    g.gain.setValueAtTime(peak, end)
    g.gain.linearRampToValueAtTime(0, end + release)
  }

  // ---- instruments
  function pad(t, notes, dur, { vel = 0.05, cutoff = 1300, attack = 1.2, release = 1.6, type = 'sawtooth', wet = 0.7 } = {}) {
    if (!live(t, dur + release)) return
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    f.Q.value = 0.6
    const g = ctx.createGain()
    f.connect(g)
    out(g, wet)
    env(g, t, vel, attack, Math.max(0, dur - attack), release)
    for (const n of notes) {
      for (const det of [-8, 7]) {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.value = hz(n)
        o.detune.value = det
        o.connect(f)
        o.start(at(t))
        o.stop(at(t + dur + release + 0.1))
      }
    }
  }

  function celesta(t, n, vel = 0.1) {
    if (!live(t, 1.5)) return
    const g = ctx.createGain()
    g.connect(delay)
    out(g, 0.6)
    const a = at(t)
    g.gain.setValueAtTime(0, Math.max(ctx.currentTime, a))
    g.gain.linearRampToValueAtTime(vel, a + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, a + 1.4)
    ;[
      [1, 1],
      [2, 0.25],
      [4.01, 0.08],
    ].forEach(([mul, amp]) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz(n) * mul
      const og = ctx.createGain()
      og.gain.value = amp
      o.connect(og).connect(g)
      o.start(a)
      o.stop(a + 1.5)
    })
  }

  function bass(t, n, dur, vel = 0.12, cutoff = 700) {
    if (!live(t, dur + 0.2)) return
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = hz(n)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.Q.value = 4
    f.frequency.setValueAtTime(cutoff * 2.2, at(t))
    f.frequency.exponentialRampToValueAtTime(cutoff * 0.5, at(t + dur))
    const g = ctx.createGain()
    o.connect(f).connect(g)
    out(g, 0.15)
    env(g, t, vel, 0.01, Math.max(0, dur - 0.06), 0.08)
    o.start(at(t))
    o.stop(at(t + dur + 0.2))
  }

  function lead(t, n, dur, vel = 0.055, cutoff = 2400) {
    if (!live(t, dur + 0.4)) return
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    const g = ctx.createGain()
    f.connect(g)
    out(g, 0.55)
    env(g, t, vel, 0.06, Math.max(0, dur - 0.1), 0.35)
    const vib = ctx.createOscillator()
    vib.frequency.value = 5.2
    const vibAmt = ctx.createGain()
    vibAmt.gain.setValueAtTime(0, at(t))
    vibAmt.gain.linearRampToValueAtTime(dur > 0.6 ? 9 : 0, at(t + Math.min(dur, 0.6)))
    vib.connect(vibAmt)
    for (const [type, det] of [['sawtooth', -6], ['sawtooth', 6], ['square', 0]]) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = hz(n)
      o.detune.value = det
      vibAmt.connect(o.detune)
      const og = ctx.createGain()
      og.gain.value = type === 'square' ? 0.35 : 0.6
      o.connect(og).connect(f)
      o.start(at(t))
      o.stop(at(t + dur + 0.5))
    }
    vib.start(at(t))
    vib.stop(at(t + dur + 0.5))
  }

  function drum(t, { from, to, len, vel, wet = 0.2, noiseAmt = 0, noiseFreq = 1500 }) {
    if (!live(t, len)) return
    const a = at(t)
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(from, a)
    o.frequency.exponentialRampToValueAtTime(to, a + len * 0.6)
    const g = ctx.createGain()
    o.connect(g)
    out(g, wet)
    g.gain.setValueAtTime(vel, Math.max(ctx.currentTime, a))
    g.gain.exponentialRampToValueAtTime(0.0001, a + len)
    o.start(a)
    o.stop(a + len + 0.05)
    if (noiseAmt) hiss(t, len * 0.5, noiseAmt, noiseFreq, 'bandpass', wet)
  }

  function hiss(t, len, vel, freq, type = 'highpass', wet = 0.1) {
    if (!live(t, len)) return
    const a = at(t)
    const s = ctx.createBufferSource()
    s.buffer = noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = ctx.createGain()
    s.connect(f).connect(g)
    out(g, wet)
    g.gain.setValueAtTime(vel, Math.max(ctx.currentTime, a))
    g.gain.exponentialRampToValueAtTime(0.0001, a + len)
    s.start(a, Math.random())
    s.stop(a + len + 0.05)
  }

  const kick = (t, vel = 0.5) => drum(t, { from: 130, to: 42, len: 0.35, vel, wet: 0.05 })
  const snare = (t, vel = 0.12) => drum(t, { from: 220, to: 160, len: 0.18, vel: vel * 0.6, noiseAmt: vel, noiseFreq: 1800, wet: 0.25 })
  const hat = (t, vel = 0.04) => hiss(t, 0.05, vel, 8000)
  const timp = (t, n, vel = 0.45) => drum(t, { from: hz(n) * 1.15, to: hz(n), len: 1.6, vel, wet: 0.6, noiseAmt: 0.05, noiseFreq: 400 })

  function boom(t) {
    drum(t, { from: 80, to: 26, len: 3, vel: 0.9, wet: 0.8 })
    hiss(t, 1.8, 0.35, 900, 'lowpass', 0.8)
  }

  function riser(t, dur, vel = 0.18) {
    if (!live(t, dur)) return
    const a = at(t)
    const s = ctx.createBufferSource()
    s.buffer = noise
    s.loop = true
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 3
    f.frequency.setValueAtTime(250, a)
    f.frequency.exponentialRampToValueAtTime(6000, a + dur)
    const g = ctx.createGain()
    s.connect(f).connect(g)
    out(g, 0.5)
    g.gain.setValueAtTime(0.0001, Math.max(ctx.currentTime, a))
    g.gain.exponentialRampToValueAtTime(vel, a + dur * 0.97)
    g.gain.linearRampToValueAtTime(0, a + dur)
    s.start(a)
    s.stop(a + dur + 0.05)
  }

  const drone = (t, dur, notes, vel = 0.1) => pad(t, notes, dur, { vel, cutoff: 280, attack: 1.5, release: 2, wet: 0.4 })

  /** play [note, beats] pairs from time t */
  function phrase(t, notes, fn) {
    let c = t
    for (const [n, beats] of notes) {
      const d = beats * BEAT
      if (n) fn(c, n, d)
      c += d
    }
  }

  // ---------------------------------------------------------------- the score
  function compose() {
    // P · prelude (-30–0): the world before the collapse
    const prelude = [
      ['D2', ['D3', 'A3', 'E4', 'F4']],
      ['Bb1', ['Bb2', 'F3', 'A3', 'D4']],
      ['G1', ['G2', 'D3', 'F3', 'Bb3']],
      ['A1', ['A2', 'E3', 'G3', 'C#4']],
    ]
    for (let i = 0; i < 6; i++) {
      const t0 = -30 + i * 5
      const [root, chord] = prelude[i % 4]
      pad(t0, chord, 5.4, { vel: 0.035, cutoff: 1200, attack: 2, release: 2 })
      bass(t0, root, 4.8, 0.04, 260)
      ;[0.9, 2.4, 3.6].forEach((dt, j) => celesta(t0 + dt, chord[(j + i) % chord.length].replace(/\d/, (o) => String(Number(o) + 2)), 0.05))
    }
    // Gyroid's figure, as the camera finds them on the reef
    phrase(-9.4, [['A4', 1], ['D5', 1], ['E5', 0.5], ['F5', 1.5], ['E5', 1], ['C#5', 1], ['A4', 3]], (t, n, d) => lead(t, n, d * 0.95, 0.035, 1800))

    // A · wonder (0–6)
    pad(0, ['D3', 'A3', 'E4', 'F4'], 3.4, { vel: 0.045, cutoff: 1500, attack: 1.6 })
    pad(3.2, ['Bb2', 'F3', 'A3', 'D4'], 3.2, { vel: 0.045, cutoff: 1500 })
    bass(0, 'D2', 3.2, 0.05, 300)
    bass(3.2, 'Bb1', 3, 0.05, 300)
    const arpA = ['D5', 'A5', 'E5', 'F5', 'A5', 'E5']
    const arpB = ['D5', 'F5', 'A5', 'Bb5', 'A5', 'F5']
    for (let i = 0, t = 0.6; t < 6; i++, t += BEAT * 0.75) celesta(t, (t < 3.2 ? arpA : arpB)[i % 6], 0.07)

    // B · Count Null (6–13)
    drone(6, 7.4, ['D1', 'D2'], 0.13)
    pad(6.2, ['A2', 'F3', 'Eb4'], 3.4, { vel: 0.04, cutoff: 900, attack: 2 })
    timp(6.6, 'D2')
    riser(8.4, 1.2, 0.08)
    timp(9.6, 'D2', 0.55)
    timp(9.8, 'A1', 0.4)
    pad(9.6, ['Bb1', 'E3', 'G3', 'Db4'], 3.6, { vel: 0.05, cutoff: 1000, attack: 0.6 })
    phrase(9.8, [['D3', 1.2], ['Eb3', 1.2], ['D3', 0.9], ['A2', 3]], (t, n, d) => lead(t, n, d, 0.06, 900))

    // C · the collapse (13–21): D – Bb – Gm – A, building into the boom
    const roots = [
      ['D2', ['D3', 'F3', 'A3']],
      ['Bb1', ['Bb2', 'D3', 'F3']],
      ['G1', ['G2', 'Bb2', 'D3', 'Eb3']],
      ['A1', ['A2', 'C#3', 'E3', 'G3']],
    ]
    timp(13.6, 'D2', 0.6)
    roots.forEach(([root, chord], i) => {
      const t0 = 13.6 + i * BAR
      const tEnd = Math.min(t0 + BAR, 19.85)
      pad(t0, chord, tEnd - t0, { vel: 0.035 + i * 0.01, cutoff: 900 + i * 500, attack: 0.3, release: 0.4 })
      for (let t = t0; t < tEnd - 0.01; t += BEAT / 2) bass(t, root, BEAT / 2 - 0.02, 0.06 + i * 0.025, 500 + i * 200)
      if (i >= 1) for (let b = 0; b < 4 && t0 + b * BEAT < 19.8; b++) kick(t0 + b * BEAT, 0.25 + i * 0.1)
      if (i >= 2) for (let b = 0; b < 8 && t0 + b * BEAT / 2 < 19.8; b++) hat(t0 + b * BEAT / 2 + BEAT / 4, 0.03)
    })
    riser(16.4, 3.5, 0.22)
    boom(19.95)
    pad(20.3, ['A4', 'Bb4'], 1.2, { vel: 0.015, cutoff: 3000, type: 'sine', attack: 0.4 })
    celesta(20.7, 'D6', 0.05)

    // D · the run (21–28): Dm – Bb – C – A at 140 bpm
    const run = [
      ['D2', ['D3', 'F3', 'A3']],
      ['Bb1', ['Bb2', 'D3', 'F3']],
      ['C2', ['C3', 'E3', 'G3']],
      ['A1', ['A2', 'C#3', 'E3']],
    ]
    const R0 = 21.0
    run.forEach(([root, chord], i) => {
      const t0 = R0 + i * BAR
      pad(t0, chord, BAR, { vel: 0.035, cutoff: 1800, attack: 0.15, release: 0.3 })
      const up = root.replace(/\d/, (o) => String(Number(o) + 1))
      for (let s = 0; s < 16; s++) bass(t0 + (s * BEAT) / 4, [root, root, up, root][s % 4], BEAT / 4 - 0.02, 0.09, 900)
      for (let b = 0; b < 4; b++) {
        kick(t0 + b * BEAT, 0.5)
        if (b % 2 === 1) snare(t0 + b * BEAT, 0.13)
        hat(t0 + b * BEAT + BEAT / 2, 0.035)
      }
    })
    phrase(R0 + BEAT, [
      ['D4', 1], ['F4', 0.5], ['A4', 1.5], ['G4', 0.5], ['F4', 0.5],
      ['D4', 1], ['F4', 0.5], ['Bb4', 1.5], ['A4', 1],
      ['G4', 1], ['E4', 0.5], ['C5', 1.5], ['Bb4', 1],
      ['A4', 2], ['C#5', 0.75], ['E5', 1.25],
    ], (t, n, d) => lead(t, n, d * 0.95, 0.05))

    // E · the spines hold (28–34)
    pad(28, ['F3', 'A3', 'C4', 'G4'], 2.8, { vel: 0.035, cutoff: 1400, attack: 0.8, release: 0.6 })
    celesta(28.5, 'C6', 0.06)
    celesta(29.3, 'A5', 0.06)
    celesta(30.0, 'F5', 0.06)
    timp(30.8, 'D2', 0.6)
    bass(30.8, 'D2', 3, 0.08, 400)
    pad(30.8, ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], 3.2, { vel: 0.065, cutoff: 2600, attack: 0.35, release: 1.6 })
    ;['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6'].forEach((n, i) => celesta(30.85 + i * 0.09, n, 0.08))
    lead(30.9, 'A4', 0.45, 0.05)
    lead(31.35, 'D5', 2.4, 0.055)

    // F · Null watches (34–40)
    drone(34, 6, ['D1', 'D2'], 0.1)
    pad(34.2, ['A2', 'F3', 'Eb4'], 5, { vel: 0.03, cutoff: 800, attack: 2 })
    ;[['D4', 35], ['Eb4', 35.5], ['D4', 36], ['A3', 36.6]].forEach(([n, t]) => celesta(t, n, 0.09))
    timp(37, 'D2', 0.3)

    // G · title theme (40–46): Bb – C – D major
    pad(40, ['Bb2', 'D3', 'F3', 'Bb3'], 1.6, { vel: 0.05, cutoff: 2000, attack: 0.5, release: 0.3 })
    pad(41.6, ['C3', 'E3', 'G3', 'C4'], 1.6, { vel: 0.055, cutoff: 2200, attack: 0.2, release: 0.3 })
    pad(43.2, ['D3', 'F#3', 'A3', 'D4', 'F#4'], 2.3, { vel: 0.065, cutoff: 2600, attack: 0.2, release: 2.5 })
    bass(40, 'Bb1', 1.55, 0.08, 500)
    bass(41.6, 'C2', 1.55, 0.08, 500)
    bass(43.2, 'D2', 2.6, 0.09, 400)
    timp(40.5, 'Bb1', 0.4)
    for (let i = 0; i < 6; i++) timp(42.8 + i * 0.07, 'A1', 0.12 + i * 0.03)
    timp(43.2, 'D2', 0.6)
    phrase(40.1, [['F4', 1], ['Bb4', 1], ['D5', 1.75], ['C5', 1], ['E5', 1], ['G5', 1.75], ['F#5', 6]], (t, n, d) => lead(t, n, d * 0.97, 0.055))
    for (let i = 0, t = 43.3; t < 45.5; i++, t += BEAT * 0.75) celesta(t, ['D5', 'F#5', 'A5', 'D6'][i % 4], 0.05)
  }

  return {
    ctx,
    /** begin playback with score time `fromT` happening now */
    start(fromT = 0) {
      offset = fromT
      origin = ctx.currentTime + 0.05 - wallAt(fromT)
      compose()
      // fade out across the title card
      master.gain.setValueAtTime(master.gain.value, at(45))
      master.gain.linearRampToValueAtTime(0, at(46.8))
    },
    resume() {
      if (ctx.state === 'suspended') ctx.resume()
    },
    setMuted(m) {
      comp.disconnect()
      if (!m) comp.connect(ctx.destination)
    },
    stop() {
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + 0.25)
      setTimeout(() => ctx.close().catch(() => {}), 400)
    },
  }
}
