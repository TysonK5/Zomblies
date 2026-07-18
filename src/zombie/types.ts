/** Modular zombie appearance — one mesh kit, many looks via color + accessories. */

import type { LimbState } from '../weapons/limbs'

export type HeadAccessory = 'none' | 'cap' | 'straw_hat' | 'bandana' | 'hard_hat'
export type FaceAccessory = 'none' | 'eyepatch' | 'scar' | 'jaw_missing'
export type TorsoAccessory = 'none' | 'overalls' | 'vest' | 'apron'
export type HandAccessory = 'none' | 'pitchfork' | 'shovel' | 'board'
export type FootStyle = 'boots' | 'bare' | 'mismatched'

export type ZombieAccessories = {
  head: HeadAccessory
  face: FaceAccessory
  torso: TorsoAccessory
  hand: HandAccessory
  feet: FootStyle
}

/**
 * Full look for a single base zombie model.
 * Swap colors and accessories to produce distinct characters without new meshes.
 */
export type ZombieAppearance = {
  skin: string
  shirt: string
  pants: string
  hair: string
  accent: string
  accessories: ZombieAccessories
  seed: number
}

export type ZombieModelProps = {
  appearance: ZombieAppearance
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  animate?: boolean
  /** Which limbs are still attached (false = destroyed / missing) */
  limbs?: LimbState
  /** Locomotion: crawl if both legs gone */
  crawl?: boolean
  /** True while actively walking/chasing (drives shambling gait) */
  moving?: boolean
  /** 0–1 gait intensity (speed relative to max) */
  gait?: number
  /**
   * Optional live locomotion sample (avoids React re-renders every frame).
   * `speed` is horizontal world units/sec — drives walk-cycle cadence.
   */
  getLocomotion?: () => { moving: boolean; gait: number; speed: number }
}
