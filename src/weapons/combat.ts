import * as THREE from 'three'
import type { WeaponDef } from './types'
import { damageables } from './damageables'
import { spawnHitMarker, spawnZombieWoundFx } from './hitMarkers'
import { spawnDamageNumber } from './damageNumbers'
import { limbLocalForPose, type LimbId } from './limbs'
import { getStaticWorldColliders } from '../game/worldColliders'
import { getGroundHeight } from '../game/ground'
import type { AabbCollider, CircleCollider, Collider } from '../game/collision'

const _origin = new THREE.Vector3()
const _dir = new THREE.Vector3()

type HitResult = {
  t: number
  x: number
  y: number
  z: number
  nx: number
  ny: number
  nz: number
  kind: 'world' | 'zombie'
  zombieId?: string
  limb?: LimbId
}

/**
 * Hitscan / melee: zombies (per-limb) then world (ground + building boxes).
 * Spawns visible impact markers on every hit.
 */
export function fireWeapon(
  camera: THREE.Camera,
  def: WeaponDef,
  didConsumeAmmo: boolean,
): { hits: number; killed: string[] } {
  if (def.kind === 'gun' && !didConsumeAmmo) {
    return { hits: 0, killed: [] }
  }

  camera.getWorldPosition(_origin)
  camera.getWorldDirection(_dir)

  const pellets = def.kind === 'melee' ? 1 : def.pellets ?? 1
  const spread = def.spread ?? 0
  let hits = 0
  const killed: string[] = []

  for (let p = 0; p < pellets; p++) {
    const dir = _dir.clone()
    if (spread > 0) {
      const mult = pellets > 1 ? 1 : 0.7
      dir.x += (Math.random() * 2 - 1) * spread * mult
      dir.y += (Math.random() * 2 - 1) * spread * mult * 0.55
      dir.z += (Math.random() * 2 - 1) * spread * mult
      dir.normalize()
    }

    const hit = raycastAll(_origin, dir, def.range)
    if (!hit) continue
    hits++

    if (hit.kind === 'zombie' && hit.zombieId && hit.limb) {
      const body = damageables.get(hit.zombieId)
      if (!body || body.hp <= 0) continue

      // Limb sphere center + radius so blood patches wrap the curved surface
      const layout = limbLocalForPose(!!body.crawling)
      const limbSphere = layout[hit.limb]
      const r = limbSphere.r * (body.crawling ? 1.15 : 1)
      let cx = hit.x - hit.nx * r
      let cy = hit.y - hit.ny * r
      let cz = hit.z - hit.nz * r
      if (body.localToWorldPoint) {
        const c = body.localToWorldPoint(limbSphere.x, limbSphere.y, limbSphere.z)
        cx = c.x
        cy = c.y
        cz = c.z
      }

      // Hole + blood band that wraps around the limb/torso sphere
      spawnZombieWoundFx({
        x: hit.x,
        y: hit.y,
        z: hit.z,
        nx: hit.nx,
        ny: hit.ny,
        nz: hit.nz,
        cx,
        cy,
        cz,
        radius: r,
        attachId: hit.zombieId,
        head: hit.limb === 'head',
        melee: def.kind === 'melee',
      })

      const result = body.applyDamage(def.damage, hit.limb, {
        x: hit.x,
        y: hit.y,
        z: hit.z,
      })
      if (result.hpDamage > 0) {
        const kind =
          hit.limb === 'head' ? 'head' : result.killed ? 'kill' : hit.limb === 'torso' ? 'body' : 'limb'
        // Stick flat on the hit surface (not floating billboard off the body)
        spawnDamageNumber({
          x: hit.x,
          y: hit.y,
          z: hit.z,
          nx: hit.nx,
          ny: hit.ny,
          nz: hit.nz,
          attachId: hit.zombieId,
          amount: result.hpDamage,
          kind: result.killed && hit.limb === 'head' ? 'head' : result.killed ? 'kill' : kind,
        })
      }
      if (result.killed && !killed.includes(hit.zombieId)) {
        killed.push(hit.zombieId)
      }
    } else {
      // World / surface impact
      spawnHitMarker({
        x: hit.x,
        y: hit.y,
        z: hit.z,
        nx: hit.nx,
        ny: hit.ny,
        nz: hit.nz,
        surface: 'world',
        scale: def.kind === 'melee' ? 0.16 : 0.09,
      })
    }
  }

  return { hits, killed }
}

function raycastAll(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): HitResult | null {
  let best: HitResult | null = null
  let bestT = maxDist

  // Zombies first preference only if closer than world
  const zHit = raycastZombieLimbs(origin, dir, maxDist)
  if (zHit && zHit.t < bestT) {
    best = zHit
    bestT = zHit.t
  }

  const wHit = raycastWorld(origin, dir, maxDist)
  if (wHit && wHit.t < bestT) {
    best = wHit
    bestT = wHit.t
  }

  return best
}

/** Prefer head, then torso over extremities when distances are nearly equal */
const LIMB_PRIORITY: Record<LimbId, number> = {
  head: 3,
  torso: 2,
  armL: 1,
  armR: 1,
  legL: 1,
  legR: 1,
}

function raycastZombieLimbs(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  maxDist: number,
): HitResult | null {
  let bestT = maxDist
  let bestPri = -1
  let best: HitResult | null = null

  for (const [id, body] of damageables) {
    if (body.hp <= 0) continue
    const crawling = !!body.crawling
    const layout = limbLocalForPose(crawling)
    const pos = body.getPosition()
    const yaw = body.getYaw()

    for (const limb of Object.keys(layout) as LimbId[]) {
      if (!body.limbs[limb]) continue
      const local = layout[limb]

      // Prefer full root transform (crawl visual lives under root local space)
      let wx: number
      let wy: number
      let wz: number
      if (body.localToWorldPoint) {
        const w = body.localToWorldPoint(local.x, local.y, local.z)
        wx = w.x
        wy = w.y
        wz = w.z
      } else {
        const cos = Math.cos(yaw)
        const sin = Math.sin(yaw)
        wx = pos.x + local.x * cos + local.z * sin
        wy = pos.y + local.y
        wz = pos.z - local.x * sin + local.z * cos
      }
      // Slightly larger spheres while crawling (body is flatter / harder to aim)
      const r = crawling ? local.r * 1.15 : local.r

      const t = raySphere(origin, dir, wx, wy, wz, r)
      if (t === null || t < 0.05 || t > maxDist) continue

      const pri = LIMB_PRIORITY[limb]
      let take = false
      if (best === null) take = true
      else if (t < bestT - 0.12) take = true
      else if (Math.abs(t - bestT) <= 0.12 && pri > bestPri) take = true
      else if (t < bestT && pri >= bestPri) take = true
      if (!take) continue

      bestT = t
      bestPri = pri
      const hx = origin.x + dir.x * t
      const hy = origin.y + dir.y * t
      const hz = origin.z + dir.z * t
      let nx = hx - wx
      let ny = hy - wy
      let nz = hz - wz
      const nl = Math.hypot(nx, ny, nz) || 1
      nx /= nl
      ny /= nl
      nz /= nl
      best = {
        t,
        x: hx,
        y: hy,
        z: hz,
        nx,
        ny,
        nz,
        kind: 'zombie',
        zombieId: id,
        limb,
      }
    }
  }
  return best
}

function raySphere(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  cx: number,
  cy: number,
  cz: number,
  r: number,
): number | null {
  const ox = origin.x - cx
  const oy = origin.y - cy
  const oz = origin.z - cz
  const a = dir.dot(dir)
  const b = 2 * (ox * dir.x + oy * dir.y + oz * dir.z)
  const c = ox * ox + oy * oy + oz * oz - r * r
  const disc = b * b - 4 * a * c
  if (disc < 0) return null
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return t
}

function raycastWorld(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): HitResult | null {
  let bestT = maxDist
  let best: HitResult | null = null

  // Ground surface (flat now; height field / pads later via getGroundHeight)
  if (Math.abs(dir.y) > 1e-6) {
    // Iterate once with height at hit XZ (good enough for gentle slopes)
    const t0 = (0 - origin.y) / dir.y
    if (t0 > 0.05 && t0 < maxDist) {
      const hx = origin.x + dir.x * t0
      const hz = origin.z + dir.z * t0
      const gy = getGroundHeight(hx, hz)
      const t = (gy - origin.y) / dir.y
      if (t > 0.05 && t < bestT) {
        bestT = t
        best = {
          t,
          x: origin.x + dir.x * t,
          y: gy + 0.02,
          z: origin.z + dir.z * t,
          nx: 0,
          ny: 1,
          nz: 0,
          kind: 'world',
        }
      }
    }
  }

  const solids = getStaticWorldColliders()
  for (const c of solids) {
    const hit = raycastCollider(origin, dir, c, maxDist)
    if (hit && hit.t > 0.05 && hit.t < bestT) {
      bestT = hit.t
      best = hit
    }
  }

  return best
}

function heightForCollider(c: Collider): number {
  const label = c.label ?? ''
  if (label.includes('barn')) return 9
  if (label.includes('farmhouse')) return 7.5
  if (label.includes('silo')) return 10
  if (label.includes('fence') || label.includes('gate')) return 1.6
  if (label.includes('tree')) return 5
  if (label.includes('hay')) return 1.3
  if (label.includes('trough')) return 0.8
  if (label.includes('outhouse')) return 2.6
  if (label.includes('lamp')) return 3.2
  if (label.includes('corn')) return 1.8
  return 2.5
}

function raycastCollider(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  c: Collider,
  maxDist: number,
): HitResult | null {
  if (c.type === 'aabb') {
    return rayAABB3D(origin, dir, c, heightForCollider(c), maxDist)
  }
  return rayCircleWall(origin, dir, c, heightForCollider(c), maxDist)
}

/** Vertical prism from XZ AABB */
function rayAABB3D(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  box: AabbCollider,
  height: number,
  maxDist: number,
): HitResult | null {
  const minX = box.minX
  const maxX = box.maxX
  const minY = 0
  const maxY = height
  const minZ = box.minZ
  const maxZ = box.maxZ

  let tmin = 0
  let tmax = maxDist
  let nx = 0
  let ny = 0
  let nz = 0

  // X slab
  if (Math.abs(dir.x) < 1e-8) {
    if (origin.x < minX || origin.x > maxX) return null
  } else {
    let t1 = (minX - origin.x) / dir.x
    let t2 = (maxX - origin.x) / dir.x
    let n1 = -1
    let n2 = 1
    if (t1 > t2) {
      ;[t1, t2] = [t2, t1]
      ;[n1, n2] = [n2, n1]
    }
    if (t1 > tmin) {
      tmin = t1
      nx = n1
      ny = 0
      nz = 0
    }
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }

  // Y slab
  if (Math.abs(dir.y) < 1e-8) {
    if (origin.y < minY || origin.y > maxY) return null
  } else {
    let t1 = (minY - origin.y) / dir.y
    let t2 = (maxY - origin.y) / dir.y
    let n1 = -1
    let n2 = 1
    if (t1 > t2) {
      ;[t1, t2] = [t2, t1]
      ;[n1, n2] = [n2, n1]
    }
    if (t1 > tmin) {
      tmin = t1
      nx = 0
      ny = n1
      nz = 0
    }
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }

  // Z slab
  if (Math.abs(dir.z) < 1e-8) {
    if (origin.z < minZ || origin.z > maxZ) return null
  } else {
    let t1 = (minZ - origin.z) / dir.z
    let t2 = (maxZ - origin.z) / dir.z
    let n1 = -1
    let n2 = 1
    if (t1 > t2) {
      ;[t1, t2] = [t2, t1]
      ;[n1, n2] = [n2, n1]
    }
    if (t1 > tmin) {
      tmin = t1
      nx = 0
      ny = 0
      nz = n1
    }
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }

  if (tmin < 0.05 || tmin > maxDist) return null
  return {
    t: tmin,
    x: origin.x + dir.x * tmin,
    y: origin.y + dir.y * tmin,
    z: origin.z + dir.z * tmin,
    nx,
    ny,
    nz,
    kind: 'world',
  }
}

/** Vertical capsule / cylinder for trees, posts */
function rayCircleWall(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  c: CircleCollider,
  height: number,
  maxDist: number,
): HitResult | null {
  // Infinite cylinder on Y, then clamp height
  const ox = origin.x - c.x
  const oz = origin.z - c.z
  const a = dir.x * dir.x + dir.z * dir.z
  if (a < 1e-10) return null
  const b = 2 * (ox * dir.x + oz * dir.z)
  const cc = ox * ox + oz * oz - c.r * c.r
  const disc = b * b - 4 * a * cc
  if (disc < 0) return null
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  if (t < 0.05 || t > maxDist) return null
  const y = origin.y + dir.y * t
  if (y < 0 || y > height) return null
  const hx = origin.x + dir.x * t
  const hz = origin.z + dir.z * t
  let nx = hx - c.x
  let nz = hz - c.z
  const nl = Math.hypot(nx, nz) || 1
  nx /= nl
  nz /= nl
  return {
    t,
    x: hx,
    y,
    z: hz,
    nx,
    ny: 0,
    nz,
    kind: 'world',
  }
}
