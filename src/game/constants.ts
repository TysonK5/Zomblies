/** Shared gameplay constants — player and zombie locomotion stay in sync here. */

export const PLAYER_MOVE_SPEED = 6
export const PLAYER_SPRINT_MULT = 1.65
/** Top speed while sprinting (units/sec) */
export const PLAYER_MAX_SPEED = PLAYER_MOVE_SPEED * PLAYER_SPRINT_MULT

/** Zombies never exceed this fraction of the player's max speed */
export const ZOMBIE_SPEED_RATIO = 0.6
export const ZOMBIE_MAX_SPEED = PLAYER_MAX_SPEED * ZOMBIE_SPEED_RATIO

/**
 * How far behind the player's position zombies "perceive".
 * They chase where the player was this many seconds ago, not where they are now.
 */
export const ZOMBIE_REACTION_LAG = 0.2

/** Stop closing when within this distance of the lagged target (and of player). */
export const ZOMBIE_STOP_DISTANCE = 1.15

export const WORLD_BOUNDS = { minX: -38, maxX: 38, minZ: -38, maxZ: 38 } as const

export const EYE_HEIGHT = 1.7

/** Horizontal capsule radii for ground-plane collision */
export const PLAYER_RADIUS = 0.38
export const ZOMBIE_RADIUS = 0.42
