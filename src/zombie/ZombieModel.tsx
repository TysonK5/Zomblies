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
import { sampleZombieWalk, type ZombieWalkPose } from './zombieWalk'

/**
 * Modular zombie body with raised-arm shambling walk and dismemberment.
 * Arms reach out/forward; legs limp with knee bend while walking.
 */
export function ZombieModel({
  appearance,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  animate = true,
  limbs = fullLimbs(),
  crawl = false,
  moving = true,
  gait = 1,
  getLocomotion,
}: ZombieModelProps) {
  const root = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const forearmL = useRef<THREE.Group>(null)
  const forearmR = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const kneeL = useRef<THREE.Group>(null)
  const kneeR = useRef<THREE.Group>(null)
  const smoothMoving = useRef(moving ? 1 : 0)
  /** Walk cycle phase (radians). Advanced from distance traveled, not wall clock. */
  const walkPhase = useRef(appearance.seed * 17.3)
  const prevPose = useRef<ZombieWalkPose | null>(null)

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

  useFrame(({ clock }, delta) => {
    if (!animate) return
    const dt = Math.min(delta, 0.05)
    const loco = getLocomotion?.() ?? { moving, gait, speed: moving ? 4 : 0 }
    // Blend move flag so start/stop isn't a pop
    const targetMove = loco.moving ? 1 : 0
    smoothMoving.current += (targetMove - smoothMoving.current) * Math.min(1, dt * 5)

    // Distance-based cadence: π phase per footstep so legs match travel speed.
    // Stride length ≈ ground covered per step (half gait cycle).
    const speed = Math.max(0, loco.speed ?? 0)
    const strideLen = crawl ? 0.42 : 0.78
    if (speed > 0.08) {
      walkPhase.current += (speed / strideLen) * Math.PI * dt
    } else if (smoothMoving.current > 0.25) {
      // Intended chase but blocked (crowd / wall) — light shuffle
      walkPhase.current += 3.2 * dt
    }

    const t = clock.elapsedTime + seed * 12
    const pose = sampleZombieWalk(
      walkPhase.current,
      t,
      seed,
      smoothMoving.current > 0.2,
      loco.gait * Math.max(smoothMoving.current, 0.15),
      crawl,
    )
    prevPose.current = pose

    const apply = (node: THREE.Group | null, e: { x: number; y: number; z: number }) => {
      if (!node) return
      node.rotation.x = e.x
      node.rotation.y = e.y
      node.rotation.z = e.z
    }

    if (torsoRef.current) {
      torsoRef.current.rotation.x = pose.torso.x
      torsoRef.current.rotation.y = pose.torso.y
      torsoRef.current.rotation.z = pose.torso.z
      torsoRef.current.position.y = 0.15 + pose.torso.yPos
    }
    if (limbs.head) apply(headRef.current, pose.head)

    if (limbs.armL) {
      apply(armL.current, pose.armL)
      if (forearmL.current) {
        // Soft elbow droop only — no Z twist (that crossed the hands)
        forearmL.current.rotation.x = pose.forearmL
        forearmL.current.rotation.y = 0
        forearmL.current.rotation.z = 0
      }
    }
    if (limbs.armR) {
      apply(armR.current, pose.armR)
      if (forearmR.current) {
        forearmR.current.rotation.x = pose.forearmR
        forearmR.current.rotation.y = 0
        forearmR.current.rotation.z = 0
      }
    }

    if (limbs.legL) {
      apply(legL.current, pose.legL)
      if (kneeL.current) kneeL.current.rotation.x = pose.kneeL
    }
    if (limbs.legR) {
      apply(legR.current, pose.legR)
      if (kneeR.current) kneeR.current.rotation.x = pose.kneeR
    }

    if (root.current) {
      root.current.position.x = position[0]
      root.current.position.z = position[2]
      root.current.position.y = position[1] + pose.rootBob
    }
  })

  const hideJaw = accessories.face === 'jaw_missing'

  // HIP_Y: distance from sole (y=0) to hip pivot — keeps feet planted on ground
  const HIP_Y = crawl ? 0.42 : 0.9
  const thighLen = HIP_Y * 0.48
  const shinLen = HIP_Y * 0.42

  return (
    <group position={position} rotation={rotation} scale={scale} ref={root}>
      <group position={[0, HIP_Y, 0]}>
        {/* Legs — thigh + shin (knee) so walk has a real limp */}
        {limbs.legL ? (
          <group ref={legL} position={[-0.12, 0, 0]}>
            <mesh position={[0, -thighLen * 0.5, 0]} material={pantsMat} castShadow>
              <boxGeometry args={[0.16, thighLen, 0.16]} />
            </mesh>
            <group ref={kneeL} position={[0, -thighLen, 0]}>
              <mesh position={[0, -shinLen * 0.5, 0]} material={pantsMat} castShadow>
                <boxGeometry args={[0.14, shinLen, 0.14]} />
              </mesh>
              <group position={[0, -shinLen, 0]}>
                <FootMeshes
                  style={accessories.feet}
                  pantsMat={pantsMat}
                  skinMat={skinMat}
                  accent={accent}
                  side="L"
                />
              </group>
            </group>
          </group>
        ) : (
          <mesh position={[-0.12, -HIP_Y + 0.08, 0]} material={stumpMat} castShadow>
            <sphereGeometry args={[0.09, 6, 6]} />
          </mesh>
        )}

        {limbs.legR ? (
          <group ref={legR} position={[0.12, 0, 0]}>
            <mesh position={[0, -thighLen * 0.5, 0]} material={pantsMat} castShadow>
              <boxGeometry args={[0.16, thighLen, 0.16]} />
            </mesh>
            <group ref={kneeR} position={[0, -thighLen, 0]}>
              <mesh position={[0, -shinLen * 0.5, 0]} material={pantsMat} castShadow>
                <boxGeometry args={[0.14, shinLen, 0.14]} />
              </mesh>
              <group position={[0, -shinLen, 0]}>
                <FootMeshes
                  style={accessories.feet}
                  pantsMat={pantsMat}
                  skinMat={skinMat}
                  accent={accent}
                  side="R"
                />
              </group>
            </group>
          </group>
        ) : (
          <mesh position={[0.12, -HIP_Y + 0.08, 0]} material={stumpMat} castShadow>
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

            {/*
              Arms pivot at shoulders.
              Walk pose: rot.x ≈ −π/2 so both arms point straight ahead (parallel).
              Tiny rot.z only — large Z folded arms across the chest.
            */}
            {limbs.armL ? (
              <group ref={armL} position={[-0.28, 0.5, 0.02]}>
                {/* Upper arm */}
                <mesh position={[0, -0.18, 0]} material={shirtMat} castShadow>
                  <boxGeometry args={[0.12, 0.36, 0.12]} />
                </mesh>
                {/* Forearm + hand — straight chain along upper-arm axis */}
                <group ref={forearmL} position={[0, -0.38, 0]}>
                  <mesh position={[0, -0.14, 0]} material={skinMat} castShadow>
                    <boxGeometry args={[0.1, 0.28, 0.1]} />
                  </mesh>
                  <mesh position={[0, -0.32, 0]} material={skinMat} castShadow>
                    <boxGeometry args={[0.11, 0.11, 0.13]} />
                  </mesh>
                </group>
              </group>
            ) : (
              <mesh position={[-0.28, 0.5, 0]} material={stumpMat} castShadow>
                <sphereGeometry args={[0.08, 6, 6]} />
              </mesh>
            )}

            {limbs.armR ? (
              <group ref={armR} position={[0.28, 0.5, 0.02]}>
                <mesh position={[0, -0.18, 0]} material={shirtMat} castShadow>
                  <boxGeometry args={[0.12, 0.36, 0.12]} />
                </mesh>
                <group ref={forearmR} position={[0, -0.38, 0]}>
                  <mesh position={[0, -0.14, 0]} material={skinMat} castShadow>
                    <boxGeometry args={[0.1, 0.28, 0.1]} />
                  </mesh>
                  <mesh position={[0, -0.32, 0]} material={skinMat} castShadow>
                    <boxGeometry args={[0.11, 0.11, 0.13]} />
                  </mesh>
                  <group position={[0, -0.38, 0.02]}>
                    <HandAccessoryMesh type={accessories.hand} accent={accent} />
                  </group>
                </group>
              </group>
            ) : (
              <mesh position={[0.28, 0.5, 0]} material={stumpMat} castShadow>
                <sphereGeometry args={[0.08, 6, 6]} />
              </mesh>
            )}
          </group>
        )}
      </group>
    </group>
  )
}
