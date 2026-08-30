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

  // Abaixa a música na pausa (e devolve ao voltar). 0.5 é o valor de init().
  duckMusic(on) {
    if (!this.ctx || !this.musicGain) return;
    this.musicGain.gain.value = on ? 0.1 : 0.5;
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
    // Em FÚRIA TOTAL as quebras saem em cadeia: sem esta janela, 3 no mesmo
    // frame somam ganho 2.4 no sfxGain e clipam audível. 80ms não muda nada
    // no jogo normal (nunca há duas quebras tão juntas fora do especial).
    if (this._lastBreakT && this.ctx.currentTime - this._lastBreakT < 0.08) return;
    this._lastBreakT = this.ctx.currentTime;
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

  // Trovão da tempestade: estalo agudo curto + rugido grave longo. Mesmo
  // molde procedural do resto (nada de sample).
  playThunder() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const crack = this.ctx.createBiquadFilter();
    crack.type = 'highpass';
    crack.frequency.setValueAtTime(1800, t);
    crack.frequency.exponentialRampToValueAtTime(300, t + 0.25);
    const gC = this.envGain(this.sfxGain);
    crack.connect(gC);
    gC.gain.linearRampToValueAtTime(0.45, t + 0.008);
    gC.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    const nC = this.noise(crack);
    nC.start(t); nC.stop(t + 0.32);

    // Rugido: ruído grave que demora a morrer. O buffer de ruído tem 1s
    // (ver init) — passar disso daria silêncio no fim, então o rugido cabe
    // dentro dessa janela.
    const rumble = this.ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.setValueAtTime(260, t);
    rumble.frequency.exponentialRampToValueAtTime(60, t + 0.85);
    const gR = this.envGain(this.sfxGain);
    rumble.connect(gR);
    gR.gain.linearRampToValueAtTime(0.5, t + 0.12);
    gR.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
    const nR = this.noise(rumble);
    nR.start(t); nR.stop(t + 0.98);
  }

  // Passagem sob o arco de um setor novo: "whoosh" grave ascendente
  playSectorPass() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 0.45);
    filter.Q.value = 1.2;
    const g = this.envGain(this.sfxGain);
    filter.connect(g);
    g.gain.linearRampToValueAtTime(0.35, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    const n = this.noise(filter);
    n.start(t); n.stop(t + 0.6);
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

  // "Thwip" pneumático do dardo tranquilizante: sopro de ruído curto
  // + sine descendente (nada de sample, como todo o resto)
  playDart() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(2500, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.12);
    const gN = this.envGain(this.sfxGain);
    filter.connect(gN);
    gN.gain.linearRampToValueAtTime(0.35, t + 0.01);
    gN.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    const n = this.noise(filter);
    n.start(t);
    n.stop(t + 0.15);

    const g = this.envGain(this.sfxGain);
    const o = this.osc('sine', 900, g);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    g.gain.linearRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.start(t);
    o.stop(t + 0.14);
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

  // Medidor de fúria encheu (v1.7): arpejo curto subindo — um "está pronto"
  // que não compete com a música. Molde do playFanfare, pela metade.
  playFuryReady() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [[440, 0], [554, 0.08], [659, 0.16], [880, 0.24]];
    notes.forEach(([freq, offset]) => {
      const g = this.envGain(this.sfxGain);
      const o = this.osc('triangle', freq, g);
      g.gain.linearRampToValueAtTime(0.25, t + offset + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.18);
      o.start(t + offset);
      o.stop(t + offset + 0.2);
    });
  }

  // Fim da FÚRIA TOTAL: o fogo apaga — chiado descendo + suspiro grave.
  playFizzle() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.5);
    const gN = this.envGain(this.sfxGain);
    filter.connect(gN);
    gN.gain.linearRampToValueAtTime(0.35, t + 0.02);
    gN.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    const n = this.noise(filter);
    n.start(t);
    n.stop(t + 0.6);

    const gT = this.envGain(this.sfxGain);
    const o = this.osc('sine', 220, gT);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.4);
    gT.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gT.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.start(t);
    o.stop(t + 0.5);
  }

  // Estalo seco do rifle do caçador (boss v1.7): mais agressivo que o
  // "thwip" pneumático da torre — o jogador precisa distinguir de ouvido
  playRifleShot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const crack = this.ctx.createBiquadFilter();
    crack.type = 'highpass';
    crack.frequency.setValueAtTime(2600, t);
    crack.frequency.exponentialRampToValueAtTime(500, t + 0.09);
    const gC = this.envGain(this.sfxGain);
    crack.connect(gC);
    gC.gain.linearRampToValueAtTime(0.5, t + 0.004);
    gC.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    const n = this.noise(crack);
    n.start(t);
    n.stop(t + 0.12);

    const g = this.envGain(this.sfxGain);
    const o = this.osc('square', 700, g);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    g.gain.linearRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.start(t);
    o.stop(t + 0.12);
  }

  // Quique no portão blindado sem quebrar nada: CLANG metálico — parciais
  // inarmônicas detunadas (timbre de metal) + impacto curto de ruído
  // v1.10 "Escola do Rino": o "tec" da investida NEGADA — grave, 70ms,
  // inconfundível com o whoosh do dash. A negação era silenciosa e 64% dos
  // toques eram negados: o cooldown que ninguém vê é cooldown que ninguém
  // aprende. É linguagem, não punição.
  playDenyTick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = this.envGain(this.sfxGain);
    const o = this.osc('square', 110, g);
    g.gain.linearRampToValueAtTime(0.12, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.start(t);
    o.stop(t + 0.09);
  }

  playClang() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    for (const [freq, peak] of [[210, 0.3], [333, 0.22], [527, 0.16], [842, 0.1]]) {
      const g = this.envGain(this.sfxGain);
      const o = this.osc('triangle', freq, g);
      o.detune.value = Math.random() * 14 - 7;
      g.gain.linearRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t);
      o.stop(t + 0.4);
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1;
    filter.frequency.value = 1800;
    const gN = this.envGain(this.sfxGain);
    filter.connect(gN);
    gN.gain.linearRampToValueAtTime(0.3, t + 0.004);
    gN.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    const n = this.noise(filter);
    n.start(t);
    n.stop(t + 0.1);
  }

  // Sting de entrada da arena do boss: quinta grave em sawtooth subindo
  // meio tom (tensão) sobre um rufo de ruído grave
  playBossHorn() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    for (const freq of [98, 147]) {
      const g = this.envGain(this.sfxGain);
      for (const detune of [-6, 6]) {
        const o = this.osc('sawtooth', freq, g);
        o.detune.value = detune;
        o.frequency.linearRampToValueAtTime(freq * 1.06, t + 0.7);
        o.start(t);
        o.stop(t + 0.95);
      }
      g.gain.linearRampToValueAtTime(0.2, t + 0.05);
      g.gain.setValueAtTime(0.2, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    }

    const rumble = this.ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.value = 200;
    const gR = this.envGain(this.sfxGain);
    rumble.connect(gR);
    gR.gain.linearRampToValueAtTime(0.35, t + 0.1);
    gR.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    const n = this.noise(rumble);
    n.start(t);
    n.stop(t + 0.9);
  }

  // ------------------------------------------- v1.8.7 — Estado de Alerta

  // Sting de entrada de área: 3 notas no molde do playFuryReady, com
  // caráter próprio por área. `n` é o ÍNDICE DA ÁREA em CITY_DISTRICTS
  // (v1.8.10: o array V está ALINHADO 1:1 com a tabela — 0 subúrbio,
  // 1 vidro, 2 contenção, 3 brecha (placeholder: sem flash, nunca toca),
  // 4..8 as cinco etapas do deserto; 9+ (deserto profundo, sem flash)
  // clampa na última). Cidade: subúrbio grave/lento, vidro brilhante,
  // contenção em terça menor. Deserto: quintas vazias e modo eólio — o
  // vazio que engole (duna aberta, oásis cintilante, escavação de trabalho,
  // Vale monumental, Necrópole grave e fúnebre).
  playAreaSting(n) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const V = [
      { type: 'sine',     gap: 0.22, dur: 0.36, peak: 0.26, notes: [147, 175, 196] },
      { type: 'triangle', gap: 0.09, dur: 0.18, peak: 0.26, notes: [523, 659, 784] },
      { type: 'sawtooth', gap: 0.14, dur: 0.26, peak: 0.13, notes: [220, 262, 311] },
      // 3 — Brecha: placeholder de alinhamento (a Brecha não tem flash, o
      // switchArea nunca chama; se chamar um dia, um eco neutro do subúrbio)
      { type: 'sine',     gap: 0.2,  dur: 0.3,  peak: 0.2,  notes: [196, 247, 294] },
      // 4 — duna: quinta vazia D–A–D, lenta e grave (a estrada some)
      { type: 'sine',     gap: 0.26, dur: 0.44, peak: 0.24, notes: [147, 220, 294] },
      // 5 — oásis: eólio de Lá (A–C–E), cintilante como miragem
      { type: 'triangle', gap: 0.11, dur: 0.2,  peak: 0.24, notes: [440, 523, 659] },
      // 6 — escavação: quinta vazia G–D com sétima (G–D–F), áspera
      { type: 'sawtooth', gap: 0.15, dur: 0.26, peak: 0.12, notes: [196, 294, 349] },
      // 7 — Vale dos Faraós: quinta+oitava F–C–F, monumental
      { type: 'triangle', gap: 0.18, dur: 0.34, peak: 0.26, notes: [175, 262, 349] },
      // 8 — Necrópole: eólio grave descendo ao chão (E–B–E baixo), fúnebre
      { type: 'sawtooth', gap: 0.24, dur: 0.42, peak: 0.11, notes: [165, 123, 82] },
    ];
    const v = V[Math.max(0, Math.min(V.length - 1, n | 0))];
    v.notes.forEach((freq, i) => {
      const off = i * v.gap;
      const g = this.envGain(this.sfxGain);
      const o = this.osc(v.type, freq, g);
      g.gain.linearRampToValueAtTime(v.peak, t + off + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + v.dur);
      o.start(t + off);
      o.stop(t + off + v.dur + 0.03);
    });
  }

  // Sirene curta do Viaduto do Centro (~0,8s, 2 alternâncias hi-lo): um
  // presságio, não um alerta — mais curta e mais baixa que qualquer SFX de
  // perigo real. Rampas curtas entre os degraus para soar sirene, não teremim.
  playSirenShort() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    const g = this.envGain(this.sfxGain);
    filter.connect(g);
    const o = this.osc('sawtooth', 660, filter);
    [[880, 0.06], [880, 0.2], [660, 0.26], [660, 0.4],
     [880, 0.46], [880, 0.6], [660, 0.66], [660, 0.78]]
      .forEach(([f, dt]) => o.frequency.linearRampToValueAtTime(f, t + dt));
    g.gain.linearRampToValueAtTime(0.2, t + 0.04);
    g.gain.setValueAtTime(0.2, t + 0.64);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.82);
    o.start(t);
    o.stop(t + 0.85);
  }

  // Klaxon do Checkpoint da Contenção: buzina grave DUPLA — duas rajadas de
  // um par dissonante de sawtooth detunado (o "bééé-bééé" de barreira).
  playKlaxon() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const off of [0, 0.34]) {
      for (const freq of [98, 123.5]) {
        const g = this.envGain(this.sfxGain);
        for (const detune of [-7, 7]) {
          const o = this.osc('sawtooth', freq, g);
          o.detune.value = detune;
          o.start(t + off);
          o.stop(t + off + 0.3);
        }
        g.gain.linearRampToValueAtTime(0.15, t + off + 0.02);
        g.gain.setValueAtTime(0.15, t + off + 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.28);
      }
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
