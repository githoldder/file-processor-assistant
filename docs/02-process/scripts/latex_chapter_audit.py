#!/usr/bin/env python3
"""Audit LaTeX chapter length, visual density, and formal terminology."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "document" / "latex" / "cit-template" / "data"

FORBIDDEN_FORMAL_TERMS = {
    "截图": "use 图像记录、界面结果图、运行结果图, or simply 图",
    "大作业": "use 本系统、本文、课程实践项目, or the formal course name",
    "课程设计报告": "use 本文、说明书, or 系统设计文档",
    "演示": "use 验证、运行、展示, or 可复现验证",
    "答辩": "use 评审、验收, or 课程考核",
    "截图证据": "use 图像记录 or 运行结果",
    "证据截图": "use 图像记录 or 运行结果",
}

TARGETS = {
    "abstract.tex": (350, 450),
    "chap01.tex": (1400, 3600),
    "chap02.tex": (1600, 2200),
    "chap03.tex": (2800, 4600),
    "chap04.tex": (3200, 5600),
    "chap05.tex": (3000, 6500),
    "chap06.tex": (2600, 4200),
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
    forbidden_hits = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        for term in FORBIDDEN_FORMAL_TERMS:
            if term in line:
                forbidden_hits.append(f"{lineno}:{term}")
    if forbidden_hits:
        status += " / FORBIDDEN_TERMS"
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
        "forbidden_hits": forbidden_hits,
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
    print()
    print("Forbidden formal terms")
    any_forbidden = False
    for row in rows:
        hits = row["forbidden_hits"]
        if hits:
            any_forbidden = True
            print(f"- {row['file']}: {', '.join(hits)}")
    if not any_forbidden:
        print("- none")


if __name__ == "__main__":
    main()
