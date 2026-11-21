"""EMMİ GAMES açılış animasyonu modülünü (tek JS dosyası) ana logo geometrisinden üretir."""
import json, os
from logo import *
L = build()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'emmi-games-splash')
os.makedirs(OUT, exist_ok=True)
stops = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in GOLD_STOPS)
top_l, base_l = L['top'] - L['oy'], L['base'] - L['oy']
W, H = L['w'], L['h']
letters = ''
for i, (d, b) in enumerate(L['emmi']):
    cx = L['ox'] + (b[0] + b[2]) / 2
    cy = L['oy'] + (b[1] + b[3]) / 2
    letters += (f'<g class="eg-l" data-i="{i}" style="transform-origin:{cx:.1f}px {cy:.1f}px">'
                f'<path d="{d}" fill="{SHADOW}" transform="translate({L["ox"]:.2f} {L["oy"] + L["shadow_dy"]:.2f})"/>'
                f'<path d="{d}" fill="url(#eg-gold)" transform="translate({L["ox"]:.2f} {L["oy"]:.2f})"/></g>')
all_d = ' '.join(d for d, _ in L['emmi'])
gd = ' '.join(d for d, _ in L['games'])
st = L['star']
k = st / 24
sx, sy = L['star_cx'], L['star_cy']
# ışık izi: logonun sol altından yıldızın yerine kavis
trail = f'M {-W*0.35:.1f} {H*1.55:.1f} Q {W*0.25:.1f} {H*1.25:.1f} {sx:.1f} {sy:.1f}'
svg = (f'<svg class="eg-svg" viewBox="0 0 {W:.0f} {H:.0f}" overflow="visible" aria-hidden="true">'
       f'<defs><linearGradient id="eg-gold" x1="0" y1="{top_l:.1f}" x2="0" y2="{base_l:.1f}" gradientUnits="userSpaceOnUse">{stops}</linearGradient>'
       f'<clipPath id="eg-clip"><path d="{all_d}" transform="translate({L["ox"]:.2f} {L["oy"]:.2f})"/></clipPath>'
       f'<linearGradient id="eg-shine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
       f'<radialGradient id="eg-flash"><stop offset="0" stop-color="#FFFBE8" stop-opacity="1"/><stop offset=".35" stop-color="#FFD24A" stop-opacity=".55"/><stop offset="1" stop-color="#FFD24A" stop-opacity="0"/></radialGradient>'
       f'<radialGradient id="eg-sglow"><stop offset="0" stop-color="#FFD24A" stop-opacity=".9"/><stop offset=".45" stop-color="#FFD24A" stop-opacity=".35"/><stop offset="1" stop-color="#FFD24A" stop-opacity="0"/></radialGradient></defs>'
       f'<path class="eg-trail" d="{trail}" fill="none" stroke="#FFC83D" stroke-width="{st*0.07:.2f}" stroke-linecap="round"/>'
       f'{letters}'
       f'<g clip-path="url(#eg-clip)"><rect class="eg-shine" x="{-W*0.3:.1f}" y="0" width="{W*0.22:.1f}" height="{H:.1f}" fill="url(#eg-shine)" transform="skewX(-20)"/></g>'
       f'<circle class="eg-flash" cx="{sx:.1f}" cy="{sy:.1f}" r="{st*3.4:.1f}" fill="url(#eg-flash)"/>'
       f'<g class="eg-star"><circle r="{st*0.95:.2f}" fill="url(#eg-sglow)"/>'
       f'<path d="{STAR_D}" transform="translate({-st/2:.2f} {-st/2:.2f}) scale({k:.4f})" fill="{STAR_WHITE}"/></g>'
       f'<g class="eg-sparks"></g>'
       f'<g class="eg-games"><path d="{gd}" fill="#FFFFFF" transform="translate({L["gx"]:.2f} {L["gy"]:.2f})"/></g>'
       f'</svg>')
geo = dict(starX=round(sx, 2), starY=round(sy, 2), star=round(st, 2), w=round(W), h=round(H))

js = r'''/*!
 * EMMİ GAMES — açılış animasyonu (tüm oyunlarda ortak) · v1.1
 * Bağımlılığı yoktur. Yaklaşık 2 sn sürer, dokunma gerektirmez.
 *
 * Akış: 1) Lacivert perde hemen görünür.  2) prepare() ile oyunun ağır kurulumu
 * animasyon BAŞLAMADAN yapılır (takılma animasyonun içine düşmez).  3) Animasyon
 * kendi saatini gerçek geçen zamanla ilerletir; kare başına en fazla 50 ms sayar,
 * böylece telefon anlık takılsa bile hiçbir aşama atlanmaz.  4) Kayboluş başlarken
 * onReveal() çağrılır (oyun döngüsü başlatılır), sonunda onDone().
 *
 *   EmmiSplash.play({ sound: true, prepare: fn, onReveal: fn, onDone: fn });
 *
 * Fontlar: Lilita One ve Inter (SIL OFL) — yazılar eğriye çevrilmiştir.
 */
(function (root) {
  'use strict';
  var SVG = __SVG__;
  var GEO = __GEO__;
  var STAR_D = '__STAR__';
  var DURATION = 2.0;      // animasyon saati (sn)
  var REVEAL = 1.6;        // kayboluşun başladığı an
  var MAX_STEP = 0.05;     // bir karede ilerleyebilecek en fazla süre

  var CSS = '' +
    '.eg-splash{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;' +
    'background:radial-gradient(ellipse at 50% 46%,#1D3C96 0%,#0A1640 52%,#060C26 100%);overflow:hidden;contain:strict;' +
    '-webkit-user-select:none;user-select:none;touch-action:none}' +
    '.eg-splash .eg-svg{width:min(78vw,520px);height:auto;overflow:visible}' +
    '.eg-splash .eg-l,.eg-splash .eg-games,.eg-splash .eg-flash,.eg-splash .eg-star{opacity:0}' +
    '.eg-splash .eg-dust{position:absolute;border-radius:50%;background:#fff;opacity:0;animation:eg-dust 2.4s ease-out forwards}' +
    '@keyframes eg-dust{0%{opacity:0;transform:translateY(0)}35%{opacity:var(--a)}100%{opacity:var(--a);transform:translateY(-34px)}}';

  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function easeBack(t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function seg(t, a, b) { return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a); }

  // ---- ses: bağlam ve yankı önceden hazırlanır, notalar görsel anlara bağlı çalınır ----
  function makeAudio() {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    var ctx;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return null; }
    var out = ctx.createGain(); out.gain.value = 0.55; out.connect(ctx.destination);
    var rev = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 1.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    rev.buffer = buf; var rg = ctx.createGain(); rg.gain.value = 0.45; rev.connect(rg); rg.connect(out);
    var nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
    for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
    function bell(f, v, dur, delay) {
      var t = ctx.currentTime + 0.01 + (delay || 0);
      [[1, v], [2.01, v * 0.3], [3.98, v * 0.1]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(out); g.connect(rev); o.start(t); o.stop(t + dur + 0.05);
      });
    }
    function shimmer() {
      var t = ctx.currentTime + 0.01;
      var n = ctx.createBufferSource(); n.buffer = nb;
      var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
      n.connect(f); f.connect(g); g.connect(out); g.connect(rev); n.start(t); n.stop(t + 1.1);
    }
    return {
      ctx: ctx,
      resume: function () { if (ctx.state !== 'running' && ctx.resume) ctx.resume(); },
      fly1: function () { bell(784, 0.05, 0.6); },
      fly2: function () { bell(1175, 0.05, 0.6); },
      land: function () { shimmer(); bell(1047, 0.10, 1.8); bell(1319, 0.07, 1.7, 0.02); bell(1568, 0.06, 1.6, 0.04); bell(2093, 0.035, 1.4, 0.06); },
      close: function () { setTimeout(function () { try { ctx.close(); } catch (e) { /* yok say */ } }, 2600); },
    };
  }

  function play(opts) {
    opts = opts || {};
    var doc = root.document;
    var log = root.__egLog = { frames: [], prepareMs: 0 };
    if (!doc.getElementById('eg-style')) {
      var s = doc.createElement('style'); s.id = 'eg-style'; s.textContent = CSS; doc.head.appendChild(s);
    }
    var el = doc.createElement('div');
    el.className = 'eg-splash';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'EMMİ GAMES');
    if (opts.background) el.style.background = opts.background;
    el.innerHTML = SVG;
    ['pointerdown', 'pointerup', 'click', 'touchstart'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    });
    doc.body.appendChild(el);

    var svg = el.querySelector('.eg-svg');
    var trail = el.querySelector('.eg-trail');
    var star = el.querySelector('.eg-star');
    var flash = el.querySelector('.eg-flash');
    var shine = el.querySelector('.eg-shine');
    var games = el.querySelector('.eg-games');
    var sparks = el.querySelector('.eg-sparks');
    var letters = el.querySelectorAll('.eg-l');
    var tlen = trail.getTotalLength();
    // yolun noktaları önceden hesaplanır (karede ölçüm yapılmaz)
    var PTS = [], NP = 60;
    for (var p = 0; p <= NP; p++) { var q = trail.getPointAtLength(tlen * p / NP); PTS.push([q.x, q.y]); }
    trail.style.strokeDasharray = tlen;
    trail.style.strokeDashoffset = tlen;
    var spk = [];
    for (var k = 0; k < 8; k++) {
      var g = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      g.setAttribute('d', STAR_D); g.setAttribute('fill', k % 2 ? '#FFD24A' : '#FFFBE8'); g.style.opacity = 0;
      sparks.appendChild(g);
      spk.push({ el: g, a: (k / 8) * Math.PI * 2 + 0.3, r: GEO.star * (1.6 + Math.random() * 1.2), s: 0.18 + Math.random() * 0.14 });
    }
    var audio = opts.sound !== false ? makeAudio() : null;
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var clock = 0, last = null, done = false, revealed = false, cues = {}, startReal = 0;

    function cue(name, at, fn) { if (!cues[name] && clock >= at) { cues[name] = 1; try { fn(); } catch (e) { /* yok say */ } } }
    function pointAt(f) {
      var x = f * NP, i = Math.min(NP - 1, Math.floor(x)), r = x - i;
      return [PTS[i][0] + (PTS[i + 1][0] - PTS[i][0]) * r, PTS[i][1] + (PTS[i + 1][1] - PTS[i][1]) * r];
    }
    function render(t) {
      var f = ease(seg(t, 0.05, 0.70));
      var pt = pointAt(f);
      var sc = 0.55 + 0.45 * f + (t > 0.70 ? 0.35 * Math.max(0, 1 - (t - 0.70) / 0.18) : 0);
      star.setAttribute('transform', 'translate(' + pt[0].toFixed(2) + ' ' + pt[1].toFixed(2) + ') rotate(' + (f * 180).toFixed(1) + ') scale(' + sc.toFixed(3) + ')');
      star.style.opacity = Math.min(1, t / 0.12);
      trail.style.strokeDashoffset = (tlen * (1 - f)).toFixed(1);
      trail.style.opacity = t < 1.1 ? 0.85 : Math.max(0, 0.85 - (t - 1.1) / 0.4);
      for (var i = 0; i < letters.length; i++) {
        var lt = seg(t, 0.20 + i * 0.10, 0.48 + i * 0.10);
        letters[i].style.opacity = Math.min(1, lt * 1.6);
        letters[i].style.transform = 'translateY(' + ((1 - ease(lt)) * 26).toFixed(1) + 'px) scale(' + (0.4 + 0.6 * easeBack(lt)).toFixed(3) + ')';
      }
      var fl = seg(t, 0.70, 1.05);
      flash.style.opacity = fl > 0 && fl < 1 ? (1 - fl).toFixed(3) : 0;
      flash.setAttribute('transform', 'translate(' + GEO.starX + ' ' + GEO.starY + ') scale(' + (0.3 + fl * 1.2).toFixed(3) + ') translate(' + (-GEO.starX) + ' ' + (-GEO.starY) + ')');
      var st2 = seg(t, 0.70, 1.25);
      for (var j = 0; j < spk.length; j++) {
        var q = spk[j], rr = q.r * ease(st2);
        q.el.style.opacity = st2 > 0 && st2 < 1 ? (1 - st2) : 0;
        q.el.setAttribute('transform', 'translate(' + (GEO.starX + Math.cos(q.a) * rr - 12 * q.s).toFixed(1) + ' ' + (GEO.starY + Math.sin(q.a) * rr - 12 * q.s).toFixed(1) + ') scale(' + q.s + ')');
      }
      var sh = ease(seg(t, 0.80, 1.20));
      shine.setAttribute('x', (-GEO.w * 0.3 + sh * GEO.w * 1.6).toFixed(1));
      var gm = ease(seg(t, 0.85, 1.20));
      games.style.opacity = gm;
      games.style.transform = 'translateY(' + ((1 - gm) * 10).toFixed(1) + 'px)';
      var out = seg(t, REVEAL, DURATION);
      el.style.opacity = (1 - ease(out)).toFixed(3);
      svg.style.transform = out > 0 ? 'scale(' + (1 + out * 0.04).toFixed(4) + ')' : '';
    }
    function frame(now) {
      if (done) return;
      var dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      clock += Math.min(dt, MAX_STEP);
      log.frames.push([Math.round(now - startReal), +clock.toFixed(3)]);
      if (audio) {
        cue('a1', 0.10, audio.fly1);
        cue('a2', 0.35, audio.fly2);
        cue('a3', 0.70, audio.land);
      }
      render(Math.min(clock, DURATION));
      if (!revealed && clock >= REVEAL) { revealed = true; if (typeof opts.onReveal === 'function') opts.onReveal(); }
      if (clock >= DURATION) return finish();
      root.requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return;
      done = true;
      if (!revealed && typeof opts.onReveal === 'function') { revealed = true; opts.onReveal(); }
      if (el.parentNode) el.parentNode.removeChild(el);
      if (audio) audio.close();
      log.totalMs = Math.round(root.performance.now() - startReal);
      if (typeof opts.onDone === 'function') opts.onDone();
    }
    function start() {
      // toz zerreleri: CSS ile, ana iş parçacığını yormadan
      for (var i = 0; i < 12; i++) {
        var d = doc.createElement('i'); d.className = 'eg-dust';
        var sz = 1 + Math.random() * 2.5;
        d.style.cssText = 'left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;width:' + sz + 'px;height:' + sz + 'px;--a:' + (0.25 + Math.random() * 0.5).toFixed(2) + ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's';
        el.appendChild(d);
      }
      startReal = root.performance.now();
      if (audio) audio.resume();
      if (reduce) {
        clock = 1.3; render(1.3);
        setTimeout(function () { el.style.transition = 'opacity .4s ease'; el.style.opacity = 0; if (opts.onReveal) { revealed = true; opts.onReveal(); } }, 900);
        setTimeout(finish, 1350);
        return;
      }
      root.requestAnimationFrame(frame);
      // güvenlik: her koşulda en geç 4 sn sonra kapanır
      setTimeout(finish, 4000);
    }
    // 1) perdenin ilk karesi ekrana çizilsin  2) ağır hazırlık  3) bir kare daha, sonra animasyon
    root.requestAnimationFrame(function () {
      root.requestAnimationFrame(function () {
        var a = root.performance.now();
        if (typeof opts.prepare === 'function') { try { opts.prepare(); } catch (e) { if (root.console) console.error(e); } }
        log.prepareMs = Math.round(root.performance.now() - a);
        root.requestAnimationFrame(function () { start(); });
      });
    });
    return { el: el, finish: finish };
  }

  root.EmmiSplash = { play: play, duration: DURATION * 1000 };
})(window);
'''
js = js.replace('__SVG__', json.dumps(svg, ensure_ascii=False)).replace('__GEO__', json.dumps(geo)).replace('__STAR__', STAR_D)
open(f'{OUT}/emmi-splash.js', 'w').write(js)
open(f'{OUT}/index.html', 'w').write('''<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EMMİ GAMES açılış önizleme</title>
<style>html,body{margin:0;height:100%;background:#060C26;font-family:system-ui,sans-serif;color:#cfd8ff}
.again{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);padding:10px 18px;border-radius:12px;border:1px solid #2a3c78;background:#0a1640;color:#fff;font-size:15px}</style>
</head><body>
<button class="again" onclick="EmmiSplash.play({sound:true})">Tekrar oynat</button>
<script src="emmi-splash.js"></script>
<script>EmmiSplash.play({ sound: true });</script>
</body></html>
''')
print('ok', len(js))
