"""Create authored screen and blueprint textures for the loft model."""

from __future__ import annotations

import json
import sys
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


def blueprint(project: dict, number: int) -> None:
    width, height = 1800, 1260
    paper = Image.new("RGB", (width, height), (18, 39, 47))
    grain = Image.effect_noise((width, height), 13).convert("RGB")
    im = Image.blend(paper, grain, 0.035)
    d = ImageDraw.Draw(im)
    minor, major = (29, 58, 66), (39, 72, 79)
    for x in range(48, width - 48, 24):
        is_major = (x - 48) % 120 == 0
        d.line((x, 48, x, height - 48), fill=major if is_major else minor, width=2 if is_major else 1)
    for y in range(48, height - 48, 24):
        is_major = (y - 48) % 120 == 0
        d.line((48, y, width - 48, y), fill=major if is_major else minor, width=2 if is_major else 1)

    ink = (151, 197, 201)
    bright = (221, 232, 221)
    muted = (108, 155, 164)
    amber = (216, 147, 98)
    faint = (79, 126, 136)

    # Sheet edges, registration marks and a restrained architectural title block.
    d.rectangle((38, 38, width - 38, height - 38), outline=ink, width=3)
    d.rectangle((53, 53, width - 53, height - 53), outline=faint, width=1)
    d.line((76, 132, width - 76, 132), fill=ink, width=2)
    d.text((82, 77), "V / Y     DESIGN WORKSHOP", font=font(22, "mono"), fill=bright)
    d.text((width - 515, 79), f"DRAWING  /  2026.0{number}", font=font(20, "mono"), fill=ink)
    for x, y in ((38, 38), (width - 38, 38), (38, height - 38), (width - 38, height - 38)):
        d.line((x - 15, y, x + 15, y), fill=amber, width=2)
        d.line((x, y - 15, x, y + 15), fill=amber, width=2)

    # Drawing field and right-hand annotation strip.
    d.line((1350, 165, 1350, 920), fill=faint, width=2)
    d.text((1420, 176), "REFERENCE / NOTES", font=font(18, "mono"), fill=amber)
    d.text((1420, 222), f"SHEET 0{number}   ·   1:{number * 10}", font=font(15, "mono"), fill=ink)
    d.line((1407, 260, 1710, 260), fill=faint, width=1)
    note_rows = ["LAYOUT STUDY", "INTERACTION MAP", "COMPONENT VIEW"]
    for i, row in enumerate(note_rows):
        y = 716 + i * 54
        d.ellipse((1418, y + 3, 1432, y + 17), outline=amber if i == number - 1 else ink, width=2)
        d.text((1450, y), row, font=font(13, "mono"), fill=bright if i == number - 1 else muted)

    def label(x: int, y: int, text: str, size: int = 15, color=ink) -> None:
        d.text((x, y), text, font=font(size, "mono"), fill=color)

    def dim_h(x1: int, x2: int, y: int, text: str) -> None:
        d.line((x1, y, x2, y), fill=muted, width=2)
        d.line((x1, y - 13, x1, y + 13), fill=muted, width=2)
        d.line((x2, y - 13, x2, y + 13), fill=muted, width=2)
        d.polygon(((x1, y), (x1 + 12, y - 5), (x1 + 12, y + 5)), fill=muted)
        d.polygon(((x2, y), (x2 - 12, y - 5), (x2 - 12, y + 5)), fill=muted)
        box = d.textbbox((0, 0), text, font=font(15, "mono"))
        tx = (x1 + x2 - (box[2] - box[0])) / 2
        d.rectangle((tx - 8, y - 24, tx + box[2] - box[0] + 8, y - 2), fill=(18, 39, 47))
        d.text((tx, y - 25), text, font=font(15, "mono"), fill=ink)

    def dim_v(x: int, y1: int, y2: int, text: str) -> None:
        d.line((x, y1, x, y2), fill=muted, width=2)
        d.line((x - 13, y1, x + 13, y1), fill=muted, width=2)
        d.line((x - 13, y2, x + 13, y2), fill=muted, width=2)
        d.polygon(((x, y1), (x - 5, y1 + 12), (x + 5, y1 + 12)), fill=muted)
        d.polygon(((x, y2), (x - 5, y2 - 12), (x + 5, y2 - 12)), fill=muted)
        label(x + 17, (y1 + y2) // 2 - 9, text, 14)

    def rule(x1: int, y1: int, x2: int, y2: int, color=ink, thick: int = 3) -> None:
        d.line((x1, y1, x2, y2), fill=color, width=thick)

    if number == 1:
        # Portfolio home: browser elevation, editorial rail and project-card grid.
        x0, y0, x1, y1 = 190, 220, 1240, 770
        d.rounded_rectangle((x0, y0, x1, y1), radius=12, outline=bright, width=4)
        d.line((x0, y0 + 62, x1, y0 + 62), fill=ink, width=2)
        for x in (x0 + 28, x0 + 53, x0 + 78):
            d.ellipse((x, y0 + 24, x + 10, y0 + 34), outline=amber, width=2)
        label(x0 + 120, y0 + 18, "VY / LIBRARY", 16, bright)
        label(x0 + 650, y0 + 21, "WORK     ABOUT     CONTACT", 13)
        # Hero column and a framed image/feature column.
        label(x0 + 56, y0 + 120, "01  /  HOME", 13, amber)
        d.text((x0 + 56, y0 + 165), "Vincent", font=font(49, "bold"), fill=bright)
        d.text((x0 + 56, y0 + 220), "Yen", font=font(49, "bold"), fill=bright)
        rule(x0 + 56, y0 + 300, x0 + 565, y0 + 300, faint, 2)
        for row, length in enumerate((450, 390, 420, 285)):
            rule(x0 + 56, y0 + 330 + row * 26, x0 + 56 + length, y0 + 330 + row * 26, ink, 2)
        d.rectangle((x0 + 642, y0 + 112, x0 + 992, y0 + 346), outline=ink, width=3)
        d.rectangle((x0 + 658, y0 + 128, x0 + 976, y0 + 330), outline=faint, width=1)
        # Camera frame and horizon lines suggest the portfolio's visual-work panel.
        rule(x0 + 680, y0 + 296, x0 + 954, y0 + 296, muted, 2)
        rule(x0 + 680, y0 + 174, x0 + 680, y0 + 296, faint, 2)
        rule(x0 + 954, y0 + 174, x0 + 954, y0 + 296, faint, 2)
        d.ellipse((x0 + 775, y0 + 185, x0 + 855, y0 + 265), outline=amber, width=3)
        label(x0 + 662, y0 + 358, "FEATURE / VISUAL STORY", 12, amber)
        # Lower project index.
        rule(x0 + 56, y0 + 395, x1 - 56, y0 + 395, faint, 2)
        for i, x in enumerate((x0 + 56, x0 + 350, x0 + 644)):
            d.rectangle((x, y0 + 424, x + 270, y0 + 510), outline=ink, width=2)
            label(x + 13, y0 + 438, f"0{i + 1}  /  PROJECT", 12, amber)
            rule(x + 13, y0 + 472, x + 240, y0 + 472, muted, 2)
            rule(x + 13, y0 + 490, x + 174, y0 + 490, faint, 2)
        dim_h(x0, x1, 195, "DESKTOP VIEW  /  1440")
        dim_v(155, y0, y1, "760")
        label(236, 802, "ELEVATION A — HOME / PORTFOLIO LIBRARY", 15, bright)
        label(1010, 802, "GRID  /  12 COL", 13, amber)
        # Component inset.
        d.rectangle((1410, 302, 1698, 580), outline=ink, width=2)
        label(1430, 322, "NAV / COMPONENT", 13, bright)
        for i, y in enumerate((368, 412, 456, 500)):
            d.rectangle((1430, y, 1678, y + 28), outline=faint, width=1)
            label(1442, y + 5, ("HEADER", "LIBRARY CARD", "DETAIL VIEW", "CONTACT LINK")[i], 12)
        rule(1550, 368, 1550, 528, amber, 2)
        dim_h(1430, 1678, 563, "AUTO / FLUID")

    elif number == 2:
        # Coursework archive: index shelves, linked records and document folios.
        label(196, 192, "PLAN B  /  ARCHIVE INDEX", 15, amber)
        x0, y0, x1, y1 = 215, 250, 1255, 775
        d.rectangle((x0, y0, x1, y1), outline=bright, width=4)
        d.line((x0, y0 + 58, x1, y0 + 58), fill=ink, width=2)
        label(x0 + 24, y0 + 17, "COURSEWORK / SELECTED FILES", 16, bright)
        label(x1 - 260, y0 + 19, "SORT: SUBJECT  ↕", 12)
        # Three archive columns with spine marks and card rails.
        column_xs = (x0 + 28, x0 + 365, x0 + 702)
        for col, x in enumerate(column_xs):
            d.rectangle((x, y0 + 86, x + 308, y0 + 474), outline=ink, width=2)
            label(x + 16, y0 + 102, f"FOLDER  /  0{col + 1}", 12, amber)
            for row in range(5):
                yy = y0 + 146 + row * 59
                d.rounded_rectangle((x + 15, yy, x + 293, yy + 44), radius=3, outline=faint, width=1)
                d.rectangle((x + 26, yy + 8, x + 53, yy + 35), outline=ink, width=1)
                rule(x + 68, yy + 12, x + 268 - (row % 2) * 45, yy + 12, ink, 2)
                rule(x + 68, yy + 28, x + 205, yy + 28, faint, 2)
        # Record relationship lines and numbered review marks.
        for y in (y0 + 184, y0 + 302, y0 + 420):
            rule(x0 + 336, y, x0 + 365, y, amber, 2)
            rule(x0 + 673, y, x0 + 702, y, amber, 2)
        for i, point in enumerate(((x0 + 338, y0 + 184), (x0 + 675, y0 + 302), (x0 + 338, y0 + 420)), 1):
            x, y = point
            d.ellipse((x - 12, y - 12, x + 12, y + 12), outline=amber, width=2)
            label(x - 5, y - 8, str(i), 10, bright)
        dim_h(x0, x1, 226, "ARCHIVE GRID  /  3 INDEX GROUPS")
        dim_v(175, y0, y1, "760")
        label(236, 808, "PLAN A — COURSEWORK CATALOG / RECORD RELATIONSHIPS", 15, bright)
        # Right-hand legend gives the sheet the feel of a working drawing.
        d.rectangle((1410, 302, 1698, 600), outline=ink, width=2)
        label(1430, 322, "INDEX KEY", 13, bright)
        for i, (word, swatch) in enumerate((("PROJECT", ink), ("COURSE", amber), ("SKILL", muted))):
            y = 378 + i * 50
            d.rectangle((1434, y, 1455, y + 17), outline=swatch, width=2)
            label(1470, y - 2, word, 12)
        rule(1430, 540, 1678, 540, faint, 1)
        label(1430, 557, "FILTER / SUBJECT · YEAR", 12, amber)

    else:
        # Interface studies: matched desktop, tablet and phone elevations.
        label(196, 192, "STUDY C  /  RESPONSIVE INTERACTION", 15, amber)
        dims = ((200, 310, 630, 595, "DESKTOP"), (730, 355, 1050, 595, "TABLET"), (1130, 395, 1260, 595, "PHONE"))
        for i, (x0, y0, x1, y1, title) in enumerate(dims):
            d.rounded_rectangle((x0, y0, x1, y1), radius=17 if i < 2 else 26, outline=bright, width=4)
            d.line((x0, y0 + 40, x1, y0 + 40), fill=ink, width=2)
            d.ellipse(((x0 + x1) // 2 - 5, y0 + 15, (x0 + x1) // 2 + 5, y0 + 25), outline=muted, width=2)
            label(x0 + 16, y0 - 34, title, 12, amber)
            inner = x1 - x0 - 30
            # A variable column layout shows how the same content reflows.
            d.rectangle((x0 + 15, y0 + 55, x1 - 15, y0 + 99), outline=ink, width=1)
            label(x0 + 24, y0 + 67, "NAV / CONTENT", 10)
            if i == 0:
                d.rectangle((x0 + 18, y0 + 115, x0 + 150, y1 - 18), outline=faint, width=2)
                d.rectangle((x0 + 162, y0 + 115, x1 - 18, y0 + 266), outline=ink, width=2)
                for row in range(4):
                    yy = y0 + 130 + row * 31
                    rule(x0 + 30, yy, x0 + 138, yy, muted, 2)
                for col in range(2):
                    xx = x0 + 174 + col * 112
                    d.rectangle((xx, y0 + 130, xx + 94, y0 + 245), outline=faint, width=1)
                    rule(xx + 10, y0 + 224, xx + 83, y0 + 224, ink, 2)
                rule(x0 + 162, y0 + 254, x1 - 18, y0 + 254, amber, 2)
            elif i == 1:
                d.rectangle((x0 + 16, y0 + 112, x1 - 16, y0 + 168), outline=ink, width=2)
                for col in range(2):
                    xx = x0 + 20 + col * (inner // 2)
                    d.rectangle((xx, y0 + 176, xx + inner // 2 - 8, y0 + 222), outline=faint, width=1)
                rule(x0 + 17, y0 + 226, x1 - 17, y0 + 226, amber, 2)
            else:
                for row in range(3):
                    yy = y0 + 107 + row * 31
                    d.rectangle((x0 + 13, yy, x1 - 13, yy + 22), outline=muted if row else ink, width=1)
        # Interaction path and breakpoints between the three studies.
        for x0, x1, y in ((630, 730, 480), (1050, 1130, 480)):
            d.line((x0 + 10, y, x1 - 10, y), fill=amber, width=2)
            d.polygon(((x1 - 10, y), (x1 - 23, y - 6), (x1 - 23, y + 6)), fill=amber)
        dim_h(200, 1260, 250, "RESPONSIVE RANGE  /  390 — 1440")
        dim_v(160, 310, 595, "STUDY")
        label(236, 808, "ELEVATION C — COMPONENT SCALE / INTERACTION FLOW", 15, bright)
        d.rectangle((1410, 302, 1698, 600), outline=ink, width=2)
        label(1430, 322, "BREAKPOINTS", 13, bright)
        for i, word in enumerate(("01  /  REORDER", "02  /  COLLAPSE", "03  /  STACK")):
            y = 378 + i * 50
            d.ellipse((1436, y + 3, 1450, y + 17), outline=amber, width=2)
            label(1470, y, word, 12)
        rule(1430, 540, 1678, 540, faint, 1)
        label(1430, 557, "FLOW / POINTER · TOUCH", 12, amber)

    # Title block, revision cell and scale bar.
    d.line((76, 864, width - 76, 864), fill=ink, width=2)
    d.line((1280, 864, 1280, height - 76), fill=ink, width=2)
    d.text((90, 894), project["title"].upper(), font=font(45, "bold"), fill=bright)
    d.text((92, 956), project["category"].upper(), font=font(18, "mono"), fill=ink)
    d.text((92, 1002), project["summary"], font=font(16, "regular"), fill=muted)
    label(1310, 894, "AUTHOR / VINCENT YEN", 16, bright)
    label(1310, 936, f"ISSUED / {project['year']}     STATUS / {project['status'].upper()}", 13)
    label(1310, 978, f"SHEET / 0{number} OF 0{len(DATA['projects'])}", 14, amber)
    label(1310, 1020, "REV  /  A      UNITS / PX", 13)
    d.rectangle((1310, 1060, 1692, 1178), outline=faint, width=1)
    label(1330, 1078, "PORTFOLIO SYSTEM", 13, bright)
    label(1330, 1112, "DESIGN STUDY / 2026", 12)
    for i in range(6):
        x = 95 + i * 34
        d.line((x, 1087, x + 24, 1087), fill=bright if i % 2 == 0 else muted, width=3)
        d.line((x, 1087, x, 1100), fill=ink, width=1)
    label(95, 1110, "SCALE BAR  /  NOT TO SCALE", 11, muted)
    im.save(OUT / f"blueprint_{number}.jpg", quality=94, subsampling=0)


for i, project in enumerate(DATA["projects"], start=1):
    blueprint(project, i)

if "--blueprints-only" in sys.argv:
    raise SystemExit(0)

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
d.rectangle((45, 45, 1355, 875), outline=(107, 115, 104), width=2)
d.text((91, 76), "FIELD NOTES", font=font(33, "bold"), fill=(235, 230, 214))
d.text((1013, 86), "V / Y     ARCHIVE 03", font=font(20, "mono"), fill=(164, 172, 157))
d.line((91, 137, 1309, 137), fill=(169, 126, 83), width=3)
d.text((94, 165), "SELECTED ROLES  /  2023—2026", font=font(19, "mono"), fill=(169, 151, 119))
timeline_x = 344
d.line((timeline_x, 249, timeline_x, 766), fill=(83, 96, 84), width=3)
for row, role in enumerate(DATA["experience"]):
    y = 268 + row * 255
    d.text((98, y + 4), role["period"].upper(), font=font(21, "mono"), fill=(184, 145, 102))
    d.ellipse((timeline_x - 8, y + 8, timeline_x + 8, y + 24), fill=(212, 157, 103))
    d.text((391, y), role["company"].upper(), font=font(39, "bold"), fill=(235, 232, 218))
    d.text((393, y + 54), role["role"], font=font(23, "mono"), fill=(192, 194, 177))
    summary = role.get("summary", "")
    words = summary.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if d.textlength(candidate, font=font(19)) > 840 and current:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    for line_index, text in enumerate(lines[:2]):
        d.text((393, y + 99 + line_index * 28), text, font=font(19), fill=(152, 164, 153))
    d.line((391, y + 202, 1301, y + 202), fill=(70, 82, 75), width=2)
d.text((95, 813), "BUILDING THINGS THAT MAKE COMPLEX WORK FEEL SIMPLE.",
       font=font(17, "mono"), fill=(128, 144, 132))
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
