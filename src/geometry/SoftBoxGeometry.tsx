import { RoundedBoxGeometry } from '@react-three/drei'

/**
 * Drop-in for `<boxGeometry />` with a slight corner radius.
 * Radius scales with the shortest edge so tiny and large boxes both look soft.
 */
export function SoftBoxGeometry({
  args = [1, 1, 1],
  /** Override absolute radius (world units) */
  radius: radiusOverride,
  smoothness = 2,
}: {
  args?: [number, number, number]
  radius?: number
  smoothness?: number
}) {
  const [w, h, d] = args
  const min = Math.min(w, h, d)
  // ~15% of shortest edge, clamped so large props don't get bulbous
  const radius = Math.max(
    0.004,
    Math.min(radiusOverride ?? min * 0.15, min * 0.38, 0.07),
  )
  return (
    <RoundedBoxGeometry
      args={[w, h, d]}
      radius={radius}
      smoothness={smoothness}
      bevelSegments={2}
      steps={1}
    />
  )
}
