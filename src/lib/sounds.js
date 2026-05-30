const STORAGE_KEY = 'ks_sound_enabled'

let enabled = localStorage.getItem(STORAGE_KEY) !== 'false'

class SoundEngine {
  ctx = null

  ensureCtx() {
    if (!enabled) return null
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  tone(freq, duration, type = 'sine', volume = 0.12, when = 0) {
    const ctx = this.ensureCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime + when)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime + when)
    osc.stop(ctx.currentTime + when + duration + 0.05)
  }

  noise(duration = 0.08, volume = 0.06) {
    const ctx = this.ensureCtx()
    if (!ctx) return

    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(ctx.destination)
    source.start()
  }

  click() {
    this.tone(920, 0.04, 'square', 0.06)
  }

  correct() {
    this.tone(523, 0.08, 'sine', 0.1)
    this.tone(784, 0.12, 'sine', 0.08, 0.06)
  }

  wrong() {
    this.tone(180, 0.15, 'sawtooth', 0.1)
    this.noise(0.06, 0.05)
  }

  win() {
    ;[523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, 'sine', 0.1, i * 0.1))
  }

  loot() {
    this.tone(440, 0.1, 'triangle', 0.1)
    this.tone(660, 0.1, 'triangle', 0.1, 0.08)
    this.tone(880, 0.2, 'triangle', 0.12, 0.16)
  }

  keyUse() {
    this.tone(330, 0.06, 'square', 0.08)
    this.tone(550, 0.1, 'sine', 0.1, 0.05)
    this.tone(880, 0.15, 'sine', 0.1, 0.12)
  }
}

export const sfx = new SoundEngine()

export function isSoundEnabled() {
  return enabled
}

export function setSoundEnabled(value) {
  enabled = value
  localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
}

export function playClick() {
  sfx.click()
}
