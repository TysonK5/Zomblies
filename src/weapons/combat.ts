import * as THREE from 'three'
import type { WeaponDef } from './types'
import { damageables } from './damageables'
import { spawnHitMarker, spawnZombieWoundFx } from './hitMarkers'
import { spawnDamageNumber } from './damageNumbers'
import { limbLocalForPose, type LimbId } from './limbs'
import { getStaticWorldColliders } from '../game/worldColliders'
import { getGroundHeight } from '../game/ground'
import { applyHitImpulse } from '../game/agentPush'
import { audioManager } from '../game/audioManager'
import type { AabbCollider, CircleCollider, Collider } from '../game/collision'

const _origin = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _pelletDir = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _tmp = new THREE.Vector3()

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
  /** Optional surface hint for debris (wood / concrete / ground) */
  surfaceTag?: string
}

/**
 * Damage multiplier by distance for weapons with falloff curves.
 * 0–fullRange: 100%, full–mid: midMul, beyond mid: farMul.
 */
export function damageFalloffMul(def: WeaponDef, dist: number): number {
  const f = def.damageFalloff
  if (!f) return 1
  if (dist <= f.fullRange) return 1
  if (dist <= f.midRange) return f.midMul
  return f.farMul
}

/**
 * Build orthonormal right/up for a forward aim vector.
 */
function aimBasis(forward: THREE.Vector3) {
  _tmp.set(0, 1, 0)
  if (Math.abs(forward.dot(_tmp)) > 0.92) _tmp.set(1, 0, 0)
  _right.crossVectors(forward, _tmp).normalize()
  _up.crossVectors(_right, forward).normalize()
}

/**
 * Uniform circular sample inside a cone of half-angle `halfAngle` (radians)
 * around `forward`. Uses disk sampling (sqrt for uniform area).
 */
function sampleCircularCone(forward: THREE.Vector3, halfAngle: number, out: THREE.Vector3) {
  aimBasis(forward)
  const theta = Math.random() * Math.PI * 2
  const r = halfAngle * Math.sqrt(Math.random())
  out
    .copy(forward)
    .addScaledVector(_right, Math.cos(theta) * r)
    .addScaledVector(_up, Math.sin(theta) * r)
    .normalize()
}

/**
 * Shotgun pattern: 1 pellet near center + the rest evenly around a ring
 * with light jitter. Reads as a clear circular blast on walls / targets.
 */
function sampleShotgunCircle(
  forward: THREE.Vector3,
  halfAngle: number,
  index: number,
  count: number,
  out: THREE.Vector3,
) {
  aimBasis(forward)
  let theta: number
  let r: number
  if (count <= 1) {
    theta = 0
    r = 0
  } else if (index === 0) {
    // Center pellet — small random offset so it isn't a perfect bullseye every shot
    theta = Math.random() * Math.PI * 2
    r = halfAngle * 0.12 * Math.sqrt(Math.random())
  } else {
    // Evenly spaced ring pellets with slight angular / radial jitter
    const ringI = index - 1
    const ringN = count - 1
    const step = (Math.PI * 2) / ringN
    theta = ringI * step + (Math.random() - 0.5) * step * 0.35
    // Mostly outer ring so the circle silhouette is obvious
    r = halfAngle * (0.55 + Math.random() * 0.45)
  }
  out
    .copy(forward)
    .addScaledVector(_right, Math.cos(theta) * r)
    .addScaledVector(_up, Math.sin(theta) * r)
    .normalize()
}

type ZombieShotAcc = {
  dmgTotal: number
  killed: boolean
  head: boolean
  limb: LimbId
  hx: number
  hy: number
  hz: number
  nx: number
  ny: number
  nz: number
  cx: number
  cy: number
  cz: number
  radius: number
  impX: number
  impZ: number
  pellets: number
}

/**
 * Hitscan / melee: zombies (per-limb) then world (ground + building boxes).
 * Multi-pellet weapons aggregate FX / SFX / damage numbers per zombie per shot.
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
  const zombieAcc = new Map<string, ZombieShotAcc>()
  let worldHitSfx = false
  let worldMarkers = 0
  // One world decal per pellet so shotgun blasts read as the full pellet count
  // (was hard-capped at 3, which made multi-pellet guns look like 3-shot patterns)
  const maxWorldMarkers = pellets

  for (let p = 0; p < pellets; p++) {
    const dir = _pelletDir.copy(_dir)
    if (spread > 0) {
      if (def.circularSpread && pellets > 1) {
        // Shotguns: even circular ring + center (not a rectangular box)
        sampleShotgunCircle(_dir, spread, p, pellets, dir)
      } else if (def.circularSpread) {
        sampleCircularCone(_dir, spread, dir)
      } else {
        const mult = pellets > 1 ? 1 : 0.7
        dir.x += (Math.random() * 2 - 1) * spread * mult
        dir.y += (Math.random() * 2 - 1) * spread * mult * 0.55
        dir.z += (Math.random() * 2 - 1) * spread * mult
        dir.normalize()
      }
    }

    const hit = raycastAll(_origin, dir, def.range)
    if (!hit) continue
    hits++

    if (hit.kind === 'zombie' && hit.zombieId && hit.limb) {
      const body = damageables.get(hit.zombieId)
      if (!body || body.hp <= 0) continue

      const fallMul = damageFalloffMul(def, hit.t)
      const dmg = def.damage * fallMul

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

      // Apply HP silently — feedback is aggregated after the pellet loop
      const result = body.applyDamage(
        dmg,
        hit.limb,
        { x: hit.x, y: hit.y, z: hit.z },
        { silent: true },
      )

      let acc = zombieAcc.get(hit.zombieId)
      if (!acc) {
        acc = {
          dmgTotal: 0,
          killed: false,
          head: hit.limb === 'head',
          limb: hit.limb,
          hx: hit.x,
          hy: hit.y,
          hz: hit.z,
          nx: hit.nx,
          ny: hit.ny,
          nz: hit.nz,
          cx,
          cy,
          cz,
          radius: r,
          impX: 0,
          impZ: 0,
          pellets: 0,
        }
        zombieAcc.set(hit.zombieId, acc)
      }
      acc.dmgTotal += result.hpDamage
      acc.pellets += 1
      if (hit.limb === 'head') acc.head = true
      // Prefer later torso/head hits for display point; keep first otherwise
      if (hit.limb === 'head' || hit.limb === 'torso' || acc.pellets === 1) {
        acc.limb = hit.limb
        acc.hx = hit.x
        acc.hy = hit.y
        acc.hz = hit.z
        acc.nx = hit.nx
        acc.ny = hit.ny
        acc.nz = hit.nz
        acc.cx = cx
        acc.cy = cy
        acc.cz = cz
        acc.radius = r
      }
      if (result.killed) acc.killed = true
      if (def.hitImpulse && def.hitImpulse > 0) {
        const imp = def.hitImpulse * fallMul
        acc.impX += dir.x * imp
        acc.impZ += dir.z * imp
      }
      if (result.killed && !killed.includes(hit.zombieId)) {
        killed.push(hit.zombieId)
      }
    } else {
      // Cap world decals for multi-pellet blasts (still one SFX)
      if (worldMarkers < maxWorldMarkers) {
        worldMarkers++
        spawnHitMarker({
          x: hit.x,
          y: hit.y,
          z: hit.z,
          nx: hit.nx,
          ny: hit.ny,
          nz: hit.nz,
          surface: 'world',
          scale: def.kind === 'melee' ? 0.05 : 0.032,
        })
        if (worldMarkers === 1) spawnSurfaceDebris(hit, def)
      }
      if (!worldHitSfx) {
        worldHitSfx = true
        audioManager.play('world_hit', { volume: 0.55 })
      }
    }
  }

  // One wound band + one damage number + one hit SFX + impulse per zombie
  for (const [id, acc] of zombieAcc) {
    if (acc.dmgTotal > 0 || acc.pellets > 0) {
      spawnZombieWoundFx({
        x: acc.hx,
        y: acc.hy,
        z: acc.hz,
        nx: acc.nx,
        ny: acc.ny,
        nz: acc.nz,
        cx: acc.cx,
        cy: acc.cy,
        cz: acc.cz,
        radius: acc.radius,
        limb: acc.limb,
        attachId: id,
        head: acc.head,
        melee: def.kind === 'melee',
        compact: (def.pellets ?? 1) > 1,
      })
      audioManager.play('zombie_hit', {
        panX: acc.hx - _origin.x,
        volume: 0.75 + Math.min(0.25, acc.pellets * 0.03),
      })
    }
    if (acc.dmgTotal > 0) {
      const kind = acc.head
        ? 'head'
        : acc.killed
          ? 'kill'
          : acc.limb === 'torso'
            ? 'body'
            : 'limb'
      spawnDamageNumber({
        x: acc.hx,
        y: acc.hy,
        z: acc.hz,
        nx: acc.nx,
        ny: acc.ny,
        nz: acc.nz,
        attachId: id,
        amount: Math.max(1, Math.round(acc.dmgTotal)),
        kind: acc.killed && acc.head ? 'head' : acc.killed ? 'kill' : kind,
      })
    }
    if (acc.impX !== 0 || acc.impZ !== 0) {
      applyHitImpulse(id, acc.impX, acc.impZ)
    }
  }

  return { hits, killed }
}

/** Wood splinters / concrete dust / dirt chunks at world impacts */
function spawnSurfaceDebris(hit: HitResult, def: WeaponDef) {
  const tag = (hit.surfaceTag ?? '').toLowerCase()
  const isWood =
    tag.includes('fence') ||
    tag.includes('barn') ||
    tag.includes('house') ||
    tag.includes('tree') ||
    tag.includes('hay') ||
    tag.includes('gate') ||
    tag.includes('outhouse')
  const isConcrete =
    tag.includes('silo') || tag.includes('lamp') || tag.includes('trough') || hit.ny < 0.4
  const count = def.pellets && def.pellets > 1 ? 2 : 3

  for (let i = 0; i < count; i++) {
    const speed = 1.2 + Math.random() * 2.5
    spawnHitMarker({
      x: hit.x + hit.nx * 0.03,
      y: hit.y + hit.ny * 0.03,
      z: hit.z + hit.nz * 0.03,
      nx: hit.nx,
      ny: hit.ny,
      nz: hit.nz,
      surface: isWood ? 'debris_wood' : isConcrete ? 'debris_concrete' : 'debris_dirt',
      scale: 0.03 + Math.random() * 0.04,
      life: 0.45 + Math.random() * 0.4,
      vx: hit.nx * speed + (Math.random() - 0.5) * 1.5,
      vy: hit.ny * speed * 0.4 + 1.2 + Math.random() * 1.8,
      vz: hit.nz * speed + (Math.random() - 0.5) * 1.5,
    })
  }
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
          surfaceTag: 'ground',
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
    surfaceTag: box.label ?? 'world',
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
    surfaceTag: c.label ?? 'world',
  }
}
