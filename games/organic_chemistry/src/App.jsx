import { Component, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { getState, setState, useGame, resetSave, saveGame, toast } from './engine/store'
import { MOLECULES } from './data/molecules'
import { initInput, releaseMouse, wasIntentionalRelease, captureMouse } from './engine/input'
import Intro, { IntroScene } from './scenes/Intro'
import Village from './scenes/Village'
import Caverns from './scenes/Caverns'
import Field from './scenes/Field'
import Coast from './scenes/Coast'
import Temple from './scenes/Temple'
import Forest from './scenes/Forest'
import Labyrinth from './scenes/Labyrinth'
import HUD, { Fade } from './ui/HUD'
import ItemMenu from './ui/ItemMenu'
import Dialogue from './ui/Dialogue'
import Panels from './ui/Panels'
import LevelSelect from './ui/LevelSelect'
import { MiniMap, FullMap } from './ui/MapView'
import { playMusic, stopMusic, sfx } from './audio/sfx'

// screens with Kai walking around in them
const GAME = ['village', 'caverns', 'field', 'coast', 'temple', 'forest', 'labyrinth']
const inGameScreen = (sc) => GAME.includes(sc)

// If a 3D scene throws, show a way back instead of a black screen.
class SceneGuard extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error('[valence] scene crashed', err) }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="credits"><div className="cbox">
        <h1>The cave shook…</h1>
        <p>Something went wrong in this scene. Your progress is saved at the last checkpoint.</p>
        <div className="title-buttons"><button className="primary" onClick={() => { this.setState({ err: null }); this.props.onReset() }}>Back to title</button></div>
      </div></div>
    )
  }
}

function Title({ onNew, onContinue, onLevel }) {
  const save = useGame((s) => s.save)
  const [picking, setPicking] = useState(false)
  const canContinue = save.introSeen
  return (
    <div className="title" style={{ backgroundImage: 'url(art/cover.png)' }}>
      <div className="title-shade" />
      <div className="title-inner">
        <p className="eyebrow">Arcade of Alexandria</p>
        <h1>The Legend of Valence</h1>
        <p className="tag">Four bonds. One kingdom. Every reaction has a mechanism.</p>
        <div className="title-buttons">
          {canContinue && <button className="primary" onClick={onContinue}>Continue</button>}
          <button className={canContinue ? '' : 'primary'} onClick={onNew}>{canContinue ? 'New game' : 'Start'}</button>
          <button className="ghost" onClick={() => setPicking(true)} title="Jump to any level">Level select</button>
        </div>
        <p className="credit">Based on <i>Organic Chemistry: A Tenth Edition</i>, Chapters 1–3 — John McMurry, OpenStax (CC BY-NC-SA 4.0). Best with keyboard + mouse or a gamepad.</p>
      </div>
      {picking && <LevelSelect onGo={(it) => { setPicking(false); onLevel(it) }} onClose={() => setPicking(false)} />}
    </div>
  )
}

function Credits({ onTitle, onKeep, onOn }) {
  return (
    <div className="credits">
      <div className="cbox">
        <h1>Bond Shard 1 of 12</h1>
        <p>You cleared <b>The Orbital Caverns</b> — Chapter 1, <i>Structure and Bonding</i>.</p>
        <ul>
          <li>Atoms: protons set the element (Z); isotopes differ only in neutrons (§1.1)</li>
          <li>Electron configurations: Aufbau, Pauli, Hund (§1.3)</li>
          <li>Bonds needed for an octet: H 1, C 4, N 3, O 2; bond length at the energy minimum (§1.4–1.5)</li>
          <li>Hybrid orbitals: sp³ 109.5°, sp² 120° + π, sp 180° + 2π (§1.6–1.10)</li>
          <li>Skeletal structures: carbons at corners, hydrogens implied (§1.12)</li>
        </ul>
        <p className="small">Next: the east road out of Hydrogen Village, across the Valence Fields to the Tide Coast (Chapter 2).</p>
        <div className="title-buttons">
          <button className="primary" onClick={onOn}>Continue the journey</button>
          <button onClick={onKeep}>Keep exploring the caverns</button>
          <button onClick={onTitle}>Back to title</button>
        </div>
      </div>
    </div>
  )
}

function Credits2({ onTitle, onKeep, onOn }) {
  return (
    <div className="credits">
      <div className="cbox">
        <h1>Bond Shard 2 of 12</h1>
        <p>You cleared <b>The Tide Temple</b> — Chapter 2, <i>Polar Covalent Bonds; Acids and Bases</i>.</p>
        <ul>
          <li>Electronegativity: the more electronegative atom in a bond is δ− (§2.1)</li>
          <li>Dipole moments: bond dipoles add up in bent H₂O and NH₃, and cancel in linear CO₂ and symmetric CCl₄ (§2.2)</li>
          <li>Formal charge = valence electrons − lone-pair electrons − bonds (§2.3)</li>
          <li>Resonance: the real molecule is the hybrid; only electrons move, never atoms (§2.4–2.6)</li>
          <li>Brønsted–Lowry acids and pKa: H⁺ goes from the stronger acid to the stronger base (§2.7–2.10)</li>
          <li>Lewis acids accept an electron pair (BF₃, Mg²⁺, H⁺); hydrogen bonds need H on O or N (§2.11–2.12)</li>
        </ul>
        <p className="small">Next: the forest road north-west of the Valence Fields, to the Chain Labyrinth (Chapter 3).</p>
        <div className="title-buttons">
          <button className="primary" onClick={onOn}>Continue the journey</button>
          <button onClick={onKeep}>Back to the Tide Coast</button>
          <button onClick={onTitle}>Back to title</button>
        </div>
      </div>
    </div>
  )
}

function Credits3({ onTitle, onKeep }) {
  return (
    <div className="credits">
      <div className="cbox">
        <h1>Bond Shard 3 of 12</h1>
        <p>You cleared <b>The Chain Labyrinth</b> — Chapter 3, <i>Organic Compounds: Alkanes and Their Stereochemistry</i>.</p>
        <ul>
          <li>Functional groups: same group, same behavior, whatever the size (§3.1)</li>
          <li>The first ten alkanes, methane to decane; constitutional isomers differ in connections, not drawings (§3.2)</li>
          <li>Carbons are 1°, 2°, 3° or 4° by how many carbons they bond to (§3.3)</li>
          <li>IUPAC names: longest chain, number from the end nearer the first branch, substituents alphabetical (§3.4)</li>
          <li>Conformations: staggered beats eclipsed (ethane 12 kJ/mol, propane 14) (§3.6)</li>
          <li>Butane: anti lowest; gauche +3.8 (steric strain); eclipsed +16 and +19 kJ/mol; the costs add up (§3.7)</li>
        </ul>
        <p className="small">Next: the Chair Fortress and Chapter 4 — coming soon.</p>
        <div className="title-buttons">
          <button className="primary" onClick={onKeep}>Back to the Chain Forest</button>
          <button onClick={onTitle}>Back to title</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const screen = useGame((s) => s.screen)
  const mapOpen = useGame((s) => s.mapOpen)
  const paused = useGame((s) => s.paused)
  const [sceneKey, setSceneKey] = useState(0)
  const wrap = useRef()

  // one input system + pointer lock for the whole app
  useEffect(() => {
    const el = wrap.current
    const off = initInput(el)
    const click = () => {
      const s = getState()
      const playing = inGameScreen(s.screen)
      if (playing && !s.dialogue && !s.panel && !s.paused && !s.mapOpen) captureMouse(el)
    }
    const inGame = (s) => inGameScreen(s.screen)
    // The item menu is the pause screen. Esc while the mouse is captured never reaches the page
    // (the browser spends it on releasing the mouse), so a release we didn't ask for opens the menu.
    let lastUnlock = 0
    const openMenu = (s) => { if (inGame(s) && !s.dialogue && !s.panel && !s.paused && !s.fade) setState({ paused: true, mapOpen: false }) }
    const lockChange = () => {
      if (document.pointerLockElement) return
      lastUnlock = performance.now()
      const s = getState()
      if (wasIntentionalRelease()) return
      if (s.mapOpen) { setState({ mapOpen: false }); return }
      openMenu(s)
    }
    let pendingUp = null // the one waiting Esc-keyup that takes the mouse back after a resume
    const dropUp = () => { if (pendingUp) { window.removeEventListener('keyup', pendingUp); pendingUp = null } }
    const key = (e) => {
      const s = getState()
      if ((e.code === 'KeyP' || e.code === 'Escape') && e.repeat) return // a held key must not flip the menu open and shut
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (e.code === 'Escape' && performance.now() - lastUnlock < 400) return // already handled as the mouse release
        if (s.mapOpen) { setState({ mapOpen: false }); return }
        // resume on this one press; take the mouse back only once Esc comes up, or the same press
        // would release it again and reopen the menu
        if (s.paused) {
          setState({ paused: false })
          if (e.code === 'Escape') {
            dropUp()
            pendingUp = (u) => {
              if (u.code !== 'Escape') return
              dropUp(); lastUnlock = 0
              const n = getState()
              if (!n.paused && !n.mapOpen && !n.dialogue && !n.panel) captureMouse(el)
            }
            window.addEventListener('keyup', pendingUp)
          } else captureMouse(el)
        }
        else openMenu(s)
      }
      if (e.code === 'KeyM' && inGame(s) && !s.panel && !s.paused) setState({ mapOpen: !s.mapOpen })
    }
    el.addEventListener('click', click)
    window.addEventListener('keydown', key)
    document.addEventListener('pointerlockchange', lockChange)
    return () => { dropUp(); off(); el.removeEventListener('click', click); window.removeEventListener('keydown', key); document.removeEventListener('pointerlockchange', lockChange) }
  }, [])
  useEffect(() => { if (!inGameScreen(screen)) releaseMouse() }, [screen])

  const go = (next) => {
    setState({ fade: 1 })
    setTimeout(() => {
      setState({ screen: next, fade: 0, prompt: null, dialogue: null, panel: null, lockTarget: null, bossHp: null, hp: getState().maxHp, paused: false, mapOpen: false, objective: '' })
      setSceneKey((k) => k + 1)
    }, 450)
  }

  useEffect(() => { if (screen === 'title') stopMusic() }, [screen])

  // a molecule met for the first time gets logged on the Gauntlet (Esc menu), with a toast
  const save = useGame((s) => s.save)
  const logged = useRef(null)
  useEffect(() => {
    const now = new Set(MOLECULES.filter((m) => { try { return !!m.unlocked(save) } catch { return false } }).map((m) => m.id))
    if (logged.current && inGameScreen(screen)) {
      const fresh = MOLECULES.filter((m) => now.has(m.id) && !logged.current.has(m.id))
      if (fresh.length) setTimeout(() => toast(`Logged in your Molecule Gauntlet: ${fresh.map((m) => `${m.name} (${m.formula})`).join(', ')} — press Esc to see it`, 'good', 4200), 1800)
    }
    logged.current = now
  }, [save, screen])

  const onNew = () => { resetSave(); sfx('lock'); go('intro') }
  // level select: load that point's save, then open its scene
  const onLevel = (it) => { resetSave(); saveGame(it.save); sfx('lock'); go(it.screen) }
  const onContinue = () => {
    const s = getState().save
    sfx('lock')
    go(s.checkpoint && inGameScreen(s.checkpoint.scene) ? s.checkpoint.scene : 'village')
  }
  const playing = inGameScreen(screen)
  // leaving a scene: remember where to come back in, then fade to the next one
  const exitTo = (to, cp) => { if (cp) saveGame({ checkpoint: cp }); go(to) }
  const show3d = screen === 'intro' || playing
  return (
    <div className="app">
      <div ref={wrap} className="screen" style={{ visibility: show3d ? 'visible' : 'hidden' }}>
        <SceneGuard onReset={() => go('title')}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 50, near: 0.1, far: 300, position: [0, 4, 16] }} gl={{ antialias: true, powerPreference: 'high-performance' }} frameloop={show3d && !mapOpen && !paused ? 'always' : 'never'}>
          {screen === 'intro' && <IntroScene />}
          {screen === 'village' && <Village key={sceneKey} onExit={(to, cp) => exitTo(to, cp || { scene: 'caverns', room: 'entrance' })} />}
          {screen === 'caverns' && <Caverns key={sceneKey} onExit={(to) => go(to)} />}
          {screen === 'field' && <Field key={sceneKey} onExit={exitTo} />}
          {screen === 'coast' && <Coast key={sceneKey} onExit={exitTo} />}
          {screen === 'temple' && <Temple key={sceneKey} onExit={exitTo} />}
          {screen === 'forest' && <Forest key={sceneKey} onExit={exitTo} />}
          {screen === 'labyrinth' && <Labyrinth key={sceneKey} onExit={exitTo} />}
        </Canvas>
        </SceneGuard>
      </div>
      {screen === 'title' && <Title onNew={onNew} onContinue={onContinue} onLevel={onLevel} />}
      {screen === 'intro' && <Intro onDone={() => { saveGame({ introSeen: true }); go('village') }} />}
      {screen === 'credits' && <Credits onTitle={() => go('title')} onKeep={() => go('caverns')} onOn={() => exitTo('village', { scene: 'village' })} />}
      {screen === 'credits2' && <Credits2 onTitle={() => go('title')} onKeep={() => exitTo('coast', { scene: 'coast', at: 'dock' })} onOn={() => exitTo('field', { scene: 'field', at: 'coast' })} />}
      {screen === 'credits3' && <Credits3 onTitle={() => go('title')} onKeep={() => exitTo('forest', { scene: 'forest', at: 'gate' })} />}
      {playing && <HUD />}
      {playing && <Panels />}
      {playing && <MiniMap />}
      {playing && <FullMap />}
      <Dialogue />
      {playing && <ItemMenu onTitle={() => go('title')} onResume={() => captureMouse(wrap.current)} />}
      <Fade />
    </div>
  )
}
