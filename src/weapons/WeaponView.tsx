import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WeaponModel } from './WeaponModels'
import { weaponState } from './weaponState'
import { WEAPONS } from './definitions'
import type { WeaponId } from './types'
import { playerState } from '../game/playerState'
import { getCameraMode } from '../game/cameraMode'
import {
  applyIdleSway,
  getWeaponClip,
  phaseToClip,
  sampleClip,
  type ViewPose,
} from './weaponAnims'

const _offset = new THREE.Vector3()
const _worldPos = new THREE.Vector3()
const _look = new THREE.Quaternion()
const _animQ = new THREE.Quaternion()
const _euler = new THREE.Euler()

/** Combat pump flash: core + side vents last exactly 0.08s */
const SHOTGUN_FLASH_LIFE = 0.08
/** Smoke billow drifts for 1.5s */
const SHOTGUN_SMOKE_LIFE = 1.5

/**
 * FPS viewmodel driven by keyframed clips (game-style fire / lever / reload / pump).
 * Combat pump uses a three-part muzzle array + 1-frame point light.
 */
export function WeaponView() {
  const { camera } = useThree()
  const root = useRef<THREE.Group>(null)
  const model = useRef<THREE.Group>(null)
  /** Generic cone flash (most guns) */
  const muzzle = useRef<THREE.Group>(null)
  const flashOuter = useRef<THREE.Mesh>(null)
  const flashCore = useRef<THREE.Mesh>(null)
  /** Shotgun three-part array */
  const sgFlash = useRef<THREE.Group>(null)
  const sgCore = useRef<THREE.Mesh>(null)
  const sgVentL = useRef<THREE.Mesh>(null)
  const sgVentR = useRef<THREE.Mesh>(null)
  const sgSmoke = useRef<THREE.Mesh>(null)
  const muzzleLight = useRef<THREE.PointLight>(null)
  const [weaponId, setWeaponId] = useState<WeaponId>(() => weaponState.currentId)
  const prevWeapon = useRef(weaponId)
  const flash = useRef(0)
  const sgFlashT = useRef(0)
  const sgSmokeT = useRef(0)
  const lightFrames = useRef(0)
  const lastFirePulse = useRef(weaponState.firePulse)
  const lastPx = useRef(0)
  const lastPz = useRef(0)
  const moveAmount = useRef(0)
  const depthPatched = useRef(false)

  useEffect(() => {
    return weaponState.subscribe((s) => {
      if (s.id !== prevWeapon.current) {
        prevWeapon.current = s.id
        depthPatched.current = false
        setWeaponId(s.id)
      }
    })
  }, [])

  useFrame(({ clock }, delta) => {
    const g = root.current
    if (!g) return

    const fps = getCameraMode() === 'first'
    g.visible = fps
    if (!fps) return

    if (!depthPatched.current) {
      g.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const mat of mats) {
            mat.depthTest = false
            mat.depthWrite = false
            mat.needsUpdate = true
          }
          mesh.renderOrder = 999
        }
      })
      depthPatched.current = true
    }

    const def = WEAPONS[weaponState.currentId]
    const id = weaponState.currentId
    const t = clock.elapsedTime
    const phase = weaponState.phase
    const u = weaponState.animU
    const clipId = phaseToClip(phase)
    const keys = getWeaponClip(id, clipId)
    let pose: ViewPose = sampleClip(keys, phase === 'idle' ? 0 : u)

    // Movement bob strength
    const px = playerState.x
    const pz = playerState.z
    const dist = Math.hypot(px - lastPx.current, pz - lastPz.current)
    lastPx.current = px
    lastPz.current = pz
    const speedApprox = dist / Math.max(delta, 1e-4)
    moveAmount.current = THREE.MathUtils.lerp(
      moveAmount.current,
      Math.min(1, speedApprox / 7),
      1 - Math.exp(-delta * 10),
    )

    const lockAim = id === 'pitchfork'
    if (phase === 'idle' || phase === 'equip') {
      pose = applyIdleSway(pose, t, moveAmount.current, { lockAim })
    } else if (!lockAim) {
      pose = applyIdleSway(pose, t, moveAmount.current * 0.25)
    }

    // Detect new shot
    if (weaponState.firePulse !== lastFirePulse.current) {
      lastFirePulse.current = weaponState.firePulse
      if (def.kind === 'gun' && phase === 'fire') {
        if (id === 'pump_shotgun') {
          sgFlashT.current = SHOTGUN_FLASH_LIFE
          sgSmokeT.current = SHOTGUN_SMOKE_LIFE
          lightFrames.current = 1 // exactly 1 frame of dynamic light
        } else {
          flash.current = 1
        }
      }
    }

    // Generic flash decay from clip progress (non-pump)
    if (id !== 'pump_shotgun') {
      if (phase === 'fire' && def.kind === 'gun') {
        flash.current = u < 0.35 ? 1 - u / 0.35 : 0
      } else {
        flash.current = THREE.MathUtils.lerp(flash.current, 0, 1 - Math.exp(-delta * 18))
      }
    }

    // Shotgun timed flash / smoke
    if (sgFlashT.current > 0) sgFlashT.current = Math.max(0, sgFlashT.current - delta)
    if (sgSmokeT.current > 0) sgSmokeT.current = Math.max(0, sgSmokeT.current - delta)

    // Camera-local → world
    camera.getWorldPosition(_worldPos)
    camera.getWorldQuaternion(_look)
    _offset.set(pose.x, pose.y, pose.z).applyQuaternion(_look).add(_worldPos)
    g.position.copy(_offset)

    _euler.set(pose.rx, pose.ry, pose.rz, 'YXZ')
    _animQ.setFromEuler(_euler)
    g.quaternion.copy(_look).multiply(_animQ)

    // Muzzle socket local positions
    const mz =
      id === 'mp40'
        ? { x: 0.0, y: 0.06, z: -0.78 }
        : id === 'revolver'
          ? { x: 0.0, y: 0.05, z: -0.55 }
          : id === 'lever22'
            ? { x: 0.0, y: 0.06, z: -0.95 }
            : id === 'pump_shotgun'
              ? { x: 0.0, y: 0.06, z: -1.0 }
              : { x: 0.04, y: 0.08, z: -0.98 }

    // ── Generic cone flash ────────────────────────────────────────
    if (muzzle.current) {
      const show = id !== 'pump_shotgun' && flash.current > 0.04 && def.kind === 'gun'
      muzzle.current.visible = show
      if (show) {
        muzzle.current.position.set(mz.x, mz.y, mz.z)
        const f = flash.current
        const isSmg = id === 'mp40'
        const isRev = id === 'revolver'
        const len = (isSmg ? 0.22 : isRev ? 0.28 : 0.32) * (0.55 + f * 0.9)
        const rad = (isSmg ? 0.1 : isRev ? 0.16 : 0.14) * (0.45 + f * 0.95)
        muzzle.current.scale.set(rad, len, rad)
        const setFlashMat = (mesh: THREE.Mesh | null, opacity: number) => {
          if (!mesh) return
          const mat = mesh.material as THREE.MeshBasicMaterial
          mat.opacity = opacity
          mat.depthTest = false
          mat.depthWrite = false
        }
        setFlashMat(flashOuter.current, f * 0.85)
        setFlashMat(flashCore.current, Math.min(1, f * 1.15))
      }
    }

    // ── Combat pump three-part flash + smoke + 1-frame light ──────
    if (sgFlash.current) {
      const flashOn = id === 'pump_shotgun' && sgFlashT.current > 0
      const smokeOn = id === 'pump_shotgun' && sgSmokeT.current > 0
      sgFlash.current.visible = flashOn || smokeOn
      sgFlash.current.position.set(mz.x, mz.y, mz.z)

      const flashU = flashOn ? sgFlashT.current / SHOTGUN_FLASH_LIFE : 0
      const smokeU = smokeOn ? sgSmokeT.current / SHOTGUN_SMOKE_LIFE : 0

      if (sgCore.current) {
        sgCore.current.visible = flashOn
        const mat = sgCore.current.material as THREE.MeshBasicMaterial
        mat.opacity = flashU
        // Starburst scale pops then dies in 0.08s
        const s = 0.12 + (1 - flashU) * 0.08
        sgCore.current.scale.set(s * 0.5, s * 1.4, s * 0.5)
      }
      if (sgVentL.current) {
        sgVentL.current.visible = flashOn
        const mat = sgVentL.current.material as THREE.MeshBasicMaterial
        mat.opacity = flashU * 0.9
        const s = 0.1 + (1 - flashU) * 0.12
        sgVentL.current.scale.set(s * 1.6, s * 0.35, s * 0.35)
      }
      if (sgVentR.current) {
        sgVentR.current.visible = flashOn
        const mat = sgVentR.current.material as THREE.MeshBasicMaterial
        mat.opacity = flashU * 0.9
        const s = 0.1 + (1 - flashU) * 0.12
        sgVentR.current.scale.set(s * 1.6, s * 0.35, s * 0.35)
      }
      if (sgSmoke.current) {
        sgSmoke.current.visible = smokeOn
        const mat = sgSmoke.current.material as THREE.MeshBasicMaterial
        // Drift + expand + fade over 1.5s
        const grow = 1 + (1 - smokeU) * 2.2
        mat.opacity = 0.45 * smokeU
        sgSmoke.current.position.set(0, 0.04 + (1 - smokeU) * 0.12, -0.08 - (1 - smokeU) * 0.25)
        sgSmoke.current.scale.setScalar(0.14 * grow)
      }
    }

    if (muzzleLight.current) {
      const lit = id === 'pump_shotgun' && lightFrames.current > 0
      muzzleLight.current.visible = lit
      muzzleLight.current.position.set(mz.x, mz.y, mz.z)
      if (lit) {
        // RGB(255, 180, 100) — warm muzzle
        muzzleLight.current.color.setRGB(1, 180 / 255, 100 / 255)
        muzzleLight.current.intensity = 4.5
        muzzleLight.current.distance = 6
        lightFrames.current = 0 // 1 frame only
      } else {
        muzzleLight.current.intensity = 0
      }
    }
  })

  return (
    <group ref={root} frustumCulled={false}>
      <group ref={model} frustumCulled={false}>
        <WeaponModel id={weaponId} variant="fps" />
      </group>

      {/* Generic conical flash (non-pump guns) */}
      <group ref={muzzle} visible={false} frustumCulled={false} renderOrder={1000} rotation={[Math.PI / 2, 0, 0]}>
        <mesh ref={flashOuter} frustumCulled={false} renderOrder={1000} position={[0, -0.5, 0]}>
          <coneGeometry args={[1, 1, 14, 1, true]} />
          <meshBasicMaterial
            color="#ffc266"
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh ref={flashCore} frustumCulled={false} renderOrder={1001} position={[0, -0.35, 0]} scale={[0.45, 0.7, 0.45]}>
          <coneGeometry args={[1, 1, 10, 1, true]} />
          <meshBasicMaterial
            color="#fff6d0"
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/*
        Combat pump three-part flash (0.08s):
        Core starburst + left/right lateral vent wings + lingering smoke (1.5s)
      */}
      <group ref={sgFlash} visible={false} frustumCulled={false} renderOrder={1002}>
        {/* Core — bright white/yellow starburst along barrel (−Z) */}
        <mesh ref={sgCore} frustumCulled={false} renderOrder={1003} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.06]}>
          <coneGeometry args={[1, 1, 8, 1, true]} />
          <meshBasicMaterial
            color="#fff8d0"
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Side vent wings — perpendicular gas jets */}
        <mesh ref={sgVentL} frustumCulled={false} renderOrder={1002} position={[-0.08, 0.02, -0.02]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[1, 1, 6, 1, true]} />
          <meshBasicMaterial
            color="#ffb060"
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <mesh ref={sgVentR} frustumCulled={false} renderOrder={1002} position={[0.08, 0.02, -0.02]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[1, 1, 6, 1, true]} />
          <meshBasicMaterial
            color="#ffb060"
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        {/* Billow — gray/white smoke drifts and fades over 1.5s */}
        <mesh ref={sgSmoke} frustumCulled={false} renderOrder={1001} position={[0, 0.04, -0.08]}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial
            color="#c8c8c4"
            transparent
            opacity={0}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* 1-frame dynamic light at muzzle (R255 G180 B100) */}
      <pointLight
        ref={muzzleLight}
        visible={false}
        intensity={0}
        distance={6}
        decay={2}
        color="#ffb464"
      />
    </group>
  )
}
