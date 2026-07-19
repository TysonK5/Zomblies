import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { ZombieAI } from '../zombie/ZombieAI'
import type { ZombieAppearance } from '../zombie/types'
import { randomAppearance } from '../zombie/palettes'
import { playerState } from '../game/playerState'
import { getWaveConfig, type WaveConfig } from './waveConfig'
import { WORLD_BOUNDS } from '../game/constants'

type SpawnedZombie = {
  id: string
  appearance: ZombieAppearance
  position: [number, number, number]
  scale: number
  speedScale: number
  reactionJitter: number
  alive: boolean
  deathT: number
}

type WaveSpawnerProps = {
  round: number
  maxZombies: number
  onWaveComplete?: (waveConfig: WaveConfig) => void
}

/**
 * Wave spawner: spawns zombies in packs each round, respects max zombie count.
 * Spawns at map edges far from player.
 */
export function WaveSpawner({ round, maxZombies, onWaveComplete }: WaveSpawnerProps) {
  const [zombies, setZombies] = useState<SpawnedZombie[]>([])
  const spawnQueueRef = useRef<string[]>([])
  const lastSpawnTime = useRef(0)
  const waveConfigRef = useRef<WaveConfig | null>(null)
  const waveCompleteRef = useRef(false)

  const config = getWaveConfig(round)
  waveConfigRef.current = config

  // Start new wave when round changes
  useEffect(() => {
    spawnQueueRef.current = []
    lastSpawnTime.current = 0
    waveCompleteRef.current = false

    for (let i = 0; i < config.count; i++) {
      spawnQueueRef.current.push(`zombie-${Date.now()}-${i}`)
    }
  }, [round, config.count])

  // Spawn zombies from queue
  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    const aliveCount = zombies.filter((z) => z.alive).length
    const totalQueued = spawnQueueRef.current.length

    if (totalQueued === 0 && aliveCount === 0 && !waveCompleteRef.current) {
      waveCompleteRef.current = true
      onWaveComplete?.(config)
      return
    }

    if (spawnQueueRef.current.length > 0 && aliveCount < maxZombies) {
      if (now - lastSpawnTime.current >= config.spawnInterval) {
        const zombieId = spawnQueueRef.current.shift()
        if (zombieId) {
          const spawnPoint = getValidSpawnPoint(
            playerState.x,
            playerState.z,
            config.minSpawnDist,
          )
          if (spawnPoint) {
            const appearance = randomAppearance()
            const jitter =
              config.reactionJitterRange[0] +
              Math.random() * (config.reactionJitterRange[1] - config.reactionJitterRange[0])

            const newZombie: SpawnedZombie = {
              id: zombieId,
              appearance,
              position: spawnPoint,
              scale: 1,
              speedScale: config.speedScale,
              reactionJitter: jitter,
              alive: true,
              deathT: 0,
            }

            setZombies((prev) => [...prev, newZombie])
            lastSpawnTime.current = now
          }
        }
      }
    }
  })

  return (
    <>
      {zombies
        .filter((z) => z.alive)
        .map((zombie) => (
          <ZombieAI
            key={zombie.id}
            appearance={zombie.appearance}
            position={zombie.position}
            speedScale={zombie.speedScale}
            reactionJitter={zombie.reactionJitter}
            active={true}
          />
        ))}
    </>
  )
}

/** Get a valid spawn point far from the player */
function getValidSpawnPoint(
  playerX: number,
  playerZ: number,
  minDist: number,
): [number, number, number] | null {
  const spawnPoints: [number, number, number][] = [
    [WORLD_BOUNDS.minX + 2, 0, WORLD_BOUNDS.minZ + 2],
    [WORLD_BOUNDS.maxX - 2, 0, WORLD_BOUNDS.minZ + 2],
    [WORLD_BOUNDS.minX + 2, 0, WORLD_BOUNDS.maxZ - 2],
    [WORLD_BOUNDS.maxX - 2, 0, WORLD_BOUNDS.maxZ - 2],
    [0, 0, WORLD_BOUNDS.minZ + 2],
    [0, 0, WORLD_BOUNDS.maxZ - 2],
    [WORLD_BOUNDS.minX + 2, 0, 0],
    [WORLD_BOUNDS.maxX - 2, 0, 0],
  ]

  const valid = spawnPoints.filter(([x, , z]) => {
    const dx = x - playerX
    const dz = z - playerZ
    return Math.hypot(dx, dz) >= minDist
  })

  if (valid.length === 0) return null
  return valid[Math.floor(Math.random() * valid.length)]!
}
