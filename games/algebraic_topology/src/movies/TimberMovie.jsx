import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import Emmy from '../characters/Emmy'
import Gyroid from '../characters/Gyroid'
import { LoopBiterSpawn } from '../characters/Spawn'
import { PETAL_SIZE, petalAngles } from '../levels/w0/graphs'
import { DevAdvance } from '../levels/w0/OverworldScene'
import { Deck, GraphView, Throne, Yard } from '../levels/w0/TimberScene'
import { CausewaySlab } from '../world/ReefScenery'
import layout from '../world/timberyard.json'
import { buildSites } from '../world/sites'

/**
 * Intro movie for World 0 · Level 6, "Timber Yard" (videos.json level-0-6-intro):
 *   A 0–7    over the tangle of decks and walkways; the unbuilt bridge; the black spire
 *   B 7–15   on the Thicket: Emmy lights a tree amber, and it folds into a bouquet
 *   C 15–22  a Loop-biter chews a petal down; a hole winks out
 *   D 22–29  Emmy counts on her glove and points across to the Throne
 *   E 29–34  Gyroid steps in, Lash ready; title card
 */

const S = 0.7
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))
const smooth = (x) => x * x * (3 - 2 * x)
const mix = (a, b, k) => a + (b - a) * k
const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]

const SITES = buildSites(layout)
const THICKET = SITES.find((s) => s.id === 'spanning_tree')
const G = THICKET.graphs[0]
const [TX, TZ] = THICKET.pos
const TREE = [0, 1, 2, 3]
const MARK_AT = [8.2, 9.0, 9.8, 10.6]
const ANG = petalAngles(G, 3)
const ROOT = G.nodes[G.root]
const BITE = 1 // the petal that gets chewed
const BITE_AT = [TX + ROOT[0] + Math.cos(ANG[BITE]) * PETAL_SIZE, TZ + ROOT[1] + Math.sin(ANG[BITE]) * PETAL_SIZE]

const SHOTS = [
  [0, 7, [[10, 10, 26], [0, 0, 2]], [[-1, 8, 15], [-6, 0, -8]]],
  [7, 15, [[TX + 0.5, 7.2, TZ + 8.2], [TX, 0, TZ + 0.2]], [[TX - 0.6, 6.4, TZ + 7.4], [TX, 0, TZ]]],
  [15, 22, [[BITE_AT[0] + 2.6, 2.4, BITE_AT[1] + 3.2], [BITE_AT[0], 0.3, BITE_AT[1]]], [[BITE_AT[0] + 2.0, 2.0, BITE_AT[1] + 2.6], [BITE_AT[0], 0.3, BITE_AT[1]]]],
  [22, 29, [[TX - 2.4, 1.9, TZ + 6.6], [TX - 3.9, 1.2, TZ + 3.4]], [[TX - 1.4, 2.6, TZ + 7.6], [TX + 6, 3, TZ - 30]]],
  [29, 40, [[TX - 2.6, 2.6, TZ + 8.6], [TX + 1, 0.6, TZ - 2]], [[TX - 1.6, 4.4, TZ + 10], [TX + 6, 2, TZ - 30]]],
]
function MovieCamera({ tRef }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = tRef.current
    const [a, b, from, to] = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1]
    const k = smooth(seg(t, a, b))
    camera.position.set(...mix3(from[0], to[0], k))
    look.set(...mix3(from[1], to[1], k))
    camera.lookAt(look)
  })
  return null
}

function useStage(tRef, fn) {
  const [stage, setStage] = useState(() => fn(tRef.current))
  const last = useRef(JSON.stringify(stage))
  useFrame(() => {
    const s = fn(tRef.current)
    const k = JSON.stringify(s)
    if (k !== last.current) {
      last.current = k
      setStage(s)
    }
  })
  return stage
}

export default function TimberMovie({ tRef }) {
  const kFell = useRef(0)
  const stage = useStage(tRef, (t) => ({ marked: TREE.filter((_, i) => t >= MARK_AT[i]), felled: t >= 12, bitten: t >= 19.2 ? [BITE] : [] }))
  const biter = useMemo(() => ({ x: BITE_AT[0] + 3, z: BITE_AT[1] + 2, seed: 0.4, alive: true, dying: 0, face: 0, flash: 0, beam: 0, type: 'biter' }), [])
  const holeFlash = useRef()
  useFrame(() => {
    const t = tRef.current
    kFell.current = seg(t, 12.4, 14.8)
    // C: the biter scuttles in and chews
    const k = smooth(seg(t, 15, 16.6))
    biter.x = mix(BITE_AT[0] + 3, BITE_AT[0] + 0.25, k)
    biter.z = mix(BITE_AT[1] + 2, BITE_AT[1] + 0.2, k)
    biter.face = Math.atan2(BITE_AT[0] - biter.x, BITE_AT[1] - biter.z)
    biter.beam = t > 16.8 && t < 19.2 ? 2.2 * (1 - seg(t, 16.8, 19.2)) + 0.01 : 0
    biter.alive = t >= 14.8 && t < 22.5
    holeFlash.current.intensity = t > 19.2 && t < 20.4 ? 30 * (1 - seg(t, 19.2, 20.4)) : 0
  })
  const emmyScript = () => {
    const t = tRef.current
    return {
      pos: [(TX - 3.9) / S, 0, (TZ + 3.4) / S],
      rotY: t > 26.6 ? 2.6 : 0.7,
      walk: 0,
      bow: 0,
      gesture: (t > 7.2 && t < 15) || t > 22.4 ? 0.9 : 0,
      talk: (t > 7.2 && t < 15) || (t > 19.8 && t < 22) || (t > 22.4 && t < 29.8) ? 1 : 0,
    }
  }
  const gyroScript = () => {
    const t = tRef.current
    const k = smooth(seg(t, 29.2, 31))
    return { pos: [mix(TX - 2.6, TX - 1.2, k) / S, 0, mix(TZ + 4.4, TZ + 3, k) / S], rotY: t > 15.4 && t < 22 ? 2.5 : Math.PI - 0.3, run: k > 0 && k < 1 ? 0.6 : 0, cast: t > 29.5 ? 0.6 : 0, whip: 0, loop: 0, loopDrop: 0 }
  }
  return (
    <>
      <Yard />
      {layout.causeways.map((c, i) => (
        <CausewaySlab key={i} a={c.a} b={c.b} width={layout.causewayWidth} />
      ))}
      {SITES.filter((s) => s.stage === 'station').map((s) => (
        <group key={s.id}>
          <Deck site={s} current={s.id === 'spanning_tree'} />
          {s.id !== 'spanning_tree' &&
            s.graphs.slice(s.id === 'one_edge' ? 1 : 0).map((g, i) => {
              const off = g.offset || [0, 0]
              return <GraphView key={i} graph={g} origin={[s.pos[0] + off[0], s.pos[1] + off[1]]} marked={[]} tree={null} fellK={{ current: 0 }} bitten={[]} label={g.label} current={false} />
            })}
        </group>
      ))}
      <GraphView graph={G} origin={THICKET.pos} marked={stage.marked} tree={stage.felled ? TREE : null} fellK={kFell} bitten={stage.bitten} current />
      <pointLight ref={holeFlash} position={[BITE_AT[0], 1, BITE_AT[1]]} color="#b070ff" distance={6} intensity={0} />
      <LoopBiterSpawn e={biter} />
      {/* the unbuilt bridge: just its posts */}
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[layout.bridge.gate[0] + x, 1.1, layout.bridge.gate[1]]}>
          <boxGeometry args={[0.35, 2.6, 0.35]} />
          <meshStandardMaterial color="#3a2a1e" roughness={0.8} />
        </mesh>
      ))}
      <Throne at={layout.throne} />
      <group scale={S}>
        <Gyroid script={gyroScript} />
        <Emmy script={emmyScript} />
      </group>
      <MovieCamera tRef={tRef} />
      <DevAdvance />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.6} luminanceSmoothing={0.2} />
        <Vignette offset={0.3} darkness={0.7} />
      </EffectComposer>
    </>
  )
}
