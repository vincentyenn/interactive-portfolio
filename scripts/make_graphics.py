"""Create authored screen and blueprint textures for the loft model."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "graphics"
OUT.mkdir(parents=True, exist_ok=True)
DATA = json.loads((ROOT / "content" / "portfolio.json").read_text())

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_MONO = "/System/Library/Fonts/Supplemental/Courier New.ttf"


def font(size: int, kind: str = "regular") -> ImageFont.FreeTypeFont:
    path = {"regular": FONT_REGULAR, "bold": FONT_BOLD, "mono": FONT_MONO}[kind]
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def line_grid(draw: ImageDraw.ImageDraw, width: int, height: int, spacing: int, color: tuple[int, int, int]) -> None:
    for x in range(0, width + 1, spacing):
        draw.line((x, 0, x, height), fill=color, width=1)
    for y in range(0, height + 1, spacing):
        draw.line((0, y, width, y), fill=color, width=1)


def blueprint(project: dict, number: int) -> None:
    width, height = 1200, 880
    im = Image.new("RGB", (width, height), (21, 48, 59))
    d = ImageDraw.Draw(im)
    line_grid(d, width, height, 44, (36, 69, 79))
    d.rectangle((30, 30, width - 30, height - 30), outline=(121, 163, 169), width=3)
    d.line((30, 660, width - 30, 660), fill=(121, 163, 169), width=3)
    d.line((780, 660, 780, height - 30), fill=(121, 163, 169), width=3)
    d.text((62, 55), f"PROJECT / 0{number}", font=font(27, "mono"), fill=(201, 224, 220))
    d.text((62, 675), project["title"].upper(), font=font(49, "bold"), fill=(239, 239, 220))
    d.text((65, 754), project["category"].upper(), font=font(25, "mono"), fill=(172, 195, 196))
    d.text((810, 680), "VINCENT YEN", font=font(29, "mono"), fill=(239, 239, 220))
    d.text((810, 736), f"{project['year']} / {project['status'].upper()}", font=font(23, "mono"), fill=(172, 195, 196))
    d.text((810, 796), f"SHEET {number} OF {len(DATA['projects'])}", font=font(21, "mono"), fill=(172, 195, 196))
    cx, cy = 550, 365
    pale = (158, 205, 205)
    strong = (229, 240, 222)
    orange = (222, 147, 96)
    if number == 1:
        d.rounded_rectangle((255, 165, 815, 545), radius=13, outline=strong, width=5)
        d.line((255, 235, 815, 235), fill=pale, width=3)
        for x in (286, 310, 334):
            d.ellipse((x, 191, x + 12, 203), outline=orange, width=3)
        d.rectangle((292, 276, 493, 503), outline=pale, width=3)
        for y in (299, 331, 363, 395):
            d.line((313, y, 465, y), fill=pale, width=2)
        d.rectangle((530, 278, 772, 377), outline=pale, width=3)
        d.rectangle((530, 401, 645, 503), outline=pale, width=3)
        d.rectangle((663, 401, 772, 503), outline=pale, width=3)
    elif number == 2:
        for i, x in enumerate((275, 425, 575)):
            d.rectangle((x, 205 + i * 22, x + 125, 505 - i * 14), outline=strong, width=4)
            d.line((x + 24, 235 + i * 22, x + 100, 235 + i * 22), fill=pale, width=3)
            d.line((x + 24, 267 + i * 22, x + 100, 267 + i * 22), fill=pale, width=3)
        d.line((205, 545, 855, 545), fill=pale, width=4)
        for x, y in ((220, 448), (790, 215), (858, 403)):
            d.ellipse((x-23, y-23, x+23, y+23), outline=orange, width=4)
    else:
        for radius in (83, 147, 215):
            d.arc((cx-radius, cy-radius, cx+radius, cy+radius), 215, 540, fill=pale, width=4)
        d.ellipse((cx-33, cy-33, cx+33, cy+33), outline=orange, width=5)
        for ang in (0.25, 2.25, 4.4):
            x = cx + 250 * math.cos(ang)
            y = cy + 205 * math.sin(ang)
            d.rectangle((x-75, y-35, x+75, y+35), outline=strong, width=3)
            d.line((x-45, y, x+45, y), fill=pale, width=2)
    d.line((65, 610, 1135, 610), fill=(73, 117, 124), width=2)
    im.save(OUT / f"blueprint_{number}.jpg", quality=92)


for i, project in enumerate(DATA["projects"], start=1):
    blueprint(project, i)

screen = Image.new("RGB", (1280, 800), (16, 26, 28))
d = ImageDraw.Draw(screen)
d.rectangle((40, 40, 1240, 760), outline=(76, 105, 105), width=2)
d.line((40, 133, 1240, 133), fill=(76, 105, 105), width=2)
d.text((78, 77), "V / Y", font=font(34, "bold"), fill=(237, 227, 204))
d.text((852, 84), "WORK   EXPERIENCE   ABOUT   CONTACT", font=font(22, "mono"), fill=(166, 183, 178))
d.text((82, 212), "VINCENT", font=font(115, "bold"), fill=(240, 236, 222))
d.text((82, 330), "YEN.", font=font(118, "bold"), fill=(240, 236, 222))
d.line((83, 498, 123, 498), fill=(224, 145, 93), width=7)
d.text((82, 540), "BUILDING / LEARNING / MAKING", font=font(28, "mono"), fill=(218, 161, 112))
d.text((82, 604), "COMPUTER SCIENCE  -  TEXAS A&M", font=font(23, "mono"), fill=(174, 191, 184))
d.text((82, 652), "WEB  /  SECURITY  /  VISUAL STORYTELLING", font=font(22, "mono"), fill=(174, 191, 184))
d.ellipse((1010, 260, 1150, 400), outline=(79, 121, 125), width=4)
d.ellipse((1030, 280, 1130, 380), outline=(224, 145, 93), width=3)
d.line((1080, 219, 1080, 449), fill=(79, 121, 125), width=2)
d.line((970, 330, 1190, 330), fill=(79, 121, 125), width=2)
screen.save(OUT / "computer_screen.jpg", quality=94)

board = Image.new("RGB", (1400, 920), (31, 35, 34))
d = ImageDraw.Draw(board)
d.rectangle((45, 45, 1355, 875), outline=(129, 126, 111), width=4)
d.text((93, 92), "EXPERIENCE", font=font(91, "bold"), fill=(234, 229, 212))
d.line((95, 247, 1305, 247), fill=(178, 132, 90), width=4)
for row, role in enumerate(DATA["experience"]):
    y = 304 + row * 255
    d.text((105, y), role["period"].upper(), font=font(27, "mono"), fill=(178, 151, 116))
    d.text((105, y + 57), role["company"].upper(), font=font(50, "bold"), fill=(235, 232, 218))
    d.text((105, y + 132), role["role"].upper(), font=font(29, "mono"), fill=(175, 184, 176))
    d.line((106, y + 208, 1301, y + 208), fill=(76, 85, 80), width=2)
board.save(OUT / "experience_board.jpg", quality=93)

contact = Image.new("RGB", (900, 1000), (26, 33, 32))
d = ImageDraw.Draw(contact)
d.rectangle((50, 50, 850, 950), outline=(179, 121, 76), width=7)
d.text((111, 201), "HELLO", font=font(128, "bold"), fill=(236, 222, 197))
d.text((110, 358), "THERE.", font=font(129, "bold"), fill=(236, 222, 197))
d.line((110, 580, 764, 580), fill=(179, 121, 76), width=5)
d.text((110, 651), "LET'S CONNECT", font=font(54, "mono"), fill=(210, 177, 139))
contact.save(OUT / "contact_sign.jpg", quality=93)

print(f"Created {len(list(OUT.glob('*.jpg')))} authored texture images in {OUT}")
