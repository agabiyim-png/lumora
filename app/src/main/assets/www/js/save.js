/* LUMORA — ilerleme kaydı (localStorage) */
(function () {
  'use strict';
  const L = window.L;
  const KEY = 'lumora.save.v1';

  function defaults() {
    return {
      version: 1,
      amber: 0,
      levels: {}, // index -> { stars, best }
      unlocked: 0,
      upgrades: { start: 0, magnet: 0, shield: 0, flare: 0, amber: 0 },
      skins: { owned: ['lumi'], selected: 'lumi' },
      achievements: {},
      stats: { sparks: 0, purified: 0, runs: 0, wins: 0, deaths: 0, lanterns: 0, flares: 0, goldens: 0, cocoons: 0, endlessBest: 0, perfect: 0, chests: 0, kills: 0, bosses: 0 },
      settings: { music: true, sfx: true, haptics: true },
      tutorialDone: false,
      seen: {},
      abilities: {},
    };
  }

  function merge(base, src) {
    if (!src || typeof src !== 'object') return base;
    for (const k of Object.keys(base)) {
      if (!(k in src)) continue;
      if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        base[k] = merge(base[k], src[k]);
      } else base[k] = src[k];
    }
    // dinamik anahtarlı nesneler
    if (src.levels) base.levels = src.levels;
    if (src.achievements) base.achievements = src.achievements;
    if (src.seen) base.seen = src.seen;
    if (src.abilities) base.abilities = src.abilities;
    return base;
  }

  const save = {
    data: defaults(),
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) this.data = merge(defaults(), JSON.parse(raw));
      } catch (e) {
        this.data = defaults();
      }
      return this.data;
    },
    write() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) { /* depolama dolu olabilir */ }
    },
    reset() {
      this.data = defaults();
      this.write();
    },
    totalStars() {
      let s = 0;
      for (const k in this.data.levels) s += this.data.levels[k].stars || 0;
      return s;
    },
    levelStars(i) {
      const l = this.data.levels[i];
      return l ? l.stars : 0;
    },
  };

  L.save = save;
})();
