import { useMemo } from 'react'
import * as THREE from 'three'

type FenceProps = {
  /** Start corner of rectangular fence perimeter */
  center?: [number, number, number]
  width?: number
  depth?: number
  /** Leave a gap on the +Z side for an entrance */
  gateWidth?: number
}

/** Wooden post-and-rail fence around the farmyard */
export function Fence({
  center = [0, 0, 0],
  width = 48,
  depth = 40,
  gateWidth = 4,
}: FenceProps) {
  const postMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5C4033', roughness: 0.95 }), [])
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6B5344', roughness: 0.9 }), [])
  const gateMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4A3728', roughness: 0.85 }), [])

  const halfW = width / 2
  const halfD = depth / 2
  const postSpacing = 3
  const railHeights = [0.55, 1.15]

  const posts: [number, number, number][] = []
  const rails: { pos: [number, number, number]; size: [number, number, number]; rotY?: number }[] = []

  // Front (+Z) with gate gap
  const frontPostsLeft = Math.floor((-gateWidth / 2 + halfW) / postSpacing)
  const frontPostsRight = Math.floor((-gateWidth / 2 + halfW) / postSpacing)

  for (let i = 0; i <= frontPostsLeft; i++) {
    const x = -halfW + i * postSpacing
    if (x < -gateWidth / 2 - 0.2) posts.push([x, 0.75, halfD])
  }
  for (let i = 0; i <= frontPostsRight; i++) {
    const x = halfW - i * postSpacing
    if (x > gateWidth / 2 + 0.2) posts.push([x, 0.75, halfD])
  }
  // Gate posts
  posts.push([-gateWidth / 2, 0.9, halfD])
  posts.push([gateWidth / 2, 0.9, halfD])

  // Back (-Z)
  for (let x = -halfW; x <= halfW + 0.01; x += postSpacing) {
    posts.push([x, 0.75, -halfD])
  }

  // Left (-X) and Right (+X)
  for (let z = -halfD + postSpacing; z < halfD; z += postSpacing) {
    posts.push([-halfW, 0.75, z])
    posts.push([halfW, 0.75, z])
  }

  // Rails — continuous segments per side (simplified long boxes)
  for (const h of railHeights) {
    // Back
    rails.push({ pos: [0, h, -halfD], size: [width, 0.12, 0.1] })
    // Left
    rails.push({ pos: [-halfW, h, 0], size: [0.1, 0.12, depth] })
    // Right
    rails.push({ pos: [halfW, h, 0], size: [0.1, 0.12, depth] })
    // Front left of gate
    const leftSeg = halfW - gateWidth / 2
    rails.push({
      pos: [(-halfW + -gateWidth / 2) / 2, h, halfD],
      size: [leftSeg, 0.12, 0.1],
    })
    // Front right of gate
    rails.push({
      pos: [(halfW + gateWidth / 2) / 2, h, halfD],
      size: [leftSeg, 0.12, 0.1],
    })
  }

  return (
    <group position={center}>
      {posts.map((p, i) => (
        <mesh key={`post-${i}`} position={p} castShadow material={postMat}>
          <boxGeometry args={[0.22, p[1] === 0.9 ? 1.8 : 1.5, 0.22]} />
        </mesh>
      ))}

      {rails.map((r, i) => (
        <mesh key={`rail-${i}`} position={r.pos} material={railMat} castShadow>
          <boxGeometry args={r.size} />
        </mesh>
      ))}

      {/* Open gate panels (swung inward slightly) */}
      <mesh position={[-gateWidth / 4 - 0.3, 0.85, halfD - 0.6]} rotation={[0, 0.45, 0]} material={gateMat} castShadow>
        <boxGeometry args={[gateWidth / 2 - 0.15, 1.5, 0.1]} />
      </mesh>
      <mesh position={[gateWidth / 4 + 0.3, 0.85, halfD - 0.6]} rotation={[0, -0.45, 0]} material={gateMat} castShadow>
        <boxGeometry args={[gateWidth / 2 - 0.15, 1.5, 0.1]} />
      </mesh>

      {/* Gate cross-braces */}
      <mesh position={[-gateWidth / 4 - 0.3, 0.85, halfD - 0.55]} rotation={[0, 0.45, Math.PI / 5]} material={postMat}>
        <boxGeometry args={[gateWidth / 2 - 0.3, 0.08, 0.06]} />
      </mesh>
      <mesh position={[gateWidth / 4 + 0.3, 0.85, halfD - 0.55]} rotation={[0, -0.45, -Math.PI / 5]} material={postMat}>
        <boxGeometry args={[gateWidth / 2 - 0.3, 0.08, 0.06]} />
      </mesh>
    </group>
  )
}
