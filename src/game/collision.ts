/**
 * 2D ground-plane collision: axis-aligned boxes + circles.
 * Used by player and zombies against world assets and each other.
 */

export type AabbCollider = {
  type: 'aabb'
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  label?: string
}

export type CircleCollider = {
  type: 'circle'
  x: number
  z: number
  r: number
  label?: string
}

export type Collider = AabbCollider | CircleCollider

export function aabb(
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  label?: string,
): AabbCollider {
  return {
    type: 'aabb',
    minX: cx - halfW,
    maxX: cx + halfW,
    minZ: cz - halfD,
    maxZ: cz + halfD,
    label,
  }
}

export function circle(x: number, z: number, r: number, label?: string): CircleCollider {
  return { type: 'circle', x, z, r, label }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Push a circle out of one AABB if overlapping. */
function separateAabb(
  px: number,
  pz: number,
  radius: number,
  c: AabbCollider,
): { x: number; z: number } {
  const closestX = clamp(px, c.minX, c.maxX)
  const closestZ = clamp(pz, c.minZ, c.maxZ)
  let dx = px - closestX
  let dz = pz - closestZ
  const d2 = dx * dx + dz * dz

  if (d2 >= radius * radius) return { x: px, z: pz }

  if (d2 > 1e-10) {
    const d = Math.sqrt(d2)
    const push = (radius - d) / d
    return { x: px + dx * push, z: pz + dz * push }
  }

  // Center inside solid — eject through nearest face
  const left = px - c.minX
  const right = c.maxX - px
  const near = pz - c.minZ
  const far = c.maxZ - pz
  const m = Math.min(left, right, near, far)
  if (m === left) return { x: c.minX - radius, z: pz }
  if (m === right) return { x: c.maxX + radius, z: pz }
  if (m === near) return { x: px, z: c.minZ - radius }
  return { x: px, z: c.maxZ + radius }
}

/** Push a circle out of another circle if overlapping. */
function separateCircle(
  px: number,
  pz: number,
  radius: number,
  c: CircleCollider,
): { x: number; z: number } {
  let dx = px - c.x
  let dz = pz - c.z
  const minDist = radius + c.r
  const d2 = dx * dx + dz * dz

  if (d2 >= minDist * minDist) return { x: px, z: pz }

  if (d2 > 1e-10) {
    const d = Math.sqrt(d2)
    const push = (minDist - d) / d
    return { x: px + dx * push, z: pz + dz * push }
  }

  // Exact overlap — arbitrary nudge
  return { x: px + minDist, z: pz }
}

/** Resolve penetration against a list of colliders (several passes for corners). */
export function resolvePosition(
  x: number,
  z: number,
  radius: number,
  colliders: readonly Collider[],
  iterations = 4,
): { x: number; z: number } {
  let px = x
  let pz = z
  for (let i = 0; i < iterations; i++) {
    for (const c of colliders) {
      if (c.type === 'aabb') {
        ;({ x: px, z: pz } = separateAabb(px, pz, radius, c))
      } else {
        ;({ x: px, z: pz } = separateCircle(px, pz, radius, c))
      }
    }
  }
  return { x: px, z: pz }
}

/**
 * Move then resolve — allows sliding along walls when blocked on one axis.
 */
export function moveAndCollide(
  x: number,
  z: number,
  radius: number,
  dx: number,
  dz: number,
  colliders: readonly Collider[],
): { x: number; z: number } {
  // Full move
  let nx = x + dx
  let nz = z + dz
  let resolved = resolvePosition(nx, nz, radius, colliders)

  // If still nearly blocked, try axis-separated slides
  const fullBlocked =
    Math.hypot(resolved.x - (x + dx), resolved.z - (z + dz)) > 1e-4 &&
    Math.hypot(resolved.x - x, resolved.z - z) < Math.hypot(dx, dz) * 0.15

  if (fullBlocked || (Math.abs(dx) > 1e-8 && Math.abs(dz) > 1e-8)) {
    // Prefer result of full resolve; if almost no progress, try X then Z
    const progress = Math.hypot(resolved.x - x, resolved.z - z)
    const intended = Math.hypot(dx, dz)
    if (intended > 1e-8 && progress < intended * 0.25) {
      const onlyX = resolvePosition(x + dx, z, radius, colliders)
      const onlyZ = resolvePosition(x, z + dz, radius, colliders)
      // Pick the slide that travels farther
      const px = Math.hypot(onlyX.x - x, onlyX.z - z)
      const pz = Math.hypot(onlyZ.x - x, onlyZ.z - z)
      if (px >= pz && px > progress) resolved = onlyX
      else if (pz > progress) resolved = onlyZ
    }
  }

  return resolved
}
