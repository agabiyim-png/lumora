"""Ana logodan türetilen tüm dosyalar."""
import random, subprocess, os
from logo import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

def write(p, s):
    open(p, 'w').write(s)

def place(L, uid, x, y, scale):
    defs, body = svg_group(L, uid)
    return defs, f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.5f})">{body}</g>'

def navy_bg(uid, w, h, cy='45%'):
    d = (f'<radialGradient id="{uid}-bg" cx="50%" cy="{cy}" r="75%"><stop offset="0" stop-color="{ROYAL}"/>'
         f'<stop offset="0.55" stop-color="{NAVY}"/><stop offset="1" stop-color="{NAVY_DEEP}"/></radialGradient>')
    return d, f'<rect width="{w}" height="{h}" fill="url(#{uid}-bg)"/>'

L = build()

# 1) Ana logo (şeffaf) + lacivert zeminli
write(f'{OUT}/emmi-games-logo.svg', svg_doc(L))
write(f'{OUT}/emmi-games-logo-lacivert.svg', svg_doc(L, bg='navy'))

# 2) Google Play geliştirici simgesi 512x512 (kare, yuvarlatılmamış, opak)
W = H = 512
sc = (W * 0.93) / L['w']
x = (W - L['w'] * sc) / 2
y = (H - L['h'] * sc) / 2 + 4
d1, bg = navy_bg('ic', W, H, '42%')
d2, g = place(L, 'ic', x, y, sc)
write(f'{OUT}/emmi-games-icon-512.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>{d1}{d2}</defs>{bg}{g}</svg>')

# 3) Kapak görseli 4096x2304
W, H = 4096, 2304
random.seed(7)
stars = ''.join(f'<circle cx="{random.uniform(0,W):.0f}" cy="{random.uniform(0,H):.0f}" r="{random.choice([2,2.5,3,4,5]):.1f}" fill="#FFFFFF" opacity="{random.choice([.18,.28,.4,.55]):.2f}"/>' for _ in range(260))
trails = (f'<g fill="none" stroke-linecap="round" filter="url(#bn-soft)">'
          f'<path d="M -200 1650 Q 1100 2250 2100 1960 T 4300 1450" stroke="#FFC83D" stroke-width="10" opacity=".35"/>'
          f'<path d="M 4300 760 Q 3500 260 2350 330" stroke="#FFC83D" stroke-width="6" opacity=".18"/>'
          f'</g><g fill="none" stroke-linecap="round">'
          f'<path d="M -200 1650 Q 1100 2250 2100 1960 T 4300 1450" stroke="#FFE7A0" stroke-width="3" opacity=".45"/>'
          f'<path d="M 4300 760 Q 3500 260 2350 330" stroke="#FFE7A0" stroke-width="2" opacity=".25"/></g>')
glow = f'<ellipse cx="{W/2}" cy="{H*0.47}" rx="1500" ry="760" fill="url(#bn-halo)"/>'
sc = 1750 / L['w']
x = (W - L['w'] * sc) / 2
y = (H - L['h'] * sc) / 2 - 20
d1, bg = navy_bg('bn', W, H, '47%')
d2, g = place(L, 'bn', x, y, sc)
d3 = ('<filter id="bn-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter>'
      '<radialGradient id="bn-halo"><stop offset="0" stop-color="#FFD24A" stop-opacity=".16"/><stop offset="1" stop-color="#FFD24A" stop-opacity="0"/></radialGradient>')
write(f'{OUT}/emmi-games-banner-4096x2304.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>{d1}{d2}{d3}</defs>{bg}{stars}{glow}{trails}{g}</svg>')

# 4) Mini imza: aynı parçalar, yatay dizilim (EMMİ + GAMES yanında)
#    Harf biçimleri, yıldız konumu ve renkler değişmez; sadece GAMES sağa alınır.
defs, body = svg_group(L, 'mn')
emmi_right = L['ox'] + L['emmi_w']
games_h = L['games'][0][1][3] - min(b[1] for _, b in L['games'])
gw = max(b[2] for _, b in L['games'])
gap = L['S'] * 0.11
# GAMES'i EMMİ'nin taban çizgisine hizala, boyutunu büyüt (okunurluk)
gscale = 1.9
new_gx = emmi_right + gap
new_gy = L['base'] - max(b[3] for _, b in L['games']) * gscale
body = body.replace(f'<g id="mn-games" transform="translate({L["gx"]:.2f} {L["gy"]:.2f})"',
                    f'<g id="mn-games" transform="translate({new_gx:.2f} {new_gy:.2f}) scale({gscale})"')
top = L['star_cy'] - L['star'] / 2 - 6
mw = new_gx + gw * gscale + 10 - (L['ox'] - 10)
mh = L['base'] + L['shadow_dy'] + 8 - top
vb = f'{L["ox"] - 10:.1f} {top:.1f} {mw:.1f} {mh:.1f}'
write(f'{OUT}/emmi-games-mini.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{mw:.0f}" height="{mh:.0f}" role="img" aria-label="EMMİ GAMES"><title>EMMİ GAMES</title><defs>{defs}</defs>{body}</svg>')
print('mini ratio', round(mw / mh, 3))
