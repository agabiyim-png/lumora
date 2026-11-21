/* LUMORA v2 — mini boss ve boss karşılaşmaları: Gölge Muhafızı, Karanlık Güve Kraliçesi, Kristal Golem, Karanlığın Kalbi */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;
  const Art = L.Art;
  const TAU = U.TAU;

  const TIPS = {
    guardian: 'Önce dönen kristal kalkanı kır, sonra çekirdeği vur!',
    queen: 'Yavrularından kaç; kraliçe dalıştan dönerken savunmasızdır!',
    golem: 'Düşen kristallerden kaç, golemi parça parça kır!',
    heart: 'Kalkanı kır, yaratıklardan ve kristal yağmurundan kaç!',
  };

  class Boss {
    constructor(kind, scale, game) {
      this.kind = kind;
      this.scale = scale;
      this.name = L.BOSS_NAMES[kind];
      this.tip = TIPS[kind];
      this.W = game.W; this.H = game.H;
      const base = { guardian: 40, queen: 55, golem: 70, heart: 80 }[kind];
      this.maxHp = this.hp = Math.round(base * (scale < 1 ? 0.55 : 1));
      this.r = { guardian: 40, queen: 32, golem: 50, heart: 42 }[kind] * (0.85 + scale * 0.15);
      this.x = this.W / 2;
      this.y = game.cam.y - 140;
      this.homeY = game.cam.y + this.H * 0.24;
      this.t = 0;
      this.enter = 1.4;
      this.flash = 0;
      this.dead = false;
      this.alive = true;
      this.atk = 2.2;
      this.atk2 = 3.5;
      this.atk3 = 5;
      this.stage = 0;
      this.cracks = Art.makeCracks(77 + kind.length, this.r, 12);
      this.crackCol = kind === 'golem' ? '#bfe8ff' : '#ffd36b';
      if (kind === 'guardian' || kind === 'heart') {
        const n = kind === 'heart' ? (scale < 1 ? 4 : 6) : (scale < 1 ? 5 : 8);
        this.crys = [];
        for (let i = 0; i < n; i++) this.crys.push({ a: (i / n) * TAU, hp: 2, x: 0, y: 0, r: 14, dead: false, alive: true, isCrys: true });
        this.rot = 0;
        this.orbitR = this.r + 36;
      }
      if (kind === 'golem') {
        const rnd = U.rng(9);
        this.chunks = [];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + rnd() * 0.3;
          const d = this.r * (0.35 + rnd() * 0.45);
          this.chunks.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9, s: this.r * (0.35 + rnd() * 0.25), a: rnd() * TAU, n: 5 + ((rnd() * 2) | 0), off: false });
        }
      }
      if (kind === 'queen') { this.phase = 'fly'; this.phaseT = 0; this.diveT = 6; }
    }

    get enraged() { return this.hp < this.maxHp * 0.4; }
    get shielded() { return this.crys && this.crys.some((c) => !c.dead); }

    // otomatik nişan: kalkan varsa en yakın kristal, yoksa çekirdek
    aim(game) {
      if (this.enter > 0.2 || this.dead) return null;
      if (this.shielded) {
        let best = null, bd = Infinity;
        for (const c of this.crys) {
          if (c.dead) continue;
          const d = U.dist2(c.x, c.y, game.lumi.x, game.lumi.y);
          if (d < bd) { bd = d; best = c; }
        }
        return best;
      }
      return this;
    }

    shotHit(game, s) {
      if (this.enter > 0.2) return false;
      if (this.crys) {
        for (const c of this.crys) {
          if (c.dead) continue;
          if (U.dist2(s.x, s.y, c.x, c.y) < (c.r + 6) * (c.r + 6)) { this.damageAt(game, c, s.dmg); return true; }
        }
      }
      if (U.dist2(s.x, s.y, this.x, this.y) < (this.r + 6) * (this.r + 6)) {
        if (this.shielded) {
          game.burst(s.x, s.y, 5, '#bff8ff', 120, 12, 0.25);
          if (!this._deflT || this._deflT < this.t) { this._deflT = this.t + 1.2; game.text(this.x, this.y - this.r - 18, 'Kalkan!', '#bff8ff', 16); }
          return true;
        }
        this.damageAt(game, this, s.dmg);
        return true;
      }
      return false;
    }

    damageAt(game, target, dmg) {
      if (this.dead) return;
      if (target && target.isCrys) {
        if (target.dead) return;
        target.hp -= dmg;
        game._shards(target.x, target.y, 4, '#9ad8ff', '#ffffff', 160, 6);
        L.audio.crack && L.audio.crack(1.2);
        if (target.hp <= 0) {
          target.dead = true; target.alive = false;
          game._shards(target.x, target.y, 16, '#bfe8ff', '#ffffff', 300, 9);
          game.parts.push({ x: target.x, y: target.y, vx: 0, vy: 0, life: 0.4, max: 0.4, size: 90, col: '#bff8ff', type: 'ring', drag: 0 });
          L.audio.shatter && L.audio.shatter(5);
          game.cam.shake = Math.max(game.cam.shake, 6);
          U.vibrate(25);
          if (!this.shielded) {
            game.text(this.x, this.y - this.r - 30, 'KALKAN KIRILDI!', '#ffe08a', 24);
            game.flash = 0.5; game.flashCol = '#ffffff';
            L.audio.roar && L.audio.roar();
          }
        }
        return;
      }
      if (this.shielded) return;
      const mult = this.kind === 'queen' && this.phase === 'return' ? 2 : 1;
      this.hp -= dmg * mult;
      this.flash = 0.1;
      game._shards(this.x + U.rand(-this.r, this.r) * 0.5, this.y + U.rand(-this.r, this.r) * 0.5, 2, this.kind === 'golem' ? '#7ac8ff' : '#2a1040', '#ffffff', 160, 7);
      if (mult > 1 && Math.random() < 0.3) game.text(this.x, this.y - this.r - 10, 'x2', '#ffe08a', 18);
      // golem parça döker
      if (this.kind === 'golem') {
        const st = this.hp < this.maxHp * 0.33 ? 2 : this.hp < this.maxHp * 0.66 ? 1 : 0;
        if (st > this.stage) {
          this.stage = st;
          let n = 0;
          for (const c of this.chunks) {
            if (!c.off && n < 3) {
              c.off = true; n++;
              game._shards(this.x + c.x, this.y + c.y, 14, '#9ad8ff', '#ffffff', 300, 10);
            }
          }
          game.cam.shake = 12; game.flash = 0.4; game.flashCol = '#bfe8ff';
          L.audio.shatter && L.audio.shatter(7);
          L.audio.roar && L.audio.roar();
          game.text(this.x, this.y - this.r - 24, 'Golem çatlıyor!', '#bfe8ff', 22);
        }
      }
      L.ui.updateBoss(this.hp / this.maxHp);
      if (this.hp <= 0) this.die(game);
    }

    flareHit(game, fx, fy, r) {
      if (this.enter > 0.2 || this.dead) return;
      if (this.crys) for (const c of this.crys) if (!c.dead && U.dist2(c.x, c.y, fx, fy) < r * r) this.damageAt(game, c, 2);
      if (U.dist2(this.x, this.y, fx, fy) < (r + this.r) * (r + this.r)) this.damageAt(game, this, 6);
    }

    die(game) {
      this.dead = true;
      this.alive = false;
      game.onBossDefeated(this);
    }

    spawnOrb(game, x, y, a, sp, col) {
      game.addEnt({ t: 'orb', x, y, r: 9, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 6, col: col || null });
    }
    spawnMoth(game, x, y) {
      game.addEnt({ t: 'moth', x, y, r: 14, state: 'charge', timer: -0.3, hx: x, ph: Math.random() * 6, speed: 360 + this.scale * 60, minion: true, ang: Math.PI / 2 });
    }
    crystalRain(game, n) {
      for (let i = 0; i < n; i++) {
        const x = i === 0 ? game.lumi.x : U.rand(30, this.W - 30);
        game.ents.push({ t: 'meteor', crystal: true, x, y: game.cam.y - 60, r: 13, vx: U.rand(-30, 30), vy: 390, warn: 0.8 + i * 0.12, dead: false });
      }
    }

    update(game, dt) {
      if (this.dead) return;
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt);
      const lumi = game.lumi;
      const rage = this.enraged ? 1.45 : 1;
      if (this.enter > 0) {
        this.enter -= dt;
        this.y = U.damp(this.y, this.homeY, 3, dt);
        return;
      }
      const k = this.kind;
      if (k === 'guardian' || k === 'heart') {
        this.x = this.W / 2 + Math.sin(this.t * 0.6) * this.W * 0.22;
        this.y = this.homeY + Math.sin(this.t * 1.1) * 14;
        this.rot += dt * (0.7 + (this.shielded ? 0 : 0.6));
        for (const c of this.crys) {
          c.x = this.x + Math.cos(c.a + this.rot) * this.orbitR;
          c.y = this.y + Math.sin(c.a + this.rot) * this.orbitR * 0.8;
        }
        this.atk -= dt * rage;
        if (this.atk <= 0) {
          this.atk = 2.4;
          const n = (this.enraged ? 5 : 3) + (this.scale >= 1 ? 0 : -1);
          const base = Math.atan2(lumi.y - this.y, lumi.x - this.x);
          for (let i = 0; i < n; i++) this.spawnOrb(game, this.x, this.y + this.r * 0.4, base + (i - (n - 1) / 2) * 0.26, 150 + this.scale * 40);
          L.audio.bossShot && L.audio.bossShot();
        }
        if (k === 'heart') {
          this.atk2 -= dt;
          if (this.atk2 <= 0) { this.atk2 = 4.6; this.spawnMoth(game, this.x - 50, this.y); if (this.scale >= 1) this.spawnMoth(game, this.x + 50, this.y); }
          this.atk3 -= dt;
          if (this.atk3 <= 0) { this.atk3 = 6.5; this.crystalRain(game, 3 + Math.round(this.scale * 2)); L.audio.warn(); }
        }
      } else if (k === 'queen') {
        this.phaseT += dt;
        if (this.phase === 'fly') {
          this.x = this.W / 2 + Math.sin(this.t * 0.8) * this.W * 0.3;
          this.y = U.damp(this.y, this.homeY + Math.sin(this.t * 2) * 10, 4, dt);
          this.atk -= dt * rage;
          if (this.atk <= 0) {
            this.atk = 3.2;
            this.spawnMoth(game, this.x - 30, this.y + 10);
            if (this.scale >= 1 || this.enraged) this.spawnMoth(game, this.x + 30, this.y + 10);
            L.audio.bossShot && L.audio.bossShot();
          }
          this.diveT -= dt;
          if (this.diveT <= 0) { this.phase = 'tele'; this.phaseT = 0; L.audio.warn(); this.tx = lumi.x; this.ty = lumi.y; }
        } else if (this.phase === 'tele') {
          this.tx = lumi.x; this.ty = lumi.y;
          this.x += Math.sin(this.t * 60) * 1.5;
          if (this.phaseT > 0.9) { this.phase = 'dive'; this.phaseT = 0; L.audio.whoosh(); }
        } else if (this.phase === 'dive') {
          const a = Math.atan2(this.ty - this.y, this.tx - this.x);
          this.x += Math.cos(a) * 560 * dt;
          this.y += Math.sin(a) * 560 * dt;
          if (this.phaseT > 0.9 || U.dist2(this.x, this.y, this.tx, this.ty) < 400) { this.phase = 'return'; this.phaseT = 0; }
        } else if (this.phase === 'return') {
          this.y = U.damp(this.y, this.homeY, 1.6, dt);
          if (this.phaseT > 1.8) { this.phase = 'fly'; this.phaseT = 0; this.diveT = this.enraged ? 4.5 : 6; }
        }
      } else if (k === 'golem') {
        const sp = 1 + this.stage * 0.35;
        this.x = this.W / 2 + Math.sin(this.t * 0.4 * sp) * this.W * 0.16;
        this.y = this.homeY + Math.sin(this.t * 0.9) * 8;
        this.atk -= dt * sp;
        if (this.atk <= 0) {
          this.atk = 3.4;
          this.slamT = 0.6;
          L.audio.roar && L.audio.roar();
        }
        if (this.slamT > 0) {
          this.slamT -= dt;
          if (this.slamT <= 0) {
            this.crystalRain(game, 4 + Math.round(this.scale * 2) + this.stage);
            game.cam.shake = 10;
            U.vibrate(40);
          }
        }
        this.atk2 -= dt * sp;
        if (this.atk2 <= 0) {
          this.atk2 = 5;
          const n = 8 + this.stage * 2;
          for (let i = 0; i < n; i++) this.spawnOrb(game, this.x, this.y, (i / n) * TAU + this.t, 120, '#7ac8ff');
          L.audio.bossShot && L.audio.bossShot();
        }
      }
      // gövde teması
      const rr = this.r * 0.85 + 10;
      if (U.dist2(this.x, this.y, lumi.x, lumi.y) < rr * rr) game.hitLumi(null);
      if (this.crys) for (const c of this.crys) if (!c.dead && U.dist2(c.x, c.y, lumi.x, lumi.y) < (c.r + 9) * (c.r + 9)) game.hitLumi(null);
    }

    draw(g, game) {
      if (this.dead) return;
      const B = game.B, t = this.t, k = this.kind;
      const fl = this.flash > 0;
      if (k === 'guardian' || k === 'heart') {
        if (k === 'heart') {
          // atan karanlık kalp
          const p = 1 + Math.sin(t * 5) * 0.06 + (this.enraged ? Math.sin(t * 11) * 0.04 : 0);
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = 0.6;
          g.drawImage(Art.glow('#ff2a55', 256), this.x - this.r * 3, this.y - this.r * 3, this.r * 6, this.r * 6);
          g.globalAlpha = 1;
          g.globalCompositeOperation = 'source-over';
          const hg = g.createRadialGradient(this.x - this.r * 0.3, this.y - this.r * 0.3, 2, this.x, this.y, this.r * p);
          hg.addColorStop(0, fl ? '#ffffff' : '#ff5f8a'); hg.addColorStop(0.35, '#5a0f2a'); hg.addColorStop(1, '#12020c');
          g.fillStyle = hg;
          g.beginPath(); g.arc(this.x, this.y, this.r * p, 0, TAU); g.fill();
          g.strokeStyle = U.rgba('#ff4f7a', 0.6); g.lineWidth = 1.5;
          for (let i = 0; i < 6; i++) {
            const a = i * 1.05 + t * 0.2;
            g.beginPath(); g.moveTo(this.x, this.y);
            g.quadraticCurveTo(this.x + Math.cos(a + 0.4) * this.r * 0.6, this.y + Math.sin(a + 0.4) * this.r * 0.6, this.x + Math.cos(a) * this.r * p, this.y + Math.sin(a) * this.r * p);
            g.stroke();
          }
        } else {
          Art.drawWisp(g, this.x, this.y, this.r, t, B, fl, 3);
          // miğfer benzeri taç
          g.fillStyle = U.mix(B.shadow, '#000000', 0.3);
          g.beginPath();
          g.moveTo(this.x - this.r * 0.8, this.y - this.r * 0.5);
          g.lineTo(this.x - this.r * 0.5, this.y - this.r * 1.25);
          g.lineTo(this.x - this.r * 0.15, this.y - this.r * 0.8);
          g.lineTo(this.x, this.y - this.r * 1.45);
          g.lineTo(this.x + this.r * 0.15, this.y - this.r * 0.8);
          g.lineTo(this.x + this.r * 0.5, this.y - this.r * 1.25);
          g.lineTo(this.x + this.r * 0.8, this.y - this.r * 0.5);
          g.closePath(); g.fill();
          g.strokeStyle = U.rgba(B.shadowRim, 0.8); g.lineWidth = 2; g.stroke();
        }
        // kalkan kristalleri
        for (const c of this.crys) {
          if (c.dead) continue;
          g.save();
          g.translate(c.x, c.y);
          g.rotate(c.a + this.rot + Math.PI / 2);
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = 0.6;
          g.drawImage(Art.glow('#7ad8ff', 64), -24, -24, 48, 48);
          g.globalAlpha = 1;
          g.globalCompositeOperation = 'source-over';
          const cg = g.createLinearGradient(-8, 0, 8, 0);
          cg.addColorStop(0, '#5fb8ff'); cg.addColorStop(0.5, '#eaf8ff'); cg.addColorStop(1, '#2a5aa0');
          g.fillStyle = cg;
          g.beginPath(); g.moveTo(0, -18); g.lineTo(9, -4); g.lineTo(6, 14); g.lineTo(-6, 14); g.lineTo(-9, -4); g.closePath(); g.fill();
          if (c.hp < 2) {
            g.strokeStyle = '#ffffff'; g.lineWidth = 1.4;
            g.beginPath(); g.moveTo(-5, -10); g.lineTo(1, -2); g.lineTo(-3, 4); g.lineTo(3, 12); g.stroke();
          }
          g.restore();
        }
        if (this.crys && this.shielded) {
          g.strokeStyle = U.rgba('#7ad8ff', 0.18 + 0.08 * Math.sin(t * 4));
          g.lineWidth = 2;
          g.beginPath(); g.ellipse(this.x, this.y, this.orbitR, this.orbitR * 0.8, 0, 0, TAU); g.stroke();
        }
      } else if (k === 'queen') {
        const charging = this.phase === 'tele';
        if (charging) {
          g.strokeStyle = U.rgba('#ff3355', 0.3 + 0.3 * Math.sin(t * 30));
          g.lineWidth = 3; g.setLineDash([10, 10]);
          g.beginPath(); g.moveTo(this.x, this.y); g.lineTo(this.tx, this.ty); g.stroke(); g.setLineDash([]);
        }
        const ang = this.phase === 'dive' ? Math.atan2(this.ty - this.y, this.tx - this.x) : Math.PI / 2;
        Art.drawMoth(g, this.x, this.y, this.r * 1.35, t, B, ang, charging || this.phase === 'dive');
        if (this.phase === 'return') {
          g.globalCompositeOperation = 'lighter';
          g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 12);
          g.drawImage(Art.glow('#ffe08a', 128), this.x - 50, this.y - 50, 100, 100);
          g.globalAlpha = 1;
          g.globalCompositeOperation = 'source-over';
        }
        // taç
        g.fillStyle = '#ffd36b';
        const cy = this.y - this.r * 0.95;
        g.beginPath();
        g.moveTo(this.x - 12, cy + 6); g.lineTo(this.x - 10, cy - 6); g.lineTo(this.x - 4, cy); g.lineTo(this.x, cy - 9); g.lineTo(this.x + 4, cy); g.lineTo(this.x + 10, cy - 6); g.lineTo(this.x + 12, cy + 6);
        g.closePath(); g.fill();
        if (fl) {
          g.globalCompositeOperation = 'lighter';
          g.drawImage(Art.glow('#ffffff', 128), this.x - this.r * 1.5, this.y - this.r * 1.5, this.r * 3, this.r * 3);
          g.globalCompositeOperation = 'source-over';
        }
      } else if (k === 'golem') {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.5 + (this.slamT > 0 ? 0.4 : 0);
        g.drawImage(Art.glow('#5fb8ff', 256), this.x - this.r * 2.6, this.y - this.r * 2.6, this.r * 5.2, this.r * 5.2);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
        // gövde
        const bg = g.createRadialGradient(this.x - this.r * 0.3, this.y - this.r * 0.3, 4, this.x, this.y, this.r);
        bg.addColorStop(0, fl ? '#ffffff' : '#3a5a8a'); bg.addColorStop(1, '#0c1430');
        g.fillStyle = bg;
        g.beginPath(); g.arc(this.x, this.y, this.r * 0.72, 0, TAU); g.fill();
        for (const c of this.chunks) {
          if (c.off) continue;
          g.save();
          g.translate(this.x + c.x, this.y + c.y + Math.sin(t * 2 + c.a) * 1.5);
          g.rotate(c.a);
          const cg = g.createLinearGradient(-c.s, -c.s, c.s, c.s);
          cg.addColorStop(0, fl ? '#ffffff' : '#cdeeff'); cg.addColorStop(0.5, '#5fa8e8'); cg.addColorStop(1, '#1a3a70');
          g.fillStyle = cg;
          g.beginPath();
          for (let i = 0; i < c.n; i++) { const a = (i / c.n) * TAU; const rr = c.s * (i % 2 ? 0.75 : 1); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(230,248,255,0.7)'; g.lineWidth = 1.2; g.stroke();
          g.restore();
        }
        // göz
        g.globalCompositeOperation = 'lighter';
        const ec = this.slamT > 0 ? '#ff4f7a' : '#8fffe0';
        g.drawImage(Art.glow(ec, 64, 0.3), this.x - 16, this.y - 14, 32, 32);
        g.globalCompositeOperation = 'source-over';
      }
      // çatlaklar
      Art.drawCracks(g, this);
    }
  }

  L.Boss = Boss;

  // ---------- Game entegrasyonu ----------
  Object.assign(L.Game.prototype, {
    _startBoss() {
      const cfg = this.bossCfg;
      this.state = 'boss';
      this.bossStartT = this.t;
      this.boss = new Boss(cfg.kind, cfg.scale, this);
      // ekrandaki engeller temizlenir
      for (const e of this.ents) {
        if (e.dead) continue;
        if (L.KILLABLE[e.t] && e.y > this.cam.y - 80) this.purify(e);
        if (e.t === 'vine') { if (e.maxY > this.cam.y - 200) e.dead = true; }
        else if ((e.t === 'wheel' || e.t === 'web' || e.t === 'trigger' || e.t === 'cocoon') && e.y > this.cam.y - 200) e.dead = true;
      }
      this.chase = null;
      this.meteorQueue.length = 0;
      this.lumi.fireT = 1.4;
      L.audio.roar && L.audio.roar();
      L.audio.targetIntensity = 1;
      this.cam.shake = 10;
      U.vibrate(80);
      L.ui.bossIntro(this.boss.name, this.boss.tip, cfg.scale < 1);
      this._hint('bossfire', 'Boss savaşında Lumi otomatik ışık oku atar — sen saldırılardan kaç ve doğru anda Işık Patlaması kullan!');
    },

    onBossDefeated(b) {
      const cfg = this.bossCfg;
      this.bossDone = true;
      this.bossTime = this.t - this.bossStartT;
      this.slowmo = 1.1;
      this.flash = 1;
      this.flashCol = '#ffffff';
      this.cam.shake = 24;
      U.vibrate(200);
      L.audio.bossDown && L.audio.bossDown();
      const col = b.kind === 'golem' ? '#bfe8ff' : b.kind === 'heart' ? '#ff7a9a' : this.B.shadowRim;
      this._shards(b.x, b.y, 48, b.kind === 'golem' ? '#7ac8ff' : this.B.shadow, '#ffffff', 420, 13);
      for (let i = 0; i < 3; i++) this.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.6 + i * 0.25, max: 0.6 + i * 0.25, size: 260 + i * 160, col: i ? col : '#ffffff', type: 'ring', drag: 0 });
      this.burst(b.x, b.y, 60, '#ffe08a', 420, 30, 1.2);
      for (const e of this.ents) if (!e.dead && L.KILLABLE[e.t]) this.purify(e);
      for (let k = 0; k < 40; k++) {
        const a = Math.random() * TAU, s = U.rand(100, 360);
        this.ents.push({ t: 'spark', x: b.x, y: b.y, r: 7, ph: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, fly: 0.5 + Math.random() * 0.5, dead: false });
      }
      this.lightRain(5);
      const amber = Math.round(30 + cfg.scale * 30);
      this.run.amber += amber;
      this.run.bosses = (this.run.bosses || 0) + 1;
      const sd = L.save.data;
      sd.stats.bosses++;
      if (cfg.scale >= 1) {
        const ach = { guardian: 'boss1', queen: 'boss2', golem: 'boss3', heart: 'biome4' }[b.kind];
        setTimeout(() => L.ui.achieve(ach), 1600);
        if (cfg.unlock && !sd.abilities[cfg.unlock]) {
          sd.abilities[cfg.unlock] = Date.now();
          this.pendingUnlock = cfg.unlock;
        }
        L.save.write();
      }
      L.ui.bossEnd();
      L.ui.celebrate('ZAFER!', `${b.name} yenildi · +${amber} ⬢`, '#ffe08a');
      setTimeout(() => { if (this.state === 'boss') { this.state = 'play'; L.audio.targetIntensity = 0.3; } }, 2600);
    },

    // ekrana yumuşak ışık yağmuru
    lightRain(sec) { this.rainT = Math.max(this.rainT || 0, sec); },
    _updateRain(dt) {
      if (!(this.rainT > 0)) return;
      this.rainT -= dt;
      const cols = ['#ffd36b', '#8fffe0', '#ff9fd8', '#b78cff', '#ffffff'];
      for (let i = 0; i < 3; i++) {
        if (this.parts.length > 540) return;
        this.parts.push({ x: U.rand(0, this.W), y: this.cam.y - 10, vx: U.rand(-15, 15), vy: U.rand(90, 200), life: 3, max: 3, size: U.rand(10, 22), col: U.pick(cols), type: 'glow', drag: 0.2 });
      }
    },

    _updateOrb(e, dt) {
      e.life -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.life <= 0 || e.x < -40 || e.x > this.W + 40 || e.y > this.cam.y + this.H + 60) { e.dead = true; return; }
      this._hazardTouch(e, e.r, dt);
    },
    _drawOrb(g, e) {
      const col = e.col || this.B.shadowRim;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.7;
      g.drawImage(Art.glow(col, 64), e.x - 22, e.y - 22, 44, 44);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const og = g.createRadialGradient(e.x - 3, e.y - 3, 1, e.x, e.y, e.r);
      og.addColorStop(0, e.col ? '#ffffff' : U.mix(col, '#ffffff', 0.4));
      og.addColorStop(0.4, e.col ? col : this.B.shadow);
      og.addColorStop(1, e.col ? U.mix(col, '#000000', 0.5) : '#000000');
      g.fillStyle = og;
      g.beginPath(); g.arc(e.x, e.y, e.r, 0, TAU); g.fill();
    },
  });
})();
