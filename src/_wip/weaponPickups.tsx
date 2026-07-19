import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { WeaponId } from '../weapons/types'
import { playerState } from '../game/playerState'

export type PickupWeaponDef = {
  id: string
  weaponId: WeaponId
  position: [number, number, number]
  collected: boolean
  /** World rotation for visual display */
  rotationY: number
}

type WeaponPickupsProps = {
  pickups: PickupWeaponDef[]
  onPickup?: (pickupId: string, weaponId: WeaponId) => void
}

/**
 * Weapon pickups scattered around the map.
 * Player walks near them and presses E to pick up.
 */
export function WeaponPickups({ pickups, onPickup }: WeaponPickupsProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <>
      {pickups
        .filter((p) => !p.collected)
        .map((pickup) => (
          <PickupModel
            key={pickup.id}
            pickup={pickup}
            onPickup={onPickup}
            onHover={setHovered}
            hovered={hovered === pickup.id}
          />
        ))}
    </>
  )
}

function PickupModel({
  pickup,
  onPickup,
  onHover,
  hovered,
}: {
  pickup: PickupWeaponDef
  onPickup?: (pickupId: string, weaponId: WeaponId) => void
  onHover?: (id: string | null) => void
  hovered: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const pickupRef = useRef(pickup)
  pickupRef.current = pickup

  useFrame(() => {
    if (!group.current || pickupRef.current.collected) return

    const playerPos = playerState.x
    const playerZ = playerState.z
    const px = pickupRef.current.position[0]
    const pz = pickupRef.current.position[2]
    const dist = Math.hypot(playerPos - px, playerZ - pz)

    if (dist < 2.5) {
      onHover?.(pickupRef.current.id)
      if (dist < 1.5) {
        onPickup?.(pickupRef.current.id, pickupRef.current.weaponId)
        window.dispatchEvent(
          new CustomEvent('weapon-pickup', {
            detail: { pickupId: pickupRef.current.id, weaponId: pickupRef.current.weaponId },
          }),
        )
      }
    } else {
      onHover?.(null)
    }
  })

  return (
    <group ref={group} position={pickup.position} rotation={[0, pickup.rotationY, 0]}>
      <group position={[0, 0.8, 0]}>
        <group rotation={[0.3, 0, 0]}>
          {pickup.weaponId === 'double_barrel' && (
            <group>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.04, 0.04, 0.6]} />
                <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.02, 0.15]}>
                <boxGeometry args={[0.06, 0.03, 0.15]} />
                <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
              </mesh>
            </group>
          )}
          {pickup.weaponId === 'lever22' && (
            <group>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.03, 0.03, 0.55]} />
                <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.02, 0.1]}>
                <boxGeometry args={[0.05, 0.025, 0.3]} />
                <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.03, -0.2]}>
                <boxGeometry args={[0.025, 0.06, 0.08]} />
                <meshStandardMaterial color="#444444" metalness={0.7} roughness={0.4} />
              </mesh>
            </group>
          )}
          {pickup.weaponId === 'pump_shotgun' && (
            <group>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.04, 0.04, 0.6]} />
                <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.03, 0.1]}>
                <boxGeometry args={[0.05, 0.02, 0.25]} />
                <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.01, -0.15]}>
                <boxGeometry args={[0.045, 0.015, 0.15]} />
                <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
              </mesh>
            </group>
          )}
          {pickup.weaponId === 'mp40' && (
            <group>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.03, 0.03, 0.5]} />
                <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.05, 0.1]}>
                <boxGeometry args={[0.035, 0.08, 0.12]} />
                <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.5} />
              </mesh>
              <mesh position={[0, -0.02, -0.15]}>
                <boxGeometry args={[0.04, 0.02, 0.2]} />
                <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
              </mesh>
            </group>
          )}
          {pickup.weaponId === 'revolver' && (
            <group>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.025, 0.025, 0.22]} />
                <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.02, -0.05]}>
                <boxGeometry args={[0.03, 0.06, 0.08]} />
                <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[0, -0.04, 0.05]}>
                <boxGeometry args={[0.025, 0.02, 0.12]} />
                <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
              </mesh>
            </group>
          )}
          {pickup.weaponId === 'pitchfork' && (
            <group>
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.02, 0.02, 0.8]} />
                <meshStandardMaterial color="#5c4033" metalness={0.3} roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.35, 0]}>
                <boxGeometry args={[0.01, 0.01, 0.25]} />
                <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[-0.12, 0.3, 0]}>
                <boxGeometry args={[0.01, 0.01, 0.2]} />
                <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0.12, 0.3, 0]}>
                <boxGeometry args={[0.01, 0.01, 0.2]} />
                <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          )}
        </group>
        <pointLight color={hovered ? '#ffff00' : '#ffffff'} intensity={0.3} distance={3} />
      </group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshStandardMaterial
          color={hovered ? '#ffff00' : '#ffffff'}
          transparent
          opacity={hovered ? 0.8 : 0.4}
          emissive={hovered ? '#ffff00' : '#ffffff'}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  )
}

/** Create initial weapon pickups for the map */
export function createInitialPickups(): PickupWeaponDef[] {
  return [
    {
      id: 'pickup-double_barrel',
      weaponId: 'double_barrel',
      position: [0, 0, 8],
      collected: false,
      rotationY: 0.5,
    },
    {
      id: 'pickup-mp40',
      weaponId: 'mp40',
      position: [-15, 0, -10],
      collected: false,
      rotationY: 1.2,
    },
    {
      id: 'pickup-pump_shotgun',
      weaponId: 'pump_shotgun',
      position: [18, 0, 5],
      collected: false,
      rotationY: -0.8,
    },
    {
      id: 'pickup-revolver',
      weaponId: 'revolver',
      position: [-8, 0, 20],
      collected: false,
      rotationY: 2.1,
    },
    {
      id: 'pickup-lever22',
      weaponId: 'lever22',
      position: [12, 0, -18],
      collected: false,
      rotationY: -1.5,
    },
  ]
}
