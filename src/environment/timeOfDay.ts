export type TimeOfDay = 'day' | 'twilight' | 'night'

export const TIME_ORDER: TimeOfDay[] = ['day', 'twilight', 'night']

export type EnvironmentPreset = {
  label: string
  /** Canvas / fog backdrop */
  clearColor: string
  fog: { color: string; near: number; far: number }
  /** Primary sun/moon direction in world space */
  sunPosition: [number, number, number]
  sky: {
    turbidity: number
    rayleigh: number
    mieCoefficient: number
    mieDirectionalG: number
  }
  ambient: { color: string; intensity: number }
  /** Main key light (sun / moon) */
  key: { color: string; intensity: number; castShadow: boolean }
  /** Cool/warm fill from opposite side */
  fill: { color: string; intensity: number; position: [number, number, number] }
  hemi: { sky: string; ground: string; intensity: number }
  stars: { visible: boolean; count: number; factor: number; fade: boolean; saturation: number }
  /** Optional warm point lights (windows / yard lamps) */
  pointLights: { position: [number, number, number]; color: string; intensity: number; distance: number }[]
  /** Show moon mesh */
  moon: boolean
  moonColor: string
}

export const ENVIRONMENT: Record<TimeOfDay, EnvironmentPreset> = {
  day: {
    label: 'Day',
    clearColor: '#87B8E0',
    fog: { color: '#c5d8e8', near: 45, far: 110 },
    sunPosition: [60, 55, 30],
    sky: {
      turbidity: 3.5,
      rayleigh: 1.4,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
    },
    ambient: { color: '#dce8f5', intensity: 0.55 },
    key: { color: '#fff5e0', intensity: 1.45, castShadow: true },
    fill: { color: '#a8c4e8', intensity: 0.28, position: [-35, 18, -25] },
    hemi: { sky: '#9ec8f0', ground: '#5a7a40', intensity: 0.45 },
    stars: { visible: false, count: 0, factor: 2, fade: true, saturation: 0 },
    pointLights: [],
    moon: false,
    moonColor: '#e8eef5',
  },

  twilight: {
    label: 'Twilight',
    clearColor: '#2a2038',
    fog: { color: '#4a3550', near: 28, far: 85 },
    // Low sun — golden hour / blood dusk
    sunPosition: [80, 6, 20],
    sky: {
      turbidity: 8,
      rayleigh: 2.2,
      mieCoefficient: 0.012,
      mieDirectionalG: 0.85,
    },
    ambient: { color: '#c4a090', intensity: 0.28 },
    key: { color: '#ff9a5c', intensity: 0.95, castShadow: true },
    fill: { color: '#5a4a8a', intensity: 0.35, position: [-25, 12, -30] },
    hemi: { sky: '#e07050', ground: '#3a2a28', intensity: 0.4 },
    stars: { visible: true, count: 600, factor: 2.5, fade: true, saturation: 0.4 },
    pointLights: [
      { position: [10, 3.2, -2.5], color: '#ffb060', intensity: 1.2, distance: 14 },
      { position: [-12, 2.5, -4], color: '#ff9040', intensity: 0.6, distance: 10 },
    ],
    moon: true,
    moonColor: '#f0e8d8',
  },

  night: {
    label: 'Night',
    clearColor: '#060810',
    fog: { color: '#0c121c', near: 18, far: 60 },
    // Moon high — Sky component still needs a "sun" vector; dim key is the moon
    sunPosition: [-40, 45, -30],
    sky: {
      turbidity: 1.5,
      rayleigh: 0.35,
      mieCoefficient: 0.002,
      mieDirectionalG: 0.7,
    },
    ambient: { color: '#1a2438', intensity: 0.18 },
    key: { color: '#c8d8f0', intensity: 0.22, castShadow: true },
    fill: { color: '#1a2848', intensity: 0.12, position: [20, 8, 15] },
    hemi: { sky: '#0a1020', ground: '#0a1208', intensity: 0.2 },
    stars: { visible: true, count: 2800, factor: 4, fade: true, saturation: 1 },
    pointLights: [
      // Farmhouse windows
      { position: [10, 2.2, -2.4], color: '#ffb44a', intensity: 2.2, distance: 16 },
      { position: [10, 5.0, -2.4], color: '#ffc060', intensity: 1.4, distance: 12 },
      { position: [12.5, 2.2, -6], color: '#ffb44a', intensity: 0.9, distance: 10 },
      // Barn glow
      { position: [-12, 2.5, -4], color: '#ff8030', intensity: 1.1, distance: 12 },
      // Yard lamp near gate path
      { position: [0, 3.5, 12], color: '#ffe8a0', intensity: 1.6, distance: 14 },
    ],
    moon: true,
    moonColor: '#e8eef8',
  },
}

export function nextTimeOfDay(current: TimeOfDay): TimeOfDay {
  const i = TIME_ORDER.indexOf(current)
  return TIME_ORDER[(i + 1) % TIME_ORDER.length]!
}

export function cycleTimeOfDay(current: TimeOfDay, dir: 1 | -1 = 1): TimeOfDay {
  const i = TIME_ORDER.indexOf(current)
  const next = (i + dir + TIME_ORDER.length) % TIME_ORDER.length
  return TIME_ORDER[next]!
}
