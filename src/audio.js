// Motor de audio híbrido:
// 1. Si el usuario carga un MP3/OGG/WAV (o existe assets/music/theme.mp3), lo reproduce en bucle.
// 2. Si no, sintetiza un tema synthwave/chiptune ochentero con bajo octavado, percusión y melodía épica.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.chargeOsc = null;
    this.chargeGain = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bossMode = false;
    this.stage = 1;

    // Reproductor para pista MP3/OGG personalizada de la serie
    this.customAudio = null;
    this.customTrackName = null;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.customAudio) {
      this.customAudio.muted = muted;
    }
    if (muted) {
      this.stopCharge();
      this.stopBgm();
    }
  }

  setBossMode(enabled) {
    this.bossMode = enabled;
  }

  setStage(stage) {
    this.stage = stage;
  }

  playSplitToggle(split) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = split ? [280, 440, 660] : [660, 440, 280];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const t = now + i * 0.04;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  playVictoryFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [440, 523.25, 659.25, 880, 783.99, 880];
    const times = [0, 0.14, 0.28, 0.44, 0.62, 0.76];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      const t = now + times[i];
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  loadCustomTrack(fileOrUrl, label = "Pista personalizada") {
    this.stopBgm();
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio = null;
    }
    const url = typeof fileOrUrl === "string" ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.42;
    audio.muted = this.muted;
    this.customAudio = audio;
    this.customTrackName = label;
    if (!this.muted) {
      audio.play().catch(() => {});
    }
  }

  clearCustomTrack() {
    if (this.customAudio) {
      this.customAudio.pause();
      this.customAudio = null;
    }
    this.customTrackName = null;
  }

  playLaser(level = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = level >= 3 ? "square" : "sawtooth";
    osc.frequency.setValueAtTime(740 + level * 60, now);
    osc.frequency.exponentialRampToValueAtTime(185, now + 0.085);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  playPowerUp() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.085, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  playWarning() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.36;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(290, t + 0.28);
      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.31);
    }
  }

  updateCharge(ratio) {
    if (this.muted || ratio <= 0.08) {
      this.stopCharge();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (!this.chargeOsc) {
      this.chargeOsc = ctx.createOscillator();
      this.chargeGain = ctx.createGain();
      this.chargeOsc.type = "triangle";
      this.chargeGain.gain.setValueAtTime(0.01, now);
      this.chargeOsc.connect(this.chargeGain).connect(ctx.destination);
      this.chargeOsc.start(now);
    }
    const freq = 180 + ratio * 720;
    this.chargeOsc.frequency.setTargetAtTime(freq, now, 0.02);
    this.chargeGain.gain.setTargetAtTime(0.03 + ratio * 0.05, now, 0.02);
  }

  stopCharge() {
    if (this.chargeOsc && this.ctx) {
      try {
        this.chargeOsc.stop();
        this.chargeOsc.disconnect();
        this.chargeGain.disconnect();
      } catch (_) {
        // Ignorar si ya estaba detenido
      }
    }
    this.chargeOsc = null;
    this.chargeGain = null;
  }

  playWaveCannon(power) {
    this.stopCharge();
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    sub.type = "square";
    osc.frequency.setValueAtTime(540 + power * 380, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.36);
    sub.frequency.setValueAtTime(170, now);
    sub.frequency.exponentialRampToValueAtTime(50, now + 0.36);

    gain.gain.setValueAtTime(0.13 + power * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.37);

    osc.connect(gain);
    sub.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    sub.start(now);
    osc.stop(now + 0.38);
    sub.stop(now + 0.38);
  }

  playPodToggle(attached) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(attached ? 340 : 640, now);
    osc.frequency.exponentialRampToValueAtTime(attached ? 720 : 280, now + 0.11);
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playShieldBlock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1040, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.055);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playExplosion(big = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = big ? 0.48 : 0.19;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(big ? 920 : 1450, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(big ? 0.2 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  playKick(ctx, now) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(132, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.11);
    gain.gain.setValueAtTime(0.095, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.125);
  }

  playSnare(ctx, now) {
    const dur = 0.09;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1200, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  playHiHat(ctx, now) {
    const dur = 0.032;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6500, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.024, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  playPadChord(ctx, now, freqs) {
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, now);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, now);
      gain.gain.setValueAtTime(0.002, now);
      gain.gain.linearRampToValueAtTime(0.015, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
      osc.connect(filter).connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.18);
    }
  }

  startBgm() {
    if (this.muted) return;

    // Si hay pista MP3 cargada, reproducirla en lugar del sinte
    if (this.customAudio) {
      this.customAudio.play().catch(() => {});
      return;
    }

    if (this.bgmTimer) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Progresión Fase 1 (Ep.1 Cíclope: heroico disco-synth en Am)
    const chordsStage1 = [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [196, 246.94, 293.66],
      [164.81, 196, 246.94],
    ];
    // Progresión Fase 2 (Ep.2 Zotra: misterioso/cristalino en Em)
    const chordsStage2 = [
      [164.81, 196, 246.94],
      [130.81, 164.81, 196],
      [146.83, 185, 220],
      [123.47, 146.83, 185],
    ];
    const chordsBoss = [
      [220, 261.63, 329.63],
      [233.08, 293.66, 349.23],
    ];

    const bassStage1 = [
      110, 220, 110, 220, 110, 220, 110, 220,
      87.31, 174.61, 87.31, 174.61, 87.31, 174.61, 87.31, 174.61,
      98, 196, 98, 196, 98, 196, 98, 196,
      82.41, 164.81, 82.41, 164.81, 98, 196, 110, 220,
    ];
    const leadStage1 = [
      440, 0, 523.25, 0, 659.25, 0, 587.33, 523.25,
      440, 0, 349.23, 0, 440, 0, 523.25, 0,
      392, 0, 493.88, 0, 587.33, 0, 523.25, 493.88,
      329.63, 0, 392, 0, 440, 493.88, 523.25, 0,
    ];

    const bassStage2 = [
      82.41, 164.81, 82.41, 164.81, 98, 196, 82.41, 164.81,
      65.41, 130.81, 65.41, 130.81, 73.42, 146.83, 65.41, 130.81,
      73.42, 146.83, 73.42, 146.83, 82.41, 164.81, 73.42, 146.83,
      61.74, 123.47, 73.42, 146.83, 82.41, 164.81, 98, 196,
    ];
    const leadStage2 = [
      659.25, 587.33, 493.88, 0, 659.25, 783.99, 739.99, 0,
      523.25, 493.88, 392, 0, 523.25, 659.25, 587.33, 0,
      587.33, 523.25, 440, 0, 587.33, 739.99, 659.25, 0,
      493.88, 0, 587.33, 0, 659.25, 0, 783.99, 0,
    ];

    const bossBass = [
      110, 110, 220, 110, 116.54, 110, 220, 110,
      130.81, 110, 220, 110, 123.47, 110, 196, 110,
    ];
    const bossLead = [
      440, 0, 466.16, 440, 587.33, 0, 523.25, 466.16,
      440, 0, 329.63, 0, 392, 440, 466.16, 392,
    ];

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const step = this.bgmStep++;

      const bArr = this.bossMode ? bossBass : this.stage === 2 ? bassStage2 : bassStage1;
      const lArr = this.bossMode ? bossLead : this.stage === 2 ? leadStage2 : leadStage1;
      const bFreq = bArr[step % bArr.length];
      const lFreq = lArr[step % lArr.length];

      // Pad de cuerdas espaciales cada 8 pasos (1 compás)
      if (step % 8 === 0) {
        const cArr = this.bossMode ? chordsBoss : this.stage === 2 ? chordsStage2 : chordsStage1;
        this.playPadChord(ctx, now, cArr[Math.floor(step / 8) % cArr.length]);
      }

      // Ritmo disco-rock espacial: Bombo (0, 4), Caja (2, 6), Hi-Hat en impares
      const beat = step % 8;
      if (beat === 0 || beat === 4) {
        this.playKick(ctx, now);
      } else if (beat === 2 || beat === 6) {
        this.playSnare(ctx, now);
      } else {
        this.playHiHat(ctx, now);
      }

      // Bajo octavado Moog con filtro resonante
      const bass = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const bGain = ctx.createGain();
      bass.type = "sawtooth";
      bass.frequency.setValueAtTime(bFreq * 0.5, now);
      filter.type = "lowpass";
      filter.Q.setValueAtTime(4.5, now);
      filter.frequency.setValueAtTime(this.bossMode ? 580 : 480, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.14);
      bGain.gain.setValueAtTime(0.05, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      bass.connect(filter).connect(bGain).connect(ctx.destination);
      bass.start(now);
      bass.stop(now + 0.16);

      // Lead brass-synth doble (con ligero detune ochentero)
      if (lFreq > 0) {
        for (const detune of [-5, 5]) {
          const lead = ctx.createOscillator();
          const lGain = ctx.createGain();
          lead.type = detune < 0 ? "sawtooth" : "square";
          lead.frequency.setValueAtTime(lFreq, now);
          lead.detune.setValueAtTime(detune, now);
          lGain.gain.setValueAtTime(0.016, now);
          lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
          lead.connect(lGain).connect(ctx.destination);
          lead.start(now);
          lead.stop(now + 0.27);
        }
      }
    }, 150);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.customAudio) {
      this.customAudio.pause();
    }
  }
}

export const sound = new SoundEngine();
