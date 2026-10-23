import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ELEMENTS } from '../chem/rules'

// Kai, modeled on assets/characters/kai.png: graphite plate armor with a high collar, layered
// pauldrons, a V-chevron chest plate carrying a glowing node network (a central carbon gem wired to
// four bond sockets), segmented bracers and greaves, a belt with a glowing buckle, long coat panels,
// messy black hair, and a cyan light blade. Built from primitives; every material has a cool rim
// light so the silhouette reads in dark caves.
//
// pose (set every frame by the controller):
//   run 0..1, phase (radians), roll 0..1 (tumble progress), swing -1..1 (slash arc, 0 = none), swingSide (1|-1),
//   spin 0..1, block 0..1, hurt 0..1, stance 'sp3'|'sp2'|'sp', sockets [symbols], charge 0..1

const CYAN = '#43e6f5'

// Standard material + fresnel rim light (patched into the shader).
function rimMat(params, rim = '#7fb2ff', strength = 0.35, power = 2.6) {
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
function getEnv(gl) {
  if (!envTex) { const pm = new THREE.PMREMGenerator(gl); envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose() }
  return envTex
}

// Bend a flat extruded plate around the body (sides curve back), so plates hug the torso.
function bend(geo, k) {
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - k * p.getX(i) * p.getX(i))
  p.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

function useKaiAssets() {
  const gl = useThree((st) => st.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const M = {
      armor: rimMat({ color: '#56606e', metalness: 0.7, roughness: 0.32, envMap: env, envMapIntensity: 0.9 }),
      armorDark: rimMat({ color: '#353b46', metalness: 0.6, roughness: 0.4, envMap: env, envMapIntensity: 0.75 }),
      edge: rimMat({ color: '#8a93a2', metalness: 0.8, roughness: 0.26, envMap: env, envMapIntensity: 1 }),
      under: rimMat({ color: '#262933', roughness: 0.85 }, '#7fb2ff', 0.25),
      cloth: rimMat({ color: '#23262e', roughness: 0.9 }, '#7fb2ff', 0.3),
      leather: rimMat({ color: '#3a3029', roughness: 0.65 }, '#7fb2ff', 0.2),
      skin: rimMat({ color: '#e2b597', roughness: 0.62 }, '#ffd2b0', 0.18, 3),
      hair: rimMat({ color: '#1a1a20', roughness: 0.45, metalness: 0.15, envMap: env, envMapIntensity: 0.4 }, '#8fb8ff', 0.35, 2.2),
      eyeWhite: new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.3 }),
      iris: new THREE.MeshStandardMaterial({ color: '#4c7486', roughness: 0.25 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#0b0f12' }),
      brow: new THREE.MeshStandardMaterial({ color: '#16151a', roughness: 0.8 }),
      lip: new THREE.MeshStandardMaterial({ color: '#9a5a50', roughness: 0.6 }),
      glow: new THREE.MeshStandardMaterial({ color: CYAN, emissive: new THREE.Color(CYAN), emissiveIntensity: 2.2, toneMapped: false }),
      wire: new THREE.MeshBasicMaterial({ color: '#2fc6d6', toneMapped: false }),
    }
    // torso shell: tapered from waist to shoulders, elliptical in section
    const torso = new THREE.LatheGeometry([
      [0.16, 0], [0.175, 0.06], [0.2, 0.2], [0.235, 0.34], [0.25, 0.44], [0.225, 0.52], [0.15, 0.585], [0.09, 0.61],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 24)
    // chest plate with the V chevron, curved to the chest
    const cs = new THREE.Shape()
    cs.moveTo(-0.19, 0.42); cs.lineTo(0.19, 0.42); cs.lineTo(0.225, 0.22); cs.lineTo(0.13, 0.03); cs.lineTo(0, -0.05); cs.lineTo(-0.13, 0.03); cs.lineTo(-0.225, 0.22); cs.closePath()
    const chest = bend(new THREE.ExtrudeGeometry(cs, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 }), 2.3)
    // a raised collar-bone ridge on top of the plate
    const rs = new THREE.Shape()
    rs.moveTo(-0.16, 0.4); rs.lineTo(0.16, 0.4); rs.lineTo(0.06, 0.3); rs.lineTo(0, 0.27); rs.lineTo(-0.06, 0.3); rs.closePath()
    const ridge = bend(new THREE.ExtrudeGeometry(rs, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }), 2.3)
    // ab bands under the chevron
    const band = (w) => { const s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w * 0.96, 0.045); s.lineTo(-w * 0.96, 0.045); s.closePath(); return bend(new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 }), 2.6) }
    const abBand = band(0.17)
    // blade: a tapered, pointed profile with bevelled edges
    const bs = new THREE.Shape()
    bs.moveTo(-0.027, 0); bs.lineTo(0.027, 0); bs.lineTo(0.022, 0.86); bs.lineTo(0, 1.0); bs.lineTo(-0.022, 0.86); bs.closePath()
    const blade = new THREE.ExtrudeGeometry(bs, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 2 })
    blade.translate(0, 0, -0.004)
    // pauldron plates: shallow caps
    const cap = (r) => new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)
    const caps = [cap(0.15), cap(0.135), cap(0.12)]
    // hair: messy tufts on a cap — fringe hanging over the forehead, the rest swept back
    const tufts = []
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const up = new THREE.Vector3(0, 1, 0)
    const add = (az, el, len, w, sweep) => {
      const n = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      const dir = n.clone().multiplyScalar(sweep[0]).add(new THREE.Vector3(0, sweep[1], sweep[2])).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir)
      const pos = n.clone().multiplyScalar(0.142).add(dir.clone().multiplyScalar(len * 0.38))
      tufts.push({ pos, q, s: [w, len, w * 0.7] })
    }
    for (let i = 0; i < 8; i++) add(-0.8 + (i / 7) * 1.6 + (rnd() - 0.5) * 0.1, 0.62 + rnd() * 0.1, 0.065 + rnd() * 0.03, 0.045 + rnd() * 0.012, [0.6, -0.75, 0.35]) // short fringe above the brows
    for (let i = 0; i < 18; i++) add(-1.9 + rnd() * 3.8, 0.45 + rnd() * 0.85, 0.09 + rnd() * 0.05, 0.06 + rnd() * 0.02, [0.55, 0.05, -0.85]) // crown, swept back and lying flat
    for (let i = 0; i < 9; i++) add(Math.PI + (rnd() - 0.5) * 2.6, -0.05 + rnd() * 0.45, 0.1 + rnd() * 0.04, 0.05, [0.7, -0.8, -0.3]) // back and sides, falling
    return { M, torso, chest, ridge, abBand, blade, caps, tufts }
  }, [])
}

// chest node network: the four bond sockets around a central carbon gem (front of the chest plate)
const CORE = [0, 1.3, 0.2]
const NODES = [[-0.115, 1.42, 0.168], [0.115, 1.42, 0.168], [-0.1, 1.2, 0.18], [0.1, 1.2, 0.18]]

function Pauldron({ side, caps, M }) {
  // three overlapping plates, stepping down the arm; the top one has a glowing edge
  return (
    <group position={[side * 0.03, 0.01, 0]} rotation={[0, 0, -side * 0.3]}>
      {caps.map((g, i) => (
        <mesh key={i} geometry={g} material={i === 1 ? M.armorDark : M.armor} position={[side * i * 0.012, -i * 0.055, 0]} scale={[1, 0.82, 0.92]} castShadow />
      ))}
      <mesh position={[side * 0.03, 0.115, 0.05]} material={M.glow}><sphereGeometry args={[0.02, 12, 10]} /></mesh>
    </group>
  )
}

function Arm({ side, armRef, elbowRef, M, caps, children }) {
  return (
    <group ref={armRef} position={[side * 0.285, 1.46, 0]}>
      <Pauldron side={side} caps={caps} M={M} />
      {/* upper arm: sleeve + rerebrace rings */}
      <mesh position={[0, -0.13, 0]} material={M.under} castShadow><capsuleGeometry args={[0.062, 0.17, 4, 12]} /></mesh>
      <mesh position={[0, -0.15, 0]} material={M.armor}><cylinderGeometry args={[0.073, 0.068, 0.07, 14]} /></mesh>
      <mesh position={[0, -0.215, 0]} material={M.armorDark}><cylinderGeometry args={[0.068, 0.064, 0.05, 14]} /></mesh>
      <group ref={elbowRef} position={[0, -0.27, 0]}>
        <mesh position={[0, 0, -0.01]} material={M.armor}><sphereGeometry args={[0.062, 14, 12]} /></mesh>
        <mesh position={[0, 0.005, -0.055]} rotation={[0.5, 0, 0]} material={M.edge}><coneGeometry args={[0.035, 0.06, 8]} /></mesh>
        {/* vambrace with ridges and a glowing seam */}
        <mesh position={[0, -0.13, 0]} material={M.armor} castShadow><cylinderGeometry args={[0.072, 0.058, 0.2, 14]} /></mesh>
        <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.edge}><torusGeometry args={[0.072, 0.007, 6, 18]} /></mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.edge}><torusGeometry args={[0.06, 0.007, 6, 18]} /></mesh>
        <mesh position={[side * 0.066, -0.13, 0]} material={M.glow}><boxGeometry args={[0.006, 0.15, 0.012]} /></mesh>
        {/* gauntlet */}
        <RoundedBox args={[0.088, 0.1, 0.095]} radius={0.025} smoothness={3} position={[0, -0.275, 0.005]} material={M.armorDark} />
        <RoundedBox args={[0.092, 0.035, 0.05]} radius={0.012} smoothness={2} position={[0, -0.25, 0.04]} material={M.edge} />
        {children}
      </group>
    </group>
  )
}

function Leg({ side, legRef, kneeRef, M }) {
  return (
    <group ref={legRef} position={[side * 0.11, 0.86, 0]}>
      <mesh position={[0, -0.18, 0]} material={M.under} castShadow><capsuleGeometry args={[0.083, 0.24, 4, 12]} /></mesh>
      {/* cuisse: a curved plate on the front of the thigh */}
      <mesh position={[0, -0.2, 0.005]} material={M.armor}><cylinderGeometry args={[0.096, 0.086, 0.23, 14, 1, true, -1.25, 2.5]} /></mesh>
      <group ref={kneeRef} position={[0, -0.4, 0]}>
        <mesh position={[0, 0, 0.045]} material={M.armor}><sphereGeometry args={[0.062, 14, 12]} /></mesh>
        <mesh position={[side * 0.05, 0, 0.03]} rotation={[0, 0, side * 1.2]} material={M.edge}><coneGeometry args={[0.03, 0.06, 6]} /></mesh>
        <mesh position={[0, -0.17, 0]} material={M.under}><capsuleGeometry args={[0.066, 0.22, 4, 12]} /></mesh>
        {/* greave with a glowing seam down the shin */}
        <mesh position={[0, -0.19, 0.008]} material={M.armor} castShadow><cylinderGeometry args={[0.08, 0.068, 0.26, 14]} /></mesh>
        <mesh position={[0, -0.19, 0.083]} rotation={[-0.05, 0, 0]} material={M.glow}><boxGeometry args={[0.012, 0.2, 0.006]} /></mesh>
        <mesh position={[0, -0.07, 0.008]} rotation={[Math.PI / 2, 0, 0]} material={M.edge}><torusGeometry args={[0.08, 0.007, 6, 18]} /></mesh>
        <mesh position={[0, -0.34, 0.01]} material={M.armorDark}><cylinderGeometry args={[0.074, 0.08, 0.07, 14]} /></mesh>
        {/* boot */}
        <group position={[0, -0.39, 0]}>
          <RoundedBox args={[0.13, 0.1, 0.25]} radius={0.035} smoothness={3} position={[0, -0.02, 0.045]} material={M.armorDark} castShadow />
          <RoundedBox args={[0.14, 0.03, 0.27]} radius={0.01} smoothness={2} position={[0, -0.07, 0.045]} material={M.leather} />
          <RoundedBox args={[0.12, 0.06, 0.08]} radius={0.025} smoothness={3} position={[0, 0.0, 0.14]} material={M.armor} />
        </group>
      </group>
    </group>
  )
}

function Head({ headRef, eyesRef, hairRef, M, tufts }) {
  return (
    <group ref={headRef} position={[0, 1.63, 0]}>
      <mesh position={[0, 0.0, 0]} material={M.skin}><cylinderGeometry args={[0.048, 0.055, 0.14, 12]} /></mesh>
      {/* skull + jaw + ears */}
      <mesh position={[0, 0.15, 0]} scale={[0.9, 1.08, 0.96]} material={M.skin} castShadow><sphereGeometry args={[0.142, 28, 22]} /></mesh>
      <mesh position={[0, 0.098, 0.012]} scale={[0.8, 0.7, 0.86]} material={M.skin}><sphereGeometry args={[0.11, 22, 16]} /></mesh>
      <mesh position={[0.128, 0.14, -0.005]} scale={[0.45, 1, 0.75]} material={M.skin}><sphereGeometry args={[0.032, 10, 8]} /></mesh>
      <mesh position={[-0.128, 0.14, -0.005]} scale={[0.45, 1, 0.75]} material={M.skin}><sphereGeometry args={[0.032, 10, 8]} /></mesh>
      {/* face */}
      <group ref={eyesRef} position={[0, 0.152, 0]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.047, 0, 0.118]}>
            <mesh scale={[1, 0.62, 0.45]} material={M.eyeWhite}><sphereGeometry args={[0.024, 14, 10]} /></mesh>
            <mesh position={[0, 0, 0.008]} scale={[1, 1, 0.4]} material={M.iris}><sphereGeometry args={[0.0135, 12, 10]} /></mesh>
            <mesh position={[0, 0, 0.0125]} material={M.pupil}><sphereGeometry args={[0.006, 8, 6]} /></mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => <mesh key={s} position={[s * 0.05, 0.188, 0.128]} rotation={[0.1, 0, s * -0.18]} material={M.brow}><boxGeometry args={[0.056, 0.011, 0.014]} /></mesh>)}
      <mesh position={[0, 0.125, 0.14]} rotation={[-0.25, 0, 0]} material={M.skin}><boxGeometry args={[0.02, 0.042, 0.024]} /></mesh>
      <mesh position={[0, 0.103, 0.143]} material={M.skin}><sphereGeometry args={[0.012, 8, 6]} /></mesh>
      <mesh position={[0, 0.074, 0.123]} rotation={[0.2, 0, 0]} scale={[1, 0.35, 0.5]} material={M.lip}><sphereGeometry args={[0.018, 12, 8]} /></mesh>
      {/* hair: a cap that covers the back of the head, plus tufts */}
      <group ref={hairRef} position={[0, 0.15, 0]}>
        {/* crown cap tilted back so its front edge sits at the hairline, and a back piece that leaves the face open */}
        <mesh position={[0, 0.02, -0.018]} rotation={[-0.5, 0, 0]} scale={[0.98, 1, 1.02]} material={M.hair}><sphereGeometry args={[0.152, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5]} /></mesh>
        <mesh position={[0, 0.0, -0.014]} scale={[0.98, 1.04, 1.02]} material={M.hair}><sphereGeometry args={[0.151, 22, 14, Math.PI * 0.9, Math.PI * 1.2, Math.PI * 0.4, Math.PI * 0.42]} /></mesh>
        {tufts.map((t, i) => (
          <mesh key={i} position={t.pos} quaternion={t.q} scale={t.s} material={M.hair}><coneGeometry args={[1, 1, 5]} /></mesh>
        ))}
      </group>
    </group>
  )
}

const KaiModel = forwardRef(function KaiModel(_, ref) {
  const pose = useRef({ run: 0, phase: 0, roll: 0, swing: 0, swingSide: 1, spin: 0, block: 0, hurt: 0, stance: 'sp3', sockets: [], charge: 0 })
  useImperativeHandle(ref, () => pose.current)
  const { M, torso, chest, ridge, abBand, blade: bladeGeo, caps, tufts } = useKaiAssets()
  const root = useRef()
  const body = useRef()
  const upper = useRef()
  const legL = useRef(); const legR = useRef(); const kneeL = useRef(); const kneeR = useRef()
  const armL = useRef(); const armR = useRef(); const elbowL = useRef(); const elbowR = useRef()
  const head = useRef(); const eyes = useRef(); const hair = useRef()
  const panels = useRef([])
  const blade = useRef()
  const bladeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7ff4ff', emissive: new THREE.Color(CYAN), emissiveIntensity: 1.8, toneMapped: false }), [])
  const nodeMats = useMemo(() => NODES.map(() => new THREE.MeshStandardMaterial({ color: CYAN, emissive: new THREE.Color(CYAN), emissiveIntensity: 1.8, toneMapped: false })), [])
  const atomRefs = useRef([])
  const trail = useRef()

  useFrame(({ clock }, dt) => {
    const p = pose.current
    const t = clock.elapsedTime
    const k = Math.min(1, dt * 12)
    // stance silhouette: sp3 = full tetrahedral stance, sp2 = flattened (slips under slots), sp = narrow lance
    const target = p.stance === 'sp2' ? [1.25, 0.58, 1.1] : p.stance === 'sp' ? [0.82, 1.06, 0.82] : [1, 1, 1]
    const s = body.current.scale
    s.x += (target[0] - s.x) * k; s.y += (target[1] - s.y) * k; s.z += (target[2] - s.z) * k

    const run = p.run
    const sw = Math.sin(p.phase) * run
    const c = Math.cos(p.phase)
    // legs, with knees bending through the forward swing
    legL.current.rotation.x = sw * 0.85
    legR.current.rotation.x = -sw * 0.85
    kneeL.current.rotation.x = 0.06 + run * (0.15 + 1.05 * Math.max(0, -c))
    kneeR.current.rotation.x = 0.06 + run * (0.15 + 1.05 * Math.max(0, c))

    // right arm holds the blade, left the buckler
    let rx = -sw * 0.55 - 0.12, ry = 0, rz = -0.12, re = -(0.3 + 0.25 * run)
    if (p.swing !== 0) { rx = -1.35; ry = p.swing * 1.6 * p.swingSide; re = -0.15 }
    if (p.spin > 0) { rx = -1.5; ry = 0; re = -0.1 }
    if (p.charge > 0) { rx = -0.45; rz = -0.9; re = -0.7 }
    armR.current.rotation.set(rx, ry, rz)
    elbowR.current.rotation.x = re
    const b = p.block
    armL.current.rotation.set(b > 0.1 ? -1.25 * b : sw * 0.55 - 0.12, b * 0.75, 0.12)
    elbowL.current.rotation.x = b > 0.1 ? -0.95 * b : -(0.3 + 0.25 * run)

    // upper body: lean into a run, twist with the slash, breathe
    const up = upper.current
    up.rotation.x = 0.1 * run
    up.rotation.y = p.swing !== 0 ? p.swing * 0.28 * p.swingSide : Math.sin(p.phase) * 0.06 * run
    up.scale.y = 1 + Math.sin(t * 2.1) * 0.008 * (1 - run)
    head.current.rotation.y = -up.rotation.y * 0.6
    head.current.rotation.x = -0.06 * run
    hair.current.rotation.x = -0.05 * run + Math.sin(t * 9) * 0.015 * run
    // blink every few seconds
    eyes.current.scale.y = (t % 3.7) < 0.11 ? 0.12 : 1

    // coat panels: the front ones kick forward with each leg, the back ones trail
    const [fl, fr, bl, br] = panels.current
    if (fl && fr && bl && br) {
      fl.rotation.x = Math.min(0, sw) * 0.9 - 0.04
      fr.rotation.x = Math.min(0, -sw) * 0.9 - 0.04
      bl.rotation.x = 0.06 + run * 0.25 + Math.max(0, sw) * 0.7
      br.rotation.x = 0.06 + run * 0.25 + Math.max(0, -sw) * 0.7
    }

    // whole-body moves
    const r = root.current
    r.rotation.x = p.roll > 0 ? p.roll * Math.PI * 2 : 0
    r.position.y = p.roll > 0 ? 0.1 * Math.sin(p.roll * Math.PI) : Math.abs(Math.sin(p.phase)) * 0.06 * run
    r.rotation.y = p.spin > 0 ? -p.spin * Math.PI * 2 : 0
    body.current.rotation.z = p.hurt * 0.3 * Math.sin(t * 40)

    // blade glow and charge
    bladeMat.emissiveIntensity = 1.6 + Math.sin(t * 6) * 0.3 + p.charge * 3 + (p.swing !== 0 || p.spin > 0 ? 1.5 : 0)
    blade.current.scale.y = 1 + p.charge * 0.25
    trail.current.visible = p.swing !== 0 || p.spin > 0

    // chest nodes pulse; carried atoms hover just in front of their socket
    nodeMats.forEach((m, i) => { m.emissiveIntensity = (p.sockets[i] ? 0.8 : 1.6) + Math.sin(t * 3 + i) * 0.4 })
    for (let i = 0; i < 4; i++) {
      const a = atomRefs.current[i]
      if (!a) continue
      const sym = p.sockets[i]
      a.visible = !!sym
      if (sym) {
        a.material.color.set(ELEMENTS[sym]?.color || '#ffffff')
        a.material.emissive.set(ELEMENTS[sym]?.color || '#ffffff').multiplyScalar(0.35)
        const n = NODES[i]
        a.position.set(n[0] * 1.7, n[1] + Math.sin(t * 2.5 + i) * 0.015, n[2] + 0.11)
      }
    }
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <Leg side={-1} legRef={legL} kneeRef={kneeL} M={M} />
        <Leg side={1} legRef={legR} kneeRef={kneeR} M={M} />
        {/* hips, belt and the glowing buckle */}
        <mesh position={[0, 0.86, 0]} scale={[1, 1, 0.78]} material={M.under}><cylinderGeometry args={[0.165, 0.15, 0.14, 18]} /></mesh>
        <mesh position={[0, 0.94, 0]} scale={[1, 1, 0.76]} material={M.leather}><cylinderGeometry args={[0.188, 0.185, 0.065, 22]} /></mesh>
        <group position={[0, 0.94, 0.142]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={M.edge}><cylinderGeometry args={[0.04, 0.04, 0.02, 20]} /></mesh>
          <mesh position={[0, 0, 0.012]} material={M.glow}><sphereGeometry args={[0.026, 14, 10]} /></mesh>
        </group>
        {/* coat panels hang from the belt */}
        {[[-0.085, 0.13, 1], [0.085, 0.13, 1], [-0.09, -0.13, -1], [0.09, -0.13, -1]].map(([x, z, f], i) => (
          <group key={i} ref={(g) => (panels.current[i] = g)} position={[x, 0.92, z]} rotation={[0, x < 0 ? 0.12 * f : -0.12 * f, 0]}>
            <RoundedBox args={[0.125, 0.42, 0.018]} radius={0.006} smoothness={2} position={[0, -0.21, 0]} material={M.cloth} castShadow />
            <mesh position={[x < 0 ? -0.06 : 0.06, -0.21, f * 0.01]} material={M.armorDark}><boxGeometry args={[0.012, 0.41, 0.006]} /></mesh>
            <mesh position={[0, -0.41, f * 0.01]} material={M.armorDark}><boxGeometry args={[0.125, 0.014, 0.006]} /></mesh>
          </group>
        ))}

        <group ref={upper} position={[0, 0.95, 0]}>
          <group position={[0, -0.95, 0]}>
            {/* torso shell, chest plate, ab bands, back plate */}
            <mesh geometry={torso} position={[0, 0.95, 0]} scale={[1, 1, 0.74]} material={M.armorDark} castShadow />
            <mesh geometry={chest} position={[0, 1.02, 0.152]} rotation={[-0.07, 0, 0]} material={M.armor} castShadow />
            <mesh geometry={ridge} position={[0, 1.02, 0.178]} rotation={[-0.07, 0, 0]} material={M.edge} />
            <mesh geometry={abBand} position={[0, 0.975, 0.135]} material={M.armorDark} />
            <mesh geometry={abBand} position={[0, 1.025, 0.14]} scale={[1.04, 1, 1]} material={M.armorDark} />
            {/* back: shoulder-blade plates either side of a spine ridge, and a lower back plate */}
            {[-1, 1].map((sd) => <mesh key={sd} geometry={abBand} position={[sd * 0.085, 1.34, -0.155]} rotation={[0.12, Math.PI, sd * -0.25]} scale={[0.52, 2.4, 1]} material={M.armor} castShadow />)}
            <mesh geometry={abBand} position={[0, 1.12, -0.152]} rotation={[-0.05, Math.PI, 0]} scale={[0.92, 2.2, 1]} material={M.armorDark} />
            <RoundedBox args={[0.035, 0.34, 0.03]} radius={0.012} smoothness={2} position={[0, 1.27, -0.172]} rotation={[0.06, 0, 0]} material={M.edge} />
            <mesh position={[0, 1.42, -0.188]} material={M.glow}><sphereGeometry args={[0.016, 10, 8]} /></mesh>
            {/* high collar */}
            <mesh position={[0, 1.575, 0]} scale={[1, 1, 0.9]} material={M.armor}><cylinderGeometry args={[0.095, 0.13, 0.1, 18, 1, true]} /></mesh>
            <mesh position={[0, 1.575, 0]} scale={[1, 1, 0.9]} material={M.under}><cylinderGeometry args={[0.087, 0.12, 0.098, 18, 1, true]} /></mesh>
            <mesh position={[0, 1.625, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]} material={M.armorDark}><torusGeometry args={[0.095, 0.007, 6, 24]} /></mesh>
            {/* node network: the carbon core wired to the four bond sockets */}
            <group position={CORE}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={M.edge}><cylinderGeometry args={[0.042, 0.042, 0.02, 20]} /></mesh>
              <mesh position={[0, 0, 0.014]} material={M.glow}><sphereGeometry args={[0.03, 16, 12]} /></mesh>
            </group>
            {NODES.map((n, i) => {
              const dx = n[0] - CORE[0], dy = n[1] - CORE[1]
              const len = Math.hypot(dx, dy)
              return (
                <group key={i}>
                  <mesh position={[(n[0] + CORE[0]) / 2, (n[1] + CORE[1]) / 2, (n[2] + CORE[2]) / 2 + 0.008]} rotation={[0, 0, Math.atan2(dy, dx) - Math.PI / 2]} material={M.wire}><boxGeometry args={[0.006, len - 0.05, 0.004]} /></mesh>
                  <group position={n}>
                    <mesh rotation={[Math.PI / 2, 0, 0]} material={M.edge}><cylinderGeometry args={[0.028, 0.028, 0.016, 16]} /></mesh>
                    <mesh position={[0, 0, 0.01]} material={nodeMats[i]}><sphereGeometry args={[0.018, 12, 10]} /></mesh>
                  </group>
                  <mesh ref={(m) => (atomRefs.current[i] = m)} visible={false}><sphereGeometry args={[0.07, 16, 12]} /><meshStandardMaterial color="#fff" roughness={0.35} emissive="#223" /></mesh>
                </group>
              )
            })}
            <Head headRef={head} eyesRef={eyes} hairRef={hair} M={M} tufts={tufts} />
            <Arm side={-1} armRef={armL} elbowRef={elbowL} M={M} caps={caps}>
              {/* buckler on the outside of the left forearm */}
              <group position={[-0.085, -0.15, 0.02]} rotation={[0, 0, Math.PI / 2]}>
                <mesh material={M.armorDark} castShadow><cylinderGeometry args={[0.17, 0.165, 0.03, 26]} /></mesh>
                <mesh position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.edge}><torusGeometry args={[0.165, 0.012, 8, 30]} /></mesh>
                <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.glow}><torusGeometry args={[0.1, 0.005, 6, 26]} /></mesh>
                <mesh position={[0, 0.026, 0]} material={M.edge}><sphereGeometry args={[0.04, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
                {[0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return <mesh key={i} position={[Math.cos(a) * 0.1, 0.024, Math.sin(a) * 0.1]} material={M.glow}><sphereGeometry args={[0.012, 8, 6]} /></mesh> })}
              </group>
            </Arm>
            <Arm side={1} armRef={armR} elbowRef={elbowR} M={M} caps={caps}>
              {/* the light blade, held in the right gauntlet, pointing forward */}
              <group position={[0, -0.29, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                <mesh position={[0, -0.12, 0]} material={M.edge}><sphereGeometry args={[0.024, 12, 10]} /></mesh>
                <mesh position={[0, -0.04, 0]} material={M.leather}><cylinderGeometry args={[0.017, 0.017, 0.15, 10]} /></mesh>
                {[-0.09, -0.05, -0.01, 0.03].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.under}><torusGeometry args={[0.018, 0.004, 5, 12]} /></mesh>)}
                <RoundedBox args={[0.2, 0.032, 0.05]} radius={0.012} smoothness={2} position={[0, 0.05, 0]} material={M.armor} />
                {[-1, 1].map((s) => <mesh key={s} position={[s * 0.11, 0.065, 0]} rotation={[0, 0, -s * 0.9]} material={M.edge}><coneGeometry args={[0.018, 0.05, 6]} /></mesh>)}
                <mesh position={[0, 0.05, 0.026]} material={M.glow}><sphereGeometry args={[0.012, 8, 6]} /></mesh>
                <group ref={blade} position={[0, 0.068, 0]}>
                  <mesh geometry={bladeGeo} material={bladeMat} />
                  <mesh position={[0, 0.42, 0]} material={M.wire}><boxGeometry args={[0.009, 0.72, 0.024]} /></mesh>
                </group>
              </group>
            </Arm>
          </group>
        </group>
      </group>
      {/* slash trail */}
      <mesh ref={trail} position={[0, 1.05, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.6, 1.55, 32, 1, 0, Math.PI * 1.25]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
})

export default KaiModel
