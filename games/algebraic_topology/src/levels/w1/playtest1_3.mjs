/** Goal-machine smoke test — node src/levels/w1/playtest1_3.mjs */
import { addWindings, makeRingTracker } from './winding.js'
import { STATION_ORDER, STATIONS } from './stages1_3.js'

let bank = 0
let goalIdx = Object.fromEntries(STATION_ORDER.map((id) => [id, 0]))
const done = Object.fromEntries(STATION_ORDER.map((id) => [id, false]))

const advance = (station) => {
  const gi = goalIdx[station]
  const goals = STATIONS[station].goals
  if (gi + 1 >= goals.length) done[station] = true
  else goalIdx[station] = gi + 1
}

const simulateLap = (center, w) => {
  const tr = makeRingTracker(center, 3.35, 4.95)
  const R = 4.2
  for (let step = 0; step <= 120; step++) {
    const t = (w >= 0 ? 1 : -1) * (step / 120) * Math.PI * 2
    tr.update(center[0] + R * Math.cos(t), center[1] + R * Math.sin(t))
  }
  return w
}

for (const id of STATION_ORDER) {
  for (const goal of STATIONS[id].goals) {
    if (goal.type === 'lap') {
      bank = addWindings(bank, simulateLap([0, 12], goal.n))
      advance(id)
    } else if (goal.type === 'slide') advance(id)
    else if (goal.type === 'unwind') {
      simulateLap([-13, 4], -goal.winder)
      advance(id)
    } else if (goal.type === 'gate') {
      while (bank !== goal.n) bank = addWindings(bank, simulateLap([0, -4], goal.n > bank ? 1 : -1))
      bank = 0
      advance(id)
    }
  }
}

const ok = STATION_ORDER.every((id) => done[id])
console.log(ok ? 'playtest1_3: all stations cleared' : 'playtest1_3: FAILED', { done })
process.exit(ok ? 0 : 1)
