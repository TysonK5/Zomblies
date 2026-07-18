import type { WeaponDef, WeaponId } from './types'

export const WEAPON_ORDER: WeaponId[] = [
  'fist',
  'pitchfork',
  'double_barrel',
  'lever22',
  'pump_shotgun',
  'mp40',
  'revolver',
]

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  fist: {
    id: 'fist',
    name: 'Fists',
    kind: 'melee',
    damage: 28,
    range: 1.9,
    fireCooldown: 0.42,
    magazineSize: 0,
    startReserve: 0,
    reloadTime: 0,
    slot: 1,
  },
  pitchfork: {
    id: 'pitchfork',
    name: 'Pitchfork',
    kind: 'melee',
    damage: 72,
    /** Stab reach along crosshair aim */
    range: 3.1,
    /** Matches pull-in → stab clip */
    fireCooldown: 0.7,
    magazineSize: 0,
    startReserve: 0,
    reloadTime: 0,
    slot: 2,
  },
  double_barrel: {
    id: 'double_barrel',
    name: 'Double Barrel',
    kind: 'gun',
    damage: 16,
    range: 28,
    fireCooldown: 0.32,
    magazineSize: 2,
    startReserve: 24,
    reloadTime: 2.1,
    pellets: 8,
    spread: 0.12,
    slot: 3,
  },
  lever22: {
    id: 'lever22',
    name: '.22 Lever Action',
    kind: 'gun',
    damage: 24,
    range: 55,
    fireCooldown: 0.38,
    magazineSize: 12,
    startReserve: 72,
    reloadTime: 2.4,
    pellets: 1,
    spread: 0.012,
    slot: 4,
  },
  pump_shotgun: {
    id: 'pump_shotgun',
    name: 'Pump Shotgun',
    kind: 'gun',
    damage: 14,
    range: 32,
    fireCooldown: 0.72,
    magazineSize: 6,
    startReserve: 36,
    reloadTime: 0.55,
    shellReload: true,
    shellReloadTime: 0.55,
    pellets: 7,
    spread: 0.09,
    slot: 5,
  },
  /**
   * MP40 — WWII SMG (COD-style full-auto + mag-drop reload).
   * ~500 RPM, 32-round stick mag, mid-range spray.
   */
  mp40: {
    id: 'mp40',
    name: 'MP40',
    kind: 'gun',
    damage: 18,
    range: 42,
    /** ~500 rounds/min full auto */
    fireCooldown: 0.12,
    magazineSize: 32,
    startReserve: 128,
    /** Drop mag → insert → charge handle */
    reloadTime: 2.35,
    pellets: 1,
    spread: 0.028,
    slot: 6,
  },
  /**
   * Revolver — UE5 FPS-style single-action feel (heavy kick, cylinder reload).
   * Ref: https://www.youtube.com/watch?v=6kYep7sWK88
   */
  revolver: {
    id: 'revolver',
    name: 'Revolver',
    kind: 'gun',
    damage: 48,
    range: 48,
    /** Deliberate single shots — hammer cycle between rounds */
    fireCooldown: 0.55,
    magazineSize: 6,
    startReserve: 48,
    /** Swing cylinder → eject → load → close → hammer */
    reloadTime: 2.8,
    pellets: 1,
    spread: 0.018,
    slot: 7,
  },
}

export function weaponBySlot(slot: number): WeaponDef | undefined {
  return Object.values(WEAPONS).find((w) => w.slot === slot)
}
