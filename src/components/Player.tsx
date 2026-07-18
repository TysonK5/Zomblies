import { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EYE_HEIGHT, PLAYER_RADIUS, WORLD_BOUNDS } from '../game/constants'
import { playerState } from '../game/playerState'
import { moveAndCollide } from '../game/collision'
import { collisionWorld } from '../game/collisionWorld'
import { resolvePlayerAgainstZombies } from '../game/agentPush'
import { getGroundHeight, resolveFeetOnGround } from '../game/ground'
import { getGameSettings } from '../game/gameSettings'
import { getKeybindings, isRebinding, mouseButtonCode } from '../game/keybindings'
import {
  getCameraMode,
  subscribeCameraMode,
  toggleCameraMode,
  TPS,
  type CameraMode,
} from '../game/cameraMode'
import { WeaponView } from '../weapons/WeaponView'
import { weaponState } from '../weapons/weaponState'
import { fireWeapon } from '../weapons/combat'
import { WEAPONS } from '../weapons/definitions'
import { PlayerAvatar } from './PlayerAvatar'

const LOOK_SENSITIVITY = 0.002
const GRAVITY = 18
const JUMP_VELOCITY = 6.5

type PlayerProps = {
  onLockChange?: (locked: boolean) => void
}

/**
 * Player controller with first- and third-person camera (toggle via keybind, default V).
 * Feet position is authoritative; camera is derived from view mode.
 */
export function Player({ onLockChange }: PlayerProps) {
  const { camera, gl } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const keys = useRef<Record<string, boolean>>({})
  const yaw = useRef(0)
  const pitch = useRef(0)
  const isLocked = useRef(false)
  const verticalVel = useRef(0)
  const grounded = useRef(true)
  const mouseButtons = useRef<Record<string, boolean>>({})
  const gameTime = useRef(0)
  /** Feet on ground plane (+ jump) */
  const feet = useRef(new THREE.Vector3(0, 0, 16))
  const bodyYaw = useRef(0)
  const moving = useRef(false)
  const sprinting = useRef(false)
  const [cameraMode, setCameraModeState] = useState<CameraMode>(() => getCameraMode())
  const camSmooth = useRef(new THREE.Vector3(0, EYE_HEIGHT, 16))

  useEffect(() => subscribeCameraMode(setCameraModeState), [])

  useEffect(() => {
    const spawn = moveAndCollide(0, 16, PLAYER_RADIUS, 0, 0, collisionWorld.queryStatic())
    const groundY = getGroundHeight(spawn.x, spawn.z)
    feet.current.set(spawn.x, groundY, spawn.z)
    camSmooth.current.set(spawn.x, groundY + EYE_HEIGHT, spawn.z)
    camera.position.copy(camSmooth.current)
    camera.rotation.order = 'YXZ'
    playerState.update(0, spawn.x, spawn.z)

    const onKeyDown = (e: KeyboardEvent) => {
      if (isRebinding()) return
      keys.current[e.code] = true
      if (e.code === 'Space') e.preventDefault()

      const b = getKeybindings()
      if (e.code === b.weapon1) weaponState.selectSlot(1)
      if (e.code === b.weapon2) weaponState.selectSlot(2)
      if (e.code === b.weapon3) weaponState.selectSlot(3)
      if (e.code === b.weapon4) weaponState.selectSlot(4)
      if (e.code === b.weapon5) weaponState.selectSlot(5)
      if (e.code === b.weapon6) weaponState.selectSlot(6)
      if (e.code === b.weapon7) weaponState.selectSlot(7)
      if (e.code === b.reload) weaponState.tryReload(gameTime.current)
      if (e.code === b.toggleCamera) {
        e.preventDefault()
        toggleCameraMode()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return
      yaw.current -= e.movementX * LOOK_SENSITIVITY
      pitch.current -= e.movementY * LOOK_SENSITIVITY
      const mode = getCameraMode()
      if (mode === 'third') {
        pitch.current = Math.max(TPS.pitchMin, Math.min(TPS.pitchMax, pitch.current))
      } else {
        pitch.current = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch.current))
      }
    }

    const onPointerLockChange = () => {
      isLocked.current = document.pointerLockElement === gl.domElement
      onLockChange?.(isLocked.current)
      if (!isLocked.current) mouseButtons.current = {}
    }

    const onClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        void gl.domElement.requestPointerLock()
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (isRebinding()) return
      const code = mouseButtonCode(e.button)
      mouseButtons.current[code] = true

      const b = getKeybindings()
      if (code === b.weapon1) weaponState.selectSlot(1)
      if (code === b.weapon2) weaponState.selectSlot(2)
      if (code === b.weapon3) weaponState.selectSlot(3)
      if (code === b.weapon4) weaponState.selectSlot(4)
      if (code === b.weapon5) weaponState.selectSlot(5)
      if (code === b.weapon6) weaponState.selectSlot(6)
      if (code === b.weapon7) weaponState.selectSlot(7)
      if (code === b.reload) weaponState.tryReload(gameTime.current)
      if (code === b.toggleCamera) toggleCameraMode()
    }
    const onMouseUp = (e: MouseEvent) => {
      mouseButtons.current[mouseButtonCode(e.button)] = false
    }

    const onWheel = (e: WheelEvent) => {
      if (!isLocked.current || isRebinding()) return
      // In third person, hold? always cycle weapons with scroll for now
      if (e.deltaY > 0) weaponState.cycle(1)
      else if (e.deltaY < 0) weaponState.cycle(-1)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('wheel', onWheel, { passive: true })
    gl.domElement.addEventListener('click', onClick)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('wheel', onWheel)
      gl.domElement.removeEventListener('click', onClick)
    }
  }, [camera, gl, onLockChange])

  const getAvatarPose = useCallback(
    () => ({
      x: feet.current.x,
      y: feet.current.y,
      z: feet.current.z,
      yaw: bodyYaw.current,
      moving: moving.current,
      sprinting: sprinting.current,
    }),
    [],
  )

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const now = clock.elapsedTime
    gameTime.current = now
    const mode = getCameraMode()

    weaponState.update(dt, now)

    // Re-clamp pitch when switching modes
    if (mode === 'third') {
      pitch.current = Math.max(TPS.pitchMin, Math.min(TPS.pitchMax, pitch.current))
    }

    const b = getKeybindings()
    const down = (code: string) => !!(keys.current[code] || mouseButtons.current[code])

    // Movement relative to look yaw (horizontal)
    direction.current.set(0, 0, 0)
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    const right = new THREE.Vector3(-forward.z, 0, forward.x)

    if (down(b.moveForward)) direction.current.add(forward)
    if (down(b.moveBack)) direction.current.sub(forward)
    if (down(b.moveLeft)) direction.current.sub(right)
    if (down(b.moveRight)) direction.current.add(right)

    const hasMove = direction.current.lengthSq() > 0
    if (hasMove) direction.current.normalize()
    moving.current = hasMove

    const { playerWalkSpeed, playerRunSpeed } = getGameSettings()
    const sprint = down(b.sprint)
    sprinting.current = sprint && hasMove
    const speed = sprint ? playerRunSpeed : playerWalkSpeed

    velocity.current.x = direction.current.x * speed
    velocity.current.z = direction.current.z * speed

    if (grounded.current && down(b.jump)) {
      verticalVel.current = JUMP_VELOCITY
      grounded.current = false
    }
    verticalVel.current -= GRAVITY * dt

    // Hard collide map only — zombies use soft 50/50 push
    const dx = velocity.current.x * dt
    const dz = velocity.current.z * dt
    const statics = collisionWorld.queryStatic()
    const next = moveAndCollide(feet.current.x, feet.current.z, PLAYER_RADIUS, dx, dz, statics)
    feet.current.x = next.x
    feet.current.z = next.z
    feet.current.y += verticalVel.current * dt

    feet.current.x = THREE.MathUtils.clamp(feet.current.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX)
    feet.current.z = THREE.MathUtils.clamp(feet.current.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ)

    const cleaned = moveAndCollide(feet.current.x, feet.current.z, PLAYER_RADIUS, 0, 0, statics)
    feet.current.x = cleaned.x
    feet.current.z = cleaned.z

    // Soft equal-mass push vs zombies (both slow; player can shove aside)
    const pushed = resolvePlayerAgainstZombies(
      feet.current.x,
      feet.current.z,
      velocity.current.x,
      velocity.current.z,
      dt,
    )
    feet.current.x = pushed.x
    feet.current.z = pushed.z
    velocity.current.x = pushed.vx
    velocity.current.z = pushed.vz

    // Stick to terrain (flat now; stairs/mounds via ground surfaces later)
    const foot = resolveFeetOnGround(
      feet.current.x,
      feet.current.z,
      feet.current.y,
      verticalVel.current,
    )
    feet.current.y = foot.y
    verticalVel.current = foot.verticalVel
    grounded.current = foot.grounded

    // Body faces move direction (model +Z). Idle TPS: face look direction.
    if (hasMove) {
      const targetYaw = Math.atan2(direction.current.x, direction.current.z)
      let diff = targetYaw - bodyYaw.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      bodyYaw.current += diff * Math.min(1, dt * 10)
    } else if (mode === 'third') {
      const lookBody = yaw.current + Math.PI
      let diff = lookBody - bodyYaw.current
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      bodyYaw.current += diff * Math.min(1, dt * 4)
    } else {
      bodyYaw.current = yaw.current + Math.PI
    }

    collisionWorld.setDynamic('player', feet.current.x, feet.current.z, PLAYER_RADIUS)
    playerState.update(now, feet.current.x, feet.current.z)

    // ── Camera ──────────────────────────────────────────────────────
    if (mode === 'first') {
      const target = new THREE.Vector3(
        feet.current.x,
        feet.current.y + EYE_HEIGHT,
        feet.current.z,
      )
      camSmooth.current.lerp(target, 1 - Math.exp(-dt * 30))
      camera.position.copy(camSmooth.current)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = yaw.current
      camera.rotation.x = pitch.current
      camera.rotation.z = 0
    } else {
      // Third person: orbit behind look pivot
      const lookAt = new THREE.Vector3(
        feet.current.x,
        feet.current.y + TPS.lookHeight,
        feet.current.z,
      )
      const dist = TPS.distance
      const cp = Math.cos(pitch.current)
      const sp = Math.sin(pitch.current)
      const cy = Math.cos(yaw.current)
      const sy = Math.sin(yaw.current)
      // Camera sits opposite look direction
      const desired = new THREE.Vector3(
        lookAt.x + sy * cp * dist,
        lookAt.y + sp * dist + 0.35,
        lookAt.z + cy * cp * dist,
      )

      // Soft pull-in near ground
      if (desired.y < 0.4) desired.y = 0.4

      camSmooth.current.lerp(desired, 1 - Math.exp(-dt * TPS.follow))
      camera.position.copy(camSmooth.current)
      camera.lookAt(lookAt)
    }

    // Fire whenever pointer is locked (or fire key is a keyboard bind without needing lock for held keys)
    const fireHeld = down(b.fire)
    if (fireHeld && !isRebinding() && (isLocked.current || !b.fire.startsWith('Mouse'))) {
      const def = WEAPONS[weaponState.currentId]

      if (weaponState.phase === 'reload' && def.shellReload && weaponState.runtime.loaded > 0) {
        weaponState.cancelReload()
      }

      const fired = weaponState.tryFire(now)
      if (fired) {
        fireWeapon(camera, def, true)
      }
      // Empty + reserve is handled inside tryFire → tryReload
    }
  })

  return (
    <>
      <PlayerAvatar getPose={getAvatarPose} visible={cameraMode === 'third'} />
      {/* Always mounted — self-hides in third person so anim state stays warm */}
      <WeaponView />
    </>
  )
}
