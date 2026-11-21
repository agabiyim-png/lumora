# EMMİ GAMES açılış animasyonu

`emmi-splash.js` tek başına çalışan, bağımlılığı olmayan bir dosya. Bütün EMMİ GAMES oyunlarında aynı şekilde kullanılır.

```html
<script src="emmi-splash.js"></script>
<script>
  EmmiSplash.play({
    sound: true,              // oyunun ses ayarı kapalıysa false gönder
    onDone: function () {}    // animasyon bittiğinde (yaklaşık 2 sn sonra) çağrılır
  });
  // Oyunun kurulumu ve menüsü bu sırada arka planda hazırlanır.
</script>
```

## Akış (2,0 sn)

| Zaman | Ne oluyor |
|---|---|
| 0,05 – 0,70 sn | Karanlıkta küçük bir yıldız altın ışık izi bırakarak süzülür |
| 0,20 – 0,80 sn | E, M, M, İ harfleri sırayla belirir |
| 0,70 sn | Yıldız İ'nin noktası olur: parlama, saçılan minik yıldızlar ve çan akoru |
| 0,80 – 1,20 sn | Altın yazının üzerinden ışık geçer, GAMES belirir |
| 1,20 – 1,60 sn | Temiz EMMİ GAMES logosu ekranda kalır |
| 1,60 – 2,00 sn | Ekran yumuşakça kaybolur ve menü kendiliğinden görünür |

## Davranış
- **Dokunma yok:** Animasyon sırasında yapılan dokunuşlar yok sayılır, böylece alttaki menüye yanlışlıkla basılmaz. "Geç" düğmesi de yoktur.
- **Ses:** Web Audio ile kodda üretilir, ses dosyası gerekmez. Android WebView'de çalışması için Activity tarafında `setMediaPlaybackRequiresUserGesture(false)` ayarı açık olmalı.
- **Hareket azaltma:** Kullanıcı cihazında "hareketi azalt" tercihini açmışsa animasyon yerine sabit logo gösterilir ve kısa süre sonra kaybolur.
- **Güvenlik:** Animasyon herhangi bir nedenle takılırsa en geç 3 saniye sonra kendiliğinden kapanır.

## Önizleme
`preview/emmi-games-splash.mp4` ve `preview/emmi-games-splash.gif` dosyalarına bakabilir ya da `index.html` dosyasını tarayıcıda açabilirsin.
