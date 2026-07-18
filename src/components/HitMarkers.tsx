import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  getHitMarkers,
  subscribeHitMarkers,
  syncMarkerToParent,
  tickHitMarkers,
  type HitMarker,
} from '../weapons/hitMarkers'

/**
 * Bullet holes on world surfaces + blood impacts on flesh.
 * Attached (zombie) markers update every frame so they stick while the body moves.
 */
export function HitMarkers() {
  const [, setTick] = useState(0)

  useEffect(() => subscribeHitMarkers(() => setTick((n) => n + 1)), [])

  useFrame((_, delta) => {
    // Sync attached markers to zombie poses, then age them
    tickHitMarkers(Math.min(delta, 0.05))
  })

  const markers = getHitMarkers()

  return (
    <group>
      {markers.map((m) => (
        <HitDecal key={m.id} marker={m} />
      ))}
    </group>
  )
}

function HitDecal({ marker }: { marker: HitMarker }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => {
    if (marker.surface === 'world') {
      return new THREE.MeshBasicMaterial({
        color: '#1a1512',
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    }
    if (marker.surface === 'blood_mist') {
      return new THREE.MeshBasicMaterial({
        color: '#a01810',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    }
    return new THREE.MeshBasicMaterial({
      color: '#7a100c',
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  }, [marker.surface])

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return

    // Stick to zombie every frame (independent of parent useFrame order)
    syncMarkerToParent(marker)

    const life = Math.max(0, marker.life / marker.maxLife)
    const lift = 0.03
    mesh.position.set(
      marker.x + marker.nx * lift,
      marker.y + marker.ny * lift,
      marker.z + marker.nz * lift,
    )

    const n = new THREE.Vector3(marker.nx, marker.ny, marker.nz)
    if (n.lengthSq() < 1e-6) n.set(0, 1, 0)
    else n.normalize()
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)

    if (marker.surface === 'blood_mist') {
      mat.opacity = 0.55 * life
      const s = marker.scale * (1 + (1 - life) * 2.2)
      mesh.scale.set(s, s, s)
    } else {
      mat.opacity = 0.35 + 0.6 * Math.min(1, life * 3)
      mesh.scale.set(marker.scale, marker.scale, marker.scale)
    }
  })

  return (
    <mesh
      ref={ref}
      position={[marker.x, marker.y, marker.z]}
      material={mat}
      scale={marker.scale}
      renderOrder={40}
      frustumCulled={false}
    >
      <circleGeometry args={[1, marker.surface === 'world' ? 6 : 10]} />
    </mesh>
  )
}
