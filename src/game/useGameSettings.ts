import { useEffect, useState } from 'react'
import {
  getGameSettings,
  setGameSettings,
  resetGameSettings,
  subscribeGameSettings,
  type GameSettings,
} from './gameSettings'

/** React binding to the shared game settings store. */
export function useGameSettings() {
  const [settings, setLocal] = useState<GameSettings>(() => getGameSettings())

  useEffect(() => subscribeGameSettings(setLocal), [])

  return {
    settings,
    update: (partial: Partial<GameSettings>) => setGameSettings(partial),
    reset: () => resetGameSettings(),
  }
}
