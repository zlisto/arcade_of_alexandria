import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Tag } from '../engine/kit'
import { getState, toast } from '../engine/store'
import { sfx } from '../audio/sfx'

// A walkable energy diagram (book §6.9–6.10): a ridge of ice whose height follows a reaction's free energy along
// the reaction coordinate. Reactants at the start (height 0), then each step's transition state (a pass) and the
// valley after it (an intermediate, or the products at the end). Heights are kJ/mol × SCALE metres.
// A pass Kai's Activation Boots can't reach is sealed by frost at its foot (meter() is the boots' energy, kJ/mol).
export const SCALE = 1 / 25

/** nodes along the ridge: reactants, then ts / after for each step; u from 0 to 1 */
export function ridgeNodes(route) {
  const ys = [0]
  route.forEach((s) => { ys.push(s.ts); ys.push(s.after) })
  return ys.map((y, k) => ({ u: k / (ys.length - 1), y, kind: k === 0 ? 'reactants' : k % 2 ? 'ts' : k === ys.length - 1 ? 'products' : 'valley' }))
}
/** energy (kJ/mol) at u: cosine-smoothed between nodes */
export function energyAt(nodes, u) {
  const k = Math.min(nodes.length - 2, Math.max(0, Math.floor(u * (nodes.length - 1))))
  const a = nodes[k], b = nodes[k + 1]
  const t = (u - a.u) / (b.u - a.u)
  const s = (1 - Math.cos(Math.min(1, Math.max(0, t)) * Math.PI)) / 2
  return a.y + (b.y - a.y) * s
}

/**
 * The ridge runs along −z from z0 (reactants) to z1 (products), centred on x, width w, with flat landings `pad`
 * long at both ends. lowest: the ground height under the ridge's lowest valley (so products below 0 still show).
 */
export function Ridge({ world, route, x, z0, z1, w = 3, pad = 2, meter, label, color = '#bfe4f4', onEnd }) {
  const nodes = useMemo(() => ridgeNodes(route), [route])
  const base = 0 // the reactants sit at floor level; valleys below it drop into the chasm under the ridge
  const len = Math.abs(z1 - z0) - 2 * pad
  const zAt = (u) => z0 - pad - u * len
  const RAMP = 4 // beyond z1, a ramp from the products' height back to the floor
  const prodY = nodes[nodes.length - 1].y * SCALE
  const yAtZ = (z) => (z < z1 ? prodY + (0 - prodY) * Math.min(1, (z1 - z) / RAMP) : base + energyAt(nodes, Math.min(1, Math.max(0, (z0 - pad - z) / len))) * SCALE)
  const geo = useMemo(() => {
    // a ridge of ice: its top surface follows the energy, its sides drop to the floor
    const N = 100, pos = [], idx = []
    const total = Math.abs(z1 - z0) + RAMP
    for (let i = 0; i <= N; i++) {
      const z = z0 - (i / N) * total
      const y = yAtZ(z)
      pos.push(x - w / 2, y, z, x + w / 2, y, z, x - w / 2, Math.min(y, 0) - 6, z, x + w / 2, Math.min(y, 0) - 6, z)
    }
    for (let i = 0; i < N; i++) {
      const a = i * 4, b = (i + 1) * 4
      idx.push(a, b, a + 1, a + 1, b, b + 1) // top
      idx.push(a + 2, b + 2, a, a, b + 2, b) // left side
      idx.push(a + 1, b + 1, a + 3, a + 3, b + 1, b + 3) // right side
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [nodes, x, z0, z1, w])
  const gates = useRef([])
  useEffect(() => {
    // floors: thin strips every 0.3 m, each at the ridge's height there; frost walls at the foot of each pass
    const ids = []
    const steps = Math.ceil((Math.abs(z1 - z0) + RAMP) / 0.3)
    for (let i = 0; i < steps; i++) {
      const za = z0 - i * 0.3, zb = za - 0.3
      const rise = Math.abs(yAtZ(zb) - yAtZ(za))
      const n = Math.max(1, Math.ceil(rise / 0.2))
      for (let k = 0; k < n; k++) {
        const a = za - (k * 0.3) / n, b = za - ((k + 1) * 0.3) / n
        ids.push(world.addFloor(x - w / 2, b, x + w / 2, a, yAtZ((a + b) / 2)))
      }
    }
    gates.current = nodes.filter((n) => n.kind === 'ts').map((n, i) => {
      // the foot of the pass: a little way before its summit, on the climb
      const prev = nodes[nodes.indexOf(n) - 1]
      const uf = prev.u + (n.u - prev.u) * 0.25
      const zf = zAt(uf), yf = base + energyAt(nodes, uf) * SCALE
      const id = world.addSolid([x - w / 2, yf - 1, zf - 0.25], [x + w / 2, yf + 4, zf + 0.25])
      world.solids.get(id).noCam = true
      return { id, ts: n.y, z: zf, y: yf, told: false }
    })
    ids.push(...gates.current.map((g) => g.id))
    const end = onEnd ? world.addTrigger([x - w / 2, Math.min(0, prodY) - 2, z1 - RAMP], [x + w / 2, 30, z1 + pad * 0.8], () => onEnd()) : null
    if (end) ids.push(end)
    return () => ids.forEach((i) => world.remove(i))
  }, [world, nodes])
  // keep the frost gates in step with the boots' meter; tell Kai why a pass is shut when he walks into one
  useEffect(() => {
    const t = setInterval(() => {
      const m = meter ? meter() : 0
      const p = world.player
      gates.current.forEach((g) => {
        const shut = m < g.ts
        world.setEnabled(g.id, shut)
        if (shut && p && Math.abs(p.pos.x - x) < w / 2 + 0.4 && Math.abs(p.pos.z - g.z) < 1.2 && !g.told) {
          g.told = true; sfx('wrong')
          toast(`Frost seals the pass: it rises ${g.ts} kJ/mol above the start, and your boots hold ${m}.`, 'warn', 4200)
          setTimeout(() => (g.told = false), 4500)
        }
      })
    }, 200)
    return () => clearInterval(t)
  }, [world, nodes, meter])
  return (
    <group>
      <mesh geometry={geo} receiveShadow castShadow><meshStandardMaterial color={color} roughness={0.35} metalness={0.1} /></mesh>
      {nodes.map((n, i) => n.kind !== 'reactants' && (
        <Tag key={i} position={[x, base + n.y * SCALE + 1.1, zAt(n.u)]} df={9} far={40}>{n.kind === 'ts' ? `‡ ${n.y} kJ/mol` : n.kind === 'products' ? `products ${n.y > 0 ? '+' : ''}${n.y}` : `intermediate ${n.y > 0 ? '+' : ''}${n.y}`}</Tag>
      ))}
      {label && <Tag position={[x, base + 3.4, z0 - 1.5]} df={11} far={40}>{label}</Tag>}
    </group>
  )
}
