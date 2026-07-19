/**
 * Impact markers: world bullet holes, flesh holes, blood splats, mist, spray.
 * Flesh markers attach to zombies and follow in local space while they move.
 */

import { damageables } from './damageables'
import {
  distToBoxSurface,
  limbVisualHalfForPose,
  type LimbId,
} from './limbs'

export type HitSurface =
  | 'world'
  | 'flesh' // legacy alias for blood_splat
  | 'bullet_hole' // dark entry wound on flesh / wood
  | 'blood_splat' // sticky red pool around wound
  | 'blood_mist' // brief expanding puff
  | 'blood_spray' // short-lived flying droplets
  | 'debris_wood'
  | 'debris_concrete'
  | 'debris_dirt'

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
/** Pool-aligned cap (imperative renderer uses 96 slots) */
const MAX_MARKERS = 96

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
  if (surface.startsWith('debris_')) return 0.55
  if (surface === 'bullet_hole') return 45
  if (surface === 'blood_splat' || surface === 'flesh') return 35
  return 14 // world
}

function defaultScale(surface: HitSurface): number {
  if (surface === 'bullet_hole') return 0.028
  if (surface === 'blood_splat' || surface === 'flesh') return 0.04
  if (surface === 'blood_mist') return 0.1
  if (surface === 'blood_spray') return 0.018
  if (surface.startsWith('debris_')) return 0.028
  return 0.04 // world hole
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

  // Sticky attach for wound layers (not free spray / debris)
  if (opts.attachId && opts.surface !== 'blood_spray' && !opts.surface.startsWith('debris_')) {
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

function normalize3(x: number, y: number, z: number) {
  const l = Math.hypot(x, y, z) || 1
  return { x: x / l, y: y / l, z: z / l }
}

/**
 * Layered wound FX that WRAPS around the hit limb visual surface:
 * dark hole at impact + ring of flat blood patches on the soft-box skin.
 * Hit spheres stay large for aim-feel; decals project onto SoftBox half-extents.
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
  /** Which limb was hit — drives visual box half-extents */
  limb?: LimbId
  /** head hits are larger / bloodier */
  head?: boolean
  /** melee leaves a wider slash-like splat */
  melee?: boolean
  /** Fewer wrap patches (multi-pellet aggregation) */
  compact?: boolean
}) {
  const { x, y, z, attachId } = opts
  const head = !!opts.head || opts.limb === 'head'
  const melee = !!opts.melee
  const compact = !!opts.compact
  const limb: LimbId = opts.limb ?? (head ? 'head' : 'torso')
  const body = damageables.get(attachId)
  const crawling = !!body?.crawling
  const hitR = Math.max(0.08, opts.radius ?? 0.16)

  // Resolve impact normal + limb center in world
  let nnx = opts.nx
  let nny = opts.ny
  let nnz = opts.nz
  let cx = opts.cx
  let cy = opts.cy
  let cz = opts.cz
  {
    const n0 = normalize3(nnx, nny, nnz)
    nnx = n0.x
    nny = n0.y
    nnz = n0.z
  }
  if (cx == null || cy == null || cz == null) {
    cx = x - nnx * hitR
    cy = y - nny * hitR
    cz = z - nnz * hitR
  } else {
    const dx = x - cx
    const dy = y - cy
    const dz = z - cz
    const dl = Math.hypot(dx, dy, dz) || 1
    nnx = dx / dl
    nny = dy / dl
    nnz = dz / dl
  }

  // Project onto visual soft-box in root-local axes (matches SoftBoxGeometry)
  const half = limbVisualHalfForPose(limb, crawling)
  let lnx = nnx
  let lny = nny
  let lnz = nnz
  if (body?.worldToLocalDir) {
    const d = body.worldToLocalDir(nnx, nny, nnz)
    lnx = d.x
    lny = d.y
    lnz = d.z
  }
  const skin = 0.0015
  const surfaceR = distToBoxSurface(lnx, lny, lnz, half.x, half.y, half.z)
  const ox = cx + nnx * (surfaceR + skin)
  const oy = cy + nny * (surfaceR + skin)
  const oz = cz + nnz * (surfaceR + skin)

  // Small sticky decals only — one hole + one blood ring, both on the mesh surface.
  // No wrap-around patches (those floated off thin limbs / looked like free circles).
  const holeScale = melee
    ? head
      ? 0.042
      : 0.034
    : head
      ? 0.032
      : compact
        ? 0.024
        : 0.026
  const splatScale = melee
    ? head
      ? 0.055
      : 0.045
    : head
      ? 0.042
      : compact
        ? 0.032
        : 0.036

  // ── Impact hole (on impact face only) ───────────────────────────
  spawnHitMarker({
    x: ox,
    y: oy,
    z: oz,
    nx: nnx,
    ny: nny,
    nz: nnz,
    surface: 'bullet_hole',
    scale: holeScale,
    attachId,
  })

  // Central sticky blood under the hole (same surface only)
  spawnHitMarker({
    x: ox,
    y: oy,
    z: oz,
    nx: nnx,
    ny: nny,
    nz: nnz,
    surface: 'blood_splat',
    scale: splatScale,
    attachId,
  })

  // Brief mist off the surface (not a sticky circle on empty space)
  spawnHitMarker({
    x: ox + nnx * 0.02,
    y: oy + nny * 0.02,
    z: oz + nnz * 0.02,
    nx: nnx,
    ny: nny,
    nz: nnz,
    surface: 'blood_mist',
    scale: head ? 0.12 : melee ? 0.1 : 0.07,
    life: head ? 0.4 : 0.28,
    attachId,
  })

  // Flying droplets (particles — fade out; do not leave large free-floating circles)
  const drops = compact ? (head ? 2 : 1) : head ? 4 : melee ? 3 : 1 + Math.floor(Math.random() * 2)
  for (let i = 0; i < drops; i++) {
    const spread = 0.9 + Math.random() * 1.4
    const speed = (head ? 1.8 : 1.2) + Math.random() * 1.6
    spawnHitMarker({
      x: ox + nnx * 0.012,
      y: oy + nny * 0.012,
      z: oz + nnz * 0.012,
      nx: nnx,
      ny: nny,
      nz: nnz,
      surface: 'blood_spray',
      scale: 0.012 + Math.random() * 0.014,
      life: 0.22 + Math.random() * 0.2,
      vx: nnx * speed + (Math.random() - 0.5) * spread,
      vy: nny * speed * 0.4 + 0.5 + Math.random() * 1.0,
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

    const flying = m.surface === 'blood_spray' || m.surface.startsWith('debris_')
    if (flying && (m.vx != null || m.vy != null || m.vz != null)) {
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
        // Tiny ground dab only — sticky circles stay on hit assets, not free air
        if (m.surface === 'blood_spray') {
          m.surface = 'blood_splat'
          m.scale = Math.min(m.scale * 1.35, 0.028)
          m.life = Math.min(m.life, 1.6)
          m.maxLife = m.life
        } else {
          // Debris settles and fades quickly
          m.life = Math.min(m.life, 0.6)
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
