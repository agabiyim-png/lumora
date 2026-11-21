/* LUMORA — oyun çekirdeği: güncelleme, çarpışma, ışık, kamera, seviye sonu */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;
  const Art = L.Art;
  const TAU = U.TAU;

  const PURIFIABLE = { wisp: 1, moth: 1, jelly: 1, meteor: 1 };
  const HAZARD = { wisp: 1, moth: 1, jelly: 1, meteor: 1, wheel: 1, vine: 1, orb: 1 };
  const LANTERNS = 24;
  const HAZ_LAYER = { vine: 1, wisp: 1, moth: 1, wheel: 1, jelly: 1, meteor: 1, web: 1, orb: 1 };

  class Game {
    constructor(opts) {
      this.opts = opts;
      this.demo = !!opts.demo;
      this.endless = !!opts.endless;
      this.levelIndex = opts.levelIndex == null ? -1 : opts.levelIndex;
      this.level = this.levelIndex >= 0 ? L.LEVELS[this.levelIndex] : null;
      this.biome = this.level ? this.level.biome : opts.biome || 0;
      this.W = opts.W;
      this.H = opts.H;
      this.t = 0;
      this.state = 'play';
      this.ents = [];
      this.parts = [];
      this._pool = [];
      this.texts = [];
      this.swarm = [];
      this.cam = { y: 0, shake: 0, sx: 0, sy: 0 };
      this.timeScale = 1;
      this.hitStop = 0;
      this.flash = 0;
      this.flashCol = '#ff3355';
      this.windT = 0;
      this.chase = null;
      this.meteorQueue = [];
      this.motes = [];
      this.paused = false;
      this.hintQueue = [];

      const sd = L.save.data;
      const up = sd.upgrades;
      this.skin = L.SKINS.find((s) => s.id === sd.skins.selected) || L.SKINS[0];
      this.magnetR = 52 * (1 + up.magnet * 0.18);
      this.flareRate = 1 + up.flare * 0.15;
      this.shieldDur = 5 + up.shield * 1.5;
      this.amberMul = 1 + up.amber * 0.12;

      this.lumi = { sx: this.W / 2, sy: this.H * 0.68, x: this.W / 2, y: 0, vx: 0, vy: 0, inv: 0, blink: 0, blinkT: 2, mood: 'idle', moodT: 0, shield: 0, magnet: 0, prism: 0, slow: 0, dead: 0, alpha: 1, power: 0 };
      this.target = { x: this.lumi.sx, y: this.lumi.sy };
      this.flare = { charge: this.demo ? 0 : 0.35, active: false, r: 0, x: 0, y: 0, hit: new Set() };
      this.run = { collected: 0, purified: 0, amber: 0, hits: 0, cocoons: 0, maxSwarm: 0, goldens: 0, flares: 0 };
      this.combo = 0;
      this.comboT = 0;

      const speedBase = this.demo ? 30 : 84;
      this.baseSpeed = speedBase + (this.level ? this.level.diff * 46 : 10);

      this.buildBiome(this.biome);
      for (let i = 0; i < 22; i++) this.motes.push(this._mote(true));

      if (!this.demo) {
        const seed = this.endless ? (Date.now() & 0xffff) : 1000 + this.levelIndex * 7919;
        this.gen = new L.Generator(this, { level: this.level, endless: this.endless, seed });
        const start = this.level && this.level.tutorial && !sd.tutorialDone ? 0 : 3 + up.start * 3;
        this.startSparks = start;
        this.gen.potential += start;
        for (let i = 0; i < start; i++) this._addFollower(this.lumi.sx + U.rand(-20, 20), this.H * 0.68 + U.rand(-20, 20));
        if (this.level) {
          this.endY = -this.level.len * this.H;
          this.camEnd = this.endY - this.H * 0.86;
          this.tree = Art.buildTree(this.W, L.BIOMES[this.biome], 77 + this.levelIndex, LANTERNS);
          this.treeBloom = 0;
        }
        this.gen.fill(-this.H * 1.4);
      } else {
        for (let i = 0; i < 46; i++) this._addFollower(this.W / 2 + U.rand(-60, 60), this.H * 0.6 + U.rand(-60, 60));
      }
      this.lumi.y = this.cam.y + this.lumi.sy;
      this.lumi.x = this.lumi.sx;
      L.audio.setMood(this.biome);
      this.initV2();
    }

    // ---------- kurulum ----------
    buildBiome(bi) {
      this.biome = bi;
      this.B = L.BIOMES[bi];
      this.bg = Art.buildBackground(bi, this.W, this.H);
      const g = U.makeCanvas(4, this.H).getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, this.H);
      grd.addColorStop(0, this.B.skyTop);
      grd.addColorStop(1, this.B.skyBot);
      this.skyGrad = grd;
      this.moonSpr = this.B.moon ? this._buildMoon() : null;
      if (this.zc) { this.zoneIdx = -2; this._rebuildSky(); }
      L.audio.setMood(bi);
    }

    _buildMoon() {
      const s = 360;
      const c = U.makeCanvas(s, s);
      const g = c.getContext('2d');
      g.drawImage(Art.glow(this.B.rim, 256), 0, 0, s, s);
      const r = s * 0.16;
      const grd = g.createRadialGradient(s / 2 - r * 0.3, s / 2 - r * 0.3, r * 0.2, s / 2, s / 2, r);
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(0.7, U.mix(this.B.rim, '#ffffff', 0.6));
      grd.addColorStop(1, U.mix(this.B.rim, '#8899aa', 0.4));
      g.fillStyle = grd;
      g.beginPath();
      g.arc(s / 2, s / 2, r, 0, TAU);
      g.fill();
      const rnd = U.rng(5);
      g.fillStyle = 'rgba(80,100,130,0.18)';
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.arc(s / 2 + (rnd() - 0.5) * r * 1.2, s / 2 + (rnd() - 0.5) * r * 1.2, r * (0.08 + rnd() * 0.15), 0, TAU);
        g.fill();
      }
      return c;
    }

    _buildVignette() {
      const c = U.makeCanvas(Math.ceil(this.W / 3), Math.ceil(this.H / 3));
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(this.W / 2, this.H * 0.55, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H * 0.55, Math.max(this.W, this.H) * 0.78);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.42)');
      g.setTransform(c.width / this.W, 0, 0, c.height / this.H, 0, 0);
      g.fillStyle = grd;
      g.fillRect(0, 0, this.W, this.H);
      this.vignette = c;
    }

    _mote(init) {
      return { x: Math.random() * this.W, y: init ? Math.random() * this.H : this.H + 10, vx: U.rand(-8, 8), vy: U.rand(-18, -6), s: U.rand(3, 7), a: U.rand(0.15, 0.45), ph: Math.random() * 6 };
    }

    addEnt(e) {
      e.dead = false;
      if (e.t === 'vine') {
        const v = Art.buildVine(e.pts, e.thick, this.B, e.seed);
        e.img = v;
        let minY = Infinity, maxY = -Infinity;
        for (const p of e.pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
        e.minY = minY - e.thick; e.maxY = maxY + e.thick;
      }
      this.ents.push(e);
      return e;
    }

    _addFollower(x, y) {
      this.swarm.push({ x, y, vx: 0, vy: 0, a: Math.random() * TAU, w: U.rand(0.6, 1.6) * (Math.random() < 0.5 ? 1 : -1), rr: Math.sqrt(Math.random()) * 0.95 + 0.05, k: U.rand(9, 20), tw: Math.random() * 6, c: Math.random() < 0.72 ? 0 : Math.random() < 0.5 ? 1 : 2 });
    }

    // ---------- giriş ----------
    pointer(dx, dy) {
      const slow = this.lumi.slow > 0 ? 0.5 : 1;
      this.target.x = U.clamp(this.target.x + dx * 1.3 * slow, 18, this.W - 18);
      this.target.y = U.clamp(this.target.y + dy * 1.3 * slow, this.H * 0.12, this.H - 40);
      this.moved = (this.moved || 0) + Math.abs(dx) + Math.abs(dy);
    }

    triggerFlare(free) {
      if (this.state !== 'play' && this.state !== 'boss') return false;
      if (!free && this.flare.charge < 1) return false;
      if (!free) this.flare.charge = 0;
      const f = this.flare;
      f.active = true;
      f.r = 10;
      f.x = this.lumi.x;
      f.y = this.lumi.y;
      f.hit.clear();
      f.bossHit = false;
      f.rays = 0;
      this.slowmo = 0.45;
      this.cam.shake = Math.max(this.cam.shake, 14);
      this.flash = 0.85;
      this.flashCol = '#ffffff';
      this.run.flares++;
      L.save.data.stats.flares++;
      L.audio.flare();
      U.vibrate(40);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        this.part(f.x, f.y, Math.cos(a) * 420, Math.sin(a) * 420, 0.7, 26, this.skin.mid, 'glow', 3.5);
      }
      this.parts.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 180, col: '#ffffff', type: 'ring', drag: 0 });
      if (this.ab && this.ab.storm) setTimeout(() => this._castChain(8, 3, 420), 120);
      this.lumi.mood = 'happy';
      this.lumi.moodT = 1;
      return true;
    }

    // ---------- parçacık ve yazı ----------
    part(x, y, vx, vy, life, size, col, type, drag) {
      if (this.parts.length > (L.fx && L.fx.level >= 2 ? 160 : 300)) return;
      const p = this._pool && this._pool.length ? this._pool.pop() : {};
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size; p.col = col;
      p.type = type || 'glow'; p.drag = drag || 2; p.rim = null; p.rot = 0; p.vr = 0;
      p.img = p.type === 'glow' ? Art.glow(col, 64, 0.2) : null;
      this.parts.push(p);
    }
    burst(x, y, n, col, speed, size, life) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
        this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), col, 'glow', 3);
      }
    }
    text(x, y, str, col, size, world) {
      const t = { x, y, str, col, size: size || 18, life: 1.3, max: 1.3, world: world !== false };
      this.texts.push(t);
      if (this.texts.length > 14) this.texts.shift();
      return t;
    }

    // ---------- ana güncelleme ----------
    update(rawDt) {
      if (this.paused) return;
      let dt = Math.min(rawDt, 0.05);
      if (this.hitStop > 0) {
        this.hitStop -= dt;
        dt *= 0.1;
      }
      if (this.slowmo > 0) {
        this.slowmo -= rawDt;
        dt *= 0.35 + 0.65 * (1 - Math.min(1, Math.max(0, this.slowmo) / 0.45));
      }
      this.t += dt;
      const lumi = this.lumi;

      // kamera
      let speed = this.baseSpeed;
      if (this.windT > 0) speed *= 2.0;
      if (this.chase) speed *= 1.22;
      if (this.endless) speed += Math.min(70, -this.cam.y / 260);
      if (this.state === 'play' || this.demo) {
        this.cam.y -= speed * dt;
        if (this.bossCfg && !this.bossDone && !this.boss && this.cam.y <= this.bossCamY) {
          this.cam.y = this.bossCamY;
          this._startBoss();
        }
        if (this.level && this.cam.y <= this.camEnd) {
          this.cam.y = this.camEnd;
          this._beginDelivery();
        }
      } else if (this.state === 'deliver' || this.state === 'results') {
        this.cam.y = U.damp(this.cam.y, this.camEnd, 3, dt);
      }
      if (this.gen) this.gen.fill(this.cam.y - this.H * 1.3);

      // endless biyom geçişi
      if (this.endless) {
        const bi = Math.floor(-this.cam.y / 4200) % 4;
        if (bi !== this.biome) {
          this.buildBiome(bi);
          this.flash = 1;
          this.flashCol = '#ffffff';
          this.text(this.W / 2, this.H * 0.3, this.B.name, '#ffffff', 30, false);
          L.audio.win();
        }
      }

      // Lumi hareketi
      if (this.demo) {
        this.target.x = this.W / 2 + Math.sin(this.t * 0.6) * this.W * 0.28;
        this.target.y = this.H * 0.37 + Math.sin(this.t * 0.9) * this.H * 0.03;
      } else if (this.state === 'deliver' || this.state === 'results') {
        this.target.x = this.W / 2 + Math.sin(this.t * 1.2) * 30;
        this.target.y = this.H * 0.9;
      }
      const px = lumi.x, py = lumi.y;
      lumi.sx = U.damp(lumi.sx, this.target.x, lumi.slow > 0 ? 7 : 20, dt);
      lumi.sy = U.damp(lumi.sy, this.target.y, lumi.slow > 0 ? 7 : 20, dt);
      lumi.x = lumi.sx;
      lumi.y = this.cam.y + lumi.sy;
      if (dt > 0) {
        lumi.vx = U.damp(lumi.vx, (lumi.x - px) / dt, 10, dt);
        lumi.vy = U.damp(lumi.vy, (lumi.y - py) / dt + speed, 10, dt);
      }
      lumi.inv = Math.max(0, lumi.inv - dt);
      lumi.magnet = Math.max(0, lumi.magnet - dt);
      lumi.prism = Math.max(0, lumi.prism - dt);
      lumi.slow = Math.max(0, lumi.slow - dt);
      lumi.moodT -= dt;
      if (lumi.moodT <= 0) lumi.mood = 'idle';
      lumi.blinkT -= dt;
      if (lumi.blinkT <= 0) { lumi.blink = 0.12; lumi.blinkT = U.rand(2, 4.5); }
      lumi.blink = Math.max(0, lumi.blink - dt);
      lumi.power = U.damp(lumi.power, Math.min(1, this.swarm.length / 80), 2, dt);
      this.windT = Math.max(0, this.windT - dt);
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
      this.flash = Math.max(0, this.flash - dt * 2.2);
      this.cam.shake = Math.max(0, this.cam.shake - dt * 30);
      this.flare.charge = Math.min(1, this.flare.charge + dt * (this.state === 'boss' ? 0.045 : 0.012) * this.flareRate * (this.state === 'play' || this.state === 'boss' ? 1 : 0));

      this._updateSwarm(dt);
      if (this.state === 'play' || this.state === 'boss' || this.demo) this._updateEnts(dt);
      this._updateCombat(dt);
      if (this.boss && this.state === 'boss') this.boss.update(this, dt);
      this._updateZones(dt);
      this._updateTrail(dt);
      this._updateSecret(dt);
      this._updateRain(dt);
      this._updateFireworks(dt);
      if (this.flare.active) this._updateFlare(dt);
      this._updateMeteorQueue(dt);
      if (this.chase) this._updateChase(dt);
      if (this.state === 'deliver') this._updateDelivery(dt);
      if (this.state === 'dead') this._updateDeath(dt);
      this._updateParts(dt);

      // müzik yoğunluğu
      let threat = 0;
      for (const e of this.ents) if (HAZARD[e.t] && e.y > this.cam.y && e.y < this.cam.y + this.H) threat++;
      L.audio.targetIntensity = this.chase || this.state === 'boss' || lumi.star > 0 ? 1 : this.windT > 0 || this.secretT > 0 ? 0.7 : U.clamp(threat * 0.15, 0.1, 0.55);

      if (this.swarm.length > this.run.maxSwarm) this.run.maxSwarm = this.swarm.length;
      if (!this.demo && this.level && this.level.tutorial) this._tutorial();
      this._hints();
    }

    _updateSwarm(dt) {
      const lumi = this.lumi;
      const n = this.swarm.length;
      const baseR = 12 + Math.sqrt(n) * 3.8;
      const damp = Math.exp(-5 * dt);
      for (let i = 0; i < n; i++) {
        const f = this.swarm[i];
        f.a += f.w * dt;
        const tx = lumi.x + Math.cos(f.a) * f.rr * baseR;
        const ty = lumi.y + baseR * 0.55 + Math.sin(f.a) * f.rr * baseR * 0.7;
        f.vx += (tx - f.x) * f.k * dt;
        f.vy += (ty - f.y) * f.k * dt;
        f.vx *= damp;
        f.vy *= damp;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
    }

    _collect(e, viaFly) {
      e.dead = true;
      const mult = this.lumi.prism > 0 ? 2 : 1;
      for (let m = 0; m < mult; m++) {
        if (this.swarm.length < 300) this._addFollower(e.x, e.y);
        else this.run.amber += 1; // sürü dolu: taşan ışık kehribara dönüşür
      }
      this.run.collected += mult;
      L.save.data.stats.sparks += mult;
      this.combo++;
      this.comboT = 0.7;
      L.audio.collect(this.combo);
      this.flare.charge = Math.min(1, this.flare.charge + 0.018 * this.flareRate);
      this.burst(e.x, e.y, 4, this.skin.mid, 90, 14, 0.35);
      if (!viaFly && this.combo > 0 && this.combo % 10 === 0) {
        this.text(this.lumi.x, this.lumi.y - 40, `Seri x${this.combo}!`, '#fff3b0', 20);
        this.lumi.mood = 'happy';
        this.lumi.moodT = 0.8;
      }
    }

    hitLumi(src) {
      const lumi = this.lumi;
      if (this.state !== 'play' && this.state !== 'boss') return;
      if (lumi.star > 0) {
        if (src && L.KILLABLE[src.t]) this.purify(src);
        return;
      }
      if (lumi.inv > 0) return;
      if (lumi.shield > 0) {
        lumi.shield--;
        lumi.shieldHit = 1;
        lumi.inv = 0.7;
        if (src && L.KILLABLE[src.t]) this.purify(src);
        this._shards(lumi.x, lumi.y, 10, '#bfe8ff', '#ffffff', 240, 6);
        this.cam.shake = 7;
        this.hitStop = 0.05;
        U.vibrate(35);
        if (lumi.shield <= 0) {
          // kalkan etkileyici bir şekilde paramparça olur
          this._shards(lumi.x, lumi.y, 28, '#9ad8ff', '#ffffff', 380, 10);
          this.parts.push({ x: lumi.x, y: lumi.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 220, col: '#9ad8ff', type: 'ring', drag: 0 });
          this.flash = 0.5; this.flashCol = '#bfe8ff';
          this.text(lumi.x, lumi.y - 40, 'Kalkan kırıldı!', '#bfe8ff', 18);
          L.audio.shatter && L.audio.shatter(6);
        } else L.audio.crack && L.audio.crack(1.4);
        return;
      }
      const n = this.swarm.length;
      this.run.hits++;
      if (n === 0) return this._die();
      const lose = Math.min(n, Math.max(2, Math.ceil(n * 0.2)));
      for (let i = 0; i < lose; i++) {
        const f = this.swarm.pop();
        const a = Math.random() * TAU, s = U.rand(160, 320);
        this.ents.push({ t: 'spark', x: f.x, y: f.y, r: 7, ph: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, scatter: 2.4, grace: 0.45, dead: false });
      }
      lumi.inv = 1.4;
      lumi.mood = 'hurt';
      lumi.moodT = 1;
      this.hitStop = 0.07;
      this.cam.shake = 12;
      this.flash = 0.6;
      this.flashCol = '#ff2a55';
      this.combo = 0;
      L.audio.hit();
      U.vibrate(70);
      this.text(lumi.x, lumi.y - 30, `-${lose}`, '#ff7a9a', 22);
      this.burst(lumi.x, lumi.y, 14, this.B.shadowRim, 220, 22, 0.5);
    }

    _die() {
      this.state = 'dead';
      this.deathT = 0;
      this.lumi.mood = 'hurt';
      L.audio.lose();
      L.audio.targetIntensity = 0;
      U.vibrate(220);
      this.cam.shake = 16;
      this.flash = 1;
      this.flashCol = '#000000';
      this.burst(this.lumi.x, this.lumi.y, 30, this.skin.mid, 260, 26, 1.0);
      L.save.data.stats.deaths++;
    }

    _updateDeath(dt) {
      this.deathT += dt;
      this.lumi.alpha = Math.max(0.15, 1 - this.deathT);
      if (this.deathT > 1.6 && !this.deathShown) {
        this.deathShown = true;
        L.ui.showDeath(this._summary(false));
      }
    }

    purify(e) {
      if (e.dead) return;
      e.dead = true;
      const n = e.t === 'moth' ? 5 : e.t === 'meteor' ? 2 : 3 + Math.round((e.r - 17) / 3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = U.rand(60, 160);
        this.ents.push({ t: 'spark', x: e.x, y: e.y, r: 7, ph: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, fly: 0.25, dead: false });
      }
      this.run.purified++;
      L.save.data.stats.purified++;
      L.audio.purify();
      this.shatter(e, e.t === 'moth' || e.t === 'jelly');
      this.burst(e.x, e.y, 16, '#ffffff', 200, 20, 0.6);
      this.burst(e.x, e.y, 10, this.B.shadowRim, 140, 26, 0.7);
      for (let i = 0; i < 6; i++) this.part(e.x + U.rand(-10, 10), e.y + U.rand(-10, 10), U.rand(-30, 30), U.rand(-80, -30), 1.2, 30, '#20102a', 'smoke', 1);

    }

    _updateEnts(dt) {
      const lumi = this.lumi, W = this.W;
      const top = this.cam.y - 80, bottom = this.cam.y + this.H + 140;
      const magR = this.magnetR * (lumi.magnet > 0 ? 3 : 1);
      const magR2 = magR * magR;
      const LR = 11;
      for (let i = 0; i < this.ents.length; i++) {
        const e = this.ents[i];
        if (e.dead) continue;
        if (e.y > bottom + 300 && e.t !== 'wind') { e.dead = true; continue; }
        if (e.t === 'wind') {
          if (e.y2 < this.cam.y + this.H * 0.2 && e.y2 > top - 200) e.dead = true;
          if (lumi.y < e.y2 && lumi.y > e.y) {
            if (this.windT <= 0) {
              L.audio.whoosh();
              this.text(W / 2, this.H * 0.35, 'Rüzgâr Akımı!', '#bff8ff', 26, false);
              this._hint('wind', 'Rüzgâr akımı seni hızlandırıyor — kıvılcım nehrini yakala!');
            }
            this.windT = 0.3;
          }
          continue;
        }
        const onScreen = e.y > top - 120 && e.y < bottom;
        if (!onScreen && e.t !== 'trigger' && e.t !== 'orb') continue;
        if (e.flash > 0) e.flash -= dt;
        switch (e.t) {
          case 'decor': break;
          case 'chest': this._updateChest(e, dt); break;
          case 'crystal': this._updateCrystal(e, dt); break;
          case 'portal': this._updatePortal(e, dt); break;
          case 'orb': this._updateOrb(e, dt); break;
          case 'spark': {
            if (e.scatter != null) {
              e.scatter -= dt;
              e.grace -= dt;
              e.vx *= Math.exp(-2.5 * dt);
              e.vy *= Math.exp(-2.5 * dt);
              e.x += e.vx * dt;
              e.y += e.vy * dt;
              if (e.scatter <= 0) { e.dead = true; break; }
              if (e.grace > 0) break;
            }
            if (e.fly != null) {
              e.fly -= dt;
              if (e.fly <= 0) {
                const a = U.angleTo(e.x, e.y, lumi.x, lumi.y);
                e.vx = U.damp(e.vx, Math.cos(a) * 520, 6, dt);
                e.vy = U.damp(e.vy, Math.sin(a) * 520, 6, dt);
              } else {
                e.vx *= Math.exp(-3 * dt); e.vy *= Math.exp(-3 * dt);
              }
              e.x += e.vx * dt;
              e.y += e.vy * dt;
              if (U.dist2(e.x, e.y, lumi.x, lumi.y) < 26 * 26) this._collect(e, true);
              break;
            }
            const d2 = U.dist2(e.x, e.y, lumi.x, lumi.y);
            if (d2 < magR2) {
              const d = Math.sqrt(d2) || 1;
              const pull = (1 - d / magR) * 900 + 140;
              e.x += ((lumi.x - e.x) / d) * pull * dt;
              e.y += ((lumi.y - e.y) / d) * pull * dt;
              if (d < 18) this._collect(e);
            }
            break;
          }
          case 'amber': {
            const d2 = U.dist2(e.x, e.y, lumi.x, lumi.y);
            if (d2 < magR2 * 0.7) {
              const d = Math.sqrt(d2) || 1;
              e.x += ((lumi.x - e.x) / d) * 500 * dt;
              e.y += ((lumi.y - e.y) / d) * 500 * dt;
              if (d < 20) {
                e.dead = true;
                this.run.amber += 5;
                L.audio.amber();
                this.text(e.x, e.y - 14, '+5', '#ffc56b', 18);
                this.burst(e.x, e.y, 8, '#ffa63c', 120, 16, 0.5);
              }
            }
            break;
          }
          case 'wisp': {
            e.ph += dt;
            const dx = lumi.x - e.x, dy = lumi.y - e.y;
            const d = Math.hypot(dx, dy) || 1;
            const sp = e.speed * (e.y > this.cam.y ? 1 : 0.3);
            e.x += (dx / d) * sp * dt + Math.sin(e.ph * 2) * 18 * dt;
            e.y += (dy / d) * sp * 0.55 * dt + Math.cos(e.ph * 1.6) * 12 * dt;
            this._hazardTouch(e, e.r * 0.85, dt);
            this._hint('wisp', 'Gölgeler kıvılcımlarını yer! Işık Patlaması ile onları arındır.');
            break;
          }
          case 'moth': {
            e.ph += dt;
            e.timer += dt;
            if (e.state === 'idle') {
              e.x = e.hx + Math.sin(e.ph * 1.7) * 30;
              e.y += Math.sin(e.ph * 2.3) * 20 * dt;
              e.ang = Math.PI / 2;
              if (e.y > this.cam.y + 40 && Math.abs(lumi.y - e.y) < 380) {
                e.state = 'charge';
                e.timer = 0;
                L.audio.warn();
                this._hint('moth', 'Gece güvesi gözleri kızarınca saldırır — kenara kaç!');
              }
            } else if (e.state === 'charge') {
              e.tx = lumi.x; e.ty = lumi.y;
              e.ang = U.angleTo(e.x, e.y, e.tx, e.ty);
              e.x += Math.sin(e.timer * 60) * 1.2;
              if (e.timer > 0.85) {
                e.state = 'dive';
                e.timer = 0;
                e.vx = Math.cos(e.ang) * e.speed;
                e.vy = Math.sin(e.ang) * e.speed;
                L.audio.whoosh();
              }
            } else {
              e.x += e.vx * dt;
              e.y += e.vy * dt;
              if (e.timer > 2.2 || e.x < -80 || e.x > W + 80) e.dead = true;
            }
            this._hazardTouch(e, e.r * 0.8, dt);
            break;
          }
          case 'wheel': {
            e.x = e.cx + Math.sin(this.t * e.spd + e.ph) * e.amp;
            e.rot += dt * 3 * Math.sign(e.spd);
            this._hazardTouch(e, e.r * 0.86, dt);
            this._hint('wheel', 'Dönen diken çarklarının hareketini izle ve arasından geç.');
            break;
          }
          case 'jelly': {
            e.ph += dt;
            e.x += Math.sin(e.ph * 0.8) * 26 * dt;
            e.y += Math.sin(e.ph * 1.3) * e.amp * dt;
            this._hazardTouch(e, e.r * 0.8, dt);
            this._hint('jelly', 'Gölge denizanaları süzülür — dokungaçlarından uzak dur.');
            break;
          }
          case 'meteor': {
            if (e.warn > 0) {
              e.warn -= dt;
              e.y = this.cam.y - 60;
              break;
            }
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            if (Math.random() < 0.6) this.part(e.x, e.y, U.rand(-20, 20), U.rand(-20, 20), 0.5, 14, this.B.shadowRim, 'glow', 2);
            if (e.y > this.cam.y + this.H + 100) e.dead = true;
            this._hazardTouch(e, e.r * 0.9, dt);
            break;
          }
          case 'vine': {
            if (lumi.y > e.minY - LR && lumi.y < e.maxY + LR && this._vineHit(e, lumi.x, lumi.y, e.thick * 0.5 + LR - 2)) this.hitLumi(e);
            // takipçiler
            if (!e.eatT || e.eatT < this.t) {
              for (let k = this.swarm.length - 1; k >= 0; k--) {
                const f = this.swarm[k];
                if (f.y < e.minY - 4 || f.y > e.maxY + 4) continue;
                if (this._vineHit(e, f.x, f.y, e.thick * 0.5)) { this._loseFollower(k); e.eatT = this.t + 0.25; break; }
              }
            }
            this._hint('vine', 'Dikenli sarmaşıklara dokunma — kıvılcım kaybedersin!');
            break;
          }
          case 'web': {
            if (U.dist2(e.x, e.y, lumi.x, lumi.y) < e.r * e.r * 0.8) {
              if (lumi.slow <= 0) this._hint('web', 'Örümcek ağları seni yavaşlatır.');
              lumi.slow = 0.25;
            }
            break;
          }
          case 'cocoon': {
            e.ph += dt;
            if (U.dist2(e.x, e.y, lumi.x, lumi.y) < (e.r + 20) * (e.r + 20)) {
              if (this.swarm.length >= e.need) {
                e.dead = true;
                this.run.cocoons++;
                L.save.data.stats.cocoons++;
                L.audio.cocoon();
                U.vibrate(30);
                this.cam.shake = 6;
                for (let k = 0; k < e.reward; k++) {
                  const a = Math.random() * TAU, s = U.rand(80, 260);
                  this.ents.push({ t: 'spark', x: e.x, y: e.y, r: 7, ph: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, fly: 0.35 + Math.random() * 0.3, dead: false });
                }
                this.burst(e.x, e.y, 30, this.B.accent, 260, 24, 0.8);
                this.text(e.x, e.y - 30, `Koza açıldı! +${e.reward}`, '#d8fff0', 22);
              } else if (!e.bounceT || e.bounceT < this.t) {
                e.bounceT = this.t + 1.2;
                this.text(e.x, e.y - 34, `${e.need} kıvılcım gerekli`, '#ffd0e0', 17);
                L.audio.back();
                this.target.y = Math.min(this.H - 40, this.target.y + 50);
              }
            }
            this._hint('cocoon', 'Işık kozası: üstündeki sayı kadar kıvılcımla dokun, içinden kıvılcım yağar!');
            break;
          }
          case 'power': {
            if (U.dist2(e.x, e.y, lumi.x, lumi.y) < (e.r + 16) * (e.r + 16)) {
              e.dead = true;
              this._applyPower(e.kind, e.x, e.y);
            }
            this._hint('power', 'Güçlendirme kürelerini topla!');
            break;
          }
          case 'golden': {
            e.life -= dt;
            const dx = e.x - lumi.x, dy = e.y - lumi.y;
            const d = Math.hypot(dx, dy) || 1;
            if (e.life > 0) {
              const flee = d < 170 ? 300 * (1 - d / 170) + 60 : 0;
              e.vx += (dx / d) * flee * dt * 4 + Math.sin(this.t * 3 + i) * 40 * dt;
              e.vy += (dy / d) * flee * dt * 4 - 30 * dt;
              e.vx *= Math.exp(-2 * dt); e.vy *= Math.exp(-2 * dt);
              e.x += e.vx * dt;
              e.y += e.vy * dt;
              if (e.x < 20) { e.x = 20; e.vx = Math.abs(e.vx); }
              if (e.x > W - 20) { e.x = W - 20; e.vx = -Math.abs(e.vx); }
              e.y = U.clamp(e.y, this.cam.y + 60, this.cam.y + this.H - 60);
            } else {
              e.y -= 400 * dt;
            }
            if (Math.random() < 0.5) this.part(e.x, e.y, U.rand(-20, 20), U.rand(10, 40), 0.6, 12, '#ffd36b', 'glow', 2);
            if (d < 24 && e.life > -0.5) {
              e.dead = true;
              this.run.amber += 25;
              this.run.goldens++;
              L.save.data.stats.goldens++;
              L.audio.golden();
              U.vibrate(40);
              for (let k = 0; k < 10; k++) this._addFollower(e.x, e.y);
              this.run.collected += 10;
              this.burst(e.x, e.y, 30, '#ffd36b', 260, 26, 0.9);
              this.text(e.x, e.y - 30, 'Altın Kıvılcım! +25 ⬢', '#ffe08a', 22);
              L.ui.achieve('golden');
            }
            this._hint('golden', 'Kaçak altın kıvılcım! Yakalarsan büyük ödül.');
            break;
          }
          case 'trigger': {
            if (lumi.y < e.y) {
              e.dead = true;
              if (e.kind === 'meteor') {
                for (let k = 0; k < e.count; k++) this.meteorQueue.push(0.45 + k * 0.55);
                this.text(W / 2, this.H * 0.3, 'Yıldız Kayması!', '#ffb0c8', 26, false);
                L.audio.warn();
                this._hint('meteor', 'Gölge göktaşları düşüyor — kırmızı işaretlerden uzak dur!');
              } else if (e.kind === 'chase') {
                this.chase = { t: 0, dur: e.dur, h: 0 };
                this.text(W / 2, this.H * 0.32, 'KARANLIK DALGA!', '#ff9ab0', 30, false);
                L.audio.warn();
                U.vibrate(120);
                this._hint('chase', 'Karanlık aşağıdan yükseliyor! Yukarıda kal, sürünü koru.');
              }
            }
            break;
          }
        }
      }
      // temizlik
      let w = 0;
      const arr = this.ents;
      for (let i = 0; i < arr.length; i++) { const e = arr[i]; if (!e.dead) arr[w++] = e; }
      arr.length = w;
    }

    _hazardTouch(e, r, dt) {
      const lumi = this.lumi;
      const rr = r + 10;
      if (U.dist2(e.x, e.y, lumi.x, lumi.y) < rr * rr) this.hitLumi(e);
      if (e.dead) return;
      if (e.eatT && e.eatT > this.t) return;
      const r2 = (r + 3) * (r + 3);
      for (let k = this.swarm.length - 1; k >= 0; k--) {
        const f = this.swarm[k];
        if (U.dist2(e.x, e.y, f.x, f.y) < r2) {
          this._loseFollower(k);
          e.eatT = this.t + 0.2;
          if (e.t === 'wisp' && e.r < 28) e.r += 0.6;
          break;
        }
      }
    }

    _loseFollower(k) {
      const f = this.swarm[k];
      this.swarm.splice(k, 1);
      this.burst(f.x, f.y, 5, this.B.shadowRim, 90, 14, 0.4);
      if (!this._popT || this._popT < this.t) {
        this._popT = this.t + 0.12;
        L.audio.pop();
      }
    }

    _vineHit(e, x, y, rad) {
      const r2 = rad * rad;
      const p = e.pts;
      for (let i = 0; i < p.length - 1; i++) {
        if (U.segDist2(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]) < r2) return true;
      }
      return false;
    }

    _applyPower(kind, x, y) {
      return this.applyPowerV2(kind, x, y);
      const lumi = this.lumi;
      L.audio.powerup();
      U.vibrate(25);
      const names = { shield: 'Ay Kalkanı!', magnet: 'Işık Mıknatısı!', nova: 'Nova!', prism: 'Prizma x2!' };
      const cols = { shield: '#9ecbff', magnet: '#ff9ade', nova: '#ffe08a', prism: '#a8ffe0' };
      this.text(x, y - 30, names[kind], cols[kind], 22);
      this.burst(x, y, 22, cols[kind], 220, 22, 0.7);
      if (kind === 'shield') lumi.shield = this.shieldDur;
      else if (kind === 'magnet') lumi.magnet = 9;
      else if (kind === 'prism') lumi.prism = 9;
      else if (kind === 'nova') this.triggerFlare(true);
      lumi.mood = 'happy';
      lumi.moodT = 1;
    }

    _updateFlare(dt) {
      const f = this.flare;
      f.r += (1100 - f.r * 0.6) * dt;
      f.rays += dt;
      for (const e of this.ents) {
        if (e.dead || !(L.KILLABLE[e.t] || e.t === 'crystal')) continue;
        if (e.t === 'meteor' && e.warn > 0) continue;
        if (f.hit.has(e)) continue;
        const d2 = U.dist2(e.x, e.y, f.x, f.y);
        if (d2 < f.r * f.r) { f.hit.add(e); this.damage(e, e.t === 'crystal' ? 3 : 99); }
      }
      if (this.boss && !this.boss.dead && this.state === 'boss' && !f.bossHit && f.r > 120) {
        const b = this.boss;
        if (U.dist2(b.x, b.y, f.x, f.y) < f.r * f.r) { f.bossHit = true; b.flareHit(this, f.x, f.y, f.r); }
      }
      // sarmaşıkları yakar (görsel), çarklar geçici olarak titrer
      if (f.r > Math.max(this.W, this.H) * 1.1) f.active = false;
    }

    _updateMeteorQueue(dt) {
      for (let i = this.meteorQueue.length - 1; i >= 0; i--) {
        this.meteorQueue[i] -= dt;
        if (this.meteorQueue[i] <= 0) {
          this.meteorQueue.splice(i, 1);
          const x = U.rand(this.W * 0.1, this.W * 0.9);
          const tx = U.clamp(this.lumi.x + U.rand(-60, 60), 20, this.W - 20);
          const ang = Math.atan2(this.H * 0.9, tx - x);
          const sp = 430;
          this.ents.push({ t: 'meteor', x, y: this.cam.y - 60, r: 15, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, warn: 0.85, dead: false });
        }
      }
    }

    _updateChase(dt) {
      const c = this.chase;
      c.t += dt;
      const p = c.t / c.dur;
      // dalga yüksekliği: dalgalanarak yükselir, sonunda geri çekilir
      const target = p < 1 ? this.H * (0.1 + 0.26 * (0.5 + 0.5 * Math.sin(c.t * 0.9)) * Math.min(1, c.t / 3)) : -40;
      c.h = U.damp(c.h, target, 2.2, dt);
      const lineY = this.cam.y + this.H - c.h;
      if (this.lumi.y > lineY + 6) this.hitLumi(null);
      if (!c.eatT || c.eatT < this.t) {
        for (let k = this.swarm.length - 1; k >= 0; k--) {
          if (this.swarm[k].y > lineY + 10) { this._loseFollower(k); c.eatT = this.t + 0.12; break; }
        }
      }
      if (Math.random() < 0.6) this.part(U.rand(0, this.W), lineY + U.rand(0, 30), U.rand(-20, 20), U.rand(-60, -20), 0.9, 34, '#12051c', 'smoke', 1);
      if (p >= 1 && c.h < 0) {
        this.chase = null;
        this.text(this.W / 2, this.H * 0.35, 'Karanlıktan kurtuldun!', '#d0fff0', 24, false);
        L.audio.win();
      }
    }

    _updateParts(dt) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.parts[i] = this.parts[this.parts.length - 1];
          this.parts.pop();
          if (this._pool.length < 400) this._pool.push(p);
          continue;
        }
        const d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy *= d;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const tx = this.texts[i];
        tx.life -= dt;
        tx.y -= 30 * dt;
        if (tx.life <= 0) this.texts.splice(i, 1);
      }
      for (const m of this.motes) {
        m.ph += dt;
        m.x += (m.vx + Math.sin(m.ph) * 6) * dt;
        m.y += m.vy * dt;
        if (m.y < -10 || m.x < -10 || m.x > this.W + 10) Object.assign(m, this._mote(false));
      }
    }

    // ---------- seviye sonu: Ay Ağacı'na ışık taşıma ----------
    _beginDelivery() {
      if (this.state !== 'play') return;
      this.state = 'deliver';
      this.chase = null;
      this.meteorQueue.length = 0;
      L.audio.targetIntensity = 0.2;
      // kalan gölgeler arınır
      for (const e of this.ents) if (PURIFIABLE[e.t] && !e.dead) this.purify(e);
      this.ents = this.ents.filter((e) => e.t !== 'vine' && e.t !== 'wheel' && e.t !== 'web');
      const delivered = this.swarm.length;
      const pot = Math.max(10, this.gen.potential);
      const r3 = pot * 0.5, r2 = pot * 0.25;
      this.stars = delivered <= 0 ? 0 : delivered >= r3 ? 3 : delivered >= r2 ? 2 : 1;
      this.lanternsToLight = Math.round(LANTERNS * U.clamp(delivered / r3, 0, 1));
      if (delivered > 0) this.lanternsToLight = Math.max(1, this.lanternsToLight);
      this.delivered = delivered;
      this.deliverT = -1.0;
      this.deliverIdx = 0;
      this.flights = [];
      this.litCount = 0;
      this.deliverInterval = Math.min(0.07, 2.8 / Math.max(1, delivered));
      this.text(this.W / 2, this.H * 0.25, this.level.finale ? 'Büyük Ay Ağacı' : 'Ay Ağacı', '#fff6d0', 30, false);
      L.ui.hideHud();
    }

    _updateDelivery(dt) {
      this.deliverT += dt;
      const tr = this.tree;
      const treeX = 0, treeY = this.endY - tr.H;
      if (this.deliverT > 0 && this.swarm.length > 0 && this.deliverT > this.deliverIdx * this.deliverInterval) {
        const f = this.swarm.pop();
        const li = this.lanternsToLight > 0 ? Math.min(this.lanternsToLight - 1, Math.floor((this.deliverIdx / this.delivered) * this.lanternsToLight)) : -1;
        this.deliverIdx++;
        if (li >= 0) {
          const ln = tr.lanterns[li];
          this.flights.push({ x: f.x, y: f.y, sx: f.x, sy: f.y, tx: treeX + ln.x, ty: treeY + ln.y, t: 0, li, cx: f.x + U.rand(-120, 120), cy: f.y - U.rand(100, 300) });
        }
      }
      for (let i = this.flights.length - 1; i >= 0; i--) {
        const fl = this.flights[i];
        fl.t += dt * 1.4;
        const t = U.ease.inOutCubic(Math.min(1, fl.t));
        const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        fl.x = a * fl.sx + b * fl.cx + c * fl.tx;
        fl.y = a * fl.sy + b * fl.cy + c * fl.ty;
        if (fl.t >= 1) {
          this.flights.splice(i, 1);
          const ln = tr.lanterns[fl.li];
          if (ln.lit < 1) {
            ln.lit = 1;
            this.litCount++;
            L.audio.lantern(this.litCount - 1);
            this.burst(fl.tx, fl.ty, 12, '#ffd36b', 160, 18, 0.6);
            U.vibrate(8);
          }
        }
      }
      const done = this.swarm.length === 0 && this.flights.length === 0 && this.deliverT > 0;
      if (done && !this.deliverDone) {
        this.deliverDone = true;
        this.bloomStart = this.t;
        if (this.stars === 3) {
          L.audio.win();
          this.flash = 0.9;
          this.flashCol = '#fff6d0';
          this.cam.shake = 8;
          U.vibrate(120);
          for (let i = 0; i < 70; i++) this.part(U.rand(0, this.W), this.endY - U.rand(0, tr.H), U.rand(-40, 40), U.rand(-120, -30), 2.2, U.rand(14, 30), U.pick([this.B.accent, '#ffd36b', this.B.glow2]), 'glow', 0.5);
          // küçük bir görsel şölen: havai fişekler, ışık yağmuru ve büyük yazı
          this.fw = [];
          for (let i = 0; i < 7; i++) this.fw.push({ t: 0.5 + i * 0.32, x: U.rand(this.W * 0.15, this.W * 0.85), y: this.endY - tr.H * U.rand(0.55, 1.05) });
          this.lightRain(3.5);
          L.ui.celebrate('MÜKEMMEL!', this.level.finale ? 'Büyük Ay Ağacı yeniden doğdu' : 'Ay Ağacı tamamen uyandı', '#ffe08a');
        } else if (this.stars === 2) {
          L.audio.win();
          this.fw = [{ t: 0.4, x: this.W * 0.35, y: this.endY - tr.H * 0.8 }, { t: 0.8, x: this.W * 0.65, y: this.endY - tr.H * 0.9 }];
        }
        setTimeout(() => this._finishLevel(), this.stars === 3 ? 3000 : 1700);
      }
      if (this.deliverDone && this.stars === 3) this.treeBloom = Math.min(1, this.treeBloom + dt * 0.7);
      else if (this.deliverDone) this.treeBloom = Math.min(this.litCount / LANTERNS * 0.75, this.treeBloom + dt * 0.5);
    }

    _finishLevel() {
      if (this.state !== 'deliver') return;
      this.state = 'results';
      L.ui.showResults(this._summary(true));
    }

    _summary(win) {
      return {
        win,
        endless: this.endless,
        levelIndex: this.levelIndex,
        level: this.level,
        stars: win ? this.stars : 0,
        delivered: win ? this.delivered : 0,
        potential: this.gen ? this.gen.potential : 0,
        progress: this.level ? U.clamp(this.cam.y / this.camEnd, 0, 1) : 0,
        height: Math.floor(-this.cam.y / 10),
        run: this.run,
        amberMul: this.amberMul,
        perfect: win && this.run.hits === 0,
        unlock: this.pendingUnlock || null,
      };
    }

    // ---------- ipuçları ----------
    _hint(key, text) {
      if (this.demo) return;
      const seen = L.save.data.seen;
      if (seen[key]) return;
      seen[key] = 1;
      L.ui.hint(text);
    }
    _hints() {
      if (this.demo) return;
      if (this.flare.charge >= 1) this._hint('flare', 'Işık Patlaması hazır! Sağ alttaki parlayan düğmeye dokun.');
    }
    _tutorial() {
      const seen = L.save.data.seen;
      if (!seen.drag && this.t > 0.6) this._hint('drag', 'Parmağını ekranın herhangi bir yerinde sürükle — Lumi seni takip eder.');
      if (seen.drag && !seen.collect && this.t > 4) this._hint('collect', 'Kıvılcımları topla: sürün büyüdükçe ışığın da büyür!');
    }

    // ---------- çizim ----------
    render(g) {
      const W = this.W, H = this.H, B = this.B, t = this.t;
      const sh = this.cam.shake;
      const ox = sh ? U.rand(-sh, sh) * 0.5 : 0, oy = sh ? U.rand(-sh, sh) * 0.5 : 0;
      g.save();
      g.translate(ox, oy);

      // gökyüzü: gradyan, yıldızlar, ay ve diyar ışıkları tek bir önbellek tuvalinde (1 çizim)
      if (this.skyCanvas) g.drawImage(this.skyCanvas, -20, -20, W + 40, H + 40);
      else { g.fillStyle = this.skyGrad; g.fillRect(-20, -20, W + 40, H + 40); }

      // uzak ve orta katman + sis (uzak katman en düşük kalite kademesinde atlanır)
      if (!(L.fx && L.fx.level >= 2)) this._drawLayer(g, this.bg.layers[1]);
      this._drawFog(g);
      this._drawLayer(g, this.bg.layers[2]);

      // dünya
      g.save();
      g.translate(0, -this.cam.y);
      if (this.tree) this._drawTree(g);
      this._drawDecor(g);
      this._drawEnts(g);
      this._drawTrail(g);
      this._drawSwarm(g);
      if (this.lumi.alpha > 0) this._drawLumi(g);
      if (this.flights) this._drawFlights(g);
      g.restore();

      // ön plan
      this._drawLayer(g, this.bg.layers[3]);

      // karanlık maskesi
      this._drawMask(g);
      // gölge yaratıklar ve engeller maskenin üstünde: her zaman okunur
      g.save();
      g.translate(0, -this.cam.y);
      this._drawEnts(g, true);
      if (this.boss && this.state === 'boss') this.boss.draw(g, this);
      this._drawCombat(g);
      if (this.lumi.alpha > 0) this._drawLumiFx(g);
      this._drawParts(g);
      g.restore();

      g.globalCompositeOperation = 'lighter';
      // havada uçuşan ateşböcekleri (az sayıda, sprite önceden atanmış)
      const mN = L.fx && L.fx.level >= 2 ? 10 : this.motes.length;
      for (let i = 0; i < mN; i++) {
        const m = this.motes[i];
        const bl = Math.max(0, Math.sin(m.ph * 1.7));
        g.globalAlpha = m.a * (0.25 + 0.75 * bl);
        const sz = m.s * (1 + bl * 0.8);
        g.drawImage(m.img || (m.img = Art.glow(m.c || B.accent, 32, 0.25)), m.x - sz / 2, m.y - sz / 2, sz, sz);
      }
      if (this.secretT > 0) {
        g.globalAlpha = Math.min(1, this.secretT) * 0.18;
        g.fillStyle = '#ffcf6b';
        g.fillRect(0, 0, W, H);
      }
      g.globalAlpha = 1;
      if (this.flare.active) this._drawFlare(g);
      if (this.windT > 0) this._drawWind(g);
      g.globalCompositeOperation = 'source-over';

      if (this.chase) this._drawChase(g);
      if (this.flash > 0) {
        g.globalAlpha = Math.min(1, this.flash) * (this.flashCol === '#000000' ? 0.7 : 0.35);
        g.fillStyle = this.flashCol;
        g.fillRect(-20, -20, W + 40, H + 40);
        g.globalAlpha = 1;
      }
      if (this.lumi.inv > 0 && this.lumi.shield <= 0 && this.lumi.shieldHit <= 0 && (this.state === 'play' || this.state === 'boss')) {
        g.strokeStyle = U.rgba('#ff4f7a', 0.25 * (this.lumi.inv / 1.4));
        g.lineWidth = 18;
        g.strokeRect(0, 0, W, H);
      }
      this._drawTexts(g);
      this._drawZoneMsg(g);
      g.restore();
    }

    // Katmanlar yalnızca içerik olan sütun aralıkları (spans) ve ekranda görünen satırlarla çizilir.
    // Eskiden her katman tam ekran (bazen iki kez) boyanıyordu; ön plan katmanının ~%60'ı boştu.
    _drawLayer(g, layer) {
      const TH = this.bg.TH, H = this.H;
      let off = (-this.cam.y * layer.f) % TH;
      if (off < 0) off += TH;
      g.globalAlpha = layer.alpha;
      const spans = layer.spans;
      for (let k = 0; k < 2; k++) {
        const dy = k === 0 ? off - TH : off;
        const y0 = Math.max(0, dy), y1 = Math.min(H, dy + TH);
        if (y1 <= y0) continue;
        const sy = y0 - dy, sh = y1 - y0;
        if (!spans) { g.drawImage(layer.canvas, 0, sy, layer.canvas.width, sh, 0, y0, layer.canvas.width, sh); continue; }
        for (let i = 0; i < spans.length; i += 2) {
          const x0 = spans[i], w = spans[i + 1] - x0;
          g.drawImage(layer.canvas, x0, sy, w, sh, x0, y0, w, sh);
        }
      }
      g.globalAlpha = 1;
    }

    _drawFog(g) {
      const B = this.B, W = this.W, H = this.H;
      g.globalCompositeOperation = 'lighter';
      if (L.fx && L.fx.level >= 2) { g.globalCompositeOperation = 'source-over'; return; }
      const fog = Art.glow(this.fogHex || B.fog, 256);
      for (let i = 0; i < 2; i++) {
        const y = ((i * 431 - this.cam.y * 0.3) % (H + 300) + H + 300) % (H + 300) - 150;
        const x = W * 0.5 + Math.sin(this.t * 0.1 + i * 2) * W * 0.3;
        g.globalAlpha = 0.07;
        g.drawImage(fog, x - W * 0.6, y - 90, W * 1.2, 180);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    _drawAurora(g) {
      const W = this.W, H = this.H, t = this.t;
      g.globalCompositeOperation = 'lighter';
      const cols = ['#5fffc0', '#9a7bff', '#ff7ad8'];
      for (let k = 0; k < 3; k++) {
        const grd = g.createLinearGradient(0, 0, 0, H * 0.5);
        grd.addColorStop(0, U.rgba(cols[k], 0));
        grd.addColorStop(0.5, U.rgba(cols[k], 0.13));
        grd.addColorStop(1, U.rgba(cols[k], 0));
        g.fillStyle = grd;
        g.beginPath();
        const base = H * (0.12 + k * 0.08);
        g.moveTo(0, base);
        for (let x = 0; x <= W; x += W / 16) g.lineTo(x, base + Math.sin(x * 0.012 + t * 0.4 + k * 2) * 40 + Math.sin(x * 0.03 - t * 0.7) * 14);
        for (let x = W; x >= 0; x -= W / 16) g.lineTo(x, base + 160 + Math.sin(x * 0.01 + t * 0.3 + k) * 50);
        g.closePath();
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }

    _drawRays(g) {
      const W = this.W, H = this.H, t = this.t;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x = W * (0.15 + i * 0.25) + Math.sin(t * 0.2 + i) * 30;
        const grd = g.createLinearGradient(x, 0, x - 120, H);
        grd.addColorStop(0, U.rgba(this.B.accent, 0.12));
        grd.addColorStop(1, U.rgba(this.B.accent, 0));
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(x - 20, 0); g.lineTo(x + 30, 0); g.lineTo(x - 60, H); g.lineTo(x - 200, H);
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }

    _drawCaveGlow(g) {
      const W = this.W, H = this.H;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.18 + 0.05 * Math.sin(this.t);
      g.drawImage(Art.glow(this.B.accent, 256), -W * 0.3, H * 0.2, W * 0.9, W * 0.9);
      g.drawImage(Art.glow(this.B.glow2, 256), W * 0.5, H * 0.5, W * 0.9, W * 0.9);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    _drawTree(g) {
      const tr = this.tree;
      const x0 = 0, y0 = this.endY - tr.H;
      if (y0 > this.cam.y + this.H || this.endY < this.cam.y - 50) return;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.35 + this.treeBloom * 0.5;
      g.drawImage(Art.glow(this.B.accent, 256), x0 - tr.W * 0.3, y0 - tr.H * 0.1, tr.W * 1.6, tr.H * 1.1);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.drawImage(tr.dark, x0, y0);
      if (this.treeBloom > 0) {
        // ağaç gövdeden tepeye doğru ışıkla dolar
        const k = U.ease.outCubic(Math.min(1, this.treeBloom));
        const h = tr.H * k;
        g.save();
        g.beginPath();
        g.rect(x0, y0 + tr.H - h, tr.W, h);
        g.clip();
        g.drawImage(tr.lit, x0, y0);
        g.restore();
        // dolum çizgisinde parlayan cephe
        if (k < 0.99) {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = 0.6;
          g.drawImage(Art.glow('#fff3c4', 256), x0 - tr.W * 0.1, y0 + tr.H - h - 40, tr.W * 1.2, 80);
          g.globalAlpha = 1;
          g.globalCompositeOperation = 'source-over';
          if (Math.random() < 0.6) this.part(x0 + U.rand(tr.W * 0.15, tr.W * 0.85), y0 + tr.H - h, U.rand(-30, 30), U.rand(-90, -30), 1.4, U.rand(10, 20), U.pick([this.B.accent, '#ffd36b', '#ff9fd8']), 'glow', 0.6);
        }
      }
      for (const ln of tr.lanterns) Art.drawLantern(g, x0 + ln.x, y0 + ln.y, ln.lit, this.t, this.B);
    }

    _drawEnts(g, hazards) {
      const B = this.B, t = this.t;
      if (hazards && this.state === 'play') this._drawWarnings(g);
      const top = this.cam.y - 120, bottom = this.cam.y + this.H + 120;
      const pickImg = Art.pickup(48);
      for (const e of this.ents) {
        if (e.dead) continue;
        if (!!HAZ_LAYER[e.t] !== !!hazards) continue;
        if (e.t === 'vine') {
          if (e.maxY < top || e.minY > bottom) continue;
          g.drawImage(e.img.canvas, e.img.ox, e.img.oy);
          continue;
        }
        if (e.t === 'wind' || e.t === 'trigger') continue;
        if (e.y < top || e.y > bottom) continue;
        switch (e.t) {
          case 'spark': {
            // toplanabilir kıvılcım: dolu altın çekirdek + parıltı, hafif nabız
            const s = 34 + Math.sin(t * 5 + e.ph) * 4;
            if (e.scatter != null) g.globalAlpha = Math.min(1, e.scatter) * (e.grace > 0 ? 0.6 : 1);
            g.drawImage(pickImg, e.x - s / 2, e.y - s / 2 + (e.fly == null && e.scatter == null ? Math.sin(t * 2 + e.ph) * 3 : 0), s, s);
            g.globalAlpha = 1;
            break;
          }
          case 'amber': Art.drawAmber(g, e.x, e.y, e.r, t + e.x); break;
          case 'wisp': Art.drawWisp(g, e.x, e.y, e.r, t, B, e.flash > 0, e.ph); this._hurtFx(g, e); break;
          case 'moth':
            if (e.state === 'charge') {
              g.strokeStyle = U.rgba('#ff3355', 0.25 + 0.25 * Math.sin(t * 30));
              g.lineWidth = 2;
              g.setLineDash([8, 8]);
              g.beginPath();
              g.moveTo(e.x, e.y);
              g.lineTo(e.x + Math.cos(e.ang) * 600, e.y + Math.sin(e.ang) * 600);
              g.stroke();
              g.setLineDash([]);
            }
            Art.drawMoth(g, e.x, e.y, e.r, t, B, e.ang || Math.PI / 2, e.state === 'charge');
            this._hurtFx(g, e);
            break;
          case 'wheel': Art.drawWheel(g, e.x, e.y, e.r, e.rot, B); break;
          case 'jelly': Art.drawJelly(g, e.x, e.y, e.r, t + e.ph, B); this._hurtFx(g, e); break;
          case 'meteor':
            if (e.warn > 0) {
              const a = 0.4 + 0.4 * Math.sin(t * 25);
              g.fillStyle = U.rgba('#ff3355', a);
              const wx = e.x + e.vx * 0.25;
              g.beginPath();
              g.moveTo(wx, this.cam.y + 70);
              g.lineTo(wx - 11, this.cam.y + 88);
              g.lineTo(wx + 11, this.cam.y + 88);
              g.fill();
            } else if (e.crystal) {
              g.save();
              g.translate(e.x, e.y);
              g.rotate(Math.atan2(e.vy, e.vx) - Math.PI / 2);
              g.globalCompositeOperation = 'lighter';
              g.drawImage(Art.glow('#7ac8ff', 64), -26, -26, 52, 52);
              g.globalCompositeOperation = 'source-over';
              const cg = g.createLinearGradient(-8, 0, 8, 0);
              cg.addColorStop(0, '#5fb8ff'); cg.addColorStop(0.5, '#f0faff'); cg.addColorStop(1, '#2a5aa0');
              g.fillStyle = cg;
              g.beginPath(); g.moveTo(0, 20); g.lineTo(8, 0); g.lineTo(5, -16); g.lineTo(-5, -16); g.lineTo(-8, 0); g.closePath(); g.fill();
              g.restore();
            } else Art.drawMeteor(g, e.x, e.y, e.r, e.vx, e.vy, B);
            break;
          case 'web': Art.drawWeb(g, e.x, e.y, e.r, B, t); break;
          case 'cocoon': {
            const ok = this.swarm.length >= e.need;
            Art.drawCocoon(g, e.x, e.y, e.r, t + e.ph, e.need, ok, B);
            g.font = 'bold 15px sans-serif';
            g.textAlign = 'center';
            g.lineWidth = 3;
            g.strokeStyle = 'rgba(0,0,0,0.6)';
            g.fillStyle = ok ? '#c8ffe8' : '#ffd0e0';
            const lbl = (ok ? '✦ ' : '') + e.need;
            g.strokeText(lbl, e.x, e.y + e.r * 1.25 + 22);
            g.fillText(lbl, e.x, e.y + e.r * 1.25 + 22);
            break;
          }
          case 'power': {
            // güçlendirme: büyük, parlak ve nabız gibi atan beyaz halka ile hemen fark edilir
            const pr = e.r * (1.45 + 0.25 * Math.sin(t * 4 + e.x));
            g.strokeStyle = 'rgba(255,255,255,0.7)';
            g.lineWidth = 2.5;
            g.beginPath(); g.arc(e.x, e.y + Math.sin(t * 3) * 3, pr, 0, TAU); g.stroke();
            Art.drawPower(g, e.x, e.y, e.r * 1.12, t, e.kind);
            break;
          }
          case 'chest': Art.drawChest(g, e.x, e.y, t + e.x, e.opening == null ? 0 : Math.min(1, e.opening / 0.45), e.opening == null ? '#ffd36b' : ['#dff6ff', '#9ad0ff', '#ffd36b'][e.rar]); break;
          case 'crystal': Art.drawCrystalCluster(g, e, t, B); break;
          case 'portal': Art.drawPortal(g, e.x, e.y, e.r, t); break;
          case 'orb': this._drawOrb(g, e); break;
          case 'golden': Art.drawGoldbug(g, e.x, e.y, t, e.vx || 0, e.vy || 0); break;
        }
      }
    }

    _drawSwarm(g) {
      const imgs = [Art.spark(this.skin.mid, 48), Art.spark('#8fffe0', 48), Art.spark('#ff9fd8', 48)];
      g.globalCompositeOperation = 'lighter';
      const t = this.t;
      for (const f of this.swarm) {
        const s = 17 + Math.sin(t * 6 + f.tw) * 4;
        g.drawImage(imgs[f.c || 0], f.x - s / 2, f.y - s / 2, s, s);
      }
      g.globalCompositeOperation = 'source-over';
    }

    _drawLumi(g) {
      const lumi = this.lumi;
      g.globalAlpha = 0.4 * lumi.alpha;
      g.drawImage(this._lumiShadow || (this._lumiShadow = Art.smoke('#020414', '#020414', 64)), lumi.x - 30, lumi.y - 26, 60, 60);
      g.globalAlpha = 1;
      if (lumi.inv > 0 && Math.floor(lumi.inv * 14) % 2 === 0 && this.state === 'play') g.globalAlpha = 0.45;
      else g.globalAlpha = lumi.alpha;
      Art.drawLumi(g, lumi.x, lumi.y, this.t, { skin: this.skin, vx: lumi.vx, vy: lumi.vy, blink: lumi.blink, mood: lumi.mood, power: lumi.power, scale: 1.22 });
      g.globalAlpha = 1;
      if (lumi.magnet > 0) {
        g.strokeStyle = U.rgba('#ff9ade', 0.25 + 0.15 * Math.sin(this.t * 6));
        g.lineWidth = 1.5;
        g.setLineDash([4, 10]);
        g.beginPath();
        g.arc(lumi.x, lumi.y, this.magnetR * 3 * (0.9 + 0.1 * Math.sin(this.t * 4)), 0, TAU);
        g.stroke();
        g.setLineDash([]);
      }
    }

    // Yukarıdan yaklaşan tehlikeler için ekran üstünde kısa, kırmızı uyarı oku
    _drawWarnings(g) {
      const top = this.cam.y;
      for (const e of this.ents) {
        if (e.dead) continue;
        const t = e.t;
        if (t !== 'wisp' && t !== 'moth' && t !== 'wheel' && t !== 'jelly') continue;
        const d = top - e.y;
        if (d < 10 || d > 260) continue;
        const a = (1 - d / 260) * (0.55 + 0.45 * Math.sin(this.t * 14));
        g.globalAlpha = a;
        g.fillStyle = '#ff2e63';
        const x = U.clamp(e.x, 18, this.W - 18), y = top + 70;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 11, y + 16); g.lineTo(x + 11, y + 16); g.closePath(); g.fill();
        g.fillStyle = '#ffffff';
        g.fillRect(x - 1.2, y + 5, 2.4, 6); g.fillRect(x - 1.2, y + 12.5, 2.4, 2.2);
      }
      g.globalAlpha = 1;
    }

    _hurtFx(g, e) {
      if (e.maxHp && e.hp < e.maxHp) Art.drawCracks(g, e);
      if (e.flash > 0) {
        g.globalCompositeOperation = 'lighter';
        g.drawImage(Art.glow('#ffffff', 64, 0.3), e.x - e.r * 1.4, e.y - e.r * 1.4, e.r * 2.8, e.r * 2.8);
        g.globalCompositeOperation = 'source-over';
      }
    }

    _drawParts(g) {
      // kırık parçalar: önce koyu parça olarak döner, ömrünün sonunda ışık kıvılcımına dönüşür
      for (const p of this.parts) {
        if (p.type !== 'shard' || p.life < 0.28) continue;
        p.rot += p.vr * 0.016;
        Art.drawShard(g, p);
      }
      g.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        if (p.type === 'ring') {
          const k = p.life / p.max;
          const r = p.size * 0.5 * (1 - k * k * 0.85);
          g.strokeStyle = U.rgba(p.col, k * 0.8);
          g.lineWidth = 2 + 10 * k;
          g.beginPath();
          g.arc(p.x, p.y, Math.max(1, r), 0, TAU);
          g.stroke();
          continue;
        }
        if (p.type === 'shard') {
          if (p.life >= 0.28) continue;
          const k = p.life / 0.28;
          g.globalAlpha = k;
          const s = 14 * k + 4;
          g.drawImage(Art.glow(p.rim === '#ffffff' ? p.col : '#ffe08a', 64, 0.25), p.x - s / 2, p.y - s / 2, s, s);
          continue;
        }
        if (p.type === 'smoke') continue;
        const k = p.life / p.max;
        g.globalAlpha = k;
        const s = p.size * (0.4 + k * 0.6);
        g.drawImage(p.img || (p.img = Art.glow(p.col, 64, 0.2)), p.x - s / 2, p.y - s / 2, s, s);
      }
      g.globalCompositeOperation = 'source-over';
      for (const p of this.parts) {
        if (p.type !== 'smoke') continue;
        const k = p.life / p.max;
        g.globalAlpha = k * 0.6;
        const s = p.size * (1.6 - k * 0.6);
        g.drawImage(Art.smoke(this.B.shadow, this.B.shadowRim, 128), p.x - s / 2, p.y - s / 2, s, s);
      }
      g.globalAlpha = 1;
    }

    _drawFlights(g) {
      const img = Art.spark(this.skin.mid, 48);
      g.globalCompositeOperation = 'lighter';
      for (const f of this.flights) g.drawImage(img, f.x - 14, f.y - 14, 28, 28);
      g.globalCompositeOperation = 'source-over';
    }

    // Eski yöntem tam ekran bir karanlık maskesi çiziyordu (her karede ekranın tamamı bir kez daha
    // boyanıyordu ve dünyayı gereksiz karartıyordu). Artık arka plan katmanları kurulurken hafifçe
    // koyulaştırılıyor; burada yalnızca Lumi'nin çevresine küçük, ucuz bir ışık halesi eklenir.
    _drawMask(g) {
      const lumi = this.lumi;
      if (lumi.alpha <= 0) return;
      const r = 120 + Math.min(80, Math.sqrt(this.swarm.length) * 7);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.13 * lumi.alpha;
      g.drawImage(this._lumiHalo || (this._lumiHalo = Art.glow(this.skin.mid, 256)), lumi.x - r, lumi.y - this.cam.y - r + 8, r * 2, r * 2);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    _drawFlare(g) {
      const f = this.flare;
      const y = f.y - this.cam.y;
      const k = 1 - Math.min(1, f.r / (Math.max(this.W, this.H) * 1.1));
      g.strokeStyle = U.rgba(this.skin.core, 0.8 * k);
      g.lineWidth = 16 * k + 2;
      g.beginPath();
      g.arc(f.x, y, f.r, 0, TAU);
      g.stroke();
      g.strokeStyle = U.rgba(this.skin.mid, 0.5 * k);
      g.lineWidth = 40 * k;
      g.beginPath();
      g.arc(f.x, y, f.r * 0.92, 0, TAU);
      g.stroke();
      // ikinci renkli dalga ve dönen ışık huzmeleri (süper patlama)
      g.strokeStyle = U.rgba('#8fffe0', 0.45 * k);
      g.lineWidth = 8 * k + 1;
      g.beginPath();
      g.arc(f.x, y, f.r * 0.7, 0, TAU);
      g.stroke();
      g.strokeStyle = U.rgba('#ff9fd8', 0.35 * k);
      g.beginPath();
      g.arc(f.x, y, f.r * 0.5, 0, TAU);
      g.stroke();
      const rk = Math.max(0, 1 - f.rays / 0.6);
      if (rk > 0) {
        g.save();
        g.translate(f.x, y);
        g.rotate(f.rays * 1.2);
        for (let i = 0; i < 12; i++) {
          g.rotate(TAU / 12);
          const grd = g.createLinearGradient(0, 0, 0, -f.r * 1.2);
          grd.addColorStop(0, U.rgba('#ffffff', 0.5 * rk));
          grd.addColorStop(1, U.rgba(this.skin.mid, 0));
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(-6, 0); g.lineTo(6, 0); g.lineTo(26, -f.r * 1.2); g.lineTo(-26, -f.r * 1.2);
          g.fill();
        }
        g.restore();
      }
    }

    _updateFireworks(dt) {
      if (!this.fw || !this.fw.length) return;
      for (let i = this.fw.length - 1; i >= 0; i--) {
        this.fw[i].t -= dt;
        if (this.fw[i].t <= 0) {
          const f = this.fw.splice(i, 1)[0];
          const col = U.pick(['#ffd36b', '#8fffe0', '#ff9fd8', '#b78cff', '#9ad8ff']);
          for (let k = 0; k < 34; k++) {
            const a = (k / 34) * TAU, sp = U.rand(160, 260);
            this.part(f.x, f.y, Math.cos(a) * sp, Math.sin(a) * sp, 1.2, 16, k % 3 ? col : '#ffffff', 'glow', 1.6);
          }
          this.parts.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 160, col, type: 'ring', drag: 0 });
          L.audio.firework && L.audio.firework();
        }
      }
    }

    _drawWind(g) {
      g.strokeStyle = 'rgba(200,250,255,0.18)';
      g.lineWidth = 2;
      g.beginPath();
      for (let i = 0; i < 14; i++) {
        const x = (i * 97 + 13) % this.W;
        const y = ((i * 173 + this.t * 1400) % (this.H + 200)) - 100;
        g.moveTo(x, y);
        g.lineTo(x, y + 70);
      }
      g.stroke();
    }

    _drawChase(g) {
      const c = this.chase, W = this.W, H = this.H;
      const y = H - c.h;
      const grd = g.createLinearGradient(0, y - 80, 0, H);
      grd.addColorStop(0, 'rgba(10,2,20,0)');
      grd.addColorStop(0.35, 'rgba(10,2,20,0.85)');
      grd.addColorStop(1, 'rgba(5,0,10,1)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += W / 12) g.lineTo(x, y - 40 + Math.sin(x * 0.05 + this.t * 4) * 14);
      g.lineTo(W, H);
      g.fill();
      // kırmızı gözler
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const ex = W * (0.15 + i * 0.23) + Math.sin(this.t + i) * 10, ey = y + 20 + (i % 2) * 18;
        g.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 3 + i);
        g.drawImage(Art.glow('#ff2a55', 64, 0.25), ex - 14, ey - 8, 12, 12);
        g.drawImage(Art.glow('#ff2a55', 64, 0.25), ex + 2, ey - 8, 12, 12);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = U.rgba('#ff4f7a', 0.5);
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= W; x += W / 12) g.lineTo(x, y - 40 + Math.sin(x * 0.05 + this.t * 4) * 14);
      g.stroke();
    }

    _drawTexts(g) {
      g.textAlign = 'center';
      for (const tx of this.texts) {
        const k = tx.life / tx.max;
        const pop = tx.max - tx.life < 0.15 ? U.ease.outBack((tx.max - tx.life) / 0.15) : 1;
        const y = tx.world ? tx.y - this.cam.y : tx.y;
        g.globalAlpha = Math.min(1, k * 2);
        g.font = `800 ${Math.round(tx.size * pop)}px sans-serif`;
        if (tx.w == null) tx.w = g.measureText(tx.str).width / pop;
        tx.x = U.clamp(tx.x, tx.w / 2 + 10, this.W - tx.w / 2 - 10);
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(10,5,25,0.75)';
        g.strokeText(tx.str, tx.x, y);
        g.fillStyle = tx.col;
        g.fillText(tx.str, tx.x, y);
      }
      g.globalAlpha = 1;
    }
  }

  L.Game = Game;
  L.LANTERNS = LANTERNS;
})();
