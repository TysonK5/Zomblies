import { useMemo } from 'react'
import * as THREE from 'three'
import type { WeaponId } from './types'

function useMat(color: string, opts?: { roughness?: number; metalness?: number }) {
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: opts?.roughness ?? 0.65,
        metalness: opts?.metalness ?? 0.3,
        // Viewmodel patches depth later; world weapons keep defaults
        envMapIntensity: 0.8,
      }),
    [color, opts?.roughness, opts?.metalness],
  )
}

export type WeaponModelVariant = 'fps' | 'world'

type WeaponModelProps = {
  id: WeaponId
  variant?: WeaponModelVariant
}

/**
 * Shared weapon meshes. Local: grip near origin, barrel / tines toward -Z.
 *
 * FPS: camera places the group; slight tilt for bottom-of-screen presence.
 * World (TPS): re-orient so barrel maps to parent −Y (hand axis of hanging arms).
 *   Mesh −Z → parent −Y via Rx(−π/2). Hands hang along −Y; when arms raise
 *   forward, −Y points ahead so the weapon aims horizontally — not vertically.
 */
export function WeaponModel({ id, variant = 'fps' }: WeaponModelProps) {
  const mesh = <WeaponMesh id={id} />

  if (variant === 'world') {
    // Pitchfork: tips at z=0, grip ~z=1.2 — shift so grip sits in the hand
    // and tines extend along −Y after the orient rotation.
    if (id === 'pitchfork') {
      return (
        <group scale={1.05} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <group position={[0, 0, -1.05]}>{mesh}</group>
        </group>
      )
    }
    // Guns: grip near origin already; barrel −Z → hand −Y
    return (
      <group scale={1.05} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.02]}>
        {mesh}
      </group>
    )
  }

  // FPS: model sits in local space; WeaponView places the whole group on camera.
  // Centered slightly so hands + gun fill lower view.
  return (
    <group position={[0, 0, 0]} rotation={[0.05, 0.08, 0]} scale={1.0} frustumCulled={false}>
      {mesh}
      <FpsHands id={id} />
    </group>
  )
}

function WeaponMesh({ id }: { id: WeaponId }) {
  if (id === 'fist') return null
  if (id === 'pitchfork') return <PitchforkMesh />
  if (id === 'double_barrel') return <DoubleBarrelMesh />
  if (id === 'lever22') return <Lever22Mesh />
  return <PumpShotgunMesh />
}

function FpsHands({ id }: { id: WeaponId }) {
  const skin = useMat('#d4a574', { roughness: 0.85, metalness: 0 })
  const sleeve = useMat('#2f4a6e', { roughness: 0.9, metalness: 0 })

  if (id === 'fist') {
    return (
      <group>
        <group position={[0.12, -0.05, 0.05]}>
          <mesh material={skin}>
            <boxGeometry args={[0.16, 0.16, 0.2]} />
          </mesh>
          <mesh position={[0, 0.1, 0.02]} material={skin}>
            <boxGeometry args={[0.14, 0.08, 0.14]} />
          </mesh>
          <mesh position={[0, 0.02, 0.18]} material={sleeve}>
            <boxGeometry args={[0.17, 0.17, 0.14]} />
          </mesh>
        </group>
        <group position={[-0.14, -0.08, 0.12]}>
          <mesh material={skin}>
            <boxGeometry args={[0.14, 0.14, 0.18]} />
          </mesh>
          <mesh position={[0, 0.02, 0.16]} material={sleeve}>
            <boxGeometry args={[0.15, 0.15, 0.12]} />
          </mesh>
        </group>
      </group>
    )
  }

  // Pitchfork: hands on shaft (+Z), tips at origin (crosshair)
  if (id === 'pitchfork') {
    return (
      <group>
        <group position={[0.06, -0.05, 0.95]} rotation={[0.15, 0, 0.08]}>
          <mesh material={skin}>
            <boxGeometry args={[0.11, 0.12, 0.13]} />
          </mesh>
          <mesh position={[0, 0.02, 0.1]} material={sleeve}>
            <boxGeometry args={[0.12, 0.12, 0.14]} />
          </mesh>
        </group>
        <group position={[-0.05, -0.04, 0.72]} rotation={[0.12, 0, -0.06]}>
          <mesh material={skin}>
            <boxGeometry args={[0.1, 0.11, 0.12]} />
          </mesh>
          <mesh position={[0, 0.02, 0.09]} material={sleeve}>
            <boxGeometry args={[0.11, 0.11, 0.12]} />
          </mesh>
        </group>
      </group>
    )
  }

  return (
    <group>
      <group position={[0.04, -0.08, 0.1]} rotation={[0.25, 0, 0.1]}>
        <mesh material={skin}>
          <boxGeometry args={[0.12, 0.13, 0.14]} />
        </mesh>
        <mesh position={[0, 0.02, 0.12]} material={sleeve}>
          <boxGeometry args={[0.13, 0.13, 0.16]} />
        </mesh>
      </group>
      <group position={[-0.02, -0.07, -0.2]} rotation={[0.2, 0, -0.08]}>
        <mesh material={skin}>
          <boxGeometry args={[0.11, 0.12, 0.13]} />
        </mesh>
        <mesh position={[0, 0.02, 0.11]} material={sleeve}>
          <boxGeometry args={[0.12, 0.12, 0.14]} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Pitchfork for FPS aim: **tine tips at local origin (0,0,0)**.
 * Shaft runs toward +Z (back to hands/camera). Placing the viewmodel
 * group at (0, 0, -d) puts the tips on the crosshair (screen center).
 */
function PitchforkMesh() {
  const wood = useMat('#6B4423', { roughness: 0.95, metalness: 0 })
  const metal = useMat('#a0a8b0', { roughness: 0.3, metalness: 0.75 })
  return (
    <group>
      {/* Tines — tips at z≈0 (aim point / crosshair) */}
      {([-0.1, 0, 0.1] as const).map((x) => (
        <mesh key={x} position={[x, 0, 0.14]} material={metal} castShadow>
          <boxGeometry args={[0.032, 0.032, 0.28]} />
        </mesh>
      ))}
      {/* Crossbar */}
      <mesh position={[0, 0, 0.3]} material={metal} castShadow>
        <boxGeometry args={[0.3, 0.045, 0.05]} />
      </mesh>
      {/* Shaft toward camera / hands (+Z) */}
      <mesh position={[0, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]} material={wood} castShadow>
        <cylinderGeometry args={[0.028, 0.034, 1.05, 8]} />
      </mesh>
      {/* Grip flare */}
      <mesh position={[0, 0, 1.35]} material={wood} castShadow>
        <boxGeometry args={[0.05, 0.05, 0.12]} />
      </mesh>
    </group>
  )
}

function DoubleBarrelMesh() {
  const wood = useMat('#5a3010', { roughness: 0.8, metalness: 0.05 })
  const metal = useMat('#3a3e44', { roughness: 0.25, metalness: 0.8 })
  return (
    <group>
      <mesh position={[-0.04, 0.04, -0.42]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.036, 0.036, 0.72, 10]} />
      </mesh>
      <mesh position={[0.04, 0.04, -0.42]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.036, 0.036, 0.72, 10]} />
      </mesh>
      <mesh position={[0, 0.025, -0.02]} material={metal}>
        <boxGeometry args={[0.14, 0.1, 0.24]} />
      </mesh>
      <mesh position={[0, -0.02, -0.25]} material={wood}>
        <boxGeometry args={[0.12, 0.08, 0.26]} />
      </mesh>
      <mesh position={[0, -0.02, 0.18]} material={wood}>
        <boxGeometry args={[0.1, 0.12, 0.32]} />
      </mesh>
      <mesh position={[0, -0.08, 0.34]} material={wood}>
        <boxGeometry args={[0.12, 0.14, 0.14]} />
      </mesh>
      <mesh position={[0, -0.06, 0.02]} material={metal}>
        <torusGeometry args={[0.045, 0.01, 6, 14, Math.PI]} />
      </mesh>
    </group>
  )
}

function Lever22Mesh() {
  const wood = useMat('#7a4e28', { roughness: 0.88, metalness: 0 })
  const metal = useMat('#4a5058', { roughness: 0.3, metalness: 0.7 })
  const brass = useMat('#c9a04a', { roughness: 0.35, metalness: 0.6 })
  return (
    <group>
      <mesh position={[0, 0.045, -0.48]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.024, 0.026, 0.85, 10]} />
      </mesh>
      <mesh position={[0, 0.0, -0.34]} rotation={[Math.PI / 2, 0, 0]} material={brass}>
        <cylinderGeometry args={[0.018, 0.018, 0.5, 8]} />
      </mesh>
      <mesh position={[0, 0.02, -0.02]} material={metal}>
        <boxGeometry args={[0.08, 0.1, 0.26]} />
      </mesh>
      <mesh position={[0, -0.07, 0.0]} material={metal}>
        <torusGeometry args={[0.07, 0.014, 6, 16, Math.PI]} />
      </mesh>
      <mesh position={[0, 0.0, 0.2]} material={wood}>
        <boxGeometry args={[0.07, 0.11, 0.38]} />
      </mesh>
      <mesh position={[0, -0.06, 0.36]} material={wood}>
        <boxGeometry args={[0.08, 0.14, 0.12]} />
      </mesh>
      <mesh position={[0, 0.08, 0.06]} material={metal}>
        <boxGeometry args={[0.03, 0.05, 0.05]} />
      </mesh>
    </group>
  )
}

function PumpShotgunMesh() {
  const wood = useMat('#4a3018', { roughness: 0.9, metalness: 0 })
  const metal = useMat('#2a3038', { roughness: 0.25, metalness: 0.85 })
  return (
    <group>
      <mesh position={[0, 0.05, -0.45]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.038, 0.04, 0.78, 10]} />
      </mesh>
      <mesh position={[0, 0.0, -0.36]} rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <cylinderGeometry args={[0.026, 0.026, 0.5, 8]} />
      </mesh>
      <mesh position={[0, -0.02, -0.22]} material={wood}>
        <boxGeometry args={[0.1, 0.09, 0.22]} />
      </mesh>
      <mesh position={[0, 0.02, -0.02]} material={metal}>
        <boxGeometry args={[0.1, 0.11, 0.24]} />
      </mesh>
      <mesh position={[0, -0.01, 0.2]} material={wood}>
        <boxGeometry args={[0.09, 0.12, 0.36]} />
      </mesh>
      <mesh position={[0, -0.07, 0.36]} material={wood}>
        <boxGeometry args={[0.1, 0.15, 0.12]} />
      </mesh>
      <mesh position={[0, -0.06, 0.02]} material={metal}>
        <torusGeometry args={[0.048, 0.011, 6, 14, Math.PI]} />
      </mesh>
    </group>
  )
}
