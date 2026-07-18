import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ZombieModelProps } from './types'
import {
  FaceAccessoryMesh,
  FootMeshes,
  HandAccessoryMesh,
  HeadAccessoryMesh,
  TorsoAccessoryMesh,
} from './Accessories'
import { fullLimbs } from '../weapons/limbs'

/**
 * Modular zombie body with optional missing limbs (dismemberment).
 */
export function ZombieModel({
  appearance,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  animate = true,
  limbs = fullLimbs(),
  crawl = false,
}: ZombieModelProps) {
  const root = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)

  const { skin, shirt, pants, hair, accent, accessories, seed } = appearance

  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: skin, roughness: 0.88 }),
    [skin],
  )
  const shirtMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.92 }),
    [shirt],
  )
  const pantsMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: pants, roughness: 0.92 }),
    [pants],
  )
  const stumpMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4a1010',
        emissive: '#2a0808',
        emissiveIntensity: 0.25,
        roughness: 0.9,
      }),
    [],
  )
  const eyeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a0505',
        emissive: '#4a1010',
        emissiveIntensity: 0.35,
        roughness: 0.4,
      }),
    [],
  )
  const mouthMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2a1010', roughness: 0.9 }),
    [],
  )

  const lean = (seed - 0.5) * 0.15
  const shoulderDrop = seed * 0.12
  const armReach = 0.15 + seed * 0.25

  useFrame(({ clock }) => {
    if (!animate) return
    const t = clock.elapsedTime + seed * 10
    const limp = crawl ? 1.4 : 0.7 + seed * 0.4

    if (torsoRef.current) {
      torsoRef.current.rotation.z = Math.sin(t * 1.2) * 0.04 + lean
      torsoRef.current.rotation.x = crawl ? 1.1 + Math.sin(t * 2) * 0.05 : Math.sin(t * 0.8) * 0.03
      torsoRef.current.position.y = Math.sin(t * 2.1) * 0.015 + (crawl ? -0.35 : 0)
    }
    if (headRef.current && limbs.head) {
      headRef.current.rotation.y = Math.sin(t * 0.9) * 0.12
      headRef.current.rotation.z = Math.sin(t * 1.1) * 0.05 + lean * 0.5
      headRef.current.rotation.x = 0.08 + Math.sin(t * 1.4) * 0.04
    }
    if (armL.current && limbs.armL) {
      armL.current.rotation.x = crawl
        ? -0.8 + Math.sin(t * limp * 2) * 0.4
        : -armReach + Math.sin(t * limp) * 0.15
      armL.current.rotation.z = 0.35 + Math.sin(t * 0.7) * 0.05
    }
    if (armR.current && limbs.armR) {
      armR.current.rotation.x = crawl
        ? -0.8 + Math.sin(t * limp * 2 + Math.PI) * 0.4
        : -armReach - 0.1 + Math.sin(t * limp + 0.5) * 0.12
      armR.current.rotation.z = -0.25 - shoulderDrop
    }
    if (legL.current && limbs.legL) {
      legL.current.rotation.x = Math.sin(t * limp * 2) * (crawl ? 0.15 : 0.35)
    }
    if (legR.current && limbs.legR) {
      legR.current.rotation.x = Math.sin(t * limp * 2 + Math.PI) * (crawl ? 0.15 : 0.28)
    }
    if (root.current) {
      root.current.position.y =
        position[1] + (crawl ? 0 : Math.abs(Math.sin(t * limp * 2)) * 0.03)
    }
  })

  const hideJaw = accessories.face === 'jaw_missing'

  return (
    <group position={position} rotation={rotation} scale={scale} ref={root}>
      <group position={[0, crawl ? 0.55 : 0.95, 0]}>
        {/* Legs */}
        {limbs.legL ? (
          <group ref={legL} position={[-0.12, 0, 0]}>
            <mesh position={[0, -0.28, 0]} material={pantsMat} castShadow>
              <boxGeometry args={[0.16, 0.55, 0.16]} />
            </mesh>
            <group position={[0, -0.55, 0]}>
              <FootMeshes
                style={accessories.feet}
                pantsMat={pantsMat}
                skinMat={skinMat}
                accent={accent}
                side="L"
              />
            </group>
          </group>
        ) : (
          <mesh position={[-0.12, -0.05, 0]} material={stumpMat} castShadow>
            <sphereGeometry args={[0.09, 6, 6]} />
          </mesh>
        )}

        {limbs.legR ? (
          <group ref={legR} position={[0.12, 0, 0]}>
            <mesh position={[0, -0.28, 0]} material={pantsMat} castShadow>
              <boxGeometry args={[0.16, 0.55, 0.16]} />
            </mesh>
            <group position={[0, -0.55, 0]}>
              <FootMeshes
                style={accessories.feet}
                pantsMat={pantsMat}
                skinMat={skinMat}
                accent={accent}
                side="R"
              />
            </group>
          </group>
        ) : (
          <mesh position={[0.12, -0.05, 0]} material={stumpMat} castShadow>
            <sphereGeometry args={[0.09, 6, 6]} />
          </mesh>
        )}

        {/* Torso */}
        {limbs.torso && (
          <group ref={torsoRef} position={[0, 0.15, 0]}>
            <mesh position={[0, 0.05, 0]} material={shirtMat} castShadow>
              <boxGeometry args={[0.42, 0.25, 0.24]} />
            </mesh>
            <mesh position={[0, 0.35, 0]} material={shirtMat} castShadow>
              <boxGeometry args={[0.48, 0.5, 0.28]} />
            </mesh>
            <mesh position={[0, 0.65, 0]} material={skinMat} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 0.12, 8]} />
            </mesh>

            <TorsoAccessoryMesh type={accessories.torso} accent={accent} shirt={shirt} />

            {/* Head or neck stump */}
            {limbs.head ? (
              <group ref={headRef} position={[0, 0.82, 0]}>
                <mesh material={skinMat} castShadow>
                  <boxGeometry args={[0.32, 0.36, 0.32]} />
                </mesh>
                <mesh position={[-0.08, 0.04, 0.16]} material={eyeMat}>
                  <boxGeometry args={[0.07, 0.05, 0.04]} />
                </mesh>
                {accessories.face !== 'eyepatch' && (
                  <mesh position={[0.08, 0.04, 0.16]} material={eyeMat}>
                    <boxGeometry args={[0.07, 0.05, 0.04]} />
                  </mesh>
                )}
                {!hideJaw && (
                  <mesh position={[0, -0.1, 0.15]} material={mouthMat}>
                    <boxGeometry args={[0.14, 0.05, 0.04]} />
                  </mesh>
                )}
                <HeadAccessoryMesh type={accessories.head} accent={accent} hair={hair} />
                <FaceAccessoryMesh type={accessories.face} skin={skin} />
              </group>
            ) : (
              <mesh position={[0, 0.72, 0]} material={stumpMat} castShadow>
                <sphereGeometry args={[0.12, 8, 8]} />
              </mesh>
            )}

            {/* Arms */}
            {limbs.armL ? (
              <group ref={armL} position={[-0.3, 0.45, 0]}>
                <mesh position={[0, -0.22, 0]} material={shirtMat} castShadow>
                  <boxGeometry args={[0.14, 0.42, 0.14]} />
                </mesh>
                <mesh position={[0, -0.48, 0.02]} material={skinMat} castShadow>
                  <boxGeometry args={[0.12, 0.22, 0.12]} />
                </mesh>
                <mesh position={[0, -0.62, 0.02]} material={skinMat} castShadow>
                  <boxGeometry args={[0.11, 0.1, 0.11]} />
                </mesh>
              </group>
            ) : (
              <mesh position={[-0.28, 0.45, 0]} material={stumpMat} castShadow>
                <sphereGeometry args={[0.08, 6, 6]} />
              </mesh>
            )}

            {limbs.armR ? (
              <group ref={armR} position={[0.3, 0.45, 0]}>
                <mesh position={[0, -0.22, 0]} material={shirtMat} castShadow>
                  <boxGeometry args={[0.14, 0.42, 0.14]} />
                </mesh>
                <mesh position={[0, -0.48, 0.02]} material={skinMat} castShadow>
                  <boxGeometry args={[0.12, 0.22, 0.12]} />
                </mesh>
                <mesh position={[0, -0.62, 0.02]} material={skinMat} castShadow>
                  <boxGeometry args={[0.11, 0.1, 0.11]} />
                </mesh>
                <HandAccessoryMesh type={accessories.hand} accent={accent} />
              </group>
            ) : (
              <mesh position={[0.28, 0.45, 0]} material={stumpMat} castShadow>
                <sphereGeometry args={[0.08, 6, 6]} />
              </mesh>
            )}
          </group>
        )}
      </group>
    </group>
  )
}
