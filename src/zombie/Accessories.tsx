import { useMemo } from 'react'
import * as THREE from 'three'
import type { FaceAccessory, FootStyle, HandAccessory, HeadAccessory, TorsoAccessory } from './types'
import { SoftBoxGeometry } from '../geometry/SoftBoxGeometry'

function useMat(color: string, roughness = 0.85, metalness = 0) {
  return useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    [color, roughness, metalness],
  )
}

/** Head slot accessories — parented to head bone group */
export function HeadAccessoryMesh({
  type,
  accent,
  hair,
}: {
  type: HeadAccessory
  accent: string
  hair: string
}) {
  const accentMat = useMat(accent, 0.9)
  const hairMat = useMat(hair, 0.95)
  const dark = useMat('#1a1a1a', 0.9)
  const straw = useMat('#C4A35A', 1)
  const brim = useMat('#A89050', 1)

  if (type === 'none') {
    // Simple hair tuft when no hat
    return (
      <mesh position={[0, 0.22, -0.02]} material={hairMat} castShadow>
        <SoftBoxGeometry args={[0.32, 0.12, 0.28]} />
      </mesh>
    )
  }

  if (type === 'cap') {
    return (
      <group position={[0, 0.18, 0]}>
        <mesh material={accentMat} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.12, 10]} />
        </mesh>
        <mesh position={[0, -0.02, 0.16]} material={accentMat} castShadow>
          <SoftBoxGeometry args={[0.28, 0.04, 0.16]} />
        </mesh>
        <mesh position={[0, 0.02, -0.02]} material={dark}>
          <cylinderGeometry args={[0.18, 0.18, 0.04, 8]} />
        </mesh>
      </group>
    )
  }

  if (type === 'straw_hat') {
    return (
      <group position={[0, 0.2, 0]}>
        <mesh material={brim} castShadow rotation={[0.05, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.04, 12]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={straw} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.16, 10]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={accentMat}>
          <torusGeometry args={[0.22, 0.025, 6, 12]} />
        </mesh>
      </group>
    )
  }

  if (type === 'bandana') {
    return (
      <group position={[0, 0.12, 0]}>
        <mesh material={accentMat} castShadow rotation={[0.15, 0, 0]}>
          <cylinderGeometry args={[0.23, 0.24, 0.1, 10]} />
        </mesh>
        {/* Knot / tails at back */}
        <mesh position={[0, 0, -0.22]} material={accentMat} castShadow rotation={[0.4, 0, 0]}>
          <SoftBoxGeometry args={[0.12, 0.08, 0.18]} />
        </mesh>
        <mesh position={[-0.06, -0.05, -0.28]} material={accentMat} rotation={[0.6, 0.2, 0.3]}>
          <SoftBoxGeometry args={[0.06, 0.04, 0.14]} />
        </mesh>
        <mesh position={[0.06, -0.05, -0.28]} material={accentMat} rotation={[0.6, -0.2, -0.3]}>
          <SoftBoxGeometry args={[0.06, 0.04, 0.14]} />
        </mesh>
      </group>
    )
  }

  // hard_hat
  return (
    <group position={[0, 0.2, 0]}>
      <mesh material={accentMat} castShadow>
        <sphereGeometry args={[0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} material={accentMat} castShadow>
        <cylinderGeometry args={[0.25, 0.26, 0.08, 10]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={dark}>
        <SoftBoxGeometry args={[0.06, 0.04, 0.36]} />
      </mesh>
    </group>
  )
}

/** Face details parented to head */
export function FaceAccessoryMesh({
  type,
  skin,
}: {
  type: FaceAccessory
  skin: string
}) {
  const skinMat = useMat(skin, 0.9)
  const dark = useMat('#1a1010', 0.85)
  const wound = useMat('#4A1515', 0.95)
  const bone = useMat('#D4C4A8', 0.7)

  if (type === 'none') return null

  if (type === 'eyepatch') {
    return (
      <group>
        <mesh position={[-0.1, 0.04, 0.18]} material={dark} castShadow>
          <SoftBoxGeometry args={[0.12, 0.1, 0.04]} />
        </mesh>
        <mesh position={[-0.02, 0.1, 0.16]} material={dark} rotation={[0, 0, -0.6]}>
          <SoftBoxGeometry args={[0.18, 0.03, 0.02]} />
        </mesh>
      </group>
    )
  }

  if (type === 'scar') {
    return (
      <group>
        <mesh position={[0.08, 0.02, 0.19]} material={wound} rotation={[0, 0, 0.5]}>
          <SoftBoxGeometry args={[0.04, 0.16, 0.03]} />
        </mesh>
        <mesh position={[0.1, -0.02, 0.19]} material={wound} rotation={[0, 0, -0.3]}>
          <SoftBoxGeometry args={[0.03, 0.1, 0.025]} />
        </mesh>
      </group>
    )
  }

  // jaw_missing — lower face gap + exposed bone
  return (
    <group>
      <mesh position={[0, -0.14, 0.1]} material={skinMat} castShadow>
        <SoftBoxGeometry args={[0.28, 0.1, 0.22]} />
      </mesh>
      <mesh position={[0, -0.12, 0.16]} material={dark}>
        <SoftBoxGeometry args={[0.18, 0.08, 0.12]} />
      </mesh>
      <mesh position={[-0.05, -0.1, 0.18]} material={bone}>
        <SoftBoxGeometry args={[0.04, 0.06, 0.04]} />
      </mesh>
      <mesh position={[0.05, -0.1, 0.18]} material={bone}>
        <SoftBoxGeometry args={[0.04, 0.06, 0.04]} />
      </mesh>
    </group>
  )
}

/** Torso overlays */
export function TorsoAccessoryMesh({
  type,
  accent,
  shirt,
}: {
  type: TorsoAccessory
  accent: string
  shirt: string
}) {
  const accentMat = useMat(accent, 0.9)
  const shirtMat = useMat(shirt, 0.9)
  const denim = useMat('#3D5A80', 0.95)
  const leather = useMat('#3A2818', 0.9)
  const apron = useMat('#E8E0D0', 0.95)
  const stain = useMat('#6B2A2A', 0.95)

  if (type === 'none') return null

  if (type === 'overalls') {
    return (
      <group>
        {/* Bib */}
        <mesh position={[0, 0.15, 0.14]} material={denim} castShadow>
          <SoftBoxGeometry args={[0.38, 0.35, 0.06]} />
        </mesh>
        {/* Straps */}
        <mesh position={[-0.12, 0.42, 0.12]} material={denim} castShadow rotation={[0.15, 0, 0.1]}>
          <SoftBoxGeometry args={[0.08, 0.45, 0.04]} />
        </mesh>
        <mesh position={[0.12, 0.42, 0.12]} material={denim} castShadow rotation={[0.15, 0, -0.1]}>
          <SoftBoxGeometry args={[0.08, 0.45, 0.04]} />
        </mesh>
        {/* Buckle */}
        <mesh position={[0, 0.22, 0.18]} material={accentMat}>
          <SoftBoxGeometry args={[0.1, 0.08, 0.03]} />
        </mesh>
      </group>
    )
  }

  if (type === 'vest') {
    return (
      <group>
        <mesh position={[0, 0.1, 0]} material={leather} castShadow>
          <SoftBoxGeometry args={[0.52, 0.55, 0.32]} />
        </mesh>
        {/* Open chest shows shirt underneath via thinner center cut illusion */}
        <mesh position={[0, 0.12, 0.14]} material={shirtMat}>
          <SoftBoxGeometry args={[0.16, 0.45, 0.04]} />
        </mesh>
        <mesh position={[-0.14, 0.15, 0.17]} material={accentMat}>
          <SoftBoxGeometry args={[0.06, 0.06, 0.03]} />
        </mesh>
        <mesh position={[0.14, 0.15, 0.17]} material={accentMat}>
          <SoftBoxGeometry args={[0.06, 0.06, 0.03]} />
        </mesh>
      </group>
    )
  }

  // apron
  return (
    <group>
      <mesh position={[0, 0.05, 0.16]} material={apron} castShadow>
        <SoftBoxGeometry args={[0.42, 0.7, 0.04]} />
      </mesh>
      <mesh position={[0, 0.4, 0.14]} material={apron} castShadow>
        <SoftBoxGeometry args={[0.48, 0.08, 0.05]} />
      </mesh>
      {/* Blood stains */}
      <mesh position={[-0.08, -0.05, 0.19]} material={stain}>
        <SoftBoxGeometry args={[0.12, 0.18, 0.02]} />
      </mesh>
      <mesh position={[0.1, 0.1, 0.19]} material={stain}>
        <SoftBoxGeometry args={[0.08, 0.12, 0.02]} />
      </mesh>
    </group>
  )
}

/** Right-hand held props */
export function HandAccessoryMesh({ type, accent }: { type: HandAccessory; accent: string }) {
  const wood = useMat('#5C4033', 0.95)
  const metal = useMat('#6A6E72', 0.45, 0.55)
  const accentMat = useMat(accent, 0.85)

  if (type === 'none') return null

  if (type === 'pitchfork') {
    return (
      <group position={[0, -0.35, 0.05]} rotation={[0.2, 0, 0.15]}>
        <mesh position={[0, 0.5, 0]} material={wood} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 1.1, 6]} />
        </mesh>
        <mesh position={[0, 1.05, 0.05]} material={metal} castShadow>
          <SoftBoxGeometry args={[0.28, 0.06, 0.04]} />
        </mesh>
        {([-0.1, 0, 0.1] as const).map((x) => (
          <mesh key={x} position={[x, 1.2, 0.05]} material={metal} castShadow>
            <SoftBoxGeometry args={[0.035, 0.28, 0.03]} />
          </mesh>
        ))}
      </group>
    )
  }

  if (type === 'shovel') {
    return (
      <group position={[0, -0.35, 0.05]} rotation={[0.15, 0.3, 0.1]}>
        <mesh position={[0, 0.45, 0]} material={wood} castShadow>
          <cylinderGeometry args={[0.03, 0.035, 0.95, 6]} />
        </mesh>
        <mesh position={[0, 0.95, 0.02]} material={metal} castShadow>
          <SoftBoxGeometry args={[0.22, 0.28, 0.04]} />
        </mesh>
        <mesh position={[0, -0.05, 0]} material={accentMat}>
          <SoftBoxGeometry args={[0.12, 0.04, 0.04]} />
        </mesh>
      </group>
    )
  }

  // board (2x4 nail bat vibe)
  return (
    <group position={[0, -0.2, 0.08]} rotation={[0.4, 0, 0.2]}>
      <mesh position={[0, 0.35, 0]} material={wood} castShadow>
        <SoftBoxGeometry args={[0.1, 0.85, 0.06]} />
      </mesh>
      <mesh position={[0.04, 0.65, 0.04]} material={metal}>
        <sphereGeometry args={[0.035, 6, 6]} />
      </mesh>
      <mesh position={[-0.03, 0.55, 0.04]} material={metal}>
        <sphereGeometry args={[0.03, 6, 6]} />
      </mesh>
    </group>
  )
}

/** Foot style variations on base boots */
export function FootMeshes({
  style,
  pantsMat,
  skinMat,
  accent,
  side,
}: {
  style: FootStyle
  pantsMat: THREE.Material
  skinMat: THREE.Material
  accent: string
  side: 'L' | 'R'
}) {
  const bootMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accent === '#E8E0D0' ? '#2C2C2C' : '#2A2018', roughness: 0.9 }),
    [accent],
  )
  const x = side === 'L' ? -1 : 1

  // Sole rests at local y = 0 so character root on ground = feet planted.
  if (style === 'bare') {
    return (
      <mesh position={[x * 0.02, 0.05, 0.04]} material={skinMat} castShadow>
        <SoftBoxGeometry args={[0.14, 0.1, 0.24]} />
      </mesh>
    )
  }

  if (style === 'mismatched') {
    if (side === 'L') {
      return (
        <mesh position={[0, 0.07, 0.05]} material={bootMat} castShadow>
          <SoftBoxGeometry args={[0.16, 0.14, 0.28]} />
        </mesh>
      )
    }
    return (
      <mesh position={[0, 0.05, 0.04]} material={skinMat} castShadow>
        <SoftBoxGeometry args={[0.14, 0.1, 0.24]} />
      </mesh>
    )
  }

  // boots (default) — bottom of boot at y=0
  return (
    <group>
      <mesh position={[0, 0.09, 0.04]} material={bootMat} castShadow>
        <SoftBoxGeometry args={[0.16, 0.18, 0.26]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} material={pantsMat} castShadow>
        <SoftBoxGeometry args={[0.15, 0.08, 0.15]} />
      </mesh>
    </group>
  )
}
