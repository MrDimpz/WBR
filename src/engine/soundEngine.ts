/**
 * Pure procedural Web Audio API arcade sound synthesizer.
 * Zero external MP3/WAV dependencies — works 100% offline.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private unlocked: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.unlocked = true;
    return this.ctx;
  }

  public unlock(): void {
    if (!this.unlocked) {
      this.ensureContext();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /** Soft bubbly rising pop when a viewer joins */
  public playJoin(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.085);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  /** Rising marimba / arcade chime (pitch increases subtly with wave combo) */
  public playSafe(combo: number = 0): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const semitoneBoost = Math.min(combo, 12);
    const baseFreq = 523.25 * Math.pow(2, semitoneBoost / 24); // C5 climbing smoothly

    const notes = [baseFreq, baseFreq * 1.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.055;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  /** Low muted buzzer thud for TAKEN! or INVALID! */
  public playError(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.linearRampToValueAtTime(102, now + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  /** Crisp woodblock/clock tick for final 3 seconds */
  public playTick(urgent: boolean = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(urgent ? 1180 : 880, now);
    osc.frequency.exponentialRampToValueAtTime(urgent ? 640 : 480, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(urgent ? 0.2 : 0.13, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Mechanical tick for slot machine rule spin */
  public playSlotTick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(720 + Math.random() * 180, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  /** Filtered white-noise boom + sub-bass drop for wave eliminations */
  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1) Sub-bass punch drop
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(135, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.42);

    subGain.gain.setValueAtTime(0.32, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.5);

    // 2) Filtered white noise burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.14));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.42);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.26, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
  }

  /** Classic 4-note arcade fanfare arpeggio for Round Champion */
  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C5 -> E5 -> G5 -> C6
    const notes = [
      { freq: 523.25, offset: 0, dur: 0.13 },
      { freq: 659.25, offset: 0.11, dur: 0.13 },
      { freq: 783.99, offset: 0.22, dur: 0.13 },
      { freq: 1046.5, offset: 0.34, dur: 0.52 },
    ];

    notes.forEach(({ freq, offset, dur }) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + offset;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq * 0.5, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      const subMix = ctx.createGain();
      subMix.gain.value = 0.25;

      osc.connect(gain);
      osc2.connect(subMix);
      subMix.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc2.start(start);
      osc.stop(start + dur + 0.02);
      osc2.stop(start + dur + 0.02);
    });
  }

  /** Rising synth sweep for Total Wipeout Revive */
  public playRevive(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  /** Crisp coin / unlock chime for Avatar Store */
  public playPurchase(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [987.77, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.075;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }
}

export const soundEngine = new SoundEngine();
