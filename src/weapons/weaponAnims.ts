/**
 * Keyframed FPS viewmodel poses inspired by polished game weapon anims.
 *
 * Gun ref: LayzuhCatz “Lever Action Double Barrel Shotgun” (kick / lever / break).
 * Pitchfork refs: Half Sword eye-thrust shorts + Blood: Fresh Supply pitchfork kill
 * (heavy wind-up, face-line thrust, bury, rip free).
 *
 * Local space: +X right, +Y up, -Z toward aim (in front of camera).
 */

import type { WeaponAnimPhase, WeaponId } from './types'

export type ViewPose = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
}

export type Keyframe = {
  /** 0–1 normalized time in the clip */
  t: number
  pose: ViewPose
}

export type WeaponClipId =
  | 'idle'
  | 'fire'
  | 'melee'
  | 'reload'
  | 'lever' // lever rack / action cycle
  | 'pump'
  | 'equip'

const REST: ViewPose = { x: 0.28, y: -0.28, z: -0.55, rx: 0.1, ry: 0.16, rz: 0 }

function easeInOut(u: number) {
  return u * u * (3 - 2 * u)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpPose(a: ViewPose, b: ViewPose, t: number): ViewPose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
  }
}

/** Sample keyframes with smoothstep between segments */
export function sampleClip(keys: Keyframe[], u: number): ViewPose {
  if (keys.length === 0) return { ...REST }
  if (keys.length === 1) return { ...keys[0]!.pose }
  const t = Math.max(0, Math.min(1, u))
  if (t <= keys[0]!.t) return { ...keys[0]!.pose }
  const last = keys[keys.length - 1]!
  if (t >= last.t) return { ...last.pose }

  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]!
    const b = keys[i + 1]!
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1e-6
      const local = easeInOut((t - a.t) / span)
      return lerpPose(a.pose, b.pose, local)
    }
  }
  return { ...last.pose }
}

// ── Per-weapon clips ────────────────────────────────────────────────

const IDLE_SWAY_BASE = REST

/** Double barrel — hybrid scattergun / lever-action feel from the reference */
const DB_FIRE: Keyframe[] = [
  { t: 0, pose: REST },
  // Sharp rearward kick + muzzle climb
  { t: 0.08, pose: { x: 0.3, y: -0.14, z: -0.32, rx: -0.55, ry: 0.12, rz: 0.12 } },
  { t: 0.2, pose: { x: 0.29, y: -0.2, z: -0.4, rx: -0.28, ry: 0.14, rz: 0.06 } },
  // Settle with residual climb
  { t: 0.45, pose: { x: 0.28, y: -0.26, z: -0.5, rx: 0.02, ry: 0.16, rz: 0.02 } },
  { t: 1, pose: REST },
]

/** Lever rack under the receiver after a shot (signature of the reference weapon) */
const DB_LEVER: Keyframe[] = [
  { t: 0, pose: REST },
  // Drop muzzle slightly, prepare lever
  { t: 0.12, pose: { x: 0.26, y: -0.34, z: -0.52, rx: 0.35, ry: 0.1, rz: -0.08 } },
  // Throw lever open (rotate gun + roll)
  { t: 0.38, pose: { x: 0.22, y: -0.4, z: -0.48, rx: 0.75, ry: -0.05, rz: -0.35 } },
  // Hold open a beat
  { t: 0.52, pose: { x: 0.22, y: -0.42, z: -0.46, rx: 0.82, ry: -0.08, rz: -0.4 } },
  // Slam shut
  { t: 0.72, pose: { x: 0.3, y: -0.24, z: -0.5, rx: -0.1, ry: 0.18, rz: 0.15 } },
  { t: 0.88, pose: { x: 0.29, y: -0.27, z: -0.54, rx: 0.08, ry: 0.16, rz: 0.04 } },
  { t: 1, pose: REST },
]

/** Break-open reload for shells */
const DB_RELOAD: Keyframe[] = [
  { t: 0, pose: REST },
  // Tip barrels down / break open
  { t: 0.15, pose: { x: 0.24, y: -0.38, z: -0.48, rx: 0.95, ry: 0.05, rz: 0.1 } },
  { t: 0.3, pose: { x: 0.2, y: -0.48, z: -0.42, rx: 1.25, ry: 0.0, rz: 0.15 } },
  // Hold open — “load shells”
  { t: 0.55, pose: { x: 0.18, y: -0.5, z: -0.4, rx: 1.3, ry: -0.05, rz: 0.18 } },
  // Snap closed
  { t: 0.75, pose: { x: 0.32, y: -0.2, z: -0.48, rx: -0.25, ry: 0.2, rz: -0.1 } },
  { t: 0.9, pose: { x: 0.28, y: -0.26, z: -0.54, rx: 0.12, ry: 0.16, rz: 0.02 } },
  { t: 1, pose: REST },
]

const LEVER22_FIRE: Keyframe[] = [
  { t: 0, pose: REST },
  { t: 0.1, pose: { x: 0.3, y: -0.2, z: -0.38, rx: -0.42, ry: 0.14, rz: 0.08 } },
  { t: 0.3, pose: { x: 0.28, y: -0.25, z: -0.48, rx: -0.1, ry: 0.16, rz: 0.02 } },
  { t: 1, pose: REST },
]

const LEVER22_LEVER: Keyframe[] = [
  { t: 0, pose: REST },
  // Bring rifle in, drop for lever room
  { t: 0.1, pose: { x: 0.24, y: -0.32, z: -0.5, rx: 0.25, ry: 0.08, rz: -0.05 } },
  // Full lever throw (large roll + pitch)
  { t: 0.35, pose: { x: 0.18, y: -0.42, z: -0.45, rx: 0.55, ry: -0.15, rz: -0.55 } },
  { t: 0.5, pose: { x: 0.18, y: -0.44, z: -0.44, rx: 0.6, ry: -0.18, rz: -0.6 } },
  // Close lever with snap
  { t: 0.7, pose: { x: 0.3, y: -0.22, z: -0.5, rx: -0.15, ry: 0.2, rz: 0.2 } },
  { t: 0.85, pose: { x: 0.28, y: -0.27, z: -0.54, rx: 0.08, ry: 0.16, rz: 0.03 } },
  { t: 1, pose: REST },
]

const LEVER22_RELOAD: Keyframe[] = [
  { t: 0, pose: REST },
  { t: 0.15, pose: { x: 0.22, y: -0.4, z: -0.48, rx: 0.7, ry: 0.1, rz: 0.25 } },
  { t: 0.4, pose: { x: 0.2, y: -0.46, z: -0.42, rx: 0.9, ry: 0.15, rz: 0.35 } },
  { t: 0.65, pose: { x: 0.22, y: -0.4, z: -0.48, rx: 0.55, ry: 0.1, rz: 0.15 } },
  { t: 0.85, pose: { x: 0.3, y: -0.24, z: -0.52, rx: -0.05, ry: 0.16, rz: -0.05 } },
  { t: 1, pose: REST },
]

const PUMP_FIRE: Keyframe[] = [
  { t: 0, pose: REST },
  { t: 0.08, pose: { x: 0.3, y: -0.16, z: -0.3, rx: -0.65, ry: 0.12, rz: 0.1 } },
  { t: 0.25, pose: { x: 0.29, y: -0.22, z: -0.42, rx: -0.25, ry: 0.14, rz: 0.04 } },
  { t: 1, pose: REST },
]

const PUMP_RACK: Keyframe[] = [
  { t: 0, pose: REST },
  // Pull forend back (gun shifts back + slight pitch)
  { t: 0.2, pose: { x: 0.26, y: -0.3, z: -0.38, rx: 0.2, ry: 0.1, rz: -0.05 } },
  { t: 0.4, pose: { x: 0.24, y: -0.32, z: -0.3, rx: 0.28, ry: 0.08, rz: -0.08 } },
  // Hold
  { t: 0.5, pose: { x: 0.24, y: -0.32, z: -0.28, rx: 0.3, ry: 0.08, rz: -0.08 } },
  // Slam forward
  { t: 0.72, pose: { x: 0.32, y: -0.22, z: -0.52, rx: -0.12, ry: 0.18, rz: 0.1 } },
  { t: 0.9, pose: { x: 0.28, y: -0.27, z: -0.55, rx: 0.08, ry: 0.16, rz: 0.02 } },
  { t: 1, pose: REST },
]

const PUMP_RELOAD: Keyframe[] = [
  { t: 0, pose: REST },
  // Flip to port / belly up for shell
  { t: 0.2, pose: { x: 0.2, y: -0.42, z: -0.45, rx: 0.65, ry: 0.35, rz: 0.55 } },
  { t: 0.45, pose: { x: 0.18, y: -0.48, z: -0.4, rx: 0.75, ry: 0.4, rz: 0.65 } },
  { t: 0.7, pose: { x: 0.22, y: -0.38, z: -0.48, rx: 0.4, ry: 0.25, rz: 0.3 } },
  { t: 1, pose: REST },
]

const FIST_MELEE: Keyframe[] = [
  { t: 0, pose: { x: 0.2, y: -0.32, z: -0.5, rx: 0.15, ry: 0.1, rz: 0 } },
  // Chamber
  { t: 0.15, pose: { x: 0.35, y: -0.25, z: -0.35, rx: 0.4, ry: -0.2, rz: 0.3 } },
  // Impact
  { t: 0.4, pose: { x: 0.05, y: -0.1, z: -0.95, rx: -0.5, ry: 0.1, rz: -0.15 } },
  // Recover
  { t: 0.7, pose: { x: 0.22, y: -0.28, z: -0.55, rx: 0.1, ry: 0.12, rz: 0.05 } },
  { t: 1, pose: { x: 0.2, y: -0.32, z: -0.5, rx: 0.15, ry: 0.1, rz: 0 } },
]

/**
 * Pitchfork — tips sit on screen center / crosshair.
 *
 * Mesh has tine tips at local (0,0,0); view pose (x,y,z) is where the tips are
 * in camera space. Crosshair is along (0,0,-depth), so idle x≈0, y≈0.
 *
 * Attack: pull tips toward camera (less depth) → stab forward (more depth)
 * along the same center line, then recover.
 */
/** Depth of tips in front of camera (negative Z = forward) */
const FORK_TIP_IDLE_Z = -0.92
const FORK_TIP_PULL_Z = -0.48
const FORK_TIP_STAB_Z = -1.55

const FORK_IDLE: ViewPose = {
  x: 0,
  y: 0,
  z: FORK_TIP_IDLE_Z,
  rx: 0,
  ry: 0,
  rz: 0,
}

const FORK_MELEE: Keyframe[] = [
  { t: 0, pose: FORK_IDLE },
  // Pull in toward body (tips still on crosshair line)
  {
    t: 0.18,
    pose: { x: 0, y: -0.02, z: FORK_TIP_PULL_Z, rx: 0.06, ry: 0, rz: 0 },
  },
  // Coil at max pull
  {
    t: 0.28,
    pose: { x: 0.01, y: -0.03, z: FORK_TIP_PULL_Z + 0.04, rx: 0.1, ry: 0, rz: 0.02 },
  },
  // Stab forward through crosshair
  {
    t: 0.42,
    pose: { x: 0, y: 0.01, z: FORK_TIP_STAB_Z, rx: -0.04, ry: 0, rz: 0 },
  },
  // Hold / bury
  {
    t: 0.55,
    pose: { x: 0, y: 0.02, z: FORK_TIP_STAB_Z - 0.06, rx: -0.06, ry: 0, rz: 0 },
  },
  // Retract along center line
  {
    t: 0.72,
    pose: { x: 0, y: -0.01, z: -1.1, rx: 0.02, ry: 0, rz: 0 },
  },
  // Settle to ready
  {
    t: 0.9,
    pose: { x: 0, y: 0, z: FORK_TIP_IDLE_Z - 0.04, rx: 0, ry: 0, rz: 0 },
  },
  { t: 1, pose: FORK_IDLE },
]

const FORK_EQUIP: Keyframe[] = [
  // Come up from below, tips find center
  { t: 0, pose: { x: 0.08, y: -0.55, z: -0.55, rx: 0.5, ry: 0.1, rz: 0.1 } },
  { t: 0.4, pose: { x: 0.02, y: -0.15, z: -0.75, rx: 0.12, ry: 0.02, rz: 0.02 } },
  { t: 0.75, pose: { x: 0, y: -0.02, z: FORK_TIP_IDLE_Z, rx: 0.02, ry: 0, rz: 0 } },
  { t: 1, pose: FORK_IDLE },
]

const EQUIP: Keyframe[] = [
  { t: 0, pose: { x: 0.35, y: -0.75, z: -0.35, rx: 0.8, ry: 0.2, rz: 0.3 } },
  { t: 0.45, pose: { x: 0.3, y: -0.35, z: -0.5, rx: 0.25, ry: 0.18, rz: 0.08 } },
  { t: 0.75, pose: { x: 0.27, y: -0.26, z: -0.56, rx: 0.05, ry: 0.15, rz: 0.02 } },
  { t: 1, pose: REST },
]

type ClipMap = Partial<Record<WeaponClipId, Keyframe[]>>

const CLIPS: Record<WeaponId, ClipMap> = {
  fist: {
    idle: [{ t: 0, pose: { x: 0.2, y: -0.32, z: -0.5, rx: 0.15, ry: 0.1, rz: 0 } }],
    melee: FIST_MELEE,
    fire: FIST_MELEE,
    equip: EQUIP,
  },
  pitchfork: {
    idle: [{ t: 0, pose: FORK_IDLE }],
    melee: FORK_MELEE,
    fire: FORK_MELEE,
    equip: FORK_EQUIP,
  },
  double_barrel: {
    idle: [{ t: 0, pose: REST }],
    fire: DB_FIRE,
    lever: DB_LEVER,
    reload: DB_RELOAD,
    equip: EQUIP,
  },
  lever22: {
    idle: [{ t: 0, pose: REST }],
    fire: LEVER22_FIRE,
    lever: LEVER22_LEVER,
    reload: LEVER22_RELOAD,
    equip: EQUIP,
  },
  pump_shotgun: {
    idle: [{ t: 0, pose: REST }],
    fire: PUMP_FIRE,
    pump: PUMP_RACK,
    reload: PUMP_RELOAD,
    equip: EQUIP,
  },
}

/** Map runtime phase → clip id */
export function phaseToClip(phase: WeaponAnimPhase): WeaponClipId {
  if (phase === 'fire') return 'fire'
  if (phase === 'melee') return 'melee'
  if (phase === 'reload') return 'reload'
  if (phase === 'pump') return 'pump'
  if (phase === 'lever') return 'lever'
  if (phase === 'equip') return 'equip'
  return 'idle'
}

export function getWeaponClip(weaponId: WeaponId, clip: WeaponClipId): Keyframe[] {
  const map = CLIPS[weaponId]
  return map[clip] ?? map.idle ?? [{ t: 0, pose: REST }]
}

/** Durations (seconds) tuned to read clearly */
export const CLIP_DURATION: Record<WeaponId, Partial<Record<WeaponClipId, number>>> = {
  fist: { melee: 0.42, fire: 0.42, equip: 0.35 },
  // Pull-in → stab-forward (tips stay on crosshair line)
  pitchfork: { melee: 0.62, fire: 0.62, equip: 0.42 },
  double_barrel: { fire: 0.42, lever: 0.55, reload: 1.85, equip: 0.45 },
  lever22: { fire: 0.32, lever: 0.5, reload: 2.1, equip: 0.4 },
  pump_shotgun: { fire: 0.4, pump: 0.52, reload: 0.65, equip: 0.4 },
}

export function getClipDuration(weaponId: WeaponId, clip: WeaponClipId, fallback: number): number {
  return CLIP_DURATION[weaponId]?.[clip] ?? fallback
}

/** Subtle continuous idle sway on top of sampled pose */
export function applyIdleSway(
  pose: ViewPose,
  time: number,
  moveBob: number,
  opts?: { lockAim?: boolean },
): ViewPose {
  // Pitchfork: keep tips locked to crosshair — only tiny depth bob
  if (opts?.lockAim) {
    return {
      x: pose.x,
      y: pose.y,
      z: pose.z + Math.sin(time * 2.2) * 0.008 + Math.sin(time * 9) * 0.012 * moveBob,
      rx: pose.rx,
      ry: pose.ry,
      rz: pose.rz,
    }
  }
  const s = 1
  return {
    x: pose.x + Math.sin(time * 1.35) * 0.008 * s + Math.sin(time * 9) * 0.03 * moveBob,
    y: pose.y + Math.cos(time * 1.55) * 0.006 * s + Math.abs(Math.cos(time * 9)) * 0.035 * moveBob,
    z: pose.z,
    rx: pose.rx + Math.sin(time * 1.1) * 0.012,
    ry: pose.ry + Math.cos(time * 0.9) * 0.01,
    rz: pose.rz + Math.sin(time * 1.25) * 0.015,
  }
}

export { REST as VIEW_REST, IDLE_SWAY_BASE }
