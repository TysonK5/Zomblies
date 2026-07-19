/**
 * Keyframed FPS viewmodel poses inspired by polished game weapon anims.
 *
 * Gun ref: LayzuhCatz “Lever Action Double Barrel Shotgun” (kick / lever / break).
 * Pitchfork: low ready hold under the FOV; stab coils low then swings
 * tips up through screen center (crosshair) for the bury.
 *
 * Local space: +X right, +Y up, −Z toward aim (in front of camera).
 *
 * Fire recoil (real-gun language):
 *   −rx  → muzzle tips UP (positive rx tips barrels down, see reload poses)
 *   +y   → whole gun rises
 *   +z   → gun comes BACK toward camera (kick into the shooter)
 *   ±rz  → slight wrist roll
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

/** Double barrel — hard tip-up + rearward punch (both barrels) */
const DB_FIRE: Keyframe[] = [
  { t: 0, pose: REST },
  // Peak: muzzle snaps up, gun drives back into camera
  { t: 0.06, pose: { x: 0.32, y: -0.02, z: -0.22, rx: -0.95, ry: 0.1, rz: 0.16 } },
  // Hold climb a beat
  { t: 0.16, pose: { x: 0.31, y: -0.06, z: -0.28, rx: -0.72, ry: 0.12, rz: 0.1 } },
  // Recover down onto target
  { t: 0.4, pose: { x: 0.29, y: -0.2, z: -0.42, rx: -0.22, ry: 0.15, rz: 0.04 } },
  { t: 0.65, pose: { x: 0.28, y: -0.26, z: -0.52, rx: 0.02, ry: 0.16, rz: 0.01 } },
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

/** .22 lever — crisp muzzle flip, lighter than the scatterguns */
const LEVER22_FIRE: Keyframe[] = [
  { t: 0, pose: REST },
  { t: 0.07, pose: { x: 0.31, y: -0.08, z: -0.3, rx: -0.7, ry: 0.12, rz: 0.1 } },
  { t: 0.18, pose: { x: 0.3, y: -0.12, z: -0.36, rx: -0.48, ry: 0.14, rz: 0.06 } },
  { t: 0.4, pose: { x: 0.28, y: -0.22, z: -0.48, rx: -0.12, ry: 0.16, rz: 0.02 } },
  { t: 0.7, pose: REST },
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

/**
 * Combat pump — level barrel along aim (not tipped up).
 * Low on screen for ejection-port readability, but pitch stays near zero.
 */
const PUMP_REST: ViewPose = {
  x: 0.26,
  y: -0.3,
  z: -0.55,
  rx: 0.02,
  ry: 0.1,
  rz: 0.01,
}

/** Kick: short muzzle climb then snap back to level aim */
const PUMP_FIRE: Keyframe[] = [
  { t: 0, pose: PUMP_REST },
  { t: 0.05, pose: { x: 0.28, y: -0.12, z: -0.28, rx: -0.55, ry: 0.08, rz: 0.1 } },
  { t: 0.14, pose: { x: 0.27, y: -0.18, z: -0.36, rx: -0.32, ry: 0.1, rz: 0.06 } },
  { t: 0.32, pose: { x: 0.26, y: -0.26, z: -0.48, rx: -0.06, ry: 0.1, rz: 0.02 } },
  { t: 0.55, pose: { x: 0.26, y: -0.3, z: -0.54, rx: 0.0, ry: 0.1, rz: 0.01 } },
  { t: 1, pose: PUMP_REST },
]

/** Rack the prominent forend — pull back then slam forward */
const PUMP_RACK: Keyframe[] = [
  { t: 0, pose: PUMP_REST },
  { t: 0.18, pose: { x: 0.24, y: -0.34, z: -0.46, rx: 0.12, ry: 0.08, rz: -0.04 } },
  { t: 0.38, pose: { x: 0.22, y: -0.36, z: -0.38, rx: 0.18, ry: 0.06, rz: -0.08 } },
  { t: 0.5, pose: { x: 0.22, y: -0.36, z: -0.36, rx: 0.2, ry: 0.06, rz: -0.08 } },
  { t: 0.72, pose: { x: 0.28, y: -0.26, z: -0.52, rx: -0.04, ry: 0.12, rz: 0.04 } },
  { t: 0.9, pose: { x: 0.26, y: -0.3, z: -0.54, rx: 0.02, ry: 0.1, rz: 0.01 } },
  { t: 1, pose: PUMP_REST },
]

/** Bottom-gate shell feed — tip barrels down for gate, not up */
const PUMP_RELOAD: Keyframe[] = [
  { t: 0, pose: PUMP_REST },
  { t: 0.18, pose: { x: 0.2, y: -0.42, z: -0.44, rx: 0.55, ry: 0.22, rz: 0.35 } },
  { t: 0.42, pose: { x: 0.18, y: -0.48, z: -0.4, rx: 0.72, ry: 0.28, rz: 0.42 } },
  { t: 0.68, pose: { x: 0.22, y: -0.38, z: -0.48, rx: 0.28, ry: 0.16, rz: 0.18 } },
  { t: 1, pose: PUMP_REST },
]

const PUMP_EQUIP: Keyframe[] = [
  { t: 0, pose: { x: 0.3, y: -0.72, z: -0.32, rx: 0.55, ry: 0.18, rz: 0.2 } },
  { t: 0.4, pose: { x: 0.28, y: -0.4, z: -0.5, rx: 0.15, ry: 0.12, rz: 0.06 } },
  { t: 0.75, pose: { x: 0.26, y: -0.3, z: -0.55, rx: 0.04, ry: 0.1, rz: 0.02 } },
  { t: 1, pose: PUMP_REST },
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
 * Pitchfork — low ready hold; stab swings tips UP into screen center.
 *
 * Mesh has tine tips at local (0,0,0); view pose (x,y,z) is where the tips are
 * in camera space. Crosshair is (0,0,-depth).
 *
 * Idle: tips sit low / slightly right (bottom third of the FOV).
 * Melee: wind back low → arc up through center → thrust deep → drop back down.
 */
/** Depth of tips in front of camera (negative Z = forward) */
const FORK_TIP_IDLE_Z = -0.78
const FORK_TIP_PULL_Z = -0.42
const FORK_TIP_STAB_Z = -1.52

/** Low ready — tips under the crosshair, shaft fills the lower screen */
const FORK_IDLE: ViewPose = {
  x: 0.1,
  y: -0.42,
  z: FORK_TIP_IDLE_Z,
  rx: 0.28,
  ry: 0.06,
  rz: 0.04,
}

const FORK_MELEE: Keyframe[] = [
  { t: 0, pose: FORK_IDLE },
  // Coil low — pull tips toward body, stay under the screen
  {
    t: 0.16,
    pose: {
      x: 0.14,
      y: -0.52,
      z: FORK_TIP_PULL_Z,
      rx: 0.42,
      ry: 0.08,
      rz: 0.08,
    },
  },
  // Peak coil — loaded for the upward swing
  {
    t: 0.26,
    pose: {
      x: 0.16,
      y: -0.55,
      z: FORK_TIP_PULL_Z + 0.05,
      rx: 0.5,
      ry: 0.1,
      rz: 0.1,
    },
  },
  // Swing UP into center of screen (crosshair line)
  {
    t: 0.4,
    pose: {
      x: 0.02,
      y: 0.02,
      z: FORK_TIP_STAB_Z,
      rx: -0.08,
      ry: 0,
      rz: -0.02,
    },
  },
  // Bury / hold on center
  {
    t: 0.52,
    pose: {
      x: 0,
      y: 0.04,
      z: FORK_TIP_STAB_Z - 0.08,
      rx: -0.12,
      ry: 0,
      rz: 0,
    },
  },
  // Retract while still high
  {
    t: 0.68,
    pose: {
      x: 0.04,
      y: -0.08,
      z: -1.05,
      rx: 0.05,
      ry: 0.02,
      rz: 0.02,
    },
  },
  // Drop back to low ready
  {
    t: 0.88,
    pose: {
      x: 0.08,
      y: -0.36,
      z: FORK_TIP_IDLE_Z - 0.04,
      rx: 0.22,
      ry: 0.05,
      rz: 0.03,
    },
  },
  { t: 1, pose: FORK_IDLE },
]

const FORK_EQUIP: Keyframe[] = [
  // Rise from below into low ready (not center aim)
  { t: 0, pose: { x: 0.18, y: -0.72, z: -0.45, rx: 0.7, ry: 0.12, rz: 0.12 } },
  { t: 0.4, pose: { x: 0.12, y: -0.52, z: -0.65, rx: 0.4, ry: 0.08, rz: 0.06 } },
  { t: 0.75, pose: { x: 0.1, y: -0.44, z: FORK_TIP_IDLE_Z, rx: 0.3, ry: 0.06, rz: 0.04 } },
  { t: 1, pose: FORK_IDLE },
]

const EQUIP: Keyframe[] = [
  { t: 0, pose: { x: 0.35, y: -0.75, z: -0.35, rx: 0.8, ry: 0.2, rz: 0.3 } },
  { t: 0.45, pose: { x: 0.3, y: -0.35, z: -0.5, rx: 0.25, ry: 0.18, rz: 0.08 } },
  { t: 0.75, pose: { x: 0.27, y: -0.26, z: -0.56, rx: 0.05, ry: 0.15, rz: 0.02 } },
  { t: 1, pose: REST },
]

/**
 * MP40 — COD WW2 / Vanguard–style SMG hold (from comparison short).
 * Compact stock-folded aim; short full-auto kick; mag-drop + charge-handle reload.
 */
const MP40_REST: ViewPose = {
  x: 0.26,
  y: -0.26,
  z: -0.52,
  rx: 0.08,
  ry: 0.12,
  rz: 0.02,
}

/**
 * Full-auto cyclic kick — each shot tips muzzle up and drives gun back;
 * short so hold-fire can re-trigger while still reading as climb.
 */
const MP40_FIRE: Keyframe[] = [
  { t: 0, pose: MP40_REST },
  {
    t: 0.1,
    pose: { x: 0.28, y: -0.1, z: -0.34, rx: -0.42, ry: 0.1, rz: 0.1 },
  },
  {
    t: 0.28,
    pose: { x: 0.27, y: -0.16, z: -0.42, rx: -0.2, ry: 0.12, rz: 0.05 },
  },
  { t: 0.55, pose: MP40_REST },
  { t: 1, pose: MP40_REST },
]

/**
 * Mag-drop reload: tilt → drop stick mag → insert → rack charging handle → snap aim.
 * Beats match typical COD SMG reload timing language.
 */
const MP40_RELOAD: Keyframe[] = [
  { t: 0, pose: MP40_REST },
  // Bring gun in / tip for mag access
  {
    t: 0.1,
    pose: { x: 0.2, y: -0.34, z: -0.48, rx: 0.35, ry: 0.18, rz: 0.22 },
  },
  // Mag drop — dip + roll so left hand can strip the stick
  {
    t: 0.22,
    pose: { x: 0.16, y: -0.42, z: -0.42, rx: 0.55, ry: 0.28, rz: 0.42 },
  },
  // Hold open while “grabbing” fresh mag
  {
    t: 0.38,
    pose: { x: 0.14, y: -0.46, z: -0.4, rx: 0.62, ry: 0.32, rz: 0.48 },
  },
  // Seat magazine — push up into well
  {
    t: 0.55,
    pose: { x: 0.18, y: -0.4, z: -0.44, rx: 0.48, ry: 0.2, rz: 0.28 },
  },
  // Charge handle pull (bolt rack) — gun tips up slightly, roll opposite
  {
    t: 0.7,
    pose: { x: 0.24, y: -0.3, z: -0.46, rx: 0.15, ry: -0.05, rz: -0.25 },
  },
  {
    t: 0.82,
    pose: { x: 0.22, y: -0.32, z: -0.44, rx: 0.22, ry: -0.08, rz: -0.32 },
  },
  // Release bolt / snap to ready
  {
    t: 0.92,
    pose: { x: 0.28, y: -0.22, z: -0.5, rx: -0.06, ry: 0.14, rz: 0.06 },
  },
  { t: 1, pose: MP40_REST },
]

const MP40_EQUIP: Keyframe[] = [
  { t: 0, pose: { x: 0.32, y: -0.7, z: -0.32, rx: 0.7, ry: 0.22, rz: 0.25 } },
  { t: 0.4, pose: { x: 0.28, y: -0.34, z: -0.48, rx: 0.2, ry: 0.14, rz: 0.08 } },
  { t: 0.75, pose: { x: 0.26, y: -0.26, z: -0.52, rx: 0.1, ry: 0.12, rz: 0.03 } },
  { t: 1, pose: MP40_REST },
]

/**
 * Revolver — UE5 FPS first-person pack language
 * (https://www.youtube.com/watch?v=6kYep7sWK88):
 * strong single-shot kick, wrist-heavy settle, cylinder-swing reload.
 */
const REV_REST: ViewPose = {
  x: 0.3,
  y: -0.24,
  z: -0.5,
  rx: 0.06,
  ry: 0.14,
  rz: 0.02,
}

/**
 * Revolver SA kick — wrist flips muzzle high, whole gun drives back and up,
 * then slow settle for hammer cycle (UE5 FPS pack language).
 */
const REV_FIRE: Keyframe[] = [
  { t: 0, pose: REV_REST },
  // Peak flip: barrel tips hard up, grip kicks back into camera
  {
    t: 0.06,
    pose: { x: 0.36, y: 0.06, z: -0.18, rx: -1.15, ry: 0.06, rz: 0.22 },
  },
  {
    t: 0.16,
    pose: { x: 0.34, y: 0.0, z: -0.24, rx: -0.88, ry: 0.1, rz: 0.14 },
  },
  // Slow recover while “hammer” cycles
  {
    t: 0.4,
    pose: { x: 0.31, y: -0.14, z: -0.38, rx: -0.28, ry: 0.13, rz: 0.06 },
  },
  {
    t: 0.65,
    pose: { x: 0.3, y: -0.22, z: -0.48, rx: -0.02, ry: 0.14, rz: 0.02 },
  },
  { t: 1, pose: REV_REST },
]

/**
 * Cylinder reload: tip → swing open → dump → load → snap shut → ready.
 * Matches UE5 revolver pack beat structure (wrist flips + open cylinder).
 */
const REV_RELOAD: Keyframe[] = [
  { t: 0, pose: REV_REST },
  // Bring in / tilt for cylinder latch
  {
    t: 0.08,
    pose: { x: 0.22, y: -0.32, z: -0.46, rx: 0.28, ry: 0.22, rz: 0.35 },
  },
  // Swing cylinder open (strong roll + yaw)
  {
    t: 0.2,
    pose: { x: 0.14, y: -0.38, z: -0.4, rx: 0.55, ry: 0.45, rz: 0.85 },
  },
  // Hold open — eject empties (slight shake down)
  {
    t: 0.35,
    pose: { x: 0.12, y: -0.44, z: -0.38, rx: 0.7, ry: 0.5, rz: 0.95 },
  },
  {
    t: 0.45,
    pose: { x: 0.12, y: -0.46, z: -0.36, rx: 0.75, ry: 0.52, rz: 1.0 },
  },
  // Load speedloader / cartridges
  {
    t: 0.58,
    pose: { x: 0.16, y: -0.4, z: -0.4, rx: 0.55, ry: 0.4, rz: 0.75 },
  },
  {
    t: 0.7,
    pose: { x: 0.18, y: -0.36, z: -0.42, rx: 0.4, ry: 0.28, rz: 0.5 },
  },
  // Snap cylinder closed (opposite roll)
  {
    t: 0.82,
    pose: { x: 0.28, y: -0.22, z: -0.46, rx: -0.05, ry: 0.05, rz: -0.15 },
  },
  // Hammer cock / settle to aim
  {
    t: 0.92,
    pose: { x: 0.32, y: -0.2, z: -0.48, rx: -0.1, ry: 0.16, rz: 0.06 },
  },
  { t: 1, pose: REV_REST },
]

const REV_EQUIP: Keyframe[] = [
  { t: 0, pose: { x: 0.38, y: -0.72, z: -0.28, rx: 0.85, ry: 0.25, rz: 0.35 } },
  { t: 0.35, pose: { x: 0.32, y: -0.36, z: -0.44, rx: 0.28, ry: 0.16, rz: 0.1 } },
  { t: 0.7, pose: { x: 0.3, y: -0.24, z: -0.5, rx: 0.08, ry: 0.14, rz: 0.03 } },
  { t: 1, pose: REV_REST },
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
    idle: [{ t: 0, pose: PUMP_REST }],
    fire: PUMP_FIRE,
    pump: PUMP_RACK,
    reload: PUMP_RELOAD,
    equip: PUMP_EQUIP,
  },
  mp40: {
    idle: [{ t: 0, pose: MP40_REST }],
    fire: MP40_FIRE,
    reload: MP40_RELOAD,
    equip: MP40_EQUIP,
  },
  revolver: {
    idle: [{ t: 0, pose: REV_REST }],
    fire: REV_FIRE,
    reload: REV_RELOAD,
    equip: REV_EQUIP,
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
  // Low ready → swing up to center → bury → drop
  pitchfork: { melee: 0.7, fire: 0.7, equip: 0.42 },
  // Fire clips long enough to read muzzle-up kick before lever/pump
  double_barrel: { fire: 0.48, lever: 0.55, reload: 1.85, equip: 0.45 },
  lever22: { fire: 0.38, lever: 0.5, reload: 2.1, equip: 0.4 },
  pump_shotgun: { fire: 0.52, pump: 0.58, reload: 0.65, equip: 0.45 },
  // Short fire so full-auto kick can re-trigger each shot; mag-drop reload
  mp40: { fire: 0.13, reload: 2.35, equip: 0.42 },
  // Heavy kick + settle; cylinder-swing reload
  revolver: { fire: 0.55, reload: 2.8, equip: 0.45 },
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
  // Pitchfork low-ready: gentle bob (do not snap tips to crosshair)
  if (opts?.lockAim) {
    return {
      x: pose.x + Math.sin(time * 1.2) * 0.006,
      y: pose.y + Math.cos(time * 1.4) * 0.008 + Math.abs(Math.cos(time * 8.5)) * 0.02 * moveBob,
      z: pose.z + Math.sin(time * 2.2) * 0.006 + Math.sin(time * 9) * 0.01 * moveBob,
      rx: pose.rx + Math.sin(time * 1.1) * 0.01,
      ry: pose.ry,
      rz: pose.rz + Math.sin(time * 1.3) * 0.012,
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

// ── Third-person mapping (same clips / timing as FPS) ───────────────

export type ThirdPersonWeaponPose = {
  /** Right arm euler (x, y, z) — shoulder, hanging limb along −Y */
  armR: { x: number; y: number; z: number }
  /** Left arm euler */
  armL: { x: number; y: number; z: number }
  /**
   * Held weapon offset/rotation in the hand socket.
   * Socket sits at the hand; world WeaponModel already aims barrel along arm −Y.
   * Deltas here match FPS kick / lever / pump / thrust (no base −90°).
   */
  weapon: { x: number; y: number; z: number; rx: number; ry: number; rz: number }
}

/**
 * Sample the same FPS keyframe clip and map it onto third-person arms + weapon.
 *
 * Arm convention (hanging along −Y at identity):
 *   rot.x ≈ −π/2  → arm raised, hand forward (horizontal aim)
 *   rot.z          → outward / inward from torso
 *
 * Weapon world mesh is pre-rotated so barrel || arm −Y, so a raised arm aims
 * the gun horizontally ahead — not vertically.
 */
export function sampleThirdPersonWeaponPose(
  weaponId: WeaponId,
  phase: WeaponAnimPhase,
  animU: number,
  walkSwing = 0,
): ThirdPersonWeaponPose {
  const clipId = phaseToClip(phase)
  const rest = sampleClip(getWeaponClip(weaponId, 'idle'), 0)
  const pose = sampleClip(getWeaponClip(weaponId, clipId), phase === 'idle' ? 0 : animU)

  const dx = pose.x - rest.x
  const dy = pose.y - rest.y
  const dz = pose.z - rest.z
  const drx = pose.rx - rest.rx
  const dry = pose.ry - rest.ry
  const drz = pose.rz - rest.rz

  // Ready aim: both arms raised forward, slightly out — two-hand hold
  // ~−1.45 rad ≈ 83° so hands sit at shoulder height aiming ahead
  let armRX = -1.42
  let armRY = 0.12
  let armRZ = -0.28
  let armLX = -1.35
  let armLY = -0.08
  let armLZ = 0.42

  if (weaponId === 'pitchfork') {
    // Low ready — arms less raised than gun aim so shaft sits lower
    armRX = -1.05
    armRY = 0.1
    armRZ = -0.18
    armLX = -1.0
    armLY = -0.06
    armLZ = 0.2
  } else if (weaponId === 'mp40') {
    // Compact SMG hold — arms a bit tighter / closer to body
    armRX = -1.4
    armRY = 0.14
    armRZ = -0.32
    armLX = -1.28
    armLY = -0.1
    armLZ = 0.38
  } else if (weaponId === 'revolver') {
    // Mostly one-handed pistol stance; support hand light on frame
    armRX = -1.28
    armRY = 0.22
    armRZ = -0.38
    armLX = -0.95
    armLY = -0.05
    armLZ = 0.28
  } else if (weaponId === 'fist') {
    armRX = 0.12
    armRY = 0
    armRZ = -0.05
    armLX = 0.12
    armLY = 0
    armLZ = 0.05
  }

  if (weaponId === 'fist') {
    // Punch: FPS −z thrust → right arm snaps forward
    armRX = 0.15 + drx * 1.3 - dz * 2.0 - dy * 0.7
    armRY = dry * 0.6 - dx * 0.5
    armRZ = -0.05 + drz * 1.1 - dx * 0.6
    armLX = 0.25 + walkSwing * 0.45
    armLY = 0
    armLZ = 0.08
    if (phase === 'idle') {
      armRX = walkSwing * 0.7
      armLX = -walkSwing * 0.7
      armRY = 0
      armLY = 0
      armRZ = -0.05
      armLZ = 0.05
    }
  } else if (weaponId === 'pitchfork') {
    // Low hold → swing UP (positive dy) + thrust (−dz) → arms raise and extend
    // Stronger dy weight so the upward arc reads clearly in third person
    armRX += -dz * 0.5 + drx * 0.85 - dy * 1.15
    armLX += -dz * 0.45 + drx * 0.75 - dy * 1.05
    armRZ += drz * 0.5 + dry * 0.3
    armLZ += -drz * 0.35 + dry * 0.2
    armRY += dx * 0.3
    armLY += dx * 0.18
    if (phase === 'idle') {
      armRX += walkSwing * 0.1
      armLX -= walkSwing * 0.1
    }
  } else if (weaponId === 'revolver') {
    // Heavy one-hand kick — right arm flips muzzle up hard
    // FPS −rx (climb) + +dy (rise) + +dz (back) → stronger arm pitch
    armRX += drx * 1.45 - dy * 1.2 - dz * 0.55
    armLX += drx * 0.5 - dy * 0.4 - dz * 0.22
    armRZ += drz * 1.0 + dry * 0.55
    armLZ += -drz * 0.35 + dry * 0.25
    armRY += dx * 0.45 + dry * 0.25
    armLY += dx * 0.15
    if (phase === 'idle') {
      armRX += walkSwing * 0.06
      armLX -= walkSwing * 0.12
    }
  } else {
    // Guns: two-hand aim — FPS −rx = muzzle climb, +y rise, +z kick-back
    // Map climb strongly onto shoulders so TPS reads tip-up like FPS
    armRX += drx * 1.25 - dy * 1.0 - dz * 0.5
    armLX += drx * 1.05 - dy * 0.85 - dz * 0.4
    // Roll / yaw from FPS → shoulder twist
    armRZ += drz * 0.85 + dry * 0.45
    armLZ += -drz * 0.5 + dry * 0.35
    armRY += dx * 0.35 + dry * 0.2
    armLY += dx * 0.2
    // Left hand rides forend — slightly more forward than right
    armLX -= 0.06
    if (phase === 'idle') {
      armRX += walkSwing * 0.07
      armLX -= walkSwing * 0.07
    }
  }

  // Weapon deltas in hand socket (world model already points barrel along arm −Y).
  // Amplify pitch so the held mesh tips up/back with the arm on fire.
  const weapon = {
    x: dx * 0.1,
    y: dy * 0.12 - dz * 0.1,
    z: dx * 0.04,
    // FPS −rx climb → socket pitch (scaled up so TPS gun flips clearly)
    rx: drx * 1.15,
    ry: dry * 0.75,
    rz: drz * 0.9,
  }

  return {
    armR: { x: armRX, y: armRY, z: armRZ },
    armL: { x: armLX, y: armLY, z: armLZ },
    weapon,
  }
}

export { REST as VIEW_REST, IDLE_SWAY_BASE }
