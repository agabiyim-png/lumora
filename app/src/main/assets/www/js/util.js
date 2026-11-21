/* LUMORA — yardımcı fonksiyonlar */
(function () {
  'use strict';
  const L = (window.L = window.L || {});

  const U = {
    TAU: Math.PI * 2,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    invLerp: (a, b, v) => (v - a) / (b - a),
    dist2: (ax, ay, bx, by) => {
      const dx = ax - bx, dy = ay - by;
      return dx * dx + dy * dy;
    },
    // Kare-hız bağımsız yumuşatma
    damp: (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt)),
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[(Math.random() * arr.length) | 0],
    chance: (p) => Math.random() < p,
    angleTo: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),

    // Deterministik RNG (seviye üretimi için)
    rng(seed) {
      let s = seed >>> 0;
      const f = function () {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      f.range = (a, b) => a + f() * (b - a);
      f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
      f.pick = (arr) => arr[Math.floor(f() * arr.length)];
      f.chance = (p) => f() < p;
      return f;
    },

    ease: {
      outCubic: (t) => 1 - Math.pow(1 - t, 3),
      inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      outBack: (t) => {
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      },
      outElastic: (t) => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
      },
    },

    // Renk yardımcıları
    hexToRgb(hex) {
      const h = hex.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    rgba(hex, a) {
      const c = U.hexToRgb(hex);
      return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    },
    mix(hexA, hexB, t) {
      const a = U.hexToRgb(hexA), b = U.hexToRgb(hexB);
      const r = Math.round(U.lerp(a[0], b[0], t)), g = Math.round(U.lerp(a[1], b[1], t)), bl = Math.round(U.lerp(a[2], b[2], t));
      return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
    },

    makeCanvas(w, h) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w));
      c.height = Math.max(1, Math.ceil(h));
      return c;
    },

    // nokta - doğru parçası uzaklığının karesi
    segDist2(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy || 1;
      let t = ((px - ax) * dx + (py - ay) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = ax + dx * t, cy = ay + dy * t;
      return (px - cx) * (px - cx) + (py - cy) * (py - cy);
    },

    fmt(n) {
      return Math.floor(n).toLocaleString('tr-TR');
    },

    vibrate(ms) {
      if (!L.save || !L.save.data.settings.haptics) return;
      try {
        if (window.AndroidBridge && window.AndroidBridge.vibrate) window.AndroidBridge.vibrate(ms | 0);
        else if (navigator.vibrate) navigator.vibrate(ms);
      } catch (e) { /* yok say */ }
    },
  };

  L.U = U;
})();
