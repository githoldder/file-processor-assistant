#!/usr/bin/env python3
from __future__ import annotations

import html
import re
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = ROOT / "01-resources"
OUTPUT_DIR = ROOT / "02-process" / "data" / "extracted-sources"


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def docx_to_text(path: Path) -> str:
    with ZipFile(path) as archive:
        xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    xml = re.sub(r"<w:tab[^>]*/>", "\t", xml)
    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"</w:tr>", "\n", xml)
    xml = re.sub(r"</w:tc>", "\t", xml)
    text = re.sub(r"<[^>]+>", "", xml)
    return html.unescape(text)


def pdf_to_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except Exception as exc:  # pragma: no cover
        return f"[PDF_TEXT_EXTRACTION_FAILED]\nMissing pypdf: {exc}\n"

    reader = PdfReader(str(path))
    chunks: list[str] = []
    for index, page in enumerate(reader.pages, start=1):
        chunks.append(f"\n--- PAGE {index} ---\n")
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def md_to_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def should_skip(path: Path) -> bool:
    name = path.name
    if name.startswith(".~") or name.startswith("~$") or name == ".DS_Store":
        return True
    return path.suffix.lower() not in {".docx", ".pdf", ".md"}


def source_key(path: Path) -> str:
    relative = path.relative_to(INPUT_DIR)
    stem = str(relative.with_suffix(""))
    stem = re.sub(r"^[0-9]{2}-", "", stem)
    return stem


def prefer_pdf_sources(paths: list[Path]) -> list[Path]:
    grouped: dict[str, list[Path]] = {}
    for path in paths:
        grouped.setdefault(source_key(path), []).append(path)

    selected: list[Path] = []
    for items in grouped.values():
        pdfs = [p for p in items if p.suffix.lower() == ".pdf"]
        if pdfs:
            selected.extend(pdfs)
        else:
            selected.extend(items)
    return sorted(selected)


def output_name(path: Path, index: int) -> str:
    relative = path.relative_to(INPUT_DIR)
    safe = re.sub(r"[^\w\u4e00-\u9fff.-]+", "_", str(relative.with_suffix("")))
    safe = safe.strip("_")
    return f"{index:02d}-{safe}.txt"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    raw_sources = [p for p in sorted(INPUT_DIR.rglob("*")) if p.is_file() and not should_skip(p)]
    sources = prefer_pdf_sources(raw_sources)

    manifest: list[str] = [
        "原始材料纯文本抽取清单",
        "",
        "规则：同一材料同时存在 docx 和 pdf 时，优先抽取 pdf；pdf 文本保留 --- PAGE n --- 页码标注。",
        "",
    ]
    for index, path in enumerate(sources, start=1):
        suffix = path.suffix.lower()
        if suffix == ".docx":
            text = docx_to_text(path)
        elif suffix == ".pdf":
            text = pdf_to_text(path)
        elif suffix == ".md":
            text = md_to_text(path)
        else:
            continue

        target = OUTPUT_DIR / output_name(path, index)
        header = (
            f"来源文件: {path.relative_to(ROOT)}\n"
            f"文件类型: {suffix}\n"
            f"{'=' * 72}\n\n"
        )
        target.write_text(header + normalize_text(text), encoding="utf-8")
        manifest.append(f"{index:02d}. {path.relative_to(ROOT)} -> {target.relative_to(ROOT)}")

    (OUTPUT_DIR / "00-manifest.txt").write_text("\n".join(manifest) + "\n", encoding="utf-8")
    print(f"Extracted {len(sources)} source files into {OUTPUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
