import type { LimbId, LimbState } from './limbs'

export type DamageResult = {
  killed: boolean
  hp: number
  /** Actual HP removed by this hit */
  hpDamage: number
  limb?: LimbId
  limbDestroyed?: LimbId
  limbs?: LimbState
}

export type DamageableBody = {
  id: string
  radius: number
  height: number
  hp: number
  maxHp: number
  limbs: LimbState
  /** True when both legs are gone — hitboxes use crawl layout */
  crawling?: boolean
  getPosition: () => { x: number; y: number; z: number }
  getYaw: () => number
  /**
   * Transform a feet-local point into world space (includes corpse tip-over
   * when implemented via the zombie root matrix).
   */
  localToWorldPoint?: (lx: number, ly: number, lz: number) => { x: number; y: number; z: number }
  /** Transform a local direction (e.g. normal) into world space */
  localToWorldDir?: (nx: number, ny: number, nz: number) => { x: number; y: number; z: number }
  applyDamage: (
    amount: number,
    limb?: LimbId,
    hitPoint?: { x: number; y: number; z: number },
  ) => DamageResult
  onDeath?: () => void
}

export const damageables = new Map<string, DamageableBody>()

export function registerDamageable(body: DamageableBody) {
  damageables.set(body.id, body)
}

export function unregisterDamageable(id: string) {
  damageables.delete(id)
}
