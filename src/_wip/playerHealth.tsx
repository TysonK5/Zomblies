import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { playerState } from '../game/playerState'
import { audioManager } from './audioManager'

export type PlayerHealthState = {
  hp: number
  maxHp: number
  dead: boolean
  deathT: number
  armor: number
  maxArmor: number
}

type PlayerHealthProps = {
  maxHp?: number
  maxArmor?: number
  onDeath?: () => void
  onDamage?: (amount: number) => void
}

const INITIAL_HP = 100
const INITIAL_ARMOR = 0

class PlayerHealthStore {
  hp = INITIAL_HP
  maxHp = INITIAL_HP
  dead = false
  deathT = 0
  armor = INITIAL_ARMOR
  maxArmor = INITIAL_ARMOR
  private listeners = new Set<(state: PlayerHealthState) => void>()

  get state(): PlayerHealthState {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      dead: this.dead,
      deathT: this.deathT,
      armor: this.armor,
      maxArmor: this.maxArmor,
    }
  }

  subscribe(fn: (state: PlayerHealthState) => void): () => void {
    this.listeners.add(fn)
    fn(this.state)
    return () => this.listeners.delete(fn)
  }

  takeDamage(amount: number, hitPoint?: { x: number; y: number; z: number }): number {
    if (this.dead) return 0

    let remaining = amount
    // Armor absorbs 50% of damage first
    if (this.armor > 0) {
      const armorAbsorb = Math.min(this.armor, remaining * 0.5)
      this.armor -= armorAbsorb
      remaining -= armorAbsorb
    }

    this.hp = Math.max(0, this.hp - remaining)

    audioManager.play('zombie_hit', {
      panX: hitPoint ? hitPoint.x - playerState.x : 0,
      panZ: hitPoint ? hitPoint.z - playerState.z : 0,
    })

    if (this.hp <= 0) {
      this.dead = true
      this.deathT = 0
    }

    for (const fn of this.listeners) fn(this.state)

    return amount - remaining
  }

  setHp(hp: number) {
    this.hp = Math.max(0, Math.min(this.maxHp, hp))
    if (this.hp > 0) this.dead = false
    for (const fn of this.listeners) fn(this.state)
  }

  setArmor(armor: number) {
    this.armor = Math.max(0, Math.min(this.maxArmor, armor))
    for (const fn of this.listeners) fn(this.state)
  }

  buyArmor(cost: number): boolean {
    if (this.armor >= this.maxArmor) return false
    const needed = this.maxArmor - this.armor
    const toBuy = Math.min(needed, Math.floor(cost * 0.5))
    if (toBuy <= 0) return false
    this.armor += toBuy
    for (const fn of this.listeners) fn(this.state)
    return true
  }

  reset() {
    this.hp = this.maxHp
    this.armor = this.maxArmor
    this.dead = false
    this.deathT = 0
    for (const fn of this.listeners) fn(this.state)
  }
}

export const playerHealth = new PlayerHealthStore()

/** React component that renders health-related visuals */
export function PlayerHealthSystem({
  maxHp = INITIAL_HP,
  maxArmor = INITIAL_ARMOR,
  onDeath,
  onDamage,
}: PlayerHealthProps) {
  const [healthState, setHealthState] = useState<PlayerHealthState>(playerHealth.state)
  const damageFlash = useRef(0)
  const deathSoundPlayed = useRef(false)

  useEffect(() => {
    playerHealth.maxHp = maxHp
    playerHealth.maxArmor = maxArmor
    return playerHealth.subscribe((state) => {
      setHealthState(state)
      if (state.dead && !deathSoundPlayed.current) {
        deathSoundPlayed.current = true
        audioManager.play('zombie_death')
        onDeath?.()
      }
    })
  }, [maxHp, maxArmor, onDeath])

  useEffect(() => {
    const onDamageEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { amount?: number; hitPoint?: { x: number; y: number; z: number } }
        | undefined
      if (detail?.amount && detail.hitPoint) {
        const actual = playerHealth.takeDamage(detail.amount, detail.hitPoint)
        damageFlash.current = 1
        onDamage?.(actual)
      }
    }
    window.addEventListener('player-damage', onDamageEvent as EventListener)
    return () => window.removeEventListener('player-damage', onDamageEvent as EventListener)
  }, [onDamage])

  useFrame(({ clock }) => {
    const dt = Math.min(clock.getDelta(), 0.05)

    if (damageFlash.current > 0) {
      damageFlash.current = Math.max(0, damageFlash.current - dt * 4)
    }

    if (healthState.dead) {
      healthState.deathT += dt
    }
  })

  return (
    <>
      {damageFlash.current > 0 && (
        <div className="damage-flash" style={{ opacity: damageFlash.current * 0.5 }} />
      )}
    </>
  )
}
