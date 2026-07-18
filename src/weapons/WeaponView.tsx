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

/**
 * FPS viewmodel driven by keyframed clips (game-style fire / lever / reload / pump).
 * Pose sample → camera-local offset each frame; depthTest off for HUD-like draw.
 *
 * Animation language inspired by polished lever-action double-barrel showcases
 * (kick → lever rack → break-open reload beats).
 */
export function WeaponView() {
  const { camera } = useThree()
  const root = useRef<THREE.Group>(null)
  const model = useRef<THREE.Group>(null)
  const muzzle = useRef<THREE.Mesh>(null)
  const [weaponId, setWeaponId] = useState<WeaponId>(() => weaponState.currentId)
  const prevWeapon = useRef(weaponId)
  const flash = useRef(0)
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
    const t = clock.elapsedTime
    const phase = weaponState.phase
    const u = weaponState.animU
    const clipId = phaseToClip(phase)
    const keys = getWeaponClip(weaponState.currentId, clipId)
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

    const lockAim = weaponState.currentId === 'pitchfork'
    if (phase === 'idle' || phase === 'equip') {
      pose = applyIdleSway(pose, t, moveAmount.current, { lockAim })
    } else if (!lockAim) {
      // Light residual sway so gun clips don’t feel frozen
      pose = applyIdleSway(pose, t, moveAmount.current * 0.25)
    }
    // Pitchfork attack: no lateral sway — tips stay on crosshair

    // Muzzle flash tied to early fire frames
    if (phase === 'fire' && def.kind === 'gun') {
      flash.current = u < 0.35 ? 1 - u / 0.35 : 0
    } else {
      flash.current = THREE.MathUtils.lerp(flash.current, 0, 1 - Math.exp(-delta * 18))
    }

    // Camera-local → world
    camera.getWorldPosition(_worldPos)
    camera.getWorldQuaternion(_look)
    _offset.set(pose.x, pose.y, pose.z).applyQuaternion(_look).add(_worldPos)
    g.position.copy(_offset)

    _euler.set(pose.rx, pose.ry, pose.rz, 'YXZ')
    _animQ.setFromEuler(_euler)
    g.quaternion.copy(_look).multiply(_animQ)

    if (muzzle.current) {
      const show = flash.current > 0.04 && def.kind === 'gun'
      muzzle.current.visible = show
      if (show) {
        muzzle.current.position.set(0.04, 0.08, -0.98)
        const s = 0.14 + flash.current * 0.28
        muzzle.current.scale.setScalar(s)
        const mat = muzzle.current.material as THREE.MeshBasicMaterial
        mat.opacity = flash.current
        mat.depthTest = false
      }
    }
  })

  return (
    <group ref={root} frustumCulled={false}>
      <group ref={model} frustumCulled={false}>
        <WeaponModel id={weaponId} variant="fps" />
      </group>
      <mesh ref={muzzle} visible={false} frustumCulled={false} renderOrder={1000}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color="#ffe599" transparent opacity={0} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  )
}
