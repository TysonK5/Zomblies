import type { ZombieAccessories, ZombieAppearance } from './types'

/** Curated skin tones — sickly undead range */
export const SKIN_TONES = [
  '#6B8F5E', // classic green
  '#7A9A6A', // pale moss
  '#5A7A52', // deep rot green
  '#8A9A7A', // gray-green
  '#9A8B78', // jaundiced
  '#6A7A72', // ashen teal
  '#A89080', // pale flesh
  '#5C6B58', // dark gangrene
] as const

export const SHIRT_COLORS = [
  '#4A5560', // charcoal
  '#3D5A80', // faded blue
  '#6B3A3A', // blood maroon
  '#C4B59A', // dirty cream
  '#2F4F3A', // forest
  '#5C4033', // brown flannel
  '#8B4513', // rusty
  '#3A3A4A', // night navy
] as const

export const PANTS_COLORS = [
  '#3A3A42',
  '#4A4035',
  '#2C3A4A',
  '#5A4A3A',
  '#1E2A1E',
  '#4A4A38',
] as const

export const HAIR_COLORS = [
  '#1A1A1A',
  '#3D2914',
  '#6B5344',
  '#4A3728',
  '#2C2C2C',
  '#8B7355',
] as const

export const ACCENT_COLORS = [
  '#8B1A1A', // barn red
  '#2C2C2C', // black
  '#C4A35A', // straw gold
  '#4A6FA5', // denim
  '#5C4033', // leather
  '#E8E0D0', // bone
] as const

export const HEAD_OPTIONS = ['none', 'cap', 'straw_hat', 'bandana', 'hard_hat'] as const
export const FACE_OPTIONS = ['none', 'eyepatch', 'scar', 'jaw_missing'] as const
export const TORSO_OPTIONS = ['none', 'overalls', 'vest', 'apron'] as const
/** Zombies do not carry tools — hands always empty */
export const HAND_OPTIONS = ['none'] as const
export const FEET_OPTIONS = ['boots', 'bare', 'mismatched'] as const

function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  const i = Math.abs(Math.floor(seed * 9973 + salt * 7919)) % arr.length
  return arr[i]!
}

/** Deterministic random look from a 0–1 seed (or Math.random()). */
export function randomAppearance(seed = Math.random()): ZombieAppearance {
  const accessories: ZombieAccessories = {
    head: pick(HEAD_OPTIONS, seed, 1),
    face: pick(FACE_OPTIONS, seed, 2),
    torso: pick(TORSO_OPTIONS, seed, 3),
    hand: 'none',
    feet: pick(FEET_OPTIONS, seed, 5),
  }

  return {
    skin: pick(SKIN_TONES, seed, 10),
    shirt: pick(SHIRT_COLORS, seed, 20),
    pants: pick(PANTS_COLORS, seed, 30),
    hair: pick(HAIR_COLORS, seed, 40),
    accent: pick(ACCENT_COLORS, seed, 50),
    accessories,
    seed,
  }
}

/** Named farm-themed presets for consistent casting */
export const PRESETS: Record<string, ZombieAppearance> = {
  farmer: {
    skin: '#6B8F5E',
    shirt: '#C4B59A',
    pants: '#4A4035',
    hair: '#3D2914',
    accent: '#C4A35A',
    accessories: {
      head: 'straw_hat',
      face: 'scar',
      torso: 'overalls',
      hand: 'none',
      feet: 'boots',
    },
    seed: 0.11,
  },
  mechanic: {
    skin: '#8A9A7A',
    shirt: '#4A5560',
    pants: '#2C3A4A',
    hair: '#1A1A1A',
    accent: '#2C2C2C',
    accessories: {
      head: 'hard_hat',
      face: 'eyepatch',
      torso: 'vest',
      hand: 'none',
      feet: 'boots',
    },
    seed: 0.42,
  },
  hillbilly: {
    skin: '#7A9A6A',
    shirt: '#6B3A3A',
    pants: '#5A4A3A',
    hair: '#6B5344',
    accent: '#8B1A1A',
    accessories: {
      head: 'bandana',
      face: 'jaw_missing',
      torso: 'none',
      hand: 'none',
      feet: 'mismatched',
    },
    seed: 0.67,
  },
  runner: {
    skin: '#9A8B78',
    shirt: '#3D5A80',
    pants: '#3A3A42',
    hair: '#2C2C2C',
    accent: '#4A6FA5',
    accessories: {
      head: 'cap',
      face: 'none',
      torso: 'none',
      hand: 'none',
      feet: 'bare',
    },
    seed: 0.88,
  },
  butcher: {
    skin: '#5A7A52',
    shirt: '#5C4033',
    pants: '#1E2A1E',
    hair: '#1A1A1A',
    accent: '#E8E0D0',
    accessories: {
      head: 'none',
      face: 'scar',
      torso: 'apron',
      hand: 'none',
      feet: 'boots',
    },
    seed: 0.25,
  },
  barebones: {
    skin: '#6A7A72',
    shirt: '#3A3A4A',
    pants: '#4A4A38',
    hair: '#4A3728',
    accent: '#5C4033',
    accessories: {
      head: 'none',
      face: 'none',
      torso: 'none',
      hand: 'none',
      feet: 'bare',
    },
    seed: 0.5,
  },
}
