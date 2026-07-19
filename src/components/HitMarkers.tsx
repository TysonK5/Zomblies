import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  getHitMarkers,
  tickHitMarkers,
  type HitMarker,
  type HitSurface,
} from '../weapons/hitMarkers'

/**
 * Imperative hit-marker renderer — one useFrame, shared materials, object pool.
 * Avoids mounting hundreds of React components during shotgun combat.
 */

const POOL_SIZE = 96
const _zAxis = new THREE.Vector3(0, 0, 1)
const _n = new THREE.Vector3()
const _q = new THREE.Quaternion()

function mat(color: string, opts?: { opacity?: number; depthWrite?: boolean }) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: opts?.opacity ?? 0.95,
    depthWrite: opts?.depthWrite ?? false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })
}

type PoolSlot = {
  group: THREE.Group
  disc: THREE.Mesh
  ring: THREE.Mesh
  sphere: THREE.Mesh
  box: THREE.Mesh
  kind: HitSurface | 'unused'
}

function surfaceKind(s: HitSurface): HitSurface {
  return s === 'flesh' ? 'blood_splat' : s
}

function buildPool(parent: THREE.Group): PoolSlot[] {
  const holeMat = mat('#0a0505')
  const ringMat = mat('#4a0c0a')
  const splatMat = mat('#6e1010')
  const mistMat = mat('#a01810', { opacity: 0.5 })
  const sprayMat = mat('#8b1210', { depthWrite: false })
  const worldMat = mat('#1a1512')
  const woodMat = mat('#6b4423')
  const concreteMat = mat('#9a9a90')
  const dirtMat = mat('#5a4030')

  // Shared geoms
  const circle = new THREE.CircleGeometry(1, 12)
  const ringGeo = new THREE.RingGeometry(0.45, 1, 12)
  const sphereGeo = new THREE.SphereGeometry(1, 6, 6)
  const boxGeo = new THREE.BoxGeometry(1, 0.6, 0.5)

  const slots: PoolSlot[] = []
  for (let i = 0; i < POOL_SIZE; i++) {
    const group = new THREE.Group()
    group.visible = false
    group.frustumCulled = false
    group.renderOrder = 40

    const disc = new THREE.Mesh(circle, splatMat.clone())
    disc.frustumCulled = false
    disc.renderOrder = 41
    const ring = new THREE.Mesh(ringGeo, ringMat.clone())
    ring.frustumCulled = false
    ring.renderOrder = 42
    ring.visible = false
    const sphere = new THREE.Mesh(sphereGeo, sprayMat.clone())
    sphere.frustumCulled = false
    sphere.renderOrder = 45
    sphere.visible = false
    const box = new THREE.Mesh(boxGeo, woodMat.clone())
    box.frustumCulled = false
    box.renderOrder = 46
    box.visible = false

    group.add(disc, ring, sphere, box)
    parent.add(group)
    slots.push({ group, disc, ring, sphere, box, kind: 'unused' })
  }

  // Stash shared base mats on parent for dispose (cloned per slot for opacity)
  ;(parent.userData as { _shared?: THREE.Material[] })._shared = [
    holeMat,
    ringMat,
    splatMat,
    mistMat,
    sprayMat,
    worldMat,
    woodMat,
    concreteMat,
    dirtMat,
  ]
  // Store color templates on userData for recolor without new mats
  parent.userData.colors = {
    hole: 0x0a0505,
    ring: 0x4a0c0a,
    splat: 0x6e1010,
    mist: 0xa01810,
    spray: 0x8b1210,
    world: 0x1a1512,
    wood: 0x6b4423,
    concrete: 0x9a9a90,
    dirt: 0x5a4030,
  }

  return slots
}

function applyMarkerVisual(slot: PoolSlot, m: HitMarker, parent: THREE.Group) {
  const kind = surfaceKind(m.surface)
  const life = Math.max(0, m.life / m.maxLife)
  const g = slot.group
  const colors = parent.userData.colors as Record<string, number>

  // No outward lift for sticky wounds — spawn already projects onto the mesh.
  // Mist floats slightly so it reads as spray off the surface.
  const lift = kind === 'blood_mist' ? 0.01 : 0
  g.position.set(m.x + m.nx * lift, m.y + m.ny * lift, m.z + m.nz * lift)

  _n.set(m.nx, m.ny, m.nz)
  if (_n.lengthSq() < 1e-6) _n.set(0, 1, 0)
  else _n.normalize()
  _q.setFromUnitVectors(_zAxis, _n)
  g.quaternion.copy(_q)
  g.rotateZ(m.roll)

  // Hide all prims then show the ones we need
  slot.disc.visible = false
  slot.ring.visible = false
  slot.sphere.visible = false
  slot.box.visible = false

  const s = m.scale
  const discMat = slot.disc.material as THREE.MeshBasicMaterial
  const ringMat = slot.ring.material as THREE.MeshBasicMaterial
  const sphereMat = slot.sphere.material as THREE.MeshBasicMaterial
  const boxMat = slot.box.material as THREE.MeshBasicMaterial

  if (kind === 'bullet_hole') {
    // Tight dark entry + thin rim — reads as a small hole on the asset surface
    slot.disc.visible = true
    slot.ring.visible = true
    discMat.color.setHex(colors.hole)
    ringMat.color.setHex(colors.ring)
    discMat.opacity = 0.75 + 0.25 * Math.min(1, life * 2)
    ringMat.opacity = 0.55 + 0.35 * Math.min(1, life * 2)
    g.scale.set(s, s, s)
    slot.disc.scale.set(0.55, 0.55, 1)
    slot.disc.position.set(0, 0, 0.001)
  } else if (kind === 'blood_splat' || kind === 'flesh') {
    slot.disc.visible = true
    discMat.color.setHex(colors.splat)
    discMat.opacity = 0.55 + 0.4 * Math.min(1, life * 2)
    g.scale.set(s, s * 0.92, s)
    slot.disc.scale.set(1, 1, 1)
    slot.disc.position.set(0, 0, 0)
  } else if (kind === 'blood_mist') {
    slot.disc.visible = true
    discMat.color.setHex(colors.mist)
    discMat.opacity = 0.35 * life
    const grow = s * (1 + (1 - life) * 1.4)
    g.scale.set(grow, grow, grow)
    slot.disc.scale.set(1, 1, 1)
    slot.disc.position.set(0, 0, 0)
  } else if (kind === 'blood_spray') {
    slot.sphere.visible = true
    sphereMat.color.setHex(colors.spray)
    sphereMat.opacity = 0.35 + 0.55 * life
    const shrink = s * (0.55 + 0.45 * life)
    g.scale.set(shrink, shrink, shrink)
  } else if (kind.startsWith('debris_')) {
    slot.box.visible = true
    const hex =
      kind === 'debris_wood' ? colors.wood : kind === 'debris_concrete' ? colors.concrete : colors.dirt
    boxMat.color.setHex(hex)
    boxMat.opacity = 0.35 + 0.65 * life
    g.scale.setScalar(s * (0.7 + 0.3 * life))
    g.rotation.x += 0.08
    g.rotation.z += 0.05
  } else {
    // world hole on buildings / ground / props
    slot.disc.visible = true
    discMat.color.setHex(colors.world)
    discMat.opacity = 0.45 + 0.5 * Math.min(1, life * 3)
    g.scale.set(s, s, s)
    slot.disc.scale.set(1, 1, 1)
    slot.disc.position.set(0, 0, 0)
  }

  slot.kind = kind
  g.visible = true
}

export function HitMarkers() {
  const root = useRef<THREE.Group>(null)
  const pool = useRef<PoolSlot[] | null>(null)

  useEffect(() => {
    const g = root.current
    if (!g || pool.current) return
    pool.current = buildPool(g)
    return () => {
      if (!pool.current) return
      const first = pool.current[0]
      for (const s of pool.current) {
        ;(s.disc.material as THREE.Material).dispose()
        ;(s.ring.material as THREE.Material).dispose()
        ;(s.sphere.material as THREE.Material).dispose()
        ;(s.box.material as THREE.Material).dispose()
      }
      // Geometries are shared across the pool — dispose once
      if (first) {
        first.disc.geometry.dispose()
        first.ring.geometry.dispose()
        first.sphere.geometry.dispose()
        first.box.geometry.dispose()
      }
      const shared = (g.userData as { _shared?: THREE.Material[] })._shared
      if (shared) for (const m of shared) m.dispose()
      while (g.children.length) g.remove(g.children[0]!)
      pool.current = null
    }
  }, [])

  useFrame((_, delta) => {
    tickHitMarkers(Math.min(delta, 0.05))
    const slots = pool.current
    const g = root.current
    if (!slots || !g) return

    const markers = getHitMarkers()
    const n = Math.min(markers.length, slots.length)
    for (let i = 0; i < n; i++) {
      applyMarkerVisual(slots[i]!, markers[i]!, g)
    }
    for (let i = n; i < slots.length; i++) {
      slots[i]!.group.visible = false
    }
  })

  return <group ref={root} />
}
