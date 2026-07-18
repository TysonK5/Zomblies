import type { TimeOfDay } from '../environment/timeOfDay'
import { ENVIRONMENT, TIME_ORDER } from '../environment/timeOfDay'
import { formatKeyCode, getBinding } from '../game/keybindings'
import { useKeybindings } from '../game/useKeybindings'

type Props = {
  value: TimeOfDay
  onChange: (t: TimeOfDay) => void
}

const ICONS: Record<TimeOfDay, string> = {
  day: '☀',
  twilight: '◐',
  night: '☾',
}

/**
 * HUD control for day / twilight / night.
 * Cycle hotkey comes from remappable keybindings.
 */
export function TimeOfDayToggle({ value, onChange }: Props) {
  useKeybindings()
  const cycleKey = formatKeyCode(getBinding('cycleTimeOfDay'))

  return (
    <div className="tod-panel" onClick={(e) => e.stopPropagation()}>
      <span className="tod-label">Sky</span>
      <div className="tod-buttons" role="group" aria-label="Time of day">
        {TIME_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            className={`tod-btn${value === t ? ' active' : ''}`}
            onClick={() => onChange(t)}
            title={`${ENVIRONMENT[t].label} (${cycleKey} to cycle)`}
            aria-pressed={value === t}
          >
            <span className="tod-icon" aria-hidden>
              {ICONS[t]}
            </span>
            <span className="tod-name">{ENVIRONMENT[t].label}</span>
          </button>
        ))}
      </div>
      <span className="tod-hint">
        <kbd>{cycleKey}</kbd> cycle
      </span>
    </div>
  )
}
