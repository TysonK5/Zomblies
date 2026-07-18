import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LimbId } from '../weapons/limbs'

export type GibSpawn = {
  id: string
  limb: LimbId
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  color: string
}

/** Flying / falling severed limb piece */
export function LimbGib({
  limb,
  position,
  velocity,
  color,
}: {
  limb: LimbId
  position: [number, number, number]
  velocity: [number, number, number]
  color: string
}) {
  const ref = useRef<THREE.Group>(null)
  const pos = useRef(new THREE.Vector3(...position))
  const vel = useRef(new THREE.Vector3(...velocity))
  const spin = useRef(
    new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
    ),
  )
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    [color],
  )
  const blood = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5a0a08',
        emissive: '#2a0504',
        emissiveIntensity: 0.2,
        roughness: 0.85,
      }),
    [],
  )

  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    vel.current.y -= 14 * dt
    pos.current.addScaledVector(vel.current, dt)
    if (pos.current.y < 0.08) {
      pos.current.y = 0.08
      vel.current.y *= -0.25
      vel.current.x *= 0.7
      vel.current.z *= 0.7
      spin.current.multiplyScalar(0.85)
    }
    g.position.copy(pos.current)
    g.rotation.x += spin.current.x * dt
    g.rotation.y += spin.current.y * dt
    g.rotation.z += spin.current.z * dt
  })

  return (
    <group ref={ref} position={position}>
      {limb === 'head' && (
        <>
          <mesh material={mat} castShadow>
            <boxGeometry args={[0.28, 0.3, 0.28]} />
          </mesh>
          <mesh position={[0, -0.12, 0]} material={blood}>
            <sphereGeometry args={[0.1, 6, 6]} />
          </mesh>
        </>
      )}
      {(limb === 'armL' || limb === 'armR') && (
        <>
          <mesh material={mat} castShadow>
            <boxGeometry args={[0.12, 0.45, 0.12]} />
          </mesh>
          <mesh position={[0, 0.22, 0]} material={blood}>
            <sphereGeometry args={[0.07, 6, 6]} />
          </mesh>
        </>
      )}
      {(limb === 'legL' || limb === 'legR') && (
        <>
          <mesh material={mat} castShadow>
            <boxGeometry args={[0.14, 0.5, 0.14]} />
          </mesh>
          <mesh position={[0, 0.24, 0]} material={blood}>
            <sphereGeometry args={[0.08, 6, 6]} />
          </mesh>
        </>
      )}
      {limb === 'torso' && (
        <mesh material={mat} castShadow>
          <boxGeometry args={[0.4, 0.45, 0.25]} />
        </mesh>
      )}
    </group>
  )
}

/** Burst of chunks when head explodes */
export function HeadExplosion({
  position,
}: {
  position: [number, number, number]
}) {
  const bits = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 0.15,
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        2 + Math.random() * 4,
        (Math.random() - 0.5) * 6,
      ),
      scale: 0.04 + Math.random() * 0.08,
    }))
  }, [])

  const group = useRef<THREE.Group>(null)
  const age = useRef(0)
  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6B8F5E', roughness: 0.9 }),
    [],
  )
  const blood = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#8b1510',
        transparent: true,
        opacity: 0.85,
      }),
    [],
  )

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    age.current += delta
    const dt = Math.min(delta, 0.05)
    g.children.forEach((child, i) => {
      const b = bits[i]
      if (!b || !(child instanceof THREE.Mesh)) return
      b.vel.y -= 16 * dt
      b.offset.addScaledVector(b.vel, dt)
      child.position.copy(b.offset)
      child.rotation.x += dt * 8
      child.rotation.z += dt * 6
      if (age.current > 0.15 && child.material === blood) {
        ;(child.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          0.85 - (age.current - 0.15) * 2,
        )
      }
    })
    if (age.current > 1.2) g.visible = false
  })

  return (
    <group ref={group} position={position}>
      {bits.map((b) => (
        <mesh key={b.id} position={b.offset.toArray()} scale={b.scale} material={b.id % 3 === 0 ? blood : skin}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
    </group>
  )
}
