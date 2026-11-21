/* LUMORA — açılış, ana döngü, akış yönetimi ve dokunmatik giriş */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;

  const canvas = document.getElementById('game');
  let ctx = null;
  try { ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }); } catch (e) { ctx = null; }
  if (!ctx) ctx = canvas.getContext('2d', { alpha: false });
  let W = 0, H = 0, dpr = 1;
  // Çizim çözünürlüğü kademeleri. Telefonlarda 2,75-3x piksel oranında tuval 2,5+ milyon piksel olur;
  // her karede bunun defalarca boyanması takılmanın ana nedeniydi. Parlak ve yumuşak sanat tarzı
  // 1,5x'te neredeyse aynı görünür ama ~3 kat daha az piksel boyanır.
  const DPR_STEPS = [1.5, 1.25, 1.0];
  L.fx = { level: 0 };

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, DPR_STEPS[L.fx.level]));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  const flow = {
    mode: 'menu',
    lastStart: null,

    menuScene() {
      L.game = null;
      L.demo = new L.Game({ demo: true, W, H, biome: Math.min(3, L.LEVELS[L.ui.nextLevel()].biome) });
    },

    startLevel(i) {
      L.audio.unlock();
      this.lastStart = { level: i };
      L.demo = null;
      L.game = new L.Game({ levelIndex: i, W, H });
      this.mode = 'play';
      L.ui.hud(L.game);
      const lv = L.LEVELS[i];
      L.ui.banner(`${L.BIOMES[lv.biome].name} · ${i + 1}`, lv.title);
      L.audio.startMusic(lv.biome);
    },

    startEndless() {
      L.audio.unlock();
      this.lastStart = { endless: true };
      L.demo = null;
      L.game = new L.Game({ endless: true, W, H, biome: 0 });
      this.mode = 'play';
      L.ui.hud(L.game);
      L.ui.banner('Sonsuz Gece', 'Ne kadar yükselebilirsin?');
      L.audio.startMusic(0);
    },

    restart() {
      if (!this.lastStart) return this.quit();
      if (this.lastStart.endless) this.startEndless();
      else this.startLevel(this.lastStart.level);
    },

    pause() {
      if (!L.game || L.game.paused) return;
      if (L.game.state !== 'play' && L.game.state !== 'boss') return;
      L.game.paused = true;
      L.ui.pause();
    },

    resume() {
      if (!L.game) return;
      L.game.paused = false;
      L.ui.hud(L.game);
    },

    quit(to) {
      this.mode = 'menu';
      this.menuScene();
      if (to === 'map') L.ui.map();
      else if (to === 'workshop') L.ui.workshop();
      else L.ui.title();
    },
  };
  L.flow = flow;

  // Android geri tuşu
  L.onBack = function () {
    const s = L.ui.screen;
    if (L.game && s === 'hud') { flow.pause(); return 'ok'; }
    if (s === 'pause') { flow.resume(); return 'ok'; }
    if (s === 'title') return 'exit';
    if (L.game) { flow.quit(); return 'ok'; }
    L.audio.back();
    L.ui.title();
    return 'ok';
  };
  L.onAppPause = function () {
    if (L.game && (L.game.state === 'play' || L.game.state === 'boss') && !L.game.paused) flow.pause();
    L.audio.suspend();
  };
  L.onAppResume = function () { L.audio.resume(); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) L.onAppPause(); else L.onAppResume();
  });

  // ---------- dokunmatik giriş: göreli sürükleme ----------
  let activeId = null, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', (e) => {
    L.audio.unlock();
    if (activeId !== null) return;
    activeId = e.pointerId;
    lx = e.clientX; ly = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* yok say */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activeId) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    if (L.game && !L.game.paused && (L.game.state === 'play' || L.game.state === 'boss')) L.game.pointer(dx, dy);
  });
  const end = (e) => { if (e.pointerId === activeId) activeId = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  document.addEventListener('pointerdown', () => L.audio.unlock(), { once: true });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  // klavye (masaüstü testi için)
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && L.game) L.game.triggerFlare();
    if (e.key === 'Escape') L.onBack();
  });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  // ---------- ana döngü ----------
  let last = performance.now();
  let hudT = 0, perfSum = 0, perfN = 0, slowWin = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;

    // Uyarlanabilir kalite: 60 karelik pencerede ortalama kare süresi 21 ms'yi (≈48 FPS) iki pencere
    // üst üste aşarsa çözünürlük ve efekt yoğunluğu bir kademe düşer. Arka plana geçiş gibi
    // tek seferlik uzun kareler (>250 ms) ölçüme katılmaz.
    if (dt < 0.25 && (L.game || L.demo)) { perfSum += dt; perfN++; }
    if (perfN >= 60) {
      const avg = perfSum / perfN;
      perfSum = 0; perfN = 0;
      slowWin = avg > 0.021 ? slowWin + 1 : 0;
      if (slowWin >= 2 && L.fx.level < DPR_STEPS.length - 1) {
        L.fx.level++;
        slowWin = 0;
        resize();
      }
    }

    const game = L.game || L.demo;
    if (!game) return;
    if (L.game && (keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown)) {
      const s = 380 * dt;
      L.game.pointer((keys.ArrowRight ? s : 0) - (keys.ArrowLeft ? s : 0), (keys.ArrowDown ? s : 0) - (keys.ArrowUp ? s : 0));
    }
    game.update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.render(ctx);
    if (L.game) {
      hudT += dt;
      if (hudT > 0.1) { hudT = 0; L.ui.updateHud(L.game); }
    }
  }

  function boot() {
    resize();
    L.save.load();
    L.ui.init();
    // Ağır kurulum (arka plan katmanlarının çizimi, menü, sprite'lar) açılış animasyonu BAŞLAMADAN,
    // perde ekrandayken yapılır. Oyun döngüsü ancak logo kaybolmaya başlarken çalışır; böylece
    // animasyon boyunca ana iş parçacığı yalnızca logoya ayrılır.
    let looping = false;
    const prepare = () => {
      flow.menuScene();
      L.ui.title();
      // ilk kareyi görünmez biçimde bir kez çiz: dokular GPU'ya yüklensin, sprite'lar oluşsun
      if (L.demo) { L.demo.update(1 / 60); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); L.demo.render(ctx); }
      if (L.Art.prewarm) L.Art.prewarm();
    };
    const startLoop = () => {
      if (looping) return;
      looping = true;
      requestAnimationFrame((t) => { last = t; frame(t); });
    };
    let splashOk = false;
    if (window.EmmiSplash) {
      try { window.EmmiSplash.play({ sound: L.save.data.settings.sfx, prepare, onReveal: startLoop }); splashOk = true; } catch (e) { splashOk = false; }
    }
    if (!splashOk) { prepare(); startLoop(); }
    // menüde müzik ilk dokunuşla başlar
    document.addEventListener('pointerdown', () => { if (!L.audio.music) L.audio.startMusic(L.demo ? L.demo.biome : 0); }, { once: true });
  }

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const ow = W, oh = H;
      resize();
      if ((Math.abs(ow - W) > 40 || Math.abs(oh - H) > 80) && !L.game) flow.menuScene();
    }, 150);
  });

  window.addEventListener('error', (e) => { console.error('LUMORA hata:', e.message, e.filename, e.lineno); });
  boot();
})();
