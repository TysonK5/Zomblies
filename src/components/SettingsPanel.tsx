import { SETTINGS_LIMITS } from '../game/gameSettings'
import { useGameSettings } from '../game/useGameSettings'
import { KeybindSettings } from './KeybindSettings'

type SliderProps = {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}

function SettingSlider({ id, label, value, min, max, step, unit, onChange }: SliderProps) {
  const display =
    step >= 1 ? String(Math.round(value)) : value.toFixed(step < 0.1 ? 2 : 1)

  return (
    <div className="setting-row">
      <div className="setting-head">
        <label htmlFor={id}>{label}</label>
        <span className="setting-value">
          {display}
          {unit ? <span className="setting-unit">{unit}</span> : null}
        </span>
      </div>
      <input
        id={id}
        className="setting-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/**
 * In-menu gameplay config + key remapping.
 */
export function SettingsPanel() {
  const { settings, update, reset } = useGameSettings()
  const L = SETTINGS_LIMITS

  return (
    <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
      <div className="settings-title">
        <span>Configure</span>
        <button type="button" className="settings-reset" onClick={() => reset()}>
          Reset gameplay
        </button>
      </div>

      <SettingSlider
        id="max-zombies"
        label="Max zombies"
        value={settings.maxZombies}
        min={L.maxZombies.min}
        max={L.maxZombies.max}
        step={L.maxZombies.step}
        onChange={(maxZombies) => update({ maxZombies })}
      />

      <SettingSlider
        id="zombie-speed"
        label="Zombie run speed"
        value={settings.zombieRunSpeed}
        min={L.zombieRunSpeed.min}
        max={L.zombieRunSpeed.max}
        step={L.zombieRunSpeed.step}
        unit=" u/s"
        onChange={(zombieRunSpeed) => update({ zombieRunSpeed })}
      />

      <SettingSlider
        id="player-walk"
        label="Player walk speed"
        value={settings.playerWalkSpeed}
        min={L.playerWalkSpeed.min}
        max={L.playerWalkSpeed.max}
        step={L.playerWalkSpeed.step}
        unit=" u/s"
        onChange={(playerWalkSpeed) => update({ playerWalkSpeed })}
      />

      <SettingSlider
        id="player-run"
        label="Player run speed"
        value={settings.playerRunSpeed}
        min={L.playerRunSpeed.min}
        max={L.playerRunSpeed.max}
        step={L.playerRunSpeed.step}
        unit=" u/s"
        onChange={(playerRunSpeed) => update({ playerRunSpeed })}
      />

      <KeybindSettings />

      <p className="settings-note">
        Changes apply immediately. Press Esc during play to reopen this menu.
      </p>
    </div>
  )
}
