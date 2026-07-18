#!/usr/bin/env python3
"""
Generator splash screen PNG dla DINBoard.

Generuje 3 rodzaje obrazów z jednym spójnym wzorcem branda:
- granat #0e0f11 tła
- żółte logo DIN (geometria z public/dinboard.svg — prostokąty + linie)
- "DINBoard" wordmark ("Board" w amber #f59e0b)
- subtitle "APLIKACJA DLA ELEKTRYKÓW"

Dlaczego PIL rysuje geometrię zamiast rasteryzować dinboard.svg:
- PIL nie ma parsera SVG. Instalacja cairosvg/resvg to nowa zależność systemowa.
- dinboard.svg to 4 prostokąty + 3 linie — trywialne do odtworzenia w PIL.
- Wynik jest identyczny wizualnie, a skrypt działa offline bez zależności.

Użycie:
    python scripts/generate-splashes.py

Pliki wyjściowe:
    android/app/src/main/res/drawable{,-land-*,port-*}/splash.png  (11 plików)
    ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732{,,-1,-2}.png  (3 pliki)
    public/assets/splash/ios-startup-*.png  (8 plików — iPhone/iPad startup images)

Re-run: idempotentny — nadpisuje istniejące pliki. Bezpieczne do uruchamiania
w CI po każdej zmianie branda.
"""

import os
from PIL import Image, ImageDraw, ImageFont

# === Kolory branda (zgodne z src/App.css / index.html inline style) ===
BG_COLOR = (0x0e, 0x0f, 0x11)            # granat tła
LOGO_YELLOW = (0xe0, 0xb3, 0x41)         # żółty DIN (z dinboard.svg)
LOGO_DARK_BG = (0x11, 0x12, 0x14)        # tło wewnątrz logo (svg rect)
TEXT_WHITE = (0xf8, 0xfa, 0xfc)          # "DIN"
TEXT_AMBER = (0xf5, 0x9e, 0x0b)          # "Board" — amber-500
SUBTITLE_GRAY = (0x6c, 0x72, 0x80)       # muted

# === Rozmiary splash ===
# Android density buckets. Center-crop skaluje do ekranu, więc obraz
# proporcjonalny (np. 4:3 dla land, 3:4 dla port) jest bezpieczny.
ANDROID_DENSITIES = {
    "mdpi": 1.0,
    "hdpi": 1.5,
    "xhdpi": 2.0,
    "xxhdpi": 3.0,
    "xxxhdpi": 4.0,
}
ANDROID_PORT_BASE = (320, 480)   # 2:3 — portret
ANDROID_LAND_BASE = (480, 320)   # 3:2 — landscape

# iOS — universal 2732×2732 (universal splash, skracany przez system)
IOS_UNIVERSAL = 2732

# iOS Safari PWA startup images (apple-touch-startup-image).
# Apple nie wspiera SVG dla startup images — wymagają PNG w dokładnych
# rozmiarach per device class, matched przez media query w index.html.
IOS_STARTUP_SIZES = {
    # Nazwa pliku: (szerokość, wysokość)
    "iphone-se": (640, 1136),          # iPhone SE / 5 / 5s
    "iphone-678": (750, 1294),         # iPhone 6 / 7 / 8
    "iphone-678-plus": (1242, 2148),  # iPhone 6/7/8 Plus
    "iphone-x-xs": (1125, 2436),      # iPhone X / XS
    "iphone-xr-xsmax": (828, 1792),   # iPhone XR / XS Max
    "iphone-11-pro": (1125, 2436),    # iPhone 11 Pro
    "iphone-12-13-mini": (1125, 2436),
    "ipad-pro-12.9": (2048, 2732),    # iPad Pro 12.9"
}

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_font(size: int) -> ImageFont.FreeTypeFont:
    """Znajdź Outfit (z public/fonts) albo systemowy fallback."""
    candidates = [
        os.path.join(PROJECT_ROOT, "public", "fonts", "Outfit-Bold.ttf"),
        os.path.join(PROJECT_ROOT, "public", "fonts", "Outfit-SemiBold.ttf"),
        # Windows fallback (czysty build bez fontów branda)
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\seguisb.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    # Ostateczny fallback — domyślny font PIL (bitmap, ale działający)
    return ImageFont.load_default()


def draw_din_logo(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int) -> None:
    """
    Narysuj logo DIN (geometryczna wersja public/dinboard.svg).

    dinboard.svg (viewBox 192):
      - rect 0,0,192,192 rx=32 fill=#111214  ← tło ikony
      - rect 36,56,120,80 rx=4 stroke=yellow  ← obwódka DIN rail
      - 3 linie poziome: y=76, 96, 116
      - 3 rect'y MCB (24x30): (48,62), (80,82), (112,62)

    cx, cy = środek logo na obrazie docelowym. size = szerokość logo.
    Skala = size / 192.
    """
    s = size / 192.0
    # Tło ikony (zaokrąglony prostokąt ~ rx 32)
    bg_r = int(32 * s)
    draw.rounded_rectangle(
        [cx - size // 2, cy - size // 2, cx + size // 2, cy + size // 2],
        radius=bg_r,
        fill=LOGO_DARK_BG,
    )

    # Obwódka DIN rail: rect 36,56,120,80
    rail_x = cx - int(60 * s)
    rail_y = cy - int(40 * s)
    rail_w = int(120 * s)
    rail_h = int(80 * s)
    rail_lw = max(2, int(3 * s))
    draw.rounded_rectangle(
        [rail_x, rail_y, rail_x + rail_w, rail_y + rail_h],
        radius=max(2, int(4 * s)),
        outline=LOGO_YELLOW,
        width=rail_lw,
    )

    # 3 linie poziome DIN rail (y offsety od środka: -20, 0, +20)
    line_lw = max(1, int(2 * s))
    for dy in (-20, 0, 20):
        ly = cy + int(dy * s)
        draw.line(
            [rail_x, ly, rail_x + rail_w, ly],
            fill=LOGO_YELLOW,
            width=line_lw,
        )

    # 3 rect'y MCB — 24x30, wypełnione półprzezroczystym amber, obwódką yellow
    mcb_positions = [(48, 62), (80, 82), (112, 62)]
    mcb_w = int(24 * s)
    mcb_h = int(30 * s)
    mcb_lw = max(1, int(2 * s))
    for (mx, my) in mcb_positions:
        # (mx, my) to lewy-górny róg w układzie logo (0..192).
        # Przesuwamy tak, by lewy-górny róg DIN rail był w (rail_x, rail_y).
        ax = rail_x + int((mx - 36) * s)
        ay = rail_y + int((my - 56) * s)
        draw.rounded_rectangle(
            [ax, ay, ax + mcb_w, ay + mcb_h],
            radius=max(1, int(2 * s)),
            outline=LOGO_YELLOW,
            width=mcb_lw,
        )


def render_splash(width: int, height: int) -> Image.Image:
    """
    Wyrenderuj splash dla danego rozmiaru. Logo wycentrowane, wordmark pod.
    Pasek ładowania pominięty — natywne splash nie mają animacji (to statyczne PNG).
    """
    img = Image.new("RGB", (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Rozmiar logo skalujemy do krótszego boku ekranu (~22% krótszego boku)
    # — z DOŚWIADCZENIA: na phone 640px szer → logo ~140px (dobrze wyważy).
    # Na tablet 2732px → logo ~600px. Spójne z proporcjami web splash (7rem ≈ 22% viewport).
    logo_size = int(min(width, height) * 0.22)
    cx = width // 2
    cy = int(height * 0.40)  # lekko powyżej środka, zostawia miejsce na subtitle
    draw_din_logo(draw, cx, cy, logo_size)

    # Wordmark "DINBoard" — font skalujemy do szerokości ekranu
    font_size = max(28, int(min(width, height) * 0.075))
    font = find_font(font_size)

    # Mierzymy tekst żeby go wycentrować
    wordmark = "DINBoard"
    try:
        bbox = draw.textbbox((0, 0), wordmark, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
    except AttributeError:
        # PIL < 8.0 fallback
        text_w, text_h = font.getsize(wordmark)

    text_y = cy + logo_size // 2 + int(min(width, height) * 0.04)
    text_x = (width - text_w) // 2

    # "DIN" biały, "Board" amber — rysujemy w dwóch krokach z odpowiednim offset
    din_text = "DIN"
    board_text = "Board"
    try:
        din_bbox = draw.textbbox((0, 0), din_text, font=font)
        din_w = din_bbox[2] - din_bbox[0]
    except AttributeError:
        din_w = font.getsize(din_text)[0]

    draw.text((text_x, text_y), din_text, fill=TEXT_WHITE, font=font)
    draw.text((text_x + din_w, text_y), board_text, fill=TEXT_AMBER, font=font)

    # Subtitle "APLIKACJA DLA ELEKTRYKÓW"
    sub_size = max(10, int(font_size * 0.30))
    sub_font = find_font(sub_size)
    subtitle = "APLIKACJA DLA ELEKTRYKÓW"
    try:
        sub_bbox = draw.textbbox((0, 0), subtitle, font=sub_font)
        sub_w = sub_bbox[2] - sub_bbox[0]
    except AttributeError:
        sub_w = sub_font.getsize(subtitle)[0]
    sub_x = (width - sub_w) // 2
    sub_y = text_y + text_h + int(min(width, height) * 0.015)
    draw.text((sub_x, sub_y), subtitle, fill=SUBTITLE_GRAY, font=sub_font)

    return img


def save(img: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  + {path}  ({img.size[0]}x{img.size[1]})")


def generate_android() -> None:
    print("[Android] generuję splash PNG...")
    # drawable/ (uniwersalny fallback) — portrait basline
    save(render_splash(ANDROID_PORT_BASE[0], ANDROID_PORT_BASE[1]),
         os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res",
                      "drawable", "splash.png"))
    # density-specific portrait + landscape
    for name, scale in ANDROID_DENSITIES.items():
        pw = int(ANDROID_PORT_BASE[0] * scale)
        ph = int(ANDROID_PORT_BASE[1] * scale)
        save(render_splash(pw, ph),
             os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res",
                          f"drawable-port-{name}", "splash.png"))
        lw = int(ANDROID_LAND_BASE[0] * scale)
        lh = int(ANDROID_LAND_BASE[1] * scale)
        save(render_splash(lw, lh),
             os.path.join(PROJECT_ROOT, "android", "app", "src", "main", "res",
                          f"drawable-land-{name}", "splash.png"))


def generate_ios() -> None:
    print("[iOS] generuję universal splash PNG...")
    base = os.path.join(PROJECT_ROOT, "ios", "App", "App", "Assets.xcassets",
                        "Splash.imageset")
    img = render_splash(IOS_UNIVERSAL, IOS_UNIVERSAL)
    # Contents.json odwołuje się do 3 nazw — wszystkie to ten sam obraz.
    for fname in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        save(img, os.path.join(base, fname))


def generate_ios_startup() -> None:
    print("[iOS Safari PWA] generuję apple-touch-startup-image PNG...")
    base = os.path.join(PROJECT_ROOT, "public", "assets", "splash")
    for name, (w, h) in IOS_STARTUP_SIZES.items():
        save(render_splash(w, h), os.path.join(base, f"ios-startup-{name}.png"))


def main() -> None:
    print(f"DINBoard splash generator — root: {PROJECT_ROOT}")
    generate_android()
    generate_ios()
    generate_ios_startup()
    print("Gotowe.")


if __name__ == "__main__":
    main()
