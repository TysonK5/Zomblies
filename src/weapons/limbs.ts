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
 * Arms match the raised-out shambling pose (forward + outward reach).
 */
export const LIMB_LOCAL: Record<LimbId, { x: number; y: number; z: number; r: number }> = {
  head: { x: 0, y: 1.85, z: 0.04, r: 0.19 },
  /** Primary mass — chest/abdomen */
  torso: { x: 0, y: 1.32, z: 0.04, r: 0.34 },
  // Raised arms straight ahead (shoulder height, forward of chest)
  armL: { x: -0.32, y: 1.45, z: 0.42, r: 0.15 },
  armR: { x: 0.32, y: 1.45, z: 0.42, r: 0.15 },
  legL: { x: -0.14, y: 0.45, z: 0.02, r: 0.17 },
  legR: { x: 0.14, y: 0.45, z: 0.02, r: 0.17 },
}

/**
 * Crawl pose (both legs gone): body low and pitched forward.
 * Matches ZombieModel hip drop + torso pitch so ground-level aim hits.
 * Legs are usually missing — spheres kept for completeness.
 */
export const LIMB_LOCAL_CRAWL: Record<LimbId, { x: number; y: number; z: number; r: number }> = {
  // Head reaches forward along ground
  head: { x: 0, y: 0.45, z: 0.95, r: 0.2 },
  // Large body blob near ground (primary hit target while crawling)
  torso: { x: 0, y: 0.38, z: 0.35, r: 0.42 },
  armL: { x: -0.38, y: 0.28, z: 0.55, r: 0.16 },
  armR: { x: 0.38, y: 0.28, z: 0.55, r: 0.16 },
  legL: { x: -0.15, y: 0.2, z: -0.15, r: 0.12 },
  legR: { x: 0.15, y: 0.2, z: -0.15, r: 0.12 },
}

export function limbLocalForPose(crawling: boolean) {
  return crawling ? LIMB_LOCAL_CRAWL : LIMB_LOCAL
}

/**
 * Visual soft-box half-extents (root space), matched to ZombieModel SoftBoxGeometry.
 * Hit spheres are larger than the mesh — wound FX projects onto these bounds so
 * decals sit on the body instead of floating outside the hit-sphere surface.
 */
export const LIMB_VISUAL_HALF: Record<LimbId, { x: number; y: number; z: number }> = {
  // SoftBox 0.32×0.36×0.32
  head: { x: 0.155, y: 0.175, z: 0.155 },
  // Dominant chest box 0.48×0.5×0.28 (depth is the tight axis from front)
  torso: { x: 0.22, y: 0.28, z: 0.13 },
  // Thin limbs — cross-section ~0.12; keep small so side hits don’t float
  armL: { x: 0.065, y: 0.07, z: 0.12 },
  armR: { x: 0.065, y: 0.07, z: 0.12 },
  legL: { x: 0.08, y: 0.2, z: 0.08 },
  legR: { x: 0.08, y: 0.2, z: 0.08 },
}

/** Crawl pose: body is flatter / lower — slightly taller Y, wider XZ */
export const LIMB_VISUAL_HALF_CRAWL: Record<LimbId, { x: number; y: number; z: number }> = {
  head: { x: 0.16, y: 0.14, z: 0.16 },
  torso: { x: 0.28, y: 0.14, z: 0.32 },
  armL: { x: 0.07, y: 0.07, z: 0.12 },
  armR: { x: 0.07, y: 0.07, z: 0.12 },
  legL: { x: 0.07, y: 0.08, z: 0.07 },
  legR: { x: 0.07, y: 0.08, z: 0.07 },
}

export function limbVisualHalfForPose(limb: LimbId, crawling: boolean) {
  return crawling ? LIMB_VISUAL_HALF_CRAWL[limb] : LIMB_VISUAL_HALF[limb]
}

/**
 * Distance from AABB center to the box surface along a unit direction.
 * Used to project hit-sphere impact points onto the visual mesh volume.
 */
export function distToBoxSurface(
  nx: number,
  ny: number,
  nz: number,
  hx: number,
  hy: number,
  hz: number,
): number {
  const ax = Math.abs(nx)
  const ay = Math.abs(ny)
  const az = Math.abs(nz)
  const tx = ax > 1e-8 ? hx / ax : Infinity
  const ty = ay > 1e-8 ? hy / ay : Infinity
  const tz = az > 1e-8 ? hz / az : Infinity
  const t = Math.min(tx, ty, tz)
  if (!Number.isFinite(t) || t <= 0) return Math.min(hx, hy, hz)
  return t
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
