import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import KaiModel from '../actors/KaiModel'
import { poll } from './input'
import { getState, setState, toast } from './store'
import { sfx } from '../audio/sfx'

// Kai's controller. Ocarina-style: camera-relative running, roll (i-frames), lock-on with strafe,
// sidestep and backhop, a 3-hit combo, a charged spin, block, hybrid stances, and auto-jump off ledges.

const GRAV = -30
const R = 0.38
const STEP = 0.45
export const STANCE = {
  sp3: { speed: 6.4, height: 1.75, label: 'sp³ · tetrahedral' },
  sp2: { speed: 7.2, height: 0.95, label: 'sp² · flat' },
  sp: { speed: 6.0, height: 1.75, label: 'sp · linear' },
}
const angleLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k

export default function Player({ world, start = [0, 0, 0], startFacing = 0 }) {
  const group = useRef()
  const model = useRef()
  const st = useRef(null)
  if (!st.current) {
    st.current = {
      pos: new THREE.Vector3(...start), vel: new THREE.Vector3(), facing: startFacing, grounded: true,
      mode: 'move', modeT: 0, rollDir: new THREE.Vector2(), iframes: 0, combo: 0, comboQueued: false, hitDone: false,
      charge: 0, attackHeld: 0, phase: 0, run: 0, lockId: null, lastSafe: new THREE.Vector3(...start), safeT: 0,
      hurtT: 0, knock: new THREE.Vector3(), airTime: 0, dashT: 0,
    }
  }

  if (!world.cam) world.cam = { yaw: startFacing + Math.PI, pitch: 0.32, lastManual: -10 }
  useEffect(() => {
    const s = st.current
    world.player = {
      get pos() { return s.pos },
      get facing() { return s.facing },
      get stance() { return getState().stance },
      get lockId() { return s.lockId },
      get height() { return STANCE[getState().stance].height },
      get mode() { return s.mode },
      get rolling() { return s.mode === 'roll' || s.mode === 'dash' },
      teleport(p, facing) { s.pos.set(...p); s.vel.set(0, 0, 0); s.lastSafe.set(...p); if (facing !== undefined) { s.facing = facing; world.cam.yaw = facing + Math.PI } },
      hurt(dmg, from) {
        if (s.iframes > 0 || getState().dialogue || getState().panel) return false
        // shield: frontal hits are blocked while holding block
        const dir = new THREE.Vector3(s.pos.x - from[0], 0, s.pos.z - from[2]).normalize()
        const fwd = new THREE.Vector3(Math.sin(s.facing), 0, Math.cos(s.facing))
        if (s.mode === 'block' && fwd.dot(dir) < -0.35) { sfx('block'); s.knock.copy(dir).multiplyScalar(4); return false }
        const hp = Math.max(0, getState().hp - dmg)
        setState({ hp })
        sfx('hurt')
        s.iframes = 1.1
        s.hurtT = 0.35
        s.mode = 'hurt'
        s.modeT = 0
        s.knock.copy(dir).multiplyScalar(9)
        world.hitStop = 0.06
        if (hp <= 0) {
          setTimeout(() => {
            setState({ hp: getState().maxHp })
            const cp = world.respawn
            s.pos.set(...cp)
            s.vel.set(0, 0, 0)
            toast('Kai is knocked out — back to the last checkpoint.', 'warn')
          }, 400)
        }
        return true
      },
    }
    return () => { world.player = null }
  }, [world])

  useFrame((state, rawDt) => {
    const s = st.current
    const dtReal = Math.min(rawDt, 1 / 30)
    if (world.hitStop > 0) { world.hitStop -= dtReal; return }
    const dt = dtReal
    world.time += dt
    const gs = getState()
    const inp = poll()
    const busy = !!(gs.dialogue || gs.panel || gs.paused || gs.cutscene)
    const cam = world.cam

    // ---- camera look
    if (!busy) {
      if (Math.abs(inp.lookX) > 0.0005 || Math.abs(inp.lookY) > 0.0005) cam.lastManual = world.time
      cam.yaw -= inp.lookX
      cam.pitch = THREE.MathUtils.clamp(cam.pitch + inp.lookY, -0.15, 1.1)
    }

    // ---- stance (Hybrid Crystal): R cycles, or the item menu asks for one (stanceRequest)
    const req = gs.stanceRequest
    if (req) setState({ stanceRequest: null })
    if (!busy && ((inp.stance && gs.save.hasCrystal) || (req && req !== gs.stance))) {
      const order = ['sp3', 'sp2', 'sp']
      const next = req || order[(order.indexOf(gs.stance) + 1) % 3]
      // can't stand up from sp2 under a low ceiling
      if (gs.stance === 'sp2' && world.ceilingAt && world.ceilingAt(s.pos.x, s.pos.z, s.pos.y) < s.pos.y + 1.8) {
        toast('Too low to stand here — stay flat (sp²).', 'warn', 1500)
      } else {
        setState({ stance: next })
        sfx('stance')
      }
    } else if (!busy && inp.stance && !gs.save.hasCrystal) {
      toast('You need the Hybrid Crystal to change shape.', 'warn', 1600)
    }
    const stance = getState().stance
    const SP = STANCE[stance]

    // ---- lock-on
    const targets = [...world.targets.entries()].filter(([, t]) => t.lockable !== false && (!t.alive || t.alive()))
    const lockValid = s.lockId && world.targets.has(s.lockId) && (!world.targets.get(s.lockId).alive || world.targets.get(s.lockId).alive())
    if (!lockValid) s.lockId = null
    // toggle: press to lock the nearest target in front, press again to release.
    // With nothing to lock, the press snaps the camera behind Kai (Ocarina's Z).
    if (inp.lockPressed && !busy) {
      if (s.lockId) s.lockId = null
      else {
        const n = nearest(targets, s.pos, cam.yaw + Math.PI)
        if (n) { s.lockId = n[0]; sfx('lock') }
        else { cam.yaw = s.facing + Math.PI; cam.lastManual = world.time }
      }
    }
    const lockT = s.lockId ? world.targets.get(s.lockId) : null
    const lockPos = lockT ? lockT.pos() : null
    if (lockPos && Math.hypot(lockPos[0] - s.pos.x, lockPos[2] - s.pos.z) > 22) s.lockId = null
    if ((gs.lockTarget || null) !== (s.lockId || null)) setState({ lockTarget: s.lockId || null })

    // ---- desired move direction (camera-relative)
    const fwdX = -Math.sin(cam.yaw)
    const fwdZ = -Math.cos(cam.yaw)
    const rightX = -fwdZ
    const rightZ = fwdX
    let mx = 0
    let mz = 0
    if (!busy) {
      mx = fwdX * -inp.moveY + rightX * inp.moveX
      mz = fwdZ * -inp.moveY + rightZ * inp.moveX
    }
    const mlen = Math.hypot(mx, mz)

    s.iframes = Math.max(0, s.iframes - dt)
    s.modeT += dt

    // ---- attack input
    if (!busy) {
      if (inp.attack) s.attackHeld += dt
      if (inp.attackPressed && s.mode !== 'roll' && s.mode !== 'hurt' && s.mode !== 'dash') {
        if (s.mode === 'attack') s.comboQueued = true
        else startAttack(s, 0)
      }
      if (inp.attackReleased) {
        if (s.attackHeld > 0.65 && s.mode !== 'roll' && s.mode !== 'dash') { s.mode = 'spin'; s.modeT = 0; s.hitDone = false; sfx('spin') }
        s.attackHeld = 0
      }
    }

    // ---- roll / sidestep / backhop / sp dash
    if (!busy && inp.roll && (s.mode === 'move' || s.mode === 'block') && s.grounded) {
      if (stance === 'sp') {
        s.mode = 'dash'; s.modeT = 0; s.iframes = Math.max(s.iframes, 0.3)
        const d = mlen > 0.2 ? [mx / mlen, mz / mlen] : [Math.sin(s.facing), Math.cos(s.facing)]
        s.rollDir.set(d[0], d[1]); s.facing = Math.atan2(d[0], d[1]); sfx('dash')
      } else if (lockPos && mlen > 0.2) {
        // relative to the target: left/right = sidestep, back = backhop, forward = roll in
        const tx = lockPos[0] - s.pos.x
        const tz = lockPos[2] - s.pos.z
        const tl = Math.hypot(tx, tz) || 1
        const along = (mx * tx + mz * tz) / (tl * mlen)
        s.rollDir.set(mx / mlen, mz / mlen)
        s.mode = along < -0.6 ? 'backhop' : along > 0.6 ? 'roll' : 'sidestep'
        s.modeT = 0
        s.iframes = Math.max(s.iframes, 0.28)
        sfx('roll')
      } else {
        const d = mlen > 0.2 ? [mx / mlen, mz / mlen] : [Math.sin(s.facing), Math.cos(s.facing)]
        s.rollDir.set(d[0], d[1]); s.facing = Math.atan2(d[0], d[1])
        s.mode = 'roll'; s.modeT = 0; s.iframes = Math.max(s.iframes, 0.32); sfx('roll')
      }
    }

    // ---- block
    if (!busy && s.mode === 'move' && inp.block) s.mode = 'block'
    if (s.mode === 'block' && (!inp.block || busy)) s.mode = 'move'

    // ---- velocity by mode
    let hx = 0
    let hz = 0
    const pose = model.current
    if (pose) { pose.swing = 0; pose.spin = 0; pose.roll = 0 }
    switch (s.mode) {
      case 'move':
      case 'block': {
        const speed = SP.speed * (s.mode === 'block' ? 0.35 : 1) * (s.attackHeld > 0.65 ? 0.45 : 1)
        hx = mx * speed
        hz = mz * speed
        if (lockPos) {
          s.facing = angleLerp(s.facing, Math.atan2(lockPos[0] - s.pos.x, lockPos[2] - s.pos.z), Math.min(1, dt * 14))
        } else if (mlen > 0.1 && s.mode === 'move') {
          s.facing = angleLerp(s.facing, Math.atan2(mx, mz), Math.min(1, dt * 12))
        }
        break
      }
      case 'roll': {
        const T = 0.48
        const k = Math.min(1, s.modeT / T)
        const sp = 11 * (1 - k * 0.55)
        hx = s.rollDir.x * sp; hz = s.rollDir.y * sp
        if (pose) pose.roll = k
        if (k >= 1) s.mode = 'move'
        break
      }
      case 'sidestep': {
        const k = Math.min(1, s.modeT / 0.3)
        hx = s.rollDir.x * 10 * (1 - k * 0.5); hz = s.rollDir.y * 10 * (1 - k * 0.5)
        if (s.modeT < 0.02 && s.grounded) s.vel.y = 5
        if (k >= 1) s.mode = 'move'
        break
      }
      case 'backhop': {
        const k = Math.min(1, s.modeT / 0.36)
        hx = s.rollDir.x * 9 * (1 - k * 0.4); hz = s.rollDir.y * 9 * (1 - k * 0.4)
        if (s.modeT < 0.02 && s.grounded) s.vel.y = 6.5
        if (pose) pose.roll = -k * 0.5
        if (k >= 1) s.mode = 'move'
        break
      }
      case 'dash': {
        // sp: a straight-line lance dash that holds altitude briefly — crosses gaps no roll can
        const T = 0.42
        const k = Math.min(1, s.modeT / T)
        hx = s.rollDir.x * 19; hz = s.rollDir.y * 19
        s.vel.y = Math.max(s.vel.y, k < 0.8 ? 0.2 : s.vel.y)
        if (k >= 1) { s.mode = 'move'; s.vel.x = s.rollDir.x * 4; s.vel.z = s.rollDir.y * 4 }
        break
      }
      case 'attack': {
        const T = s.combo === 2 ? 0.42 : 0.3
        const k = s.modeT / T
        const lunge = k < 0.4 ? 3.2 : 0
        hx = Math.sin(s.facing) * lunge; hz = Math.cos(s.facing) * lunge
        if (pose) { pose.swing = THREE.MathUtils.clamp(-1 + 2 * Math.min(1, k * 1.5), -1, 1); pose.swingSide = s.combo % 2 === 0 ? 1 : -1 }
        if (!s.hitDone && k > 0.35) { s.hitDone = true; swordHit(world, s, s.combo === 2 ? 2 : 1, 1.95, 1.2, 'slash') }
        if (k >= 1) {
          if (s.comboQueued && s.combo < 2) startAttack(s, s.combo + 1)
          else s.mode = 'move'
        }
        if (lockPos) s.facing = angleLerp(s.facing, Math.atan2(lockPos[0] - s.pos.x, lockPos[2] - s.pos.z), Math.min(1, dt * 16))
        break
      }
      case 'spin': {
        const T = 0.5
        const k = s.modeT / T
        if (pose) pose.spin = Math.min(1, k)
        if (!s.hitDone && k > 0.3) { s.hitDone = true; swordHit(world, s, 2, 2.6, Math.PI * 1.05, 'spin') }
        if (k >= 1) s.mode = 'move'
        break
      }
      case 'hurt': {
        hx = s.knock.x * (1 - s.modeT / 0.35); hz = s.knock.z * (1 - s.modeT / 0.35)
        if (s.modeT > 0.35) s.mode = 'move'
        break
      }
      default:
        s.mode = 'move'
    }
    if (s.mode === 'block' && s.knock.lengthSq() > 0.01) { hx += s.knock.x; hz += s.knock.z; s.knock.multiplyScalar(0.85) }

    // smooth horizontal velocity for move modes, direct for burst modes
    const burst = s.mode !== 'move' && s.mode !== 'block'
    const accel = s.grounded ? 18 : 6
    s.vel.x = burst ? hx : s.vel.x + (hx - s.vel.x) * Math.min(1, dt * accel)
    s.vel.z = burst ? hz : s.vel.z + (hz - s.vel.z) * Math.min(1, dt * accel)

    // ---- integrate + collide
    const wasGrounded = s.grounded
    let nx = s.pos.x + s.vel.x * dt
    let nz = s.pos.z + s.vel.z * dt
    const h = SP.height
    ;[nx, nz] = world.collide(nx, s.pos.y + 0.05, nz, R, h - 0.1)
    if (world.ceilingAt) {
      // low ceilings block anyone taller than the gap
      const c = world.ceilingAt(nx, nz, s.pos.y)
      if (c < s.pos.y + h) { nx = s.pos.x; nz = s.pos.z; if (stance !== 'sp2' && !s.lowWarned) { s.lowWarned = true; toast('Too low to pass standing up. A flat sp² shape would fit.', 'info', 2200) } }
    }
    s.pos.x = nx
    s.pos.z = nz
    if (s.mode !== 'dash' || s.modeT > 0.42 * 0.8) s.vel.y += GRAV * dt
    let ny = s.pos.y + s.vel.y * dt
    const ground = world.groundAt(s.pos.x, s.pos.z, s.pos.y + STEP, R * 0.6)
    if (ny <= ground && s.vel.y <= 0) {
      ny = ground
      s.vel.y = 0
      s.grounded = true
    } else {
      s.grounded = ny <= ground + 0.02
    }
    // auto-jump: running off a ledge at speed launches a hop (no jump button, like Ocarina)
    if (wasGrounded && !s.grounded && s.vel.y <= 0 && Math.hypot(s.vel.x, s.vel.z) > 4.5 && s.mode !== 'dash') {
      const drop = s.pos.y - world.groundAt(s.pos.x + s.vel.x * 0.3, s.pos.z + s.vel.z * 0.3, s.pos.y + STEP, 0)
      if (drop > 0.6) { s.vel.y = 6.8; sfx('hop') }
    }
    s.pos.y = ny
    if (s.grounded && ground > -Infinity && s.mode === 'move') {
      s.safeT += dt
      if (s.safeT > 0.5) { s.lastSafe.copy(s.pos); s.safeT = 0 }
    }
    if (s.pos.y < world.killY) {
      s.pos.copy(s.lastSafe)
      s.vel.set(0, 0, 0)
      const hp = Math.max(1, getState().hp - 1)
      setState({ hp })
      sfx('hurt')
      toast('Fell into the abyss!', 'warn', 1600)
    }

    world.updateTriggers([s.pos.x, s.pos.y, s.pos.z])

    // ---- interact prompt
    const near = busy ? null : world.nearestInteractable([s.pos.x, s.pos.y, s.pos.z])
    const label = near ? (typeof near.label === 'function' ? near.label() : near.label) : null
    if (gs.prompt !== label) setState({ prompt: label })
    if (near && inp.interact && !busy) near.onInteract()

    // ---- pose
    const speedNow = Math.hypot(s.vel.x, s.vel.z)
    s.run += ((s.mode === 'move' || s.mode === 'block' ? Math.min(1, speedNow / 6) : 0) - s.run) * Math.min(1, dt * 10)
    s.phase += dt * (4 + speedNow * 1.6)
    if (pose) {
      pose.run = s.run
      pose.phase = s.phase
      pose.block = s.mode === 'block' ? 1 : 0
      pose.hurt = s.hurtT > 0 ? 1 : 0
      pose.stance = stance
      pose.sockets = gs.sockets
      pose.charge = s.attackHeld > 0.65 ? 1 : s.attackHeld > 0.2 ? (s.attackHeld - 0.2) / 0.45 : 0
    }
    s.hurtT = Math.max(0, s.hurtT - dt)
    group.current.position.copy(s.pos)
    group.current.rotation.y = s.facing
    group.current.visible = s.iframes > 0 && s.mode === 'move' ? Math.floor(world.time * 20) % 2 === 0 : true

    // Ocarina-style lazy camera: drift behind Kai while running if the player isn't steering it
    if (!lockPos && world.time - cam.lastManual > 1.2 && speedNow > 2 && s.mode === 'move') {
      cam.yaw = angleLerp(cam.yaw, s.facing + Math.PI, Math.min(1, dt * 1.2))
    }
    world.lockPos = lockPos
  })

  return (
    <group ref={group}>
      <KaiModel ref={model} />
      <pointLight position={[0, 1.4, 0.6]} intensity={1.4} distance={4.5} color="#43e6f5" />
    </group>
  )
}

function startAttack(s, combo) {
  s.mode = 'attack'
  s.modeT = 0
  s.combo = combo
  s.comboQueued = false
  s.hitDone = false
  sfx('swing')
}

function nearest(list, pos, facing) {
  let best = null
  let bs = Infinity
  for (const e of list) {
    const p = e[1].pos()
    const dx = p[0] - pos.x
    const dz = p[2] - pos.z
    const d = Math.hypot(dx, dz)
    if (d > 16) continue
    const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - facing), Math.cos(Math.atan2(dx, dz) - facing)))
    const score = d + ang * 3
    if (score < bs) { bs = score; best = e }
  }
  return best
}

function swordHit(world, s, dmg, range, halfAngle, kind) {
  let hit = false
  for (const [, t] of world.targets) {
    if (t.alive && !t.alive()) continue
    const p = t.pos()
    const dx = p[0] - s.pos.x
    const dz = p[2] - s.pos.z
    const d = Math.hypot(dx, dz) - (t.radius || 0.5)
    if (d > range) continue
    if (Math.abs(p[1] - s.pos.y) > 2.8 + (t.tall || 0)) continue
    const a = Math.atan2(dx, dz)
    const diff = Math.abs(Math.atan2(Math.sin(a - s.facing), Math.cos(a - s.facing)))
    if (diff > halfAngle) continue
    const dir = [dx / (Math.hypot(dx, dz) || 1), 0, dz / (Math.hypot(dx, dz) || 1)]
    const res = t.onHit && t.onHit(dir, dmg, kind, getState().stance)
    if (res !== false) hit = true
  }
  if (hit) { world.hitStop = 0.07; sfx('hit') }
}
