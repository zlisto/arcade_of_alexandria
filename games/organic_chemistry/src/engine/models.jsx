import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Models built in Blender (tools/*_blender.py → public/models/*.glb). Each top-level node in a file is
// one "part" (a prop or a body part) in its own frame; a part with several materials is several meshes.
// Components that call useModelParts must sit inside a <Suspense>.

export const modelUrl = (name) => `${import.meta.env.BASE_URL}models/${name}.glb`
/** Start downloading models before a scene needs them (so it never opens empty). */
export const preloadModels = (...names) => names.forEach((n) => useGLTF.preload(modelUrl(n)))

export function useModelParts(name) {
  const { scene } = useGLTF(modelUrl(name))
  return useMemo(() => {
    const out = {}
    scene.traverse((o) => {
      if (!o.isMesh) return
      let n = o
      while (n.parent && n.parent !== scene) n = n.parent
      ;(out[n.name] = out[n.name] || []).push({ geometry: o.geometry, material: o.material })
    })
    return out
  }, [scene])
}

/** One part as plain meshes. override: { materialName: material } swaps materials by name. */
export function ModelPart({ parts, name, override, castShadow = true, receiveShadow = true, ...props }) {
  const list = parts[name]
  if (!list) return null
  return (
    <group {...props}>
      {list.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={(override && override[p.material.name]) || p.material} castShadow={castShadow} receiveShadow={receiveShadow} />
      ))}
    </group>
  )
}

/** Many copies of one part in a single draw call per material. items: [x, y, z, scale, rotY]; colors: optional THREE.Color per item. */
export function InstancedPart({ parts, name, items, colors, castShadow = false, receiveShadow = true, meshesRef }) {
  const list = parts[name]
  const refs = useRef([])
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    refs.current.forEach((m) => {
      if (!m) return
      items.forEach(([x, y, z, s = 1, r = 0], i) => {
        d.position.set(x, y, z)
        d.rotation.set(0, r, 0)
        d.scale.setScalar(s)
        d.updateMatrix()
        m.setMatrixAt(i, d.matrix)
        if (colors) m.setColorAt(i, colors[i % colors.length])
      })
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    })
  }, [items, list, colors])
  if (!list || !items.length) return null
  return (
    <group>
      {list.map((p, i) => (
        <instancedMesh key={i} ref={(m) => { refs.current[i] = m; if (meshesRef) meshesRef.current = refs.current }} args={[p.geometry, p.material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} />
      ))}
    </group>
  )
}

// A copy of a game material that also multiplies in the baked occlusion (the glb's vertex colours).
// Glowing and unlit materials are left alone (they don't need shading, and the game animates them).
const aoCache = new WeakMap()
export function withAO(m) {
  if (!m || !m.isMeshStandardMaterial || (m.emissiveIntensity > 0.5 && m.emissive && m.emissive.getHex() !== 0)) return m
  let c = aoCache.get(m)
  if (!c) {
    c = m.clone()
    c.vertexColors = true
    c.onBeforeCompile = m.onBeforeCompile
    if (m.customProgramCacheKey !== Object.getPrototypeOf(m).customProgramCacheKey) {
      const k = m.customProgramCacheKey
      c.customProgramCacheKey = () => k.call(m) + '-ao'
    }
    aoCache.set(m, c)
  }
  return c
}

function PartInner({ model, name, mats, ao = true, oneSided = false, castShadow = true, receiveShadow = false, ...props }) {
  const parts = useModelParts(model)
  const list = parts[name]
  // the glb's own materials are double-sided; a closed set (a cave) only needs its inner faces, and a camera
  // that slips inside a wall should see through it
  if (oneSided && list) list.forEach((p) => { if (p.material.side !== THREE.FrontSide) { p.material.side = THREE.FrontSide; p.material.needsUpdate = true } })
  if (!list) return null
  return (
    <group {...props}>
      {list.map((p, i) => {
        let m = (mats && mats[p.material.name]) || p.material
        if (m !== p.material && ao && p.geometry.attributes.color) m = withAO(m)
        return <mesh key={i} geometry={p.geometry} material={m} castShadow={castShadow} receiveShadow={receiveShadow} />
      })}
    </group>
  )
}

/** One part of a Blender model, with the game's materials swapped in by name (mats), inside its own Suspense. */
export function Part(props) {
  return <Suspense fallback={null}><PartInner {...props} /></Suspense>
}
