import { useEffect, useState } from 'react'
import { weaponState } from '../weapons/weaponState'
import type { WeaponHudSnapshot } from '../weapons/types'

/** Bottom-right weapon readouts: name, loaded, total ammo. */
export function WeaponHud() {
  const [snap, setSnap] = useState<WeaponHudSnapshot>(() => weaponState.snapshot())

  useEffect(() => weaponState.subscribe(setSnap), [])

  const totalLabel = snap.isMelee ? '∞' : String(Number.isFinite(snap.totalAmmo) ? snap.totalAmmo : 0)
  const loadedLabel = snap.isMelee ? '—' : String(snap.loaded)

  return (
    <div className="weapon-hud">
      <div className="weapon-slots" aria-hidden>
        {snap.slots.map((s) => (
          <span key={s.id} className={`weapon-slot${s.id === snap.id ? ' active' : ''}`}>
            {s.slot}
          </span>
        ))}
      </div>
      <div className="weapon-name">{snap.name}</div>
      <div className="weapon-ammo">
        <span className="weapon-loaded">{loadedLabel}</span>
        {!snap.isMelee && (
          <>
            <span className="weapon-ammo-sep">/</span>
            <span className="weapon-total">{totalLabel}</span>
          </>
        )}
        {snap.isMelee && <span className="weapon-melee-tag">MELEE</span>}
      </div>
      {snap.phase === 'reload' && <div className="weapon-status">RELOADING</div>}
      {snap.phase === 'pump' && <div className="weapon-status">PUMP</div>}
      {snap.phase === 'lever' && <div className="weapon-status">LEVER</div>}
      {snap.phase === 'equip' && <div className="weapon-status">EQUIP</div>}
    </div>
  )
}
