import { useGame, setState } from '../engine/store'
import { ELEMENTS } from '../chem/rules'
import { STANCE } from '../engine/Player'
import { setMuted, isMuted } from '../audio/sfx'
import { useState } from 'react'

function Hearts({ hp, max }) {
  const hearts = []
  for (let i = 0; i < max / 2; i++) {
    const v = Math.max(0, Math.min(2, hp - i * 2))
    hearts.push(<span key={i} className={'heart ' + (v === 2 ? 'full' : v === 1 ? 'half' : 'empty')}>♥</span>)
  }
  return <div className="hearts">{hearts}</div>
}

export default function HUD({ scene }) {
  const s = useGame()
  const [showHelp, setShowHelp] = useState(false)
  const [mute, setMute] = useState(isMuted())
  return (
    <div className="hud">
      <div className="hud-tl">
        <Hearts hp={s.hp} max={s.maxHp} />
        <div className="sockets" title="Kai's four bond sockets">
          {[0, 1, 2, 3].map((i) => {
            const sym = s.sockets[i]
            return <span key={i} className={'sock ' + (sym ? 'full' : '')} style={sym ? { background: ELEMENTS[sym]?.color, color: sym === 'H' ? '#111' : '#fff' } : null}>{sym || ''}</span>
          })}
        </div>
        {s.save.hasCrystal && <div className={'stance st-' + s.stance}>{STANCE[s.stance].label} <span className="key">R</span></div>}
      </div>
      <div className="hud-tr">
        {s.objective && <div className="objective">{s.objective}</div>}
        <div className="hud-buttons">
          <button onClick={() => setShowHelp(!showHelp)}>Controls</button>
          <button onClick={() => { setMuted(!mute); setMute(!mute) }}>{mute ? 'Sound off' : 'Sound on'}</button>
          <button onClick={() => setState({ paused: true })}>Pause</button>
        </div>
        {s.save.shards > 0 && <div className="shards">Bond Shards {s.save.shards} / 12</div>}
      </div>
      {s.bossHp && (
        <div className="bossbar"><div className="bossname">{s.bossHp.name}</div><div className="bar"><div style={{ width: `${(100 * s.bossHp.hp) / s.bossHp.max}%` }} /></div></div>
      )}
      {s.prompt && !s.dialogue && !s.panel && <div className="prompt"><span className="key">E</span> {s.prompt}</div>}
      {s.lockTarget && !s.dialogue && <div className="locktip">Locked on · <span className="key">Space</span> + direction to sidestep / backhop · <span className="key">Tab</span> release</div>}
      {s.toast && <div className={'toast ' + s.toast.kind}>{s.toast.text}</div>}
      {showHelp && (
        <div className="help" onClick={() => setShowHelp(false)}>
          <h3>Controls</h3>
          <table><tbody>
            <tr><td>Move</td><td>WASD · left stick</td></tr>
            <tr><td>Camera</td><td>Click the game to capture the mouse, then move it · right stick · J/L</td></tr>
            <tr><td>Attack (3-hit combo)</td><td>Left click / F · X</td></tr>
            <tr><td>Spin attack</td><td>Hold attack, release</td></tr>
            <tr><td>Lock-on</td><td>Right click / Tab · LT</td></tr>
            <tr><td>Roll · sidestep · backhop</td><td>Space (+ direction while locked) · A</td></tr>
            <tr><td>Block</td><td>Shift · RB</td></tr>
            <tr><td>Interact / talk</td><td>E · A</td></tr>
            <tr><td>Hybrid stance (sp³ → sp² → sp)</td><td>R · Y</td></tr>
            <tr><td>sp dash (in sp stance)</td><td>Space</td></tr>
            <tr><td>Map (shows where to go next)</td><td>M</td></tr>
            <tr><td>Item menu · pause (items, notes, quest)</td><td>Esc / P</td></tr>
          </tbody></table>
          <p className="small">Click to close.</p>
        </div>
      )}
    </div>
  )
}

export function Fade() {
  const f = useGame((s) => s.fade)
  return <div className="fade" style={{ opacity: f }} />
}
