import { StorageManager } from '../utils/StorageManager.js';

// Procedural Web Audio: all SFX and music are synthesized, no audio files.
// init() must be called from a user gesture (autoplay policy).
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.muted = StorageManager.getMuted();
    this.intensity = 0;
    this.musicTimer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);

    // 1s of white noise, reused by every noise-based SFX
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // per-layer music gains (faded, never hard-switched)
    this.layerGains = {};
    for (const name of ['bass', 'arp', 'hat', 'lead']) {
      const g = this.ctx.createGain();
      g.gain.value = name === 'bass' ? 0.5 : 0;
      g.connect(this.musicGain);
      this.layerGains[name] = g;
    }
  }

  // ------------------------------------------------------------ helpers

  osc(type, freq, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(dest);
    return o;
  }

  envGain(dest) {
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(dest);
    return g;
  }

  noise(dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.connect(dest);
    return src;
  }

  // ---------------------------------------------------------------- SFX

  playJump(chainCount = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.envGain(this.sfxGain);
    // random +-1 semitone plus a slight step up per chained jump
    const variation = Math.pow(2, (Math.random() * 2 - 1) / 12)
      * Math.pow(2, Math.min(chainCount, 6) / 24);
    const o = this.osc('square', 300 * variation, g);
    o.frequency.exponentialRampToValueAtTime(600 * variation, t + 0.08);
    g.gain.linearRampToValueAtTime(0.25, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.start(t);
    o.stop(t + 0.15);
  }

  playDash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1;
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(3000, t + 0.1);
    filter.frequency.linearRampToValueAtTime(800, t + 0.3);

    const g = this.envGain(this.sfxGain);
    filter.connect(g);
    g.gain.linearRampToValueAtTime(0.5, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + 0.3);

    const n = this.noise(filter);
    n.start(t);
    n.stop(t + 0.32);
  }

  playBreak() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // filtered noise crash
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    const gN = this.envGain(this.sfxGain);
    filter.connect(gN);
    gN.gain.linearRampToValueAtTime(0.8, t + 0.005);
    gN.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    const n = this.noise(filter);
    n.start(t);
    n.stop(t + 0.45);

    // low sine thump
    const gT = this.envGain(this.sfxGain);
    const thump = this.osc('sine', 120, gT);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    gT.gain.linearRampToValueAtTime(0.6, t + 0.005);
    gT.gain.linearRampToValueAtTime(0, t + 0.2);
    thump.start(t);
    thump.stop(t + 0.22);
  }

  playSqueal() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    const g = this.envGain(this.sfxGain);
    filter.connect(g);

    const o = this.osc('sawtooth', 900, filter);
    o.frequency.linearRampToValueAtTime(1400, t + 0.12);
    o.frequency.linearRampToValueAtTime(450, t + 0.35);

    // vibrato for the cartoon cry
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 30;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);

    g.gain.linearRampToValueAtTime(0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.start(t); lfo.start(t);
    o.stop(t + 0.42); lfo.stop(t + 0.42);
  }

  playDeathSting() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.linearRampToValueAtTime(300, t + 1.2);
    filter.connect(this.sfxGain);

    // "wah-wah-waaah": three descending notes, last one droops
    const notes = [[330, 0, 0.22], [294, 0.25, 0.22], [262, 0.5, 0.8]];
    notes.forEach(([freq, offset, dur], i) => {
      const g = this.envGain(filter);
      for (const detune of [-8, 8]) {
        const o = this.osc('sawtooth', freq, g);
        o.detune.value = detune;
        if (i === 2) o.frequency.linearRampToValueAtTime(131, t + offset + 0.4);
        o.start(t + offset);
        o.stop(t + offset + dur + 0.05);
      }
      g.gain.linearRampToValueAtTime(0.2, t + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + dur);
    });
  }

  playFanfare() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.36]];
    notes.forEach(([freq, offset]) => {
      const g = this.envGain(this.sfxGain);
      const o = this.osc('triangle', freq, g);
      g.gain.linearRampToValueAtTime(0.3, t + offset + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.2);
      o.start(t + offset);
      o.stop(t + offset + 0.22);
    });
    // closing chord
    for (const freq of [523, 659, 784]) {
      const g = this.envGain(this.sfxGain);
      const o = this.osc('triangle', freq, g);
      g.gain.linearRampToValueAtTime(0.2, t + 0.57);
      g.gain.setValueAtTime(0.2, t + 1.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
      o.start(t + 0.55);
      o.stop(t + 1.4);
    }
  }

  // --------------------------------------------------------------- music
  // Lookahead scheduler ("Tale of Two Clocks"): the interval only schedules;
  // audio timing runs on ctx.currentTime so a busy tab never stutters.

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.musicGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.1);
    this.musicTimer = setInterval(() => this.tick(), 25);
  }

  stopMusic() {
    if (!this.musicTimer) return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.ctx) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  setIntensity(r) {
    this.intensity = r;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.layerGains.arp.gain.setTargetAtTime(r > 0.25 ? (r - 0.25) * 0.4 : 0, t, 0.1);
    this.layerGains.hat.gain.setTargetAtTime(r > 0.5 ? 0.25 : 0, t, 0.1);
    this.layerGains.lead.gain.setTargetAtTime(r > 0.8 ? 0.15 : 0, t, 0.1);
  }

  tick() {
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextNoteTime);
      const bpm = 90 + this.intensity * 60;
      this.nextNoteTime += (60 / bpm) / 4; // 16th notes
      this.step = (this.step + 1) % 16;
    }
  }

  scheduleStep(step, t) {
    // A-minor: bass pulse
    const bassSteps = this.intensity > 0.5
      ? [0, 2, 4, 6, 8, 10, 12, 14]
      : [0, 4, 8, 12];
    if (bassSteps.includes(step)) {
      this.pluck('triangle', 55, 0.5, 0.15, t, this.layerGains.bass);
    }

    // arpeggio A3-C4-E4-A4 on even 16ths
    if (step % 2 === 0) {
      const arpNotes = [220, 261.6, 329.6, 440];
      const note = arpNotes[(step / 2) % 4];
      this.pluck('triangle', note, 0.5, 0.12, t, this.layerGains.arp);
      this.pluck('triangle', note * 2, 0.5, 0.12, t, this.layerGains.lead);
    }

    // hi-hat ticks on offbeats
    if ([2, 6, 10, 14].includes(step)) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6000;
      const g = this.envGain(this.layerGains.hat);
      hp.connect(g);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      const n = this.noise(hp);
      n.start(t);
      n.stop(t + 0.04);
    }
  }

  pluck(type, freq, peak, dur, t, dest) {
    const g = this.envGain(dest);
    const o = this.osc(type, freq, g);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // ---------------------------------------------------------------- mute

  toggleMute() {
    this.muted = !this.muted;
    StorageManager.setMuted(this.muted);
    if (this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }

  bindMuteButton(el) {
    if (!el) return;
    el.textContent = this.muted ? '🔇' : '🔊';
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggleMute();
      el.textContent = this.muted ? '🔇' : '🔊';
      el.blur();
    });
  }
}
