/**
 * First-person vs third-person camera mode.
 */

export type CameraMode = 'first' | 'third'

type Listener = (mode: CameraMode) => void

let mode: CameraMode = 'first'
const listeners = new Set<Listener>()

export function getCameraMode(): CameraMode {
  return mode
}

export function setCameraMode(next: CameraMode) {
  if (mode === next) return
  mode = next
  for (const fn of listeners) fn(mode)
}

export function toggleCameraMode(): CameraMode {
  setCameraMode(mode === 'first' ? 'third' : 'first')
  return mode
}

export function subscribeCameraMode(fn: Listener): () => void {
  listeners.add(fn)
  fn(mode)
  return () => listeners.delete(fn)
}

/** Third-person spring-arm defaults */
export const TPS = {
  distance: 4.2,
  minDistance: 1.4,
  maxDistance: 7,
  height: 1.35,
  /** Extra vertical look pivot above feet */
  lookHeight: 1.45,
  pitchMin: -0.55,
  pitchMax: 0.85,
  /** How fast camera eases to desired pose */
  follow: 14,
} as const
