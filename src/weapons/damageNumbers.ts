/**
 * Damage readouts that stick to the hit surface and lie flat on the limb/body.
 */

import { damageables } from './damageables'
import { localToWorld, worldToLocal } from './hitMarkers'

export type DamageFloater = {
  id: number
  /** Current world position */
  x: number
  y: number
  z: number
  /** Surface normal (outward) — text plane lies flat against the hit part */
  nx: number
  ny: number
  nz: number
  text: string
  color: string
  life: number
  maxLife: number
  scale: number
  /** Random in-plane roll so stacked hits don’t perfectly overlap */
  roll: number
  /** Stick to this zombie */
  attachId?: string
  localX?: number
  localY?: number
  localZ?: number
  localNx?: number
  localNy?: number
  localNz?: number
}

type Listener = () => void

let nextId = 1
const floaters: DamageFloater[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const fn of listeners) fn()
}

export function subscribeDamageNumbers(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getDamageFloaters(): readonly DamageFloater[] {
  return floaters
}

function rotateYaw(nx: number, ny: number, nz: number, yaw: number) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    nx: nx * c + nz * s,
    ny,
    nz: -nx * s + nz * c,
  }
}

export function spawnDamageNumber(opts: {
  x: number
  y: number
  z: number
  amount: number
  kind?: 'body' | 'limb' | 'head' | 'kill'
  /** Hit surface normal — keeps the number flat on the part */
  nx?: number
  ny?: number
  nz?: number
  /** Stick to zombie so it rides the body */
  attachId?: string
}) {
  const kind = opts.kind ?? 'body'
  const isHead = kind === 'head'
  const isKill = kind === 'kill'
  const text =
    isKill && isHead
      ? `HEADSHOT ${opts.amount}`
      : isKill
        ? `KILL ${opts.amount}`
        : `-${opts.amount}`

  let nx = opts.nx ?? 0
  let ny = opts.ny ?? 1
  let nz = opts.nz ?? 0
  const nlen = Math.hypot(nx, ny, nz) || 1
  nx /= nlen
  ny /= nlen
  nz /= nlen

  // Slight outward offset so the glyph sits on the surface, not inside the mesh
  const lift = 0.04
  const x = opts.x + nx * lift
  const y = opts.y + ny * lift
  const z = opts.z + nz * lift

  const f: DamageFloater = {
    id: nextId++,
    x,
    y,
    z,
    nx,
    ny,
    nz,
    text,
    color: isHead ? '#ffdd44' : isKill ? '#ff5533' : kind === 'limb' ? '#ffaa88' : '#ffffff',
    life: isHead || isKill ? 1.25 : 0.95,
    maxLife: isHead || isKill ? 1.25 : 0.95,
    scale: isHead ? 1.25 : isKill ? 1.15 : 0.95,
    roll: (Math.random() - 0.5) * 0.5,
  }

  if (opts.attachId) {
    const body = damageables.get(opts.attachId)
    if (body) {
      const p = body.getPosition()
      const yaw = body.getYaw()
      let local: { x: number; y: number; z: number }
      if (body.worldToLocalPoint) {
        local = body.worldToLocalPoint(x, y, z)
      } else {
        local = worldToLocal(x, y, z, p.x, p.y, p.z, yaw)
      }
      let ln: { nx: number; ny: number; nz: number }
      if (body.worldToLocalDir) {
        const d = body.worldToLocalDir(nx, ny, nz)
        ln = { nx: d.x, ny: d.y, nz: d.z }
      } else {
        ln = rotateYaw(nx, ny, nz, -yaw)
      }
      f.attachId = opts.attachId
      f.localX = local.x
      f.localY = local.y
      f.localZ = local.z
      f.localNx = ln.nx
      f.localNy = ln.ny
      f.localNz = ln.nz
    }
  }

  floaters.push(f)
  while (floaters.length > 40) floaters.shift()
  emit()
}

/** Keep sticky numbers glued to the zombie surface each frame */
export function syncDamageFloater(f: DamageFloater) {
  if (f.attachId == null || f.localX == null || f.localY == null || f.localZ == null) return

  const body = damageables.get(f.attachId)
  if (!body) {
    f.attachId = undefined
    return
  }

  if (body.localToWorldPoint) {
    const w = body.localToWorldPoint(f.localX, f.localY, f.localZ)
    f.x = w.x
    f.y = w.y
    f.z = w.z
  } else {
    const p = body.getPosition()
    const yaw = body.getYaw()
    const w = localToWorld(f.localX, f.localY, f.localZ, p.x, p.y, p.z, yaw)
    f.x = w.x
    f.y = w.y
    f.z = w.z
  }

  if (f.localNx != null && f.localNy != null && f.localNz != null) {
    if (body.localToWorldDir) {
      const n = body.localToWorldDir(f.localNx, f.localNy, f.localNz)
      f.nx = n.x
      f.ny = n.y
      f.nz = n.z
    } else {
      const n = rotateYaw(f.localNx, f.localNy, f.localNz, body.getYaw())
      f.nx = n.nx
      f.ny = n.ny
      f.nz = n.nz
    }
  }
}

export function tickDamageNumbers(dt: number) {
  let changed = false
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]!
    syncDamageFloater(f)
    f.life -= dt
    if (f.life <= 0) {
      floaters.splice(i, 1)
      changed = true
    }
  }
  if (changed) emit()
}
