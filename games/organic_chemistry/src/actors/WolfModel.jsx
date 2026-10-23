import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { part, merge, bolt } from '../engine/geo'

// The Radical Wolf, modeled on assets/enemies/radical-wolf.png: a shadowy violet wolf with a thick
// ruff, smoky wisps curling off its back, violet lightning crackling across its flank, glowing eyes,
// a big bushy tail, and its one unpaired electron burning in its chest.
// Still parts are merged into a few shared geometries so a pack of six stays cheap. The pack animates
// the named parts: body (scale), spark, leg0..leg3 (rotation.x), tail, wisps, flash.

export function useWolfAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const M = {
      fur: rimMat({ color: '#2e2242', roughness: 0.85, emissive: new THREE.Color('#1c0c38'), emissiveIntensity: 0.45, flatShading: true }, '#a77cff', 0.5, 2.2),
      furDark: rimMat({ color: '#1c1428', roughness: 0.9, emissive: new THREE.Color('#110826'), emissiveIntensity: 0.4 }, '#8a60ff', 0.45, 2.4),
      nose: new THREE.MeshStandardMaterial({ color: '#0d0a14', roughness: 0.4 }),
      eye: new THREE.MeshBasicMaterial({ color: '#f0d2ff', toneMapped: false }),
      bolt: new THREE.MeshBasicMaterial({ color: '#c79bff', toneMapped: false }),
      wisp: new THREE.MeshStandardMaterial({ color: '#5a3c88', emissive: new THREE.Color('#6a30c0'), emissiveIntensity: 0.9, transparent: true, opacity: 0.55, depthWrite: false }),
      spark: new THREE.MeshStandardMaterial({ color: '#e7d2ff', emissive: new THREE.Color('#a06bff'), emissiveIntensity: 3, toneMapped: false }),
    }
    const S = (r = 1, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h)
    const C = (r, h, n = 6) => new THREE.ConeGeometry(r, h, n)

    // body: deep chest, tucked waist, haunches; head with muzzle, ears, cheek fur; ruff and spine tufts
    // torso: one tapered body along z — deep chest, tucked waist, haunches (a lathe laid on its side)
    const torso = new THREE.LatheGeometry([[0.02, -0.72], [0.17, -0.66], [0.25, -0.52], [0.26, -0.36], [0.22, -0.16], [0.24, 0.05], [0.3, 0.25], [0.32, 0.4], [0.26, 0.55], [0.14, 0.66], [0.02, 0.7]].map(([r, z]) => new THREE.Vector2(r, z)), 18)
    torso.rotateX(Math.PI / 2)
    const body = [
      part(torso, [0, 0.72, -0.02], [0, 0, 0], [0.92, 1.12, 1]),
      part(S(1, 14, 10), [0, 0.6, 0.3], null, [0.24, 0.24, 0.26]), // brisket
      // head: skull, long tapered muzzle, jaw, ears, cheek ruff
      part(S(1, 16, 12), [0, 0.95, 0.72], null, [0.16, 0.15, 0.18]),
      part(new THREE.CylinderGeometry(0.055, 0.095, 0.27, 10), [0, 0.92, 0.94], [Math.PI / 2 + 0.06, 0, 0], [1, 1, 0.8]),
      part(S(1, 12, 10), [0, 0.925, 1.07], null, [0.058, 0.05, 0.05]), // snout tip
      part(S(1, 12, 10), [0, 1.02, 0.74], null, [0.13, 0.07, 0.12]), // brow
      part(S(1, 10, 8), [0, 0.855, 0.93], null, [0.06, 0.03, 0.13]),
      ...[-1, 1].map((s) => part(C(0.055, 0.2, 5), [s * 0.085, 1.12, 0.66], [0.2, 0, -s * 0.3])),
      ...[-1, 1].map((s) => part(C(0.07, 0.22, 5), [s * 0.14, 0.9, 0.62], null, [1, 1, 0.55], [s * 1, -0.3, -0.7])),
    ]
    // ruff around the neck, pointing back and out
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * 0.1 + (i / 11) * Math.PI * 1.2
      const x = Math.cos(a) * 0.26, y = 0.78 + Math.sin(a) * 0.24
      body.push(part(C(0.1, 0.36, 5), [x * 1.05, y + 0.04, 0.5], null, [1, 1, 0.6], [x * 2, (y - 0.78) * 2 + 0.4, -1.1]))
    }
    // spine tufts, swept back
    for (let i = 0; i < 12; i++) {
      const z = 0.42 - i * 0.095
      body.push(part(C(0.075, 0.26 + (i % 3) * 0.06, 5), [((i % 2) - 0.5) * 0.1, 1.04 - Math.abs(z + 0.05) * 0.18, z], null, [1, 1, 0.6], [((i % 2) - 0.5) * 0.5, 0.75, -1]))
    }
    // flank fur shags
    for (let s of [-1, 1]) for (let i = 0; i < 8; i++) body.push(part(C(0.075, 0.26, 5), [s * 0.26, 0.58 + (i % 2) * 0.12, 0.36 - i * 0.13], null, [1, 1, 0.55], [s * 0.7, -0.85, -0.45]))
    const bodyGeo = merge(body)

    // dark details: nose, eye sockets, brow ridges, belly shadow
    const darkGeo = merge([
      part(S(0.03, 10, 8), [0, 0.94, 1.11]),
      ...[-1, 1].map((s) => part(new THREE.BoxGeometry(0.09, 0.022, 0.05), [s * 0.065, 1.0, 0.84], [0.2, 0, s * 0.35])),
      part(S(1, 12, 8), [0, 0.5, 0.0], null, [0.2, 0.1, 0.45]),
    ])
    const eyeGeo = merge([-1, 1].map((s) => part(S(1, 10, 8), [s * 0.07, 0.965, 0.86], [0, s * 0.4, s * 0.3], [0.032, 0.016, 0.02])))

    // legs: shoulder/hip pivots at y 0.66; fronts straight, backs with a hock
    const fore = merge([
      part(new THREE.CapsuleGeometry(0.09, 0.24, 3, 8), [0, -0.12, 0.0]),
      part(new THREE.CapsuleGeometry(0.058, 0.26, 3, 8), [0, -0.42, 0.03]),
      part(S(1, 10, 8), [0, -0.63, 0.06], null, [0.058, 0.032, 0.085]),
      part(C(0.06, 0.18, 5), [0, -0.12, -0.08], null, [1, 1, 0.6], [0, -0.6, -1]), // elbow fur
    ])
    const hind = merge([
      part(S(1, 12, 10), [0, -0.08, -0.02], null, [0.14, 0.24, 0.19]),
      part(new THREE.CapsuleGeometry(0.075, 0.2, 3, 8), [0, -0.26, -0.1], [-0.5, 0, 0]),
      part(new THREE.CapsuleGeometry(0.045, 0.22, 3, 8), [0, -0.48, -0.08], [0.35, 0, 0]),
      part(S(1, 10, 8), [0, -0.63, 0.02], null, [0.058, 0.032, 0.085]),
    ])

    // tail: a bushy curve rising behind
    const tailPts = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 0.08, -0.22], [0, 0.26, -0.42], [0, 0.5, -0.5], [0, 0.66, -0.42]].map((p) => new THREE.Vector3(...p)))
    const tail = []
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const p = tailPts.getPoint(t), d = tailPts.getTangent(t)
      const r = 0.07 + Math.sin(t * Math.PI) * 0.1
      tail.push(part(S(1, 10, 8), p.toArray(), null, [r, r * 1.6, r], d.toArray()))
      if (i % 2) tail.push(part(C(0.05, 0.2, 5), p.toArray(), null, [1, 1, 0.6], [(i % 4 ? 1 : -1) * 0.8, d.y, d.z]))
    }
    tail.push(part(C(0.07, 0.2, 6), tailPts.getPoint(1).toArray(), null, [1, 1, 1], tailPts.getTangent(1).toArray()))
    const tailGeo = merge(tail)

    // smoky wisps curling up off the back
    const wisps = []
    ;[[0.06, 0.2], [-0.07, -0.05], [0.04, -0.3], [-0.03, -0.5]].forEach(([x, z], k) => {
      const h = 0.35 + (k % 2) * 0.15
      const c = new THREE.CatmullRomCurve3([[x, 0.98, z], [x + 0.06, 1.0 + h * 0.35, z - 0.08], [x - 0.05, 1.0 + h * 0.7, z - 0.16], [x + 0.04 * (k % 2 ? -1 : 1), 1.0 + h, z - 0.12]].map((p) => new THREE.Vector3(...p)))
      wisps.push(new THREE.TubeGeometry(c, 16, 0.016, 5, false).toNonIndexed())
    })
    const wispGeo = merge(wisps)

    // lightning across the flank, branching from the chest spark
    const bolts = []
    for (const s of [-1, 1]) {
      bolts.push(...bolt([s * 0.3, 0.74, 0.32], [s * 0.3, 0.86, -0.25], 11 + s * 3))
      bolts.push(...bolt([s * 0.32, 0.72, 0.3], [s * 0.27, 0.52, -0.05], 17 + s * 5, 4))
      bolts.push(...bolt([s * 0.26, 0.82, -0.3], [s * 0.2, 0.98, -0.6], 23 + s, 4))
    }
    const boltGeo = merge(bolts)
    return { M, bodyGeo, darkGeo, eyeGeo, fore, hind, tailGeo, wispGeo, boltGeo, sparkGeo: new THREE.SphereGeometry(0.11, 14, 12), flashGeo: new THREE.SphereGeometry(1, 16, 12) }
  }, [gl])
}

export function WolfBody({ A, groupRef, visible = false }) {
  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e9dcff', transparent: true, opacity: 0.6, toneMapped: false }), [])
  return (
    <group ref={groupRef} visible={visible}>
      <group name="body">
        <mesh geometry={A.bodyGeo} material={A.M.fur} castShadow />
        <mesh geometry={A.darkGeo} material={A.M.furDark} />
        <mesh geometry={A.eyeGeo} material={A.M.eye} />
        <mesh geometry={A.boltGeo} material={A.M.bolt} />
        <mesh name="wisps" geometry={A.wispGeo} material={A.M.wisp} />
        <group name="tail" position={[0, 0.78, -0.7]}><mesh geometry={A.tailGeo} material={A.M.fur} castShadow /></group>
        {[[-0.16, 0.38, 'fore'], [0.16, 0.38, 'fore'], [-0.15, -0.48, 'hind'], [0.15, -0.48, 'hind']].map(([x, z, kind], k) => (
          <group key={k} name={'leg' + k} position={[x, 0.66, z]}><mesh geometry={A[kind]} material={A.M.furDark} castShadow /></group>
        ))}
        {/* the unpaired electron */}
        <mesh name="spark" position={[0, 0.7, 0.6]} geometry={A.sparkGeo} material={A.M.spark} />
        <pointLight position={[0, 0.8, 0.5]} color="#a06bff" intensity={1.4} distance={3.5} />
      </group>
      <mesh name="flash" visible={false} geometry={A.flashGeo} material={flashMat} />
    </group>
  )
}

// gait + idle motion for the named parts (shared by the pack and the model viewer)
export function animateWolf(g, t, speed, i = 0) {
  const body = g.getObjectByName('body')
  const swing = Math.sin(t * 14 + i) * Math.min(1, speed / 3) * 0.6
  // diagonal trot: front-left with back-right
  const sides = [-1, 1, 1, -1]
  for (let k = 0; k < 4; k++) body.getObjectByName('leg' + k).rotation.x = sides[k] * swing
  const tail = body.getObjectByName('tail')
  tail.rotation.y = Math.sin(t * 3 + i) * 0.25
  tail.rotation.x = -0.1 + Math.sin(t * 2.2 + i) * 0.08
  const w = body.getObjectByName('wisps')
  w.rotation.y = Math.sin(t * 1.3 + i) * 0.2
  w.scale.y = 1 + Math.sin(t * 2.6 + i) * 0.12
  w.material.opacity = 0.55 + Math.sin(t * 4 + i) * 0.15
  body.getObjectByName('spark').scale.setScalar(1 + Math.sin(t * 12 + i) * 0.25)
}
