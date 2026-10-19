import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * Emmy Boundary — procedural figure modeled on assets/characters/emmy-boundary.png:
 * a long blue-and-indigo patchwork coat of triangles with gold seams and a high collar,
 * brass shoulder plates and gauntlets, a tool belt with pouches, dark teal trousers,
 * brown boots, a cloud of silver curls, round amber goggles and gold hoops, and the
 * glowing triangle (her maker's mark) she conjures above her palm.
 *
 * `script(t)` → { pos:[x,y,z], rotY, walk, gesture, bow, talk }
 *   walk:    0 standing … 1 walking
 *   gesture: 0 hands at rest … 1 palm raised with the glowing triangle
 *   bow:     0 … 1 head lowered (the confession)
 *   talk:    0 … 1 a small speaking nod
 */

const SKIN = '#6b4430'
const BRASS = { color: '#b88a3a', metalness: 0.85, roughness: 0.3, emissive: '#3a2408', emissiveIntensity: 0.25 }

/** The coat's patchwork: triangles in blue, indigo and a little teal, stitched in gold. */
function usePatchwork() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')
    const cols = ['#2f3a96', '#3b2f86', '#25307a', '#2c6f86', '#3d48a8', '#28286a']
    const n = 6
    const w = 256 / n
    let seed = 3
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = i * w
        const y = j * w
        const tris = [
          [[x, y], [x + w, y], [x, y + w]],
          [[x + w, y], [x + w, y + w], [x, y + w]],
        ]
        for (const t of tris) {
          g.fillStyle = cols[Math.floor(rnd() * cols.length)]
          g.beginPath()
          g.moveTo(...t[0])
          g.lineTo(...t[1])
          g.lineTo(...t[2])
          g.closePath()
          g.fill()
          g.strokeStyle = '#a8803a'
          g.lineWidth = 1.5
          g.stroke()
        }
      }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 2)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

export default function Emmy({ script }) {
  const root = useRef()
  const hips = useRef()
  const torso = useRef()
  const head = useRef()
  const legL = useRef()
  const legR = useRef()
  const armL = useRef()
  const armR = useRef()
  const foreL = useRef()
  const mark = useRef()
  const cur = useRef({ walk: 0, gesture: 0, bow: 0 })
  const patch = usePatchwork()

  const coatGeo = useMemo(() => {
    // the long coat: a lathe from the shoulders flaring to below the knees, open at the front
    const prof = [
      [0.4, 0.0],
      [0.36, 0.18],
      [0.3, 0.42],
      [0.26, 0.62],
      [0.24, 0.78],
      [0.25, 0.92],
      [0.22, 1.02],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    const g = new THREE.LatheGeometry(prof, 40, 0.35, Math.PI * 2 - 0.7) // open front
    g.computeVertexNormals()
    return g
  }, [])
  const curls = useMemo(() => {
    const out = []
    let seed = 11
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 150; i++) {
      const th = rnd() * Math.PI * 0.62
      const ph = rnd() * Math.PI * 2
      const back = Math.cos(ph) < -0.2 ? 1.12 : 1 // fuller at the back, clear of the face
      if (Math.cos(ph) > 0.55 && th > 0.75) continue
      const r = 0.2 * back
      out.push({ p: [r * Math.sin(th) * Math.sin(ph), 0.05 + r * Math.cos(th), r * Math.sin(th) * Math.cos(ph) - 0.02], s: 0.04 + rnd() * 0.028, c: rnd() })
    }
    return out
  }, [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = script(t)
    const c = cur.current
    const k = Math.min(1, dt * 6)
    c.walk += ((s.walk || 0) - c.walk) * k
    c.gesture += ((s.gesture || 0) - c.gesture) * Math.min(1, dt * 4)
    c.bow += ((s.bow || 0) - c.bow) * Math.min(1, dt * 3)
    root.current.position.set(...s.pos)
    root.current.rotation.y = s.rotY || 0
    const step = Math.sin(t * 7.5) * c.walk
    legL.current.rotation.x = step * 0.5
    legR.current.rotation.x = -step * 0.5
    hips.current.position.y = 0.82 + Math.abs(Math.cos(t * 7.5)) * 0.03 * c.walk
    torso.current.rotation.x = 0.04 + c.bow * 0.12
    head.current.rotation.x = c.bow * 0.45 - (s.talk || 0) * Math.max(0, Math.sin(t * 9)) * 0.06
    head.current.rotation.y = Math.sin(t * 0.6) * 0.12 * (1 - c.bow)
    // left hand on her hip, right palm raised for the mark (or swinging when she walks)
    armL.current.rotation.z = 0.55 - c.gesture * 0.1
    armL.current.rotation.x = -step * 0.3
    foreL.current.rotation.x = -1.2
    armR.current.rotation.x = -c.gesture * 1.1 + step * 0.3
    armR.current.rotation.z = -0.25 - c.gesture * 0.2
    mark.current.visible = c.gesture > 0.4
    mark.current.position.y = 0.55 + Math.sin(t * 2) * 0.03
    mark.current.rotation.y = t * 1.4
    mark.current.scale.setScalar(Math.max(0.01, (c.gesture - 0.4) / 0.6))
  })

  const coatMat = <meshStandardMaterial map={patch} roughness={0.75} side={THREE.DoubleSide} />
  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.82, 0]}>
        {/* legs: dark teal trousers into brown boots */}
        {[
          [legL, -0.1],
          [legR, 0.1],
        ].map(([ref, x]) => (
          <group key={x} ref={ref} position={[x, 0, 0]}>
            <mesh position={[0, -0.28, 0]}>
              <cylinderGeometry args={[0.07, 0.06, 0.5, 10]} />
              <meshStandardMaterial color="#1f4a4f" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.66, 0.02]}>
              <cylinderGeometry args={[0.075, 0.08, 0.32, 10]} />
              <meshStandardMaterial color="#4a2e1c" roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.8, 0.06]} scale={[1, 0.5, 1.6]}>
              <sphereGeometry args={[0.08, 10, 8]} />
              <meshStandardMaterial color="#3b2416" roughness={0.6} />
            </mesh>
          </group>
        ))}
        <group ref={torso}>
          {/* the coat, hanging from the shoulders */}
          <mesh geometry={coatGeo} position={[0, -0.6, 0]}>
            {coatMat}
          </mesh>
          {/* inner tunic, collar, gold seams */}
          <mesh position={[0, 0.22, 0.02]} scale={[1, 1, 0.75]}>
            <cylinderGeometry args={[0.17, 0.2, 0.5, 14]} />
            <meshStandardMaterial color="#1e5a5e" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.5, -0.02]} rotation={[0.2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.2, 0.14, 16, 1, true, -2.3, 4.6]} />
            <meshStandardMaterial color="#2c6f86" roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
          {/* the tool belt */}
          <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]}>
            <torusGeometry args={[0.23, 0.025, 6, 24]} />
            <meshStandardMaterial color="#5a3820" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.0, 0.2]}>
            <boxGeometry args={[0.07, 0.05, 0.02]} />
            <meshStandardMaterial color="#a9aab3" metalness={0.9} roughness={0.3} />
          </mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.2, -0.08, 0.12]} rotation={[0, sd * 0.6, 0]}>
              <boxGeometry args={[0.1, 0.12, 0.06]} />
              <meshStandardMaterial color="#6b4428" roughness={0.6} />
            </mesh>
          ))}
          {/* shoulders: brass plates */}
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 0.22, 0.44, 0]} scale={[1, 0.6, 1]}>
              <sphereGeometry args={[0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial {...BRASS} />
            </mesh>
          ))}
          {/* arms: coat sleeves, brass gauntlets */}
          <group ref={armL} position={[-0.25, 0.42, 0]}>
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.055, 0.06, 0.3, 10]} />
              {coatMat}
            </mesh>
            <group ref={foreL} position={[0, -0.3, 0]}>
              <mesh position={[0, -0.12, 0]}>
                <cylinderGeometry args={[0.05, 0.06, 0.24, 10]} />
                <meshStandardMaterial {...BRASS} />
              </mesh>
              <mesh position={[0, -0.27, 0]} scale={[1, 1.1, 0.7]}>
                <sphereGeometry args={[0.05, 10, 8]} />
                <meshStandardMaterial {...BRASS} />
              </mesh>
            </group>
          </group>
          <group ref={armR} position={[0.25, 0.42, 0]}>
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.055, 0.06, 0.3, 10]} />
              {coatMat}
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <cylinderGeometry args={[0.05, 0.06, 0.24, 10]} />
              <meshStandardMaterial {...BRASS} />
            </mesh>
            <mesh position={[0, -0.57, 0]} scale={[1, 1.1, 0.7]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <meshStandardMaterial {...BRASS} />
            </mesh>
            {/* her maker's mark, above the raised palm */}
            <group ref={mark} position={[0, -0.6, 0.0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.09, 0.012, 3, 3]} />
                <meshBasicMaterial color="#ffd27a" toneMapped={false} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.085, 3]} />
                <meshBasicMaterial color="#7fe8dc" transparent opacity={0.55} toneMapped={false} side={THREE.DoubleSide} />
              </mesh>
            </group>
          </group>
          {/* neck and head */}
          <mesh position={[0, 0.56, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.1, 10]} />
            <meshStandardMaterial color={SKIN} roughness={0.6} />
          </mesh>
          <group ref={head} position={[0, 0.72, 0]}>
            <mesh scale={[0.95, 1.05, 0.95]}>
              <sphereGeometry args={[0.13, 20, 16]} />
              <meshStandardMaterial color={SKIN} roughness={0.55} />
            </mesh>
            {/* silver curls */}
            {curls.map((cl, i) => (
              <mesh key={i} position={cl.p} scale={cl.s}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color={cl.c > 0.5 ? '#c9ccd4' : '#9da1ad'} roughness={0.9} />
              </mesh>
            ))}
            {/* amber goggles */}
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.055, 0.02, 0.115]}>
                <mesh>
                  <torusGeometry args={[0.038, 0.011, 8, 18]} />
                  <meshStandardMaterial {...BRASS} />
                </mesh>
                <mesh>
                  <circleGeometry args={[0.033, 18]} />
                  <meshBasicMaterial color="#ffb347" toneMapped={false} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, 0.02, 0.118]}>
              <boxGeometry args={[0.03, 0.01, 0.01]} />
              <meshStandardMaterial {...BRASS} />
            </mesh>
            {/* gold hoops and a smile */}
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.125, -0.05, 0.0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.02, 0.005, 6, 14]} />
                <meshStandardMaterial {...BRASS} />
              </mesh>
            ))}
            <mesh position={[0, -0.065, 0.118]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.025, 0.005, 4, 10, Math.PI]} />
              <meshBasicMaterial color="#3a1a10" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}
