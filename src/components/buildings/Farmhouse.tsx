import { useMemo } from 'react'
import * as THREE from 'three'
import { SoftBoxGeometry } from '../../geometry/SoftBoxGeometry'

/** Two-story farm house with porch and gabled roof */
export function Farmhouse({ position = [0, 0, 0] as [number, number, number] }) {
  const siding = useMemo(() => new THREE.MeshStandardMaterial({ color: '#C4B59A', roughness: 0.85 }), [])
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: '#F5F0E6', roughness: 0.75 }), [])
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3D2914', roughness: 0.8 }), [])
  const door = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A2C0A', roughness: 0.7 }), [])
  const windowGlass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#87CEEB', roughness: 0.2, metalness: 0.3, emissive: '#1a3040', emissiveIntensity: 0.15 }),
    [],
  )
  const porch = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6B5344', roughness: 0.9 }), [])
  const chimney = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7A3B2E', roughness: 0.9 }), [])

  return (
    <group position={position}>
      {/* Main house body */}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow material={siding}>
        <SoftBoxGeometry args={[8, 5, 7]} />
      </mesh>

      {/* Second-story trim band */}
      <mesh position={[0, 4.5, 0]} material={trim}>
        <SoftBoxGeometry args={[8.15, 0.2, 7.15]} />
      </mesh>

      {/* Gabled roof — two slopes */}
      <mesh position={[0, 5.9, 1.5]} castShadow material={roof} rotation={[Math.PI / 6.5, 0, 0]}>
        <SoftBoxGeometry args={[8.6, 0.25, 5.2]} />
      </mesh>
      <mesh position={[0, 5.9, -1.5]} castShadow material={roof} rotation={[-Math.PI / 6.5, 0, 0]}>
        <SoftBoxGeometry args={[8.6, 0.25, 5.2]} />
      </mesh>

      {/* Roof ridge */}
      <mesh position={[0, 7.05, 0]} castShadow material={roof}>
        <SoftBoxGeometry args={[8.7, 0.2, 0.4]} />
      </mesh>

      {/* Gable end fills */}
      <mesh position={[-4.05, 6.0, 0]} material={siding}>
        <SoftBoxGeometry args={[0.15, 2.2, 3.5]} />
      </mesh>
      <mesh position={[4.05, 6.0, 0]} material={siding}>
        <SoftBoxGeometry args={[0.15, 2.2, 3.5]} />
      </mesh>

      {/* Chimney */}
      <mesh position={[2.5, 7.2, -1.2]} castShadow material={chimney}>
        <SoftBoxGeometry args={[1.0, 2.2, 1.0]} />
      </mesh>
      <mesh position={[2.5, 8.4, -1.2]} material={chimney}>
        <SoftBoxGeometry args={[1.2, 0.25, 1.2]} />
      </mesh>

      {/* Front porch deck */}
      <mesh position={[0, 0.2, 4.2]} receiveShadow material={porch}>
        <SoftBoxGeometry args={[7, 0.25, 2.5]} />
      </mesh>

      {/* Porch roof */}
      <mesh position={[0, 3.2, 4.0]} castShadow material={roof}>
        <SoftBoxGeometry args={[7.2, 0.2, 2.8]} />
      </mesh>

      {/* Porch posts */}
      {([-3, 0, 3] as const).map((x) => (
        <mesh key={x} position={[x, 1.7, 5.2]} material={trim} castShadow>
          <SoftBoxGeometry args={[0.2, 3.0, 0.2]} />
        </mesh>
      ))}

      {/* Front door */}
      <mesh position={[0, 1.5, 3.55]} material={door}>
        <SoftBoxGeometry args={[1.4, 2.6, 0.12]} />
      </mesh>
      <mesh position={[0.45, 1.5, 3.65]} material={trim}>
        <sphereGeometry args={[0.08, 8, 8]} />
      </mesh>

      {/* Windows — front */}
      {[
        [-2.5, 2.2, 3.55],
        [2.5, 2.2, 3.55],
        [-2.5, 5.0, 3.55],
        [2.5, 5.0, 3.55],
        [0, 5.0, 3.55],
      ].map(([x, y, z], i) => (
        <group key={`fw-${i}`} position={[x, y, z]}>
          <mesh material={trim}>
            <SoftBoxGeometry args={[1.3, 1.3, 0.1]} />
          </mesh>
          <mesh position={[0, 0, 0.06]} material={windowGlass}>
            <SoftBoxGeometry args={[1.0, 1.0, 0.05]} />
          </mesh>
          <mesh position={[0, 0, 0.08]} material={trim}>
            <SoftBoxGeometry args={[0.06, 1.0, 0.04]} />
          </mesh>
          <mesh position={[0, 0, 0.08]} material={trim}>
            <SoftBoxGeometry args={[1.0, 0.06, 0.04]} />
          </mesh>
        </group>
      ))}

      {/* Side windows */}
      {[
        [4.05, 2.2, 1.5],
        [4.05, 2.2, -1.5],
        [4.05, 5.0, 0],
        [-4.05, 2.2, 1.5],
        [-4.05, 2.2, -1.5],
        [-4.05, 5.0, 0],
      ].map(([x, y, z], i) => (
        <group key={`sw-${i}`} position={[x, y, z]}>
          <mesh material={trim}>
            <SoftBoxGeometry args={[0.1, 1.2, 1.2]} />
          </mesh>
          <mesh position={[x > 0 ? 0.06 : -0.06, 0, 0]} material={windowGlass}>
            <SoftBoxGeometry args={[0.05, 0.95, 0.95]} />
          </mesh>
        </group>
      ))}

      {/* Foundation */}
      <mesh position={[0, 0.15, 0]} material={porch} receiveShadow>
        <SoftBoxGeometry args={[8.3, 0.4, 7.3]} />
      </mesh>
    </group>
  )
}
