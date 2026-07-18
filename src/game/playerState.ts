import { ZOMBIE_REACTION_LAG } from './constants'

type Sample = { t: number; x: number; z: number }

const HISTORY_SECONDS = 1.25

/**
 * Mutable singleton written by Player each frame, read by zombie AI.
 * Keeps a short position history so chasers can sample a lagged target.
 */
class PlayerStateStore {
  x = 0
  z = 16
  /** Seconds, typically R3F clock.elapsedTime */
  time = 0
  private samples: Sample[] = [{ t: 0, x: 0, z: 16 }]

  /** Call once per frame after the player has moved. */
  update(time: number, x: number, z: number) {
    this.time = time
    this.x = x
    this.z = z
    this.samples.push({ t: time, x, z })

    const cutoff = time - HISTORY_SECONDS
    // Keep at least two samples for interpolation
    while (this.samples.length > 2 && this.samples[0]!.t < cutoff) {
      this.samples.shift()
    }
  }

  /**
   * World XZ position as perceived by a slow-reacting chaser.
   * @param lagSeconds defaults to ZOMBIE_REACTION_LAG (0.2s)
   */
  getLaggedPosition(lagSeconds: number = ZOMBIE_REACTION_LAG): { x: number; z: number } {
    const targetT = this.time - lagSeconds
    const samples = this.samples

    if (samples.length === 0) {
      return { x: this.x, z: this.z }
    }

    // Before first sample — use oldest
    if (targetT <= samples[0]!.t) {
      return { x: samples[0]!.x, z: samples[0]!.z }
    }

    // After latest — should not happen if lag > 0, but fall back to current
    const last = samples[samples.length - 1]!
    if (targetT >= last.t) {
      return { x: last.x, z: last.z }
    }

    // Linear interpolate between surrounding samples
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1]!
      const b = samples[i]!
      if (targetT <= b.t) {
        const span = b.t - a.t
        const u = span > 1e-6 ? (targetT - a.t) / span : 1
        return {
          x: a.x + (b.x - a.x) * u,
          z: a.z + (b.z - a.z) * u,
        }
      }
    }

    return { x: this.x, z: this.z }
  }
}

export const playerState = new PlayerStateStore()
