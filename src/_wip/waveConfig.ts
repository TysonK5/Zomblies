export type WaveConfig = {
  /** Number of zombies in this wave */
  count: number
  /** Speed multiplier for this wave */
  speedScale: number
  /** Reaction time jitter range (seconds) */
  reactionJitterRange: [number, number]
  /** Spawn interval between individual zombies (seconds) */
  spawnInterval: number
  /** Minimum distance from player for spawn points */
  minSpawnDist: number
}

/** Wave progression — scales difficulty per round */
export function getWaveConfig(round: number): WaveConfig {
  const baseCount = 4
  const count = Math.min(baseCount + (round - 1) * 2, 20)
  const speedScale = 1 + (round - 1) * 0.12
  const reactionJitterRange: [number, number] = [0, Math.min(0.3, (round - 1) * 0.05)]
  const spawnInterval = Math.max(0.4, 1.2 - (round - 1) * 0.08)
  const minSpawnDist = 18 + round * 2

  return { count, speedScale, reactionJitterRange, spawnInterval, minSpawnDist }
}

/** Pre-computed spawn positions around the map (far from center) */
export const SPAWN_POINTS: [number, number, number][] = [
  [-30, 0, -30],
  [30, 0, -30],
  [-30, 0, 30],
  [30, 0, 30],
  [0, 0, -36],
  [0, 0, 36],
  [-36, 0, 0],
  [36, 0, 0],
]

/** Filter spawn points that are far enough from player position */
export function getValidSpawnPoints(
  playerX: number,
  playerZ: number,
  minDist: number,
): [number, number, number][] {
  return SPAWN_POINTS.filter(([x, _, z]) => {
    const dx = x - playerX
    const dz = z - playerZ
    return Math.hypot(dx, dz) >= minDist
  })
}

/** Pick a random valid spawn point */
export function pickSpawnPoint(
  playerX: number,
  playerZ: number,
  minDist: number,
): [number, number, number] | null {
  const valid = getValidSpawnPoints(playerX, playerZ, minDist)
  if (valid.length === 0) return null
  return valid[Math.floor(Math.random() * valid.length)]!
}
