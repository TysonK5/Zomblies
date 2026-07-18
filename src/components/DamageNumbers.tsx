import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import {
  getDamageFloaters,
  subscribeDamageNumbers,
  tickDamageNumbers,
  type DamageFloater,
} from '../weapons/damageNumbers'

/** World-space floating damage readouts (billboarded). */
export function DamageNumbers() {
  const [, setTick] = useState(0)
  useEffect(() => subscribeDamageNumbers(() => setTick((n) => n + 1)), [])

  useFrame((_, delta) => {
    tickDamageNumbers(Math.min(delta, 0.05))
  })

  const floaters = getDamageFloaters()
  return (
    <group>
      {floaters.map((f) => (
        <DamageFloaterMesh key={f.id} floater={f} />
      ))}
    </group>
  )
}

function DamageFloaterMesh({ floater }: { floater: DamageFloater }) {
  const ref = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const life = () => Math.max(0, floater.life / floater.maxLife)

  useFrame(() => {
    const g = ref.current
    if (!g) return
    g.position.set(floater.x, floater.y, floater.z)
    g.quaternion.copy(camera.quaternion)
    const u = life()
    g.scale.setScalar(floater.scale * (0.85 + (1 - u) * 0.35))
  })

  // Opacity via material on Text — use fillOpacity
  const opacity = Math.min(1, floater.life * 2)

  return (
    <group ref={ref} position={[floater.x, floater.y, floater.z]} renderOrder={100}>
      <Text
        fontSize={0.28 * floater.scale}
        color={floater.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#1a0505"
        fillOpacity={opacity}
        depthOffset={-1}
      >
        {floater.text}
      </Text>
    </group>
  )
}
