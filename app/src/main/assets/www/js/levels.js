/* LUMORA — seviye üretici. Elle ayarlanmış "parça" desenlerinden deterministik seviyeler kurar. */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;

  class Generator {
    constructor(game, opts) {
      this.game = game;
      this.W = game.W;
      this.H = game.H;
      this.endless = !!opts.endless;
      this.level = opts.level;
      this.rnd = U.rng(opts.seed);
      this.genY = -this.H * 0.55; // ilk parçalar ekranın biraz üstünden başlar
      this.potential = 0;
      this.count = 0;
      this.lastKinds = [];
      if (!this.endless) {
        this.feats = this.level.feats.slice();
        this.baseDiff = this.level.diff;
        this.endY = -this.level.len * this.H;
      } else {
        this.feats = ['vine', 'wisp', 'power', 'cocoon', 'wind', 'golden'];
        this.baseDiff = 0.2;
        this.endY = -Infinity;
      }
      this.tutorial = !!(this.level && this.level.tutorial);
      if (this.tutorial) this._tutorialOpening();
    }

    has(f) { return this.feats.indexOf(f) >= 0; }

    diffAt(y) {
      if (this.endless) return Math.min(1.1, 0.15 + (-y / 22000));
      const p = U.clamp(y / this.endY, 0, 1);
      return this.baseDiff + p * 0.15;
    }

    // Sonsuz modda biyoma göre özellik seti
    endlessFeats(y) {
      const bi = Math.floor(-y / 4200) % 4;
      const sets = [
        ['vine', 'wisp', 'moth', 'cocoon', 'power', 'wind', 'golden'],
        ['wheel', 'wisp', 'web', 'moth', 'cocoon', 'power', 'golden'],
        ['jelly', 'vine', 'wisp', 'cocoon', 'power', 'wind'],
        ['meteor', 'wisp', 'moth', 'wheel', 'cocoon', 'power', 'wind', 'golden'],
      ];
      return sets[bi];
    }

    fill(untilY) {
      while (this.genY > untilY) {
        if (!this.endless && this.genY < this.endY + this.H * 0.45) {
          this.genY = -Infinity;
          break;
        }
        if (this.endless) this.feats = this.endlessFeats(this.genY);
        this._chunk();
      }
    }

    add(e) { this.game.addEnt(e); return e; }
    spark(x, y) {
      this.potential++;
      return this.add({ t: 'spark', x, y, r: 7, ph: this.rnd() * 6.28 });
    }

    _tutorialOpening() {
      const W = this.W;
      // Hemen ödül: başlangıçta bir kıvılcım yayı (ilk 5 saniye)
      for (let i = 0; i < 9; i++) this.spark(W * 0.5 + Math.sin(i * 0.7) * W * 0.25, -this.H * 0.1 - i * 38);
      this.genY = -this.H * 0.1 - 9 * 38 - 120;
      for (let i = 0; i < 10; i++) this.spark(W * 0.2 + i * W * 0.065, this.genY - Math.sin(i / 9 * Math.PI) * 90);
      this.genY -= 260;
    }

    _chunk() {
      const r = this.rnd, W = this.W;
      const d = this.diffAt(this.genY);
      this.count++;
      const options = [];
      const push = (k, w) => options.push([k, w]);
      push('sparks', 3);
      if (this.has('vine')) push('vine', 2.2 + d);
      if (this.has('wisp')) push('wisp', 1.4 + d * 2);
      if (this.has('moth')) push('moth', 0.8 + d * 1.5);
      if (this.has('wheel')) push('wheel', 1.8 + d);
      if (this.has('jelly')) push('jelly', 2 + d);
      if (this.has('meteor')) push('meteor', 1.1 + d);
      if (this.has('web')) push('web', 0.8);
      if (this.has('cocoon') && this.count % 4 === 2) push('cocoon', 6);
      if (this.has('power') && this.count % 5 === 3) push('power', 5);
      if (this.has('wind') && this.count % 9 === 6) push('wind', 8);
      if (this.has('golden') && this.count % 11 === 8) push('golden', 8);
      const li = this.endless ? 99 : this.game.levelIndex;
      if (li >= 2 && this.count % 7 === 4) push('chest', 9);
      if (li >= 1 && this.count % 6 === 1) push('crystal', 5);
      if (li >= 4 && !this.portalSet && this.count >= 9 && this.count % 3 === 0) push('portal', 7);
      if (this.has('chase') && !this.chaseSet && this.genY < this.endY * 0.45) push('chase', 50);
      // tekrarı azalt
      for (const o of options) if (this.lastKinds.indexOf(o[0]) >= 0) o[1] *= 0.35;
      let tot = 0;
      for (const o of options) tot += o[1];
      let pick = r() * tot, kind = 'sparks';
      for (const o of options) {
        pick -= o[1];
        if (pick <= 0) { kind = o[0]; break; }
      }
      this.lastKinds.push(kind);
      if (this.lastKinds.length > 2) this.lastKinds.shift();
      const y0 = this.genY;
      let h = 0;
      switch (kind) {
        case 'sparks': h = this._sparks(y0, d); break;
        case 'vine': h = this._vine(y0, d); break;
        case 'wisp': h = this._wisps(y0, d); break;
        case 'moth': h = this._moth(y0, d); break;
        case 'wheel': h = this._wheel(y0, d); break;
        case 'jelly': h = this._jelly(y0, d); break;
        case 'meteor': h = this._meteor(y0, d); break;
        case 'web': h = this._web(y0, d); break;
        case 'cocoon': h = this._cocoon(y0, d); break;
        case 'power': h = this._power(y0, d); break;
        case 'wind': h = this._wind(y0, d); break;
        case 'golden': h = this._golden(y0, d); break;
        case 'chase': h = this._chase(y0, d); break;
        case 'chest': h = this._chest(y0, d); break;
        case 'crystal': h = this._crystal(y0, d); break;
        case 'portal': h = this._portal(y0, d); break;
      }
      this._decor(y0, h);
      // seyrek kehribar
      if (r() < 0.22 + d * 0.1) this.add({ t: 'amber', x: W * (0.12 + r() * 0.76), y: y0 - h * r(), r: 9 });
      this.genY = y0 - h - (110 - d * 30) * (0.8 + r() * 0.5);
    }

    _sparks(y, d) {
      const r = this.rnd, W = this.W;
      const kind = r.int(0, 3);
      if (kind === 0) { // sinüs dizisi
        const n = 10 + r.int(0, 6), amp = W * (0.15 + r() * 0.2), cx = W * (0.35 + r() * 0.3);
        for (let i = 0; i < n; i++) this.spark(cx + Math.sin(i * 0.55) * amp, y - i * 32);
        return n * 32;
      } else if (kind === 1) { // halka
        const cx = W * (0.3 + r() * 0.4), cy = y - 110, rr = 70;
        for (let i = 0; i < 12; i++) this.spark(cx + Math.cos((i / 12) * 6.283) * rr, cy + Math.sin((i / 12) * 6.283) * rr);
        this.spark(cx, cy);
        return 230;
      } else if (kind === 2) { // çapraz çizgi
        const n = 12, dir = r() < 0.5 ? 1 : -1;
        for (let i = 0; i < n; i++) this.spark(W * 0.5 + dir * (i - n / 2) * W * 0.06, y - i * 26);
        return n * 26;
      } else { // spiral küme
        const cx = W * (0.3 + r() * 0.4), cy = y - 120;
        for (let i = 0; i < 16; i++) {
          const a = i * 0.75, rr = 12 + i * 6;
          this.spark(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        return 240;
      }
    }

    _vine(y, d) {
      const r = this.rnd, W = this.W;
      const gap = U.clamp(W * (0.42 - d * 0.16), W * 0.24, W * 0.5);
      const style = r.int(0, 2);
      const mkVine = (fromLeft, reach, yy, slope) => {
        const pts = [];
        const x0 = fromLeft ? -20 : W + 20;
        const x1 = fromLeft ? reach : W - reach;
        const n = 6;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          pts.push([U.lerp(x0, x1, t), yy + Math.sin(t * 3.14 + r() * 0.4) * -18 + t * slope + (r() - 0.5) * 8]);
        }
        this.add({ t: 'vine', pts, thick: 9 + r() * 4, x: (x0 + x1) / 2, y: yy, r: 0, seed: (r() * 1e9) | 0 });
      };
      if (style === 0) { // tek taraf, karşıda boşluk
        const left = r() < 0.5;
        mkVine(left, W - gap, y - 20, (r() - 0.5) * 60);
        // boşluktan geçen kıvılcımlar
        const gx = left ? W - gap / 2 : gap / 2;
        for (let i = 0; i < 5; i++) this.spark(gx, y + 50 - i * 30);
        return 160;
      } else if (style === 1) { // iki taraf, ortada boşluk
        const cx = W * (0.3 + r() * 0.4);
        mkVine(true, cx - gap / 2, y - 20, (r() - 0.5) * 40);
        mkVine(false, W - (cx + gap / 2), y - 20, (r() - 0.5) * 40);
        for (let i = 0; i < 4; i++) this.spark(cx, y + 40 - i * 30);
        return 150;
      } else { // zikzak geçit
        const sep = 190 - d * 30;
        mkVine(true, W - gap, y - 10, 30);
        mkVine(false, W - gap, y - 10 - sep, -30);
        for (let i = 0; i < 6; i++) this.spark(i < 3 ? W - gap / 2 : gap / 2, y + 30 - i * (sep / 5));
        return sep + 120;
      }
    }

    _wisps(y, d) {
      const r = this.rnd, W = this.W;
      const n = 1 + (d > 0.35 ? r.int(0, 1) : 0) + (d > 0.7 ? r.int(0, 1) : 0);
      for (let i = 0; i < n; i++) {
        this.add({ t: 'wisp', x: W * (0.2 + r() * 0.6), y: y - i * 120 - r() * 60, r: 17 + r() * 5, speed: 22 + d * 38, ph: r() * 6, hp: 1 });
      }
      // gölgelerin etrafında yem kıvılcımlar (risk/ödül)
      for (let i = 0; i < 6; i++) this.spark(W * (0.15 + r() * 0.7), y - r() * (n * 120 + 60));
      return n * 120 + 80;
    }

    _moth(y, d) {
      const r = this.rnd, W = this.W;
      const side = r() < 0.5 ? 0.18 : 0.82;
      this.add({ t: 'moth', x: W * side, y: y - 40, r: 18, state: 'idle', timer: 0, hx: W * side, ph: r() * 6, speed: 380 + d * 160 });
      for (let i = 0; i < 7; i++) this.spark(W * (1 - side) + Math.sin(i) * 30, y - i * 28);
      return 220;
    }

    _wheel(y, d) {
      const r = this.rnd, W = this.W;
      const n = d > 0.6 && r() < 0.5 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const rr = 26 + r() * 10;
        this.add({ t: 'wheel', x: W * (0.25 + r() * 0.5), y: y - 60 - i * 170, r: rr, cx: W * 0.5, amp: W * (0.18 + r() * 0.12), spd: (0.7 + d) * (r() < 0.5 ? 1 : -1), ph: r() * 6, rot: 0 });
      }
      for (let i = 0; i < 8; i++) this.spark(W * 0.5 + Math.sin(i * 0.8) * W * 0.3, y - 20 - i * (n * 170) / 8);
      return n * 170 + 60;
    }

    _jelly(y, d) {
      const r = this.rnd, W = this.W;
      const n = 2 + r.int(0, d > 0.6 ? 2 : 1);
      for (let i = 0; i < n; i++) {
        this.add({ t: 'jelly', x: W * (0.15 + (i / Math.max(1, n - 1)) * 0.7), y: y - 40 - r() * 160, r: 18 + r() * 6, ph: r() * 6, bx: 0, by: 0, amp: 40 + r() * 50, purifiable: true });
      }
      for (let i = 0; i < 7; i++) this.spark(W * (0.1 + r() * 0.8), y - r() * 200);
      return 240;
    }

    _meteor(y, d) {
      const r = this.rnd, W = this.W;
      // tetikleyici: kamera buraya geldiğinde göktaşı sağanağı başlar
      this.add({ t: 'trigger', kind: 'meteor', x: W / 2, y, r: 0, count: 3 + Math.round(d * 4) });
      for (let i = 0; i < 9; i++) this.spark(W * (0.1 + r() * 0.8), y - 40 - r() * 220);
      return 300;
    }

    _web(y, d) {
      const r = this.rnd, W = this.W;
      const x = W * (0.25 + r() * 0.5);
      this.add({ t: 'web', x, y: y - 80, r: 62 + r() * 18 });
      for (let i = 0; i < 7; i++) this.spark(x + Math.cos(i) * 40, y - 80 + Math.sin(i) * 40);
      // örümceği andıran küçük gölge
      if (d > 0.5) this.add({ t: 'wisp', x: x + 60, y: y - 160, r: 14, speed: 30 + d * 30, ph: r() * 6, hp: 1 });
      return 220;
    }

    _cocoon(y, d) {
      const r = this.rnd, W = this.W;
      const need = Math.round(6 + d * 32 + r() * 6);
      const reward = Math.round(need * 0.9 + 10);
      this.potential += reward;
      this.add({ t: 'cocoon', x: W * (0.3 + r() * 0.4), y: y - 80, r: 16, need, reward, ph: r() * 6 });
      return 200;
    }

    _power(y, d) {
      const r = this.rnd, W = this.W;
      const kind = L.rollPower(L.powerPool(this.endless ? -1 : this.game.levelIndex));
      this.add({ t: 'power', kind, x: W * (0.25 + r() * 0.5), y: y - 60, r: 17 });
      return 140;
    }

    _wind(y, d) {
      const r = this.rnd, W = this.W;
      const h = 900;
      this.add({ t: 'wind', x: W / 2, y: y - h, y2: y, r: 0 });
      // akımın içinde bol kıvılcım nehri
      for (let i = 0; i < 22; i++) this.spark(W * 0.5 + Math.sin(i * 0.35) * W * 0.28, y - 40 - i * 38);
      return h;
    }

    // Büyülü sandık: genelde tehlikelerin arasında, risk alan oyuncuyu ödüllendirir
    _chest(y, d) {
      const r = this.rnd, W = this.W;
      const x = W * (0.25 + r() * 0.5);
      this.add({ t: 'chest', x, y: y - 90, r: 22 });
      if (this.has('wisp') && d > 0.2) this.add({ t: 'wisp', x: x + (r() < 0.5 ? -70 : 70), y: y - 170, r: 16, speed: 18 + d * 20, ph: r() * 6, hp: 1 });
      else if (this.has('vine')) {
        const left = x > W / 2;
        const pts = [];
        for (let i = 0; i <= 5; i++) pts.push([left ? -20 + i * (W * 0.42) / 5 : W + 20 - i * (W * 0.42) / 5, y - 10 + Math.sin(i) * 10]);
        this.add({ t: 'vine', pts, thick: 10, x: W / 2, y: y - 10, r: 0, seed: (r() * 1e9) | 0 });
      }
      return 220;
    }

    _crystal(y, d) {
      const r = this.rnd, W = this.W;
      const zs = L.ZONES[this.game.biome][this.game.zoneAt ? this.game.zoneAt(y) : 0];
      const x = W * (0.25 + r() * 0.5);
      this.add({ t: 'crystal', x, y: y - 80, r: 26, col: zs.cols[r.int(0, zs.cols.length - 1)], ph: r() * 6 });
      for (let i = 0; i < 4; i++) this.spark(x + (i - 1.5) * 34, y - 170);
      return 210;
    }

    // Gizli bölge geçidi: ana yolun dışında, kenarda
    _portal(y, d) {
      const r = this.rnd, W = this.W;
      this.portalSet = true;
      const left = r() < 0.5;
      this.add({ t: 'portal', x: left ? 32 : W - 32, y: y - 80, r: 22, ph: 0 });
      return 160;
    }

    // Parlayan bitki örtüsü (etkileşimsiz, bölgeye göre)
    _decor(y0, h) {
      const r = this.rnd, W = this.W;
      const zi = this.game.zoneAt ? this.game.zoneAt(y0) : 0;
      const zs = L.ZONES[this.game.biome][zi];
      // sade yol: bölüm başına en fazla bir bitki, çoğu bölümde hiç
      const n = r() < 0.55 ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const side = r() < 0.5 ? 0 : 1;
        const type = zs.flora[r.int(0, zs.flora.length - 1)];
        const col = zs.cols[r.int(0, zs.cols.length - 1)];
        const seed = r.int(0, 5);
        this.game.addEnt({ t: 'decor', x: side ? W + 2 : -2, y: y0 - r() * Math.max(80, h), side, spr: L.Art.decor(type, col, seed), s: 0.75 + r() * 0.4, ph: r() * 6, col, r: 0 });
      }
    }

    _golden(y, d) {
      const r = this.rnd, W = this.W;
      this.add({ t: 'golden', x: W * (0.3 + r() * 0.4), y: y - 80, r: 9, life: 9, vx: 0, vy: 0 });
      return 200;
    }

    _chase(y, d) {
      this.chaseSet = true;
      this.add({ t: 'trigger', kind: 'chase', x: this.W / 2, y, r: 0, dur: 16 + d * 6 });
      return 80;
    }
  }

  L.Generator = Generator;
})();
