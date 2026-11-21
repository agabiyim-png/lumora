/* LUMORA — oyun çekirdeği: güncelleme, çarpışma, ışık, kamera, seviye sonu */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;
  const Art = L.Art;
  const TAU = U.TAU;

  const PURIFIABLE = { wisp: 1, moth: 1, jelly: 1, meteor: 1 };
  const HAZARD = { wisp: 1, moth: 1, jelly: 1, meteor: 1, wheel: 1, vine: 1 };
  const LANTERNS = 24;
  const HAZ_LAYER = { vine: 1, wisp: 1, moth: 1, wheel: 1, jelly: 1, meteor: 1, web: 1 };

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
      this.mask = U.makeCanvas(Math.ceil(this.W / 3), Math.ceil(this.H / 3));
      this.mg = this.mask.getContext('2d');
      this._buildVignette();
      for (let i = 0; i < 46; i++) this.motes.push(this._mote(true));

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
      const c = U.makeCanvas(this.W, this.H);
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(this.W / 2, this.H * 0.55, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H * 0.55, Math.max(this.W, this.H) * 0.78);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.62)');
      g.fillStyle = grd;
      g.fillRect(0, 0, this.W, this.H);
      this.vignette = c;
    }

    _mote(init) {
      return { x: Math.random() * this.W, y: init ? Math.random() * this.H : this.H + 10, vx: U.rand(-8, 8), vy: U.rand(-18, -6), s: U.rand(3, 9), a: U.rand(0.2, 0.7), ph: Math.random() * 6 };
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
      this.swarm.push({ x, y, vx: 0, vy: 0, a: Math.random() * TAU, w: U.rand(0.6, 1.6) * (Math.random() < 0.5 ? 1 : -1), rr: Math.sqrt(Math.random()) * 0.95 + 0.05, k: U.rand(9, 20), tw: Math.random() * 6 });
    }

    // ---------- giriş ----------
    pointer(dx, dy) {
      const slow = this.lumi.slow > 0 ? 0.5 : 1;
      this.target.x = U.clamp(this.target.x + dx * 1.3 * slow, 18, this.W - 18);
      this.target.y = U.clamp(this.target.y + dy * 1.3 * slow, this.H * 0.12, this.H - 40);
      this.moved = (this.moved || 0) + Math.abs(dx) + Math.abs(dy);
    }

    triggerFlare(free) {
      if (this.state !== 'play') return false;
      if (!free && this.flare.charge < 1) return false;
      if (!free) this.flare.charge = 0;
      const f = this.flare;
      f.active = true;
      f.r = 10;
      f.x = this.lumi.x;
      f.y = this.lumi.y;
      f.hit.clear();
      this.slowmo = 0.45;
      this.cam.shake = Math.max(this.cam.shake, 9);
      this.flash = 0.5;
      this.flashCol = '#ffffff';
      this.run.flares++;
      L.save.data.stats.flares++;
      L.audio.flare();
      U.vibrate(40);
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU;
        this.part(f.x, f.y, Math.cos(a) * 420, Math.sin(a) * 420, 0.7, 26, this.skin.mid, 'glow', 3.5);
      }
      this.lumi.mood = 'happy';
      this.lumi.moodT = 1;
      return true;
    }

    // ---------- parçacık ve yazı ----------
    part(x, y, vx, vy, life, size, col, type, drag) {
      if (this.parts.length > 520) return;
      this.parts.push({ x, y, vx, vy, life, max: life, size, col, type: type || 'glow', drag: drag || 2 });
    }
    burst(x, y, n, col, speed, size, life) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
        this.part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), col, 'glow', 3);
      }
    }
    text(x, y, str, col, size, world) {
      this.texts.push({ x, y, str, col, size: size || 18, life: 1.3, max: 1.3, world: world !== false });
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
        dt *= 0.35 + 0.65 * (1 - Math.max(0, this.slowmo) / 0.45);
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
        this.target.y = this.H * 0.43 + Math.sin(this.t * 0.9) * this.H * 0.05;
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
      lumi.shield = Math.max(0, lumi.shield - dt);
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
      this.flare.charge = Math.min(1, this.flare.charge + dt * 0.012 * this.flareRate * (this.state === 'play' ? 1 : 0));

      this._updateSwarm(dt);
      if (this.state === 'play' || this.demo) this._updateEnts(dt);
      if (this.flare.active) this._updateFlare(dt);
      this._updateMeteorQueue(dt);
      if (this.chase) this._updateChase(dt);
      if (this.state === 'deliver') this._updateDelivery(dt);
      if (this.state === 'dead') this._updateDeath(dt);
      this._updateParts(dt);

      // müzik yoğunluğu
      let threat = 0;
      for (const e of this.ents) if (HAZARD[e.t] && e.y > this.cam.y && e.y < this.cam.y + this.H) threat++;
      L.audio.targetIntensity = this.chase ? 1 : this.windT > 0 ? 0.7 : U.clamp(threat * 0.15, 0.1, 0.55);

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
      if (this.state !== 'play') return;
      if (lumi.shield > 0) {
        if (src && PURIFIABLE[src.t]) this.purify(src);
        else {
          this.cam.shake = 5;
          L.audio.whoosh();
        }
        return;
      }
      if (lumi.inv > 0) return;
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
      this.burst(e.x, e.y, 16, '#ffffff', 200, 20, 0.6);
      this.burst(e.x, e.y, 10, this.B.shadowRim, 140, 26, 0.7);
      for (let i = 0; i < 6; i++) this.part(e.x + U.rand(-10, 10), e.y + U.rand(-10, 10), U.rand(-30, 30), U.rand(-80, -30), 1.2, 30, '#20102a', 'smoke', 1);
      this.text(e.x, e.y - 20, 'Arındı!', '#ffffff', 16);
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
        if (!onScreen && e.t !== 'trigger') continue;
        switch (e.t) {
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
      if (this.ents.length > 60) this.ents = this.ents.filter((e) => !e.dead);
      else for (let i = this.ents.length - 1; i >= 0; i--) if (this.ents[i].dead) this.ents.splice(i, 1);
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
      for (const e of this.ents) {
        if (e.dead || !PURIFIABLE[e.t]) continue;
        if (e.t === 'meteor' && e.warn > 0) continue;
        const d2 = U.dist2(e.x, e.y, f.x, f.y);
        if (d2 < f.r * f.r) this.purify(e);
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
        if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; }
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
        }
        setTimeout(() => this._finishLevel(), 1500);
      }
      if (this.deliverDone && this.stars === 3) this.treeBloom = Math.min(1, this.treeBloom + dt * 0.8);
      else if (this.deliverDone) this.treeBloom = Math.min(this.litCount / LANTERNS * 0.6, this.treeBloom + dt * 0.5);
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

      // gökyüzü
      g.fillStyle = this.skyGrad;
      g.fillRect(-20, -20, W + 40, H + 40);
      const L0 = this.bg.layers[0];
      this._drawLayer(g, L0);
      if (this.moonSpr) {
        const my = H * 0.16;
        g.globalCompositeOperation = 'lighter';
        g.drawImage(this.moonSpr, W * 0.72 - 130, my - 130, 260, 260);
        g.globalCompositeOperation = 'source-over';
      }
      if (B.id === 'peak') this._drawAurora(g);
      if (B.id === 'garden') this._drawRays(g);
      if (B.id === 'cave') this._drawCaveGlow(g);

      // uzak ve orta katman + sis
      this._drawLayer(g, this.bg.layers[1]);
      this._drawFog(g);
      this._drawLayer(g, this.bg.layers[2]);

      // dünya
      g.save();
      g.translate(0, -this.cam.y);
      if (this.tree) this._drawTree(g);
      this._drawEnts(g);
      this._drawSwarm(g);
      if (this.lumi.alpha > 0) this._drawLumi(g);
      this._drawParts(g);
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
      g.restore();

      // ışık tonu (ek)
      g.globalCompositeOperation = 'lighter';
      if (this.moonSpr) {
        g.globalAlpha = 0.3;
        g.drawImage(Art.glow(B.rim, 256), W * 0.72 - 110, H * 0.16 - 110, 220, 220);
        g.globalAlpha = 1;
      }
      const ly = this.lumi.y - this.cam.y;
      const lr = 220 + Math.sqrt(this.swarm.length) * 18;
      g.globalAlpha = 0.16 * this.lumi.alpha;
      g.drawImage(Art.glow(this.skin.mid, 256), this.lumi.x - lr, ly - lr, lr * 2, lr * 2);
      g.globalAlpha = 1;
      // havada uçuşan toz zerreleri
      const mote = Art.glow(B.accent, 32, 0.25);
      for (const m of this.motes) {
        g.globalAlpha = m.a * (0.5 + 0.5 * Math.sin(m.ph * 2));
        g.drawImage(mote, m.x - m.s / 2, m.y - m.s / 2, m.s, m.s);
      }
      g.globalAlpha = 1;
      if (this.flare.active) this._drawFlare(g);
      if (this.windT > 0) this._drawWind(g);
      g.globalCompositeOperation = 'source-over';

      if (this.chase) this._drawChase(g);
      g.drawImage(this.vignette, 0, 0);
      if (this.flash > 0) {
        g.globalAlpha = Math.min(1, this.flash) * (this.flashCol === '#000000' ? 0.7 : 0.35);
        g.fillStyle = this.flashCol;
        g.fillRect(-20, -20, W + 40, H + 40);
        g.globalAlpha = 1;
      }
      if (this.lumi.inv > 0 && this.state === 'play') {
        g.strokeStyle = U.rgba('#ff4f7a', 0.25 * (this.lumi.inv / 1.4));
        g.lineWidth = 18;
        g.strokeRect(0, 0, W, H);
      }
      this._drawTexts(g);
      g.restore();
    }

    _drawLayer(g, layer) {
      const TH = this.bg.TH;
      let off = (-this.cam.y * layer.f) % TH;
      if (off < 0) off += TH;
      g.globalAlpha = layer.alpha;
      g.drawImage(layer.canvas, 0, off - TH);
      if (off < this.H) g.drawImage(layer.canvas, 0, off);
      g.globalAlpha = 1;
    }

    _drawFog(g) {
      const B = this.B, W = this.W, H = this.H;
      g.globalCompositeOperation = 'lighter';
      const fog = Art.glow(B.fog, 256);
      for (let i = 0; i < 5; i++) {
        const y = ((i * 211 - this.cam.y * 0.3) % (H + 300) + H + 300) % (H + 300) - 150;
        const x = W * 0.5 + Math.sin(this.t * 0.1 + i * 2) * W * 0.4;
        g.globalAlpha = 0.12;
        g.drawImage(fog, x - W * 0.7, y - 120, W * 1.4, 240);
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
        g.globalAlpha = this.treeBloom;
        g.drawImage(tr.lit, x0, y0);
        g.globalAlpha = 1;
      }
      for (const ln of tr.lanterns) Art.drawLantern(g, x0 + ln.x, y0 + ln.y, ln.lit, this.t, this.B);
    }

    _drawEnts(g, hazards) {
      const B = this.B, t = this.t;
      const top = this.cam.y - 120, bottom = this.cam.y + this.H + 120;
      const sparkImg = Art.spark(this.skin.mid, 48);
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
            const s = 30 + Math.sin(t * 5 + e.ph) * 5;
            g.globalCompositeOperation = 'lighter';
            if (e.scatter != null) g.globalAlpha = Math.min(1, e.scatter) * (e.grace > 0 ? 0.6 : 1);
            g.drawImage(sparkImg, e.x - s / 2, e.y - s / 2 + (e.fly == null && e.scatter == null ? Math.sin(t * 2 + e.ph) * 3 : 0), s, s);
            g.globalAlpha = 1;
            g.globalCompositeOperation = 'source-over';
            break;
          }
          case 'amber': Art.drawAmber(g, e.x, e.y, e.r, t + e.x); break;
          case 'wisp': Art.drawWisp(g, e.x, e.y, e.r, t, B, false, e.ph); break;
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
            break;
          case 'wheel': Art.drawWheel(g, e.x, e.y, e.r, e.rot, B); break;
          case 'jelly': Art.drawJelly(g, e.x, e.y, e.r, t + e.ph, B); break;
          case 'meteor':
            if (e.warn > 0) {
              const a = 0.4 + 0.4 * Math.sin(t * 25);
              g.fillStyle = U.rgba('#ff3355', a);
              const wx = e.x + e.vx * 0.25;
              g.beginPath();
              g.moveTo(wx, this.cam.y + 14);
              g.lineTo(wx - 10, this.cam.y + 32);
              g.lineTo(wx + 10, this.cam.y + 32);
              g.fill();
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
          case 'power': Art.drawPower(g, e.x, e.y, e.r, t, e.kind); break;
          case 'golden': {
            g.globalCompositeOperation = 'lighter';
            g.drawImage(Art.glow('#ffd36b', 128), e.x - 40, e.y - 40, 80, 80);
            g.drawImage(Art.spark('#ffe9a0', 48), e.x - 22, e.y - 22, 44, 44);
            g.globalCompositeOperation = 'source-over';
            break;
          }
        }
      }
    }

    _drawSwarm(g) {
      const img = Art.spark(this.skin.mid, 48);
      g.globalCompositeOperation = 'lighter';
      const t = this.t;
      for (const f of this.swarm) {
        const s = 20 + Math.sin(t * 6 + f.tw) * 5;
        g.drawImage(img, f.x - s / 2, f.y - s / 2, s, s);
      }
      g.globalCompositeOperation = 'source-over';
    }

    _drawLumi(g) {
      const lumi = this.lumi;
      if (lumi.inv > 0 && Math.floor(lumi.inv * 14) % 2 === 0 && this.state === 'play') g.globalAlpha = 0.45;
      else g.globalAlpha = lumi.alpha;
      Art.drawLumi(g, lumi.x, lumi.y, this.t, { skin: this.skin, vx: lumi.vx, vy: lumi.vy, blink: lumi.blink, mood: lumi.mood, power: lumi.power, scale: 1.22 });
      g.globalAlpha = 1;
      if (lumi.shield > 0) {
        const a = lumi.shield < 1.5 ? 0.5 + 0.5 * Math.sin(this.t * 20) : 1;
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.55 * a;
        g.drawImage(Art.glow('#7ab8ff', 128), lumi.x - 48, lumi.y - 48, 96, 96);
        g.globalAlpha = 1;
        g.strokeStyle = U.rgba('#cfe4ff', 0.7 * a);
        g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i <= 6; i++) {
          const an = (i / 6) * TAU + this.t;
          g.lineTo(lumi.x + Math.cos(an) * 30, lumi.y + Math.sin(an) * 30);
        }
        g.stroke();
        g.globalCompositeOperation = 'source-over';
      }
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

    _drawParts(g) {
      g.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        if (p.type === 'smoke') continue;
        const k = p.life / p.max;
        g.globalAlpha = k;
        const s = p.size * (0.4 + k * 0.6);
        g.drawImage(Art.glow(p.col, 64, 0.2), p.x - s / 2, p.y - s / 2, s, s);
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

    _drawMask(g) {
      const mg = this.mg, m = this.mask, sc = m.width / this.W;
      const dark = this.B.dark * (this.treeBloom ? 1 - this.treeBloom * 0.7 : 1);
      mg.globalCompositeOperation = 'source-over';
      mg.clearRect(0, 0, m.width, m.height);
      mg.fillStyle = U.rgba(this.B.skyTop, dark);
      mg.fillRect(0, 0, m.width, m.height);
      mg.globalCompositeOperation = 'destination-out';
      const disc = Art.softDisc(64);
      const cy = this.cam.y;
      const light = (x, y, r) => {
        const s = r * 2 * sc;
        mg.drawImage(disc, x * sc - s / 2, (y - cy) * sc - s / 2, s, s);
      };
      const lr = (150 + Math.sqrt(this.swarm.length) * 16) * this.lumi.alpha;
      light(this.lumi.x, this.lumi.y + 10, lr);
      light(this.lumi.x, this.lumi.y + 10, lr * 0.6);
      for (const e of this.ents) {
        if (e.dead || e.y < cy - 60 || e.y > cy + this.H + 60) continue;
        if (e.t === 'spark') light(e.x, e.y, 46);
        else if (e.t === 'power' || e.t === 'cocoon') light(e.x, e.y, 80);
        else if (e.t === 'golden') light(e.x, e.y, 90);
        else if (e.t === 'amber') light(e.x, e.y, 36);
      }
      if (this.tree) for (const ln of this.tree.lanterns) if (ln.lit) light(ln.x, this.endY - this.tree.H + ln.y, 90);
      if (this.flare.active) light(this.flare.x, this.flare.y, this.flare.r);
      g.drawImage(m, 0, 0, this.W, this.H);
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
