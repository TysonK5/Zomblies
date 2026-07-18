/**
 * Ground height sampling for characters and future multi-level terrain.
 *
 * Surfaces are queried in order of priority (last registered wins on ties by max height).
 * Today: flat plane at y=0. Later: register stairs, mounds, platforms via addGroundSurface.
 */

export type GroundHit = {
  /** World-space surface Y under (x, z) */
  height: number
  /** Upward normal (for slopes later) */
  nx: number
  ny: number
  nz: number
  /** Optional label for debugging */
  label?: string
}

export type GroundSurface = {
  label?: string
  /**
   * Return a hit if (x,z) is over this surface, else null.
   * height is the top Y the feet should rest on.
   */
  sample(x: number, z: number): GroundHit | null
}

const surfaces: GroundSurface[] = []

/** Default infinite flat ground */
const flatGround: GroundSurface = {
  label: 'flat',
  sample(_x, _z) {
    return { height: 0, nx: 0, ny: 1, nz: 0, label: 'flat' }
  },
}

let initialized = false

function ensureInit() {
  if (initialized) return
  surfaces.push(flatGround)
  initialized = true
}

export function addGroundSurface(surface: GroundSurface) {
  ensureInit()
  surfaces.push(surface)
}

export function clearGroundSurfaces() {
  surfaces.length = 0
  surfaces.push(flatGround)
  initialized = true
}

/**
 * Highest surface under (x, z). Ready for stacked platforms / stairs.
 */
export function sampleGround(x: number, z: number): GroundHit {
  ensureInit()
  let best: GroundHit = { height: 0, nx: 0, ny: 1, nz: 0, label: 'fallback' }
  let found = false
  for (const s of surfaces) {
    const h = s.sample(x, z)
    if (!h) continue
    if (!found || h.height >= best.height) {
      best = h
      found = true
    }
  }
  return best
}

export function getGroundHeight(x: number, z: number): number {
  return sampleGround(x, z).height
}

/**
 * Axis-aligned raised pad / stair tread (XZ box with constant top height).
 * Use for porches, steps, mounds approximated as boxes.
 */
export function createHeightPad(opts: {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height: number
  label?: string
}): GroundSurface {
  return {
    label: opts.label ?? 'pad',
    sample(x, z) {
      if (x < opts.minX || x > opts.maxX || z < opts.minZ || z > opts.maxZ) return null
      return {
        height: opts.height,
        nx: 0,
        ny: 1,
        nz: 0,
        label: opts.label,
      }
    },
  }
}

/**
 * Simple linear ramp (mound / ramp) along X or Z.
 * height0 at edge0, height1 at edge1, constant across the other axis.
 */
export function createRamp(opts: {
  axis: 'x' | 'z'
  /** Start of ramp along axis */
  a0: number
  /** End of ramp along axis */
  a1: number
  /** Cross-axis min */
  b0: number
  /** Cross-axis max */
  b1: number
  height0: number
  height1: number
  label?: string
}): GroundSurface {
  return {
    label: opts.label ?? 'ramp',
    sample(x, z) {
      const a = opts.axis === 'x' ? x : z
      const b = opts.axis === 'x' ? z : x
      if (b < opts.b0 || b > opts.b1) return null
      const lo = Math.min(opts.a0, opts.a1)
      const hi = Math.max(opts.a0, opts.a1)
      if (a < lo || a > hi) return null
      const t = (a - opts.a0) / (opts.a1 - opts.a0 || 1)
      const height = opts.height0 + (opts.height1 - opts.height0) * t
      // Approximate slope normal in 2D
      const dh = opts.height1 - opts.height0
      const da = opts.a1 - opts.a0 || 1
      const slope = dh / da
      const len = Math.hypot(1, slope) || 1
      if (opts.axis === 'x') {
        return {
          height,
          nx: -slope / len,
          ny: 1 / len,
          nz: 0,
          label: opts.label,
        }
      }
      return {
        height,
        nx: 0,
        ny: 1 / len,
        nz: -slope / len,
        label: opts.label,
      }
    },
  }
}

/**
 * Snap a feet Y toward ground with a small tolerance (for landing).
 * Returns new feetY and whether grounded.
 */
export function resolveFeetOnGround(
  x: number,
  z: number,
  feetY: number,
  verticalVel: number,
  opts?: { snapTolerance?: number },
): { y: number; grounded: boolean; groundY: number; verticalVel: number } {
  const groundY = getGroundHeight(x, z)
  const tol = opts?.snapTolerance ?? 0.08
  // Falling or resting onto surface
  if (verticalVel <= 0 && feetY <= groundY + tol) {
    return { y: groundY, grounded: true, groundY, verticalVel: 0 }
  }
  // Still airborne above ground
  if (feetY > groundY + tol) {
    return { y: feetY, grounded: false, groundY, verticalVel }
  }
  // Below surface (tunneling) — push up
  if (feetY < groundY) {
    return { y: groundY, grounded: verticalVel <= 0, groundY, verticalVel: Math.max(0, verticalVel) }
  }
  return { y: feetY, grounded: false, groundY, verticalVel }
}
