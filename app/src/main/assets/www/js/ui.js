/* LUMORA — menüler, HUD, sonuç ekranları, bildirimler */
(function () {
  'use strict';
  const L = window.L;
  const U = L.U;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const h = (html) => {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  };
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
  const AMBER = '<svg viewBox="0 0 24 24"><path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/></svg>';
  const SPARK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5" stroke-width="2" stroke-linecap="round"/></svg>';

  const ui = {
    root: null,
    screen: null,
    hudEl: null,

    init() {
      this.root = $('#ui');
      this.toastBox = h('<div class="toasts"></div>');
      document.body.appendChild(this.toastBox);
    },

    clear() {
      this.root.innerHTML = '';
      this.hudEl = null;
      this.screen = null;
    },

    btn(label, cls, onClick) {
      const b = h(`<button class="btn ${cls || ''}">${label}</button>`);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (b.classList.contains('locked')) { L.audio.back(); return; }
        if (cls && cls.indexOf('ghost') >= 0) L.audio.back(); else L.audio.click();
        onClick && onClick();
      });
      return b;
    },

    show(el, name) {
      document.querySelectorAll('.banner').forEach((x) => x.remove());
      this.clear();
      this.screen = name;
      this.root.appendChild(el);
      requestAnimationFrame(() => el.classList.add('in'));
      return el;
    },

    // ---------- başlık ----------
    title() {
      const sd = L.save.data;
      const el = h(`<div class="screen title-screen">
        <div class="logo-wrap">
          <div class="logo-halo"></div>
          <h1 class="logo">LUMORA</h1>
          <div class="tagline">Işığın Yolculuğu</div>
        </div>
        <div class="menu"></div>
        <img class="brand-sig" src="img/emmi-games-mini.svg" alt="EMMİ GAMES">
        <div class="title-foot">
          <span class="pill">${STAR}<b>${L.save.totalStars()}</b> / ${L.LEVELS.length * 3}</span>
          <span class="pill amber">${AMBER}<b>${U.fmt(sd.amber)}</b></span>
        </div>
      </div>`);
      const menu = $('.menu', el);
      const next = this.nextLevel();
      const firstTime = !sd.tutorialDone && !sd.levels[0];
      const play = this.btn(firstTime ? 'Yolculuğa Başla' : `Oyna <small>${next + 1}. ${L.LEVELS[next].title}</small>`, 'primary big', () => L.flow.startLevel(next));
      menu.appendChild(play);
      if (!firstTime) {
        menu.appendChild(this.btn('Harita', '', () => this.map()));
        const endlessOpen = (sd.levels[4] && sd.levels[4].stars > 0);
        const eb = this.btn(endlessOpen ? `Sonsuz Gece <small>En iyi: ${sd.stats.endlessBest} m</small>` : 'Sonsuz Gece <small>🔒 5. seviyeyi bitir</small>', endlessOpen ? '' : 'locked', () => L.flow.startEndless());
        menu.appendChild(eb);
        const row = h('<div class="row"></div>');
        row.appendChild(this.btn('Atölye', 'small', () => this.workshop()));
        row.appendChild(this.btn('Başarımlar', 'small', () => this.achievements()));
        row.appendChild(this.btn('⚙', 'small icon', () => this.settings()));
        menu.appendChild(row);
      } else {
        const row = h('<div class="row"></div>');
        row.appendChild(this.btn('⚙ Ayarlar', 'small', () => this.settings()));
        menu.appendChild(row);
      }
      this.show(el, 'title');
    },

    nextLevel() {
      const sd = L.save.data;
      for (let i = 0; i < L.LEVELS.length; i++) {
        if (!sd.levels[i] || !sd.levels[i].stars) return Math.min(i, sd.unlocked);
      }
      return L.LEVELS.length - 1;
    },

    biomeOpen(bi) {
      return L.save.totalStars() >= L.BIOME_GATE[bi];
    },
    levelOpen(i) {
      const lv = L.LEVELS[i];
      return i <= L.save.data.unlocked && this.biomeOpen(lv.biome);
    },

    // ---------- harita ----------
    map() {
      const sd = L.save.data;
      const el = h(`<div class="screen map-screen">
        <div class="topbar"><div class="tb-left"></div><h2>Lumora Vadisi</h2>
          <span class="pill amber">${AMBER}<b>${U.fmt(sd.amber)}</b></span></div>
        <div class="map-scroll"></div>
      </div>`);
      $('.tb-left', el).appendChild(this.btn('‹', 'ghost icon', () => this.title()));
      const sc = $('.map-scroll', el);
      for (let bi = L.BIOMES.length - 1; bi >= 0; bi--) {
        const B = L.BIOMES[bi];
        const open = this.biomeOpen(bi);
        const sec = h(`<section class="biome b${bi} ${open ? '' : 'closed'}" style="--a:${B.accent};--b:${B.skyBot};--c:${B.skyTop}">
          <header><h3>${B.name}</h3><p>${open ? B.sub : `🔒 ${L.BIOME_GATE[bi]} yıldız gerekli (sende ${L.save.totalStars()})`}</p></header>
          <div class="nodes"></div></section>`);
        const nodes = $('.nodes', sec);
        const idxs = [];
        L.LEVELS.forEach((lv, i) => lv.biome === bi && idxs.push(i));
        idxs.reverse().forEach((i, k) => {
          const lv = L.LEVELS[i];
          const st = sd.levels[i] ? sd.levels[i].stars : 0;
          const op = this.levelOpen(i);
          const cur = op && !st;
          const off = [50, 72, 50, 28, 50][k % 5];
          const n = h(`<div class="node ${op ? 'open' : 'closed'} ${cur ? 'current' : ''} ${lv.boss ? 'boss' : ''}" style="left:${off}%">
            <div class="orb">${op ? i + 1 : '🔒'}</div>
            <div class="stars">${[0, 1, 2].map((s) => `<i class="${s < st ? 'on' : ''}">${STAR}</i>`).join('')}</div>
            <div class="lvname">${lv.title}</div></div>`);
          n.addEventListener('click', () => {
            if (!op) { L.audio.back(); return; }
            L.audio.click();
            L.flow.startLevel(i);
          });
          nodes.appendChild(n);
        });
        sc.appendChild(sec);
      }
      this.show(el, 'map');
      // mevcut seviyeye kaydır
      setTimeout(() => {
        const cur = $('.node.current', el) || $('.node.open', el);
        if (cur) cur.scrollIntoView({ block: 'center' });
      }, 30);
    },

    // ---------- atölye ----------
    workshop() {
      const sd = L.save.data;
      const el = h(`<div class="screen panel-screen">
        <div class="topbar"><div class="tb-left"></div><h2>Atölye</h2>
          <span class="pill amber">${AMBER}<b class="amber-val">${U.fmt(sd.amber)}</b></span></div>
        <div class="scroll">
          <h4 class="sec">Güçlendirmeler</h4><div class="ups"></div>
          <h4 class="sec">Lumi Yetenekleri <small>boss'ları yenerek açılır</small></h4><div class="abil"></div>
          <h4 class="sec">Işık Ruhları <small>yıldız topladıkça açılır</small></h4><div class="skins"></div>
        </div></div>`);
      $('.tb-left', el).appendChild(this.btn('‹', 'ghost icon', () => this.title()));
      const ups = $('.ups', el);
      L.UPGRADES.forEach((u) => {
        const lvl = sd.upgrades[u.id];
        const max = lvl >= u.max;
        const cost = max ? 0 : u.cost[lvl];
        const card = h(`<div class="card up">
          <div class="up-info"><b>${u.name}</b><span>${u.desc}</span>
          <em>${lvl ? u.fmt(lvl) : 'Henüz yok'}${max ? '' : ' → ' + u.fmt(lvl + 1)}</em>
          <div class="pips">${Array.from({ length: u.max }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('')}</div></div></div>`);
        const b = this.btn(max ? 'MAKS' : `${AMBER}${cost}`, `buy ${max || sd.amber < cost ? 'locked' : ''}`, () => {
          sd.amber -= cost;
          sd.upgrades[u.id]++;
          L.save.write();
          L.audio.buy();
          this.workshop();
        });
        card.appendChild(b);
        ups.appendChild(card);
      });
      const ab = $('.abil', el);
      const req = { arrow: '5. seviye boss\'u', shell: '10. seviye boss\'u', storm: '15. seviye boss\'u' };
      for (const id of Object.keys(L.ABILITIES)) {
        const a = L.ABILITIES[id];
        const on = !!sd.abilities[id];
        ab.appendChild(h(`<div class="card ach ${on ? 'on' : ''}"><div class="ach-ic">${on ? a.icon : '🔒'}</div><div><b>${a.name}</b><span>${on ? a.desc : req[id] + 'nu yenince açılır'}</span></div></div>`));
      }
      const skins = $('.skins', el);
      const stars = L.save.totalStars();
      L.SKINS.forEach((s) => {
        const open = stars >= s.stars;
        const sel = sd.skins.selected === s.id;
        const c = h(`<div class="skin ${open ? '' : 'closed'} ${sel ? 'sel' : ''}">
          <canvas width="120" height="120"></canvas><b>${s.name}</b>
          <span>${open ? (sel ? 'Seçili' : 'Seç') : `${STAR} ${s.stars}`}</span></div>`);
        const cv = $('canvas', c), g = cv.getContext('2d');
        L.Art.drawLumi(g, 60, 64, 1.2, { skin: s, vx: 0, vy: 0, blink: 0, mood: 'happy', power: 0, scale: 1.7 });
        g.globalCompositeOperation = 'destination-in';
        const mk = g.createRadialGradient(60, 62, 30, 60, 62, 60);
        mk.addColorStop(0, '#000'); mk.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = mk; g.fillRect(0, 0, 120, 120);
        g.globalCompositeOperation = 'source-over';
        c.addEventListener('click', () => {
          if (!open) return L.audio.back();
          sd.skins.selected = s.id;
          L.save.write();
          L.audio.click();
          this.workshop();
        });
        skins.appendChild(c);
      });
      this.show(el, 'workshop');
    },

    // ---------- başarımlar ----------
    achievements() {
      const sd = L.save.data;
      const got = L.ACHIEVEMENTS.filter((a) => sd.achievements[a.id]).length;
      const el = h(`<div class="screen panel-screen">
        <div class="topbar"><div class="tb-left"></div><h2>Başarımlar</h2><span class="pill">${got}/${L.ACHIEVEMENTS.length}</span></div>
        <div class="scroll ach-list"></div>
        <div class="stats"></div></div>`);
      $('.tb-left', el).appendChild(this.btn('‹', 'ghost icon', () => this.title()));
      const list = $('.ach-list', el);
      L.ACHIEVEMENTS.forEach((a) => {
        const on = !!sd.achievements[a.id];
        list.appendChild(h(`<div class="card ach ${on ? 'on' : ''}"><div class="ach-ic">${on ? a.icon : '?'}</div><div><b>${a.name}</b><span>${a.desc}</span></div></div>`));
      });
      const s = sd.stats;
      $('.stats', el).innerHTML = `<span>Toplanan kıvılcım <b>${U.fmt(s.sparks)}</b></span><span>Arındırılan gölge <b>${U.fmt(s.purified)}</b></span><span>Açılan koza <b>${s.cocoons}</b></span><span>Sonsuz rekor <b>${s.endlessBest} m</b></span>`;
      this.show(el, 'ach');
    },

    // ---------- ayarlar ----------
    settings(fromPause) {
      const sd = L.save.data;
      const el = h(`<div class="screen panel-screen">
        <div class="topbar"><div class="tb-left"></div><h2>Ayarlar</h2><span></span></div>
        <div class="scroll set-list"></div></div>`);
      $('.tb-left', el).appendChild(this.btn('‹', 'ghost icon', () => (fromPause ? this.pause() : this.title())));
      const list = $('.set-list', el);
      const toggle = (key, label) => {
        const row = h(`<div class="card setrow"><b>${label}</b><div class="tgl ${sd.settings[key] ? 'on' : ''}"><i></i></div></div>`);
        row.addEventListener('click', () => {
          sd.settings[key] = !sd.settings[key];
          L.save.write();
          L.audio.applySettings();
          L.audio.click();
          $('.tgl', row).classList.toggle('on', sd.settings[key]);
          if (key === 'haptics' && sd.settings[key]) U.vibrate(30);
        });
        list.appendChild(row);
      };
      toggle('music', 'Müzik');
      toggle('sfx', 'Ses efektleri');
      toggle('haptics', 'Titreşim');
      if (!fromPause) {
        const r = this.btn('İlerlemeyi sıfırla', 'ghost danger', () => {
          if (r.dataset.confirm) {
            L.save.reset();
            L.audio.applySettings();
            this.title();
          } else {
            r.dataset.confirm = '1';
            r.innerHTML = 'Emin misin? Tekrar dokun';
          }
        });
        list.appendChild(r);
      }
      list.appendChild(h('<div class="about"><img src="img/emmi-games-mini.svg" alt="EMMİ GAMES"><span>Bir EMMİ GAMES oyunu</span></div>'));
      list.appendChild(h('<p class="credit">Lumora v2.1 — tüm görseller ve sesler oyun içinde prosedürel olarak üretilir. Reklam yok, satın alma yok, internet gerekmez.</p>'));
      this.show(el, 'settings');
    },

    // ---------- HUD ----------
    hud(game) {
      this.clear();
      this.screen = 'hud';
      const el = h(`<div class="hud">
        <div class="hud-top">
          <div class="hud-swarm">${SPARK}<b>0</b></div>
          <div class="hud-mid"><div class="prog"><i></i><span class="tree">☾</span></div><div class="height"></div></div>
          <div class="hud-right"><span class="pill amber">${AMBER}<b>0</b></span></div>
        </div>
        <div class="powers"></div>
        <button class="flare-btn"><svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44"/></svg><span>✺</span></button>
        <button class="pause-btn">❚❚</button>
        <div class="hint-box"></div>
      </div>`);
      this.root.appendChild(el);
      this.hudEl = el;
      this.hudRefs = {
        swarm: $('.hud-swarm b', el), swarmBox: $('.hud-swarm', el), amber: $('.hud-right b', el), prog: $('.prog i', el),
        progBox: $('.prog', el), height: $('.height', el), flare: $('.flare-btn', el), fg: $('.flare-btn .fg', el), powers: $('.powers', el),
      };
      if (game.endless) this.hudRefs.progBox.style.display = 'none';
      else this.hudRefs.height.style.display = 'none';
      const fb = this.hudRefs.flare;
      const fire = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (L.game && L.game.triggerFlare()) fb.classList.add('fired');
        else L.audio.back();
        setTimeout(() => fb.classList.remove('fired'), 300);
      };
      fb.addEventListener('pointerdown', fire);
      $('.pause-btn', el).addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        L.flow.pause();
      });
      this._last = {};
    },
    hideHud() {
      if (this.hudEl) this.hudEl.classList.add('gone');
    },
    updateHud(game) {
      if (!this.hudEl) return;
      const r = this.hudRefs, last = this._last;
      const n = game.swarm.length;
      if (last.n !== n) {
        r.swarm.textContent = n;
        if (n > (last.n || 0)) { r.swarmBox.classList.remove('bump'); void r.swarmBox.offsetWidth; r.swarmBox.classList.add('bump'); }
        r.swarmBox.classList.toggle('danger', n < 3);
        last.n = n;
      }
      if (last.a !== game.run.amber) { r.amber.textContent = game.run.amber; last.a = game.run.amber; }
      if (game.level) {
        const p = U.clamp(game.cam.y / game.camEnd, 0, 1);
        r.prog.style.transform = `scaleX(${p})`;
      } else r.height.textContent = `${Math.floor(-game.cam.y / 10)} m`;
      const c = game.flare.charge;
      const q = Math.round(c * 100) + (c >= 1 ? 1000 : 0);
      if (last.c !== q) {
        r.fg.style.strokeDashoffset = 276.5 * (1 - c);
        r.flare.classList.toggle('ready', c >= 1);
        last.c = q;
      }
      const lumi = game.lumi;
      const tm = (v) => Math.ceil(v);
      const pw = `${lumi.shield}|${lumi.magnet > 0 ? tm(lumi.magnet) : ''}|${lumi.prism > 0 ? tm(lumi.prism) : ''}|${lumi.bolt > 0 ? tm(lumi.bolt) : ''}|${lumi.chain > 0 ? tm(lumi.chain) : ''}|${lumi.star > 0 ? tm(lumi.star) : ''}`;
      if (last.pw !== pw) {
        let h2 = '';
        if (lumi.shield > 0) h2 += `<span class="pw s">⬡ ${'◆'.repeat(lumi.shield)}<i>${'◇'.repeat(Math.max(0, lumi.shieldMax - lumi.shield))}</i></span>`;
        if (lumi.star > 0) h2 += `<span class="pw st">★ Yıldız ${tm(lumi.star)}</span>`;
        if (lumi.bolt > 0) h2 += `<span class="pw b">➶ Mermi ${tm(lumi.bolt)}</span>`;
        if (lumi.chain > 0) h2 += `<span class="pw c">ϟ Yıldırım ${tm(lumi.chain)}</span>`;
        if (lumi.magnet > 0) h2 += `<span class="pw m">∩ Mıknatıs ${tm(lumi.magnet)}</span>`;
        if (lumi.prism > 0) h2 += `<span class="pw p">△ x2 ${tm(lumi.prism)}</span>`;
        r.powers.innerHTML = h2;
        last.pw = pw;
      }
    },

    // büyük, zarif kutlama yazısı (ZAFER!, MÜKEMMEL!, Gizli Bölge!)
    celebrate(title, sub, col) {
      document.querySelectorAll('.celebrate').forEach((x) => x.remove());
      const fs = title.length > 12 ? 'clamp(26px, 8.5vw, 40px)' : title.length > 8 ? 'clamp(32px, 10vw, 50px)' : '';
      const el = h(`<div class="celebrate" style="--c:${col || '#ffe08a'};${fs ? '--fs:' + fs : ''}"><div class="rays"></div><b>${title.split('').map((ch, i) => `<span style="animation-delay:${i * 0.05}s">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</b><small>${sub || ''}</small></div>`);
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('in'));
      setTimeout(() => el.classList.add('out'), 2300);
      setTimeout(() => el.remove(), 3100);
    },

    bossIntro(name, tip, mini) {
      if (!this.hudEl) return;
      this.celebrate(name, mini ? 'Mini Boss' : 'BOSS', '#ff9ab0');
      const bar = h(`<div class="bossbar"><div class="bb-name">${mini ? '◈' : '♛'} ${name}</div><div class="bb-track"><i></i></div><div class="bb-tip">${tip}</div></div>`);
      this.hudEl.appendChild(bar);
      this.bossFill = $('i', bar);
      this.bossEl = bar;
      requestAnimationFrame(() => bar.classList.add('in'));
      setTimeout(() => { const tp = $('.bb-tip', bar); if (tp) tp.classList.add('gone'); }, 5000);
    },
    updateBoss(frac) {
      if (this.bossFill) this.bossFill.style.transform = `scaleX(${Math.max(0, frac)})`;
    },
    bossEnd() {
      if (this.bossEl) { const b = this.bossEl; b.classList.remove('in'); setTimeout(() => b.remove(), 600); }
      this.bossEl = this.bossFill = null;
    },

    unlockAbility(id) {
      const a = L.ABILITIES[id];
      if (!a) return;
      L.audio.unlock && L.audio.unlock();
      U.vibrate(80);
      const el = h(`<div class="unlock-ov"><div class="dialog unlock">
        <small class="kicker">Yeni Yetenek Açıldı</small>
        <div class="ab-ic"><span>${a.icon}</span></div>
        <h2>${a.name}</h2><p class="tip">${a.desc}</p>
        <div class="menu"></div></div></div>`);
      const b = this.btn('Harika!', 'primary', () => { el.classList.add('out'); setTimeout(() => el.remove(), 350); });
      $('.menu', el).appendChild(b);
      document.body.appendChild(el);
    },

    banner(top, title) {
      document.querySelectorAll('.banner').forEach((x) => x.remove());
      const b = h(`<div class="banner"><small>${top}</small><b>${title}</b></div>`);
      document.body.appendChild(b);
      setTimeout(() => b.classList.add('in'), 20);
      setTimeout(() => b.classList.remove('in'), 2200);
      setTimeout(() => b.remove(), 3000);
    },

    hint(text) {
      const box = this.hudEl && $('.hint-box', this.hudEl);
      if (!box) return;
      const el = h(`<div class="hint"><i>✦</i>${text}</div>`);
      box.innerHTML = '';
      box.appendChild(el);
      requestAnimationFrame(() => el.classList.add('in'));
      clearTimeout(this._hintT);
      this._hintT = setTimeout(() => el.classList.remove('in'), 4800);
    },

    toast(icon, title, sub) {
      const el = h(`<div class="toast"><div class="t-ic">${icon}</div><div><small>Başarım açıldı</small><b>${title}</b><span>${sub}</span></div></div>`);
      this.toastBox.appendChild(el);
      requestAnimationFrame(() => el.classList.add('in'));
      setTimeout(() => el.classList.remove('in'), 3200);
      setTimeout(() => el.remove(), 3800);
    },

    achieve(id) {
      const sd = L.save.data;
      if (sd.achievements[id]) return false;
      const a = L.ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return false;
      sd.achievements[id] = Date.now();
      L.save.write();
      L.audio.achievement();
      this.toast(a.icon, a.name, a.desc);
      return true;
    },

    // ---------- duraklatma ----------
    pause() {
      const el = h(`<div class="screen overlay">
        <div class="dialog"><h2>Duraklatıldı</h2><div class="menu"></div><img class="sig-sm" src="img/emmi-games-mini.svg" alt="EMMİ GAMES"></div></div>`);
      const m = $('.menu', el);
      m.appendChild(this.btn('Devam Et', 'primary', () => L.flow.resume()));
      m.appendChild(this.btn('Yeniden Başla', '', () => L.flow.restart()));
      m.appendChild(this.btn('Ayarlar', 'small', () => this.settings(true)));
      m.appendChild(this.btn('Menüye Dön', 'ghost', () => L.flow.quit()));
      this.show(el, 'pause');
    },

    // ---------- seviye sonucu ----------
    showResults(s) {
      const sd = L.save.data;
      const r = s.run;
      const i = s.levelIndex;
      const prev = sd.levels[i] || { stars: 0, best: 0 };
      const earned = Math.round((r.amber + s.stars * 15 + Math.floor(s.delivered / 3)) * s.amberMul);
      sd.amber += earned;
      sd.levels[i] = { stars: Math.max(prev.stars, s.stars), best: Math.max(prev.best || 0, s.delivered) };
      if (s.stars > 0) sd.unlocked = Math.max(sd.unlocked, Math.min(L.LEVELS.length - 1, i + 1));
      sd.stats.runs++;
      sd.stats.wins++;
      sd.stats.lanterns += Math.round(L.LANTERNS * Math.min(1, s.delivered / Math.max(1, s.potential * 0.5)));
      if (s.level.tutorial) sd.tutorialDone = true;
      L.save.write();

      const newStars = s.stars > prev.stars;
      const nextI = i + 1;
      const nextOpen = nextI < L.LEVELS.length && this.levelOpen(nextI);
      const gateMsg = nextI < L.LEVELS.length && !nextOpen && L.LEVELS[nextI].biome !== s.level.biome
        ? `Sonraki diyar için ${L.BIOME_GATE[L.LEVELS[nextI].biome]} yıldız gerekli` : '';
      const titles = ['Ağaç uyandı', 'Ağaç parlıyor', 'Ay Ağacı Aydınlandı!', 'Ay Ağacı Aydınlandı!'];
      const el = h(`<div class="screen overlay results">
        <div class="dialog">
          <small class="kicker">${i + 1}. ${s.level.title}</small>
          <h2>${s.level.finale && s.stars === 3 ? 'Lumora Kurtuldu!' : titles[s.stars]}</h2>
          <div class="big-stars">${[0, 1, 2].map(() => `<i>${STAR}</i>`).join('')}</div>
          <div class="res-rows">
            <div><span>Taşınan ışık</span><b>${s.delivered}</b></div>
            <div><span>Arındırılan gölge</span><b>${r.purified}</b></div>
            <div><span>Açılan koza</span><b>${r.cocoons}</b></div>
            <div><span>Hasar</span><b>${r.hits === 0 ? 'Kusursuz ✦' : r.hits}</b></div>
            ${r.bosses ? `<div class="wide"><span>Yenilen boss</span><b>♛ ${L.BOSS_NAMES[L.BOSSES[i].kind]}</b></div>` : ''}
          </div>
          <div class="earn">${AMBER}<b class="cnt">0</b><small>kehribar kazandın</small></div>
          ${gateMsg ? `<p class="gate">${gateMsg}</p>` : ''}
          ${s.stars < 3 ? `<p class="tip">3 yıldız için ${Math.ceil(s.potential * 0.5)} ışık taşı.</p>` : ''}
          <div class="menu"></div>
        </div></div>`);
      const m = $('.menu', el);
      if (nextOpen) m.appendChild(this.btn('Sonraki Seviye ›', 'primary', () => L.flow.startLevel(nextI)));
      else if (s.level.finale) m.appendChild(this.btn('Sonsuz Gece', 'primary', () => L.flow.startEndless()));
      const row = h('<div class="row"></div>');
      row.appendChild(this.btn('Tekrar', 'small', () => L.flow.startLevel(i)));
      row.appendChild(this.btn('Harita', 'small', () => L.flow.quit('map')));
      if (!nextOpen) row.appendChild(this.btn('Atölye', 'small', () => { L.flow.quit('workshop'); }));
      m.appendChild(row);
      this.show(el, 'results');

      if (s.unlock) setTimeout(() => { if (el.isConnected) this.unlockAbility(s.unlock); }, 2600 + s.stars * 420);
      // yıldız animasyonu
      const stars = el.querySelectorAll('.big-stars i');
      for (let k = 0; k < s.stars; k++) {
        setTimeout(() => {
          stars[k].classList.add('on');
          L.audio.star(k);
          U.vibrate(25);
        }, 500 + k * 420);
      }
      // kehribar sayacı
      const cnt = $('.cnt', el);
      const t0 = performance.now() + 500 + s.stars * 420;
      const tick = (now) => {
        const p = U.clamp((now - t0) / 900, 0, 1);
        cnt.textContent = Math.round(earned * U.ease.outCubic(p));
        if (p < 1 && el.isConnected) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      // başarımlar
      setTimeout(() => {
        this.achieve('first_light');
        if (s.stars === 3) this.achieve('three_star');
        if (s.perfect) { this.achieve('perfect'); sd.stats.perfect++; }
        if (r.maxSwarm >= 50) this.achieve('swarm50');
        if (r.maxSwarm >= 120) this.achieve('swarm120');
        this.checkStatAchievements();
        if (s.level.boss) this.achieve(['biome1', 'biome2', 'biome3', 'biome4'][s.level.biome]);
        if (newStars) {
          // yeni ruh açıldı mı?
          const total = L.save.totalStars();
          const prevTotal = total - (s.stars - prev.stars);
          const sk = L.SKINS.find((x) => x.stars > prevTotal && x.stars <= total);
          if (sk) this.toast('☼', `Yeni ışık ruhu: ${sk.name}`, 'Atölye\'den seçebilirsin');
          for (let b = 1; b < 4; b++) if (prevTotal < L.BIOME_GATE[b] && total >= L.BIOME_GATE[b]) this.toast('✧', `Yeni diyar: ${L.BIOMES[b].name}`, L.BIOMES[b].sub);
        }
      }, 1400 + s.stars * 420);
    },

    checkStatAchievements() {
      const st = L.save.data.stats;
      if (st.purified >= 25) this.achieve('purify25');
      if (st.purified >= 200) this.achieve('purify200');
      if (st.cocoons >= 10) this.achieve('cocoon10');
      if (L.save.data.amber >= 1000) this.achieve('rich');
    },

    showDeath(s) {
      const sd = L.save.data;
      const r = s.run;
      sd.stats.runs++;
      let earned, best = false;
      if (s.endless) {
        earned = r.amber + Math.floor(s.height / 40);
        if (s.height > sd.stats.endlessBest) { sd.stats.endlessBest = s.height; best = true; }
        if (s.height >= 2000) this.achieve('endless');
      } else earned = Math.floor(r.amber * 0.8);
      sd.amber += earned;
      L.save.write();
      this.checkStatAchievements();
      const tips = [
        'Işık Patlaması gölgeleri yok etmekle kalmaz, onları kıvılcıma dönüştürür.',
        'Hasar aldığında saçılan kıvılcımları hemen topla — geri kazanabilirsin!',
        'Atölye\'deki güçlendirmeler her denemeyi kolaylaştırır.',
        'Kozalar büyük bir sürü ister ama içleri kıvılcım doludur.',
        'Güve saldırmadan önce kızarır; o anda yana kaç.',
        'Sürün kalabalıklaştıkça ışığın büyür ve gölgeler daha görünür olur.',
      ];
      const el = h(`<div class="screen overlay death">
        <div class="dialog">
          <h2>${s.endless ? (best ? 'Yeni Rekor!' : 'Gece Bitti') : 'Işığın Söndü…'}</h2>
          ${s.endless
            ? `<div class="bigval">${s.height} m</div><p class="sub">En iyi: ${sd.stats.endlessBest} m</p>`
            : `<div class="dprog"><i style="width:${Math.round(s.progress * 100)}%"></i><span>Ağaca %${Math.round(s.progress * 100)} kaldı ${Math.round((1 - s.progress) * 100)}</span></div>`}
          <div class="earn">${AMBER}<b>+${earned}</b><small>kehribar kurtarıldı</small></div>
          <p class="tip">💡 ${U.pick(tips)}</p>
          <div class="menu"></div>
        </div></div>`);
      if (!s.endless) $('.dprog span', el).textContent = `Ay Ağacı'na %${Math.round(s.progress * 100)} yol aldın`;
      const m = $('.menu', el);
      m.appendChild(this.btn('Tekrar Dene', 'primary', () => L.flow.restart()));
      const row = h('<div class="row"></div>');
      row.appendChild(this.btn('Atölye', 'small', () => L.flow.quit('workshop')));
      row.appendChild(this.btn('Menü', 'small', () => L.flow.quit()));
      m.appendChild(row);
      this.show(el, 'death');
    },
  };

  L.ui = ui;
})();
