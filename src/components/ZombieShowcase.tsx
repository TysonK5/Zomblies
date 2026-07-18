import { useMemo } from 'react'
import { ZombieAI, PRESETS, randomAppearance, type ZombieAppearance } from '../zombie'
import { useGameSettings } from '../game/useGameSettings'

type Spawn = {
  key: string
  appearance: ZombieAppearance
  position: [number, number, number]
  rotationY?: number
  speedScale?: number
}

/** Fixed spawn pool — first N entries used based on maxZombies setting */
function buildSpawnPool(): Spawn[] {
  const randoms = [0.13, 0.37, 0.71, 0.94, 0.22, 0.55, 0.08, 0.61, 0.33, 0.79, 0.17, 0.48]

  const presets: Spawn[] = [
    { key: 'farmer', appearance: PRESETS.farmer, position: [-6, 0, 10], rotationY: 0.3 },
    { key: 'mechanic', appearance: PRESETS.mechanic, position: [-3, 0, 11], rotationY: -0.1 },
    { key: 'hillbilly', appearance: PRESETS.hillbilly, position: [0, 0, 10.5], rotationY: 0.15 },
    { key: 'runner', appearance: PRESETS.runner, position: [3, 0, 11], rotationY: -0.25 },
    { key: 'butcher', appearance: PRESETS.butcher, position: [6, 0, 10], rotationY: 0.2 },
    { key: 'barebones', appearance: PRESETS.barebones, position: [0, 0, 7] },
    { key: 'r0', appearance: randomAppearance(randoms[0]!), position: [-8, 0, 6], rotationY: 0.8 },
    { key: 'r1', appearance: randomAppearance(randoms[1]!), position: [8, 0, 5], rotationY: -0.6 },
    { key: 'r2', appearance: randomAppearance(randoms[2]!), position: [-4, 0, 4], rotationY: 0.3 },
    { key: 'r3', appearance: randomAppearance(randoms[3]!), position: [5, 0, 3], rotationY: -0.4 },
    { key: 'r4', appearance: randomAppearance(randoms[4]!), position: [16, 0, 8], rotationY: Math.PI },
    { key: 'r5', appearance: randomAppearance(randoms[5]!), position: [-18, 0, 5], rotationY: 1.2 },
    { key: 'r6', appearance: randomAppearance(randoms[6]!), position: [-14, 0, 14], rotationY: 2.2 },
    { key: 'r7', appearance: randomAppearance(randoms[7]!), position: [14, 0, 14], rotationY: -2.0 },
    { key: 'r8', appearance: randomAppearance(randoms[8]!), position: [-10, 0, -14], rotationY: 0.5 },
    { key: 'r9', appearance: randomAppearance(randoms[9]!), position: [12, 0, -14], rotationY: -0.8 },
    { key: 'r10', appearance: randomAppearance(randoms[10]!), position: [0, 0, -16], rotationY: 0 },
    { key: 'r11', appearance: randomAppearance(randoms[11]!), position: [-16, 0, -2], rotationY: 1.0 },
    // Extra capacity up to 24
    { key: 'r12', appearance: randomAppearance(0.41), position: [18, 0, 0], rotationY: -1.4 },
    { key: 'r13', appearance: randomAppearance(0.66), position: [-20, 0, 10], rotationY: 0.9 },
    { key: 'r14', appearance: randomAppearance(0.29), position: [8, 0, -10], rotationY: Math.PI / 2 },
    { key: 'r15', appearance: randomAppearance(0.83), position: [-8, 0, -10], rotationY: -Math.PI / 2 },
    { key: 'r16', appearance: randomAppearance(0.12), position: [4, 0, 16], rotationY: Math.PI },
    { key: 'r17', appearance: randomAppearance(0.57), position: [-4, 0, 16], rotationY: Math.PI },
  ]

  return presets
}

/**
 * Pack of modular zombies with chase AI.
 * Count and speed come from menu game settings.
 */
export function ZombieShowcase() {
  const { settings } = useGameSettings()
  const pool = useMemo(() => buildSpawnPool(), [])
  const active = pool.slice(0, settings.maxZombies)

  return (
    <group>
      {active.map((s) => (
        <ZombieAI
          key={s.key}
          appearance={s.appearance}
          position={s.position}
          rotationY={s.rotationY}
          speedScale={s.speedScale}
        />
      ))}
    </group>
  )
}
