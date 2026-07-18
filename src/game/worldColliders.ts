import { aabb, circle, type Collider } from './collision'

/**
 * Static solid volumes for every solid farm asset.
 * Positions must stay in sync with FarmMap / building components.
 *
 * Non-solid (walkable): ground, dirt paths, gravel, decorative corn stalks
 * (treated as soft cover, not walls).
 */
export function buildFarmStaticColliders(): Collider[] {
  const c: Collider[] = []

  // ── Barn @ [-12, 0, -8] — main body 12×8 ──────────────────────────
  c.push(aabb(-12, -8, 6.1, 4.1, 'barn'))
  // Silo local [8.5, 0, -1] → world [-3.5, -9]
  c.push(circle(-3.5, -9, 1.75, 'barn-silo'))

  // ── Farmhouse @ [10, 0, -6] — body 8×7 + porch toward +Z ──────────
  c.push(aabb(10, -6, 4.15, 3.6, 'farmhouse'))
  // Porch deck extends roughly to z ≈ -1.5
  c.push(aabb(10, -2.0, 3.6, 1.4, 'farmhouse-porch'))

  // ── Perimeter fence: 48×40, gate 4.5 on +Z ─────────────────────────
  const halfW = 24
  const halfD = 20
  const thick = 0.28
  const gateHalf = 4.5 / 2

  // Back (-Z)
  c.push(aabb(0, -halfD, halfW + thick, thick, 'fence-back'))
  // Left (-X)
  c.push(aabb(-halfW, 0, thick, halfD + thick, 'fence-left'))
  // Right (+X)
  c.push(aabb(halfW, 0, thick, halfD + thick, 'fence-right'))
  // Front (+Z) with gate gap
  const frontSeg = (halfW - gateHalf) / 2
  const frontLeftCx = (-halfW + -gateHalf) / 2
  const frontRightCx = (halfW + gateHalf) / 2
  c.push(aabb(frontLeftCx, halfD, frontSeg + thick * 0.5, thick, 'fence-front-L'))
  c.push(aabb(frontRightCx, halfD, frontSeg + thick * 0.5, thick, 'fence-front-R'))
  // Open gate leaves hanging slightly into yard — light posts only
  c.push(circle(-gateHalf, halfD, 0.2, 'gate-post-L'))
  c.push(circle(gateHalf, halfD, 0.2, 'gate-post-R'))

  // ── Hay bales ──────────────────────────────────────────────────────
  const hay: [number, number][] = [
    [-5, -4],
    [-4.2, -4.8],
    // stacked bale shares footprint with base-ish — extra at [-4.6,-4.3]
    [-4.6, -4.3],
    [-18, -5],
    [-17.2, -6],
  ]
  for (const [x, z] of hay) {
    c.push(circle(x, z, 0.62, 'hay'))
  }

  // ── Trees (trunk only) ─────────────────────────────────────────────
  const trees: [number, number][] = [
    [-20, 12],
    [18, 14],
    [22, -14],
    [-22, -16],
    [6, -18],
    [-8, 16],
  ]
  for (const [x, z] of trees) {
    c.push(circle(x, z, 0.45, 'tree'))
  }

  // ── Water trough @ [-6, -10]  size 2.2 × 0.9 ───────────────────────
  c.push(aabb(-6, -10, 1.15, 0.5, 'trough'))

  // ── Outhouse @ [16, 2]  size ~1.4 × 1.4 ────────────────────────────
  c.push(aabb(16, 2, 0.75, 0.75, 'outhouse'))

  // ── Yard lamp pole @ [0, 12] (Environment, night/twilight visual) ──
  c.push(circle(0, 12, 0.18, 'yard-lamp'))

  // ── Cornfield footprints (block as dense patches, not per-stalk) ───
  // origin [14,0,6] rows 5 cols 6 spacing 1.4 → rough center/size
  c.push(aabb(14 + 3.5, 6 + 2.8, 4.2, 3.6, 'corn-east'))
  // origin [-20,0,4] rows 4 cols 4
  c.push(aabb(-20 + 2.1, 4 + 2.1, 2.9, 2.9, 'corn-west'))

  return c
}

/** Singleton static set (rebuilt only if map layout changes). */
let cachedStatic: Collider[] | null = null

export function getStaticWorldColliders(): readonly Collider[] {
  if (!cachedStatic) cachedStatic = buildFarmStaticColliders()
  return cachedStatic
}

/** Force rebuild after map edits (dev hot-reload friendly). */
export function invalidateStaticWorldColliders() {
  cachedStatic = null
}
