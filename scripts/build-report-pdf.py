#!/usr/bin/env python3
"""Build a clean, linked PDF from the route-planning research report."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    ListFlowable,
    ListItem,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#17243b")
BLUE = colors.HexColor("#315ccf")
MUTED = colors.HexColor("#58667c")
RULE = colors.HexColor("#d9e0eb")
PALE = colors.HexColor("#f2f5fa")
DASHES = str.maketrans({"–": "-", "—": "-", "−": "-", "‑": "-"})


def make_link(label: str, url: str) -> str:
    code = label.startswith("`") and label.endswith("`")
    label = label.strip("`")
    label_markup = escape(label)
    if code:
        label_markup = f'<font name="Courier">{label_markup}</font>'
    return f'<link href="{escape(url, {chr(34): "&quot;"})}" color="#315ccf"><u>{label_markup}</u></link>'


def inline(text: str) -> str:
    text = text.translate(DASHES)
    tokens: list[str] = []

    def hold(value: str) -> str:
        tokens.append(value)
        return f"@@TOKEN{len(tokens) - 1}@@"

    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: hold(make_link(m.group(1), m.group(2))),
        text,
    )
    text = escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', text)
    for i, token in enumerate(tokens):
        text = text.replace(f"@@TOKEN{i}@@", token)
    return text


def make_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=23, leading=28, textColor=NAVY, alignment=TA_LEFT,
            spaceAfter=18,
        ),
        "h2": ParagraphStyle(
            "Section", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=13.5, leading=16.5, textColor=NAVY, spaceBefore=9,
            spaceAfter=4.5, keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body", parent=base["BodyText"], fontName="Helvetica",
            fontSize=9.2, leading=12.8, textColor=NAVY, spaceAfter=5,
        ),
        "caption": ParagraphStyle(
            "Caption", parent=base["BodyText"], fontName="Helvetica",
            fontSize=8.5, leading=11, textColor=MUTED, spaceBefore=3,
            spaceAfter=4, keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "Bullet", parent=base["BodyText"], fontName="Helvetica",
            fontSize=9.2, leading=12.8, textColor=NAVY, spaceAfter=2,
        ),
        "cell": ParagraphStyle(
            "Cell", parent=base["BodyText"], fontName="Helvetica",
            fontSize=8, leading=10, textColor=NAVY,
        ),
        "headcell": ParagraphStyle(
            "HeadCell", parent=base["BodyText"], fontName="Helvetica-Bold",
            fontSize=8, leading=10, textColor=colors.white,
        ),
    }


def parse_table(lines: list[str], styles: dict[str, ParagraphStyle], width: float) -> Table:
    rows = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if cells and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            continue
        rows.append(cells)
    data = []
    for row_index, row in enumerate(rows):
        style = styles["headcell"] if row_index == 0 else styles["cell"]
        data.append([Paragraph(inline(cell), style) for cell in row])
    count = len(data[0])
    table = Table(data, colWidths=[width / count] * count, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("GRID", (0, 0), (-1, -1), 0.35, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def read_blocks(text: str):
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        if line.startswith("|"):
            table = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                table.append(lines[i].strip())
                i += 1
            yield "table", table
            continue
        if line.startswith("# "):
            yield "title", line[2:].strip()
            i += 1
            continue
        if line.startswith("## "):
            yield "heading", line[3:].strip()
            i += 1
            continue
        if line.startswith("- "):
            bullets = []
            while i < len(lines) and lines[i].strip().startswith("- "):
                bullets.append(lines[i].strip()[2:])
                i += 1
            yield "bullets", bullets
            continue
        para = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{1,2} |\| |-)\s*", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        yield "paragraph", " ".join(para)


def decorate(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.6)
    canvas.line(doc.leftMargin, height - 0.52 * inch, width - doc.rightMargin, height - 0.52 * inch)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, height - 0.42 * inch, "MADISON ROUTE PLANNER  /  RESEARCH NOTE")
    canvas.line(doc.leftMargin, 0.48 * inch, width - doc.rightMargin, 0.48 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, 0.31 * inch, "Walking graph scale and route measurements")
    canvas.drawRightString(width - doc.rightMargin, 0.31 * inch, f"{doc.page}")
    canvas.restoreState()


def build(source: Path, output: Path) -> None:
    styles = make_styles()
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(output), pagesize=letter, title="Walking graph scale and route measurements in Madison",
        author="Madison Route Planner project", subject="Madison walking graph measurements",
        leftMargin=0.72 * inch, rightMargin=0.72 * inch,
        topMargin=0.78 * inch, bottomMargin=0.68 * inch,
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=decorate)])
    story = []
    for kind, value in read_blocks(source.read_text(encoding="utf-8")):
        if kind == "title":
            story.append(Paragraph(inline(value), styles["title"]))
        elif kind == "heading":
            story.append(Paragraph(inline(value), styles["h2"]))
        elif kind == "paragraph":
            style = styles["caption"] if value.startswith("**Table ") else styles["body"]
            story.append(Paragraph(inline(value), style))
        elif kind == "bullets":
            items = [ListItem(Paragraph(inline(item), styles["bullet"]), leftIndent=12) for item in value]
            story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=16, bulletFontName="Helvetica", bulletFontSize=6, spaceAfter=7))
        else:
            story.append(parse_table(value, styles, doc.width))
            story.append(Spacer(1, 6))
    doc.build(story)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("docs/report.md"))
    parser.add_argument("--output", type=Path, default=Path("docs/report.pdf"))
    args = parser.parse_args()
    build(args.source, args.output)


if __name__ == "__main__":
    main()
