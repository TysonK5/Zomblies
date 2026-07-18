import { useEffect } from 'react'
import {
  ACTION_LABELS,
  ACTION_ORDER,
  beginRebind,
  cancelRebind,
  commitRebind,
  formatKeyCode,
  mouseButtonCode,
  resetKeybindings,
  type InputAction,
} from '../game/keybindings'
import { useKeybindings } from '../game/useKeybindings'

/**
 * Click a binding → press a key or mouse button to reassign.
 * Escape cancels. Conflicting binds swap automatically.
 */
export function KeybindSettings() {
  const { bindings, listening } = useKeybindings()

  useEffect(() => {
    if (!listening) return

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape') {
        cancelRebind()
        return
      }
      commitRebind(e.code, listening)
    }

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      commitRebind(mouseButtonCode(e.button), listening)
    }

    // Capture phase so we beat game handlers
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('mousedown', onMouseDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('mousedown', onMouseDown, true)
    }
  }, [listening])

  const onRowClick = (action: InputAction) => {
    if (listening === action) {
      cancelRebind()
      return
    }
    beginRebind(action)
  }

  return (
    <div className="keybind-section">
      <div className="settings-title keybind-title">
        <span>Keybinds</span>
        <button type="button" className="settings-reset" onClick={() => resetKeybindings()}>
          Reset keys
        </button>
      </div>

      <div className="keybind-list">
        {ACTION_ORDER.map((action) => {
          const active = listening === action
          return (
            <button
              key={action}
              type="button"
              className={`keybind-row${active ? ' listening' : ''}`}
              onClick={() => onRowClick(action)}
            >
              <span className="keybind-label">{ACTION_LABELS[action]}</span>
              <span className="keybind-key">
                {active ? 'Press key…' : formatKeyCode(bindings[action])}
              </span>
            </button>
          )
        })}
      </div>

      <p className="settings-note">
        Click a row, then press a key or mouse button. Escape cancels. Conflicts swap. Saved in this
        browser.
      </p>
    </div>
  )
}
