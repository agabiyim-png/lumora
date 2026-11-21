/* LUMORA — prosedürel ses motoru (Web Audio). Hiçbir harici ses dosyası gerekmez. */
(function () {
  'use strict';
  const L = window.L;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Biyom müzik ayarları: kök nota, dizi, akor ilerleyişi (dizi dereceleri)
  const MOODS = [
    { root: 50, scale: [0, 2, 4, 7, 9], prog: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], bpm: 84 },   // orman: D maj7 hissi
    { root: 45, scale: [0, 3, 5, 7, 10], prog: [[0, 3, 7, 10], [8, 12, 15, 19], [5, 8, 12, 15], [3, 7, 10, 14]], bpm: 78 },   // mağara: A minör
    { root: 48, scale: [0, 2, 4, 7, 11], prog: [[0, 4, 7, 14], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 18]], bpm: 72 },   // batık bahçe: C lidya
    { root: 52, scale: [0, 2, 3, 7, 9], prog: [[0, 3, 7, 14], [10, 14, 17, 21], [8, 12, 15, 19], [7, 10, 14, 17]], bpm: 92 }, // zirve: E dorian
  ];

  const A = {
    ctx: null,
    ready: false,
    music: null,
    _lastCollect: 0,
    mood: 0,
    intensity: 0,
    targetIntensity: 0,
    musicOn: true,
    sfxOn: true,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ctx.destination);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.0;
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.8;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);

      // Yankı (üretilmiş dürtü yanıtı)
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(2.8, 2.2);
      this.revSend = ctx.createGain();
      this.revSend.gain.value = 0.55;
      this.revSend.connect(this.reverb).connect(this.master);

      // Gecikme (müzik için)
      this.delay = ctx.createDelay(1.5);
      this.delay.delayTime.value = 0.36;
      const fb = ctx.createGain();
      fb.gain.value = 0.38;
      const dl = ctx.createBiquadFilter();
      dl.type = 'lowpass';
      dl.frequency.value = 2400;
      this.delay.connect(dl).connect(fb).connect(this.delay);
      this.delaySend = ctx.createGain();
      this.delaySend.gain.value = 0.3;
      this.delaySend.connect(this.delay);
      dl.connect(this.musicBus);

      this.noiseBuf = this._noise(1.5);
      this.ready = true;
      this.applySettings();
    },

    unlock() {
      this.init();
      if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
    },

    suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
    resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },

    applySettings() {
      const s = L.save.data.settings;
      this.musicOn = s.music;
      this.sfxOn = s.sfx;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(t);
      this.musicBus.gain.setTargetAtTime(this.musicOn && this.music ? 0.5 : 0, t, 0.4);
      this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 0.8 : 0, t, 0.05);
    },

    _impulse(sec, decay) {
      const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * sec);
      const buf = ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    },
    _noise(sec) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    },

    // ---- temel ses yapı taşları ----
    _tone(freq, t, dur, opt) {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = opt.type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opt.slide), t + dur);
      if (opt.detune) o.detune.value = opt.detune;
      const a = opt.attack || 0.005, v = opt.vol || 0.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = g;
      if (opt.filter) {
        const f = ctx.createBiquadFilter();
        f.type = opt.filter.type || 'lowpass';
        f.frequency.setValueAtTime(opt.filter.freq, t);
        if (opt.filter.to) f.frequency.exponentialRampToValueAtTime(opt.filter.to, t + dur);
        f.Q.value = opt.filter.q || 0.7;
        g.connect(f);
        node = f;
      }
      o.connect(g);
      node.connect(opt.bus || this.sfxBus);
      if (opt.rev) {
        const s = ctx.createGain();
        s.gain.value = opt.rev;
        node.connect(s).connect(this.revSend);
      }
      if (opt.dly) {
        const s = ctx.createGain();
        s.gain.value = opt.dly;
        node.connect(s).connect(this.delaySend);
      }
      o.start(t);
      o.stop(t + dur + 0.05);
    },
    _noiseHit(t, dur, opt) {
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = opt.type || 'lowpass';
      f.frequency.setValueAtTime(opt.freq || 1200, t);
      if (opt.to) f.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
      f.Q.value = opt.q || 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(opt.vol || 0.3, t + (opt.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(opt.bus || this.sfxBus);
      if (opt.rev) {
        const s = ctx.createGain();
        s.gain.value = opt.rev;
        g.connect(s).connect(this.revSend);
      }
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.05);
    },
    _bell(freq, t, vol, dur, rev) {
      this._tone(freq, t, dur, { type: 'sine', vol, rev: rev == null ? 0.5 : rev });
      this._tone(freq * 2.01, t, dur * 0.5, { type: 'sine', vol: vol * 0.35, rev: rev == null ? 0.5 : rev });
      this._tone(freq * 3.98, t, dur * 0.25, { type: 'sine', vol: vol * 0.12 });
    },

    get ok() { return this.ready && this.sfxOn && this.ctx.state === 'running'; },

    // ---- oyun sesleri ----
    collect(combo) {
      if (!this.ok) return;
      const now = this.ctx.currentTime;
      if (now - this._lastCollect < 0.035) return;
      this._lastCollect = now;
      const m = MOODS[this.mood];
      const idx = Math.min(combo, 19);
      const deg = m.scale[idx % 5] + 12 * Math.floor(idx / 5);
      this._bell(mtof(m.root + 24 + deg), now, 0.09, 0.6, 0.35);
    },
    amber() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._bell(mtof(96), t, 0.07, 0.5);
      this._bell(mtof(103), t + 0.06, 0.06, 0.6);
    },
    hit() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._noiseHit(t, 0.35, { freq: 900, to: 120, vol: 0.5 });
      this._tone(140, t, 0.4, { type: 'sine', vol: 0.5, slide: 0.35 });
      this._tone(73, t, 0.5, { type: 'triangle', vol: 0.25, slide: 0.5, filter: { freq: 600 } });
    },
    pop() {
      if (!this.ok) return;
      this._tone(240, this.ctx.currentTime, 0.14, { type: 'triangle', vol: 0.07, slide: 0.45 });
    },
    lose() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      [62, 58, 55, 50].forEach((n, i) => this._tone(mtof(n), t + i * 0.22, 0.9, { type: 'triangle', vol: 0.14, rev: 0.6, filter: { freq: 1400, to: 300 } }));
      this._noiseHit(t, 1.4, { freq: 600, to: 80, vol: 0.2, attack: 0.3, rev: 0.5 });
    },
    flare() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._noiseHit(t, 0.9, { type: 'bandpass', freq: 300, to: 6000, vol: 0.35, q: 2, rev: 0.6 });
      this._tone(110, t, 0.8, { type: 'sine', vol: 0.45, slide: 0.4 });
      const m = MOODS[this.mood];
      [0, 7, 12, 16, 19, 24].forEach((d, i) => this._bell(mtof(m.root + 24 + d), t + 0.05 + i * 0.045, 0.05, 1.2));
    },
    purify() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(mtof(84 + ((Math.random() * 5) | 0) * 2), t, 0.4, { type: 'triangle', vol: 0.05, slide: 1.5, rev: 0.6 });
    },
    powerup() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      const m = MOODS[this.mood];
      [0, 4, 7, 12, 16, 19, 24].forEach((d, i) => this._tone(mtof(m.root + 12 + d), t + i * 0.04, 0.35, { type: 'square', vol: 0.045, filter: { freq: 3000 }, rev: 0.4 }));
    },
    cocoon() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._noiseHit(t, 0.25, { type: 'highpass', freq: 2000, vol: 0.25 });
      const m = MOODS[this.mood];
      [0, 4, 7, 11].forEach((d) => this._bell(mtof(m.root + 24 + d), t + 0.02, 0.06, 1.4));
    },
    lantern(i) {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      const m = MOODS[this.mood];
      const deg = m.scale[i % 5] + 12 * Math.floor(i / 5);
      this._bell(mtof(m.root + 12 + deg), t, 0.11, 1.6, 0.7);
    },
    star(i) {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      const m = MOODS[this.mood];
      const base = m.root + 24 + [0, 4, 7][i];
      [0, 7, 12].forEach((d, k) => this._bell(mtof(base + d), t + k * 0.03, 0.09, 2.0, 0.8));
      this._noiseHit(t, 0.6, { type: 'highpass', freq: 5000, vol: 0.08, rev: 0.6 });
    },
    win() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      const m = MOODS[this.mood];
      const chords = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [12, 16, 19, 24]];
      chords.forEach((c, i) => c.forEach((d) => this._tone(mtof(m.root + 12 + d), t + i * 0.28, 1.6, { type: 'triangle', vol: 0.07, attack: 0.02, rev: 0.7, filter: { freq: 2600 } })));
    },
    warn() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) this._tone(55, t + i * 0.32, 0.28, { type: 'sawtooth', vol: 0.12, filter: { freq: 300 } });
    },
    whoosh() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._noiseHit(t, 0.7, { type: 'bandpass', freq: 400, to: 2400, vol: 0.18, attack: 0.15, q: 1.5 });
    },
    click() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(mtof(88), t, 0.12, { type: 'sine', vol: 0.08 });
      this._tone(mtof(95), t + 0.03, 0.12, { type: 'sine', vol: 0.05 });
    },
    back() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(mtof(83), t, 0.12, { type: 'sine', vol: 0.07 });
      this._tone(mtof(76), t + 0.04, 0.14, { type: 'sine', vol: 0.05 });
    },
    golden() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      [0, 4, 7, 12, 16, 19, 24, 28].forEach((d, i) => this._bell(mtof(72 + d), t + i * 0.05, 0.06, 1.0));
    },
    achievement() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      [76, 83, 88].forEach((n, i) => this._bell(mtof(n), t + i * 0.09, 0.08, 1.5, 0.7));
    },
    buy() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._bell(mtof(91), t, 0.08, 0.5);
      this._bell(mtof(98), t + 0.07, 0.08, 0.8);
      this._noiseHit(t, 0.15, { type: 'highpass', freq: 6000, vol: 0.08 });
    },


    // ---- v2: savaş ve kutlama sesleri ----
    crack(p) {
      if (!this.ok) return;
      const t = this.ctx.currentTime, k = p || 1;
      this._noiseHit(t, 0.12, { type: 'highpass', freq: 3500, vol: 0.18 });
      this._tone(1800 * k + Math.random() * 300, t, 0.15, { type: 'triangle', vol: 0.05, slide: 0.6 });
      this._tone(2600 * k, t + 0.01, 0.1, { type: 'sine', vol: 0.04 });
    },
    shatter(n) {
      if (!this.ok) return;
      const now = this.ctx.currentTime;
      if (now - (this._lastShat || 0) < 0.05) return;
      this._lastShat = now;
      const k = Math.min(n || 1, 8);
      this._noiseHit(now, 0.4, { type: 'highpass', freq: 2500, vol: 0.2 + k * 0.02, rev: 0.4 });
      for (let i = 0; i < 4; i++) this._tone(mtof(84 + i * 3 + k * 2 + Math.random() * 3), now + i * 0.025, 0.35, { type: 'triangle', vol: 0.04, rev: 0.5 });
      this._tone(160 - k * 6, now, 0.25, { type: 'sine', vol: 0.18, slide: 0.4 });
    },
    zap() {
      if (!this.ok) return;
      const now = this.ctx.currentTime;
      if (now - (this._lastZap || 0) < 0.06) return;
      this._lastZap = now;
      this._tone(1400 + Math.random() * 200, now, 0.12, { type: 'square', vol: 0.025, slide: 0.35, filter: { freq: 3500 } });
    },
    thunder() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._noiseHit(t, 0.5, { type: 'bandpass', freq: 3000, to: 400, vol: 0.32, q: 0.8, rev: 0.5 });
      this._tone(90, t, 0.5, { type: 'sawtooth', vol: 0.12, slide: 0.5, filter: { freq: 500 } });
      for (let i = 0; i < 3; i++) this._noiseHit(t + 0.04 * i, 0.05, { type: 'highpass', freq: 5000, vol: 0.15 });
    },
    chest() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(180, t, 0.2, { type: 'triangle', vol: 0.15, slide: 1.6 });
      const m = MOODS[this.mood];
      [0, 4, 7, 11, 14, 19].forEach((d, i) => this._bell(mtof(m.root + 24 + d), t + 0.15 + i * 0.05, 0.06, 1.2));
    },
    rare() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => this._bell(mtof(n), t + i * 0.06, 0.07, 1.6, 0.8));
      [60, 64, 67].forEach((n) => this._tone(mtof(n), t + 0.4, 1.8, { type: 'triangle', vol: 0.07, attack: 0.05, rev: 0.8, filter: { freq: 2400 } }));
      this._noiseHit(t, 1.2, { type: 'highpass', freq: 6000, vol: 0.06, attack: 0.3, rev: 0.7 });
    },
    roar() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(70, t, 1.1, { type: 'sawtooth', vol: 0.18, slide: 0.6, attack: 0.08, filter: { freq: 380, to: 160 } });
      this._tone(104, t, 1.0, { type: 'sawtooth', vol: 0.1, slide: 0.55, attack: 0.1, filter: { freq: 500 } });
      this._noiseHit(t, 1.0, { freq: 500, to: 120, vol: 0.2, attack: 0.1 });
    },
    bossShot() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._tone(320, t, 0.25, { type: 'triangle', vol: 0.08, slide: 0.5 });
    },
    bossDown() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._noiseHit(t, 2.2, { freq: 2000, to: 80, vol: 0.5, rev: 0.8 });
      this._tone(60, t, 2, { type: 'sine', vol: 0.5, slide: 0.4 });
      const m = MOODS[this.mood];
      const chords = [[0, 4, 7], [5, 9, 12], [7, 11, 14, 19], [12, 16, 19, 24]];
      chords.forEach((c, i) => c.forEach((d) => this._tone(mtof(m.root + 12 + d), t + 0.6 + i * 0.32, 2.2, { type: 'triangle', vol: 0.07, attack: 0.03, rev: 0.8, filter: { freq: 3000 } })));
      [0, 7, 12, 16, 19, 24, 28, 31].forEach((d, i) => this._bell(mtof(m.root + 24 + d), t + 1.9 + i * 0.07, 0.06, 2));
    },
    firework() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      this._noiseHit(t, 0.6, { freq: 1600, to: 200, vol: 0.22, rev: 0.6 });
      for (let i = 0; i < 5; i++) this._noiseHit(t + 0.15 + Math.random() * 0.4, 0.04, { type: 'highpass', freq: 6000, vol: 0.08 });
    },
    zone() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      const m = MOODS[this.mood];
      [0, 7, 12, 16].forEach((d, i) => this._bell(mtof(m.root + 12 + d), t + i * 0.12, 0.05, 2.2, 0.9));
    },
    secret() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 12; i++) this._bell(mtof(67 + [0, 2, 4, 7, 9][i % 5] + 12 * Math.floor(i / 5)), t + i * 0.045, 0.05, 1.4, 0.8);
    },
    unlock() {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      [[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]].forEach((c, i) => c.forEach((n) => this._tone(mtof(n), t + i * 0.35, 1.8, { type: 'triangle', vol: 0.06, attack: 0.03, rev: 0.8 })));
      [84, 88, 91, 96].forEach((n, i) => this._bell(mtof(n), t + 1.05 + i * 0.08, 0.07, 2));
    },

    // ---- jeneratif müzik ----
    startMusic(mood) {
      this.init();
      if (!this.ctx) return;
      this.mood = mood || 0;
      if (this.music) return this.applySettings();
      this.music = { step: 0, next: this.ctx.currentTime + 0.1 };
      this.applySettings();
      const tick = () => {
        if (!this.music) return;
        if (this.ctx.state === 'running') this._schedule();
        this.music.timer = setTimeout(tick, 60);
      };
      tick();
    },
    setMood(m) { this.mood = m; },
    stopMusic() {
      if (!this.music) return;
      clearTimeout(this.music.timer);
      this.music = null;
      this.applySettings();
    },
    _schedule() {
      const ctx = this.ctx, mu = this.music;
      this.intensity += (this.targetIntensity - this.intensity) * 0.08;
      while (mu.next < ctx.currentTime + 0.25) {
        const m = MOODS[this.mood];
        const spb = 60 / m.bpm / 2; // sekizlik nota
        const t = mu.next;
        const s = mu.step;
        const bar = Math.floor(s / 8);
        const chord = m.prog[bar % 4];
        const bus = this.musicBus;
        if (s % 16 === 0) {
          // pad akoru
          chord.forEach((d, i) => {
            const f = mtof(m.root + d);
            this._tone(f, t, spb * 16, { type: 'triangle', vol: 0.028, attack: 1.2, bus, rev: 0.5, filter: { freq: 900 }, detune: i % 2 ? 7 : -7 });
            this._tone(f * 2, t, spb * 14, { type: 'sine', vol: 0.012, attack: 1.6, bus, rev: 0.6 });
          });
          this._tone(mtof(m.root - 12 + chord[0]), t, spb * 15, { type: 'sine', vol: 0.07, attack: 0.4, bus });
        }
        // arpej (olasılıksal, sakin ama canlı)
        const arpP = 0.35 + this.intensity * 0.5;
        if (Math.random() < arpP && (s % 2 === 0 || this.intensity > 0.4)) {
          const d = chord[(Math.random() * chord.length) | 0] + (Math.random() < 0.5 ? 12 : 24);
          this._tone(mtof(m.root + d), t, 0.9, { type: 'triangle', vol: 0.035, bus, dly: 0.8, rev: 0.3, filter: { freq: 3200 } });
        }
        // gerilim katmanı: nabız bas ve hi-hat
        if (this.intensity > 0.35) {
          if (s % 4 === 0) this._tone(mtof(m.root - 24 + chord[0]), t, spb * 1.6, { type: 'sawtooth', vol: 0.05 * this.intensity, bus, filter: { freq: 380, to: 120 } });
          if (s % 2 === 1) this._noiseHit(t, 0.05, { type: 'highpass', freq: 8000, vol: 0.03 * this.intensity, bus });
        }
        if (this.intensity > 0.65 && s % 8 === 0) this._tone(120, t, 0.3, { type: 'sine', vol: 0.18 * this.intensity, slide: 0.3, bus });
        mu.step++;
        mu.next += spb;
      }
    },
  };

  L.audio = A;
})();
