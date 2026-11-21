/* LUMORA — prosedürel sanat: ışık sprite'ları, karakterler, biyom arka planları */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;
  const TAU = U.TAU;

  const cache = {};

  const Art = {
    // ---------- Işık sprite'ları ----------
    glow(color, size, core) {
      const key = 'g' + color + size + (core || 0);
      if (cache[key]) return cache[key];
      const c = U.makeCanvas(size, size);
      const g = c.getContext('2d');
      const r = size / 2;
      const grd = g.createRadialGradient(r, r, 0, r, r, r);
      if (core) {
        grd.addColorStop(0, 'rgba(255,255,255,1)');
        grd.addColorStop(core, U.rgba(color, 0.9));
        grd.addColorStop(Math.min(0.99, core + 0.25), U.rgba(color, 0.25));
      } else {
        grd.addColorStop(0, U.rgba(color, 0.85));
        grd.addColorStop(0.25, U.rgba(color, 0.35));
        grd.addColorStop(0.6, U.rgba(color, 0.08));
      }
      grd.addColorStop(1, U.rgba(color, 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      return (cache[key] = c);
    },
    // Işık maskesi için yumuşak beyaz disk
    softDisc(size) {
      const key = 'sd' + size;
      if (cache[key]) return cache[key];
      const c = U.makeCanvas(size, size);
      const g = c.getContext('2d');
      const r = size / 2;
      const grd = g.createRadialGradient(r, r, 0, r, r, r);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(0.45, 'rgba(0,0,0,0.75)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      return (cache[key] = c);
    },
    // Duman topağı (gölge yaratıklar)
    smoke(color, rim, size) {
      const key = 'sm' + color + rim + size;
      if (cache[key]) return cache[key];
      const c = U.makeCanvas(size, size);
      const g = c.getContext('2d');
      const r = size / 2;
      let grd = g.createRadialGradient(r, r, 0, r, r, r);
      grd.addColorStop(0, U.rgba(color, 0.98));
      grd.addColorStop(0.55, U.rgba(color, 0.9));
      grd.addColorStop(0.78, U.rgba(U.mix(color, rim, 0.45), 0.55));
      grd.addColorStop(1, U.rgba(rim, 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      return (cache[key] = c);
    },
    // Küçük kıvılcım sprite'ı (sürü için, çok sayıda çizilir)
    spark(color, size) {
      const key = 'sp' + color + size;
      if (cache[key]) return cache[key];
      const c = U.makeCanvas(size, size);
      const g = c.getContext('2d');
      const r = size / 2;
      const grd = g.createRadialGradient(r, r, 0, r, r, r);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.12, 'rgba(255,250,220,1)');
      grd.addColorStop(0.22, U.rgba(color, 0.85));
      grd.addColorStop(0.45, U.rgba(color, 0.22));
      grd.addColorStop(1, U.rgba(color, 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, size, size);
      // çapraz parıltı
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(255,255,240,0.35)';
      g.lineWidth = size * 0.03;
      g.beginPath();
      g.moveTo(r, r - r * 0.7); g.lineTo(r, r + r * 0.7);
      g.moveTo(r - r * 0.7, r); g.lineTo(r + r * 0.7, r);
      g.stroke();
      return (cache[key] = c);
    },

    // ---------- Lumi (oyuncu) ----------
    drawLumi(g, x, y, t, st) {
      const skin = st.skin;
      const s = st.scale || 1;
      const R = 13 * s;
      // dış hale
      g.globalCompositeOperation = 'lighter';
      const gl = Art.glow(skin.mid, 256);
      const pulse = 1 + Math.sin(t * 4) * 0.06;
      const hs = (150 + st.power * 60) * s * pulse;
      g.globalAlpha = 0.75;
      g.drawImage(gl, x - hs / 2, y - hs / 2, hs, hs);
      g.globalAlpha = 1;

      // kanatlar (yaprak/taç yaprağı biçiminde yarı saydam)
      const flap = Math.sin(t * 22) * 0.55;
      const tilt = U.clamp(st.vx * 0.0025, -0.5, 0.5);
      g.save();
      g.translate(x, y);
      g.rotate(tilt);
      for (let side = -1; side <= 1; side += 2) {
        for (let k = 0; k < 2; k++) {
          g.save();
          g.scale(side, 1);
          const base = k === 0 ? -0.55 : 0.35;
          g.rotate(base + (k === 0 ? flap : flap * 0.6) * (k === 0 ? 1 : -1));
          const len = (k === 0 ? 26 : 18) * s, wid = (k === 0 ? 11 : 8) * s;
          const wg = g.createLinearGradient(0, 0, len, 0);
          wg.addColorStop(0, U.rgba(skin.core, 0.75));
          wg.addColorStop(0.6, U.rgba(skin.mid, 0.38));
          wg.addColorStop(1, U.rgba(skin.edge, 0.1));
          g.fillStyle = wg;
          g.beginPath();
          g.moveTo(R * 0.4, 0);
          g.quadraticCurveTo(len * 0.5, -wid, len, -wid * 0.15);
          g.quadraticCurveTo(len * 0.55, wid * 0.8, R * 0.4, 0);
          g.fill();
          g.strokeStyle = U.rgba(skin.core, 0.5);
          g.lineWidth = 0.8 * s;
          g.beginPath();
          g.moveTo(R * 0.5, 0);
          g.quadraticCurveTo(len * 0.5, -wid * 0.25, len * 0.92, -wid * 0.15);
          g.stroke();
          g.restore();
        }
      }
      g.restore();

      // gövde
      g.globalCompositeOperation = 'source-over';
      const bg = g.createRadialGradient(x - R * 0.35, y - R * 0.45, R * 0.1, x, y, R * 1.05);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.35, skin.core);
      bg.addColorStop(0.8, skin.mid);
      bg.addColorStop(1, skin.edge);
      g.fillStyle = bg;
      g.beginPath();
      g.arc(x, y, R, 0, TAU);
      g.fill();

      // antenler
      g.strokeStyle = U.rgba(skin.edge, 0.9);
      g.lineWidth = 1.4 * s;
      for (let side = -1; side <= 1; side += 2) {
        const sway = Math.sin(t * 3 + side) * 2 * s;
        const tx = x + side * 7 * s + sway, ty = y - R - 9 * s;
        g.beginPath();
        g.moveTo(x + side * 4 * s, y - R * 0.8);
        g.quadraticCurveTo(x + side * 3 * s, y - R - 5 * s, tx, ty);
        g.stroke();
        g.globalCompositeOperation = 'lighter';
        const tg = Art.glow(skin.mid, 64, 0.2);
        g.drawImage(tg, tx - 7 * s, ty - 7 * s, 14 * s, 14 * s);
        g.globalCompositeOperation = 'source-over';
      }

      // yüz
      const lookX = U.clamp(st.vx * 0.012, -3.5, 3.5) * s;
      const lookY = U.clamp(st.vy * 0.012, -3, 3) * s;
      const blink = st.blink > 0 ? 0.15 : 1;
      const scared = st.mood === 'hurt';
      g.fillStyle = '#2a1a33';
      for (let side = -1; side <= 1; side += 2) {
        const ex = x + side * 4.6 * s + lookX, ey = y - 1 * s + lookY;
        g.beginPath();
        g.ellipse(ex, ey, 2.3 * s, (scared ? 3.6 : 3.1) * s * blink, 0, 0, TAU);
        g.fill();
        if (blink > 0.5) {
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(ex + 0.8 * s, ey - 1.2 * s, 0.9 * s, 0, TAU);
          g.fill();
          g.fillStyle = '#2a1a33';
        }
      }
      // yanaklar
      g.fillStyle = U.rgba(skin.edge, 0.45);
      g.beginPath();
      g.ellipse(x - 8 * s + lookX * 0.5, y + 3 * s + lookY * 0.5, 2.4 * s, 1.5 * s, 0, 0, TAU);
      g.ellipse(x + 8 * s + lookX * 0.5, y + 3 * s + lookY * 0.5, 2.4 * s, 1.5 * s, 0, 0, TAU);
      g.fill();
      // ağız
      g.strokeStyle = '#2a1a33';
      g.lineWidth = 1.3 * s;
      g.beginPath();
      if (scared) g.arc(x + lookX, y + 6.5 * s + lookY, 2 * s, Math.PI * 1.1, Math.PI * 1.9);
      else if (st.mood === 'happy') {
        g.fillStyle = '#5a2030';
        g.arc(x + lookX, y + 3.5 * s + lookY, 2.6 * s, 0.1, Math.PI - 0.1);
        g.fill();
      } else g.arc(x + lookX, y + 3.5 * s + lookY, 2.2 * s, 0.25, Math.PI - 0.25);
      g.stroke();

      // iç parıltı
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.6;
      const cg = Art.glow('#ffffff', 64, 0.15);
      g.drawImage(cg, x - R * 1.2, y - R * 1.4, R * 1.4, R * 1.4);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },

    // ---------- Gölge yaratıklar ----------
    drawWisp(g, x, y, r, t, b, hurt, seed) {
      const sm = Art.smoke(b.shadow, b.shadowRim, 128);
      // dış mor/kırmızı hale (bozulmuş ışık)
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.45;
      const hg = Art.glow(b.shadowRim, 128);
      g.drawImage(hg, x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      // kuyruk
      for (let i = 4; i >= 1; i--) {
        const k = i / 4;
        const tx = x + Math.sin(t * 3 + i + seed) * r * 0.5 * k;
        const ty = y + r * 0.9 * i * 0.55;
        const rr = r * (1.25 - k * 0.7);
        g.globalAlpha = 0.85 - k * 0.5;
        g.drawImage(sm, tx - rr, ty - rr, rr * 2, rr * 2);
      }
      // gövde topakları
      g.globalAlpha = 1;
      for (let i = 0; i < 5; i++) {
        const a = t * 1.7 + i * 1.26 + seed;
        const ox = Math.cos(a) * r * 0.32, oy = Math.sin(a * 1.3) * r * 0.28;
        const rr = r * (0.95 + 0.12 * Math.sin(t * 4 + i));
        g.drawImage(sm, x + ox - rr, y + oy - rr, rr * 2, rr * 2);
      }
      // gözler
      const blink = (Math.sin(t * 0.9 + seed * 3) > 0.97) ? 0.2 : 1;
      g.globalCompositeOperation = 'lighter';
      const eg = Art.glow(hurt ? '#ffffff' : b.shadowRim, 64, 0.25);
      for (let s = -1; s <= 1; s += 2) {
        const ex = x + s * r * 0.33, ey = y - r * 0.1;
        g.drawImage(eg, ex - r * 0.45, ey - r * 0.45, r * 0.9, r * 0.9);
        g.fillStyle = '#ffe8f4';
        g.save();
        g.translate(ex, ey);
        g.rotate(s * 0.35);
        g.beginPath();
        g.ellipse(0, 0, r * 0.13, r * 0.08 * blink, 0, 0, TAU);
        g.fill();
        g.restore();
      }
      g.globalCompositeOperation = 'source-over';
    },

    drawMoth(g, x, y, r, t, b, angle, charging) {
      g.save();
      g.translate(x, y);
      g.rotate(angle + Math.PI / 2);
      const flap = 0.55 + Math.abs(Math.sin(t * (charging ? 30 : 12))) * 0.45;
      // hale
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = charging ? 0.8 : 0.35;
      const hg = Art.glow(b.shadowRim, 128);
      g.drawImage(hg, -r * 2.5, -r * 2.5, r * 5, r * 5);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      for (let s = -1; s <= 1; s += 2) {
        g.save();
        g.scale(s * flap, 1);
        // üst kanat
        const wg = g.createLinearGradient(0, 0, r * 1.6, -r);
        wg.addColorStop(0, b.shadow);
        wg.addColorStop(0.7, U.mix(b.shadow, b.shadowRim, 0.25));
        wg.addColorStop(1, U.mix(b.shadow, b.shadowRim, 0.6));
        g.fillStyle = wg;
        g.beginPath();
        g.moveTo(0, -r * 0.2);
        g.bezierCurveTo(r * 0.6, -r * 1.4, r * 1.8, -r * 1.3, r * 1.7, -r * 0.2);
        g.bezierCurveTo(r * 1.4, r * 0.2, r * 0.6, r * 0.1, 0, r * 0.1);
        g.fill();
        // alt kanat
        g.beginPath();
        g.moveTo(0, r * 0.1);
        g.bezierCurveTo(r * 0.9, r * 0.1, r * 1.2, r * 0.9, r * 0.6, r * 1.2);
        g.bezierCurveTo(r * 0.3, r * 1.1, r * 0.1, r * 0.6, 0, r * 0.4);
        g.fill();
        // kanat gözü
        g.globalCompositeOperation = 'lighter';
        const eg = Art.glow(charging ? '#ff3355' : b.shadowRim, 64, 0.3);
        g.drawImage(eg, r * 0.85 - r * 0.35, -r * 0.65 - r * 0.35, r * 0.7, r * 0.7);
        g.globalCompositeOperation = 'source-over';
        g.restore();
      }
      // gövde
      g.fillStyle = b.shadow;
      g.beginPath();
      g.ellipse(0, 0, r * 0.22, r * 0.75, 0, 0, TAU);
      g.fill();
      g.restore();
    },

    // Dikenli sarmaşık — bir kez çizilip önbelleğe alınır
    buildVine(points, thick, b, seed) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      }
      const pad = thick * 2.2 + 14;
      const c = U.makeCanvas(maxX - minX + pad * 2, maxY - minY + pad * 2);
      const g = c.getContext('2d');
      const ox = -minX + pad, oy = -minY + pad;
      const rnd = U.rng(seed);
      const path = () => {
        g.beginPath();
        g.moveTo(points[0][0] + ox, points[0][1] + oy);
        for (let i = 1; i < points.length - 1; i++) {
          const mx = (points[i][0] + points[i + 1][0]) / 2 + ox, my = (points[i][1] + points[i + 1][1]) / 2 + oy;
          g.quadraticCurveTo(points[i][0] + ox, points[i][1] + oy, mx, my);
        }
        const l = points[points.length - 1];
        g.lineTo(l[0] + ox, l[1] + oy);
      };
      g.lineCap = 'round';
      g.lineJoin = 'round';
      // dikenler
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], bb = points[i + 1];
        const segs = Math.max(1, Math.floor(Math.hypot(bb[0] - a[0], bb[1] - a[1]) / 16));
        for (let k = 0; k < segs; k++) {
          const tt = (k + rnd()) / segs;
          const px = U.lerp(a[0], bb[0], tt) + ox, py = U.lerp(a[1], bb[1], tt) + oy;
          const ang = Math.atan2(bb[1] - a[1], bb[0] - a[0]) + (rnd() < 0.5 ? -1 : 1) * (Math.PI / 2 + (rnd() - 0.5) * 0.9);
          const len = thick * (0.9 + rnd() * 0.8);
          const nx = Math.cos(ang), ny = Math.sin(ang);
          const tx = -ny, ty = nx;
          g.fillStyle = U.mix(b.near, '#000000', 0.2);
          g.beginPath();
          g.moveTo(px + tx * thick * 0.3, py + ty * thick * 0.3);
          g.lineTo(px + nx * len, py + ny * len);
          g.lineTo(px - tx * thick * 0.3, py - ty * thick * 0.3);
          g.fill();
          g.strokeStyle = U.rgba(b.shadowRim, 0.55);
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(px + tx * thick * 0.2, py + ty * thick * 0.2);
          g.lineTo(px + nx * len, py + ny * len);
          g.stroke();
        }
      }
      // zehirli parıltı (tehlikeyi okunur kılar)
      g.save();
      g.shadowColor = U.rgba(b.shadowRim, 0.9);
      g.shadowBlur = 14;
      g.strokeStyle = U.rgba(b.shadowRim, 0.35);
      g.lineWidth = thick * 1.25;
      path();
      g.stroke();
      g.restore();
      // gövde
      g.strokeStyle = U.mix(b.near, '#000000', 0.35);
      g.lineWidth = thick;
      path();
      g.stroke();
      g.strokeStyle = U.mix(b.near, b.shadowRim, 0.18);
      g.lineWidth = thick * 0.55;
      g.save();
      g.translate(0, -thick * 0.18);
      path();
      g.stroke();
      g.restore();
      g.strokeStyle = U.rgba(b.rim, 0.35);
      g.lineWidth = Math.max(1, thick * 0.12);
      g.save();
      g.translate(0, -thick * 0.35);
      path();
      g.stroke();
      g.restore();
      // mor zehirli tomurcuklar
      for (let i = 0; i < points.length; i += 2) {
        if (rnd() < 0.5) continue;
        const p = points[i];
        const bx = p[0] + ox + (rnd() - 0.5) * thick, by = p[1] + oy - thick * 0.4;
        g.globalCompositeOperation = 'lighter';
        const gg = Art.glow(b.shadowRim, 64);
        g.drawImage(gg, bx - 12, by - 12, 24, 24);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = U.mix(b.shadowRim, '#ffffff', 0.3);
        g.beginPath();
        g.arc(bx, by, 2.4, 0, TAU);
        g.fill();
      }
      return { canvas: c, ox: minX - pad, oy: minY - pad };
    },

    drawWheel(g, x, y, r, rot, b) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.4;
      const hg = Art.glow(b.shadowRim, 128);
      g.drawImage(hg, -r * 2, -r * 2, r * 4, r * 4);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const n = 10;
      g.fillStyle = U.mix(b.shadow, '#000000', 0.2);
      g.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const rr = i % 2 === 0 ? r : r * 0.66;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = U.rgba(b.shadowRim, 0.8);
      g.lineWidth = 1.5;
      g.stroke();
      const cg = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.6);
      cg.addColorStop(0, U.mix(b.shadowRim, '#ffffff', 0.2));
      cg.addColorStop(0.3, U.mix(b.shadowRim, b.shadow, 0.5));
      cg.addColorStop(1, b.shadow);
      g.fillStyle = cg;
      g.beginPath();
      g.arc(0, 0, r * 0.5, 0, TAU);
      g.fill();
      g.restore();
    },

    drawJelly(g, x, y, r, t, b) {
      const pulse = 1 + Math.sin(t * 3) * 0.1;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.5;
      g.drawImage(Art.glow(b.shadowRim, 128), x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      // dokungaçlar
      g.strokeStyle = U.rgba(b.shadowRim, 0.55);
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const sx = x + (i - 2) * r * 0.32;
        g.beginPath();
        g.moveTo(sx, y + r * 0.2);
        for (let k = 1; k <= 6; k++) {
          g.lineTo(sx + Math.sin(t * 4 + k * 0.8 + i) * r * 0.18, y + r * 0.2 + k * r * 0.28);
        }
        g.stroke();
      }
      // çan
      const bg = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r * pulse);
      bg.addColorStop(0, U.rgba(U.mix(b.shadowRim, '#ffffff', 0.3), 0.9));
      bg.addColorStop(0.5, U.rgba(b.shadow, 0.92));
      bg.addColorStop(1, U.rgba(b.shadowRim, 0.7));
      g.fillStyle = bg;
      g.beginPath();
      g.ellipse(x, y, r * pulse, r * 0.8 / pulse, 0, Math.PI, 0);
      g.quadraticCurveTo(x + r * 0.5, y + r * 0.3, x, y + r * 0.2);
      g.quadraticCurveTo(x - r * 0.5, y + r * 0.3, x - r * pulse, y);
      g.fill();
    },

    drawMeteor(g, x, y, r, vx, vy, b) {
      const ang = Math.atan2(vy, vx);
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      const tg = g.createLinearGradient(-r * 8, 0, 0, 0);
      tg.addColorStop(0, U.rgba(b.shadowRim, 0));
      tg.addColorStop(1, U.rgba(b.shadowRim, 0.7));
      g.fillStyle = tg;
      g.beginPath();
      g.moveTo(-r * 8, 0);
      g.lineTo(0, -r * 0.9);
      g.lineTo(0, r * 0.9);
      g.fill();
      g.restore();
      g.globalCompositeOperation = 'lighter';
      g.drawImage(Art.glow(b.shadowRim, 128), x - r * 2.5, y - r * 2.5, r * 5, r * 5);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(Art.smoke(b.shadow, b.shadowRim, 128), x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4);
    },

    drawWeb(g, x, y, r, b, t) {
      g.save();
      g.translate(x, y);
      g.strokeStyle = U.rgba(U.mix(b.rim, '#ffffff', 0.4), 0.33);
      g.lineWidth = 1;
      const n = 8;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 0.2;
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      for (let ring = 1; ring <= 4; ring++) {
        const rr = (r * ring) / 4.4;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * TAU + 0.2;
          const sag = 0.9;
          if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
          else {
            const pa = ((i - 0.5) / n) * TAU + 0.2;
            g.quadraticCurveTo(Math.cos(pa) * rr * sag, Math.sin(pa) * rr * sag, Math.cos(a) * rr, Math.sin(a) * rr);
          }
        }
      }
      g.stroke();
      // çiy damlaları
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.3 + 0.4, rr = r * (0.3 + (i % 3) * 0.2);
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
        g.globalAlpha = tw;
        g.drawImage(Art.glow(b.accent, 32, 0.3), Math.cos(a) * rr - 4, Math.sin(a) * rr - 4, 8, 8);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.restore();
    },

    drawCocoon(g, x, y, r, t, need, ok, b) {
      const sway = Math.sin(t * 1.5) * 0.12;
      g.save();
      g.translate(x, y - r * 2.4);
      g.rotate(sway);
      // ip
      g.strokeStyle = U.rgba(b.rim, 0.5);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, -200);
      g.lineTo(0, r * 1.2);
      g.stroke();
      g.translate(0, r * 2.4);
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = ok ? 0.95 : 0.55;
      g.drawImage(Art.glow(b.accent, 128), -r * 3, -r * 3, r * 6, r * 6);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const cg = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.3);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.3, U.mix(b.accent, '#ffffff', 0.4));
      cg.addColorStop(1, U.mix(b.accent, '#103030', 0.55));
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(0, 0, r * 0.8 * pulse, r * 1.25 * pulse, 0, 0, TAU);
      g.fill();
      // sarım çizgileri
      g.strokeStyle = U.rgba(U.mix(b.accent, '#000000', 0.5), 0.5);
      g.lineWidth = 1.2;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.ellipse(0, i * r * 0.42, r * 0.78 * Math.cos(i * 0.32), r * 0.16, 0.25, 0, Math.PI);
        g.stroke();
      }
      g.restore();
    },

    // Güçlendirme küresi
    drawPower(g, x, y, r, t, kind) {
      const col = { shield: '#7ab8ff', magnet: '#ff7ad1', nova: '#ffd36b', prism: '#8fffd0' }[kind];
      const bob = Math.sin(t * 3) * 3;
      y += bob;
      g.globalCompositeOperation = 'lighter';
      g.drawImage(Art.glow(col, 128), x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
      g.globalCompositeOperation = 'source-over';
      const bg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      bg.addColorStop(0, 'rgba(255,255,255,0.95)');
      bg.addColorStop(0.4, U.rgba(col, 0.55));
      bg.addColorStop(1, U.rgba(U.mix(col, '#000000', 0.5), 0.75));
      g.fillStyle = bg;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1.5;
      g.stroke();
      // simge
      g.save();
      g.translate(x, y);
      g.strokeStyle = '#ffffff';
      g.fillStyle = '#ffffff';
      g.lineWidth = 2.2;
      g.lineCap = 'round';
      const s = r * 0.5;
      g.beginPath();
      if (kind === 'shield') {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          g.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        }
        g.closePath();
        g.stroke();
      } else if (kind === 'magnet') {
        g.arc(0, -s * 0.1, s * 0.65, Math.PI, 0, false);
        g.moveTo(-s * 0.65, -s * 0.1); g.lineTo(-s * 0.65, s * 0.7);
        g.moveTo(s * 0.65, -s * 0.1); g.lineTo(s * 0.65, s * 0.7);
        g.stroke();
      } else if (kind === 'nova') {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU - Math.PI / 2 + t;
          const rr = i % 2 ? s * 0.45 : s;
          g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
      } else {
        g.moveTo(0, -s); g.lineTo(s * 0.9, s * 0.7); g.lineTo(-s * 0.9, s * 0.7); g.closePath();
        g.stroke();
        g.beginPath();
        g.moveTo(-s * 1.2, -s * 0.2); g.lineTo(0, 0);
        g.stroke();
      }
      g.restore();
      // parlama
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.beginPath();
      g.ellipse(x - r * 0.4, y - r * 0.5, r * 0.25, r * 0.12, -0.6, 0, TAU);
      g.fill();
    },

    drawAmber(g, x, y, r, t) {
      const rot = Math.sin(t * 2) * 0.3;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.7;
      g.drawImage(Art.glow('#ffa63c', 64), x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      const gg = g.createLinearGradient(-r, -r, r, r);
      gg.addColorStop(0, '#fff2b0');
      gg.addColorStop(0.4, '#ffb340');
      gg.addColorStop(1, '#b44a10');
      g.fillStyle = gg;
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 1.15);
      }
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.moveTo(-r * 0.5, -r * 0.6); g.lineTo(0, -r * 0.9); g.lineTo(r * 0.1, -r * 0.2); g.closePath();
      g.fill();
      g.restore();
    },

    // ---------- Ay Ağacı (seviye sonu) ----------
    buildTree(W, b, seed, lanternCount) {
      const H = Math.round(W * 1.25);
      const mk = () => {
        const c = U.makeCanvas(W, H);
        return c;
      };
      const dark = mk(), lit = mk();
      const lanterns = [];
      const draw = (g, isLit) => {
        const rnd = U.rng(seed);
        const trunkCol = isLit ? U.mix(b.leaf, '#fff2c8', 0.25) : U.mix(b.near, '#000000', 0.3);
        const rimCol = isLit ? '#fff3c4' : b.rim;
        const branches = [];
        const grow = (x, y, ang, len, w, depth) => {
          const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
          const cx = x + Math.cos(ang + (rnd() - 0.5) * 0.6) * len * 0.5, cy = y + Math.sin(ang + (rnd() - 0.5) * 0.6) * len * 0.5;
          branches.push([x, y, cx, cy, ex, ey, w, depth]);
          if (depth <= 0) return;
          const n = depth > 3 ? 2 : rnd() < 0.6 ? 2 : 3;
          for (let i = 0; i < n; i++) {
            const na = ang + (i - (n - 1) / 2) * (0.5 + rnd() * 0.35) + (rnd() - 0.5) * 0.2;
            grow(ex, ey, na, len * (0.68 + rnd() * 0.12), w * 0.68, depth - 1);
          }
        };
        grow(W / 2, H, -Math.PI / 2, H * 0.27, W * 0.085, 6);
        // dallar
        g.lineCap = 'round';
        for (const br of branches) {
          g.strokeStyle = trunkCol;
          g.lineWidth = br[6];
          g.beginPath();
          g.moveTo(br[0], br[1]);
          g.quadraticCurveTo(br[2], br[3], br[4], br[5]);
          g.stroke();
          g.strokeStyle = U.rgba(rimCol, isLit ? 0.55 : 0.28);
          g.lineWidth = Math.max(1, br[6] * 0.22);
          g.beginPath();
          g.moveTo(br[0] - br[6] * 0.3, br[1]);
          g.quadraticCurveTo(br[2] - br[6] * 0.3, br[3], br[4] - br[6] * 0.3, br[5]);
          g.stroke();
        }
        // yaprak bulutları (uç dallarda)
        const tips = branches.filter((x) => x[7] <= 1);
        for (const tp of tips) {
          const n = 3 + ((rnd() * 3) | 0);
          for (let i = 0; i < n; i++) {
            const lx = tp[4] + (rnd() - 0.5) * W * 0.09, ly = tp[5] + (rnd() - 0.5) * W * 0.07;
            const lr = W * (0.03 + rnd() * 0.035);
            const lg = g.createRadialGradient(lx - lr * 0.3, ly - lr * 0.4, lr * 0.1, lx, ly, lr);
            if (isLit) {
              lg.addColorStop(0, U.mix(b.accent, '#ffffff', 0.6));
              lg.addColorStop(0.6, U.rgba(b.accent, 0.7));
              lg.addColorStop(1, U.rgba(b.glow2, 0.15));
            } else {
              lg.addColorStop(0, U.mix(b.leaf, b.leafRim, 0.25));
              lg.addColorStop(0.7, b.leaf);
              lg.addColorStop(1, U.rgba(b.leaf, 0));
            }
            g.fillStyle = lg;
            g.beginPath();
            g.arc(lx, ly, lr, 0, TAU);
            g.fill();
          }
        }
        if (!isLit) {
          // fener konumları: dal uçlarından seç
          const pool = branches.filter((x) => x[7] <= 2 && x[5] < H * 0.85);
          for (let i = 0; i < lanternCount && pool.length; i++) {
            const idx = Math.floor(rnd() * pool.length);
            const br = pool.splice(idx, 1)[0];
            lanterns.push({ x: br[4], y: br[5] + 10 + rnd() * 10, lit: 0 });
          }
        }
      };
      draw(dark.getContext('2d'), false);
      draw(lit.getContext('2d'), true);
      lanterns.sort((a, c) => c.y - a.y);
      return { dark, lit, lanterns, W, H };
    },

    drawLantern(g, x, y, lit, t, b) {
      const sw = Math.sin(t * 2 + x) * 0.15;
      g.save();
      g.translate(x, y);
      g.rotate(sw);
      g.strokeStyle = U.rgba(b.rim, 0.5);
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, -12);
      g.lineTo(0, -5);
      g.stroke();
      if (lit > 0) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = lit;
        g.drawImage(Art.glow('#ffcf6b', 128), -34, -34, 68, 68);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
      const col = lit > 0 ? U.mix('#3a2a40', '#fff0b0', lit) : '#2c2238';
      const lg = g.createRadialGradient(-2, -3, 1, 0, 0, 9);
      lg.addColorStop(0, lit > 0 ? '#ffffff' : '#4a3a58');
      lg.addColorStop(1, col);
      g.fillStyle = lg;
      g.beginPath();
      g.ellipse(0, 2, 6, 8, 0, 0, TAU);
      g.fill();
      g.fillStyle = U.rgba(b.rim, 0.6);
      g.fillRect(-4, -6, 8, 2);
      g.restore();
    },

    // ---------- Arka plan katmanları (dikey döşenebilir) ----------
    buildBackground(bi, W, H) {
      const b = L.BIOMES[bi];
      const TH = Math.ceil(H * 1.6);
      const layers = [];
      const mk = () => U.makeCanvas(W, TH);
      const rnd = U.rng(1234 + bi * 99);
      // dikey sarmalı çizim: y'de, y-TH'de ve y+TH'de
      const wrap = (fn, y) => { fn(y); fn(y - TH); fn(y + TH); };

      // yıldızlar
      const stars = mk();
      {
        const g = stars.getContext('2d');
        const n = Math.floor((W * TH) / 2600);
        for (let i = 0; i < n; i++) {
          const x = rnd() * W, y = rnd() * TH, r = rnd() < 0.08 ? 1.6 : 0.4 + rnd() * 0.8;
          g.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`;
          g.beginPath();
          g.arc(x, y, r, 0, TAU);
          g.fill();
          if (r > 1.2) {
            g.globalCompositeOperation = 'lighter';
            g.drawImage(Art.glow(b.rim, 32), x - 8, y - 8, 16, 16);
            g.globalCompositeOperation = 'source-over';
          }
        }
      }
      layers.push({ canvas: stars, f: 0.05, alpha: bi === 1 ? 0.25 : bi === 2 ? 0.15 : 1 });

      const far = mk(), mid = mk(), near = mk();
      const gf = far.getContext('2d'), gm = mid.getContext('2d'), gn = near.getContext('2d');

      const leafCluster = (g, x, y, r, col, rim, alpha) => {
        for (let i = 0; i < 6; i++) {
          const lx = x + (rnd() - 0.5) * r * 1.6, ly = y + (rnd() - 0.5) * r;
          const lr = r * (0.35 + rnd() * 0.4);
          const grd = g.createRadialGradient(lx - lr * 0.4, ly - lr * 0.5, lr * 0.1, lx, ly, lr);
          grd.addColorStop(0, U.rgba(U.mix(col, rim, 0.55), alpha));
          grd.addColorStop(0.55, U.rgba(col, alpha));
          grd.addColorStop(1, U.rgba(col, 0));
          g.fillStyle = grd;
          g.beginPath();
          g.ellipse(lx, ly, lr * 1.3, lr * 0.8, (rnd() - 0.5) * 0.8, 0, TAU);
          g.fill();
        }
      };
      const glowDot = (g, x, y, size, col, a) => {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = a;
        g.drawImage(Art.glow(col, 64, 0.18), x - size / 2, y - size / 2, size, size);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      };
      // dikey gövde (ağaç/sütun/kaya) — üstten alta, kenar ışığı ile
      const trunk = (g, cx, w, col, rim, wobble, rimSide) => {
        const pts = [];
        const steps = 14;
        const ph = rnd() * TAU, ph2 = rnd() * TAU;
        for (let i = 0; i <= steps; i++) {
          const y = (i / steps) * TH;
          // sarmalı olması için sin periyodu TH'ye bölünür
          const off = Math.sin((y / TH) * TAU * 2 + ph) * wobble + Math.sin((y / TH) * TAU * 3 + ph2) * wobble * 0.4;
          pts.push([cx + off, y]);
        }
        const grd = g.createLinearGradient(cx - w, 0, cx + w, 0);
        grd.addColorStop(0, rimSide < 0 ? U.mix(col, rim, 0.35) : col);
        grd.addColorStop(0.5, U.mix(col, '#000000', 0.25));
        grd.addColorStop(1, rimSide > 0 ? U.mix(col, rim, 0.35) : col);
        g.fillStyle = grd;
        g.beginPath();
        pts.forEach((p, i) => (i ? g.lineTo(p[0] - w / 2, p[1]) : g.moveTo(p[0] - w / 2, p[1])));
        for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0] + w / 2, pts[i][1]);
        g.closePath();
        g.fill();
        // doku çizgileri
        g.strokeStyle = U.rgba(rim, 0.12);
        g.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          const ox = (rnd() - 0.5) * w * 0.8;
          g.beginPath();
          pts.forEach((p, i) => (i ? g.lineTo(p[0] + ox, p[1]) : g.moveTo(p[0] + ox, p[1])));
          g.stroke();
        }
        return pts;
      };
      const ptsX = (pts, y) => {
        const i = U.clamp(Math.floor((y / TH) * (pts.length - 1)), 0, pts.length - 2);
        const t = (y - pts[i][1]) / (pts[i + 1][1] - pts[i][1]);
        return U.lerp(pts[i][0], pts[i + 1][0], t);
      };

      if (b.id === 'forest' || b.id === 'peak') {
        // uzak gövdeler
        for (let i = 0; i < 5; i++) {
          const x = rnd() * W;
          trunk(gf, x, W * (0.04 + rnd() * 0.05), U.mix(b.far, b.fog, 0.25), b.fog, W * 0.02, rnd() < 0.5 ? -1 : 1);
        }
        for (let i = 0; i < 14; i++) {
          const x = rnd() * W, y = rnd() * TH;
          wrap((yy) => leafCluster(gf, x, yy, W * 0.08, U.mix(b.far, b.fog, 0.2), b.fog, 0.6), y);
        }
        // orta: iki yanda büyük gövde + dallar
        for (let side = 0; side < 2; side++) {
          const cx = side ? W * (0.97 + rnd() * 0.05) : W * (0.03 - rnd() * 0.05);
          const w = W * 0.18;
          const pts = trunk(gm, cx, w, b.mid, b.rim, W * 0.025, side ? -1 : 1);
          for (let k = 0; k < 6; k++) {
            const y = (k + rnd() * 0.6) * (TH / 6);
            const x0 = ptsX(pts, y);
            const dir = side ? -1 : 1;
            const len = W * (0.16 + rnd() * 0.16);
            wrap((yy) => {
              gm.strokeStyle = b.mid;
              gm.lineCap = 'round';
              gm.lineWidth = W * 0.022;
              gm.beginPath();
              gm.moveTo(x0, yy);
              gm.quadraticCurveTo(x0 + dir * len * 0.5, yy - len * 0.35, x0 + dir * len, yy - len * 0.2);
              gm.stroke();
              gm.strokeStyle = U.rgba(b.rim, 0.25);
              gm.lineWidth = 2;
              gm.beginPath();
              gm.moveTo(x0, yy - W * 0.009);
              gm.quadraticCurveTo(x0 + dir * len * 0.5, yy - len * 0.35 - W * 0.009, x0 + dir * len, yy - len * 0.2 - W * 0.009);
              gm.stroke();
              leafCluster(gm, x0 + dir * len, yy - len * 0.22, W * 0.07, b.leaf, b.leafRim, 0.95);
              // asılı mavi çan çiçekleri
              for (let f = 0; f < 3; f++) {
                const fx = x0 + dir * len * (0.4 + f * 0.2), fy = yy - len * 0.25 + W * 0.04 + f * 6;
                gm.strokeStyle = U.rgba(b.leafRim, 0.4);
                gm.lineWidth = 1;
                gm.beginPath();
                gm.moveTo(fx, fy - W * 0.04);
                gm.lineTo(fx, fy);
                gm.stroke();
                glowDot(gm, fx, fy, 26, f % 2 ? b.accent : b.glow2, 0.8);
                gm.fillStyle = U.mix(b.accent, '#ffffff', 0.5);
                gm.beginPath();
                gm.arc(fx, fy, 2.2, 0, TAU);
                gm.fill();
              }
            }, y);
          }
          // sarmaşık sarkıtları
          for (let k = 0; k < 4; k++) {
            const y = rnd() * TH, x0 = ptsX(pts, y), len = H * (0.15 + rnd() * 0.2);
            wrap((yy) => {
              gm.strokeStyle = U.rgba(b.leaf, 0.9);
              gm.lineWidth = 2;
              gm.beginPath();
              gm.moveTo(x0, yy);
              gm.bezierCurveTo(x0 + (side ? -20 : 20), yy + len * 0.3, x0 + (side ? -5 : 5), yy + len * 0.7, x0 + (side ? -15 : 15), yy + len);
              gm.stroke();
            }, y);
          }
        }
        if (b.id === 'peak') {
          // kar kaplı çıkıntılar
          for (let k = 0; k < 10; k++) {
            const side = k % 2, y = rnd() * TH, x0 = side ? W : 0, len = W * (0.1 + rnd() * 0.12);
            wrap((yy) => {
              gn.fillStyle = b.near;
              gn.beginPath();
              gn.moveTo(x0, yy - 30);
              gn.lineTo(x0 + (side ? -len : len), yy);
              gn.lineTo(x0, yy + 40);
              gn.fill();
              gn.fillStyle = U.rgba('#e6f0ff', 0.75);
              gn.beginPath();
              gn.moveTo(x0, yy - 30);
              gn.lineTo(x0 + (side ? -len : len), yy);
              gn.lineTo(x0 + (side ? -len * 0.7 : len * 0.7), yy - 3);
              gn.lineTo(x0, yy - 22);
              gn.fill();
            }, y);
          }
        }
      } else if (b.id === 'cave') {
        // uzak sarkıt sütunlar
        for (let i = 0; i < 6; i++) {
          trunk(gf, rnd() * W, W * (0.05 + rnd() * 0.06), U.mix(b.far, b.fog, 0.2), b.fog, W * 0.03, rnd() < 0.5 ? -1 : 1);
        }
        // kaya duvarları
        for (let side = 0; side < 2; side++) {
          const cx = side ? W * 1.0 : 0;
          const pts = trunk(gm, cx, W * 0.3, b.mid, b.rim, W * 0.05, side ? -1 : 1);
          // mantar kümeleri
          for (let k = 0; k < 8; k++) {
            const y = rnd() * TH;
            const x0 = ptsX(pts, y) + (side ? -W * 0.15 : W * 0.15);
            const col = rnd() < 0.5 ? b.accent : b.glow2;
            wrap((yy) => {
              for (let m = 0; m < 3; m++) {
                const mx = x0 + (side ? -1 : 1) * m * 10 + (rnd() - 0.5) * 8, my = yy - m * 6;
                const mr = 6 + rnd() * 10;
                const ang = (side ? -1 : 1) * (0.5 + rnd() * 0.4);
                gm.save();
                gm.translate(mx, my);
                gm.rotate(ang);
                gm.strokeStyle = U.mix(col, '#ffffff', 0.4);
                gm.lineWidth = mr * 0.28;
                gm.beginPath();
                gm.moveTo(0, 0);
                gm.lineTo(0, -mr * 1.3);
                gm.stroke();
                glowDot(gm, 0, -mr * 1.4, mr * 6, col, 0.6);
                const cg = gm.createRadialGradient(0, -mr * 1.6, 1, 0, -mr * 1.3, mr);
                cg.addColorStop(0, '#ffffff');
                cg.addColorStop(0.4, col);
                cg.addColorStop(1, U.mix(col, '#000000', 0.5));
                gm.fillStyle = cg;
                gm.beginPath();
                gm.ellipse(0, -mr * 1.3, mr, mr * 0.55, 0, Math.PI, 0);
                gm.fill();
                gm.fillStyle = 'rgba(255,255,255,0.8)';
                for (let d = 0; d < 3; d++) {
                  gm.beginPath();
                  gm.arc((d - 1) * mr * 0.45, -mr * 1.55, mr * 0.09, 0, TAU);
                  gm.fill();
                }
                gm.restore();
              }
            }, y);
          }
          // kristaller (yakın)
          for (let k = 0; k < 7; k++) {
            const y = rnd() * TH, x0 = side ? W - rnd() * W * 0.08 : rnd() * W * 0.08;
            const col = rnd() < 0.5 ? b.glow2 : b.accent;
            wrap((yy) => {
              for (let c = 0; c < 3; c++) {
                const h = 30 + rnd() * 40, w = 8 + rnd() * 8;
                const ang = (side ? -1 : 1) * (0.6 + (c - 1) * 0.35);
                gn.save();
                gn.translate(x0, yy);
                gn.rotate(ang + Math.PI / 2 * (side ? 1 : -1) * 0);
                gn.rotate(side ? -Math.PI / 2 - ang * 0.2 : Math.PI / 2 - ang * 0.2);
                const cg = gn.createLinearGradient(-w, 0, w, 0);
                cg.addColorStop(0, U.rgba(col, 0.9));
                cg.addColorStop(0.5, U.rgba(U.mix(col, '#ffffff', 0.6), 0.95));
                cg.addColorStop(1, U.rgba(U.mix(col, '#000000', 0.4), 0.9));
                gn.fillStyle = cg;
                gn.beginPath();
                gn.moveTo(-w / 2, 0);
                gn.lineTo(-w / 2, -h * 0.75);
                gn.lineTo(0, -h);
                gn.lineTo(w / 2, -h * 0.75);
                gn.lineTo(w / 2, 0);
                gn.fill();
                gn.restore();
                glowDot(gn, x0 + (side ? -20 : 20), yy, 70, col, 0.35);
              }
            }, y);
          }
        }
      } else if (b.id === 'garden') {
        // ışık huzmeleri + yıkık sütunlar
        for (let i = 0; i < 4; i++) {
          trunk(gf, rnd() * W, W * (0.07 + rnd() * 0.05), U.mix(b.far, b.fog, 0.3), b.fog, W * 0.004, rnd() < 0.5 ? -1 : 1);
        }
        // yosun şeritleri
        for (let i = 0; i < 9; i++) {
          const x = rnd() < 0.5 ? rnd() * W * 0.2 : W - rnd() * W * 0.2;
          const amp = 10 + rnd() * 16, ph = rnd() * TAU;
          for (const [g, col, wdt] of [[gm, b.leaf, 10 + rnd() * 6], [gn, U.mix(b.near, b.leaf, 0.5), 16]]) {
            if (g === gn && rnd() < 0.5) continue;
            const xx = g === gn ? (x < W / 2 ? x * 0.4 : W - (W - x) * 0.4) : x;
            g.strokeStyle = col;
            g.lineWidth = wdt;
            g.lineCap = 'round';
            g.beginPath();
            for (let y = 0; y <= TH; y += 12) {
              const ox = Math.sin((y / TH) * TAU * 4 + ph) * amp;
              y ? g.lineTo(xx + ox, y) : g.moveTo(xx + ox, y);
            }
            g.stroke();
            g.strokeStyle = U.rgba(b.leafRim, 0.3);
            g.lineWidth = 2;
            g.beginPath();
            for (let y = 0; y <= TH; y += 12) {
              const ox = Math.sin((y / TH) * TAU * 4 + ph) * amp - wdt * 0.3;
              y ? g.lineTo(xx + ox, y) : g.moveTo(xx + ox, y);
            }
            g.stroke();
          }
        }
        // mercanlar ve kabuklar
        for (let k = 0; k < 10; k++) {
          const side = k % 2, y = rnd() * TH, x0 = side ? W - rnd() * W * 0.1 : rnd() * W * 0.1;
          const col = rnd() < 0.5 ? b.accent : '#ff8fb0';
          wrap((yy) => {
            const grow = (x, y2, a, l, d) => {
              const ex = x + Math.cos(a) * l, ey = y2 + Math.sin(a) * l;
              gm.strokeStyle = U.mix(col, '#000000', 0.35 + d * 0.05);
              gm.lineWidth = d * 2 + 1;
              gm.beginPath();
              gm.moveTo(x, y2);
              gm.lineTo(ex, ey);
              gm.stroke();
              if (d > 0) {
                grow(ex, ey, a - 0.45, l * 0.75, d - 1);
                grow(ex, ey, a + 0.45, l * 0.75, d - 1);
              } else glowDot(gm, ex, ey, 14, col, 0.9);
            };
            grow(x0, yy, side ? -Math.PI * 0.8 : -Math.PI * 0.2, 18, 3);
          }, y);
        }
      }
      // ön plan kenar bitkileri (derinlik hissi) — orman ve bahçe
      if (b.id === 'forest' || b.id === 'garden') {
        for (let k = 0; k < 9; k++) {
          const side = k % 2, y = rnd() * TH;
          const x0 = side ? W + 10 : -10;
          wrap((yy) => {
            const n = 4 + ((rnd() * 3) | 0);
            for (let f = 0; f < n; f++) {
              const ang = (side ? Math.PI : 0) + (side ? 1 : -1) * (-0.9 + f * 0.35 + (rnd() - 0.5) * 0.2);
              const len = W * (0.16 + rnd() * 0.12);
              const ex = x0 + Math.cos(ang) * len, ey = yy + Math.sin(ang) * len;
              const mx = x0 + Math.cos(ang) * len * 0.5, my = yy + Math.sin(ang) * len * 0.5 - 14;
              const nx = -Math.sin(ang), ny = Math.cos(ang);
              const wd = len * 0.16;
              const grd = gn.createLinearGradient(x0, yy, ex, ey);
              grd.addColorStop(0, U.mix(b.near, '#000000', 0.3));
              grd.addColorStop(1, U.mix(b.near, b.leafRim, 0.25));
              gn.fillStyle = grd;
              gn.beginPath();
              gn.moveTo(x0, yy);
              gn.quadraticCurveTo(mx + nx * wd, my + ny * wd, ex, ey);
              gn.quadraticCurveTo(mx - nx * wd, my - ny * wd, x0, yy);
              gn.fill();
              gn.strokeStyle = U.rgba(b.leafRim, 0.35);
              gn.lineWidth = 1.2;
              gn.beginPath();
              gn.moveTo(x0, yy);
              gn.quadraticCurveTo(mx, my, ex, ey);
              gn.stroke();
            }
          }, y);
        }
      }
      layers.push({ canvas: far, f: 0.18, alpha: 0.6 });
      layers.push({ canvas: mid, f: 0.45, alpha: 1 });
      layers.push({ canvas: near, f: 0.85, alpha: 1 });
      return { layers, TH };
    },

    // Önbelleği temizle (biyom değişince)
    clearBgCache() { /* arka planlar oyun tarafından tutulur */ },
  };

  L.Art = Art;
})();
