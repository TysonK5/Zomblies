/**
 * Transient impact markers (bullet holes, blood splats).
 * Flesh markers can attach to a moving zombie and follow in local space.
 */

import { damageables } from './damageables'

export type HitSurface = 'world' | 'flesh' | 'blood_mist'

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
}

type Listener = () => void

let nextId = 1
const markers: HitMarker[] = []
const listeners = new Set<Listener>()
const MAX_MARKERS = 80

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
}) {
  let nx = opts.nx ?? 0
  let ny = opts.ny ?? 1
  let nz = opts.nz ?? 0
  const len = Math.hypot(nx, ny, nz) || 1
  nx /= len
  ny /= len
  nz /= len

  const m: HitMarker = {
    id: nextId++,
    x: opts.x,
    y: opts.y,
    z: opts.z,
    nx,
    ny,
    nz,
    surface: opts.surface,
    life: opts.life ?? (opts.surface === 'blood_mist' ? 0.45 : 10),
    maxLife: opts.life ?? (opts.surface === 'blood_mist' ? 0.45 : 10),
    scale: opts.scale ?? (opts.surface === 'flesh' ? 0.14 : 0.1),
  }

  if (opts.attachId) {
    const body = damageables.get(opts.attachId)
    if (body) {
      const p = body.getPosition()
      const yaw = body.getYaw()
      const local = worldToLocal(opts.x, opts.y, opts.z, p.x, p.y, p.z, yaw)
      // Inverse-rotate normal into local
      const ln = rotateYaw(nx, ny, nz, -yaw)
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
 * Age markers. World poses for attached hits are updated in HitDecal via syncMarkerToParent.
 */
export function tickHitMarkers(dt: number) {
  let changed = false
  for (let i = markers.length - 1; i >= 0; i--) {
    const m = markers[i]!
    // Keep attached markers synced even during age tick
    syncMarkerToParent(m)
    m.life -= dt
    if (m.life <= 0) {
      markers.splice(i, 1)
      changed = true
    }
  }
  if (changed) emit()
}
