/** Zombie body parts for hit detection + dismemberment */

export type LimbId = 'head' | 'torso' | 'armL' | 'armR' | 'legL' | 'legR'

export type LimbState = Record<LimbId, boolean>

export const ALL_LIMBS: LimbId[] = ['head', 'torso', 'armL', 'armR', 'legL', 'legR']

export function fullLimbs(): LimbState {
  return {
    head: true,
    torso: true,
    armL: true,
    armR: true,
    legL: true,
    legR: true,
  }
}

/**
 * Local-space limb centers (feet origin, matching ZombieModel).
 * Torso is large and centered so chest shots land as body HP damage.
 * Arms sit farther out so they don't steal chest hits.
 */
export const LIMB_LOCAL: Record<LimbId, { x: number; y: number; z: number; r: number }> = {
  head: { x: 0, y: 1.92, z: 0.04, r: 0.19 },
  /** Primary mass — chest/abdomen */
  torso: { x: 0, y: 1.38, z: 0.04, r: 0.34 },
  armL: { x: -0.4, y: 1.42, z: 0.06, r: 0.13 },
  armR: { x: 0.4, y: 1.42, z: 0.06, r: 0.13 },
  legL: { x: -0.14, y: 0.52, z: 0.02, r: 0.17 },
  legR: { x: 0.14, y: 0.52, z: 0.02, r: 0.17 },
}

/**
 * How damage applies per part.
 * - Head: instant kill + destroy
 * - Torso: full weapon damage to HP (no sever unless massive overkill)
 * - Limbs: partial HP + can sever
 */
export function limbDamageResult(
  limb: LimbId,
  damage: number,
): { hpDamage: number; destroyLimb: boolean; kill: boolean } {
  if (limb === 'head') {
    return { hpDamage: 999, destroyLimb: true, kill: true }
  }
  if (limb === 'torso') {
    // Full damage to hit points — this is the main way to drop a zombie
    return {
      hpDamage: Math.max(1, Math.round(damage)),
      destroyLimb: false,
      kill: false,
    }
  }
  // Extremities: less HP transfer, but can be blown off
  const destroyLimb = damage >= 14
  return {
    hpDamage: Math.max(1, Math.round(damage * (destroyLimb ? 0.4 : 0.55))),
    destroyLimb,
    kill: false,
  }
}

/** Multipliers for display (what the player “feels”) */
export const LIMB_DAMAGE_LABEL: Record<LimbId, string> = {
  head: 'HEADSHOT',
  torso: 'BODY',
  armL: 'ARM',
  armR: 'ARM',
  legL: 'LEG',
  legR: 'LEG',
}
