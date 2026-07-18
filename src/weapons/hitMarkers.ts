/**
 * Impact markers: world bullet holes, flesh holes, blood splats, mist, spray.
 * Flesh markers attach to zombies and follow in local space while they move.
 */

import { damageables } from './damageables'

export type HitSurface =
  | 'world'
  | 'flesh' // legacy alias for blood_splat
  | 'bullet_hole' // dark entry wound on flesh / wood
  | 'blood_splat' // sticky red pool around wound
  | 'blood_mist' // brief expanding puff
  | 'blood_spray' // short-lived flying droplets

export type HitMarker = {
  id: number
  /** Current world position (updated each frame if attached) */
  x: number
  y: number
  z: number
  /** Current world normal */
  nx: number
  ny: number
  nz: number
  surface: HitSurface
  life: number
  maxLife: number
  scale: number
  /** Random spin so holes/splats don’t look identical */
  roll: number
  /** If set, marker sticks to this damageable (zombie) */
  attachId?: string
  /** Local offset from zombie feet origin (yaw-relative XZ) */
  localX?: number
  localY?: number
  localZ?: number
  /** Local normal (in zombie yaw space) */
  localNx?: number
  localNy?: number
  localNz?: number
  /** Free-flying spray velocity (world units / sec) */
  vx?: number
  vy?: number
  vz?: number
}

type Listener = () => void

let nextId = 1
const markers: HitMarker[] = []
const listeners = new Set<Listener>()
/** Allow wrap bands + stacked wounds on packs of zombies */
const MAX_MARKERS = 220

function emit() {
  for (const fn of listeners) fn()
}

export function subscribeHitMarkers(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getHitMarkers(): readonly HitMarker[] {
  return markers
}

/** World → zombie-local (feet origin, yaw around Y) */
export function worldToLocal(
  wx: number,
  wy: number,
  wz: number,
  px: number,
  py: number,
  pz: number,
  yaw: number,
): { x: number; y: number; z: number } {
  const dx = wx - px
  const dy = wy - py
  const dz = wz - pz
  const c = Math.cos(-yaw)
  const s = Math.sin(-yaw)
  return {
    x: dx * c - dz * s,
    y: dy,
    z: dx * s + dz * c,
  }
}

export function localToWorld(
  lx: number,
  ly: number,
  lz: number,
  px: number,
  py: number,
  pz: number,
  yaw: number,
): { x: number; y: number; z: number } {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    x: px + lx * c + lz * s,
    y: py + ly,
    z: pz - lx * s + lz * c,
  }
}

/** Rotate a direction by yaw only (for normals) */
function rotateYaw(nx: number, ny: number, nz: number, yaw: number) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    nx: nx * c + nz * s,
    ny,
    nz: -nx * s + nz * c,
  }
}

function defaultLife(surface: HitSurface): number {
  if (surface === 'blood_mist') return 0.4
  if (surface === 'blood_spray') return 0.55
  if (surface === 'bullet_hole') return 45
  if (surface === 'blood_splat' || surface === 'flesh') return 35
  return 14 // world
}

function defaultScale(surface: HitSurface): number {
  if (surface === 'bullet_hole') return 0.07
  if (surface === 'blood_splat' || surface === 'flesh') return 0.16
  if (surface === 'blood_mist') return 0.22
  if (surface === 'blood_spray') return 0.04
  return 0.09
}

export function spawnHitMarker(opts: {
  x: number
  y: number
  z: number
  nx?: number
  ny?: number
  nz?: number
  surface: HitSurface
  scale?: number
  life?: number
  /** Stick to this zombie id */
  attachId?: string
  vx?: number
  vy?: number
  vz?: number
  roll?: number
}) {
  let nx = opts.nx ?? 0
  let ny = opts.ny ?? 1
  let nz = opts.nz ?? 0
  const len = Math.hypot(nx, ny, nz) || 1
  nx /= len
  ny /= len
  nz /= len

  const life = opts.life ?? defaultLife(opts.surface)

  const m: HitMarker = {
    id: nextId++,
    x: opts.x,
    y: opts.y,
    z: opts.z,
    nx,
    ny,
    nz,
    surface: opts.surface,
    life,
    maxLife: life,
    scale: opts.scale ?? defaultScale(opts.surface),
    roll: opts.roll ?? Math.random() * Math.PI * 2,
    vx: opts.vx,
    vy: opts.vy,
    vz: opts.vz,
  }

  // Sticky attach for wound layers (not free spray)
  if (opts.attachId && opts.surface !== 'blood_spray') {
    const body = damageables.get(opts.attachId)
    if (body) {
      const p = body.getPosition()
      const yaw = body.getYaw()
      // Prefer full root transform when available so crawl/death tip follows
      let local: { x: number; y: number; z: number }
      if (body.worldToLocalPoint) {
        local = body.worldToLocalPoint(opts.x, opts.y, opts.z)
      } else {
        local = worldToLocal(opts.x, opts.y, opts.z, p.x, p.y, p.z, yaw)
      }
      let ln: { nx: number; ny: number; nz: number }
      if (body.worldToLocalDir) {
        const d = body.worldToLocalDir(nx, ny, nz)
        ln = { nx: d.x, ny: d.y, nz: d.z }
      } else {
        ln = rotateYaw(nx, ny, nz, -yaw)
      }
      m.attachId = opts.attachId
      m.localX = local.x
      m.localY = local.y
      m.localZ = local.z
      m.localNx = ln.nx
      m.localNy = ln.ny
      m.localNz = ln.nz
    }
  }

  markers.push(m)
  while (markers.length > MAX_MARKERS) markers.shift()
  emit()
}

/** Rodrigues rotation of vector v around unit axis k by angle (radians). */
function rotateAroundAxis(
  vx: number,
  vy: number,
  vz: number,
  kx: number,
  ky: number,
  kz: number,
  angle: number,
): { x: number; y: number; z: number } {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dot = vx * kx + vy * ky + vz * kz
  // v cos + (k×v) sin + k (k·v) (1−cos)
  const cx = ky * vz - kz * vy
  const cy = kz * vx - kx * vz
  const cz = kx * vy - ky * vx
  return {
    x: vx * c + cx * s + kx * dot * (1 - c),
    y: vy * c + cy * s + ky * dot * (1 - c),
    z: vz * c + cz * s + kz * dot * (1 - c),
  }
}

function normalize3(x: number, y: number, z: number) {
  const l = Math.hypot(x, y, z) || 1
  return { x: x / l, y: y / l, z: z / l }
}

/**
 * Layered wound FX that WRAPS around the hit limb sphere:
 * dark hole at impact + ring of flat blood patches following the surface.
 */
export function spawnZombieWoundFx(opts: {
  x: number
  y: number
  z: number
  nx: number
  ny: number
  nz: number
  attachId: string
  /** Limb hit-sphere center (world) — patches wrap around this */
  cx?: number
  cy?: number
  cz?: number
  /** Limb hit-sphere radius */
  radius?: number
  /** head hits are larger / bloodier */
  head?: boolean
  /** melee leaves a wider slash-like splat */
  melee?: boolean
}) {
  const { x, y, z, attachId } = opts
  const head = !!opts.head
  const melee = !!opts.melee
  const n0 = normalize3(opts.nx, opts.ny, opts.nz)
  let nnx = n0.x
  let nny = n0.y
  let nnz = n0.z

  // Sphere center + radius so blood can wrap the curved limb surface
  const R = Math.max(0.08, opts.radius ?? 0.16)
  let cx = opts.cx
  let cy = opts.cy
  let cz = opts.cz
  if (cx == null || cy == null || cz == null) {
    // Reconstruct from hit point + normal
    cx = x - nnx * R
    cy = y - nny * R
    cz = z - nnz * R
  } else {
    // Re-project hit onto sphere so normal matches the limb surface
    let dx = x - cx
    let dy = y - cy
    let dz = z - cz
    const dl = Math.hypot(dx, dy, dz) || 1
    nnx = dx / dl
    nny = dy / dl
    nnz = dz / dl
  }

  const lift = 0.012
  const ox = cx + nnx * (R + lift)
  const oy = cy + nny * (R + lift)
  const oz = cz + nnz * (R + lift)

  // ── Impact hole (on impact face only) ───────────────────────────
  spawnHitMarker({
    x: ox,
    y: oy,
    z: oz,
    nx: nnx,
    ny: nny,
    nz: nnz,
    surface: 'bullet_hole',
    scale: Math.min(R * 0.55, melee ? (head ? 0.12 : 0.09) : head ? 0.085 : 0.055),
    attachId,
  })

  // Central sticky blood under the hole
  spawnHitMarker({
    x: ox + nnx * 0.004,
    y: oy + nny * 0.004,
    z: oz + nnz * 0.004,
    nx: nnx,
    ny: nny,
    nz: nnz,
    surface: 'blood_splat',
    scale: Math.min(R * 0.95, melee ? (head ? 0.16 : 0.12) : head ? 0.13 : 0.09),
    attachId,
  })

  // ── Wrap band: flat circles on the sphere surface around the hit ─
  // Limb axis ≈ world up for torso/head; still works for limbs (wraps around).
  let ax = 0
  let ay = 1
  let az = 0
  if (Math.abs(nnx * ax + nny * ay + nnz * az) > 0.85) {
    ax = 1
    ay = 0
    az = 0
  }
  // Make axis orthogonal enough for stable rotation
  {
    const a = normalize3(ax, ay, az)
    ax = a.x
    ay = a.y
    az = a.z
  }

  // Second axis so we wrap in two directions (around the limb)
  const t = normalize3(
    ay * nnz - az * nny,
    az * nnx - ax * nnz,
    ax * nny - ay * nnx,
  )

  // Angular steps around the limb (radians) — larger arc for head/melee
  const wrapSpan = head ? 1.35 : melee ? 1.15 : 0.95
  const wrapSteps = head || melee ? 5 : 4
  const wrapPatchScale = Math.min(R * 0.7, head ? 0.1 : melee ? 0.085 : 0.065)

  for (let i = 0; i < wrapSteps; i++) {
    // Skip exact 0 — already covered by center splat
    const u = (i + 1) / (wrapSteps + 1)
    // Alternate left/right around limb axis
    const sign = i % 2 === 0 ? 1 : -1
    const ang = sign * wrapSpan * u

    const n1 = rotateAroundAxis(nnx, nny, nnz, ax, ay, az, ang)
    const nl = Math.hypot(n1.x, n1.y, n1.z) || 1
    const nx1 = n1.x / nl
    const ny1 = n1.y / nl
    const nz1 = n1.z / nl
    const fade = 1 - u * 0.35

    spawnHitMarker({
      x: cx + nx1 * (R + lift),
      y: cy + ny1 * (R + lift),
      z: cz + nz1 * (R + lift),
      nx: nx1,
      ny: ny1,
      nz: nz1,
      surface: 'blood_splat',
      scale: wrapPatchScale * fade * (0.85 + Math.random() * 0.25),
      attachId,
    })
  }

  // Secondary wrap around the cross-axis (covers top/bottom of the limb)
  const wrapSteps2 = head || melee ? 3 : 2
  for (let i = 0; i < wrapSteps2; i++) {
    const u = (i + 1) / (wrapSteps2 + 1)
    const sign = i % 2 === 0 ? 1 : -1
    const ang = sign * wrapSpan * 0.75 * u
    const n2 = rotateAroundAxis(nnx, nny, nnz, t.x, t.y, t.z, ang)
    const nl = Math.hypot(n2.x, n2.y, n2.z) || 1
    const nx2 = n2.x / nl
    const ny2 = n2.y / nl
    const nz2 = n2.z / nl
    const fade = 1 - u * 0.4

    spawnHitMarker({
      x: cx + nx2 * (R + lift),
      y: cy + ny2 * (R + lift),
      z: cz + nz2 * (R + lift),
      nx: nx2,
      ny: ny2,
      nz: nz2,
      surface: 'blood_splat',
      scale: wrapPatchScale * 0.85 * fade * (0.85 + Math.random() * 0.2),
      attachId,
    })
  }

  // Expanding mist puff at impact (not a surface wrap)
  spawnHitMarker({
    x: ox + nnx * 0.05,
    y: oy + nny * 0.05,
    z: oz + nnz * 0.05,
    nx: nnx,
    ny: nny,
    nz: nnz,
    surface: 'blood_mist',
    scale: head ? 0.28 : melee ? 0.22 : 0.16,
    life: head ? 0.5 : 0.35,
    attachId,
  })

  // Flying droplets away from impact face
  const drops = head ? 6 : melee ? 4 : 2 + Math.floor(Math.random() * 2)
  for (let i = 0; i < drops; i++) {
    const spread = 1.1 + Math.random() * 2
    const speed = (head ? 2.2 : 1.4) + Math.random() * 2.2
    spawnHitMarker({
      x: ox + nnx * 0.03,
      y: oy + nny * 0.03,
      z: oz + nnz * 0.03,
      nx: nnx,
      ny: nny,
      nz: nnz,
      surface: 'blood_spray',
      scale: 0.022 + Math.random() * 0.03,
      life: 0.3 + Math.random() * 0.3,
      vx: nnx * speed + (Math.random() - 0.5) * spread,
      vy: nny * speed * 0.45 + 0.7 + Math.random() * 1.4,
      vz: nnz * speed + (Math.random() - 0.5) * spread,
    })
  }
}

/**
 * Recompute world pose for a marker attached to a moving zombie / corpse.
 * Uses the body's localToWorldPoint when available (follows tip-over, etc.).
 */
export function syncMarkerToParent(m: HitMarker) {
  if (m.attachId == null || m.localX == null || m.localY == null || m.localZ == null) return

  const body = damageables.get(m.attachId)
  if (!body) {
    m.attachId = undefined
    return
  }

  if (body.localToWorldPoint) {
    const w = body.localToWorldPoint(m.localX, m.localY, m.localZ)
    m.x = w.x
    m.y = w.y
    m.z = w.z
  } else {
    const p = body.getPosition()
    const yaw = body.getYaw()
    const w = localToWorld(m.localX, m.localY, m.localZ, p.x, p.y, p.z, yaw)
    m.x = w.x
    m.y = w.y
    m.z = w.z
  }

  if (m.localNx != null && m.localNy != null && m.localNz != null) {
    if (body.localToWorldDir) {
      const n = body.localToWorldDir(m.localNx, m.localNy, m.localNz)
      m.nx = n.x
      m.ny = n.y
      m.nz = n.z
    } else {
      const n = rotateYaw(m.localNx, m.localNy, m.localNz, body.getYaw())
      m.nx = n.nx
      m.ny = n.ny
      m.nz = n.nz
    }
  }
}

/**
 * Age markers, integrate free spray, sync attached wounds.
 */
export function tickHitMarkers(dt: number) {
  let changed = false
  for (let i = markers.length - 1; i >= 0; i--) {
    const m = markers[i]!

    if (m.surface === 'blood_spray' && (m.vx != null || m.vy != null || m.vz != null)) {
      m.vx = (m.vx ?? 0) * (1 - Math.min(1, dt * 1.5))
      m.vy = (m.vy ?? 0) - 9.5 * dt
      m.vz = (m.vz ?? 0) * (1 - Math.min(1, dt * 1.5))
      m.x += (m.vx ?? 0) * dt
      m.y += (m.vy ?? 0) * dt
      m.z += (m.vz ?? 0) * dt
      // Stop on ground
      if (m.y < 0.03) {
        m.y = 0.03
        m.vy = 0
        m.vx = 0
        m.vz = 0
        m.nx = 0
        m.ny = 1
        m.nz = 0
        // Convert to short-lived ground splat
        if (m.surface === 'blood_spray') {
          m.surface = 'blood_splat'
          m.scale *= 1.8
          m.life = Math.min(m.life, 2.5)
          m.maxLife = m.life
        }
      }
    } else {
      syncMarkerToParent(m)
    }

    m.life -= dt
    if (m.life <= 0) {
      markers.splice(i, 1)
      changed = true
    }
  }
  if (changed) emit()
}
