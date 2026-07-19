/**
 * Equal-mass (50/50) soft push between player and zombies.
 * Both slow on contact; player can shove zombies aside while moving.
 */

import { PLAYER_RADIUS, ZOMBIE_RADIUS, WORLD_BOUNDS } from './constants'
import { moveAndCollide } from './collision'
import { collisionWorld } from './collisionWorld'

const EPS = 1e-6

export type PushBody = {
  id: string
  x: number
  z: number
  r: number
  /** Intentional / residual velocity (units/sec) */
  vx: number
  vz: number
}

/**
 * Resolve one equal-mass circle contact.
 * - Separates penetration 50/50
 * - Damps relative velocity along contact normal (both "slow down")
 * - Transfers half of the player's into-normal motion to the zombie (push aside)
 */
function resolvePair(
  player: PushBody,
  zombie: PushBody,
  dt: number,
): { player: PushBody; zombie: PushBody; touching: boolean } {
  let dx = zombie.x - player.x
  let dz = zombie.z - player.z
  let dist = Math.hypot(dx, dz)
  const minDist = player.r + zombie.r

  if (dist >= minDist - 0.001) {
    return { player, zombie, touching: false }
  }

  // Degenerate overlap — pick a sideways default
  if (dist < EPS) {
    dx = 1
    dz = 0
    dist = 1
  }

  const nx = dx / dist
  const nz = dz / dist

  // ── 50/50 positional separation ─────────────────────────────────
  const penetrate = minDist - dist
  const half = penetrate * 0.5
  let px = player.x - nx * half
  let pz = player.z - nz * half
  let zx = zombie.x + nx * half
  let zz = zombie.z + nz * half

  // ── Velocity along contact normal (player → zombie) ─────────────
  // Relative vel of player into zombie along normal
  const relN = (player.vx - zombie.vx) * nx + (player.vz - zombie.vz) * nz

  let pvx = player.vx
  let pvz = player.vz
  let zvx = zombie.vx
  let zvz = zombie.vz

  // Approaching or stacked: equal-mass impulse + shared slowdown
  if (relN > 0) {
    // Closing speed along normal — split so both lose half the closing component
    // After 50/50: each keeps own tangential; normal becomes average
    const pN = pvx * nx + pvz * nz
    const zN = zvx * nx + zvz * nz
    const avgN = (pN + zN) * 0.5

    // Remove each body's normal component, then apply shared average (damped)
    const damp = 0.55 // both feel sluggish while entangled
    pvx = pvx - pN * nx + avgN * damp * nx
    pvz = pvz - pN * nz + avgN * damp * nz
    zvx = zvx - zN * nx + avgN * damp * nx
    zvz = zvz - zN * nz + avgN * damp * nz

    // Extra shove: half of player's original into-normal goes to zombie
    // (player "wins" a bit of authority while still slowed)
    const shove = pN * 0.5
    if (shove > 0) {
      zvx += nx * shove
      zvz += nz * shove
    }
  }

  // Lateral slide: player's tangential velocity also nudges zombie aside (50%)
  const pN2 = player.vx * nx + player.vz * nz
  const pTx = player.vx - pN2 * nx
  const pTz = player.vz - pN2 * nz
  zvx += pTx * 0.5
  zvz += pTz * 0.5

  // Soft speed cap on zombie shove so they don't rocket
  const zSpd = Math.hypot(zvx, zvz)
  const zMax = 7
  if (zSpd > zMax) {
    zvx = (zvx / zSpd) * zMax
    zvz = (zvz / zSpd) * zMax
  }

  // Player slowdown while jammed (50% of intended when deeply overlapping)
  const jam = Math.min(1, penetrate / (minDist * 0.35))
  const playerSlow = 1 - 0.5 * jam
  pvx *= playerSlow
  pvz *= playerSlow

  // Apply residual velocity this frame as micro-separation for feel
  zx += zvx * dt * 0.15
  zz += zvz * dt * 0.15
  px += pvx * dt * 0.08
  pz += pvz * dt * 0.08

  return {
    player: { ...player, x: px, z: pz, vx: pvx, vz: pvz },
    zombie: { ...zombie, x: zx, z: zz, vx: zvx, vz: zvz },
    touching: true,
  }
}

/** Per-zombie external push velocity written by player resolve, read by AI */
const zombiePush = new Map<string, { vx: number; vz: number }>()

export function getZombiePush(id: string): { vx: number; vz: number } {
  return zombiePush.get(id) ?? { vx: 0, vz: 0 }
}

export function clearZombiePush(id: string) {
  zombiePush.delete(id)
}

/**
 * Weapon / explosion knockback — adds horizontal velocity to a zombie
 * (read by ZombieAI each frame via getZombiePush).
 */
export function applyHitImpulse(id: string, vx: number, vz: number, maxSpd = 14) {
  const cur = zombiePush.get(id) ?? { vx: 0, vz: 0 }
  let nvx = cur.vx + vx
  let nvz = cur.vz + vz
  const spd = Math.hypot(nvx, nvz)
  if (spd > maxSpd) {
    const s = maxSpd / spd
    nvx *= s
    nvz *= s
  }
  zombiePush.set(id, { vx: nvx, vz: nvz })
}

/**
 * After player intends a move, resolve soft 50/50 contacts with all zombies.
 * Returns adjusted player position + velocity. Writes push into zombiePush map.
 *
 * Player should collide with **statics only** before this (not hard-block on zombies).
 */
export function resolvePlayerAgainstZombies(
  playerX: number,
  playerZ: number,
  playerVx: number,
  playerVz: number,
  dt: number,
): { x: number; z: number; vx: number; vz: number } {
  let player: PushBody = {
    id: 'player',
    x: playerX,
    z: playerZ,
    r: PLAYER_RADIUS,
    vx: playerVx,
    vz: playerVz,
  }

  // Snapshot dynamics excluding player
  const agents = collisionWorld.listDynamics('player')

  for (const a of agents) {
    if (!a.id.startsWith('zombie')) continue

    const prior = zombiePush.get(a.id) ?? { vx: 0, vz: 0 }
    let zombie: PushBody = {
      id: a.id,
      x: a.x,
      z: a.z,
      r: a.r || ZOMBIE_RADIUS,
      vx: prior.vx,
      vz: prior.vz,
    }

    const out = resolvePair(player, zombie, dt)
    player = out.player

    if (out.touching) {
      // Clamp zombie into world + statics after shove
      let zx = out.zombie.x
      let zz = out.zombie.z
      zx = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, zx))
      zz = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, zz))
      const cleaned = moveAndCollide(zx, zz, ZOMBIE_RADIUS, 0, 0, collisionWorld.queryStatic())
      zombiePush.set(a.id, { vx: out.zombie.vx, vz: out.zombie.vz })
      // Update dynamic body so other systems see shoved position this frame
      collisionWorld.setDynamic(a.id, cleaned.x, cleaned.z, a.r || ZOMBIE_RADIUS)
    }
  }

  // Keep player in bounds / statics after soft push
  let x = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, player.x))
  let z = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, player.z))
  const cleaned = moveAndCollide(x, z, PLAYER_RADIUS, 0, 0, collisionWorld.queryStatic())
  return { x: cleaned.x, z: cleaned.z, vx: player.vx, vz: player.vz }
}

/** Decay residual shove on a zombie (call each AI frame) */
export function decayZombiePush(id: string, dt: number, rate = 5) {
  const p = zombiePush.get(id)
  if (!p) return
  const k = Math.exp(-rate * dt)
  p.vx *= k
  p.vz *= k
  if (Math.hypot(p.vx, p.vz) < 0.05) zombiePush.delete(id)
}
