/* LUMORA v2 — ek prosedürel sanat: parlayan flora, sandık, kristal küme, portal, kalkan, yıldırım, kırıklar */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;
  const Art = L.Art;
  const TAU = U.TAU;
  const cache = {};

  // ---------- Parlayan flora (dekor) — bir kez çizilir, önbelleğe alınır ----------
  // Sol duvardan içeri doğru büyür; sağ taraf için çizimde yatay aynalanır.
  Art.decor = function (type, col, seed) {
    const key = 'dc' + type + col + seed;
    if (cache[key]) return cache[key];
    const W = 150, H = 150;
    const c = U.makeCanvas(W, H);
    const g = c.getContext('2d');
    const rnd = U.rng(seed);
    const ax = 4, ay = H * 0.7;
    const lights = [];
    const glowDot = (x, y, s, cc, a) => {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a;
      g.drawImage(Art.glow(cc, 64, 0.22), x - s / 2, y - s / 2, s, s);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    };
    g.lineCap = 'round';
    if (type === 'flower') {
      const n = 3 + ((rnd() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const len = 60 + rnd() * 55, ang = -0.25 - i * 0.35 + rnd() * 0.2;
        const ex = ax + Math.cos(ang) * len, ey = ay + Math.sin(ang) * len;
        const mx = ax + Math.cos(ang + 0.5) * len * 0.55, my = ay + Math.sin(ang + 0.5) * len * 0.55;
        g.strokeStyle = U.mix(col, '#0a2a20', 0.7);
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
        // yapraklar
        g.fillStyle = U.mix(col, '#0a3020', 0.6);
        g.beginPath(); g.ellipse(mx, my, 10, 4, ang + 0.8, 0, TAU); g.fill();
        // çan çiçek
        glowDot(ex, ey + 6, 46, col, 0.9);
        const pg = g.createRadialGradient(ex, ey, 1, ex, ey + 4, 12);
        pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.4, col); pg.addColorStop(1, U.mix(col, '#2a0a3a', 0.5));
        g.fillStyle = pg;
        g.beginPath();
        g.moveTo(ex - 10, ey + 8);
        g.quadraticCurveTo(ex - 9, ey - 8, ex, ey - 6);
        g.quadraticCurveTo(ex + 9, ey - 8, ex + 10, ey + 8);
        g.quadraticCurveTo(ex + 5, ey + 4, ex, ey + 9);
        g.quadraticCurveTo(ex - 5, ey + 4, ex - 10, ey + 8);
        g.fill();
        g.fillStyle = '#fffbe0';
        g.beginPath(); g.arc(ex, ey + 10, 2.2, 0, TAU); g.fill();
        lights.push([ex, ey + 6]);
      }
    } else if (type === 'mush') {
      const n = 3 + ((rnd() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const mr = 9 + rnd() * 14, x = ax + 8 + i * 15 + rnd() * 6, y = ay - i * 9 + rnd() * 6;
        const tilt = 0.35 + rnd() * 0.3;
        g.save(); g.translate(x, y); g.rotate(tilt);
        g.strokeStyle = U.mix(col, '#ffffff', 0.55); g.lineWidth = mr * 0.32;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-3, -mr * 0.7, 0, -mr * 1.4); g.stroke();
        g.restore();
        const cx = x + Math.sin(tilt) * mr * 1.4, cy = y - Math.cos(tilt) * mr * 1.4;
        glowDot(cx, cy, mr * 7, col, 0.75);
        g.save(); g.translate(cx, cy); g.rotate(tilt);
        const cg = g.createRadialGradient(-mr * 0.3, -mr * 0.4, 1, 0, 0, mr * 1.1);
        cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.35, col); cg.addColorStop(1, U.mix(col, '#1a0630', 0.55));
        g.fillStyle = cg;
        g.beginPath(); g.ellipse(0, 0, mr, mr * 0.62, 0, Math.PI, 0); g.quadraticCurveTo(0, mr * 0.25, -mr, 0); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (let d = 0; d < 4; d++) { g.beginPath(); g.arc((d - 1.5) * mr * 0.42, -mr * 0.3 - (d % 2) * mr * 0.15, mr * 0.09, 0, TAU); g.fill(); }
        g.restore();
        lights.push([cx, cy]);
      }
    } else if (type === 'crystal') {
      const n = 4 + ((rnd() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const h = 34 + rnd() * 56, w = 10 + rnd() * 9, ang = -0.15 - i * 0.28 + rnd() * 0.15;
        g.save(); g.translate(ax, ay - 8 + i * 3); g.rotate(ang + Math.PI / 2);
        const cg = g.createLinearGradient(-w, 0, w, 0);
        cg.addColorStop(0, U.rgba(col, 0.85)); cg.addColorStop(0.45, U.rgba(U.mix(col, '#ffffff', 0.7), 0.95)); cg.addColorStop(1, U.rgba(U.mix(col, '#000000', 0.35), 0.9));
        g.fillStyle = cg;
        g.beginPath();
        g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.78); g.lineTo(0, -h); g.lineTo(w / 2, -h * 0.78); g.lineTo(w / 2, 0);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-w * 0.1, -h * 0.1); g.lineTo(-w * 0.1, -h * 0.8); g.stroke();
        g.restore();
        const tx = ax + Math.cos(ang) * h * 0.9, ty = ay - 8 + i * 3 + Math.sin(ang) * h * 0.9;
        lights.push([tx, ty]);
        glowDot(tx, ty, 40, col, 0.7);
      }
    } else if (type === 'fern') {
      for (let i = 0; i < 3; i++) {
        const len = 70 + rnd() * 40, ang = -0.3 - i * 0.4;
        let px = ax, py = ay;
        g.strokeStyle = U.mix(col, '#062018', 0.62); g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(px, py);
        const pts = [];
        for (let k = 1; k <= 12; k++) {
          const a = ang - k * 0.05;
          px += Math.cos(a) * len / 12; py += Math.sin(a) * len / 12;
          g.lineTo(px, py); pts.push([px, py, a]);
        }
        g.stroke();
        g.fillStyle = U.mix(col, '#0a3020', 0.55);
        for (const p of pts) {
          for (const sd of [-1, 1]) {
            g.beginPath();
            g.ellipse(p[0] + Math.cos(p[2] + sd * 1.2) * 6, p[1] + Math.sin(p[2] + sd * 1.2) * 6, 6, 2.2, p[2] + sd * 1.2, 0, TAU);
            g.fill();
          }
        }
        // kıvrık uçta parlayan tomurcuk
        glowDot(px, py, 34, col, 0.95);
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px, py, 2.5, 0, TAU); g.fill();
        lights.push([px, py]);
      }
    } else { // coral
      const grow = (x, y, a, l, d) => {
        const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
        g.strokeStyle = U.mix(col, '#1a0a20', 0.35 + d * 0.06); g.lineWidth = d * 2.2 + 1.5;
        g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
        if (d > 0) { grow(ex, ey, a - 0.5 + rnd() * 0.2, l * 0.74, d - 1); grow(ex, ey, a + 0.45, l * 0.74, d - 1); }
        else { glowDot(ex, ey, 22, col, 0.95); lights.push([ex, ey]); }
      };
      grow(ax, ay, -0.6, 30, 3);
      grow(ax, ay + 10, -0.15, 24, 2);
    }
    // ışık merkezi: ışıkların ortalaması
    let lx = 0, ly = 0;
    for (const p of lights) { lx += p[0]; ly += p[1]; }
    lx /= lights.length || 1; ly /= lights.length || 1;
    return (cache[key] = { canvas: c, ax, ay, lx, ly, lights });
  };

  Art.drawDecor = function (g, d, t) {
    const sp = d.spr;
    g.save();
    g.translate(d.x, d.y);
    if (d.side) g.scale(-1, 1);
    g.scale(d.s, d.s);
    g.rotate(Math.sin(t * 0.9 + d.ph) * 0.035);
    g.drawImage(sp.canvas, -sp.ax, -sp.ay);
    g.restore();
  };
  Art.decorLight = function (d) {
    const sp = d.spr;
    const lx = (sp.lx - sp.ax) * d.s, ly = (sp.ly - sp.ay) * d.s;
    return [d.x + (d.side ? -lx : lx), d.y + ly];
  };

  // ---------- Büyülü sandık ----------
  Art.drawChest = function (g, x, y, t, open, rarityCol) {
    const bob = open > 0 ? 0 : Math.sin(t * 2.4) * 3;
    y += bob;
    const w = 40, h = 26;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3) + open * 0.4;
    g.drawImage(Art.glow(rarityCol, 128), x - 60, y - 60, 120, 120);
    g.globalAlpha = 1;
    if (open > 0) {
      // ışık sütunu
      const bh = 160 * open;
      const bg = g.createLinearGradient(x, y - bh, x, y);
      bg.addColorStop(0, U.rgba(rarityCol, 0));
      bg.addColorStop(1, U.rgba('#ffffff', 0.8 * (1 - open * 0.4)));
      g.fillStyle = bg;
      g.beginPath();
      g.moveTo(x - 14, y - 8); g.lineTo(x + 14, y - 8); g.lineTo(x + 34, y - bh); g.lineTo(x - 34, y - bh);
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // gövde
    const bodyG = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    bodyG.addColorStop(0, '#5a2f6a'); bodyG.addColorStop(1, '#2a1238');
    g.fillStyle = bodyG;
    g.beginPath();
    g.roundRect ? g.roundRect(x - w / 2, y - h / 2 + 4, w, h, 5) : g.rect(x - w / 2, y - h / 2 + 4, w, h);
    g.fill();
    g.strokeStyle = '#ffcf6b'; g.lineWidth = 2.5;
    g.stroke();
    g.beginPath(); g.moveTo(x - w / 2 + 8, y - h / 2 + 4); g.lineTo(x - w / 2 + 8, y + h / 2 + 4); g.moveTo(x + w / 2 - 8, y - h / 2 + 4); g.lineTo(x + w / 2 - 8, y + h / 2 + 4); g.stroke();
    // kapak
    g.save();
    g.translate(x, y - h / 2 + 4);
    g.rotate(-open * 1.9);
    const lidG = g.createLinearGradient(0, -16, 0, 0);
    lidG.addColorStop(0, '#7a4590'); lidG.addColorStop(1, '#4a2058');
    g.fillStyle = lidG;
    g.beginPath();
    g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -8); g.quadraticCurveTo(0, -22, w / 2, -8); g.lineTo(w / 2, 0); g.closePath();
    g.fill();
    g.strokeStyle = '#ffcf6b'; g.lineWidth = 2.5; g.stroke();
    g.restore();
    // kilit / ışıklı aralık
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = U.rgba(rarityCol, 0.9);
    g.fillRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, 2.5);
    g.drawImage(Art.glow('#ffe08a', 64, 0.3), x - 9, y - 6, 18, 18);
    g.globalCompositeOperation = 'source-over';
  };

  // ---------- Kristal küme (kırılabilir ödül) ----------
  Art.drawCrystalCluster = function (g, e, t, B) {
    const col = e.col;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.6 + 0.2 * Math.sin(t * 2 + e.ph);
    g.drawImage(Art.glow(col, 128), e.x - e.r * 2.6, e.y - e.r * 2.6, e.r * 5.2, e.r * 5.2);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    const flash = e.flash > 0;
    for (const p of e.prisms) {
      g.save();
      g.translate(e.x + p.x + (e.shake > 0 ? U.rand(-2, 2) : 0), e.y + p.y);
      g.rotate(p.a);
      const cg = g.createLinearGradient(-p.w, 0, p.w, 0);
      cg.addColorStop(0, U.rgba(flash ? '#ffffff' : col, 0.85));
      cg.addColorStop(0.45, U.rgba(U.mix(col, '#ffffff', 0.75), 0.97));
      cg.addColorStop(1, U.rgba(U.mix(col, '#000000', 0.35), 0.92));
      g.fillStyle = cg;
      g.beginPath();
      g.moveTo(-p.w / 2, 0); g.lineTo(-p.w / 2, -p.h * 0.75); g.lineTo(0, -p.h); g.lineTo(p.w / 2, -p.h * 0.75); g.lineTo(p.w / 2, 0);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-p.w * 0.15, -p.h * 0.1); g.lineTo(-p.w * 0.15, -p.h * 0.75); g.stroke();
      g.restore();
    }
    Art.drawCracks(g, e);
  };

  // Hasar alan nesnelerin üstüne çatlak çizgileri
  Art.makeCracks = function (seed, r, n) {
    const rnd = U.rng(seed);
    const cracks = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU;
      const pts = [[Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1]];
      let x = pts[0][0], y = pts[0][1], ang = a;
      const steps = 3 + ((rnd() * 3) | 0);
      for (let k = 0; k < steps; k++) {
        ang += (rnd() - 0.5) * 1.1;
        x += Math.cos(ang) * r * 0.28; y += Math.sin(ang) * r * 0.28;
        pts.push([x, y]);
      }
      cracks.push(pts);
    }
    return cracks;
  };
  Art.drawCracks = function (g, e) {
    if (!e.cracks || !e.maxHp) return;
    const dmg = 1 - Math.max(0, e.hp) / e.maxHp;
    const n = Math.ceil(dmg * e.cracks.length);
    if (n <= 0) return;
    g.save();
    g.translate(e.x, e.y);
    g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const pts = e.cracks[i];
      g.strokeStyle = U.rgba('#ffffff', 0.85);
      g.lineWidth = 1.6;
      g.beginPath();
      pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.stroke();
      g.strokeStyle = U.rgba(e.crackCol || '#ffd36b', 0.5);
      g.lineWidth = 4;
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.restore();
  };

  // ---------- Gizli bölge portalı ----------
  Art.drawPortal = function (g, x, y, r, t) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.7;
    g.drawImage(Art.glow('#ffd36b', 128), x - r * 3, y - r * 3, r * 6, r * 6);
    g.globalAlpha = 1;
    const cols = ['#ffd36b', '#ff9fd8', '#8fffe0'];
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = U.rgba(cols[i], 0.75);
      g.lineWidth = 3 - i * 0.6;
      g.beginPath();
      g.ellipse(x, y, r * (1 - i * 0.18), r * (1.35 - i * 0.22), Math.sin(t * 0.5) * 0.2, t * (1.5 + i) , t * (1.5 + i) + Math.PI * 1.5);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const a = t * 2 + i * 1.05, rr = r * (0.3 + 0.5 * ((t * 0.7 + i * 0.3) % 1));
      g.drawImage(Art.glow('#ffffff', 32, 0.3), x + Math.cos(a) * rr - 4, y + Math.sin(a) * rr * 1.3 - 4, 8, 8);
    }
    g.globalCompositeOperation = 'source-over';
  };

  // ---------- Işık kalkanı (katmanlı, çatlayan) ----------
  Art.drawShield = function (g, x, y, t, hp, max, hitT) {
    const cols = ['#ff6f9a', '#c08cff', '#7ad8ff', '#9affe0'];
    const col = cols[Math.max(0, Math.min(3, hp))];
    const R = 32 + (hitT > 0 ? hitT * 14 : 0);
    const flick = hp === 1 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 14)) : 1;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 * flick;
    g.drawImage(Art.glow(col, 128), x - R * 1.8, y - R * 1.8, R * 3.6, R * 3.6);
    g.globalAlpha = flick;
    const seg = 6;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU + t * 1.6, a1 = a0 + TAU / seg - 0.12;
      g.strokeStyle = U.rgba(col, 0.9);
      g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(x + Math.cos(a0) * R, y + Math.sin(a0) * R);
      g.lineTo(x + Math.cos(a1) * R, y + Math.sin(a1) * R);
      g.stroke();
      // çatlaklar: kayıp katman başına segmentlerde kırık
      const lost = max - hp;
      if (lost > 0 && i % (4 - Math.min(3, lost)) === 0) {
        const am = (a0 + a1) / 2;
        g.strokeStyle = 'rgba(255,255,255,0.9)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x + Math.cos(am) * R, y + Math.sin(am) * R);
        g.lineTo(x + Math.cos(am + 0.08) * (R - 7), y + Math.sin(am + 0.08) * (R - 7));
        g.lineTo(x + Math.cos(am - 0.05) * (R - 12), y + Math.sin(am - 0.05) * (R - 12));
        g.stroke();
      }
    }
    // iç ince halka
    g.strokeStyle = U.rgba('#ffffff', 0.25);
    g.lineWidth = 1;
    g.beginPath(); g.arc(x, y, R - 5, 0, TAU); g.stroke();
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  };

  // ---------- Yıldırım ----------
  Art.boltPath = function (x1, y1, x2, y2, jag) {
    const pts = [[x1, y1]];
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(3, Math.floor(d / 18));
    const nx = -(y2 - y1) / (d || 1), ny = (x2 - x1) / (d || 1);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const off = (Math.random() - 0.5) * jag * Math.sin(t * Math.PI);
      pts.push([U.lerp(x1, x2, t) + nx * off, U.lerp(y1, y2, t) + ny * off]);
    }
    pts.push([x2, y2]);
    return pts;
  };
  Art.drawBolt = function (g, pts, col, a) {
    g.globalCompositeOperation = 'lighter';
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (const [w, c, al] of [[9, col, 0.25], [4, col, 0.7], [1.6, '#ffffff', 1]]) {
      g.strokeStyle = U.rgba(c, al * a);
      g.lineWidth = w;
      g.beginPath();
      pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  };

  // ---------- Kırık parça (shard) ----------
  Art.drawShard = function (g, p) {
    const k = p.life / p.max;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    const s = p.size;
    g.globalAlpha = Math.min(1, k * 1.6);
    g.fillStyle = p.col;
    g.beginPath();
    g.moveTo(0, -s); g.lineTo(s * 0.7, s * 0.5); g.lineTo(-s * 0.55, s * 0.6);
    g.closePath();
    g.fill();
    g.strokeStyle = p.rim;
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
    g.globalAlpha = 1;
  };

  // ---------- Altın ateşböceği (nadir yaratık) ----------
  Art.GOLD_SKIN = { core: '#fffbe6', mid: '#ffd84a', edge: '#ff9a1a' };
  Art.drawGoldbug = function (g, x, y, t, vx, vy) {
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.8 + 0.2 * Math.sin(t * 8);
    g.drawImage(Art.glow('#ffd36b', 128), x - 50, y - 50, 100, 100);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    Art.drawLumi(g, x, y, t * 1.4, { skin: Art.GOLD_SKIN, vx, vy, blink: 0, mood: 'happy', power: 0, scale: 0.62 });
    // taç
    g.fillStyle = '#ffe68a';
    g.beginPath();
    g.moveTo(x - 6, y - 10); g.lineTo(x - 4, y - 16); g.lineTo(x - 1, y - 12); g.lineTo(x + 1, y - 17); g.lineTo(x + 3, y - 12); g.lineTo(x + 6, y - 16); g.lineTo(x + 6, y - 10);
    g.fill();
  };

  // ---------- Yeni güçlendirme simgeleri ----------
  const POWER_COL = { shield: '#7ab8ff', magnet: '#ff7ad1', nova: '#ffd36b', prism: '#8fffd0', bolt: '#ffe08a', chain: '#a8b8ff', star: '#ffffff' };
  Art.POWER_COL = POWER_COL;
  const baseDrawPower = Art.drawPower;
  Art.drawPower = function (g, x, y, r, t, kind) {
    if (kind !== 'bolt' && kind !== 'chain' && kind !== 'star') return baseDrawPower(g, x, y, r, t, kind);
    const col = POWER_COL[kind];
    y += Math.sin(t * 3) * 3;
    g.globalCompositeOperation = 'lighter';
    if (kind === 'star') {
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = 0.5;
        g.drawImage(Art.glow(['#ff7ad8', '#7affd8', '#ffd36b'][i], 128), x - r * 2.6 + Math.cos(t * 3 + i * 2) * 4, y - r * 2.6 + Math.sin(t * 3 + i * 2) * 4, r * 5.2, r * 5.2);
      }
      g.globalAlpha = 1;
    } else g.drawImage(Art.glow(col, 128), x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    g.globalCompositeOperation = 'source-over';
    const bg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    bg.addColorStop(0, 'rgba(255,255,255,0.95)');
    bg.addColorStop(0.4, U.rgba(col, 0.55));
    bg.addColorStop(1, U.rgba(U.mix(col, '#000000', 0.55), 0.8));
    g.fillStyle = bg;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = kind === 'chain' ? '#c8d8ff' : 'rgba(255,255,255,0.75)';
    g.lineWidth = kind === 'chain' ? 2.5 : 1.5;
    g.stroke();
    g.save();
    g.translate(x, y);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineWidth = 2.2; g.lineCap = 'round';
    const s = r * 0.52;
    g.beginPath();
    if (kind === 'bolt') {
      for (let i = 0; i < 3; i++) { g.moveTo(-s * 0.8 + i * s * 0.55, s * 0.6); g.lineTo(-s * 0.2 + i * s * 0.55, -s * 0.5); }
      g.stroke();
      g.beginPath(); g.arc(s * 0.55, -s * 0.6, 3, 0, TAU); g.fill();
    } else if (kind === 'chain') {
      g.moveTo(s * 0.3, -s); g.lineTo(-s * 0.4, s * 0.05); g.lineTo(s * 0.15, s * 0.05); g.lineTo(-s * 0.3, s); g.lineTo(s * 0.5, -s * 0.15); g.lineTo(-s * 0.05, -s * 0.15); g.closePath();
      g.fill();
    } else {
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2; const rr = i % 2 ? s * 0.45 : s; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath();
      const sg = g.createLinearGradient(-s, -s, s, s);
      sg.addColorStop(0, '#ff9ad8'); sg.addColorStop(0.5, '#fff6b0'); sg.addColorStop(1, '#8affd8');
      g.fillStyle = sg; g.fill();
    }
    g.restore();
    // nadir parıltı yıldızları
    if (kind === 'chain' || kind === 'star') {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = t * 2.5 + i * 2.1;
        g.drawImage(Art.spark('#ffffff', 48), x + Math.cos(a) * r * 1.5 - 7, y + Math.sin(a) * r * 1.5 - 7, 14, 14);
      }
      g.globalCompositeOperation = 'source-over';
    }
  };
})();
