import { JutsuType } from '../types/jutsu';

class JutsuSoundEngine {
  private ctx: AudioContext | null = null;
  private activeOsc: OscillatorNode | null = null;
  private activeGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private currentJutsu: JutsuType = 'none';

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public stopLoop() {
    if (this.activeOsc) {
      try {
        this.activeOsc.stop();
        this.activeOsc.disconnect();
      } catch {
        // ignore already stopped
      }
      this.activeOsc = null;
    }
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch {
        // ignore already stopped
      }
      this.noiseNode = null;
    }
    if (this.activeGain) {
      this.activeGain.disconnect();
      this.activeGain = null;
    }
    this.currentJutsu = 'none';
  }

  public setActiveJutsu(jutsu: JutsuType, enabled: boolean) {
    if (!enabled || jutsu === 'none') {
      this.stopLoop();
      return;
    }
    if (this.currentJutsu === jutsu) return;

    this.stopLoop();
    this.currentJutsu = jutsu;

    const ctx = this.ensureContext();
    if (!ctx) return;

    if (jutsu === 'shadow-clone') {
      this.playPoof(ctx);
      return;
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      jutsu === 'rasengan' ? 0.055 : 0.04,
      ctx.currentTime + 0.25
    );
    gain.connect(ctx.destination);
    this.activeGain = gain;

    const osc = ctx.createOscillator();
    osc.type = jutsu === 'rasengan' ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(
      jutsu === 'rasengan' ? 145 : 220,
      ctx.currentTime
    );

    // Subtle filter for warm chakra / electric buzz
    const filter = ctx.createBiquadFilter();
    filter.type = jutsu === 'rasengan' ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(
      jutsu === 'rasengan' ? 420 : 1850,
      ctx.currentTime
    );
    filter.Q.setValueAtTime(jutsu === 'rasengan' ? 2 : 5, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    osc.start();
    this.activeOsc = osc;
  }

  private playPoof(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.09));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.32);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  public playShutter(enabled: boolean) {
    if (!enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.085);
  }
}

export const soundEngine = new JutsuSoundEngine();
