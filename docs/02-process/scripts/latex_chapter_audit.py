#!/usr/bin/env python3
"""Audit LaTeX chapter length and visual density for the course report."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "document" / "latex" / "cit-template" / "data"

TARGETS = {
    "abstract.tex": (350, 450),
    "chap01.tex": (1400, 1800),
    "chap02.tex": (1600, 2200),
    "chap03.tex": (1800, 2400),
    "chap04.tex": (1800, 2600),
    "chap05.tex": (2600, 3600),
    "chap06.tex": (1800, 2600),
    "chap07.tex": (900, 1300),
    "acknowledgements.tex": (180, 300),
}


def strip_latex(text: str) -> str:
    text = re.sub(r"%.*", "", text)
    text = re.sub(r"\\begin\{(?:table|figure|algorithm|lstlisting)\}.*?\\end\{\w+\}", "", text, flags=re.S)
    text = re.sub(r"\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{([^{}]*)\})?", r" \1 ", text)
    text = re.sub(r"[{}\\]", " ", text)
    return text


def audit_file(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    body = strip_latex(text)
    cjk = len(re.findall(r"[\u4e00-\u9fff]", body))
    english_words = len(re.findall(r"[A-Za-z][A-Za-z0-9_-]*", body))
    paragraphs = len([part for part in re.split(r"\n\s*\n", text.strip()) if part.strip()])
    figures = len(re.findall(r"\\begin\{figure\}", text))
    includegraphics = len(re.findall(r"\\includegraphics", text))
    tables = len(re.findall(r"\\begin\{table\}", text))
    headings = re.findall(r"\\(?:chapter|section|subsection)\{([^}]*)\}", text)
    visuals = figures + tables
    minimum, maximum = TARGETS.get(path.name, (0, 0))
    if minimum and cjk < minimum:
        status = f"SHORT -{minimum - cjk}"
    elif maximum and cjk > maximum:
        status = f"LONG +{cjk - maximum}"
    else:
        status = "OK"
    if visuals and cjk // visuals < 250:
        status += " / VISUAL_TEXT_LOW"
    return {
        "file": path.name,
        "cjk": cjk,
        "english_words": english_words,
        "paragraphs": paragraphs,
        "figures": figures,
        "includegraphics": includegraphics,
        "tables": tables,
        "visuals": visuals,
        "target": f"{minimum}-{maximum}" if minimum else "-",
        "status": status,
        "headings": " | ".join(headings),
    }


def main() -> None:
    rows = [audit_file(path) for path in sorted(DATA_DIR.glob("*.tex"))]
    headers = ["file", "cjk", "english_words", "paragraphs", "figures", "tables", "target", "status"]
    widths = {key: max(len(key), *(len(str(row[key])) for row in rows)) for key in headers}
    print("LaTeX chapter audit")
    print(f"data_dir: {DATA_DIR}")
    print()
    print("  ".join(key.ljust(widths[key]) for key in headers))
    print("  ".join("-" * widths[key] for key in headers))
    for row in rows:
        print("  ".join(str(row[key]).ljust(widths[key]) for key in headers))
    print()
    print("Headings")
    for row in rows:
        print(f"- {row['file']}: {row['headings'] or '-'}")


if __name__ == "__main__":
    main()
