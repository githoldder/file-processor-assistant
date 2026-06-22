from pathlib import Path

from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "docs/01-resources/课程大作业说明书-模板.docx"
OUT_DIR = ROOT / "docs/02-process/document/txt"
OUT_FILE = OUT_DIR / "00-course-template-textified.txt"


def iter_blocks(document: Document):
    body = document.element.body
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def table_to_markdown(table: Table) -> str:
    rows = []
    for row in table.rows:
        cells = [" ".join(cell.text.split()) for cell in row.cells]
        rows.append(cells)
    if not rows:
        return ""
    width = max(len(row) for row in rows)
    normalized = [row + [""] * (width - len(row)) for row in rows]
    header = "| " + " | ".join(normalized[0]) + " |"
    sep = "| " + " | ".join(["---"] * width) + " |"
    body = ["| " + " | ".join(row) + " |" for row in normalized[1:]]
    return "\n".join([header, sep, *body])


def main() -> None:
    doc = Document(SOURCE)
    lines = [
        "# 课程大作业说明书模板文本化",
        "",
        f"- 来源文件：{SOURCE}",
        "- 用途：作为 LaTeX 报告章节结构、封面字段、评分/格式要求的唯一模板文本源。",
        "",
    ]
    for block in iter_blocks(doc):
        if isinstance(block, Paragraph):
            text = " ".join(block.text.split())
            if not text:
                continue
            style = block.style.name if block.style else ""
            if style.startswith("Heading"):
                level = "".join(ch for ch in style if ch.isdigit()) or "2"
                lines.append(f"{'#' * min(int(level) + 1, 6)} {text}")
            else:
                lines.append(text)
            lines.append("")
        elif isinstance(block, Table):
            markdown = table_to_markdown(block)
            if markdown:
                lines.extend([markdown, ""])
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(OUT_FILE)


if __name__ == "__main__":
    main()
