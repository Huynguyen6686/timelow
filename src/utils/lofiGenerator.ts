/**
 * Procedural Lo-Fi Ambient Focus Sound Generator
 * Generates cozy ambient sounds entirely inside the browser using the Web Audio API. This avoids any asset fetch failures!
 * Features:
 *  - Soft Rain/Wind Rumbling: Low-passed modulated white noise.
 *  - Vinyl Record Crackle: Algorithmic click impulses.
 *  - Cozy Tape Pad Chords: Low-passed warm synths playing nostalgic jazz chords with gentle pitch warble (wow and flutter).
 */

class LofiGenerator {
  private ctx: AudioContext | null = null;
  private primaryGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainLFO: OscillatorNode | null = null;
  private crackleSource: AudioBufferSourceNode | null = null;
  private chordsInterval: number | null = null;
  private activeNotes: { oscs: OscillatorNode[]; gain: GainNode }[] = [];
  private isGenerating = false;

  constructor() {}

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public start() {
    if (this.isGenerating) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const ctx = this.ctx;
      this.isGenerating = true;

      // Primary gain node to control overall volume smoothly
      this.primaryGain = ctx.createGain();
      this.primaryGain.gain.setValueAtTime(0, ctx.currentTime);
      // Fade in master volume beautifully
      this.primaryGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 1.5);
      this.primaryGain.connect(ctx.destination);

      // --- 1. Soft Rain Generation ---
      const noiseBuffer = this.createNoiseBuffer(ctx, 3);
      this.rainSource = ctx.createBufferSource();
      this.rainSource.buffer = noiseBuffer;
      this.rainSource.loop = true;

      this.rainFilter = ctx.createBiquadFilter();
      this.rainFilter.type = 'lowpass';
      this.rainFilter.frequency.setValueAtTime(450, ctx.currentTime);
      this.rainFilter.Q.setValueAtTime(1.0, ctx.currentTime);

      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.08, ctx.currentTime); // keep rain soft

      // Connect Rain: Source -> Filter -> Gain -> Primary
      this.rainSource.connect(this.rainFilter);
      this.rainFilter.connect(rainGain);
      rainGain.connect(this.primaryGain);

      // Modulate Rain intensity with a slow breathing LFO (0.07Hz) to sound like organic wind
      this.rainLFO = ctx.createOscillator();
      this.rainLFO.frequency.setValueAtTime(0.07, ctx.currentTime);
      const rainLFOGain = ctx.createGain();
      rainLFOGain.gain.setValueAtTime(100, ctx.currentTime); // modulate frequency up and down by 100Hz

      this.rainLFO.connect(rainLFOGain);
      rainLFOGain.connect(this.rainFilter.frequency);

      this.rainSource.start(0);
      this.rainLFO.start(0);

      // --- 2. Vinyl Crackle Static ---
      const crackleBuffer = this.createCrackleBuffer(ctx, 5);
      this.crackleSource = ctx.createBufferSource();
      this.crackleSource.buffer = crackleBuffer;
      this.crackleSource.loop = true;

      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(0.12, ctx.currentTime); // soft record surface noise

      this.crackleSource.connect(crackleGain);
      crackleGain.connect(this.primaryGain);
      this.crackleSource.start(0);

      // --- 3. Warm Retro Tape Pad Chords ---
      // Progression: IVmaj9 -> Imaj9 -> bVIImaj9 -> vi7 (Soft, elegant jazz mood)
      const progressions = [
        [174.61, 261.63, 329.63, 440.00, 523.25], // Fmaj9 (F3, C4, E4, A4, C5)
        [130.81, 196.00, 246.94, 329.63, 392.00], // Cmaj9 (C3, G3, B3, E4, G4)
        [116.54, 185.00, 233.08, 293.66, 349.23], // Bbmaj9 (Bb2, Gb3, Bb3, D4, F4)
        [110.00, 164.81, 220.00, 261.63, 329.63]  // Am7 (A2, E3, A3, C4, E4)
      ];

      let progIdx = 0;
      const playNextProgression = () => {
        if (!this.isGenerating || !this.ctx || !this.primaryGain) return;
        const now = this.ctx.currentTime;
        const freqs = progressions[progIdx];
        progIdx = (progIdx + 1) % progressions.length;

        // Clean up previous active nodes that might have finished playing
        this.activeNotes = this.activeNotes.filter((group) => {
          // If notes are completed, we can filter them out
          return true;
        });

        const chordGain = this.ctx.createGain();
        chordGain.gain.setValueAtTime(0, now);
        // Soft, gorgeous fade-in over 2.5 seconds
        chordGain.gain.linearRampToValueAtTime(0.045, now + 2.5);
        // Sustain for a while, then slow fade-out
        chordGain.gain.setValueAtTime(0.045, now + 6.0);
        chordGain.gain.exponentialRampToValueAtTime(0.0001, now + 9.5);

        const chordFilter = this.ctx.createBiquadFilter();
        chordFilter.type = 'lowpass';
        chordFilter.frequency.setValueAtTime(550, now);

        chordFilter.connect(this.primaryGain);
        chordGain.connect(chordFilter);

        const oscs: OscillatorNode[] = [];

        // Tape wobble effect (Wow and Flutter): pitch warbles slightly 
        const tapeLFO = this.ctx.createOscillator();
        tapeLFO.frequency.setValueAtTime(4.2, now); // 4.2Hz speed
        const tapeLFOGain = this.ctx.createGain();
        tapeLFOGain.gain.setValueAtTime(0.8, now); // slight detuning depth

        tapeLFO.connect(tapeLFOGain);
        tapeLFO.start(now);

        freqs.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          osc.type = 'triangle'; // warm warm brass/flute like woodwind warmth
          osc.frequency.setValueAtTime(freq, now);

          // Connect detune module to simulate vintage cassette warping
          tapeLFOGain.connect(osc.detune);

          osc.connect(chordGain);
          osc.start(now);
          osc.stop(now + 10);
          oscs.push(osc);
        });

        // Store active notes so they can be aggressively cut off if stopped prematurely
        const noteGroup = { oscs, gain: chordGain };
        this.activeNotes.push(noteGroup);

        // Schedule LFO and tape oscillators shutdown
        setTimeout(() => {
          try {
            tapeLFO.stop();
            tapeLFO.disconnect();
            tapeLFOGain.disconnect();
          } catch (e) {
            // silent catch
          }
        }, 10000);
      };

      // Play first chord immediately
      playNextProgression();
      // Repeating loop every 9.5 seconds so there's a lovely continuous breathing flow
      const intervalId = window.setInterval(playNextProgression, 9500);
      this.chordsInterval = intervalId as any;

    } catch (e) {
      console.error('Failed to initiate custom Lo-Fi noise generator:', e);
    }
  }

  public stop() {
    if (!this.isGenerating) return;
    this.isGenerating = false;

    const ctx = this.ctx;
    if (ctx && this.primaryGain) {
      const now = ctx.currentTime;
      try {
        // Smooth slide-out fade so sound doesn't clip or end abruptly
        this.primaryGain.gain.setValueAtTime(this.primaryGain.gain.value, now);
        this.primaryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      } catch (err) {
        // silent catch
      }
    }

    // Delayed absolute cut-off of active audio nodes to support smooth fade-out
    setTimeout(() => {
      this.cleanupNodes();
    }, 900);
  }

  private cleanupNodes() {
    try {
      if (this.rainSource) {
        this.rainSource.stop();
        this.rainSource.disconnect();
        this.rainSource = null;
      }
      if (this.rainLFO) {
        this.rainLFO.stop();
        this.rainLFO.disconnect();
        this.rainLFO = null;
      }
      if (this.rainFilter) {
        this.rainFilter.disconnect();
        this.rainFilter = null;
      }
      if (this.crackleSource) {
        this.crackleSource.stop();
        this.crackleSource.disconnect();
        this.crackleSource = null;
      }
      if (this.chordsInterval) {
        clearInterval(this.chordsInterval);
        this.chordsInterval = null;
      }

      this.activeNotes.forEach((group) => {
        try {
          group.oscs.forEach((osc) => {
            osc.stop();
            osc.disconnect();
          });
          group.gain.disconnect();
        } catch (e) {
          // ignore
        }
      });
      this.activeNotes = [];

      if (this.primaryGain) {
        this.primaryGain.disconnect();
        this.primaryGain = null;
      }
    } catch (e) {
      console.warn('Silent cleanup error:', e);
    }
  }

  // Create high-fidelity pink-infused white noise buffer for rain Simulation
  private createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink filter algorithm (refined Voss-McCartney noise)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      
      // Keep it controlled and add some soft white-noise rain texture
      data[i] = pink * 0.11; 
    }
    return buffer;
  }

  // Create vinyl crackles and clicks simulation buffer
  private createCrackleBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // 1. Very faint white noise floor for dust
      let val = (Math.random() * 2 - 1) * 0.004;

      // 2. High-amplitude click impulses occurring very occasionally
      if (Math.random() < 0.0003) {
        // Generate a fast-decay spike
        const decayLength = Math.floor(Math.random() * 80) + 20;
        const spikeDirection = Math.random() < 0.5 ? 1 : -1;
        for (let j = 0; j < decayLength && (i + j) < bufferSize; j++) {
          const envelope = Math.exp(-j / 8); 
          data[i + j] += spikeDirection * (Math.random() * 0.15 + 0.1) * envelope;
        }
        i += decayLength; // Fast-forward past the impulse to prevent overlapping same clicks
      } else {
        data[i] = val;
      }
    }
    return buffer;
  }
}

export const lofiGenerator = new LofiGenerator();
