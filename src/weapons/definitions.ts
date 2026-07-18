import type { WeaponDef, WeaponId } from './types'

export const WEAPON_ORDER: WeaponId[] = [
  'fist',
  'pitchfork',
  'double_barrel',
  'lever22',
  'pump_shotgun',
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
}

export function weaponBySlot(slot: number): WeaponDef | undefined {
  return Object.values(WEAPONS).find((w) => w.slot === slot)
}
