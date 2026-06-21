#!/usr/bin/env python3
"""Generate color preview for the PDF title page header."""
from PIL import Image, ImageDraw, ImageFont

# Fonty
FONT_BOLD = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 11)
FONT_BOLD_SM = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 9)
FONT_BOLD_XS = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 7)
FONT_BOLD_XXS = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 6)
FONT_REG = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 9)
FONT_REG_SM = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 7)
FONT_REG_XS = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 6)
FONT_REG_XXS = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 5)
FONT_REG_ITALIC = ImageFont.truetype("C:/Windows/Fonts/ariali.ttf", 7)

# Warianty kolorów
VARIANTS = [
    ("OBECNY (za jasny)", "#0D79F2", "flat jasny niebieski — razi"),
    ("NAVY", "#1e3a5f", "ciemny granat, polska klasyka"),
    ("SLATE", "#334155", "ciemny stalowy, neutralny"),
    ("DEEP BLUE", "#1e40af", "wciaz niebieski ale 3x ciemniejszy"),
]

# Layout
W, H = 1320, 600
PAD = 20
COL_W = (W - 2 * PAD - 30) // 4  # 4 warianty + odstęp
COL_H = 470

img = Image.new("RGB", (W, H), "#f3f4f6")
draw = ImageDraw.Draw(img)

# Tytuł
draw.text((PAD, 10), "WARIANTY KOLORU NAGŁÓWKA STRONY TYTUŁOWEJ PDF", font=FONT_BOLD, fill="#111827")
draw.text((PAD, 28), "Wybierz wariant który najmniej razi — użyję tego samego HEX-a we wszystkich 5 miejscach w pdfStyles", font=FONT_REG_SM, fill="#6b7280")

for i, (name, color, desc) in enumerate(VARIANTS):
    x0 = PAD + i * (COL_W + 10)
    y0 = 55

    # Tło strony (biały papier)
    draw.rectangle([x0, y0, x0 + COL_W, y0 + COL_H], fill="white", outline="#d1d5db")

    # === HEADER BAR ===
    # Logo box
    draw.rectangle([x0 + 12, y0 + 12, x0 + 42, y0 + 42], outline="#cbd5e1", width=1)
    draw.text((x0 + 19, y0 + 22), "LOGO", font=FONT_BOLD_XXS, fill="#9aa3b4")

    # Tytuł dokumentu
    draw.text((x0 + 50, y0 + 14), "DOKUMENTACJA", font=FONT_BOLD, fill="#111827")
    draw.text((x0 + 50, y0 + 25), "POWYKONAWCZA", font=FONT_BOLD, fill="#111827")
    draw.text((x0 + 50, y0 + 38), "PN-HD 60364 (ARKUSZ 6)", font=FONT_REG_XXS, fill="#6b7280")

    # Pasek numeru protokołu (KOLOR BRAND)
    proto_x = x0 + COL_W - 95
    proto_y = y0 + 12
    draw.rectangle([proto_x, proto_y, proto_x + 80, proto_y + 30], fill=color, outline=None)
    draw.text((proto_x + 10, proto_y + 5), "PROTOKÓŁ", font=FONT_BOLD_XXS, fill="white")
    draw.text((proto_x + 10, proto_y + 16), "1 / 2026", font=FONT_BOLD, fill="white")

    # Linia separatora (borderB2Dark)
    draw.line([(x0 + 10, y0 + 52), (x0 + COL_W - 10, y0 + 52)], fill="#1f2937", width=2)

    # === TYTUŁ ===
    title_y = y0 + 70
    draw.text((x0 + COL_W // 2, title_y), "OŚWIADCZENIE WYKONAWCY", font=FONT_BOLD, fill="#111827", anchor="mm")
    draw.text((x0 + COL_W // 2, title_y + 14), "instalacji elektrycznej wykonanej zgodnie z przepisami", font=FONT_REG_ITALIC, fill="#6b7280", anchor="mm")

    # === INFO BOX ===
    box_x, box_y = x0 + 12, y0 + 105
    box_w, box_h = COL_W - 24, 75
    draw.rectangle([box_x, box_y, box_x + box_w, box_y + box_h], fill="#f9fafb", outline="#e5e7eb")
    # Nagłówek w kolorze brand
    draw.text((box_x + 10, box_y + 10), "INFORMACJE O OBIEKCIE", font=FONT_BOLD_XXS, fill=color)
    # Pola
    draw.text((box_x + 10, box_y + 28), "Rodzaj:", font=FONT_BOLD_XXS, fill="#374151")
    draw.text((box_x + 60, box_y + 28), "Budynek jednorodzinny", font=FONT_BOLD_XXS, fill="#111827")
    draw.text((box_x + 10, box_y + 42), "Adres:", font=FONT_BOLD_XXS, fill="#374151")
    draw.text((box_x + 60, box_y + 42), "ul. Budowlana 12, Lubin", font=FONT_BOLD_XXS, fill="#111827")
    draw.text((box_x + 10, box_y + 56), "Inwestor:", font=FONT_BOLD_XXS, fill="#374151")
    draw.text((box_x + 60, box_y + 56), "Jan Kowalski", font=FONT_BOLD_XXS, fill="#111827")

    # === CHECKBOXY ===
    cb_x, cb_y = x0 + 12, y0 + 195
    # Box "Zakres prac"
    draw.rectangle([cb_x, cb_y, cb_x + (COL_W - 24) // 2 - 4, cb_y + 80], outline="#e5e7eb")
    draw.text((cb_x + 10, cb_y + 10), "ZAKRES PRAC", font=FONT_BOLD_XXS, fill=color)
    # 3 checkboxy
    for j, label in enumerate(["Montaż rozdzielnicy", "Układanie przewodów", "Pomiary ochrony"]):
        cy = cb_y + 28 + j * 16
        # Kwadrat
        draw.rectangle([cb_x + 10, cy, cb_x + 18, cy + 8], outline=color, width=1)
        # Check
        draw.text((cb_x + 12, cy + 0), "✓", font=FONT_BOLD_XXS, fill=color)
        draw.text((cb_x + 22, cy + 1), label, font=FONT_REG_XS, fill="#374151")

    # Box "Załączniki"
    cb2_x = cb_x + (COL_W - 24) // 2 + 4
    draw.rectangle([cb2_x, cb_y, cb2_x + (COL_W - 24) // 2 - 4, cb_y + 80], outline="#e5e7eb")
    draw.text((cb2_x + 10, cb_y + 10), "ZAŁĄCZNIKI", font=FONT_BOLD_XXS, fill=color)
    for j, label in enumerate(["Tabela pomiarów", "RCD i uziemienie", "Schemat"]):
        cy = cb_y + 28 + j * 16
        draw.rectangle([cb2_x + 10, cy, cb2_x + 18, cy + 8], outline=color, width=1)
        draw.text((cb2_x + 12, cy + 0), "✓", font=FONT_BOLD_XXS, fill=color)
        draw.text((cb2_x + 22, cy + 1), label, font=FONT_REG_XS, fill="#374151")

    # === OŚWIADCZENIE BOX (border w kolorze brand) ===
    decl_x, decl_y = x0 + 12, y0 + 290
    decl_w = COL_W - 24
    decl_h = 80
    draw.rectangle([decl_x, decl_y, decl_x + decl_w, decl_y + decl_h], outline=color, width=1)
    draw.text((decl_x + decl_w // 2, decl_y + 10), "PEŁNA TREŚĆ OŚWIADCZENIA WYKONAWCY", font=FONT_BOLD_XXS, fill=color, anchor="mm")
    draw.text((decl_x + decl_w // 2, decl_y + 30), "Oświadczam, że instalacja elektryczna w wyżej", font=FONT_REG_XS, fill="#1f2937", anchor="mm")
    draw.text((decl_x + decl_w // 2, decl_y + 42), "wymienionym obiekcie została wykonana zgodnie", font=FONT_REG_XS, fill="#1f2937", anchor="mm")
    draw.text((decl_x + decl_w // 2, decl_y + 54), "z przepisami ustawy Prawo Budowlane...", font=FONT_REG_XS, fill="#1f2937", anchor="mm")

    # === ETYKIETA WARIANTU ===
    label_y = y0 + COL_H + 10
    draw.text((x0 + COL_W // 2, label_y), name, font=FONT_BOLD_SM, fill="#111827", anchor="mm")
    draw.text((x0 + COL_W // 2, label_y + 14), color.upper(), font=FONT_REG_SM, fill=color, anchor="mm")
    draw.text((x0 + COL_W // 2, label_y + 26), desc, font=FONT_REG_XS, fill="#6b7280", anchor="mm")

img.save("F:/stare pliki/Nowy projekt/docs-distribution/color-variants-preview.png", "PNG", optimize=True)
print("Saved:", "F:/stare pliki/Nowy projekt/docs-distribution/color-variants-preview.png")
print("Size:", img.size)