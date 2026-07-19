import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Barn } from './buildings/Barn'
import { Farmhouse } from './buildings/Farmhouse'
import { Fence } from './buildings/Fence'
import { ZombieShowcase } from './ZombieShowcase'
import { addGroundSurface, clearGroundSurfaces, createHeightPad } from '../game/ground'
import { SoftBoxGeometry } from '../geometry/SoftBoxGeometry'

function Tree({ position }: { position: [number, number, number] }) {
  const trunk = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A3728', roughness: 0.95 }), [])
  const leaves = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2D5A27', roughness: 0.9 }), [])

  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow material={trunk}>
        <cylinderGeometry args={[0.25, 0.35, 2.4, 6]} />
      </mesh>
      <mesh position={[0, 3.2, 0]} castShadow material={leaves}>
        <coneGeometry args={[1.6, 2.8, 7]} />
      </mesh>
      <mesh position={[0, 4.4, 0]} castShadow material={leaves}>
        <coneGeometry args={[1.2, 2.0, 7]} />
      </mesh>
    </group>
  )
}

function HayBale({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const hay = useMemo(() => new THREE.MeshStandardMaterial({ color: '#C4A35A', roughness: 1 }), [])
  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow material={hay}>
      <cylinderGeometry args={[0.55, 0.55, 1.1, 10]} />
    </mesh>
  )
}

function DirtPath() {
  const dirt = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6B5344', roughness: 1 }), [])
  return (
    <group>
      {/* Main path from gate toward farmhouse */}
      <mesh position={[0, 0.02, 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={dirt}>
        <planeGeometry args={[3.5, 18]} />
      </mesh>
      {/* Branch to barn */}
      <mesh position={[-8, 0.02, -2]} rotation={[-Math.PI / 2, 0, Math.PI / 5]} receiveShadow material={dirt}>
        <planeGeometry args={[2.5, 14]} />
      </mesh>
    </group>
  )
}

function CornStalks({ origin, rows, cols }: { origin: [number, number, number]; rows: number; cols: number }) {
  const stalk = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3D6B2F', roughness: 0.9 }), [])
  const cob = useMemo(() => new THREE.MeshStandardMaterial({ color: '#D4A84B', roughness: 0.8 }), [])
  const items = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = origin[0] + c * 1.4 + (r % 2) * 0.3
      const z = origin[2] + r * 1.4
      items.push(
        <group key={`corn-${r}-${c}`} position={[x, 0, z]}>
          <mesh position={[0, 0.9, 0]} material={stalk} castShadow>
            <cylinderGeometry args={[0.06, 0.1, 1.8, 5]} />
          </mesh>
          <mesh position={[0.12, 1.1, 0]} material={cob}>
            <cylinderGeometry args={[0.08, 0.08, 0.35, 6]} />
          </mesh>
        </group>,
      )
    }
  }
  return <group>{items}</group>
}

/**
 * Simple COD-Zombies-style farm map:
 * barn, farmhouse, perimeter fence, dirt paths, trees, hay, cornfield.
 */
export function FarmMap() {
  const grass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3A5F2A', roughness: 0.95 }), [])
  const darkGrass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2A4520', roughness: 0.98 }), [])
  const gravel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5A564E', roughness: 1 }), [])

  // Register walkable height surfaces (flat base + future stairs/mounds)
  useEffect(() => {
    clearGroundSurfaces()
    // Example porch pad under farmhouse front — ready pattern for stairs later
    addGroundSurface(
      createHeightPad({
        minX: 6,
        maxX: 14,
        minZ: -3.2,
        maxZ: -0.4,
        height: 0.2,
        label: 'farmhouse-porch',
      }),
    )
    return () => clearGroundSurfaces()
  }, [])

  return (
    <group>
      {/* Ground plane — visual mesh; height comes from ground sampler */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={grass}>
        <planeGeometry args={[80, 80]} />
      </mesh>

      {/* Slightly darker patch outside fence */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow material={darkGrass}>
        <planeGeometry args={[120, 120]} />
      </mesh>

      {/* Farmyard gravel pad near barn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-10, 0.015, -6]} receiveShadow material={gravel}>
        <planeGeometry args={[16, 12]} />
      </mesh>

      <DirtPath />

      {/* Buildings */}
      <Barn position={[-12, 0, -8]} />
      <Farmhouse position={[10, 0, -6]} />
      <Fence center={[0, 0, 0]} width={48} depth={40} gateWidth={4.5} />

      {/* Modular zombie lineup (one base model, many looks) */}
      <ZombieShowcase />

      {/* Hay bales near barn */}
      <HayBale position={[-5, 0.55, -4]} rotation={0.3} />
      <HayBale position={[-4.2, 0.55, -4.8]} rotation={1.1} />
      <HayBale position={[-4.6, 1.55, -4.3]} rotation={0.6} />
      <HayBale position={[-18, 0.55, -5]} />
      <HayBale position={[-17.2, 0.55, -6]} rotation={0.8} />

      {/* Trees */}
      <Tree position={[-20, 0, 12]} />
      <Tree position={[18, 0, 14]} />
      <Tree position={[22, 0, -14]} />
      <Tree position={[-22, 0, -16]} />
      <Tree position={[6, 0, -18]} />
      <Tree position={[-8, 0, 16]} />

      {/* Cornfield (zombie spawn flavor) */}
      <CornStalks origin={[14, 0, 6]} rows={5} cols={6} />
      <CornStalks origin={[-20, 0, 4]} rows={4} cols={4} />

      {/* Water trough */}
      <mesh position={[-6, 0.35, -10]} castShadow receiveShadow>
        <SoftBoxGeometry args={[2.2, 0.7, 0.9]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      <mesh position={[-6, 0.55, -10]}>
        <SoftBoxGeometry args={[1.9, 0.15, 0.65]} />
        <meshStandardMaterial color="#3A6B8C" roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Simple outhouse */}
      <group position={[16, 0, 2]}>
        <mesh position={[0, 1.2, 0]} castShadow>
          <SoftBoxGeometry args={[1.4, 2.4, 1.4]} />
          <meshStandardMaterial color="#6B5A3E" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.55, 0]} castShadow rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.2, 0.7, 4]} />
          <meshStandardMaterial color="#3D2914" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.0, 0.72]}>
          <SoftBoxGeometry args={[0.7, 1.6, 0.08]} />
          <meshStandardMaterial color="#4A3728" roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}
