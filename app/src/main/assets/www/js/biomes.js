/* LUMORA — biyom tanımları ve seviye listesi */
(function () {
  'use strict';
  const L = window.L;

  L.BIOMES = [
    {
      id: 'forest',
      name: 'Fısıltı Ormanı',
      sub: 'Ay ışığının unutulduğu yer',
      skyTop: '#040a1c', skyBot: '#0e2c3d',
      fog: '#3d8c95', far: '#123341', mid: '#0a2230', near: '#06141d',
      rim: '#7fd8d0', accent: '#8fffe0', glow2: '#5fc8ff',
      leaf: '#0f3a3a', leafRim: '#4fb3a0',
      dark: 0.3, shadow: '#140a26', shadowRim: '#9a5cff',
      moon: true,
    },
    {
      id: 'cave',
      name: 'Işıltı Mağarası',
      sub: 'Mantarların şarkı söylediği derinlik',
      skyTop: '#07020f', skyBot: '#24093a',
      fog: '#8a3fb0', far: '#2a1040', mid: '#1a0a2a', near: '#0d0516',
      rim: '#d78cff', accent: '#ff6fd8', glow2: '#5ff3ff',
      leaf: '#2a1240', leafRim: '#b76cff',
      dark: 0.42, shadow: '#05010d', shadowRim: '#ff4f9a',
      moon: false,
    },
    {
      id: 'garden',
      name: 'Batık Bahçe',
      sub: 'Suların altındaki eski saray',
      skyTop: '#011318', skyBot: '#04404a',
      fog: '#20b3a8', far: '#0a4048', mid: '#062c33', near: '#03191e',
      rim: '#7fffe0', accent: '#63ffb5', glow2: '#7ab8ff',
      leaf: '#0b3d36', leafRim: '#4fe0b0',
      dark: 0.34, shadow: '#0a0820', shadowRim: '#6f7bff',
      moon: false,
    },
    {
      id: 'peak',
      name: 'Yıldız Zirvesi',
      sub: 'Büyük Ay Ağacı seni bekliyor',
      skyTop: '#05031a', skyBot: '#20185a',
      fog: '#6a7bd8', far: '#1f1d52', mid: '#141238', near: '#0a0920',
      rim: '#bcd8ff', accent: '#9ad8ff', glow2: '#ff9ad8',
      leaf: '#1b2550', leafRim: '#a8c4ff',
      dark: 0.36, shadow: '#0b0418', shadowRim: '#ff5f7f',
      moon: true,
    },
  ];

  // Her seviye: biyom, uzunluk (px, ekran yüksekliği oranı), zorluk, tanıtılan mekanikler, yıldız eşikleri (oran)
  // feats: wisp, vine, moth, cocoon, wheel, jelly, meteor, web, chase, wind, golden, power
  const lv = (b, len, diff, feats, extra) => Object.assign({ biome: b, len, diff, feats }, extra || {});
  L.LEVELS = [
    lv(0, 7, 0.0, ['vine'], { tutorial: true, title: 'Uyanış' }),
    lv(0, 11, 0.15, ['vine', 'wisp', 'power'], { title: 'İlk Gölgeler' }),
    lv(0, 12, 0.25, ['vine', 'wisp', 'cocoon', 'power', 'wind'], { title: 'Koza Fısıltısı' }),
    lv(0, 13, 0.35, ['vine', 'wisp', 'moth', 'cocoon', 'power', 'golden'], { title: 'Güve Gecesi' }),
    lv(0, 14, 0.45, ['vine', 'wisp', 'moth', 'cocoon', 'power', 'chase', 'wind'], { title: 'Karanlık Dalga', boss: true }),

    lv(1, 13, 0.4, ['wheel', 'wisp', 'cocoon', 'power'], { title: 'Kristal Kapı' }),
    lv(1, 14, 0.5, ['wheel', 'wisp', 'web', 'cocoon', 'power', 'golden'], { title: 'Ağların Dansı' }),
    lv(1, 15, 0.55, ['wheel', 'vine', 'moth', 'web', 'cocoon', 'power', 'wind'], { title: 'Mantar Korosu' }),
    lv(1, 15, 0.62, ['wheel', 'wisp', 'moth', 'web', 'cocoon', 'power', 'golden'], { title: 'Derin Yankı' }),
    lv(1, 16, 0.7, ['wheel', 'wisp', 'moth', 'web', 'cocoon', 'power', 'chase'], { title: 'Mor Fırtına', boss: true }),

    lv(2, 14, 0.55, ['jelly', 'vine', 'cocoon', 'power', 'wind'], { title: 'Batık Kapılar' }),
    lv(2, 15, 0.62, ['jelly', 'wisp', 'cocoon', 'power', 'golden'], { title: 'Denizanası Bahçesi' }),
    lv(2, 16, 0.68, ['jelly', 'wheel', 'moth', 'cocoon', 'power', 'wind'], { title: 'Akıntılar' }),
    lv(2, 16, 0.74, ['jelly', 'wisp', 'vine', 'web', 'cocoon', 'power', 'golden'], { title: 'Mercan Taht' }),
    lv(2, 17, 0.8, ['jelly', 'wisp', 'moth', 'cocoon', 'power', 'chase', 'wind'], { title: 'Derinlerin Gözü', boss: true }),

    lv(3, 15, 0.7, ['meteor', 'vine', 'wisp', 'cocoon', 'power', 'wind'], { title: 'Buz Patikası' }),
    lv(3, 16, 0.76, ['meteor', 'moth', 'wheel', 'cocoon', 'power', 'golden'], { title: 'Kuzey Işıkları' }),
    lv(3, 17, 0.82, ['meteor', 'wisp', 'jelly', 'web', 'cocoon', 'power', 'wind'], { title: 'Yıldız Yağmuru' }),
    lv(3, 18, 0.88, ['meteor', 'wisp', 'moth', 'wheel', 'cocoon', 'power', 'golden'], { title: 'Sessiz Zirve' }),
    lv(3, 20, 0.95, ['meteor', 'wisp', 'moth', 'vine', 'wheel', 'cocoon', 'power', 'chase', 'wind'], { title: 'Büyük Ay Ağacı', boss: true, finale: true }),
  ];

  // Her diyarın içinde yolculuk boyunca değişen bölgeler (renk, sis, bitki örtüsü)
  L.ZONES = [
    [
      { name: 'Ay Işığı Patikası', top: '#061433', bot: '#11475e', fog: '#3fc4c0', flora: ['flower', 'fern', 'mush'], cols: ['#8fffe0', '#5fc8ff', '#ffd36b'] },
      { name: 'Zümrüt Açıklık', top: '#03170f', bot: '#0f5a3a', fog: '#43e08f', flora: ['mush', 'flower', 'fern'], cols: ['#7dffb0', '#c6ff6b', '#ff9fd8'] },
      { name: 'Ateşböceği Çayırı', top: '#170c2a', bot: '#5a2f4a', fog: '#ffb36b', flora: ['flower', 'mush', 'crystal'], cols: ['#ffd36b', '#ff9fd8', '#b78cff'] },
    ],
    [
      { name: 'Kristal Kapı Yolu', top: '#0a0320', bot: '#2c0f50', fog: '#9a5cff', flora: ['crystal', 'mush'], cols: ['#b78cff', '#5ff3ff', '#ff6fd8'] },
      { name: 'Pembe Mantar Korusu', top: '#1a0418', bot: '#4a0f42', fog: '#ff5fc8', flora: ['mush', 'crystal', 'flower'], cols: ['#ff6fd8', '#ffd36b', '#ff9fd8'] },
      { name: 'Turkuaz Yeraltı Gölü', top: '#02121f', bot: '#0b3f5a', fog: '#3fe0ff', flora: ['crystal', 'mush'], cols: ['#5ff3ff', '#8fffe0', '#b78cff'] },
    ],
    [
      { name: 'Mercan Kapısı', top: '#021820', bot: '#06485a', fog: '#2fd0c0', flora: ['coral', 'flower'], cols: ['#63ffb5', '#ff8fb0', '#5fc8ff'] },
      { name: 'Zümrüt Yosunlar', top: '#021a12', bot: '#0a5a3c', fog: '#4fff9a', flora: ['fern', 'coral', 'mush'], cols: ['#7dffb0', '#c6ff6b', '#8fffe0'] },
      { name: 'İnci Sarayı', top: '#0c1030', bot: '#2a4a7a', fog: '#9ad8ff', flora: ['crystal', 'coral', 'flower'], cols: ['#e8f4ff', '#9ad8ff', '#ff9fd8'] },
    ],
    [
      { name: 'Buz Patikası', top: '#050a26', bot: '#1d2f6a', fog: '#8ab8ff', flora: ['crystal', 'fern'], cols: ['#bfe2ff', '#8fffe0', '#9ad8ff'] },
      { name: 'Aurora Sırtı', top: '#06081e', bot: '#173a4e', fog: '#5fffc0', flora: ['crystal', 'flower'], cols: ['#5fffc0', '#9a7bff', '#ff7ad8'] },
      { name: 'Yıldız Tahtı', top: '#140a2c', bot: '#4a2a5a', fog: '#ffd36b', flora: ['crystal', 'flower', 'mush'], cols: ['#ffd36b', '#ff9fd8', '#fff3c4'] },
    ],
  ];

  // Mini boss / boss karşılaşmaları (seviye indeksi -> tür ve güç ölçeği)
  L.BOSSES = {
    2: { kind: 'guardian', scale: 0.5 },
    4: { kind: 'guardian', scale: 1, unlock: 'arrow' },
    7: { kind: 'queen', scale: 0.6 },
    9: { kind: 'queen', scale: 1, unlock: 'shell' },
    12: { kind: 'golem', scale: 0.6 },
    14: { kind: 'golem', scale: 1, unlock: 'storm' },
    17: { kind: 'heart', scale: 0.55 },
    19: { kind: 'heart', scale: 1 },
  };
  L.BOSS_NAMES = { guardian: 'Gölge Muhafızı', queen: 'Karanlık Güve Kraliçesi', golem: 'Kristal Golem', heart: 'Karanlığın Kalbi' };

  // Boss'ları yenerek açılan kalıcı Lumi yetenekleri
  L.ABILITIES = {
    arrow: { name: 'Işık Oku', icon: '➶', desc: 'Lumi artık yakındaki gölgelere kendiliğinden ışık oku fırlatır.' },
    shell: { name: 'Ay Kabuğu', icon: '⬡', desc: 'Her seviyeye 2 katmanlı bir ışık kalkanıyla başlarsın.' },
    storm: { name: 'Fırtına Kalbi', icon: 'ϟ', desc: 'Işık Patlaması artık düşmanlar arasında yıldırım zinciri de yayar.' },
  };

  // Biyom kilidi: gereken toplam yıldız
  L.BIOME_GATE = [0, 9, 22, 36];

  L.SKINS = [
    { id: 'lumi', name: 'Lumi', core: '#fff6c8', mid: '#ffd36b', edge: '#ff9a3c', stars: 0 },
    { id: 'nane', name: 'Nane', core: '#e8fff6', mid: '#8fffd0', edge: '#20c89a', stars: 6 },
    { id: 'gul', name: 'Gül', core: '#fff0f7', mid: '#ff9fd0', edge: '#ff4f8b', stars: 14 },
    { id: 'ay', name: 'Ay', core: '#f4f9ff', mid: '#b9d8ff', edge: '#6f8dff', stars: 24 },
    { id: 'kor', name: 'Kor', core: '#fff1dc', mid: '#ff9a5a', edge: '#ff3f2f', stars: 36 },
    { id: 'safak', name: 'Şafak', core: '#fbf2ff', mid: '#d6a6ff', edge: '#7f5bff', stars: 50 },
  ];

  L.UPGRADES = [
    { id: 'start', name: 'Kıvılcım Kesesi', desc: 'Her seviyeye fazladan kıvılcımla başla', max: 5, cost: [40, 90, 160, 260, 400], fmt: (l) => `+${l * 3} başlangıç kıvılcımı` },
    { id: 'magnet', name: 'Işık Çekimi', desc: 'Kıvılcımları daha uzaktan topla', max: 5, cost: [50, 110, 190, 300, 450], fmt: (l) => `+%${l * 18} çekim alanı` },
    { id: 'flare', name: 'Nova Kalbi', desc: 'Işık Patlaması daha hızlı dolar', max: 5, cost: [60, 120, 210, 330, 480], fmt: (l) => `+%${l * 15} dolum hızı` },
    { id: 'shield', name: 'Kristal Zırh', desc: 'Işık Kalkanı daha fazla katmanla gelir', max: 4, cost: [70, 150, 260, 400], fmt: (l) => `+${Math.ceil(l / 2)} kalkan katmanı` },
    { id: 'amber', name: 'Kehribar Gözü', desc: 'Seviye sonunda daha çok kehribar', max: 4, cost: [80, 170, 290, 450], fmt: (l) => `+%${l * 12} kehribar` },
  ];

  L.ACHIEVEMENTS = [
    { id: 'first_light', name: 'İlk Işık', desc: 'İlk seviyeyi tamamla', icon: '✦' },
    { id: 'swarm50', name: 'Işık Sürüsü', desc: 'Aynı anda 50 kıvılcıma ulaş', icon: '❋' },
    { id: 'swarm120', name: 'Yıldız Seli', desc: 'Aynı anda 120 kıvılcıma ulaş', icon: '✺' },
    { id: 'purify25', name: 'Arındırıcı', desc: 'Toplam 25 gölgeyi arındır', icon: '☼' },
    { id: 'purify200', name: 'Şafak Getiren', desc: 'Toplam 200 gölgeyi arındır', icon: '☀' },
    { id: 'perfect', name: 'Kusursuz', desc: 'Bir seviyeyi hiç hasar almadan bitir', icon: '◈' },
    { id: 'three_star', name: 'Üç Yıldız', desc: 'Bir seviyeden 3 yıldız al', icon: '★' },
    { id: 'golden', name: 'Altın Av', desc: 'Kaçak altın kıvılcımı yakala', icon: '✧' },
    { id: 'cocoon10', name: 'Koza Ustası', desc: '10 koza patlat', icon: '❂' },
    { id: 'biome1', name: 'Orman Uyandı', desc: 'Fısıltı Ormanı\'nı tamamla', icon: '♣' },
    { id: 'biome2', name: 'Mağara Şarkısı', desc: 'Işıltı Mağarası\'nı tamamla', icon: '◆' },
    { id: 'biome3', name: 'Derinlerden Işık', desc: 'Batık Bahçe\'yi tamamla', icon: '≋' },
    { id: 'biome4', name: 'Lumora\'nın Kalbi', desc: 'Büyük Ay Ağacı\'nı yak', icon: '☾' },
    { id: 'endless', name: 'Sonsuz Gece', desc: 'Sonsuz modda 2000 m yüksel', icon: '∞' },
    { id: 'rich', name: 'Kehribar Hazinesi', desc: '1000 kehribar biriktir', icon: '⬢' },
    { id: 'boss1', name: 'Muhafız Düştü', desc: 'Gölge Muhafızı\'nı yen', icon: '⛨' },
    { id: 'boss2', name: 'Kraliçe Avcısı', desc: 'Karanlık Güve Kraliçesi\'ni yen', icon: '♛' },
    { id: 'boss3', name: 'Golem Kırıcı', desc: 'Kristal Golem\'i parçala', icon: '◇' },
    { id: 'chain5', name: 'Zincirleme Işık', desc: 'Aynı anda 5 düşmanı yok et', icon: 'ϟ' },
    { id: 'chest5', name: 'Hazine Avcısı', desc: '5 büyülü sandık aç', icon: '⚿' },
    { id: 'secret', name: 'Gizli Bahçe', desc: 'Gizli bir ödül bölgesi bul', icon: '❀' },
  ];
})();
