import { Suspense, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rimMat } from '../engine/materials'
import { merge, bolt } from '../engine/geo'
import { useModelParts } from '../engine/models'

// The Radical Wolf, modeled on assets/enemies/radical-wolf.png: a shadowy violet wolf with a thick
// ruff, smoky wisps curling off its back, violet lightning crackling across its flank, glowing eyes,
// a big bushy tail, and its one unpaired electron burning in its chest.
// The body, tail and legs are sculpted in Blender (tools/wolf_blender.py → public/models/wolf.glb: a
// metaball body under shaggy fur clumps); the lightning, wisps, spark and flash stay procedural here.
// The pack animates the named parts: body (scale), spark, leg0..leg3 (rotation.x), tail, wisps, flash.

// a soft round glow (a radial gradient) for the spark's halo
let glowTex = null
function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  glowTex = new THREE.CanvasTexture(c)
  return glowTex
}

export function useWolfAssets() {
  const gl = useThree((s) => s.gl)
  return useMemo(() => {
    const M = {
      fur: rimMat({ color: '#2e2242', roughness: 0.85, emissive: new THREE.Color('#1c0c38'), emissiveIntensity: 0.45 }, '#a77cff', 0.8, 2.2),
      furDark: rimMat({ color: '#1c1428', roughness: 0.9, emissive: new THREE.Color('#110826'), emissiveIntensity: 0.4 }, '#8a60ff', 0.45, 2.4),
      nose: new THREE.MeshStandardMaterial({ color: '#0d0a14', roughness: 0.4 }),
      eye: new THREE.MeshBasicMaterial({ color: '#c23cff', toneMapped: false }),
      bolt: new THREE.MeshBasicMaterial({ color: '#c79bff', toneMapped: false }),
      halo: new THREE.SpriteMaterial({ map: glowTexture(), color: '#c08aff', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      wisp: new THREE.MeshBasicMaterial({ color: '#7a4ad0', vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }),
      spark: new THREE.MeshStandardMaterial({ color: '#e7d2ff', emissive: new THREE.Color('#a06bff'), emissiveIntensity: 3, toneMapped: false }),
    }
    // smoky wisps curling up off the back
    const wisps = []
    ;[[0.06, 0.2], [-0.07, -0.05], [0.04, -0.3], [-0.03, -0.5]].forEach(([x, z], k) => {
      const h = 0.35 + (k % 2) * 0.15
      const c = new THREE.CatmullRomCurve3([[x, 0.98, z], [x + 0.06, 1.0 + h * 0.35, z - 0.08], [x - 0.05, 1.0 + h * 0.7, z - 0.16], [x + 0.04 * (k % 2 ? -1 : 1), 1.0 + h, z - 0.12]].map((p) => new THREE.Vector3(...p)))
      // a smoke ribbon: thick at the shoulders, thinning to a wisp
      const tg = new THREE.TubeGeometry(c, 16, 0.05, 6, false)
      const pos = tg.attributes.position
      for (let v = 0; v < pos.count; v++) {
        const t = Math.floor(v / 7) / 16
        const ctr = c.getPointAt(Math.min(1, t))
        pos.setXYZ(v, ctr.x + (pos.getX(v) - ctr.x) * (1 - 0.9 * t), ctr.y + (pos.getY(v) - ctr.y) * (1 - 0.9 * t), ctr.z + (pos.getZ(v) - ctr.z) * (1 - 0.9 * t))
      }
      // fade the smoke out toward its tip (vertex alpha)
      const col = new Float32Array(pos.count * 4)
      for (let v = 0; v < pos.count; v++) { const t = Math.floor(v / 7) / 16; col.set([1, 1, 1, Math.max(0, 1 - t) * 0.9], v * 4) }
      tg.setAttribute('color', new THREE.BufferAttribute(col, 4))
      wisps.push(tg.toNonIndexed())
    })
    const wispGeo = merge(wisps)

    // lightning across the flank, branching from the chest spark
    const bolts = []
    for (const s of [-1, 1]) {
      const from = s > 0 ? [0.17, 0.84, 0.34] : [-0.22, 0.86, 0.2]
      const ends = [[0.25, 0.9, -0.1], [0.26, 0.64, 0.05], [0.2, 0.98, 0.1], [0.24, 0.78, -0.4], [0.16, 0.6, 0.38]]
      ends.forEach((e, k) => {
        if (s < 0 && k > 2) return
        const end = [s * e[0], e[1], e[2]]
        bolts.push(...bolt(from, end, 11 + k * 7 + s * 3, 6, 0.03, 0.0045))
        // a fork off the middle of each bolt
        const mid = [(from[0] + end[0]) / 2, (from[1] + end[1]) / 2 + 0.03, (from[2] + end[2]) / 2]
        bolts.push(...bolt(mid, [mid[0] + s * 0.02, mid[1] + (k % 2 ? 0.09 : -0.09), mid[2] - 0.1], 31 + k * 5 + s, 3, 0.025, 0.0035))
      })
    }
    const boltGeo = merge(bolts)
    return { M, wispGeo, boltGeo, sparkGeo: new THREE.SphereGeometry(0.045, 14, 12), flashGeo: new THREE.SphereGeometry(1, 16, 12) }
  }, [gl])
}

/** One sculpted wolf part with the game's own materials (matched by name). */
function WolfPart({ name, A, shadow = false }) {
  const parts = useModelParts('wolf')
  const list = parts[name]
  if (!list) return null
  return list.map((p, i) => <mesh key={i} geometry={p.geometry} material={A.M[p.material.name] || A.M.fur} castShadow={shadow} />)
}

export function WolfBody({ A, groupRef, visible = false }) {
  const flashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e9dcff', transparent: true, opacity: 0.6, toneMapped: false }), [])
  return (
    <group ref={groupRef} visible={visible}>
      <group name="body">
        <Suspense fallback={null}><WolfPart name="wolf_body" A={A} shadow /></Suspense>
        <mesh name="bolts" geometry={A.boltGeo} material={A.M.bolt} />
        <mesh name="wisps" geometry={A.wispGeo} material={A.M.wisp} />
        <group name="tail" position={[0, 0.78, -0.7]}><Suspense fallback={null}><WolfPart name="wolf_tail" A={A} shadow /></Suspense></group>
        {[[-0.16, 0.38, 'fore'], [0.16, 0.38, 'fore'], [-0.15, -0.48, 'hind'], [0.15, -0.48, 'hind']].map(([x, z, kind], k) => (
          <group key={k} name={'leg' + k} position={[x, 0.66, z]}><Suspense fallback={null}><WolfPart name={'wolf_' + kind} A={A} shadow /></Suspense></group>
        ))}
        {/* the unpaired electron */}
        <mesh name="spark" position={[0.17, 0.84, 0.34]} geometry={A.sparkGeo} material={A.M.spark} />
        <sprite position={[0.18, 0.84, 0.35]} material={A.M.halo} scale={0.22} />
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
  w.material.opacity = 0.38 + Math.sin(t * 4 + i) * 0.08
  // the lightning crackles: it blinks out now and then
  const b = body.getObjectByName('bolts')
  if (b) b.visible = Math.sin(t * 23 + i * 5) + Math.sin(t * 37 + i) > -1.2
  body.getObjectByName('spark').scale.setScalar(1 + Math.sin(t * 12 + i) * 0.25)
}
