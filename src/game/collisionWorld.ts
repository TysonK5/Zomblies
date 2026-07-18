import type { Collider, CircleCollider } from './collision'
import { getStaticWorldColliders } from './worldColliders'

type DynamicBody = {
  id: string
  x: number
  z: number
  r: number
}

/**
 * Combines static map colliders with dynamic agents (zombies).
 * Player reads all solids; each zombie reads all except itself.
 */
class CollisionWorld {
  private dynamics = new Map<string, DynamicBody>()
  /** Scratch buffer reused per query to avoid allocs in the hot path */
  private scratch: Collider[] = []

  setDynamic(id: string, x: number, z: number, r: number) {
    this.dynamics.set(id, { id, x, z, r })
  }

  removeDynamic(id: string) {
    this.dynamics.delete(id)
  }

  /**
   * Static world + other dynamics.
   * @param excludeId skip this dynamic body (the mover itself)
   */
  query(excludeId?: string): readonly Collider[] {
    const statics = getStaticWorldColliders()
    this.scratch.length = 0
    // Copy static refs (no clone of geometry)
    for (let i = 0; i < statics.length; i++) {
      this.scratch.push(statics[i]!)
    }
    for (const body of this.dynamics.values()) {
      if (excludeId && body.id === excludeId) continue
      const c: CircleCollider = {
        type: 'circle',
        x: body.x,
        z: body.z,
        r: body.r,
        label: body.id,
      }
      this.scratch.push(c)
    }
    return this.scratch
  }

  /** Static only (e.g. spawn validation). */
  queryStatic(): readonly Collider[] {
    return getStaticWorldColliders()
  }
}

export const collisionWorld = new CollisionWorld()
