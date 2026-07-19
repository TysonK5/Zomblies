import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WeaponModel } from '../weapons/WeaponModels'
import { weaponState } from '../weapons/weaponState'
import type { WeaponId } from '../weapons/types'
import { sampleThirdPersonWeaponPose } from '../weapons/weaponAnims'
import { SoftBoxGeometry } from '../geometry/SoftBoxGeometry'

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
 * Third-person survivor. Weapon use is driven by the same keyframed clips
 * and phases as first person (sampleThirdPersonWeaponPose).
 *
 * Arms hang along −Y; raised with rot.x ≈ −π/2 to aim forward.
 * World weapons are pre-oriented so barrel || arm −Y (horizontal when aiming).
 */
export function PlayerAvatar({ getPose, visible = true }: PlayerAvatarProps) {
  const root = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const weaponSocket = useRef<THREE.Group>(null)
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
    const phase = weaponState.phase
    const animU =
      weaponState.animDuration > 0
        ? Math.min(1, weaponState.animT / weaponState.animDuration)
        : 0

    const rate = pose.sprinting ? 12 : pose.moving ? 8 : 0
    const amp = pose.moving ? (pose.sprinting ? 0.55 : 0.4) : 0
    const swing = rate > 0 ? Math.sin(t * rate) * amp : 0

    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing

    // Same clip + phase as FPS viewmodel
    const tp = sampleThirdPersonWeaponPose(weaponState.currentId, phase, animU, swing)

    if (armR.current) {
      armR.current.rotation.x = tp.armR.x
      armR.current.rotation.y = tp.armR.y
      armR.current.rotation.z = tp.armR.z
    }
    if (armL.current) {
      armL.current.rotation.x = tp.armL.x
      armL.current.rotation.y = tp.armL.y
      armL.current.rotation.z = tp.armL.z
    }

    // Hand socket: identity base — world WeaponModel already points barrel along −Y.
    // Only apply FPS-mapped kick / lever / pump / thrust deltas.
    if (weaponSocket.current) {
      const w = tp.weapon
      const id = weaponState.currentId
      // Hand is at ~y=-0.48 on the upper arm; seat the grip in the palm
      const base =
        id === 'pitchfork'
          ? { x: 0, y: -0.5, z: 0.04 }
          : id === 'fist'
            ? { x: 0, y: -0.48, z: 0 }
            : { x: 0.02, y: -0.5, z: 0.06 }

      weaponSocket.current.position.set(base.x + w.x, base.y + w.y, base.z + w.z)
      weaponSocket.current.rotation.set(w.rx, w.ry, w.rz)
    }
  })

  const HIP_Y = 0.9
  const showWeapon = weaponId !== 'fist'

  return (
    <group ref={root}>
      <group ref={legL} position={[-0.12, HIP_Y, 0]}>
        <mesh position={[0, -HIP_Y * 0.38, 0]} material={pants} castShadow>
          <SoftBoxGeometry args={[0.16, HIP_Y * 0.55, 0.16]} />
        </mesh>
        <mesh position={[0, -HIP_Y + 0.07, 0.04]} material={boot} castShadow>
          <SoftBoxGeometry args={[0.15, 0.14, 0.24]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.12, HIP_Y, 0]}>
        <mesh position={[0, -HIP_Y * 0.38, 0]} material={pants} castShadow>
          <SoftBoxGeometry args={[0.16, HIP_Y * 0.55, 0.16]} />
        </mesh>
        <mesh position={[0, -HIP_Y + 0.07, 0.04]} material={boot} castShadow>
          <SoftBoxGeometry args={[0.15, 0.14, 0.24]} />
        </mesh>
      </group>

      <mesh position={[0, 1.28, 0]} material={shirt} castShadow>
        <SoftBoxGeometry args={[0.42, 0.5, 0.26]} />
      </mesh>
      <mesh position={[0, 0.98, 0]} material={pants} castShadow>
        <SoftBoxGeometry args={[0.4, 0.2, 0.24]} />
      </mesh>

      <group ref={armL} position={[-0.28, 1.42, 0]}>
        <mesh position={[0, -0.22, 0]} material={shirt} castShadow>
          <SoftBoxGeometry args={[0.12, 0.42, 0.12]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={skin} castShadow>
          <SoftBoxGeometry args={[0.1, 0.16, 0.1]} />
        </mesh>
      </group>

      <group ref={armR} position={[0.28, 1.42, 0]}>
        <mesh position={[0, -0.22, 0]} material={shirt} castShadow>
          <SoftBoxGeometry args={[0.12, 0.42, 0.12]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={skin} castShadow>
          <SoftBoxGeometry args={[0.1, 0.16, 0.1]} />
        </mesh>

        {/* Identity rotation: WeaponModel world orients barrel along arm −Y */}
        <group ref={weaponSocket} position={[0.02, -0.5, 0.06]}>
          {showWeapon && <WeaponModel id={weaponId} variant="world" />}
        </group>
      </group>

      <mesh position={[0, 1.7, 0]} material={skin} castShadow>
        <SoftBoxGeometry args={[0.28, 0.3, 0.28]} />
      </mesh>
      <mesh position={[0, 1.84, -0.02]} material={hair} castShadow>
        <SoftBoxGeometry args={[0.3, 0.1, 0.28]} />
      </mesh>
    </group>
  )
}
