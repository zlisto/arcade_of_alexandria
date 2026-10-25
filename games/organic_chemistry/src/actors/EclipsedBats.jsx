import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { sfx } from '../audio/sfx'
import { toast, getState } from '../engine/store'
import { conformerName } from '../chem/rules3'
import { flashNewman } from '../ui/Newman'

// Eclipsed Bats (§3.6–3.7), modeled on assets/enemies/eclipsed-bat.png: two maroon bats with great torn
// wings hanging from one rod, nose to nose, violet sparks between them. The rod points along the hall,
// so the player looks down it like a Newman projection: each bat is a big group on its own carbon.
// Eclipsed (one bat hidden behind the other) they are strained and frantic: they drop, flash, and swoop
// at the spot where Kai stood (side-step it). The sword glances off. The Newman Lantern turns the back
// bat 60° (G) or −60° (Shift+G). Gauche: calm but awake. Anti (180°): asleep for good.
// roosts: [[x, z, zMin, zMax]] — a roost only acts while Kai is inside its own stretch of hall.

const ROD_Y = 2.8
const busyNow = () => { const s = getState(); return !!(s.dialogue || s.panel || s.newman) } // and while the Lantern view is up

function Wing({ M, s }) {
  // a big torn wing: a fan of three membranes between finger bones
  return (
    <group position={[s * 0.12, -0.12, 0]} rotation={[0, 0, s * 0.1]}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[s * (0.2 + k * 0.17), -0.55 - k * 0.08, -0.01 * k]} rotation={[0, 0, s * (0.08 + k * 0.1)]} material={M.wing} castShadow>
          <planeGeometry args={[0.36, 1.25 - k * 0.12]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((k) => <mesh key={'b' + k} position={[s * (0.08 + k * 0.17), -0.55, 0.01]} rotation={[0, 0, s * (0.05 + k * 0.1)]} material={M.claw}><boxGeometry args={[0.025, 1.3, 0.025]} /></mesh>)}
      {[0, 1].map((k) => <mesh key={'h' + k} position={[s * (0.3 + k * 0.2), -0.7 - k * 0.2, 0.02]} material={M.hole}><circleGeometry args={[0.04, 8]} /></mesh>)}
    </group>
  )
}

function Bat({ M, refCb }) {
  return (
    <group ref={refCb}>
      <mesh position={[0, -0.05, 0]} material={M.claw}><boxGeometry args={[0.05, 0.12, 0.05]} /></mesh>
      <mesh position={[0, -0.42, 0]} scale={[0.75, 1.15, 0.7]} material={M.fur} castShadow><sphereGeometry args={[0.24, 14, 12]} /></mesh>
      <group name="head" position={[0, -0.78, 0.02]}>
        <mesh material={M.fur}><sphereGeometry args={[0.16, 14, 12]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.1, -0.13, 0]} rotation={[0, 0, Math.PI + s * 0.35]} material={M.wingSolid}><coneGeometry args={[0.06, 0.16, 6]} /></mesh>)}
        {[-1, 1].map((s) => <mesh key={'e' + s} position={[s * 0.06, 0.02, 0.13]} material={M.eye}><sphereGeometry args={[0.03, 8, 6]} /></mesh>)}
        <mesh position={[0, 0.08, 0.13]} material={M.claw}><coneGeometry args={[0.03, 0.06, 5]} /></mesh>
      </group>
      <group name="wingL"><Wing M={M} s={-1} /></group>
      <group name="wingR"><Wing M={M} s={1} /></group>
    </group>
  )
}

export default function EclipsedBats({ world, roosts, active = true, decor = false, saved, onTurn, onSleep }) {
  const M = useMemo(() => ({
    fur: rimMat({ color: '#6a2a3a', roughness: 0.85 }, '#ffb0c8', 0.15),
    wing: rimMat({ color: '#7a3448', roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }, '#ffb0c8', 0.12),
    wingSolid: rimMat({ color: '#7a3448', roughness: 0.6 }, '#ffb0c8', 0.12),
    hole: new THREE.MeshBasicMaterial({ color: '#0e1a14', side: THREE.DoubleSide }),
    claw: new THREE.MeshStandardMaterial({ color: '#2a1a1a', roughness: 0.5 }),
    eye: new THREE.MeshBasicMaterial({ color: '#d070ff', toneMapped: false }),
    rod: rimMat({ color: '#5a3c26', roughness: 0.85 }, '#ffcf9a', 0.15),
    spark: new THREE.MeshBasicMaterial({ color: '#d090ff', toneMapped: false, transparent: true, opacity: 0.95 }),
  }), [])
  const st = useRef(roosts.map((_, i) => ({ d: saved && saved[i] !== undefined ? saved[i] : (i % 2 ? 240 : 120), cd: 1.5 + Math.random(), swoop: -1, tell: -1, bit: false, aim: new THREE.Vector3() })))
  const [, force] = useState(0)
  const front = useRef([]), back = useRef([]), backPivot = useRef([]), sparks = useRef([]), holders = useRef([]), rings = useRef([])
  const inBand = (i) => { const p = world.player, r = roosts[i]; return !!p && (r[2] === undefined || (p.pos.z >= r[2] && p.pos.z <= r[3])) }

  useEffect(() => {
    if (!active) return
    const ids = []
    roosts.forEach(([x, z], i) => {
      const s = st.current[i]
      ids.push(world.addLantern({
        pos: [x, decor ? 3 : 1.5, z], radius: decor ? 8 : 6,
        label: () => (conformerName('butane', s.d) === 'anti' || !inBand(i) ? null : 'Turn the bats\' rod (G · Shift+G back)'),
        onLantern: (dir = 1) => {
          if (conformerName('butane', s.d) === 'anti') return
          s.d = (s.d + 60 * dir + 360) % 360
          const name = conformerName('butane', s.d)
          flashNewman({ kind: 'butane', angle: s.d, title: 'Eclipsed Bats · each bat is a big group', note: name === 'anti' ? 'Anti: 180° apart, no strain. They fall asleep.' : name === 'gauche' ? 'Gauche: calmer, but the bats still crowd each other (3.8 kJ/mol).' : name === 'eclipsed · CH₃↔CH₃' ? 'Eclipsed, one bat right behind the other: the worst strain (19). Frantic!' : 'Eclipsed, each bat behind a hydrogen (16 kJ/mol). Still frantic.' })
          onTurn && onTurn(i, s.d)
          if (name === 'anti') { sfx('pair'); toast(decor ? 'Anti — they settle into sleep at last.' : 'Anti — the bats fall asleep, 180° apart.', 'good', 2600); onSleep && onSleep(i) }
          force((k) => k + 1)
        },
      }))
      if (!decor) ids.push(world.addTarget({
        pos: () => [x, ROD_Y - 0.6, z], radius: 0.9, tall: 3,
        alive: () => conformerName('butane', s.d) !== 'anti',
        onHit: () => { sfx('block'); toast('Blade glances off. Turn their rod with the Lantern (G).', 'warn', 3200); return false },
      }))
    })
    return () => ids.forEach((id) => world.remove(id))
  }, [active])

  useFrame(({ clock }, rawDt) => {
    if (!active) return
    const dt = world.hitStop > 0 ? 0 : Math.min(rawDt, 1 / 30)
    const T = clock.elapsedTime, p = world.player
    roosts.forEach(([x, z], i) => {
      const s = st.current[i]
      if (!s.aim) s.aim = new THREE.Vector3()
      const name = conformerName('butane', s.d)
      const frantic = name.startsWith('eclipsed'), asleep = name === 'anti'
      const bp = backPivot.current[i]
      if (bp) bp.rotation.x += ((s.d * Math.PI) / 180 - bp.rotation.x) * Math.min(1, dt * 8)
      for (const [k, g] of [[0, front.current[i]], [1, back.current[i]]]) {
        if (!g) continue
        const flap = frantic ? Math.sin(T * 18 + k * 2) * 0.5 : asleep ? 0 : Math.sin(T * 3 + k) * 0.08
        const wl = g.getObjectByName('wingL'), wr = g.getObjectByName('wingR')
        if (wl) wl.rotation.z = -flap; if (wr) wr.rotation.z = flap
        g.position.y = asleep ? 0 : Math.sin(T * (frantic ? 9 : 2) + k) * (frantic ? 0.04 : 0.01)
      }
      const sp = sparks.current[i]
      if (sp) { sp.visible = frantic; sp.rotation.z = T * 12; sp.scale.setScalar(0.8 + Math.sin(T * 30) * 0.25) }
      const holder = holders.current[i]
      const ring = rings.current[i]
      if (ring) { ring.visible = s.tell >= 0 || s.swoop >= 0; ring.position.set(s.aim.x, 0.04, s.aim.z) }
      if (decor || !frantic || !p || busyNow()) { s.swoop = -1; s.tell = -1; if (holder) holder.position.set(0, 0, 0); return }
      const dx = p.pos.x - x, dz = p.pos.z - z
      if (s.swoop < 0 && s.tell < 0) {
        s.cd -= dt
        if (s.cd <= 0 && Math.hypot(dx, dz) < 7.5 && inBand(i)) { s.tell = 0; s.aim.set(p.pos.x, p.pos.y, p.pos.z); sfx('growl') }
      } else if (s.tell >= 0) {
        // the tell: the front bat drops a little and shivers, then dives at where Kai WAS
        s.tell += dt
        if (holder) holder.position.set(Math.sin(T * 50) * 0.05, -0.35 * Math.min(1, s.tell / 0.45), 0)
        if (s.tell > 0.5) { s.tell = -1; s.swoop = 0; s.bit = false }
      } else {
        s.swoop += dt / 1.1
        const k = Math.sin(Math.min(1, s.swoop) * Math.PI)
        const ax = s.aim.x - x, az = s.aim.z - z
        // the roost is turned 90° (rod along the hall), so local x is world −z and local z is world x
        if (holder) holder.position.set(-az * k, (s.aim.y + 1.4 - ROD_Y) * k - 0.35 * (1 - k), ax * k)
        if (!s.bit && s.swoop > 0.4 && s.swoop < 0.6) { s.bit = true; if (Math.hypot(p.pos.x - s.aim.x, p.pos.z - s.aim.z) < 1.3) p.hurt(1, [x, 0, z]) }
        if (s.swoop >= 1) { s.swoop = -1; s.cd = 2.8 + Math.random() * 0.8; if (holder) holder.position.set(0, 0, 0) }
      }
    })
  })

  if (!active) return null
  return (
    <group>
      {roosts.map((_, i) => <mesh key={'sr' + i} ref={(m) => (rings.current[i] = m)} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.7, 1.25, 28]} /><meshBasicMaterial color="#c070ff" transparent opacity={0.55} toneMapped={false} /></mesh>)}
      {roosts.map(([x, z], i) => (
        <group key={i} position={[x, decor ? 7 : ROD_Y, z]} rotation={[0, Math.PI / 2, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={M.rod} castShadow><cylinderGeometry args={[0.06, 0.07, 1.6, 8]} /></mesh>
          {[-0.9, 0.9].map((dx) => <mesh key={dx} position={[dx, 2, 0]} material={M.rod}><cylinderGeometry args={[0.04, 0.04, 4, 6]} /></mesh>)}
          <group position={[-0.3, 0, 0]}><group ref={(g) => (holders.current[i] = g)}><group rotation={[0, Math.PI / 2, 0]}><Bat M={M} refCb={(g) => (front.current[i] = g)} /></group></group></group>
          <group position={[0.3, 0, 0]} ref={(g) => (backPivot.current[i] = g)}><group rotation={[0, -Math.PI / 2, 0]}><Bat M={M} refCb={(g) => (back.current[i] = g)} /></group></group>
          <group ref={(g) => (sparks.current[i] = g)} position={[0, -0.78, 0]} rotation={[0, Math.PI / 2, 0]}>
            {[0, 1, 2, 3, 4, 5, 6].map((k) => <mesh key={k} position={[Math.cos(k * 0.9) * 0.14, Math.sin(k * 1.7) * 0.16, 0]} rotation={[0, 0, k * 0.8]} material={M.spark}><boxGeometry args={[0.2, 0.018, 0.018]} /></mesh>)}
            <pointLight color="#c070ff" intensity={1.5} distance={3} />
          </group>
        </group>
      ))}
    </group>
  )
}
