import { WEAPONS, WEAPON_ORDER, weaponBySlot } from './definitions'
import type { WeaponAnimPhase, WeaponHudSnapshot, WeaponId, WeaponRuntime } from './types'
import { getClipDuration } from './weaponAnims'

type Listener = (s: WeaponHudSnapshot) => void

function freshInventory(): Record<WeaponId, WeaponRuntime> {
  const inv = {} as Record<WeaponId, WeaponRuntime>
  for (const id of WEAPON_ORDER) {
    const def = WEAPONS[id]
    inv[id] = {
      loaded: def.magazineSize,
      reserve: def.startReserve,
    }
  }
  return inv
}

/** Weapons that rack a lever after each shot (reference hybrid / lever guns) */
function usesLeverCycle(id: WeaponId) {
  return id === 'double_barrel' || id === 'lever22'
}

class WeaponStateStore {
  currentId: WeaponId = 'double_barrel'
  inventory = freshInventory()
  phase: WeaponAnimPhase = 'idle'
  animT = 0
  animDuration = 0
  nextFireTime = 0
  /** -1 = queue pump after fire; 0 = none; >0 shell reload bookkeeping */
  shellsToLoad = 0
  /** Queue lever cycle after fire settles */
  queueLever = false
  private listeners = new Set<Listener>()
  firePulse = 0
  reloadPulse = 0

  get def() {
    return WEAPONS[this.currentId]
  }

  get runtime() {
    return this.inventory[this.currentId]!
  }

  select(id: WeaponId) {
    if (this.currentId === id) return
    this.phase = 'equip'
    this.animT = 0
    this.animDuration = getClipDuration(id, 'equip', 0.4)
    this.shellsToLoad = 0
    this.queueLever = false
    this.currentId = id
    this.emit()
  }

  selectSlot(slot: number) {
    const def = weaponBySlot(slot)
    if (def) this.select(def.id)
  }

  cycle(dir: 1 | -1) {
    const i = WEAPON_ORDER.indexOf(this.currentId)
    const next = WEAPON_ORDER[(i + dir + WEAPON_ORDER.length) % WEAPON_ORDER.length]!
    this.select(next)
  }

  tryFire(now: number): boolean {
    if (this.phase === 'reload' || this.phase === 'pump' || this.phase === 'lever' || this.phase === 'equip') {
      return false
    }
    if (now < this.nextFireTime) return false

    const def = this.def
    const rt = this.runtime

    if (def.kind === 'gun') {
      if (rt.loaded <= 0) {
        // Empty chamber: reload if reserve remains, otherwise dry-fire click
        if (rt.reserve > 0) {
          this.tryReload(now)
          return false
        }
        this.phase = 'fire'
        this.animT = 0
        this.animDuration = getClipDuration(def.id, 'fire', 0.3)
        this.nextFireTime = now + 0.3
        this.firePulse++
        this.emit()
        return false
      }
      rt.loaded -= 1
    }

    this.phase = def.kind === 'melee' ? 'melee' : 'fire'
    this.animT = 0
    this.animDuration = getClipDuration(
      def.id,
      def.kind === 'melee' ? 'melee' : 'fire',
      def.kind === 'melee' ? 0.45 : 0.4,
    )
    this.nextFireTime = now + def.fireCooldown
    this.firePulse++

    if (def.id === 'pump_shotgun') {
      this.shellsToLoad = -1
      this.queueLever = false
    } else if (usesLeverCycle(def.id) && def.kind === 'gun') {
      this.queueLever = true
      this.shellsToLoad = 0
    } else {
      this.queueLever = false
    }

    this.emit()
    return true
  }

  tryReload(_now: number): boolean {
    const def = this.def
    if (def.kind !== 'gun') return false
    // Don't interrupt an active reload / lever / pump / equip
    if (
      this.phase === 'reload' ||
      this.phase === 'pump' ||
      this.phase === 'lever' ||
      this.phase === 'equip'
    ) {
      return false
    }

    const rt = this.runtime
    if (rt.loaded >= def.magazineSize || rt.reserve <= 0) return false

    // Cancel dry-fire / leftover fire phase so reload can start immediately
    this.queueLever = false
    this.shellsToLoad = 0

    if (def.shellReload) {
      this.phase = 'reload'
      this.animT = 0
      this.animDuration = getClipDuration(def.id, 'reload', def.shellReloadTime ?? 0.55)
      this.shellsToLoad = 1
      this.reloadPulse++
      this.emit()
      return true
    }

    this.phase = 'reload'
    this.animT = 0
    this.animDuration = getClipDuration(def.id, 'reload', def.reloadTime)
    this.shellsToLoad = 0
    this.reloadPulse++
    this.emit()
    return true
  }

  update(dt: number, _now?: number) {
    if (this.phase === 'idle') return

    this.animT += dt
    if (this.animT < this.animDuration) {
      // Throttle HUD spam: only emit ~15hz during anim
      if (Math.floor(this.animT * 15) !== Math.floor((this.animT - dt) * 15)) {
        this.emit()
      }
      return
    }

    if (this.phase === 'equip') {
      this.phase = 'idle'
      this.animT = 0
      this.emit()
      return
    }

    if (this.phase === 'fire' || this.phase === 'melee') {
      if (this.shellsToLoad === -1 && this.def.id === 'pump_shotgun') {
        this.phase = 'pump'
        this.animT = 0
        this.animDuration = getClipDuration(this.def.id, 'pump', 0.5)
        this.shellsToLoad = 0
        this.emit()
        return
      }
      if (this.queueLever && usesLeverCycle(this.def.id)) {
        this.phase = 'lever'
        this.animT = 0
        this.animDuration = getClipDuration(this.def.id, 'lever', 0.5)
        this.queueLever = false
        this.emit()
        return
      }
      this.phase = 'idle'
      this.animT = 0
      this.emit()
      return
    }

    if (this.phase === 'pump' || this.phase === 'lever') {
      this.phase = 'idle'
      this.animT = 0
      this.emit()
      return
    }

    if (this.phase === 'reload') {
      const def = this.def
      const rt = this.runtime

      if (def.shellReload) {
        if (rt.reserve > 0 && rt.loaded < def.magazineSize) {
          rt.reserve -= 1
          rt.loaded += 1
        }
        if (rt.loaded < def.magazineSize && rt.reserve > 0) {
          this.animT = 0
          this.animDuration = getClipDuration(def.id, 'reload', def.shellReloadTime ?? 0.55)
          this.reloadPulse++
          this.emit()
          return
        }
        // Tube full — optional pump to chamber
        this.phase = 'pump'
        this.animT = 0
        this.animDuration = getClipDuration(def.id, 'pump', 0.5)
        this.emit()
        return
      }

      const need = def.magazineSize - rt.loaded
      const take = Math.min(need, rt.reserve)
      rt.loaded += take
      rt.reserve -= take
      this.phase = 'idle'
      this.animT = 0
      this.emit()
      return
    }
  }

  cancelReload() {
    if (this.phase === 'reload' && this.def.shellReload) {
      this.phase = 'idle'
      this.animT = 0
      this.emit()
    }
  }

  /** 0–1 progress of current clip */
  get animU() {
    if (this.animDuration <= 0) return 0
    return Math.min(1, this.animT / this.animDuration)
  }

  snapshot(): WeaponHudSnapshot {
    const def = this.def
    const rt = this.runtime
    const isMelee = def.kind === 'melee'
    return {
      id: def.id,
      name: def.name,
      kind: def.kind,
      loaded: isMelee ? 0 : rt.loaded,
      reserve: isMelee ? 0 : rt.reserve,
      totalAmmo: isMelee ? Infinity : rt.loaded + rt.reserve,
      magazineSize: def.magazineSize,
      isMelee,
      phase: this.phase,
      slot: def.slot,
      slots: WEAPON_ORDER.map((id) => ({
        id,
        name: WEAPONS[id].name,
        slot: WEAPONS[id].slot,
      })),
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.snapshot())
    return () => this.listeners.delete(fn)
  }

  private emit() {
    const snap = this.snapshot()
    for (const fn of this.listeners) fn(snap)
  }

  reset() {
    this.currentId = 'double_barrel'
    this.inventory = freshInventory()
    this.phase = 'idle'
    this.animT = 0
    this.shellsToLoad = 0
    this.queueLever = false
    this.nextFireTime = 0
    this.emit()
  }
}

export const weaponState = new WeaponStateStore()
