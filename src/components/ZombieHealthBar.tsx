import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  /** 0–1 remaining */
  hpFrac: number
  /** World position of zombie feet / root */
  getWorldPos: () => { x: number; y: number; z: number }
  visible: boolean
  height?: number
}

/**
 * Small billboard HP bar above a damaged (but living) zombie.
 */
export function ZombieHealthBar({ hpFrac, getWorldPos, visible, height = 2.15 }: Props) {
  const group = useRef<THREE.Group>(null)
  const fill = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.visible = visible && hpFrac < 0.999 && hpFrac > 0
    if (!g.visible) return
    const p = getWorldPos()
    g.position.set(p.x, p.y + height, p.z)
    g.quaternion.copy(camera.quaternion)
    if (fill.current) {
      const w = Math.max(0.02, hpFrac)
      fill.current.scale.x = w
      fill.current.position.x = -0.5 * (1 - w) * 0.7
      const mat = fill.current.material as THREE.MeshBasicMaterial
      // Green → yellow → red
      if (hpFrac > 0.55) mat.color.setHex(0x44cc44)
      else if (hpFrac > 0.3) mat.color.setHex(0xddcc33)
      else mat.color.setHex(0xdd3333)
    }
  })

  return (
    <group ref={group} visible={false} renderOrder={60}>
      {/* Background */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.72, 0.1]} />
        <meshBasicMaterial color="#111" transparent opacity={0.75} depthTest={false} />
      </mesh>
      {/* Fill (scaled from left) */}
      <mesh ref={fill} position={[0, 0, 0.01]}>
        <planeGeometry args={[0.68, 0.07]} />
        <meshBasicMaterial color="#44cc44" transparent opacity={0.95} depthTest={false} />
      </mesh>
    </group>
  )
}
