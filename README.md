# LUMORA — Işığın Yolculuğu

Gece, Lumora vadisini yuttu ve dev Ay Ağaçları söndü. Sen **Lumi**'sin: son ışık ruhu. Kaybolmuş kıvılcımları topla, sürünü büyüt, gölgeleri arındır ve her diyarın sonunda Ay Ağacı'nın fenerlerini yeniden yak.

**Tek parmakla oynanır:** ekranın herhangi bir yerinde sürükle, Lumi parmağını takip eder.

## Oynanış

- **Kıvılcım sürüsü:** Topladığın her kıvılcım seni takip eden parlayan sürüye katılır. Sürü büyüdükçe ışığın da büyür ve karanlıkta daha fazlasını görürsün.
- **Risk ve ödül:** Dikenler, gölgeler, güveler ve çarklar sürünü yer. Lumi'ye çarparlarsa kıvılcımların saçılır. Hızlı davranırsan saçılan kıvılcımları geri toplayabilirsin.
- **Işık Patlaması:** Toplarken dolar. Dokununca gölgeleri yok etmekle kalmaz, onları **yeni kıvılcımlara dönüştürür**.
- **Ay Ağacı finali:** Her seviyenin sonunda sürün ağaca akar ve fenerleri tek tek yakar. Taşıdığın ışık 1–3 yıldızı belirler. Tüm fenerler yanarsa ağaç çiçek açar.
- **Işık kozaları:** Üstlerindeki sayı kadar kıvılcımla dokunursan içlerinden kıvılcım yağar.
- **Güçlendirmeler:** Ay Kalkanı, Işık Mıknatısı, Nova ve Prizma (x2).
- **Sürprizler:** Kaçak altın kıvılcım, rüzgâr akımları, yıldız kayması (göktaşları) ve bölüm sonlarında Karanlık Dalga kovalamacası.

## İçerik

- 4 diyar × 5 seviye = **20 seviye**: Fısıltı Ormanı, Işıltı Mağarası, Batık Bahçe, Yıldız Zirvesi
- **Sonsuz Gece** modu (rekor yüksekliği)
- **Atölye:** 5 kalıcı geliştirme (kehribar ile)
- **6 ışık ruhu** (görünüm), yıldız topladıkça açılır
- **15 başarım**, istatistikler, otomatik kayıt
- Reklam yok, satın alma yok, internet gerekmez

## Teknik

- Oyun motoru: HTML5 Canvas 2D ile yazılmış özel motor (`app/src/main/assets/www`). Tüm görseller (karakterler, arka planlar, ışık, parçacıklar) ve tüm sesler (Web Audio ile jeneratif müzik ve efektler) kodla **prosedürel** olarak üretilir. Harici varlık veya lisans gerekmez.
- Işık sistemi: düşük çözünürlüklü karanlık maskesi ile ışık kaynakları "oyulur", üstüne ek (additive) parıltı katmanları eklenir.
- Android kabuğu: sade `Activity` + `WebView` (`MainActivity.java`): tam ekran, titreşim köprüsü, geri tuşu ve duraklat/devam desteği.
- Uyarlanabilir kalite: yavaş cihazlarda çözünürlük otomatik düşer.
- Kayıt: `localStorage`.

### Dosyalar

| Dosya | Görev |
|---|---|
| `js/game.js` | Oyun döngüsü, çarpışma, sürü fiziği, ışık maskesi, seviye sonu |
| `js/levels.js` | Deterministik seviye üretici (desen parçaları) |
| `js/art.js` | Prosedürel çizimler: Lumi, gölgeler, ağaç, arka planlar |
| `js/audio.js` | Jeneratif müzik ve ses efektleri |
| `js/ui.js` | Menüler, harita, atölye, HUD, sonuç ekranları |
| `js/biomes.js` | Diyarlar, seviyeler, geliştirmeler, başarımlar |
| `js/main.js` | Açılış, ana döngü, dokunmatik giriş |

### Derleme

GitHub Actions (`.github/workflows/build.yml`) her `main` gönderiminde APK üretir. APK, hem artifact olarak hem de bir GitHub Release dosyası olarak yayınlanır.

Yerelde derlemek için JDK 17, Android SDK ve Gradle 8.7 gerekir:

```
gradle assembleRelease
```

Masaüstünde denemek için `app/src/main/assets/www/index.html` dosyasını Chrome'da açabilirsin (yön tuşları + boşluk).

> Not: `keystore/lumora-release.jks` yalnızca test/yan yükleme içindir. Play Store'a yüklemeden önce kendi gizli imzalama anahtarını kullan.
