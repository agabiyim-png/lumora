/* LUMORA v2 — savaş sistemi, kırılma efektleri, ödüller, bölgeler ve dekor.
   Game sınıfına mixin olarak eklenir (mevcut mimari korunur). */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;
  const Art = L.Art;
  const TAU = U.TAU;

  // Düşman canları (vuruş sayısı)
  const HP = { wisp: 2, moth: 2, jelly: 3, meteor: 1, orb: 1 };
  const KILLABLE = { wisp: 1, moth: 1, jelly: 1, meteor: 1, orb: 1 };
  L.KILLABLE = KILLABLE;

  // Güçlendirme tabloları (seviye ilerledikçe yenileri açılır)
  function powerPool(li) {
    const pool = [['shield', 22], ['magnet', 18], ['prism', 16], ['nova', 12]];
    if (li < 0 || li >= 2) pool.push(['bolt', 24]);
    if (li < 0 || li >= 4) pool.push(['star', 8]);
    if (li < 0 || li >= 6) pool.push(['chain', 7]);
    return pool;
  }
  function roll(pool) {
    let tot = 0;
    for (const p of pool) tot += p[1];
    let r = Math.random() * tot;
    for (const p of pool) { r -= p[1]; if (r <= 0) return p[0]; }
    return pool[0][0];
  }
  const RARITY = { magnet: 0, prism: 0, nova: 0, shield: 1, bolt: 1, star: 2, chain: 2, jackpot: 2 };
  const RARITY_NAME = ['Sıradan', 'Nadir', 'Efsanevi'];
  const RARITY_COL = ['#dff6ff', '#9ad0ff', '#ffd36b'];
  const POWER_NAME = { shield: 'Işık Kalkanı!', magnet: 'Işık Mıknatısı!', nova: 'Süper Nova!', prism: 'Çift Kıvılcım!', bolt: 'Işık Mermileri!', chain: 'Yıldırım Zinciri!', star: 'Yıldız Gücü!' };
  L.powerPool = powerPool;
  L.rollPower = roll;

  const M = {
    initV2() {
      this.shots = [];
      this.bolts = [];
      this.trail = [];
      this.killChain = { n: 0, t: 0 };
      this.secretT = 0;
      this.goldRain = 0;
      this.bossDone = false;
      this.boss = null;
      this.zoneIdx = -1;
      this.zoneT = 0;
      this.zoneMsg = null;
      const lumi = this.lumi;
      lumi.shieldMax = 3 + Math.ceil(L.save.data.upgrades.shield / 2);
      lumi.shield = 0;
      lumi.shieldHit = 0;
      lumi.star = 0;
      lumi.bolt = 0;
      lumi.chain = 0;
      lumi.chainT = 0;
      lumi.fireT = 0;
      lumi.arrowT = 1.5;
      this.ab = this.demo ? {} : L.save.data.abilities;
      if (this.ab.shell && !this.demo) { lumi.shield = 2; lumi.shieldMax = Math.max(lumi.shieldMax, 2); }
      const zs = L.ZONES[this.biome];
      this.zc = { top: U.hexToRgb(zs[0].top), bot: U.hexToRgb(zs[0].bot), fog: U.hexToRgb(zs[0].fog) };
      this.zcTarget = zs[0];
      this._rebuildSky(true);
      this.bossCfg = this.level ? L.BOSSES[this.levelIndex] : null;
      if (this.bossCfg && this.level) this.bossCamY = this.endY + this.H * 0.42;
      for (const m of this.motes) { m.c = U.pick(zs[0].cols); m.img = null; }
    },

    // ---------- bölgeler (yolculuk boyunca değişen renk ve bitki örtüsü) ----------
    zoneAt(y) {
      if (this.endless) return Math.floor(-y / 1500) % 3;
      if (!this.level) return 0;
      return Math.min(2, Math.floor(U.clamp(y / this.endY, 0, 0.999) * 3));
    },
    _spawnDecor(y) {
      const zs = L.ZONES[this.biome][Math.max(0, this.zoneIdx)];
      const side = Math.random() < 0.5 ? 0 : 1;
      const col = U.pick(zs.cols);
      this.addEnt({ t: 'decor', x: side ? this.W + 2 : -2, y, side, spr: Art.decor(U.pick(zs.flora), col, (Math.random() * 6) | 0), s: 0.75 + Math.random() * 0.4, ph: Math.random() * 6, col, r: 0 });
    },
    _updateZones(dt) {
      if (this.demo) {
        if (this._dd == null) this._dd = this.cam.y + this.H;
        while (this._dd > this.cam.y - 120) { this._spawnDecor(this._dd); this._dd -= U.rand(200, 320); }
        for (const e of this.ents) if (e.t === 'decor' && e.y > this.cam.y + this.H + 200) e.dead = true;
        if (this.ents.length > 40) this.ents = this.ents.filter((e) => !e.dead);
      }
      const zi = this.demo ? Math.floor(this.t / 12) % 3 : this.zoneAt(this.cam.y + this.H * 0.5);
      const zs = L.ZONES[this.biome];
      if (zi !== this.zoneIdx) {
        const first = this.zoneIdx < 0;
        this.zoneIdx = zi;
        this.zcTarget = zs[zi];
        if (!first && !this.demo) {
          this.zoneMsg = { name: zs[zi].name, t: 0 };
          L.audio.zone && L.audio.zone();
          for (const m of this.motes) { m.c = U.pick(zs[zi].cols); m.img = null; }
        } else if (first) {
          this.zoneMsg = this.demo ? null : { name: zs[zi].name, t: -2.6 };
          for (const m of this.motes) { m.c = U.pick(zs[zi].cols); m.img = null; }
        }
      }
      // renkleri yumuşakça hedefe kaydır
      const tg = this.zcTarget;
      let changed = false;
      for (const k of ['top', 'bot', 'fog']) {
        const cur = this.zc[k], dst = U.hexToRgb(tg[k]);
        for (let i = 0; i < 3; i++) {
          const nv = U.damp(cur[i], dst[i], 0.8, dt);
          if (Math.abs(nv - cur[i]) > 0.05) changed = true;
          cur[i] = nv;
        }
      }
      this.zoneT += dt;
      if (changed && this.zoneT > 0.25) { this.zoneT = 0; this._rebuildSky(); }
      if (this.zoneMsg) { this.zoneMsg.t += dt; if (this.zoneMsg.t > 3.2) this.zoneMsg = null; }
    },
    // Gökyüzü önbelleği: gradyan + yıldızlar + ay + diyara özgü sabit ışıklar tek tuvalde.
    // Yalnızca bölge rengi değişirken (en fazla 4 kez/sn) yeniden çizilir; oyun karesinde tek drawImage.
    _rebuildSky() {
      const W = this.W, H = this.H, B = this.B;
      const cv = this.skyCanvas || (this.skyCanvas = U.makeCanvas(Math.ceil(W * 0.75), Math.ceil(H * 0.75)));
      const g = cv.getContext('2d');
      g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      const grd = g.createLinearGradient(0, 0, 0, H);
      const c = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
      grd.addColorStop(0, c(this.zc.top));
      grd.addColorStop(1, c(this.zc.bot));
      this.skyGrad = grd;
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      const L0 = this.bg && this.bg.layers[0];
      if (L0) { g.globalAlpha = L0.alpha; g.drawImage(L0.canvas, 0, 0, W, H, 0, 0, W, H); g.globalAlpha = 1; }
      g.globalCompositeOperation = 'lighter';
      if (B.id === 'peak') {
        const cols = ['#5fffc0', '#9a7bff', '#ff7ad8'];
        for (let k = 0; k < 3; k++) {
          const ag = g.createLinearGradient(0, 0, 0, H * 0.5);
          ag.addColorStop(0, U.rgba(cols[k], 0)); ag.addColorStop(0.5, U.rgba(cols[k], 0.16)); ag.addColorStop(1, U.rgba(cols[k], 0));
          g.fillStyle = ag;
          g.beginPath();
          const base = H * (0.12 + k * 0.08);
          g.moveTo(0, base);
          for (let x = 0; x <= W; x += W / 16) g.lineTo(x, base + Math.sin(x * 0.012 + k * 2) * 40 + Math.sin(x * 0.03) * 14);
          for (let x = W; x >= 0; x -= W / 16) g.lineTo(x, base + 160 + Math.sin(x * 0.01 + k) * 50);
          g.closePath(); g.fill();
        }
      } else if (B.id === 'garden') {
        for (let i = 0; i < 4; i++) {
          const x = W * (0.15 + i * 0.25);
          const rg = g.createLinearGradient(x, 0, x - 120, H);
          rg.addColorStop(0, U.rgba(B.accent, 0.14)); rg.addColorStop(1, U.rgba(B.accent, 0));
          g.fillStyle = rg;
          g.beginPath(); g.moveTo(x - 20, 0); g.lineTo(x + 30, 0); g.lineTo(x - 60, H); g.lineTo(x - 200, H); g.fill();
        }
      } else if (B.id === 'cave') {
        g.globalAlpha = 0.22;
        g.drawImage(Art.glow(B.accent, 256), -W * 0.3, H * 0.2, W * 0.9, W * 0.9);
        g.drawImage(Art.glow(B.glow2, 256), W * 0.5, H * 0.5, W * 0.9, W * 0.9);
        g.globalAlpha = 1;
      }
      // kenarlarda hafif vinyet (eskiden her karede ayrı tam ekran çizimdi)
      g.globalCompositeOperation = 'source-over';
      const vg = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,0.35)');
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      if (this.moonSpr) {
        g.drawImage(this.moonSpr, W * 0.72 - 130, H * 0.16 - 130, 260, 260);
        g.globalAlpha = 0.3;
        g.drawImage(Art.glow(B.rim, 256), W * 0.72 - 110, H * 0.16 - 110, 220, 220);
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-over';
      this.fogHex = '#' + this.zc.fog.map((v) => (v | 0).toString(16).padStart(2, '0')).join('');
      this.topHex = '#' + this.zc.top.map((v) => (v | 0).toString(16).padStart(2, '0')).join('');
    },

    // ---------- iz ve ışık ----------
    _updateTrail(dt) {
      // halka tampon: her karede yeni nesne oluşturulmaz
      const lumi = this.lumi, tr = this.trail;
      let p = tr.length >= 18 ? tr.pop() : { x: 0, y: 0 };
      p.x = lumi.x; p.y = lumi.y;
      tr.unshift(p);
    },
    _drawTrail(g) {
      const tr = this.trail;
      if (tr.length < 3) return;
      g.globalCompositeOperation = 'lighter';
      const col = this.lumi.star > 0 ? null : this.skin.mid;
      for (let i = 1; i < tr.length; i++) {
        const k = 1 - i / tr.length;
        const s = 26 * k + 6;
        const c = col || ['#ff7ad8', '#ffd36b', '#7affd8', '#9a7bff'][i % 4];
        g.globalAlpha = 0.5 * k;
        g.drawImage(Art.glow(c, 64, 0.2), tr[i].x - s / 2, tr[i].y - s / 2 + 6, s, s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },

    // ---------- hasar sistemi ----------
    damage(e, amt, sx, sy) {
      if (e.dead) return false;
      if (e.t === 'crystal') return this._hitCrystal(e, amt);
      if (!KILLABLE[e.t]) return false;
      if (e.maxHp == null) {
        e.maxHp = e.hp = HP[e.t] || 1;
        e.cracks = Art.makeCracks((e.x * 13 + e.y * 7) | 0, e.r, 4);
        e.crackCol = this.B.shadowRim;
      }
      e.hp -= amt;
      e.flash = 0.1;
      if (e.hp <= 0) {
        this.purify(e);
        return true;
      }
      L.audio.crack && L.audio.crack(0.6);
      this.burst(e.x, e.y, 5, '#ffffff', 120, 12, 0.3);
      this._shards(e.x, e.y, 3, this.B.shadow, this.B.shadowRim, 120, 5);
      return false;
    },

    // Kırılma: koyu parçalar saçılır, sonra ışık kıvılcımına dönüşüp söner
    _shards(x, y, n, col, rim, speed, size) {
      for (let i = 0; i < n; i++) {
        if (this.parts.length > 560) return;
        const a = Math.random() * TAU, s = speed * (0.4 + Math.random() * 0.8);
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7 + Math.random() * 0.4, max: 1.1, size: size * (0.6 + Math.random() * 0.8), col, rim, type: 'shard', drag: 2.4, rot: Math.random() * TAU, vr: U.rand(-12, 12) });
      }
    },
    shatter(e, big) {
      const B = this.B;
      const n = big ? 26 : 12;
      this._shards(e.x, e.y, n, U.mix(B.shadow, '#000000', 0.2), U.mix(B.shadowRim, '#ffffff', 0.3), big ? 320 : 220, big ? 10 : 7);
      this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: e.r * (big ? 5 : 3.2), col: '#ffffff', type: 'ring', drag: 0 });
      this._chainKill(e.x, e.y);
      L.save.data.stats.kills++;
    },
    _chainKill(x, y) {
      const kc = this.killChain;
      kc.n = kc.t > 0 ? kc.n + 1 : 1;
      kc.t = 0.75;
      L.audio.shatter && L.audio.shatter(Math.min(kc.n, 8));
      if (kc.n >= 2) {
        const words = ['', '', 'İkili!', 'Üçlü!', 'Dörtlü!', 'Zincirleme Patlama!'];
        const w = kc.n < 6 ? words[kc.n] : `Zincir x${kc.n}!`;
        // tek bir kombo yazısı güncellenir (ekran kalabalığını önler)
        const ct = this.comboText;
        if (ct && ct.life > 0.2 && this.texts.indexOf(ct) >= 0) {
          ct.str = w; ct.life = ct.max = 1.4; ct.size = 20 + Math.min(kc.n, 6) * 3; ct.col = kc.n >= 4 ? '#ffe08a' : '#bff8ff'; ct.w = null;
        } else this.comboText = this.text(x, y - 46, w, kc.n >= 4 ? '#ffe08a' : '#bff8ff', 20 + Math.min(kc.n, 6) * 3);
        this.cam.shake = Math.max(this.cam.shake, 4 + kc.n * 1.5);
        this.flash = Math.max(this.flash, 0.15 + kc.n * 0.04);
        this.flashCol = '#ffffff';
        if (kc.n >= 3) this.burst(x, y, 10 + kc.n * 3, '#ffe08a', 280, 22, 0.7);
        if (kc.n >= 5) L.ui.achieve('chain5');
        U.vibrate(10 + kc.n * 6);
      }
    },

    // ---------- otomatik saldırı ----------
    _nearestEnemy(range, preferAbove) {
      const lumi = this.lumi;
      let best = null, bd = range * range;
      for (const e of this.ents) {
        if (e.dead || !(KILLABLE[e.t] || e.t === 'crystal')) continue;
        if (e.t === 'meteor' && e.warn > 0) continue;
        if (e.y < this.cam.y - 20 || e.y > this.cam.y + this.H) continue;
        let d = U.dist2(e.x, e.y, lumi.x, lumi.y);
        if (e.t === 'crystal') d *= 1.6;
        if (preferAbove && e.y > lumi.y + 80) d *= 2.2;
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    fireShot(target, dmg, col, speed) {
      const lumi = this.lumi;
      const tx = target.x, ty = target.y;
      const a = Math.atan2(ty - lumi.y, tx - lumi.x) + U.rand(-0.25, 0.25);
      const sp = speed || 520;
      this.shots.push({ x: lumi.x, y: lumi.y - 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, tgt: target, life: 1.6, dmg: dmg || 1, col: col || '#ffe08a', sp });
      L.audio.zap && L.audio.zap();
      this.part(lumi.x, lumi.y - 8, 0, 0, 0.18, 30, col || '#ffe08a', 'glow', 0);
    },
    _updateCombat(dt) {
      const lumi = this.lumi;
      const playing = this.state === 'play' || this.state === 'boss';
      lumi.bolt = Math.max(0, lumi.bolt - dt);
      lumi.chain = Math.max(0, lumi.chain - dt);
      lumi.star = Math.max(0, lumi.star - dt);
      lumi.shieldHit = Math.max(0, lumi.shieldHit - dt * 3);
      this.secretT = Math.max(0, this.secretT - dt);
      if (this.killChain.t > 0) this.killChain.t -= dt;

      if (playing && !this.demo) {
        // ışık mermileri, yetenek oku ve boss savaşı otomatik ateşi
        lumi.fireT -= dt;
        lumi.arrowT -= dt;
        const inBoss = this.state === 'boss' && this.boss && !this.boss.dead;
        if (inBoss && lumi.fireT <= 0) {
          const tg = this.boss.aim(this);
          if (tg) { this.fireShot(tg, lumi.bolt > 0 ? 2 : 1, lumi.bolt > 0 ? '#fff2a0' : '#bff8ff', 600); lumi.fireT = lumi.bolt > 0 ? 0.16 : 0.24; }
        } else if (lumi.bolt > 0 && lumi.fireT <= 0) {
          const e = this._nearestEnemy(340, true);
          if (e) { this.fireShot(e, 1); lumi.fireT = 0.3; }
        }
        if (!inBoss && this.ab.arrow && lumi.bolt <= 0 && lumi.arrowT <= 0) {
          const e = this._nearestEnemy(260, true);
          if (e) { this.fireShot(e, 1, '#bff8ff', 460); lumi.arrowT = 1.5; }
        }
        // yıldırım zinciri
        if (lumi.chain > 0) {
          lumi.chainT -= dt;
          if (lumi.chainT <= 0) {
            if (this._castChain(6, 3, 340)) lumi.chainT = 0.95; else lumi.chainT = 0.15;
          }
        }
      }

      // mermiler
      for (let i = this.shots.length - 1; i >= 0; i--) {
        const s = this.shots[i];
        s.life -= dt;
        const t = s.tgt;
        if (t && !t.dead && t.alive !== false) {
          const a = Math.atan2(t.y - s.y, t.x - s.x);
          s.vx = U.damp(s.vx, Math.cos(a) * s.sp, 9, dt);
          s.vy = U.damp(s.vy, Math.sin(a) * s.sp, 9, dt);
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (Math.random() < 0.5) this.part(s.x, s.y, 0, 0, 0.25, 12, s.col, 'glow', 0);
        let hit = false;
        if (this.boss && !this.boss.dead && this.state === 'boss') hit = this.boss.shotHit(this, s);
        if (!hit) {
          for (const e of this.ents) {
            if (e.dead || !(KILLABLE[e.t] || e.t === 'crystal')) continue;
            if (e.t === 'meteor' && e.warn > 0) continue;
            const rr = e.r + 7;
            if (U.dist2(s.x, s.y, e.x, e.y) < rr * rr) { this.damage(e, s.dmg, s.x, s.y); hit = true; break; }
          }
        }
        if (hit) {
          this.burst(s.x, s.y, 7, s.col, 160, 16, 0.35);
          this.parts.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.25, max: 0.25, size: 46, col: s.col, type: 'ring', drag: 0 });
        }
        if (hit || s.life <= 0 || s.y < this.cam.y - 60 || s.y > this.cam.y + this.H + 60) this.shots.splice(i, 1);
      }
      // yıldırım görselleri
      for (let i = this.bolts.length - 1; i >= 0; i--) {
        const b = this.bolts[i];
        b.life -= dt;
        if (b.life <= 0) this.bolts.splice(i, 1);
      }
    },

    _castChain(maxN, dmg, range) {
      const lumi = this.lumi;
      const pool = this.ents.filter((e) => !e.dead && (KILLABLE[e.t] || e.t === 'crystal') && !(e.t === 'meteor' && e.warn > 0) && e.y > this.cam.y - 20 && e.y < this.cam.y + this.H);
      let cx = lumi.x, cy = lumi.y, r = range;
      const links = [];
      for (let k = 0; k < maxN; k++) {
        let best = null, bd = r * r;
        for (const e of pool) {
          if (e.__chained) continue;
          const d = U.dist2(cx, cy, e.x, e.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (!best) break;
        best.__chained = true;
        links.push([cx, cy, best]);
        cx = best.x; cy = best.y; r = 230;
      }
      let bossLink = null;
      if (this.boss && !this.boss.dead && this.state === 'boss' && links.length < maxN) {
        const bt = this.boss.aim(this);
        if (bt) bossLink = [cx, cy, bt];
      }
      if (!links.length && !bossLink) return false;
      for (const [x, y, e] of links) {
        e.__chained = false;
        this.bolts.push({ x1: x, y1: y, e, x2: e.x, y2: e.y, life: 0.32, col: '#b8c8ff' });
        this.damage(e, dmg, e.x, e.y);
        this.burst(e.x, e.y, 6, '#d8e4ff', 140, 16, 0.4);
      }
      if (bossLink) {
        this.bolts.push({ x1: bossLink[0], y1: bossLink[1], e: null, x2: bossLink[2].x, y2: bossLink[2].y, life: 0.32, col: '#b8c8ff' });
        this.boss.damageAt(this, bossLink[2], dmg);
      }
      L.audio.thunder && L.audio.thunder();
      this.flash = Math.max(this.flash, 0.18);
      this.flashCol = '#c8d8ff';
      this.cam.shake = Math.max(this.cam.shake, 4);
      U.vibrate(15);
      return true;
    },

    // ---------- güçlendirmeler ----------
    applyPowerV2(kind, x, y) {
      const lumi = this.lumi;
      const rar = RARITY[kind] || 0;
      if (rar >= 2) L.audio.rare && L.audio.rare(); else L.audio.powerup();
      U.vibrate(rar >= 2 ? 50 : 25);
      const col = Art.POWER_COL[kind] || '#ffffff';
      this.text(x, y - 30, POWER_NAME[kind] || kind, col === '#ffffff' ? '#fff6d0' : col, rar >= 2 ? 26 : 22);
      this.burst(x, y, rar >= 2 ? 36 : 22, col, 240, 22, 0.7);
      this.parts.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 140, col, type: 'ring', drag: 0 });
      switch (kind) {
        case 'shield':
          lumi.shield = lumi.shieldMax;
          lumi.shieldHit = 1;
          this._hint('shield2', 'Işık Kalkanı darbeleri emer; her darbede çatlar. Kalkana çarpan gölgeler parçalanır!');
          break;
        case 'magnet': lumi.magnet = 9; break;
        case 'prism': lumi.prism = 9; break;
        case 'nova': this.triggerFlare(true); break;
        case 'bolt':
          lumi.bolt = 9;
          lumi.fireT = 0;
          this._hint('bolt', 'Işık Mermileri: Lumi yakındaki düşmanlara kendiliğinden ateş eder. Sen sadece yönlendir!');
          break;
        case 'chain':
          lumi.chain = 8;
          lumi.chainT = 0;
          this._hint('chain', 'Yıldırım Zinciri: düşmanları birbirine bağlayan şimşekler! Kalabalık gölgelere yaklaş.');
          break;
        case 'star':
          lumi.star = 6;
          lumi.inv = 0;
          this.flash = 0.6;
          this.flashCol = '#ffffff';
          this._hint('star', 'Yıldız Gücü: birkaç saniye yenilmezsin. Gölgelerin içinden geç, hepsini parçala!');
          break;
      }
      lumi.mood = 'happy';
      lumi.moodT = 1.2;
    },

    // ---------- sandık, kristal küme, portal ----------
    _updateChest(e, dt) {
      const lumi = this.lumi;
      if (e.opening == null) {
        if (U.dist2(e.x, e.y, lumi.x, lumi.y) < 34 * 34) {
          e.opening = 0;
          const pool = powerPool(this.levelIndex);
          e.prize = Math.random() < 0.08 ? 'jackpot' : roll(pool);
          e.rar = RARITY[e.prize] || 0;
          L.audio.chest && L.audio.chest();
          U.vibrate(30);
          this.cam.shake = 5;
          L.save.data.stats.chests++;
          if (L.save.data.stats.chests >= 5) L.ui.achieve('chest5');
        }
        this._hint('chest', 'Büyülü sandık! İçinden rastgele bir güç çıkar. Altın parlayanlar efsanevi!');
        return;
      }
      e.opening += dt;
      if (e.opening > 0.55 && !e.given) {
        e.given = true;
        const rc = RARITY_COL[e.rar];
        this.text(e.x, e.y - 70, RARITY_NAME[e.rar], rc, 15);
        this.burst(e.x, e.y - 10, 30 + e.rar * 20, rc, 260, 24, 0.9);
        if (e.prize === 'jackpot') {
          this.text(e.x, e.y - 40, 'HAZİNE!', '#ffd36b', 30);
          L.audio.rare && L.audio.rare();
          this.run.amber += 30;
          for (let k = 0; k < 30; k++) {
            const a = Math.random() * TAU, s = U.rand(80, 300);
            this.ents.push({ t: 'spark', x: e.x, y: e.y - 10, r: 7, ph: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 100, fly: 0.4 + Math.random() * 0.3, dead: false });
          }
        } else this.applyPowerV2(e.prize, e.x, e.y - 10);
        if (e.rar >= 2) { this.flash = 0.7; this.flashCol = '#ffe9a0'; this.cam.shake = 9; }
      }
      if (e.opening > 2.2) e.dead = true;
    },

    _initCrystal(e) {
      if (e.prisms) return;
      const rnd = U.rng((e.x * 31 + e.y) | 0);
      e.prisms = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.38 + (rnd() - 0.5) * 0.2;
        e.prisms.push({ x: (i - 2.5) * 6, y: e.r * 0.5, a: a + Math.PI / 2, w: 11 + rnd() * 8, h: e.r * (0.9 + rnd() * 0.9) });
      }
      e.maxHp = e.hp = 5;
      e.cracks = Art.makeCracks((e.x + e.y) | 0, e.r, 6);
      e.crackCol = e.col;
      e.flash = 0; e.shake = 0;
    },
    _hitCrystal(e, amt) {
      this._initCrystal(e);
      e.hp -= amt;
      e.flash = 0.1;
      e.shake = 0.2;
      L.audio.crack && L.audio.crack(1);
      this._shards(e.x, e.y - 10, 4, e.col, '#ffffff', 160, 6);
      if (e.hp <= 0) {
        e.dead = true;
        this._shards(e.x, e.y - 10, 26, e.col, '#ffffff', 340, 10);
        this.parts.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 200, col: e.col, type: 'ring', drag: 0 });
        this.burst(e.x, e.y, 30, e.col, 300, 26, 0.8);
        for (let k = 0; k < 16; k++) {
          const a = Math.random() * TAU, s = U.rand(100, 280);
          this.ents.push({ t: 'spark', x: e.x, y: e.y - 10, r: 7, ph: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, fly: 0.35 + Math.random() * 0.3, dead: false });
        }
        this.run.amber += 8;
        this.text(e.x, e.y - 40, 'Kristal parçalandı! +8 ⬢', '#e8f4ff', 20);
        L.audio.shatter && L.audio.shatter(6);
        this.cam.shake = 8;
        this.flash = 0.3; this.flashCol = e.col;
        U.vibrate(40);
      }
      return true;
    },
    _updateCrystal(e, dt) {
      this._initCrystal(e);
      e.flash = Math.max(0, e.flash - dt);
      e.shake = Math.max(0, e.shake - dt);
      const lumi = this.lumi;
      const rr = e.r + 14;
      if (U.dist2(e.x, e.y, lumi.x, lumi.y) < rr * rr && (!e.bumpT || e.bumpT < this.t)) {
        e.bumpT = this.t + 0.3;
        this._hitCrystal(e, lumi.star > 0 ? 5 : 1);
        // geri sekme
        const a = Math.atan2(lumi.y - e.y, lumi.x - e.x);
        this.target.x = U.clamp(this.target.x + Math.cos(a) * 46, 18, this.W - 18);
        this.target.y = U.clamp(this.target.y + Math.sin(a) * 46, this.H * 0.12, this.H - 40);
      }
      this._hint('crystal', 'Kristal kümesine çarparak ya da ateş ederek kır: içi kıvılcım ve kehribar dolu!');
    },
    _updatePortal(e, dt) {
      e.ph += dt;
      const lumi = this.lumi;
      if (U.dist2(e.x, e.y, lumi.x, lumi.y) < 36 * 36) {
        e.dead = true;
        this.secretT = 7;
        this.goldRain = 5.5;
        this.flash = 1;
        this.flashCol = '#fff2c0';
        this.cam.shake = 6;
        L.audio.secret && L.audio.secret();
        U.vibrate(60);
        L.ui.celebrate('Gizli Bölge!', 'Altın Bahçe', '#ffd36b');
        L.ui.achieve('secret');
        // ekrandaki gölgeler arınır
        for (const o of this.ents) if (!o.dead && KILLABLE[o.t] && o.y > this.cam.y - 40 && o.y < this.cam.y + this.H) this.purify(o);
        this.run.amber += 10;
      }
      this._hint('portal', 'Kenardaki parıltılı geçit gizli bir ödül bölgesine açılır!');
    },
    _updateSecret(dt) {
      if (this.goldRain > 0) {
        this.goldRain -= dt;
        if (Math.random() < dt * 14) {
          this.ents.push({ t: 'spark', x: U.rand(30, this.W - 30), y: this.cam.y - 20, r: 7, ph: 0, vx: U.rand(-20, 20), vy: U.rand(120, 220), fly: 1.2, dead: false, gold: true });
        }
      }
    },

    // ---------- dekor çizimi ----------
    _drawDecor(g) {
      const top = this.cam.y - 160, bottom = this.cam.y + this.H + 160;
      for (const e of this.ents) {
        if (e.t !== 'decor' || e.dead || e.y < top || e.y > bottom) continue;
        Art.drawDecor(g, e, this.t);
      }
      // nabız gibi atan ek ışık
      g.globalCompositeOperation = 'lighter';
      for (const e of this.ents) {
        if (e.t !== 'decor' || e.dead || e.y < top || e.y > bottom) continue;
        if (e.lx == null) { const p = Art.decorLight(e); e.lx = p[0]; e.ly = p[1] - e.y; }
        const lx = e.lx, ly = e.y + e.ly;
        const s = 120 * e.s * (0.85 + 0.15 * Math.sin(this.t * 2 + e.ph));
        g.globalAlpha = 0.14;
        g.drawImage(e.glowImg || (e.glowImg = Art.glow(e.col, 128)), lx - s / 2, ly - s / 2, s, s);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },

    // ---------- savaş görselleri ----------
    _drawCombat(g) {
      // mermiler
      g.globalCompositeOperation = 'lighter';
      for (const s of this.shots) {
        const a = Math.atan2(s.vy, s.vx);
        g.save();
        g.translate(s.x, s.y);
        g.rotate(a);
        g.drawImage(Art.glow(s.col, 64, 0.25), -26, -9, 40, 18);
        g.restore();
        g.drawImage(Art.glow('#ffffff', 64, 0.3), s.x - 8, s.y - 8, 16, 16);
      }
      g.globalCompositeOperation = 'source-over';
      // yıldırımlar
      for (const b of this.bolts) {
        const x2 = b.e && !b.e.dead ? b.e.x : b.x2, y2 = b.e && !b.e.dead ? b.e.y : b.y2;
        Art.drawBolt(g, Art.boltPath(b.x1, b.y1, x2, y2, 34), b.col, Math.min(1, b.life / 0.2));
      }
      const lumi = this.lumi;
      if (lumi.chain > 0) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.5 + 0.5 * Math.random();
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * TAU;
          Art.drawBolt(g, Art.boltPath(lumi.x, lumi.y, lumi.x + Math.cos(a) * 30, lumi.y + Math.sin(a) * 30, 10), '#b8c8ff', 0.6);
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    },

    _drawLumiFx(g) {
      const lumi = this.lumi;
      if (lumi.star > 0) {
        g.globalCompositeOperation = 'lighter';
        const cols = ['#ff7ad8', '#ffd36b', '#7affd8', '#9a7bff'];
        for (let i = 0; i < 4; i++) {
          const a = this.t * 5 + i * (TAU / 4);
          g.globalAlpha = lumi.star < 1.2 ? 0.5 + 0.5 * Math.sin(this.t * 20) : 0.85;
          g.drawImage(Art.glow(cols[i], 128), lumi.x + Math.cos(a) * 14 - 45, lumi.y + Math.sin(a) * 14 - 45, 90, 90);
        }
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
      if (lumi.shield > 0) Art.drawShield(g, lumi.x, lumi.y, this.t, lumi.shield, lumi.shieldMax, lumi.shieldHit);
      if (lumi.bolt > 0) {
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const a = this.t * 4 + i * 2.09;
          g.drawImage(Art.glow('#ffe08a', 64, 0.3), lumi.x + Math.cos(a) * 24 - 7, lumi.y + Math.sin(a) * 24 - 7, 14, 14);
        }
        g.globalCompositeOperation = 'source-over';
      }
      // Lumi'nin etrafında dönen iki minik yıldız (canlılık)
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const a = this.t * 2.2 + i * Math.PI;
        const x = lumi.x + Math.cos(a) * 26, y = lumi.y + Math.sin(a) * 12 - 4;
        g.globalAlpha = (Math.sin(a) > 0 ? 1 : 0.5) * lumi.alpha;
        g.drawImage(Art.spark('#ffffff', 48), x - 6, y - 6, 12, 12);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },

    _drawZoneMsg(g) {
      const m = this.zoneMsg;
      if (!m || m.t < 0) return;
      const k = m.t < 0.5 ? m.t / 0.5 : m.t > 2.6 ? Math.max(0, (3.2 - m.t) / 0.6) : 1;
      g.save();
      g.globalAlpha = k;
      g.textAlign = 'center';
      const y = this.H * 0.22 - (1 - k) * 10;
      g.font = '600 12px sans-serif';
      g.fillStyle = '#cfefff';
      g.fillText('✦  Y E N İ   B Ö L G E  ✦', this.W / 2, y - 26);
      g.font = '800 26px sans-serif';
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(6,10,30,0.6)';
      g.strokeText(m.name, this.W / 2, y);
      g.fillStyle = '#fff8e0';
      g.fillText(m.name, this.W / 2, y);
      g.restore();
    },
  };

  Object.assign(L.Game.prototype, M);
})();
