import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { FarmMap } from './FarmMap'
import { Player } from './Player'
import { Environment } from './Environment'
import { TimeOfDayToggle } from './TimeOfDayToggle'
import { SettingsPanel } from './SettingsPanel'
import { WeaponHud } from './WeaponHud'
import { ControlsLegend } from './ControlsLegend'
import { CameraModeHud } from './CameraModeHud'
import { HitMarkers } from './HitMarkers'
import { DamageNumbers } from './DamageNumbers'
import { nextTimeOfDay, type TimeOfDay } from '../environment/timeOfDay'
import { getBinding, isRebinding } from '../game/keybindings'
import { audioManager } from '../game/audioManager'
import './Game.css'

function Crosshair() {
  return (
    <div className="crosshair" aria-hidden>
      <span className="crosshair-h" />
      <span className="crosshair-v" />
    </div>
  )
}

export function Game() {
  const [locked, setLocked] = useState(false)
  const [round] = useState(1)
  const [points] = useState(500)
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day')
  const canvasEl = useRef<HTMLCanvasElement | null>(null)

  const onLockChange = useCallback((v: boolean) => setLocked(v), [])

  const startPlay = useCallback(() => {
    const el = canvasEl.current
    if (!el) return

    // Unlock audio on the same user gesture (browser autoplay policy)
    void audioManager.ensureRunning()
    audioManager.play('ui_click', { volume: 0.35 })

    const lock = el.requestPointerLock?.()
    if (lock && typeof (lock as Promise<void>).then === 'function') {
      ;(lock as Promise<void>).catch(() => {
        setLocked(true)
      })
    }

    window.setTimeout(() => {
      if (document.pointerLockElement !== el) {
        setLocked(true)
      }
    }, 250)
  }, [])

  // Cycle day/night; Esc in menu = save (already live) + exit menu back to play
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Esc while rebinding is handled by KeybindSettings (cancel only)
      if (e.code === 'Escape') {
        if (isRebinding()) return
        // In menu: settings already persist on change — Esc resumes play
        if (!locked) {
          e.preventDefault()
          startPlay()
        }
        // In play: browser drops pointer lock → menu reopens via onLockChange
        return
      }

      if (isRebinding()) return
      if (e.code === getBinding('cycleTimeOfDay')) {
        e.preventDefault()
        setTimeOfDay((t) => nextTimeOfDay(t))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, startPlay])

  return (
    <div className="game-root">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 200, position: [0, 1.7, 16] }}
        gl={{ antialias: true, toneMapping: 3 /* ACESFilmic */ }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true
          canvasEl.current = gl.domElement
        }}
      >
        {/*
          Keep Player outside any Suspense that may re-suspend (e.g. drei Text
          font load on first damage number). Shared Suspense was remounting
          Player and re-running its spawn useEffect on first gunshot.
        */}
        <Suspense fallback={null}>
          <Environment timeOfDay={timeOfDay} />
          <FarmMap />
        </Suspense>
        <HitMarkers />
        <Suspense fallback={null}>
          <DamageNumbers />
        </Suspense>
        <Player onLockChange={onLockChange} />
      </Canvas>

      {/* HUD */}
      <div className="hud">
        <div className="hud-bottom-left">
          <div className="hud-round">
            <span className="hud-label">ROUND</span>
            <span className="hud-round-num">{round}</span>
          </div>
        </div>
        <div className="hud-bottom-right">
          <div className="hud-points">
            <span className="hud-points-num">{points}</span>
          </div>
          <WeaponHud />
        </div>
        <div className="hud-top-center">
          <span className="map-name">THE FARM</span>
          <CameraModeHud />
        </div>
      </div>

      <TimeOfDayToggle value={timeOfDay} onChange={setTimeOfDay} />

      {locked && <Crosshair />}

      {!locked && (
        <div
          className="click-prompt"
          role="dialog"
          aria-label="Start game"
          onClick={startPlay}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              startPlay()
            }
          }}
        >
          <div className="click-prompt-box" onClick={(e) => e.stopPropagation()}>
            <h1>THE FARM</h1>
            <p className="subtitle">Zombies Prototype</p>
            <button
              type="button"
              className="play-btn"
              onClick={(e) => {
                e.stopPropagation()
                startPlay()
              }}
            >
              Click to play
            </button>

            <SettingsPanel />
            <ControlsLegend />
          </div>
        </div>
      )}
    </div>
  )
}
