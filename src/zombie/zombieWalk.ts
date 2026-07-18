/**
 * Classic shambling zombie locomotion.
 * Arms raised out and forward while walking; limp, dragging legs; torso lean.
 *
 * Reference pose: COD / Romero-style reach — both arms outstretched toward the
 * player at roughly shoulder height, slight outward spread, stiff drag-step gait.
 */

export type LimbEuler = { x: number; y: number; z: number }

export type ZombieWalkPose = {
  torso: LimbEuler & { yPos: number }
  head: LimbEuler
  /** Shoulder rotation (upper arm) */
  armL: LimbEuler
  armR: LimbEuler
  /** Elbow droop / claw (forearm local X) */
  forearmL: number
  forearmR: number
  /** Hip rotation (upper leg) */
  legL: LimbEuler
  legR: LimbEuler
  /** Knee bend (lower leg local X, positive = bend back) */
  kneeL: number
  kneeR: number
  /** Extra root bob (added to ground height) */
  rootBob: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/**
 * Sample a raised-arm zombie walk.
 * @param phase walk-cycle phase (radians). Advance from distance traveled so
 *   legs keep up with world speed (π per footstep).
 * @param t wall-clock time (seconds) — idle sway / head loll only
 * @param seed 0–1 per-zombie variation
 * @param moving whether translating
 * @param gait 0–1 walk intensity (relative speed)
 * @param crawl both legs gone
 */
export function sampleZombieWalk(
  phase: number,
  t: number,
  seed: number,
  moving: boolean,
  gait: number,
  crawl: boolean,
): ZombieWalkPose {
  const s = seed
  // Asymmetric limp: one side heavier / slower
  const limpBias = 0.55 + s * 0.7
  const g = moving ? Math.max(0.4, gait) : 0.1

  // ── Leg cycle ────────────────────────────────────────────────────
  // sin → swing; hitch adds a plant-foot snap so it feels stiff / undead
  // Slightly longer swing when gait is high so steps cover more ground
  const legSwing = crawl ? 0.16 : (0.55 + g * 0.22) * Math.max(g, 0.35)
  const legLSwing = Math.sin(phase) * legSwing * limpBias
  const legRSwing = Math.sin(phase + Math.PI) * legSwing * (2.05 - limpBias)
  // Drag: trailing leg holds back a bit longer
  const dragL = Math.max(0, -Math.sin(phase)) * 0.1 * g
  const dragR = Math.max(0, -Math.sin(phase + Math.PI)) * 0.12 * g
  // Knee bends more on the swing leg, less on plant
  const kneeL =
    crawl
      ? 0.15
      : 0.08 + Math.max(0, Math.sin(phase)) * 0.55 * g + dragL * 0.4
  const kneeR =
    crawl
      ? 0.15
      : 0.1 + Math.max(0, Math.sin(phase + Math.PI)) * 0.5 * g + dragR * 0.35

  if (crawl) {
    return {
      torso: {
        x: 1.05 + Math.sin(t * 2.1) * 0.06,
        y: 0,
        z: Math.sin(t * 1.3) * 0.05 + (s - 0.5) * 0.08,
        yPos: -0.32 + Math.sin(phase * 2) * 0.02,
      },
      head: {
        x: 0.25 + Math.sin(t * 1.6) * 0.08,
        y: Math.sin(t * 0.9) * 0.15,
        z: Math.sin(t * 1.1) * 0.08,
      },
      armL: {
        x: -0.95 + Math.sin(phase) * 0.45 * g,
        y: 0.1,
        z: 0.55 + Math.sin(t * 1.4) * 0.08,
      },
      armR: {
        x: -0.95 + Math.sin(phase + Math.PI) * 0.45 * g,
        y: -0.1,
        z: -0.55 + Math.sin(t * 1.4 + 1) * 0.08,
      },
      forearmL: 0.55 + Math.sin(phase) * 0.15,
      forearmR: 0.55 + Math.sin(phase + Math.PI) * 0.15,
      legL: { x: legLSwing, y: 0, z: 0.05 },
      legR: { x: legRSwing, y: 0, z: -0.05 },
      kneeL: 0.2,
      kneeR: 0.2,
      rootBob: Math.abs(Math.sin(phase)) * 0.02,
    }
  }

  // ── Standing / shambling ─────────────────────────────────────────
  //
  // Arms hang along −Y at rest. Straight-ahead reach:
  //   rot.x ≈ −π/2  → arm horizontal, pointing +Z (forward)
  //   rot.y ≈ 0     → no twist (yaw twist makes arms look crossed)
  //   rot.z tiny    → only a hair of outward spread so hands don't collide
  //
  // Large ±Z with large X folds arms across the chest — keep Z minimal.
  const reachBase = -1.52 - s * 0.06 // ~87° forward, nearly level
  // Keep arms high while walking; tiny idle droop when stopped
  const armDroop = moving ? 0 : 0.12
  // Small pitch bob only (same axis as reach) so arms stay parallel ahead
  const armBob = 0.1 * g
  const armLSwing = Math.sin(phase + Math.PI) * armBob
  const armRSwing = Math.sin(phase) * armBob * 0.9
  // Very slight outward so arms aren't fused; NOT a wide T-pose
  const armsOut = 0.14 + s * 0.04

  // Elbows almost straight — soft undead droop, not a claw that folds in
  const forearmBase = 0.1 + s * 0.05
  const forearmL = forearmBase + Math.sin(phase + Math.PI) * 0.06 * g
  const forearmR = forearmBase + 0.02 + Math.sin(phase) * 0.05 * g

  // Torso: hunch into the walk, roll with the limp
  const leanFwd = moving ? 0.22 + g * 0.14 : 0.1
  const torsoRoll = Math.sin(phase) * 0.1 * g + (s - 0.5) * 0.14
  const torsoYaw = Math.sin(phase * 0.5) * 0.07 * g

  // Head: lolling toward prey
  const headPitch = 0.18 + Math.sin(t * 1.25 + s * 3) * 0.1
  const headYaw = Math.sin(t * 0.8 + s * 2) * 0.24
  const headRoll = Math.sin(t * 1.05) * 0.12 + (s - 0.5) * 0.16

  // Hip bob + foot-plant thump
  const rootBob = moving
    ? Math.abs(Math.sin(phase)) * 0.05 * g
    : Math.sin(t * 1.7) * 0.008

  return {
    torso: {
      x: leanFwd + Math.sin(t * 0.65) * 0.03,
      y: torsoYaw,
      z: torsoRoll,
      yPos: Math.sin(phase * 2) * 0.014 * g,
    },
    head: {
      x: headPitch,
      y: headYaw,
      z: headRoll,
    },
    armL: {
      x: reachBase + armDroop + armLSwing,
      y: 0.02, // almost no yaw — keeps forearm parallel to reach
      z: armsOut,
    },
    armR: {
      // Slight height asymmetry only (one shoulder a hair lower)
      x: reachBase + armDroop + 0.04 + armRSwing,
      y: -0.02,
      z: -armsOut,
    },
    forearmL,
    forearmR,
    legL: {
      x: legLSwing - dragL,
      y: Math.sin(phase) * 0.05 * g,
      z: 0.05 + Math.max(0, -legLSwing) * 0.06,
    },
    legR: {
      x: legRSwing - dragR,
      y: Math.sin(phase + Math.PI) * 0.05 * g,
      z: -0.04 - Math.max(0, -legRSwing) * 0.05,
    },
    kneeL,
    kneeR,
    rootBob,
  }
}

/** Smoothly blend previous pose toward target (reduces jitter when start/stop) */
export function blendPose(from: ZombieWalkPose, to: ZombieWalkPose, a: number): ZombieWalkPose {
  const b = (A: LimbEuler, B: LimbEuler): LimbEuler => ({
    x: lerp(A.x, B.x, a),
    y: lerp(A.y, B.y, a),
    z: lerp(A.z, B.z, a),
  })
  return {
    torso: { ...b(from.torso, to.torso), yPos: lerp(from.torso.yPos, to.torso.yPos, a) },
    head: b(from.head, to.head),
    armL: b(from.armL, to.armL),
    armR: b(from.armR, to.armR),
    forearmL: lerp(from.forearmL, to.forearmL, a),
    forearmR: lerp(from.forearmR, to.forearmR, a),
    legL: b(from.legL, to.legL),
    legR: b(from.legR, to.legR),
    kneeL: lerp(from.kneeL, to.kneeL, a),
    kneeR: lerp(from.kneeR, to.kneeR, a),
    rootBob: lerp(from.rootBob, to.rootBob, a),
  }
}
