import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ENVIRONMENT, type TimeOfDay } from '../environment/timeOfDay'

type EnvironmentProps = {
  timeOfDay: TimeOfDay
}

function Moon({ visible, color, position }: { visible: boolean; color: string; position: [number, number, number] }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.85,
        roughness: 1,
        metalness: 0,
      }),
    [color],
  )

  if (!visible) return null

  return (
    <mesh position={position} material={mat}>
      <sphereGeometry args={[3.2, 16, 16]} />
    </mesh>
  )
}

function YardLamp({ position }: { position: [number, number, number] }) {
  const pole = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2a28', roughness: 0.85, metalness: 0.3 }), [])
  const lamp = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffe8a0',
        emissive: '#ffcc66',
        emissiveIntensity: 1.2,
        roughness: 0.4,
      }),
    [],
  )

  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} material={pole} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 3, 6]} />
      </mesh>
      <mesh position={[0, 3.15, 0]} material={lamp}>
        <sphereGeometry args={[0.2, 10, 10]} />
      </mesh>
    </group>
  )
}

/**
 * Time-of-day driven sky, fog, stars, sun/moon light rig, and accent lamps.
 */
export function Environment({ timeOfDay }: EnvironmentProps) {
  const preset = ENVIRONMENT[timeOfDay]
  const { scene, gl } = useThree()
  const keyRef = useRef<THREE.DirectionalLight>(null)

  useEffect(() => {
    gl.setClearColor(preset.clearColor)
    scene.background = new THREE.Color(preset.clearColor)
  }, [gl, scene, preset.clearColor])

  // Keep key light aimed at farm center for stable shadows
  useEffect(() => {
    const light = keyRef.current
    if (!light) return
    light.target.position.set(0, 0, 0)
    light.target.updateMatrixWorld()
  }, [timeOfDay])

  const [sx, sy, sz] = preset.sunPosition
  // Moon opposite-ish the sun for twilight/night
  const moonPos: [number, number, number] =
    timeOfDay === 'night' ? [sx, sy, sz] : timeOfDay === 'twilight' ? [-50, 28, -40] : [0, 0, 0]

  return (
    <>
      <Sky
        sunPosition={preset.sunPosition}
        turbidity={preset.sky.turbidity}
        rayleigh={preset.sky.rayleigh}
        mieCoefficient={preset.sky.mieCoefficient}
        mieDirectionalG={preset.sky.mieDirectionalG}
      />

      {preset.stars.visible && (
        <Stars
          radius={120}
          depth={50}
          count={preset.stars.count}
          factor={preset.stars.factor}
          saturation={preset.stars.saturation}
          fade={preset.stars.fade}
          speed={timeOfDay === 'night' ? 0.35 : 0.15}
        />
      )}

      <fog attach="fog" args={[preset.fog.color, preset.fog.near, preset.fog.far]} />

      <ambientLight color={preset.ambient.color} intensity={preset.ambient.intensity} />

      <directionalLight
        ref={keyRef}
        castShadow={preset.key.castShadow}
        position={preset.sunPosition}
        intensity={preset.key.intensity}
        color={preset.key.color}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={120}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.00025}
      />

      <directionalLight
        position={preset.fill.position}
        intensity={preset.fill.intensity}
        color={preset.fill.color}
      />

      <hemisphereLight args={[preset.hemi.sky, preset.hemi.ground, preset.hemi.intensity]} />

      {preset.pointLights.map((p, i) => (
        <pointLight
          key={`${timeOfDay}-pl-${i}`}
          position={p.position}
          color={p.color}
          intensity={p.intensity}
          distance={p.distance}
          decay={2}
        />
      ))}

      <Moon visible={preset.moon} color={preset.moonColor} position={moonPos} />

      {/* Physical yard lamp — reads at night/twilight */}
      {(timeOfDay === 'night' || timeOfDay === 'twilight') && <YardLamp position={[0, 0, 12]} />}
    </>
  )
}
