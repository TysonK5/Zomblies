import { useEffect, useState } from 'react'
import { getCameraMode, subscribeCameraMode, type CameraMode } from '../game/cameraMode'
import { formatKeyCode, getBinding } from '../game/keybindings'
import { useKeybindings } from '../game/useKeybindings'

/** Small indicator of current camera mode + toggle hint. */
export function CameraModeHud() {
  const [mode, setMode] = useState<CameraMode>(() => getCameraMode())
  useKeybindings()
  useEffect(() => subscribeCameraMode(setMode), [])

  const key = formatKeyCode(getBinding('toggleCamera'))
  const label = mode === 'first' ? '1ST PERSON' : '3RD PERSON'

  return (
    <div className="camera-mode-hud">
      <span className="camera-mode-label">{label}</span>
      <span className="camera-mode-hint">
        <kbd>{key}</kbd> toggle
      </span>
    </div>
  )
}
