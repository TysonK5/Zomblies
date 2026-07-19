import { useEffect, useId, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ZombieModel } from './ZombieModel'
import type { ZombieAppearance } from './types'
import { playerState } from '../game/playerState'
import {
  WORLD_BOUNDS,
  ZOMBIE_RADIUS,
  ZOMBIE_REACTION_LAG,
  ZOMBIE_STOP_DISTANCE,
} from '../game/constants'
import { moveAndCollide } from '../game/collision'
import { collisionWorld } from '../game/collisionWorld'
import { clearZombiePush, decayZombiePush, getZombiePush } from '../game/agentPush'
import { getGroundHeight } from '../game/ground'
import { getGameSettings } from '../game/gameSettings'
import { registerDamageable, unregisterDamageable } from '../weapons/damageables'
import { fullLimbs, LIMB_LOCAL, limbDamageResult, type LimbId, type LimbState } from '../weapons/limbs'
import { HeadExplosion, LimbGib } from './Gibs'
import { spawnHitMarker } from '../weapons/hitMarkers'
import { audioManager } from '../game/audioManager'
import { ZombieHealthBar } from '../components/ZombieHealthBar'

const ZOMBIE_MAX_HP = 100

export type ZombieAIProps = {
  appearance: ZombieAppearance
  position: [number, number, number]
  rotationY?: number
  speedScale?: number
  reactionJitter?: number
  scale?: number
  active?: boolean
}

type Gib = {
  key: string
  limb: LimbId
  pos: [number, number, number]
  vel: [number, number, number]
  color: string
}

/**
 * Chase AI with per-limb damage, dismemberment, and death.
 */
export function ZombieAI({
  appearance,
  position,
  rotationY = 0,
  speedScale = 1,
  reactionJitter = 0,
  scale = 1,
  active = true,
}: ZombieAIProps) {
  const reactId = useId()
  const bodyId = `zombie-${reactId}`
  const root = useRef<THREE.Group>(null)
  const pos = useRef(new THREE.Vector3(position[0], position[1], position[2]))
  const yaw = useRef(rotationY)
  const hp = useRef(ZOMBIE_MAX_HP)
  const dead = useRef(false)
  const deathT = useRef(0)
  const limbsRef = useRef<LimbState>(fullLimbs())
  const dmgBodyRef = useRef<{ crawling?: boolean; limbs: LimbState } | null>(null)
  const movingRef = useRef(false)
  const gaitRef = useRef(0)
  /** Actual horizontal speed after collision (world units / sec) */
  const speedRef = useRef(0)
  const groanTimer = useRef(2 + Math.random() * 4)
  /** Cached inverted root matrix for wound attaches (1 invert / frame) */
  const invMatRef = useRef(new THREE.Matrix4())
  const invValidRef = useRef(false)
  const [limbs, setLimbs] = useState<LimbState>(() => fullLimbs())
  const [isDead, setIsDead] = useState(false)
  const [hpDisplay, setHpDisplay] = useState(ZOMBIE_MAX_HP)
  const [gibs, setGibs] = useState<Gib[]>([])
  const [headBoom, setHeadBoom] = useState<[number, number, number] | null>(null)

  const lag = ZOMBIE_REACTION_LAG + reactionJitter + appearance.seed * 0.04
  const scaleClamped = THREE.MathUtils.clamp(speedScale, 0.05, 1.5)
  const crawl = !limbs.legL && !limbs.legR

  // Keep combat hitboxes on crawl layout as soon as both legs are gone
  useEffect(() => {
    if (dmgBodyRef.current) {
      dmgBodyRef.current.crawling = crawl && !isDead
      dmgBodyRef.current.limbs = limbsRef.current
    }
  }, [crawl, isDead, limbs])

  useEffect(() => {
    const cleared = moveAndCollide(
      pos.current.x,
      pos.current.z,
      ZOMBIE_RADIUS,
      0,
      0,
      collisionWorld.queryStatic(),
    )
    pos.current.x = cleared.x
    pos.current.z = cleared.z
    pos.current.y = getGroundHeight(pos.current.x, pos.current.z)
    collisionWorld.setDynamic(bodyId, pos.current.x, pos.current.z, ZOMBIE_RADIUS)

    const _lp = new THREE.Vector3()
    const _ld = new THREE.Vector3()
    let hpUiScheduled = false

    const dmgBody = {
      id: bodyId,
      radius: 0.45,
      height: 1.75,
      hp: ZOMBIE_MAX_HP,
      maxHp: ZOMBIE_MAX_HP,
      limbs: limbsRef.current,
      crawling: false,
      getPosition: () => ({ x: pos.current.x, y: pos.current.y, z: pos.current.z }),
      getYaw: () => yaw.current,
      // Full root transform so blood decals follow walk + death tip-over
      localToWorldPoint: (lx: number, ly: number, lz: number) => {
        const g = root.current
        if (g) {
          _lp.set(lx, ly, lz)
          g.localToWorld(_lp)
          return { x: _lp.x, y: _lp.y, z: _lp.z }
        }
        const c = Math.cos(yaw.current)
        const s = Math.sin(yaw.current)
        return {
          x: pos.current.x + lx * c + lz * s,
          y: pos.current.y + ly,
          z: pos.current.z - lx * s + lz * c,
        }
      },
      localToWorldDir: (nx: number, ny: number, nz: number) => {
        const g = root.current
        if (g) {
          _ld.set(nx, ny, nz).transformDirection(g.matrixWorld)
          return { x: _ld.x, y: _ld.y, z: _ld.z }
        }
        const c = Math.cos(yaw.current)
        const s = Math.sin(yaw.current)
        return {
          x: nx * c + nz * s,
          y: ny,
          z: -nx * s + nz * c,
        }
      },
      worldToLocalPoint: (wx: number, wy: number, wz: number) => {
        const g = root.current
        if (g) {
          _lp.set(wx, wy, wz)
          g.worldToLocal(_lp)
          return { x: _lp.x, y: _lp.y, z: _lp.z }
        }
        const dx = wx - pos.current.x
        const dy = wy - pos.current.y
        const dz = wz - pos.current.z
        const c = Math.cos(-yaw.current)
        const s = Math.sin(-yaw.current)
        return { x: dx * c - dz * s, y: dy, z: dx * s + dz * c }
      },
      worldToLocalDir: (nx: number, ny: number, nz: number) => {
        const g = root.current
        if (g) {
          // Reuse inverted matrix across multi-pellet wound attaches in one frame
          if (!invValidRef.current) {
            invMatRef.current.copy(g.matrixWorld).invert()
            invValidRef.current = true
          }
          _ld.set(nx, ny, nz).transformDirection(invMatRef.current)
          return { x: _ld.x, y: _ld.y, z: _ld.z }
        }
        const c = Math.cos(-yaw.current)
        const s = Math.sin(-yaw.current)
        return { x: nx * c - nz * s, y: ny, z: nx * s + nz * c }
      },
      applyDamage: (
        amount: number,
        limb?: LimbId,
        hitPoint?: { x: number; y: number; z: number },
        opts?: { silent?: boolean },
      ) => {
        if (dead.current) {
          return { killed: false, hp: 0, hpDamage: 0, limbs: limbsRef.current }
        }

        // Missing extremity: fall through to torso so chest shots still apply HP
        let targetLimb: LimbId = limb ?? 'torso'
        if (!limbsRef.current[targetLimb] && targetLimb !== 'torso') {
          targetLimb = 'torso'
        }

        const result = limbDamageResult(targetLimb, amount)
        const applied = result.hpDamage
        dmgBody.hp = Math.max(0, dmgBody.hp - applied)
        hp.current = dmgBody.hp
        // Batch React HP bar updates (shotgun multi-pellet)
        if (!hpUiScheduled) {
          hpUiScheduled = true
          queueMicrotask(() => {
            hpUiScheduled = false
            setHpDisplay(hp.current)
          })
        }

        if (applied > 0 && !opts?.silent) {
          const panX = (hitPoint?.x ?? pos.current.x) - playerState.x
          audioManager.play('zombie_hit', { panX, volume: 0.7 + Math.random() * 0.3 })
        }

        let limbDestroyed: LimbId | undefined
        if (result.destroyLimb && limbsRef.current[targetLimb] && targetLimb !== 'torso') {
          limbsRef.current = { ...limbsRef.current, [targetLimb]: false }
          dmgBody.limbs = limbsRef.current
          dmgBody.crawling = !limbsRef.current.legL && !limbsRef.current.legR
          limbDestroyed = targetLimb
          setLimbs({ ...limbsRef.current })

          // Spawn flying gib
          const local = LIMB_LOCAL[targetLimb]
          const cos = Math.cos(yaw.current)
          const sin = Math.sin(yaw.current)
          const gx = pos.current.x + local.x * cos + local.z * sin
          const gy = pos.current.y + local.y
          const gz = pos.current.z - local.x * sin + local.z * cos
          const outward = new THREE.Vector3(gx - pos.current.x, 0.5, gz - pos.current.z).normalize()
          const color =
            targetLimb === 'head' || targetLimb.startsWith('arm')
              ? appearance.skin
              : targetLimb.startsWith('leg')
                ? appearance.pants
                : appearance.shirt

          if (targetLimb === 'head') {
            setHeadBoom([gx, gy, gz])
            // Extra blood spray (attached so it rides the corpse briefly)
            for (let i = 0; i < 5; i++) {
              spawnHitMarker({
                x: gx + (Math.random() - 0.5) * 0.3,
                y: gy + Math.random() * 0.2,
                z: gz + (Math.random() - 0.5) * 0.3,
                nx: 0,
                ny: 1,
                nz: 0,
                surface: 'blood_mist',
                scale: 0.2 + Math.random() * 0.2,
                life: 0.5,
                attachId: bodyId,
              })
            }
          } else {
            setGibs((g) => [
              ...g,
              {
                key: `${targetLimb}-${Date.now()}-${Math.random()}`,
                limb: targetLimb,
                pos: [gx, gy, gz],
                vel: [
                  outward.x * (2 + Math.random() * 3) + (Math.random() - 0.5),
                  2 + Math.random() * 3,
                  outward.z * (2 + Math.random() * 3) + (Math.random() - 0.5),
                ],
                color,
              },
            ])
          }

          if (hitPoint) {
            // Pull stump wounds onto visual soft-box (hit sphere is larger than mesh)
            const stump = LIMB_LOCAL[targetLimb]
            const sc = dmgBody.localToWorldPoint
              ? dmgBody.localToWorldPoint(stump.x, stump.y, stump.z)
              : {
                  x: pos.current.x + stump.x * cos + stump.z * sin,
                  y: pos.current.y + stump.y,
                  z: pos.current.z - stump.x * sin + stump.z * cos,
                }
            let snx = hitPoint.x - sc.x
            let sny = hitPoint.y - sc.y
            let snz = hitPoint.z - sc.z
            const snl = Math.hypot(snx, sny, snz) || 1
            snx /= snl
            sny /= snl
            snz /= snl
            // ~visual cross-section of limb (see LIMB_VISUAL_HALF)
            const stumpR = targetLimb === 'head' ? 0.15 : 0.07
            const sx = sc.x + snx * (stumpR + 0.002)
            const sy = sc.y + sny * (stumpR + 0.002)
            const sz = sc.z + snz * (stumpR + 0.002)
            spawnHitMarker({
              x: sx,
              y: sy,
              z: sz,
              nx: snx,
              ny: sny,
              nz: snz,
              surface: 'bullet_hole',
              scale: 0.036,
              attachId: bodyId,
            })
            spawnHitMarker({
              x: sx,
              y: sy,
              z: sz,
              nx: snx,
              ny: sny,
              nz: snz,
              surface: 'blood_splat',
              scale: 0.048,
              attachId: bodyId,
            })
          }
        }

        const kill = result.kill || dmgBody.hp <= 0 || !limbsRef.current.head
        if (kill) {
          dead.current = true
          deathT.current = 0
          dmgBody.hp = 0
          audioManager.play('zombie_death', {
            panX: pos.current.x - playerState.x,
            volume: 0.85,
          })
          setHpDisplay(0)
          setIsDead(true)
          // Keep damageable registered so hit decals can follow the corpse pose
          collisionWorld.removeDynamic(bodyId)
          return {
            killed: true,
            hp: 0,
            hpDamage: applied,
            limb: targetLimb,
            limbDestroyed,
            limbs: limbsRef.current,
          }
        }

        return {
          killed: false,
          hp: dmgBody.hp,
          hpDamage: applied,
          limb: targetLimb,
          limbDestroyed,
          limbs: limbsRef.current,
        }
      },
    }
    dmgBodyRef.current = dmgBody
    dmgBody.crawling = !limbsRef.current.legL && !limbsRef.current.legR
    registerDamageable(dmgBody)

    return () => {
      dmgBodyRef.current = null
      clearZombiePush(bodyId)
      collisionWorld.removeDynamic(bodyId)
      unregisterDamageable(bodyId)
    }
  }, [bodyId, appearance.skin, appearance.pants, appearance.shirt])

  useFrame((_, delta) => {
    const group = root.current
    if (!group) return

    const dt = Math.min(delta, 0.05)
    invValidRef.current = false

    if (dead.current) {
      deathT.current += dt
      // Tip onto back (+local Z) around feet; lift so body rests ON ground, not through it
      const fall = Math.min(1, deathT.current * 2.0)
      const angle = fall * (Math.PI / 2)
      const groundY = getGroundHeight(pos.current.x, pos.current.z)
      // Standing height ~1.8; after tip, half-thickness sits above surface
      // Lift increases with fall so mid-animation doesn't dig in either
      const bodyThickness = 0.28
      const lift = Math.sin(angle) * bodyThickness * 0.55 + fall * 0.06

      group.rotation.order = 'YXZ'
      group.rotation.y = yaw.current
      group.rotation.x = angle
      group.rotation.z = 0
      group.position.x = pos.current.x
      group.position.z = pos.current.z
      group.position.y = groundY + lift
      // Slight forward slide so the torso lands where the body was, not under feet
      const slide = Math.sin(angle) * 0.55
      group.position.x += Math.sin(yaw.current) * slide
      group.position.z += Math.cos(yaw.current) * slide
      return
    }

    if (!active) return

    // Occasional groan when near the player
    groanTimer.current -= dt
    if (groanTimer.current <= 0) {
      groanTimer.current = 4 + Math.random() * 7
      const dPlayer = Math.hypot(pos.current.x - playerState.x, pos.current.z - playerState.z)
      if (dPlayer < 28) {
        audioManager.play('zombie_groan', {
          panX: pos.current.x - playerState.x,
          volume: Math.max(0.12, 0.45 * (1 - dPlayer / 28)),
        })
      }
    }

    // Speed penalty without legs / arms
    let speedMul = 1
    if (crawl) speedMul = 0.28
    else if (!limbs.legL || !limbs.legR) speedMul = 0.55
    if (!limbs.armL && !limbs.armR) speedMul *= 0.95

    const maxSpeed = getGameSettings().zombieRunSpeed * scaleClamped * speedMul
    const target = playerState.getLaggedPosition(lag)

    const dx = target.x - pos.current.x
    const dz = target.z - pos.current.z
    const dist = Math.hypot(dx, dz)

    let moveX = 0
    let moveZ = 0
    let isMoving = false
    let gait = 0

    if (dist > ZOMBIE_STOP_DISTANCE) {
      const inv = 1 / dist
      const step = Math.min(maxSpeed * dt, dist - ZOMBIE_STOP_DISTANCE * 0.5)
      moveX = dx * inv * step
      moveZ = dz * inv * step
      isMoving = step > 0.0005
      gait = maxSpeed > 1e-6 ? Math.min(1, step / (maxSpeed * dt || 1e-6)) : 0

      const desiredYaw = Math.atan2(dx, dz)
      const turnRate = crawl ? 2 : 3.5
      let diff = desiredYaw - yaw.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      yaw.current += THREE.MathUtils.clamp(diff, -turnRate * dt, turnRate * dt)
    }

    // External shove from player (50/50 push) — slows chase while being pushed
    const shove = getZombiePush(bodyId)
    const shoveSpd = Math.hypot(shove.vx, shove.vz)
    if (shoveSpd > 0.05) {
      // While heavily shoved, cut intentional chase speed ~50%
      const jam = Math.min(1, shoveSpd / 4)
      moveX *= 1 - 0.5 * jam
      moveZ *= 1 - 0.5 * jam
      moveX += shove.vx * dt
      moveZ += shove.vz * dt
    }
    decayZombiePush(bodyId, dt)

    // Prefer player-shoved world position if player already updated this frame
    const dyn = collisionWorld.getDynamic(bodyId)
    if (dyn && shoveSpd > 0.05) {
      pos.current.x = dyn.x
      pos.current.z = dyn.z
    }

    const prevX = pos.current.x
    const prevZ = pos.current.z

    // Hard collide statics + other zombies (not player — soft push handles that)
    const solids = collisionWorld.query(bodyId)
    const next = moveAndCollide(pos.current.x, pos.current.z, ZOMBIE_RADIUS, moveX, moveZ, solids)
    pos.current.x = next.x
    pos.current.z = next.z

    pos.current.x = THREE.MathUtils.clamp(pos.current.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX)
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ)
    // Follow terrain height (stairs / mounds later)
    pos.current.y = getGroundHeight(pos.current.x, pos.current.z)

    // Actual travel distance → speed for walk-cycle cadence
    const moved = Math.hypot(pos.current.x - prevX, pos.current.z - prevZ)
    const actualSpeed = dt > 1e-6 ? moved / dt : 0
    speedRef.current = actualSpeed
    movingRef.current = isMoving || actualSpeed > 0.12
    gaitRef.current =
      maxSpeed > 1e-6 ? Math.min(1, Math.max(gait, actualSpeed / maxSpeed)) : gait

    collisionWorld.setDynamic(bodyId, pos.current.x, pos.current.z, ZOMBIE_RADIUS)

    group.position.x = pos.current.x
    group.position.y = pos.current.y
    group.position.z = pos.current.z
    group.rotation.y = yaw.current
    group.rotation.x = 0
  })

  return (
    <group>
      <group ref={root} position={position} rotation={[0, rotationY, 0]} scale={scale}>
        <ZombieModel
          appearance={appearance}
          position={[0, 0, 0]}
          animate={!isDead}
          limbs={limbs}
          crawl={crawl && !isDead}
          getLocomotion={() => ({
            moving: movingRef.current && !isDead,
            gait: gaitRef.current,
            speed: speedRef.current,
          })}
        />
      </group>
      <ZombieHealthBar
        hpFrac={hpDisplay / ZOMBIE_MAX_HP}
        getWorldPos={() => ({
          x: pos.current.x,
          y: pos.current.y + (crawl ? 0.4 : 0),
          z: pos.current.z,
        })}
        visible={!isDead && hpDisplay < ZOMBIE_MAX_HP}
        height={crawl ? 1.2 : 2.15}
      />
      {gibs.map((g) => (
        <LimbGib key={g.key} limb={g.limb} position={g.pos} velocity={g.vel} color={g.color} />
      ))}
      {headBoom && <HeadExplosion position={headBoom} />}
    </group>
  )
}
