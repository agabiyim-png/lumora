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
       f'<filter id="eg-blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="{st*0.14:.2f}"/></filter></defs>'
       f'<path class="eg-trail" d="{trail}" fill="none" stroke="#FFC83D" stroke-width="{st*0.07:.2f}" stroke-linecap="round"/>'
       f'{letters}'
       f'<g clip-path="url(#eg-clip)"><rect class="eg-shine" x="{-W*0.3:.1f}" y="0" width="{W*0.22:.1f}" height="{H:.1f}" fill="url(#eg-shine)" transform="skewX(-20)"/></g>'
       f'<circle class="eg-flash" cx="{sx:.1f}" cy="{sy:.1f}" r="{st*3.4:.1f}" fill="url(#eg-flash)"/>'
       f'<g class="eg-star"><path d="{STAR_D}" transform="translate({-st/2:.2f} {-st/2:.2f}) scale({k:.4f})" fill="#FFD24A" opacity=".85" filter="url(#eg-blur)"/>'
       f'<path d="{STAR_D}" transform="translate({-st/2:.2f} {-st/2:.2f}) scale({k:.4f})" fill="{STAR_WHITE}"/></g>'
       f'<g class="eg-sparks"></g>'
       f'<g class="eg-games"><path d="{gd}" fill="#FFFFFF" transform="translate({L["gx"]:.2f} {L["gy"]:.2f})"/></g>'
       f'</svg>')
geo = dict(starX=round(sx, 2), starY=round(sy, 2), star=round(st, 2), w=round(W), h=round(H))

js = r'''/*!
 * EMMİ GAMES — açılış animasyonu (tüm oyunlarda ortak)
 * Kendi başına çalışır, bağımlılığı yoktur. ~2 sn sürer, dokunma gerektirmez,
 * oyun arka planda yüklenirken üstte oynar ve yumuşakça kaybolur.
 *
 * Kullanım:
 *   <script src="emmi-splash.js"></script>
 *   EmmiSplash.play({ sound: true, background: '#060C26', onDone: function () {} });
 *
 * Logo yolları ana vektör logodan (emmi-games-logo.svg) otomatik üretilmiştir.
 * Fontlar: Lilita One ve Inter (SIL Open Font License) — yazılar eğriye çevrilmiştir.
 */
(function (root) {
  'use strict';
  var SVG = __SVG__;
  var GEO = __GEO__;
  var STAR_D = '__STAR__';
  var DURATION = 2000;

  var CSS = '' +
    '.eg-splash{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;' +
    'background:radial-gradient(ellipse at 50% 46%,#1D3C96 0%,#0A1640 52%,#060C26 100%);overflow:hidden;' +
    '-webkit-user-select:none;user-select:none;touch-action:none}' +
    '.eg-splash .eg-svg{width:min(78vw,520px);height:auto;overflow:visible;will-change:transform}' +
    '.eg-splash .eg-l{opacity:0}.eg-splash .eg-games{opacity:0}.eg-splash .eg-flash{opacity:0}' +
    '.eg-splash .eg-dust{position:absolute;border-radius:50%;background:#fff;opacity:0}';

  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function easeBack(t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function seg(t, a, b) { return t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a); }

  // ---- zarif açılış sesi (Web Audio; dosya gerektirmez) ----
  function chime() {
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    var ctx;
    try { ctx = new AC(); } catch (e) { return null; }
    var out = ctx.createGain(); out.gain.value = 0.55; out.connect(ctx.destination);
    var rev = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 1.8), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4); }
    rev.buffer = buf; var rg = ctx.createGain(); rg.gain.value = 0.45; rev.connect(rg).connect(out);
    function bell(f, t, v, dur) {
      [[1, v], [2.01, v * 0.3], [3.98, v * 0.1]].forEach(function (p) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * p[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p[1], t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(out); g.connect(rev); o.start(t); o.stop(t + dur + 0.05);
      });
    }
    function shimmer(t) {
      var n = ctx.createBufferSource(), nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0);
      for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      n.buffer = nb; var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      n.connect(f).connect(g); g.connect(out); g.connect(rev); n.start(t); n.stop(t + 1.2);
    }
    var now = ctx.currentTime + 0.05;
    // yıldız süzülürken yükselen iki nota, varışta parlak akor
    bell(784, now + 0.10, 0.05, 0.6);
    bell(1175, now + 0.35, 0.05, 0.6);
    var hit = now + 0.70;
    bell(1047, hit, 0.10, 1.8); bell(1319, hit + 0.02, 0.07, 1.7); bell(1568, hit + 0.04, 0.06, 1.6); bell(2093, hit + 0.06, 0.035, 1.4);
    shimmer(hit - 0.05);
    if (ctx.state !== 'running' && ctx.resume) ctx.resume();
    setTimeout(function () { try { ctx.close(); } catch (e) { /* yok say */ } }, 3200);
    return ctx;
  }

  function play(opts) {
    opts = opts || {};
    var doc = root.document;
    if (!doc.getElementById('eg-style')) {
      var s = doc.createElement('style'); s.id = 'eg-style'; s.textContent = CSS; doc.head.appendChild(s);
    }
    var el = doc.createElement('div');
    el.className = 'eg-splash';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'EMMİ GAMES');
    if (opts.background) el.style.background = opts.background;
    el.innerHTML = SVG;
    // dokunuşları yut: açılış sırasında alttaki menüye yanlışlıkla basılmasın
    ['pointerdown', 'pointerup', 'click', 'touchstart'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
    });
    // arka planda süzülen ince toz zerreleri
    for (var i = 0; i < 26; i++) {
      var p = doc.createElement('i'); p.className = 'eg-dust';
      var sz = 1 + Math.random() * 2.5;
      p.style.cssText = 'left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;width:' + sz + 'px;height:' + sz + 'px';
      p._d = Math.random() * 0.6; p._a = 0.25 + Math.random() * 0.5;
      el.appendChild(p);
    }
    doc.body.appendChild(el);

    var svg = el.querySelector('.eg-svg');
    var trail = el.querySelector('.eg-trail');
    var star = el.querySelector('.eg-star');
    var flash = el.querySelector('.eg-flash');
    var shine = el.querySelector('.eg-shine');
    var games = el.querySelector('.eg-games');
    var sparks = el.querySelector('.eg-sparks');
    var dust = el.querySelectorAll('.eg-dust');
    var letters = el.querySelectorAll('.eg-l');
    var tlen = trail.getTotalLength();
    trail.style.strokeDasharray = tlen;
    trail.style.strokeDashoffset = tlen;
    // varışta saçılan minik yıldızlar
    var spk = [];
    for (var k = 0; k < 8; k++) {
      var ns = 'http://www.w3.org/2000/svg';
      var g = doc.createElementNS(ns, 'path');
      g.setAttribute('d', STAR_D); g.setAttribute('fill', k % 2 ? '#FFD24A' : '#FFFBE8'); g.style.opacity = 0;
      sparks.appendChild(g);
      spk.push({ el: g, a: (k / 8) * Math.PI * 2 + 0.3, r: GEO.star * (1.6 + Math.random() * 1.2), s: 0.18 + Math.random() * 0.14 });
    }
    if (opts.sound !== false) { try { chime(); } catch (e) { /* ses yoksa sessiz devam */ } }

    var t0 = null, done = false;
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now) {
      if (done) return;
      if (t0 === null) t0 = now;
      var t = (now - t0) / 1000;
      // 1) yıldız ışık izi bırakarak gelir (0.05 – 0.70 sn)
      var f = ease(seg(t, 0.05, 0.70));
      var pt = trail.getPointAtLength(tlen * f);
      var sc = 0.55 + 0.45 * f + (t > 0.70 ? 0.35 * Math.max(0, 1 - (t - 0.70) / 0.18) : 0);
      star.setAttribute('transform', 'translate(' + pt.x.toFixed(2) + ' ' + pt.y.toFixed(2) + ') rotate(' + (f * 180).toFixed(1) + ') scale(' + sc.toFixed(3) + ')');
      star.style.opacity = Math.min(1, t / 0.12);
      trail.style.strokeDashoffset = (tlen * (1 - f)).toFixed(1);
      trail.style.opacity = t < 1.1 ? 0.85 : Math.max(0, 0.85 - (t - 1.1) / 0.4);
      // 2) EMMİ harfleri sırayla belirir (0.20 – 0.80 sn)
      for (var i = 0; i < letters.length; i++) {
        var lt = seg(t, 0.20 + i * 0.10, 0.48 + i * 0.10);
        letters[i].style.opacity = Math.min(1, lt * 1.6);
        var s2 = 0.4 + 0.6 * easeBack(lt);
        letters[i].style.transform = 'translateY(' + ((1 - ease(lt)) * 26).toFixed(1) + 'px) scale(' + s2.toFixed(3) + ')';
      }
      // 3) yıldız İ'nin noktası olur: parlama (0.70 – 1.05 sn)
      var fl = seg(t, 0.70, 1.05);
      flash.style.opacity = fl > 0 && fl < 1 ? (1 - fl).toFixed(3) : 0;
      flash.setAttribute('transform', 'translate(' + GEO.starX + ' ' + GEO.starY + ') scale(' + (0.3 + fl * 1.2).toFixed(3) + ') translate(' + (-GEO.starX) + ' ' + (-GEO.starY) + ')');
      for (var j = 0; j < spk.length; j++) {
        var q = spk[j], st2 = seg(t, 0.70, 1.25);
        var rr = q.r * ease(st2);
        q.el.style.opacity = st2 > 0 && st2 < 1 ? (1 - st2) : 0;
        q.el.setAttribute('transform', 'translate(' + (GEO.starX + Math.cos(q.a) * rr - 12 * q.s).toFixed(1) + ' ' + (GEO.starY + Math.sin(q.a) * rr - 12 * q.s).toFixed(1) + ') scale(' + q.s + ')');
      }
      // 4) altın yüzeyde ışık süzülür (0.80 – 1.20 sn)
      var sh = ease(seg(t, 0.80, 1.20));
      shine.setAttribute('x', (-GEO.w * 0.3 + sh * GEO.w * 1.6).toFixed(1));
      // 5) GAMES yükselir (0.85 – 1.20 sn)
      var gm = ease(seg(t, 0.85, 1.20));
      games.style.opacity = gm;
      games.style.transform = 'translateY(' + ((1 - gm) * 10).toFixed(1) + 'px)';
      // toz zerreleri
      for (var m = 0; m < dust.length; m++) {
        var dz = dust[m]; dz.style.opacity = (Math.min(1, Math.max(0, (t - dz._d) / 0.5)) * dz._a).toFixed(2);
        dz.style.transform = 'translateY(' + (-t * 14).toFixed(1) + 'px)';
      }
      // 6) kısa bekleme, sonra yumuşak kayboluş (1.60 – 2.00 sn)
      var out = seg(t, 1.60, 2.00);
      el.style.opacity = (1 - ease(out)).toFixed(3);
      svg.style.transform = 'scale(' + (1 + out * 0.04).toFixed(4) + ')';
      if (t * 1000 >= DURATION) return finish();
      root.requestAnimationFrame(frame);
    }
    function finish() {
      if (done) return;
      done = true;
      if (el.parentNode) el.parentNode.removeChild(el);
      if (typeof opts.onDone === 'function') opts.onDone();
    }
    if (reduce) {
      // hareket azaltma tercihinde: logo sabit görünür, sonra kaybolur
      for (var i2 = 0; i2 < letters.length; i2++) letters[i2].style.opacity = 1;
      games.style.opacity = 1; trail.style.opacity = 0;
      star.setAttribute('transform', 'translate(' + GEO.starX + ' ' + GEO.starY + ')');
      el.style.transition = 'opacity .4s ease 1.2s';
      root.requestAnimationFrame(function () { el.style.opacity = 0; });
      setTimeout(finish, 1700);
    } else root.requestAnimationFrame(frame);
    // güvenlik: sekme arka plandaysa bile en geç 3 sn sonra kapanır
    setTimeout(finish, DURATION + 1000);
    return { el: el, finish: finish };
  }

  root.EmmiSplash = { play: play, duration: DURATION };
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
