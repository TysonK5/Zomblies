import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import {
  getDamageFloaters,
  subscribeDamageNumbers,
  syncDamageFloater,
  tickDamageNumbers,
  type DamageFloater,
} from '../weapons/damageNumbers'

/**
 * Damage readouts glued flat to the hit surface (limb / torso / head),
 * not floating billboards off the body.
 */
export function DamageNumbers() {
  const [, setTick] = useState(0)
  useEffect(() => subscribeDamageNumbers(() => setTick((n) => n + 1)), [])

  useFrame((_, delta) => {
    tickDamageNumbers(Math.min(delta, 0.05))
  })

  const floaters = getDamageFloaters()
  return (
    <group>
      {floaters.map((f) => (
        <DamageSurfaceText key={f.id} floater={f} />
      ))}
    </group>
  )
}

const _n = new THREE.Vector3()
const _up = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _m = new THREE.Matrix4()
const _xAxis = new THREE.Vector3()
const _yAxis = new THREE.Vector3()

function DamageSurfaceText({ floater }: { floater: DamageFloater }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    const g = ref.current
    if (!g) return

    // Follow zombie pose / tip-over
    syncDamageFloater(floater)

    const life = Math.max(0, floater.life / floater.maxLife)
    // Small extra lift so text sits on the skin, not inside
    const lift = 0.02 + (1 - life) * 0.015
    g.position.set(
      floater.x + floater.nx * lift,
      floater.y + floater.ny * lift,
      floater.z + floater.nz * lift,
    )

    // Lay the text plane flat on the surface: local +Z aligns with hit normal
    _n.set(floater.nx, floater.ny, floater.nz)
    if (_n.lengthSq() < 1e-8) _n.set(0, 1, 0)
    else _n.normalize()

    // Prefer world-up as reference so glyphs stay readable when possible
    _up.set(0, 1, 0)
    if (Math.abs(_n.dot(_up)) > 0.92) _up.set(1, 0, 0)

    // Build orthonormal basis: Z = normal (outward), Y ≈ up projected on plane
    _xAxis.crossVectors(_up, _n).normalize()
    _yAxis.crossVectors(_n, _xAxis).normalize()
    _m.makeBasis(_xAxis, _yAxis, _n)
    _q.setFromRotationMatrix(_m)
    g.quaternion.copy(_q)
    // In-plane roll for variety
    g.rotateZ(floater.roll)

    // Slight grow + fade as life ends (stays on surface — no float-away)
    const s = floater.scale * (0.9 + (1 - life) * 0.2)
    g.scale.setScalar(s)
  })

  const opacity = Math.min(1, floater.life * 2.2)

  return (
    <group ref={ref} position={[floater.x, floater.y, floater.z]} renderOrder={110} frustumCulled={false}>
      {/*
        Text default faces +Z; we align +Z with the surface normal so the
        glyph lies on the hit part and faces outward (readable from impact side).
      */}
      <Text
        fontSize={0.2 * floater.scale}
        color={floater.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.018}
        outlineColor="#1a0505"
        fillOpacity={opacity}
        depthOffset={-2}
        renderOrder={110}
      >
        {floater.text}
      </Text>
    </group>
  )
}