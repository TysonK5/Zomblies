import { useMemo } from 'react'
import * as THREE from 'three'

/** Classic red barn with gambrel roof — built from simple shaded boxes */
export function Barn({ position = [0, 0, 0] as [number, number, number] }) {
  const red = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8B1A1A', roughness: 0.85 }), [])
  const darkRed = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5C1010', roughness: 0.9 }), [])
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A3728', roughness: 0.9 }), [])
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2C2C2C', roughness: 0.7, metalness: 0.15 }), [])
  const white = useMemo(() => new THREE.MeshStandardMaterial({ color: '#E8E0D0', roughness: 0.8 }), [])

  return (
    <group position={position}>
      {/* Main body */}
      <mesh position={[0, 3, 0]} castShadow receiveShadow material={red}>
        <boxGeometry args={[12, 6, 8]} />
      </mesh>

      {/* Lower gambrel roof section */}
      <mesh position={[0, 6.6, 0]} castShadow material={roof} rotation={[0, 0, 0]}>
        <boxGeometry args={[13, 0.35, 8.5]} />
      </mesh>

      {/* Roof peak — two angled slabs */}
      <mesh position={[0, 8.2, 0]} castShadow material={roof} rotation={[0, 0, Math.PI / 8]}>
        <boxGeometry args={[7.2, 0.3, 8.6]} />
      </mesh>
      <mesh position={[0, 8.2, 0]} castShadow material={roof} rotation={[0, 0, -Math.PI / 8]}>
        <boxGeometry args={[7.2, 0.3, 8.6]} />
      </mesh>

      {/* Peak cap */}
      <mesh position={[0, 9.1, 0]} castShadow material={roof}>
        <boxGeometry args={[1.2, 0.25, 8.7]} />
      </mesh>

      {/* Front loft doors (white X pattern suggestion) */}
      <mesh position={[0, 5.2, 4.05]} material={white}>
        <boxGeometry args={[2.4, 2.2, 0.12]} />
      </mesh>
      <mesh position={[0, 5.2, 4.12]} material={darkRed}>
        <boxGeometry args={[0.15, 2.0, 0.08]} />
      </mesh>
      <mesh position={[0, 5.2, 4.12]} material={darkRed} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.15, 2.0, 0.08]} />
      </mesh>

      {/* Main barn doors */}
      <mesh position={[-1.4, 2.0, 4.05]} material={wood}>
        <boxGeometry args={[2.6, 4.0, 0.15]} />
      </mesh>
      <mesh position={[1.4, 2.0, 4.05]} material={wood}>
        <boxGeometry args={[2.6, 4.0, 0.15]} />
      </mesh>
      {/* Door hardware */}
      <mesh position={[0, 2.0, 4.15]} material={roof}>
        <boxGeometry args={[0.2, 3.6, 0.08]} />
      </mesh>

      {/* Side window cutouts (dark panels) */}
      <mesh position={[-6.05, 3.5, 0]} material={wood}>
        <boxGeometry args={[0.12, 1.4, 1.6]} />
      </mesh>
      <mesh position={[6.05, 3.5, 0]} material={wood}>
        <boxGeometry args={[0.12, 1.4, 1.6]} />
      </mesh>

      {/* Corner posts */}
      {([-5.8, 5.8] as const).map((x) =>
        ([-3.8, 3.8] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 3, z]} material={darkRed} castShadow>
            <boxGeometry args={[0.35, 6, 0.35]} />
          </mesh>
        )),
      )}

      {/* Silo next to barn */}
      <group position={[8.5, 0, -1]}>
        <mesh position={[0, 4, 0]} castShadow material={white}>
          <cylinderGeometry args={[1.6, 1.7, 8, 12]} />
        </mesh>
        <mesh position={[0, 8.4, 0]} castShadow material={roof}>
          <coneGeometry args={[1.85, 1.6, 12]} />
        </mesh>
      </group>
    </group>
  )
}
