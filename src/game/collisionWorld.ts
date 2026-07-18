import type { Collider, CircleCollider } from './collision'
import { getStaticWorldColliders } from './worldColliders'

type DynamicBody = {
  id: string
  x: number
  z: number
  r: number
}

/**
 * Combines static map colliders with dynamic agents (zombies / player).
 * Player soft-pushes zombies via agentPush; hard collide uses statics + optional dynamics.
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

  getDynamic(id: string): DynamicBody | undefined {
    return this.dynamics.get(id)
  }

  /** Snapshot of dynamic bodies (optional exclude). */
  listDynamics(excludeId?: string): DynamicBody[] {
    const out: DynamicBody[] = []
    for (const body of this.dynamics.values()) {
      if (excludeId && body.id === excludeId) continue
      out.push({ ...body })
    }
    return out
  }

  /**
   * Static world + other dynamics.
   * @param excludeId skip this dynamic body (the mover itself)
   * @param dynamics if false, statics only (player soft-push path)
   */
  query(excludeId?: string, dynamics = true): readonly Collider[] {
    const statics = getStaticWorldColliders()
    this.scratch.length = 0
    for (let i = 0; i < statics.length; i++) {
      this.scratch.push(statics[i]!)
    }
    if (dynamics) {
      for (const body of this.dynamics.values()) {
        if (excludeId && body.id === excludeId) continue
        // Skip player as a hard solid — soft push handles player↔zombie
        if (body.id === 'player') continue
        const c: CircleCollider = {
          type: 'circle',
          x: body.x,
          z: body.z,
          r: body.r,
          label: body.id,
        }
        this.scratch.push(c)
      }
    }
    return this.scratch
  }

  /** Static only (e.g. spawn validation, player solid move). */
  queryStatic(): readonly Collider[] {
    return getStaticWorldColliders()
  }
}

export const collisionWorld = new CollisionWorld()
