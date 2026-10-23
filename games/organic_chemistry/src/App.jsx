import { Component, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { getState, setState, useGame, resetSave, saveGame, toast } from './engine/store'
import { MOLECULES } from './data/molecules'
import { initInput, releaseMouse, wasIntentionalRelease, captureMouse } from './engine/input'
import Intro, { IntroScene } from './scenes/Intro'
import Village from './scenes/Village'
import Caverns from './scenes/Caverns'
import HUD, { Fade } from './ui/HUD'
import ItemMenu from './ui/ItemMenu'
import Dialogue from './ui/Dialogue'
import Panels from './ui/Panels'
import LevelSelect from './ui/LevelSelect'
import { MiniMap, FullMap } from './ui/MapView'
import { playMusic, stopMusic, sfx } from './audio/sfx'

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
        <p className="credit">Based on <i>Organic Chemistry: A Tenth Edition</i>, Chapter 1 — John McMurry, OpenStax (CC BY-NC-SA 4.0). Best with keyboard + mouse or a gamepad.</p>
      </div>
      {picking && <LevelSelect onGo={(it) => { setPicking(false); onLevel(it) }} onClose={() => setPicking(false)} />}
    </div>
  )
}

function Credits({ onTitle, onKeep }) {
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
        <p className="small">Next: the road to Carbon Castle and the Tide Temple (Chapter 2) — coming soon.</p>
        <div className="title-buttons">
          <button className="primary" onClick={onKeep}>Keep exploring the caverns</button>
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
      const playing = s.screen === 'village' || s.screen === 'caverns'
      if (playing && !s.dialogue && !s.panel && !s.paused && !s.mapOpen) captureMouse(el)
    }
    const inGame = (s) => s.screen === 'village' || s.screen === 'caverns'
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
    const key = (e) => {
      const s = getState()
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (e.code === 'Escape' && performance.now() - lastUnlock < 400) return // already handled as the mouse release
        if (s.mapOpen) { setState({ mapOpen: false }); return }
        if (s.paused) { setState({ paused: false }); captureMouse(el) }
        else openMenu(s)
      }
      if (e.code === 'KeyM' && inGame(s) && !s.panel && !s.paused) setState({ mapOpen: !s.mapOpen })
    }
    el.addEventListener('click', click)
    window.addEventListener('keydown', key)
    document.addEventListener('pointerlockchange', lockChange)
    return () => { off(); el.removeEventListener('click', click); window.removeEventListener('keydown', key); document.removeEventListener('pointerlockchange', lockChange) }
  }, [])
  useEffect(() => { if (screen !== 'village' && screen !== 'caverns') releaseMouse() }, [screen])

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
    if (logged.current && (screen === 'village' || screen === 'caverns')) {
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
    go(s.checkpoint && s.checkpoint.scene === 'caverns' ? 'caverns' : 'village')
  }
  const playing = screen === 'village' || screen === 'caverns'
  const show3d = screen === 'intro' || playing
  return (
    <div className="app">
      <div ref={wrap} className="screen" style={{ visibility: show3d ? 'visible' : 'hidden' }}>
        <SceneGuard onReset={() => go('title')}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 50, near: 0.1, far: 300, position: [0, 4, 16] }} gl={{ antialias: true, powerPreference: 'high-performance' }} frameloop={show3d && !mapOpen && !paused ? 'always' : 'never'}>
          {screen === 'intro' && <IntroScene />}
          {screen === 'village' && <Village key={sceneKey} onExit={(to) => { saveGame({ checkpoint: { scene: 'caverns', room: 'entrance' } }); go(to) }} />}
          {screen === 'caverns' && <Caverns key={sceneKey} onExit={(to) => go(to)} />}
        </Canvas>
        </SceneGuard>
      </div>
      {screen === 'title' && <Title onNew={onNew} onContinue={onContinue} onLevel={onLevel} />}
      {screen === 'intro' && <Intro onDone={() => { saveGame({ introSeen: true }); go('village') }} />}
      {screen === 'credits' && <Credits onTitle={() => go('title')} onKeep={() => go('caverns')} />}
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
