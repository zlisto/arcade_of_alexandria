import { Suspense, forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { rimMat, getEnv } from '../engine/materials'
import { ELEMENTS } from '../chem/rules'
import { useGame } from '../engine/store'

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

// The three hybrid forms (§1.6–1.9). Kai keeps his proportions and scales as a whole; his glows take
// the form's colour (matching the HUD badge) and the armour picks up a light tint.
// sp² must fit under the 1.15 m forge tunnel, so it scales to about half height.
export const FORMS = {
  sp3: { scale: 1, glow: '#43e6f5', armor: '#3a3f48', armorDark: '#24282f', label: 'sp³', detail: 'tetrahedral · 109.5°' },
  sp2: { scale: 0.52, glow: '#ffd25e', armor: '#4e4a3c', armorDark: '#302c22', label: 'sp²', detail: 'trigonal planar · 120°' },
  sp: { scale: 1.12, glow: '#b98aff', armor: '#45405a', armorDark: '#2a2636', label: 'sp', detail: 'linear · 180°' },
}

function useKaiAssets() {
  const gl = useThree((st) => st.gl)
  return useMemo(() => {
    const env = getEnv(gl)
    const M = {
      armor: rimMat({ color: '#3a3f48', metalness: 0.45, roughness: 0.45, envMap: env, envMapIntensity: 0.4 }),
      armorDark: rimMat({ color: '#24282f', metalness: 0.45, roughness: 0.5, envMap: env, envMapIntensity: 0.3 }),
      edge: rimMat({ color: '#626b78', metalness: 0.7, roughness: 0.3, envMap: env, envMapIntensity: 0.7 }),
      under: rimMat({ color: '#2c303a', roughness: 0.85 }, '#7fb2ff', 0.3),
      cloth: rimMat({ color: '#30343d', roughness: 0.9 }, '#7fb2ff', 0.45),
      leather: rimMat({ color: '#3a3029', roughness: 0.65 }, '#7fb2ff', 0.2),
      skin: rimMat({ color: '#e2b597', roughness: 0.62, emissive: '#3a1a0c', emissiveIntensity: 0.18 }, '#ffb98a', 0.3, 3),
      hair: rimMat({ color: '#22232c', roughness: 0.35, metalness: 0.1, envMap: env, envMapIntensity: 0.3 }, '#9ab8ff', 0.3, 2.2),
      eyeWhite: new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 0.3 }),
      iris: new THREE.MeshStandardMaterial({ color: '#4c7486', roughness: 0.25 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#0b0f12' }),
      brow: new THREE.MeshStandardMaterial({ color: '#16151a', roughness: 0.8 }),
      lip: new THREE.MeshStandardMaterial({ color: '#9a5a50', roughness: 0.6 }),
      glow: new THREE.MeshStandardMaterial({ color: CYAN, emissive: new THREE.Color(CYAN), emissiveIntensity: 2.2, toneMapped: false }),
      wire: new THREE.MeshBasicMaterial({ color: '#2fc6d6', toneMapped: false }),
    }
    return { M, env }
  }, [])
}

// chest node network: the four bond sockets around a central carbon gem (front of the chest plate)
const CORE = [0, 1.3, 0.2]
const NODES = [[-0.115, 1.42, 0.168], [0.115, 1.42, 0.168], [-0.1, 1.2, 0.18], [0.1, 1.2, 0.18]]

// Kai's body parts, modelled in Blender (tools/kai_blender.py). Each part sits in the local frame of
// its joint group below, so the pose code moves it like the old primitives. Materials are matched by
// name to the game's own (hybrid-form colours, rim light), and every part is one mesh per material.
const KAI_URL = `${import.meta.env.BASE_URL}models/kai.glb`
useGLTF.preload(KAI_URL)
const PANELS = [[-0.085, 0.13, 1], [0.085, 0.13, 1], [-0.09, -0.13, -1], [0.09, -0.13, -1]]

function useKaiParts() {
  const { scene } = useGLTF(KAI_URL)
  return useMemo(() => {
    const out = {}
    scene.traverse((o) => {
      if (!o.isMesh) return
      let n = o
      while (n.parent && n.parent !== scene) n = n.parent
      const name = n.name.replace(/^kai_/, '')
      ;(out[name] = out[name] || []).push({ geometry: o.geometry, mat: o.material?.name || 'armor' })
    })
    return out
  }, [scene])
}

function Part({ parts, name, mat, shadow = false }) {
  const list = parts[name]
  if (!list) return null
  return list.map((p, i) => <mesh key={i} geometry={p.geometry} material={mat(p.mat)} castShadow={shadow} />)
}

const KaiModel = forwardRef(function KaiModel({ noTag = false } = {}, ref) {
  const pose = useRef({ run: 0, phase: 0, roll: 0, swing: 0, swingSide: 1, spin: 0, block: 0, hurt: 0, stance: 'sp3', sockets: [], charge: 0 })
  useImperativeHandle(ref, () => pose.current)
  return <Suspense fallback={null}><KaiBody pose={pose} noTag={noTag} /></Suspense>
})

function KaiBody({ pose, noTag }) {
  const { M, env } = useKaiAssets()
  const parts = useKaiParts()
  const root = useRef()
  const pivot = useRef()
  const formScale = useRef(1)
  const body = useRef()
  const upper = useRef()
  const shieldTwist = useRef() // levels the buckler's face while blocking
  const crouch = useRef(0) // 0..1: the low, wide stance of the spin attack
  const wrist = useRef() // turns the sword about the forearm (flat for the spin attack)
  const legL = useRef(); const legR = useRef(); const kneeL = useRef(); const kneeR = useRef()
  const armL = useRef(); const armR = useRef(); const elbowL = useRef(); const elbowR = useRef()
  const head = useRef(); const eyes = useRef(); const hair = useRef()
  const panels = useRef([])
  const blade = useRef()
  const bladeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c8f4ff', metalness: 0.3, roughness: 0.25, envMap: env, envMapIntensity: 0.4, flatShading: true, toneMapped: false, emissive: new THREE.Color(CYAN), emissiveIntensity: 0 }), [env])
  const fullerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d8590', metalness: 1, roughness: 0.35, envMap: env, envMapIntensity: 0.8 }), [env])
  const matFor = useCallback((n) => (n === 'blade' ? bladeMat : n === 'fuller' ? fullerMat : M[n] || M.armor), [M, bladeMat, fullerMat])
  const P = (name, shadow = false) => <Part parts={parts} name={name} mat={matFor} shadow={shadow} />
  const sparkle = useRef()
  const nodeMats = useMemo(() => NODES.map(() => new THREE.MeshStandardMaterial({ color: CYAN, emissive: new THREE.Color(CYAN), emissiveIntensity: 1.8, toneMapped: false })), [])
  const atomRefs = useRef([])
  const trail = useRef()
  const tag = useRef()
  const col = useMemo(() => ({ glow: new THREE.Color(), armor: new THREE.Color(), armorDark: new THREE.Color(), blade: new THREE.Color(), white: new THREE.Color('#ffffff') }), [])
  const hasCrystal = useGame((st) => st.save.hasCrystal)
  const stance = useGame((st) => st.stance)
  const busyTag = useGame((st) => !!(st.prompt || st.lanternPrompt || st.dialogue || st.newman || st.carrying || st.hideFormTag)) || noTag
  const form = FORMS[stance] || FORMS.sp3

  useFrame(({ clock }, dt) => {
    const p = pose.current
    const t = clock.elapsedTime
    const k = Math.min(1, dt * 12)
    // hybrid form: scale the whole body evenly, and blend every glow toward the form's colour
    const F = FORMS[p.stance] || FORMS.sp3
    const s = body.current.scale
    formScale.current += (F.scale - formScale.current) * k
    const sc = formScale.current
    // squash a little while tucked in a roll
    s.setScalar(sc * (1 - 0.15 * (p.roll > 0 ? Math.min(1, Math.sin(p.roll * Math.PI) * 1.6) : 0)))
    if (tag.current) tag.current.position.y = 2.12 * sc + 0.12
    const ck = Math.min(1, dt * 8)
    col.glow.set(F.glow); col.armor.set(F.armor); col.armorDark.set(F.armorDark)
    M.glow.color.lerp(col.glow, ck); M.glow.emissive.lerp(col.glow, ck)
    M.wire.color.lerp(col.glow, ck)
    trail.current.material.color.lerp(col.glow, ck)
    nodeMats.forEach((m) => { m.color.lerp(col.glow, ck); m.emissive.lerp(col.glow, ck) })
    bladeMat.emissive.lerp(col.glow, ck)
    M.armor.color.lerp(col.armor, ck); M.armorDark.color.lerp(col.armorDark, ck)

    crouch.current += ((p.spin > 0 ? 1 : 0) - crouch.current) * Math.min(1, dt * 25)
    const cr = crouch.current
    const run = p.run * (1 - cr) // the run swing fades out under the crouch
    const sw = Math.sin(p.phase) * run
    // forward roll: curl into a ball (knees to chest, arms in, head down) while turning over
    const tuck = p.roll > 0 ? Math.min(1, Math.sin(p.roll * Math.PI) * 1.6) : 0
    const c = Math.cos(p.phase)
    // legs, with knees bending through the forward swing
    legL.current.rotation.x = sw * 0.85 * (1 - tuck) - 1.45 * tuck
    legR.current.rotation.x = -sw * 0.85 * (1 - tuck) - 1.45 * tuck
    kneeL.current.rotation.x = (0.06 + run * (0.15 + 1.05 * Math.max(0, -c))) * (1 - tuck) + 2.3 * tuck
    kneeR.current.rotation.x = (0.06 + run * (0.15 + 1.05 * Math.max(0, c))) * (1 - tuck) + 2.3 * tuck
    // spin attack: drop into a low, wide crouch (like Link's spin) — thighs forward, knees bent, feet flat and set apart
    legL.current.rotation.x += -1.15 * cr; legR.current.rotation.x += -1.15 * cr
    kneeL.current.rotation.x += 1.09 * cr; kneeR.current.rotation.x += 1.09 * cr
    legL.current.rotation.z = -0.22 * cr; legR.current.rotation.z = 0.22 * cr

    // right arm holds the blade, left the buckler
    let rx = -sw * 0.7 - 0.12 - 0.15 * run, ry = 0, rz = -0.12, re = -(0.3 + 0.45 * run)
    if (p.swing !== 0) { rx = -1.35; ry = p.swing * 1.6 * p.swingSide; re = -0.15 }
    // spin attack: arm straight out to the side, blade turned to run on down the arm so it points outward and sweeps the ring
    if (p.spin > 0) { rx = 0; ry = 0; rz = 1.45; re = -0.02 }
    if (p.charge > 0) { rx = -0.7; rz = -0.6; re = -0.55 }  // forearm forward so the gauntlet clears the chest
    if (p.aim) { rx = -1.5; ry = 0; rz = -0.05; re = -0.05 } // hookshot: arm straight out
    if (tuck > 0) { rx = rx * (1 - tuck) - 0.9 * tuck; re = re * (1 - tuck) - 1.7 * tuck }
    armR.current.rotation.set(rx, ry, rz)
    elbowR.current.rotation.x = re
    if (wrist.current) wrist.current.rotation.x = p.spin > 0 ? wrist.current.rotation.x + (Math.PI / 2 - wrist.current.rotation.x) * Math.min(1, dt * 30) : 0
    // block: forearm level across the chest so the buckler covers the body
    const b = p.block
    // (the arm twists a quarter turn so the elbow bends across the body and the buckler's face points forward)
    armL.current.rotation.set(b > 0.1 ? -0.8 * b : (sw * 0.7 - 0.12 - 0.15 * run) * (1 - tuck) - 0.9 * tuck, b > 0.1 ? (Math.PI / 2) * b : 0, b > 0.1 ? 0 : 0.12)
    elbowL.current.rotation.x = b > 0.1 ? -1.6 * b : -(0.3 + 0.45 * run) * (1 - tuck) - 1.7 * tuck
    if (shieldTwist.current) shieldTwist.current.rotation.y = b > 0.1 ? -0.8 * b : 0

    // upper body: lean into a run, twist with the slash, breathe
    const up = upper.current
    up.rotation.x = 0.26 * run + 1.1 * tuck + 0.28 * cr
    up.rotation.y = p.swing !== 0 ? p.swing * 0.28 * p.swingSide : Math.sin(p.phase) * 0.06 * run
    up.scale.y = 1 + Math.sin(t * 2.1) * 0.008 * (1 - run)
    head.current.rotation.y = -up.rotation.y * 0.6
    head.current.rotation.x = -0.14 * run + 0.75 * tuck - 0.25 * cr
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
    r.rotation.x = 0
    pivot.current.rotation.x = p.roll > 0 ? p.roll * Math.PI * 2 : p.roll < 0 ? p.roll * Math.PI : 0
    // a forward lean from the ankles that grows with speed, plus a small bob
    body.current.rotation.x = 0.13 * run * (1 - tuck)
    r.position.y = (p.roll > 0 ? -0.12 * tuck * sc : Math.abs(Math.sin(p.phase)) * 0.07 * run) - 0.23 * cr * sc
    r.rotation.y = p.spin > 0 ? -p.spin * Math.PI * 2 : 0
    body.current.rotation.z = p.hurt * 0.3 * Math.sin(t * 40)

    // blade glow and charge
    // steel stays steel; it picks up a glow of the form's colour as it charges, and flashes on a swing
    bladeMat.emissiveIntensity = 1.1 + p.charge * (0.9 + Math.sin(t * 18) * 0.15) + (p.swing !== 0 || p.spin > 0 ? 0.35 : 0)
    if (sparkle.current) { sparkle.current.visible = p.charge >= 1; sparkle.current.rotation.z = t * 6; sparkle.current.scale.setScalar(0.8 + Math.sin(t * 20) * 0.3) }
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
        {/* rolls turn around the middle of the body, not the feet */}
        <group ref={pivot} position={[0, 0.92, 0.18]}>
        <group position={[0, -0.92, -0.18]}>
        <group ref={legL} position={[-0.11, 0.86, 0]}>{P('thighL', true)}<group ref={kneeL} position={[0, -0.4, 0]}>{P('shinL', true)}</group></group>
        <group ref={legR} position={[0.11, 0.86, 0]}>{P('thighR', true)}<group ref={kneeR} position={[0, -0.4, 0]}>{P('shinR', true)}</group></group>
        {/* hips, belt with the glowing buckle, tassets */}
        {P('hips', true)}
        {/* coat panels hang from the belt */}
        {PANELS.map(([x, z, f], i) => (
          <group key={i} ref={(g) => (panels.current[i] = g)} position={[x, 0.92, z]} rotation={[0, x < 0 ? 0.12 * f : -0.12 * f, 0]}>{P('panel' + i, true)}</group>
        ))}
        <group ref={upper} position={[0, 0.95, 0]}>
          <group position={[0, -0.95, 0]}>
            {/* torso, chevron chest plate, collar and the node network (its four socket glows live here) */}
            {P('torso', true)}
            {NODES.map((n, i) => (
              <group key={i}>
                <mesh position={[n[0], n[1], n[2] + 0.01]} material={nodeMats[i]}><sphereGeometry args={[0.018, 12, 10]} /></mesh>
                <mesh ref={(m) => (atomRefs.current[i] = m)} visible={false}><sphereGeometry args={[0.07, 16, 12]} /><meshStandardMaterial color="#fff" roughness={0.35} emissive="#223" /></mesh>
              </group>
            ))}
            <group ref={head} position={[0, 1.63, 0]}>
              {P('head', true)}
              <group ref={eyes} position={[0, 0.152, 0]}>{P('eyes')}</group>
              <group ref={hair} position={[0, 0.15, 0]}>{P('hair')}</group>
            </group>
            <group ref={armL} position={[-0.285, 1.46, 0]}>
              {P('upperArmL', true)}
              <group ref={elbowL} position={[0, -0.27, 0]}>
                {P('forearmL', true)}
                {/* the shield on the outside of the left forearm */}
                <group ref={shieldTwist}><group position={[-0.12, -0.22, 0.03]} rotation={[0, 0, Math.PI / 2]}>{P('shield', true)}</group></group>
              </group>
            </group>
            <group ref={armR} position={[0.285, 1.46, 0]}>
              {P('upperArmR', true)}
              <group ref={elbowR} position={[0, -0.27, 0]}>
                {P('forearmR', true)}
                {/* the sword in the right gauntlet, pointing forward */}
                <group ref={wrist} position={[0, -0.29, 0.03]}><group rotation={[Math.PI / 2, 0, 0]}>
                  {P('hilt')}
                  <group ref={blade} position={[0, 0.07, 0]}>
                    {P('blade', true)}
                    {/* a glint at the tip when the spin attack is charged */}
                    <group ref={sparkle} position={[0, 1.0, 0]} visible={false}>
                      {[0, 1].map((k) => <mesh key={k} rotation={[0, 0, k * Math.PI / 2]} material={M.glow}><boxGeometry args={[0.012, 0.11, 0.004]} /></mesh>)}
                    </group>
                  </group>
                </group></group>
              </group>
            </group>
          </group>
        </group>
        </group>
        </group>
      </group>
      {/* which hybrid form Kai is in, above his head */}
      {hasCrystal && (
        <group ref={tag} position={[0, 2.24, 0]} visible={!busyTag}>
          <Html center distanceFactor={5} zIndexRange={[10, 0]} style={{ pointerEvents: 'none', display: busyTag ? 'none' : 'block' }}>
            <div key={stance} className="formtag" style={{ color: form.glow, borderColor: form.glow, boxShadow: `0 0 12px ${form.glow}55` }}>
              <b>{form.label}</b><span>{form.detail}</span>
            </div>
          </Html>
        </group>
      )}
      {/* slash trail */}
      <mesh ref={trail} position={[0, 1.05, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.6, 1.55, 32, 1, 0, Math.PI * 1.25]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default KaiModel
