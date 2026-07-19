export type WeaponId =
  | 'fist'
  | 'pitchfork'
  | 'double_barrel'
  | 'lever22'
  | 'pump_shotgun'
  | 'mp40'
  | 'revolver'

export type WeaponKind = 'melee' | 'gun'

export type WeaponDef = {
  id: WeaponId
  name: string
  kind: WeaponKind
  /** Damage per pellet / melee hit */
  damage: number
  /** Max hitscan distance */
  range: number
  /** Seconds between shots */
  fireCooldown: number
  /** Mag / tube capacity (0 for melee) */
  magazineSize: number
  /** Starting reserve ammo (0 for melee) */
  startReserve: number
  /** Full reload duration (guns that dump the whole mag) */
  reloadTime: number
  /** If true, R reloads one shell at a time (pump) */
  shellReload?: boolean
  /** Time to insert one shell when shellReload */
  shellReloadTime?: number
  pellets?: number
  /**
   * Cone half-angle in radians.
   * With circularSpread: uniform disk inside this cone.
   * Without: legacy axis jitter.
   */
  spread?: number
  /** Uniform circular pellet distribution inside the cone (shotguns) */
  circularSpread?: boolean
  /**
   * Linear damage falloff by hit distance (meters / world units).
   * fullRange → 100%, midRange → midMul, beyond → farMul.
   */
  damageFalloff?: {
    fullRange: number
    midRange: number
    midMul: number
    farMul: number
  }
  /** Horizontal knockback impulse on zombies (units/sec, scaled per pellet) */
  hitImpulse?: number
  /** Slot key 1–7 */
  slot: number
}

export type WeaponRuntime = {
  loaded: number
  reserve: number
}

export type WeaponAnimPhase = 'idle' | 'fire' | 'reload' | 'pump' | 'melee' | 'lever' | 'equip'

export type WeaponHudSnapshot = {
  id: WeaponId
  name: string
  kind: WeaponKind
  loaded: number
  /** Total ammo player has for this weapon (loaded + reserve). Melee shows ∞ */
  totalAmmo: number
  reserve: number
  magazineSize: number
  isMelee: boolean
  phase: WeaponAnimPhase
  slot: number
  slots: { id: WeaponId; name: string; slot: number }[]
}
