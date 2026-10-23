import { LEVELS } from '../data/levels'

// Title-screen level select, like Winding World's: groups fold open into their entries.
// Picking one replaces the saved game with that point's save.
export default function LevelSelect({ onGo, onClose }) {
  return (
    <div className="level-select" role="dialog" aria-label="Level select" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ls-card">
        <div className="ls-head">
          <h2>Level select</h2>
          <button type="button" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="ls-note">Jump to any point. This replaces your saved progress.</p>
        {LEVELS.map((g) => (
          g.items.length === 1
            ? <button key={g.group} type="button" className="ls-item ls-solo" onClick={() => onGo(g.items[0])}>{g.group}</button>
            : (
              <details key={g.group} className="ls-group" open={g.group.startsWith('World')}>
                <summary>{g.group}</summary>
                <div className="ls-items">
                  {g.items.map((it) => <button key={it.label} type="button" className="ls-item" onClick={() => onGo(it)}>{it.label}</button>)}
                </div>
              </details>
            )
        ))}
      </div>
    </div>
  )
}
