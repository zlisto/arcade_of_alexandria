import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Geometry helpers for procedural models: bake primitives into place and merge them, so a model
// with dozens of parts draws as a few meshes.

const up = new THREE.Vector3(0, 1, 0)

// place a primitive (position, rotation as Euler or a direction to point +y along, scale) and bake it
export function part(geo, pos = [0, 0, 0], rot = null, scale = [1, 1, 1], dir = null) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  const m = new THREE.Matrix4()
  const q = dir ? new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(...dir).normalize()) : new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0])))
  m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...scale))
  g.applyMatrix4(m)
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  return g
}
// parts keep their own (transformed) normals, so curved parts stay smooth after merging
export const merge = (parts) => mergeGeometries(parts, false)

// a zig-zag bolt from a to b, made of thin cylinders
export function bolt(a, b, seed, segs = 5, jitter = 0.07, r = 0.008) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5)
  const pts = [new THREE.Vector3(...a)]
  for (let i = 1; i < segs; i++) {
    const t = i / segs
    pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t + rnd() * jitter, a[1] + (b[1] - a[1]) * t + rnd() * jitter, a[2] + (b[2] - a[2]) * t + rnd() * jitter))
  }
  pts.push(new THREE.Vector3(...b))
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1]
    const d = q.clone().sub(p)
    out.push(part(new THREE.CylinderGeometry(r, r, d.length(), 4), p.clone().add(q).multiplyScalar(0.5).toArray(), null, [1, 1, 1], d.toArray()))
  }
  return out
}


// a cylinder running from point a to point b (a bond stick, a strut)
export function stick(a, b, r = 0.1, sides = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b)
  const d = B.clone().sub(A)
  return part(new THREE.CylinderGeometry(r, r, d.length(), sides), A.clone().add(B).multiplyScalar(0.5).toArray(), null, [1, 1, 1], d.toArray())
}
