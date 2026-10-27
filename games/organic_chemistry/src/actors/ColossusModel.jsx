import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getEnv } from '../engine/materials'
import { part, merge, bolt, stick } from '../engine/geo'
import { Part } from '../engine/models'

// The Unbonded Colossus as a ball-and-stick giant: glossy atoms in model-kit colours (C charcoal,
// O red, N blue, H white) joined by metal bond sticks — a chair-cyclohexane pelvis, a spine and an open
// rib cage around the carbon core, oxygen shoulders, atom-chain arms with clustered fists, and a carbon
// head crowned with hydrogens. Dangling bonds end in empty sockets (violet); as each phase locks into an
// octet, a third of them fill (cyan). Loose atoms orbit it, with Malradix's violet lightning between.
// The atoms, bonds and rock crust are built in Blender (tools/colossus_blender.py → public/models/colossus.glb,
// the same layout as below); this file keeps the layout for the sockets, the loose atoms and the lightning.

const EL = { C: '#2b2b31', O: '#d8403a', N: '#3f70e2', H: '#eeeeee' }
const R = { C: 0.41, O: 0.39, N: 0.35, H: 0.22 }

function cluster(atoms, bonds, sockets) {
  // atoms: [el, [x,y,z], scale?]; bonds: [i, j]; sockets: [i, dir] — a dangling bond from atom i
  const byEl = {}
  atoms.forEach(([el, p, sc = 1]) => { (byEl[el] = byEl[el] || []).push(part(new THREE.SphereGeometry(R[el] * sc, 20, 14), p)) })
  const sticks = bonds.map(([i, j]) => stick(atoms[i][1], atoms[j][1], 0.13, 10))
  const sock = sockets.map(([i, dir]) => {
    const a = new THREE.Vector3(...atoms[i][1]), d = new THREE.Vector3(...dir).normalize()
    const r = R[atoms[i][0]] * (atoms[i][2] || 1)
    const end = a.clone().addScaledVector(d, r + 0.5)
    return { stub: stick(a.toArray(), end.toArray(), 0.1, 10), at: end.toArray(), dir: d.toArray() }
  })
  const geo = {}
  for (const el in byEl) geo[el] = merge(byEl[el])
  return { geo, bonds: sticks.length ? merge([...sticks, ...sock.map((s) => s.stub)]) : null, sockets: sock }
}

function build() {
  // ---- body (legs, pelvis ring, spine, ribs, shoulders, neck, head)
  const A = []
  const add = (el, p, sc) => (A.push([el, p, sc]), A.length - 1)
  const B = []
  const bond = (i, j) => B.push([i, j])
  const S = []
  for (const sd of [-1, 1]) {
    const foot = add('C', [sd * 1.15, 0.5, 0.2], 1.15)
    const t1 = add('H', [sd * 0.85, 0.3, 0.85]), t2 = add('H', [sd * 1.45, 0.3, 0.8])
    const ankle = add('N', [sd * 1.12, 1.25, 0.0])
    const knee = add('O', [sd * 1.15, 2.05, 0.18], 1.1)
    const thigh = add('C', [sd * 1.05, 2.85, -0.05], 1.15)
    bond(foot, t1); bond(foot, t2); bond(foot, ankle); bond(ankle, knee); bond(knee, thigh)
    A[thigh].hip = true
    S.push([knee, [sd * 0.6, 0, 1]])
  }
  // pelvis: a cyclohexane chair (carbons alternately up and down)
  const ring = []
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6; ring.push(add('C', [Math.cos(a) * 0.95, 3.55 + (k % 2 ? 0.18 : -0.18), Math.sin(a) * 0.75 - 0.05], 0.85)) }
  ring.forEach((r, k) => bond(r, ring[(k + 1) % 6]))
  A.forEach(([, p], i) => { if (A[i].hip) bond(i, p[0] < 0 ? ring[3] : ring[0]) })
  // spine
  const sp = [add('C', [0, 4.3, -0.55]), add('N', [0, 5.05, -0.6]), add('C', [0, 5.8, -0.5])]
  bond(ring[4], sp[0]); bond(sp[0], sp[1]); bond(sp[1], sp[2])
  // ribs: three each side curving forward, open in front to show the core
  ;[0, 1, 2].forEach((k) => {
    for (const sd of [-1, 1]) {
      const y = 4.35 + k * 0.72
      const a = add(k === 1 ? 'O' : 'C', [sd * 1.2, y, -0.05], 0.75)
      const b = add('C', [sd * 0.95, y - 0.12, 0.62], 0.62)
      bond(sp[k], a); bond(a, b)
      S.push([b, [sd * -0.7, -0.1, 0.8]])
    }
  })
  // shoulders, neck and head
  const sh = [-1, 1].map((sd) => add('O', [sd * 1.85, 5.85, -0.05], 1.3))
  sh.forEach((s) => bond(sp[2], s))
  sh.forEach((s, k) => S.push([s, [k ? 0.5 : -0.5, 1, 0.3]]))
  const neck = add('N', [0, 6.45, -0.25], 0.9)
  const head = add('C', [0, 7.15, 0.05], 1.55)
  bond(sp[2], neck); bond(neck, head)
  // hydrogen crown in tetrahedral directions
  ;[[-0.5, 0.86, -0.1], [0.5, 0.86, -0.1], [0, 0.6, -0.8]].forEach((d) => { const h = add('H', [d[0] * 1.25, 7.15 + d[1] * 1.25, 0.05 + d[2] * 1.25], 1.0); bond(head, h) })
  S.push([head, [0, 0.35, 1]])
  const body = cluster(A, B, S)

  // ---- arms: chains hanging from the shoulder pivot, ending in a fist of atoms
  const arm = (sd) => {
    const a = []
    const ad = (el, p, sc) => (a.push([el, p, sc]), a.length - 1)
    const upper = ad('C', [0, -0.55, 0.1], 1.0)
    const elbow = ad('N', [sd * 0.18, -1.45, 0.32], 1.0)
    const fore = ad('O', [sd * 0.28, -2.35, 0.58], 1.05)
    const fist = ad('C', [sd * 0.35, -3.2, 0.82], 1.3)
    const k1 = ad('H', [sd * 0.05, -3.5, 1.2], 1.2), k2 = ad('H', [sd * 0.7, -3.45, 1.15], 1.2), k3 = ad('H', [sd * 0.35, -3.75, 0.5], 1.2)
    const b = [[upper, elbow], [elbow, fore], [fore, fist], [fist, k1], [fist, k2], [fist, k3]]
    return cluster(a, b, [[fore, [sd, -0.2, 0.3]]])
  }
  const armL = arm(-1), armR = arm(1)

  // ---- loose atoms orbiting the torso, and lightning between them and the ribs
  const loose = []
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2
    loose.push({ el: ['H', 'O', 'H', 'N', 'H', 'C', 'H', 'O', 'H'][k], p: [Math.cos(a) * 2.6, 4.2 + Math.sin(k * 1.7) * 1.2, Math.sin(a) * 2.2] })
  }
  const looseGeo = {}
  loose.forEach(({ el, p }) => { (looseGeo[el] = looseGeo[el] || []).push(part(new THREE.SphereGeometry(R[el] * 0.7, 16, 12), p)) })
  for (const el in looseGeo) looseGeo[el] = merge(looseGeo[el])
  const orbitBolts = []
  loose.forEach(({ p }, k) => { if (k % 2 === 0) orbitBolts.push(...bolt(p, [Math.sign(p[0] || 1) * 1.1, p[1] * 0.98, p[2] * 0.3], 5 + k * 7, 6, 0.25, 0.03)) })
  const bolts = []
  bolts.push(...bolt([-1.2, 4.4, -0.2], [1.2, 5.8, -0.2], 41, 8, 0.3, 0.03), ...bolt([1.2, 4.4, -0.2], [-1.85, 5.85, -0.2], 53, 8, 0.3, 0.03))
  // orbiting bolts reach from each loose atom toward the body; they turn with the orbit
  return { body, armL, armR, looseGeo, boltGeo: merge(bolts), orbitBoltGeo: merge(orbitBolts) }
}

export function useColossusAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const atomMat = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.2, envMap: env, envMapIntensity: 0.9, emissive: new THREE.Color('#120a1c') })
    const M = {
      C: atomMat(EL.C), O: atomMat(EL.O), N: atomMat(EL.N), H: atomMat(EL.H),
      bond: new THREE.MeshStandardMaterial({ color: '#a7afba', metalness: 0.85, roughness: 0.28, envMap: env, envMapIntensity: 1 }),
      socketEmpty: new THREE.MeshBasicMaterial({ color: '#a06bff', toneMapped: false }),
      socketFull: new THREE.MeshBasicMaterial({ color: '#43e6f5', toneMapped: false }),
      bolt: new THREE.MeshBasicMaterial({ color: '#c08bff', transparent: true, opacity: 0.9, toneMapped: false }),
      eye: new THREE.MeshBasicMaterial({ color: '#f0d8ff', toneMapped: false }),
      rock: new THREE.MeshStandardMaterial({ color: '#4a6e7a', roughness: 0.85, flatShading: true, emissive: new THREE.Color('#0a1418') }),
      rockDark: new THREE.MeshStandardMaterial({ color: '#2c3e48', roughness: 0.9, flatShading: true }),
      vein: new THREE.MeshBasicMaterial({ color: '#a06bff', toneMapped: false }),
    }
    return { M, ...build(), ring: new THREE.TorusGeometry(0.2, 0.05, 8, 18), dot: new THREE.SphereGeometry(0.09, 10, 8) }
  }, [gl])
}

function Cluster({ c, A, part: name, filled = 0, offset = 0 }) {
  return (
    <group>
      <Part model="colossus" name={name} mats={A.M} />
      {c.sockets.map((s, k) => {
        const full = k + offset < filled
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...s.dir))
        return (
          <group key={k} position={s.at} quaternion={q}>
            <mesh geometry={A.ring} material={full ? A.M.socketFull : A.M.socketEmpty} />
            {!full && <mesh geometry={A.dot} material={A.M.socketEmpty} />}
          </group>
        )
      })}
    </group>
  )
}

// The colossus body. Refs: armL/armR (pivot groups at the shoulders), orbit (the loose atoms),
// bolts (lightning, flickered by the caller). `filled` = how many sockets have locked (0..all).
export function ColossusBody({ A, armL, armR, orbit, bolts, filled = 0, children }) {
  const nBody = A.body.sockets.length
  return (
    <group>
      <Cluster c={A.body} A={A} part="col_body" filled={filled} />
      {/* violet eyes in the carbon head */}
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.26, 7.22, 0.56]} rotation={[0, 0, s * -0.35]} scale={[1.3, 0.5, 0.5]} material={A.M.eye}><sphereGeometry args={[0.13, 12, 8]} /></mesh>)}
      <pointLight position={[0, 7.2, 1.2]} color="#b48cff" intensity={3} distance={5} />
      <group ref={armL} position={[-2.1, 5.6, 0]}><Cluster c={A.armL} A={A} part="col_armL" filled={filled} offset={nBody} /></group>
      <group ref={armR} position={[2.1, 5.6, 0]}><Cluster c={A.armR} A={A} part="col_armR" filled={filled} offset={nBody + 1} /></group>
      <group ref={orbit}>
        {Object.entries(A.looseGeo).map(([el, g]) => <mesh key={el} geometry={g} material={A.M[el]} />)}
        <mesh geometry={A.orbitBoltGeo} material={A.M.bolt} />
      </group>
      <mesh ref={bolts} geometry={A.boltGeo} material={A.M.bolt} />
      {children}
    </group>
  )
}

export const socketCount = (A) => A.body.sockets.length + A.armL.sockets.length + A.armR.sockets.length
