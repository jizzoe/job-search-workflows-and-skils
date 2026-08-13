from pathlib import Path
import re
import xml.sax.saxutils as saxutils

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    PageBreak,
    Spacer,
    ListFlowable,
    ListItem,
    KeepTogether,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "resume-modern-draft-v3.md"
OUTPUT = ROOT / "resumes" / "joe-rice-principal-software-engineer-architect-resume.pdf"


def inline_markup(text: str) -> str:
    text = saxutils.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"_(.+?)_", r"<i>\1</i>", text)
    return text


def para(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(inline_markup(text), style)


def parse_markdown(path: Path):
    lines = path.read_text(encoding="utf-8").splitlines()
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            i += 1
            continue
        if line.startswith("# "):
            blocks.append(("title", line[2:].strip()))
        elif line.startswith("## "):
            blocks.append(("section", line[3:].strip()))
        elif line.startswith("### "):
            blocks.append(("company", line[4:].strip()))
        elif line.startswith("- "):
            bullets = []
            while i < len(lines) and lines[i].startswith("- "):
                bullets.append(lines[i][2:].strip())
                i += 1
            blocks.append(("bullets", bullets))
            continue
        else:
            blocks.append(("text", line))
        i += 1
    return blocks


def build_pdf():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.45 * inch,
        leftMargin=0.45 * inch,
        topMargin=0.42 * inch,
        bottomMargin=0.42 * inch,
    )

    styles = getSampleStyleSheet()
    base_font = "Helvetica"
    dark = colors.HexColor("#1f2933")
    blue = colors.HexColor("#1f4e79")
    gray = colors.HexColor("#4b5563")

    title = ParagraphStyle(
        "ResumeTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=20,
        alignment=TA_CENTER,
        textColor=dark,
        spaceAfter=2,
    )
    header_line = ParagraphStyle(
        "HeaderLine",
        parent=styles["Normal"],
        fontName=base_font,
        fontSize=8.5,
        leading=10,
        alignment=TA_CENTER,
        textColor=gray,
        spaceAfter=1,
    )
    section = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=11.5,
        textColor=blue,
        borderWidth=0,
        borderPadding=0,
        spaceBefore=5,
        spaceAfter=2,
    )
    company = ParagraphStyle(
        "Company",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=10.5,
        textColor=dark,
        spaceBefore=4,
        spaceAfter=0,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName=base_font,
        fontSize=8.05,
        leading=9.55,
        alignment=TA_LEFT,
        textColor=dark,
        spaceAfter=2.2,
    )
    body_tight = ParagraphStyle(
        "BodyTight",
        parent=body,
        fontSize=7.8,
        leading=9.1,
        spaceAfter=1.4,
    )
    role = ParagraphStyle(
        "Role",
        parent=body,
        fontName=base_font,
        fontSize=8.2,
        leading=9.4,
        textColor=dark,
        spaceBefore=2,
        spaceAfter=1,
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body,
        fontSize=7.8,
        leading=9.15,
        leftIndent=0,
        firstLineIndent=0,
        spaceAfter=1.15,
    )

    story = []
    in_header = True
    for kind, content in parse_markdown(SOURCE):
        if kind == "title":
            story.append(para(content, title))
            continue

        if in_header and kind == "text":
            story.append(para(content, header_line))
            continue

        if kind == "section":
            in_header = False
            story.append(Spacer(1, 2))
            story.append(para(content.upper(), section))
            story.append(Spacer(1, 1))
        elif kind == "company":
            if content == "Principal Solutions Architect":
                story.append(PageBreak())
            story.append(para(content, company))
        elif kind == "text":
            if content.startswith("**") and "|" in content:
                story.append(para(content, role))
            elif content.startswith("_"):
                story.append(para(content, body_tight))
            else:
                story.append(para(content, body))
        elif kind == "bullets":
            items = [
                ListItem(para(item, bullet_style), bulletColor=blue, leftIndent=8)
                for item in content
            ]
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    bulletFontName="Helvetica",
                    bulletFontSize=5,
                    leftIndent=10,
                    bulletOffsetY=1.5,
                    spaceBefore=0,
                    spaceAfter=1,
                )
            )

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
