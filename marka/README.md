# EMMİ GAMES — Marka Kiti v1.0

Tek marka, tek logo, tek görsel kimlik. Bütün dosyalar **tek bir ana geometriden** (`kaynak/logo.py`) üretilir; harf biçimleri, yıldızın yeri ve renkler hiçbir dosyada değişmez.

## Dosyalar

| Dosya | Ne için | Ölçü |
|---|---|---|
| `emmi-games-logo.svg` | **Ana vektör logo** (şeffaf zemin, yazılar eğri) | 586×329 vektör |
| `emmi-games-logo-lacivert.svg` | Lacivert zeminli ana logo | vektör |
| `emmi-games-logo-2000.png` / `-lacivert-2000.png` | Sosyal medya, sunum, web | 2000 px genişlik |
| `emmi-games-icon-512.png` | **Google Play geliştirici simgesi** | 512×512, opak PNG, köşesiz |
| `emmi-games-banner-4096x2304.jpg` | **Google Play üst bilgi resmi** | 4096×2304 JPG, < 1 MB |
| `emmi-games-mini.svg` / `.png` | Oyun içi küçük imza (yatay dizilim) | vektör / 120 px yükseklik |
| `emmi-games-splash/` | Açılış animasyonu (tek JS dosyası) + önizleme | ~2 sn |

## Renkler

| Ad | HEX | Kullanım |
|---|---|---|
| Gece laciverti | `#0A1640` | Ana zemin |
| Derin gece | `#060C26` | Zemin kenarları |
| Kraliyet mavisi | `#1D3C96` | Zemin ışığı |
| Altın açık | `#FFF6CF` | EMMİ üst ton |
| Altın | `#FFD24A` | EMMİ orta ton, yıldız ışığı |
| Kehribar | `#F39A1C` | EMMİ alt ton |
| Gölge | `#7A3A06` | EMMİ derinlik gölgesi |
| Yıldız beyazı | `#FFFBE8` | İ'nin yıldızı |
| Beyaz | `#FFFFFF` | GAMES |

## Yazı karakterleri
- **EMMİ:** Lilita One. İ harfinin noktası, logonun imzası olan dört köşeli yıldızdır.
- **GAMES:** Inter ExtraBold (800), geniş harf aralığıyla.

İki font da SIL Open Font License ile dağıtılıyor; lisans metinleri `kaynak/fontlar/` klasöründe. Logo dosyalarında yazılar eğriye çevrildi, bu yüzden hiçbir cihazda font yüklemek gerekmez.

## Kullanım kuralları
- **Logo boşluğu:** Logonun çevresinde en az bir "E" yüksekliğinin yarısı kadar boş alan bırak.
- **En küçük boyut:** Tam logo en az 96 px genişlikte kullanılmalı. Daha küçük alanlarda mini imzayı kullan.
- **Zemin:** Logo yalnızca koyu lacivert ya da koyu bir zemin üzerinde kullanılmalı. Açık zemin üzerinde kullanma.
- **Değiştirme yasak:** Harfleri esnetme, renkleri ve yıldızın yerini değiştirme, logoya başka öğe ekleme.
- **Açılış ve imza:** Açılış animasyonu her oyunda aynıdır. Oyun içi imza sadece menü, duraklatma, ayarlar ve hakkında ekranlarında görünür; oynanış sırasında gösterilmez.

## Yeniden üretme
```
cd kaynak && python3 logo.py && python3 assets.py && python3 splash.py
```
Gerekenler: Python 3, fontTools ve `rsvg-convert` (PNG/JPG dışa aktarımı için). Fontlar `kaynak/fontlar/` içine konmalı (Lilita One dahil; Inter değişken fontu boyut nedeniyle depoda yok — Google Fonts'tan `Inter-var.ttf` adıyla ekleyin).
