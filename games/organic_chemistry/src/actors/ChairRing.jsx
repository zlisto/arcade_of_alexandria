import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { carbonUp, isAxial } from '../chem/rules4'
import { Tag } from '../engine/kit'

// A chair cyclohexane you can see flip (book §4.5–4.6, Figs 4.9–4.12). Carbon k sits at angle k·60°
// round the ring (k = 0 due north, −z), raised or lowered. A ring-flip lowers the raised carbons and raises
// the lowered ones; every group swings between axial (straight up or down) and equatorial (out round the
// equator, tipped a little the other way), and none of them changes face.

export const padPos = (k, R) => { const a = (k * Math.PI) / 3; return [Math.sin(a) * R, -Math.cos(a) * R] }
/** where a group on carbon k, on a face, points in flip state f (unit vector) */
export function groupDir(k, face, f) {
  const [x, z] = padPos(k, 1)
  if (isAxial(k, face, f)) return new THREE.Vector3(0, face === 'top' ? 1 : -1, 0)
  return new THREE.Vector3(x, face === 'top' ? 0.33 : -0.33, z).normalize()
}

/** ease 0..1 toward the target flip state; returns the ref holding the current progress */
export function useFlipProgress(flip, speed = 2.2) {
  const f = useRef(flip ? 1 : 0)
  useFrame((_, dt) => { f.current += ((flip ? 1 : 0) - f.current) * Math.min(1, dt * speed) })
  return f
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0)

/**
 * A chair ring of carbon balls and bonds with its groups.
 * subs: [{ c, face, label, color, size }]; showH: draw small H on every free position.
 */
export function ChairRing({ position, R = 1.6, amp = 0.35, atom = 0.32, bond = 0.09, flip, subs = [], showH = true, len = 1.0, carbon = '#5a5670', glow = '#5ff0ff', tags = true }) {
  const prog = useFlipProgress(flip)
  const carbons = useRef([]), bonds = useRef([]), groups = useRef([])
  const free = useMemo(() => {
    // every carbon has two positions (top and bottom face); the ones without a group get an H
    const out = []
    for (let k = 0; k < 6; k++) for (const face of ['top', 'bottom']) if (!subs.some((s) => s.c === k && s.face === face)) out.push({ c: k, face, label: 'H', color: '#f2f2f2', size: 0.16, h: true })
    return out
  }, [subs])
  const all = useMemo(() => [...subs, ...(showH ? free : [])], [subs, free, showH])
  const mats = useMemo(() => ({
    carbon: new THREE.MeshStandardMaterial({ color: carbon, roughness: 0.4, metalness: 0.3, emissive: new THREE.Color(glow), emissiveIntensity: 0.08 }),
    bond: new THREE.MeshStandardMaterial({ color: '#9a96b0', roughness: 0.5 }),
    stick: new THREE.MeshStandardMaterial({ color: '#c8c4d8', roughness: 0.5 }),
  }), [carbon, glow])
  useFrame(() => {
    const f = prog.current
    const ys = []
    for (let k = 0; k < 6; k++) {
      const up0 = carbonUp(k, false) ? 1 : -1
      const y = amp * up0 * (1 - 2 * f)
      ys.push(y)
      const [x, z] = padPos(k, R)
      const m = carbons.current[k]
      if (m) m.position.set(x, y, z)
    }
    for (let k = 0; k < 6; k++) {
      const b = bonds.current[k]
      if (!b) continue
      const [x0, z0] = padPos(k, R), [x1, z1] = padPos((k + 1) % 6, R)
      _a.set(x0, ys[k], z0); _b.set(x1, ys[(k + 1) % 6], z1)
      b.position.copy(_a).add(_b).multiplyScalar(0.5)
      b.scale.set(1, _a.distanceTo(_b), 1)
      b.quaternion.setFromUnitVectors(_up, _b.sub(_a).normalize())
    }
    all.forEach((s, i) => {
      const g = groups.current[i]
      if (!g) return
      const d0 = groupDir(s.c, s.face, false), d1 = groupDir(s.c, s.face, true)
      const d = d0.clone().lerp(d1, f).normalize()
      const [x, z] = padPos(s.c, R)
      const L = (s.h ? 0.6 : 1) * len
      g.position.set(x, ys[s.c], z)
      _q.setFromUnitVectors(_up, d)
      g.quaternion.copy(_q)
      g.children[0].position.y = L / 2
      g.children[0].scale.set(1, L, 1)
      g.children[1].position.y = L + (s.size || 0.3) * 0.6
    })
  })
  return (
    <group position={position}>
      {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} ref={(m) => (carbons.current[k] = m)} material={mats.carbon} castShadow><sphereGeometry args={[atom, 18, 14]} /></mesh>)}
      {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={'b' + k} ref={(m) => (bonds.current[k] = m)} material={mats.bond}><cylinderGeometry args={[bond, bond, 1, 10]} /></mesh>)}
      {all.map((s, i) => (
        <group key={i} ref={(g) => (groups.current[i] = g)}>
          <mesh material={mats.stick}><cylinderGeometry args={[bond * 0.7, bond * 0.7, 1, 8]} /></mesh>
          <mesh>
            <sphereGeometry args={[s.size || 0.3, 16, 12]} />
            <meshStandardMaterial color={s.color} roughness={0.45} emissive={s.h ? '#000' : s.color} emissiveIntensity={s.h ? 0 : 0.35} />
          </mesh>
          {tags && !s.h && <Tag position={[0, len + (s.size || 0.3) * 0.6 + 0.6, 0]} df={8} far={16}>{s.label}</Tag>}
        </group>
      ))}
    </group>
  )
}
