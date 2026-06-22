---
name: latex-report-engineering
description: Use for CulCloud LaTeX report expansion, scripted .tex injection, research traceability, table overflow control, paragraph-first academic prose, and figure/text layout gates.
---

# LaTeX Report Engineering Skill

Use this skill when modifying `docs/02-process/document/latex/cit-template/` or preparing formal report text that will be injected into LaTeX.

## Required Reading

1. `.agent/rules/latex-report-gate.md`
2. `.agent/rules/latex-research-layout-gate.md`
3. `.agent/workflows/document-latex-delivery.md`
4. `docs/02-process/scripts/latex_chapter_audit.py`
5. The target `.tex` chapter file.

## Core Workflow

1. Identify the chapter target and the exact anchor.
2. Gather local evidence from PRDs, code, tests, screenshots, template text, or official references.
3. Write a structured LaTeX patch, not free Markdown prose.
4. Review the patch for Markdown residue, unsupported claims, overlong table cells, excessive bullets, and isolated figures.
5. Inject the patch with `apply_patch` or a validated script that checks target path, unique anchor, and contamination rules.
6. Run the chapter counter.
7. Compile the PDF and classify the log.
8. Render or visually inspect affected pages when figures, tables, title pages, or page layout changed.

## Patch Contract

Every child-agent chapter patch must contain:

```text
target_file:
operation:
anchor:
estimated_cjk_addition:
fact_sources:
risk_notes:
latex_patch:
```

The `latex_patch` field must contain LaTeX prose only. It must not contain Markdown headings, fenced code, backticks, Markdown bold, or casual bullet lists.

## Research Discipline

Research-like content must have a traceable source chain. Acceptable sources include:

- project PRDs,
- code and tests,
- official documentation,
- standards and laws,
- peer-reviewed papers,
- rendered screenshots,
- verified command outputs.

When evidence is missing, write the claim as a bounded design assumption or leave it out. Do not invent metrics, market facts, legal conclusions, benchmark numbers, or references.

## Table Discipline

Before adding a table, ask whether the table is necessary. If it is necessary, keep each cell short. Move long explanation into prose before or after the table. Use `tabularx` or `longtable` for long content. Treat overlapping text, wide columns, and large blank pages as failures even if XeLaTeX compiles.

## Figure Discipline

Never drop a figure alone. The prose must explain why the figure exists, what the reader should observe, and how it supports the next point. If a figure drifts away from its paragraph, add local prose, resize the figure, split the figure, or move its anchor.

## Paragraph Discipline

Prefer paragraph-style expansion. Use lists only for test matrices, acceptance criteria, algorithms, checklist-like gates, or requirement enumeration. Formal explanatory text should be dense, connected, and specific to CulCloud.

## Completion Criteria

A report-engineering task is complete only when:

- the patch is scoped and traceable,
- `latex_chapter_audit.py` has been run,
- XeLaTeX compilation succeeds,
- log warnings are classified honestly,
- source scans for Markdown/local path/table hazards pass,
- and any visual layout risk has been checked.
