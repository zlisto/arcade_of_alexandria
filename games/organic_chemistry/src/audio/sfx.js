// Synthesized sound effects and a simple ambient music bed (WebAudio, no files).
let ctx = null
let master = null
let musicNodes = []
// the Sound on/off choice is remembered between visits
let muted = (() => { try { return localStorage.getItem('valence-muted') === '1' } catch { return false } })()

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m) {
  muted = m
  if (master) master.gain.value = m ? 0 : 0.5
  try { localStorage.setItem('valence-muted', m ? '1' : '0') } catch { /* storage blocked */ }
}
export function isMuted() { return muted }

function tone({ f = 440, f2, type = 'sine', dur = 0.15, vol = 0.25, attack = 0.005, delay = 0, filter }) {
  const c = ac()
  if (!c || muted) return
  const t = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node = o
  if (filter) {
    const bq = c.createBiquadFilter()
    bq.type = 'lowpass'
    bq.frequency.value = filter
    o.connect(bq)
    node = bq
  }
  node.connect(g)
  g.connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

// a swoosh: band-passed noise whose pitch sweeps up while it swells and fades (blade through air)
function swoosh({ dur = 0.4, vol = 0.3, f1 = 500, f2 = 2600, delay = 0 }) {
  const c = ac()
  if (!c || muted) return
  const t = c.currentTime + delay
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const bq = c.createBiquadFilter()
  bq.type = 'bandpass'; bq.Q.value = 1.6
  bq.frequency.setValueAtTime(f1, t)
  bq.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6)
  bq.frequency.exponentialRampToValueAtTime(f1 * 0.8, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.45)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bq); bq.connect(g); g.connect(master)
  src.start(t)
}

function noise({ dur = 0.15, vol = 0.2, filter = 1200, delay = 0, hp = 0 }) {
  const c = ac()
  if (!c || muted) return
  const t = c.currentTime + delay
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const bq = c.createBiquadFilter()
  bq.type = hp ? 'highpass' : 'lowpass'
  bq.frequency.value = hp || filter
  const g = c.createGain()
  g.gain.value = vol
  src.connect(bq)
  bq.connect(g)
  g.connect(master)
  src.start(t)
}

const SFX = {
  swing: () => noise({ dur: 0.14, vol: 0.14, hp: 1800 }),
  // sword charge, after A Link to the Past: a rising buzz while it builds, then a bright two-note
  // "doo-DOO" chime when the spin attack is ready
  chargeUp: () => { tone({ f: 196, f2: 784, type: 'square', dur: 0.42, vol: 0.045, filter: 1600, attack: 0.03 }); tone({ f: 392, f2: 1568, type: 'triangle', dur: 0.42, vol: 0.03, attack: 0.03 }) },
  chargeFull: () => {
    tone({ f: 1175, type: 'square', dur: 0.09, vol: 0.07, filter: 4000 }) // D6
    tone({ f: 1760, type: 'square', dur: 0.26, vol: 0.07, filter: 4000, delay: 0.1 }) // A6
    tone({ f: 2350, type: 'triangle', dur: 0.3, vol: 0.035, delay: 0.1 })
    noise({ dur: 0.18, vol: 0.03, hp: 6000, delay: 0.1 })
  },
  // Curved-Arrow Hookshot: a zip out, a bright clank when it bites, a dull clink when it finds nothing
  hookFire: () => { tone({ f: 500, f2: 1900, type: 'square', dur: 0.22, vol: 0.05, filter: 3000 }); noise({ dur: 0.18, vol: 0.05, hp: 3500 }) },
  hookHit: () => { tone({ f: 1400, type: 'triangle', dur: 0.12, vol: 0.12 }); tone({ f: 2100, type: 'triangle', dur: 0.18, vol: 0.08, delay: 0.05 }); noise({ dur: 0.06, vol: 0.12, hp: 2500 }) },
  hookClink: () => { tone({ f: 380, f2: 300, type: 'square', dur: 0.08, vol: 0.08, filter: 1500 }); tone({ f: 260, type: 'square', dur: 0.1, vol: 0.06, filter: 1200, delay: 0.08 }) },
  spin: () => { swoosh({ dur: 0.42, vol: 0.32, f1: 420, f2: 2400 }); swoosh({ dur: 0.36, vol: 0.18, f1: 700, f2: 3200, delay: 0.16 }) },
  hit: () => { tone({ f: 180, f2: 60, type: 'square', dur: 0.12, vol: 0.18, filter: 900 }); noise({ dur: 0.08, vol: 0.2, filter: 3000 }) },
  hurt: () => tone({ f: 330, f2: 110, type: 'square', dur: 0.25, vol: 0.18, filter: 1400 }),
  block: () => { tone({ f: 900, f2: 700, type: 'triangle', dur: 0.12, vol: 0.18 }); noise({ dur: 0.05, vol: 0.12, hp: 3000 }) },
  roll: () => noise({ dur: 0.22, vol: 0.1, filter: 600 }),
  dash: () => tone({ f: 400, f2: 1600, type: 'sawtooth', dur: 0.25, vol: 0.08, filter: 3000 }),
  hop: () => tone({ f: 300, f2: 500, type: 'triangle', dur: 0.12, vol: 0.1 }),
  lock: () => { tone({ f: 880, dur: 0.07, vol: 0.12, type: 'triangle' }); tone({ f: 1320, dur: 0.09, vol: 0.1, type: 'triangle', delay: 0.06 }) },
  stance: () => tone({ f: 520, f2: 1040, type: 'sine', dur: 0.2, vol: 0.15 }),
  pickup: () => { tone({ f: 660, dur: 0.08, vol: 0.14, type: 'triangle' }); tone({ f: 990, dur: 0.12, vol: 0.12, type: 'triangle', delay: 0.07 }) },
  bond: () => { tone({ f: 523, dur: 0.12, vol: 0.14 }); tone({ f: 659, dur: 0.12, vol: 0.12, delay: 0.08 }); tone({ f: 784, dur: 0.2, vol: 0.12, delay: 0.16 }) },
  pair: () => { tone({ f: 784, dur: 0.3, vol: 0.14 }); tone({ f: 1046, dur: 0.4, vol: 0.12, delay: 0.05 }); noise({ dur: 0.3, vol: 0.06, hp: 4000 }) },
  split: () => { tone({ f: 200, f2: 420, type: 'sawtooth', dur: 0.18, vol: 0.1, filter: 1500 }); tone({ f: 210, f2: 440, type: 'sawtooth', dur: 0.18, vol: 0.08, filter: 1500, delay: 0.03 }) },
  open: () => { tone({ f: 110, f2: 70, type: 'sawtooth', dur: 0.9, vol: 0.12, filter: 500 }); tone({ f: 392, dur: 0.4, vol: 0.1, delay: 0.3 }); tone({ f: 523, dur: 0.6, vol: 0.1, delay: 0.45 }) },
  wrong: () => { tone({ f: 220, type: 'square', dur: 0.12, vol: 0.1, filter: 900 }); tone({ f: 185, type: 'square', dur: 0.2, vol: 0.1, filter: 900, delay: 0.12 }) },
  right: () => { tone({ f: 659, dur: 0.1, vol: 0.12 }); tone({ f: 880, dur: 0.18, vol: 0.12, delay: 0.09 }) },
  growl: () => tone({ f: 120, f2: 70, type: 'sawtooth', dur: 0.4, vol: 0.08, filter: 400 }),
  stomp: () => { tone({ f: 70, f2: 35, type: 'sine', dur: 0.5, vol: 0.4 }); noise({ dur: 0.4, vol: 0.2, filter: 300 }) },
  warp: () => { swoosh({ dur: 0.9, vol: 0.3, f1: 300, f2: 4200 }); [784, 1046, 1318, 1568, 2093].forEach((f, i) => tone({ f, dur: 0.35, vol: 0.07, delay: 0.1 + i * 0.06, type: 'triangle' })) },
  shard: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, dur: 0.5, vol: 0.1, delay: i * 0.09, type: 'triangle' })),
  text: () => tone({ f: 1200 + Math.random() * 200, dur: 0.03, vol: 0.03, type: 'square', filter: 2500 }),
  shatter: () => { noise({ dur: 1.2, vol: 0.3, hp: 1500 }); [1318, 1046, 880, 659].forEach((f, i) => tone({ f, f2: f / 2, dur: 0.8, vol: 0.08, delay: i * 0.05, type: 'triangle' })) },
}

export function sfx(name) {
  try { SFX[name] && SFX[name]() } catch (e) { /* audio blocked */ }
}

// Ambient music: a slow pad on a chord loop plus a gentle arpeggio. mood: 'village' | 'cave' | 'boss' | 'intro'
const MOODS = {
  village: { chords: [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]], arp: true, tempo: 2.4, type: 'triangle' },
  cave: { chords: [[146.8, 174.6, 220], [130.8, 164.8, 196], [116.5, 146.8, 174.6], [110, 138.6, 164.8]], arp: true, tempo: 3.2, type: 'sine' },
  boss: { chords: [[110, 130.8, 164.8], [103.8, 123.5, 155.6], [98, 116.5, 146.8], [110, 130.8, 164.8]], arp: true, tempo: 1.2, type: 'sawtooth' },
  temple: { chords: [[220, 261.6, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [164.8, 207.7, 246.9]], arp: true, tempo: 2.8, type: 'sine' },
  forest: { chords: [[196, 246.9, 293.7], [174.6, 220, 261.6], [164.8, 196, 246.9], [146.8, 185, 220]], arp: true, tempo: 3, type: 'triangle' },
  hills: { chords: [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 311.1]], arp: true, tempo: 2.6, type: 'triangle' },
  lake: { chords: [[261.6, 329.6, 392], [246.9, 311.1, 370], [220, 277.2, 329.6], [246.9, 311.1, 392]], arp: true, tempo: 3.4, type: 'sine' },
  palace: { chords: [[196, 246.9, 293.7], [185, 233.1, 277.2], [174.6, 220, 261.6], [185, 233.1, 293.7]], arp: true, tempo: 2.8, type: 'triangle' },
  peaks: { chords: [[293.7, 370, 440], [261.6, 329.6, 392], [246.9, 311.1, 370], [220, 277.2, 329.6]], arp: true, tempo: 3.0, type: 'triangle' },
  caves: { chords: [[130.8, 164.8, 196], [123.5, 155.6, 185], [110, 138.6, 164.8], [116.5, 146.8, 174.6]], arp: true, tempo: 3.4, type: 'sine' },
  plains: { chords: [[261.6, 329.6, 392], [293.7, 370, 440], [329.6, 392, 493.9], [293.7, 349.2, 440]], arp: true, tempo: 2.2, type: 'triangle' },
  tower: { chords: [[174.6, 220, 261.6], [164.8, 207.7, 246.9], [146.8, 185, 220], [164.8, 196, 246.9]], arp: true, tempo: 3.0, type: 'sine' },
  orchard: { chords: [[293.7, 349.2, 440], [261.6, 329.6, 392], [233.1, 293.7, 349.2], [261.6, 311.1, 392]], arp: true, tempo: 2.6, type: 'triangle' },
  glasshouse: { chords: [[220, 277.2, 329.6], [207.7, 261.6, 311.1], [196, 246.9, 293.7], [207.7, 246.9, 311.1]], arp: true, tempo: 3.2, type: 'sine' },
  fortress: { chords: [[146.8, 174.6, 220], [138.6, 164.8, 207.7], [130.8, 155.6, 196], [138.6, 174.6, 207.7]], arp: true, tempo: 3.0, type: 'sine' },
  labyrinth: { chords: [[164.8, 196, 246.9], [146.8, 174.6, 220], [130.8, 164.8, 196], [146.8, 185, 220]], arp: true, tempo: 3.4, type: 'sine' },
  intro: { chords: [[146.8, 185, 220], [130.8, 164.8, 196], [123.5, 146.8, 185], [110, 138.6, 164.8]], arp: false, tempo: 3.5, type: 'sine' },
}
let musicTimer = null
export function playMusic(mood) {
  stopMusic()
  const c = ac()
  if (!c) return
  const m = MOODS[mood]
  if (!m) return
  let i = 0
  const step = () => {
    if (muted) return
    const ch = m.chords[i % m.chords.length]
    ch.forEach((f) => tone({ f, type: m.type, dur: m.tempo * 1.1, vol: 0.035, attack: 0.6, filter: 1200 }))
    tone({ f: ch[0] / 2, type: 'sine', dur: m.tempo * 1.1, vol: 0.05, attack: 0.4 })
    if (m.arp) ch.concat([ch[0] * 2]).forEach((f, k) => tone({ f: f * 2, type: 'triangle', dur: 0.4, vol: 0.022, delay: k * (m.tempo / 4) }))
    i++
  }
  step()
  musicTimer = setInterval(step, m.tempo * 1000)
}
export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer)
  musicTimer = null
  musicNodes = []
}
