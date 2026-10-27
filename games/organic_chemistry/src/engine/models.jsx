import { useLayoutEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// Models built in Blender (tools/*_blender.py → public/models/*.glb). Each top-level node in a file is
// one "part" (a prop or a body part) in its own frame; a part with several materials is several meshes.
// Components that call useModelParts must sit inside a <Suspense>.

export const modelUrl = (name) => `${import.meta.env.BASE_URL}models/${name}.glb`

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
export function InstancedPart({ parts, name, items, colors, castShadow = false, receiveShadow = true }) {
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
        <instancedMesh key={i} ref={(m) => (refs.current[i] = m)} args={[p.geometry, p.material, items.length]} castShadow={castShadow} receiveShadow={receiveShadow} />
      ))}
    </group>
  )
}
