/**
 * Remappable keyboard / mouse bindings for the options menu.
 * Uses KeyboardEvent.code / MouseN strings. Persists to localStorage.
 */

export type InputAction =
  | 'moveForward'
  | 'moveBack'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'sprint'
  | 'reload'
  | 'fire'
  | 'weapon1'
  | 'weapon2'
  | 'weapon3'
  | 'weapon4'
  | 'weapon5'
  | 'weapon6'
  | 'weapon7'
  | 'cycleTimeOfDay'
  | 'toggleCamera'

export type Keybindings = Record<InputAction, string>

export const ACTION_LABELS: Record<InputAction, string> = {
  moveForward: 'Move forward',
  moveBack: 'Move back',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  jump: 'Jump',
  sprint: 'Sprint / run',
  reload: 'Reload',
  fire: 'Fire / melee',
  weapon1: 'Weapon 1 — Fists',
  weapon2: 'Weapon 2 — Pitchfork',
  weapon3: 'Weapon 3 — Double Barrel',
  weapon4: 'Weapon 4 — .22 Lever',
  weapon5: 'Weapon 5 — Combat Pump',
  weapon6: 'Weapon 6 — MP40',
  weapon7: 'Weapon 7 — Revolver',
  cycleTimeOfDay: 'Cycle day / night',
  toggleCamera: 'Toggle 1st / 3rd person',
}

/** Display order in the options menu */
export const ACTION_ORDER: InputAction[] = [
  'moveForward',
  'moveBack',
  'moveLeft',
  'moveRight',
  'jump',
  'sprint',
  'fire',
  'reload',
  'weapon1',
  'weapon2',
  'weapon3',
  'weapon4',
  'weapon5',
  'weapon6',
  'weapon7',
  'cycleTimeOfDay',
  'toggleCamera',
]

export const DEFAULT_KEYBINDINGS: Keybindings = {
  moveForward: 'KeyW',
  moveBack: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  jump: 'Space',
  sprint: 'ShiftLeft',
  reload: 'KeyR',
  fire: 'Mouse0',
  weapon1: 'Digit1',
  weapon2: 'Digit2',
  weapon3: 'Digit3',
  weapon4: 'Digit4',
  weapon5: 'Digit5',
  weapon6: 'Digit6',
  weapon7: 'Digit7',
  cycleTimeOfDay: 'KeyT',
  toggleCamera: 'KeyV',
}

const STORAGE_KEY = 'the-farm-keybindings-v1'

type Listener = (b: Keybindings) => void

let current: Keybindings = load()
let rebindingAction: InputAction | null = null
const listeners = new Set<Listener>()

function load(): Keybindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_KEYBINDINGS }
    const parsed = JSON.parse(raw) as Partial<Keybindings>
    return { ...DEFAULT_KEYBINDINGS, ...parsed }
  } catch {
    return { ...DEFAULT_KEYBINDINGS }
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    /* ignore quota / private mode */
  }
}

export function getKeybindings(): Keybindings {
  return current
}

export function getBinding(action: InputAction): string {
  return current[action]
}

/** True while options UI is waiting for a new key */
export function isRebinding(): boolean {
  return rebindingAction !== null
}

export function getRebindingAction(): InputAction | null {
  return rebindingAction
}

export function beginRebind(action: InputAction) {
  rebindingAction = action
  emit()
}

export function cancelRebind() {
  if (rebindingAction === null) return
  rebindingAction = null
  emit()
}

/**
 * Apply a new code to the action being rebound (or explicit action).
 * If another action already uses this code, swap the two.
 * Blocks Escape (cancel) and reserved browser-ish keys.
 */
export function commitRebind(code: string, action: InputAction | null = rebindingAction): boolean {
  if (!action) return false
  if (!code || code === 'Escape') {
    cancelRebind()
    return false
  }
  // Don't allow binding meta-only keys that break the menu
  if (code === 'F5' || code === 'F11' || code === 'F12') return false

  const next = { ...current }
  const prev = next[action]
  // Swap if conflict
  for (const key of Object.keys(next) as InputAction[]) {
    if (key !== action && next[key] === code) {
      next[key] = prev
      break
    }
  }
  next[action] = code
  current = next
  rebindingAction = null
  persist()
  emit()
  return true
}

export function setKeybindings(partial: Partial<Keybindings>) {
  current = { ...current, ...partial }
  persist()
  emit()
}

export function resetKeybindings() {
  current = { ...DEFAULT_KEYBINDINGS }
  rebindingAction = null
  persist()
  emit()
}

export function subscribeKeybindings(fn: Listener): () => void {
  listeners.add(fn)
  fn(current)
  return () => listeners.delete(fn)
}

function emit() {
  for (const fn of listeners) fn(current)
}

/** Human-readable label for a KeyboardEvent.code or MouseN */
export function formatKeyCode(code: string): string {
  if (!code) return '—'
  if (code === 'Space') return 'Space'
  if (code === 'ShiftLeft') return 'L-Shift'
  if (code === 'ShiftRight') return 'R-Shift'
  if (code === 'ControlLeft') return 'L-Ctrl'
  if (code === 'ControlRight') return 'R-Ctrl'
  if (code === 'AltLeft') return 'L-Alt'
  if (code === 'AltRight') return 'R-Alt'
  if (code === 'Mouse0') return 'LMB'
  if (code === 'Mouse1') return 'RMB'
  if (code === 'Mouse2') return 'MMB'
  if (code.startsWith('Mouse')) return code.replace('Mouse', 'M')
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code.startsWith('Arrow')) return code.slice(5)
  return code
}

export function mouseButtonCode(button: number): string {
  return `Mouse${button}`
}
