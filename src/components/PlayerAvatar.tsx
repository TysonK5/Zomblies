import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WeaponModel } from '../weapons/WeaponModels'
import { weaponState } from '../weapons/weaponState'
import { WEAPONS } from '../weapons/definitions'
import type { WeaponId } from '../weapons/types'

type PlayerAvatarProps = {
  getPose: () => {
    x: number
    y: number
    z: number
    yaw: number
    moving: boolean
    sprinting: boolean
  }
  visible?: boolean
}

/**
 * Third-person survivor with the currently selected weapon in-hand (GTA / RDR style).
 */
export function PlayerAvatar({ getPose, visible = true }: PlayerAvatarProps) {
  const root = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const [weaponId, setWeaponId] = useState<WeaponId>(() => weaponState.currentId)

  useEffect(() => weaponState.subscribe((s) => setWeaponId(s.id)), [])

  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9a07a', roughness: 0.85 }), [])
  const shirt = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3d5a80', roughness: 0.9 }), [])
  const pants = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2c3340', roughness: 0.9 }), [])
  const boot = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1510', roughness: 0.95 }), [])
  const hair = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.95 }), [])

  useFrame(({ clock }) => {
    const g = root.current
    if (!g) return
    g.visible = visible
    if (!visible) return

    const pose = getPose()
    g.position.set(pose.x, pose.y, pose.z)
    g.rotation.y = pose.yaw

    const t = clock.elapsedTime
    const def = WEAPONS[weaponId]
    const phase = weaponState.phase
    const animU =
      weaponState.animDuration > 0
        ? Math.min(1, weaponState.animT / weaponState.animDuration)
        : 0

    const rate = pose.sprinting ? 12 : pose.moving ? 8 : 0
    const amp = pose.moving ? (pose.sprinting ? 0.55 : 0.4) : 0
    const swing = Math.sin(t * rate) * amp

    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing

    // Armed pose: aim-ready; fists/melee use walk arms or attack
    if (armL.current && armR.current) {
      if (def.kind === 'gun') {
        // Two-handed aim — mirrors viewmodel beats (kick / lever / pump / reload)
        let aim = -1.35
        let support = -1.2
        let rollR = -0.2
        let rollL = 0.35
        if (phase === 'fire') {
          const punch = Math.sin(animU * Math.PI)
          aim -= punch * 0.55
          support -= punch * 0.35
        } else if (phase === 'lever') {
          // Under-lever throw — drop muzzle, twist
          const L = Math.sin(animU * Math.PI)
          aim = -0.55 + L * 0.9
          support = -0.4 + L * 0.5
          rollR = -0.2 - L * 0.55
          rollL = 0.35 + L * 0.25
        } else if (phase === 'reload') {
          const dip = Math.sin(animU * Math.PI)
          aim = -0.25 + dip * 1.0
          support = -0.1 + dip * 0.55
          rollR = -0.15 + dip * 0.4
        } else if (phase === 'pump') {
          const pump = Math.sin(animU * Math.PI)
          support = -0.45 - pump * 0.85
          aim = -1.15
        } else if (phase === 'equip') {
          const e = Math.sin(animU * Math.PI)
          aim = -0.3 - e * 1.0
          support = -0.2 - e * 0.8
        }
        armR.current.rotation.x = aim
        armR.current.rotation.z = rollR
        armL.current.rotation.x = support
        armL.current.rotation.z = rollL
        if (pose.moving && phase === 'idle') {
          armR.current.rotation.x += swing * 0.1
          armL.current.rotation.x -= swing * 0.1
        }
      } else if (def.id === 'pitchfork') {
        // Two-hand: ready → pull in → stab forward (mirrors FPS crosshair thrust)
        let rX = -1.15
        let lX = -1.05
        let rZ = -0.1
        let lZ = 0.18
        if (phase === 'melee' || phase === 'fire') {
          const u = animU
          if (u < 0.28) {
            // Pull in (arms bend, weapon closer)
            const w = u / 0.28
            rX = -1.15 + w * 0.55
            lX = -1.05 + w * 0.5
            rZ = -0.1 - w * 0.08
            lZ = 0.18 + w * 0.06
          } else if (u < 0.55) {
            // Stab forward
            const w = (u - 0.28) / 0.27
            rX = -0.6 - w * 1.35
            lX = -0.55 - w * 1.25
            rZ = -0.18 + w * 0.05
            lZ = 0.24 - w * 0.05
          } else {
            // Recover to ready
            const w = (u - 0.55) / 0.45
            rX = -1.95 + w * 0.8
            lX = -1.8 + w * 0.75
            rZ = -0.13
            lZ = 0.19
          }
        } else if (phase === 'equip') {
          const e = Math.sin(animU * Math.PI)
          rX = -0.2 - e * 0.95
          lX = -0.15 - e * 0.9
        } else if (pose.moving) {
          rX += swing * 0.12
          lX -= swing * 0.12
        }
        armR.current.rotation.x = rX
        armR.current.rotation.z = rZ
        armL.current.rotation.x = lX
        armL.current.rotation.z = lZ
      } else {
        if (phase === 'melee') {
          const punch = Math.sin(animU * Math.PI)
          armR.current.rotation.x = -0.3 - punch * 2.0
          armL.current.rotation.x = 0.4
          armR.current.rotation.z = -0.4 * punch
        } else {
          armL.current.rotation.x = -swing * 0.75
          armR.current.rotation.x = swing * 0.75
          armL.current.rotation.z = 0
          armR.current.rotation.z = 0
        }
      }
    }
  })

  const isGun = WEAPONS[weaponId].kind === 'gun'
  const isFork = weaponId === 'pitchfork'

  return (
    <group ref={root}>
      <group ref={legL} position={[-0.12, 0.95, 0]}>
        <mesh position={[0, -0.28, 0]} material={pants} castShadow>
          <boxGeometry args={[0.16, 0.55, 0.16]} />
        </mesh>
        <mesh position={[0, -0.58, 0.04]} material={boot} castShadow>
          <boxGeometry args={[0.15, 0.12, 0.24]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.12, 0.95, 0]}>
        <mesh position={[0, -0.28, 0]} material={pants} castShadow>
          <boxGeometry args={[0.16, 0.55, 0.16]} />
        </mesh>
        <mesh position={[0, -0.58, 0.04]} material={boot} castShadow>
          <boxGeometry args={[0.15, 0.12, 0.24]} />
        </mesh>
      </group>

      <mesh position={[0, 1.35, 0]} material={shirt} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.26]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} material={pants} castShadow>
        <boxGeometry args={[0.4, 0.2, 0.24]} />
      </mesh>

      {/* Left arm */}
      <group ref={armL} position={[-0.28, 1.5, 0]}>
        <mesh position={[0, -0.22, 0]} material={shirt} castShadow>
          <boxGeometry args={[0.12, 0.42, 0.12]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={skin} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.1]} />
        </mesh>
      </group>

      {/* Right arm + weapon socket at hand */}
      <group ref={armR} position={[0.28, 1.5, 0]}>
        <mesh position={[0, -0.22, 0]} material={shirt} castShadow>
          <boxGeometry args={[0.12, 0.42, 0.12]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={skin} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.1]} />
        </mesh>

        {/* Hand socket: weapon points forward when arm is raised */}
        <group
          position={
            isGun
              ? [0.02, -0.55, 0.12]
              : isFork
                ? [0.0, -0.52, 0.08]
                : [0, -0.55, 0.05]
          }
          rotation={isGun || isFork ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
        >
          {weaponId !== 'fist' && <WeaponModel id={weaponId} variant="world" />}
        </group>
      </group>

      <mesh position={[0, 1.78, 0]} material={skin} castShadow>
        <boxGeometry args={[0.28, 0.3, 0.28]} />
      </mesh>
      <mesh position={[0, 1.92, -0.02]} material={hair} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.28]} />
      </mesh>
    </group>
  )
}
