/**
 * Runtime-tunable gameplay settings (menu + live apply).
 * Player / zombie systems read `getGameSettings()` each frame.
 */

export type GameSettings = {
  /** How many zombies to spawn on the farm */
  maxZombies: number
  /** Zombie chase speed in world units / second */
  zombieRunSpeed: number
  /** Player walk speed (units / second) */
  playerWalkSpeed: number
  /** Player sprint / run speed (units / second) */
  playerRunSpeed: number
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxZombies: 12,
  // Historical default: 60% of player max (6 * 1.65 * 0.6)
  zombieRunSpeed: 3.0,
  playerWalkSpeed: 6,
  playerRunSpeed: 9.9,
}

export const SETTINGS_LIMITS = {
  maxZombies: { min: 0, max: 24, step: 1 },
  zombieRunSpeed: { min: 0.5, max: 14, step: 0.1 },
  playerWalkSpeed: { min: 1, max: 16, step: 0.1 },
  playerRunSpeed: { min: 2, max: 24, step: 0.1 },
} as const

type Listener = (s: GameSettings) => void

let current: GameSettings = { ...DEFAULT_GAME_SETTINGS }
const listeners = new Set<Listener>()

export function getGameSettings(): GameSettings {
  return current
}

export function setGameSettings(partial: Partial<GameSettings>): GameSettings {
  current = {
    ...current,
    ...partial,
  }
  // Keep run ≥ walk for sanity
  if (current.playerRunSpeed < current.playerWalkSpeed) {
    current.playerRunSpeed = current.playerWalkSpeed
  }
  // Clamp
  current.maxZombies = clampInt(
    current.maxZombies,
    SETTINGS_LIMITS.maxZombies.min,
    SETTINGS_LIMITS.maxZombies.max,
  )
  current.zombieRunSpeed = clamp(
    current.zombieRunSpeed,
    SETTINGS_LIMITS.zombieRunSpeed.min,
    SETTINGS_LIMITS.zombieRunSpeed.max,
  )
  current.playerWalkSpeed = clamp(
    current.playerWalkSpeed,
    SETTINGS_LIMITS.playerWalkSpeed.min,
    SETTINGS_LIMITS.playerWalkSpeed.max,
  )
  current.playerRunSpeed = clamp(
    current.playerRunSpeed,
    SETTINGS_LIMITS.playerRunSpeed.min,
    SETTINGS_LIMITS.playerRunSpeed.max,
  )

  for (const fn of listeners) fn(current)
  return current
}

export function resetGameSettings(): GameSettings {
  current = { ...DEFAULT_GAME_SETTINGS }
  for (const fn of listeners) fn(current)
  return current
}

export function subscribeGameSettings(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function clampInt(v: number, lo: number, hi: number) {
  return Math.round(clamp(v, lo, hi))
}
