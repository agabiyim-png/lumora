"""EMMİ GAMES ana logo üretici. Tüm çıktılar bu tek geometriden türetilir.
Yazılar eğriye çevrilir (font gerektirmez). Fontlar: Lilita One (EMMİ), Inter ExtraBold (GAMES) — ikisi de SIL OFL."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib import instancer
import io, os

FD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fontlar')
_lil = TTFont(f'{FD}/LilitaOne-Regular.ttf')
_int = instancer.instantiateVariableFont(TTFont(f'{FD}/Inter-var.ttf'), {'wght': 800, 'opsz': 32})

GOLD_STOPS = [(0, '#FFF6CF'), (0.45, '#FFD24A'), (1, '#F39A1C')]
SHADOW = '#7A3A06'
NAVY = '#0A1640'
NAVY_DEEP = '#060C26'
ROYAL = '#1D3C96'
STAR_WHITE = '#FFFBE8'
WHITE = '#FFFFFF'
STAR_D = 'M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z'

def text_paths(font, text, size, tracking=0.0):
    """Metni (x=0, taban çizgisi y=0) yollara çevirir; [(d, bbox)] ve toplam genişlik döner."""
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font['head'].unitsPerEm
    s = size / upm
    x = 0.0
    out = []
    for ch in text:
        gname = cmap[ord(ch)]
        g = gs[gname]
        sp = SVGPathPen(gs)
        tp = TransformPen(sp, (s, 0, 0, -s, x, 0))
        g.draw(tp)
        bp = BoundsPen(gs)
        g.draw(TransformPen(bp, (s, 0, 0, -s, x, 0)))
        out.append((sp.getCommands(), bp.bounds))
        x += g.width * s + tracking * size
    return out, x - tracking * size

def build(scale=1.0):
    """Ana kilit (lockup) geometrisi. Döner: dict(parts..., w, h) — koordinatlar 0,0 sol üstten."""
    S = 200 * scale
    emmi, emmi_w = text_paths(_lil, 'EMMI', S, tracking=-0.015)
    # yükseklik: büyük harf yüksekliği
    top = min(b[1] for _, b in emmi)
    base = max(b[3] for _, b in emmi)
    cap = base - top
    games_size = S * 0.215
    games, games_w = text_paths(_int, 'GAMES', games_size, tracking=0.42)
    g_top = min(b[1] for _, b in games)
    g_base = max(b[3] for _, b in games)
    # yıldız: I harfinin ortasında, üstünde
    ib = emmi[3][1]
    i_cx = (ib[0] + ib[2]) / 2
    stem = ib[2] - ib[0]
    star = stem * 0.86
    gap = cap * 0.045
    star_cy = top - gap - star / 2
    pad = S * 0.12
    # yerleşim
    ox = pad
    oy = pad + (top - (star_cy - star / 2)) - top  # yıldızın üstü pad'e otursun
    oy = pad - (star_cy - star / 2)
    shadow_dy = S * 0.032
    gy = oy + base + shadow_dy + cap * 0.24 - g_top  # GAMES üst çizgisi
    gx = ox + (emmi_w - games_w) / 2
    w = emmi_w + 2 * pad
    h = gy + g_base + pad
    return dict(S=S, emmi=emmi, games=games, ox=ox, oy=oy, gx=gx, gy=gy, star=star,
                star_cx=ox + i_cx, star_cy=oy + star_cy, shadow_dy=shadow_dy, w=w, h=h,
                emmi_w=emmi_w, cap=cap, top=oy + top, base=oy + base)

def svg_group(L, uid='eg', glow=True, star_scale=1.0):
    """Logonun <defs> ve <g> parçası (arka plansız)."""
    stops = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in GOLD_STOPS)
    defs = (f'<linearGradient id="{uid}-gold" x1="0" y1="{L["top"]:.1f}" x2="0" y2="{L["base"]:.1f}" gradientUnits="userSpaceOnUse">{stops}</linearGradient>'
            f'<filter id="{uid}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="{L["star"]*0.14:.2f}"/></filter>')
    ed = ' '.join(d for d, _ in L['emmi'])
    gd = ' '.join(d for d, _ in L['games'])
    st = L['star'] * star_scale
    sx, sy = L['star_cx'] - st / 2, L['star_cy'] - st / 2
    k = st / 24
    star = f'<path d="{STAR_D}" transform="translate({sx:.2f} {sy:.2f}) scale({k:.4f})"'
    body = (f'<g id="{uid}-emmi-shadow" transform="translate({L["ox"]:.2f} {L["oy"] + L["shadow_dy"]:.2f})" fill="{SHADOW}"><path d="{ed}"/></g>'
            f'<g id="{uid}-emmi" transform="translate({L["ox"]:.2f} {L["oy"]:.2f})" fill="url(#{uid}-gold)"><path d="{ed}"/></g>')
    # gradyan userSpace: grup çevirisi y'yi kaydırdığı için gradyanı yerel koordinata göre yeniden tanımla
    defs = defs.replace(f'y1="{L["top"]:.1f}"', f'y1="{L["top"] - L["oy"]:.1f}"').replace(f'y2="{L["base"]:.1f}"', f'y2="{L["base"] - L["oy"]:.1f}"')
    if glow:
        body += f'<g id="{uid}-star-glow" fill="#FFD24A" opacity="0.85" filter="url(#{uid}-glow)">{star}/></g>'
    body += f'<g id="{uid}-star" fill="{STAR_WHITE}">{star}/></g>'
    body += f'<g id="{uid}-games" transform="translate({L["gx"]:.2f} {L["gy"]:.2f})" fill="{WHITE}"><path d="{gd}"/></g>'
    return defs, body

def svg_doc(L, bg=None, uid='eg', title='EMMİ GAMES'):
    defs, body = svg_group(L, uid)
    w, h = L['w'], L['h']
    bgx = ''
    if bg == 'navy':
        defs += f'<radialGradient id="{uid}-bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="{ROYAL}"/><stop offset="0.55" stop-color="{NAVY}"/><stop offset="1" stop-color="{NAVY_DEEP}"/></radialGradient>'
        bgx = f'<rect width="{w:.0f}" height="{h:.0f}" fill="url(#{uid}-bg)"/>'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title><defs>{defs}</defs>{bgx}{body}</svg>')

if __name__ == '__main__':
    L = build()
    print('lockup', round(L['w']), round(L['h']))
    os.makedirs('/home/claude/brand/out', exist_ok=True)
    open('' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'emmi-games-logo') + '.svg', 'w').write(svg_doc(L))
    open('' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'emmi-games-logo') + '-lacivert.svg', 'w').write(svg_doc(L, bg='navy'))
