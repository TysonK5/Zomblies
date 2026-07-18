/**
 * Floating damage numbers + hit feedback for HP combat.
 */

export type DamageFloater = {
  id: number
  x: number
  y: number
  z: number
  text: string
  color: string
  life: number
  maxLife: number
  /** Rise speed */
  rise: number
  scale: number
}

type Listener = () => void

let nextId = 1
const floaters: DamageFloater[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const fn of listeners) fn()
}

export function subscribeDamageNumbers(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getDamageFloaters(): readonly DamageFloater[] {
  return floaters
}

export function spawnDamageNumber(opts: {
  x: number
  y: number
  z: number
  amount: number
  kind?: 'body' | 'limb' | 'head' | 'kill'
}) {
  const kind = opts.kind ?? 'body'
  const isHead = kind === 'head'
  const isKill = kind === 'kill'
  const text =
    isKill && isHead
      ? `HEADSHOT ${opts.amount}`
      : isKill
        ? `KILL ${opts.amount}`
        : `-${opts.amount}`

  floaters.push({
    id: nextId++,
    x: opts.x + (Math.random() - 0.5) * 0.15,
    y: opts.y,
    z: opts.z + (Math.random() - 0.5) * 0.15,
    text,
    color: isHead ? '#ffdd44' : isKill ? '#ff5533' : kind === 'limb' ? '#ffaa88' : '#ffffff',
    life: isHead || isKill ? 1.1 : 0.85,
    maxLife: isHead || isKill ? 1.1 : 0.85,
    rise: 0.9 + Math.random() * 0.4,
    scale: isHead ? 1.35 : isKill ? 1.2 : 1,
  })
  while (floaters.length > 40) floaters.shift()
  emit()
}

export function tickDamageNumbers(dt: number) {
  let changed = false
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i]!
    f.life -= dt
    f.y += f.rise * dt
    if (f.life <= 0) {
      floaters.splice(i, 1)
      changed = true
    }
  }
  if (changed) emit()
}
