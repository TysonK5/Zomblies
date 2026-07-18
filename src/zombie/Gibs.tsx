import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LimbId } from '../weapons/limbs'
import { getGroundHeight } from '../game/ground'

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

/** Approximate half-height of gib mesh (center → sole) so pieces rest on ground */
function gibRestOffset(limb: LimbId): number {
  if (limb === 'head') return 0.14
  if (limb === 'armL' || limb === 'armR') return 0.12
  if (limb === 'legL' || limb === 'legR') return 0.13
  return 0.14
}

/** Flying / falling severed limb piece — settles on terrain, no ground clip */
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
  const settled = useRef(false)
  const rest = gibRestOffset(limb)

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
    if (!g || settled.current) return
    const dt = Math.min(delta, 0.05)

    vel.current.y -= 16 * dt
    pos.current.addScaledVector(vel.current, dt)

    const groundY = getGroundHeight(pos.current.x, pos.current.z)
    const minY = groundY + rest

    if (pos.current.y <= minY) {
      pos.current.y = minY
      // Bounce once, then settle flat-ish
      if (Math.abs(vel.current.y) > 1.2) {
        vel.current.y *= -0.22
        vel.current.x *= 0.55
        vel.current.z *= 0.55
        spin.current.multiplyScalar(0.5)
      } else {
        vel.current.set(0, 0, 0)
        spin.current.multiplyScalar(0.3)
        // Lay roughly on side so mesh doesn't look planted mid-air
        g.rotation.x = Math.PI / 2
        g.rotation.z *= 0.5
        settled.current = true
      }
    }

    g.position.copy(pos.current)
    if (!settled.current) {
      g.rotation.x += spin.current.x * dt
      g.rotation.y += spin.current.y * dt
      g.rotation.z += spin.current.z * dt
    }
  })

  // Geometry centered on group; rest offset keeps lowest extent above ground
  return (
    <group ref={ref} position={position}>
      {limb === 'head' && (
        <>
          <mesh material={mat} castShadow>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
          </mesh>
          <mesh position={[0, -0.1, 0]} material={blood}>
            <sphereGeometry args={[0.09, 6, 6]} />
          </mesh>
        </>
      )}
      {(limb === 'armL' || limb === 'armR') && (
        <>
          <mesh material={mat} castShadow>
            <boxGeometry args={[0.12, 0.4, 0.12]} />
          </mesh>
          <mesh position={[0, 0.18, 0]} material={blood}>
            <sphereGeometry args={[0.07, 6, 6]} />
          </mesh>
        </>
      )}
      {(limb === 'legL' || limb === 'legR') && (
        <>
          <mesh material={mat} castShadow>
            <boxGeometry args={[0.14, 0.45, 0.14]} />
          </mesh>
          <mesh position={[0, 0.2, 0]} material={blood}>
            <sphereGeometry args={[0.08, 6, 6]} />
          </mesh>
        </>
      )}
      {limb === 'torso' && (
        <mesh material={mat} castShadow>
          <boxGeometry args={[0.4, 0.4, 0.22]} />
        </mesh>
      )}
    </group>
  )
}

/** Burst of chunks when head explodes — each piece collides with ground */
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
      settled: false,
    }))
  }, [])

  const group = useRef<THREE.Group>(null)
  const age = useRef(0)
  const origin = useRef(new THREE.Vector3(...position))
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
      if (!b || !(child instanceof THREE.Mesh) || b.settled) return

      b.vel.y -= 18 * dt
      b.offset.addScaledVector(b.vel, dt)

      const worldX = origin.current.x + b.offset.x
      const worldZ = origin.current.z + b.offset.z
      const groundY = getGroundHeight(worldX, worldZ)
      const minLocalY = groundY - origin.current.y + b.scale * 0.5

      if (b.offset.y <= minLocalY) {
        b.offset.y = minLocalY
        if (Math.abs(b.vel.y) > 1) {
          b.vel.y *= -0.2
          b.vel.x *= 0.5
          b.vel.z *= 0.5
        } else {
          b.vel.set(0, 0, 0)
          b.settled = true
        }
      }

      child.position.copy(b.offset)
      child.rotation.x += dt * 8
      child.rotation.z += dt * 6
      if (age.current > 0.15 && child.material === blood) {
        ;(child.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          0.85 - (age.current - 0.15) * 1.5,
        )
      }
    })

    if (age.current > 2.5) g.visible = false
  })

  return (
    <group ref={group} position={position}>
      {bits.map((b) => (
        <mesh
          key={b.id}
          position={b.offset.toArray()}
          scale={b.scale}
          material={b.id % 3 === 0 ? blood : skin}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      ))}
    </group>
  )
}
