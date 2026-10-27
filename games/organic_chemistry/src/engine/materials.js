import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// Shared material helpers for the procedural cast: a rim-lit standard material, a locally built
// reflection map for metal, and a bend for curving flat extruded plates around a body.

// Standard material + fresnel rim light (patched into the shader).
export function rimMat(params, rim = '#7fb2ff', strength = 0.35, power = 2.6) {
  const m = new THREE.MeshStandardMaterial(params)
  const rimColor = new THREE.Color(rim)
  m.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = { value: rimColor }
    shader.uniforms.rimStrength = { value: strength }
    shader.uniforms.rimPower = { value: power }
    shader.fragmentShader = 'uniform vec3 rimColor;\nuniform float rimStrength;\nuniform float rimPower;\n' + shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      'float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), rimPower);\n  gl_FragColor.rgb += rimColor * rimF * rimStrength;\n  #include <dithering_fragment>',
    )
  }
  m.customProgramCacheKey = () => `rim-${rim}-${strength}-${power}`
  return m
}

// A soft studio reflection map, generated locally once, so the metal armor has something to reflect.
let envTex = null
export function getEnv(gl) {
  if (!envTex) { const pm = new THREE.PMREMGenerator(gl); envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose() }
  return envTex
}

// Bend a flat extruded plate around the body (sides curve back), so plates hug the torso.
export function bend(geo, k) {
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - k * p.getX(i) * p.getX(i))
  p.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}


// A soft round glow (radial gradient), shared by sprites, motes and flames.
let softTex = null
export function softDot() {
  if (softTex) return softTex
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64)
  softTex = new THREE.CanvasTexture(c)
  return softTex
}
