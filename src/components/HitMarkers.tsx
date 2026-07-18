import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  getHitMarkers,
  subscribeHitMarkers,
  syncMarkerToParent,
  tickHitMarkers,
  type HitMarker,
  type HitSurface,
} from '../weapons/hitMarkers'

/**
 * Bullet holes on world + layered wounds on zombies
 * (dark hole, sticky blood splat, mist, flying spray).
 */
export function HitMarkers() {
  const [, setTick] = useState(0)

  useEffect(() => subscribeHitMarkers(() => setTick((n) => n + 1)), [])

  useFrame((_, delta) => {
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

function surfaceKind(s: HitSurface): HitSurface {
  // Legacy alias
  if (s === 'flesh') return 'blood_splat'
  return s
}

function HitDecal({ marker }: { marker: HitMarker }) {
  const group = useRef<THREE.Group>(null)
  const kind = surfaceKind(marker.surface)

  const holeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#0a0505',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
    [],
  )
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#4a0c0a',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
      }),
    [],
  )
  const splatMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#6e1010',
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  )
  const mistMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#a01810',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const sprayMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#8b1210',
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    [],
  )
  const worldMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#1a1512',
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  )

  useFrame(() => {
    const g = group.current
    if (!g) return

    if (kind !== 'blood_spray') {
      syncMarkerToParent(marker)
    }

    const life = Math.max(0, marker.life / marker.maxLife)
    // Tiny lift only — patches already sit on the limb sphere surface
    const lift = kind === 'blood_spray' ? 0 : kind === 'blood_mist' ? 0.02 : 0.008
    g.position.set(
      marker.x + marker.nx * lift,
      marker.y + marker.ny * lift,
      marker.z + marker.nz * lift,
    )

    const n = new THREE.Vector3(marker.nx, marker.ny, marker.nz)
    if (n.lengthSq() < 1e-6) n.set(0, 1, 0)
    else n.normalize()
    // Flat against the surface (local +Z → outward normal)
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
    g.rotateZ(marker.roll)

    const s = marker.scale

    if (kind === 'blood_mist') {
      mistMat.opacity = 0.5 * life
      const grow = s * (1 + (1 - life) * 2.2)
      g.scale.set(grow, grow, grow)
    } else if (kind === 'blood_spray') {
      sprayMat.opacity = 0.3 + 0.7 * life
      const shrink = s * (0.6 + 0.4 * life)
      g.scale.set(shrink, shrink, shrink)
    } else if (kind === 'bullet_hole') {
      holeMat.opacity = 0.6 + 0.4 * Math.min(1, life * 2)
      ringMat.opacity = 0.55 + 0.4 * Math.min(1, life * 2)
      g.scale.set(s, s, s)
    } else if (kind === 'blood_splat') {
      // Keep nearly circular so wrap band tiles cleanly around the limb
      splatMat.opacity = 0.5 + 0.48 * Math.min(1, life * 2)
      g.scale.set(s * 1.05, s * 0.95, s)
    } else {
      worldMat.opacity = 0.35 + 0.6 * Math.min(1, life * 3)
      g.scale.set(s, s, s)
    }
  })

  if (kind === 'bullet_hole') {
    return (
      <group ref={group} renderOrder={42} frustumCulled={false}>
        {/* Outer scorched / blood ring */}
        <mesh material={ringMat} renderOrder={42} frustumCulled={false}>
          <ringGeometry args={[0.45, 1, 12]} />
        </mesh>
        {/* Dark entry hole */}
        <mesh material={holeMat} renderOrder={43} position={[0, 0, 0.002]} frustumCulled={false}>
          <circleGeometry args={[0.42, 10]} />
        </mesh>
      </group>
    )
  }

  if (kind === 'blood_splat') {
    return (
      <group ref={group} renderOrder={41} frustumCulled={false}>
        <mesh material={splatMat} renderOrder={41} frustumCulled={false}>
          <circleGeometry args={[1, 11]} />
        </mesh>
        {/* Smaller darker core */}
        <mesh
          material={ringMat}
          renderOrder={42}
          position={[0.12, -0.08, 0.002]}
          scale={[0.45, 0.55, 1]}
          frustumCulled={false}
        >
          <circleGeometry args={[1, 8]} />
        </mesh>
      </group>
    )
  }

  if (kind === 'blood_mist') {
    return (
      <group ref={group} renderOrder={44} frustumCulled={false}>
        <mesh material={mistMat} renderOrder={44} frustumCulled={false}>
          <circleGeometry args={[1, 12]} />
        </mesh>
      </group>
    )
  }

  if (kind === 'blood_spray') {
    return (
      <group ref={group} renderOrder={45} frustumCulled={false}>
        <mesh material={sprayMat} renderOrder={45} frustumCulled={false}>
          <sphereGeometry args={[1, 6, 6]} />
        </mesh>
      </group>
    )
  }

  // World bullet hole
  return (
    <group ref={group} renderOrder={40} frustumCulled={false}>
      <mesh material={worldMat} renderOrder={40} frustumCulled={false}>
        <circleGeometry args={[1, 7]} />
      </mesh>
      <mesh material={holeMat} renderOrder={41} position={[0, 0, 0.002]} scale={0.4} frustumCulled={false}>
        <circleGeometry args={[1, 6]} />
      </mesh>
    </group>
  )
}
