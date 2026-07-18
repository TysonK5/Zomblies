import { formatKeyCode, getKeybindings } from '../game/keybindings'
import { useKeybindings } from '../game/useKeybindings'

/** Live control list reflecting current keybinds (menu footer). */
export function ControlsLegend() {
  useKeybindings() // re-render on change
  const b = getKeybindings()
  const k = formatKeyCode

  return (
    <ul className="controls">
      <li>
        <kbd>{k(b.moveForward)}</kbd>
        <kbd>{k(b.moveLeft)}</kbd>
        <kbd>{k(b.moveBack)}</kbd>
        <kbd>{k(b.moveRight)}</kbd> Move
      </li>
      <li>
        <kbd>{k(b.sprint)}</kbd> Sprint / run
      </li>
      <li>
        <kbd>{k(b.jump)}</kbd> Jump
      </li>
      <li>
        <kbd>{k(b.weapon1)}</kbd>–<kbd>{k(b.weapon7)}</kbd> Weapons
      </li>
      <li>
        <kbd>{k(b.fire)}</kbd> Fire / melee
      </li>
      <li>
        <kbd>{k(b.reload)}</kbd> Reload
      </li>
      <li>
        <kbd>{k(b.cycleTimeOfDay)}</kbd> Day / Twilight / Night
      </li>
      <li>
        <kbd>{k(b.toggleCamera)}</kbd> 1st / 3rd person
      </li>
      <li>Scroll cycle weapons · Mouse look</li>
      <li>
        <kbd>Esc</kbd> Menu / settings
      </li>
    </ul>
  )
}
