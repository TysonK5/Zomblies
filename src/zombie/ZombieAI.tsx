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
import { getGameSettings } from '../game/gameSettings'
import { registerDamageable, unregisterDamageable } from '../weapons/damageables'
import { fullLimbs, LIMB_LOCAL, limbDamageResult, type LimbId, type LimbState } from '../weapons/limbs'
import { HeadExplosion, LimbGib } from './Gibs'
import { spawnHitMarker } from '../weapons/hitMarkers'
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
  const [limbs, setLimbs] = useState<LimbState>(() => fullLimbs())
  const [isDead, setIsDead] = useState(false)
  const [hpDisplay, setHpDisplay] = useState(ZOMBIE_MAX_HP)
  const [gibs, setGibs] = useState<Gib[]>([])
  const [headBoom, setHeadBoom] = useState<[number, number, number] | null>(null)

  const lag = ZOMBIE_REACTION_LAG + reactionJitter + appearance.seed * 0.04
  const scaleClamped = THREE.MathUtils.clamp(speedScale, 0.05, 1.5)
  const crawl = !limbs.legL && !limbs.legR

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
    collisionWorld.setDynamic(bodyId, pos.current.x, pos.current.z, ZOMBIE_RADIUS)

    const _lp = new THREE.Vector3()
    const _ld = new THREE.Vector3()

    const dmgBody = {
      id: bodyId,
      radius: 0.45,
      height: 1.75,
      hp: ZOMBIE_MAX_HP,
      maxHp: ZOMBIE_MAX_HP,
      limbs: limbsRef.current,
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
      applyDamage: (amount: number, limb?: LimbId, hitPoint?: { x: number; y: number; z: number }) => {
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
        setHpDisplay(dmgBody.hp)

        let limbDestroyed: LimbId | undefined
        if (result.destroyLimb && limbsRef.current[targetLimb] && targetLimb !== 'torso') {
          limbsRef.current = { ...limbsRef.current, [targetLimb]: false }
          dmgBody.limbs = limbsRef.current
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
            spawnHitMarker({
              x: hitPoint.x,
              y: hitPoint.y,
              z: hitPoint.z,
              surface: 'flesh',
              scale: 0.2,
              attachId: bodyId,
            })
          }
        }

        const kill = result.kill || dmgBody.hp <= 0 || !limbsRef.current.head
        if (kill) {
          dead.current = true
          deathT.current = 0
          dmgBody.hp = 0
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
    registerDamageable(dmgBody)

    return () => {
      collisionWorld.removeDynamic(bodyId)
      unregisterDamageable(bodyId)
    }
  }, [bodyId, appearance.skin, appearance.pants, appearance.shirt])

  useFrame((_, delta) => {
    const group = root.current
    if (!group) return

    const dt = Math.min(delta, 0.05)

    if (dead.current) {
      deathT.current += dt
      const fall = Math.min(1, deathT.current * 2.2)
      group.rotation.x = fall * (Math.PI / 2)
      group.position.y = pos.current.y - fall * 0.15
      group.position.x = pos.current.x
      group.position.z = pos.current.z
      group.rotation.y = yaw.current
      return
    }

    if (!active) return

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

    if (dist > ZOMBIE_STOP_DISTANCE) {
      const inv = 1 / dist
      const step = Math.min(maxSpeed * dt, dist - ZOMBIE_STOP_DISTANCE * 0.5)
      moveX = dx * inv * step
      moveZ = dz * inv * step

      const desiredYaw = Math.atan2(dx, dz)
      const turnRate = crawl ? 2 : 3.5
      let diff = desiredYaw - yaw.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      yaw.current += THREE.MathUtils.clamp(diff, -turnRate * dt, turnRate * dt)
    }

    const solids = collisionWorld.query(bodyId)
    const next = moveAndCollide(pos.current.x, pos.current.z, ZOMBIE_RADIUS, moveX, moveZ, solids)
    pos.current.x = next.x
    pos.current.z = next.z

    pos.current.x = THREE.MathUtils.clamp(pos.current.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX)
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ)

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
