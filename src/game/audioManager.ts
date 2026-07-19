/**
 * Game audio — Kenney CC0 samples + procedural fallback.
 * Assets live in /public/sounds (see public/sounds/CREDITS.md).
 *
 * Sources: kenney.nl Impact / RPG / Interface packs (CC0).
 */

export type SoundType =
  | 'gunshot'
  | 'gunshot_smg'
  | 'gunshot_shotgun'
  | 'gunshot_pistol'
  | 'pump'
  | 'lever'
  | 'reload'
  | 'equip'
  | 'melee'
  | 'zombie_groan'
  | 'zombie_hit'
  | 'zombie_death'
  | 'pickup'
  | 'buy'
  | 'empty'
  | 'door'
  | 'footstep'
  | 'world_hit'
  | 'ui_click'

type SampleDef = {
  /** Paths under /sounds/ — first available wins; multiple = random pick */
  files: string[]
  volume?: number
  /** Pitch random range (0.1 = ±10%) */
  pitchRange?: number
  /** Also layer a short synth hit under the sample */
  synthLayer?: boolean
}

const SAMPLE_MAP: Record<SoundType, SampleDef> = {
  gunshot: {
    files: ['gunshot_metal.ogg', 'gunshot_metal2.ogg', 'gunshot_punch.ogg'],
    volume: 0.7,
    pitchRange: 0.12,
    synthLayer: true,
  },
  gunshot_smg: {
    files: ['gunshot_metal2.ogg', 'gunshot_metal.ogg'],
    volume: 0.45,
    pitchRange: 0.18,
    synthLayer: true,
  },
  gunshot_shotgun: {
    files: ['gunshot_punch.ogg', 'gunshot_metal.ogg'],
    volume: 0.85,
    pitchRange: 0.08,
    synthLayer: true,
  },
  gunshot_pistol: {
    files: ['gunshot_metal2.ogg', 'gunshot_punch.ogg'],
    volume: 0.65,
    pitchRange: 0.1,
    synthLayer: true,
  },
  pump: { files: ['pump_rack.ogg'], volume: 0.55, pitchRange: 0.06 },
  lever: { files: ['lever_rack.ogg', 'empty_click.ogg'], volume: 0.5, pitchRange: 0.08 },
  reload: { files: ['reload_shell.ogg', 'empty_click.ogg'], volume: 0.45, pitchRange: 0.1 },
  equip: { files: ['equip.ogg'], volume: 0.4, pitchRange: 0.08 },
  melee: { files: ['melee.ogg', 'melee2.ogg'], volume: 0.6, pitchRange: 0.12 },
  zombie_hit: { files: ['zombie_hit.ogg', 'zombie_hit2.ogg'], volume: 0.55, pitchRange: 0.15 },
  zombie_death: { files: ['zombie_death.ogg'], volume: 0.6, pitchRange: 0.1 },
  zombie_groan: { files: ['zombie_groan.ogg'], volume: 0.25, pitchRange: 0.25 },
  pickup: { files: ['pickup.ogg'], volume: 0.4, pitchRange: 0.05 },
  buy: { files: ['buy.ogg'], volume: 0.4, pitchRange: 0.05 },
  empty: { files: ['empty_click.ogg'], volume: 0.35, pitchRange: 0.05 },
  door: { files: ['door.ogg'], volume: 0.45, pitchRange: 0.05 },
  footstep: { files: ['footstep1.ogg', 'footstep2.ogg'], volume: 0.2, pitchRange: 0.12 },
  world_hit: { files: ['world_hit.ogg', 'world_wood.ogg'], volume: 0.4, pitchRange: 0.1 },
  ui_click: { files: ['empty_click.ogg'], volume: 0.25, pitchRange: 0.05 },
}

class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true
  private volume = 0.55
  private buffers = new Map<string, AudioBuffer>()
  private loading: Promise<void> | null = null

  /** Call from a user gesture (click to play) so the browser unlocks audio. */
  init() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
      this.loading = this.preloadAll()
    } catch {
      this.ctx = null
    }
  }

  /** Ensure context is running (resume after autoplay policy). */
  async ensureRunning() {
    this.init()
    if (this.ctx?.state === 'suspended') {
      try {
        await this.ctx.resume()
      } catch {
        /* ignore */
      }
    }
    if (this.loading) await this.loading
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    if (this.master) this.master.gain.value = this.volume
  }

  getVolume() {
    return this.volume
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!on && this.ctx) void this.ctx.suspend()
    else if (on && this.ctx) void this.ctx.resume()
  }

  isEnabled() {
    return this.enabled
  }

  toggleEnabled() {
    this.setEnabled(!this.enabled)
  }

  private async preloadAll() {
    const files = new Set<string>()
    for (const def of Object.values(SAMPLE_MAP)) {
      for (const f of def.files) files.add(f)
    }
    await Promise.all([...files].map((f) => this.loadFile(f)))
  }

  private async loadFile(name: string) {
    if (!this.ctx || this.buffers.has(name)) return
    try {
      const res = await fetch(`/sounds/${name}`)
      if (!res.ok) return
      const raw = await res.arrayBuffer()
      const buf = await this.ctx.decodeAudioData(raw.slice(0))
      this.buffers.set(name, buf)
    } catch {
      // Missing file — play() will fall back to synth
    }
  }

  /**
   * Play a named game sound. Optional pan relative to player (world X).
   * Falls back to a short synth if the sample is not loaded yet.
   */
  play(
    soundType: SoundType,
    options?: { panX?: number; panZ?: number; volume?: number; rate?: number },
  ) {
    if (!this.enabled) return
    if (!this.ctx || !this.master) {
      // Lazy init if a gesture already happened elsewhere
      this.init()
      if (!this.ctx || !this.master) return
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()

    const def = SAMPLE_MAP[soundType]
    if (!def) return

    const candidates = def.files.filter((f) => this.buffers.has(f))
    if (candidates.length > 0) {
      const file = candidates[Math.floor(Math.random() * candidates.length)]!
      this.playBuffer(file, def, options)
      if (def.synthLayer) this.playSynthBurst(soundType, options)
      return
    }

    // Fallback: procedural
    this.playSynthFallback(soundType, options)
  }

  private playBuffer(
    file: string,
    def: SampleDef,
    options?: { panX?: number; panZ?: number; volume?: number; rate?: number },
  ) {
    const ctx = this.ctx!
    const master = this.master!
    const buffer = this.buffers.get(file)
    if (!buffer) return

    const src = ctx.createBufferSource()
    src.buffer = buffer
    const pitchRange = def.pitchRange ?? 0.08
    const rate =
      options?.rate ?? 1 + (Math.random() * 2 - 1) * pitchRange
    src.playbackRate.value = Math.max(0.5, Math.min(2, rate))

    const gain = ctx.createGain()
    const vol = (def.volume ?? 0.5) * (options?.volume ?? 1)
    gain.gain.value = vol

    const panner = ctx.createStereoPanner()
    if (options?.panX !== undefined) {
      panner.pan.value = Math.max(-1, Math.min(1, options.panX / 40))
    }

    src.connect(gain)
    gain.connect(panner)
    panner.connect(master)
    src.start(0)
  }

  /** Short noise+tone under gun samples for more punch */
  private playSynthBurst(
    soundType: SoundType,
    options?: { panX?: number; volume?: number },
  ) {
    const ctx = this.ctx!
    const master = this.master!
    const now = ctx.currentTime
    const duration = soundType.includes('shotgun') ? 0.18 : soundType.includes('smg') ? 0.06 : 0.12

    const noiseLen = Math.floor(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < noiseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 1.8)
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const ng = ctx.createGain()
    ng.gain.setValueAtTime(0.35 * (options?.volume ?? 1), now)
    ng.gain.exponentialRampToValueAtTime(0.001, now + duration)

    const panner = ctx.createStereoPanner()
    if (options?.panX !== undefined) {
      panner.pan.value = Math.max(-1, Math.min(1, options.panX / 40))
    }

    noise.connect(ng)
    ng.connect(panner)
    panner.connect(master)
    noise.start(now)
  }

  private playSynthFallback(
    soundType: SoundType,
    options?: { panX?: number; panZ?: number; volume?: number },
  ) {
    const ctx = this.ctx!
    const master = this.master!
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner()

    const presets: Record<string, { f: number; d: number; type: OscillatorType; v: number }> = {
      gunshot: { f: 140, d: 0.14, type: 'sawtooth', v: 0.45 },
      gunshot_smg: { f: 180, d: 0.06, type: 'sawtooth', v: 0.35 },
      gunshot_shotgun: { f: 90, d: 0.2, type: 'sawtooth', v: 0.55 },
      gunshot_pistol: { f: 160, d: 0.12, type: 'sawtooth', v: 0.4 },
      empty: { f: 320, d: 0.05, type: 'square', v: 0.15 },
      pump: { f: 80, d: 0.25, type: 'triangle', v: 0.3 },
      lever: { f: 100, d: 0.22, type: 'triangle', v: 0.28 },
      reload: { f: 70, d: 0.2, type: 'triangle', v: 0.25 },
      equip: { f: 90, d: 0.2, type: 'triangle', v: 0.22 },
      melee: { f: 200, d: 0.1, type: 'sawtooth', v: 0.35 },
      zombie_hit: { f: 110, d: 0.12, type: 'sawtooth', v: 0.3 },
      zombie_death: { f: 55, d: 0.4, type: 'sawtooth', v: 0.35 },
      zombie_groan: { f: 70, d: 0.8, type: 'sine', v: 0.2 },
      pickup: { f: 420, d: 0.15, type: 'sine', v: 0.25 },
      buy: { f: 500, d: 0.2, type: 'sine', v: 0.25 },
      door: { f: 45, d: 0.5, type: 'triangle', v: 0.25 },
      footstep: { f: 90, d: 0.08, type: 'triangle', v: 0.12 },
      world_hit: { f: 150, d: 0.1, type: 'triangle', v: 0.25 },
      ui_click: { f: 600, d: 0.04, type: 'sine', v: 0.15 },
    }
    const p = presets[soundType] ?? { f: 200, d: 0.1, type: 'square' as OscillatorType, v: 0.2 }

    osc.type = p.type
    osc.frequency.value = p.f * (0.92 + Math.random() * 0.16)
    gain.gain.setValueAtTime(p.v * (options?.volume ?? 1), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + p.d)

    if (options?.panX !== undefined) {
      panner.pan.value = Math.max(-1, Math.min(1, options.panX / 40))
    }

    osc.connect(gain)
    gain.connect(panner)
    panner.connect(master)
    osc.start(now)
    osc.stop(now + p.d)

    if (soundType.startsWith('gunshot') || soundType === 'melee') {
      this.playSynthBurst(soundType, options)
    }
  }
}

export const audioManager = new AudioManager()

/** Map weapon id → fire sound */
export function fireSoundForWeapon(weaponId: string): SoundType {
  if (weaponId === 'pump_shotgun' || weaponId === 'double_barrel') return 'gunshot_shotgun'
  if (weaponId === 'mp40') return 'gunshot_smg'
  if (weaponId === 'revolver') return 'gunshot_pistol'
  if (weaponId === 'fist' || weaponId === 'pitchfork') return 'melee'
  return 'gunshot'
}
